// regen.ts — the single entry point for regenerating EVERY committed generated artifact — `out/**`,
// the three emitted `schema/` contracts, and the two engine-root reports — plus the drift gate that
// proves the committed copies still match what the engine emits (#281).
//
// Why this exists: regeneration used to be four separate commands, and only `emit-dtcg.ts`
// (nb/aurora/harbor) was in the habitual path — so `tokens.html` and the wendys artifacts rotted
// silently across many merged PRs. Nothing caught it because every other gate (`test.ts`,
// `nb-regression.ts`, alias resolution, contrast contracts) runs the engine LIVE and compares it
// against itself; none of them ever reads the committed file.
//
//   npx tsx Prism3/engine/regen.ts            # regenerate everything, in place
//   npx tsx Prism3/engine/regen.ts --check    # fail (exit 1) if the committed artifacts have drifted
//
// `--check` snapshots `out/` first, regenerates, byte-compares, then restores the snapshot — so it
// never leaves the tree dirty, whatever the answer. That keeps it safe to run mid-edit: it answers
// "is `out/` in sync with the sources as they stand right now", which on a clean CI checkout is
// exactly "does the committed `out/` match the committed sources".

import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, 'out');
const schemaDir = resolve(here, '..', 'schema');
const repoRoot = resolve(here, '..', '..');

// The seven emitters, in dependency order: `visualize` reads the `*.tokens.json` that `emit-dtcg`
// (nb/aurora/harbor) and `cli` (wendys) write, so it has to run last among those. wendys goes
// through `cli.ts` rather than `emit-dtcg.ts` because it is a STANDARD-dialect brief, not an
// engine-native one — that split is precisely why it kept getting missed.
const STEPS: Array<{ label: string; args: string[] }> = [
  { label: 'emit-dtcg      (nb · aurora · harbor)', args: ['Prism3/engine/emit-dtcg.ts'] },
  { label: 'nb-regression  (regression report)', args: ['Prism3/engine/nb-regression.ts'] },
  { label: 'cli            (wendys + fidelity)', args: ['Prism3/engine/cli.ts', 'Prism3/examples/wendys.design.md', '--out', 'Prism3/engine/out', '--fidelity'] },
  { label: 'emit-figma     (out/figma/**)', args: ['Prism3/engine/emit-figma.ts'] },
  { label: 'visualize      (tokens.html)', args: ['Prism3/engine/visualize.ts'] },
  { label: 'emit-levers    (lever-manifest)', args: ['Prism3/engine/emit-levers.ts'] },
  { label: 'emit-preview   (preview-spec)', args: ['Prism3/engine/emit-preview.ts'] },
  { label: 'emit-brandinput(example-brands)', args: ['Prism3/engine/emit-brandinput.ts'] },
];

// Committed generated artifacts that live at the ENGINE ROOT rather than under `out/`. Both were
// outside the comparison until now: `modes-report.md` was regenerated (emit-dtcg writes it) but never
// CHECKED, and `nb-regression-report.md` was neither regenerated nor checked — so this file's own
// claim to cover "every committed artifact" was an overclaim. Both are gated now.
export const ENGINE_ARTIFACTS = ['modes-report.md', 'nb-regression-report.md'];

// `schema/` mixes hand-authored contracts (theme-schema.json) with emitted ones, so unlike `out/`
// — which is generated wholesale — it is compared file-by-file against this list. These three are
// the same class of risk as the `out/` drift that prompted #281: committed, generated, and until
// now unverified. They happen to be in sync today; the point is that nothing was keeping them so.
export const SCHEMA_ARTIFACTS = ['lever-manifest.json', 'preview-spec.json', 'example-brands.json'];

// Every file under `out/`, repo-relative, sorted — the comparison universe. Walks rather than
// globbing so `out/figma/<brand>/*.json` is covered without naming each brand.
const walk = (dir: string): string[] => {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) found.push(...walk(p));
    else found.push(p);
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
  try {
    cpSync(outDir, outSnap, { recursive: true });
    mkdirSync(schemaSnap, { recursive: true });
    for (const f of SCHEMA_ARTIFACTS) cpSync(join(schemaDir, f), join(schemaSnap, f));
    mkdirSync(engineSnap, { recursive: true });
    for (const f of ENGINE_ARTIFACTS) cpSync(join(here, f), join(engineSnap, f));

    regenerate();

    const drifted: string[] = [];
    const added: string[] = [];
    const removed: string[] = [];

    // out/ — generated wholesale, so the whole tree is the comparison universe.
    const before = new Map(walk(outSnap).map((p) => [relative(outSnap, p), p]));
    const after = new Map(walk(outDir).map((p) => [relative(outDir, p), p]));
    for (const [rel, p] of after) {
      const was = before.get(rel);
      if (!was) { added.push(`Prism3/engine/out/${rel}`); continue; }
      if (!readFileSync(was).equals(readFileSync(p))) drifted.push(`Prism3/engine/out/${rel}`);
    }
    for (const rel of before.keys()) if (!after.has(rel)) removed.push(`Prism3/engine/out/${rel}`);

    // schema/ — only the named emitted files; the hand-authored contracts alongside them are not ours.
    for (const f of SCHEMA_ARTIFACTS) {
      if (!readFileSync(join(schemaSnap, f)).equals(readFileSync(join(schemaDir, f)))) drifted.push(`Prism3/schema/${f}`);
    }
    // engine root — the two committed reports.
    for (const f of ENGINE_ARTIFACTS) {
      if (!readFileSync(join(engineSnap, f)).equals(readFileSync(join(here, f)))) drifted.push(`Prism3/engine/${f}`);
    }

    // Restore the committed state either way — the gate reports, it never rewrites.
    rmSync(outDir, { recursive: true, force: true });
    cpSync(outSnap, outDir, { recursive: true });
    for (const f of SCHEMA_ARTIFACTS) cpSync(join(schemaSnap, f), join(schemaDir, f));
    for (const f of ENGINE_ARTIFACTS) cpSync(join(engineSnap, f), join(here, f));

    const checked = after.size + SCHEMA_ARTIFACTS.length + ENGINE_ARTIFACTS.length;
    if (!drifted.length && !added.length && !removed.length) {
      console.log(`\n✓ in sync — ${checked} committed artifacts byte-match what the engine emits.`);
      return;
    }
    console.error('\n✗ committed artifacts have DRIFTED from what the engine emits:');
    for (const f of drifted) console.error(`    changed  ${f}`);
    for (const f of added) console.error(`    missing  ${f}  (engine emits it; not committed)`);
    for (const f of removed) console.error(`    stale    ${f}  (committed; engine no longer emits it)`);
    console.error('\n  Fix: npx tsx Prism3/engine/regen.ts   then commit the result.');
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
