import Link from "next/link";
import { notFound } from "next/navigation";
import Script from "next/script";

import BlogComments from "@/components/blog/BlogComments";
import BlogImageFrame from "@/components/blog/BlogImageFrame";
import BlogNewsletterSignup from "@/components/blog/BlogNewsletterSignup";
import BlogPromoRail from "@/components/blog/BlogPromoRail";
import ShareBlogArticleButton from "@/components/blog/ShareBlogArticleButton";
import { getBlogComments } from "@/lib/blog/comments";
import { getBlogUiCopy } from "@/lib/blog/copy";
import {
  buildBlogIndexPath,
  buildBlogPostPath,
  DEFAULT_BLOG_LOCALE,
  type BlogLocale,
} from "@/lib/blog/locales";
import {
  formatBlogDateTime,
  getBlogPostAlternates,
  getBlogPostBySlug,
  getRelatedBlogPosts,
} from "@/lib/blog/posts";
import { createClient } from "@/lib/supabase/server";
import { buildAbsoluteUrl } from "@/lib/utils/site";

type BlogArticlePageProps = {
  slug: string;
  locale?: BlogLocale;
  searchParams?: { comment_error?: string; comment_success?: string };
};

function buildSectionId(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function BlogArticlePage({
  slug,
  locale = DEFAULT_BLOG_LOCALE,
  searchParams,
}: BlogArticlePageProps) {
  const copy = getBlogUiCopy(locale);
  const post = getBlogPostBySlug(slug, locale);

  if (!post) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const relatedPosts = getRelatedBlogPosts(post.slug, 2, locale);
  const canonicalPath = buildBlogPostPath(locale, post.slug);
  const comments = await getBlogComments(post.slug);
  const { data: isAdmin } = user ? await supabase.rpc("is_admin") : { data: false };
  const commentErrorMessage = searchParams?.comment_error
    ? String(searchParams.comment_error)
    : "";
  const commentSuccessMessage = searchParams?.comment_success
    ? String(searchParams.comment_success)
    : "";
  const articleUrl = buildAbsoluteUrl(canonicalPath);
  const alternates = getBlogPostAlternates(post.articleId).map((alternate) => ({
    locale: alternate.locale,
    label: alternate.locale === "en" ? "English" : "Português",
    href: buildBlogPostPath(alternate.locale, alternate.slug),
    active: alternate.locale === locale,
  }));

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    image: buildAbsoluteUrl(post.coverImage),
    author: {
      "@type": "Person",
      name: post.author.name,
    },
    publisher: {
      "@type": "Organization",
      name: "GANM OLS",
      url: buildAbsoluteUrl("/"),
      logo: {
        "@type": "ImageObject",
        url: buildAbsoluteUrl("/ganmolslogo.png"),
      },
    },
    mainEntityOfPage: articleUrl,
  };

  return (
    <div className="px-4 pb-16 pt-6 md:px-8 lg:px-10">
      <Script
        id={`blog-article-${post.slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="mx-auto max-w-[1480px] xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
        <div className="min-w-0">
          <article className="overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,.08)]">
            <BlogImageFrame
              src={post.coverImage}
              alt={post.coverAlt}
              title={post.title}
              eager
              aspectClassName="aspect-[16/8] md:aspect-[16/7]"
              imageClassName="h-full w-full object-cover"
            />

            <div className="border-t border-zinc-200 px-6 py-8 md:px-10 md:py-12">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-600">
                  {post.category}
                </p>
                <div className="flex flex-wrap gap-2">
                  {alternates.map((alternate) => (
                    <Link
                      key={alternate.locale}
                      href={alternate.href}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        alternate.active
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:text-zinc-950"
                      }`}
                    >
                      {alternate.label}
                    </Link>
                  ))}
                </div>
              </div>

              <h1 className="mt-5 max-w-5xl font-display text-4xl font-bold leading-[1.02] tracking-[-0.05em] text-zinc-950 md:text-6xl">
                {post.title}
              </h1>

              <p className="mt-5 max-w-4xl text-2xl leading-9 text-zinc-600">
                {post.tagline}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4 border-y border-zinc-200 py-4">
                <BlogImageFrame
                  src={post.author.avatar}
                  alt={post.author.name}
                  title={post.author.name}
                  eager
                  aspectClassName="h-12 w-12 overflow-hidden rounded-full border border-zinc-200"
                  imageClassName="h-full w-full object-cover"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-900">
                    {locale === "en" ? "By" : "Por"} {post.author.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                    {post.author.role}
                  </p>
                </div>
                <div className="hidden h-8 w-px bg-zinc-200 md:block" />
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-600">
                  {copy.article.updatedLabel}{" "}
                  {formatBlogDateTime(post.updatedAt ?? post.publishedAt, locale)}
                </p>
                <div className="ml-auto">
                  <ShareBlogArticleButton
                    title={post.title}
                    url={articleUrl}
                    locale={locale}
                  />
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] border border-zinc-200 bg-zinc-50 px-5 py-5">
                <p className="text-[1.1rem] font-semibold leading-8 text-zinc-950">
                  {copy.article.relatedLabel}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {post.relatedLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-10 space-y-6 text-[1.12rem] leading-9 text-zinc-700">
                {post.intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-12 space-y-12">
                {post.sections.map((section) => {
                  const sectionId = buildSectionId(section.title);

                  return (
                    <section
                      key={sectionId}
                      id={sectionId}
                      className="border-t border-zinc-200 pt-10"
                    >
                      <h2 className="font-display text-4xl font-bold leading-tight tracking-[-0.05em] text-zinc-950 md:text-5xl">
                        {section.title}
                      </h2>
                      {section.meta ? (
                        <p className="mt-4 text-base font-semibold italic leading-7 text-zinc-700">
                          {section.meta}
                        </p>
                      ) : null}

                      {section.media ? (
                        <figure className="mt-6">
                          <BlogImageFrame
                            src={section.media.src}
                            alt={section.media.alt}
                            title={section.title}
                            renderMode="natural"
                            containerClassName="w-full"
                            imageClassName="block h-auto w-full"
                          />

                          {section.media.caption ? (
                            <figcaption className="mt-3 text-xs leading-6 text-zinc-500">
                              {section.media.caption}
                            </figcaption>
                          ) : null}
                        </figure>
                      ) : null}

                      <div className="mt-6 space-y-5 text-[1.08rem] leading-9 text-zinc-700">
                        {section.paragraphs.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>

              {post.conclusion ? (
                <section className="mt-12 rounded-[2.2rem] border border-zinc-200 bg-[linear-gradient(180deg,#f7f7f8,#ffffff)] px-6 py-7">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-600">
                    {copy.article.closingLabel}
                  </p>
                  <h2 className="mt-4 font-display text-3xl font-bold tracking-[-0.04em] text-zinc-950 md:text-4xl">
                    {post.conclusion.title}
                  </h2>
                  <p className="mt-4 max-w-4xl text-lg leading-8 text-zinc-700">
                    {post.conclusion.body}
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href={post.conclusion.primaryCtaHref}
                      className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      {post.conclusion.primaryCtaLabel}
                    </Link>

                    {post.conclusion.secondaryCtaLabel &&
                    post.conclusion.secondaryCtaHref ? (
                      <Link
                        href={post.conclusion.secondaryCtaHref}
                        className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
                      >
                        {post.conclusion.secondaryCtaLabel}
                      </Link>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
          </article>

          <div className="mt-8">
            <BlogNewsletterSignup locale={locale} />
          </div>

          <BlogComments
            slug={post.slug}
            locale={locale}
            articlePath={canonicalPath}
            comments={comments}
            isAdmin={isAdmin === true}
            isAuthenticated={Boolean(user)}
            commentErrorMessage={commentErrorMessage}
            commentSuccessMessage={commentSuccessMessage}
          />

          {relatedPosts.length > 0 ? (
            <section className="mt-8 rounded-[2.5rem] border border-zinc-200 bg-white px-6 py-8 shadow-sm md:px-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-600">
                    {copy.article.continueReadingLabel}
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-bold tracking-[-0.05em] text-zinc-950">
                    {copy.article.otherGuidesLabel}
                  </h2>
                </div>
                <Link
                  href={buildBlogIndexPath(locale)}
                  className="text-sm font-semibold text-zinc-700 transition hover:text-zinc-950"
                >
                  {copy.article.viewAllLabel}
                </Link>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                {relatedPosts.map((relatedPost) => (
                  <article
                    key={relatedPost.slug}
                    className="overflow-hidden rounded-[2rem] border border-zinc-200 transition hover:-translate-y-1 hover:border-zinc-300"
                  >
                    <BlogImageFrame
                      src={relatedPost.coverImage}
                      alt={relatedPost.coverAlt}
                      title={relatedPost.title}
                    />
                    <div className="px-5 py-5">
                      <p className="text-xs text-zinc-500">
                        {relatedPost.category} /{" "}
                        {formatBlogDateTime(
                          relatedPost.updatedAt ?? relatedPost.publishedAt,
                          locale
                        )}
                      </p>
                      <h3 className="mt-3 font-display text-2xl font-bold leading-tight tracking-[-0.04em] text-zinc-950">
                        {relatedPost.title}
                      </h3>
                      <p className="mt-3 text-base leading-7 text-zinc-600">
                        {relatedPost.tagline}
                      </p>
                      <Link
                        href={buildBlogPostPath(locale, relatedPost.slug)}
                        className="mt-4 inline-flex text-sm font-semibold text-zinc-900 transition hover:text-zinc-600"
                      >
                        {copy.article.openArticleLabel}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="mt-8 xl:mt-0">
          <BlogPromoRail locale={locale} />
        </div>
      </div>
    </div>
  );
}
