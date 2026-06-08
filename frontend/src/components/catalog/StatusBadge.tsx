"use client";

/**
 * Spanish status pill shown on non-orderable product cards.
 *
 * Rendered only for `coming_soon` and `sold_out`. Active products
 * show no badge; inactive products never reach the client (404 from
 * the API). Colors use brand accent tokens that pass AA-large on
 * both light and dark backgrounds per `docs/contrast.md`.
 */

import clsx from "clsx";

import type { ProductStatus } from "@/lib/api-types";

interface StatusBadgeProps {
  status: ProductStatus;
}

const LABELS: Partial<Record<ProductStatus, string>> = {
  coming_soon: "Próximamente",
  sold_out: "Agotado",
};

const COLOR_CLASS: Partial<Record<ProductStatus, string>> = {
  coming_soon: "bg-wine text-cream",
  sold_out: "bg-olive text-cream",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = LABELS[status];
  if (!label) return null;
  return (
    <span
      data-testid="product-status-badge"
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        COLOR_CLASS[status],
      )}
    >
      {label}
    </span>
  );
}
