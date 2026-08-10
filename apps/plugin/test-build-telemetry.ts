/**
 * Build-telemetry test — the #684 calibration readout.
 *
 *   npx tsx apps/plugin/test-build-telemetry.ts
 *
 * WHY THIS EXISTS SEPARATELY, and it is the same reason `test-apply-summary.ts` does: the timing itself
 * happens where the timers are (the executor's `chunkMs`, `main.ts`'s settle probe) and `main.ts` cannot be
 * imported — it calls `figma.showUI` at module scope. So the arithmetic and the phrasing were extracted to
 * `build-telemetry.ts`, which is pure, and this reaches them.
 *
 * WHAT IT CANNOT DO, stated first because the temptation is to read a green run as "the measurement works":
 * this cannot verify that any number is CORRECT. `chunkMs` comes from a real `Date.now()` around real
 * Figma work, and the settle lag comes from a real starved event loop; a harness has neither. What is
 * gated here is that the readings are folded up correctly and reported honestly — that the max is the max
 * and is attributed to the right chunk, that the member count is not silently the chunk count, that a
 * never-settling tail reports as unmeasured rather than as a plausible number, and that a build which
 * never yielded says so instead of printing an empty table. Each of those was a way to produce a
 * confident, wrong readout, which is worse than no instrument at all.
 */
import {
  phaseStats, summarize, chunkLine, summaryLines, settlePoint,
  FRAME_MS, SLOW_CHUNK_FRAMES, CALM_LAG_MS, CALM_TICKS,
} from './src/build-telemetry';
import type { ComponentProgress } from './src/write-components';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('plugin BUILD TELEMETRY (#684) — the calibration readout\n');

/** A phase's readings, from a hand-written ms list. `done` advances by the chunk size so `total` and the
 *  member count are DIFFERENT from the reading count — which is the confusion the assertions below are
 *  looking for. */
const phase = (name: 'build' | 'wire', msList: number[], chunk = 24): ComponentProgress[] =>
  msList.map((chunkMs, i) => ({ phase: name, done: (i + 1) * chunk, total: msList.length * chunk, chunkMs }));

// ---- the distribution: the MAX is what a chunk size turns on ---------------------------------
// A mean hides the number that matters. Figma drops a heartbeat on the worst chunk, not the average one,
// so a run whose mean is fine and whose max is 400ms must not read as healthy.
const spiky = phase('build', [10, 12, 11, 400, 13, 12, 11, 10, 12, 11]);
const s = phaseStats('build', spiky);
ok(s.maxMs === 400, `the maximum is reported, not smoothed away (max=${s.maxMs}, mean would be ${Math.round(s.totalMs / s.chunks)})`);
ok(s.worstAt === 4, `the worst chunk is located in RUN order, so an early spike is distinguishable from a late one (chunk ${s.worstAt})`);
ok(s.p50Ms <= 13 && s.p95Ms >= 13, `p50/p95 bracket the bulk without being dragged by the outlier (p50=${s.p50Ms}, p95=${s.p95Ms})`);
// p95 IS NEAREST-RANK CEILING, pinned to an exact value rather than a range. On these 10 samples `ceil`
// gives rank 10 — the 400ms outlier — and `floor` gives rank 9, which is 13ms. A `>= 13` bound passes both,
// so it does not gate the rounding at all; and the two differ on exactly the statistic the readout is built
// around, the NEAR-WORST. Getting it wrong hides the outlier from p95 while the max still reports it, which
// reads as one anomalous chunk rather than a distribution with a tail.
ok(s.p95Ms === 400, `p95 by nearest-rank CEILING keeps the near-worst in view — floor would report 13 (${s.p95Ms})`);
ok(s.minMs === 10, `the minimum is the real floor (${s.minMs})`);
ok(s.totalMs === spiky.reduce((a, p) => a + p.chunkMs, 0), `the total is the sum of the chunks (${s.totalMs}ms)`);

// MEMBERS ARE NOT CHUNKS. At CHUNK=24 over 240 members there are 10 readings; a summary that counted
// readings would report "10 members" and the whole calibration would be read against the wrong denominator.
ok(s.chunks === 10 && s.members === 240,
  `chunk count and member count are distinct quantities (${s.chunks} chunks over ${s.members} members)`);

// `worstAt` must survive a tie without pointing at the wrong chunk — first occurrence, in run order.
const tied = phaseStats('build', phase('build', [5, 99, 7, 99]));
ok(tied.worstAt === 2, `a tie attributes to the FIRST occurrence in run order, not the last (chunk ${tied.worstAt})`);

// A single chunk is the degenerate case: min = p50 = p95 = max, and the ordinal is 1 rather than 0.
const one = phaseStats('wire', phase('wire', [42]));
ok(one.minMs === 42 && one.p50Ms === 42 && one.p95Ms === 42 && one.maxMs === 42 && one.worstAt === 1,
  `a one-chunk phase reports that value at every percentile, at ordinal 1 (${one.p50Ms}ms, chunk ${one.worstAt})`);

// An empty phase must not throw and must not claim a zero-length run had a 0ms chunk — `Math.max()` of
// nothing is -Infinity, which would print as "-Infinityms".
const empty = phaseStats('build', []);
ok(empty.chunks === 0 && empty.members === 0 && Number.isFinite(empty.maxMs) && empty.maxMs === 0,
  `an empty phase folds to zeros rather than -Infinity (max=${empty.maxMs})`);

// ---- phases are split in RUN order, and discovered ------------------------------------------
const both = [...phase('build', [10, 20]), ...phase('wire', [30, 40])];
const split = summarize(both);
ok(split.length === 2 && split[0].phase === 'build' && split[1].phase === 'wire',
  `phases are reported in the order they ran (${split.map((x) => x.phase).join(' → ')})`);
ok(split[0].chunks === 2 && split[1].chunks === 2, 'each phase folds only its own readings');
// Discovered, not hardcoded: a third phase added to the executor shows up without editing the readout.
const three = summarize([...both, { phase: 'polish' as 'build', done: 1, total: 1, chunkMs: 5 }]);
ok(three.length === 3 && three[2].phase === 'polish',
  `a phase the readout has never heard of is reported anyway (${three.map((x) => x.phase).join(', ')})`);

// ---- the per-chunk line: readable, and flags the slow ones -----------------------------------
const fast = chunkLine({ phase: 'build', done: 24, total: 648, chunkMs: 12 });
const slow = chunkLine({ phase: 'build', done: 48, total: 648, chunkMs: FRAME_MS * SLOW_CHUNK_FRAMES + 1 });
ok(fast.includes('24/648') && fast.includes('12ms'), `a chunk line carries its fraction and its cost (${fast.trim()})`);
ok(!fast.includes('SLOW') && slow.includes('SLOW'),
  `only a chunk over ${FRAME_MS * SLOW_CHUNK_FRAMES}ms is flagged slow (${slow.trim()})`);
// The threshold is a > comparison, so a chunk exactly AT the budget is not flagged — asserted because an
// off-by-one here would flag every chunk on a file that happens to land on the boundary.
ok(!chunkLine({ phase: 'build', done: 1, total: 1, chunkMs: FRAME_MS * SLOW_CHUNK_FRAMES }).includes('SLOW'),
  `a chunk exactly at the budget is not flagged (${FRAME_MS * SLOW_CHUNK_FRAMES}ms)`);
ok(chunkLine({ phase: 'wire', done: 324, total: 648, chunkMs: 9 }).includes('50%'),
  'the percentage is computed from the fraction, so a designer can read progress without dividing');

// ---- the summary block ----------------------------------------------------------------------
const sum = summaryLines(both, 1234).join('\n');
ok(sum.includes('build:') && sum.includes('wire:'), 'the summary carries a row per phase');
ok(sum.includes('MAX 40ms') && sum.includes("worst single chunk: 40ms in 'wire'"),
  'the worst chunk ACROSS phases is stated once, plainly, rather than left to be picked out of the rows');
ok(sum.includes('1234ms') && sum.includes('settle'), 'the settle time is reported');
ok(sum.includes('chunking does not reduce'),
  'and is labelled as host time chunking cannot reduce, so a chunk-size change is not judged against it');

// A NEVER-SETTLING tail reports as unmeasured. The trap: printing the sample budget as if it were the
// answer, which understates a real stall and reads as a precise measurement.
const unmeasured = summaryLines(both, null).join('\n');
ok(unmeasured.includes('NOT MEASURED') && !/settle: \d/.test(unmeasured),
  'a tail that never settles reports NOT MEASURED rather than a plausible number');

// A SETTLE OF ZERO IS A MEASUREMENT, NOT AN ABSENCE — the case that separates `settleMs === null` from the
// shorter `!settleMs`, and it is reachable rather than theoretical: `settlePoint` returns 0 for an already
// idle file and the elapsed stamp at that first tick is genuinely 0ms sometimes. Under `!settleMs` an
// instant settle — the best possible outcome — prints as NOT MEASURED, so the calibration run would report
// "the probe did not report" for the one result that needs no further work.
const instant = summaryLines(both, 0).join('\n');
ok(instant.includes('settle: 0ms') && !instant.includes('NOT MEASURED'),
  `a settle of 0ms reports as measured, because an idle file settles instantly (${instant.split('\n').find((l) => l.includes('settle')) ?? 'no settle line'})`);

// A build with NO readings is the #684 defect itself, and must say so rather than print an empty table
// that reads as "nothing to report".
const none = summaryLines([], null).join('\n');
ok(none.includes('did not yield') && none.includes('#684'),
  'a build with no chunk reports names itself as the defect, not as an empty result');

// ---- the settle probe's arithmetic ----------------------------------------------------------
// The stall is the LAG on a setTimeout(0) chain: idle is ~1-4ms, a starved thread is hundreds. The settle
// point is where the lag returns to idle and STAYS there.
ok(settlePoint([900, 800, 700, 2, 1, 2, 1]) === 3,
  `the settle point is the first sample of the calm run, not the last loud one (${settlePoint([900, 800, 700, 2, 1, 2, 1])})`);
// CALM_TICKS consecutive, because reconciliation is bursty: one quiet tick between two long ones is a gap
// in the work, not the end of it. This is the assertion that would catch a 1-tick threshold.
ok(settlePoint([900, 1, 900, 1, 1, 1]) === 3,
  `a single quiet tick inside a burst does not count as settled (${settlePoint([900, 1, 900, 1, 1, 1])})`);
ok(settlePoint([900, 900, 900]) === -1, 'a tail that is still stalling when sampling stops returns -1, not a guess');
ok(settlePoint([]) === -1, 'no samples is unsettled, not settled at 0');
// An already-idle file settles immediately — the common case, and it must not cost the full budget.
ok(settlePoint([1, 1, 1, 1]) === 0, `an idle thread settles at the first sample (${settlePoint([1, 1, 1, 1])})`);
// The boundary is <=, so a lag exactly at the calm threshold counts as calm.
ok(settlePoint([CALM_LAG_MS, CALM_LAG_MS, CALM_LAG_MS]) === 0,
  `a lag exactly at the calm threshold is calm (${CALM_LAG_MS}ms)`);
ok(settlePoint([CALM_LAG_MS + 1, CALM_LAG_MS, CALM_LAG_MS, CALM_LAG_MS]) === 1,
  `and one millisecond over is not (${CALM_LAG_MS + 1}ms)`);

// The constants are pins with a stated basis, not derivations — same honesty as `CHUNK`. Loose bounds:
// they only catch a threshold left at 0 or set somewhere absurd.
ok(FRAME_MS === 16, `FRAME_MS is one frame at ~60fps (${FRAME_MS})`);
ok(SLOW_CHUNK_FRAMES > 1 && SLOW_CHUNK_FRAMES < 20, `SLOW_CHUNK_FRAMES is a plausible perceptual budget (${SLOW_CHUNK_FRAMES})`);
ok(CALM_LAG_MS > 0 && CALM_LAG_MS < FRAME_MS, `CALM_LAG_MS is inside one frame — idle, not merely better (${CALM_LAG_MS})`);
ok(CALM_TICKS >= 2, `CALM_TICKS requires more than one quiet sample (${CALM_TICKS})`);

console.log(`\nplugin BUILD TELEMETRY: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
