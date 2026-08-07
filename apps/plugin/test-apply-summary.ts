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
 */
import { applyHeadline, APPLY_FAILED_HEADLINE } from './src/apply-summary';

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

console.log(`\nplugin apply-result headline: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
