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
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'out');
const schemaDir = resolve(here, 'schema');
const repoRoot = resolve(here, '..', '..');

// The emitters, in dependency order. wendys goes through `cli.ts` rather than `emit-dtcg.ts` because it
// is a STANDARD-dialect brief, not an engine-native one — that split is precisely why it kept getting missed.
// `visualize.ts` (`out/tokens.html`) is NOT a step: the page is built on demand and never committed (Q319.6,
// #2583). See `ON_DEMAND_OUT` below.
export type Step = { label: string; args: string[] };
const STEPS: Step[] = [
  { label: 'emit-dtcg      (nb · prism3 · aurora · harbor)', args: ['packages/engine/emit-dtcg.ts'] },
  { label: 'nb-regression  (regression report)', args: ['packages/engine/nb-regression.ts'] },
  { label: 'cli            (wendys + fidelity)', args: ['packages/engine/cli.ts', 'packages/engine/examples/wendys.design.md', '--out', 'packages/engine/out', '--fidelity', '--committed'] },
  // #2997 PR 4 (Q2997.5 B) — the shadcn/ui theme and the Tailwind v4 theme, projected from the handoff files the two
  // steps above write (emit-dtcg for four brands, cli for wendys), so they come after both.
  { label: 'emit-shadcn    (out/shadcn/**)', args: ['packages/engine/emit-shadcn.ts'] },
  { label: 'emit-tailwind  (out/tailwind/**)', args: ['packages/engine/emit-tailwind.ts'] },
  { label: 'emit-figma     (out/figma/**)', args: ['packages/engine/emit-figma.ts'] },
  { label: 'emit-levers    (lever-manifest)', args: ['packages/engine/emit-levers.ts'] },
  { label: 'emit-preview   (preview-spec)', args: ['packages/engine/emit-preview.ts'] },
  { label: 'emit-brandinput(example-brands)', args: ['packages/engine/emit-brandinput.ts'] },
  { label: 'emit-icons     (icon-glyphs.ts)', args: ['packages/engine/emit-icons.ts'] },
  // #2343 — the provider logos, the second icon type: same shape of artifact, a module the plugin bundles.
  { label: 'emit-marks     (provider-logo-glyphs.ts)', args: ['packages/engine/emit-marks.ts'] },
  // #1701 — the component docs projection. Reads the def registry only, so it has no ordering dependency.
  { label: 'emit-component-docs (out/components/** + component-maintainer)', args: ['packages/engine/emit-component-docs.ts'] },
  // #2647 — the Figma conventions file. Reads the def registry, the plugin's taxonomy and the Figma emitter in memory, so
  // it has no ordering dependency either.
  { label: 'emit-figma-conventions (docs/public/reference/figma-conventions.json)', args: ['packages/engine/emit-figma-conventions.ts'] },
  // #2996 — the spec supplement (out/specs/**): Prism3's additions to Spectacular's spec for its own components. Reads the
  // def registry and the house brand's Figma emitter in memory, so it has no ordering dependency.
  { label: 'emit-spec-supplement (out/specs/**)', args: ['packages/engine/emit-spec-supplement.ts'] },
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

// Files under `out/` that regen WRITES but git does not track (#3698 R3, owner decision 2026-11-12). The three
// whole-catalog component exports are 5.1 MB and about 178k lines, and moved in a third of the PRs that touched
// `out/`, so they left review and stopped conflicting. regen still emits them (a developer's `out/` has them, the
// payload still includes them), and every reader generates them first: `renderUncommitted` below writes a fresh
// set into a temp dir for a gate, and `packages/tokens/check-specs.mjs` does the same through
// `emit-component-docs.ts --uncommitted --out`. Like `ON_DEMAND_OUT`, both `out/` walks here skip the names, so a
// local copy never changes the count; unlike it, regen must still WRITE each one, and `check()` fails by name when
// it stops, or when git tracks one. They are in `.gitignore`.
// `component-contracts.json` is the export's contract-named twin (#1325, Q-CC1 A) and `component-defs.json` its compatibility
// copy for one release. Appended LAST: `renderUncommitted`'s readers take files by position.
export const UNCOMMITTED_OUT = ['components/component-defs.json', 'components/component-defs.specs.json', 'components/specs.json', 'components/component-contracts.json'];

/** A fresh copy of every `UNCOMMITTED_OUT` file, written into a temp dir for a reader that must not depend on what a
 *  local `out/` holds (CI holds none). Returns the files in `UNCOMMITTED_OUT` order, or an error the caller reports as
 *  blindness, never as clean. The temp dir is removed when the process exits. */
export const renderUncommitted = (): { files: string[] } | { error: string } => {
  const dir = mkdtempSync(join(tmpdir(), 'prism3-uncommitted-'));
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
  const r = spawnSync('npx', ['tsx', join(here, 'emit-component-docs.ts'), '--uncommitted', '--out', dir], { cwd: repoRoot, encoding: 'utf8' });
  if (r.status !== 0) return { error: `emit-component-docs.ts --uncommitted exited ${r.status}: ${(r.stderr || r.stdout || '').trim().split('\n').slice(-3).join(' / ')}` };
  const missing = UNCOMMITTED_OUT.filter((f) => !existsSync(join(dir, f)));
  if (missing.length) return { error: `emit-component-docs.ts --uncommitted wrote no ${missing.join(', ')}` };
  return { files: UNCOMMITTED_OUT.map((f) => join(dir, f)) };
};

// Committed generated artifacts that live at the ENGINE ROOT rather than under `out/`. Both were
// outside the comparison until now: `modes-report.md` was regenerated (emit-dtcg writes it) but never
// CHECKED, and `nb-regression-report.md` was neither regenerated nor checked — so this file's own
// claim to cover "every committed artifact" was an overclaim. Both are gated now.
export const ENGINE_ARTIFACTS = ['modes-report.md', 'nb-regression-report.md', 'icon-glyphs.ts', 'provider-logo-glyphs.ts'];
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
    else if (!ON_DEMAND_OUT.includes(relative(root, p)) && !UNCOMMITTED_OUT.includes(relative(root, p))) found.push(p);
  }
  return found.sort();
};

// Every artifact path regen answers for, absolute: the `out/` walk, the uncommitted exports that exist, and each named
// list. Re-read after every step, so a file a step creates is seen.
const artifactPaths = (): string[] => [
  ...walk(outDir),
  ...UNCOMMITTED_OUT.map((f) => join(outDir, f)),
  ...[...SCHEMA_ARTIFACTS, ...MAINTAINER_ARTIFACTS].map((f) => join(schemaDir, f)),
  ...ENGINE_ARTIFACTS.map((f) => join(here, f)),
  ...REPORT_ARTIFACTS.map((f) => join(repoRoot, REPORTS_DIR, f)),
  ...REFERENCE_ARTIFACTS.map((f) => join(repoRoot, REFERENCE_DIR, f)),
].filter((p) => existsSync(p));

const mtimes = (): Map<string, number> => new Map(artifactPaths().map((p) => [p, statSync(p).mtimeMs]));

// WHAT A STEP WROTE (#1059). Regeneration is in place, so a step that writes nothing leaves the committed copy on
// disk, byte-identical to the snapshot — and the byte comparison below cannot tell "emitted the same bytes" from
// "emitted nothing". That blinded `--check` in both artifact classes at once: two emitters disabled together passed
// it. The evidence that does not depend on the bytes is the WRITE: a step that ran its emitter touched each file it
// emits. So each step is held to having written at least one artifact, and `check()` holds every committed artifact
// to having been written by some step. The oracle is the committed file set and the filesystem's record of writes —
// neither is derived from the emitter's code, which is the independence docs/34 asks for.
// The command a developer types to rerun one step by hand; what every message names.
const commandOf = (args: readonly string[]): string => `npx tsx ${args.join(' ')}`;

// HOW A STEP STARTS (#4240). `npx tsx` paid npx's package resolution on every step, about 290 ms each and about 3.5 s
// a regen. Under tsx, which is how regen always runs, `process.execArgv` carries tsx's loader flags, so the step runs
// in a fresh node with the same loader, the way `lint-push-base.ts` and `mcp-served.ts` start theirs. Still one
// process per step: the step isolation and the per-step write record below depend on it. An `--eval`/`--print` of
// the parent's is not passed on. Outside tsx it falls back to `npx tsx`.
const loaderArgs = (): string[] | null => {
  const out: string[] = [];
  const argv = process.execArgv;
  for (let i = 0; i < argv.length; i++) {
    if (['--eval', '-e', '--print', '-p'].includes(argv[i])) { i++; continue; }
    if (/^--(eval|print)=/.test(argv[i])) continue;
    out.push(argv[i]);
  }
  return out.some((a) => /[\\/]tsx[\\/]/.test(a)) ? out : null;
};

/** A step that exited non-zero (#4199). Thrown, never `process.exit`: `check()` must still restore the tree. */
class StepFailed extends Error {}

type Say = { out: (s: string) => void; err: (s: string) => void };
const LOUD: Say = { out: (s) => process.stdout.write(s), err: (s) => process.stderr.write(s) };
const QUIET: Say = { out: () => {}, err: () => {} };

const runStep = (args: string[], label: string, say: Say): Set<string> => {
  say.out(`  ${label} … `);
  const before = mtimes();
  // Shells out per step rather than importing: `visualize.ts` / `cli.ts` execute at module load, so
  // importing them would run them as a side effect and couple their exit behaviour to ours.
  const loader = loaderArgs();
  const r = loader
    ? spawnSync(process.execPath, [...loader, ...args], { cwd: repoRoot, encoding: 'utf8' })
    : spawnSync('npx', ['tsx', ...args], { cwd: repoRoot, encoding: 'utf8' });
  if (r.status !== 0) {
    say.out('FAILED\n');
    say.err(`${r.stdout ?? ''}\n${r.stderr ?? ''}\n`);
    say.err(`\n✗ regen step failed: ${commandOf(args)}\n`);
    throw new StepFailed(commandOf(args));
  }
  const written = new Set([...mtimes()].filter(([p, t]) => before.get(p) !== t).map(([p]) => p));
  // The step's old `… ok` was a statement about its exit code; this makes it one about its output.
  say.out(written.size ? `ok (${written.size} written)\n` : 'WROTE NOTHING\n');
  return written;
};

/** Runs every step. `silent` names each step that exited 0 having written no artifact — the caller fails on it
 *  (`check()` only after restoring the tree, which is why this does not exit itself). A failed step throws
 *  `StepFailed`. */
const regenerate = (steps: readonly Step[] = STEPS, say: Say = LOUD): { written: Set<string>; silent: string[] } => {
  const written = new Set<string>();
  const silent: string[] = [];
  for (const { label, args } of steps) {
    const w = runStep(args, label, say);
    if (!w.size) silent.push(commandOf(args));
    for (const p of w) written.add(p);
  }
  return { written, silent };
};

const silentLines = (silent: readonly string[], say: Say = LOUD): void => {
  for (const c of silent) say.err(`    silent   ${c}  (exited 0 and wrote no artifact — #1059)\n`);
};
const silentFix = (silent: readonly string[], say: Say = LOUD): void => {
  if (silent.length) say.err('\n  Fix: the step must write what it emits; a step that emits nothing any more leaves STEPS.\n');
};

/** Every file and every directory under `dir`, relative to it, with NOTHING skipped — the restore's universe. Not
 *  `walk`: that one leaves out the on-demand and uncommitted files, which the comparison ignores and the restore
 *  must still put back exactly as they were. */
const treeOf = (dir: string, rel = ''): { files: string[]; dirs: string[] } => {
  const files: string[] = [], dirs: string[] = [];
  for (const name of readdirSync(join(dir, rel))) {
    const r = rel ? join(rel, name) : name;
    if (statSync(join(dir, r)).isDirectory()) { dirs.push(r); const sub = treeOf(dir, r); files.push(...sub.files); dirs.push(...sub.dirs); }
    else files.push(r);
  }
  return { files, dirs };
};

/**
 * Put `live` back to `snap`, IN PLACE (#2029): `live` itself is never deleted, and no file is ever missing or half
 * written while it runs. The restore used to `rmSync(out)` and copy the snapshot back, and a Studio or plugin build
 * reading `out/` inside that window failed with "cannot load the default theme", a message about the theme, not the
 * race. Now a file whose bytes differ is written to a sibling and RENAMED over the old one (atomic on one file
 * system); a file whose bytes match stays where it is. Every file gets its snapshot timestamps back (#2067), what
 * regen added is removed, and so are the directories it made.
 */
export const restoreTree = (snap: string, live: string): void => {
  const want = treeOf(snap);
  const keepFiles = new Set(want.files), keepDirs = new Set(want.dirs);
  const have = treeOf(live);
  for (const f of have.files) if (!keepFiles.has(f)) rmSync(join(live, f), { force: true });
  for (const d of [...have.dirs].sort((a, b) => b.length - a.length)) if (!keepDirs.has(d)) rmSync(join(live, d), { recursive: true, force: true });
  for (const d of want.dirs) mkdirSync(join(live, d), { recursive: true });
  for (const f of want.files) {
    const src = join(snap, f), dst = join(live, f);
    if (!existsSync(dst) || !readFileSync(dst).equals(readFileSync(src))) {
      const tmp = join(dirname(dst), `.${basename(dst)}.restore-${process.pid}`);
      cpSync(src, tmp, { preserveTimestamps: true });
      renameSync(tmp, dst);
    }
    const st = statSync(src);
    utimesSync(dst, st.atime, st.mtime);
  }
};

/** What one `--check` found. `inSync` is the verdict; the lists are what the drift lines name. */
export type CheckReport = { inSync: boolean; failed: string | null; silent: string[]; unwritten: string[]; checked: number };

/**
 * The drift gate. It REPORTS and never rewrites, on every path (#4199): the snapshot is restored in `finally`, after a
 * step that failed as much as after a clean run, and the temp directory goes with it. It returns rather than exits,
 * so the CLI sets the exit code once the tree is back, and `test.ts` can drive it with stub `steps` (#4198).
 */
export const check = (steps: readonly Step[] = STEPS, { quiet = false }: { quiet?: boolean } = {}): CheckReport => {
  const say = quiet ? QUIET : LOUD;
  const line = (s: string) => say.err(`${s}\n`);
  const tmp = mkdtempSync(join(tmpdir(), 'prism3-regen-'));
  const outSnap = join(tmp, 'out');
  const schemaSnap = join(tmp, 'schema');
  const engineSnap = join(tmp, 'engine');
  const reportSnap = join(tmp, 'reports');
  const reportDir = join(repoRoot, REPORTS_DIR);
  const referenceSnap = join(tmp, 'reference');
  const referenceDir = join(repoRoot, REFERENCE_DIR);
  const report: CheckReport = { inSync: false, failed: null, silent: [], unwritten: [], checked: 0 };
  // Set once every snapshot is complete. The restore runs only then: a restore from a half-taken snapshot would delete
  // what it never copied. Nothing is aged or regenerated before it is set.
  let snapped = false;
  let reportsBefore: string[] = [], referenceBefore: string[] = [];
  const drifted: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  let namedUnwritten: string[] = [], onDemandWritten: string[] = [], onDemandTracked: string[] = [];
  let uncommittedMissing: string[] = [], uncommittedTracked: string[] = [];
  try {
    // An on-demand file must not be tracked by git either (review on #2685). Both walks skip the name, so a copy
    // committed by `git add -f`, a lost .gitignore line or a conflict resolved toward an older branch would otherwise
    // go stale unseen. Read from the index, not the disk: a local, ignored copy is expected. A git that cannot answer
    // fails closed, never passes.
    const lsFiles = spawnSync('git', ['ls-files', '--', ...ON_DEMAND_OUT.map((f) => `packages/engine/out/${f}`)], { cwd: repoRoot, encoding: 'utf8' });
    // The same question for the uncommitted exports (#3698 R3): regen writes them, git must not track them.
    const lsUncommitted = spawnSync('git', ['ls-files', '--', ...UNCOMMITTED_OUT.map((f) => `packages/engine/out/${f}`)], { cwd: repoRoot, encoding: 'utf8' });
    if (lsUncommitted.status !== 0) {
      line(`\n✗ cannot tell whether an uncommitted export is committed — git ls-files exited ${lsUncommitted.status}: ${(lsUncommitted.stderr || '').trim()}`);
      return report;
    }
    uncommittedTracked = lsUncommitted.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lsFiles.status !== 0) {
      line(`\n✗ cannot tell whether an on-demand file is committed — git ls-files exited ${lsFiles.status}: ${(lsFiles.stderr || '').trim()}`);
      return report;
    }
    onDemandTracked = lsFiles.stdout.split('\n').map((l) => l.trim()).filter(Boolean);

    cpSync(outDir, outSnap, { recursive: true, preserveTimestamps: true });
    mkdirSync(schemaSnap, { recursive: true });
    for (const f of [...SCHEMA_ARTIFACTS, ...MAINTAINER_ARTIFACTS]) cpSync(join(schemaDir, f), join(schemaSnap, f), { preserveTimestamps: true });
    mkdirSync(engineSnap, { recursive: true });
    for (const f of ENGINE_ARTIFACTS) cpSync(join(here, f), join(engineSnap, f), { preserveTimestamps: true });
    // A report that is not committed yet is a `missing` artifact, not a crash: snapshot only what exists.
    mkdirSync(reportSnap, { recursive: true });
    reportsBefore = REPORT_ARTIFACTS.filter((f) => existsSync(join(reportDir, f)));
    for (const f of reportsBefore) cpSync(join(reportDir, f), join(reportSnap, f), { preserveTimestamps: true });
    mkdirSync(referenceSnap, { recursive: true });
    referenceBefore = REFERENCE_ARTIFACTS.filter((f) => existsSync(join(referenceDir, f)));
    for (const f of referenceBefore) cpSync(join(referenceDir, f), join(referenceSnap, f), { preserveTimestamps: true });
    snapped = true;
    // An on-demand file's mtime, or null when there is none — compared after regenerate() to catch a step that writes it.
    const onDemandStamp = (f: string): number | null => (existsSync(join(outDir, f)) ? statSync(join(outDir, f)).mtimeMs : null);
    const onDemandBefore = ON_DEMAND_OUT.map(onDemandStamp);

    // Age every committed artifact to the epoch first (#1059), so "a step wrote it" is a changed mtime that no clock
    // granularity can hide. The snapshot above kept the real timestamps, and the restore below puts them back.
    const committed = artifactPaths();
    for (const p of committed) utimesSync(p, 0, 0);
    const { written, silent } = regenerate(steps, say);
    report.silent = silent;
    // Committed, still on disk, and written by no step: the copy is a corpse the byte comparison would read as in sync.
    const unwritten = committed.filter((p) => existsSync(p) && !written.has(p)).map((p) => relative(repoRoot, p));
    report.unwritten = unwritten;

    // out/ — generated wholesale, so the whole tree is the comparison universe.
    const before = new Map(walk(outSnap).map((p) => [relative(outSnap, p), p]));
    const after = new Map(walk(outDir).map((p) => [relative(outDir, p), p]));
    for (const [rel, p] of after) {
      const was = before.get(rel);
      if (!was) { added.push(`packages/engine/out/${rel}`); continue; }
      if (!readFileSync(was).equals(readFileSync(p))) drifted.push(`packages/engine/out/${rel}`);
    }
    for (const rel of before.keys()) if (!after.has(rel)) removed.push(`packages/engine/out/${rel}`);
    // Stale IN PLACE (#1059): regen deletes nothing before it writes, so a file no step emits any more is still on
    // disk and `after` holds it. `unwritten` is what makes this arm reachable; the line above alone never fired.
    for (const f of unwritten) if (f.startsWith('packages/engine/out/') && !UNCOMMITTED_OUT.includes(f.slice('packages/engine/out/'.length))) removed.push(f);
    // The named lists (schema/, engine root, reports, reference): fixed paths, compared pairwise, so before #1059 they
    // had no removal concept at all. A named artifact no step wrote is stale exactly as an `out/` one is.
    namedUnwritten = unwritten.filter((f) => !f.startsWith('packages/engine/out/'));
    // out/ — the on-demand files: regen must not write them at all (Q319.6).
    onDemandWritten = ON_DEMAND_OUT.filter((f, i) => onDemandStamp(f) !== onDemandBefore[i]).map((f) => `packages/engine/out/${f}`);
    // out/ — the uncommitted exports: regen must still write every one (#3698 R3). Read before the restore below.
    // An old copy on disk is not evidence of emission (#1059): the export must have been WRITTEN by this run.
    uncommittedMissing = UNCOMMITTED_OUT.map((f) => `packages/engine/out/${f}`).filter((f) => !written.has(join(repoRoot, f)));

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
    report.checked = after.size + SCHEMA_ARTIFACTS.length + MAINTAINER_ARTIFACTS.length + ENGINE_ARTIFACTS.length + REPORT_ARTIFACTS.length + REFERENCE_ARTIFACTS.length;
  } catch (e) {
    if (!(e instanceof StepFailed)) throw e;
    report.failed = e.message;
  } finally {
    // Restore the committed state either way — the gate reports, it never rewrites, and a step that FAILED is "either
    // way" too (#4199): a restore after the try block was skipped by the old `process.exit` inside it. Every copy, the
    // snapshot and the restore, keeps its timestamps (#2067): without that, a clean `--check` left each artifact newer
    // than a bundle built just before it, and `assertBundleFresh` refused that bundle as stale. `icon-glyphs.ts`
    // compiles into both bundles, and a `--check` run after a build must not leave it stale. `out/` is put back IN
    // PLACE, never deleted and recopied (#2029): a build reading it meanwhile must find it.
    try {
      if (snapped) {
        restoreTree(outSnap, outDir);
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
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }

  if (report.failed) {
    line(`\n✗ regen --check could not finish: a step failed (${report.failed}). The committed artifacts are back as they were.`);
    return report;
  }
  const { silent, checked } = report;
  if (!silent.length && !drifted.length && !added.length && !removed.length && !namedUnwritten.length && !onDemandWritten.length && !onDemandTracked.length && !uncommittedMissing.length && !uncommittedTracked.length) {
    say.out(`\n✓ in sync — ${checked} committed artifacts byte-match what the engine emits.\n`);
    // #3698 R4: CI's coverage step reads this count instead of running `--check` a second time. Written only
    // in sync, so a drifted or failed run leaves no file and the coverage step fails on reading nothing.
    if (process.env.REGEN_CHECK_REPORT && !quiet) writeFileSync(process.env.REGEN_CHECK_REPORT, `${checked} committed artifacts\n`);
    report.inSync = true;
    return report;
  }
  line('\n✗ committed artifacts have DRIFTED from what the engine emits:');
  for (const f of drifted) line(`    changed  ${f}`);
  for (const f of added) line(`    missing  ${f}  (engine emits it; not committed)`);
  for (const f of removed) line(`    stale    ${f}  (committed; engine no longer emits it)`);
  for (const f of namedUnwritten) line(`    stale    ${f}  (committed; no regen step wrote it — #1059)`);
  silentLines(silent, say);
  for (const f of onDemandWritten) line(`    on-demand ${f}  (regen wrote it; it is built on demand and never committed — ON_DEMAND_OUT, Q319.6)`);
  for (const f of onDemandTracked) line(`    on-demand ${f}  (git tracks it; it is built on demand and never committed — ON_DEMAND_OUT, Q319.6)`);
  for (const f of uncommittedMissing) line(`    unwritten ${f}  (regen no longer emits it; it is generated and never committed — UNCOMMITTED_OUT, #3698 R3)`);
  for (const f of uncommittedTracked) line(`    uncommitted ${f}  (git tracks it; it is generated and never committed — UNCOMMITTED_OUT, #3698 R3)`);
  if (drifted.length || added.length || removed.length) line('\n  Fix: npx tsx packages/engine/regen.ts   then commit the result (git rm a stale file).');
  silentFix(silent, say);
  if (namedUnwritten.length) line('\n  Fix: the step that emits it must still write it, or take it out of its artifact list and every reader.');
  if (onDemandWritten.length) line('\n  Fix: take the step that writes it out of STEPS; an on-demand file is built by its own command, never by regen.');
  if (onDemandTracked.length || uncommittedTracked.length) line('\n  Fix: git rm --cached <file>, and keep its line in .gitignore.');
  if (uncommittedMissing.length) line('\n  Fix: emit-component-docs.ts must still write it, or take it out of UNCOMMITTED_OUT and every reader.');
  return report;
};

// Run the CLI only when invoked directly — not when another module imports the ARTIFACTS constants.
// Without this, `import { SCHEMA_ARTIFACTS } from './regen'` performs a full regenerate() as a side
// effect of reading two arrays: the importer silently rewrites every committed artifact, discarding
// any in-progress local edit, and a failure inside regenerate() surfaces as a stack trace about
// artifact generation from a script the developer ran for something else entirely.
// Same guard, and the same reason, as `materialise-to-figma.ts` — which already carries it precisely
// so `test.ts` can import `aliasRows` without running a CLI.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) { console.log('Checking committed artifacts for drift…'); process.exitCode = check().inSync ? 0 : 1; }
  else {
    console.log('Regenerating committed artifacts…');
    try {
      const { silent } = regenerate();
      if (silent.length) { console.error('\n✗ a regen step wrote nothing:'); silentLines(silent); silentFix(silent); process.exitCode = 1; }
      else console.log('\n✓ regenerated.');
    } catch (e) {
      if (!(e instanceof StepFailed)) throw e;
      process.exitCode = 1;
    }
  }
}
