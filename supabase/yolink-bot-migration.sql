-- Yolink Bot migration
-- Run this once after profile-custom-tag-migration.sql.

alter table profiles add column if not exists is_system_account boolean not null default false;

-- Use the existing "Yolink Bot" profile when it is already present, so its
-- avatar, card color, industries, tags, and written profile are preserved.
-- Otherwise create a basic official profile for a brand-new installation.
do $$
declare
  v_bot uuid;
  v_saved text;
  v_existing uuid;
  v_legacy uuid;
  v_old_match record;
  v_member uuid;
  v_target_match uuid;
begin
  -- Prefer the oldest existing Yolink Bot profile. This is the profile you
  -- designed in the app, even if a previous test migration stored another id.
  select id into v_existing
  from profiles
  where lower(trim(name)) = 'yolink bot'
  order by is_system_account asc, created_at asc
  limit 1;
  select value into v_saved from app_config where key = 'yolink_bot_profile_id';
  if v_existing is not null then
    v_bot := v_existing;
  elsif v_saved is not null and exists (select 1 from profiles where id::text = v_saved) then
    v_bot := v_saved::uuid;
  else
    insert into profiles (name, title, company, company_visible, industry, years_exp, background, looking_for, avatar_color, gender, is_system_account)
    values ('Yolink Bot', 'Yolink 官方助手', 'Yolink', true, 'General', 0,
            '我是 Yolink 的官方助手，帮助你了解社区、活动和连接功能。',
            '随时欢迎你来聊聊。', '#e6b84d', 'prefer_not_to_say', true)
    returning id into v_bot;
  end if;

  -- If the previous version of this migration created its plain default Bot,
  -- move its conversations to the designed Bot before removing that duplicate.
  if v_saved is not null
    and v_saved <> v_bot::text
    and exists (select 1 from profiles where id::text = v_saved) then
    v_legacy := v_saved::uuid;
  end if;
  insert into app_config (key, value) values ('yolink_bot_profile_id', v_bot::text)
  on conflict (key) do update set value = excluded.value;
  update profiles set is_system_account = true where id = v_bot;

  if v_legacy is not null and exists (
    select 1 from profiles
    where id = v_legacy
      and is_system_account = true
      and name = 'Yolink Bot'
      and title = 'Yolink 官方助手'
      and industry = 'General'
      and background = '我是 Yolink 的官方助手，帮助你了解社区、活动和连接功能。'
  ) then
    for v_old_match in
      select id, user_a, user_b from matches
      where user_a = v_legacy or user_b = v_legacy
    loop
      v_member := case when v_old_match.user_a = v_legacy then v_old_match.user_b else v_old_match.user_a end;
      -- The old script also matched the two Bot profiles with each other.
      -- There is no member conversation to preserve in that one row.
      if v_member <> v_bot then
        v_target_match := _yolink_make_match(v_member, v_bot, 'staff');
        insert into messages (match_id, sender_id, body, created_at)
        select v_target_match,
               case when sender_id = v_legacy then v_bot else sender_id end,
               body,
               created_at
        from messages
        where match_id = v_old_match.id;
      end if;
    end loop;
    delete from profiles where id = v_legacy;
  end if;

  -- Backfill every existing member with a Bot match and exactly one welcome message.
  insert into matches (user_a, user_b, source)
  select least(p.id, v_bot), greatest(p.id, v_bot), 'staff'
  from profiles p
  where p.id <> v_bot and not p.is_system_account
  on conflict (user_a, user_b) do nothing;

  insert into messages (match_id, sender_id, body)
  select m.id, v_bot, '欢迎来到 Yolink！需要帮助可以随时问我。'
  from matches m
  where (m.user_a = v_bot or m.user_b = v_bot)
    and not exists (select 1 from messages old where old.match_id = m.id and old.sender_id = v_bot and old.body = '欢迎来到 Yolink！需要帮助可以随时问我。');
end;
$$;

-- Update registration so every future member is automatically matched with Bot.
drop function if exists create_profile(text, text, text, text, int, text, text, boolean, text, text, text, text, text);
create or replace function create_profile(
  p_name text, p_title text, p_company text, p_industry text, p_years_exp int,
  p_background text, p_looking_for text, p_company_visible boolean, p_avatar_color text,
  p_avatar_image text, p_gender text, p_personality_tags text, p_custom_tag text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_profile profiles; v_code text; v_bot uuid; v_match uuid;
begin
  insert into profiles (name, title, company, company_visible, industry, years_exp, background, looking_for, personality_tags, custom_tag, avatar_color, avatar_image, gender)
  values (trim(p_name), trim(p_title), nullif(trim(p_company), ''), coalesce(p_company_visible, true), trim(p_industry), p_years_exp,
          trim(p_background), trim(p_looking_for), coalesce(trim(p_personality_tags), ''), nullif(trim(p_custom_tag), ''), p_avatar_color, p_avatar_image, coalesce(p_gender, 'prefer_not_to_say'))
  returning * into v_profile;
  loop
    v_code := _yolink_gen_code();
    begin
      insert into profile_secrets (profile_id, secret_code, name) values (v_profile.id, v_code, v_profile.name);
      exit;
    exception when unique_violation then
    end;
  end loop;
  select value::uuid into v_bot from app_config where key = 'yolink_bot_profile_id';
  if v_bot is not null then
    v_match := _yolink_make_match(v_profile.id, v_bot, 'staff');
    insert into messages (match_id, sender_id, body)
    select v_match, v_bot, '欢迎来到 Yolink！需要帮助可以随时问我。'
    where not exists (select 1 from messages where match_id = v_match and sender_id = v_bot and body = '欢迎来到 Yolink！需要帮助可以随时问我。');
  end if;
  return json_build_object('profile', row_to_json(v_profile), 'secret_code', v_code);
end;
$$;

-- Staff can reply manually in SQL Editor using a user's incoming message id.
create or replace function staff_reply_as_yolink_bot(p_admin_pass text, p_message_id bigint, p_body text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare v_bot uuid; v_match uuid; v_msg messages;
begin
  if not exists (select 1 from app_config where key = 'admin_passcode' and value = p_admin_pass) then raise exception 'INVALID_ADMIN_PASS'; end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 then raise exception 'MESSAGE_EMPTY'; end if;
  select value::uuid into v_bot from app_config where key = 'yolink_bot_profile_id';
  select m.id into v_match from messages incoming join matches m on m.id = incoming.match_id
  where incoming.id = p_message_id and (m.user_a = v_bot or m.user_b = v_bot);
  if v_match is null then raise exception 'BOT_CONVERSATION_NOT_FOUND'; end if;
  insert into messages (match_id, sender_id, body) values (v_match, v_bot, trim(p_body)) returning * into v_msg;
  return row_to_json(v_msg);
end;
$$;

notify pgrst, 'reload schema';
