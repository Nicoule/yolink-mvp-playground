-- Fix profile report uniqueness so one member may report different people,
-- while still being limited to one report per reported profile.
-- Run once in Supabase Dashboard -> SQL Editor.

do $$
declare
  v_constraint_name text;
begin
  -- Earlier versions may have added a unique constraint on reporter_id alone.
  -- profile_reports has no other intended unique constraints, so replace any
  -- existing unique constraint with the correct reporter/profile pair.
  for v_constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.profile_reports'::regclass
      and contype = 'u'
  loop
    execute format('alter table public.profile_reports drop constraint %I', v_constraint_name);
  end loop;

  alter table public.profile_reports
    add constraint profile_reports_reporter_reported_key
    unique (reporter_id, reported_profile_id);
end;
$$;

create or replace function report_profile(p_code text, p_profile_id uuid, p_reason text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter uuid := _yolink_auth(p_code);
  v_report profile_reports;
begin
  if v_reporter = p_profile_id then
    raise exception 'SELF_REPORT';
  end if;
  if not exists (select 1 from profiles where id = p_profile_id) then
    raise exception 'INVALID_CODE';
  end if;
  if exists (
    select 1 from profile_reports
    where reporter_id = v_reporter and reported_profile_id = p_profile_id
  ) then
    raise exception 'ALREADY_REPORTED';
  end if;

  insert into profile_reports (reporter_id, reported_profile_id, reason)
  values (v_reporter, p_profile_id, trim(p_reason))
  returning * into v_report;
  return row_to_json(v_report);
exception when unique_violation then
  -- Protect against two simultaneous submissions for the same person.
  raise exception 'ALREADY_REPORTED';
end;
$$;

notify pgrst, 'reload schema';
