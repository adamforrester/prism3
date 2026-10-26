// regen.ts — the single entry point for regenerating EVERY committed generated artifact — `out/**`,
// the three emitted `schema/` contracts, and the two engine-root reports, and the analysis reports
// under `docs/public/reports/` (#2651) — plus the drift gate that proves the committed copies still
// match what the engine emits (#281).
//
// Why this exists: regeneration used to be four separate commands, and only `emit-dtcg.ts`
// (nb/aurora/harbor) was in the habitual path — so `tokens.html` and the wendys artifacts rotted
// silently across many merged PRs. Nothing caught it because every other gate (`test.ts`,
// `nb-regression.ts`, alias resolution, contrast contracts) runs the engine LIVE and compares it
// against itself; none of them ever reads the committed file.
//
//   npx tsx packages/engine/regen.ts            # regenerate everything, in place
//   npx tsx packages/engine/regen.ts --check    # fail (exit 1) if the committed artifacts have drifted
//
// `--check` snapshots `out/` first, regenerates, byte-compares, then restores the snapshot — so it
// never leaves the tree dirty, whatever the answer. That keeps it safe to run mid-edit: it answers
// "is `out/` in sync with the sources as they stand right now", which on a clean CI checkout is
// exactly "does the committed `out/` match the committed sources".

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'out');
const schemaDir = resolve(here, 'schema');
const repoRoot = resolve(here, '..', '..');

// The emitters, in dependency order. wendys goes through `cli.ts` rather than `emit-dtcg.ts` because it
// is a STANDARD-dialect brief, not an engine-native one — that split is precisely why it kept getting missed.
// `visualize.ts` (`out/tokens.html`) is NOT a step: the page is built on demand and never committed (Q319.6,
// #2583). See `ON_DEMAND_OUT` below.
const STEPS: Array<{ label: string; args: string[] }> = [
  { label: 'emit-dtcg      (nb · prism3 · aurora · harbor)', args: ['packages/engine/emit-dtcg.ts'] },
  { label: 'nb-regression  (regression report)', args: ['packages/engine/nb-regression.ts'] },
  { label: 'cli            (wendys + fidelity)', args: ['packages/engine/cli.ts', 'packages/engine/examples/wendys.design.md', '--out', 'packages/engine/out', '--fidelity'] },
  { label: 'emit-figma     (out/figma/**)', args: ['packages/engine/emit-figma.ts'] },
  { label: 'emit-levers    (lever-manifest)', args: ['packages/engine/emit-levers.ts'] },
  { label: 'emit-preview   (preview-spec)', args: ['packages/engine/emit-preview.ts'] },
  { label: 'emit-brandinput(example-brands)', args: ['packages/engine/emit-brandinput.ts'] },
  { label: 'emit-icons     (icon-glyphs.ts)', args: ['packages/engine/emit-icons.ts'] },
  // #2343 — the brand marks, the second icon type: same shape of artifact, a module the plugin bundles.
  { label: 'emit-marks     (brand-mark-glyphs.ts)', args: ['packages/engine/emit-marks.ts'] },
  // #1701 — the component docs projection. Reads the def registry only, so it has no ordering dependency.
  { label: 'emit-component-docs (out/components/** + component-maintainer)', args: ['packages/engine/emit-component-docs.ts'] },
  // #2647 — the Figma conventions file. Reads the def registry, the plugin's taxonomy and the Figma emitter in memory, so
  // it has no ordering dependency either.
  { label: 'emit-figma-conventions (docs/public/reference/figma-conventions.json)', args: ['packages/engine/emit-figma-conventions.ts'] },
  // #2651 — the analysis reports. Last, because the token report reads `out/prism3.tokens.json`, which emit-dtcg writes.
  { label: 'emit-analysis-reports (docs/public/reports/**)', args: ['packages/engine/emit-analysis-reports.ts'] },
];

// Files under `out/` that are BUILT ON DEMAND, never committed and never written by `regen` (Q319.6, #2583).
// `tokens.html` is a 1.8 MB preview page for inspecting the corpus (`npm run tokens-html`, or
// `npx tsx packages/engine/visualize.ts`); it is gitignored. A developer's local copy sits in `out/` beside
// the committed artifacts, so both `out/` walks here — and `lint-payload-manifest.ts`'s — skip these names:
// otherwise a local build would read as one artifact more than CI's count. Skipping a name hides it from the
// comparison, so `check()` separately refuses a regen that WRITES one: re-adding `visualize` to `STEPS` fails
// by name rather than shrinking the universe silently.
export const ON_DEMAND_OUT = ['tokens.html'];

// The prose gates (`lint-us-english.ts`, `lint-voice.ts`) still scan the on-demand page: skipping it in their
// `out/` walk keeps a local copy from changing their result, and this renders a fresh one into a temp dir for
// them instead, so CI (no copy) and a laptop (stale or fresh copy) scan the same bytes. Returns the rendered
// files, or an error the caller reports as blindness; the temp dir is removed when the process exits.
export const renderOnDemand = (): { files: string[] } | { error: string } => {
  const dir = mkdtempSync(join(tmpdir(), 'prism3-on-demand-'));
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
  const r = spawnSync('npx', ['tsx', join(here, 'visualize.ts'), '--out', dir], { cwd: repoRoot, encoding: 'utf8' });
  if (r.status !== 0) return { error: `visualize.ts --out exited ${r.status}: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' / ')}` };
  const missing = ON_DEMAND_OUT.filter((f) => !existsSync(join(dir, f)));
  if (missing.length) return { error: `visualize.ts --out wrote no ${missing.join(', ')}` };
  return { files: ON_DEMAND_OUT.map((f) => join(dir, f)) };
};

// Committed generated artifacts that live at the ENGINE ROOT rather than under `out/`. Both were
// outside the comparison until now: `modes-report.md` was regenerated (emit-dtcg writes it) but never
// CHECKED, and `nb-regression-report.md` was neither regenerated nor checked — so this file's own
// claim to cover "every committed artifact" was an overclaim. Both are gated now.
export const ENGINE_ARTIFACTS = ['modes-report.md', 'nb-regression-report.md', 'icon-glyphs.ts', 'brand-mark-glyphs.ts'];
//
// `icon-glyphs.ts` is a generated MODULE rather than a report, and it belongs here rather than under
// `out/` for a reason worth stating: `icon.ts` IMPORTS it, and the plugin bundles that import into a
// sandbox with no filesystem. It is engine source that happens to be generated — so it needs the
// drift check every other generated artifact gets, and it is deliberately NOT an `out/` artifact,
// which is why `lint-payload-manifest.ts` does not classify it. `docs/40` §5.3 said it would be
// classified payload; that was written before this file's artifact model had been read, and the
// eject-side question is real and `schema/payload-manifest.json` answers it: this file is classified
// PAYLOAD there, because any component projection rendering an icon carries the glyph data with it.
//
// A first draft of this comment claimed `lint-payload-manifest.ts` does not reach ENGINE_ARTIFACTS.
// It does, and it failed on this file within ninety seconds of the wiring landing. Recorded rather
// than quietly corrected, because the claim was reasoned from the gate's source rather than measured
// by running it — the same move that produced three wrong scope claims elsewhere this week.

// `schema/` mixes hand-authored contracts (theme-schema.json) with emitted ones, so unlike `out/`
// — which is generated wholesale — it is compared file-by-file against this list. These three are
// the same class of risk as the `out/` drift that prompted #281: committed, generated, and until
// now unverified. They happen to be in sync today; the point is that nothing was keeping them so.
export const SCHEMA_ARTIFACTS = ['lever-manifest.json', 'preview-spec.json', 'example-brands.json'];

// The MAINTAINER RECORD (#1701): `schema/component-maintainer.json`, each component def's `anatomy.codeOnly`
// and `notes.*`, which #1623 ruled maintainer-only. Generated and drift-checked here exactly like the list
// above, and deliberately NOT in it, because every other reader of `SCHEMA_ARTIFACTS` takes membership to
// mean "this ships": `lint-us-english.ts` and `lint-voice.ts` scan it as shipped prose, and
// `lint-emission-version.ts` demands an ENGINE bump when it moves. None of that is true of a file no client
// receives, so it gets its own list: `lint-payload-manifest.ts` classifies it (`ours`), and
// `lint-schema-classification.ts` accepts it as a fourth class, generated and maintainer-only. Moving it
// into `SCHEMA_ARTIFACTS` would put issue numbers and brief references under the shipped-prose gates.
export const MAINTAINER_ARTIFACTS = ['component-maintainer.json'];

// The ANALYSIS REPORTS (#2651): token usage, component dependencies, the cross-component comparison and icon
// usage, each a page and a JSON twin, under `docs/public/reports/` where the docs are served (#2637). Generated
// and drift-checked like every list above, and a list of its own for two reasons. They live outside the engine
// package, so neither `out/` nor `schema/` reaches them. And they are documentation about the emission rather
// than emission: `lint-emission-version.ts` reads `ENGINE_ARTIFACTS` and `SCHEMA_ARTIFACTS` as "a move here
// owes an engine bump", which is not true of a report (it carries no engine version, so a fold leaves it
// alone). The prose gates import this list, so a report added here is scanned without a second edit.
export const REPORTS_DIR = 'docs/public/reports';
export const REPORT_ARTIFACTS = [
  'index.md', 'index.json',
  'token-usage.md', 'token-usage.json',
  'component-dependencies.md', 'component-dependencies.json',
  'component-comparison.md', 'component-comparison.json',
  'icon-usage.md', 'icon-usage.json',
];

// The FIGMA CONVENTIONS FILE (#2647): served docs beside the agent reference, generated from the code. In regen so
// the documented path (regen, then commit) moves it when a def, page or property moves, which every component PR
// does. A list of its own for the reason the reports have one: it carries no engine version, so it must stay out of
// the lists `lint-emission-version.ts` reads as "owes a bump". `emit-figma-conventions.ts --check` remains the gate
// that names WHICH convention moved; this list only makes the regenerate part of the habitual command.
export const REFERENCE_DIR = 'docs/public/reference';
export const REFERENCE_ARTIFACTS = ['figma-conventions.json'];

// Every file under `out/`, repo-relative, sorted — the comparison universe. Walks rather than
// globbing so `out/figma/<brand>/*.json` is covered without naming each brand.
const walk = (dir: string, root = dir): string[] => {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) found.push(...walk(p, root));
    else if (!ON_DEMAND_OUT.includes(relative(root, p))) found.push(p);
  }
  return found.sort();
};

const runStep = (args: string[], label: string): void => {
  process.stdout.write(`  ${label} … `);
  // Shells out per step rather than importing: `visualize.ts` / `cli.ts` execute at module load, so
  // importing them would run them as a side effect and couple their exit behaviour to ours. Each step
  // resolves `npx tsx` the same way a developer would, so a plain regen and `--check` agree.
  const r = spawnSync('npx', ['tsx', ...args], { cwd: repoRoot, encoding: 'utf8' });
  if (r.status !== 0) {
    console.log('FAILED');
    console.error(r.stdout ?? '');
    console.error(r.stderr ?? '');
    console.error(`\n✗ regen step failed: npx tsx ${args.join(' ')}`);
    process.exit(1);
  }
  console.log('ok');
};

const regenerate = (): void => {
  for (const { label, args } of STEPS) runStep(args, label);
};

const check = (): void => {
  const tmp = mkdtempSync(join(tmpdir(), 'prism3-regen-'));
  const outSnap = join(tmp, 'out');
  const schemaSnap = join(tmp, 'schema');
  const engineSnap = join(tmp, 'engine');
  const reportSnap = join(tmp, 'reports');
  const reportDir = join(repoRoot, REPORTS_DIR);
  const referenceSnap = join(tmp, 'reference');
  const referenceDir = join(repoRoot, REFERENCE_DIR);
  try {
    cpSync(outDir, outSnap, { recursive: true, preserveTimestamps: true });
    mkdirSync(schemaSnap, { recursive: true });
    for (const f of [...SCHEMA_ARTIFACTS, ...MAINTAINER_ARTIFACTS]) cpSync(join(schemaDir, f), join(schemaSnap, f), { preserveTimestamps: true });
    mkdirSync(engineSnap, { recursive: true });
    for (const f of ENGINE_ARTIFACTS) cpSync(join(here, f), join(engineSnap, f), { preserveTimestamps: true });
    // A report that is not committed yet is a `missing` artifact, not a crash: snapshot only what exists.
    mkdirSync(reportSnap, { recursive: true });
    const reportsBefore = REPORT_ARTIFACTS.filter((f) => existsSync(join(reportDir, f)));
    for (const f of reportsBefore) cpSync(join(reportDir, f), join(reportSnap, f), { preserveTimestamps: true });
    mkdirSync(referenceSnap, { recursive: true });
    const referenceBefore = REFERENCE_ARTIFACTS.filter((f) => existsSync(join(referenceDir, f)));
    for (const f of referenceBefore) cpSync(join(referenceDir, f), join(referenceSnap, f), { preserveTimestamps: true });
    // An on-demand file's mtime, or null when there is none — compared after regenerate() to catch a step that writes it.
    const onDemandStamp = (f: string): number | null => (existsSync(join(outDir, f)) ? statSync(join(outDir, f)).mtimeMs : null);
    const onDemandBefore = ON_DEMAND_OUT.map(onDemandStamp);

    // An on-demand file must not be tracked by git either (review on #2685). Both walks skip the name, so a copy
    // committed by `git add -f`, a lost .gitignore line or a conflict resolved toward an older branch would otherwise
    // go stale unseen. Read from the index, not the disk: a local, ignored copy is expected. A git that cannot answer
    // fails closed, never passes.
    const lsFiles = spawnSync('git', ['ls-files', '--', ...ON_DEMAND_OUT.map((f) => `packages/engine/out/${f}`)], { cwd: repoRoot, encoding: 'utf8' });
    if (lsFiles.status !== 0) {
      console.error(`\n✗ cannot tell whether an on-demand file is committed — git ls-files exited ${lsFiles.status}: ${(lsFiles.stderr || '').trim()}`);
      rmSync(tmp, { recursive: true, force: true });
      process.exit(1);
    }
    const onDemandTracked = lsFiles.stdout.split('\n').map((l) => l.trim()).filter(Boolean);

    regenerate();

    const drifted: string[] = [];
    const added: string[] = [];
    const removed: string[] = [];

    // out/ — generated wholesale, so the whole tree is the comparison universe.
    const before = new Map(walk(outSnap).map((p) => [relative(outSnap, p), p]));
    const after = new Map(walk(outDir).map((p) => [relative(outDir, p), p]));
    for (const [rel, p] of after) {
      const was = before.get(rel);
      if (!was) { added.push(`packages/engine/out/${rel}`); continue; }
      if (!readFileSync(was).equals(readFileSync(p))) drifted.push(`packages/engine/out/${rel}`);
    }
    for (const rel of before.keys()) if (!after.has(rel)) removed.push(`packages/engine/out/${rel}`);
    // out/ — the on-demand files: regen must not write them at all (Q319.6).
    const onDemandWritten = ON_DEMAND_OUT.filter((f, i) => onDemandStamp(f) !== onDemandBefore[i]).map((f) => `packages/engine/out/${f}`);

    // schema/ — only the named emitted files; the hand-authored contracts alongside them are not ours.
    for (const f of [...SCHEMA_ARTIFACTS, ...MAINTAINER_ARTIFACTS]) {
      if (!readFileSync(join(schemaSnap, f)).equals(readFileSync(join(schemaDir, f)))) drifted.push(`packages/engine/schema/${f}`);
    }
    // engine root — the two committed reports.
    for (const f of ENGINE_ARTIFACTS) {
      if (!readFileSync(join(engineSnap, f)).equals(readFileSync(join(here, f)))) drifted.push(`packages/engine/${f}`);
    }
    // docs/public/reports — the named reports (#2651); anything else in that directory is not ours to judge.
    for (const f of REPORT_ARTIFACTS) {
      if (!reportsBefore.includes(f)) { added.push(`${REPORTS_DIR}/${f}`); continue; }
      if (!readFileSync(join(reportSnap, f)).equals(readFileSync(join(reportDir, f)))) drifted.push(`${REPORTS_DIR}/${f}`);
    }
    // docs/public/reference — the Figma conventions file (#2647); the agent reference beside it has its own gate.
    for (const f of REFERENCE_ARTIFACTS) {
      if (!referenceBefore.includes(f)) { added.push(`${REFERENCE_DIR}/${f}`); continue; }
      if (!readFileSync(join(referenceSnap, f)).equals(readFileSync(join(referenceDir, f)))) drifted.push(`${REFERENCE_DIR}/${f}`);
    }

    // Restore the committed state either way — the gate reports, it never rewrites. Every copy, the
    // snapshot and the restore, keeps its timestamps (#2067): without that, a clean `--check` left each
    // artifact newer than a bundle built just before it, and `assertBundleFresh` refused that bundle as
    // stale. `icon-glyphs.ts` compiles into both bundles, and a `--check` run after a build must not leave it stale.
    rmSync(outDir, { recursive: true, force: true });
    cpSync(outSnap, outDir, { recursive: true, preserveTimestamps: true });
    for (const f of [...SCHEMA_ARTIFACTS, ...MAINTAINER_ARTIFACTS]) cpSync(join(schemaSnap, f), join(schemaDir, f), { preserveTimestamps: true });
    for (const f of ENGINE_ARTIFACTS) cpSync(join(engineSnap, f), join(here, f), { preserveTimestamps: true });
    for (const f of REPORT_ARTIFACTS) {
      if (reportsBefore.includes(f)) cpSync(join(reportSnap, f), join(reportDir, f), { preserveTimestamps: true });
      else rmSync(join(reportDir, f), { force: true });
    }
    for (const f of REFERENCE_ARTIFACTS) {
      if (referenceBefore.includes(f)) cpSync(join(referenceSnap, f), join(referenceDir, f), { preserveTimestamps: true });
      else rmSync(join(referenceDir, f), { force: true });
    }

    const checked = after.size + SCHEMA_ARTIFACTS.length + MAINTAINER_ARTIFACTS.length + ENGINE_ARTIFACTS.length + REPORT_ARTIFACTS.length + REFERENCE_ARTIFACTS.length;
    if (!drifted.length && !added.length && !removed.length && !onDemandWritten.length && !onDemandTracked.length) {
      console.log(`\n✓ in sync — ${checked} committed artifacts byte-match what the engine emits.`);
      return;
    }
    console.error('\n✗ committed artifacts have DRIFTED from what the engine emits:');
    for (const f of drifted) console.error(`    changed  ${f}`);
    for (const f of added) console.error(`    missing  ${f}  (engine emits it; not committed)`);
    for (const f of removed) console.error(`    stale    ${f}  (committed; engine no longer emits it)`);
    for (const f of onDemandWritten) console.error(`    on-demand ${f}  (regen wrote it; it is built on demand and never committed — ON_DEMAND_OUT, Q319.6)`);
    for (const f of onDemandTracked) console.error(`    on-demand ${f}  (git tracks it; it is built on demand and never committed — ON_DEMAND_OUT, Q319.6)`);
    if (drifted.length || added.length || removed.length) console.error('\n  Fix: npx tsx packages/engine/regen.ts   then commit the result.');
    if (onDemandWritten.length) console.error('\n  Fix: take the step that writes it out of STEPS; an on-demand file is built by its own command, never by regen.');
    if (onDemandTracked.length) console.error('\n  Fix: git rm --cached <file>, and keep its line in .gitignore.');
    process.exit(1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
};

// Run the CLI only when invoked directly — not when another module imports the ARTIFACTS constants.
// Without this, `import { SCHEMA_ARTIFACTS } from './regen'` performs a full regenerate() as a side
// effect of reading two arrays: the importer silently rewrites every committed artifact, discarding
// any in-progress local edit, and a failure inside regenerate() surfaces as a stack trace about
// artifact generation from a script the developer ran for something else entirely.
// Same guard, and the same reason, as `materialise-to-figma.ts` — which already carries it precisely
// so `test.ts` can import `aliasRows` without running a CLI.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) { console.log('Checking committed artifacts for drift…'); check(); }
  else { console.log('Regenerating committed artifacts…'); regenerate(); console.log('\n✓ regenerated.'); }
}
