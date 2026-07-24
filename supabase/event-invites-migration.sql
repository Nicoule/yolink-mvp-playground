-- Yolink event invitations in chat
-- Run this after event-visibility-migration.sql.

alter table messages
  add column if not exists event_id uuid references events(id) on delete set null;
create index if not exists idx_messages_event_id on messages(event_id) where event_id is not null;

-- Send an event as a structured chat invitation, not as a long plain-text URL.
create or replace function send_event_invite(p_code text, p_match_id uuid, p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := _yolink_auth(p_code);
  v_match matches;
  v_other uuid;
  v_event events;
  v_message messages;
begin
  select * into v_match from matches
  where id = p_match_id and (user_a = v_me or user_b = v_me);
  if v_match.id is null then raise exception 'NOT_YOUR_MATCH'; end if;
  v_other := case when v_match.user_a = v_me then v_match.user_b else v_match.user_a end;
  select * into v_event from events where id = p_event_id;
  if v_event.id is null then raise exception 'EVENT_NOT_FOUND'; end if;

  -- The sender must already be allowed to view the event.
  if not (
    v_event.visibility in ('public', 'connection_required')
    or v_event.creator_id = v_me
    or exists (select 1 from event_participants where event_id = v_event.id and profile_id = v_me)
    or (v_event.visibility = 'connections_only' and exists (
      select 1 from matches where (user_a = v_me and user_b = v_event.creator_id) or (user_b = v_me and user_a = v_event.creator_id)
    ))
    or (v_event.visibility = 'unlisted' and exists (
      select 1 from messages sent join matches m on m.id = sent.match_id
      where sent.event_id = v_event.id and (m.user_a = v_me or m.user_b = v_me)
    ))
  ) then raise exception 'EVENT_NOT_VISIBLE'; end if;

  -- A connections-only event remains restricted to people connected to its host.
  if v_event.visibility = 'connections_only'
    and v_other <> v_event.creator_id
    and not exists (select 1 from matches where (user_a = v_other and user_b = v_event.creator_id) or (user_b = v_other and user_a = v_event.creator_id)) then
    raise exception 'EVENT_CONNECTION_REQUIRED';
  end if;

  insert into messages (match_id, sender_id, body, event_id)
  values (p_match_id, v_me, '[event_invite]', p_event_id)
  returning * into v_message;
  return row_to_json(v_message);
end;
$$;

-- Return events that a member received as a chat invitation. This lets an
-- invited unlisted event render as a live, clickable card in the conversation.
create or replace function fetch_invited_events(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_me uuid := _yolink_auth(p_code);
begin
  return json_build_object(
    'events', coalesce((
      select json_agg(row_to_json(e) order by e.starts_at)
      from events e
      where exists (
        select 1 from messages invite
        join matches m on m.id = invite.match_id
        where invite.event_id = e.id and (m.user_a = v_me or m.user_b = v_me)
      )
    ), '[]'::json),
    'participants', coalesce((
      select json_agg(row_to_json(ep))
      from event_participants ep
      where exists (
        select 1 from messages invite
        join matches m on m.id = invite.match_id
        where invite.event_id = ep.event_id and (m.user_a = v_me or m.user_b = v_me)
      )
    ), '[]'::json)
  );
end;
$$;

notify pgrst, 'reload schema';
