import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Phase 1 landing page.
 *
 * Deliberately minimal: brand wordmark + tagline + theme toggle.
 * Real navigation, hero imagery, catalog, and WhatsApp CTAs ship in
 * later phases.
 */
export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">Wayka</h1>
      <p className="text-foreground/70 mt-4 max-w-md text-base sm:text-lg">
        Repostería, catering y productos congelados artesanales — Costa Rica.
      </p>
      <p className="text-foreground/50 mt-8 text-xs tracking-[0.2em] uppercase">
        Sitio en construcción
      </p>
    </main>
  );
}
