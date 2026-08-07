/**
 * The apply-result HEADLINE — the ≤24-char verdict the UI's status pill shows.
 *
 * A separate module from `main.ts` for one reason: `main.ts` calls `figma.showUI` at module scope, so
 * nothing can import it and nothing about the apply path has ever been testable. This is the piece
 * worth gating — three outcomes with an order of precedence and a plural — so it lives where a test
 * can reach it. `main.ts` builds the long `summary` prose beside this and hands both to the UI.
 *
 * Why a headline at all: the summary is ~150 characters of counts across five axes, and the bar has
 * room for a pill. The UI was clipping it with `text-overflow:ellipsis` at 220px, so a result reading
 * "…, 4 misses" rendered as "palette 118 (+0), color 2…" — the miss count computed correctly and then
 * discarded at the CSS layer. Deriving the verdict from the COUNTS rather than by re-reading the prose
 * keeps the summary's wording free to change without silently changing what the pill claims.
 *
 * PURE — no `figma.*`, no DOM. Compiles under both tsconfigs.
 */

/** Precedence, most actionable first:
 *   • misses — the theme named a variable this file does not have, so something did not bind. The
 *     designer can act on it (write the palette first, or check the name).
 *   • skipped fonts — the variables wrote and some Text Styles did not, because Figma cannot load the
 *     face. Reported even though the write is `ok`: "3 skipped" is a fact a bare "✓ applied" hides,
 *     and it is the difference between a complete type ramp and a partial one.
 *   • clean.
 *
 * Both counts are reported when both are non-zero — misses lead, and the detail behind the pill
 * carries the skipped names. A pill cannot hold two clauses at pill width. */
export const applyHeadline = (misses: number, skippedFonts: number): string => {
  if (misses > 0) return `⚠ ${misses} miss${misses === 1 ? '' : 'es'}`;
  // "skipped" carries no noun on purpose. `font-skipped` read better and did not FIT: the count is
  // interpolated, so at three digits the headline ran to 27 characters and blew the pill budget this
  // field exists to respect — caught by the test's range probe, not by reading it. The detail behind the
  // pill names the styles and the reason ("N text styles skipped (font unavailable: …)"), so the pill
  // only has to say that something was, and the caret invites the rest.
  if (skippedFonts > 0) return `✓ applied, ${skippedFonts} skipped`;
  return '✓ applied';
};

/** A thrown write is the one case with no counts: nothing partial is claimed. The message is the whole
 *  of what is known, and it goes in the detail — the pill only says which of the three states this is. */
export const APPLY_FAILED_HEADLINE = '✗ write failed';
