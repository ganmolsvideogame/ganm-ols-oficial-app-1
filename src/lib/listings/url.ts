export function slugifyListingTitle(value: string | null | undefined) {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.slice(0, 96);
}

export function buildListingPath(
  listingId: string,
  title?: string | null
) {
  const safeId = encodeURIComponent(String(listingId).trim());
  const slug = slugifyListingTitle(title);

  if (!slug) {
    return `/produto/${safeId}`;
  }

  return `/produto/${safeId}/${slug}`;
}

export function normalizeListingHref(href: string, title?: string | null) {
  const match = href.match(/^\/produto\/([^/?#]+)$/);

  if (!match) {
    return href;
  }

  return buildListingPath(decodeURIComponent(match[1] ?? ""), title);
}
