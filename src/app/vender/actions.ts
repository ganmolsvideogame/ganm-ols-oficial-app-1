"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";

import { sendAdminListingAlertEmail } from "@/lib/brevo/admin-alerts";
import { sendSellerProfileCompletionReminder } from "@/lib/brevo/seller-profile-reminders";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  collectMissingSellerProfileItems,
  readStoreProfileData,
} from "@/lib/store-profile";
import { formatCentsToBRL, parsePriceToCents } from "@/lib/utils/price";
import { AUCTION_DURATION_OPTIONS } from "@/lib/auctions";
import {
  DEFAULT_AUCTION_INCREMENT_PERCENT,
  MIN_LISTING_PRICE_CENTS,
} from "@/lib/config/commerce";
import { resolvePackageDimensions } from "@/lib/shipping/presets";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

function getExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "jpg";
}

function normalizeZipcode(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
}

function joinReadableList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} e ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function buildAccountCompletionHref(message: string, returnTo: string) {
  const params = new URLSearchParams();
  params.set("error", message);
  params.set("return_to", returnTo);
  params.set("onboarding", "seller");
  return `/conta?${params.toString()}#dados-vendedor`;
}

export async function createListingAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, phone, address_line1, district, city, state, zipcode")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirect(`/vender?error=${encodeURIComponent(profileError.message)}`);
  }

  if (profile?.role !== "seller") {
    redirect("/vender?error=Seu+perfil+ainda+nao+e+vendedor");
  }

  const title = String(formData.get("title") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const condition = String(formData.get("condition") ?? "").trim();
  const family = String(formData.get("family") ?? "").trim();
  const platform = String(formData.get("platform") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const listingTypeRaw = String(formData.get("listing_type") ?? "now").trim();
  const listingType = listingTypeRaw === "auction" ? "auction" : "now";
  const shippingAvailable = true;
  const freeShipping =
    shippingAvailable && formData.get("free_shipping") === "on";
  const sellerName = String(formData.get("seller_name") ?? "").trim();
  const quantityRaw = String(formData.get("quantity_available") ?? "1").trim();
  const quantityParsed = Number.parseInt(quantityRaw, 10);
  const quantityAvailable = Number.isFinite(quantityParsed)
    ? Math.max(1, quantityParsed)
    : 1;
  const auctionIncrementRaw = String(
    formData.get("auction_increment_percent") ?? ""
  ).trim();
  const auctionIncrementParsed = Number.parseInt(auctionIncrementRaw, 10);
  const auctionIncrementPercent = Number.isFinite(auctionIncrementParsed)
    ? Math.max(1, auctionIncrementParsed)
    : DEFAULT_AUCTION_INCREMENT_PERCENT;
  const auctionDurationRaw = String(
    formData.get("auction_duration_days") ?? ""
  ).trim();
  const auctionDurationParsed = Number.parseInt(auctionDurationRaw, 10);
  const auctionDurationDays = AUCTION_DURATION_OPTIONS.includes(
    auctionDurationParsed as (typeof AUCTION_DURATION_OPTIONS)[number]
  )
    ? auctionDurationParsed
    : 7;
  const auctionEndRaw = String(formData.get("auction_end_at") ?? "").trim();
  const uploads = formData
    .getAll("images")
    .filter((file): file is File => file instanceof File && file.size > 0);

  const draftParams = new URLSearchParams();
  [
    ["kind", String(formData.get("kind") ?? "").trim()],
    ["family", family],
    ["platform", platform],
    ["title", title],
    ["model", model],
    ["seller_name", sellerName],
    ["description", description],
    ["price", priceRaw],
    ["quantity_available", quantityRaw],
    ["condition", condition],
    ["listing_type", listingType],
    ["auction_increment_percent", auctionIncrementRaw],
    ["auction_duration_days", auctionDurationRaw],
    ["auction_end_at", auctionEndRaw],
    ["free_shipping", freeShipping ? "on" : ""],
  ].forEach(([key, value]) => {
    if (value) {
      draftParams.set(key, value);
    }
  });

  const publishDraftHref = `/vender/anunciar/publicar${
    draftParams.size > 0 ? `?${draftParams.toString()}` : ""
  }`;
  const buildPublishErrorHref = (message: string) =>
    `${publishDraftHref}${publishDraftHref.includes("?") ? "&" : "?"}error=${encodeURIComponent(
      message
    )}`;

  const priceCents = parsePriceToCents(priceRaw);
  const missingSellerAddressFields = [
    !String(profile?.address_line1 ?? "").trim() ? "endereco" : null,
    !String(profile?.district ?? "").trim() ? "bairro" : null,
    !String(profile?.city ?? "").trim() ? "cidade" : null,
    !String(profile?.state ?? "").trim() ? "estado" : null,
    normalizeZipcode(profile?.zipcode).length !== 8 ? "CEP" : null,
  ].filter((value): value is string => Boolean(value));

  if (!sellerName) {
    redirect(buildPublishErrorHref("Informe seu nome real"));
  }

  if (!sellerName.includes(" ")) {
    redirect(buildPublishErrorHref("Informe nome e sobrenome"));
  }

  if (!title || !priceCents || !family) {
    redirect(buildPublishErrorHref("Preencha nome, titulo, preco e categoria"));
  }

  if (missingSellerAddressFields.length > 0) {
    redirect(
      buildAccountCompletionHref(
        `Complete ${joinReadableList(
          missingSellerAddressFields
        )} para publicar seu primeiro anuncio`,
        publishDraftHref
      )
    );
  }

  if (uploads.length === 0) {
    redirect(buildPublishErrorHref("Envie pelo menos uma foto para publicar"));
  }

  if (priceCents < MIN_LISTING_PRICE_CENTS) {
    redirect(
      buildPublishErrorHref(
        `Preco minimo permitido: ${formatCentsToBRL(MIN_LISTING_PRICE_CENTS)}`
      )
    );
  }

  let auctionEndAt: string | null = null;
  if (listingType === "auction") {
    if (auctionEndRaw) {
      const parsed = new Date(auctionEndRaw);
      if (!Number.isNaN(parsed.getTime())) {
        auctionEndAt = parsed.toISOString();
      }
    }

    if (!auctionEndAt) {
      const fallback = new Date(
        Date.now() + auctionDurationDays * 24 * 60 * 60 * 1000
      );
      auctionEndAt = fallback.toISOString();
    }
  }

  const packagePreset = resolvePackageDimensions({ family });

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      display_name: sellerName,
      payout_name: sellerName,
    })
    .eq("id", user.id);

  if (profileUpdateError) {
    redirect(`/vender?error=${encodeURIComponent(profileUpdateError.message)}`);
  }

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      seller_user_id: user.id,
      title,
      price_cents: priceCents,
      quantity_available: quantityAvailable,
      condition,
      family,
      platform,
      model,
      description,
      listing_type: listingType || "now",
      status: "active",
      moderation_status: "pending",
      shipping_available: shippingAvailable,
      free_shipping: freeShipping,
      package_weight_grams: shippingAvailable ? packagePreset.weightGrams : null,
      package_length_cm: shippingAvailable ? packagePreset.lengthCm : null,
      package_width_cm: shippingAvailable ? packagePreset.widthCm : null,
      package_height_cm: shippingAvailable ? packagePreset.heightCm : null,
      auction_increment_percent:
        listingType === "auction" ? auctionIncrementPercent : null,
      auction_end_at: auctionEndAt,
      auction_duration_days:
        listingType === "auction" ? auctionDurationDays : null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/vender?error=${encodeURIComponent(error.message)}`);
  }

  if (uploads.length > 0 && listing?.id) {
    const rows: { listing_id: string; path: string; sort_order: number }[] = [];

    for (let index = 0; index < uploads.length; index += 1) {
      const file = uploads[index];
      const extension = getExtension(file.name);
      const path = `${user.id}/${listing.id}/${randomUUID()}.${extension}`;
      const fileBuffer = new Uint8Array(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, fileBuffer, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        redirect(`/vender?error=${encodeURIComponent(uploadError.message)}`);
      }

      rows.push({
        listing_id: listing.id,
        path,
        sort_order: index,
      });
    }

    const { error: insertError } = await supabase
      .from("listing_images")
      .insert(rows);

    if (insertError) {
      redirect(`/vender?error=${encodeURIComponent(insertError.message)}`);
    }

    const thumbnailPath = rows[0]?.path;
    if (thumbnailPath) {
      const publicUrl = supabase.storage
        .from("listing-images")
        .getPublicUrl(thumbnailPath).data.publicUrl;

      if (publicUrl) {
        await supabase
          .from("listings")
          .update({ thumbnail_url: publicUrl })
          .eq("id", listing.id);
      }
    }
  }

  if (listing?.id) {
    try {
      const admin = createAdminClient();
      const [{ count }, { data: adminsData }, { data: sellerProfile }, sellerAuth] =
        await Promise.all([
        admin
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_user_id", user.id),
        admin.from("admins").select("user_id").not("user_id", "is", null),
        admin
          .from("profiles")
          .select("phone, address_line1, district, city, state, zipcode")
          .eq("id", user.id)
          .maybeSingle(),
        admin.auth.admin.getUserById(user.id),
      ]);

      const isFirstListing = (count ?? 0) <= 1;
      const sellerLabel = sellerName || user.email || "Vendedor";
      const adminNotifications = (adminsData ?? [])
        .map((row) => String(row.user_id ?? "").trim())
        .filter(Boolean)
        .map((adminUserId) => ({
          user_id: adminUserId,
          title: isFirstListing
            ? "Primeiro anuncio publicado"
            : "Novo anuncio publicado",
          body: `${sellerLabel} publicou ${isFirstListing ? "o primeiro anuncio" : "um anuncio"}: ${title}.`,
          link: `/anuncio/${listing.id}`,
          type: "listings",
        }));

      if (adminNotifications.length > 0) {
        await insertNotificationsWithPush(admin, adminNotifications);
      }

      const adminAlert = await sendAdminListingAlertEmail({
        admin,
        listingId: listing.id,
        listingTitle: title,
        sellerName,
        sellerEmail: user.email ?? null,
        priceCents,
        listingType,
        moderationStatus: "pending",
        isFirstListing,
      });

      await admin.from("system_events").insert({
        event_type: "admin_listing_email_sent",
        entity_type: "listing",
        entity_id: listing.id,
        actor_id: user.id,
        metadata: {
          seller_name: sellerName,
          seller_email: user.email ?? null,
          price_cents: priceCents,
          listing_type: listingType,
          moderation_status: "pending",
          is_first_listing: isFirstListing,
          result: adminAlert,
        },
      });

      if (!adminAlert.ok && !adminAlert.skipped) {
        console.warn(
          "Admin listing alert email failed:",
          adminAlert.error ?? "unknown"
        );
      }

      if (isFirstListing) {
        const missingItems = collectMissingSellerProfileItems({
          contact: {
            phone: sellerProfile?.phone ?? null,
            addressLine1: sellerProfile?.address_line1 ?? null,
            district: sellerProfile?.district ?? null,
            city: sellerProfile?.city ?? null,
            state: sellerProfile?.state ?? null,
            zipcode: sellerProfile?.zipcode ?? null,
          },
          store: readStoreProfileData(sellerAuth.data.user?.user_metadata),
        });

        if (missingItems.length > 0) {
          const sellerReminder = await sendSellerProfileCompletionReminder({
            admin,
            sellerUserId: user.id,
            sellerEmail: user.email ?? null,
            sellerName,
            missingItems,
          });

          if (
            !sellerReminder.sellerResult.ok &&
            !sellerReminder.sellerResult.skipped
          ) {
            console.warn(
              "Seller profile completion reminder failed:",
              sellerReminder.sellerResult.error ?? "unknown"
            );
          }
        }
      }
    } catch (error) {
      console.warn("Admin listing alert flow failed:", error);
    }
  }

  redirect("/vender?success=Anuncio+enviado+para+moderacao");
}
