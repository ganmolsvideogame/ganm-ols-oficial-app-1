import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildUserStoreMetadata,
  readStoreProfileData,
} from "@/lib/store-profile";

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

function getFileExtension(filename: string) {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "jpg";
}

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function normalizeZipcode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function getSafeRedirect(raw: string) {
  if (!raw) {
    return null;
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}

function joinReadableList(items: string[]) {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  if (items.length === 2) {
    return `${items[0]} e ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

async function ensureStoreImagesBucket(
  admin: ReturnType<typeof createAdminClient>
) {
  const { error } = await admin.storage.createBucket("store-images", {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (
    error &&
    !/already exists/i.test(error.message) &&
    !/duplicate/i.test(error.message)
  ) {
    throw error;
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const storeBio = String(formData.get("store_bio") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const addressLine1 = String(formData.get("address_line1") ?? "").trim();
  const addressLine2 = String(formData.get("address_line2") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const zipcode = String(formData.get("zipcode") ?? "").trim();
  const payoutMethodRaw = String(formData.get("payout_method") ?? "").trim();
  const payoutMethod =
    payoutMethodRaw === "pix" || payoutMethodRaw === "bank"
      ? payoutMethodRaw
      : null;
  const payoutPixKey = String(formData.get("payout_pix_key") ?? "").trim();
  const payoutBankName = String(formData.get("payout_bank_name") ?? "").trim();
  const payoutBankAgency = String(formData.get("payout_bank_agency") ?? "").trim();
  const payoutBankAccount = String(formData.get("payout_bank_account") ?? "").trim();
  const payoutBankAccountType = String(
    formData.get("payout_bank_account_type") ?? ""
  ).trim();
  const payoutDoc = String(formData.get("payout_doc") ?? "").trim();
  const payoutName = String(formData.get("payout_name") ?? "").trim();
  const returnTo = getSafeRedirect(String(formData.get("return_to") ?? "").trim());
  const password = String(formData.get("password") ?? "").trim();
  const passwordConfirm = String(formData.get("password_confirm") ?? "").trim();
  const storeAvatarFile = formData.get("store_avatar_image");
  const storeBannerFile = formData.get("store_banner_image");

  const hasPassword = Boolean(password);
  const hasConfirm = Boolean(passwordConfirm);
  const shouldUpdatePassword = hasPassword && hasConfirm;

  if (displayName && !displayName.includes(" ")) {
    return buildRedirect(request, "/conta", {
      error: "Informe seu nome completo (nome e sobrenome).",
      ...(returnTo ? { return_to: returnTo } : {}),
    });
  }

  if (shouldUpdatePassword && password.length < 6) {
    return buildRedirect(request, "/conta", {
      error: "Senha precisa ter pelo menos 6 caracteres",
      ...(returnTo ? { return_to: returnTo } : {}),
    });
  }

  if (shouldUpdatePassword && password !== passwordConfirm) {
    return buildRedirect(request, "/conta", {
      error: "As senhas nao conferem",
      ...(returnTo ? { return_to: returnTo } : {}),
    });
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, "/entrar", {
      error: "Faca login para atualizar seus dados",
      ...(returnTo ? { redirect_to: returnTo } : {}),
    });
  }

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (currentProfileError) {
    return buildRedirect(request, "/conta", {
      error: currentProfileError.message,
      ...(returnTo ? { return_to: returnTo } : {}),
    });
  }

  const isSeller = currentProfile?.role === "seller";
  const normalizedZipcode = normalizeZipcode(zipcode);
  const currentStoreProfile = readStoreProfileData(user.user_metadata);
  let nextStoreAvatarPath = currentStoreProfile.storeAvatarPath;
  let nextStoreBannerPath = currentStoreProfile.storeBannerPath;

  if (isSeller) {
    const missingAddressFields = [
      !addressLine1 ? "endereco" : null,
      !district ? "bairro" : null,
      !city ? "cidade" : null,
      !state ? "estado" : null,
      normalizedZipcode.length !== 8 ? "CEP" : null,
    ].filter((value): value is string => Boolean(value));

    if (missingAddressFields.length > 0) {
      return buildRedirect(request, "/conta", {
        error: `Complete ${joinReadableList(
          missingAddressFields
        )} para manter o perfil de vendedor ativo`,
        ...(returnTo ? { return_to: returnTo } : {}),
      });
    }
  }

  if (isSeller) {
    const uploadStoreAsset = async (
      file: File,
      kind: "avatar" | "banner",
      currentPath: string | null
    ) => {
      await ensureStoreImagesBucket(admin);

      const extension = getFileExtension(file.name);
      const path = `${user.id}/store/${kind}-${randomUUID()}.${extension}`;
      const fileBuffer = new Uint8Array(await file.arrayBuffer());

      const { error: uploadError } = await admin.storage
        .from("store-images")
        .upload(path, fileBuffer, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      if (currentPath && currentPath.startsWith(`${user.id}/store/`)) {
        await admin.storage.from("store-images").remove([currentPath]);
      }

      return path;
    };

    try {
      if (isUploadFile(storeAvatarFile)) {
        nextStoreAvatarPath = await uploadStoreAsset(
          storeAvatarFile,
          "avatar",
          currentStoreProfile.storeAvatarPath
        );
      }

      if (isUploadFile(storeBannerFile)) {
        nextStoreBannerPath = await uploadStoreAsset(
          storeBannerFile,
          "banner",
          currentStoreProfile.storeBannerPath
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel enviar a imagem da loja";
      return buildRedirect(request, "/conta", {
        error: message,
        ...(returnTo ? { return_to: returnTo } : {}),
      });
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      phone: phone || null,
      address_line1: addressLine1 || null,
      address_line2: addressLine2 || null,
      district: district || null,
      city: city || null,
      state: state || null,
      zipcode: normalizedZipcode || null,
      payout_method: payoutMethod,
      payout_pix_key: payoutPixKey || null,
      payout_bank_name: payoutBankName || null,
      payout_bank_agency: payoutBankAgency || null,
      payout_bank_account: payoutBankAccount || null,
      payout_bank_account_type: payoutBankAccountType || null,
      payout_doc: payoutDoc || null,
      payout_name: payoutName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    return buildRedirect(request, "/conta", {
      error: profileError.message,
      ...(returnTo ? { return_to: returnTo } : {}),
    });
  }

  const shouldUpdateMetadata = displayName || isSeller;
  if (shouldUpdateMetadata) {
    const nextMetadata = isSeller
      ? buildUserStoreMetadata(user.user_metadata, {
          displayName: displayName || null,
          storeBio: storeBio || null,
          storeAvatarPath: nextStoreAvatarPath,
          storeBannerPath: nextStoreBannerPath,
        })
      : {
          ...(user.user_metadata ?? {}),
          display_name: displayName || null,
        };

    const { error: metadataError } = await supabase.auth.updateUser({
      data: nextMetadata,
    });

    if (metadataError) {
      return buildRedirect(request, "/conta", {
        error: metadataError.message,
        ...(returnTo ? { return_to: returnTo } : {}),
      });
    }
  }

  if (shouldUpdatePassword) {
    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      return buildRedirect(request, "/conta", {
        error: passwordError.message,
        ...(returnTo ? { return_to: returnTo } : {}),
      });
    }
  }

  return buildRedirect(request, returnTo || "/conta", {
    success: returnTo ? "Dados atualizados. Agora voce pode publicar." : "Dados atualizados",
  });
}
