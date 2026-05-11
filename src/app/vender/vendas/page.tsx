import Link from "next/link";
import { redirect } from "next/navigation";

import AutoRefreshPayments from "@/components/orders/AutoRefreshPayments";
import AutoRefreshSuperfrete from "@/components/orders/AutoRefreshSuperfrete";
import { AUCTION_PAYMENT_WINDOW_DAYS } from "@/lib/auctions";
import { BUYER_APPROVAL_DAYS } from "@/lib/config/commerce";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildSuperfretePrintUrl } from "@/lib/superfrete/print-url";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

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
  mp_preference_id?: string | null;
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
  superfrete_last_error?: string | null;
  cancel_status?: string | null;
  listings?: {
    title?: string | null;
    thumbnail_url?: string | null;
    listing_type?: string | null;
  } | null;
};

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

function resolveSuperfretePrintUrl(order: {
  superfrete_id?: string | null;
  superfrete_print_url?: string | null;
}) {
  return (
    buildSuperfretePrintUrl(order.superfrete_id) ||
    order.superfrete_print_url ||
    null
  );
}

function formatSuperfreteError(message?: string | null) {
  if (!message) {
    return null;
  }
  if (
    message.includes("Sem saldo na carteira") ||
    message.toLowerCase().includes("saldo")
  ) {
    return "Etiqueta pendente: sem saldo na carteira SuperFrete.";
  }
  if (message.length > 180) {
    return `${message.slice(0, 180)}...`;
  }
  return message;
}

export default async function SellerSalesPage() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect_to=${encodeURIComponent("/vender/vendas")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seller") {
    redirect("/vender");
  }

  const { data: ordersData, error } = await admin
    .from("orders")
    .select(
      "id, listing_id, buyer_user_id, amount_cents, fee_cents, shipping_cost_cents, shipping_paid_by, shipping_service_name, status, mp_payment_id, mp_preference_id, created_at, approved_at, delivered_at, available_at, buyer_approval_deadline_at, payment_deadline_at, payout_status, payout_requested_at, superfrete_id, superfrete_status, superfrete_print_url, superfrete_last_error, cancel_status, listings(title, thumbnail_url, listing_type)"
    )
    .eq("seller_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    redirect(`/vender?error=${encodeURIComponent(error.message)}`);
  }

  const now = new Date();
  const orders = (ordersData ?? []) as OrderRow[];
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

  const approvedOrders = enrichedOrders.filter(
    (order) => order.status === "approved"
  );
  const pendingOrders = enrichedOrders.filter((order) => order.status === "pending");
  const pendingSuperfreteIds = approvedOrders
    .filter(
      (order) =>
        order.superfrete_id &&
        (!resolveSuperfretePrintUrl(order) || order.superfrete_status !== "released")
    )
    .map((order) => order.id);
  const pendingPaymentOrderIds = enrichedOrders
    .filter(
      (order) =>
        order.status === "pending" &&
        !order.mp_payment_id &&
        Boolean(order.mp_preference_id)
    )
    .map((order) => order.id);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Vendas
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Minhas vendas
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Acompanhe pedidos aprovados, pendentes e etiquetas.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/vender"
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Painel
          </Link>
          <span className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white">
            Vendas
          </span>
          <Link
            href="/vender/planos"
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Planos
          </Link>
        </div>
      </div>

      <AutoRefreshPayments orderIds={pendingPaymentOrderIds} />
      <AutoRefreshSuperfrete orderIds={pendingSuperfreteIds} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Pedidos</h2>
          <span className="text-sm text-zinc-500">
            Total: {enrichedOrders.length} • Aprovados: {approvedOrders.length} •
            Pendentes: {pendingOrders.length}
          </span>
        </div>

        <div className="grid gap-4">
          {enrichedOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhuma venda registrada ainda.
            </div>
          ) : (
            enrichedOrders.map((order) => (
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
                  resolveSuperfretePrintUrl(order) &&
                  order.superfrete_status === "released" ? (
                    <a
                      href={resolveSuperfretePrintUrl(order) ?? "#"}
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
                  !resolveSuperfretePrintUrl(order) ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                      Etiqueta liberada
                    </span>
                  ) : null}

                  {order.superfrete_last_error ? (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700">
                      {formatSuperfreteError(order.superfrete_last_error)}
                    </span>
                  ) : null}

                  {order.cancel_status === "requested" ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                      Cancelamento solicitado
                    </span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

