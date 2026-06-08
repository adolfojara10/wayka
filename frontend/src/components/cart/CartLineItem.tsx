"use client";

/**
 * Single Antojo Cart row with qty +/- and a remove button.
 */

import { useAntojoCart, type CartLine } from "@/components/cart/AntojoCartProvider";
import { formatCrc } from "@/lib/format";

interface CartLineItemProps {
  line: CartLine;
}

export function CartLineItem({ line }: CartLineItemProps) {
  const cart = useAntojoCart();
  const lineTotal = formatCrc(line.priceNumeric * line.qty);

  return (
    <li
      data-testid="cart-line"
      data-line-id={line.lineId}
      className="border-foreground/10 flex items-start justify-between gap-3 border-b py-3 last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="leading-tight font-medium">{line.productName}</p>
        <p className="text-foreground/70 text-sm">{line.variantName}</p>
        <p className="text-foreground/60 mt-1 text-xs">{line.priceCrc}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            data-testid="cart-line-qty-minus"
            aria-label={`Quitar uno de ${line.productName}`}
            onClick={() => cart.updateQty(line.lineId, line.qty - 1)}
            className="border-foreground/20 hover:bg-foreground/10 focus-visible:ring-terracotta inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            −
          </button>
          <span
            data-testid="cart-line-qty"
            className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums"
          >
            {line.qty}
          </span>
          <button
            type="button"
            data-testid="cart-line-qty-plus"
            aria-label={`Añadir uno más de ${line.productName}`}
            onClick={() => cart.updateQty(line.lineId, line.qty + 1)}
            className="border-foreground/20 hover:bg-foreground/10 focus-visible:ring-terracotta inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            +
          </button>
        </div>
        <p data-testid="cart-line-total" className="text-sm font-semibold tabular-nums">
          {lineTotal}
        </p>
        <button
          type="button"
          data-testid="cart-line-remove"
          aria-label={`Quitar ${line.productName} de mi bolsa`}
          onClick={() => cart.removeLine(line.lineId)}
          className="text-foreground/60 hover:text-terracotta text-xs underline focus-visible:underline focus-visible:outline-none"
        >
          Quitar
        </button>
      </div>
    </li>
  );
}
