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

## 2026-06-08 — Brand assets landed + docs sync (uncommitted · phase: P1)

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
