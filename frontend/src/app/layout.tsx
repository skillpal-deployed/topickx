import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";

const FB_PIXEL_ID = '1233312032320484';
// AW-XXXXXXXXX = Google Ads conversion tracking. For GA4 page-view analytics use a G-XXXXXXXXX ID instead.
const GTAG_ID = 'AW-862131724';


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,  // don't fail build if Google Fonts is unreachable
});


export const metadata: Metadata = {
  title: "Topickx - Find Your Dream Project",
  description: "Topickx is a premium real estate platform connecting buyers with verified project listings across India.",
  keywords: ["real estate", "project", "apartments", "villas", "India", "buy project", "topickx"],
  authors: [{ name: "Topickx" }],
  openGraph: {
    title: "Topickx - Find Your Dream Project",
    description: "Premium real estate platform connecting buyers with verified project listings",
    type: "website",
    siteName: "Topickx",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-white text-slate-950 min-h-screen flex flex-col`}
      >
        {/* Google Tag (gtag.js) */}
        <Script
          id="gtag-js"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`}
        />
        <Script
          id="gtag-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
              window.gtag('js', new Date());
              window.gtag('config', '${GTAG_ID}');
            `,
          }}
        />

        {/* Meta Pixel — initialize global pixel ID + fire PageView once SDK is loaded.
            strategy="afterInteractive" runs this after hydration, so fbevents.js is
            already loaded when this inline script executes — no queue race condition. */}
        <Script
          id="fb-pixel-global"
          strategy="afterInteractive"
          src="https://connect.facebook.net/en_US/fbevents.js"
        />
        <Script
          id="fb-pixel-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window._fbq = window._fbq || [];
              window.fbq = window.fbq || function(){
                window.fbq.callMethod
                  ? window.fbq.callMethod.apply(window.fbq, arguments)
                  : window.fbq.queue.push(arguments);
              };
              window.fbq.push = window.fbq;
              window.fbq.loaded = true;
              window.fbq.version = '2.0';
              window.fbq.queue = window.fbq.queue || [];
              window.fbq('init', '${FB_PIXEL_ID}');
              window.fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
          <AuthProvider>
            <main className="flex-1">
              {children}
            </main>
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
