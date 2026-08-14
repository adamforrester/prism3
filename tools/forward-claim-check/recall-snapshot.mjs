/**
 * RECALL SNAPSHOT — the backing for the one figure in `measure.ts` that does not re-derive from the
 * tree, plus a tripwire that tells you how far it has drifted since.
 *
 *   node tools/forward-claim-check/recall-snapshot.mjs
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────────────
 *
 * `measure.ts` carries a measured recall figure. Every OTHER number in that file re-derives from the
 * tree on every run — the corpus size, the funnel, the register counts, the journal ratio. The recall
 * figure did not: it arrived as a headline with no committed sample, no sample size and no method,
 * inside a tool built to find claims that have drifted from what they assert. The harness cannot
 * catch that itself, because it reads issue citations only. **That is a scope limit, not an
 * exemption**, and this file is the fix.
 *
 * ── WHAT REPRODUCES, AND WHAT DOES NOT — the honest split ───────────────────────────────────────
 *
 * The measurement was attempted as a RUNNABLE artifact first, because a figure that regenerates from
 * the tree beats any snapshot. It does not regenerate, and the reasons are specific rather than
 * shrugged at:
 *
 *  1. **THE FRAME GENERATOR WAS NOT KEPT.** The five stratum rosters were produced by a script that
 *     no longer exists, and its intermediate frame file was overwritten by a later, unrelated
 *     measurement writing the same filename. The downstream script that consumed it fails on the
 *     current file. Nothing can rebuild the strata as drawn.
 *  2. **THE CORPUS HAS MOVED UNDER THE ROSTERS.** Measured against the tree at the time of writing:
 *     of the 3,721 roster sites, **2,531 (68%) still resolve** to the same text at the same
 *     `file:line`; **818 (22%) drifted** to a different line in the same file; **372 (10%) are gone
 *     from their file entirely**. A re-scan today draws a different frame with different stratum
 *     sizes, so the sampled rates would attach to different denominators.
 *  3. **THE NUMERATOR HAS ALREADY MOVED.** The snapshot's TP is the tool's reportable-site count at
 *     measurement time. The guest-genre exclusion that shipped afterwards moved one site out of that
 *     count. The figure was stale within a day of being written, which is the sharpest possible
 *     argument for not carrying a bare number — and it is why the drift check below is mechanical
 *     rather than a note asking someone to remember.
 *
 * So this is a **DATED SNAPSHOT, stated as measured-once**, the posture `tools/nest-exposed-cost/`
 * already takes. What IS runnable here is the INFERENCE: the counts below are data, the
 * Clopper-Pearson arithmetic over them is code, and the headline interval re-derives from the two on
 * every run. What is not runnable is the sample that produced the counts, and the hand
 * classification behind them is committed beside this file as evidence rather than summarized.
 *
 * ── THE EXPIRY CONDITION, MECHANIZED ────────────────────────────────────────────────────────────
 *
 * A snapshot that names its own expiry is worth more than one that carries a date, and one that
 * CHECKS its own expiry is worth more again. This run reads today's reportable count out of
 * `measure.ts --json` and compares it with the snapshot's. When they differ it says so, and prints
 * what the point estimate becomes if only the numerator is updated — which is not a re-measurement,
 * because the denominator is a year of hand classification that nobody has redone. Treat a fired
 * tripwire as "the figure needs re-measuring", never as "here is the new figure".
 *
 * NOT A GATE. It exits 0 always, like every other measurement under `tools/`. A drifted numerator is
 * a fact about the snapshot, not a defect in the tree, and nothing here should ever fail a build.
 *
 * ── METHOD, so the snapshot can be criticized rather than merely believed ───────────────────────
 *
 * FRAME. Every `#`+digits citation site in the corpus `measure.ts` defines (tracked `.md`/`.ts`/
 * `.mjs`/`.yml`), MINUS the genre-excluded journal, which is out of scope by the same reasoning that
 * excludes it from the report. Unit: one site = `file:line:issue`, the same unit the funnel dedupes
 * to, so numerator and denominator are counted the same way.
 *
 * STRATIFICATION, by two axes — whether the cited issue has a recorded state, and lexical proximity
 * between the citing sentence and the issue title:
 *
 *   A  tier1-near     967   censused in full
 *   B  tier1-distal    90   censused in full
 *   C  tier2-near   1,218   sampled 180
 *   D  tier2-distal    34   censused in full
 *   E  no-state     1,412   sampled 150
 *
 * The two large strata were sampled rather than read, and their sampled rates are the only place
 * uncertainty enters; A, B and D are exact counts, not estimates. Both sampled strata sit near zero,
 * where the normal approximation's coverage collapses and its lower bound can go negative, so the
 * interval is **Clopper-Pearson (exact binomial)**, and each stratum is taken at 97.5% so the joint
 * coverage of the combined interval is at least 95% by Bonferroni.
 *
 * CLASSIFICATION RULE, taken from `measure.ts`'s own definition rather than invented for the
 * measurement: a site is a forward claim iff the sentence asserts, in the present tense, an
 * unresolved state tied to the cited issue such that CLOSING THAT ISSUE MAKES THE SENTENCE FALSE,
 * and asserts it rather than quoting it. Past-tense narration of a resolved blocker, bare
 * attribution, and claims about a topic the issue merely tracks are all NOT forward claims. Every
 * classified false negative is listed in `recall-classification-record.txt` with its site and the
 * reason the pattern missed it; everything censused or sampled and not listed there was classified
 * not-a-forward-claim.
 *
 * KNOWN WEAKNESSES, named rather than left to be found: one classifier, no second rater and so no
 * inter-rater agreement figure; the near/distal split is a lexical heuristic, not a semantic one; and
 * the sensitivity rows below exist because two of the classification calls are genuinely arguable —
 * if you disagree with them, the row that encodes your disagreement is already computed.
 */

// ---- Clopper-Pearson, via inversion of the regularized incomplete beta ---------------------------

function logGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
function betacf(a, b, x) {
  const FPMIN = 1e-300, EPS = 3e-16;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 300; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
function ibeta(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
/** Inverse regularized incomplete beta by bisection — ample precision for a reported interval. */
function ibetaInv(p, a, b) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (ibeta(a, b, mid) < p) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
/** Two-sided Clopper-Pearson at confidence `conf` for k successes in n trials. */
export function cp(k, n, conf) {
  const alpha = 1 - conf;
  return {
    p: k / n,
    lo: k === 0 ? 0 : ibetaInv(alpha / 2, k, n - k + 1),
    hi: k === n ? 1 : ibetaInv(1 - alpha / 2, k + 1, n - k),
  };
}

// ---- THE SNAPSHOT: data, with its provenance attached -------------------------------------------

/**
 * Measured once, on the date and tree below. These are the hand counts; nothing here is derived from
 * the tree at run time, and nothing here should be edited to make a number look better. If the
 * measurement is redone, replace the whole block and change the date — do not patch a field.
 */
export const SNAPSHOT = {
  measured: '2026-08-14',
  tree: '63efb29',
  note: 'the tree as of that commit; several PRs have merged since — see the drift check below',
  /** Censused in full. Exact counts, not estimates. */
  censusFN: { A: 59, B: 1, D: 1 },
  /** Sites whose classification is genuinely arguable, counted separately for sensitivity 1. */
  censusBorderline: { A: 21, B: 0, D: 1 },
  /** The two large strata, sampled. `N` stratum size, `n` sampled, `k` false negatives found. */
  sampled: {
    'C-tier2-near': { N: 1218, n: 180, k: 4 },
    'E-nostate': { N: 1412, n: 150, k: 1 },
  },
  /** The tool's reportable-site count at measurement time. The drift check compares this with today. */
  TP: 12,
  /** Bonferroni: two sampled strata, each at 97.5%, so joint coverage is at least 95%. */
  CONF: 0.975,
};

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

/** The whole inference, as a function of TP, so the drift check can re-run it with today's count. */
export function recall(TP, wide = false) {
  const census = sum(SNAPSHOT.censusFN) + (wide ? sum(SNAPSHOT.censusBorderline) : 0);
  let p = 0, lo = 0, hi = 0;
  for (const s of Object.values(SNAPSHOT.sampled)) {
    const r = cp(s.k, s.n, SNAPSHOT.CONF);
    p += r.p * s.N; lo += r.lo * s.N; hi += r.hi * s.N;
  }
  const fn = { p: census + p, lo: census + lo, hi: census + hi };
  return { census, fn, p: TP / (TP + fn.p), lo: TP / (TP + fn.hi), hi: TP / (TP + fn.lo) };
}

const pc = (x) => `${(x * 100).toFixed(1)}%`;

// ---- report -------------------------------------------------------------------------------------

const out = [];
const say = (s = '') => out.push(s);

say('RECALL SNAPSHOT — measured once, stated as such, and checked for drift on every run');
say('='.repeat(100));
say();
say(`  measured   ${SNAPSHOT.measured}   tree ${SNAPSHOT.tree}`);
say('  status     SNAPSHOT, not reproducible. The frame generator was not kept and its intermediate');
say('             file was overwritten; the rosters no longer re-derive. The ARITHMETIC below is');
say('             runnable over the recorded counts — the SAMPLE behind those counts is not.');
say();

say('-'.repeat(100));
say('STRATA');
say('-'.repeat(100));
for (const [name, s] of Object.entries(SNAPSHOT.sampled)) {
  const r = cp(s.k, s.n, SNAPSHOT.CONF);
  say(`  ${name.padEnd(14)} N=${String(s.N).padStart(5)}  sampled n=${String(s.n).padStart(4)}  found k=${s.k}` +
      `   rate ${pc(r.p)} [${pc(r.lo)}, ${pc(r.hi)}]   →  FN ${(r.p * s.N).toFixed(1)} [${(r.lo * s.N).toFixed(1)}, ${(r.hi * s.N).toFixed(1)}]`);
}
for (const [k, v] of Object.entries(SNAPSHOT.censusFN))
  say(`  stratum ${k}       censused in full — ${v} false negative(s), exact`);
say();

say('-'.repeat(100));
say('THE FIGURE');
say('-'.repeat(100));
const rows = [
  ['PRIMARY — strict classification', recall(SNAPSHOT.TP), SNAPSHOT.TP],
  ['SENSITIVITY 1 — borderline sites counted as false negatives too', recall(SNAPSHOT.TP, true), SNAPSHOT.TP],
  ['SENSITIVITY 2 — TP = 10 (past-tense narrations are not forward claims)', recall(10), 10],
];
for (const [label, r, tp] of rows) {
  say(`  ${label}`);
  say(`    censused FN ${r.census}   ·   total FN ${r.fn.p.toFixed(1)} [${r.fn.lo.toFixed(1)}, ${r.fn.hi.toFixed(1)}]   ·   TP ${tp}`);
  say(`    RECALL  ${pc(r.p)}  [${pc(r.lo)}, ${pc(r.hi)}]`);
  say();
}

// ---- the drift check: the one part that reads the tree ------------------------------------------

say('-'.repeat(100));
say('DRIFT CHECK — the snapshot against today');
say('-'.repeat(100));

let today = null;
try {
  const { execFileSync } = await import('node:child_process');
  const { dirname, resolve } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = execFileSync('npx', ['--yes', 'tsx@4', resolve(here, 'measure.ts'), '--json'],
    { encoding: 'utf8', maxBuffer: 1 << 28, cwd: resolve(here, '../..') });
  today = JSON.parse(raw.slice(raw.indexOf('{', raw.lastIndexOf('\n\n')))).funnel.reportable;
} catch {
  say('  ! could not run measure.ts to read today\'s reportable count — the drift check did not run.');
  say('    That is an unknown, not a pass: do not read the figure above as current.');
}

if (today !== null) {
  say(`  snapshot TP ${SNAPSHOT.TP}   ·   today ${today}`);
  if (today === SNAPSHOT.TP) {
    say('  ✓ the numerator has not moved. The denominator is still a snapshot — nothing here re-measures it.');
  } else {
    const r = recall(today);
    say('  ⚠ THE NUMERATOR HAS MOVED. The figure above is stale by at least that much.');
    say(`    Updating ONLY the numerator gives ${pc(r.p)} [${pc(r.lo)}, ${pc(r.hi)}] — which is an illustration of the`);
    say('    size of the drift, NOT a new measurement: the denominator is hand classification nobody has');
    say('    redone, and mixing a current numerator with a stale denominator is not a figure to quote.');
    say('    What to do: re-measure, or quote the snapshot WITH its date and this drift.');
  }
}
say();
say('='.repeat(100));
say('Evidence: recall-classification-record.txt (every classified false negative, with the reason the');
say('pattern missed it). Forms evidence for the clustering argument is a different claim with different');
say('backing — see form-probe.mjs, which does not bear on this figure.');
say('='.repeat(100));

console.log(out.join('\n'));
process.exit(0);
