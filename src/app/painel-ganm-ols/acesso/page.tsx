import Link from "next/link";

import { ClientSignInForm } from "@/components/auth/ClientAuthForms";
import { ADMIN_PATHS } from "@/lib/config/admin";

type SearchParams = {
  error?: string;
  message?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);

  return (
    <main className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Admin</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Entre com seu email e senha para acessar o painel.
        </p>
      </div>
      <div className="max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <ClientSignInForm
          redirectTo={ADMIN_PATHS.dashboard}
          initialError={resolvedSearchParams?.error ?? null}
          initialMessage={resolvedSearchParams?.message ?? null}
        />
        <Link
          href={ADMIN_PATHS.recover}
          className="mt-4 block text-center text-xs font-semibold text-zinc-500"
        >
          Esqueci minha senha
        </Link>
        <Link
          href="/entrar"
          className="mt-2 block text-center text-xs font-semibold text-zinc-500"
        >
          Usar login padrao da loja
        </Link>
      </div>
    </main>
  );
}
