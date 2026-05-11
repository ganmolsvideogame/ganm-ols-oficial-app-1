import Link from "next/link";

import FavoritesClient, { type FavoriteRow } from "@/components/favorites/FavoritesClient";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Favoritos</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Entre para salvar seus produtos favoritos.
          </p>
        </div>
        <Link
          href="/entrar"
          className="inline-flex rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Entrar na conta
        </Link>
      </div>
    );
  }

  const { data: favoritesData } = await admin
    .from("listing_favorites")
    .select(
      "id, listing_id, created_at, listings(id, title, price_cents, thumbnail_url, platform, family, condition, shipping_available, free_shipping, status)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const favorites = (favoritesData ?? []) as FavoriteRow[];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">Favoritos</h1>
        <p className="text-sm text-zinc-600">
          Itens salvos para acompanhar precos e disponibilidade.
        </p>
      </div>

      <FavoritesClient initial={favorites} />
    </div>
  );
}
