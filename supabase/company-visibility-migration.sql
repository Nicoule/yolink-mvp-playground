-- Yolink company visibility migration
-- Run once in Supabase Dashboard -> SQL Editor.

alter table profiles add column if not exists company_visible boolean not null default true;

create or replace function create_profile(
  p_name text, p_title text, p_company text, p_industry text,
  p_years_exp int, p_background text, p_looking_for text, p_company_visible boolean,
  p_avatar_color text, p_avatar_image text, p_gender text
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
  insert into profiles (name, title, company, company_visible, industry, years_exp, background, looking_for, avatar_color, avatar_image, gender)
  values (trim(p_name), trim(p_title), nullif(trim(p_company), ''), coalesce(p_company_visible, true), trim(p_industry),
          p_years_exp, trim(p_background), trim(p_looking_for), p_avatar_color, p_avatar_image, coalesce(p_gender, 'prefer_not_to_say'))
  returning * into v_profile;
  loop
    v_code := _yolink_gen_code();
    begin
      insert into profile_secrets (profile_id, secret_code) values (v_profile.id, v_code);
      exit;
    exception when unique_violation then
    end;
  end loop;
  return json_build_object('profile', row_to_json(v_profile), 'secret_code', v_code);
end;
$$;

create or replace function update_profile(
  p_code text, p_name text, p_title text, p_company text, p_industry text,
  p_years_exp int, p_background text, p_looking_for text, p_company_visible boolean,
  p_avatar_color text, p_avatar_image text, p_gender text
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
    company = nullif(trim(p_company), ''), company_visible = coalesce(p_company_visible, true), industry = trim(p_industry),
    years_exp = p_years_exp, background = trim(p_background), looking_for = trim(p_looking_for),
    avatar_color = p_avatar_color, avatar_image = p_avatar_image,
    gender = coalesce(p_gender, 'prefer_not_to_say')
  where id = v_id
  returning * into v_profile;
  return row_to_json(v_profile);
end;
$$;

notify pgrst, 'reload schema';
