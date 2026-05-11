import "server-only";

import type { BlogLocale } from "@/lib/blog/locales";
import {
  buildBlogArticleEmail,
  buildBlogNewsletterWelcomeEmail,
} from "@/lib/brevo/templates";
import { sendBrevoEmail, upsertBrevoContact } from "@/lib/brevo/client";

type Recipient = {
  email: string;
  name?: string | null;
};

function parseListId(value: string | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getNewsletterListIds() {
  const ids = [
    parseListId(process.env.BREVO_ALL_USERS_LIST_ID),
    parseListId(process.env.BREVO_BLOG_NEWSLETTER_LIST_ID),
  ].filter((value): value is number => value !== null);

  return Array.from(new Set(ids));
}

export async function syncBlogNewsletterContact(email: string) {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) {
    return {
      ok: false,
      skipped: true,
      error: "Missing newsletter email",
    };
  }

  return upsertBrevoContact({
    email: normalized,
    listIds: getNewsletterListIds(),
  });
}

export async function sendBlogNewsletterWelcome(params: {
  email: string;
  locale: BlogLocale;
}) {
  const normalized = String(params.email ?? "").trim().toLowerCase();
  if (!normalized) {
    return {
      ok: false,
      skipped: true,
      error: "Missing newsletter email",
    };
  }

  const template = buildBlogNewsletterWelcomeEmail({
    locale: params.locale,
  });

  return sendBrevoEmail({
    to: [{ email: normalized }],
    subject: template.subject,
    htmlContent: template.html,
    textContent: template.text,
    tags: ["blog-newsletter", `locale:${params.locale}`],
  });
}

export async function sendBlogArticleEmail(params: {
  recipients: Recipient[];
  locale: BlogLocale;
  articleTitle: string;
  articleSummary: string;
  articleUrl: string;
}) {
  const cleanRecipients = params.recipients
    .map((recipient) => ({
      email: String(recipient.email ?? "").trim().toLowerCase(),
      name: recipient.name?.trim() || undefined,
    }))
    .filter((recipient) => Boolean(recipient.email));

  if (cleanRecipients.length === 0) {
    return {
      ok: false,
      skipped: true,
      error: "Missing article email recipients",
    };
  }

  const template = buildBlogArticleEmail({
    locale: params.locale,
    articleTitle: params.articleTitle,
    articleSummary: params.articleSummary,
    articleUrl: params.articleUrl,
  });

  return sendBrevoEmail({
    to: cleanRecipients,
    subject: template.subject,
    htmlContent: template.html,
    textContent: template.text,
    tags: ["blog-article", `locale:${params.locale}`],
  });
}
