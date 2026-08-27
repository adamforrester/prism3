/**
 * Prism3 engine — FIGMA VARIABLE NAME PARSING, the read direction (#1097).
 *
 * Every Figma variable this engine emits is named `<root>/<tail>`, where `<root>` is the brand's own
 * `theme.root` (`prism` by default, `nbds` for New Balance, whatever a client picks) and `<tail>` is the
 * variable's DTCG path below that root with `/` for `.`. Primitives carry one more fixed segment:
 * `<root>/core/<group>/…`, the `core` tier (#1102).
 *
 * ── WHY THIS IS A MODULE AND NOT A HANDFUL OF `startsWith` CALLS ──────────────────────────────────
 *
 * The first segment is BRAND-SPECIFIC and therefore not a constant any read path may spell. Prism2's
 * long-standing bug was exactly that — `pds/` hardcoded in a reader — and its signature is that it is
 * invisible in testing, because you test with the brand whose prefix you hardcoded. Everything here is
 * **positional**: `rootOf`/`tailOf` name no root, they count segments. A reader built on them works for a
 * client namespace we have never seen, which is the property `apps/plugin/test-readback.ts` gates
 * behaviourally, as a differential round-trip over two roots (#1097).
 *
 * `startsWith('font/family/')` in `write-plan.ts` was the live instance this replaced: after the
 * namespace landed it matched nothing, for every brand, and produced an empty map rather than an error.
 *
 * ── AND WHY `'core'` IS SPELLED HERE RATHER THAN IMPORTED ─────────────────────────────────────────
 *
 * `theme.ts` exports `CORE_TIER` and the emitters build names from it. If this module imported it, the
 * reader would agree with the emitter BY CONSTRUCTION, and the round-trip tests that compare a read of
 * `out/figma/**` against the tier the contract promises could no longer fail on that segment — the
 * docs/34 shape-11 defect, where a check derives its expectation from its subject. So the tier is stated
 * literally below, and `materialization-renames.ts` states it a third time for the same reason. The
 * three spellings are deliberately NOT deduplicated; a future edit that "cleans this up" deletes two
 * gates and reports a pass.
 *
 * Unlike the tier, the ROOT is never spelled anywhere in a read path — not here, not literally, not at
 * all. That asymmetry is the point: `core` is the same word for every brand, `nbds` is not.
 *
 * PURE — no `node:*`, no `figma.*`, no I/O, and no imports at all. Bundles into the plugin main thread
 * and the browser.
 */

/** The primitive tier's segment. Stated literally — see the header before importing `CORE_TIER` here. */
const CORE = 'core';

/** The brand root a variable name carries — its FIRST segment, whatever that brand chose. Positional:
 *  this function knows that the root is first, and nothing about what it says. */
export const rootOf = (name: string): string => name.split('/')[0] ?? '';

/**
 * A variable name with its brand root removed — the brand-INVARIANT part, which is the variable's DTCG
 * path below the configurable root. `nbds/color/appearance/background/primary` →
 * `color/appearance/background/primary`.
 *
 * This is what a name contract compares against: the expected-name lists in `read-back.ts` are tails, so
 * they hold for every brand and no list is per-brand authored data. Feeding a name that carries NO root
 * (a pre-#1097 file) strips a real segment and the comparison fails — which is the right answer, since
 * such a file genuinely does not satisfy the contract.
 */
export const tailOf = (name: string): string => name.split('/').slice(1).join('/');

/**
 * The `core`-tier group a variable belongs to (`palette` / `dimension` / `font`), or `null` for a
 * variable outside the tier.
 *
 * This exists because #1097 merged the three `core-*` collections into ONE `core` collection, so a Figma
 * collection no longer identifies an axis — the group does. Every read path that used to partition by
 * collection name now partitions by collection AND group; see `axisSource`.
 */
export const coreGroupOf = (name: string): string | null => {
  const seg = name.split('/');
  return seg[1] === CORE ? seg[2] ?? null : null;
};

/** `true` iff `name` is a `core`-tier variable in `group`. */
export const inCoreGroup = (name: string, group: string): boolean => coreGroupOf(name) === group;

/**
 * Split a read-back AXIS KEY into the collection it lives in and the `core` group it is narrowed to.
 *
 * A snapshot's `float`/`font` records are keyed by axis, and since #1097 an axis is not always a whole
 * collection: `'space'` is the whole `space` collection, `'core/dimension'` is the `dimension` slice of
 * the merged `core` one. Keeping the key equal to the collection name where they coincide means the
 * verdict's `details.collections` still reads as something a human can go and look at.
 */
export const axisSource = (key: string): { collection: string; group: string | null } => {
  const [collection, group] = key.split('/');
  return { collection, group: group ?? null };
};

/**
 * Narrow a collection's variable names to one axis — the predicate half of `axisSource`.
 *
 * `group === null` owns the whole collection, which is every axis except the three inside `core`.
 */
export const inAxis = (key: string) => {
  const { group } = axisSource(key);
  return (name: string): boolean => (group === null ? true : coreGroupOf(name) === group);
};

/**
 * The single `core` group a set of planned names occupies, or `null` when they span more than one (or
 * none) — i.e. "which slice of a merged collection does this plan OWN?".
 *
 * The write executors need this and cannot ask a sibling: `applyWritePlan` writes `core`'s palette,
 * `applyFloatPlan` writes its dimensions and `applyVarCollectionPlan` its fonts, in three separate calls
 * against the same collection. Without a scope, each one sees the other two's 77–160 variables as either
 * un-planned rename targets (refusing every legitimate migration) or orphans (reporting the file as
 * drifted when it matches the plan exactly). Derived from the plan's OWN rows because that is what
 * ownership means here, not a guess about it.
 */
export const ownedCoreGroup = (planned: Iterable<string>): string | null => {
  let group: string | null = null;
  for (const name of planned) {
    const g = coreGroupOf(name);
    if (g === null) return null;          // a name outside the tier — the plan owns the whole collection
    if (group === null) group = g;
    else if (group !== g) return null;    // spans groups — likewise
  }
  return group;
};
