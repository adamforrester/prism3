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
 *     <brand>.base.tokens.json          every DTCG-typed token, default-mode values, NO `$extensions`
 *     <brand>.<mode>.overlay.tokens.json  ONLY the leaves whose value differs from base, NO `$extensions`
 *     <brand>.web.base.tokens.json      the base, each typeface's `$value` its fallback stack (#4155; web only)
 *
 * Since #2552 (owner decision Q250 A) this set IS the consumer handoff: no `$extensions` anywhere, so no
 * vendor key, no build data and no internal prose travels to a client — see `buildOverlaySet`.
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
 * SCOPE — read this before assuming the file does more than it does. The `modes` extension carries
 * the **theme axis only** (`dark` / `hc-light` / `hc-dark`). Breakpoint and viewport are represented
 * elsewhere in the tree (`$extensions.prism3.responsive`, and the layout token values themselves), so
 * there is nothing here to flatten them from. The overlay FORM generalizes to all three; this
 * implementation covers the one axis the mechanism currently expresses.
 *
 * PURE — no `node:*`, no I/O. The writer lives in `emit-dtcg.ts`.
 */

/** A DTCG node: either a group of children or a leaf carrying `$value`. */
type Node = Record<string, unknown>;

const isLeaf = (n: unknown): n is Node => !!n && typeof n === 'object' && '$value' in (n as Node);

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

/** Every mode named by any leaf's `modes` extension, sorted. Walks the tree rather than taking a
 *  caller's list — a mode present on one leaf and absent from the argument would vanish silently. */
export const overlayModes = (tree: unknown): string[] => {
  const found = new Set<string>();
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    if (isLeaf(n)) {
      const modes = (n.$extensions as Node | undefined)?.prism3 as Node | undefined;
      for (const m of Object.keys((modes?.modes as Node | undefined) ?? {})) found.add(m);
      return;
    }
    for (const [k, v] of Object.entries(n as Node)) if (!k.startsWith('$')) walk(v);
  };
  walk(tree);
  return [...found].sort();
};

/**
 * One leaf as the projection carries it: the `modes` extension removed.
 *
 * Removing it is not tidying — it is the whole contract. A consumer that reads this file must not be
 * able to find a second value it is silently ignoring; if `modes` rode along, the base would be the
 * canonical tree again and the projection would buy nothing. Everything else under `$extensions`
 * stays HERE: it is descriptive (contrast ratings, provenance, Figma binding), not a hidden value, and
 * the internal metadata export keeps it. The handoff drops all of it one step later (`buildOverlaySet`,
 * #2552).
 */
const projectLeaf = (n: Node): Node => {
  const out = { ...n };
  const ext = out.$extensions as Node | undefined;
  const p3 = ext?.prism3 as Node | undefined;
  if (p3 && 'modes' in p3) {
    const { modes: _drop, ...rest } = p3;
    out.$extensions = { ...ext, prism3: rest };
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

/**
 * The descriptive fields that describe ONE MODE'S VALUE rather than the leaf (#1257).
 *
 * AUTHORED, and the list is the whole rule: a base field named here is DROPPED when the mode entry
 * does not restate it, because for these fields a mode's silence is a claim rather than an
 * inheritance. `min` is the sharp case — a role gated at 4.5 in light and ungated in `hc-light`
 * emits no `min` in that mode entry, and carrying the base's forward would print a floor the mode
 * does not promise. Everything NOT named here (`role`, `figma`, `generated`, `layers`) describes the
 * leaf and survives untouched.
 *
 * The list is short because the producer is narrow: `tree.ts`'s color writer emits exactly these,
 * and shadow mode entries carry none of them (a shadow's `layers` is a COUNT and is mode-invariant —
 * measured, both modes carry 2). A new per-mode field must be added here or the overlay will print
 * the base's copy of it beside a different value, which is #1257 exactly.
 */
const MODE_SCOPED = ['aliasOf', 'contrast', 'against', 'min', 'contrastModel', 'legibleFor'] as const;

/**
 * One leaf as ONE MODE sees it: the mode's value, and the mode's OWN provenance (#1257).
 *
 * THE DEFECT THIS REPLACES, because the shape is worth more than the fix. The line was
 * `{ ...projectLeaf(n), ...m, $value: m.$value }` — the mode entry spread over the leaf's TOP level.
 * Its fields are `contrast`/`against`/`min`, which on a leaf live under `$extensions.prism3`, so the
 * spread landed the mode's correct rating OUTSIDE `$extensions` as a stray sibling of `$type` that no
 * consumer reads, and left the BASE's `aliasOf` and `contrast` sitting under `$extensions` beside a
 * value they do not describe. Measured on `main` before the fix: **2369 aliased color leaves across
 * all twelve overlays, every single one** naming a path its own `$value` does not resolve to —
 * `$value: {…palette.white}` beside `aliasOf: …palette.neutral.050` — and 2057 carrying a stale
 * contrast. The correct rating was present the whole time, at the top level, 163/163 right in
 * `nb.hc-light`. Nothing was computed wrongly; it was filed in the wrong place, which is why every
 * gate stayed green: `regen --check` compares bytes of what the engine writes, and the engine wrote
 * the wrong thing consistently.
 *
 * The merge is therefore INTO `$extensions.prism3`, not over the leaf, and it REPLACES rather than
 * overlays the `MODE_SCOPED` fields — see that list for why silence has to mean absence.
 */
const modeLeaf = (n: Node, m: Node): Node => {
  const { $value: modeValue, description: modeDescription, ...modeFields } = m;
  const projected = projectLeaf(n);
  const ext = (projected.$extensions as Node | undefined) ?? {};
  const p3: Node = { ...((ext.prism3 as Node | undefined) ?? {}) };
  for (const f of MODE_SCOPED) delete p3[f];
  // The mode's own prose replaces the base's (#1623 DT/T-1). An overlay is a separate DTCG document, so
  // its leaf can carry the `$description` true for ITS value; copying the base's is how every dark and
  // high-contrast overlay came to describe a light-mode value.
  return {
    ...projected, $value: modeValue,
    ...(typeof modeDescription === 'string' ? { $description: modeDescription } : {}),
    $extensions: { ...ext, prism3: { ...p3, ...modeFields } },
  };
};

/** The diagnostic for a mode entry the projector cannot read. Its own function so the message is one
 *  string rather than assembled at a throw site, and so a test can assert on it. */
const unreadableMode = (mode: string, m: unknown): string =>
  `emit-dtcg-overlay: mode entry '${mode}' exists but carries no $value ` +
  `(got ${Array.isArray(m) ? 'a bare array — this is the #708 shape' : m === null ? 'null' : typeof m}). ` +
  `Every mode entry must wrap its value: { $value: … }. An unreadable entry is a DEFECT, never an ` +
  `absence — returning undefined here is what silently dropped every mode-varying shadow from every ` +
  `overlay in all four brands. Normalize the producer (see tree.ts shadowLeaf); do not widen this guard.`;

/**
 * One mode's OVERLAY: only the leaves whose value differs from base, with empty groups pruned.
 *
 * A leaf that carries a `modes` entry EQUAL to its default is deliberately excluded — the engine
 * emits those (a mode can re-derive a value and land on the same one), and including them would make
 * every overlay look larger than the change it represents. Comparing values rather than trusting the
 * extension's presence is what keeps the overlay honest about what actually moves.
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
export const buildOverlay = (tree: unknown, mode: string): unknown => {
  const walk = (n: unknown): unknown => {
    if (!n || typeof n !== 'object') return undefined;
    if (isLeaf(n)) {
      // Non-DTCG types are omitted here too (#642), not merely in the base. No `spring` leaf carries a
      // mode entry today, so this changes no committed byte — it is stated so the rule lives with BOTH
      // writers of the projection. A future non-standard type that did vary by mode would otherwise
      // reach a conforming consumer through the overlay while being correctly absent from the base.
      if (!isConformingLeaf(n)) return undefined;
      const p3 = ((n.$extensions as Node | undefined)?.prism3) as Node | undefined;
      const modes = p3?.modes as Node | undefined;
      // ABSENT means "this leaf does not vary in this mode" — the normal case, and the ONLY thing that
      // may return undefined here. Everything below is a shape question, and a shape we cannot read is
      // a defect rather than an absence (#708).
      if (!modes || !(mode in modes)) return undefined;
      const m = modes[mode] as Node | undefined;
      if (!m || typeof m !== 'object' || !('$value' in m)) throw new Error(unreadableMode(mode, m));
      // A leaf whose VALUE is unchanged still belongs here when its DESCRIPTION is not (#1623): a
      // consumer merging base + overlay would otherwise read the base's prose for this mode, which is
      // exactly the light-mode claim the per-mode description exists to replace.
      const sameProse = !('description' in m) || m.description === (n as Node).$description;
      if (JSON.stringify(m.$value) === JSON.stringify((n as Node).$value) && sameProse) return undefined;
      return modeLeaf(n, m);
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

/** The tree with every `$extensions` key removed, at any depth. Key order is otherwise kept. */
export const stripExtensions = (n: unknown): unknown => {
  if (Array.isArray(n)) return n.map(stripExtensions);
  if (!n || typeof n !== 'object') return n;
  const out: Node = {};
  for (const [k, v] of Object.entries(n as Node)) if (k !== '$extensions') out[k] = stripExtensions(v);
  return out;
};

/**
 * The WEB base (#4155, owner decision B, 2026-11-19): the conforming base with each typeface's curated fallback
 * stack folded into its `$value`, as DTCG 2025.10 §8.3's array form, primary family first. Stripped like the base.
 *
 * WHY A SEPARATE FILE and not the base itself: the base is the platform-NEUTRAL handoff (#609), and a stack such
 * as `system-ui, -apple-system, Segoe UI, …` means nothing to an Android `fontFamily` — stock Style Dictionary's
 * android group writes the whole list as one `<string>`, which no platform resolves. The web reads it as written,
 * so only the web build (`packages/tokens/sd.ship.mjs`) sources this file in place of the base. The canonical tree
 * keeps one family under `$value` and the stack under `$extensions.prism3.fallbackStack` (#105.3), so the Figma and
 * TokenPress round trip doesn't move. Typefaces don't vary by mode, so the overlays need no web flavor.
 *
 * Every other leaf is the base's, byte for byte; a `fontFamily` leaf with no stack keeps its single family.
 */
export const buildWebBase = (tree: unknown): unknown => {
  const stack = (n: unknown): unknown => {
    if (!n || typeof n !== 'object') return n;
    if (isLeaf(n)) {
      const fallback = ((n.$extensions as Node | undefined)?.prism3 as Node | undefined)?.fallbackStack;
      return n.$type === 'fontFamily' && typeof n.$value === 'string' && Array.isArray(fallback) && fallback.length
        ? { ...n, $value: [n.$value, ...fallback] }
        : n;
    }
    const out: Node = {};
    for (const [k, v] of Object.entries(n as Node)) out[k] = k.startsWith('$') ? v : stack(v);
    return out;
  };
  return stripExtensions(stack(buildBase(tree)));
};

/**
 * The whole projected set for one brand: the base plus one overlay per mode — THE CONSUMER SET (#2552, owner
 * decision Q250 A).
 *
 * By default every `$extensions` is removed, so a token carries only `$value`, `$type` and `$description` and the
 * files carry no generator stamp, no `decisions` log and no per-token build data. DTCG says a tool MUST preserve
 * what it does not understand, so anything left here travels into every client pipeline. The strip is safe HERE
 * and nowhere upstream: the canonical tree keeps each non-default mode inside `$extensions.prism3.modes`, and this
 * projection has already moved those values into their own overlays, so removing the extensions costs no value.
 * That is why the single-file tree stays internal and this set is the handoff.
 *
 * `metadata: true` keeps the build metadata — the studio's internal "Include build metadata" export. `buildBase` and
 * `buildOverlay` below are the metadata-keeping primitives; the strip is the one step after them.
 */
/**
 * DTCG 2025.10 VALUE FORMS (#4123, owner decision A). The canonical tree writes literals in the older drafts' string
 * forms (`"16px"`, `"#0a12281a"`, `"rgb(…)"`), and every reader in this repo reads them that way, so the conversion
 * happens here, at the handoff, and nowhere upstream:
 *
 *   color      Color module §4.1: `{ colorSpace: 'srgb', components: [r, g, b], alpha?, hex }`. `components` are 0–1,
 *              `hex` is the six-digit sRGB fallback, and `alpha` is written only when it is below 1.
 *   dimension  Format §8.2: `{ value, unit }`, the unit `px` or `rem`.
 *
 * The same rules apply inside composites: a shadow layer's `color`, `offsetX`, `offsetY`, `blur` and `spread`. An
 * alias (`{a.b}`) is a reference, not a literal, and stays as it is.
 *
 * DURATION STAYS A STRING (`"200ms"`), on purpose. Option A kept string forms where stock Style Dictionary can't read
 * the objects, and measured on 5.5 it can't: a `{ value: 200, unit: 'ms' }` duration, alone or as a transition's
 * `delay`, comes out as `[object Object]` in CSS, Swift, Kotlin and Android, where the string comes out as `200ms`.
 * Color and dimension objects come out byte-identical to their strings on every platform. So durations depart from
 * Format §8.5 until Style Dictionary reads them (its #1590), and `packages/tokens/README.md` says so.
 */
const HEX = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i;
const RGB = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;
const DIM = /^(-?\d+(?:\.\d+)?)(px|rem)$/;
const round4 = (x: number): number => Math.round(x * 10000) / 10000;
const hex2 = (n: number): string => Math.round(n).toString(16).padStart(2, '0');
export const conformColor = (v: unknown): unknown => {
  if (typeof v !== 'string') return v;
  let rgb: number[], alpha: number;
  const h = HEX.exec(v);
  const r = h ? null : RGB.exec(v);
  if (h) {
    rgb = [0, 2, 4].map((i) => parseInt(h[1]!.slice(i, i + 2), 16));
    alpha = h[2] ? parseInt(h[2], 16) / 255 : 1;
  } else if (r) {
    rgb = [r[1], r[2], r[3]].map(Number);
    alpha = r[4] === undefined ? 1 : Number(r[4]);
  } else return v;
  return {
    colorSpace: 'srgb',
    components: rgb.map((c) => round4(c / 255)),
    ...(alpha < 1 ? { alpha: round4(alpha) } : {}),
    hex: `#${rgb.map(hex2).join('')}`,
  };
};
export const conformDimension = (v: unknown): unknown => {
  const m = typeof v === 'string' ? DIM.exec(v) : null;
  return m ? { value: Number(m[1]), unit: m[2] } : v;
};
const SHADOW_DIMS = ['offsetX', 'offsetY', 'blur', 'spread'];
const conformLayer = (l: unknown): unknown => {
  if (!l || typeof l !== 'object') return l;
  const out: Node = { ...(l as Node) };
  if ('color' in out) out.color = conformColor(out.color);
  for (const k of SHADOW_DIMS) if (k in out) out[k] = conformDimension(out[k]);
  return out;
};
/** A copy of `n` with every literal color and dimension, at any depth, in its DTCG 2025.10 object form. */
export const conformValues = (n: unknown): unknown => {
  if (!n || typeof n !== 'object' || Array.isArray(n)) return n;
  const node = n as Node;
  if (isLeaf(node)) {
    const t = node.$type;
    const v = node.$value;
    const $value = t === 'color' ? conformColor(v)
      : t === 'dimension' ? conformDimension(v)
      : t === 'shadow' ? (Array.isArray(v) ? v.map(conformLayer) : conformLayer(v))
      : v;
    return { ...node, $value };
  }
  return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, k.startsWith('$') ? v : conformValues(v)]));
};

/**
 * TRACKING IN PX INSIDE A TYPE STYLE (#4128, owner decision A). DTCG Format §9.8 types a typography value's
 * `letterSpacing` as a dimension, and the canonical composite aliases `core.font.letter-spacing-role.*`, a `number`
 * multiplier of the font size (Q175 A). So the projection writes each style's tracking resolved: the multiplier times
 * that style's font size in px, rounded to 0.01px, as `{ value, unit: 'px' }`. The standalone `number` ladder is
 * unchanged. Per mode: where a mode's multiplier or font size differs, the resolved value differs too, so the style
 * gets a mode entry and lands in that mode's overlay. Works on a copy of the canonical tree; the tree itself keeps
 * the alias, which the Figma emitter and every other reader still use.
 */
const trackingInPx = (tree: unknown): unknown => {
  const copy = JSON.parse(JSON.stringify(tree)) as Node;
  const modes = overlayModes(tree);
  const leafAt = (ref: string): Node | undefined => {
    let cur: unknown = copy;
    for (const k of ref.split('.')) cur = cur && typeof cur === 'object' ? (cur as Node)[k] : undefined;
    return isLeaf(cur) ? cur : undefined;
  };
  const valueIn = (leaf: Node, mode?: string): unknown => {
    const m = mode ? ((leaf.$extensions as any)?.prism3?.modes?.[mode] as Node | undefined) : undefined;
    return m && '$value' in m ? m.$value : leaf.$value;
  };
  /** Follow aliases to a literal, in `mode` where a leaf carries one. */
  const resolve = (v: unknown, mode: string | undefined, depth = 0): { v: unknown; leaf?: Node } => {
    const ref = typeof v === 'string' ? /^\{([^}]+)\}$/.exec(v)?.[1] : undefined;
    if (!ref || depth > 20) return { v };
    const leaf = leafAt(ref);
    if (!leaf) return { v: undefined };
    const next = valueIn(leaf, mode);
    const out = resolve(next, mode, depth + 1);
    return { v: out.v, leaf: out.leaf ?? leaf };
  };
  const px = (v: unknown, leaf?: Node): number | undefined => {
    const known = (leaf?.$extensions as any)?.prism3?.px;
    if (typeof known === 'number' && typeof v === 'string' && v === leaf?.$value) return known;
    const m = typeof v === 'string' ? /^(-?\d+(?:\.\d+)?)(px|rem)$/.exec(v) : null;
    return m ? Number(m[1]) * (m[2] === 'rem' ? 16 : 1) : undefined;
  };
  const tracking = (value: Node, mode: string | undefined): unknown => {
    const mult = resolve(value.letterSpacing, mode).v;
    const size = resolve(value.fontSize, mode);
    const sizePx = px(size.v, size.leaf);
    if (typeof mult !== 'number' || sizePx === undefined) return value.letterSpacing;
    const r = Math.round(mult * sizePx * 100) / 100;
    return { value: r === 0 ? 0 : r, unit: 'px' };
  };
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    const node = n as Node;
    if (isLeaf(node)) {
      if (node.$type !== 'typography' || !node.$value || typeof node.$value !== 'object') return;
      const base = node.$value as Node;
      if (!('letterSpacing' in base)) return;
      const baseLs = tracking(base, undefined);
      for (const mode of modes) {
        const ext = ((node.$extensions ??= {}) as any);
        const entry = ext.prism3?.modes?.[mode] as Node | undefined;
        const modeValue = (entry && typeof entry.$value === 'object' ? entry.$value : base) as Node;
        const ls = tracking(modeValue, mode);
        if (entry) entry.$value = { ...modeValue, letterSpacing: ls };
        else if (JSON.stringify(ls) !== JSON.stringify(baseLs)) ((ext.prism3 ??= {}).modes ??= {})[mode] = { $value: { ...base, letterSpacing: ls } };
      }
      node.$value = { ...base, letterSpacing: baseLs };
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v);
  };
  walk(copy);
  return copy;
};

export const buildOverlaySet = (tree: unknown, opts: { metadata?: boolean } = {}): { base: unknown; overlays: Array<{ mode: string; tree: unknown }> } => {
  const keep = (t: unknown): unknown => conformValues(opts.metadata ? t : stripExtensions(t));
  const projected = trackingInPx(tree);
  return {
    base: keep(buildBase(projected)),
    overlays: overlayModes(projected).map((mode) => ({ mode, tree: keep(buildOverlay(projected, mode)) })),
  };
};
