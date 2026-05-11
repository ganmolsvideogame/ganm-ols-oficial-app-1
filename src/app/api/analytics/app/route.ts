import { NextResponse } from "next/server";

import { APP_ANALYTICS_EVENT_TYPES, type AppAnalyticsEventType } from "@/lib/pwa/events";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { listActiveBrowserPushSubscriptions, sendBrowserPushNotification } from "@/lib/push/server";

const ALLOWED_EVENTS = new Set<AppAnalyticsEventType>([
  APP_ANALYTICS_EVENT_TYPES.installClick,
  APP_ANALYTICS_EVENT_TYPES.pwaInstalled,
  APP_ANALYTICS_EVENT_TYPES.pwaOpen,
  APP_ANALYTICS_EVENT_TYPES.nativeAndroidOpen,
]);

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
  const payload = (await request.json().catch(() => null)) as
    | {
        eventType?: string;
        deviceId?: string;
        path?: string;
        metadata?: Record<string, unknown>;
      }
    | null;

  const eventType = String(payload?.eventType ?? "").trim() as AppAnalyticsEventType;
  const deviceId = String(payload?.deviceId ?? "").trim();
  const path = String(payload?.path ?? "").trim();

  if (!ALLOWED_EVENTS.has(eventType) || !deviceId) {
    return NextResponse.json(
      { ok: false, error: "Invalid app analytics payload." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("analytics_events")
    .select("id")
    .eq("event_type", eventType)
    .eq("session_id", deviceId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { error } = await admin.from("analytics_events").insert({
    event_type: eventType,
    user_id: user?.id ?? null,
    session_id: deviceId,
    metadata: {
      path: path.startsWith("/") ? path : null,
      ...(payload?.metadata ?? {}),
    },
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized app analytics request." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const eventTypes = Array.from(ALLOWED_EVENTS);
  const { data, error } = await admin
    .from("analytics_events")
    .select("event_type, session_id")
    .in("event_type", eventTypes);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const uniqueByType = new Map<string, Set<string>>();
  for (const eventType of eventTypes) {
    uniqueByType.set(eventType, new Set());
  }

  for (const row of data ?? []) {
    const eventType = String(row.event_type ?? "").trim();
    const sessionId = String(row.session_id ?? "").trim();
    if (!eventType || !sessionId) {
      continue;
    }
    uniqueByType.get(eventType)?.add(sessionId);
  }

  const subscriptions = await listActiveBrowserPushSubscriptions();
  const pwaInstalledDevices = new Set<string>([
    ...(uniqueByType.get(APP_ANALYTICS_EVENT_TYPES.pwaInstalled) ?? new Set()),
    ...(uniqueByType.get(APP_ANALYTICS_EVENT_TYPES.pwaOpen) ?? new Set()),
  ]);

  return NextResponse.json({
    ok: true,
    stats: {
      installClicks: uniqueByType.get(APP_ANALYTICS_EVENT_TYPES.installClick)?.size ?? 0,
      pwaInstalledUsers: pwaInstalledDevices.size,
      nativeInstalledUsers:
        uniqueByType.get(APP_ANALYTICS_EVENT_TYPES.nativeAndroidOpen)?.size ?? 0,
      pushSubscribers: subscriptions.length,
    },
  });
}

export async function PUT(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized app push test request." },
      { status: 401 }
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        title?: string;
        body?: string;
        url?: string;
      }
    | null;

  const result = await sendBrowserPushNotification({
    payload: {
      title: String(payload?.title ?? "").trim() || "Teste do app GANM OLS",
      body:
        String(payload?.body ?? "").trim() ||
        "Seu app da GANM OLS esta pronto para receber alertas.",
      url: String(payload?.url ?? "").trim() || "https://www.ganmols.com/",
      tag: "ganmols-app-test",
      lang: "pt-BR",
    },
  });

  return NextResponse.json({ ok: true, result });
}
