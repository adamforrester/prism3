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
      // A diamond: a square turned 45°, placed so its bounding box sits centered in the swatch.
      const side = 22;
      specimen = box(api, 'Specimen', side, side);
      specimen.fills = solid(INK);
      specimen.rotation = 45;
      specimen.x = SWATCH_SIZE / 2;
      specimen.y = (SWATCH_SIZE - side * Math.SQRT2) / 2;
    } else {
      specimen = box(api, 'Specimen', SPECIMEN, SPECIMEN);
      specimen.cornerRadius = 4;
      if (type === 'border') {
        specimen.strokes = solid(INK);
        specimen.strokeWeight = 2;
        specimen.strokeAlign = 'INSIDE';
      } else if (type === 'radius') {
        specimen.cornerRadius = 0;
        specimen.topLeftRadius = 16;
        specimen.fills = solid(CHIP);
        specimen.strokes = solid(INK);
        specimen.strokeWeight = 2;
        specimen.strokeAlign = 'INSIDE';
      } else {
        specimen.fills = solid(INK);
        // A hairline, so a white or near-white primitive still reads on a white cell.
        specimen.strokes = solid(RULE);
        specimen.strokeWeight = 1;
        specimen.strokeAlign = 'INSIDE';
      }
    }
    specimen.name = 'Specimen';
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
    if (type !== 'icon') { specimen.x = type === 'text' ? 8 : INSET; specimen.y = type === 'text' ? 8 : INSET; }
    root.appendChild?.(specimen);
    page.appendChild(root);
    return root;
  });
  const set = api.combineAsVariants(members, page) as CellNode;
  set.name = SWATCH_SET;
  stackVariants(set, members);
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

const buildSpacingCells = (api: FileComponentsApi, page: CellsPage): CellNode => {
  const members = (['filled', 'line'] as const).map((display) => {
    const root = api.createComponent() as CellNode;
    root.name = `display=${display}`;
    autoLayout(root, { dir: 'HORIZONTAL', padding: 12, counterAlign: 'CENTER' });
    root.fills = [];
    const bar = box(api, 'Bar', 16, display === 'filled' ? 16 : 8);
    if (display === 'filled') bar.fills = solid('#F4A7A7');
    else {
      // A bracket: a line with end caps, drawn as a frame with a bottom, left and right edge.
      bar.strokes = solid('#D14343');
      bar.strokeAlign = 'INSIDE';
      bar.strokeTopWeight = 0; bar.strokeBottomWeight = 1; bar.strokeLeftWeight = 1; bar.strokeRightWeight = 1;
    }
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
