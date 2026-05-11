import { NextResponse } from "next/server";

import {
  isCronAuthorized,
  missingCronSecretResponse,
  unauthorizedCronResponse,
} from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSellerLifecycleAutomation } from "@/lib/brevo/seller-lifecycle";
import { runSellerProfileReminderAutomation } from "@/lib/push/seller-profile-reminders";

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
  const lifecycleResult = await runSellerLifecycleAutomation(admin);
  const sellerProfileReminderResult =
    await runSellerProfileReminderAutomation(admin);

  return NextResponse.json({
    ok: true,
    lifecycleResult,
    sellerProfileReminderResult,
  });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
