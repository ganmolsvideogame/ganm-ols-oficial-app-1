import { NextResponse } from "next/server";

import { broadcastBlogArticle } from "@/lib/blog/delivery";
import { createClient } from "@/lib/supabase/server";

async function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const incomingSecret =
    request.headers.get("x-cron-secret")?.trim() ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ??
    "";

  if (secret && incomingSecret && secret === incomingSecret) {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");
  return isAdmin === true;
}

export async function POST(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized blog broadcast request." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as {
      slug?: string;
      locale?: string;
      audience?: "admins" | "newsletter" | "all-users";
      channels?: {
        inApp?: boolean;
        browser?: boolean;
        email?: boolean;
      };
    };

    const slug = String(body.slug ?? "").trim();
    if (!slug) {
      return NextResponse.json(
        { ok: false, message: "Missing blog slug." },
        { status: 400 }
      );
    }

    const result = await broadcastBlogArticle({
      slug,
      locale: body.locale === "en" ? "en" : "pt",
      audience:
        body.audience === "newsletter"
          ? "newsletter"
          : body.audience === "all-users"
            ? "all-users"
            : "admins",
      channels: body.channels,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Blog broadcast failed.",
      },
      { status: 500 }
    );
  }
}
