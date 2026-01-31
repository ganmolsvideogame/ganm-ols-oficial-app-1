import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCentsToBRL } from "@/lib/utils/price";
import { BUYER_APPROVAL_DAYS } from "@/lib/config/commerce";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

type OrderEventRow = {
  id: string;
  status: string | null;
  note: string | null;
  created_at: string | null;
};

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

function formatDateTime(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) {
    return "Sem data";
  }
  return date.toLocaleString("pt-BR");
}

function resolveAvailableAt(order: {
  available_at?: string | null;
  buyer_approval_deadline_at?: string | null;
  delivered_at?: string | null;
}) {
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

function computeNetCents(order: {
  amount_cents: number | null;
  fee_cents: number | null;
  shipping_paid_by?: string | null;
  shipping_cost_cents?: number | null;
}) {
  const baseNet = (order.amount_cents ?? 0) - (order.fee_cents ?? 0);
  const shippingCharge =
    order.shipping_paid_by === "seller"
      ? Math.max(0, order.shipping_cost_cents ?? 0)
      : 0;
  const net = baseNet - shippingCharge;
  return Math.max(0, net);
}

export default async function SellerOrderDetailsPage({ params }: PageProps) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const orderId = params.id;
  if (!orderId) {
    redirect("/vender?error=Pedido+invalido");
  }

  const { data: order, error } = await admin
    .from("orders")
    .select(
      "id, listing_id, buyer_user_id, seller_user_id, amount_cents, fee_cents, shipping_cost_cents, shipping_paid_by, shipping_service_name, status, created_at, approved_at, delivered_at, available_at, buyer_approval_deadline_at, payment_deadline_at, payout_status, payout_requested_at, shipping_status, shipping_provider, shipping_tracking, shipping_label_url, superfrete_id, superfrete_status, superfrete_print_url, cancel_status, cancel_requested_by, cancel_requested_at, cancel_deadline_at, cancel_reason, listings(title, thumbnail_url, listing_type)"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    redirect("/vender?error=Pedido+nao+encontrado");
  }

  if (order.seller_user_id !== user.id) {
    redirect("/vender?error=Sem+permissao+para+este+pedido");
  }

  const { data: eventsData } = await admin
    .from("order_events")
    .select("id, status, note, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const events = (eventsData ?? []) as OrderEventRow[];

  const { data: buyerProfile } = order.buyer_user_id
    ? await admin
        .from("profiles")
        .select("id, display_name, email")
        .eq("id", order.buyer_user_id)
        .maybeSingle()
    : { data: null };

  const availableAt = resolveAvailableAt(order);
  const netCents = computeNetCents(order);
  const isReleased = Boolean(availableAt && availableAt <= new Date());
  const orderListing = order.listings?.[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Venda
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            Detalhes do pedido
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Pedido #{order.id.slice(0, 8)}
          </p>
        </div>
        <Link
          href="/vender"
          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
        >
          Voltar ao painel
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Status
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {order.status ?? "pending"}
          </p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Bruto
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {formatCentsToBRL(order.amount_cents ?? 0)}
          </p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Taxa
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {formatCentsToBRL(order.fee_cents ?? 0)}
          </p>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Liquido
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-900">
            {formatCentsToBRL(netCents)}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Liberacao do repasse
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              O valor e liberado {BUYER_APPROVAL_DAYS} dias apos a entrega.
            </p>
          </div>
          <div
            className={`rounded-2xl border px-4 py-2 text-xs font-semibold ${
              isReleased
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {availableAt
              ? isReleased
                ? `Liberado em ${formatDate(availableAt)}`
                : `A liberar em ${formatDate(availableAt)}`
              : "Aguardando entrega"}
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Entregue em
            </p>
            <p className="mt-2 font-semibold text-zinc-900">
              {formatDateTime(order.delivered_at)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Data de liberacao
            </p>
            <p className="mt-2 font-semibold text-zinc-900">
              {availableAt ? formatDate(availableAt) : "Sem previsao"}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Saque
            </p>
            <p className="mt-2 font-semibold text-zinc-900">
              {order.payout_status ?? "nao solicitado"}
            </p>
            {order.payout_requested_at ? (
              <p className="mt-1 text-xs text-zinc-500">
                Solicitado em {formatDateTime(order.payout_requested_at)}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-900">Resumo da venda</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[96px_1fr]">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              {orderListing?.thumbnail_url ? (
                <img
                  src={orderListing.thumbnail_url}
                  alt={orderListing.title ?? "Produto"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                  Sem foto
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm text-zinc-600">
              <p className="text-base font-semibold text-zinc-900">
                {orderListing?.title ?? "Produto"}
              </p>
              <p>
                Tipo: {orderListing?.listing_type === "auction" ? "Lance" : "Venda"}
              </p>
              <p>Pedido criado em: {formatDateTime(order.created_at)}</p>
              <p>Aprovado em: {formatDateTime(order.approved_at)}</p>
              {order.payment_deadline_at ? (
                <p>Pagamento ate: {formatDateTime(order.payment_deadline_at)}</p>
              ) : null}
              {buyerProfile ? (
                <p>
                  Comprador: {buyerProfile.display_name || buyerProfile.email || "Usuario"}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Envio</h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-600">
            <p>Status do envio: {order.shipping_status ?? "pendente"}</p>
            <p>Servico: {order.shipping_service_name ?? "Nao informado"}</p>
            {order.shipping_provider ? <p>Transportadora: {order.shipping_provider}</p> : null}
            {order.shipping_tracking ? <p>Rastreio: {order.shipping_tracking}</p> : null}
            {order.superfrete_status ? <p>Superfrete: {order.superfrete_status}</p> : null}
          </div>
          {order.superfrete_print_url ? (
            <a
              href={order.superfrete_print_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
            >
              Imprimir etiqueta
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Linha do tempo</h2>
        <div className="mt-4 space-y-3">
          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
              Ainda nao ha eventos registrados para este pedido.
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  {event.status ?? "evento"}
                </p>
                <p className="mt-1 font-medium text-zinc-900">
                  {formatDateTime(event.created_at)}
                </p>
                {event.note ? <p className="mt-2 text-sm text-zinc-600">{event.note}</p> : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
