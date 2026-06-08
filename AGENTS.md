# AGENTS.md — Operating rules for AI coding agents in this repo

> If you are an AI coding assistant (Claude Code, Cursor, Copilot,
> OpenCode, etc.) working on **Project Wayka**, read this file before
> writing any code. It is the source of truth for how to behave here.

---

## 1. Project at a glance

**Wayka** — artisanal catering, sweets, and frozen-product retail
business in Costa Rica. The site funnels every order to **WhatsApp**
(no payment gateway). Identity is warm, human, artisanal — never
corporate.

- Mobile-first, minimum-clicks, minimum-scrolling.
- Server-rendered HTML, Spanish-language local SEO, AA accessibility.
- All content client-manageable via django-admin (no code changes).

The full vision lives in `master-prompt.txt` (Section 0 — "Master
Vision"). Treat it as persistent context.

---

## 2. Tech stack (locked)

| Layer       | Choice                                                  |
| ----------- | ------------------------------------------------------- |
| Frontend    | Next.js **16** (App Router) + React **19** + TypeScript |
| Styling     | Tailwind CSS **v4** (CSS-first config in `globals.css`) |
| Animation   | Framer Motion **12**                                    |
| Backend     | Django **5.2 LTS** + Django REST Framework              |
| Python      | **3.12** (via `venv` at `backend/venv/`)                |
| DB (P1)     | local SQLite (`backend/db.sqlite3`, gitignored)         |
| Media (P1)  | local filesystem (`backend/media/`, gitignored)         |
| Pkg mgr     | **pnpm 9** (frontend), **pip** (backend)                |
| Test        | Vitest + RTL (frontend), Django `manage.py test` (back) |
| Lint/Format | ESLint flat config + Prettier, ruff + black             |
| CI          | GitHub Actions, path-filtered                           |

Do **not** introduce alternative stacks (no Yarn, no Poetry, no
Jest, no styled-components) without explicit user approval.

---

## 3. Non-negotiables

1. **Ask before initialization / irreversible commands.** Never run
   `git push`, `git rebase`, `git reset --hard`, `rm -rf`,
   `django-admin startproject`, `create-next-app`, schema migrations
   that drop data, or `pip install` outside the project venv without
   user confirmation. (Routine `git add` / `git commit` for work the
   user has approved is fine.)
2. **Plan before you build** for any multi-step task. Use a TODO list
   that the user can see.
3. **Phase discipline.** The blueprint is divided into phases
   (P1 → P5). Complete and hand back for sign-off **before** starting
   the next phase. Never silently start P3 work while finishing P2.
4. **Read bundled Next.js docs.** Next.js 16 differs from your
   training data. Before writing routing, server actions, async
   request APIs (`cookies`, `headers`, `params`, `searchParams`),
   image, or metadata code, read the relevant file under
   `frontend/node_modules/next/dist/docs/01-app/`. See
   `frontend/AGENTS.md` for details.
5. **No FOUC, no layout shift.** Theme switching, fonts, and any
   client-only UI must render correctly on first paint.
6. **No payment gateway.** Every CTA that resembles "checkout" is a
   WhatsApp deep link with a structured Spanish message.
7. **Spanish first.** All user-facing copy, admin labels, error
   messages, alt text, and metadata are in Spanish (Costa Rica).
   Code, comments, and commit messages are in English.
8. **Accessibility.** WCAG 2.1 AA contrast minimum. The verified
   palette ratios live in `docs/contrast.md` — consult that file
   before using any accent color.

---

## 4. Repository layout

```
wayka/
├── AGENTS.md                ← this file
├── PROGRESS.md              ← running log of completed work (update it!)
├── TESTING_CHECKLIST.md     ← what must be verified (update it!)
├── README.md
├── CONTRIBUTING.md
├── master-prompt.txt        ← full blueprint / persistent context
├── .env.example
├── .gitignore
├── .editorconfig
├── .github/                 ← CI + PR/issue templates
├── docs/                    ← brand & accessibility reference
│   ├── README.md                       ← index of all assets below
│   ├── contrast.md                     ← WCAG ratios + usage rules
│   ├── wayka.pdf                       ← master brand & vision doc
│   ├── B&W/                            ← B/W logo variants
│   ├── Logo png sin fondo/             ← transparent-background logos
│   ├── letras separadas wayka/         ← individual letter marks (for animation)
│   └── variaciones de color en png/    ← full-color logo variants + .ai source
├── backend/                 ← Django + DRF
│   ├── venv/                ← gitignored
│   ├── manage.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pyproject.toml       ← ruff + black + pytest-django config
│   ├── config/              ← Django project package
│   └── core/                ← cross-cutting app (health endpoint, etc.)
└── frontend/                ← Next.js 16
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── eslint.config.mjs    ← flat config
    ├── vitest.config.ts
    ├── vitest.setup.ts
    ├── .prettierrc
    └── src/
        ├── app/             ← App Router
        ├── components/      ← React components
        └── lib/             ← Shared TS modules
```

---

## 5. Required workflow for every change

1. **Understand the request.** If multi-step, write a TODO list.
2. **Plan.** For non-trivial work, present the plan and wait for
   explicit "execute" / "go" before touching files.
3. **Implement.** Follow the conventions in §6.
4. **Verify locally.**
   - Backend: `ruff check .` → `black --check .` → `python manage.py test`.
   - Frontend: `pnpm lint` → `pnpm format:check` → `pnpm test:ci` →
     `pnpm build`.
5. **Update tracking files** (mandatory):
   - Append an entry to **`PROGRESS.md`** describing what shipped.
   - Add new items to **`TESTING_CHECKLIST.md`** and tick any that
     are now verified.
6. **Commit.** Use Conventional Commits (see `CONTRIBUTING.md`).
   Do **not** push without user confirmation.
7. **Report back** with a concise summary and next-step
   recommendation. Never silently proceed to the next phase.

---

## 6. Conventions

### Commits
Conventional Commits 1.0. Examples in `CONTRIBUTING.md`. Allowed
types: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`,
`ci`, `style`, `build`, `revert`.

### Branches
`feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.

### Code style
- **Python:** ruff (line 100, `E,F,I,B,UP`) + black (line 100).
  Configured in `backend/pyproject.toml`.
- **TS/TSX/JS:** ESLint flat config + Prettier
  (2-space, double quotes, semicolons, trailing commas `all`,
  `prettier-plugin-tailwindcss` auto-sorts classes).
- **CSS:** Tailwind v4 utilities preferred; custom CSS only when
  necessary, and only in `src/app/globals.css`.

### File naming
- React components: `PascalCase.tsx`.
- TS modules: `kebab-case.ts` (e.g. `lib/whatsapp.ts`).
- Python: `snake_case.py`.
- Tests: colocated under `__tests__/<Component>.test.tsx`
  (frontend), or `tests.py` / `test_*.py` (backend).

### Theming
- Brand tokens live in `frontend/src/app/globals.css` via `@theme`
  and `@custom-variant dark (&:where(.dark, .dark *))`.
- Dark mode is class-based: `<html class="dark">`. The pre-paint
  `ThemeScript` in `<head>` sets the class before first render —
  do **not** reintroduce `prefers-color-scheme` CSS toggling.
- New colors → recompute contrast → update `docs/contrast.md`.

### Environment variables
- All new envs added to `.env.example` at repo root.
- Backend reads `.env` (repo root) via `python-dotenv`.
- Frontend uses `frontend/.env.local`; only `NEXT_PUBLIC_*` are
  exposed to the browser.

### WhatsApp links (when introduced in later phases)
- Read the number from `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- Use `https://wa.me/<number>?text=<urlencoded message>`.
- Every CTA fires a tracked analytics event (P-Analytics phase).

---

## 7. Things the user cares about (recurring)

- **Minimum clicks, minimum scrolling.** When proposing UX, count
  taps from landing → WhatsApp redirect. Lower is better.
- **Costa Rica defaults.** Locale `es-cr`, timezone
  `America/Costa_Rica`, currency CRC (₡), WhatsApp number in E.164
  with `+506`.
- **Lightweight.** No heavy UI kits, no SaaS analytics SDK overload.
- **No flashy AI buzzword features.** This is a real local business
  site. Boring, fast, warm.

---

## 8. Live status (always current)

- ✅ **Phase 1 — Foundation & Repository Scaffolding** — complete
  (commit `70e7d05`). See `PROGRESS.md` for details.
- ⏭️ **Phase 2** — not yet started; awaits user sign-off on P1.

---

## 9. Frontend agent rules (Next.js bundled)

`frontend/AGENTS.md` is generated by `create-next-app` and
instructs agents to read `frontend/node_modules/next/dist/docs/`
before writing Next.js code. **Obey it.** That file is for the
Next.js-specific rules; this file is for everything else.

---

## 10. Updating tracking files (mandatory)

Every time you finish a unit of work — feature, fix, refactor,
infra change — you **must**:

1. Append to `PROGRESS.md` (newest entry at the top), including:
   - Date (UTC), commit SHA (if committed), phase tag, what shipped,
     what was verified, what is now deferred or broken.
2. Update `TESTING_CHECKLIST.md`:
   - Add new items for anything that should be tested.
   - Tick items that are now covered by automated tests.
   - Leave items unchecked if they require manual verification —
     they become the user's review checklist.

If you finish a task and do **not** touch these two files, your
work is incomplete.

---

## 11. When in doubt

- Re-read `master-prompt.txt` Section 0.
- Ask the user. Do not guess on:
  - Brand voice / copy wording.
  - Whether a change is in scope for the current phase.
  - Whether to install or upgrade a major dependency.
  - Anything irreversible (force push, schema drop, rm).
