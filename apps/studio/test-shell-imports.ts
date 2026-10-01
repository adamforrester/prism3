/**
 * The repaint guard (UI redesign, `docs/superpowers/ui-redesign/implementation-plan.md` §3.10, landed in
 * S1.2 with the first shell code).
 *
 *   npx tsx apps/studio/test-shell-imports.ts
 *
 * New shell code repaints by store subscription: a writer calls a setter, and every surface that reads
 * the topic repaints itself (plan §5). It never calls the legacy repaint tiers, which S13 deletes. So
 * every file under `src/shell/`, `src/domains/`, `src/preview/`, (from S2) `src/ui/` and (from #1928)
 * `src/state/` must not name `apply`, `applyFull`, `build`, `renderBar`, `renderWorkspace` or `setVolatile`, and a file that does fails here,
 * naming the file, the line and the name. `renderWorkspace` joined the list in S1.3 (orchestrator review of
 * #1923): it is the full legacy page repaint, which `applyFull` and the `mode` subscriber in `main.ts` call,
 * so it is a tier in all but name.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is the new source, read from disk. The
 * oracle is the literal list of six names below, written here and never read from `main.ts`, so a tier
 * renamed in `main.ts` cannot shrink the list. The match is on IDENTIFIERS in the parsed source (the
 * TypeScript scanner), not on text, so a comment or a string that mentions `build()` is not a reference,
 * and an import, a call, a callback parameter or a property access spelled with one of the names is. That
 * is stricter than "calls": a shell module handed `build` as a callback would be calling the tier through
 * a door the plan closes, and it fails here the same way.
 *
 * NON-VACUOUS. A scan that found no files, or that cannot see a planted reference, would pass on nothing.
 * So the scan must read the shell's files by name (the frame, the page data, the theme, the DOM
 * helpers, from S1.3 the preview header and Inspect, and from S1.4 the Activity drawer and the Figma menu),
 * and the detector is run first on a fixture that holds each of the six names and must report
 * all six.
 *
 * TWO MORE ARMS, because a name match alone is evadable (orchestrator review of #1922). `(m as any)['build']()`,
 * `globalThis['build']()` and a computed or template key never spell the tier as an identifier, and a module
 * outside the scanned folders can re-export a tier under any name. So:
 *   - an element access whose key is a string or plain template literal naming a tier is a reference too;
 *   - an import (static, `export … from`, or dynamic `import()`) of `src/main.ts`, or of any module that
 *     imports it, fails, naming the import. `main.ts` is where the tiers live; a shell module
 *     with no path to it cannot reach them except through a global, and a global access spelled with a
 *     literal key is the first arm. The graph is built from the source on disk, never from a list, so a new
 *     module that starts importing `main.ts` taints itself and every importer the day it does.
 * Three refinements to that arm (#1928, the orchestrator's delta check of #1922). A `.js` or `.mjs`
 * specifier is resolved to its `.ts` source, because `moduleResolution: bundler` accepts `../main.js` for
 * `main.ts`. A relative import that resolves outside `src/` is followed like any other, because a bridge
 * module beside `src/` can re-export a tier under a neutral name. And a type-only import (`import type`,
 * `export type`, or a list whose every specifier is `type`) is no edge, because the compiler erases it,
 * so it cannot reach a tier. If `verbatimModuleSyntax` is ever switched on, `import { type X }` keeps a
 * bare `import '…'` at run time; that runs a module and hands nothing over, so skipping it stays sound.
 * What still gets past: a key computed at run time (`m[k]` with `k` built from strings) on an object that
 * did not come from a tainted import — a global the page itself put there. Nothing in `main.ts` exports
 * its tiers onto a global today. And a bare specifier is read as a package and not followed, so the
 * workspace's own name for this app (`@prism3/studio/src/main`, which resolves through `node_modules`)
 * is not followed either (#1944).
 *
 * WHAT A STATIC SCAN OF THE SHELL CANNOT SEE: A CALLBACK `main.ts` LENDS. `main.ts` hands the shell
 * functions to call (`mountFrame(app, { inspect: { contrast, tokens } })`, and whatever S1.4 and later lend).
 * Those are defined in `main.ts`, outside the scanned folders, and reach the shell as values with neutral
 * names, so a lent closure whose body calls `apply()` or `renderWorkspace()` repaints a legacy tier from a
 * shell call site that names nothing. This guard does not check that and does not pretend to: the lent
 * bodies are legacy code, reviewed where they are written in `main.ts`, and each lend is listed in the
 * frame's header. What it does hold is that the shell cannot pick a tier up for itself.
 *
 * Mutations this fails by name: add `import { build } from '../main';` to `src/shell/frame.ts` →
 * `src/shell/frame.ts:<line>: references the legacy repaint tier "build"`; add
 * `void import('../main');` → `src/shell/frame.ts:<line>: imports "../main", which reaches src/main.ts`.
 * S1.3 (orchestrator review of #1923): `(m as any)['apply']()` in `src/shell/preview.ts` →
 * `src/shell/preview.ts:<line>: references the legacy repaint tier "apply"`; `export { apply } from '../main';`
 * in `src/state/verdict.ts`, which `preview.ts` imports → `src/shell/preview.ts:<line>: imports
 * "../state/verdict", which reaches src/main.ts`, and, since #1928 scans `src/state/`, also
 * `src/state/verdict.ts:<line>: references the legacy repaint tier "apply"`; `renderWorkspace` named in a
 * shell file → `… references the legacy repaint tier "renderWorkspace"`. #1928's three refinements are
 * proven on in-memory fixtures below, each with its expected offender written out, so reverting a fix
 * fails that fixture by name.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/** The legacy repaint tiers, literally (plan §3.10). */
const LEGACY_TIERS = ['apply', 'applyFull', 'build', 'renderBar', 'renderWorkspace', 'setVolatile'] as const;
/** The directories new shell code lives in. `domains/` and `preview/` arrive with the domain slices; S2
 *  adds `ui/`, the shared controls a domain composes from (the lever kit, the step picker), which is new
 *  code with the same rule. `state/` (#1928, from the review of S3) is the store and the pure inputs a
 *  domain writes through; a write there that reached a tier would repaint for every surface at once. */
const NEW_DIRS = ['src/shell', 'src/domains', 'src/preview', 'src/ui', 'src/state'];
/** Files the scan must read, so an empty or misdirected scan cannot pass. */
const MUST_SCAN = ['src/shell/frame.ts', 'src/shell/pages.ts', 'src/shell/theme.ts', 'src/shell/dom.ts', 'src/shell/preview.ts',
  // S1.4: the Activity drawer and the Figma menu, which run writes `main.ts` lends and must not reach a tier.
  'src/shell/activity.ts', 'src/shell/figma.ts',
  // #1928: the store and the inputs beside it.
  'src/state/store.ts', 'src/state/verdict.ts', 'src/state/palette-input.ts', 'src/state/host-session.ts',
  // S2: Color › Palettes (its levers and its preview) and the shared controls.
  'src/domains/color-palettes.ts', 'src/preview/palettes.ts', 'src/ui/lever-kit.ts', 'src/ui/step-picker.ts',
  // S2's Q4 trial.
  'src/preview/follow-edit.ts',
  // S3: Brand (its levers and its preview, which calls the Style guide `main.ts` lends it).
  'src/domains/brand.ts', 'src/preview/brand.ts',
  // S3: Brand's state module (palette-input is listed with #1928's above).
  'src/state/brand-input.ts',
  // S4a: Color › Surfaces & fills (its levers, its preview, its writes) and the Style guide's shared sections.
  'src/domains/color-fills.ts', 'src/preview/surfaces.ts', 'src/state/fills-input.ts',
  'src/preview/sections/kit.ts', 'src/preview/sections/cards.ts', 'src/preview/sections/index.ts',
  'src/preview/sections/background.ts', 'src/preview/sections/foreground.ts', 'src/preview/sections/text-color.ts',
  'src/preview/sections/border.ts', 'src/preview/sections/icon.ts'];

/** Every identifier in `src` that names a legacy tier, with its 1-based line. */
const references = (src: string, file: string): { line: number; name: string }[] => {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const hits: { line: number; name: string }[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && (LEGACY_TIERS as readonly string[]).includes(n.text)) {
      hits.push({ line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, name: n.text });
    }
    if (ts.isElementAccessExpression(n)) {
      const k = n.argumentExpression;
      if ((ts.isStringLiteral(k) || ts.isNoSubstitutionTemplateLiteral(k)) && (LEGACY_TIERS as readonly string[]).includes(k.text)) {
        hits.push({ line: sf.getLineAndCharacterOfPosition(k.getStart(sf)).line + 1, name: k.text });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return hits;
};

/** True for an import or re-export the compiler erases (#1928): `import type`, `export type`, or a
 *  named list in which every specifier is marked `type`. A default import, a namespace import, a bare
 *  `import '…'` and an empty `{}` all keep a runtime edge, so they stay. */
const typeOnly = (n: ts.ImportDeclaration | ts.ExportDeclaration): boolean => {
  if (ts.isImportDeclaration(n)) {
    const c = n.importClause;
    if (!c) return false;
    if (c.isTypeOnly) return true;
    if (c.name) return false;
    const b = c.namedBindings;
    return !!b && ts.isNamedImports(b) && b.elements.length > 0 && b.elements.every((e) => e.isTypeOnly);
  }
  if (n.isTypeOnly) return true;
  const c = n.exportClause;
  return !!c && ts.isNamedExports(c) && c.elements.length > 0 && c.elements.every((e) => e.isTypeOnly);
};

/** Every module specifier `src` imports at run time — static, `export … from`, and dynamic `import()` —
 *  with its line. Type-only imports are left out (`typeOnly`). */
const imports = (src: string, file: string): { line: number; spec: string }[] => {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const out: { line: number; spec: string }[] = [];
  const at = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n: ts.Node): void => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier) && !typeOnly(n)) {
      out.push({ line: at(n), spec: n.moduleSpecifier.text });
    }
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0]) {
      const a0 = n.arguments[0];
      // A dynamic import with a computed specifier cannot be resolved here, so it is refused outright.
      out.push({ line: at(n), spec: ts.isStringLiteral(a0) || ts.isNoSubstitutionTemplateLiteral(a0) ? a0.text : '<computed>' });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
};

// ── the detector sees what it is for ─────────────────────────────────────────────────────────────
const FIXTURE = [
  "import { build, applyFull } from '../main';",
  '// a comment that says build() and renderBar() is not a reference',
  "const s = 'apply';",
  'export const go = (apply: () => void) => { apply(); build(); };',
  'const host = { renderBar: () => {} }; host.renderBar(); applyFull();',
  'declare const setVolatile: (h: unknown[], p: () => void) => void; setVolatile([], () => {});',
  "import { renderWorkspace } from '../main'; renderWorkspace();",
].join('\n');
const ACCESS_FIXTURE = [
  "declare const m: Record<string, () => void>;",
  "(m as any)['build']();",
  'globalThis[`renderBar`]();',
  "m['harmless']();",
].join('\n');
const access = references(ACCESS_FIXTURE, 'access.ts');
ok(access.some((r) => r.name === 'build' && r.line === 2), 'the detector reports a string-keyed element access to "build"');
ok(access.some((r) => r.name === 'renderBar' && r.line === 3), 'the detector reports a template-keyed element access to "renderBar"');
ok(!access.some((r) => r.line === 4), 'the detector does not report an element access with an unrelated key');
const IMPORT_FIXTURE = [
  "import { a } from '../main';",
  "export { b } from './x';",
  "void import('../main');",
  "const k = 'm'; void import(k);",
].join('\n');
const specs = imports(IMPORT_FIXTURE, 'imports.ts').map((i) => `${i.line}:${i.spec}`);
for (const want of ['1:../main', '2:./x', '3:../main', '4:<computed>']) ok(specs.includes(want), `the import reader sees ${want}`);
const seen = new Set(references(FIXTURE, 'fixture.ts').map((r) => r.name));
for (const name of LEGACY_TIERS) ok(seen.has(name), `the detector reports a reference to "${name}" in a fixture`);
const commentLine = references(FIXTURE, 'fixture.ts').filter((r) => r.line === 2 || r.line === 3);
ok(commentLine.length === 0, 'the detector does not report a name inside a comment or a string');

// ── the new source ───────────────────────────────────────────────────────────────────────────────
const ROOT = dirname(fileURLToPath(import.meta.url));
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : [];
});
const files = NEW_DIRS.map((d) => join(ROOT, d)).filter(existsSync).flatMap(walk);
const scanned = new Set(files.map((f) => relative(ROOT, f).split('\\').join('/')));
for (const want of MUST_SCAN) ok(scanned.has(want), `the scan read ${want}`);

const offenders: string[] = [];
for (const f of files) {
  const rel = relative(ROOT, f).split('\\').join('/');
  for (const r of references(readFileSync(f, 'utf8'), rel)) offenders.push(`${rel}:${r.line}: references the legacy repaint tier "${r.name}"`);
}
for (const o of offenders) ok(false, o);
ok(offenders.length === 0, `no file under ${NEW_DIRS.join(', ')} references a legacy repaint tier (${files.length} file(s) scanned)`);

// ── the import arm: no path from the new source to main.ts ───────────────────────────────────────
/** How the import arm reads a tree: the disk for the real one, a map for the fixtures below. */
type Tree = { isFile: (p: string) => boolean; read: (p: string) => string };
const DISK: Tree = { isFile: (p) => existsSync(p) && statSync(p).isFile(), read: (p) => readFileSync(p, 'utf8') };
/** A specifier ending in a JS extension names its TS source, as `tsc` and esbuild read it under
 *  `moduleResolution: bundler` (#1928): `../main.js` is `../main.ts`. Every JS extension is tried against
 *  every TS one, wider than `tsc` (which maps `.mjs` only to `.mts`), because a guard that resolves too
 *  much fails loudly and one that resolves too little passes. */
const JS_EXT = /\.(js|jsx|mjs|cjs)$/;
const TS_EXTS = ['.ts', '.tsx', '.mts', '.cts'];
const resolveSpec = (tree: Tree, from: string, spec: string): string | null => {
  if (spec === '<computed>') return '<computed>';
  if (!spec.startsWith('.')) return null;   // a package; not this app's source
  const base = join(dirname(from), spec);
  const stem = base.replace(JS_EXT, '');
  const cands = [...(stem === base ? [] : TS_EXTS.map((e) => stem + e)), base, ...TS_EXTS.map((e) => base + e), join(base, 'index.ts')];
  for (const c of cands) if (tree.isFile(c)) return c;
  return null;
};
/** The import arm over one tree. The graph starts from `roots` and follows every relative import to
 *  wherever it resolves, inside `src/` or not (#1928: a bridge module beside `src/` re-exporting a tier
 *  was invisible when the walk stopped at `src/`). Then `main` and every module with a path to it are
 *  tainted, and each import in `scan` that lands on a tainted module is an offender, named. */
const importArm = (tree: Tree, root: string, roots: string[], scan: string[]): { offenders: string[]; tainted: Set<string>; read: Set<string> } => {
  const main = join(root, 'src', 'main.ts');
  const edges = new Map<string, string[]>();
  const queue = [...roots, ...scan];
  while (queue.length) {
    const f = queue.pop()!;
    if (edges.has(f)) continue;
    // A stylesheet or JSON file resolves too; it has no imports to read.
    const out = /\.[cm]?[jt]sx?$/.test(f) ? imports(tree.read(f), f).map((i) => resolveSpec(tree, f, i.spec)).filter((t): t is string => !!t && t !== '<computed>') : [];
    edges.set(f, out);
    queue.push(...out);
  }
  // Tainted: main.ts, and every module with a path to it. Fixed point over the graph read from the tree.
  const tainted = new Set<string>([main]);
  for (let grew = true; grew;) {
    grew = false;
    for (const [f, out] of edges) if (!tainted.has(f) && out.some((t) => tainted.has(t))) { tainted.add(f); grew = true; }
  }
  const offenders: string[] = [];
  for (const f of scan) {
    const rel = relative(root, f).split('\\').join('/');
    for (const i of imports(tree.read(f), rel)) {
      const t = resolveSpec(tree, f, i.spec);
      if (t === '<computed>') offenders.push(`${rel}:${i.line}: a dynamic import() with a computed specifier, which this guard cannot follow`);
      else if (t && tainted.has(t)) offenders.push(`${rel}:${i.line}: imports "${i.spec}", which reaches src/main.ts`);
    }
  }
  return { offenders, tainted, read: new Set(edges.keys()) };
};

// The arm sees what it is for (#1928). Each fixture is a small tree held in memory, with a `main.ts` and
// one shell file; the expected offender is written out in full, so a resolver that stops reaching main.ts
// fails on that line by name.
const FX = join('/', 'fixture', 'apps', 'studio');
const fxArm = (shell: string, extra: Record<string, string> = {}): string[] => {
  const files = new Map<string, string>(Object.entries({ 'src/main.ts': 'export const build = () => {};', ...extra, 'src/shell/x.ts': shell })
    .map(([k, v]) => [join(FX, k), v]));
  const tree: Tree = { isFile: (p) => files.has(p), read: (p) => files.get(p) ?? '' };
  const roots = [...files.keys()].filter((p) => p.startsWith(join(FX, 'src')));
  return importArm(tree, FX, roots, [join(FX, 'src/shell/x.ts')]).offenders;
};
const fxFails = (label: string, shell: string, want: string, extra?: Record<string, string>): void => {
  const got = fxArm(shell, extra);
  ok(got.includes(want), `${label} → ${want}${got.includes(want) ? '' : ` (got: ${got.length ? got.join('; ') : 'nothing'})`}`);
};
const fxPasses = (label: string, shell: string, extra?: Record<string, string>): void => {
  const got = fxArm(shell, extra);
  ok(got.length === 0, `${label} passes${got.length ? ` (got: ${got.join('; ')})` : ''}`);
};
// Gap 1: a `.js` or `.mjs` specifier names main.ts.
fxFails('a ".js" specifier', "import * as M from '../main.js'; const k = 'bu' + 'ild'; (M as any)[k]();",
  'src/shell/x.ts:1: imports "../main.js", which reaches src/main.ts');
fxFails('a ".mjs" specifier', "import * as M from '../main.mjs';", 'src/shell/x.ts:1: imports "../main.mjs", which reaches src/main.ts');
fxFails('a ".js" specifier through a module', "import { y } from '../state/y.js';",
  'src/shell/x.ts:1: imports "../state/y.js", which reaches src/main.ts', { 'src/state/y.ts': "export * from '../main.js';" });
// Gap 2: a module outside src/ is followed.
fxFails('a bridge module outside src/', "import { b3 } from '../../bridge3';",
  'src/shell/x.ts:1: imports "../../bridge3", which reaches src/main.ts', { 'bridge3.ts': "export { build as b3 } from './src/main';" });
// Gap 3: a type-only import erases, so it is no path, directly or through a module.
fxPasses('"import type" of main.ts', "import type { X } from '../main';");
fxPasses('"import { type X }" of main.ts', "import { type X, type Y } from '../main';");
fxPasses('"export type" from main.ts', "export type { X } from '../main';");
fxPasses('"import type" through a module', "import { y } from '../state/y';",
  { 'src/state/y.ts': "import type { X } from '../main';\nexport type { Y } from '../main';\nexport const y = 1;" });
// …and a type-only import beside a value import of main.ts still fails on the value import.
fxFails('a type specifier beside a value specifier', "import { type X, y } from '../main';",
  'src/shell/x.ts:1: imports "../main", which reaches src/main.ts');
fxFails('"import type" beside a value import', "import type { X } from '../main';\nimport { y } from '../main';",
  'src/shell/x.ts:2: imports "../main", which reaches src/main.ts');
ok(!fxArm("import type { X } from '../main';\nimport { y } from '../main';").some((o) => o.startsWith('src/shell/x.ts:1:')),
  'the "import type" line beside a value import is not itself reported');

const SRC = join(ROOT, 'src');
const MAIN = join(SRC, 'main.ts');
const allSrc = walk(SRC);
ok(allSrc.includes(MAIN), 'the import graph read src/main.ts');
const arm = importArm(DISK, ROOT, allSrc, files);
const outside = [...arm.read].filter((f) => !f.startsWith(SRC + sep)).length;
for (const o of arm.offenders) ok(false, o);
ok(arm.offenders.length === 0, `no file under ${NEW_DIRS.join(', ')} imports src/main.ts or a module that does (${arm.tainted.size} module(s) reach it; ${arm.read.size} module(s) read, ${outside} outside src/)`);

// ── one Style guide, two pages (UI redesign S4a, owner decision Q5) ──────────────────────────────────
// The legacy Style guide in `main.ts` and Color › Surfaces & fills' preview must draw the five color sections
// from the SAME modules, so the two cannot drift. Subject: `main.ts` and `preview/surfaces.ts`, read from disk.
// Oracle: the literal list of the five sections' exported renderers and the module they live in. `main.ts`
// must import the five through `preview/sections/index` (as `COLOR_SECTIONS`) and must DEFINE none of the
// section titles itself; `preview/surfaces.ts` must import `COLOR_SECTIONS` too. A copy pasted back into
// `main.ts` fails by the title it draws.
{
  const SECTION_TITLES = ['Background', 'Foreground', 'Text color', 'Border', 'Icon'];
  const SECTION_FILES = ['background', 'foreground', 'text-color', 'border', 'icon'];
  const mainSrc = readFileSync(MAIN, 'utf8');
  const surfSrc = readFileSync(join(SRC, 'preview/surfaces.ts'), 'utf8');
  const importsSections = (src: string, file: string): boolean =>
    imports(src, file).some((i) => i.spec.endsWith('preview/sections/index') || i.spec === './sections/index');
  ok(importsSections(mainSrc, 'main.ts'), 'src/main.ts imports the shared color sections (preview/sections/index)');
  ok(importsSections(surfSrc, 'surfaces.ts'), 'src/preview/surfaces.ts imports the shared color sections (sections/index)');
  ok(/\bCOLOR_SECTIONS\b/.test(mainSrc.replace(/^\s*(\/\/|\*).*$/gm, '')) && /\bCOLOR_SECTIONS\b/.test(surfSrc.replace(/^\s*(\/\/|\*).*$/gm, '')),
    'both the Style guide and Surfaces & fills draw COLOR_SECTIONS');
  for (const t of SECTION_TITLES) {
    const own = new RegExp(`palSection\\(\\s*'${t}'`).test(mainSrc);
    ok(!own, `src/main.ts draws no "${t}" section of its own${own ? ` — main.ts defines its own "${t}" section (palSection('${t}', …)): the Style guide would drift from Surfaces & fills` : ''}`);
  }
  const idx = readFileSync(join(SRC, 'preview/sections/index.ts'), 'utf8');
  for (const f of SECTION_FILES) ok(idx.includes(`from './${f}'`), `preview/sections/index.ts draws the ${f} section from ./${f}`);
  // The title match above is TEXT, and an alias (`const mk = palSection; mk("Border", …)`) evades it. What
  // catches a section `main.ts` draws for itself is STRUCTURAL and lives in `test-smoke.mjs`: each section
  // module stamps its root `data-sg-section="<file>"`, and the smoke suite holds every one of the five on the
  // Style guide and on Surfaces & fills to its marker. Its premise is held here: the marker is written by the
  // five modules and by nothing else under src/, so a section drawn elsewhere cannot carry it by copying it.
  const SECTIONS_DIR = join(SRC, 'preview', 'sections') + sep;
  const MARKER = /\bsgSection\b|data-sg-section/;
  const writers = allSrc.filter((f) => MARKER.test(readFileSync(f, 'utf8'))).map((f) => f.slice(SRC.length + 1));
  const strays = writers.filter((f) => !join(SRC, f).startsWith(SECTIONS_DIR));
  ok(strays.length === 0, `only preview/sections/ writes the shared-section marker${strays.length ? ` — also written by ${strays.join(', ')}` : ''}`);
  for (const f of SECTION_FILES) {
    const own = new RegExp(`\\.dataset\\.sgSection\\s*=\\s*'${f}'`).test(readFileSync(join(SRC, 'preview/sections', `${f}.ts`), 'utf8'));
    ok(own, `preview/sections/${f}.ts stamps its own root data-sg-section="${f}"`);
  }
}

console.log(`\n${executed - failed}/${executed} repaint-guard assertions passed.`);
if (failed) process.exit(1);
