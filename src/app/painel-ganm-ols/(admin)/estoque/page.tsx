import { redirect } from "next/navigation";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  name: string | null;
  slug: string | null;
};

type ListingRow = {
  id: string;
  title: string | null;
  price_cents: number | null;
  quantity_available: number | null;
  status: string | null;
  category_id: string | null;
  created_at: string | null;
};

type GroupedListings = {
  label: string;
  items: ListingRow[];
};

export default async function Page() {
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

  const { data: categoriesData } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  const { data: listingsData } = await supabase
    .from("listings")
    .select(
      "id, title, price_cents, quantity_available, status, category_id, created_at"
    )
    .order("created_at", { ascending: false });

  const categories = (categoriesData ?? []) as CategoryRow[];
  const listings = (listingsData ?? []) as ListingRow[];

  const categoryMap = new Map<string, CategoryRow>();
  categories.forEach((category) => {
    categoryMap.set(category.id, category);
  });

  const groupedMap = new Map<string, GroupedListings>();
  listings.forEach((listing) => {
    const category = listing.category_id
      ? categoryMap.get(listing.category_id)
      : null;
    const label = category?.name ?? "Sem categoria";
    const key = category?.id ?? "uncategorized";
    if (!groupedMap.has(key)) {
      groupedMap.set(key, { label, items: [] });
    }
    groupedMap.get(key)?.items.push(listing);
  });

  const groups = Array.from(groupedMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Estoque
        </p>
        <h1 className="mt-2 text-lg font-semibold text-zinc-900">
          Produtos por categoria
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Total de anuncios: {listings.length}
        </p>
      </section>

      <section className="space-y-6">
        {groups.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            Nenhum produto cadastrado.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900">
                  {group.label}
                </h2>
                <span className="text-sm text-zinc-500">
                  {group.items.length} itens
                </span>
              </div>
              <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <div className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr] gap-4 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  <span>Produto</span>
                  <span>Preco</span>
                  <span>Estoque</span>
                  <span>Status</span>
                </div>
                {group.items.map((listing) => (
                  <div
                    key={listing.id}
                    className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.6fr] gap-4 border-b border-zinc-100 px-4 py-4 text-sm text-zinc-700 last:border-b-0"
                  >
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {listing.title || "Sem titulo"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {listing.created_at
                          ? listing.created_at.slice(0, 10)
                          : "Sem data"}
                      </p>
                    </div>
                    <div className="text-sm text-zinc-700">
                      {formatCentsToBRL(listing.price_cents ?? 0)}
                    </div>
                    <div className="text-sm text-zinc-700">
                      {typeof listing.quantity_available === "number"
                        ? listing.quantity_available
                        : "-"}
                    </div>
                    <div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs ${
                          listing.status === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {listing.status ?? "indefinido"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
