"use client";

/**
 * Client portion of the product detail page.
 *
 * Owns the variant selection state and the cart-write CTAs ("Pedir
 * Ya" + "Añadir a mis antojos"). Server portion (`/productos/[slug]`)
 * handles SSR, metadata, breadcrumbs, and JSON-LD.
 */

import Image from "next/image";
import { useState } from "react";

import { SizeSelector } from "@/components/catalog/SizeSelector";
import { StatusBadge } from "@/components/catalog/StatusBadge";
import { useAntojoCart } from "@/components/cart/AntojoCartProvider";
import type { Product, ProductVariant } from "@/lib/api-types";

interface ProductDetailClientProps {
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

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const cart = useAntojoCart();
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    pickInitialVariant(product)?.id ?? null,
  );

  const selectedVariant =
    selectedVariantId != null
      ? (product.variants.find((v) => v.id === selectedVariantId) ?? null)
      : null;

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
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* Image column */}
      <div className="border-foreground/10 bg-foreground/5 relative aspect-square overflow-hidden rounded-2xl border">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.alt_text || product.name}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div
            data-testid="product-detail-image-placeholder"
            className="flex h-full w-full items-center justify-center"
          >
            <span className="text-foreground/40 text-sm">Sin imagen</span>
          </div>
        )}
      </div>

      {/* Content column */}
      <div>
        <div className="mb-4 flex items-start justify-end gap-3">
          <StatusBadge status={product.status} />
        </div>

        <p className="text-foreground/80">{product.description}</p>

        {!product.has_multiple_variants && selectedVariant && (
          <p className="mt-6 text-2xl font-semibold">{selectedVariant.price_crc}</p>
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
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              data-testid="pedir-ya-detail"
              disabled={!canAddToCart}
              onClick={() => handleAdd("pedir_ya")}
              className="bg-terracotta inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              Pedir Ya
            </button>
            <button
              type="button"
              data-testid="add-to-antojos-detail"
              disabled={!canAddToCart}
              onClick={() => handleAdd("antojos")}
              className="border-terracotta text-terracotta hover:bg-terracotta/10 inline-flex items-center justify-center rounded-full border px-6 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              Añadir a mis antojos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
