/**
 * THE BUNDLE SIZE BUDGET (#4233). Nothing failed when a shipped bundle grew: the one size signal was esbuild's own `⚠️`
 * beside `dist/main.js 1.7mb`, printed on every build. Every def, mark, guide and release note lands in two or three
 * bundles, so this turns "it got slower" into a failure, by name, in the PR that grew it.
 *
 *   npx tsx apps/plugin/test-size-budget.ts
 *
 * WHAT IT MEASURES. Each shipped artifact, from its real build, run here as a child process so the reading can never be
 * a stale file left by an earlier build: `apps/studio/build-site.mjs` (what Vercel deploys), `apps/plugin/build.mjs
 * --release` and `--release --offline` (what is published to Figma; run with `CI=1` so a working tree with changes
 * builds, as CI's does, with the same warning; each artifact is deleted before its build, so a failed build fails as a
 * missing file, never as the last build's size), and the chrome stylesheet from `buildChromeCss()`, the function the
 * esbuild plugin returns as `p3:chrome-css`. Raw bytes for the plugin, because Figma evaluates the files uncompressed;
 * gzip -9 for the web page, because that is what crosses the network.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The ceilings are authored numbers in `size-budget.json`, never
 * derived from a build, and only a reviewed diff raises one (the rule `ARTIFACT_FLOOR` follows). The artifacts are
 * typed here, in `PROMISED`, not read from the budget file: an entry deleted from the file fails as unrepresented, and
 * a file the build stopped writing fails as missing, by name, never as 0 bytes. The comparison proves it can fail
 * first, on a reading typed over its ceiling.
 *
 * THE NUMBERS ARE A DRAFT: #4233 proposed them and the owner confirms them (`status` in the file says so). They are its
 * "after the minify issues land" ceilings, about 10% over the sizes measured once #4231 and #4232 minified the bundles.
 *
 * Mutation this fails by name: a 400 KB string constant exported from a module the plugin UI renders (#4233) →
 * `plugin-release-ui: apps/plugin/release/ui.html is within its ceiling` (and the offline row).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
// @ts-expect-error — a Node-only .mjs with no types; it returns `{ css, errors }`.
import { buildChromeCss } from '../studio/chrome/esbuild-plugin.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');

type Measure = 'raw' | 'gzip';
interface Entry { id: string; file: string | null; measure: Measure; ceiling: number }

/** What the budget promises to hold, typed here (not read from the file under check). */
const PROMISED: Record<string, { file: string | null; measure: Measure }> = {
  'studio-site-main': { file: 'apps/studio/public/dist/main.js', measure: 'gzip' },
  'plugin-release-main': { file: 'apps/plugin/release/main.js', measure: 'raw' },
  'plugin-release-ui': { file: 'apps/plugin/release/ui.html', measure: 'raw' },
  'plugin-offline-ui': { file: 'apps/plugin/release-offline/ui.html', measure: 'raw' },
  'chrome-css': { file: null, measure: 'raw' },
};

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
};

export const measure = (bytes: Buffer, m: Measure): number => (m === 'gzip' ? gzipSync(bytes, { level: 9 }).length : bytes.length);
/** The verdict for one reading: null within the ceiling, else the line that names it. */
export const overBudget = (id: string, size: number, ceiling: number): string | null =>
  size <= ceiling ? null : `${id}: ${size.toLocaleString('en-US')} B is ${(size - ceiling).toLocaleString('en-US')} B over its ${ceiling.toLocaleString('en-US')} B ceiling`;

// 1. The comparison can fail, and the gzip measure is a real one.
ok(overBudget('canary', 1001, 1000)?.startsWith('canary: 1,001 B is 1 B over') === true && overBudget('canary', 1000, 1000) === null,
  'self-check: a reading one byte over its ceiling fails, and one at it passes');
{
  const text = Buffer.from('a'.repeat(10_000));
  ok(measure(text, 'raw') === 10_000 && measure(text, 'gzip') < 200, 'self-check: raw counts bytes, and gzip compresses');
}

// 2. The budget file holds exactly the promised artifacts, each with a usable ceiling.
const budget = JSON.parse(readFileSync(join(HERE, 'size-budget.json'), 'utf8')) as { status?: string; artifacts: Entry[] };
const byId = new Map(budget.artifacts.map((a) => [a.id, a]));
for (const [id, want] of Object.entries(PROMISED)) {
  const e = byId.get(id);
  ok(!!e && e.file === want.file && e.measure === want.measure && Number.isInteger(e.ceiling) && e.ceiling > 0,
    `${id}: size-budget.json gives it a ceiling, measured ${want.measure}${want.file ? ` on ${want.file}` : ''}`, JSON.stringify(e));
}
const extra = budget.artifacts.map((a) => a.id).filter((id) => !(id in PROMISED));
ok(extra.length === 0, 'size-budget.json lists no artifact this gate does not measure', extra.join(', '));

// 3. The real builds.
const builds: Array<[string, string[], NodeJS.ProcessEnv]> = [
  ['apps/studio/build-site.mjs', [], { VERCEL_GIT_COMMIT_SHA: '' }],
  ['apps/plugin/build.mjs', ['--release'], { CI: '1' }],
  ['apps/plugin/build.mjs', ['--release', '--offline'], { CI: '1' }],
];
// Each file is deleted first, so a build that fails leaves its artifact missing (failing by name below) instead of an
// earlier build's file to be measured as if it were this one's.
for (const want of Object.values(PROMISED)) if (want.file) rmSync(join(REPO, want.file), { force: true });
for (const [script, args, env] of builds) {
  const r = spawnSync(process.execPath, [join(REPO, script), ...args], { cwd: dirname(join(REPO, script)), encoding: 'utf8', env: { ...process.env, ...env } });
  ok(r.status === 0, `${script} ${args.join(' ')} exits 0`.trimEnd(), `exit ${r.status}\n${(r.stderr || r.stdout || '').slice(-800)}`);
}

// 4. Each artifact, read as it was just built, against its ceiling.
const rows: string[] = [];
for (const [id, want] of Object.entries(PROMISED)) {
  const e = byId.get(id);
  if (!e) continue;   // already failed above, by name
  let bytes: Buffer | null = null;
  if (want.file === null) {
    const { css, errors } = buildChromeCss() as { css: string | null; errors: string[] };
    ok(css !== null, `${id}: buildChromeCss() returns the stylesheet`, errors.slice(0, 3).join('; '));
    if (css !== null) bytes = Buffer.from(css, 'utf8');
  } else {
    const path = join(REPO, want.file);
    ok(existsSync(path), `${id}: ${want.file} was written by its build`);
    if (existsSync(path)) bytes = readFileSync(path);
  }
  if (!bytes) continue;
  const size = measure(bytes, want.measure);
  const over = overBudget(id, size, e.ceiling);
  ok(over === null, `${id}: ${want.file ?? 'the chrome CSS'} is within its ceiling (${want.measure} ${size.toLocaleString('en-US')} of ${e.ceiling.toLocaleString('en-US')} B)`,
    `${over}. If the growth is meant, raise the ceiling in apps/plugin/size-budget.json and say why in the PR.`);
  rows.push(`    ${id.padEnd(20)} ${want.measure.padEnd(4)} ${size.toLocaleString('en-US').padStart(10)} / ${e.ceiling.toLocaleString('en-US').padStart(10)} B  (${Math.round((100 * size) / e.ceiling)}%)`);
}
console.log(`\n  measured (budget status: ${budget.status ?? 'unset'}):\n${rows.join('\n')}`);

console.log(failed ? `\n${failed} of ${executed} failed` : `\nsize budget: ${executed}/${executed} pass`);
process.exit(failed ? 1 : 0);
