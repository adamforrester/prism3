/**
 * THE STYLE-GUIDE CELL SETS (#259, phase 1) — the three component sets a generated token table is built from.
 *
 *   • `_style-guide-swatches`      `type = default | text | icon | border | transparency | radius` — the specimen.
 *     A node named `Specimen` carries the fill (or, for `border`, the stroke) the table binds to the variable.
 *   • `_style-guide-text-cells`    `color × textAlign × type × padding`, 12 members — header, body, alias chip and
 *     value-plus-chip cells. A cell's words sit in a text node named `Text`; a chip's path in one named `Alias`.
 *   • `_style-guide-spacing-cells` `display = filled | line` — a spacing bar or a bracket (phase 2 reads it).
 *
 * THE DESIGN IS THE OWNER'S (measured live in their test file, 2026-09-27): the axes and values above are theirs.
 * The pixel values below are this module's reading of it — proposed, owner to confirm (`docs/45`).
 *
 * ADOPT, NEVER REBUILD (owner decision 6). A file that already holds a set of one of these names ANYWHERE — the
 * owner's test file keeps them on a page named "Style Guide Components" — keeps it: found file-wide, in any case
 * (`isTemplateSet`), never moved, never rebuilt, never given a second copy. Only a MISSING set is built, onto
 * `↳ File Components` beside `_Section-header` and `_Headings`. The table builder (`style-guide.ts`) reads the
 * same lookup, so an adopted set is what every table instances.
 *
 * READ BY PROPERTY, NOT BY POSITION. An adopted set's members are found by their `key=value` variant names, in
 * any case (`pickVariant`), and its bindable nodes by name with a type fallback (`style-guide.ts`), because
 * the owner's node names are not ours.
 */
import { SEMIBOLD, REGULAR, BOLD, autoLayout, fontKey, isTemplateSet, makeText, solid, stackVariants } from './file-components';
import type { FileComponentsApi, FNode } from './file-components';

export const SWATCH_SET = '_style-guide-swatches';
export const TEXT_CELL_SET = '_style-guide-text-cells';
export const SPACING_CELL_SET = '_style-guide-spacing-cells';
export const CELL_SETS = [SWATCH_SET, TEXT_CELL_SET, SPACING_CELL_SET] as const;

/** The placeholder every text cell carries until a table writes its value (owner decision 7 — changeable). */
export const SAMPLE_TEXT = 'Abc 123';

/** The node surface this module and the table builder read: `FNode` plus the geometry, tree and instance
 *  members a real `SceneNode` has. Optional-everything, as in `file-components.ts`. */
export interface CellNode extends FNode {
  readonly id?: string;
  readonly type?: string;
  x?: unknown;
  y?: unknown;
  rotation?: unknown;
  topLeftRadius?: unknown;
  /** A layer's constraints inside a frame without auto layout (the spacing bracket's parts). */
  constraints?: unknown;
  setPluginData?(key: string, value: string): void;
  getPluginData?(key: string): string;
  readonly width?: number;
  readonly height?: number;
  readonly parent?: CellNode | null;
  readonly children?: readonly CellNode[];
  findOne?(predicate: (n: CellNode) => boolean): CellNode | null;
  findAll?(predicate: (n: CellNode) => boolean): CellNode[];
  createInstance?(): CellNode;
}

export interface CellsApi extends FileComponentsApi {
  root: { findAllWithCriteria(criteria: { types: ('COMPONENT_SET')[] }): readonly unknown[] };
}

export interface CellsPage {
  readonly name?: string;
  readonly children?: readonly unknown[];
  appendChild(child: unknown): void;
}

/** The three sets, where the file already has them. Exact name first, then any case — the page header's rule. */
export const findCellSets = (root: CellsApi['root']): Partial<Record<(typeof CELL_SETS)[number], CellNode>> => {
  const all = root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly CellNode[];
  const out: Partial<Record<(typeof CELL_SETS)[number], CellNode>> = {};
  for (const set of CELL_SETS) {
    const hit = all.find((n) => n.name === set) ?? all.find((n) => isTemplateSet(n.name, set));
    if (hit) out[set] = hit;
  }
  return out;
};

/** The page a node sits on, by walking its parents; `null` when the chain does not reach a page. */
export const pageOf = (n: CellNode): string | null => {
  for (let p = n.parent; p; p = p.parent) if (p.type === 'PAGE') return typeof p.name === 'string' ? p.name : null;
  return null;
};

/** `type=value alias, Color=White` → `{ type: 'value alias', color: 'white' }`, keys and values lowercased. */
export const variantProps = (name: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (typeof name !== 'string') return out;
  for (const part of name.split(',')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim().toLowerCase();
  }
  return out;
};

/**
 * The member of `set` that best matches `want`. `type` must match when asked for (a header cell is never a
 * body cell); the other axes are preferences, scored by how many match, first member on a tie. `exact` says
 * whether every asked-for axis matched, so a caller can report the approximation.
 */
export const pickVariant = (set: CellNode, want: Record<string, string>): { member: CellNode; exact: boolean } | null => {
  const members = (set.children ?? []).filter((c) => c.type === 'COMPONENT' || c.createInstance);
  const keys = Object.keys(want);
  let best: { member: CellNode; score: number } | null = null;
  for (const m of members) {
    const p = variantProps(m.name);
    if (want.type !== undefined && p.type !== want.type) continue;
    const score = keys.filter((k) => p[k] === want[k]).length;
    if (!best || score > best.score) best = { member: m, score };
  }
  return best ? { member: best.member, exact: best.score === keys.length } : null;
};

// ── Build ────────────────────────────────────────────────────────────────────────────────────────
const INK = '#0E0D0D';
const MUTED_INK = '#6A6868';
const LIGHT_INK = '#F7F7F7';
const RULE = '#DCDBDB';
const CHIP = '#F0EFEF';
const CELL_FILL: Record<string, string> = { white: '#FFFFFF', secondary: '#F7F7F7', dark: '#181717' };

const SWATCH_SIZE = 48;
const SPECIMEN = 32;
const INSET = (SWATCH_SIZE - SPECIMEN) / 2;

/** The plugin data a swatch set Set up file built carries (#2268): a set the owner made has none, and is never changed. */
export const SWATCHES_BUILT_KEY = 'prism3-swatches';
/** The members whose square fills the swatch, and so must grow with it (#2268): a palette swatch FILLs its table cell
 *  (decision 13), and an instance grows its layers only by their constraints. `text` and `icon` keep a mark of their
 *  own size; `radius` shows one corner of a fixed shape. */
export const STRETCHED_SWATCHES = ['default', 'border', 'transparency'] as const;
const STRETCH = { horizontal: 'STRETCH', vertical: 'STRETCH' } as const;
const isStretched = (c: unknown): boolean => {
  const k = c as { horizontal?: unknown; vertical?: unknown } | undefined;
  return k?.horizontal === 'STRETCH' && k?.vertical === 'STRETCH';
};
/** The square layers of a stretched member: its `Specimen` and, for `transparency`, the `Checker` beneath it. */
const squaresOf = (member: CellNode): CellNode[] => ((member.children ?? []) as CellNode[]).filter((k) => k.name === 'Specimen' || k.name === 'Checker');
/**
 * BRING A SWATCH SET SET UP FILE BUILT UP TO DATE (#2268). Sets built before the squares stretched draw a palette swatch
 * as a 32px square pinned to the top left of a cell that has grown around it: small and off-center. Each stretched
 * member's squares are set to stretch, which the host carries into every instance. Only a set Prism3 built is changed:
 * one marked `SWATCHES_BUILT_KEY`, or, from before the mark, one whose members are still exactly what this builder drew
 * (a 48px member, a 32px square at 8, 8, nothing else in it). A set the owner made is left as it is. Returns how many
 * layers it changed.
 */
export const stretchSwatches = (set: CellNode): number => {
  const members = ((set.children ?? []) as CellNode[]);
  const typeOf = (m: CellNode): string => String(m.name ?? '').replace(/^type=/i, '').trim().toLowerCase();
  const ours = (m: CellNode): boolean => {
    const sq = squaresOf(m);
    const kids = (m.children ?? []) as CellNode[];
    return m.width === SWATCH_SIZE && m.height === SWATCH_SIZE && sq.length === kids.length && sq.length > 0
      && sq.every((k) => k.width === SPECIMEN && k.height === SPECIMEN && Number(k.x) === INSET && Number(k.y) === INSET);
  };
  const marked = set.getPluginData?.(SWATCHES_BUILT_KEY) === '1';
  const stretched = members.filter((m) => (STRETCHED_SWATCHES as readonly string[]).includes(typeOf(m)));
  if (!marked && !stretched.every((m) => ours(m) || squaresOf(m).every((k) => isStretched(k.constraints)))) return 0;
  let changed = 0;
  for (const m of stretched) for (const k of squaresOf(m)) {
    if (isStretched(k.constraints)) continue;
    try { k.constraints = { ...STRETCH }; changed++; } catch { /* a host that refuses it leaves the square as drawn */ }
  }
  if (changed) set.setPluginData?.(SWATCHES_BUILT_KEY, '1');
  return changed;
};

const box = (api: FileComponentsApi, name: string, w: number, h: number): CellNode => {
  const f = api.createFrame() as CellNode;
  f.name = name;
  f.resize?.(w, h);
  f.fills = [];
  return f;
};

const buildSwatches = (api: FileComponentsApi, page: CellsPage, loaded: Set<string>, misses: string[]): CellNode => {
  const types = ['default', 'text', 'icon', 'border', 'transparency', 'radius'] as const;
  const members = types.map((type) => {
    const root = api.createComponent() as CellNode;
    root.name = `type=${type}`;
    root.resize?.(SWATCH_SIZE, SWATCH_SIZE);
    root.fills = [];
    root.clipsContent = false;
    let specimen: CellNode;
    if (type === 'text') {
      specimen = makeText(api, { font: BOLD, size: 24, lineHeight: 32, letterSpacing: 0, color: INK, text: 'Aa' }, loaded, misses) as CellNode;
    } else if (type === 'icon') {
      // A diamond: a square turned 45°, placed so its bounding box sits centered in the swatch. Figma turns a
      // node counterclockwise about its top-left corner, which becomes the diamond's LEFT point: the box spans
      // x … x + side·√2 and y − side/√2 … y + side/√2, so x and y locate that left point, not the top.
      const side = 22;
      specimen = box(api, 'Specimen', side, side);
      specimen.fills = solid(INK);
      specimen.rotation = 45;
      specimen.x = SWATCH_SIZE / 2 - (side * Math.SQRT2) / 2;
      specimen.y = SWATCH_SIZE / 2;
    } else {
      specimen = box(api, 'Specimen', SPECIMEN, SPECIMEN);
      specimen.cornerRadius = 4;
      if (type === 'border') {
        specimen.strokes = solid(INK);
        specimen.strokeWeight = 2;
        specimen.strokeAlign = 'INSIDE';
      } else if (type === 'radius') {
        // THE OWNER'S STRUCTURE AND SIZES (measured live, 2026-09-29; owner decision, "keep the one"): a 48 × 48
        // `radius-example-container` that clips, over a 256 × 96 `radius-example` at its top-left, so the swatch SHOWS
        // ONE rounded corner. The table binds all four of the shape's corners, which keeps the value right everywhere;
        // the clip is what keeps the look to one corner.
        specimen.resize?.(SWATCH_SIZE, SWATCH_SIZE);
        specimen.name = 'radius-example-container';
        specimen.cornerRadius = 0;
        specimen.clipsContent = true;
        specimen.fills = [];
        const shape = box(api, 'radius-example', 256, 96);
        shape.x = 0;
        shape.y = 0;
        shape.cornerRadius = 8;
        shape.fills = solid(CHIP);
        shape.strokes = solid(INK);
        shape.strokeWeight = 2;
        shape.strokeAlign = 'INSIDE';
        specimen.appendChild?.(shape);
      } else {
        specimen.fills = solid(INK);
        // A hairline, so a white or near-white primitive still reads on a white cell.
        specimen.strokes = solid(RULE);
        specimen.strokeWeight = 1;
        specimen.strokeAlign = 'INSIDE';
      }
    }
    if (type !== 'radius') specimen.name = 'Specimen';
    if (type === 'transparency') {
      // The checkerboard sits under the fill, so a translucent value shows as translucent.
      const checker = box(api, 'Checker', SPECIMEN, SPECIMEN);
      checker.cornerRadius = 4;
      checker.clipsContent = true;
      const cell = SPECIMEN / 4;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const sq = box(api, 'Check', cell, cell);
        sq.fills = solid((r + c) % 2 ? RULE : '#FFFFFF');
        sq.x = c * cell;
        sq.y = r * cell;
        checker.appendChild?.(sq);
      }
      checker.x = INSET;
      checker.y = INSET;
      root.appendChild?.(checker);
    }
    if (type === 'radius') { specimen.x = 0; specimen.y = 0; }
    else if (type !== 'icon') { specimen.x = type === 'text' ? 8 : INSET; specimen.y = type === 'text' ? 8 : INSET; }
    root.appendChild?.(specimen);
    page.appendChild(root);
    return root;
  });
  const set = api.combineAsVariants(members, page) as CellNode;
  set.name = SWATCH_SET;
  stackVariants(set, members);
  // The squares stretch with the swatch, and the set says Prism3 built it (#2268).
  for (const m of members) if ((STRETCHED_SWATCHES as readonly string[]).includes(String(m.name).replace(/^type=/, ''))) for (const k of squaresOf(m)) k.constraints = { ...STRETCH };
  set.setPluginData?.(SWATCHES_BUILT_KEY, '1');
  return set;
};

interface TextCellSpec { color: 'white' | 'secondary' | 'dark'; textAlign: 'left' | 'center'; type: 'default' | 'header' | 'alias' | 'value alias'; padding: 'default' | 'extra right' }
const TEXT_CELLS: TextCellSpec[] = [
  { color: 'white', textAlign: 'left', type: 'default', padding: 'default' },
  { color: 'secondary', textAlign: 'left', type: 'default', padding: 'default' },
  { color: 'white', textAlign: 'center', type: 'default', padding: 'default' },
  { color: 'white', textAlign: 'left', type: 'default', padding: 'extra right' },
  { color: 'dark', textAlign: 'left', type: 'header', padding: 'default' },
  { color: 'white', textAlign: 'left', type: 'header', padding: 'default' },
  { color: 'dark', textAlign: 'center', type: 'header', padding: 'default' },
  { color: 'white', textAlign: 'center', type: 'header', padding: 'default' },
  { color: 'white', textAlign: 'left', type: 'alias', padding: 'default' },
  { color: 'white', textAlign: 'left', type: 'alias', padding: 'extra right' },
  { color: 'white', textAlign: 'left', type: 'value alias', padding: 'default' },
  { color: 'white', textAlign: 'left', type: 'value alias', padding: 'extra right' },
];

const chip = (api: FileComponentsApi, loaded: Set<string>, misses: string[]): CellNode => {
  const c = api.createFrame() as CellNode;
  c.name = 'Chip';
  autoLayout(c, { dir: 'HORIZONTAL', itemSpacing: 4, padding: { t: 2, r: 8, b: 2, l: 6 }, counterAlign: 'CENTER' });
  c.cornerRadius = 4;
  c.fills = solid(CHIP);
  const icon = makeText(api, { font: REGULAR, size: 12, lineHeight: 16, letterSpacing: 0, color: MUTED_INK, text: '↗' }, loaded, misses);
  icon.name = 'Icon';
  const path = makeText(api, { font: REGULAR, size: 12, lineHeight: 16, letterSpacing: 0, color: INK, text: SAMPLE_TEXT }, loaded, misses);
  path.name = 'Alias';
  c.appendChild?.(icon);
  c.appendChild?.(path);
  return c;
};

const buildTextCells = (api: FileComponentsApi, page: CellsPage, loaded: Set<string>, misses: string[]): CellNode => {
  const members = TEXT_CELLS.map((v) => {
    const root = api.createComponent() as CellNode;
    root.name = `color=${v.color}, textAlign=${v.textAlign}, type=${v.type}, padding=${v.padding}`;
    autoLayout(root, { dir: 'HORIZONTAL', itemSpacing: 8, padding: { t: 12, r: v.padding === 'extra right' ? 48 : 16, b: 12, l: 16 }, counterAlign: 'CENTER' });
    root.fills = solid(CELL_FILL[v.color]);
    root.strokes = solid(RULE);
    root.strokeAlign = 'INSIDE';
    root.strokeTopWeight = 0; root.strokeRightWeight = 0; root.strokeLeftWeight = 0; root.strokeBottomWeight = 1;
    if (v.type !== 'alias') {
      const header = v.type === 'header';
      const t = makeText(api, {
        font: header ? SEMIBOLD : REGULAR, size: 14, lineHeight: 20, letterSpacing: 0,
        color: v.color === 'dark' ? LIGHT_INK : header ? INK : v.color === 'secondary' ? MUTED_INK : INK, text: SAMPLE_TEXT,
      }, loaded, misses) as CellNode & { textAlignHorizontal?: unknown };
      t.name = 'Text';
      t.textAlignHorizontal = v.textAlign === 'center' ? 'CENTER' : 'LEFT';
      root.appendChild?.(t);
    }
    if (v.type === 'alias' || v.type === 'value alias') root.appendChild?.(chip(api, loaded, misses));
    page.appendChild(root);
    return root;
  });
  const set = api.combineAsVariants(members, page) as CellNode;
  set.name = TEXT_CELL_SET;
  stackVariants(set, members);
  return set;
};

/** A spacing example frame's rest width: the least the host draws, since a layer inside an instance never hugs
 *  narrower than its main component's own width (live QA of 0.210.0). */
export const SPACING_REST_W = 0.01;

const buildSpacingCells = (api: FileComponentsApi, page: CellsPage): CellNode => {
  const members = (['filled', 'line'] as const).map((display) => {
    const root = api.createComponent() as CellNode;
    root.name = `display=${display}`;
    autoLayout(root, { dir: 'HORIZONTAL', padding: 12, counterAlign: 'CENTER' });
    root.fills = [];
    // SIZED BY ITS LEFT PADDING (the owner's live run of 0.205.0, measured in the plugin runtime, 2026-09-29): Figma
    // silently drops a width written to a layer inside an instance (`resize`, `resizeWithoutConstraints`, a bound
    // `width`), but keeps a bound `paddingLeft`. So the member's first child, `spacing-<display>-example`, is a
    // HORIZONTAL auto-layout frame that hugs its width (no flow children, every padding 0) at a fixed height, and the
    // table binds its paddingLeft to the value. The bracket's three bars sit inside it ABSOLUTELY, their constraints
    // set here in the component (left-bar MIN, horizontal-line STRETCH, right-bar MAX), so a frame the padding widens
    // carries them with no per-instance override. The names are the owner's.
    // ITS REST WIDTH IS 0 (owner decision, live QA of 0.210.0, 2026-09-30): a layer inside an instance never hugs
    // narrower than its main component's own width, so an 8px rest width left every value of 8 or less at 8. The frame
    // is drawn at 8 with its bars, then resized to 0.01, the least the host draws, and only then set to HUG: a hugging
    // frame with nothing to hug keeps its last width. The owner's cells in the NB test file were set the same way.
    const h = display === 'filled' ? 20 : 16;
    const bar = box(api, `spacing-${display}-example`, 8, h);
    bar.layoutMode = 'HORIZONTAL';
    bar.primaryAxisSizingMode = 'AUTO';
    bar.counterAxisSizingMode = 'FIXED';
    bar.paddingLeft = 0; bar.paddingRight = 0; bar.paddingTop = 0; bar.paddingBottom = 0; bar.itemSpacing = 0;
    bar.clipsContent = display === 'filled';
    if (display === 'filled') bar.fills = solid('#F4A7A7');
    else {
      const part = (name: string, w: number, h: number, x: number, y: number, horizontal: string): void => {
        const p = box(api, name, w, h);
        p.fills = solid('#D14343');
        bar.appendChild?.(p);
        // Absolute only once inside the auto-layout frame, which the host requires; then placed and constrained.
        p.layoutPositioning = 'ABSOLUTE';
        p.x = x; p.y = y;
        p.constraints = { horizontal, vertical: 'MIN' };
      };
      part('left-bar', 1, 16, 0, 0, 'MIN');
      part('horizontal-line', 8, 1, 0, 7.5, 'STRETCH');
      part('right-bar', 1, 16, 7, 0, 'MAX');
    }
    bar.resize?.(SPACING_REST_W, h);
    bar.primaryAxisSizingMode = 'AUTO';
    root.appendChild?.(bar);
    page.appendChild(root);
    return root;
  });
  const set = api.combineAsVariants(members, page) as CellNode;
  set.name = SPACING_CELL_SET;
  stackVariants(set, members);
  return set;
};

export interface CellsResult {
  /** Sets built this run, onto the File Components page. */
  built: string[];
  /** Sets the file already had, by the name it has and the page it sits on. */
  adopted: { name: string; page: string | null }[];
  fontMisses: string[];
}

const SET_GAP = 160;

/**
 * Ensure the three cell sets exist. Adopts each one the file already has, anywhere and in any case; builds only
 * the missing ones onto `page`, to the right of what the page already holds.
 */
export const ensureStyleGuideCells = async (api: CellsApi, page: CellsPage): Promise<CellsResult> => {
  const found = findCellSets(api.root);
  const adopted = CELL_SETS.filter((s) => found[s]).map((s) => ({ name: String(found[s]!.name), page: pageOf(found[s]!) }));
  const missing = CELL_SETS.filter((s) => !found[s]);
  const fontMisses: string[] = [];
  if (!missing.length) return { built: [], adopted, fontMisses };

  const loaded = new Set<string>();
  for (const f of [REGULAR, BOLD, SEMIBOLD]) {
    try { await api.loadFontAsync(f); loaded.add(fontKey(f)); } catch { /* recorded per node by makeText */ }
  }
  // Measured BEFORE building, so the new sets line up to the right of the page's existing content.
  const existing = ((page.children ?? []) as readonly CellNode[]).filter((n) => n.visible !== false);
  let x = existing.length ? Math.max(...existing.map((n) => Number(n.x ?? 0) + (n.width ?? 0))) + SET_GAP : 0;
  const top = existing.length ? Math.min(...existing.map((n) => Number(n.y ?? 0))) : 0;
  const built: string[] = [];
  for (const s of missing) {
    const set = s === SWATCH_SET ? buildSwatches(api, page, loaded, fontMisses)
      : s === TEXT_CELL_SET ? buildTextCells(api, page, loaded, fontMisses)
      : buildSpacingCells(api, page);
    set.x = x;
    set.y = top;
    x += (set.width ?? 0) + SET_GAP;
    built.push(String(set.name));
  }
  const unique = [...new Set(fontMisses.map((m) => m.split(' unavailable')[0]))].filter((f) => !loaded.has(f)).map((f) => `${f} unavailable — used ${fontKey(REGULAR)}`);
  return { built, adopted, fontMisses: unique };
};
