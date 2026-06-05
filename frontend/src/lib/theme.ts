/**
 * Shared types and constants for the Wayka theme system.
 *
 * The theme system supports three user choices: an explicit "light" or
 * "dark" preference, or "system" which follows the OS preference live.
 * The user's choice is persisted to localStorage under {@link THEME_STORAGE_KEY}.
 */

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "wayka-theme";
export const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];

/** Type guard for values read from `localStorage` (which returns `string | null`). */
export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Resolve a {@link ThemeChoice} into the concrete theme the document should
 * render. When the choice is "system", consult the provided
 * `prefers-color-scheme` media query result.
 */
export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  if (choice === "system") {
    return prefersDark ? "dark" : "light";
  }
  return choice;
}
