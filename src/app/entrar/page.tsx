import Link from "next/link";

import {
  ClientSignInForm,
  ClientSignUpForm,
} from "@/components/auth/ClientAuthForms";

type SearchParams = {
  error?: string;
  message?: string;
  redirect_to?: string;
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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Entrar</h1>
        <p className="text-sm text-zinc-600">
          Acesse sua conta ou crie um novo perfil para comprar e vender.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">
            Ja tenho conta
          </h2>
          <div className="mt-4">
            <ClientSignInForm
              redirectTo={redirectTo}
              initialError={resolvedSearchParams?.error ?? null}
              initialMessage={resolvedSearchParams?.message ?? null}
            />
            <Link
              href="/contato?assunto=senha"
              className="mt-3 block w-full rounded-full border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-700"
            >
              Esqueci minha senha
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Criar conta</h2>
          <div className="mt-4">
            <ClientSignUpForm redirectTo={redirectTo} />
          </div>
        </section>
      </div>

      <Link href="/" className="text-sm font-semibold text-zinc-600">
        Voltar para a home
      </Link>
    </div>
  );
}
