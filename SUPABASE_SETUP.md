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

Run the Academy migration in Supabase SQL Editor:

```text
supabase/migrations/20260610_academy_backend.sql
```

This creates:

- `profiles`
- `academy_videos`
- `video_comments`
- `video_progress`

It also enables Row Level Security and policies for:

- Published academy video reads.
- Admin-only video create/update/delete.
- Authenticated student comments.
- Own-progress tracking for students.
- Admin visibility across comments/progress.

Videos are stored as external URLs only. Use YouTube unlisted, Vimeo, TikTok, Instagram, or other public embeddable links. Do not upload large video files to the Next.js project or GitHub repo.

For Academy admin access, set the Supabase user's `app_metadata.role` to `admin` and make their `profiles.role` admin.
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
update auth.users
set
  raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || '{"role": "admin"}'::jsonb,
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
    || '{"name": "Admin User"}'::jsonb
where email = 'ricoajlewis@gmail.com';

insert into public.profiles (id, full_name, role)
select id, 'Admin User', 'admin'
from auth.users
where email = 'ricoajlewis@gmail.com'
on conflict (id) do update
set full_name = excluded.full_name,
    role = 'admin';
```

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

## Adding the First Academy Video

1. Log in with the admin user.
2. Open `/academy/admin`.
3. Go to `Videos`.
4. Add:
   - Title
   - Description
   - External video URL
   - Optional thumbnail URL
   - Category
   - Sort order
   - Published status
5. Save the video.

Published videos appear in `/academy` and `/academy/dashboard`. Unpublished videos remain admin-only.
