"use client";

/**
 * Microsoft Clarity bootstrap — gated on `NEXT_PUBLIC_CLARITY_PROJECT_ID`.
 *
 * Renders nothing when the env var is empty (zero perf cost). When
 * set, injects the Clarity loader via `next/script` with
 * `strategy="lazyOnload"` so it never blocks render or contributes
 * to CWV.
 */

import Script from "next/script";

export function Clarity() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId) return null;

  // Inline loader straight from Clarity's docs. We only ever execute
  // this when projectId is set, and projectId is interpolated as a
  // JS string literal — Clarity project IDs are short alphanumeric
  // tokens so there is no injection surface.
  const loader = `(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", ${JSON.stringify(projectId)});`;

  return (
    <Script
      id="wayka-clarity"
      strategy="lazyOnload"
      data-testid="clarity-script"
      dangerouslySetInnerHTML={{ __html: loader }}
    />
  );
}
