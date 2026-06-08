"use client";

/**
 * Header button that opens the Antojo Cart drawer.
 *
 * Renders an inline-SVG bag glyph with a small "qty" badge when the
 * cart has items. Fires `open("manual")` (the analytics event source
 * is set by the cart provider).
 */

import { useAntojoCart } from "@/components/cart/AntojoCartProvider";

export function AntojoCartTrigger() {
  const cart = useAntojoCart();
  // Render a stable label between SSR + first client paint to avoid
  // hydration mismatches (hydrated=false at first, then true after
  // sessionStorage rehydration). Until `hydrated` is true we render
  // the empty-cart state.
  const itemCount = cart.hydrated ? cart.itemCount : 0;

  return (
    <button
      type="button"
      data-testid="antojo-cart-trigger"
      aria-label={
        itemCount === 0
          ? "Abrir mi bolsa de antojos (vacía)"
          : `Abrir mi bolsa de antojos (${itemCount} antojo${itemCount === 1 ? "" : "s"})`
      }
      onClick={() => cart.open("manual")}
      className="text-foreground hover:bg-foreground/10 focus-visible:ring-terracotta relative inline-flex h-10 w-10 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {/* Stylized handbag glyph. */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 7h18l-1.5 12.5a2 2 0 0 1-2 1.5h-11a2 2 0 0 1-2-1.5L3 7Z" />
        <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      </svg>
      {itemCount > 0 && (
        <span
          data-testid="antojo-cart-trigger-badge"
          aria-hidden="true"
          className="bg-terracotta absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
        >
          {itemCount}
        </span>
      )}
    </button>
  );
}
