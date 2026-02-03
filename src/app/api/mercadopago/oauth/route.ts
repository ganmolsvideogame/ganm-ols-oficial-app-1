import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

function buildRedirect(request: Request, path: string, params?: Record<string, string>) {
  const url = new URL(path, request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return NextResponse.redirect(url, { status: 303 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return buildRedirect(request, "/vender", {
      error: "Autorizacao do Mercado Pago falhou",
    });
  }

  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;
  const redirectUri = process.env.MERCADOPAGO_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return buildRedirect(request, "/vender", {
      error: "Credenciais do Mercado Pago nao configuradas",
    });
  }

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("mp_oauth_state")?.value ?? "";
  const [storedState, userId] = cookieValue.split(":");

  if (!storedState || storedState !== state || !userId) {
    return buildRedirect(request, "/vender", {
      error: "Sessao de autorizacao expirada",
    });
  }

  const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    return buildRedirect(request, "/vender", {
      error: "Nao foi possivel conectar o Mercado Pago",
    });
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    user_id: number | string;
    expires_in?: number;
  };

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  const admin = createAdminClient();
  await admin
    .from("seller_payment_accounts")
    .upsert(
      {
        user_id: userId,
        provider: "mercadopago",
        mp_user_id: String(tokenData.user_id),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  cookieStore.set("mp_oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });

  return buildRedirect(request, "/vender", {
    success: "Mercado Pago conectado com sucesso",
  });
}
