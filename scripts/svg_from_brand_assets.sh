#!/usr/bin/env bash
# Regenerate docs/svg/ from the brand source files in docs/.
#
# Outputs:
#   - docs/svg/variaciones de color en png/*.svg + *.min.svg   (lossless, 16)
#   - docs/svg/Logo png sin fondo/*.svg       + *.min.svg     (lossless, 4)
#   - docs/svg/B&W/*.svg                      + *.min.svg     (lossless, 4)
#   - docs/svg/letras separadas wayka/*.svg   + *.min.svg     (traced, 4)
#
# The first 24 are lossless extractions from the Illustrator source PDF
# (each variant is one page). The last 4 are traced from PNG with potrace
# because we do not have a separate vector source for the letter frames.
#
# Dependencies (install once):
#   brew install pdf2svg potrace netpbm
#
# SVGO is invoked via pnpm dlx using frontend/package.json as the
# project root, so no global Node install is required.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- Sanity checks -----------------------------------------------------------

for bin in pdf2svg potrace pngtopam pamtopnm ppmtopgm pgmtopbm pnminvert python3; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "missing dependency: $bin" >&2
    echo "install with: brew install pdf2svg potrace netpbm" >&2
    exit 1
  fi
done

SRC_PDF="docs/variaciones de color en png/wayka logo variaciones color .pdf"
if [[ ! -f "$SRC_PDF" ]]; then
  echo "missing source PDF: $SRC_PDF" >&2
  exit 1
fi

OUT_COLOR="docs/svg/variaciones de color en png"
OUT_NOBG="docs/svg/Logo png sin fondo"
OUT_BW="docs/svg/B&W"
OUT_LETTERS="docs/svg/letras separadas wayka"
mkdir -p "$OUT_COLOR" "$OUT_NOBG" "$OUT_BW" "$OUT_LETTERS"

# --- Phase A: lossless extraction (24 vector pages -> 24 SVGs) ---------------

echo "Phase A: extracting 24 vector pages from $SRC_PDF"

for n in $(seq -w 1 16); do
  pdf2svg "$SRC_PDF" "$OUT_COLOR/wayka logo variaciones color-${n}.svg" "$((10#$n))"
done
for n in 17 18 19 20; do
  pdf2svg "$SRC_PDF" "$OUT_NOBG/wayka logo variaciones color-${n}.svg" "$n"
done
for n in 21 22 23 24; do
  pdf2svg "$SRC_PDF" "$OUT_BW/wayka logo variaciones color-${n}.svg" "$n"
done

# --- Phase B: trace letter frames (4 PNGs -> 4 SVGs) ------------------------

echo "Phase B: tracing 4 letter frames with potrace"

for n in 08 09 10 11; do
  src="docs/letras separadas wayka/wayka letras-${n}.png"
  out="$OUT_LETTERS/wayka letras-${n}.svg"
  # PNG -> RGB -> grayscale -> 1-bit threshold @ 0.5 -> invert (so the
  # lighter letters become black foreground) -> potrace SVG.
  pngtopam "$src" 2>/dev/null \
    | pamtopnm 2>/dev/null \
    | ppmtopgm 2>/dev/null \
    | pgmtopbm -threshold -value=0.5 2>/dev/null \
    | pnminvert 2>/dev/null \
    | potrace -b svg -o "$out" - 2>/dev/null
  # Make letter SVGs theme-aware: black fill -> currentColor.
  python3 -c "
from pathlib import Path
p = Path('$out')
p.write_text(p.read_text().replace('fill=\"#000000\"', 'fill=\"currentColor\"'))
"
done

# --- Phase C: clean each SVG (strip AI/Inkscape metadata, fix viewBox) -------

echo "Phase C: cleaning SVG metadata"
python3 "$ROOT/scripts/clean_svg.py" docs/svg

# --- Phase D: minify each cleaned SVG with SVGO ------------------------------

echo "Phase D: minifying with SVGO (via pnpm dlx)"
(
  cd "$ROOT/frontend"
  while IFS= read -r -d '' f; do
    out="${f%.svg}.min.svg"
    pnpm dlx svgo --multipass --quiet -i "$f" -o "$out"
  done < <(find "$ROOT/docs/svg" -name "*.svg" -not -name "*.min.svg" -print0)
)

# --- Done --------------------------------------------------------------------

echo
echo "Generated:"
find docs/svg -name "*.svg" | sort
echo
du -sh docs/svg
