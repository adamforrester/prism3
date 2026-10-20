/**
 * THE CANVAS FURNITURE (#2406 Q171, #2188 Q172/Q173) — `_Label` instances around a component set, and an
 * `_inverse-backdrop` instance behind its inverse rows.
 *
 * WHAT IS DRAWN. After a build or an in-place update lands a set, this places, OUTSIDE the set and on the set's own
 * parent (the page, in every build):
 *   - COLUMN LABELS above the set, one per value of the def's grid axis (`gridAxis`), a `Text=Top` label as wide as
 *     its column;
 *   - ROW LABELS to the left, `Text=Left` labels as tall as the rows they group: nested brackets for the OUTER row
 *     axes only, `ROW_LABEL_DEPTH` of them, innermost nearest the set. An on/off axis (one whose values are
 *     `true`/`false`, such as "leading icon") gets none. A bracket is drawn only where its axis actually varies
 *     inside the group around it: Button's `inset` is `default` on every filled row, so a filled block carries no
 *     inset bracket;
 *   - ONE "Inverse" ROW BRACKET outermost for a set with `surface=inverse` rows (Q171.5, in the normal label color,
 *     outside the backdrop), and one backdrop behind each contiguous band of inverse rows — one per set, since the
 *     `planSetLayout` groups the inverse rows into one block (Q173 A).
 * The wording is the variant values in sentence case, one vocabulary (Q171.2): `focus-visible` → "Focus visible".
 *
 * PLACED FROM WHERE THE MEMBERS ARE, NOT FROM WHERE THE PLAN SAYS. Rows and columns are measured off the set's
 * members as the host holds them, so a label lines up with what a designer sees even on a set laid out by an earlier
 * plugin. The plan supplies only which row and column each member is in (`planSetLayout`'s cells, by member name).
 *
 * PRISM3'S OWN, AND TAGGED SO. Every instance carries shared plugin data `prism3`/`furniture` naming its def and its
 * set. A rebuild or update clears the def's furniture on that parent, and the set's own on any other parent it was
 * moved from (`clearMovedFurniture`, #2485), and draws it fresh, so it never drifts from the grid; prune removes furniture whose set is gone (`staleFurniture`). The update's hand-edit check and the as-built
 * record read the set's members only, and furniture is never a member: it is never appended into the set, which is
 * what keeps both blind to it (`test-canvas-furniture.ts` `update/…` holds that).
 *
 * BELOW THE PAGE HEADER. On a first build the header is placed after the run's builds and measures the content,
 * labels included, so it lands above them. On a page whose header is already there, the column labels take
 * `LABEL_GAP` plus one label's height above the set, inside the header's 80px gap (`page-header.ts` `HEADER_GAP`).
 *
 * HELD FOR THE OWNER, every number here: `LABEL_GAP`, `LEVEL_GAP`, `BACKDROP_PAD` and `ROW_LABEL_DEPTH`.
 *
 * NEVER THROWS FOR A MISSING TEMPLATE. A file where file setup has not run since this change has no `_Label` or no
 * `_inverse-backdrop`; that part is skipped and the outcome names the template (`missing`), the `page-header.ts`
 * posture. A run reports it ONCE, as its own line asking the designer to run Set up file (`templatesLine`, #2598):
 * it was one clause per set, and an update's clauses reached its lines but not its summary, so a run that drew no
 * labels on a file without templates read as if nothing had been left out. The build does not make the templates
 * itself: they go on `↳ File Components`, a page only file setup may create, and an update's apply may write only
 * what its dry run showed.
 */
import { planSetLayout, CANVAS_FURNITURE } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { isTemplateSet } from './file-components';
import { LABEL_SET, BACKDROP_COMPONENT, SCRIM_COMPONENT, SCRIM_BACKDROP, BRACKET_PROPERTY, labelVariant, bindBackdrop } from './furniture-templates';
import type { BackdropVariables } from './furniture-templates';
import { DOC_BLOCK_SET } from './doc-block';
import { panelItems, type PanelOutcome } from './doc-panel';

export { CANVAS_FURNITURE };
/** Shared plugin data namespace and key the tag lives under. The namespace is `persist-figma.ts`'s `NS`. */
export const FURNITURE_NS = 'prism3';
export const FURNITURE_KEY = 'furniture';
/** Space between the set's edge and the nearest labels, top and left, in px. HELD FOR THE OWNER. */
export const LABEL_GAP = 16;
/** Space between two nested row-label columns, in px. HELD FOR THE OWNER. */
export const LEVEL_GAP = 8;
/** How far the backdrop reaches past the inverse members on every side, in px: half the grid's 24px gap, so it
 *  never reaches the neighboring default row. HELD FOR THE OWNER. */
export const BACKDROP_PAD = 12;
/** How many outer row axes are labeled (Q171.1: "the outer two or three"). The inverse bracket is extra. */
export const ROW_LABEL_DEPTH = 3;

/**
 * THE SCRIM BEHIND EACH EXAMPLE (#2609, owner decisions Q303.2 A and Q303.3 A). A Dialog is the panel alone; the
 * modal backdrop, `color.scrim.default`, is drawn here, one `_scrim-backdrop` instance behind each member, keyed by
 * the def's placement value. Each entry is how far the scrim reaches past the member on each side, `[top, right,
 * bottom, left]` in px: a centered panel floats with scrim all round; a bottom sheet sits on the screen's bottom edge
 * at its full width, so the scrim shows above it only. A full-screen dialog covers the page and has no visible
 * backdrop (Q303.8), so it has no entry. Every reach is at most half the grid's 24px gap, `BACKDROP_PAD`, so a
 * scrim never reaches the neighboring member's. HELD FOR THE OWNER, every number here.
 */
export const SCRIM_BACKDROPS: Readonly<Record<string, { axis: string; reach: Readonly<Record<string, readonly [number, number, number, number]>> }>> = {
  dialog: { axis: 'placement', reach: { center: [BACKDROP_PAD, BACKDROP_PAD, BACKDROP_PAD, BACKDROP_PAD], bottom: [BACKDROP_PAD, 0, 0, 0] } },
};

/** A def's furniture switch: the engine's list, the one switch `planSetLayout` reads too. */
export const hasFurniture = (defId: string): boolean => CANVAS_FURNITURE.has(defId);

/** A variant value as label text: hyphens to spaces, first letter capitalized (`read-only` → "Read only"). */
export const sentenceCase = (value: string): string => {
  const s = value.replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/* ── the pure planner ──────────────────────────────────────────────────────────────────────────────────── */

/** One member as the planner reads it: its cell, its coordinate values, and its box relative to the set. */
export interface GridMember {
  row: number;
  col: number;
  values: Readonly<Record<string, string>>;
  x: number;
  y: number;
  width: number;
  height: number;
}
/** What to draw, in the coordinates of the set's parent. */
export interface FurniturePlan {
  /** A `Text=Top` label: `x`/`width` span the column, `bottom` is where the label's bottom edge sits. */
  columns: { text: string; x: number; width: number; bottom: number }[];
  /** A `Text=Left` label: `y`/`height` span the rows, `level` 0 is the column nearest the set. */
  rows: { text: string; axis: string; level: number; y: number; height: number }[];
  /** Where the row labels' innermost column ends: its right edge. */
  rowsRight: number;
  backdrops: { x: number; y: number; width: number; height: number }[];
  /** One scrim behind each member a `SCRIM_BACKDROPS` entry names (#2609); empty for every other def. */
  scrims: { x: number; y: number; width: number; height: number }[];
  /** The row axes that are labeled, outermost first (`surface` first where it is). */
  rowAxes: string[];
}

const ON_OFF = new Set(['true', 'false']);

/**
 * The furniture for one set: pure over the set's position, its members' cells and boxes, and the layout's axis
 * lists. Exported so the whole placement rule is checked against literals with no host (`test-canvas-furniture.ts`).
 */
export const planFurniture = (
  set: { x: number; y: number },
  members: readonly GridMember[],
  layout: { rowKeys: readonly string[]; colKey: string; colVals: readonly string[] },
  defId?: string,
): FurniturePlan => {
  // THE ROWS IN THE ORDER THEY SIT, top to bottom — not by index, which on a set an earlier plugin laid out may not
  // be the order on the canvas.
  const byRow = new Map<number, GridMember[]>();
  for (const m of members) byRow.set(m.row, [...(byRow.get(m.row) ?? []), m]);
  const rows = [...byRow.entries()].map(([row, ms]) => ({
    row,
    top: Math.min(...ms.map((m) => m.y)),
    bottom: Math.max(...ms.map((m) => m.y + m.height)),
    left: Math.min(...ms.map((m) => m.x)),
    right: Math.max(...ms.map((m) => m.x + m.width)),
    values: ms[0].values,
  })).sort((a, b) => a.top - b.top || a.row - b.row);

  const onOff = (axis: string): boolean => members.every((m) => ON_OFF.has(m.values[axis] ?? ''));
  const labeled = layout.rowKeys.filter((k) => k !== 'surface' && !onOff(k)).slice(0, ROW_LABEL_DEPTH);
  const withSurface = layout.rowKeys.includes('surface');
  const rowAxes = [...(withSurface ? ['surface'] : []), ...labeled];

  // RUNS: maximal stretches of adjacent rows that agree on every axis down to this level.
  const keyOf = (values: Readonly<Record<string, string>>, depth: number): string =>
    rowAxes.slice(0, depth + 1).map((k) => values[k]).join('\u0000');
  const runsAt = (depth: number) => {
    const runs: { from: number; to: number }[] = [];
    rows.forEach((r, i) => {
      const last = runs[runs.length - 1];
      if (last && keyOf(rows[last.to].values, depth) === keyOf(r.values, depth)) last.to = i;
      else runs.push({ from: i, to: i });
    });
    return runs;
  };
  const span = (run: { from: number; to: number }) => ({ y: set.y + rows[run.from].top, height: rows[run.to].bottom - rows[run.from].top });

  const rowLabels: FurniturePlan['rows'] = [];
  rowAxes.forEach((axis, depth) => {
    const level = rowAxes.length - 1 - depth;
    if (axis === 'surface') {
      for (const run of runsAt(depth))
        if (rows[run.from].values.surface === 'inverse') rowLabels.push({ text: sentenceCase('inverse'), axis, level, ...span(run) });
      return;
    }
    // A bracket only where the axis varies inside the group around it — its parent run.
    const parents = depth === 0 ? [{ from: 0, to: rows.length - 1 }] : runsAt(depth - 1);
    for (const run of runsAt(depth)) {
      const parent = parents.find((p) => p.from <= run.from && run.to <= p.to)!;
      const distinct = new Set(rows.slice(parent.from, parent.to + 1).map((r) => r.values[axis]));
      if (distinct.size < 2) continue;
      rowLabels.push({ text: sentenceCase(rows[run.from].values[axis]), axis, level, ...span(run) });
    }
  });

  const columns: FurniturePlan['columns'] = [];
  if (layout.colKey) {
    layout.colVals.forEach((value, col) => {
      const ms = members.filter((m) => m.col === col);
      if (!ms.length) return;
      const left = Math.min(...ms.map((m) => m.x));
      const right = Math.max(...ms.map((m) => m.x + m.width));
      columns.push({ text: sentenceCase(value), x: set.x + left, width: right - left, bottom: set.y - LABEL_GAP });
    });
  }

  // ONE BACKDROP PER CONTIGUOUS BAND of inverse rows — one per set once the inverse rows are grouped.
  const backdrops: FurniturePlan['backdrops'] = [];
  if (withSurface) {
    for (const run of runsAt(0)) {
      if (rows[run.from].values.surface !== 'inverse') continue;
      const band = rows.slice(run.from, run.to + 1);
      const left = Math.min(...band.map((r) => r.left));
      const right = Math.max(...band.map((r) => r.right));
      backdrops.push({
        x: set.x + left - BACKDROP_PAD,
        y: set.y + band[0].top - BACKDROP_PAD,
        width: right - left + 2 * BACKDROP_PAD,
        height: band[band.length - 1].bottom - band[0].top + 2 * BACKDROP_PAD,
      });
    }
  }
  // ONE SCRIM BEHIND EACH MEMBER whose placement has a reach (#2609), in member order.
  const scrims: FurniturePlan['scrims'] = [];
  const spec = defId ? SCRIM_BACKDROPS[defId] : undefined;
  if (spec) {
    for (const m of members) {
      const reach = spec.reach[m.values[spec.axis] ?? ''];
      if (!reach) continue;
      const [top, right, bottom, left] = reach;
      scrims.push({ x: set.x + m.x - left, y: set.y + m.y - top, width: m.width + left + right, height: m.height + top + bottom });
    }
  }
  return { columns, rows: rowLabels, rowsRight: set.x - LABEL_GAP, backdrops, scrims, rowAxes };
};

/* ── the executor ──────────────────────────────────────────────────────────────────────────────────────── */

/** The node surface this module touches — optional-everything, as in `page-header.ts`. */
export interface XNode {
  readonly id?: string;
  readonly type?: string;
  name?: string;
  x?: number;
  y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly removed?: boolean;
  readonly parent?: unknown;
  readonly children?: readonly XNode[];
  characters?: string;
  visible?: boolean;
  readonly componentProperties?: Readonly<Record<string, unknown>>;
  setProperties?(props: Record<string, string | boolean>): void;
  readonly fontName?: unknown;
  fills?: unknown;
  layoutSizingHorizontal?: unknown;
  layoutSizingVertical?: unknown;
  resize?(w: number, h: number): void;
  findOne?(predicate: (n: XNode) => boolean): XNode | null;
  createInstance?(): XNode;
  remove?(): void;
  getSharedPluginData?(ns: string, key: string): string;
  setSharedPluginData?(ns: string, key: string, value: string): void;
}
/** The set's parent — the page in every build. `insertChild` puts the backdrop behind the set. */
export interface FurnitureParent {
  readonly name?: string;
  readonly children: readonly unknown[];
  appendChild(child: unknown): void;
  insertChild(index: number, child: unknown): void;
}
/** The host surface: a file-wide template search, font loading, and the variables the backdrop binds. */
export interface FurnitureApi {
  root: {
    findAllWithCriteria(criteria: {
      types: ('COMPONENT' | 'COMPONENT_SET' | 'INSTANCE')[];
      sharedPluginData?: { namespace: string; keys: string[] };
    }): readonly unknown[];
  };
  loadFontAsync(font: { family: string; style: string }): Promise<void>;
  variables?: BackdropVariables;
}

/** What drawing did for one set. */
export interface FurnitureOutcome {
  def: string;
  parent: string;
  columns: number;
  rows: number;
  backdrops: number;
  /** Scrims drawn behind the members (#2609); 0 for a def with none. */
  scrims: number;
  /** Instances of this def's earlier furniture removed first: on the set's parent, and this set's on any other. */
  cleared: number;
  /** A part not drawn, as the verdict sentence: a missing variant, a set with no parent, an ungrouped set. */
  skipped: string[];
  /** The templates this set needed and the file does not hold (#2598). Reported once per run (`templatesLine`). */
  missing?: string[];
  fontMisses: string[];
  /** `bound` when this run bound the backdrop template to the inverse ground; `no-variable` before a theme. */
  backdropBinding?: 'bound' | 'kept' | 'no-variable';
  /** The same for the scrim template and `color/scrim/default` (#2609). */
  scrimBinding?: 'bound' | 'kept' | 'no-variable';
  /** The usage panel beside the set (#846, `doc-panel.ts`); its missing `_Doc-block` is in `missing`. */
  panel?: PanelOutcome;
}

/** What the executor reads of `planSetLayout`: each member's cell by name, and the axis lists. */
export interface FurnitureLayout {
  cells: readonly { name: string; row: number; col: number }[];
  rowKeys: readonly string[];
  colKey: string;
  colVals: readonly string[];
}
/** The layout for the plans a set was built or updated from. */
export const furnitureLayout = (plans: AnatomyPlan[]): FurnitureLayout => planSetLayout(plans, 'drawFurniture');

/** The tag on a furniture instance. */
export interface FurnitureTag { v: 1; def: string; set: string; kind: 'label' | 'backdrop' }

export const readTag = (n: XNode): FurnitureTag | null => {
  try {
    const raw = n.getSharedPluginData?.(FURNITURE_NS, FURNITURE_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Partial<FurnitureTag>;
    return t && t.v === 1 && typeof t.def === 'string' && typeof t.set === 'string' && (t.kind === 'label' || t.kind === 'backdrop') ? (t as FurnitureTag) : null;
  } catch { return null; }
};
const tag = (n: XNode, t: FurnitureTag): void => n.setSharedPluginData?.(FURNITURE_NS, FURNITURE_KEY, JSON.stringify(t));

/** Remove `defId`'s furniture from `parent`'s top level. Returns how many instances went. */
export const clearFurniture = (parent: FurnitureParent, defId: string): number => {
  let n = 0;
  for (const c of [...(parent.children as readonly XNode[])]) {
    if (readTag(c)?.def !== defId) continue;
    c.remove?.();
    n++;
  }
  return n;
};

/**
 * THE FURNITURE A MOVED SET LEFT BEHIND (#2485): `set`'s own furniture, by its tag's set id, on any parent but
 * `parent`. A designer who moves a set to another page or into a frame leaves its labels and backdrop where they
 * were, and `clearFurniture` reads only the parent it draws on. Found file-wide by the tag, so only Prism3's own
 * furniture is ever touched: an untagged node (a hand-placed `inverse-bg`, Q172.5) never matches, and another set's
 * furniture never does either, even of the same def. Returns how many instances went.
 */
export const clearMovedFurniture = (api: FurnitureApi, set: XNode, parent: FurnitureParent): number => {
  const setId = String(set.id ?? '');
  if (!setId) return 0;
  const tagged = api.root.findAllWithCriteria({ types: ['INSTANCE'], sharedPluginData: { namespace: FURNITURE_NS, keys: [FURNITURE_KEY] } }) as readonly XNode[];
  let n = 0;
  for (const c of tagged) {
    if (c.removed || c.parent === parent || readTag(c)?.set !== setId) continue;
    c.remove?.();
    n++;
  }
  return n;
};

/** Members by cell, read off the set as the host holds it. A member whose name is not a coordinate is skipped. */
const gridMembers = (set: XNode, cells: readonly { name: string; row: number; col: number }[]): GridMember[] => {
  const byName = new Map(cells.map((c) => [c.name, c] as const));
  const out: GridMember[] = [];
  for (const m of set.children ?? []) {
    const cell = byName.get(String(m.name));
    if (!cell) continue;
    const values = Object.fromEntries(String(m.name).split(', ').map((kv) => [kv.slice(0, kv.indexOf('=')), kv.slice(kv.indexOf('=') + 1)]));
    out.push({ row: cell.row, col: cell.col, values, x: m.x ?? 0, y: m.y ?? 0, width: m.width ?? 0, height: m.height ?? 0 });
  }
  return out;
};

/** Whether the members with `surface=inverse` form one band no other member's rows enter. True with none. */
export const inverseContiguous = (members: readonly GridMember[]): boolean => {
  const inv = members.filter((m) => m.values.surface === 'inverse');
  if (!inv.length) return true;
  const top = Math.min(...inv.map((m) => m.y));
  const bottom = Math.max(...inv.map((m) => m.y + m.height));
  return members.every((m) => m.values.surface === 'inverse' || m.y + m.height <= top || m.y >= bottom);
};

/** Every TEXT layer under `n`, in tree order. */
const textLayers = (n: XNode): XNode[] =>
  (n.children ?? []).flatMap((c) => [...(c.type === 'TEXT' ? [c] : []), ...textLayers(c)]);

/**
 * The text layer a label's value goes into (#2558). The plugin's own `_Label` names it `text`; a file's own copy may
 * spell it `Text`, or call it something else. So: the layer named `text` exactly, then `text` in any case, then the
 * instance's only TEXT layer. More than one TEXT layer and none named `text` is a miss, never a guess. Returns the
 * miss sentence when there is no layer to write.
 */
export const labelTextLayer = (inst: XNode): XNode | string => {
  const all = textLayers(inst);
  const found = all.find((n) => n.name === 'text') ?? all.find((n) => String(n.name ?? '').toLowerCase() === 'text') ?? (all.length === 1 ? all[0] : undefined);
  if (found) return found;
  return all.length
    ? `${LABEL_SET} has ${all.length} text layers and none named "text"`
    : `${LABEL_SET} has no text layer`;
};

/** Write a label's text, loading the face its text node carries. A face that will not load keeps "Label". */
const writeText = async (api: FurnitureApi, inst: XNode, value: string, misses: string[]): Promise<void> => {
  const t = labelTextLayer(inst);
  if (typeof t === 'string') { misses.push(t); return; }
  const font = t.fontName as { family?: unknown; style?: unknown } | undefined;
  if (!font || typeof font.family !== 'string' || typeof font.style !== 'string') { misses.push(`${LABEL_SET}: mixed or unreadable font`); return; }
  try { await api.loadFontAsync({ family: font.family, style: font.style }); }
  catch { misses.push(`${font.family} ${font.style} unavailable for ${LABEL_SET}`); return; }
  t.characters = value;
};

/** Turn a label's bracket off (#2568): through the `_Label` set's `Show bracket` boolean where the instance has it, so
 *  the label stays a plain instance of the template; else the `bracket` layer's visibility, on a `_Label` from before
 *  the boolean. The property's key carries Figma's `#id` suffix, so it is found by its name. */
const hideBracket = (inst: XNode): void => {
  const key = Object.keys(inst.componentProperties ?? {}).find((k) => k === BRACKET_PROPERTY || k.startsWith(`${BRACKET_PROPERTY}#`));
  if (key && inst.setProperties) { inst.setProperties({ [key]: false }); return; }
  const b = inst.findOne?.((n) => n.name === 'bracket');
  if (b) b.visible = false;
};

/** A variant name as its properties, keys and values in lower case: `Text=Top, surface=default` → {text: top, …}. */
const variantProps = (name: unknown): string =>
  String(name ?? '').split(',').map((kv) => kv.split('=').map((x) => x.trim().toLowerCase()).join('=')).sort().join(', ');

/**
 * The `_Label` member a placement selects (#2558): its exact Figma name first, then the same properties in any case
 * and any order, so a file whose own `_Label` spells `Surface=Default` or lists `surface` first still matches.
 */
export const labelMember = (labels: XNode, placement: 'Top' | 'Left'): XNode | undefined => {
  const want = labelVariant(placement);
  const members = labels.children ?? [];
  return members.find((c) => c.name === want) ?? members.find((c) => variantProps(c.name) === variantProps(want));
};

/** The file's furniture templates by type and name: exact case first, then any case — the `page-header.ts` rule, so a
 *  plugin-built `_Label` wins over a user's copy. One lookup, read by the draw and by the dry run's check alike. */
const templatePicker = (api: Pick<FurnitureApi, 'root'>): ((type: string, name: string) => XNode | undefined) => {
  const templates = api.root.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] }) as readonly XNode[];
  return (type, name) => templates.find((n) => n.type === type && n.name === name) ?? templates.find((n) => n.type === type && isTemplateSet(n.name, name));
};

/** What a set's furniture lacks, as the dry run lists it (#2803). Each count is a part the draw would place and the page
 *  does not hold where the draw would place it; `clear` counts the def's furniture on the set's parent that no wanted
 *  part matched, which the draw clears. All zero when the furniture is current. */
export interface FurnitureDue { labels: number; backdrops: number; clear: number; /** The usage panel to draw (#846, `docPanelDue`). */ panels?: number }
export const furnitureDueCount = (d: FurnitureDue | undefined): number => (d ? d.labels + d.backdrops + d.clear + (d.panels ?? 0) : 0);

/**
 * THE DRY RUN'S FURNITURE CHECK (#2803, owner decision Q379 A). The update compared a set's members only, so furniture
 * that was missing or stale was never a change: an update on a file without `_inverse-backdrop` said "Run Set up file,
 * then update again", and once Set up file added it the next dry run read "No changes found", with nothing to apply.
 *
 * READ AS THE DRAW WOULD DRAW IT, never as a second rule: the same members (`gridMembers`), the same planner
 * (`planFurniture`), the same template lookup (`templatePicker`) and the same guards as `drawFurniture`. A part whose
 * template the file lacks, or whose variant cannot be instanced, is not due: the apply could not draw it, and the
 * run's Set up file line (`templatesLine`) already says so. A set whose inverse rows are not one block draws none, so
 * it is due none; its regroup is the members' change, and the apply redraws after it.
 *
 * WHAT COUNTS AS DRAWN is the def's tagged furniture on the set's parent, the instances the draw clears first, matched in place: a backdrop or scrim by its box,
 * a column label by its left edge, width and bottom, a row label by its vertical center (a thin row's label is centered
 * on it) and its right edge, which the draw sets column by column. Each drawn instance answers one wanted part. Text and a
 * label's own width are the template's and are not compared, so a label whose text the designer edited is not due.
 * Positions match within half a pixel.
 */
export const furnitureDue = (api: Pick<FurnitureApi, 'root'>, set: XNode, layout: FurnitureLayout, defId: string): FurnitureDue => {
  const none: FurnitureDue = { labels: 0, backdrops: 0, clear: 0 };
  const parent = set.parent as FurnitureParent | null | undefined;
  if (!parent || typeof parent.insertChild !== 'function') return none;
  const members = gridMembers(set, layout.cells);
  if (!members.length) return none;
  if (layout.rowKeys.includes('surface') && !inverseContiguous(members)) return none;
  const plan = planFurniture({ x: set.x ?? 0, y: set.y ?? 0 }, members, layout, defId);
  const pick = templatePicker(api);
  const labels = pick('COMPONENT_SET', LABEL_SET);
  const top = labels && labelMember(labels, 'Top');
  const left = labels && labelMember(labels, 'Left');
  const columns = top?.createInstance ? plan.columns : [];
  const rows = left?.createInstance ? plan.rows : [];
  const boxes = [
    ...(plan.backdrops.length && pick('COMPONENT', BACKDROP_COMPONENT)?.createInstance ? plan.backdrops : []),
    ...(plan.scrims.length && pick('COMPONENT', SCRIM_COMPONENT)?.createInstance ? plan.scrims : []),
  ];
  // Every instance of this def's furniture on the parent: what the draw clears first (`clearFurniture`).
  const drawn = (parent.children as readonly XNode[]).filter((c) => !c.removed && readTag(c)?.def === defId);
  const near = (a: number | undefined, b: number): boolean => Math.abs((a ?? 0) - b) <= 0.5;
  const take = (pool: XNode[], fits: (n: XNode) => boolean): boolean => {
    const i = pool.findIndex(fits);
    if (i < 0) return false;
    pool.splice(i, 1);
    return true;
  };
  const drawnLabels = drawn.filter((c) => readTag(c)?.kind === 'label');
  const drawnBoxes = drawn.filter((c) => readTag(c)?.kind === 'backdrop');
  const h = (n: XNode): number => n.height ?? 0;
  const w = (n: XNode): number => n.width ?? 0;
  let due = 0;
  for (const c of columns)
    if (!take(drawnLabels, (n) => near(n.x, c.x) && near(w(n), c.width) && near((n.y ?? 0) + h(n), c.bottom))) due++;
  // Column by column, innermost first, as the draw places them: each column's right edge is `LEVEL_GAP` left of the
  // widest label in the one before it, read off the labels matched there. A column with a part missing has no edge to
  // read, so every label in the columns outside it is due: the draw places them from that edge.
  let right: number | null = plan.rowsRight;
  for (const level of [...new Set(rows.map((r) => r.level))].sort((a, b) => a - b)) {
    const edge: number | null = right;
    const here = rows.filter((x) => x.level === level);
    if (edge === null) { due += here.length; continue; }
    const matched: XNode[] = [];
    for (const r of here) {
      const i = drawnLabels.findIndex((n) => near((n.y ?? 0) + h(n) / 2, r.y + r.height / 2) && near((n.x ?? 0) + w(n), edge));
      if (i < 0) { due++; continue; }
      matched.push(...drawnLabels.splice(i, 1));
    }
    right = matched.length === here.length ? Math.min(edge, ...matched.map((n) => n.x ?? 0)) - LEVEL_GAP : null;
  }
  let dueBoxes = 0;
  for (const b of boxes)
    if (!take(drawnBoxes, (n) => near(n.x, b.x) && near(n.y, b.y) && near(w(n), b.width) && near(h(n), b.height))) dueBoxes++;
  return { labels: due, backdrops: dueBoxes, clear: drawnLabels.length + drawnBoxes.length };
};

/**
 * Clear `defId`'s furniture on the set's parent and draw it fresh from the set's members. `layout` is the set's
 * `planSetLayout` (`furnitureLayout`): it says which cell each member is in.
 *
 * THE PARENT IS READ OFF THE SET, never passed in: furniture goes beside the set, on whatever holds it, and never into
 * the set itself, where the update's hand-edit check and the as-built record would read it as a member.
 */
export const drawFurniture = async (
  api: FurnitureApi,
  set: XNode,
  layout: FurnitureLayout,
  defId: string,
): Promise<FurnitureOutcome> => {
  const parent = set.parent as FurnitureParent | null | undefined;
  if (!parent || typeof parent.insertChild !== 'function')
    return { def: defId, parent: '', columns: 0, rows: 0, backdrops: 0, scrims: 0, cleared: 0, skipped: [`No canvas labels for ${defId}: the set has no parent to place them on`], fontMisses: [] };
  const out: FurnitureOutcome = { def: defId, parent: parent.name ?? '', columns: 0, rows: 0, backdrops: 0, scrims: 0, cleared: clearFurniture(parent, defId) + clearMovedFurniture(api, set, parent), skipped: [], fontMisses: [] };
  const members = gridMembers(set, layout.cells);
  if (!members.length) { out.skipped.push(`No canvas labels for ${defId}: the set has no member this plan lays out`); return out; }
  // ONLY OVER ONE INVERSE BLOCK (#2188 Q173): a set still laid out the earlier way has a band of inverse rows per
  // appearance, and would get a backdrop and an "Inverse" bracket on each. Its old furniture is cleared above; none
  // is drawn until the set is regrouped. DRAFT wording for the owner.
  // A def whose `surface` is the GRID axis (Focus ring) has its inverse members in a column, beside the default ones,
  // never in rows of their own; there is no row block to wait for, and no backdrop is planned (#2502).
  if (layout.rowKeys.includes('surface') && !inverseContiguous(members)) { out.skipped.push(`No canvas labels for ${defId}: its inverse rows are not in one block yet. Run Update to move them, then the labels are drawn`); return out; }
  const plan = planFurniture({ x: set.x ?? 0, y: set.y ?? 0 }, members, layout, defId);
  const setTag = { v: 1 as const, def: defId, set: String(set.id ?? '') };

  const pick = templatePicker(api);
  const labels = pick('COMPONENT_SET', LABEL_SET);
  if (!labels) out.missing = [...(out.missing ?? []), LABEL_SET];
  else {
    const top = labelMember(labels, 'Top');
    const left = labelMember(labels, 'Left');
    if (plan.columns.length && !top?.createInstance) out.skipped.push(`No column labels for ${defId}: ${LABEL_SET} has no ${labelVariant('Top')} variant`);
    else for (const c of plan.columns) {
      const inst = top!.createInstance!();
      parent.appendChild(inst);
      await writeText(api, inst, c.text, out.fontMisses);
      inst.layoutSizingHorizontal = 'FIXED';
      inst.resize?.(c.width, inst.height ?? 0);
      inst.x = c.x;
      inst.y = c.bottom - (inst.height ?? 0);
      tag(inst, { ...setTag, kind: 'label' });
      out.columns++;
    }
    if (plan.rows.length && !left?.createInstance) out.skipped.push(`No row labels for ${defId}: ${LABEL_SET} has no ${labelVariant('Left')} variant`);
    else {
      // Innermost column first; each next column starts left of the widest label in the one before it.
      let right = plan.rowsRight;
      const levels = [...new Set(plan.rows.map((r) => r.level))].sort((a, b) => a - b);
      for (const level of levels) {
        let leftmost = right;
        for (const r of plan.rows.filter((x) => x.level === level)) {
          const inst = left!.createInstance!();
          parent.appendChild(inst);
          await writeText(api, inst, r.text, out.fontMisses);
          // A ROW THINNER THAN ITS LABEL (#2568, owner decision Q258 A): the horizontal Divider is 1px tall, and a
          // label fixed to that height clips its text and its bracket. Such a row keeps the label's own height and
          // draws it centered on the row with no bracket, overhanging the row. Every other row is unchanged.
          const natural = inst.height ?? 0;
          if (r.height < natural) {
            hideBracket(inst);
            inst.y = r.y + (r.height - natural) / 2;
          } else {
            inst.layoutSizingVertical = 'FIXED';
            inst.resize?.(inst.width ?? 0, r.height);
            inst.y = r.y;
          }
          inst.x = right - (inst.width ?? 0);
          leftmost = Math.min(leftmost, inst.x);
          tag(inst, { ...setTag, kind: 'label' });
          out.rows++;
        }
        right = leftmost - LEVEL_GAP;
      }
    }
  }

  if (plan.backdrops.length) {
    const backdrop = pick('COMPONENT', BACKDROP_COMPONENT);
    if (!backdrop) out.missing = [...(out.missing ?? []), BACKDROP_COMPONENT];
    // Wording approved, Q284.2 A.
    else if (!backdrop.createInstance) out.skipped.push(`No inverse backdrop for ${defId}: ${BACKDROP_COMPONENT} cannot be instanced`);
    else {
      out.backdropBinding = await bindBackdrop(api.variables, backdrop);
      for (const b of plan.backdrops) {
        const inst = backdrop.createInstance();
        // BEHIND THE SET: inserted at the set's own index, which moves the set one up.
        const at = (parent.children as readonly unknown[]).indexOf(set);
        parent.insertChild(at < 0 ? 0 : at, inst);
        inst.resize?.(b.width, b.height);
        inst.x = b.x;
        inst.y = b.y;
        tag(inst, { ...setTag, kind: 'backdrop' });
        out.backdrops++;
      }
    }
  }

  // THE SCRIMS (#2609), behind the set like the inverse backdrop, one per member that has one.
  if (plan.scrims.length) {
    const scrim = pick('COMPONENT', SCRIM_COMPONENT);
    if (!scrim) out.missing = [...(out.missing ?? []), SCRIM_COMPONENT];
    else if (!scrim.createInstance) out.skipped.push(`No scrim backdrop for ${defId}: ${SCRIM_COMPONENT} cannot be instanced`);
    else {
      out.scrimBinding = await bindBackdrop(api.variables, scrim, SCRIM_BACKDROP);
      for (const b of plan.scrims) {
        const inst = scrim.createInstance();
        const at = (parent.children as readonly unknown[]).indexOf(set);
        parent.insertChild(at < 0 ? 0 : at, inst);
        inst.resize?.(b.width, b.height);
        inst.x = b.x;
        inst.y = b.y;
        tag(inst, { ...setTag, kind: 'backdrop' });
        out.scrims++;
      }
    }
  }
  return out;
};

/**
 * THE UPDATE'S FURNITURE (#2406, #2188; #2803), redrawn for every piloted set the apply acted on — from the members as
 * they now sit, so the labels follow the update — including a set whose only work was its furniture. A set is found
 * by its component name and drawn only when exactly one set has it. Nothing is drawn when the apply refused the
 * confirm: the named version was not saved, so nothing may be written. A refusal of a write is CAUGHT per set and
 * reported as a skip, never rethrown: the update is already written, and furniture is labeling.
 */
export const furnishUpdate = async (
  api: FurnitureApi,
  r: { outcomes: readonly { def: string }[]; refusedAll?: string },
  targets: readonly { def: string; plans: AnatomyPlan[] }[],
  /** The usage panel's draw for a set (#846), after its labels; absent, no panel is drawn. */
  panel?: (set: XNode, defId: string) => Promise<PanelOutcome>,
): Promise<FurnitureOutcome[]> => {
  const out: FurnitureOutcome[] = [];
  if (r.refusedAll) return out;
  for (const o of r.outcomes) {
    const t = targets.find((x) => x.def === o.def);
    if (!t || !hasFurniture(o.def)) continue;
    const name = t.plans[0]?.component ?? t.def;
    const sets = (api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly XNode[]).filter((n) => n.type === 'COMPONENT_SET' && n.name === name);
    if (sets.length !== 1) continue;
    try {
      const f = await drawFurniture(api, sets[0], furnitureLayout(t.plans), o.def);
      if (panel) withPanel(f, await panel(sets[0], o.def));
      out.push(f);
    }
    catch (e) { out.push({ def: o.def, parent: '', columns: 0, rows: 0, backdrops: 0, scrims: 0, cleared: 0, skipped: [`No canvas labels for ${o.def}: Figma refused the write (${(e as Error)?.message ?? String(e)})`], fontMisses: [] }); }
  }
  return out;
};

/**
 * The furniture prune removes: instances whose set is gone, or whose def no longer has furniture. `setAlive` answers
 * for a set id whether a component set with that id is still in the file. Pure, so the rule is checked offline.
 */
export const staleFurniture = <T extends { tag: FurnitureTag }>(items: readonly T[], setAlive: (setId: string) => boolean): T[] =>
  items.filter((i) => !hasFurniture(i.tag.def) || !setAlive(i.tag.set));

/**
 * PRUNE'S HALF: remove the stale furniture among `nodes` (every tagged instance in the file). Returns how many went.
 * A node with no furniture tag is never touched, so a hand-placed `inverse-bg` rectangle stays (Q172.5).
 */
export const pruneFurniture = (nodes: readonly XNode[], setAlive: (setId: string) => boolean): number => {
  const tagged = nodes.map((node) => ({ node, tag: readTag(node) })).filter((x): x is { node: XNode; tag: FurnitureTag } => x.tag !== null);
  let n = 0;
  for (const f of staleFurniture(tagged, setAlive)) {
    if (f.node.removed) continue;
    f.node.remove?.();
    n++;
  }
  return n;
};

/** The prune's sentence for furniture, preview or applied. Empty when there is none. */
export const furniturePruneText = (n: number, applied: boolean): string => {
  if (n === 0) return '';
  const what = `${n} canvas label${n === 1 ? '' : 's'} or backdrop${n === 1 ? '' : 's'}`;
  return applied
    ? `Removed ${what} left from a set no longer in this file.`
    : `${what} ${n === 1 ? 'belongs' : 'belong'} to a set no longer in this file. Deleting ${n === 1 ? 'it' : 'them'} touches no component.`;
};

/** A set's usage panel folded into its furniture outcome, so the run's template line and warning cover both. */
export const withPanel = (f: FurnitureOutcome, p: PanelOutcome): FurnitureOutcome => {
  f.panel = p;
  if (p.missing?.length) f.missing = [...(f.missing ?? []), ...p.missing];
  return f;
};

/**
 * THE MISSING-TEMPLATE LINE (#2598), once per run, naming every template a set needed and the file lacks, and what to
 * do: run Set up file, then the same action again. Empty when nothing is missing. Wording approved, Q284.1 A.
 */
export const templatesLine = (outcomes: readonly FurnitureOutcome[], action: 'build' | 'update'): string => {
  const missing = [LABEL_SET, BACKDROP_COMPONENT, SCRIM_COMPONENT, DOC_BLOCK_SET].filter((t) => outcomes.some((o) => o.missing?.includes(t)));
  if (!missing.length) return '';
  const what = missing.map((t) => (t === LABEL_SET ? 'canvas labels' : t === SCRIM_COMPONENT ? 'scrim backdrops' : t === DOC_BLOCK_SET ? 'usage panels' : 'inverse backdrops')).join(' or ');
  const names = missing.join(' or ');
  return `No ${what} drawn: this file has no ${names} component. Run Set up file, then ${action === 'build' ? 'build' : 'update'} again`;
};

/** The verdict clauses for a build or update: the missing-template line first, then one per set whose furniture
 *  was skipped in part or fell back. */
export const furnitureItems = (outcomes: readonly FurnitureOutcome[], action: 'build' | 'update'): string[] => {
  const line = templatesLine(outcomes, action);
  const parts: string[] = line ? [line] : [];
  for (const o of outcomes) {
    parts.push(...o.skipped);
    if (o.fontMisses.length) parts.push(`Some canvas labels for ${o.def} kept their placeholder text (${[...new Set(o.fontMisses)].join('; ')})`);
    if (o.backdropBinding === 'no-variable') parts.push(`The inverse backdrop for ${o.def} is not bound yet: apply the theme, then build again`);
    if (o.scrimBinding === 'no-variable') parts.push(`The scrim backdrop for ${o.def} is not bound yet: apply the theme, then build again`);
    parts.push(...panelItems(o.panel));
  }
  return parts;
};

/**
 * AN UPDATE'S VERDICT WITH THE FURNITURE CLAUSES (#2598): each a sentence of its own, in its lines AND its summary, the
 * shape `applyVerdict` gives every other line. They reached the lines only, so an agent reading the summary was told
 * nothing about labels the update did not draw.
 */
export const withFurnitureItems = <V extends { summary: string; lines: string[] }>(verdict: V, items: readonly string[]): V => {
  if (!items.length) return verdict;
  const sentences = items.map((x) => `${x}.`);
  return { ...verdict, summary: [verdict.summary, ...sentences].filter(Boolean).join('\n'), lines: [...verdict.lines, ...sentences] };
};

/**
 * A MISSING TEMPLATE MAKES THE RUN A WARNING (#2598, owner decision Q284.3 A): the build or update worked, but the page
 * is incomplete. The verdict turns `ok: false`, the state every partial result already takes (a build's set reads
 * "issues" and the panel opens its detail), and a `✓` headline becomes `⚠` over the same words, so no new pill copy
 * exists. A headline already `⚠` or `✗` is left as it is: it already reads as not clean. A run with every template
 * present is returned unchanged.
 */
export const withTemplateWarning = <V extends { ok: boolean; headline: string }>(verdict: V, outcomes: readonly FurnitureOutcome[]): V =>
  outcomes.some((o) => o.missing?.length)
    ? { ...verdict, ok: false, headline: verdict.headline.startsWith('✓') ? `⚠${verdict.headline.slice(1)}` : verdict.headline }
    : verdict;
