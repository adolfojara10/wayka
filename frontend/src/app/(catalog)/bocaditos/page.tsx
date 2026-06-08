/**
 * /bocaditos — server-rendered category page.
 */

import type { Metadata } from "next";

import { CategoryGrid } from "@/components/catalog/CategoryGrid";
import { getProducts } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/api-types";

// Render at request time, not at build time, because the catalog
// content depends on the live Django API which isn't reachable from
// the Next.js build worker. Combined with `getProducts`'s
// `next.revalidate: 60`, the framework still caches responses
// between requests at the edge.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${CATEGORY_LABELS.bocaditos} — Wayka`,
  description:
    "Bocaditos artesanales de Wayka: empanadas, mini quesadillas y más. Pide por WhatsApp en Costa Rica.",
};

export default async function BocaditosPage() {
  const products = await getProducts({ category: "bocaditos" });
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {CATEGORY_LABELS.bocaditos}
        </h1>
        <p className="text-foreground/70 mt-2 max-w-2xl">
          Bocaditos hechos en casa, con masa fresca y rellenos tradicionales.
        </p>
      </header>
      <CategoryGrid products={products} />
    </>
  );
}
