/**
 * STYLE-GUIDE test (#259, phases 1–2) — the cell sets, the color tables, and the dimension, font-variable and text-style
 * tables.
 *
 *   npx tsx apps/plugin/test-style-guide.ts
 *
 * Drives `style-guide-cells.ts` and `style-guide.ts` against an in-memory NODE SHIM of a Figma file whose
 * variables are the REAL prism3 emission (`packages/engine/out/figma/prism3/core.palette.json` + the four
 * `color.<mode>.json`), plus a small foreign collection with unpadded steps stored out of order. Checked:
 *   1. file setup builds the three cell sets onto `↳ File Components`, and a second run builds none;
 *   2. sets a file already has — on another page, in another case — are ADOPTED: never moved, never rebuilt,
 *      only the missing one is built;
 *   3. the PLAN — a table per group, primitive collections on `↳ Primitive tokens` and semantic ones on
 *      `↳ Semantic tokens`, one specimen + value (+ contrast) column per mode, and the measured contrast of
 *      prism3 `text.primary` on `background.primary` as literal ratios per mode;
 *   4. primitive steps in NUMERIC order;
 *   5. the EXECUTOR — every mode column's swatch pins its mode and is bound to its variable, each specimen
 *      is drawn on its contracted ground (inverse text on the inverse ground, not white), the contrast cell's
 *      words, the header instance;
 *   6. a RERUN updates in place — no second table — and reports tokens added, removed and changed; an emptied
 *      group's table, unedited, is deleted;
 *   7. a missing page, missing cell sets and a missing header set are skips, reported, never thrown;
 *   8. the table KEY (collection ID + full path) survives a sibling group and a renamed collection; the header
 *      descriptions state only what was checked; the rerun report keys rows by variable ID and compares raw
 *      values; the stale report stays inside the run's types and collections; an uncontracted mode is named;
 *      a mixed-font cell loads every segment's font or names the miss;
 *   9. a TWO-ROOT file (`nbds/…` and `pds3/…` in the same collections, as the owner's test file holds them)
 *      groups within each root and names it in the title, grounds stay in their root, a rerun over the live
 *      run's tables rewrites old titles and reports the per-root tables as replaced and kept; an unbound swatch is a ⚠
 *      with its count; named values lead a ramp;
 *  10. a RERUN RE-FLOWS the generator's tables into a row, left to right, when one widens (owner decision 16), leaving a
 *      designer-moved table alone; a grid that drops its
 *      HUG column or row tracks, and a header that does not take its table's width, are named. Column widths (sections 2
 *      and 5) are read off the shim's own layout model — 7px a character, a HUG track as wide as its widest cell's
 *      content, 2px between tracks — never off the plugin's arithmetic;
 *  11. SUPERSEDED tables (owner decision, 2026-09-28): an unedited replaced or stale table is deleted, header and
 *      cells with it, and the row closes over it; one with a text cell retyped, one moved, one with no
 *      fingerprint and a duplicate of one are kept and reported apart; a frame the generator did not make is
 *      never touched, whatever its name. The edits are made to the shim's nodes here, never through the plugin;
 *  12. THE OWNER'S GRID MODEL (owner decisions, 2026-09-29): HUG tracks 2px apart, every cell FILL on both axes, the
 *      palette swatch FILLing its cell, floored at 32 × 32, and a role's swatch FIXED on its ground (section 5 checks
 *      the specimen by role: a palette row's bare swatch with no ground, a taller row making a taller swatch; letters for a text role, the outline for a border and the filled square for a fill, each on its
 *      ground), text on one line; the header spans its table, not the
 *      header component's 2,517px; a grid dragged wider keeps every cell as wide as its track, and the table and its
 *      header follow the grid. Whether the HUG tracks take up the extra width is NOT asserted: the typings define HUG
 *      as CSS `fit-content(100%)`, which does not grow past its content, so that is a live-check (docs/45 §7);
 *  13. the TABLES FILTER (#1778): one table drawn in place, the 42 others untouched and never stale; a filtered run
 *      moves only the tables after the drawn one, in its row, by exactly its change in width, widening or
 *      narrowing — it closes no gap, leaves a table a designer moved and a table with no position record alone, and
 *      writes no record for a table it does not move; any case, or a key; an unknown name reported with the first 8
 *      titles, and not a pass; a renamed group's old table named as staying until an unfiltered run;
 *  14. YIELDING (#1778), with a counting `yieldTo`: a progress reading per table, a yield after every table, and at
 *      least 12 yields inside the 124-row Inverse table, never more than 10 rows apart;
 *  15. ONE RUN AT A TIME (#1785): a run asked for from the agent link while a panel run is mid-yield is refused, naming
 *      the panel's run, and exactly one set of tables results. (`test-agent-link.ts` drives the same gate through
 *      `main.ts`'s two real entry points.)
 *  16–19. PHASE 2 (#259), on the prism3 emission's dimension and font variables and its 63 text styles, plus a
 *      mode-varying `density` and a `metrics` ramp stored out of order: a table per collection and type on the right
 *      page; spacing bars, brackets and radius swatches at the value with their width or corner bound and each mode
 *      pinned; px and REM at 16px; ramp order; a font variable's one property bound; the fluid type-sets sizes side by
 *      side; the text-style table in the file's order with its style applied; the toggled columns; a rerun in place;
 *      the tables filter; the phase boundary; a refused binding named.
 *  20. THE TITLE CELL (owner decision 15): off by default; humanized defaults; an edit survives reruns while an unedited
 *      title follows a rename; a title edit is not an edit to the table when a superseded table is judged.
 *  21. THE REVIEW OF 4faeb98a: each reviewed shape's variable kind, a refused or ignored resize counted, the host's font
 *      rule (loaded before bound, pinned before bound), superseded phase-2 tables, all four radius corners.
 *  22. THE OWNER'S CELL STRUCTURE (the live run of 4faeb98a): the owner's spacing and radius cells, copied from a live
 *      measurement, and the cells the real builder makes, each drawing the bracket, the bar and the radius at their
 *      value; the bracket's right edge carried, moved (named static) or counted; a cell with no layer counted.
 *  23. ROWS BY CATEGORY (owner decision 16): literal positions for two categories; a width change moves its row's later
 *      tables, a height change moves the rows below; a new category starts a new row.
 *  24. THE REVIEW OF f3bb76cd: a bracket with its parts named otherwise, and a file with no spacing set, counted; one
 *      verdict per specimen; a new table taller than its row pushing the row below down.
 *
 * INDEPENDENCE (docs/34): expected values are literals written here. The ratios (19.42, 18.13, 21) and the
 * failing 3.27 (neutral/400 on white, computed by hand from the WCAG formula), 6.44 (foreground.brand on
 * neutral/050) and 15.42 (text.primary over the 10% hover wash on background.primary; 19.42 on the bare ground) are the engine's own contract figures floored to two places, transcribed from a probe of
 * `resolveAllModes` / `contrast` — never read off `style-guide.ts`. Page names, set names, group titles and
 * variant names are typed here, not imported. The shim's case-insensitive set search is its own.
 *
 * BY-NAME MUTATIONS (each proven red, then restored — docs/00-progress.md 2026-09-28):
 *   - drop `inst.setExplicitVariableModeForCollection` on the swatch → "5: every text/primary swatch pins its
 *     column's mode" fails;
 *   - skip the swatch binding → "5: every text/primary swatch is bound to text/primary" fails;
 *   - draw every specimen on white (`groundVariable` forced undefined) → "5: inverse/text/primary is drawn
 *     on inverse/background/primary" fails;
 *   - sort primitive rows lexically → "4: foreign ramp in numeric order" fails;
 *   - never find an existing table on rerun → "6: rerun: 10 tables on the semantic page — none duplicated…" fails
 *     (it read "still 11 tables" before superseded tables were deleted);
 *   - build every cell set regardless of `findCellSets` → "2: the adopted swatch set is not duplicated" fails;
 *   - the diamond at x = 24, y = 8.44 → "1: the icon diamond's box is 8.44–39.56 on both axes…" fails;
 *   - measure the ink against the bare ground, not the composite → "3: text/primary over
 *     interactive.primary.overlay.hover on background.primary, light: 15.42:1" fails;
 *   - `groundModeFor` always the column's mode → "3: foreground.brand on neutral/050, light: 6.44:1" fails;
 *   - key by collection name, or by the prefix-relative group → "8: a sibling group added to legacy…" fails;
 *   - the stale check ignores the run's types → "8: a dimension-only run reports no color table stale" fails;
 *   - read no font segments → "8: a mixed-font cell loads every segment's font and is written" fails;
 *   - drop the unreadable-font miss → "8: a cell whose fonts cannot be read is named…" fails;
 *   - claim every step referenced / every role measured → "8: Accent header…" / "8: Scrim header…" fail;
 *   - snapshot rows by name → "8: a renamed variable is a rename, not an add and a remove" fails;
 *   - snapshot the printed value → "8: switching Hex to RGBA changes no row" fails;
 *   - never name an uncontracted mode → "8: a file mode the engine does not contract is named" fails;
 *   - `bindTarget` searches descendants only → "2: a type=default swatch with no layers binds the instance's
 *     own fill" fails;
 *   - leave `unbound` out of ok/headline → "9: unbound swatches are not a pass…" fails;
 *   - multi-root detection off → "9: a two-root color collection groups by family within each root…" fails;
 *   - ground affinity off → "9: each root's text is drawn on its own root's background" fails;
 *   - size tracks from the header row only / never hug the cell root → "2: no text in the owner's cells is wider
 *     than its column" fails;
 *   - (retired 2026-09-29 with #1749's FIXED columns: "5: every swatch column is the swatch plus its padding: 80" and
 *     "5: a long description wraps at 360px rather than clipping". Their successors are "5: a swatch column is the
 *     wider of the specimen and its mode header…" and "5: the description column is its longest line…");
 *   - a palette row shows its full path → "5: a palette table leads with the step alone…" fails;
 *   - steps sorted without named-first → "9: named values lead, in file order, then steps ascending" fails;
 *   - a role keeps its family in its name → "2: the adopted type=Text swatch is used for a text role" fails;
 *   - no header rewrite / rewrite over an edit → "9: an earlier run's title is rewritten…" / "9: a title the
 *     designer typed is kept" fail;
 *   - replaced folded into stale → "9: the per-root table is reported as replaced…" fails;
 *   - (retired 2026-09-29, nothing wraps: "5: a long description wraps to its column less the cell's padding: 360 −
 *     16 − 16 = 328")
 *   - wrap a mode header to the specimen before the columns are sized → "5: a swatch column is the wider of the
 *     specimen and its mode header…", "5: every header in every table sits on one line" fail;
 *   - skip the re-stack → "10: a table that grows by 10 rows pushes the next table down 740px" fails (720 before the
 *     2px track gap);
 *   - re-stack without reading the position record → "10: a table a designer moved stays where they put it" fails;
 *   - leave unrecorded tables out of the stack → "10: tables from before the position record are re-flowed too" fails;
 *   - drop the track read-back → "10: a grid that did not keep its hugging tracks is named" fails (its column arm);
 *     drop its row clause alone → "10: a grid that did not keep its hugging ROW tracks is named" fails;
 *   - drop the header-width miss → "10: a header the host will not size to its table is named…" fails;
 *   - the fingerprint compare ignored, so every candidate that reaches it is deleted → "11: a replaced table with one
 *     text cell changed by hand is kept, reported as edited" fails;
 *   - the edit check always true, so nothing is deleted → "6: an unedited stale table is deleted", "11: an unedited
 *     replaced table is deleted…" fail;
 *   - the generator-marker check removed → "11: a duplicate of a generator table is never deleted…" fails;
 *   - the no-fingerprint check removed → "11: a table with no fingerprint is kept", "9: the per-root table has no
 *     fingerprint, so it is left in place" fail (each table is still kept, since it has no mark either, but for the
 *     wrong reason: "copied");
 *   - text left out of the fingerprint → "11: a replaced table with one text cell changed by hand is kept…" fails
 *     (the retyped value is the same length, so no size moves with it);
 *   - the position check removed → "11: a moved table is kept" fails;
 *   - the stack starts at the topmost table left, ignoring a deleted one above it → "11: the stack closes over the
 *     deleted table…" fails;
 *   - (review round) each fingerprint group dropped — fills/strokes, size, pinned modes, corners, effects, stroke
 *     geometry, layer opacity/blend, style IDs, auto layout, text font, instance main component/properties — fails
 *     its own "11: a replaced table with … by hand is kept, reported as edited" arm; y dropped from the moved check
 *     → "11: a table moved straight down is kept…"; a bound paint keyed by color, or keeping its opacity → "11: a
 *     table whose bound variable's value (and alpha) changed between runs is still deleted"; the parent-is-page and
 *     page-ID checks → "11: a table put inside a designer's frame…" / "11: a table moved to another page…"; the
 *     collection and empty-plan guards → "11: a table whose collection is no longer in the file is kept…" / "11: a
 *     run that draws nothing deletes nothing…". Full table: docs/00-progress.md (2026-09-28).
 *
 *   - (third live run) `wrapTo` reverted to FIXED + resize → "2: the owner's description text wraps to 360 − 24 − 40 =
 *     296", "2: the owner's description row is not one word a line", "5: a long description wraps to its column less
 *     the cell's padding…" fail; visibility or name dropped from the fingerprint → "11: … a swatch layer hidden …" /
 *     "11: … a cell renamed in the layers panel …" fail. (`wrapTo` and those three arms were retired 2026-09-29 by the
 *     owner's grid model: nothing wraps.)
 *   - (#1778 and the 2026-09-29 owner decisions; docs/00-progress.md 2026-09-29) the filter ignored → "13: tables:
 *     ["Primary — nbds"] draws that one table" fails; the skipped tables treated as candidates → "13: the tables a
 *     filtered run skips are not stale…" fails; the per-row yield removed → "14: the 124-row Inverse table yields while
 *     its rows are placed…" fails; the per-table yield removed → "14: the host gets control back after every table"
 *     fails; the header left at its component width → "2: the table and its header are as wide as its grid…" and "12:
 *     the table and its header hug the grid…" fail; a FIXED column track → "5: every column and row track of every
 *     table is HUG" fails; a text cell left hugging → "5: every text cell FILLs its track, both axes" fails.
 *   - (review of f95a2cb3 and the owner decisions of 2026-09-29; docs/00-progress.md 2026-09-29) the track gap left at 0
 *     → "5: every table's grid has a 2px gap…" and "2: the table and its header are as wide as its grid, 2854px…"
 *     fail; the swatch's FIXED sizing dropped → "5: every swatch keeps its component's 48 × 48, FIXED…" fails; the
 *     filtered run's gap-closing re-stack restored → "13: a filtered run whose table keeps its height moves no
 *     table…", "13: a table a designer moved and a table with no position record are left alone…" and "13:
 *     shrinking back by 100px…" fail; the header-width miss dropped → "10: a header the host will not size…" fails;
 *     the row clause of the track read-back dropped → "10: a grid that did not keep its hugging ROW tracks…" fails; the title list uncapped → "13: an unknown
 *     name is reported by name, with the first 8 titles…" fails; the renamed-table note dropped → "13: a filtered
 *     run that draws a renamed group's new table says the old one stays…" fails; the gate's refusal removed → "15: a
 *     run asked for from the agent link while a panel run is mid-yield is refused…" fails.
 *   - (owner decision 13 as clarified 2026-09-29: the specimen by role) a ground on a palette row → "5: a palette row has
 *     no ground frame…" fails; a filled square for a text role → "5: a text.* row draws letters…" fails.
 *   - (phase 2, docs/00-progress.md 2026-09-29) the spacing bar unbound → "16: space/050 draws the filled spacing bar…",
 *     "16: a mode-varying spacing draws a bound bar per mode…"; the radius corner unbound → "16: radius/md draws the
 *     type=radius swatch…"; the font property unbound → "17: font size 16's specimen…" and the other 17 binding arms;
 *     REM at 10px → "16: its value reads px and REM at a 16px base…" and ten more; a lexical sort → "16: the space scale
 *     in ramp order…", "16: a ramp stored 16, 4, 100, 2…"; the text style not applied → "18: body/lg/default's specimen
 *     is "Abc 123" with its text style applied…"; the paragraph-spacing column always shown → "18: the text-style
 *     table…", "18: toggled off, the two columns are gone…"; (title cell) the edit not preserved → "20: a hand-edited title
 *     survives a rerun…"; the title column left in the fingerprint → "20: a superseded table whose only change is a
 *     retitled row is deleted, unedited"; the humanizer returning the raw path → "20: humanized: …" and four more.
 *
 * THE SHIM IGNORES A RESIZE THE HOST IGNORES: a FIXED text inside an instance keeps its main component's width under
 * `resize` (live, 2026-09-28). Before the shim modeled it, every width assertion passed over one-word-a-line text.
 *
 * THE SHIM DOES NOT REPAINT: a bound paint keeps the placeholder color `setBoundVariableForPaint` stamped. The
 * value-change arm replays the host's repaint (color, and alpha as the paint's opacity) onto the drawn nodes itself,
 * and asserts at least one paint moved; without that, keying bound paints by color survives every test.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ensureStyleGuideCells } from './src/style-guide-cells';
import type { CellsApi } from './src/style-guide-cells';
import { planStyleGuide, runStyleGuide, styleGuideSummary, contrastText, createStyleGuideGate, styleGuideBusy, humanizeName, varKind, sizeByPadding } from './src/style-guide';
import type { StyleGuideApi, SgCatalog, SgTable, TableOutcome, StyleGuideResult, StyleGuideRun, StyleGuideOptions, StyleGuideProgress } from './src/style-guide';
import { parseDesignMd } from '@prism3/engine/design-md';
import { brandTheme } from '@prism3/engine/theme';
import { resolveAllModes } from '@prism3/engine/modes';

let failures = 0;
const ok = (cond: boolean, label: string): void => {
  if (!cond) { failures++; console.error(`  ✗ ${label}`); }
  else console.log(`  ✓ ${label}`);
};

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../../packages/engine/out/figma/prism3');
const readJson = (f: string) => JSON.parse(readFileSync(join(OUT, f), 'utf8')) as {
  $collection: string; $mode: string;
  variables: { name: string; resolvedType: string; description: string; value: { r: number; g: number; b: number; a: number }; alias: { name: string } | null }[];
};

// ── The shim ─────────────────────────────────────────────────────────────────────────────────────────
let nextId = 1;
/** Phase 2: when set, every `setBoundVariable` throws, as the host does for a binding it refuses. */
let refuseBinding = false;
/** When set, `resize` throws on a node it matches, as a host that refuses to resize a layer inside an instance would
 *  (the review of `4faeb98a`: the spacing bar's resize had no guard, so one refusal aborted the whole run). */
let refuseResize: ((n: N) => boolean) | null = null;
/** When set, `resize` does nothing on a node it matches and says nothing: the silent answer, as the live run's
 *  brackets looked (every one 8px, "unbound: 0"). */
let ignoreResize: ((n: N) => boolean) | null = null;
/** When set, a padding bind on a node it matches is accepted and changes nothing: a width that does not follow. */
let ignorePadding: ((n: N) => boolean) | null = null;
/** When set, a layer inside an instance refuses a new `constraints` (and, with `refuseMove`, a new `x`): the two host
 *  answers this build cannot rule out offline for the owner's bracket, whose parts are all constrained MIN. */
let refuseConstraints = false;
let refuseMove = false;
const insideInstance = (n: N): boolean => { for (let p = n.parent; p; p = p.parent) if (p.type === 'INSTANCE') return true; return false; };

/**
 * THE HOST'S FONT RULE, modeled (review of `4faeb98a`: font loading was untested). A text's font-bound property, or
 * `setTextStyleIdAsync`, throws unless the text's font is loaded, and binding a family or weight also needs the font
 * it resolves to: the bound family in the text's style, or the text's family at the weight's style. The variable is
 * resolved in the node's mode AT THE MOMENT IT IS BOUND (the mode pinned on it or an ancestor, else the collection's
 * default), which is what makes the order of pin and bind matter. Each shim keeps its own loaded fonts; a run
 * starts with `loadAllPagesAsync`, which makes its shim the one whose fonts, variables and styles a bind reads.
 * Its own weight table, not the plugin's (docs/34): the style a host picks for a weight.
 */
interface World { fonts: Set<string>; loads: string[]; cols: ShimCol[]; vars: ShimVar[]; styles: ShimStyle[] }
let active: World | null = null;
const SHIM_WEIGHT_STYLE: Record<number, string> = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };
const FONT_BOUND = new Set(['fontFamily', 'fontStyle', 'fontWeight', 'fontSize', 'letterSpacing', 'lineHeight', 'paragraphSpacing', 'paragraphIndent']);
const fontId = (f: unknown): string => { const x = f as { family?: unknown; style?: unknown } | undefined; return `${String(x?.family)} ${String(x?.style)}`; };
/** A variable's value in the mode `node` sits in now, following aliases. */
const valueAt = (w: World, node: N, v: ShimVar): unknown => {
  let cur: ShimVar | undefined = v;
  for (let hop = 0; cur && hop < 16; hop++) {
    const col = w.cols.find((c) => c.id === cur!.variableCollectionId);
    let mode: string | undefined;
    for (let n: N | null = node; n && !mode; n = n.parent) mode = n.explicitVariableModes[cur.variableCollectionId];
    const raw = cur.valuesByMode[mode ?? col?.defaultModeId ?? ''] as { type?: string; id?: string } | undefined;
    if (raw?.type !== 'VARIABLE_ALIAS') return raw;
    cur = w.vars.find((x) => x.id === raw.id);
  }
  return undefined;
};
/** The shim's text metric: every character 7px wide, lines split at "\n". Its own figure, not the plugin's. */
const CHAR_W = 7;
const isAuto = (n: N | null | undefined): boolean => n?.layoutMode === 'HORIZONTAL' || n?.layoutMode === 'VERTICAL';
/** A padding as the host lays it out: a BOUND padding is its variable's value in the node's mode, read live, so a
 *  frame sized by a bound paddingLeft follows its variable (the owner's live run of 0.205.0). */
const padOf = (n: N, side: 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'paddingBottom'): number => {
  const b = n.boundVariables?.[side];
  const v = b && active ? active.vars.find((x) => x.id === b.id) : undefined;
  return v ? Number(valueAt(active!, n, v)) : Number(n[side] ?? 0);
};
const padX = (n: N): number => padOf(n, 'paddingLeft') + padOf(n, 'paddingRight');
/** A text node's width set on one line. */
const naturalOf = (t: N): number => Math.max(0, ...String(t.characters ?? '').split('\n').map((l) => l.length)) * CHAR_W;
/** The lines a text sets in: one per "\n" while it hugs; a HEIGHT text breaks at spaces to its box, and a word
 *  wider than the box breaks inside it, as the host does ("Default" in 30px is two lines). 20px a line. */
const linesOf = (t: N): number => String(t.characters ?? '').split('\n').reduce((n, para) => {
  if (t.textAutoResize !== 'HEIGHT') return n + 1;
  // The box is the width the text lays out at: its stored width, or its parent's less padding when it FILLs.
  const box = Math.max(CHAR_W, t.width);
  let lines = 1, run = -CHAR_W;
  for (const word of para.split(' ')) {
    const w = word.length * CHAR_W;
    if (run >= 0 && run + CHAR_W + w > box) { lines++; run = w; } else run += CHAR_W + w;
    if (w > box) { lines += Math.ceil(w / box) - 1; run = w % box || box; }
  }
  return n + lines;
}, 0);
const LINE_H = 20;
const padY = (n: N): number => padOf(n, 'paddingTop') + padOf(n, 'paddingBottom');
/** Out of an auto-layout frame's flow: an ABSOLUTE child takes no part in what the frame hugs. */
const inFlow = (k: N): boolean => k.layoutPositioning !== 'ABSOLUTE';
/** THE LAYOUT EPOCH: bumped by every write to every node (each `N` is a proxy that counts its writes), so a grid's
 *  tracks are computed once per state of the file rather than once per read. A 124-row table's fingerprint reads
 *  1,750 cell widths, each a column of 125 cells: uncached, the suite ran ~8× slower. The proxy cannot see a write
 *  inside a nested object; the only layout-bearing ones are a node's `children` (bumped by hand in `appendChild`)
 *  and a grid track's `type` written in place, which the plugin does only where assigning the whole array throws,
 *  and the shim's assignment never throws. */
let epoch = 0;
/** A REMOVED NODE IS INVALID (#1795, the host's behavior #1791 and #1794 met): after `remove()`, reading any property
 *  but `id` and `removed` throws, as Figma's "in get_name: … does not exist" does, and so does a second `remove()`.
 *  Mirrored here, not imported from #1794's removal shim, which is not on this branch. */
const REMOVED_READABLE = new Set<PropertyKey>(['id', 'removed', '_removed', 'constructor']);
const BUMP: ProxyHandler<object> = {
  get: (t, k, r) => {
    if ((t as { _removed?: boolean })._removed && !REMOVED_READABLE.has(k) && typeof k === 'string') throw new Error(`in get_${k}: The node (${(t as { id?: string }).id}) does not exist`);
    return Reflect.get(t, k, r);
  },
  set: (t, k, v, r) => { epoch++; return Reflect.set(t, k, v, r); },
  defineProperty: (t, k, d) => { epoch++; return Reflect.defineProperty(t, k, d); },
  deleteProperty: (t, k) => { epoch++; return Reflect.deleteProperty(t, k); },
};
class N {
  id = `node:${nextId++}`;
  name = '';
  children: N[] = [];
  parent: N | null = null;
  /** The stored width — what `resize` sets. `width` reads it unless the node's sizing computes one. */
  w = 0;
  /** `layoutSizingHorizontal`, behind a setter that refuses what the host refuses. */
  lsh?: string;
  /** The stored height — what `resize` sets. `height` reads it unless the node's layout computes one. */
  h = 0;
  private _x = 0;
  // An ABSOLUTE child constrained MAX keeps its distance to its parent's right edge however the parent's width is
  // reached (a hug from a bound padding included); `_anchor` is where it sat, and how wide its parent was, when its
  // constraints were set in the component.
  get x(): number {
    const a = this._anchor as { pw: number; x: number; w: number } | undefined;
    if (a && this.parent && this.layoutPositioning === 'ABSOLUTE' && this._constraints?.horizontal === 'MAX') return this.parent.width - (a.pw - a.x);
    return this._x;
  }
  set x(v: number) { if (refuseMove && insideInstance(this)) throw new Error('cannot move a layer inside an instance'); this._x = v; }
  y = 0;
  private _constraints?: { horizontal: string; vertical: string };
  get constraints(): { horizontal: string; vertical: string } | undefined { return this._constraints; }
  set constraints(v: { horizontal: string; vertical: string } | undefined) {
    if (refuseConstraints && insideInstance(this)) throw new Error('cannot override constraints inside an instance');
    this._constraints = v ? { ...v } : v;
    if (v && this.parent && this.layoutPositioning === 'ABSOLUTE') this._anchor = { pw: this.parent.width, x: this._x, w: this.w };
  }
  fills: unknown = [];
  strokes: unknown = [];
  characters?: string;
  fontName?: unknown;
  /** A mixed-font text node's segments, as `getStyledTextSegments(['fontName'])` returns them. */
  segments?: { fontName: unknown }[];
  visible = true;
  mainComponent: N | null = null;
  componentProperties?: Record<string, { type: string; value: unknown }>;
  explicitVariableModes: Record<string, string> = {};
  pluginData: Record<string, string> = {};
  gridRow?: number;
  gridCol?: number;
  gridColumnSizes: { type: string; value?: number }[] = [];
  gridRowSizes: { type: string; value?: number }[] = [];
  private _cols = 0;
  private _rows = 0;
  [k: string]: unknown;
  constructor(public type: string) {
    return new Proxy(this, BUMP) as N;
  }
  // THE LAYOUT MODEL. A WIDTH_AND_HEIGHT text is its words' width; a FILL child in a grid is its column's track, in
  // an auto-layout frame the frame's width less its padding; a hugging auto-layout frame is its padding plus its
  // in-flow children (summed across a row, the widest down a column); a hugging grid is its tracks; anything else
  // is its stored width.
  get width(): number {
    const a = this._anchor as { pw: number; x: number; w: number } | undefined;
    if (a && this.parent && this.layoutPositioning === 'ABSOLUTE' && this._constraints?.horizontal === 'STRETCH') return a.w + this.parent.width - a.pw;
    if (this.type === 'TEXT' && this.textAutoResize === 'WIDTH_AND_HEIGHT') return naturalOf(this);
    const p = this.parent;
    if (this.lsh === 'FILL' && p) {
      if (p.layoutMode === 'GRID' && this.gridCol !== undefined) return Math.max(trackW(p, this.gridCol), Number(this.minWidth ?? 0));
      if (isAuto(p)) return p.width - padX(p);
    }
    if (this.layoutMode === 'GRID' && this.lsh === 'HUG') return hugGridW(this);
    if (this.hugsW() && isAuto(this)) return this.emptyRow() ? Math.max(Number(this._floor ?? 0), Number(this._held ?? this.w), padX(this)) : contentW(this);
    return this.w;
  }
  private hugsW(): boolean {
    return this.lsh === 'HUG' || (this.lsh === undefined && ((this.layoutMode === 'HORIZONTAL' && this.primaryAxisSizingMode === 'AUTO') || (this.layoutMode === 'VERTICAL' && this.counterAxisSizingMode === 'AUTO')));
  }
  /**
   * A HUGGING ROW WITH NOTHING IN FLOW, the spacing specimen's frame, as measured live on the owner's cells (live QA of
   * 0.210.0, 2026-09-30). Its width is the widest of three things:
   *   • `_floor`, the main component's own width when the instance was made: a layer inside an instance never hugs
   *     narrower than its main (an 8px rest width left every value of 8 or less at 8);
   *   • `_held`, the width it holds: a padding that decreases, or a padding of 0, leaves it where it was, and only
   *     setting HUG from another sizing sets it again (to its padding, or, with no padding, to its last width);
   *   • its padding, which it grows to as soon as that is wider.
   */
  private emptyRow(): boolean { return this.layoutMode === 'HORIZONTAL' && !this.children.some(inFlow); }
  set width(v: number) { this.w = v; }
  // Heights: a text is its lines; a FILL child in a grid is its row's track; a hugging grid is its row tracks; an
  // auto-layout frame that hugs vertically is its padding plus its children (summed down a column, the tallest
  // across a row).
  get height(): number {
    if (this.type === 'TEXT') return linesOf(this) * LINE_H;
    const lsv = this.layoutSizingVertical as string | undefined;
    const p = this.parent;
    if (lsv === 'FILL' && p?.layoutMode === 'GRID' && this.gridRow !== undefined) return Math.max(trackH(p, this.gridRow), Number(this.minHeight ?? 0));
    if (this.layoutMode === 'GRID') return lsv === 'FIXED' ? this.h : hugGridH(this);
    const hug = lsv === 'HUG' || (lsv === undefined && ((this.layoutMode === 'VERTICAL' && this.primaryAxisSizingMode === 'AUTO') || (this.layoutMode === 'HORIZONTAL' && this.counterAxisSizingMode === 'AUTO')));
    if (hug && isAuto(this)) return contentH(this);
    return this.h;
  }
  set height(v: number) { this.h = v; }
  get layoutSizingHorizontal(): string | undefined { return this.lsh; }
  set layoutSizingHorizontal(v: string | undefined) {
    if (v === 'HUG' && this.type !== 'TEXT' && !isAuto(this) && this.layoutMode !== 'GRID') throw new Error('HUG needs an auto-layout frame');
    if (v === 'FILL' && !(isAuto(this.parent) || this.parent?.layoutMode === 'GRID')) throw new Error('FILL needs an auto-layout or grid parent');
    if (this.type === 'TEXT' && v === 'HUG') this.textAutoResize = 'WIDTH_AND_HEIGHT';
    // FIXED keeps the width it has now, as the host does.
    if (v === 'FIXED' && this.type !== 'TEXT' && this.lsh !== 'FIXED') this.w = this.width;
    // HUG SET FROM ANOTHER SIZING re-reads an empty row: its padding, or with none, its last width. Set again while it
    // already hugs, it changes nothing (the live QA of 0.210.0: rebound from 24 to 2, HUG again stayed 24).
    if (v === 'HUG' && isAuto(this) && this.emptyRow() && !this.hugsW()) { const cur = this.width, p = padX(this); this._held = p > 0 ? p : cur; }
    this.lsh = v;
  }
  get gridColumnCount(): number { return this._cols; }
  set gridColumnCount(n: number) { this._cols = n; this.gridColumnSizes = Array.from({ length: n }, () => ({ type: 'FLEX' })); }
  get gridRowCount(): number { return this._rows; }
  set gridRowCount(n: number) { this._rows = n; this.gridRowSizes = Array.from({ length: n }, () => ({ type: 'FLEX' })); }
  /** A grid's cells by column and by row — the shim's own index, so a track reads its cells without a scan of the
   *  whole grid (a 124-row table holds 1,750). Kept by `appendChildAt` and `detach`, the only ways a cell moves. */
  byCol = new Map<number, Set<N>>();
  byRow = new Map<number, Set<N>>();
  private detach(): void {
    const p = this.parent;
    if (!p) return;
    p.children = p.children.filter((x) => x !== this);
    if (this.gridCol !== undefined) p.byCol.get(this.gridCol)?.delete(this);
    if (this.gridRow !== undefined) p.byRow.get(this.gridRow)?.delete(this);
    this.parent = null;
  }
  appendChild(c: N): void {
    c.detach();
    c.parent = this;
    this.children.push(c);
    epoch++;
  }
  appendChildAt(c: N, r: number, col: number): void {
    if (this.layoutMode !== 'GRID') throw new Error('appendChildAt on a non-grid');
    if (r >= this._rows || col >= this._cols) throw new Error(`grid cell ${r},${col} out of bounds`);
    if ([...(this.byRow.get(r) ?? [])].some((k) => k.gridCol === col)) throw new Error(`grid cell ${r},${col} occupied`);
    this.appendChild(c);
    c.gridRow = r; c.gridCol = col;
    if (!this.byCol.has(col)) this.byCol.set(col, new Set());
    if (!this.byRow.has(r)) this.byRow.set(r, new Set());
    this.byCol.get(col)!.add(c);
    this.byRow.get(r)!.add(c);
  }
  _removed = false;
  get removed(): boolean { return this._removed; }
  remove(): void { this.detach(); this._removed = true; }
  // THE HOST'S QUIRK (live, 2026-09-28, and measured in the plugin runtime 2026-09-29 on the owner's run of 0.205.0):
  // a width written to ANY layer inside an INSTANCE is silently dropped, no throw: the owner's 29px label stayed 29px
  // under resize(296, h), and every spacing specimen stayed 8px. Its height still moves. A frame that hugs or fills is
  // FIXED once resized, on both axes, as a designer's drag leaves it.
  resize(w: number, h: number): void {
    if (refuseResize?.(this)) throw new Error(`cannot resize ${this.name}`);
    if (ignoreResize?.(this)) return;
    let inInstance = false;
    for (let p = this.parent; p; p = p.parent) if (p.type === 'INSTANCE') { inInstance = true; break; }
    // CONSTRAINTS: a frame without auto layout carries its children by theirs when resized — MAX keeps the distance
    // to the right edge, STRETCH keeps both, CENTER splits the change; MIN (and none) stays put.
    if (this.type !== 'TEXT' && !isAuto(this) && this.layoutMode !== 'GRID') {
      const dx = w - this.w;
      for (const k of this.children) {
        const hz = k.constraints?.horizontal;
        if (hz === 'MAX') k._x += dx;
        else if (hz === 'CENTER') k._x += dx / 2;
        else if (hz === 'STRETCH') k.w += dx;
      }
    }
    if (!inInstance) this.w = w;
    this.h = h;
    if (this.type !== 'TEXT') {
      if (this.lsh === 'HUG' || this.lsh === 'FILL') this.lsh = 'FIXED';
      if (this.layoutSizingVertical === 'HUG' || this.layoutSizingVertical === 'FILL') this.layoutSizingVertical = 'FIXED';
    }
  }
  findAll(pred: (n: N) => boolean): N[] {
    const out: N[] = [];
    const walk = (n: N) => { for (const c of n.children) { if (pred(c)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  findOne(pred: (n: N) => boolean): N | null { return this.findAll(pred)[0] ?? null; }
  findAllWithCriteria(c: { types: string[] }): N[] { return this.findAll((n) => c.types.includes(n.type)); }
  getStyledTextSegments(): { fontName: unknown }[] { return this.segments ?? [{ fontName: this.fontName }]; }
  setPluginData(k: string, v: string): void { this.pluginData[k] = v; }
  getPluginData(k: string): string { return this.pluginData[k] ?? ''; }
  setExplicitVariableModeForCollection(collection: unknown, modeId: string): void {
    // Under dynamic-page the collection OBJECT is required — an id string throws in the host.
    if (!collection || typeof collection !== 'object' || typeof (collection as { id?: unknown }).id !== 'string') throw new Error('collection object required');
    this.explicitVariableModes[(collection as { id: string }).id] = modeId;
  }
  /** Phase 2: a node property bound to a variable, recorded as the host's `boundVariables` reads it. A shim-wide switch
   *  makes the host refuse, as it does for a text field whose font is not loaded. */
  boundVariables: Record<string, { type: string; id: string }> = {};
  setBoundVariable(field: string, v: { id: string } | null): void {
    if (refuseBinding) throw new Error(`cannot bind ${field}`);
    const w = active;
    if (w && v && this.type === 'TEXT' && FONT_BOUND.has(field)) {
      if (!w.fonts.has(fontId(this.fontName))) throw new Error(`unloaded font ${fontId(this.fontName)}`);
      const cur = this.fontName as { family: string; style: string };
      const value = valueAt(w, this, v as ShimVar);
      const next = field === 'fontFamily' ? { family: String(value), style: cur.style }
        : field === 'fontWeight' ? { family: cur.family, style: SHIM_WEIGHT_STYLE[Math.round(Number(value) / 100) * 100] ?? 'Regular' } : null;
      if (next && !w.fonts.has(fontId(next))) throw new Error(`unloaded font ${fontId(next)}`);
      if (next) this.fontName = next;
    }
    // A bound WIDTH on a layer inside an instance is dropped too, silently, as a written one is.
    if (v && field === 'width' && insideInstance(this)) return;
    if (v && /^padding/.test(field) && ignorePadding?.(this)) return;
    const firstPad = /^padding/.test(field) && !Object.keys(this.boundVariables).some((k) => /^padding/.test(k));
    // An empty row holds the width it has now: a padding bound smaller does not shrink it (live QA of 0.210.0).
    if (v && /^padding/.test(field) && isAuto(this) && this.emptyRow() && this.hugsW()) this._held = this.width;
    if (v) this.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id };
    // THE FREEZE (measured live, 2026-09-29): after its first padding bind a hugging frame can freeze at FIXED at the
    // width that bind gave it, and then no longer follows its variable until HUG is set again.
    if (v && firstPad && this.lsh === 'HUG' && isAuto(this)) { const w0 = this.width; this.lsh = 'FIXED'; this.w = w0; }
  }
  textStyleId = '';
  async setTextStyleIdAsync(id: string): Promise<void> {
    const st = active?.styles.find((x) => x.id === id);
    if (active && st && !active.fonts.has(fontId(st.fontName))) throw new Error(`unloaded font ${fontId(st.fontName)}`);
    this.textStyleId = id;
    if (st) this.fontName = { ...st.fontName };
  }
  setProperties(p: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(p)) if (this.componentProperties?.[k]) this.componentProperties[k].value = v;
  }
  createInstance(): N {
    const clone = (n: N): N => {
      const c = new N(n === this ? 'INSTANCE' : n.type);
      for (const k of ['name', 'w', 'lsh', 'h', 'layoutSizingVertical', 'x', 'y', 'fills', 'strokes', 'characters', 'fontName', 'segments', 'visible', 'layoutMode',
        'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'textAutoResize', 'textTruncation',
        'layoutPositioning', 'constraints', '_anchor', 'clipsContent', 'cornerRadius', 'topLeftRadius']) (c as Record<string, unknown>)[k] = (n as Record<string, unknown>)[k];
      // An instance's layer never hugs narrower than its main's width (live QA of 0.210.0).
      if (n !== this) c._floor = n.width;
      for (const k of n.children) c.appendChild(clone(k));
      return c;
    };
    const inst = clone(this);
    inst.mainComponent = this;
    if (this.parent?.componentProperties) inst.componentProperties = JSON.parse(JSON.stringify(this.parent.componentProperties));
    return inst;
  }
}

// ── The shim's grid model (the owner's, measured live on "↳ Style Guide Examples", 2026-09-29) ─────────────────
// A HUG track is as wide as its widest cell's CONTENT: a FILL cell counts what it would hug, any other its own width.
// A FILL cell then takes the whole track. A hugging grid is its tracks and gaps. A grid a designer dragged wider
// (FIXED) leaves its HUG tracks at their content: the typings define HUG as CSS `fit-content(100%)`, which does not
// grow past its content. Whether the host shares the extra out at all is a live-check (docs/45 §7), so section 12
// asserts only what holds either way: a FILL cell is as wide as its track.
/** A node's width as it hugs its content, whatever its own sizing says. */
const contentW = (n: N): number => {
  if (n.type === 'TEXT') return n.textAutoResize === 'WIDTH_AND_HEIGHT' ? naturalOf(n) : n.w;
  if (n.layoutMode === 'GRID') return hugGridW(n);
  // A FILL child without auto layout has no content to hug: it offers a HUG track its floor, `minWidth`, and nothing
  // more (the host's answer is a live-check, docs/45 §7). So a palette swatch that FILLs its cell without a floor
  // collapses its column to its header's text.
  if (!isAuto(n)) return n.lsh === 'FILL' ? Number(n.minWidth ?? 0) : n.w;
  const ws = n.children.filter((k) => k.visible !== false && k.lsh !== 'FILL' && inFlow(k)).map((k) => k.width);
  const inner = n.layoutMode === 'HORIZONTAL' ? ws.reduce((a, b) => a + b, 0) + Number(n.itemSpacing ?? 0) * Math.max(0, ws.length - 1) : Math.max(0, ...ws);
  return padX(n) + inner;
};
const contentH = (n: N): number => {
  if (n.type === 'TEXT') return linesOf(n) * LINE_H;
  if (n.layoutMode === 'GRID') return hugGridH(n);
  if (!isAuto(n)) return n.layoutSizingVertical === 'FILL' ? Number(n.minHeight ?? 0) : n.h;
  const hs = n.children.filter((k) => k.visible !== false && inFlow(k)).map((k) => k.height);
  return padY(n) + (n.layoutMode === 'VERTICAL' ? hs.reduce((a, b) => a + b, 0) + Number(n.itemSpacing ?? 0) * Math.max(0, hs.length - 1) : Math.max(0, ...hs));
};
/** A track's size: FIXED is its value, HUG (or FLEX) its widest cell. */
const baseTrack = (g: N, axis: 'col' | 'row', i: number): number => {
  const s = (axis === 'col' ? g.gridColumnSizes : g.gridRowSizes)[i];
  if (s?.type === 'FIXED') return Number(s.value);
  const cells = [...((axis === 'col' ? g.byCol : g.byRow).get(i) ?? [])].filter((k) => k.visible !== false);
  return Math.max(0, ...cells.map((k) => (axis === 'col' ? (k.lsh === 'FILL' ? contentW(k) : k.width) : (k.layoutSizingVertical === 'FILL' ? contentH(k) : k.height))));
};
const tracks = (g: N, axis: 'col' | 'row'): number[] => {
  const sizes = axis === 'col' ? g.gridColumnSizes : g.gridRowSizes;
  return sizes.map((_, i) => baseTrack(g, axis, i));
};
/** A grid's tracks for the current epoch: computed on the first read after any write, then reused. */
const trackMemo = new WeakMap<N, { e: number; col?: number[]; row?: number[] }>();
const axisOf = (g: N, a: 'col' | 'row'): number[] => {
  let m = trackMemo.get(g);
  if (!m || m.e !== epoch) { m = { e: epoch }; trackMemo.set(g, m); }
  return (m[a] ??= tracks(g, a));
};
const trackW = (g: N, c: number): number => axisOf(g, 'col')[c] ?? 0;
const trackH = (g: N, r: number): number => axisOf(g, 'row')[r] ?? 0;
const hugGridW = (g: N): number => axisOf(g, 'col').reduce((a, b) => a + b, 0) + Number(g.gridColumnGap ?? 0) * Math.max(0, g.gridColumnSizes.length - 1);
const hugGridH = (g: N): number => axisOf(g, 'row').reduce((a, b) => a + b, 0) + Number(g.gridRowGap ?? 0) * Math.max(0, g.gridRowSizes.length - 1);

const page = (name: string): N => { const p = new N('PAGE'); p.name = name; return p; };

/** A text-cell or swatch set the way the owner's file has one — its own case, its own page. */
const ownerSet = (name: string, variants: string[], withSpecimen: boolean): N => {
  const set = new N('COMPONENT_SET');
  set.name = name;
  for (const v of variants) {
    const m = new N('COMPONENT');
    m.name = v;
    // The owner's node names, not ours: a text swatch holds a TEXT node named "Aa", a fill swatch a "Rectangle 12",
    // and `type=default` has NO layers — its fill sits on the component itself (live, 2026-09-28).
    if (withSpecimen) m.resize(48, 48);
    if (withSpecimen && /text/i.test(v)) { const t = new N('TEXT'); t.name = 'Aa'; t.characters = 'Aa'; t.fills = [{ type: 'SOLID' }]; m.appendChild(t); }
    else if (withSpecimen && /default/i.test(v)) m.fills = [{ type: 'SOLID' }];
    else if (withSpecimen) { const s = new N('FRAME'); s.name = 'Rectangle 12'; s.fills = [{ type: 'SOLID' }]; m.appendChild(s); }
    else {
      // A text cell a fixed 120px wide, its label filling it and clipping what does not fit — the owner's cells, with
      // their padding (24 left, 40 right) and their label, a 29px text named "100", as measured live.
      m.layoutMode = 'HORIZONTAL'; m.primaryAxisSizingMode = 'FIXED'; m.paddingLeft = 24; m.paddingRight = 40; m.lsh = 'FIXED'; m.resize(120, 44);
      const t = new N('TEXT'); t.name = '100'; t.characters = 'Abc 123'; t.fontName = { family: 'Inter', style: 'Regular' }; t.w = 29;
      t.textAutoResize = 'TRUNCATE'; t.textTruncation = 'ENDING'; m.appendChild(t); t.lsh = 'FILL';
    }
    set.appendChild(m);
  }
  return set;
};

/**
 * THE OWNER'S SPACING CELLS, copied from their test file as measured live (2026-09-29, the live run of `4faeb98a`,
 * where every one of 41 "Dimension — nbds" rows drew the same 8px bracket and the run read "unbound: 0"). Each member
 * is a 72 × 83 HORIZONTAL auto-layout that hugs; its one child is a frame without auto layout, constrained MIN/MIN:
 * `spacing-filled-example` (8 × 20, clipped, one fill), and `spacing-line-example` (8 × 16) holding three rectangles,
 * `left-bar` (1 × 16 at 0,0), `horizontal-line` (8 × 1 at 0,8) and `right-bar` (1 × 16 at 7,0), every one MIN/MIN.
 * `kind: 'odd'` is a set this build cannot read: each member holds a text label and nothing else.
 */
const ownerSpacingSet = (kind: 'owner' | 'odd' | 'renamed' | 'inflow' | 'restructured' | 'rest8' = 'owner'): N => {
  const set = new N('COMPONENT_SET');
  set.name = '_style-guide-spacing-cells';
  for (const display of ['filled', 'line']) {
    const m = new N('COMPONENT');
    m.name = `display=${display}`;
    m.layoutMode = 'HORIZONTAL'; m.primaryAxisSizingMode = 'AUTO'; m.counterAxisSizingMode = 'AUTO';
    m.paddingLeft = 32; m.paddingRight = 32; m.paddingTop = display === 'filled' ? 31.5 : 33.5; m.paddingBottom = m.paddingTop;
    const mm = { horizontal: 'MIN', vertical: 'MIN' };
    if (kind === 'restructured' || kind === 'rest8') {
      // THE OWNER'S CELLS AS RESTRUCTURED (2026-09-29, with the owner's OK, verified live): each example frame a
      // HORIZONTAL auto layout that hugs (primary AUTO), counter FIXED (20 filled, 16 line), the paddings and
      // itemSpacing 0; the line's bars ABSOLUTE: left-bar 0,0 1×16 MIN, horizontal-line 0,7.5 8×1 STRETCH, right-bar
      // 7,0 1×16 MAX, all vertical MIN, set on an 8px frame. Then (live QA of 0.210.0, 2026-09-30) the owner set
      // paddingLeft 0 and resized the frame to 0.01 before HUG, so it rests at 0.01. `rest8` is the tree before that:
      // paddingLeft 8, resting 8 wide. Typed here from the orchestrator's measurement.
      const f = new N('FRAME'); f.name = `spacing-${display}-example`; f.w = 8; f.h = display === 'filled' ? 20 : 16;
      f.layoutMode = 'HORIZONTAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'FIXED';
      f.paddingLeft = kind === 'rest8' ? 8 : 0; f.paddingRight = 0; f.paddingTop = 0; f.paddingBottom = 0; f.itemSpacing = 0;
      f.fills = display === 'filled' ? [{ type: 'SOLID' }] : [];
      m.appendChild(f);
      if (display === 'line') for (const [name, w, h, x, y, hz] of [['left-bar', 1, 16, 0, 0, 'MIN'], ['horizontal-line', 8, 1, 0, 7.5, 'STRETCH'], ['right-bar', 1, 16, 7, 0, 'MAX']] as const) {
        const r = new N('RECTANGLE'); r.name = name; r.w = w; r.h = h; r.fills = [{ type: 'SOLID' }];
        f.appendChild(r);
        r.layoutPositioning = 'ABSOLUTE'; r.x = x; r.y = y; r.constraints = { horizontal: hz, vertical: 'MIN' };
      }
      if (kind === 'restructured') f.w = 0.01;
    } else if (kind === 'odd') {
      const t = new N('TEXT'); t.name = 'label'; t.characters = display; t.fontName = { family: 'Inter', style: 'Regular' }; m.appendChild(t);
    } else if (display === 'filled') {
      const f = new N('FRAME'); f.name = 'spacing-filled-example'; f.w = 8; f.h = 20; f.clipsContent = true; f.fills = [{ type: 'SOLID' }]; f.constraints = mm; m.appendChild(f);
    } else {
      const f = new N('FRAME'); f.name = 'spacing-line-example'; f.w = 8; f.h = 16; f.clipsContent = false; f.fills = []; f.constraints = mm;
      // `inflow`: a hugging auto-layout frame sized by its left padding, as the fix asks, but with its bars IN FLOW, so
      // they add their widths to the padding's and the bracket is never the value's width.
      if (kind === 'inflow') { f.layoutMode = 'HORIZONTAL'; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'FIXED'; f.paddingLeft = 8; f.paddingRight = 0; }
      // `renamed`: the same bracket with its parts named otherwise, which the finder must not pass silently.
      const names = kind === 'renamed' ? ['cap-start', 'rule', 'cap-end'] : ['left-bar', 'horizontal-line', 'right-bar'];
      for (const [i, [w, h, x, y]] of ([[1, 16, 0, 0], [8, 1, 0, 8], [1, 16, 7, 0]] as const).entries()) {
        const name = names[i];
        const r = new N('RECTANGLE'); r.name = name; r.w = w; r.h = h; r.x = x; r.y = y; r.fills = [{ type: 'SOLID' }]; r.constraints = mm; f.appendChild(r);
      }
      m.appendChild(f);
    }
    set.appendChild(m);
  }
  return set;
};
/** The owner's `type=radius` swatch, as measured live: an 83 × 83 VERTICAL member holding a 48 × 48 clipping
 *  `radius-example-container` at 18,18, and inside it `radius-example`, 256 × 96 at an 8px radius with one fill, so
 *  only its top-left corner shows through the clip. */
const ownerRadiusMember = (): N => {
  const m = new N('COMPONENT');
  m.name = 'type=radius';
  m.layoutMode = 'VERTICAL'; m.primaryAxisSizingMode = 'FIXED'; m.counterAxisSizingMode = 'FIXED'; m.lsh = 'FIXED'; m.w = 83; m.h = 83;
  const box = new N('FRAME'); box.name = 'radius-example-container'; box.w = 48; box.h = 48; box.x = 18; box.y = 18; box.clipsContent = true; box.constraints = { horizontal: 'MIN', vertical: 'MIN' };
  const ex = new N('FRAME'); ex.name = 'radius-example'; ex.w = 256; ex.h = 96; ex.cornerRadius = 8; ex.fills = [{ type: 'SOLID' }];
  box.appendChild(ex);
  m.appendChild(box);
  return m;
};

/** The `_Section-header` set the page header reads: a Size=Medium member with Title/Description text. */
const headerSet = (name = '_Section-header'): N => {
  const set = new N('COMPONENT_SET');
  set.name = name;
  set.componentProperties = { 'Description#1:0': { type: 'BOOLEAN', value: true } };
  for (const size of ['XL', 'Medium']) {
    const m = new N('COMPONENT');
    m.name = `Size=${size}`;
    // The owner's header component is page-wide: 2,517px, FIXED (live, 2026-09-29).
    m.lsh = 'FIXED'; m.w = 2517;
    const box = new N('FRAME'); box.name = 'Text';
    for (const [tn, tx] of [['Title', 'Section header'], ['Description', 'Descriptive Text']]) {
      const t = new N('TEXT'); t.name = tn; t.characters = tx; t.fontName = { family: 'Inter', style: tn === 'Title' ? 'Bold' : 'Regular' }; box.appendChild(t);
    }
    m.appendChild(box);
    set.appendChild(m);
  }
  return set;
};

interface Shim { api: StyleGuideApi & CellsApi; pages: N[]; vars: ShimVar[]; cols: ShimCol[]; fontFails: Set<string>; styles: ShimStyle[]; world: World }
interface ShimCol { id: string; name: string; modes: { modeId: string; name: string }[]; defaultModeId: string }
interface ShimVar { id: string; name: string; variableCollectionId: string; resolvedType: string; description: string; valuesByMode: Record<string, unknown>; scopes?: string[] }
/** A local text style as `getLocalTextStylesAsync` returns one (phase 2). */
interface ShimStyle {
  id: string; name: string; description: string; fontName: { family: string; style: string }; fontSize: number;
  lineHeight: { unit: string; value?: number }; letterSpacing: { unit: string; value: number }; paragraphSpacing: number; textDecoration: string;
  boundVariables: Record<string, { type: string; id: string }>;
}

const makeShim = (pages: N[], cols: ShimCol[], vars: ShimVar[], styles: ShimStyle[] = []): Shim => {
  const fontFails = new Set<string>();
  const world: World = { fonts: new Set(), loads: [], cols, vars, styles };
  const root = {
    get children() { return pages; },
    findAllWithCriteria: (c: { types: string[] }) => pages.flatMap((p) => p.findAllWithCriteria(c)),
  };
  const api = {
    root,
    loadAllPagesAsync: async () => { active = world; },
    loadFontAsync: async (f: { family: string; style: string }) => {
      if (fontFails.has(`${f.family} ${f.style}`)) throw new Error('no font');
      world.fonts.add(fontId(f));
      world.loads.push(fontId(f));
    },
    createFrame: () => new N('FRAME'),
    getLocalTextStylesAsync: async () => styles,
    createComponent: () => new N('COMPONENT'),
    // The host's default for a new text node: it sizes to its words.
    createText: () => { const t = new N('TEXT'); t.textAutoResize = 'WIDTH_AND_HEIGHT'; return t; },
    combineAsVariants: (nodes: N[], parent: N) => {
      const set = new N('COMPONENT_SET');
      for (const n of nodes) set.appendChild(n);
      parent.appendChild(set);
      set.w = 400; set.height = 400;
      (set as unknown as { addComponentProperty: () => string }).addComponentProperty = () => 'Description#9:0';
      return set;
    },
    variables: {
      getLocalVariableCollectionsAsync: async () => cols,
      getLocalVariablesAsync: async (t?: string) => vars.filter((v) => !t || v.resolvedType === t),
      setBoundVariableForPaint: (paint: object, field: string, v: { id: string }) => ({ ...paint, boundVariables: { [field]: { type: 'VARIABLE_ALIAS', id: v.id } } }),
    },
  };
  return { api: api as unknown as StyleGuideApi & CellsApi, pages, vars, cols, fontFails, styles, world };
};

/** The prism3 variables, as a theme write leaves them: `core` (Default) and `color` (four modes). */
const prism3Variables = (): { cols: ShimCol[]; vars: ShimVar[] } => {
  const core = readJson('core.palette.json');
  const modes = ['light', 'dark', 'hc-light', 'hc-dark'];
  const byMode = modes.map((m) => readJson(`color.${m}.json`));
  const cols: ShimCol[] = [
    { id: 'VariableCollectionId:core', name: 'core', modes: [{ modeId: 'core:0', name: 'Default' }], defaultModeId: 'core:0' },
    { id: 'VariableCollectionId:color', name: 'color', modes: modes.map((m, i) => ({ modeId: `color:${i}`, name: m })), defaultModeId: 'color:0' },
    // A foreign primitive collection: unpadded steps, stored out of numeric order.
    { id: 'VariableCollectionId:legacy', name: 'legacy', modes: [{ modeId: 'legacy:0', name: 'Value' }], defaultModeId: 'legacy:0' },
  ];
  const vars: ShimVar[] = [];
  const idOf = new Map<string, string>();
  core.variables.forEach((v, i) => { const id = `VariableID:core:${i}`; idOf.set(v.name, id); vars.push({ id, name: v.name, variableCollectionId: cols[0].id, resolvedType: v.resolvedType, description: v.description, valuesByMode: { 'core:0': v.value } }); });
  byMode[0].variables.forEach((v, i) => {
    const id = `VariableID:color:${i}`;
    idOf.set(v.name, id);
    const valuesByMode: Record<string, unknown> = {};
    byMode.forEach((file, m) => {
      const mv = file.variables.find((x) => x.name === v.name)!;
      valuesByMode[`color:${m}`] = mv.alias ? { type: 'VARIABLE_ALIAS', id: idOf.get(mv.alias.name) } : mv.value;
    });
    vars.push({ id, name: v.name, variableCollectionId: cols[1].id, resolvedType: v.resolvedType, description: v.description, valuesByMode });
  });
  ['100', '5', '900', '50'].forEach((s, i) => vars.push({ id: `VariableID:legacy:${i}`, name: `legacy/ramp/${s}`, variableCollectionId: cols[2].id, resolvedType: 'COLOR', description: '', valuesByMode: { 'legacy:0': { r: 0.5, g: 0.5, b: 0.5, a: 1 } } }));
  return { cols, vars };
};

const input = parseDesignMd(readFileSync(join(here, '../../packages/engine/examples/prism3.design.md'), 'utf8')).input;
const contract = resolveAllModes(brandTheme(input));

/** The owner-cell Text table's width (section 2): its fourteen HUG tracks, 2,828px by the shim's own metric, and the
 *  thirteen 2px gaps between them. */
const TEXT_OWNER_W = 2828 + 13 * 2;
/** The first three semantic tables' x in a row (decision 16): Background at the row's start, then each 160px after the
 *  one before it, whose widths the shim measures as 2,361 (Background) and 3,173 (Foreground). */
const XS_THREE = ['Background 0', 'Foreground 2521', 'Text 5854'];
/** A 120-character description widens the Text table's description column from 662 (its longest, 90 characters:
 *  630 + 16 + 16) to 872 (840 + 16 + 16): 210px. */
const WIDEN_TEXT = 210;
/** A 150-character description widens Primary — nbds's description column from 550 (its longest, 74 characters:
 *  518 + 16 + 16) to 1,082 (1,050 + 16 + 16): 532px. */
const WIDEN_PRIMARY = 532;
/** A 100-character description widens Density's description column from its "Description" header (11 characters:
 *  77 + 16 + 16 = 109) to 732 (700 + 16 + 16): 623px. */
const WIDEN_DENSITY = 623;
/** Two new steps add two rows to Dimension, each 44px (a text cell: 20 + 12 + 12) and its 2px gap: 92px. */
const GROW_DIMENSION = 92;
/** An 80-step dimension table: 81 rows of 44px and 80 gaps of 2px, 3,724, and the wrapper's 40px between its header
 *  (0px tall in the shim) and its grid: 3,764px. */
const RAMP_H = 3764;
const PRIM = '↳ Primitive tokens';
const SEM = '↳ Semantic tokens';
const FC = '↳ File Components';

/** The owner's test file: TWO roots in the same collections — `nbds/…` written first, then `pds3/…` — as a
 *  copy of the prism3 variables under `nbds/`, with new ids and every alias pointed at the nbds copy. */
const twoRootVariables = (): { cols: ShimCol[]; vars: ShimVar[] } => {
  const { cols, vars } = prism3Variables();
  const pds = vars.filter((v) => v.name.startsWith('pds3/'));
  const nbId = new Map(pds.map((v) => [v.id, v.id.replace('VariableID:', 'VariableID:nb-')]));
  const nb = pds.map((v) => ({
    ...v,
    id: nbId.get(v.id)!,
    name: v.name.replace(/^pds3\//, 'nbds/'),
    valuesByMode: Object.fromEntries(Object.entries(v.valuesByMode).map(([m, x]) => {
      const a = x as { type?: string; id?: string };
      return [m, a.type === 'VARIABLE_ALIAS' ? { type: 'VARIABLE_ALIAS', id: nbId.get(a.id!) } : x];
    })),
  }));
  return { cols, vars: [...nb, ...vars] };
};

/** PHASE 2's file (#259): the prism3 emission's dimension and font variables and its 63 text styles, as a theme write
 *  leaves them — `core` (dimension + font), `space`, `radius`, `size`, `type-sets` (desktop, mobile), `opacity` — plus
 *  two foreign collections: `density`, a dimension that varies by mode (compact 8/32, comfortable 12/40), and
 *  `metrics`, a size ramp stored out of order (16, 4, 100, 2) with a line height (24) and a letter spacing (−0.5). */
const phase2Variables = (): { cols: ShimCol[]; vars: ShimVar[]; styles: ShimStyle[] } => {
  type Em = { name: string; resolvedType: string; description: string; value: unknown; alias: { name: string } | null; scopes?: string[] };
  const em = (f: string): Em[] => (JSON.parse(readFileSync(join(OUT, f), 'utf8')) as { variables: Em[] }).variables;
  const one = (id: string, name: string): ShimCol => ({ id: `VariableCollectionId:${id}`, name, modes: [{ modeId: `${id}:0`, name: 'Default' }], defaultModeId: `${id}:0` });
  const cols: ShimCol[] = [
    one('core', 'core'), one('space', 'space'), one('radius', 'radius'), one('size', 'size'),
    { id: 'VariableCollectionId:ts', name: 'type-sets', modes: [{ modeId: 'ts:0', name: 'desktop' }, { modeId: 'ts:1', name: 'mobile' }], defaultModeId: 'ts:0' },
    one('opacity', 'opacity'),
    { id: 'VariableCollectionId:density', name: 'density', modes: [{ modeId: 'density:0', name: 'compact' }, { modeId: 'density:1', name: 'comfortable' }], defaultModeId: 'density:0' },
    { id: 'VariableCollectionId:metrics', name: 'metrics', modes: [{ modeId: 'metrics:0', name: 'Default' }], defaultModeId: 'metrics:0' },
  ];
  // Every file's variables, per collection and mode, ids assigned before any alias is read.
  const sources: [string, string[], Em[][]][] = [
    ['core', ['core:0'], [[...em('core.dimension.json'), ...em('core.font.json')]]],
    ['space', ['space:0'], [em('space.json')]],
    ['radius', ['radius:0'], [em('radius.json')]],
    ['size', ['size:0'], [em('size.json')]],
    ['ts', ['ts:0', 'ts:1'], [em('type-sets.desktop.json'), em('type-sets.mobile.json')]],
    ['opacity', ['opacity:0'], [em('opacity.json')]],
  ];
  const idOf = new Map<string, string>();
  for (const [c, , files] of sources) files[0].forEach((v, i) => idOf.set(v.name, `VariableID:${c}:${i}`));
  const vars: ShimVar[] = [];
  for (const [c, modes, files] of sources) files[0].forEach((v, i) => {
    const valuesByMode: Record<string, unknown> = {};
    modes.forEach((m, k) => {
      const mv = files[k].find((x) => x.name === v.name)!;
      valuesByMode[m] = mv.alias ? { type: 'VARIABLE_ALIAS', id: idOf.get(mv.alias.name) } : mv.value;
    });
    vars.push({ id: idOf.get(v.name)!, name: v.name, variableCollectionId: `VariableCollectionId:${c}`, resolvedType: v.resolvedType, description: v.description, valuesByMode, scopes: v.scopes });
  });
  const add = (id: string, name: string, col: string, values: Record<string, unknown>, scopes: string[], resolvedType = 'FLOAT'): void => {
    idOf.set(name, id);
    vars.push({ id, name, variableCollectionId: `VariableCollectionId:${col}`, resolvedType, description: '', valuesByMode: values, scopes });
  };
  add('VariableID:density:0', 'density/space/gap', 'density', { 'density:0': 8, 'density:1': 12 }, ['GAP']);
  add('VariableID:density:1', 'density/size/row', 'density', { 'density:0': 32, 'density:1': 40 }, ['WIDTH_HEIGHT']);
  ['16', '4', '100', '2'].forEach((st, i) => add(`VariableID:metrics:${i}`, `metrics/step/${st}`, 'metrics', { 'metrics:0': Number(st) }, ['WIDTH_HEIGHT']));
  add('VariableID:metrics:lh', 'metrics/line-height/body', 'metrics', { 'metrics:0': 24 }, ['LINE_HEIGHT']);
  add('VariableID:metrics:ls', 'metrics/letter-spacing/tight', 'metrics', { 'metrics:0': -0.5 }, ['LETTER_SPACING']);

  // The text styles, as `getLocalTextStylesAsync` returns them: the literal values (a bound one at its default mode's
  // value, as the host stores it) and each bound property's variable.
  type EmProp = { bound?: boolean; variable?: string; value?: unknown };
  const emStyles = (JSON.parse(readFileSync(join(OUT, 'text-styles.json'), 'utf8')) as { styles: { name: string; description: string; properties: Record<string, EmProp> }[] }).styles;
  const literal = (p: EmProp): unknown => {
    if (!p.bound) return p.value;
    const v = vars.find((x) => x.name === p.variable)!;
    const col = cols.find((c) => c.id === v.variableCollectionId)!;
    let raw = v.valuesByMode[col.defaultModeId] as { type?: string; id?: string } | unknown;
    while ((raw as { type?: string })?.type === 'VARIABLE_ALIAS') {
      const t = vars.find((x) => x.id === (raw as { id: string }).id)!;
      raw = Object.values(t.valuesByMode)[0];
    }
    return raw;
  };
  const styles: ShimStyle[] = emStyles.map((st, i) => {
    const p = st.properties;
    const boundVariables: Record<string, { type: string; id: string }> = {};
    for (const [k, v] of Object.entries(p)) if (v.bound) boundVariables[k] = { type: 'VARIABLE_ALIAS', id: idOf.get(v.variable!)! };
    return {
      id: `S:${i}:`, name: st.name, description: st.description,
      fontName: { family: String(literal(p.fontFamily)), style: String(literal(p.fontStyle)) },
      fontSize: Number(literal(p.fontSize)),
      lineHeight: p.lineHeight.value as { unit: string; value: number },
      letterSpacing: p.letterSpacing.value as { unit: string; value: number },
      paragraphSpacing: 0,
      textDecoration: String(p.textDecoration.value),
      boundVariables,
    };
  });
  return { cols, vars, styles };
};

/** Phase 2's file, drawn from: the pages, the header set and the cell sets Set up file builds. */
const phase2File = async (): Promise<Shim & { fc: N; prim: N; sem: N }> => {
  const fc = page(FC), prim = page(PRIM), sem = page(SEM);
  fc.appendChild(headerSet());
  const { cols, vars, styles } = phase2Variables();
  const s = makeShim([page('Cover'), prim, sem, fc], cols, vars, styles);
  await ensureStyleGuideCells(s.api, fc);
  return { ...s, fc, prim, sem };
};

const fullFile = async (variables = prism3Variables()): Promise<Shim & { fc: N; prim: N; sem: N }> => {
  const fc = page(FC), prim = page(PRIM), sem = page(SEM);
  fc.appendChild(headerSet());
  const { cols, vars } = variables;
  const s = makeShim([page('Cover'), prim, sem, fc], cols, vars);
  await ensureStyleGuideCells(s.api, fc);
  return { ...s, fc, prim, sem };
};

const setsNamed = (pages: N[], name: string): N[] => pages.flatMap((p) => p.findAllWithCriteria({ types: ['COMPONENT_SET'] })).filter((n) => n.name.toLowerCase() === name.toLowerCase());
const tablesOn = (p: N): N[] => p.findAll((n) => n.type === 'FRAME' && !!n.pluginData['prism3-style-guide']);
const tableFrame = (p: N, title: string): N | undefined => tablesOn(p).find((n) => n.name === `Style guide — ${title}`);
const gridOf = (wrap: N): N => wrap.children.find((c) => c.name === 'Table')!;
const cellAt = (grid: N, r: number, c: number): N | undefined => grid.children.find((k) => k.gridRow === r && k.gridCol === c);
const textIn = (n: N | undefined): string => (n?.findAll((k) => k.type === 'TEXT') ?? []).map((t) => t.characters).join(' | ');
const rowOf = (grid: N, token: string): number => grid.children.find((k) => k.gridCol === 0 && textIn(k) === token)?.gridRow ?? -1;
const boundId = (paints: unknown): string | undefined => (paints as { boundVariables?: { color?: { id: string } } }[] | undefined)?.[0]?.boundVariables?.color?.id;
/** The width a node's content needs, read off the shim's own metric — never the plugin's arithmetic. A wrapped
 *  text needs only its box; any other text needs its words on one line. */
const need = (n: N): number => {
  if (n.type === 'TEXT') return n.textAutoResize === 'HEIGHT' ? n.width : naturalOf(n);
  const kids = n.children.filter((k) => k.visible !== false && inFlow(k));
  if (n.layoutMode === 'HORIZONTAL') return padX(n) + kids.reduce((a, k) => a + need(k), 0) + Number(n.itemSpacing ?? 0) * Math.max(0, kids.length - 1);
  if (n.layoutMode === 'VERTICAL') return padX(n) + Math.max(0, ...kids.map(need));
  // A frame that clips its content needs only its own width: the radius swatch's 128px shape shows through a 32px window.
  if (n.clipsContent === true) return n.w;
  return Math.max(n.w, ...kids.map((k) => Number(k.x) + need(k)));
};
/** Every cell of a table whose content is wider than its column's track, or whose text truncates — "row,col: need > track". */
const clipped = (grid: N): string[] => grid.children.flatMap((cell) => {
  const track = trackW(grid, cell.gridCol!);
  const cut = cell.findAll((k) => k.type === 'TEXT' && (k.textTruncation === 'ENDING' || k.textAutoResize === 'TRUNCATE')).length > 0;
  return need(cell) > track || cut ? [`${cell.gridRow},${cell.gridCol}: ${need(cell)} > ${track}${cut ? ' (truncated)' : ''}`] : [];
});

/** Every run here yields with `setImmediate`, a macrotask like the plugin's `setTimeout(0)` without its ~1ms floor:
 *  the suite's ~70 runs yield thousands of times. Section 12 injects its own counting `yieldTo`. */
const fastYield = (): Promise<void> => new Promise<void>((resolve) => { setImmediate(resolve); });
const draw = (api: StyleGuideApi, c: Parameters<typeof runStyleGuide>[1], o: StyleGuideOptions = {}, run: StyleGuideRun = {}): Promise<StyleGuideResult> =>
  runStyleGuide(api, c, o, { yieldTo: fastYield, ...run });

const main = async (): Promise<void> => {
  console.log('1. cell sets on a fresh file');
  {
    const fc = page(FC);
    fc.appendChild(headerSet());
    const s = makeShim([page('Cover'), fc], [], []);
    const r = await ensureStyleGuideCells(s.api, fc);
    ok(JSON.stringify(r.built) === JSON.stringify(['_style-guide-swatches', '_style-guide-text-cells', '_style-guide-spacing-cells']), '1: builds the three sets');
    const sw = setsNamed(s.pages, '_style-guide-swatches')[0];
    ok(sw?.parent === fc, '1: the swatch set sits on ↳ File Components');
    ok(JSON.stringify(sw?.children.map((c) => c.name)) === JSON.stringify(['type=default', 'type=text', 'type=icon', 'type=border', 'type=transparency', 'type=radius']), '1: six swatch types');
    ok(sw?.children.filter((c) => c.name !== 'type=radius').every((c) => !!c.findOne((k) => k.name === 'Specimen')), '1: every swatch but the radius has a Specimen node');
    // THE RADIUS SWATCH SHOWS ONE ROUNDED CORNER (owner decision, 2026-09-29, "keep the one"), in the owner's structure
    // and sizes as measured live: a 48 × 48 radius-example-container that CLIPS, holding a 256 × 96 radius-example at
    // its top-left, 0,0, with a radius, so only that one corner falls inside the window. Literals typed here.
    const rad = sw?.children.find((c) => c.name === 'type=radius');
    const win = rad?.findOne((k) => k.name === 'radius-example-container');
    const shape = win?.findOne((k) => k.name === 'radius-example');
    ok(win?.clipsContent === true, `1: the radius swatch's radius-example-container clips its content, so only one corner shows (clipsContent ${win?.clipsContent})`);
    ok(win?.w === 48 && win.h === 48 && shape?.parent === win && shape.w === 256 && shape.h === 96 && shape.x === 0 && shape.y === 0 && Number(shape.cornerRadius) > 0,
      `1: inside it, radius-example is 256 × 96 at 0,0 with a radius, larger than the 48 × 48 window both ways (${win?.w}×${win?.h}; ${shape?.w}×${shape?.h} at ${shape?.x},${shape?.y}, r${shape?.cornerRadius})`);
    // The spacing members, sized by their left padding (the owner's live run of 0.205.0): each member's first child is
    // a HORIZONTAL frame that hugs its width, paddingLeft 8 and no flow child; the line's three bars sit inside it
    // ABSOLUTELY, constrained in the component: left-bar MIN, horizontal-line STRETCH, right-bar MAX. Literals here.
    const sp = setsNamed(s.pages, '_style-guide-spacing-cells')[0];
    const ex = (d: string): N | undefined => sp?.children.find((c) => c.name === `display=${d}`)?.children[0];
    const shape1 = (f: N | undefined): string => `${f?.name}:${f?.layoutMode}:${f?.primaryAxisSizingMode}:${f?.counterAxisSizingMode}:${f?.width}x${f?.height}:pad ${f?.paddingLeft},${f?.paddingRight},${f?.paddingTop},${f?.paddingBottom}:gap ${f?.itemSpacing}`;
    // Rounded to 2 places: a STRETCH line on a 0.01 frame is 0.00999… in floating point.
    const rd = (v: unknown): number => Math.round(Number(v) * 100) / 100;
    const bars = (f: N | undefined): string => (f?.children ?? []).map((k) => `${k.name} ${rd(k.x)},${k.y} ${rd(k.width)}x${k.height} ${k.layoutPositioning} ${k.constraints?.horizontal}/${k.constraints?.vertical}`).join('; ');
    const lineEx = ex('line');
    // AT REST 0.01 WIDE, NO PADDING (owner decision, live QA of 0.210.0): drawn at 8 with its bars, then resized to 0.01
    // before HUG, so right-bar sits at 0.01 − 1 = −0.99 and the line is 0.01 wide. A value then grows it from there.
    ok(shape1(ex('filled')) === 'spacing-filled-example:HORIZONTAL:AUTO:FIXED:0.01x20:pad 0,0,0,0:gap 0' && shape1(lineEx) === 'spacing-line-example:HORIZONTAL:AUTO:FIXED:0.01x16:pad 0,0,0,0:gap 0'
      && bars(lineEx) === 'left-bar 0,0 1x16 ABSOLUTE MIN/MIN; horizontal-line 0,7.5 0.01x1 ABSOLUTE STRETCH/MIN; right-bar -0.99,0 1x16 ABSOLUTE MAX/MIN',
      `1: the spacing members are the owner's restructured tree exactly: hug frames 0.01×20 and 0.01×16 with no padding, the bracket's bars absolute at their literal geometry (${shape1(ex('filled'))}; ${shape1(lineEx)}; ${bars(lineEx)})`);
    // The diamond's box from the typings' transform (`rotation = atan2(-m10, m00)`, about the top-left corner):
    // a corner (px, py) lands at (x + px·cos θ + py·sin θ, y − px·sin θ + py·cos θ).
    const dia = sw?.children.find((c) => c.name === 'type=icon')?.findOne((k) => k.name === 'Specimen');
    const th = (Number(dia?.rotation) * Math.PI) / 180, dx = Number(dia?.x), dy = Number(dia?.y), dw = Number(dia?.width), dh = Number(dia?.height);
    const corners = [[0, 0], [dw, 0], [0, dh], [dw, dh]].map(([px, py]) => [dx + px * Math.cos(th) + py * Math.sin(th), dy - px * Math.sin(th) + py * Math.cos(th)]);
    const r2 = (v: number): number => Math.round(v * 100) / 100;
    const bb = [Math.min(...corners.map((c) => c[0])), Math.max(...corners.map((c) => c[0])), Math.min(...corners.map((c) => c[1])), Math.max(...corners.map((c) => c[1]))].map(r2);
    ok(dia?.rotation === 45 && dw === 22 && JSON.stringify(bb) === JSON.stringify([8.44, 39.56, 8.44, 39.56]), `1: the icon diamond's box is 8.44–39.56 on both axes, centered at 24 in the 48px swatch (got ${JSON.stringify(bb)})`);
    const tc = setsNamed(s.pages, '_style-guide-text-cells')[0];
    ok(tc?.children.length === 12, '1: twelve text cells');
    ok(tc?.children.some((c) => c.name === 'color=white, textAlign=left, type=value alias, padding=default'), '1: a value-alias cell');
    ok(tc?.children.every((c) => c.findAll((k) => k.type === 'TEXT' && k.name !== 'Icon').every((k) => k.characters === 'Abc 123')), '1: sample text is "Abc 123"');
    ok(JSON.stringify(setsNamed(s.pages, '_style-guide-spacing-cells')[0]?.children.map((c) => c.name)) === JSON.stringify(['display=filled', 'display=line']), '1: spacing cells filled | line');
    const again = await ensureStyleGuideCells(s.api, fc);
    ok(again.built.length === 0 && again.adopted.length === 3, '1: a second run builds nothing and adopts three');
    ok(setsNamed(s.pages, '_style-guide-swatches').length === 1, '1: still one swatch set');
  }

  console.log('2. existing sets are adopted, wherever and however named');
  {
    const fc = page(FC), sgc = page('Style Guide Components');
    const owned = ownerSet('_Style-Guide-Swatches', ['type=Default', 'type=Text'], true);
    const ownedText = ownerSet('_style-guide-text-cells', ['color=dark, textAlign=left, type=header, padding=default', 'color=white, textAlign=left, type=default, padding=default'], false);
    sgc.appendChild(owned); sgc.appendChild(ownedText);
    const s = makeShim([fc, sgc], [], []);
    const r = await ensureStyleGuideCells(s.api, fc);
    ok(JSON.stringify(r.built) === JSON.stringify(['_style-guide-spacing-cells']), '2: builds only the missing spacing set');
    ok(r.adopted.some((a) => a.name === '_Style-Guide-Swatches' && a.page === 'Style Guide Components'), '2: reports the adopted swatch set and its page');
    ok(setsNamed(s.pages, '_style-guide-swatches').length === 1, '2: the adopted swatch set is not duplicated');
    ok(owned.parent === sgc && owned.children.length === 2, '2: the adopted set is not moved or rebuilt');

    // A table drawn from the ADOPTED sets: bound through the owner's own node name, variant matched in any case.
    // The header set sits beside them, its Size=Medium at the owner's 2,517px.
    sgc.appendChild(headerSet());
    const { cols, vars } = prism3Variables();
    const sem = page(SEM);
    const s2 = makeShim([fc, sgc, sem], cols, vars);
    const run = await draw(s2.api, contract, { collections: ['color'] });
    const text = tableFrame(sem, 'Text');
    ok(!!text, '2: tables draw from adopted sets');
    const g = text ? gridOf(text) : undefined;
    const r1 = g ? rowOf(g, 'primary') : -1;
    const sw = g ? cellAt(g, r1, 1)?.children[0] : undefined;
    ok(sw?.mainComponent?.name === 'type=Text', '2: the adopted type=Text swatch is used for a text role');
    ok(boundId(sw?.findOne((k) => k.name === 'Aa')?.fills) === vars.find((v) => v.name === 'pds3/color/text/primary')!.id, '2: the owner-named node is bound');
    ok(run.misses.includes('_style-guide-text-cells has no type=value alias, color=white variant'), '2: a variant the adopted set lacks is reported by name');
    // The owner's type=default carries its fill on the component itself, with no layers inside (live: 368 misses).
    const bgT = tableFrame(sem, 'Background');
    const bgG = bgT ? gridOf(bgT) : undefined;
    const bgSw = bgG ? cellAt(bgG, rowOf(bgG, 'primary'), 1)?.children[0] : undefined;
    ok(bgSw?.mainComponent?.name === 'type=Default' && boundId(bgSw?.fills) === vars.find((v) => v.name === 'pds3/color/background/primary')!.id, "2: a type=default swatch with no layers binds the instance's own fill");
    ok(run.unbound === 0 && styleGuideSummary(run).headline === '✓ style guide: 11 tables', '2: nothing unbound — headline "✓ style guide: 11 tables"');
    // The owner's cells are a fixed 120px and clip; drawn, each hugs its words and no column cuts one off.
    const off = g ? clipped(g) : ['no grid'];
    ok(off.length === 0, `2: no text in the owner's cells is wider than its column (${off.slice(0, 3).join('; ')})`);
    ok(!!g && trackW(g, 1) === 99, `2: the owner's swatch column is the wider of the 80px specimen and its "light" header, 35 + 24 + 40 = 99 (got ${g ? trackW(g, 1) : '?'})`);
    // THE OWNER'S GRID MODEL (owner decision, 2026-09-29): the description never wraps. Its text hugs its words on one
    // line, and its column is the longest line — success-subtle's 90 characters, 630px — plus the owner's 24 + 40.
    const descCol = g ? g.gridColumnCount - 1 : -1;
    const ownCell = g ? cellAt(g, rowOf(g, 'success-subtle'), descCol) : undefined;
    const ownDesc = ownCell?.findOne((k) => k.type === 'TEXT');
    ok(!!g && trackW(g, descCol) === 694 && ownDesc?.textAutoResize === 'WIDTH_AND_HEIGHT' && linesOf(ownDesc) === 1 && ownCell?.width === 694,
      `2: the owner's description column is its longest line, 630 + 24 + 40 = 694, the text on one line (got ${g ? trackW(g, descCol) : '?'}, ${ownDesc?.textAutoResize}, ${ownDesc ? linesOf(ownDesc) : '?'} lines)`);
    // THE HEADER SPANS ITS TABLE (owner decision, 2026-09-29): the table is as wide as its grid, and so is its header,
    // not the header component's 2,517px. 2,854 is the owner-cell Text table's fourteen tracks and thirteen 2px gaps.
    const hdr = text?.children.find((c) => c.pluginData['prism3-style-guide-part'] === 'header');
    ok(!!g && !!hdr && g.width === TEXT_OWNER_W && text!.width === TEXT_OWNER_W && hdr.width === TEXT_OWNER_W,
      `2: the table and its header are as wide as its grid, ${TEXT_OWNER_W}px, not the header component's 2,517 (table ${text?.width}, grid ${g?.width}, header ${hdr?.width})`);
  }

  console.log('3. the plan');
  const { cols, vars } = prism3Variables();
  const catalog: SgCatalog = { collections: cols, variables: vars };
  const plan = planStyleGuide(catalog, contract);
  const byTitle = (kind: string, title: string): SgTable | undefined => plan.tables.find((t) => t.kind === kind && t.title === title);
  {
    const sem = plan.tables.filter((t) => t.kind === 'semantic');
    ok(JSON.stringify(sem.map((t) => t.title)) === JSON.stringify(['Background', 'Foreground', 'Text', 'Icon', 'Interactive', 'Disabled', 'Border', 'Scrim', 'Veil', 'Field', 'Inverse']), '3: color groups by family, in file order');
    ok(sem.every((t) => t.page === SEM), '3: semantic tables go on ↳ Semantic tokens');
    const prim = plan.tables.filter((t) => t.kind === 'primitive');
    ok(JSON.stringify(prim.map((t) => t.title)) === JSON.stringify(['Core — base', 'Primary', 'Neutral', 'Accent', 'Success', 'Warning', 'Info', 'Danger', 'Black alpha', 'White alpha', 'Legacy']), '3: primitive tables per palette');
    ok(prim.every((t) => t.page === PRIM), '3: primitive tables go on ↳ Primitive tokens');
    ok(sem.reduce((n, t) => n + t.rows.length, 0) === 268 && prim.filter((t) => t.title !== 'Legacy').reduce((n, t) => n + t.rows.length, 0) === 164, '3: every color variable is a row (268 + 164)');
    const text = byTitle('semantic', 'Text')!;
    ok(JSON.stringify(text.columns) === JSON.stringify(['Token', 'light', 'Value', 'Contrast', 'dark', 'Value', 'Contrast', 'hc-light', 'Value', 'Contrast', 'hc-dark', 'Value', 'Contrast', 'Description']), '3: a specimen, value and contrast column per mode');
    ok(JSON.stringify(byTitle('primitive', 'Neutral')!.columns) === JSON.stringify(['Token', 'Default', 'Value', 'Description']), '3: a primitive table has no contrast column');
    const tp = text.rows.find((r) => r.token === 'primary')!;
    ok(JSON.stringify(tp.cells.map((c) => contrastText(c.contrast).split('\n')[0])) === JSON.stringify(['19.42:1 — clears the 7:1 floor', '18.13:1 — clears the 7:1 floor', '21.00:1 — clears the 15:1 floor', '21.00:1 — clears the 15:1 floor']), '3: text.primary on background.primary: 19.42, 18.13, 21, 21');
    ok(tp.cells.every((c) => c.contrast?.ground === 'background/primary'), '3: text.primary measures against background/primary');
    ok(tp.cells[0].value === '#0D0D0E' && tp.cells[0].alias === 'pds3/core/palette/neutral/950', '3: text.primary light is #0D0D0E, an alias of neutral/950');
    ok(tp.display === 'text', '3: a text role draws the text swatch');
    const bg = byTitle('semantic', 'Background')!.rows.find((r) => r.token === 'primary')!;
    ok(bg.cells.every((c) => c.contrast === null), '3: background.primary has no contracted ground — its contrast reads "—"');
    ok(contrastText(null) === '—', '3: no contract reads "—"');
    const scrim = byTitle('semantic', 'Scrim')!.rows[0];
    ok(scrim.cells[0].value === '#000000 · 40%' && scrim.display === 'transparency', '3: a translucent role prints its alpha and draws the checkerboard');
    const iconOnBrand = byTitle('semantic', 'Icon')!.rows.find((r) => r.token === 'on-brand')!;
    ok(contrastText(iconOnBrand.cells[0].contrast) === '7.82:1 — clears the 4.5:1 floor\non foreground/brand', '3: icon.on-brand measures against foreground/brand');
    // A palette-step ground, in another collection: resolved in ITS default mode, not the column's (`groundModeFor`).
    const fgBrand = byTitle('semantic', 'Foreground')!.rows.find((r) => r.token === 'brand')!;
    ok(contrastText(fgBrand.cells[0].contrast) === '6.44:1 — clears the 3:1 floor\non pds3/core/palette/neutral/050', '3: foreground.brand on neutral/050, light: 6.44:1');
    // An ink-on-wash role: the ink measured over the wash composited on the ground — 19.42 on the bare ground.
    const hover = byTitle('semantic', 'Interactive')!.rows.find((r) => r.token === 'primary/overlay/hover')!;
    ok(hover.cells[0].contrast?.ink === 'text/primary' && hover.cells[0].contrast?.ground === 'background/primary' && contrastText(hover.cells[0].contrast).startsWith('15.42:1 — clears the 4.5:1 floor'), '3: text/primary over interactive.primary.overlay.hover on background.primary, light: 15.42:1');
    const noBrand = planStyleGuide(catalog, null);
    ok(noBrand.tables.every((t) => t.rows.every((r) => r.cells.every((c) => c.contrast === null))) && noBrand.notes.some((n) => n.startsWith('No saved brand')), '3: no saved brand — every contrast "—", said once');
    ok(planStyleGuide(catalog, contract, { types: ['shadow'] }).tables.length === 0 && planStyleGuide(catalog, contract, { types: ['shadow'] }).notes.includes('shadow: not in this phase — this phase draws color, dimension, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, typography'), '3: a later-phase type is named, not drawn');
    ok(planStyleGuide(catalog, contract, { valueFormat: 'rgba' }).tables.find((t) => t.title === 'Scrim')!.rows[0].cells[0].value === 'rgba(0, 0, 0, 0.4)', '3: rgba format');
  }

  console.log('4. numeric order');
  {
    ok(JSON.stringify(byTitle('primitive', 'Legacy')!.rows.map((r) => r.token)) === JSON.stringify(['5', '50', '100', '900']), '4: foreign ramp in numeric order');
    ok(JSON.stringify(byTitle('primitive', 'Black alpha')!.rows.map((r) => r.token.split('/').pop())) === JSON.stringify(['5', '10', '20', '30', '40', '50', '60', '70', '80', '90']), '4: black-alpha 5 before 10');
  }

  console.log('5. the executor');
  const f = await fullFile();
  const idOf = (name: string): string => f.vars.find((v) => v.name === name)!.id;
  const first = await draw(f.api, contract);
  {
    ok(tablesOn(f.sem).length === 11 && tablesOn(f.prim).length === 11, '5: 11 semantic and 11 primitive tables');
    ok(first.tables.every((t) => t.status === 'created'), '5: every table created on a first run');
    const text = tableFrame(f.sem, 'Text')!;
    const header = text.children[0];
    ok(header?.mainComponent?.name === 'Size=Medium' && header.findOne((k) => k.name === 'Title')?.characters === 'Text', '5: the table opens with a Size=Medium header titled "Text"');
    ok(header?.componentProperties?.['Description#1:0']?.value === true, '5: the header shows its description');
    const g = gridOf(text);
    ok(g.layoutMode === 'GRID' && g.gridColumnCount === 14 && g.gridRowCount === 24, '5: a 14 × 24 grid (23 text roles + the header row)');
    // THE OWNER'S GRID MODEL (owner decision, 2026-09-29), in every table: HUG tracks both ways, every cell FILLs its
    // track on both axes, every text hugs its words on one line and nothing truncates.
    const grids = [...tablesOn(f.sem), ...tablesOn(f.prim)].map(gridOf);
    const notHug = grids.flatMap((x) => [...x.gridColumnSizes, ...x.gridRowSizes].filter((s) => s.type !== 'HUG').map((s) => `${x.parent?.name}: ${s.type}`));
    ok(grids.length === 22 && notHug.length === 0, `5: every column and row track of every table is HUG (${notHug.slice(0, 3).join('; ')})`);
    // A palette row's swatch sits in the grid itself (decision 13), so the text cells are the instances of any other set.
    const isSwatch = (k: N): boolean => k.mainComponent?.parent?.name === '_style-guide-swatches';
    const textCells = grids.flatMap((x) => x.children.filter((k) => k.type === 'INSTANCE' && !isSwatch(k)));
    const hugging = textCells.filter((k) => k.lsh !== 'FILL' || k.layoutSizingVertical !== 'FILL');
    ok(textCells.length > 0 && hugging.length === 0, `5: every text cell FILLs its track, both axes (${hugging.length} of ${textCells.length} do not)`);
    const grounds = grids.flatMap((x) => x.children.filter((k) => k.name === 'Ground'));
    ok(grounds.length > 0 && grounds.every((k) => k.lsh === 'FILL' && k.layoutSizingVertical === 'FILL'), '5: every specimen ground FILLs its track, both axes');
    // THE OWNER'S EXAMPLES (owner decisions, 2026-09-29): a 2px gap between tracks, rows and columns alike, and the swatch
    // at its component's fixed size inside a cell that FILLs its track. 48 is the built swatch member's size (48 × 48).
    const offGap = grids.filter((x) => x.gridRowGap !== 2 || x.gridColumnGap !== 2);
    ok(offGap.length === 0, `5: every table's grid has a 2px gap between its rows and between its columns (${offGap.slice(0, 3).map((x) => `${x.parent?.name}: ${x.gridRowGap}/${x.gridColumnGap}`).join('; ')})`);
    const swatchesIn = grounds.flatMap((k) => k.children.filter((c) => c.type === 'INSTANCE'));
    const stretched = swatchesIn.filter((x) => x.lsh !== 'FIXED' || x.layoutSizingVertical !== 'FIXED' || x.width !== 48 || x.height !== 48);
    ok(swatchesIn.length === grounds.length && stretched.length === 0 && grounds.every((k) => k.width > 48),
      `5: every swatch keeps its component's 48 × 48, FIXED on both axes, inside a cell that FILLs its wider track (${stretched.length} of ${swatchesIn.length} do not: ${stretched.slice(0, 2).map((x) => `${x.lsh}/${x.layoutSizingVertical} ${x.width}×${x.height}`).join('; ')})`);
    const texts = textCells.flatMap((k) => k.findAll((x) => x.type === 'TEXT'));
    const wrapped = texts.filter((x) => x.textAutoResize !== 'WIDTH_AND_HEIGHT' || x.textTruncation !== 'DISABLED' || linesOf(x) !== String(x.characters).split('\n').length);
    ok(texts.length > 0 && wrapped.length === 0, `5: every text hugs its words — WIDTH_AND_HEIGHT, never truncated, never wrapped (${wrapped.slice(0, 3).map((x) => x.characters).join('; ')})`);
    ok(textIn(cellAt(g, 0, 1)) === 'light' && textIn(cellAt(g, 0, 13)) === 'Description', '5: header row names the columns');
    ok(cellAt(g, 0, 0)?.mainComponent?.name === 'color=dark, textAlign=left, type=header, padding=default', '5: a dark header by default');
    const r = rowOf(g, 'primary');
    ok(r === 1, '5: text/primary is the first row, named "primary" in the Text table');
    const specimens = [1, 4, 7, 10].map((c) => cellAt(g, r, c)!);
    const colorId = 'VariableCollectionId:color';
    ok(specimens.every((s, i) => s.children[0]?.explicitVariableModes[colorId] === `color:${i}`), "5: every text/primary swatch pins its column's mode");
    ok(specimens.every((s, i) => s.explicitVariableModes[colorId] === `color:${i}`), "5: every text/primary ground pins its column's mode");
    ok(specimens.every((s) => boundId(s.children[0]?.findOne((k) => k.name === 'Specimen')?.fills) === idOf('pds3/color/text/primary')), '5: every text/primary swatch is bound to text/primary');
    ok(specimens.every((s) => s.children[0]?.mainComponent?.name === 'type=text'), '5: text/primary uses the text swatch');
    ok(specimens.every((s) => boundId(s.fills) === idOf('pds3/color/background/primary')), '5: text/primary is drawn on background/primary');
    ok(textIn(cellAt(g, r, 2)) === '#0D0D0E | ↗ | pds3/core/palette/neutral/950', '5: the value cell carries the value and the alias chip');
    ok(textIn(cellAt(g, r, 3)) === '19.42:1 — clears the 7:1 floor\non background/primary', '5: the contrast cell reads the ratio, the floor and the ground');
    ok(textIn(cellAt(g, r, 13)) === f.vars.find((v) => v.name === 'pds3/color/text/primary')!.description, '5: the description cell');

    const inv = tableFrame(f.sem, 'Inverse')!;
    const ig = gridOf(inv);
    const ir = rowOf(ig, 'text/primary');
    ok(ir > 0 && [1, 4, 7, 10].every((c) => boundId(cellAt(ig, ir, c)?.fills) === idOf('pds3/color/inverse/background/primary')), '5: inverse/text/primary is drawn on inverse/background/primary');
    const icon = gridOf(tableFrame(f.sem, 'Icon')!);
    ok(boundId(cellAt(icon, rowOf(icon, 'on-brand'), 1)?.fills) === idOf('pds3/color/foreground/brand'), '5: icon/on-brand is drawn on foreground/brand');
    const neutral = gridOf(tableFrame(f.prim, 'Neutral')!);
    const nr = rowOf(neutral, '050');
    ok(boundId(cellAt(neutral, nr, 1)?.findOne((k) => k.name === 'Specimen')?.fills) === idOf('pds3/core/palette/neutral/050'), '5: a primitive swatch is bound to its step');
    ok(cellAt(neutral, nr, 1)?.explicitVariableModes['VariableCollectionId:core'] === 'core:0', '5: a primitive swatch pins its one mode');

    // THE SPECIMEN BY ROLE (owner decision 13, 2026-09-29). A palette row: no ground, its cell the type=default swatch
    // (the alpha palettes draw type=transparency the same way). THE SWATCH FILLS ITS CELL (decision 13 as the owner
    // restated it, 2026-09-29): FILL both ways, floored at 80 × 80 (the owner's decision, 2026-09-29: close to the 83px in
    // their file, not much smaller), so it is as wide as its column, 81px (its "Default" header: 7 × 7 + 16 + 16), and
    // its row is the floor, 80px, taller than a text cell (20 + 12 + 12 = 44), not its component's 48 × 48.
    const pal = cellAt(neutral, nr, 1);
    const primGrounds = tablesOn(f.prim).flatMap((w) => gridOf(w).findAll((k) => k.name === 'Ground'));
    const primSwatches = tablesOn(f.prim).flatMap((w) => gridOf(w).children.filter((k) => k.gridRow! > 0 && k.gridCol === 1));
    const fills = (k: N): boolean => k.type === 'INSTANCE' && k.lsh === 'FILL' && k.layoutSizingVertical === 'FILL' && k.minWidth === 80 && k.minHeight === 80
      && k.width === trackW(k.parent!, k.gridCol!) && k.height === trackH(k.parent!, k.gridRow!);
    ok(pal?.type === 'INSTANCE' && pal.mainComponent?.name === 'type=default' && pal.width === 81 && pal.height === 80 && fills(pal)
      && primGrounds.length === 0 && primSwatches.length > 0 && primSwatches.every(fills),
      `5: a palette row has no ground frame: its cell is the type=default swatch, FILLing it both ways at 81 × 80, floored at 80 (${pal?.mainComponent?.name} ${pal?.lsh}/${pal?.layoutSizingVertical} ${pal?.width}×${pal?.height}; ${primGrounds.length} grounds, ${primSwatches.filter((k) => !fills(k)).length} swatches not filling)`);
    // A TALLER ROW MAKES A TALLER SWATCH: the row's value cell given 80px more top padding makes the row, and the
    // swatch in it, 124px tall (44 + 80); its neighbor row stays at the 80px floor.
    const vcell = cellAt(neutral, nr, 2)!;
    vcell.paddingTop = Number(vcell.paddingTop) + 80;
    const tall = [pal?.height, cellAt(neutral, nr + 1, 1)?.height];
    vcell.paddingTop = Number(vcell.paddingTop) - 80;
    ok(JSON.stringify(tall) === JSON.stringify([124, 80]), `5: a taller row makes a taller swatch: 124px in a row made 124px tall, 80 in the next (${tall.join(', ')})`);
    // A text role: letters, the type=text member, its "Aa" fill bound to the token, directly on its ground. No filled square.
    const tcell = cellAt(g, r, 1)!;
    const tsw = tcell.children[0];
    const letters = tsw?.findOne((k) => k.name === 'Specimen');
    const squares = tsw ? [tsw, ...tsw.findAll(() => true)].filter((k) => k.type !== 'TEXT' && Array.isArray(k.fills) && (k.fills as unknown[]).length > 0) : [];
    ok(tcell.name === 'Ground' && boundId(tcell.fills) === idOf('pds3/color/background/primary') && tsw?.mainComponent?.name === 'type=text'
      && letters?.type === 'TEXT' && letters.characters === 'Aa' && boundId(letters.fills) === idOf('pds3/color/text/primary') && squares.length === 0,
      `5: a text.* row draws letters, the type=text member with its "Aa" fill bound to the token, on its ground, with no filled square (${tsw?.mainComponent?.name}, ${letters?.type} "${letters?.characters}", ${squares.length} filled shapes)`);
    // A border role: the type=border member, its stroke bound to the token, on its ground.
    const bcell = cellAt(gridOf(tableFrame(f.sem, 'Border')!), 1, 1)!;
    const bsw = bcell.children[0];
    const firstBorder = f.vars.filter((v) => v.name.startsWith('pds3/color/border/'))[0].name;
    ok(bcell.name === 'Ground' && bsw?.mainComponent?.name === 'type=border' && boundId(bsw.findOne((k) => k.name === 'Specimen')?.strokes) === idOf(firstBorder)
      && boundId(bsw.findOne((k) => k.name === 'Specimen')?.fills) === undefined,
      `5: a border.* row draws the type=border member, its stroke bound to the token and not its fill, on its ground (${bsw?.mainComponent?.name})`);
    // A fill role: the type=default swatch, 48 × 48, its fill bound to the token, on its ground.
    const bgG = gridOf(tableFrame(f.sem, 'Background')!);
    const fcell = cellAt(bgG, rowOf(bgG, 'secondary'), 1)!;
    const fsw = fcell.children[0];
    ok(fcell.name === 'Ground' && fcell.lsh === 'FILL' && fsw?.mainComponent?.name === 'type=default' && fsw.width === 48 && fsw.height === 48
      && boundId(fsw.findOne((k) => k.name === 'Specimen')?.fills) === idOf('pds3/color/background/secondary'),
      `5: a fill row keeps its 48 × 48 swatch on its ground (${fcell.name}, ${fsw?.mainComponent?.name} ${fsw?.width}×${fsw?.height})`);
    const border = gridOf(tableFrame(f.sem, 'Border')!);
    const bs = cellAt(border, 1, 1)?.children[0];
    ok(bs?.mainComponent?.name === 'type=border' && boundId(bs?.findOne((k) => k.name === 'Specimen')?.strokes) === idOf(f.vars.filter((v) => v.name.startsWith('pds3/color/border/'))[0].name), '5: a border role binds the stroke');
    // A swatch column is the wider of the specimen (48 + 16 + 16) and its header (7px a character + 16 + 16):
    // light 67 and dark 60 → 80; hc-light 88; hc-dark 81.
    const sw = [1, 4, 7, 10].map((c) => trackW(g, c));
    ok(JSON.stringify(sw) === JSON.stringify([80, 80, 88, 81]), `5: a swatch column is the wider of the specimen and its mode header: 80, 80, 88, 81 (got ${sw.join(', ')})`);
    const neutralT = tableFrame(f.prim, 'Neutral')!;
    const dflt = cellAt(gridOf(neutralT), 0, 1)?.findOne((k) => k.type === 'TEXT');
    ok(trackW(gridOf(neutralT), 1) === 81 && dflt?.characters === 'Default' && linesOf(dflt) === 1, `5: the "Default" header sits on one line in its 81px column (got ${trackW(gridOf(neutralT), 1)}, ${dflt ? linesOf(dflt) : '?'} lines)`);
    const headers = [...tablesOn(f.sem), ...tablesOn(f.prim)].flatMap((w) => gridOf(w).children.filter((k) => k.gridRow === 0).flatMap((k) => k.findAll((x) => x.type === 'TEXT')));
    ok(headers.length > 0 && headers.every((x) => linesOf(x) === 1), `5: every header in every table sits on one line (${headers.filter((x) => linesOf(x) !== 1).map((x) => x.characters).slice(0, 3).join(', ')})`);
    // Nothing wraps (owner decision, 2026-09-29): the description column is its longest line, success-subtle's 90
    // characters at 7px, plus the built cell's 16 + 16.
    const long = cellAt(g, rowOf(g, 'success-subtle'), 13);
    const longText = long?.findOne((k) => k.type === 'TEXT');
    ok(trackW(g, 13) === 662 && long?.width === 662 && longText?.textAutoResize === 'WIDTH_AND_HEIGHT' && linesOf(longText) === 1,
      `5: the description column is its longest line, 630 + 16 + 16 = 662, on one line (got ${trackW(g, 13)}, ${long?.width}, ${longText?.textAutoResize})`);
    const descs = g.children.filter((k) => k.gridCol === 13 && k.gridRow! > 0);
    ok(descs.length === 23 && descs.every((k) => k.width === 662), '5: every description cell FILLs to the column, 662, the short ones included');
    const off = [...tablesOn(f.sem), ...tablesOn(f.prim)].flatMap((w) => clipped(gridOf(w)).map((x) => `${w.name} ${x}`));
    ok(off.length === 0, `5: no cell in any table is wider than its column (${off.slice(0, 3).join('; ')})`);
    ok(JSON.stringify(neutral.children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).sort((a, b) => a.gridRow! - b.gridRow!).map(textIn).slice(0, 4)) === JSON.stringify(['025', '050', '100', '150']), '5: a palette table leads with the step alone: 025, 050, 100, 150 …');
    const sum = styleGuideSummary(first);
    ok(sum.ok && sum.headline === '✓ style guide: 22 tables' && sum.headline.length <= 24, '5: headline "✓ style guide: 22 tables"');
  }

  console.log('6a. a deleted table is not read after it is removed (#1795)');
  {
    // The host invalidates a removed node: reading its name afterwards threw "in get_name: … does not exist" (#1795,
    // the shape of #1791 and #1794), and the shim does the same. One run deletes TWO superseded, unedited tables
    // (density's and metrics' steps regrouped under new names, their variables and bindings unchanged), and must
    // name both. It runs here, before any other test deletes a table, so a read-after-remove fails by name.
    const rm = await phase2File();
    await draw(rm.api, contract, { types: ['dimension'] });
    for (const v of rm.vars) { if (/^density\//.test(v.name)) v.name = v.name.replace(/^density\//, 'dense/'); if (/^metrics\/step\//.test(v.name)) v.name = v.name.replace('/step/', '/rung/'); }
    let threw = '';
    let rr: StyleGuideResult | null = null;
    try { rr = await draw(rm.api, contract, { types: ['dimension'] }); } catch (e) { threw = String(e); }
    ok(!threw && JSON.stringify([...(rr?.deleted ?? [])].sort()) === JSON.stringify(['Style guide — Density', 'Style guide — Step']),
      `6a: one run deletes two superseded, unedited tables and names both, reading nothing off either after it is removed (${threw || JSON.stringify(rr?.deleted)})`);
  }

  console.log('6. rerun');
  {
    const text = tableFrame(f.sem, 'Text')!;
    const wrapId = text.id;
    const tpri = f.vars.find((v) => v.name === 'pds3/color/text/primary')!;
    tpri.valuesByMode['color:0'] = { type: 'VARIABLE_ALIAS', id: idOf('pds3/core/palette/neutral/400') };
    const gone = f.vars.findIndex((v) => v.name === 'pds3/color/text/tertiary');
    f.vars.splice(gone, 1);
    f.vars.push({ id: 'VariableID:color:new', name: 'pds3/color/text/quaternary', variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description: 'New', valuesByMode: { 'color:0': { r: 0, g: 0, b: 0, a: 1 }, 'color:1': { r: 1, g: 1, b: 1, a: 1 }, 'color:2': { r: 0, g: 0, b: 0, a: 1 }, 'color:3': { r: 1, g: 1, b: 1, a: 1 } } });
    for (let i = f.vars.length - 1; i >= 0; i--) if (f.vars[i].name.startsWith('pds3/color/scrim/')) f.vars.splice(i, 1);
    const again = await draw(f.api, contract);
    ok(tablesOn(f.sem).length === 10, '6: rerun: 10 tables on the semantic page — none duplicated, the emptied Scrim deleted');
    ok(tableFrame(f.sem, 'Text')?.id === wrapId, '6: the Text table is updated in place');
    ok(tableFrame(f.sem, 'Text')!.children.filter((c) => c.name === 'Table').length === 1 && tableFrame(f.sem, 'Text')!.children.filter((c) => c.mainComponent).length === 1, '6: one grid and one header after the rerun');
    const t = again.tables.find((x) => x.title === 'Text') as Extract<TableOutcome, { status: 'updated' }>;
    ok(t?.status === 'updated', '6: reported as updated');
    ok(JSON.stringify(t?.diff) === JSON.stringify({ added: ['pds3/color/text/quaternary'], removed: ['pds3/color/text/tertiary'], changed: ['pds3/color/text/primary'], renamed: [] }), '6: reports text/quaternary added, text/tertiary removed, text/primary changed');
    const g = gridOf(tableFrame(f.sem, 'Text')!);
    ok(textIn(cellAt(g, rowOf(g, 'primary'), 3)) === '3.27:1 — below the 7:1 floor\non background/primary', '6: the refreshed contrast names the ratio and the floor it misses');
    ok(JSON.stringify(again.stale) === JSON.stringify(['Style guide — Scrim']), '6: the emptied Scrim table is superseded: stale');
    ok(!tableFrame(f.sem, 'Scrim') && JSON.stringify(again.deleted) === JSON.stringify(['Style guide — Scrim']) && again.kept.length === 0, '6: an unedited stale table is deleted');
    const s = styleGuideSummary(again);
    ok(s.summary.includes('Text: 1 added, 1 removed, 1 changed'), '6: the summary names the changes');
    ok(s.summary.includes('1 table the generator no longer draws was deleted, unedited: Style guide — Scrim'), '6: the summary names the deleted table');
  }

  console.log('7. skips');
  {
    const fc = page(FC);
    fc.appendChild(headerSet());
    const prim = page(PRIM);
    const { cols: c2, vars: v2 } = prism3Variables();
    const s = makeShim([prim, fc], c2, v2);
    await ensureStyleGuideCells(s.api, fc);
    const r = await draw(s.api, contract);
    ok(r.tables.filter((t) => t.status === 'skipped' && t.reason === 'no-page').length === 11, '7: no Semantic tokens page — 11 tables skipped');
    ok(!s.pages.some((p) => p.name === SEM), '7: the missing page is not created');
    ok(r.tables.filter((t) => t.status === 'created').length === 11, '7: the primitive tables are still drawn');
    ok(styleGuideSummary(r).summary.includes('11 tables skipped — this file has no ↳ Semantic tokens page'), '7: the skip is named in the summary');
    const partial = styleGuideSummary(r);
    ok(!partial.ok && partial.headline === '⚠ 11 drawn, 11 skipped', `7: a partial run is not a pass — headline "${partial.headline}"`);

    const bare = makeShim([page(PRIM), page(SEM)], c2, v2);
    const r2 = await draw(bare.api, contract);
    ok(r2.tables.length === 22 && r2.tables.every((t) => t.status === 'skipped' && t.reason === 'no-cells'), '7: no cell sets — every table skipped');
    const s2 = styleGuideSummary(r2);
    ok(!s2.ok && s2.headline === '✗ style guide skipped' && s2.summary.includes('Set up file adds them'), '7: the verdict says Set up file adds the cells');

    const nohdr = page(FC);
    const s3 = makeShim([page(PRIM), page(SEM), nohdr], c2, v2);
    await ensureStyleGuideCells(s3.api, nohdr);
    const r3 = await draw(s3.api, contract, { collections: ['core'] });
    ok(r3.tables.every((t) => t.status === 'created') && r3.misses.some((m) => m.startsWith('no _Section-header set')), '7: no header set — tables drawn, the missing header named');

    s3.fontFails.add('Inter Regular');
    const s4 = makeShim([page(PRIM), page(SEM), nohdr], c2, v2);
    s4.fontFails.add('Inter Regular');
    const r4 = await draw(s4.api, contract, { collections: ['core'] });
    ok(r4.misses.includes('Inter Regular unavailable'), '7: an unloadable font is named, not thrown');
  }

  console.log('8. keys, headers, the rerun report and fonts');
  {
    ok(byTitle('primitive', 'Legacy')!.key === 'color|VariableCollectionId:legacy|legacy/ramp' && byTitle('semantic', 'Text')!.key === 'color|VariableCollectionId:color|pds3/color/text', '8: a table is keyed by collection ID and the group\'s full path');
    ok(byTitle('semantic', 'Text')!.description === '23 text roles in color, per mode, each measured against the ground it is contracted for', '8: Text header: every role measured');
    ok(byTitle('semantic', 'Scrim')!.description === '1 scrim role in color, per mode', '8: Scrim header: no role is measured, so it does not say so');
    ok(byTitle('primitive', 'Legacy')!.description === '4 primitive colors in legacy', '8: Legacy header: nothing references it, so it does not say so');
    ok(byTitle('primitive', 'Primary')!.description === '20 primitive colors in core, each referenced by a semantic role', '8: Primary header counts its referenced steps');
    ok(byTitle('primitive', 'Accent')!.description === '20 primitive colors in core', '8: Accent header: no role references it, so it does not say so');
    ok(byTitle('semantic', 'Foreground')!.description === '13 foreground roles in color, per mode, 5 measured against the ground they are contracted for', '8: Foreground header counts its measured roles');

    const hc = { ...catalog, collections: catalog.collections.map((c) => c.name === 'color' ? { ...c, modes: [...c.modes, { modeId: 'color:9', name: 'L (HC)' }] } : c) };
    ok(planStyleGuide(hc, contract).notes.includes('The L (HC) mode in color matches no mode the brand contracts (light, dark, hc-light, hc-dark), so its contrast reads "—"'), '8: a file mode the engine does not contract is named');
    ok(!plan.notes.some((n) => n.includes('matches no mode')), '8: the four prism3 modes all match');

    const g = await fullFile();
    await draw(g.api, contract);
    const legacyKey = 'color|VariableCollectionId:legacy|legacy/ramp';
    g.vars.push({ id: 'VariableID:legacy:9', name: 'legacy/other/1', variableCollectionId: 'VariableCollectionId:legacy', resolvedType: 'COLOR', description: '', valuesByMode: { 'legacy:0': { r: 1, g: 0, b: 0, a: 1 } } });
    const sib = await draw(g.api, contract);
    ok(tablesOn(g.prim).filter((n) => n.pluginData['prism3-style-guide'] === legacyKey).length === 1 && tablesOn(g.prim).length === 12, '8: a sibling group added to legacy: the ramp table is kept, one new table, no duplicate');
    ok(sib.tables.find((t) => t.key === legacyKey)?.status === 'updated' && sib.stale.length === 0, '8: the ramp table is updated in place, nothing stale');
    g.cols[2].name = 'legacy renamed';
    const ren = await draw(g.api, contract);
    ok(tablesOn(g.prim).length === 12 && ren.tables.filter((t) => t.status === 'created').length === 0, '8: a renamed collection keeps its tables');

    g.vars.find((v) => v.name === 'pds3/color/text/primary')!.name = 'pds3/color/text/strong';
    const rn = await draw(g.api, contract);
    const td = (rn.tables.find((t) => t.title === 'Text') as Extract<TableOutcome, { status: 'updated' }>).diff;
    ok(JSON.stringify(td) === JSON.stringify({ added: [], removed: [], changed: [], renamed: ['pds3/color/text/primary → pds3/color/text/strong'] }), '8: a renamed variable is a rename, not an add and a remove');
    const rgba = await draw(g.api, contract, { valueFormat: 'rgba' });
    ok(rgba.tables.every((t) => t.status === 'updated' && !t.diff.added.length && !t.diff.removed.length && !t.diff.changed.length && !t.diff.renamed.length), '8: switching Hex to RGBA changes no row');

    const dim = await draw(g.api, contract, { types: ['dimension'] });
    ok(dim.tables.length === 0 && dim.stale.length === 0, '8: a dimension-only run reports no color table stale');
    const one = await draw(g.api, contract, { collections: ['core'] });
    ok(one.stale.length === 0 && one.tables.length === 10, '8: a one-collection run reports no other collection\'s table stale');

    // Mixed fonts: every text node in the cells set in two fonts, read as `figma.mixed`.
    const MIXED = Symbol('mixed');
    const m = await fullFile();
    const cells = setsNamed(m.pages, '_style-guide-text-cells')[0];
    const mix = (segments: { fontName: unknown }[]): void => { for (const t of cells.findAll((k) => k.type === 'TEXT')) { t.fontName = MIXED; t.segments = segments; } };
    const legacyCell = (sh: Shim & { prim: N }): string => textIn(cellAt(gridOf(tableFrame(sh.prim, 'Legacy')!), 1, 0));
    mix([{ fontName: { family: 'Inter', style: 'Regular' } }, { fontName: { family: 'Inter', style: 'Bold' } }]);
    const mr = await draw(m.api, contract, { collections: ['legacy'] });
    ok(legacyCell(m) === '5' && mr.misses.length === 0, '8: a mixed-font cell loads every segment\'s font and is written');
    m.fontFails.add('Inter Bold');
    const mb = await draw(m.api, contract, { collections: ['legacy'] });
    ok(mb.misses.includes('Inter Bold unavailable'), '8: a mixed-font cell with an unloadable segment names the font');
    mix([]);
    m.fontFails.clear();
    const mu = await draw(m.api, contract, { collections: ['legacy'] });
    ok(mu.misses.includes('Text: its fonts could not be read, so the cell keeps its sample text') && legacyCell(m) === 'Abc 123', '8: a cell whose fonts cannot be read is named, not left silently at "Abc 123"');
  }

  console.log('9. two roots in one collection, unbound swatches, step order');
  {
    const two = twoRootVariables();
    const p2 = planStyleGuide({ collections: two.cols, variables: two.vars }, contract);
    const fams = ['Background', 'Foreground', 'Text', 'Icon', 'Interactive', 'Disabled', 'Border', 'Scrim', 'Veil', 'Field', 'Inverse'];
    ok(JSON.stringify(p2.tables.filter((t) => t.kind === 'semantic').map((t) => t.title)) === JSON.stringify([...fams.map((x) => `${x} — nbds`), ...fams.map((x) => `${x} — pds3`)]), '9: a two-root color collection groups by family within each root, the root named in the title');
    const pal = ['Primary', 'Neutral', 'Accent', 'Success', 'Warning', 'Info', 'Danger', 'Black alpha', 'White alpha'];
    ok(JSON.stringify(p2.tables.filter((t) => t.kind === 'primitive').map((t) => t.title)) === JSON.stringify(['Core — nbds base', ...pal.map((x) => `${x} — nbds`), 'Core — pds3 base', ...pal.map((x) => `${x} — pds3`), 'Legacy']), '9: the two Primary palettes are told apart by their root; a one-root collection names none');
    const t9 = (title: string): SgTable => p2.tables.find((t) => t.title === title)!;
    ok(t9('Text — nbds').key === 'color|VariableCollectionId:color|nbds/color/text' && t9('Primary — nbds').key === 'color|VariableCollectionId:core|nbds/core/palette/primary', '9: keys stay collection ID + full path');
    ok(t9('Text — nbds').rows[0].token === 'primary' && t9('Primary — nbds').rows[0].token === '025', '9: rows are named inside their group — "primary", "025"');
    const nbBrand = t9('Foreground — nbds').rows.find((r) => r.token === 'brand')!;
    ok(contrastText(nbBrand.cells[0].contrast) === '6.44:1 — clears the 3:1 floor\non nbds/core/palette/neutral/050', "9: an nbds role measures against nbds's own palette step");

    const f9 = await fullFile(two);
    const id9 = (name: string): string => f9.vars.find((v) => v.name === name)!.id;
    const r9 = await draw(f9.api, contract);
    ok(tablesOn(f9.sem).length === 22 && tablesOn(f9.prim).length === 21, '9: 22 semantic and 21 primitive tables');
    const ground = (root: string): string | undefined => { const g = gridOf(tableFrame(f9.sem, `Text — ${root}`)!); return boundId(cellAt(g, rowOf(g, 'primary'), 1)?.fills); };
    ok(ground('nbds') === id9('nbds/color/background/primary') && ground('pds3') === id9('pds3/color/background/primary'), "9: each root's text is drawn on its own root's background");
    ok(styleGuideSummary(r9).headline === '✓ style guide: 43 tables', `9: headline "✓ style guide: 43 tables" (got "${styleGuideSummary(r9).headline}")`);

    // A RERUN over the live run's tables: one per root for a semantic collection, keyed at the root, and primitive
    // tables titled without their root. Planted as that build left them.
    const old = new N('FRAME'); old.name = 'Style guide — Nbds'; old.pluginData['prism3-style-guide'] = 'color|VariableCollectionId:color|nbds'; f9.sem.appendChild(old);
    const prim = tableFrame(f9.prim, 'Primary — nbds')!;
    const pTitle = prim.children[0].findOne((k) => k.name === 'Title')!;
    prim.name = 'Style guide — Primary'; pTitle.characters = 'Primary';
    delete prim.pluginData['prism3-style-guide-title']; delete prim.pluginData['prism3-style-guide-description'];
    const neu = tableFrame(f9.prim, 'Neutral — nbds')!;
    const nTitle = neu.children[0].findOne((k) => k.name === 'Title')!;
    nTitle.characters = 'Grays';
    const again = await draw(f9.api, contract);
    ok(tablesOn(f9.sem).length === 23 && tablesOn(f9.prim).length === 21 && again.tables.every((t) => t.status === 'updated'), '9: rerun: every table updated in place, no duplicates');
    ok(JSON.stringify(again.replaced) === JSON.stringify(['Style guide — Nbds']) && again.stale.length === 0, '9: the per-root table is reported as replaced, not stale');
    ok(old.parent === f9.sem && JSON.stringify(again.kept) === JSON.stringify([{ name: 'Style guide — Nbds', reason: 'unrecorded' }]), '9: the per-root table has no fingerprint, so it is left in place');
    ok(styleGuideSummary(again).summary.includes('1 table the generator no longer draws was left in place — drawn before edits were tracked, so the generator never deletes it; delete it by hand if no longer needed: Style guide — Nbds'), '9: the summary names the kept table and why it is kept');
    ok(prim.name === 'Style guide — Primary — nbds' && pTitle.characters === 'Primary — nbds', `9: an earlier run's title is rewritten to name its root (${prim.name} / ${pTitle.characters})`);
    ok(nTitle.characters === 'Grays' && neu.name === 'Style guide — Neutral — nbds', '9: a title the designer typed is kept');

    // A swatch member with layers and no paint anywhere: nothing binds, and the verdict says how many — 75
    // prism3 roles draw the plain swatch, in four modes: 300. (74 and 296 on main; the #1743 merge adds
    // `interactive.primary.subtle-fill.selected`, one plain-swatch role, and 267 semantic rows become 268.)
    const fc = page(FC), sgc = page('Style Guide Components'), sem = page(SEM);
    const sw = ownerSet('_style-guide-swatches', ['type=Default', 'type=Text'], true);
    const def = sw.children[0]; def.fills = []; const grp = new N('GROUP'); grp.name = 'Group'; def.appendChild(grp);
    sgc.appendChild(sw); sgc.appendChild(ownerSet('_style-guide-text-cells', ['color=dark, textAlign=left, type=header, padding=default', 'color=white, textAlign=left, type=default, padding=default'], false));
    const u = await draw(makeShim([fc, sgc, sem], prism3Variables().cols, prism3Variables().vars).api, contract, { collections: ['color'] });
    const us = styleGuideSummary(u);
    ok(u.unbound === 300 && !us.ok && us.headline === '⚠ 300 swatches unbound', `9: unbound swatches are not a pass — headline "${us.headline}"`);
    ok(us.summary.includes('300 swatches in type=Default have no layer that takes a fill'), '9: the summary counts them per variant');

    // Named values first in the file's order, then the numeric steps ascending.
    const named = { collections: cols, variables: [...vars, ...['white', 'black'].map((n, i) => ({ id: `VariableID:legacy:n${i}`, name: `legacy/ramp/${n}`, variableCollectionId: 'VariableCollectionId:legacy', resolvedType: 'COLOR', description: '', valuesByMode: { 'legacy:0': { r: 1, g: 1, b: 1, a: 1 } } }))] };
    ok(JSON.stringify(planStyleGuide(named, contract).tables.find((t) => t.title === 'Legacy')!.rows.map((r) => r.token)) === JSON.stringify(['white', 'black', '5', '50', '100', '900']), '9: named values lead, in file order, then steps ascending');
  }

  console.log('10. a rerun re-flows the generator\'s tables into a row (owner decision 16)');
  {
    const r = await fullFile();
    await draw(r.api, contract, { collections: ['color'] });
    const order = (): N[] => r.sem.children.filter((n) => !!n.pluginData['prism3-style-guide']).sort((a, b) => a.x - b.x);
    const gaps = (ns: N[]): number[] => ns.slice(1).map((n, i) => n.x - (ns[i].x + ns[i].width));
    ok(order().length === 11 && gaps(order()).every((d) => d === 160) && order().every((n) => n.y === order()[0].y),
      `10: a first run lays its tables out left to right, top-aligned, 160px apart (${gaps(order()).join(', ')}; y ${[...new Set(order().map((n) => n.y))].join(', ')})`);
    const xs = order().slice(0, 3).map((n) => `${n.name.replace('Style guide — ', '')} ${n.x}`);
    ok(JSON.stringify(xs) === JSON.stringify(XS_THREE), `10: the first three tables sit at literal x positions (${xs.join(', ')})`);
    const text = tableFrame(r.sem, 'Text')!, icon = tableFrame(r.sem, 'Icon')!, border = tableFrame(r.sem, 'Border')!;
    border.y += 5000;
    const [bx, by, iconX, iconY, textW] = [border.x, border.y, icon.x, icon.y, text.width];
    const grow = (n: number, tag: string, description: string): void => { for (let i = 0; i < n; i++) r.vars.push({ id: `VariableID:color:${tag}${i}`, name: `pds3/color/text/${tag}-${i}`, variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description, valuesByMode: { 'color:0': { r: 0, g: 0, b: 0, a: 1 }, 'color:1': { r: 1, g: 1, b: 1, a: 1 }, 'color:2': { r: 0, g: 0, b: 0, a: 1 }, 'color:3': { r: 1, g: 1, b: 1, a: 1 } } }); };
    // A new row whose description is 120 characters, 840px at the shim's 7px: the description column widens to
    // 840 + 16 + 16 = 872, and so does the table.
    grow(1, 'wide', 'W'.repeat(120));
    await draw(r.api, contract, { collections: ['color'] });
    const widened = text.width - textW;
    ok(widened === WIDEN_TEXT && icon.x - iconX === widened && icon.y === iconY, `10: a table that widens by ${widened}px pushes the next table right by exactly that, its y unchanged (Icon +${icon.x - iconX}, y ${icon.y - iconY})`);
    ok(border.x === bx && border.y === by, '10: a table a designer moved stays where they put it');
    ok(gaps(order().filter((n) => n !== border)).every((d) => d === 160), `10: the rest stay 160px apart (${gaps(order().filter((n) => n !== border)).join(', ')})`);
    // Tables drawn before the position was recorded: re-flowed while they keep the row's y.
    for (const n of order()) delete n.pluginData['prism3-style-guide-at'];
    const field = tableFrame(r.sem, 'Field')!;
    field.y += 2000;
    const [fx, fy, iconX2] = [field.x, field.y, icon.x];
    grow(1, 'wider', 'W'.repeat(130));
    await draw(r.api, contract, { collections: ['color'] });
    ok(icon.x - iconX2 === 70, `10: tables from before the position record are re-flowed too: Icon +70, ten more characters in Text's description column (got +${icon.x - iconX2})`);
    ok(field.x === fx && field.y === fy, "10: a table from before the record, off the row's y, is taken as moved and left alone");

    // A host that does not keep the grid's HUG tracks is named, not drawn silently wrong.
    const q = await fullFile();
    const mk = q.api.createFrame.bind(q.api);
    (q.api as unknown as { createFrame: () => N }).createFrame = () => {
      const n = mk() as unknown as N;
      let sizes: { type: string; value?: number }[] = [];
      Object.defineProperty(n, 'gridColumnSizes', { get: () => sizes, set: (v: { type: string }[]) => { if (v.every((x) => x.type === 'FLEX')) sizes = v; } });
      return n;
    };
    const qr = await draw(q.api, contract, { collections: ['legacy'] });
    ok(qr.misses.includes('Legacy: the grid did not keep its hugging tracks, so a column may not fit its widest cell'), '10: a grid that did not keep its hugging tracks is named');
    // The same, for the ROW tracks alone: the columns kept, the rows not.
    const qrow = await fullFile();
    const mkRow = qrow.api.createFrame.bind(qrow.api);
    (qrow.api as unknown as { createFrame: () => N }).createFrame = () => {
      const n = mkRow() as unknown as N;
      let sizes: { type: string; value?: number }[] = [];
      Object.defineProperty(n, 'gridRowSizes', { get: () => sizes, set: (v: { type: string }[]) => { if (v.every((x) => x.type === 'FLEX')) sizes = v; } });
      return n;
    };
    const qrr = await draw(qrow.api, contract, { collections: ['legacy'] });
    ok(qrr.misses.includes('Legacy: the grid did not keep its hugging tracks, so a column may not fit its widest cell'), `10: a grid that did not keep its hugging ROW tracks is named (${qrr.misses.join('; ') || 'no miss'})`);

    // A header the host will not size: it refuses FILL, and `resize` leaves it at its component's 2,517px. The wrapper
    // then hugs the header, not the grid, and the verdict names the table and both widths.
    const hq = await fullFile();
    const med = setsNamed(hq.pages, '_Section-header')[0].children.find((c) => c.name === 'Size=Medium')!;
    const mkHeader = med.createInstance.bind(med);
    med.createInstance = (): N => {
      const i = mkHeader();
      Object.defineProperty(i, 'layoutSizingHorizontal', { get: () => 'FIXED', set: (v: string) => { if (v !== 'FIXED') throw new Error(`${v} refused`); } });
      i.resize = () => undefined;
      return i;
    };
    const hr = await draw(hq.api, contract, { collections: ['legacy'] });
    const legGrid = gridOf(tableFrame(hq.prim, 'Legacy')!);
    ok(hr.misses.includes(`Legacy: the header did not take the table's width, so the table is 2517px wide around a ${Math.round(legGrid.width)}px grid`) && legGrid.width < 2517,
      `10: a header the host will not size to its table is named, with the table's width and its grid's (${hr.misses.filter((m) => m.includes('header')).join('; ') || 'no miss'})`);
  }

  console.log('11. superseded tables: deleted when unedited, kept when a designer touched them');
  {
    // The legacy ramp split into two sub-palettes, same variables: its one table is now drawn as Dark and Light, so
    // `legacy/ramp` is an ancestor of both planned keys — REPLACED.
    const splitLegacy = (sh: Shim): void => {
      for (const v of sh.vars) if (v.name.startsWith('legacy/ramp/')) { const step = v.name.split('/').pop()!; v.name = `legacy/ramp/${Number(step) < 100 ? 'light' : 'dark'}/${step}`; }
    };
    // Every legacy variable deleted: its table matches no group — STALE. Run with `core` in scope too, so the run
    // still draws something and the empty-plan guard does not apply.
    const dropLegacy = (sh: Shim): void => { for (let i = sh.vars.length - 1; i >= 0; i--) if (sh.vars[i].name.startsWith('legacy/')) sh.vars.splice(i, 1); };
    const LEG = { collections: ['legacy'] };
    const WITH_CORE = { collections: ['core', 'legacy'] };
    const LEGACY = 'Style guide — Legacy';
    const names = (p: N): string[] => tablesOn(p).map((n) => n.name);
    const keptAs = (r: StyleGuideResult, reason: string): boolean => r.deleted.length === 0 && JSON.stringify(r.kept) === JSON.stringify([{ name: LEGACY, reason }]);
    const summaryOf = (r: StyleGuideResult): string => styleGuideSummary(r).summary;
    /** A file with the Legacy table drawn, `edit` applied to it by hand, then the ramp split so the table is replaced. */
    const afterEdit = async (edit: (t: N, sh: Shim & { prim: N }) => void): Promise<{ r: StyleGuideResult; t: N; sh: Shim & { prim: N }; at: { x: number; y: number } }> => {
      const sh = await fullFile();
      await draw(sh.api, contract, LEG);
      const t = tableFrame(sh.prim, 'Legacy')!;
      edit(t, sh);
      splitLegacy(sh);
      // Where the table stood, read before the run that may delete it: a removed node cannot be read (#1795).
      const at = { x: t.x, y: t.y };
      return { r: await draw(sh.api, contract, LEG), t, sh, at };
    };
    const valueCell = (t: N): N => cellAt(gridOf(t), 1, 2)!;
    const valueText = (t: N): N => valueCell(t).findOne((k) => k.type === 'TEXT')!;
    // The specimen cell. A palette row has no ground (decision 13), so its cell IS the swatch; section 5 asserts that,
    // and this reads a ground's swatch too, so these arms still run (and still mean an edit) if it ever regresses.
    const ground = (t: N): N => cellAt(gridOf(t), 1, 1)!;
    const swatch = (t: N): N => { const c = ground(t); return c.name === 'Ground' ? c.children[0] : c; };

    // THE CONTROL: the same run with nothing touched deletes the table, so every "kept" below is the edit's doing.
    const a = await afterEdit(() => {});
    const legA = a.t;
    ok(JSON.stringify(a.r.replaced) === JSON.stringify([LEGACY]) && JSON.stringify(a.r.deleted) === JSON.stringify([LEGACY]) && legA.removed
      && JSON.stringify(names(a.sh.prim)) === JSON.stringify(['Style guide — Dark', 'Style guide — Light']), `11: an unedited replaced table is deleted: Legacy, now drawn as Dark and Light (${names(a.sh.prim).join(', ')})`);
    ok(a.sh.prim.findAll((k) => k.pluginData['prism3-style-guide-part'] === 'header').length === 2, "11: the deleted table's header and cells go with it");
    // Dark and Light were drawn after Legacy in its row; with Legacy gone, the first of them takes its place.
    const dark = tableFrame(a.sh.prim, 'Dark')!;
    ok(dark.x === a.at.x && dark.y === a.at.y && tableFrame(a.sh.prim, 'Light')!.x === dark.x + dark.width + 160 && tableFrame(a.sh.prim, 'Light')!.y === dark.y, `11: the row closes over the deleted table: Dark starts where Legacy stood, Light 160px to its right (${dark.x},${dark.y} vs ${a.at.x},${a.at.y})`);
    ok(summaryOf(a.r).includes('1 table the generator no longer draws was deleted, unedited: Style guide — Legacy'), '11: the summary names the deleted table');
    ok(styleGuideSummary(a.r).headline === '✓ 2 tables, 1 deleted', `11: the headline counts the deletion: "✓ 2 tables, 1 deleted" (got "${styleGuideSummary(a.r).headline}")`);

    // A VARIABLE'S VALUE MOVING is not an edit. The host repaints a bound paint's color, and carries a color
    // variable's alpha in the paint's opacity; both are replayed onto the drawn nodes here, as the host would.
    let repainted = 0;
    const e1 = await afterEdit((t, sh) => {
      const v = sh.vars.find((x) => x.name === 'legacy/ramp/100')!;
      const next = { r: 0.2, g: 0.4, b: 0.6, a: 0.4 };
      v.valuesByMode['legacy:0'] = next;
      const repaint = (ps: unknown): unknown => (Array.isArray(ps) ? ps.map((p) => {
        if ((p as { boundVariables?: { color?: { id?: string } } }).boundVariables?.color?.id !== v.id) return p;
        repainted++;
        return { ...(p as object), color: { r: next.r, g: next.g, b: next.b }, opacity: next.a };
      }) : ps);
      for (const n of [t, ...t.findAll(() => true)]) { n.fills = repaint(n.fills); n.strokes = repaint(n.strokes); }
    });
    ok(repainted > 0 && JSON.stringify(e1.r.deleted) === JSON.stringify([LEGACY]), `11: a table whose bound variable's value (and alpha) changed between runs is still deleted (${repainted} paint repainted)`);

    // EACH KIND OF HAND EDIT keeps the table: the same size throughout unless size is the edit.
    const edits: [string, (t: N, sh: Shim & { prim: N }) => void][] = [
      ['one text cell retyped (#808080 → #7F7F7F, the same length)', (t) => { const x = valueText(t); if (x.characters !== '#808080') throw new Error(`value cell reads ${x.characters}`); x.characters = '#7F7F7F'; }],
      ["a cell's fill repainted", (t) => { ground(t).fills = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 0, b: 0 } }]; }],
      ['a stroke added to a cell', (t) => { valueCell(t).strokes = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0, g: 0, b: 0 } }]; }],
      ['a cell widened by 40px, nothing else', (t) => { const c = valueCell(t); c.resize(c.w + 40, c.h); }],
      ["a swatch's pinned mode changed", (t) => { swatch(t).explicitVariableModes['VariableCollectionId:legacy'] = 'legacy:9'; }],
      ['8px corners on a cell', (t) => { const g = ground(t); g.cornerRadius = 8; g.topLeftRadius = 8; g.topRightRadius = 8; g.bottomLeftRadius = 8; g.bottomRightRadius = 8; }],
      ['a drop shadow on the table', (t) => { t.effects = [{ type: 'DROP_SHADOW', visible: true, blendMode: 'NORMAL', color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 8, spread: 0 }]; }],
      ['a stroke weight and alignment changed', (t) => { const g = ground(t); g.strokeWeight = 2; g.strokeAlign = 'OUTSIDE'; }],
      ["a cell's layer opacity and blend mode changed", (t) => { const c = valueCell(t); c.opacity = 0.5; c.blendMode = 'MULTIPLY'; }],
      ['one cell made bold', (t) => { valueText(t).fontName = { family: 'Inter', style: 'Bold' }; }],
      ['a fill style applied to a cell', (t) => { ground(t).fillStyleId = 'S:brand-surface,1:2'; }],
      ["a cell's auto-layout padding changed", (t) => { const c = valueCell(t); c.paddingLeft = Number(c.paddingLeft ?? 0) + 8; }],
      ["a swatch swapped to another component", (t) => { const sw = swatch(t); const other = sw.mainComponent!.parent!.children.find((m) => m !== sw.mainComponent)!; sw.mainComponent = other; }],
      ["a header's component property toggled", (t) => { const h = t.children[0]; h.componentProperties!['Description#1:0'].value = false; }],
      // The Specimen inside a swatch: its parent is not auto layout, so hiding it moves no size the fingerprint reads.
      ['a swatch layer hidden, nothing else', (t) => { const sp = swatch(t).findOne((k) => k.name === 'Specimen')!; if (swatch(t).layoutMode) throw new Error('swatch is auto layout'); sp.visible = false; }],
      ['a cell renamed in the layers panel', (t) => { const c = valueCell(t); c.name = `${c.name} (edited)`; }],
      ["the reviewer's example: a shadow, 8px corners and one cell made bold", (t) => { t.effects = [{ type: 'DROP_SHADOW', visible: true, color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 4 }, radius: 8 }]; t.cornerRadius = 8; valueText(t).fontName = { family: 'Inter', style: 'Bold' }; }],
    ];
    for (const [what, edit] of edits) {
      const { r, t } = await afterEdit(edit);
      ok(keptAs(r, 'edited') && t.parent !== null, `11: a replaced table with ${what} by hand is kept, reported as edited`);
    }
    const b = await afterEdit((t) => { valueText(t).characters = '#7F7F7F'; });
    ok(summaryOf(b.r).includes('1 table the generator no longer draws was left in place — edited: Style guide — Legacy'), '11: the summary names the edited table and its reason');

    // MOVED: across, down, into a designer's frame, onto another page at the same x and y.
    const across = await afterEdit((t) => { t.x += 400; });
    ok(keptAs(across.r, 'moved'), '11: a table moved across is kept, reported as moved');
    ok(summaryOf(across.r).includes('1 table the generator no longer draws was left in place — moved: Style guide — Legacy'), '11: the summary says it was moved, not edited');
    const down = await afterEdit((t) => { t.y += 300; });
    ok(keptAs(down.r, 'moved'), '11: a table moved straight down is kept, reported as moved');
    const nested = await afterEdit((t, sh) => {
      const sel = new N('FRAME'); sel.name = 'Frame selection'; sh.prim.appendChild(sel);
      const [x, y] = [t.x, t.y];
      sel.appendChild(t); t.x = x; t.y = y;
    });
    ok(keptAs(nested.r, 'moved') && nested.t.parent?.name === 'Frame selection', "11: a table put inside a designer's frame, at the same x and y, is kept");
    const archived = await afterEdit((t, sh) => { const arc = page('Archive'); sh.pages.push(arc); arc.appendChild(t); });
    ok(keptAs(archived.r, 'moved') && archived.t.parent?.name === 'Archive', '11: a table moved to another page at the same x and y is kept');

    // STALE, with no fingerprint: a table from before this build.
    const d = await fullFile();
    await draw(d.api, contract, WITH_CORE);
    const legD = tableFrame(d.prim, 'Legacy')!;
    delete legD.pluginData['prism3-style-guide-print']; delete legD.pluginData['prism3-style-guide-mark'];
    dropLegacy(d);
    const rd = await draw(d.api, contract, WITH_CORE);
    ok(legD.parent === d.prim && JSON.stringify(rd.stale) === JSON.stringify([LEGACY]) && keptAs(rd, 'unrecorded'), '11: a table with no fingerprint is kept');
    ok(summaryOf(rd).includes('1 table the generator no longer draws was left in place — drawn before edits were tracked, so the generator never deletes it; delete it by hand if no longer needed: Style guide — Legacy'), '11: the summary says a table from before the fingerprint is never deleted, and to delete it by hand');

    // STALE and unedited, while the run still draws core: deleted.
    const st = await fullFile();
    await draw(st.api, contract, WITH_CORE);
    dropLegacy(st);
    const rst = await draw(st.api, contract, WITH_CORE);
    ok(JSON.stringify(rst.stale) === JSON.stringify([LEGACY]) && JSON.stringify(rst.deleted) === JSON.stringify([LEGACY]) && !tableFrame(st.prim, 'Legacy'), '11: an unedited stale table is deleted while the run still draws core');

    // A frame the generator did not make, named like its table, and a DUPLICATE of the table — which carries every
    // plugin-data key, sits where the original does and holds what it holds, but is not the frame the generator wrote.
    const e = await fullFile();
    await draw(e.api, contract, WITH_CORE);
    const legE = tableFrame(e.prim, 'Legacy')!;
    const foreign = new N('FRAME'); foreign.name = LEGACY; foreign.x = 3000; foreign.y = 0; e.prim.appendChild(foreign);
    const dup = (src: N): N => {
      const n = new N(src.type);
      for (const [k, v] of Object.entries(src)) {
        if (k === 'id' || k === 'parent' || k === 'children' || k === 'mainComponent' || k === 'byCol' || k === 'byRow') continue;
        (n as Record<string, unknown>)[k] = v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
      }
      n.mainComponent = src.mainComponent;
      for (const k of src.children) {
        if (k.gridRow !== undefined && k.gridCol !== undefined) n.appendChildAt(dup(k), k.gridRow, k.gridCol);
        else n.appendChild(dup(k));
      }
      return n;
    };
    const copy = dup(legE);
    e.prim.appendChild(copy);
    ok(copy.x === legE.x && copy.y === legE.y && copy.pluginData['prism3-style-guide-print'] === legE.pluginData['prism3-style-guide-print'], '11: the copy sits on the original and carries its fingerprint');
    dropLegacy(e);
    const re = await draw(e.api, contract, WITH_CORE);
    ok(foreign.parent === e.prim && foreign.x === 3000 && foreign.y === 0 && Object.keys(foreign.pluginData).length === 0, '11: a frame the generator did not make, named like its table, is never touched');
    ok(legE.removed && copy.parent === e.prim && JSON.stringify(re.deleted) === JSON.stringify([LEGACY]) && JSON.stringify(re.kept) === JSON.stringify([{ name: LEGACY, reason: 'copied' }]), '11: a duplicate of a generator table is never deleted; the table it copies is');
    ok(summaryOf(re).includes('1 table the generator no longer draws was left in place — a copy: Style guide — Legacy'), '11: the summary says it is a copy');

    // An unedited table the host will not remove is named as such, not as edited.
    const nr = await afterEdit((t) => { (t as unknown as { remove: undefined }).remove = undefined; });
    ok(keptAs(nr.r, 'not-removable') && summaryOf(nr.r).includes('left in place — could not be deleted: Style guide — Legacy'), '11: an unedited table that cannot be removed is reported as "could not be deleted"');

    // THE RUN'S OWN GUARDS. Every variable deleted, collections kept: the run draws nothing, so nothing is deleted.
    const g0 = await fullFile();
    await draw(g0.api, contract);
    g0.vars.splice(0);
    const r0 = await draw(g0.api, contract);
    ok(r0.deleted.length === 0 && r0.kept.length === 22 && r0.kept.every((k) => k.reason === 'nothing-drawn') && tablesOn(g0.prim).length + tablesOn(g0.sem).length === 22, `11: a run that draws nothing deletes nothing: 22 tables kept (${r0.deleted.length} deleted)`);
    ok(summaryOf(r0).includes('22 tables the generator no longer draws were left in place — nothing was drawn this run: ') && summaryOf(r0).includes(' and 19 more'), '11: the summary gives the reason and caps the list at three names');
    // The variables moved to a library: no local collection, no local variable. Every table's collection is gone.
    const lib = await fullFile();
    await draw(lib.api, contract);
    lib.cols.splice(0); lib.vars.splice(0);
    const rl = await draw(lib.api, contract);
    ok(rl.deleted.length === 0 && rl.kept.length === 22 && rl.kept.every((k) => k.reason === 'no-collection'), '11: variables moved to a library: every table kept, its collection not in this file');
    // One collection gone while the rest still draw: the plan is not empty, and only the collection check keeps it.
    const g1 = await fullFile();
    await draw(g1.api, contract);
    g1.cols.splice(g1.cols.findIndex((c) => c.name === 'legacy'), 1);
    dropLegacy(g1);
    const r1 = await draw(g1.api, contract);
    ok(!!tableFrame(g1.prim, 'Legacy') && keptAs(r1, 'no-collection'), "11: a table whose collection is no longer in the file is kept while the rest are drawn");
    ok(summaryOf(r1).includes('left in place — its collection is not in this file: Style guide — Legacy'), '11: the summary says its collection is not in this file');

    // More than three deleted: the list is capped and the headline counts them.
    const many = await fullFile();
    await draw(many.api, contract, { collections: ['color'] });
    for (let i = many.vars.length - 1; i >= 0; i--) if (/^pds3\/color\/(scrim|veil|field|disabled)\//.test(many.vars[i].name)) many.vars.splice(i, 1);
    const rm = await draw(many.api, contract, { collections: ['color'] });
    ok(rm.deleted.length === 4 && summaryOf(rm).includes('4 tables the generator no longer draws were deleted, unedited: ') && summaryOf(rm).includes(' and 1 more') && styleGuideSummary(rm).headline === '✓ 7 tables, 4 deleted', `11: four deleted: three named and "and 1 more"; headline "✓ 7 tables, 4 deleted" (got "${styleGuideSummary(rm).headline}", ${rm.deleted.length})`);
  }

  console.log("12. the owner's grid model: a table dragged wider");
  {
    const rf = await fullFile();
    await draw(rf.api, contract, { collections: ['color'] });
    const t = tableFrame(rf.sem, 'Text')!;
    const g = gridOf(t);
    const hdr = t.children.find((c) => c.pluginData['prism3-style-guide-part'] === 'header')!;
    const w0 = g.width;
    ok(w0 > 0 && t.width === w0 && hdr.width === w0, `12: the table and its header hug the grid, ${w0}px, not the header component's 2,517 (table ${t.width}, header ${hdr.width})`);
    // A designer drags the grid 140px wider; the shim fixes its width, as a drag does. Asserted is only what holds
    // whatever the host does with the extra width: every cell is as wide as its track (a FILL cell takes its track),
    // and the wrapper and header follow the grid. Whether the HUG tracks take up the extra at all is a live-check
    // (docs/45 §7): the typings define HUG as CSS `fit-content(100%)`, which does not grow past its content.
    g.resize(w0 + 140, g.height);
    const off = g.children.filter((k) => Math.abs(k.width - trackW(g, k.gridCol!)) > 1e-6);
    ok(g.lsh === 'FIXED' && off.length === 0, `12: dragged 140px wider, every cell is still as wide as its track (${off.length} off its track)`);
    ok(t.width === w0 + 140 && hdr.width === w0 + 140, `12: the table and its header follow the grid to ${w0 + 140}px (table ${t.width}, header ${hdr.width})`);
  }

  console.log('13. the tables filter: one table, or a few (#1778)');
  {
    const f13 = await fullFile(twoRootVariables());
    await draw(f13.api, contract);
    const PRIMARY = 'Primary — nbds';
    const target = tableFrame(f13.prim, PRIMARY)!;
    const PRINT = 'prism3-style-guide-print';
    const AT = 'prism3-style-guide-at';
    const others = [...tablesOn(f13.prim), ...tablesOn(f13.sem)].filter((n) => n !== target);
    const targetGrid = gridOf(target).id;
    // THE DESIGNER'S HAND, before the filtered runs. On the primitive page, the page the filter draws on: the fourth
    // table, Accent, dragged 600px down out of the row, which leaves a gap in it; and Warning, drawn before the
    // position record, sitting 50px off the row. On the semantic page, which the filter does not draw on, Text — nbds
    // the same way. An unfiltered run re-flows a record-less table (section 10); a filtered run must touch none of them.
    const accent = tableFrame(f13.prim, 'Accent — nbds')!;
    accent.y += 600;
    const warning = tableFrame(f13.prim, 'Warning — nbds')!;
    delete warning.pluginData[AT];
    warning.y += 50;
    const textNb = tableFrame(f13.sem, 'Text — nbds')!;
    delete textNb.pluginData[AT];
    textNb.y += 50;
    const snap = new Map(others.map((n) => [n, { page: n.parent, grid: gridOf(n).id, print: n.pluginData[PRINT], x: n.x, y: n.y, at: n.pluginData[AT] }]));
    const p500 = f13.vars.find((v) => v.name === 'nbds/core/palette/primary/500')!;
    p500.valuesByMode['core:0'] = { r: 0.1, g: 0.2, b: 0.3, a: 1 };
    const r1 = await draw(f13.api, contract, { tables: [PRIMARY] });
    ok(others.length === 42 && r1.tables.length === 1 && r1.tables[0].title === PRIMARY && r1.tables[0].status === 'updated', `13: tables: ["${PRIMARY}"] draws that one table (${r1.tables.map((t) => `${t.title} ${t.status}`).join(', ')})`);
    const d1 = (r1.tables[0] as Extract<TableOutcome, { status: 'updated' }>).diff;
    ok(tableFrame(f13.prim, PRIMARY) === target && gridOf(target).id !== targetGrid && JSON.stringify(d1.changed) === JSON.stringify(['nbds/core/palette/primary/500']),
      '13: a filtered rerun updates its table in place: the same frame, a new grid, primary/500 reported changed');
    ok(r1.stale.length === 0 && r1.replaced.length === 0 && r1.deleted.length === 0 && r1.kept.length === 0,
      `13: the tables a filtered run skips are not stale, not replaced, not deleted and not reported (stale ${r1.stale.length}, deleted ${r1.deleted.length}, kept ${r1.kept.length})`);
    const touched = [...snap].filter(([n, x]) => n.parent !== x.page || gridOf(n).id !== x.grid || n.pluginData[PRINT] !== x.print);
    ok(tablesOn(f13.prim).length + tablesOn(f13.sem).length === 43 && touched.length === 0, `13: every other table is untouched: all 43 still drawn, each with its own grid and fingerprint (${touched.length} touched)`);
    // THE REVIEW'S PROBE (S1): with a gap in the stack and a record-less table beside it, a run that does not change
    // its table's height moves nothing and records nothing. The gap-closing re-stack moved 16 tables up and pulled
    // Warning in.
    const movedAt = (m: typeof snap): N[] => [...m].filter(([n, x]) => n.x !== x.x || n.y !== x.y).map(([n]) => n);
    const recorded = (m: typeof snap): N[] => [...m].filter(([n, x]) => (n.pluginData[AT] ?? '') !== (x.at ?? '')).map(([n]) => n);
    ok(movedAt(snap).length === 0 && recorded(snap).length === 0,
      `13: a filtered run whose table keeps its height moves no table and writes no position record — the gap Accent left stays open, Warning stays off the stack (${movedAt(snap).length} moved: ${movedAt(snap).slice(0, 3).map((n) => n.name).join(', ')}; ${recorded(snap).length} recorded)`);
    ok(textNb.y === snap.get(textNb)!.y && !textNb.pluginData[AT], `13: the semantic page, which the filtered run did not draw on, is not re-stacked (Text — nbds at ${textNb.y}, left at ${snap.get(textNb)!.y})`);
    ok(styleGuideSummary(r1).ok && styleGuideSummary(r1).headline === '✓ style guide: 1 table', `13: the verdict counts the one table (${styleGuideSummary(r1).headline})`);

    // WIDENING, then NARROWING (the row of decision 16): two new steps, one with a 150-character description, widen the
    // table's description column, and removing them narrows it back. The tables AFTER it in its row that sit where the
    // generator left them move right by exactly that, their records with them, their y unchanged; Accent (moved out
    // of the row by hand) and Warning (no record) do not move and gain no record, and the gap Accent left stays open.
    // Nothing before it and nothing on the other page moves.
    const onPage = (): N[] => tablesOn(f13.prim).filter((n) => n !== target);
    const at0 = new Map([...tablesOn(f13.prim), ...tablesOn(f13.sem)].map((n) => [n, { x: n.x, y: n.y, at: n.pluginData[AT] }]));
    const after = onPage().filter((n) => at0.get(n)!.x > at0.get(target)!.x && n !== accent && n !== warning);
    const before = onPage().filter((n) => at0.get(n)!.x < at0.get(target)!.x);
    const w0 = target.width;
    const steps = ['960', '970'].map((step, i) => ({ id: `VariableID:nb-grow:${step}`, name: `nbds/core/palette/primary/${step}`, variableCollectionId: 'VariableCollectionId:core', resolvedType: 'COLOR', description: i ? '' : 'W'.repeat(150), valuesByMode: { 'core:0': { r: 0, g: 0, b: 0, a: 1 } } }));
    f13.vars.push(...steps);
    await draw(f13.api, contract, { tables: [PRIMARY] });
    const shiftOf = (n: N): number => n.x - at0.get(n)!.x;
    const inStep = (n: N): boolean => n.pluginData[AT] === `${n.x},${n.y}` && n.y === at0.get(n)!.y;
    ok(target.width - w0 === WIDEN_PRIMARY, `13: a 150-character description widens ${PRIMARY} by ${WIDEN_PRIMARY}px (got ${target.width - w0})`);
    ok(after.length === 17 && after.every((n) => shiftOf(n) === WIDEN_PRIMARY && inStep(n)),
      `13: a filtered run moves only the tables after its table, in its row and where the generator left them, right by exactly its widening, each record moved with it, y unchanged (${after.length} tables: ${[...new Set(after.map(shiftOf))].join(', ')})`);
    ok(accent.x === at0.get(accent)!.x && accent.y === at0.get(accent)!.y && accent.pluginData[AT] === at0.get(accent)!.at
      && warning.x === at0.get(warning)!.x && warning.y === at0.get(warning)!.y && !warning.pluginData[AT],
      `13: a table a designer moved and a table with no position record are left alone, and neither gains a record (Accent +${shiftOf(accent)}, Warning +${shiftOf(warning)}, Warning's record "${warning.pluginData[AT] ?? ''}")`);
    ok(before.length === 1 && before.every((n) => shiftOf(n) === 0) && tablesOn(f13.sem).every((n) => shiftOf(n) === 0 && n.y === at0.get(n)!.y),
      `13: the table before it does not move, nor any table on the other page (${before.map((n) => n.name).join(', ')})`);
    for (const st of steps) f13.vars.splice(f13.vars.indexOf(st), 1);
    await draw(f13.api, contract, { tables: [PRIMARY] });
    ok(target.width === w0 && after.every((n) => shiftOf(n) === 0 && inStep(n)) && shiftOf(accent) === 0 && shiftOf(warning) === 0 && !warning.pluginData[AT],
      `13: narrowing back moves the same 17 tables left by exactly that, and leaves Accent and Warning where they are (${[...new Set(after.map(shiftOf))].join(', ')})`);
    // A FIRST-TIME TABLE FROM A FILTERED RUN goes at the END of the row: 160px right of the rightmost table left where
    // the generator put it, top-aligned with them.
    const rowEnd = Math.max(...tablesOn(f13.prim).filter((n) => n !== accent && n !== warning).map((n) => n.x + n.width));
    const rowY = target.y;
    f13.vars.push({ id: 'VariableID:nb-new:0', name: 'nbds/core/palette/zest/100', variableCollectionId: 'VariableCollectionId:core', resolvedType: 'COLOR', description: '', valuesByMode: { 'core:0': { r: 0.9, g: 0.8, b: 0.1, a: 1 } } });
    const rz = await draw(f13.api, contract, { tables: ['Zest — nbds'] });
    const zest = tableFrame(f13.prim, 'Zest — nbds');
    ok(rz.tables[0]?.status === 'created' && zest?.x === rowEnd + 160 && zest?.y === rowY, `13: a table a filtered run draws for the first time goes at the end of the row, 160px right of it, top-aligned (${zest?.x},${zest?.y} for ${rowEnd + 160},${rowY})`);
    f13.vars.pop();
    zest?.remove();

    // NAMED IN ANY CASE, OR BY KEY.
    const r3 = await draw(f13.api, contract, { tables: ['primary — NBDS', 'color|variablecollectionid:color|pds3/color/text'] });
    ok(JSON.stringify(r3.tables.map((t) => t.title)) === JSON.stringify([PRIMARY, 'Text — pds3']) && r3.unmatched.length === 0, `13: a table is named by its title in any case, or by its key (${r3.tables.map((t) => t.title).join(', ')})`);

    // A NAME THAT MATCHES NOTHING is reported by name, with the first 8 of the 43 titles this run can draw and a count
    // of the rest, and is not a pass.
    const r4 = await draw(f13.api, contract, { tables: [PRIMARY, 'Primry — nbds'] });
    const s4 = styleGuideSummary(r4);
    const first8 = 'Core — nbds base, Primary — nbds, Neutral — nbds, Accent — nbds, Success — nbds, Warning — nbds, Info — nbds, Danger — nbds';
    ok(JSON.stringify(r4.unmatched) === JSON.stringify(['Primry — nbds']) && s4.summary.includes(`No table is titled or keyed "Primry — nbds"; the tables this run can draw are ${first8} and 35 more`),
      `13: an unknown name is reported by name, with the first 8 titles this run can draw and "and 35 more" (${s4.summary.slice(0, 160)})`);
    ok(!s4.ok && s4.headline === '⚠ 1 drawn, 1 not found', `13: an unknown name is not a pass: "⚠ 1 drawn, 1 not found" (got "${s4.headline}")`);
    const r5 = await draw(f13.api, contract, { tables: ['Nope'] });
    const s5 = styleGuideSummary(r5);
    ok(r5.tables.length === 0 && !s5.ok && s5.headline === '✗ no table matched' && r5.deleted.length === 0 && tablesOn(f13.prim).length + tablesOn(f13.sem).length === 43,
      `13: a filter that matches nothing draws nothing, deletes nothing and says so: "✗ no table matched" (got "${s5.headline}")`);
    const p13 = planStyleGuide({ collections: f13.cols, variables: f13.vars }, contract, { types: ['dimension'], tables: [PRIMARY] });
    ok(JSON.stringify(p13.unmatched) === JSON.stringify([PRIMARY]) && p13.notes.includes(`No table is titled or keyed "${PRIMARY}"; this run draws no tables`), '13: a name asked for in a run that draws no color is still reported');

    // A RENAMED GROUP, drawn under its new title by a filtered run: the new table is created, and the old one, which
    // the generator no longer draws, stays until an unfiltered run judges it — and the report says so.
    for (const v of f13.vars) if (v.name.startsWith('nbds/core/palette/info/')) v.name = v.name.replace('/info/', '/notice/');
    const r6 = await draw(f13.api, contract, { tables: ['Notice — nbds'] });
    ok(r6.tables.length === 1 && r6.tables[0].status === 'created' && !!tableFrame(f13.prim, 'Info — nbds')
      && styleGuideSummary(r6).summary.includes('Style guide — Info — nbds stays in place: the generator no longer draws it, and a run filtered to named tables deletes nothing. The next run without a Tables filter decides whether to delete it'),
      `13: a filtered run that draws a renamed group's new table says the old one stays until a run without a Tables filter (${styleGuideSummary(r6).summary.slice(0, 200)})`);
  }

  console.log('14. one table at a time, yielding to the host (#1778)');
  {
    const y = await fullFile();
    const titles = planStyleGuide({ collections: y.cols, variables: y.vars }, contract).tables.map((t) => t.title);
    const INV = titles.indexOf('Inverse');
    const readings: StyleGuideProgress[] = [];
    const perReading = new Map<number, number>();
    let reading = -1;
    // Inside the 124-row Inverse table: the rows placed at each yield, read off the shim's own grid.
    const rowsAt: number[] = [];
    const yieldTo = async (): Promise<void> => {
      perReading.set(reading, (perReading.get(reading) ?? 0) + 1);
      if (reading === INV) {
        const t = tableFrame(y.sem, 'Inverse');
        rowsAt.push(t ? gridOf(t).children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).length : 0);
      }
      await fastYield();
    };
    await draw(y.api, contract, {}, { yieldTo, onProgress: (p) => { readings.push(p); reading = p.done; } });
    ok(INV >= 0 && JSON.stringify(readings.map((p) => `${p.done}/${p.total}`)) === JSON.stringify(Array.from({ length: 23 }, (_, i) => `${i}/22`)),
      `14: progress reads 0 of 22, then after each table 1 of 22 … 22 of 22 (${readings.slice(0, 3).map((p) => `${p.done}/${p.total}`).join(', ')}…)`);
    ok(readings[INV + 1]?.title === 'Inverse' && readings.slice(1).every((p) => p.tableMs >= 0), '14: each reading names the table just drawn and what it cost');
    const silent = Array.from({ length: 22 }, (_, i) => i + 1).filter((k) => !perReading.get(k));
    ok(silent.length === 0, `14: the host gets control back after every table (none after table ${silent.join(', ')})`);
    const gaps = rowsAt.map((n, i) => n - (i ? rowsAt[i - 1] : 0));
    ok(rowsAt.length >= 12 && rowsAt[rowsAt.length - 1] === 124 && Math.max(...gaps) <= 10,
      `14: the 124-row Inverse table yields while its rows are placed, never more than 10 rows apart (${rowsAt.length} yields, largest gap ${Math.max(0, ...gaps)} rows)`);
  }

  console.log('15. one run at a time, from either entry point (#1785)');
  {
    // The gate `main.ts` routes the panel and the agent link through. A panel run draws the prism3 file; at its third
    // yield, mid-table, the agent link asks for a run through the same gate.
    const gate = createStyleGuideGate();
    const f15 = await fullFile();
    const hold: { second?: ReturnType<typeof gate.run<StyleGuideResult>> } = {};
    let yields = 0;
    const yieldTo = async (): Promise<void> => {
      if (++yields === 3) hold.second = gate.run('agent', () => draw(f15.api, contract));
      await fastYield();
    };
    const first = await gate.run('panel', () => draw(f15.api, contract, {}, { yieldTo }));
    const second = await hold.second;
    ok(first.ran && second?.ran === false && second.running === 'panel',
      `15: a run asked for from the agent link while a panel run is mid-yield is refused, naming the panel's run (${JSON.stringify(second && { ran: second.ran, running: second.ran ? null : second.running })})`);
    const busy = styleGuideBusy('panel');
    ok(!busy.ok && busy.headline === '✗ already drawing' && busy.summary.startsWith('A style guide started from the panel is still drawing, so this request was not run')
      && styleGuideBusy('agent').summary.startsWith('A style guide started from the agent link is still drawing'), `15: the refusal says which run is still drawing: "${busy.headline}" — ${busy.summary.slice(0, 80)}…`);
    const wraps = [...tablesOn(f15.prim), ...tablesOn(f15.sem)];
    const keys = new Set(wraps.map((w) => w.pluginData['prism3-style-guide']));
    ok(wraps.length === 22 && keys.size === 22 && wraps.every((w) => w.children.filter((c) => c.name === 'Table').length === 1)
      && first.ran && first.value.tables.length === 22 && first.value.tables.every((t) => t.status === 'created'),
      `15: exactly one set of tables results: 22, each key once, each with one grid (${wraps.length} tables, ${keys.size} keys)`);
    const third = await gate.run('agent', () => draw(f15.api, contract, { collections: ['legacy'] }));
    ok(third.ran && gate.running() === null, '15: once that run reports, the next is let through, from either entry point');
  }

  console.log('16. phase 2: dimension tables (#259)');
  const p2 = await phase2File();
  const p2Id = (name: string): string => p2.vars.find((v) => v.name === name)!.id;
  const p2First = await draw(p2.api, contract);
  /** A table's header row, as drawn. */
  const headerRow = (w: N): string[] => gridOf(w).children.filter((k) => k.gridRow === 0).sort((a, b) => a.gridCol! - b.gridCol!).map(textIn);
  /** The bar inside a spacing cell. */
  const barIn = (cell: N | undefined): N | null => cell?.findOne((k) => /^spacing-(filled|line)-example$/.test(k.name)) ?? null;
  {
    ok(JSON.stringify(tablesOn(p2.prim).map((w) => w.name.replace('Style guide — ', '')).sort()) === JSON.stringify(['Density', 'Dimension', 'Font family', 'Font size (core)', 'Font size (type-sets)', 'Letter spacing', 'Line height', 'Step'])
      && JSON.stringify(tablesOn(p2.sem).map((w) => w.name.replace('Style guide — ', '')).sort()) === JSON.stringify(['Font weight', 'Radius', 'Size', 'Space', 'Text styles']),
      `16: a table per collection and type, the scales on ↳ Primitive tokens and the roles on ↳ Semantic tokens (${tablesOn(p2.prim).map((w) => w.name).join(', ')} | ${tablesOn(p2.sem).map((w) => w.name).join(', ')})`);
    ok(p2First.tables.length === 13 && p2First.tables.every((t) => t.status === 'created') && styleGuideSummary(p2First).headline === '✓ style guide: 13 tables', `16: 13 tables, all created: "${styleGuideSummary(p2First).headline}"`);
    const space = tableFrame(p2.sem, 'Space')!;
    const sg = gridOf(space);
    ok(JSON.stringify(headerRow(space)) === JSON.stringify(['Token', 'Default', 'Value', 'REM', 'Description']), `16: a dimension table is Token · <mode> · Value · REM · Description, REM in its own column, no contrast column (${headerRow(space).join(' · ')})`);
    // THE SPECIMEN: the spacing cell's filled bar at the value's width, its width bound to the variable, pinned to its mode.
    const r050 = rowOf(sg, '050');
    const cell = cellAt(sg, r050, 1);
    const bar = barIn(cell);
    ok(cell?.mainComponent?.name === 'display=filled' && bar?.width === 4 && bar?.boundVariables.paddingLeft?.id === p2Id('pds3/space/050') && cell.explicitVariableModes['VariableCollectionId:space'] === 'space:0',
      `16: space/050 draws the filled spacing bar at 4px, its left padding bound to space/050 and pinned to the space mode (${cell?.mainComponent?.name}, ${bar?.width}px, bound ${bar?.boundVariables.paddingLeft?.id})`);
    // LIVE: the bar follows its variable with no rerun. The first padding bind can freeze the frame at FIXED at the
    // width it gave; the run sets HUG again after it, so a new value (dimension/4, which space/050 aliases, set to 5)
    // reaches the bar. Restored after.
    const d4 = p2.vars.find((v) => v.name === 'pds3/core/dimension/4')!;
    d4.valuesByMode['core:0'] = 5;
    const live = bar?.width;
    d4.valuesByMode['core:0'] = 4;
    ok(live === 5 && bar?.lsh === 'HUG', `16: the bar follows its variable live, with no rerun: dimension/4 set to 5 makes space/050's bar 5px (${live}px, ${bar?.lsh})`);
    // REM IS AN ADDITION, NEVER IN THE VALUE'S CELL (owner decision, 2026-09-29): the value cell is px and the alias
    // chip; the REM column after it is REM at a 16px base, alone.
    ok(textIn(cellAt(sg, r050, 2)) === '4px | ↗ | pds3/core/dimension/4' && textIn(cellAt(sg, r050, 3)) === '0.25rem',
      `16: its value cell reads px with its alias, and the REM column beside it REM at a 16px base: "${textIn(cellAt(sg, r050, 2))}" ‖ "${textIn(cellAt(sg, r050, 3))}"`);
    ok(textIn(cellAt(sg, rowOf(sg, '1200'), 2)) === '96px | ↗ | pds3/core/dimension/96' && textIn(cellAt(sg, rowOf(sg, '1200'), 3)) === '6rem', `16: space/1200 reads "96px", and "6rem" in its REM column (${textIn(cellAt(sg, rowOf(sg, '1200'), 2))} ‖ ${textIn(cellAt(sg, rowOf(sg, '1200'), 3))})`);
    ok(JSON.stringify(sg.children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).sort((a, b) => a.gridRow! - b.gridRow!).map(textIn)) === JSON.stringify(['0', '025', '050', '075', '100', '150', '200', '250', '300', '400', '500', '600', '700', '800', '900', '1000', '1100', '1200']),
      '16: the space scale in ramp order, 1000 after 900');
    // NUMERIC SORT: the metrics ramp is stored 16, 4, 100, 2.
    const step = gridOf(tableFrame(p2.prim, 'Step')!);
    const stepRows = step.children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).sort((a, b) => a.gridRow! - b.gridRow!).map(textIn);
    ok(JSON.stringify(stepRows) === JSON.stringify(['2', '4', '16', '100']), `16: a ramp stored 16, 4, 100, 2 draws 2, 4, 16, 100 (${stepRows.join(', ')})`);
    ok(cellAt(step, 1, 1)?.mainComponent?.name === 'display=filled' && barIn(cellAt(step, 4, 1))?.width === 100, '16: a size draws the run\'s one spacing style, the filled bar by default, 100px wide for 100');
    // ONE SPACING STYLE FOR THE WHOLE RUN (owner decision 18, 2026-09-29: "a stylistic choice, never chosen by role"). A
    // table with a gap, a height and a width row draws every one in the chosen style: the filled bar by default, the
    // bracket when `dimensionDisplay` is `line`, and `auto` is the default. Density here holds space/gap (GAP),
    // size/row (WIDTH_HEIGHT) and size/width (WIDTH_HEIGHT, added).
    const one = await phase2File();
    one.vars.push({ id: 'VariableID:density:w', name: 'density/size/width', variableCollectionId: 'VariableCollectionId:density', resolvedType: 'FLOAT', description: '', valuesByMode: { 'density:0': 24, 'density:1': 32 }, scopes: ['WIDTH_HEIGHT'] });
    const styles = async (o: StyleGuideOptions): Promise<string> => {
      await draw(one.api, contract, { types: ['dimension'], tables: ['Density', 'Size'], ...o });
      return [...new Set(['Density', 'Size'].flatMap((t) => gridOf(tableFrame(t === 'Size' ? one.sem : one.prim, t)!).children.filter((k) => k.gridRow! > 0 && k.gridCol === 1).map((k) => String(k.mainComponent?.name))))].join(',');
    };
    const [byDefault, byAuto, byLine] = [await styles({}), await styles({ dimensionDisplay: 'auto' }), await styles({ dimensionDisplay: 'line' })];
    ok(byDefault === 'display=filled' && byAuto === 'display=filled' && byLine === 'display=line',
      `16: gap, height and width rows all draw the run's one style: filled by default and for auto, the bracket for line, never mixed (${byDefault} | ${byAuto} | ${byLine})`);
    // MODES SIDE BY SIDE: a dimension that varies by mode draws one bound specimen per mode, each pinned.
    const dens = tableFrame(p2.prim, 'Density')!;
    const dg = gridOf(dens);
    const gap = rowOf(dg, 'space/gap');
    const [c0, c1] = [cellAt(dg, gap, 1), cellAt(dg, gap, 4)];
    ok(JSON.stringify(headerRow(dens)) === JSON.stringify(['Token', 'compact', 'Value', 'REM', 'comfortable', 'Value', 'REM', 'Description'])
      && c0?.explicitVariableModes['VariableCollectionId:density'] === 'density:0' && c1?.explicitVariableModes['VariableCollectionId:density'] === 'density:1'
      && barIn(c0)?.width === 8 && barIn(c1)?.width === 12 && barIn(c0)?.boundVariables.paddingLeft?.id === p2Id('density/space/gap') && barIn(c1)?.boundVariables.paddingLeft?.id === p2Id('density/space/gap'),
      `16: a mode-varying spacing draws a bound bar per mode, pinned: compact 8px, comfortable 12px (${barIn(c0)?.width}, ${barIn(c1)?.width})`);
    ok(textIn(cellAt(dg, gap, 2)) === '8px' && textIn(cellAt(dg, gap, 3)) === '0.5rem' && textIn(cellAt(dg, gap, 5)) === '12px' && textIn(cellAt(dg, gap, 6)) === '0.75rem',
      '16: its values per mode, each with its own REM column: "8px" · "0.5rem", "12px" · "0.75rem"');
    // RADIUS: the swatches set's type=radius member at its fixed size, its corner bound to the variable, no ground.
    const rg = gridOf(tableFrame(p2.sem, 'Radius')!);
    const md = cellAt(rg, rowOf(rg, 'md'), 1);
    ok(md?.type === 'INSTANCE' && md.mainComponent?.name === 'type=radius' && md.lsh === 'FIXED' && md.width === 48 && md.height === 48
      && md.findOne((k) => k.name === 'radius-example')?.boundVariables.topLeftRadius?.id === p2Id('pds3/radius/md') && md.explicitVariableModes['VariableCollectionId:radius'] === 'radius:0',
      `16: radius/md draws the type=radius swatch, 48 × 48 and FIXED, its corner bound to radius/md (${md?.mainComponent?.name}, ${md?.width}×${md?.height})`);
    // ALL FOUR CORNERS (review of `4faeb98a`): the specimen shows the value whichever corner the member rounds.
    const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].map((k) => md?.findOne((n) => n.name === 'radius-example')?.boundVariables[k]?.id);
    ok(corners.every((id) => id === p2Id('pds3/radius/md')), `16: all four of its corners are bound to radius/md (${corners.map((id) => (id ? 'bound' : 'unbound')).join(', ')})`);
    const drawnWin = md?.findOne((n) => n.name === 'radius-example-container');
    ok(drawnWin?.clipsContent === true && drawnWin.w === 48 && drawnWin.findOne((n) => n.name === 'radius-example')?.w === 256,
      `16: the drawn radius specimen keeps the clip, so it shows one rounded corner of its 256px shape (clipsContent ${drawnWin?.clipsContent})`);
    ok(textIn(cellAt(rg, rowOf(rg, 'capsule'), 2)) === '999px' && textIn(cellAt(rg, rowOf(rg, 'capsule'), 3)) === '62.4375rem', `16: radius/capsule reads "999px", and "62.4375rem" in its REM column (${textIn(cellAt(rg, rowOf(rg, 'capsule'), 2))} ‖ ${textIn(cellAt(rg, rowOf(rg, 'capsule'), 3))})`);
    ok(tablesOn(p2.sem).concat(tablesOn(p2.prim)).every((w) => gridOf(w).findAll((k) => k.name === 'Ground').length === 0), '16: no phase-2 specimen sits on a ground');
    // The spacing cell FILLs its track, as every cell but a swatch does, and no cell is wider than its column.
    ok(cell?.lsh === 'FILL' && cell.layoutSizingVertical === 'FILL', '16: a spacing cell FILLs its track, both axes');
    const off = [...tablesOn(p2.sem), ...tablesOn(p2.prim)].flatMap((w) => clipped(gridOf(w)).map((x) => `${w.name} ${x}`));
    ok(off.length === 0, `16: no cell in any phase-2 table is wider than its column (${off.slice(0, 3).join('; ')})`);
    ok(!p2First.notes.some((n) => n.includes('Contrast')) && [...tablesOn(p2.sem), ...tablesOn(p2.prim)].every((w) => !headerRow(w).includes('Contrast')), '16: no phase-2 table has a contrast column');
  }

  console.log('17. phase 2: font variables (#259)');
  {
    /** The Text node of a font specimen. */
    const textOf = (cell: N | undefined): N | null => cell?.findOne((k) => k.type === 'TEXT') ?? null;
    const bindings = (t: N | null): string => Object.keys(t?.boundVariables ?? {}).sort().join(',');
    const size = gridOf(tableFrame(p2.prim, 'Font size (core)')!);
    const s16 = textOf(cellAt(size, rowOf(size, '16'), 1));
    ok(s16?.characters === 'Abc 123' && bindings(s16) === 'fontSize' && s16?.boundVariables.fontSize.id === p2Id('pds3/core/font/size/16'),
      `17: font size 16's specimen is "Abc 123" with fontSize alone bound to it (${s16?.characters}, bound ${bindings(s16)})`);
    ok(textIn(cellAt(size, rowOf(size, '16'), 2)) === '16px' && textIn(cellAt(size, rowOf(size, '16'), 3)) === '1rem', '17: its value is "16px", and "1rem" in the REM column');
    const fam = gridOf(tableFrame(p2.prim, 'Font family')!);
    const fDisplay = textOf(cellAt(fam, rowOf(fam, 'display'), 1));
    ok(bindings(fDisplay) === 'fontFamily' && fDisplay?.boundVariables.fontFamily.id === p2Id('pds3/core/font/family/display') && textIn(cellAt(fam, rowOf(fam, 'display'), 2)) === 'Playfair Display',
      `17: font family display binds fontFamily alone and reads "Playfair Display" (${bindings(fDisplay)})`);
    const wt = gridOf(tableFrame(p2.sem, 'Font weight')!);
    const w600 = textOf(cellAt(wt, rowOf(wt, 'weight/600'), 1));
    ok(bindings(w600) === 'fontWeight' && w600?.boundVariables.fontWeight.id === p2Id('pds3/core/font/weight/600') && textIn(cellAt(wt, rowOf(wt, 'weight/600'), 2)) === '600 · Semi Bold',
      `17: font weight 600 binds fontWeight alone and reads "600 · Semi Bold" (${bindings(w600)}, "${textIn(cellAt(wt, rowOf(wt, 'weight/600'), 2))}")`);
    ok(textIn(cellAt(wt, rowOf(wt, 'weight-role/strong'), 2)) === '600 · Semi Bold | ↗ | pds3/core/font/weight/600', '17: a weight role reads its weight and its alias');
    const lh = gridOf(tableFrame(p2.prim, 'Line height')!);
    const ls = gridOf(tableFrame(p2.prim, 'Letter spacing')!);
    ok(bindings(textOf(cellAt(lh, 1, 1))) === 'lineHeight' && textIn(cellAt(lh, 1, 2)) === '24px' && textIn(cellAt(lh, 1, 3)) === '1.5rem'
      && bindings(textOf(cellAt(ls, 1, 1))) === 'letterSpacing' && textIn(cellAt(ls, 1, 2)) === '-0.5px' && textIn(cellAt(ls, 1, 3)) === '-0.0312rem',
      `17: a line height binds lineHeight ("24px" · "1.5rem"), a letter spacing letterSpacing ("${textIn(cellAt(ls, 1, 2))}" · "${textIn(cellAt(ls, 1, 3))}")`);
    // A FAMILY OR A WEIGHT IS NOT A LENGTH: no REM column.
    ok(!headerRow(tableFrame(p2.prim, 'Font family')!).includes('REM') && !headerRow(tableFrame(p2.sem, 'Font weight')!).includes('REM'), '17: the font family and font weight tables have no REM column');
    // A FLUID size: one specimen per type-sets mode, each pinned, each value in its mode.
    const fluid = tableFrame(p2.prim, 'Font size (type-sets)')!;
    const fg = gridOf(fluid);
    const d3 = rowOf(fg, 'display/3xl/emphasis');
    ok(JSON.stringify(headerRow(fluid)) === JSON.stringify(['Token', 'desktop', 'Value', 'REM', 'mobile', 'Value', 'REM', 'Description'])
      && cellAt(fg, d3, 1)?.explicitVariableModes['VariableCollectionId:ts'] === 'ts:0' && cellAt(fg, d3, 4)?.explicitVariableModes['VariableCollectionId:ts'] === 'ts:1'
      && textIn(cellAt(fg, d3, 2)) === '160px' && textIn(cellAt(fg, d3, 3)) === '10rem' && textIn(cellAt(fg, d3, 5)) === '48px' && textIn(cellAt(fg, d3, 6)) === '3rem',
      `17: a fluid size draws desktop and mobile side by side, pinned: 160px · 10rem and 48px · 3rem, each REM in its own column (${[2, 3, 5, 6].map((c) => textIn(cellAt(fg, d3, c))).join(' / ')})`);
    // The display override: Generic binds nothing; Size binds fontSize on a weight row.
    const gen = await phase2File();
    await draw(gen.api, contract, { types: ['fontWeight'], fontDisplay: 'generic' });
    const gw = gridOf(tableFrame(gen.sem, 'Font weight')!);
    ok(bindings(textOf(cellAt(gw, 1, 1))) === '', '17: Display "Generic" draws "Abc 123" with nothing bound');
    await draw(gen.api, contract, { types: ['fontWeight'], fontDisplay: 'size' });
    ok(bindings(textOf(cellAt(gridOf(tableFrame(gen.sem, 'Font weight')!), 1, 1))) === 'fontSize', '17: Display "Size" binds fontSize instead');
  }

  console.log('18. phase 2: text styles (#259)');
  {
    const ts = tableFrame(p2.sem, 'Text styles')!;
    const tg = gridOf(ts);
    ok(JSON.stringify(headerRow(ts)) === JSON.stringify(['Token', 'desktop', 'Size / line height', 'REM', 'mobile', 'Size / line height', 'REM', 'Family', 'Weight', 'Letter spacing', 'REM', 'Description']),
      `18: the text-style table: a specimen, size and REM per type-sets mode, then family, weight, letter spacing and its REM (${headerRow(ts).join(' · ')})`);
    const names = tg.children.filter((k) => k.gridCol === 0 && k.gridRow! > 0).sort((a, b) => a.gridRow! - b.gridRow!).map(textIn);
    ok(names.length === 63 && JSON.stringify(names) === JSON.stringify(p2.styles.map((st) => st.name)), `18: one row per text style, 63, in the file's order (${names.slice(0, 2).join(', ')} …)`);
    const body = rowOf(tg, 'body/lg/default');
    const bodyId = p2.styles.find((st) => st.name === 'body/lg/default')!.id;
    const spec = [cellAt(tg, body, 1), cellAt(tg, body, 4)];
    ok(spec.every((c) => c?.findOne((k) => k.type === 'TEXT')?.textStyleId === bodyId && c?.findOne((k) => k.type === 'TEXT')?.characters === 'Abc 123')
      && spec[0]?.explicitVariableModes['VariableCollectionId:ts'] === 'ts:0' && spec[1]?.explicitVariableModes['VariableCollectionId:ts'] === 'ts:1',
      `18: body/lg/default's specimen is "Abc 123" with its text style applied, one per mode, pinned (${spec.map((c) => c?.findOne((k) => k.type === 'TEXT')?.textStyleId).join(', ')})`);
    ok(textIn(cellAt(tg, body, 2)) === '18px / 150% | ↗ | pds3/core/font/size/18' && textIn(cellAt(tg, body, 3)) === '1.125rem' && textIn(cellAt(tg, body, 7)) === 'Inter | ↗ | pds3/core/font/family/body'
      && textIn(cellAt(tg, body, 8)) === '400 · Regular | ↗ | pds3/core/font/style/body/default' && textIn(cellAt(tg, body, 9)) === '0%' && textIn(cellAt(tg, body, 10)) === '—',
      `18: body/lg/default reads 18px / 150% with 1.125rem in its REM column, Inter, 400 · Regular, 0%, and "—" for the REM of a letter spacing stored as a percentage (${[2, 3, 7, 8, 9, 10].map((c) => textIn(cellAt(tg, body, c))).join(' ‖ ')})`);
    const hero = rowOf(tg, 'display/3xl/emphasis');
    ok(textIn(cellAt(tg, hero, 2)) === '160px / 105% | ↗ | pds3/font-fluid/display/3xl/emphasis' && textIn(cellAt(tg, hero, 3)) === '10rem'
      && textIn(cellAt(tg, hero, 5)) === '48px / 105% | ↗ | pds3/font-fluid/display/3xl/emphasis' && textIn(cellAt(tg, hero, 6)) === '3rem'
      && textIn(cellAt(tg, hero, 7)) === 'Playfair Display | ↗ | pds3/core/font/family/display' && textIn(cellAt(tg, hero, 8)) === '500 · Medium Italic | ↗ | pds3/core/font/style/display/emphasis' && textIn(cellAt(tg, hero, 9)) === '-3%',
      `18: display/3xl/emphasis reads 160px (10rem) on desktop and 48px (3rem) on mobile, Playfair Display, 500 · Medium Italic, -3% (${[2, 3, 5, 6, 7, 8, 9].map((c) => textIn(cellAt(tg, hero, c))).join(' ‖ ')})`);
    // THE TOGGLED COLUMNS: paragraph spacing and text decoration appear only when asked for.
    const tog = await phase2File();
    await draw(tog.api, contract, { types: ['typography'], paragraphSpacing: true, textDecoration: true });
    const tw = tableFrame(tog.sem, 'Text styles')!;
    ok(JSON.stringify(headerRow(tw)) === JSON.stringify(['Token', 'desktop', 'Size / line height', 'REM', 'mobile', 'Size / line height', 'REM', 'Family', 'Weight', 'Letter spacing', 'REM', 'Paragraph spacing', 'REM', 'Decoration', 'Description']),
      `18: paragraph spacing (with its REM) and decoration toggled on add their columns (${headerRow(tw).join(' · ')})`);
    const link = rowOf(gridOf(tw), 'body/lg/default-link');
    ok(textIn(cellAt(gridOf(tw), link, 11)) === '0px' && textIn(cellAt(gridOf(tw), link, 12)) === '0rem' && textIn(cellAt(gridOf(tw), link, 13)) === 'Underline',
      `18: a link style reads "0px" paragraph spacing, "0rem" beside it, and "Underline" (${[11, 12, 13].map((c) => textIn(cellAt(gridOf(tw), link, c))).join(' ‖ ')})`);
    await draw(tog.api, contract, { types: ['typography'] });
    ok(!headerRow(tableFrame(tog.sem, 'Text styles')!).includes('Paragraph spacing') && !headerRow(tableFrame(tog.sem, 'Text styles')!).includes('Decoration'),
      '18: toggled off, the two columns are gone on the rerun');
    // REM OFF: no REM column at all, and the value cell unchanged.
    await draw(tog.api, contract, { types: ['typography'], rem: false });
    const noRemW = tableFrame(tog.sem, 'Text styles')!;
    const noRem = gridOf(noRemW);
    ok(!headerRow(noRemW).includes('REM') && textIn(cellAt(noRem, rowOf(noRem, 'body/lg/default'), 2)).startsWith('18px / 150%'), `18: REM off: no REM column, and the value reads "18px / 150%" (${headerRow(noRemW).join(' · ')})`);
    // PIXELS IS RETIRED (owner decision 20): the agent link passes an older caller's `pixels` as `retired`, the run
    // draws exactly what it draws without it, and its notes say it was ignored.
    const pxRun = await draw(tog.api, contract, { types: ['typography'], retired: ['pixels'] });
    const noPx = gridOf(tableFrame(tog.sem, 'Text styles')!);
    const bpx = rowOf(noPx, 'body/lg/default');
    ok(textIn(cellAt(noPx, bpx, 2)).startsWith('18px / 150%') && textIn(cellAt(noPx, bpx, 3)) === '1.125rem'
      && pxRun.notes.includes('pixels is no longer an option and was ignored: every value column prints its base value in px'),
      `18: a retired pixels arg changes nothing drawn, "18px / 150%" and "1.125rem", and the notes say it was ignored (${textIn(cellAt(noPx, bpx, 2))} ‖ ${textIn(cellAt(noPx, bpx, 3))}; ${pxRun.notes.join(' / ')})`);
    // A LETTER SPACING AND A PARAGRAPH SPACING IN PX get their REM (owner decision 20): 0.8px → 0.05rem, 12px → 0.75rem.
    const lsPx = { ...p2.styles[0], id: 'S:lspx:', name: 'px/spacing', letterSpacing: { unit: 'PIXELS', value: 0.8 }, paragraphSpacing: 12, boundVariables: {} };
    const lsPlan = planStyleGuide({ collections: [], variables: [], textStyles: [lsPx] }, null, { types: ['typography'], paragraphSpacing: true });
    const lsExtra = (lsPlan.tables[0]?.rows[0]?.extra ?? []).map((x) => x.value).slice(2);
    ok(JSON.stringify(lsExtra) === JSON.stringify(['0.8px', '0.05rem', '12px', '0.75rem']) && JSON.stringify(lsPlan.tables[0]?.columns.slice(-5)) === JSON.stringify(['Letter spacing', 'REM', 'Paragraph spacing', 'REM', 'Description']),
      `18: a letter spacing of 0.8px reads "0.05rem" beside it, and a paragraph spacing of 12px "0.75rem" (${lsExtra.join(' ‖ ')}; ${lsPlan.tables[0]?.columns.slice(-5).join(' · ')})`);
    const lsOff = planStyleGuide({ collections: [], variables: [], textStyles: [lsPx] }, null, { types: ['typography'], paragraphSpacing: true, rem: false });
    ok(JSON.stringify((lsOff.tables[0]?.rows[0]?.extra ?? []).map((x) => x.value).slice(2)) === JSON.stringify(['0.8px', '12px']) && !lsOff.tables[0]?.columns.includes('REM'),
      `18: REM off, the two spacings print px alone and there is no REM column (${(lsOff.tables[0]?.rows[0]?.extra ?? []).map((x) => x.value).join(' ‖ ')})`);
    // A LINE HEIGHT IN PIXELS gets its REM too: metrics' 24px line height and 16px size read "1rem / 1.5rem".
    const lhPx = { ...p2.styles[0], id: 'S:lhpx:', name: 'px/line', fontSize: 16, lineHeight: { unit: 'PIXELS', value: 24 }, boundVariables: {} };
    const pr = planStyleGuide({ collections: [], variables: [], textStyles: [lhPx] }, null, { types: ['typography'] });
    ok(pr.tables[0]?.rows[0]?.cells[0]?.value === '16px / 24px' && pr.tables[0]?.rows[0]?.cells[0]?.rem === '1rem / 1.5rem',
      `18: a style whose line height is in pixels reads "16px / 24px", and "1rem / 1.5rem" in its REM column (${pr.tables[0]?.rows[0]?.cells[0]?.value} ‖ ${pr.tables[0]?.rows[0]?.cells[0]?.rem})`);
  }

  console.log('19. phase 2: rerun, the tables filter, the phase boundary, an unbound specimen (#259)');
  {
    const space = tableFrame(p2.sem, 'Space')!;
    const spaceId = space.id;
    p2.vars.find((v) => v.name === 'pds3/space/050')!.valuesByMode['space:0'] = { type: 'VARIABLE_ALIAS', id: p2Id('pds3/core/dimension/6') };
    p2.styles.find((st) => st.name === 'body/lg/default')!.letterSpacing = { unit: 'PERCENT', value: 1 };
    const again = await draw(p2.api, contract);
    const sg = gridOf(tableFrame(p2.sem, 'Space')!);
    const upd = (title: string) => again.tables.find((t) => t.title === title) as Extract<TableOutcome, { status: 'updated' }> | undefined;
    ok(tablesOn(p2.sem).length === 5 && tablesOn(p2.prim).length === 8 && tableFrame(p2.sem, 'Space')?.id === spaceId && again.tables.every((t) => t.status === 'updated'),
      '19: a rerun updates every phase-2 table in place, none duplicated');
    ok(JSON.stringify(upd('Space')?.diff) === JSON.stringify({ added: [], removed: [], changed: ['pds3/space/050'], renamed: [] }) && barIn(cellAt(sg, rowOf(sg, '050'), 1))?.width === 6
      && textIn(cellAt(sg, rowOf(sg, '050'), 2)) === '6px | ↗ | pds3/core/dimension/6' && textIn(cellAt(sg, rowOf(sg, '050'), 3)) === '0.375rem',
      `19: space/050 re-aliased to 6 is reported changed, its bar 6px, its value "6px" and its REM "0.375rem" (${JSON.stringify(upd('Space')?.diff)})`);
    ok(JSON.stringify(upd('Text styles')?.diff.changed) === JSON.stringify(['body/lg/default']), `19: a text style's letter spacing change is reported (${JSON.stringify(upd('Text styles')?.diff)})`);
    ok(again.deleted.length === 0 && again.kept.length === 0 && again.stale.length === 0, '19: nothing superseded');
    const remOnly = await draw(p2.api, contract, { rem: false });
    ok(remOnly.tables.every((t) => t.status === 'updated' && !t.diff.changed.length), '19: switching REM off changes no row');
    // THE TABLES FILTER on the new tables: by title, a disambiguated title, and a key.
    const before = new Map([...tablesOn(p2.sem), ...tablesOn(p2.prim)].map((w) => [w.name, gridOf(w).id]));
    const f1 = await draw(p2.api, contract, { tables: ['space', 'Font size (type-sets)', 'dimension|VariableCollectionId:radius|pds3/radius'] });
    const redrawn = [...tablesOn(p2.sem), ...tablesOn(p2.prim)].filter((w) => before.get(w.name) !== gridOf(w).id).map((w) => w.name).sort();
    ok(JSON.stringify(f1.tables.map((t) => t.title).sort()) === JSON.stringify(['Font size (type-sets)', 'Radius', 'Space']) && JSON.stringify(redrawn) === JSON.stringify(['Style guide — Font size (type-sets)', 'Style guide — Radius', 'Style guide — Space'])
      && f1.unmatched.length === 0,
      `19: tables: [space, Font size (type-sets), the radius key] draws those three and no other (${redrawn.join(', ')})`);
    ok((await draw(p2.api, contract, { tables: ['Font size'] })).unmatched.length === 1, '19: "Font size" alone matches neither disambiguated title, and is reported');
    // THE PHASE BOUNDARY: a type outside it is named, not drawn; the later-phase variables are counted.
    const out = await draw(p2.api, contract, { types: ['dimension', 'shadow'] });
    ok(out.tables.length === 6 && out.tables.every((t) => t.key.startsWith('dimension|')) && out.notes.includes('shadow: not in this phase — this phase draws color, dimension, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, typography'),
      `19: types [dimension, shadow] draws the 6 dimension tables and names shadow as outside this phase (${out.notes.join(' / ')})`);
    ok(p2First.notes.includes('Not drawn until a later phase: 13 font style, 12 opacity variables'), `19: an open run counts the variables a later phase draws (${p2First.notes.join(' / ')})`);
    // A HOST THAT REFUSES A BINDING: counted, named, not a pass.
    const nb = await phase2File();
    refuseBinding = true;
    const refused = await draw(nb.api, contract, { tables: ['Radius', 'Font weight'] });
    refuseBinding = false;
    const v = styleGuideSummary(refused);
    ok(refused.unbound === 17 && !v.ok && v.summary.includes('6 type=radius specimens are not bound to their variable') && v.summary.includes('11 font weight specimens are not bound to their variable'),
      `19: a binding the host refuses is counted and named, and is not a pass: ${refused.unbound} unbound — "${v.headline}"`);
    ok(v.headline === '⚠ 17 specimens unbound', `19: its headline counts specimens, not swatches: "${v.headline}"`);
  }

  console.log('20. the title cell, on every table type (owner decision 15)');
  {
    ok([...tablesOn(p2.sem), ...tablesOn(p2.prim), ...tablesOn(f.sem), ...tablesOn(f.prim)].every((w) => headerRow(w)[0] === 'Token'), '20: off by default: every table leads with Token, no Name column');
    // THE DEFAULT: the path below the table's shared prefix, Title Case, size words upper-cased.
    ok(humanizeName(['text', 'primary']) === 'Text Primary' && humanizeName(['display', 'xl', 'emphasis']) === 'Display XL Emphasis'
      && humanizeName(['050'], 'space') === 'Space 050' && humanizeName(['xs', 'padding-x']) === 'XS Padding X' && humanizeName(['display', '2xl', 'strong']) === 'Display 2XL Strong',
      `20: humanized: "Text Primary", "Display XL Emphasis", "Space 050", "XS Padding X", "Display 2XL Strong" (${humanizeName(['display', 'xl', 'emphasis'])})`);
    /** The row whose Token cell (column 1, after Name) reads `token`. */
    const rowBy = (g: N, token: string): number => g.children.find((k) => k.gridCol === 1 && textIn(k) === token)?.gridRow ?? -1;
    const nameOf = (w: N, token: string): string => { const g = gridOf(w); return textIn(cellAt(g, rowBy(g, token), 0)); };
    const c20 = await fullFile();
    await draw(c20.api, contract, { titleCell: true, collections: ['color'] });
    const text20 = tableFrame(c20.sem, 'Text')!;
    const tn = cellAt(gridOf(text20), rowBy(gridOf(text20), 'primary'), 0);
    ok(JSON.stringify(headerRow(text20).slice(0, 3)) === JSON.stringify(['Name', 'Token', 'light']) && textIn(tn) === 'Text Primary'
      && tn?.mainComponent?.name === 'color=white, textAlign=left, type=default, padding=default' && tn.lsh === 'FILL' && tn.layoutSizingVertical === 'FILL'
      && tn.findOne((k) => k.type === 'TEXT')?.textAutoResize === 'WIDTH_AND_HEIGHT',
      `20: on, a color table leads with Name: text/primary reads "Text Primary" in a default text cell that FILLs its track, on one line (${headerRow(text20).slice(0, 3).join(' · ')}; "${textIn(tn)}")`);
    ok(nameOf(tableFrame(c20.sem, 'Inverse')!, 'text/primary') === 'Inverse Text Primary', `20: an inverse role reads "Inverse Text Primary" (${nameOf(tableFrame(c20.sem, 'Inverse')!, 'text/primary')})`);
    const t20 = await phase2File();
    // A HEADER WHOSE INSIDE FOLLOWS ITS WIDTH, as an auto-layout header component's does: its "Text" box FILLs it. A
    // wider title column then widens the header's inside too, which the fingerprint must leave out with the header
    // itself (review of f3bb76cd: with the fixture's plain box, dropping that exclusion failed nothing).
    const hdr = t20.fc.findOne((k) => k.name === 'Size=Medium')!;
    hdr.layoutMode = 'VERTICAL'; hdr.primaryAxisSizingMode = 'AUTO'; hdr.counterAxisSizingMode = 'FIXED';
    hdr.findOne((k) => k.name === 'Text')!.lsh = 'FILL';
    await draw(t20.api, contract, { titleCell: true });
    const ts20 = tableFrame(t20.sem, 'Text styles')!;
    const space20 = tableFrame(t20.sem, 'Space')!;
    ok(headerRow(ts20)[0] === 'Name' && nameOf(ts20, 'display/3xl/emphasis') === 'Display 3XL Emphasis' && nameOf(space20, '050') === 'Space 050'
      && nameOf(tableFrame(t20.sem, 'Size')!, 'xs/height') === 'XS Height' && nameOf(tableFrame(t20.prim, 'Font size (core)')!, '16') === 'Size 16',
      `20: a text style reads "Display 3XL Emphasis", a dimension "Space 050" and "XS Height", a font size "Size 16" (${nameOf(ts20, 'display/3xl/emphasis')}, ${nameOf(space20, '050')})`);
    // A DESIGNER'S EDIT SURVIVES; an unedited title follows a rename.
    const titleText = (w: N, token: string): N => cellAt(gridOf(w), rowBy(gridOf(w), token), 0)!.findOne((k) => k.type === 'TEXT')!;
    titleText(space20, '050').characters = 'Gutter small';
    t20.vars.find((v) => v.name === 'pds3/space/025')!.name = 'pds3/space/020';
    await draw(t20.api, contract, { titleCell: true });
    const sp = tableFrame(t20.sem, 'Space')!;
    ok(nameOf(sp, '050') === 'Gutter small' && nameOf(sp, '020') === 'Space 020', `20: a hand-edited title survives a rerun ("${nameOf(sp, '050')}"), an unedited one follows its renamed token ("${nameOf(sp, '020')}")`);
    await draw(t20.api, contract, { types: ['dimension'] });
    await draw(t20.api, contract, { titleCell: true });
    ok(nameOf(tableFrame(t20.sem, 'Space')!, '050') === 'Gutter small', '20: the edit survives a run drawn without the title column, and returns with it');
    // THE ORDER THE REVIEW OF f3bb76cd FOUND LOSING AN EDIT: edit, then a run WITHOUT the column (its cells go), then a
    // run with it. The edit is recorded before the cells go, so it comes back.
    titleText(tableFrame(t20.sem, 'Space')!, '100').characters = 'Row gap';
    await draw(t20.api, contract, { types: ['dimension'] });
    await draw(t20.api, contract, { titleCell: true });
    ok(nameOf(tableFrame(t20.sem, 'Space')!, '100') === 'Row gap', `20: a title edited, then a run without the column, then one with it: the edit comes back ("${nameOf(tableFrame(t20.sem, 'Space')!, '100')}")`);
    // A TITLE EDIT IS NOT AN EDIT TO THE TABLE: a superseded table whose only change is a title is deleted, unedited;
    // one with a value retyped is kept.
    titleText(tableFrame(t20.sem, 'Radius')!, 'md').characters = 'Medium corner, for cards';
    const dv = gridOf(tableFrame(t20.prim, 'Density')!);
    const dText = cellAt(dv, rowBy(dv, 'space/gap'), 3)!.findOne((k) => k.type === 'TEXT')!;
    dText.characters = String(dText.characters).replace('8px', '9px');
    for (let i = t20.vars.length - 1; i >= 0; i--) if (/^pds3\/radius\/|^density\//.test(t20.vars[i].name)) t20.vars.splice(i, 1);
    const sup = await draw(t20.api, contract, { titleCell: true });
    ok(sup.deleted.includes('Style guide — Radius') && !tableFrame(t20.sem, 'Radius'),
      `20: a superseded table whose only change is a retitled row is deleted, unedited (deleted ${JSON.stringify(sup.deleted)}; kept ${JSON.stringify(sup.kept)})`);
    ok(JSON.stringify(sup.kept) === JSON.stringify([{ name: 'Style guide — Density', reason: 'edited' }]), `20: one with a value retyped is still kept as edited (${JSON.stringify(sup.kept)})`);
  }

  console.log('21. the review of 4faeb98a: variable kinds, a refused resize, fonts loaded, pinned before bound, superseded phase-2 tables');
  {
    // (1) A FLOAT IS A LENGTH ONLY WHEN ITS SCOPES OR NAME SAY SO. Literal fixtures, one per shape the review found on
    // the reference/ exports (Prism2, New Balance), plus camelCase names and a FLOAT nothing places.
    const kindOf = (name: string, scopes: string[] = [], resolvedType = 'FLOAT'): string | null =>
      varKind({ id: name, name, variableCollectionId: 'c', resolvedType, valuesByMode: {}, scopes });
    const shapes: [string, string[], string, string][] = [
      ['pds/motion/duration/fast', [], 'FLOAT', 'duration'],
      ['pds/motion/transition/enter/delay', [], 'FLOAT', 'duration'],
      ['pds/motion/easing/ease-in', [], 'STRING', 'motion'],
      ['pds/shadow/md/top/offsetY', ['EFFECT_FLOAT'], 'FLOAT', 'effect'],
      ['pds/shadow/md/bottom/blur', [], 'FLOAT', 'effect'],
      ['pds/color/gradient/brand/primary/stops/0/position', [], 'FLOAT', 'gradient'],
      ['pds/color/gradient/brand/primary/angle', [], 'FLOAT', 'gradient'],
      ['nbds/font/paragraph-spacing/16', ['PARAGRAPH_SPACING'], 'FLOAT', 'paragraphSpacing'],
      ['brand/text/paragraphSpacing/body', [], 'FLOAT', 'paragraphSpacing'],
      ['pds/font/lineHeight/body/default', [], 'FLOAT', 'lineHeight'],
      ['nbds/font/lineheight/1p1', [], 'FLOAT', 'lineHeight'],
      ['pds/font/letterSpacing/tight', [], 'FLOAT', 'letterSpacing'],
      ['brand/fade/disabled', ['OPACITY'], 'FLOAT', 'opacity'],
      ['pds/dimension/4', [], 'FLOAT', 'scale'],
      ['pds3/core/dimension/4', ['WIDTH_HEIGHT', 'GAP', 'CORNER_RADIUS', 'STROKE_FLOAT'], 'FLOAT', 'scale'],
    ];
    const wrong = shapes.filter(([n, sc, t, k]) => kindOf(n, sc, t) !== k).map(([n, sc, t, k]) => `${n} → ${kindOf(n, sc, t)}, not ${k}`);
    ok(wrong.length === 0, `21: each reviewed shape takes its own kind: durations, a shadow by scope and by name, gradient stops, a paragraph spacing by scope and by name, camelCase line heights and letter spacing (${wrong.join('; ')})`);
    ok(kindOf('misc/ratio/golden') === 'other' && kindOf('misc/ratio/golden', ['ALL_SCOPES']) === 'other',
      `21: a FLOAT neither its scopes nor its name place is "other", never a length (misc/ratio/golden → ${kindOf('misc/ratio/golden')})`);
    // Planned: only the two scales draw as dimensions; every other shape is named as a later phase, never a bracket.
    const legacy: SgCatalog = {
      collections: [{ id: 'L', name: 'legacy', modes: [{ modeId: 'L:0', name: 'Default' }], defaultModeId: 'L:0' }],
      variables: shapes.concat([['misc/ratio/golden', [], 'FLOAT', 'other']]).map(([name, scopes, resolvedType], i) =>
        ({ id: `V:${i}`, name, variableCollectionId: 'L', resolvedType, valuesByMode: { 'L:0': resolvedType === 'STRING' ? 'ease-in' : 200 }, scopes })),
    };
    const lp = planStyleGuide(legacy, null, { types: ['dimension'] });
    const lpOpen = planStyleGuide(legacy, null, {});
    const dimRows = lp.tables.flatMap((t) => t.rows.map((r) => r.name));
    ok(JSON.stringify(dimRows) === JSON.stringify(['pds/dimension/4', 'pds3/core/dimension/4']),
      `21: planned, only the two scales are drawn as dimensions: no duration, shadow, gradient or paragraph spacing is a "200px · 12.5rem" bracket (${dimRows.join(', ')})`);
    ok(lpOpen.notes.includes('Not drawn until a later phase: 2 duration, 1 motion, 2 shadow and effect, 2 gradient, 2 paragraph spacing, 1 opacity, 1 other number or string variables'),
      `21: each is reported as not drawn until a later phase, by kind (${lpOpen.notes.join(' / ')})`);

    // (2) A PADDING BIND THE HOST REFUSES, and one it accepts that the width does not follow: the run completes, and
    // each is counted and named by table and token. (The resize this replaced is gone: a width written inside an
    // instance is silently dropped, so the run no longer writes one.)
    const rz = await phase2File();
    refuseBinding = true;
    let rr: StyleGuideResult;
    try { rr = await draw(rz.api, contract, { tables: ['Space'] }); } finally { refuseBinding = false; }
    const rs = styleGuideSummary(rr);
    // 17 of the 18: space/0 draws nothing, so it binds nothing (owner decision, live QA of 0.210.0).
    ok(rr.tables[0]?.status === 'created' && rr.unbound === 17 && rs.summary.includes('17 display=filled spacing specimens are not bound to their variable') && rs.headline === '⚠ 17 specimens unbound',
      `21: a padding bind the host refuses is counted and named, and the run completes: ${rr.unbound} — "${rs.headline}"`);
    const ig = await phase2File();
    ignorePadding = (n) => n.name === 'spacing-filled-example' && insideInstance(n);
    let ri: StyleGuideResult;
    try { ri = await draw(ig.api, contract, { tables: ['Space'] }); } finally { ignorePadding = null; }
    // 17, not 18: space/0 draws nothing (owner decision, live QA of 0.210.0). The other 17 stay at the member's 0.01.
    ok(ri.unbound === 17 && ri.misses.includes("17 display=filled spacing specimens are not sized to their value: bound by their left padding, the layer did not take the value's width (Space: 025, 050, 075 and 14 more)"),
      `21: a padding bind the width does not follow is read back, counted and named: ${ri.unbound} unbound`);

    // (3) + (4) FONTS, LOADED BEFORE THEY ARE BOUND, IN THE MODE PINNED FIRST. A family that varies by mode, whose
    // default mode (product) is the SECOND column; a weight at 800 (Inter Extra Bold, which Set up file never loads);
    // a text style in a font no other test uses. The shim throws on any of them unloaded.
    const fc21 = page(FC), prim21 = page(PRIM), sem21 = page(SEM);
    fc21.appendChild(headerSet());
    const cols21: ShimCol[] = [{ id: 'VariableCollectionId:bf', name: 'brand-fonts', modes: [{ modeId: 'bf:0', name: 'editorial' }, { modeId: 'bf:1', name: 'product' }], defaultModeId: 'bf:1' }];
    const vars21: ShimVar[] = [
      { id: 'VariableID:bf:0', name: 'brand/font/family/body', variableCollectionId: 'VariableCollectionId:bf', resolvedType: 'STRING', description: '', valuesByMode: { 'bf:0': 'Proof Serif', 'bf:1': 'Proof Sans' }, scopes: ['FONT_FAMILY'] },
      { id: 'VariableID:bf:1', name: 'brand/font/weight/heavy', variableCollectionId: 'VariableCollectionId:bf', resolvedType: 'FLOAT', description: '', valuesByMode: { 'bf:0': 800, 'bf:1': 800 }, scopes: ['FONT_WEIGHT'] },
    ];
    const styles21: ShimStyle[] = [{ id: 'S:proof:', name: 'proof/mono', description: '', fontName: { family: 'Proof Mono', style: 'Medium' }, fontSize: 14, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PERCENT', value: 0 }, paragraphSpacing: 0, textDecoration: 'NONE', boundVariables: {} }];
    const s21 = makeShim([page('Cover'), prim21, sem21, fc21], cols21, vars21, styles21);
    await ensureStyleGuideCells(s21.api, fc21);
    const r21 = await draw(s21.api, contract);
    const specText = (w: N | undefined, col: number): N | null => (w ? cellAt(gridOf(w), 1, col)?.findOne((k) => k.type === 'TEXT') ?? null : null);
    const famW = tableFrame(prim21, 'Font family');
    const [ed, pr] = [specText(famW, 1), specText(famW, 3)];
    ok(s21.world.loads.includes('Proof Serif Regular') && s21.world.loads.includes('Proof Sans Regular') && pr?.boundVariables.fontFamily?.id === 'VariableID:bf:0' && fontId(pr?.fontName) === 'Proof Sans Regular',
      `21: a family is loaded before it is bound (loaded ${s21.world.loads.filter((f) => f.startsWith('Proof S')).join(', ')}; product column ${fontId(pr?.fontName)})`);
    ok(ed?.boundVariables.fontFamily?.id === 'VariableID:bf:0' && fontId(ed?.fontName) === 'Proof Serif Regular' && ed?.parent?.explicitVariableModes['VariableCollectionId:bf'] === 'bf:0',
      `21: pinned before bound: the editorial column, not the collection's default mode, binds in its own font, Proof Serif (${fontId(ed?.fontName)}, bound ${ed?.boundVariables.fontFamily?.id})`);
    const heavy = specText(tableFrame(prim21, 'Font weight'), 1);
    ok(s21.world.loads.includes('Inter Extra Bold') && heavy?.boundVariables.fontWeight?.id === 'VariableID:bf:1' && fontId(heavy?.fontName) === 'Inter Extra Bold',
      `21: a weight is bound after the cell's family at that weight is loaded, Inter Extra Bold (${fontId(heavy?.fontName)})`);
    const mono = specText(tableFrame(sem21, 'Text styles'), 1);
    ok(s21.world.loads.includes('Proof Mono Medium') && mono?.textStyleId === 'S:proof:',
      `21: a text style is applied after its font, Proof Mono Medium, is loaded (style ${mono?.textStyleId || 'not applied'})`);
    ok(r21.unbound === 0, `21: every font specimen bound: ${r21.unbound} unbound (${r21.misses.join(' / ')})`);

    // (5) SUPERSEDED PHASE-2 TABLES. An unedited dimension table (density, its variables gone) and text-style table (every
    // style moved under brand/, so its key moves) are deleted. A dimension table whose value moved is kept: the host
    // repaints a bound bar's width, replayed here, and width is in the fingerprint.
    const sp = await phase2File();
    await draw(sp.api, contract);
    // The host follows a bound padding live, and so does the shim: moving the value moves the bar with no rerun.
    const m16 = sp.vars.find((v) => v.name === 'metrics/step/16')!;
    const bound16 = tablesOn(sp.prim).flatMap((w) => w.findAll((k) => k.boundVariables?.paddingLeft?.id === m16.id));
    const w16 = bound16[0]?.width;
    m16.valuesByMode['metrics:0'] = 20;
    const repainted = bound16.filter((b) => b.width === 20 && w16 === 16);
    // Superseded by a regrouping, which moves each table's key while its variables (and their bindings) stay: density's
    // variables move under `dense/`, metrics' steps under `metrics/rung/`.
    for (const v of sp.vars) { if (/^density\//.test(v.name)) v.name = v.name.replace(/^density\//, 'dense/'); if (/^metrics\/step\//.test(v.name)) v.name = v.name.replace('/step/', '/rung/'); }
    for (const st of sp.styles) st.name = `brand/${st.name}`;
    const sup = await draw(sp.api, contract);
    ok(repainted.length === 1 && JSON.stringify([...sup.deleted].sort()) === JSON.stringify(['Style guide — Density', 'Style guide — Text styles']) && !tableFrame(sp.prim, 'Density') && !!tableFrame(sp.prim, 'Dense'),
      `21: an unedited superseded dimension table and text-style table are deleted (deleted ${JSON.stringify(sup.deleted)})`);
    const tsNow = tablesOn(sp.sem).filter((w) => w.name === 'Style guide — Text styles');
    ok(tsNow.length === 1 && tsNow[0].pluginData['prism3-style-guide'] === 'typography|text-styles|brand', `21: the text styles are drawn once, under their new key (${tsNow.map((w) => w.pluginData['prism3-style-guide']).join(', ')})`);
    ok(JSON.stringify(sup.kept) === JSON.stringify([{ name: 'Style guide — Step', reason: 'edited' }]) && styleGuideSummary(sup).summary.includes('edited: Style guide — Step'),
      `21: a superseded dimension table whose value moved is kept and reported as edited (${JSON.stringify(sup.kept)})`);
  }

  console.log("22. the owner's cell structure (the live run of 4faeb98a): every spacing specimen sized, the bracket's right edge carried");
  {
    // The owner's file: their swatches (with their type=radius) and their spacing cells on "Style Guide Components",
    // adopted; the text cells built. A plain dimension scale (the bracket), a spacing ramp (the filled bar), a radius.
    const ownerFile = async (spacing: N | null): Promise<Shim & { prim: N }> => {
      const fc = page(FC), prim = page(PRIM), sem = page(SEM), sgc = page('Style Guide Components');
      fc.appendChild(headerSet());
      // `null`: no owner cells at all, so Set up file's real builder makes all three sets (the "Prism3 Approved MCP
      // Testing File" case, live 2026-09-29).
      if (spacing) {
        const sw = ownerSet('_style-guide-swatches', ['type=Default', 'type=Text'], true);
        sw.appendChild(ownerRadiusMember());
        sgc.appendChild(sw); sgc.appendChild(spacing);
      }
      const one = (id: string): ShimCol => ({ id: `VariableCollectionId:${id}`, name: id, modes: [{ modeId: `${id}:0`, name: 'Default' }], defaultModeId: `${id}:0` });
      const cols = [one('core'), one('space'), one('radius')];
      const vars: ShimVar[] = [];
      const add = (col: string, name: string, value: number, scopes: string[]): void => { vars.push({ id: `VariableID:${name}`, name, variableCollectionId: `VariableCollectionId:${col}`, resolvedType: 'FLOAT', description: '', valuesByMode: { [`${col}:0`]: value }, scopes }); };
      for (const n of [0, 4, 8, 64, 128]) add('core', `nbds/dimension/${n}`, n, []);
      for (const n of [4, 64]) add('space', `nbds/space/${n}`, n, ['GAP']);
      add('radius', 'nbds/radius/md', 8, ['CORNER_RADIUS']);
      const s = makeShim([page('Cover'), prim, sem, fc, sgc], cols, vars);
      await ensureStyleGuideCells(s.api, fc);
      return { ...s, prim };
    };
    const layer = (w: N, token: string, name: string): N | null => { const g = gridOf(w); return cellAt(g, rowOf(g, token), 1)?.findOne((k) => k.name === name) ?? null; };
    /** The bracket in the Dimension table's row for `token`: the frame, its bound padding, the line and both bars. */
    const bracket = (w: N, token: string): string => {
      const f = layer(w, token, 'spacing-line-example');
      const part = (n: string): N | null => f?.findOne((k) => k.name === n) ?? null;
      return JSON.stringify({ w: f?.width, bound: f?.boundVariables.paddingLeft?.id === `VariableID:nbds/dimension/${token}`, line: part('horizontal-line')?.width,
        left: part('left-bar')?.x, right: part('right-bar')?.x });
    };
    // THE OWNER'S CELLS, as measured live (fixed-width frames, bars in flow at MIN): a plugin cannot size them inside an
    // instance. Every spacing specimen is counted, and the report says so ONCE, with what the component needs.
    const o = await ownerFile(ownerSpacingSet());
    const r = await draw(o.api, contract);
    const spacingLines = r.misses.filter((m) => /spacing/.test(m));
    ok(r.unbound === 7 && styleGuideSummary(r).headline === '⚠ 7 specimens unbound' && spacingLines.length === 1
      && spacingLines[0] === '7 spacing specimens are not sized, in 2 tables. _style-guide-spacing-cells: make spacing-filled-example a hug frame sized by left padding, with any bars positioned absolutely. Figma does not let a plugin resize a layer inside an instance.',
      `22: the owner's fixed-width cells: all 7 spacing specimens counted, and one line says what the component needs (${spacingLines.join(' / ')})`);
    const rx = tableFrame(o.prim, 'Radius') ? gridOf(tableFrame(o.prim, 'Radius')!) : null;
    const ex = rx ? cellAt(rx, rowOf(rx, 'md'), 1)?.findOne((k) => k.name === 'radius-example') : null;
    ok(['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].every((k) => ex?.boundVariables[k]?.id === 'VariableID:nbds/radius/md'),
      `22: the owner's radius swatch binds all four corners of radius-example, the layer its clip shows (${Object.keys(ex?.boundVariables ?? {}).join(', ') || 'none bound'})`);

    // THE OWNER'S CELLS AS RESTRUCTURED (their layer names, the padding recipe's tree): sized like the built ones.
    const orr = await ownerFile(ownerSpacingSet('restructured'));
    const rro = await draw(orr.api, contract);
    // The bracket, from a run whose one spacing style is `line` (decision 18), on its own file.
    const orrL = await ownerFile(ownerSpacingSet('restructured'));
    const rroL = await draw(orrL.api, contract, { dimensionDisplay: 'line' });
    const dimO = tableFrame(orrL.prim, 'Dimension')!;
    const spaceO = tableFrame(orr.prim, 'Space')!;
    const filledO = (t: string): string => { const f = layer(spaceO, t, 'spacing-filled-example'); return `${f?.width}:${f?.boundVariables.paddingLeft?.id === `VariableID:nbds/space/${t}`}`; };
    ok(bracket(dimO, '4') === JSON.stringify({ w: 4, bound: true, line: 4, left: 0, right: 3 }) && bracket(dimO, '64') === JSON.stringify({ w: 64, bound: true, line: 64, left: 0, right: 63 })
      && filledO('4') === '4:true' && filledO('64') === '64:true' && rro.unbound === 0 && rroL.unbound === 0 && ![...rro.misses, ...rroL.misses].some((m) => /spacing/.test(m)),
      `22: the owner's cells restructured to the padding recipe are sized: the bracket 4 and 64, right-bar at 3 and 63, the bar 4 and 64, nothing unbound (${bracket(dimO, '4')} ${bracket(dimO, '64')} ${filledO('4')} ${filledO('64')}; ${rro.unbound})`);

    // THE FLOOR (live QA of 0.210.0, 2026-09-30: 102 unsized went to 18, every one a value of 8 or less): a layer inside
    // an instance never hugs narrower than its main's own width. The owner's cells as they were before that QA rest 8
    // wide, so 4 stays 8 and is counted by table and token; 8 and 64 are sized; the zero draws nothing.
    const o8 = await ownerFile(ownerSpacingSet('rest8'));
    const r8 = await draw(o8.api, contract, { dimensionDisplay: 'line' });
    const dim8 = tableFrame(o8.prim, 'Dimension')!;
    ok(r8.unbound === 2 && r8.misses.includes("2 display=line spacing specimens are not sized to their value: bound by their left padding, the layer did not take the value's width (Dimension: 4; Space: 4)")
      && bracket(dim8, '4') === JSON.stringify({ w: 8, bound: true, line: 8, left: 0, right: 7 }) && bracket(dim8, '8') === JSON.stringify({ w: 8, bound: true, line: 8, left: 0, right: 7 })
      && bracket(dim8, '64') === JSON.stringify({ w: 64, bound: true, line: 64, left: 0, right: 63 }),
      `22: cells resting 8 wide cannot draw below 8: 4 stays 8 and is counted by table and token, 8 and 64 are sized (${r8.unbound}; ${r8.misses.filter((m) => /spacing/.test(m)).join(' / ')}; ${bracket(dim8, '4')} ${bracket(dim8, '64')})`);
    // A ZERO DRAWS NOTHING (owner decision, live QA of 0.210.0): the specimen is hidden and counted as drawn; the row
    // keeps its name and its 0px value.
    const g0 = gridOf(dimO), z0 = cellAt(g0, rowOf(g0, '0'), 1);
    const zText = cellAt(g0, rowOf(g0, '0'), 2)?.findOne((k) => k.type === 'TEXT')?.characters;
    const zName = cellAt(g0, rowOf(g0, '0'), 0)?.findOne((k) => k.type === 'TEXT')?.characters;
    ok(z0?.type === 'INSTANCE' && z0.visible === false && !z0.findOne((k) => k.name === 'spacing-line-example')?.boundVariables.paddingLeft && rroL.unbound === 0 && zName === '0' && zText === '0px',
      `22: dimension/0 draws nothing: its specimen hidden, not bound and not counted, its row still "0 | 0px" (${z0?.type} visible ${z0?.visible}; ${rroL.unbound} unbound; ${zName} | ${zText})`);

    // THE CELLS SET UP FILE BUILDS, by the real builder: sized by their left padding at the value, the bracket's
    // absolute bars carried by the constraints set in the component (left-bar MIN, horizontal-line STRETCH, right-bar
    // MAX). Literal widths: 4 → 4 and 64 → 64, the line as wide, right-bar at 3 and 63.
    const ob = await ownerFile(null);
    const rb = await draw(ob.api, contract);
    const obL = await ownerFile(null);
    const rbL = await draw(obL.api, contract, { dimensionDisplay: 'line' });
    const dimB = tableFrame(obL.prim, 'Dimension')!;
    const spaceB = tableFrame(ob.prim, 'Space')!;
    const filledB = (t: string): string => { const f = layer(spaceB, t, 'spacing-filled-example'); return `${f?.width}:${f?.boundVariables.paddingLeft?.id === `VariableID:nbds/space/${t}`}`; };
    const exB = cellAt(gridOf(tableFrame(ob.prim, 'Radius')!), 1, 1)?.findOne((k) => k.name === 'radius-example');
    ok(bracket(dimB, '4') === JSON.stringify({ w: 4, bound: true, line: 4, left: 0, right: 3 })
      && bracket(dimB, '64') === JSON.stringify({ w: 64, bound: true, line: 64, left: 0, right: 63 }) && rbL.unbound === 0,
      `22: the built bracket is drawn at its value by its bound left padding: 4 and 64 wide, the line as wide, right-bar at 3 and 63 (${bracket(dimB, '4')} ${bracket(dimB, '64')})`);
    ok(filledB('4') === '4:true' && filledB('64') === '64:true', `22: the built filled bar is drawn at its value by its bound left padding: 4px → 4, 64px → 64 (${filledB('4')}, ${filledB('64')})`);
    // SHRINK AFTER GROW (live QA of 0.210.0, the owner's measurement): a frame bound to 24, then rebound to 2, stays 24
    // under HUG alone; FIXED then HUG after the bind (the owner's recipe c) takes it to 2. On a fresh instance of the
    // built bracket: 24 wide with right-bar at 23, then 2 wide with right-bar at 1, as the owner measured live.
    const lineMember = setsNamed(obL.pages, '_style-guide-spacing-cells')[0]?.children.find((c) => c.name === 'display=line');
    const grown = lineMember?.createInstance();
    const gf = grown?.children[0];
    const vOf = (n: number): ShimVar => { const v: ShimVar = { id: `VariableID:shrink/${n}`, name: `shrink/${n}`, variableCollectionId: 'VariableCollectionId:core', resolvedType: 'FLOAT', description: '', valuesByMode: { 'core:0': n }, scopes: [] }; active!.vars.push(v); return v; };
    const v24 = vOf(24), v2 = vOf(2);
    const rb24 = gf ? (sizeByPadding(gf as never, (n) => { (n as unknown as N).setBoundVariable('paddingLeft', v24); return true; }), `${gf.width} right ${gf.findOne((k) => k.name === 'right-bar')?.x}`) : 'none';
    const rb2 = gf ? (sizeByPadding(gf as never, (n) => { (n as unknown as N).setBoundVariable('paddingLeft', v2); return true; }), `${gf.width} right ${gf.findOne((k) => k.name === 'right-bar')?.x}`) : 'none';
    ok(rb24 === '24 right 23' && rb2 === '2 right 1', `22: a bracket grown to 24 and rebound to 2 shrinks to 2, right-bar at 23 then 1 (${rb24}; ${rb2})`);
    ok(['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].every((k) => exB?.boundVariables[k]?.id === 'VariableID:nbds/radius/md') && rb.unbound === 0
      && styleGuideSummary(rb).headline === '✓ style guide: 3 tables',
      `22: the built radius swatch's four corners bound, and nothing unbound: "${styleGuideSummary(rb).headline}" (${rb.misses.join(' / ')})`);

    // A CELL THIS BUILD CANNOT READ: never a silent pass.
    const od = await ownerFile(ownerSpacingSet('odd'));
    const rd = await draw(od.api, contract, { types: ['dimension'] });
    ok(rd.unbound === 7 && rd.misses.includes('7 display=filled specimens are not bound: the member has no layer this build can size or bind (a Bar, a first frame, or a layer named *-example), so they show the cell component\'s own value (Dimension: 0, 4, 8 and 2 more; Space: 4, 64)')
      && styleGuideSummary(rd).headline === '⚠ 7 specimens unbound',
      `22: a spacing cell with no layer to size reports each specimen unbound, by table and token: ${rd.unbound} — "${styleGuideSummary(rd).headline}"`);
  }

  console.log('23. rows by category (owner decision 16): left to right within a category, a new row per category');
  {
    const rw = await phase2File();
    await draw(rw.api, contract);
    const at = (title: string): string => { const w = tableFrame(rw.prim, title)!; return `${w.x},${w.y}`; };
    // The Primitive page holds two categories: dimension (Dimension 610 wide, its REM column included and 1,970 tall, Density, Step) and font
    // variables (Font family 974 wide, …). The font row starts 160px below the dimension row's tallest table.
    ok(JSON.stringify(['Dimension', 'Density', 'Font family', 'Font size (core)'].map(at)) === JSON.stringify(['0,0', '770,0', '0,2130', '1134,2130']),
      `23: two categories, two tables each, at literal positions: Dimension 0,0 and Density 770,0; Font family 0,2130 and Font size (core) 1134,2130 (${['Dimension', 'Density', 'Font family', 'Font size (core)'].map(at).join(' | ')})`);
    const rowOfCat = (cat: RegExp): N[] => tablesOn(rw.prim).filter((w) => cat.test(w.pluginData['prism3-style-guide'])).sort((a, b) => a.x - b.x);
    const dimRow = rowOfCat(/^dimension\|/), fontRow = rowOfCat(/^(fontFamily|fontSize|fontWeight|lineHeight|letterSpacing)\|/);
    const rowGaps = (ns: N[]): number[] => ns.slice(1).map((n, i) => n.x - (ns[i].x + ns[i].width));
    ok(dimRow.length === 3 && fontRow.length === 5 && [dimRow, fontRow].every((r) => r.every((n) => n.y === r[0].y) && rowGaps(r).every((g) => g === 160)),
      `23: each category's tables are top-aligned, 160px apart (${rowGaps(dimRow).join(', ')} | ${rowGaps(fontRow).join(', ')})`);
    // A WIDTH CHANGE in row 1, by a filtered run: Density's description column widens by a 100-character description;
    // Step, after it in its row, moves right by exactly that; Dimension and the whole font row stay.
    const snap = new Map(tablesOn(rw.prim).map((w) => [w, { x: w.x, y: w.y }]));
    const moved = (w: N): string => `${w.x - snap.get(w)!.x},${w.y - snap.get(w)!.y}`;
    const densityW = tableFrame(rw.prim, 'Density')!;
    const dw0 = densityW.width;
    rw.vars.find((v) => v.name === 'density/space/gap')!.description = 'W'.repeat(100);
    await draw(rw.api, contract, { tables: ['Density'] });
    const dDelta = densityW.width - dw0;
    ok(dDelta === WIDEN_DENSITY && moved(tableFrame(rw.prim, 'Step')!) === `${WIDEN_DENSITY},0` && moved(tableFrame(rw.prim, 'Dimension')!) === '0,0' && fontRow.every((w) => moved(w) === '0,0'),
      `23: a width change in row 1 moves only row 1's later tables, by exactly it: Density +${dDelta}px, Step ${moved(tableFrame(rw.prim, 'Step')!)}, the font row ${[...new Set(fontRow.map(moved))].join(' ')}`);
    // A HEIGHT CHANGE in row 1: two new steps make Dimension, the row's tallest, two rows taller; the font row moves down
    // by exactly that, and row 1 stays where it is.
    for (const w of tablesOn(rw.prim)) snap.set(w, { x: w.x, y: w.y });
    const dimW = tableFrame(rw.prim, 'Dimension')!;
    const [h0, w0] = [dimW.height, dimW.width];
    for (const n of [7, 9]) rw.vars.push({ id: `VariableID:core:grow${n}`, name: `pds3/core/dimension/${n}`, variableCollectionId: 'VariableCollectionId:core', resolvedType: 'FLOAT', description: '', valuesByMode: { 'core:0': n }, scopes: ['WIDTH_HEIGHT', 'GAP', 'CORNER_RADIUS', 'STROKE_FLOAT'] });
    await draw(rw.api, contract, { tables: ['Dimension'] });
    const hDelta = dimW.height - h0;
    ok(hDelta === GROW_DIMENSION && dimW.width === w0 && fontRow.every((w) => moved(w) === `0,${GROW_DIMENSION}`) && dimRow.every((w) => moved(w) === '0,0'),
      `23: a height change in row 1 moves row 2 down by exactly it: Dimension +${hDelta}px tall, the font row ${[...new Set(fontRow.map(moved))].join(' ')}, row 1 ${[...new Set(dimRow.map(moved))].join(' ')}`);
    // A FIRST-TIME TABLE IN A NEW CATEGORY, drawn by a filtered run, starts a new row: 160px below the lowest table, at
    // the row's left edge.
    const nc = await phase2File();
    await draw(nc.api, contract, { types: ['dimension'] });
    const lowest = Math.max(...tablesOn(nc.prim).map((w) => w.y + w.height));
    await draw(nc.api, contract, { tables: ['Font family'] });
    const ff = tableFrame(nc.prim, 'Font family');
    ok(ff?.x === 0 && ff?.y === lowest + 160, `23: a first table of a new category starts a new row, 160px below the lowest (${ff?.x},${ff?.y} for 0,${lowest + 160})`);
  }

  console.log('24. the review of f3bb76cd: no silent spacing miss, one verdict per specimen, a new table that pushes its row down');
  {
    // (3) A HUGGING BRACKET WHOSE BARS ARE IN FLOW: its bars would add their widths to the padding's, so it gets the
    // one restructure line, like a fixed-width frame.
    const shimOwner = async (spacing: N | null): Promise<Shim & { prim: N; fc: N }> => {
      const fc = page(FC), prim = page(PRIM), sem = page(SEM), sgc = page('Style Guide Components');
      fc.appendChild(headerSet());
      if (spacing) sgc.appendChild(spacing);
      const one = (id: string): ShimCol => ({ id: `VariableCollectionId:${id}`, name: id, modes: [{ modeId: `${id}:0`, name: 'Default' }], defaultModeId: `${id}:0` });
      const vars: ShimVar[] = [0, 4, 8, 64, 128].map((n) => ({ id: `VariableID:nbds/dimension/${n}`, name: `nbds/dimension/${n}`, variableCollectionId: 'VariableCollectionId:core', resolvedType: 'FLOAT', description: '', valuesByMode: { 'core:0': n }, scopes: [] }));
      const s = makeShim([page('Cover'), prim, sem, fc, sgc], [one('core')], vars);
      await ensureStyleGuideCells(s.api, fc);
      return { ...s, prim, fc };
    };
    const rn = await shimOwner(ownerSpacingSet('inflow'));
    const rr = await draw(rn.api, contract, { dimensionDisplay: 'line' });
    ok(rr.unbound === 5 && rr.misses.includes('5 spacing specimens are not sized, in 1 table. _style-guide-spacing-cells: make spacing-line-example a hug frame sized by left padding, with any bars positioned absolutely. Figma does not let a plugin resize a layer inside an instance.')
      && styleGuideSummary(rr).headline === '⚠ 5 specimens unbound',
      `24: a hugging bracket with its bars in flow cannot be sized by its padding: all 5 counted, in the one restructure line: ${rr.unbound} — "${styleGuideSummary(rr).headline}" (${rr.misses.filter((m) => /spacing/.test(m)).join(' / ')})`);
    // (4) NO SPACING SET AT ALL (every file set up before phase 2): each spacing specimen is counted, and the run is not
    // a pass. Five brackets here.
    const ns = await shimOwner(null);
    const set = setsNamed(ns.pages, '_style-guide-spacing-cells')[0];
    set.remove();
    const rs = await draw(ns.api, contract);
    ok(setsNamed(ns.pages, '_style-guide-spacing-cells').length === 0 && rs.unbound === 5 && !styleGuideSummary(rs).ok && styleGuideSummary(rs).headline === '⚠ 5 specimens unbound'
      && rs.misses.includes('5 display=filled spacing specimens are not drawn: this file has no _style-guide-spacing-cells set, which Set up file adds (Dimension: 0, 4, 8 and 2 more)'),
      `24: with no spacing set, every spacing specimen is counted and the run is not a pass: ${rs.unbound} — "${styleGuideSummary(rs).headline}"`);
    // (5) ONE VERDICT PER SPECIMEN: a bracket whose padding bind the host refuses counts once, in one report line.
    const one = await shimOwner(null);
    refuseBinding = true;
    let ro: StyleGuideResult;
    try { ro = await draw(one.api, contract); } finally { refuseBinding = false; }
    const spacingMisses = ro.misses.filter((m) => /display=filled/.test(m));
    // Four of the five: dimension/0 draws nothing, so it binds nothing (owner decision, live QA of 0.210.0).
    ok(ro.unbound === 4 && spacingMisses.length === 1 && spacingMisses[0].startsWith('4 display=filled spacing specimens are not bound to their variable'),
      `24: four bars whose padding bind is refused count once each, 4, in one report line; the zero binds nothing (${ro.unbound}; ${spacingMisses.join(' / ')})`);
    // (2) A NEW TABLE FROM A FILTERED RUN, TALLER THAN ITS ROW, pushes the rows below it down: an 80-step collection
    // drawn alone lands at the end of the dimension row, and the font row moves to 160px below it.
    const tl = await phase2File();
    await draw(tl.api, contract);
    tl.cols.push({ id: 'VariableCollectionId:tall', name: 'tall', modes: [{ modeId: 'tall:0', name: 'Default' }], defaultModeId: 'tall:0' });
    for (let i = 1; i <= 80; i++) tl.vars.push({ id: `VariableID:tall:${i}`, name: `tall/ramp/${i}`, variableCollectionId: 'VariableCollectionId:tall', resolvedType: 'FLOAT', description: '', valuesByMode: { 'tall:0': i }, scopes: ['WIDTH_HEIGHT'] });
    const fontBefore = tablesOn(tl.prim).filter((w) => /^(fontFamily|fontSize|lineHeight|letterSpacing)\|/.test(w.pluginData['prism3-style-guide']));
    const rt = await draw(tl.api, contract, { tables: ['Ramp'] });
    const ramp = tableFrame(tl.prim, 'Ramp');
    ok(rt.tables[0]?.status === 'created' && ramp?.y === 0 && ramp.height === RAMP_H && fontBefore.every((w) => w.y === RAMP_H + 160),
      `24: a new 80-step table lands at the end of the dimension row, ${ramp?.height}px tall, and the font row moves to 160px below it, y ${RAMP_H + 160} (${[...new Set(fontBefore.map((w) => w.y))].join(', ')})`);
  }

  if (failures) { console.error(`\n${failures} style-guide check(s) failed`); process.exit(1); }
  console.log('\nstyle guide: all checks pass');
};

void main();
