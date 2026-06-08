/**
 * `/productos/<slug>` — server-rendered product detail.
 *
 * The Phase 3 SEO contract finally pays off here: this is where
 * `meta_description`, `alt_text`, and `slug` per-product become
 * actual indexable URLs with their own metadata + JSON-LD.
 *
 * Inactive products and unknown slugs trigger `notFound()`, which
 * delegates to `app/not-found.tsx` and lets Next emit
 * `<meta name="robots" content="noindex">` automatically (matching
 * the backend's hard-404 contract).
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ProductDetailClient } from "@/components/catalog/ProductDetailClient";
import { JsonLd } from "@/components/JsonLd";
import { getProduct } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/api-types";
import { buildBreadcrumbLd, buildProductLd } from "@/lib/jsonld";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function siteBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

function categoryHref(category: string): string {
  // Catalog tabs live at /<category>.
  return `/${category}`;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return {
      title: "Producto no encontrado — Wayka",
      robots: { index: false, follow: false },
    };
  }

  const description = product.meta_description?.trim() || product.description.slice(0, 160);

  return {
    title: `${product.name} — Wayka`,
    description,
    alternates: { canonical: `/productos/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      url: `/productos/${product.slug}`,
      images: product.image
        ? [{ url: product.image, alt: product.alt_text || product.name }]
        : undefined,
    },
    twitter: {
      title: product.name,
      description,
      card: "summary_large_image",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    // Hard 404 → noindex from Next, matches backend's inactive=404
    // SEO contract.
    notFound();
  }

  const categoryLabel = CATEGORY_LABELS[product.category];
  const breadcrumbs = [
    { name: "Inicio", href: "/" },
    { name: categoryLabel, href: categoryHref(product.category) },
    { name: product.name, href: `/productos/${product.slug}` },
  ];

  const site = siteBaseUrl();
  const productLd = buildProductLd(product, site);
  const breadcrumbLd = buildBreadcrumbLd(
    breadcrumbs.map((b) => ({ name: b.name, url: `${site}${b.href}` })),
  );

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
      <ProductDetailClient product={product} />
    </section>
  );
}
