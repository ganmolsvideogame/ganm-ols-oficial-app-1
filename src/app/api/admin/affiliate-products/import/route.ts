import { NextResponse } from "next/server";

import { importAffiliateProductsFromText } from "@/lib/affiliate/import";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function buildRedirect(request: Request, path: string, params?: Record<string, string>) {
  const url = new URL(path, request.url);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
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

export async function POST(request: Request) {
  const formData = await request.formData();
  const redirectPath = resolveAdminRedirectPath(formData, ADMIN_PATHS.listings);

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

  const file = formData.get("import_file");
  const rawText = String(formData.get("raw_text") ?? "").trim();
  let importSource = rawText;

  if (!importSource && file instanceof File) {
    importSource = (await file.text()).trim();
  }

  if (!importSource) {
    return buildRedirect(request, redirectPath, {
      error: "Envie um arquivo ou cole o conteudo para importar",
    });
  }

  const result = await importAffiliateProductsFromText(importSource);

  if (result.importedCount === 0) {
    return buildRedirect(request, redirectPath, {
      error: result.errors[0] ?? "Nenhum produto foi importado",
    });
  }

  const admin = createAdminClient();
  await admin.from("admin_audit_logs").insert({
    actor_id: user.id,
    action: "affiliate_import_batch",
    target_type: "affiliate_product",
    target_id: `batch:${Date.now()}`,
    details: {
      imported_count: result.importedCount,
      saved_count: result.savedCount,
      errors: result.errors,
      slugs: result.imported.map((item) => item.slug),
    },
  });

  const successMessage =
    result.errors.length > 0
      ? `Importados ${result.importedCount} produto(s) com ${result.errors.length} aviso(s)`
      : `Importados ${result.importedCount} produto(s)`;

  return buildRedirect(request, redirectPath, {
    success: successMessage,
  });
}
