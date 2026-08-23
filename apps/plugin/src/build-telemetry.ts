/**
 * The component build's TELEMETRY — the readout for #684's calibration run.
 *
 * `ComponentProgress` carries `chunkMs` so a live run can settle the chunk size, and for one commit it
 * carried it nowhere: the value crossed the bridge, the adapter validated it, and nothing displayed or
 * logged it. A sensor with no readout is not an instrument. This is the readout.
 *
 * IT ANSWERS THE QUESTION THE CHUNK SIZE ACTUALLY TURNS ON, which is not the average. A chunk size is
 * wrong when a SINGLE chunk holds the thread too long — Figma drops a heartbeat on the worst chunk, not
 * the mean one — so the summary leads with the maximum and carries the distribution behind it. A mean of
 * 14ms with a 400ms outlier is a bad chunk size that reads as a good one.
 *
 * PURE — no `figma.*`, no DOM, no timers. It takes the readings and returns strings, so the whole of it
 * is reachable from `test-build-telemetry.ts`. The timing itself happens in the executor (`chunkMs`) and
 * the settle probe lives in `main.ts`, which is where the timers are; what is gateable is the arithmetic
 * and the phrasing, and that is what is here.
 */
import type { ComponentProgress } from './write-components';

/** One phase's distribution. `p50`/`p95` rather than a mean alone for the reason above — and `worstAt`
 *  names WHICH chunk was worst, because "the 3rd of 27" and "the 27th of 27" mean different things: an
 *  early spike is per-member cost, a late one is the set growing under the writes. */
export type PhaseStats = {
  phase: string;
  chunks: number;
  members: number;
  totalMs: number;
  minMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
  worstAt: number;
  /** Wall-clock for the phase, yields included — the last reading's `elapsedMs`. NOT `Σ chunkMs`, which is
   *  what `totalMs` is; the two differ by exactly the time spent yielding. */
  elapsedMs: number;
  /** `elapsedMs − totalMs`: what the yielding cost, which is the term that grows as `CHUNK` shrinks. The
   *  first calibration run could not report this at all, and it is the number a further reduction of
   *  `CHUNK` has to be argued against. */
  yieldMs: number;
};

/** Percentile by nearest-rank on a sorted copy — the plain definition, no interpolation. With 27 samples
 *  per phase, interpolating between neighbours would invent precision the millisecond clock does not
 *  have. `p95` of 27 samples is the 26th, which is the intent: the near-worst, not the worst. */
const pct = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
};

/**
 * Fold a phase's readings into its distribution.
 *
 * `members` is read off the LAST reading's `done` rather than counted from the readings, because those
 * are two different quantities and only one of them is the member count: at `CHUNK = 24` over 648 there
 * are 27 readings and 648 members. Counting readings would report the member total as 27.
 */
export const phaseStats = (phase: string, reports: ComponentProgress[]): PhaseStats => {
  const ms = reports.map((r) => r.chunkMs);
  const sorted = ms.slice().sort((a, b) => a - b);
  const maxMs = ms.length ? Math.max(...ms) : 0;
  const totalMs = ms.reduce((a, b) => a + b, 0);
  // From the LAST reading, because `elapsedMs` is cumulative from the phase's loop head — summing it would
  // count every chunk's elapsed time again at each subsequent boundary and report a wildly inflated phase.
  const elapsedMs = reports.length ? reports[reports.length - 1].elapsedMs : 0;
  return {
    phase,
    chunks: reports.length,
    members: reports.length ? reports[reports.length - 1].done : 0,
    totalMs,
    minMs: ms.length ? Math.min(...ms) : 0,
    p50Ms: pct(sorted, 50),
    p95Ms: pct(sorted, 95),
    maxMs,
    elapsedMs,
    // Clamped at 0. `elapsedMs` and `totalMs` come from the same clock so the difference cannot be
    // meaningfully negative, but a millisecond clock plus the deliberate off-by-one in `elapsedMs` (it is
    // stamped before the phase's last yield) can put it at -1 on a phase that yielded for ~0ms. Reporting
    // "yields: -1ms" would read as a broken instrument rather than as the zero it is.
    yieldMs: Math.max(0, elapsedMs - totalMs),
    // `indexOf` on the UNSORTED list, +1 for a human ordinal — the sorted copy has lost the order that
    // makes this number mean anything.
    worstAt: ms.length ? ms.indexOf(maxMs) + 1 : 0,
  };
};

/** Split the run's readings by phase, in the order the phases actually ran rather than a hardcoded pair —
 *  a third phase added later shows up without editing this. */
export const summarize = (reports: ComponentProgress[]): PhaseStats[] => {
  const order: string[] = [];
  for (const r of reports) if (!order.includes(r.phase)) order.push(r.phase);
  return order.map((p) => phaseStats(p, reports.filter((r) => r.phase === p)));
};

/**
 * The frame budget a chunk is aiming at, and the basis for calling one too long.
 *
 * 16ms is one frame at ~60fps. A chunk that runs longer than this has, by definition, cost Figma at least
 * one frame — which is not automatically a problem (a build is not an animation), so this is the threshold
 * for a REMARK, not a failure. What the run is looking for is whether the worst chunk is in the tens of ms
 * or the hundreds. Nothing here fails a build; the numbers are for a human to read.
 */
export const FRAME_MS = 16;

/** How many frames' worth of work a chunk is allowed before the readout calls it out. 4 frames ≈ 66ms is
 *  where a designer starts to perceive the UI as stalling rather than merely dropping frames, and it is
 *  comfortably inside the ~1s scale at which Figma's own sockets showed distress. Deliberately a round
 *  number with a stated basis rather than a tuned one — see `CHUNK`, same honesty. */
export const SLOW_CHUNK_FRAMES = 4;

const ms = (n: number): string => `${Math.round(n)}ms`;

/**
 * The per-chunk line, logged as the build runs so a freeze is attributable while it is happening.
 *
 * Logged EVERY chunk rather than only the slow ones. A log that prints only outliers cannot show that the
 * loop was progressing steadily and then stopped — and "the last line before the freeze" is the single
 * most useful fact in a hang report. 54 lines for a 648 build is a readable console.
 */
export const chunkLine = (p: ComponentProgress): string => {
  const slow = p.chunkMs > FRAME_MS * SLOW_CHUNK_FRAMES ? '  ⚠ SLOW' : '';
  const pctDone = Math.round((p.done / Math.max(1, p.total)) * 100);
  return `[prism3 #684] ${p.phase.padEnd(5)} ${String(p.done).padStart(4)}/${p.total} (${String(pctDone).padStart(3)}%)  ${ms(p.chunkMs).padStart(7)}${slow}`;
};

/**
 * The end-of-run summary — the block to paste back.
 *
 * `settleMs` is the measured post-completion stall (see the settle probe in `main.ts`), and it is
 * SEPARATE from the phase totals on purpose: it is time the host spends after the executor has returned,
 * reconciling a scenegraph that just grew by thousands of nodes. Chunking cannot reduce it, which is
 * exactly why it has to be measured rather than folded into a total that chunking does move — otherwise a
 * chunk-size change would appear to help a number it has no effect on. `null` means the probe did not
 * report, which is itself worth printing rather than showing a zero.
 */
export const summaryLines = (reports: ComponentProgress[], settleMs: number | null): string[] => {
  const stats = summarize(reports);
  const out: string[] = ['[prism3 #684] ── build telemetry ─────────────────────────────'];
  if (stats.length === 0) {
    // A build with no readings at all is the regression this whole issue is about, so it says so rather
    // than printing an empty table that reads as "nothing to report".
    out.push('[prism3 #684] NO chunk reports — the build did not yield. This is the #684 defect itself.');
  }
  for (const s of stats) {
    out.push(
      `[prism3 #684] ${s.phase}: ${s.chunks} chunks over ${s.members} members — ` +
        `total ${ms(s.totalMs)}, min ${ms(s.minMs)}, p50 ${ms(s.p50Ms)}, p95 ${ms(s.p95Ms)}, ` +
        `MAX ${ms(s.maxMs)} (chunk ${s.worstAt} of ${s.chunks})`,
    );
    // The per-member cost and the yield overhead, on their own line so the row above stays the
    // distribution. Per-member is the figure `CHUNK` is derived from — `CHUNK × perMember` IS the expected
    // worst chunk — and it is the one number that transfers to a different set size, which a total does
    // not. `yields` is what a smaller `CHUNK` buys the stall reduction with.
    const perMember = s.members ? s.totalMs / s.members : 0;
    out.push(
      `[prism3 #684] ${s.phase}: ${perMember.toFixed(1)}ms per member — ` +
        `elapsed ${ms(s.elapsedMs)} wall-clock, of which yields ${ms(s.yieldMs)} ` +
        `(${s.chunks} yields ≈ ${(s.chunks ? s.yieldMs / s.chunks : 0).toFixed(1)}ms each)`,
    );
  }
  // The worst chunk ACROSS phases is the number the chunk size turns on, so it is stated once, plainly,
  // rather than left to be picked out of the per-phase rows.
  const worst = stats.reduce<PhaseStats | null>((w, s) => (!w || s.maxMs > w.maxMs ? s : w), null);
  if (worst) {
    const frames = worst.maxMs / FRAME_MS;
    out.push(
      `[prism3 #684] worst single chunk: ${ms(worst.maxMs)} in '${worst.phase}' ≈ ${frames.toFixed(1)} frames ` +
        `(target ≤ ${SLOW_CHUNK_FRAMES}; CHUNK is the knob)`,
    );
    // WHETHER THE KNOB CAN EVEN REACH THE TARGET, which the line above implies it can and the 2026-08-10 run
    // proved it cannot: at ~162ms per member on a cold build, CHUNK = 1 is still ~10 frames. Saying "CHUNK is
    // the knob" and nothing else invites the next reader to keep turning a knob that has already run out of
    // travel — or worse, to raise SLOW_CHUNK_FRAMES until the report agrees with the build.
    const floorMs = worst.members ? worst.totalMs / worst.members : 0;
    if (floorMs > FRAME_MS * SLOW_CHUNK_FRAMES)
      out.push(
        `[prism3 #684] ⚠ the target is UNREACHABLE by CHUNK alone: one '${worst.phase}' member costs ` +
          `${floorMs.toFixed(1)}ms, so CHUNK=1 is still ≈ ${(floorMs / FRAME_MS).toFixed(1)} frames. ` +
          'Per-member cost is the lever, not chunk size.',
      );
  }
  out.push(
    settleMs === null
      ? '[prism3 #684] post-completion settle: NOT MEASURED (the probe did not report)'
      : `[prism3 #684] post-completion settle: ${ms(settleMs)} — host stall AFTER the executor returned, ` +
        'which chunking does not reduce',
  );
  out.push('[prism3 #684] ──────────────────────────────────────────────────────');
  return out;
};

/**
 * The settle probe's verdict, given the lag samples it collected.
 *
 * HOW THIS MEASURES A HANG WITHOUT A STOPWATCH: after the last write, `main.ts` schedules a chain of
 * `setTimeout(_, 0)` and records how late each one actually fires. A `setTimeout(0)` on an idle main
 * thread fires in ~1-4ms; one scheduled while Figma is reconciling a scenegraph that grew by thousands of
 * nodes fires when the thread is free again, which may be hundreds of ms. So the LAG is the stall, sampled
 * directly, and the settle point is where the lag returns to idle levels.
 *
 * `settled` requires `CALM_TICKS` consecutive quiet samples rather than one, because reconciliation is
 * bursty: a single quiet tick between two long ones is a gap in the work, not the end of it.
 */
export const CALM_LAG_MS = 8;
export const CALM_TICKS = 3;

/** Index of the first sample that begins a calm run, or -1 if the tail never settles. The settle TIME is
 *  the elapsed clock at that sample, which the caller holds — this function only finds the point, so it
 *  stays pure and testable against a hand-written sample list. */
export const settlePoint = (lags: number[]): number => {
  let calm = 0;
  for (let i = 0; i < lags.length; i++) {
    if (lags[i] <= CALM_LAG_MS) {
      calm++;
      if (calm >= CALM_TICKS) return i - (CALM_TICKS - 1);
    } else {
      calm = 0;
    }
  }
  return -1;
};

/**
 * Measure the POST-COMPLETION SETTLE — how long the host stays stalled after the executor has returned
 * (#684). The 1m10s freeze the issue records happened *after* the pill said done, so it is not in any
 * phase total and no amount of chunking removes it: Figma is reconciling a scenegraph that just grew by
 * thousands of nodes.
 *
 * Schedule a chain of `setTimeout(_, 0)` and record how late each one actually fires — see `settlePoint`
 * above for why the lag *is* the stall. Returns `null` if the tail never settles inside the sample budget,
 * reported as NOT MEASURED rather than as a number, because a run that is still stalling when sampling
 * stops has not produced a settle time and printing the budget as one would understate it.
 *
 * **THE BUDGET IS IN TICKS, AND ITS WALL-CLOCK COST SCALES WITH HOW BUSY THE HOST IS.** This is the
 * mechanism behind #908 and it is worth stating in the unit a reader will ask about. Measured at
 * `MAX_TICKS = 400`, with the shipped `CALM_LAG_MS = 8`:
 *
 *   | host work per tick | ticks used | wall clock | returns              |
 *   |--------------------|------------|------------|----------------------|
 *   | idle               |          3 |        3ms | 1ms                  |
 *   | 5ms                |          3 |       18ms | 6ms                  |
 *   | 10ms               |        400 |     4399ms | null (NOT MEASURED)  |
 *   | 20ms               |        400 |     8399ms | null (NOT MEASURED)  |
 *   | 50ms               |        400 |    20400ms | null (NOT MEASURED)  |
 *   | 100ms              |        400 |    40331ms | null (NOT MEASURED)  |
 *
 * Two things follow, and #908 was filed knowing only the first. **The 8.4s it reports is one point on a
 * line, not a ceiling** — the same probe costs 40s on a host four times busier, which is past the point
 * where a delay and a permanent hang are the same event to a designer. And **the transition is a cliff,
 * not a slope**: 5ms of work per tick settles in three ticks because the lag lands under `CALM_LAG_MS`,
 * and 10ms never settles at all. 18ms against 4399ms, for a doubling of host load.
 *
 * **WHY THE BUDGET IS NOT IN WALL CLOCK, WHICH IS THE FIX #908 PROPOSES AND MEASUREMENT REFUTES.** A
 * ~500ms wall bound looks like the obvious cap and is wrong twice over. It would disable the instrument
 * for exactly the case it was built for: a single solid 2s freeze is measured correctly today (2003ms, in
 * four ticks — one loud tick then a calm run), and under a 500ms bound it returns `null`. And it would not
 * even cap the wall clock, because a wall check can only run *between* ticks and a solid stall holds the
 * thread *inside* one — the same freeze took 2001ms to give up. Any bound that admits the 1m10s freeze
 * this probe exists to measure is necessarily larger than the delay #908 is about, so the delay had to be
 * removed by ORDERING (see `verdictBeforeSettle`) rather than by shrinking the budget.
 *
 * `maxTicks` is a parameter only so the tests can pin the tick-budget behaviour without burning the full
 * 400; every caller takes the default.
 */
export const MAX_TICKS = 400;
export const measureSettle = async (maxTicks: number = MAX_TICKS): Promise<number | null> => {
  const t0 = Date.now();
  const lags: number[] = [];
  const stamps: number[] = [];
  for (let i = 0; i < maxTicks; i++) {
    const before = Date.now();
    await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
    const now = Date.now();
    lags.push(now - before);
    stamps.push(now - t0);
    // Stop as soon as it HAS settled rather than always sampling the full budget — `settlePoint` returns
    // the index that begins the calm run, so re-checking each tick costs a scan of a short array and saves
    // hundreds of pointless ticks on a healthy build.
    const at = settlePoint(lags);
    if (at >= 0) return stamps[at];
  }
  return null;
};

/**
 * Run the settle probe WITHOUT the designer's verdict waiting on it (#908).
 *
 * THE DEFECT THIS REMOVES: the probe was awaited before `component-result` was posted, so on a host busy
 * enough to matter the panel held `⋯ Building…` for the whole tick budget — 8.4s at 20ms of work per tick,
 * 40s at 100ms — and then reported a verdict alongside a settle figure of `null`. The designer's verdict
 * was delayed by a diagnostic, and by a diagnostic that had failed. #870's argument is what makes that
 * more than a slow build: the verdict line is the ONLY place a build's misses are reported, and an 8.4s
 * hang is indistinguishable from the permanent one #870 fixed to anyone who has already looked away.
 *
 * THE ORDER IS THE WHOLE POINT, so it is a named function with a test rather than three lines inline:
 *
 *   1. the probe STARTS FIRST, before `postVerdict` runs. This is not cosmetic — the probe measures the
 *      stall beginning at the executor's return, so starting it after the post would move what it
 *      measures. Nothing between its start and the post may await.
 *   2. `postVerdict` is called and NOT awaited against the probe, so the pill updates immediately.
 *   3. the probe's result is returned for the caller to await, and is consumed only by the console
 *      telemetry block.
 *
 * WHY THE COUPLING #684's COMMENT DEFENDED SURVIVES INTACT. That comment kept the await first so "the
 * pill's verdict and the console's settle figure describe the same run". They still do: the probe is
 * still this build's, started at the same instant, and the telemetry block still carries its number. What
 * changed is only who waits. The pill never showed the settle figure in the first place — `summary` is
 * built from the executor's counts and has never carried it — so nothing a designer reads was coupled to
 * the probe at all.
 *
 * WHY IT IS TESTABLE AT ALL, and this is the reason for the seam rather than a preference: `main.ts`
 * calls `figma.showUI` at module scope and cannot be imported, which is the same constraint that put the
 * rest of this file here. Passing the probe in means a test can supply one that NEVER RESOLVES — the
 * busy host taken to its limit — and assert the verdict still went out. Re-inlining this as
 * `const settleMs = await probe(); postVerdict();` restores #908 exactly, and that test is what fails.
 * Do not "simplify" the unawaited promise: it is the fix.
 */
export const verdictBeforeSettle = async (
  probe: () => Promise<number | null>,
  postVerdict: () => void,
): Promise<number | null> => {
  const settle = probe();
  postVerdict();
  return settle;
};
