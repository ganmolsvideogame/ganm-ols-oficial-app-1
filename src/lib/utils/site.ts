const DEFAULT_SITE_URL = "https://www.ganmols.com";

export function getSiteUrl() {
  const envUrl =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    DEFAULT_SITE_URL;

  try {
    return new URL(envUrl).toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function getMetadataBase() {
  return new URL(getSiteUrl());
}

export function buildAbsoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}
