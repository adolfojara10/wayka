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
