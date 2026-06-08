"use client";

/**
 * Forwards Core Web Vitals (LCP, CLS, INP, FCP, TTFB) through the
 * centralized analytics utility.
 *
 * Once GA4 is wired (`NEXT_PUBLIC_GA4_MEASUREMENT_ID` is set), each
 * metric becomes a `web_vital` event in GA4 — basic real-user
 * monitoring without a separate RUM service.
 *
 * When GA4 is not configured, the events land in the in-memory
 * recorder for debugging via `__getRecordedEvents()`.
 */

import { useReportWebVitals } from "next/web-vitals";

import { recordWebVital } from "@/lib/analytics";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    recordWebVital({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    });
  });
  return null;
}
