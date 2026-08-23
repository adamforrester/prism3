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
  phaseStats, summarize, chunkLine, summaryLines, settlePoint, measureSettle, verdictBeforeSettle,
  FRAME_MS, SLOW_CHUNK_FRAMES, CALM_LAG_MS, CALM_TICKS, MAX_TICKS,
} from './src/build-telemetry';
import type { ComponentProgress } from './src/write-components';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('plugin BUILD TELEMETRY (#684) — the calibration readout\n');

/** One reading. `elapsedMs` defaults to `chunkMs` — a single chunk that yielded for 0ms, the honest value
 *  for a one-off literal rather than a placeholder that would make `yieldMs` negative. */
const rd = (ph: 'build' | 'wire', done: number, total: number, chunkMs: number, elapsedMs = chunkMs): ComponentProgress =>
  ({ phase: ph, done, total, chunkMs, elapsedMs });

/** A phase's readings, from a hand-written ms list. `done` advances by the chunk size so `total` and the
 *  member count are DIFFERENT from the reading count — which is the confusion the assertions below are
 *  looking for.
 *
 *  `elapsedMs` is built CUMULATIVELY, with `yieldEach` ms of yield charged per boundary — the shape the
 *  executor actually produces (see `ComponentProgress`), so `elapsedMs − Σ chunkMs` is the yield total.
 *  Default 0 keeps every pre-existing assertion reading a phase that yielded instantly. */
const phase = (name: 'build' | 'wire', msList: number[], chunk = 24, yieldEach = 0): ComponentProgress[] => {
  let elapsed = 0;
  return msList.map((chunkMs, i) => {
    // The chunk's own cost lands BEFORE its report and the yield AFTER it, which is why the yield of the
    // i-th boundary is added on the (i+1)-th reading and the last one is never counted — the deliberate
    // off-by-one `elapsedMs` documents. A helper that folded them all in would model a shape the executor
    // cannot emit, and the assertions below would be pinned to fiction.
    if (i > 0) elapsed += yieldEach;
    elapsed += chunkMs;
    return { phase: name, done: (i + 1) * chunk, total: msList.length * chunk, chunkMs, elapsedMs: elapsed };
  });
};

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
ok(empty.elapsedMs === 0 && empty.yieldMs === 0, `and its elapsed/yield fold to zero too (${empty.elapsedMs}/${empty.yieldMs})`);

// ---- elapsed wall-clock and the price of yielding --------------------------------------------
// WHY THIS IS GATED AT ALL: the first live run (2026-08-10) could report what the chunks cost and could NOT
// report what the yielding cost, because `chunkMs` excludes the yield by construction. `CHUNK` then dropped
// 24 → 4, multiplying the yield count by six — a knob turned against an unmeasured term. `elapsedMs` closes
// that, so its arithmetic is worth pinning.
const yielded = phase('build', [100, 100, 100], 24, 30);
const ys = phaseStats('build', yielded);
// ELAPSED IS THE LAST READING, NOT A SUM. Summing a cumulative field is the defect this pins: it would
// report 300 + 430 + ... here instead of 360, inflating the phase and making `yieldMs` nonsense.
ok(ys.elapsedMs === 360,
  `elapsed is the LAST reading's cumulative stamp, not the sum of them — summing would give ${yielded.reduce((a, p) => a + p.elapsedMs, 0)} (${ys.elapsedMs})`);
ok(ys.totalMs === 300, `total stays Σ chunkMs, unchanged by the yields (${ys.totalMs})`);
// 2 yields of 30ms, not 3: the last boundary's yield happens after its report, so it is outside the window.
ok(ys.yieldMs === 60,
  `yieldMs is elapsed − total, which is every yield but the phase's last (2 × 30ms = ${ys.yieldMs})`);
// A phase whose yields cost nothing reports zero, NOT a negative — the clamp. Reachable, not theoretical:
// the deliberate off-by-one plus a millisecond clock can land elapsed one tick under total.
const clamped = phaseStats('build', [rd('build', 24, 24, 50, 49)]);
ok(clamped.yieldMs === 0,
  `an elapsed stamp a tick BELOW total clamps to 0 rather than printing a negative yield time (${clamped.yieldMs})`);
// And it reaches the summary, both as wall-clock and as per-member — the two figures a future CHUNK change
// is argued from. Per-member is asserted by VALUE: 300ms over 72 members is 4.2, and a readout that divided
// by the chunk COUNT would say 100.0.
const yieldedOut = summaryLines(yielded, 0).join('\n');
ok(yieldedOut.includes('elapsed 360ms') && yieldedOut.includes('yields 60ms'),
  'the summary reports elapsed wall-clock and the yield cost, so a CHUNK change can be priced');
ok(yieldedOut.includes('4.2ms per member'),
  `per-member cost divides by MEMBERS not chunks — by chunks it would read 100.0 (${yieldedOut.split('\n').find((l) => l.includes('per member'))?.trim() ?? 'absent'})`);

// ---- phases are split in RUN order, and discovered ------------------------------------------
const both = [...phase('build', [10, 20]), ...phase('wire', [30, 40])];
const split = summarize(both);
ok(split.length === 2 && split[0].phase === 'build' && split[1].phase === 'wire',
  `phases are reported in the order they ran (${split.map((x) => x.phase).join(' → ')})`);
ok(split[0].chunks === 2 && split[1].chunks === 2, 'each phase folds only its own readings');
// Discovered, not hardcoded: a third phase added to the executor shows up without editing the readout.
const three = summarize([...both, rd('polish' as 'build', 1, 1, 5)]);
ok(three.length === 3 && three[2].phase === 'polish',
  `a phase the readout has never heard of is reported anyway (${three.map((x) => x.phase).join(', ')})`);

// ---- the per-chunk line: readable, and flags the slow ones -----------------------------------
const fast = chunkLine(rd('build', 24, 648, 12));
const slow = chunkLine(rd('build', 48, 648, FRAME_MS * SLOW_CHUNK_FRAMES + 1));
ok(fast.includes('24/648') && fast.includes('12ms'), `a chunk line carries its fraction and its cost (${fast.trim()})`);
ok(!fast.includes('SLOW') && slow.includes('SLOW'),
  `only a chunk over ${FRAME_MS * SLOW_CHUNK_FRAMES}ms is flagged slow (${slow.trim()})`);
// The threshold is a > comparison, so a chunk exactly AT the budget is not flagged — asserted because an
// off-by-one here would flag every chunk on a file that happens to land on the boundary.
ok(!chunkLine(rd('build', 1, 1, FRAME_MS * SLOW_CHUNK_FRAMES)).includes('SLOW'),
  `a chunk exactly at the budget is not flagged (${FRAME_MS * SLOW_CHUNK_FRAMES}ms)`);
ok(chunkLine(rd('wire', 324, 648, 9)).includes('50%'),
  'the percentage is computed from the fraction, so a designer can read progress without dividing');

// ---- the summary block ----------------------------------------------------------------------
const sum = summaryLines(both, 1234).join('\n');
ok(sum.includes('build:') && sum.includes('wire:'), 'the summary carries a row per phase');
ok(sum.includes('MAX 40ms') && sum.includes("worst single chunk: 40ms in 'wire'"),
  'the worst chunk ACROSS phases is stated once, plainly, rather than left to be picked out of the rows');
ok(sum.includes('1234ms') && sum.includes('settle'), 'the settle time is reported');

// ---- when CHUNK cannot reach the target, the readout says so ---------------------------------
// THE FINDING FROM THE 2026-08-10 RUN, and the reason it is gated rather than left in a comment: at ~162ms
// per member, no chunk size satisfies the 4-frame target, because CHUNK=1 is still ~10 frames. The failure
// mode this guards is a future reader raising SLOW_CHUNK_FRAMES until the report agrees with the build —
// the report has to distinguish "the chunk size is too big" from "the chunk size is irrelevant".
// One member costing 5× the whole budget: 10 chunks of 1 member each, at 5 × the 4-frame budget.
const perMemberFloor = FRAME_MS * SLOW_CHUNK_FRAMES * 5;
const heavy = summaryLines(phase('build', Array(10).fill(perMemberFloor), 1), 0).join('\n');
ok(heavy.includes('UNREACHABLE by CHUNK alone') && heavy.includes('CHUNK=1'),
  'a per-member cost above the whole frame budget is reported as UNREACHABLE, not as a chunk size to keep tuning');
// AND THE CONVERSE, which is what stops the line from being a decoration that always prints: a cheap
// per-member cost must NOT claim unreachability. Without this, the assertion above passes on a readout that
// prints the warning unconditionally.
const light = summaryLines(phase('build', [200], 100), 0).join('\n');
ok(!light.includes('UNREACHABLE'),
  `a 2ms-per-member phase is squarely reachable and says nothing about it (200ms over 100 members)`);
// The boundary: exactly AT the budget is reachable (a 4-frame chunk of one member meets a ≤4-frame target),
// one millisecond over is not. Pins the comparison direction, which an off-by-one would silently invert.
ok(!summaryLines(phase('build', [FRAME_MS * SLOW_CHUNK_FRAMES], 1), 0).join('\n').includes('UNREACHABLE'),
  `a per-member cost exactly at the budget is reachable (${FRAME_MS * SLOW_CHUNK_FRAMES}ms)`);
ok(summaryLines(phase('build', [FRAME_MS * SLOW_CHUNK_FRAMES + 1], 1), 0).join('\n').includes('UNREACHABLE'),
  `and one millisecond over is not (${FRAME_MS * SLOW_CHUNK_FRAMES + 1}ms)`);
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

// ---- #908: the verdict does not wait on the probe -------------------------------------------
// THE DEFECT: `measureSettle()` was awaited before `component-result` was posted, so a busy host held the
// panel on `⋯ Building…` for the whole tick budget and then reported a settle figure of `null` — the
// designer's verdict delayed by a diagnostic that had failed. What follows pins the ORDER, which is the
// fix, and the probe's own budget behaviour, which is why the order had to change rather than the budget.
//
// A PROBE THAT NEVER RESOLVES is the busy host taken to its limit, and it is the assertion that could not
// pass on the old code: with `const settleMs = await probe(); postVerdict();` nothing is ever posted.
{
  const seq: string[] = [];
  let resolved = false;
  const never = (): Promise<number | null> => { seq.push('probe-start'); return new Promise(() => { /* never */ }); };
  const pending = verdictBeforeSettle(never, () => { seq.push('verdict'); });
  void pending.then(() => { resolved = true; });
  // One macrotask is more than enough for a microtask chain to drain, so this is not a race: if the verdict
  // were behind the probe it would still be unposted here, and it would stay unposted forever.
  await new Promise<void>((r) => { setTimeout(r, 20); });
  ok(seq.includes('verdict'), `the verdict is posted while the probe is still running (sequence: ${seq.join(' → ') || 'nothing ran'})`);
  ok(!resolved, 'and the settle result is still outstanding, so the verdict genuinely did not wait for it');
  // BOTH DIRECTIONS OF THE ORDER, because "verdict was posted" alone would pass on an implementation that
  // never started the probe at all. The probe must start FIRST: it measures the stall from the executor's
  // return, so starting it after the post would move what it measures.
  ok(seq[0] === 'probe-start' && seq[1] === 'verdict',
    `the probe starts BEFORE the verdict posts, so what it measures is unchanged (${seq.join(' → ')})`);
}

// The happy path still returns the probe's number to the caller — the console telemetry block consumes it,
// which is the coupling #684's comment defended and #908 had to keep.
ok(await verdictBeforeSettle(async () => 42, () => { /* posted */ }) === 42,
  'the settle figure still reaches the caller, so the telemetry block can carry it');

// A verdict that THROWS must not strand the caller: the catch in `buildComponents` depends on the
// rejection arriving rather than being swallowed by the unawaited probe.
let threw = '';
try {
  await verdictBeforeSettle(async () => 1, () => { throw new Error('post failed'); });
} catch (e) { threw = (e as Error).message; }
ok(threw === 'post failed', `a throwing verdict rejects rather than hanging the build (${threw || 'nothing thrown'})`);

// ---- #908: the probe's budget is in TICKS, and that is the mechanism ------------------------
// An idle host settles in a few ticks and costs nothing — the case that made the old ordering look fine.
const idle = await measureSettle();
ok(idle !== null && idle < 200, `an idle host settles and reports a number (${idle}ms)`);

// A BUSY HOST BURNS THE WHOLE BUDGET AND REPORTS NOTHING. Run at a small `maxTicks` so the suite stays
// fast; the shipped budget is 400, and the wall cost is `maxTicks × host work per tick`, which is why 20ms
// of work per tick measured 8399ms in the real probe and 100ms measured 40331ms. The delay is not capped.
{
  const TICKS = 12;
  const BURN = 12; // > CALM_LAG_MS, so `settlePoint` never sees a calm run
  const t0 = Date.now();
  // Occupy the thread between ticks the way a reconciling host does. A timer chain competing with a
  // spinning thread is exactly what the probe samples, so this drives the real function rather than a copy.
  const spin = setInterval(() => { const end = Date.now() + BURN; while (Date.now() < end); }, 1);
  const busy = await measureSettle(TICKS);
  clearInterval(spin);
  const wall = Date.now() - t0;
  ok(busy === null, `a host busier than CALM_LAG_MS=${CALM_LAG_MS} never settles and reports NOT MEASURED rather than the budget (${busy})`);
  // The budget is spent, not short-circuited — the assertion that identifies the cost as the BUDGET being
  // waited out rather than a real settle time. Loose lower bound: the point is the order of magnitude.
  ok(wall >= TICKS * BURN * 0.5,
    `and it spends the whole tick budget doing it — ${TICKS} ticks cost ${wall}ms, so the shipped 400 would cost ~${Math.round((wall / TICKS) * 400)}ms on this host`);
}

// WHY THE BUDGET IS NOT MOVED TO WALL CLOCK, which is #908's own proposed alternative. A single solid
// stall is ONE tick: the thread is held inside it, so a wall-clock check between ticks cannot preempt it,
// and any bound short enough to cap #908's delay is far shorter than the 1m10s freeze this probe exists to
// measure — it would return `null` for exactly its designed case. Pinned here as the SAMPLE SHAPE, which
// is the part a future reader needs: one loud lag then a calm run, settling at the stall's length.
ok(settlePoint([2000, 1, 1, 1]) === 1,
  'a single solid freeze is one loud sample followed by calm, so the probe needs only a few ticks to measure a very long stall');

// The constants are pins with a stated basis, not derivations — same honesty as `CHUNK`. Loose bounds:
// they only catch a threshold left at 0 or set somewhere absurd.
ok(FRAME_MS === 16, `FRAME_MS is one frame at ~60fps (${FRAME_MS})`);
ok(SLOW_CHUNK_FRAMES > 1 && SLOW_CHUNK_FRAMES < 20, `SLOW_CHUNK_FRAMES is a plausible perceptual budget (${SLOW_CHUNK_FRAMES})`);
ok(CALM_LAG_MS > 0 && CALM_LAG_MS < FRAME_MS, `CALM_LAG_MS is inside one frame — idle, not merely better (${CALM_LAG_MS})`);
ok(CALM_TICKS >= 2, `CALM_TICKS requires more than one quiet sample (${CALM_TICKS})`);
// MAX_TICKS is pinned by VALUE, not bounded, because #908's cost is `MAX_TICKS × host work per tick` and
// the table in `measureSettle`'s header quotes wall-clock figures computed from this number. A change here
// makes that table wrong, which is the kind of documented measurement that otherwise rots silently.
ok(MAX_TICKS === 400, `MAX_TICKS is the budget the header's measured table is computed from (${MAX_TICKS})`);

console.log(`\nplugin BUILD TELEMETRY: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
