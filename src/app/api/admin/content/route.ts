import { randomUUID } from "crypto";
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

  if (action === "create_section") {
    const slug = String(formData.get("slug") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const sectionType = String(formData.get("section_type") ?? "banner").trim();
    const positionRaw = String(formData.get("position") ?? "").trim();
    const startsAtRaw = String(formData.get("starts_at") ?? "").trim();
    const endsAtRaw = String(formData.get("ends_at") ?? "").trim();
    const isActive = String(formData.get("is_active") ?? "") === "on";

    if (!slug) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: "Informe o slug da secao",
      });
    }

    const position = positionRaw ? Number.parseInt(positionRaw, 10) : 0;

    const { error } = await supabase.from("home_sections").insert({
      slug: slug.toLowerCase(),
      title: title || null,
      description: description || null,
      section_type: sectionType || "banner",
      position: Number.isNaN(position) || position < 0 ? 0 : position,
      is_active: isActive,
      starts_at: parseDateValue(startsAtRaw),
      ends_at: parseDateValue(endsAtRaw),
    });

    if (error) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "home_section_created",
      target_type: "home_section",
      details: { slug: slug.toLowerCase(), section_type: sectionType },
    });

    return buildRedirect(request, ADMIN_PATHS.content, {
      success: "Secao criada",
    });
  }

  if (action === "create_item") {
    let sectionId = String(formData.get("section_id") ?? "").trim();
    const sectionType = String(formData.get("section_type") ?? "banner").trim();
    const title = String(formData.get("title") ?? "").trim();
    const imageFile = formData.get("image");
    const href = String(formData.get("href") ?? "").trim();
    const ctaLabel = String(formData.get("cta_label") ?? "").trim();
    const secondaryLabel = String(formData.get("secondary_label") ?? "").trim();
    const showButtons = String(formData.get("show_buttons") ?? "") === "on";
    const positionRaw = String(formData.get("position") ?? "").trim();
    const startsAtRaw = String(formData.get("starts_at") ?? "").trim();
    const endsAtRaw = String(formData.get("ends_at") ?? "").trim();

    if (!sectionId) {
      const resolvedSlug =
        sectionType === "modal"
          ? "home-modal"
          : sectionType === "cards"
            ? "home-cards"
            : "home-banners";
      const resolvedTitle =
        sectionType === "modal"
          ? "Popups"
          : sectionType === "cards"
            ? "Cards"
            : "Banners principais";

      const { data: existingSection, error: sectionFetchError } = await supabase
        .from("home_sections")
        .select("id")
        .eq("slug", resolvedSlug)
        .maybeSingle();
      if (sectionFetchError) {
        return buildRedirect(request, ADMIN_PATHS.content, {
          error: sectionFetchError.message,
        });
      }

      if (existingSection?.id) {
        sectionId = existingSection.id;
      } else {
        const { data: createdSection, error: createSectionError } = await supabase
          .from("home_sections")
          .insert({
            slug: resolvedSlug,
            title: resolvedTitle,
            description: null,
            section_type: sectionType || "banner",
            position: 0,
            is_active: true,
          })
          .select("id")
          .single();

        if (createSectionError || !createdSection?.id) {
          return buildRedirect(request, ADMIN_PATHS.content, {
            error: createSectionError?.message || "Nao foi possivel criar a secao",
          });
        }

        sectionId = createdSection.id;
      }
    }

    if (!(imageFile instanceof File) || imageFile.size === 0) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: "Envie a imagem do banner",
      });
    }

    const extensionMatch = imageFile.name.toLowerCase().match(/\.([a-z0-9]+)$/);
    const extension = extensionMatch ? extensionMatch[1] : "jpg";
    const path = `home/${sectionId}/${randomUUID()}.${extension}`;
    const buffer = new Uint8Array(await imageFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("home-banners")
      .upload(path, buffer, {
        contentType: imageFile.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: uploadError.message,
      });
    }

    const publicUrl = supabase.storage.from("home-banners").getPublicUrl(path).data
      .publicUrl;

    const position = positionRaw ? Number.parseInt(positionRaw, 10) : 0;

    const { error } = await supabase.from("home_items").insert({
      section_id: sectionId,
      title: title || null,
      image_url: publicUrl || null,
      href: href || null,
      cta_label: ctaLabel || null,
      secondary_label: secondaryLabel || null,
      show_buttons: showButtons,
      position: Number.isNaN(position) || position < 0 ? 0 : position,
      starts_at: parseDateValue(startsAtRaw),
      ends_at: parseDateValue(endsAtRaw),
    });

    if (error) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "home_item_created",
      target_type: "home_item",
      details: { section_id: sectionId, image_url: publicUrl },
    });

    return buildRedirect(request, ADMIN_PATHS.content, {
      success: "Banner criado",
    });
  }

  if (action === "toggle_section") {
    const sectionId = String(formData.get("section_id") ?? "").trim();
    const nextActive = String(formData.get("is_active") ?? "") === "true";
    if (!sectionId) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: "Secao invalida",
      });
    }

    const { error } = await supabase
      .from("home_sections")
      .update({ is_active: nextActive })
      .eq("id", sectionId);
    if (error) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: nextActive ? "home_section_activated" : "home_section_deactivated",
      target_type: "home_section",
      target_id: sectionId,
    });

    return buildRedirect(request, ADMIN_PATHS.content, {
      success: nextActive ? "Secao ativada" : "Secao desativada",
    });
  }

  if (action === "delete_section") {
    const sectionId = String(formData.get("section_id") ?? "").trim();
    if (!sectionId) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: "Secao invalida",
      });
    }

    const { error } = await supabase
      .from("home_sections")
      .delete()
      .eq("id", sectionId);
    if (error) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "home_section_deleted",
      target_type: "home_section",
      target_id: sectionId,
    });

    return buildRedirect(request, ADMIN_PATHS.content, {
      success: "Secao removida",
    });
  }

  if (action === "delete_item") {
    const itemId = String(formData.get("item_id") ?? "").trim();
    if (!itemId) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: "Banner invalido",
      });
    }

    const { error } = await supabase.from("home_items").delete().eq("id", itemId);
    if (error) {
      return buildRedirect(request, ADMIN_PATHS.content, {
        error: error.message,
      });
    }

    await supabase.from("admin_audit_logs").insert({
      actor_id: user.id,
      action: "home_item_deleted",
      target_type: "home_item",
      target_id: itemId,
    });

    return buildRedirect(request, ADMIN_PATHS.content, {
      success: "Banner removido",
    });
  }

  return buildRedirect(request, ADMIN_PATHS.content, {
    error: "Acao desconhecida",
  });
}
