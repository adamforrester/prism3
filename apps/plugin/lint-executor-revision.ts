/**
 * THE EXECUTOR REVISION MOVES WHEN THE EXECUTOR DOES (#1098, #2265).
 *
 * Every member the component executor writes carries `EXECUTOR_REVISION` as its stamp's third field, and
 * the in-place update's dry run reports a member written by an older revision as needing a re-apply. The
 * number is hand-bumped, and a hand-bumped number is forgotten: the dry run would then report a member
 * the executor now writes differently as current, which is the one answer it must not give. This gate
 * fails a PR that changes the executor's code without raising the number.
 *
 * ── WHAT COUNTS AS THE EXECUTOR ──────────────────────────────────────────────────────────────────────
 *
 * `write-components.ts` and every file it reaches through a relative VALUE import, followed
 * transitively and recomputed on both sides of the comparison, so a newly imported helper is covered the
 * day it is imported. `import type` is not followed: a type moves no output. Engine imports
 * (`@prism3/engine/*`) are not followed either; an engine change that moves a plan moves the plan stamp,
 * which is the field built for that. Three files are exempt, each for a reason:
 *
 *   - `persist-figma.ts` supplies the plugin-data namespace and nothing the executor writes onto a node.
 *   - `executor-revision.ts` holds the number. Its own change is the bump, not a change needing one.
 *   - `member-baseline.ts` computes the "as built" record. A change to it changes the record's format,
 *     which carries its own `v` for that reason; it changes nothing on the node.
 *
 * ── WHAT COUNTS AS A CHANGE ──────────────────────────────────────────────────────────────────────────
 *
 * The file re-printed by the TypeScript printer with comments removed. A comment edit or a reformat
 * needs no bump; any change to the code does, including one that happens to move no member's output. The
 * cost of that over-trigger is one dry run reporting re-applies with no field difference; the cost of
 * guessing the other way is a dry run reporting stale members as current.
 *
 * ── THE `from` SIDE IS GIT ───────────────────────────────────────────────────────────────────────────
 *
 * Both the old code and the old number are read from the merge base with `git show`. A missing base ref
 * is a failure, not a pass (`packages/engine/lint-materialization-renames.ts` has the ladder and why).
 * A base with no `executor-revision.ts` reads as revision 0: members stamped then carry no revision.
 *
 * Run: `npx tsx apps/plugin/lint-executor-revision.ts`
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, posix, resolve } from 'node:path';
import ts from 'typescript';

const HERE = dirname(fileURLToPath(import.meta.url));
const repo = resolve(HERE, '..', '..');
const SRC = 'apps/plugin/src';
const ROOT = `${SRC}/write-components.ts`;
const REVISION_FILE = `${SRC}/executor-revision.ts`;
const EXEMPT: Record<string, string> = {
  [`${SRC}/persist-figma.ts`]: 'supplies the plugin-data namespace only',
  [REVISION_FILE]: 'holds the number; its change is the bump',
  [`${SRC}/member-baseline.ts`]: "the as-built record's format carries its own `v`",
};
/** The executor today is three files (write-components, write-styles, provenance). A walk that finds
 *  fewer than two has stopped following imports, and would then pass any change to the files it lost. */
const FLOOR_FILES = 2;

const git = (...args: string[]): { ok: boolean; out: string; err: string } => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
};
const die = (lines: string[]): never => {
  console.error(`\n❌ ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(l);
  process.exit(1);
};

/** The relative value imports of one source, as repo-relative paths. */
const valueImports = (path: string, text: string): string[] => {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const out: string[] = [];
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) && !ts.isExportDeclaration(st)) continue;
    const spec = st.moduleSpecifier;
    if (!spec || !ts.isStringLiteral(spec) || !spec.text.startsWith('.')) continue;
    if (ts.isImportDeclaration(st) && st.importClause?.isTypeOnly) continue;
    if (ts.isExportDeclaration(st) && st.isTypeOnly) continue;
    if (ts.isImportDeclaration(st) && st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings)
      && !st.importClause.name && st.importClause.namedBindings.elements.length > 0
      && st.importClause.namedBindings.elements.every((e) => e.isTypeOnly)) continue;
    const target = posix.normalize(posix.join(posix.dirname(path), spec.text));
    out.push(target.endsWith('.ts') ? target : `${target}.ts`);
  }
  return out;
};

/** The executor's files, walked from `ROOT` over `read`. */
const executorFiles = (read: (p: string) => string | null): string[] => {
  const seen = new Set<string>();
  const queue = [ROOT];
  while (queue.length) {
    const p = queue.shift()!;
    if (seen.has(p)) continue;
    seen.add(p);
    const text = read(p);
    if (text === null) continue;
    for (const q of valueImports(p, text)) if (!seen.has(q)) queue.push(q);
  }
  return [...seen].filter((p) => !(p in EXEMPT)).sort();
};

/** The code with comments and formatting removed. */
const code = (path: string, text: string): string =>
  ts.createPrinter({ removeComments: true }).printFile(ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS));

const revisionOf = (text: string | null): number | null => {
  if (text === null) return 0;
  const m = /export const EXECUTOR_REVISION\s*=\s*(\d+)\s*;/.exec(text);
  return m ? Number(m[1]) : null;
};

// ---- the base ----------------------------------------------------------------------------------------

const prBase = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;
let baseRef: string | null = null;
const tried: string[] = [];
if (prBase) {
  const r = git('rev-parse', '--verify', '--quiet', `${prBase}^{commit}`);
  tried.push(`${prBase} (GITHUB_BASE_REF, authoritative) — ${r.ok ? 'resolves' : 'does not resolve'}`);
  if (r.ok) baseRef = prBase;
} else {
  for (const cand of ['origin/main', 'main']) {
    const r = git('rev-parse', '--verify', '--quiet', `${cand}^{commit}`);
    tried.push(`${cand} — ${r.ok ? 'resolves' : 'does not resolve'}`);
    if (r.ok) { baseRef = cand; break; }
  }
}
if (!baseRef)
  die(['no base ref — this check CANNOT RUN, which is not the same as finding no change.', `    tried: ${tried.join(' · ')}`,
    '  In CI, `ci.yml` sets `fetch-depth: 0`; locally, `git fetch origin main`.']);
const mb = git('merge-base', 'HEAD', baseRef!);
if (!mb.ok || !mb.out.trim())
  die([`no merge base between HEAD and ${baseRef} — this check CANNOT RUN.`, `    ${mb.err || '(git printed nothing)'}`]);
const base = mb.out.trim();

const atBase = (p: string): string | null => {
  const listed = git('ls-tree', '--name-only', base, '--', p);
  if (!listed.ok) die([`could not list ${p} at ${base.slice(0, 8)} — this check CANNOT RUN.`, `    ${listed.err}`]);
  if (!listed.out.trim()) return null;
  const blob = git('show', `${base}:${p}`);
  if (!blob.ok) die([`could not read ${p} at ${base.slice(0, 8)} — this check CANNOT RUN.`, `    ${blob.err}`]);
  return blob.out;
};
const inTree = (p: string): string | null => (existsSync(resolve(repo, p)) ? readFileSync(resolve(repo, p), 'utf8') : null);

// ---- the comparison --------------------------------------------------------------------------------------

const treeFiles = executorFiles(inTree);
const baseFiles = executorFiles(atBase);
if (treeFiles.length < FLOOR_FILES || !treeFiles.includes(ROOT))
  die([`the executor walk found ${treeFiles.length} file(s) (${treeFiles.join(', ')}), below the floor of ${FLOOR_FILES}.`,
    '  A walk that stopped following imports passes any change to the files it lost.']);

const changed: string[] = [];
for (const p of [...new Set([...treeFiles, ...baseFiles])].sort()) {
  const was = atBase(p), now = inTree(p);
  if (was === null || now === null) { changed.push(`${p} (${was === null ? 'added' : 'removed'})`); continue; }
  if (code(p, was) !== code(p, now)) changed.push(p);
}

const wasRev = revisionOf(atBase(REVISION_FILE));
const nowRev = revisionOf(inTree(REVISION_FILE));
if (nowRev === null || wasRev === null)
  die([`could not read EXECUTOR_REVISION from ${REVISION_FILE} (${nowRev === null ? 'tree' : `base ${base.slice(0, 8)}`}).`,
    '  It must read `export const EXECUTOR_REVISION = <integer>;`.']);

console.log(`executor revision (#1098) — ${treeFiles.length} executor file(s): ${treeFiles.map((f) => f.slice(SRC.length + 1)).join(', ')}`);
console.log(`  exempt: ${Object.entries(EXEMPT).map(([f, why]) => `${f.slice(SRC.length + 1)} (${why})`).join('; ')}`);
console.log(`  base ${base.slice(0, 8)} (${baseRef}): revision ${wasRev}, tree: revision ${nowRev}`);
if (changed.length && !(nowRev! > wasRev!))
  die([`the executor's code changed and EXECUTOR_REVISION did not rise (${wasRev} → ${nowRev}).`,
    ...changed.map((c) => `    changed: ${c}`), '',
    `  Raise EXECUTOR_REVISION in ${REVISION_FILE} by one. Members written before this change then read as`,
    '  needing a re-apply in the update dry run, which is what they are.']);
if (nowRev! < wasRev!)
  die([`EXECUTOR_REVISION went down (${wasRev} → ${nowRev}). Members written by revision ${wasRev} would read as newer than the executor.`]);
console.log(changed.length
  ? `✓ the executor's code changed in ${changed.length} file(s) and the revision rose ${wasRev} → ${nowRev}`
  : '✓ the executor\'s code is unchanged since the merge base');
