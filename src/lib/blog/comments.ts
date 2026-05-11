import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type BlogCommentAuthorRole = "member" | "admin";

export type BlogCommentReply = {
  id: string;
  authorUserId: string;
  authorName: string;
  authorRole: BlogCommentAuthorRole;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogComment = {
  id: string;
  authorUserId: string;
  authorName: string;
  authorRole: BlogCommentAuthorRole;
  body: string;
  createdAt: string;
  updatedAt: string;
  replies: BlogCommentReply[];
};

const BLOG_COMMENTS_KEY_PREFIX = "blog_comments:";

function getBlogCommentsKey(slug: string) {
  return `${BLOG_COMMENTS_KEY_PREFIX}${slug}`;
}

function parseString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeReply(value: unknown): BlogCommentReply | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const reply = value as Record<string, unknown>;
  const id = parseString(reply.id);
  const authorUserId = parseString(reply.authorUserId);
  const authorName = parseString(reply.authorName);
  const body = parseString(reply.body);
  const createdAt = parseString(reply.createdAt);
  const updatedAt = parseString(reply.updatedAt);
  const authorRole =
    parseString(reply.authorRole) === "admin" ? "admin" : "member";

  if (!id || !authorUserId || !authorName || !body || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    authorUserId,
    authorName,
    authorRole,
    body,
    createdAt,
    updatedAt,
  };
}

function normalizeComment(value: unknown): BlogComment | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const comment = value as Record<string, unknown>;
  const id = parseString(comment.id);
  const authorUserId = parseString(comment.authorUserId);
  const authorName = parseString(comment.authorName);
  const body = parseString(comment.body);
  const createdAt = parseString(comment.createdAt);
  const updatedAt = parseString(comment.updatedAt);
  const authorRole =
    parseString(comment.authorRole) === "admin" ? "admin" : "member";
  const replies = Array.isArray(comment.replies)
    ? comment.replies
        .map((entry) => normalizeReply(entry))
        .filter((entry): entry is BlogCommentReply => Boolean(entry))
    : [];

  if (!id || !authorUserId || !authorName || !body || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    authorUserId,
    authorName,
    authorRole,
    body,
    createdAt,
    updatedAt,
    replies,
  };
}

function parseStoredComments(rawValue: string | null) {
  if (!rawValue) {
    return [] as BlogComment[];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [] as BlogComment[];
    }

    return parsed
      .map((entry) => normalizeComment(entry))
      .filter((entry): entry is BlogComment => Boolean(entry))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
      });
  } catch {
    return [] as BlogComment[];
  }
}

export async function getBlogComments(slug: string) {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    return [] as BlogComment[];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", getBlogCommentsKey(normalizedSlug))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return parseStoredComments(data?.value ?? null);
}

export async function saveBlogComments(slug: string, comments: BlogComment[]) {
  const normalizedSlug = slug.trim();
  if (!normalizedSlug) {
    throw new Error("Slug invalido para comentarios do blog.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("site_settings").upsert(
    {
      key: getBlogCommentsKey(normalizedSlug),
      value: JSON.stringify(comments),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function resolveBlogCommentAuthorName(
  userId: string,
  fallbackEmail?: string | null
) {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return fallbackEmail?.trim() || "Usuario";
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("display_name, email")
    .eq("id", normalizedUserId)
    .maybeSingle();

  return (
    data?.display_name?.trim() ||
    data?.email?.trim() ||
    fallbackEmail?.trim() ||
    "Usuario"
  );
}
