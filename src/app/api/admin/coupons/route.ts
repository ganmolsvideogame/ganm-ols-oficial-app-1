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

const DEFAULT_TZ_OFFSET = "-03:00";

function parseDateValue(value: string) {
  if (!value) {
    return null;
  }
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  const normalized = hasTimezone
    ? value
    : value.length === 16
      ? `${value}:00${DEFAULT_TZ_OFFSET}`
      : `${value}${DEFAULT_TZ_OFFSET}`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
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
    const code = String(formData.get("code") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const percentRaw = String(formData.get("percent_off") ?? "").trim();
    const amountRaw = String(formData.get("amount_off") ?? "").trim();
    const maxRedemptionsRaw = String(
      formData.get("max_redemptions") ?? ""
    ).trim();
    const startsAtRaw = String(formData.get("starts_at") ?? "").trim();
    const endsAtRaw = String(formData.get("ends_at") ?? "").trim();
    const active = String(formData.get("active") ?? "") === "on";

    if (!code) {
      return buildRedirect(request, ADMIN_PATHS.coupons, {
        error: "Informe o codigo do cupom",
      });
    }

    const percentValue = percentRaw ? Number.parseInt(percentRaw, 10) : null;
    const amountValue = amountRaw ? parsePriceToCents(amountRaw) : null;

    if (percentValue && amountValue) {
      return buildRedirect(request, ADMIN_PATHS.coupons, {
        error: "Use desconto percentual OU valor fixo",
      });
    }

    if (!percentValue && !amountValue) {
      return buildRedirect(request, ADMIN_PATHS.coupons, {
        error: "Informe um tipo de desconto",
      });
    }

    if (percentValue !== null && (percentValue <= 0 || percentValue > 100)) {
      return buildRedirect(request, ADMIN_PATHS.coupons, {
        error: "Percentual invalido",
      });
    }

    if (amountValue !== null && amountValue <= 0) {
      return buildRedirect(request, ADMIN_PATHS.coupons, {
        error: "Valor fixo invalido",
      });
    }

    const maxRedemptions = maxRedemptionsRaw
      ? Number.parseInt(maxRedemptionsRaw, 10)
      : null;

    const startsAt = parseDateValue(startsAtRaw);
    const endsAt = parseDateValue(endsAtRaw);

    const { error } = await supabase.from("coupons").insert({
      code: code.toUpperCase(),
      description: description || null,
      percent_off: percentValue,
      amount_off_cents: amountValue,
      max_redemptions: maxRedemptions && maxRedemptions > 0 ? maxRedemptions : null,
      starts_at: startsAt,
      ends_at: endsAt,
      active,
    });

    if (error) {
      return buildRedirect(request, ADMIN_PATHS.coupons, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "coupon_created",
      target_type: "coupon",
      details: {
        code: code.toUpperCase(),
        percent_off: percentValue,
        amount_off_cents: amountValue,
        active,
      },
    });

    return buildRedirect(request, ADMIN_PATHS.coupons, {
      success: "Cupom criado",
    });
  }

  const couponId = String(formData.get("coupon_id") ?? "").trim();
  if (!couponId || !action) {
    return buildRedirect(request, ADMIN_PATHS.coupons, {
      error: "Acao invalida",
    });
  }

  if (action === "toggle_active") {
    const nextActive = String(formData.get("active") ?? "") === "true";
    const { error } = await supabase
      .from("coupons")
      .update({ active: nextActive })
      .eq("id", couponId);
    if (error) {
      return buildRedirect(request, ADMIN_PATHS.coupons, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: nextActive ? "coupon_activated" : "coupon_deactivated",
      target_type: "coupon",
      target_id: couponId,
    });

    return buildRedirect(request, ADMIN_PATHS.coupons, {
      success: nextActive ? "Cupom ativado" : "Cupom desativado",
    });
  }

  if (action === "delete") {
    const { error } = await supabase.from("coupons").delete().eq("id", couponId);
    if (error) {
      return buildRedirect(request, ADMIN_PATHS.coupons, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "coupon_deleted",
      target_type: "coupon",
      target_id: couponId,
    });

    return buildRedirect(request, ADMIN_PATHS.coupons, {
      success: "Cupom removido",
    });
  }

  return buildRedirect(request, ADMIN_PATHS.coupons, {
    error: "Acao desconhecida",
  });
}
