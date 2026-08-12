/**
 * The provenance model (#722, implementing #721) — WHERE the working `BrandInput` came from, and
 * whether it has been edited since.
 *
 * Pure and host-neutral on purpose: no `document`, no `figma`, no imports from `main.ts`. That is
 * what makes it testable (`apps/studio/test-provenance.ts`) — `main.ts` is a 7k-line browser module
 * that cannot be loaded under `tsx`, so a model living inside it could only ever be asserted by
 * hand in Figma.
 *
 * ---------------------------------------------------------------------------------------------
 * WHY A MODEL RATHER THAN THREE FEATURES (#721)
 *
 * Everything in the studio is a `BrandInput`. The knobs edit one, `design.md` import produces one,
 * the host's `restore-input` supplies one, and boot falls back to an example. Four writers, one
 * state, and before this nothing recorded which of them produced the current value. So three asks
 * that look separate — *warn before an import overwrites*, *reset to what the file has*, *get back
 * to the empty-state options* — were three features. Given an ORIGIN plus a DIRTY reading against
 * it they are one:
 *
 *   - reset-to-origin is not a feature, just the origin still being known
 *   - a confirmation can fire only when something would actually be lost
 *   - the empty state is the no-origin case, so re-entry needs no special path
 *
 * THE LOAD-BEARING PART IS THE CONDITION, NOT THE PROMPT. `renderBrandMenu` today confirms an
 * import unconditionally ("This overwrites your current edits") — including over an untouched brand
 * that was loaded a second ago and has no edits to lose. A confirmation that fires every time gets
 * clicked through, at which point it is not protecting anything. `isDirty` is what lets it keep its
 * meaning, which is why the model is worth more than the dialog it eventually gates.
 */

import type { BrandInput } from '@prism3/engine/theme';

// ===========================================================================================
// Origin — which writer produced the current state, and the baseline it produced
// ===========================================================================================

/**
 * The four writers, plus the absence of one.
 *
 * `none` is NOT an error or an "unset" placeholder to be tolerated — it is the empty state, and
 * modelling it here rather than as a separate `firstRun` boolean is #721's call. A boolean beside
 * the state can disagree with it; a case of the origin cannot. It is also what makes *returning*
 * to the empty state ordinary: `preview an example → decide to start blank` is two origin changes,
 * not a wizard re-entered.
 */
export type Origin =
  /** No origin chosen yet — the empty state. Boot on web with nothing valid stored, or "+ New brand". */
  | { readonly kind: 'none' }
  /** One of the emitted example brands (`schema/example-brands.json`). Carries the id it was loaded by. */
  | { readonly kind: 'example'; readonly id: string }
  /** The neutral starting point (`NEW_BRAND()`) — a deliberate blank, distinct from `none`. */
  | { readonly kind: 'new' }
  /** A `design.md` the user imported. `label` is the brand id the file declared, for the reset affordance. */
  | { readonly kind: 'import'; readonly label: string }
  /** The host handed back the `BrandInput` stored in the Figma file (#131 `restore-input`). */
  | { readonly kind: 'file' };

/**
 * The origin together with the exact input it produced — the BASELINE dirtiness is measured
 * against, and what a reset returns to.
 *
 * The baseline is stored, NOT re-derived. #721's verify block is explicit: reset must be asserted
 * against the stored origin and never against re-reading the file, because re-reading compares the
 * subject with itself and passes by construction (docs/34). The same reasoning applies to the dirty
 * check — asking the host again for "what the file has" would answer with whatever the file has
 * *now*, which is a different question from "what did we start from".
 */
export interface Provenance {
  readonly origin: Origin;
  /** A deep copy taken at load time. Never handed out unfrozen — see `baselineOf`. */
  readonly baseline: BrandInput;
}

/** Record a load. `input` is cloned, so a later mutation of the caller's object cannot move the baseline. */
export const provenanceOf = (origin: Origin, input: BrandInput): Provenance => ({
  origin,
  baseline: structuredClone(input),
});

/** The empty state: no origin, and a baseline nothing can be dirty against. */
export const noOrigin = (input: BrandInput): Provenance => provenanceOf({ kind: 'none' }, input);

// ===========================================================================================
// Dirtiness
// ===========================================================================================

/**
 * Has the working state diverged from its origin?
 *
 * Structural equality over the serialized input. `BrandInput` is plain JSON data (it round-trips
 * through `design.md` and through Figma shared-data), so this is exact rather than approximate —
 * and it is the same notion of equality the persist layer already relies on.
 *
 * KEY ORDER IS NORMALIZED rather than trusted. `JSON.stringify` is order-sensitive, and the two
 * sides genuinely have different histories: a baseline that arrived from `restore-input` was
 * serialized by the host, while the working copy has been through `structuredClone` and had
 * properties assigned by knob handlers in whatever order the user touched them. Comparing raw
 * would report a brand nobody edited as dirty — which would fire the confirmation unconditionally
 * all over again, in a less obvious way.
 */
export const isDirty = (current: BrandInput, p: Provenance): boolean =>
  canonical(current) !== canonical(p.baseline);

/** Stable serialization: recursively sort object keys, leave array ORDER alone (it is meaningful — `modes`). */
const canonical = (v: unknown): string => JSON.stringify(sortKeys(v));

const sortKeys = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v === null || typeof v !== 'object') return v;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as Record<string, unknown>).sort()) {
    out[k] = sortKeys((v as Record<string, unknown>)[k]);
  }
  return out;
};

/** What a reset returns to — a fresh clone, so the caller cannot write through it into the baseline.
 *  NOT `baselineOf`: `main.ts` already has one, for a role's CONTRAST baseline. Two unrelated meanings
 *  of the same word in one import list is a name worth spending four extra characters to avoid. */
export const originBaseline = (p: Provenance): BrandInput => structuredClone(p.baseline);

/**
 * Should replacing the state with something else be confirmed?
 *
 * The whole point of the model: **only when there is something to lose.** An untouched state can be
 * replaced silently no matter which writer produced it, and the empty state has nothing to protect.
 */
export const needsOverwriteConfirm = (current: BrandInput, p: Provenance): boolean =>
  p.origin.kind !== 'none' && isDirty(current, p);

// ===========================================================================================
// The three seed outcomes (#721)
// ===========================================================================================

/**
 * What opening a Figma file yielded.
 *
 * THREE states, and a two-state design collapses the interesting one — which is exactly what
 * shipped: `seedInfo` was `{ok, summary}`, so "the file is ours but its settings are not
 * recoverable" had to arrive as either a success (silently wrong — the knobs are not the file's) or
 * a failure (wrong in the other direction — nothing failed).
 *
 * `recovered: false` is a SUCCESS CARRYING A LIMITATION, not an error. It happens for a copied
 * template, a hand-built file, or one themed by an older schema, and it is not fixable by us:
 * reconstructing a `BrandInput` from emitted tokens is the undetermined inverse #677 rules out —
 * the engine generates a full system from sparse anchors and that does not run backwards. The user
 * can still theme and apply; they just cannot start from what is there.
 */
export type SeedOutcome =
  /** Not a Prism3 file — no Prism3 variables found. Nothing to restore, nothing to report as missing. */
  | { readonly state: 'absent' }
  /** Prism3 variables present. `recovered` says whether the stored `BrandInput` came back with them. */
  | {
      readonly state: 'present';
      /** True only when the host also restored the input (#131) — the two are independent reads. */
      readonly recovered: boolean;
      /** Did the materialization contract verify? Orthogonal to `recovered`: a file can hold a valid
       *  blob and still fail the contract, and vice versa. */
      readonly contractOk: boolean;
      /** The read-back detail, for whoever renders this (#533 owns where). */
      readonly detail: string;
    }
  /** The read-back itself threw — a real failure, distinct from all of the above. */
  | { readonly state: 'error'; readonly message: string };

/**
 * Is this outcome a FAILURE? Exactly one of the four shapes is.
 *
 * Named as a function rather than left to each call site because the near-miss is the whole bug:
 * `state: 'present', recovered: false` reads like a failure and is not one, and the old `ok`
 * boolean had nowhere to put that distinction. #721's verify requires it not be presented as one.
 */
export const isSeedFailure = (o: SeedOutcome): boolean =>
  o.state === 'error' || (o.state === 'present' && !o.contractOk);

/**
 * Join the TWO independent boot reads into one outcome.
 *
 * `present`/`ok`/`detail` come from the variables read-back (`seed-info`); `recovered` from whether
 * the host also handed back the stored `BrandInput` (`restore-input`). Two messages, two reads that
 * do not gate each other in the plugin's main thread — so THIS FUNCTION MUST NOT CARE WHICH ARRIVED
 * FIRST, and `withRecovered` below is what makes the late-arriving order safe.
 *
 * Three-way rather than two: `!present` covers both "no Prism3 theme here" (an ordinary answer) and
 * "the read-back threw" (a real failure), and `ok` is what separates them. Collapsed, a crashed read
 * reports as an empty file — the most misleading of the four shapes, because the user would then
 * theme over a file whose contents were never established.
 */
export const joinSeed = (
  read: { present: boolean; ok: boolean; detail: string },
  recovered: boolean,
): SeedOutcome =>
  read.present
    ? { state: 'present', recovered, contractOk: read.ok, detail: read.detail }
    : read.ok
      ? { state: 'absent' }
      : { state: 'error', message: read.detail };

/**
 * Re-join an outcome that was built before `restore-input` landed.
 *
 * The reason this exists rather than a comment asserting an order: `seed-info` and `restore-input`
 * are independent posts, and if the seed lands first, `recovered` is false at join time and STAYS
 * false — so the pill would tell a designer "knobs not stored in this file" over knobs that were
 * restored a moment later. Today the plugin happens to post `restore-input` first (its handler is
 * synchronous while the read-back awaits), so the bug is unreachable by accident. An accident is not
 * a guarantee, and the one that holds it is in another context's scheduling.
 *
 * Only ever moves `recovered` toward true — a restore cannot un-happen, and nothing else in the
 * outcome is the restore's to change.
 */
export const withRecovered = (o: SeedOutcome, recovered: boolean): SeedOutcome =>
  o.state === 'present' && recovered && !o.recovered ? { ...o, recovered: true } : o;

/**
 * True when the file is ours but its knobs could not be restored — #721's state 2.
 *
 * The single predicate the eventual surface needs, so no renderer has to re-derive it from the
 * `recovered`/`contractOk` pair and get the polarity wrong.
 */
export const isUnrecoverable = (o: SeedOutcome): boolean =>
  o.state === 'present' && !o.recovered;
