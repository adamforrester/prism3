/**
 * Apply-result HEADLINE test — the ≤24-char verdict the UI's status pill shows.
 *
 *   npx tsx apps/plugin/test-apply-summary.ts
 *
 * Why this has a suite of its own: the apply path had NO test coverage at all, because everything about
 * it lived in `apps/plugin/src/main.ts`, which calls `figma.showUI` at module scope and so cannot be
 * imported. The headline is the piece with real logic — three outcomes, an order of precedence, and a
 * plural — so it was extracted to `apply-summary.ts` to be reachable from here.
 *
 * Asserts: each of the three states is distinguishable; misses outrank skipped fonts (the more
 * actionable fact leads); the plural is correct at 1 and at n; and every headline stays inside the
 * pill's budget — the length bound is the whole reason this field exists, so it is asserted rather
 * than assumed.
 *
 * Since #483 it covers `componentHeadline` too — the component build's verdict, same pill, four states.
 * The one worth gating hardest is "ran and built nothing": `applyComponentPlan` is idempotent, so a
 * re-run skips all 648 members by name, and a verdict that treated those skips as misses would report a
 * working idempotent build as 648 failures.
 */
import { applyHeadline, APPLY_FAILED_HEADLINE, componentHeadline } from './src/apply-summary';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('plugin apply-result headline — the status pill verdict\n');

// The three states must be mutually distinguishable. A pill that reads the same for a clean write and a
// write with misses is the defect this replaced (one summary slot, ellipsised past the miss count).
const clean = applyHeadline(0, 0);
const missed = applyHeadline(4, 0);
const skipped = applyHeadline(0, 3);
ok(new Set([clean, missed, skipped, APPLY_FAILED_HEADLINE]).size === 4,
  `all four states render distinctly (${[clean, missed, skipped, APPLY_FAILED_HEADLINE].join(' | ')})`);

ok(clean === '✓ applied', `clean write reads as applied (${clean})`);
ok(missed.includes('4') && /miss/.test(missed), `misses are counted in the headline (${missed})`);
ok(skipped.includes('3') && /skipped/.test(skipped), `skipped fonts are surfaced even though ok=true (${skipped})`);

// Precedence: a miss means something did not bind and the designer can act on it; a skipped font means
// the variables landed and some text styles did not. Both at once must lead with the miss.
const both = applyHeadline(2, 5);
ok(/miss/.test(both) && !/skipped/.test(both), `misses outrank skipped fonts when both occur (${both})`);

// The plural was the easy thing to get wrong, and "1 misses" in the primary CTA's status is the kind of
// detail that reads as an unfinished tool.
ok(applyHeadline(1, 0) === '⚠ 1 miss', `singular at one miss (${applyHeadline(1, 0)})`);
ok(applyHeadline(2, 0) === '⚠ 2 misses', `plural at two (${applyHeadline(2, 0)})`);
ok(applyHeadline(0, 1).includes('1 skipped'), `singular font count reads naturally (${applyHeadline(0, 1)})`);

// The LENGTH bound is the point of the field. The summary is ~150 chars and the pill clipped it at
// ~30; a headline that grows past the pill re-creates the bug in a new place. 24 is the declared
// budget in `messages.ts`. Probed across the range rather than at one sample, since the count is
// interpolated and a 4-digit miss count is reachable on a large file.
const worst = [0, 1, 2, 9, 99, 999, 9999].flatMap((m) => [0, 1, 26, 999].map((s) => applyHeadline(m, s)));
const over = worst.filter((h) => h.length > 24);
ok(over.length === 0, `every headline fits the 24-char pill budget (longest ${Math.max(...worst.map((h) => h.length))}: "${worst.reduce((a, b) => (b.length > a.length ? b : a))}")`);
ok(APPLY_FAILED_HEADLINE.length <= 24, `the throw headline fits too (${APPLY_FAILED_HEADLINE.length} chars)`);

// No headline may be empty: the UI falls back to its own text on an absent/blank headline (for older
// hosts), and a blank one from THIS host would take that path and silently claim a generic verdict.
ok(worst.every((h) => h.trim().length > 0), 'no headline is blank (which the UI would replace with a generic verdict)');

console.log('\ncomponent-result headline — the component build verdict (#483)\n');

// The four states, distinct. `added`/`skipped`/`misses` — the caller passes three COUNTS, never prose.
const cBuilt = componentHeadline(648, 0, 0);
const cAgain = componentHeadline(0, 648, 0);
const cMiss = componentHeadline(600, 0, 48);
const cNone = componentHeadline(0, 0, 0);
ok(new Set([cBuilt, cAgain, cMiss, cNone]).size === 4,
  `all four component states render distinctly (${[cBuilt, cAgain, cMiss, cNone].join(' | ')})`);

// THE ONE THAT MATTERS. A re-run adds nothing and skips every member; the executor reports each skip in
// `misses` (they are one of its causes), which is why `main.ts` subtracts `skipped` before calling this
// and why `skipped` is a separate count at all. If this ever reads as a warning, the supported action of
// running the build twice reports as hundreds of failures.
ok(cAgain === '✓ already built', `an all-skipped re-run is a verdict, not a warning (${cAgain})`);
ok(!/miss/.test(cAgain) && !cAgain.includes('648'), 'the re-run verdict never renders the skip count as misses');

ok(cBuilt.includes('648') && /built/.test(cBuilt), `a first build counts what it added (${cBuilt})`);
ok(/miss/.test(cMiss) && cMiss.includes('48'), `misses lead over the added count (${cMiss})`);
// Nothing assembled is distinct from a throw: this one HAS counts (all zero) and says the file is empty
// of the set, where `APPLY_FAILED_HEADLINE` says the write did not complete and has nothing to report.
ok(cNone !== APPLY_FAILED_HEADLINE && /nothing/.test(cNone), `nothing-assembled is its own verdict, not the throw (${cNone})`);

// Same plural trap as the theme write's, in a second place — which is why it is asserted in both.
ok(componentHeadline(1, 0, 0) === '✓ built 1 variant', `singular at one variant (${componentHeadline(1, 0, 0)})`);
ok(componentHeadline(2, 0, 0) === '✓ built 2 variants', `plural at two (${componentHeadline(2, 0, 0)})`);
ok(componentHeadline(0, 1, 1) === '⚠ 1 miss', `singular miss (${componentHeadline(0, 1, 1)})`);

// The same 24-char pill, so the same range probe — and a wider one, because a component build's counts
// are an order of magnitude larger than the theme write's (648 members × several bindings each).
const cWorst = [0, 1, 2, 9, 99, 648, 999, 9999].flatMap((a) =>
  [0, 1, 648, 9999].flatMap((s) => [0, 1, 48, 9999].map((m) => componentHeadline(a, s, m))));
const cOver = cWorst.filter((h) => h.length > 24);
ok(cOver.length === 0, `every component headline fits the 24-char pill budget (longest ${Math.max(...cWorst.map((h) => h.length))}: "${cWorst.reduce((a, b) => (b.length > a.length ? b : a))}")`);
ok(cWorst.every((h) => h.trim().length > 0), 'no component headline is blank (the UI would replace it with a generic verdict)');

console.log(`\nplugin apply-result headline: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
