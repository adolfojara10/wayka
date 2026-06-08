/**
 * Tests for the state-aware ProductCard.
 *
 * Pins the spec rules:
 *   - badges by status (Próximamente, Agotado, none)
 *   - buttons visible only when is_orderable
 *   - SizeSelector visible only when has_multiple_variants
 *   - per-variant is_available gates the option and the CTAs
 *   - "Pedir Ya" adds to cart AND opens drawer with source=pedir_ya
 *   - select_variant fires when the user changes size
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  trackAddToAntojos: vi.fn(),
  trackOpenCart: vi.fn(),
  trackRemoveFromAntojos: vi.fn(),
  trackSelectVariant: vi.fn(),
}));

import { trackOpenCart, trackSelectVariant } from "@/lib/analytics";
import { AntojoCartProvider } from "@/components/cart/AntojoCartProvider";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { Product, ProductStatus } from "@/lib/api-types";

function makeProduct(overrides: Partial<Product> = {}): Product {
  const status: ProductStatus = overrides.status ?? "active";
  return {
    id: 1,
    slug: "pizza-margarita",
    name: "Pizza Margarita",
    description: "Clásica con masa madre.",
    category: "pizzas",
    status,
    is_featured: false,
    is_orderable: status === "active",
    has_multiple_variants: false,
    availability: status === "active" ? "InStock" : "OutOfStock",
    image: null,
    meta_description: "",
    alt_text: "",
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
    ],
    updated_at: "2026-06-08T16:00:00Z",
    ...overrides,
  };
}

function renderCard(product: Product) {
  return render(
    <AntojoCartProvider>
      <ProductCard product={product} />
    </AntojoCartProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe("ProductCard — status-driven rendering", () => {
  it("active product shows both CTAs and no badge", () => {
    renderCard(makeProduct({ status: "active" }));
    expect(screen.getByTestId("pedir-ya")).toBeInTheDocument();
    expect(screen.getByTestId("add-to-antojos")).toBeInTheDocument();
    expect(screen.queryByTestId("product-status-badge")).not.toBeInTheDocument();
  });

  it("coming_soon product shows the Próximamente badge and hides CTAs", () => {
    renderCard(makeProduct({ status: "coming_soon", is_orderable: false }));
    const badge = screen.getByTestId("product-status-badge");
    expect(badge).toHaveTextContent("Próximamente");
    expect(screen.queryByTestId("pedir-ya")).not.toBeInTheDocument();
    expect(screen.queryByTestId("add-to-antojos")).not.toBeInTheDocument();
  });

  it("sold_out product shows the Agotado badge and hides CTAs", () => {
    renderCard(makeProduct({ status: "sold_out", is_orderable: false }));
    expect(screen.getByTestId("product-status-badge")).toHaveTextContent("Agotado");
    expect(screen.queryByTestId("pedir-ya")).not.toBeInTheDocument();
  });
});

describe("ProductCard — size selector", () => {
  it("hides the size selector for single-variant products and shows the price inline", () => {
    renderCard(makeProduct());
    expect(screen.queryByTestId("size-selector")).not.toBeInTheDocument();
    // RTL normalizes NBSP to ASCII space; match with a regex tolerant
    // of both so the test isn't fragile to whitespace collapsing.
    expect(screen.getByText(/₡\s*7\s*500/)).toBeInTheDocument();
  });

  it("shows the size selector for multi-variant products and fires trackSelectVariant on change", async () => {
    const user = userEvent.setup();
    renderCard(
      makeProduct({
        has_multiple_variants: true,
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
      }),
    );

    const selector = screen.getByTestId("size-selector");
    expect(selector).toBeInTheDocument();

    // The default ("Mediana") is the initially-selected variant.
    const familiarOption = screen.getByTestId("size-option-12");
    await user.click(within(familiarOption).getByRole("radio"));

    expect(trackSelectVariant).toHaveBeenCalledWith({
      product_slug: "pizza-margarita",
      variant_name: "Familiar",
    });
  });

  it("disables an unavailable variant option", () => {
    renderCard(
      makeProduct({
        has_multiple_variants: true,
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
            is_available: false,
            display_order: 20,
          },
        ],
      }),
    );

    const familiarOption = screen.getByTestId("size-option-12");
    expect(familiarOption).toHaveAttribute("aria-disabled", "true");
    const radio = within(familiarOption).getByRole("radio");
    expect(radio).toBeDisabled();
  });
});

describe("ProductCard — Pedir Ya CTA", () => {
  it("adds the product to the cart and opens the drawer with source=pedir_ya", async () => {
    const user = userEvent.setup();
    renderCard(makeProduct());

    await user.click(screen.getByTestId("pedir-ya"));

    expect(trackOpenCart).toHaveBeenCalledWith({
      source: "pedir_ya",
      item_count: 1,
    });
  });
});

describe("ProductCard — image rendering", () => {
  it("renders a next/image with alt_text when product.image is set", () => {
    renderCard(
      makeProduct({
        image: "http://localhost:8000/media/products/p.jpg",
        alt_text: "Pizza margarita con albahaca",
      }),
    );
    const img = screen.getByAltText("Pizza margarita con albahaca");
    // next/image renders an <img> tag in jsdom; the URL is transformed
    // through /_next/image but src will at minimum contain the original
    // filename or its encoded form.
    expect(img.tagName.toLowerCase()).toBe("img");
    expect(screen.queryByTestId("product-card-image-placeholder")).toBeNull();
  });

  it("renders the placeholder div (no <img>) when product.image is null", () => {
    renderCard(makeProduct({ image: null }));
    expect(screen.getByTestId("product-card-image-placeholder")).toBeInTheDocument();
    // No product photo means no decorative <img> is in the card.
    // The page itself may have other images (e.g. logo) but the card
    // body shouldn't render one.
    const imgs = screen.queryAllByRole("img");
    expect(imgs).toHaveLength(0);
  });

  it("falls back to product.name as alt when alt_text is blank", () => {
    renderCard(
      makeProduct({
        image: "http://localhost:8000/media/p.jpg",
        alt_text: "",
      }),
    );
    expect(screen.getByAltText("Pizza Margarita")).toBeInTheDocument();
  });
});
