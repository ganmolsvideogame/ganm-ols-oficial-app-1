import Link from "next/link";

export default function Page() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Termos de uso</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Leia as regras para comprar e vender com seguranca na GANM OLS.
        </p>
      </div>

      <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">
          Regras para vendedores
        </h2>
        <p>
          Os anuncios devem ser verdadeiros, com fotos reais e descricao
          completa. Produtos proibidos ou falsificados serao removidos.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900">
          Regras para compradores
        </h2>
        <p>
          Pagamentos devem ser feitos apenas dentro da plataforma. Nao
          compartilhe dados sensiveis com terceiros.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900">Lances</h2>
        <p>
          Lances sao vinculantes. O maior lance valido dentro do prazo vence o
          lances.
        </p>
        <h2 className="text-lg font-semibold text-zinc-900">Seguranca</h2>
        <p>
          Reservamo-nos o direito de suspender contas em caso de fraude,
          comportamento abusivo ou violacao destes termos.
        </p>
      </section>

      <Link
        href="/contato"
        className="inline-flex rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700"
      >
        Tirar duvidas
      </Link>
    </div>
  );
}
