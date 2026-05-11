import Link from "next/link";

import { submitBlogComment, submitBlogCommentReply } from "@/app/blog/actions";
import type { BlogComment } from "@/lib/blog/comments";
import { getBlogUiCopy } from "@/lib/blog/copy";
import {
  DEFAULT_BLOG_LOCALE,
  type BlogLocale,
} from "@/lib/blog/locales";
import { formatBlogDateTime } from "@/lib/blog/posts";

type BlogCommentsProps = {
  slug: string;
  locale?: BlogLocale;
  articlePath: string;
  comments: BlogComment[];
  isAdmin: boolean;
  isAuthenticated: boolean;
  commentErrorMessage?: string;
  commentSuccessMessage?: string;
};

function roleBadge(role: "member" | "admin") {
  return role === "admin"
    ? "border-zinc-900 bg-zinc-900 text-white"
    : "border-zinc-200 bg-white text-zinc-600";
}

export default function BlogComments({
  slug,
  locale = DEFAULT_BLOG_LOCALE,
  articlePath,
  comments,
  isAdmin,
  isAuthenticated,
  commentErrorMessage = "",
  commentSuccessMessage = "",
}: BlogCommentsProps) {
  const copy = getBlogUiCopy(locale).comments;

  return (
    <section
      id="comentarios"
      className="mt-8 rounded-[2.5rem] border border-zinc-200 bg-white px-6 py-8 shadow-sm md:px-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-600">
            {copy.sectionEyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.05em] text-zinc-950">
            {copy.sectionTitle}
          </h2>
        </div>
        <p className="text-sm text-zinc-500">{copy.countLabel(comments.length)}</p>
      </div>

      {commentErrorMessage ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {commentErrorMessage}
        </div>
      ) : null}
      {commentSuccessMessage ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {commentSuccessMessage}
        </div>
      ) : null}

      <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5">
        {isAuthenticated ? (
          <form action={submitBlogComment} className="space-y-3">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="article_path" value={articlePath} />
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              {copy.leaveCommentLabel}
            </label>
            <textarea
              name="body"
              className="min-h-[140px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900"
              placeholder={copy.textareaPlaceholder}
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                {copy.publishLabel}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-7 text-zinc-600">
              {copy.loginPrompt}
            </p>
            <Link
              href={`/entrar?redirect_to=${encodeURIComponent(`${articlePath}#comentarios`)}`}
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              {copy.loginLabel}
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50 px-5 py-8 text-sm text-zinc-500">
            {copy.emptyLabel}
          </div>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-[2rem] border border-zinc-200 bg-white px-5 py-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-zinc-950">{comment.authorName}</p>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${roleBadge(comment.authorRole)}`}
                        >
                          {comment.authorRole === "admin" ? "Admin" : copy.memberLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatBlogDateTime(comment.createdAt, locale)}
                      </p>
                    </div>
                  </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                {comment.body}
              </p>

              {comment.replies.length > 0 ? (
                <div className="mt-5 space-y-3 border-t border-zinc-200 pt-4">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-zinc-950">{reply.authorName}</p>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${roleBadge(reply.authorRole)}`}
                        >
                          {reply.authorRole === "admin" ? "Admin" : copy.memberLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatBlogDateTime(reply.createdAt, locale)}
                      </p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                        {reply.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {isAdmin ? (
                <form action={submitBlogCommentReply} className="mt-5 space-y-3 border-t border-zinc-200 pt-4">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="article_path" value={articlePath} />
                  <input type="hidden" name="comment_id" value={comment.id} />
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {copy.adminReplyLabel}
                  </label>
                  <textarea
                    name="body"
                    className="min-h-[110px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900"
                    placeholder={copy.adminReplyPlaceholder}
                    required
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                        className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-300 hover:bg-zinc-50"
                    >
                      {copy.sendReplyLabel}
                    </button>
                  </div>
                </form>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
