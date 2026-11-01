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
 *     and Divider stays `current`; a set with no entry reads `unrecorded`;
 *   · #3082 Q811 A: an `ENGINE_VERSION` move with identical plans leaves a set `current`, and the next write re-records
 *     it (`quietOf`); a moved plan makes it `due` for the engine, naming each part and facet that moved; an
 *     `EXECUTOR_REVISION` move makes it `due` for the executor whatever the plans say (Q811.1); an entry from before
 *     Q811 A, with no print, reads `due` for the engine with nothing named once the engine moves past it (#3090 finding
 *     1); a move in any one facet, or in the plans' own fields, makes a set due, naming it (`q811/facet …`);
 *   · #3101: a revision move makes due only the sets a revision since the entry reaches (`executor-reach.ts`), read off
 *     the real record's history; a set it does not reach reads as if the revision had not moved, by its print when the
 *     engine moved too, and is re-recorded by the next write; below the record's floor every set is due (Q820 A).
 *
 * INDEPENDENCE (docs/34): the expected states are literals read off the owner's table and the planting (which lever
 * moved, which plan field the older plans carried), never computed by `dueOf`; the plans are the engine's real
 * projection, `figmaAnatomySet` with the build's `SWAP_TARGET`. `materializeForBrand` is `materializerFor` over one def, so the two are not compared
 * with each other (one is derived from the other, and such a check cannot fail); the lever arms below hold the
 * materializer instead, by what it changes.
 *
 * Mutations that fail here by name: `materializerFor` dropping a lever (Control shape) → `due: Control shape moved: Button
 * and Checkbox are due …`; `dueOf` calling any engine move due (the pre-Q811 rule) → `q811/same-plan`; `dueOf` calling an
 * engine move current whatever the print → `q811/changed-plan`; `dueOf` reading a revision move by the print, as an
 * engine move → `q811/executor`; a print-less entry under a moved engine read `unrecorded` → `old entry`; the deciding
 * hash dropping `paints` (#3090 review M5) → `q811/facet color`; `dueOf` back to `was.rev !== is.rev` (#3101) →
 * `reach/ledger`, `reach/range`, `reach/engine`; `reaches` ignoring the record's lists → `reach/record`, `reach/ledger`; `reaches` reading a
 * missing entry as reaching nothing (`if (e === undefined) continue;`) → `reach/missing` (#3160);
 * `quietOf` without the revision → `reach/quiet`; `needsPrint` back to `was.rev === is.rev` → `reach/needs-print`.
 */
import { componentDefs } from '@prism3/engine/components/index';
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { figmaAnatomySet, type AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { LEDGER_KEY, dueOf, entryFor, needsPrint, printOf, quietOf, readLedger, recordSets } from './src/as-built-ledger';
import { materializerFor } from './src/brand-def';
import { EXECUTOR_REACH, reaches, type ReachTable } from './src/executor-reach';
import { SWAP_TARGET } from './src/build-deps';

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
const nowFor = (b: BrandInput, rev?: number, engine?: string) => { const m = materializerFor(b); return (id: string) => entryFor(m(defOf(id)), undefined, rev, engine); };
const built = { button: nowFor(pill)('button'), divider: nowFor(pill)('divider'), 'checkbox-control': nowFor(pill)('checkbox-control') };
const present = ['button', 'divider', 'checkbox-control', 'tag'];
ok(same(dueOf(built, present, nowFor(pill)), { button: { state: 'current' }, divider: { state: 'current' }, 'checkbox-control': { state: 'current' }, tag: { state: 'unrecorded' } }),
  'due: built with the brand as it is, every recorded set is current, and a set with no entry is unrecorded');
const moved = dueOf(built, present, nowFor(boxed));
ok(same(moved.button, { state: 'due', reason: 'definition' }) && same(moved['checkbox-control'], { state: 'due', reason: 'definition' }) && same(moved.divider, { state: 'current' }),
  `due: Control shape moved: Button and Checkbox are due for their definition, Divider is current (${JSON.stringify(moved)})`);
const versioned = dueOf(built, present, nowFor(pill, undefined, '0.0.0-other'));
ok(same(versioned.divider, { state: 'due', reason: 'engine' }) && same(versioned.button, { state: 'due', reason: 'engine' }),
  `old entry: an entry with no print, once the engine has moved past it, reads due for the engine with nothing named, so the next update records it (#3090 finding 1) (${JSON.stringify(versioned)})`);
ok(same(quietOf(built, versioned, (id) => nowFor(pill)(id)), {}), 'old entry: a print-less entry under a moved engine is not re-recorded quietly: nothing has checked it');
ok(same(dueOf(built, ['button'], () => null), { button: { state: 'unrecorded' } }), 'a def the engine cannot plan now reads unrecorded');

console.log('\n3. Q811 A: due only when the drawing would change');
// The plans as the executor would draw them, against the pill brand: the ones a build hands it.
const m = materializerFor(pill);
const plansOf = (id: string): AnatomyPlan[] => figmaAnatomySet(m(defOf(id)), { swapTarget: SWAP_TARGET });
const printNow = (id: string) => printOf(plansOf(id));
const OLD = '0.0.0-before';
// Recorded under an older engine, drawn from the plans as they are now.
const drawn = { button: entryFor(m(defOf('button')), plansOf('button'), undefined, OLD), divider: entryFor(m(defOf('divider')), plansOf('divider'), undefined, OLD) };
const now = nowFor(pill);
ok(same(needsPrint(drawn, ['button', 'divider', 'tag'], now), ['button', 'divider']), 'q811/needs-print: only the sets the engine moved past are printed');
const same811 = dueOf(drawn, ['button', 'divider'], now, printNow);
ok(same(same811, { button: { state: 'current' }, divider: { state: 'current' } }), `q811/same-plan: an engine version bump with an identical plan leaves the set current (${JSON.stringify(same811)})`);
const quiet = quietOf(drawn, same811, (id) => ({ ...now(id)!, print: printNow(id) }));
ok(Object.keys(quiet).join() === 'button,divider' && quiet.button.engine === ENGINE_VERSION && quiet.button.print?.plan === drawn.button.print?.plan,
  'q811/quiet: each set current by its print is re-recorded under today\'s engine, its print kept');
// Drawn by the older engine from plans whose container bound another stroke weight and whose label had another text
// style: the planting names what moved.
const older = plansOf('button').map((p) => {
  const c: AnatomyPlan = JSON.parse(JSON.stringify(p));
  const walk = (n: AnatomyPlan['root']): void => {
    if (n.name === 'label' && n.textStyle) n.textStyle = `${n.textStyle}-older`;
    if (n.name === 'container') n.bound = { ...n.bound, strokeWeight: 'older/stroke-weight' };
    n.children.forEach(walk);
  };
  walk(c.root);
  return c;
});
const was = { button: entryFor(m(defOf('button')), older, undefined, OLD) };
const changed = dueOf(was, ['button'], now, printNow);
ok(same(changed.button, { state: 'due', reason: 'engine', moved: { parts: [{ part: 'container', facets: ['size'] }, { part: 'label', facets: ['type'] }], added: [], dropped: [], set: false } }),
  `q811/changed-plan: a changed plan makes the set due for the engine, naming what moved (${JSON.stringify(changed.button)})`);
ok(same(quietOf(was, changed, (id) => ({ ...now(id)!, print: printNow(id) })), {}), 'q811/changed-plan: a due set is not re-recorded quietly');
// M5 (#3090 review): every facet, and the plans' own fields, decide. For each, the older plans differ from today's in
// one field of one part (or one plan field) and nothing else; the expected facet is typed here, from FACET_OF's owner
// table, never read from it. A hash that ignored any one family (the review dropped `paints`) reads that set current.
const PER_FACET: readonly (readonly [facet: string, part: string, field: string])[] = [
  ['size', 'container', 'bound'], ['color', 'container', 'paints'], ['type', 'label', 'textStyle'],
  ['effect', 'label', 'zeroOpacity'], ['layout', 'container', 'layoutMode'], ['content', 'label', 'propertyRef'],
];
for (const [facet, part, field] of PER_FACET) {
  let hit = 0;
  const olderOne = plansOf('button').map((p) => {
    const c: AnatomyPlan = JSON.parse(JSON.stringify(p));
    const walk = (n: AnatomyPlan['root']): void => {
      const f = n as unknown as Record<string, unknown>;
      if (n.name === part && field in f) { f[field] = { older: f[field] }; hit++; }
      n.children.forEach(walk);
    };
    walk(c.root);
    return c;
  });
  const d = dueOf({ button: entryFor(m(defOf('button')), olderOne, undefined, OLD) }, ['button'], now, printNow).button;
  ok(hit > 0 && same(d, { state: 'due', reason: 'engine', moved: { parts: [{ part, facets: [facet] }], added: [], dropped: [], set: false } }),
    `q811/facet ${facet}: a plan that moved only in ${part}'s ${field} makes the set due for the engine, naming ${facet} (${hit} nodes; ${JSON.stringify(d)})`);
}
{
  const olderSet = plansOf('button').map((p, i) => (i === 0 ? { ...p, coord: { ...p.coord, older: 'x' } } : p));
  const d = dueOf({ button: entryFor(m(defOf('button')), olderSet as AnatomyPlan[], undefined, OLD) }, ['button'], now, printNow).button;
  ok(same(d, { state: 'due', reason: 'engine', moved: { parts: [], added: [], dropped: [], set: true } }),
    `q811/facet variants: a plan that moved only in its own fields (a variant's coordinates) makes the set due, naming the variants (${JSON.stringify(d)})`);
}
// A part the older plans lacked, and one they had, read as added and dropped.
const fewer = { button: { ...drawn.button, print: { ...drawn.button.print!, plan: '0'.repeat(16), parts: { ...Object.fromEntries(Object.entries(drawn.button.print!.parts).filter(([k]) => k !== 'label')), gone: '0'.repeat(24) } } } };
const partsMoved = dueOf(fewer, ['button'], now, printNow).button as { moved?: { added: string[]; dropped: string[] } };
ok(same(partsMoved.moved?.added, ['label']) && same(partsMoved.moved?.dropped, ['gone']), `q811/parts: a part the drawing gained or lost is named (${JSON.stringify(partsMoved.moved)})`);
// Q811.1: the executor's revision moved, the plans did not. The set is due for the executor.
const revMoved = dueOf(drawn, ['button', 'divider'], nowFor(pill, 9999), printNow);
ok(same(revMoved, { button: { state: 'due', reason: 'executor' }, divider: { state: 'due', reason: 'executor' } }),
  `q811/executor: an executor revision bump with an identical plan still makes the set due (Q811.1) (${JSON.stringify(revMoved)})`);
// An entry from before Q811 A, under today's engine and def: current, and migrated by the next write.
const legacy = { divider: { ...nowFor(pill)('divider') } };
const legacyDue = dueOf(legacy, ['divider'], now, printNow);
ok(same(legacyDue.divider, { state: 'current' }) && !!quietOf(legacy, legacyDue, (id) => ({ ...now(id)!, print: printNow(id) })).divider?.print,
  'q811/migrate: an entry with no print under today\'s engine reads current, and gains its print on the next write');
recordSets(r, { button: drawn.button });
ok(same(readLedger(r).button, drawn.button), 'q811/record: an entry with its print round-trips');
r.data.set(LEDGER_KEY, JSON.stringify({ v: 1, sets: { button: { ...drawn.button, print: { plan: 1 } } } }));
ok(same(readLedger(r), {}), 'q811/record: an entry with a malformed print is left out');

console.log('\n4. #3101: a revision move makes due only the sets it reaches');
// `reaches` over a record written here: the literals are the record's, read by hand.
const fixture: ReachTable = { floor: 10, reach: { 11: ['tag'], 12: [], 13: 'all' } };
ok(!reaches('button', 10, 12, fixture) && reaches('tag', 10, 12, fixture) && reaches('tag', 11, 11, fixture) === false,
  'reach/record: from 10 to 12, Tag is reached (11 names it) and Button is not (11 and 12 do not)');
ok(reaches('button', 9, 12, fixture), 'reach/floor: a set drawn at or below the floor is reached: the revision after it has no record');
ok(reaches('button', 12, 13, fixture) && reaches('button', 12, 14, fixture), 'reach/all and missing: "all" reaches every set, and so does a revision with no entry');
// The case above crosses 13's "all" on its way to 14, so it held only "all" (#3160 N3). This one crosses a gap alone.
const gap: ReachTable = { floor: 10, reach: { 11: [] } };
ok(!reaches('button', 10, 11, gap) && reaches('button', 11, 12, gap), 'reach/missing: a revision with no entry reaches every set, with no "all" on the way (11 → 12, no entry 12)');
ok(reaches('tab-item', 24, 25) && !reaches('tab-item', 27, 43),
  'reach/renamed: entry 25 names Tab, measured before it was renamed Tab item (#2759), and still reaches a Tab item set; nothing after 27 does');
ok(reaches('button', 12, 11, fixture), 'reach/back: a revision that moved back (an older plugin on a newer file) reaches every set');
// The ledger, against the real record's history (entries below the revision cannot change: lint-executor-reach.ts).
// Revision 43 redrew the sign-in button alone (#3125); 42 the brand marks and the wallet button (#3142).
const at = (rev: number) => ({ button: nowFor(pill, rev)('button'), 'sign-in-button': nowFor(pill, rev)('sign-in-button'), 'wallet-button': nowFor(pill, rev)('wallet-button') });
const ids = ['button', 'sign-in-button', 'wallet-button'];
const from42 = dueOf(at(42), ids, nowFor(pill, 43));
ok(same(from42, { button: { state: 'current' }, 'sign-in-button': { state: 'due', reason: 'executor' }, 'wallet-button': { state: 'current' } }),
  `reach/ledger: recorded at 42, read at 43: only the sign-in button is due for the executor (${JSON.stringify(from42)})`);
const from41 = dueOf(at(41), ids, nowFor(pill, 43));
ok(same(from41, { button: { state: 'current' }, 'sign-in-button': { state: 'due', reason: 'executor' }, 'wallet-button': { state: 'due', reason: 'executor' } }),
  `reach/range: recorded at 41, read at 43: 42 reaches the wallet button and 43 the sign-in button (${JSON.stringify(from41)})`);
ok(Object.values(dueOf(at(EXECUTOR_REACH.floor - 1), ids, nowFor(pill, 43))).every((d) => same(d, { state: 'due', reason: 'executor' })),
  'reach/before the record: a set recorded below the floor is due for the executor, as before #3101 (Q820 A)');
// With prints and today's engine, so the revision is the one thing that can make an entry quiet.
const printed = Object.fromEntries(ids.map((id) => [id, entryFor(m(defOf(id)), plansOf(id), 42)]));
ok(same(Object.keys(quietOf(printed, dueOf(printed, ids, nowFor(pill, 43)), (id) => nowFor(pill, 43)(id))), ['button', 'wallet-button']),
  'reach/quiet: the sets the revision did not reach are re-recorded under it by the next write; the due one is not');
// The engine moved too: a set the revision did not reach is read by its print, as an engine move alone is (Q811 A).
const both = { button: entryFor(m(defOf('button')), plansOf('button'), 42, OLD), 'sign-in-button': entryFor(m(defOf('sign-in-button')), plansOf('sign-in-button'), 42, OLD) };
ok(same(needsPrint(both, ['button', 'sign-in-button'], nowFor(pill, 43)), ['button']), 'reach/needs-print: an engine move past a set the revision did not reach prints it; the reached one is not printed');
ok(same(dueOf(both, ['button', 'sign-in-button'], nowFor(pill, 43), printNow), { button: { state: 'current' }, 'sign-in-button': { state: 'due', reason: 'executor' } }),
  'reach/engine: engine and revision moved, the plans did not: the unreached set is current by its print, the reached one due for the executor');

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
