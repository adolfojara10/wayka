/**
 * Meta Pixel placeholder — INTENTIONALLY DISABLED in Phase 5.
 *
 * Per the master prompt §P5.2: "scaffold a clearly-commented,
 * **disabled placeholder** so it can be activated later if
 * Instagram/Facebook ads launch (huge channel in Costa Rica)."
 *
 * This component always returns `null`. It exists so:
 *
 *   1. The Meta Pixel decision lives next to GA4 / Clarity in
 *      `components/analytics/` — easy to find when it's time to
 *      activate.
 *   2. The env var (`NEXT_PUBLIC_META_PIXEL_ID`) is documented in
 *      `.env.example` already and tests pin that no script renders.
 *
 * ACTIVATION CHECKLIST (do this when launching Meta ads):
 *
 *   1. Set `NEXT_PUBLIC_META_PIXEL_ID` in the deployed env.
 *   2. Uncomment the script block below and swap the early-return.
 *   3. Add Meta's preferred standard events (ViewContent, AddToCart,
 *      InitiateCheckout) by wiring them through `lib/analytics.ts`
 *      so the existing trackXxx helpers can fan out to fbq.
 *   4. Update the consent disclosure in `Footer.tsx`.
 *   5. Test with the Meta Pixel Helper Chrome extension.
 *   6. Remove this comment block.
 */

export function MetaPixel() {
  // Placeholder is intentionally disabled — no script is rendered
  // even when the env var is set. Activation requires uncommenting
  // the block below per the checklist above.
  return null;

  // Activation block (intentionally commented out):
  // const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  // if (!pixelId) return null;
  //
  // const loader = `!function(f,b,e,v,n,t,s)
  //   {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  //   n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  //   if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  //   n.queue=[];t=b.createElement(e);t.async=!0;
  //   t.src=v;s=b.getElementsByTagName(e)[0];
  //   s.parentNode.insertBefore(t,s)}(window, document,'script',
  //   'https://connect.facebook.net/en_US/fbevents.js');
  //   fbq('init', ${JSON.stringify(pixelId)});
  //   fbq('track', 'PageView');`;
  //
  // return (
  //   <Script id="wayka-meta-pixel" strategy="lazyOnload"
  //     dangerouslySetInnerHTML={{ __html: loader }} />
  // );
}
