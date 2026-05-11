import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendBrevoEmail } from "@/lib/brevo/client";
import { buildAdminEventEmail } from "@/lib/brevo/templates";

type AdminRecipient = {
  email: string;
  name?: string;
};

type AdminRow = {
  user_id: string | null;
  email: string | null;
};

type AdminProfileRow = {
  id: string;
  display_name: string | null;
  email: string | null;
};

function normalizeBaseUrl(origin?: string | null) {
  return (
    origin?.trim() ||
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.ganmols.com"
  );
}

function parseEmailList(raw: string | undefined) {
  return String(raw ?? "")
    .split(/[\n,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function addRecipient(
  recipients: Map<string, AdminRecipient>,
  email: string | null | undefined,
  name?: string | null
) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) {
    return;
  }

  const current = recipients.get(normalized);
  recipients.set(normalized, {
    email: normalized,
    name: current?.name || name?.trim() || undefined,
  });
}

async function getAdminAlertRecipients(admin?: SupabaseClient) {
  const recipients = new Map<string, AdminRecipient>();

  for (const email of parseEmailList(process.env.ADMIN_EMAILS)) {
    addRecipient(recipients, email);
  }

  if (!admin) {
    return Array.from(recipients.values());
  }

  try {
    const { data } = await admin.from("admins").select("user_id, email");
    const rows = (data ?? []) as AdminRow[];
    const userIds = rows
      .map((row) => String(row.user_id ?? "").trim())
      .filter(Boolean);

    rows.forEach((row) => addRecipient(recipients, row.email));

    if (userIds.length > 0) {
      const { data: profilesData } = await admin
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);

      ((profilesData ?? []) as AdminProfileRow[]).forEach((profile) => {
        addRecipient(recipients, profile.email, profile.display_name);
      });
    }
  } catch {
    // Ignore admin lookup failures and fall back to env recipients.
  }

  return Array.from(recipients.values());
}

function formatMoneyBRL(value: number | null | undefined) {
  const cents = Number(value ?? 0);
  if (!Number.isFinite(cents) || cents <= 0) {
    return "Nao informado";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function formatListingTypeLabel(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase() === "auction"
    ? "Lance"
    : "Venda imediata";
}

function formatModerationStatusLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "approved") {
    return "Aprovado";
  }
  if (normalized === "rejected") {
    return "Reprovado";
  }
  if (normalized === "changes_required") {
    return "Ajustes solicitados";
  }
  return "Pendente";
}

export async function sendAdminSignupAlertEmail(params: {
  admin?: SupabaseClient;
  displayName: string;
  email: string;
  role: "buyer" | "seller";
  userId?: string | null;
  origin?: string | null;
}) {
  const recipients = await getAdminAlertRecipients(params.admin);
  if (recipients.length === 0) {
    return {
      ok: false,
      skipped: true,
      error: "Missing admin alert recipients",
    };
  }

  const roleLabel = params.role === "seller" ? "Vendedor" : "Comprador";
  const accountLabel = normalizeLabel(params.displayName, params.email);
  const actionUrl = new URL(
    "/painel-ganm-ols/controle",
    normalizeBaseUrl(params.origin)
  ).toString();

  const template = buildAdminEventEmail({
    subject: `Nova conta criada: ${accountLabel}`,
    eyebrow: "Nova conta criada",
    title: `${accountLabel} entrou na GANM OLS`,
    intro: "Um novo cadastro importante acabou de entrar na plataforma.",
    body: [
      `Nome: ${normalizeLabel(params.displayName, "Nao informado")}`,
      `Email: ${params.email}`,
      `Perfil: ${roleLabel}`,
      params.userId ? `ID da conta: ${params.userId}` : "ID da conta: nao informado",
    ],
    actionLabel: "Abrir painel administrativo",
    actionUrl,
  });

  return sendBrevoEmail({
    to: recipients,
    subject: template.subject,
    htmlContent: template.html,
    textContent: template.text,
    tags: ["admin-alert", "signup", `role:${params.role}`],
  });
}

export async function sendAdminEventAlertEmail(params: {
  admin?: SupabaseClient;
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  body: string[];
  actionLabel: string;
  actionPath?: string;
  actionUrl?: string;
  origin?: string | null;
  tags?: string[];
}) {
  const recipients = await getAdminAlertRecipients(params.admin);
  if (recipients.length === 0) {
    return {
      ok: false,
      skipped: true,
      error: "Missing admin alert recipients",
    };
  }

  const actionUrl =
    params.actionUrl ||
    new URL(
      params.actionPath || "/painel-ganm-ols/controle",
      normalizeBaseUrl(params.origin)
    ).toString();

  const template = buildAdminEventEmail({
    subject: params.subject,
    eyebrow: params.eyebrow,
    title: params.title,
    intro: params.intro,
    body: params.body,
    actionLabel: params.actionLabel,
    actionUrl,
  });

  return sendBrevoEmail({
    to: recipients,
    subject: template.subject,
    htmlContent: template.html,
    textContent: template.text,
    tags: params.tags?.length ? params.tags : ["admin-alert"],
  });
}

export async function sendAdminPurchaseAlertEmail(params: {
  admin?: SupabaseClient;
  orderId: string;
  listingTitle: string;
  buyerName?: string | null;
  buyerEmail?: string | null;
  sellerName?: string | null;
  sellerEmail?: string | null;
  amountCents?: number | null;
  quantity?: number | null;
  origin?: string | null;
}) {
  const shortOrderId = params.orderId.slice(0, 8).toUpperCase();
  const listingTitle = normalizeLabel(params.listingTitle, "Produto nao informado");

  return sendAdminEventAlertEmail({
    admin: params.admin,
    subject: `Compra aprovada: ${listingTitle}`,
    eyebrow: "Compra aprovada",
    title: `Pedido ${shortOrderId} confirmado`,
    intro: "Uma compra importante acabou de ser aprovada na GANM OLS.",
    body: [
      `Produto: ${listingTitle}`,
      `Comprador: ${normalizeLabel(params.buyerName, "Nao informado")} (${normalizeLabel(params.buyerEmail, "sem email")})`,
      `Vendedor: ${normalizeLabel(params.sellerName, "Nao informado")} (${normalizeLabel(params.sellerEmail, "sem email")})`,
      `Valor: ${formatMoneyBRL(params.amountCents)}`,
      `Quantidade: ${Math.max(1, Number(params.quantity ?? 1) || 1)}`,
    ],
    actionLabel: "Abrir pedidos",
    actionPath: "/painel-ganm-ols/pedidos",
    origin: params.origin,
    tags: ["admin-alert", "purchase"],
  });
}

export async function sendAdminListingAlertEmail(params: {
  admin?: SupabaseClient;
  listingId: string;
  listingTitle: string;
  sellerName?: string | null;
  sellerEmail?: string | null;
  priceCents?: number | null;
  listingType?: string | null;
  moderationStatus?: string | null;
  isFirstListing?: boolean;
  origin?: string | null;
}) {
  const listingTitle = normalizeLabel(
    params.listingTitle,
    "Produto nao informado"
  );
  const sellerLabel = normalizeLabel(
    params.sellerName,
    params.sellerEmail || "Vendedor"
  );
  const isFirstListing = params.isFirstListing === true;

  return sendAdminEventAlertEmail({
    admin: params.admin,
    subject: isFirstListing
      ? `Primeiro anuncio publicado: ${listingTitle}`
      : `Novo anuncio publicado: ${listingTitle}`,
    eyebrow: isFirstListing ? "Primeiro anuncio" : "Novo anuncio",
    title: `${sellerLabel} enviou um anuncio`,
    intro:
      "Um vendedor acabou de publicar um anuncio e ele entrou na fila de moderacao da GANM OLS.",
    body: [
      `Produto: ${listingTitle}`,
      `Vendedor: ${sellerLabel}`,
      `Email: ${normalizeLabel(params.sellerEmail, "sem email")}`,
      `Formato: ${formatListingTypeLabel(params.listingType)}`,
      `Preco: ${formatMoneyBRL(params.priceCents)}`,
      `Moderacao: ${formatModerationStatusLabel(params.moderationStatus)}`,
      `Primeiro anuncio do vendedor: ${isFirstListing ? "Sim" : "Nao"}`,
      `ID do anuncio: ${params.listingId}`,
    ],
    actionLabel: "Abrir anuncios",
    actionPath: "/painel-ganm-ols/anuncios",
    origin: params.origin,
    tags: [
      "admin-alert",
      "listing",
      isFirstListing ? "first-listing" : "listing-created",
    ],
  });
}
