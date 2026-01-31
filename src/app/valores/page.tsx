import Link from "next/link";

import {
  BUYER_APPROVAL_DAYS,
  MARKETPLACE_FEE_PERCENT,
  MIN_LISTING_PRICE_CENTS,
} from "@/lib/config/commerce";
import { formatCentsToBRL } from "@/lib/utils/price";

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Valores GANM OLS</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Transparencia total sobre comissoes, prazos e regras do marketplace.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Comissao da plataforma",
            value: `${MARKETPLACE_FEE_PERCENT}% por venda`,
          },
          {
            label: "Preco minimo",
            value: formatCentsToBRL(MIN_LISTING_PRICE_CENTS),
          },
          {
            label: "Garantia de repasse",
            value: `${BUYER_APPROVAL_DAYS} dias apos entrega`,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-xl font-semibold text-zinc-900">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Como funciona</h2>
        <div className="mt-3 space-y-3">
          <p>
            Cada venda realizada recebe a comissao informada acima. O valor do
            repasse fica em garantia por {BUYER_APPROVAL_DAYS} dias apos a
            entrega ao comprador.
          </p>
          <p>
            Após o periodo de garantia, o saldo fica disponivel para saque no
            painel do vendedor. Voce define o metodo de recebimento na sua conta.
          </p>
          <p>
            Anuncios abaixo do preco minimo nao podem ser publicados para manter
            o padrao de qualidade da vitrine.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/vender"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Quero vender
        </Link>
        <Link
          href="/contato"
          className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700"
        >
          Falar com o time
        </Link>
      </div>
    </div>
  );
}
