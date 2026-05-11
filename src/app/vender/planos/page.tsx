import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

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
};

function formatPeriod(value: string | null) {
  if (value === "yearly") {
    return "ano";
  }
  return "mes";
}

function CheckIcon({ inverted }: { inverted?: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
        inverted
          ? "border-white/15 bg-white/10 text-white"
          : "border-zinc-200 bg-zinc-50 text-zinc-800"
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <path
          d="M20 6 9 17l-5-5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default async function Page() {
  const supabase = await createClient();
  const { data: plansData } = await supabase
    .from("subscription_plans")
    .select(
      "id, name, slug, description, price_cents, billing_period, featured_listing_limit, boost_priority, is_active"
    )
    .eq("is_active", true)
    .order("price_cents", { ascending: true });

  const plans = (plansData ?? []) as PlanRow[];
  const highlightPlan =
    plans.reduce<PlanRow | null>((current, plan) => {
      if (!current) return plan;
      const currentBoost = current.boost_priority ?? 0;
      const planBoost = plan.boost_priority ?? 0;
      return planBoost > currentBoost ? plan : current;
    }, null) ?? plans[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-sm md:p-10">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,.18),rgba(255,255,255,0)_65%)]" />
          <div className="absolute -bottom-44 -right-44 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,.12),rgba(255,255,255,0)_65%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0),rgba(0,0,0,.32))]" />
        </div>

        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
              Planos para vendedores
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                Destaque seus anuncios e ganhe mais visibilidade.
              </h1>
              <p className="max-w-2xl text-sm text-white/75">
                Planos simples para subir na vitrine e acompanhar o desempenho.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href="/vender"
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/90 hover:bg-white/10"
              >
                Voltar ao painel
              </Link>
              <Link
                href="/contato"
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-100"
              >
                Falar com o time
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-white/80">
            Total de planos ativos:{" "}
            <span className="font-semibold">{plans.length}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {plans.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 md:col-span-3">
            Nenhum plano ativo no momento.
          </div>
        ) : (
          plans.map((plan) => {
            const isHighlight = highlightPlan?.id === plan.id;
            const features = [
              `${plan.featured_listing_limit ?? 0} destaques ativos`,
              `Prioridade ${plan.boost_priority ?? 0}`,
              "Suporte prioritario para vendedores",
              "Relatorios de performance",
            ];

            return (
              <article
                key={plan.id}
                className={`flex h-full flex-col rounded-3xl border p-6 shadow-sm ${
                  isHighlight
                    ? "border-zinc-200 bg-zinc-950 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
                    : "border-zinc-200 bg-white text-zinc-900"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                        isHighlight ? "text-white/70" : "text-zinc-500"
                      }`}
                    >
                      {plan.slug || "Plano"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
                  </div>
                  {isHighlight ? (
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/90">
                      Recomendado
                    </span>
                  ) : null}
                </div>

                <p
                  className={`mt-3 text-sm ${
                    isHighlight ? "text-white/80" : "text-zinc-600"
                  }`}
                >
                  {plan.description || "Plano pensado para aumentar sua visibilidade."}
                </p>

                <div className="mt-6">
                  <p className="text-3xl font-semibold">
                    {formatCentsToBRL(plan.price_cents ?? 0)}
                    <span
                      className={`text-sm font-medium ${
                        isHighlight ? "text-white/70" : "text-zinc-500"
                      }`}
                    >
                      /{formatPeriod(plan.billing_period)}
                    </span>
                  </p>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                      isHighlight ? "text-white/70" : "text-zinc-500"
                    }`}
                  >
                    O que esta incluso
                  </p>
                  <ul className="space-y-2">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckIcon inverted={isHighlight} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Link
                    href={`/contato?plano=${encodeURIComponent(
                      plan.slug ?? plan.name
                    )}`}
                    className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold ${
                      isHighlight
                        ? "bg-white text-zinc-950 hover:bg-zinc-100"
                        : "bg-zinc-900 text-white hover:bg-zinc-800"
                    }`}
                  >
                    Assinar agora
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

