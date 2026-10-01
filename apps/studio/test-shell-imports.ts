/**
 * The repaint guard (UI redesign, `docs/superpowers/ui-redesign/implementation-plan.md` §3.10, landed in
 * S1.2 with the first shell code).
 *
 *   npx tsx apps/studio/test-shell-imports.ts
 *
 * New shell code repaints by store subscription: a writer calls a setter, and every surface that reads
 * the topic repaints itself (plan §5). It never calls the legacy repaint tiers, which S13 deletes. So
 * every file under `src/shell/`, `src/domains/` and `src/preview/` must not name `apply`, `applyFull`,
 * `build`, `renderBar` or `setVolatile`, and a file that does fails here, naming the file, the line and
 * the name.
 *
 * WHY IT IS INDEPENDENT OF WHAT IT CHECKS (docs/34). The subject is the new source, read from disk. The
 * oracle is the literal list of five names below, written here and never read from `main.ts`, so a tier
 * renamed in `main.ts` cannot shrink the list. The match is on IDENTIFIERS in the parsed source (the
 * TypeScript scanner), not on text, so a comment or a string that mentions `build()` is not a reference,
 * and an import, a call, a callback parameter or a property access spelled with one of the names is. That
 * is stricter than "calls": a shell module handed `build` as a callback would be calling the tier through
 * a door the plan closes, and it fails here the same way.
 *
 * NON-VACUOUS. A scan that found no files, or that cannot see a planted reference, would pass on nothing.
 * So the scan must read the shell's files by name (the frame, the page data, the theme, the DOM
 * helpers, from S1.3 the preview header and Inspect, and from S1.4 the Activity drawer and the Figma menu),
 * and the detector is run first on a fixture that holds each of the five names and must report
 * all five.
 *
 * TWO MORE ARMS, because a name match alone is evadable (orchestrator review of #1922). `(m as any)['build']()`,
 * `globalThis['build']()` and a computed or template key never spell the tier as an identifier, and a module
 * outside the scanned folders can re-export a tier under any name. So:
 *   - an element access whose key is a string or plain template literal naming a tier is a reference too;
 *   - an import (static, `export … from`, or dynamic `import()`) of `src/main.ts`, or of any module under
 *     `src/` that imports it, fails, naming the import. `main.ts` is where the tiers live; a shell module
 *     with no path to it cannot reach them except through a global, and a global access spelled with a
 *     literal key is the first arm. The graph is built from the source on disk, never from a list, so a new
 *     module that starts importing `main.ts` taints itself and every importer the day it does.
 * What still gets past: a key computed at run time (`m[k]` with `k` built from strings) on an object that
 * did not come from a tainted import — a global the page itself put there. Nothing in `main.ts` exports
 * its tiers onto a global today.
 *
 * Mutations this fails by name: add `import { build } from '../main';` to `src/shell/frame.ts` →
 * `src/shell/frame.ts:<line>: references the legacy repaint tier "build"`; add
 * `void import('../main');` → `src/shell/frame.ts:<line>: imports "../main", which reaches src/main.ts`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
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
const LEGACY_TIERS = ['apply', 'applyFull', 'build', 'renderBar', 'setVolatile'] as const;
/** The directories new shell code lives in. `domains/` and `preview/` arrive with the domain slices. */
const NEW_DIRS = ['src/shell', 'src/domains', 'src/preview'];
/** Files the scan must read, so an empty or misdirected scan cannot pass. */
const MUST_SCAN = ['src/shell/frame.ts', 'src/shell/pages.ts', 'src/shell/theme.ts', 'src/shell/dom.ts', 'src/shell/preview.ts',
  // S1.4: the Activity drawer and the Figma menu, which run writes `main.ts` lends and must not reach a tier.
  'src/shell/activity.ts', 'src/shell/figma.ts'];

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

/** Every module specifier `src` imports — static, `export … from`, and dynamic `import()` — with its line. */
const imports = (src: string, file: string): { line: number; spec: string }[] => {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const out: { line: number; spec: string }[] = [];
  const at = (n: ts.Node): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n: ts.Node): void => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
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
const SRC = join(ROOT, 'src');
const MAIN = join(SRC, 'main.ts');
const resolveSpec = (from: string, spec: string): string | null => {
  if (spec === '<computed>') return '<computed>';
  if (!spec.startsWith('.')) return null;   // a package; not this app's source
  const base = join(dirname(from), spec);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
};
const allSrc = walk(SRC);
ok(allSrc.includes(MAIN), 'the import graph read src/main.ts');
const edges = new Map(allSrc.map((f) => [f, imports(readFileSync(f, 'utf8'), f).map((i) => resolveSpec(f, i.spec)).filter((t): t is string => !!t)]));
// Tainted: main.ts, and every module with a path to it. Fixed point over the graph read from disk.
const tainted = new Set<string>([MAIN]);
for (let grew = true; grew;) {
  grew = false;
  for (const [f, ts_] of edges) if (!tainted.has(f) && ts_.some((t) => tainted.has(t))) { tainted.add(f); grew = true; }
}
const importOffenders: string[] = [];
for (const f of files) {
  const rel = relative(ROOT, f).split('\\').join('/');
  for (const i of imports(readFileSync(f, 'utf8'), rel)) {
    const t = resolveSpec(f, i.spec);
    if (t === '<computed>') importOffenders.push(`${rel}:${i.line}: a dynamic import() with a computed specifier, which this guard cannot follow`);
    else if (t && tainted.has(t)) importOffenders.push(`${rel}:${i.line}: imports "${i.spec}", which reaches src/main.ts`);
  }
}
for (const o of importOffenders) ok(false, o);
ok(importOffenders.length === 0, `no file under ${NEW_DIRS.join(', ')} imports src/main.ts or a module that does (${tainted.size} module(s) reach it)`);

console.log(`\n${executed - failed}/${executed} repaint-guard assertions passed.`);
if (failed) process.exit(1);
