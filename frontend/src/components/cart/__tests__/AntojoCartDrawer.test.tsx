/**
 * Tests for the Antojo Cart drawer.
 *
 * Focus is on the WhatsApp CTA contract — the highest-value, most
 * brittle behavior in P4. We mock the analytics + whatsapp modules so
 * the tests stay decoupled from env-var plumbing.
 */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  trackAddToAntojos: vi.fn(),
  trackOpenCart: vi.fn(),
  trackRemoveFromAntojos: vi.fn(),
  trackWhatsAppOrderClick: vi.fn(),
}));

import { trackWhatsAppOrderClick } from "@/lib/analytics";
import {
  AntojoCartProvider,
  useAntojoCart,
  type AddLineInput,
} from "@/components/cart/AntojoCartProvider";
import { AntojoCartDrawer } from "@/components/cart/AntojoCartDrawer";

function makeInput(overrides: Partial<AddLineInput> = {}): AddLineInput {
  return {
    productSlug: "pizza-margarita-artesanal",
    productName: "Pizza Margarita Artesanal",
    variantId: 11,
    variantName: "Familiar",
    priceCrc: "₡\u00a011\u00a0500",
    priceNumeric: 11500,
    category: "pizzas",
    ...overrides,
  };
}

/**
 * Tiny harness component: lets a test prime the cart + open the
 * drawer from inside the provider context.
 */
function Harness({
  prefill = [] as AddLineInput[],
  startOpen = true,
}: {
  prefill?: readonly AddLineInput[];
  startOpen?: boolean;
}) {
  const cart = useAntojoCart();
  return (
    <>
      <button
        type="button"
        data-testid="harness-prime"
        onClick={() => {
          prefill.forEach((input) => cart.addLine(input));
          if (startOpen) cart.open("manual");
        }}
      >
        prime
      </button>
      <AntojoCartDrawer />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+50688887777");
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.sessionStorage.clear();
});

describe("AntojoCartDrawer — WhatsApp CTA with items", () => {
  it("builds the spec-aligned URL and fires trackWhatsAppOrderClick with aggregates", async () => {
    const user = userEvent.setup();
    render(
      <AntojoCartProvider>
        <Harness
          prefill={[
            makeInput(),
            makeInput(), // adds qty=2 to the same line
            makeInput({
              productSlug: "pie-de-limon",
              productName: "Pie de Limón",
              variantId: 7,
              variantName: "Porción",
              priceCrc: "₡\u00a02\u00a0200",
              priceNumeric: 2200,
              category: "sweets",
            }),
          ]}
        />
      </AntojoCartProvider>,
    );

    await act(async () => {
      await user.click(screen.getByTestId("harness-prime"));
    });

    const cta = await screen.findByTestId("cart-whatsapp-cta");
    expect(cta).toBeInTheDocument();

    const href = cta.getAttribute("href") ?? "";
    expect(href.startsWith("https://wa.me/50688887777?text=")).toBe(true);
    const message = decodeURIComponent(href.split("?text=")[1]);
    expect(message).toBe(
      "¡Hola Wayka! Me gustaría coordinar el pedido de estos antojos:\n" +
        "- 2x Pizza Margarita Artesanal (Familiar)\n" +
        "- 1x Pie de Limón (Porción)\n" +
        "¿Me ayudan a coordinar el envío?",
    );

    await user.click(cta);

    expect(trackWhatsAppOrderClick).toHaveBeenCalledWith({
      source: "antojo_cart",
      item_count: 2,
      total_quantity: 3,
      category: "mixed",
      estimated_value_crc: 2 * 11500 + 2200,
    });
  });
});

describe("AntojoCartDrawer — empty state", () => {
  it("shows the conversational empty copy and disables the CTA", async () => {
    const user = userEvent.setup();
    render(
      <AntojoCartProvider>
        <Harness prefill={[]} startOpen={true} />
      </AntojoCartProvider>,
    );

    await act(async () => {
      await user.click(screen.getByTestId("harness-prime"));
    });

    expect(await screen.findByTestId("cart-empty")).toBeInTheDocument();
    expect(screen.getByText(/Tu Bolsa de Antojos está vacía/i)).toBeInTheDocument();
    expect(screen.getByTestId("cart-whatsapp-cta-disabled")).toBeInTheDocument();
    expect(screen.queryByTestId("cart-whatsapp-cta")).not.toBeInTheDocument();
  });
});
