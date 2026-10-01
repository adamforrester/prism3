/**
 * Gate for `apps/studio/vercel-ignore.sh` (#474 follow-on).
 *
 * That script skips the Vercel build when a commit touches no file the deployed bundle depends on.
 * Its exclusion list — the engine files the bundle does NOT import — is the one part that can rot:
 * the day someone imports `ai-metadata.ts` into `apps/studio/src`, that file becomes a real bundle input
 * while still sitting on the skip list, and every change to it would quietly ship nothing. The site
 * would go stale with all gates green, which is the exact failure #474 cost a rebuild to diagnose.
 *
 * So the list is not trusted, it is CHECKED: esbuild reports the bundle's true inputs via its
 * metafile, and this asserts the intersection with the exclusion list is empty. The list is read
 * out of the shell script itself rather than duplicated here — two copies of a list is just a
 * slower way to have a stale one.
 *
 * Run: `node apps/studio/vercel-ignore-check.mjs`   (exits non-zero on drift; wired into CI)
 */
import { build } from 'esbuild';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(root, 'vercel-ignore.sh');

// The single source of truth is the shell array, parsed between its delimiters.
const sh = readFileSync(SCRIPT, 'utf8');
const block = /# --- begin excluded[\s\S]*?EXCLUDED=\(([\s\S]*?)\)\n/.exec(sh);
if (!block) {
  console.error('✗ could not find the EXCLUDED=( ... ) block in apps/studio/vercel-ignore.sh — did its shape change?');
  process.exit(1);
}
const excluded = new Set(block[1].split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));

// `loader` mirrors the real build (#769 — `src/styles.css` arrives as TEXT). Its absence would not
// misreport here, it would fail outright: esbuild refuses to import CSS into JS with no output path
// configured, and `write: false` gives this build none. Kept in step with `package.json`'s `build`
// so the metafile below describes the bundle that actually ships.
const res = await build({
  entryPoints: [resolve(root, 'src/entry.ts')],   // the bundle's entry since #896 — same one `build` names
  bundle: true,
  format: 'esm',
  loader: { '.css': 'text' },
  write: false,
  metafile: true,
  logLevel: 'silent',
  define: { PRISM3_HOST: "'web'", PRISM3_BUILD: "'check'" },
});

// The engine's location, as a LITERAL — which is the one thing here that can go stale without
// anything saying so, and the reason for the two floors below. See the `bundled.size` check.
const ENGINE_PREFIX = 'packages/engine/';

const bundled = new Set(
  Object.keys(res.metafile.inputs)
    .filter((p) => p.includes(ENGINE_PREFIX))
    .map((p) => basename(p)),
);

const leaked = [...bundled].filter((f) => excluded.has(f)).sort();

console.log(`Vercel ignore gate — ${bundled.size} engine files in the bundle, ${excluded.size} on the skip list.`);

// ---- BOTH OPERANDS MUST BE NON-EMPTY, or the intersection below is vacuous ------------------------
// This gate compares two sets and reports their intersection is empty. That sentence is TRUE, and
// says nothing, whenever either set is empty — and until #659 nothing here noticed. Measured, with
// only the prefix above repointed to `packages/engine/` and nothing else changed:
//
//     Vercel ignore gate — 0 engine files in the bundle, 29 on the skip list.
//       ✓ no bundled engine file is on the skip list.
//
// Zero files recognized, reported as a pass. Not a wrong answer — a **true statement about an empty
// set** (docs/34 shape 9). It matters more here than in most gates because of what this one guards:
// `vercel-ignore.sh` exits 0 to SKIP, so a stale path on that side does not fail a build, it silently
// stops deploying. A blind gate over a fail-quiet subject is two silences in series.
//
// The floors are deliberately loose — they ask "did anything match at all", not "did 16 match". A
// count pinned to an exact number would fail on every legitimate import change and get raised
// without thought, which is how a floor becomes a number nobody reads. What must never be allowed
// is zero. #650 PR 1 is the case in point: the headline went 15 → 16 the moment the engine moved,
// because `schema/example-brands.json` used to sit at `Prism3/schema/` — OUTSIDE the old
// `Prism3/engine/` prefix — and now lives inside `packages/engine/`. Same 15 `.ts` files, one more
// input newly inside the prefix. An exact pin would have read that as a regression.
if (bundled.size === 0) {
  console.error(`\n✗ no bundle input matched '${ENGINE_PREFIX}' — this gate is looking somewhere the engine no longer is.`);
  console.error('  It would report ✓ over an empty set: "no bundled engine file is on the skip list" is');
  console.error('  unfalsifiable once no file is recognized as bundled. Repoint ENGINE_PREFIX above.');
  process.exit(1);
}
if (excluded.size === 0) {
  console.error('\n✗ the EXCLUDED list in apps/studio/vercel-ignore.sh is empty — there is nothing to check.');
  console.error('  If it was emptied deliberately, delete this floor in the same PR so the choice is visible.');
  process.exit(1);
}
if (leaked.length) {
  console.error(`\n✗ ${leaked.length} file(s) are BOTH bundled and excluded — changes to them would skip the deploy and ship nothing:`);
  for (const f of leaked) console.error(`    packages/engine/${f}`);
  console.error('\n  Remove them from EXCLUDED in apps/studio/vercel-ignore.sh.');
  process.exit(1);
}
console.log('  ✓ no bundled engine file is on the skip list.');

// ---- WHAT THE SCRIPT DECIDES, run for real ---------------------------------------------------------
// The list above can be right while the decision is wrong: a production path that skips an engine change
// ships a stale site (#474). So the script itself runs against throwaway commits in a temp repo, with each
// expected exit code written here as a literal (0 = SKIP, 1 = BUILD). Nothing is derived from the script.
// The scratch repo's git runs with a scrubbed environment: an inherited GIT_DIR or GIT_INDEX_FILE (set by
// git hooks) would otherwise point these commits at the real repository, and a global signing or hooks
// config would make the gate depend on the developer's machine.
const scratch = mkdtempSync(join(tmpdir(), 'p3-ignore-'));
const cleanEnv = (extra = {}) => ({
  PATH: process.env.PATH, HOME: scratch, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', ...extra,
});
const git = (...args) => {
  const r = spawnSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: scratch, encoding: 'utf8', env: cleanEnv() });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed in the scratch repo: ${r.stderr}`);
  return r.stdout.trim();
};
const touch = (path, text) => { mkdirSync(dirname(join(scratch, path)), { recursive: true }); writeFileSync(join(scratch, path), text); };
const decide = (env) => spawnSync('bash', [join(scratch, 'ignore.sh')], { cwd: scratch, env: cleanEnv(env) }).status;
const fails = [];
const expect = (name, got, want) => {
  if (got === want) console.log(`  ✓ ${name}`);
  else fails.push(`${name} (exit ${got}, want ${want} — ${want === 0 ? 'SKIP' : 'BUILD'})`);
};
try {
  copyFileSync(SCRIPT, join(scratch, 'ignore.sh'));
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'gate@example.invalid'); git('config', 'user.name', 'gate');
  touch('README.md', 'seed\n'); git('add', '-A'); git('commit', '-qm', 'seed');
  expect('a commit with no parent BUILDS (uncertainty builds)', decide({}), 1);
  touch('packages/engine/theme.ts', 'a\n'); git('add', '-A'); git('commit', '-qm', 'engine');
  expect('a bundled engine change BUILDS', decide({ VERCEL_ENV: 'production' }), 1);
  touch('packages/engine/regen.ts', 'a\n'); git('add', '-A'); git('commit', '-qm', 'excluded');
  expect('a change to an excluded engine file only is SKIPPED', decide({ VERCEL_ENV: 'production' }), 0);
  touch('apps/studio/src/main.ts', 'a\n'); git('add', '-A'); git('commit', '-qm', 'studio');
  expect('a studio change BUILDS', decide({ VERCEL_ENV: 'production' }), 1);
  touch('apps/plugin/src/x.ts', 'a\n'); git('add', '-A'); git('commit', '-qm', 'plugin');
  expect('a plugin-only change is SKIPPED', decide({ VERCEL_ENV: 'production' }), 0);
  touch('vercel.json', '{}\n'); git('add', '-A'); git('commit', '-qm', 'vercel');
  expect('a vercel.json change BUILDS', decide({ VERCEL_ENV: 'production' }), 1);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

// ---- WHICH BRANCHES DEPLOY AT ALL (owner decision, 2026-10-01) ------------------------------------------
// The Hobby plan allows 100 deployments a day, and on 2026-09-30 the lanes hit it. A build the Ignored Build
// Step skips STILL counts as a deployment (Vercel's docs), so the ignore step cannot save quota; only
// `git.deploymentEnabled` stops a deployment being created. Previews are kept for the branches that edit the
// studio (the UI redesign lane's `ui/*`, during the studio freeze) and for `main`. Checked as literals here:
// a typo that disabled `main` would stop production deploys silently.
const vcfg = JSON.parse(readFileSync(resolve(root, '../../vercel.json'), 'utf8'));
const enabled = vcfg.git?.deploymentEnabled ?? {};
for (const off of ['lane/*', 'fold/*', 'docs/*', 'claude/*']) {
  expect(`vercel.json disables deployments for ${off}`, enabled[off] === false ? 0 : 1, 0);
}
for (const on of ['main', 'ui/*']) {
  expect(`vercel.json leaves ${on} deploying`, enabled[on] === false ? 0 : 1, 1);
}

if (fails.length) {
  console.error(`\n✗ ${fails.length} deploy decision(s) wrong:`);
  for (const f of fails) console.error(`    ${f}`);
  process.exit(1);
}
