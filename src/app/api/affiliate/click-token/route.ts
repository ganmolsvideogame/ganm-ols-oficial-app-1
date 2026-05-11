import { NextResponse } from "next/server";

import { issueAffiliateClickToken } from "@/lib/auth/affiliate-click-token";

type ClickTokenBody = {
  type?: "buy" | "recommendation";
  slug?: string;
  source?: string | null;
  fromSlug?: string | null;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let body: ClickTokenBody = {};

  try {
    body = (await request.json()) as ClickTokenBody;
  } catch {
    body = {};
  }

  const type = body.type === "buy" || body.type === "recommendation" ? body.type : null;
  const slug = normalizeString(body.slug);
  const source = normalizeString(body.source);
  const fromSlug = normalizeString(body.fromSlug);

  if (!type || !slug) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const token = issueAffiliateClickToken({
    type,
    slug,
    source,
    fromSlug,
  });

  return NextResponse.json({ token }, { status: 200 });
}
