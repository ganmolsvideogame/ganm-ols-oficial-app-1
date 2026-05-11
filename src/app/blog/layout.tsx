import BlogSidebar from "@/components/blog/BlogSidebar";

type BlogLayoutProps = {
  children: React.ReactNode;
};

export default function BlogLayout({ children }: BlogLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <BlogSidebar />
      <div className="relative lg:pl-[280px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(24,24,27,.08),rgba(24,24,27,0)_62%)]" />
        <div className="relative min-h-screen">{children}</div>
      </div>
    </div>
  );
}
