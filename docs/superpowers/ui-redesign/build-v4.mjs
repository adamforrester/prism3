#!/usr/bin/env node
// Builds concept-v4.html from concept-v4.src.html + the real engine.
//
//   node docs/superpowers/ui-redesign/build-v4.mjs
//
// Steps:
//   1. Coverage self-check: every key in packages/engine/schema/lever-manifest.json has exactly
//      one home in the mockup's HOMES block (the one list the levers panel renders from). The
//      oracle is the manifest, never the mockup's own list. Exit 1 on a miss, a duplicate, or a
//      home that names a key the manifest does not have (unless it is declared schema-only).
//   2. Bundle the engine (concept-v4.entry.ts) with esbuild 0.24.0 from the npm cache
//      (`npx -y esbuild@0.24.0`), resolving @prism3/engine/* to packages/engine by alias.
//      Nothing is installed into node_modules.
//   3. Inline the bundle and the build facts into the source, and assert the output makes no
//      network request (no <link>, no remote src, no url(http…), no @import, no @font-face).
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const engine = join(repo, 'packages', 'engine');
const fail = (msg) => { console.error(`build-v4: FAIL: ${msg}`); process.exit(1); };

// ---- 1. coverage self-check -------------------------------------------------------------
const manifest = JSON.parse(readFileSync(join(engine, 'schema', 'lever-manifest.json'), 'utf8'));
const manifestKeys = manifest.levers.map((l) => l.key);
const src = readFileSync(join(here, 'concept-v4.src.html'), 'utf8');
const m = src.match(/<script type="application\/json" id="p3-homes">([\s\S]*?)<\/script>/);
if (!m) fail('no HOMES block (<script type="application/json" id="p3-homes">) in concept-v4.src.html');
const homes = JSON.parse(m[1]);
const seen = new Map();          // key -> [domain › section]
const perDomain = {};
const schemaOnly = [];
for (const d of homes.domains) {
  perDomain[d.label] = { levers: 0, advanced: 0 };
  for (const s of d.sections) for (const row of s.rows) {
    for (const k of row.keys ?? []) {
      if (!seen.has(k)) seen.set(k, []);
      seen.get(k).push(`${d.label} › ${s.title}`);
      if (manifestKeys.includes(k)) { perDomain[d.label].levers++; if (s.advanced) perDomain[d.label].advanced++; }
    }
    for (const k of row.schemaOnly ?? []) schemaOnly.push(`${k} (${d.label} › ${s.title})`);
  }
}
const missing = manifestKeys.filter((k) => !seen.has(k));
const dup = [...seen].filter(([, where]) => where.length > 1);
const unknown = [...seen.keys()].filter((k) => !manifestKeys.includes(k));
// The advanced tier comes from the manifest flag (Q4), except Layout, which shows every lever.
const tierWrong = [];
for (const d of homes.domains) for (const s of d.sections) for (const row of s.rows) for (const k of row.keys ?? []) {
  const lev = manifest.levers.find((l) => l.key === k);
  if (!lev) continue;
  const wantAdv = d.id === 'layout' ? false : !!lev.advanced;
  if (!!s.advanced !== wantAdv) tierWrong.push(`${k}: manifest advanced=${!!lev.advanced}, placed ${s.advanced ? 'advanced' : 'everyday'} in ${d.label} › ${s.title}`);
}
console.log('Coverage self-check (oracle: packages/engine/schema/lever-manifest.json)');
console.log(`  manifest levers: ${manifestKeys.length} (${manifest.levers.filter((l) => l.advanced).length} flagged advanced)`);
for (const [dl, c] of Object.entries(perDomain)) console.log(`  ${dl.padEnd(16)} ${String(c.levers).padStart(2)} levers  (${c.advanced} behind "Show advanced")`);
console.log(`  total placed: ${[...seen.keys()].filter((k) => manifestKeys.includes(k)).length}  missing: ${missing.length}  duplicated: ${dup.length}  unknown: ${unknown.length}  tier mismatches: ${tierWrong.length}`);
console.log(`  schema-only inputs also placed (not manifest levers): ${schemaOnly.join(', ')}`);
if (missing.length) fail(`manifest keys with no home: ${missing.join(', ')}`);
if (dup.length) fail(`manifest keys with more than one home: ${dup.map(([k, w]) => `${k} → ${w.join(' + ')}`).join('; ')}`);
if (unknown.length) fail(`homes naming keys the manifest does not have: ${unknown.join(', ')}`);
if (tierWrong.length) fail(`advanced tier disagrees with the manifest flag:\n  ${tierWrong.join('\n  ')}`);

// ---- 2. bundle the engine --------------------------------------------------------------
const out = join(mkdtempSync(join(tmpdir(), 'p3v4-')), 'p3.js');
try {
  execFileSync('npx', ['-y', 'esbuild@0.24.0', join(here, 'concept-v4.entry.ts'),
    '--bundle', '--format=iife', '--platform=browser', '--target=es2020', '--minify', '--legal-comments=none',
    `--alias:@prism3/engine=${relative(here, engine) || '.'}`, `--outfile=${out}`, '--log-level=warning'],
    { cwd: here, stdio: ['ignore', 'inherit', 'inherit'] });
} catch { fail('esbuild bundle failed'); }
let bundle = readFileSync(out, 'utf8');
if (/<\/script/i.test(bundle)) bundle = bundle.replace(/<\/script/gi, '<\\/script');

// ---- 3. versions (read from version.ts at build time) and inline -----------------------
const ver = readFileSync(join(engine, 'version.ts'), 'utf8');
const ENGINE_VERSION = ver.match(/export const ENGINE_VERSION = '([^']+)'/)?.[1];
const CONTRACT_VERSION = ver.match(/export const CONTRACT_VERSION = '([^']+)'/)?.[1];
if (!ENGINE_VERSION || !CONTRACT_VERSION) fail('could not read ENGINE_VERSION / CONTRACT_VERSION from version.ts');
const facts = { engineVersion: ENGINE_VERSION, contractVersion: CONTRACT_VERSION, builtAt: new Date().toISOString().slice(0, 10) };
if (!src.includes('<!--P3-ENGINE-->')) fail('no <!--P3-ENGINE--> placeholder in the source');
const html = src
  .replace('<!--P3-ENGINE-->', () => `<script>/* @prism3/engine ${ENGINE_VERSION}, bundled by build-v4.mjs */\n${bundle}</script>\n<script>window.P3_BUILD=${JSON.stringify(facts)}</script>`);

// Offline assertion: nothing in the page may make a request.
const offending = [
  [/<link\b/i, '<link> element'],
  [/<(?:script|img|iframe|source|video|audio)\b[^>]*\ssrc\s*=\s*["']?(?:https?:)?\/\//i, 'remote src'],
  [/url\(\s*["']?(?:https?:)?\/\//i, 'remote url()'],
  [/@import\b/i, '@import'],
  [/@font-face\b/i, '@font-face'],
  [/\bfetch\s*\(\s*["'`]https?:/i, 'fetch() to a host'],
].filter(([re]) => re.test(html)).map(([, what]) => what);
if (offending.length) fail(`output would make a network request: ${offending.join(', ')}`);

writeFileSync(join(here, 'concept-v4.html'), html);
console.log(`Wrote concept-v4.html (${(html.length / 1024).toFixed(0)} KB; engine ${ENGINE_VERSION}, contract ${CONTRACT_VERSION}; offline check passed)`);
