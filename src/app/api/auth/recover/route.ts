import { NextResponse } from "next/server";

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
  const redirectTo = getSafeRedirect(
    String(formData.get("redirect_to") ?? "").trim()
  );
  const errorRedirect =
    getSafeRedirect(String(formData.get("error_redirect") ?? "").trim()) ??
    "/entrar";

  if (!email) {
    return buildRedirect(request, errorRedirect, {
      error: "Informe seu email para recuperar a senha",
    });
  }

  let supabase;
  let pendingCookies: Parameters<typeof applyPendingCookies>[1] = [];
  try {
    ({ supabase, pendingCookies } = await createRouteClient());
  } catch (error) {
    return buildRedirect(request, errorRedirect, {
      error:
        error instanceof Error
          ? error.message
          : "Falha ao iniciar recuperacao.",
    });
  }

  const callbackUrl = redirectTo
    ? new URL(redirectTo, request.url)
    : new URL("/entrar", request.url);

  let resetErrorMessage: string | null = null;
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl.toString(),
    });
    if (error) {
      resetErrorMessage = error.message;
    }
  } catch (error) {
    resetErrorMessage =
      error instanceof Error
        ? error.message
        : "Falha ao enviar email de recuperacao.";
  }

  if (resetErrorMessage) {
    const response = buildRedirect(request, errorRedirect, {
      error: resetErrorMessage,
    });
    applyPendingCookies(response, pendingCookies);
    return response;
  }

  const response = buildRedirect(request, errorRedirect, {
    message: "Se o email estiver cadastrado, enviaremos o link de recuperacao.",
  });
  applyPendingCookies(response, pendingCookies);
  return response;
}

export async function GET(request: Request) {
  return buildRedirect(request, "/entrar");
}
