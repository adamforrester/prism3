/**
 * Provenance model test (#722, implementing #721) — drives the REAL `src/provenance.ts` against the
 * emitted example brands, so the state model is verified with no browser and no live Figma.
 *
 *   npx tsx apps/studio/test-provenance.ts
 *
 * This is `apps/studio`'s FIRST test file, and the reason it can exist is that the model was put in
 * its own pure module rather than inside `main.ts`: `main.ts` touches `document` at import time and
 * cannot be loaded under `tsx`, so anything living there is assertable only by hand in a browser.
 *
 * Covers #721's verify block, in its order:
 *   1. a confirmation fires ONLY on real divergence — including the negative case, which is the one
 *      that actually catches a broken dirty check
 *   2. all three seed outcomes are constructible and distinguishable, and state 2 is not a failure
 *   3. reset returns the origin EXACTLY, asserted against the stored baseline
 *   4. every writer declares an origin — asserted structurally, see the last section
 *
 * Mirrors `apps/plugin/test-persist.ts`'s `ok(...)` style; exits non-zero on any failure.
 */
import {
  provenanceOf, noOrigin, isDirty, originBaseline, needsOverwriteConfirm,
  isSeedFailure, isUnrecoverable, joinSeed, withRecovered,
  type Origin, type SeedOutcome,
} from './src/provenance';
import { exampleBrands } from '@prism3/engine/emit-brandinput';
import type { BrandInput } from '@prism3/engine/theme';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

// `exampleBrands` is a FUNCTION (it parses the example design.md files at call time) — same call
// `apps/plugin/test-persist.ts` makes. `main.ts` imports the emitted JSON instead, which is the same
// data by way of `regen`.
const brands = exampleBrands() as Record<string, BrandInput>;

/** Fetch a fixture, FAILING rather than crashing if it is absent.
 *
 *  A bare `brands.aurora` would be `undefined` if the example set were ever renamed, and the first
 *  property read would abort this file — at which point every assertion after it silently does not
 *  run and the suite reports fewer failures the more broken it is (docs/34, #710). A missing fixture
 *  is a legitimate thing to be told about; it is not a reason to stop measuring. */
const fixture = (id: string): BrandInput => {
  const b = brands[id];
  if (b) return b;
  ok(false, `FIXTURE MISSING: example brand '${id}' — every assertion using it is unmeasured`);
  // A structurally valid stand-in, so the reads below fail their own assertions rather than throwing.
  return { id: `missing-${id}`, primary: { l: 0.5, c: 0.1, h: 0 }, modes: ['light'] } as unknown as BrandInput;
};

const aurora = fixture('aurora');
const harbor = fixture('harbor');

// =============================================================================================
// 1. Dirtiness and the confirmation condition
// =============================================================================================
console.log('\n#721 — a confirmation fires only on real divergence');

const pFile = provenanceOf({ kind: 'file' }, aurora);

ok(!isDirty(structuredClone(aurora), pFile),
  'a freshly loaded brand is NOT dirty against its own origin');

// THE NEGATIVE CASE IS THE LOAD-BEARING ONE. #721: "import over an untouched seeded state and
// confirm it does not prompt — a prompt there proves the dirty check is not doing its job." An
// always-true isDirty passes every positive assertion in this file and fails only here.
ok(!needsOverwriteConfirm(structuredClone(aurora), pFile),
  'importing over an UNTOUCHED seeded state does NOT prompt (the always-dirty detector dies here)');

const edited = structuredClone(aurora);
edited.primary = { ...edited.primary, h: (edited.primary.h + 40) % 360 };
ok(isDirty(edited, pFile), 'a knob edit IS dirty against the origin');
ok(needsOverwriteConfirm(edited, pFile), 'importing over an EDITED state DOES prompt');

// The empty state has nothing to lose, whatever the working copy holds. Without the `none` guard
// this is dirty (the boot demo differs from nothing) and would prompt on the first import a new
// user ever attempts — the exact unconditional prompt the model exists to remove.
ok(!needsOverwriteConfirm(edited, noOrigin(aurora)),
  'the EMPTY state never prompts, even with a diverging working copy');

// Key order must not register as an edit: a baseline that came from the host was serialized there,
// while the working copy has been through structuredClone and knob assignment. Comparing raw JSON
// would report an untouched brand as dirty and re-introduce the unconditional prompt sideways.
// Rebuilt by re-inserting every key in REVERSE order, recursively — same data, different insertion
// order, which is what `JSON.stringify` is sensitive to. (A `JSON.stringify(o, keyArray)` replacer
// would be wrong here: the array form FILTERS properties recursively, so it drops every nested key
// not named at the top level and the two sides then differ in content rather than order.)
const reverseKeys = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(reverseKeys);
  if (v === null || typeof v !== 'object') return v;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v as Record<string, unknown>).reverse()) {
    out[k] = reverseKeys((v as Record<string, unknown>)[k]);
  }
  return out;
};
const reordered = reverseKeys(structuredClone(aurora)) as BrandInput;
// Guard the fixture: if the rebuild did not actually change the serialization, the assertion below
// would pass without exercising normalization at all — a check that cannot fail (docs/34).
ok(JSON.stringify(reordered) !== JSON.stringify(aurora),
  'fixture check — the reordered clone really does serialize differently');
ok(!isDirty(reordered, provenanceOf({ kind: 'file' }, aurora)),
  'KEY ORDER is normalized — a re-serialized identical brand is not dirty');

// Array order, by contrast, is meaningful — `modes` is the engine's canonical order (docs/11).
//
// `modes` is SET EXPLICITLY on both sides rather than read off the example brand, because the
// examples leave it undefined: the first version of this guarded with `(modes ?? []).length < 2 ||
// isDirty(...)`, which short-circuited to true and passed while `sortKeys` was mutated to sort
// arrays as well as keys. An assertion that cannot fail reports that as a pass (docs/34).
const modesBase = structuredClone(aurora);
modesBase.modes = ['light', 'dark'];
const remoded = structuredClone(modesBase);
remoded.modes = ['dark', 'light'];
ok(isDirty(remoded, provenanceOf({ kind: 'file' }, modesBase)),
  'ARRAY order is significant — reordering modes IS dirty');

// =============================================================================================
// 2. The three seed outcomes
// =============================================================================================
console.log('\n#721 — three seed outcomes, and state 2 is not a failure');

const absent: SeedOutcome = { state: 'absent' };
const restored: SeedOutcome = { state: 'present', recovered: true, contractOk: true, detail: '312 color vars, modes light/dark' };
const unrecoverable: SeedOutcome = { state: 'present', recovered: false, contractOk: true, detail: '312 color vars, modes light/dark' };
const failure: SeedOutcome = { state: 'error', message: 'read-back failed: boom' };

ok(!isSeedFailure(absent), 'state 3 (not a Prism3 file) is not a failure');
ok(!isSeedFailure(restored), 'state 1 (restored exactly) is not a failure');

// THE CENTRAL ASSERTION OF THIS TICKET. The shipped `{ok, summary}` could not express this: the
// file is recognized, the contract holds, and the knobs are still not the file's. Reported as
// ok:true it is silently wrong (the user believes the knobs came from the file); as ok:false it is
// wrong the other way (nothing failed). #721 requires it be a first-class success.
ok(!isSeedFailure(unrecoverable), 'state 2 (present, unrecoverable) is NOT presented as a failure');
ok(isUnrecoverable(unrecoverable), 'state 2 is nonetheless identifiable as unrecoverable');
ok(isSeedFailure(failure), 'a read-back error IS a failure');

// Distinguishable pairwise — a collapse to two states would make one of these equal.
const key = (o: SeedOutcome): string => `${o.state}/${isSeedFailure(o)}/${isUnrecoverable(o)}`;
ok(new Set([absent, restored, unrecoverable, failure].map(key)).size === 4,
  'all four shapes are pairwise distinguishable (a two-state model collapses one)');

// `recovered` and `contractOk` are orthogonal: a file can hold a good blob and fail the contract.
const blobOkContractBad: SeedOutcome = { state: 'present', recovered: true, contractOk: false, detail: 'FAILED: aliasTargets' };
ok(isSeedFailure(blobOkContractBad) && !isUnrecoverable(blobOkContractBad),
  'recovered and contractOk are INDEPENDENT — a good blob with a failed contract is a failure but not unrecoverable');

// ---------------------------------------------------------------------------------------------
// The join, and the ARRIVAL ORDER of the two reads it joins
// ---------------------------------------------------------------------------------------------
console.log('\n#722 — the seed join does not depend on which boot read arrives first');

const themed = { present: true, ok: true, detail: '312 color vars, modes light/dark' };

ok(joinSeed({ present: false, ok: true, detail: 'nothing here' }).state === 'absent',
  'no variables + a clean read = state 3, absent');
// The two `!present` cases must NOT collapse: an empty file is ordinary, a crashed read is a failure,
// and reported as "absent" the user would theme over a file whose contents were never established.
ok(joinSeed({ present: false, ok: false, detail: 'read-back failed: boom' }).state === 'error',
  'no variables + a FAILED read = state error, not absent (the two !present cases stay apart)');
ok(isUnrecoverable(joinSeed(themed, false)), 'variables present with no restored input = state 2');
ok(!isUnrecoverable(joinSeed(themed, true)), 'variables present WITH a restored input = state 1');

// THE ORDERING BUG THIS PAIR EXISTS FOR. `seed-info` and `restore-input` are independent posts. If
// the seed lands first, `recovered` is false at join time — and without `withRecovered` it stays
// false, so the pill claims "knobs not stored in this file" over knobs restored a moment later.
// Reachable today only by the plugin's scheduling happening to post the restore first, which is an
// accident in another context, not a guarantee.
const seedFirst = joinSeed(themed, false);
ok(isUnrecoverable(seedFirst), 'seed-info arriving FIRST joins as unrecoverable (nothing restored yet)');
ok(!isUnrecoverable(withRecovered(seedFirst, true)),
  'a LATE restore-input repairs it — order-independence is the assertion, not the comment');
ok(isUnrecoverable(withRecovered(seedFirst, false)),
  'a late restore that did NOT happen changes nothing');

// `recovered` only ever moves toward true: a restore cannot un-happen.
ok(!isUnrecoverable(withRecovered(joinSeed(themed, true), false)),
  'withRecovered never un-sets a restore that already landed');
// And it must not rewrite the other two states, which have no `recovered` to repair.
ok(withRecovered(joinSeed({ present: false, ok: true, detail: '' }, false), true).state === 'absent',
  'repairing an ABSENT outcome leaves it absent (there is no restore to record)');
ok(withRecovered(joinSeed({ present: false, ok: false, detail: 'boom' }, false), true).state === 'error',
  'repairing an ERROR outcome leaves it an error');

// =============================================================================================
// 3. Reset returns the origin exactly
// =============================================================================================
console.log('\n#721 — reset returns the origin exactly, asserted against the stored baseline');

const pReset = provenanceOf({ kind: 'import', label: 'harbor' }, harbor);
ok(JSON.stringify(originBaseline(pReset)) === JSON.stringify(harbor),
  'the baseline round-trips the input it was created from');
ok(!isDirty(originBaseline(pReset), pReset), 'resetting to the baseline leaves a NOT-dirty state');

// The baseline must be immune to mutation from BOTH sides, or "reset to origin" silently resets to
// wherever the state drifted.
//
// COMPARED AGAINST AN INDEPENDENT SNAPSHOT, NOT AGAINST ITSELF — and this is the instructive part,
// because the first version of these two assertions read `isDirty(originBaseline(p), p)`. That asks the
// baseline whether it equals the baseline. With the clone removed from either `provenanceOf` or
// `originBaseline` the two sides become the SAME OBJECT, so it is `x === x`: it passes whether the
// isolation holds or not. Two deliberate mutations (drop each clone) both survived it, in a test
// whose own comment cited the rule (docs/34, and the #710 sweep).
//
// `expected` is captured BEFORE any mutation and never touched again, so it is a genuinely
// independent record of what the baseline is supposed to be.
const source = structuredClone(harbor);
const expected = JSON.stringify(structuredClone(harbor));
const pClone = provenanceOf({ kind: 'file' }, source);
source.primary = { ...source.primary, l: 0.01 };
ok(JSON.stringify(originBaseline(pClone)) === expected,
  'mutating the SOURCE object after the load cannot move the baseline');
const handedOut = originBaseline(pClone);
handedOut.primary = { ...handedOut.primary, l: 0.99 };
ok(JSON.stringify(originBaseline(pClone)) === expected,
  'mutating a HANDED-OUT baseline cannot move the stored one');

// =============================================================================================
// 4. Every writer declares an origin
// =============================================================================================
console.log('\n#722 — every writer declares an origin');

// This is the part a test CANNOT fully carry, and saying so is the point. The real enforcement is
// `loadBrand(input, origin)`: origin is a REQUIRED positional parameter, so a fifth writer that
// forgets one fails `npm run -w @prism3/studio typecheck` — the check runs at build time over every
// call site, which is stronger than anything this file could assert about code it does not call.
//
// What this section pins is that the ENUMERATION stays honest — but READ THE NEXT PARAGRAPH before
// trusting the `never` below to do it.
//
// THIS FILE IS NOT TYPECHECKED BY ANY GATE. `apps/studio/tsconfig.json` includes `src` only, and
// `tsx` strips types without checking them — verified with `tsc --listFiles`, which reads
// `src/provenance.ts` and not this file. So the `default: never` in `describe` is documentation, not
// a gate: a sixth `Origin` kind would NOT fail here. The real compile-time enforcement is
// `originLabel` in `src/main.ts`, which is inside the include and switches over the same union
// without a default — a sixth kind fails `npm run -w @prism3/studio typecheck` there with
// TS2366 (verified by mutation). Saying which of two similar-looking checks is the load-bearing one
// is the whole point of docs/34; a comment claiming this one is would have been believed.
const ALL_ORIGINS: readonly Origin[] = [
  { kind: 'none' },
  { kind: 'example', id: 'aurora' },
  { kind: 'new' },
  { kind: 'import', label: 'x' },
  { kind: 'file' },
];

const describe = (o: Origin): string => {
  switch (o.kind) {
    case 'none': return 'empty state';
    case 'example': return `example ${o.id}`;
    case 'new': return 'new brand';
    case 'import': return `import ${o.label}`;
    case 'file': return 'this Figma file';
    // Kept for readability, NOT as the gate — see above. `src/main.ts`'s `originLabel` is the gate.
    default: { const _never: never = o; return _never; }
  }
};

ok(ALL_ORIGINS.length === 5, 'five origins — four writers plus the empty state');
ok(ALL_ORIGINS.every((o) => describe(o).length > 0), 'every origin is describable (the union is exhaustive)');
ok(new Set(ALL_ORIGINS.map((o) => o.kind)).size === ALL_ORIGINS.length, 'no duplicate origin kinds');

// Only `none` is the empty state — the reason `new` is a separate kind. A deliberate blank brand has
// an origin and can be dirty against it; the empty state has neither.
ok(ALL_ORIGINS.filter((o) => o.kind === 'none').length === 1,
  'exactly one origin is the empty state ("new brand" is a LOADED blank, not the absence of an origin)');

// =============================================================================================
console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} — ${executed} assertions executed`);
process.exit(failed === 0 ? 0 : 1);
