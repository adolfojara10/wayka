/**
 * WhatsApp message + URL builder for Wayka.
 *
 * Every CTA that funnels into a WhatsApp conversation goes through
 * these helpers. The Antojo Cart, "Pedir Ya", and (future) catering
 * calculator all produce a structured Spanish message, then wrap it
 * in a `https://wa.me/<digits>?text=<encoded>` URL.
 *
 * Per the Phase 4 decision (with-parens variant naming), every line
 * reads `- Nx <Product name> (<Variant name>)`. Spec quote in
 * master-prompt.txt §P4.4 omits parens for single-variant items; we
 * diverge there for consistency.
 */

/**
 * A cart line as the WhatsApp builder consumes it. Kept narrower than
 * the full `CartLine` so this helper has no coupling to React/context.
 */
export interface WhatsAppCartLine {
  qty: number;
  productName: string;
  variantName: string;
}

export interface WhatsAppCateringInput {
  eventTypeLabel: string;
  guestCount: number;
  totalItems: number;
  /** Pre-built human-readable bullets, e.g. `"- 300 bocaditos"`. */
  breakdown: readonly string[];
}

/** Thrown when the WhatsApp number env var is missing or malformed. */
export class WhatsAppConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppConfigError";
  }
}

// ---------------------------------------------------------------------------
// Message builders
// ---------------------------------------------------------------------------

/**
 * Build the spec-aligned cart message.
 *
 * Format (literal whitespace, real `\n` line breaks):
 *
 *     ¡Hola Wayka! Me gustaría coordinar el pedido de estos antojos:
 *     - 2x Pizza Margarita Artesanal (Familiar)
 *     - 1x Pie de Limón (Porción)
 *     ¿Me ayudan a coordinar el envío?
 */
export function buildCartMessage(lines: readonly WhatsAppCartLine[]): string {
  const header = "¡Hola Wayka! Me gustaría coordinar el pedido de estos antojos:";
  const closing = "¿Me ayudan a coordinar el envío?";
  if (lines.length === 0) {
    // Defensive: callers should disable the CTA when the cart is empty,
    // but if they don't we still produce a valid (if minimal) message.
    return `${header}\n${closing}`;
  }
  const bullets = lines.map((line) => `- ${line.qty}x ${line.productName} (${line.variantName})`);
  return [header, ...bullets, closing].join("\n");
}

/**
 * Build the catering / B2B message.
 *
 * Used by the "Coordinar este menú por WhatsApp" CTA. The calculator
 * itself is not implemented in Phase 4 (blocked on client ratios) but
 * this builder is ready so the placeholder /catering CTA can already
 * point at WhatsApp with a generic message — and so when the
 * calculator lands it has nothing to invent.
 */
export function buildCateringMessage(input: WhatsAppCateringInput): string {
  const header = "¡Hola Wayka! Estoy planificando un evento y me gustaría coordinar el catering:";
  const closing = "¿Podemos coordinar los detalles?";
  const summary = [
    `- Tipo de evento: ${input.eventTypeLabel}`,
    `- Cantidad de invitados: ${input.guestCount}`,
    `- Recomendación total: ${input.totalItems} piezas`,
  ];
  return [header, ...summary, ...input.breakdown, closing].join("\n");
}

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

/**
 * Build a `https://wa.me/<digits>?text=<encoded>` URL.
 *
 * Reads `NEXT_PUBLIC_WHATSAPP_NUMBER` (E.164, e.g. `+50688887777`),
 * strips non-digit characters, and URL-encodes the message. Throws a
 * typed {@link WhatsAppConfigError} if the env var is missing so the
 * caller can render a friendly disabled state instead of a broken URL.
 */
export function whatsappUrl(message: string): string {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) {
    throw new WhatsAppConfigError("NEXT_PUBLIC_WHATSAPP_NUMBER no está configurado o es inválido.");
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
