import { NextResponse } from "next/server";

import {
  revokeNativePushToken,
  revokeNativePushTokensForUser,
  saveNativePushToken,
} from "@/lib/push/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          token?: string;
          locale?: string;
        }
      | null;

    const token = String(body?.token ?? "").trim();
    const locale = body?.locale === "en" ? "en" : "pt";
    if (!token) {
      return NextResponse.json(
        { ok: false, message: "Missing native push token." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await saveNativePushToken({
      token,
      locale,
      userId: user?.id ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Native push subscription failed.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          token?: string;
          disableAllForCurrentUser?: boolean;
        }
      | null;

    const token = String(body?.token ?? "").trim();
    const disableAllForCurrentUser = body?.disableAllForCurrentUser === true;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!token && !(disableAllForCurrentUser && user?.id)) {
      return NextResponse.json(
        { ok: false, message: "Missing native push token." },
        { status: 400 }
      );
    }

    if (token) {
      await revokeNativePushToken(token);
    }

    let revokedTokens = 0;
    if (disableAllForCurrentUser && user?.id) {
      revokedTokens = await revokeNativePushTokensForUser(user.id);
    }

    return NextResponse.json({ ok: true, revokedTokens });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Native push revoke failed.",
      },
      { status: 500 }
    );
  }
}
