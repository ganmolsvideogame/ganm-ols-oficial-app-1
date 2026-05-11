import "server-only";

import type { BlogLocale } from "@/lib/blog/locales";
import { buildBlogPostPath } from "@/lib/blog/locales";
import { getBlogPostBySlug } from "@/lib/blog/posts";
import { listBlogNewsletterSubscribers } from "@/lib/blog/newsletter";
import { sendBlogArticleEmail } from "@/lib/brevo/blog";
import { sendBrowserPushNotification } from "@/lib/push/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAbsoluteUrl } from "@/lib/utils/site";

type AdminRow = {
  user_id: string | null;
  email: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

export async function getAllUsersBlogAudience() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, display_name");

  if (error) {
    throw error;
  }

  const recipients = new Map<string, { email: string; name?: string }>();
  const userIds = new Set<string>();

  (data ?? []).forEach((row) => {
    const profile = row as ProfileRow;
    const userId = String(profile.id ?? "").trim();
    const email = String(profile.email ?? "").trim().toLowerCase();

    if (userId) {
      userIds.add(userId);
    }

    if (email) {
      recipients.set(email, {
        email,
        name: String(profile.display_name ?? "").trim() || undefined,
      });
    }
  });

  return {
    userIds: Array.from(userIds),
    recipients: Array.from(recipients.values()),
  };
}

type BlogBroadcastAudience = "admins" | "newsletter" | "all-users";

export async function getAdminBlogAudience() {
  const admin = createAdminClient();
  const { data, error } = await admin.from("admins").select("user_id, email");

  if (error) {
    throw error;
  }

  const userIds = new Set<string>();
  const emailMap = new Map<string, { email: string; name?: string }>();
  const fallbackEmails = new Set<string>();

  (data ?? []).forEach((row) => {
    const adminRow = row as AdminRow;
    const userId = String(adminRow.user_id ?? "").trim();
    if (userId) {
      userIds.add(userId);
    }

    const email = String(adminRow.email ?? "").trim().toLowerCase();
    if (email) {
      emailMap.set(email, { email });
      if (!userId) {
        fallbackEmails.add(email);
      }
    }
  });

  if (userIds.size > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, display_name")
      .in("id", Array.from(userIds));

    (profiles ?? []).forEach((row) => {
      const profile = row as ProfileRow;
      const email = String(profile.email ?? "").trim().toLowerCase();
      if (!email) {
        return;
      }

      emailMap.set(email, {
        email,
        name: String(profile.display_name ?? "").trim() || undefined,
      });
    });
  }

  if (fallbackEmails.size > 0) {
    const results = await Promise.all(
      Array.from(fallbackEmails).map((email) =>
        admin
          .from("profiles")
          .select("id, email, display_name")
          .ilike("email", email)
          .maybeSingle()
      )
    );

    results.forEach((result) => {
      const profile = (result.data ?? null) as ProfileRow | null;
      const id = String(profile?.id ?? "").trim();
      const email = String(profile?.email ?? "").trim().toLowerCase();

      if (id) {
        userIds.add(id);
      }
      if (email) {
        emailMap.set(email, {
          email,
          name: String(profile?.display_name ?? "").trim() || undefined,
        });
      }
    });
  }

  return {
    userIds: Array.from(userIds),
    recipients: Array.from(emailMap.values()),
  };
}

export async function broadcastBlogArticle(params: {
  slug: string;
  locale: BlogLocale;
  audience: BlogBroadcastAudience;
  channels?: {
    inApp?: boolean;
    browser?: boolean;
    email?: boolean;
  };
}) {
  const post = getBlogPostBySlug(params.slug, params.locale);
  if (!post) {
    throw new Error("Blog article not found.");
  }

  const admin = createAdminClient();
  const path = buildBlogPostPath(params.locale, post.slug);
  const articleUrl = buildAbsoluteUrl(path);
  const articleCoverImage = buildAbsoluteUrl(post.coverImage);
  const headline =
    params.locale === "en"
      ? "Fresh read on the GANM OLS blog"
      : "Leitura nova no blog da GANM OLS";
  const body =
    params.locale === "en"
      ? `${post.title} is live now.`
      : `${post.title} já está no ar.`;

  let recipients: Array<{ email: string; name?: string }> = [];
  let userIds: string[] = [];

  if (params.audience === "admins") {
    const adminAudience = await getAdminBlogAudience();
    recipients = adminAudience.recipients;
    userIds = adminAudience.userIds;
  } else if (params.audience === "all-users") {
    const fullAudience = await getAllUsersBlogAudience();
    recipients = fullAudience.recipients;
    userIds = fullAudience.userIds;
  } else {
    const newsletterAudience = await listBlogNewsletterSubscribers();
    recipients = newsletterAudience.map((subscriber) => ({
      email: subscriber.email,
    }));
  }

  let inAppCount = 0;
  if (params.channels?.inApp !== false && userIds.length > 0) {
    const { error } = await admin.from("notifications").insert(
      userIds.map((userId) => ({
        user_id: userId,
        title: headline,
        body,
        link: path,
        type: "blog-editorial",
      }))
    );

    if (!error) {
      inAppCount = userIds.length;
    }
  }

  const browserResult =
    params.channels?.browser === false
      ? { ok: true, sent: 0, failed: 0, skipped: true, reason: "disabled" }
      : await sendBrowserPushNotification({
          userIds: params.audience === "newsletter" ? undefined : userIds,
          payload: {
            title: headline,
            body,
            url: articleUrl,
            tag: `blog-${post.slug}`,
            lang: params.locale === "en" ? "en-US" : "pt-BR",
            image: articleCoverImage,
          },
        });

  const emailResult =
    params.channels?.email === false
      ? { ok: true, skipped: true }
      : await sendBlogArticleEmail({
          recipients,
          locale: params.locale,
          articleTitle: post.title,
          articleSummary: post.description,
          articleUrl,
        });

  return {
    post: {
      slug: post.slug,
      title: post.title,
      url: articleUrl,
    },
    audience: params.audience,
    recipients: recipients.length,
    inAppCount,
    browserResult,
    emailResult,
  };
}
