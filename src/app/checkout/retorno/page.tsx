import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { SELLER_POST_DAYS } from "@/lib/config/commerce";
import { createPaymentClient } from "@/lib/mercadopago/client";
import { cancelPayment } from "@/lib/mercadopago/cancel";
import { refundPayment } from "@/lib/mercadopago/refund";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

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
  status?: string | null;
};

function normalizeStatus(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isCancelledOrder(row: { status?: unknown; cancel_status?: unknown }) {
  const status = normalizeStatus(row.status);
  return (
    status === "cancelled" ||
    status === "canceled" ||
    String(row.cancel_status ?? "").trim().toLowerCase() === "approved"
  );
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const statusRaw =
    resolvedSearchParams?.status || resolvedSearchParams?.collection_status;
  let status = statusRaw ? statusRaw.toLowerCase() : "pending";
  const paymentId =
    resolvedSearchParams?.payment_id || resolvedSearchParams?.collection_id;
  let preferenceId = resolvedSearchParams?.preference_id ?? null;
  let externalReference = resolvedSearchParams?.external_reference ?? null;

  if (paymentId) {
    try {
      const paymentClient = createPaymentClient();
      const payment = (await paymentClient.get({ id: paymentId })) as {
        status?: string | null;
        external_reference?: string | null;
        preference_id?: string | null;
        metadata?: Record<string, unknown> | null;
      };

      if (payment.status) {
        status = String(payment.status).toLowerCase();
      }
      if (!externalReference && payment.external_reference) {
        externalReference = String(payment.external_reference);
      }
      if (!preferenceId && payment.preference_id) {
        preferenceId = String(payment.preference_id);
      }

      const metadata = payment.metadata ?? {};
      if (!externalReference) {
        const metadataOrderId =
          metadata && typeof metadata.order_id === "string"
            ? metadata.order_id
            : null;
        const metadataCheckoutId =
          metadata && typeof metadata.cart_checkout_id === "string"
            ? metadata.cart_checkout_id
            : null;
        externalReference = metadataOrderId || metadataCheckoutId || null;
      }
    } catch {
      // Keep URL params fallback if payment lookup fails.
    }
  }

  const admin = createAdminClient();
  const orderIdParam = resolvedSearchParams?.order_id;
  let orderId = orderIdParam ?? externalReference ?? null;
  let orderSnapshot: {
    id: string;
    approved_at: string | null;
    status?: string | null;
    cancel_status?: string | null;
    buyer_user_id: string | null;
    seller_user_id: string | null;
    listing_id: string | null;
    quantity?: number | null;
  } | null = null;
  let cartCheckoutSnapshot: CartCheckoutRow | null = null;

  if (!orderId && preferenceId) {
    const { data: orderByPreference } = await admin
      .from("orders")
      .select(
        "id, approved_at, status, cancel_status, buyer_user_id, seller_user_id, listing_id, quantity"
      )
      .eq("mp_preference_id", preferenceId)
      .maybeSingle();
    orderSnapshot = orderByPreference ?? null;
    orderId = orderByPreference?.id ?? null;
    if (!orderId) {
      const { data: cartByPreference } = await admin
        .from("cart_checkouts")
        .select("id, approved_at, buyer_user_id, order_ids, status")
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
          .select(
            "id, approved_at, status, cancel_status, buyer_user_id, seller_user_id, listing_id, quantity"
          )
          .eq("id", orderId)
          .maybeSingle();
        orderSnapshot = order ?? null;
      }
      if (!orderSnapshot && !cartCheckoutSnapshot) {
        const { data: cartCheckout } = await admin
          .from("cart_checkouts")
          .select("id, approved_at, buyer_user_id, order_ids, status")
          .eq("id", orderId)
          .maybeSingle();
        cartCheckoutSnapshot = cartCheckout ?? null;
      }

      const mpUpdatePayload: Record<string, unknown> = {
        mp_payment_id: paymentId ?? null,
        mp_preference_id: preferenceId ?? null,
      };
      const statusUpdatePayload: Record<string, unknown> = {
        ...mpUpdatePayload,
        status,
      };

      const approvedAt = status === "approved" ? new Date() : null;

      if (orderSnapshot) {
        const cancelled = isCancelledOrder(orderSnapshot);

        // Never resurrect a cancelled order because of a late return URL.
        if (cancelled) {
          await admin.from("orders").update(mpUpdatePayload).eq("id", orderId);

          if (paymentId) {
            const cancelableStatuses = new Set([
              "pending",
              "in_process",
              "in_mediation",
              "authorized",
            ]);
            const normalized = normalizeStatus(status);
            if (normalized === "approved") {
              await refundPayment(String(paymentId));
            } else if (cancelableStatuses.has(normalized)) {
              await cancelPayment(String(paymentId));
            }
          }
        } else {
          if (status === "approved" && !orderSnapshot.approved_at) {
            statusUpdatePayload.approved_at = approvedAt?.toISOString();
            statusUpdatePayload.payout_status = "hold";
            statusUpdatePayload.shipping_post_deadline_at = new Date(
              (approvedAt ?? new Date()).getTime() +
                SELLER_POST_DAYS * 24 * 60 * 60 * 1000
            ).toISOString();
          }

          await admin.from("orders").update(statusUpdatePayload).eq("id", orderId);

          if (status === "approved" && !orderSnapshot.approved_at) {
          const notifications = [];
          let listingTitle = "seu pedido";
          const link = orderSnapshot.listing_id
            ? `/produto/${orderSnapshot.listing_id}`
            : null;

          if (orderSnapshot.listing_id) {
            const { data: listing } = await admin
              .from("listings")
              .select("title, quantity_available, status")
              .eq("id", orderSnapshot.listing_id)
              .maybeSingle();

            if (listing) {
              listingTitle = listing.title ?? listingTitle;
              const currentQuantity =
                typeof listing.quantity_available === "number"
                  ? listing.quantity_available
                  : 1;
              const removeQuantity =
                typeof orderSnapshot.quantity === "number" &&
                orderSnapshot.quantity > 0
                  ? orderSnapshot.quantity
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
                .eq("id", orderSnapshot.listing_id);
            }
          }

          if (orderSnapshot.buyer_user_id) {
            notifications.push({
              user_id: orderSnapshot.buyer_user_id,
              title: "Pagamento aprovado",
              body: `Pagamento confirmado para ${listingTitle}.`,
              link,
            });
          }

          if (orderSnapshot.seller_user_id) {
            notifications.push({
              user_id: orderSnapshot.seller_user_id,
              title: "Venda aprovada",
              body: `Pagamento confirmado para ${listingTitle}.`,
              link: "/vender",
            });
          }

          const { data: admins } = await admin.from("admins").select("user_id");
          const adminIds = (admins ?? [])
            .map((row) => row.user_id)
            .filter((id): id is string => Boolean(id));

          adminIds.forEach((adminId) => {
            notifications.push({
              user_id: adminId,
              title: "Pagamento aprovado",
              body: `Pagamento confirmado para ${listingTitle}.`,
              link: "/painel-ganm-ols/controle",
            });
          });

          if (notifications.length > 0) {
            await insertNotificationsWithPush(admin, notifications);
          }
          }
        }
      }

      if (cartCheckoutSnapshot) {
        const orderIds = cartCheckoutSnapshot.order_ids ?? [];

        const { data: cartOrdersData } = orderIds.length
          ? await admin
              .from("orders")
              .select(
                "id, approved_at, status, cancel_status, listing_id, buyer_user_id, seller_user_id, quantity"
              )
              .in("id", orderIds)
          : { data: [] };
        const cartOrders = cartOrdersData ?? [];
        const activeCartOrders = cartOrders.filter(
          (row) => !isCancelledOrder(row)
        );
        const activeOrderIds = activeCartOrders.map((row) => row.id);
        const allCancelled =
          cartOrders.length > 0 && activeOrderIds.length === 0;

        const currentStatus = normalizeStatus(cartCheckoutSnapshot.status);
        const checkoutStatus = allCancelled
          ? "cancelled"
          : currentStatus === "cancelled" || currentStatus === "canceled"
            ? cartCheckoutSnapshot.status
            : status;

        const cartUpdate: Record<string, unknown> = {
          status: checkoutStatus,
          mp_payment_id: paymentId ?? null,
          mp_preference_id: preferenceId ?? null,
        };
        if (!allCancelled && status === "approved" && !cartCheckoutSnapshot.approved_at) {
          cartUpdate.approved_at = approvedAt?.toISOString();
        }
        await admin.from("cart_checkouts").update(cartUpdate).eq("id", orderId);

        if (orderIds.length > 0) {
          await admin.from("orders").update(mpUpdatePayload).in("id", orderIds);

          if (activeOrderIds.length > 0) {
            const orderStatusUpdate: Record<string, unknown> = {
              ...statusUpdatePayload,
            };
            if (!allCancelled && status === "approved" && !cartCheckoutSnapshot.approved_at) {
              orderStatusUpdate.approved_at = approvedAt?.toISOString();
              orderStatusUpdate.payout_status = "hold";
              orderStatusUpdate.shipping_post_deadline_at = new Date(
                (approvedAt ?? new Date()).getTime() +
                  SELLER_POST_DAYS * 24 * 60 * 60 * 1000
              ).toISOString();
            }
            await admin.from("orders").update(orderStatusUpdate).in("id", activeOrderIds);
          }

          if (allCancelled && paymentId) {
            const cancelableStatuses = new Set([
              "pending",
              "in_process",
              "in_mediation",
              "authorized",
            ]);
            const normalized = normalizeStatus(status);
            if (normalized === "approved") {
              await refundPayment(String(paymentId));
            } else if (cancelableStatuses.has(normalized)) {
              await cancelPayment(String(paymentId));
            }
          }

          if (!allCancelled && status === "approved" && !cartCheckoutSnapshot.approved_at) {
            const notifications = [];

            for (const orderRow of activeCartOrders) {
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
              await insertNotificationsWithPush(admin, notifications);
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
  if (orderId) {
    params.set("order_id", orderId);
  }
  redirect(`/checkout/finalizado?${params.toString()}`);
}
