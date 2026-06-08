/**
 * `app/sitemap.ts` — generates `https://<site>/sitemap.xml` at runtime.
 *
 * Pulls the visible product list from the live API (`.visible()` on
 * the backend → inactive products are already filtered) and emits one
 * entry per crawlable URL:
 *
 *   * `/`                    — home
 *   * `/bocaditos`           — category landing
 *   * `/sweets`              — category landing
 *   * `/pizzas`              — category landing
 *   * `/catering`            — B2B page
 *   * `/productos/<slug>`    — one per visible product
 *
 * If the API is unreachable (e.g. during a Vercel build where the
 * Django host is not yet ready), we still emit the static routes so
 * Google can crawl them. Product entries are added best-effort.
 *
 * Dynamic so the build worker doesn't try to call the API offline;
 * combined with `getProducts`'s `next.revalidate: 60`, the framework
 * still caches between requests.
 */

import type { MetadataRoute } from "next";

import { getProducts } from "@/lib/api";
import { CATEGORIES } from "@/lib/api-types";

export const dynamic = "force-dynamic";

const PRODUCT_PATH_PREFIX = "/productos/";

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    ...CATEGORIES.map((category) => ({
      url: `${base}/${category}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    {
      url: `${base}/catering`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await getProducts();
    productEntries = products.map((product) => ({
      url: `${base}${PRODUCT_PATH_PREFIX}${product.slug}`,
      lastModified: new Date(product.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // API unreachable — still ship the static routes rather than fail
    // the sitemap entirely.
    productEntries = [];
  }

  return [...staticEntries, ...productEntries];
}
