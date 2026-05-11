import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Shell from "@/components/shell/Shell";
import MetaPixel from "@/components/analytics/MetaPixel";
import PushNotificationsBootstrap from "@/components/notifications/PushNotificationsBootstrap";
import { getMetadataBase } from "@/lib/utils/site";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const googleSiteVerification =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined;
const facebookDomainVerification =
  process.env.FACEBOOK_DOMAIN_VERIFICATION?.trim() ||
  "7hw5fauh92k36ac7t51h5b0uwaritl";
const googleTagManagerId =
  process.env.NEXT_PUBLIC_GTM_ID?.trim() || "GTM-KTJZZFBD";
const adsenseClientId =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim() ||
  "ca-pub-8826344657583237";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  manifest: "/manifest.webmanifest",
  title: "GANM OLS",
  description: "Consoles, jogos e colecionaveis.",
  applicationName: "GANM OLS",
  verification: googleSiteVerification
    ? {
        google: googleSiteVerification,
      }
    : undefined,
  appleWebApp: {
    capable: true,
    title: "GANM OLS",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/ganmosicon.png",
    apple: "/ganmosicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
  const gaMeasurementId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "G-P65EZT9VS1";

  return (
    <html lang="pt-BR">
      <head>
        {googleTagManagerId ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${googleTagManagerId}');`,
            }}
          />
        ) : null}
        {facebookDomainVerification ? (
          <meta
            name="facebook-domain-verification"
            content={facebookDomainVerification}
          />
        ) : null}
        {adsenseClientId ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body
        className={`${manrope.variable} ${spaceGrotesk.variable} antialiased font-sans`}
      >
        {googleTagManagerId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        {metaPixelId ? (
          <>
            <Script id="meta-pixel-base" strategy="afterInteractive">{`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `}</Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        ) : null}
        {gaMeasurementId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${gaMeasurementId}');
            `}</Script>
          </>
        ) : null}
        <MetaPixel />
        <PushNotificationsBootstrap />
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
