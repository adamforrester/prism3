/**
 * TokenPress suite entry point — dependency-free, run via tsx.
 *
 *   npx tsx apps/tokenpress/test.ts
 *
 * The ported suite was 21 vitest files. vitest 4.x depends on (and peer-requires) vite, and the
 * repo runs ONE bundler, so the runner was replaced by `test-harness.ts` and this entry point;
 * every ASSERTION in those 21 files is byte-identical to the vitest version, and the only edit per
 * file was its import line. That split is deliberate: it keeps "the port preserved behavior"
 * checkable by diff rather than by reading.
 *
 * The baseline this must reproduce, measured on the pristine copy at port commit 1 with real
 * vitest BEFORE the rewrite: 263 assertions across 21 files, 0 failing. `EXPECTED` below is that
 * per-file census. It is a hand-transcribed MEMORY of an independent measurement, not something
 * derived from this harness — which is the point. Deriving the expected count from the files this
 * runner just executed would make the check unable to fail (docs/34): a test silently dropped
 * during the rewrite would lower both sides of the comparison together and report a pass.
 *
 * So the count is asserted per FILE, not just in total. A total alone is satisfied by a test
 * vanishing from one file while another gains one, which is exactly the mistranslation a rewrite
 * risks.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summary, deepEqual, expect, test as harnessTest, run, resetCounters } from './test-harness';

const root = dirname(fileURLToPath(import.meta.url));

/**
 * `__PLUGIN_VERSION__` is a build-time constant: `exporter.ts` stamps it into every exported tree's
 * `$extensions.generator.version`, and the bundler substitutes it from `package.json`. vitest got it
 * for free, because vite's `define` also applies to the test transform — tsx has no such step, so
 * without this the 18 assertions that reach the exporter die on `is not defined`.
 *
 * Read from `package.json`, which is where the bundler reads it too. Hard-coding the string here
 * would let the two drift apart silently, and nothing would notice.
 */
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string };
(globalThis as Record<string, unknown>).__PLUGIN_VERSION__ = pkg.version;

/**
 * Per-file assertion counts, transcribed from the vitest run on the unmodified copy
 * (`npx vitest run --reporter=json`, port commit 1). Do NOT regenerate this from a run of this
 * harness — see the header. Sums to 263.
 */
const EXPECTED: Record<string, number> = {
  'tests/integration/dtcg-compliance-fixes.test.ts': 27,
  'tests/unit/alias-scope-inheritance.test.ts': 6,
  'tests/unit/blur-only-shadow-skip.test.ts': 7,
  'tests/unit/color-conversion.test.ts': 8,
  'tests/unit/css-var-symmetry.test.ts': 13,
  'tests/unit/dtcg-validator.test.ts': 31,
  'tests/unit/dtcg.test.ts': 2,
  'tests/unit/exporter.test.ts': 4,
  'tests/unit/float-noise-rounding.test.ts': 10,
  'tests/unit/font-weight-utils.test.ts': 18,
  'tests/unit/multi-format-export.test.ts': 11,
  'tests/unit/namespace-alias.test.ts': 17,
  'tests/unit/namespace-exporter-integration.test.ts': 15,
  'tests/unit/per-mode-directory-export.test.ts': 6,
  'tests/unit/scope-dimension-detection.test.ts': 9,
  'tests/unit/shadow-converter.test.ts': 10,
  'tests/unit/text-decoration.test.ts': 5,
  'tests/unit/token-name-utils.test.ts': 33,
  'tests/unit/token-naming.test.ts': 11,
  'tests/unit/typography-float-noise.test.ts': 16,
  'tests/unit/typography-weight-regression.test.ts': 4,
};

/**
 * Test files added to this suite AFTER the port, kept in a separate census from `EXPECTED` above.
 *
 * The split is the point, and it is not bookkeeping tidiness. `EXPECTED` is a hand-transcribed
 * memory of an independent measurement — 263 assertions from real vitest on the pristine copy — and
 * its whole value is that it was written down before this harness existed and has not moved since.
 * Adding a new file's count into it would silently redefine the number the port is checked against,
 * so "the port preserved behavior" and "we have since added tests" would become one unfalsifiable
 * figure. A baseline that grows is not a baseline.
 *
 * So new work lands here, `EXPECTED` stays at 263 forever, and both are asserted per file. The
 * runner reports the two sums separately for the same reason.
 */
const ADDED: Record<string, number> = {
  // #709 — OPACITY-scoped values exported 100× out of DTCG range. The pre-existing coverage
  // asserted the `$type` and never the value, which is how a 100× range error passed a green suite.
  'tests/unit/opacity-percent-to-fraction.test.ts': 11,
};

// ---- the harness checks itself first -------------------------------------------------------
// A harness that reports a pass because it cannot tell the difference is worse than no harness, so
// the comparison function and the loud-failure guard are asserted before any ported test runs.
let selfFailed = 0;
const self = (cond: boolean, label: string): void => {
  if (!cond) {
    selfFailed++;
    console.error(`  ✗ [harness] ${label}`);
  }
};
self(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), 'deepEqual: nested equal');
self(!deepEqual({ a: 1 }, { a: 1, b: undefined }), 'deepEqual: present-undefined ≠ absent');
self(!deepEqual([1, 2], [2, 1]), 'deepEqual: array order matters');
self(!deepEqual({ a: 1 }, { a: '1' }), 'deepEqual: 1 ≠ "1"');
self(deepEqual(NaN, NaN), 'deepEqual: NaN equals NaN');
self(!deepEqual(0, -0), 'deepEqual: 0 ≠ -0 (Object.is)');
{
  // The guard: an unimplemented matcher must THROW, not silently pass.
  let threw = false;
  try {
    (expect(1) as unknown as { toBeTruthy: () => void }).toBeTruthy();
  } catch {
    threw = true;
  }
  self(threw, 'unimplemented matcher throws instead of no-opping');
}
{
  // A failing matcher must actually throw — otherwise every ported test passes vacuously.
  let threw = false;
  try {
    expect(1).toBe(2);
  } catch {
    threw = true;
  }
  self(threw, 'a false assertion throws');
  let negThrew = false;
  try {
    expect(1).not.toBe(1);
  } catch {
    negThrew = true;
  }
  self(negThrew, '.not inverts');
}

// The async path needs its own check. 15 ported bodies are `async`, so a harness that dropped the
// returned promise would report every async assertion as a pass no matter what it asserted — and
// would also let those bodies race each other through the state `beforeEach` sets up. Both are
// asserted here: a rejecting async body must be COUNTED as failed, and two async tests must not
// interleave.
const asyncSelf = async (): Promise<void> => {
  const order: string[] = [];
  const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 5));
  harnessTest('async: rejects', async () => {
    await settle();
    throw new Error('deliberate');
  });
  harnessTest('async: first', async () => {
    order.push('a-start');
    await settle();
    order.push('a-end');
  });
  harnessTest('async: second', async () => {
    order.push('b-start');
    await settle();
    order.push('b-end');
  });
  const before = summary();
  // `async: rejects` is SUPPOSED to fail, so its ✗ is muted — a real ✗ in the output should be
  // unambiguous.
  const realError = console.error;
  console.error = () => {};
  try {
    await run();
  } finally {
    console.error = realError;
  }
  const after = summary();
  self(after.failed - before.failed === 1, 'a rejecting async body is counted as failed');
  self(after.total - before.total === 3, 'async tests are counted');
  self(
    order.join(',') === 'a-start,a-end,b-start,b-end',
    `async tests run sequentially, not interleaved (got ${order.join(',')})`,
  );
};

// ---- run the ported suites ------------------------------------------------------------------
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) return e.name === 'sd' || e.name === 'sd-per-mode' ? [] : walk(p);
    return e.isFile() && e.name.endsWith('.test.ts') ? [p] : [];
  });

const files = walk(resolve(root, 'tests')).sort();
const perFile: Record<string, number> = {};

/** Compare what ran against the transcribed baseline, then exit. */
const report = (): void => {
  const { total, failed } = summary();
  const problems: string[] = [];

  const census = { ...EXPECTED, ...ADDED };
  for (const [file, want] of Object.entries(census)) {
    const got = perFile[file];
    if (got === undefined) problems.push(`${file}: MISSING — expected ${want} assertion(s), file did not run`);
    else if (got !== want) problems.push(`${file}: ran ${got}, expected ${want}`);
  }
  for (const file of Object.keys(perFile)) {
    if (!(file in census)) {
      problems.push(`${file}: ran ${perFile[file]} assertion(s) but is in neither EXPECTED nor ADDED — add it deliberately`);
    }
  }

  const portTotal = Object.values(EXPECTED).reduce((a, b) => a + b, 0);
  const addedTotal = Object.values(ADDED).reduce((a, b) => a + b, 0);
  const wantTotal = portTotal + addedTotal;

  console.log(`\n${'─'.repeat(72)}`);
  if (problems.length) {
    console.error('❌ census mismatch vs the pre-rewrite vitest baseline:');
    for (const p of problems) console.error(`    ${p}`);
  }
  if (failed > 0) console.error(`❌ ${failed} assertion(s) failed`);

  if (failed === 0 && problems.length === 0) {
    console.log(
      `✓ TokenPress: ${total} assertions passed across ${files.length} files — the ported ` +
        `${portTotal} match the pre-rewrite vitest baseline file by file, plus ${addedTotal} added since.`,
    );
    process.exit(0);
  }
  console.error(`\nTokenPress: ${total} run (${failed} failed), baseline ${wantTotal}.`);
  process.exit(1);
};

// Not top-level await: tsx transforms this to CJS unless the package is ESM, and a runner that only
// works under one module setting is a trap for whoever changes that setting.
const main = async (): Promise<void> => {
  await asyncSelf();
  if (selfFailed > 0) {
    console.error(`\n❌ harness self-check failed (${selfFailed}) — ported results would be meaningless.`);
    process.exit(1);
  }
  // The probes above are not part of the port's census.
  resetCounters();

  for (const abs of files) {
    const rel = relative(root, abs);
    console.log(`\n${rel}`);
    const before = summary();
    // Import declares the tests; `run()` executes them. Splitting the two is what keeps the 15
    // async bodies sequential — see test-harness.ts's `collect`.
    await import(abs);
    await run();
    const after = summary();
    perFile[rel] = after.total - before.total;
  }
};

main().then(report, (err) => {
  console.error(err);
  process.exit(1);
});
