import Link from "next/link";

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Meios de pagamento
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Pagamentos sao processados dentro da plataforma para manter seguranca
          e rastreabilidade do pedido.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Cartao e Pix",
            value: "Opcoes modernas e rapidas",
          },
          {
            label: "Compra em ambiente seguro",
            value: "Sem compartilhar dados com terceiros",
          },
          {
            label: "Status em tempo real",
            value: "Acompanhe em Compras",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-base font-semibold text-zinc-900">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/checkout"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Ir para o checkout
        </Link>
        <Link
          href="/contato"
          className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700"
        >
          Preciso de ajuda
        </Link>
      </div>
    </div>
  );
}

