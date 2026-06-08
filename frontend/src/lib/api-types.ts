/**
 * TypeScript types mirroring the Phase 3 Django + DRF serializers.
 *
 * Hand-rolled (not codegen) — the API is small enough to keep the
 * types here authoritatively. If the backend ever drifts, prefer to
 * regenerate from `/api/schema/` rather than patch by hand.
 *
 * Reference: backend/catalog/serializers.py
 */

export type ProductCategory = "bocaditos" | "sweets" | "pizzas";

export type ProductStatus = "active" | "coming_soon" | "sold_out" | "inactive";

/**
 * Schema.org `ItemAvailability` enum, as emitted by the backend.
 *
 * The backend never returns `"Discontinued"` to public consumers
 * because `inactive` products 404; we keep the union complete so
 * future statuses don't silently widen the type.
 */
export type Availability = "InStock" | "PreOrder" | "OutOfStock" | "Discontinued";

export interface ProductVariant {
  id: number;
  name: string;
  /** Numeric price for math (cart totals, JSON-LD `offers.price`). */
  price: number;
  /** Pre-formatted CRC string, e.g. `"₡ 7 500"` (NBSP separators). */
  price_crc: string;
  is_default: boolean;
  is_available: boolean;
  display_order: number;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: ProductCategory;
  status: ProductStatus;
  is_featured: boolean;
  is_orderable: boolean;
  has_multiple_variants: boolean;
  availability: Availability;
  image: string | null;
  meta_description: string;
  alt_text: string;
  variants: ProductVariant[];
  default_variant_id: number | null;
  updated_at: string;
}

export interface Supermarket {
  id: number;
  name: string;
  address: string;
  province: string;
  canton: string;
  latitude: string | null;
  longitude: string | null;
}

/** Day-of-week values match Python's ISO weekday-0-indexed convention (Mon=0..Sun=6). */
export type WeekdayNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeekdayHours {
  day: WeekdayNumber;
  day_label: string;
  /** ISO time string `HH:MM:SS` or null for "closed". */
  open_time: string | null;
  close_time: string | null;
}

export interface SiteSettings {
  business_name: string;
  primary_phone: string;
  email: string;
  street_address: string;
  address_locality: string;
  address_region: string;
  postal_code: string;
  /** ISO 3166-1 alpha-2 (defaults to "CR"). */
  country_code: string;
  latitude: string | null;
  longitude: string | null;
  social_instagram_url: string;
  social_facebook_url: string;
  hours: WeekdayHours[];
  updated_at: string;
}

/**
 * Display labels for each category, in Spanish. Single source of truth
 * for tabs, titles, navigation links, etc.
 */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  bocaditos: "Bocaditos",
  sweets: "Dulces",
  pizzas: "Pizzas",
};

/** All categories in the order they appear in the tab bar. */
export const CATEGORIES: readonly ProductCategory[] = ["bocaditos", "sweets", "pizzas"];
