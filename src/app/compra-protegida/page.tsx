import Link from "next/link";

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Compra protegida
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Suporte e acompanhamento do pedido do pagamento a entrega.
        </p>
      </div>

      <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          O que isso significa
        </h2>
        <p>
          Toda compra realizada pela GANM OLS gera um pedido rastreavel com
          registro de pagamento, envio e entrega.
        </p>
        <p>
          Se houver algum problema, voce pode abrir um chamado e nosso time
          ajuda a resolver.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/compras"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Ver minhas compras
        </Link>
        <Link
          href="/contato"
          className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700"
        >
          Falar com o suporte
        </Link>
      </div>
    </div>
  );
}

