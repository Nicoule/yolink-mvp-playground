-- Yolink profile reports migration
-- Run this once in Supabase Dashboard -> SQL Editor.

create table if not exists profile_reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid not null references profiles(id) on delete cascade,
  reported_profile_id uuid not null references profiles(id) on delete cascade,
  reason              text not null check (char_length(reason) between 1 and 1000),
  status              text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  created_at          timestamptz not null default now(),
  unique (reporter_id, reported_profile_id),
  check (reporter_id <> reported_profile_id)
);

create index if not exists idx_profile_reports_status on profile_reports (status, created_at desc);

alter table profile_reports enable row level security;
-- No read policy: reports are visible to staff in the Supabase dashboard only.

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
  raise exception 'ALREADY_REPORTED';
end;
$$;
