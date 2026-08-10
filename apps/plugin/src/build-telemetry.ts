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
  return {
    phase,
    chunks: reports.length,
    members: reports.length ? reports[reports.length - 1].done : 0,
    totalMs: ms.reduce((a, b) => a + b, 0),
    minMs: ms.length ? Math.min(...ms) : 0,
    p50Ms: pct(sorted, 50),
    p95Ms: pct(sorted, 95),
    maxMs,
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
