import { requireAdmin } from "@/lib/admin/require-admin";
import { ADMIN_PATHS } from "@/lib/config/admin";

export const dynamic = "force-dynamic";

type SearchParams = {
  error?: string;
  success?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string | null;
  account_level: string | null;
  created_at: string | null;
  kyc_status: string | null;
  kyc_verified_at: string | null;
  is_suspended: boolean | null;
  suspended_until: string | null;
  suspension_reason: string | null;
};

type UserBlockRow = {
  id: string;
  user_id: string;
  reason: string | null;
  status: string | null;
  ends_at: string | null;
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

function badgeTone(value: string | null | undefined) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "approved" || normalized === "admin" || normalized === "seller") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "rejected" || normalized === "suspended") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (normalized === "pending") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-white text-zinc-700";
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { supabase } = await requireAdmin();

  const { data: profilesData } = await supabase
    .from("profiles")
    .select(
      "id, display_name, email, role, account_level, created_at, kyc_status, kyc_verified_at, is_suspended, suspended_until, suspension_reason"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  const { data: userBlocksData } = await supabase
    .from("user_blocks")
    .select("id, user_id, reason, status, ends_at, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  const profiles = (profilesData ?? []) as ProfileRow[];
  const userBlocks = (userBlocksData ?? []) as UserBlockRow[];

  const activeBlocksByUser = new Map<string, UserBlockRow>();
  for (const block of userBlocks) {
    if (block.status !== "active") {
      continue;
    }
    if (!activeBlocksByUser.has(block.user_id)) {
      activeBlocksByUser.set(block.user_id, block);
    }
  }

  const suspendedCount = profiles.filter((item) => item.is_suspended).length;
  const kycPendingCount = profiles.filter((item) => item.kyc_status === "pending").length;
  const sellerCount = profiles.filter((item) => item.role === "seller").length;

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

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Usuarios", value: profiles.length },
          { label: "Vendedores", value: sellerCount },
          { label: "KYC pendente", value: kycPendingCount },
          { label: "Suspensos", value: suspendedCount },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              {item.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-zinc-900">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Gestao
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-900">
              Usuarios e compliance
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Controle nivel da conta, papel, KYC e bloqueios.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {profiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
              Nenhum usuario encontrado.
            </div>
          ) : (
            profiles.map((profile) => {
              const activeBlock = activeBlocksByUser.get(profile.id);
              const suspended = Boolean(profile.is_suspended);
              const kycStatus = profile.kyc_status ?? "pending";
              const role = profile.role ?? "buyer";
              const accountLevel = profile.account_level ?? "user";

              return (
                <div
                  key={profile.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        {profile.id.slice(0, 8)}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-zinc-900">
                        {profile.display_name || profile.email || "Usuario sem nome"}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-600">{profile.email || "Sem email"}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Criado em {formatDate(profile.created_at)}
                      </p>
                      {suspended ? (
                        <p className="mt-1 text-xs text-rose-700">
                          Suspenso ate {formatDate(profile.suspended_until)} •{" "}
                          {profile.suspension_reason || "Sem motivo"}
                        </p>
                      ) : null}
                      {activeBlock ? (
                        <p className="mt-1 text-xs text-amber-700">
                          Bloqueio ativo: {activeBlock.reason || "Sem motivo"} (
                          ate {formatDate(activeBlock.ends_at)})
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`rounded-full border px-3 py-1 ${badgeTone(role)}`}
                      >
                        Papel: {role}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 ${badgeTone(accountLevel)}`}
                      >
                        Nivel: {accountLevel}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 ${badgeTone(kycStatus)}`}
                      >
                        KYC: {kycStatus}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 ${
                          suspended
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {suspended ? "Suspenso" : "Ativo"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action="/api/admin/users" method="post" className="flex gap-2">
                      <input type="hidden" name="user_id" value={profile.id} />
                      <input type="hidden" name="action" value="set_role" />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.users} />
                      <select
                        name="role"
                        defaultValue={role}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
                      >
                        <option value="buyer">buyer</option>
                        <option value="seller">seller</option>
                        <option value="admin">admin</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        Salvar papel
                      </button>
                    </form>

                    <form action="/api/admin/users" method="post" className="flex gap-2">
                      <input type="hidden" name="user_id" value={profile.id} />
                      <input type="hidden" name="action" value="set_level" />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.users} />
                      <select
                        name="level"
                        defaultValue={accountLevel}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
                      >
                        <option value="user">user</option>
                        <option value="trusted">trusted</option>
                        <option value="vip">vip</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700"
                      >
                        Salvar nivel
                      </button>
                    </form>

                    <form action="/api/admin/users" method="post">
                      <input type="hidden" name="user_id" value={profile.id} />
                      <input type="hidden" name="action" value="kyc_approve" />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.users} />
                      <button
                        type="submit"
                        className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700"
                      >
                        Aprovar KYC
                      </button>
                    </form>
                    <form action="/api/admin/users" method="post">
                      <input type="hidden" name="user_id" value={profile.id} />
                      <input type="hidden" name="action" value="kyc_reject" />
                      <input type="hidden" name="redirect_to" value={ADMIN_PATHS.users} />
                      <button
                        type="submit"
                        className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
                      >
                        Reprovar KYC
                      </button>
                    </form>

                    {suspended ? (
                      <form action="/api/admin/users" method="post">
                        <input type="hidden" name="user_id" value={profile.id} />
                        <input type="hidden" name="action" value="unsuspend" />
                        <input type="hidden" name="redirect_to" value={ADMIN_PATHS.users} />
                        <button
                          type="submit"
                          className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700"
                        >
                          Remover suspensao
                        </button>
                      </form>
                    ) : (
                      <form action="/api/admin/users" method="post" className="flex gap-2">
                        <input type="hidden" name="user_id" value={profile.id} />
                        <input type="hidden" name="action" value="suspend" />
                        <input type="hidden" name="redirect_to" value={ADMIN_PATHS.users} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="Motivo"
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
                        />
                        <input
                          type="datetime-local"
                          name="ends_at"
                          className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-700"
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700"
                        >
                          Suspender
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Atalhos</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={ADMIN_PATHS.reports}
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Ver relatorios
          </a>
          <a
            href={ADMIN_PATHS.orders}
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700"
          >
            Ver pedidos
          </a>
        </div>
      </section>
    </main>
  );
}
