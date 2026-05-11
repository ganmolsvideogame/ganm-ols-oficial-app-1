import Link from "next/link";
import { redirect } from "next/navigation";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/server";
import AdminSupportRealtime from "@/components/support/AdminSupportRealtime";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type ThreadRow = {
  id: string;
  user_id: string;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  profiles?: { display_name: string | null; email: string | null }[] | null;
};

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function getUserLabel(row: ThreadRow) {
  const profile = row.profiles?.[0] ?? null;
  return profile?.display_name?.trim() || profile?.email?.trim() || row.user_id;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Faca login para acessar o admin"
      )}`
    );
  }

  const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || adminCheck !== true) {
    redirect(
      `${ADMIN_PATHS.login}?error=${encodeURIComponent(
        "Sem permissao para acessar o admin"
      )}`
    );
  }

  const { data: threadsData, error: threadsError } = await supabase
    .from("support_threads")
    .select("id, user_id, status, created_at, updated_at, profiles(display_name, email)")
    .order("updated_at", { ascending: false })
    .limit(200);

  const threads = (threadsData ?? []) as ThreadRow[];

  return (
    <main className="space-y-8">
      <AdminSupportRealtime />
      {resolvedSearchParams?.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {resolvedSearchParams.error}
        </div>
      ) : null}
      {resolvedSearchParams?.success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {resolvedSearchParams.success}
        </div>
      ) : null}

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Suporte
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Conversas com usuarios
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Mensagens enviadas pelo widget flutuante do site.
            </p>
          </div>
          <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500">
            Total: {threads.length}
          </span>
        </div>
      </section>

      {threadsError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Erro ao carregar suporte: {threadsError.message}
        </div>
      ) : null}

      <section className="grid gap-3">
        {threads.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600">
            Nenhuma conversa de suporte ainda.
          </div>
        ) : (
          threads.map((thread) => (
            <Link
              key={thread.id}
              href={`${ADMIN_PATHS.support}/${thread.id}`}
              className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Usuario
                  </p>
                  <p className="mt-2 text-base font-semibold text-zinc-900">
                    {getUserLabel(thread)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Atualizado: {formatDate(thread.updated_at)}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs ${
                    String(thread.status ?? "open") === "closed"
                      ? "border-zinc-200 bg-zinc-50 text-zinc-600"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {String(thread.status ?? "open") === "closed" ? "Fechado" : "Aberto"}
                </span>
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
