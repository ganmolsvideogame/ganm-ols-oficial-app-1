import Link from "next/link";

import SignOutButton from "@/components/auth/SignOutButton";
import AdminNav from "@/components/admin/AdminNav";
import { ADMIN_PATHS } from "@/lib/config/admin";

type AdminShellProps = {
  children: React.ReactNode;
};

export default function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Painel
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            GANM OLS Admin
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Visao geral e operacao do marketplace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Ver site
          </Link>
          <SignOutButton
            label="Sair"
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
            redirectTo={ADMIN_PATHS.login}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Navegacao
          </p>
          <AdminNav />
        </aside>
        <section className="space-y-6">{children}</section>
      </div>
    </div>
  );
}
