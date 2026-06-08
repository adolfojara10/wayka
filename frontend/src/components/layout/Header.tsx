"use client";

/**
 * Site-wide header with the Wayka wordmark, theme toggle, and Antojo
 * Cart trigger. Sticky on scroll so the cart is always one tap away.
 *
 * Logo asset wiring (replacing the text wordmark with the SVG that
 * lives under `docs/svg/`) is intentionally deferred per the entries
 * in `TESTING_CHECKLIST.md` §B.7.
 */

import Link from "next/link";

import { AntojoCartTrigger } from "@/components/cart/AntojoCartTrigger";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Header() {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/70 border-foreground/10 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="focus-visible:ring-terracotta rounded text-xl font-bold tracking-tight focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="Wayka — Inicio"
        >
          Wayka
        </Link>
        <div className="flex items-center gap-2">
          <AntojoCartTrigger />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
