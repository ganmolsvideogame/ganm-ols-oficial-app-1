-- Notify admins in real time when users send a support message.

create or replace function public.notify_admins_on_support_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_user_id uuid;
  sender_label text;
  message_snippet text;
begin
  select user_id
  into thread_user_id
  from public.support_threads
  where id = new.thread_id;

  if thread_user_id is null then
    return new;
  end if;

  -- Only notify when the thread owner (user) is the sender.
  if new.sender_user_id is distinct from thread_user_id then
    return new;
  end if;

  select coalesce(nullif(trim(display_name), ''), nullif(trim(email), ''), new.sender_user_id::text)
  into sender_label
  from public.profiles
  where id = new.sender_user_id;

  if sender_label is null then
    sender_label := new.sender_user_id::text;
  end if;

  message_snippet := regexp_replace(coalesce(new.body, ''), E'[\\n\\r\\t]+', ' ', 'g');
  message_snippet := regexp_replace(message_snippet, E'\\s+', ' ', 'g');
  message_snippet := btrim(message_snippet);
  if length(message_snippet) > 140 then
    message_snippet := left(message_snippet, 140) || '...';
  end if;

  insert into public.notifications (user_id, title, body, link, type, is_read)
  select distinct admin_uid,
         'Nova mensagem de suporte',
         sender_label || ': ' || message_snippet,
         '/painel-ganm-ols/suporte/' || new.thread_id,
         'support',
         false
  from (
    select distinct coalesce(a.user_id, p.id) as admin_uid
    from public.admins a
    left join public.profiles p on lower(p.email) = lower(a.email)
    where coalesce(a.user_id, p.id) is not null
  ) admins
  where admins.admin_uid is distinct from new.sender_user_id;

  return new;
end;
$$;

drop trigger if exists support_messages_notify_admins on public.support_messages;
create trigger support_messages_notify_admins
after insert on public.support_messages
for each row execute function public.notify_admins_on_support_message();

