/**
 * Tests for the Meta Pixel placeholder.
 *
 * Pin the rule that **no Facebook script is ever rendered**, even
 * when the env var is set. Activation requires uncommenting the
 * script block in `MetaPixel.tsx` per the checklist there.
 */

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MetaPixel } from "@/components/analytics/MetaPixel";

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("MetaPixel placeholder", () => {
  it("renders nothing when env var is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "");
    const { container } = render(<MetaPixel />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("STILL renders nothing when env var is set (placeholder is disabled)", () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "1234567890");
    const { container } = render(<MetaPixel />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("never injects the facebook script src", () => {
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "1234567890");
    const { container } = render(<MetaPixel />);
    expect(container.innerHTML).not.toContain("connect.facebook.net");
    expect(container.innerHTML).not.toContain("fbevents.js");
  });
});
