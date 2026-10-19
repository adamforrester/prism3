/**
 * A multi-set build, as a pure model (#2700, calls 10, 13, 16 and 17 A). No DOM and no host, so
 * `test-component-groups.ts` runs it in Node.
 *
 * WHY A QUEUE IN THE STUDIO. The plugin builds one set per `build-components` request, and its `component-result`
 * names no set; the panel remembers the one it posted (`componentDef`). So a build of several sets posts them one after
 * another, each when the last one's result arrives, and records each result against the set it posted. The wire and the
 * plugin are unchanged, and each set still builds any set it nests first (#1633).
 *
 * STOP (call 16 A) stops after the current set: a set the plugin is building is never abandoned half way, and the sets
 * already built stay. A run ends when every set has a result, or at the first result after a stop.
 *
 * ONE ACTIVITY ENTRY (idea 13 A). While a run is out, the panel's build stays pending between its sets, so Activity sees
 * one operation running; when a run of more than one set ends, `runVerdict` is its one result. A run of one set keeps
 * the plugin's own verdict, word for word, as a single build always has.
 *
 * Copy is DRAFT, the approved wireframe's own words (#2700).
 */
import type { Catalog } from './component-catalog';
import type { SetBuild } from './host-session';
import { entryOf, GROUPS_COPY } from './component-groups';

/** What started a run: the action bar's selection, or the Subcomponents section's "Build all" (call 10 A). */
export type RunKind = 'selection' | 'subcomponents';

export type RunResult = { readonly id: string; readonly result: SetBuild; readonly headline: string };

export type BuildRun = {
  readonly kind: RunKind;
  /** The sets, in the order they are built. */
  readonly ids: readonly string[];
  readonly results: readonly RunResult[];
  readonly stopping: boolean;
  readonly done: boolean;
};

/** A run over `ids`, in their order. */
export const startRun = (kind: RunKind, ids: readonly string[]): BuildRun => ({ kind, ids: [...ids], results: [], stopping: false, done: ids.length === 0 });

/** The set the run is building now, or null when it is done. */
export const currentOf = (r: BuildRun): string | null => (r.done ? null : r.ids[r.results.length] ?? null);

/** The run after the current set's result. It ends when every set has one, or after a stop. */
export const record = (r: BuildRun, x: RunResult): BuildRun => {
  if (r.done) return r;
  const results = [...r.results, x];
  return { ...r, results, done: r.stopping || results.length >= r.ids.length };
};

/** Stop after the current set (call 16 A). */
export const stopRun = (r: BuildRun): BuildRun => (r.done ? r : { ...r, stopping: true });

/** The run's place, 1-based, for "Building 2 of 4…". */
export const positionOf = (r: BuildRun): { at: number; of: number } => ({ at: Math.min(r.results.length + 1, r.ids.length), of: r.ids.length });

/** The run's copy. DRAFT (#2700's wireframe). */
export const RUN_COPY = {
  runLabel: (n: number): string => (n ? `Build ${GROUPS_COPY.sets(n)}` : 'Build'),
  building: (at: number, of: number): string => `Building ${at} of ${of}…`,
  stop: 'Stop',
  stopping: 'Stopping after this set…',
  nothing: 'Select sets to build them.',
  also: (names: readonly string[]): string => `Also builds, when the file lacks them: ${names.join(', ')}.`,
  order: 'Apply Theme first, so the sets can use your variables.',
  agent: "Waiting for the agent's build to finish.",
  current: (name: string, members: string): string => `${name}: ${members}. Sets already built stay.`,
  built: (n: number): string => `Built ${GROUPS_COPY.sets(n)}`,
  builtOf: (done: number, of: number): string => `Built ${done} of ${GROUPS_COPY.sets(of)}`,
  builtWithProblems: (n: number, problems: number): string => `Built ${GROUPS_COPY.sets(n)} · ${problems} with problems`,
  stopped: (done: number, of: number): string => `Stopped after ${done} of ${GROUPS_COPY.sets(of)}`,
  justNow: 'just now',
  showActivity: 'Show in Activity',
  builtOn: (names: readonly string[], page: string): string => `Built ${names.join(', ')} on ${GROUPS_COPY.page(page)}.`,
  problems: (name: string): string => `${name}: built with problems.`,
  failed: (name: string): string => `${name}: build failed.`,
  notBuilt: (names: readonly string[]): string => `Not built: ${names.join(', ')}.`,
} as const;

/** The verdict a run of several sets ends with: one headline and one line per page built, per set that failed or had
 *  problems, and for the sets a stop left unbuilt. `ok` only when every set built cleanly and none was left. */
export const runVerdict = (r: BuildRun, catalog: Catalog): { ok: boolean; headline: string; summary: string; lines: string[] } => {
  const name = (id: string): string => entryOf(catalog, id)?.name ?? id;
  const ok = r.results.filter((x) => x.result === 'ok');
  const left = r.ids.slice(r.results.length);
  const failed = r.results.filter((x) => x.result === 'failed').length;
  const issues = r.results.filter((x) => x.result === 'issues').length;
  const headline = left.length ? RUN_COPY.stopped(r.results.length, r.ids.length)
    : failed ? RUN_COPY.builtOf(r.ids.length - failed, r.ids.length)
      : issues ? RUN_COPY.builtWithProblems(r.ids.length, issues) : RUN_COPY.built(r.ids.length);
  const lines: string[] = [];
  const byPage = new Map<string, string[]>();
  for (const x of r.results) {
    if (x.result === 'failed') continue;
    const page = entryOf(catalog, x.id)?.page ?? '';
    byPage.set(page, [...(byPage.get(page) ?? []), name(x.id)]);
  }
  for (const [page, names] of byPage) lines.push(page ? RUN_COPY.builtOn(names, page) : `Built ${names.join(', ')}.`);
  for (const x of r.results) {
    if (x.result === 'failed') lines.push(RUN_COPY.failed(name(x.id)));
    else if (x.result === 'issues') lines.push(RUN_COPY.problems(name(x.id)));
  }
  if (left.length) lines.push(RUN_COPY.notBuilt(left.map(name)));
  return { ok: ok.length === r.ids.length, headline, summary: lines.join(' '), lines };
};
