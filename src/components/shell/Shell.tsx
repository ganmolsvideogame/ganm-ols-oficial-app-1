import { headers } from "next/headers";
import Header from "@/components/header/Header";
import MobileBottomNav from "@/components/nav/MobileBottomNav";
import MobilePermissionsPrompt from "@/components/notifications/MobilePermissionsPrompt";
import Footer from "@/components/footer/Footer";
import AppInstallPrompt from "@/components/pwa/AppInstallPrompt";
import SupportChatWidget from "@/components/support/SupportChatWidget";

type ShellProps = {
  children: React.ReactNode;
};

export default async function Shell({ children }: ShellProps) {
  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") ?? "";
  const userAgent = headerStore.get("user-agent") ?? "";
  const isNativeAndroidApp = userAgent.includes("GANMOLS_APP_ANDROID");
  const isDedicatedAuthFlow = pathname === "/entrar";
  const isDedicatedListingFlow = pathname.startsWith("/vender/anunciar");
  const isDedicatedBlogFlow =
    pathname.startsWith("/blog") || pathname.startsWith("/en/blog");

  if (isDedicatedAuthFlow) {
    return <div className="min-h-screen bg-white text-zinc-900">{children}</div>;
  }

  if (isDedicatedListingFlow || isDedicatedBlogFlow) {
    return (
      <div className="min-h-screen bg-white text-zinc-900">
        {children}
        <AppInstallPrompt />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-white text-zinc-900 ${
        isNativeAndroidApp ? "native-app-shell" : ""
      }`}
    >
      <div data-shell-header>
        <Header isNativeAndroidApp={isNativeAndroidApp} />
      </div>
      <main
        data-shell-main
        className="w-full px-3 pb-24 pt-6 lg:px-4 2xl:px-5 md:pb-12 md:pt-8"
      >
        {children}
      </main>
      <div data-shell-footer className="hidden md:block">
        <Footer />
      </div>
      {!isNativeAndroidApp ? (
        <div data-shell-support>
          <SupportChatWidget />
        </div>
      ) : null}
      <MobilePermissionsPrompt />
      <AppInstallPrompt />
      <div data-shell-mobile-nav>
        <MobileBottomNav />
      </div>
    </div>
  );
}
