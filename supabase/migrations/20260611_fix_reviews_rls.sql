-- EVs Driving Academy Ltd reviews moderation + RLS hardening
-- Run after the Academy backend/RLS migrations.

create extension if not exists pgcrypto;

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

grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  source text not null default 'EVs Driving Academy Ltd',
  is_published boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.reviews
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.reviews
  add column if not exists reviewer_name text;

alter table public.reviews
  add column if not exists rating integer;

alter table public.reviews
  add column if not exists comment text;

alter table public.reviews
  add column if not exists source text not null default 'EVs Driving Academy Ltd';

alter table public.reviews
  add column if not exists is_published boolean not null default false;

alter table public.reviews
  add column if not exists created_at timestamp with time zone not null default now();

alter table public.reviews
  add column if not exists updated_at timestamp with time zone not null default now();

update public.reviews
set source = 'EVs Driving Academy Ltd'
where source is null or trim(source) = '';

update public.reviews
set is_published = true
where lower(source) = 'setmore';

update public.reviews
set reviewer_name = 'EV Academy Student'
where reviewer_name is null or trim(reviewer_name) = '';

update public.reviews
set rating = 5
where rating is null;

update public.reviews
set comment = 'Review imported before moderation fields were added.'
where comment is null or trim(comment) = '';

update public.reviews
set created_at = now()
where created_at is null;

update public.reviews
set updated_at = now()
where updated_at is null;

alter table public.reviews
  alter column reviewer_name set not null,
  alter column rating set not null,
  alter column comment set not null,
  alter column source set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reviews_rating_range'
      and conrelid = 'public.reviews'::regclass
  ) then
    alter table public.reviews
      add constraint reviews_rating_range check (rating between 1 and 5);
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

drop policy if exists "Public reviews are readable" on public.reviews;
drop policy if exists "Authenticated users can create their own reviews" on public.reviews;
drop policy if exists "Published reviews are publicly readable" on public.reviews;
drop policy if exists "Authenticated users can create own pending website reviews" on public.reviews;
drop policy if exists "Users can update own pending website reviews" on public.reviews;
drop policy if exists "Users can delete own pending website reviews" on public.reviews;
drop policy if exists "Admins can manage all reviews" on public.reviews;

create policy "Published reviews are publicly readable"
on public.reviews
for select
to anon, authenticated
using (is_published = true or public.is_admin());

create policy "Authenticated users can create own pending website reviews"
on public.reviews
for insert
to authenticated
with check (
  auth.uid() = user_id
  and rating between 1 and 5
  and source = 'EVs Driving Academy Ltd'
  and is_published = false
);

create policy "Users can update own pending website reviews"
on public.reviews
for update
to authenticated
using (
  auth.uid() = user_id
  and source = 'EVs Driving Academy Ltd'
  and is_published = false
)
with check (
  auth.uid() = user_id
  and source = 'EVs Driving Academy Ltd'
  and is_published = false
);

create policy "Users can delete own pending website reviews"
on public.reviews
for delete
to authenticated
using (
  auth.uid() = user_id
  and source = 'EVs Driving Academy Ltd'
  and is_published = false
);

create policy "Admins can manage all reviews"
on public.reviews
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists reviews_published_created_at_idx
on public.reviews (is_published, created_at desc);

create index if not exists reviews_source_idx
on public.reviews (source);

create index if not exists reviews_user_id_idx
on public.reviews (user_id);
