import Link from "next/link";
import { redirect } from "next/navigation";

import ListingCard from "@/components/listings/ListingCard";
import FollowSellerButton from "@/components/social/FollowSellerButton";
import { buildListingPath } from "@/lib/listings/url";
import { createAdminClient } from "@/lib/supabase/admin";
import { FAMILIES } from "@/lib/mock/data";
import { readStoreProfileData } from "@/lib/store-profile";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

type SellerProfileRow = {
  id: string;
  display_name: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
};

type ListingRow = {
  id: string;
  title: string;
  price_cents: number | null;
  thumbnail_url: string | null;
  platform: string | null;
  condition: string | null;
  family: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  listing_type: string | null;
};

function formatSellerLocation(profile: SellerProfileRow | null) {
  if (!profile) {
    return "Localizacao nao informada";
  }
  const label = `${profile.city ?? ""} ${profile.state ?? ""}`.trim();
  return label || "Localizacao nao informada";
}

function formatJoinDate(value: string | null) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString("pt-BR");
}

function resolveStoreImageUrl(
  admin: ReturnType<typeof createAdminClient>,
  path: string | null
) {
  if (!path) {
    return null;
  }
  return admin.storage.from("store-images").getPublicUrl(path).data.publicUrl;
}

export default async function SellerStorePage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const sellerId = decodeURIComponent(String(resolvedParams.id ?? "").trim());
  if (!sellerId) {
    redirect("/lojas");
  }

  const admin = createAdminClient();

  const familyLabelBySlug = Object.fromEntries(
    FAMILIES.map((family) => [family.slug, family.name])
  );

  const [{ data: sellerProfile }, followsCountResult, { data: listingsData }] =
    await Promise.all([
      admin
      .from("profiles")
      .select(
        "id, display_name, city, state, created_at"
      )
      .eq("id", sellerId)
      .maybeSingle(),
    admin
      .from("seller_follows")
      .select("id", { count: "exact", head: true })
      .eq("seller_user_id", sellerId),
    admin
      .from("listings")
      .select(
        "id, title, price_cents, thumbnail_url, platform, condition, family, shipping_available, free_shipping, listing_type"
      )
      .eq("seller_user_id", sellerId)
      .eq("status", "active")
      .or("moderation_status.eq.approved,moderation_status.eq.pending,moderation_status.is.null")
      .order("created_at", { ascending: false })
      .limit(48),
  ]);

  const seller = (sellerProfile ?? null) as SellerProfileRow | null;
  if (!seller) {
    redirect("/lojas");
  }

  const { data: sellerAuthData } = await admin.auth.admin.getUserById(sellerId);
  const storeProfile = readStoreProfileData(sellerAuthData.user?.user_metadata);
  const sellerName = seller?.display_name?.trim() || "Vendedor";
  const followerCount =
    typeof followsCountResult.count === "number" ? followsCountResult.count : 0;
  const listings = (listingsData ?? []) as ListingRow[];
  const storeAvatarUrl = resolveStoreImageUrl(admin, storeProfile.storeAvatarPath);
  const storeBannerUrl = resolveStoreImageUrl(admin, storeProfile.storeBannerPath);

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="relative h-44 w-full bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-700 sm:h-56">
          {storeBannerUrl ? (
            <img
              src={storeBannerUrl}
              alt={`Banner da loja ${sellerName}`}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-5 p-6 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-100 shadow-sm">
              {storeAvatarUrl ? (
                <img
                  src={storeAvatarUrl}
                  alt={`Logo da loja ${sellerName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-zinc-500">
                  {sellerName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Loja do vendedor
              </p>
              <h1 className="break-words text-2xl font-semibold text-zinc-900">
                {sellerName}
              </h1>
              <p className="text-sm text-zinc-600">{formatSellerLocation(seller)}</p>
              {storeProfile.storeBio?.trim() ? (
                <p className="max-w-3xl break-words text-sm text-zinc-700">
                  {storeProfile.storeBio}
                </p>
              ) : (
                <p className="max-w-3xl text-sm text-zinc-500">
                  Esta loja ainda nao adicionou uma descricao publica.
                </p>
              )}
              {seller.created_at ? (
                <p className="text-xs text-zinc-500">
                  No GANM OLS desde {formatJoinDate(seller.created_at)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <FollowSellerButton sellerUserId={sellerId} initialCount={followerCount} />
            <Link
              href="/buscar"
              className="h-fit rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
            >
              Buscar mais anuncios
            </Link>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Anuncios</h2>
          <span className="text-xs text-zinc-500">
            {listings.length} item{listings.length === 1 ? "" : "s"} na loja
          </span>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            Este vendedor ainda nao possui anuncios ativos.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                href={buildListingPath(listing.id, listing.title)}
                title={listing.title}
                priceCents={listing.price_cents}
                thumbnailUrl={listing.thumbnail_url}
                platformFallback={
                  listing.platform || familyLabelBySlug[listing.family ?? ""] || "Plataforma"
                }
                condition={listing.condition}
                shippingAvailable={listing.shipping_available}
                freeShipping={listing.free_shipping}
                familyLabel={
                  familyLabelBySlug[listing.family ?? ""] ?? listing.family ?? null
                }
                tag={listing.listing_type === "auction" ? "Lance" : undefined}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
