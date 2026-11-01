/**
 * Update file's model (#2909 IA v2 phase 1): the checklist, and the run that works through it. Pure, no DOM, so
 * `test-update-file.ts` drives it in Node.
 *
 * THE CHECKLIST (owner decisions Q2909.2 A, Q2909.5 A, Q668 A). Update file is the plugin's one global write. It always
 * opens the checklist, even when only the theme is to be written (Q2909.2 A). Its items, in the order they run:
 *   · Set up file, only on a file that is not set up: the first checklist on such a file is the setup (Q668 A);
 *   · Theme: the brand's variables and styles (today's Apply Theme), ticked;
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
import { inListOrder } from './component-groups';
import type { CheckedSetView, FacetView, MovedView, SetDueView } from '../write-adapter';

/** `update` is the in-place update of the due sets (Q2909.8 A); `sets` builds the add queue (#3129). */
export type StepKey = 'setup' | 'theme' | 'update' | 'sets' | 'guides';
/** Run order. */
export const STEP_ORDER: readonly StepKey[] = ['setup', 'theme', 'update', 'sets', 'guides'];

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
};

/** The sets the file could add: buildable, and not in the file, in catalog order. Components' boxes and Add all act on
 *  them (#3129). */
export const newSetsOf = (catalog: Catalog, f: Pick<FileSets, 'present'>): string[] => catalog.filter((e) => e.buildable && !f.present.includes(e.id)).map((e) => e.id);
/** The add queue as Update file shows it and the `sets` step builds it (#3129 Q833 A, Q3129.2 A, Q3129.3 A): the queued
 *  sets the file lacks and the engine can build, in Components' list order. */
export const queuedOf = (catalog: Catalog, f: Pick<FileSets, 'present'> | null, queue: readonly string[] | null): string[] =>
  f && queue ? inListOrder(catalog, queue.filter((id, i) => queue.indexOf(id) === i && !f.present.includes(id) && catalog.some((e) => e.id === id && e.buildable))) : [];
/** The sets the ledger reads as due (Q2909.8 A), in catalog order. */
export const dueSetsOf = (catalog: Catalog, f: FileSets): string[] => catalog.filter((e) => f.present.includes(e.id) && f.due[e.id]?.state === 'due').map((e) => e.id);
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
export const badgeParts = (catalog: Catalog, f: FileSets | null, live: LiveDue | null, queue: readonly string[] | null): BadgeParts => {
  if (live && !live.error) return { add: queuedOf(catalog, live, queue).length, due: dueCount(catalog, { present: live.present, setUp: true, error: null, due: live.due }), theme: live.theme, panels: panelSetsOf(catalog, live, queue).length > 0 };
  return { add: f && !f.error ? queuedOf(catalog, f, queue).length : 0, due: dueCount(catalog, f), theme: false, panels: !!f && !f.error && panelSetsOf(catalog, f, queue).length > 0 };
};
export const badgeCount = (catalog: Catalog, f: FileSets | null, live: LiveDue | null, queue: readonly string[] | null = null): number => {
  const p = badgeParts(catalog, f, live, queue);
  return p.add + p.due + (p.theme ? 1 : 0) + (p.panels ? 1 : 0);
};
/** How long the panel waits after the last change before it asks for the recount (#3081): one ask for a burst of
 *  edits, such as a slider drag or typing, never one a keystroke. */
export const DUE_DEBOUNCE_MS = 250;

/** The ticks the checklist opens with (Q2909.2 A, Q2909.8 A, Q3129.10 A): the theme always, and every due set, keeping
 *  hand edits; on a file that is not set up, the setup and the style guides too. No set is queued for it: the queue is
 *  the file's (#3129), so a fresh file starts with nothing to add until Add all or Components. */
export const defaultTicks = (catalog: Catalog, f: FileSets, queue: readonly string[] | null = null): Ticks => {
  const fresh = !f.setUp;
  return { setup: fresh, theme: true, guides: fresh, panels: panelSetsOf(catalog, f, queue).length > 0, update: new Set(dueSetsOf(catalog, f)), handEdits: 'keep' };
};

/** The steps a set of ticks runs, in order. Set up file is a step only on a file that is not set up; `sets` only while
 *  the add queue holds a set (`queuedOf`). */
export const stepsOf = (t: Ticks, f: FileSets, queued: readonly string[]): StepKey[] =>
  STEP_ORDER.filter((k) => (k === 'setup' ? !f.setUp && t.setup : k === 'sets' ? queued.length > 0 : k === 'update' ? t.update.size > 0 : t[k]));

/** The brand Update file's due read, its check and its update measure against (Q699 A, #3023 Q701 B): the panel's when
 *  the run's steps include Theme, which stores it before the update; else nothing, and the host reads the file's stored
 *  brand, the one the run leaves in the file. So the counts shown are the ones written, and the next load agrees. */
export const brandFor = <B>(theme: boolean, panel: B): B | undefined => (theme ? panel : undefined);

/** What the scoped check says of the ticked sets the update would act on: the ones it read and did not block. */
export const updatableOf = (t: Ticks, check: { readonly sets: readonly CheckedSetView[] }): string[] =>
  [...t.update].filter((id) => check.sets.some((c) => c.def === id && !c.blocked));
/** #3137 Q3137.2 A: the update step's defs: the ticked Due sets and, while the Usage panels tick is on, the panel sets,
 *  each one the scoped check read and did not block. */
export const updateDefsOf = (t: Ticks, check: { readonly sets: readonly CheckedSetView[] }, panelSets: readonly string[]): string[] =>
  [...new Set([...updatableOf(t, check), ...(t.panels ? panelSets.filter((id) => check.sets.some((c) => c.def === id && !c.blocked)) : [])])];
/** #3137 Q3137.5 A: up to this many names show inline in the Usage panels group; past it, under a closed disclosure. */
export const PANELS_INLINE = 6;
/** #3137: the sets the scoped check reads as the checklist opens: the Due sets and, while ticked, the panel sets. */
export const checkScopeOf = (due: readonly string[], t: Pick<Ticks, 'panels'>, panelSets: readonly string[]): string[] =>
  [...new Set([...due, ...(t.panels ? panelSets : [])])];

/** A set's statuses, as Components' list and the checklist show them (Q2909.8 A): Not in file, or To add once it is in
 *  the add queue (#3129 Q3129.4 A); or Due; Hand-edited (first class, beside Due when both); Not checked yet; Checking
 *  while the background pass has not reached it, or, for a set the ledger does not name, while the file is still being
 *  read (#3110); else Up to date. Empty before the host has said anything. */
export type SetStatus = 'queued' | 'new' | 'due' | 'hand' | 'unchecked' | 'checking' | 'current';
export const statusesOf = (id: string, f: FileSets | null, hand: ReadonlyMap<string, { readonly edited: number }>, pass: 'idle' | 'running' | 'done', queue: readonly string[] | null = null): SetStatus[] => {
  if (!f || f.error) return [];
  if (!f.present.includes(id)) return f.partial ? ['checking'] : queue?.includes(id) ? ['queued'] : ['new'];
  const due = f.due[id]?.state ?? 'unrecorded';
  const h = hand.get(id);
  const out: SetStatus[] = [];
  if (due === 'due') out.push('due');
  if (h && h.edited > 0) out.push('hand');
  if (due === 'unrecorded') out.push('unchecked');
  if (!h && pass === 'running' && due !== 'unrecorded') out.push('checking');
  return out.length ? out : ['current'];
};

export type StepResult = { readonly step: StepKey; readonly ok: boolean; readonly headline: string };
export type UpdateRun = {
  readonly steps: readonly StepKey[];
  /** The sets the `sets` step builds: the add queue, in Components' order (#3129). */
  readonly sets: readonly string[];
  /** The sets the `update` step updates in place, the check's hash it echoes, and the hand-edit choice. */
  readonly update: { readonly defs: readonly string[]; readonly previewHash: string; readonly handEdits: HandEditChoice } | null;
  readonly results: readonly StepResult[];
  readonly stopping: boolean;
  readonly done: boolean;
};

export const startUpdate = (steps: readonly StepKey[], sets: readonly string[], update: UpdateRun['update'] = null): UpdateRun =>
  ({ steps: [...steps], sets: [...sets], update, results: [], stopping: false, done: steps.length === 0 });

/** The step running, or null once the run is done. */
export const stepOf = (r: UpdateRun): StepKey | null => (r.done ? null : r.steps[r.results.length] ?? null);

/** The run after the running step's verdict: done after a failure, after Stop, or after the last step. */
export const stepDone = (r: UpdateRun, ok: boolean, headline: string): UpdateRun => {
  const step = stepOf(r);
  if (!step) return r;
  const results = [...r.results, { step, ok, headline }];
  return { ...r, results, done: !ok || r.stopping || results.length >= r.steps.length };
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

/** The checklist's words, DRAFT placeholders until the owner words them (Q2909.10 A). */
export const UPDATE_COPY = {
  button: 'Update file',
  busy: 'Updating…',
  title: 'Update file',
  tabUpdate: 'Update',
  tabClean: 'Clean up',
  checking: 'Checking the file…',
  readError: 'Couldn’t read this file’s component sets. Close this and try again.',
  leadFresh: 'This file isn’t set up for Prism3 yet. This first update sets it up.',
  lead: 'Tick what to write. Untick what should wait.',
  setup: 'Set up file',
  setupSub: 'The pages, the templates and the style-guide cells. The cover too, while Documentation has it on.',
  theme: 'Theme',
  themeSub: 'The brand’s variables and styles. Layers bound to them restyle at once.',
  /** #3129 (Q832 A, Q3129.7–11 A): the add queue's group and the due sets' group. DRAFT, the wireframe's own words.
   *  R6 (the owner, 2026-10-28): both sit under one section, Components, at Theme's level, as its two subtitles. */
  components: 'Components',
  toAdd: 'To add',
  toAddSub: (n: number): string => `${plural(n)} chosen on Components. Each is added with its usage panel while Documentation has panels on.`,
  removeSet: (name: string): string => `Remove ${name} from To add`,
  removeAll: 'Remove all',
  queueFresh: (n: number): string => `Nothing chosen yet. This file holds none of the ${n} component sets.`,
  addAll: (n: number): string => `Add all ${n}`,
  due: 'Due',
  dueSub: (n: number): string => `${plural(n)} to update in place. Ticked by default.`,
  updateStep: 'Update sets in place',
  /** A due set's one-line reason (#3082 Q811 A): a setting it follows, or what an engine update moved in its drawing. */
  dueWhy: (d: Extract<SetDueView, { state: 'due' }>): string => (d.reason === 'engine' ? (d.moved ? engineWhy(d.moved) : UPDATE_COPY.engineUnprinted)
    : d.reason === 'executor' ? 'Engine update: Prism3 draws components differently' : 'Due · its settings changed'),
  /** #3090 finding 1: an engine update over a set recorded before Prism3 kept a print of its drawing, so nothing can be
   *  named; the next update records the print. DRAFT (Q2909.10 A). */
  engineUnprinted: 'Engine update: recorded before Prism3 noted what it drew',
  checkingSets: 'Checking what changes…',
  checkError: 'Couldn’t check the sets. Close this and try again.',
  checked: (c: CheckedSetView): string => c.blocked ? 'Can’t be updated in place yet; the agent’s update check says why'
    : c.upToDate ? 'No member changes' : [`${c.update} of ${c.members} members change`, c.add ? `${c.add} added` : '', c.drop ? `${c.drop} kept and marked deprecated` : '', c.handEdited ? `${c.handEdited} edited by hand` : ''].filter(Boolean).join(' · '),
  handEdits: 'Hand edits',
  // #3083 (the owner's Q3083.4 A, 2026-10-28; DRAFT): the short forms, for the compact select in the foot.
  handChoice: { keep: 'Keep', overwrite: 'Overwrite', accept: 'Accept as baseline' } as Record<HandEditChoice, string>,
  unrecorded: (n: number): string => `${n} set${n === 1 ? '' : 's'} not checked yet: built before Prism3 kept a record.`,
  checkUnrecorded: (n: number): string => `Check ${n} set${n === 1 ? '' : 's'}`,
  saves: 'Saves a version first. If Figma refuses the save, nothing is written.',
  status: { queued: 'To add', new: 'Not in file', due: 'Due', hand: 'Hand-edited', unchecked: 'Not checked yet', checking: 'Checking…', current: 'Up to date' } as Record<SetStatus, string>,
  /** Q3129.11 A: the badge's name, split: "Update file, 7 to add, 3 due", with ", theme" when the Theme item counts, and
   *  (#3137 Q3137.4 A) ", usage panels" when the Usage panels group does. */
  badgeName: (p: BadgeParts): string => ['Update file', p.add ? `${p.add} to add` : '', p.due ? `${p.due} due` : '', p.theme ? 'theme' : '', p.panels ? 'usage panels' : ''].filter(Boolean).join(', '),
  /** #3137 (Q3137.1 A, Q3137.5 A, Q3137.7 A): the Usage panels group and Clean up's panels item. DRAFT, the wireframe's words. */
  panels: 'Usage panels',
  panelsTick: (n: number): string => `Draw ${n} usage panel${n === 1 ? '' : 's'}`,
  panelsAll: 'No set in this file has its usage panel yet. Each is drawn beside its set, and sets move apart to make room. No member changes.',
  panelsSome: (n: number): string => `${n} set${n === 1 ? ' in this file has' : 's in this file have'} no usage panel. Each is drawn beside its set, and sets move apart to make room. No member changes.`,
  panelsShow: (n: number): string => `Show the ${n} sets`,
  cleanPanels: (n: number): string => `${n} usage panel${n === 1 ? '' : 's'}, drawn while Documentation had panels on.`,
  cleanPanelsKeep: 'Panels edited by hand stay. Turning panels on again draws them back.',
  removePanels: (n: number): string => `Remove ${n} panel${n === 1 ? '' : 's'}`,
  guides: 'Style guides',
  guidesSub: 'Drawn with the settings in Documentation. A rerun updates each table in place.',
  go: 'Update file',
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

/** Each step's name in the checklist and in the run line. */
export const STEP_TITLE: Readonly<Record<StepKey, string>> = { setup: UPDATE_COPY.setup, theme: UPDATE_COPY.theme, update: UPDATE_COPY.updateStep, sets: UPDATE_COPY.toAdd, guides: UPDATE_COPY.guides };
