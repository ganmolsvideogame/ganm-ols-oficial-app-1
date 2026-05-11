import { NextResponse } from "next/server";

import {
  analyzeCatalogAiProducts,
  parseCatalogAiInput,
} from "@/lib/admin/catalog-ai";
import { ADMIN_PATHS } from "@/lib/config/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAdminJson() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Faca login para acessar o admin", status: 401 };
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || isAdmin !== true) {
    return { error: "Sem permissao para acessar o admin", status: 403 };
  }

  return { user };
}

async function readRequestBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await request.json()) as { raw?: unknown };
    return String(payload.raw ?? "").trim();
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const rawText = String(formData.get("raw_text") ?? "").trim();
    if (rawText) {
      return rawText;
    }

    const file = formData.get("import_file");
    if (file instanceof File) {
      return (await file.text()).trim();
    }

    return "";
  }

  return request.text();
}

export async function POST(request: Request) {
  const admin = await requireAdminJson();

  if ("error" in admin) {
    return NextResponse.json(
      { error: admin.error, loginPath: ADMIN_PATHS.login },
      { status: admin.status }
    );
  }

  const raw = await readRequestBody(request);
  const parsed = parseCatalogAiInput(raw);

  if (parsed.products.length === 0) {
    return NextResponse.json(
      { error: parsed.errors[0] ?? "Nenhum produto encontrado." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    report: analyzeCatalogAiProducts(parsed.products),
    warnings: parsed.errors,
  });
}
