/**
 * FORM PROBE — which PHRASINGS the pattern set misses, run against the shipped patterns.
 *
 *   node tools/forward-claim-check/form-probe.mjs
 *
 * ── WHAT THIS BACKS, AND WHAT IT DOES NOT ──────────────────────────────────────────────────────
 *
 * This is evidence for `measure.ts`'s FIRST never-gate reason — that the misses cluster, and cluster
 * because one claim gets written a dozen ways while the pattern set recognizes one of them. Each case
 * below is a real form found in this repo's prose, reduced to its shape.
 *
 * **It is NOT backing for the recall figure.** Sixteen hand-picked sentences are not a sample of
 * anything; they cannot estimate a rate, and reading a percentage out of the CAUGHT/MISSED tally
 * below would be exactly the defect this file's neighbour exists to correct. The recall figure's
 * backing is `recall-snapshot.mjs` and `recall-classification-record.txt`. Two claims, two artifacts,
 * on purpose — a probe that "supports" both would be supporting one of them badly.
 *
 * ── THE CONVENTION IT OBEYS, which is the reason the numbers look odd ──────────────────────────
 *
 * Every citation here is INTERPOLATED from `SAMPLE`, never written literally, and the labels name the
 * real source instead. This file sits inside the corpus `measure.ts` scans, and these sentences are
 * forward claims BY CONSTRUCTION — writing them with their real numbers would author a dozen live
 * claims in a file whose entire purpose is to demonstrate them, and the tool would dutifully report
 * its own probe. **A detector whose own source falls inside its corpus must write no matchable
 * instance, never exempt itself** — the same rule `measure.ts` and `lint-advisory-expiry.ts` each
 * reached independently. The forms are preserved exactly; only the digits are fake.
 *
 * NOT A GATE. Exits 0 always. It reports which forms the patterns see; nothing here fails a build.
 */

const GAP = '[^.\\n]{0,24}?', WIDE = '[^.\\n]{0,48}?', OPEN = '(?:stays|remains|is\\s+still)\\s+open';

/** The nine shipped patterns, copied from `measure.ts` deliberately rather than imported: this probe
 *  answers "what does the pattern set as written recognize?", and an import would silently follow a
 *  future edit and quietly stop being the record of what was probed. If they diverge, that is a
 *  finding — re-run both and update this list on purpose. */
const PATTERNS = [
  ['blocked-on', new RegExp(`\\bblocked\\s+(?:on|by)\\s+${GAP}#(\\d{2,4})\\b`, 'gi')],
  ['waiting-on', new RegExp(`\\bwait(?:s|ing)\\s+on\\s+${GAP}#(\\d{2,4})\\b`, 'gi')],
  ['pending', new RegExp(`\\bpending\\s+${GAP}#(\\d{2,4})\\b`, 'gi')],
  ['parked', new RegExp(`\\bparked\\s+(?:pending|until)\\s+${GAP}#(\\d{2,4})\\b`, 'gi')],
  ['still-open', new RegExp(`#(\\d{2,4})\\b${WIDE}\\b${OPEN}\\b`, 'gi')],
  ['open-under', new RegExp(`\\b${OPEN}\\b${WIDE}#(\\d{2,4})\\b`, 'gi')],
  ['deferred', new RegExp(`\\bdeferred\\s+(?:to|behind|pending)\\s+${GAP}#(\\d{2,4})\\b`, 'gi')],
  ['depends-on', new RegExp(`\\bdepends\\s+on\\s+${GAP}#(\\d{2,4})\\b`, 'gi')],
  ['unblocked-by', new RegExp(`\\bunblocked\\s+by\\s+${GAP}#(\\d{2,4})\\b`, 'gi')],
];

/** Interpolated, never literal — see the header. Two numbers, so the range form has something to span. */
const S = 4242, S2 = 4243;

/** Each case is a real shape from this repo, with its citation replaced. `expect` records what the
 *  pattern set did when this was measured, so a later edit to those patterns shows up here as a
 *  MISMATCH rather than silently changing the story this file tells. Controls are paired with the
 *  case they isolate — and one pair below deliberately does NOT isolate, which is itself the finding. */
const CASES = [
  ['the historical false negative (engine source, em-dash)', `DTCG omits kind/angle/interpolation (issue #${S} — still open)`, 'MISSED'],
  ['  control: the form the pattern DOES want', `issue #${S} is still open`, 'CAUGHT'],
  ['bare "still open" after a range', `filed as #${S}-#${S2} and **all still open**`, 'MISSED'],
  ['period in the span AND span too long — the real line, two causes at once', `item 4 (**#${S} - per-brand token package vs. runtime token loader**) stays open.`, 'MISSED'],
  ['  naive control: period removed — STILL missed, so it isolates nothing', `item 4 (**#${S} - per-brand token package vs runtime token loader**) stays open.`, 'MISSED'],
  ['  real control: period removed AND span inside 48 chars', `item 4 (**#${S} - token package vs runtime loader**) stays open.`, 'CAUGHT'],
  ['gap of 26 chars (GAP allows 24)', `labels pending Token Press confirmation (#${S}) - the gate compares`, 'MISSED'],
  ['  control: gap shortened to 24', `labels pending Token Press confirm (#${S}) - the gate compares`, 'CAUGHT'],
  ['"X until #N" (five sites carry this one form)', `categories 3-5 stay reporting-only until #${S} is answered`, 'MISSED'],
  ['"stays PARKED" (pattern pins "stays open")', `#${S} stays **parked** rather than answered`, 'MISSED'],
  ['citation-first "depends on"', `generated Code Connect (**#${S}**, depends on both legs)`, 'MISSED'],
  ['  control: claim-first "depends on"', `generated Code Connect depends on both legs (**#${S}**)`, 'CAUGHT'],
  ['active voice "blocks"', `#${S}'s model still blocks the plugin lane's next pick`, 'MISSED'],
  ['bare adjective', `one source is available to pick — #${S} is unbuilt`, 'MISSED'],
  ['verb "survives"', `**#${S} survives** — \`PartDef\` has no stroke field`, 'MISSED'],
  ['wrapped across two lines', `nest-exposed is deferred pending "the\n * property-count measurement" (#${S})`, 'MISSED'],
];

const fired = (s) => PATTERNS.filter(([, re]) => { re.lastIndex = 0; return re.test(s); }).map(([n]) => n);

console.log('FORM PROBE — which phrasings the shipped pattern set recognizes');
console.log('='.repeat(100));
console.log('Evidence for the CLUSTERING argument, not for the recall figure. Sixteen hand-picked forms are');
console.log('not a sample: do not read a rate out of this tally. Citations are interpolated, never literal.');
console.log();

let caught = 0, controls = 0, realCaught = 0, realTotal = 0, mismatch = 0;
for (const [label, text, expect] of CASES) {
  const f = fired(text);
  const got = f.length ? 'CAUGHT' : 'MISSED';
  const isControl = label.startsWith('  ');
  if (f.length) caught++;
  if (isControl) controls++;
  else { realTotal++; if (f.length) realCaught++; }
  const flag = got === expect ? '' : `   ** MISMATCH: recorded ${expect} **`;
  if (got !== expect) mismatch++;
  console.log(`${(f.length ? `CAUGHT  [${f.join(',')}]` : 'MISSED').padEnd(28)}${label}${flag}`);
}
console.log();
console.log(`${caught} of ${CASES.length} cases recognized — and ${controls} of the cases are CONTROLS, written to isolate the single`);
console.log('character or word that decides each one, not drawn from the corpus.');
console.log(`Of the ${realTotal} REAL corpus forms, the pattern set recognizes ${realCaught}. It is not bad at what it matches;`);
console.log('it matches one way of saying a thing that gets said many ways — which is why the misses pile');
console.log('onto the same issues rather than scattering.');
console.log();
console.log('One pair is worth reading twice: removing the period from the "vs." case does NOT rescue it,');
console.log('because the span is also over the 48-character limit. Two causes, either sufficient. A control');
console.log('that changes one thing and stays red has isolated nothing, and would have been reported as');
console.log('"the period is the cause" by anyone who did not then shorten the span too.');
if (mismatch) {
  console.log();
  console.log(`!! ${mismatch} case(s) no longer behave as recorded. The pattern set has changed since this was`);
  console.log('   measured, so the prose that cites this probe is describing a tool that no longer exists.');
}
process.exit(0);

