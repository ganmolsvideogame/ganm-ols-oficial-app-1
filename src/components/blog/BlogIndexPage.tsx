import Link from "next/link";

import BlogImageFrame from "@/components/blog/BlogImageFrame";
import BlogNewsletterSignup from "@/components/blog/BlogNewsletterSignup";
import BlogPromoRail from "@/components/blog/BlogPromoRail";
import { getBlogUiCopy } from "@/lib/blog/copy";
import {
  buildBlogPostPath,
  DEFAULT_BLOG_LOCALE,
  type BlogLocale,
} from "@/lib/blog/locales";
import { formatBlogDate, getAllBlogPosts } from "@/lib/blog/posts";

const focusLinks: Record<
  BlogLocale,
  Array<{ label: string; href: string }>
> = {
  pt: [
    { label: "PlayStation", href: "/marca/playstation" },
    { label: "Nintendo", href: "/marca/nintendo" },
    { label: "Xbox", href: "/marca/xbox" },
    { label: "Retro", href: "/marca/sega" },
  ],
  en: [
    { label: "PlayStation", href: "/marca/playstation" },
    { label: "Nintendo", href: "/marca/nintendo" },
    { label: "Xbox", href: "/marca/xbox" },
    { label: "Retro", href: "/marca/sega" },
  ],
};

type BlogIndexPageProps = {
  locale?: BlogLocale;
};

export default function BlogIndexPage({
  locale = DEFAULT_BLOG_LOCALE,
}: BlogIndexPageProps) {
  const copy = getBlogUiCopy(locale);
  const posts = getAllBlogPosts(locale);
  const featuredPost = posts[0] ?? null;
  const supportingPosts = posts.slice(1, 3);

  return (
    <div className="px-4 pb-16 pt-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-[1480px] xl:grid xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-8">
        <div className="min-w-0 space-y-8">
          <section className="overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white px-6 py-8 shadow-[0_18px_60px_rgba(15,23,42,.08)] md:px-10 md:py-10">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-600">
              {copy.index.eyebrow}
            </p>
            <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div className="space-y-5">
                <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.03] tracking-[-0.05em] text-zinc-950 md:text-6xl">
                  {copy.index.title}
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-zinc-600">
                  {copy.index.description}
                </p>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  {copy.index.focusLabel}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {focusLinks[locale].map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {featuredPost ? (
            <article className="overflow-hidden rounded-[2.5rem] border border-zinc-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,.08)]">
              <BlogImageFrame
                src={featuredPost.coverImage}
                alt={featuredPost.coverAlt}
                title={featuredPost.title}
                eager
                aspectClassName="aspect-[16/8] md:aspect-[16/7]"
                imageClassName="h-full w-full object-cover"
              />

              <div className="border-t border-zinc-200 px-6 py-8 md:px-10 md:py-10">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-600">
                  {copy.index.featuredLabel}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                  <span>{featuredPost.category}</span>
                  <span>/</span>
                  <span>
                    {formatBlogDate(
                      featuredPost.updatedAt ?? featuredPost.publishedAt,
                      locale
                    )}
                  </span>
                  <span>/</span>
                  <span>{featuredPost.readingMinutes} min</span>
                </div>
                <h2 className="mt-5 max-w-4xl font-display text-4xl font-bold leading-[1.04] tracking-[-0.05em] text-zinc-950 md:text-5xl">
                  {featuredPost.title}
                </h2>
                <p className="mt-4 text-2xl leading-9 text-zinc-600">
                  {featuredPost.tagline}
                </p>
                <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-700">
                  {featuredPost.excerpt}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={buildBlogPostPath(locale, featuredPost.slug)}
                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    {copy.index.openGuideLabel}
                  </Link>
                  {locale === "pt" ? (
                    <Link
                      href="/categorias"
                      className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950"
                    >
                      {copy.index.exploreCategoriesLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          ) : null}

          {supportingPosts.length > 0 ? (
            <section className="grid gap-6 lg:grid-cols-2">
              {supportingPosts.map((post) => (
                <article
                  key={post.slug}
                  className="overflow-hidden rounded-[2.2rem] border border-zinc-200 bg-white shadow-sm transition-transform duration-200 hover:-translate-y-1"
                >
                  <BlogImageFrame
                    src={post.coverImage}
                    alt={post.coverAlt}
                    title={post.title}
                  />

                  <div className="px-6 py-6">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>{post.category}</span>
                      <span>/</span>
                      <span>{formatBlogDate(post.updatedAt ?? post.publishedAt, locale)}</span>
                    </div>
                    <h3 className="mt-4 font-display text-3xl font-bold leading-[1.05] tracking-[-0.04em] text-zinc-950">
                      {post.title}
                    </h3>
                    <p className="mt-3 text-xl leading-8 text-zinc-600">{post.tagline}</p>
                    <p className="mt-4 text-sm leading-7 text-zinc-700">{post.excerpt}</p>

                    <Link
                      href={buildBlogPostPath(locale, post.slug)}
                      className="mt-5 inline-flex text-sm font-semibold text-zinc-900 transition hover:text-zinc-600"
                    >
                      {copy.index.readArticleLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          <BlogNewsletterSignup locale={locale} />

          <section className="rounded-[2.5rem] border border-zinc-200 bg-white px-6 py-8 shadow-sm md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-600">
                  {copy.index.moreLabel}
                </p>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.05em] text-zinc-950">
                  {copy.index.archiveTitle}
                </h2>
              </div>
              <p className="text-sm text-zinc-500">
                {copy.index.publishedCountLabel(posts.length)}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="grid gap-5 rounded-[1.8rem] border border-zinc-200 px-5 py-5 transition hover:border-zinc-300 hover:bg-zinc-50 md:grid-cols-[150px_minmax(0,1fr)]"
                >
                  <div className="overflow-hidden rounded-[1.3rem] bg-zinc-100">
                    <BlogImageFrame
                      src={post.coverImage}
                      alt={post.coverAlt}
                      title={post.title}
                      aspectClassName="h-full min-h-[150px]"
                      imageClassName="h-full w-full object-cover"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span>{post.category}</span>
                      <span>/</span>
                      <span>{formatBlogDate(post.updatedAt ?? post.publishedAt, locale)}</span>
                    </div>
                    <h3 className="mt-3 font-display text-2xl font-bold leading-tight tracking-[-0.04em] text-zinc-950">
                      {post.title}
                    </h3>
                    <p className="mt-3 text-base leading-8 text-zinc-600">{post.tagline}</p>
                    <Link
                      href={buildBlogPostPath(locale, post.slug)}
                      className="mt-4 inline-flex text-sm font-semibold text-zinc-900 transition hover:text-zinc-600"
                    >
                      {copy.index.readArticleLabel}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-8 xl:mt-0">
          <BlogPromoRail locale={locale} />
        </div>
      </div>
    </div>
  );
}
