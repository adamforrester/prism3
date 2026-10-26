/**
 * The as-built ledger (#2909 IA v2 phase 2, owner decision Q2909.8 A), `src/as-built-ledger.ts`, over the engine's real
 * defs and the plugin's real brand materialization.
 *
 *   npx tsx apps/plugin/test-as-built-ledger.ts
 *
 * WHAT IS HELD:
 *   · the record round-trips through a root's plugin data, merges per def, and a missing, malformed or other-format
 *     record reads as empty (every set "not checked yet"), never a throw;
 *   · a lever moves exactly the sets it reaches: Control shape reaches buttons, fields and checkboxes and not a divider
 *     (v2's lever-home table on #2909, typed here), so after the brand moves it Button reads `due` for its definition
 *     and Divider stays `current`; an `EXECUTOR_REVISION` or `ENGINE_VERSION` move flags a set for the engine; a set
 *     with no entry reads `unrecorded`.
 *
 * INDEPENDENCE (docs/34): the expected states are literals read off the owner's table and the planting (which lever
 * moved), never computed by `dueOf`. `materializeForBrand` is `materializerFor` over one def, so the two are not compared
 * with each other (one is derived from the other, and such a check cannot fail); the lever arms below hold the
 * materializer instead, by what it changes.
 *
 * Mutations that fail here by name: `dueOf` reading only the def hash → `engine: a revision bump flags every set for the
 * engine`; `materializerFor` dropping a lever (Control shape) → `due: Control shape moved: Button and Checkbox are due …`.
 */
import { componentDefs } from '@prism3/engine/components/index';
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { LEDGER_KEY, dueOf, entryFor, readLedger, recordSets } from './src/as-built-ledger';
import { materializerFor } from './src/brand-def';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const root = (): { data: Map<string, string>; getPluginData(k: string): string; setPluginData(k: string, v: string): void } => {
  const data = new Map<string, string>();
  return { data, getPluginData: (k) => data.get(k) ?? '', setPluginData: (k, v) => { data.set(k, v); } };
};

console.log('\n1. The record');
const r = root();
ok(same(readLedger(r), {}), 'an empty root reads as no entries');
recordSets(r, { button: { def: 'a', rev: 1, engine: '1.0.0' } });
recordSets(r, { divider: { def: 'b', rev: 1, engine: '1.0.0' } });
ok(same(readLedger(r), { button: { def: 'a', rev: 1, engine: '1.0.0' }, divider: { def: 'b', rev: 1, engine: '1.0.0' } }), 'entries merge per def, each write over what the root held');
recordSets(r, { button: { def: 'c', rev: 2, engine: '1.0.1' } });
ok(readLedger(r).button.def === 'c' && readLedger(r).divider.def === 'b', 'a later entry for a def replaces its earlier one and leaves the others');
r.data.set(LEDGER_KEY, '{not json');
ok(same(readLedger(r), {}), 'a malformed record reads as empty');
r.data.set(LEDGER_KEY, JSON.stringify({ v: 99, sets: { button: { def: 'a', rev: 1, engine: 'x' } } }));
ok(same(readLedger(r), {}), 'a record in another format reads as empty');
r.data.set(LEDGER_KEY, JSON.stringify({ v: 1, sets: { button: { def: 'a', rev: 'one', engine: 'x' }, tag: { def: 't', rev: 3, engine: 'e' } } }));
ok(same(readLedger(r), { tag: { def: 't', rev: 3, engine: 'e' } }), 'an entry of the wrong shape is left out, the rest kept');
ok(same(readLedger({ getPluginData: () => { throw new Error('refused'); } }), {}), 'a root that refuses the read reads as empty');

console.log('\n2. What is due');
const brand = Object.values(exampleBrands as Record<string, BrandInput>)[0];
const defOf = (id: string) => componentDefs.find((d) => d.id === id)!;
const pill: BrandInput = { ...brand, controlShape: 'pill' };
const boxed: BrandInput = { ...brand, controlShape: 'boxed' };
const nowFor = (b: BrandInput, rev?: number, engine?: string) => { const m = materializerFor(b); return (id: string) => entryFor(m(defOf(id)), rev, engine); };
const built = { button: nowFor(pill)('button'), divider: nowFor(pill)('divider'), 'checkbox-control': nowFor(pill)('checkbox-control') };
const present = ['button', 'divider', 'checkbox-control', 'tag'];
ok(same(dueOf(built, present, nowFor(pill)), { button: { state: 'current' }, divider: { state: 'current' }, 'checkbox-control': { state: 'current' }, tag: { state: 'unrecorded' } }),
  'due: built with the brand as it is, every recorded set is current, and a set with no entry is unrecorded');
const moved = dueOf(built, present, nowFor(boxed));
ok(same(moved.button, { state: 'due', reason: 'definition' }) && same(moved['checkbox-control'], { state: 'due', reason: 'definition' }) && same(moved.divider, { state: 'current' }),
  `due: Control shape moved: Button and Checkbox are due for their definition, Divider is current (${JSON.stringify(moved)})`);
const bumped = dueOf(built, present, nowFor(pill, 9999));
ok(same(bumped.button, { state: 'due', reason: 'engine' }) && same(bumped.divider, { state: 'due', reason: 'engine' }), 'engine: a revision bump flags every set for the engine');
const versioned = dueOf(built, present, nowFor(pill, undefined, '0.0.0-other'));
ok(same(versioned.divider, { state: 'due', reason: 'engine' }), 'engine: an ENGINE_VERSION move flags every set too (coarse, never wrong)');
ok(same(dueOf(built, ['button'], () => null), { button: { state: 'unrecorded' } }), 'a def the engine cannot plan now reads unrecorded');

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
