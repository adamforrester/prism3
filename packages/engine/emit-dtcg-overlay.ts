/**
 * emit-dtcg-overlay.ts — the CONFORMING projection of the canonical tree (#609).
 *
 * The canonical `out/<brand>.tokens.json` stays the source of truth: one tree, the whole alias graph,
 * per-mode values under `$extensions.prism3.modes`. That shape is right for us and **wrong for
 * everyone else** — DTCG defines `$extensions` as *ignorable*, so a conforming consumer reads one
 * value per token and silently gets a light-only system. Measured: a stock Style Dictionary emitted
 * 556 leaves → 556 CSS variables, 1:1, with 133 wrong for dark and no warning.
 *
 * So this emits a second, PROJECTED set that any conforming tool can read with no adapter:
 *
 *     <brand>.base.tokens.json          every DTCG-typed token, default-mode values, NO modes extension
 *     <brand>.<mode>.overlay.tokens.json  ONLY the leaves whose value differs from base
 *
 * "Every DTCG-typed token" is exact, and the qualifier is the fix in #642: a leaf whose `$type` is not
 * in the spec is omitted here, because a promise of conformance that carries an unresolvable type is
 * false. See `DTCG_TYPES` below.
 *
 * A consumer sources `base + overlay` and its own merge does the rest — verified against Style
 * Dictionary's native multi-source support, which produced output identical to a full per-mode tree
 * with **no preprocessor, no custom transform, no custom format**. That bar is the point: an adapter
 * we ship is an adapter every consumer inherits forever, so the projection has to stand on its own.
 *
 * WHY OVERLAYS RATHER THAN FULL PER-MODE TREES, which is the load-bearing choice:
 *
 *   • Size — a full tree per mode is ~76% redundant (133 of 556 leaves differ for dark). Measured
 *     across the theme axis, overlays cut the artifact set 1,532 KB → 685 KB.
 *   • **Orthogonality** — the real reason. Prism3's system has three independent axes (theme,
 *     breakpoint, viewport). Crossed directories need 4 × 5 × 2 = 40 files; base + per-axis overlays
 *     need 11, and a consumer composes `base + theme-dark + breakpoint-md + viewport-mobile`. A flat
 *     per-mode namespace cannot express that — which is exactly where Token Press's model fails on
 *     our output (`docs/12 §10b`).
 *
 * SCOPE — read this before assuming the file does more than it does. TWO axes are projected, each from
 * its own extension map (see `AXES`): the **theme** axis from `modes` (`dark` / `hc-light` / `hc-dark`)
 * and the **surface** axis from `surfaces` (`inverse`, #1129). Breakpoint and viewport are represented
 * elsewhere in the tree (`$extensions.prism3.responsive`, and the layout token values themselves), so
 * there is nothing here to flatten them from.
 *
 * PURE — no `node:*`, no I/O. The writer lives in `emit-dtcg.ts`.
 */

/** A DTCG node: either a group of children or a leaf carrying `$value`. */
type Node = Record<string, unknown>;

const isLeaf = (n: unknown): n is Node => !!n && typeof n === 'object' && '$value' in (n as Node);

/**
 * THE PROJECTED AXES — an axis name, and the `$extensions.prism3` map that carries its values.
 *
 * One table, because everything below is axis-agnostic and the only per-axis facts are "which map" and
 * "what the file and the CSS selector are called". Adding breakpoint or viewport is a row here plus a
 * producer that writes the map — no change to the walk, the value comparison, or the throw.
 *
 * WHY `surfaces` IS ITS OWN AXIS RATHER THAN THREE MORE `modes` ENTRIES (#1129). The two axes compose
 * rather than multiply: a consumer sources `base + dark + surface-inverse` for a dark band on a dark
 * page, which is 2 overlays for 8 combinations. Folded into `modes`, `inverse` would inherit the theme
 * axis's semantics — ONE selection per document — and an inverse *region* is not a document state.
 * That is #871's rejected `light-inverse` crossing arriving through the back door, and the same
 * inheritance failure: the band is silently wrong the moment the page flips appearance.
 */
export const AXES = { theme: 'modes', surface: 'surfaces' } as const;
export type OverlayAxis = keyof typeof AXES;
const AXIS_MAPS: readonly string[] = Object.values(AXES);

/**
 * The overlay artifact's tag: `<brand>.<tag>.overlay.tokens.json`, and `[data-<axis>="<key>"]` in a
 * consumer's CSS.
 *
 * The theme axis is unprefixed because its three files predate the second axis and renaming them would
 * break every consumer for no gain. Every later axis IS prefixed, which is what keeps `dark` and
 * `surface-inverse` distinguishable — an unprefixed `inverse` would read as a fourth theme.
 */
export const overlayTag = (axis: OverlayAxis, key: string): string => (axis === 'theme' ? key : `${axis}-${key}`);

/**
 * The types the DTCG spec defines. A leaf typed outside this set is omitted from the projection (#642).
 *
 * WHY, since "emit less" always looks like a downgrade: these two files exist to make a CONFORMANCE
 * promise, and a type no consumer can resolve makes that promise false while producing a garbage value
 * in the same stroke. Before this, a stock Style Dictionary read the three `spring` tokens, found no
 * transform for an unknown type, fell back to `String(value)` and emitted the literal text
 * `[object Object]` — present, counted, unusable. Omitted, a consumer sees no spring tokens, which is
 * honest and which they can act on.
 *
 * Omitted rather than moved to `$extensions` inside the projection. Both conform, but the canonical
 * tree already holds the data and a second copy in the projection's ignorable corner buys a stock
 * consumer nothing.
 *
 * `spring` REMAINS in the canonical `<brand>.tokens.json`, which is deliberately extension-based and
 * ours (#609), and remains in the token-name contract. Only its presence *here* was wrong. Nothing
 * about this decides springs' future: if the motion vocabulary ever becomes standard, `spring` joins
 * the list below and the projection gains those tokens back with no other change.
 *
 * This list is spelled out from the spec rather than derived from what we emit — a list built by
 * scanning our own output would call every type we ship conforming, including the next non-standard
 * one. `packages/tokens/check-consumability.mjs` deliberately keeps its OWN copy for the same reason;
 * see the note there before consolidating them.
 */
export const DTCG_TYPES: ReadonlySet<string> = new Set([
  // primitives
  'color', 'dimension', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier', 'number',
  // composites
  'strokeStyle', 'border', 'transition', 'shadow', 'gradient', 'typography',
]);

/** Whether a leaf's `$type` is one a conforming consumer is defined to understand. */
export const isConformingLeaf = (n: Node): boolean => typeof n.$type === 'string' && DTCG_TYPES.has(n.$type as string);

/** Every key named by any leaf's map for `axis`, sorted. Walks the tree rather than taking a caller's
 *  list — a key present on one leaf and absent from the argument would vanish silently. */
export const overlayModes = (tree: unknown, axis: OverlayAxis = 'theme'): string[] => {
  const found = new Set<string>();
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    if (isLeaf(n)) {
      const p3 = (n.$extensions as Node | undefined)?.prism3 as Node | undefined;
      for (const m of Object.keys((p3?.[AXES[axis]] as Node | undefined) ?? {})) found.add(m);
      return;
    }
    for (const [k, v] of Object.entries(n as Node)) if (!k.startsWith('$')) walk(v);
  };
  walk(tree);
  return [...found].sort();
};

/**
 * One leaf as the projection carries it: EVERY axis map removed.
 *
 * Removing them is not tidying — it is the whole contract. A consumer that reads this file must not be
 * able to find a second value it is silently ignoring; if `modes` rode along, the base would be the
 * canonical tree again and the projection would buy nothing. Everything else under `$extensions`
 * stays: it is descriptive (contrast ratings, provenance, Figma binding), not a hidden value.
 *
 * Driven off `AXES` rather than naming `modes`, because the rule is about hidden VALUES and not about
 * one map. `surfaces` (#1129) is the second, and it arrived on 128 leaves that were already in every
 * base file — so a `modes`-only strip would have shipped the inverse column into all four bases at
 * once, in the ignorable corner, which is exactly the shape this function exists to prevent.
 */
const projectLeaf = (n: Node): Node => {
  const out = { ...n };
  const ext = out.$extensions as Node | undefined;
  const p3 = ext?.prism3 as Node | undefined;
  if (p3 && AXIS_MAPS.some((m) => m in p3)) {
    out.$extensions = { ...ext, prism3: Object.fromEntries(Object.entries(p3).filter(([k]) => !AXIS_MAPS.includes(k))) };
  }
  return out;
};

/**
 * The BASE tree: default-mode values, `modes` removed, non-DTCG types omitted (#642).
 *
 * Groups left empty by the omission are pruned — `motion.spring` with all three leaves gone would
 * otherwise ship as `"spring": {}`, which conforms but advertises a vocabulary the file does not carry.
 */
export const buildBase = (tree: unknown): unknown => {
  const strip = (n: unknown): unknown => {
    if (!n || typeof n !== 'object') return n;
    if (isLeaf(n)) return isConformingLeaf(n) ? projectLeaf(n) : undefined;
    const out: Node = {};
    let kept = 0;
    for (const [k, v] of Object.entries(n as Node)) {
      if (k.startsWith('$')) { out[k] = v; continue; }
      const child = strip(v);
      if (child !== undefined) { out[k] = child; kept++; }
    }
    return kept ? out : undefined;
  };
  return strip(tree) ?? {};
};

/** The diagnostic for a mode entry the projector cannot read. Its own function so the message is one
 *  string rather than assembled at a throw site, and so a test can assert on it. */
const unreadableMode = (mode: string, m: unknown, axis: OverlayAxis): string =>
  `emit-dtcg-overlay: ${AXES[axis]} entry '${mode}' exists but carries no $value ` +
  `(got ${Array.isArray(m) ? 'a bare array — this is the #708 shape' : m === null ? 'null' : typeof m}). ` +
  `Every mode entry must wrap its value: { $value: … }. An unreadable entry is a DEFECT, never an ` +
  `absence — returning undefined here is what silently dropped every mode-varying shadow from every ` +
  `overlay in all four brands. Normalize the producer (see tree.ts shadowLeaf); do not widen this guard.`;

/**
 * One mode's OVERLAY: only the leaves whose value differs from base, with empty groups pruned.
 *
 * A leaf that carries an axis entry EQUAL to its default is deliberately excluded — the engine emits
 * those (a mode can re-derive a value and land on the same one), and including them would make every
 * overlay look larger than the change it represents. Comparing values rather than trusting the
 * extension's presence is what keeps the overlay honest about what actually moves.
 *
 * That exclusion carries real weight on the surface axis (#1129) rather than covering a rare case: all
 * 128 pointer leaves declare `surfaces.inverse`, and the 16 `inverse-coverage.ts` registers as `self`
 * declare their own token — so the overlay lands at 112 because the VALUES match here, never because
 * the pairing rule was applied a second time. Deleting this comparison would ship 16 inert overrides.
 *
 * THE #708 DIAGNOSIS, because it is the part a diff cannot show. This walk used to begin
 * `if (!m || !('$value' in m)) return undefined;` — a guard that was **correct about its own condition
 * and wrong about its assumption.** It really did test whether the entry wraps a `$value`; what it
 * assumed was that every entry does. Color entries wrap (`{ $value, contrast, … }`); shadow entries
 * were the bare layer array, so every mode-varying shadow failed the test and returned "no override."
 * All four brands shipped light-mode shadows in dark mode, and nothing anywhere reported it, because
 * `undefined` conflated two states needing opposite handling: "does not vary" (normal) and "cannot be
 * read" (a defect). The producer is normalized now, so the throw below should be unreachable — it stays
 * because unreachable-by-construction is exactly what this guard believed about itself before.
 */
export const buildOverlay = (tree: unknown, mode: string, axis: OverlayAxis = 'theme'): unknown => {
  const map = AXES[axis];
  const walk = (n: unknown): unknown => {
    if (!n || typeof n !== 'object') return undefined;
    if (isLeaf(n)) {
      // Non-DTCG types are omitted here too (#642), not merely in the base. No `spring` leaf carries a
      // mode entry today, so this changes no committed byte — it is stated so the rule lives with BOTH
      // writers of the projection. A future non-standard type that did vary by mode would otherwise
      // reach a conforming consumer through the overlay while being correctly absent from the base.
      if (!isConformingLeaf(n)) return undefined;
      const p3 = ((n.$extensions as Node | undefined)?.prism3) as Node | undefined;
      const modes = p3?.[map] as Node | undefined;
      // ABSENT means "this leaf does not vary in this mode" — the normal case, and the ONLY thing that
      // may return undefined here. Everything below is a shape question, and a shape we cannot read is
      // a defect rather than an absence (#708).
      if (!modes || !(mode in modes)) return undefined;
      const m = modes[mode] as Node | undefined;
      if (!m || typeof m !== 'object' || !('$value' in m)) throw new Error(unreadableMode(mode, m, axis));
      if (JSON.stringify(m.$value) === JSON.stringify((n as Node).$value)) return undefined;
      // The leaf as the mode sees it — the mode's `$value`, and the base leaf's descriptive fields
      // so the overlay is a valid standalone DTCG token rather than a bare value.
      return { ...projectLeaf(n), ...m, $value: m.$value };
    }
    const out: Node = {};
    for (const [k, v] of Object.entries(n as Node)) {
      if (k.startsWith('$')) continue;
      const child = walk(v);
      if (child !== undefined) out[k] = child;
    }
    return Object.keys(out).length ? out : undefined;
  };
  return walk(tree) ?? {};
};

/** Count of `$value` leaves — used by callers to report and gate overlay size. */
export const leafCount = (n: unknown): number => {
  if (!n || typeof n !== 'object') return 0;
  if (isLeaf(n)) return 1;
  let c = 0;
  for (const [k, v] of Object.entries(n as Node)) if (!k.startsWith('$')) c += leafCount(v);
  return c;
};

/**
 * The whole projected set for one brand: the base plus one overlay per key of every axis in `AXES`.
 *
 * `tag` is what the writer names the file and what a consumer scopes on, so the two cannot disagree.
 * `mode` is retained beside it — unprefixed, the axis's own key — because `test.ts` and the studio's
 * export settings both address overlays by mode name and neither is about file naming.
 */
export const buildOverlaySet = (tree: unknown): {
  base: unknown;
  overlays: Array<{ axis: OverlayAxis; mode: string; tag: string; tree: unknown }>;
} => ({
  base: buildBase(tree),
  overlays: (Object.keys(AXES) as OverlayAxis[]).flatMap((axis) =>
    overlayModes(tree, axis).map((mode) => ({ axis, mode, tag: overlayTag(axis, mode), tree: buildOverlay(tree, mode, axis) })),
  ),
});
