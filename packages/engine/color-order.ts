/**
 * Prism3 engine — THE ORDER COLOUR ROLES ARE WRITTEN IN (#1150, #2860).
 *
 * Figma lists a variable collection in CREATION order, and the engine creates variables in the order
 * `leaves()` walks the DTCG tree, which is object-key insertion order, which is the order `tree.ts` writes
 * the roles in. So this file is the one place that states what a designer reads down the variables panel.
 *
 * It is a DESIGN-UX order, never an alphabetical one (owner, #2860): roles in the order a designer reaches for
 * them — primary → secondary → tertiary, then the statuses, then their `-subtle` tints, then the `on-` inks —
 * and states in interaction order, rest → hover → pressed → focused → selected.
 *
 *   - Families read outward: the ground (`background`, `foreground`), what sits on it (`text`), the drawn edge
 *     (`border`), the glyph ink (`icon`), what responds (`interactive`), the disabled set, the two washes
 *     (`scrim`, `veil`), the one composite family (`field`) — and `inverse` LAST, because it re-states the
 *     families above for a flipped ground, so anywhere but the end splits each family into two places. The
 *     order is the owner's hand-set panel in the reference master (#2900); #2860 had `interactive` before
 *     `border` and `icon`, which was a misreading of that panel.
 *   - Statuses are ALWAYS the engine's `SEMANTICS` order (brand, success, warning, danger, info), in every
 *     family, `-subtle` and `on-` forms included. The list is imported, never restated (#2836, Q453 A).
 *   - `inverse.<family>` mirrors `<family>` exactly: the rank is taken from the path with `inverse.` stripped,
 *     so the two cannot differ, and the inverse families keep the default families' relative order.
 *   - Every group is contiguous: the sort is by the whole path, one segment at a time, so a role added later
 *     lands inside its group instead of being appended to the collection.
 *
 * A segment this file does not name is a throw, not a silent append: appending would place a new role wherever
 * the resolver happened to build it, which is the one thing this list exists to prevent.
 *
 * **`appearance` must never be added as a family.** It is not a role family; it was the middle segment of the
 * two-tier colour split (#1013–#1148), and the materialization rule `color-one-collection-1148` reads
 * `<root>/color/appearance/*` in a designer's file as that historical marker. Leaving it unlisted is what
 * enforces this: the throw below is the enforcement, not a comment.
 *
 * The Figma Plugin API can reorder STYLES but not variables, so this order holds for a file built fresh from
 * the emission; in an existing file the Update dry run lists what is out of order (apps/plugin/README.md).
 */
import { SEMANTICS } from './modes';

/** The families in the order they read; `inverse` is last and is handled as a prefix, see `colorRoleRank`. */
export const COLOR_FAMILY_ORDER = [
  'background', 'foreground', 'text', 'border', 'icon', 'interactive',
  'disabled', 'scrim', 'veil', 'field', 'inverse',
] as const;

const INK_ROLES = [
  'primary', 'secondary', 'tertiary',
  ...SEMANTICS,
  ...SEMANTICS.map((s) => `${s}-subtle`),
  ...SEMANTICS.map((s) => `on-${s}`),
  'link', 'focus',
];
const LINK_STATES = ['default', 'hover', 'visited', 'focused', 'pressed'];
const INTERACTIVE_PARTS = ['fill', 'on-fill', 'text', 'icon', 'border', 'overlay', 'subtle-fill'];
const INTERACTIVE_STATES = ['rest', 'hover', 'pressed', 'focused', 'selected'];

/** Segment positions a brand may add siblings to (`interactivePalettes` adds a tone), as `family.depth`. A segment
 *  there that the table does not name goes after the named ones, in the order the resolver built it. */
const OPEN_SEGMENTS = new Set(['interactive.0']);

/** Per family, the sibling order at each depth below the family segment. */
const SEGMENT_ORDER: Record<string, string[][]> = {
  background: [INK_ROLES],
  foreground: [INK_ROLES],
  text: [INK_ROLES, LINK_STATES],
  icon: [INK_ROLES, LINK_STATES],
  border: [INK_ROLES],
  interactive: [['primary', 'destructive', 'neutral'], INTERACTIVE_PARTS, INTERACTIVE_STATES],
  disabled: [['fill', 'on-fill', 'text', 'icon', 'border']],
  scrim: [['default']],
  veil: [['dark', 'light'], ['subtle', 'medium', 'strong', 'clear']],
  field: [['fill', 'border', 'placeholder'], ['rest', 'hover']],
};

/** The rank of every segment of a role key, or why it has none. */
const rankOf = (key: string): number[] | string => {
  const parts = key.split('.');
  const inverse = parts[0] === 'inverse';
  const path = inverse ? parts.slice(1) : parts;
  const family = COLOR_FAMILY_ORDER.indexOf(path[0] as never);
  const table = SEGMENT_ORDER[path[0]];
  if (family < 0 || !table || path[0] === 'inverse')
    return `color-order: color role family '${path[0]}' (from '${key}') is not in COLOR_FAMILY_ORDER — #1150 makes the `
      + 'written order the order Figma lists the collection in, so an unranked family would land wherever the '
      + 'resolver happened to build it. Add it at the position it should read in the variables panel.';
  const rest: number[] = [];
  for (const [i, seg] of path.slice(1).entries()) {
    const at = table[i]?.indexOf(seg) ?? -1;
    if (at >= 0) rest.push(at);
    else if (OPEN_SEGMENTS.has(`${path[0]}.${i}`)) rest.push(table[i].length);
    else
      return `color-order: '${seg}' (position ${i + 1} of '${key}') is not named in the ${path[0]} order — add it to `
        + 'SEGMENT_ORDER where a designer should reach for it, not at the end by default (#2860).';
  }
  return [inverse ? COLOR_FAMILY_ORDER.length : 0, family, ...rest];
};

const compareRanks = (a: number[], b: number[]): number => {
  for (let n = 0; n < Math.max(a.length, b.length); n++) {
    const d = (a[n] ?? -1) - (b[n] ?? -1);
    if (d) return d;
  }
  return 0;
};

/** Role keys in canonical order. Stable for equal ranks; throws on a family or segment it does not name. */
export const orderedRoleKeys = (keys: string[]): string[] =>
  keys
    .map((k, i) => {
      const r = rankOf(k);
      if (typeof r === 'string') throw new Error(r);
      return { k, i, r };
    })
    .sort((a, b) => compareRanks(a.r, b.r) || a.i - b.i)
    .map((e) => e.k);

/**
 * The colour variables of an existing file that are out of canonical order (#2860), for the Update dry run to
 * list. `names` are the file's variable names IN THE ORDER THE HOST RETURNS THEM, full paths (`<root>/color/...`).
 * The Plugin API cannot move a variable, so this only names what a person would drag: the fewest variables whose
 * removal leaves the rest in order (the longest run already in canonical order stays; every other name is listed).
 * A name this file does not rank (a designer's own variable) is neither listed nor counted, and nothing throws.
 */
export const colorVariablesOutOfOrder = (names: readonly string[]): string[] => {
  const byRoot = new Map<string, { name: string; r: number[] }[]>();
  for (const name of names) {
    const m = /^([^/]+)\/color\/(.+)$/.exec(name);
    if (!m) continue;
    const r = rankOf(m[2].replace(/\//g, '.'));
    if (typeof r === 'string') continue;
    byRoot.set(m[1], [...(byRoot.get(m[1]) ?? []), { name, r }]);
  }
  const out: string[] = [];
  for (const rows of byRoot.values()) {
    // Longest non-decreasing run in file order, by patience sorting: `tails[k]` is the end of the best run of
    // length k + 1, `prev` threads the run back so the members of one can be marked kept.
    const tails: number[] = [], prev: number[] = [];
    rows.forEach((row, i) => {
      let lo = 0, hi = tails.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (compareRanks(rows[tails[mid]].r, row.r) <= 0) lo = mid + 1; else hi = mid; }
      prev[i] = lo ? tails[lo - 1] : -1;
      tails[lo] = i;
    });
    const kept = new Set<number>();
    for (let i = tails.length ? tails[tails.length - 1] : -1; i >= 0; i = prev[i]) kept.add(i);
    rows.forEach((row, i) => { if (!kept.has(i)) out.push(row.name); });
  }
  return out;
};
