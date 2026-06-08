/**
 * Static heading-hierarchy guard.
 *
 * Reads every `page.tsx` under `src/app/**` and asserts there is
 * exactly one `<h1` substring. Catches accidental hierarchy breaks
 * without booting React.
 *
 * Pages that legitimately don't have an h1 (e.g. loading skeletons,
 * route groups, error boundaries) live in non-page files so they're
 * already excluded.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, "..");

function walkForPages(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkForPages(full, out);
    } else if (entry === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

function countH1s(content: string): number {
  // Count `<h1` opening tags. Crude but sufficient — JSX literally
  // writes <h1 in the source. We don't have any false-positive
  // string literals in this repo.
  return (content.match(/<h1[\s>]/g) ?? []).length;
}

describe("heading hierarchy — every page.tsx has exactly one <h1>", () => {
  const pages = walkForPages(APP_DIR);

  expect(pages.length, "expected to find at least one page.tsx").toBeGreaterThan(0);

  for (const page of pages) {
    const relative = page.replace(APP_DIR, "src/app");
    it(relative, () => {
      const content = readFileSync(page, "utf-8");
      const count = countH1s(content);
      expect(count, `expected exactly one <h1 in ${page}`).toBe(1);
    });
  }
});
