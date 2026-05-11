import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Scope = "all" | "buyers" | "sellers";

type ProfileExportRow = {
  display_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string | null;
};

function getScope(raw: string | null): Scope {
  if (raw === "buyers") {
    return "buyers";
  }
  if (raw === "sellers") {
    return "sellers";
  }
  return "all";
}

function escapeCsv(value: string | null | undefined) {
  const normalized = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return `"${normalized.replace(/"/g, '""')}"`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(parsed);
}

function buildCsv(rows: ProfileExportRow[]) {
  const lines = [
    "sep=;",
    [
      "nome",
      "email",
      "telefone",
      "perfil",
      "criado_em",
    ].join(";"),
  ];

  rows.forEach((row) => {
    lines.push(
      [
        escapeCsv(row.display_name),
        escapeCsv(row.email),
        escapeCsv(row.phone),
        escapeCsv(row.role),
        escapeCsv(formatDateTime(row.created_at)),
      ].join(";")
    );
  });

  return `\uFEFF${lines.join("\r\n")}`;
}

function buildFileName(scope: Scope) {
  const date = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (scope === "buyers") {
    return `ganm-ols-compradores-${date}.csv`;
  }
  if (scope === "sellers") {
    return `ganm-ols-vendedores-${date}.csv`;
  }
  return `ganm-ols-contatos-${date}.csv`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Faca login para acessar o admin" },
      { status: 401 }
    );
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) {
    return NextResponse.json(
      { ok: false, error: "Sem permissao para acessar o admin" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const scope = getScope(url.searchParams.get("scope"));

  let query = supabase
    .from("profiles")
    .select("display_name, email, phone, role, created_at")
    .order("created_at", { ascending: false });

  if (scope === "buyers") {
    query = query.eq("role", "buyer");
  }
  if (scope === "sellers") {
    query = query.eq("role", "seller");
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const csv = buildCsv((data ?? []) as ProfileExportRow[]);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${buildFileName(scope)}"`,
      "cache-control": "no-store",
    },
  });
}
