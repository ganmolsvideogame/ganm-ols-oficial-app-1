export type StoreProfileData = {
  storeBio: string | null;
  storeAvatarPath: string | null;
  storeBannerPath: string | null;
};

export type SellerProfileContact = {
  phone: string | null;
  addressLine1: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zipcode: string | null;
};

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function readStoreProfileData(
  metadata: Record<string, unknown> | null | undefined
): StoreProfileData {
  return {
    storeBio: readMetadataString(metadata, "store_bio"),
    storeAvatarPath: readMetadataString(metadata, "store_avatar_path"),
    storeBannerPath: readMetadataString(metadata, "store_banner_path"),
  };
}

export function buildUserStoreMetadata(
  metadata: Record<string, unknown> | null | undefined,
  input: {
    displayName: string | null;
    storeBio: string | null;
    storeAvatarPath: string | null;
    storeBannerPath: string | null;
  }
) {
  return {
    ...(metadata ?? {}),
    display_name: input.displayName,
    store_bio: input.storeBio,
    store_avatar_path: input.storeAvatarPath,
    store_banner_path: input.storeBannerPath,
  };
}

export function collectMissingSellerProfileItems(params: {
  contact: SellerProfileContact | null | undefined;
  store: StoreProfileData;
}) {
  const missingItems: string[] = [];
  const contact = params.contact;

  if (!contact?.phone?.trim()) {
    missingItems.push("telefone");
  }
  if (!contact?.addressLine1?.trim()) {
    missingItems.push("endereco");
  }
  if (!contact?.district?.trim()) {
    missingItems.push("bairro");
  }
  if (!contact?.city?.trim()) {
    missingItems.push("cidade");
  }
  if (!contact?.state?.trim()) {
    missingItems.push("estado");
  }
  if (!contact?.zipcode?.trim()) {
    missingItems.push("CEP");
  }
  if (!params.store.storeAvatarPath) {
    missingItems.push("logo da loja");
  }
  if (!params.store.storeBannerPath) {
    missingItems.push("banner da loja");
  }
  if (!params.store.storeBio?.trim()) {
    missingItems.push("descricao da loja");
  }

  return missingItems;
}
