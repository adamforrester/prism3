/**
 * OVERLAY PROVENANCE GATE (#1257) — an overlay leaf's provenance describes ITS OWN value, not the
 * base mode's.
 *
 *   npx tsx packages/engine/lint-overlay-provenance.ts
 *
 * THE DEFECT THIS CATCHES. `emit-dtcg-overlay.ts` built a mode's leaf as
 * `{ ...projectLeaf(n), ...m, $value: m.$value }` — the mode entry spread over the leaf's TOP level.
 * A mode entry's fields (`contrast`, `against`, `min`) live under `$extensions.prism3` on a leaf, so
 * the spread put the mode's CORRECT rating outside `$extensions` as a stray sibling of `$type` that
 * no consumer reads, and left the BASE mode's `aliasOf` and `contrast` under `$extensions` beside a
 * value they do not describe. Measured on `main` immediately before the fix:
 *
 *     2369 aliased colour leaves across all twelve overlays — EVERY ONE — naming a path its own
 *     `$value` does not resolve to. `$value: "{nbds.core.palette.white}"` beside
 *     `aliasOf: "nbds.core.palette.neutral.050"`. 2057 also carried a stale `contrast`.
 *
 * WHY EVERY EXISTING GATE PASSED IT. Nothing was computed wrongly — the mode's rating was present the
 * whole time, 163/163 correct in `nb.hc-light`, merely filed at the wrong depth. `regen --check`
 * compares bytes of what the engine writes and the engine wrote the wrong thing consistently.
 * `lint-overlay-completeness.ts` (#708) asks WHICH leaves are in an overlay and what their `$value`
 * is, which were both right. `lint-ratio-truth.ts` (#956) recomputes ratios from the CANONICAL tree
 * and never opens an overlay. The projected files are the artifact a conforming consumer is told to
 * read standalone, and no gate had ever asked whether a leaf there is internally consistent.
 *
 * ── INDEPENDENCE (docs/34) — READ BEFORE CHANGING ANY COMPARISON BELOW ──────────────────────────
 *
 *   ACTUAL   — the emitted OVERLAY artifacts (`<brand>.<mode>.overlay.tokens.json`), the projector's
 *              output.
 *   EXPECTED — the emitted CANONICAL tree (`<brand>.tokens.json`), written by `tree.ts`, which the
 *              overlay projector does not write and this gate reads by its own traversal.
 *
 * Two artifacts, two producers. Arm B compares them directly, which is the strong claim: the
 * overlay's provenance must name what the canonical tree says that mode's value IS.
 *
 * WHAT MUST NEVER BE DONE HERE, because each turns the gate into agreement with itself:
 *
 *   ✗ calling `buildOverlay()` or `modeLeaf()` to compute what a leaf should contain — the #1257 bug
 *     would be reproduced on both sides and reported as a pass (`docs/34` shape 2);
 *   ✗ deriving EXPECTED from the overlay leaf's own `$extensions` — that is the field under test;
 *   ✗ resolving an alias through `emit-dtcg.ts`'s resolver. Arm A walks the palette itself, below.
 *
 * ARM A'S STATED LIMIT, because it is smaller than it looks and saying so is the point. It resolves
 * `aliasOf` and `$value` through the palette INDEPENDENTLY of the emitter and compares the two hexes,
 * which catches the shipped defect at full width. It would NOT catch a future writer that derived
 * `aliasOf` by stripping the braces off `$value` — the two would agree by construction (`docs/34`
 * shape 17, both sides descending from one producer). Arm B is what covers that case, and it is the
 * reason both arms exist rather than the stronger one alone.
 *
 * ── THE ARMS ────────────────────────────────────────────────────────────────────────────────────
 *
 *   A  SELF-CONSISTENT — the leaf's `aliasOf` and its `$value` resolve, through the palette, to the
 *                        SAME colour. Resolution is this file's own walker over the canonical tree.
 *   B  AGREES WITH THE CANONICAL TREE — the leaf's `aliasOf` and `contrast` equal what the canonical
 *                        tree's `modes[mode]` entry declares for that same token path. This is the
 *                        cross-artifact arm and the one that survives a shape-17 refactor.
 *   C  NO STRAY TOP-LEVEL FIELDS — a leaf carries only `$`-prefixed keys. The old spread's visible
 *                        signature was `contrast`/`against`/`min` sitting beside `$type`; a leaf that
 *                        grows one again has had the merge reverted, whatever the values say.
 *   D  THE MODE ENTRY CARRIES ITS OWN `aliasOf` — checked on the canonical tree, upstream of the
 *                        projector. This is the #1257 CAUSE rather than its symptom: before the fix
 *                        no colour mode entry had an `aliasOf` at all, so the overlay had nothing
 *                        correct to copy and any fix confined to the projector would have had to
 *                        invent one.
 *
 * FLOORS (`docs/34` shape 9). Every arm is a statement about a set and passes vacuously over an empty
 * one — a renamed artifact or a changed extension shape would take the census to zero and this would
 * report clean. So: every discovered overlay must be READ, each must yield at least one aliased
 * colour leaf, and the corpus-wide aliased-leaf count has a floor well below today's 2369.
 *
 * SCOPE BY RULE, NOT BY LIST. Brands and modes are discovered from `out/`, and a leaf is in scope
 * because it HAS an `aliasOf` and a string `$value` — not because it is a colour. A future aliased
 * type is covered the day it is emitted, with no edit here.
 *
 * PURE-ADJACENT — reads the committed artifacts only, like `regen --check`.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, 'out');

type Node = Record<string, unknown>;

const isLeaf = (n: unknown): n is Node => !!n && typeof n === 'object' && '$value' in (n as Node);

/** Every `$value` leaf in a tree, by dotted path. One traversal, used for both artifacts. */
const leavesOf = (tree: unknown): Map<string, Node> => {
  const out = new Map<string, Node>();
  const walk = (n: unknown, p: string): void => {
    if (!n || typeof n !== 'object') return;
    if (isLeaf(n)) { out.set(p, n); return; }
    for (const [k, v] of Object.entries(n as Node)) walk(v, p ? `${p}.${k}` : k);
  };
  walk(tree, '');
  return out;
};

/**
 * Resolve a token PATH to the concrete value it ends at, following `{…}` aliases through the
 * canonical tree. This file's own resolver, deliberately — see the header's independence note.
 *
 * Returns `undefined` for a path that does not resolve, which arm A reports rather than skips: a
 * dangling alias is a defect in its own right, and skipping it would let a leaf whose provenance
 * names a nonexistent path pass as "nothing to compare" (`docs/34` shape 9's empty-set tell).
 *
 * The depth cap is not defensive decoration — an alias cycle would otherwise hang the gate, and a
 * gate that hangs is indistinguishable from one that is slow.
 */
const resolvePath = (canon: Map<string, Node>, path: string): unknown => {
  let cur = path;
  for (let hop = 0; hop < 16; hop++) {
    const leaf = canon.get(cur);
    if (!leaf) return undefined;
    const v = leaf.$value;
    if (typeof v === 'string' && /^\{.+\}$/.test(v)) { cur = v.slice(1, -1); continue; }
    return v;
  }
  return undefined;
};

const brands = [...new Set(
  readdirSync(OUT).filter((f) => f.endsWith('.overlay.tokens.json')).map((f) => f.split('.')[0]),
)].sort();

if (!brands.length) {
  console.error('✗ no overlay artifacts found in packages/engine/out — this gate examined nothing, which is a failure, not a pass');
  process.exit(1);
}

const failures: string[] = [];
const perBrand: string[] = [];
let overlaysRead = 0;
let aliasedAsserted = 0;

for (const brand of brands) {
  const canonPath = join(OUT, `${brand}.tokens.json`);
  const canon = leavesOf(JSON.parse(readFileSync(canonPath, 'utf8')));

  // ---- ARM D: the CAUSE, checked upstream on the canonical tree ---------------------------------
  // Every colour mode entry must carry its own `aliasOf`. Before #1257 none did (measured: 729 colour
  // mode entries per brand, 0 with an alias), which is why the projector had nothing right to copy.
  // Asked here rather than only downstream because a projector fix alone would have had to invent the
  // value, and an invented provenance is worse than a stale one.
  let modeEntries = 0;
  let missingAlias = 0;
  for (const [path, leaf] of canon) {
    const modes = ((leaf.$extensions as Node | undefined)?.prism3 as Node | undefined)?.modes as Node | undefined;
    if (!modes) continue;
    for (const [mode, entry] of Object.entries(modes)) {
      const e = entry as Node;
      // Scoped to entries whose BASE leaf is aliased: a composite (shadow) has no `aliasOf` at either
      // tier and demanding one would be inventing a field, not restoring one.
      if (typeof ((leaf.$extensions as Node).prism3 as Node).aliasOf !== 'string') continue;
      modeEntries++;
      if (typeof e.aliasOf !== 'string') {
        missingAlias++;
        if (missingAlias <= 3) failures.push(`${brand}: canonical leaf '${path}' mode '${mode}' carries no aliasOf, but its base leaf is aliased — the mode's value has no provenance for the overlay to copy (#1257 arm D)`);
      }
    }
  }
  if (missingAlias > 3) failures.push(`${brand}: …and ${missingAlias - 3} further canonical mode entries with no aliasOf (${missingAlias} of ${modeEntries})`);

  const notes: string[] = [];
  const files = readdirSync(OUT).filter((f) => f.startsWith(`${brand}.`) && f.endsWith('.overlay.tokens.json')).sort();
  for (const file of files) {
    const mode = file.slice(brand.length + 1, -'.overlay.tokens.json'.length);
    const overlay = leavesOf(JSON.parse(readFileSync(join(OUT, file), 'utf8')));
    overlaysRead++;
    let aliased = 0;

    for (const [path, leaf] of overlay) {
      // ---- ARM C: no stray top-level descriptive fields ----------------------------------------
      const stray = Object.keys(leaf).filter((k) => !k.startsWith('$'));
      if (stray.length) failures.push(`${brand}/${mode}: leaf '${path}' carries non-$ top-level key(s) [${stray.join(', ')}] — the mode entry was spread over the leaf instead of merged into $extensions.prism3, which is #1257's exact signature`);

      const p3 = (leaf.$extensions as Node | undefined)?.prism3 as Node | undefined;
      const aliasOf = p3?.aliasOf;
      if (typeof aliasOf !== 'string' || typeof leaf.$value !== 'string') continue;
      aliased++;
      aliasedAsserted++;

      // ---- ARM A: aliasOf and $value resolve to the same colour --------------------------------
      const valuePath = /^\{.+\}$/.test(leaf.$value) ? leaf.$value.slice(1, -1) : undefined;
      if (valuePath === undefined) {
        failures.push(`${brand}/${mode}: leaf '${path}' declares aliasOf '${aliasOf}' but its $value is a literal, not an alias — provenance names a path the value does not travel`);
        continue;
      }
      const viaValue = resolvePath(canon, valuePath);
      const viaAlias = resolvePath(canon, aliasOf);
      if (viaValue === undefined) failures.push(`${brand}/${mode}: leaf '${path}' has $value '{${valuePath}}', which does not resolve in the canonical tree`);
      else if (viaAlias === undefined) failures.push(`${brand}/${mode}: leaf '${path}' has aliasOf '${aliasOf}', which does not resolve in the canonical tree`);
      else if (JSON.stringify(viaValue) !== JSON.stringify(viaAlias))
        failures.push(`${brand}/${mode}: leaf '${path}' provenance disagrees with its own value — aliasOf '${aliasOf}' resolves to ${JSON.stringify(viaAlias)}, $value '{${valuePath}}' resolves to ${JSON.stringify(viaValue)} (#1257 arm A)`);

      // ---- ARM B: agrees with the canonical tree's own mode entry ------------------------------
      const canonLeaf = canon.get(path);
      const entry = ((canonLeaf?.$extensions as Node | undefined)?.prism3 as Node | undefined)?.modes as Node | undefined;
      const me = entry?.[mode] as Node | undefined;
      if (!me) {
        failures.push(`${brand}/${mode}: leaf '${path}' is in the overlay but the canonical tree records no '${mode}' entry for it — nothing to check its provenance against`);
        continue;
      }
      if (me.aliasOf !== aliasOf)
        failures.push(`${brand}/${mode}: leaf '${path}' declares aliasOf '${aliasOf}', but the canonical tree's '${mode}' entry says '${String(me.aliasOf)}' (#1257 arm B)`);
      if (me.contrast !== undefined && p3?.contrast !== me.contrast)
        failures.push(`${brand}/${mode}: leaf '${path}' declares contrast ${String(p3?.contrast)}, but the canonical tree's '${mode}' entry measured ${String(me.contrast)} (#1257 arm B)`);
    }

    // FLOOR: an overlay that yields no aliased leaf is one this gate did not examine.
    if (!aliased) failures.push(`${brand}/${mode}: 0 aliased leaves found in ${file} — every arm above is vacuous over an empty set, so this is a failure rather than a clean run (docs/34 shape 9)`);
    notes.push(`${mode}=${aliased}`);
  }
  perBrand.push(`  ${brand.padEnd(8)} ${notes.join('  ')}`);
}

// FLOOR: the corpus-wide count. Set well below today's 2369 so a legitimate change does not trip it,
// and far enough above zero that a detector that stopped recognizing leaves cannot pass.
const FLOOR = 1500;
if (aliasedAsserted < FLOOR)
  failures.push(`only ${aliasedAsserted} aliased overlay leaves examined corpus-wide, floor ${FLOOR} — the census collapsed, so the arms above are reporting on a set too small to mean anything (docs/34 shape 9)`);

console.log(`overlay provenance — aliased leaves per overlay, read from the emitted artifacts:`);
for (const line of perBrand) console.log(line);

if (failures.length) {
  console.error(`\n✗ ${failures.length} overlay provenance failure(s):\n`);
  for (const f of failures.slice(0, 40)) console.error(`  • ${f}`);
  if (failures.length > 40) console.error(`  • …and ${failures.length - 40} more`);
  console.error(
    `\nAn overlay leaf's $extensions.prism3 must describe ITS OWN value: the mode's aliasOf and the\n` +
    `mode's contrast, not the base's. The projector merges the mode entry INTO $extensions.prism3\n` +
    `(see MODE_SCOPED in emit-dtcg-overlay.ts), and the canonical mode entry carries the aliasOf it\n` +
    `copies (tree.ts). If the overlays look right and this gate is wrong, do not relax the\n` +
    `comparison — the two sides are separate artifacts on purpose (#1257, docs/34).`,
  );
  process.exit(1);
}

console.log(
  `\n  ✓ clean — ${aliasedAsserted} aliased leaves across ${overlaysRead} overlays in ${brands.length} brands: ` +
  `every one's aliasOf and contrast describe its own value, and agree with the canonical tree's entry for that mode.`,
);
