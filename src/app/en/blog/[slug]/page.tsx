import type { Metadata } from "next";

import BlogArticlePage from "@/components/blog/BlogArticlePage";
import { getAllBlogPosts } from "@/lib/blog/posts";
import { getBlogArticleMetadata } from "@/lib/blog/seo";

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?:
    | Promise<{ comment_error?: string; comment_success?: string }>
    | { comment_error?: string; comment_success?: string };
};

export function generateStaticParams() {
  return getAllBlogPosts("en").map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  return getBlogArticleMetadata(resolvedParams.slug, "en");
}

export default async function Page({ params, searchParams }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  return (
    <BlogArticlePage
      slug={resolvedParams.slug}
      locale="en"
      searchParams={resolvedSearchParams}
    />
  );
}
