-- Ensure every Supabase Auth user has a matching public.profiles row.
-- Safe to run on the existing database. Existing profiles, including admins,
-- are not overwritten.

create or replace function public.get_default_profile_name(
  user_metadata jsonb,
  user_email text
)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(trim(user_metadata ->> 'full_name'), ''),
    nullif(trim(user_metadata ->> 'name'), ''),
    nullif(trim(split_part(coalesce(user_email, ''), '@', 1)), ''),
    'Student'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, created_at)
  values (
    new.id,
    public.get_default_profile_name(new.raw_user_meta_data, new.email),
    'student',
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, role, created_at)
select
  users.id,
  public.get_default_profile_name(users.raw_user_meta_data, users.email),
  'student',
  coalesce(users.created_at, now())
from auth.users
left join public.profiles
  on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;
