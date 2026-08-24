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
 *
 * And since #913, `partialWriteHeadline`/`partialWriteNote` — the verdict for a build that THREW with
 * nodes already in the file. Two properties are gated there that the other two headlines do not have:
 * the count reaches the pill in **both** size regimes (2 nodes and 648 were both measured, and the small
 * one is the one that gets overlooked and re-run on top of), and a marking that ITSELF failed still
 * reports the nodes as present. The facts here are authored fixtures — the executor's own collection of
 * them is gated against real host state in `test-write-components.ts`.
 */
import { applyHeadline, APPLY_FAILED_HEADLINE, componentHeadline, partialWriteHeadline, partialWriteNote } from './src/apply-summary';
import type { PartialWriteFacts } from './src/apply-summary';

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

console.log('\npartial-write verdict — what a failed build left in the file (#913)\n');

// A local builder, so each case below names only the fields it is about. Deliberately NOT the executor's
// `markPartialWrite` return value: that function lives in `write-components.ts` behind a `figma`-typed
// API and is gated in `test-write-components.ts` against the HOST's state. Here the facts are AUTHORED,
// which is what makes this suite a check on the prose rather than a second reading of the executor.
const facts = (f: Partial<PartialWriteFacts>): PartialWriteFacts =>
  ({ loose: 0, parked: 0, frame: null, intoExistingSet: 0, markError: null, ...f });
const parked = (n: number): PartialWriteFacts =>
  facts({ loose: n, parked: n, frame: `⚠ Prism3 partial build — button (${n} node${n === 1 ? '' : 's'}; undo to remove)` });

// BOTH SIZE REGIMES, at the prose layer. The two measured cases are 2 loose nodes (the typeface case —
// a font the file does not have, which is the ORDINARY client failure) and 648 (a refused
// `combineAsVariants`). The small one is the one a designer overlooks and then re-runs on top of, so the
// requirement is that the COUNT reaches the pill in both — not that the big one is dramatic.
const small = partialWriteHeadline(parked(2));
const large = partialWriteHeadline(parked(648));
ok(small.includes('2') && large.includes('648'),
  `the parked count reaches the pill in both size regimes (${small} | ${large})`);
ok(small !== APPLY_FAILED_HEADLINE && large !== APPLY_FAILED_HEADLINE,
  'neither regime falls back to the bare throw verdict, which would hide the leftovers');
ok(small === '✗ failed, 2 parked', `the two-node case reads exactly (${small})`);

// Nothing written is the third state, and it must keep the OLD verdict: `planSetLayout` refusing before
// anything reaches the file is a clean failure, and inventing a count for it would be a false claim
// about the designer's file.
ok(partialWriteHeadline(facts({})) === APPLY_FAILED_HEADLINE,
  'a throw that wrote nothing keeps the plain failure verdict');
ok(partialWriteNote(facts({})) === '', 'and appends no note at all, so the summary is unchanged');

// Precedence: loose nodes outrank members added to a set that was already there. Loose nodes are litter
// at the top level of the page; the set members are in the place the designer expects them.
const bothKinds = partialWriteHeadline(facts({ loose: 3, parked: 3, frame: 'f', intoExistingSet: 9 }));
ok(bothKinds.includes('3') && !bothKinds.includes('9'),
  `loose nodes lead over members appended to an existing set (${bothKinds})`);
ok(partialWriteHeadline(facts({ intoExistingSet: 5 })) === '✗ failed, 5 in set',
  `a write that only touched the existing set says so (${partialWriteHeadline(facts({ intoExistingSet: 5 }))})`);

// THE ONE THAT MATTERS. When the marking itself fails there is no frame, and the nodes are still in the
// file — so the note must still name them. A single `parked` count would report zero nodes here, which
// is the one thing this must never say: the designer would be told the file is clean while 648 loose
// components sit on the page.
const unmarked = partialWriteNote(facts({ loose: 648, parked: 0, frame: null, markError: 'in createFrame: read-only' }));
ok(unmarked.includes('648') && /loose/.test(unmarked),
  'a FAILED marking still reports the nodes as loose, never as zero');
ok(unmarked.includes('read-only'), 'and reports its own failure beside the cause, so both are visible');
const halfMarked = partialWriteNote(facts({ loose: 648, parked: 640, frame: 'F', markError: 'in appendChild: locked' }));
ok(halfMarked.includes('640') && halfMarked.includes('8'),
  `a partial marking accounts for both halves (${halfMarked.slice(0, 96)}…)`);

// The frame EXISTS and is EMPTY — measured, and the one state a plausible reading of the facts gets wrong.
// A host that refuses `appendChild` refuses it for the marking too, so the frame is created and named (its
// name carries the count) and then takes none of the nodes. The frame is real and on the page, so the note
// may not pretend it is absent; the nodes are all still loose, so it may not let the frame's name stand as
// the answer either. Both halves, or a designer reads the label and believes the litter is contained.
const emptyFrame = partialWriteNote(facts({ loose: 148, parked: 0, frame: '⚠ Prism3 partial build — button (148 nodes; undo to remove)', markError: 'HOST REJECTED appendChild' }));
ok(emptyFrame.includes('0 of them are parked') && emptyFrame.includes('148 are still loose'),
  `a frame that took none of the nodes says so on both counts (${emptyFrame.slice(0, 120)}…)`);

// The frame's NAME is in the note, because that is how a designer finds it: the panel cannot select or
// scroll to a node, so the prose has to be the pointer.
ok(partialWriteNote(parked(2)).includes('⚠ Prism3 partial build'),
  'the marking frame is named in the note, since the panel cannot select it for the designer');

// The note is a SUFFIX. `main.ts` appends it to the host's own error message, and the cause has to lead:
// the throw is what the designer needs to see, and this is where it happened to land.
ok(partialWriteNote(parked(2)).startsWith(' — '),
  'the note appends to the cause rather than replacing it');
ok(/One undo removes the whole build\.$/.test(partialWriteNote(parked(2))),
  'the note ends with the recovery, which is one undo because `commitUndo()` is never called');
// No keyboard shortcut, on purpose: the panel runs on macOS and Windows, and naming one key is wrong for
// half the audience. Asserted rather than remembered, since the obvious edit is to "help" by adding it.
ok(!/⌘|Ctrl|Cmd/.test(partialWriteNote(parked(2))), 'and names no keyboard shortcut, which would be wrong on one platform');

// Plurals again, in a third place — and the singular is reachable: one member created before the throw.
const one = partialWriteNote(parked(1));
ok(one.includes('1 node ') && /it is parked/.test(one), `singular reads naturally at one node (${one.slice(0, 64)}…)`);
ok(partialWriteNote(parked(2)).includes('2 nodes '), 'plural at two');
ok(partialWriteNote(facts({ intoExistingSet: 1 })).includes('1 member ') , 'singular member of an existing set');
ok(partialWriteNote(facts({ intoExistingSet: 2 })).includes('2 members '), 'plural members');

// The same 24-char pill, probed across the range for the same reason: the count is interpolated, and a
// plan larger than button's 648 is reachable the moment a def declares a fourth axis.
const pWorst = [1, 2, 9, 99, 648, 9999, 99999].flatMap((n) =>
  [0, 1, 648].map((s) => partialWriteHeadline(facts({ loose: n, parked: n, frame: 'f', intoExistingSet: s }))))
  .concat([1, 2, 648, 99999].map((s) => partialWriteHeadline(facts({ intoExistingSet: s }))));
const pOver = pWorst.filter((h) => h.length > 24);
ok(pOver.length === 0, `every partial-write headline fits the 24-char pill budget (longest ${Math.max(...pWorst.map((h) => h.length))}: "${pWorst.reduce((a, b) => (b.length > a.length ? b : a))}")`);
ok(pWorst.every((h) => h.trim().length > 0), 'no partial-write headline is blank (the UI would replace it with a generic verdict)');

console.log(`\nplugin apply-result headline: ${failed === 0 ? 'ALL PASS' : failed + ' FAILED'}`);
if (failed) process.exit(1);
