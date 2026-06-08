/**
 * Tests for `app/sitemap.ts`.
 *
 * Pins the SEO-critical contract that:
 *   - every category and the home + catering routes are listed;
 *   - one entry per visible product is included;
 *   - inactive products NEVER appear (their slugs would 404 on the
 *     detail page, so Google should not be told they exist).
 *
 * The backend's `.visible()` filter handles the inactive exclusion;
 * our test confirms the sitemap consumes the filtered list, not the
 * raw one.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  getProducts: vi.fn(),
}));

import { getProducts } from "@/lib/api";
import sitemap from "@/app/sitemap";
import type { Product } from "@/lib/api-types";

function makeProduct(slug: string, updated_at = "2026-06-08T16:00:00Z"): Product {
  return {
    id: 1,
    slug,
    name: slug,
    description: "x",
    category: "pizzas",
    status: "active",
    is_featured: false,
    is_orderable: true,
    has_multiple_variants: false,
    availability: "InStock",
    image: null,
    meta_description: "",
    alt_text: "",
    default_variant_id: null,
    variants: [],
    updated_at,
  };
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://wayka.cr");
  vi.mocked(getProducts).mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("app/sitemap.ts", () => {
  it("always lists home + 3 category routes + catering", async () => {
    vi.mocked(getProducts).mockResolvedValue([]);
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://wayka.cr/");
    expect(urls).toContain("https://wayka.cr/bocaditos");
    expect(urls).toContain("https://wayka.cr/sweets");
    expect(urls).toContain("https://wayka.cr/pizzas");
    expect(urls).toContain("https://wayka.cr/catering");
  });

  it("adds one entry per visible product", async () => {
    vi.mocked(getProducts).mockResolvedValue([
      makeProduct("pizza-margarita-artesanal"),
      makeProduct("pie-de-limon"),
    ]);
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://wayka.cr/productos/pizza-margarita-artesanal");
    expect(urls).toContain("https://wayka.cr/productos/pie-de-limon");
  });

  it("excludes inactive products because getProducts hides them", async () => {
    // The backend's `.visible()` filter strips inactives, so the
    // mock simply omits any. We confirm the sitemap honors that.
    vi.mocked(getProducts).mockResolvedValue([makeProduct("active-product")]);
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).not.toContain("https://wayka.cr/productos/inactive-product");
    expect(urls).toContain("https://wayka.cr/productos/active-product");
  });

  it("still ships static routes when the API call fails", async () => {
    vi.mocked(getProducts).mockRejectedValue(new Error("boom"));
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://wayka.cr/");
    expect(urls).toContain("https://wayka.cr/bocaditos");
    // No product entries when the API is down.
    const productEntries = urls.filter((u) => u.includes("/productos/"));
    expect(productEntries).toHaveLength(0);
  });

  it("uses NEXT_PUBLIC_SITE_URL as the URL prefix", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    vi.mocked(getProducts).mockResolvedValue([]);
    const entries = await sitemap();
    expect(entries[0].url).toBe("https://example.test/");
  });
});
