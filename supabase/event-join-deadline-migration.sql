-- Yolink Event Join Deadline migration
-- Run this once in Supabase Dashboard -> SQL Editor after event-management-migration.sql.

create or replace function join_event(p_code text, p_event_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid := _yolink_auth(p_code);
  v_participant event_participants;
  v_capacity int;
  v_starts_at timestamptz;
begin
  select max_participants, starts_at into v_capacity, v_starts_at
  from events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if v_starts_at <= now() then
    raise exception 'EVENT_ENDED';
  end if;
  if (select count(*) from event_participants where event_id = p_event_id) >= v_capacity then
    raise exception 'EVENT_FULL';
  end if;
  insert into event_participants (event_id, profile_id) values (p_event_id, v_profile)
  returning * into v_participant;
  return row_to_json(v_participant);
exception when unique_violation then
  raise exception 'ALREADY_JOINED';
end;
$$;

notify pgrst, 'reload schema';
