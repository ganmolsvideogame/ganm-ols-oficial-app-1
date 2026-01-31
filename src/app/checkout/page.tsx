import Link from "next/link";
import { redirect } from "next/navigation";

import CheckoutSummary from "@/components/checkout/CheckoutSummary";
import { createClient } from "@/lib/supabase/server";
import { formatCentsToBRL } from "@/lib/utils/price";

export const dynamic = "force-dynamic";

type SearchParams = {
  listing_id?: string;
  error?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type ListingRow = {
  id: string;
  title: string;
  price_cents: number;
  thumbnail_url: string | null;
  platform: string | null;
  family: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  listing_type: string | null;
  status: string | null;
  quantity_available: number | null;
};

type ProfileRow = {
  address_line1: string | null;
  address_line2: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
};

export default async function CheckoutPage({ searchParams }: PageProps) {
  const resolved = (await searchParams) ?? {};
  const listingId = String(resolved.listing_id ?? "").trim();
  const error = resolved.error ? decodeURIComponent(resolved.error) : "";

  if (!listingId) {
    redirect("/buscar");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/entrar?redirect_to=/checkout?listing_id=${listingId}`);
  }

  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, title, price_cents, thumbnail_url, platform, family, shipping_available, free_shipping, listing_type, status, quantity_available"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (!listing || listing.status !== "active") {
    redirect(`/produto/${listingId}?error=Anuncio+indisponivel`);
  }

  if (
    typeof listing.quantity_available === "number" &&
    listing.quantity_available <= 0
  ) {
    redirect(`/produto/${listingId}?error=Produto+sem+estoque`);
  }

  if (listing.listing_type === "auction") {
    redirect(`/produto/${listingId}?error=Este+anuncio+esta+em+modo+de+lances`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("address_line1, address_line2, district, city, state, zipcode")
    .eq("id", user.id)
    .maybeSingle();

  const address = profile as ProfileRow | null;
  const addressComplete =
    Boolean(address?.address_line1) &&
    Boolean(address?.district) &&
    Boolean(address?.city) &&
    Boolean(address?.state) &&
    Boolean(address?.zipcode);

  const { data: upsellPlatformRaw } = listing.platform
    ? await supabase
        .from("listings")
        .select(
          "id, title, price_cents, thumbnail_url, platform, family, shipping_available, free_shipping, status"
        )
        .eq("platform", listing.platform)
        .eq("status", "active")
        .neq("id", listing.id)
        .limit(4)
    : { data: [] as ListingRow[] };

  const { data: upsellFamilyRaw } = listing.family
    ? await supabase
        .from("listings")
        .select(
          "id, title, price_cents, thumbnail_url, platform, family, shipping_available, free_shipping, status"
        )
        .eq("family", listing.family)
        .eq("status", "active")
        .neq("id", listing.id)
        .limit(4)
    : { data: [] as ListingRow[] };

  const upsellPlatform = (upsellPlatformRaw ?? []) as ListingRow[];
  const upsellFamily = (upsellFamilyRaw ?? []) as ListingRow[];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Finalizar compra
        </p>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Revise seu pedido
        </h1>
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Produto
            </p>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
              <div className="h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
                {listing.thumbnail_url ? (
                  <img
                    src={listing.thumbnail_url}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                    Sem foto
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  {listing.platform || listing.family || "Colecionavel"}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-900">
                  {listing.title}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  {formatCentsToBRL(listing.price_cents)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Endereco de envio
            </p>
            <div className="mt-3 text-sm text-zinc-700">
              {addressComplete ? (
                <>
                  <p>{address?.address_line1}</p>
                  {address?.address_line2 ? <p>{address.address_line2}</p> : null}
                  {address?.district ? <p>{address.district}</p> : null}
                  <p>
                    {address?.city} - {address?.state}
                  </p>
                  <p>CEP {address?.zipcode}</p>
                </>
              ) : (
                <p className="text-rose-600">
                  Seu endereco esta incompleto.{" "}
                  <Link href="/conta" className="underline">
                    Atualize agora
                  </Link>
                  .
                </p>
              )}
            </div>
          </section>

          {upsellPlatform.length > 0 ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Compre tambem
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {upsellPlatform.map((item) => (
                  <Link
                    key={item.id}
                    href={`/produto/${item.id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 transition hover:border-zinc-400"
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">
                        {item.platform || item.family || "Colecionavel"}
                      </p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {formatCentsToBRL(item.price_cents)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {upsellFamily.length > 0 ? (
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Relacionados
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {upsellFamily.map((item) => (
                  <Link
                    key={item.id}
                    href={`/produto/${item.id}`}
                    className="group flex items-center gap-3 rounded-2xl border border-zinc-200 p-3 transition hover:border-zinc-400"
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      {item.thumbnail_url ? (
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">
                        {item.platform || item.family || "Colecionavel"}
                      </p>
                      <p className="text-sm font-semibold text-zinc-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {formatCentsToBRL(item.price_cents)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div>
          <CheckoutSummary
            listingId={listing.id}
            listingPriceCents={listing.price_cents}
            shippingAvailable={listing.shipping_available !== false}
            freeShipping={Boolean(listing.free_shipping)}
            initialZipcode={address?.zipcode ?? ""}
            addressComplete={addressComplete}
          />
        </div>
      </div>
    </div>
  );
}
