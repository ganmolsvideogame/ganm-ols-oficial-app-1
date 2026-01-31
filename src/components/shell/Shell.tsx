import Header from "@/components/header/Header";
import MobileBottomNav from "@/components/nav/MobileBottomNav";
import Footer from "@/components/footer/Footer";

type ShellProps = {
  children: React.ReactNode;
};

export default function Shell({ children }: ShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f4f4f5,_#ffffff_70%)] text-zinc-900">
      <Header />
      <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 md:px-6 md:pb-12 md:pt-8">
        {children}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
