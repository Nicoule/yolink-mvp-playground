-- Yolink Profile Photos migration
-- Run this once in Supabase Dashboard -> SQL Editor.

alter table profiles add column if not exists avatar_image text;
alter table profiles drop constraint if exists profiles_avatar_image_check;
alter table profiles add constraint profiles_avatar_image_check
  check (avatar_image is null or (char_length(avatar_image) <= 800000
    and avatar_image ~ '^data:image/(jpeg|png|webp);base64,'));

drop function if exists create_profile(text, text, text, text, int, text, text, text);
drop function if exists update_profile(text, text, text, text, text, int, text, text);

create or replace function create_profile(
  p_name text, p_title text, p_company text, p_industry text,
  p_years_exp int, p_background text, p_looking_for text,
  p_avatar_color text, p_avatar_image text
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
  insert into profiles (name, title, company, industry, years_exp, background, looking_for, avatar_color, avatar_image)
  values (trim(p_name), trim(p_title), nullif(trim(p_company), ''), trim(p_industry),
          p_years_exp, trim(p_background), trim(p_looking_for), p_avatar_color, p_avatar_image)
  returning * into v_profile;
  loop
    v_code := _yolink_gen_code();
    begin
      insert into profile_secrets (profile_id, secret_code, name) values (v_profile.id, v_code, v_profile.name);
      exit;
    exception when unique_violation then
    end;
  end loop;
  return json_build_object('profile', row_to_json(v_profile), 'secret_code', v_code);
end;
$$;

create or replace function update_profile(
  p_code text, p_name text, p_title text, p_company text, p_industry text,
  p_years_exp int, p_background text, p_looking_for text, p_avatar_image text
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
    years_exp = p_years_exp, background = trim(p_background), looking_for = trim(p_looking_for),
    avatar_image = p_avatar_image
  where id = v_id
  returning * into v_profile;
  return row_to_json(v_profile);
end;
$$;

notify pgrst, 'reload schema';
