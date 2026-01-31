import { FAMILIES } from "@/lib/mock/data";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/listings/ListingCard";

export const dynamic = "force-dynamic";

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

export default async function Page() {
  const supabase = await createClient();
  const familyLabelBySlug = Object.fromEntries(
    FAMILIES.map((family) => [family.slug, family.name])
  );

  const { data } = await supabase
    .from("listings_with_boost")
    .select(
      "id, title, price_cents, condition, family, platform, shipping_available, free_shipping, thumbnail_url"
    )
    .eq("status", "active")
    .eq("moderation_status", "approved")
    .eq("is_week_offer", true)
    .order("boost_priority", { ascending: false })
    .order("created_at", { ascending: false });

  const listings = (data ?? []) as ListingRow[];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Ofertas</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Lotes com preco especial e combos selecionados pela curadoria.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            Nenhuma oferta ativa no momento.
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
              tag="Oferta da semana"
            />
          ))
        )}
      </div>
    </div>
  );
}
