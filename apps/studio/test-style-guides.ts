/**
 * Build style guides — the page's model (UI redesign S11.2), `src/state/style-guides.ts`, in Node with no DOM.
 *
 *   npx tsx apps/studio/test-style-guides.ts
 *
 * The catalog below is typed here, the shape the plugin's `style-guide-catalog` carries: three collections, a
 * later-phase variable, the text styles. Every expected value is a literal (docs/34): the tree's rows and which carry a
 * box (P3 B, whole tables), what starts open (the mockup's call 2), the boxes' states, the counts and words beside
 * Draw (P12), the title box (H8), and what Draw sends: the defaults of H4–H9 (Hex, from each role, REM off, Name cell
 * off), and the selection as table keys only when it is not every table.
 *
 * Mutations that fail here by name (see the S11.2 page PR's progress entry): a leaf boxed below the table level →
 * `tree: below the table level nothing carries a box`; REM on by default → `draw: the defaults (H4–H9) …`; the
 * selection always sent as keys → `draw: every table selected sends no tables filter …`.
 */
import { treesOf, defaultOpen, boxOf, countsOf, summaryText, drawLabel, kindsOf, hasLengths, byTitles, drawOptions, DEFAULT_OPTIONS, keepSelection, tablesInView, type SgNode } from './src/state/style-guides';
import type { StyleGuideCatalog } from '../plugin/src/messages';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const CAT: StyleGuideCatalog = {
  setUp: true,
  collections: [
    { id: 'C:core', name: 'core', modes: ['Default'], items: [
      { name: 'pds3/core/palette/white', table: 0, value: '#FFFFFF' },
      { name: 'pds3/core/palette/black', table: 0, value: '#000000' },
      { name: 'pds3/core/palette/primary/100', table: 1, value: '#E0E0FF' },
      { name: 'pds3/core/palette/primary/200', table: 1, value: '#C0C0FF' },
      { name: 'pds3/core/dimension/4', table: 2, value: '4px' },
      { name: 'pds3/core/dimension/8', table: 2, value: '8px' },
      { name: 'pds3/core/font/style/display', table: -1, value: 'Bold' },
    ] },
    { id: 'C:color', name: 'color', modes: ['light', 'dark'], items: [
      { name: 'pds3/color/text/primary', table: 3, value: '#111111' },
      { name: 'pds3/color/text/secondary', table: 3, value: '#555555' },
      { name: 'pds3/color/interactive/primary/fill/rest', table: 4, value: '#1E1EFF' },
      { name: 'pds3/color/interactive/primary/text/rest', table: 4, value: '#FFFFFF' },
    ] },
    { id: 'C:opacity', name: 'opacity', modes: ['Default'], items: [{ name: 'pds3/opacity/50', table: -1, value: '50' }] },
    { id: 'text-styles', name: 'Text styles', modes: [], textStyles: true, items: [{ name: 'body/md', table: 5, value: '' }, { name: 'body/sm', table: 5, value: '' }] },
  ],
  tables: [
    { key: 'color|C:core|pds3/core/palette', title: 'Core — base', kind: 'color', page: 'Primitive tokens', rows: 2 },
    { key: 'color|C:core|pds3/core/palette/primary', title: 'Primary', kind: 'color', page: 'Primitive tokens', rows: 2 },
    { key: 'dimension|C:core|pds3/core/dimension', title: 'Dimension', kind: 'dimension', page: 'Primitive tokens', rows: 2 },
    { key: 'color|C:color|pds3/color/text', title: 'Text', kind: 'color', page: 'Semantic tokens', rows: 2 },
    { key: 'color|C:color|pds3/color/interactive', title: 'Interactive', kind: 'color', page: 'Semantic tokens', rows: 2 },
    { key: 'typography|text-styles|body', title: 'Text styles', kind: 'text', page: 'Semantic tokens', rows: 2 },
  ],
  notes: [],
};

/** A tree as lines: depth, label, tables, box, drawable of leaves. */
const lines = (n: SgNode, d = 0): string[] => [`${'  '.repeat(d)}${n.label} [${n.tables.join(',')}]${n.box ? ' box' : ''} ${n.drawable}/${n.leaves}`, ...n.kids.flatMap((k) => lines(k, d + 1))];
const trees = treesOf(CAT);

console.log('tree');
ok(same(trees.map((t) => lines(t)), [
  ['core [0,1,2] box 6/7',
    '  palette [0,1] box 4/4', '    primary [1] box 2/2', '      100 [1] 1/1', '      200 [1] 1/1', '    white [0] box 1/1', '    black [0] box 1/1',
    '  dimension [2] box 2/2', '    4 [2] 1/1', '    8 [2] 1/1',
    '  font / style [] box 0/1', '    display [] 0/1'],
  ['color [3,4] box 4/4',
    '  text [3] box 2/2', '    primary [3] 1/1', '    secondary [3] 1/1',
    '  interactive / primary [4] box 2/2', '    fill [4] 1/1', '      rest [4] 1/1', '    text [4] 1/1', '      rest [4] 1/1'],
  ['opacity [] box 0/1', '  50 [] 0/1'],
  ['Text styles [5] box 2/2', '  md [5] 1/1', '  sm [5] 1/1'],
]), `tree: each collection folds its single-group chain, a chain of single groups is one row, and a row carries a box at or above the table level (${JSON.stringify(trees.map((t) => lines(t)))})`);
// The rule restated on its own: a row whose parent spans one table or none never carries a box.
const below: string[] = [];
const walk = (n: SgNode): void => { for (const k of n.kids) { if (n.tables.length <= 1 && k.box) below.push(k.label); walk(k); } };
for (const t of trees) walk(t);
ok(below.length === 0, `tree: below the table level nothing carries a box (${below.join(', ')})`);

console.log('\nwhat starts open (the mockup\'s call 2)');
ok(same([...defaultOpen(trees, true)], ['C:core:core/pds3/core/palette']), `open, every collection: only a group spanning more than one table; the collections start closed (${[...defaultOpen(trees, true)]})`);
ok(same([...defaultOpen(trees, false)], ['C:core:core/pds3/core', 'C:core:core/pds3/core/palette', 'C:color:color/pds3/color']),
  `open, one collection: its own row too, when it spans more than one table (${[...defaultOpen(trees, false)]})`);

console.log('\nboxes, counts and words');
const sel1 = new Set([1]);
ok(same([boxOf(trees[0].tables, sel1), boxOf([0, 1], sel1), boxOf([1], sel1), boxOf([2], sel1)], ['mixed', 'mixed', 'on', 'off']), 'box: mixed while part of its tables are selected, on, off');
const every = new Set(CAT.tables.map((_, i) => i));
ok(same(countsOf(CAT, every), { tables: 6, variables: 10, textStyles: 2 }), `counts: every table draws 10 variables and 2 text styles, never the later-phase ones (${JSON.stringify(countsOf(CAT, every))})`);
ok(same(summaryText(countsOf(CAT, every)), { lead: '6 tables', rest: '10 variables, 2 text styles' }) && same(summaryText(countsOf(CAT, new Set([5]))), { lead: '1 table', rest: '2 text styles' })
  && same(summaryText(countsOf(CAT, new Set([3]))), { lead: '1 table', rest: '2 variables' }) && summaryText(countsOf(CAT, new Set())) === null,
  'summary: "6 tables · 10 variables, 2 text styles", singular for one, none for nothing selected');
ok(drawLabel(32) === 'Draw 32 tables' && drawLabel(1) === 'Draw 1 table' && drawLabel(0) === 'Draw', `draw: "Draw 32 tables", "Draw 1 table", "Draw" (${drawLabel(32)})`);
ok(same([...kindsOf(CAT, new Set([0, 3]))], ['color']) && !hasLengths(kindsOf(CAT, new Set([0, 3]))) && hasLengths(kindsOf(CAT, new Set([2]))) && hasLengths(kindsOf(CAT, new Set([5]))),
  'kinds: a color-only selection holds no length kind, so no REM (H1, H6); a dimension or a text style does');
ok(same(tablesInView(CAT, trees, null), [0, 1, 2, 3, 4, 5]) && same(tablesInView(CAT, trees, 'C:color'), [3, 4]) && same(tablesInView(CAT, trees, 'C:opacity'), []),
  'view: every collection, or one collection\'s tables');

console.log('\nthe title box (H8)');
ok(same(byTitles(CAT, 'text\n  Interactive \nNope\n', [0, 1, 2, 3, 4, 5]), { tables: [3, 4], unknown: ['Nope'] }), 'titles: one a line, any case, trimmed; a name that matches nothing is reported');
ok(same(byTitles(CAT, 'Primary', [3, 4]), { tables: [], unknown: [] }), 'titles: only tables in view are selected');

console.log('\nwhat Draw sends');
ok(same(DEFAULT_OPTIONS, { header: 'dark', aliases: true, description: true, nameCell: false, rem: false, valueFormat: 'hex', colorSample: 'auto', dimensionDisplay: 'filled', fontSample: 'auto', paragraphSpacing: false, textDecoration: false, tokenNames: 'full' }),
  'draw: the defaults (H4–H9): Hex, from each token\'s role, REM off, Name cell off, full token paths (#2372)');
ok(same(drawOptions(CAT, every, DEFAULT_OPTIONS), { header: 'dark', aliases: true, description: true, titleCell: false, rem: false, valueFormat: 'hex', display: 'auto', dimensionDisplay: 'filled', fontDisplay: 'auto', paragraphSpacing: false, textDecoration: false, tokenNames: 'full' }),
  'draw: every table selected sends no tables filter, so the run judges superseded tables');
ok(same(drawOptions(CAT, new Set([5, 3]), { ...DEFAULT_OPTIONS, rem: true, nameCell: true }).tables, ['color|C:color|pds3/color/text', 'typography|text-styles|body'])
  && drawOptions(CAT, new Set([3]), { ...DEFAULT_OPTIONS, nameCell: true }).titleCell === true,
  'draw: a part selection sends its tables by key, in draw order; the Name cell is the run\'s titleCell');
ok(drawOptions(CAT, every, { ...DEFAULT_OPTIONS, tokenNames: 'short' }).tokenNames === 'short',
  'draw: Token names set to Short sends tokenNames short (#2372)');
const newer: StyleGuideCatalog = { ...CAT, tables: [CAT.tables[3], { ...CAT.tables[0], key: 'color|C:core|gone' }, CAT.tables[5]] };
ok(same([...keepSelection(CAT, new Set([0, 3]), newer)], [0]), 'selection: a newer catalog keeps the selected tables still in the file, by key');

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
