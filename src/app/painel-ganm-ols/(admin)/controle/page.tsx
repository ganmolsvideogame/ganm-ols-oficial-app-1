import Link from "next/link";
import { redirect } from "next/navigation";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { BUYER_APPROVAL_DAYS, MARKETPLACE_FEE_PERCENT } from "@/lib/config/commerce";
import { FAMILIES } from "@/lib/mock/data";
import { closeExpiredAuctions } from "@/lib/auctions";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type ListingRow = {
  id: string;
  title: string;
  price_cents: number | null;
  status: string | null;
  family: string | null;
  platform: string | null;
  seller_user_id: string;
  is_featured: boolean | null;
  is_week_offer: boolean | null;
  listing_type: string | null;
  auction_end_at: string | null;
  created_at: string | null;
};

type SellerRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  role: string | null;
  created_at: string | null;
  payout_method: string | null;
  payout_pix_key: string | null;
  payout_bank_name: string | null;
  payout_bank_agency: string | null;
  payout_bank_account: string | null;
  payout_bank_account_type: string | null;
  payout_doc: string | null;
  payout_name: string | null;
};

type ProfileRow = {
  id: string;
  created_at: string | null;
  role: string | null;
  display_name?: string | null;
  email?: string | null;
};

type BidRow = {
  id: string;
  listing_id: string;
  bidder_user_id: string;
  amount_cents: number | null;
  created_at: string | null;
};

type CartItemRow = {
  id: string;
  listing_id: string;
  quantity: number | null;
  listings:
    | {
        id: string;
        title: string | null;
        price_cents: number | null;
        status: string | null;
      }[]
    | null;
};

type CartRow = {
  id: string;
  user_id: string;
  updated_at: string | null;
  cart_items: CartItemRow[] | null;
};

type PayoutRow = {
  id: string;
  seller_user_id: string;
  amount_cents: number | null;
  status: string | null;
  created_at: string | null;
  paid_at: string | null;
};

type OrderRow = {
  id: string;
  amount_cents: number | null;
  fee_cents: number | null;
  status: string | null;
  created_at: string | null;
  approved_at: string | null;
  available_at: string | null;
  delivered_at?: string | null;
  buyer_approval_deadline_at?: string | null;
  payout_status: string | null;
};

function formatLabel(value: string | null | undefined) {
  if (!value) {
    return "Sem info";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPayoutMethod(seller: SellerRow | undefined) {
  if (!seller) {
    return "Nao configurado";
  }
  if (seller.payout_method === "pix") {
    return `Pix: ${seller.payout_pix_key || "Chave nao informada"}`;
  }
  if (seller.payout_method === "bank") {
    const bankName = seller.payout_bank_name || "Banco nao informado";
    const account = seller.payout_bank_account || "Conta nao informada";
    return `Banco: ${bankName} - ${account}`;
  }
  return "Nao configurado";
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function isWithinDays(value: string | null | undefined, days: number) {
  const date = parseDate(value);
  if (!date) {
    return false;
  }
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date >= cutoff;
}

function isSameDay(value: string | null | undefined, reference: Date) {
  const date = parseDate(value);
  if (!date) {
    return false;
  }
  return date.toDateString() === reference.toDateString();
}

function formatMetric(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Nao configurado";
  }
  return String(value);
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const supabase = await createClient();
  const familyLabelBySlug = Object.fromEntries(
    FAMILIES.map((family) => [family.slug, family.name])
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Faca login para acessar o admin"
      )}`
    );
  }

  const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin");
  const isAdmin = adminCheck === true;

  if (adminError || !isAdmin) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Sem permissao para acessar o admin"
      )}`
    );
  }

  await closeExpiredAuctions();

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: listingsData, error: listingsError } = await supabase
    .from("listings")
    .select(
      "id, title, price_cents, status, family, platform, seller_user_id, is_featured, is_week_offer, listing_type, auction_end_at, created_at"
    )
    .order("created_at", { ascending: false });

  const { data: sellersData, error: sellersError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, email, phone, address_line1, address_line2, city, state, zipcode, role, created_at, payout_method, payout_pix_key, payout_bank_name, payout_bank_agency, payout_bank_account, payout_bank_account_type, payout_doc, payout_name"
    )
    .eq("role", "seller")
    .order("created_at", { ascending: false });

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, created_at, role, display_name, email");

  const { count: bidsLast24h, error: bidsError } = await supabase
    .from("bids")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since24h.toISOString());

  const { data: bidsData, error: bidsDataError } = await supabase
    .from("bids")
    .select("id, listing_id, bidder_user_id, amount_cents, created_at")
    .order("created_at", { ascending: false });

  const { data: payoutData, error: payoutError } = await supabase
    .from("payout_requests")
    .select("id, seller_user_id, amount_cents, status, created_at, paid_at")
    .order("created_at", { ascending: false });

  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select(
      "id, amount_cents, fee_cents, status, created_at, approved_at, delivered_at, available_at, buyer_approval_deadline_at, payout_status"
    )
    .order("created_at", { ascending: false });

  const { data: cartsData, error: cartsError } = await supabase
    .from("carts")
    .select(
      "id, user_id, updated_at, cart_items(id, listing_id, quantity, listings(id, title, price_cents, status))"
    )
    .order("updated_at", { ascending: false });

  const listings = (listingsData ?? []) as ListingRow[];
  const sellers = (sellersData ?? []) as SellerRow[];
  const profiles = (profilesData ?? []) as ProfileRow[];
  const bids = (bidsData ?? []) as BidRow[];
  const payouts = (payoutData ?? []) as PayoutRow[];
  const orders = (ordersData ?? []) as OrderRow[];
  const carts = (cartsData ?? []) as CartRow[];
  const approvedOrders = orders.filter((order) => order.status === "approved");

  const listingCounts = new Map<string, number>();
  listings.forEach((listing) => {
    listingCounts.set(
      listing.seller_user_id,
      (listingCounts.get(listing.seller_user_id) ?? 0) + 1
    );
  });

  const sellerMap = new Map<string, SellerRow>();
  sellers.forEach((seller) => {
    sellerMap.set(seller.id, seller);
  });

  const profileMap = new Map<string, ProfileRow>();
  profiles.forEach((profile) => {
    profileMap.set(profile.id, profile);
  });

  const bidsByListing = new Map<string, BidRow[]>();
  bids.forEach((bid) => {
    const current = bidsByListing.get(bid.listing_id) ?? [];
    current.push(bid);
    bidsByListing.set(bid.listing_id, current);
  });

  const cartByUserId = new Map<string, CartRow>();
  carts.forEach((cart) => {
    cartByUserId.set(cart.user_id, cart);
  });

  const buyerCarts = carts.filter((cart) => !sellerMap.has(cart.user_id));
  const buyerCartRows = buyerCarts.map((cart) => ({
    cart,
    profile: profileMap.get(cart.user_id),
  }));

  const totalListings = listings.length;
  const activeListings = listings.filter((listing) => listing.status === "active")
    .length;
  const featuredListings = listings.filter((listing) => listing.is_featured).length;
  const weekOffers = listings.filter((listing) => listing.is_week_offer).length;

  const grossRevenue =
    approvedOrders.reduce((sum, order) => sum + (order.amount_cents ?? 0), 0) ?? 0;
  const totalFees =
    approvedOrders.reduce((sum, order) => sum + (order.fee_cents ?? 0), 0) ?? 0;
  const payoutRequested = new Set(["requested", "paid"]);
  const availableToPay = approvedOrders.reduce((sum, order) => {
    if (order.payout_status && payoutRequested.has(order.payout_status)) {
      return sum;
    }
    const availableAt = order.available_at
      ? new Date(order.available_at)
      : order.buyer_approval_deadline_at
        ? new Date(order.buyer_approval_deadline_at)
        : order.delivered_at
          ? new Date(
              new Date(order.delivered_at).getTime() +
                BUYER_APPROVAL_DAYS * 24 * 60 * 60 * 1000
            )
          : null;
    if (!availableAt) {
      return sum;
    }
    if (availableAt > now) {
      return sum;
    }
    const net = (order.amount_cents ?? 0) - (order.fee_cents ?? 0);
    return sum + Math.max(0, net);
  }, 0);

  const holdBalance = approvedOrders.reduce((sum, order) => {
    if (order.payout_status && payoutRequested.has(order.payout_status)) {
      return sum;
    }
    const availableAt = order.available_at
      ? new Date(order.available_at)
      : order.buyer_approval_deadline_at
        ? new Date(order.buyer_approval_deadline_at)
        : order.delivered_at
          ? new Date(
              new Date(order.delivered_at).getTime() +
                BUYER_APPROVAL_DAYS * 24 * 60 * 60 * 1000
            )
          : null;
    if (!availableAt) {
      return sum;
    }
    if (availableAt <= now) {
      return sum;
    }
    const net = (order.amount_cents ?? 0) - (order.fee_cents ?? 0);
    return sum + Math.max(0, net);
  }, 0);

  const orderStatusCounts = {
    pending: orders.filter((order) => order.status === "pending").length,
    paid: orders.filter((order) =>
      ["approved", "paid"].includes(order.status ?? "")
    ).length,
    shipped: orders.filter((order) => order.status === "shipped").length,
    delivered: orders.filter((order) => order.status === "delivered").length,
    cancelled: orders.filter((order) =>
      ["cancelled", "canceled"].includes(order.status ?? "")
    ).length,
    dispute: orders.filter((order) =>
      ["dispute", "chargeback"].includes(order.status ?? "")
    ).length,
  };

  const auctionListings = listings.filter(
    (listing) => listing.listing_type === "auction"
  );
  const activeAuctions = auctionListings.filter((listing) => {
    if (listing.status !== "active") {
      return false;
    }
    const endDate = parseDate(listing.auction_end_at);
    if (!endDate) {
      return true;
    }
    return endDate > now;
  }).length;
  const auctionsEndingToday = auctionListings.filter((listing) =>
    isSameDay(listing.auction_end_at, now)
  ).length;

  const newListings24h = listings.filter((listing) =>
    isWithinDays(listing.created_at, 1)
  ).length;
  const pendingReviewListings = listings.filter(
    (listing) => listing.status === "pending_review"
  ).length;
  const rejectedListings = listings.filter(
    (listing) => listing.status === "rejected"
  ).length;

  const newUsers24h = profilesError
    ? null
    : profiles.filter((profile) => isWithinDays(profile.created_at, 1)).length;
  const newUsers7d = profilesError
    ? null
    : profiles.filter((profile) => isWithinDays(profile.created_at, 7)).length;
  const newUsers30d = profilesError
    ? null
    : profiles.filter((profile) => isWithinDays(profile.created_at, 30)).length;

  const shippingDelayDays = 7;
  const shippingDelayCutoff = new Date(
    now.getTime() - shippingDelayDays * 24 * 60 * 60 * 1000
  );
  const shippingDelays = orders.filter((order) => {
    if (!order.status || !["approved", "paid"].includes(order.status)) {
      return false;
    }
    const baseDate = order.approved_at ?? order.created_at;
    const orderDate = parseDate(baseDate);
    return orderDate ? orderDate < shippingDelayCutoff : false;
  }).length;

  const pendingPayouts = payouts.filter((payout) => payout.status === "pending")
    .length;

  const hasErrors =
    listingsError ||
    sellersError ||
    bidsDataError ||
    payoutError ||
    ordersError ||
    cartsError;

  return (
    <main className="space-y-8">
      {resolvedSearchParams?.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {resolvedSearchParams.error}
        </div>
      ) : null}
      {resolvedSearchParams?.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {resolvedSearchParams.success}
        </div>
      ) : null}

      {hasErrors ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          Erro ao carregar dados do admin. Verifique as politicas no Supabase.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "GMV (vendas totais)",
            value: formatCentsToBRL(grossRevenue),
          },
          {
            label: `Receita plataforma (${MARKETPLACE_FEE_PERCENT}%)`,
            value: formatCentsToBRL(totalFees),
          },
          {
            label: "Taxas externas",
            value: "Nao configurado",
          },
          {
            label: "Repasses disponiveis",
            value: formatCentsToBRL(availableToPay),
          },
          {
            label: "Em garantia",
            value: formatCentsToBRL(holdBalance),
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Pedidos por status
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Pendente", value: orderStatusCounts.pending },
            { label: "Pago", value: orderStatusCounts.paid },
            { label: "Enviado", value: orderStatusCounts.shipped },
            { label: "Entregue", value: orderStatusCounts.delivered },
            { label: "Cancelado", value: orderStatusCounts.cancelled },
            { label: "Disputa", value: orderStatusCounts.dispute },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                {item.label}
              </p>
              <p className="mt-3 text-xl font-semibold text-zinc-900">
                {formatMetric(item.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Lances ativos", value: activeAuctions },
          {
            label: "Lances nas ultimas 24h",
            value: bidsError ? null : bidsLast24h ?? 0,
          },
          { label: "Lances encerrando hoje", value: auctionsEndingToday },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">
              {formatMetric(item.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Cadastros 24h", value: newUsers24h },
          { label: "Cadastros 7 dias", value: newUsers7d },
          { label: "Cadastros 30 dias", value: newUsers30d },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">
              {formatMetric(item.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Anuncios novos 24h", value: newListings24h },
          { label: "Aguardando revisao", value: pendingReviewListings },
          { label: "Reprovados", value: rejectedListings },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">
              {formatMetric(item.value)}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Alertas</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Denuncias pendentes", value: null },
            { label: "Chargeback/disputa", value: orderStatusCounts.dispute },
            { label: "Estoque suspeito", value: null },
            {
              label: `Atrasos no envio (+${shippingDelayDays}d)`,
              value: shippingDelays,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                {item.label}
              </p>
              <p className="mt-3 text-xl font-semibold">
                {formatMetric(item.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Anuncios cadastrados", value: totalListings },
          { label: "Anuncios ativos", value: activeListings },
          { label: "Destaques", value: featuredListings },
          { label: "Ofertas da semana", value: weekOffers },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">Vendedores</h2>
          <span className="text-sm text-zinc-500">Total: {sellers.length}</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {sellers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum vendedor cadastrado ainda.
            </div>
          ) : (
            sellers.map((seller) => {
              const sellerCart = cartByUserId.get(seller.id);
              const cartItems = sellerCart?.cart_items ?? [];
              const cartCount = cartItems.reduce(
                (sum, item) => sum + (item.quantity ?? 0),
                0
              );
              const cartPreview = cartItems.slice(0, 3);
              const remaining = cartItems.length - cartPreview.length;
              const address = [seller.address_line1, seller.address_line2]
                .filter(Boolean)
                .join(", ");
              const location = [seller.city, seller.state, seller.zipcode]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={seller.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {formatLabel(seller.role)}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-zinc-900">
                    {seller.display_name || seller.email || "Vendedor"}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {seller.email || "Sem email"}
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-zinc-500">
                    <p>Telefone: {seller.phone || "Sem telefone"}</p>
                    <p>Endereco: {address || "Nao informado"}</p>
                    <p>Local: {location || "Nao informado"}</p>
                    <p>Pagamento: {formatPayoutMethod(seller)}</p>
                  </div>
                  <p className="mt-3 text-sm text-zinc-500">
                    Anuncios: {listingCounts.get(seller.id) ?? 0}
                  </p>
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Carrinho
                    </p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">
                      {cartCount} item(s)
                    </p>
                    {cartPreview.length === 0 ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        Carrinho vazio.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {cartPreview.map((item) => (
                          <p key={item.id}>
                            {item.listings?.[0]?.title ?? "Anuncio removido"} x{item.quantity ?? 0}
                          </p>
                        ))}
                        {remaining > 0 ? (
                          <p className="text-[10px] text-zinc-500">
                            +{remaining} itens
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">
            Carrinhos (compradores)
          </h2>
          <span className="text-sm text-zinc-500">
            Total: {buyerCartRows.length}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {buyerCartRows.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum carrinho de comprador encontrado.
            </div>
          ) : (
            buyerCartRows.map(({ cart, profile }) => {
              const cartItems = cart.cart_items ?? [];
              const cartCount = cartItems.reduce(
                (sum, item) => sum + (item.quantity ?? 0),
                0
              );
              const cartPreview = cartItems.slice(0, 4);
              const remaining = cartItems.length - cartPreview.length;
              const profileLabel =
                profile?.display_name || profile?.email || "Comprador";
              const profileEmail = profile?.email || "Sem email";
              const profileRole = formatLabel(profile?.role || "buyer");

              return (
                <div
                  key={cart.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {profileRole}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-zinc-900">
                    {profileLabel}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600">{profileEmail}</p>
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Itens no carrinho
                    </p>
                    <p className="mt-2 text-sm font-semibold text-zinc-900">
                      {cartCount} item(s)
                    </p>
                    {cartPreview.length === 0 ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        Carrinho vazio.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {cartPreview.map((item) => (
                          <p key={item.id}>
                            {item.listings?.[0]?.title ?? "Anuncio removido"} x
                            {item.quantity ?? 0}
                          </p>
                        ))}
                        {remaining > 0 ? (
                          <p className="text-[10px] text-zinc-500">
                            +{remaining} itens
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    Atualizado: {cart.updated_at ? cart.updated_at.slice(0, 19).replace("T", " ") : "Sem data"}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">
            Solicitacoes de saque
          </h2>
          <span className="text-sm text-zinc-500">
            Pendentes: {pendingPayouts}
          </span>
        </div>
        <div className="grid gap-4">
          {payouts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhuma solicitacao registrada.
            </div>
          ) : (
            payouts.map((payout) => {
              const seller = sellerMap.get(payout.seller_user_id);
              const sellerLabel =
                seller?.display_name || seller?.email || "Vendedor";
              const status = payout.status ?? "pending";

              return (
                <div
                  key={payout.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        {sellerLabel}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {formatCentsToBRL(payout.amount_cents ?? 0)}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        Status: {status}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        {formatPayoutMethod(seller)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <p>
                        {payout.created_at ? payout.created_at.slice(0, 10) : "Sem data"}
                      </p>
                      {payout.paid_at ? (
                        <p>Pago em {payout.paid_at.slice(0, 10)}</p>
                      ) : null}
                    </div>
                  </div>
                  {status === "pending" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                      <form action="/api/admin/payouts" method="post">
                        <input type="hidden" name="request_id" value={payout.id} />
                        <input type="hidden" name="action" value="paid" />
                        <button
                          type="submit"
                          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Marcar como pago
                        </button>
                      </form>
                      <form action="/api/admin/payouts" method="post">
                        <input type="hidden" name="request_id" value={payout.id} />
                        <input type="hidden" name="action" value="reject" />
                        <button
                          type="submit"
                          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                        >
                          Rejeitar
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-zinc-900">Anuncios</h2>
          <span className="text-sm text-zinc-500">Total: {listings.length}</span>
        </div>
        <div className="grid gap-4">
          {listings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum anuncio cadastrado ainda.
            </div>
          ) : (
            listings.map((listing) => {
              const seller = sellerMap.get(listing.seller_user_id);
              const sellerLabel =
                seller?.display_name || seller?.email || "Vendedor";
              const featured = Boolean(listing.is_featured);
              const weekOffer = Boolean(listing.is_week_offer);
              const status = listing.status || "active";
              const listingBids = bidsByListing.get(listing.id) ?? [];
              const highestBidCents = listingBids.reduce((max, bid) => {
                const amount = bid.amount_cents ?? 0;
                return amount > max ? amount : max;
              }, 0);
              const recentBids = listingBids.slice(0, 5);

              return (
                <div
                  key={listing.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        {listing.platform || "Sem plataforma"}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {listing.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {sellerLabel} -{" "}
                        {familyLabelBySlug[listing.family ?? ""] ??
                          formatLabel(listing.family)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">
                        {formatCentsToBRL(listing.price_cents ?? 0)}
                      </p>
                      <span className="mt-2 inline-flex rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600">
                        {status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/anuncio/${listing.id}`}
                      className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                    >
                      Ver detalhes
                    </Link>
                    <form action="/api/admin/listings" method="post">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <input
                        type="hidden"
                        name="action"
                        value={featured ? "feature_off" : "feature_on"}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {featured ? "Remover destaque" : "Destacar"}
                      </button>
                    </form>
                    <form action="/api/admin/listings" method="post">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <input
                        type="hidden"
                        name="action"
                        value={weekOffer ? "offer_off" : "offer_on"}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {weekOffer ? "Remover oferta" : "Oferta da semana"}
                      </button>
                    </form>
                    <form action="/api/admin/listings" method="post">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <input
                        type="hidden"
                        name="action"
                        value={status === "active" ? "pause" : "activate"}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {status === "active" ? "Pausar" : "Ativar"}
                      </button>
                    </form>
                    {listing.listing_type === "auction" && status === "active" ? (
                      <form action="/api/admin/listings" method="post">
                        <input type="hidden" name="listing_id" value={listing.id} />
                        <input type="hidden" name="action" value="end_auction" />
                        <button
                          type="submit"
                          className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700"
                        >
                          Encerrar lances
                        </button>
                      </form>
                    ) : null}
                    <form action="/api/admin/listings" method="post">
                      <input type="hidden" name="listing_id" value={listing.id} />
                      <input type="hidden" name="action" value="delete" />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-rose-700"
                      >
                        Excluir
                      </button>
                    </form>
                  </div>

                  {listing.listing_type === "auction" ? (
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-700">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Lances
                        </p>
                        <p className="text-xs text-zinc-600">
                          Total: {listingBids.length}
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-zinc-900">
                        Maior lance: {formatCentsToBRL(highestBidCents)}
                      </p>
                      {recentBids.length === 0 ? (
                        <p className="mt-2 text-xs text-zinc-500">
                          Nenhum lance registrado.
                        </p>
                      ) : (
                        <div className="mt-2 space-y-1">
                          {recentBids.map((bid) => {
                            const bidder = profileMap.get(bid.bidder_user_id);
                            const bidderLabel =
                              bidder?.display_name ||
                              bidder?.email ||
                              bid.bidder_user_id.slice(0, 8);
                            const bidDate = bid.created_at
                              ? bid.created_at.slice(0, 16).replace("T", " ")
                              : "Sem data";
                            return (
                              <p key={bid.id}>
                                {bidderLabel}: {formatCentsToBRL(bid.amount_cents ?? 0)}{" "}
                                <span className="text-zinc-500">({bidDate})</span>
                              </p>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
