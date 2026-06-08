/**
 * Layout shared by the three B2C catalog routes
 * (`/bocaditos`, `/sweets`, `/pizzas`).
 *
 * The route group `(catalog)` is excluded from the URL — these pages
 * live at `/bocaditos` etc., not `/catalog/bocaditos`. The shared
 * layout renders the `<CategoryTabs>` once so Next.js can preserve
 * it across sibling-route client navigations (no remount, no flash).
 */

import type { ReactNode } from "react";

import { CategoryTabs } from "@/components/layout/CategoryTabs";

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pt-4 pb-8 sm:px-6">
      <CategoryTabs />
      <div className="mt-6">{children}</div>
    </section>
  );
}
