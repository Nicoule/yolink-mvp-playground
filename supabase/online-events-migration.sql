-- Yolink online events migration
-- Run this once in Supabase Dashboard -> SQL Editor after event-management-migration.sql.

alter table events add column if not exists online_url text;
alter table events drop constraint if exists events_online_url_check;
alter table events add constraint events_online_url_check
  check (online_url is null or online_url ~* '^https?://');

-- Replace the event RPCs so an optional HTTPS online link is stored safely.
drop function if exists create_event(text, text, text, timestamptz, text, text, int);
create or replace function create_event(
  p_code text, p_title text, p_description text, p_starts_at timestamptz,
  p_location text, p_online_url text, p_industries text, p_max_participants int
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
  insert into events (creator_id, title, description, starts_at, location, online_url, industries, max_participants)
  values (v_creator, trim(p_title), nullif(trim(p_description), ''), p_starts_at,
          trim(p_location), nullif(trim(p_online_url), ''), trim(p_industries), p_max_participants)
  returning * into v_event;
  insert into event_participants (event_id, profile_id) values (v_event.id, v_creator);
  return row_to_json(v_event);
end;
$$;

drop function if exists update_event(text, uuid, text, text, timestamptz, text, text, int);
create or replace function update_event(
  p_code text, p_event_id uuid, p_title text, p_description text, p_starts_at timestamptz,
  p_location text, p_online_url text, p_industries text, p_max_participants int
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
    starts_at = p_starts_at, location = trim(p_location), online_url = nullif(trim(p_online_url), ''),
    industries = trim(p_industries), max_participants = p_max_participants
  where id = p_event_id
  returning * into v_event;
  return row_to_json(v_event);
end;
$$;

notify pgrst, 'reload schema';
