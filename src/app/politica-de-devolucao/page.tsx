import Link from "next/link";

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Politica de devolucao
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Regras para cancelamento, devolucao e atendimento de pedidos feitos na
          GANM OLS.
        </p>
      </div>

      <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 text-sm leading-7 text-zinc-600 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Compras feitas na GANM OLS
        </h2>
        <p>
          Para pedidos concluídos dentro da GANM OLS, o comprador pode solicitar
          cancelamento ou devolucao pelos canais da plataforma dentro do prazo
          aplicavel ao pedido.
        </p>
        <p>
          O item deve ser devolvido nas mesmas condicoes em que foi recebido,
          com acessorios, embalagem e eventuais brindes incluidos quando isso
          fizer parte da entrega.
        </p>

        <h2 className="text-lg font-semibold text-zinc-900">
          Produtos com parceiro externo
        </h2>
        <p>
          Produtos comprados em parceiros externos, como Amazon ou Mercado
          Livre, seguem a politica de devolucao e cancelamento da loja onde a
          compra foi finalizada.
        </p>
        <p>
          Nesses casos, a GANM OLS atua como vitrine e redirecionamento. A
          devolucao, o estorno e a troca devem ser tratados diretamente com o
          parceiro responsavel pela venda.
        </p>

        <h2 className="text-lg font-semibold text-zinc-900">
          Como pedir ajuda
        </h2>
        <p>
          Se precisar de apoio para identificar onde a compra foi concluida ou
          localizar um pedido feito dentro da GANM OLS, fale com o suporte da
          plataforma.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/contato"
          className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Falar com o suporte
        </Link>
        <Link
          href="/compra-protegida"
          className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700"
        >
          Ver compra protegida
        </Link>
      </div>
    </div>
  );
}
