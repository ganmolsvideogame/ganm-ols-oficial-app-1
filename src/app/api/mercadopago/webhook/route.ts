import { NextResponse } from "next/server";

import { createPaymentClient } from "@/lib/mercadopago/client";
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

function getPaymentId(requestUrl: string, payload: unknown) {
  const searchParams = new URL(requestUrl).searchParams;
  const body = payload as Record<string, unknown>;
  const data = body?.data as Record<string, unknown> | undefined;
  const idFromBody = data?.id ?? body?.id;
  const idFromQuery = searchParams.get("id");
  const candidate = idFromBody ?? idFromQuery ?? "";
  return String(candidate).trim();
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

async function handleWebhook(request: Request, payload: unknown) {
  const paymentId = getPaymentId(request.url, payload);
  if (!paymentId) {
    return NextResponse.json({ received: true });
  }

  const paymentClient = createPaymentClient();
  let payment: {
    status?: string;
    external_reference?: string;
    preference_id?: string;
    id?: string | number;
  };
  try {
    payment = await paymentClient.get({ id: paymentId });
  } catch {
    return NextResponse.json({ received: true });
  }

  const externalReference = payment.external_reference;
  if (!externalReference) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  await admin.from("webhook_events").insert({
    provider: "mercadopago",
    event_type: "payment",
    payload,
    status: "received",
  });
  const updatePayload: Record<string, unknown> = {
    status: payment.status ?? "pending",
    mp_payment_id: String(payment.id ?? paymentId),
    mp_preference_id: payment.preference_id ?? null,
  };
  const { data: directOrder } = await admin
    .from("orders")
    .select("id, approved_at")
    .eq("id", externalReference)
    .maybeSingle();
  const { data: cartCheckout } = directOrder
    ? { data: null }
    : await admin
        .from("cart_checkouts")
        .select("id, approved_at, order_ids")
        .eq("id", externalReference)
        .maybeSingle();

  if (!directOrder && !cartCheckout) {
    return NextResponse.json({ received: true });
  }

  let shouldNotifyApproval = false;
  let approvedAt: Date | null = null;
  if (payment.status === "approved") {
    const alreadyApproved = directOrder
      ? Boolean(directOrder.approved_at)
      : Boolean(cartCheckout?.approved_at);
    if (!alreadyApproved) {
      approvedAt = new Date();
      updatePayload.approved_at = approvedAt.toISOString();
      updatePayload.payout_status = "hold";
      updatePayload.shipping_post_deadline_at = new Date(
        approvedAt.getTime() + SELLER_POST_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      shouldNotifyApproval = true;
    }
  }

  const orderIds = directOrder
    ? [directOrder.id]
    : (cartCheckout?.order_ids ?? []);

  if (orderIds.length > 0) {
    await admin.from("orders").update(updatePayload).in("id", orderIds);
  }

  if (cartCheckout) {
    await admin
      .from("cart_checkouts")
      .update({
        status: payment.status ?? "pending",
        mp_payment_id: String(payment.id ?? paymentId),
        mp_preference_id: payment.preference_id ?? null,
        approved_at: approvedAt ? approvedAt.toISOString() : cartCheckout.approved_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cartCheckout.id);
  }

  const { data: ordersData } = orderIds.length
    ? await admin
        .from("orders")
        .select(
          "id, buyer_user_id, seller_user_id, listing_id, shipping_service_id, shipping_status, superfrete_id, superfrete_tag_id, superfrete_status, superfrete_tracking, quantity"
        )
        .in("id", orderIds)
    : { data: [] };
  const orders = ordersData ?? [];
  const order = orders[0] ?? null;

  if (shouldNotifyApproval) {
    for (const approvedOrder of orders) {
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
      const { data: listing } = approvedOrder.listing_id
        ? await admin
            .from("listings")
            .select("title")
            .eq("id", approvedOrder.listing_id)
            .maybeSingle()
        : { data: null };
      const title = listing?.title ?? "seu pedido";
      const link = approvedOrder.listing_id
        ? `/produto/${approvedOrder.listing_id}`
        : null;

      if (approvedOrder.buyer_user_id) {
        notifications.push({
          user_id: approvedOrder.buyer_user_id,
          title: "Pagamento aprovado",
          body: `Pagamento confirmado para ${title}.`,
          link,
          type: "orders",
        });
      }
      if (approvedOrder.seller_user_id) {
        notifications.push({
          user_id: approvedOrder.seller_user_id,
          title: "Venda aprovada",
          body: `Pagamento confirmado para ${title}.`,
          link,
          type: "orders",
        });
      }
      adminIds.forEach((adminId) => {
        notifications.push({
          user_id: adminId,
          title: "Pagamento aprovado",
          body: `Pagamento confirmado para ${title}.`,
          link,
          type: "orders",
        });
      });
    }

    if (notifications.length > 0) {
      await admin.from("notifications").insert(notifications);
    }
  }

  if (payment.status === "approved") {
    for (const paidOrder of orders) {
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
            const printLink = await getPrintLink(tagId);
            const printUrl = printLink.url || info.printUrl;
            await admin
              .from("orders")
              .update({
                superfrete_status: info.status ?? "released",
                superfrete_tracking: info.tracking,
                superfrete_print_url: printUrl,
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
                superfrete_raw_info: { error: message },
                superfrete_last_error: message,
              })
              .eq("id", paidOrder.id);
          }
        }
      }
    }
  }

  const cancelStatuses = new Set([
    "refunded",
    "cancelled",
    "canceled",
    "charged_back",
  ]);

  if (payment.status && cancelStatuses.has(payment.status)) {
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
