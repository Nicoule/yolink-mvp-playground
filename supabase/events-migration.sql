-- Yolink Events migration
-- Run this once in Supabase Dashboard -> SQL Editor.

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 1000),
  starts_at   timestamptz not null,
  location    text not null check (char_length(location) between 1 and 160),
  industries  text not null check (char_length(industries) between 1 and 161 and array_length(string_to_array(industries, '|'), 1) between 1 and 2),
  created_at  timestamptz not null default now()
);

create table if not exists event_participants (
  event_id   uuid not null references events(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create index if not exists idx_events_starts_at on events (starts_at);
create index if not exists idx_event_participants_profile on event_participants (profile_id);

alter table events enable row level security;
alter table event_participants enable row level security;

create policy "anon read events" on events for select using (true);
create policy "anon read event participants" on event_participants for select using (true);

create or replace function create_event(
  p_code text, p_title text, p_description text, p_starts_at timestamptz, p_location text, p_industries text
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
  insert into events (creator_id, title, description, starts_at, location, industries)
  values (v_creator, trim(p_title), nullif(trim(p_description), ''), p_starts_at, trim(p_location), trim(p_industries))
  returning * into v_event;
  insert into event_participants (event_id, profile_id) values (v_event.id, v_creator);
  return row_to_json(v_event);
end;
$$;

create or replace function join_event(p_code text, p_event_id uuid)
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
  insert into event_participants (event_id, profile_id) values (p_event_id, v_profile)
  returning * into v_participant;
  return row_to_json(v_participant);
exception when unique_violation then
  raise exception 'ALREADY_JOINED';
end;
$$;

alter publication supabase_realtime add table events;
alter publication supabase_realtime add table event_participants;
