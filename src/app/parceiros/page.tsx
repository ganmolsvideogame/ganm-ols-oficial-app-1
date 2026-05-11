import type { Metadata } from "next";
import Link from "next/link";

import AffiliateProductCard from "@/components/affiliate/AffiliateProductCard";
import { listAffiliateProducts } from "@/lib/affiliate/catalog";

export const metadata: Metadata = {
  title: "Parceiros | GANM OLS",
  description:
    "Produtos oficiais e itens selecionados pela GANM OLS para ampliar o portifolio da vitrine.",
};

export default async function Page() {
  const products = await listAffiliateProducts();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Parceiros
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Produtos oficiais e selecao de parceiros
        </h1>
        <p className="max-w-3xl text-sm text-zinc-600">
          Uma selecao pensada para abrir portifolio com itens relevantes para a
          comunidade gamer, retro e Nintendo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <AffiliateProductCard key={product.slug} product={product} />
        ))}
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Novidades chegando
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          A GANM OLS vai ampliar essa area com mais produtos oficiais e selecoes
          por familia, acessorios e consoles.
        </p>
        <div className="mt-4">
          <Link
            href="/blog"
            className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
          >
            Voltar para o conteudo
          </Link>
        </div>
      </div>
    </div>
  );
}
