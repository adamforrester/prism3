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
import type { Cause } from '../../../plugin/src/messages';
// The plugin's pure cause rules (#3326 PR 1 review N1): one merge and one set of phrases for every writer, so a
// rewording (PR 4) moves them all. `causes.ts` imports nothing at run time, so nothing of the plugin's main thread comes with it.
import { CAUSE_WHAT, mergeCauses } from '../../../plugin/src/causes';
import { entryOf, GROUPS_COPY } from './component-groups';

/** What started a run: the action bar's selection, or the Subcomponents section's "Build all" (call 10 A). */
export type RunKind = 'selection' | 'subcomponents';

/** `causes` (#3326): the set's own build verdict's causes, as the plugin sent them; absent when it sent none. */
export type RunResult = { readonly id: string; readonly result: SetBuild; readonly headline: string; readonly causes?: readonly Cause[] | null };

export type BuildRun = {
  readonly kind: RunKind;
  /** The sets, in the order they are built. */
  readonly ids: readonly string[];
  readonly results: readonly RunResult[];
  readonly stopping: boolean;
  readonly done: boolean;
};

/**
 * #3308: `ids` in the order the plugin can build them once each. A set's build first builds every set it nests that the
 * file lacks (#1633, `build-deps.ts`), deepest first, so a queued set that another queued set nests is built by the
 * first one's build and then again from the queue: the owner's first run built Checkbox.Row as Checkbox group's
 * dependency and then on its own, six "ALREADY PRESENT" misses in a set that read as "built with problems". Here each
 * set comes after every queued set it nests, directly or through a set the queue does not hold; otherwise the list's
 * order is kept (review N1 on #2812). A set listed twice runs once.
 */
export const depsFirst = (catalog: Catalog, ids: readonly string[]): string[] => {
  const want = new Set(ids);
  const done = new Set<string>();
  const out: string[] = [];
  const visit = (id: string, path: Set<string>): void => {
    if (done.has(id) || path.has(id)) return;
    path.add(id);
    for (const n of entryOf(catalog, id)?.nests ?? []) visit(n, path);
    path.delete(id);
    done.add(id);
    if (want.has(id)) out.push(id);
  };
  for (const id of ids) visit(id, new Set());
  return out;
};

/**
 * A run over `ids`, each after the queued sets it nests (`depsFirst`, #3308). `catalog` is required, not optional: an
 * optional one let the one call that applies the fix (`runSets` in `main.ts`) drop it with every gate green and bring the
 * double build back in list order (review S1 on #3320); required, `typecheck-web` holds that call.
 */
export const startRun = (kind: RunKind, ids: readonly string[], catalog: Catalog): BuildRun => {
  const order = depsFirst(catalog, ids);
  return { kind, ids: order, results: [], stopping: false, done: order.length === 0 };
};

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

/**
 * THE RUN'S CAUSES (#3326 PR 1, Q3326.1 A; #3308 Q3308.1 A): one per set that failed or had problems, carrying the
 * reasons its own build sent, so "Badge: built with problems." is no longer a line with no reason behind it. A set whose
 * build sent no cause still gets one, with no reasons, as the run's line names it; a cause from a set's build about
 * another set (one it nested) is kept as that set's. Then one for the sets a stop left unbuilt.
 */
export const runCauses = (r: BuildRun): Cause[] => {
  const out: Cause[] = [];
  const add = (c: Cause): void => { out.push(c); };
  for (const x of r.results) {
    if (x.result === 'ok') continue;
    const own = x.causes ?? [];
    if (!own.some((c) => c.subject === x.id)) add({ kind: x.result === 'failed' ? 'bad' : 'warn', subject: x.id, what: x.result === 'failed' ? CAUSE_WHAT.failed : CAUSE_WHAT.built, reasons: [] });
    for (const c of own) add(c);
  }
  // A stop is the person's: each set it left is not built, and is a cause of its own with no reason but the stop.
  for (const id of r.ids.slice(r.results.length)) add({ kind: 'warn', subject: id, what: CAUSE_WHAT.notBuilt, reasons: [] });
  return mergeCauses(out);
};

/** The verdict a run of several sets ends with: one headline and one line per page built, per set that failed or had
 *  problems, and for the sets a stop left unbuilt. `ok` only when every set built cleanly and none was left. */
export const runVerdict = (r: BuildRun, catalog: Catalog): { ok: boolean; headline: string; summary: string; lines: string[]; causes: Cause[] } => {
  const name = (id: string): string => entryOf(catalog, id)?.name ?? id;
  const ok = r.results.filter((x) => x.result === 'ok');
  const left = r.ids.slice(r.results.length);
  const failed = r.results.filter((x) => x.result === 'failed').length;
  const issues = r.results.filter((x) => x.result === 'issues').length;
  const headline = left.length ? RUN_COPY.stopped(r.results.length, r.ids.length)
    : failed ? RUN_COPY.builtOf(r.ids.length - failed, r.ids.length)
      // #3308: a warning, marked as a set's own "with problems" build is (`⚠`), so Activity counts a warning, not a failure.
      : issues ? `⚠ ${RUN_COPY.builtWithProblems(r.ids.length, issues)}` : RUN_COPY.built(r.ids.length);
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
  return { ok: ok.length === r.ids.length, headline, summary: lines.join(' '), lines, causes: runCauses(r) };
};
