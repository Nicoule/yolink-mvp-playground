-- Yolink Event Attendance migration
-- Run this once in Supabase Dashboard -> SQL Editor after event-management-migration.sql.

create or replace function leave_event(p_code text, p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid := _yolink_auth(p_code);
  v_participant event_participants;
begin
  if not exists (select 1 from events where id = p_event_id) then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if exists (select 1 from events where id = p_event_id and creator_id = v_profile) then
    raise exception 'CANNOT_REMOVE_HOST';
  end if;
  delete from event_participants where event_id = p_event_id and profile_id = v_profile
  returning * into v_participant;
  if not found then
    raise exception 'PARTICIPANT_NOT_FOUND';
  end if;
  return row_to_json(v_participant);
end;
$$;

create or replace function cancel_event(p_code text, p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid := _yolink_auth(p_code);
  v_event events;
begin
  select * into v_event from events where id = p_event_id and creator_id = v_host;
  if not found then
    raise exception 'NOT_EVENT_HOST';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'EVENT_ALREADY_STARTED';
  end if;
  delete from events where id = p_event_id;
  return row_to_json(v_event);
end;
$$;

notify pgrst, 'reload schema';
