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

## 2026-06-08 — Phase 2: catalog models, admin, fixtures, tests (uncommitted · phase: P2)

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
