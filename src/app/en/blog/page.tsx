import BlogIndexPage from "@/components/blog/BlogIndexPage";
import { getBlogIndexMetadata } from "@/lib/blog/seo";

export const metadata = getBlogIndexMetadata("en");

export default function Page() {
  return <BlogIndexPage locale="en" />;
}
