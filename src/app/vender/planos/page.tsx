import Link from "next/link";
import { Sora, Manrope } from "next/font/google";

import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

const headingFont = Sora({ subsets: ["latin"], weight: ["600", "700"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["400", "500", "600"] });

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
    <main className={`space-y-10 ${bodyFont.className}`}>
      <section
        className="rounded-[32px] border border-zinc-200 bg-zinc-900 px-6 py-10 text-white shadow-sm md:px-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 20%, rgba(49, 66, 255, 0.35), transparent 55%), radial-gradient(circle at 85% 20%, rgba(255, 59, 137, 0.4), transparent 55%), radial-gradient(circle at 50% 90%, rgba(66, 255, 220, 0.3), transparent 55%)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
              Planos para vendedores
            </p>
            <h1
              className={`mt-4 text-3xl font-semibold text-white md:text-4xl ${headingFont.className}`}
            >
              Confira nossa tabela de planos
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70">
              Escolha o plano ideal para destacar seus anuncios, ganhar mais
              visibilidade e priorizar suas vendas no Ganm Ols.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/vender"
                className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold text-white/80"
              >
                Voltar ao painel
              </Link>
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white">
                Planos ativos
              </span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 px-4 py-3 text-xs text-white/70">
            Total de planos: {plans.length}
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
              <div
                key={plan.id}
                className={`flex h-full flex-col rounded-[28px] border p-6 shadow-sm ${
                  isHighlight
                    ? "border-transparent bg-gradient-to-br from-[#2b2fe2] via-[#3a3de7] to-[#4b1bde] text-white shadow-[0_24px_60px_rgba(43,47,226,0.25)]"
                    : "border-zinc-200 bg-white text-zinc-900"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-inherit/60">
                      {plan.slug || "Plano"}
                    </p>
                    <h2
                      className={`mt-2 text-2xl font-semibold ${headingFont.className}`}
                    >
                      {plan.name}
                    </h2>
                  </div>
                  {isHighlight ? (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em]">
                      Popular
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
                    <span className="text-sm font-medium text-inherit/60">
                      /{formatPeriod(plan.billing_period)}
                    </span>
                  </p>
                </div>
                <div className="mt-6 space-y-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-inherit/60">
                    O que esta incluso
                  </p>
                  <ul className="space-y-2">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            isHighlight
                              ? "bg-white/15 text-white"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href={`/contato?plano=${encodeURIComponent(plan.slug ?? plan.name)}`}
                    className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold ${
                      isHighlight
                        ? "bg-white text-zinc-900"
                        : "border border-zinc-200 text-zinc-700"
                    }`}
                  >
                    Assinar agora
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
