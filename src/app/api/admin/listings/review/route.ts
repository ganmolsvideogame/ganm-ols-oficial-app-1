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
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!listingId || !action) {
    return buildRedirect(request, ADMIN_PATHS.listings, {
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
  let successMessage = "Revisao registrada";
  let moderationStatus = "pending";
  let statusUpdate: string | null = null;

  if (action === "approve") {
    moderationStatus = "approved";
    statusUpdate = "active";
    successMessage = "Anuncio aprovado";
  } else if (action === "reject") {
    moderationStatus = "rejected";
    statusUpdate = "paused";
    successMessage = "Anuncio reprovado";
  } else if (action === "changes") {
    moderationStatus = "changes_required";
    statusUpdate = "paused";
    successMessage = "Ajustes solicitados";
  } else {
    return buildRedirect(request, ADMIN_PATHS.listings, {
      error: "Acao desconhecida",
    });
  }

  const updatePayload: Record<string, string | null> = {
    moderation_status: moderationStatus,
  };
  if (statusUpdate) {
    updatePayload.status = statusUpdate;
  }

  const { error } = await supabase
    .from("listings")
    .update(updatePayload)
    .eq("id", listingId);
  errorMessage = error?.message ?? null;

  if (!errorMessage) {
    await supabase.from("listing_moderation_logs").insert({
      listing_id: listingId,
      status: moderationStatus,
      reason: reason || null,
      notes: notes || null,
      created_by: user.id,
    });

    const { data: listing } = await supabase
      .from("listings")
      .select("id, seller_user_id, title")
      .eq("id", listingId)
      .maybeSingle();
    if (listing?.seller_user_id) {
      const statusLabel =
        moderationStatus === "approved"
          ? "aprovado"
          : moderationStatus === "rejected"
            ? "reprovado"
            : "em ajuste";
      await supabase.from("notifications").insert({
        user_id: listing.seller_user_id,
        title: "Moderacao do anuncio",
        body: `Seu anuncio ${listing.title ?? ""} foi ${statusLabel}.`,
        link: `/produto/${listingId}`,
      });
    }
  }

  if (errorMessage) {
    return buildRedirect(request, ADMIN_PATHS.listings, {
      error: errorMessage,
    });
  }

  await supabase.from("admin_audit_logs").insert({
    actor_id: user.id,
    action,
    target_type: "listing",
    target_id: listingId,
    details: { reason, notes },
  });

  return buildRedirect(request, ADMIN_PATHS.listings, {
    success: successMessage,
  });
}
