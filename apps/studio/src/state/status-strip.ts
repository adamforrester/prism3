/**
 * THE STATUS STRIP (#3170 part 2; the owner's decisions Q3170.1–6, all A, 2026-10-30): one line at the panel's foot that
 * says what a long run is doing while the main thread writes.
 *
 * WHAT IT CAN HONESTLY SAY. The panel hears something new only when the main thread posts to it, and the main thread posts
 * only at the boundaries its writes hand the thread back at (`run-progress`, `apps/plugin/src/main.ts`). So the strip
 * shows the write's own count and nothing it would have to guess:
 *   - the read after open: "Reading this file…", indeterminate until the first page, then page n of N (Q3170.1 A);
 *   - Update file's run: the step running, and for the in-place update the set being written and n of N, for Apply
 *     Theme the stage and n of 7, a bar filled by sets (or stages) done, never by time, and the elapsed time from the
 *     panel's own clock (Q3170.2 A). While the update checks the file before its first write (#3177: whole-file searches
 *     that do not yet yield), it says it is checking, with no count and no fill;
 *   - "Still working on <set>" after `SILENCE_MS` with no reading. It claims only that the panel has not heard from the
 *     run since;
 *   - "Stop after <set>" (Q3170.4 A): the run finishes the set it is on and stops at the boundary;
 *   - when the run ends, the verdict line, which stays until the next action (Q3170.6 A). Details stay in Activity;
 *   - #3189: an agent's Capture baseline or Adopt, which the panel never starts: the command's own Activity words, the
 *     def it has reached and n of N, a bar by defs done, indeterminate while it reads the file. No Stop and no clock:
 *     the panel holds no run of its own to stop or time. Cleared when the agent's command ends (`agent-finished`).
 * No time remaining and no percent inside a set: set costs vary by 10× and more, and a set's member writes are not counted.
 *
 * Pure: `main.ts` holds the run and the readings and calls `stripView` with the clock; `shell/status-strip.ts` draws it.
 * Every string is a DRAFT under the voice standard (`docs/voice-standard.md`), in `STRIP_COPY`.
 */
import type { StepKey } from './update-file';

/** How long the panel waits, hearing nothing from the run, before it says it is still working (Q3170.5 A). */
export const SILENCE_MS = 3000;

/** One reading of the run, as `run-progress` carries it (`write-adapter.ts`). */
export type RunReading = {
  readonly run: 'update' | 'apply-theme';
  readonly phase: 'check' | 'work' | 'finish';
  readonly item: string | null;
  readonly done: number;
  readonly total: number;
};

/** The run as the strip follows it: when it started, when the panel last heard from it, the step's last reading, the
 *  update's sets in the order it wrote them, and its count once its step has ended. */
export type StripRun = {
  readonly startedAt: number;
  readonly heardAt: number;
  readonly reading: RunReading | null;
  readonly seen: readonly string[];
  readonly updated: { readonly done: number; readonly total: number; readonly finished: boolean } | null;
};

export const startStripRun = (now: number): StripRun => ({ startedAt: now, heardAt: now, reading: null, seen: [], updated: null });

/** The run after a reading from it. An update's `work` reading names the set it starts, so the set before it is done. */
export const withReading = (r: StripRun, m: RunReading, now: number): StripRun => ({
  ...r, heardAt: now, reading: m,
  seen: m.run === 'update' && m.phase === 'work' && m.item && !r.seen.includes(m.item) ? [...r.seen, m.item] : r.seen,
});

/** The run after it was heard from without a reading of its own (a build's or a style guide's progress, a step's start). */
export const heard = (r: StripRun, now: number): StripRun => ({ ...r, heardAt: now });

/** The run as a step ends and the next starts: the update's count is kept for the verdict, the step's reading goes. */
export const stepEnded = (r: StripRun, now: number): StripRun => ({
  ...r, heardAt: now, reading: null,
  updated: r.reading?.run === 'update' ? { done: r.reading.done, total: r.reading.total, finished: r.reading.phase === 'finish' } : r.updated,
});

/** A checklist row's state during the run (Q3170.2 A): Updating while its set is the one being written, Updated once
 *  the update has moved past it or finished; null for a set it has not reached (it stays Due). */
export const rowState = (r: StripRun | null, id: string): 'updating' | 'updated' | null => {
  if (!r || !r.seen.includes(id)) return null;
  const now = r.reading?.run === 'update' ? r.reading : null;
  return now && now.phase === 'work' && now.item === id ? 'updating' : 'updated';
};

/** #3189: an agent's Capture baseline (`capture`) or Adopt (`adopt`), its last reading, or null when none runs. */
export type StripAgent = { readonly run: 'capture' | 'adopt'; readonly phase: 'check' | 'work' | 'finish'; readonly done: number; readonly total: number } | null;

/** What `agentHeard` reads of a message from the host: its kind, and a reading's fields when it carries one. */
export type StripAgentHears = { readonly kind: string; readonly run?: unknown; readonly phase?: unknown; readonly done?: unknown; readonly total?: unknown };

/**
 * #3189: the agent's run after `m`. A `capture` or `adopt` reading becomes the run; `agent-finished`, posted once each
 * agent command ends, failed ones included (`agent-dispatch.ts`), clears it, so the strip never sits on a run that ended.
 * Anything else leaves it as it was (the same object, so the caller can tell nothing moved).
 */
export const agentHeard = (agent: StripAgent, m: StripAgentHears): StripAgent => {
  if (m.kind === 'run-progress' && (m.run === 'capture' || m.run === 'adopt') && (m.phase === 'check' || m.phase === 'work' || m.phase === 'finish') && typeof m.done === 'number' && typeof m.total === 'number')
    return { run: m.run, phase: m.phase, done: m.done, total: m.total };
  if (m.kind === 'agent-finished') return null;
  return agent;
};

/** The read after open (Q3170.1 A): `done` of `total` pages, or null when no read is going. */
export type StripRead = { readonly done: number; readonly total: number } | null;

/** The verdict line (Q3170.6 A), kept until the next action. */
export type StripVerdict = { readonly tone: 'ok' | 'warn' | 'bad'; readonly what: string; readonly n: string; readonly sub: string };

/** What the strip draws. `fill` is 0–1, or null for an indeterminate bar. */
export type StripView =
  | { readonly kind: 'idle' }
  | { readonly kind: 'reading'; readonly what: string; readonly n: string | null; readonly fill: number | null; readonly sub: string }
  | { readonly kind: 'running'; readonly what: string; readonly n: string; readonly fill: number | null; readonly still: string | null;
      readonly stop: { readonly label: string; readonly disabled: boolean } }
  | { readonly kind: 'verdict'; readonly tone: 'ok' | 'warn' | 'bad'; readonly what: string; readonly n: string; readonly sub: string };

/** Apply Theme's seven write stages, by the key the host sends (`APPLY_STAGES` in `apps/plugin/src/apply-theme.ts`). */
export type ApplyStageKey = 'float' | 'color' | 'styles' | 'grid' | 'type-vars' | 'text-styles' | 'motion';

const sets = (n: number): string => `${n} set${n === 1 ? '' : 's'}`;

/** The strip's words, DRAFT placeholders until the owner words them (the voice standard: the system as subject, numbers
 *  inline, no figure of speech). */
export const STRIP_COPY = {
  reading: 'Reading this file…',
  pages: (n: number, of: number): string => `page ${n} of ${of}`,
  readingSub: 'The panel works meanwhile. Counts may still change.',
  /** The update's dry run before its first write, which does not report a count yet (#3177). */
  checking: (n: number): string => `Checking ${sets(n)} before writing`,
  updating: (name: string): string => `Updating ${name}`,
  finishing: 'Finishing the update',
  themeChecking: 'Checking the file before writing the theme',
  stage: {
    float: 'Writing size and layout variables', color: 'Writing color variables', styles: 'Writing effect and gradient styles',
    grid: 'Writing grid styles', 'type-vars': 'Writing type variables', 'text-styles': 'Writing text styles', motion: 'Writing motion variables',
  } as Record<ApplyStageKey, string>,
  /** The short name of a stage, for "Still working on" and "Stop after". */
  stageName: {
    float: 'size and layout variables', color: 'color variables', styles: 'effect and gradient styles', grid: 'grid styles',
    'type-vars': 'type variables', 'text-styles': 'text styles', motion: 'motion variables',
  } as Record<ApplyStageKey, string>,
  step: { setup: 'Setting up the file', theme: 'Applying the theme', update: 'Updating sets in place', sets: 'Adding sets', guides: 'Drawing the style guides' } as Record<StepKey, string>,
  adding: (name: string): string => `Adding ${name}`,
  /** Each step's name after "Stop after", "Stopped after" and "Stopped at". */
  stopName: { setup: 'Set up file', theme: 'Theme', update: 'the update', sets: 'To add', guides: 'Style guides' } as Record<StepKey, string>,
  theCheck: 'the check',
  of: (n: number, of: number): string => `${n} of ${of}`,
  still: (what: string): string => `Still working on ${what}`,
  stopAfter: (what: string): string => `Stop after ${what}`,
  stopping: (what: string): string => `Stopping after ${what}…`,
  /** Each step's words once it is done, for the verdict line. */
  done: { setup: 'File set up', theme: 'Theme applied', sets: 'Sets added', guides: 'Style guides drawn' } as Record<Exclude<StepKey, 'update'>, string>,
  updated: (n: number): string => `${sets(n)} updated`,
  fileUpdated: 'File updated',
  stoppedAfter: (what: string): string => `Stopped after ${what}`,
  stoppedAt: (what: string): string => `Stopped at ${what}`,
  updatedOf: (n: number, of: number): string => `${n} of ${of} updated`,
  kept: (n: number, rest: number): string => `${n === 1 ? 'The 1 set updated keeps its changes' : `The ${n} sets updated keep their changes`}; the other ${rest} ${rest === 1 ? 'is' : 'are'} unchanged.`,
  details: 'Details in Activity.',
  /** #3189: an agent's Capture baseline and Adopt, in the words Activity already gives them (Q114 A). These two and
   *  `agentSub` are the owner's, approved as worded (Q3210.2 A), not DRAFT. */
  agentRun: { capture: 'Recording the sets as built…', adopt: 'Adopting members…' } as Record<'capture' | 'adopt', string>,
  /** #3189: the line under an agent's run. */
  agentSub: 'An agent runs this. Details in Activity.',
  /** The writing controls' reason while a run is out (Q3170.3 A), on hover. */
  busy: 'Update is running',
} as const;

/** The panel's clock, m:ss. */
export const elapsed = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const stageKey = (x: string | null): ApplyStageKey | null => (x && Object.prototype.hasOwnProperty.call(STRIP_COPY.stage, x) ? x as ApplyStageKey : null);

/** What the run is on, as Update file's run and the build queue hold it. */
export type StripStep = {
  readonly step: StepKey;
  /** The run is stopping after this step (or, in the update, after this set). */
  readonly stopping: boolean;
  /** The build queue's set being added and its place, for the `sets` step. */
  readonly queue: { readonly id: string; readonly at: number; readonly of: number } | null;
};

/** The strip, from what the panel holds now. Running wins over an agent's run (#3189), which wins over the read after
 *  open, which wins over a verdict. */
export const stripView = (x: {
  readonly read: StripRead;
  /** #3189: an agent's Capture baseline or Adopt. Absent is none. */
  readonly agent?: StripAgent;
  readonly run: StripRun | null;
  readonly step: StripStep | null;
  readonly verdict: StripVerdict | null;
  readonly now: number;
  /** A set's name as Components names it. */
  readonly nameOf: (id: string) => string;
}): StripView => {
  const { run, step } = x;
  if (run && step) {
    const r = run.reading;
    const clock = elapsed(x.now - run.startedAt);
    let what: string = STRIP_COPY.step[step.step];
    let count: string | null = null;
    let fill: number | null = null;
    let on: string = STRIP_COPY.stopName[step.step];
    // What Stop finishes first: the set in the update and the build queue, which stop at a set boundary; else the whole
    // step (Apply Theme is never stopped between its stages: a theme half written is not one the file can use).
    let stopOn: string = on;
    if (step.step === 'update' && r?.run === 'update') {
      if (r.phase === 'check') { what = STRIP_COPY.checking(r.total); on = STRIP_COPY.theCheck; stopOn = on; }
      else if (r.phase === 'work' && r.item) {
        const name = x.nameOf(r.item);
        what = STRIP_COPY.updating(name);
        on = name;
        stopOn = name;
        count = STRIP_COPY.of(r.done + 1, r.total);
        fill = r.total ? r.done / r.total : null;
      } else if (r.phase === 'finish') { what = STRIP_COPY.finishing; count = STRIP_COPY.of(r.done, r.total); fill = 1; }
    } else if (step.step === 'theme' && r?.run === 'apply-theme') {
      const k = stageKey(r.item);
      if (r.phase === 'check' || !k) what = STRIP_COPY.themeChecking;
      else { what = STRIP_COPY.stage[k]; on = STRIP_COPY.stageName[k]; count = STRIP_COPY.of(r.done + 1, r.total); fill = r.total ? r.done / r.total : null; }
    } else if (step.step === 'sets' && step.queue) {
      const name = x.nameOf(step.queue.id);
      what = STRIP_COPY.adding(name);
      on = name;
      stopOn = name;
      count = STRIP_COPY.of(step.queue.at, step.queue.of);
      fill = step.queue.of ? (step.queue.at - 1) / step.queue.of : null;
    }
    const still = x.now - run.heardAt >= SILENCE_MS ? STRIP_COPY.still(on) : null;
    return { kind: 'running', what, n: count ? `${count} · ${clock}` : clock, fill, still,
      stop: { label: step.stopping ? STRIP_COPY.stopping(stopOn) : STRIP_COPY.stopAfter(stopOn), disabled: step.stopping } };
  }
  if (x.agent) {
    const { run: kind, phase, done, total } = x.agent;
    const n = phase === 'work' ? STRIP_COPY.of(Math.min(done + 1, total), total) : phase === 'finish' ? STRIP_COPY.of(done, total) : null;
    const fill = phase === 'finish' ? 1 : phase === 'work' && total ? done / total : null;
    return { kind: 'reading', what: STRIP_COPY.agentRun[kind], n, fill, sub: STRIP_COPY.agentSub };
  }
  if (x.read) {
    const { done, total } = x.read;
    return { kind: 'reading', what: STRIP_COPY.reading, n: done > 0 ? STRIP_COPY.pages(done, total) : null, fill: done > 0 && total ? done / total : null, sub: STRIP_COPY.readingSub };
  }
  if (x.verdict) return { kind: 'verdict', ...x.verdict };
  return { kind: 'idle' };
};

/** One step's result, as Update file's run records it (`StepResult`). */
type Result = { readonly step: StepKey; readonly ok: boolean; readonly headline: string };

/** The verdict line once Update file's run has ended (Q3170.6 A). `stopped`: the person asked it to stop. The update's
 *  count is the run's (`StripRun.updated`): a reading of `finish` with fewer sets done than ticked is the host's stop at a
 *  set boundary, never an error, which posts no `finish`. */
export const stripVerdict = (x: {
  readonly results: readonly Result[];
  readonly steps: readonly StepKey[];
  readonly stopped: boolean;
  readonly run: StripRun;
  readonly now: number;
  readonly nameOf: (id: string) => string;
}): StripVerdict => {
  const clock = elapsed(x.now - x.run.startedAt);
  const failed = x.results.find((r) => !r.ok);
  const u = x.results.some((r) => r.step === 'update') ? x.run.updated : null;
  const halted = !!u && u.finished && u.done < u.total;
  const last = x.results[x.results.length - 1];
  const stepName = (k: StepKey): string => STRIP_COPY.stopName[k];
  const kept = (n: number, of: number): string => (n ? `${STRIP_COPY.kept(n, of - n)} ` : '');
  // The stop the person asked for: after the set the update finished last, or after the step that ran last.
  const short = x.results.length < x.steps.length || halted;
  if (x.stopped && short && (!failed || (failed.step === 'update' && halted))) {
    // Inside the update when it stopped short of its last set; else after the step that ran last.
    const inside = u && last?.step === 'update' && halted;
    const after = inside ? (u.done ? x.nameOf(x.run.seen[u.done - 1]) : STRIP_COPY.theCheck) : last ? stepName(last.step) : STRIP_COPY.theCheck;
    return { tone: 'warn', what: STRIP_COPY.stoppedAfter(after), n: u ? STRIP_COPY.updatedOf(u.done, u.total) : clock, sub: `${inside ? kept(u.done, u.total) : ''}${STRIP_COPY.details}` };
  }
  if (failed) {
    // Where it stopped: the set the update was writing, else the step.
    const at = failed.step === 'update' && u && x.run.seen[u.done] ? x.nameOf(x.run.seen[u.done]) : stepName(failed.step);
    return { tone: 'bad', what: STRIP_COPY.stoppedAt(at), n: u ? STRIP_COPY.updatedOf(u.done, u.total) : clock,
      sub: `${failed.headline.replace(/^[✓✗⚠]\s*/, '')}. ${u ? kept(u.done, u.total) : ''}${STRIP_COPY.details}` };
  }
  const words = x.results.map((r) => (r.step === 'update' ? STRIP_COPY.updated(u?.done ?? 0) : STRIP_COPY.done[r.step]));
  return { tone: 'ok', what: words.length === 1 ? words[0] : STRIP_COPY.fileUpdated, n: clock, sub: `${words.length > 1 ? `${words.join(', ')}. ` : ''}${STRIP_COPY.details}` };
};
