-- Yolink Event Industries migration
-- Run this once in Supabase Dashboard -> SQL Editor after events-migration.sql.

alter table events add column if not exists industries text;

-- Keep existing events discoverable after this upgrade.
update events set industries = 'General' where industries is null or btrim(industries) = '';

alter table events alter column industries set not null;
alter table events drop constraint if exists events_industries_check;
alter table events add constraint events_industries_check
  check (char_length(industries) between 1 and 161
         and array_length(string_to_array(industries, '|'), 1) between 1 and 2);

-- Replace the original five-argument function with the tagged-event version.
drop function if exists create_event(text, text, text, timestamptz, text);

create or replace function create_event(
  p_code text, p_title text, p_description text, p_starts_at timestamptz,
  p_location text, p_industries text
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
  values (v_creator, trim(p_title), nullif(trim(p_description), ''), p_starts_at,
          trim(p_location), trim(p_industries))
  returning * into v_event;
  insert into event_participants (event_id, profile_id) values (v_event.id, v_creator);
  return row_to_json(v_event);
end;
$$;

notify pgrst, 'reload schema';
