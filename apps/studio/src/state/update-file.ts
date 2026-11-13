/**
 * Update file's model (#2909 IA v2 phase 1): the checklist, and the run that works through it. Pure, no DOM, so
 * `test-update-file.ts` drives it in Node.
 *
 * THE CHECKLIST (owner decisions Q2909.2 A, Q2909.5 A, Q668 A). Update file is the plugin's one global write. It always
 * opens the checklist, even when only the theme is to be written (Q2909.2 A). Its items, in the order they run:
 *   · Set up file, on a file that is not set up: the first checklist on such a file is the setup (Q668 A). Since #3467
 *     (Q3 A) also on a set-up file while the host's read lists something setup owns that the file lacks
 *     (`setupIncomplete`): there it opens unticked, and names what is missing;
 *   · Theme: the brand's variables and styles (today's Apply Theme), ticked only when the file's variables differ from
 *     the brand, the signal the badge counts (`themeDueOf`, #3422 Q44 A); else unticked and "Up to date", and still
 *     tickable to apply it again. A file that is not set up holds no brand, so its Theme is always ticked;
 *   · To add (#3129, Q832 A, Q3129.7–10 A): the file's add queue, the sets chosen on Components, in Components' order
 *     and with its names (`queuedOf`). A queued set runs: its row has no tick, only Remove, and Remove all from two
 *     rows up. A file that is not set up starts with nothing queued and offers Add all, which writes every set it lacks
 *     into the queue. Building stays add-only underneath: a set the file holds is only ever updated in place;
 *   · Due: each set the as-built ledger reads as due, ticked, updated in place (phase 2, Q2909.8 A), with the one choice
 *     for hand edits (Keep, the default; Overwrite; Accept as the new baseline);
 *   · Usage panels (#3137, Q3137.1 A, Q3137.2 A): while Documentation has panels on, each family whose lead set is in the
 *     file and has no live panel (`panelSetsOf`), less the Due sets and the queue, whose own runs draw the panel. One tick
 *     for the group, on by default. The panels ride the in-place update, scoped to these sets: the step's defs are the
 *     ticked Due sets and these (`updateDefsOf`), so the scoped check reads them and the page re-spaces to make room;
 *   · Style guides: drawn with Documentation's saved settings (Q2909.23 A), ticked on a file that is not set up.
 * The cover is not an item of its own: it follows Documentation's switch, drawn by Set up file. Nor is a panel a set gains
 * by being added or updated: its build or update draws it.
 * A run that sets the file up and writes its theme ends with one more step, `cover` (#3308, Q3308.4 A): Set up file,
 * run first, has no brand to draw the cover with, so the run draws the cover and About this library last, through the
 * in-place update over no sets, whose finish draws both (`finishAbout` in the plugin).
 *
 * WHAT IS DUE (Q2909.8 A): the as-built ledger says, from one root read (`file-sets`' `due`). A set the ledger holds no
 * entry for (built before it, or by hand) reads "Not checked yet", and the checklist offers to check it. As the checklist
 * opens it runs the full check over the due sets only (`update-check`), so its counts and the hash the update echoes are
 * exact; an update waits on that answer. Hand edits are a status of their own, never a warning: the background pass after
 * load fills them in (`hand-edits`), and the update keeps them unless the person chooses otherwise.
 *
 * THE RUN works through the ticked items one at a time, in order, and stops after a step that fails (its verdict is not
 * `ok`), or after the step running when Stop is asked for. `main.ts` starts each step and reports its verdict here.
 */
import type { Catalog } from './component-catalog';
import { displayNameOf, inListOrder, isPrivate, neededOf } from './component-groups';
import type { CheckedSetView, FacetView, MovedView, SetDueView } from '../write-adapter';

/** `update` is the in-place update of the due sets (Q2909.8 A); `sets` builds the add queue (#3129); `cover` draws the
 *  cover and About this library at the end of a run that sets the file up and writes its theme (#3308, Q3308.4 A). */
export type StepKey = 'setup' | 'theme' | 'update' | 'sets' | 'guides' | 'cover';
/** Run order. */
export const STEP_ORDER: readonly StepKey[] = ['setup', 'theme', 'update', 'sets', 'guides', 'cover'];

/** What the checklist reads when it opens: the file's sets, whether it is set up, and what the ledger says is due
 *  (`file-sets`). */
export type FileSets = { readonly present: readonly string[]; readonly setUp: boolean; readonly error: string | null; readonly due: Readonly<Record<string, SetDueView>>;
  /** #3110: the host's answer at open, from the as-built ledger alone, before any page loaded: the sets the ledger names,
   *  not every set the file holds. A set it does not name reads Checking until the full read lands, and the checklist
   *  waits for that read. */
  readonly partial?: boolean;
  /** #3110: one of the host's own reads after open (the ledger's, then the file's against the stored brand), not an
   *  answer to the panel's request. */
  readonly atOpen?: boolean;
  /** #3308 (Q3308.3 A): the file has no `_Doc-block`, and these are the sets it is built from that the file lacks. */
  readonly docBlockLacks?: readonly string[];
  /** #3467 (Q3 A, Q4 A): what Set up file would build on this file now, by name (the host's `setup-incomplete.ts`). Beside
   *  `setUp`, which is unchanged; while it lists anything, the checklist offers Set up file (`setupOfferedOf`). */
  readonly setupIncomplete?: readonly string[];
  /** #3137 Q3137.3 A: while Documentation has panels on, the present sets that lead a family and have no live usage
   *  panel, and how many present sets lead one (`panelLeads`). Absent while panels are off, and on the ledger's read. */
  readonly unpaneled?: readonly string[];
  readonly panelLeads?: number };

export type HandEditChoice = 'keep' | 'overwrite' | 'accept';
/** The checklist's ticks: each item, each due set, and what the update does with hand edits. The add queue has no tick
 *  (Q3129.7 A): a queued set runs. */
export type Ticks = {
  readonly setup: boolean; readonly theme: boolean; readonly guides: boolean;
  /** #3137 Q3137.1 A: the Usage panels group's one tick. */
  readonly panels: boolean;
  readonly update: ReadonlySet<string>; readonly handEdits: HandEditChoice;
  /** #3421 (Q39 A): each Kept edits set's own choice, by def; a set not named keeps its edits (`keep`) and is not run. */
  readonly kept: ReadonlyMap<string, HandEditChoice>;
};

/** The sets the file could add: buildable, and not in the file, in catalog order. Components' boxes and Add all act on
 *  them (#3129). */
export const newSetsOf = (catalog: Catalog, f: Pick<FileSets, 'present'>): string[] => catalog.filter((e) => e.buildable && !f.present.includes(e.id)).map((e) => e.id);
/** The add queue as Update file shows it and the `sets` step builds it (#3129 Q833 A, Q3129.2 A, Q3129.3 A): the queued
 *  sets the file lacks and the engine can build, in Components' list order. */
export const queuedOf = (catalog: Catalog, f: Pick<FileSets, 'present'> | null, queue: readonly string[] | null): string[] =>
  f && queue ? inListOrder(catalog, queue.filter((id, i) => queue.indexOf(id) === i && !f.present.includes(id) && catalog.some((e) => e.id === id && e.buildable))) : [];
/** #3308 (Q3308.3 A): USAGE PANELS ON A FIRST RUN. While Documentation has the panels on and the file has no
 *  `_Doc-block`, the run's sets step builds the sets the template is made from first, then the template, so every queued
 *  set gets its panel. These are the ones the queue does not hold, which To add's "Also adds" line names
 *  (`alsoAddsOf`), here in catalog order. Empty with the panels off, with nothing queued, or once the file holds the template (#3311). */
export const docBlockAlsoOf = (catalog: Catalog, f: Pick<FileSets, 'docBlockLacks'> | null, queued: readonly string[], panels: boolean): string[] =>
  panels && queued.length && f?.docBlockLacks ? catalog.filter((e) => f.docBlockLacks!.includes(e.id) && !queued.includes(e.id)).map((e) => e.id) : [];
/** #3306 Q3306.5 A, with the owner's call on the merge with #3308: To add's ONE "Also adds" line. It names everything
 *  the run builds alongside the queued sets that the file lacks: the sets they nest (`neededOf`, derived on read, never
 *  stored) and, on a first run with the usage panels on, the sets `_Doc-block` is made from (`docBlockAlsoOf`). Each set
 *  once, as Components names it, in its list order. A private `_` part is still built but never named here (owner, B).
 *  The badge does not count these, and the `sets` step does not list them. */
export const alsoAddsOf = (catalog: Catalog, f: Pick<FileSets, 'present' | 'docBlockLacks'> | null, queue: readonly string[] | null, panels: boolean): string[] => {
  if (!f || !queue) return [];
  const queued = queuedOf(catalog, f, queue);
  const ids = new Set([...neededOf(catalog, queued, f.present).keys(), ...docBlockAlsoOf(catalog, f, queued, panels)]);
  return inListOrder(catalog, [...ids].filter((id) => !isPrivate(id))).map((id) => displayNameOf(catalog, id));
};
/** The queue in the order the sets step builds it (#3308): the queued sets `_Doc-block` is made from first, so the
 *  template exists before any other set's panel is drawn; else the queue's own order. */
export const runOrderOf = (f: Pick<FileSets, 'docBlockLacks'> | null, queued: readonly string[], panels: boolean): string[] => {
  const lacks = panels ? f?.docBlockLacks : undefined;
  if (!lacks) return [...queued];
  const first = queued.filter((id) => lacks.includes(id));
  return [...first, ...queued.filter((id) => !first.includes(id))];
};
/** The sets the ledger reads as due (Q2909.8 A), in catalog order. */
export const dueSetsOf = (catalog: Catalog, f: FileSets): string[] => catalog.filter((e) => f.present.includes(e.id) && f.due[e.id]?.state === 'due').map((e) => e.id);
/** #3421 (Q39 A): the sets whose last update kept hand edits over changes the plan makes, in catalog order. Listed under
 *  Kept edits until an update overwrites those edits or accepts them as the baseline. */
export const keptSetsOf = (catalog: Catalog, f: Pick<FileSets, 'present' | 'due'>): string[] => catalog.filter((e) => f.present.includes(e.id) && f.due[e.id]?.state === 'kept').map((e) => e.id);
/** #3421: the Kept edits sets a choice other than Keep sends to the update step, in catalog order of `kept`. */
export const keptRunOf = (t: Pick<Ticks, 'kept'>, kept: readonly string[]): string[] => kept.filter((id) => (t.kept.get(id) ?? 'keep') !== 'keep');
/** #3421: the per-set choices the update step carries (`UpdateChoices.sets`): one for each Kept edits set it runs. */
export const keptChoicesOf = (t: Pick<Ticks, 'kept'>, defs: readonly string[]): Record<string, HandEditChoice> =>
  Object.fromEntries([...t.kept].filter(([id, c]) => c !== 'keep' && defs.includes(id)));
/** The sets the file holds that the ledger has no entry for, in catalog order: only the full check can tell. */
export const unrecordedOf = (catalog: Catalog, f: FileSets): string[] => catalog.filter((e) => f.present.includes(e.id) && (f.due[e.id]?.state ?? 'unrecorded') === 'unrecorded').map((e) => e.id);
/** Whether Update file's checklist is still waiting on the file (#3110): no answer since it asked (`asked`, the reading
 *  from before it did), or only the host's own reads after open. Those are the ledger's, which can miss a set the file
 *  holds, and the file's against the stored brand, which can land after the checklist asked (Q699 A: it measures
 *  against the panel's). The checklist shows "Checking the file…" meanwhile. */
export const awaitingRead = (f: FileSets | null, asked: FileSets | null | undefined): boolean =>
  !!f?.partial || (asked !== undefined && (f === asked || !!f?.atOpen));
/** #3137 Q3137.1 A: the sets the Usage panels group lists, in catalog order: the file's sets with no usage panel, less
 *  the Due sets (`furnishUpdate` draws a Due set's panel) and the queue (its build draws the panel). Empty while
 *  Documentation has panels off, which the host says by sending no list. */
export const panelSetsOf = (catalog: Catalog, f: (Pick<FileSets, 'present' | 'unpaneled'> & Partial<Pick<FileSets, 'due'>>) | null, queue: readonly string[] | null = null): string[] => {
  if (!f?.unpaneled?.length) return [];
  const due = new Set(Object.entries(f.due ?? {}).filter(([, d]) => d.state === 'due').map(([id]) => id));
  return catalog.filter((e) => f.unpaneled!.includes(e.id) && f.present.includes(e.id) && !due.has(e.id) && !queue?.includes(e.id)).map((e) => e.id);
};
/** How many due sets a ledger read finds (Q2909.8 A). */
export const dueCount = (catalog: Catalog, f: FileSets | null): number => (f && !f.error ? dueSetsOf(catalog, f).length : 0);

/** The badge's live recount (#3081 Q810 A, `file-due`): what is due against the brand the panel holds, and `theme`:
 *  the file does not hold that brand, so Apply Theme would change it. */
export type LiveDue = { readonly present: readonly string[]; readonly theme: boolean; readonly error: string | null; readonly due: FileSets['due'];
  /** #3137: as `FileSets`' own, from the last full read's census. */
  readonly unpaneled?: readonly string[]; readonly panelLeads?: number };
/** What the badge on Update file counts (#3081 Q810 A, #3129): everything Update file would change. That is the add
 *  queue (the queued sets the file lacks), each due set, and one item for unapplied Theme changes. It reads the live
 *  recount once one has answered, so a changed setting moves it before the checklist opens. Before that, or when the
 *  recount could not read the file, it reads the ledger read at load, with no Theme item, because only the recount
 *  compares the file's brand with the panel's. */
/** #3137 Q3137.4 A: the Usage panels group counts as one item (`panels`), however many sets it lists. */
export type BadgeParts = { readonly add: number; readonly due: number; readonly theme: boolean; readonly panels: boolean };
/** #3422 Q44 A: whether the file's variables differ from the brand the panel holds, as the live recount last said. False
 *  before its first answer and when it could not read the file. The badge counts Theme on it, and Theme opens ticked on it,
 *  so the two agree. */
export const themeDueOf = (live: LiveDue | null): boolean => !!live && !live.error && live.theme;
/** #3422 Q44.2 A (the review's recommendation; the owner's to confirm): whether the live recount measured the file and
 *  found it matching the brand. Only then does the Theme row read "Up to date". Before the first answer, when it could
 *  not read the file, or on the demo brand (no recount is shown), nothing was compared, so the row has no tag. */
export const themeMatchesOf = (live: LiveDue | null): boolean => !!live && !live.error && !live.theme;
export const badgeParts = (catalog: Catalog, f: FileSets | null, live: LiveDue | null, queue: readonly string[] | null): BadgeParts => {
  if (live && !live.error) return { add: queuedOf(catalog, live, queue).length, due: dueCount(catalog, { present: live.present, setUp: true, error: null, due: live.due }), theme: themeDueOf(live), panels: panelSetsOf(catalog, live, queue).length > 0 };
  return { add: f && !f.error ? queuedOf(catalog, f, queue).length : 0, due: dueCount(catalog, f), theme: false, panels: !!f && !f.error && panelSetsOf(catalog, f, queue).length > 0 };
};
export const badgeCount = (catalog: Catalog, f: FileSets | null, live: LiveDue | null, queue: readonly string[] | null = null): number => {
  const p = badgeParts(catalog, f, live, queue);
  return p.add + p.due + (p.theme ? 1 : 0) + (p.panels ? 1 : 0);
};
/** How long the panel waits after the last change before it asks for the recount (#3081): one ask for a burst of
 *  edits, such as a slider drag or typing, never one a keystroke. */
export const DUE_DEBOUNCE_MS = 250;

/** The ticks the checklist opens with (Q2909.2 A, Q2909.8 A, Q3129.10 A): every due set, keeping hand edits; the theme
 *  only when the file's variables differ from the brand (#3422 Q44 A, `themeDueOf`, which supersedes Q2909.2 A's
 *  always-ticked theme); on a file that is not set up, the setup, the theme and the style guides. No set is queued for it:
 *  the queue is the file's (#3129), so a fresh file starts with nothing to add until Add all or Components. */
export const defaultTicks = (catalog: Catalog, f: FileSets, queue: readonly string[] | null = null, live: LiveDue | null = null): Ticks => {
  const fresh = !f.setUp;
  return { setup: fresh, theme: fresh || themeDueOf(live), guides: fresh, panels: panelSetsOf(catalog, f, queue).length > 0, update: new Set(dueSetsOf(catalog, f)), handEdits: 'keep', kept: new Map() };
};

/** #3467 (Q3 A): whether the checklist offers Set up file: on a file that is not set up (Q668 A), ticked by default, and
 *  on a set-up file while the host's read lists something setup owns that the file lacks (`setupIncomplete`), unticked. */
export const setupOfferedOf = (f: Pick<FileSets, 'setUp' | 'setupIncomplete'>): boolean => !f.setUp || !!f.setupIncomplete?.length;

/** The steps a set of ticks runs, in order. Set up file is a step only while it is offered (`setupOfferedOf`); `sets`
 *  only while the add queue holds a set (`queuedOf`); `cover` only after Set up file and Theme both run on a file that is
 *  not set up (#3308, Q3308.4 A). */
export const stepsOf = (t: Ticks, f: FileSets, queued: readonly string[]): StepKey[] =>
  STEP_ORDER.filter((k) => (k === 'setup' ? setupOfferedOf(f) && t.setup : k === 'sets' ? queued.length > 0 : k === 'update' ? t.update.size > 0
    : k === 'cover' ? !f.setUp && t.setup && t.theme : t[k]));

/** The brand Update file's due read, its check and its update measure against (Q699 A, #3023 Q701 B): the panel's when
 *  the run's steps include Theme, which stores it before the update; else nothing, and the host reads the file's stored
 *  brand, the one the run leaves in the file. So the counts shown are the ones written, and the next load agrees. */
export const brandFor = <B>(theme: boolean, panel: B): B | undefined => (theme ? panel : undefined);

/** Whether the scoped check's reading of a set lets the run update it: not blocked; or (#3421) blocked only by variables
 *  or styles the brand's Theme writes, in a run whose Theme step goes first. */
const runnable = (c: CheckedSetView, theme: boolean): boolean => !c.blocked || (theme && !!c.themeBlocked);
/** #3713 (2 of 4): the Due sets the check's answer reads as blocked for this run, in the order given: listed apart under
 *  Can't update yet, with no tick, since the run would leave them anyway. A set only Theme blocks is not among them while
 *  Theme is ticked (#3421). Empty before the answer: until then every Due set is listed, ticked. */
export const blockedDueOf = (ids: readonly string[], check: { readonly sets: readonly CheckedSetView[] } | null, theme: boolean): string[] =>
  check ? ids.filter((id) => { const c = check.sets.find((x) => x.def === id); return !!c && !runnable(c, theme); }) : [];
/** What the scoped check says of the ticked sets the update would act on: the ones it read and did not block, and
 *  (#3421) with Theme ticked, the ones only Theme's variables and styles block. The run checks those again after Theme. */
export const updatableOf = (t: Ticks, check: { readonly sets: readonly CheckedSetView[] }): string[] =>
  [...t.update].filter((id) => check.sets.some((c) => c.def === id && runnable(c, t.theme)));
/** #3421: whether the update step must check its sets again before it applies: it covers other sets than the check read,
 *  or a set the check read as blocked only until Theme writes what it needs. */
export const recheckFirst = (defs: readonly string[], checkedFor: readonly string[] | null, check: { readonly sets: readonly CheckedSetView[] }): boolean =>
  checkedFor === null || defs.length !== checkedFor.length || !defs.every((id) => checkedFor.includes(id))
    || defs.some((id) => check.sets.some((c) => c.def === id && c.blocked));
/** #3421: the run's check again, before its update applies: each set must read as the person reviewed it, apart from a
 *  set reviewed as blocked only by Theme's variables and styles, which Theme has written since, so it reads otherwise
 *  now. That set's check is the one the apply echoes. */
export const recheckHolds = (defs: readonly string[], reviewed: readonly CheckedSetView[], now: readonly CheckedSetView[]): boolean =>
  defs.every((id) => {
    const was = reviewed.find((c) => c.def === id);
    const is = now.find((c) => c.def === id);
    return !!was && !!is && (was.hash === is.hash || !!was.themeBlocked);
  });
/** #3137 Q3137.2 A: the update step's defs: the ticked Due sets and, while the Usage panels tick is on, the panel sets,
 *  each one the scoped check read and did not block. */
export const updateDefsOf = (t: Ticks, check: { readonly sets: readonly CheckedSetView[] }, panelSets: readonly string[], kept: readonly string[] = []): string[] =>
  [...new Set([...updatableOf(t, check), ...(t.panels ? panelSets.filter((id) => check.sets.some((c) => c.def === id && !c.blocked)) : []),
    // #3421 (Q39 A): a Kept edits set given Overwrite or Accept as baseline, as the check read it.
    ...keptRunOf(t, kept).filter((id) => check.sets.some((c) => c.def === id && runnable(c, t.theme)))])];
/** #3137 Q3137.5 A: up to this many names show inline in the Usage panels group; past it, under a closed disclosure. */
export const PANELS_INLINE = 6;
/** #3137: the sets the scoped check reads as the checklist opens: the Due sets and, while ticked, the panel sets. */
export const checkScopeOf = (due: readonly string[], t: Pick<Ticks, 'panels'> & Partial<Pick<Ticks, 'kept'>>, panelSets: readonly string[], kept: readonly string[] = []): string[] =>
  [...new Set([...due, ...(t.panels ? panelSets : []), ...(t.kept ? keptRunOf({ kept: t.kept }, kept) : [])])];

/** A set's statuses, as Components' list and the checklist show them (Q2909.8 A): Not in file, or To add once it is in
 *  the add queue (#3129 Q3129.4 A), or Needed while a queued set nests it (#3306 Q3306.2 A; Components reads that from
 *  `neededOf`, this function never returns it); or Due; Hand-edited (first class, beside Due when both); Not checked yet; Checking
 *  while the background pass has not reached it, or, for a set the ledger does not name, while the file is still being
 *  read (#3110); else Up to date. Empty before the host has said anything. */
export type SetStatus = 'queued' | 'needed' | 'new' | 'due' | 'kept' | 'hand' | 'unchecked' | 'checking' | 'current';
export const statusesOf = (id: string, f: FileSets | null, hand: ReadonlyMap<string, { readonly edited: number }>, pass: 'idle' | 'running' | 'done', queue: readonly string[] | null = null): SetStatus[] => {
  if (!f || f.error) return [];
  if (!f.present.includes(id)) return f.partial ? ['checking'] : queue?.includes(id) ? ['queued'] : ['new'];
  const due = f.due[id]?.state ?? 'unrecorded';
  const h = hand.get(id);
  const out: SetStatus[] = [];
  if (due === 'due') out.push('due');
  // #3421 (Q39 A): kept edits over changes the plan makes, listed until resolved.
  if (due === 'kept') out.push('kept');
  if (h && h.edited > 0) out.push('hand');
  if (due === 'unrecorded') out.push('unchecked');
  if (!h && pass === 'running' && due !== 'unrecorded') out.push('checking');
  return out.length ? out : ['current'];
};

export type StepResult = { readonly step: StepKey; readonly ok: boolean; readonly headline: string;
  /** #3308: not clean, but the step did all it was asked: every queued set was built, some with problems. The run goes
   *  on to the next step; the verdict line says the step had problems. Never set with `ok`. */
  readonly warn?: true };
export type UpdateRun = {
  readonly steps: readonly StepKey[];
  /** The sets the `sets` step builds: the add queue, in Components' order (#3129). */
  readonly sets: readonly string[];
  /** The sets the `update` step updates in place, the check's hash it echoes, and the hand-edit choice. */
  readonly update: { readonly defs: readonly string[]; readonly previewHash: string; readonly handEdits: HandEditChoice;
    /** #3421: each Kept edits set's own choice (`keptChoicesOf`). Absent when none. */
    readonly sets?: Readonly<Record<string, HandEditChoice>> } | null;
  readonly results: readonly StepResult[];
  readonly stopping: boolean;
  readonly done: boolean;
};

export const startUpdate = (steps: readonly StepKey[], sets: readonly string[], update: UpdateRun['update'] = null): UpdateRun =>
  ({ steps: [...steps], sets: [...sets], update, results: [], stopping: false, done: steps.length === 0 });

/** The step running, or null once the run is done. */
export const stepOf = (r: UpdateRun): StepKey | null => (r.done ? null : r.steps[r.results.length] ?? null);

/** The run after the running step's verdict: done after a failure, after Stop, or after the last step. A step that is
 *  not `ok` but did all it was asked (`warn`, #3308: every set built, some with problems) is not a failure: the run goes on. */
export const stepDone = (r: UpdateRun, ok: boolean, headline: string, warn = false): UpdateRun => {
  const step = stepOf(r);
  if (!step) return r;
  const w = !ok && warn;
  const results: StepResult[] = [...r.results, { step, ok, headline, ...(w ? { warn: true as const } : {}) }];
  return { ...r, results, done: (!ok && !w) || r.stopping || results.length >= r.steps.length };
};

/** Stop after the step running. */
export const stopUpdate = (r: UpdateRun): UpdateRun => (r.done ? r : { ...r, stopping: true });

const plural = (n: number): string => `${n} set${n === 1 ? '' : 's'}`;
/** A facet of a part, as the reason line names it. DRAFT (Q2909.10 A). */
const FACET_WORD: Readonly<Record<FacetView, string>> = { size: 'size', color: 'color', type: 'text', effect: 'effects', layout: 'layout', content: 'contents' };
const partWord = (p: string): string => p.replace(/[-_]+/g, ' ').trim();
/** What an engine update moved, in one line (#3082 Q811 A): each part and what moved in it, each part added or
 *  dropped, then the variants; three at most, then how many more. DRAFT (Q2909.10 A). */
export const engineWhy = (m: MovedView): string => {
  const items = [
    ...m.parts.map((p) => `${partWord(p.part)} ${p.facets.map((f) => FACET_WORD[f]).join(' and ')}`),
    ...m.added.map((p) => `adds ${partWord(p)}`),
    ...m.dropped.map((p) => `drops ${partWord(p)}`),
    ...(m.set ? ['variants'] : []),
  ];
  if (!items.length) return 'Engine update: its drawing changed';
  return `Engine update: ${items.slice(0, 3).join(', ')}${items.length > 3 ? `, ${items.length - 3} more` : ''}`;
};

/** #3713 (3 of 4): names as a list: "A", "A and B", "A, B and C", then "A, B and 2 more". */
const andList = (names: readonly string[]): string =>
  names.length <= 3 ? names.join(', ').replace(/, ([^,]*)$/, ' and $1') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
/** #3713 (3 of 4): why Update file is disabled, said beside it; null while it is enabled, and while the check is out
 *  (its progress in the foot says that already). The file's brand not restored (`off`) says so; else there are no steps
 *  to run, because each set ticked is one the check blocks (`blocked`, by name), or nothing is ticked. It never names a
 *  write it does not make: the button stays disabled. DRAFT (OWNER DECISION: copy). */
export const goWhyOf = (o: { readonly off: string | null; readonly waiting: boolean; readonly steps: number; readonly blocked: readonly string[] }): string | null =>
  o.off ? o.off : o.waiting || o.steps > 0 ? null : UPDATE_COPY.nothing(o.blocked);

/** The checklist's words, DRAFT placeholders until the owner words them (Q2909.10 A). */
export const UPDATE_COPY = {
  button: 'Update file',
  busy: 'Updating',
  title: 'Update file',
  tabUpdate: 'Update',
  tabClean: 'Clean up',
  checking: 'Checking the file…',
  readError: 'Couldn’t read this file’s component sets. Close this and try again.',
  leadFresh: 'This file isn’t set up for Prism3 yet. This first update sets it up.',
  lead: 'Tick what to write. Untick what should wait.',
  setup: 'Set up file',
  setupSub: 'The pages, the templates and the style-guide cells. The cover too, while Docs has it on.',
  /** #3467 (Q3 A): Set up file's line on a set-up file that lacks something setup owns. DRAFT for the owner's sign-off. */
  setupMissing: (names: readonly string[]) => `Builds what this file lacks: ${names.join(', ')}.`,
  theme: 'Theme',
  themeSub: 'The brand’s variables and styles. Layers bound to them restyle at once.',
  /** #3422 Q44 A: the Theme row's tag when the file's variables already match the brand. The sets' own status word. */
  themeCurrent: 'Up to date',
  /** #3129 (Q832 A, Q3129.7–11 A): the add queue's group and the due sets' group. DRAFT, the wireframe's own words.
   *  R6 (the owner, 2026-10-28): both sit under one section, Components, at Theme's level, as its two subtitles. */
  components: 'Components',
  toAdd: 'To add',
  toAddSub: (n: number): string => `${plural(n)} chosen on Components. Each is added with its usage panel while Docs has panels on.`,
  removeSet: (name: string): string => `Remove ${name} from To add`,
  /** #3306 Q3306.5 A: the line under To add's rows naming the sets they nest that the file lacks. DRAFT, the proposal's words. */
  alsoAdds: (names: readonly string[]): string => `Also adds: ${names.join(', ')}.`,
  removeAll: 'Remove all',
  queueFresh: (n: number): string => `Nothing chosen yet. This file holds none of the ${n} component sets.`,
  addAll: (n: number): string => `Add all ${n}`,
  due: 'Due',
  dueSub: (n: number): string => `${plural(n)} to update in place. Ticked by default.`,
  /** #3713 (2 of 4, DRAFT): the group a blocked Due set is listed in, apart from Due and with no tick. */
  blocked: 'Can’t update yet',
  updateStep: 'Update sets in place',
  /** A due set's one-line reason (#3082 Q811 A): a setting it follows, or what an engine update moved in its drawing. */
  dueWhy: (d: Extract<SetDueView, { state: 'due' }>): string => (d.reason === 'engine' ? (d.moved ? engineWhy(d.moved) : UPDATE_COPY.engineUnprinted)
    : d.reason === 'executor' ? 'Engine update: Prism3 draws components differently' : d.reason === 'panel' ? 'Engine update: Prism3 draws usage panels differently' : 'Due · its settings changed'),
  /** #3090 finding 1: an engine update over a set recorded before Prism3 kept a print of its drawing, so nothing can be
   *  named; the next update records the print. DRAFT (Q2909.10 A). */
  engineUnprinted: 'Engine update: recorded before Prism3 noted what it drew',
  /** #3302 (the owner's Q3302.1–.3 A, 2026-11-02; the strings approved as written): the check's progress in the dialog's
   *  foot, "Reading this file…" until every set is found, then "Checked n of N sets"; and the line of the set being
   *  checked now. A set not reached yet has no line. */
  checkReading: 'Reading this file…',
  checkedOf: (done: number, total: number): string => `Checked ${done} of ${plural(total)}`,
  checkingSet: 'Checking…',
  checkError: 'Couldn’t check the sets. Close this and try again.',
  /** #3421 (DRAFT, Q3421.1): a set only Theme's variables and styles block, with Theme ticked. */
  afterTheme: 'Updated after Theme — Theme writes the variables and styles it binds first',
  checked: (c: CheckedSetView, theme = false, nameOf?: (id: string) => string): string => c.blocked ? (theme && c.themeBlocked ? UPDATE_COPY.afterTheme : blockedLine(c.reasons, theme, nameOf))
    : c.upToDate ? 'No member changes' : [`${c.update} of ${c.members} members change`, c.add ? `${c.add} added` : '', c.drop ? `${c.drop} kept and marked deprecated` : '', c.handEdited ? `${c.handEdited} edited by hand` : ''].filter(Boolean).join(' · '),
  handEdits: 'Hand edits',
  /** #3421 (owner decision Q39 A; DRAFT, Q3421.3–.6): what each hand-edit choice does, said under the choice; the Kept
   *  edits section; and each kept set's line. */
  handHint: {
    keep: 'Keep: each edit stays. A set whose edits hold back changes is listed under Kept edits until resolved.',
    overwrite: 'Overwrite: the plan’s values replace each edit.',
    accept: 'Accept as baseline: each edit stays and becomes the record, so it is no longer listed.',
  } as Record<HandEditChoice, string>,
  kept: 'Kept edits',
  keptSub: (n: number): string => `${plural(n)} hold hand edits over changes the plan makes. Each stays here until Overwrite or Accept as baseline is chosen for it.`,
  keptLine: (h: { readonly members: number; readonly changes: readonly string[] }): string =>
    `${h.members} member${h.members === 1 ? ' keeps' : 's keep'} out ${h.changes.length} of the plan’s values${h.changes.length ? `: ${h.changes.slice(0, 3).join(', ')}${h.changes.length > 3 ? `, ${h.changes.length - 3} more` : ''}` : ''}`,
  keptChoice: (name: string): string => `Hand edits on ${name}`,
  // #3083 (the owner's Q3083.4 A, 2026-10-28; DRAFT): the short forms, for the compact select in the foot.
  handChoice: { keep: 'Keep', overwrite: 'Overwrite', accept: 'Accept as baseline' } as Record<HandEditChoice, string>,
  unrecorded: (n: number): string => `${n} set${n === 1 ? '' : 's'} not checked yet: built before Prism3 kept a record.`,
  checkUnrecorded: (n: number): string => `Check ${n} set${n === 1 ? '' : 's'}`,
  saves: 'Saves a version first. If Figma refuses the save, nothing is written.',
  status: { queued: 'To add', needed: 'Needed', new: 'Not in file', due: 'Due', kept: 'Kept edits', hand: 'Hand-edited', unchecked: 'Not checked yet', checking: 'Checking…', current: 'Up to date' } as Record<SetStatus, string>,
  /** Q3129.11 A: the badge's name, split: "Update file, 7 to add, 3 due", with ", theme" when the Theme item counts, and
   *  (#3137 Q3137.4 A) ", usage panels" when the Usage panels group does. */
  badgeName: (p: BadgeParts): string => ['Update file', p.add ? `${p.add} to add` : '', p.due ? `${p.due} due` : '', p.theme ? 'theme' : '', p.panels ? 'usage panels' : ''].filter(Boolean).join(', '),
  /** #3137 (Q3137.1 A, Q3137.5 A, Q3137.7 A): the Usage panels group and Clean up's panels item. DRAFT, the wireframe's words. */
  panels: 'Usage panels',
  panelsTick: (n: number): string => `Draw ${n} usage panel${n === 1 ? '' : 's'}`,
  panelsAll: 'No set in this file has its usage panel yet. Each is drawn beside its set, and sets move apart to make room. No member changes.',
  panelsSome: (n: number): string => `${n} set${n === 1 ? ' in this file has' : 's in this file have'} no usage panel. Each is drawn beside its set, and sets move apart to make room. No member changes.`,
  panelsShow: (n: number): string => `Show the ${n} sets`,
  cleanPanels: (n: number): string => `${n} usage panel${n === 1 ? '' : 's'}, drawn while Docs had panels on.`,
  cleanPanelsKeep: 'Panels edited by hand stay. Turning panels on again draws them back.',
  removePanels: (n: number): string => `Remove ${n} panel${n === 1 ? '' : 's'}`,
  guides: 'Style guides',
  /** #3308 (Q3308.4 A): the last step of a run that sets the file up and writes its theme. DRAFT. */
  coverStep: 'Cover and About this library',
  guidesSub: 'Drawn with the settings in Docs. A rerun updates each table in place.',
  go: 'Update file',
  /** #3713 (3 of 4, DRAFT): beside a disabled Update file, `goWhyOf`. */
  nothing: (blocked: readonly string[]): string => (blocked.length ? `Nothing to write: ${andList(blocked)} can’t be updated yet.` : 'Nothing to write: nothing above is ticked.'),
  goFresh: 'Set up and update',
  cancel: 'Cancel',
  close: 'Close',
  stop: 'Stop after this step',
  /** #3170 Q3170.2 A: a due set's state while the run updates it. DRAFT. */
  runState: { updating: 'Updating', updated: 'Updated' } as Record<'updating' | 'updated', string>,
  running: (step: string, at: number, of: number): string => `Step ${at} of ${of} · ${step}`,
  stopped: (step: string, headline: string): string => `The last update stopped at ${step}: ${headline}`,
  cleanLead: 'Things Prism3 wrote earlier and no longer writes. Nothing here rides Update file.',
  cleanChecking: 'Checking for stale items…',
  cleanNone: 'Nothing stale in this file.',
  cleanRetired: (n: number): string => `${n} style-guide table${n === 1 ? '' : 's'} the generator no longer draws.`,
  removeTables: (n: number): string => `Remove ${n} table${n === 1 ? '' : 's'}`,
} as const;

/** #3713: the sets a blocker line names (`icon/close`, `icon`), as Components names them: each set's id (the part before
 *  `/`) through `nameOf`, which the shell gives as `displayNameOf` over its catalog (owner decision Q392), once each. A
 *  trailing `and N more` from the plugin's cut list is kept as it reads. */
const setNames = (list: string, nameOf: (id: string) => string): string => {
  const parts = list.split(', ');
  const more = parts[parts.length - 1].match(/^and (\d+) more$/);
  const names = [...new Set((more ? parts.slice(0, -1) : parts).map((x) => nameOf(x.split('/')[0])))].join(', ');
  return more ? `${names}, and ${more[1]} more` : names;
};
/** How many items a plugin list names, counting its `and N more`. */
const listCount = (list: string): number => { const parts = list.split(', '); const more = parts[parts.length - 1].match(/^and (\d+) more$/); return more ? parts.length - 1 + Number(more[1]) : parts.length; };
const s_ = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
/** #3713: the blocker lines Theme's run clears (the variables and the text and effect styles it writes), matched by the
 *  same words `blockedWhy` reads them by. With Theme ticked they no longer block, so the row skips them. */
const THEME_CLEARS = /^(?:\d+ variables? the plan binds (?:is|are) not in this file|(?:text|effect) styles? not in this file: )/;
/** #3713: one of the check's blocker lines (`update-plan.ts`, `fileBlockers` and `setRefusal`) in plain words, as the
 *  clause after "Can’t update yet —", with the step that clears it where Studio or Figma offers one. A line of a shape not known here is shown as written, less
 *  its issue references. DRAFT (OWNER DECISION: copy). The shapes are matched by their words, so a reworded blocker
 *  falls through to its own text, never to a wrong reason. */
export const blockedWhy = (line: string, nameOf: (id: string) => string = (id) => id): { readonly why: string; readonly next: string | null } => {
  let m: RegExpMatchArray | null;
  if ((m = line.match(/^Not in this file: (.+)\. Build (.+) first, then run the update again$/)))
    return { why: `it needs ${setNames(m[2], nameOf)}, which this file doesn’t have.`, next: `Add ${setNames(m[2], nameOf)} on Components first.` };
  if ((m = line.match(/^(\d+) variables? the plan binds (?:is|are) not in this file/)))
    return { why: `it needs ${s_(Number(m[1]), 'variable', 'variables')} this file doesn’t have.`, next: 'Tick Theme to write them.' };
  if ((m = line.match(/^(text|effect) styles? not in this file: (.+)$/)))
    return { why: `it needs ${listCount(m[2]) === 1 ? `a ${m[1]} style` : `${m[1]} styles`} this file doesn’t have: ${m[2]}.`, next: 'Tick Theme to write them.' };
  if ((m = line.match(/^components? the plan swaps to (?:is|are) not in this file: (.+)$/)))
    return { why: `it swaps to ${setNames(m[1], nameOf)}, which this file doesn’t have.`, next: `Add ${setNames(m[1], nameOf)} on Components first.` };
  if ((m = line.match(/^fonts: (.+) will not load/)))
    return { why: `these fonts won’t load: ${m[1]}.`, next: 'Install or turn them on in Figma, then open this again.' };
  if (/^an axis the plan removed would collapse members/.test(line))
    return { why: 'a property it drops would merge variants into one.', next: null };
  if ((m = line.match(/^the axes change, and (\d+) members? not built by Prism3/)))
    return { why: `its properties change, and ${s_(Number(m[1]), 'variant', 'variants')} not built by Prism3 would be left behind.`, next: 'The agent’s Adopt can claim them first.' };
  if ((m = line.match(/^renaming (.+) would give it the name of another member \((.+)\)$/)))
    return { why: `renaming ${m[1]} would clash with ${m[2]}.`, next: 'Rename or remove one of them in Figma.' };
  if ((m = line.match(/^(\d+) members share the coordinate (\S+)/)))
    return { why: `${m[1]} variants share one name, ${m[2]}.`, next: 'Rename or remove the extra one in Figma.' };
  if (/^the members disagree on the axis list/.test(line))
    return { why: 'its variants don’t all have the same properties.', next: 'Fix the variant names in Figma.' };
  const t = line.replace(/\s*\(#\d+\)/g, '').trim().replace(/:$/, '').replace(/'/g, '’');
  return { why: `${t}${/[.!?]$/.test(t) ? '' : '.'}`, next: null };
};
/** #3713: a blocked set's first reason in plain words, the step that clears it, and how many more; `lead` opens it. With
 *  Theme ticked (`theme`), the reasons Theme's run clears are skipped, so the row never asks for a step already taken and
 *  leads with what still blocks. DRAFT. */
const reasonText = (reasons: readonly string[] | undefined, theme: boolean, nameOf: ((id: string) => string) | undefined, lead: (why: string) => string): string => {
  if (!reasons?.length) return lead('the check gave no reason.');
  const left = theme ? reasons.filter((r) => !THEME_CLEARS.test(r)) : reasons;
  const shown = left.length ? left : reasons;
  const { why, next } = blockedWhy(shown[0], nameOf);
  return [lead(why), next, shown.length > 1 ? `${s_(shown.length - 1, 'more reason', 'more reasons')}.` : ''].filter(Boolean).join(' ');
};
/** #3713: a blocked set's line where it stands among the checked sets: "Can't update yet — …". DRAFT. */
export const blockedLine = (reasons: readonly string[] | undefined, theme = false, nameOf?: (id: string) => string): string =>
  reasonText(reasons, theme, nameOf, (why) => `Can’t update yet — ${why}`);
/** #3713 (2 of 4): its line under Can't update yet, whose title already says so: the reason as a sentence. DRAFT. */
export const blockedReason = (reasons: readonly string[] | undefined, theme = false, nameOf?: (id: string) => string): string =>
  reasonText(reasons, theme, nameOf, (why) => `${why.charAt(0).toUpperCase()}${why.slice(1)}`);

/** Each step's name in the checklist and in the run line. */
export const STEP_TITLE: Readonly<Record<StepKey, string>> = { setup: UPDATE_COPY.setup, theme: UPDATE_COPY.theme, update: UPDATE_COPY.updateStep, sets: UPDATE_COPY.toAdd, guides: UPDATE_COPY.guides, cover: UPDATE_COPY.coverStep };
