/**
 * The Build style guides page's model (UI redesign S11.2): the tree, the selection and what a click on Draw sends.
 * DOM-free, so `test-style-guides.ts` asserts it in Node; `shell/style-guides.ts` draws it.
 *
 * THE OWNER'S DECISIONS IT CARRIES (2026-10-05, on the approved mockup):
 *   • P2 A: THE TREE IS THE ONE SELECTION. The selection is a set of tables. The four kind boxes check or clear every
 *     table of their kind in view and show checked, mixed or empty from it; the title box writes into it (typing
 *     titles selects exactly those tables, emptying it selects every table in view); checking anything in the tree
 *     clears the title box, which no longer describes the selection.
 *   • P3 B: WHOLE TABLES. A group's box checks every table under it. The tree stops at the table level: a group or a
 *     variable inside a single table shows, with no box of its own, since it cannot be drawn apart from its table.
 *   • P4 A: every mode, side by side. The page sends no mode.
 *   • P5 A: a variable no phase draws is shown, grayed out and tagged "Later phase", and cannot be checked.
 *   • The mockup's call 2: a group starts open while it holds more than one table, a group that is one table starts
 *     closed, and with every collection shown the collections themselves start closed. A chain of single groups is
 *     one row ("pds3 / core").
 *   • H4–H9: the options and their defaults. REM is off (H6) and the Name cell off (H9).
 */
import type { StyleGuideCatalog, StyleGuideKind, StyleGuideOptions } from '../../../plugin/src/messages';

/** A tree row: a group (with children) or one variable or text style. */
export type SgNode = {
  /** Stable across repaints: the collection's id and the row's path. */
  readonly id: string;
  readonly label: string;
  readonly kids: readonly SgNode[];
  /** The variable or text style a leaf is; null for a group. */
  readonly item: { readonly name: string; readonly table: number; readonly value: string } | null;
  /** Every table a drawable leaf under this row is drawn in, ascending. Empty: nothing here is drawn yet (P5). */
  readonly tables: readonly number[];
  /** Leaves under this row (itself, for a leaf), drawable and in all. */
  readonly drawable: number;
  readonly leaves: number;
  /** Whether this row carries a box: it is at or above the table level (P3 B). */
  readonly box: boolean;
};

/** Every collection's tree, in the catalog's order, its root labeled by the collection's name. Pure. */
export const treesOf = (cat: StyleGuideCatalog): SgNode[] => cat.collections.map((col) => {
  type Raw = { label: string; kids: Map<string, Raw>; leaves: { name: string; table: number; value: string; last: string }[] };
  const root: Raw = { label: col.name, kids: new Map(), leaves: [] };
  for (const it of col.items) {
    const segs = it.name.split('/');
    let n = root;
    for (const s of segs.slice(0, -1)) {
      if (!n.kids.has(s)) n.kids.set(s, { label: s, kids: new Map(), leaves: [] });
      n = n.kids.get(s)!;
    }
    n.leaves.push({ ...it, last: segs[segs.length - 1] });
  }
  const compose = (r: Raw, path: string, top: boolean, parentTables: number): SgNode => {
    // A chain of single groups is one row ("pds3 / core"). The collection's own row keeps its name, and folds the
    // chain under it away (`core` opens straight onto `palette`, `dimension` and `font`).
    let label = r.label, cur = r, p = path;
    while (cur.kids.size === 1 && cur.leaves.length === 0) {
      cur = [...cur.kids.values()][0];
      p = `${p}/${cur.label}`;
      if (!top) label = `${label} / ${cur.label}`;
    }
    const own = new Set<number>();
    const visit = (x: Raw): void => { for (const lf of x.leaves) if (lf.table >= 0) own.add(lf.table); for (const k of x.kids.values()) visit(k); };
    visit(cur);
    const tables = [...own].sort((a, b) => a - b);
    const groups = [...cur.kids.values()].map((k) => compose(k, `${p}/${k.label}`, false, tables.length));
    // A variable carries a box when it sits directly in a row that spans more than one table: its table has no
    // row of its own. Below the table level nothing carries one (P3 B).
    const leaves = cur.leaves.map((lf): SgNode => ({
      id: `${col.id}:${p}/${lf.last}`, label: lf.last, kids: [], item: { name: lf.name, table: lf.table, value: lf.value },
      tables: lf.table >= 0 ? [lf.table] : [], drawable: lf.table >= 0 ? 1 : 0, leaves: 1, box: tables.length > 1 && lf.table >= 0,
    }));
    const kids = [...groups, ...leaves];
    return {
      id: `${col.id}:${p}`, label, kids, item: null, tables,
      drawable: kids.reduce((a, k) => a + k.drawable, 0), leaves: kids.reduce((a, k) => a + k.leaves, 0),
      box: top || parentTables > 1,
    };
  };
  return compose(root, col.name, true, 0);
});

/** The rows that start open (the mockup's call 2). */
export const defaultOpen = (trees: readonly SgNode[], everyCollection: boolean): Set<string> => {
  const open = new Set<string>();
  const visit = (n: SgNode, top: boolean): void => {
    if (!(top && everyCollection) && n.tables.length > 1) open.add(n.id);
    for (const k of n.kids) if (!k.item) visit(k, false);
  };
  for (const t of trees) visit(t, true);
  return open;
};

/** A row's box: checked, mixed (part of its tables are selected), or empty; and off when nothing in it is drawn. */
export type BoxState = 'on' | 'mixed' | 'off';
export const boxOf = (tables: readonly number[], sel: ReadonlySet<number>): BoxState => {
  const on = tables.filter((t) => sel.has(t)).length;
  return on === 0 ? 'off' : on === tables.length ? 'on' : 'mixed';
};

/** The tables in view: every table, or the one collection's (`view`, a collection id). */
export const tablesInView = (cat: StyleGuideCatalog, trees: readonly SgNode[], view: string | null): number[] =>
  [...new Set(trees.filter((_, i) => view === null || cat.collections[i]?.id === view).flatMap((t) => t.tables))].sort((a, b) => a - b);

/** A selection carried onto a newer catalog, by table key: a table still in the file stays selected, a new one is not. */
export const keepSelection = (was: StyleGuideCatalog, sel: ReadonlySet<number>, now: StyleGuideCatalog): Set<number> => {
  const keys = new Set([...sel].map((i) => was.tables[i]?.key).filter(Boolean));
  return new Set(now.tables.flatMap((t, i) => (keys.has(t.key) ? [i] : [])));
};

/** The variables (not text styles) and text styles a selection draws, counted. */
export const countsOf = (cat: StyleGuideCatalog, sel: ReadonlySet<number>): { tables: number; variables: number; textStyles: number } => {
  let variables = 0, textStyles = 0;
  for (const col of cat.collections) for (const it of col.items) if (it.table >= 0 && sel.has(it.table)) { if (col.textStyles) textStyles++; else variables++; }
  return { tables: sel.size, variables, textStyles };
};

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
/** The summary beside Draw (approved copy, P12). */
export const summaryText = (c: { tables: number; variables: number; textStyles: number }): { lead: string; rest: string } | null =>
  c.tables === 0 ? null : {
    lead: plural(c.tables, 'table', 'tables'),
    rest: [c.variables && plural(c.variables, 'variable', 'variables'), c.textStyles && plural(c.textStyles, 'text style', 'text styles')].filter(Boolean).join(', '),
  };
/** Draw's label (approved copy, P12): "Draw 32 tables", or "Draw" with nothing selected. */
export const drawLabel = (n: number): string => (n ? `Draw ${plural(n, 'table', 'tables')}` : 'Draw');

/** The kinds a selection holds, which decide the option groups shown (the owner's H1: no text options for color). */
export const kindsOf = (cat: StyleGuideCatalog, sel: ReadonlySet<number>): Set<StyleGuideKind> => new Set([...sel].map((t) => cat.tables[t]?.kind).filter(Boolean) as StyleGuideKind[]);
/** REM shows only when a length kind is selected. */
export const hasLengths = (k: ReadonlySet<StyleGuideKind>): boolean => k.has('dimension') || k.has('font') || k.has('text');

/** The title box (H8): one title a line. Returns the tables named, and the names that match none. */
export const byTitles = (cat: StyleGuideCatalog, text: string, inView: readonly number[]): { tables: number[]; unknown: string[] } => {
  const names = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const unknown = names.filter((n) => !cat.tables.some((t) => t.title.toLowerCase() === n.toLowerCase()));
  const tables = inView.filter((i) => names.some((n) => cat.tables[i].title.toLowerCase() === n.toLowerCase()));
  return { tables, unknown };
};

/** The page's options and their defaults (H4–H9). */
export type PageOptions = {
  header: 'dark' | 'light'; aliases: boolean; description: boolean; nameCell: boolean; rem: boolean;
  valueFormat: 'hex' | 'rgba' | 'hsl' | 'hsb';
  colorSample: 'auto' | 'default' | 'text' | 'border' | 'icon' | 'transparency';
  dimensionDisplay: 'filled' | 'line';
  fontSample: 'auto' | 'generic' | 'family' | 'size' | 'weight' | 'letterSpacing' | 'lineHeight';
  paragraphSpacing: boolean; textDecoration: boolean;
};
export const DEFAULT_OPTIONS: Readonly<PageOptions> = {
  header: 'dark', aliases: true, description: true, nameCell: false, rem: false, valueFormat: 'hex', colorSample: 'auto',
  dimensionDisplay: 'filled', fontSample: 'auto', paragraphSpacing: false, textDecoration: false,
};

/** What a click on Draw posts. Every option goes, so the run draws what the page shows. The selection goes as table
 *  KEYS, and only when it is not every table in the file: an unfiltered run is the one that judges superseded tables
 *  (#1778), and a key, unlike a title, names one table. */
export const drawOptions = (cat: StyleGuideCatalog, sel: ReadonlySet<number>, o: PageOptions): StyleGuideOptions => {
  const all = cat.tables.length > 0 && cat.tables.every((_, i) => sel.has(i));
  return {
    header: o.header, aliases: o.aliases, description: o.description, titleCell: o.nameCell, rem: o.rem,
    valueFormat: o.valueFormat, display: o.colorSample, dimensionDisplay: o.dimensionDisplay, fontDisplay: o.fontSample,
    paragraphSpacing: o.paragraphSpacing, textDecoration: o.textDecoration,
    ...(all ? {} : { tables: [...sel].sort((a, b) => a - b).map((i) => cat.tables[i].key) }),
  };
};
