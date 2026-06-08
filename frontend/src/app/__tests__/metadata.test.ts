/**
 * Tests for per-route `metadata` / `generateMetadata` exports.
 *
 * Pin that:
 *   - Root layout sets metadataBase + Spanish OG defaults.
 *   - Each category page exports its own title containing the
 *     Spanish label.
 *   - The product detail's generateMetadata produces a unique title
 *     and falls back gracefully on a missing product.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Montserrat: () => ({ variable: "mock-montserrat" }),
}));

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: () => null,
}));

vi.mock("@/lib/api", () => ({
  getProduct: vi.fn(),
  getProducts: vi.fn(),
  getSiteSettings: vi.fn().mockResolvedValue(null),
  getSupermarkets: vi.fn().mockResolvedValue([]),
}));

import { getProduct } from "@/lib/api";
import { metadata as rootMetadata } from "@/app/layout";
import { metadata as bocaditosMetadata } from "@/app/(catalog)/bocaditos/page";
import { metadata as sweetsMetadata } from "@/app/(catalog)/sweets/page";
import { metadata as pizzasMetadata } from "@/app/(catalog)/pizzas/page";
import { generateMetadata as productDetailMetadata } from "@/app/productos/[slug]/page";
import type { Product } from "@/lib/api-types";

beforeEach(() => {
  vi.mocked(getProduct).mockReset();
});

afterEach(() => {
  vi.mocked(getProduct).mockReset();
});

describe("root layout metadata", () => {
  it("sets metadataBase, openGraph defaults, robots", () => {
    expect(rootMetadata.metadataBase?.toString()).toMatch(/^https?:\/\//);
    expect(rootMetadata.openGraph?.siteName).toBe("Wayka");
    expect(rootMetadata.openGraph?.locale).toBe("es_CR");
    expect(rootMetadata.openGraph?.type).toBe("website");
    expect(rootMetadata.twitter?.card).toBe("summary_large_image");
    expect(rootMetadata.robots).toMatchObject({ index: true, follow: true });
    expect(rootMetadata.alternates?.canonical).toBe("/");
  });
});

describe("category page metadata", () => {
  it("each category page has a unique title containing its Spanish label", () => {
    expect(bocaditosMetadata.title).toContain("Bocaditos");
    expect(sweetsMetadata.title).toContain("Dulces");
    expect(pizzasMetadata.title).toContain("Pizzas");
    // Titles are unique.
    const titles = new Set([bocaditosMetadata.title, sweetsMetadata.title, pizzasMetadata.title]);
    expect(titles.size).toBe(3);
  });
});

describe("product detail generateMetadata", () => {
  function makeProduct(): Product {
    return {
      id: 1,
      slug: "pizza-margarita",
      name: "Pizza Margarita",
      description: "Clásica con masa madre.",
      category: "pizzas",
      status: "active",
      is_featured: true,
      is_orderable: true,
      has_multiple_variants: false,
      availability: "InStock",
      image: "http://localhost:8000/media/p.jpg",
      meta_description: "Pizza margarita artesanal.",
      alt_text: "Pizza",
      default_variant_id: 1,
      variants: [],
      updated_at: "2026-06-08T16:00:00Z",
    };
  }

  it("uses product name in title and meta_description in description", async () => {
    vi.mocked(getProduct).mockResolvedValue(makeProduct());
    const m = await productDetailMetadata({
      params: Promise.resolve({ slug: "pizza-margarita" }),
    });
    expect(m.title).toBe("Pizza Margarita — Wayka");
    expect(m.description).toBe("Pizza margarita artesanal.");
    expect(m.alternates?.canonical).toBe("/productos/pizza-margarita");
    expect(m.openGraph?.url).toBe("/productos/pizza-margarita");
  });

  it("returns noindex metadata when product is missing", async () => {
    vi.mocked(getProduct).mockResolvedValue(null);
    const m = await productDetailMetadata({
      params: Promise.resolve({ slug: "nope" }),
    });
    expect(m.title).toBe("Producto no encontrado — Wayka");
    expect(m.robots).toMatchObject({ index: false, follow: false });
  });

  it("falls back to description when meta_description is blank", async () => {
    vi.mocked(getProduct).mockResolvedValue(makeProduct() as Product);
    vi.mocked(getProduct).mockResolvedValue({
      ...makeProduct(),
      meta_description: "",
    });
    const m = await productDetailMetadata({
      params: Promise.resolve({ slug: "pizza-margarita" }),
    });
    expect(m.description).toBe("Clásica con masa madre.");
  });
});
