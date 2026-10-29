/**
 * Update file's model (#2909 IA v2 phase 1), `src/state/update-file.ts`, in Node with no DOM.
 *
 *   npx tsx apps/studio/test-update-file.ts
 *
 * INDEPENDENCE (docs/34). The catalog and the file's sets are typed here as literals; every expected tick, step and run
 * state is a literal read off the owner's decisions (Q2909.2 A: the theme is always an item and ticked; Q668 A: the first
 * checklist on a file that is not set up is the setup; Q3129.10 A: no set is ticked or queued for the checklist, a fresh
 * file's included), never computed by the module under test.
 *
 * Mutations that fail here by name: the setup step kept on a set-up file → `steps: Set up file is never a step on a
 * set-up file`; a failed step not ending the run → `run: a failed step ends the run …`.
 *
 * THE ADD QUEUE (#3129, Q833 A, Q3129.2–4 A, Q3129.10–11 A): the `sets` step builds the file's queue, shown and built in
 * Components' list order, without the sets the file holds or cannot build; a queued set the file lacks reads To add; the
 * badge counts the queue and names its parts. Mutations that fail here by name: `queuedOf` keeping a set the file holds →
 * `Q3129.2 A queue: a queued set the file holds …`; `queuedOf` in queue order → `Q833 A queue: … in Components' list
 * order …`; `stepsOf` reading the ticks for `sets` → `steps: the first run sets up, then writes the theme, the queued
 * sets …` and `Q2909.8 A steps: the in-place update runs before the queued sets are added`; `badgeParts` dropping the live queue → `Q3129.11 A badge: against the live recount …`; `statusesOf` ignoring the queue →
 * `Q3129.4 A status: a queued set the file lacks reads To add …`; `badgeName` one total → `Q3129.11 A badge name …`.
 *
 * PHASE 2 (Q2909.8 A, the as-built ledger): the due sets are ticked and update in place, before the new sets are added;
 * a set the ledger never recorded is "Not checked yet" and is never ticked unasked; hand-edited is a status of its own,
 * beside Due; Keep is the default for hand edits; the badge counts the due sets. Mutations that fail here by name: due
 * sets unticked by default → `Q2909.8 A ticks: every due set is ticked …`; the `update` step after `sets` → `Q2909.8 A
 * steps: … the in-place update runs before the new sets are added`; a hand-edited set read as Up to date → `Q2909.8 A
 * status: a hand-edited set reads Hand-edited …`.
 *
 * THE BADGE, LIVE (#3081, the owner's decision Q810 A): it counts everything Update file would change. That is the sets
 * due against the brand the panel holds, by the live recount (`file-due`) once one has answered, plus one item for Theme
 * changes the file does not hold. The recount's newest answer wins, so an answer overtaken by a newer request never
 * shows. Mutations that fail here by name: the Theme item dropped from `badgeCount` → `Q810 A badge: unapplied Theme
 * changes count as one item …`; `badgeCount` reading the load's read over the recount → `Q810 A badge: it rises when a
 * setting changes …`; the reduce keeping an older answer (`m.seq < s.liveDue.seq` dropped) → `Q810 A recount: an
 * answer overtaken by a newer request never shows`.
 */
import { awaitingRead, badgeCount, badgeParts, defaultTicks, dueCount, dueSetsOf, newSetsOf, queuedOf, startUpdate, statusesOf, stepDone, stepOf, stepsOf, stopUpdate, unrecordedOf, updatableOf, UPDATE_COPY } from './src/state/update-file';
import type { Catalog } from './src/state/component-catalog';
import { initialHostSession, reduce } from './src/state/host-session';

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
ok(t1.theme === true && t1.setup === false && t1.guides === false && !('sets' in t1),
  'ticks: on a set-up file the theme is ticked (Q2909.2 A), and no set is ticked to add (#3129: the queue is the file\'s)');
const t2 = defaultTicks(CAT, FRESH);
ok(t2.setup && t2.theme && t2.guides && !('sets' in t2),
  'Q3129.10 A ticks: on a file that is not set up, the setup, the theme and the style guides are ticked, and no set is (Q668 A)');

ok(same(stepsOf(t1, SET_UP, []), ['theme']), 'steps: a set-up file with the defaults and an empty queue writes the theme only');
ok(same(stepsOf({ ...t1, setup: true }, SET_UP, []), ['theme']), 'steps: Set up file is never a step on a set-up file');
ok(same(stepsOf(t2, FRESH, ['tag']), ['setup', 'theme', 'sets', 'guides']), 'steps: the first run sets up, then writes the theme, the queued sets and the style guides, in that order');
ok(same(stepsOf(t2, FRESH, []), ['setup', 'theme', 'guides']), 'Q3129.10 A steps: a fresh file with nothing queued adds no set; the sets step runs while the queue holds a set');
ok(same(stepsOf({ ...t2, theme: false }, FRESH, []), ['setup', 'guides']), 'steps: an unticked item is not a step');

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
ok(same([...td.update], ['button', 'select']) && td.handEdits === 'keep',
  'Q2909.8 A ticks: every due set is ticked, hand edits are kept, and a set never recorded is not ticked');
ok(same(stepsOf(td, DUE, []), ['theme', 'update']), 'Q2909.8 A steps: a file with due sets writes the theme, then updates the sets in place');
ok(same(stepsOf(td, DUE, ['icon']), ['theme', 'update', 'sets']), 'Q2909.8 A steps: the in-place update runs before the queued sets are added');
ok(same(stepsOf({ ...td, update: new Set() }, DUE, []), ['theme']), 'Q2909.8 A steps: unticked, the due sets are not a step');
const check = { sets: [
  { def: 'button', hash: 'a', members: 4, update: 2, add: 0, drop: 0, handEdited: 1, noBaseline: 0, blocked: false, upToDate: false },
  { def: 'select', hash: 'b', members: 2, update: 0, add: 0, drop: 0, handEdited: 0, noBaseline: 0, blocked: true, upToDate: false },
] };
ok(same(updatableOf(td, check), ['button']), 'Q2909.8 A update: a set the check blocks, or did not read, is left out of the update');
ok(dueCount(CAT2, DUE) === 2 && dueCount(CAT2, null) === 0 && dueCount(CAT2, { ...DUE, error: 'x' }) === 0, 'Q2909.8 A badge: it counts the due sets, and nothing before the host answers or when it could not read');
const hand = new Map([['tag', { edited: 3 }], ['button', { edited: 1 }]]);
ok(same(statusesOf('icon', DUE, hand, 'done'), ['new']), 'Q2909.8 A status: a set the file lacks reads Not in file');
ok(same(statusesOf('icon', DUE, hand, 'done', ['icon']), ['queued']) && UPDATE_COPY.status.queued === 'To add',
  'Q3129.4 A status: a queued set the file lacks reads To add, not Not in file');
ok(same(statusesOf('button', DUE, hand, 'done', ['button']), ['due', 'hand']), 'Q3129.2 A status: a queued set the file holds reads as the file holds it');
ok(same(statusesOf('button', DUE, hand, 'done'), ['due', 'hand']), 'Q2909.8 A status: a due set with hand edits reads Due and Hand-edited, both');
ok(same(statusesOf('tag', DUE, hand, 'done'), ['hand']), 'Q2909.8 A status: a hand-edited set reads Hand-edited, never Up to date (first class, not a warning)');
ok(same(statusesOf('badge', DUE, new Map(), 'running'), ['unchecked']), 'Q2909.8 A status: a set never recorded reads Not checked yet');
ok(same(statusesOf('select', DUE, new Map(), 'running'), ['due', 'checking']), 'Q2909.8 A status: while the pass has not reached a set, it reads Checking');
ok(same(statusesOf('tag', { ...DUE, due: { ...DUE.due } }, new Map(), 'done'), ['current']), 'Q2909.8 A status: a recorded set with no hand edits, once the pass is done, reads Up to date');
ok(same(statusesOf('tag', null, hand, 'done'), []), 'Q2909.8 A status: nothing before the host has answered');
// #3110: the host's answer at open is read from the ledger alone (`partial`), before any page loaded. A set it does not
// name may still be in the file, so it reads Checking, never Not in file; the checklist waits for the full read.
const PART = { ...DUE, present: ['button', 'tag'], partial: true, atOpen: true } as const;
ok(same(statusesOf('badge', PART, new Map(), 'running'), ['checking']), '#3110 status: at open, a set the ledger does not name reads Checking until the file is read, never Not in file');
ok(same(statusesOf('button', PART, new Map(), 'running'), ['due', 'checking']), '#3110 status: at open, a set the ledger names reads as the ledger says');
ok(same(statusesOf('badge', { ...PART, partial: undefined, atOpen: undefined }, new Map(), 'running'), ['new']), '#3110 status control: once the full read lands, a set it does not hold reads Not in file');
ok(dueCount(CAT2, PART) === 1, '#3110 badge: the answer at open counts the due sets the ledger names');
ok(awaitingRead(PART, undefined) && awaitingRead(PART, null), '#3110 checklist: it never opens on the answer at open; it waits for the file\'s own read');
ok(!awaitingRead(DUE, undefined) && !awaitingRead(DUE, null) && awaitingRead(DUE, DUE), '#3110 checklist control: a full read it has not seen opens it; the reading from before it asked does not');
// The host's full read after open yields between pages, so it can land after the checklist asked. It reads the stored
// brand, not the panel's (Q699 A), so the checklist keeps waiting for the answer to its own request.
const OPEN = { ...DUE, atOpen: true } as const;
ok(awaitingRead(OPEN, PART) && awaitingRead(OPEN, null), '#3110 checklist: the host\'s read after open, landing after the checklist asked, is not its answer');
ok(!awaitingRead(OPEN, undefined), '#3110 checklist control: once the checklist has its answer, a later read after open does not close it');
// ── #3129 Q833 A: the add queue ─────────────────────────────────────────────────────────────────────────────────────
// A catalog whose list order differs from its catalog order: Tag before Badge in the catalog, Badge before Tag in the
// list (rows alphabetical by label, Subcomponents last).
const CATQ = [entry('tag'), entry('badge'), entry('focus-ring', false), entry('button')] as unknown as Catalog;
const FILEQ = { present: ['button'], setUp: true, error: null, due: {} };
ok(same(queuedOf(CATQ, FILEQ, ['tag', 'badge']), ['badge', 'tag']), `Q833 A queue: shown and built in Components' list order, not the order it was queued in (${JSON.stringify(queuedOf(CATQ, FILEQ, ['tag', 'badge']))})`);
ok(same(queuedOf(CATQ, FILEQ, ['button', 'tag']), ['tag']), 'Q3129.2 A queue: a queued set the file holds leaves the queue at the next read');
ok(same(queuedOf(CATQ, FILEQ, ['focus-ring', 'retired', 'tag', 'tag']), ['tag']), 'Q3129.3 A queue: a set the engine cannot build, or no longer defines, is never shown; a set queued twice shows once');
ok(same(queuedOf(CATQ, null, ['tag']), []) && same(queuedOf(CATQ, FILEQ, null), []), 'queue: nothing before the host has read the file or the queue');
ok(same(newSetsOf(CATQ, FILEQ), ['tag', 'badge']), 'queue: Add all and the boxes offer the buildable sets the file lacks');
const DUEQ = { present: ['button'], setUp: true, error: null, due: { button: { state: 'due', reason: 'definition' } } } as const;
ok(same(badgeParts(CATQ, DUEQ, null, ['tag', 'badge', 'button']), { add: 2, due: 1, theme: false }) && badgeCount(CATQ, DUEQ, null, ['tag', 'badge', 'button']) === 3,
  'Q3129.11 A badge: the queue counts, the sets the file lacks only, beside the due sets (2 to add, 1 due: 3)');
ok(same(badgeParts(CATQ, DUEQ, { present: ['button', 'tag'], theme: true, error: null, due: DUEQ.due }, ['tag', 'badge']), { add: 1, due: 1, theme: true }),
  'Q3129.11 A badge: against the live recount, the queue counts the sets that recount found missing, and Theme counts as its own part');
ok(UPDATE_COPY.badgeName({ add: 7, due: 3, theme: false }) === 'Update file, 7 to add, 3 due' && UPDATE_COPY.badgeName({ add: 7, due: 3, theme: true }) === 'Update file, 7 to add, 3 due, theme'
  && UPDATE_COPY.badgeName({ add: 0, due: 2, theme: false }) === 'Update file, 2 due' && UPDATE_COPY.badgeName({ add: 0, due: 0, theme: true }) === 'Update file, theme',
  `Q3129.11 A badge name: split, "Update file, 7 to add, 3 due", with ", theme" when Theme counts, and no part at zero (${UPDATE_COPY.badgeName({ add: 7, due: 3, theme: true })})`);
const ru = startUpdate(['update', 'sets'], ['icon'], { defs: ['button'], previewHash: 'h', handEdits: 'keep' });
ok(stepOf(ru) === 'update' && same(ru.update, { defs: ['button'], previewHash: 'h', handEdits: 'keep' }), 'Q2909.8 A run: the update step carries its sets, the check\'s hash and the hand-edit choice');

// ── #3081 Q810 A: the badge counts everything Update file would change, live ─────────────────────────────────────────
// At load: the ledger's read against the stored brand, nothing due (DUE with every set current), no recount yet.
const CALM = { ...DUE, due: { button: { state: 'current' }, tag: { state: 'current' }, badge: { state: 'unrecorded' }, select: { state: 'current' } } } as const;
const live = (due: Record<string, unknown>, theme: boolean, error: string | null = null) => ({ present: DUE.present, theme, error, due: due as typeof DUE.due });
ok(badgeCount(CAT2, CALM, null) === 0 && badgeCount(CAT2, DUE, null) === 2,
  'Q810 A badge: before the first recount it reads the ledger at load, with no Theme item (0 on a calm file, 2 with two due)');
ok(badgeCount(CAT2, CALM, live(DUE.due, false)) === 2,
  'Q810 A badge: it rises when a setting changes: the recount against the panel\'s brand finds two sets due where the load read none');
ok(badgeCount(CAT2, CALM, live(CALM.due, true)) === 1 && badgeCount(CAT2, CALM, live(DUE.due, true)) === 3,
  'Q810 A badge: unapplied Theme changes count as one item, alone (1) and beside two due sets (3)');
ok(badgeCount(CAT2, DUE, live(CALM.due, false)) === 0,
  'Q810 A badge: it drops after a run: the recount after it finds nothing due and the file holding the panel\'s brand (0, though the load read 2)');
ok(badgeCount(CAT2, DUE, live({}, true, 'x')) === 2, 'Q810 A badge: a recount that could not read the file falls back to the load\'s read, with no Theme item');
ok(badgeCount(CAT2, CALM, { ...live({ ...DUE.due, icon: { state: 'due', reason: 'definition' } }, false), present: [...DUE.present] }) === 2,
  'Q810 A badge: only sets the file holds count (a due reading for a set not present is not counted)');
// The reduce keeps the newest answer: a slow answer to an older request never replaces a newer one.
const fd = (seq: number, theme: boolean) => ({ kind: 'file-due' as const, seq, present: DUE.present, theme, error: null, due: DUE.due });
const s2 = reduce(reduce(initialHostSession(), fd(2, true)), fd(1, false));
ok(s2.liveDue?.seq === 2 && s2.liveDue.theme === true, `Q810 A recount: an answer overtaken by a newer request never shows (held seq ${s2.liveDue?.seq})`);
ok(reduce(s2, fd(3, false)).liveDue?.theme === false, 'Q810 A recount (control): a newer answer replaces the one held');

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
