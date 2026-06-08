# TESTING_CHECKLIST.md — Project Wayka

What must be verified after every change. Items marked **(auto)** run
in CI on every push/PR; items marked **(manual)** are the user's
review checklist.

**Legend**
- `[x]` — covered and currently passing
- `[ ]` — open / needs verification
- `[~]` — partially covered (notes alongside)

> Agents: when you ship work, add new rows here and tick anything
> your tests now cover. Never delete items — strike through with
> `~~text~~` and add a note if a check is no longer relevant.

---

## A. Backend — Django + DRF

### A.1 Lint / format (auto, CI)
- [x] `ruff check .` is clean.
- [x] `black --check .` is clean.

### A.2 Tests (auto, CI)
- [x] `python manage.py test` runs the suite end-to-end without errors.
- [x] `core.tests.HealthCheckTests::test_health_endpoint_returns_200`.
- [x] `core.tests.HealthCheckTests::test_health_endpoint_returns_expected_payload`.

### A.3 Runtime smoke (manual)
- [x] `python manage.py migrate` applies cleanly on a fresh SQLite DB.
- [x] `python manage.py check` reports no issues.
- [x] `python manage.py runserver` boots and responds `200` on
  `GET /api/health/` with `{"status":"ok","service":"wayka-backend"}`.
- [ ] `python manage.py createsuperuser` works locally (for admin
  access). Not exercised yet — verify when first needed.
- [ ] Django admin renders in Spanish (es-cr) at `/admin/` after
  superuser creation.

### A.4 Configuration (manual on each `.env` change)
- [ ] Backend reads `.env` from repo root (not from `backend/.env`).
- [ ] `DJANGO_DEBUG=False` + a real `DJANGO_SECRET_KEY` boots without
  errors (no insecure-default warning).
- [ ] `CORS_ALLOWED_ORIGINS` is honored — a request from
  `http://localhost:3000` succeeds; a request from another origin is
  rejected.

### A.5 Catalog app — models, queryset, admin (Phase 2)

Auto (CI) — covered by `python manage.py test`:
- [x] `test_models.py` — slug auto-gen, collision-resolved
  uniqueness, preserve-when-set, Spanish-char normalization.
- [x] `test_models.py` — `Status` and `Category` choice values
  match the Phase 2 spec literally.
- [x] `test_models.py` — `is_orderable` is True only for
  `Status.ACTIVE`.
- [x] `test_models.py` — `unique_variant_name_per_product`
  constraint raises `IntegrityError` on duplicate variant names
  inside a product, but allows the same name across products.
- [x] `test_models.py` — `default_variant` returns the marked
  default, falls back to first-by-`display_order` when none flagged,
  and returns `None` for a variant-less product.
- [x] `test_models.py` — `Supermarket` saves with optional
  `latitude` / `longitude` left blank.
- [x] `test_business_rules.py` — `visible()` excludes only
  `INACTIVE`.
- [x] `test_business_rules.py` — `ordered_for_display()` sinks
  unavailable products to the bottom even when they are
  `is_featured=True`.
- [x] `test_business_rules.py` — within the active bucket,
  `is_featured` comes first; ties broken by `display_order`, then by
  `name`.
- [x] `test_business_rules.py` — `for_category(...)` composes with
  `ordered_for_display()` without leaking other categories.
- [x] `test_business_rules.py` — `has_multiple_variants` returns
  False for 0 and 1 variant; True for 2+; updates immediately on
  delete.
- [x] `test_admin.py` — anonymous request to
  `/admin/catalog/product/` redirects to `/admin/login/`.
- [x] `test_admin.py` — staff superuser can render the changelist
  and the Spanish status label appears (`"Activo"`).
- [x] `test_admin.py` — submitting the product add form with two
  inline variants returns 302 and persists both variants with the
  right names, prices, and default flag.
- [x] `test_admin.py` — submitting two variants both flagged
  `is_default=True` returns 200, persists nothing, and renders the
  Spanish error message
  `"Solo una variante puede estar marcada como predeterminada."`.

Manual (your review checklist):
- [ ] `python manage.py createsuperuser` succeeds locally.
- [ ] Logging into `/admin/`, the site header reads
  `"Wayka — Administración"` and all field labels are in Spanish.
- [ ] In the Product changelist, drag-and-drop reordering of rows
  actually persists the new `display_order` (JS-dependent; not
  covered by unit tests).
- [ ] `python manage.py loaddata sample_catalog` loads 26 objects
  on a fresh DB; afterwards the admin lists 9 products, 15 variants
  inline, and 2 supermarkets.
- [ ] Uploading an image to a product writes it to
  `backend/media/products/YYYY/MM/...` and renders in the admin
  change form.
- [ ] Creating a second product with the same name as an existing
  product produces a slug suffixed with `-2` (and `-3`, ...) without
  any human intervention.
- [ ] The `inactive` fixture product (`producto-archivado-de-prueba`)
  remains visible in the admin but does NOT appear in
  `Product.objects.visible()` (verifiable in `manage.py shell`).
- [ ] A variant marked `is_available=False` still shows up in the
  admin inline (the gating is presentation-only — no row is hidden).

### A.6 Catalog REST API — public read-only contract (Phase 3)

Auto (CI) — covered by `python manage.py test`:
- [x] `test_api.py` — `GET /api/products/` returns 200 with
  `Content-Type: application/json`.
- [x] `test_api.py` — `inactive` products never appear in the list.
- [x] `test_api.py` — `?category=pizzas` returns only pizzas.
- [x] `test_api.py` — invalid `?category=` returns 400 with a
  structured DRF error body (no silent empty list).
- [x] `test_api.py` — ordering matches the P2 rule end-to-end:
  featured-active → non-featured-active → unavailable, ties by
  `display_order`, inactive excluded.
- [x] `test_api.py` — every 2xx response carries
  `Content-Language: es-CR` and
  `Cache-Control: public, max-age=60, s-maxage=300` and
  `Vary: Accept-Language`.
- [x] `test_api.py` — each list item includes every required SEO
  field (`slug`, `name`, `description`, `category`, `status`,
  `is_featured`, `is_orderable`, `has_multiple_variants`,
  `availability`, `image`, `meta_description`, `alt_text`,
  `variants`, `default_variant_id`, `updated_at`).
- [x] `test_api.py` — `variants` nest correctly inside each product
  and are returned in `display_order`.
- [x] `test_api.py` — each variant has both numeric `price` (e.g.
  `7500.0`) and pre-formatted `price_crc` (`"₡ 7 500"`, NBSP
  separator).
- [x] `test_api.py` — `is_orderable` is `true` only for
  `Status.ACTIVE` products.
- [x] `test_api.py` — `availability` maps `Status` to Schema.org
  `ItemAvailability` strings (`InStock` / `PreOrder` / `OutOfStock`).
- [x] `test_api.py` — `image` is `null` when no upload is present.
- [x] `test_api.py` — `has_multiple_variants` flag is correct
  (False for 1 variant, True for 2+).
- [x] `test_api.py` — N+1 guard: the list view executes ≤5 SQL
  queries regardless of catalog size.
- [x] `test_api.py` — `GET /api/products/<slug>/` returns 200 for an
  active product.
- [x] `test_api.py` — `coming_soon` and `sold_out` products are
  reachable via detail (frontend renders the badge).
- [x] `test_api.py` — **`inactive` product detail returns 404**
  (SEO-critical: lets Next.js emit a real 404 to Googlebot).
- [x] `test_api.py` — unknown slug detail returns 404.
- [x] `test_api.py` — 404 responses do NOT carry
  `Cache-Control: public, s-maxage=300` (CDNs must not cache them).
- [x] `test_api.py` — `GET /api/supermarkets/` returns only
  `is_active=True` rows, ordered by `display_order` then `name`.
- [x] `test_api.py` — `GET /api/schema/` returns OpenAPI YAML that
  mentions all 3 catalog endpoints.
- [x] `test_serializers.py` — `format_crc` uses ROUND_HALF_UP
  rounding, NBSP separators, handles zero correctly.
- [x] `test_serializers.py` — `ProductVariantSerializer` returns
  both numeric and formatted prices.
- [x] `test_serializers.py` — all required SEO fields present in
  product payload; `meta_description` / `alt_text` pass through
  unmodified.
- [x] `test_serializers.py` — `default_variant_id` points to the
  marked-default variant.
- [x] `test_serializers.py` — `is_orderable` truth table holds at
  the serializer layer.
- [x] `test_serializers.py` — `AVAILABILITY_BY_STATUS` mapping
  exhaustively covers every `Status` value (no orphans on future
  enum additions).
- [x] `test_serializers.py` — `ProductDetailSerializer` field set
  is identical to `ProductListSerializer` today (pinned for safety
  while we hold detail-only fields for P4/P5).

Manual (your review checklist):
- [ ] `curl -i http://localhost:8000/api/products/` — visually
  confirm `Content-Language`, `Cache-Control`, `Vary`,
  `Content-Type` headers + Spanish product names.
- [ ] `curl -i http://localhost:8000/api/products/<inactive-slug>/`
  — confirm 404.
- [ ] `curl -i http://localhost:8000/api/products/?category=pizzas`
  — confirm only pizzas, in expected order.
- [ ] Open `http://localhost:8000/api/docs/` — Swagger UI renders;
  every endpoint has Spanish summary + description.
- [ ] Open `http://localhost:8000/api/redoc/` — Redoc renders.
- [ ] After uploading an image in admin, the product's `image`
  field in `/api/products/` returns an **absolute** URL (starts
  with `http://`).
- [ ] `Vary: Accept-Language` is present (defensive even though the
  site is Spanish-only; will matter once a CDN is in front).

### B.8 Frontend catalog + Antojo Cart + WhatsApp funnel (Phase 4)

Auto (CI) — covered by `pnpm test:ci`:
- [x] `lib/__tests__/analytics.test.ts` — track helpers expose stable
  signatures matching the master-prompt §8 spec; SSR-safe no-op;
  in-memory recording when GA4 id empty; gtag called with correct
  shape when configured; safe when gtag missing.
- [x] `lib/__tests__/whatsapp.test.ts` — cart message format pins the
  with-parens variant naming, single-variant case, empty case;
  `whatsappUrl` strips non-digits + encodes newlines as `%0A` +
  throws `WhatsAppConfigError` on missing/invalid number; catering
  builder includes event type, guest count, total, breakdown.
- [x] `components/cart/__tests__/AntojoCartProvider.test.tsx` — same
  product+variant → one line w/ qty=2; `updateQty(0)` removes + fires
  remove event; `clearCart` empties + clears sessionStorage;
  `dominantCategory` derives correctly; `open('pedir_ya')` fires
  with post-add item_count (regression-tested closure bug); hydration
  from sessionStorage; ignores corrupted storage; throws outside
  provider.
- [x] `components/cart/__tests__/AntojoCartDrawer.test.tsx` —
  WhatsApp URL char-for-char matches the spec quote with parens; CTA
  click fires `trackWhatsAppOrderClick` with
  `source: "antojo_cart"` and correct aggregates; empty cart shows
  conversational copy + disabled CTA.
- [x] `components/catalog/__tests__/ProductCard.test.tsx` — active
  shows both CTAs no badge; coming_soon hides CTAs + shows
  Próximamente; sold_out hides CTAs + shows Agotado; single-variant
  inline price; multi-variant shows size selector + fires
  `trackSelectVariant`; unavailable variant `aria-disabled`;
  "Pedir Ya" → adds + `trackOpenCart({source:'pedir_ya'})` with
  correct item_count.

Manual (your review checklist — requires both servers running):
- [ ] Hard refresh on `/bocaditos` shows the products **in the
  initial HTML** (View Source). Same for `/sweets` and `/pizzas`.
  Confirms server-side rendering — required for SEO.
- [ ] Mobile (≤ 390px): both navigation cards on the home page are
  reachable without scrolling.
- [ ] Tab between `/bocaditos` → `/sweets` → `/pizzas` feels
  instant; the URL changes; the active tab pill highlights the
  current route; layout chrome (header, footer, tabs) does NOT
  flash.
- [ ] Adding a multi-variant product without picking a size uses the
  default; switching size before "Pedir Ya" updates the cart line
  correctly.
- [ ] "Pedir Ya" opens the cart immediately with the chosen item.
- [ ] "Añadir a mis antojos" silently adds; the header badge updates
  count.
- [ ] In the cart drawer, qty +/- updates totals; "Quitar" removes
  the line; "Vaciar la bolsa" clears.
- [ ] "Pedir por WhatsApp" opens WhatsApp Web / app with the
  pre-built message (parens included for every line).
- [ ] Closing the tab and reopening the site → cart is empty (we
  use sessionStorage, not localStorage).
- [ ] Reloading the tab keeps the cart contents (same session).
- [ ] `/catering` placeholder copy is friendly and the WhatsApp CTA
  opens with the generic event-planning message.
- [ ] A URL that doesn't exist (e.g. `/not-a-real-page`) shows the
  Spanish 404 page.
- [ ] Theme toggle still works on every route (light → dark → system
  cycle); no FOUC; no layout shift.
- [ ] All Spanish copy reads naturally for a Costa Rica audience.

### A.7 SiteSettings + WeekdayHours backend (Phase 5)

Auto (CI) — covered by `python manage.py test`:
- [x] `core.tests.SiteSettingsModelTests` — `save()` clamps pk to 1,
  second `create()` rewrites/overwrites; `load()` returns None when
  absent and the singleton when present.
- [x] `core.tests.SiteSettingsAdminTests` — admin add view is 200
  when no row exists, 403 once singleton exists; change view does
  not render the `deletelink` button.
- [x] `core.tests.WeekdayHoursTests` — unique constraint per
  `(settings, day)`; `full_clean()` rejects mixed-null (one time
  set, the other not) and `close <= open`; accepts both-null as
  "closed".
- [x] `core.tests.SiteSettingsEndpointTests` — `GET /api/site/`
  returns 404 when singleton absent; 200 with nested hours when
  present; 2xx carries `Content-Language: es-CR` and
  `Cache-Control: public...`; 404 does not carry the public cache
  header.
- [x] `core.tests.SampleSiteFixtureTests` — `loaddata sample_site`
  installs 1 settings row + 7 weekday rows; Sunday is closed.

Manual (your review checklist):
- [ ] In Django admin, after `loaddata sample_site`, the
  `Ajustes del sitio` change list shows exactly one row.
- [ ] Trying to add a second row from the admin returns 403.
- [ ] The `Delete` button is absent on the change form.
- [ ] Editing a weekday's open/close times inline persists.
- [ ] Trying to save close time earlier than open time shows the
  Spanish error from the model `clean()`.

### B.9 Frontend SEO + analytics (Phase 5)

Auto (CI) — covered by `pnpm test:ci`:
- [x] `app/__tests__/sitemap.test.ts` — home + 3 categories +
  catering always present; product entries derived from
  `getProducts()` (which already excludes inactive); static-only
  fallback when API throws; URL prefix uses `NEXT_PUBLIC_SITE_URL`.
- [x] `app/__tests__/robots.test.ts` — allow `/`, disallow `/api/`;
  sitemap URL uses `NEXT_PUBLIC_SITE_URL`; trailing slashes
  normalized.
- [x] `lib/__tests__/jsonld.test.ts` — `buildLocalBusinessLd`
  shape (FoodEstablishment + PostalAddress + GeoCoordinates +
  openingHoursSpecification only for non-closed days + optional
  fields elided when blank); `buildProductLd` shape (CRC currency,
  Schema.org `https://schema.org/<Availability>` URLs, single-offer
  flattening, unavailable variants excluded, PreOrder / OutOfStock
  mapping); `buildBreadcrumbLd` 1-indexed positions.
- [x] `components/analytics/__tests__/MetaPixel.test.tsx` — no
  `<script>` emitted regardless of env var; no `facebook.net` /
  `fbevents.js` in markup.
- [x] `components/analytics/__tests__/Clarity.test.tsx` — no script
  when env var blank; script with interpolated project ID when set.
- [x] `app/__tests__/metadata.test.ts` — root layout exports
  `metadataBase`, `openGraph.siteName=Wayka`, `locale=es_CR`,
  `twitter.card=summary_large_image`, `robots: {index:true,
  follow:true}`, canonical `/`; category pages have unique titles
  with their Spanish labels; product detail `generateMetadata`
  uses product name + `meta_description` (with fallback to
  description) and returns noindex when product missing.
- [x] `app/__tests__/headings.test.ts` — every `page.tsx` contains
  exactly one `<h1>`.
- [x] `components/__tests__/ThemeToggle.test.tsx` — clicking fires
  `trackThemeToggle({ to_theme: <next> })`.
- [x] `components/catalog/__tests__/ProductCard.test.tsx` (added) —
  renders `next/image` with `alt_text` when `image` is set; shows
  placeholder when `image` is null; falls back to `name` when
  `alt_text` blank.

Manual (your review checklist — requires both servers running):
- [ ] `curl http://localhost:3001/sitemap.xml` returns XML with home
  + categories + catering + every visible product slug.
- [ ] `curl http://localhost:3001/robots.txt` returns the right
  rules and sitemap URL.
- [ ] `view-source:http://localhost:3001/productos/<slug>` shows 3
  `<script type="application/ld+json">` blocks: FoodEstablishment,
  Product, BreadcrumbList.
- [ ] `https://search.google.com/test/rich-results` accepts the
  Product JSON-LD (run against a deployed URL).
- [ ] OG card preview: paste a deployed product URL into the
  Facebook Sharing Debugger
  (https://developers.facebook.com/tools/debug/) — preview shows
  the wordmark on cream + correct title + description.
- [ ] WhatsApp preview: share a deployed product URL in a WhatsApp
  chat — same preview appears.
- [ ] `<meta name="google-site-verification">` appears in the HTML
  when `NEXT_PUBLIC_GSC_VERIFICATION` is set; does not appear when
  blank.
- [ ] `pnpm lighthouse:home` after deploy: Performance ≥ 90, SEO =
  100, Best Practices = 100, Accessibility ≥ 95.
- [ ] Manual GA4 DebugView shows `whatsapp_order_click` events
  firing on real WhatsApp CTA clicks after deploy.

---

## B. Frontend — Next.js + Tailwind + Framer Motion

### B.1 Lint / format (auto, CI)
- [x] `pnpm lint` clean.
- [x] `pnpm format:check` clean (Prettier + tailwind plugin).

### B.2 Tests (auto, CI)
- [x] `pnpm test:ci` — Vitest suite green.
- [x] `ThemeToggle` respects OS `prefers-color-scheme` when no stored
  preference exists.
- [x] `ThemeToggle` cycles light → dark → system on each click and
  toggles the `.dark` class on `<html>` accordingly.
- [x] `ThemeToggle` persists the user choice to
  `localStorage('wayka-theme')`.
- [x] `ThemeProvider` reacts live to OS `prefers-color-scheme`
  changes while in "system" mode.
- [x] `ThemeToggle` exposes an accessible label that reflects the
  current theme (Spanish).

### B.3 Build (auto, CI)
- [x] `pnpm build` succeeds (Next.js 16 + Turbopack).
- [x] Build output renders the root `/` page as static (`○`).

### B.4 Server-rendered HTML (auto, partial; manual for visuals)
- [x] `<html lang="es-CR">` is emitted by the layout.
- [x] Inline `<script>` in `<head>` reads `wayka-theme` from
  `localStorage` before paint.
- [x] `meta[name="theme-color"]` is emitted for both
  `prefers-color-scheme: light` (`#F3EBDF`) and `dark` (`#060419`).
- [x] Montserrat is preloaded (`<link rel="preload" as="font" ...>`).

### B.5 Theme behavior (manual — needs a real browser)
- [ ] **No FOUC** on a hard reload: with OS dark mode on, the page
  paints dark immediately — no white flash. Verify with DevTools
  throttling set to "Slow 3G".
- [ ] **No layout shift** when toggling: the toggle button stays the
  same size; nothing around it jumps. Verify with DevTools "Show
  layout shift regions".
- [ ] **Persistence**: choosing dark → reload → still dark.
- [ ] **System mode live update**: while toggle is on "system", flip
  the OS appearance — the page updates without a reload.
- [ ] **Keyboard accessibility**: Tab focuses the toggle; visible
  terracotta focus ring; Enter/Space activates it.
- [ ] **Screen reader**: VoiceOver announces the Spanish label
  reflecting the current state.
- [ ] **Mobile (≤ 390 px)**: the toggle is reachable in the top-right
  with one thumb; the wordmark + tagline render centered.

### B.6 Visual contrast (manual — first time after any palette change)
- [ ] Light mode: ink text on cream background is comfortable; no
  body text uses terracotta / wine / olive.
- [ ] Dark mode: cream text on ink background is comfortable; the
  `wine`-on-`ink` pair is **not** used (fails AA — see
  `docs/contrast.md`).
- [ ] Focus ring on the toggle is visible on both backgrounds.

### B.7 Brand assets (deferred to Phase 2 — listed so they aren't forgotten)

These items consume the assets that landed in `docs/` on 2026-06-08
(see `docs/README.md`). None of them are in P1 scope; they belong to
Phase 2 (catalog + imagery). Tracked here so they aren't lost.

- [x] **SVG twins generated for every PNG variant** —
  `docs/svg/<same subfolders>/` holds 28 source SVGs + 28 minified
  via `scripts/svg_from_brand_assets.sh` (2026-06-08). Lossless for
  the 24-variant set, traced for the 4 letter frames.
- [ ] Pick primary logo variant for **light** backgrounds (cream)
  from `docs/svg/variaciones de color en png/`; copy to
  `frontend/public/brand/` with a stable filename. Prefer the
  `.min.svg`.
- [ ] Pick primary logo variant for **dark** backgrounds (ink) from
  the same folder; verify it stays legible on `#060419`.
- [ ] Pick **transparent** variant from `docs/svg/Logo png sin fondo/`
  for use over product photography.
- [ ] Pick **B&W** fallback from `docs/svg/B&W/` for single-color
  contexts (email signature, print, watermark).
- [ ] Replace the text wordmark in `frontend/src/app/page.tsx` with
  a `next/image` (or inline `<svg>`) rendering of the chosen logo
  (lazy SSR-friendly, no layout shift). Spanish `alt` drafted.
- [ ] Generate the full favicon set from the chosen logo SVG: `.ico`,
  16×16, 32×32, 180×180 (apple-touch), 192×192, 512×512, and a
  maskable 512×512 with safe-zone padding. Wire via Next 16
  metadata `icons` config (read the bundled Next docs first).
- [ ] Pick / produce the OG + Twitter card source image (1200×630).
  Decide whether to render a logo SVG onto a `cream`/`ink` canvas or
  use a real product photo. Wire via Next 16 metadata `openGraph`
  config.
- [ ] Decide whether to use the four SVGs in
  `docs/svg/letras separadas wayka/` for a Framer Motion staggered
  W·A·Y·K·A reveal on the hero. They use `fill="currentColor"` so
  themeing comes free. If yes, prototype with
  `prefers-reduced-motion` respected.
- [ ] Cross-check every chosen logo + background pair against
  `docs/contrast.md`. If a new color emerges, recompute ratios and
  update that file before merging.
- [ ] Visual fidelity sanity check of `docs/svg/` in Safari + Firefox
  + Chrome at 24px, 96px, 512px sizes (especially the traced letter
  SVGs — they're potrace approximations of solid letterforms).

---

## C. Repo / infra

### C.1 Git hygiene (manual on first clone)
- [x] `db.sqlite3`, `venv/`, `node_modules/`, `.next/`, `media/`,
  `staticfiles/`, `.env`, `.env.local` are all gitignored and not
  tracked.
- [ ] Fresh clone + `cp .env.example .env` + backend setup steps in
  `README.md` work on a clean machine.
- [ ] Fresh clone + `cp ../.env.example .env.local` + `pnpm install`
  + `pnpm dev` works on a clean machine.

### C.2 CI (manual — verify on first push)
- [ ] `.github/workflows/ci.yml` runs on push to `main` and on PRs.
- [ ] `changes` job correctly detects which paths changed.
- [ ] `backend` job: ruff + black --check + Django tests all pass on
  Ubuntu + Python 3.12.
- [ ] `frontend` job: pnpm lint + format:check + test:ci + build all
  pass on Ubuntu + Node 20 + pnpm 9.

### C.3 Tracking files (manual — every PR)
- [ ] `PROGRESS.md` updated (newest entry at the top).
- [ ] `TESTING_CHECKLIST.md` updated (new items added, completed
  items ticked).
- [ ] If colors changed: `docs/contrast.md` recomputed.

---

## D. Deferred / not in scope yet

These are intentionally **not** tested in P1. They will get their own
sections when the corresponding phase begins.

- D.1 Product catalog (P2): models, admin UX, fixtures, image
  uploads, listing/detail SSR.
- D.2 WhatsApp redirect (P3): URL building from
  `NEXT_PUBLIC_WHATSAPP_NUMBER` + Spanish message templates +
  analytics event.
- D.3 SEO (P-SEO): sitemap, robots, JSON-LD, OG/Twitter images,
  per-page metadata.
- D.4 Analytics (P-Analytics): GA4 custom events, Microsoft Clarity,
  Core Web Vitals impact budget.
- D.5 Deployment (P-Deploy): hosting target, env handling, media
  storage migration off local filesystem.
