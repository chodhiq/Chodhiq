-- Keep the public customer profile index synchronized with Supabase Auth.
-- Email and credentials remain in auth.users; public.profiles stores only
-- application profile fields.

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do update
    set full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$;

revoke all on function public.create_profile_for_auth_user() from public;

drop trigger if exists create_profile_after_auth_signup on auth.users;
create trigger create_profile_after_auth_signup
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

-- Repair accounts created before the trigger was installed.
insert into public.profiles (id, full_name)
select
  users.id,
  nullif(trim(coalesce(users.raw_user_meta_data ->> 'full_name', '')), '')
from auth.users as users
on conflict (id) do update
  set full_name = coalesce(public.profiles.full_name, excluded.full_name);
