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

## CI

GitHub Actions runs path-filtered jobs on push and pull request:
- **backend** — `ruff check` + `black --check` + `python manage.py test`
- **frontend** — `pnpm lint` + `pnpm test:ci` + `pnpm build`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
