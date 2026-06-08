/**
 * Display helpers for the Wayka frontend.
 *
 * The backend already returns pre-formatted CRC strings per variant
 * (`price_crc`, e.g. `"₡ 7 500"`). These helpers exist for derived
 * client-side displays (cart totals, recommendations) where the
 * frontend needs to format a number itself.
 *
 * Keeps the formatter behavior consistent with the backend's Python
 * implementation in `backend/catalog/serializers.py::format_crc`.
 */

/**
 * Format a number as a Costa Rican colón price string, e.g.
 * `formatCrc(7500) === "₡\u00a07\u00a0500"`.
 *
 * Uses U+00A0 (non-breaking space) as thousands separator to match
 * the Costa Rica convention and avoid awkward line wraps in the UI.
 * Rounds half-up to the nearest whole colón.
 */
export function formatCrc(amount: number): string {
  if (!Number.isFinite(amount)) return "₡\u00a00";
  const rounded = Math.sign(amount) * Math.floor(Math.abs(amount) + 0.5);
  const nbsp = "\u00a0";
  const sign = rounded < 0 ? "-" : "";
  const digits = String(Math.abs(rounded));
  let grouped = "";
  for (let i = 0; i < digits.length; i++) {
    const fromRight = digits.length - 1 - i;
    if (i > 0 && fromRight % 3 === 2) {
      grouped += nbsp;
    }
    grouped += digits[i];
  }
  return `${sign}₡${nbsp}${grouped}`;
}
