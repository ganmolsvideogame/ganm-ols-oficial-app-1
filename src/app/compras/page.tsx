import Link from "next/link";

import AutoRefreshSuperfrete from "@/components/orders/AutoRefreshSuperfrete";
import { AUCTION_PAYMENT_WINDOW_DAYS, closeExpiredAuctions } from "@/lib/auctions";
import { BUYER_APPROVAL_DAYS, CANCEL_REASONS } from "@/lib/config/commerce";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  listing_id: string;
  amount_cents: number | null;
  status: string | null;
  mp_payment_id?: string | null;
  shipping_status?: string | null;
  shipping_service_name?: string | null;
  shipping_estimated_days?: number | null;
  superfrete_tracking?: string | null;
  superfrete_id?: string | null;
  superfrete_status?: string | null;
  superfrete_print_url?: string | null;
  cancel_status?: string | null;
  cancel_requested_by?: string | null;
  cancel_requested_at?: string | null;
  cancel_deadline_at?: string | null;
  cancel_reason?: string | null;
  delivered_at?: string | null;
  buyer_approval_deadline_at?: string | null;
  payment_deadline_at?: string | null;
  created_at: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  listing_type?: string | null;
};

type SearchParams = {
  status?: string;
  order_id?: string;
  debug?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }
  return date.toLocaleDateString("pt-BR");
}

function formatStatus(value: string | null) {
  if (!value) {
    return "Status pendente";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function formatPaymentStatus(status: string | null, paymentId?: string | null) {
  if (status === "pending" && !paymentId) {
    return "Continue seu pedido.";
  }
  if (status === "pending") {
    return "Pagamento pendente.";
  }
  if (status === "approved") {
    return "Pagamento aprovado.";
  }
  if (status === "rejected") {
    return "Pagamento recusado.";
  }
  return "Status do pagamento em atualizacao.";
}

function formatShippingStatus(
  orderStatus: string | null,
  shippingStatus: string | null
) {
  if (orderStatus !== "approved") {
    return "Aguardando aprovacao do pagamento.";
  }
  if (!shippingStatus || shippingStatus === "pending") {
    return "O vendedor esta preparando o seu pacote.";
  }
  if (shippingStatus === "shipped") {
    return "Pedido enviado.";
  }
  if (shippingStatus === "delivered") {
    return "Pedido entregue.";
  }
  if (shippingStatus === "cancelled") {
    return "Pedido cancelado.";
  }
  return "Atualizacao em andamento.";
}

function formatBanner(status: string | null) {
  if (status === "approved") {
    return {
      title: "Pagamento aprovado",
      description: "Tudo certo! Seu pedido foi confirmado.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }
  if (status === "pending") {
    return {
      title: "Pagamento pendente",
      description: "Aguardando a confirmacao do pagamento.",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  if (status === "rejected") {
    return {
      title: "Pagamento recusado",
      description: "O pagamento nao foi aprovado. Tente novamente.",
      tone: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }
  return null;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const bannerStatus = resolvedSearchParams?.status ?? null;
  const banner = bannerStatus ? formatBanner(bannerStatus) : null;
  const highlightOrderId = String(resolvedSearchParams?.order_id ?? "").trim();
  const debug = resolvedSearchParams?.debug === "1";
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">Compras</h1>
          <p className="text-sm text-zinc-600">
            Entre na conta para ver seus pedidos.
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

  const { data: ordersData, error: ordersError } = await admin
    .from("orders")
    .select(
      "id, listing_id, amount_cents, status, mp_payment_id, shipping_status, shipping_service_name, shipping_estimated_days, superfrete_tracking, superfrete_id, superfrete_status, superfrete_print_url, cancel_status, cancel_requested_by, cancel_requested_at, cancel_deadline_at, cancel_reason, delivered_at, buyer_approval_deadline_at, payment_deadline_at, created_at"
    )
    .eq("buyer_user_id", user.id)
    .order("created_at", { ascending: false });

  const orders = (ordersData ?? []) as OrderRow[];
  const adminDebug =
    debug && user
      ? await admin
          .from("orders")
          .select("id, status", { count: "exact", head: false })
          .eq("buyer_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
      : null;
  const listingIds = orders.map((order) => order.listing_id);

  const { data: listingsData } =
    listingIds.length > 0
      ? await admin
          .from("listings")
          .select("id, title, listing_type")
          .in("id", listingIds)
      : { data: [] };

  const listings = (listingsData ?? []) as ListingRow[];
  const listingMap = new Map(listings.map((item) => [item.id, item]));
  const pendingSuperfreteIds = orders
    .filter(
      (order) =>
        order.superfrete_id &&
        order.status === "approved" &&
        (!order.superfrete_print_url || order.superfrete_status !== "released")
    )
    .map((order) => order.id);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Compras</h1>
        <p className="text-sm text-zinc-600">
          Acompanhe suas compras e historico de pedidos.
        </p>
      </div>

      {banner ? (
        <div className={`rounded-3xl border p-6 text-sm ${banner.tone}`}>
          <h2 className="text-xl font-semibold">{banner.title}</h2>
          <p className="mt-2">{banner.description}</p>
        </div>
      ) : null}
      {debug && user ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <p>Debug: {user.email} ({user.id})</p>
          <p>Pedidos carregados: {orders.length}</p>
          {orders[0] ? (
            <p>Ultimo pedido: {orders[0].id} ({orders[0].status})</p>
          ) : null}
          {ordersError ? (
            <p>Erro orders: {ordersError.message}</p>
          ) : null}
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
      <AutoRefreshSuperfrete orderIds={pendingSuperfreteIds} />

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            Nenhum pedido registrado ainda.
          </div>
        ) : (
          orders.map((order) => {
            const listing = listingMap.get(order.listing_id);
            const title = listing?.title ?? "Anuncio";
            const isAuctionOrder = listing?.listing_type === "auction";
            const paymentDeadline = parseDate(order.payment_deadline_at);
            const paymentExpired =
              paymentDeadline && paymentDeadline <= new Date();
            const deliveryDeadline = order.buyer_approval_deadline_at
              ? new Date(order.buyer_approval_deadline_at)
              : order.delivered_at
                ? new Date(
                    new Date(order.delivered_at).getTime() +
                      BUYER_APPROVAL_DAYS * 24 * 60 * 60 * 1000
                  )
                : null;
            const withinDeliveryWindow = deliveryDeadline
              ? deliveryDeadline >= new Date()
              : false;
            const canRequestCancel =
              order.status !== "cancelled" &&
              order.status !== "canceled" &&
              order.cancel_status !== "requested" &&
              (order.shipping_status !== "shipped" &&
                (order.shipping_status !== "delivered" || withinDeliveryWindow));

            return (
              <div
              key={order.id}
              className={`rounded-3xl border bg-white p-6 shadow-sm ${
                highlightOrderId === order.id
                  ? "border-emerald-300 ring-2 ring-emerald-200"
                  : "border-zinc-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Pedido {order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    {formatStatus(order.status)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatPaymentStatus(order.status, order.mp_payment_id)}
                  </p>
                  {order.status === "pending" && order.payment_deadline_at ? (
                    <p className="mt-1 text-xs text-amber-600">
                      Pagamento ate: {formatDate(order.payment_deadline_at)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatShippingStatus(
                      order.status,
                      order.shipping_status ?? null
                    )}
                  </p>
                  {order.shipping_service_name ? (
                    <p className="mt-1 text-xs text-zinc-500">
                      Frete: {order.shipping_service_name}
                      {order.shipping_estimated_days
                        ? ` • ${order.shipping_estimated_days} dias`
                        : ""}
                    </p>
                  ) : null}
                  {order.superfrete_tracking ? (
                    <p className="mt-1 text-xs text-zinc-600">
                      Codigo de rastreio: {order.superfrete_tracking}
                    </p>
                  ) : null}
                  {order.superfrete_status === "released" &&
                  !order.superfrete_tracking ? (
                    <p className="mt-1 text-xs text-emerald-700">
                      Etiqueta liberada para postagem.
                    </p>
                  ) : null}
                  {order.status === "cancelled" || order.status === "canceled" ? (
                    <p className="mt-2 text-xs text-rose-700">
                      Pedido cancelado.
                    </p>
                  ) : order.cancel_status === "requested" ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Cancelamento em analise.
                    </p>
                  ) : null}
                  {order.status === "pending" && isAuctionOrder ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      O pagamento deve ser concluido em ate {AUCTION_PAYMENT_WINDOW_DAYS} dias.
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">
                    {formatDate(order.created_at)}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-zinc-900">
                    {formatCentsToBRL(order.amount_cents ?? 0)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/produto/${order.listing_id}`}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  Ver detalhes
                </Link>
                <Link
                  href="/contato?assunto=pedido"
                  className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                >
                  Suporte
                </Link>
                {order.status === "pending" && isAuctionOrder ? (
                  <Link
                    href={`/checkout/lances?order_id=${order.id}`}
                    className={`rounded-full px-4 py-2 text-xs font-semibold ${
                      paymentExpired
                        ? "border border-amber-200 text-amber-700"
                        : "bg-zinc-900 text-white"
                    }`}
                  >
                    {paymentExpired ? "Prazo encerrado" : "Pagar agora"}
                  </Link>
                ) : null}
                {canRequestCancel ? (
                  <form
                    action="/api/orders/cancel/request"
                    method="post"
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="order_id" value={order.id} />
                    <select
                      name="reason"
                      required
                      className="rounded-full border border-zinc-200 px-3 py-2 text-xs text-zinc-700"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecione o motivo
                      </option>
                      {CANCEL_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700"
                    >
                      Cancelar compra
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
