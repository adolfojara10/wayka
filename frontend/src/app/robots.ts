/**
 * `app/robots.ts` — generates `https://<site>/robots.txt`.
 *
 * Allow everything (Wayka is a public storefront), disallow the
 * `/api/` prefix defensively (there is no Next API route today; the
 * Django API is on a different host anyway, but keeping the rule
 * makes the intent explicit). Sitemap and `host` use
 * `NEXT_PUBLIC_SITE_URL`.
 */

import type { MetadataRoute } from "next";

function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
