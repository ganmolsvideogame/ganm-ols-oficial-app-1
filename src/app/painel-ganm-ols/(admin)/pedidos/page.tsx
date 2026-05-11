import Link from "next/link";

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
  fee_cents: number | null;
  status: string | null;
  shipping_status: string | null;
  payout_status: string | null;
  payment_deadline_at: string | null;
  approved_at: string | null;
  delivered_at: string | null;
  available_at: string | null;
  buyer_approval_deadline_at: string | null;
  created_at: string | null;
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

const STATUS_OPTIONS = [
  "pending",
  "approved",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "dispute",
  "chargeback",
];

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
  if (["approved", "paid", "delivered"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["pending", "shipped"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["cancelled", "canceled", "dispute", "chargeback"].includes(status)) {
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
      "id, listing_id, buyer_user_id, seller_user_id, amount_cents, fee_cents, status, shipping_status, payout_status, payment_deadline_at, approved_at, delivered_at, available_at, buyer_approval_deadline_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const orders = (ordersData ?? []) as OrderRow[];

  const listingIds = Array.from(new Set(orders.map((order) => order.listing_id)));
  const userIds = Array.from(
    new Set(
      orders
        .flatMap((order) => [order.buyer_user_id, order.seller_user_id])
        .filter(Boolean)
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

  const pendingCount = orders.filter((order) => order.status === "pending").length;
  const paidCount = orders.filter((order) =>
    ["approved", "paid"].includes(order.status ?? "")
  ).length;
  const shippedCount = orders.filter((order) => order.status === "shipped").length;
  const deliveredCount = orders.filter((order) => order.status === "delivered").length;

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

      <section className="grid gap-4 md:grid-cols-5">
        {[
          { label: "Total", value: orders.length },
          { label: "Pendentes", value: pendingCount },
          { label: "Pagos", value: paidCount },
          { label: "Enviados", value: shippedCount },
          { label: "Entregues", value: deliveredCount },
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
              Operacao
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">Gestao de pedidos</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Atualize status e registre eventos sem sair da tela.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum pedido encontrado.
            </div>
          ) : (
            orders.map((order) => {
              const listing = listingMap.get(order.listing_id);
              const buyer = profileMap.get(order.buyer_user_id);
              const seller = profileMap.get(order.seller_user_id);
              const buyerLabel = buyer?.display_name || buyer?.email || order.buyer_user_id.slice(0, 8);
              const sellerLabel =
                seller?.display_name || seller?.email || order.seller_user_id.slice(0, 8);
              const status = order.status ?? "pending";
              const shippingStatus = order.shipping_status ?? "pending";
              const payoutStatus = order.payout_status ?? "hold";
              const feeCents = order.fee_cents ?? 0;
              const amountCents = order.amount_cents ?? 0;

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
                        Valor: {formatCentsToBRL(amountCents)} | Taxa: {formatCentsToBRL(feeCents)} | Liquido:{" "}
                        {formatCentsToBRL(Math.max(0, amountCents - feeCents))}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Comprador: {buyerLabel} | Vendedor: {sellerLabel}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Criado em {formatDateTime(order.created_at)} | Pagamento ate{" "}
                        {formatDateTime(order.payment_deadline_at)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Entregue em {formatDateTime(order.delivered_at)} | Liberacao em{" "}
                        {formatDateTime(order.available_at || order.buyer_approval_deadline_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={`rounded-full border px-3 py-1 ${statusTone(status)}`}>
                        Status: {status}
                      </span>
                      <span className={`rounded-full border px-3 py-1 ${statusTone(shippingStatus)}`}>
                        Frete: {shippingStatus}
                      </span>
                      <span className={`rounded-full border px-3 py-1 ${statusTone(payoutStatus)}`}>
                        Repasse: {payoutStatus}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/anuncio/${order.listing_id}`}
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                    >
                      Ver anuncio
                    </Link>

                    <form action="/api/admin/orders" method="post" className="flex flex-wrap gap-2">
                      <input type="hidden" name="order_id" value={order.id} />
                      <input type="hidden" name="action" value="set_status" />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.orders} />
                      <select
                        name="status"
                        defaultValue={status}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <input
                        name="note"
                        placeholder="Observacao"
                        className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        Atualizar status
                      </button>
                    </form>

                    <form action="/api/admin/orders" method="post" className="flex flex-wrap gap-2">
                      <input type="hidden" name="order_id" value={order.id} />
                      <input type="hidden" name="action" value="add_event" />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.orders} />
                      <input
                        name="status"
                        placeholder="Tipo evento"
                        className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
                      />
                      <input
                        name="note"
                        placeholder="Nota do evento"
                        className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        Registrar evento
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
