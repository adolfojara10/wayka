/**
 * Tests for the centralized analytics utility.
 *
 * These tests pin the public contract from `master-prompt.txt §8` and
 * defend the "no component calls `gtag` directly" rule at the boundary.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __getRecordedEvents,
  __resetRecordedEvents,
  trackAddToAntojos,
  trackCategoryTabSwitch,
  trackOpenCart,
  trackRemoveFromAntojos,
  trackSelectVariant,
  trackThemeToggle,
  trackViewProduct,
  trackWhatsAppOrderClick,
} from "@/lib/analytics";

beforeEach(() => {
  __resetRecordedEvents();
  vi.unstubAllEnvs();
});

afterEach(() => {
  __resetRecordedEvents();
  vi.unstubAllEnvs();
  // Restore default `window.gtag` state between cases.
  if (typeof window !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).gtag;
  }
});

describe("analytics utility — public API", () => {
  it("exports every event helper with stable signatures", () => {
    // Calling each function with a spec-correct payload must not throw.
    expect(() =>
      trackWhatsAppOrderClick({
        source: "pedir_ya",
        item_count: 1,
        total_quantity: 2,
        category: "pizzas",
        estimated_value_crc: 11500,
      }),
    ).not.toThrow();
    expect(() =>
      trackViewProduct({
        product_slug: "pizza-margarita",
        category: "pizzas",
        status: "active",
      }),
    ).not.toThrow();
    expect(() =>
      trackAddToAntojos({
        product_slug: "pizza-margarita",
        variant_name: "Familiar",
        price_crc: 11500,
      }),
    ).not.toThrow();
    expect(() => trackOpenCart({ source: "manual", item_count: 0 })).not.toThrow();
    expect(() =>
      trackRemoveFromAntojos({
        product_slug: "x",
        variant_name: "y",
      }),
    ).not.toThrow();
    expect(() => trackSelectVariant({ product_slug: "x", variant_name: "y" })).not.toThrow();
    expect(() =>
      trackCategoryTabSwitch({
        from_category: "pizzas",
        to_category: "sweets",
      }),
    ).not.toThrow();
    expect(() => trackThemeToggle({ to_theme: "dark" })).not.toThrow();
  });
});

describe("analytics utility — dev / pre-GA4 wiring", () => {
  it("records events into the in-memory buffer when GA4 id is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "");
    trackViewProduct({
      product_slug: "pie-de-limon",
      category: "sweets",
      status: "active",
    });
    const events = __getRecordedEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("view_product");
    expect(events[0].params).toMatchObject({
      product_slug: "pie-de-limon",
      category: "sweets",
      status: "active",
    });
  });

  it("does not call gtag when GA4 id is empty even if gtag exists", () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "");
    const gtag = vi.fn();
    window.gtag = gtag;
    trackOpenCart({ source: "manual", item_count: 3 });
    expect(gtag).not.toHaveBeenCalled();
  });
});

describe("analytics utility — GA4 configured", () => {
  it("calls gtag with the correct shape when GA4 id is set and gtag exists", () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-TEST123");
    const gtag = vi.fn();
    window.gtag = gtag;

    trackWhatsAppOrderClick({
      source: "antojo_cart",
      item_count: 2,
      total_quantity: 3,
      category: "mixed",
      estimated_value_crc: 12500,
    });

    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "whatsapp_order_click", {
      source: "antojo_cart",
      item_count: 2,
      total_quantity: 3,
      category: "mixed",
      estimated_value_crc: 12500,
    });
  });

  it("does not throw when GA4 id is set but window.gtag is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-TEST123");
    // No window.gtag installed.
    expect(() => trackThemeToggle({ to_theme: "light" })).not.toThrow();
    // And nothing gets recorded to the in-memory buffer either —
    // tracking is fully delegated to gtag in this mode.
    expect(__getRecordedEvents()).toHaveLength(0);
  });
});
