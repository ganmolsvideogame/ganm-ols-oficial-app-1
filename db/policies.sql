create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where (user_id is not null and user_id = auth.uid())
       or (email is not null and lower(email) = lower(auth.jwt() ->> 'email'))
  );
$$;

grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view profiles"
  on public.profiles for select
  using (is_admin());

create policy "Admins can update profiles"
  on public.profiles for update
  using (is_admin());

alter table public.listings enable row level security;

DROP POLICY IF EXISTS "public_can_read_active_listings" ON public.listings;
DROP POLICY IF EXISTS "users_can_insert_own_listings" ON public.listings;
DROP POLICY IF EXISTS "users_can_read_own_listings" ON public.listings;
DROP POLICY IF EXISTS "users_can_update_own_listings" ON public.listings;
DROP POLICY IF EXISTS "Listings are viewable by everyone" ON public.listings;
DROP POLICY IF EXISTS "Sellers can insert listings" ON public.listings;
DROP POLICY IF EXISTS "Sellers can update listings" ON public.listings;
DROP POLICY IF EXISTS "Sellers can delete listings" ON public.listings;
DROP POLICY IF EXISTS "Admins can view listings" ON public.listings;
DROP POLICY IF EXISTS "Admins can update listings" ON public.listings;
DROP POLICY IF EXISTS "Admins can delete listings" ON public.listings;
DROP POLICY IF EXISTS "Admins can insert listings" ON public.listings;

create policy "Listings are viewable by everyone"
  on public.listings for select
  using (
    (
      status = 'active'
      and (
        moderation_status is null
        or moderation_status in ('approved', 'pending')
      )
    )
    or auth.uid() = seller_user_id
    or exists (
      select 1
      from public.cart_items ci
      join public.carts c on c.id = ci.cart_id
      where ci.listing_id = listings.id
        and c.user_id = auth.uid()
    )
  );

create policy "Sellers can insert listings"
  on public.listings for insert
  with check (auth.uid() = seller_user_id);

create policy "Sellers can update listings"
  on public.listings for update
  using (auth.uid() = seller_user_id);

create policy "Sellers can delete listings"
  on public.listings for delete
  using (auth.uid() = seller_user_id);

create policy "Admins can view listings"
  on public.listings for select
  using (is_admin());

create policy "Admins can update listings"
  on public.listings for update
  using (is_admin());

create policy "Admins can delete listings"
  on public.listings for delete
  using (is_admin());

create policy "Admins can insert listings"
  on public.listings for insert
  with check (is_admin());

alter table public.listing_images enable row level security;

DROP POLICY IF EXISTS "public_read_listing_images" ON public.listing_images;
DROP POLICY IF EXISTS "seller_manage_own_listing_images" ON public.listing_images;
DROP POLICY IF EXISTS "Listing images are viewable by everyone" ON public.listing_images;
DROP POLICY IF EXISTS "Listing images can be inserted by seller" ON public.listing_images;
DROP POLICY IF EXISTS "Listing images can be updated by seller" ON public.listing_images;
DROP POLICY IF EXISTS "Listing images can be deleted by seller" ON public.listing_images;
DROP POLICY IF EXISTS "Admins can view listing images" ON public.listing_images;
DROP POLICY IF EXISTS "Admins can insert listing images" ON public.listing_images;
DROP POLICY IF EXISTS "Admins can update listing images" ON public.listing_images;
DROP POLICY IF EXISTS "Admins can delete listing images" ON public.listing_images;

create policy "Listing images are viewable by everyone"
  on public.listing_images for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and (
          (
            l.status = 'active'
            and (
              l.moderation_status is null
              or l.moderation_status in ('approved', 'pending')
            )
          )
          or l.seller_user_id = auth.uid()
          or exists (
            select 1
            from public.cart_items ci
            join public.carts c on c.id = ci.cart_id
            where ci.listing_id = l.id
              and c.user_id = auth.uid()
          )
        )
    )
  );

create policy "Listing images can be inserted by seller"
  on public.listing_images for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.seller_user_id = auth.uid()
    )
  );

create policy "Listing images can be updated by seller"
  on public.listing_images for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.seller_user_id = auth.uid()
    )
  );

create policy "Listing images can be deleted by seller"
  on public.listing_images for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_images.listing_id
        and l.seller_user_id = auth.uid()
    )
  );

create policy "Admins can view listing images"
  on public.listing_images for select
  using (is_admin());

create policy "Admins can insert listing images"
  on public.listing_images for insert
  with check (is_admin());

create policy "Admins can update listing images"
  on public.listing_images for update
  using (is_admin());

create policy "Admins can delete listing images"
  on public.listing_images for delete
  using (is_admin());

alter table public.orders enable row level security;

DROP POLICY IF EXISTS "buyer_can_insert_own_orders" ON public.orders;
DROP POLICY IF EXISTS "buyer_can_read_own_orders" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_buyer_only" ON public.orders;
DROP POLICY IF EXISTS "orders_read_buyer_or_seller" ON public.orders;
DROP POLICY IF EXISTS "orders_update_none" ON public.orders;
DROP POLICY IF EXISTS "Orders are viewable by involved users" ON public.orders;
DROP POLICY IF EXISTS "Buyers can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view orders" ON public.orders;

create policy "Orders are viewable by involved users"
  on public.orders for select
  using (auth.uid() = buyer_user_id or auth.uid() = seller_user_id);

create policy "Buyers can insert orders"
  on public.orders for insert
  with check (auth.uid() = buyer_user_id);

create policy "Admins can view orders"
  on public.orders for select
  using (is_admin());

alter table public.carts enable row level security;

DROP POLICY IF EXISTS "Users can view own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can update own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON public.carts;
DROP POLICY IF EXISTS "Admins can view carts" ON public.carts;

create policy "Users can view own cart"
  on public.carts for select
  using (auth.uid() = user_id);

create policy "Users can insert own cart"
  on public.carts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cart"
  on public.carts for update
  using (auth.uid() = user_id);

create policy "Users can delete own cart"
  on public.carts for delete
  using (auth.uid() = user_id);

create policy "Admins can view carts"
  on public.carts for select
  using (is_admin());

alter table public.cart_items enable row level security;

DROP POLICY IF EXISTS "Users can view own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Admins can view cart items" ON public.cart_items;

create policy "Users can view own cart items"
  on public.cart_items for select
  using (
    exists (
      select 1
      from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can insert own cart items"
  on public.cart_items for insert
  with check (
    exists (
      select 1
      from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can update own cart items"
  on public.cart_items for update
  using (
    exists (
      select 1
      from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can delete own cart items"
  on public.cart_items for delete
  using (
    exists (
      select 1
      from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

create policy "Admins can view cart items"
  on public.cart_items for select
  using (is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

create policy "Admins can update orders"
  on public.orders for update
  using (is_admin());

alter table public.user_blocks enable row level security;

DROP POLICY IF EXISTS "Users can view own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Admins can view blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Admins can insert blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Admins can update blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Admins can delete blocks" ON public.user_blocks;

create policy "Users can view own blocks"
  on public.user_blocks for select
  using (auth.uid() = user_id);

create policy "Admins can view blocks"
  on public.user_blocks for select
  using (is_admin());

create policy "Admins can insert blocks"
  on public.user_blocks for insert
  with check (is_admin());

create policy "Admins can update blocks"
  on public.user_blocks for update
  using (is_admin());

create policy "Admins can delete blocks"
  on public.user_blocks for delete
  using (is_admin());

alter table public.user_notes enable row level security;

DROP POLICY IF EXISTS "Admins can view user notes" ON public.user_notes;
DROP POLICY IF EXISTS "Admins can insert user notes" ON public.user_notes;
DROP POLICY IF EXISTS "Admins can delete user notes" ON public.user_notes;

create policy "Admins can view user notes"
  on public.user_notes for select
  using (is_admin());

create policy "Admins can insert user notes"
  on public.user_notes for insert
  with check (is_admin());

create policy "Admins can delete user notes"
  on public.user_notes for delete
  using (is_admin());

alter table public.kyc_documents enable row level security;

DROP POLICY IF EXISTS "Users can view own kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Users can insert own kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins can view kyc" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins can update kyc" ON public.kyc_documents;

create policy "Users can view own kyc"
  on public.kyc_documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own kyc"
  on public.kyc_documents for insert
  with check (auth.uid() = user_id);

create policy "Admins can view kyc"
  on public.kyc_documents for select
  using (is_admin());

create policy "Admins can update kyc"
  on public.kyc_documents for update
  using (is_admin());

alter table public.categories enable row level security;

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

create policy "Public can view categories"
  on public.categories for select
  using (true);

create policy "Admins can manage categories"
  on public.categories for all
  using (is_admin())
  with check (is_admin());

alter table public.category_attributes enable row level security;

DROP POLICY IF EXISTS "Public can view category attributes" ON public.category_attributes;
DROP POLICY IF EXISTS "Admins can manage category attributes" ON public.category_attributes;

create policy "Public can view category attributes"
  on public.category_attributes for select
  using (true);

create policy "Admins can manage category attributes"
  on public.category_attributes for all
  using (is_admin())
  with check (is_admin());

alter table public.listing_moderation_logs enable row level security;

DROP POLICY IF EXISTS "Admins can view listing moderation logs" ON public.listing_moderation_logs;
DROP POLICY IF EXISTS "Admins can insert listing moderation logs" ON public.listing_moderation_logs;

create policy "Admins can view listing moderation logs"
  on public.listing_moderation_logs for select
  using (is_admin());

create policy "Admins can insert listing moderation logs"
  on public.listing_moderation_logs for insert
  with check (is_admin());

alter table public.notifications enable row level security;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view notifications" ON public.notifications;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Admins can insert notifications"
  on public.notifications for insert
  with check (is_admin());

create policy "Admins can view notifications"
  on public.notifications for select
  using (is_admin());

alter table public.listing_reviews enable row level security;

DROP POLICY IF EXISTS "Public can view listing reviews" ON public.listing_reviews;
DROP POLICY IF EXISTS "Buyers can insert reviews" ON public.listing_reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.listing_reviews;
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.listing_reviews;

create policy "Public can view listing reviews"
  on public.listing_reviews for select
  using (true);

create policy "Buyers can insert reviews"
  on public.listing_reviews for insert
  with check (
    auth.uid() = reviewer_user_id
    and exists (
      select 1
      from public.orders o
      where o.listing_id = listing_reviews.listing_id
        and o.buyer_user_id = auth.uid()
        and o.status in ('approved', 'paid', 'shipped', 'delivered')
    )
  );

create policy "Users can update own reviews"
  on public.listing_reviews for update
  using (auth.uid() = reviewer_user_id);

create policy "Admins can manage reviews"
  on public.listing_reviews for all
  using (is_admin())
  with check (is_admin());

alter table public.listing_questions enable row level security;

DROP POLICY IF EXISTS "Public can view listing questions" ON public.listing_questions;
DROP POLICY IF EXISTS "Users can insert questions" ON public.listing_questions;
DROP POLICY IF EXISTS "Users can update own questions" ON public.listing_questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.listing_questions;

create policy "Public can view listing questions"
  on public.listing_questions for select
  using (true);

create policy "Users can insert questions"
  on public.listing_questions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own questions"
  on public.listing_questions for update
  using (auth.uid() = user_id);

create policy "Admins can manage questions"
  on public.listing_questions for all
  using (is_admin())
  with check (is_admin());

alter table public.listing_answers enable row level security;

DROP POLICY IF EXISTS "Public can view listing answers" ON public.listing_answers;
DROP POLICY IF EXISTS "Sellers can insert answers" ON public.listing_answers;
DROP POLICY IF EXISTS "Users can update own answers" ON public.listing_answers;
DROP POLICY IF EXISTS "Admins can manage answers" ON public.listing_answers;

create policy "Public can view listing answers"
  on public.listing_answers for select
  using (true);

create policy "Sellers can insert answers"
  on public.listing_answers for insert
  with check (
    is_admin()
    or exists (
      select 1
      from public.listing_questions q
      join public.listings l on l.id = q.listing_id
      where q.id = listing_answers.question_id
        and l.seller_user_id = auth.uid()
    )
  );

create policy "Users can update own answers"
  on public.listing_answers for update
  using (is_admin() or responder_id = auth.uid());

create policy "Admins can manage answers"
  on public.listing_answers for all
  using (is_admin())
  with check (is_admin());

alter table public.reports enable row level security;

DROP POLICY IF EXISTS "Users can insert reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;

create policy "Users can insert reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Users can view own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy "Admins can view reports"
  on public.reports for select
  using (is_admin());

create policy "Admins can update reports"
  on public.reports for update
  using (is_admin());

alter table public.order_events enable row level security;

DROP POLICY IF EXISTS "Participants can view order events" ON public.order_events;
DROP POLICY IF EXISTS "Admins can insert order events" ON public.order_events;
DROP POLICY IF EXISTS "Admins can view order events" ON public.order_events;

create policy "Participants can view order events"
  on public.order_events for select
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_events.order_id
        and (o.buyer_user_id = auth.uid() or o.seller_user_id = auth.uid())
    )
  );

create policy "Admins can insert order events"
  on public.order_events for insert
  with check (is_admin());

create policy "Admins can view order events"
  on public.order_events for select
  using (is_admin());

alter table public.payment_events enable row level security;

DROP POLICY IF EXISTS "Admins can view payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Admins can insert payment events" ON public.payment_events;

create policy "Admins can view payment events"
  on public.payment_events for select
  using (is_admin());

create policy "Admins can insert payment events"
  on public.payment_events for insert
  with check (is_admin());

alter table public.webhook_events enable row level security;

DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
DROP POLICY IF EXISTS "Admins can insert webhook events" ON public.webhook_events;

create policy "Admins can view webhook events"
  on public.webhook_events for select
  using (is_admin());

create policy "Admins can insert webhook events"
  on public.webhook_events for insert
  with check (is_admin());

alter table public.shipping_rates enable row level security;

DROP POLICY IF EXISTS "Public can view shipping rates" ON public.shipping_rates;
DROP POLICY IF EXISTS "Admins can manage shipping rates" ON public.shipping_rates;

create policy "Public can view shipping rates"
  on public.shipping_rates for select
  using (true);

create policy "Admins can manage shipping rates"
  on public.shipping_rates for all
  using (is_admin())
  with check (is_admin());

alter table public.package_presets enable row level security;

DROP POLICY IF EXISTS "Public can view package presets" ON public.package_presets;
DROP POLICY IF EXISTS "Admins can manage package presets" ON public.package_presets;

create policy "Public can view package presets"
  on public.package_presets for select
  using (true);

create policy "Admins can manage package presets"
  on public.package_presets for all
  using (is_admin())
  with check (is_admin());

alter table public.auction_settings enable row level security;

DROP POLICY IF EXISTS "Public can view auction settings" ON public.auction_settings;
DROP POLICY IF EXISTS "Admins can manage auction settings" ON public.auction_settings;

create policy "Public can view auction settings"
  on public.auction_settings for select
  using (true);

create policy "Admins can manage auction settings"
  on public.auction_settings for all
  using (is_admin())
  with check (is_admin());

alter table public.conversations enable row level security;

DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can view conversations" ON public.conversations;

create policy "Participants can view conversations"
  on public.conversations for select
  using (auth.uid() = buyer_user_id or auth.uid() = seller_user_id);

create policy "Participants can insert conversations"
  on public.conversations for insert
  with check (auth.uid() = buyer_user_id or auth.uid() = seller_user_id);

create policy "Participants can update conversations"
  on public.conversations for update
  using (auth.uid() = buyer_user_id or auth.uid() = seller_user_id);

create policy "Admins can view conversations"
  on public.conversations for select
  using (is_admin());

alter table public.messages enable row level security;

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can view messages" ON public.messages;

create policy "Participants can view messages"
  on public.messages for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_user_id = auth.uid() or c.seller_user_id = auth.uid())
    )
  );

create policy "Participants can insert messages"
  on public.messages for insert
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_user_id = auth.uid() or c.seller_user_id = auth.uid())
    )
  );

create policy "Admins can view messages"
  on public.messages for select
  using (is_admin());

alter table public.message_reports enable row level security;

DROP POLICY IF EXISTS "Users can insert message reports" ON public.message_reports;
DROP POLICY IF EXISTS "Users can view own message reports" ON public.message_reports;
DROP POLICY IF EXISTS "Admins can view message reports" ON public.message_reports;
DROP POLICY IF EXISTS "Admins can update message reports" ON public.message_reports;

create policy "Users can insert message reports"
  on public.message_reports for insert
  with check (auth.uid() = reporter_id);

create policy "Users can view own message reports"
  on public.message_reports for select
  using (auth.uid() = reporter_id);

create policy "Admins can view message reports"
  on public.message_reports for select
  using (is_admin());

create policy "Admins can update message reports"
  on public.message_reports for update
  using (is_admin());

alter table public.coupons enable row level security;

DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;

create policy "Public can view active coupons"
  on public.coupons for select
  using (active = true);

create policy "Admins can manage coupons"
  on public.coupons for all
  using (is_admin())
  with check (is_admin());

alter table public.coupon_redemptions enable row level security;

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Users can insert own redemptions" ON public.coupon_redemptions;
DROP POLICY IF EXISTS "Admins can view redemptions" ON public.coupon_redemptions;

create policy "Users can view own redemptions"
  on public.coupon_redemptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own redemptions"
  on public.coupon_redemptions for insert
  with check (auth.uid() = user_id);

create policy "Admins can view redemptions"
  on public.coupon_redemptions for select
  using (is_admin());

alter table public.subscription_plans enable row level security;

DROP POLICY IF EXISTS "Public can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;

create policy "Public can view active subscription plans"
  on public.subscription_plans for select
  using (is_active = true);

create policy "Admins can manage subscription plans"
  on public.subscription_plans for all
  using (is_admin())
  with check (is_admin());

alter table public.user_subscriptions enable row level security;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.user_subscriptions;

create policy "Users can view own subscriptions"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

create policy "Admins can manage subscriptions"
  on public.user_subscriptions for all
  using (is_admin())
  with check (is_admin());

alter table public.home_sections enable row level security;

DROP POLICY IF EXISTS "Public can view home sections" ON public.home_sections;
DROP POLICY IF EXISTS "Admins can manage home sections" ON public.home_sections;

create policy "Public can view home sections"
  on public.home_sections for select
  using (true);

create policy "Admins can manage home sections"
  on public.home_sections for all
  using (is_admin())
  with check (is_admin());

alter table public.home_items enable row level security;

DROP POLICY IF EXISTS "Public can view home items" ON public.home_items;
DROP POLICY IF EXISTS "Admins can manage home items" ON public.home_items;

create policy "Public can view home items"
  on public.home_items for select
  using (true);

create policy "Admins can manage home items"
  on public.home_items for all
  using (is_admin())
  with check (is_admin());

alter table public.analytics_events enable row level security;

DROP POLICY IF EXISTS "Users can insert analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can view analytics events" ON public.analytics_events;

create policy "Users can insert analytics events"
  on public.analytics_events for insert
  with check (auth.uid() is not null);

create policy "Admins can view analytics events"
  on public.analytics_events for select
  using (is_admin());

alter table public.system_events enable row level security;

DROP POLICY IF EXISTS "Admins can view system events" ON public.system_events;
DROP POLICY IF EXISTS "Admins can insert system events" ON public.system_events;

create policy "Admins can view system events"
  on public.system_events for select
  using (is_admin());

create policy "Admins can insert system events"
  on public.system_events for insert
  with check (is_admin());

alter table public.site_settings enable row level security;

DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;

create policy "Admins can manage site settings"
  on public.site_settings for all
  using (is_admin())
  with check (is_admin());

alter table public.payment_methods enable row level security;

DROP POLICY IF EXISTS "Public can view payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;

create policy "Public can view payment methods"
  on public.payment_methods for select
  using (true);

create policy "Admins can manage payment methods"
  on public.payment_methods for all
  using (is_admin())
  with check (is_admin());

alter table public.admin_audit_logs enable row level security;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;

create policy "Admins can view audit logs"
  on public.admin_audit_logs for select
  using (is_admin());

create policy "Admins can insert audit logs"
  on public.admin_audit_logs for insert
  with check (is_admin());

alter table public.auction_proxy_bids enable row level security;

DROP POLICY IF EXISTS "Users can view own proxy bids" ON public.auction_proxy_bids;
DROP POLICY IF EXISTS "Users can insert own proxy bids" ON public.auction_proxy_bids;
DROP POLICY IF EXISTS "Users can update own proxy bids" ON public.auction_proxy_bids;
DROP POLICY IF EXISTS "Admins can manage proxy bids" ON public.auction_proxy_bids;

create policy "Users can view own proxy bids"
  on public.auction_proxy_bids for select
  using (auth.uid() = bidder_user_id);

create policy "Users can insert own proxy bids"
  on public.auction_proxy_bids for insert
  with check (auth.uid() = bidder_user_id);

create policy "Users can update own proxy bids"
  on public.auction_proxy_bids for update
  using (auth.uid() = bidder_user_id);

create policy "Admins can manage proxy bids"
  on public.auction_proxy_bids for all
  using (is_admin())
  with check (is_admin());

alter table public.unpaid_cancellations enable row level security;

DROP POLICY IF EXISTS "Users can view own unpaid cancellations" ON public.unpaid_cancellations;
DROP POLICY IF EXISTS "Sellers can view own unpaid cancellations" ON public.unpaid_cancellations;
DROP POLICY IF EXISTS "Admins can manage unpaid cancellations" ON public.unpaid_cancellations;

create policy "Users can view own unpaid cancellations"
  on public.unpaid_cancellations for select
  using (auth.uid() = buyer_user_id);

create policy "Sellers can view own unpaid cancellations"
  on public.unpaid_cancellations for select
  using (auth.uid() = seller_user_id);

create policy "Admins can manage unpaid cancellations"
  on public.unpaid_cancellations for all
  using (is_admin())
  with check (is_admin());

grant execute on function public.place_proxy_bid(uuid, integer) to authenticated;
grant execute on function public.close_auction(uuid, uuid) to authenticated;
grant execute on function public.close_expired_auctions() to authenticated;

do $$
begin
  if to_regclass('public.seller_payment_accounts') is not null then
    alter table public.seller_payment_accounts enable row level security;

    drop policy if exists "Admins can view seller payment accounts" on public.seller_payment_accounts;
    drop policy if exists "Admins can update seller payment accounts" on public.seller_payment_accounts;
    drop policy if exists "Admins can insert seller payment accounts" on public.seller_payment_accounts;

    create policy "Admins can view seller payment accounts"
      on public.seller_payment_accounts for select
      using (is_admin());

    create policy "Admins can update seller payment accounts"
      on public.seller_payment_accounts for update
      using (is_admin());

    create policy "Admins can insert seller payment accounts"
      on public.seller_payment_accounts for insert
      with check (is_admin());
  end if;
end;
$$;
