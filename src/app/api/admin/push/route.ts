import { NextResponse } from "next/server";

import type { BlogLocale } from "@/lib/blog/locales";
import {
  buildCatalogOfferCampaign,
  getPushAudienceLabel,
  normalizePushAudience,
  normalizePushProductSignal,
  sendBlogPushCampaign,
  sendManualPushCampaign,
  sendOfferCampaign,
} from "@/lib/push/campaigns";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function readNativePushSent(result: unknown) {
  if (!result || typeof result !== "object") {
    return 0;
  }

  const nativeResult = (result as Record<string, unknown>).nativeResult;
  if (!nativeResult || typeof nativeResult !== "object") {
    return 0;
  }

  const sent = (nativeResult as Record<string, unknown>).sent;
  return typeof sent === "number" ? sent : 0;
}

function readNativePushFailed(result: unknown) {
  if (!result || typeof result !== "object") {
    return 0;
  }

  const nativeResult = (result as Record<string, unknown>).nativeResult;
  if (!nativeResult || typeof nativeResult !== "object") {
    return 0;
  }

  const failed = (nativeResult as Record<string, unknown>).failed;
  return typeof failed === "number" ? failed : 0;
}

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

function resolveRedirectPath(formData: FormData, fallback: string) {
  const raw = String(formData.get("redirect_to") ?? "").trim();
  if (raw.startsWith("/painel-ganm-ols")) {
    return raw;
  }
  return fallback;
}

function parseArticleSelection(value: string) {
  const [locale, ...slugParts] = value.split(":");
  const slug = slugParts.join(":").trim();
  return {
    locale: locale === "en" ? ("en" as BlogLocale) : ("pt" as BlogLocale),
    slug,
  };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const action = String(formData.get("action") ?? "").trim();
  const redirectPath = resolveRedirectPath(formData, "/painel-ganm-ols/push");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, "/painel-ganm-ols/acesso", {
      error: "Faca login para acessar o admin",
    });
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) {
    return buildRedirect(request, "/painel-ganm-ols/acesso", {
      error: "Sem permissao para acessar o admin",
    });
  }

  const admin = createAdminClient();
  const audience = normalizePushAudience(String(formData.get("audience") ?? ""));
  const productSelection = String(
    formData.get("product_selection") ?? ""
  ).trim();
  const productSignal = normalizePushProductSignal(
    String(formData.get("product_signal") ?? "")
  );
  const audienceFilters = productSelection
    ? {
        productSelection,
        productSignal,
      }
    : null;

  if (action === "send_push_test") {
    const audienceLabel = getPushAudienceLabel(audience);
    const result = await sendManualPushCampaign({
      audience,
      title: `Teste push GANM OLS | ${audienceLabel}`,
      body: `Teste rapido para ${audienceLabel.toLowerCase()} com redirecionamento do admin.`,
      url: "/painel-ganm-ols/push",
      tag: `admin-push-test-${audience}`,
      persistInApp: false,
    });

    await admin.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "push_test_sent",
      target_type: "push_campaign",
      details: result,
    });

    return buildRedirect(request, redirectPath, {
      success: `Teste enviado para ${audienceLabel}: web ${result.browserResult.sent}, app ${readNativePushSent(result.browserResult)}, falhas web ${result.browserResult.failed}, falhas app ${readNativePushFailed(result.browserResult)}`,
    });
  }

  if (action === "send_push_campaign") {
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim() || "/";

    if (!title || !body) {
      return buildRedirect(request, redirectPath, {
        error: "Preencha titulo e texto da campanha push",
      });
    }

    const result = await sendManualPushCampaign({
      audience,
      title,
      body,
      url,
      tag: `admin-push-campaign-${Date.now()}`,
      filters: audienceFilters,
      notificationType: "push-campaign",
    });

    await admin.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "push_campaign_sent",
      target_type: "push_campaign",
      details: result,
    });

    return buildRedirect(request, redirectPath, {
      success: `Campanha enviada para ${result.audienceLabel}: web ${result.browserResult.sent}, app ${readNativePushSent(result.browserResult)}, falhas web ${result.browserResult.failed}, falhas app ${readNativePushFailed(result.browserResult)}`,
    });
  }

  if (action === "send_offer_campaign") {
    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim() || "/";
    const image = String(formData.get("image") ?? "").trim() || null;
    const emailSubject = String(formData.get("email_subject") ?? "").trim() || null;
    const ctaLabel = String(formData.get("cta_label") ?? "").trim() || null;

    if (!title || !body) {
      return buildRedirect(request, redirectPath, {
        error: "Preencha titulo e texto da oferta",
      });
    }

    const result = await sendOfferCampaign({
      audience,
      title,
      body,
      url,
      image,
      emailSubject,
      ctaLabel,
      filters: audienceFilters,
    });

    await admin.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "push_offer_campaign_sent",
      target_type: "push_campaign",
      details: result,
    });

    return buildRedirect(request, redirectPath, {
      success: `Oferta enviada para ${result.audienceLabel}: web ${result.browserResult.sent}, app ${readNativePushSent(result.browserResult)}, internas ${result.inAppCount} e email ${result.emailResult.ok ? "aceito" : "com falha"}`,
    });
  }

  if (action === "send_catalog_offer_campaign") {
    const selectedOffer = String(formData.get("offer") ?? "").trim();

    if (!selectedOffer) {
      return buildRedirect(request, redirectPath, {
        error: "Selecione uma oferta do catalogo",
      });
    }

    const offer = await buildCatalogOfferCampaign(selectedOffer);
    const result = await sendOfferCampaign({
      audience,
      title: offer.title,
      body: offer.body,
      url: offer.url,
      image: offer.image,
      emailSubject: offer.emailSubject,
      ctaLabel: offer.ctaLabel,
      filters: audienceFilters,
    });

    await admin.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "push_offer_campaign_sent",
      target_type: "push_campaign",
      details: {
        ...result,
        source: selectedOffer,
      },
    });

    return buildRedirect(request, redirectPath, {
      success: `Oferta do catalogo enviada para ${result.audienceLabel}: web ${result.browserResult.sent}, app ${readNativePushSent(result.browserResult)}, internas ${result.inAppCount} e email ${result.emailResult.ok ? "aceito" : "com falha"}`,
    });
  }

  if (action === "send_blog_push_campaign") {
    const selectedArticle = String(formData.get("article") ?? "").trim();
    if (!selectedArticle) {
      return buildRedirect(request, redirectPath, {
        error: "Selecione um artigo para disparar",
      });
    }

    const { locale, slug } = parseArticleSelection(selectedArticle);
    if (!slug) {
      return buildRedirect(request, redirectPath, {
        error: "Artigo invalido para disparo",
      });
    }

    const result = await sendBlogPushCampaign({
      audience,
      locale,
      slug,
      filters: audienceFilters,
    });

    await admin.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "push_blog_campaign_sent",
      target_type: "push_campaign",
      details: result,
    });

    return buildRedirect(request, redirectPath, {
      success: `Artigo enviado para ${result.audienceLabel}: web ${result.browserResult.sent}, app ${readNativePushSent(result.browserResult)}, falhas web ${result.browserResult.failed}, falhas app ${readNativePushFailed(result.browserResult)}`,
    });
  }

  return buildRedirect(request, redirectPath, {
    error: "Acao de push desconhecida",
  });
}
