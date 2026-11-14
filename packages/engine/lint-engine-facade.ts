/**
 * Prism3 engine — THE SURFACES IMPORT THE ENGINE ONLY THROUGH ITS PUBLIC ENTRIES (#3698 F4, R5 item 3).
 *
 *   npx tsx packages/engine/lint-engine-facade.ts
 *
 * The studio and the plugin imported 42 deep paths (`@prism3/engine/theme`, `…/anatomy-figma`, a relative
 * `../../packages/engine/file-facts`), so any file move or split inside the engine broke both bundles. They now import
 * four entries, declared in `packages/engine/package.json` `exports` and mapped in `index.ts`:
 *
 *   `@prism3/engine`  `@prism3/engine/components`  `@prism3/engine/figma`  `@prism3/engine/harness`
 *
 * WHAT IT ASSERTS, each failure prefixed by the name a mutation must produce:
 *   DEEP IMPORT   a tracked source file under `apps/studio/` or `apps/plugin/` imports the engine by any other path:
 *                 a bare specifier under `@prism3/engine/` that is not an entry, a relative specifier that lands
 *                 inside `packages/engine/`, or an esbuild `entryPoints` naming a file there. Static imports,
 *                 re-exports, `import()`, and specifiers quoted inside an esbuild `stdin` string or a fixture
 *                 template all count: each is a path a test or a build resolves. Reported by file and line.
 *   BUNDLED       a file under a bundled source root (`apps/studio/src`, `apps/studio/chrome`, `apps/plugin/src`)
 *                 imports `@prism3/engine/harness`, whose modules read the disk or run git.
 *   DECLARED      an entry is missing from `exports`, points at a file that does not exist, or that file holds
 *                 anything but named re-exports (`export { … } from './…'`, `export type { … } from './…'`): no
 *                 `export *`, so the entry's list is the seam, and no code, so a bundle is the same modules.
 *   INWARD        an engine module imports one of the entries. The entries are leaves the surfaces reach; an engine
 *                 module imports its sibling directly, so an entry can never sit on a cycle.
 *   REPRESENTED   the scan reached too few files, or a surface (or a bundled root) imports no entry at all, so a
 *                 scope that silently lost a directory or an extension fails rather than passing clean.
 *   SELF-CHECK    the detector, run on planted source typed below, does not find exactly the deep imports planted
 *                 there (and none of the decoys). A pattern that stopped matching would otherwise read as clean.
 *
 * INDEPENDENCE (docs/34). The SUBJECT is the surfaces' source text. The REFERENCE is the four entry names and the
 * bundled roots, typed here and never read from `exports` (which also lists the deep subpaths the engine's own tools
 * use); `exports` is only checked to DECLARE each typed entry.
 *
 * WHAT IT DOES NOT ASSERT. That an entry re-exports only names a surface uses: an unused name is dead weight, not a
 * seam leak. Reading an engine file as TEXT (an oracle that parses `theme.ts`, a path into `out/`) is not an import
 * and is allowed. `tools/` and the engine's own scripts are not surfaces and may import deep paths.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const SELF = 'packages/engine/lint-engine-facade.ts';
const failures: string[] = [];
const fail = (tag: string, msg: string) => failures.push(`${tag}: ${msg}`);

// The reference, typed. Each entry's file is checked against `exports`, never derived from it.
const ENTRIES: Record<string, string> = {
  '@prism3/engine': 'index.ts',
  '@prism3/engine/components': 'index-components.ts',
  '@prism3/engine/figma': 'index-figma.ts',
  '@prism3/engine/harness': 'index-harness.ts',
};
const NODE_ONLY = '@prism3/engine/harness';
const SURFACES = ['apps/studio', 'apps/plugin'];
const BUNDLED_ROOTS = ['apps/studio/src/', 'apps/studio/chrome/', 'apps/plugin/src/'];
/** The roots that must each import an entry: the two surfaces and the two bundled roots that use the engine today
 *  (`apps/studio/chrome` is bundled but imports none). */
const MUST_USE = ['apps/studio', 'apps/plugin', 'apps/studio/src/', 'apps/plugin/src/'];
const FILE_FLOOR = 300;
const SOURCE = /\.(ts|tsx|mts|cts|mjs|cjs|js)$/;

/** Comments that open a line, dropped with their line breaks kept, so line numbers still match the file. A `//`
 *  inside a string (a URL) is left alone, the same rule `lint-ecosystem.ts` reads imports by. */
const stripComments = (src: string): string =>
  src.replace(/^\s*\/\*[\s\S]*?\*\//gm, (m) => m.replace(/[^\n]/g, '')).replace(/^\s*\/\/.*$/gm, '');

type Hit = { line: number; spec: string; why: string };
/** Every engine import in one file's source that is not an entry. `file` is repo-relative, for relative specifiers. */
export const deepImports = (file: string, src: string): Hit[] => {
  const code = stripComments(src);
  const lineOf = (at: number) => code.slice(0, at).split('\n').length;
  const hits: Hit[] = [];
  const specs = [
    /\bfrom\s*['"]([^'"\n]+)['"]/g,             // import … from, export … from (also inside a stdin string)
    /\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,  // import('…')
    /\bimport\s+['"]([^'"\n]+)['"]/g,            // import '…'
  ];
  for (const re of specs) for (const m of code.matchAll(re)) {
    const spec = m[1];
    if (spec === '@prism3/engine' || spec.startsWith('@prism3/engine/')) {
      if (!(spec in ENTRIES)) hits.push({ line: lineOf(m.index!), spec, why: 'a deep path, not one of the entries' });
    } else if (spec.startsWith('.')) {
      const landed = posix.normalize(posix.join(posix.dirname(file), spec));
      if (landed.startsWith('packages/engine/')) hits.push({ line: lineOf(m.index!), spec, why: `a relative path into the engine (${landed})` });
    }
  }
  for (const m of code.matchAll(/\bentryPoints\s*:\s*\[([^\]]*)\]/g)) {
    if (/packages\/engine\//.test(m[1])) hits.push({ line: lineOf(m.index!), spec: m[1].trim(), why: 'an esbuild entry point inside the engine' });
  }
  return hits.sort((a, b) => a.line - b.line);
};
/** The entries one file's source imports, by name. */
const entriesUsed = (src: string): Set<string> => {
  const code = stripComments(src);
  const out = new Set<string>();
  for (const m of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)['"](@prism3\/engine(?:\/[^'"\n]+)?)['"]/g)) if (m[1] in ENTRIES) out.add(m[1]);
  return out;
};

// ── SELF-CHECK: the detector finds exactly what is planted ──────────────────────────────────────────────────────────
{
  const planted = [
    "import { brandTheme } from '@prism3/engine';",                                  // an entry: clean
    "import { brandTheme as t } from '@prism3/engine/theme';",                        // 2: deep
    "import type { ComponentDef } from '@prism3/engine/component-schema';",           // 3: deep, type-only still counts
    "const m = await import('@prism3/engine/component-renames');",                    // 4: deep, dynamic
    "import { scanFileFacts } from '../../../packages/engine/file-facts';",           // 5: relative into the engine
    "// import { decoy } from '@prism3/engine/theme';",                               // a comment: clean
    "const s = { contents: \"export { x } from '@prism3/engine/modes';\" };",          // 7: deep, inside a stdin string
    "await build({ entryPoints: [join(REPO, 'packages/engine/color.ts')] });",       // 8: an engine entry point
    "const text = readFileSync(join(REPO, 'packages/engine/theme.ts'), 'utf8');",    // reading as text: clean
    "import { componentDefs } from '@prism3/engine/components';",                     // an entry: clean
    "import { local } from './src/theme';",                                           // a surface's own file: clean
  ].join('\n');
  const got = deepImports('apps/plugin/src/planted.ts', planted).map((h) => h.line).join(',');
  if (got !== '2,3,4,5,7,8') fail('SELF-CHECK', `the detector found deep imports on planted lines [${got}], not [2,3,4,5,7,8] — it would misreport the surfaces`);
}

// ── DECLARED: each typed entry is in `exports` and is named re-exports only ─────────────────────────────────────────
const exportsMap = (JSON.parse(readFileSync(resolve(here, 'package.json'), 'utf8')) as { exports: Record<string, string> }).exports;
for (const [entry, file] of Object.entries(ENTRIES)) {
  const key = entry === '@prism3/engine' ? '.' : `./${entry.slice('@prism3/engine/'.length)}`;
  if (exportsMap[key] !== `./${file}`) { fail('DECLARED', `packages/engine/package.json exports['${key}'] is ${JSON.stringify(exportsMap[key])}, not "./${file}" — ${entry} is not declared`); continue; }
  if (!existsSync(resolve(here, file))) { fail('DECLARED', `${entry} points at packages/engine/${file}, which does not exist`); continue; }
  const body = stripComments(readFileSync(resolve(here, file), 'utf8'));
  const stray = body.replace(/\bexport\s+(?:type\s+)?\{[^}]*\}\s*from\s*'\.\/[^'\n]+'\s*;/g, '').trim();
  if (stray) fail('DECLARED', `packages/engine/${file} holds more than named re-exports from engine modules: "${stray.split('\n')[0].slice(0, 100)}"`);
}

// ── INWARD: no engine module imports an entry ───────────────────────────────────────────────────────────────────────
const tracked = (dir: string) => execFileSync('git', ['ls-files', '--', dir], { cwd: repo, encoding: 'utf8' }).split('\n').filter((f) => SOURCE.test(f));
const entryFiles = new Set(Object.values(ENTRIES).map((f) => `packages/engine/${f}`));
for (const f of tracked('packages/engine')) {
  if (entryFiles.has(f) || f === SELF) continue;   // this file plants entry specifiers for the self-check
  const code = stripComments(readFileSync(resolve(repo, f), 'utf8'));
  for (const m of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"\n]+)['"]/g)) {
    const spec = m[1];
    const landed = spec.startsWith('.') ? posix.normalize(posix.join(posix.dirname(f), spec)).replace(/\.ts$/, '') + '.ts' : null;
    if (spec in ENTRIES || (landed && entryFiles.has(landed))) fail('INWARD', `${f}:${code.slice(0, m.index).split('\n').length} imports the entry '${spec}' — an engine module imports its sibling directly`);
  }
}

// ── DEEP IMPORT and BUNDLED, over every tracked surface source file ─────────────────────────────────────────────────
let scanned = 0;
const using: Record<string, number> = Object.fromEntries(MUST_USE.map((s) => [s, 0]));
for (const surface of SURFACES) {
  for (const f of tracked(surface)) {
    scanned++;
    const src = readFileSync(resolve(repo, f), 'utf8');
    for (const h of deepImports(f, src)) fail('DEEP IMPORT', `${f}:${h.line} imports '${h.spec}', ${h.why} — import it from one of ${Object.keys(ENTRIES).join(', ')} (add the name to the entry's file if it is not there)`);
    const used = entriesUsed(src);
    if (used.size) for (const k of Object.keys(using)) if (f.startsWith(k)) using[k]++;
    const root = BUNDLED_ROOTS.find((r) => f.startsWith(r));
    if (root && used.has(NODE_ONLY)) fail('BUNDLED', `${f} imports ${NODE_ONLY}, which is node-only; a file under ${root} is bundled`);
  }
}

// ── REPRESENTED ─────────────────────────────────────────────────────────────────────────────────────────────────────
if (scanned < FILE_FLOOR) fail('REPRESENTED', `scanned ${scanned} tracked source files under ${SURFACES.join(' and ')}, under the floor of ${FILE_FLOOR} — the scope has gone blind`);
for (const [k, n] of Object.entries(using)) if (n === 0) fail('REPRESENTED', `no file under ${k} imports an engine entry — the scan is not reaching it, or the entries moved`);

console.log(`lint-engine-facade — ${scanned} tracked source files under ${SURFACES.join(' and ')}; ${Object.entries(using).map(([k, n]) => `${k} ${n}`).join(', ')} importing an entry`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`\n${failures.length} failure(s).`);
  process.exit(1);
}
console.log(`  ✓ every engine import is one of ${Object.keys(ENTRIES).length} entries; no bundled file imports ${NODE_ONLY}; each entry is named re-exports only; no engine module imports an entry`);
