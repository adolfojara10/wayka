/**
 * Tests for the Microsoft Clarity loader.
 */

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/script with a simple <script> renderer so jsdom can
// inspect what was emitted. In production next/script defers via
// Script's own runtime; for unit tests we want to see the inline
// payload directly.
vi.mock("next/script", () => ({
  default: ({
    children,
    dangerouslySetInnerHTML,
    ...props
  }: {
    children?: React.ReactNode;
    dangerouslySetInnerHTML?: { __html: string };
    [key: string]: unknown;
  }) =>
    dangerouslySetInnerHTML ? (
      <script
        {...(props as Record<string, unknown>)}
        dangerouslySetInnerHTML={dangerouslySetInnerHTML}
      />
    ) : (
      <script {...(props as Record<string, unknown>)}>{children}</script>
    ),
}));

import { Clarity } from "@/components/analytics/Clarity";

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Clarity loader", () => {
  it("renders nothing when env var is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "");
    const { container } = render(<Clarity />);
    expect(container.querySelector("script")).toBeNull();
  });

  it("emits a script with the project ID interpolated when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "abc123xyz");
    const { container } = render(<Clarity />);
    const script = container.querySelector("script");
    expect(script).not.toBeNull();
    expect(script?.innerHTML).toContain('"abc123xyz"');
    expect(script?.innerHTML).toContain("clarity.ms/tag/");
  });
});
