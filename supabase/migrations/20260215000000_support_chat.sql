-- Support chat (widget flutuante) para falar com a equipe/admin.

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_threads_user_id_idx
  on public.support_threads (user_id);

create index if not exists support_threads_updated_at_idx
  on public.support_threads (updated_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads (id) on delete cascade,
  sender_user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_messages_thread_id_idx
  on public.support_messages (thread_id);

create index if not exists support_messages_created_at_idx
  on public.support_messages (created_at);

-- Keep thread ordering accurate when new messages arrive.
create or replace function public.touch_support_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_threads
  set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists support_messages_touch_thread on public.support_messages;
create trigger support_messages_touch_thread
after insert on public.support_messages
for each row execute function public.touch_support_thread();

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;

-- Threads: user sees their own; admin sees all.
drop policy if exists "Users can view own support threads" on public.support_threads;
drop policy if exists "Users can create support threads" on public.support_threads;
drop policy if exists "Users can update own support threads" on public.support_threads;
drop policy if exists "Admins can manage support threads" on public.support_threads;

create policy "Users can view own support threads"
  on public.support_threads for select
  using (auth.uid() = user_id);

create policy "Users can create support threads"
  on public.support_threads for insert
  with check (auth.uid() = user_id);

create policy "Users can update own support threads"
  on public.support_threads for update
  using (auth.uid() = user_id);

create policy "Admins can manage support threads"
  on public.support_threads for all
  using (is_admin())
  with check (is_admin());

-- Messages: user sees/sends only inside own threads; admin sees/sends all.
drop policy if exists "Users can view own support messages" on public.support_messages;
drop policy if exists "Users can send support messages" on public.support_messages;
drop policy if exists "Admins can manage support messages" on public.support_messages;

create policy "Users can view own support messages"
  on public.support_messages for select
  using (
    exists (
      select 1
      from public.support_threads t
      where t.id = support_messages.thread_id
        and t.user_id = auth.uid()
    )
    or is_admin()
  );

create policy "Users can send support messages"
  on public.support_messages for insert
  with check (
    auth.uid() = sender_user_id
    and (
      exists (
        select 1
        from public.support_threads t
        where t.id = support_messages.thread_id
          and t.user_id = auth.uid()
      )
      or is_admin()
    )
  );

create policy "Admins can manage support messages"
  on public.support_messages for all
  using (is_admin())
  with check (is_admin());

grant select, insert, update on table public.support_threads to authenticated;
grant select, insert on table public.support_messages to authenticated;

-- Realtime (best-effort).
alter table if exists public.support_messages replica identity full;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'support_messages'
  ) and exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'support_messages'
  ) then
    alter publication supabase_realtime add table public.support_messages;
  end if;
end;
$$;

