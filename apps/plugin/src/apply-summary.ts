/**
 * The result HEADLINES — the ≤24-char verdicts the UI's status pills show. Two writes, two verdicts:
 * `applyHeadline` for the theme write (#110) and `componentHeadline` for the component build (#483).
 *
 * A separate module from `main.ts` for one reason: `main.ts` calls `figma.showUI` at module scope, so
 * nothing can import it and nothing about the apply path has ever been testable. This is the piece
 * worth gating — outcomes with an order of precedence and a plural — so it lives where a test
 * can reach it. `main.ts` builds the long `summary` prose beside these and hands both to the UI.
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

/**
 * The component build's verdict (#483) — same 24-char pill, a different question.
 *
 * A SECOND FUNCTION RATHER THAN A SECOND CALL TO `applyHeadline`, because the two writes do not have the
 * same outcomes. The theme write either binds or misses; a component build has a third state the theme
 * write cannot reach — **it ran and deliberately built nothing**, because the set was already in the file
 * and every member was skipped by name. Under `applyHeadline` that is `misses > 0` and reads as "⚠ 648
 * misses", i.e. the executor's idempotence reported as 648 failures. Re-running is a supported action
 * (`applyComponentPlan` is find-or-create + skip-by-name), so the verdict for it has to say so.
 *
 * Precedence, most actionable first:
 *   • nothing assembled — the hard failure: no set existed and no member built, so there is nothing in
 *     the file. Distinct from a throw, which has no counts at all.
 *   • misses — something did not resolve or did not stick. `skipped` is NOT among these; the caller
 *     passes the two counts separately for exactly that reason.
 *   • nothing new — every member was already there. A verdict, not a warning: the file already holds
 *     what was asked for.
 *   • built N.
 *
 * `skipped` reaching the pill only in the all-skipped case is deliberate: a partial re-run (some
 * skipped, some added) leads with what it ADDED, since that is the change to the file, and the detail
 * behind the pill carries both counts.
 */
export const componentHeadline = (added: number, skipped: number, misses: number): string => {
  if (added === 0 && skipped === 0) return '✗ nothing built';
  if (misses > 0) return `⚠ ${misses} miss${misses === 1 ? '' : 'es'}`;
  if (added === 0) return '✓ already built';
  return `✓ built ${added} variant${added === 1 ? '' : 's'}`;
};
