import { NextResponse } from "next/server";

import { sendBrevoAbandonedCartEmails } from "@/lib/brevo/cart-emails";
import { loadEmailAutomationSettings } from "@/lib/automation/email-settings";
import {
  isCronAuthorized,
  missingCronSecretResponse,
  unauthorizedCronResponse,
} from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function handleCron(request: Request) {
  if (
    !String(process.env.CRON_SECRET ?? "").trim() &&
    !String(process.env.SUPERFRETE_REFRESH_SECRET ?? "").trim()
  ) {
    return missingCronSecretResponse();
  }

  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const admin = createAdminClient();
  const settings = await loadEmailAutomationSettings(admin);

  if (!settings.buyerAbandonedCartEnabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  const result = await sendBrevoAbandonedCartEmails(admin, {
    delayHours: settings.buyerAbandonedCartDelayHours,
    notificationsEnabled: settings.lifecycleNotificationsEnabled,
  });

  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
