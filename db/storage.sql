insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('home-banners', 'home-banners', true)
on conflict (id) do update set public = true;

alter table storage.objects enable row level security;

drop policy if exists "Public read listing images" on storage.objects;
drop policy if exists "Users can upload listing images" on storage.objects;
drop policy if exists "Users can update listing images" on storage.objects;
drop policy if exists "Users can delete listing images" on storage.objects;
drop policy if exists "Public read home banners" on storage.objects;
drop policy if exists "Admins can upload home banners" on storage.objects;
drop policy if exists "Admins can update home banners" on storage.objects;
drop policy if exists "Admins can delete home banners" on storage.objects;

create policy "Public read listing images"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "Users can upload listing images"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update listing images"
  on storage.objects for update
  using (
    bucket_id = 'listing-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete listing images"
  on storage.objects for delete
  using (
    bucket_id = 'listing-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Public read home banners"
  on storage.objects for select
  using (bucket_id = 'home-banners');

create policy "Admins can upload home banners"
  on storage.objects for insert
  with check (
    bucket_id = 'home-banners'
    and is_admin()
  );

create policy "Admins can update home banners"
  on storage.objects for update
  using (
    bucket_id = 'home-banners'
    and is_admin()
  );

create policy "Admins can delete home banners"
  on storage.objects for delete
  using (
    bucket_id = 'home-banners'
    and is_admin()
  );
