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
 *     <brand>.base.tokens.json          every token, default-mode values, NO modes extension
 *     <brand>.<mode>.overlay.tokens.json  ONLY the leaves whose value differs from base
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
 * The BASE tree: default-mode values, with the `modes` extension removed.
 *
 * Removing it is not tidying — it is the whole contract. A consumer that reads this file must not be
 * able to find a second value it is silently ignoring; if `modes` rode along, the base would be the
 * canonical tree again and the projection would buy nothing. Everything else under `$extensions`
 * stays: it is descriptive (contrast ratings, provenance, Figma binding), not a hidden value.
 */
export const buildBase = (tree: unknown): unknown => {
  const strip = (n: unknown): unknown => {
    if (!n || typeof n !== 'object') return n;
    if (isLeaf(n)) {
      const out = { ...(n as Node) };
      const ext = out.$extensions as Node | undefined;
      const p3 = ext?.prism3 as Node | undefined;
      if (p3 && 'modes' in p3) {
        const { modes: _drop, ...rest } = p3;
        out.$extensions = { ...ext, prism3: rest };
      }
      return out;
    }
    const out: Node = {};
    for (const [k, v] of Object.entries(n as Node)) out[k] = k.startsWith('$') ? v : strip(v);
    return out;
  };
  return strip(tree);
};

/**
 * One mode's OVERLAY: only the leaves whose value differs from base, with empty groups pruned.
 *
 * A leaf that carries a `modes` entry EQUAL to its default is deliberately excluded — the engine
 * emits those (a mode can re-derive a value and land on the same one), and including them would make
 * every overlay look larger than the change it represents. Comparing values rather than trusting the
 * extension's presence is what keeps the overlay honest about what actually moves.
 */
export const buildOverlay = (tree: unknown, mode: string): unknown => {
  const walk = (n: unknown): unknown => {
    if (!n || typeof n !== 'object') return undefined;
    if (isLeaf(n)) {
      const p3 = ((n.$extensions as Node | undefined)?.prism3) as Node | undefined;
      const m = (p3?.modes as Node | undefined)?.[mode] as Node | undefined;
      if (!m || !('$value' in m)) return undefined;
      if (JSON.stringify(m.$value) === JSON.stringify((n as Node).$value)) return undefined;
      // The leaf as the mode sees it — the mode's `$value`, and the base leaf's descriptive fields
      // so the overlay is a valid standalone DTCG token rather than a bare value.
      const base = buildBase(n) as Node;
      return { ...base, ...m, $value: m.$value };
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

/** The whole projected set for one brand: the base plus one overlay per mode. */
export const buildOverlaySet = (tree: unknown): { base: unknown; overlays: Array<{ mode: string; tree: unknown }> } => ({
  base: buildBase(tree),
  overlays: overlayModes(tree).map((mode) => ({ mode, tree: buildOverlay(tree, mode) })),
});
