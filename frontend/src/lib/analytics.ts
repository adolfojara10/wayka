/**
 * Centralized analytics utility for Wayka.
 *
 * **Hard contract**: every component fires events through these
 * functions. No component imports `window.gtag` directly. This keeps
 * tracking consistent, testable, and easy to extend.
 *
 * Phase 4 ships the utility layer; **Phase 5 wires GA4** (next/third-
 * parties, consent banner, Search Console, etc.). Until then the
 * functions behave as follows:
 *
 *   1. SSR (`typeof window === "undefined"`) → no-op.
 *   2. `NEXT_PUBLIC_GA4_MEASUREMENT_ID` empty → record to an in-memory
 *      ring buffer (capped) so tests can introspect what was fired.
 *   3. GA4 id set + `window.gtag` exists → call gtag.
 *   4. GA4 id set + no `window.gtag` (script hasn't loaded yet) → no-op.
 *
 * Events match the spec in `master-prompt.txt §8` literally.
 */

// ---------------------------------------------------------------------------
// Event payload types (must match master-prompt.txt §8 exactly)
// ---------------------------------------------------------------------------

export type AnalyticsCategory = "pizzas" | "sweets" | "bocaditos" | "mixed";

export interface WhatsAppOrderClickParams {
  source: "pedir_ya" | "antojo_cart" | "catering_calculator";
  item_count: number;
  total_quantity: number;
  category: AnalyticsCategory;
  estimated_value_crc: number;
}

export interface ViewProductParams {
  product_slug: string;
  category: AnalyticsCategory;
  status: string;
}

export interface AddToAntojosParams {
  product_slug: string;
  variant_name: string;
  price_crc: number;
}

export interface OpenCartParams {
  source: "pedir_ya" | "manual";
  item_count: number;
}

export interface RemoveFromAntojosParams {
  product_slug: string;
  variant_name: string;
}

export interface SelectVariantParams {
  product_slug: string;
  variant_name: string;
}

export interface CategoryTabSwitchParams {
  from_category: AnalyticsCategory | null;
  to_category: AnalyticsCategory;
}

export interface CalculatorUsedParams {
  event_type: string;
  guest_count: number;
  recommended_items: number;
}

export interface ThemeToggleParams {
  to_theme: "light" | "dark";
}

// ---------------------------------------------------------------------------
// In-memory event recorder (used in tests + dev when GA4 not configured)
// ---------------------------------------------------------------------------

interface RecordedEvent {
  name: string;
  params: Record<string, unknown>;
  ts: number;
}

const RING_BUFFER_SIZE = 50;
const recordedEvents: RecordedEvent[] = [];

/** Test/dev introspection — returns a defensive copy of recent events. */
export function __getRecordedEvents(): readonly RecordedEvent[] {
  return [...recordedEvents];
}

/** Test helper — clear the in-memory buffer between cases. */
export function __resetRecordedEvents(): void {
  recordedEvents.length = 0;
}

// ---------------------------------------------------------------------------
// gtag bridge (typed)
// ---------------------------------------------------------------------------

type GtagFn = (command: "event", eventName: string, params: Record<string, unknown>) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

function ga4Configured(): boolean {
  const id = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "";
  return id.trim() !== "";
}

function recordEvent(name: string, params: Record<string, unknown>): void {
  // SSR-safe no-op.
  if (typeof window === "undefined") return;

  if (!ga4Configured()) {
    // Dev / pre-GA4 wiring: keep a bounded buffer for tests + manual
    // inspection via the React DevTools console.
    recordedEvents.push({ name, params, ts: Date.now() });
    if (recordedEvents.length > RING_BUFFER_SIZE) {
      recordedEvents.splice(0, recordedEvents.length - RING_BUFFER_SIZE);
    }
    return;
  }

  // GA4 configured: fire via gtag if the script has loaded.
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

// ---------------------------------------------------------------------------
// Public track* API — one function per spec event
// ---------------------------------------------------------------------------

/** The core conversion event: every WhatsApp redirect. */
export function trackWhatsAppOrderClick(params: WhatsAppOrderClickParams): void {
  recordEvent("whatsapp_order_click", { ...params });
}

export function trackViewProduct(params: ViewProductParams): void {
  recordEvent("view_product", { ...params });
}

export function trackAddToAntojos(params: AddToAntojosParams): void {
  recordEvent("add_to_antojos", { ...params });
}

export function trackOpenCart(params: OpenCartParams): void {
  recordEvent("open_cart", { ...params });
}

export function trackRemoveFromAntojos(params: RemoveFromAntojosParams): void {
  recordEvent("remove_from_antojos", { ...params });
}

export function trackSelectVariant(params: SelectVariantParams): void {
  recordEvent("select_variant", { ...params });
}

export function trackCategoryTabSwitch(params: CategoryTabSwitchParams): void {
  recordEvent("category_tab_switch", { ...params });
}

export function trackCalculatorUsed(params: CalculatorUsedParams): void {
  recordEvent("calculator_used", { ...params });
}

export function trackThemeToggle(params: ThemeToggleParams): void {
  recordEvent("theme_toggle", { ...params });
}
