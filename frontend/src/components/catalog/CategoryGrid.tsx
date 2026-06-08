/**
 * Server-rendered grid of product cards for a single category.
 *
 * Pure presentational. Receives the already-fetched `products` array
 * from the page (server component) and maps to `<ProductCard>` (a
 * client component that lives inside the AntojoCartProvider tree from
 * `app/layout.tsx`).
 */

import { ProductCard } from "@/components/catalog/ProductCard";
import type { Product } from "@/lib/api-types";

interface CategoryGridProps {
  products: readonly Product[];
  emptyMessage?: string;
}

export function CategoryGrid({
  products,
  emptyMessage = "Pronto traeremos más antojos a esta categoría.",
}: CategoryGridProps) {
  if (products.length === 0) {
    return <p className="text-foreground/70 mt-8 text-center text-sm">{emptyMessage}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
