/**
 * /pizzas — server-rendered category page.
 */

import type { Metadata } from "next";

import { CategoryGrid } from "@/components/catalog/CategoryGrid";
import { getProducts } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/api-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${CATEGORY_LABELS.pizzas} — Wayka`,
  description:
    "Pizzas artesanales de Wayka con masa madre y combinaciones únicas. Pide por WhatsApp en Costa Rica.",
};

export default async function PizzasPage() {
  const products = await getProducts({ category: "pizzas" });
  return (
    <>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{CATEGORY_LABELS.pizzas}</h1>
        <p className="text-foreground/70 mt-2 max-w-2xl">
          Masa madre, ingredientes frescos, horneadas con calma.
        </p>
      </header>
      <CategoryGrid products={products} />
    </>
  );
}
