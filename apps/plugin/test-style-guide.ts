/**
 * STYLE-GUIDE test (#259, phase 1: color) — the cell sets and the color tables.
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
 *  10. a RERUN RE-STACKS the generator's tables when one grows, leaving a designer-moved table alone; a grid that drops its
 *      HUG column or row tracks, and a header that does not take its table's width, are named. Column widths (sections 2
 *      and 5) are read off the shim's own layout model — 7px a character, a HUG track as wide as its widest cell's
 *      content, 2px between tracks — never off the plugin's arithmetic;
 *  11. SUPERSEDED tables (owner decision, 2026-09-28): an unedited replaced or stale table is deleted, header and
 *      cells with it, and the stack closes over it; one with a text cell retyped, one moved, one with no
 *      fingerprint and a duplicate of one are kept and reported apart; a frame the generator did not make is
 *      never touched, whatever its name. The edits are made to the shim's nodes here, never through the plugin;
 *  12. THE OWNER'S GRID MODEL (owner decisions, 2026-09-29): HUG tracks 2px apart, every cell FILL on both axes, the
 *      swatch FIXED at its component's size inside its cell, text on one line; the header spans its table, not the
 *      header component's 2,517px; a grid dragged wider keeps every cell as wide as its track, and the table and its
 *      header follow the grid. Whether the HUG tracks take up the extra width is NOT asserted: the typings define HUG
 *      as CSS `fit-content(100%)`, which does not grow past its content, so that is a live-check (docs/45 §7);
 *  13. the TABLES FILTER (#1778): one table drawn in place, the 42 others untouched and never stale; a filtered run
 *      moves only the tables below the drawn one, in its column, by exactly its change in height, growing or
 *      shrinking — it closes no gap, leaves a table a designer moved and a table with no position record alone, and
 *      writes no record for a table it does not move; any case, or a key; an unknown name reported with the first 8
 *      titles, and not a pass; a renamed group's old table named as staying until an unfiltered run;
 *  14. YIELDING (#1778), with a counting `yieldTo`: a progress reading per table, a yield after every table, and at
 *      least 12 yields inside the 124-row Inverse table, never more than 10 rows apart;
 *  15. ONE RUN AT A TIME (#1785): a run asked for from the agent link while a panel run is mid-yield is refused, naming
 *      the panel's run, and exactly one set of tables results. (`test-agent-link.ts` drives the same gate through
 *      `main.ts`'s two real entry points.)
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
 *     shrinking back by 148px…" fail; the header-width miss dropped → "10: a header the host will not size…" fails;
 *     the row clause of the track read-back dropped → "10: a grid that did not keep its hugging ROW tracks…" fails; the title list uncapped → "13: an unknown
 *     name is reported by name, with the first 8 titles…" fails; the renamed-table note dropped → "13: a filtered
 *     run that draws a renamed group's new table says the old one stays…" fails; the gate's refusal removed → "15: a
 *     run asked for from the agent link while a panel run is mid-yield is refused…" fails.
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
import { planStyleGuide, runStyleGuide, styleGuideSummary, contrastText, createStyleGuideGate, styleGuideBusy } from './src/style-guide';
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
/** The shim's text metric: every character 7px wide, lines split at "\n". Its own figure, not the plugin's. */
const CHAR_W = 7;
const isAuto = (n: N | null | undefined): boolean => n?.layoutMode === 'HORIZONTAL' || n?.layoutMode === 'VERTICAL';
const padX = (n: N): number => Number(n.paddingLeft ?? 0) + Number(n.paddingRight ?? 0);
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
const padY = (n: N): number => Number(n.paddingTop ?? 0) + Number(n.paddingBottom ?? 0);
/** THE LAYOUT EPOCH: bumped by every write to every node (each `N` is a proxy that counts its writes), so a grid's
 *  tracks are computed once per state of the file rather than once per read. A 124-row table's fingerprint reads
 *  1,750 cell widths, each a column of 125 cells: uncached, the suite ran ~8× slower. The proxy cannot see a write
 *  inside a nested object; the only layout-bearing ones are a node's `children` (bumped by hand in `appendChild`)
 *  and a grid track's `type` written in place, which the plugin does only where assigning the whole array throws,
 *  and the shim's assignment never throws. */
let epoch = 0;
const BUMP: ProxyHandler<object> = {
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
  x = 0;
  y = 0;
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
    if (this.type === 'TEXT' && this.textAutoResize === 'WIDTH_AND_HEIGHT') return naturalOf(this);
    const p = this.parent;
    if (this.lsh === 'FILL' && p) {
      if (p.layoutMode === 'GRID' && this.gridCol !== undefined) return trackW(p, this.gridCol);
      if (isAuto(p)) return p.width - padX(p);
    }
    if (this.layoutMode === 'GRID' && this.lsh === 'HUG') return hugGridW(this);
    const hug = this.lsh === 'HUG' || (this.lsh === undefined && ((this.layoutMode === 'HORIZONTAL' && this.primaryAxisSizingMode === 'AUTO') || (this.layoutMode === 'VERTICAL' && this.counterAxisSizingMode === 'AUTO')));
    if (hug && isAuto(this)) return contentW(this);
    return this.w;
  }
  set width(v: number) { this.w = v; }
  // Heights: a text is its lines; a FILL child in a grid is its row's track; a hugging grid is its row tracks; an
  // auto-layout frame that hugs vertically is its padding plus its children (summed down a column, the tallest
  // across a row).
  get height(): number {
    if (this.type === 'TEXT') return linesOf(this) * LINE_H;
    const lsv = this.layoutSizingVertical as string | undefined;
    const p = this.parent;
    if (lsv === 'FILL' && p?.layoutMode === 'GRID' && this.gridRow !== undefined) return trackH(p, this.gridRow);
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
  remove(): void { this.detach(); }
  // THE HOST'S QUIRK (live, 2026-09-28): a FIXED text inside an INSTANCE ignores `resize`'s width and keeps its main
  // component's — the owner's 29px label stayed 29px under resize(296, h). Its height still moves. A frame that hugs
  // or fills is FIXED once resized, on both axes, as a designer's drag leaves it.
  resize(w: number, h: number): void {
    let inInstance = false;
    for (let p = this.parent; p; p = p.parent) if (p.type === 'INSTANCE') { inInstance = true; break; }
    if (!(this.type === 'TEXT' && this.lsh === 'FIXED' && inInstance)) this.w = w;
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
  setProperties(p: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(p)) if (this.componentProperties?.[k]) this.componentProperties[k].value = v;
  }
  createInstance(): N {
    const clone = (n: N): N => {
      const c = new N(n === this ? 'INSTANCE' : n.type);
      for (const k of ['name', 'w', 'lsh', 'h', 'layoutSizingVertical', 'x', 'y', 'fills', 'strokes', 'characters', 'fontName', 'segments', 'visible', 'layoutMode',
        'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'primaryAxisSizingMode', 'counterAxisSizingMode', 'textAutoResize', 'textTruncation']) (c as Record<string, unknown>)[k] = (n as Record<string, unknown>)[k];
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
  if (!isAuto(n)) return n.w;
  const ws = n.children.filter((k) => k.visible !== false && k.lsh !== 'FILL').map((k) => k.width);
  const inner = n.layoutMode === 'HORIZONTAL' ? ws.reduce((a, b) => a + b, 0) + Number(n.itemSpacing ?? 0) * Math.max(0, ws.length - 1) : Math.max(0, ...ws);
  return padX(n) + inner;
};
const contentH = (n: N): number => {
  if (n.type === 'TEXT') return linesOf(n) * LINE_H;
  if (n.layoutMode === 'GRID') return hugGridH(n);
  if (!isAuto(n)) return n.h;
  const hs = n.children.filter((k) => k.visible !== false).map((k) => k.height);
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

interface Shim { api: StyleGuideApi & CellsApi; pages: N[]; vars: ShimVar[]; cols: ShimCol[]; fontFails: Set<string> }
interface ShimCol { id: string; name: string; modes: { modeId: string; name: string }[]; defaultModeId: string }
interface ShimVar { id: string; name: string; variableCollectionId: string; resolvedType: string; description: string; valuesByMode: Record<string, unknown> }

const makeShim = (pages: N[], cols: ShimCol[], vars: ShimVar[]): Shim => {
  const fontFails = new Set<string>();
  const root = {
    get children() { return pages; },
    findAllWithCriteria: (c: { types: string[] }) => pages.flatMap((p) => p.findAllWithCriteria(c)),
  };
  const api = {
    root,
    loadAllPagesAsync: async () => {},
    loadFontAsync: async (f: { family: string; style: string }) => { if (fontFails.has(`${f.family} ${f.style}`)) throw new Error('no font'); },
    createFrame: () => new N('FRAME'),
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
  return { api: api as unknown as StyleGuideApi & CellsApi, pages, vars, cols, fontFails };
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
  const kids = n.children.filter((k) => k.visible !== false);
  if (n.layoutMode === 'HORIZONTAL') return padX(n) + kids.reduce((a, k) => a + need(k), 0) + Number(n.itemSpacing ?? 0) * Math.max(0, kids.length - 1);
  if (n.layoutMode === 'VERTICAL') return padX(n) + Math.max(0, ...kids.map(need));
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
    ok(sw?.children.every((c) => !!c.findOne((k) => k.name === 'Specimen')), '1: every swatch has a Specimen node');
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
    ok(sem.reduce((n, t) => n + t.rows.length, 0) === 267 && prim.filter((t) => t.title !== 'Legacy').reduce((n, t) => n + t.rows.length, 0) === 164, '3: every color variable is a row (267 + 164)');
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
    ok(planStyleGuide(catalog, contract, { types: ['dimension'] }).tables.length === 0 && planStyleGuide(catalog, contract, { types: ['dimension'] }).notes.includes('dimension: not in this phase — color only'), '3: a later-phase type is named, not drawn');
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
    const textCells = grids.flatMap((x) => x.children.filter((k) => k.type === 'INSTANCE'));
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
    ok(boundId(cellAt(neutral, nr, 1)?.children[0]?.findOne((k) => k.name === 'Specimen')?.fills) === idOf('pds3/core/palette/neutral/050'), '5: a primitive swatch is bound to its step');
    ok(cellAt(neutral, nr, 1)?.children[0]?.explicitVariableModes['VariableCollectionId:core'] === 'core:0', '5: a primitive swatch pins its one mode');
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
    ok(byTitle('primitive', 'Primary')!.description === '20 primitive colors in core, 19 referenced by a semantic role', '8: Primary header counts its referenced steps');
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

    // A swatch member with layers and no paint anywhere: nothing binds, and the verdict says how many — 74
    // prism3 roles draw the plain swatch, in four modes: 296.
    const fc = page(FC), sgc = page('Style Guide Components'), sem = page(SEM);
    const sw = ownerSet('_style-guide-swatches', ['type=Default', 'type=Text'], true);
    const def = sw.children[0]; def.fills = []; const grp = new N('GROUP'); grp.name = 'Group'; def.appendChild(grp);
    sgc.appendChild(sw); sgc.appendChild(ownerSet('_style-guide-text-cells', ['color=dark, textAlign=left, type=header, padding=default', 'color=white, textAlign=left, type=default, padding=default'], false));
    const u = await draw(makeShim([fc, sgc, sem], prism3Variables().cols, prism3Variables().vars).api, contract, { collections: ['color'] });
    const us = styleGuideSummary(u);
    ok(u.unbound === 296 && !us.ok && us.headline === '⚠ 296 swatches unbound', `9: unbound swatches are not a pass — headline "${us.headline}"`);
    ok(us.summary.includes('296 swatches in type=Default have no layer that takes a fill'), '9: the summary counts them per variant');

    // Named values first in the file's order, then the numeric steps ascending.
    const named = { collections: cols, variables: [...vars, ...['white', 'black'].map((n, i) => ({ id: `VariableID:legacy:n${i}`, name: `legacy/ramp/${n}`, variableCollectionId: 'VariableCollectionId:legacy', resolvedType: 'COLOR', description: '', valuesByMode: { 'legacy:0': { r: 1, g: 1, b: 1, a: 1 } } }))] };
    ok(JSON.stringify(planStyleGuide(named, contract).tables.find((t) => t.title === 'Legacy')!.rows.map((r) => r.token)) === JSON.stringify(['white', 'black', '5', '50', '100', '900']), '9: named values lead, in file order, then steps ascending');
  }

  console.log('10. a rerun re-stacks the generator\'s tables');
  {
    const r = await fullFile();
    await draw(r.api, contract, { collections: ['color'] });
    const order = (): N[] => r.sem.children.filter((n) => !!n.pluginData['prism3-style-guide']).sort((a, b) => a.y - b.y);
    const gaps = (ns: N[]): number[] => ns.slice(1).map((n, i) => n.y - (ns[i].y + ns[i].height));
    ok(order().length === 11 && gaps(order()).every((d) => d === 160), `10: a first run stacks its tables 160px apart (${gaps(order()).join(', ')})`);
    const text = tableFrame(r.sem, 'Text')!, icon = tableFrame(r.sem, 'Icon')!, border = tableFrame(r.sem, 'Border')!;
    border.y += 5000;
    const [bx, by, iconY, textH] = [border.x, border.y, icon.y, text.height];
    const grow = (n: number, tag: string): void => { for (let i = 0; i < n; i++) r.vars.push({ id: `VariableID:color:${tag}${i}`, name: `pds3/color/text/${tag}-${i}`, variableCollectionId: 'VariableCollectionId:color', resolvedType: 'COLOR', description: 'New', valuesByMode: { 'color:0': { r: 0, g: 0, b: 0, a: 1 }, 'color:1': { r: 1, g: 1, b: 1, a: 1 }, 'color:2': { r: 0, g: 0, b: 0, a: 1 }, 'color:3': { r: 1, g: 1, b: 1, a: 1 } } }); };
    // Ten new rows, each as tall as its specimen, 48 + 12 + 12 = 72, and the 2px gap above it: 74.
    grow(10, 'grow');
    await draw(r.api, contract, { collections: ['color'] });
    ok(text.height - textH === 740 && icon.y - iconY === 740, `10: a table that grows by 10 rows pushes the next table down 740px (Text +${text.height - textH}, Icon +${icon.y - iconY})`);
    ok(border.x === bx && border.y === by, '10: a table a designer moved stays where they put it');
    ok(gaps(order().filter((n) => n !== border)).every((d) => d === 160), `10: the rest stay 160px apart (${gaps(order().filter((n) => n !== border)).join(', ')})`);
    // Tables drawn before the position was recorded: re-flowed while they keep the stack's x.
    for (const n of order()) delete n.pluginData['prism3-style-guide-at'];
    const field = tableFrame(r.sem, 'Field')!;
    field.x += 2000;
    const [fx, fy, iconY2] = [field.x, field.y, icon.y];
    grow(5, 'more');
    await draw(r.api, contract, { collections: ['color'] });
    ok(icon.y - iconY2 === 370, `10: tables from before the position record are re-flowed too: Icon +370 (got +${icon.y - iconY2})`);
    ok(field.x === fx && field.y === fy, "10: a table from before the record, off the stack's x, is taken as moved and left alone");

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
    const afterEdit = async (edit: (t: N, sh: Shim & { prim: N }) => void): Promise<{ r: StyleGuideResult; t: N; sh: Shim & { prim: N } }> => {
      const sh = await fullFile();
      await draw(sh.api, contract, LEG);
      const t = tableFrame(sh.prim, 'Legacy')!;
      edit(t, sh);
      splitLegacy(sh);
      return { r: await draw(sh.api, contract, LEG), t, sh };
    };
    const valueCell = (t: N): N => cellAt(gridOf(t), 1, 2)!;
    const valueText = (t: N): N => valueCell(t).findOne((k) => k.type === 'TEXT')!;
    const ground = (t: N): N => cellAt(gridOf(t), 1, 1)!;
    const swatch = (t: N): N => ground(t).children[0];

    // THE CONTROL: the same run with nothing touched deletes the table, so every "kept" below is the edit's doing.
    const a = await afterEdit(() => {});
    const legA = a.t;
    ok(JSON.stringify(a.r.replaced) === JSON.stringify([LEGACY]) && JSON.stringify(a.r.deleted) === JSON.stringify([LEGACY]) && !legA.parent
      && JSON.stringify(names(a.sh.prim)) === JSON.stringify(['Style guide — Dark', 'Style guide — Light']), `11: an unedited replaced table is deleted: Legacy, now drawn as Dark and Light (${names(a.sh.prim).join(', ')})`);
    ok(a.sh.prim.findAll((k) => k.pluginData['prism3-style-guide-part'] === 'header').length === 2, "11: the deleted table's header and cells go with it");
    // Dark and Light were drawn below Legacy; with Legacy gone, the first of them takes its place.
    const dark = tableFrame(a.sh.prim, 'Dark')!;
    ok(dark.x === legA.x && dark.y === legA.y && tableFrame(a.sh.prim, 'Light')!.y === dark.y + dark.height + 160, `11: the stack closes over the deleted table: Dark starts where Legacy stood, Light 160px below it (${dark.x},${dark.y} vs ${legA.x},${legA.y})`);
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
    ok(!legE.parent && copy.parent === e.prim && JSON.stringify(re.deleted) === JSON.stringify([LEGACY]) && JSON.stringify(re.kept) === JSON.stringify([{ name: LEGACY, reason: 'copied' }]), '11: a duplicate of a generator table is never deleted; the table it copies is');
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
    // table, Accent, dragged 600px aside, which leaves a gap in the stack; and Warning, drawn before the position
    // record, sitting 50px off the stack. On the semantic page, which the filter does not draw on, Text — nbds the
    // same way. An unfiltered run re-flows a record-less table (section 10); a filtered run must touch none of them.
    const accent = tableFrame(f13.prim, 'Accent — nbds')!;
    accent.x += 600;
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

    // GROWTH, then SHRINKAGE: two new steps grow the table by 2 × (72 + 2) = 148px, and removing them shrinks it back.
    // The tables below it in its column that sit where the generator left them move by exactly that, their records with
    // them; Accent (moved aside by hand) and Warning (no record) do not move and gain no record, and the gap Accent left
    // stays open. Nothing above it and nothing on the other page moves.
    const onPage = (): N[] => tablesOn(f13.prim).filter((n) => n !== target);
    const at0 = new Map([...tablesOn(f13.prim), ...tablesOn(f13.sem)].map((n) => [n, { x: n.x, y: n.y, at: n.pluginData[AT] }]));
    const below = onPage().filter((n) => at0.get(n)!.y > at0.get(target)!.y && n !== accent && n !== warning);
    const above = onPage().filter((n) => at0.get(n)!.y < at0.get(target)!.y);
    const h0 = target.height;
    const steps = ['960', '970'].map((step) => ({ id: `VariableID:nb-grow:${step}`, name: `nbds/core/palette/primary/${step}`, variableCollectionId: 'VariableCollectionId:core', resolvedType: 'COLOR', description: '', valuesByMode: { 'core:0': { r: 0, g: 0, b: 0, a: 1 } } }));
    f13.vars.push(...steps);
    await draw(f13.api, contract, { tables: [PRIMARY] });
    const shiftOf = (n: N): number => n.y - at0.get(n)!.y;
    const inStep = (n: N): boolean => n.pluginData[AT] === `${n.x},${n.y}`;
    ok(target.height - h0 === 148, `13: two new steps grow ${PRIMARY} by 2 × (72 + 2) = 148px (got ${target.height - h0})`);
    ok(below.length === 17 && below.every((n) => shiftOf(n) === 148 && inStep(n)),
      `13: a filtered run moves only the tables below its table, in its column and where the generator left them, by exactly its growth, 148px, each record moved with it (${below.length} tables: ${[...new Set(below.map(shiftOf))].join(', ')})`);
    ok(accent.x === at0.get(accent)!.x && accent.y === at0.get(accent)!.y && accent.pluginData[AT] === at0.get(accent)!.at
      && warning.y === at0.get(warning)!.y && !warning.pluginData[AT],
      `13: a table a designer moved and a table with no position record are left alone, and neither gains a record (Accent +${shiftOf(accent)}, Warning +${shiftOf(warning)}, Warning's record "${warning.pluginData[AT] ?? ''}")`);
    ok(above.length === 1 && above.every((n) => shiftOf(n) === 0) && tablesOn(f13.sem).every((n) => shiftOf(n) === 0),
      `13: the table above it does not move, nor any table on the other page (${above.map((n) => n.name).join(', ')})`);
    for (const st of steps) f13.vars.splice(f13.vars.indexOf(st), 1);
    await draw(f13.api, contract, { tables: [PRIMARY] });
    ok(target.height === h0 && below.every((n) => shiftOf(n) === 0 && inStep(n)) && shiftOf(accent) === 0 && shiftOf(warning) === 0 && !warning.pluginData[AT],
      `13: shrinking back by 148px moves the same 17 tables up by exactly that, and leaves Accent and Warning where they are (${[...new Set(below.map(shiftOf))].join(', ')})`);

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

  if (failures) { console.error(`\n${failures} style-guide check(s) failed`); process.exit(1); }
  console.log('\nstyle guide: all checks pass');
};

void main();
