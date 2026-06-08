"use client";

/**
 * Crawl-friendly tab bar for the three B2C catalog categories.
 *
 * Tabs are real `<Link>` components pointing at `/bocaditos`,
 * `/sweets`, and `/pizzas`. Next.js prefetches each route on hover /
 * viewport entry, so the actual navigation feels indistinguishable
 * from a JS tab swap — but Googlebot sees three separate URLs.
 *
 * Highlighting uses `usePathname()` rather than a controlled state
 * so the active tab stays correct even on a hard reload.
 */

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { CATEGORIES, CATEGORY_LABELS, type ProductCategory } from "@/lib/api-types";

const CATEGORY_HREFS: Record<ProductCategory, string> = {
  bocaditos: "/bocaditos",
  sweets: "/sweets",
  pizzas: "/pizzas",
};

export function CategoryTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Categorías del catálogo"
      data-testid="category-tabs"
      className="flex w-full gap-1 overflow-x-auto px-1 py-1"
    >
      {CATEGORIES.map((category) => {
        const href = CATEGORY_HREFS[category];
        const isActive = pathname === href;
        return (
          <Link
            key={category}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={clsx(
              "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-foreground text-background"
                : "text-foreground/70 hover:bg-foreground/10",
            )}
          >
            {CATEGORY_LABELS[category]}
          </Link>
        );
      })}
    </nav>
  );
}
