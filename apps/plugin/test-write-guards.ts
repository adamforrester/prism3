/**
 * TWO GUARDS ON THE PLUGIN'S WRITES (#4158, #4162).
 *
 *   npx tsx apps/plugin/test-write-guards.ts
 *
 *   #4158  Each write commits the undo step the plugin's earlier actions are in, once, as it starts and before its
 *          first write, and never during the run. Figma keeps a plugin's actions in one step until `commitUndo`, so
 *          without it one undo after a second run in an open panel could also take back the first.
 *   #4162  The as-built record holds every set however large it grows. Figma refuses a plugin-data value over about
 *          100 kB, and the callers swallow that refusal, so a record past the cap left every later update reading its
 *          sets as unrecorded. Past `PART_BUDGET` it is split across keys; under it, it stays the one key earlier
 *          plugins read.
 *
 * INDEPENDENCE (docs/34). #4158's order is read off the host: the shim logs each `commitUndo` and each variable write as
 * the plugin makes them, through `main.ts`'s real actions. #4162's host refuses a value over 100,000 bytes, as Figma
 * does, a cap typed here, not read from the ledger's own budget. The sets are the real catalog's entries, and the kept
 * changes are literals.
 *
 * Mutations that fail here by name:
 *   · `commitUndo()` dropped from `guarded` (`main.ts`) → `#4158 Apply Theme, run 1: one commitUndo, before its first write`
 *     (and run 2); called inside the run instead (after `fn`) → the same arms;
 *   · `recordSets` writing one key again (`ledgerParts` returning `[one]` always) → `#4162 a record past the cap: …`;
 *   · the clearing loop dropped → `#4162 a record that shrinks back under the budget clears the parts it left`.
 */
import { EXAMPLE_BRANDS_JSON as exampleBrands, type BrandInput } from '@prism3/engine';
import { componentDefs, figmaAnatomySet } from '@prism3/engine/components';
import { FileShim } from './file-shim';
import { entryFor, LEDGER_KEY, PART_BUDGET, partKey, readLedger, recordSets, type Ledger, type LedgerEntry } from './src/as-built-ledger';
import { materializerFor } from './src/brand-def';
import { SWAP_TARGET } from './src/build-deps';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/* ── #4162: the as-built record, past Figma's cap ──────────────────────────────────────────────────────────────── */
console.log('\n#4162 the as-built record');
/** Figma's cap on one plugin-data entry, typed here. */
const HOST_CAP = 100_000;
const bytes = (s: string): number => new TextEncoder().encode(s).length;
const hostRoot = () => {
  const data = new Map<string, string>();
  return {
    data,
    getPluginData: (k: string): string => data.get(k) ?? '',
    setPluginData: (k: string, v: string): void => {
      if (bytes(k) + bytes(v) > HOST_CAP) throw new Error(`in setPluginData: value too large (${bytes(v)} bytes)`);
      data.set(k, v);
    },
  };
};
const materialize = materializerFor(null);
const light: Record<string, LedgerEntry> = Object.fromEntries(componentDefs.filter((d) => d.figmaProperties).map((d) => {
  const m = materialize(d);
  return [d.id, entryFor(m, figmaAnatomySet(m, { swapTarget: SWAP_TARGET }))];
}));
const ids = Object.keys(light);
ok(ids.length >= 50, `#4162 premise: the catalog's sets (${ids.length})`);
// Each set with forty kept changes (#3421's `held`, unbounded strings): the record a much-edited master file carries.
// Two-, three- and four-byte characters in each, so the ledger's own byte count is held to Node's `TextEncoder` here.
const heavy: Record<string, LedgerEntry> = Object.fromEntries(ids.map((id) => [id, { ...light[id],
  held: { members: 12, changes: Array.from({ length: 40 }, (_, i) => `part-${i} label/md/emphasis fill color/interactive/primary/rest — café ✓ 😀`) } }]));
const same = (a: Ledger, b: Ledger): boolean => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map((k) => [k, b[k]]));
{
  // Today's catalog fits one key, in the format every earlier plugin reads, with room to grow (60% of the cap).
  const r = hostRoot();
  recordSets(r, light);
  const one = r.data.get(LEDGER_KEY) ?? '';
  const parsed = JSON.parse(one || '{}') as { parts?: unknown; sets?: Record<string, unknown> };
  ok(r.data.size === 1 && parsed.parts === undefined && Object.keys(parsed.sets ?? {}).length === ids.length,
    `#4162 today's record is one key with every set, as earlier plugins read it (${r.data.size} keys, ${bytes(one)} bytes)`);
  ok(bytes(one) <= 0.6 * HOST_CAP, `#4162 budget: the catalog's record is within 60% of Figma's cap (${bytes(one)} of ${0.6 * HOST_CAP} bytes)`);
}
{
  const r = hostRoot();
  ok(bytes(JSON.stringify({ v: 1, sets: heavy })) > HOST_CAP, `#4162 premise: the much-edited record is past the cap in one key (${bytes(JSON.stringify({ v: 1, sets: heavy }))} bytes)`);
  let threw = '';
  try { recordSets(r, heavy); } catch (e) { threw = (e as Error).message; }
  const keys = [...r.data.keys()];
  ok(!threw && same(readLedger(r), heavy) && keys.length > 1 && keys.every((k) => bytes(r.data.get(k)!) <= PART_BUDGET),
    `#4162 a record past the cap: written across keys, each in budget, and read back whole (${threw || `${keys.length} keys, ${keys.map((k) => bytes(r.data.get(k)!)).join('/')} bytes`})`);
  // Back under the budget (the kept changes cleared): one key again, and the parts the larger record used are emptied.
  recordSets(r, light);
  const left = [...r.data.entries()].filter(([k, v]) => k !== LEDGER_KEY && v !== '').map(([k]) => k);
  ok(same(readLedger(r), light) && !left.length && JSON.parse(r.data.get(LEDGER_KEY)!).parts === undefined,
    `#4162 a record that shrinks back under the budget clears the parts it left (${JSON.stringify(left)})`);
  // A part that cannot be read leaves only its own sets unrecorded.
  recordSets(r, heavy);
  r.data.set(partKey(1), '{not json');
  const got = readLedger(r);
  ok(Object.keys(got).length > 0 && Object.keys(got).length < ids.length, `#4162 an unreadable part: its sets read as unrecorded, the rest stay (${Object.keys(got).length} of ${ids.length})`);
}

/* ── #4158: one undo step per write ────────────────────────────────────────────────────────────────────────────── */
console.log('\n#4158 commitUndo');
const file = new FileShim();
const events: string[] = [];
const API = ['getLocalEffectStylesAsync', 'getLocalPaintStylesAsync', 'getLocalGridStylesAsync', 'getLocalTextStylesAsync', 'createEffectStyle',
  'createPaintStyle', 'createGridStyle', 'createTextStyle', 'loadFontAsync', 'listAvailableFontsAsync'] as const;
const figmaShim: Record<string, unknown> = {
  variables: file,
  showUI: () => undefined,
  ui: { postMessage: () => undefined, onmessage: null, resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  notify: () => ({ cancel: () => undefined }),
  loadAllPagesAsync: async () => undefined,
  saveVersionHistoryAsync: async () => ({ id: 'version' }),
  getNodeByIdAsync: async () => null,
  commitUndo: () => { events.push('commit'); },
  root: {
    name: 'undo file', type: 'DOCUMENT', children: [],
    getSharedPluginData: () => '', setSharedPluginData: () => undefined, getPluginData: () => '', setPluginData: () => undefined,
    findAllWithCriteria: () => [], findAll: () => [], findOne: () => null,
  },
};
for (const k of API) figmaShim[k] = (...a: unknown[]) => (file as unknown as Record<string, (...b: unknown[]) => unknown>)[k](...a);
// Every variable the shim makes logs its writes, so the order of a commit against a run's first write is read off it.
const f = file as unknown as { createVariable: (...a: unknown[]) => { setValueForMode: (m: string, v: unknown) => void } };
const make = f.createVariable.bind(file);
f.createVariable = (...a) => {
  const v = make(...a);
  const write = v.setValueForMode.bind(v);
  v.setValueForMode = (m, x) => { events.push('write'); write(m, x); };
  return v;
};
const g = globalThis as Record<string, unknown>;
g.figma = figmaShim; g.__html__ = ''; g.PRISM3_BUILD = '2026-11-19T00:00:00Z tree-test0000';
const log = console.log;
console.log = (...a: unknown[]) => { if (typeof a[0] === 'string' && a[0].startsWith('[prism3')) return; log(...a); };
const main = await import('./src/main');
const A = main.ACTIONS as unknown as Record<string, (...a: unknown[]) => Promise<void>>;
const sink = { post: () => undefined, data: () => undefined };
const brand = Object.values(exampleBrands as Record<string, BrandInput>)[0];
for (const run of [1, 2]) {
  events.length = 0;
  await A.applyTheme(brand, undefined, sink);
  const commits = events.filter((e) => e === 'commit').length, first = events.indexOf('write');
  ok(commits === 1 && events[0] === 'commit' && first > 0,
    `#4158 Apply Theme, run ${run}: one commitUndo, before its first write (${commits} commits; first write at ${first}; ${events.filter((e) => e === 'write').length} writes)`);
}
{
  // A read (Prune's preview, confirm off) writes nothing and commits nothing.
  events.length = 0;
  await A.prune(brand, false, undefined, sink);
  ok(!events.includes('commit'), `#4158 a read commits nothing (${JSON.stringify(events.slice(0, 3))})`);
}
console.log = log;

console.log(`${failed ? `\n${failed} failed` : '\n✅ ALL PASS'} — ${executed} assertions executed`);
process.exit(failed ? 1 : 0);
