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
 *
 * `stale` IS DIFFERENT, AND IT OUTRANKS `built N` (#827). The other counts describe what the run did;
 * this one describes what the FILE still holds — members whose plan has moved since they were written,
 * which this build deliberately did not replace. A run that added 100 members and left 548 stale led with
 * "built 100" under the old precedence, and the 548 were the fact the designer needed. It ranks below real
 * misses because a miss is something that did not resolve at all, which is more actionable.
 *
 * `✓ already built` is the verdict this exists to stop being reachable over a stale set: it asserts the
 * file holds what was asked for, and a name match was never evidence of that.
 */
export const componentHeadline = (added: number, skipped: number, misses: number, stale = 0): string => {
  if (added === 0 && skipped === 0 && stale === 0) return '✗ nothing built';
  if (misses > 0) return `⚠ ${misses} miss${misses === 1 ? '' : 'es'}`;
  if (stale > 0) return `⚠ ${stale} stale`;
  if (added === 0) return '✓ already built';
  return `✓ built ${added} variant${added === 1 ? '' : 's'}`;
};

/**
 * WHY A STALE MEMBER WAS LEFT ALONE, said ONCE (#827) — the sentence the designer reads after the pill.
 *
 * Once rather than per member, because the per-member `misses` line already names each one and a 648-member
 * set would otherwise repeat this same reasoning 648 times.
 *
 * THE REASON SITS IN THE SAME SENTENCE AS THE OUTCOME, deliberately — "left in place, BECAUSE rebuilding
 * would orphan…", not two sentences with the remedy standing alone. "Delete the set or use a fresh page" on
 * its own reads as the tool failing and handing the work back. The build did not fail: it declined a repair
 * that would have cost more than the defect, and the designer cannot weigh that without the reason — a
 * rebuild replaces the component node, and an instance tracks its main component by id, so it would orphan
 * work already placed. Stated in `docs/voice-standard.md`'s terms: recessive, and honest about what it did
 * rather than instructing from nowhere.
 *
 * The engine version is REPORTED here and nowhere compared. It is the answer to "which build is this?",
 * which the panel could not previously give at all (#836) — and it is deliberately not part of the staleness
 * test, because `ENGINE_VERSION` bumps on a pure value change and would otherwise flag every member in the
 * file as stale the day a brand's hue moves.
 *
 * `null` when nothing is stale, so the caller appends nothing rather than an empty clause.
 */
export const staleNote = (stale: number, engineVersion: string): string | null => {
  if (stale === 0) return null;
  const one = stale === 1;
  return (
    `${stale} member${one ? '' : 's'} in this set ${one ? 'was' : 'were'} built from an earlier plan and ${one ? 'was' : 'were'} left in place, ` +
    `because rebuilding ${one ? 'it' : 'them'} would orphan any instance you have already placed — an instance tracks its main component by id. ` +
    `This build is engine ${engineVersion}; to pick it up, delete ${one ? 'that member' : 'those members'} and run again, or build into a fresh page.`
  );
};

/**
 * WHAT A FAILED BUILD LEFT IN THE FILE (#913) — the facts the executor collects on its failure path,
 * declared HERE rather than in `write-components.ts` so the two prose builders below can be pure and the
 * executor can import the shape it fills. One declaration, two importers; the alternative is two copies
 * of a five-field record that drift the first time a field is added.
 *
 * `loose` and `parked` are separate numbers on purpose, and the difference is the whole reason the
 * marking is allowed to fail: the nodes exist either way, and only their WHEREABOUTS depend on a write
 * that a refusing host may refuse a second time. A single `parked` count would make a failed marking
 * report zero nodes in the file, which is the one thing this must never say.
 */
export type PartialWriteFacts = {
  /** Nodes this run created and left at the top level of the page. Figma parents a created node to the
   *  current page immediately, so these are visible objects a designer would meet, not local variables. */
  loose: number;
  /** How many of those are now inside `frame`. Equal to `loose` when the marking succeeded. */
  parked: number;
  /** The marking frame's name, or `null` when the frame could not be made at all. */
  frame: string | null;
  /** Members this run appended into a set that was ALREADY in the file. A partial write that is not
   *  loose — it is in the place the designer expects — so it is named and never moved. */
  intoExistingSet: number;
  /** The MARKING's own failure, if it had one. Reported beside the cause and never in place of it. */
  markError: string | null;
};

/**
 * The verdict pill for a build that threw with something already in the file (#913).
 *
 * A THIRD FUNCTION rather than a fourth branch of `componentHeadline`, because the counts mean something
 * else: `added`/`skipped`/`misses` describe a run that finished, and this describes one that did not. The
 * pill has to carry the number, which is the whole reason this is not `APPLY_FAILED_HEADLINE`: a build
 * that leaves TWO nodes behind and one that leaves 648 both read `✗ write failed` otherwise, and the
 * two-node case is the one a designer overlooks and then re-runs on top of.
 *
 * ≤24 chars at every count this can reach — asserted over a range in `test-apply-summary.ts`, the same
 * probe that caught `applyHeadline`'s 27-character reading.
 */
export const partialWriteHeadline = (f: PartialWriteFacts): string => {
  if (f.loose > 0) return `✗ failed, ${f.loose} parked`;
  if (f.intoExistingSet > 0) return `✗ failed, ${f.intoExistingSet} in set`;
  return APPLY_FAILED_HEADLINE;
};

/**
 * The clause appended to the failure summary — WHERE the partial write is, in a designer's terms.
 *
 * Written as one sentence per fact rather than a table, because it lands in a chrome row beside the
 * host's own error message and is read once. The undo advice carries no keyboard shortcut: the panel runs
 * on macOS and Windows, and naming one key would be wrong for half the audience.
 *
 * ONE UNDO STEP IS THE CLAIM, and it rests on a measured fact rather than on Figma's documentation:
 * `figma.commitUndo()` is called nowhere in this plugin, so a whole run collapses into a single undo
 * entry and one undo unwinds the entire partial build. That is also why the executor does not delete
 * what it wrote — the unwind already exists, on a path that does not need a host that has just started
 * refusing calls to accept 648 more.
 */
export const partialWriteNote = (f: PartialWriteFacts): string => {
  const parts: string[] = [];
  if (f.loose > 0)
    parts.push(
      f.frame && f.parked === f.loose
        ? `${f.loose} node${f.loose === 1 ? '' : 's'} had already reached the file; ${f.loose === 1 ? 'it is' : 'they are'} parked in the frame '${f.frame}' on this page`
        : f.frame
          ? `${f.loose} node${f.loose === 1 ? '' : 's'} had already reached the file; ${f.parked} of them are parked in the frame '${f.frame}' and ${f.loose - f.parked} are still loose on this page`
          : `${f.loose} node${f.loose === 1 ? '' : 's'} had already reached the file and could not be gathered into a frame, so ${f.loose === 1 ? 'it is' : 'they are'} loose on this page`,
    );
  if (f.intoExistingSet > 0)
    parts.push(`${f.intoExistingSet} member${f.intoExistingSet === 1 ? '' : 's'} had already been added to the set that was in the file, where ${f.intoExistingSet === 1 ? 'it remains' : 'they remain'}`);
  if (f.markError) parts.push(`marking the leftovers also failed (${f.markError})`);
  if (parts.length === 0) return '';
  return ` — ${parts.join('; ')}. One undo removes the whole build.`;
};
