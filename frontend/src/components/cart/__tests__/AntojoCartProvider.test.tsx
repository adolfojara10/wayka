/**
 * Tests for the Antojo Cart context.
 *
 * These tests do not render any visual UI — they exercise the
 * reducer + storage + analytics-firing contract via a tiny consumer
 * component that surfaces hooks' state and actions to the DOM.
 */

import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  trackAddToAntojos: vi.fn(),
  trackOpenCart: vi.fn(),
  trackRemoveFromAntojos: vi.fn(),
}));

import { trackAddToAntojos, trackOpenCart, trackRemoveFromAntojos } from "@/lib/analytics";
import {
  AntojoCartProvider,
  CART_STORAGE_KEY,
  useAntojoCart,
  type AddLineInput,
} from "@/components/cart/AntojoCartProvider";

function makeInput(overrides: Partial<AddLineInput> = {}): AddLineInput {
  return {
    productSlug: "pizza-margarita",
    productName: "Pizza Margarita",
    variantId: 11,
    variantName: "Mediana",
    priceCrc: "₡\u00a07\u00a0500",
    priceNumeric: 7500,
    category: "pizzas",
    ...overrides,
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe("AntojoCartProvider — reducer behavior", () => {
  it("adds the same product+variant twice as one line with qty=2", () => {
    const { result } = renderHook(() => useAntojoCart(), {
      wrapper: AntojoCartProvider,
    });

    act(() => result.current.addLine(makeInput()));
    act(() => result.current.addLine(makeInput()));

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].qty).toBe(2);
    expect(result.current.totalQuantity).toBe(2);
    expect(result.current.itemCount).toBe(1);
    expect(trackAddToAntojos).toHaveBeenCalledTimes(2);
  });

  it("updateQty(0) removes the line and fires trackRemoveFromAntojos", () => {
    const { result } = renderHook(() => useAntojoCart(), {
      wrapper: AntojoCartProvider,
    });

    act(() => result.current.addLine(makeInput()));
    const lineId = result.current.lines[0].lineId;
    act(() => result.current.updateQty(lineId, 0));

    expect(result.current.lines).toHaveLength(0);
    expect(trackRemoveFromAntojos).toHaveBeenCalledWith({
      product_slug: "pizza-margarita",
      variant_name: "Mediana",
    });
  });

  it("clearCart empties the state and clears sessionStorage", async () => {
    const { result } = renderHook(() => useAntojoCart(), {
      wrapper: AntojoCartProvider,
    });

    act(() => result.current.addLine(makeInput()));
    act(() => result.current.addLine(makeInput({ variantId: 12, variantName: "Familiar" })));
    expect(result.current.lines).toHaveLength(2);

    act(() => result.current.clearCart());

    expect(result.current.lines).toHaveLength(0);
    // Wait a microtask for the mirror-to-sessionStorage effect to flush.
    await act(async () => {
      await Promise.resolve();
    });
    const stored = window.sessionStorage.getItem(CART_STORAGE_KEY);
    expect(stored).toBe("[]");
  });

  it("derives dominantCategory from the lines (single → category, mixed → 'mixed')", () => {
    const { result } = renderHook(() => useAntojoCart(), {
      wrapper: AntojoCartProvider,
    });

    act(() => result.current.addLine(makeInput({ category: "pizzas" })));
    expect(result.current.dominantCategory).toBe("pizzas");

    act(() =>
      result.current.addLine(
        makeInput({
          productSlug: "pie-de-limon",
          variantId: 7,
          category: "sweets",
        }),
      ),
    );
    expect(result.current.dominantCategory).toBe("mixed");
  });
});

describe("AntojoCartProvider — open/close + analytics", () => {
  it("open('pedir_ya') fires trackOpenCart with source=pedir_ya", () => {
    const { result } = renderHook(() => useAntojoCart(), {
      wrapper: AntojoCartProvider,
    });

    act(() => result.current.addLine(makeInput()));
    act(() => result.current.open("pedir_ya"));

    expect(result.current.isOpen).toBe(true);
    expect(trackOpenCart).toHaveBeenCalledWith({
      source: "pedir_ya",
      item_count: 1,
    });
  });
});

describe("AntojoCartProvider — hydration", () => {
  it("hydrates from sessionStorage on mount", async () => {
    const prepopulated = [
      {
        lineId: "x__1",
        productSlug: "x",
        productName: "X",
        variantId: 1,
        variantName: "V",
        priceCrc: "₡ 100",
        priceNumeric: 100,
        category: "pizzas",
        qty: 3,
      },
    ];
    window.sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(prepopulated));

    const { result } = renderHook(() => useAntojoCart(), {
      wrapper: AntojoCartProvider,
    });
    // Hydration runs in a useEffect; flush.
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].qty).toBe(3);
    expect(result.current.hydrated).toBe(true);
  });

  it("ignores a corrupted sessionStorage payload without throwing", () => {
    window.sessionStorage.setItem(CART_STORAGE_KEY, "{not json at all");

    expect(() =>
      render(
        <AntojoCartProvider>
          <div>ok</div>
        </AntojoCartProvider>,
      ),
    ).not.toThrow();
  });
});

describe("useAntojoCart outside a provider", () => {
  it("throws a helpful error", () => {
    // renderHook outside provider:
    expect(() => renderHook(() => useAntojoCart())).toThrow(
      /useAntojoCart must be used inside <AntojoCartProvider>/,
    );
  });
});
