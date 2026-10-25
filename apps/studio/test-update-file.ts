/**
 * Update file's model (#2909 IA v2 phase 1), `src/state/update-file.ts`, in Node with no DOM.
 *
 *   npx tsx apps/studio/test-update-file.ts
 *
 * INDEPENDENCE (docs/34). The catalog and the file's sets are typed here as literals; every expected tick, step and run
 * state is a literal read off the owner's decisions (Q2909.2 A: the theme is always an item and ticked; Q2909.5 A: new
 * sets unticked, ticked on a file that is not set up; Q668 A: the first checklist on a file that is not set up is the
 * setup), never computed by the module under test.
 *
 * Mutations that fail here by name: new sets ticked on a set-up file → `ticks: on a set-up file …`; the setup step kept
 * on a set-up file → `steps: Set up file is never a step on a set-up file`; a failed step not ending the run →
 * `run: a failed step ends the run …`.
 */
import { defaultTicks, newSetsOf, startUpdate, stepDone, stepOf, stepsOf, stopUpdate } from './src/state/update-file';
import type { Catalog } from './src/state/component-catalog';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const entry = (id: string, buildable = true) => ({ id, name: id, category: 'x', summary: '', buildable, reason: null, members: buildable ? 2 : null, unit: 'variants' as const, nests: [], spacing: [] });
const CAT = [entry('button'), entry('tag'), entry('focus-ring', false), entry('badge')] as unknown as Catalog;
const SET_UP = { present: ['button'], setUp: true, error: null };
const FRESH = { present: [], setUp: false, error: null };

ok(same(newSetsOf(CAT, SET_UP), ['tag', 'badge']), 'new sets: buildable and not in the file, in catalog order; an unbuildable set is never offered');
const t1 = defaultTicks(CAT, SET_UP);
ok(t1.theme === true && t1.setup === false && t1.guides === false && t1.sets.size === 0,
  'ticks: on a set-up file the theme is ticked (Q2909.2 A) and every new set is unticked (Q2909.5 A)');
const t2 = defaultTicks(CAT, FRESH);
ok(t2.setup && t2.theme && t2.guides && same([...t2.sets], ['button', 'tag', 'badge']),
  'ticks: on a file that is not set up, the setup, the theme, every buildable set and the style guides are ticked (Q668 A, Q2909.5 A)');

ok(same(stepsOf(t1, SET_UP), ['theme']), 'steps: a set-up file with the defaults writes the theme only');
ok(same(stepsOf({ ...t1, setup: true }, SET_UP), ['theme']), 'steps: Set up file is never a step on a set-up file');
ok(same(stepsOf(t2, FRESH), ['setup', 'theme', 'sets', 'guides']), 'steps: the first run sets up, then writes the theme, the sets and the style guides, in that order');
ok(same(stepsOf({ ...t2, theme: false, sets: new Set() }, FRESH), ['setup', 'guides']), 'steps: an unticked item is not a step');

let r = startUpdate(['setup', 'theme', 'sets'], ['tag']);
ok(stepOf(r) === 'setup' && !r.done, 'run: starts on its first step');
r = stepDone(r, true, '✓ file set up');
ok(stepOf(r) === 'theme', 'run: a step that lands well moves to the next');
const failedRun = stepDone(r, false, '✗ write failed');
ok(failedRun.done && stepOf(failedRun) === null && same(failedRun.results.map((x) => x.ok), [true, false]),
  'run: a failed step ends the run, and the steps after it never start');
const stopped = stepDone(stopUpdate(r), true, '✓ applied');
ok(stopped.done && stopped.results.length === 2, 'run: Stop ends the run after the step running');
ok(startUpdate([], []).done, 'run: a run with no steps is done at once');

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
