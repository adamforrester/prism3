/**
 * The site serves each brand's shadcn registry item at `/r/<brand>.json` (#2997, Q2997.19 A), so
 * `npx shadcn add https://<site>/r/<brand>.json` installs that brand's theme.
 *
 *   npx tsx apps/studio/test-shadcn-registry.ts
 *
 * WHAT THIS RUNS. The real `build-site.mjs`, as a child process, the file `vercel.json`'s `buildCommand` runs, then reads
 * the `public/` it wrote.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is the site build's copy. The oracle is the committed
 * regen artifacts, listed here with this file's own pattern (`<brand>.registry-item.json` in
 * `packages/engine/out/shadcn/`) and read with `readFileSync`, and the URL shape `/r/<brand>.json`, typed here as a
 * literal. Nothing is read from `build-site.mjs`'s own list. The URL half is tied to the deploy through `vercel.json`:
 * its `outputDirectory` is the `public/` read here, so `public/r/<brand>.json` is served at `/r/<brand>.json`.
 *
 * Mutations this fails by name: the copy removed from `build-site.mjs` → `public/r/<brand>.json is out/shadcn/
 * <brand>.registry-item.json, byte for byte` for every brand (and the build's own manifest check fails first); the route
 * renamed to `registry/` → the same lines; the copy re-serialized (`JSON.stringify(JSON.parse(…))`) → the same lines;
 * an extra file under `public/r/` → `public/r/ holds exactly one file per brand`; `outputDirectory` moved → `vercel.json
 * publishes apps/studio/public`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`); }
};

// THE DEPLOY. Vercel builds with `build:site` and publishes `apps/studio/public`, so a file at `public/r/x.json` is the
// URL `/r/x.json`.
const vercel = JSON.parse(readFileSync(join(REPO, 'vercel.json'), 'utf8')) as { buildCommand?: string; outputDirectory?: string };
ok(vercel.outputDirectory === 'apps/studio/public', 'vercel.json publishes apps/studio/public', `outputDirectory: ${vercel.outputDirectory}`);
const studioPkg = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8')) as { scripts?: Record<string, string> };
ok(/\bbuild:site\b/.test(vercel.buildCommand ?? '') && studioPkg.scripts?.['build:site'] === 'node build-site.mjs',
  'vercel.json builds with build:site, which runs build-site.mjs', `buildCommand: ${vercel.buildCommand}; build:site: ${studioPkg.scripts?.['build:site']}`);

// THE ORACLE: every committed registry item, by this file's own pattern.
const OUT = join(REPO, 'packages/engine/out/shadcn');
const ITEM = /^([a-z0-9-]+)\.registry-item\.json$/;
const brands = readdirSync(OUT).map((f) => ITEM.exec(f)?.[1]).filter((b): b is string => !!b).sort();
// A scope over nothing is not a pass: the regen step emits one item per brand, and there is more than one brand.
ok(brands.length >= 2, `out/shadcn/ holds a registry item per brand (${brands.join(', ') || 'none'})`);

// THE SUBJECT: the real site build.
const build = spawnSync(process.execPath, [join(HERE, 'build-site.mjs')], { cwd: HERE, encoding: 'utf8', env: { ...process.env, VERCEL_GIT_COMMIT_SHA: '' } });
ok(build.status === 0, 'build-site.mjs exits 0', `exit ${build.status}\n${(build.stderr || build.stdout || '').slice(-800)}`);

const PUB_R = join(HERE, 'public/r');
for (const b of brands) {
  const want = readFileSync(join(OUT, `${b}.registry-item.json`));
  const at = join(PUB_R, `${b}.json`);
  const got = existsSync(at) ? readFileSync(at) : undefined;
  ok(!!got && got.equals(want), `public/r/${b}.json is out/shadcn/${b}.registry-item.json, byte for byte`,
    got ? `${got.length} bytes built, ${want.length} committed` : 'not built');
  // What `shadcn add` reads: a registry item for this brand, a theme.
  let item: { $schema?: string; name?: string; type?: string } = {};
  try { item = JSON.parse(String(got ?? '{}')); } catch { /* reported below */ }
  ok(item.$schema === 'https://ui.shadcn.com/schema/registry-item.json' && item.name === b && item.type === 'registry:theme',
    `public/r/${b}.json is a shadcn registry:theme item named ${b}`, `$schema ${item.$schema}, name ${item.name}, type ${item.type}`);
}
const built = existsSync(PUB_R) ? readdirSync(PUB_R).sort() : [];
const wantFiles = brands.map((b) => `${b}.json`);
ok(JSON.stringify(built) === JSON.stringify(wantFiles), 'public/r/ holds exactly one file per brand, and nothing else',
  `built [${built.join(', ')}], want [${wantFiles.join(', ')}]`);

console.log(failed ? `\n✗ ${failed} of ${executed} failed` : `\n✓ ${executed}/${executed} shadcn registry hosting assertions passed`);
process.exit(failed ? 1 : 0);
