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
  const reportId = String(formData.get("report_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();

  if (!reportId || !action) {
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

  let status = "open";
  if (action === "resolve") {
    status = "resolved";
  } else if (action === "reject") {
    status = "rejected";
  } else {
    return buildRedirect(request, ADMIN_PATHS.users, {
      error: "Acao desconhecida",
    });
  }

  const { error } = await supabase
    .from("reports")
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", reportId);

  if (error) {
    return buildRedirect(request, ADMIN_PATHS.users, {
      error: error.message,
    });
  }

  await supabase.from("admin_audit_logs").insert({
    actor_id: user.id,
    action,
    target_type: "report",
    target_id: reportId,
    details: { status },
  });

  return buildRedirect(request, ADMIN_PATHS.users, {
    success: "Denuncia atualizada",
  });
}
