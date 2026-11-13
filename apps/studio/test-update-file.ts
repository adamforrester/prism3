/**
 * Update file's model (#2909 IA v2 phase 1), `src/state/update-file.ts`, in Node with no DOM.
 *
 *   npx tsx apps/studio/test-update-file.ts
 *
 * INDEPENDENCE (docs/34). The catalog and the file's sets are typed here as literals; every expected tick, step and run
 * state is a literal read off the owner's decisions (Q2909.2 A: the theme is always an item; #3422 Q44 A: it is ticked only
 * when the file's variables differ from the brand, and on a file that is not set up; Q668 A: the first
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
 * USAGE PANELS (#3137, Q3137.1–5 A): the sets with no usage panel, less Due and the queue, are one group with one tick, on
 * by default; the scoped check reads them while ticked, and the update step takes them beside the ticked Due sets; the
 * badge counts the group as one item and names it. Mutations that fail here by name: `panelSetsOf` keeping a Due set →
 * `Q3137.1 A panels: a Due set is left out …`; the group dropped from `badgeCount` → `Q3137.4 A badge: the group counts
 * as one item …`; `updateDefsOf` ignoring the tick → `Q3137.2 A update: the panel sets join …`.
 *
 * THE BADGE, LIVE (#3081, the owner's decision Q810 A): it counts everything Update file would change. That is the sets
 * due against the brand the panel holds, by the live recount (`file-due`) once one has answered, plus one item for Theme
 * changes the file does not hold. The recount's newest answer wins, so an answer overtaken by a newer request never
 * shows. Mutations that fail here by name: the Theme item dropped from `badgeCount` → `Q810 A badge: unapplied Theme
 * changes count as one item …`; `badgeCount` reading the load's read over the recount → `Q810 A badge: it rises when a
 * setting changes …`; the reduce keeping an older answer (`m.seq < s.liveDue.seq` dropped) → `Q810 A recount: an
 * answer overtaken by a newer request never shows`.
 */
import { UPDATE_COPY, blockedLine, keptChoicesOf, keptSetsOf, recheckFirst, recheckHolds, awaitingRead, badgeCount, badgeParts, checkScopeOf, defaultTicks, themeDueOf, themeMatchesOf, panelSetsOf, updateDefsOf, dueCount, engineWhy, dueSetsOf, newSetsOf, queuedOf, setupOfferedOf, startUpdate, statusesOf, stepDone, stepOf, stepsOf, stopUpdate, unrecordedOf, updatableOf } from './src/state/update-file';
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
// #3422 Q44 A: on a set-up file, Theme is ticked when the live recount says the file differs from the brand.
const t1 = defaultTicks(CAT, SET_UP, null, { present: ['button'], theme: true, error: null, due: SET_UP.due });
ok(t1.theme === true && t1.setup === false && t1.guides === false && !('sets' in t1),
  'ticks: on a set-up file whose variables differ from the brand the theme is ticked, and no set is ticked to add (#3129: the queue is the file\'s)');
const t2 = defaultTicks(CAT, FRESH);
ok(t2.setup && t2.theme && t2.guides && !('sets' in t2),
  'Q3129.10 A ticks: on a file that is not set up, the setup, the theme and the style guides are ticked, and no set is (Q668 A)');

ok(same(stepsOf(t1, SET_UP, []), ['theme']), 'steps: a set-up file with the defaults and an empty queue writes the theme only');
// #3467 (Q3 A, Q4 A): a set-up file whose read lists something Set up file owns offers it, unticked; it runs first when
// ticked, and the cover step stays a fresh file's. A list that is empty or absent offers nothing. Literals.
// (mutations: `setupOfferedOf` reading `setUp` alone → `#3467 offered`, `#3467 steps`; `defaultTicks` ticking it →
// `#3467 ticks`)
const INCOMPLETE = { ...SET_UP, setupIncomplete: ['_Label', '_Doc-block'] };
ok(setupOfferedOf(INCOMPLETE) && setupOfferedOf(FRESH) && !setupOfferedOf(SET_UP) && !setupOfferedOf({ ...SET_UP, setupIncomplete: [] }),
  '#3467 offered: Set up file is offered on a fresh file and on a set-up file whose read lists something, never on one whose read lists nothing');
const t3 = defaultTicks(CAT, INCOMPLETE, null, { present: ['button'], theme: true, error: null, due: SET_UP.due });
ok(t3.setup === false, '#3467 ticks: on a set-up file that lacks something setup owns, Set up file opens unticked');
ok(same(stepsOf({ ...t3, setup: true }, INCOMPLETE, []), ['setup', 'theme']) && same(stepsOf(t3, INCOMPLETE, []), ['theme']),
  '#3467 steps: ticked, Set up file runs first and no cover step follows; unticked, it is not a step');
ok(UPDATE_COPY.setupMissing(['_Label', '_Doc-block']) === 'Builds what this file lacks: _Label, _Doc-block.', '#3467 copy: the line names what the file lacks (DRAFT, held for the owner)');

// ── #3422 Q44 A: Theme ticked only when the file differs from the brand ─────────────────────────────────────────────
// Mutations that fail here by name: `defaultTicks` ticking Theme always → `Q44 A ticks: a file that matches the brand
// opens with Theme unticked` and `Q44 A badge = ticks: …matches…`; ticking it never → `Q44 A ticks: a file that differs
// from the brand opens with Theme ticked`; dropping `fresh` → `Q44 A ticks: a file that is not set up …`.
{
  const MATCH = { present: ['button'], theme: false, error: null, due: SET_UP.due };
  const DIFF = { ...MATCH, theme: true };
  const tm = defaultTicks(CAT, SET_UP, null, MATCH);
  ok(tm.theme === false, `Q44 A ticks: a file that matches the brand opens with Theme unticked (${tm.theme})`);
  ok(defaultTicks(CAT, SET_UP, null, DIFF).theme === true, 'Q44 A ticks: a file that differs from the brand opens with Theme ticked');
  ok(defaultTicks(CAT, SET_UP, null, null).theme === false && defaultTicks(CAT, SET_UP, null, { ...DIFF, error: 'x' }).theme === false,
    'Q44 A ticks: before the recount answers, or when it could not read the file, Theme opens unticked, as the badge counts no Theme');
  ok(defaultTicks(CAT, FRESH, null, null).theme === true && defaultTicks(CAT, FRESH, null, MATCH).theme === true,
    'Q44 A ticks: a file that is not set up holds no brand, so Theme opens ticked');
  ok(same(stepsOf(tm, SET_UP, []), []), 'Q44 A steps: a matching file with nothing due runs no step by default');
  ok(UPDATE_COPY.themeCurrent === 'Up to date' && UPDATE_COPY.themeCurrent === UPDATE_COPY.status.current,
    `Q44 A label: an unticked Theme reads "Up to date", the sets' own word (${UPDATE_COPY.themeCurrent})`);
  ok(themeDueOf(MATCH) === false && themeDueOf(DIFF) === true && themeDueOf(null) === false, 'Q44 A signal: Theme is due exactly when the recount says the file differs');
  // Q44.2 A: "Up to date" only on a measured match. Before the recount answers, or when it could not read the file,
  // nothing was compared, so the row has no tag. MUTATION: the tag on `!themeDueOf` again → this arm, by name.
  ok(themeMatchesOf(MATCH) === true && themeMatchesOf(DIFF) === false && themeMatchesOf(null) === false && themeMatchesOf({ ...MATCH, error: 'x' }) === false,
    `Q44.2 A tag: the Theme row reads "Up to date" only when the recount measured the file and found it matching (${JSON.stringify([themeMatchesOf(MATCH), themeMatchesOf(DIFF), themeMatchesOf(null), themeMatchesOf({ ...MATCH, error: 'x' })])})`);
  // The badge counts what the ticks will run: Theme, each ticked Due set, the Usage panels group, and the add queue.
  const DF = { present: ['button', 'tag'], setUp: true, error: null, due: { button: { state: 'due', reason: 'definition' }, tag: { state: 'current' } } } as const;
  const liveM = { present: DF.present, theme: false, error: null, due: DF.due };
  const liveD = { ...liveM, theme: true };
  const ticked = (t: ReturnType<typeof defaultTicks>, queue: readonly string[]): number => (t.theme ? 1 : 0) + t.update.size + (t.panels ? 1 : 0) + queuedOf(CAT, DF, queue).length;
  const tM = defaultTicks(CAT, DF, ['badge'], liveM);
  const tD = defaultTicks(CAT, DF, ['badge'], liveD);
  ok(badgeCount(CAT, DF, liveM, ['badge']) === 2 && ticked(tM, ['badge']) === 2,
    `Q44 A badge = ticks: a file that matches the brand counts 2 (1 due, 1 to add) and opens 2 ticked (${badgeCount(CAT, DF, liveM, ['badge'])} / ${ticked(tM, ['badge'])})`);
  ok(badgeCount(CAT, DF, liveD, ['badge']) === 3 && ticked(tD, ['badge']) === 3,
    `Q44 A badge = ticks: a file that differs counts 3 (theme, 1 due, 1 to add) and opens 3 ticked (${badgeCount(CAT, DF, liveD, ['badge'])} / ${ticked(tD, ['badge'])})`);
}
ok(same(stepsOf({ ...t1, setup: true }, SET_UP, []), ['theme']), 'steps: Set up file is never a step on a set-up file');
ok(same(stepsOf(t2, FRESH, ['tag']), ['setup', 'theme', 'sets', 'guides', 'cover']), 'steps: the first run sets up, then writes the theme, the queued sets and the style guides, in that order, and ends with the cover (#3308 Q3308.4 A)');
ok(same(stepsOf(t2, FRESH, []), ['setup', 'theme', 'guides', 'cover']), 'Q3129.10 A steps: a fresh file with nothing queued adds no set; the sets step runs while the queue holds a set');
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
// #3308: the owner's first run. The sets step built all 9 sets, 5 with problems: not ok, but it did all it was asked, so
// the run goes on to the style guides, where until #3308 it stopped ("Stopped at To add"). A step that failed still ends
// it. (mutation: `stepDone` ignoring `warn` → `run/warn goes on`)
{
  let w = startUpdate(['setup', 'theme', 'sets', 'guides'], ['button']);
  w = stepDone(stepDone(w, true, '✓ file set up'), true, '✓ applied');
  w = stepDone(w, false, '⚠ Built 9 sets · 5 with problems', true);
  ok(!w.done && stepOf(w) === 'guides' && w.results[2].warn === true && w.results[2].ok === false,
    `run/warn goes on: a sets step that built every set, some with problems, moves the run to the style guides (${JSON.stringify({ done: w.done, next: stepOf(w), last: w.results[2] })})`);
  const ok2 = stepDone(startUpdate(['theme', 'guides'], []), true, '✓ applied', true);
  ok(ok2.results[0].warn === undefined && !ok2.done, 'run/warn: a clean step is never marked warn');
}

// ── phase 2: what is due (Q2909.8 A) ──────────────────────────────────────────────────────────────────────────────
const CAT2 = [entry('button'), entry('tag'), entry('badge'), entry('select'), entry('icon')] as unknown as Catalog;
const DUE = {
  present: ['button', 'tag', 'badge', 'select'], setUp: true, error: null,
  due: { button: { state: 'due', reason: 'definition' }, tag: { state: 'current' }, badge: { state: 'unrecorded' }, select: { state: 'due', reason: 'engine', moved: { parts: [], added: [], dropped: [], set: true } } },
} as const;
ok(same(dueSetsOf(CAT2, DUE), ['button', 'select']), 'Q2909.8 A due: the sets the ledger reads as due, in catalog order');
ok(same(unrecordedOf(CAT2, DUE), ['badge']), 'Q2909.8 A unrecorded: the sets the file holds with no ledger entry');
ok(same(unrecordedOf(CAT2, { ...DUE, due: {} }), ['button', 'tag', 'badge', 'select']), 'Q2909.8 A unrecorded: a set the ledger answered nothing for is not checked yet');
// A file whose variables differ from the brand, so Theme opens ticked (#3422 Q44 A).
const td = defaultTicks(CAT2, DUE, null, { present: DUE.present, theme: true, error: null, due: DUE.due });
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
ok(same(badgeParts(CATQ, DUEQ, null, ['tag', 'badge', 'button']), { add: 2, due: 1, theme: false, panels: false }) && badgeCount(CATQ, DUEQ, null, ['tag', 'badge', 'button']) === 3,
  'Q3129.11 A badge: the queue counts, the sets the file lacks only, beside the due sets (2 to add, 1 due: 3)');
ok(same(badgeParts(CATQ, DUEQ, { present: ['button', 'tag'], theme: true, error: null, due: DUEQ.due }, ['tag', 'badge']), { add: 1, due: 1, theme: true, panels: false }),
  'Q3129.11 A badge: against the live recount, the queue counts the sets that recount found missing, and Theme counts as its own part');
ok(UPDATE_COPY.badgeName({ add: 7, due: 3, theme: false }) === 'Update file, 7 to add, 3 due' && UPDATE_COPY.badgeName({ add: 7, due: 3, theme: true }) === 'Update file, 7 to add, 3 due, theme'
  && UPDATE_COPY.badgeName({ add: 0, due: 2, theme: false }) === 'Update file, 2 due' && UPDATE_COPY.badgeName({ add: 0, due: 0, theme: true }) === 'Update file, theme',
  `Q3129.11 A badge name: split, "Update file, 7 to add, 3 due", with ", theme" when Theme counts, and no part at zero (${UPDATE_COPY.badgeName({ add: 7, due: 3, theme: true })})`);
const ru = startUpdate(['update', 'sets'], ['icon'], { defs: ['button'], previewHash: 'h', handEdits: 'keep' });
ok(stepOf(ru) === 'update' && same(ru.update, { defs: ['button'], previewHash: 'h', handEdits: 'keep' }), 'Q2909.8 A run: the update step carries its sets, the check\'s hash and the hand-edit choice');

// ── #3082 Q811 A: a due set's one-line reason, from what moved ─────────────────────────────────────────────────────
// The expected lines are typed here, DRAFT words (Q2909.10 A); the moved lists are planted.
ok(engineWhy({ parts: [{ part: 'focus-ring', facets: ['size'] }], added: [], dropped: [], set: false }) === 'Engine update: focus ring size',
  'Q811 A why: an engine update names the part and what moved in it');
ok(engineWhy({ parts: [{ part: 'label', facets: ['type', 'color'] }], added: ['leading-icon'], dropped: ['dot'], set: true }) === 'Engine update: label text and color, adds leading icon, drops dot, 1 more',
  'Q811 A why: parts added and dropped are named, three at most, then how many more');
ok(engineWhy({ parts: [], added: [], dropped: [], set: false }) === 'Engine update: its drawing changed', 'Q811 A why: a move with nothing to name still reads as an engine update');
ok(UPDATE_COPY.dueWhy({ state: 'due', reason: 'executor' }) === 'Engine update: Prism3 draws components differently' && UPDATE_COPY.dueWhy({ state: 'due', reason: 'definition' }) === 'Due · its settings changed',
  'Q811 A why: the executor and a setting each have their own line');
ok(UPDATE_COPY.dueWhy({ state: 'due', reason: 'engine' }) === 'Engine update: recorded before Prism3 noted what it drew',
  '#3090 finding 1 why: an engine update over a set recorded with no print says so, never "built before Prism3 kept a record"');

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

// ── #3137: the Usage panels group ───────────────────────────────────────────────────────────────────────────────────
{
  const CATP = [entry('button'), entry('tag'), entry('badge'), entry('divider'), entry('icon')] as unknown as Catalog;
  const FP = { present: ['button', 'tag', 'badge', 'divider', 'icon'], setUp: true, error: null,
    due: { button: { state: 'due', reason: 'definition' }, tag: { state: 'current' }, badge: { state: 'current' }, divider: { state: 'current' } },
    unpaneled: ['divider', 'button', 'badge'], panelLeads: 4 } as const;
  ok(same(panelSetsOf(CATP, FP), ['badge', 'divider']),
    `Q3137.1 A panels: a Due set is left out (its update draws the panel), and the rest are listed in catalog order (${JSON.stringify(panelSetsOf(CATP, FP))})`);
  ok(same(panelSetsOf(CATP, FP, ['badge']), ['divider']), 'Q3137.1 A panels: a queued set is left out too: its build draws the panel');
  ok(same(panelSetsOf(CATP, { ...FP, unpaneled: undefined }), []) && same(panelSetsOf(CATP, null), []), 'Q3137.1 A panels: with panels off (no list from the host), or before any read, the group is empty');
  const tp = defaultTicks(CATP, FP);
  ok(tp.panels === true && same([...tp.update], ['button']), `Q3137.1 A ticks: the group's one tick is on by default, beside the due sets (${tp.panels})`);
  ok(defaultTicks(CATP, { ...FP, unpaneled: ['button'] }).panels === false, 'Q3137.1 A ticks: with nothing to list (only a Due set lacks its panel), no tick is on');
  ok(same(checkScopeOf(['button'], tp, panelSetsOf(CATP, FP)), ['button', 'badge', 'divider']) && same(checkScopeOf(['button'], { panels: false }, ['badge']), ['button']),
    'Q3137.2 A check: the scoped check reads the panel sets with Due while ticked, and Due alone when not');
  const check = { sets: [{ def: 'button', blocked: false }, { def: 'badge', blocked: false }, { def: 'divider', blocked: true }] as never };
  ok(same(updateDefsOf(tp, check, ['badge', 'divider']), ['button', 'badge']),
    'Q3137.2 A update: the panel sets join the ticked Due sets in the update step, less one the check blocked');
  ok(same(updateDefsOf({ ...tp, panels: false }, check, ['badge', 'divider']), ['button']), 'Q3137.2 A update: unticked, the panel sets stay out of the update');
  ok(same(stepsOf({ ...tp, update: new Set(updateDefsOf({ ...tp, update: new Set() }, check, ['badge'])) }, FP, []).includes('update'), true),
    'Q3137.2 A steps: with only the panels ticked, the in-place update step runs');
  const bp = badgeParts(CATP, FP, null, null);
  ok(same(bp, { add: 0, due: 1, theme: false, panels: true }) && badgeCount(CATP, FP, null, null) === 2,
    `Q3137.4 A badge: the group counts as one item however many sets it lists (${JSON.stringify(bp)}: ${badgeCount(CATP, FP, null, null)})`);
  const live = { present: FP.present, theme: false, error: null, due: FP.due, unpaneled: [] as string[] };
  ok(badgeParts(CATP, FP, live, null).panels === false, 'Q3137.4 A badge: the live recount\'s census replaces the read\'s, so a group it finds empty does not count');
  ok(UPDATE_COPY.badgeName({ add: 2, due: 2, theme: false, panels: true }) === 'Update file, 2 to add, 2 due, usage panels'
    && UPDATE_COPY.badgeName({ add: 0, due: 0, theme: false, panels: true }) === 'Update file, usage panels',
    `Q3137.4 A badge name: ", usage panels" when the group counts (${UPDATE_COPY.badgeName({ add: 2, due: 2, theme: false, panels: true })})`);
  ok(UPDATE_COPY.panelsTick(35) === 'Draw 35 usage panels' && UPDATE_COPY.panelsTick(1) === 'Draw 1 usage panel', 'Q3137.1 A tick: "Draw {n} usage panels", singular for one');
}

// ── #3421 (owner decision Q39 A): Kept edits, and the sets a Theme run unblocks ─────────────────────────────────────────
{
  const CATK = [entry('button'), entry('tag'), entry('badge')] as unknown as Catalog;
  const FK = { present: ['button', 'tag', 'badge'], setUp: true, error: null,
    due: { button: { state: 'due', reason: 'definition' }, tag: { state: 'kept', held: { members: 12, changes: ['border → color/x'] } }, badge: { state: 'current' } } } as const;
  ok(same(keptSetsOf(CATK, FK), ['tag']) && same(dueSetsOf(CATK, FK), ['button']),
    'Q39 A kept: a set whose kept edits held changes back is listed under Kept edits, never under Due');
  ok(same(statusesOf('tag', FK, new Map(), 'done'), ['kept']), 'Q39 A status: a Kept edits set reads Kept edits, never Up to date');
  const tk = defaultTicks(CATK, FK);
  ok(same(checkScopeOf(['button'], tk, [], ['tag']), ['button']), 'Q39 A check: a Kept edits set left on Keep is not checked or run');
  const tko = { ...tk, kept: new Map([['tag', 'overwrite' as const]]) };
  ok(same(checkScopeOf(['button'], tko, [], ['tag']), ['button', 'tag']), 'Q39 A check: a Kept edits set given Overwrite joins the scoped check');
  const ck = { sets: [{ def: 'button', blocked: false }, { def: 'tag', blocked: false }] as never };
  ok(same(updateDefsOf(tko, ck, [], ['tag']), ['button', 'tag']) && same(updateDefsOf(tk, ck, [], ['tag']), ['button']),
    'Q39 A update: the update step takes a Kept edits set given Overwrite, and leaves one on Keep');
  ok(same(keptChoicesOf(tko, ['button', 'tag']), { tag: 'overwrite' }), 'Q39 A run: the set\'s own choice rides the update (`UpdateChoices.sets`)');
  const tb = { sets: [{ def: 'button', hash: 'a', blocked: true, themeBlocked: true }] as never };
  // Theme's tick set here, both ways: since #3422 (Q44 A) the default tick follows the live recount, which this arm is not about.
  ok(same(updateDefsOf({ ...tk, theme: true }, tb, []), ['button']) && same(updateDefsOf({ ...tk, theme: false }, tb, []), []),
    '#3421 order: a set blocked only by Theme\'s variables rides a run with Theme, and not one without');
  ok(recheckFirst(['button'], ['button'], tb), '#3421 order: such a set is checked again after Theme, not applied under the check\'s hash');
  ok(recheckHolds(['button'], [{ def: 'button', hash: 'a', themeBlocked: true }] as never, [{ def: 'button', hash: 'b' }] as never)
    && !recheckHolds(['button'], [{ def: 'button', hash: 'a' }] as never, [{ def: 'button', hash: 'b' }] as never),
    '#3421 order: after Theme a theme-blocked set may read otherwise; any other set must read as reviewed');
  ok(UPDATE_COPY.keptLine({ members: 12, changes: ['border → color/x'] }) === '12 members keep out 1 of the plan’s values: border → color/x',
    'Q39 A copy: a Kept edits set\'s line names its members and each change held back');
}

// #3713: A BLOCKED SET NAMES ITS OWN REASON, in plain words, with the step that clears it where one exists. The blocker
// lines here are literals copied from `apps/plugin/src/update-plan.ts` (`fileBlockers`, `setRefusal`, `dryRunSet`), not
// read from it, and the expected lines are literals (docs/34). `apps/plugin/test-update-kept-run.ts` runs a real check's
// blockers through the same copy. MUTATIONS: the blocked branch back to one fixed line → every arm below; the first
// reason dropped for the last (`reasons[reasons.length - 1]`) → `#3713 first reason`.
{
  // The set names come from the caller's name function (the shell passes `displayNameOf`, owner decision Q392): typed
  // here as a literal map, never derived from the id, so a line that names a set by its id instead fails.
  const NAMES: Record<string, string> = { icon: 'Icon', 'provider-logo': 'Provider logo', 'sign-in-button': 'Sign-in button' };
  const nameOf = (id: string): string => NAMES[id] ?? `?${id}`;
  const C = (reasons?: string[], themeBlocked = false) => ({ def: 'icon', hash: 'h', members: 4, update: 0, add: 0, drop: 0, handEdited: 0, noBaseline: 0, blocked: true, upToDate: false, ...(themeBlocked ? { themeBlocked: true as const } : {}), ...(reasons ? { reasons } : {}) });
  const B = (reasons?: string[]) => UPDATE_COPY.checked(C(reasons), false, nameOf);
  const BT = (reasons: string[]) => UPDATE_COPY.checked(C(reasons), true, nameOf);
  const cases: [string, string][] = [
    ['Not in this file: icon/close, icon/check. Build icon first, then run the update again', 'Can’t update yet — it needs Icon, which this file doesn’t have. Tick Icon on Components first.'],
    ['3 variables the plan binds are not in this file (a, b, c)', 'Can’t update yet — it needs 3 variables this file doesn’t have. Tick Theme to write them.'],
    ['1 variable the plan binds is not in this file (a)', 'Can’t update yet — it needs 1 variable this file doesn’t have. Tick Theme to write them.'],
    ['text styles not in this file: body/md, label/sm', 'Can’t update yet — it needs text styles this file doesn’t have: body/md, label/sm. Tick Theme to write them.'],
    ['text style not in this file: body/md', 'Can’t update yet — it needs a text style this file doesn’t have: body/md. Tick Theme to write them.'],
    ['effect styles not in this file: a, b, c, and 2 more', 'Can’t update yet — it needs effect styles this file doesn’t have: a, b, c, and 2 more. Tick Theme to write them.'],
    ['components the plan swaps to are not in this file: sign-in-button/default, icon/a, icon/b, and 1 more', 'Can’t update yet — it swaps to Sign-in button, Icon, and 1 more, which this file doesn’t have. Tick Sign-in button, Icon, and 1 more on Components first.'],
    ['component the plan swaps to is not in this file: provider-logo/default', 'Can’t update yet — it swaps to Provider logo, which this file doesn’t have. Tick Provider logo on Components first.'],
    ['fonts: Inter Bold will not load, so text could not be written', 'Can’t update yet — these fonts won’t load: Inter Bold. Install or turn them on in Figma, then open this again.'],
    ['an axis the plan removed would collapse members onto one coordinate, and they cannot stay in the set', 'Can’t update yet — a property it drops would merge variants into one.'],
    ['the axes change, and 12 members not built by Prism3 would be left on the old ones (a; b; c)', 'Can’t update yet — its properties change, and 12 variants not built by Prism3 would be left behind. Studio can’t do this yet.'],
    ['renaming size=small would give it the name of another member (size=sm)', 'Can’t update yet — renaming size=small would clash with size=sm. Rename or remove one of them in Figma.'],
    ['2 members share the coordinate size=medium (1:2, 1:3) — the set is refused rather than one picked', 'Can’t update yet — 2 variants share one name, size=medium. Rename or remove the extra one in Figma.'],
    ["the members disagree on the axis list ([size] vs [size,tone]), so Figma cannot read the set's properties (#1780)", 'Can’t update yet — its variants don’t all have the same properties. Fix the variant names in Figma.'],
    // D3721.1 b: a shape not known here gets one fixed line and Report a problem, never the engine's words.
    ["the set's property definitions could not be read", 'Can’t update yet — the check gave a reason Studio doesn’t recognize. Report it with Report a problem.'],
    ['the plan names a member that is not a coordinate: x (#1234)', 'Can’t update yet — the check gave a reason Studio doesn’t recognize. Report it with Report a problem.'],
  ];
  for (const [line, want] of cases) ok(B([line]) === want, `#3713 reason: "${line.slice(0, 40)}…" reads "${want}" (got "${B([line])}")`);
  ok(B(['3 variables the plan binds are not in this file (a, b, c)', 'text styles not in this file: x', 'fonts: A B will not load, so text could not be written']) === 'Can’t update yet — it needs 3 variables this file doesn’t have. Tick Theme to write them. 2 more reasons.',
    `#3713 first reason: the line names the first reason and counts the rest (got "${B(['3 variables the plan binds are not in this file (a, b, c)', 'x', 'y'])}")`);
  ok(B() === 'Can’t update yet — the check gave no reason.' && blockedLine([]) === B(), '#3713 no reason: a blocked set with no reason says so, never points elsewhere');
  ok(!cases.some(([, w]) => /agent’s update check/.test(w)) && !/agent’s update check/.test(B()), '#3713: no line points at the agent\'s update check');
  // Theme ticked: the reasons Theme's run clears no longer lead or count, so the row never asks for Theme again and
  // names what still blocks (the verdict on #3721, should-fix 2). MUTATION: `blockedLine` ignoring `theme` → this arm.
  ok(BT(['3 variables the plan binds are not in this file (a, b, c)', 'text styles not in this file: x', 'component the plan swaps to is not in this file: provider-logo/default']) === 'Can’t update yet — it swaps to Provider logo, which this file doesn’t have. Tick Provider logo on Components first.',
    `#3713 theme ticked: the row skips what Theme clears and leads with what still blocks (got "${BT(['3 variables the plan binds are not in this file (a, b, c)', 'text styles not in this file: x', 'component the plan swaps to is not in this file: provider-logo/default'])}")`);
  ok(B(['3 variables the plan binds are not in this file (a, b, c)', 'component the plan swaps to is not in this file: provider-logo/default']) === 'Can’t update yet — it needs 3 variables this file doesn’t have. Tick Theme to write them. 1 more reason.',
    '#3713 theme ticked (control): with Theme not ticked, the variables still lead and the swap target is counted');
  ok(UPDATE_COPY.checked({ def: 'tag', hash: 'h', members: 4, update: 0, add: 0, drop: 0, handEdited: 0, noBaseline: 0, blocked: true, upToDate: false, themeBlocked: true, reasons: ['1 variable the plan binds is not in this file (a)'] }, true) === 'Updated after Theme — Theme writes the variables and styles it binds first',
    '#3713 (#3421 kept): a set only Theme blocks, with Theme ticked, still reads Updated after Theme');
}

console.log(`\n${executed - failed}/${executed} passed`);
if (failed) process.exit(1);
