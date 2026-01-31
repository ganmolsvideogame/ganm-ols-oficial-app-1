import { NextResponse } from "next/server";

import { applyPendingCookies, createRouteClient } from "@/lib/supabase/route";

function getSafeRedirect(raw: string | null) {
  if (!raw) {
    return null;
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirect(requestUrl.searchParams.get("next")) ?? "/";

  const { supabase, pendingCookies } = await createRouteClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errorUrl = new URL("/entrar", request.url);
      errorUrl.searchParams.set("error", "Link invalido ou expirado");
      const response = NextResponse.redirect(errorUrl, { status: 303 });
      applyPendingCookies(response, pendingCookies);
      return response;
    }
  }

  const response = NextResponse.redirect(new URL(next, request.url), {
    status: 303,
  });
  response.headers.set("Cache-Control", "no-store");
  applyPendingCookies(response, pendingCookies);
  return response;
}
