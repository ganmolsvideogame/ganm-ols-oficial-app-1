import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ListingCheckout = {
  id: string;
  title: string | null;
  price_cents: number | null;
  thumbnail_url: string | null;
  status: string | null;
  listing_type: string | null;
  seller_user_id: string | null;
  shipping_available: boolean | null;
  free_shipping: boolean | null;
  quantity_available: number | null;
  family: string | null;
  package_weight_grams: number | null;
  package_length_cm: number | null;
  package_width_cm: number | null;
  package_height_cm: number | null;
};

type ListingRelation = ListingCheckout | ListingCheckout[] | null;

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
      "id, listing_id, quantity, listings(id, title, price_cents, thumbnail_url, status, listing_type, seller_user_id, shipping_available, free_shipping, quantity_available, family, package_weight_grams, package_length_cm, package_width_cm, package_height_cm)"
    )
    .eq("cart_id", cart.id);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 400 });
  }

  const cartItems = (items ?? []) as unknown as CartItemRow[];
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
