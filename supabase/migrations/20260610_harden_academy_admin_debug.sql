-- EVs Driving Academy Ltd Academy admin debug + RLS hardening
-- Run after 20260610_fix_academy_admin_rls.sql.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    );
$$;

create or replace function public.academy_admin_debug()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'auth_uid', auth.uid(),
    'jwt_email', auth.jwt()->>'email',
    'app_metadata_role', auth.jwt()->'app_metadata'->>'role',
    'profile_id', p.id,
    'profile_role', p.role,
    'profile_matches_session', p.id = auth.uid(),
    'is_admin', public.is_admin()
  )
  from (select 1) seed
  left join public.profiles p on p.id = auth.uid();
$$;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.academy_admin_debug() to authenticated;

drop policy if exists "Published academy sections are readable" on public.academy_sections;
create policy "Published academy sections are readable"
on public.academy_sections
for select
to anon, authenticated
using (is_published = true or public.is_admin());

drop policy if exists "Admins can insert academy sections" on public.academy_sections;
create policy "Admins can insert academy sections"
on public.academy_sections
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update academy sections" on public.academy_sections;
create policy "Admins can update academy sections"
on public.academy_sections
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete academy sections" on public.academy_sections;
create policy "Admins can delete academy sections"
on public.academy_sections
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert academy videos" on public.academy_videos;
create policy "Admins can insert academy videos"
on public.academy_videos
for insert
to authenticated
with check (
  public.is_admin()
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists "Admins can update academy videos" on public.academy_videos;
create policy "Admins can update academy videos"
on public.academy_videos
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete academy videos" on public.academy_videos;
create policy "Admins can delete academy videos"
on public.academy_videos
for delete
to authenticated
using (public.is_admin());
