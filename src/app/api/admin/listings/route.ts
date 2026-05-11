import { NextResponse } from "next/server";

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
  const listingId = String(formData.get("listing_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const redirectPath = resolveAdminRedirectPath(formData, ADMIN_PATHS.dashboard);

  if (!listingId || !action) {
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

  const admin = createAdminClient();

  let errorMessage: string | null = null;
  let successMessage = "Atualizado";

  if (action === "feature_on") {
    const { error } = await admin
      .from("listings")
      .update({ is_featured: true })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Anuncio destacado";
  } else if (action === "feature_off") {
    const { error } = await admin
      .from("listings")
      .update({ is_featured: false })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Destaque removido";
  } else if (action === "offer_on") {
    const { error } = await admin
      .from("listings")
      .update({ is_week_offer: true })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Oferta da semana ativa";
  } else if (action === "offer_off") {
    const { error } = await admin
      .from("listings")
      .update({ is_week_offer: false })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Oferta removida";
  } else if (action === "pause") {
    const { error } = await admin
      .from("listings")
      .update({ status: "paused" })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Anuncio pausado";
  } else if (action === "activate") {
    const { error } = await admin
      .from("listings")
      .update({ status: "active" })
      .eq("id", listingId);
    errorMessage = error?.message ?? null;
    successMessage = "Anuncio ativado";
  } else if (action === "end_auction") {
    const { data: listing, error: listingError } = await admin
      .from("listings")
      .select("id, listing_type, status")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return buildRedirect(request, redirectPath, {
        error: "Anuncio nao encontrado",
      });
    }

    if (listing.listing_type !== "auction") {
      return buildRedirect(request, redirectPath, {
        error: "Este anuncio nao e de lances",
      });
    }

    if (listing.status !== "active") {
      return buildRedirect(request, redirectPath, {
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
    // Keep referential integrity with orders; archive instead of hard delete.
    const archivePayload: Record<string, unknown> = {
      status: "removed",
      is_featured: false,
      is_week_offer: false,
    };
    const { error } = await admin
      .from("listings")
      .update(archivePayload)
      .eq("id", listingId);

    if (error) {
      const message = error.message || "Erro ao arquivar anuncio";
      const lower = message.toLowerCase();
      const shouldFallback =
        lower.includes("enum") ||
        lower.includes("check constraint") ||
        lower.includes("invalid input value");
      const missingColumn =
        lower.includes("does not exist") || lower.includes("column") || lower.includes("missing");

      if (shouldFallback) {
        const { error: fallbackError } = await admin
          .from("listings")
          .update({ ...archivePayload, status: "paused" })
          .eq("id", listingId);
        if (fallbackError) {
          const fallbackMessage =
            fallbackError.message || "Erro ao arquivar anuncio";
          if (
            fallbackMessage.toLowerCase().includes("does not exist") ||
            fallbackMessage.toLowerCase().includes("column")
          ) {
            const { error: minimalError } = await admin
              .from("listings")
              .update({ status: "paused" })
              .eq("id", listingId);
            errorMessage = minimalError?.message ?? null;
          } else {
            errorMessage = fallbackMessage;
          }
        } else {
          errorMessage = null;
        }
      } else {
        if (missingColumn) {
          // Legacy schema: retry with only status.
          const { error: minimalError } = await admin
            .from("listings")
            .update({ status: "removed" })
            .eq("id", listingId);
          if (minimalError) {
            const { error: minimalFallbackError } = await admin
              .from("listings")
              .update({ status: "paused" })
              .eq("id", listingId);
            errorMessage = minimalFallbackError?.message ?? null;
          } else {
            errorMessage = null;
          }
        } else {
          errorMessage = message;
        }
      }
    } else {
      errorMessage = null;
    }
    successMessage = "Anuncio arquivado";
  } else {
    return buildRedirect(request, redirectPath, {
      error: "Acao desconhecida",
    });
  }

  if (errorMessage) {
    return buildRedirect(request, redirectPath, {
      error: errorMessage,
    });
  }

  return buildRedirect(request, redirectPath, {
    success: successMessage,
  });
}
