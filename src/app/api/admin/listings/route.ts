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
  const listingId = String(formData.get("listing_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();

  if (!listingId || !action) {
    return buildRedirect(request, ADMIN_PATHS.dashboard, {
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

  if (action === "feature_on") {
    const { error } = await supabase
      .from("listings")
      .update({ is_featured: true })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Anuncio destacado";
  } else if (action === "feature_off") {
    const { error } = await supabase
      .from("listings")
      .update({ is_featured: false })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Destaque removido";
  } else if (action === "offer_on") {
    const { error } = await supabase
      .from("listings")
      .update({ is_week_offer: true })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Oferta da semana ativa";
  } else if (action === "offer_off") {
    const { error } = await supabase
      .from("listings")
      .update({ is_week_offer: false })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Oferta removida";
  } else if (action === "pause") {
    const { error } = await supabase
      .from("listings")
      .update({ status: "paused" })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Anuncio pausado";
  } else if (action === "activate") {
    const { error } = await supabase
      .from("listings")
      .update({ status: "active" })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Anuncio ativado";
  } else if (action === "end_auction") {
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, listing_type, status")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return buildRedirect(request, ADMIN_PATHS.dashboard, {
        error: "Anuncio nao encontrado",
      });
    }

    if (listing.listing_type !== "auction") {
      return buildRedirect(request, ADMIN_PATHS.dashboard, {
        error: "Este anuncio nao e de lances",
      });
    }

    if (listing.status !== "active") {
      return buildRedirect(request, ADMIN_PATHS.dashboard, {
        error: "Lances ja encerrados",
      });
    }

    const { error } = await supabase.rpc("close_auction", {
      p_listing_id: listingId,
      closed_by: user.id,
    });
    errorMessage = error?.message ?? null;
    successMessage = "Lances encerrados";
  } else if (action === "delete") {
    const { error } = await supabase.from("listings").delete().eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Anuncio removido";
  } else {
    return buildRedirect(request, ADMIN_PATHS.dashboard, {
      error: "Acao desconhecida",
    });
  }

  if (errorMessage) {
    return buildRedirect(request, ADMIN_PATHS.dashboard, {
      error: errorMessage,
    });
  }

  return buildRedirect(request, ADMIN_PATHS.dashboard, {
    success: successMessage,
  });
}
