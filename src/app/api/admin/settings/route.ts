import { NextResponse } from "next/server";

import {
  type EmailAutomationSettings,
  getDefaultEmailAutomationSettings,
  loadEmailAutomationSettings,
  parseBooleanInput,
  parseNumberInput,
  parseScheduleInput,
  upsertEmailAutomationSettings,
} from "@/lib/automation/email-settings";
import { broadcastBlogArticle } from "@/lib/blog/delivery";
import { getAllBlogPosts } from "@/lib/blog/posts";
import { sendBrevoAbandonedCartEmails } from "@/lib/brevo/cart-emails";
import { runSellerLifecycleAutomation } from "@/lib/brevo/seller-lifecycle";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { runSellerProfileReminderAutomation } from "@/lib/push/seller-profile-reminders";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function buildRedirect(
  request: Request,
  path: string,
  params?: Record<string, string>
) {
  const url = new URL(path, request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return NextResponse.redirect(url, { status: 303 });
}

function resolveAdminRedirectPath(formData: FormData, fallback: string) {
  const raw = String(formData.get("redirect_to") ?? "").trim();
  if (raw.startsWith(ADMIN_PATHS.base)) {
    return raw;
  }
  return fallback;
}

function parseBoolean(value: string) {
  return value === "true" || value === "on" || value === "1";
}

function parsePositiveInt(value: string, fallback: number, min = 0) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(min, parsed);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const action = String(formData.get("action") ?? "").trim();
  const redirectPath = resolveAdminRedirectPath(formData, ADMIN_PATHS.settings);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, ADMIN_PATHS.login, {
      error: "Faca login para acessar o admin",
    });
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) {
    return buildRedirect(request, ADMIN_PATHS.login, {
      error: "Sem permissao para acessar o admin",
    });
  }

  if (action === "upsert_site_setting") {
    const key = String(formData.get("key") ?? "").trim();
    const value = String(formData.get("value") ?? "").trim();

    if (!key) {
      return buildRedirect(request, redirectPath, {
        error: "Informe a chave",
      });
    }

    const { error } = await supabase.from("site_settings").upsert(
      {
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (error) {
      return buildRedirect(request, redirectPath, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "site_setting_saved",
      target_type: "site_setting",
      details: { key },
    });

    return buildRedirect(request, redirectPath, {
      success: "Configuracao salva",
    });
  }

  if (action === "upsert_auction_settings") {
    const settingsId = String(formData.get("auction_settings_id") ?? "").trim();
    const minIncrementPercent = parsePositiveInt(
      String(formData.get("min_increment_percent") ?? ""),
      25,
      1
    );
    const extendMinutes = parsePositiveInt(
      String(formData.get("extend_minutes") ?? ""),
      2,
      0
    );
    const extendWindowMinutes = parsePositiveInt(
      String(formData.get("extend_window_minutes") ?? ""),
      2,
      0
    );

    if (settingsId) {
      const { error } = await supabase
        .from("auction_settings")
        .update({
          min_increment_percent: minIncrementPercent,
          extend_minutes: extendMinutes,
          extend_window_minutes: extendWindowMinutes,
        })
        .eq("id", settingsId);

      if (error) {
        return buildRedirect(request, redirectPath, {
          error: error.message,
        });
      }
    } else {
      const { data: currentSettings } = await supabase
        .from("auction_settings")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentSettings?.id) {
        const { error } = await supabase
          .from("auction_settings")
          .update({
            min_increment_percent: minIncrementPercent,
            extend_minutes: extendMinutes,
            extend_window_minutes: extendWindowMinutes,
          })
          .eq("id", currentSettings.id);

        if (error) {
          return buildRedirect(request, redirectPath, {
            error: error.message,
          });
        }
      } else {
        const { error } = await supabase.from("auction_settings").insert({
          min_increment_percent: minIncrementPercent,
          extend_minutes: extendMinutes,
          extend_window_minutes: extendWindowMinutes,
        });

        if (error) {
          return buildRedirect(request, redirectPath, {
            error: error.message,
          });
        }
      }
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "auction_settings_saved",
      target_type: "auction_settings",
      details: {
        min_increment_percent: minIncrementPercent,
        extend_minutes: extendMinutes,
        extend_window_minutes: extendWindowMinutes,
      },
    });

    return buildRedirect(request, redirectPath, {
      success: "Regras de leilao salvas",
    });
  }

  if (action === "set_payment_method") {
    const paymentMethodId = String(formData.get("payment_method_id") ?? "").trim();
    const enabled = parseBoolean(String(formData.get("enabled") ?? ""));

    if (!paymentMethodId) {
      return buildRedirect(request, redirectPath, {
        error: "Metodo invalido",
      });
    }

    const { error } = await supabase
      .from("payment_methods")
      .update({ enabled })
      .eq("id", paymentMethodId);

    if (error) {
      return buildRedirect(request, redirectPath, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: enabled ? "payment_method_enabled" : "payment_method_disabled",
      target_type: "payment_method",
      target_id: paymentMethodId,
    });

    return buildRedirect(request, redirectPath, {
      success: enabled ? "Metodo ativado" : "Metodo desativado",
    });
  }

  if (action === "set_shipping_rate") {
    const shippingRateId = String(formData.get("shipping_rate_id") ?? "").trim();
    const enabled = parseBoolean(String(formData.get("enabled") ?? ""));

    if (!shippingRateId) {
      return buildRedirect(request, redirectPath, {
        error: "Regra de frete invalida",
      });
    }

    const { error } = await supabase
      .from("shipping_rates")
      .update({ enabled })
      .eq("id", shippingRateId);

    if (error) {
      return buildRedirect(request, redirectPath, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: enabled ? "shipping_rate_enabled" : "shipping_rate_disabled",
      target_type: "shipping_rate",
      target_id: shippingRateId,
    });

    return buildRedirect(request, redirectPath, {
      success: enabled ? "Regra de frete ativada" : "Regra de frete desativada",
    });
  }

  if (action === "save_email_automation_settings") {
    const admin = createAdminClient();
    const defaults = getDefaultEmailAutomationSettings();

    const settings: EmailAutomationSettings = {
      sellerLifecycleHour: Math.min(
        23,
        parseNumberInput(
          formData.get("seller_lifecycle_hour"),
          defaults.sellerLifecycleHour,
          0
        )
      ),
      sellerOnboardingEnabled: parseBooleanInput(
        formData.get("seller_onboarding_enabled"),
        defaults.sellerOnboardingEnabled
      ),
      sellerOnboardingDays: parseScheduleInput(
        formData.get("seller_onboarding_days"),
        defaults.sellerOnboardingDays
      ),
      sellerListingRecoveryEnabled: parseBooleanInput(
        formData.get("seller_listing_recovery_enabled"),
        defaults.sellerListingRecoveryEnabled
      ),
      sellerListingRecoveryHours: parseScheduleInput(
        formData.get("seller_listing_recovery_hours"),
        defaults.sellerListingRecoveryHours
      ),
      sellerPostListingEnabled: parseBooleanInput(
        formData.get("seller_post_listing_enabled"),
        defaults.sellerPostListingEnabled
      ),
      sellerPostListingDays: parseScheduleInput(
        formData.get("seller_post_listing_days"),
        defaults.sellerPostListingDays
      ),
      sellerRelationshipEnabled: parseBooleanInput(
        formData.get("seller_relationship_enabled"),
        defaults.sellerRelationshipEnabled
      ),
      sellerRelationshipDays: parseScheduleInput(
        formData.get("seller_relationship_days"),
        defaults.sellerRelationshipDays
      ),
      sellerProfileReminderEnabled: parseBooleanInput(
        formData.get("seller_profile_reminder_enabled"),
        defaults.sellerProfileReminderEnabled
      ),
      sellerProfileReminderIntervalDays: parseNumberInput(
        formData.get("seller_profile_reminder_interval_days"),
        defaults.sellerProfileReminderIntervalDays,
        1
      ),
      sellerProfileReminderHour: Math.min(
        23,
        parseNumberInput(
          formData.get("seller_profile_reminder_hour"),
          defaults.sellerProfileReminderHour,
          0
        )
      ),
      buyerAbandonedCartEnabled: parseBooleanInput(
        formData.get("buyer_abandoned_cart_enabled"),
        defaults.buyerAbandonedCartEnabled
      ),
      buyerAbandonedCartDelayHours: parseNumberInput(
        formData.get("buyer_abandoned_cart_delay_hours"),
        defaults.buyerAbandonedCartDelayHours,
        1
      ),
      blogBroadcastEnabled: parseBooleanInput(
        formData.get("blog_broadcast_enabled"),
        defaults.blogBroadcastEnabled
      ),
      blogBroadcastHour: Math.min(
        23,
        parseNumberInput(
          formData.get("blog_broadcast_hour"),
          defaults.blogBroadcastHour,
          0
        )
      ),
      blogBroadcastAudience:
        String(formData.get("blog_broadcast_audience") ?? "").trim() === "all-users"
          ? "all-users"
          : String(formData.get("blog_broadcast_audience") ?? "").trim() === "admins"
            ? "admins"
            : "newsletter",
      lifecycleNotificationsEnabled: parseBooleanInput(
        formData.get("lifecycle_notifications_enabled"),
        defaults.lifecycleNotificationsEnabled
      ),
      frequencyCapHours: parseNumberInput(
        formData.get("frequency_cap_hours"),
        defaults.frequencyCapHours,
        0
      ),
    };

    const { error } = await upsertEmailAutomationSettings(admin, settings);
    if (error) {
      return buildRedirect(request, redirectPath, {
        error: error.message,
      });
    }

    await admin.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "email_automation_settings_saved",
      target_type: "automation",
      details: settings,
    });

    return buildRedirect(request, redirectPath, {
      success: "Calendario de emails e notificacoes salvo",
    });
  }

  if (action === "run_seller_lifecycle") {
    const admin = createAdminClient();
    const result = await runSellerLifecycleAutomation(admin);

    await admin.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "seller_lifecycle_run",
      target_type: "automation",
      details: result,
    });

    return buildRedirect(request, redirectPath, {
      success: `Fluxo de vendedor executado: ${result.emailed} email(s) e ${result.notifications} notificacao(oes)`,
    });
  }

  if (action === "run_seller_profile_reminders") {
    const admin = createAdminClient();
    const result = await runSellerProfileReminderAutomation(admin, {
      ignoreFrequencyCap: true,
    });

    await admin.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "seller_profile_reminders_run",
      target_type: "automation",
      details: result,
    });

    return buildRedirect(request, redirectPath, {
      success: `Lembrete de perfil executado: ${result.notifications} notificacao(oes) internas e ${result.pushSent} push(es)`,
    });
  }

  if (action === "run_buyer_abandoned_cart") {
    const admin = createAdminClient();
    const defaults = getDefaultEmailAutomationSettings();
    const enabled = parseBooleanInput(
      formData.get("buyer_abandoned_cart_enabled_override"),
      defaults.buyerAbandonedCartEnabled
    );

    if (!enabled) {
      return buildRedirect(request, redirectPath, {
        success: "Fluxo de carrinho abandonado esta desativado",
      });
    }

    const result = await sendBrevoAbandonedCartEmails(admin, {
      delayHours: parseNumberInput(
        formData.get("buyer_abandoned_cart_delay_hours_override"),
        defaults.buyerAbandonedCartDelayHours,
        1
      ),
      notificationsEnabled: parseBooleanInput(
        formData.get("lifecycle_notifications_enabled_override"),
        defaults.lifecycleNotificationsEnabled
      ),
    });

    await admin.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "buyer_abandoned_cart_run",
      target_type: "automation",
      details: result,
    });

    return buildRedirect(request, redirectPath, {
      success: `Carrinho abandonado executado: ${result.sent} email(s)`,
    });
  }

  if (action === "run_blog_broadcast") {
    const admin = createAdminClient();
    const settings = await loadEmailAutomationSettings(admin);
    const latestPost = getAllBlogPosts("pt")[0];

    if (!latestPost) {
      return buildRedirect(request, redirectPath, {
        error: "Nenhum artigo do blog encontrado para disparo",
      });
    }

    const result = await broadcastBlogArticle({
      slug: latestPost.slug,
      locale: "pt",
      audience: settings.blogBroadcastAudience,
      channels: {
        inApp: true,
        browser: true,
        email: true,
      },
    });

    await admin.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "blog_broadcast_run",
      target_type: "automation",
      details: result,
    });

    return buildRedirect(request, redirectPath, {
      success: `Blog executado: ${result.recipients} destinatario(s), ${result.browserResult.sent} push(es) e email ${result.emailResult.ok ? "aceito" : "com falha"}`,
    });
  }

  return buildRedirect(request, redirectPath, {
    error: "Acao desconhecida",
  });
}
