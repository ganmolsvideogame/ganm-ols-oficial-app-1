import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { applyPendingCookies, createRouteClient } from "@/lib/supabase/route";

async function handleSignOut(request: Request) {
  const { supabase, pendingCookies } = await createRouteClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });
  const cookieStore = await cookies();
  cookieStore.getAll().forEach(({ name }) => {
    if (name.startsWith("sb-") || name.startsWith("supabase")) {
      response.cookies.set(name, "", { expires: new Date(0), path: "/" });
    }
  });
  response.headers.set("Cache-Control", "no-store");
  applyPendingCookies(response, pendingCookies);
  return response;
}

export async function POST(request: Request) {
  return handleSignOut(request);
}

export async function GET(request: Request) {
  return handleSignOut(request);
}
