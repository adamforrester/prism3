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
 * So the scan must read the shell's files by name (the frame, the tab data, the theme and the DOM
 * helpers), and the detector is run first on a fixture that holds each of the five names and must report
 * all five.
 *
 * Mutation this fails by name: add `import { build } from '../main';` to `src/shell/frame.ts` →
 * `src/shell/frame.ts:<line>: references the legacy repaint tier "build"`.
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
const MUST_SCAN = ['src/shell/frame.ts', 'src/shell/pages.ts', 'src/shell/theme.ts', 'src/shell/dom.ts'];

/** Every identifier in `src` that names a legacy tier, with its 1-based line. */
const references = (src: string, file: string): { line: number; name: string }[] => {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const hits: { line: number; name: string }[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isIdentifier(n) && (LEGACY_TIERS as readonly string[]).includes(n.text)) {
      hits.push({ line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, name: n.text });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return hits;
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

console.log(`\n${executed - failed}/${executed} repaint-guard assertions passed.`);
if (failed) process.exit(1);
