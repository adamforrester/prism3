/**
 * The deployed web bundle carries no test hook (#2098, item 3; found in the review of #2074).
 *
 *   npx tsx apps/studio/test-prod-bundle.ts
 *
 * `entry.ts` step 8 defines `window.__prism3TestEdit` when the page is opened with `?p3-test-hooks`, so the smoke
 * suite can make an edit no control makes any more. Until #2098 that block shipped in the production bundle too,
 * where anyone could turn it on with a URL. It is now gated on the `PRISM3_TEST_HOOKS` define: `true` in
 * `build.mjs` (the local `dist/` the smoke suite drives), `false` in `build-site.mjs` (what Vercel deploys), and
 * esbuild drops the gated block from a `false` bundle.
 *
 * WHAT THIS RUNS. The real `build-site.mjs`, as a child process, the same file `vercel.json` names as the deploy's
 * build command, and then reads the `public/dist/main.js` it wrote. It never restates the build's options, so a
 * define dropped or flipped in `build-site.mjs` is a define dropped or flipped here.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is esbuild's output for the deploy; the oracle is two
 * literal strings typed here, the URL parameter and the hook's name. An absence check passes vacuously if the
 * strings it looks for were renamed, so it first asserts both literals still appear in `src/entry.ts`'s code: a
 * rename fails here by name rather than reporting a clean bundle. The smoke suite (§2d) separately holds the local
 * `dist/` to HAVING the hook, so the gate cannot have been satisfied by deleting the hook everywhere.
 *
 * WHAT "LACKS IT" MEANS HERE. esbuild without minification (the deploy does not minify, and must match the local
 * build it is developed against) folds the gate to `if (false) { … }` but keeps the block's text. So the URL
 * parameter, the switch, is gone entirely, and the hook's name may remain only as the body of that dead branch:
 * exactly one occurrence, directly under `if (false) {`. Anything else fails.
 *
 * Mutations this fails by name: `PRISM3_TEST_HOOKS: 'false'` → `'true'` in `build-site.mjs`, or the
 * `PRISM3_TEST_HOOKS &&` clause removed from `entry.ts` → `the deployed bundle (build-site.mjs) carries no
 * "p3-test-hooks"` and `the deployed bundle (build-site.mjs) carries no reachable "__prism3TestEdit"`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MARKERS = ['p3-test-hooks', '__prism3TestEdit'];

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
};

// 1. The markers exist in the source the bundle comes from, outside comments, so their absence below means something.
const entryCode = readFileSync(join(HERE, 'src/entry.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
for (const m of MARKERS) ok(entryCode.includes(m), `src/entry.ts still names "${m}" in its code (so its absence from a bundle is not vacuous)`);

// 2. The real deploy build.
const run = spawnSync(process.execPath, [join(HERE, 'build-site.mjs')], { cwd: HERE, encoding: 'utf8', env: { ...process.env, VERCEL_GIT_COMMIT_SHA: '' } });
ok(run.status === 0, `build-site.mjs exits 0`, `exit ${run.status}\n${(run.stderr || run.stdout || '').slice(-800)}`);
const out = join(HERE, 'public/dist/main.js');
ok(existsSync(out), `build-site.mjs wrote public/dist/main.js`);
const bundle = existsSync(out) ? readFileSync(out, 'utf8') : '';
ok(bundle.length > 100_000, `the deployed bundle is a real bundle (${bundle.length} bytes), not an empty file`);
// The switch: the URL parameter the hook listens for must not be in the deployed bundle at all. Without it nothing a
// visitor sends can turn the hook on.
{
  const at = bundle.indexOf('p3-test-hooks');
  ok(bundle.length > 0 && at === -1, `the deployed bundle (build-site.mjs) carries no "p3-test-hooks"`,
    at >= 0 ? `found at byte ${at}: …${bundle.slice(Math.max(0, at - 80), at + 60).replace(/\s+/g, ' ')}…` : '');
}
// The hook itself. esbuild without minification folds the gate to `if (false)` but keeps the block's text, so the
// hook's name can still appear, ONLY as the body of that dead branch: one occurrence, directly under `if (false) {`.
// Any other shape (the gate kept as a runtime test, a second assignment, a reachable one) fails.
{
  const all = [...bundle.matchAll(/__prism3TestEdit/g)].map((m) => m.index ?? -1);
  const dead = /if \(false\) \{\s*window\.__prism3TestEdit = /.exec(bundle);
  const deadAt = dead ? dead.index + dead[0].indexOf('__prism3TestEdit') : -2;
  ok(bundle.length > 0 && (all.length === 0 || (all.length === 1 && all[0] === deadAt)),
    `the deployed bundle (build-site.mjs) carries no reachable "__prism3TestEdit"`,
    all.length ? `${all.length} occurrence(s); first …${bundle.slice(Math.max(0, all[0] - 120), all[0] + 40).replace(/\s+/g, ' ')}…` : '');
}

const EXPECTED = MARKERS.length + 5;
if (executed !== EXPECTED) { failed++; console.error(`  ✗ ran ${executed} checks, expected ${EXPECTED}`); }
console.log(failed ? `\n${failed} of ${executed} failed` : `\nprod bundle: ${executed}/${executed} pass`);
process.exit(failed ? 1 : 0);
