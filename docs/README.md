# Wayka — brand assets

This folder holds the master brand document, every logo variant we
have on hand, and the accessibility notes that govern how we use
them. Nothing here is wired into the frontend yet — that work starts
in Phase 2 (catalog + imagery). For now, this README exists so that
future agents (and humans) can pick the right asset without opening
every folder.

---

## Files at the root

| Path                 | What it is                                                       |
| -------------------- | ---------------------------------------------------------------- |
| `wayka.pdf`          | Master brand & vision document. Authoritative source for voice, palette, mood, and identity. Treat as persistent context alongside `master-prompt.txt`. |
| `contrast.md`        | WCAG 2.1 contrast ratios for every brand color pair, with usage rules per accent. Recompute and update if the palette ever changes. |

---

## Asset folders

All four folders below were exported from the same Illustrator source
(`variaciones de color en png/wayka logo variaciones color.ai`). The
trailing number in each PNG filename is the export index from that
file, not a quality grade.

### `variaciones de color en png/`

Full-color logo variants — 16 PNGs (`...-01.png` … `...-16.png`) plus
the source `.ai` and a combined `.pdf` proof sheet.

Use these for any context where the full Wayka palette is welcome:
the hero, the favicon source, OG/Twitter cards, social avatars,
print collateral.

### `Logo png sin fondo/`

Transparent-background logos — 4 PNGs (`...-17.png` … `...-20.png`).

Use these whenever the logo sits on top of a photographic or
colored background and you don't want a solid plate behind it.

### `B&W/`

Black-and-white logo variants — 4 PNGs (`...-21.png` … `...-24.png`).

Use these for single-color contexts: email signatures, fax/print
fallbacks, embossing, watermarks, and any place the full palette
would be distracting or unreproducible.

### `letras separadas wayka/`

Individual letter marks — 4 PNGs (`wayka letras-08.png` …
`wayka letras-11.png`). Each frame isolates one or more letters of
the "WAYKA" wordmark.

Reserved for the animated wordmark reveal we want on the landing
hero (Framer Motion staggered fade-in, see Phase 2 plan). Do not
use these as standalone logos.

---

## Picking a variant (quick guide)

| Context                                  | Folder to pull from                       |
| ---------------------------------------- | ----------------------------------------- |
| Landing hero on `cream` background       | `variaciones de color en png/` (light bg) |
| Landing hero on `ink` background         | `variaciones de color en png/` (dark bg)  |
| Logo over a product photo                | `Logo png sin fondo/`                     |
| Favicon source / app icons               | `variaciones de color en png/`            |
| Email signature, print, single-color     | `B&W/`                                    |
| Animated hero reveal                     | `letras separadas wayka/`                 |

Always cross-check the resulting color pair against `contrast.md`
before shipping — especially if the logo sits next to text.

---

## When you add a new asset

1. Drop it in the appropriate folder above (or create a new folder
   with a clear, Spanish-friendly name and document it here).
2. Update this README's tables.
3. If the asset changes how a brand color is used, recompute
   `contrast.md`.
4. Append a row to `PROGRESS.md`.
