-- Follow-up fix for student/admin messaging first-message inserts.
-- This is safe to run after 20260612_add_student_admin_messaging.sql.

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.chat_threads'::regclass
    and contype = 'f'
    and conkey = array[
      (
        select attnum
        from pg_attribute
        where attrelid = 'public.chat_threads'::regclass
          and attname = 'student_id'
      )
    ];

  if constraint_name is not null then
    execute format('alter table public.chat_threads drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table public.chat_threads
  add constraint chat_threads_student_id_fkey
  foreign key (student_id)
  references auth.users(id)
  on delete cascade;

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.chat_threads'::regclass
    and contype = 'f'
    and conkey = array[
      (
        select attnum
        from pg_attribute
        where attrelid = 'public.chat_threads'::regclass
          and attname = 'admin_id'
      )
    ];

  if constraint_name is not null then
    execute format('alter table public.chat_threads drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table public.chat_threads
  add constraint chat_threads_admin_id_fkey
  foreign key (admin_id)
  references auth.users(id)
  on delete set null;

create or replace function public.send_student_chat_message(message_body text)
returns table(thread_id uuid, message_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_user_email text := nullif(auth.jwt() ->> 'email', '');
  profile_name text;
  active_thread_id uuid;
  inserted_message_id uuid;
  cleaned_body text := trim(coalesce(message_body, ''));
begin
  if current_user_id is null then
    raise exception 'You must be logged in to send a message.';
  end if;

  if public.is_admin() then
    raise exception 'Admins should reply from the admin Messages tab.';
  end if;

  if cleaned_body = '' then
    raise exception 'Message body is required.';
  end if;

  if char_length(cleaned_body) > 4000 then
    raise exception 'Message is too long.';
  end if;

  select full_name
  into profile_name
  from public.profiles
  where id = current_user_id;

  select id
  into active_thread_id
  from public.chat_threads
  where student_id = current_user_id
    and deleted_by_admin_at is null
  order by
    case when status = 'open' then 0 else 1 end,
    coalesce(last_message_at, created_at) desc
  limit 1;

  if active_thread_id is null then
    insert into public.chat_threads (
      student_id,
      student_name,
      student_email,
      status,
      student_unread_count,
      admin_unread_count
    )
    values (
      current_user_id,
      coalesce(nullif(trim(profile_name), ''), split_part(coalesce(current_user_email, 'EV Academy Student'), '@', 1), 'EV Academy Student'),
      coalesce(current_user_email, ''),
      'open',
      0,
      0
    )
    returning id into active_thread_id;
  end if;

  insert into public.chat_messages (thread_id, sender_id, body)
  values (active_thread_id, current_user_id, cleaned_body)
  returning id into inserted_message_id;

  thread_id := active_thread_id;
  message_id := inserted_message_id;
  return next;
end;
$$;

grant execute on function public.send_student_chat_message(text) to authenticated;

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
