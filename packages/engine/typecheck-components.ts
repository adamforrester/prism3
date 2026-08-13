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
 * ── THE REGISTRY ARM (#742, `docs/38` Arc 3) ────────────────────────────────────────────────────
 *
 * `components/index.ts` now holds the def set. `docs/38` Arc 3 states the constraint it has to
 * satisfy — *"the registry has to BE the thing the gate reads. A second list maintained beside it
 * would restore the defect that gate was written for"* — so the registry is this gate's SUBJECT and
 * git's index stays its ORACLE. Reading the registry to decide which defs to expect would be
 * `docs/34` shape 1 in its purest form: the gate confirming a list agrees with itself.
 *
 * THE GAP THIS ARM CLOSES, because it is not the obvious one. Adding a def file already makes it
 * typechecked — the `include` is a glob over the directory, so tsc reads it whether or not anything
 * imports it. Both directions above therefore went green over a def the registry had never heard
 * of, which is the *registry's* version of #657: a set that looks complete and silently is not.
 * Measured, not argued (#742, on b3bc865): a sixth def added to the directory and left out of the
 * registry passed this gate at exit 0 before this arm existed.
 *
 * WHY THE `include` WAS NOT NARROWED INSTEAD. Pointing `include` at `components/index.ts` would
 * have made registry membership structurally identical to coverage, and the forward direction above
 * would then report an unregistered def with no new code at all. It was rejected for two reasons.
 * The `include` records a MEASUREMENT and a scope decision (398 errors wide, 0 narrow — see that
 * file), which narrowing would rewrite for a reason unrelated to why it was chosen. And it couples
 * two failures that should stay apart: a def missing from the registry is a bookkeeping slip, and
 * under the narrow scope that slip would ALSO silently stop typechecking the def — one mistake
 * causing two losses, the second of them invisible. Kept apart, the def stays checked and the
 * registry failure is reported on its own terms.
 *
 * HOW THE ARM LINKS A FILE TO A REGISTRY ENTRY — by OBJECT IDENTITY, not by name. Each tracked def
 * file is imported, and its exports are tested for membership in `componentDefs` with `Set.has`. So
 * nothing here depends on `button.ts` exporting a binding called `button`, or on a def's `id`
 * matching its filename — conventions that hold today, and that a gate anchored on them would stop
 * detecting the moment one moved (`docs/34` shape 9). Both directions again: a tracked def file
 * contributing nothing to the set, and a set member no tracked def file exports (a def written
 * inline in the registry, or imported into it from outside the typechecked directory).
 *
 * WHAT THE REGISTRY ARM DOES NOT COVER, stated rather than implied. It asserts each def file
 * contributes AT LEAST ONE export to the set. A file that defines two defs and registers one passes
 * — the file contributes, so it is not reported. So does a file that only RE-EXPORTS a def defined
 * elsewhere. Closing either means deciding which of a module's exports *are* defs, and the only
 * classifier available is a shape test over the very type under test. One def per file is the
 * convention; this arm does not enforce it. The unregistered second def in such a file is still
 * typechecked by the arms above, and still invisible to every consumer that iterates the set.
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
import { fileURLToPath, pathToFileURL } from 'node:url';

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
// The registry (#742). Tracked, typechecked and checked in BOTH directions above exactly like any
// other file in the directory — it is set apart only where treating it as a def would be wrong: the
// FLOOR counts defs (and must not be satisfiable by the registry alone), and the registry cannot be
// asked to export itself into its own set. Same shape-9 question as `DEFS_DIR`, same answer: the run
// below fails if this literal names a file git does not track, so a renamed or deleted registry
// fails loudly instead of quietly widening the def set by one.
const REGISTRY = `${DEFS_DIR}/index.ts`;

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

/** The DEF files: every tracked `.ts` under the directory except the registry itself. Used only by
 *  the floor and the two registry directions; the forward and converse arms above keep running over
 *  the full tracked set, so the registry is typechecked and non-stray like everything else.
 *
 *  It removes exactly one path and nothing else, so it cannot swallow a real def — the self-check
 *  below asserts both halves of that, and the run asserts the removed path is genuinely tracked. */
export const defsOnly = (tracked: string[], registry: string): string[] =>
  tracked.filter((f) => f !== registry);

/** REGISTRY, FORWARD: which tracked def files contribute nothing to `componentDefs`. Membership is
 *  `Set.has` over the imported module's own export VALUES, so the link is object identity — a
 *  look-alike object with the same fields is not membership, and no filename/`id`/binding-name
 *  convention is load-bearing. `exportsOf` is injected so the self-check drives this function rather
 *  than a reimplementation of it (`docs/34` shape 2). */
export const unregistered = (
  defs: string[],
  exportsOf: (file: string) => unknown[],
  registry: ReadonlySet<unknown>,
): string[] => defs.filter((f) => !exportsOf(f).some((v) => registry.has(v)));

/** REGISTRY, CONVERSE: which members of `componentDefs` no tracked def file exports. Catches a def
 *  written inline in the registry, or imported into it from outside the defs directory — either of
 *  which puts a def in the iterated set that this gate's declared scope never typechecks, the
 *  registry-shaped twin of the untracked-residue case `strays` covers. */
export const unbacked = (registry: readonly unknown[], exported: ReadonlySet<unknown>): unknown[] =>
  registry.filter((d) => !exported.has(d));

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

// 6. THE REGISTRY EXCLUSION. One path removed, and only that one — the two halves are separate
//    assertions because they fail for opposite reasons: keeping the registry would let it satisfy
//    the floor by itself, and removing anything else would silently shrink the def set.
const SAMPLE_REGISTRY = `${SAMPLE_DEFS_DIR}/index.ts`;
const sampleTracked = [...sampleDefs, SAMPLE_REGISTRY].sort();
if (defsOnly(sampleTracked, SAMPLE_REGISTRY).includes(SAMPLE_REGISTRY)) {
  selfFails.push('the registry file is counted as a component def — the floor could then be satisfied without a single def');
}
if (defsOnly(sampleTracked, SAMPLE_REGISTRY).length !== sampleDefs.length) {
  selfFails.push('excluding the registry removed something else as well — a real def can be swallowed');
}

// 7. REGISTRY MEMBERSHIP, both directions and the identity property the whole arm rests on. The
//    fixtures are plain objects: this function's contract is `Set.has` over export values, and
//    nothing about it should depend on a def's shape.
const alphaDef = { id: 'alpha' };
const betaDef = { id: 'beta' };
const gammaDef = { id: 'gamma' };
const sampleExports = new Map<string, unknown[]>([
  [`${SAMPLE_DEFS_DIR}/alpha.ts`, [alphaDef]],
  [`${SAMPLE_DEFS_DIR}/beta.ts`, [betaDef]],
  [`${SAMPLE_DEFS_DIR}/gamma.ts`, [gammaDef]], // tracked, exports a def, and the registry omits it
]);
const sampleLookup = (f: string): unknown[] => sampleExports.get(f) ?? [];
const sampleRegistry = new Set<unknown>([alphaDef, betaDef]);
const unreg = unregistered(sampleDefs, sampleLookup, sampleRegistry);
if (!unreg.includes(`${SAMPLE_DEFS_DIR}/gamma.ts`)) {
  selfFails.push('a tracked def the registry omits is NOT reported — the registry could go stale and stay green');
}
if (unreg.includes(`${SAMPLE_DEFS_DIR}/alpha.ts`)) {
  selfFails.push('a def the registry DOES hold is wrongly reported (false positive)');
}
// The identity claim, which is the reason no name convention is load-bearing here. An export that
// merely LOOKS like the registered def must not satisfy membership.
if (!unregistered([`${SAMPLE_DEFS_DIR}/alpha.ts`], () => [{ id: 'alpha' }], sampleRegistry).length) {
  selfFails.push('registry membership is satisfied by a look-alike object rather than the exported def itself');
}
// CONVERSE: a registry member no def file exports, and no false positive on one that is.
if (!unbacked([alphaDef, gammaDef], new Set([alphaDef])).includes(gammaDef)) {
  selfFails.push('a registry entry no tracked def file exports is NOT reported — a def can enter the set from outside the typechecked scope');
}
if (unbacked([alphaDef], new Set([alphaDef, betaDef])).length) {
  selfFails.push('the registry converse check flags a member that IS exported by a def file (false positive)');
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
// Every tracked `.ts` under the directory, the registry included — this is what the forward and
// converse arms compare against, unchanged by #742.
const tracked = parseTrackedDefs(git.stdout);
// The REGISTRY literal must name a file git tracks. Without this the exclusion below could match
// nothing after a rename and the registry would quietly re-enter the def set, where it would satisfy
// the floor by itself and be asked to export itself into its own list (`docs/34` shape 9: a detector
// that recognizes nothing must fail, not report clean).
if (!tracked.includes(REGISTRY)) {
  console.error(`\n❌ ${REGISTRY} is not tracked by git — the registry is this gate's subject, so its absence is not a pass.`);
  console.error('   Either the registry moved (repoint REGISTRY above) or it was deleted, which un-does #742.');
  process.exit(1);
}
const defs = defsOnly(tracked, REGISTRY);

// FLOOR — did it look? A detector that recognizes nothing must fail, not report clean. This is the
// specific mitigation for DEFS_DIR being a literal: #658's review found a gate printing
// "0 engine files in the bundle … ✓ clean", a true statement about an empty set. It counts DEFS, not
// tracked files, which is why the registry is excluded above — otherwise a directory holding nothing
// but an empty registry would count as one.
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

// ---- the registry arm (#742) ---------------------------------------------------------------------
// The modules are IMPORTED, not parsed. Reading `index.ts` as text and matching import statements
// would be a second implementation of module resolution living inside the gate — and it would go
// green on a `export { button } from './button'` line that names a def the file never actually puts
// in `componentDefs`. Importing gets the real values, so membership is `Set.has` on the same objects
// a consumer would iterate.
//
// Note what this does NOT gate on: the import runs under tsx, which TRANSPILES, so a def carrying a
// type error still imports and this arm still reports on it. That is deliberate rather than an
// oversight — the diagnostics arm above already owns type errors, and short-circuiting here would
// mean one bad def hid every registry problem in the same run. The failures are collected together
// and reported together.
const exportsOf = new Map<string, unknown[]>();
for (const file of defs) {
  const mod = await import(pathToFileURL(resolve(repo, file)).href);
  exportsOf.set(file, Object.values(mod));
}
const registryMod = await import(pathToFileURL(resolve(repo, REGISTRY)).href);
const registryDefs: unknown = registryMod.componentDefs;

const failures: string[] = [];
if (diagnostics.length) failures.push(`${diagnostics.length} type error(s) in the component defs`);
// Both arms below run over the FULL tracked set, registry included: it is a `.ts` file in the
// declared scope like any other, so it must be typechecked and must not read as a stray.
const missing = unrepresented(tracked, listed);
if (missing.length) failures.push(`${missing.length} tracked def(s) absent from the typechecked set`);
const residue = strays(DEFS_DIR, tracked, listed);
if (residue.length) failures.push(`${residue.length} untracked file(s) inflating the typechecked set`);

// The registry has to EXIST as a set before either direction over it means anything — an absent or
// empty `componentDefs` would make `unregistered` report every def (loud, fine) but `unbacked`
// report nothing at all, which is the true-statement-about-an-empty-set shape.
let orphaned: string[] = [];
let strandedLabels: string[] = [];
if (!Array.isArray(registryDefs) || registryDefs.length < 3) {
  failures.push(`${REGISTRY} does not export a \`componentDefs\` array of at least 3 defs — the set is the thing consumers iterate`);
} else {
  orphaned = unregistered(defs, (f) => exportsOf.get(f) ?? [], new Set(registryDefs));
  if (orphaned.length) failures.push(`${orphaned.length} tracked def(s) missing from the registry's \`componentDefs\``);
  const stranded = unbacked(registryDefs, new Set([...exportsOf.values()].flat()));
  strandedLabels = stranded.map((d, i) => {
    const id = (d as { id?: unknown } | null)?.id;
    return typeof id === 'string' ? id : `(entry ${i + 1} of ${stranded.length}, no string \`id\` to name it by)`;
  });
  if (stranded.length) failures.push(`${stranded.length} registry entr(ies) exported by no tracked def file`);
}
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
  if (orphaned.length) {
    console.error(`\n  tracked and typechecked, but NOT in the registry — \`componentDefs\` is the set every`);
    console.error(`  projection iterates, so a def missing from it exists and is invisible. Add it to ${REGISTRY}:`);
    for (const o of orphaned) console.error(`    ${o}`);
  }
  if (strandedLabels.length) {
    console.error(`\n  in the registry but exported by no tracked def file — a def reaching \`componentDefs\``);
    console.error(`  from outside ${DEFS_DIR}/ is outside this gate's declared typecheck scope:`);
    for (const s of strandedLabels) console.error(`    ${s}`);
  }
  process.exit(1);
}

console.log(`✓ component defs typecheck clean — ${defs.length} tracked def(s), all present in the ${listed.length} file(s) tsc read (noEmit, nothing emitted).`);
for (const d of defs) console.log(`    ${d}`);
console.log(`  ✓ registry — all ${defs.length} tracked def(s) are in \`componentDefs\`, and all ${(registryDefs as unknown[]).length} entr(ies) come from a tracked def file (${REGISTRY}).`);
