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
https://evsdrivingacademy.com

Redirect URLs:
https://evsdrivingacademy.com/**
http://localhost:3000/**
```

Make sure the URLs are entered without spaces and include the `/**` wildcard for both production and local development.

Password reset emails should redirect to:

```text
/academy/reset-password
```

New account confirmation emails should redirect to:

```text
/academy/auth/callback
```

## Reviews

Run these migrations in Supabase SQL Editor to create or update the `public.reviews` table and its RLS policies:

```text
supabase/migrations/20260611_fix_reviews_rls.sql
supabase/migrations/20260611_reviews_immediate_publish_and_owner_controls.sql
```

The current reviews policy is immediate-publish:

- Public visitors can read only reviews where `is_published = true`.
- Signed-in students can submit their own `EVs Driving Academy Ltd` review with `is_published = true`.
- Signed-in students can edit/delete only their own website-submitted reviews.
- Signed-in students cannot create, edit, or delete fake `Setmore` reviews.
- Admins can read and delete all reviews.

Website-submitted reviews appear publicly immediately on the homepage. Admins can remove inappropriate reviews from the Admin dashboard under `Reviews`.

## Academy Backend Schema

Run these Academy migrations in Supabase SQL Editor in this order:

```text
supabase/migrations/20260610_academy_backend.sql
supabase/migrations/20260610_fix_academy_admin_rls.sql
supabase/migrations/20260610_harden_academy_admin_debug.sql
supabase/migrations/20260611_fix_reviews_rls.sql
supabase/migrations/20260611_reviews_immediate_publish_and_owner_controls.sql
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
- Admin debug RPC checks for live session/profile/RLS troubleshooting.
- Immediate-publish website reviews with owner edit/delete and admin delete controls.

Videos are stored as external URLs only. Use YouTube unlisted, Vimeo, TikTok, Instagram, or other public embeddable links. Do not upload large video files to the Next.js project or GitHub repo.

For Academy admin access, make sure the Supabase user has a matching `profiles` row with `role = 'admin'`. The frontend and database RLS also accept `app_metadata.role === "admin"` for compatibility.
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
new row violates row-level security policy for table academy_sections
```

Check these items:

1. The `20260610_fix_academy_admin_rls.sql` migration has been run successfully.
2. The `20260610_harden_academy_admin_debug.sql` migration has been run successfully.
3. The logged-in user exists in `public.profiles`.
4. The logged-in user's `public.profiles.role` is exactly `admin`.
5. The browser is logged into the same email that was promoted to admin.
6. The video is being added from `/academy/admin` using an external video URL, not a local file path.

The important policy is:

```sql
create policy "Admins can insert academy sections"
on public.academy_sections
for insert
to authenticated
with check (public.is_admin());
```

`public.is_admin()` checks `public.profiles.role = 'admin'` for the currently logged-in Supabase user and also accepts Supabase `app_metadata.role = 'admin'` for compatibility. Do not disable RLS to fix this error.

The `/academy/admin` page includes an admin-only debug panel. On the live site, confirm:

- `Session exists` is `Yes`
- `Profile id` matches the shown user id
- `Profile role` is `admin`
- `public.is_admin()` is `true`

Temporary debug page:

```text
/academy/debug
```

Use this page after deployment to confirm the live browser app can read Supabase environment variables, load the current Supabase session, find the matching `profiles` row, read Academy tables, and run a controlled `academy_sections` insert/delete test for admin users.

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

## Admin Management and Owner Role

Run `supabase/migrations/20260613_add_admin_management_and_owner_role.sql` before using the `Admins` tab.

This migration adds:

- `owner` as the protected first-admin role.
- `admin` as the promoted staff/admin role.
- `student` as the default role for new signups.
- `profiles.email` for admin profile management.
- `public.is_admin()` returning true for both `admin` and `owner`.
- `public.is_owner()` for owner-only actions.
- `public.promote_user_to_admin(target_user_id uuid)`.
- `public.demote_admin_to_student(target_user_id uuid)`.
- An auth trigger that creates missing `public.profiles` rows for future signups.

Rico Lewis is promoted to `owner` by matching the existing Supabase Auth email:

```sql
select id, full_name, email, role
from public.profiles
where lower(email) = 'ricoajlewis@gmail.com';
```

Expected result:

```text
role = owner
```

Admins can promote students from `/academy/admin` > `Admins`. Only the owner can demote admins back to students. The owner account is protected from accidental self-demotion.
