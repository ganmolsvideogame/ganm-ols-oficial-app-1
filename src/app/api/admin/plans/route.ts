import { NextResponse } from "next/server";

import { ADMIN_PATHS } from "@/lib/config/admin";
import { parsePriceToCents } from "@/lib/utils/price";
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

export async function POST(request: Request) {
  const formData = await request.formData();
  const action = String(formData.get("action") ?? "").trim();
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

  if (action === "create") {
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const priceRaw = String(formData.get("price") ?? "").trim();
    const billingPeriod = String(formData.get("billing_period") ?? "monthly").trim();
    const featuredLimitRaw = String(
      formData.get("featured_listing_limit") ?? ""
    ).trim();
    const boostPriorityRaw = String(formData.get("boost_priority") ?? "").trim();
    const isActive = String(formData.get("is_active") ?? "") === "on";

    if (!name) {
      return buildRedirect(request, ADMIN_PATHS.plans, {
        error: "Informe o nome do plano",
      });
    }

    const priceCents = parsePriceToCents(priceRaw);
    if (priceCents === null || priceCents < 0) {
      return buildRedirect(request, ADMIN_PATHS.plans, {
        error: "Preco invalido",
      });
    }

    const featuredListingLimit = featuredLimitRaw
      ? Number.parseInt(featuredLimitRaw, 10)
      : 0;
    const boostPriority = boostPriorityRaw
      ? Number.parseInt(boostPriorityRaw, 10)
      : 0;

    const { error } = await supabase.from("subscription_plans").insert({
      name,
      slug: slug || null,
      description: description || null,
      price_cents: priceCents,
      billing_period: billingPeriod || "monthly",
      featured_listing_limit:
        Number.isNaN(featuredListingLimit) || featuredListingLimit < 0
          ? 0
          : featuredListingLimit,
      boost_priority: Number.isNaN(boostPriority) || boostPriority < 0 ? 0 : boostPriority,
      is_active: isActive,
    });

    if (error) {
      return buildRedirect(request, ADMIN_PATHS.plans, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "plan_created",
      target_type: "subscription_plan",
      details: { name, slug, price_cents: priceCents, is_active: isActive },
    });

    return buildRedirect(request, ADMIN_PATHS.plans, {
      success: "Plano criado",
    });
  }

  const planId = String(formData.get("plan_id") ?? "").trim();
  if (!planId || !action) {
    return buildRedirect(request, ADMIN_PATHS.plans, {
      error: "Acao invalida",
    });
  }

  if (action === "toggle_active") {
    const nextActive = String(formData.get("is_active") ?? "") === "true";
    const { error } = await supabase
      .from("subscription_plans")
      .update({ is_active: nextActive })
      .eq("id", planId);
    if (error) {
      return buildRedirect(request, ADMIN_PATHS.plans, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: nextActive ? "plan_activated" : "plan_deactivated",
      target_type: "subscription_plan",
      target_id: planId,
    });

    return buildRedirect(request, ADMIN_PATHS.plans, {
      success: nextActive ? "Plano ativado" : "Plano desativado",
    });
  }

  if (action === "delete") {
    const { error } = await supabase
      .from("subscription_plans")
      .delete()
      .eq("id", planId);
    if (error) {
      return buildRedirect(request, ADMIN_PATHS.plans, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "plan_deleted",
      target_type: "subscription_plan",
      target_id: planId,
    });

    return buildRedirect(request, ADMIN_PATHS.plans, {
      success: "Plano removido",
    });
  }

  return buildRedirect(request, ADMIN_PATHS.plans, {
    error: "Acao desconhecida",
  });
}
