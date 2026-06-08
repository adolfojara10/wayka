/**
 * Tests for `lib/jsonld.ts`.
 *
 * Pin the Schema.org shapes the frontend emits via `<JsonLd>`.
 * Google's rich-results validator can't be reached from CI; we
 * validate structurally instead.
 */

import { describe, expect, it } from "vitest";

import type { Product, SiteSettings } from "@/lib/api-types";
import { buildBreadcrumbLd, buildLocalBusinessLd, buildProductLd } from "@/lib/jsonld";

const SITE = "https://wayka.cr";

function makeSite(overrides: Partial<SiteSettings> = {}): SiteSettings {
  return {
    business_name: "Wayka",
    primary_phone: "+50688887777",
    email: "hola@wayka.cr",
    street_address: "Avenida Central",
    address_locality: "Escazú",
    address_region: "San José",
    postal_code: "10201",
    country_code: "CR",
    latitude: "9.918500",
    longitude: "-84.139700",
    social_instagram_url: "https://instagram.com/wayka.cr",
    social_facebook_url: "https://facebook.com/wayka.cr",
    hours: [
      {
        day: 0,
        day_label: "Lunes",
        open_time: "09:00:00",
        close_time: "18:00:00",
      },
      {
        day: 6,
        day_label: "Domingo",
        open_time: null,
        close_time: null,
      },
    ],
    updated_at: "2026-06-08T16:00:00Z",
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    slug: "pizza-margarita-artesanal",
    name: "Pizza Margarita Artesanal",
    description: "Clásica con masa madre.",
    category: "pizzas",
    status: "active",
    is_featured: true,
    is_orderable: true,
    has_multiple_variants: true,
    availability: "InStock",
    image: "http://localhost:8000/media/products/2026/06/pizza.jpg",
    meta_description: "Pizza margarita artesanal — Wayka.",
    alt_text: "Pizza margarita",
    default_variant_id: 11,
    variants: [
      {
        id: 11,
        name: "Mediana",
        price: 7500,
        price_crc: "₡\u00a07\u00a0500",
        is_default: true,
        is_available: true,
        display_order: 10,
      },
      {
        id: 12,
        name: "Familiar",
        price: 11500,
        price_crc: "₡\u00a011\u00a0500",
        is_default: false,
        is_available: true,
        display_order: 20,
      },
    ],
    updated_at: "2026-06-08T16:00:00Z",
    ...overrides,
  };
}

describe("buildLocalBusinessLd", () => {
  it("emits a FoodEstablishment with address + telephone + geo", () => {
    const ld = buildLocalBusinessLd(makeSite(), SITE);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("FoodEstablishment");
    expect(ld.name).toBe("Wayka");
    expect(ld.url).toBe(SITE);
    expect(ld.telephone).toBe("+50688887777");
    const address = ld.address as Record<string, unknown>;
    expect(address["@type"]).toBe("PostalAddress");
    expect(address.streetAddress).toBe("Avenida Central");
    expect(address.addressLocality).toBe("Escazú");
    expect(address.addressRegion).toBe("San José");
    expect(address.addressCountry).toBe("CR");
    const geo = ld.geo as Record<string, unknown>;
    expect(geo["@type"]).toBe("GeoCoordinates");
    expect(geo.latitude).toBe(9.9185);
    expect(geo.longitude).toBe(-84.1397);
  });

  it("emits openingHoursSpecification only for days with open + close times", () => {
    const ld = buildLocalBusinessLd(makeSite(), SITE);
    const hours = ld.openingHoursSpecification as Record<string, unknown>[];
    expect(hours).toHaveLength(1); // Sunday excluded (closed)
    expect(hours[0]).toMatchObject({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "Monday",
      opens: "09:00",
      closes: "18:00",
    });
  });

  it("skips optional fields gracefully", () => {
    const ld = buildLocalBusinessLd(
      makeSite({
        primary_phone: "",
        email: "",
        latitude: null,
        longitude: null,
        social_instagram_url: "",
        social_facebook_url: "",
        hours: [],
      }),
      SITE,
    );
    expect(ld.telephone).toBeUndefined();
    expect(ld.email).toBeUndefined();
    expect(ld.geo).toBeUndefined();
    expect(ld.sameAs).toBeUndefined();
    expect(ld.openingHoursSpecification).toBeUndefined();
  });
});

describe("buildProductLd", () => {
  it("emits a Product with offers in CRC", () => {
    const ld = buildProductLd(makeProduct(), SITE);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Product");
    expect(ld.name).toBe("Pizza Margarita Artesanal");
    expect(ld.url).toBe("https://wayka.cr/productos/pizza-margarita-artesanal");
    expect(ld.image).toBe("http://localhost:8000/media/products/2026/06/pizza.jpg");
    const offers = ld.offers as Record<string, unknown>[];
    expect(Array.isArray(offers)).toBe(true);
    expect(offers).toHaveLength(2);
    expect(offers[0]).toMatchObject({
      "@type": "Offer",
      name: "Mediana",
      price: 7500,
      priceCurrency: "CRC",
      availability: "https://schema.org/InStock",
    });
  });

  it("flattens offers to a single object when there is one variant", () => {
    const ld = buildProductLd(
      makeProduct({
        has_multiple_variants: false,
        variants: [
          {
            id: 1,
            name: "Unidad",
            price: 1200,
            price_crc: "₡\u00a01\u00a0200",
            is_default: true,
            is_available: true,
            display_order: 10,
          },
        ],
      }),
      SITE,
    );
    const offers = ld.offers as Record<string, unknown>;
    expect(Array.isArray(offers)).toBe(false);
    expect(offers).toMatchObject({
      "@type": "Offer",
      name: "Unidad",
      price: 1200,
    });
  });

  it("availability mirrors status (PreOrder, OutOfStock)", () => {
    const comingSoon = buildProductLd(
      makeProduct({ status: "coming_soon", availability: "PreOrder" }),
      SITE,
    );
    const offers = comingSoon.offers as Record<string, unknown>[];
    expect(offers[0].availability).toBe("https://schema.org/PreOrder");

    const soldOut = buildProductLd(
      makeProduct({ status: "sold_out", availability: "OutOfStock" }),
      SITE,
    );
    const offers2 = soldOut.offers as Record<string, unknown>[];
    expect(offers2[0].availability).toBe("https://schema.org/OutOfStock");
  });

  it("excludes unavailable variants from offers", () => {
    const ld = buildProductLd(
      makeProduct({
        variants: [
          {
            id: 11,
            name: "Mediana",
            price: 7500,
            price_crc: "x",
            is_default: true,
            is_available: true,
            display_order: 10,
          },
          {
            id: 12,
            name: "Familiar",
            price: 11500,
            price_crc: "x",
            is_default: false,
            is_available: false,
            display_order: 20,
          },
        ],
      }),
      SITE,
    );
    const offers = ld.offers as Record<string, unknown>;
    // Only one offer survives → flattened to object.
    expect((offers as Record<string, unknown>).name).toBe("Mediana");
  });
});

describe("buildBreadcrumbLd", () => {
  it("produces a BreadcrumbList with 1-indexed positions", () => {
    const ld = buildBreadcrumbLd([
      { name: "Inicio", url: "https://wayka.cr/" },
      { name: "Pizzas", url: "https://wayka.cr/pizzas" },
      { name: "Pizza Margarita", url: "https://wayka.cr/productos/pizza-margarita" },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    const items = ld.itemListElement as Record<string, unknown>[];
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      "@type": "ListItem",
      position: 1,
      name: "Inicio",
      item: "https://wayka.cr/",
    });
    expect(items[2].position).toBe(3);
  });
});
