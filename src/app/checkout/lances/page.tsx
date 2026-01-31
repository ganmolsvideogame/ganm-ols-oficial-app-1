import Link from "next/link";
import { redirect } from "next/navigation";

import { AUCTION_PAYMENT_WINDOW_DAYS, closeExpiredAuctions } from "@/lib/auctions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";

type SearchParams = {
  order_id?: string;
  error?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type OrderRow = {
  id: string;
  amount_cents: number | null;
  status: string | null;
  buyer_user_id: string | null;
  seller_user_id: string | null;
  payment_deadline_at: string | null;
  listings:
    | {
        id: string;
        title: string | null;
        thumbnail_url: string | null;
        listing_type: string | null;
        status: string | null;
      }[]
    | null;
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

export const dynamic = "force-dynamic";

export default async function AuctionCheckoutPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};
  const orderId = String(resolved.order_id ?? "").trim();
  const error = resolved.error ? decodeURIComponent(resolved.error) : "";

  if (!orderId) {
    redirect("/compras");
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect_to=/checkout/lances?order_id=${orderId}`);
  }

  await closeExpiredAuctions();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select(
      "id, amount_cents, status, buyer_user_id, seller_user_id, payment_deadline_at, listings(id, title, thumbnail_url, listing_type, status)"
    )
    .eq("id", orderId)
    .maybeSingle();

  const orderRow = order as OrderRow | null;

  if (orderError || !orderRow) {
    redirect(`/compras?error=${encodeURIComponent("Pedido nao encontrado")}`);
  }

  if (orderRow.buyer_user_id !== user.id) {
    redirect(`/compras?error=${encodeURIComponent("Sem permissao para este pedido")}`);
  }

  const listing = orderRow.listings?.[0] ?? null;
  if (!listing || listing.listing_type !== "auction") {
    redirect(`/compras?error=${encodeURIComponent("Este pedido nao e de lances")}`);
  }

  if (orderRow.status && orderRow.status !== "pending") {
    redirect(`/compras?status=${encodeURIComponent(orderRow.status)}&order_id=${orderRow.id}`);
  }

  const deadline = orderRow.payment_deadline_at
    ? new Date(orderRow.payment_deadline_at)
    : null;
  const deadlineExpired =
    deadline && !Number.isNaN(deadline.getTime()) ? deadline <= new Date() : false;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Pagamento de lances
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Finalize o pagamento
        </h1>
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {deadlineExpired ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            O prazo de pagamento deste pedido expirou.
          </div>
        ) : null}
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Produto
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              {listing.thumbnail_url ? (
                <img
                  src={listing.thumbnail_url}
                  alt={listing.title ?? "Produto"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[11px] text-zinc-400">
                  Sem foto
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {listing.title ?? "Lances vencidos"}
              </h2>
              <p className="text-sm text-zinc-600">Pedido: {orderRow.id}</p>
              <p className="mt-1 text-sm text-zinc-600">
                Valor: {formatCentsToBRL(orderRow.amount_cents ?? 0)}
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <p>
              Prazo de pagamento: {deadline ? formatDateTime(orderRow.payment_deadline_at) : "Sem prazo"}
            </p>
            <p>
              Apos {AUCTION_PAYMENT_WINDOW_DAYS} dias sem pagamento, o vendedor pode
              cancelar este pedido.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Total
            </p>
            <p className="mt-3 text-3xl font-semibold text-zinc-900">
              {formatCentsToBRL(orderRow.amount_cents ?? 0)}
            </p>
          </div>

          <form action="/api/mercadopago/preference-auction" method="post">
            <input type="hidden" name="order_id" value={orderRow.id} />
            <button
              type="submit"
              disabled={deadlineExpired}
              className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {deadlineExpired ? "Prazo encerrado" : "Pagar agora"}
            </button>
          </form>

          <Link
            href="/compras"
            className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Voltar para compras
          </Link>
        </div>
      </section>
    </div>
  );
}