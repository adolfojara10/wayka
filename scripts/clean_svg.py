#!/usr/bin/env python3
"""Clean pdf2svg output: strip metadata, remove fixed width/height so the SVG
scales via CSS, ensure viewBox is present and well-formed."""

from __future__ import annotations

import re
import sys
from pathlib import Path

NS_PREFIXES = ("sodipodi:", "inkscape:", "i:", "ai:", "x:")


def clean_one(path: Path) -> tuple[int, int]:
    original = path.read_text(encoding="utf-8")
    text = original

    # Drop XML declaration; not needed when SVG is inlined or served as image/svg+xml.
    text = re.sub(r"<\?xml[^?]*\?>\s*", "", text)

    # Strip Illustrator / Inkscape namespace attributes on the <svg> root.
    for ns in NS_PREFIXES:
        text = re.sub(rf'\s+xmlns:{ns[:-1]}="[^"]*"', "", text)
        text = re.sub(rf"\s+{ns}[a-zA-Z0-9_-]+=\"[^\"]*\"", "", text)

    # Remove fixed width="..." and height="..." on the root <svg ...> only, so the
    # SVG scales with its CSS container. Keep the viewBox intact.
    def _strip_dims(match: re.Match[str]) -> str:
        tag = match.group(0)
        tag = re.sub(r'\s+(width|height)="[^"]*"', "", tag)
        return tag

    text = re.sub(r"<svg\b[^>]*>", _strip_dims, text, count=1)

    # Guarantee xmlns is present (pdf2svg always emits it, but belt and braces).
    if "xmlns=" not in text:
        text = text.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"', 1)

    # Collapse multiple blank lines that the strips above can leave behind.
    text = re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"

    path.write_text(text, encoding="utf-8")
    return len(original), len(text)


def main(roots: list[str]) -> int:
    files = []
    for root in roots:
        files.extend(sorted(Path(root).rglob("*.svg")))

    total_before = total_after = 0
    for f in files:
        before, after = clean_one(f)
        total_before += before
        total_after += after
        delta = before - after
        print(f"  {f.name:60s} {before:>7} -> {after:>7}  (-{delta})")

    if files:
        print(
            f"\nCleaned {len(files)} files. "
            f"{total_before:,} -> {total_after:,} bytes "
            f"(-{total_before - total_after:,})"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or ["docs/svg"]))
