import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";

const FB_PIXEL_ID = '1233312032320484';
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
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GTAG_ID}');
            `,
          }}
        />

        {/* Meta Pixel — global PageView on every page */}
        <Script
          id="fb-pixel-global"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${FB_PIXEL_ID}');
              fbq('track', 'PageView');
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
