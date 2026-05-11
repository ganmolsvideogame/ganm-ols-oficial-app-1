import "server-only";

import { NextResponse } from "next/server";

function readBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const prefix = "Bearer ";
  return header.startsWith(prefix) ? header.slice(prefix.length).trim() : "";
}

export function isCronAuthorized(request: Request) {
  const cronSecret = String(process.env.CRON_SECRET ?? "").trim();
  const refreshSecret = String(
    process.env.SUPERFRETE_REFRESH_SECRET ?? ""
  ).trim();
  const bearerToken = readBearerToken(request);
  const legacyToken = String(request.headers.get("x-refresh-token") ?? "").trim();

  if (cronSecret && bearerToken === cronSecret) {
    return true;
  }

  if (refreshSecret && legacyToken === refreshSecret) {
    return true;
  }

  return false;
}

export function missingCronSecretResponse() {
  return NextResponse.json({ error: "Missing cron secret" }, { status: 500 });
}

export function unauthorizedCronResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
