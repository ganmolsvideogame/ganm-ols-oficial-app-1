import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  getMercadoPagoClientId,
  getMercadoPagoRedirectUri,
} from "@/lib/mercadopago/env";
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

function base64Url(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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

  let clientId: string;
  let redirectUri: string;
  try {
    clientId = getMercadoPagoClientId();
    redirectUri = getMercadoPagoRedirectUri();
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Credenciais do Mercado Pago invalidas";
    return buildRedirect(request, "/vender", {
      error: message,
    });
  }

  const state = crypto.randomUUID();
  const codeVerifier = base64Url(randomBytes(64));
  const codeChallenge = base64Url(
    createHash("sha256").update(codeVerifier).digest()
  );
  const cookieValue = `${state}:${user.id}`;

  const cookieStore = await cookies();
  cookieStore.set("mp_oauth_state", cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 10,
  });
  cookieStore.set("mp_oauth_verifier", codeVerifier, {
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
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(authUrl, { status: 303 });
}
