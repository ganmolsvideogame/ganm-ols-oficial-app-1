import { NextResponse } from "next/server";

import { getResolvedAffiliateProductBySlug, saveAffiliateAdminState } from "@/lib/affiliate/catalog";
import { ADMIN_PATHS } from "@/lib/config/admin";
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

export async function POST(request: Request) {
  const formData = await request.formData();
  const slug = String(formData.get("product_slug") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const redirectPath = resolveAdminRedirectPath(formData, ADMIN_PATHS.listings);

  if (!slug || !action) {
    return buildRedirect(request, redirectPath, {
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

  const product = await getResolvedAffiliateProductBySlug(slug, {
    includeInactive: true,
  });

  if (!product) {
    return buildRedirect(request, redirectPath, {
      error: "Produto afiliado nao encontrado",
    });
  }

  let successMessage = "Produto afiliado atualizado";
  let patch:
    | Parameters<typeof saveAffiliateAdminState>[1]
    | null = null;

  if (action === "feature_on") {
    patch = { isFeatured: true };
    successMessage = "Produto afiliado destacado";
  } else if (action === "feature_off") {
    patch = { isFeatured: false };
    successMessage = "Destaque removido";
  } else if (action === "offer_on") {
    patch = { isWeekOffer: true };
    successMessage = "Oferta da semana ativa";
  } else if (action === "offer_off") {
    patch = { isWeekOffer: false };
    successMessage = "Oferta removida";
  } else if (action === "home_on") {
    patch = { showOnHome: true };
    successMessage = "Produto exibido na home";
  } else if (action === "home_off") {
    patch = { showOnHome: false };
    successMessage = "Produto removido da home";
  } else if (action === "pause") {
    patch = { status: "paused" };
    successMessage = "Produto afiliado pausado";
  } else if (action === "activate") {
    patch = { status: "active", moderationStatus: "approved" };
    successMessage = "Produto afiliado ativado";
  } else {
    return buildRedirect(request, redirectPath, {
      error: "Acao desconhecida",
    });
  }

  const { error } = await saveAffiliateAdminState(slug, patch);
  if (error) {
    return buildRedirect(request, redirectPath, {
      error: error.message,
    });
  }

  const admin = createAdminClient();
  await admin.from("admin_audit_logs").insert({
    actor_id: user.id,
    action,
    target_type: "affiliate_product",
    target_id: slug,
    details: {
      product_slug: slug,
      product_title: product.title,
      patch,
    },
  });

  return buildRedirect(request, redirectPath, {
    success: successMessage,
  });
}
