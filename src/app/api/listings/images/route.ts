import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

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

function getExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "jpg";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const listingId = String(formData.get("listing_id") ?? "").trim();
  const files = formData.getAll("images");

  if (!listingId) {
    return buildRedirect(request, "/vender", {
      error: "Anuncio invalido",
    });
  }

  const uploads = files.filter(
    (file): file is File => file instanceof File && file.size > 0
  );

  if (uploads.length === 0) {
    return buildRedirect(request, "/vender", {
      error: "Selecione ao menos uma imagem",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, "/entrar", {
      error: "Faca login para enviar imagens",
    });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_user_id, thumbnail_url")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return buildRedirect(request, "/vender", {
      error: "Anuncio nao encontrado",
    });
  }

  if (listing.seller_user_id !== user.id) {
    return buildRedirect(request, "/vender", {
      error: "Sem permissao para editar este anuncio",
    });
  }

  const { count } = await supabase
    .from("listing_images")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);

  const startOrder = count ?? 0;
  const insertedPaths: string[] = [];
  const rows: { listing_id: string; path: string; sort_order: number }[] = [];

  for (let index = 0; index < uploads.length; index += 1) {
    const file = uploads[index];
    const extension = getExtension(file.name);
    const path = `${user.id}/${listingId}/${randomUUID()}.${extension}`;

    const fileBuffer = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(path, fileBuffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return buildRedirect(request, "/vender", {
        error: uploadError.message,
      });
    }

    insertedPaths.push(path);
    rows.push({
      listing_id: listingId,
      path,
      sort_order: startOrder + index,
    });
  }

  const { error: insertError } = await supabase
    .from("listing_images")
    .insert(rows);

  if (insertError) {
    return buildRedirect(request, "/vender", {
      error: insertError.message,
    });
  }

  if (!listing.thumbnail_url && insertedPaths.length > 0) {
    const publicUrl = supabase.storage
      .from("listing-images")
      .getPublicUrl(insertedPaths[0]).data.publicUrl;

    if (publicUrl) {
      await supabase
        .from("listings")
        .update({ thumbnail_url: publicUrl })
        .eq("id", listingId);
    }
  }

  return buildRedirect(request, "/vender", {
    success: "Fotos adicionadas",
  });
}
