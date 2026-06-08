/**
 * Spanish 404 page.
 *
 * Renders when `notFound()` is invoked from a server component or
 * generateMetadata, and as the fallback when no route matches. Next.js
 * injects `<meta name="robots" content="noindex" />` automatically.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada — Wayka",
};

export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <p className="text-foreground/60 text-xs tracking-[0.25em] uppercase">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        No encontramos esta página
      </h1>
      <p className="text-foreground/70 mt-4 max-w-md">
        Puede que el enlace haya cambiado o que el producto ya no esté disponible. Te invitamos a
        volver al inicio para descubrir nuestros antojos.
      </p>
      <Link
        href="/"
        className="bg-terracotta mt-8 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
