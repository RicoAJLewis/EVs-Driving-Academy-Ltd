# Supabase Setup

Add these environment variables locally in `.env.local` and in Vercel Project Settings > Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Auth URL Configuration

In Supabase > Authentication > URL Configuration, set:

```text
Site URL:
https://evs-driving-academy-ltd.vercel.app

Redirect URLs:
https://evs-driving-academy-ltd.vercel.app/**
http://localhost:3000/**
```

Password reset emails should redirect to:

```text
/academy/reset-password
```

New account confirmation emails should redirect to:

```text
/academy/auth/callback
```

Create the public reviews table:

```sql
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  reviewer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  source text not null default 'EVs Driving Academy Ltd',
  created_at timestamp with time zone not null default now()
);
```

Enable Row Level Security:

```sql
alter table public.reviews enable row level security;
```

Allow public read access:

```sql
create policy "Public reviews are readable"
on public.reviews
for select
using (true);
```

Allow authenticated users to insert their own reviews:

```sql
create policy "Authenticated users can create their own reviews"
on public.reviews
for insert
to authenticated
with check (auth.uid() = user_id);
```

Optional update/delete protection can be added later if review editing is introduced.

## Academy Backend Schema

Run these Academy migrations in Supabase SQL Editor in this order:

```text
supabase/migrations/20260610_academy_backend.sql
supabase/migrations/20260610_fix_academy_admin_rls.sql
```

These create and update:

- `profiles`
- `academy_sections`
- `academy_videos`
- `video_comments`
- `video_progress`

They also enable Row Level Security and policies for:

- Published section reads.
- Published academy video reads.
- Admin-only video create/update/delete.
- Admin-only section create/update/delete.
- Authenticated student comments.
- Own-progress tracking for students.
- Admin visibility across comments/progress.
- One featured video at a time.

Videos are stored as external URLs only. Use YouTube unlisted, Vimeo, TikTok, Instagram, or other public embeddable links. Do not upload large video files to the Next.js project or GitHub repo.

For Academy admin access, make sure the Supabase user has a matching `profiles` row with `role = 'admin'`. The frontend also accepts `app_metadata.role === "admin"` for compatibility, but the database RLS policies use `profiles.role`.
Student accounts created from the website are assigned `role: "student"`.

## Admin User

Old mock users such as `admin@evacademy.com` do not work unless they are created in Supabase Authentication.

To create an admin from the dashboard:

1. Open Supabase > Authentication > Users.
2. Click `Add user` > `Create new user`.
3. Enter the admin email and password.
4. Open Supabase > SQL Editor.
5. Run this SQL, replacing the email and name if needed:

```sql
-- Replace this email/name with the real admin user.
update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || '{"role": "admin"}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || '{"name": "Admin User", "full_name": "Admin User"}'::jsonb
where email = 'ricoajlewis@gmail.com';

insert into public.profiles (id, full_name, role)
select id, 'Admin User', 'admin'
from auth.users
where email = 'ricoajlewis@gmail.com'
on conflict (id) do update
set full_name = excluded.full_name,
    role = 'admin';
```

Confirm the admin profile exists:

```sql
select
  u.email,
  p.id,
  p.full_name,
  p.role
from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'ricoajlewis@gmail.com';
```

The result must show `role` as `admin`. If it shows `student` or `null`, the Academy Admin page will not be allowed to insert videos because RLS will block it.

The user's Raw JSON should then include:

```json
{
  "raw_app_meta_data": {
    "provider": "email",
    "providers": ["email"],
    "role": "admin"
  },
  "raw_user_meta_data": {
    "email_verified": true,
    "name": "Admin User"
  }
}
```

The frontend reads the `profiles.role` and also accepts `app_metadata.role === "admin"` for compatibility. If the role is missing, the user is treated as a normal student.

## RLS Insert Troubleshooting

If the admin page shows:

```text
new row violates row-level security policy for table academy_videos
```

Check these items:

1. The `20260610_fix_academy_admin_rls.sql` migration has been run successfully.
2. The logged-in user exists in `public.profiles`.
3. The logged-in user's `public.profiles.role` is exactly `admin`.
4. The browser is logged into the same email that was promoted to admin.
5. The video is being added from `/academy/admin` using an external video URL, not a local file path.

The important policy is:

```sql
create policy "Admins can insert academy videos"
on public.academy_videos
for insert
to authenticated
with check (
  public.is_admin()
  and (created_by is null or created_by = auth.uid())
);
```

`public.is_admin()` checks `public.profiles.role = 'admin'` for the currently logged-in Supabase user. Do not disable RLS to fix this error.

## Adding the First Academy Video

1. Log in with the admin user.
2. Open `/academy/admin`.
3. Go to `Sections` and create at least one section, such as `Beginner Lessons`.
4. Go to `Videos / Playlists`.
5. Use `Add External Video`.
6. Add:
   - Title
   - Description
   - External video URL or embed URL
   - Optional thumbnail URL
   - Section
   - Category
   - Sort order
   - Published status
   - Featured status if this should be the featured tutorial
7. Save the video link.

Published videos appear in `/academy` and `/academy/dashboard`. Unpublished videos remain admin-only. Only one video can be featured at a time.

## Testing the First Admin Insert

After running the migrations and promoting the admin:

1. Log out of the site.
2. Log back in with the promoted admin email.
3. Open `/academy/admin`.
4. Create a section if none exists.
5. Add an external test video URL, for example a YouTube unlisted or public embed URL.
6. Confirm that the success message appears and the video record shows in the admin list.

If the insert fails, run the admin profile confirmation query above and verify the current browser user is the same email.
