import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Inline, render-blocking script that applies the correct theme class to
 * `<html>` **before** the browser paints. This prevents the "flash of
 * incorrect theme" (FOUC) that would otherwise occur between server-rendered
 * HTML and the first client render.
 *
 * The script is intentionally tiny and dependency-free so it can run from a
 * single `<script>` tag in `<head>`.
 */
export function ThemeScript() {
  const storageKey = THEME_STORAGE_KEY;

  // Keep this snippet minimal — it runs synchronously before paint.
  const code = `
(function () {
  try {
    var stored = localStorage.getItem(${JSON.stringify(storageKey)});
    var choice = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = choice === 'system' ? (prefersDark ? 'dark' : 'light') : choice;
    var root = document.documentElement;
    if (resolved === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    root.style.colorScheme = resolved;
  } catch (e) {
    /* fail silently — defaults to light */
  }
})();
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
