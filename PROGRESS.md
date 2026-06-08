# PROGRESS.md — Project Wayka

A running log of completed work. **Newest entries at the top.** Every
agent must append a new entry after finishing a unit of work (see
`AGENTS.md` §10).

Entry template:

```md
## YYYY-MM-DD — <short title> (`<commit-sha>` · phase: PX)

**Shipped**
- bullet list of what changed

**Verified**
- bullet list of what was tested (link to `TESTING_CHECKLIST.md` items)

**Deferred / known issues**
- bullet list, or "none"

**Next**
- one-line recommendation for the user / next agent
```

---

## 2026-06-08 — Phase 5: SEO hardening, analytics, launch readiness (uncommitted · phase: P5)

**Shipped**

Backend — new `SiteSettings` singleton + structured opening hours
- `core/models.py` — `SiteSettings` singleton (pk-clamped + admin-
  gated; one row max) holding business identity (name, phone, email,
  address, geo, social URLs). `WeekdayHours` related model — one
  row per weekday with structured `open_time` / `close_time` or
  both-null (closed). Validation: close > open; both fields go
  together.
- `core/admin.py` — `SiteSettingsAdmin` with `WeekdayHoursInline`,
  Spanish fieldsets, `has_add_permission` clamped to no-add-when-
  exists, `has_delete_permission=False` so the client can never
  accidentally wipe the singleton.
- `core/serializers.py` — new file with `WeekdayHoursSerializer`
  (nested) + `SiteSettingsSerializer`.
- `core/views.py` — new `SiteSettingsView` (read-only, returns 404
  when singleton not configured so the frontend degrades silently).
  Adds the same `PublicReadOnlyMixin` from `catalog/views.py`
  (Cache-Control on 2xx only).
- `core/urls.py` — `GET /api/site/`.
- `core/migrations/0001_initial.py` (creates SiteSettings +
  WeekdayHours).
- `core/fixtures/sample_site.json` — singleton + 7 weekday rows
  (Lun–Vie 9–18, Sáb 10–14, Dom cerrado).
- `core/tests.py` — extended from 2 to 17 tests (singleton enforcement,
  WeekdayHours validation, /api/site/ 200/404, headers, fixture
  loads).

Frontend — SEO files
- `app/sitemap.ts` — runtime sitemap. Static routes always shipped;
  product slugs come from `getProducts()` (so inactive products are
  excluded by the backend's `.visible()` filter). Gracefully ships
  static-only when the API is down.
- `app/robots.ts` — allow `/`, disallow `/api/`, point at sitemap.
- `app/opengraph-image.png` — 1200×630 default OG card, generated
  once via `scripts/build_og_image.mjs` (sharp composite of the
  Wayka color logo on a cream canvas). Auto-picked up by Next 16's
  file-convention metadata.
- `app/opengraph-image.alt.txt` — Spanish alt text.

Frontend — product detail route (the SEO payoff from P3)
- `app/productos/[slug]/page.tsx` — server component, awaits
  `params: Promise<{ slug: string }>`, calls `getProduct()` and
  `notFound()` on null. Emits Breadcrumbs (visual) + `<JsonLd>`
  blocks for both `Product` and `BreadcrumbList`.
- `app/productos/[slug]/loading.tsx` — quiet skeleton.
- `app/productos/[slug]/page.tsx::generateMetadata` — dynamic title,
  description (from `meta_description` with fallback), canonical,
  OG image override.
- New `components/catalog/ProductDetailClient.tsx` — owns variant
  selection + cart-write CTAs; reuses `SizeSelector` and `StatusBadge`.
- New `components/layout/Breadcrumbs.tsx` — visual breadcrumb trail
  (matching the JSON-LD `BreadcrumbList`).

Frontend — JSON-LD
- `lib/jsonld.ts` — `buildLocalBusinessLd` (FoodEstablishment with
  address, telephone, geo, sameAs, openingHoursSpecification per
  weekday), `buildProductLd` (Product with offers in CRC, availability
  mapped to Schema.org enum from the backend, single-offer flattening
  when there's one variant), `buildBreadcrumbLd` (1-indexed
  ListItems).
- `components/JsonLd.tsx` — server-side `<script type="application/
  ld+json">` emitter with `<` escaping.
- Root `layout.tsx` — fetches `getSiteSettings()` once at render
  time; emits `<JsonLd data={buildLocalBusinessLd(site, SITE_URL)}>`
  at the top of `<body>` when configured.

Frontend — metadata polish
- Root `layout.tsx`: `metadataBase: new URL(NEXT_PUBLIC_SITE_URL)`,
  `title.template: "%s — Wayka"`, `openGraph` defaults (siteName,
  `locale: "es_CR"`, type), `twitter.card: "summary_large_image"`,
  `alternates.canonical: "/"`, `robots: { index: true, follow: true }`,
  conditional `verification.google` from `NEXT_PUBLIC_GSC_VERIFICATION`.

Frontend — analytics
- `pnpm add @next/third-parties` — official Google component
  package, perf-optimized loading.
- Root `layout.tsx` conditionally renders `<GoogleAnalytics
  gaId={GA4_ID}>` only when `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set.
- `components/analytics/Clarity.tsx` — gated on
  `NEXT_PUBLIC_CLARITY_PROJECT_ID`; `next/script` with
  `strategy="lazyOnload"`.
- `components/analytics/MetaPixel.tsx` — **intentionally disabled**
  placeholder (returns `null` even when env var is set). File header
  documents the activation checklist for when Meta ads launch.
- `components/analytics/WebVitalsReporter.tsx` — `useReportWebVitals`
  forwards every LCP/CLS/INP/FCP/TTFB through the existing
  `recordWebVital()` helper in `lib/analytics.ts`.
- `lib/analytics.ts` — added `recordWebVital` + extended
  `ThemeToggleParams` to include `"system"`.
- `components/ThemeToggle.tsx` — fires `trackThemeToggle({ to_theme:
  next })` on click (the P4-deferred wiring).

Frontend — image rendering + footer
- `next.config.ts` — `images.remotePatterns` built from
  `NEXT_PUBLIC_API_URL` so `<Image>` can load Django `/media/` URLs.
- `ProductCard.tsx` — wraps image area in a `<Link>` to the new
  detail page; renders `<Image fill loading="lazy">` with
  `alt={alt_text || name}` when `image` is set; shows a quiet
  placeholder div when null.
- `Footer.tsx` — now a server component; fetches `getSiteSettings()`
  and renders address + phone + opening hours when configured.
  Falls back gracefully to the brand-only line when the singleton
  isn't set. Adds a single-line Spanish cookie disclosure.

Frontend — logo SVG into header
- Copied 2 logo variants from `docs/svg/Logo png sin fondo/` into
  `public/brand/` (`wayka-wordmark-on-light.svg` = wine variant for
  light mode, `wayka-wordmark-on-dark.svg` = cream variant for dark
  mode).
- `Header.tsx` — uses `next/image priority` with both variants;
  Tailwind `dark:hidden` / `hidden dark:block` swap. Same width/
  height on both so theme swap is zero layout shift.

Frontend — Lighthouse
- `pnpm add -D lighthouse@13`.
- `lighthouse:home` + `lighthouse:bocaditos` scripts in package.json.
- `.gitignore` excludes `frontend/lighthouse-*.html`.
- One-shot local run (against `pnpm start -p 3001`, headless Chrome):
  - `/` — Performance 93, Accessibility 96, Best Practices 100,
    SEO 100.
  - `/bocaditos` — Performance 88, Accessibility 94, Best Practices
    100, SEO 100.

Tests — 35 new (105+ total: 77 backend + 87 frontend, all green)
- Backend `core/tests.py` (+15 tests): singleton clamp, load helper,
  admin add-after-exists is 403, admin delete button absent,
  WeekdayHours unique constraint + mixed-null + close<open
  validation + closed-day acceptance, /api/site/ 200+404 + headers,
  fixture loads 1 settings + 7 hours.
- Frontend `app/__tests__/sitemap.test.ts` (5): static routes,
  product entries, inactive excluded, API-down fallback, env-var
  prefix.
- Frontend `app/__tests__/robots.test.ts` (3): allow+disallow rules,
  sitemap URL, trailing-slash normalization.
- Frontend `lib/__tests__/jsonld.test.ts` (8): LocalBusiness shape +
  openingHoursSpecification + optional fields; Product with offers
  + CRC currency + Schema.org availability + single-variant
  flattening + unavailable-variant exclusion; BreadcrumbList
  positions.
- Frontend `components/analytics/__tests__/MetaPixel.test.tsx` (3):
  no script with or without env var, no facebook.net src.
- Frontend `components/analytics/__tests__/Clarity.test.tsx` (2):
  no render when blank, script content interpolates project ID.
- Frontend `app/__tests__/metadata.test.ts` (4): root layout
  metadata shape, unique category titles, productDetail
  generateMetadata happy + missing + fallback paths.
- Frontend `app/__tests__/headings.test.ts` (dynamic): one test per
  `page.tsx` file asserting exactly one `<h1>`.
- Frontend `components/__tests__/ThemeToggle.test.tsx` (+1): clicking
  fires `trackThemeToggle({ to_theme: "dark" })` on light→dark.
- Frontend `components/catalog/__tests__/ProductCard.test.tsx` (+3):
  renders `<Image>` with alt_text when image is set, shows
  placeholder when null, falls back to name when alt_text blank.

Documentation
- `.env.example` — added `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_GSC_VERIFICATION`, `NEXT_PUBLIC_META_PIXEL_ID`.
- `README.md` — new "SEO & Analytics" section with route table,
  analytics wiring summary, manual launch checklist, local
  Lighthouse instructions + recorded scores. API table gains
  `/api/site/`.
- `PROGRESS.md` — this entry.
- `TESTING_CHECKLIST.md` — new sections `A.7` (SiteSettings backend)
  and `B.9` (frontend SEO + analytics).
- `AGENTS.md §8` — Live status bumped: P4 marked complete with
  SHA; P5 implemented, awaits sign-off.

**Verified**

Backend (`backend/`):
- `ruff check .` clean.
- `black --check .` clean.
- `python manage.py check` — 0 issues.
- `python manage.py makemigrations --check --dry-run` — no changes.
- `python manage.py test` — **77/77 in ~1.7s** (62 from P1–P3 + 15
  new core).
- Live: `loaddata sample_site` loads 8 objects; `GET /api/site/`
  returns the singleton with nested hours, Content-Language es-CR,
  Cache-Control headers correct.

Frontend (`frontend/`):
- `pnpm lint` clean.
- `pnpm format:check` clean.
- `pnpm test:ci` — **72/72 in ~4.2s** (36 from P4 + 36 new).
- `pnpm build` succeeds; 10 routes generated.
- Live SSR smoke (`pnpm start -p 3001`):
  - `/sitemap.xml` returns valid XML with home + 3 categories +
    catering + all 8 visible product slugs.
  - `/robots.txt` returns the expected rules.
  - `/productos/pizza-margarita-artesanal` emits 3 JSON-LD blocks
    (FoodEstablishment + Product with CRC offers + BreadcrumbList).
  - `/productos/producto-archivado-de-prueba` (inactive) renders
    the "Producto no encontrado" UI with
    `<meta name="robots" content="noindex, nofollow">` (Next 16
    streams the not-found UI under HTTP 200 for dynamic routes —
    the meta tag is what de-indexes the URL).
  - `/productos/totally-fake-slug` (unknown) — same noindex
    behavior.
  - `/does-not-exist` (no dynamic match) — HTTP 404.
  - Home OG meta tags include site name "Wayka", locale es_CR,
    OG image at `/opengraph-image.png?...`.
  - LocalBusiness JSON-LD embedded in the body with address, geo,
    telephone, opening hours for 6 days (Sunday closed → omitted).
- Lighthouse (lab, headless): home 93/96/100/100,
  /bocaditos 88/94/100/100.

**Deferred / known issues**

- **HTTP 404 status code for dynamic-route `notFound()`** — Next 16
  streams the not-found UI under HTTP 200 instead of returning a
  hard 404 status. The `<meta name="robots" content="noindex,
  nofollow">` and `<title>Producto no encontrado>` are emitted in
  the HTML so Googlebot de-indexes correctly. To get a real HTTP
  404, future work could split the route into a synchronous
  prerender path. Acceptable for v1.
- **Real GSC verification + sitemap submission** — both require a
  deployed domain; the meta tag is wired and ready.
- **Real GA4 data + Microsoft Clarity heatmaps** — both require
  deployed env vars + traffic.
- **Catering calculator** — still blocked on client serving ratios
  (deferred from P4). `/catering` placeholder + WhatsApp CTA still
  ship.
- **Lighthouse Performance < 100 locally** — production CDN +
  proper TTFB will lift the score; the lab number is acceptable.
- **`LICENSE` file** — still unresolved.
- **Production deploy (Vercel + Railway/Render, managed Postgres,
  cloud media storage)** — that's the master prompt §7 "deferred"
  bucket; not in P5 scope.

**Next**

- Phase 5 complete from this agent's side. **All five phases of the
  master prompt are now implemented.** Awaits user sign-off on P5
  before declaring the project launch-ready.
- After sign-off, the deferred items above can land as small
  focused PRs (catering calculator, LICENSE, deployment infra).

---

## 2026-06-08 — Phase 4: frontend catalog, cart, WhatsApp funnel (`7666f3c` · phase: P4)

**Shipped**

Routes (Next.js 16 App Router):
- `/` — server-rendered home with the brand hero + two crawlable
  navigation cards (B2C catalog vs B2B event planner), both above the
  fold on a 390px viewport.
- `/(catalog)/bocaditos`, `/sweets`, `/pizzas` — three real,
  server-rendered category routes inside an unnamed route group so
  the URLs stay short. Shared layout renders the `<CategoryTabs>`
  once; tabs are `<Link>` components so Next prefetches sibling
  routes and Googlebot sees three independent URLs.
- Each category route has its own `loading.tsx` with a 6-card
  skeleton (no layout shift when content arrives).
- `/catering` — B2B placeholder. Calculator is deferred pending
  client ratios; a direct WhatsApp CTA keeps the funnel alive.
- `/not-found` — Spanish 404 (Next.js auto-injects
  `<meta name="robots" content="noindex">`).
- `dynamic = "force-dynamic"` on the three category routes so the
  build doesn't try to prerender against the dev Django host.
  Framework caching still kicks in via `next: { revalidate: 60 }`.

Libraries (`frontend/src/lib/`):
- `api-types.ts` — TS types mirroring the P3 serializers exactly
  (Product, ProductVariant, Supermarket, status / category /
  availability unions), plus `CATEGORY_LABELS` + `CATEGORIES`.
- `api.ts` — server-side fetch wrappers (`getProducts`,
  `getProduct`, `getSupermarkets`). `next: { revalidate: 60, tags:
  ["catalog"] }` so P5 can bust the cache with one
  `revalidateTag`. `getProduct` returns `null` on 404 so pages can
  call `notFound()` cleanly.
- `analytics.ts` — typed, centralized `track*` API matching the
  master-prompt §8 spec literally. In dev / pre-GA4 wiring events
  go to a bounded in-memory ring buffer (testable via
  `__getRecordedEvents`). When `NEXT_PUBLIC_GA4_MEASUREMENT_ID` is
  set, calls `window.gtag` (no-op if the script hasn't loaded).
  **No component calls `gtag` directly.**
- `whatsapp.ts` — `buildCartMessage`, `buildCateringMessage`,
  `whatsappUrl`. Throws a typed `WhatsAppConfigError` when the
  number env var is missing so callers can render a friendly
  disabled state.
- `format.ts` — `formatCrc` for client-side totals (mirrors the
  Python `format_crc` exactly: NBSP separators, ROUND_HALF_UP).

Components (`frontend/src/components/`):
- `cart/AntojoCartProvider.tsx` — context + reducer + sessionStorage
  hydration under `wayka-cart-v1`. One line per (slug, variantId).
  Fires `trackAddToAntojos` on add, `trackRemoveFromAntojos` on
  remove / qty→0, `trackOpenCart` on open. Open-source is captured
  via a `useRef` so the analytics fire after the dispatch flushes
  (fixed a closure-staleness bug where "Pedir Ya" reported
  `item_count=0`).
- `cart/AntojoCartTrigger.tsx` — header button with item-count
  badge, opens with `source="manual"`.
- `cart/AntojoCartDrawer.tsx` — right-side framer-motion drawer,
  theme-aware. Conversational Spanish copy ("Te estás llevando un
  excelente combo..."). Builds the WhatsApp URL with
  `buildCartMessage` + `whatsappUrl`; final CTA fires
  `trackWhatsAppOrderClick` with `source: "antojo_cart"` and the
  aggregated `item_count` / `total_quantity` / `category` /
  `estimated_value_crc`. Disabled CTA on empty cart;
  friendly error when WhatsApp env var missing.
- `cart/CartLineItem.tsx` — qty +/- controls + Quitar.
- `catalog/StatusBadge.tsx` — "Próximamente" / "Agotado" pills with
  brand-token colors (wine / olive on cream — both AA per
  `docs/contrast.md`).
- `catalog/SizeSelector.tsx` — radio group, per-variant
  `is_available` respected (`aria-disabled`, `line-through`,
  disabled `<input>`). Fires `trackSelectVariant` on change.
- `catalog/ProductCard.tsx` — state-aware. `active` shows both CTAs
  ("Pedir Ya" + "Añadir a mis antojos"); non-orderable hides both.
  Size selector visibility uses the backend's server-computed
  `has_multiple_variants` (frontend never re-derives the rule).
  CTAs disabled if the currently-selected variant becomes
  unavailable.
- `catalog/CategoryGrid.tsx` — server-side presentational grid.
- `catalog/CategoryLoadingSkeleton.tsx` — shimmer placeholder.
- `layout/Header.tsx` — sticky header with wordmark (text for now,
  SVG wiring still deferred per checklist B.7), cart trigger, theme
  toggle.
- `layout/Footer.tsx` — minimal Spanish footer.
- `layout/CategoryTabs.tsx` — `<Link>`-based tabs highlighting the
  active route via `usePathname()`.

Root layout (`app/layout.tsx`) now wraps children in
`<AntojoCartProvider>`, renders `<Header>` + `<Footer>`, and mounts
the `<AntojoCartDrawer>` once. All theme behavior from P1 preserved.

Tests — 31 new (36 total frontend tests, 2.6s)
- `lib/__tests__/analytics.test.ts` (5): every track helper exports
  with stable signatures; SSR-safe no-op; in-memory recording when
  GA4 id empty; `gtag` called with the right shape when configured;
  doesn't throw when `window.gtag` is missing.
- `lib/__tests__/whatsapp.test.ts` (9): cart message matches the
  spec quote (with the agreed with-parens divergence); always
  includes parens for single-variant items; empty cart produces
  valid greeting+closing; `whatsappUrl` strips non-digits + encodes
  newlines as `%0A`; throws `WhatsAppConfigError` on missing /
  invalid env var; catering builder includes event type + guest
  count + total + breakdown + closing question.
- `components/cart/__tests__/AntojoCartProvider.test.tsx` (8):
  same product+variant added twice → one line, qty=2;
  `updateQty(0)` removes + fires `trackRemoveFromAntojos`;
  `clearCart` empties state AND clears sessionStorage;
  `dominantCategory` derives correctly (single category vs
  multi → `"mixed"`); `open("pedir_ya")` fires `trackOpenCart`
  with correct source + post-add item count; hydrates from
  sessionStorage; ignores corrupted sessionStorage gracefully;
  throws helpful error when used outside provider.
- `components/cart/__tests__/AntojoCartDrawer.test.tsx` (2):
  WhatsApp URL built from cart matches spec char-for-char (decoded
  from `%0A`); `trackWhatsAppOrderClick` fires with
  `source: "antojo_cart"` + correct aggregates; empty cart shows
  conversational copy + disabled CTA.
- `components/catalog/__tests__/ProductCard.test.tsx` (7): active
  shows both CTAs no badge; coming_soon hides CTAs + shows
  "Próximamente"; sold_out hides CTAs + shows "Agotado"; single-
  variant hides selector + shows inline price; multi-variant
  shows selector + fires `trackSelectVariant`; unavailable variant
  is `aria-disabled`; "Pedir Ya" adds + fires `trackOpenCart` with
  source=pedir_ya + correct count.
- Existing 5 ThemeToggle tests untouched (theme behavior unchanged).

**Verified**

Frontend (run from `frontend/`):
- `pnpm lint` clean (ESLint).
- `pnpm format:check` clean (Prettier + tailwind plugin).
- `pnpm test:ci` — **36/36 in 2.6s**.
- `pnpm build` succeeds (Next.js 16 + Turbopack); 6 routes generated
  (`/`, `/_not-found`, `/catering` static; `/bocaditos`, `/sweets`,
  `/pizzas` dynamic).

Live (`backend runserver` + `pnpm start -p 3001`):
- `GET /` returns SSR HTML with `<title>Wayka — Repostería y
  catering artesanal</title>` and both navigation cards rendered.
- `GET /pizzas` returns SSR HTML with both pizza product names
  inline — `<h3>Pizza Margarita Artesanal</h3>` and
  `<h3>Pizza Cuatro Quesos</h3>` are in the initial document so
  Googlebot sees them on first crawl.
- `GET /catering` returns the placeholder page with the WhatsApp
  CTA copy.
- `GET /does-not-exist` returns `404 Not Found`.
- Backend `/api/health/` still 200 (P3 contract preserved).

**Deferred / known issues**

- **Catering calculator** — `/catering` ships as a Spanish
  placeholder with a WhatsApp CTA. The interactive calculator
  (event type × guest count → recommended pieces + structured
  WhatsApp message) is blocked on the client confirming serving
  ratios. Lands as a self-contained patch later.
- **`trackThemeToggle` wiring** — the analytics utility exposes the
  helper but `ThemeToggle.tsx` is not modified in P4 (deferred per
  user decision; lands in P5).
- **GA4 + Microsoft Clarity + Meta Pixel placeholder + Google
  Search Console + sitemap.ts + robots.ts + full JSON-LD + OG image
  generation** — all P5 scope.
- **Logo asset wiring** — header still uses a text wordmark; the
  SVG twins under `docs/svg/` are not wired into `frontend/public/`
  (still deferred per `TESTING_CHECKLIST.md` §B.7).
- **No CORS rejection test on the live API** — the call goes
  server-to-server in SSR so CORS does not gate it; client-side
  fetches are out of P4 scope.
- `LICENSE` file still unresolved.

**Next**

- Phase 4 complete from this agent's side. Awaits user sign-off
  before P5 (SEO hardening, analytics wiring, sitemap, robots,
  JSON-LD, OG, Search Console, Lighthouse pass).
- After P5 the deferred items above can land as small focused PRs.

---

## 2026-06-08 — Phase 3: public catalog API + OpenAPI docs (`9f331ee` · phase: P3)

**Shipped**

API endpoints (`backend/catalog/urls.py`, mounted under `/api/`):
- `GET /api/products/` — list of visible products (excludes
  `inactive`). `?category=` filter validated against the
  `Category` enum. Sort order driven by P2's
  `Product.objects.visible().ordered_for_display()` plus
  `prefetch_related("variants")` (N+1 guard test enforces ≤5
  queries). No pagination.
- `GET /api/products/<slug>/` — single product. **Inactive products
  and unknown slugs return 404** so the Next.js `notFound()` handler
  can emit a hard 404 to Googlebot (the SEO-critical contract for
  removed products).
- `GET /api/supermarkets/` — `is_active=True` only, ordered by
  `display_order, name`.
- `GET /api/schema/` — auto-generated OpenAPI 3 (YAML).
- `GET /api/docs/` (Swagger UI), `GET /api/redoc/` — interactive
  docs. Both wired via drf-spectacular.

Serializers (`backend/catalog/serializers.py`):
- `ProductListSerializer` exposes everything a downstream JSON-LD /
  OpenGraph emitter could need: `slug`, `name`, `description`,
  `category`, `status`, `is_featured`, **`is_orderable`** (computed),
  **`has_multiple_variants`**, **`availability`** (Schema.org enum
  derived from `status`: ACTIVE→`InStock`, COMING_SOON→`PreOrder`,
  SOLD_OUT→`OutOfStock`, INACTIVE→`Discontinued`), absolute `image`
  URL or `null`, `meta_description`, `alt_text`, nested
  `variants`, `default_variant_id`, `updated_at`.
- `ProductVariantSerializer` returns prices in **two shapes**:
  numeric `price` (for cart math + JSON-LD `offers.price`) and
  formatted `price_crc` (for direct rendering, e.g. `"₡ 7 500"`
  with non-breaking spaces, ROUND_HALF_UP).
- `ProductDetailSerializer` subclasses list today; held as a
  separate class so P4/P5 can add detail-only fields without
  breaking the list contract.
- `SupermarketSerializer` — id, name, address, province, canton,
  optional lat/long. `is_active` filtered at view layer, never
  exposed.

SEO-friendly response shaping (`backend/catalog/views.py`):
- `PublicReadOnlyMixin` stamps every 2xx with
  `Cache-Control: public, max-age=60, s-maxage=300` and
  `Vary: Accept-Language`. **Does NOT stamp** these headers on 4xx
  so CDNs can't cache a missing-resource response and serve it to
  other visitors (regression-tested).
- `core/middleware.py::ContentLanguageMiddleware` stamps every
  response (admin, API, docs) with `Content-Language: es-CR`.

Configuration:
- Added `django-filter~=24.3` and `drf-spectacular~=0.27` to
  `requirements.txt`. Both registered in `INSTALLED_APPS`.
- `REST_FRAMEWORK` extended with `DEFAULT_FILTER_BACKENDS`,
  `DEFAULT_PERMISSION_CLASSES = [AllowAny]` (read-only public API),
  and `DEFAULT_SCHEMA_CLASS = drf_spectacular.openapi.AutoSchema`.
- New `SPECTACULAR_SETTINGS` block with Spanish title /
  description, version `1.0.0`.
- `core/views.py::HealthCheckView` got an `@extend_schema`
  decorator so the OpenAPI schema documents it too.

Tests — 36 new (62 total backend tests, 0.92s)
- `tests/test_api.py` (24): list returns 200 + JSON; inactive
  excluded from list; `?category=pizzas` filter; bad category → 400
  with structured DRF error; ordering matches the P2 rule;
  `Content-Language` + `Cache-Control` + `Vary` headers correct;
  payload includes every required SEO field; variants nested in
  display_order; numeric+formatted price; `is_orderable` truth
  table; `availability` Schema.org mapping; `image=null` when no
  upload; `has_multiple_variants` flag; N+1 guard (≤5 queries even
  after adding 5 more products); detail returns active product;
  `coming_soon` + `sold_out` still reachable; **inactive → 404**;
  unknown slug → 404; 404 does NOT leak `s-maxage=300` cache header;
  supermarkets ordered + filtered by `is_active`; schema endpoint
  returns OpenAPI YAML mentioning all 3 routes.
- `tests/test_serializers.py` (12): `format_crc` NBSP separator,
  ROUND_HALF_UP rounding, zero handling; variant shape; numeric +
  string price versions; product SEO fields all present;
  meta_description / alt_text pass-through; variants in
  display_order; `default_variant_id` points to marked default;
  image null when absent; `is_orderable` per-status truth table;
  `availability` mapping exhaustive across all 4 statuses; detail
  subclasses list with identical field set.

Documentation:
- `README.md` — new "API" section listing every endpoint, response
  conventions (Content-Language, prices, availability,
  is_orderable, Cache-Control, 404 contract), and curl examples.
- `PROGRESS.md` — this entry.
- `TESTING_CHECKLIST.md` — new section A.6 with auto-ticked items
  plus a manual SEO/curl checklist.
- `AGENTS.md` §8 — Live status bumped to "P3 implemented, awaits
  sign-off; P4 next".

**Verified**

Backend (run from `backend/`):
- `ruff check .` clean (1 auto-fix applied to test import order).
- `black --check .` clean (3 files reformatted after edits).
- `python manage.py check` — 0 issues.
- `python manage.py makemigrations --check --dry-run` — no model
  changes; no new migrations.
- `python manage.py test` — **62/62 pass** in 0.92s.

Live (`runserver 8765`):
- `GET /api/health/` → 200 with `Content-Language: es-CR`. (P1
  contract preserved.)
- `GET /api/products/` → 200, `Cache-Control: public, max-age=60,
  s-maxage=300`, `Vary: Accept-Language`, ordering matches the
  expected sequence (featured-active 1-3, non-featured-active 4-6,
  `coming_soon` 7, `sold_out` 8). Inactive product never appears.
- `GET /api/products/?category=pizzas` → 2 pizzas, full variants
  serialized with `price_crc` formatted as `₡ 7 500`.
- `GET /api/products/pie-de-limon/` → 200.
- `GET /api/products/producto-archivado-de-prueba/` → **404** (the
  SEO-critical case).
- `GET /api/products/nope-no-existe/` → 404.
- `GET /api/supermarkets/` → only the 2 active rows (inactive
  filtered).
- `GET /api/schema/` → OpenAPI YAML with all 3 catalog endpoints.
- `GET /api/docs/` → Swagger UI HTML (200).

**Deferred / known issues**

- **All Next.js / HTML-side SEO** stays in Phase 5: `sitemap.ts`,
  `robots.ts`, JSON-LD emission, OpenGraph / Twitter cards, GA4,
  Microsoft Clarity, Meta Pixel placeholder, Google Search Console
  verification, Lighthouse / Core Web Vitals tuning. P3 only sets up
  the data shape these consumers will need.
- No write/auth endpoints (out of P3 scope; admin still owns
  writes).
- No throttling, search, or pagination (catalog is small; revisit if
  it ever exceeds ~50 items).
- DRF emits `Vary: Accept-Language, origin` (note lowercase
  "origin" courtesy of `django-cors-headers`); this is correct but
  worth flagging when we move to a CDN.
- `LICENSE` file still unresolved.

**Next**

- Phase 3 complete from this agent's side. Awaits user sign-off
  before P4 (Next.js frontend — catalog tabs, product cards,
  Antojo Cart, WhatsApp redirect, B2B calculator).
- P4 will consume `/api/products/`, `/api/products/<slug>/`, and
  `/api/supermarkets/` from server components, using the
  `availability` and `is_orderable` flags exactly as serialized
  (no re-derivation on the frontend).
- P5 will consume the same payloads for `sitemap.ts` (visible
  slugs + `updated_at`) and JSON-LD (`name`, `description`,
  numeric `price`, `availability`, absolute `image`).

---

## 2026-06-08 — Phase 2: catalog models, admin, fixtures, tests (`8d6c366` · phase: P2)

**Shipped**

New Django app: `catalog/`.

Models (`catalog/models.py`)
- `Product` — name, slug (auto-generated + collision-resolved),
  description, `Category` choices (`bocaditos` / `sweets` /
  `pizzas`), `Status` choices (`active` / `coming_soon` / `sold_out`
  / `inactive`) with Spanish display labels, `display_order`,
  `is_featured`, `image` (`ImageField`, requires Pillow),
  `meta_description`, `alt_text`, audit timestamps. Derived
  properties: `is_orderable`, `has_multiple_variants`,
  `default_variant` (resilient — falls back to first-by-order when
  zero or many `is_default` rows exist).
- `ProductVariant` — FK to Product (`related_name="variants"`),
  `name`, `price` (Decimal in CRC ₡), `is_default`, `is_available`
  (per-variant availability), `display_order`. DB-level
  `UniqueConstraint("product", "name")` so the same variant name
  cannot exist twice under one product.
- `Supermarket` — name, address, province, canton, optional
  lat/long, `display_order`, `is_active`, audit timestamps.

Manager / queryset (`catalog/managers.py`)
- `Product.objects.visible()` excludes `INACTIVE`.
- `.for_category(<slug>)` filters by category.
- `.ordered_for_display()` encodes the canonical P2 sort rule
  (featured active → non-featured active → unavailable bucket → ties
  broken by `display_order`, then `name`). One SQL query via
  `Case`/`When` annotations.

Admin (`catalog/admin.py`)
- `ProductAdmin` (SortableAdminMixin) — Spanish fieldsets, colored
  status badges, `list_editable` for `is_featured`,
  `prepopulated_fields={"slug": ("name",)}`, drag-and-drop
  reordering via `django-admin-sortable2`. Inline editing of
  `ProductVariant` rows. Site-wide Spanish admin branding (`site_header`,
  `site_title`, `index_title`).
- `ProductVariantInlineFormSet` — custom formset that rejects
  saving a product with more than one variant marked
  `is_default=True` (per the "form-level only" decision from the
  plan).
- `SupermarketAdmin` (SortableAdminMixin) — analogous.

Fixtures (`catalog/fixtures/sample_catalog.json`)
- 9 products spanning every category and every status (including
  one `inactive` to prove the visible() filter works).
- 15 variants: products with 1, 2, and 3 variants; one variant
  flagged `is_available=False` to demonstrate per-variant gating.
- 2 supermarkets (San José + Heredia).

Dependencies
- Added `Pillow~=11.0` (required by `ImageField`).
- Added `django-admin-sortable2~=2.2` (resolved to 2.3.1).
- Registered `"adminsortable2"` before `django.contrib.admin` in
  `INSTALLED_APPS`; registered `"catalog"`.

Migration
- `catalog/migrations/0001_initial.py` (3 models, 1 composite index
  on `(category, status)`, 1 index on `province`, 1
  `UniqueConstraint` on `(product, name)`).

Tests — `catalog/tests/`
- `test_models.py` (13 tests): slug auto-gen + collision-resolution
  + preservation + Spanish-char normalization; `Status` & `Category`
  enum values match spec; `is_orderable` truth table; variant
  `__str__`; unique-name-per-product constraint; same-name OK across
  products; `default_variant` returns marked default; falls back to
  first-by-order when none flagged; returns `None` for variant-less
  product; `Supermarket` accepts optional coordinates blank.
- `test_business_rules.py` (5 tests): `visible()` excludes
  `INACTIVE` only; ordering rule — unavailable items sink even when
  featured; featured-within-active ordering; name tiebreaker after
  `display_order`; `for_category` composes correctly with ordering;
  `has_multiple_variants` boundary conditions (0 / 1 / 2 / back to 1).
- `test_admin.py` (4 tests): anonymous → redirect to login; staff
  can list products (Spanish "Activo" label renders); save product
  with 2 inline variants → 302 + DB state correct; submitting two
  default variants → 200 + Spanish error message + nothing
  persisted.

**Verified**

Backend (run from `backend/`)
- `ruff check .` clean.
- `black --check .` clean.
- `python manage.py check` — 0 issues.
- `python manage.py makemigrations --check --dry-run` — no changes.
- `python manage.py test` — **26/26 tests pass** (24 new catalog +
  2 existing core), 0.80s.
- `python manage.py loaddata sample_catalog` — installed 26
  objects.
- Live: `runserver` → `GET /api/health/` still returns 200 with the
  P1 payload. `/admin/` and `/admin/catalog/product/` 302 to
  `/admin/login/` as expected.
- Live: queryset spot-check — `Product.objects.visible().for_category("pizzas").ordered_for_display()`
  returns the featured pizza first; the `inactive` fixture product
  never appears.

**Deferred / known issues**

- DRF serializers + endpoints (`GET /api/products/`,
  `GET /api/products/<slug>/`, `GET /api/supermarkets/`) — that's the
  explicit Phase 3 deliverable per the master prompt.
- Frontend rendering of any of this — Phase 4.
- No `LICENSE` file yet — unchanged.
- Admin drag-and-drop reordering renders the order column as a
  hidden input; the inline still exposes `display_order` as an
  editable integer fallback. Manual verification of the JS
  drag-and-drop behavior is on the new
  `TESTING_CHECKLIST.md` §A.5 list.
- Test discovery only finds the suite when CWD is `backend/`
  (existing P1 quirk — CI's `working-directory: backend` already
  handles this).

**Next**

- Phase 2 complete from this agent's side. Awaits user sign-off
  before P3 (DRF serializers + public endpoints).
- After sign-off, P3 will compose the new
  `Product.objects.visible().for_category(...).ordered_for_display()`
  helpers into the serializer layer rather than re-deriving the
  rule in views.

---

## 2026-06-08 — SVG twins for every brand asset (`107d936` · phase: P1)

**Shipped**

- New `docs/svg/` tree mirrors the existing PNG folders. Every PNG now
  has two SVG companions: a readable `<name>.svg` and a minified
  `<name>.min.svg` for shipping.
  - `docs/svg/variaciones de color en png/` — 16 lossless vector
    extractions from the Illustrator source (the `.ai` and proof
    `.pdf` are both PDF, so each color variant is one page).
  - `docs/svg/Logo png sin fondo/` — 4 lossless extractions
    (pages 17–20 of the same source).
  - `docs/svg/B&W/` — 4 lossless extractions (pages 21–24).
  - `docs/svg/letras separadas wayka/` — 4 SVGs **traced** from PNG
    with `potrace` (no separate vector source available). Letter
    SVGs use `fill="currentColor"` so they inherit color via CSS.
- `scripts/svg_from_brand_assets.sh` — single command that
  regenerates the entire `docs/svg/` tree from the source PDF + PNGs.
  Idempotent.
- `scripts/clean_svg.py` — stdlib-only post-processor that strips
  Illustrator/Inkscape metadata, removes fixed `width`/`height` on
  the root `<svg>` (so they scale via CSS while keeping the 0 0 792
  792 viewBox), and guarantees the SVG namespace.
- New system dependencies installed via Homebrew: `pdf2svg`,
  `potrace`, `netpbm`. SVGO 4.0.1 runs via `pnpm dlx` (no global
  Node install).
- Doc updates:
  - `docs/README.md` — new "SVG versions" section explaining
    provenance (lossless vs traced), file layout, and a context →
    format picking table.
  - `AGENTS.md` §4 — `docs/svg/` and `scripts/` added to the repo
    layout tree.
  - Root `README.md` — repo-structure block updated to include
    `scripts/` and the SVG twins.

**Verified**

- ✅ Page → variant mapping confirmed by color analysis (page 1 has
  the wine background + cream letters; page 17 has only cream — i.e.
  transparent variant; page 21 has only pure black + white — the B&W
  variant). Mapping is `page N = ...-NN.png` across all 24 pages.
- ✅ All 24 lossless SVGs contain zero `<image>` tags — they are true
  vector, no embedded rasters or font references that would fail in
  the browser.
- ✅ 4 letter SVGs visually compared against their PNG originals in
  Safari; trace fidelity is high for the solid letterforms.
- ✅ Final footprint: 28 source SVGs (~460 KB combined) + 28
  minified SVGs (~340 KB combined), total ~800 KB for the whole
  `docs/svg/` tree. SVGO compression averages ~60 % size reduction
  on the lossless set.
- No code under `backend/` or `frontend/` changed; the green CI from
  the previous commits still applies.

**Deferred / known issues**

- Wiring any SVG into `frontend/public/` and the landing page — still
  Phase 2, per the scope boundary from the previous entry.
- Favicon set + OG image generation — still Phase 2 (see
  `TESTING_CHECKLIST.md` §B.7).
- Letter SVGs are traced approximations, not lossless. If you later
  surface a true `.ai` source for the letter frames, re-run
  `scripts/svg_from_brand_assets.sh` after extending it to also
  extract from that PDF; quality will jump from "good" to "perfect."
- `LICENSE` file still unresolved.

**Next**

- Still awaits user sign-off on P1.
- Phase 2 work will be the first real consumer of these SVGs (logo
  on hero, favicon set generated from a chosen variant, animated
  W·A·Y·K·A reveal using the four letter SVGs).

---

## 2026-06-08 — Brand assets landed + docs sync (`477fd7b` · phase: P1)

**Shipped**

- `docs/wayka.pdf` (master brand & vision document, 10.7 MB) added by
  the user.
- Four logo-variant folders added by the user, each exported from the
  same Illustrator source (`variaciones de color en png/wayka logo
  variaciones color.ai`):
  - `docs/variaciones de color en png/` — 16 full-color PNGs
    (`...-01.png` … `...-16.png`) + `.ai` source + a combined `.pdf`
    proof sheet.
  - `docs/Logo png sin fondo/` — 4 transparent-background PNGs
    (`...-17.png` … `...-20.png`).
  - `docs/B&W/` — 4 black-and-white PNGs (`...-21.png` … `...-24.png`).
  - `docs/letras separadas wayka/` — 4 individual letter-mark frames
    (`wayka letras-08.png` … `wayka letras-11.png`) for the future
    animated W·A·Y·K·A hero reveal.
- New `docs/README.md` — index of every asset folder, a
  context → folder mapping table, and instructions for adding new
  assets in the future.
- Removed obsolete `docs/PLACE_WAYKA_PDF_HERE.md` placeholder (the
  brand PDF it was waiting for is now present).
- `AGENTS.md` §4 — `docs/` tree expanded to list every subfolder so
  future agents see them without re-running `ls`.
- Root `README.md` — `docs/` one-liner updated to reflect the richer
  asset set (color, B&W, transparent, letters).
- `TESTING_CHECKLIST.md` — added new section **B.7 Brand assets** to
  track the Phase 2 work that will consume these files (favicon set,
  OG image, animated hero, alt-text strategy, light/dark variant
  selection).

**Verified**

- ✅ `ls docs/` confirms placeholder is removed and `README.md` is in
  place; all four asset folders present with the file counts above.
- No code changed in `backend/` or `frontend/`, so the CI suite that
  was green at `70e7d05` (ruff, black, Django tests, ESLint,
  Prettier, Vitest, `pnpm build`) remains representative — not
  re-run for this docs-only pass.

**Deferred / known issues**

- Wiring any logo asset into `frontend/public/` and replacing the
  text wordmark on the landing page — defer to **Phase 2** alongside
  catalog imagery work, per the agreed scope of this pass.
- Favicon set, OG/Twitter card image, and the Framer Motion animated
  hero reveal — all tracked under the new `TESTING_CHECKLIST.md`
  §B.7 and deferred to Phase 2.
- The `git push` 403 from the previous entry is still unresolved
  (out of scope here).
- No `LICENSE` file yet — unchanged from previous entry.

**Next**

- User to sign off on P1 (this docs sync does not change P1 scope,
  but is the last documentation cleanup before P2).
- Then begin **Phase 2** — product catalog modeling, admin
  customization, WhatsApp redirect component, and the first real
  use of the brand assets just landed (logo on hero, favicon set,
  OG image).

---

## 2026-06-05 — Phase 1 foundation & scaffolding (`70e7d05` · phase: P1)

**Shipped**

Repository
- Monorepo initialized on `main`, single commit.
- Root files: `.gitignore` (Python + Node + macOS), `.editorconfig`,
  `.env.example` (covers backend + frontend env), `README.md`,
  `CONTRIBUTING.md` (Conventional Commits + Next 16 caveats).
- `.github/workflows/ci.yml` — path-filtered jobs via
  `dorny/paths-filter@v3` (backend + frontend run only when their
  paths change).
- `.github/PULL_REQUEST_TEMPLATE.md` and bug/feature issue templates.
- `docs/contrast.md` — WCAG 2.1 contrast ratios for every brand
  color pair, plus usage rules per accent.
- `docs/PLACE_WAYKA_PDF_HERE.md` — placeholder until brand PDF lands.

Backend — `backend/` (Django 5.2 LTS on Python 3.12)
- `venv/` at `backend/venv/` (gitignored), deps pinned in
  `requirements.txt` and `requirements-dev.txt`.
- `config/settings.py` reads `.env` via `python-dotenv`; SQLite at
  `backend/db.sqlite3` (gitignored); local media root; CORS
  restricted to `http://localhost:3000`; `LANGUAGE_CODE = "es-cr"`,
  `TIME_ZONE = "America/Costa_Rica"`.
- `core` app with `GET /api/health/` →
  `{"status":"ok","service":"wayka-backend"}`, plus 2 smoke tests.
- `pyproject.toml` configures ruff (py312, `E,F,I,B,UP`), black
  (line 100, py312), and pytest-django for future migration.

Frontend — `frontend/` (Next.js 16.2.7 + React 19.2.4 + Tailwind v4 +
Framer Motion 12, pnpm 9)
- Brand tokens (`cream`, `ink`, `terracotta`, `wine`, `olive`) wired
  via Tailwind v4 `@theme` + class-based dark mode using
  `@custom-variant dark (&:where(.dark, .dark *))`.
- Montserrat loaded via `next/font/google` as `--font-montserrat`
  (zero layout shift, self-hosted).
- `ThemeScript` — inline `<head>` synchronous script applied before
  paint; eliminates FOUC by setting `.dark` class on `<html>` and
  `colorScheme` before React hydrates.
- `ThemeProvider` — React context: `theme` ("light" | "dark" |
  "system"), `resolvedTheme`, `setTheme`. Persists to
  `localStorage('wayka-theme')`, listens to OS
  `prefers-color-scheme` changes live while in "system".
- `ThemeToggle` — Framer Motion sun/moon/system cross-fade, fixed
  40×40 hit area (no layout shift), Spanish `aria-label`/`title`,
  cycles light → dark → system. Focus ring uses terracotta.
- `src/app/page.tsx` — minimal P1 landing: "Wayka" wordmark + tagline
  + toggle top-right.
- Vitest 4 + React Testing Library: 5 ThemeToggle tests cover OS
  preference, cycling, persistence, live OS updates, accessibility.
- ESLint flat config (Next 16) + Prettier + `prettier-plugin-
  tailwindcss` + `.npmrc` (`engine-strict`, `auto-install-peers`).

Tracking files (this commit lands them post-hoc per user request)
- `AGENTS.md` — operating rules for any AI agent touching this repo.
- `PROGRESS.md` — this file.
- `TESTING_CHECKLIST.md` — manual + automated test inventory.

**Verified**
- ✅ Backend: `ruff check .` clean.
- ✅ Backend: `black --check .` clean.
- ✅ Backend: `python manage.py test` — 2 tests pass.
- ✅ Backend: live `curl http://127.0.0.1:8765/api/health/` returns
  `200` with the expected JSON shape.
- ✅ Frontend: `pnpm lint` clean.
- ✅ Frontend: `pnpm format:check` clean.
- ✅ Frontend: `pnpm test:ci` — 5/5 tests pass.
- ✅ Frontend: `pnpm build` succeeds with Turbopack.
- ✅ Frontend: live HTML inspection of `pnpm start` confirms
  `lang="es-CR"`, Montserrat preload, brand `theme-color` metas for
  both schemes, and the inline pre-paint ThemeScript using the
  `wayka-theme` localStorage key.
- ⚠️ Items requiring manual verification by the user are listed in
  `TESTING_CHECKLIST.md` (visual theme toggle, no-FOUC on slow
  network, mobile rendering, CI run on first push).

**Deferred / known issues**
- `git push` to `origin/main` failed with HTTP 403 (user's
  GitHub credentials lack write access OR the repo doesn't exist
  yet on `github.com/adolfojara10/wayka`). User to resolve manually.
- No `LICENSE` file yet — by user request, decision deferred. README
  notes "all rights reserved by default" in the meantime.
- `wayka.pdf` brand asset not yet placed in `docs/`.
- Next 16 ships Turbopack by default; we use it. If we ever need
  Webpack-specific behavior we'd add `--webpack` to the scripts.

**Next**
- Resolve the `git push` 403 (create the empty GitHub repo or
  refresh keychain credentials) so CI can run on the first push.
- Then wait for user sign-off on P1 before starting P2 (product
  catalog modeling, admin customization, WhatsApp redirect
  component).
