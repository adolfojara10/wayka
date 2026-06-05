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
├── backend/           # Django + DRF + SQLite (Phase 1)
├── docs/              # wayka.pdf, brand assets, contrast notes
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

## CI

GitHub Actions runs path-filtered jobs on push and pull request:
- **backend** — `ruff check` + `black --check` + `python manage.py test`
- **frontend** — `pnpm lint` + `pnpm test:ci` + `pnpm build`

See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
