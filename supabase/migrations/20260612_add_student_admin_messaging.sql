-- Private one-to-one student/admin messaging for EV Academy.
-- Run this in Supabase SQL Editor after the existing academy/profile migrations.

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid null references public.profiles(id) on delete set null,
  student_name text null,
  student_email text null,
  status text not null default 'open' check (status in ('open', 'archived')),
  last_message text null,
  last_message_at timestamptz null,
  student_unread_count integer not null default 0 check (student_unread_count >= 0),
  admin_unread_count integer not null default 0 check (admin_unread_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  deleted_by_admin_at timestamptz null
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid null references auth.users(id) on delete set null,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz null
);

create index if not exists chat_threads_student_id_idx
on public.chat_threads(student_id);

create index if not exists chat_threads_admin_inbox_idx
on public.chat_threads(status, last_message_at desc)
where deleted_by_admin_at is null;

create index if not exists chat_messages_thread_created_at_idx
on public.chat_messages(thread_id, created_at);

create index if not exists chat_messages_receiver_read_idx
on public.chat_messages(receiver_id, read_at)
where read_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chat_threads_set_updated_at on public.chat_threads;
create trigger chat_threads_set_updated_at
before update on public.chat_threads
for each row execute function public.set_updated_at();

create or replace function public.prepare_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_record public.chat_threads%rowtype;
begin
  select *
  into thread_record
  from public.chat_threads
  where id = new.thread_id;

  if not found then
    raise exception 'Chat thread not found.';
  end if;

  if new.sender_id <> auth.uid() then
    raise exception 'Messages must be sent by the logged-in user.';
  end if;

  if public.is_admin() then
    if thread_record.student_id = new.sender_id then
      raise exception 'Admin replies must be sent from an admin profile.';
    end if;

    new.receiver_id = thread_record.student_id;
  else
    if thread_record.student_id <> auth.uid() then
      raise exception 'Students can only message from their own thread.';
    end if;

    new.receiver_id = thread_record.admin_id;
  end if;

  new.body = trim(new.body);
  return new;
end;
$$;

drop trigger if exists chat_messages_prepare_insert on public.chat_messages;
create trigger chat_messages_prepare_insert
before insert on public.chat_messages
for each row execute function public.prepare_chat_message();

create or replace function public.update_chat_thread_after_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_student_id uuid;
begin
  select student_id
  into thread_student_id
  from public.chat_threads
  where id = new.thread_id;

  update public.chat_threads
  set
    last_message = left(new.body, 180),
    last_message_at = new.created_at,
    status = 'open',
    archived_at = null,
    admin_id = case
      when public.is_admin() and admin_id is null then new.sender_id
      else admin_id
    end,
    admin_unread_count = case
      when new.sender_id = thread_student_id then admin_unread_count + 1
      else admin_unread_count
    end,
    student_unread_count = case
      when new.sender_id <> thread_student_id then student_unread_count + 1
      else student_unread_count
    end
  where id = new.thread_id;

  return new;
end;
$$;

drop trigger if exists chat_messages_update_thread_after_insert on public.chat_messages;
create trigger chat_messages_update_thread_after_insert
after insert on public.chat_messages
for each row execute function public.update_chat_thread_after_message();

create or replace function public.mark_chat_thread_read(thread_id_input uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_record public.chat_threads%rowtype;
begin
  select *
  into thread_record
  from public.chat_threads
  where id = thread_id_input;

  if not found then
    raise exception 'Chat thread not found.';
  end if;

  if public.is_admin() then
    update public.chat_messages
    set read_at = coalesce(read_at, now())
    where thread_id = thread_id_input
      and sender_id = thread_record.student_id
      and read_at is null;

    update public.chat_threads
    set admin_unread_count = 0
    where id = thread_id_input;
  elsif thread_record.student_id = auth.uid() then
    update public.chat_messages
    set read_at = coalesce(read_at, now())
    where thread_id = thread_id_input
      and sender_id <> auth.uid()
      and read_at is null;

    update public.chat_threads
    set student_unread_count = 0
    where id = thread_id_input;
  else
    raise exception 'Not allowed to mark this chat thread as read.';
  end if;
end;
$$;

grant execute on function public.mark_chat_thread_read(uuid) to authenticated;

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Students read own threads and admins read all threads" on public.chat_threads;
create policy "Students read own threads and admins read all threads"
on public.chat_threads
for select
to authenticated
using (
  public.is_admin()
  or student_id = auth.uid()
);

drop policy if exists "Students create own chat thread" on public.chat_threads;
create policy "Students create own chat thread"
on public.chat_threads
for insert
to authenticated
with check (
  not public.is_admin()
  and student_id = auth.uid()
  and coalesce(status, 'open') = 'open'
);

drop policy if exists "Admins manage chat threads" on public.chat_threads;
create policy "Admins manage chat threads"
on public.chat_threads
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete chat threads" on public.chat_threads;
create policy "Admins delete chat threads"
on public.chat_threads
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Thread participants read chat messages" on public.chat_messages;
create policy "Thread participants read chat messages"
on public.chat_messages
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.chat_threads
    where chat_threads.id = chat_messages.thread_id
      and chat_threads.student_id = auth.uid()
  )
);

drop policy if exists "Participants send chat messages" on public.chat_messages;
create policy "Participants send chat messages"
on public.chat_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.chat_threads
      where chat_threads.id = chat_messages.thread_id
        and chat_threads.student_id = auth.uid()
    )
  )
);

drop policy if exists "Admins can delete chat messages" on public.chat_messages;
create policy "Admins can delete chat messages"
on public.chat_messages
for delete
to authenticated
using (public.is_admin());
