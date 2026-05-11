import Link from "next/link";

import CheckoutFinalizadoTracker from "@/components/analytics/CheckoutFinalizadoTracker";

type SearchParams = {
  status?: string;
  order_id?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

function normalizeStatus(raw: string | undefined) {
  const status = String(raw ?? "pending").toLowerCase();
  if (status === "approved") {
    return "approved";
  }
  if (status === "rejected") {
    return "rejected";
  }
  return "pending";
}

export default async function CheckoutFinalizadoPage({ searchParams }: PageProps) {
  const resolved = await Promise.resolve(searchParams);
  const status = normalizeStatus(resolved?.status);
  const orderId = String(resolved?.order_id ?? "").trim();

  const title =
    status === "approved"
      ? "Pagamento concluido"
      : status === "rejected"
        ? "Pagamento nao aprovado"
        : "Pagamento pendente";
  const message =
    status === "approved"
      ? "Seu pagamento foi confirmado. O pedido foi atualizado e as notificacoes foram enviadas."
      : status === "rejected"
        ? "Nao foi possivel confirmar o pagamento. Voce pode tentar novamente."
        : "Estamos aguardando a confirmacao do pagamento.";
  const tone =
    status === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  const comprasParams = new URLSearchParams();
  comprasParams.set("status", status);
  if (orderId) {
    comprasParams.set("order_id", orderId);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <CheckoutFinalizadoTracker status={status} orderId={orderId} />

      <div className={`rounded-3xl border p-8 ${tone}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">
          Checkout
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm">{message}</p>
        {orderId ? (
          <p className="mt-3 text-xs opacity-80">
            Pedido: {orderId.slice(0, 8).toUpperCase()}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/compras?${comprasParams.toString()}`}
          className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
        >
          Ir para minhas compras
        </Link>
        <Link
          href="/"
          className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700"
        >
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}
