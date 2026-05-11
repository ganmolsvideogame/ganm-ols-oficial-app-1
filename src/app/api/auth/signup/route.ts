import { NextResponse } from "next/server";

import { ensureProfile } from "@/lib/supabase/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUserIds } from "@/lib/supabase/admins";
import { applyPendingCookies, createRouteClient } from "@/lib/supabase/route";
import { handleBrevoSignupAutomation } from "@/lib/brevo/signup";
import { sendAdminSignupAlertEmail } from "@/lib/brevo/admin-alerts";
import { insertNotificationsWithPush } from "@/lib/push/delivery";
import {
  sendMetaCompleteRegistrationEvent,
  sendMetaLeadEvent,
} from "@/lib/analytics/metaConversions";

function buildRedirect(request: Request, path: string, params?: Record<string, string>) {
  const url = new URL(path, request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return NextResponse.redirect(url, { status: 303 });
}

function getSafeRedirect(raw: string) {
  if (!raw) {
    return null;
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}

function buildPostSignupPath(role: "buyer" | "seller") {
  if (role === "seller") {
    return "/vender/anunciar?onboarding=seller";
  }

  return "/conta?onboarding=buyer&prompt=notifications";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const roleValue = String(formData.get("role") ?? "buyer");
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getSafeRedirect(String(formData.get("redirect_to") ?? "").trim());
  const errorRedirect = "/entrar";

  if (!displayName || !email || !phone || !password) {
    return buildRedirect(request, errorRedirect, {
      error: "Preencha todos os campos",
      ...(redirectTo ? { redirect_to: redirectTo } : {}),
    });
  }

  const role = roleValue === "seller" ? "seller" : "buyer";
  const { supabase, pendingCookies } = await createRouteClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        role,
      },
    },
  });

  if (error) {
    const response = buildRedirect(request, errorRedirect, {
      error: error.message,
      ...(redirectTo ? { redirect_to: redirectTo } : {}),
    });
    applyPendingCookies(response, pendingCookies);
    return response;
  }

  let activeUser = data.user ?? null;
  let activeSession = data.session ?? null;

  if (!activeSession) {
    const signInAttempt = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!signInAttempt.error) {
      activeUser = signInAttempt.data.user ?? activeUser;
      activeSession = signInAttempt.data.session ?? activeSession;
    }
  }

  const requiresEmailConfirmation = !activeSession;

  if (activeUser) {
    let profileError: string | null = null;
    try {
      const admin = createAdminClient();
      profileError = await ensureProfile(admin, activeUser, {
        displayName,
        role,
        email,
        phone,
      });
    } catch {
      profileError = await ensureProfile(supabase, activeUser, {
        displayName,
        role,
        email,
        phone,
      });
    }

    if (profileError) {
      console.warn("Profile sync failed:", profileError);
    }

    try {
      const admin = createAdminClient();
      const adminIds = await getAdminUserIds(admin);
      if (adminIds.length > 0) {
        const label = displayName || email;
        await insertNotificationsWithPush(admin, 
          adminIds.map((adminId) => ({
            user_id: adminId,
            title: "Nova conta criada",
            body: `${label} criou uma conta (${role}).`,
            link: "/painel-ganm-ols/controle",
            type: "signups",
          }))
        );
      }
    } catch (err) {
      console.warn("Signup notification failed:", err);
    }

    try {
      const origin = new URL(request.url).origin;
      const metaRegistration = await sendMetaCompleteRegistrationEvent({
        email,
        leadId: activeUser.id,
        eventSourceUrl: `${origin}/entrar`,
      });
      if (!metaRegistration.ok && !metaRegistration.skipped) {
        console.warn(
          "Meta CAPI complete registration failed:",
          metaRegistration.error ?? "unknown"
        );
      }
    } catch (err) {
      console.warn("Meta CAPI complete registration failed:", err);
    }

    if (role === "seller") {
      try {
        const origin = new URL(request.url).origin;
        const metaLead = await sendMetaLeadEvent({
          email,
          leadId: activeUser.id,
          eventSourceUrl: `${origin}/entrar`,
        });
        if (!metaLead.ok && !metaLead.skipped) {
          console.warn("Meta CAPI lead event failed:", metaLead.error ?? "unknown");
        }
      } catch (err) {
        console.warn("Meta CAPI lead event failed:", err);
      }
    }

    try {
      const origin = new URL(request.url).origin;
      const brevoResult = await handleBrevoSignupAutomation({
        email,
        displayName,
        role,
        origin,
      });
      if (!brevoResult.contact.ok && !brevoResult.contact.skipped) {
        console.warn(
          "Brevo contact sync failed:",
          brevoResult.contact.error ?? "unknown"
        );
      }
      if (!brevoResult.email.ok && !brevoResult.email.skipped) {
        console.warn(
          "Brevo welcome email failed:",
          brevoResult.email.error ?? "unknown"
        );
      }

      if (role === "seller" && brevoResult.email.ok) {
        const admin = createAdminClient();
        await admin.from("system_events").insert({
          event_type: "seller_onboarding_email_sent",
          entity_type: "profile",
          entity_id: activeUser.id,
          actor_id: activeUser.id,
          metadata: {
            flow: "onboarding",
            stage: "welcome",
            anchor_at: activeUser.created_at ?? new Date().toISOString(),
            status: "success",
            sent_to: email,
            source: "signup",
          },
        });
      }
    } catch (err) {
      console.warn("Brevo signup automation failed:", err);
    }

    try {
      const origin = new URL(request.url).origin;
      const admin = createAdminClient();
      const adminAlert = await sendAdminSignupAlertEmail({
        admin,
        displayName,
        email,
        role,
        userId: activeUser.id,
        origin,
      });

      await admin.from("system_events").insert({
        event_type: "admin_signup_email_sent",
        entity_type: "profile",
        entity_id: activeUser.id,
        actor_id: activeUser.id,
        metadata: {
          role,
          email,
          result: adminAlert,
        },
      });

      if (!adminAlert.ok && !adminAlert.skipped) {
        console.warn("Admin signup alert email failed:", adminAlert.error ?? "unknown");
      }
    } catch (err) {
      console.warn("Admin signup alert email failed:", err);
    }
  }

  if (requiresEmailConfirmation) {
    const response = buildRedirect(request, errorRedirect, {
      message: "Conta criada, mas o login automatico nao foi concluido. Tente entrar com seu email e senha.",
      ...(redirectTo ? { redirect_to: redirectTo } : {}),
    });
    applyPendingCookies(response, pendingCookies);
    return response;
  }

  const response = NextResponse.redirect(
    new URL(buildPostSignupPath(role), request.url),
    { status: 303 }
  );
  applyPendingCookies(response, pendingCookies);
  return response;
}

export async function GET(request: Request) {
  return buildRedirect(request, "/entrar");
}
