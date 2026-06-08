import type { NextConfig } from "next";

/**
 * Build an `images.remotePatterns` allowlist for the Django host
 * derived from `NEXT_PUBLIC_API_URL`. This lets `<Image>` load
 * uploaded product photos straight from Django's `/media/` while
 * still benefiting from Next's WebP/AVIF optimization pipeline.
 *
 * Falls back to localhost so `pnpm dev` works out of the box.
 */
function apiHostPattern() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
  try {
    const url = new URL(raw);
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/media/**",
    };
  } catch {
    return {
      protocol: "http" as const,
      hostname: "localhost",
      port: "8000",
      pathname: "/media/**",
    };
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [apiHostPattern()],
  },
};

export default nextConfig;
