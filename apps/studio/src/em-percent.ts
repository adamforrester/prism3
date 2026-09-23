/**
 * Letter-spacing em → percent reading-aid label (#1590).
 *
 * The studio shows tracking in em because em is the stored, authoritative value the engine emits.
 * But a designer — and Figma — reads tracking in PERCENT, and `-0.02em` says nothing until you know
 * it is −2%. Letter-spacing em is percent-of-font-size, so the conversion is exact: 1em = 100%, i.e.
 * percent = em × 100.
 *
 * DISPLAY ONLY: this never changes a stored value. The em stays primary at every render site and this
 * returns the percent alongside it as a reading aid (`-0.02em · −2%`).
 *
 * It lives in its own pure module — not inside `main.ts`, which touches `document` at import and so
 * cannot load under `tsx` — for the same reason `provenance.ts` and `export-settings.ts` do: it is the
 * one place the ×100 rule lives, so the rule is unit-tested by name in `test-em-percent.ts` and every
 * UI site drives this function rather than repeating the arithmetic.
 *
 * Trailing zeros are stripped so a rung reads `−1.5%`, not `−1.50%`, and negatives use a real minus
 * sign (−, U+2212), not a hyphen. Zero and positives carry no sign (`0%`, `3%`).
 */
export const emToPercentLabel = (em: number): string => {
  // Round away binary-float noise (−0.015 × 100 = −1.4999…) before formatting. The em ladder steps in
  // 0.005 increments — half-percent steps — so three decimal places of percent is ample headroom, and
  // Number→String then drops trailing zeros for free (1.5 → "1.5", 2 → "2").
  const pct = Math.round(em * 100 * 1000) / 1000;
  return `${pct < 0 ? '−' : ''}${String(Math.abs(pct))}%`;
};
