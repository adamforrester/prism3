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
 * Two more (#1944). A bare specifier is resolved as the compiler resolves it, with the studio tsconfig's
 * options, and followed wherever it lands outside `node_modules` once links are followed: the workspace
 * links `@prism3/studio` to this app, so `@prism3/studio/src/main` is `main.ts`, and every result is made
 * real, so a relative path through `node_modules` lands the same way. And a computed `import(p)` in a module
 * the graph reads but does not scan cannot be followed, so that module and every importer are refused
 * under their own message rather than dropped from the graph.
 * What still gets past: a key computed at run time (`m[k]` with `k` built from strings) on an object that
 * did not come from a tainted import — a global the page itself put there. Nothing in `main.ts` exports
 * its tiers onto a global today.
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
 * fails that fixture by name; #1944's two are proven the same way.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
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
  'src/preview/sections/border.ts', 'src/preview/sections/icon.ts',
  // S5.1: the Style guide's Disabled and Interactive sections, shared, and Color › Interactive's writes.
  'src/preview/sections/disabled.ts', 'src/preview/sections/interactive.ts', 'src/state/interactive-input.ts',
  // S5.2: Color › Interactive (its levers, its preview) and the Links section it draws.
  'src/domains/color-interactive.ts', 'src/preview/interactive.ts', 'src/preview/sections/links.ts',
  // S4c: the Focus ring section, drawn by Surfaces & fills' preview (Q30).
  'src/preview/sections/focus-ring.ts',
  // S6.1: Type's writes, the font-availability helpers, and the Typography preview's shared sections.
  'src/state/type-input.ts', 'src/ui/fonts.ts',
  'src/preview/sections/weights-by-face.ts',
  // S6.2: Type (its levers and its preview), the shared type sample, and the preview's Faces section. (S6.2 retired
  // the legacy Preview tab's Typefaces section, folded into Faces.)
  'src/domains/type.ts', 'src/preview/type.ts', 'src/preview/sections/type-sample.ts', 'src/preview/sections/faces.ts',
  // S6.3: the value picker, and the Type preview's Scale, Line height and letter spacing, and Building blocks sections.
  // (S6.3 retired S6.1's type-ramp.ts and type-fluid.ts, folded into Scale.)
  'src/ui/value-picker.ts', 'src/preview/sections/type-scale.ts', 'src/preview/sections/line-spacing.ts', 'src/preview/sections/building-blocks.ts',
  // S10: Layout (its levers, its preview, its writes) and the preview's Breakpoints, Grid and Containers sections.
  'src/domains/layout.ts', 'src/preview/layout.ts', 'src/state/layout-input.ts', 'src/preview/sections/layout-kit.ts',
  'src/preview/sections/breakpoints.ts', 'src/preview/sections/grid.ts', 'src/preview/sections/containers.ts',
  // S4f: Surfaces & fills' Scrim and Fields sections, and the badge marks' theme.
  'src/preview/sections/scrim.ts', 'src/preview/sections/fields.ts', 'src/preview/badge-marks.ts',
  // S9.1: the Elevation and Motion writes, and the two legacy pages' read-only pieces, shared.
  'src/state/depth-motion-input.ts', 'src/preview/sections/shadow-ramp.ts', 'src/preview/sections/shadow-tint.ts',
  'src/preview/sections/duration-ramp.ts', 'src/preview/sections/motion-curves.ts', 'src/preview/sections/springs.ts',
  'src/preview/sections/motion-transitions.ts',
  // S7: Shape (its levers, its preview, its writes), the generated "used by" index, and the Shape preview's sections and
  // the Style guide's radius sample.
  'src/domains/shape.ts', 'src/preview/shape.ts', 'src/state/shape-input.ts', 'src/preview/used-by.ts',
  'src/preview/sections/radius.ts', 'src/preview/sections/control-heights.ts', 'src/preview/sections/spacing.ts',
  'src/preview/sections/shape-building-blocks.ts', 'src/preview/sections/radius-sample.ts',
  // S9.2: Depth & motion (its levers and its preview).
  'src/domains/depth.ts', 'src/preview/depth.ts',
  // S8.1: the Button option writes, the button specimen, and the component catalog with the web's generated copy.
  'src/state/button-input.ts', 'src/preview/sections/button-layout.ts', 'src/state/component-catalog.ts',
  'src/state/component-catalog-data.ts',
  // S8.2: Components (its levers and its preview) and the preview's Component sets section.
  'src/domains/components.ts', 'src/preview/components.ts', 'src/preview/sections/component-sets.ts'];

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
// Real, so a path the resolver reaches through a link (macOS's `/tmp`, the workspace's `node_modules`) is
// compared with the same spelling as the files the walk reads (#1944).
const ROOT = realpathSync(dirname(fileURLToPath(import.meta.url)));
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
/** How the import arm reads a tree: the disk for the real one, a map for the fixtures below. `real` is
 *  where a path lands once links are followed, and `isDir` serves the compiler's resolver (#1944). */
type Tree = { isFile: (p: string) => boolean; isDir: (p: string) => boolean; read: (p: string) => string; real: (p: string) => string };
const DISK: Tree = {
  isFile: (p) => existsSync(p) && statSync(p).isFile(),
  isDir: (p) => existsSync(p) && statSync(p).isDirectory(),
  read: (p) => readFileSync(p, 'utf8'),
  real: (p) => realpathSync(p),
};
/** The studio's own module options, read from its tsconfig: they are how esbuild and `tsc` resolve a
 *  bare specifier here, which is the thing a bare-specifier hole exploits (#1944). */
const STUDIO_OPTIONS = ((): ts.CompilerOptions => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const cfg = ts.readConfigFile(join(dir, 'tsconfig.json'), ts.sys.readFile).config;
  return ts.parseJsonConfigFileContent(cfg, ts.sys, dir).options;
})();
/** A specifier ending in a JS extension names its TS source, as `tsc` and esbuild read it under
 *  `moduleResolution: bundler` (#1928): `../main.js` is `../main.ts`. Every JS extension is tried against
 *  every TS one, wider than `tsc` (which maps `.mjs` only to `.mts`), because a guard that resolves too
 *  much fails loudly and one that resolves too little passes. */
const JS_EXT = /\.(js|jsx|mjs|cjs)$/;
const TS_EXTS = ['.ts', '.tsx', '.mts', '.cts'];
/** Where a specifier lands, links followed; `null` for a third-party package or nothing found.
 *  A bare specifier is resolved the way the compiler does (#1944). A package is not this repo's source and
 *  is not followed, but a workspace link is: `@prism3/studio` is linked to this app, so
 *  `@prism3/studio/src/main` is `src/main.ts`, and `@prism3/engine/theme` is the engine's own source.
 *  The test is where the path lands once links are followed: under `node_modules`, a package; anywhere
 *  else, source, followed like a relative import. A relative path through `node_modules` lands by the
 *  same rule, which is why every result is made real. */
const resolveSpec = (tree: Tree, from: string, spec: string): string | null => {
  if (spec === '<computed>') return '<computed>';
  if (!spec.startsWith('.')) {
    const hit = ts.resolveModuleName(spec, from, STUDIO_OPTIONS, {
      fileExists: tree.isFile, readFile: (p) => (tree.isFile(p) ? tree.read(p) : undefined), directoryExists: tree.isDir, realpath: tree.real,
    }).resolvedModule?.resolvedFileName;
    if (!hit) return null;
    const at = tree.real(hit);
    return at.split(sep).includes('node_modules') ? null : at;
  }
  const base = join(dirname(from), spec);
  const stem = base.replace(JS_EXT, '');
  const cands = [...(stem === base ? [] : TS_EXTS.map((e) => stem + e)), base, ...TS_EXTS.map((e) => base + e), join(base, 'index.ts')];
  for (const c of cands) if (tree.isFile(c)) return tree.real(c);
  return null;
};
/** The import arm over one tree. The graph starts from `roots` and follows every import that lands on
 *  source to wherever it resolves, inside `src/` or not (#1928: a bridge module beside `src/` re-exporting
 *  a tier was invisible when the walk stopped at `src/`). Then `main` and every module with a path to it are
 *  tainted, and each import in `scan` that lands on a tainted module is an offender, named.
 *  A module the graph reads but does not scan can hold a computed `import(p)`, which can load `main.ts`
 *  for whoever calls it (#1944). Its edge cannot be followed, so the module itself is the end of the
 *  path: it and every module with a path to it are tainted the same way, under their own message. */
const importArm = (tree: Tree, root: string, roots: string[], scan: string[]): { offenders: string[]; tainted: Set<string>; opaque: Set<string>; read: Set<string> } => {
  const main = tree.real(join(root, 'src', 'main.ts'));
  const edges = new Map<string, string[]>();
  const computed = new Set<string>();
  const queue = [...roots, ...scan];
  while (queue.length) {
    const f = queue.pop()!;
    if (edges.has(f)) continue;
    // A stylesheet or JSON file resolves too; it has no imports to read.
    const targets = /\.[cm]?[jt]sx?$/.test(f) ? imports(tree.read(f), f).map((i) => resolveSpec(tree, f, i.spec)) : [];
    if (targets.includes('<computed>')) computed.add(f);
    const out = targets.filter((t): t is string => !!t && t !== '<computed>');
    edges.set(f, out);
    queue.push(...out);
  }
  // Fixed point over the graph read from the tree: the seeds, and every module with a path to one.
  const reach = (seeds: Iterable<string>): Set<string> => {
    const r = new Set<string>(seeds);
    for (let grew = true; grew;) {
      grew = false;
      for (const [f, out] of edges) if (!r.has(f) && out.some((t) => r.has(t))) { r.add(f); grew = true; }
    }
    return r;
  };
  const tainted = reach([main]);
  const opaque = reach(computed);
  const offenders: string[] = [];
  for (const f of scan) {
    const rel = relative(root, f).split('\\').join('/');
    for (const i of imports(tree.read(f), rel)) {
      const t = resolveSpec(tree, f, i.spec);
      if (t === '<computed>') offenders.push(`${rel}:${i.line}: a dynamic import() with a computed specifier, which this guard cannot follow`);
      else if (t && tainted.has(t)) offenders.push(`${rel}:${i.line}: imports "${i.spec}", which reaches src/main.ts`);
      else if (t && opaque.has(t)) offenders.push(`${rel}:${i.line}: imports "${i.spec}", which reaches a dynamic import() with a computed specifier`);
    }
  }
  return { offenders, tainted, opaque, read: new Set(edges.keys()) };
};

// The arm sees what it is for (#1928). Each fixture is a small tree held in memory, with a `main.ts` and
// one shell file; the expected offender is written out in full, so a resolver that stops reaching main.ts
// fails on that line by name.
const FX = join('/', 'fixture', 'apps', 'studio');
/** The workspace's link, as `npm ci` lays it: `node_modules/@prism3/studio` is this app (#1944). */
const FX_LINK = join(FX, 'node_modules', '@prism3', 'studio');
const fxReal = (p: string): string => (p === FX_LINK || p.startsWith(FX_LINK + sep) ? FX + p.slice(FX_LINK.length) : p);
const fxArm = (shell: string, extra: Record<string, string> = {}): string[] => {
  const files = new Map<string, string>(Object.entries({ 'src/main.ts': 'export const build = () => {};', 'package.json': '{ "name": "@prism3/studio" }', ...extra, 'src/shell/x.ts': shell })
    .map(([k, v]) => [join(FX, k), v]));
  const tree: Tree = {
    isFile: (p) => files.has(fxReal(p)),
    isDir: (p) => [...files.keys()].some((f) => f.startsWith(fxReal(p) + sep)) || p === FX_LINK || FX_LINK.startsWith(p + sep),
    read: (p) => files.get(fxReal(p)) ?? '',
    real: fxReal,
  };
  const roots = [...files.keys()].filter((p) => p.startsWith(join(FX, 'src') + sep));
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
// #1944, hole 1: the workspace's own name for this app is a link to it, so it is followed, directly, through
// a module, and spelled as a relative path through `node_modules`. A third-party package is still not.
fxFails('the workspace link "@prism3/studio/src/main"', "import * as M from '@prism3/studio/src/main'; const k = 'bu' + 'ild'; (M as any)[k]();",
  'src/shell/x.ts:1: imports "@prism3/studio/src/main", which reaches src/main.ts');
fxFails('the workspace link through a module', "import { y } from '../state/y';",
  'src/shell/x.ts:1: imports "../state/y", which reaches src/main.ts', { 'src/state/y.ts': "export * from '@prism3/studio/src/main';" });
fxFails('a relative path through node_modules', "import * as M from '../../node_modules/@prism3/studio/src/main';",
  'src/shell/x.ts:1: imports "../../node_modules/@prism3/studio/src/main", which reaches src/main.ts');
fxPasses('a third-party package', "import { z } from 'some-pkg';",
  { 'node_modules/some-pkg/package.json': '{ "name": "some-pkg", "main": "index.js" }', 'node_modules/some-pkg/index.js': "export * from '../../src/main';" });
// #1944, hole 2: a computed import() in a module the graph follows but does not scan taints that module.
fxFails('a computed import() in a followed module', "import { load } from '../levers/load';",
  'src/shell/x.ts:1: imports "../levers/load", which reaches a dynamic import() with a computed specifier',
  { 'src/levers/load.ts': 'export const load = (p: string) => import(p);' });
fxFails('a computed import() two modules away', "import { y } from '../state/y';",
  'src/shell/x.ts:1: imports "../state/y", which reaches a dynamic import() with a computed specifier',
  { 'src/state/y.ts': "export { load as y } from '../../bridge4';", 'bridge4.ts': 'export const load = (p: string) => import(p);' });
fxPasses('a literal import() in a followed module', "import { load } from '../levers/load';",
  { 'src/levers/load.ts': "export const load = () => import('./other');", 'src/levers/other.ts': 'export const o = 1;' });

const SRC = join(ROOT, 'src');
const MAIN = join(SRC, 'main.ts');
const allSrc = walk(SRC);
ok(allSrc.includes(MAIN), 'the import graph read src/main.ts');
// The resolver, on the real tree: the workspace's own name for this app lands on this checkout's
// `main.ts`. A `node_modules` linked to another checkout would land elsewhere and leave the bare-specifier
// arm blind here, so that fails loudly rather than passing on nothing (#1944).
const FRAME = join(SRC, 'shell', 'frame.ts');
const selfName = resolveSpec(DISK, FRAME, '@prism3/studio/src/main');
ok(selfName === MAIN, `"@prism3/studio/src/main" resolves to this checkout's src/main.ts (got ${selfName ?? 'nothing'})`);
ok(resolveSpec(DISK, FRAME, 'typescript') === null, 'a third-party package ("typescript") is not followed');
const arm = importArm(DISK, ROOT, allSrc, files);
const outside = [...arm.read].filter((f) => !f.startsWith(SRC + sep)).length;
for (const o of arm.offenders) ok(false, o);
ok(arm.offenders.length === 0, `no file under ${NEW_DIRS.join(', ')} imports src/main.ts or a module that does (${arm.tainted.size} module(s) reach it; ${arm.opaque.size} reach a computed import(); ${arm.read.size} module(s) read, ${outside} outside src/)`);

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
  // The Style guide draws the five as `COLOR_SECTIONS`. Since S4f Surfaces & fills draws each of the five by its
  // shared renderer, by name in code (it hands Background its own description and grounds Foreground on the contrast floor,
  // #1971), with the Scrim and Fields sections between them; a copy of its own fails the title check below.
  ok(/\bCOLOR_SECTIONS\b/.test(mainSrc.replace(/^\s*(\/\/|\*).*$/gm, '')), 'the Style guide draws COLOR_SECTIONS');
  for (const fn of ['backgroundSection', 'foregroundSection', 'textColorSection', 'borderSection', 'iconSection', 'scrimSection', 'fieldsSection']) {
    ok(new RegExp(`\\b${fn}\\(`).test(surfSrc.replace(/^\s*(\/\/|\*).*$/gm, '')), `src/preview/surfaces.ts draws Surfaces & fills' section through the shared ${fn}()`);
  }
  const ownSurf = ['Background', 'Foreground', 'Text color', 'Border', 'Icon', 'Scrim', 'Fields'].filter((t) => new RegExp(`palSection\\(\\s*'${t}'`).test(surfSrc));
  ok(ownSurf.length === 0, `src/preview/surfaces.ts draws none of the shared sections itself${ownSurf.length ? ` — it defines ${ownSurf.join(', ')} (palSection): Surfaces & fills would drift from the shared module` : ''}`);
  for (const t of SECTION_TITLES) {
    const own = new RegExp(`palSection\\(\\s*'${t}'`).test(mainSrc);
    ok(!own, `src/main.ts draws no "${t}" section of its own${own ? ` — main.ts defines its own "${t}" section (palSection('${t}', …)): the Style guide would drift from Surfaces & fills` : ''}`);
  }
  const idx = readFileSync(join(SRC, 'preview/sections/index.ts'), 'utf8');
  for (const f of SECTION_FILES) ok(idx.includes(`from './${f}'`), `preview/sections/index.ts draws the ${f} section from ./${f}`);

  // S5.1: the Style guide's Disabled and Interactive sections moved to `preview/sections/` too, so Color ›
  // Interactive (S5.2) draws the same code. The arm holds that `main.ts` (the Style guide) and
  // `preview/interactive.ts` (Color › Interactive) both draw them through the shared renderers (by name, in
  // code rather than comments) and that `main.ts` keeps no copy. The oracle is literal: the renderer names,
  // their files, and the copy each section's head draws. Since S5.2 retired the legacy Interactive page and
  // its own lever section titled "Disabled", Disabled is matched by its title as well as its description.
  const code = mainSrc.replace(/^\s*(\/\/|\*).*$/gm, '');
  const intSrc = readFileSync(join(SRC, 'preview/interactive.ts'), 'utf8').replace(/^\s*(\/\/|\*).*$/gm, '');
  for (const [fn, file] of [['disabledSection', 'disabled'], ['interactiveSection', 'interactive']] as const) {
    ok(new RegExp(`\\b${fn}\\(`).test(code), `src/main.ts draws the Style guide's ${file} section through the shared ${fn}()`);
    ok(new RegExp(`\\b${fn}\\(`).test(intSrc), `src/preview/interactive.ts draws Color › Interactive's ${file} section through the shared ${fn}()`);
    ok(idx.includes(`from './${file}'`), `preview/sections/index.ts exports the ${file} section from ./${file}`);
  }
  ok(/\blinksSection\(/.test(intSrc) && idx.includes(`from './links'`), 'src/preview/interactive.ts draws the Links section through the shared linksSection() (preview/sections/links)');
  const ownDisabledTitle = /palSection\(\s*'Disabled'/.test(mainSrc);
  ok(!ownDisabledTitle, `src/main.ts draws no "Disabled" section of its own${ownDisabledTitle ? " — main.ts defines its own \"Disabled\" section (palSection('Disabled', …)): the Style guide would drift from Color › Interactive" : ''}`);
  const ownInteractive = /palSection\(\s*'Interactive'/.test(mainSrc);
  ok(!ownInteractive, `src/main.ts draws no "Interactive" section of its own${ownInteractive ? " — main.ts defines its own \"Interactive\" section (palSection('Interactive', …)): the Style guide would drift from Color › Interactive" : ''}`);
  const ownDisabled = mainSrc.includes('One shared, stateless inert set');
  ok(!ownDisabled, `src/main.ts draws no Style guide "Disabled" section of its own${ownDisabled ? ' — main.ts carries the shared Disabled section\'s copy ("One shared, stateless inert set"): the Style guide would drift from Color › Interactive' : ''}`);
}

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
  // The Style guide draws the five as `COLOR_SECTIONS`. Since S4f Surfaces & fills draws each of the five by its
  // shared renderer, by name in code (it hands Background its own description and grounds Foreground on the contrast floor,
  // #1971), with the Scrim and Fields sections between them; a copy of its own fails the title check below.
  ok(/\bCOLOR_SECTIONS\b/.test(mainSrc.replace(/^\s*(\/\/|\*).*$/gm, '')), 'the Style guide draws COLOR_SECTIONS');
  for (const fn of ['backgroundSection', 'foregroundSection', 'textColorSection', 'borderSection', 'iconSection', 'scrimSection', 'fieldsSection']) {
    ok(new RegExp(`\\b${fn}\\(`).test(surfSrc.replace(/^\s*(\/\/|\*).*$/gm, '')), `src/preview/surfaces.ts draws Surfaces & fills' section through the shared ${fn}()`);
  }
  const ownSurf = ['Background', 'Foreground', 'Text color', 'Border', 'Icon', 'Scrim', 'Fields'].filter((t) => new RegExp(`palSection\\(\\s*'${t}'`).test(surfSrc));
  ok(ownSurf.length === 0, `src/preview/surfaces.ts draws none of the shared sections itself${ownSurf.length ? ` — it defines ${ownSurf.join(', ')} (palSection): Surfaces & fills would drift from the shared module` : ''}`);
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
  // S4f: Surfaces & fills' Scrim (QA-B10) and Fields (#2016) sections, each its own module and marker.
  for (const f of [...SECTION_FILES, 'disabled', 'interactive', 'links', 'focus-ring', 'weights-by-face', 'type-scale', 'line-spacing', 'building-blocks', 'type-sample', 'faces', 'scrim', 'fields',
    'shadow-ramp', 'shadow-tint', 'duration-ramp', 'motion-curves', 'springs', 'motion-transitions', 'button-layout']) {
    const own = new RegExp(`\\.dataset\\.sgSection\\s*=\\s*'${f}'`).test(readFileSync(join(SRC, 'preview/sections', `${f}.ts`), 'utf8'));
    ok(own, `preview/sections/${f}.ts stamps its own root data-sg-section="${f}"`);
  }
}

// ── the Focus ring, shared (UI redesign S4c, owner decision Q30) ─────────────────────────────────────
// Color › Surfaces & fills' preview draws the Focus ring section from one module, `preview/sections/focus-ring.ts`
// (S5.2 retired the legacy Interactive page, its other caller). Subject: `main.ts` and `preview/surfaces.ts`, read from
// disk, comments stripped. Oracle: the literal renderer name and the section's title. A copy pasted back into
// `main.ts` fails by the title it draws; the smoke suite holds the drawn section to its marker.
{
  const strip = (src: string): string => src.replace(/^\s*(\/\/|\*).*$/gm, '');
  const mainCode = strip(readFileSync(MAIN, 'utf8'));
  const surfCode = strip(readFileSync(join(SRC, 'preview/surfaces.ts'), 'utf8'));
  ok(/\bfocusRingSection\(/.test(surfCode), 'src/preview/surfaces.ts draws the Focus ring section through the shared focusRingSection()');
  const own = /palSection\(\s*'Focus ring'/.test(mainCode) || /'fr-wrap'/.test(mainCode);
  ok(!own, `src/main.ts draws no "Focus ring" section of its own${own ? " — main.ts carries its own Focus ring (palSection('Focus ring', …) or the fr-wrap markup): Surfaces & fills would drift from the Interactive page" : ''}`);
  const idx = readFileSync(join(SRC, 'preview/sections/index.ts'), 'utf8');
  ok(idx.includes("from './focus-ring'"), "preview/sections/index.ts exports the focus-ring section from ./focus-ring");
}

// ── Type's preview pieces and writes, out of `main.ts` (UI redesign S6.1, S6.2, S6.3) ───────────────
// The Type page's preview draws its sections from `preview/sections/`: the shared type sample (#1942), Font
// families, Scale (S6.3: it folds the legacy full type ramp and Layout's fluid read-out, so Layout no longer draws
// one), Weights and styles, Line height and letter spacing, and Building blocks; the type sample is also Brand's
// Style guide's first section. Every Type write goes through `state/type-input.ts`, so the new page writes the same
// bytes. Subject: `main.ts` and `preview/type.ts`, read from disk, comments stripped. Oracle: the literal renderer
// names, each section's own title or copy, and the literal write shapes the legacy closures used. A copy pasted
// back into `main.ts` fails by what it draws; the smoke suite holds each drawn section to its marker.
{
  const strip = (src: string): string => src.replace(/^\s*(\/\/|\*).*$/gm, '');
  const mainSrc = readFileSync(MAIN, 'utf8');
  const mainCode = strip(mainSrc);
  const typeCode = strip(readFileSync(join(SRC, 'preview/type.ts'), 'utf8'));
  const idx = readFileSync(join(SRC, 'preview/sections/index.ts'), 'utf8');
  for (const [fn, file, what, inMain] of [
    ['weightsByFaceSection', 'weights-by-face', 'the Weights and styles section', false],
    ['typeScaleSection', 'type-scale', 'the Scale section', false],
    ['lineSpacingSection', 'line-spacing', 'the Line height and letter spacing section', false],
    ['buildingBlocksSection', 'building-blocks', 'the Building blocks section', false],
    ['typeSampleSection', 'type-sample', 'the type sample', true],
    ['facesSection', 'faces', 'the Faces section', false],
  ] as const) {
    ok(new RegExp(`\\b${fn}\\(`).test(typeCode), `src/preview/type.ts draws ${what} through the shared ${fn}()`);
    if (inMain) ok(new RegExp(`\\b${fn}\\(`).test(mainCode), `src/main.ts draws ${what} through the shared ${fn}()`);
    ok(idx.includes(`from './${file}'`), `preview/sections/index.ts exports ${what} from ./${file}`);
  }
  const OWN: Array<[RegExp, string]> = [
    [/palSection\(\s*'(The full type ramp|Scale)'/, "its own Scale section (palSection('Scale', …), or the retired 'The full type ramp')"],
    [/palSection\(\s*'(Weight roles by (face|font family)|Weights and styles)'/, "its own Weights and styles section (palSection('Weights and styles', …))"],
    [/palSection\(\s*'(The size ladder|Leading & tracking ladders|Building blocks)'/, "its own Building blocks ladders (palSection('The size ladder' or 'Building blocks', …))"],
    [/The quick brown fox jumps over the lazy dog|'tsm-list'/, 'the shared type sample\'s text ("The quick brown fox jumps over the lazy dog") or its tsm-list markup'],
    [/'fz-list'|What fluid does — |Sizes that merge on mobile/, "its own fluid read-out (the fz-list markup, \"What fluid does — \" or \"Sizes that merge on mobile\")"],
  ];
  for (const [re, what] of OWN) {
    const own = re.test(mainCode);
    ok(!own, `src/main.ts draws no Type preview piece of its own: ${what.split(' (')[0].replace(/^its own |^the shared /, '')}${own ? ` — main.ts carries ${what}: the Type page would drift from the Style guide` : ''}`);
  }
  // ── THE WRITES (#1996): matched on the write's TARGET in the AST, never on its spelling ───────────────────
  // The regexes this replaced matched three spellings, and two more passed unseen: a nullish-assign write
  // (`(brandState.typography ??= {}).sizes…`) and the generic per-mode swap (`setModeLever(m, `${modeField}.…`)`).
  // So the rule is stated about what is written, three ways:
  //   1. DIRECT: no write anywhere in `main.ts` lands on `brandState.typography`, by any operator, `delete`,
  //      `++`/`--`, `Object.assign`, a mutating method, or through a one-level alias of it or of `brandState`.
  //   2. KEYED: every `setPath(brandState, K, …)` and `setModeLever(M, K, …)` key is resolved statically (a
  //      literal, a template's literal head, or a head narrowed by an enclosing `if (X === 'lit')`) and must
  //      not be a Type key. A key that does not resolve must be on `UNRESOLVED_OK`, by function and key text,
  //      with the reason it cannot carry a Type key.
  //   3. FED: the generic lever renderer (`renderControl` and its wrappers) writes whatever key it is handed, so
  //      none is handed a Type one (`csSlider` and `csPicker` were two more until S10 retired them with Layout's
  //      legacy page, their only caller): no `typography.*` key
  //      literal, `leversFor('typography')`, or variable built from either, reaches them. This is what makes
  //      rule 2's `UNRESOLVED_OK` entries true rather than asserted.
  // ORACLE: the Type mode fields are literals here, and every member of the engine's `ModeLevers` type must be
  // classified one way or the other, so a new per-mode field fails until someone decides which it is.
  {
    const TYPE_MODE_FIELDS = new Set(['families', 'weights', 'typeSizes', 'lineHeights', 'letterSpacings']);
    const OTHER_MODE_FIELDS = new Set(['radius', 'tempo', 'easings', 'shadow', 'density']);
    const themeSf = ts.createSourceFile('theme.ts', readFileSync(join(SRC, '../../../packages/engine/theme.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
    let modeLeverFields: string[] = [];
    ts.forEachChild(themeSf, (n) => {
      if (ts.isTypeAliasDeclaration(n) && n.name.text === 'ModeLevers' && ts.isTypeLiteralNode(n.type))
        modeLeverFields = n.type.members.map((m) => (m.name && ts.isIdentifier(m.name) ? m.name.text : '?'));
    });
    const unclassified = modeLeverFields.filter((f) => TYPE_MODE_FIELDS.has(f) === OTHER_MODE_FIELDS.has(f));
    ok(modeLeverFields.length >= 8 && unclassified.length === 0,
      `every ModeLevers field is classified as Type or not (${modeLeverFields.length} read from the engine)${unclassified.length ? ` — unclassified: ${unclassified.join(', ')}` : ''}`);

    /** A variable-key write that is not Type, by `<enclosing function>:<key text>`, and why. */
    // Empty since UI redesign S8.2: its one entry, `renderControl:lever.key` (the generic lever knob's write), went with
    // the knob, whose last caller (the Button options) moved to `domains/components.ts`.
    const UNRESOLVED_OK: Record<string, string> = {};
    /** Every write in one file, by the rules above. `main.ts` is held to all of them; `domains/depth.ts` (#2078) to the
     *  direct Depth & motion rule, since its keyed writes are already refused outright below (it names no `setPath`). */
    const scan = (FILE: string, TEXT: string) => {
      // A one-file program, so an identifier resolves to ITS declaration through the checker. Matching variables by
      // name was wrong the first time: an unrelated `l` elsewhere in the file tainted every `l`.
      const host = ts.createCompilerHost({ noResolve: true, noLib: true });
      const getSourceFile = host.getSourceFile;
      host.getSourceFile = (f, v) => (f === FILE ? ts.createSourceFile(FILE, TEXT, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS) : getSourceFile(f, v));
      const program = ts.createProgram([FILE], { noResolve: true, noLib: true, allowJs: false }, host);
      const sf = program.getSourceFile(FILE)!;
      const checker = program.getTypeChecker();
      /** The initializer of the variable `id` refers to, or null. */
      const initOf = (id: ts.Identifier): ts.Expression | null => {
        const d = checker.getSymbolAtLocation(id)?.valueDeclaration;
        return d && ts.isVariableDeclaration(d) && d.initializer ? d.initializer : null;
      };
      const at = (n: ts.Node): string => `line ${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}: ${n.getText().replace(/\s+/g, ' ').slice(0, 90)}`;
      const strip = (e: ts.Expression): ts.Expression => {
        for (;;) {
          if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)) e = e.expression;
          else return e;
        }
      };
      /** The member chain under `e`, outermost last: `brandState.typography.sizes` → ['brandState', 'typography', 'sizes']. */
      const chain = (e: ts.Expression): string[] => {
        e = strip(e);
        if (ts.isIdentifier(e)) return [e.text];
        if (ts.isPropertyAccessExpression(e)) return [...chain(e.expression), e.name.text];
        if (ts.isElementAccessExpression(e)) {
          const k = e.argumentExpression;
          return [...chain(e.expression), ts.isStringLiteralLike(k) ? k.text : '[?]'];
        }
        // `(brandState.typography ??= {})` is itself a write, caught where it stands; through it, the chain continues.
        if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionEqualsToken) return chain(e.left);
        return ['?'];
      };
      /** The identifier at the root of a member chain, or null. */
      const rootId = (e: ts.Expression): ts.Identifier | null => {
        e = strip(e);
        if (ts.isIdentifier(e)) return e;
        if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) return rootId(e.expression);
        if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionEqualsToken) return rootId(e.left);
        return null;
      };
      /** The member chain under `e` with ONE alias spliced in at its root: through `const t = brandState.typography`
       *  `t.x` is `brandState.typography.x`, and through `const bs = brandState` `bs.typography.x` is too (review of
       *  #2017: an alias of `brandState` itself escaped when only aliases of `brandState.typography` were followed). */
      const brandRooted = (e: ts.Expression): string[] => {
        const c = chain(e);
        if (c[0] === 'brandState') return c;
        const r = rootId(e);
        const init = r ? initOf(r) : null;
        return init ? [...chain(init), ...c.slice(1)] : c;
      };
      const isTypeTarget = (e: ts.Expression): boolean => { const c = brandRooted(e); return c[0] === 'brandState' && c[1] === 'typography'; };
      /** `brandState` itself, directly or through one alias. */
      const isBrandState = (e: ts.Expression): boolean => brandRooted(e).join('.') === 'brandState';
      const ASSIGN = new Set([ts.SyntaxKind.EqualsToken, ts.SyntaxKind.PlusEqualsToken, ts.SyntaxKind.MinusEqualsToken,
        ts.SyntaxKind.AsteriskEqualsToken, ts.SyntaxKind.SlashEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken,
        ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.AmpersandAmpersandEqualsToken]);
      const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'set', 'delete', 'clear', 'add']);
      const enclosingFn = (n: ts.Node): string => {
        for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
          if ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)
            && ts.isVariableStatement(p.parent.parent.parent) && p.parent.parent.parent.parent === sf) return p.parent.name.text;
          if (ts.isFunctionDeclaration(p) && p.name && p.parent === sf) return p.name.text;
        }
        return '(top level)';
      };
      /** `X === 'lit'` (either side) in an `if` or `?:` whose TRUE branch holds `n`: the literal, or null. */
      const narrowed = (n: ts.Node, id: string): string | null => {
        for (let p: ts.Node | undefined = n, c: ts.Node | undefined; p; c = p, p = p.parent) {
          const cond = ts.isIfStatement(p) && c === p.thenStatement ? p.expression : ts.isConditionalExpression(p) && c === p.whenTrue ? p.condition : null;
          if (cond && ts.isBinaryExpression(cond) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(cond.operatorToken.kind)) {
            const [l, r] = [strip(cond.left), strip(cond.right)];
            if (ts.isIdentifier(l) && l.text === id && ts.isStringLiteralLike(r)) return r.text;
            if (ts.isIdentifier(r) && r.text === id && ts.isStringLiteralLike(l)) return l.text;
          }
        }
        return null;
      };
      /** The statically known prefix of a key, or null. */
      const keyPrefix = (k: ts.Expression, site: ts.Node): string | null => {
        k = strip(k);
        if (ts.isStringLiteralLike(k)) return k.text;
        if (ts.isTemplateExpression(k)) {
          if (k.head.text) return k.head.text;
          const first = strip(k.templateSpans[0].expression);
          const lit = ts.isIdentifier(first) ? narrowed(site, first.text) : null;
          return lit === null ? null : lit + k.templateSpans[0].literal.text;
        }
        return null;
      };
      const direct: string[] = [], keyed: string[] = [], unresolved: string[] = [];
      // The Depth & motion writes (UI redesign S9.1), held by the same visitor: no write into `brandState.shadow` or
      // `brandState.motionPersonality`, and no keyed write on `shadow.*`, `motionPersonality.*` or the mode fields
      // `tempo`, `easings` and `shadow`. Literal: the legacy pages' write targets, as the scoping report lists them.
      const DEPTH_PATH_ROOTS = new Set(['shadow', 'motionPersonality']);
      const DEPTH_MODE_FIELDS = new Set(['tempo', 'easings', 'shadow']);
      const isDepthTarget = (e: ts.Expression): boolean => { const c = brandRooted(e); return c[0] === 'brandState' && DEPTH_PATH_ROOTS.has(c[1]); };
      const depthDirect: string[] = [], depthKeyed: string[] = [];
      // The Shape writes (UI redesign S7; #2078), the same way: S7 moved Density, radius softness, Control shape and the
      // base radius to `domains/shape.ts`, writing through `state/shape-input.ts`, so `main.ts` writes none of them, by
      // any operator, and makes no keyed write on those keys or the mode fields `density` and `radius`. Literal: the
      // legacy Size & radius page's write targets, as #2078 lists them.
      const SHAPE_PATH_ROOTS = new Set(['density', 'radiusScale', 'controlShape', 'baseMd']);
      const SHAPE_MODE_FIELDS = new Set(['density', 'radius']);
      /** `brandState.<shape key>`, or `brandState.modeLevers.<m>.density|radius`, directly or through one alias. */
      const isShapeTarget = (e: ts.Expression): boolean => {
        const c = brandRooted(e);
        return c[0] === 'brandState' && (SHAPE_PATH_ROOTS.has(c[1]) || (c[1] === 'modeLevers' && SHAPE_MODE_FIELDS.has(c[3])));
      };
      const shapeDirect: string[] = [], shapeKeyed: string[] = [];
      // The Button option writes (UI redesign S8.1), the same way: no write onto `brandState.buttonIcons`,
      // `.buttonContentSize`, `.buttonLabelWeight` or `.buttonMinWidthMultiplier`, by any operator, and no keyed write on
      // those keys. All four are brand-wide (no `ModeLevers` field), so there is no mode field to hold. Literal: the
      // levers' keys.
      const BUTTON_KEYS = new Set(['buttonIcons', 'buttonContentSize', 'buttonLabelWeight', 'buttonMinWidthMultiplier']);
      const isButtonTarget = (e: ts.Expression): boolean => { const c = brandRooted(e); return c[0] === 'brandState' && BUTTON_KEYS.has(c[1]); };
      const buttonDirect: string[] = [], buttonKeyed: string[] = [];
      // The Layout writes (UI redesign S10; #2098 item 6), the same way: S10 moved Breakpoints, Grid and Containers to
      // `domains/layout.ts`, writing through `state/layout-input.ts`, so `main.ts` writes nothing under
      // `brandState.layout`, by any operator, `delete`, `Object.assign` or an in-place mutator (`.push` on its
      // breakpoints), and makes no keyed write on `layout.*`. Layout is brand-wide (no `ModeLevers` field), so there is
      // no mode field to hold. Literal: the brand input's `layout` key, the root every Layout lever's key starts with.
      const isLayoutTarget = (e: ts.Expression): boolean => { const c = brandRooted(e); return c[0] === 'brandState' && c[1] === 'layout'; };
      const layoutDirect: string[] = [], layoutKeyed: string[] = [];
      const seenOk = new Set<string>();
      const visit = (n: ts.Node): void => {
        if (ts.isBinaryExpression(n) && ASSIGN.has(n.operatorToken.kind) && isTypeTarget(n.left)) direct.push(at(n));
        if (ts.isBinaryExpression(n) && ASSIGN.has(n.operatorToken.kind) && isDepthTarget(n.left)) depthDirect.push(at(n));
        if (ts.isDeleteExpression(n) && isDepthTarget(n.expression)) depthDirect.push(at(n));
        if (ts.isBinaryExpression(n) && ASSIGN.has(n.operatorToken.kind) && isShapeTarget(n.left)) shapeDirect.push(at(n));
        if (ts.isDeleteExpression(n) && isShapeTarget(n.expression)) shapeDirect.push(at(n));
        if (ts.isBinaryExpression(n) && ASSIGN.has(n.operatorToken.kind) && isButtonTarget(n.left)) buttonDirect.push(at(n));
        if (ts.isDeleteExpression(n) && isButtonTarget(n.expression)) buttonDirect.push(at(n));
        if (ts.isBinaryExpression(n) && ASSIGN.has(n.operatorToken.kind) && isLayoutTarget(n.left)) layoutDirect.push(at(n));
        if (ts.isDeleteExpression(n) && isLayoutTarget(n.expression)) layoutDirect.push(at(n));
        if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n))
          && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(n.operator) && isLayoutTarget(n.operand)) layoutDirect.push(at(n));
        if (ts.isCallExpression(n) && n.expression.getText() === 'Object.assign' && n.arguments[0] && (isLayoutTarget(n.arguments[0])
          || (isBrandState(n.arguments[0]) && n.arguments.slice(1).some((a) => ts.isObjectLiteralExpression(a) && a.properties.some((pr) => pr.name?.getText() === 'layout'))))) layoutDirect.push(at(n));
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATORS.has(n.expression.name.text) && isLayoutTarget(n.expression.expression)) layoutDirect.push(at(n));
        if (ts.isCallExpression(n) && n.expression.getText() === 'setPath' && n.arguments[0] && isLayoutTarget(n.arguments[0])) layoutDirect.push(at(n));
        if (ts.isCallExpression(n) && n.expression.getText() === 'Object.assign' && n.arguments[0] && (isButtonTarget(n.arguments[0])
          || (isBrandState(n.arguments[0]) && n.arguments.slice(1).some((a) => ts.isObjectLiteralExpression(a) && a.properties.some((pr) => BUTTON_KEYS.has(pr.name?.getText() ?? '')))))) buttonDirect.push(at(n));
        if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n))
          && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(n.operator) && isShapeTarget(n.operand)) shapeDirect.push(at(n));
        if (ts.isDeleteExpression(n) && isTypeTarget(n.expression)) direct.push(at(n));
        if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n))
          && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(n.operator) && isTypeTarget(n.operand)) direct.push(at(n));
        if (ts.isCallExpression(n)) {
          const callee = n.expression.getText();
          const [a0, a1] = n.arguments;
          if (callee === 'Object.assign' && a0 && (isTypeTarget(a0)
            || (isBrandState(a0) && n.arguments.slice(1).some((a) => ts.isObjectLiteralExpression(a) && a.properties.some((pr) => pr.name?.getText() === 'typography'))))) direct.push(at(n));
          if (ts.isPropertyAccessExpression(n.expression) && MUTATORS.has(n.expression.name.text) && isTypeTarget(n.expression.expression)) direct.push(at(n));
          if (callee === 'Object.assign' && a0 && (isShapeTarget(a0)
            || (isBrandState(a0) && n.arguments.slice(1).some((a) => ts.isObjectLiteralExpression(a) && a.properties.some((pr) => SHAPE_PATH_ROOTS.has(pr.name?.getText() ?? '')))))) shapeDirect.push(at(n));
          const keyedCall = (callee === 'setPath' && a0 && isBrandState(a0)) ? 'path' : callee === 'setModeLever' ? 'mode' : null;
          if (callee === 'setPath' && a0 && isTypeTarget(a0)) direct.push(at(n));
          if (keyedCall && a1) {
            const pre = keyPrefix(a1, n);
            if (pre === null) {
              const id = `${enclosingFn(n)}:${strip(a1).getText()}`;
              if (UNRESOLVED_OK[id]) seenOk.add(id); else unresolved.push(`${at(n)} (${id})`);
            } else {
              const seg = pre.split('.')[0];
              const isType = keyedCall === 'path' ? seg === 'typography' : TYPE_MODE_FIELDS.has(seg);
              if (isType) keyed.push(at(n));
              if (keyedCall === 'path' ? DEPTH_PATH_ROOTS.has(seg) : DEPTH_MODE_FIELDS.has(seg)) depthKeyed.push(at(n));
              const ml = keyedCall === 'path' && seg === 'modeLevers' ? pre.split('.')[2] : undefined;
              if (keyedCall === 'path' ? SHAPE_PATH_ROOTS.has(seg) || (ml !== undefined && SHAPE_MODE_FIELDS.has(ml)) : SHAPE_MODE_FIELDS.has(seg)) shapeKeyed.push(at(n));
              if (keyedCall === 'path' && BUTTON_KEYS.has(seg)) buttonKeyed.push(at(n));
              if (keyedCall === 'path' && seg === 'layout') layoutKeyed.push(at(n));
            }
          }
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
      return { sf, at, initOf, direct, keyed, unresolved, depthDirect, depthKeyed, shapeDirect, shapeKeyed, buttonDirect, buttonKeyed, layoutDirect, layoutKeyed, seenOk };
    };
    const { sf, at, initOf, direct, keyed, unresolved, depthDirect, depthKeyed, shapeDirect, shapeKeyed, buttonDirect, buttonKeyed, layoutDirect, layoutKeyed, seenOk } = scan(MAIN, mainSrc);
    ok(direct.length === 0, `src/main.ts writes nothing into brandState.typography itself${direct.length ? ` — ${direct.slice(0, 3).join(' | ')}: the write belongs in state/type-input.ts` : ''}`);
    ok(keyed.length === 0, `src/main.ts makes no keyed Type write (setPath into typography.*, or setModeLever on a Type mode field)${keyed.length ? ` — ${keyed.slice(0, 3).join(' | ')}` : ''}`);
    ok(unresolved.length === 0, `every keyed write in src/main.ts resolves to a non-Type key, or is listed with its reason${unresolved.length ? ` — unresolved and unlisted: ${unresolved.slice(0, 3).join(' | ')}` : ''}`);
    ok(depthDirect.length === 0, `src/main.ts writes nothing into brandState.shadow or brandState.motionPersonality itself${depthDirect.length ? ` — ${depthDirect.slice(0, 3).join(' | ')}: the write belongs in state/depth-motion-input.ts` : ''}`);
    ok(depthKeyed.length === 0, `src/main.ts makes no keyed Elevation or Motion write (setPath into shadow.* or motionPersonality.*, or setModeLever on tempo, easings or shadow)${depthKeyed.length ? ` — ${depthKeyed.slice(0, 3).join(' | ')}: the write belongs in state/depth-motion-input.ts` : ''}`);
    ok(shapeDirect.length === 0, `src/main.ts writes nothing into a Shape lever itself (density, radiusScale, controlShape, baseMd, modeLevers.*.density or .radius)${shapeDirect.length ? ` — ${shapeDirect.slice(0, 3).join(' | ')}: the write belongs in state/shape-input.ts` : ''}`);
    ok(shapeKeyed.length === 0, `src/main.ts makes no keyed Shape write (setPath into density, radiusScale, controlShape, baseMd or modeLevers.*.density/.radius, or setModeLever on density or radius)${shapeKeyed.length ? ` — ${shapeKeyed.slice(0, 3).join(' | ')}: the write belongs in state/shape-input.ts` : ''}`);
    ok(buttonDirect.length === 0, `src/main.ts writes no Button option onto brandState itself${buttonDirect.length ? ` — ${buttonDirect.slice(0, 3).join(' | ')}: the write belongs in state/button-input.ts` : ''}`);
    ok(buttonKeyed.length === 0, `src/main.ts makes no keyed Button option write (setPath on buttonIcons, buttonContentSize, buttonLabelWeight or buttonMinWidthMultiplier)${buttonKeyed.length ? ` — ${buttonKeyed.slice(0, 3).join(' | ')}: the write belongs in state/button-input.ts` : ''}`);
    ok(layoutDirect.length === 0, `src/main.ts writes nothing into brandState.layout itself${layoutDirect.length ? ` — ${layoutDirect.slice(0, 3).join(' | ')}: the write belongs in state/layout-input.ts` : ''}`);
    ok(layoutKeyed.length === 0, `src/main.ts makes no keyed Layout write (setPath into layout.*)${layoutKeyed.length ? ` — ${layoutKeyed.slice(0, 3).join(' | ')}: the write belongs in state/layout-input.ts` : ''}`);
    // `domains/depth.ts` under the same visitor (#2078): the regex below refuses its `setPath`/`setModeLever` calls,
    // but a direct `brandState.shadow = …` (any assignment operator, `delete`, or through one alias) names neither and passed.
    const DEPTH_LEVERS = join(SRC, 'domains/depth.ts');
    const dl = scan(DEPTH_LEVERS, readFileSync(DEPTH_LEVERS, 'utf8'));
    ok(dl.depthDirect.length === 0, `src/domains/depth.ts writes nothing into brandState.shadow or brandState.motionPersonality itself${dl.depthDirect.length ? ` — ${dl.depthDirect.slice(0, 3).join(' | ')}: the write belongs in state/depth-motion-input.ts` : ''}`);
    // `domains/components.ts` (S8.2) under the same visitor: no Button option written onto `brandState` directly, by any
    // operator or alias; its keyed writes are refused outright in the S8.1/S8.2 arm below (it names no `setPath`).
    const COMPONENTS_LEVERS = join(SRC, 'domains/components.ts');
    const cl = scan(COMPONENTS_LEVERS, readFileSync(COMPONENTS_LEVERS, 'utf8'));
    ok(cl.buttonDirect.length === 0, `src/domains/components.ts writes no Button option onto brandState itself${cl.buttonDirect.length ? ` — ${cl.buttonDirect.slice(0, 3).join(' | ')}: the write belongs in state/button-input.ts` : ''}`);
    const stale = Object.keys(UNRESOLVED_OK).filter((k) => !seenOk.has(k));
    ok(stale.length === 0, `every UNRESOLVED_OK entry still names a write in src/main.ts${stale.length ? ` — no longer found: ${stale.join(', ')}` : ''}`);

    // Rule 3: what the generic renderer is fed.
    // `csSlider`/`csPicker` were fed here too (review of #2017) until S10 retired both with Layout's legacy page;
    // `leverSection` (S9.2) and `renderPerModeSelect` (S7, S9.2) are gone, and `leverControl` and `csLeverStack` (S8.1).
    // `renderControl` itself went in S8.2 with its last caller, so the rule has no subject today: the visitors below
    // find nothing to feed. That is recorded rather than left to read as a pass. The rule is kept for a generic writer
    // that returns, and this line fails until FEEDS names it: `main.ts` declares no function that takes a lever and
    // writes its key.
    const FEEDS = new Set(['renderControl']);
    const generic = /\bconst\s+(\w+)\s*=\s*\(\s*lever\s*:\s*Lever\b/.exec(mainSrc.replace(/^\s*(\/\/|\*).*$/gm, ''));
    ok(!generic || FEEDS.has(generic[1]), `rule 3: src/main.ts declares no generic lever writer that FEEDS does not watch${generic ? ` — ${generic[1]}(lever: Lever, …)` : ''}`);
    /** Does `e` name a Type lever: a `typography.*` key literal, `leversFor('typography')`, or a variable whose
     *  own initializer does (one level, resolved by the checker)? */
    const typeLever = (e: ts.Node, depth = 0): boolean => {
      let hit = false;
      const look = (x: ts.Node): void => {
        if (hit) return;
        if (ts.isStringLiteralLike(x) && /^typography\./.test(x.text)) hit = true;
        else if (ts.isCallExpression(x) && x.expression.getText() === 'leversFor' && x.arguments[0] && ts.isStringLiteralLike(x.arguments[0]) && x.arguments[0].text === 'typography') hit = true;
        else if (ts.isIdentifier(x) && depth === 0) { const init = initOf(x); if (init && typeLever(init, 1)) hit = true; }
        ts.forEachChild(x, look);
      };
      look(e);
      return hit;
    };
    const fed: string[] = [];
    const visitFeeds = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && FEEDS.has(n.expression.getText()) && n.arguments.some(typeLever)) fed.push(at(n));
      ts.forEachChild(n, visitFeeds);
    };
    visitFeeds(sf);
    ok(fed.length === 0, `src/main.ts hands no Type key to a writer that writes whatever it is handed (the generic lever renderer)${fed.length ? ` — ${fed.slice(0, 3).join(' | ')}` : ''}`);
    // The Shape keys the same way (#2078): a Shape key literal handed to one of them is a Shape write the keyed rule
    // cannot see, because the key reaches `setPath` as a variable.
    const SHAPE_KEY = /^(density|radiusScale|controlShape|baseMd)$|^modeLevers\.[^.]+\.(density|radius)$/;
    const shapeFed: string[] = [];
    const visitShapeFeeds = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && FEEDS.has(n.expression.getText())) {
        const look = (x: ts.Node): void => { if (ts.isStringLiteralLike(x) && SHAPE_KEY.test(x.text)) shapeFed.push(at(n)); else ts.forEachChild(x, look); };
        n.arguments.forEach(look);
      }
      ts.forEachChild(n, visitShapeFeeds);
    };
    visitShapeFeeds(sf);
    ok(shapeFed.length === 0, `src/main.ts hands no Shape key to a writer that writes whatever it is handed (the generic lever renderer)${shapeFed.length ? ` — ${shapeFed.slice(0, 3).join(' | ')}` : ''}`);
    // The Layout keys the same way (#2098 item 6): a `layout.*` key literal handed to the generic renderer is a Layout
    // write the keyed rule cannot see, because the key reaches `setPath` as a variable.
    const layoutFed: string[] = [];
    const visitLayoutFeeds = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && FEEDS.has(n.expression.getText())) {
        const look = (x: ts.Node): void => { if (ts.isStringLiteralLike(x) && /^layout(\.|$)/.test(x.text)) layoutFed.push(at(n)); else ts.forEachChild(x, look); };
        n.arguments.forEach(look);
      }
      ts.forEachChild(n, visitLayoutFeeds);
    };
    visitLayoutFeeds(sf);
    ok(layoutFed.length === 0, `src/main.ts hands no Layout key to a writer that writes whatever it is handed (the generic lever renderer)${layoutFed.length ? ` — ${layoutFed.slice(0, 3).join(' | ')}` : ''}`);
  }
  // S9.2 retired `renderRepointTable`, the last Type writer `main.ts` held (its line height and letter spacing branch was
  // already dead, #2038), so `main.ts` imports no Type write at all: the AST arm above holds that it makes none.
  ok(!imports(mainSrc, 'main.ts').some((i) => i.spec === './state/type-input'), 'src/main.ts imports no Type write (./state/type-input): it has none left to make');
}

// ── Depth & motion's preview pieces and writes (UI redesign S9.1, S9.2) ─────────────────────────────────────────
// S9.1 lifted the legacy Elevation and Motion pages' read-only pieces into `preview/sections/` (the shadow steps, the
// shadow color, the durations, the curves, springs and the traced transitions) and their writes into
// `state/depth-motion-input.ts`; S9.2 retired the two pages, so the Depth & motion preview (`preview/depth.ts`) is the
// one that draws the pieces, and the Depth & motion levers (`domains/depth.ts`) the one that writes. Subject: `main.ts`,
// `preview/depth.ts` and `domains/depth.ts`, read from disk, comments stripped. Oracle: the literal renderer names, each
// piece's own markup as the legacy renderers wrote it, and the literal state writes. A copy pasted back into `main.ts`
// fails by what it draws; the smoke suite holds each drawn piece to its marker on the new page.
{
  const strip = (src: string): string => src.replace(/^\s*(\/\/|\*).*$/gm, '');
  const mainSrc = readFileSync(MAIN, 'utf8');
  const mainCode = strip(mainSrc);
  const depthCode = strip(readFileSync(join(SRC, 'preview/depth.ts'), 'utf8'));
  const leversSrc = readFileSync(join(SRC, 'domains/depth.ts'), 'utf8');
  const leversCode = strip(leversSrc);
  const idx = readFileSync(join(SRC, 'preview/sections/index.ts'), 'utf8');
  for (const [fn, file, what] of [
    ['shadowRampSection', 'shadow-ramp', 'the shadow steps'],
    ['shadowTintSection', 'shadow-tint', 'the shadow color'],
    ['durationRampSection', 'duration-ramp', 'the durations'],
    ['motionCurvesSection', 'motion-curves', 'the curves'],
    ['springsSection', 'springs', 'the Springs section'],
    ['motionTransitionsSection', 'motion-transitions', 'the traced transitions'],
  ] as const) {
    ok(new RegExp(`\\b${fn}\\(`).test(depthCode), `src/preview/depth.ts draws ${what} through the shared ${fn}()`);
    ok(!new RegExp(`\\b${fn}\\b`).test(mainCode), `src/main.ts no longer draws ${what} (${fn}): the legacy Elevation and Motion pages are gone`);
    ok(idx.includes(`from './${file}'`), `preview/sections/index.ts exports ${what} from ./${file}`);
  }
  const OWN: Array<[RegExp, string]> = [
    [/palSection\(\s*'Elevation ramp'|'sh-list'|'sh-card'/, "its own shadow steps (palSection('Elevation ramp', …) or the sh-list markup)"],
    [/'sh-tintout'|'sh-tintblock'|In a shadow · 12%/, "its own shadow color (the sh-tintout markup or \"In a shadow · 12%\")"],
    [/palSection\(\s*'Duration ramp'|'mo-ms-strip'|'mo-ramp-foot'/, "its own durations (palSection('Duration ramp', …) or the mo-ms-strip markup)"],
    [/subHead\(\s*'The curve set'|'mo-ez-strip'|'mo-ez-card'/, "its own curves (subHead('The curve set') or the mo-ez-strip markup)"],
    [/palSection\(\s*'Springs'|'mo-spring-grid'/, "its own Springs section (palSection('Springs', …) or the mo-spring-grid markup)"],
    [/palSection\(\s*'Motion'|'mo-grid'|'mo-stage'|createElementNS\(/, "its own traced transitions (palSection('Motion', …), the mo-grid markup, or an SVG stage)"],
  ];
  for (const [re, what] of OWN) {
    for (const [file, code] of [['src/main.ts', mainCode], ['src/preview/depth.ts', depthCode]] as const) {
      const m = re.exec(code);
      ok(!m, `${file} draws no Depth & motion preview piece of its own: ${what.split(' (')[0].replace(/^its own /, '')}${m ? ` — it carries ${what}, found "${m[0]}": the piece belongs in preview/sections/` : ''}`);
    }
  }
  // `main.ts` writes no Elevation or Motion value any more (the AST arm above holds what it writes), and imports no
  // depth write. The new page writes only through the state module: it names no generic writer (`setPath`,
  // `setModeLever`), so a write that bypassed `state/depth-motion-input.ts`'s byte rules would have to be spelled here.
  ok(!imports(mainSrc, 'main.ts').some((i) => i.spec === './state/depth-motion-input'), 'src/main.ts imports no Elevation or Motion write (./state/depth-motion-input): it has none left to make');
  ok(imports(leversSrc, 'depth.ts').some((i) => i.spec === '../state/depth-motion-input'), 'src/domains/depth.ts imports its writes from ../state/depth-motion-input');
  const generic = /\b(setPath|setModeLever)\s*\(/.exec(leversCode);
  ok(!generic, `src/domains/depth.ts writes only through state/depth-motion-input.ts${generic ? ` — it calls ${generic[1]}() itself` : ''}`);
  for (const w of ['setShadow', 'setTempo', 'setEasingRole'])
    ok(new RegExp(`\\b${w}\\(`).test(leversCode), `src/domains/depth.ts writes through ${w}()`);
}

// ── the Button options and the component catalog, out of `main.ts` (UI redesign S8.1, S8.2) ─────────────────
// Since S8.2 the Button options are the Components page's (`domains/components.ts`), which writes through
// `state/button-input.ts` (the AST arm above holds that `main.ts` writes no Button option itself, and the scan below
// holds the same of the new page), and its preview (`preview/components.ts`) draws the button specimen from
// `preview/sections/button-layout.ts`. The catalog is computed by `state/component-catalog.ts`, which imports no
// definition: the plugin hands it the definitions from its own entry, and the web reads the generated copy. Subject:
// `main.ts`, the Components modules, the catalog module and the plugin's iframe entry, read from disk, comments
// stripped. Oracle: the literal setter and renderer names, the specimen's own markup, and the literal module specifiers
// of the definitions and the projector. `vercel-ignore-check.mjs` holds the same rule on the built web bundle; this
// holds it in the source, where it fails first.
{
  const strip = (src: string): string => src.replace(/^\s*(\/\/|\*).*$/gm, '');
  const mainSrc = readFileSync(MAIN, 'utf8');
  const mainCode = strip(mainSrc);
  const levSrc = readFileSync(join(SRC, 'domains/components.ts'), 'utf8');
  const levCode = strip(levSrc);
  const prevSrc = readFileSync(join(SRC, 'preview/components.ts'), 'utf8');
  const prevCode = strip(prevSrc);
  const setsSrc = readFileSync(join(SRC, 'preview/sections/component-sets.ts'), 'utf8');
  const idx = readFileSync(join(SRC, 'preview/sections/index.ts'), 'utf8');
  ok(/\bbuttonLayoutSection\(/.test(prevCode), 'src/preview/components.ts draws the button specimen through the shared buttonLayoutSection()');
  ok(idx.includes("from './button-layout'"), 'preview/sections/index.ts exports the button specimen from ./button-layout');
  for (const [file, code] of [['src/main.ts', mainCode], ['src/preview/components.ts', prevCode], ['src/domains/components.ts', levCode]] as const) {
    const own = /'btnl-(list|row|btn)'|BUTTON_SIZES\s*[:=]/.exec(code);
    ok(!own, `${file} draws no button specimen of its own${own ? ` — it carries "${own[0]}": the specimen belongs in preview/sections/button-layout.ts` : ''}`);
  }
  // Each chip is handed its write from the page's table, and the table names each setter; the slider calls its own.
  for (const [key, setter] of [['buttonIcons', 'setButtonIcons'], ['buttonContentSize', 'setButtonContentSize'], ['buttonLabelWeight', 'setButtonLabelWeight']] as const) {
    ok(new RegExp(`\\b${key}\\s*:\\s*\\([^)]*\\)\\s*=>\\s*${setter}\\(`).test(levCode), `src/domains/components.ts hands the ${key} chips their write, ${setter}()`);
  }
  ok(/BUTTON_OPTION_WRITES\[key\]\(v\)/.test(levCode), 'src/domains/components.ts hands each Button option chip the write from its table (BUTTON_OPTION_WRITES[key](v))');
  ok(/\bsetButtonMinWidth\(v\)/.test(levCode), 'src/domains/components.ts writes the minimum width through setButtonMinWidth()');
  ok(imports(levSrc, 'components.ts').some((i) => i.spec === '../state/button-input'), 'src/domains/components.ts imports its Button option writes from ../state/button-input');
  ok(!imports(mainSrc, 'main.ts').some((i) => i.spec === './state/button-input'), 'src/main.ts no longer imports the Button option writes (S8.2 moved them to the Components page)');
  const generic = /\b(setPath|setModeLever)\(/.exec(levCode);
  ok(!generic, `src/domains/components.ts writes only through state/button-input.ts${generic ? ` — it calls ${generic[1]}() itself` : ''}`);
  // The catalog: no definition, and no projector, in the studio source a web build reads.
  const DEF_SPECS = /(^|\/)components(\/index)?$|engine\/components\/|anatomy-figma$/;
  const catSrc = readFileSync(join(SRC, 'state/component-catalog.ts'), 'utf8');
  for (const [file, src] of [['src/main.ts', mainSrc], ['src/state/component-catalog.ts', catSrc],
    ['src/state/component-catalog-data.ts', readFileSync(join(SRC, 'state/component-catalog-data.ts'), 'utf8')],
    ['src/domains/components.ts', levSrc], ['src/preview/components.ts', prevSrc], ['src/preview/sections/component-sets.ts', setsSrc]] as const) {
    const hit = imports(src, file).filter((i) => DEF_SPECS.test(i.spec));
    ok(hit.length === 0, `${file} imports no component definition or projector at run time${hit.length ? ` — line ${hit[0].line}: '${hit[0].spec}' (the web bundle would carry it)` : ''}`);
  }
  ok(/\bcatalogOf\b/.test(strip(catSrc)) && /export const COMPONENT_CATALOG_DATA\b/.test(readFileSync(join(SRC, 'state/component-catalog-data.ts'), 'utf8')),
    'the catalog module defines catalogOf, and the generated copy exports COMPONENT_CATALOG_DATA');
  const pluginEntry = readFileSync(join(SRC, '../../plugin/src/ui/entry.ts'), 'utf8');
  const order = imports(pluginEntry, 'entry.ts').map((i) => i.spec);
  ok(order.indexOf('./component-catalog') >= 0 && order.indexOf('./component-catalog') < order.indexOf('../../../studio/src/entry'),
    `the plugin's iframe entry provides the catalog before the studio evaluates (imports ${order.join(', ')})`);
}

console.log(`\n${executed - failed}/${executed} repaint-guard assertions passed.`);
if (failed) process.exit(1);
