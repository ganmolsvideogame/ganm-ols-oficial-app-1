alter table public.profiles add column if not exists store_bio text;
alter table public.profiles add column if not exists store_avatar_path text;
alter table public.profiles add column if not exists store_banner_path text;

insert into storage.buckets (id, name, public)
values ('store-images', 'store-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read store images" on storage.objects;
drop policy if exists "Users can upload store images" on storage.objects;
drop policy if exists "Users can update store images" on storage.objects;
drop policy if exists "Users can delete store images" on storage.objects;

create policy "Public read store images"
  on storage.objects for select
  using (bucket_id = 'store-images');

create policy "Users can upload store images"
  on storage.objects for insert
  with check (
    bucket_id = 'store-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update store images"
  on storage.objects for update
  using (
    bucket_id = 'store-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete store images"
  on storage.objects for delete
  using (
    bucket_id = 'store-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
