/**
 * Update file's model (#2909 IA v2 phase 1): the checklist, and the run that works through it. Pure, no DOM, so
 * `test-update-file.ts` drives it in Node.
 *
 * THE CHECKLIST (owner decisions Q2909.2 A, Q2909.5 A, Q668 A). Update file is the plugin's one global write. It always
 * opens the checklist, even when only the theme is to be written (Q2909.2 A). Its items, in the order they run:
 *   · Set up file, only on a file that is not set up: the first checklist on such a file is the setup (Q668 A);
 *   · Theme: the brand's variables and styles (today's Apply Theme), ticked;
 *   · Component sets: each set the as-built ledger reads as due, ticked, updated in place (phase 2, Q2909.8 A), with the
 *     one choice for hand edits (Keep, the default; Overwrite; Accept as the new baseline); then each buildable set the
 *     file does not hold, unticked ("Not in file · add"), ticked on a file that is not set up (Q2909.5 A). Building
 *     stays add-only underneath: a set the file holds is only ever updated in place, never rebuilt;
 *   · Style guides: drawn with Documentation's saved settings (Q2909.23 A), ticked on a file that is not set up.
 * Usage panels and the cover are not items of their own: they follow Documentation's switches, drawn with the sets and
 * by Set up file.
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
import type { CheckedSetView, FacetView, MovedView, SetDueView } from '../write-adapter';

/** `update` is the in-place update of the due sets (Q2909.8 A); `sets` adds the sets the file lacks. */
export type StepKey = 'setup' | 'theme' | 'update' | 'sets' | 'guides';
/** Run order. */
export const STEP_ORDER: readonly StepKey[] = ['setup', 'theme', 'update', 'sets', 'guides'];

/** What the checklist reads when it opens: the file's sets, whether it is set up, and what the ledger says is due
 *  (`file-sets`). */
export type FileSets = { readonly present: readonly string[]; readonly setUp: boolean; readonly error: string | null; readonly due: Readonly<Record<string, SetDueView>> };

export type HandEditChoice = 'keep' | 'overwrite' | 'accept';
/** The checklist's ticks: each item, each set that is not in the file, each due set, and what the update does with hand
 *  edits. */
export type Ticks = {
  readonly setup: boolean; readonly theme: boolean; readonly guides: boolean; readonly sets: ReadonlySet<string>;
  readonly update: ReadonlySet<string>; readonly handEdits: HandEditChoice;
};

/** The sets Update file can add: buildable, and not in the file, in catalog order. */
export const newSetsOf = (catalog: Catalog, f: FileSets): string[] => catalog.filter((e) => e.buildable && !f.present.includes(e.id)).map((e) => e.id);
/** The sets the ledger reads as due (Q2909.8 A), in catalog order. */
export const dueSetsOf = (catalog: Catalog, f: FileSets): string[] => catalog.filter((e) => f.present.includes(e.id) && f.due[e.id]?.state === 'due').map((e) => e.id);
/** The sets the file holds that the ledger has no entry for, in catalog order: only the full check can tell. */
export const unrecordedOf = (catalog: Catalog, f: FileSets): string[] => catalog.filter((e) => f.present.includes(e.id) && (f.due[e.id]?.state ?? 'unrecorded') === 'unrecorded').map((e) => e.id);
/** How many things the badge on Update file counts (Q2909.8 A): the due sets. */
export const dueCount = (catalog: Catalog, f: FileSets | null): number => (f && !f.error ? dueSetsOf(catalog, f).length : 0);

/** The ticks the checklist opens with (Q2909.2 A, Q2909.5 A, Q2909.8 A): the theme always, and every due set, keeping
 *  hand edits; on a file that is not set up, the setup, every new set and the style guides too. */
export const defaultTicks = (catalog: Catalog, f: FileSets): Ticks => {
  const fresh = !f.setUp;
  return { setup: fresh, theme: true, guides: fresh, sets: new Set(fresh ? newSetsOf(catalog, f) : []), update: new Set(dueSetsOf(catalog, f)), handEdits: 'keep' };
};

/** The steps a set of ticks runs, in order. Set up file is a step only on a file that is not set up. */
export const stepsOf = (t: Ticks, f: FileSets): StepKey[] =>
  STEP_ORDER.filter((k) => (k === 'setup' ? !f.setUp && t.setup : k === 'sets' ? t.sets.size > 0 : k === 'update' ? t.update.size > 0 : t[k]));

/** The brand Update file's due read, its check and its update measure against (Q699 A, #3023 Q701 B): the panel's when
 *  the run's steps include Theme, which stores it before the update; else nothing, and the host reads the file's stored
 *  brand, the one the run leaves in the file. So the counts shown are the ones written, and the next load agrees. */
export const brandFor = <B>(theme: boolean, panel: B): B | undefined => (theme ? panel : undefined);

/** What the scoped check says of the ticked sets the update would act on: the ones it read and did not block. */
export const updatableOf = (t: Ticks, check: { readonly sets: readonly CheckedSetView[] }): string[] =>
  [...t.update].filter((id) => check.sets.some((c) => c.def === id && !c.blocked));

/** A set's statuses, as Components' list and the checklist show them (Q2909.8 A): Not in file; or Due; Hand-edited
 *  (first class, beside Due when both); Not checked yet; Checking while the background pass has not reached it; else Up to
 *  date. Empty before the host has said anything. */
export type SetStatus = 'new' | 'due' | 'hand' | 'unchecked' | 'checking' | 'current';
export const statusesOf = (id: string, f: FileSets | null, hand: ReadonlyMap<string, { readonly edited: number }>, pass: 'idle' | 'running' | 'done'): SetStatus[] => {
  if (!f || f.error) return [];
  if (!f.present.includes(id)) return ['new'];
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
  /** The sets the `sets` step builds, in catalog order. */
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
  sets: 'Component sets',
  setsSub: (n: number): string => (n ? `${n} not in this file. A set is added with its usage panel while Documentation has panels on.` : 'Every component set is in this file.'),
  setNew: 'Not in file · add',
  updateStep: 'Update sets in place',
  /** Q2909.8 A: the due sets and the hand-edit choice. DRAFT placeholders (Q2909.10 A). */
  setsDueSub: (due: number, fresh: number): string => [due ? `${due} to update in place.` : '', fresh ? `${fresh} not in this file.` : ''].filter(Boolean).join(' ') || 'Every component set is in this file and up to date.',
  /** A due set's one-line reason (#3082 Q811 A): a setting it follows, or what an engine update moved in its drawing. */
  dueWhy: (d: Extract<SetDueView, { state: 'due' }>): string => (d.reason === 'engine' ? engineWhy(d.moved)
    : d.reason === 'executor' ? 'Engine update: Prism3 draws components differently' : 'Due · its settings changed'),
  checkingSets: 'Checking what changes…',
  checkError: 'Couldn’t check the sets. Close this and try again.',
  checked: (c: CheckedSetView): string => c.blocked ? 'Can’t be updated in place yet; the agent’s update check says why'
    : c.upToDate ? 'No member changes' : [`${c.update} of ${c.members} members change`, c.add ? `${c.add} added` : '', c.drop ? `${c.drop} kept and marked deprecated` : '', c.handEdited ? `${c.handEdited} edited by hand` : ''].filter(Boolean).join(' · '),
  handEdits: 'Hand edits',
  handChoice: { keep: 'Keep them', overwrite: 'Overwrite them', accept: 'Accept as the new baseline' } as Record<HandEditChoice, string>,
  unrecorded: (n: number): string => `${n} set${n === 1 ? '' : 's'} not checked yet: built before Prism3 kept a record.`,
  checkUnrecorded: (n: number): string => `Check ${n} set${n === 1 ? '' : 's'}`,
  saves: 'Saves a version first. If Figma refuses the save, nothing is written.',
  status: { new: 'Not in file', due: 'Due', hand: 'Hand-edited', unchecked: 'Not checked yet', checking: 'Checking…', current: 'Up to date' } as Record<SetStatus, string>,
  badge: (n: number): string => `${n} due`,
  guides: 'Style guides',
  guidesSub: 'Drawn with the settings in Documentation. A rerun updates each table in place.',
  go: 'Update file',
  goFresh: 'Set up and update',
  cancel: 'Cancel',
  close: 'Close',
  stop: 'Stop after this step',
  running: (step: string, at: number, of: number): string => `Step ${at} of ${of} · ${step}`,
  stopped: (step: string, headline: string): string => `The last update stopped at ${step}: ${headline}`,
  cleanLead: 'Things Prism3 wrote earlier and no longer writes. Nothing here rides Update file.',
  cleanChecking: 'Checking for stale items…',
  cleanNone: 'Nothing stale in this file.',
  cleanRetired: (n: number): string => `${n} style-guide table${n === 1 ? '' : 's'} the generator no longer draws.`,
  removeTables: (n: number): string => `Remove ${n} table${n === 1 ? '' : 's'}`,
} as const;

/** Each step's name in the checklist and in the run line. */
export const STEP_TITLE: Readonly<Record<StepKey, string>> = { setup: UPDATE_COPY.setup, theme: UPDATE_COPY.theme, update: UPDATE_COPY.updateStep, sets: UPDATE_COPY.sets, guides: UPDATE_COPY.guides };
