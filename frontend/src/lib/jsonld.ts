/**
 * Schema.org JSON-LD builders for the Wayka site.
 *
 * Three types per the master prompt §P5.1:
 *
 *   1. `FoodEstablishment` (a `LocalBusiness` subtype) — site-wide
 *      identity. Emitted once from the root layout when SiteSettings
 *      is configured.
 *   2. `Product` (with `Offer`s) — per product detail page. Pricing
 *      in CRC, availability mirroring the backend's `availability`
 *      enum (already Schema.org-aligned in Phase 3).
 *   3. `BreadcrumbList` — on category and product detail pages.
 *
 * All builders return plain serializable objects; the `<JsonLd>`
 * component handles JSON-stringification and emits the
 * `<script type="application/ld+json">` tag.
 */

import type { Product, SiteSettings, WeekdayHours } from "@/lib/api-types";

const SCHEMA_CONTEXT = "https://schema.org";
const AVAILABILITY_BASE = "https://schema.org/";

// Schema.org openingHoursSpecification uses the two-letter day codes.
const DAY_CODES: Record<number, string> = {
  0: "Monday",
  1: "Tuesday",
  2: "Wednesday",
  3: "Thursday",
  4: "Friday",
  5: "Saturday",
  6: "Sunday",
};

// ---------------------------------------------------------------------------
// FoodEstablishment / LocalBusiness
// ---------------------------------------------------------------------------

function openingHoursSpecification(hours: readonly WeekdayHours[]): unknown[] {
  return hours
    .filter((h) => h.open_time && h.close_time)
    .map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY_CODES[h.day],
      // Backend serializes times as HH:MM:SS; trim to HH:MM for
      // Schema.org which prefers ISO 8601 "HH:MM".
      opens: (h.open_time ?? "").slice(0, 5),
      closes: (h.close_time ?? "").slice(0, 5),
    }));
}

export function buildLocalBusinessLd(site: SiteSettings, siteUrl: string): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "FoodEstablishment",
    name: site.business_name,
    url: siteUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.street_address || undefined,
      addressLocality: site.address_locality || undefined,
      addressRegion: site.address_region || undefined,
      postalCode: site.postal_code || undefined,
      addressCountry: site.country_code || "CR",
    },
  };
  if (site.primary_phone) {
    ld.telephone = site.primary_phone;
  }
  if (site.email) {
    ld.email = site.email;
  }
  if (site.latitude && site.longitude) {
    ld.geo = {
      "@type": "GeoCoordinates",
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
    };
  }
  const social = [site.social_instagram_url, site.social_facebook_url].filter(Boolean);
  if (social.length > 0) {
    ld.sameAs = social;
  }
  const hours = openingHoursSpecification(site.hours);
  if (hours.length > 0) {
    ld.openingHoursSpecification = hours;
  }
  return ld;
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export function buildProductLd(product: Product, siteUrl: string): Record<string, unknown> {
  const availabilityUrl = `${AVAILABILITY_BASE}${product.availability}`;
  const productUrl = `${siteUrl}/productos/${product.slug}`;

  const offers = product.variants
    .filter((v) => v.is_available)
    .map((v) => ({
      "@type": "Offer",
      name: v.name,
      price: v.price,
      priceCurrency: "CRC",
      availability: availabilityUrl,
      url: productUrl,
    }));

  const ld: Record<string, unknown> = {
    "@context": SCHEMA_CONTEXT,
    "@type": "Product",
    name: product.name,
    description: product.meta_description?.trim() || product.description,
    category: product.category,
    url: productUrl,
  };
  if (product.image) {
    ld.image = product.image;
  }
  if (offers.length === 1) {
    ld.offers = offers[0];
  } else if (offers.length > 1) {
    ld.offers = offers;
  }
  return ld;
}

// ---------------------------------------------------------------------------
// BreadcrumbList
// ---------------------------------------------------------------------------

export interface BreadcrumbInput {
  name: string;
  /** Absolute URL. */
  url: string;
}

export function buildBreadcrumbLd(items: readonly BreadcrumbInput[]): Record<string, unknown> {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
