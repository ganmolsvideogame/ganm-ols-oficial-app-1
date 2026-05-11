import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendBrevoEmail } from "@/lib/brevo/client";
import { buildSellerProfileCompletionEmail } from "@/lib/brevo/templates";

function normalizeBaseUrl(origin?: string | null) {
  return (
    origin?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.ganmols.com"
  );
}

function normalizeEmail(value: string | null | undefined) {
  const email = String(value ?? "").trim().toLowerCase();
  return email || null;
}

export async function sendSellerProfileCompletionReminder(params: {
  admin?: SupabaseClient;
  sellerUserId?: string | null;
  sellerEmail: string | null | undefined;
  sellerName?: string | null;
  missingItems: string[];
  previewEmail?: string | null;
  alwaysSendPreviewCopy?: boolean;
  origin?: string | null;
}) {
  const sellerEmail = normalizeEmail(params.sellerEmail);
  const previewEmail = normalizeEmail(params.previewEmail);

  if (!sellerEmail) {
    return {
      sellerResult: {
        ok: false,
        skipped: true,
        error: "Missing seller email",
      },
      previewResult: {
        ok: false,
        skipped: true,
        error: "Missing preview email",
      },
    };
  }

  const actionUrl = new URL("/conta", normalizeBaseUrl(params.origin)).toString();
  const template = buildSellerProfileCompletionEmail({
    displayName: params.sellerName ?? "",
    actionUrl,
    missingItems: params.missingItems,
  });

  const sellerResult = await sendBrevoEmail({
    to: [{ email: sellerEmail, name: params.sellerName ?? undefined }],
    subject: template.subject,
    htmlContent: template.html,
    textContent: template.text,
    tags: ["seller-profile-reminder"],
  });

  const shouldSendPreview =
    Boolean(previewEmail) &&
    (params.alwaysSendPreviewCopy === true || previewEmail !== sellerEmail);

  const previewResult = shouldSendPreview
    ? await sendBrevoEmail({
        to: [{ email: previewEmail as string }],
        subject: template.subject,
        htmlContent: template.html,
        textContent: template.text,
        tags: ["seller-profile-reminder", "preview-copy"],
      })
    : {
        ok: false,
        skipped: true,
        error: "Preview copy not requested",
      };

  if (params.admin && params.sellerUserId) {
    await params.admin.from("system_events").insert({
      event_type: "seller_profile_completion_email_sent",
      actor_id: params.sellerUserId,
      entity_type: "profile",
      entity_id: params.sellerUserId,
      metadata: {
        missing_items: params.missingItems,
        seller_result: sellerResult,
        preview_email: previewEmail,
        preview_result: previewResult,
      },
    });
  }

  return {
    sellerResult,
    previewResult,
  };
}
