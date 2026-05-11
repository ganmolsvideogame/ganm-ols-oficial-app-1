function normalizeMercadoLivreImageUrl(url: string) {
  const raw = String(url ?? "").trim();
  if (!/mlstatic\.com/i.test(raw)) {
    return raw;
  }

  const parsed = raw.match(
    /^(https:\/\/[^/]+\/)D_[^/]*?([0-9]+-ML[A-Z]{1,3}[0-9]+_[0-9]+)(?:-[A-Z]{1,2})?([^?.]*)(\.(?:jpg|jpeg|webp))(.*)?$/i
  );

  if (parsed) {
    const [, prefix, assetKey, suffix = "", extension, search = ""] = parsed;
    return `${prefix}D_NQ_NP_2X_${assetKey}-F${suffix}${extension}${search}`.replace(
      /-F-F(?=[-.])/i,
      "-F"
    );
  }

  return raw
    .replace("/D_NQ_NP_", "/D_NQ_NP_2X_")
    .replace("/D_NQ_NP_2X_2X_", "/D_NQ_NP_2X_")
    .replace(/-([A-Z]{1,2})(?=(?:-[^.?#]+)?\.(jpg|jpeg|webp)(?:[?#].*)?$)/i, "-F");
}

function extractMercadoLivrePhotoKey(url: string) {
  const raw = String(url ?? "").trim();
  const match = raw.match(/ML[A-Z]{1,3}[0-9]+_[0-9]+/i);
  return match ? match[0].toUpperCase() : null;
}

export function normalizeAffiliateImageUrls(urls: string[]) {
  const unique = new Map<string, string>();

  for (const candidate of urls.map(getAffiliateDisplayImageUrl)) {
    if (!candidate) {
      continue;
    }

    const mlKey = extractMercadoLivrePhotoKey(candidate);
    const dedupeKey = mlKey ?? candidate;

    if (!unique.has(dedupeKey)) {
      unique.set(dedupeKey, candidate);
    }
  }

  return Array.from(unique.values());
}

export function getAffiliateDisplayImageUrl(url: string) {
  return normalizeMercadoLivreImageUrl(url);
}
