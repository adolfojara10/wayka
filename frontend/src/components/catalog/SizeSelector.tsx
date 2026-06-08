"use client";

/**
 * Radio-group size selector shown only when a product has 2+ variants.
 *
 * Respects per-variant `is_available`: unavailable sizes render
 * disabled with an "Agotado" microlabel and `aria-disabled="true"`.
 * Selecting a size fires `trackSelectVariant`.
 */

import clsx from "clsx";

import { trackSelectVariant } from "@/lib/analytics";
import type { ProductVariant } from "@/lib/api-types";

interface SizeSelectorProps {
  productSlug: string;
  variants: readonly ProductVariant[];
  selectedVariantId: number;
  onSelect: (variantId: number) => void;
}

export function SizeSelector({
  productSlug,
  variants,
  selectedVariantId,
  onSelect,
}: SizeSelectorProps) {
  const name = `size-${productSlug}`;
  return (
    <fieldset className="mt-3" data-testid="size-selector">
      <legend className="text-foreground/70 mb-2 text-xs font-semibold tracking-wide uppercase">
        Tamaño
      </legend>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const checked = variant.id === selectedVariantId;
          const disabled = !variant.is_available;
          return (
            <label
              key={variant.id}
              data-testid={`size-option-${variant.id}`}
              data-disabled={disabled || undefined}
              aria-disabled={disabled || undefined}
              className={clsx(
                "border-foreground/15 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                checked && !disabled && "bg-terracotta border-transparent text-white",
                !checked && !disabled && "hover:border-terracotta/60",
                disabled && "cursor-not-allowed line-through opacity-50",
              )}
            >
              <input
                type="radio"
                name={name}
                value={variant.id}
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  if (disabled) return;
                  onSelect(variant.id);
                  trackSelectVariant({
                    product_slug: productSlug,
                    variant_name: variant.name,
                  });
                }}
                className="sr-only"
              />
              <span>{variant.name}</span>
              <span className="text-foreground/70 text-xs">{variant.price_crc}</span>
              {disabled && (
                <span className="text-foreground/60 ml-1 text-[10px] tracking-wide uppercase">
                  Agotado
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
