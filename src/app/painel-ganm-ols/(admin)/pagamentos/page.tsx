import { requireAdmin } from "@/lib/admin/require-admin";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type OrderRow = {
  id: string;
  listing_id: string;
  buyer_user_id: string;
  seller_user_id: string;
  amount_cents: number | null;
  status: string | null;
  payment_deadline_at: string | null;
  created_at: string | null;
  mp_payment_id: string | null;
  mp_preference_id: string | null;
};

type PayoutRow = {
  id: string;
  seller_user_id: string;
  amount_cents: number | null;
  status: string | null;
  created_at: string | null;
  paid_at: string | null;
  order_ids: string[] | null;
};

type PaymentEventRow = {
  id: string;
  order_id: string | null;
  provider: string;
  event_type: string | null;
  status: string | null;
  received_at: string | null;
  processed_at: string | null;
  error: string | null;
};

type WebhookEventRow = {
  id: string;
  provider: string;
  event_type: string | null;
  status: string | null;
  received_at: string | null;
  processed_at: string | null;
  error: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }
  return date.toLocaleString("pt-BR");
}

function statusTone(value: string | null | undefined) {
  const status = String(value ?? "").toLowerCase();
  if (["approved", "paid", "processed", "success"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["pending", "received", "open"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["rejected", "failed", "error", "cancelled", "canceled"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-zinc-200 bg-white text-zinc-700";
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { supabase } = await requireAdmin();

  const { data: ordersData } = await supabase
    .from("orders")
    .select(
      "id, listing_id, buyer_user_id, seller_user_id, amount_cents, status, payment_deadline_at, created_at, mp_payment_id, mp_preference_id"
    )
    .order("created_at", { ascending: false })
    .limit(250);

  const { data: payoutsData } = await supabase
    .from("payout_requests")
    .select("id, seller_user_id, amount_cents, status, created_at, paid_at, order_ids")
    .order("created_at", { ascending: false })
    .limit(250);

  const { data: paymentEventsData } = await supabase
    .from("payment_events")
    .select("id, order_id, provider, event_type, status, received_at, processed_at, error")
    .order("received_at", { ascending: false })
    .limit(250);

  const { data: webhookEventsData } = await supabase
    .from("webhook_events")
    .select("id, provider, event_type, status, received_at, processed_at, error")
    .order("received_at", { ascending: false })
    .limit(250);

  const orders = (ordersData ?? []) as OrderRow[];
  const payouts = (payoutsData ?? []) as PayoutRow[];
  const paymentEvents = (paymentEventsData ?? []) as PaymentEventRow[];
  const webhookEvents = (webhookEventsData ?? []) as WebhookEventRow[];

  const listingIds = Array.from(new Set(orders.map((order) => order.listing_id).filter(Boolean)));
  const userIds = Array.from(
    new Set(
      [
        ...orders.map((order) => order.buyer_user_id),
        ...orders.map((order) => order.seller_user_id),
        ...payouts.map((payout) => payout.seller_user_id),
      ].filter(Boolean)
    )
  );

  const { data: listingsData } =
    listingIds.length > 0
      ? await supabase.from("listings").select("id, title").in("id", listingIds)
      : { data: [] };

  const { data: profilesData } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds)
      : { data: [] };

  const listings = (listingsData ?? []) as ListingRow[];
  const profiles = (profilesData ?? []) as ProfileRow[];

  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const pendingOrders = orders.filter((order) => order.status === "pending");
  const paidOrdersCount = orders.filter((order) =>
    ["approved", "paid", "shipped", "delivered"].includes(order.status ?? "")
  ).length;
  const pendingPayouts = payouts.filter((payout) => payout.status === "pending");
  const eventErrorsCount =
    paymentEvents.filter((event) => Boolean(event.error)).length +
    webhookEvents.filter((event) => Boolean(event.error)).length;

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

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Pedidos pendentes", value: pendingOrders.length },
          { label: "Pedidos pagos", value: paidOrdersCount },
          { label: "Saques pendentes", value: pendingPayouts.length },
          { label: "Erros de evento", value: eventErrorsCount },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Pagamentos
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">Pedidos aguardando pagamento</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {pendingOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum pedido pendente de pagamento.
            </div>
          ) : (
            pendingOrders.map((order) => {
              const listing = listingMap.get(order.listing_id);
              const buyer = profileMap.get(order.buyer_user_id);
              const seller = profileMap.get(order.seller_user_id);

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Pedido {order.id.slice(0, 8)}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {listing?.title || "Produto removido"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        Valor: {formatCentsToBRL(order.amount_cents ?? 0)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Comprador: {buyer?.display_name || buyer?.email || order.buyer_user_id.slice(0, 8)} | Vendedor:{" "}
                        {seller?.display_name || seller?.email || order.seller_user_id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Criado em {formatDateTime(order.created_at)} | Prazo pagamento{" "}
                        {formatDateTime(order.payment_deadline_at)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        mp_payment_id: {order.mp_payment_id || "-"} | mp_preference_id: {order.mp_preference_id || "-"}
                      </p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action="/api/admin/orders" method="post">
                      <input type="hidden" name="order_id" value={order.id} />
                      <input type="hidden" name="action" value="set_status" />
                      <input type="hidden" name="status" value="approved" />
                      <input type="hidden" name="note" value="Aprovado manualmente pelo admin" />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.payments} />
                      <button
                        type="submit"
                        className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700"
                      >
                        Marcar como aprovado
                      </button>
                    </form>
                    <form action="/api/admin/orders" method="post" className="flex flex-wrap gap-2">
                      <input type="hidden" name="order_id" value={order.id} />
                      <input type="hidden" name="action" value="set_status" />
                      <input type="hidden" name="status" value="cancelled" />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.payments} />
                      <input
                        name="note"
                        placeholder="Motivo do cancelamento"
                        className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
                      >
                        Cancelar pedido
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Repasses
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">Solicitacoes de saque</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {payouts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhuma solicitacao de saque encontrada.
            </div>
          ) : (
            payouts.map((payout) => {
              const seller = profileMap.get(payout.seller_user_id);
              const sellerLabel = seller?.display_name || seller?.email || payout.seller_user_id.slice(0, 8);
              const status = payout.status ?? "pending";
              const orderCount = Array.isArray(payout.order_ids) ? payout.order_ids.length : 0;

              return (
                <div
                  key={payout.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Solicitacao {payout.id.slice(0, 8)}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {formatCentsToBRL(payout.amount_cents ?? 0)}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">Vendedor: {sellerLabel}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Pedidos no lote: {orderCount} | Criado em {formatDateTime(payout.created_at)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">Pago em {formatDateTime(payout.paid_at)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs ${statusTone(status)}`}>
                      {status}
                    </span>
                  </div>

                  {status === "pending" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <form action="/api/admin/payouts" method="post">
                        <input type="hidden" name="request_id" value={payout.id} />
                        <input type="hidden" name="action" value="paid" />
                        <input type="hidden" name="redirect_to" value={ADMIN_PATHS.payments} />
                        <button
                          type="submit"
                          className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700"
                        >
                          Marcar como pago
                        </button>
                      </form>
                      <form action="/api/admin/payouts" method="post">
                        <input type="hidden" name="request_id" value={payout.id} />
                        <input type="hidden" name="action" value="reject" />
                        <input type="hidden" name="redirect_to" value={ADMIN_PATHS.payments} />
                        <button
                          type="submit"
                          className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
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

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Eventos de pagamento</h2>
          <div className="mt-4 grid gap-3">
            {paymentEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                Nenhum evento de pagamento.
              </div>
            ) : (
              paymentEvents.slice(0, 20).map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-900">
                      {event.provider} | {event.event_type || "evento"}
                    </p>
                    <span className={`rounded-full border px-2 py-1 ${statusTone(event.status)}`}>
                      {event.status || "sem status"}
                    </span>
                  </div>
                  <p className="mt-1">Pedido: {event.order_id || "-"}</p>
                  <p className="mt-1">Recebido: {formatDateTime(event.received_at)}</p>
                  <p className="mt-1">Processado: {formatDateTime(event.processed_at)}</p>
                  {event.error ? <p className="mt-1 text-rose-700">Erro: {event.error}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Eventos de webhook</h2>
          <div className="mt-4 grid gap-3">
            {webhookEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                Nenhum evento de webhook.
              </div>
            ) : (
              webhookEvents.slice(0, 20).map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-900">
                      {event.provider} | {event.event_type || "evento"}
                    </p>
                    <span className={`rounded-full border px-2 py-1 ${statusTone(event.status)}`}>
                      {event.status || "sem status"}
                    </span>
                  </div>
                  <p className="mt-1">Recebido: {formatDateTime(event.received_at)}</p>
                  <p className="mt-1">Processado: {formatDateTime(event.processed_at)}</p>
                  {event.error ? <p className="mt-1 text-rose-700">Erro: {event.error}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
