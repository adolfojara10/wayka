import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";

import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeScript } from "@/components/ThemeScript";

import "./globals.css";

// Load Montserrat via next/font for zero layout shift and self-hosted fonts.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wayka — Repostería y catering artesanal",
  description:
    "Wayka: catering, dulces y productos congelados artesanales en Costa Rica. Pedidos por WhatsApp.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3EBDF" },
    { media: "(prefers-color-scheme: dark)", color: "#060419" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CR" className={`${montserrat.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Inline pre-paint theme script — must be the first script in <head>. */}
        <ThemeScript />
      </head>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
