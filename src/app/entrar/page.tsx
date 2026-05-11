import Link from "next/link";
import Image from "next/image";

import {
  ClientSignInForm,
  ClientSignUpForm,
} from "@/components/auth/ClientAuthForms";

type SearchParams = {
  error?: string;
  message?: string;
  redirect_to?: string;
  role?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const redirectTo = resolvedSearchParams?.redirect_to
    ? String(resolvedSearchParams.redirect_to)
    : "/";
  const initialRole =
    String(resolvedSearchParams?.role ?? "").toLowerCase() === "seller"
      ? "seller"
      : "buyer";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center text-zinc-950 transition hover:opacity-80"
          >
            <Image
              src="/ganm ols logo para email.png"
              alt="GANM OLS"
              width={220}
              height={62}
              className="h-auto w-[170px] sm:w-[220px]"
              priority
            />
          </Link>
        </div>

        <div className="mx-auto max-w-3xl px-5 pb-28 pt-2 text-center sm:px-6 sm:pb-32">
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            Entre ou crie sua conta para comprar e vender com mais rapidez
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-900/70 sm:text-base">
            Favoritos, compras, anuncios e novas oportunidades ficam em um so
            lugar. Escolha como quer entrar e siga direto para o proximo passo.
          </p>
        </div>
      </section>

      <section className="relative z-10 -mt-16 pb-14 sm:-mt-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-5 md:grid-cols-2">
            <section
              id="criar-conta"
              className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(24,24,27,0.08)] sm:p-8"
            >
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Cadastro
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  Criar conta
                </h2>
                <p className="text-sm leading-6 text-zinc-600">
                  Monte sua conta agora e depois siga para comprar ou publicar
                  seu primeiro anuncio.
                </p>
              </div>

              <div className="mt-6">
                <ClientSignUpForm initialRole={initialRole} />
              </div>
            </section>

            <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_18px_50px_rgba(24,24,27,0.08)] sm:p-8">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Acesso
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
                  Ja tenho conta
                </h2>
                <p className="text-sm leading-6 text-zinc-600">
                  Entre para acompanhar pedidos, favoritos, conta e suas
                  movimentacoes na GANM OLS.
                </p>
              </div>

              <div className="mt-6">
                <ClientSignInForm
                  redirectTo={redirectTo}
                  errorRedirect="/entrar"
                  initialError={resolvedSearchParams?.error ?? null}
                  initialMessage={resolvedSearchParams?.message ?? null}
                />
                <Link
                  href="/contato?assunto=senha"
                  className="mt-3 block w-full rounded-full border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </section>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-900"
            >
              Voltar para a home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
