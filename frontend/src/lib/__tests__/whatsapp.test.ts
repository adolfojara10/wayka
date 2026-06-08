/**
 * Tests for `lib/whatsapp.ts`.
 *
 * The WhatsApp builder is critical-path code — every order in Wayka
 * passes through it. Tests pin both the message shape and the URL
 * encoding character-for-character.
 *
 * Phase 4 decision: every cart line includes the variant in parens,
 * even for single-variant products. The spec quote in master-prompt.txt
 * §P4.4 omits parens for `Pie de Limón`; we diverge there.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCartMessage,
  buildCateringMessage,
  WhatsAppConfigError,
  whatsappUrl,
} from "@/lib/whatsapp";

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildCartMessage", () => {
  it("builds the spec-aligned message with the with-parens variant rule", () => {
    const message = buildCartMessage([
      { qty: 2, productName: "Pizza Margarita Artesanal", variantName: "Familiar" },
      { qty: 1, productName: "Pie de Limón", variantName: "Porción" },
    ]);
    expect(message).toBe(
      "¡Hola Wayka! Me gustaría coordinar el pedido de estos antojos:\n" +
        "- 2x Pizza Margarita Artesanal (Familiar)\n" +
        "- 1x Pie de Limón (Porción)\n" +
        "¿Me ayudan a coordinar el envío?",
    );
  });

  it("always includes the variant in parens (single-variant products too)", () => {
    const message = buildCartMessage([
      { qty: 3, productName: "Mini Quesadillas", variantName: "Unidad" },
    ]);
    expect(message).toContain("- 3x Mini Quesadillas (Unidad)");
  });

  it("returns a valid greeting+closing even when given zero lines", () => {
    // Callers should disable the CTA on an empty cart but the function
    // must remain pure / total.
    const message = buildCartMessage([]);
    expect(message).toBe(
      "¡Hola Wayka! Me gustaría coordinar el pedido de estos antojos:\n" +
        "¿Me ayudan a coordinar el envío?",
    );
  });
});

describe("whatsappUrl", () => {
  it("builds a wa.me URL with the digits-only phone number and encoded text", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+50688887777");
    const url = whatsappUrl("Hola");
    expect(url).toBe("https://wa.me/50688887777?text=Hola");
  });

  it("strips spaces and non-digit characters from the phone number", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+506 8888 7777");
    const url = whatsappUrl("Hola");
    expect(url.startsWith("https://wa.me/50688887777")).toBe(true);
  });

  it("encodes newlines in the message as %0A", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+50688887777");
    const url = whatsappUrl("línea 1\nlínea 2");
    expect(url).toContain("%0A");
    expect(url).not.toContain("\n");
  });

  it("throws WhatsAppConfigError when the env var is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "");
    expect(() => whatsappUrl("hola")).toThrow(WhatsAppConfigError);
  });

  it("throws WhatsAppConfigError on an obviously-invalid phone number", () => {
    vi.stubEnv("NEXT_PUBLIC_WHATSAPP_NUMBER", "+5");
    expect(() => whatsappUrl("hola")).toThrow(WhatsAppConfigError);
  });
});

describe("buildCateringMessage", () => {
  it("includes event type, guest count, total items, and breakdown lines", () => {
    const message = buildCateringMessage({
      eventTypeLabel: "Cumpleaños",
      guestCount: 30,
      totalItems: 240,
      breakdown: ["- 150 bocaditos", "- 90 dulces"],
    });
    expect(message).toContain("Tipo de evento: Cumpleaños");
    expect(message).toContain("Cantidad de invitados: 30");
    expect(message).toContain("Recomendación total: 240 piezas");
    expect(message).toContain("- 150 bocaditos");
    expect(message).toContain("- 90 dulces");
    expect(message).toMatch(/¿Podemos coordinar los detalles\?$/);
  });
});
