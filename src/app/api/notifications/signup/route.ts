import { NextResponse } from "next/server";

import type { BrevoResult } from "@/lib/brevo/client";
import { handleBrevoSignupAutomation } from "@/lib/brevo/signup";
import { sendAdminSignupAlertEmail } from "@/lib/brevo/admin-alerts";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserIds } from "@/lib/supabase/admins";
import { insertNotificationsWithPush } from "@/lib/push/delivery";
import {
  sendMetaCompleteRegistrationEvent,
  sendMetaLeadEvent,
} from "@/lib/analytics/metaConversions";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const admin = createAdminClient();

  let payload: {
    email?: string;
    display_name?: string;
    phone?: string;
    role?: string;
    event_source_url?: string;
  } = {};
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const email = String(payload.email ?? "").trim().toLowerCase();
  const displayName = String(payload.display_name ?? "").trim();
  const phone = String(payload.phone ?? "").trim();
  const roleValue = String(payload.role ?? "buyer").trim();
  const role = roleValue === "seller" ? "seller" : "buyer";
  const eventSourceUrl = String(payload.event_source_url ?? "").trim();

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
  }

  try {
    const adminIds = await getAdminUserIds(admin);

    if (adminIds.length > 0) {
      const label = displayName || email;
      await insertNotificationsWithPush(admin, 
        adminIds.map((adminId) => ({
          user_id: adminId,
          title: "Nova conta criada",
          body: `${label} criou uma conta (${role})${phone ? ` | WhatsApp: ${phone}` : ""}.`,
          link: "/painel-ganm-ols/controle",
          type: "signups",
        }))
      );
    }
  } catch (err) {
    console.warn("Signup notification failed:", err);
  }

  let metaCompleteRegistration: {
    ok: boolean;
    skipped?: boolean;
    status?: number;
    error?: string;
  } = {
    ok: false,
    skipped: true,
  };
  metaCompleteRegistration = await sendMetaCompleteRegistrationEvent({
    email,
    leadId: Date.now(),
    eventSourceUrl: eventSourceUrl || `${new URL(request.url).origin}/entrar`,
  });
  if (!metaCompleteRegistration.ok && !metaCompleteRegistration.skipped) {
    console.warn(
      "Meta CAPI complete registration failed:",
      metaCompleteRegistration.error ?? "unknown"
    );
  }

  let metaLead: { ok: boolean; skipped?: boolean; status?: number; error?: string } = {
    ok: false,
    skipped: true,
  };
  if (role === "seller") {
    const leadEventSourceUrl = (() => {
      try {
        const origin = new URL(request.url).origin;
        return eventSourceUrl || `${origin}/entrar`;
      } catch {
        return undefined;
      }
    })();
    metaLead = await sendMetaLeadEvent({
      email,
      leadId: Date.now(),
      eventSourceUrl: leadEventSourceUrl,
    });
    if (!metaLead.ok && !metaLead.skipped) {
      console.warn("Meta CAPI lead event failed:", metaLead.error ?? "unknown");
    }
  }

  let brevo: { contact?: BrevoResult; email?: BrevoResult } = {};

  try {
    const origin = new URL(request.url).origin;
    brevo = await handleBrevoSignupAutomation({
      email,
      displayName,
      role,
      origin,
    });
    if (!brevo.contact?.ok && !brevo.contact?.skipped) {
      console.warn("Brevo contact sync failed:", brevo.contact?.error ?? "unknown");
    }
    if (!brevo.email?.ok && !brevo.email?.skipped) {
      console.warn("Brevo welcome email failed:", brevo.email?.error ?? "unknown");
    }
  } catch (err) {
    console.warn("Brevo signup automation failed:", err);
  }

  try {
    const origin = new URL(request.url).origin;
    const adminAlert = await sendAdminSignupAlertEmail({
      admin,
      displayName,
      email,
      role,
      origin,
    });

    await admin.from("system_events").insert({
      event_type: "admin_signup_email_sent",
      entity_type: "profile",
      actor_id: null,
      metadata: {
        role,
        email,
        source: "notifications_signup",
        result: adminAlert,
      },
    });

    if (!adminAlert.ok && !adminAlert.skipped) {
      console.warn("Admin signup alert email failed:", adminAlert.error ?? "unknown");
    }
  } catch (err) {
    console.warn("Admin signup alert email failed:", err);
  }

  return NextResponse.json({
    ok: true,
    meta_complete_registration: metaCompleteRegistration,
    meta_lead: metaLead,
    brevo,
  });
}
