"use client";

/**
 * "La Bolsa de Antojos" — right-side drawer.
 *
 *   * Theme-aware (uses `bg-background` / `text-foreground` tokens).
 *   * Conversational Spanish copy.
 *   * Final CTA fires `trackWhatsAppOrderClick` with the aggregated
 *     cart shape and opens `https://wa.me/...?text=...`.
 *
 * Framer-motion handles the slide-in. On mobile this is a near-full-
 * width drawer; on sm+ it caps at 28rem.
 */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

import { CartLineItem } from "@/components/cart/CartLineItem";
import { useAntojoCart } from "@/components/cart/AntojoCartProvider";
import { trackWhatsAppOrderClick } from "@/lib/analytics";
import { formatCrc } from "@/lib/format";
import { buildCartMessage, whatsappUrl, WhatsAppConfigError } from "@/lib/whatsapp";

const ENCOURAGEMENTS = [
  "Te estás llevando un excelente combo, ¡te va a encantar!",
  "Buena elección — vamos a coordinar el envío en un toque.",
  "Esto pinta delicioso. Listo cuando estés.",
];

function pickEncouragement(seed: number): string {
  return ENCOURAGEMENTS[seed % ENCOURAGEMENTS.length];
}

export function AntojoCartDrawer() {
  const cart = useAntojoCart();
  const isOpen = cart.isOpen;

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  let whatsappHref: string | null = null;
  let whatsappError: string | null = null;
  if (cart.itemCount > 0) {
    try {
      const message = buildCartMessage(
        cart.lines.map((line) => ({
          qty: line.qty,
          productName: line.productName,
          variantName: line.variantName,
        })),
      );
      whatsappHref = whatsappUrl(message);
    } catch (err) {
      if (err instanceof WhatsAppConfigError) {
        whatsappError = err.message;
      } else {
        throw err;
      }
    }
  }

  const handleWhatsAppClick = () => {
    trackWhatsAppOrderClick({
      source: "antojo_cart",
      item_count: cart.itemCount,
      total_quantity: cart.totalQuantity,
      category: cart.dominantCategory,
      estimated_value_crc: Math.round(cart.totalNumeric),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.button
            type="button"
            aria-label="Cerrar mi bolsa de antojos"
            data-testid="cart-backdrop"
            onClick={cart.close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40"
          />
          {/* Drawer panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="La Bolsa de Antojos"
            data-testid="cart-drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
            className="bg-background text-foreground fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col shadow-xl"
          >
            <header className="border-foreground/10 flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-semibold">La Bolsa de Antojos</h2>
              <button
                type="button"
                data-testid="cart-close"
                aria-label="Cerrar"
                onClick={cart.close}
                className="hover:bg-foreground/10 focus-visible:ring-terracotta inline-flex h-9 w-9 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.itemCount === 0 ? (
                <div data-testid="cart-empty" className="py-12 text-center">
                  <p className="text-foreground/80">Tu Bolsa de Antojos está vacía.</p>
                  <p className="text-foreground/60 mt-2 text-sm">
                    Añade tus favoritos desde el catálogo y los coordinamos por WhatsApp.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-foreground/80 text-sm">
                    {pickEncouragement(cart.totalQuantity)}
                  </p>
                  <ul className="mt-4">
                    {cart.lines.map((line) => (
                      <CartLineItem key={line.lineId} line={line} />
                    ))}
                  </ul>
                </>
              )}
            </div>

            <footer className="border-foreground/10 border-t px-5 py-4">
              {cart.itemCount > 0 && (
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="text-foreground/70">Subtotal estimado</span>
                  <span data-testid="cart-total" className="font-semibold tabular-nums">
                    {formatCrc(cart.totalNumeric)}
                  </span>
                </div>
              )}

              {whatsappError && (
                <p role="alert" className="bg-wine/10 text-wine mb-3 rounded-lg px-3 py-2 text-sm">
                  {whatsappError}
                </p>
              )}

              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  data-testid="cart-whatsapp-cta"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick}
                  className="bg-terracotta inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Pedir por WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  data-testid="cart-whatsapp-cta-disabled"
                  disabled
                  className="bg-terracotta inline-flex w-full cursor-not-allowed items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white opacity-50"
                >
                  Pedir por WhatsApp
                </button>
              )}

              {cart.itemCount > 0 && (
                <button
                  type="button"
                  data-testid="cart-clear"
                  onClick={cart.clearCart}
                  className="text-foreground/60 hover:text-foreground mt-3 inline-flex w-full justify-center text-xs underline"
                >
                  Vaciar la bolsa
                </button>
              )}
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
