-- Yolink Event Management migration
-- Run this once in Supabase Dashboard -> SQL Editor after event-industries-migration.sql.

alter table events add column if not exists max_participants int;
update events set max_participants = 20 where max_participants is null;
alter table events alter column max_participants set not null;
alter table events alter column max_participants set default 20;
alter table events drop constraint if exists events_max_participants_check;
alter table events add constraint events_max_participants_check
  check (max_participants between 1 and 500);

-- Replace the industry-tagged event creation function with the capacity-aware version.
drop function if exists create_event(text, text, text, timestamptz, text, text);

create or replace function create_event(
  p_code text, p_title text, p_description text, p_starts_at timestamptz,
  p_location text, p_industries text, p_max_participants int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid := _yolink_auth(p_code);
  v_event events;
begin
  insert into events (creator_id, title, description, starts_at, location, industries, max_participants)
  values (v_creator, trim(p_title), nullif(trim(p_description), ''), p_starts_at,
          trim(p_location), trim(p_industries), p_max_participants)
  returning * into v_event;
  insert into event_participants (event_id, profile_id) values (v_event.id, v_creator);
  return row_to_json(v_event);
end;
$$;

-- Enforce capacity at the database level when a member joins.
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
begin
  select max_participants into v_capacity from events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
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

create or replace function update_event(
  p_code text, p_event_id uuid, p_title text, p_description text, p_starts_at timestamptz,
  p_location text, p_industries text, p_max_participants int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid := _yolink_auth(p_code);
  v_event events;
begin
  if not exists (select 1 from events where id = p_event_id and creator_id = v_host) then
    raise exception 'NOT_EVENT_HOST';
  end if;
  if p_max_participants < (select count(*) from event_participants where event_id = p_event_id) then
    raise exception 'CAPACITY_TOO_LOW';
  end if;
  update events set title = trim(p_title), description = nullif(trim(p_description), ''),
    starts_at = p_starts_at, location = trim(p_location), industries = trim(p_industries),
    max_participants = p_max_participants
  where id = p_event_id
  returning * into v_event;
  return row_to_json(v_event);
end;
$$;

create or replace function remove_event_participant(p_code text, p_event_id uuid, p_profile_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_host uuid := _yolink_auth(p_code);
  v_participant event_participants;
begin
  if not exists (select 1 from events where id = p_event_id and creator_id = v_host) then
    raise exception 'NOT_EVENT_HOST';
  end if;
  if p_profile_id = v_host then
    raise exception 'CANNOT_REMOVE_HOST';
  end if;
  delete from event_participants where event_id = p_event_id and profile_id = p_profile_id
  returning * into v_participant;
  if not found then
    raise exception 'PARTICIPANT_NOT_FOUND';
  end if;
  return row_to_json(v_participant);
end;
$$;

notify pgrst, 'reload schema';
