-- EVs Driving Academy Ltd Academy admin/RLS fix
-- Run after 20260610_academy_backend.sql.

create extension if not exists pgcrypto;

create table if not exists public.academy_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.academy_videos
  add column if not exists section_id uuid references public.academy_sections(id) on delete set null,
  add column if not exists is_featured boolean not null default false;

create index if not exists academy_sections_published_sort_idx
  on public.academy_sections (is_published, sort_order, created_at);

create index if not exists academy_videos_section_sort_idx
  on public.academy_videos (section_id, sort_order, created_at desc);

create unique index if not exists academy_videos_one_featured_idx
  on public.academy_videos (is_featured)
  where is_featured = true;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_sections_set_updated_at on public.academy_sections;
create trigger academy_sections_set_updated_at
before update on public.academy_sections
for each row execute function public.set_updated_at();

drop trigger if exists academy_videos_set_updated_at on public.academy_videos;
create trigger academy_videos_set_updated_at
before update on public.academy_videos
for each row execute function public.set_updated_at();

create or replace function public.set_academy_video_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by = auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists academy_videos_set_created_by on public.academy_videos;
create trigger academy_videos_set_created_by
before insert on public.academy_videos
for each row execute function public.set_academy_video_created_by();

create or replace function public.ensure_single_featured_video()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_featured = true then
    update public.academy_videos
    set is_featured = false
    where id <> new.id
      and is_featured = true;
  end if;

  return new;
end;
$$;

drop trigger if exists academy_videos_single_featured on public.academy_videos;
create trigger academy_videos_single_featured
before insert or update of is_featured on public.academy_videos
for each row execute function public.ensure_single_featured_video();

-- Seed section records from existing categories so old videos can be assigned.
insert into public.academy_sections (title, description, sort_order, is_published)
select distinct
  coalesce(nullif(trim(category), ''), 'General') as title,
  coalesce(nullif(trim(category), ''), 'General') || ' tutorials from EVs Driving Academy.' as description,
  0 as sort_order,
  true as is_published
from public.academy_videos
where category is not null
on conflict do nothing;

update public.academy_videos v
set section_id = s.id
from public.academy_sections s
where v.section_id is null
  and coalesce(nullif(trim(v.category), ''), 'General') = s.title;

insert into public.academy_sections (title, description, sort_order, is_published)
select 'General', 'General EV Academy tutorials.', 0, true
where not exists (select 1 from public.academy_sections);

alter table public.academy_sections enable row level security;
alter table public.academy_videos enable row level security;
alter table public.video_comments enable row level security;
alter table public.video_progress enable row level security;
alter table public.profiles enable row level security;

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
      and role = 'admin'
  );
$$;

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

drop policy if exists "Published academy videos are readable" on public.academy_videos;
create policy "Published academy videos are readable"
on public.academy_videos
for select
to anon, authenticated
using (
  public.is_admin()
  or (
    is_published = true
    and (
      section_id is null
      or exists (
        select 1
        from public.academy_sections
        where academy_sections.id = academy_videos.section_id
          and academy_sections.is_published = true
      )
    )
  )
);

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

drop policy if exists "Comments on published videos are readable" on public.video_comments;
create policy "Comments on published videos are readable"
on public.video_comments
for select
to anon, authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.academy_videos
    left join public.academy_sections
      on academy_sections.id = academy_videos.section_id
    where academy_videos.id = video_comments.video_id
      and academy_videos.is_published = true
      and coalesce(academy_sections.is_published, true) = true
  )
);

drop policy if exists "Logged in users can create comments" on public.video_comments;
create policy "Logged in users can create comments"
on public.video_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.academy_videos
    left join public.academy_sections
      on academy_sections.id = academy_videos.section_id
    where academy_videos.id = video_comments.video_id
      and (public.is_admin() or (
        academy_videos.is_published = true
        and coalesce(academy_sections.is_published, true) = true
      ))
  )
);

drop policy if exists "Users can edit their own comments" on public.video_comments;
create policy "Users can edit their own comments"
on public.video_comments
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can delete their own comments and admins can delete all" on public.video_comments;
create policy "Users can delete their own comments and admins can delete all"
on public.video_comments
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can read own progress and admins read all" on public.video_progress;
create policy "Users can read own progress and admins read all"
on public.video_progress
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can insert their own progress" on public.video_progress;
create policy "Users can insert their own progress"
on public.video_progress
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own progress" on public.video_progress;
create policy "Users can update their own progress"
on public.video_progress
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can delete own progress and admins can delete all" on public.video_progress;
create policy "Users can delete own progress and admins can delete all"
on public.video_progress
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can read their profile and admins can read all" on public.profiles;
create policy "Users can read their profile and admins can read all"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Users can update their name and admins can manage profiles" on public.profiles;
create policy "Users can update their name and admins can manage profiles"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  (id = auth.uid() and role = 'student')
  or public.is_admin()
);

drop policy if exists "Users can insert own student profile and admins can insert profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Users can insert own student profile and admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (
  public.is_admin()
  or (id = auth.uid() and role = 'student')
);

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_admin());
