/**
 * Update file's model (#2909 IA v2 phase 1): the checklist, and the run that works through it. Pure, no DOM, so
 * `test-update-file.ts` drives it in Node.
 *
 * THE CHECKLIST (owner decisions Q2909.2 A, Q2909.5 A, Q668 A). Update file is the plugin's one global write. It always
 * opens the checklist, even when only the theme is to be written (Q2909.2 A). Its items, in the order they run:
 *   · Set up file, only on a file that is not set up: the first checklist on such a file is the setup (Q668 A);
 *   · Theme: the brand's variables and styles (today's Apply Theme), ticked;
 *   · Component sets: each buildable set the file does not hold, unticked ("Not in file · add"), ticked on a file that
 *     is not set up (Q2909.5 A). Building stays add-only underneath: a set the file holds is never rebuilt by this;
 *   · Style guides: drawn with Documentation's saved settings (Q2909.23 A), ticked on a file that is not set up.
 * Usage panels and the cover are not items of their own: they follow Documentation's switches, drawn with the sets and
 * by Set up file. Updating the sets the file already holds in place, and knowing what is due without asking, are phase 2
 * (the as-built ledger, Q2909.8).
 *
 * THE RUN works through the ticked items one at a time, in order, and stops after a step that fails (its verdict is not
 * `ok`), or after the step running when Stop is asked for. `main.ts` starts each step and reports its verdict here.
 */
import type { Catalog } from './component-catalog';

export type StepKey = 'setup' | 'theme' | 'sets' | 'guides';
/** Run order. */
export const STEP_ORDER: readonly StepKey[] = ['setup', 'theme', 'sets', 'guides'];

/** What the checklist reads when it opens: the file's sets and whether it is set up (`file-sets`). */
export type FileSets = { readonly present: readonly string[]; readonly setUp: boolean; readonly error: string | null };

/** The checklist's ticks: each item, and each set that is not in the file. */
export type Ticks = { readonly setup: boolean; readonly theme: boolean; readonly guides: boolean; readonly sets: ReadonlySet<string> };

/** The sets Update file can add: buildable, and not in the file, in catalog order. */
export const newSetsOf = (catalog: Catalog, f: FileSets): string[] => catalog.filter((e) => e.buildable && !f.present.includes(e.id)).map((e) => e.id);

/** The ticks the checklist opens with (Q2909.2 A, Q2909.5 A): the theme always; on a file that is not set up, the setup,
 *  every new set and the style guides too. */
export const defaultTicks = (catalog: Catalog, f: FileSets): Ticks => {
  const fresh = !f.setUp;
  return { setup: fresh, theme: true, guides: fresh, sets: new Set(fresh ? newSetsOf(catalog, f) : []) };
};

/** The steps a set of ticks runs, in order. Set up file is a step only on a file that is not set up. */
export const stepsOf = (t: Ticks, f: FileSets): StepKey[] =>
  STEP_ORDER.filter((k) => (k === 'setup' ? !f.setUp && t.setup : k === 'sets' ? t.sets.size > 0 : t[k]));

export type StepResult = { readonly step: StepKey; readonly ok: boolean; readonly headline: string };
export type UpdateRun = {
  readonly steps: readonly StepKey[];
  /** The sets the `sets` step builds, in catalog order. */
  readonly sets: readonly string[];
  readonly results: readonly StepResult[];
  readonly stopping: boolean;
  readonly done: boolean;
};

export const startUpdate = (steps: readonly StepKey[], sets: readonly string[]): UpdateRun =>
  ({ steps: [...steps], sets: [...sets], results: [], stopping: false, done: steps.length === 0 });

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
  guides: 'Style guides',
  guidesSub: 'Drawn with the settings in Documentation. A rerun updates each table in place.',
  go: 'Update file',
  goFresh: 'Set up and update',
  cancel: 'Cancel',
  close: 'Close',
  stop: 'Stop after this step',
  running: (step: string, at: number, of: number): string => `Step ${at} of ${of} · ${step}`,
  cleanLead: 'Things Prism3 wrote earlier and no longer writes. Nothing here rides Update file.',
  cleanChecking: 'Checking for stale items…',
  cleanNone: 'Nothing stale in this file.',
  cleanRetired: (n: number): string => `${n} style-guide table${n === 1 ? '' : 's'} the generator no longer draws.`,
  removeTables: (n: number): string => `Remove ${n} table${n === 1 ? '' : 's'}`,
} as const;

/** Each step's name in the checklist and in the run line. */
export const STEP_TITLE: Readonly<Record<StepKey, string>> = { setup: UPDATE_COPY.setup, theme: UPDATE_COPY.theme, sets: UPDATE_COPY.sets, guides: UPDATE_COPY.guides };
