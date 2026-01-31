import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ListingLite = {
  id: string;
  title: string | null;
  price_cents: number | null;
  thumbnail_url: string | null;
  status: string | null;
  listing_type: string | null;
  quantity_available: number | null;
};

type ListingRelation = ListingLite | ListingLite[] | null;

type CartItemRow = {
  id: string;
  listing_id: string;
  quantity: number | null;
  listings: ListingRelation;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: cart, error: cartError } = await admin
    .from("carts")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (cartError) {
    return NextResponse.json({ error: cartError.message }, { status: 400 });
  }

  if (!cart?.id) {
    return NextResponse.json({ cart_id: null, items: [] });
  }

  const { data: items, error: itemsError } = await admin
    .from("cart_items")
    .select(
      "id, listing_id, quantity, listings(id, title, price_cents, thumbnail_url, status, listing_type, quantity_available)"
    )
    .eq("cart_id", cart.id);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  const cartItems = (items ?? []) as CartItemRow[];
  const normalizedItems = cartItems.map((item) => {
    const listing = Array.isArray(item.listings)
      ? (item.listings[0] ?? null)
      : (item.listings ?? null);

    return {
      ...item,
      listings: listing ? [listing] : null,
    };
  });

  return NextResponse.json({
    cart_id: cart.id,
    items: normalizedItems,
  });
}
