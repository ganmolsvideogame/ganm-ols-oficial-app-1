create table if not exists public.deploy_checks (
  id bigserial primary key,
  title text not null unique,
  created_at timestamptz not null default now()
);

insert into public.deploy_checks (title)
values ('teste deploy')
on conflict (title) do nothing;
