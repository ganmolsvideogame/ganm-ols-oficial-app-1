import { redirect } from "next/navigation";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type PlanRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price_cents: number | null;
  billing_period: string | null;
  featured_listing_limit: number | null;
  boost_priority: number | null;
  is_active: boolean | null;
  created_at: string | null;
};

function formatPeriod(value: string | null) {
  if (value === "yearly") {
    return "Anual";
  }
  return "Mensal";
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

  const { data: plansData } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, slug, description, price_cents, billing_period, featured_listing_limit, boost_priority, is_active, created_at"
    )
    .order("created_at", { ascending: false });

  const plans = (plansData ?? []) as PlanRow[];

  return (
    <main className="space-y-8">
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Planos
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Criar plano de assinatura
            </h2>
          </div>
        </div>
        <form action="/api/admin/plans" method="post" className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="action" value="create" />
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Nome
            </label>
            <input
              name="name"
              placeholder="Plano Vitrine"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Slug
            </label>
            <input
              name="slug"
              placeholder="plano-vitrine"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Preco (R$)
            </label>
            <input
              name="price"
              placeholder="Ex: 49,90"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Periodo
            </label>
            <select
              name="billing_period"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              defaultValue="monthly"
            >
              <option value="monthly">Mensal</option>
              <option value="yearly">Anual</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Limite de destaque
            </label>
            <input
              name="featured_listing_limit"
              type="number"
              min="0"
              placeholder="0"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Prioridade
            </label>
            <input
              name="boost_priority"
              type="number"
              min="0"
              placeholder="0"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Descricao
            </label>
            <textarea
              name="description"
              placeholder="Beneficios do plano"
              className="min-h-[120px] w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              id="plan-active"
              name="is_active"
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              defaultChecked
            />
            <label htmlFor="plan-active">Ativo</label>
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Criar plano
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Planos cadastrados</h2>
          <span className="text-sm text-zinc-500">Total: {plans.length}</span>
        </div>
        <div className="grid gap-4">
          {plans.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum plano cadastrado.
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      {plan.slug || "Sem slug"}
                    </p>
                    <h3 className="mt-2 text-base font-semibold text-zinc-900">
                      {plan.name}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      {plan.description || "Sem descricao"}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Preco:{" "}
                      {plan.price_cents ? formatCentsToBRL(plan.price_cents) : "R$ 0,00"}{" "}
                      / {formatPeriod(plan.billing_period)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Destaques: {plan.featured_listing_limit ?? 0} | Prioridade:{" "}
                      {plan.boost_priority ?? 0}
                    </p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p>
                      Criado em{" "}
                      {plan.created_at ? plan.created_at.slice(0, 10) : "Sem data"}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs ${
                        plan.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {plan.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action="/api/admin/plans" method="post">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <input type="hidden" name="action" value="toggle_active" />
                    <input
                      type="hidden"
                      name="is_active"
                      value={plan.is_active ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                    >
                      {plan.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                  <form action="/api/admin/plans" method="post">
                    <input type="hidden" name="plan_id" value={plan.id} />
                    <input type="hidden" name="action" value="delete" />
                    <button
                      type="submit"
                      className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
