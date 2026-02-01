import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCentsToBRL } from "@/lib/utils/price";
import { BUYER_APPROVAL_DAYS } from "@/lib/config/commerce";
import { AUCTION_PAYMENT_WINDOW_DAYS } from "@/lib/auctions";

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

function formatDateTime(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) {
    return "Sem data";
  }
  return date.toLocaleString("pt-BR");
}

function formatDate(value: string | null | undefined) {
  const date = parseDate(value);
  if (!date) {
    return "Sem data";
  }
  return date.toLocaleDateString("pt-BR");
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

export default async function BuyerOrderDetailsPage({ params }: PageProps) {
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
    redirect("/compras?error=Pedido+invalido");
  }

  const { data: order, error } = await admin
    .from("orders")
    .select(
      "id, listing_id, buyer_user_id, seller_user_id, amount_cents, fee_cents, shipping_cost_cents, shipping_paid_by, shipping_service_name, status, created_at, approved_at, delivered_at, available_at, buyer_approval_deadline_at, payment_deadline_at, mp_payment_id, shipping_status, shipping_provider, shipping_tracking, shipping_label_url, superfrete_id, superfrete_status, superfrete_print_url, cancel_status, cancel_requested_by, cancel_requested_at, cancel_deadline_at, cancel_reason, listings(title, thumbnail_url, listing_type)"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    redirect("/compras?error=Pedido+nao+encontrado");
  }

  if (order.buyer_user_id !== user.id) {
    redirect("/compras?error=Sem+permissao+para+este+pedido");
  }

  const { data: eventsData } = await admin
    .from("order_events")
    .select("id, status, note, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const events = (eventsData ?? []) as OrderEventRow[];
  const listing = order.listings?.[0] ?? null;
  const isAuctionOrder = listing?.listing_type === "auction";
  const paymentDeadline = parseDate(order.payment_deadline_at);
  const paymentExpired = paymentDeadline && paymentDeadline <= new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Compra
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            Detalhes do pedido
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Pedido #{order.id.slice(0, 8)}
          </p>
        </div>
        <Link
          href="/compras"
          className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
        >
          Voltar as compras
        </Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-900">
            Resumo do pedido
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[96px_1fr]">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              {listing?.thumbnail_url ? (
                <img
                  src={listing.thumbnail_url}
                  alt={listing.title ?? "Produto"}
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
                {listing?.title ?? "Produto"}
              </p>
              <p>
                Tipo: {listing?.listing_type === "auction" ? "Lance" : "Venda"}
              </p>
              <p>Pedido criado em: {formatDateTime(order.created_at)}</p>
              <p>Aprovado em: {formatDateTime(order.approved_at)}</p>
              {order.payment_deadline_at ? (
                <p>Pagamento ate: {formatDateTime(order.payment_deadline_at)}</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Pagamento</h2>
          <div className="mt-4 space-y-2 text-sm text-zinc-600">
            <p>Status: {order.status ?? "pending"}</p>
            <p>{formatPaymentStatus(order.status, order.mp_payment_id)}</p>
            <p>Valor: {formatCentsToBRL(order.amount_cents ?? 0)}</p>
            {order.payment_deadline_at ? (
              <p>Prazo: {formatDate(order.payment_deadline_at)}</p>
            ) : null}
            {isAuctionOrder ? (
              <p>
                Pagamento deve ser concluido em ate {AUCTION_PAYMENT_WINDOW_DAYS}{" "}
                dias.
              </p>
            ) : null}
          </div>
          {order.status === "pending" && isAuctionOrder ? (
            <Link
              href={`/checkout/lances?order_id=${order.id}`}
              className={`mt-4 inline-flex rounded-full px-4 py-2 text-xs font-semibold ${
                paymentExpired
                  ? "border border-amber-200 text-amber-700"
                  : "bg-zinc-900 text-white"
              }`}
            >
              {paymentExpired ? "Prazo encerrado" : "Pagar agora"}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Envio</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Status
            </p>
            <p className="mt-2 font-semibold text-zinc-900">
              {formatShippingStatus(order.status, order.shipping_status ?? null)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Servico
            </p>
            <p className="mt-2 font-semibold text-zinc-900">
              {order.shipping_service_name ?? "Nao informado"}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Rastreio
            </p>
            <p className="mt-2 font-semibold text-zinc-900">
              {order.shipping_tracking ?? "Sem codigo"}
            </p>
          </div>
        </div>
        {order.superfrete_print_url ? (
          <a
            href={order.superfrete_print_url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Ver etiqueta
          </a>
        ) : null}
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
                {event.note ? (
                  <p className="mt-2 text-sm text-zinc-600">{event.note}</p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
