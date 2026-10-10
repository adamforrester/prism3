/**
 * STYLE DICTIONARY VERSION MATRIX (#2424) — which Style Dictionary versions read our DTCG with no
 * preset, and what each one does with each DTCG `$type` on each platform.
 *
 * A TOOL, not a gate (tools/CLAUDE.md): it answers the question and exits 0. It installs each version
 * into its own directory under the OS temp dir, never into this repo's `node_modules` or lockfile,
 * so it needs the network on first run and takes a few minutes. That is why CI runs the gate
 * (`packages/tokens/check-platforms.mjs`, the installed 5.x only) and not this.
 *
 *   node tools/sd-version-matrix/matrix.mjs            # print the matrix
 *   node tools/sd-version-matrix/matrix.mjs --write    # and rewrite packages/tokens/sd-version-matrix.md
 *
 * Every version gets the SAME config object — `platformsConfig` from `packages/tokens/sd.platforms.mjs`,
 * plain data with no Style Dictionary import. The only per-version code here is the call shape: 3.x is
 * CommonJS with a synchronous `extend(config).buildAllPlatforms()`; 4.x and 5.x construct
 * `new StyleDictionary(config)` and await the build. That is API, not token handling.
 *
 * ONE EXPERIMENT IS NOT STOCK, and it is labeled everywhere it prints. Style Dictionary 3.x cannot
 * read `$value`, so the matrix also runs 3.x over a copy of the sources with the DTCG keys renamed
 * (`$value` → `value`, `$type` → `type`, `$description` → `comment`, `$extensions` dropped). That is
 * the least a preset would have to do for a 3.x consumer, and measuring it is how the report can say
 * what that consumer would still be missing after it.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { OUT_ROOT, platformsConfig, sourcesFor } from '../../packages/tokens/sd.platforms.mjs';
import { outcomesFor, readDeclarations, readPlatform, PLATFORMS, TYPES, OUTCOMES, worst } from '../../packages/tokens/platform-outcomes.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const REPORT = resolve(here, '../../packages/tokens/sd-version-matrix.md');
const WORK = resolve(tmpdir(), 'prism3-sd-matrix');

/** The latest of each major the issue names, plus the first release of 4 and 5 so the minimum is
 *  bounded from below rather than inferred, and the version this repo's lockfile pins. */
const VERSIONS = ['3.9.2', '4.0.0', '4.4.0', '5.0.0', '5.5.0', '5.6.0'];

const install = (v) => {
  const dir = resolve(WORK, 'versions', v);
  if (existsSync(resolve(dir, 'node_modules/style-dictionary/package.json'))) return dir;
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'package.json'), '{"private":true}\n');
  execFileSync('npm', ['install', '--prefix', dir, '--no-audit', '--no-fund', '--silent', `style-dictionary@${v}`], { stdio: 'inherit' });
  return dir;
};

const quietly = async (fn) => {
  const saved = [console.log, console.warn, console.error];
  console.log = console.warn = console.error = () => {};
  try { return await fn(); } finally { [console.log, console.warn, console.error] = saved; }
};

/** Builds each platform on its own, so one platform throwing does not hide what the others did.
 *  Returns the platforms that threw, with the first line of the error. */
const build = async (v, dir, source, buildPath) => {
  const req = createRequire(resolve(dir, 'package.json'));
  const cfg = platformsConfig(source, buildPath);
  rmSync(buildPath, { recursive: true, force: true });
  const failed = {};
  await quietly(async () => {
    const SD = v.startsWith('3.') ? null : (await import(pathToFileURL(req.resolve('style-dictionary')).href)).default;
    const sd = SD ? new SD(cfg) : req('style-dictionary').extend(cfg);
    for (const p of Object.keys(cfg.platforms)) {
      try { await sd.buildPlatform(p); } catch (e) { failed[p] = String(e.message).split('\n')[0]; }
    }
  });
  return failed;
};

/** The not-stock 3.x experiment's input: the same tree with the DTCG keys renamed to 3.x's. */
const legacyCopy = (file) => {
  const rename = (n) => {
    if (Array.isArray(n)) return n.map(rename);
    if (!n || typeof n !== 'object') return n;
    const out = {};
    for (const [k, v] of Object.entries(n)) {
      if (k === '$extensions') continue;
      const key = { $value: 'value', $type: 'type', $description: 'comment' }[k] ?? k;
      out[key] = k === '$value' ? v : rename(v);
    }
    return out;
  };
  const dest = resolve(WORK, 'legacy', file.split('/').pop());
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, JSON.stringify(rename(JSON.parse(readFileSync(file, 'utf8')))));
  return dest;
};

const brands = readdirSync(OUT_ROOT)
  .filter((f) => f.endsWith('.tokens.json') && !/\.(base|[\w-]+\.overlay)\.tokens\.json$/.test(f))
  .map((f) => f.replace('.tokens.json', '')).sort();
const modesOf = (b) => readdirSync(OUT_ROOT)
  .map((f) => f.match(new RegExp(`^${b}\\.([\\w-]+)\\.overlay\\.tokens\\.json$`))?.[1]).filter(Boolean).sort();

const runs = [...VERSIONS.map((v) => ({ v, label: v, legacy: false })), { v: '3.9.2', label: '3.9.2 + keys renamed (not stock)', legacy: true }];
const results = [];

for (const run of runs) {
  const dir = install(run.v);
  // Per platform × type counts, summed over every brand's BASE projection — the conforming tree a
  // consumer reads. Overlays only re-value colors and shadows, so summing them too would count the
  // same tokens again; they are built (below) to prove the merge works, not re-tallied.
  const sum = Object.fromEntries(PLATFORMS.map((p) => [p, { found: 0, total: 0, byType: {} }]));
  const builds = { ok: 0, failed: [] };
  const dts = { ok: true };
  for (const brand of brands) {
    for (const set of ['canonical', 'base', ...modesOf(brand)]) {
      const src = sourcesFor(brand, set);
      const source = run.legacy ? src.map(legacyCopy) : src;
      const out = resolve(WORK, 'build', run.label.replace(/\W+/g, '-'), brand, set);
      const failed = await build(run.v, dir, source, out);
      for (const [p, msg] of Object.entries(failed)) builds.failed.push(`${p}: ${msg}`);
      builds.ok += PLATFORMS.length - Object.keys(failed).length;
      if (set !== 'base') continue;
      const r = await outcomesFor(src, out);
      for (const p of PLATFORMS) {
        sum[p].found += r[p].found; sum[p].total += r[p].total;
        for (const [t, row] of Object.entries(r[p].byType)) {
          const acc = (sum[p].byType[t] ??= { emitted: 0, transformed: 0, broken: 0, lost: 0, examples: [] });
          for (const o of OUTCOMES) acc[o] += row[o];
          for (const ex of row.examples) if (acc.examples.length < 2) acc.examples.push(`${brand}: ${ex}`);
        }
      }
      // The `.d.ts` promise: a declaration for every export of the module.
      let js = new Map();
      try { js = await readPlatform('js', out); } catch {}
      const decl = readDeclarations(out);
      if (js.size === 0 || [...js.keys()].some((k) => !decl.has(k))) dts.ok = false;
    }
  }
  results.push({ ...run, sum, builds, dts });
  console.log(`\n== Style Dictionary ${run.label}: ${builds.ok} builds, ${builds.failed.length} failed; base tokens found per platform: ${PLATFORMS.map((p) => `${p} ${sum[p].found}/${sum[p].total}`).join(', ')}`);
  for (const p of PLATFORMS) {
    console.log(`   ${p.padEnd(8)} ${TYPES.map((t) => `${t}=${worst(sum[p].byType[t])}`).join(' ')}`);
  }
}

// ---- THE REPORT --------------------------------------------------------------------------------

const cell = (row) => {
  if (!row) return '—';
  const w = worst(row);
  const counts = OUTCOMES.filter((o) => row[o]).map((o) => `${row[o]} ${o}`).join(', ');
  return `${w === 'broken' || w === 'lost' ? '**' + w + '**' : w} (${counts})`;
};
const bestFound = (r) => Math.max(...PLATFORMS.map((p) => r.sum[p].found));
const readsAtAll = (r) => {
  const n = bestFound(r);
  return n === 0 ? 'no — 0 of our tokens reach any file' : `yes — ${PLATFORMS.filter((p) => r.sum[p].found === r.sum[p].total).length} of ${PLATFORMS.length} platforms carry all ${r.sum.css.total} base tokens`;
};
const failures = (r) => [...new Set(r.builds.failed)].map((f) => `\`${f}\``).join('; ');

let md = `# Style Dictionary version matrix (#2424)

Generated by \`node tools/sd-version-matrix/matrix.mjs --write\` on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand; rerun it.

**What was run.** One config, \`platformsConfig\` in \`sd.platforms.mjs\`: built-in transform groups and
built-in formats only, \`usesDtcg: true\`, no preprocessor, transform or format of ours. It builds CSS,
SCSS, JavaScript (ES module and \`.d.ts\`), iOS (Swift) and Android (resource XML and Compose). Each
version is installed into its own temp directory, never this repo's lockfile. Every brand in
\`packages/engine/out/\` (${brands.length}) is built three ways: the canonical tree, the base projection, and
base + each mode overlay. The per-type tables count the base projection, summed over every brand.

**How a value is judged** (\`platform-outcomes.mjs\`, which reads the DTCG and the written files and
never asks Style Dictionary): **emitted** means the value reached the file as written in the DTCG;
**transformed** means it reached the file in that platform's own form, and the form is usable;
**broken** means the token reached the file but the value would not compile, would not parse, or
states the wrong number; **lost** means the token is not in the file. On Android a type with no
resource kind of its own (duration, font family, cubic bezier) is written as a \`<string>\`: that
counts as emitted, but it reaches the app untyped.

## Answer

`;

const stock = results.filter((r) => !r.legacy);
const total = stock[0].sum.css.total;
const readers = stock.filter((r) => PLATFORMS.every((p) => r.sum[p].found === r.sum[p].total));
const nonReaders = stock.filter((r) => bestFound(r) === 0);
const latest = stock[stock.length - 1];
const grid = (r) => PLATFORMS.map((p) => TYPES.map((t) => worst(r.sum[p].byType[t])).join()).join('|');
const differing = readers.filter((r) => grid(r) !== grid(latest)).map((r) => r.label);
const badCells = (r, p) => TYPES.filter((t) => ['broken', 'lost'].includes(worst(r.sum[p].byType[t])));
const legacy = results.find((r) => r.legacy);
/** Cells whose counts differ from the latest version's while the verdict is the same, per version. */
const countMoves = readers.filter((r) => r !== latest).map((r) => [r.label, PLATFORMS.flatMap((p) => TYPES
  .filter((t) => worst(r.sum[p].byType[t]) === worst(latest.sum[p].byType[t]) && cell(r.sum[p].byType[t]) !== cell(latest.sum[p].byType[t]))
  .map((t) => `${p} / ${t}`))]).filter(([, cells]) => cells.length);
md += `- **Minimum version that needs no preset: ${readers[0]?.label ?? 'none'}.** Every version measured from ${readers[0]?.label} to ${latest.label} carries all ${total} base tokens to all ${PLATFORMS.length} platforms with this config. ${nonReaders.map((r) => r.label).join(', ') || 'No version'} reads none of them (0 of ${total}): 3.x has no \`usesDtcg\` and reads only \`value\`, so the few variables it does write come from \`value\` keys inside \`$extensions\`.
- **${differing.length ? `The verdicts differ on ${differing.join(', ')}` : `The verdict in every cell is the same on every version from ${readers[0]?.label} to ${latest.label}`}.** ${countMoves.length ? `Counts move inside a cell, not the verdict: against ${latest.label}, ${countMoves.map(([v, cells]) => `${v} differs in ${cells.join(', ')}`).join('; ')}.` : `Where the verdict matches, the counts match too.`}
${PLATFORMS.map((p) => `- **${p}** on ${latest.label}: ${badCells(latest, p).length ? `broken or lost: ${badCells(latest, p).join(', ')}` : 'every type usable'}.`).join('\n')}
- **The not-stock 3.x experiment** (keys renamed, \`$extensions\` dropped): ${PLATFORMS.map((p) => `${p} ${legacy.sum[p].found}/${total}`).join(', ')}. ${failures(legacy) ? `It threw on ${[...new Set(legacy.builds.failed.map((f) => f.split(':')[0]))].join(' and ')} (${failures(legacy)}).` : ''} Broken or lost after the rename: ${PLATFORMS.map((p) => `${p} ${badCells(legacy, p).length}`).join(', ')} of ${TYPES.length} types.

## Reads our DTCG at all

| version | platform builds (of ${results[0].builds.ok + results[0].builds.failed.length}) | reads our DTCG | \`.d.ts\` declares every export | build errors |
|---|---|---|---|---|
${results.map((r) => `| ${r.label} | ${r.builds.ok} ok${r.builds.failed.length ? `, ${r.builds.failed.length} threw` : ''} | ${readsAtAll(r)} | ${r.dts.ok ? 'yes' : 'no'} | ${failures(r) || 'none'} |`).join('\n')}

`;

for (const r of results) {
  md += `## Style Dictionary ${r.label}\n\n| type | ${PLATFORMS.join(' | ')} |\n|---|${PLATFORMS.map(() => '---').join('|')}|\n`;
  for (const t of TYPES) md += `| ${t} | ${PLATFORMS.map((p) => cell(r.sum[p].byType[t])).join(' | ')} |\n`;
  const examples = PLATFORMS.flatMap((p) => TYPES.filter((t) => ['broken', 'lost'].includes(worst(r.sum[p].byType[t]))).map((t) => `- ${p} / ${t}: ${r.sum[p].byType[t].examples[0]}`));
  if (examples.length && bestFound(r) > 0) md += `\nOne example per broken or lost cell:\n\n${examples.join('\n')}\n`;
  md += '\n';
}

if (process.argv.includes('--write')) {
  writeFileSync(REPORT, md);
  console.log(`\nwrote ${REPORT}`);
}
