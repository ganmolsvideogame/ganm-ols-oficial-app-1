export type BlogLocale = "pt" | "en";

type BlogLocaleConfig = {
  locale: BlogLocale;
  languageTag: string;
  ogLocale: string;
  routePrefix: string;
  label: string;
  shortLabel: string;
};

export const BLOG_LOCALE_CONFIG: Record<BlogLocale, BlogLocaleConfig> = {
  pt: {
    locale: "pt",
    languageTag: "pt-BR",
    ogLocale: "pt_BR",
    routePrefix: "",
    label: "Português",
    shortLabel: "PT-BR",
  },
  en: {
    locale: "en",
    languageTag: "en-US",
    ogLocale: "en_US",
    routePrefix: "/en",
    label: "English",
    shortLabel: "EN",
  },
};

export const DEFAULT_BLOG_LOCALE: BlogLocale = "pt";

export function getBlogLocaleConfig(locale: BlogLocale) {
  return BLOG_LOCALE_CONFIG[locale];
}

export function buildBlogIndexPath(locale: BlogLocale) {
  const prefix = getBlogLocaleConfig(locale).routePrefix;
  return `${prefix}/blog`;
}

export function buildBlogPostPath(locale: BlogLocale, slug: string) {
  return `${buildBlogIndexPath(locale)}/${slug}`;
}

export function getBlogLocaleFromPathname(pathname: string) {
  return pathname.startsWith("/en/blog") ? "en" : DEFAULT_BLOG_LOCALE;
}
