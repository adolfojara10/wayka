/**
 * Tests for `app/robots.ts`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("app/robots.ts", () => {
  it("allows everything and disallows /api/", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://wayka.cr");
    const r = robots();
    expect(Array.isArray(r.rules)).toBe(true);
    const rules = r.rules as { userAgent: string; allow?: string; disallow?: string | string[] }[];
    expect(rules[0].userAgent).toBe("*");
    expect(rules[0].allow).toBe("/");
    expect(rules[0].disallow).toEqual(["/api/"]);
  });

  it("points the sitemap at NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://wayka.cr");
    const r = robots();
    expect(r.sitemap).toBe("https://wayka.cr/sitemap.xml");
    expect(r.host).toBe("https://wayka.cr");
  });

  it("normalizes trailing slashes on NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://wayka.cr/");
    const r = robots();
    expect(r.sitemap).toBe("https://wayka.cr/sitemap.xml");
  });
});
