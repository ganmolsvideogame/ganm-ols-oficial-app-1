import { NextResponse } from "next/server";

import {
  revokeBrowserPushSubscriptionsForUser,
  revokeBrowserPushSubscription,
  saveBrowserPushPreference,
  saveBrowserPushSubscription,
} from "@/lib/push/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      subscription?: {
        endpoint?: string;
        expirationTime?: number | null;
        keys?: {
          p256dh?: string;
          auth?: string;
        };
      };
      locale?: string;
    };

    const locale = body.locale === "en" ? "en" : "pt";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const subscription = body.subscription;

    if (!subscription?.endpoint) {
      return NextResponse.json(
        { ok: false, message: "Missing push subscription endpoint." },
        { status: 400 }
      );
    }

    const normalizedSubscription = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime ?? null,
      keys: subscription.keys,
    };

    await saveBrowserPushSubscription({
      subscription: normalizedSubscription,
      locale,
      userId: user?.id ?? null,
      userAgent: request.headers.get("user-agent"),
    });

    if (user?.id) {
      await saveBrowserPushPreference({
        userId: user.id,
        locale,
        enabled: true,
        permission: "granted",
        endpoint: normalizedSubscription.endpoint,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Browser push subscription failed.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          endpoint?: string;
          locale?: string;
          disableAllForCurrentUser?: boolean;
          permission?: string;
        }
      | null;

    const endpoint = String(body?.endpoint ?? "").trim();
    const locale = body?.locale === "en" ? "en" : "pt";
    const disableAllForCurrentUser = body?.disableAllForCurrentUser === true;
    const permission =
      body?.permission === "denied" ||
      body?.permission === "granted" ||
      body?.permission === "unsupported"
        ? body.permission
        : "default";
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!endpoint && !(disableAllForCurrentUser && user?.id)) {
      return NextResponse.json(
        { ok: false, message: "Missing push subscription endpoint." },
        { status: 400 }
      );
    }

    if (endpoint) {
      await revokeBrowserPushSubscription(endpoint);
    }

    let revokedSubscriptions = 0;
    if (disableAllForCurrentUser && user?.id) {
      revokedSubscriptions = await revokeBrowserPushSubscriptionsForUser(user.id);
      await saveBrowserPushPreference({
        userId: user.id,
        locale,
        enabled: false,
        permission,
      });
    }

    return NextResponse.json({ ok: true, revokedSubscriptions });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Browser push subscription revoke failed.",
      },
      { status: 500 }
    );
  }
}
