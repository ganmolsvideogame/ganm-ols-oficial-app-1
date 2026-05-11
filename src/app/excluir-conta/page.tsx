import Link from "next/link";

type SearchParams = {
  success?: string;
  error?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const success = String(resolvedSearchParams?.success ?? "").trim();
  const error = String(resolvedSearchParams?.error ?? "").trim();

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Solicitar exclusao de conta
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-600">
          Use esta pagina para pedir a exclusao da sua conta GANM OLS e dos
          dados associados ao perfil. Pedidos vinculados a obrigacoes legais,
          fiscais, antifraude ou financeiras podem ser mantidos pelo prazo
          necessario mesmo apos o encerramento da conta.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Enviar pedido
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Preencha os dados abaixo. O time da GANM OLS vai analisar a
            solicitacao e responder pelo email informado.
          </p>

          {success ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form
            action="/api/account/delete-request"
            method="post"
            className="mt-6 space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">
                Nome
              </label>
              <input
                name="name"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">
                Email da conta
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                placeholder="voce@email.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">
                Telefone
              </label>
              <input
                name="phone"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700">
                Detalhes adicionais
              </label>
              <textarea
                name="message"
                className="min-h-[140px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                placeholder="Se quiser, informe algum detalhe sobre a solicitacao."
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="confirm"
                value="yes"
                required
                className="mt-1 h-4 w-4 rounded border-zinc-300"
              />
              <span>
                Confirmo que desejo solicitar a exclusao da minha conta e dos
                dados associados, sujeito a retencao de informacoes exigidas por
                lei ou por obrigacoes operacionais.
              </span>
            </label>

            <button
              type="submit"
              className="inline-flex rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Enviar pedido de exclusao
            </button>
          </form>
        </section>

        <aside className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            O que acontece depois
          </h2>

          <div className="space-y-3 text-sm text-zinc-600">
            <p>
              1. O pedido e registrado e enviado para analise interna da GANM
              OLS.
            </p>
            <p>
              2. A equipe valida a titularidade da conta pelo email informado.
            </p>
            <p>
              3. Dados que nao dependem de obrigacao legal podem ser removidos
              ou anonimizados.
            </p>
            <p>
              4. Registros necessarios para pedidos, pagamentos, antifraude,
              fiscalizacao ou defesa legal podem ser mantidos pelo prazo
              aplicavel.
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            Se preferir, voce tambem pode entrar em contato pelo email{" "}
            <a
              className="font-semibold text-zinc-900 underline underline-offset-2"
              href="mailto:contato@ganmols.com?subject=Solicitacao%20de%20exclusao%20de%20conta%20GANM%20OLS"
            >
              contato@ganmols.com
            </a>
            .
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/politica-de-privacidade"
              className="inline-flex rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700"
            >
              Politica de privacidade
            </Link>
            <Link
              href="/contato"
              className="inline-flex rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700"
            >
              Falar com o suporte
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
