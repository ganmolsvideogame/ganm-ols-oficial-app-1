"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { BlogComment } from "@/lib/blog/comments";
import {
  getBlogComments,
  resolveBlogCommentAuthorName,
  saveBlogComments,
} from "@/lib/blog/comments";
import {
  buildBlogIndexPath,
  buildBlogPostPath,
  DEFAULT_BLOG_LOCALE,
  type BlogLocale,
} from "@/lib/blog/locales";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { insertNotificationsWithPush } from "@/lib/push/delivery";

const MAX_BLOG_COMMENT_LENGTH = 1600;

function normalizeBody(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function normalizeLocale(value: FormDataEntryValue | null): BlogLocale {
  return String(value ?? "").trim() === "en" ? "en" : DEFAULT_BLOG_LOCALE;
}

function translateMessage(locale: BlogLocale, pt: string, en: string) {
  return locale === "en" ? en : pt;
}

function buildBlogPath(slug: string, locale: BlogLocale, articlePath?: string) {
  const normalizedPath = String(articlePath ?? "").trim();
  if (normalizedPath) {
    return normalizedPath;
  }

  return slug ? buildBlogPostPath(locale, slug) : buildBlogIndexPath(locale);
}

function redirectWithError(
  slug: string,
  locale: BlogLocale,
  articlePath: string | undefined,
  message: string
) {
  redirect(
    `${buildBlogPath(slug, locale, articlePath)}?comment_error=${encodeURIComponent(message)}#comentarios`
  );
}

function redirectWithSuccess(
  slug: string,
  locale: BlogLocale,
  articlePath: string | undefined,
  message: string
) {
  redirect(
    `${buildBlogPath(slug, locale, articlePath)}?comment_success=${encodeURIComponent(message)}#comentarios`
  );
}

async function requireAuthenticatedUser(
  slug: string,
  locale: BlogLocale,
  articlePath?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/entrar?redirect_to=${encodeURIComponent(`${buildBlogPath(slug, locale, articlePath)}#comentarios`)}`
    );
  }

  return { supabase, user };
}

async function notifyAdminsAboutBlogComment(
  slug: string,
  locale: BlogLocale,
  articlePath: string | undefined,
  title: string,
  body: string
) {
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("admins")
    .select("user_id")
    .not("user_id", "is", null);

  const recipients = (admins ?? [])
    .map((row) => String(row.user_id ?? "").trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return;
  }

  await insertNotificationsWithPush(admin, 
    recipients.map((userId) => ({
      user_id: userId,
      title,
      body,
      link: `${buildBlogPath(slug, locale, articlePath)}#comentarios`,
      type: "blog-comments",
    }))
  );
}

export async function submitBlogComment(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const locale = normalizeLocale(formData.get("locale"));
  const articlePath = String(formData.get("article_path") ?? "").trim() || undefined;
  const body = normalizeBody(formData.get("body"));

  if (!slug) {
    redirect(buildBlogIndexPath(locale));
  }

  if (!body) {
    redirectWithError(
      slug,
      locale,
      articlePath,
      translateMessage(locale, "Escreva um comentario para publicar.", "Write a comment before publishing.")
    );
  }

  if (body.length > MAX_BLOG_COMMENT_LENGTH) {
    redirectWithError(
      slug,
      locale,
      articlePath,
      translateMessage(locale, "Comentario muito longo. Resuma para continuar.", "Comment is too long. Shorten it to continue.")
    );
  }

  const { supabase, user } = await requireAuthenticatedUser(slug, locale, articlePath);
  const { data: isAdmin } = await supabase.rpc("is_admin");

  const authorName = await resolveBlogCommentAuthorName(user.id, user.email ?? null);

  const comments = await getBlogComments(slug);
  const now = new Date().toISOString();
  const nextComment: BlogComment = {
    id: crypto.randomUUID(),
    authorUserId: user.id,
    authorName,
    authorRole: isAdmin === true ? "admin" : "member",
    body,
    createdAt: now,
    updatedAt: now,
    replies: [],
  };

  await saveBlogComments(slug, [nextComment, ...comments]);
  await notifyAdminsAboutBlogComment(
    slug,
    locale,
    articlePath,
    "Novo comentario no blog",
    `${authorName} comentou em ${slug}.`
  );

  revalidatePath(buildBlogPath(slug, locale, articlePath));
  redirectWithSuccess(
    slug,
    locale,
    articlePath,
    translateMessage(locale, "Comentario enviado.", "Comment posted.")
  );
}

export async function submitBlogCommentReply(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const locale = normalizeLocale(formData.get("locale"));
  const articlePath = String(formData.get("article_path") ?? "").trim() || undefined;
  const commentId = String(formData.get("comment_id") ?? "").trim();
  const body = normalizeBody(formData.get("body"));

  if (!slug) {
    redirect(buildBlogIndexPath(locale));
  }

  if (!commentId || !body) {
    redirectWithError(
      slug,
      locale,
      articlePath,
      translateMessage(locale, "Resposta invalida.", "Invalid reply.")
    );
  }

  if (body.length > MAX_BLOG_COMMENT_LENGTH) {
    redirectWithError(
      slug,
      locale,
      articlePath,
      translateMessage(locale, "Resposta muito longa. Resuma para continuar.", "Reply is too long. Shorten it to continue.")
    );
  }

  const { supabase, user } = await requireAuthenticatedUser(slug, locale, articlePath);
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (isAdmin !== true) {
    redirectWithError(
      slug,
      locale,
      articlePath,
      translateMessage(locale, "Sem permissao para responder comentarios.", "You do not have permission to reply to comments.")
    );
  }

  const comments = await getBlogComments(slug);
  const commentIndex = comments.findIndex((comment) => comment.id === commentId);

  if (commentIndex < 0) {
    redirectWithError(
      slug,
      locale,
      articlePath,
      translateMessage(locale, "Comentario nao encontrado.", "Comment not found.")
    );
  }

  const authorName = await resolveBlogCommentAuthorName(user.id, user.email ?? null);
  const now = new Date().toISOString();
  const targetComment = comments[commentIndex];
  const updatedComments = [...comments];
  updatedComments[commentIndex] = {
    ...targetComment,
    replies: [
      ...(targetComment.replies ?? []),
      {
        id: crypto.randomUUID(),
        authorUserId: user.id,
        authorName,
        authorRole: "admin",
        body,
        createdAt: now,
        updatedAt: now,
      },
    ],
    updatedAt: now,
  };

  await saveBlogComments(slug, updatedComments);

  const admin = createAdminClient();
  if (targetComment.authorUserId && targetComment.authorUserId !== user.id) {
    await insertNotificationsWithPush(admin, {
      user_id: targetComment.authorUserId,
      title: "Seu comentario recebeu resposta",
      body: `A equipe respondeu no artigo ${slug}.`,
      link: `${buildBlogPath(slug, locale, articlePath)}#comentarios`,
      type: "blog-comments",
    });
  }

  revalidatePath(buildBlogPath(slug, locale, articlePath));
  redirectWithSuccess(
    slug,
    locale,
    articlePath,
    translateMessage(locale, "Resposta enviada.", "Reply sent.")
  );
}
