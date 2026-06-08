"use client";

/**
 * Site-wide header.
 *
 * Renders the Wayka wordmark (theme-aware SVG: wine-on-cream for
 * light mode, cream-on-ink for dark mode), the Antojo Cart trigger,
 * and the theme toggle. Sticky on scroll so the cart is always one
 * tap away.
 *
 * Both wordmark images share the same dimensions so swapping between
 * them produces zero layout shift. CSS hides whichever is not the
 * active theme.
 */

import Image from "next/image";
import Link from "next/link";

import { AntojoCartTrigger } from "@/components/cart/AntojoCartTrigger";
import { ThemeToggle } from "@/components/ThemeToggle";

const WORDMARK_WIDTH = 96;
const WORDMARK_HEIGHT = 96;

export function Header() {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/70 border-foreground/10 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="focus-visible:ring-terracotta inline-flex items-center rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="Wayka — Inicio"
        >
          <Image
            src="/brand/wayka-wordmark-on-light.svg"
            alt="Wayka"
            width={WORDMARK_WIDTH}
            height={WORDMARK_HEIGHT}
            priority
            className="block h-10 w-auto dark:hidden"
          />
          <Image
            src="/brand/wayka-wordmark-on-dark.svg"
            alt="Wayka"
            width={WORDMARK_WIDTH}
            height={WORDMARK_HEIGHT}
            priority
            aria-hidden="true"
            className="hidden h-10 w-auto dark:block"
          />
        </Link>
        <div className="flex items-center gap-2">
          <AntojoCartTrigger />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
