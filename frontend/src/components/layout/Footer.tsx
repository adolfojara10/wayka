/**
 * Server-rendered footer.
 *
 * When SiteSettings is configured, the footer renders the address,
 * primary phone, and opening hours so the home page has indexable
 * local-business content (good for CR local SEO before P5's full
 * JSON-LD takes hold). Falls back to a quiet brand line when the
 * singleton is not yet configured.
 */

import { getSiteSettings } from "@/lib/api";
import type { WeekdayHours, WeekdayNumber } from "@/lib/api-types";

const DAY_ORDER: WeekdayNumber[] = [0, 1, 2, 3, 4, 5, 6];

function formatTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5); // HH:MM
}

function hoursLine(hours: readonly WeekdayHours[]): string | null {
  if (hours.length === 0) return null;
  const byDay = new Map(hours.map((h) => [h.day, h] as const));
  const parts: string[] = [];
  for (const day of DAY_ORDER) {
    const h = byDay.get(day);
    if (!h) continue;
    if (!h.open_time || !h.close_time) {
      parts.push(`${h.day_label}: cerrado`);
    } else {
      parts.push(`${h.day_label}: ${formatTime(h.open_time)}–${formatTime(h.close_time)}`);
    }
  }
  return parts.join(" · ");
}

export async function Footer() {
  let site = null;
  try {
    site = await getSiteSettings();
  } catch {
    site = null;
  }
  const year = new Date().getFullYear();
  const businessName = site?.business_name ?? "Wayka";
  const hoursText = site ? hoursLine(site.hours) : null;

  return (
    <footer className="border-foreground/10 mt-12 border-t">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <p className="text-foreground/70 text-center text-sm">
          {businessName} — repostería, catering y productos congelados artesanales en Costa Rica.
        </p>

        {site && (
          <div className="text-foreground/60 mt-4 grid grid-cols-1 gap-2 text-center text-xs sm:grid-cols-3 sm:text-left">
            {(site.street_address || site.address_locality) && (
              <p>
                <span className="text-foreground/80 font-semibold">Dirección:</span>{" "}
                {[site.street_address, site.address_locality, site.address_region]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {site.primary_phone && (
              <p>
                <span className="text-foreground/80 font-semibold">Teléfono / WhatsApp:</span>{" "}
                <a
                  href={`tel:${site.primary_phone.replace(/[^+\d]/g, "")}`}
                  className="hover:text-terracotta focus-visible:underline focus-visible:outline-none"
                >
                  {site.primary_phone}
                </a>
              </p>
            )}
            {hoursText && (
              <p>
                <span className="text-foreground/80 font-semibold">Horario:</span> {hoursText}
              </p>
            )}
          </div>
        )}

        <p className="text-foreground/50 mt-4 text-center text-xs">
          © {year} {businessName}. Todos los derechos reservados.
        </p>
        <p className="text-foreground/50 mt-2 text-center text-xs">
          Usamos cookies para analizar el uso del sitio.
        </p>
      </div>
    </footer>
  );
}
