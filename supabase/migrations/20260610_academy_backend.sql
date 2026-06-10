-- EVs Driving Academy Ltd Academy backend
-- Run this in the Supabase SQL editor, or through Supabase migrations.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamptz not null default now()
);

create table if not exists public.academy_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  video_url text not null,
  thumbnail_url text,
  category text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.academy_videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id uuid not null references public.academy_videos(id) on delete cascade,
  watched boolean not null default false,
  watched_at timestamptz,
  progress_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, video_id)
);

create index if not exists academy_videos_published_sort_idx
  on public.academy_videos (is_published, sort_order, created_at desc);

create index if not exists video_comments_video_id_created_at_idx
  on public.video_comments (video_id, created_at desc);

create index if not exists video_progress_user_video_idx
  on public.video_progress (user_id, video_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists academy_videos_set_updated_at on public.academy_videos;
create trigger academy_videos_set_updated_at
before update on public.academy_videos
for each row execute function public.set_updated_at();

drop trigger if exists video_progress_set_updated_at on public.video_progress;
create trigger video_progress_set_updated_at
before update on public.video_progress
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    case
      when new.raw_app_meta_data->>'role' = 'admin'
        or new.raw_user_meta_data->>'role' = 'admin'
      then 'admin'
      else 'student'
    end
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        role = public.profiles.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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

alter table public.profiles enable row level security;
alter table public.academy_videos enable row level security;
alter table public.video_comments enable row level security;
alter table public.video_progress enable row level security;

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

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Published academy videos are readable" on public.academy_videos;
create policy "Published academy videos are readable"
on public.academy_videos
for select
to anon, authenticated
using (is_published = true or public.is_admin());

drop policy if exists "Admins can insert academy videos" on public.academy_videos;
create policy "Admins can insert academy videos"
on public.academy_videos
for insert
to authenticated
with check (public.is_admin());

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
    where academy_videos.id = video_comments.video_id
      and academy_videos.is_published = true
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
    where academy_videos.id = video_comments.video_id
      and (academy_videos.is_published = true or public.is_admin())
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
