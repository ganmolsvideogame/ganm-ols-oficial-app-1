import { NextResponse } from "next/server";

import { ADMIN_PATHS } from "@/lib/config/admin";
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
  const userId = String(formData.get("user_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const endsAtRaw = String(formData.get("ends_at") ?? "").trim();

  if (!userId || !action) {
    return buildRedirect(request, ADMIN_PATHS.users, {
      error: "Acao invalida",
    });
  }

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

  let errorMessage: string | null = null;
  let successMessage = "Atualizado";

  if (action === "set_level") {
    const { error } = await supabase
      .from("profiles")
      .update({ account_level: level || "user" })
      .eq("id", userId);
    errorMessage = error?.message ?? null;
    successMessage = "Nivel atualizado";
  } else if (action === "set_role") {
    const { error } = await supabase
      .from("profiles")
      .update({ role: role || "buyer" })
      .eq("id", userId);
    errorMessage = error?.message ?? null;
    successMessage = "Perfil atualizado";
  } else if (action === "suspend") {
    const endsAt = endsAtRaw ? new Date(endsAtRaw).toISOString() : null;
    const { error } = await supabase
      .from("profiles")
      .update({
        is_suspended: true,
        suspended_until: endsAt,
        suspension_reason: reason || "Suspensao administrativa",
      })
      .eq("id", userId);
    errorMessage = error?.message ?? null;
    successMessage = "Usuario suspenso";

    if (!errorMessage) {
      await supabase.from("user_blocks").insert({
        user_id: userId,
        reason: reason || "Suspensao administrativa",
        ends_at: endsAt,
        status: "active",
        created_by: user.id,
      });
    }
  } else if (action === "unsuspend") {
    const { error } = await supabase
      .from("profiles")
      .update({
        is_suspended: false,
        suspended_until: null,
        suspension_reason: null,
      })
      .eq("id", userId);
    errorMessage = error?.message ?? null;
    successMessage = "Suspensao removida";
  } else if (action === "kyc_approve") {
    const { error } = await supabase
      .from("profiles")
      .update({
        kyc_status: "approved",
        kyc_verified_at: new Date().toISOString(),
      })
      .eq("id", userId);
    errorMessage = error?.message ?? null;
    successMessage = "KYC aprovado";
  } else if (action === "kyc_reject") {
    const { error } = await supabase
      .from("profiles")
      .update({
        kyc_status: "rejected",
        kyc_verified_at: null,
      })
      .eq("id", userId);
    errorMessage = error?.message ?? null;
    successMessage = "KYC reprovado";
  } else {
    return buildRedirect(request, ADMIN_PATHS.users, {
      error: "Acao desconhecida",
    });
  }

  if (errorMessage) {
    return buildRedirect(request, ADMIN_PATHS.users, {
      error: errorMessage,
    });
  }

  await supabase.from("admin_audit_logs").insert({
    actor_id: user.id,
    action,
    target_type: "profile",
    target_id: userId,
    details: {
      level,
      role,
      reason,
      ends_at: endsAtRaw || null,
    },
  });

  return buildRedirect(request, ADMIN_PATHS.users, {
    success: successMessage,
  });
}
