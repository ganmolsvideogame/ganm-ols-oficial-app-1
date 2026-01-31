import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const AUCTION_DURATION_OPTIONS = [1, 3, 5, 7, 10] as const;
export const AUCTION_PAYMENT_WINDOW_DAYS = 4;

export async function closeExpiredAuctions() {
  const admin = createAdminClient();
  const { error } = await admin.rpc("close_expired_auctions");
  if (error) {
    console.error("close_expired_auctions failed", error.message);
  }
}

export async function closeAuctionById(listingId: string, closedBy?: string | null) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("close_auction", {
    p_listing_id: listingId,
    closed_by: closedBy ?? null,
  });
  return { data, error };
}

export async function placeProxyBid(listingId: string, maxAmountCents: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_proxy_bid", {
    p_listing_id: listingId,
    p_max_amount_cents: maxAmountCents,
  });
  return { data, error };
}
