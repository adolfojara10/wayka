# Contributing to Wayka

Thanks for working on Wayka. This document captures the conventions every
contribution must follow.

---

## Conventional Commits

Every commit message must follow
[Conventional Commits 1.0](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short imperative summary>

<optional body explaining the why>

<optional footer(s)>
```

### Allowed types

| Type        | When to use it                                            |
| ----------- | --------------------------------------------------------- |
| `feat`      | A new user-facing feature                                 |
| `fix`       | A bug fix                                                 |
| `chore`     | Tooling, deps, config, repo housekeeping                  |
| `docs`      | Documentation only                                        |
| `refactor`  | Code change that neither fixes a bug nor adds a feature   |
| `perf`      | Performance improvement                                   |
| `test`      | Adding or correcting tests                                |
| `ci`        | CI configuration changes                                  |
| `style`     | Formatting only (no logic change)                         |
| `build`     | Build system / dependencies that affect the build         |
| `revert`    | Revert a previous commit                                  |

### Examples

```
feat(catalog): add seasonal product badge
fix(theme): prevent flash of incorrect theme on first paint
chore: bump django to 5.2.4
docs(readme): document pnpm install step
ci: cache pnpm store between runs
```

A breaking change is marked with `!` after the type/scope, e.g.
`feat(api)!: drop legacy /v0 endpoints`.

---

## Branch naming

Use the same prefixes as commit types:

```
feat/cart-whatsapp-link
fix/header-mobile-overflow
chore/upgrade-next-15-2
docs/contrast-table
```

---

## Before you push

1. **Backend**
   ```bash
   ruff check .
   black --check .
   python manage.py test
   ```
2. **Frontend**
   ```bash
   pnpm lint
   pnpm test:ci
   pnpm build
   ```

CI runs the same commands; failing locally = failing on the PR.

---

## Pull requests

- Keep PRs focused. Small, reviewable changes ship faster.
- Fill in the PR template.
- Include a screenshot or short clip for any UI change.
- Link related issues with `Closes #N`.

---

## Framework notes (gotchas)

### Next.js 15 — async dynamic APIs

In Next.js 15 the following are **async** and must be `await`-ed in Server
Components and route handlers:

```ts
const cookieStore = await cookies();
const headerList = await headers();
const { slug } = await params;
const search = await searchParams;
```

Forgetting `await` will not always fail loudly during development but will
break in production builds. If you copy a snippet from older Next docs,
double-check this.

### Django

- `LANGUAGE_CODE = "es-cr"`, `TIME_ZONE = "America/Costa_Rica"` are project
  defaults — don't change without discussion.
- All admin-facing strings should be Spanish (Costa Rica).
- Never commit `db.sqlite3`, `.env`, or anything inside `backend/media/`.

---

## Questions?

Open a draft PR or an issue. Don't sit on a blocker.
