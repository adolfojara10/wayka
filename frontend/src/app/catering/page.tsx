"use client";

/**
 * /catering — B2B event planner placeholder.
 *
 * The interactive calculator (event type × guest count → recommended
 * volume) is blocked on confirming serving ratios with the client.
 * Until then this page is a Spanish "Próximamente" with a direct
 * WhatsApp CTA so the B2B funnel still works.
 */

import { useState } from "react";

import { trackWhatsAppOrderClick } from "@/lib/analytics";
import { whatsappUrl, WhatsAppConfigError } from "@/lib/whatsapp";

const GENERIC_MESSAGE =
  "¡Hola Wayka! Estoy planificando un evento y me gustaría coordinar el catering. ¿Podemos conversar?";

export default function CateringPage() {
  const [error, setError] = useState<string | null>(null);
  let href: string | null = null;
  try {
    href = whatsappUrl(GENERIC_MESSAGE);
  } catch (err) {
    if (err instanceof WhatsAppConfigError && error === null) {
      // Defer setError to render-safe handler below; for now we just
      // skip the href and the button renders as disabled.
    }
  }

  const handleClick = () => {
    if (!href) {
      setError("El número de WhatsApp no está configurado. Avísanos por nuestras redes.");
      return;
    }
    trackWhatsAppOrderClick({
      source: "catering_calculator",
      item_count: 0,
      total_quantity: 0,
      category: "mixed",
      estimated_value_crc: 0,
    });
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Planifica tu evento con Wayka
        </h1>
        <p className="text-foreground/70 mt-3 max-w-2xl">
          Estamos preparando una calculadora para recomendarte el menú perfecto según el tipo de
          evento y la cantidad de invitados. Mientras tanto, escríbenos directamente por WhatsApp y
          armamos una cotización personalizada para ti.
        </p>
      </header>

      <div className="border-foreground/10 bg-background rounded-2xl border p-6 shadow-sm">
        <p className="text-foreground/80">
          Contamos con menús para eventos corporativos, cumpleaños y reuniones familiares — desde
          pequeñas cajitas degustación hasta servicios de catering completo.
        </p>

        {error && (
          <p role="alert" className="bg-wine/10 text-wine mt-4 rounded-lg px-3 py-2 text-sm">
            {error}
          </p>
        )}

        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="bg-terracotta mt-6 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Coordinar mi evento por WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled
            onClick={handleClick}
            className="bg-terracotta mt-6 inline-flex cursor-not-allowed items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white opacity-50"
          >
            Coordinar mi evento por WhatsApp
          </button>
        )}
      </div>

      <p className="text-foreground/60 mt-6 text-xs">
        Estamos trabajando en la calculadora interactiva: define tipo de evento y cantidad de
        invitados, y te recomendaremos las cantidades ideales. Próximamente.
      </p>
    </section>
  );
}
