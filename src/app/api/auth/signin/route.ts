import { NextResponse } from "next/server";

import { ensureProfile } from "@/lib/supabase/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyPendingCookies, createRouteClient } from "@/lib/supabase/route";

function buildRedirect(request: Request, path: string, params?: Record<string, string>) {
  const url = new URL(path, request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return NextResponse.redirect(url, { status: 303 });
}

function getSafeRedirect(raw: string) {
  if (!raw) {
    return null;
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return null;
  }
  return raw;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getSafeRedirect(String(formData.get("redirect_to") ?? "").trim());
  const errorRedirect =
    getSafeRedirect(String(formData.get("error_redirect") ?? "").trim()) ??
    "/entrar";

  if (!email || !password) {
    return buildRedirect(request, errorRedirect, {
      error: "Preencha email e senha",
      ...(redirectTo ? { redirect_to: redirectTo } : {}),
    });
  }

  const { supabase, pendingCookies } = await createRouteClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const response = buildRedirect(request, errorRedirect, {
      error: error.message,
      ...(redirectTo ? { redirect_to: redirectTo } : {}),
    });
    applyPendingCookies(response, pendingCookies);
    return response;
  }

  if (data.user && data.session) {
    const metadataRole =
      typeof data.user.user_metadata?.role === "string"
        ? data.user.user_metadata.role
        : "";
    const role = metadataRole === "seller" ? "seller" : "buyer";
    const displayName =
      typeof data.user.user_metadata?.display_name === "string"
        ? data.user.user_metadata.display_name
        : data.user.email?.split("@")[0] ?? "Usuario";
    let profileError: string | null = null;
    try {
      const admin = createAdminClient();
      profileError = await ensureProfile(admin, data.user, {
        displayName,
        role,
        email,
      });
    } catch {
      profileError = await ensureProfile(supabase, data.user, {
        displayName,
        role,
        email,
      });
    }

    if (profileError) {
      console.warn("Profile sync failed:", profileError);
    }

    try {
      const admin = createAdminClient();
      const { data: admins } = await admin
        .from("admins")
        .select("user_id")
        .not("user_id", "is", null);
      const adminIds = (admins ?? [])
        .map((row) => row.user_id)
        .filter((id): id is string => Boolean(id));
      if (adminIds.length > 0) {
        const label = displayName || email;
        await admin.from("notifications").insert(
          adminIds.map((adminId) => ({
            user_id: adminId,
            title: "Login realizado",
            body: `${label} entrou na plataforma.`,
            link: "/painel-ganm-ols/controle",
            type: "logins",
          }))
        );
      }
    } catch (err) {
      console.warn("Signin notification failed:", err);
    }
  }

  const response = buildRedirect(request, redirectTo ?? "/");
  applyPendingCookies(response, pendingCookies);
  return response;
}

export async function GET(request: Request) {
  return buildRedirect(request, "/entrar");
}
