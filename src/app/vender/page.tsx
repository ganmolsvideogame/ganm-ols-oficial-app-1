import { randomUUID } from "crypto";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FAMILIES } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import AutoRefreshSuperfrete from "@/components/orders/AutoRefreshSuperfrete";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCentsToBRL, parsePriceToCents } from "@/lib/utils/price";
import ImageUploadField from "@/components/listings/ImageUploadField";
import {
  AUCTION_DURATION_OPTIONS,
  AUCTION_PAYMENT_WINDOW_DAYS,
  closeAuctionById,
  closeExpiredAuctions,
} from "@/lib/auctions";
import {
  BUYER_APPROVAL_DAYS,
  DEFAULT_AUCTION_INCREMENT_PERCENT,
  MIN_LISTING_PRICE_CENTS,
} from "@/lib/config/commerce";
import { resolvePackageDimensions } from "@/lib/shipping/presets";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
  debug?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type ListingRow = {
  id: string;
  title: string;
  price_cents: number;
  status: string | null;
  moderation_status?: string | null;
  platform: string | null;
  created_at: string | null;
  thumbnail_url: string | null;
  listing_type?: string | null;
  auction_end_at?: string | null;
  auction_increment_percent?: number | null;
  auction_closed_at?: string | null;
  auction_winner_user_id?: string | null;
  auction_order_id?: string | null;
};

type OrderRow = {
  id: string;
  listing_id?: string | null;
  buyer_user_id?: string | null;
  amount_cents: number;
  fee_cents: number | null;
  shipping_cost_cents?: number | null;
  shipping_paid_by?: string | null;
  shipping_service_name?: string | null;
  status: string | null;
  mp_payment_id?: string | null;
  created_at: string | null;
  approved_at: string | null;
  available_at: string | null;
  delivered_at?: string | null;
  buyer_approval_deadline_at?: string | null;
  payment_deadline_at?: string | null;
  payout_status: string | null;
  payout_requested_at: string | null;
  superfrete_id?: string | null;
  superfrete_print_url?: string | null;
  superfrete_status?: string | null;
  cancel_status?: string | null;
  cancel_requested_by?: string | null;
  cancel_requested_at?: string | null;
  cancel_deadline_at?: string | null;
  cancel_reason?: string | null;
  listings?: {
    title?: string | null;
    thumbnail_url?: string | null;
    listing_type?: string | null;
  } | null;
};

function getExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "jpg";
}

function formatDateTimeLocal(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }
  return date.toLocaleString("pt-BR");
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Sem data";
  }
  if (Number.isNaN(value.getTime())) {
    return "Sem data";
  }
  return value.toLocaleDateString("pt-BR");
}

function resolveAvailableAt(order: OrderRow) {
  if (order.available_at) {
    return parseDate(order.available_at);
  }
  if (order.buyer_approval_deadline_at) {
    return parseDate(order.buyer_approval_deadline_at);
  }
  if (order.delivered_at) {
    const deliveredAt = parseDate(order.delivered_at);
    if (!deliveredAt) {
      return null;
    }
    return new Date(
      deliveredAt.getTime() + BUYER_APPROVAL_DAYS * 24 * 60 * 60 * 1000
    );
  }
  return null;
}

function computeNetCents(order: OrderRow) {
  const baseNet = (order.amount_cents ?? 0) - (order.fee_cents ?? 0);
  const shippingCharge =
    order.shipping_paid_by === "seller"
      ? Math.max(0, order.shipping_cost_cents ?? 0)
      : 0;
  const net = baseNet - shippingCharge;
  return Math.max(0, net);
}

async function upgradeToSeller() {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : user.email?.split("@")[0] ?? "Usuario";

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? undefined,
      display_name: displayName,
      role: "seller",
    },
    { onConflict: "id" }
  );

  if (error) {
    redirect(`/vender?error=${encodeURIComponent(error.message)}`);
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { role: "seller" },
  });

  if (metadataError) {
    redirect(`/vender?error=${encodeURIComponent(metadataError.message)}`);
  }

  redirect("/vender?success=Perfil+de+vendedor+ativado");
}

async function createListing(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect(`/vender?error=${encodeURIComponent(profileError.message)}`);
  }

  if (profile?.role !== "seller") {
    redirect("/vender?error=Seu+perfil+ainda+nao+e+vendedor");
  }

  const title = String(formData.get("title") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const condition = String(formData.get("condition") ?? "").trim();
  const family = String(formData.get("family") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const listingTypeRaw = String(formData.get("listing_type") ?? "now").trim();
  const listingType = listingTypeRaw === "auction" ? "auction" : "now";
  const shippingAvailable = true;
  const freeShipping = shippingAvailable && formData.get("free_shipping") === "on";
  const sellerName = String(formData.get("seller_name") ?? "").trim();
  const quantityRaw = String(formData.get("quantity_available") ?? "1").trim();
  const quantityParsed = Number.parseInt(quantityRaw, 10);
  const quantityAvailable = Number.isFinite(quantityParsed)
    ? Math.max(1, quantityParsed)
    : 1;
  const auctionIncrementRaw = String(
    formData.get("auction_increment_percent") ?? ""
  ).trim();
  const auctionIncrementParsed = Number.parseInt(auctionIncrementRaw, 10);
  const auctionIncrementPercent = Number.isFinite(auctionIncrementParsed)
    ? Math.max(1, auctionIncrementParsed)
    : DEFAULT_AUCTION_INCREMENT_PERCENT;
  const auctionDurationRaw = String(formData.get("auction_duration_days") ?? "").trim();
  const auctionDurationParsed = Number.parseInt(auctionDurationRaw, 10);
  const auctionDurationDays = AUCTION_DURATION_OPTIONS.includes(
    auctionDurationParsed as (typeof AUCTION_DURATION_OPTIONS)[number]
  )
    ? auctionDurationParsed
    : 7;
  const auctionEndRaw = String(formData.get("auction_end_at") ?? "").trim();
  const uploads = formData
    .getAll("images")
    .filter((file): file is File => file instanceof File && file.size > 0);

  const priceCents = parsePriceToCents(priceRaw);

  if (!sellerName) {
    redirect("/vender?error=Informe+seu+nome+real");
  }
  if (!sellerName.includes(" ")) {
    redirect("/vender?error=Informe+nome+e+sobrenome");
  }

  if (!title || !priceCents || !family) {
    redirect("/vender?error=Preencha+nome,+titulo,+preco+e+familia");
  }

  if (priceCents < MIN_LISTING_PRICE_CENTS) {
    redirect(
      `/vender?error=${encodeURIComponent(
        `Preco minimo permitido: ${formatCentsToBRL(MIN_LISTING_PRICE_CENTS)}`
      )}`
    );
  }

  let auctionEndAt: string | null = null;
  if (listingType === "auction") {
    if (auctionEndRaw) {
      const parsed = new Date(auctionEndRaw);
      if (!Number.isNaN(parsed.getTime())) {
        auctionEndAt = parsed.toISOString();
      }
    }
    if (!auctionEndAt) {
      const fallback = new Date(
        Date.now() + auctionDurationDays * 24 * 60 * 60 * 1000
      );
      auctionEndAt = fallback.toISOString();
    }
  }

  const packagePreset = resolvePackageDimensions({
    family,
  });

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      display_name: sellerName,
      payout_name: sellerName,
    })
    .eq("id", user.id);

  if (profileUpdateError) {
    redirect(`/vender?error=${encodeURIComponent(profileUpdateError.message)}`);
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      seller_user_id: user.id,
      title,
      price_cents: priceCents,
      quantity_available: quantityAvailable,
      condition,
      family,
      platform,
      model,
      description,
      listing_type: listingType || "now",
      status: "active",
      moderation_status: "pending",
      shipping_available: shippingAvailable,
      free_shipping: freeShipping,
      package_weight_grams: shippingAvailable ? packagePreset.weightGrams : null,
      package_length_cm: shippingAvailable ? packagePreset.lengthCm : null,
      package_width_cm: shippingAvailable ? packagePreset.widthCm : null,
      package_height_cm: shippingAvailable ? packagePreset.heightCm : null,
      auction_increment_percent:
        listingType === "auction" ? auctionIncrementPercent : null,
      auction_end_at: auctionEndAt,
      auction_duration_days: listingType === "auction" ? auctionDurationDays : null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/vender?error=${encodeURIComponent(error.message)}`);
  }

  if (uploads.length > 0 && listing?.id) {
    const rows: { listing_id: string; path: string; sort_order: number }[] = [];
    for (let index = 0; index < uploads.length; index += 1) {
      const file = uploads[index];
      const extension = getExtension(file.name);
      const path = `${user.id}/${listing.id}/${randomUUID()}.${extension}`;
      const fileBuffer = new Uint8Array(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, fileBuffer, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        redirect(`/vender?error=${encodeURIComponent(uploadError.message)}`);
      }

      rows.push({
        listing_id: listing.id,
        path,
        sort_order: index,
      });
    }

    const { error: insertError } = await supabase
      .from("listing_images")
      .insert(rows);

    if (insertError) {
      redirect(`/vender?error=${encodeURIComponent(insertError.message)}`);
    }

    const thumbnailPath = rows[0]?.path;
    if (thumbnailPath) {
      const publicUrl = supabase.storage
        .from("listing-images")
        .getPublicUrl(thumbnailPath).data.publicUrl;

      if (publicUrl) {
        await supabase
          .from("listings")
          .update({ thumbnail_url: publicUrl })
          .eq("id", listing.id);
      }
    }
  }

  redirect("/vender?success=Anuncio+enviado+para+moderacao");
}

async function deleteListing(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listing_id") ?? "").trim();
  if (!listingId) {
    redirect("/vender?error=Anuncio+invalido");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("listings").delete().eq("id", listingId);

  if (error) {
    redirect(`/vender?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/vender?success=Anuncio+removido");
}

async function endAuction(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listing_id") ?? "").trim();
  if (!listingId) {
    redirect("/vender?error=Anuncio+invalido");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, seller_user_id, listing_type, status")
    .eq("id", listingId)
    .single();

  if (listingError || !listing) {
    redirect("/vender?error=Anuncio+nao+encontrado");
  }

  if (listing.seller_user_id !== user.id) {
    redirect("/vender?error=Sem+permissao+para+este+anuncio");
  }

  if (listing.listing_type !== "auction") {
    redirect("/vender?error=Este+anuncio+nao+usa+lances");
  }

  if (listing.status !== "active") {
    redirect("/vender?error=Lances+ja+encerrados");
  }

  const { error } = await closeAuctionById(listingId, user.id);

  if (error) {
    redirect(`/vender?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/vender?success=Lances+encerrados");
}

async function cancelUnpaidOrder(formData: FormData) {
  "use server";

  const orderId = String(formData.get("order_id") ?? "").trim();
  if (!orderId) {
    redirect("/vender?error=Pedido+invalido");
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select(
      "id, status, payment_deadline_at, buyer_user_id, seller_user_id, mp_payment_id, listings(listing_type, title)"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    redirect("/vender?error=Pedido+nao+encontrado");
  }

  if (order.seller_user_id !== user.id) {
    redirect("/vender?error=Sem+permissao+para+este+pedido");
  }

  const orderListing = order.listings?.[0] ?? null;

  if (!orderListing || orderListing.listing_type !== "auction") {
    redirect("/vender?error=Este+pedido+nao+e+de+lances");
  }

  if (order.status !== "pending") {
    redirect("/vender?error=Este+pedido+nao+esta+pendente");
  }

  if (order.mp_payment_id) {
    redirect("/vender?error=Pagamento+ja+iniciado+para+este+pedido");
  }

  const deadline = parseDate(order.payment_deadline_at);
  if (!deadline || deadline > new Date()) {
    redirect("/vender?error=O+prazo+de+pagamento+ainda+nao+encerrou");
  }

  const nowIso = new Date().toISOString();
  const cancelReason = "Pagamento nao realizado no prazo";

  const { error: updateError } = await admin
    .from("orders")
    .update({
      status: "canceled",
      cancel_status: "approved",
      cancel_requested_by: "seller_unpaid",
      cancel_requested_at: nowIso,
      cancel_deadline_at: nowIso,
      cancel_reason: cancelReason,
    })
    .eq("id", orderId);

  if (updateError) {
    redirect(`/vender?error=${encodeURIComponent(updateError.message)}`);
  }

  if (order.buyer_user_id) {
    await admin.from("unpaid_cancellations").insert({
      order_id: orderId,
      buyer_user_id: order.buyer_user_id,
      seller_user_id: user.id,
      reason: cancelReason,
    });

    await admin.from("notifications").insert([
      {
        user_id: order.buyer_user_id,
        title: "Pedido cancelado por nao pagamento",
        body: "O vendedor cancelou este pedido apos o prazo de pagamento.",
        link: "/compras",
      },
      {
        user_id: user.id,
        title: "Pedido cancelado",
        body: `Pedido ${orderId} cancelado por nao pagamento.`,
        link: "/vender",
      },
    ]);

    const { data: admins } = await admin.from("admins").select("user_id");
    const adminIds = (admins ?? [])
      .map((row) => row.user_id)
      .filter((id): id is string => Boolean(id));
    if (adminIds.length > 0) {
      await admin.from("notifications").insert(
        adminIds.map((adminId) => ({
          user_id: adminId,
          title: "Pedido cancelado por nao pagamento",
          body: `Pedido ${orderId} cancelado por nao pagamento.`,
          link: "/painel-ganm-ols/controle",
        }))
      );
    }
  }

  redirect("/vender?success=Pedido+cancelado+por+nao+pagamento");
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Painel vendedor</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Faca login para criar anuncios e acompanhar faturamento.
          </p>
        </div>
        <Link
          href="/entrar"
          className="inline-flex rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Entrar na conta
        </Link>
      </div>
    );
  }

  await closeExpiredAuctions();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, role, payout_method, payout_pix_key, payout_bank_name, payout_bank_agency, payout_bank_account, payout_bank_account_type, payout_doc, payout_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  const { data: mpAccount } = await createAdminClient()
    .from("seller_payment_accounts")
    .select("mp_user_id, token_expires_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const displayName =
    profile?.display_name?.trim() || user.email?.split("@")[0] || "Usuario";
  const isSeller = profile?.role === "seller";
  const debug = resolvedSearchParams?.debug === "1";
  const payoutMethod = profile?.payout_method ?? "";
  const mpConnected = Boolean(mpAccount?.mp_user_id);
  const payoutLabel =
    payoutMethod === "pix"
      ? `Pix (${profile?.payout_pix_key || "Chave nao informada"})`
      : payoutMethod === "bank"
        ? `Banco ${profile?.payout_bank_name || "Nao informado"}`
      : "Nao configurado";
  const defaultAuctionEnd = formatDateTimeLocal(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const { data: listingsData } = isSeller
    ? await supabase
        .from("listings")
        .select(
          "id, title, price_cents, status, moderation_status, platform, created_at, thumbnail_url, listing_type, auction_end_at, auction_increment_percent, auction_closed_at, auction_winner_user_id, auction_order_id"
        )
        .eq("seller_user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] as ListingRow[] };

  const { data: ordersData, error: ordersError } = isSeller
    ? await createAdminClient()
        .from("orders")
        .select(
          "id, listing_id, buyer_user_id, amount_cents, fee_cents, shipping_cost_cents, shipping_paid_by, shipping_service_name, status, mp_payment_id, created_at, approved_at, delivered_at, available_at, buyer_approval_deadline_at, payment_deadline_at, payout_status, payout_requested_at, superfrete_id, superfrete_status, superfrete_print_url, cancel_status, cancel_requested_by, cancel_requested_at, cancel_deadline_at, cancel_reason, listings(title, thumbnail_url, listing_type)"
        )
        .eq("seller_user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] as OrderRow[], error: null };

  const listings = (listingsData ?? []) as ListingRow[];
  const orders = (ordersData ?? []) as OrderRow[];
  const now = new Date();
  const payoutRequested = new Set(["requested", "paid"]);
  const enrichedOrders = orders.map((order) => {
    const availableAt = resolveAvailableAt(order);
    const netCents = computeNetCents(order);
    const isPayoutRequested =
      order.payout_status !== null && payoutRequested.has(order.payout_status);
    const isReleased = Boolean(availableAt && availableAt <= now);
    return {
      ...order,
      availableAt,
      netCents,
      isPayoutRequested,
      isReleased,
    };
  });
  const adminDebug =
    debug && user
      ? await createAdminClient()
          .from("orders")
          .select("id, status", { count: "exact", head: false })
          .eq("seller_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
      : null;
  const approvedOrders = enrichedOrders.filter(
    (order) => order.status === "approved"
  );
  const pendingOrders = enrichedOrders.filter((order) => order.status === "pending");
  const totalOrders = approvedOrders.length;
  const totalOrdersAll = orders.length;
  const totalRevenue =
    approvedOrders.reduce((sum, order) => sum + (order.amount_cents ?? 0), 0) ??
    0;
  const totalFees =
    approvedOrders.reduce((sum, order) => sum + (order.fee_cents ?? 0), 0) ?? 0;
  const pendingAuctionOrders = enrichedOrders.filter((order) => {
    if (order.status !== "pending") {
      return false;
    }
    return order.listings?.listing_type === "auction";
  });
  const prioritizedOrders = [
    ...pendingAuctionOrders,
    ...approvedOrders,
    ...enrichedOrders,
  ];
  const seenOrderIds = new Set<string>();
  const recentOrders = prioritizedOrders.filter((order) => {
    if (seenOrderIds.has(order.id)) {
      return false;
    }
    seenOrderIds.add(order.id);
    return true;
  });
  const pendingSuperfreteIds = approvedOrders
    .filter(
      (order) =>
        order.superfrete_id &&
        (!order.superfrete_print_url || order.superfrete_status !== "released")
    )
    .map((order) => order.id);

  const availableBalance = enrichedOrders.reduce((sum, order) => {
    if (order.status !== "approved") {
      return sum;
    }
    if (order.isPayoutRequested) {
      return sum;
    }
    if (!order.availableAt) {
      return sum;
    }
    if (!order.isReleased) {
      return sum;
    }
    return sum + order.netCents;
  }, 0);

  const holdBalance = enrichedOrders.reduce((sum, order) => {
    if (order.status !== "approved") {
      return sum;
    }
    if (order.isPayoutRequested) {
      return sum;
    }
    if (!order.availableAt) {
      return sum;
    }
    if (order.isReleased) {
      return sum;
    }
    return sum + order.netCents;
  }, 0);

  const payoutMethodConfigured = Boolean(profile?.payout_method);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Painel vendedor
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Ola, {displayName}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Gerencie anuncios e seu faturamento.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/vender"
            className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
          >
            Painel
          </Link>
          <Link
            href="/vender/planos"
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Planos
          </Link>
        </div>
      </div>

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
      {debug ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p>Debug: {user.email} ({user.id}) role={profile?.role ?? "n/a"}</p>
          <p>Pedidos carregados: {orders.length}</p>
          {orders[0] ? (
            <p>Ultimo pedido: {orders[0].id} ({orders[0].status})</p>
          ) : null}
          {ordersError ? <p>Erro orders: {ordersError.message}</p> : null}
          {adminDebug ? (
            <p>
              Admin total: {adminDebug.count ?? 0}{" "}
              {adminDebug.data?.[0]
                ? `| Ultimo (admin): ${adminDebug.data[0].id} (${adminDebug.data[0].status})`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {!isSeller ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Seu perfil esta como comprador
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Ative o perfil de vendedor para publicar anuncios.
          </p>
          <form action={upgradeToSeller} className="mt-4">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Virar vendedor
            </button>
          </form>
        </div>
      ) : (
        <>
          <AutoRefreshSuperfrete orderIds={pendingSuperfreteIds} />
          <section className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Anuncios ativos", value: listings.length },
              { label: "Vendas aprovadas", value: totalOrders },
              { label: "Vendas pendentes", value: pendingOrders.length },
              { label: "Saldo disponivel", value: formatCentsToBRL(availableBalance) },
              { label: "Vendas totais", value: totalOrdersAll },
              { label: "Em garantia", value: formatCentsToBRL(holdBalance) },
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

          <section className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Faturamento total", value: formatCentsToBRL(totalRevenue) },
              { label: "Comissao GANM OLS", value: formatCentsToBRL(totalFees) },
              {
                label: "Repasse em",
                value: `${BUYER_APPROVAL_DAYS} dias`,
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

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Criar anuncio
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Preencha os detalhes para publicar seu produto.
                </p>
              </div>
              <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500">
                Repasse em {BUYER_APPROVAL_DAYS} dias apos entrega
              </span>
            </div>
            <form
              action={createListing}
              className="mt-6 space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Nome real do vendedor
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                    name="seller_name"
                    placeholder="Ex: Joao Silva"
                    defaultValue={profile?.display_name ?? ""}
                    required
                  />
                  <p className="text-xs text-zinc-500">
                    Este nome aparece para o comprador e no cadastro do vendedor.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Titulo
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                    name="title"
                    placeholder="Ex: Super Nintendo completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Preco
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                    name="price"
                    placeholder="Ex: R$ 980,00"
                    required
                  />
                  <p className="text-xs text-zinc-500">
                    Preco minimo: {formatCentsToBRL(MIN_LISTING_PRICE_CENTS)}.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Quantidade disponivel
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                    name="quantity_available"
                    type="number"
                    min={1}
                    defaultValue={1}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Condicao
                  </label>
                  <select
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700"
                    name="condition"
                  >
                    {[
                      "Novo",
                      "Usado",
                      "Revisado",
                      "Colecionavel",
                    ].map((option) => (
                      <option key={option} value={option.toLowerCase()}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Plataforma
                  </label>
                  <select
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700"
                    name="family"
                    required
                  >
                    <option value="">Selecione</option>
                    {FAMILIES.map((family) => (
                      <option key={family.slug} value={family.slug}>
                        {family.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Plataforma
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                    name="platform"
                    placeholder="Ex: PlayStation 2"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Modelo
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                    name="model"
                    placeholder="Edicao especial, bundle, etc"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Tipo de venda
                  </label>
                  <select
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700"
                    name="listing_type"
                    defaultValue="now"
                  >
                    <option value="now">Venda imediata</option>
                    <option value="auction">Lance programado</option>
                  </select>
                  <p className="text-xs text-zinc-500">
                    Use Lances para receber ofertas acima do preco base.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Incremento de lance (%)
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                    name="auction_increment_percent"
                    defaultValue={DEFAULT_AUCTION_INCREMENT_PERCENT}
                    placeholder="Ex: 25"
                  />
                  <p className="text-xs text-zinc-500">
                    Aplicado no primeiro lance e nos proximos.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Duracao dos lances (dias)
                  </label>
                  <select
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700"
                    name="auction_duration_days"
                    defaultValue={7}
                  >
                    {AUCTION_DURATION_OPTIONS.map((days) => (
                      <option key={days} value={days}>
                        {days} {days === 1 ? "dia" : "dias"}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500">
                    Encerramento rigido no prazo definido.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700">
                    Encerramento dos lances
                  </label>
                  <input
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                    type="datetime-local"
                    name="auction_end_at"
                    defaultValue={defaultAuctionEnd}
                  />
                  <p className="text-xs text-zinc-500">
                    Se vazio, o sistema usa a duracao selecionada acima.
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-3 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      name="free_shipping"
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    Oferecer frete gratis
                  </label>
                  <p className="text-xs text-zinc-500">
                    Se voce marcar frete gratis, o custo do envio sera
                    descontado da sua venda.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-700">
                  Descricao
                </label>
                <textarea
                  className="min-h-[140px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  name="description"
                  placeholder="Descreva detalhes, itens inclusos e estado."
                />
              </div>

              <ImageUploadField name="images" />

              <button
                type="submit"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
              >
                Publicar anuncio
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Recebimentos do vendedor
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Repasse liberado {BUYER_APPROVAL_DAYS} dias apos a entrega.
                </p>
              </div>
              <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500">
                Metodo: {payoutLabel}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Mercado Pago
                </p>
                <p className="mt-2 text-sm">
                  {mpConnected
                    ? "Conectado e pronto para repasses automaticos."
                    : "Conecte para receber pagamentos automaticamente."}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  O prazo de liberacao segue as regras do Mercado Pago.
                </p>
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {!mpConnected ? (
                  <a
                    href="https://mpago.li/2GnavTh"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                  >
                    Criar conta Mercado Pago
                  </a>
                ) : null}
                <Link
                  href="/api/mercadopago/connect"
                  className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                >
                  {mpConnected ? "Reconectar" : "Conectar para receber pagamentos"}
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Saldo disponivel
                </p>
                <p className="mt-2 text-xl font-semibold text-zinc-900">
                  {formatCentsToBRL(availableBalance)}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Taxa GANM OLS: 10% por venda aprovada.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Em garantia
                </p>
                <p className="mt-2 text-xl font-semibold text-zinc-900">
                  {formatCentsToBRL(holdBalance)}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Liberado automaticamente apos o periodo de seguranca.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/conta"
                className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
              >
                Configurar recebimento
              </Link>
              <form action="/api/payouts/request" method="post">
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
                  disabled={!payoutMethodConfigured || availableBalance <= 0}
                >
                  Solicitar saque
                </button>
              </form>
              {!payoutMethodConfigured ? (
                <span className="text-xs text-rose-600">
                  Configure um metodo para receber.
                </span>
              ) : null}
              {availableBalance <= 0 ? (
                <span className="text-xs text-zinc-500">
                  Sem saldo disponivel no momento.
                </span>
              ) : null}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                Seus anuncios
              </h2>
              <span className="text-sm text-zinc-500">
                Total: {listings.length}
              </span>
            </div>
            <div className="grid gap-4">
              {listings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                  Nenhum anuncio criado ainda.
                </div>
              ) : (
                listings.map((listing) => (
                  <div
                    key={String(listing.id)}
                    className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-20 w-20 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                        {listing.thumbnail_url ? (
                          <img
                            src={listing.thumbnail_url}
                            alt={listing.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                            Sem foto
                          </div>
                        )}
                      </div>
                      <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        {listing.platform || "Sem plataforma"}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {listing.title}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {formatCentsToBRL(listing.price_cents as number)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {listing.listing_type === "auction"
                          ? `Lance encerra em ${formatDateTime(
                              listing.auction_end_at ?? null
                            )}`
                          : "Venda imediata"}
                      </p>
                      <Link
                        href={`/anuncio/${listing.id}`}
                        className="mt-3 inline-flex rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
                      >
                        Ver detalhes
                      </Link>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {listing.moderation_status &&
                      listing.moderation_status !== "approved" ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                          Em moderacao
                        </span>
                      ) : (
                        <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500">
                          {String(listing.status ?? "active")}
                        </span>
                      )}
                      <form action={deleteListing}>
                        <input
                          type="hidden"
                          name="listing_id"
                          value={String(listing.id)}
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                        >
                          Remover
                        </button>
                      </form>
                      {listing.listing_type === "auction" &&
                      listing.status === "active" ? (
                        <form action={endAuction}>
                          <input
                            type="hidden"
                            name="listing_id"
                            value={String(listing.id)}
                          />
                          <button
                            type="submit"
                            className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700"
                          >
                            Encerrar lances
                          </button>
                        </form>
                      ) : null}
                    </div>
                    <form
                      action="/api/listings/images"
                      method="post"
                      encType="multipart/form-data"
                      className="w-full border-t border-zinc-100 pt-4 md:border-0 md:pt-0"
                    >
                      <input
                        type="hidden"
                        name="listing_id"
                        value={String(listing.id)}
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="file"
                          name="images"
                          accept="image/*"
                          multiple
                          className="text-xs text-zinc-600"
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                        >
                          Enviar fotos
                        </button>
                      </div>
                    </form>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                Pedidos recentes
              </h2>
              <span className="text-sm text-zinc-500">
                Total: {orders.length}
              </span>
            </div>
            <div className="grid gap-4">
              {recentOrders.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                  Nenhuma venda registrada ainda.
                </div>
              ) : (
                recentOrders.slice(0, 6).map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                        {order.listings?.thumbnail_url ? (
                          <img
                            src={order.listings.thumbnail_url}
                            alt={order.listings.title ?? "Pedido"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                            Sem foto
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                          {order.status === "approved"
                            ? "Pedido aprovado"
                            : "Pedido pendente"}
                        </p>
                        <h3 className="mt-2 text-base font-semibold text-zinc-900">
                          {order.listings?.title ?? "Venda confirmada"}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-600">
                          {formatCentsToBRL(order.amount_cents ?? 0)}
                        </p>
                        {order.status === "approved" ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            Liquido: {formatCentsToBRL(order.netCents ?? 0)}
                          </p>
                        ) : null}
                        {order.status === "pending" && order.payment_deadline_at ? (
                          <p className="mt-1 text-xs text-amber-600">
                            Pagamento ate: {formatDateTime(order.payment_deadline_at)}
                          </p>
                        ) : null}
                        {order.status === "approved" && order.availableAt ? (
                          <p
                            className={`mt-1 text-xs ${
                              order.isReleased ? "text-emerald-600" : "text-amber-600"
                            }`}
                          >
                            {order.isReleased
                              ? `Liberado em ${formatDate(order.availableAt)}`
                              : `A liberar em ${formatDate(order.availableAt)}`}
                          </p>
                        ) : null}
                        {order.isPayoutRequested && order.payout_requested_at ? (
                          <p className="mt-1 text-xs text-emerald-600">
                            Saque solicitado em {formatDateTime(order.payout_requested_at)}
                          </p>
                        ) : null}
                        {order.shipping_service_name ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            Frete: {order.shipping_service_name}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500">
                        {String(order.status ?? "pending")}
                      </span>
                      <Link
                        href={`/vender/vendas/${order.id}`}
                        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        Detalhes
                      </Link>
                      {order.status === "pending" &&
                      order.listings?.listing_type === "auction" ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                          Aguardando pagamento ({AUCTION_PAYMENT_WINDOW_DAYS} dias)
                        </span>
                      ) : null}
                      {order.status !== "cancelled" &&
                      order.status !== "canceled" &&
                      order.cancel_status !== "requested" &&
                      order.cancel_status !== "approved" &&
                      order.superfrete_print_url ? (
                        <a
                          href={order.superfrete_print_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                        >
                          Imprimir etiqueta
                        </a>
                      ) : (
                        <>
                          {order.status === "cancelled" ||
                          order.status === "canceled" ||
                          order.cancel_status === "approved" ? (
                            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700">
                              Pedido cancelado
                            </span>
                          ) : (
                            <>
                              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                                Etiqueta pendente
                              </span>
                              {order.superfrete_id ? (
                                <form action="/api/superfrete/refresh" method="post">
                                  <input
                                    type="hidden"
                                    name="order_id"
                                    value={order.id}
                                  />
                                  <button
                                    type="submit"
                                    className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                                  >
                                    Atualizar etiqueta
                                  </button>
                                </form>
                              ) : null}
                            </>
                          )}
                        </>
                      )}
                      {order.superfrete_status === "released" &&
                      !order.superfrete_print_url ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                          Etiqueta liberada
                        </span>
                      ) : null}
                      {order.cancel_status === "requested" ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                          Cancelamento solicitado
                        </span>
                      ) : null}
                      {(() => {
                        const deadline = parseDate(order.payment_deadline_at);
                        const deadlinePassed =
                          deadline && deadline <= now && !order.mp_payment_id;
                        const canCancel =
                          order.status === "pending" &&
                          order.listings?.listing_type === "auction" &&
                          Boolean(deadlinePassed);
                        if (!canCancel) {
                          return null;
                        }
                        return (
                          <form action={cancelUnpaidOrder}>
                            <input type="hidden" name="order_id" value={order.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700"
                            >
                              Cancelar por nao pagamento
                            </button>
                          </form>
                        );
                      })()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">
                Historico de vendas
              </h2>
              <span className="text-sm text-zinc-500">
                Aprovadas: {approvedOrders.length}
              </span>
            </div>
            <div className="grid gap-3">
              {approvedOrders.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                  Suas vendas aprovadas vao aparecer aqui.
                </div>
              ) : (
                approvedOrders.slice(0, 20).map((order) => (
                  <div
                    key={`history-${order.id}`}
                    className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Venda #{order.id.slice(0, 8)}
                      </p>
                      <h3 className="mt-1 text-sm font-semibold text-zinc-900">
                        {order.listings?.title ?? "Venda confirmada"}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        Aprovado em: {formatDateTime(order.approved_at)}
                      </p>
                      {order.availableAt ? (
                        <p
                          className={`mt-1 text-xs ${
                            order.isReleased ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {order.isReleased
                            ? `Liberado em ${formatDate(order.availableAt)}`
                            : `A liberar em ${formatDate(order.availableAt)}`}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                        Liquido: {formatCentsToBRL(order.netCents ?? 0)}
                      </div>
                      <Link
                        href={`/vender/vendas/${order.id}`}
                        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        Ver detalhes
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
