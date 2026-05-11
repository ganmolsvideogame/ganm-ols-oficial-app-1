import "server-only";

import { createHash } from "crypto";

import type { BlogLocale } from "@/lib/blog/locales";
import { createAdminClient } from "@/lib/supabase/admin";

const BLOG_NEWSLETTER_KEY_PREFIX = "blog_newsletter:";

type SiteSettingRow = {
  key: string;
  value: string | null;
};

export type BlogNewsletterSubscriber = {
  email: string;
  locale: BlogLocale;
  source: "blog";
  status: "active";
  subscribedAt: string;
  updatedAt: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function buildSubscriberKey(email: string) {
  return `${BLOG_NEWSLETTER_KEY_PREFIX}${hashValue(email)}`;
}

function parseSubscriber(row: SiteSettingRow): BlogNewsletterSubscriber | null {
  const raw = String(row.value ?? "").trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BlogNewsletterSubscriber>;
    const email = normalizeEmail(String(parsed.email ?? ""));
    if (!email || parsed.status !== "active") {
      return null;
    }

    return {
      email,
      locale: parsed.locale === "en" ? "en" : "pt",
      source: "blog",
      status: "active",
      subscribedAt:
        String(parsed.subscribedAt ?? "").trim() || new Date().toISOString(),
      updatedAt:
        String(parsed.updatedAt ?? "").trim() || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function isValidNewsletterEmail(value: string) {
  const normalized = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export async function upsertBlogNewsletterSubscriber(params: {
  email: string;
  locale: BlogLocale;
}) {
  const email = normalizeEmail(params.email);
  if (!isValidNewsletterEmail(email)) {
    throw new Error("Invalid newsletter email.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const key = buildSubscriberKey(email);
  const value: BlogNewsletterSubscriber = {
    email,
    locale: params.locale,
    source: "blog",
    status: "active",
    subscribedAt: now,
    updatedAt: now,
  };

  const { error } = await admin.from("site_settings").upsert({
    key,
    value: JSON.stringify(value),
  });

  if (error) {
    throw error;
  }

  return value;
}

export async function listBlogNewsletterSubscribers() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .select("key, value")
    .like("key", `${BLOG_NEWSLETTER_KEY_PREFIX}%`);

  if (error) {
    throw error;
  }

  const deduped = new Map<string, BlogNewsletterSubscriber>();
  (data ?? []).forEach((row) => {
    const subscriber = parseSubscriber(row as SiteSettingRow);
    if (!subscriber) {
      return;
    }
    deduped.set(subscriber.email, subscriber);
  });

  return Array.from(deduped.values());
}
