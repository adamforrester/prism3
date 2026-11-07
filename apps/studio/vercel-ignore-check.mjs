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
 *
 * A SECOND QUESTION OF THE SAME METAFILE (UI redesign S8.1): the web bundle carries no component definition. The
 * definitions (`packages/engine/components/*.ts`) are kept out of the web build on purpose: their prose is about
 * 35 KB gzip, and the web reads a generated catalog instead (`gen-component-catalog.ts`). Being imported is not
 * the test, because a module the bundler resolves can still be eliminated; what counts is a definition module that
 * contributes BYTES to the output (`bytesInOutput`), which is what the web downloads. Until S8.1 three did (Button,
 * IconButton and Icon, about 76 KB gzip), through an import gated on `PRISM3_HOST` that removed the reference but not
 * the modules, whose top-level code is not provably side-effect-free. Independent of its subject (docs/34): the
 * subject is esbuild's output for the web entry; the detector is held to a planted bundle that imports the
 * definitions, which it must find, so a detector that stopped matching fails by name instead of reporting a clean
 * web bundle.
 *
 * A THIRD QUESTION (#3407): every input of the web bundle, wherever it lives, sits under one of the script's trigger
 * paths (`PATHS`). The first question covers engine files only, so a file Studio began importing from elsewhere
 * (`apps/plugin/src/causes.ts`, #3389) could change the site while a change to it skipped the deploy. Its operands and
 * its planted bundle are described where it runs.
 */
import { build } from 'esbuild';
import { chromeCss } from './chrome/esbuild-plugin.mjs';
import { SOURCE_ROOTS as GLYPH_SOURCE_ROOTS } from './chrome/glyphs.mjs';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve, basename, join, matchesGlob } from 'node:path';
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

// WHAT A PLUGIN READS FROM DISK (#3407). The chrome CSS arrives as a virtual module (`p3-chrome:chrome-css`), so the
// files it is built from (the token JSON, the fonts, the icon license) never appear in the metafile. The plugin
// already declares them to esbuild as `watchFiles`, so each `onLoad` result is recorded here, and the scope check
// below treats them as bundle inputs. This wraps the plugin and changes nothing it returns.
const pluginReads = new Set();
const recordReads = (plugin) => ({
  name: plugin.name,
  setup: (b) => plugin.setup({
    ...b,
    onLoad: (opts, cb) => b.onLoad(opts, async (args) => {
      const r = await cb(args);
      for (const f of r?.watchFiles ?? []) pluginReads.add(f);
      return r;
    }),
  }),
});

// `loader` mirrors the real build (#769 — `src/styles.css` arrives as TEXT). Its absence would not
// misreport here, it would fail outright: esbuild refuses to import CSS into JS with no output path
// configured, and `write: false` gives this build none. Kept in step with `build.mjs`
// so the metafile below describes the bundle that actually ships.
const res = await build({
  entryPoints: [resolve(root, 'src/entry.ts')],   // the bundle's entry since #896 — same one `build` names
  bundle: true,
  format: 'esm',
  loader: { '.css': 'text' },
  // `src/entry.ts` imports the virtual `p3:chrome-css` (UI redesign S1.1). Without the plugin this build
  // stops at `Could not resolve "p3:chrome-css"`. The plugin reads `packages/engine/out/*.tokens.json`
  // from disk, so those files never appear in the metafile; they are not on the skip list either, and
  // `vercel-ignore.sh` triggers on all of `packages/engine` apart from that list.
  plugins: [recordReads(chromeCss())],
  absWorkingDir: root,   // metafile paths are relative to this; the scope check below resolves them against it
  write: false,
  metafile: true,
  logLevel: 'silent',
  define: { PRISM3_HOST: "'web'", PRISM3_BUILD: "'check'", PRISM3_TEST_HOOKS: 'false', PRISM3_NETWORK: 'true' },   // as the deployed bundle (#2098)
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

// ---- THE WEB BUNDLE CARRIES NO COMPONENT DEFINITION (UI redesign S8.1; the header's second question) ---------------
// A definition module counts when it puts bytes in the output, not when it is merely resolved. The detector is first
// run on a planted bundle that does import the definitions (the stdin entry below, built the same way), and must find
// Button there: a pattern or a metafile shape that stopped matching would otherwise read as a clean web bundle.
const DEF_DIR = /packages\/engine\/components\/[^/]+\.ts$/;
const defBytes = (meta) => Object.values(meta.outputs).flatMap((o) => Object.entries(o.inputs))
  .filter(([p, v]) => DEF_DIR.test(p.split('\\').join('/')) && v.bytesInOutput > 0)
  .map(([p, v]) => [p.slice(p.indexOf('packages/engine/')), v.bytesInOutput]);
const planted = await build({
  stdin: { contents: "import { componentDefs } from '@prism3/engine/components/index'; console.log(componentDefs.length);", resolveDir: root, loader: 'ts' },
  bundle: true, format: 'esm', write: false, metafile: true, logLevel: 'silent', outfile: 'planted.js',
});
const plantedDefs = defBytes(planted.metafile);
if (!plantedDefs.some(([p]) => p === 'packages/engine/components/button.ts')) {
  console.error(`\n✗ the definition detector does not find packages/engine/components/button.ts in a planted bundle that imports componentDefs (found ${plantedDefs.length} definition module(s)) — it would report the web bundle clean while watching nothing.`);
  process.exit(1);
}
const webDefs = defBytes(res.metafile);
if (webDefs.length) {
  console.error(`\n✗ web bundle carries no component definition module — found ${webDefs.map(([p, n]) => `${p} (${n} bytes)`).join(', ')}.`);
  console.error('  The web reads the generated catalog (apps/studio/gen-component-catalog.ts); a definition belongs in the plugin\'s');
  console.error('  own entry (apps/plugin/src/ui/), never in apps/studio/src, gated or not.');
  process.exit(1);
}
console.log(`  ✓ web bundle carries no component definition module (the detector finds ${plantedDefs.length} in a planted bundle that imports them).`);

// ---- EVERY BUNDLE INPUT SITS UNDER A TRIGGER PATH (#3407) --------------------------------------------------------------
// The skip-list check above asks one question of ENGINE files only. This one asks it of every input: the script skips
// the build when `git diff` over its trigger pathspecs is empty, so an input no pathspec covers is a file whose change
// ships nothing. #3389 was the case: Studio began importing `apps/plugin/src/causes.ts`, and a change to that file
// alone exited 0 (SKIP) with every gate green.
//
// Both operands are read, neither is written here. The bundle's inputs are esbuild's metafile, plus the files the
// chrome plugin reports reading (recorded above). The trigger pathspecs are the script's own: its array code is run
// by bash, so the `:(exclude)` entries it builds from EXCLUDED arrive exactly as `git diff` gets them. Which files
// those pathspecs cover is answered by git (`git ls-files`), with git's pathspec rules, not a reimplementation of them.
// A dependency under `node_modules/` is not tracked; it moves only when `package-lock.json` does, so it counts as
// that file.
const REPO = resolve(root, '../..');
const repoRel = (abs) => abs.slice(REPO.length + 1).split('\\').join('/');
const arrays = sh.slice(0, sh.indexOf('\nBASE='));
if (!/\nPATHS=\(/.test(arrays)) {
  console.error('✗ could not find PATHS=( ... ) before BASE= in apps/studio/vercel-ignore.sh — did its shape change?');
  process.exit(1);
}
const pathspecs = (() => {
  const r = spawnSync('bash', ['-c', `${arrays}\nprintf '%s\\0' "\${PATHS[@]}"`], { encoding: 'utf8' });
  if (r.status !== 0) { console.error(`✗ running the PATHS code of vercel-ignore.sh failed: ${r.stderr}`); process.exit(1); }
  return r.stdout.split('\0').filter(Boolean);
})();
const covered = (() => {
  const r = spawnSync('git', ['ls-files', '-z', '--', ...pathspecs], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.error(`✗ git ls-files over the trigger pathspecs failed: ${r.stderr}`); process.exit(1); }
  return new Set(r.stdout.split('\0').filter(Boolean));
})();
const tracked = (() => {
  const r = spawnSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) { console.error(`✗ git ls-files failed: ${r.stderr}`); process.exit(1); }
  return new Set(r.stdout.split('\0').filter(Boolean));
})();
// READ BY A CHECK, NOT BUILT FROM, BY LITERAL. The chrome plugin also watches every source file under
// `apps/plugin/src/`: its `[glyphs]` check reads their string literals to prove the embedded face can draw them
// (`chrome/glyphs.mjs`). That check can fail the build; it never changes the CSS, so those files are not inputs of the
// deployed bundle. (`apps/studio/src/` is the check's other root, and is a trigger path anyway.) The entry is stale,
// and fails, once the glyph check stops reading that root, so the exemption cannot outlive its reason.
const CHECK_ONLY = ['apps/plugin/src/'];
for (const d of CHECK_ONLY) {
  if (!GLYPH_SOURCE_ROOTS.map((r) => `${repoRel(r)}/`).includes(d)) {
    console.error(`✗ CHECK_ONLY names ${d}, which the [glyphs] check no longer reads (chrome/glyphs.mjs SOURCE_ROOTS) — remove it, so the chrome plugin's reads there are checked as bundle inputs.`);
    process.exit(1);
  }
}
// A namespaced input (`p3-chrome:chrome-css`) is virtual: it has no file of its own, and is checked through the reads
// its plugin recorded. One with no recorded reads fails, because nothing would stand behind it.
const VIRTUAL = /^[a-z0-9-]+:/i;
const inputsOf = (meta, reads) => {
  const files = [], virtual = [];
  for (const p of Object.keys(meta.inputs)) (VIRTUAL.test(p) ? virtual : files).push(p);
  const read = [...reads].map(repoRel).filter((f) => !CHECK_ONLY.some((d) => f.startsWith(d)));
  return { virtual, read, files: [...files.map((p) => repoRel(resolve(root, p))), ...read] };
};
const uncovered = ({ files }) => files
  .map((f) => (f.split('/').includes('node_modules') ? { f, as: 'package-lock.json' } : { f, as: f }))
  .filter(({ as }) => !covered.has(as))
  .map(({ f, as }) => `${f}${tracked.has(as) ? '' : ' (not tracked by git, so no commit can change it: generate it from a covered file)'}`)
  .sort();

// The detector, held to a planted bundle first (docs/34): it imports a plugin file that is under no trigger path, and
// the check must name that file. A path mapping or pathspec reading that stopped matching would otherwise report every
// input covered.
const PLANT = 'apps/plugin/src/pace.ts';
const plantedOut = await build({
  stdin: { contents: "import { PACE_MS } from '../plugin/src/pace'; console.log(PACE_MS);", resolveDir: root, loader: 'ts' },
  bundle: true, format: 'esm', write: false, metafile: true, logLevel: 'silent', outfile: 'planted.js', absWorkingDir: root,
});
const plantedMiss = uncovered(inputsOf(plantedOut.metafile, new Set()));
if (!plantedMiss.includes(PLANT)) {
  console.error(`\n✗ the scope detector does not report ${PLANT} in a planted bundle that imports it (it reported: ${plantedMiss.join(', ') || 'nothing'}) — it would call every web input covered while checking nothing.`);
  process.exit(1);
}
const web = inputsOf(res.metafile, pluginReads);
// THE SCOPE IS REPRESENTED, not counted: each kind of input the walk promises to check is present in it, so a walk
// that silently lost one (the plugin's reads, everything outside the app) cannot pass by checking less.
const represented = [
  ['an input under apps/studio/', web.files.some((f) => f.startsWith('apps/studio/'))],
  ['an input outside apps/studio/', web.files.some((f) => !f.startsWith('apps/studio/'))],
  ['a file the chrome plugin builds the CSS from', web.read.length > 0],
];
const absent = represented.filter(([, ok]) => !ok).map(([what]) => what);
const unbacked = web.virtual.length && !web.read.length ? web.virtual : [];
if (absent.length || unbacked.length) {
  if (absent.length) console.error(`\n✗ the web-input walk is missing ${absent.join('; ')} — it would pass by checking less than the bundle reads.`);
  if (unbacked.length) console.error(`\n✗ virtual input(s) ${unbacked.join(', ')} with no file recorded behind them.`);
  process.exit(1);
}
const webMiss = uncovered(web);
if (webMiss.length) {
  console.error(`\n✗ ${webMiss.length} web bundle input(s) sit under no trigger path in apps/studio/vercel-ignore.sh — a change to one alone would SKIP the deploy:`);
  for (const f of webMiss) console.error(`    ${f}`);
  console.error('\n  Add each to PATHS in apps/studio/vercel-ignore.sh.');
  process.exit(1);
}
console.log(`  ✓ every web bundle input sits under a trigger path (${web.files.length} files, ${web.read.length} of them read by the chrome plugin; the detector reports ${PLANT} in a planted bundle).`);

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
  // Each step commits, then decides against the commit before it as the previously deployed one, the
  // steady state of a branch deployed on every push.
  const step = (path, msg) => { const prev = git('rev-parse', 'HEAD'); touch(path, 'a\n'); git('add', '-A'); git('commit', '-qm', msg); return { VERCEL_ENV: 'production', VERCEL_GIT_PREVIOUS_SHA: prev }; };
  touch('README.md', 'seed\n'); git('add', '-A'); git('commit', '-qm', 'seed');
  expect('no previous deployment on the branch BUILDS (uncertainty builds)', decide({}), 1);
  expect('a previous SHA this clone does not have BUILDS', decide({ VERCEL_GIT_PREVIOUS_SHA: '0123456789abcdef0123456789abcdef01234567' }), 1);
  expect('a bundled engine change BUILDS', decide(step('packages/engine/theme.ts', 'engine')), 1);
  expect('a change to an excluded engine file only is SKIPPED', decide(step('packages/engine/regen.ts', 'excluded')), 0);
  expect('a studio change BUILDS', decide(step('apps/studio/src/main.ts', 'studio')), 1);
  expect('a plugin-only change is SKIPPED', decide(step('apps/plugin/src/x.ts', 'plugin')), 0);
  expect('a change to apps/plugin/src/causes.ts, which the web bundle reads, BUILDS (#3407)', decide(step('apps/plugin/src/causes.ts', 'causes')), 1);
  expect('a vercel.json change BUILDS', decide(step('vercel.json', 'vercel')), 1);
  expect('a docs/public change BUILDS — the site serves it at /docs (#2637)', decide(step('docs/public/llms.txt', 'served docs')), 1);
  // #1953: the branch's newest commit is docs-only, but a commit since the last deployment changed the app.
  const deployed = git('rev-parse', 'HEAD');
  touch('apps/studio/src/main.ts', 'b\n'); git('add', '-A'); git('commit', '-qm', 'studio again');
  touch('docs/progress/pending/x.md', 'a\n'); git('add', '-A'); git('commit', '-qm', 'fragment');
  expect('a docs-only newest commit BUILDS when an earlier commit since the last deployment changed the app (#1953)', decide({ VERCEL_ENV: 'preview', VERCEL_GIT_PREVIOUS_SHA: deployed }), 1);
  expect('a docs-only push on top of the deployed commit is SKIPPED', decide(step('docs/progress/pending/y.md', 'fragment 2')), 0);
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
const rules = Object.entries(vcfg.git?.deploymentEnabled ?? {});
// Vercel's rule, from its Git Configuration docs: keys are minimatch globs; an unmatched branch deploys; a
// branch matching several rules deploys if ANY matching rule is true. Evaluated here per sample branch,
// never by reading one literal key, so a glob such as "*" or "m*" that would also switch off main fails.
const deploys = (branch) => {
  const hits = rules.filter(([glob]) => matchesGlob(branch, glob));
  return hits.length === 0 || hits.some(([, on]) => on === true);
};
for (const [branch, want] of [
  ['main', true], ['ui/p1-test-hardening', true],
  ['lane/radius-large-rungs', false], ['fold/2026-10-01', false], ['docs/mcp-connect-readme', false],
  ['claude/prism3-tokens-rename-etcjdz', false],
]) {
  expect(`branch ${branch} ${want ? 'deploys' : 'does not deploy'}`, deploys(branch) ? 1 : 0, want ? 1 : 0);
}
if (!rules.length) fails.push('vercel.json has no git.deploymentEnabled rules — every branch would deploy (the 2026-09-30 quota failure)');

if (fails.length) {
  console.error(`\n✗ ${fails.length} deploy decision(s) wrong:`);
  for (const f of fails) console.error(`    ${f}`);
  process.exit(1);
}
