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
  const displayName = String(formData.get("display_name") ?? "").trim();
  const roleValue = String(formData.get("role") ?? "buyer");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = getSafeRedirect(String(formData.get("redirect_to") ?? "").trim());
  const errorRedirect = "/entrar";

  if (!displayName || !email || !password) {
    return buildRedirect(request, errorRedirect, {
      error: "Preencha todos os campos",
      ...(redirectTo ? { redirect_to: redirectTo } : {}),
    });
  }

  const role = roleValue === "seller" ? "seller" : "buyer";
  const { supabase, pendingCookies } = await createRouteClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        role,
      },
    },
  });

  if (error) {
    const response = buildRedirect(request, errorRedirect, {
      error: error.message,
      ...(redirectTo ? { redirect_to: redirectTo } : {}),
    });
    applyPendingCookies(response, pendingCookies);
    return response;
  }

  if (!data.session) {
    const response = buildRedirect(request, errorRedirect, {
      message: "Conta criada. Confirme seu email para entrar",
      ...(redirectTo ? { redirect_to: redirectTo } : {}),
    });
    applyPendingCookies(response, pendingCookies);
    return response;
  }

  if (data.user) {
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
            title: "Nova conta criada",
            body: `${label} criou uma conta (${role}).`,
            link: "/painel-ganm-ols/controle",
            type: "signups",
          }))
        );
      }
    } catch (err) {
      console.warn("Signup notification failed:", err);
    }
  }

  const response = buildRedirect(request, redirectTo ?? "/");
  applyPendingCookies(response, pendingCookies);
  return response;
}

export async function GET(request: Request) {
  return buildRedirect(request, "/entrar");
}
