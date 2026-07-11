-- ============================================================
-- Yolink — schema, RLS, and RPC functions
-- Paste this whole file into Supabase Dashboard -> SQL Editor -> Run.
--
-- !! ONE THING TO EDIT BEFORE RUNNING !!
-- Search for CHANGE_ME_STAFF_PASSCODE below and set your own
-- staff passcode (used by admin.html to create manual matches).
--
-- Security model (trusted friends-and-family pool):
--   * anon key can READ profiles, requests, matches, messages
--   * anon key can WRITE NOTHING directly — every mutation goes
--     through a SECURITY DEFINER function that validates the
--     caller's secret code (or the staff passcode)
--   * secret codes and the staff passcode are in tables with no
--     anon access at all
-- ============================================================

-- ---------- Tables ----------

create table if not exists profiles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 1 and 80),
  title        text not null check (char_length(title) <= 120),
  company      text check (char_length(company) <= 120),
  industry     text not null check (char_length(industry) <= 80),
  years_exp    int  not null check (years_exp between 0 and 60),
  background   text not null check (char_length(background) <= 600),
  looking_for  text not null check (char_length(looking_for) <= 600),
  avatar_color text not null default '#3A1B3F',
  created_at   timestamptz not null default now()
);

create table if not exists profile_secrets (
  profile_id  uuid primary key references profiles(id) on delete cascade,
  secret_code text not null unique
);

create table if not exists requests (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null references profiles(id) on delete cascade,
  to_id      uuid not null references profiles(id) on delete cascade,
  kind       text not null check (kind in ('network', 'coffee')),
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'passed')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id),
  check (from_id <> to_id)
);

create table if not exists matches (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references profiles(id) on delete cascade,
  user_b     uuid not null references profiles(id) on delete cascade,
  source     text not null check (source in ('mutual', 'staff')),
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)  -- pair is stored in canonical order
);

create table if not exists messages (
  id         bigint generated always as identity primary key,
  match_id   uuid not null references matches(id) on delete cascade,
  sender_id  uuid not null references profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists app_config (
  key   text primary key,
  value text not null
);

-- >>> EDIT THIS LINE: set your staff passcode <<<
insert into app_config (key, value)
values ('admin_passcode', 'CHANGE_ME_STAFF_PASSCODE')
on conflict (key) do update set value = excluded.value;

create index if not exists idx_messages_match on messages (match_id, created_at);
create index if not exists idx_requests_to on requests (to_id, status);

-- ---------- Row Level Security ----------

alter table profiles        enable row level security;
alter table profile_secrets enable row level security;
alter table requests        enable row level security;
alter table matches         enable row level security;
alter table messages        enable row level security;
alter table app_config      enable row level security;

-- Read-only access for the app (trusted pool tradeoff: any member
-- of the pool can technically read any row via the anon key).
create policy "anon read profiles" on profiles for select using (true);
create policy "anon read requests" on requests for select using (true);
create policy "anon read matches"  on matches  for select using (true);
create policy "anon read messages" on messages for select using (true);
-- profile_secrets and app_config: RLS on, no policies => no access.

-- ---------- Helper functions ----------

-- Generate a human-friendly secret code like YO-7F3K-QM2X
create or replace function _yolink_gen_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I/L
  code text := 'YO-';
  i int;
begin
  for i in 1..8 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    if i = 4 then code := code || '-'; end if;
  end loop;
  return code;
end;
$$;

-- Resolve a secret code to a profile id, or raise.
create or replace function _yolink_auth(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select profile_id into v_id
  from profile_secrets
  where secret_code = upper(trim(p_code));
  if v_id is null then
    raise exception 'INVALID_CODE';
  end if;
  return v_id;
end;
$$;

-- Create a match with the pair in canonical order; no-op if it exists.
create or replace function _yolink_make_match(p_u1 uuid, p_u2 uuid, p_source text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a uuid := least(p_u1, p_u2);
  v_b uuid := greatest(p_u1, p_u2);
  v_id uuid;
begin
  insert into matches (user_a, user_b, source)
  values (v_a, v_b, p_source)
  on conflict (user_a, user_b) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from matches where user_a = v_a and user_b = v_b;
  end if;
  return v_id;
end;
$$;

-- ---------- Public RPCs (called from the app) ----------

create or replace function create_profile(
  p_name text, p_title text, p_company text, p_industry text,
  p_years_exp int, p_background text, p_looking_for text, p_avatar_color text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles;
  v_code text;
begin
  insert into profiles (name, title, company, industry, years_exp, background, looking_for, avatar_color)
  values (trim(p_name), trim(p_title), nullif(trim(p_company), ''), trim(p_industry),
          p_years_exp, trim(p_background), trim(p_looking_for), p_avatar_color)
  returning * into v_profile;

  loop
    v_code := _yolink_gen_code();
    begin
      insert into profile_secrets (profile_id, secret_code) values (v_profile.id, v_code);
      exit;
    exception when unique_violation then
      -- rare code collision: try again
    end;
  end loop;

  return json_build_object('profile', row_to_json(v_profile), 'secret_code', v_code);
end;
$$;

create or replace function login(p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := _yolink_auth(p_code);
  v_profile profiles;
begin
  select * into v_profile from profiles where id = v_id;
  return row_to_json(v_profile);
end;
$$;

create or replace function update_profile(
  p_code text, p_name text, p_title text, p_company text, p_industry text,
  p_years_exp int, p_background text, p_looking_for text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := _yolink_auth(p_code);
  v_profile profiles;
begin
  update profiles set
    name = trim(p_name), title = trim(p_title),
    company = nullif(trim(p_company), ''), industry = trim(p_industry),
    years_exp = p_years_exp, background = trim(p_background), looking_for = trim(p_looking_for)
  where id = v_id
  returning * into v_profile;
  return row_to_json(v_profile);
end;
$$;

-- Send a "let's network" / "coffee chat" request.
-- If the other person already has a pending request to you, it's mutual:
-- their request is accepted and a match is created immediately.
create or replace function send_request(p_code text, p_to_id uuid, p_kind text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid := _yolink_auth(p_code);
  v_reverse requests;
  v_match_id uuid;
begin
  if v_from = p_to_id then
    raise exception 'SELF_REQUEST';
  end if;
  if exists (select 1 from matches
             where user_a = least(v_from, p_to_id) and user_b = greatest(v_from, p_to_id)) then
    raise exception 'ALREADY_MATCHED';
  end if;

  select * into v_reverse from requests
  where from_id = p_to_id and to_id = v_from and status = 'pending';

  if v_reverse.id is not null then
    update requests set status = 'accepted' where id = v_reverse.id;
    v_match_id := _yolink_make_match(v_from, p_to_id, 'mutual');
    return json_build_object('matched', true, 'match_id', v_match_id);
  end if;

  insert into requests (from_id, to_id, kind) values (v_from, p_to_id, p_kind);
  return json_build_object('matched', false);
exception when unique_violation then
  raise exception 'ALREADY_REQUESTED';
end;
$$;

-- Accept or pass an incoming request. Only the recipient may respond.
create or replace function respond_request(p_code text, p_request_id uuid, p_accept boolean)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := _yolink_auth(p_code);
  v_req requests;
  v_match_id uuid;
begin
  select * into v_req from requests where id = p_request_id;
  if v_req.id is null or v_req.to_id <> v_me then
    raise exception 'NOT_YOUR_REQUEST';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'ALREADY_HANDLED';
  end if;

  if p_accept then
    update requests set status = 'accepted' where id = v_req.id;
    v_match_id := _yolink_make_match(v_req.from_id, v_req.to_id, 'mutual');
    return json_build_object('matched', true, 'match_id', v_match_id);
  else
    update requests set status = 'passed' where id = v_req.id;
    return json_build_object('matched', false);
  end if;
end;
$$;

create or replace function send_message(p_code text, p_match_id uuid, p_body text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := _yolink_auth(p_code);
  v_msg messages;
begin
  if not exists (select 1 from matches
                 where id = p_match_id and (user_a = v_me or user_b = v_me)) then
    raise exception 'NOT_YOUR_MATCH';
  end if;
  insert into messages (match_id, sender_id, body)
  values (p_match_id, v_me, trim(p_body))
  returning * into v_msg;
  return row_to_json(v_msg);
end;
$$;

-- Staff-only: create a manual match between two members (admin.html).
create or replace function admin_match(p_admin_pass text, p_user_a uuid, p_user_b uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
begin
  if not exists (select 1 from app_config
                 where key = 'admin_passcode' and value = p_admin_pass) then
    raise exception 'BAD_ADMIN_PASSCODE';
  end if;
  if p_user_a = p_user_b then
    raise exception 'SELF_MATCH';
  end if;
  v_match_id := _yolink_make_match(p_user_a, p_user_b, 'staff');
  return json_build_object('match_id', v_match_id);
end;
$$;

-- Staff-only: verify the passcode without side effects (admin.html gate).
create or replace function admin_check(p_admin_pass text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (select 1 from app_config
                 where key = 'admin_passcode' and value = p_admin_pass);
end;
$$;

-- Lock down helpers: only the RPCs above are meant for the anon role,
-- and _yolink_auth/_yolink_make_match/_yolink_gen_code are internal.
revoke execute on function _yolink_auth(text) from public, anon;
revoke execute on function _yolink_make_match(uuid, uuid, text) from public, anon;
revoke execute on function _yolink_gen_code() from public, anon;

-- ---------- Realtime ----------
-- Deliver INSERTs on these tables to subscribed clients (RLS applies).
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table requests;
