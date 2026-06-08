/**
 * /sweets — server-rendered category page.
 */

import type { Metadata } from "next";

import { CategoryGrid } from "@/components/catalog/CategoryGrid";
import { getProducts } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/api-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${CATEGORY_LABELS.sweets} — Wayka`,
  description:
    "Dulces artesanales de Wayka: pie de limón, brownies, tres leches y más. Pide por WhatsApp en Costa Rica.",
};

export default async function SweetsPage() {
  const products = await getProducts({ category: "sweets" });
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{CATEGORY_LABELS.sweets}</h1>
        <p className="text-foreground/70 mt-2 max-w-2xl">
          Postres con ingredientes nobles y recetas familiares.
        </p>
      </header>
      <CategoryGrid products={products} />
    </>
  );
}
