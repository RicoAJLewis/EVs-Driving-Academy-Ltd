# Supabase Setup

Add these environment variables locally in `.env.local` and in Vercel Project Settings > Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
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

For Academy admin access, set the Supabase user's `user_metadata.role` to `admin`.
Visitor accounts created from the website are assigned `role: "visitor"`.

## Admin User

Old mock users such as `admin@evacademy.com` do not work unless they are created in Supabase Authentication.

To create an admin:

1. Open Supabase > Authentication > Users.
2. Click `Add user` > `Create new user`.
3. Enter the admin email and password.
4. Open the new user record.
5. Add this to the user's metadata:

```json
{
  "role": "admin",
  "name": "Admin User"
}
```

The frontend reads `user_metadata.role === "admin"` to allow access to `/academy/admin`.
If the role is missing, the user is treated as a normal visitor.
