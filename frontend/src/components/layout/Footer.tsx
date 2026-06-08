/**
 * Minimal site-wide footer.
 *
 * Spanish, brand-quiet, no client interactivity. P5 will likely add
 * social links, JSON-LD `LocalBusiness` hooks, and supermarket list.
 */

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-foreground/10 mt-12 border-t">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 text-center sm:px-6">
        <p className="text-foreground/70 text-sm">
          Wayka — repostería, catering y productos congelados artesanales en Costa Rica.
        </p>
        <p className="text-foreground/50 mt-2 text-xs">
          © {year} Wayka. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
