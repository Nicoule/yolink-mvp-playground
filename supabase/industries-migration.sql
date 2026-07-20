-- Yolink multi-industry migration
-- Run this once in Supabase Dashboard -> SQL Editor.

alter table profiles drop constraint if exists profiles_industry_check;
alter table profiles add constraint profiles_industry_check
  check (char_length(industry) between 1 and 240 and array_length(string_to_array(industry, '|'), 1) between 1 and 3);
