import Link from "next/link";

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Politica de privacidade
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Saiba como coletamos, usamos e protegemos seus dados na GANM OLS.
        </p>
      </div>

      <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Dados coletados</h2>
        <p>
          Coletamos informacoes de cadastro, dados de contato, endereco de
          entrega e historico de pedidos para operar o marketplace com
          seguranca.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900">Uso das informacoes</h2>
        <p>
          Utilizamos os dados para processar compras, prevenir fraudes, oferecer
          suporte e melhorar sua experiencia na plataforma.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900">Compartilhamento</h2>
        <p>
          Compartilhamos apenas o necessario com parceiros de pagamento e
          entregas. Nunca vendemos seus dados.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900">Seus direitos</h2>
        <p>
          Voce pode solicitar acesso, correcao ou exclusao dos seus dados a
          qualquer momento pelo nosso suporte.
        </p>
      </section>

      <Link
        href="/contato"
        className="inline-flex rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700"
      >
        Falar com o suporte
      </Link>
    </div>
  );
}
