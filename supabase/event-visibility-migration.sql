-- Yolink event visibility migration
-- Run this once in Supabase Dashboard -> SQL Editor after online-events-migration.sql.

alter table events add column if not exists visibility text not null default 'public';
alter table events drop constraint if exists events_visibility_check;
alter table events add constraint events_visibility_check
  check (visibility in ('public', 'connection_required', 'connections_only', 'unlisted'));

-- Private event data is returned only through fetch_visible_events below.
drop policy if exists "anon read events" on events;
drop policy if exists "anon read event participants" on event_participants;

drop function if exists create_event(text, text, text, timestamptz, text, text, text, int);
create or replace function create_event(
  p_code text, p_title text, p_description text, p_starts_at timestamptz,
  p_location text, p_online_url text, p_visibility text, p_industries text, p_max_participants int
)
returns json language plpgsql security definer set search_path = public as $$
declare v_creator uuid := _yolink_auth(p_code); v_event events;
begin
  insert into events (creator_id, title, description, starts_at, location, online_url, visibility, industries, max_participants)
  values (v_creator, trim(p_title), nullif(trim(p_description), ''), p_starts_at, trim(p_location), nullif(trim(p_online_url), ''), coalesce(nullif(trim(p_visibility), ''), 'public'), trim(p_industries), p_max_participants)
  returning * into v_event;
  insert into event_participants (event_id, profile_id) values (v_event.id, v_creator);
  return row_to_json(v_event);
end;
$$;

drop function if exists update_event(text, uuid, text, text, timestamptz, text, text, text, int);
create or replace function update_event(
  p_code text, p_event_id uuid, p_title text, p_description text, p_starts_at timestamptz,
  p_location text, p_online_url text, p_visibility text, p_industries text, p_max_participants int
)
returns json language plpgsql security definer set search_path = public as $$
declare v_host uuid := _yolink_auth(p_code); v_event events;
begin
  if not exists (select 1 from events where id = p_event_id and creator_id = v_host) then raise exception 'NOT_EVENT_HOST'; end if;
  if p_max_participants < (select count(*) from event_participants where event_id = p_event_id) then raise exception 'CAPACITY_TOO_LOW'; end if;
  update events set title = trim(p_title), description = nullif(trim(p_description), ''), starts_at = p_starts_at,
    location = trim(p_location), online_url = nullif(trim(p_online_url), ''), visibility = coalesce(nullif(trim(p_visibility), ''), 'public'),
    industries = trim(p_industries), max_participants = p_max_participants
  where id = p_event_id returning * into v_event;
  return row_to_json(v_event);
end;
$$;

-- "Connected" means there is a successful match between the viewer and event host.
create or replace function join_event(p_code text, p_event_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_profile uuid := _yolink_auth(p_code); v_participant event_participants;
  v_event events; v_capacity int;
begin
  select * into v_event from events where id = p_event_id for update;
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;
  if v_event.starts_at <= now() then raise exception 'EVENT_ENDED'; end if;
  if v_event.visibility in ('connection_required', 'connections_only') and v_profile <> v_event.creator_id
    and not exists (select 1 from matches where (user_a = v_profile and user_b = v_event.creator_id) or (user_b = v_profile and user_a = v_event.creator_id)) then
    raise exception 'EVENT_CONNECTION_REQUIRED';
  end if;
  select count(*) into v_capacity from event_participants where event_id = p_event_id;
  if v_capacity >= v_event.max_participants then raise exception 'EVENT_FULL'; end if;
  insert into event_participants (event_id, profile_id) values (p_event_id, v_profile) returning * into v_participant;
  return row_to_json(v_participant);
exception when unique_violation then raise exception 'ALREADY_JOINED';
end;
$$;

-- One safe endpoint for event list data. Unlisted events require their shared link.
create or replace function fetch_visible_events(p_code text default null, p_shared_event_id uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_me uuid;
begin
  if nullif(trim(p_code), '') is not null then
    select profile_id into v_me from profile_secrets where secret_code = trim(p_code);
  end if;
  return json_build_object(
    'events', coalesce((select json_agg(row_to_json(e) order by e.starts_at) from events e where
      e.visibility in ('public', 'connection_required')
      or (e.visibility = 'connections_only' and v_me is not null and (e.creator_id = v_me or exists (select 1 from matches m where (m.user_a = v_me and m.user_b = e.creator_id) or (m.user_b = v_me and m.user_a = e.creator_id))))
      or (e.visibility = 'unlisted' and (e.id = p_shared_event_id or e.creator_id = v_me or exists (select 1 from event_participants ep where ep.event_id = e.id and ep.profile_id = v_me)))
    ), '[]'::json),
    'participants', coalesce((select json_agg(row_to_json(ep)) from event_participants ep where ep.event_id in (
      select e.id from events e where e.visibility in ('public', 'connection_required')
      or (e.visibility = 'connections_only' and v_me is not null and (e.creator_id = v_me or exists (select 1 from matches m where (m.user_a = v_me and m.user_b = e.creator_id) or (m.user_b = v_me and m.user_a = e.creator_id))))
      or (e.visibility = 'unlisted' and (e.id = p_shared_event_id or e.creator_id = v_me or exists (select 1 from event_participants mine where mine.event_id = e.id and mine.profile_id = v_me)))
    )), '[]'::json)
  );
end;
$$;

notify pgrst, 'reload schema';
