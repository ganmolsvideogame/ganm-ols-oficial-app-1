"use client";

type AffiliateClickTokenType = "buy" | "recommendation";

type AffiliateClickTokenInput = {
  type: AffiliateClickTokenType;
  slug: string;
  source?: string | null;
  fromSlug?: string | null;
};

function normalizeString(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export async function requestAffiliateClickToken(
  input: AffiliateClickTokenInput
) {
  try {
    const response = await fetch("/api/affiliate/click-token", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: input.type,
        slug: normalizeString(input.slug),
        source: normalizeString(input.source),
        fromSlug: normalizeString(input.fromSlug),
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { token?: string | null };
    return normalizeString(data?.token) || null;
  } catch {
    return null;
  }
}

export function appendAffiliateClickToken(url: string, token: string | null) {
  if (!token || typeof window === "undefined") {
    return url;
  }

  const targetUrl = new URL(url, window.location.origin);
  targetUrl.searchParams.set("click_token", token);
  return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
}
