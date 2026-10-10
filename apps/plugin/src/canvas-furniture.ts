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
 *     pilot's `planSetLayout` groups the inverse rows into one block (Q173 A).
 * The wording is the variant values in sentence case, one vocabulary (Q171.2): `focus-visible` → "Focus visible".
 *
 * PLACED FROM WHERE THE MEMBERS ARE, NOT FROM WHERE THE PLAN SAYS. Rows and columns are measured off the set's
 * members as the host holds them, so a label lines up with what a designer sees even on a set laid out by an earlier
 * plugin. The plan supplies only which row and column each member is in (`planSetLayout`'s cells, by member name).
 *
 * PRISM3'S OWN, AND TAGGED SO. Every instance carries shared plugin data `prism3`/`furniture` naming its def and its
 * set. A rebuild or update clears the def's furniture on that parent and draws it fresh, so it never drifts from the
 * grid; prune removes furniture whose set is gone (`staleFurniture`). The update's hand-edit check and the as-built
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
 * `_inverse-backdrop`; that part is skipped and the outcome says so, the `page-header.ts` posture.
 */
import { planSetLayout, CANVAS_FURNITURE_PILOT } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { isTemplateSet } from './file-components';
import { LABEL_SET, BACKDROP_COMPONENT, labelVariant, bindBackdrop } from './furniture-templates';
import type { BackdropVariables } from './furniture-templates';

export { CANVAS_FURNITURE_PILOT };
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

/** A def's furniture switch: the engine's pilot list, the one switch `planSetLayout` reads too. */
export const hasFurniture = (defId: string): boolean => CANVAS_FURNITURE_PILOT.has(defId);

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
  return { columns, rows: rowLabels, rowsRight: set.x - LABEL_GAP, backdrops, rowAxes };
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
  root: { findAllWithCriteria(criteria: { types: ('COMPONENT' | 'COMPONENT_SET')[] }): readonly unknown[] };
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
  /** Instances of this def's earlier furniture removed first. */
  cleared: number;
  /** A part not drawn, as the verdict sentence: no `_Label` in the file, no `_inverse-backdrop`, or a missing variant. */
  skipped: string[];
  fontMisses: string[];
  /** `bound` when this run bound the backdrop template to the inverse ground; `no-variable` before a theme. */
  backdropBinding?: 'bound' | 'kept' | 'no-variable';
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

/** Write a label's text, loading the face its text node carries. A face that will not load keeps "Label". */
const writeText = async (api: FurnitureApi, inst: XNode, value: string, misses: string[]): Promise<void> => {
  const t = inst.findOne?.((n) => n.type === 'TEXT' && n.name === 'text');
  if (!t) { misses.push(`${LABEL_SET} has no text layer named "text"`); return; }
  const font = t.fontName as { family?: unknown; style?: unknown } | undefined;
  if (!font || typeof font.family !== 'string' || typeof font.style !== 'string') { misses.push(`${LABEL_SET}: mixed or unreadable font`); return; }
  try { await api.loadFontAsync({ family: font.family, style: font.style }); }
  catch { misses.push(`${font.family} ${font.style} unavailable for ${LABEL_SET}`); return; }
  t.characters = value;
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
    return { def: defId, parent: '', columns: 0, rows: 0, backdrops: 0, cleared: 0, skipped: [`No canvas labels for ${defId}: the set has no parent to place them on`], fontMisses: [] };
  const out: FurnitureOutcome = { def: defId, parent: parent.name ?? '', columns: 0, rows: 0, backdrops: 0, cleared: clearFurniture(parent, defId), skipped: [], fontMisses: [] };
  const members = gridMembers(set, layout.cells);
  if (!members.length) { out.skipped.push(`No canvas labels for ${defId}: the set has no member this plan lays out`); return out; }
  // ONLY OVER ONE INVERSE BLOCK (#2188 Q173): a set still laid out the earlier way has a band of inverse rows per
  // appearance, and would get a backdrop and an "Inverse" bracket on each. Its old furniture is cleared above; none
  // is drawn until the set is regrouped. DRAFT wording for the owner.
  if (!inverseContiguous(members)) { out.skipped.push(`No canvas labels for ${defId}: its inverse rows are not in one block yet. Run Update to move them, then the labels are drawn`); return out; }
  const plan = planFurniture({ x: set.x ?? 0, y: set.y ?? 0 }, members, layout);
  const setTag = { v: 1 as const, def: defId, set: String(set.id ?? '') };

  const templates = api.root.findAllWithCriteria({ types: ['COMPONENT_SET', 'COMPONENT'] }) as readonly XNode[];
  // Exact case first, then any case — the `page-header.ts` rule, so a plugin-built `_Label` wins over a user's copy.
  const pick = (type: string, name: string): XNode | undefined =>
    templates.find((n) => n.type === type && n.name === name) ?? templates.find((n) => n.type === type && isTemplateSet(n.name, name));

  const labels = pick('COMPONENT_SET', LABEL_SET);
  if (!labels) out.skipped.push(`No canvas labels for ${defId}: this file has no ${LABEL_SET} component, and Set up file adds it`);
  else {
    const variant = (placement: 'Top' | 'Left'): XNode | undefined => labels.children?.find((c) => c.name === labelVariant(placement));
    const top = variant('Top');
    const left = variant('Left');
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
          inst.layoutSizingVertical = 'FIXED';
          inst.resize?.(inst.width ?? 0, r.height);
          inst.x = right - (inst.width ?? 0);
          inst.y = r.y;
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
    if (!backdrop?.createInstance) out.skipped.push(`No inverse backdrop for ${defId}: this file has no ${BACKDROP_COMPONENT} component, and Set up file adds it`);
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
  return out;
};

/**
 * The furniture prune removes: instances whose set is gone, or whose def is no longer piloted. `setAlive` answers
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

/** The verdict clauses for a build or update: one per set whose furniture was skipped in part or fell back. */
export const furnitureItems = (outcomes: readonly FurnitureOutcome[]): string[] => {
  const parts: string[] = [];
  for (const o of outcomes) {
    parts.push(...o.skipped);
    if (o.fontMisses.length) parts.push(`Some canvas labels for ${o.def} kept their placeholder text (${[...new Set(o.fontMisses)].join('; ')})`);
    if (o.backdropBinding === 'no-variable') parts.push(`The inverse backdrop for ${o.def} is not bound yet: apply the theme, then build again`);
  }
  return parts;
};
