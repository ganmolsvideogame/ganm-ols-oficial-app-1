import type { BlogLocale } from "@/lib/blog/locales";

export type BlogLink = {
  label: string;
  href: string;
};

export type BlogMedia = {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
};

export type BlogArticleSection = {
  title: string;
  meta: string;
  paragraphs: string[];
  media?: BlogMedia;
};

export type BlogAuthor = {
  name: string;
  role: string;
  avatar: string;
};

export type BlogConclusion = {
  title: string;
  body: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

export type BlogPostTranslation = {
  slug: string;
  title: string;
  tagline: string;
  excerpt: string;
  description: string;
  category: string;
  author: BlogAuthor;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  keywords: string[];
  coverImage: string;
  coverAlt: string;
  relatedLinks: BlogLink[];
  intro: string[];
  sections: BlogArticleSection[];
  conclusion?: BlogConclusion | null;
};

export type BlogPost = BlogPostTranslation & {
  articleId: string;
  locale: BlogLocale;
};
