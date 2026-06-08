"use client";

/**
 * "La Bolsa de Antojos" — the cart context that powers Wayka.
 *
 * Design choices:
 *
 *   * **Tab-scoped persistence.** State is mirrored to
 *     `sessionStorage` under `wayka-cart-v1` so a page refresh keeps
 *     the cart, but closing the tab clears it. Matches user
 *     expectation and dodges cookie-consent overhead.
 *   * **Versioned storage key.** If we ever change the line-item shape
 *     we bump `v1` to `v2` and orphan the old data automatically.
 *   * **One line per (slug, variantId) combo.** Adding the same
 *     variant twice increments quantity rather than duplicating the
 *     row.
 *   * **Analytics fires from inside the reducer.** Every mutation
 *     (`addLine`, `updateQty(0)`) emits the spec event so the UI
 *     surface never re-implements the rule.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  trackAddToAntojos,
  trackOpenCart,
  trackRemoveFromAntojos,
  type AnalyticsCategory,
} from "@/lib/analytics";
import type { ProductCategory } from "@/lib/api-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const CART_STORAGE_KEY = "wayka-cart-v1";

export interface CartLine {
  /** Stable id = `${slug}__${variantId}`. */
  lineId: string;
  productSlug: string;
  productName: string;
  variantId: number;
  variantName: string;
  /** Pre-formatted price for display (mirrors backend `price_crc`). */
  priceCrc: string;
  /** Numeric price for totals. */
  priceNumeric: number;
  category: ProductCategory;
  qty: number;
}

export interface AddLineInput {
  productSlug: string;
  productName: string;
  variantId: number;
  variantName: string;
  priceCrc: string;
  priceNumeric: number;
  category: ProductCategory;
  /** Defaults to 1; "Pedir Ya" can override to a larger amount. */
  qty?: number;
}

interface CartState {
  lines: CartLine[];
  hydrated: boolean;
}

type CartAction =
  | { type: "HYDRATE"; lines: CartLine[] }
  | { type: "ADD"; input: AddLineInput }
  | { type: "QTY"; lineId: string; qty: number }
  | { type: "REMOVE"; lineId: string }
  | { type: "CLEAR" };

interface AntojoCartContextValue {
  /** Cart line items, in insertion order. */
  lines: readonly CartLine[];
  /** Number of distinct lines. */
  itemCount: number;
  /** Sum of all quantities. */
  totalQuantity: number;
  /** Numeric subtotal across all lines. */
  totalNumeric: number;
  /** Dominant category, or `"mixed"` if 2+ categories present. */
  dominantCategory: AnalyticsCategory;
  /** True after the first client mount + sessionStorage rehydration. */
  hydrated: boolean;
  /** Drawer open state. */
  isOpen: boolean;

  addLine: (input: AddLineInput) => void;
  updateQty: (lineId: string, qty: number) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  open: (source: "pedir_ya" | "manual") => void;
  close: () => void;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function makeLineId(slug: string, variantId: number): string {
  return `${slug}__${variantId}`;
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { lines: action.lines, hydrated: true };
    case "ADD": {
      const lineId = makeLineId(action.input.productSlug, action.input.variantId);
      const existing = state.lines.find((l) => l.lineId === lineId);
      const addQty = action.input.qty ?? 1;
      if (existing) {
        return {
          ...state,
          lines: state.lines.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty + addQty } : l)),
        };
      }
      const newLine: CartLine = {
        lineId,
        productSlug: action.input.productSlug,
        productName: action.input.productName,
        variantId: action.input.variantId,
        variantName: action.input.variantName,
        priceCrc: action.input.priceCrc,
        priceNumeric: action.input.priceNumeric,
        category: action.input.category,
        qty: addQty,
      };
      return { ...state, lines: [...state.lines, newLine] };
    }
    case "QTY": {
      if (action.qty <= 0) {
        return {
          ...state,
          lines: state.lines.filter((l) => l.lineId !== action.lineId),
        };
      }
      return {
        ...state,
        lines: state.lines.map((l) => (l.lineId === action.lineId ? { ...l, qty: action.qty } : l)),
      };
    }
    case "REMOVE":
      return {
        ...state,
        lines: state.lines.filter((l) => l.lineId !== action.lineId),
      };
    case "CLEAR":
      return { ...state, lines: [] };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function readStoredCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Light shape validation: drop anything that doesn't look like a
    // CartLine. We deliberately don't engage a runtime schema validator
    // — at this scale a few guard clauses are cheaper than a dep.
    return parsed.filter(isCartLine);
  } catch {
    return [];
  }
}

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.lineId === "string" &&
    typeof v.productSlug === "string" &&
    typeof v.productName === "string" &&
    typeof v.variantId === "number" &&
    typeof v.variantName === "string" &&
    typeof v.priceCrc === "string" &&
    typeof v.priceNumeric === "number" &&
    typeof v.category === "string" &&
    typeof v.qty === "number"
  );
}

function writeStoredCart(lines: readonly CartLine[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // sessionStorage write can fail in private mode / over-quota.
    // The cart still works in-memory; we just lose persistence.
  }
}

// ---------------------------------------------------------------------------
// Context + Provider
// ---------------------------------------------------------------------------

const AntojoCartContext = createContext<AntojoCartContextValue | null>(null);

export function AntojoCartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    lines: [],
    hydrated: false,
  });
  const [isOpen, setIsOpen] = useState(false);

  // Pending-open flag: when a CTA wants to open the cart, we set this
  // and let the effect below fire `trackOpenCart` AFTER the dispatched
  // line addition has flushed. This avoids the closure-staleness bug
  // where `state.lines.length` is read before the add reducer runs.
  const pendingOpenSourceRef = useRef<"pedir_ya" | "manual" | null>(null);

  // Hydrate once on client mount.
  useEffect(() => {
    dispatch({ type: "HYDRATE", lines: readStoredCart() });
  }, []);

  // Mirror to sessionStorage on every change (after first hydration).
  useEffect(() => {
    if (!state.hydrated) return;
    writeStoredCart(state.lines);
  }, [state.lines, state.hydrated]);

  // Fire trackOpenCart once per pending open, with the freshest count.
  useEffect(() => {
    if (!isOpen) return;
    const source = pendingOpenSourceRef.current;
    if (!source) return;
    pendingOpenSourceRef.current = null;
    trackOpenCart({ source, item_count: state.lines.length });
  }, [isOpen, state.lines.length]);

  const addLine = useCallback((input: AddLineInput) => {
    dispatch({ type: "ADD", input });
    trackAddToAntojos({
      product_slug: input.productSlug,
      variant_name: input.variantName,
      price_crc: input.priceNumeric,
    });
  }, []);

  const updateQty = useCallback(
    (lineId: string, qty: number) => {
      // When the new qty drops the line to zero, fire the remove event
      // (it's the same user intent as clicking "Quitar").
      if (qty <= 0) {
        const removed = state.lines.find((l) => l.lineId === lineId);
        if (removed) {
          trackRemoveFromAntojos({
            product_slug: removed.productSlug,
            variant_name: removed.variantName,
          });
        }
      }
      dispatch({ type: "QTY", lineId, qty });
    },
    [state.lines],
  );

  const removeLine = useCallback(
    (lineId: string) => {
      const removed = state.lines.find((l) => l.lineId === lineId);
      if (removed) {
        trackRemoveFromAntojos({
          product_slug: removed.productSlug,
          variant_name: removed.variantName,
        });
      }
      dispatch({ type: "REMOVE", lineId });
    },
    [state.lines],
  );

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  const open = useCallback((source: "pedir_ya" | "manual") => {
    // Defer the analytics fire to the effect above so it sees the
    // post-dispatch lines.length (otherwise "Pedir Ya" reports
    // item_count=0 because the add reducer hasn't flushed yet).
    pendingOpenSourceRef.current = source;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<AntojoCartContextValue>(() => {
    const itemCount = state.lines.length;
    const totalQuantity = state.lines.reduce((sum, l) => sum + l.qty, 0);
    const totalNumeric = state.lines.reduce((sum, l) => sum + l.priceNumeric * l.qty, 0);
    const categories = new Set(state.lines.map((l) => l.category));
    let dominantCategory: AnalyticsCategory = "mixed";
    if (categories.size === 1) {
      dominantCategory = [...categories][0] as AnalyticsCategory;
    } else if (categories.size === 0) {
      dominantCategory = "mixed";
    }
    return {
      lines: state.lines,
      itemCount,
      totalQuantity,
      totalNumeric,
      dominantCategory,
      hydrated: state.hydrated,
      isOpen,
      addLine,
      updateQty,
      removeLine,
      clearCart,
      open,
      close,
    };
  }, [state.lines, state.hydrated, isOpen, addLine, updateQty, removeLine, clearCart, open, close]);

  return <AntojoCartContext.Provider value={value}>{children}</AntojoCartContext.Provider>;
}

export function useAntojoCart(): AntojoCartContextValue {
  const ctx = useContext(AntojoCartContext);
  if (!ctx) {
    throw new Error(
      "useAntojoCart must be used inside <AntojoCartProvider>. Wrap your tree in app/layout.tsx.",
    );
  }
  return ctx;
}
