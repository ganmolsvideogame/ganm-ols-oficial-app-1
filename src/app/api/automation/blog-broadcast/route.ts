import { NextResponse } from "next/server";

import { loadEmailAutomationSettings } from "@/lib/automation/email-settings";
import { broadcastBlogArticle } from "@/lib/blog/delivery";
import { getAllBlogPosts } from "@/lib/blog/posts";
import {
  isCronAuthorized,
  missingCronSecretResponse,
  unauthorizedCronResponse,
} from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const BLOG_BROADCAST_SETTING_KEYS = {
  lastArticleKey: "blog_broadcast_last_article_key",
  lastSentAt: "blog_broadcast_last_sent_at",
} as const;

export async function GET(request: Request) {
  const cronSecret = String(process.env.CRON_SECRET ?? "").trim();
  if (!cronSecret) {
    return missingCronSecretResponse();
  }

  if (!isCronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const admin = createAdminClient();
  const settings = await loadEmailAutomationSettings(admin);

  if (!settings.blogBroadcastEnabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
  }

  const now = new Date();

  const latestPost = getAllBlogPosts("pt")[0];
  if (!latestPost) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "no-blog-posts",
    });
  }

  const articleKey = `${latestPost.slug}:${latestPost.updatedAt ?? latestPost.publishedAt}`;
  const { data: siteSettingsRows, error: siteSettingsError } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", Object.values(BLOG_BROADCAST_SETTING_KEYS));

  if (siteSettingsError) {
    return NextResponse.json(
      { ok: false, error: siteSettingsError.message },
      { status: 500 }
    );
  }

  const settingsMap = new Map(
    (siteSettingsRows ?? []).map((row) => [
      String(row.key ?? "").trim(),
      String(row.value ?? "").trim(),
    ])
  );

  if (settingsMap.get(BLOG_BROADCAST_SETTING_KEYS.lastArticleKey) === articleKey) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "already-sent",
      articleKey,
    });
  }

  const result = await broadcastBlogArticle({
    slug: latestPost.slug,
    locale: "pt",
    audience: settings.blogBroadcastAudience,
    channels: {
      inApp: true,
      browser: true,
      email: true,
    },
  });

  await admin.from("site_settings").upsert(
    [
      {
        key: BLOG_BROADCAST_SETTING_KEYS.lastArticleKey,
        value: articleKey,
        updated_at: now.toISOString(),
      },
      {
        key: BLOG_BROADCAST_SETTING_KEYS.lastSentAt,
        value: now.toISOString(),
        updated_at: now.toISOString(),
      },
    ],
    { onConflict: "key" }
  );

  await admin.from("system_events").insert({
    event_type: "blog_broadcast_sent",
    entity_id: latestPost.slug,
    metadata: {
      audience: settings.blogBroadcastAudience,
      article_key: articleKey,
      result,
    },
  });

  return NextResponse.json({
    ok: true,
    skipped: false,
    result,
  });
}
