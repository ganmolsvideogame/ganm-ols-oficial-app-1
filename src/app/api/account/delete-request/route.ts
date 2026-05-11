import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { sendBrevoEmail } from "@/lib/brevo/client";
import { createAdminClient } from "@/lib/supabase/admin";

function buildRedirect(
  request: Request,
  params?: Record<string, string>
) {
  const url = new URL("/excluir-conta", request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return NextResponse.redirect(url, { status: 303 });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(input: {
  name: string;
  email: string;
  phone: string;
  message: string;
  requestId: string;
  createdAt: string;
}) {
  const rows = [
    ["Protocolo", input.requestId],
    ["Data", input.createdAt],
    ["Nome", input.name || "Nao informado"],
    ["Email", input.email],
    ["Telefone", input.phone || "Nao informado"],
    ["Mensagem", input.message || "Nao informada"],
  ];

  const content = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e4e4e7;font-weight:600;">${escapeHtml(
          label
        )}</td><td style="padding:8px 12px;border:1px solid #e4e4e7;">${escapeHtml(
          value
        )}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6;">
      <h1 style="font-size:20px;margin:0 0 16px;">Solicitacao de exclusao de conta</h1>
      <p style="margin:0 0 16px;">Um usuario enviou um pedido de exclusao de conta pela pagina publica da GANM OLS.</p>
      <table style="border-collapse:collapse;width:100%;max-width:760px;">${content}</table>
    </div>
  `;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();

  if (!email) {
    return buildRedirect(request, {
      error: "Informe o email da conta para continuar.",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return buildRedirect(request, {
      error: "Informe um email valido.",
    });
  }

  if (confirm !== "yes") {
    return buildRedirect(request, {
      error: "Confirme a solicitacao antes de enviar.",
    });
  }

  const requestId = `delete-request-${randomUUID()}`;
  const createdAt = new Date().toISOString();

  try {
    const admin = createAdminClient();
    const payload = {
      request_id: requestId,
      created_at: createdAt,
      name,
      email,
      phone,
      message,
      status: "open",
      source: "public_account_deletion_page",
    };

    const { error: storeError } = await admin.from("site_settings").upsert(
      {
        key: `account_delete_request:${requestId}`,
        value: JSON.stringify(payload),
      },
      { onConflict: "key" }
    );

    if (storeError) {
      throw storeError;
    }

    const recipient =
      process.env.ACCOUNT_DELETION_CONTACT_EMAIL?.trim() ||
      process.env.BREVO_REPLY_TO_EMAIL?.trim() ||
      process.env.BREVO_SENDER_EMAIL?.trim() ||
      "contato@ganmols.com";

    await sendBrevoEmail({
      to: [{ email: recipient, name: "GANM OLS" }],
      subject: "Solicitacao de exclusao de conta GANM OLS",
      htmlContent: buildEmailHtml({
        name,
        email,
        phone,
        message,
        requestId,
        createdAt,
      }),
      textContent: [
        "Solicitacao de exclusao de conta GANM OLS",
        `Protocolo: ${requestId}`,
        `Data: ${createdAt}`,
        `Nome: ${name || "Nao informado"}`,
        `Email: ${email}`,
        `Telefone: ${phone || "Nao informado"}`,
        `Mensagem: ${message || "Nao informada"}`,
      ].join("\n"),
      tags: ["account-deletion-request"],
    });

    return buildRedirect(request, {
      success:
        "Pedido enviado com sucesso. O time da GANM OLS vai analisar a solicitacao pelo email informado.",
    });
  } catch (error) {
    return buildRedirect(request, {
      error:
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar a solicitacao agora.",
    });
  }
}
