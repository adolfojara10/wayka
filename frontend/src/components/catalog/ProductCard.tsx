"use client";

/**
 * State-aware product card.
 *
 *   * `status=active`     → "Pedir Ya" + "Añadir a mis antojos" buttons.
 *   * `status=coming_soon`→ "Próximamente" badge, buttons hidden.
 *   * `status=sold_out`   → "Agotado" badge, buttons hidden.
 *   * `status=inactive`   → never reaches the client (404 from API).
 *
 * Size selector visibility uses the server-computed
 * `product.has_multiple_variants` flag — the frontend never re-derives
 * the rule. Per-variant availability is respected by SizeSelector.
 *
 * Renders the product image via `next/image` (WebP/AVIF/lazy) when
 * present; falls back to a quiet placeholder div otherwise so the
 * card layout doesn't shift between fixture-only and real-photo
 * states.
 */

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "@/components/catalog/StatusBadge";
import { SizeSelector } from "@/components/catalog/SizeSelector";
import { useAntojoCart } from "@/components/cart/AntojoCartProvider";
import type { Product, ProductVariant } from "@/lib/api-types";

interface ProductCardProps {
  product: Product;
}

function pickInitialVariant(product: Product): ProductVariant | null {
  if (product.variants.length === 0) return null;
  if (product.default_variant_id != null) {
    const explicit = product.variants.find((v) => v.id === product.default_variant_id);
    if (explicit) return explicit;
  }
  return product.variants[0];
}

export function ProductCard({ product }: ProductCardProps) {
  const cart = useAntojoCart();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    pickInitialVariant(product)?.id ?? null,
  );

  const selectedVariant =
    selectedVariantId != null
      ? (product.variants.find((v) => v.id === selectedVariantId) ?? null)
      : null;

  // A multi-variant card can transiently have its selected variant be
  // unavailable (e.g. the default became sold out). Disable CTAs in
  // that case until the user picks another size.
  const canAddToCart =
    product.is_orderable && selectedVariant != null && selectedVariant.is_available;

  const handleAdd = (source: "pedir_ya" | "antojos") => {
    if (!selectedVariant || !canAddToCart) return;
    cart.addLine({
      productSlug: product.slug,
      productName: product.name,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      priceCrc: selectedVariant.price_crc,
      priceNumeric: selectedVariant.price,
      category: product.category,
    });
    if (source === "pedir_ya") {
      cart.open("pedir_ya");
    }
  };

  return (
    <article
      data-testid="product-card"
      data-status={product.status}
      className="border-foreground/10 bg-background flex flex-col overflow-hidden rounded-2xl border shadow-sm"
    >
      <Link
        href={`/productos/${product.slug}`}
        className="bg-foreground/5 focus-visible:ring-terracotta relative block aspect-[4/3] overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
        aria-label={`Ver ${product.name}`}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.alt_text || product.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div
            data-testid="product-card-image-placeholder"
            className="flex h-full w-full items-center justify-center"
          >
            <span className="text-foreground/40 text-xs tracking-wide uppercase">Sin foto</span>
          </div>
        )}
      </Link>

      <div className="flex flex-col p-5">
        <header className="flex items-start justify-between gap-3">
          <h3 className="text-lg leading-tight font-semibold">
            <Link
              href={`/productos/${product.slug}`}
              className="hover:text-terracotta focus-visible:underline focus-visible:outline-none"
            >
              {product.name}
            </Link>
          </h3>
          <StatusBadge status={product.status} />
        </header>

        <p className="text-foreground/70 mt-2 line-clamp-3 text-sm">{product.description}</p>

        {!product.has_multiple_variants && selectedVariant && (
          <p className="mt-3 text-lg font-semibold">{selectedVariant.price_crc}</p>
        )}

        {product.has_multiple_variants && selectedVariant && (
          <SizeSelector
            productSlug={product.slug}
            variants={product.variants}
            selectedVariantId={selectedVariant.id}
            onSelect={setSelectedVariantId}
          />
        )}

        {product.is_orderable && (
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              data-testid="pedir-ya"
              disabled={!canAddToCart}
              onClick={() => handleAdd("pedir_ya")}
              className={clsx(
                "bg-terracotta inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity",
                "hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                !canAddToCart && "cursor-not-allowed opacity-50",
              )}
            >
              Pedir Ya
            </button>
            <button
              type="button"
              data-testid="add-to-antojos"
              disabled={!canAddToCart}
              onClick={() => handleAdd("antojos")}
              className={clsx(
                "border-terracotta text-terracotta inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors",
                "hover:bg-terracotta/10 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                !canAddToCart && "cursor-not-allowed opacity-50",
              )}
            >
              Añadir a mis antojos
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
