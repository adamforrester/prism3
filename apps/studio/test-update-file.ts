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
 *
 * PHASE 2 (Q2909.8 A, the as-built ledger): the due sets are ticked and update in place, before the new sets are added;
 * a set the ledger never recorded is "Not checked yet" and is never ticked unasked; hand-edited is a status of its own,
 * beside Due; Keep is the default for hand edits; the badge counts the due sets. Mutations that fail here by name: due
 * sets unticked by default → `Q2909.8 A ticks: every due set is ticked …`; the `update` step after `sets` → `Q2909.8 A
 * steps: … the in-place update runs before the new sets are added`; a hand-edited set read as Up to date → `Q2909.8 A
 * status: a hand-edited set reads Hand-edited …`.
 */
import { defaultTicks, dueCount, dueSetsOf, newSetsOf, startUpdate, statusesOf, stepDone, stepOf, stepsOf, stopUpdate, unrecordedOf, updatableOf } from './src/state/update-file';
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
const SET_UP = { present: ['button'], setUp: true, error: null, due: { button: { state: 'current' } } } as const;
const FRESH = { present: [], setUp: false, error: null, due: {} };

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

// ── phase 2: what is due (Q2909.8 A) ──────────────────────────────────────────────────────────────────────────────
const CAT2 = [entry('button'), entry('tag'), entry('badge'), entry('select'), entry('icon')] as unknown as Catalog;
const DUE = {
  present: ['button', 'tag', 'badge', 'select'], setUp: true, error: null,
  due: { button: { state: 'due', reason: 'definition' }, tag: { state: 'current' }, badge: { state: 'unrecorded' }, select: { state: 'due', reason: 'engine' } },
} as const;
ok(same(dueSetsOf(CAT2, DUE), ['button', 'select']), 'Q2909.8 A due: the sets the ledger reads as due, in catalog order');
ok(same(unrecordedOf(CAT2, DUE), ['badge']), 'Q2909.8 A unrecorded: the sets the file holds with no ledger entry');
ok(same(unrecordedOf(CAT2, { ...DUE, due: {} }), ['button', 'tag', 'badge', 'select']), 'Q2909.8 A unrecorded: a set the ledger answered nothing for is not checked yet');
const td = defaultTicks(CAT2, DUE);
ok(same([...td.update], ['button', 'select']) && td.handEdits === 'keep' && td.sets.size === 0,
  'Q2909.8 A ticks: every due set is ticked, hand edits are kept, a set never recorded is not ticked, and no new set is');
ok(same(stepsOf(td, DUE), ['theme', 'update']), 'Q2909.8 A steps: a file with due sets writes the theme, then updates the sets in place');
ok(same(stepsOf({ ...td, sets: new Set(['icon']) }, DUE), ['theme', 'update', 'sets']), 'Q2909.8 A steps: the in-place update runs before the new sets are added');
ok(same(stepsOf({ ...td, update: new Set() }, DUE), ['theme']), 'Q2909.8 A steps: unticked, the due sets are not a step');
const check = { sets: [
  { def: 'button', hash: 'a', members: 4, update: 2, add: 0, drop: 0, handEdited: 1, noBaseline: 0, blocked: false, upToDate: false },
  { def: 'select', hash: 'b', members: 2, update: 0, add: 0, drop: 0, handEdited: 0, noBaseline: 0, blocked: true, upToDate: false },
] };
ok(same(updatableOf(td, check), ['button']), 'Q2909.8 A update: a set the check blocks, or did not read, is left out of the update');
ok(dueCount(CAT2, DUE) === 2 && dueCount(CAT2, null) === 0 && dueCount(CAT2, { ...DUE, error: 'x' }) === 0, 'Q2909.8 A badge: it counts the due sets, and nothing before the host answers or when it could not read');
const hand = new Map([['tag', { edited: 3 }], ['button', { edited: 1 }]]);
ok(same(statusesOf('icon', DUE, hand, 'done'), ['new']), 'Q2909.8 A status: a set the file lacks reads Not in file');
ok(same(statusesOf('button', DUE, hand, 'done'), ['due', 'hand']), 'Q2909.8 A status: a due set with hand edits reads Due and Hand-edited, both');
ok(same(statusesOf('tag', DUE, hand, 'done'), ['hand']), 'Q2909.8 A status: a hand-edited set reads Hand-edited, never Up to date (first class, not a warning)');
ok(same(statusesOf('badge', DUE, new Map(), 'running'), ['unchecked']), 'Q2909.8 A status: a set never recorded reads Not checked yet');
ok(same(statusesOf('select', DUE, new Map(), 'running'), ['due', 'checking']), 'Q2909.8 A status: while the pass has not reached a set, it reads Checking');
ok(same(statusesOf('tag', { ...DUE, due: { ...DUE.due } }, new Map(), 'done'), ['current']), 'Q2909.8 A status: a recorded set with no hand edits, once the pass is done, reads Up to date');
ok(same(statusesOf('tag', null, hand, 'done'), []), 'Q2909.8 A status: nothing before the host has answered');
const ru = startUpdate(['update', 'sets'], ['icon'], { defs: ['button'], previewHash: 'h', handEdits: 'keep' });
ok(stepOf(ru) === 'update' && same(ru.update, { defs: ['button'], previewHash: 'h', handEdits: 'keep' }), 'Q2909.8 A run: the update step carries its sets, the check\'s hash and the hand-edit choice');

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
