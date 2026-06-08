/**
 * Visual breadcrumbs (the BreadcrumbList JSON-LD is emitted
 * separately by `<JsonLd>` in the page; this is the on-screen trail).
 *
 * Server component — no interactivity, just `<Link>` elements wrapped
 * in semantic `<nav aria-label="Breadcrumb">`.
 */

import Link from "next/link";

export interface BreadcrumbItem {
  /** Display label, in Spanish. */
  name: string;
  /** Site-relative path. The last item is rendered as plain text. */
  href: string;
}

interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      data-testid="breadcrumbs"
      className="text-foreground/60 mb-4 text-sm"
    >
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1">
              {isLast ? (
                <span aria-current="page" className="text-foreground/80">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-terracotta focus-visible:underline focus-visible:outline-none"
                >
                  {item.name}
                </Link>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
