/**
 * THE READ COMMANDS' FIXTURE (#3147 Phase 2a): one small file as a `NodeShim` page tree, and what each read command
 * must answer about it, written out by hand.
 *
 * Shared by `test-agent-link.ts` (the mailbox) and `test-agent-bridge.ts` (the desktop bridge), so both transports
 * are held to ONE expectation. INDEPENDENCE (docs/34): every value under `EXPECTED` is a literal typed here from the
 * tree below, never computed by `agent-reads.ts` or derived from the shim; the PNG's base64 is Node's own encoder
 * over the fixture bytes, not the plugin's hand-written one.
 */
import { NodeShim } from './file-shim';
import type { NodeSpec } from './file-shim';

/** A PNG header whose IHDR says 750 × 1624, then four bytes of padding: what `exportAsync` returns for `F1` at 2×. */
export const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR, 13 bytes
  0x00, 0x00, 0x02, 0xee, 0x00, 0x00, 0x06, 0x58, // 750, 1624
  0x08, 0x06, 0x00, 0x00,
]);
export const PNG_BASE64 = Buffer.from(PNG).toString('base64');

const solid = (variable?: string) => [{ type: 'SOLID', visible: true, ...(variable ? { boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable } } } : {}) }];

const PAGES: NodeSpec[] = [
  { id: 'P1', type: 'PAGE', name: 'Components', children: [
    { id: 'S1', type: 'COMPONENT_SET', name: 'Button', key: 'k-set-button', publish: 'CURRENT',
      componentPropertyDefinitions: { Size: { type: 'VARIANT', variantOptions: ['sm', 'md'] }, 'Label#1:0': { type: 'TEXT' } },
      children: [
        { id: 'C1', type: 'COMPONENT', name: 'Size=sm', key: 'k-btn-sm' },
        { id: 'C2', type: 'COMPONENT', name: 'Size=md', key: 'k-btn-md' },
      ] },
    { id: 'C3', type: 'COMPONENT', name: 'Icon', key: 'k-icon', publish: 'UNPUBLISHED' },
  ] },
  { id: 'P2', type: 'PAGE', name: 'Screens', children: [
    { id: 'F1', type: 'FRAME', name: 'Checkout', width: 375, height: 812, png: PNG,
      layoutMode: 'VERTICAL', itemSpacing: 16, paddingTop: 24, paddingRight: 16, paddingBottom: 24, paddingLeft: 16,
      layoutSizingHorizontal: 'FIXED', layoutSizingVertical: 'HUG',
      boundVariables: { itemSpacing: { type: 'VARIABLE_ALIAS', id: 'V1' } },
      children: [
        { id: 'I1', type: 'INSTANCE', name: 'Button', width: 120, height: 40, locked: true, main: 'C2',
          componentProperties: { Size: { type: 'VARIANT', value: 'md' }, 'Label#1:0': { type: 'TEXT', value: 'Pay' } },
          children: [{ id: 'I1T', type: 'TEXT', name: 'Label', width: 40, height: 20, textStyleId: 'S:title', characters: 'Pay' }] },
        { id: 'T2', type: 'TEXT', name: 'Title', width: 200, height: 32, textStyleId: 'S:title', characters: 'Checkout', fills: solid('V2'),
          boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'V2' }] } },
        { id: 'X1', type: 'FRAME', name: 'slot body', unreadable: true },
        { id: 'R1', type: 'RECTANGLE', name: 'After', width: 10, height: 10 },
      ] },
    // #3300 B: `context`'s protected nodes. A locked frame (its child is inside it, so not listed apart) and a rebind backup.
    { id: 'L1', type: 'FRAME', name: 'Note', width: 200, height: 80, locked: true, children: [
      { id: 'L1t', type: 'TEXT', name: 'Do not ship', width: 180, height: 20, characters: 'Do not ship', locked: true },
    ] },
    { id: 'O1', type: 'FRAME', name: 'Original · Checkout', width: 375, height: 812, children: [
      { id: 'O1i', type: 'INSTANCE', name: 'Old Button', width: 100, height: 40, main: 'OB', locked: true },
    ] },
  ] },
  { id: 'P3', type: 'PAGE', name: 'Audit', children: [
    { id: 'A1', type: 'FRAME', name: 'Legacy screen', width: 375, height: 200, children: [
      { id: 'A1i', type: 'INSTANCE', name: 'Old Button', width: 100, height: 40, main: 'OB' },
    ] },
    { id: 'A2', type: 'FRAME', name: 'Unstyled screen', width: 375, height: 200, children: [
      { id: 'A2t', type: 'TEXT', name: 'Body', width: 200, height: 20, textStyleId: '', characters: 'Hello', fills: solid('V2') },
    ] },
    { id: 'A3', type: 'FRAME', name: 'Raw fill screen', width: 375, height: 200, children: [
      { id: 'A3r', type: 'RECTANGLE', name: 'Card', width: 40, height: 40, fills: solid() },
    ] },
    { id: 'A4', type: 'FRAME', name: 'Divider screen', width: 375, height: 200, children: [
      { id: 'A4l', type: 'LINE', name: 'Rule', width: 300, height: 0 },
    ] },
    { id: 'A5', type: 'FRAME', name: 'Frame 12', width: 375, height: 200, children: [
      { id: 'A5r', type: 'RECTANGLE', name: 'Card', width: 40, height: 40, fills: solid('V2') },
    ] },
    { id: 'A6', type: 'FRAME', name: 'Clean screen', width: 375, height: 200, children: [
      { id: 'A6t', type: 'TEXT', name: 'Title', width: 200, height: 32, textStyleId: 'S:title', characters: 'Done', fills: solid('V2') },
      { id: 'A6r', type: 'RECTANGLE', name: 'Card', width: 40, height: 40, fills: solid('V2') },
      { id: 'A6i', type: 'INSTANCE', name: 'Button', width: 120, height: 40, main: 'C2' },
    ] },
  ] },
  { id: 'P4', type: 'PAGE', name: 'Legacy', children: [
    { id: 'OB', type: 'COMPONENT', name: 'Old Button', key: 'k-old', publish: 'CURRENT' },
  ] },
  // #3300 B: a FINAL page. Everything on it is protected, so `context` lists the page and does not walk it.
  { id: 'P5', type: 'PAGE', name: 'Checkout FINAL', children: [
    { id: 'Z1', type: 'FRAME', name: 'Checkout', width: 375, height: 812, locked: true },
  ] },
];

/** A fresh shim of the fixture file: its write log starts empty. */
export const readFixture = () => new NodeShim(PAGES, {
  styles: { 'S:title': 'Heading/Large' },
  variables: { V1: 'space/16', V2: 'color/ink' },
});

/** The args each arm sends. */
export const ARGS = {
  inspect: { ids: ['F1'] },
  inspectCap: { ids: ['F1'], maxNodes: 2 },
  keys: { sets: true },
  keysNamed: { names: ['Icon', 'Nope'] },
  audit: { ids: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'], legacy: { components: ['Old Button'] } },
  auditLegacyLists: { ids: ['A6'], legacy: { textStyles: ['Heading/Large'], variablePrefixes: ['color/'] } },
  snapshot: { id: 'F1', scale: 2 },
} as const;

const zero = { legacyInstances: 0, unstyledText: 0, rawFills: 0, standInDividers: 0, badName: 0 };
const none = { legacyInstances: [], unstyledText: [], rawFills: [], standInDividers: [], badName: [] };
const one = (id: string, frame: string, count: keyof typeof zero) => ({ id: frame, counts: { ...zero, [count]: 1 }, layers: { ...none, [count]: [id] } });

/** Each command's `result.data` for its args above, by hand. */
export const EXPECTED = {
  inspect: {
    nodes: [
      { id: 'F1', parentId: null, type: 'FRAME', name: 'Checkout', page: 'Screens', size: { width: 375, height: 812 }, locked: false, mainComponent: null, childCount: 4,
        componentProperties: null, boundVariables: { itemSpacing: 'space/16' }, textStyle: null,
        layout: { mode: 'VERTICAL', itemSpacing: 16, padding: { top: 24, right: 16, bottom: 24, left: 16 }, sizing: { horizontal: 'FIXED', vertical: 'HUG' } }, characters: null },
      { id: 'I1', parentId: 'F1', type: 'INSTANCE', name: 'Button', page: 'Screens', size: { width: 120, height: 40 }, locked: true,
        mainComponent: { key: 'k-btn-md', name: 'Size=md', remote: false, set: 'Button' }, childCount: 1,
        componentProperties: { Size: { type: 'VARIANT', value: 'md' }, 'Label#1:0': { type: 'TEXT', value: 'Pay' } }, boundVariables: null, textStyle: null, layout: null, characters: null },
      { id: 'T2', parentId: 'F1', type: 'TEXT', name: 'Title', page: 'Screens', size: { width: 200, height: 32 }, locked: false, mainComponent: null, childCount: 0,
        componentProperties: null, boundVariables: { fills: ['color/ink'] }, textStyle: 'Heading/Large', layout: null, characters: 'Checkout' },
      { id: 'R1', parentId: 'F1', type: 'RECTANGLE', name: 'After', page: 'Screens', size: { width: 10, height: 10 }, locked: false, mainComponent: null, childCount: 0,
        componentProperties: null, boundVariables: null, textStyle: null, layout: null, characters: null },
    ],
    unreadable: [{ id: 'X1', error: 'node X1 could not be read' }],
    truncated: false,
  },
  inspectCap: { nodeIds: ['F1', 'I1'], truncated: true },
  keys: {
    components: [
      { name: 'Button', key: 'k-set-button', kind: 'set', published: true, variantProperties: { Size: ['sm', 'md'] }, members: [{ name: 'Size=sm', key: 'k-btn-sm' }, { name: 'Size=md', key: 'k-btn-md' }] },
      { name: 'Icon', key: 'k-icon', kind: 'component', published: false, variantProperties: null },
      { name: 'Old Button', key: 'k-old', kind: 'component', published: true, variantProperties: null },
    ],
    missing: [],
    unreadable: [],
  },
  keysNamed: {
    components: [{ name: 'Icon', key: 'k-icon', kind: 'component', published: false, variantProperties: null }],
    missing: ['Nope'],
    unreadable: [],
  },
  audit: {
    frames: [
      one('A1i', 'A1', 'legacyInstances'),
      one('A2t', 'A2', 'unstyledText'),
      one('A3r', 'A3', 'rawFills'),
      one('A4l', 'A4', 'standInDividers'),
      one('A5', 'A5', 'badName'),
      { id: 'A6', counts: zero, layers: none },
    ],
    unreadable: [],
    truncated: false,
  },
  auditLegacyLists: {
    frames: [{ id: 'A6', counts: { ...zero, unstyledText: 1, rawFills: 2 }, layers: { ...none, unstyledText: ['A6t'], rawFills: ['A6t', 'A6r'] } }],
    unreadable: [],
    truncated: false,
  },
  snapshot: { png: PNG_BASE64, width: 750, height: 1624, local: true },
} as const;

/** Key-order-free JSON, so a check compares what an envelope says and not how its keys happen to be ordered. */
export const canon = (x: unknown): string => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]])) : v));

/**
 * #3309 — THE `activity` ARM, shared by the mailbox and bridge suites. Each suite posts `ACTIVITY_NOTES` as the panel
 * would (`activity-note`, a multi-set build's summary and Update file's run), reads `activity { since }` from the run
 * before them, and compares the answer with `activityExpected`, typed here. `at` is the main thread's clock: `atRead`
 * checks each is ISO 8601 and reads it as `AT`, so the rest is compared whole. `total` is the log's size, which the suite
 * reads before posting (the log keeps every run of the session up to its cap).
 */
export const ACTIVITY_NOTES = [
  { type: 'activity-note', op: 'components', ok: false, headline: 'Built 2 sets · 1 with problems', lines: ['Built Badge, Link on ↳ Badge.', 'Link: built with problems.'] },
  { type: 'activity-note', op: 'update', ok: false, headline: 'Stopped at To add', lines: ['0:42', 'Built 2 sets · 1 with problems. Details in Activity.', 'sets: not ok, Built 2 sets · 1 with problems'] },
] as const;
export const AT = '<iso>';
export const atRead = (data: unknown): unknown => {
  const d = data as { runs?: Array<Record<string, unknown>> } | undefined;
  if (!d || !Array.isArray(d.runs)) return data;
  return { ...d, runs: d.runs.map((r) => ({ ...r, at: typeof r.at === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(r.at) ? AT : r.at })) };
};
export const activityExpected = (since: number, total: number, build: string) => ({
  runs: [
    { seq: since + 2, op: 'update', by: 'panel', cmd: null, at: AT, verdict: { type: 'activity-note', ok: false }, headline: 'Stopped at To add',
      summary: '0:42 Built 2 sets · 1 with problems. Details in Activity. sets: not ok, Built 2 sets · 1 with problems',
      lines: ['0:42', 'Built 2 sets · 1 with problems. Details in Activity.', 'sets: not ok, Built 2 sets · 1 with problems'], problems: [], built: { commit: null, build } },
    { seq: since + 1, op: 'components', by: 'panel', cmd: null, at: AT, verdict: { type: 'activity-note', ok: false }, headline: 'Built 2 sets · 1 with problems',
      summary: 'Built Badge, Link on ↳ Badge. Link: built with problems.', lines: ['Built Badge, Link on ↳ Badge.', 'Link: built with problems.'], problems: [], built: { commit: null, build } },
  ],
  total,
  latest: since + 2,
});

/**
 * #3300 B — THE `context` ARM, shared by the mailbox and bridge suites: what the fixture file is, typed here by hand.
 * The suites' host model holds no brand, no variables and no ledger, so the facts read empty; `context/brand` in the
 * mailbox suite stores a brand and reads it back. The protected nodes are the fixture's: the FINAL page `P5` (listed, not
 * walked, so its locked frame is not listed apart), the locked instance `I1` inside `F1`, the locked frame `L1` (its
 * locked child is inside it, so not listed apart), the backup `O1` (its locked instance likewise), and `X1`, which
 * throws on read and is listed unreadable while the walk goes on. The suites run a dev build, so `run-code` is listed.
 */
export const contextExpected = (fileName: string, engineVersion: string) => ({
  file: { name: fileName, currentPage: 'Page 1', pages: 5 },
  prism3: { source: 'none', brand: null, engine: { plugin: engineVersion, lastBuilt: null }, collections: [], themed: false },
  sets: { present: 0, due: [], queued: [], partial: true },
  protected: {
    finalPages: [{ id: 'P5', name: 'Checkout FINAL' }],
    locked: [{ id: 'I1', name: 'Button', page: 'Screens' }, { id: 'L1', name: 'Note', page: 'Screens' }],
    originals: [{ id: 'O1', name: 'Original · Checkout', page: 'Screens' }],
    counts: { finalPages: 1, locked: 2, originals: 1 },
    note: 'Read-only: leave these, and anything inside them, unchanged.',
  },
  commands: {
    read: ['status', 'readback', 'inspect', 'component-keys', 'audit-frames', 'snapshot', 'activity', 'context'],
    write: ['apply-theme', 'build-components', 'file-setup', 'style-guide', 'prune', 'update-components', 'capture-baseline', 'adopt-members', 'draw-specs', 'panels-clean', 'set-override', 'run-code'],
  },
  readFirst: ['prism3://skills/prism3-rebind', 'prism3://skills/prism3-build-ui', 'prism3://commands'],
  engineMcp: { server: 'prism3-engine', for: 'validate or change the brand input', tools: ['validate_brand', 'theme_brand', 'export_theme'] },
  unreadable: [{ id: 'X1', error: 'node X1 could not be read' }],
  truncated: false,
});
