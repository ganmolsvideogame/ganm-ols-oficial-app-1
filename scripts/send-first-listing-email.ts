import { createClient } from "@supabase/supabase-js";

type SellerRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  created_at: string | null;
};

type BrevoResult = {
  ok: boolean;
  skipped?: boolean;
  status?: number;
  error?: string;
  data?: unknown;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function resolveBaseUrl() {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.ganmols.com"
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveBrandLogoUrl() {
  return new URL("/ganm ols logo para email.png", resolveBaseUrl()).toString();
}

function resolveSiteUrl(path: string) {
  return new URL(path, resolveBaseUrl()).toString();
}

function renderFooter() {
  const brandLogoUrl = resolveBrandLogoUrl();
  const privacyUrl = resolveSiteUrl("/politica-de-privacidade");
  const contactUrl = resolveSiteUrl("/contato");
  const sellerUrl = resolveSiteUrl("/vender");

  return `
    <div style="margin-top:32px;border-top:1px solid #e7e5e4;padding:24px 32px 30px;background:#fffdfa;">
      <div style="text-align:center;">
        <img src="${brandLogoUrl}" alt="GANM OLS" width="176" style="display:inline-block;max-width:176px;width:100%;height:auto;" />
        <p style="margin:18px 0 0;color:#6b7280;font-size:13px;line-height:1.7;">
          Voce recebeu esta mensagem porque existe uma atividade importante na sua conta da GANM OLS.
        </p>
        <p style="margin:16px 0 0;font-size:13px;line-height:1.7;">
          <a href="${privacyUrl}" style="color:#111827;text-decoration:underline;">Politica de Privacidade</a>
          <span style="color:#9ca3af;"> | </span>
          <a href="${contactUrl}" style="color:#111827;text-decoration:underline;">Central de Ajuda</a>
          <span style="color:#9ca3af;"> | </span>
          <a href="${sellerUrl}" style="color:#111827;text-decoration:underline;">Quero vender</a>
        </p>
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
          (c) 2026 GANM OLS. Marketplace gamer com operacao no Brasil.
        </p>
      </div>
    </div>
  `;
}

function renderFrame(params: {
  eyebrow: string;
  title: string;
  intro: string;
  body: string[];
  actionLabel: string;
  actionUrl: string;
}) {
  const brandLogoUrl = resolveBrandLogoUrl();
  const bodyHtml = params.body
    .map(
      (line) =>
        `<p style="margin:0 0 14px;color:#27272a;font-size:15px;line-height:1.8;">${escapeHtml(line)}</p>`
    )
    .join("");

  return `
    <div style="background:#f6efef;padding:32px 12px;font-family:Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #ede9e8;border-radius:28px;overflow:hidden;box-shadow:0 14px 40px rgba(17,24,39,0.06);">
        <div style="padding:36px 32px 16px;text-align:center;">
          <img src="${brandLogoUrl}" alt="GANM OLS" width="204" style="display:inline-block;max-width:204px;width:100%;height:auto;" />
        </div>
        <div style="padding:0 32px 8px;text-align:center;">
          <div style="color:#6b7280;font-size:12px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;">${escapeHtml(params.eyebrow)}</div>
          <div style="margin-top:18px;color:#111827;font-size:36px;line-height:1.16;font-weight:800;">${escapeHtml(params.title)}</div>
          <div style="margin-top:16px;color:#4b5563;font-size:17px;line-height:1.8;">${escapeHtml(params.intro)}</div>
        </div>
        <div style="padding:18px 32px 0;">
          ${bodyHtml}
          <div style="margin-top:28px;text-align:center;">
            <a href="${params.actionUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:14px;padding:16px 28px;font-size:15px;font-weight:700;">
              ${escapeHtml(params.actionLabel)}
            </a>
          </div>
        </div>
        ${renderFooter()}
      </div>
    </div>
  `;
}

function buildFirstListingEmail(displayName: string, actionUrl: string) {
  const name = displayName.trim() || "Vendedor";

  return {
    subject: "Sua conta de vendedor ja esta pronta na GANM OLS",
    html: renderFrame({
      eyebrow: "GANM OLS",
      title: "Sua loja pode entrar no ar",
      intro:
        "Publique seu primeiro anuncio, organize sua vitrine e acompanhe pedidos pelo painel do vendedor.",
      body: [
        `${name}, sua conta de vendedor foi ativada na GANM OLS.`,
        "Seu proximo passo e publicar o primeiro anuncio com titulo forte, fotos claras e preco competitivo.",
      ],
      actionLabel: "Criar meu primeiro anuncio",
      actionUrl,
    }),
    text: `${name}, sua conta de vendedor foi ativada na GANM OLS. Publique seu primeiro anuncio em: ${actionUrl}`,
  };
}

async function sendBrevoEmail(params: {
  to: { email: string; name?: string | null };
  subject: string;
  htmlContent: string;
  textContent: string;
  tags: string[];
}): Promise<BrevoResult> {
  const apiKey = requireEnv("BREVO_API_KEY");
  const senderEmail = requireEnv("BREVO_SENDER_EMAIL");
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "GANM OLS";
  const replyToEmail = process.env.BREVO_REPLY_TO_EMAIL?.trim();
  const replyToName = process.env.BREVO_REPLY_TO_NAME?.trim() || "GANM OLS";

  const payload: Record<string, unknown> = {
    sender: {
      email: senderEmail,
      name: senderName,
    },
    to: [
      {
        email: params.to.email,
        name: params.to.name?.trim() || undefined,
      },
    ],
    subject: params.subject,
    htmlContent: params.htmlContent,
    textContent: params.textContent,
    tags: params.tags,
  };

  if (replyToEmail) {
    payload.replyTo = {
      email: replyToEmail,
      name: replyToName,
    };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error:
        typeof data === "object" &&
        data &&
        "message" in data &&
        typeof data.message === "string"
          ? data.message
          : raw || `Brevo error ${response.status}`,
      data,
    };
  }

  return {
    ok: true,
    status: response.status,
    data,
  };
}

async function persistEvent(params: {
  admin: {
    from: (table: string) => {
      insert: (values: unknown) => unknown;
    };
  };
  seller: SellerRow;
  email: string;
  result: BrevoResult;
}) {
  await params.admin.from("system_events" as never).insert({
    event_type: "seller_onboarding_email_sent",
    actor_id: params.seller.id,
    entity_type: "profile",
    entity_id: params.seller.id,
    metadata: {
      flow: "onboarding",
      stage: "welcome",
      anchor_at: params.seller.created_at,
      sent_to: params.email,
      manual_broadcast: true,
      status: params.result.ok
        ? "success"
        : params.result.skipped
          ? "skipped"
          : "error",
      result: params.result,
    },
  } as never);
}

async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const actionUrl = new URL("/vender/anunciar", resolveBaseUrl()).toString();

  const { data, error } = await admin
    .from("profiles")
    .select("id, display_name, email, created_at")
    .eq("role", "seller")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const sellers = (data ?? []) as SellerRow[];
  const seenEmails = new Set<string>();
  const summary = {
    totalSellers: sellers.length,
    sent: 0,
    failed: 0,
    skippedMissingEmail: 0,
    skippedDuplicateEmail: 0,
    recipients: [] as string[],
    failures: [] as Array<{ email: string; error: string }>,
  };

  for (const seller of sellers) {
    const email = String(seller.email ?? "").trim().toLowerCase();
    if (!email) {
      summary.skippedMissingEmail += 1;
      continue;
    }

    if (seenEmails.has(email)) {
      summary.skippedDuplicateEmail += 1;
      continue;
    }
    seenEmails.add(email);

    const template = buildFirstListingEmail(seller.display_name ?? "", actionUrl);
    const result = await sendBrevoEmail({
      to: { email, name: seller.display_name ?? undefined },
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text,
      tags: ["seller-broadcast", "first-listing", "welcome"],
    });

    await persistEvent({
      admin,
      seller,
      email,
      result,
    });

    if (result.ok) {
      summary.sent += 1;
      summary.recipients.push(email);
    } else {
      summary.failed += 1;
      summary.failures.push({
        email,
        error: result.error ?? "unknown_error",
      });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
