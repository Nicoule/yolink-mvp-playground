-- Yolink profile card color migration
-- Run once in Supabase Dashboard -> SQL Editor.

create or replace function update_profile(
  p_code text, p_name text, p_title text, p_company text, p_industry text,
  p_years_exp int, p_background text, p_looking_for text, p_avatar_color text,
  p_avatar_image text, p_gender text
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
    avatar_color = p_avatar_color, avatar_image = p_avatar_image,
    gender = coalesce(p_gender, 'prefer_not_to_say')
  where id = v_id
  returning * into v_profile;
  return row_to_json(v_profile);
end;
$$;

notify pgrst, 'reload schema';
