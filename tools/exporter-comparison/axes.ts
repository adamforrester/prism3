/**
 * AXIS IDENTITY, DECLARED (#697) — which axis a Figma collection's modes represent.
 *
 * This file is #697's recorded call, in the one form that cannot go stale: the classification the
 * decision arrived at, wired into the comparison so that mislabeling a collection breaks something.
 *
 * ── THE PROBLEM IT ANSWERS ──────────────────────────────────────────────────────────────────────
 *
 * A Figma variable can only vary a value BY MODE. There is no second mechanism. So an axis that is
 * not appearance — breakpoint, viewport — must also become modes in Figma. DTCG has a second option:
 * express the axis as PATH SEGMENTS (`grid.md.columns`), which is what the engine does, and why the
 * DTCG projection needs overlays for appearance only.
 *
 * The consequence is #697's core measurement: nb's Figma emission carries THREE mode axes
 * (appearance 4 / breakpoint 5 / viewport 2) against the projection's ONE. And the part that cannot
 * be engineered around: **nothing in a Figma file distinguishes them.** `color`'s modes are an
 * appearance axis, `layout`'s are breakpoints, `type-sets`' are viewport, and all three are just
 * named modes on a collection. An exporter reading the file cannot tell them apart.
 *
 * ── THE CALL ────────────────────────────────────────────────────────────────────────────────────
 *
 * #697 offered three options and no fourth: FLATTEN (lose axis identity), CARRY `$extensions`
 * (record it DTCG-ignorably), or BE TOLD (take it as configuration). The call is **be told, for the
 * round-trip; flatten, for a foreign import** — and the scoping question underneath is what forces
 * that split:
 *
 *   · (a) ROUND-TRIP — a file prism3 itself themed. The collections are the engine's own, so the
 *     axis of each one is known BEFORE the file is read. Being told is not a limitation here, it is
 *     just the truth: this table is the telling. A round-trip export can therefore carry a token
 *     contract, and this harness can hold it to one.
 *   · (b) FOREIGN IMPORT — any Figma file. The collections are whatever a designer made, so there is
 *     nothing to be told and no axis to recover. Flattening is correct there, and it is what
 *     TokenPress does today. No token contract is possible, and none is promised.
 *
 * Recorded in `docs/00-progress.md`; the reasoning that a `$extensions` carry is a THIRD thing rather
 * than an alternative is below.
 *
 * ── WHY NOT `$extensions`, GIVEN THE ENGINE ALREADY WRITES ONE ──────────────────────────────────
 *
 * Measured while taking this decision, and it changes the shape of the answer: the canonical tree
 * ALREADY carries `$extensions.prism3.figma` on 43–47% of its leaves, and for the breakpoint axis it
 * already carries exactly the triple this file would need — `{collection: 'layout', mode: 'sm',
 * variable: 'grid.columns'}` on `grid.sm.columns`, all 15–18 of them, in every brand. So option 2 is
 * not hypothetical; it is partly shipped.
 *
 * It is still not the answer to the axis question, for a reason worth writing down: that extension
 * records WHERE A TOKEN WENT, per leaf. It does not record WHAT THE COLLECTION'S MODES MEAN. Reading
 * `mode: 'sm'` tells you this leaf lives in the `sm` mode; it does not tell you that `sm` is a
 * breakpoint rather than an appearance, and a consumer needs the second fact to know whether the
 * modes are alternatives (pick one) or coordinates (all apply at different widths).
 *
 * So the two compose, and each does the job the other cannot:
 *   · this table   — the axis of each COLLECTION. Declared. Small, human, and per-brand-invariant.
 *   · `$extensions.prism3.figma` — the destination of each LEAF. Emitted. Per-token, and the thing
 *     that lets the collapse pairing below be DERIVED rather than guessed.
 *
 * ── WHY IT IS DECLARED AND NOT INFERRED, AND WHAT WAS TRIED ─────────────────────────────────────
 *
 * The tempting inference is "a collection whose variables all vary across its modes is a data axis;
 * one where they do not is an appearance axis". Measured, it does not separate them — every
 * multi-mode collection has varying variables:
 *
 *   nb   color     4 modes — 159 of 163 vary   ·  layout 5 modes — 3 of 10 vary  ·  type-sets 11/11
 *   aurora  color  4 modes — 157 of 163 vary   ·  layout 6 modes — 3 of 11 vary  ·  type-sets 11/11
 *
 * `layout`'s 3-of-10 and `color`'s 159-of-163 differ in DEGREE, and a threshold between them would be
 * a number fitted to this corpus that a fourth brand moves. There is no property of the file to read.
 * That is #697's "human knowledge Figma does not record", confirmed by trying to recover it.
 *
 * Hence: unclassified is an ERROR, never a default. `UNCLASSIFIED_IS_A_FAILURE` below is the
 * assertion, and it is the same posture as the payload manifest (#674) — membership decided by a
 * fallback reports itself as a pass, so a new collection must fail until a human classifies it. A
 * default of `'none'` would have been the natural thing to write and is precisely the bug.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The axes prism3 emits. Not an open vocabulary: adding one is a decision about the token model, and
 *  it should land here alongside how the axis reaches DTCG (a path segment, or an overlay). */
export type Axis = 'appearance' | 'breakpoint' | 'viewport' | 'surface' | 'none';

/** How each axis crosses into the DTCG projection — the fact that decides everything downstream.
 *
 *  `overlay`  — the projection carries the axis as `base` + per-mode overlay files (#609). One member
 *               is the base; the others are deltas against it.
 *  `path`     — the projection carries every member as its own PATH (`grid.sm.*`, `grid.md.*`), so all
 *               members coexist in one file and there is no base member at all.
 *  `singular` — the axis has one member, so it does not cross as anything.
 *  `absent`   — the axis exists in Figma and has NO DTCG counterpart at all. Distinct from
 *               `singular`: not "one member so nothing to carry" but "deliberately not carried".
 *               Added for `surface` (#893), and the distinction is the point — a reader asking why
 *               the projection has no surface overlays needs to find the answer recorded rather than
 *               inferred from an absence.
 *
 *  `baseMember` is the mode whose values the `base` projection carries, or `null` when the axis is
 *  path-carried and no single mode corresponds. This is the load-bearing part: `compare.ts` uses it to
 *  decide WHICH TokenPress mode file wins the union, and that decision moved 228 colors into and out
 *  of the difference report the first time it was made by iteration order instead. */
export const AXIS_MODEL: Record<Axis, { crossesAs: 'overlay' | 'path' | 'singular' | 'absent'; baseMember: string | null; why: string }> = {
  appearance: {
    crossesAs: 'overlay',
    baseMember: 'light',
    why: 'the one axis the DTCG projection carries as modes: `base` is light, with dark/hc-dark/hc-light as overlays (#609)',
  },
  breakpoint: {
    crossesAs: 'path',
    baseMember: null,
    why: 'carried as a PATH SEGMENT in DTCG (`grid.<breakpoint>.<prop>`), so all members coexist and none is the base — this is #697\'s three-axes-into-one, in the paths rather than the files',
  },
  viewport: {
    crossesAs: 'overlay',
    baseMember: 'desktop',
    why: 'the fluid type-set axis; the projection bakes the desktop end into `base` and carries the min/max pair in `$extensions.prism3.responsive` rather than as a second overlay',
  },
  surface: {
    crossesAs: 'absent',
    baseMember: 'default',
    why: 'the alias layer #871 decided (#893). Figma-only BY DESIGN: it stores pointers into `color`, not values, so there is nothing for DTCG to carry that DTCG does not already have — surface context reaches code through the CSS cascade instead (#882), which is a separate build. `default` is the base member: every row\'s `default` mode points at the page token, so a file that never switches the mode behaves exactly as it did before the collection existed',
  },
  none: {
    crossesAs: 'singular',
    baseMember: 'Default',
    why: 'a single-mode collection — Figma still requires a mode, and prism3 names it `Default` (TokenPress writes it to `shared/`)',
  },
};

/**
 * THE DECLARATION. Every collection prism3 emits, and what its modes mean.
 *
 * Keys are `$collection` labels as written by `emit-figma.ts`, which are also the filename stems. A
 * collection missing from this table FAILS (see `classifyCollections`) — it is not assumed `'none'`,
 * even though 14 of the 18 entries are `'none'` and a default would be right 14 times out of 18.
 * Being right 14 times out of 18 by accident is the failure mode, not the success case: the 15th is
 * a new mode-varying collection, which is exactly when the guess is both wrong and silent.
 *
 * The three style collections carry NO modes at all (`text-styles`, `shadow-styles`,
 * `gradient-styles` have no `$mode` key), because Figma styles cannot have modes. That is not the
 * same as a single-mode collection, and conflating the two is how the appearance axis ends up
 * crossing as a NAME: the emission writes `shadow/xs` AND `shadow-dark/xs` as two peer styles
 * because it has nowhere else to put the dark variant. `styleAxisCarriedAsName` records that.
 */
export const COLLECTION_AXIS: Record<string, Axis> = {
  // -- multi-mode: the three axes #697 measured -------------------------------------------------
  color: 'appearance',
  layout: 'breakpoint',
  'type-sets': 'viewport',
  surface: 'surface',        // #893 — the alias layer; Figma-only, see AXIS_MODEL.surface

  // -- single-mode variable collections ---------------------------------------------------------
  'border-width': 'none',
  'core-dimension': 'none',
  'core-font': 'none',
  'core-palette': 'none',
  control: 'none',
  focus: 'none',
  icon: 'none',
  opacity: 'none',
  radius: 'none',
  size: 'none',
  space: 'none',

  // -- style collections: no modes possible -----------------------------------------------------
  'text-styles': 'none',
  'shadow-styles': 'none',
  'gradient-styles': 'none',
};

/** Style collections where an axis crosses as a NAME PREFIX because Figma styles have no modes.
 *
 *  `shadow-dark/*` is the appearance axis, spelled as a sibling style. This is declared rather than
 *  pattern-matched for the same reason as the table above: `shadow-dark` looks like a name and only
 *  human knowledge says the `-dark` is an axis member rather than a token called "shadow dark". It is
 *  what makes those 7 paths pairable — and therefore type-checkable (#747). */
export const STYLE_AXIS_AS_NAME: { collection: string; prefix: string; axis: Axis; member: string; pairsWith: string }[] = [
  {
    collection: 'shadow-styles',
    prefix: 'shadow-dark',
    axis: 'appearance',
    member: 'dark',
    pairsWith: 'shadow',
  },
];

/**
 * Collections whose axis is declared `absent` — present in Figma, deliberately NOT in the DTCG
 * projection (`surface`, #893). A round-trip through TokenPress reads them out of the Figma files and
 * produces DTCG paths for them, and those paths have no prism3 counterpart BY DESIGN.
 *
 * The comparison drops them, and it does so FROM THIS DECLARATION rather than from a name list of its
 * own. That is the difference between declaring and exempting: a new Figma-only collection that
 * nobody classifies still fails `classifyCollections` as unclassified, and one classified as any
 * other axis still fails the unpaired arm. Only an explicit `crossesAs: 'absent'` buys the drop, and
 * writing that down is a claim someone made about what the projection carries.
 */
export const absentFromProjection = (): Set<string> =>
  new Set(Object.entries(COLLECTION_AXIS).filter(([, ax]) => AXIS_MODEL[ax].crossesAs === 'absent').map(([c]) => c));

/** A collection found in the emission but absent from `COLLECTION_AXIS`. Never a default. */
export type UnclassifiedCollection = { collection: string; modes: string[] };

/**
 * The OBSERVATION side: every `$collection` the emission actually carries, with its modes.
 *
 * Read from the emission files rather than taken from the adapter's `notes.modeAxes`, and the
 * difference is not cosmetic — `modeAxes` covers the 13 VARIABLE collections only, because the three
 * style collections have no `$mode` key to census. Classifying against it would leave `text-styles`,
 * `shadow-styles` and `gradient-styles` permanently outside the declaration's reach, which is where
 * the appearance-axis-as-a-name case lives. A style collection appears here with an EMPTY mode list,
 * which is the honest reading: Figma styles cannot have modes at all.
 */
export const censusFromEmission = (dir: string): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const file = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { $collection?: string; $mode?: string };
    if (!file.$collection) continue;
    const modes = out[file.$collection] ?? [];
    if (file.$mode) modes.push(file.$mode);
    out[file.$collection] = modes;
  }
  for (const k of Object.keys(out)) out[k].sort();
  return out;
};

export type AxisClassification = {
  /** Every collection in the emission, with its declared axis. */
  classified: { collection: string; axis: Axis; modes: string[] }[];
  /** Collections the emission carries that nobody classified — a FAILURE, not a fallback. */
  unclassified: UnclassifiedCollection[];
  /** Declared entries the emission no longer carries: a stale declaration, also a failure. A table
   *  that cannot notice its own obsolescence is the shape #729 fixed in the verdicts. */
  stale: string[];
  /** The TokenPress output directories that correspond to prism3's `base` projection, DERIVED from
   *  the declaration rather than hand-listed. TokenPress names a directory after the Figma mode, and
   *  writes `shared/` for `Default`. */
  baseDirs: Set<string>;
};

export const UNCLASSIFIED_IS_A_FAILURE = true;

/**
 * Classifies every collection the emission carries, in BOTH directions.
 *
 * `modesByCollection` comes from the emission itself (the adapter's own census), so this compares a
 * DECLARATION against an OBSERVATION — two independent things. Deriving the collection list from
 * `COLLECTION_AXIS` instead would make the completeness check a tautology: the table would be
 * complete with respect to itself, and a new collection would pass by never being asked about.
 */
export const classifyCollections = (modesByCollection: Record<string, string[]>): AxisClassification => {
  const classified: AxisClassification['classified'] = [];
  const unclassified: UnclassifiedCollection[] = [];

  for (const [collection, modes] of Object.entries(modesByCollection).sort()) {
    const axis = COLLECTION_AXIS[collection];
    if (axis === undefined) {
      unclassified.push({ collection, modes });
      continue;
    }
    classified.push({ collection, axis, modes });
  }

  const stale = Object.keys(COLLECTION_AXIS)
    .filter((c) => !(c in modesByCollection))
    .sort();

  // The base-equivalent directories, derived. `shared` arrives via the `none` axis's `Default`.
  const baseDirs = new Set<string>();
  for (const { axis } of classified) {
    const base = AXIS_MODEL[axis].baseMember;
    if (base === null) continue;
    baseDirs.add(base === 'Default' ? 'shared' : base);
  }

  return { classified, unclassified, stale, baseDirs };
};

/** Which axes are REPRESENTED in the emission — the count #697 measured as 3.
 *
 *  Names, not a count of directories: a renamed breakpoint moves the collection out of the axis and
 *  the axis stops being represented, which is the honest answer rather than a directory tally that
 *  happens to stay above 3 (the proxy that made the old category-4 verdict wrong, #729). */
export const axesRepresentedIn = (c: AxisClassification): Axis[] =>
  [...new Set(c.classified.filter((x) => x.modes.length > 1).map((x) => x.axis))].sort();
