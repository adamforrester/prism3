/**
 * Letter-spacing em → percent label test (#1590) — drives the REAL `src/em-percent.ts` helper that
 * every studio letter-spacing render site now composes into its em label.
 *
 *   npx tsx apps/studio/test-em-percent.ts
 *
 * Runs under `tsx` for the reason `test-provenance.ts` and `test-export-settings.ts` do: the helper is
 * a pure module, not part of `main.ts`, which touches `document` at import time and cannot load here.
 * That extraction is what makes the ×100 rule assertable by name at all — the four UI sites drive this
 * one function, so mutating it (docs/34: break the ×100, e.g. `em * 10`, and this file fails BY NAME)
 * is the by-name mutation for the whole feature.
 *
 * Every LETTER_SPACING_LADDER step is asserted (the exact set the UI renders), plus the two behaviours
 * the label promises independent of any one step: trailing zeros stripped, and a real minus sign.
 */
import { emToPercentLabel } from './src/em-percent';
import { LETTER_SPACING_LADDER } from '@prism3/engine/theme';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const eq = (em: number, want: string): void =>
  ok(emToPercentLabel(em) === want, `emToPercentLabel(${em}) → "${want}" (got "${emToPercentLabel(em)}")`);

// =============================================================================================
// 1. The exact percent for every rung the issue names — percent = em × 100, exactly.
// =============================================================================================
console.log('\n#1590 — em × 100, over the values in the issue');

eq(-0.02, '−2%');      // −2%
eq(-0.015, '−1.5%');   // −1.5% — the trailing-zero case: NOT −1.50%
eq(-0.01, '−1%');      // −1%
eq(-0.005, '−0.5%');   // −0.5%
eq(0, '0%');                // 0% — no sign
eq(0.03, '3%');             // 3% — positive carries no sign

// =============================================================================================
// 2. The whole tracking ladder — the exact set the ladder table and the dropdown render.
// =============================================================================================
console.log('\n#1590 — every LETTER_SPACING_LADDER step, as the UI shows it');

// Independently transcribed expected labels, keyed by em — NOT computed from the helper (docs/34: a
// gate whose oracle is derived from its subject cannot fail). A ladder step with no entry here fails
// loudly rather than passing unmeasured.
const EXPECT: Record<string, string> = {
  '-0.05': '−5%', '-0.04': '−4%', '-0.03': '−3%', '-0.02': '−2%',
  '-0.015': '−1.5%', '-0.01': '−1%', '-0.005': '−0.5%',
  '0': '0%',
  '0.005': '0.5%', '0.01': '1%', '0.02': '2%', '0.03': '3%',
  '0.05': '5%', '0.08': '8%', '0.1': '10%',
};
ok(LETTER_SPACING_LADDER.length === Object.keys(EXPECT).length,
  `every ladder step has an expected label (ladder ${LETTER_SPACING_LADDER.length}, expected ${Object.keys(EXPECT).length})`);
for (const em of LETTER_SPACING_LADDER) {
  const want = EXPECT[String(em)];
  if (want === undefined) { ok(false, `no expected label transcribed for ladder step ${em}`); continue; }
  eq(em, want);
}

// =============================================================================================
// 3. The two promises that hold independent of the ladder.
// =============================================================================================
console.log('\n#1590 — trailing zeros stripped, real minus sign');

// Trailing-zero strip: a whole-number percent has no ".0", a half-step has no ".x0".
ok(!/\.0*%$/.test(emToPercentLabel(-0.02)), '−2% carries no trailing ".0"');
ok(emToPercentLabel(-0.015) === '−1.5%' && emToPercentLabel(-0.015) !== '−1.50%',
  '−1.5% is not written −1.50%');

// A real minus sign (U+2212), never a hyphen-minus (U+002D).
ok(emToPercentLabel(-0.02).startsWith('−'), 'negatives use a real minus sign (−, U+2212)');
ok(!emToPercentLabel(-0.02).includes('-'), 'negatives carry no hyphen-minus (U+002D)');
ok(!emToPercentLabel(0.03).startsWith('+') && !emToPercentLabel(0).startsWith('−'),
  'zero and positives carry no sign');

// =============================================================================================
console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} — ${executed} assertions executed`);
process.exit(failed === 0 ? 0 : 1);
