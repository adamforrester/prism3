/**
 * The site serves each hosted brand's shadcn registry item at `/r/<brand>.json` (#2997, Q2997.19 A), so
 * `npx shadcn add https://<site>/r/<brand>.json` installs that brand's theme. Only the house brand and the engine's
 * made-up example brands are hosted (owner decision on #4373, 2026-11-20): the reference brand and any other real-brand
 * fixture keep their items in the repo and must never reach the site.
 *
 *   npx tsx apps/studio/test-shadcn-registry.ts
 *
 * WHAT THIS RUNS. The real `build-site.mjs`, as a child process, the file `vercel.json`'s `buildCommand` runs, then reads
 * the `public/` it wrote.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is the site build's copy and its allow-list. The oracle
 * is (1) this file's own list of hostable brands, `HOSTABLE`, typed here and never read from `build-site.mjs`, so widening
 * the build's list alone fails this suite; (2) the committed regen artifacts, listed with this file's own pattern
 * (`<brand>.registry-item.json` in `packages/engine/out/shadcn/`) and read with `readFileSync`, which supply the brands
 * that must NOT be hosted (every item outside `HOSTABLE`, so a new real-brand fixture is covered with no edit here); and
 * (3) the URL shape `/r/<brand>.json`, typed here as a literal. The URL half is tied to the deploy through `vercel.json`:
 * its `outputDirectory` is the `public/` read here, so `public/r/<brand>.json` is served at `/r/<brand>.json`.
 *
 * Mutations this fails by name: a fixture brand added to the build's allow-list, or the build copying every item in
 * `out/shadcn/` again → `public/r/<brand>.json is not built: <brand> is a fixture, not a hosted brand` and `public/r/
 * holds exactly the hosted brands`; the copy removed → `public/r/<brand>.json is out/shadcn/<brand>.registry-item.json,
 * byte for byte` for every hosted brand (and the build's own manifest check fails first); the copy re-serialized
 * (`JSON.stringify(JSON.parse(…))`) → the same lines; `outputDirectory` moved → `vercel.json publishes apps/studio/public`;
 * the README naming a fixture brand's address → `README names exactly the hosted /r/ addresses`.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '../..');

// The brands the owner allows on the public site (#4373): the house brand and the engine's made-up example brands.
const HOSTABLE = ['aurora', 'harbor', 'prism3'];

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

// THE ORACLE: every committed registry item, by this file's own pattern, split by this file's own allow-list.
const OUT = join(REPO, 'packages/engine/out/shadcn');
const ITEM = /^([a-z0-9-]+)\.registry-item\.json$/;
const brands = readdirSync(OUT).map((f) => ITEM.exec(f)?.[1]).filter((b): b is string => !!b).sort();
const missingHostable = HOSTABLE.filter((b) => !brands.includes(b));
ok(missingHostable.length === 0, `out/shadcn/ holds a registry item for every hosted brand (${HOSTABLE.join(', ')})`,
  `no item for ${missingHostable.join(', ')}`);
const fixtures = brands.filter((b) => !HOSTABLE.includes(b));
// A scope over nothing is not a pass: the exclusion below is only exercised while a fixture item exists to exclude.
ok(fixtures.length >= 1, `out/shadcn/ holds at least one fixture item that must not be hosted (${fixtures.length})`);

// THE SUBJECT: the real site build.
const build = spawnSync(process.execPath, [join(HERE, 'build-site.mjs')], { cwd: HERE, encoding: 'utf8', env: { ...process.env, VERCEL_GIT_COMMIT_SHA: '' } });
ok(build.status === 0, 'build-site.mjs exits 0', `exit ${build.status}\n${(build.stderr || build.stdout || '').slice(-800)}`);

const PUB_R = join(HERE, 'public/r');
for (const b of HOSTABLE) {
  const src = join(OUT, `${b}.registry-item.json`);
  const want = existsSync(src) ? readFileSync(src) : undefined;
  const at = join(PUB_R, `${b}.json`);
  const got = existsSync(at) ? readFileSync(at) : undefined;
  ok(!!got && !!want && got.equals(want), `public/r/${b}.json is out/shadcn/${b}.registry-item.json, byte for byte`,
    got ? `${got.length} bytes built, ${want?.length ?? 'no'} committed` : 'not built');
  // What `shadcn add` reads: a registry item for this brand, a theme.
  let item: { $schema?: string; name?: string; type?: string } = {};
  try { item = JSON.parse(String(got ?? '{}')); } catch { /* reported below */ }
  ok(item.$schema === 'https://ui.shadcn.com/schema/registry-item.json' && item.name === b && item.type === 'registry:theme',
    `public/r/${b}.json is a shadcn registry:theme item named ${b}`, `$schema ${item.$schema}, name ${item.name}, type ${item.type}`);
}
for (const b of fixtures) {
  ok(!existsSync(join(PUB_R, `${b}.json`)), `public/r/${b}.json is not built: ${b} is a fixture, not a hosted brand`);
}
const built = existsSync(PUB_R) ? readdirSync(PUB_R).sort() : [];
const wantFiles = HOSTABLE.map((b) => `${b}.json`).sort();
ok(JSON.stringify(built) === JSON.stringify(wantFiles), 'public/r/ holds exactly the hosted brands, and nothing else',
  `built [${built.join(', ')}], want [${wantFiles.join(', ')}]`);

// THE README names the hosted addresses and no other (#4373).
const readme = readFileSync(join(HERE, 'README.md'), 'utf8');
const named = [...new Set([...readme.matchAll(/\/r\/([a-z0-9-]+)\.json/g)].map((m) => m[1]))].sort();
ok(JSON.stringify(named) === JSON.stringify([...HOSTABLE].sort()), 'README names exactly the hosted /r/ addresses',
  `README names [${named.join(', ')}], want [${[...HOSTABLE].sort().join(', ')}]`);

console.log(failed ? `\n✗ ${failed} of ${executed} failed` : `\n✓ ${executed}/${executed} shadcn registry hosting assertions passed`);
process.exit(failed ? 1 : 0);
