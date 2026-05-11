import type { Metadata } from "next";

import { getPublicAssetUrl } from "@/lib/blog/assets";
import { getBlogUiCopy } from "@/lib/blog/copy";
import {
  DEFAULT_BLOG_LOCALE,
  buildBlogIndexPath,
  buildBlogPostPath,
  getBlogLocaleConfig,
  type BlogLocale,
} from "@/lib/blog/locales";
import { getBlogPostAlternates, getBlogPostBySlug } from "@/lib/blog/posts";
import { buildAbsoluteUrl } from "@/lib/utils/site";

function buildLanguageAlternates() {
  return {
    "x-default": buildAbsoluteUrl(buildBlogIndexPath("pt")),
    "pt-BR": buildAbsoluteUrl(buildBlogIndexPath("pt")),
    "en-US": buildAbsoluteUrl(buildBlogIndexPath("en")),
  };
}

export function getBlogIndexMetadata(
  locale: BlogLocale = DEFAULT_BLOG_LOCALE
): Metadata {
  const copy = getBlogUiCopy(locale);
  const config = getBlogLocaleConfig(locale);
  const canonicalPath = buildBlogIndexPath(locale);

  return {
    title:
      locale === "en" ? "Blog | GANM OLS English" : "Blog | GANM OLS",
    description: copy.index.description,
    alternates: {
      canonical: canonicalPath,
      languages: buildLanguageAlternates(),
    },
    openGraph: {
      type: "website",
      locale: config.ogLocale,
      siteName: "GANM OLS",
      url: buildAbsoluteUrl(canonicalPath),
      title: locale === "en" ? "Blog | GANM OLS English" : "Blog | GANM OLS",
      description: copy.index.description,
    },
    twitter: {
      card: "summary_large_image",
      title: locale === "en" ? "Blog | GANM OLS English" : "Blog | GANM OLS",
      description: copy.index.description,
    },
  };
}

export function getBlogArticleMetadata(
  slug: string,
  locale: BlogLocale = DEFAULT_BLOG_LOCALE
): Metadata {
  const post = getBlogPostBySlug(slug, locale);

  if (!post) {
    return {
      title:
        locale === "en"
          ? "Article not found | GANM OLS"
          : "Artigo nao encontrado | GANM OLS",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const config = getBlogLocaleConfig(locale);
  const canonicalPath = buildBlogPostPath(locale, post.slug);
  const coverImage = getPublicAssetUrl(post.coverImage);
  const postAlternates = getBlogPostAlternates(post.articleId);
  const alternates = Object.fromEntries(
    postAlternates.map((alternate) => [
      getBlogLocaleConfig(alternate.locale).languageTag,
      buildAbsoluteUrl(buildBlogPostPath(alternate.locale, alternate.slug)),
    ])
  );
  const defaultAlternate =
    postAlternates.find((item) => item.locale === "pt")?.slug ?? post.slug;
  alternates["x-default"] = buildAbsoluteUrl(
    buildBlogPostPath("pt", defaultAlternate)
  );

  return {
    title:
      locale === "en"
        ? `${post.title} | GANM OLS Blog`
        : `${post.title} | Blog GANM OLS`,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: canonicalPath,
      languages: alternates,
    },
    openGraph: {
      type: "article",
      locale: config.ogLocale,
      siteName: "GANM OLS",
      url: buildAbsoluteUrl(canonicalPath),
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      images: coverImage
        ? [
            {
              url: coverImage,
              alt: post.coverAlt,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: coverImage ? [coverImage] : undefined,
    },
  };
}
