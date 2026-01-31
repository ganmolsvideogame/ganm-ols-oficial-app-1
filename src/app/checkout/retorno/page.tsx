import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { SELLER_POST_DAYS } from "@/lib/config/commerce";

type SearchParams = {
  status?: string;
  collection_status?: string;
  payment_id?: string;
  collection_id?: string;
  preference_id?: string;
  external_reference?: string;
  order_id?: string;
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

type CartCheckoutRow = {
  id: string;
  approved_at: string | null;
  buyer_user_id: string | null;
  order_ids: string[] | null;
};

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const statusRaw =
    resolvedSearchParams?.status || resolvedSearchParams?.collection_status;
  const status = statusRaw ? statusRaw.toLowerCase() : "pending";
  const paymentId =
    resolvedSearchParams?.payment_id || resolvedSearchParams?.collection_id;
  const preferenceId = resolvedSearchParams?.preference_id;
  const externalReference = resolvedSearchParams?.external_reference;

  const admin = createAdminClient();
  const orderIdParam = resolvedSearchParams?.order_id;
  let orderId = orderIdParam ?? externalReference ?? null;
  let orderSnapshot: {
    id: string;
    approved_at: string | null;
    buyer_user_id: string | null;
    seller_user_id: string | null;
    listing_id: string | null;
    quantity?: number | null;
  } | null = null;
  let cartCheckoutSnapshot: CartCheckoutRow | null = null;

  if (!orderId && preferenceId) {
    const { data: orderByPreference } = await admin
      .from("orders")
      .select("id, approved_at, buyer_user_id, seller_user_id, listing_id")
      .eq("mp_preference_id", preferenceId)
      .maybeSingle();
    orderSnapshot = orderByPreference ?? null;
    orderId = orderByPreference?.id ?? null;
    if (!orderId) {
      const { data: cartByPreference } = await admin
        .from("cart_checkouts")
        .select("id, approved_at, buyer_user_id, order_ids")
        .eq("mp_preference_id", preferenceId)
        .maybeSingle();
      cartCheckoutSnapshot = cartByPreference ?? null;
      orderId = cartByPreference?.id ?? null;
    }
  }

  if (orderId) {
    try {
      if (!orderSnapshot) {
        const { data: order } = await admin
          .from("orders")
          .select("id, approved_at, buyer_user_id, seller_user_id, listing_id, quantity")
          .eq("id", orderId)
          .maybeSingle();
        orderSnapshot = order ?? null;
      }
      if (!orderSnapshot && !cartCheckoutSnapshot) {
        const { data: cartCheckout } = await admin
          .from("cart_checkouts")
          .select("id, approved_at, buyer_user_id, order_ids")
          .eq("id", orderId)
          .maybeSingle();
        cartCheckoutSnapshot = cartCheckout ?? null;
      }

      const updatePayload: Record<string, unknown> = {
        status,
        mp_payment_id: paymentId ?? null,
        mp_preference_id: preferenceId ?? null,
      };

      const approvedAt = status === "approved" ? new Date() : null;

      if (orderSnapshot) {
        if (status === "approved" && !orderSnapshot.approved_at) {
          updatePayload.approved_at = approvedAt?.toISOString();
          updatePayload.payout_status = "hold";
          updatePayload.shipping_post_deadline_at = new Date(
            (approvedAt ?? new Date()).getTime() + SELLER_POST_DAYS * 24 * 60 * 60 * 1000
          ).toISOString();
        }

        await admin.from("orders").update(updatePayload).eq("id", orderId);
      }

      if (cartCheckoutSnapshot) {
        const orderIds = cartCheckoutSnapshot.order_ids ?? [];
        const cartUpdate: Record<string, unknown> = {
          status,
          mp_payment_id: paymentId ?? null,
          mp_preference_id: preferenceId ?? null,
        };
        if (status === "approved" && !cartCheckoutSnapshot.approved_at) {
          cartUpdate.approved_at = approvedAt?.toISOString();
        }
        await admin.from("cart_checkouts").update(cartUpdate).eq("id", orderId);

        if (orderIds.length > 0) {
          if (status === "approved") {
            updatePayload.approved_at = approvedAt?.toISOString();
            updatePayload.payout_status = "hold";
            updatePayload.shipping_post_deadline_at = new Date(
              (approvedAt ?? new Date()).getTime() + SELLER_POST_DAYS * 24 * 60 * 60 * 1000
            ).toISOString();
          }
          await admin.from("orders").update(updatePayload).in("id", orderIds);

          if (status === "approved") {
            const { data: orders } = await admin
              .from("orders")
              .select("id, listing_id, buyer_user_id, seller_user_id, quantity")
              .in("id", orderIds);

            const notifications = [];

            for (const orderRow of orders ?? []) {
              if (!orderRow.listing_id) {
                continue;
              }
              const { data: listing } = await admin
                .from("listings")
                .select("title, quantity_available, status")
                .eq("id", orderRow.listing_id)
                .maybeSingle();
              if (listing) {
                const currentQuantity =
                  typeof listing.quantity_available === "number"
                    ? listing.quantity_available
                    : 1;
                const removeQuantity =
                  typeof orderRow.quantity === "number" && orderRow.quantity > 0
                    ? orderRow.quantity
                    : 1;
                const nextQuantity = Math.max(0, currentQuantity - removeQuantity);
                const listingUpdate: Record<string, unknown> = {
                  quantity_available: nextQuantity,
                };
                if (nextQuantity <= 0 && listing.status === "active") {
                  listingUpdate.status = "paused";
                }
                await admin
                  .from("listings")
                  .update(listingUpdate)
                  .eq("id", orderRow.listing_id);
              }

              const title = listing?.title ?? "seu pedido";
              const link = orderRow.listing_id
                ? `/produto/${orderRow.listing_id}`
                : null;
              if (orderRow.buyer_user_id) {
                notifications.push({
                  user_id: orderRow.buyer_user_id,
                  title: "Pagamento aprovado",
                  body: `Pagamento confirmado para ${title}.`,
                  link,
                });
              }
              if (orderRow.seller_user_id) {
                notifications.push({
                  user_id: orderRow.seller_user_id,
                  title: "Venda aprovada",
                  body: `Pagamento confirmado para ${title}.`,
                  link,
                });
              }
            }

            if (notifications.length > 0) {
              await admin.from("notifications").insert(notifications);
            }
          }
        }
      }
    } catch {
      // Ignore update errors on return page.
    }
  }

  const params = new URLSearchParams();
  params.set("status", status);
  if (externalReference) {
    params.set("order_id", externalReference);
  }
  redirect(`/compras?${params.toString()}`);
}
