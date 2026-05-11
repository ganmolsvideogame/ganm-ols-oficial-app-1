import { NextResponse } from "next/server";

import { createPaymentClient } from "@/lib/mercadopago/client";
import { cancelPayment } from "@/lib/mercadopago/cancel";
import { getMercadoPagoAccessToken } from "@/lib/mercadopago/env";
import { refundPayment } from "@/lib/mercadopago/refund";
import {
  sendBrevoApprovedOrderEmails,
  sendBrevoShippingUpdateEmails,
} from "@/lib/brevo/order-emails";
import { buildMetaCatalogListingId } from "@/lib/analytics/metaCatalog";
import { sendMetaPurchaseEvent } from "@/lib/analytics/metaConversions";
import { createAdminClient } from "@/lib/supabase/admin";
import { SELLER_POST_DAYS } from "@/lib/config/commerce";
import {
  cancelLabel,
  checkoutLabel,
  createCartLabel,
  getOrderInfo,
  getPrintLink,
} from "@/lib/superfrete/api";
import { resolvePackageDimensions } from "@/lib/shipping/presets";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

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

function getPaymentId(requestUrl: string, payload: unknown) {
  const searchParams = new URL(requestUrl).searchParams;
  const body = payload as Record<string, unknown>;
  const data = body?.data as Record<string, unknown> | undefined;
  const idFromBody = data?.id ?? body?.id;
  const idFromQuery =
    searchParams.get("id") ??
    searchParams.get("payment_id") ??
    searchParams.get("data.id") ??
    searchParams.get("data[id]");
  const resource = searchParams.get("resource");
  let idFromResource: string | null = null;
  if (resource) {
    const match = resource.match(/payments\/(\d+)/);
    if (match) {
      idFromResource = match[1];
    }
  }
  const candidate = idFromBody ?? idFromQuery ?? idFromResource ?? "";
  return String(candidate).trim();
}

function getMerchantOrderId(requestUrl: string, payload: unknown) {
  const searchParams = new URL(requestUrl).searchParams;
  const body = payload as Record<string, unknown>;
  const data = body?.data as Record<string, unknown> | undefined;
  const idFromBody = data?.id ?? body?.id;
  const idFromQuery =
    searchParams.get("id") ??
    searchParams.get("merchant_order_id") ??
    searchParams.get("data.id") ??
    searchParams.get("data[id]");
  const resource = searchParams.get("resource");
  let idFromResource: string | null = null;
  if (resource) {
    const match = resource.match(/merchant_orders\/(\d+)/);
    if (match) {
      idFromResource = match[1];
    }
  }
  const candidate = idFromBody ?? idFromQuery ?? idFromResource ?? "";
  return String(candidate).trim();
}

function getTopic(requestUrl: string, payload: unknown) {
  const searchParams = new URL(requestUrl).searchParams;
  const body = payload as Record<string, unknown>;
  const action = typeof body?.action === "string" ? body.action : "";
  const actionPrefix = action ? action.split(".")[0] : "";
  const raw =
    searchParams.get("topic") ??
    searchParams.get("type") ??
    (typeof body?.type === "string" ? body.type : null) ??
    (typeof body?.topic === "string" ? body.topic : null) ??
    actionPrefix ??
    "payment";
  return String(raw).trim().toLowerCase();
}

async function fetchMerchantOrder(merchantOrderId: string) {
  const accessToken = getMercadoPagoAccessToken();
  const response = await fetch(
    `https://api.mercadopago.com/merchant_orders/${merchantOrderId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );
  if (!response.ok) {
    return null;
  }
  return response.json();
}

const DOC_REQUIRED_SERVICES = new Set(["3", "31"]);

function normalizeState(value: string) {
  return value.trim().toUpperCase();
}

function requireFullName(value: string, role: string) {
  const cleaned = value.trim();
  if (!cleaned || !cleaned.includes(" ")) {
    throw new Error(`Informe o nome completo do ${role}.`);
  }
  return cleaned;
}

function requireDistrict(value: string, role: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    throw new Error(`Informe o bairro do ${role}.`);
  }
  return cleaned;
}

function extractNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? match[1] : "";
}

function normalizeZipcode(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function asNonEmptyString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
}

async function processPayment(paymentId: string, payload: unknown, admin: ReturnType<typeof createAdminClient>) {
  const paymentClient = createPaymentClient();
  let payment: {
    status?: string;
    external_reference?: string;
    preference_id?: string;
    id?: string | number;
    metadata?: Record<string, unknown> | null;
    order?: { id?: string | number } | null;
  };
  try {
    payment = await paymentClient.get({ id: paymentId });
  } catch {
    return;
  }

  let externalReference = asNonEmptyString(payment.external_reference);
  const metadata = payment.metadata ?? {};
  if (!externalReference) {
    const metadataOrderId = asNonEmptyString(metadata.order_id);
    const metadataCheckoutId = asNonEmptyString(metadata.cart_checkout_id);
    externalReference = metadataOrderId || metadataCheckoutId;
  }

  if (!externalReference) {
    const merchantOrderId =
      payment.order?.id !== undefined && payment.order?.id !== null
        ? String(payment.order.id).trim()
        : "";
    if (merchantOrderId) {
      const merchantOrder = await fetchMerchantOrder(merchantOrderId);
      externalReference = asNonEmptyString(merchantOrder?.external_reference);
      if (!externalReference) {
        const payments = Array.isArray(merchantOrder?.payments)
          ? merchantOrder.payments
          : [];
        const currentPayment = payments.find(
          (candidate: { id?: unknown; external_reference?: unknown }) =>
            String(candidate?.id ?? "").trim() === paymentId
        );
        if (currentPayment) {
          externalReference =
            asNonEmptyString(currentPayment.external_reference) ||
            externalReference;
        }
      }
    }
  }

  if (!externalReference && payment.preference_id) {
    const { data: orderByPreference } = await admin
      .from("orders")
      .select("id")
      .eq("mp_preference_id", payment.preference_id)
      .maybeSingle();
    externalReference = orderByPreference?.id ?? null;
  }

  if (!externalReference && payment.preference_id) {
    const { data: checkoutByPreference } = await admin
      .from("cart_checkouts")
      .select("id")
      .eq("mp_preference_id", payment.preference_id)
      .maybeSingle();
    externalReference = checkoutByPreference?.id ?? null;
  }

  if (!externalReference) {
    return;
  }

  const mpPaymentId = String(payment.id ?? paymentId);
  const mpPreferenceId = payment.preference_id ?? null;
  const mpUpdatePayload: Record<string, unknown> = {
    mp_payment_id: mpPaymentId,
    mp_preference_id: mpPreferenceId,
  };
  const statusUpdatePayload: Record<string, unknown> = {
    ...mpUpdatePayload,
    status: payment.status ?? "pending",
  };
  const { data: directOrder } = await admin
    .from("orders")
    .select("id, approved_at, status, cancel_status")
    .eq("id", externalReference)
    .maybeSingle();
  const { data: cartCheckout } = directOrder
    ? { data: null }
    : await admin
        .from("cart_checkouts")
        .select("id, approved_at, order_ids, status")
        .eq("id", externalReference)
        .maybeSingle();

  if (!directOrder && !cartCheckout) {
    return NextResponse.json({ received: true });
  }

  const orderIds = directOrder
    ? [directOrder.id]
    : (cartCheckout?.order_ids ?? []);

  const { data: orderStatesData } = orderIds.length
    ? await admin
        .from("orders")
        .select("id, status, cancel_status")
        .in("id", orderIds)
    : { data: [] };
  const orderStates = orderStatesData ?? [];
  const activeOrderIds = orderStates
    .filter((row) => !isCancelledOrder(row))
    .map((row) => row.id);
  const allOrdersCancelled =
    orderStates.length > 0 && activeOrderIds.length === 0;

  let shouldNotifyApproval = false;
  let approvedAt: Date | null = null;
  if (payment.status === "approved" && activeOrderIds.length > 0) {
    const alreadyApproved = directOrder
      ? Boolean(directOrder.approved_at)
      : Boolean(cartCheckout?.approved_at);
    if (!alreadyApproved) {
      approvedAt = new Date();
      statusUpdatePayload.approved_at = approvedAt.toISOString();
      statusUpdatePayload.payout_status = "hold";
      statusUpdatePayload.shipping_post_deadline_at = new Date(
        approvedAt.getTime() + SELLER_POST_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      shouldNotifyApproval = true;
    }
  }

  // Never resurrect a previously-cancelled order because of a late webhook.
  if (orderIds.length > 0) {
    await admin.from("orders").update(mpUpdatePayload).in("id", orderIds);
  }
  if (activeOrderIds.length > 0) {
    await admin
      .from("orders")
      .update(statusUpdatePayload)
      .in("id", activeOrderIds);
  }

  if (cartCheckout) {
    const currentStatus = normalizeStatus(cartCheckout.status);
    const checkoutStatus = allOrdersCancelled
      ? "cancelled"
      : currentStatus === "cancelled" || currentStatus === "canceled"
        ? cartCheckout.status
        : payment.status ?? "pending";

    await admin
      .from("cart_checkouts")
      .update({
        status: checkoutStatus,
        mp_payment_id: mpPaymentId,
        mp_preference_id: mpPreferenceId,
        approved_at:
          !allOrdersCancelled && approvedAt
            ? approvedAt.toISOString()
            : cartCheckout.approved_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cartCheckout.id);
  }

  const { data: ordersData } = orderIds.length
    ? await admin
        .from("orders")
        .select(
          "id, status, cancel_status, buyer_user_id, seller_user_id, listing_id, amount_cents, shipping_service_id, shipping_status, shipping_tracking, superfrete_id, superfrete_tag_id, superfrete_status, superfrete_tracking, superfrete_print_url, quantity"
        )
        .in("id", orderIds)
    : { data: [] };
  const orders = ordersData ?? [];

  if (payment.status === "approved") {
    await sendBrevoApprovedOrderEmails(
      admin,
      orders.map((order) => ({
        id: order.id,
        buyer_user_id: order.buyer_user_id,
        seller_user_id: order.seller_user_id,
        listing_id: order.listing_id,
        amount_cents: order.amount_cents,
        quantity: order.quantity,
      }))
    );
  }

  if (payment.status === "approved") {
    const candidateOrders = orders.filter(
      (row) => !isCancelledOrder(row) && Boolean(row.buyer_user_id)
    );

    if (candidateOrders.length > 0) {
      const candidateOrderIds = candidateOrders.map((row) => row.id);
      const { data: existingMetaEvents } = await admin
        .from("payment_events")
        .select("order_id")
        .eq("provider", "meta")
        .eq("event_type", "purchase")
        .in("order_id", candidateOrderIds);

      const alreadySent = new Set(
        (existingMetaEvents ?? [])
          .map((row) => row.order_id)
          .filter((value): value is string => Boolean(value))
      );

      const pendingOrders = candidateOrders.filter(
        (row) => !alreadySent.has(row.id)
      );

      if (pendingOrders.length > 0) {
        const buyerIds = Array.from(
          new Set(
            pendingOrders
              .map((row) => String(row.buyer_user_id ?? "").trim())
              .filter(Boolean)
          )
        );

        type BuyerProfile = {
          id: string;
          email: string | null;
          phone: string | null;
        };

        const { data: buyerProfilesData } = buyerIds.length
          ? await admin
              .from("profiles")
              .select("id, email, phone")
              .in("id", buyerIds)
          : { data: [] };

        const buyerProfiles = (buyerProfilesData ?? []) as BuyerProfile[];
        const buyerProfileMap = new Map(
          buyerProfiles.map((profile) => [profile.id, profile])
        );
        const eventTime = approvedAt
          ? Math.floor(approvedAt.getTime() / 1000)
          : Math.floor(Date.now() / 1000);
        const leadId = /^\d+$/.test(mpPaymentId) ? Number(mpPaymentId) : mpPaymentId;

        for (const orderRow of pendingOrders) {
          const buyerId = String(orderRow.buyer_user_id ?? "").trim();
          const buyerProfile = buyerProfileMap.get(buyerId);
          const buyerEmail = String(buyerProfile?.email ?? "")
            .trim()
            .toLowerCase();
          const buyerPhone = String(buyerProfile?.phone ?? "").trim();

          if (!buyerEmail) {
            await admin.from("payment_events").insert({
              order_id: orderRow.id,
              provider: "meta",
              event_type: "purchase",
              status: "skipped",
              payload: {
                payment_id: mpPaymentId,
                reason: "missing_buyer_email",
              },
            });
            continue;
          }

          const quantity =
            typeof orderRow.quantity === "number" && orderRow.quantity > 0
              ? orderRow.quantity
              : 1;
          const totalValue = Number(
            (((orderRow.amount_cents ?? 0) as number) / 100).toFixed(2)
          );
          const contentId = orderRow.listing_id
            ? buildMetaCatalogListingId(orderRow.listing_id)
            : "";
          const itemPrice =
            quantity > 0 ? Number((totalValue / quantity).toFixed(2)) : totalValue;

          const metaResult = await sendMetaPurchaseEvent({
            email: buyerEmail,
            phone: buyerPhone || null,
            leadId,
            fbc: null,
            eventTime,
            eventId: `purchase_${mpPaymentId}_${orderRow.id}`,
            eventSourceUrl: process.env.APP_BASE_URL || undefined,
            attributionShare: "0.3",
            value: totalValue,
            currency: "BRL",
            contentIds: contentId ? [contentId] : undefined,
            contentType: "product",
            contents: contentId
              ? [
                  {
                    id: contentId,
                    quantity,
                    item_price: itemPrice,
                  },
                ]
              : undefined,
          });

          await admin.from("payment_events").insert({
            order_id: orderRow.id,
            provider: "meta",
            event_type: "purchase",
            status: metaResult.ok
              ? "success"
              : metaResult.skipped
                ? "skipped"
                : "error",
            payload: {
              payment_id: mpPaymentId,
              preference_id: mpPreferenceId,
              event_name: "Purchase",
              action_source: "website",
              meta: metaResult,
            },
          });
        }
      }
    }
  }

  const allCancelled =
    orders.length > 0 && orders.every((row) => isCancelledOrder(row));
  const paymentStatus = normalizeStatus(payment.status);

  // If the buyer canceled before the payment got approved/finished, make sure we
  // cancel/void (or refund) the Mercado Pago payment once we learn about it.
  if (allCancelled && paymentStatus) {
    const cancelableStatuses = new Set([
      "pending",
      "in_process",
      "in_mediation",
      "authorized",
    ]);

    if (paymentStatus === "approved") {
      const refund = await refundPayment(mpPaymentId);
      await admin.from("payment_events").insert(
        orders.map((row) => ({
          order_id: row.id,
          provider: "mercadopago",
          event_type: "refund",
          status: refund.ok ? "success" : "error",
          payload: refund.ok ? refund.data : { error: refund.error },
        }))
      );
    } else if (cancelableStatuses.has(paymentStatus)) {
      const cancel = await cancelPayment(mpPaymentId);
      await admin.from("payment_events").insert(
        orders.map((row) => ({
          order_id: row.id,
          provider: "mercadopago",
          event_type: "cancel",
          status: cancel.ok ? "success" : "error",
          payload: cancel.ok ? cancel.data : { error: cancel.error },
        }))
      );
    }
  }

  if (shouldNotifyApproval) {
    for (const approvedOrder of orders) {
      if (isCancelledOrder(approvedOrder)) {
        continue;
      }
      if (!approvedOrder.listing_id) {
        continue;
      }
      const { data: listing } = await admin
        .from("listings")
        .select("quantity_available, status")
        .eq("id", approvedOrder.listing_id)
        .maybeSingle();
      if (listing) {
        const currentQuantity =
          typeof listing.quantity_available === "number"
            ? listing.quantity_available
            : 1;
        const removeQuantity =
          typeof approvedOrder.quantity === "number" && approvedOrder.quantity > 0
            ? approvedOrder.quantity
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
          .eq("id", approvedOrder.listing_id);
      }
    }
  }

  if (shouldNotifyApproval) {
    const notifications = [];
    const { data: admins } = await admin.from("admins").select("user_id");
    const adminIds = (admins ?? [])
      .map((row) => row.user_id)
      .filter((id): id is string => Boolean(id));

    for (const approvedOrder of orders) {
      if (isCancelledOrder(approvedOrder)) {
        continue;
      }
      const { data: listing } = approvedOrder.listing_id
        ? await admin
            .from("listings")
            .select("title")
            .eq("id", approvedOrder.listing_id)
            .maybeSingle()
        : { data: null };
      const title = listing?.title ?? "seu pedido";
      const buyerLink = `/compras/${approvedOrder.id}`;
      const sellerLink = `/vender/vendas/${approvedOrder.id}`;
      const adminLink = `/painel-ganm-ols/pedidos`;

      if (approvedOrder.buyer_user_id) {
        notifications.push({
          user_id: approvedOrder.buyer_user_id,
          title: "Pagamento aprovado",
          body: `Pagamento confirmado para ${title}.`,
          link: buyerLink,
          type: "orders",
        });
      }
      if (approvedOrder.seller_user_id) {
        notifications.push({
          user_id: approvedOrder.seller_user_id,
          title: "Venda aprovada",
          body: `Pagamento confirmado para ${title}.`,
          link: sellerLink,
          type: "orders",
        });
      }
      adminIds.forEach((adminId) => {
        notifications.push({
          user_id: adminId,
          title: "Pagamento aprovado",
          body: `Pagamento confirmado para ${title}.`,
          link: adminLink,
          type: "orders",
        });
      });
    }

    if (notifications.length > 0) {
      await insertNotificationsWithPush(admin, notifications);
    }
  }

  if (payment.status === "approved") {
    for (const paidOrder of orders) {
      if (isCancelledOrder(paidOrder)) {
        continue;
      }
      let tagId = paidOrder.superfrete_tag_id || paidOrder.superfrete_id || null;

      if (!tagId) {
        try {
          const { data: listing } = paidOrder.listing_id
            ? await admin
                .from("listings")
                .select(
                  "title, price_cents, family, package_weight_grams, package_length_cm, package_width_cm, package_height_cm, shipping_available"
                )
                .eq("id", paidOrder.listing_id)
                .maybeSingle()
            : { data: null };
          if (!listing?.shipping_available) {
            tagId = null;
          } else if (!paidOrder.shipping_service_id) {
            throw new Error("Servico de frete nao informado.");
          } else {
            const { data: buyerProfile } = await admin
              .from("profiles")
              .select(
                "zipcode, address_line1, address_line2, district, city, state, phone, display_name, cpf_cnpj"
              )
              .eq("id", paidOrder.buyer_user_id)
              .maybeSingle();
            const { data: sellerProfile } = await admin
              .from("profiles")
              .select(
                "zipcode, address_line1, address_line2, district, city, state, phone, display_name"
              )
              .eq("id", paidOrder.seller_user_id)
              .maybeSingle();

            const buyerZip = normalizeZipcode(buyerProfile?.zipcode);
            const sellerZip = normalizeZipcode(sellerProfile?.zipcode);
            const buyerDoc = String(buyerProfile?.cpf_cnpj ?? "").trim();
            const serviceId = String(paidOrder.shipping_service_id ?? "").trim();
            const requiresDocument = DOC_REQUIRED_SERVICES.has(serviceId);
            if (requiresDocument && !buyerDoc) {
              throw new Error("Documento do comprador obrigatorio.");
            }

            const dimensions = resolvePackageDimensions({
              family: listing.family,
              package_weight_grams: listing.package_weight_grams,
              package_length_cm: listing.package_length_cm,
              package_width_cm: listing.package_width_cm,
              package_height_cm: listing.package_height_cm,
            });

            const payload: Record<string, unknown> = {
              platform: "GANM OLS",
              order: {
                id: paidOrder.id,
                description: listing.title,
              },
              service: Number.isFinite(Number(serviceId))
                ? Number(serviceId)
                : serviceId,
              from: {
                name: requireFullName(
                  String(sellerProfile?.display_name ?? ""),
                  "vendedor"
                ),
                phone: String(sellerProfile?.phone ?? "").trim(),
                postal_code: sellerZip,
                address: String(sellerProfile?.address_line1 ?? "").trim(),
                number: extractNumber(
                  String(sellerProfile?.address_line1 ?? "")
                ),
                district: requireDistrict(
                  String(sellerProfile?.district ?? ""),
                  "vendedor"
                ),
                city: String(sellerProfile?.city ?? "").trim(),
                state_abbr: normalizeState(String(sellerProfile?.state ?? "")),
                complement: String(sellerProfile?.address_line2 ?? "").trim() || "",
              },
              to: {
                name: requireFullName(
                  String(buyerProfile?.display_name ?? ""),
                  "comprador"
                ),
                phone: String(buyerProfile?.phone ?? "").trim(),
                postal_code: buyerZip,
                address: String(buyerProfile?.address_line1 ?? "").trim(),
                number: extractNumber(String(buyerProfile?.address_line1 ?? "")),
                district: requireDistrict(
                  String(buyerProfile?.district ?? ""),
                  "comprador"
                ),
                city: String(buyerProfile?.city ?? "").trim(),
                state_abbr: normalizeState(String(buyerProfile?.state ?? "")),
                complement: String(buyerProfile?.address_line2 ?? "").trim() || "",
                document: requiresDocument ? buyerDoc : undefined,
              },
              products: [
                {
                  name: listing.title,
                  quantity: paidOrder.quantity ?? 1,
                  unitary_value: (listing.price_cents ?? 0) / 100,
                },
              ],
              volumes: [
                {
                  height: dimensions.heightCm,
                  width: dimensions.widthCm,
                  length: dimensions.lengthCm,
                  weight: Math.max(
                    0.01,
                    Number((dimensions.weightGrams / 1000).toFixed(3))
                  ),
                },
              ],
              options: requiresDocument ? { non_commercial: true } : undefined,
            };

            const cart = await createCartLabel(payload);
            if (!cart.id) {
              throw new Error("Etiqueta nao criada.");
            }

            tagId = cart.id;
            await admin
              .from("orders")
              .update({
                superfrete_id: tagId,
                superfrete_tag_id: tagId,
                superfrete_status:
                  typeof cart.raw?.status === "string" ? cart.raw.status : "pending",
                superfrete_raw_cart: cart.raw ?? null,
                superfrete_last_error: null,
              })
              .eq("id", paidOrder.id);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Erro SuperFrete";
          await admin
            .from("orders")
            .update({
              superfrete_status: "error",
              superfrete_tracking: null,
              superfrete_print_url: null,
              superfrete_last_error: message,
              superfrete_raw_cart: { error: message },
            })
            .eq("id", paidOrder.id);
        }
      }

      if (tagId) {
        const alreadyReleased =
          paidOrder.superfrete_status === "released" ||
          Boolean(paidOrder.superfrete_tracking);
        if (!alreadyReleased) {
          try {
            await checkoutLabel({ id: tagId });
            const info = await getOrderInfo(tagId);
            const canPrint =
              String(info.status ?? "").toLowerCase() === "released" ||
              Boolean(info.tracking);
            const printLink = canPrint ? await getPrintLink(tagId) : null;
            const printUrl = canPrint
              ? printLink?.url || info.printUrl || null
              : null;
            const trackingCode = info.tracking || null;
            const currentShippingStatus = String(
              paidOrder.shipping_status ?? ""
            ).toLowerCase();
            const nextShippingStatus =
              currentShippingStatus === "delivered"
                ? paidOrder.shipping_status ?? "delivered"
                : trackingCode
                  ? "shipped"
                  : paidOrder.shipping_status ?? "pending";
            await admin
              .from("orders")
              .update({
                superfrete_status: info.status ?? (canPrint ? "released" : "pending"),
                superfrete_tracking: info.tracking,
                superfrete_print_url: printUrl,
                shipping_tracking: trackingCode,
                shipping_status: nextShippingStatus,
                superfrete_raw_info: info.raw,
                shipping_paid_at: new Date().toISOString(),
                superfrete_last_error: null,
              })
              .eq("id", paidOrder.id);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Erro SuperFrete";
            const isInsufficientBalance =
              message.includes("Sem saldo na carteira") ||
              message.toLowerCase().includes("saldo");
            const nextStatus = isInsufficientBalance ? "pending" : "error";
            await admin
              .from("orders")
              .update({
                superfrete_status: nextStatus,
                superfrete_tracking: null,
                superfrete_print_url: null,
                superfrete_raw_info: { error: message },
                superfrete_last_error: message,
              })
              .eq("id", paidOrder.id);
          }
        }
      }
    }
  }

  if (payment.status === "approved" && orderIds.length > 0) {
    const { data: refreshedOrdersData } = await admin
      .from("orders")
      .select(
        "id, buyer_user_id, seller_user_id, listing_id, shipping_status, shipping_tracking, superfrete_id, superfrete_status, superfrete_tracking, superfrete_print_url"
      )
      .in("id", orderIds);

    await sendBrevoShippingUpdateEmails(admin, refreshedOrdersData ?? []);
  }

  const cancelStatuses = new Set([
    "refunded",
    "cancelled",
    "canceled",
    "charged_back",
  ]);

  if (paymentStatus && cancelStatuses.has(paymentStatus)) {
    for (const canceledOrder of orders) {
      const tagId = canceledOrder.superfrete_tag_id || canceledOrder.superfrete_id;
      const shippingBlocked =
        canceledOrder.shipping_status === "shipped" ||
        canceledOrder.shipping_status === "delivered";

      if (!shippingBlocked) {
        await admin
          .from("orders")
          .update({ status: "cancelled", shipping_status: "cancelled" })
          .eq("id", canceledOrder.id);
      }

      if (tagId && !shippingBlocked) {
        try {
          const result = await cancelLabel(
            tagId,
            "Cancelamento/Reembolso do pedido no Marketplace"
          );
          await admin
            .from("orders")
            .update({
              superfrete_status: result.status ?? "cancelled",
              superfrete_tracking: null,
              superfrete_print_url: null,
              shipping_canceled_at: new Date().toISOString(),
              shipping_cancel_failed: false,
              shipping_manual_action: false,
              superfrete_last_error: null,
            })
            .eq("id", canceledOrder.id);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Erro SuperFrete";
          await admin
            .from("orders")
            .update({
              shipping_cancel_failed: true,
              superfrete_last_error: message,
            })
            .eq("id", canceledOrder.id);
        }
      } else if (tagId && shippingBlocked) {
        await admin
          .from("orders")
          .update({
            shipping_manual_action: true,
            superfrete_last_error: "Etiqueta ja postada; cancelamento manual.",
          })
          .eq("id", canceledOrder.id);
      }
    }
  }

  if (orders.length > 0) {
    await admin.from("payment_events").insert(
      orders.map((eventOrder) => ({
        order_id: eventOrder.id,
        provider: "mercadopago",
        event_type: "payment",
        status: payment.status ?? "pending",
        payload: {
          payment_id: payment.id ?? paymentId,
          preference_id: payment.preference_id ?? null,
          cart_checkout_id: cartCheckout?.id ?? null,
        },
      }))
    );
  } else {
    await admin.from("payment_events").insert({
      order_id: null,
      provider: "mercadopago",
      event_type: "payment",
      status: payment.status ?? "pending",
      payload: {
        payment_id: payment.id ?? paymentId,
        preference_id: payment.preference_id ?? null,
        cart_checkout_id: cartCheckout?.id ?? null,
      },
    });
  }

}

async function handleWebhook(request: Request, payload: unknown) {
  const admin = createAdminClient();
  const topic = getTopic(request.url, payload);
  await admin.from("webhook_events").insert({
    provider: "mercadopago",
    event_type: topic,
    payload,
    status: "received",
  });

  if (topic === "merchant_order") {
    const merchantOrderId = getMerchantOrderId(request.url, payload);
    if (!merchantOrderId) {
      return NextResponse.json({ received: true });
    }
    const merchantOrder = await fetchMerchantOrder(merchantOrderId);
    const payments = Array.isArray(merchantOrder?.payments)
      ? merchantOrder.payments
      : [];
    for (const payment of payments) {
      const id = payment?.id ? String(payment.id) : "";
      if (id) {
        await processPayment(id, payload, admin);
      }
    }
    return NextResponse.json({ received: true });
  }

  const paymentId = getPaymentId(request.url, payload);
  if (!paymentId) {
    return NextResponse.json({ received: true });
  }
  await processPayment(paymentId, payload, admin);
  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  let payload: unknown = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  return handleWebhook(request, payload);
}

export async function GET(request: Request) {
  return handleWebhook(request, {});
}
