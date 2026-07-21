-- Yolink Request Message migration
-- Run once in Supabase SQL Editor after the earlier Yolink migrations.

alter table requests
  add column if not exists message text;

alter table requests drop constraint if exists requests_message_check;
alter table requests
  add constraint requests_message_check
  check (message is null or char_length(message) between 1 and 500);

create or replace function send_request(p_code text, p_to_id uuid, p_kind text, p_message text)
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

  insert into requests (from_id, to_id, kind, message)
  values (v_from, p_to_id, p_kind, nullif(trim(p_message), ''));
  return json_build_object('matched', false);
exception when unique_violation then
  raise exception 'ALREADY_REQUESTED';
end;
$$;

notify pgrst, 'reload schema';
