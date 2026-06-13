-- Add owner/admin management support for EV Academy.
-- Safe to run on the existing database. Existing profile rows are preserved.

alter table public.profiles
  add column if not exists email text;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', constraint_name);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'admin', 'owner'));

update public.profiles p
set
  email = coalesce(p.email, u.email),
  full_name = coalesce(nullif(trim(p.full_name), ''), 'Rico Lewis'),
  role = 'owner'
from auth.users u
where p.id = u.id
  and lower(u.email) = 'ricoajlewis@gmail.com';

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

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_owner() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, created_at)
  values (
    new.id,
    public.get_default_profile_name(new.raw_user_meta_data, new.email),
    new.email,
    'student',
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set
    email = coalesce(public.profiles.email, excluded.email),
    full_name = coalesce(nullif(trim(public.profiles.full_name), ''), excluded.full_name),
    role = public.profiles.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, email, role, created_at)
select
  users.id,
  public.get_default_profile_name(users.raw_user_meta_data, users.email),
  users.email,
  'student',
  coalesce(users.created_at, now())
from auth.users
left join public.profiles
  on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;

update public.profiles p
set email = coalesce(p.email, u.email)
from auth.users u
where p.id = u.id;

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(lower(email));

create or replace function public.enforce_profile_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  if old.role = 'owner' then
    raise exception 'The owner role is protected.';
  end if;

  if new.role = 'owner' then
    raise exception 'Owner promotion must be handled manually by the existing owner.';
  end if;

  if old.role = 'student' and new.role = 'admin' then
    if not public.is_admin() then
      raise exception 'Only admins can promote students.';
    end if;
    return new;
  end if;

  if old.role = 'admin' and new.role = 'student' then
    if not public.is_owner() then
      raise exception 'Only the owner can demote admins.';
    end if;

    if old.id = auth.uid() then
      raise exception 'The owner cannot demote their own active account through this action.';
    end if;

    return new;
  end if;

  raise exception 'This profile role change is not allowed.';
end;
$$;

drop trigger if exists profiles_enforce_role_permissions on public.profiles;
create trigger profiles_enforce_role_permissions
before update of role on public.profiles
for each row execute function public.enforce_profile_role_permissions();

create or replace function public.promote_user_to_admin(target_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to promote users.';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can promote students.';
  end if;

  update public.profiles
  set role = 'admin'
  where id = target_user_id
    and role = 'student'
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Only student profiles can be promoted to admin.';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.demote_admin_to_student(target_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to demote users.';
  end if;

  if not public.is_owner() then
    raise exception 'Only the owner can demote admins.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'The owner cannot demote their own active account.';
  end if;

  update public.profiles
  set role = 'student'
  where id = target_user_id
    and role = 'admin'
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Only admin profiles can be demoted to student.';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.promote_user_to_admin(uuid) to authenticated;
grant execute on function public.demote_admin_to_student(uuid) to authenticated;

create or replace function public.can_read_chat_sender_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.chat_messages
      join public.chat_threads
        on chat_threads.id = chat_messages.thread_id
      where chat_messages.sender_id = profile_id
        and chat_threads.student_id = auth.uid()
        and chat_threads.deleted_by_admin_at is null
    );
$$;

grant execute on function public.can_read_chat_sender_profile(uuid) to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "Users can read their profile and admins can read all" on public.profiles;
create policy "Users can read their profile and admins can read all"
on public.profiles
for select
using (public.can_read_chat_sender_profile(id));

drop policy if exists "Users can update their name and admins can manage profiles" on public.profiles;
drop policy if exists "Users can update their own profile details" on public.profiles;
create policy "Users can update their own profile details"
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "Users can insert own student profile and admins can insert profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Users can insert own student profile and admins can insert profiles"
on public.profiles
for insert
with check (
  public.is_admin()
  or (id = auth.uid() and role = 'student')
);

drop policy if exists "Admins can delete profiles" on public.profiles;
drop policy if exists "Owners can delete non-owner profiles" on public.profiles;
create policy "Owners can delete non-owner profiles"
on public.profiles
for delete
using (public.is_owner() and role <> 'owner');
