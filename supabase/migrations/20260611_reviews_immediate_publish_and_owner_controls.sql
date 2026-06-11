-- EVs Driving Academy Ltd reviews immediate publish + owner controls
-- Run after 20260611_fix_reviews_rls.sql.

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

alter table public.reviews
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.reviews
  add column if not exists source text not null default 'EVs Driving Academy Ltd';

alter table public.reviews
  add column if not exists is_published boolean not null default true;

alter table public.reviews
  add column if not exists updated_at timestamp with time zone not null default now();

update public.reviews
set source = 'EVs Driving Academy Ltd'
where source is null or trim(source) = '';

update public.reviews
set is_published = true
where is_published is distinct from true;

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

create or replace function public.protect_review_owner_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.user_id is distinct from old.user_id
    or new.reviewer_name is distinct from old.reviewer_name
    or new.source is distinct from old.source
    or new.is_published is distinct from old.is_published
    or new.created_at is distinct from old.created_at then
    raise exception 'Students can only edit review rating and comment.';
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_protect_owner_fields on public.reviews;
create trigger reviews_protect_owner_fields
before update on public.reviews
for each row execute function public.protect_review_owner_fields();

alter table public.reviews enable row level security;

drop policy if exists "Public reviews are readable" on public.reviews;
drop policy if exists "Authenticated users can create their own reviews" on public.reviews;
drop policy if exists "Published reviews are publicly readable" on public.reviews;
drop policy if exists "Authenticated users can create own pending website reviews" on public.reviews;
drop policy if exists "Users can update own pending website reviews" on public.reviews;
drop policy if exists "Users can delete own pending website reviews" on public.reviews;
drop policy if exists "Admins can manage all reviews" on public.reviews;
drop policy if exists "Authenticated users can create own public website reviews" on public.reviews;
drop policy if exists "Users can update own website reviews" on public.reviews;
drop policy if exists "Users can delete own website reviews" on public.reviews;

create policy "Published reviews are publicly readable"
on public.reviews
for select
to anon, authenticated
using (is_published = true or public.is_admin());

create policy "Authenticated users can create own public website reviews"
on public.reviews
for insert
to authenticated
with check (
  auth.uid() = user_id
  and rating between 1 and 5
  and source = 'EVs Driving Academy Ltd'
  and is_published = true
);

create policy "Users can update own website reviews"
on public.reviews
for update
to authenticated
using (
  auth.uid() = user_id
  and source = 'EVs Driving Academy Ltd'
)
with check (
  auth.uid() = user_id
  and source = 'EVs Driving Academy Ltd'
  and is_published = true
);

create policy "Users can delete own website reviews"
on public.reviews
for delete
to authenticated
using (
  auth.uid() = user_id
  and source = 'EVs Driving Academy Ltd'
);

create policy "Admins can manage all reviews"
on public.reviews
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists reviews_published_created_at_idx
on public.reviews (is_published, created_at desc);

create index if not exists reviews_user_id_idx
on public.reviews (user_id);
