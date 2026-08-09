/**
 * Prism3 engine — COMPONENT-DEF TYPECHECK GATE (#657).
 *
 *   npx tsx packages/engine/typecheck-components.ts
 *
 * WHAT WAS OPEN. The component defs under `packages/engine/components/` were typechecked by
 * nothing. There was no root and no engine `tsconfig.json`; the three real ones
 * (`apps/plugin/tsconfig.main.json`, `tsconfig.ui.json`, `apps/studio/tsconfig.json`) reached
 * `components/button.ts` ONLY through `apps/plugin/src/main.ts`'s import, and only since #483 wired
 * the component lane. And `test.ts` runs under `tsx`, which TRANSPILES without typechecking — 2040
 * assertions, not one of them a type. So `button.ts` authored `notes.evolution` in #487,
 * `component-schema.ts` declared only `{ contested?, unverified? }`, and the two disagreed for five
 * PRs with no failure anywhere. It surfaced by accident when #483's plugin call site pulled
 * `button.ts` into a tsconfig for the first time.
 *
 * MEASURED, NOT ARGUED (#657's review comment, reproduced here on f02d30f before this gate existed).
 * One mutation shape — typo an existing `notes` key so it no longer matches the schema — in two defs:
 *
 *     button.ts      `evolution:` → `evolutoin:`   plugin typecheck FAILS (TS2561).  Caught.
 *     text-field.ts  `contested:` → `contestd:`    everything PASSES.                Invisible.
 *                                                  test.ts 2040/0, regen --check 104.
 *
 * All five defs carry a `notes` key, so all five were exposed and four were silent.
 *
 * AND THE ASYMMETRY IS WORSE THAN A UNIFORM HOLE. `button.ts`'s coverage was an accident of the
 * import graph, not a decision. Uniformly open is at least legible — nobody would believe the defs
 * were checked. One checked def and four unchecked ones, with nothing saying which is which, invites
 * the next author to infer from `button.ts`'s failure that the schema is enforced. It also drifts in
 * the SAFE-LOOKING direction: the day a PR stops importing `button` from the plugin, coverage goes
 * 1 → 0 with every gate green and no diff that looks like it removed a check. `docs/34` shape 9
 * names this family — a check whose reach is an accident of another thing's structure rather than a
 * declared scope — and cites this issue as its widest instance.
 *
 * WHAT THIS GATE COMPARES, and why that is the design. `packages/engine/tsconfig.json` DECLARES the
 * scope; this file checks that the declaration is honored, from two independent sources:
 *
 *   the def list   ← `git ls-files packages/engine/components`   (git's index)
 *   the checked set ← `tsc --listFiles`                          (tsc's own report of what it read)
 *
 * Neither is derived from the other, and crucially NEITHER is derived from the tsconfig's `include`
 * globs. Reading `include` and confirming it mentions `components/**` would be `docs/34` shape 1 —
 * the gate reading the declaration it is checking, which can only confirm the declaration is
 * self-consistent, which it always is. `--listFiles` is what tsc actually opened.
 *
 * THE REQUIREMENT THAT IS EASY TO MISS, AND IS THE POINT. **A passing `tsc --noEmit` proves nothing
 * about which files it read.** That is precisely the hole being closed: the old coverage was real and
 * invisible, and its disappearance would have been invisible too. A green typecheck over four of five
 * defs is the same defect in a new costume. So this gate asserts REPRESENTATION — every tracked def
 * appears in the typechecked set, by name — and not merely that the typecheck passed.
 *
 * BOTH DIRECTIONS, for the reason #387 and #670 both landed on. Forward: every def git tracks is in
 * the checked set (catches a def added under a path the `include` misses, or an `include` narrowed).
 * Converse: every `components/*.ts` file tsc read is a def git tracks (catches untracked residue
 * inflating the coverage number — the #653 shape, where the filesystem lies about a rename left
 * half-done). Forward alone would report clean over a checked set padded with a stray.
 *
 * GIT, NOT `existsSync`. #653 measured the same commit reporting different truths in two trees
 * because untracked rename residue was still on disk in one of them. A gate whose subject is "what
 * this repo contains" reads the index.
 *
 * NOT A BUILD. `--noEmit` produces no output, and the engine stays buildless — that invariant is not
 * moving. Two things hold it here rather than a comment claiming it: the gate asserts
 * `compilerOptions.noEmit` is true in tsc's OWN resolved view (`--showConfig`, not this file's parse
 * of the JSON), and after the run it asserts no `.js`/`.d.ts` landed anywhere in `packages/engine/`.
 * The second is the consequence, the first is the declaration; `docs/34` shape 8 is why both are
 * here. The scope of the second is not a guess: mutating `noEmit` away for real wrote 8 `.js` files
 * at the engine root and none in `components/`, so a check scoped to the defs directory would have
 * reported clean over the exact outcome it exists to prevent.
 *
 * WHY NOT THE RUNTIME OPTION INSTEAD — and a correction to #657's body, which called it "weaker".
 * That framing is wrong. Teaching `validateComponentDef` to reject unknown keys would have caught
 * BOTH mutations above, since misspellings arrive as extra keys and `test.ts` already validates all
 * five defs. Its real limit is narrower and different: it cannot see a TYPE MISMATCH on a
 * correctly-named key (`states: 'default'` where a `string[]` is declared), and it only covers defs
 * the suite actually validates. So the two are complementary with different blind spots, not ranked.
 * The tsconfig is the right primary because it covers the mismatches runtime cannot — and because a
 * declared `include` is a reach the repo states rather than inherits, which is the shape-9 lesson. If
 * this ever proves noisy, the runtime check is a stronger fallback than #657 claims.
 *
 * WHAT THIS DELIBERATELY DOES NOT COVER. The other 42 `.ts` files in `packages/engine/` are outside
 * the `include`; see that file's own comment for the measurement (398 errors wide, 0 narrow, and 375
 * of the 398 are missing ambient Node types). Widening is a real follow-up and a separate decision
 * about whether the engine takes a devDependency — not a rider on this one. Note the defs' full
 * transitive import graph IS checked either way (13 files today, including theme.ts and modes.ts):
 * narrowing the `include` narrows which UNRELATED files are checked, not how deeply the defs are.
 */
import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = realpathSync(resolve(here, '../..'));

const TSCONFIG = 'packages/engine/tsconfig.json';
// The one path literal this gate holds, and per `docs/34` shape 9 the thing to ask about it is what
// happens when it moves. Two answers: the FLOOR below fails if it enumerates fewer than 3 defs (a
// repointed or stale directory reports zero, and a detector that finds nothing must not report
// clean), and the converse direction fails if tsc reads a def this enumeration missed. A literal
// with a non-empty floor and a converse check is one comparison away from being able to fail; a bare
// literal is not.
const DEFS_DIR = 'packages/engine/components';

/** Every `.ts` file git tracks under the defs directory, repo-relative. The oracle side: git's index,
 *  never the filesystem (#653 — untracked rename residue makes `existsSync` lie) and never the
 *  tsconfig's own `include` (`docs/34` shape 1). */
export const parseTrackedDefs = (gitStdout: string): string[] =>
  gitStdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.endsWith('.ts'))
    .sort();

/** The files tsc reports it actually read, normalized to repo-relative.
 *
 *  THE RULE IS THREE CONJUNCTS, and each one is load-bearing — measured, not assumed, because this
 *  parser is what makes every representation assertion below meaningful. If it OVER-reports, a file
 *  tsc merely mentioned reads as a file tsc checked, and the gate's central claim becomes satisfiable
 *  by a diagnostic that names the very def it should be reporting as missing.
 *
 *    unindented  — `--listFiles` prints file paths flush left; every explanatory continuation line
 *                  (`--explainFiles`' "Library referenced via …", "Matched by include pattern …",
 *                  TS2688's "The file is in the program because:") is indented. This is the conjunct
 *                  that stops a continuation naming a path from counting as coverage.
 *    absolute + under repoRoot — drops `lib.es2022.d.ts` and anything resolved outside the tree
 *                  (measured: 57 lib files in a clean run, none of them coverage of anything).
 *    source extension — the last filter, and the reason no diagnostic can slip through: this gate
 *                  runs tsc with `cwd: repo`, so tsc prints diagnostics with REPO-RELATIVE paths
 *                  (`packages/engine/components/text-field.ts(159,5): error TS2561: …`) which fail
 *                  the absolute test, and a diagnostic ends in its message rather than in `.ts`.
 *
 *  An earlier draft carried a fourth guard matching `(line,col): error TSnnnn` explicitly. It was
 *  removed rather than kept: with the three above it is unreachable, and its self-check assertion
 *  passed with the guard deleted — an assertion that cannot fail is worse than no assertion, because
 *  it reports the guard as tested (`docs/34` shape 4). The measurement replaces it. */
export const parseListedFiles = (tscStdout: string, repoRoot: string): string[] => {
  const out: string[] = [];
  for (const raw of tscStdout.split('\n')) {
    if (raw !== raw.trimStart()) continue; // indented → an explanation, not a file tsc read
    const line = raw.trim();
    if (!line.startsWith(repoRoot + '/')) continue; // lib files, and anything outside the tree
    if (!/\.(ts|tsx|json)$/.test(line)) continue;
    out.push(line.slice(repoRoot.length + 1));
  }
  return out.sort();
};

/** The type errors tsc reported. Kept separate from the file list because they arrive on the same
 *  stream, and because the two failures they cause are different: a diagnostic means a def is wrong,
 *  an unrepresented def means the gate is. */
export const parseDiagnostics = (tscStdout: string): string[] =>
  tscStdout.split('\n').filter((l) => /error TS\d+/.test(l)).map((l) => l.trim());

/** FORWARD: which tracked defs are absent from what tsc read. Set membership, never a count — a gate
 *  with a scope asserts each promised surface is represented, never merely that the totals agree
 *  (`docs/34`, scope silence). */
export const unrepresented = (defs: string[], listed: string[]): string[] => {
  const seen = new Set(listed);
  return defs.filter((d) => !seen.has(d));
};

/** CONVERSE: which `components/*.ts` files tsc read are NOT defs git tracks. Untracked residue in the
 *  checked set inflates coverage while the forward direction stays green. */
export const strays = (defsDir: string, defs: string[], listed: string[]): string[] => {
  const tracked = new Set(defs);
  return listed.filter((f) => f.startsWith(defsDir + '/') && f.endsWith('.ts') && !tracked.has(f));
};

// ---- SELF-CHECK: can the gate still see what it claims to, and can it still fail? ------------------
// Every sample drives the exported functions above — the same ones the real run calls, never a
// reimplementation of the parsing or the membership test (`docs/34` shape 2: a self-check that
// samples a reimplementation validates the reimplementation, not the gate that ships). Each sample
// tests one claim this file makes, in both directions where the claim has two.
const SAMPLE_ROOT = '/sample/repo';
// Shaped after real `tsc --listFiles` output, including the two line forms that are the reason the
// parser has a rule at all. Both are ADVERSARIAL on purpose: each would be miscounted as coverage by
// a parser missing one conjunct, and each names a def the forward assertion below reports as missing —
// so if either were counted, the gate's central claim would go green over a def tsc never read.
const SAMPLE_TSC_OUT = [
  `/usr/lib/node_modules/typescript/lib/lib.es2022.d.ts`,
  `${SAMPLE_ROOT}/packages/engine/theme.ts`,
  `${SAMPLE_ROOT}/packages/engine/component-schema.ts`,
  `${SAMPLE_ROOT}/packages/engine/components/alpha.ts`,
  `${SAMPLE_ROOT}/packages/engine/components/beta.ts`,
  // A diagnostic. Repo-relative, as tsc prints it when run with `cwd: repo` — and it names `gamma`,
  // the def the forward check must still report as unrepresented.
  `packages/engine/components/gamma.ts(159,5): error TS2561: Object literal may only specify known properties, but 'contestd' does not exist in type '{ contested?: string[]; }'. Did you mean to write 'contested'?`,
  // An `--explainFiles`-style continuation: INDENTED, absolute, under the root, ending in `.ts`. It
  // satisfies every conjunct except the indent one, which is what makes that conjunct testable.
  `  The file is in the program because:`,
  `    ${SAMPLE_ROOT}/packages/engine/components/gamma.ts`,
  // Unindented and under the root, but not a source file — a `tsc --noEmit -b`-style status line, and
  // the shape that makes the EXTENSION conjunct testable. Without it that conjunct is unreachable in
  // this sample, so its assertion would pass with the line deleted (measured: it did).
  `${SAMPLE_ROOT}/packages/engine/tsconfig.tsbuildinfo`,
].join('\n');

const selfFails: string[] = [];
const sampleDefs = parseTrackedDefs('packages/engine/components/alpha.ts\npackages/engine/components/beta.ts\npackages/engine/components/gamma.ts\n\n');
const sampleListed = parseListedFiles(SAMPLE_TSC_OUT, SAMPLE_ROOT);

// 1. Def enumeration: blank lines dropped, nothing invented.
if (sampleDefs.length !== 3) selfFails.push('parseTrackedDefs miscounts a `git ls-files` listing (blank-line or trim handling)');

// 2. File-list parsing, which is the load-bearing half — if this over-reports, every representation
//    assertion below becomes satisfiable by a diagnostic mentioning the file it claims is missing.
if (!sampleListed.includes('packages/engine/components/alpha.ts')) selfFails.push('parseListedFiles drops a real file tsc listed');
if (sampleListed.some((f) => f.includes('lib.es2022'))) selfFails.push('parseListedFiles counts a file outside the repo as coverage');
// The trap, and the whole reason the sample carries those two adversarial lines: `gamma.ts` is named
// by a diagnostic AND by an indented continuation, and tsc never read it. Each of these fails if the
// corresponding conjunct is dropped — verified by deleting each one in turn.
if (sampleListed.includes('packages/engine/components/gamma.ts')) {
  selfFails.push('parseListedFiles counts a file tsc merely MENTIONED as a file tsc CHECKED — coverage can be faked by a diagnostic');
}
if (sampleListed.length !== 4) {
  selfFails.push(`parseListedFiles read ${sampleListed.length} of the sample's 4 real files — the file/non-file rule has drifted`);
}

// 3. Diagnostics: detected when present, and NOT hallucinated from a clean run — a gate that cannot
//    see a type error is the one thing this whole file exists to provide.
if (parseDiagnostics(SAMPLE_TSC_OUT).length !== 1) selfFails.push('parseDiagnostics does not report exactly the one error in the sample');
if (parseDiagnostics(sampleListed.join('\n')).length) selfFails.push('parseDiagnostics reports an error on output containing none (false positive)');

// 4. FORWARD representation, both directions. `gamma.ts` is tracked and unlisted, which is the #657
//    defect in miniature: the typecheck passes over it because it was never read.
const fwd = unrepresented(sampleDefs, sampleListed);
if (!fwd.includes('packages/engine/components/gamma.ts')) {
  selfFails.push('a tracked def absent from the typechecked set is NOT reported — the representation assertion cannot fail');
}
if (fwd.includes('packages/engine/components/alpha.ts')) {
  selfFails.push('a tracked def that IS in the typechecked set is wrongly reported (false positive)');
}
if (unrepresented(['packages/engine/components/alpha.ts'], sampleListed).length) {
  selfFails.push('representation is not satisfied by a def that is genuinely present');
}

// 5. CONVERSE. An untracked stray in the checked set must be reported, and a tracked def must not.
//    Note these fixtures pass their OWN directory, not the real run's `DEFS_DIR`. That is deliberate:
//    threading the live literal through the self-check couples the two (`docs/34` shape 2), and it
//    measurably swallowed a distinct failure — repointing `DEFS_DIR` at a directory with no defs
//    failed HERE, on a fixture path that no longer matched, instead of at the FLOOR that exists to
//    catch exactly that. The fixture tests the function; the floor tests the literal.
const SAMPLE_DEFS_DIR = 'packages/engine/components';
const stray = strays(SAMPLE_DEFS_DIR, sampleDefs, [...sampleListed, `${SAMPLE_DEFS_DIR}/residue.ts`]);
if (!stray.includes(`${SAMPLE_DEFS_DIR}/residue.ts`)) {
  selfFails.push('an untracked file in the typechecked set is NOT reported — coverage can be inflated by residue');
}
if (stray.some((f) => sampleDefs.includes(f))) selfFails.push('the converse check flags a tracked def (false positive)');
// And it must not fire on files outside the defs directory, which are legitimately in the graph.
if (strays(SAMPLE_DEFS_DIR, sampleDefs, ['packages/engine/theme.ts']).length) {
  selfFails.push('the converse check flags an imported file outside the defs directory');
}

if (selfFails.length) {
  console.error("\n❌ the component-def typecheck gate's own detection is broken — it cannot see what it claims to:\n");
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}

// ---- the real run --------------------------------------------------------------------------------

if (!existsSync(resolve(repo, TSCONFIG))) {
  console.error(`\n❌ ${TSCONFIG} not found — this gate has no declared scope to check.`);
  process.exit(1);
}

const git = spawnSync('git', ['-C', repo, 'ls-files', DEFS_DIR], { encoding: 'utf8' });
if (git.status !== 0) {
  console.error(`\n❌ \`git ls-files ${DEFS_DIR}\` failed — the def list is this gate's oracle, so an absence here is not a pass.`);
  console.error(git.stderr || git.stdout);
  process.exit(1);
}
const defs = parseTrackedDefs(git.stdout);

// FLOOR — did it look? A detector that recognizes nothing must fail, not report clean. This is the
// specific mitigation for DEFS_DIR being a literal: #658's review found a gate printing
// "0 engine files in the bundle … ✓ clean", a true statement about an empty set.
if (defs.length < 3) {
  console.error(`\n❌ only ${defs.length} component def(s) tracked under ${DEFS_DIR}/ — expected at least 3.`);
  console.error('   Either the defs moved (repoint DEFS_DIR above) or this gate is checking an empty set and');
  console.error('   would otherwise report clean over nothing.');
  process.exit(1);
}

// tsc comes from the workspaces' devDependency (apps/studio, apps/plugin both pin ^5.6.3); resolve it
// rather than hard-coding a node_modules path, so a hoist-layout change fails loudly at resolution
// instead of silently skipping the run.
let tscBin: string;
try {
  tscBin = createRequire(resolve(repo, 'package.json')).resolve('typescript/bin/tsc');
} catch {
  console.error('\n❌ could not resolve `typescript/bin/tsc`. Run `npm ci` at the repo root — tsc is a workspace devDependency.');
  process.exit(1);
}

// `--listFiles` is the whole reason this is a script and not a bare `tsc --noEmit` line in ci.yml: it
// makes tsc report which files it read, which is the only thing that can distinguish a clean run over
// all five defs from a clean run over one.
const tsc = spawnSync(process.execPath, [tscBin, '-p', TSCONFIG, '--listFiles'], { cwd: repo, encoding: 'utf8' });
const out = `${tsc.stdout ?? ''}${tsc.stderr ?? ''}`;
const diagnostics = parseDiagnostics(out);
const listed = parseListedFiles(out, repo);

if (!listed.length) {
  console.error('\n❌ tsc reported no files at all — the run did not happen, which is not a pass. Raw output:\n');
  console.error(out.trim() || '(empty)');
  process.exit(1);
}
if (tsc.status !== 0 && !diagnostics.length) {
  console.error(`\n❌ tsc exited ${tsc.status} without reporting a type error — a harness failure, not a clean tree. Raw output:\n`);
  console.error(out.trim() || '(empty)');
  process.exit(1);
}

// NOT A BUILD, asserted twice. The declaration, in tsc's own resolved view rather than this file's
// parse of the JSON — so a `noEmit` deleted, overridden or shadowed by an `extends` fails here.
const shown = spawnSync(process.execPath, [tscBin, '-p', TSCONFIG, '--showConfig'], { cwd: repo, encoding: 'utf8' });
let noEmit: unknown;
try {
  noEmit = JSON.parse(shown.stdout).compilerOptions?.noEmit;
} catch {
  noEmit = undefined;
}
// And the consequence: nothing emitted. `docs/34` shape 8 — assert what someone would report as the
// bug (the engine grew a build step), not only the mechanism that prevents it.
//
// SCOPED TO THE WHOLE ENGINE, not just the defs directory, because that is where emit actually lands.
// The first draft checked only beside the defs and was measured wrong the first time `noEmit` was
// mutated away for real: tsc wrote 8 `.js` files at `packages/engine/` — one per file in the defs'
// transitive import graph (theme, modes, eval, color, ramp, scale, vocabulary, component-schema) — and
// exactly ZERO inside `components/`, because tsc mirrors each input's own directory. The narrow check
// would have reported clean over the precise outcome it exists to prevent.
const engineDir = resolve(repo, 'packages/engine');
const emitted = [engineDir, resolve(repo, DEFS_DIR)].flatMap((dir) =>
  readdirSync(dir)
    .filter((f) => /\.(js|mjs|cjs)$/.test(f) || f.endsWith('.d.ts'))
    .map((f) => `${dir.slice(repo.length + 1)}/${f}`),
);

const failures: string[] = [];
if (diagnostics.length) failures.push(`${diagnostics.length} type error(s) in the component defs`);
const missing = unrepresented(defs, listed);
if (missing.length) failures.push(`${missing.length} tracked def(s) absent from the typechecked set`);
const residue = strays(DEFS_DIR, defs, listed);
if (residue.length) failures.push(`${residue.length} untracked file(s) inflating the typechecked set`);
if (noEmit !== true) failures.push(`${TSCONFIG} does not resolve to noEmit: true — the engine stays buildless`);
if (emitted.length) failures.push(`${emitted.length} emitted file(s) in packages/engine/ — this gate must not build`);

if (failures.length) {
  console.error('\n❌ component-def typecheck gate:\n');
  for (const f of failures) console.error(`    ${f}`);
  if (diagnostics.length) {
    console.error('\n  type errors:');
    for (const d of diagnostics) console.error(`    ${d}`);
  }
  if (missing.length) {
    console.error('\n  tracked but NOT typechecked — a green typecheck over a subset of the defs is the');
    console.error(`  #657 defect itself. Widen \`include\` in ${TSCONFIG}:`);
    for (const m of missing) console.error(`    ${m}`);
  }
  if (residue.length) {
    console.error('\n  typechecked but NOT tracked by git — untracked residue is not coverage:');
    for (const r of residue) console.error(`    ${r}`);
  }
  if (emitted.length) {
    console.error('\n  emitted into the engine — this gate runs a CHECK, not a build:');
    for (const e of emitted) console.error(`    ${e}`);
  }
  process.exit(1);
}

console.log(`✓ component defs typecheck clean — ${defs.length} tracked def(s), all present in the ${listed.length} file(s) tsc read (noEmit, nothing emitted).`);
for (const d of defs) console.log(`    ${d}`);
