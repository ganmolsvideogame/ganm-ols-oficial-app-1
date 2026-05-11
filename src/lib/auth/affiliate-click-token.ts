import { createHmac, timingSafeEqual } from "crypto";

type AffiliateClickTokenType = "buy" | "recommendation";

type AffiliateClickTokenInput = {
  type: AffiliateClickTokenType;
  slug: string;
  source?: string | null;
  fromSlug?: string | null;
};

type AffiliateClickTokenPayload = {
  v: 1;
  type: AffiliateClickTokenType;
  slug: string;
  source: string;
  fromSlug: string;
  issuedAt: number;
};

const AFFILIATE_CLICK_TOKEN_TTL_MS = 2 * 60 * 1000;

function normalizeString(value: string | null | undefined) {
  return String(value ?? "").trim();
}

function getAffiliateClickTokenSecret() {
  return (
    process.env.AFFILIATE_CLICK_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "ganmols-affiliate-click-token"
  );
}

function createSignature(encodedPayload: string) {
  return createHmac("sha256", getAffiliateClickTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function buildPayload(input: AffiliateClickTokenInput): AffiliateClickTokenPayload {
  return {
    v: 1,
    type: input.type,
    slug: normalizeString(input.slug),
    source: normalizeString(input.source),
    fromSlug: normalizeString(input.fromSlug),
    issuedAt: Date.now(),
  };
}

export function issueAffiliateClickToken(input: AffiliateClickTokenInput) {
  const payload = buildPayload(input);
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyAffiliateClickToken(
  token: string | null | undefined,
  expected: AffiliateClickTokenInput
) {
  const raw = normalizeString(token);
  if (!raw) {
    return false;
  }

  const [encodedPayload, signature] = raw.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = createSignature(encodedPayload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as AffiliateClickTokenPayload;

    if (payload?.v !== 1) {
      return false;
    }

    if (Date.now() - Number(payload.issuedAt ?? 0) > AFFILIATE_CLICK_TOKEN_TTL_MS) {
      return false;
    }

    return (
      payload.type === expected.type &&
      payload.slug === normalizeString(expected.slug) &&
      payload.source === normalizeString(expected.source) &&
      payload.fromSlug === normalizeString(expected.fromSlug)
    );
  } catch {
    return false;
  }
}
