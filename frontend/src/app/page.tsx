/**
 * Home / landing — server component.
 *
 * Mobile-first hero with the brand bio (SEO-friendly Spanish copy) and
 * two crawlable navigation cards above the fold separating the **B2C
 * catalog** from the **B2B event planner**.
 *
 * Wires no analytics directly; the cards are plain `<Link>` elements
 * that prefetch their destination route and let the route's own
 * components emit events on interaction.
 */

import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
      {/* Hero ------------------------------------------------------ */}
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Wayka</h1>
        <p className="text-foreground/80 mx-auto mt-4 max-w-2xl text-base sm:text-lg">
          Repostería, catering y productos congelados <strong>artesanales</strong> en Costa Rica.
          Ingredientes frescos, recetas con alma y entregas coordinadas por WhatsApp.
        </p>
      </header>

      {/* B2C ↔ B2B split — both cards above the fold on a 390px viewport. */}
      <nav aria-label="Por dónde empezar" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/bocaditos"
          className="group border-foreground/10 bg-background focus-visible:ring-terracotta flex flex-col rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <p className="text-foreground/60 text-xs font-semibold tracking-widest uppercase">B2C</p>
          <h2 className="mt-2 text-2xl font-semibold">Ver el catálogo</h2>
          <p className="text-foreground/70 mt-2 text-sm">
            Bocaditos, dulces y pizzas listos para pedir. Añadilos a tu Bolsa de Antojos y
            coordinamos por WhatsApp.
          </p>
          <span className="text-terracotta mt-4 text-sm font-medium group-hover:underline">
            Explorar antojos →
          </span>
        </Link>

        <Link
          href="/catering"
          className="group border-foreground/10 bg-background focus-visible:ring-terracotta flex flex-col rounded-2xl border p-6 shadow-sm transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <p className="text-foreground/60 text-xs font-semibold tracking-widest uppercase">B2B</p>
          <h2 className="mt-2 text-2xl font-semibold">Planificar un evento</h2>
          <p className="text-foreground/70 mt-2 text-sm">
            Para cumpleaños, reuniones corporativas y eventos familiares — cotización personalizada
            por WhatsApp.
          </p>
          <span className="text-terracotta mt-4 text-sm font-medium group-hover:underline">
            Coordinar mi evento →
          </span>
        </Link>
      </nav>
    </section>
  );
}
