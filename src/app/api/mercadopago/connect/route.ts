import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, "/entrar", {
      error: "Faca login para conectar o Mercado Pago",
    });
  }

  const clientId = process.env.MERCADOPAGO_CLIENT_ID;
  const redirectUri = process.env.MERCADOPAGO_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return buildRedirect(request, "/vender", {
      error: "Credenciais do Mercado Pago nao configuradas",
    });
  }

  const state = crypto.randomUUID();
  const cookieValue = `${state}:${user.id}`;

  const cookieStore = await cookies();
  cookieStore.set("mp_oauth_state", cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  });

  const authUrl = new URL("https://auth.mercadopago.com.br/authorization");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl, { status: 303 });
}
