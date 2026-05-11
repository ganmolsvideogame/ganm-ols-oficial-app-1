-- Social + post-purchase access (GANM OLS)

-- Buyers should still be able to view purchased listings (and images),
-- even if the listing is paused/stocked out after the sale.
do $$
begin
  if to_regclass('public.listings') is not null then
    drop policy if exists "Buyers can view purchased listings" on public.listings;
    create policy "Buyers can view purchased listings"
      on public.listings for select
      using (
        exists (
          select 1
          from public.orders o
          where o.listing_id = listings.id
            and o.buyer_user_id = auth.uid()
        )
      );
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.listing_images') is not null then
    drop policy if exists "Buyers can view purchased listing images" on public.listing_images;
    create policy "Buyers can view purchased listing images"
      on public.listing_images for select
      using (
        exists (
          select 1
          from public.orders o
          where o.listing_id = listing_images.listing_id
            and o.buyer_user_id = auth.uid()
        )
      );
  end if;
end;
$$;

-- Seller followers
create table if not exists public.seller_follows (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.profiles (id) on delete cascade,
  follower_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists seller_follows_unique
  on public.seller_follows (seller_user_id, follower_user_id);

create index if not exists seller_follows_seller_idx
  on public.seller_follows (seller_user_id);

create index if not exists seller_follows_follower_idx
  on public.seller_follows (follower_user_id);

alter table public.seller_follows enable row level security;

drop policy if exists "Followers can view own follows" on public.seller_follows;
drop policy if exists "Sellers can view own followers" on public.seller_follows;
drop policy if exists "Users can follow sellers" on public.seller_follows;
drop policy if exists "Users can unfollow sellers" on public.seller_follows;
drop policy if exists "Admins can manage seller follows" on public.seller_follows;

create policy "Followers can view own follows"
  on public.seller_follows for select
  using (auth.uid() = follower_user_id);

create policy "Sellers can view own followers"
  on public.seller_follows for select
  using (auth.uid() = seller_user_id);

create policy "Users can follow sellers"
  on public.seller_follows for insert
  with check (
    auth.uid() = follower_user_id
    and follower_user_id <> seller_user_id
  );

create policy "Users can unfollow sellers"
  on public.seller_follows for delete
  using (auth.uid() = follower_user_id);

create policy "Admins can manage seller follows"
  on public.seller_follows for all
  using (is_admin())
  with check (is_admin());

grant select, insert, delete on table public.seller_follows to authenticated;

-- Listing favorites
create table if not exists public.listing_favorites (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists listing_favorites_unique
  on public.listing_favorites (listing_id, user_id);

create index if not exists listing_favorites_user_idx
  on public.listing_favorites (user_id);

create index if not exists listing_favorites_listing_idx
  on public.listing_favorites (listing_id);

alter table public.listing_favorites enable row level security;

drop policy if exists "Users can view own favorites" on public.listing_favorites;
drop policy if exists "Users can add favorites" on public.listing_favorites;
drop policy if exists "Users can remove favorites" on public.listing_favorites;
drop policy if exists "Admins can manage favorites" on public.listing_favorites;

create policy "Users can view own favorites"
  on public.listing_favorites for select
  using (auth.uid() = user_id);

create policy "Users can add favorites"
  on public.listing_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove favorites"
  on public.listing_favorites for delete
  using (auth.uid() = user_id);

create policy "Admins can manage favorites"
  on public.listing_favorites for all
  using (is_admin())
  with check (is_admin());

grant select, insert, delete on table public.listing_favorites to authenticated;

