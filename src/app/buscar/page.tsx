import { FAMILIES } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/listings/ListingCard";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  familia?: string;
  condicao?: string;
  sub?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type ListingRow = {
  id: string;
  title: string;
  price_cents: number | null;
  condition: string | null;
  family: string | null;
  platform: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  thumbnail_url: string | null;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const query = String(resolvedSearchParams?.q ?? "").trim();
  const family = String(resolvedSearchParams?.familia ?? "").trim();
  const conditionRaw = String(resolvedSearchParams?.condicao ?? "").trim();
  const sub = String(resolvedSearchParams?.sub ?? "").trim();

  const condition = conditionRaw ? conditionRaw.toLowerCase() : "";

  const supabase = await createClient();
  const familyLabelBySlug = Object.fromEntries(
    FAMILIES.map((familyItem) => [familyItem.slug, familyItem.name])
  );

  let listingQuery = supabase
    .from("listings_with_boost")
    .select(
      "id, title, price_cents, condition, family, platform, shipping_available, free_shipping, thumbnail_url"
    )
    .in("status", ["active", "paused"]);

  if (query) {
    const terms = query
      .split(/\s+/)
      .map((term) => term.replace(/[,]/g, " ").trim())
      .filter(Boolean);
    const searchTerms = terms.length > 0 ? terms : [query];
    const termFilters = searchTerms.flatMap((term) => [
      `title.ilike.%${term}%`,
      `platform.ilike.%${term}%`,
      `model.ilike.%${term}%`,
      `description.ilike.%${term}%`,
    ]);
    listingQuery = listingQuery.or(termFilters.join(","));
  }

  if (family) {
    const familyLabel = familyLabelBySlug[family];
    if (familyLabel) {
      listingQuery = listingQuery.or(
        `family.eq.${family},family.ilike.%${familyLabel}%`
      );
    } else {
      listingQuery = listingQuery.ilike("family", `%${family}%`);
    }
  }

  if (condition) {
    listingQuery = listingQuery.eq("condition", condition);
  }

  if (sub) {
    listingQuery = listingQuery.or(
      `title.ilike.%${sub}%,platform.ilike.%${sub}%,model.ilike.%${sub}%`
    );
  }

  const { data } = await listingQuery
    .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false });
  const listings = (data ?? []) as ListingRow[];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Buscar</h1>
        <p className="text-sm text-zinc-600">
          Resultados personalizados com filtros por familia e condicao.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <aside className="hidden space-y-6 md:block">
          <form
            action="/buscar"
            method="get"
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-zinc-900">Filtros</p>
            <div className="mt-4 space-y-4 text-sm text-zinc-600">
              <label className="flex flex-col gap-2">
                Buscar
                <input
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700"
                  name="q"
                  placeholder="Digite o que procura"
                  defaultValue={query}
                />
              </label>
              <label className="flex flex-col gap-2">
                Plataforma
                <select
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700"
                  name="familia"
                  defaultValue={family}
                >
                  <option value="">Todas</option>
                  {FAMILIES.map((familyItem) => (
                    <option key={familyItem.slug} value={familyItem.slug}>
                      {familyItem.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                Condicao
                <select
                  className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700"
                  name="condicao"
                  defaultValue={condition}
                >
                  <option value="">Todas</option>
                  <option value="novo">Novo</option>
                  <option value="usado">Usado</option>
                  <option value="colecionavel">Colecionavel</option>
                </select>
              </label>
              {sub ? (
                <input type="hidden" name="sub" value={sub} />
              ) : null}
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Aplicar filtros
            </button>
          </form>
        </aside>

        <div className="space-y-4">
          <form
            action="/buscar"
            method="get"
            className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white px-4 py-4 shadow-sm md:hidden"
          >
            <input
              className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700"
              name="q"
              placeholder="Buscar"
              defaultValue={query}
            />
            <div className="flex gap-2">
              <select
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700"
                name="familia"
                defaultValue={family}
              >
                <option value="">Plataforma</option>
                {FAMILIES.map((familyItem) => (
                  <option key={familyItem.slug} value={familyItem.slug}>
                    {familyItem.name}
                  </option>
                ))}
              </select>
              <select
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-xs text-zinc-700"
                name="condicao"
                defaultValue={condition}
              >
                <option value="">Condicao</option>
                <option value="novo">Novo</option>
                <option value="usado">Usado</option>
                <option value="colecionavel">Colecionavel</option>
              </select>
            </div>
            {sub ? <input type="hidden" name="sub" value={sub} /> : null}
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white"
            >
              Filtrar
            </button>
          </form>

          <div className="flex items-center justify-between rounded-3xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <span className="text-sm text-zinc-600">
              {listings.length} itens encontrados
            </span>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Ordenar:</span>
              <span className="rounded-full border border-zinc-200 px-3 py-1">
                Mais relevantes
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {listings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
                Nenhum resultado encontrado.
              </div>
            ) : (
              listings.map((item) => (
                <ListingCard
                  key={item.id}
                  href={`/produto/${item.id}`}
                  title={item.title}
                  priceCents={item.price_cents}
                  thumbnailUrl={item.thumbnail_url}
                  platformFallback={item.platform}
                  condition={item.condition}
                  shippingAvailable={item.shipping_available}
                  freeShipping={item.free_shipping}
                  familyLabel={
                    familyLabelBySlug[item.family ?? ""] ?? item.family ?? "Plataforma"
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
