# Wayka

Artisanal catering, sweets, and frozen-product retail — Costa Rica.

A warm, human, mobile-first experience that funnels orders to WhatsApp.
This repository is a monorepo containing the **Next.js** storefront and the
**Django + DRF** backend.

> **License:** not yet decided — all rights reserved by default until a
> `LICENSE` file is added.

---

## Repository structure

```
wayka/
├── frontend/          # Next.js (App Router) + Tailwind + Framer Motion
│   └── src/app/       # /, /bocaditos, /sweets, /pizzas, /catering, /not-found
├── backend/           # Django + DRF + SQLite (Phase 1)
│   └── catalog/       # Product / ProductVariant / Supermarket + public API
├── docs/              # brand PDF + logo PNG variants + SVG twins + contrast notes
├── scripts/           # reproducible asset/codegen scripts (e.g. PNG→SVG)
├── .github/           # CI workflows + PR/issue templates
├── .gitignore
├── .editorconfig
├── .env.example
├── README.md
└── CONTRIBUTING.md
```

---

## Prerequisites

- **Python 3.12** (verify with `python3.12 --version`)
- **Node.js 20+** (verify with `node --version`)
- **pnpm 9+** (`npm i -g pnpm` if missing)
- **git**

---

## Local setup

### 1. Clone & enter

```bash
git clone <your-remote-url> wayka
cd wayka
cp .env.example .env            # backend reads this
```

### 2. Backend (Django)

```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver
```

Server runs at <http://localhost:8000>.
Health check: <http://localhost:8000/api/health/> → `{"status":"ok","service":"wayka-backend"}`.

### 3. Frontend (Next.js)

In a **new terminal**:

```bash
cd frontend
cp ../.env.example .env.local
pnpm install
pnpm dev
```

App runs at <http://localhost:3000>.

---

## Common scripts

### Backend

```bash
python manage.py test          # run tests
ruff check .                   # lint
black --check .                # format check
black .                        # apply formatting
```

### Frontend

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm start        # serve production build
pnpm lint         # eslint
pnpm test         # vitest (watch)
pnpm test:ci      # vitest (single run)
pnpm format       # prettier write
```

---

## Conventions

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — see [`CONTRIBUTING.md`](CONTRIBUTING.md).
- **Branches:** `feat/...`, `fix/...`, `chore/...`, `docs/...`.
- **Code style:** ESLint + Prettier (frontend); ruff + black (backend).
- **Tests:** run locally before pushing; CI enforces them.

---

## API

The backend ships a public, read-only JSON API consumed by the Next.js
SSR layer. Inactive products are not reachable; their slugs return
404 so Google sees a hard not-found and de-indexes the URL.

| Method | URL                              | Purpose                                      |
| ------ | -------------------------------- | -------------------------------------------- |
| `GET`  | `/api/health/`                   | Liveness probe.                              |
| `GET`  | `/api/site/`                     | Business identity singleton (LocalBusiness LD + footer). |
| `GET`  | `/api/products/`                 | Catalog list. Filter by `?category=`.        |
| `GET`  | `/api/products/<slug>/`          | Single product detail (by slug, SEO-safe).   |
| `GET`  | `/api/supermarkets/`             | Active supermarket pickup locations.         |
| `GET`  | `/api/schema/`                   | OpenAPI 3 schema (YAML).                     |
| `GET`  | `/api/docs/`                     | Swagger UI.                                  |
| `GET`  | `/api/redoc/`                    | Redoc UI.                                    |

Response conventions:

- Spanish content; `Content-Language: es-CR` on every response.
- Prices in CRC ₡: each variant exposes both `price` (numeric, e.g.
  `7500.0`) and `price_crc` (pre-formatted string, e.g. `"₡ 7 500"`).
- `availability` on each product is a Schema.org `ItemAvailability`
  string (`"InStock"`, `"PreOrder"`, `"OutOfStock"`), ready to drop
  into JSON-LD on the frontend.
- `is_orderable` is `true` only when `status == "active"`.
- 2xx product / supermarket reads carry
  `Cache-Control: public, max-age=60, s-maxage=300` so SSR / CDN
  tiers can serve from edge.
- Inactive or unknown slugs on `/api/products/<slug>/` return `404`.

Quick smoke:

```bash
curl http://localhost:8000/api/health/
curl 'http://localhost:8000/api/products/?category=pizzas'
curl http://localhost:8000/api/products/pie-de-limon/
curl http://localhost:8000/api/supermarkets/
open http://localhost:8000/api/docs/      # Swagger UI
```

---

## SEO & Analytics

The site is built for indexing by Googlebot from day one. Every
indexable URL is server-rendered, the catalog data is exposed
through a typed API contract, and Schema.org JSON-LD is emitted for
business identity (`FoodEstablishment`), products (`Product`), and
navigation (`BreadcrumbList`).

### Public routes (every one is in `sitemap.xml`)

| URL                              | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `/`                              | Home — hero + B2C / B2B navigation         |
| `/bocaditos`                     | Category landing                           |
| `/sweets`                        | Category landing                           |
| `/pizzas`                        | Category landing                           |
| `/catering`                      | B2B page + WhatsApp CTA                    |
| `/productos/<slug>`              | Product detail (per-product `<h1>`, OG, JSON-LD) |
| `/sitemap.xml`                   | Generated at runtime; product slugs come from the live API |
| `/robots.txt`                    | Allow `/`, disallow `/api/`, points at `/sitemap.xml`      |
| `/opengraph-image.png`           | Default 1200×630 OG card (Wayka wordmark on cream)         |

### Analytics

Every CTA fires through `lib/analytics.ts`. **No component calls
`window.gtag` directly.** Spec events from `master-prompt.txt §8`:

`whatsapp_order_click` · `view_product` · `add_to_antojos` ·
`open_cart` · `remove_from_antojos` · `select_variant` ·
`category_tab_switch` · `calculator_used` · `theme_toggle` ·
`web_vital`

Wiring:

- **GA4** via `@next/third-parties/google` — auto-loaded after
  hydration, zero CWV impact. Gated on `NEXT_PUBLIC_GA4_MEASUREMENT_ID`.
- **Microsoft Clarity** — gated on `NEXT_PUBLIC_CLARITY_PROJECT_ID`.
  Loaded with `strategy="lazyOnload"`.
- **Meta Pixel** — `components/analytics/MetaPixel.tsx` is an
  **intentionally disabled** placeholder with an activation checklist
  in its file header.
- **Web Vitals** — `useReportWebVitals` forwards LCP/CLS/INP/FCP/TTFB
  through the same analytics utility (lands in GA4 as `web_vital`).
- **Cookie disclosure** — single Spanish line in the footer; no
  blocking banner (Costa Rica has no equivalent of GDPR's
  cookie-consent regime).

### Launch checklist (manual, after deployment)

1. Set `NEXT_PUBLIC_SITE_URL=https://wayka.cr` (or your final domain).
2. Create the `SiteSettings` singleton in Django admin (address,
   phone, opening hours).
3. Generate a GA4 measurement ID (Admin → Data Streams → Add Web
   Stream); paste into `NEXT_PUBLIC_GA4_MEASUREMENT_ID`.
4. Create a Microsoft Clarity project; paste the project ID into
   `NEXT_PUBLIC_CLARITY_PROJECT_ID`.
5. Verify the domain in Google Search Console using the HTML meta
   tag method; paste the token into `NEXT_PUBLIC_GSC_VERIFICATION`.
   Then submit `https://wayka.cr/sitemap.xml`.
6. (Optional, when launching Meta ads) follow the activation
   checklist in `frontend/src/components/analytics/MetaPixel.tsx`.
7. Re-run `pnpm lighthouse:home` and `pnpm lighthouse:bocaditos`
   against the deployed URL to capture real production scores.

### Local Lighthouse (lab-only, pre-deploy)

```bash
# Terminal 1 — backend
cd backend && source venv/bin/activate && python manage.py runserver

# Terminal 2 — frontend prod build
cd frontend && pnpm build && pnpm start -p 3001

# Terminal 3 — Lighthouse
cd frontend
pnpm lighthouse:home          # writes ./lighthouse-home.html
pnpm lighthouse:bocaditos     # writes ./lighthouse-bocaditos.html
```

Latest local scores (one-shot, headless Chrome via the bundled
lighthouse@13 CLI):

| Route        | Performance | Accessibility | Best Practices | SEO |
| ------------ | ----------- | ------------- | -------------- | --- |
| `/`          | 93          | 96            | 100            | 100 |
| `/bocaditos` | 88          | 94            | 100            | 100 |

Lab scores; CrUX field data lives at https://pagespeed.web.dev once
the site is deployed.

---

## CI

GitHub Actions runs path-filtered jobs on push and pull request:
- **backend** — `ruff check` + `black --check` + `python manage.py test`
- **frontend** — `pnpm lint` + `pnpm test:ci` + `pnpm build`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
