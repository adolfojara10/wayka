/**
 * Server-side fetch wrappers for the Wayka Django + DRF API (Phase 3).
 *
 * These functions are intended to be called from Server Components and
 * `generateMetadata` only. They use Next.js `fetch` extensions:
 *
 *   * `next.revalidate: 60` — re-validate at most every 60 seconds.
 *     Matches the backend's `Cache-Control: max-age=60, s-maxage=300`.
 *   * `next.tags: ["catalog"]` — let P5 bust the cache from a deploy
 *     hook via `revalidateTag("catalog")`.
 *
 * Memoization: identical `fetch` calls inside a single render tree
 * are deduplicated by Next, so a `generateMetadata` + `page.tsx` that
 * both call `getProduct(slug)` produce a single HTTP request.
 *
 * Error handling: `getProduct` returns `null` on 404 so the page can
 * call `notFound()` cleanly. All other non-2xx responses throw, which
 * surfaces as the Next.js error boundary.
 */

import type { Product, ProductCategory, Supermarket } from "./api-types";

/** Base URL of the Django API, with no trailing slash. */
function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
  return url.replace(/\/+$/, "");
}

/**
 * Tag every catalog fetch so a single `revalidateTag` busts them all.
 *
 * Not declared `as const` because Next.js's `RequestInit.next.tags`
 * expects a mutable `string[]`; a readonly tuple would fail the build.
 */
const CATALOG_FETCH_OPTIONS: RequestInit = {
  next: { revalidate: 60, tags: ["catalog"] },
};

/**
 * List products visible to the public site.
 *
 * @param opts.category - optional category filter; maps 1:1 to the
 * backend's `?category=` query. Invalid categories would 400 at the
 * API, but `ProductCategory` is a TypeScript-enforced union, so the
 * call site cannot construct one.
 */
export async function getProducts(opts?: { category?: ProductCategory }): Promise<Product[]> {
  const url = new URL(`${baseUrl()}/products/`);
  if (opts?.category) {
    url.searchParams.set("category", opts.category);
  }
  const response = await fetch(url.toString(), CATALOG_FETCH_OPTIONS);
  if (!response.ok) {
    throw new Error(`getProducts failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as Product[];
}

/**
 * Fetch a single product by slug.
 *
 * Returns `null` on 404 (inactive product or unknown slug) so the
 * caller can do `if (!product) notFound();`. Throws on any other
 * non-2xx response.
 */
export async function getProduct(slug: string): Promise<Product | null> {
  const url = `${baseUrl()}/products/${encodeURIComponent(slug)}/`;
  const response = await fetch(url, CATALOG_FETCH_OPTIONS);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`getProduct(${slug}) failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as Product;
}

/** Active supermarket pickup locations. */
export async function getSupermarkets(): Promise<Supermarket[]> {
  const url = `${baseUrl()}/supermarkets/`;
  const response = await fetch(url, CATALOG_FETCH_OPTIONS);
  if (!response.ok) {
    throw new Error(`getSupermarkets failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as Supermarket[];
}
