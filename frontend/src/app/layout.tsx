import type { Metadata, Viewport } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Montserrat } from "next/font/google";

import { Clarity } from "@/components/analytics/Clarity";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import { WebVitalsReporter } from "@/components/analytics/WebVitalsReporter";
import { AntojoCartDrawer } from "@/components/cart/AntojoCartDrawer";
import { AntojoCartProvider } from "@/components/cart/AntojoCartProvider";
import { JsonLd } from "@/components/JsonLd";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeScript } from "@/components/ThemeScript";
import { getSiteSettings } from "@/lib/api";
import { buildLocalBusinessLd } from "@/lib/jsonld";

import "./globals.css";

// Load Montserrat via next/font for zero layout shift and self-hosted fonts.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const GSC_VERIFICATION = process.env.NEXT_PUBLIC_GSC_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Wayka — Repostería y catering artesanal en Costa Rica",
    template: "%s — Wayka",
  },
  description:
    "Wayka: repostería, catering y productos congelados artesanales en Costa Rica. Pedidos coordinados por WhatsApp.",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "Wayka",
    locale: "es_CR",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
  verification: GSC_VERIFICATION ? { google: GSC_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3EBDF" },
    { media: "(prefers-color-scheme: dark)", color: "#060419" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Best-effort fetch of the business singleton for LocalBusiness LD.
  // If the API is down or the singleton isn't configured yet, we
  // silently skip the LD block rather than crash the layout.
  let localBusinessLd: Record<string, unknown> | null = null;
  try {
    const site = await getSiteSettings();
    if (site) {
      localBusinessLd = buildLocalBusinessLd(site, SITE_URL);
    }
  } catch {
    localBusinessLd = null;
  }

  return (
    <html lang="es-CR" className={`${montserrat.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Inline pre-paint theme script — must be the first script in <head>. */}
        <ThemeScript />
      </head>
      <body className="min-h-full">
        {localBusinessLd && <JsonLd data={localBusinessLd} />}
        <ThemeProvider>
          <AntojoCartProvider>
            <div className="flex min-h-dvh flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <AntojoCartDrawer />
          </AntojoCartProvider>
        </ThemeProvider>
        {/* Analytics — all gated on env vars. Zero render when disabled. */}
        <WebVitalsReporter />
        <Clarity />
        <MetaPixel />
        {GA4_ID && <GoogleAnalytics gaId={GA4_ID} />}
      </body>
    </html>
  );
}
