import BlogIndexPage from "@/components/blog/BlogIndexPage";
import { getBlogIndexMetadata } from "@/lib/blog/seo";

export const metadata = getBlogIndexMetadata("pt");

export default function Page() {
  return <BlogIndexPage locale="pt" />;
}
