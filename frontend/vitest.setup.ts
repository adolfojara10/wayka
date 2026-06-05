import "@testing-library/jest-dom/vitest";

import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Minimal in-memory Storage implementation matching the Web Storage API.
 *
 * Why we need this: Node 22+ ships a built-in (stubbed) `globalThis.localStorage`
 * gated behind the `--webstorage` flag (default on in Node 25). Vitest's
 * jsdom environment aliases `window` to `globalThis`, so the Node stub
 * shadows jsdom's real Storage and `window.localStorage.clear` ends up
 * undefined. We install our own shim to get deterministic, isolated
 * behavior across Node versions.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function installStorage(name: "localStorage" | "sessionStorage"): void {
  const storage = new MemoryStorage();
  Object.defineProperty(window, name, {
    configurable: true,
    writable: true,
    value: storage,
  });
  if (typeof globalThis !== "undefined" && globalThis !== window) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: storage,
    });
  }
}

installStorage("localStorage");
installStorage("sessionStorage");

/**
 * jsdom does not implement `window.matchMedia`. The theme system relies on
 * it; each test installs its own controllable mock as needed.
 */
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.classList.remove("dark");
  document.documentElement.style.colorScheme = "";
});
