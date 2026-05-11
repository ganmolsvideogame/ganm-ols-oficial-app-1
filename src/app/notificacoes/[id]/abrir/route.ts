import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function fallbackUrl(request: Request, notificationId: string) {
  return new URL(`/notificacoes/${notificationId}`, request.url);
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const notificationId = String(id ?? "").trim();
  const requestUrl = new URL(request.url);
  const source = requestUrl.searchParams.get("source")?.trim() || "notification_redirect";

  if (!notificationId) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/entrar", request.url);
    loginUrl.searchParams.set(
      "redirect_to",
      `${requestUrl.pathname}${requestUrl.search}`
    );
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const admin = createAdminClient();
  const { data: notification } = await admin
    .from("notifications")
    .select("id, link, type, is_read")
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!notification) {
    return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  }

  if (!notification.is_read) {
    await admin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);
  }

  await admin.from("system_events").insert({
    event_type: "notification_clicked",
    actor_id: user.id,
    entity_type: "notification",
    entity_id: notificationId,
    metadata: {
      notification_type: notification.type ?? null,
      target_url: notification.link ?? null,
      source,
    },
  });

  if (!notification.link) {
    return NextResponse.redirect(fallbackUrl(request, notificationId), {
      status: 303,
    });
  }

  const destination = new URL(notification.link, request.url);
  return NextResponse.redirect(destination, { status: 303 });
}
