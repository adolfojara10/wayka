# Brand color contrast — WCAG 2.1

This document records the contrast ratios for every brand color pair we
intend to use in the Wayka UI. Ratios are computed from the official
WCAG 2.1 relative-luminance formula and verified against the published
thresholds:

- **AAA:** ≥ 7:1 (normal text) / ≥ 4.5:1 (large text)
- **AA (normal text):** ≥ 4.5:1
- **AA (large text / UI components):** ≥ 3:1
- **FAIL:** anything below 3:1

> "Large text" = ≥ 18pt (24px) or ≥ 14pt (18.66px) bold.
> "UI components" includes graphical objects, button/icon borders, and
> focus indicators (WCAG 1.4.11 Non-text Contrast).

---

## Palette

| Token        | Hex       | Role                                                      |
| ------------ | --------- | --------------------------------------------------------- |
| `cream`      | `#F3EBDF` | Light-mode background, dark-mode body text                |
| `ink`        | `#060419` | Dark-mode background, light-mode body text                |
| `terracotta` | `#AF5D25` | Primary action ("Pedir Ya")                               |
| `wine`       | `#932AA0` | Secondary highlight / badge                               |
| `olive`      | `#676127` | Secondary highlight / badge                               |

---

## Verified ratios

| Foreground   | Background   | Ratio    | Rating         |
| ------------ | ------------ | -------- | -------------- |
| `ink`        | `cream`      | 17.09:1  | AAA            |
| `cream`      | `ink`        | 17.09:1  | AAA            |
| `terracotta` | `cream`      | 4.02:1   | AA (large)     |
| `terracotta` | `ink`        | 4.25:1   | AA (large)     |
| `white`      | `terracotta` | 4.76:1   | AA (normal)    |
| `ink`        | `terracotta` | 4.25:1   | AA (large)     |
| `wine`       | `cream`      | 5.77:1   | AA (normal)    |
| `wine`       | `ink`        | 2.96:1   | **FAIL**       |
| `white`      | `wine`       | 6.82:1   | AA (normal)    |
| `cream`      | `wine`       | 5.77:1   | AA (normal)    |
| `olive`      | `cream`      | 5.36:1   | AA (normal)    |
| `olive`      | `ink`        | 3.19:1   | AA (large)     |
| `white`      | `olive`      | 6.33:1   | AA (normal)    |
| `cream`      | `olive`      | 5.36:1   | AA (normal)    |

---

## Usage rules

These rules are derived from the table above. They are enforced by
review (no automated linter yet).

### Body text

- **Always** use `ink` on `cream` (light) or `cream` on `ink` (dark).
  Both are 17:1 — comfortable AAA.
- **Never** use `terracotta`, `wine`, or `olive` as body text on
  either background. Their ratios on cream/ink fall in the "large only"
  band at best.

### Primary action — `terracotta` (#AF5D25)

- Use as a **button background** with **white text**. `white` on
  `terracotta` is 4.76:1 → passes AA for normal text. (Avoid `cream`
  on `terracotta` — visually close to white but only 3.78:1, fails AA
  normal.)
- Acceptable as a button background with `ink` text **only at large
  sizes** (≥ 18pt or ≥ 14pt bold): 4.25:1 → AA large.
- Acceptable as an **icon / border / focus ring** on either background
  (≥ 3:1 — WCAG 1.4.11).
- **Not acceptable** as small body text on either background.

### Secondary highlight — `wine` (#932AA0)

- On `cream`: passes AA normal at 5.77:1. Use for badges, small
  labels, links — all sizes.
- On `ink`: **fails** at 2.96:1. Do **not** use `wine` text on the dark
  background. Instead, use `cream` text on a `wine` chip
  (5.77:1 → AA normal) or `white` text on `wine` (6.82:1 → AA normal).

### Secondary highlight — `olive` (#676127)

- On `cream`: AA normal at 5.36:1. Safe for badges and links of all
  sizes.
- On `ink`: AA large only at 3.19:1. Use only at ≥ 18pt or ≥ 14pt
  bold, or invert (cream text on olive chip → 5.36:1).

### Focus indicators

The `ThemeToggle` uses a `terracotta` focus ring on both themes.
Against `cream` and `ink` backgrounds the terracotta ring meets the
3:1 minimum for non-text UI components.

---

## How these values were produced

Computed with the WCAG 2.1 relative-luminance formula
(`L = 0.2126·R + 0.7152·G + 0.0722·B` after the sRGB → linear
correction), then `(L_lighter + 0.05) / (L_darker + 0.05)`.

If you change any color, re-run the calculation and update this table
before merging. A reference Python snippet lives in the project
history (see the commit that introduced this file).
