create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  email text,
  display_name text,
  phone text,
  address_line1 text,
  address_line2 text,
  district text,
  city text,
  state text,
  zipcode text,
  payout_method text,
  payout_pix_key text,
  payout_bank_name text,
  payout_bank_agency text,
  payout_bank_account text,
  payout_bank_account_type text,
  payout_doc text,
  payout_name text,
  role text not null default 'buyer',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists address_line1 text;
alter table public.profiles add column if not exists address_line2 text;
alter table public.profiles add column if not exists district text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists zipcode text;
alter table public.profiles add column if not exists payout_method text;
alter table public.profiles add column if not exists payout_pix_key text;
alter table public.profiles add column if not exists payout_bank_name text;
alter table public.profiles add column if not exists payout_bank_agency text;
alter table public.profiles add column if not exists payout_bank_account text;
alter table public.profiles add column if not exists payout_bank_account_type text;
alter table public.profiles add column if not exists payout_doc text;
alter table public.profiles add column if not exists payout_name text;
alter table public.profiles add column if not exists role text;
alter table public.profiles alter column role set default 'buyer';
alter table public.profiles add column if not exists created_at timestamp with time zone default now();
alter table public.profiles add column if not exists updated_at timestamp with time zone default now();

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  price_cents integer not null,
  condition text,
  family text,
  platform text,
  model text,
  description text,
  listing_type text not null default 'now',
  status text not null default 'paused',
  is_featured boolean not null default false,
  is_week_offer boolean not null default false,
  auction_increment_percent integer default 25,
  auction_end_at timestamp with time zone,
  auction_duration_days integer default 7,
  auction_closed_at timestamp with time zone,
  auction_winner_user_id uuid,
  auction_final_bid_cents integer,
  auction_order_id uuid,
  thumbnail_url text,
  city text,
  state text,
  shipping_available boolean not null default true,
  quantity_available integer not null default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.listings add column if not exists seller_user_id uuid;
alter table public.listings add column if not exists title text;
alter table public.listings add column if not exists price_cents integer;
alter table public.listings add column if not exists condition text;
alter table public.listings add column if not exists family text;
alter table public.listings add column if not exists platform text;
alter table public.listings add column if not exists model text;
alter table public.listings add column if not exists description text;
alter table public.listings add column if not exists listing_type text;
alter table public.listings alter column listing_type set default 'now';
alter table public.listings add column if not exists status text;
alter table public.listings alter column status set default 'paused';
alter table public.listings add column if not exists is_featured boolean;
alter table public.listings alter column is_featured set default false;
alter table public.listings add column if not exists is_week_offer boolean;
alter table public.listings alter column is_week_offer set default false;
alter table public.listings add column if not exists auction_increment_percent integer;
alter table public.listings alter column auction_increment_percent set default 25;
alter table public.listings add column if not exists auction_end_at timestamp with time zone;
alter table public.listings add column if not exists auction_duration_days integer;
alter table public.listings alter column auction_duration_days set default 7;
alter table public.listings add column if not exists auction_closed_at timestamp with time zone;
alter table public.listings add column if not exists auction_winner_user_id uuid;
alter table public.listings add column if not exists auction_final_bid_cents integer;
alter table public.listings add column if not exists auction_order_id uuid;
alter table public.listings add column if not exists thumbnail_url text;
alter table public.listings add column if not exists city text;
alter table public.listings add column if not exists state text;
alter table public.listings add column if not exists shipping_available boolean;
alter table public.listings alter column shipping_available set default true;
alter table public.listings add column if not exists quantity_available integer;
alter table public.listings alter column quantity_available set default 1;
alter table public.listings add column if not exists free_shipping boolean;
alter table public.listings alter column free_shipping set default false;
alter table public.listings add column if not exists package_weight_grams integer;
alter table public.listings add column if not exists package_length_cm integer;
alter table public.listings add column if not exists package_width_cm integer;
alter table public.listings add column if not exists package_height_cm integer;
alter table public.listings add column if not exists created_at timestamp with time zone default now();
alter table public.listings add column if not exists updated_at timestamp with time zone default now();

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  path text not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now()
);

alter table public.listing_images add column if not exists listing_id uuid;
alter table public.listing_images add column if not exists path text;
alter table public.listing_images add column if not exists sort_order integer;
alter table public.listing_images alter column sort_order set default 0;
alter table public.listing_images add column if not exists created_at timestamp with time zone default now();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  buyer_user_id uuid not null references public.profiles (id) on delete restrict,
  seller_user_id uuid not null references public.profiles (id) on delete restrict,
  amount_cents integer not null,
  quantity integer not null default 1,
  fee_cents integer not null default 0,
  status text not null default 'pending',
  mp_preference_id text,
  mp_payment_id text,
  approved_at timestamp with time zone,
  available_at timestamp with time zone,
  payout_status text not null default 'hold',
  payout_requested_at timestamp with time zone,
  payout_paid_at timestamp with time zone,
  shipping_cost_cents integer not null default 0,
  shipping_service_id text,
  shipping_service_name text,
  shipping_estimated_days integer,
  shipping_paid_by text not null default 'buyer',
  shipping_post_deadline_at timestamp with time zone,
  superfrete_id text,
  superfrete_tag_id text,
  superfrete_status text,
  superfrete_tracking text,
  superfrete_print_url text,
  superfrete_raw_cart jsonb,
  superfrete_raw_info jsonb,
  superfrete_last_error text,
  shipping_paid_at timestamp with time zone,
  shipping_canceled_at timestamp with time zone,
  shipping_cancel_failed boolean not null default false,
  shipping_manual_action boolean not null default false,
  buyer_approval_deadline_at timestamp with time zone,
  payment_deadline_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table public.orders add column if not exists listing_id uuid;
alter table public.orders add column if not exists buyer_user_id uuid;
alter table public.orders add column if not exists seller_user_id uuid;
alter table public.orders add column if not exists amount_cents integer;
alter table public.orders add column if not exists quantity integer;
alter table public.orders alter column quantity set default 1;
update public.orders set quantity = 1 where quantity is null;
alter table public.orders add column if not exists fee_cents integer;
alter table public.orders alter column fee_cents set default 0;
alter table public.orders add column if not exists status text;
alter table public.orders alter column status set default 'pending';
alter table public.orders add column if not exists mp_preference_id text;
alter table public.orders add column if not exists mp_payment_id text;
alter table public.orders add column if not exists approved_at timestamp with time zone;
alter table public.orders add column if not exists available_at timestamp with time zone;
alter table public.orders add column if not exists payout_status text;
alter table public.orders alter column payout_status set default 'hold';
alter table public.orders add column if not exists payout_requested_at timestamp with time zone;
alter table public.orders add column if not exists payout_paid_at timestamp with time zone;
alter table public.orders add column if not exists shipping_cost_cents integer;
alter table public.orders alter column shipping_cost_cents set default 0;
alter table public.orders add column if not exists shipping_service_id text;
alter table public.orders add column if not exists shipping_service_name text;
alter table public.orders add column if not exists shipping_estimated_days integer;
alter table public.orders add column if not exists shipping_paid_by text;
alter table public.orders alter column shipping_paid_by set default 'buyer';
alter table public.orders add column if not exists shipping_post_deadline_at timestamp with time zone;
alter table public.orders add column if not exists superfrete_id text;
alter table public.orders add column if not exists superfrete_tag_id text;
alter table public.orders add column if not exists superfrete_status text;
alter table public.orders add column if not exists superfrete_tracking text;
alter table public.orders add column if not exists superfrete_print_url text;
alter table public.orders add column if not exists superfrete_raw_cart jsonb;
alter table public.orders add column if not exists superfrete_raw_info jsonb;
alter table public.orders add column if not exists superfrete_last_error text;
alter table public.orders add column if not exists shipping_paid_at timestamp with time zone;
alter table public.orders add column if not exists shipping_canceled_at timestamp with time zone;
alter table public.orders add column if not exists shipping_cancel_failed boolean default false;
alter table public.orders alter column shipping_cancel_failed set default false;
alter table public.orders add column if not exists shipping_manual_action boolean default false;
alter table public.orders alter column shipping_manual_action set default false;
alter table public.orders add column if not exists buyer_approval_deadline_at timestamp with time zone;
alter table public.orders add column if not exists payment_deadline_at timestamp with time zone;
alter table public.orders add column if not exists created_at timestamp with time zone default now();

create index if not exists listings_seller_user_id_idx on public.listings (seller_user_id);
create index if not exists listings_status_idx on public.listings (status);
create index if not exists listing_images_listing_id_idx on public.listing_images (listing_id);
create index if not exists orders_buyer_user_id_idx on public.orders (buyer_user_id);
create index if not exists orders_seller_user_id_idx on public.orders (seller_user_id);
create index if not exists orders_listing_id_idx on public.orders (listing_id);

create table if not exists public.unpaid_cancellations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  buyer_user_id uuid not null references public.profiles (id) on delete cascade,
  seller_user_id uuid references public.profiles (id) on delete set null,
  reason text not null default 'Pagamento nao realizado no prazo',
  created_at timestamp with time zone default now()
);

create index if not exists unpaid_cancellations_order_id_idx
  on public.unpaid_cancellations (order_id);
create index if not exists unpaid_cancellations_buyer_user_id_idx
  on public.unpaid_cancellations (buyer_user_id);

drop view if exists public.listings_with_boost;

create or replace view public.listings_with_boost as
select
  l.*,
  coalesce(b.boost_priority, 0) as boost_priority
from public.listings l
left join (
  select
    us.user_id,
    max(sp.boost_priority) as boost_priority
  from public.user_subscriptions us
  join public.subscription_plans sp
    on sp.id = us.plan_id
   and sp.is_active = true
  where us.status = 'active'
    and (us.starts_at is null or us.starts_at <= now())
    and (us.ends_at is null or us.ends_at >= now())
  group by us.user_id
) b on b.user_id = l.seller_user_id;

grant select on public.listings_with_boost to anon, authenticated;

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  bidder_user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null,
  created_at timestamp with time zone default now()
);

create index if not exists bids_listing_id_idx on public.bids (listing_id);
create index if not exists bids_bidder_user_id_idx on public.bids (bidder_user_id);

create table if not exists public.auction_proxy_bids (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  bidder_user_id uuid not null references public.profiles (id) on delete cascade,
  max_amount_cents integer not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (listing_id, bidder_user_id)
);

create index if not exists auction_proxy_bids_listing_id_idx
  on public.auction_proxy_bids (listing_id);
create index if not exists auction_proxy_bids_bidder_user_id_idx
  on public.auction_proxy_bids (bidder_user_id);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null,
  order_ids uuid[] not null default '{}',
  status text not null default 'pending',
  created_at timestamp with time zone default now(),
  paid_at timestamp with time zone
);

create index if not exists payout_requests_seller_user_id_idx on public.payout_requests (seller_user_id);
create index if not exists payout_requests_status_idx on public.payout_requests (status);

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  created_at timestamp with time zone default now()
);

alter table public.admins add column if not exists user_id uuid;
alter table public.admins add column if not exists email text;
alter table public.admins add column if not exists created_at timestamp with time zone default now();

create unique index if not exists admins_email_idx on public.admins (lower(email));
create index if not exists admins_user_id_idx on public.admins (user_id);

alter table public.admins add column if not exists role text;
alter table public.admins alter column role set default 'admin';
alter table public.admins add column if not exists created_by uuid;

alter table public.profiles add column if not exists account_level text;
alter table public.profiles alter column account_level set default 'user';
alter table public.profiles add column if not exists cpf_cnpj text;
alter table public.profiles add column if not exists kyc_status text;
alter table public.profiles alter column kyc_status set default 'pending';
alter table public.profiles add column if not exists kyc_level text;
alter table public.profiles add column if not exists kyc_verified_at timestamp with time zone;
alter table public.profiles add column if not exists is_suspended boolean;
alter table public.profiles alter column is_suspended set default false;
alter table public.profiles add column if not exists suspended_until timestamp with time zone;
alter table public.profiles add column if not exists suspension_reason text;
alter table public.profiles add column if not exists last_login_at timestamp with time zone;

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  starts_at timestamp with time zone default now(),
  ends_at timestamp with time zone,
  status text not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists user_blocks_user_id_idx on public.user_blocks (user_id);
create index if not exists user_blocks_status_idx on public.user_blocks (status);

create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  note text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists user_notes_user_id_idx on public.user_notes (user_id);

create table if not exists public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  doc_type text not null,
  doc_url text,
  selfie_url text,
  proof_url text,
  status text not null default 'pending',
  submitted_at timestamp with time zone default now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid references public.profiles (id) on delete set null,
  notes text
);

create index if not exists kyc_documents_user_id_idx on public.kyc_documents (user_id);
create index if not exists kyc_documents_status_idx on public.kyc_documents (status);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  type text,
  parent_id uuid references public.categories (id) on delete set null,
  created_at timestamp with time zone default now()
);

create unique index if not exists categories_slug_idx on public.categories (lower(slug));

create table if not exists public.category_attributes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete cascade,
  name text not null,
  field_type text not null default 'text',
  options text[] not null default '{}',
  created_at timestamp with time zone default now()
);

create index if not exists category_attributes_category_id_idx on public.category_attributes (category_id);

alter table public.listings add column if not exists category_id uuid;
alter table public.listings add column if not exists region text;
alter table public.listings add column if not exists seal_status text;
alter table public.listings add column if not exists originality text;
alter table public.listings add column if not exists included_items text;
alter table public.listings add column if not exists tags text[];
alter table public.listings add column if not exists moderation_status text;
alter table public.listings alter column moderation_status set default 'pending';
update public.listings
set moderation_status = 'pending'
where moderation_status is null;
alter table public.listings add column if not exists auction_extend_minutes integer;
alter table public.listings alter column auction_extend_minutes set default 2;
alter table public.listings add column if not exists auction_extend_window_minutes integer;
alter table public.listings alter column auction_extend_window_minutes set default 2;

create index if not exists listings_category_id_idx on public.listings (category_id);
create index if not exists listings_moderation_status_idx on public.listings (moderation_status);

create table if not exists public.listing_moderation_logs (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  status text not null,
  reason text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists listing_moderation_logs_listing_id_idx on public.listing_moderation_logs (listing_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  link text,
  type text not null default 'general',
  is_read boolean not null default false,
  created_at timestamp with time zone default now()
);

alter table public.notifications add column if not exists type text;
alter table public.notifications alter column type set default 'general';
update public.notifications set type = 'general' where type is null;

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_is_read_idx on public.notifications (is_read);
create index if not exists notifications_created_at_idx on public.notifications (created_at);
create index if not exists notifications_type_idx on public.notifications (type);

-- Realtime: garante que updates cheguem completos e que a tabela participe do supabase_realtime
alter table public.notifications replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

create table if not exists public.listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reviewer_user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  rating integer not null,
  comment text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint listing_reviews_rating_check check (rating between 1 and 5)
);

alter table public.listing_reviews add column if not exists listing_id uuid;
alter table public.listing_reviews add column if not exists reviewer_user_id uuid;
alter table public.listing_reviews add column if not exists order_id uuid;
alter table public.listing_reviews add column if not exists rating integer;
alter table public.listing_reviews add column if not exists comment text;
alter table public.listing_reviews add column if not exists created_at timestamp with time zone default now();
alter table public.listing_reviews add column if not exists updated_at timestamp with time zone default now();

create unique index if not exists listing_reviews_listing_user_idx
  on public.listing_reviews (listing_id, reviewer_user_id);
create index if not exists listing_reviews_listing_id_idx
  on public.listing_reviews (listing_id);
create index if not exists listing_reviews_reviewer_user_id_idx
  on public.listing_reviews (reviewer_user_id);

create table if not exists public.listing_questions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  question text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.listing_questions add column if not exists listing_id uuid;
alter table public.listing_questions add column if not exists user_id uuid;
alter table public.listing_questions add column if not exists question text;
alter table public.listing_questions add column if not exists created_at timestamp with time zone default now();
alter table public.listing_questions add column if not exists updated_at timestamp with time zone default now();

create index if not exists listing_questions_listing_id_idx
  on public.listing_questions (listing_id);
create index if not exists listing_questions_user_id_idx
  on public.listing_questions (user_id);

create table if not exists public.listing_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.listing_questions (id) on delete cascade,
  responder_id uuid references public.profiles (id) on delete set null,
  answer text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.listing_answers add column if not exists question_id uuid;
alter table public.listing_answers add column if not exists responder_id uuid;
alter table public.listing_answers add column if not exists answer text;
alter table public.listing_answers add column if not exists created_at timestamp with time zone default now();
alter table public.listing_answers add column if not exists updated_at timestamp with time zone default now();

create index if not exists listing_answers_question_id_idx
  on public.listing_answers (question_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid,
  reporter_id uuid references public.profiles (id) on delete set null,
  status text not null default 'open',
  reason text,
  details text,
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone,
  resolved_by uuid references public.profiles (id) on delete set null
);

create index if not exists reports_target_type_idx on public.reports (target_type);
create index if not exists reports_status_idx on public.reports (status);

alter table public.orders add column if not exists shipping_status text;
alter table public.orders alter column shipping_status set default 'pending';
alter table public.orders add column if not exists shipping_provider text;
alter table public.orders add column if not exists shipping_tracking text;
alter table public.orders add column if not exists shipping_label_url text;
alter table public.orders add column if not exists shipping_address jsonb;
alter table public.orders add column if not exists dispute_status text;
alter table public.orders add column if not exists dispute_reason text;
alter table public.orders add column if not exists cancel_reason text;
alter table public.orders add column if not exists cancel_requested_by text;
alter table public.orders add column if not exists cancel_requested_at timestamp with time zone;
alter table public.orders add column if not exists cancel_deadline_at timestamp with time zone;
alter table public.orders add column if not exists cancel_status text;
alter table public.orders add column if not exists cancel_response_by text;
alter table public.orders add column if not exists cancel_response_at timestamp with time zone;
alter table public.orders add column if not exists cancel_response_reason text;
alter table public.orders add column if not exists delivered_at timestamp with time zone;

create index if not exists orders_shipping_status_idx on public.orders (shipping_status);
create index if not exists orders_dispute_status_idx on public.orders (dispute_status);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists order_events_order_id_idx on public.order_events (order_id);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  provider text not null,
  event_type text,
  status text,
  payload jsonb,
  received_at timestamp with time zone default now(),
  processed_at timestamp with time zone,
  error text
);

create index if not exists payment_events_order_id_idx on public.payment_events (order_id);
create index if not exists payment_events_provider_idx on public.payment_events (provider);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text,
  payload jsonb,
  status text not null default 'received',
  received_at timestamp with time zone default now(),
  processed_at timestamp with time zone,
  error text
);

create index if not exists webhook_events_provider_idx on public.webhook_events (provider);

create table if not exists public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  carrier text not null,
  service text not null,
  base_price_cents integer not null default 0,
  per_kg_price_cents integer not null default 0,
  rules jsonb,
  enabled boolean not null default true,
  created_at timestamp with time zone default now()
);

create index if not exists shipping_rates_carrier_idx on public.shipping_rates (carrier);

create table if not exists public.package_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  weight_grams integer not null default 0,
  length_cm integer not null default 0,
  width_cm integer not null default 0,
  height_cm integer not null default 0,
  category_id uuid references public.categories (id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists package_presets_category_id_idx on public.package_presets (category_id);

create table if not exists public.auction_settings (
  id uuid primary key default gen_random_uuid(),
  min_increment_percent integer not null default 25,
  extend_minutes integer not null default 2,
  extend_window_minutes integer not null default 2,
  created_at timestamp with time zone default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  buyer_user_id uuid references public.profiles (id) on delete set null,
  seller_user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'open',
  created_at timestamp with time zone default now()
);

create index if not exists conversations_listing_id_idx on public.conversations (listing_id);
create index if not exists conversations_buyer_user_id_idx on public.conversations (buyer_user_id);
create index if not exists conversations_seller_user_id_idx on public.conversations (seller_user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null,
  contains_contact boolean not null default false,
  contains_offsite boolean not null default false,
  created_at timestamp with time zone default now()
);

create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text,
  status text not null default 'open',
  created_at timestamp with time zone default now()
);

create index if not exists message_reports_status_idx on public.message_reports (status);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  percent_off integer,
  amount_off_cents integer,
  max_redemptions integer,
  redemptions_count integer not null default 0,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

create unique index if not exists coupons_code_idx on public.coupons (lower(code));

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists coupon_redemptions_coupon_id_idx on public.coupon_redemptions (coupon_id);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  description text,
  price_cents integer not null default 0,
  billing_period text not null default 'monthly',
  featured_listing_limit integer not null default 0,
  boost_priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);

create unique index if not exists subscription_plans_slug_idx
  on public.subscription_plans (lower(slug));

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  status text not null default 'active',
  starts_at timestamp with time zone default now(),
  ends_at timestamp with time zone,
  canceled_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists user_subscriptions_user_id_idx on public.user_subscriptions (user_id);
create index if not exists user_subscriptions_plan_id_idx on public.user_subscriptions (plan_id);
create index if not exists user_subscriptions_status_idx on public.user_subscriptions (status);

create table if not exists public.home_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text,
  description text,
  section_type text not null default 'manual',
  position integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create unique index if not exists home_sections_slug_idx on public.home_sections (lower(slug));

create table if not exists public.home_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.home_sections (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  title text,
  image_url text,
  href text,
  cta_label text,
  secondary_label text,
  show_buttons boolean not null default true,
  position integer not null default 0,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table public.home_items add column if not exists cta_label text;
alter table public.home_items add column if not exists secondary_label text;
alter table public.home_items add column if not exists show_buttons boolean;
alter table public.home_items alter column show_buttons set default true;

create index if not exists home_items_section_id_idx on public.home_items (section_id);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references public.profiles (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  order_id uuid references public.orders (id) on delete set null,
  session_id text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists analytics_events_event_type_idx on public.analytics_events (event_type);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at);

create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text,
  entity_id uuid,
  actor_id uuid references public.profiles (id) on delete set null,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists system_events_event_type_idx on public.system_events (event_type);
create index if not exists system_events_entity_type_idx on public.system_events (entity_type);
create index if not exists system_events_entity_id_idx on public.system_events (entity_id);
create index if not exists system_events_created_at_idx on public.system_events (created_at);

create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamp with time zone default now()
);

create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  method text not null,
  enabled boolean not null default true,
  created_at timestamp with time zone default now()
);

create index if not exists payment_methods_provider_idx on public.payment_methods (provider);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists admin_audit_logs_actor_id_idx on public.admin_audit_logs (actor_id);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.carts add column if not exists user_id uuid;
alter table public.carts add column if not exists status text;
alter table public.carts alter column status set default 'open';
alter table public.carts add column if not exists created_at timestamp with time zone default now();
alter table public.carts add column if not exists updated_at timestamp with time zone default now();

create unique index if not exists carts_user_id_idx on public.carts (user_id);
create index if not exists carts_status_idx on public.carts (status);

create table if not exists public.cart_checkouts (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  total_cents integer not null default 0,
  shipping_total_cents integer not null default 0,
  order_ids uuid[] not null default '{}',
  mp_preference_id text,
  mp_payment_id text,
  approved_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.cart_checkouts add column if not exists buyer_user_id uuid;
alter table public.cart_checkouts add column if not exists status text;
alter table public.cart_checkouts alter column status set default 'pending';
alter table public.cart_checkouts add column if not exists total_cents integer;
alter table public.cart_checkouts alter column total_cents set default 0;
alter table public.cart_checkouts add column if not exists shipping_total_cents integer;
alter table public.cart_checkouts alter column shipping_total_cents set default 0;
alter table public.cart_checkouts add column if not exists order_ids uuid[];
alter table public.cart_checkouts alter column order_ids set default '{}';
alter table public.cart_checkouts add column if not exists mp_preference_id text;
alter table public.cart_checkouts add column if not exists mp_payment_id text;
alter table public.cart_checkouts add column if not exists approved_at timestamp with time zone;
alter table public.cart_checkouts add column if not exists created_at timestamp with time zone default now();
alter table public.cart_checkouts add column if not exists updated_at timestamp with time zone default now();

create index if not exists cart_checkouts_buyer_user_id_idx
  on public.cart_checkouts (buyer_user_id);
create index if not exists cart_checkouts_status_idx
  on public.cart_checkouts (status);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  quantity integer not null default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.cart_items add column if not exists cart_id uuid;
alter table public.cart_items add column if not exists listing_id uuid;
alter table public.cart_items add column if not exists quantity integer;
alter table public.cart_items alter column quantity set default 1;
alter table public.cart_items add column if not exists created_at timestamp with time zone default now();
alter table public.cart_items add column if not exists updated_at timestamp with time zone default now();

-- Limpeza defensiva: remove itens com referencias quebradas antes de garantir FKs
delete from public.cart_items ci
where not exists (
  select 1 from public.carts c where c.id = ci.cart_id
)
or not exists (
  select 1 from public.listings l where l.id = ci.listing_id
);

-- Garante chaves estrangeiras mesmo em bancos antigos
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cart_items_cart_id_fkey'
  ) then
    alter table public.cart_items
      add constraint cart_items_cart_id_fkey
      foreign key (cart_id)
      references public.carts (id)
      on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cart_items_listing_id_fkey'
  ) then
    alter table public.cart_items
      add constraint cart_items_listing_id_fkey
      foreign key (listing_id)
      references public.listings (id)
      on delete cascade;
  end if;
end;
$$;

create unique index if not exists cart_items_cart_listing_idx on public.cart_items (cart_id, listing_id);
create index if not exists cart_items_listing_id_idx on public.cart_items (listing_id);

create or replace function public.log_system_event(
  event_type text,
  entity_type text,
  entity_id uuid,
  actor_id uuid,
  metadata jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.system_events (event_type, entity_type, entity_id, actor_id, metadata)
  values (event_type, entity_type, entity_id, actor_id, metadata);
end;
$$;

create or replace function public.calculate_fee_cents(amount_cents integer)
returns integer
language plpgsql
immutable
as $$
begin
  if amount_cents is null or amount_cents <= 0 then
    return 0;
  end if;
  return round((amount_cents * 10) / 100.0)::integer;
end;
$$;

create or replace function public.calculate_min_bid_cents(
  base_cents integer,
  increment_percent integer
)
returns integer
language plpgsql
immutable
as $$
declare
  safe_base integer := coalesce(base_cents, 0);
  safe_percent integer := coalesce(nullif(increment_percent, 0), 25);
begin
  if safe_base < 0 then
    safe_base := 0;
  end if;
  if safe_percent < 1 then
    safe_percent := 1;
  end if;
  return ceil((safe_base * (100 + safe_percent)) / 100.0)::integer;
end;
$$;

drop function if exists public.place_proxy_bid(uuid, integer);

create or replace function public.place_proxy_bid(
  p_listing_id uuid,
  p_max_amount_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bidder_id uuid;
  listing_record record;
  current_bid integer;
  current_winner_id uuid;
  increment_percent integer;
  min_bid integer;
  top1 record;
  top2 record;
  next_amount integer;
  winner_id uuid;
begin
  bidder_id := auth.uid();
  if bidder_id is null then
    raise exception 'Autenticacao necessaria';
  end if;

  select *
    into listing_record
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Anuncio nao encontrado';
  end if;

  if listing_record.listing_type is distinct from 'auction' then
    raise exception 'Lances nao disponiveis';
  end if;

  if listing_record.status is distinct from 'active' then
    raise exception 'Lances inativos';
  end if;

  if listing_record.seller_user_id = bidder_id then
    raise exception 'Voce nao pode dar lance no seu anuncio';
  end if;

  if listing_record.auction_end_at is not null
    and listing_record.auction_end_at <= now() then
    raise exception 'Lances encerrados';
  end if;

  select b.amount_cents, b.bidder_user_id
    into current_bid, current_winner_id
  from public.bids b
  where b.listing_id = p_listing_id
  order by amount_cents desc, created_at asc
  limit 1;

  if current_bid is null then
    current_bid := coalesce(listing_record.price_cents, 0);
    current_winner_id := null;
  end if;

  increment_percent := coalesce(listing_record.auction_increment_percent, 25);
  min_bid := public.calculate_min_bid_cents(current_bid, increment_percent);

  if p_max_amount_cents < min_bid then
    raise exception 'Lance minimo %', min_bid;
  end if;

  insert into public.auction_proxy_bids (
    listing_id,
    bidder_user_id,
    max_amount_cents
  )
  values (
    p_listing_id,
    bidder_id,
    p_max_amount_cents
  )
  on conflict (listing_id, bidder_user_id)
  do update set
    max_amount_cents = greatest(
      excluded.max_amount_cents,
      public.auction_proxy_bids.max_amount_cents
    ),
    updated_at = now();

  select bidder_user_id, max_amount_cents, created_at
    into top1
  from public.auction_proxy_bids apb
  where apb.listing_id = p_listing_id
  order by max_amount_cents desc, created_at asc
  limit 1;

  select bidder_user_id, max_amount_cents, created_at
    into top2
  from public.auction_proxy_bids apb
  where apb.listing_id = p_listing_id
    and apb.bidder_user_id <> top1.bidder_user_id
  order by max_amount_cents desc, created_at asc
  limit 1;

  if top1.bidder_user_id is null then
    raise exception 'Lance nao registrado';
  end if;

  if top2.bidder_user_id is null then
    next_amount := min_bid;
  else
    next_amount := public.calculate_min_bid_cents(
      top2.max_amount_cents,
      increment_percent
    );
  end if;

  if next_amount > top1.max_amount_cents then
    next_amount := top1.max_amount_cents;
  end if;

  if next_amount < min_bid then
    next_amount := min_bid;
  end if;

  if next_amount < current_bid then
    next_amount := current_bid;
  end if;

  winner_id := top1.bidder_user_id;

  if next_amount > current_bid then
    insert into public.bids (listing_id, bidder_user_id, amount_cents)
    values (p_listing_id, winner_id, next_amount);
  elsif current_winner_id is distinct from winner_id then
    insert into public.bids (listing_id, bidder_user_id, amount_cents)
    values (p_listing_id, winner_id, next_amount);
  end if;

  return jsonb_build_object(
    'listing_id', p_listing_id,
    'winner_user_id', winner_id,
    'current_bid_cents', next_amount,
    'min_bid_cents', min_bid
  );
end;
$$;

drop function if exists public.close_auction(uuid, uuid);

create or replace function public.close_auction(
  p_listing_id uuid,
  closed_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_record record;
  top_bid record;
  existing_order_id uuid;
  new_order_id uuid;
  payment_deadline timestamp with time zone;
begin
  select *
    into listing_record
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Anuncio nao encontrado';
  end if;

  if listing_record.listing_type is distinct from 'auction' then
    raise exception 'Anuncio nao usa lances';
  end if;

  if listing_record.auction_closed_at is not null then
    return jsonb_build_object(
      'status', 'already_closed',
      'listing_id', p_listing_id,
      'order_id', listing_record.auction_order_id
    );
  end if;

  select id, bidder_user_id, amount_cents
    into top_bid
  from public.bids b
  where b.listing_id = p_listing_id
  order by amount_cents desc, created_at asc
  limit 1;

  update public.listings
  set
    status = 'paused',
    auction_closed_at = now(),
    auction_end_at = coalesce(auction_end_at, now())
  where id = p_listing_id;

  if top_bid.id is null then
    update public.listings
    set
      auction_final_bid_cents = null,
      auction_winner_user_id = null,
      auction_order_id = null
    where id = p_listing_id;

    return jsonb_build_object(
      'status', 'closed_no_bids',
      'listing_id', p_listing_id
    );
  end if;

  existing_order_id := listing_record.auction_order_id;
  if existing_order_id is null then
    new_order_id := gen_random_uuid();
    payment_deadline := now() + interval '4 days';

    insert into public.orders (
      id,
      listing_id,
      buyer_user_id,
      seller_user_id,
      amount_cents,
      fee_cents,
      status,
      payment_deadline_at
    )
    values (
      new_order_id,
      p_listing_id,
      top_bid.bidder_user_id,
      listing_record.seller_user_id,
      top_bid.amount_cents,
      public.calculate_fee_cents(top_bid.amount_cents),
      'pending',
      payment_deadline
    );

    update public.listings
    set
      auction_final_bid_cents = top_bid.amount_cents,
      auction_winner_user_id = top_bid.bidder_user_id,
      auction_order_id = new_order_id
    where id = p_listing_id;

    insert into public.notifications (user_id, title, body, link)
    values
      (
        top_bid.bidder_user_id,
        'Lances encerrados',
        'Voce venceu o lance. Finalize o pagamento em ate 4 dias.',
        '/checkout/lances?order_id=' || new_order_id::text
      ),
      (
        listing_record.seller_user_id,
        'Lances encerrados',
        'Seu anuncio encerrou com vencedor. Aguardando pagamento.',
        '/vender'
      );

    insert into public.notifications (user_id, title, body, link)
    select
      a.user_id,
      'Lances encerrados',
      'Um anuncio encerrou com vencedor.',
      '/painel-ganm-ols/controle'
    from public.admins a
    where a.user_id is not null;

    return jsonb_build_object(
      'status', 'closed_with_winner',
      'listing_id', p_listing_id,
      'order_id', new_order_id,
      'winner_user_id', top_bid.bidder_user_id,
      'final_bid_cents', top_bid.amount_cents
    );
  end if;

  update public.listings
  set
    auction_final_bid_cents = top_bid.amount_cents,
    auction_winner_user_id = top_bid.bidder_user_id
  where id = p_listing_id;

  return jsonb_build_object(
    'status', 'closed_with_existing_order',
    'listing_id', p_listing_id,
    'order_id', existing_order_id,
    'winner_user_id', top_bid.bidder_user_id,
    'final_bid_cents', top_bid.amount_cents
  );
end;
$$;

create or replace function public.close_expired_auctions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row record;
  closed_count integer := 0;
begin
  for listing_row in
    select id
    from public.listings
    where listing_type = 'auction'
      and status = 'active'
      and auction_end_at is not null
      and auction_end_at <= now()
  loop
    perform public.close_auction(listing_row.id, null);
    closed_count := closed_count + 1;
  end loop;

  return closed_count;
end;
$$;

create or replace function public.trg_profiles_created()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'user_created',
    'profile',
    new.id,
    new.id,
    jsonb_build_object('email', new.email)
  );
  return new;
end;
$$;

create or replace function public.trg_listings_created()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'listing_created',
    'listing',
    new.id,
    new.seller_user_id,
    jsonb_build_object(
      'title', new.title,
      'price_cents', new.price_cents,
      'status', new.status
    )
  );
  return new;
end;
$$;

create or replace function public.trg_listings_status_changed()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    perform public.log_system_event(
      'listing_status_changed',
      'listing',
      new.id,
      new.seller_user_id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;
  return new;
end;
$$;

create or replace function public.trg_orders_created()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'order_created',
    'order',
    new.id,
    new.buyer_user_id,
    jsonb_build_object(
      'listing_id', new.listing_id,
      'seller_user_id', new.seller_user_id,
      'amount_cents', new.amount_cents
    )
  );
  return new;
end;
$$;

create or replace function public.trg_orders_status_changed()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    perform public.log_system_event(
      'order_status_changed',
      'order',
      new.id,
      new.buyer_user_id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
    if new.status = 'delivered' then
      perform public.log_system_event(
        'order_delivered',
        'order',
        new.id,
        new.buyer_user_id,
        jsonb_build_object('delivered_at', new.delivered_at)
      );
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.trg_coupon_redeemed()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'coupon_redeemed',
    'coupon_redemption',
    new.id,
    new.user_id,
    jsonb_build_object('coupon_id', new.coupon_id, 'order_id', new.order_id)
  );
  return new;
end;
$$;

create or replace function public.trg_coupon_created()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'coupon_created',
    'coupon',
    new.id,
    null,
    jsonb_build_object('code', new.code, 'active', new.active)
  );
  return new;
end;
$$;

create or replace function public.trg_coupon_updated()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'coupon_updated',
    'coupon',
    new.id,
    null,
    jsonb_build_object(
      'code', new.code,
      'active', new.active,
      'old_active', old.active
    )
  );
  return new;
end;
$$;

create or replace function public.trg_coupon_deleted()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'coupon_deleted',
    'coupon',
    old.id,
    null,
    jsonb_build_object('code', old.code)
  );
  return old;
end;
$$;

create or replace function public.trg_payment_event_received()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'payment_event_received',
    'payment_event',
    new.id,
    null,
    jsonb_build_object(
      'provider', new.provider,
      'event_type', new.event_type,
      'status', new.status,
      'order_id', new.order_id
    )
  );
  return new;
end;
$$;

drop trigger if exists profiles_created_event on public.profiles;
create trigger profiles_created_event
after insert on public.profiles
for each row execute function public.trg_profiles_created();

drop trigger if exists listings_created_event on public.listings;
create trigger listings_created_event
after insert on public.listings
for each row execute function public.trg_listings_created();

drop trigger if exists listings_status_changed_event on public.listings;
create trigger listings_status_changed_event
after update of status on public.listings
for each row execute function public.trg_listings_status_changed();

drop trigger if exists orders_created_event on public.orders;
create trigger orders_created_event
after insert on public.orders
for each row execute function public.trg_orders_created();

drop trigger if exists orders_status_changed_event on public.orders;
create trigger orders_status_changed_event
after update of status on public.orders
for each row execute function public.trg_orders_status_changed();

drop trigger if exists coupon_redeemed_event on public.coupon_redemptions;
create trigger coupon_redeemed_event
after insert on public.coupon_redemptions
for each row execute function public.trg_coupon_redeemed();

drop trigger if exists coupon_created_event on public.coupons;
create trigger coupon_created_event
after insert on public.coupons
for each row execute function public.trg_coupon_created();

drop trigger if exists coupon_updated_event on public.coupons;
create trigger coupon_updated_event
after update on public.coupons
for each row execute function public.trg_coupon_updated();

drop trigger if exists coupon_deleted_event on public.coupons;
create trigger coupon_deleted_event
after delete on public.coupons
for each row execute function public.trg_coupon_deleted();

drop trigger if exists payment_event_received_event on public.payment_events;
create trigger payment_event_received_event
after insert on public.payment_events
for each row execute function public.trg_payment_event_received();

create or replace function public.trg_plan_created()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'plan_created',
    'subscription_plan',
    new.id,
    null,
    jsonb_build_object('name', new.name, 'slug', new.slug, 'price_cents', new.price_cents)
  );
  return new;
end;
$$;

create or replace function public.trg_plan_updated()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'plan_updated',
    'subscription_plan',
    new.id,
    null,
    jsonb_build_object('name', new.name, 'slug', new.slug, 'is_active', new.is_active)
  );
  return new;
end;
$$;

create or replace function public.trg_plan_deleted()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'plan_deleted',
    'subscription_plan',
    old.id,
    null,
    jsonb_build_object('name', old.name, 'slug', old.slug)
  );
  return old;
end;
$$;

create or replace function public.trg_subscription_created()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'subscription_created',
    'user_subscription',
    new.id,
    new.user_id,
    jsonb_build_object('plan_id', new.plan_id, 'status', new.status)
  );
  return new;
end;
$$;

create or replace function public.trg_subscription_updated()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'subscription_updated',
    'user_subscription',
    new.id,
    new.user_id,
    jsonb_build_object('status', new.status, 'old_status', old.status)
  );
  return new;
end;
$$;

drop trigger if exists plan_created_event on public.subscription_plans;
create trigger plan_created_event
after insert on public.subscription_plans
for each row execute function public.trg_plan_created();

drop trigger if exists plan_updated_event on public.subscription_plans;
create trigger plan_updated_event
after update on public.subscription_plans
for each row execute function public.trg_plan_updated();

drop trigger if exists plan_deleted_event on public.subscription_plans;
create trigger plan_deleted_event
after delete on public.subscription_plans
for each row execute function public.trg_plan_deleted();

drop trigger if exists subscription_created_event on public.user_subscriptions;
create trigger subscription_created_event
after insert on public.user_subscriptions
for each row execute function public.trg_subscription_created();

drop trigger if exists subscription_updated_event on public.user_subscriptions;
create trigger subscription_updated_event
after update on public.user_subscriptions
for each row execute function public.trg_subscription_updated();

create or replace function public.trg_home_section_created()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'home_section_created',
    'home_section',
    new.id,
    null,
    jsonb_build_object('slug', new.slug, 'title', new.title)
  );
  return new;
end;
$$;

create or replace function public.trg_home_section_updated()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'home_section_updated',
    'home_section',
    new.id,
    null,
    jsonb_build_object(
      'slug', new.slug,
      'is_active', new.is_active,
      'old_is_active', old.is_active
    )
  );
  return new;
end;
$$;

create or replace function public.trg_home_section_deleted()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'home_section_deleted',
    'home_section',
    old.id,
    null,
    jsonb_build_object('slug', old.slug)
  );
  return old;
end;
$$;

create or replace function public.trg_home_item_created()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'home_item_created',
    'home_item',
    new.id,
    null,
    jsonb_build_object('section_id', new.section_id, 'title', new.title)
  );
  return new;
end;
$$;

create or replace function public.trg_home_item_deleted()
returns trigger
language plpgsql
as $$
begin
  perform public.log_system_event(
    'home_item_deleted',
    'home_item',
    old.id,
    null,
    jsonb_build_object('section_id', old.section_id, 'title', old.title)
  );
  return old;
end;
$$;

drop trigger if exists home_section_created_event on public.home_sections;
create trigger home_section_created_event
after insert on public.home_sections
for each row execute function public.trg_home_section_created();

drop trigger if exists home_section_updated_event on public.home_sections;
create trigger home_section_updated_event
after update on public.home_sections
for each row execute function public.trg_home_section_updated();

drop trigger if exists home_section_deleted_event on public.home_sections;
create trigger home_section_deleted_event
after delete on public.home_sections
for each row execute function public.trg_home_section_deleted();

drop trigger if exists home_item_created_event on public.home_items;
create trigger home_item_created_event
after insert on public.home_items
for each row execute function public.trg_home_item_created();

drop trigger if exists home_item_deleted_event on public.home_items;
create trigger home_item_deleted_event
after delete on public.home_items
for each row execute function public.trg_home_item_deleted();
-- Seller payment accounts (marketplace OAuth)
create table if not exists public.seller_payment_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  provider text not null default 'mercadopago',
  mp_user_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists seller_payment_accounts_provider_idx
  on public.seller_payment_accounts (provider);
