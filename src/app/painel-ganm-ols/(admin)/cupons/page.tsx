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

type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  percent_off: number | null;
  amount_off_cents: number | null;
  max_redemptions: number | null;
  redemptions_count: number | null;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sem data";
  }
  return date.toLocaleDateString("pt-BR");
}

function formatDiscount(coupon: CouponRow) {
  if (coupon.percent_off) {
    return `${coupon.percent_off}%`;
  }
  if (coupon.amount_off_cents) {
    return formatCentsToBRL(coupon.amount_off_cents);
  }
  return "Sem desconto";
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

  const { data: couponsData } = await supabase
    .from("coupons")
    .select(
      "id, code, description, percent_off, amount_off_cents, max_redemptions, redemptions_count, starts_at, ends_at, active, created_at"
    )
    .order("created_at", { ascending: false });

  const coupons = (couponsData ?? []) as CouponRow[];

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
              Cupons
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Criar cupom de desconto
            </h2>
          </div>
        </div>
        <form action="/api/admin/coupons" method="post" className="mt-4 grid gap-3 md:grid-cols-3">
          <input type="hidden" name="action" value="create" />
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Codigo
            </label>
            <input
              name="code"
              placeholder="EX: GANM10"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Descricao
            </label>
            <input
              name="description"
              placeholder="Campanha ou observacao"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Percentual (%)
            </label>
            <input
              name="percent_off"
              type="number"
              min="1"
              max="100"
              placeholder="Ex: 10"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Valor fixo (R$)
            </label>
            <input
              name="amount_off"
              placeholder="Ex: 25,00"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Limite de usos
            </label>
            <input
              name="max_redemptions"
              type="number"
              min="1"
              placeholder="Opcional"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Inicio
            </label>
            <input
              name="starts_at"
              type="datetime-local"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Fim
            </label>
            <input
              name="ends_at"
              type="datetime-local"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              id="coupon-active"
              name="active"
              type="checkbox"
              className="h-4 w-4 rounded border-zinc-300"
              defaultChecked
            />
            <label htmlFor="coupon-active">Ativo</label>
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Criar cupom
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Cupons ativos</h2>
          <span className="text-sm text-zinc-500">Total: {coupons.length}</span>
        </div>
        <div className="grid gap-4">
          {coupons.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum cupom cadastrado.
            </div>
          ) : (
            coupons.map((coupon) => {
              const redemptions = coupon.redemptions_count ?? 0;
              const maxRedemptions = coupon.max_redemptions ?? null;
              return (
                <div
                  key={coupon.id}
                  className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        {coupon.code}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {formatDiscount(coupon)}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">
                        {coupon.description || "Sem descricao"}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        Valido de {formatDate(coupon.starts_at)} ate{" "}
                        {formatDate(coupon.ends_at)}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Usos: {redemptions}
                        {maxRedemptions ? ` / ${maxRedemptions}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs text-zinc-500">
                      <p>
                        Criado em{" "}
                        {coupon.created_at
                          ? coupon.created_at.slice(0, 10)
                          : "Sem data"}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs ${
                          coupon.active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {coupon.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action="/api/admin/coupons" method="post">
                      <input type="hidden" name="coupon_id" value={coupon.id} />
                      <input type="hidden" name="action" value="toggle_active" />
                      <input
                        type="hidden"
                        name="active"
                        value={coupon.active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        {coupon.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                    <form action="/api/admin/coupons" method="post">
                      <input type="hidden" name="coupon_id" value={coupon.id} />
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
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
