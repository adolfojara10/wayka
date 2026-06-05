import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_STORAGE_KEY } from "@/lib/theme";

interface MatchMediaController {
  matches: boolean;
  trigger: (matches: boolean) => void;
}

/**
 * Install a controllable `matchMedia` mock for the duration of a test.
 * Returns a controller so the test can flip `prefers-color-scheme` live.
 */
function mockMatchMedia(initialMatches: boolean): MatchMediaController {
  let currentMatches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const mql = {
    get matches() {
      return currentMatches;
    },
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => {
      listeners.add(cb);
    },
    removeEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    },
    addListener: (cb: (event: MediaQueryListEvent) => void) => {
      listeners.add(cb);
    },
    removeListener: (cb: (event: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    },
    dispatchEvent: () => true,
  };

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mql),
  });

  return {
    get matches() {
      return currentMatches;
    },
    trigger(matches: boolean) {
      currentMatches = matches;
      const event = { matches } as MediaQueryListEvent;
      listeners.forEach((cb) => cb(event));
    },
  };
}

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("<ThemeToggle />", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("respects prefers-color-scheme when no stored preference exists", () => {
    mockMatchMedia(true); // OS prefers dark
    renderToggle();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByRole("button")).toHaveAttribute("data-theme-choice", "system");
  });

  it("cycles light → dark → system and toggles the .dark class accordingly", async () => {
    mockMatchMedia(false); // OS prefers light → resolved("system") = light
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    const user = userEvent.setup();
    renderToggle();

    const button = screen.getByRole("button");

    // Initial: light
    expect(button).toHaveAttribute("data-theme-choice", "light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // Click → dark
    await user.click(button);
    expect(button).toHaveAttribute("data-theme-choice", "dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Click → system (and OS prefers light, so .dark is removed)
    await user.click(button);
    expect(button).toHaveAttribute("data-theme-choice", "system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists the user choice to localStorage under the wayka-theme key", async () => {
    mockMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole("button"));

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("reacts live to OS-level prefers-color-scheme changes while in 'system' mode", () => {
    const controller = mockMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "system");
    renderToggle();

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() => controller.trigger(true));
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => controller.trigger(false));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("exposes an accessible label that reflects the current theme", () => {
    mockMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    renderToggle();

    expect(screen.getByRole("button")).toHaveAccessibleName(/tema claro/i);
  });
});
