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
 * day it is imported. `import type` is not followed: a type moves no output. Three files are exempt, each
 * for a reason:
 *
 *   - `persist-figma.ts` supplies the plugin-data namespace and nothing the executor writes onto a node.
 *   - `executor-revision.ts` holds the number. Its own change is the bump, not a change needing one.
 *   - `member-baseline.ts` computes the "as built" record. A change to it changes the record's format,
 *     which carries its own `v` for that reason; it changes nothing on the node.
 *
 * ── THE ENGINE HALF (#4238) ──────────────────────────────────────────────────────────────────────────
 *
 * The executor also runs engine code at write time: `applyNestOverrides`, `resolveNestMember`,
 * `planSetLayout` and the other value names it imports from `@prism3/engine/*`. A change there moves no
 * plan, so the plan stamp does not move; it moves no committed artifact, so no engine gate owes a note.
 * Before #4238 such a change passed every version gate while the member it writes changed. So the walk
 * also reads the engine: from each value name the executor files import, through the package's export
 * map and the facade's re-exports, to the declaring statement, then to every top-level declaration that
 * statement refers to, in its own module and through that module's relative imports. Each declaration
 * reached is compared as code, the same way as the plugin files, and a changed one is named
 * `file#name`. Engine code the executor does not reach is not compared, so most engine PRs owe nothing.
 * An imported name the walk cannot trace fails the gate: a name it cannot see is one whose change it
 * would pass. Two names are exempt: `ENGINE_VERSION` and `planStamp` make up the stamp itself, so a
 * change to either already moves every member's stamp.
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
 * ── A NUMBER ALREADY TAKEN ON MAIN (#2551) ───────────────────────────────────────────────────────────
 *
 * The merge base alone let two PRs land one revision. #2529 and #2548 each raised 11 → 12 and each
 * changed the executor; git merges two identical `12` lines without a conflict; each PR's run compared
 * against a merge base at 11 and passed; and GitHub does not re-run a PR's CI when its base moves. On
 * main's push run the merge base of HEAD and `origin/main` is HEAD itself, so that run compared the tree
 * with its own commit and passed too. Two more comparisons close it:
 *
 *   - **The first parent, whenever HEAD is already on the base branch.** A squash commit on main is
 *     compared with `HEAD^` as well as with HEAD, so a squash that changes the executor without raising
 *     the number above its parent's fails on main's own push run. That is the latest point the clash is
 *     caught, and it always runs. Needs history: `ci.yml`'s `fetch-depth: 0` provides it.
 *   - **Main's current number, on a PR.** In CI on a pull request the base branch is fetched again at
 *     run time, not trusted from the checkout, and a branch that changed the executor must carry a
 *     number above both the merge base's and the base branch's current one. A failed fetch is a failure,
 *     not a fall back to the stale ref. Locally nothing is fetched: the check reads whatever
 *     `origin/main` already says.
 *
 * Neither makes a stale PR run go red after the fact; nothing in a gate can. The PR-time arm narrows the
 * window to the minutes between the run starting and the merge; the parent arm catches the rest on main.
 *
 * ── THE SELF-CHECK ───────────────────────────────────────────────────────────────────────────────────
 *
 * Before the real run, the check is driven over a throwaway repo in `$TMPDIR` (local `file://` git, no
 * network) that replays #2529/#2548: base at 11; A raises to 12 with an executor change and is squashed
 * onto main; B, branched from the old base, also raises to 12 with an executor change. The literal
 * expectations: B's PR check against current main fails as taken; main's check of B's squash fails as
 * not rising against the parent; B at 13 passes both ways; a commit touching nothing executor-related
 * passes. Four more cases cover the engine half (#4238), over a small engine in the same repo: a change
 * to an engine helper the executor reaches two calls deep fails, naming it; the same change with a raised
 * number passes; a comment edit there passes; a change to engine code outside the reach passes. A
 * self-check case that answers wrongly fails the gate before the real run starts.
 *
 * Run: `npx tsx apps/plugin/lint-executor-revision.ts`
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, posix, resolve } from 'node:path';
import ts from 'typescript';
import { mergeGroupBase } from '@prism3/engine/harness';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
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
/** The executor imports 15 runtime engine names today (#4238). A walk that finds fewer than ten has stopped
 *  reading its engine imports, and would then pass any change to the engine code the executor runs. */
const FLOOR_ENGINE_ROOTS = 10;

type Git = (...args: string[]) => { ok: boolean; out: string; err: string };
const gitIn = (repo: string, env?: NodeJS.ProcessEnv): Git => (...args) => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: env ?? process.env });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
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

// ---- the engine half of the executor (#4238) ----------------------------------------------------------------

const ENGINE = 'packages/engine';
/** Engine names the executor imports whose change needs no revision, each for a reason. */
const ENGINE_EXEMPT: Record<string, string> = {
  ENGINE_VERSION: "the stamp's first field; its change is the stamp moving",
  planStamp: "computes the stamp's second field; its change moves every member's stamp",
};

/** The value names one source imports from `@prism3/engine[/sub]`: [specifier, imported name]. */
const engineImports = (path: string, text: string): [string, string][] => {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const out: [string, string][] = [];
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const spec = st.moduleSpecifier.text;
    if (spec !== '@prism3/engine' && !spec.startsWith('@prism3/engine/')) continue;
    const cl = st.importClause;
    if (!cl || cl.isTypeOnly) continue;
    if (cl.name) out.push([spec, 'default']);
    const nb = cl.namedBindings;
    if (nb && ts.isNamespaceImport(nb)) out.push([spec, '*']);
    if (nb && ts.isNamedImports(nb))
      for (const e of nb.elements) if (!e.isTypeOnly) out.push([spec, (e.propertyName ?? e.name).text]);
  }
  return out;
};

/** A relative specifier from `from`, as the file it names (`x.ts`, else `x/index.ts`). */
const relTarget = (from: string, spec: string, read: (p: string) => string | null): string => {
  const base = posix.normalize(posix.join(posix.dirname(from), spec));
  if (base.endsWith('.ts')) return base;
  return read(`${base}.ts`) !== null ? `${base}.ts` : `${base}/index.ts`;
};

interface ModuleIndex {
  /** Top-level value declarations: name → the statement's code. */
  decls: Map<string, ts.Statement>;
  /** Local names bound by a relative value import: local → [file, imported name]. */
  imports: Map<string, [string, string]>;
  /** Exported names re-exported from elsewhere: exported → [file, name] (or a local name, file = self). */
  reexports: Map<string, [string, string]>;
  /** `export * from` targets. */
  stars: string[];
  sf: ts.SourceFile;
}

const indexModule = (path: string, text: string, read: (p: string) => string | null): ModuleIndex => {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const m: ModuleIndex = { decls: new Map(), imports: new Map(), reexports: new Map(), stars: [], sf };
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) {
      if (st.name) m.decls.set(st.name.text, st);
    } else if (ts.isVariableStatement(st)) {
      const names = (b: ts.BindingName): string[] => ts.isIdentifier(b) ? [b.text]
        : b.elements.flatMap((e) => ts.isOmittedExpression(e) ? [] : names(e.name));
      for (const d of st.declarationList.declarations) for (const n of names(d.name)) m.decls.set(n, st);
    } else if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && st.moduleSpecifier.text.startsWith('.')) {
      const cl = st.importClause;
      if (!cl || cl.isTypeOnly) continue;
      const file = relTarget(path, st.moduleSpecifier.text, read);
      if (cl.name) m.imports.set(cl.name.text, [file, 'default']);
      const nb = cl.namedBindings;
      if (nb && ts.isNamespaceImport(nb)) m.imports.set(nb.name.text, [file, '*']);
      if (nb && ts.isNamedImports(nb))
        for (const e of nb.elements) if (!e.isTypeOnly) m.imports.set(e.name.text, [file, (e.propertyName ?? e.name).text]);
    } else if (ts.isExportDeclaration(st) && !st.isTypeOnly) {
      const file = st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier) ? relTarget(path, st.moduleSpecifier.text, read) : path;
      if (!st.exportClause) { if (file !== path) m.stars.push(file); continue; }
      if (ts.isNamedExports(st.exportClause))
        for (const e of st.exportClause.elements) if (!e.isTypeOnly) m.reexports.set(e.name.text, [file, (e.propertyName ?? e.name).text]);
    }
  }
  return m;
};

/** The identifiers a statement's code refers to: every identifier outside a type position, less property names. */
const referenced = (node: ts.Node): Set<string> => {
  const out = new Set<string>();
  const visit = (n: ts.Node) => {
    if (ts.isTypeNode(n) || ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) return;
    if (ts.isPropertyAccessExpression(n)) { visit(n.expression); return; }
    if (ts.isIdentifier(n)) out.add(n.text);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return out;
};

/**
 * The engine code the executor runs: every top-level value declaration reachable from the names the executor
 * files import from `@prism3/engine`, following each declaration's references through its own module and that
 * module's relative imports. Keyed `file#name`, valued by the declaration's code with comments removed.
 * `unresolved` lists imported names the walk could not trace to a declaration: a name it cannot see is a name
 * whose change it would pass.
 */
const engineReach = (files: string[], read: (p: string) => string | null): { code: Map<string, string>; roots: string[]; unresolved: string[] } => {
  const pkg = read(`${ENGINE}/package.json`);
  const exportsMap: Record<string, string> = pkg ? (JSON.parse(pkg).exports ?? {}) : {};
  const modules = new Map<string, ModuleIndex | null>();
  const mod = (p: string): ModuleIndex | null => {
    if (!modules.has(p)) { const t = read(p); modules.set(p, t === null ? null : indexModule(p, t, read)); }
    return modules.get(p)!;
  };
  const code = new Map<string, string>();
  const printer = ts.createPrinter({ removeComments: true });
  /** Resolves `name` as seen from `file`; returns false if it names nothing there. */
  const visit = (file: string, name: string, seen: Set<string>): boolean => {
    const key = `${file}#${name}`;
    if (seen.has(key)) return true;
    seen.add(key);
    const m = mod(file);
    if (!m) return false;
    if (name === '*') { // a namespace import: everything the module declares or exports
      for (const n of [...m.decls.keys(), ...m.reexports.keys()]) visit(file, n, seen);
      return true;
    }
    const st = m.decls.get(name);
    if (st) {
      code.set(key, printer.printNode(ts.EmitHint.Unspecified, st, m.sf));
      for (const id of referenced(st)) if (id !== name && (m.decls.has(id) || m.imports.has(id))) visit(file, id, seen);
      return true;
    }
    const imp = m.imports.get(name);
    if (imp) return visit(imp[0], imp[1], seen);
    const re = m.reexports.get(name);
    if (re) return re[0] === file && re[1] === name ? false : visit(re[0], re[1], seen);
    for (const s of m.stars) if (visit(s, name, new Set(seen))) return visit(s, name, seen);
    return false;
  };
  const seen = new Set<string>();
  const roots: string[] = [];
  const unresolved: string[] = [];
  for (const f of files) {
    const t = read(f);
    if (t === null) continue;
    for (const [spec, name] of engineImports(f, t)) {
      if (name in ENGINE_EXEMPT) continue;
      const sub = spec === '@prism3/engine' ? '.' : `./${spec.slice('@prism3/engine/'.length)}`;
      const target = exportsMap[sub];
      const entry = target ? posix.normalize(posix.join(ENGINE, target)) : null;
      roots.push(`${spec}:${name}`);
      if (!entry || !visit(entry, name, seen)) unresolved.push(`${name} from '${spec}' (imported by ${f})`);
    }
  }
  return { code, roots: [...new Set(roots)].sort(), unresolved };
};

const revisionOf = (text: string | null): number | null => {
  if (text === null) return 0;
  const m = /export const EXECUTOR_REVISION\s*=\s*(\d+)\s*;/.exec(text);
  return m ? Number(m[1]) : null;
};

/** Thrown for a failure; the first line is the gate's named assertion. */
class Fail extends Error { constructor(readonly lines: string[]) { super(lines[0]); } }
const fail = (lines: string[]): never => { throw new Fail(lines); };

interface Options {
  /** The working tree to check. */
  repo: string;
  /** The PR's base branch (`GITHUB_BASE_REF`), or null outside a pull request. */
  prBase: string | null;
  /** Fetch the PR's base branch from `origin` before reading it — on in CI on a pull request. */
  refresh: boolean;
  /** The environment the merge-queue rung reads (#4106): `GITHUB_EVENT_NAME` and `MERGE_GROUP_BASE_SHA`. */
  env?: NodeJS.ProcessEnv;
  git?: Git;
  /** The floor on runtime engine imports; the self-check's small executor imports fewer than the real one. */
  engineFloor?: number;
}

/** One run of the check. Returns its log lines; throws `Fail` with the named assertion first. */
const check = (o: Options): string[] => {
  const git = o.git ?? gitIn(o.repo);
  const log: string[] = [];
  const short = (sha: string) => sha.slice(0, 8);

  // ---- the base ref --------------------------------------------------------------------------------
  const prBase = o.prBase ? `origin/${o.prBase}` : null;
  let baseRef: string | null = null;
  const tried: string[] = [];
  const mg = mergeGroupBase(git, o.env ?? {});
  if (mg) {
    // A merge-queue run (#4106): the group's parent commit, authoritative (`packages/engine/comparison-base.ts`).
    // A group ahead that raised the revision is in that parent, so this PR's raise is read against it.
    tried.push(mg.tried);
    baseRef = mg.ref;
  } else if (prBase) {
    if (o.refresh) {
      // #2551: the checkout's `origin/<base>` is as old as the run's start; a PR that landed since holds
      // a number this branch may also claim. Fetched again here, and a failed fetch does not fall back.
      const f = git('fetch', '--no-tags', '--quiet', 'origin', `+refs/heads/${o.prBase}:refs/remotes/${prBase}`);
      if (!f.ok)
        fail([`could not refresh ${prBase} from origin — this check CANNOT RUN against the current base.`,
          `    ${f.err || '(git printed nothing)'}`,
          '  The stale ref is not a fallback: a revision taken on main since the checkout would read as free.']);
      log.push(`  refreshed ${prBase} from origin at run time (#2551)`);
    }
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
    fail(['no base ref — this check CANNOT RUN, which is not the same as finding no change.', `    tried: ${tried.join(' · ')}`,
      '  In CI, `ci.yml` sets `fetch-depth: 0`; locally, `git fetch origin main`.']);
  const mb = git('merge-base', 'HEAD', baseRef!);
  if (!mb.ok || !mb.out.trim())
    fail([`no merge base between HEAD and ${baseRef} — this check CANNOT RUN.`, `    ${mb.err || '(git printed nothing)'}`]);
  const mergeBase = mb.out.trim();
  const head = git('rev-parse', 'HEAD').out.trim();
  const baseTip = git('rev-parse', `${baseRef}^{commit}`).out.trim();
  // HEAD already on the base branch (main's push run, or a checkout of main): the merge base is HEAD, and
  // comparing against it alone compares a squash commit with itself (#2551).
  const onBase = mergeBase === head;

  const readAt = (rev: string) => (p: string): string | null => {
    const listed = git('ls-tree', '--name-only', rev, '--', p);
    if (!listed.ok) fail([`could not list ${p} at ${short(rev)} — this check CANNOT RUN.`, `    ${listed.err}`]);
    if (!listed.out.trim()) return null;
    const blob = git('show', `${rev}:${p}`);
    if (!blob.ok) fail([`could not read ${p} at ${short(rev)} — this check CANNOT RUN.`, `    ${blob.err}`]);
    return blob.out;
  };
  const inTree = (p: string): string | null =>
    (existsSync(resolve(o.repo, p)) ? readFileSync(resolve(o.repo, p), 'utf8') : null);

  const treeFiles = executorFiles(inTree);
  if (treeFiles.length < FLOOR_FILES || !treeFiles.includes(ROOT))
    fail([`the executor walk found ${treeFiles.length} file(s) (${treeFiles.join(', ')}), below the floor of ${FLOOR_FILES}.`,
      '  A walk that stopped following imports passes any change to the files it lost.']);
  const treeEngine = engineReach(treeFiles, inTree);
  if (treeEngine.unresolved.length)
    fail([`the executor imports ${treeEngine.unresolved.length} engine name(s) the walk cannot trace to a declaration (#4238).`,
      ...treeEngine.unresolved.map((u) => `    unresolved: ${u}`),
      '  A name the walk cannot see is a name whose change it would pass. Teach `engineReach` the form, or exempt the name with a reason.']);
  const engineFloor = o.engineFloor ?? FLOOR_ENGINE_ROOTS;
  if (treeEngine.roots.length < engineFloor)
    fail([`the engine walk found ${treeEngine.roots.length} runtime engine import(s), below the floor of ${engineFloor} (#4238).`,
      '  A walk that stopped reading the executor\'s engine imports passes any change to the engine code it runs.']);
  const nowRev = revisionOf(inTree(REVISION_FILE));
  if (nowRev === null)
    fail([`could not read EXECUTOR_REVISION from ${REVISION_FILE} (tree).`, '  It must read `export const EXECUTOR_REVISION = <integer>;`.']);

  /** The executor files whose code differs between `rev` and the tree. */
  const changedSince = (rev: string): string[] => {
    const at = readAt(rev);
    const out: string[] = [];
    for (const p of [...new Set([...treeFiles, ...executorFiles(at)])].sort()) {
      const was = at(p), now = inTree(p);
      if (was === null && now === null) continue;
      if (was === null || now === null) { out.push(`${p} (${was === null ? 'added' : 'removed'})`); continue; }
      if (code(p, was) !== code(p, now)) out.push(p);
    }
    // The engine code the executor runs (#4238), read at `rev` through `rev`'s own walk and export map.
    const wasEngine = engineReach(executorFiles(at), at).code;
    for (const k of [...new Set([...wasEngine.keys(), ...treeEngine.code.keys()])].sort()) {
      const was = wasEngine.get(k), now = treeEngine.code.get(k);
      if (was === now) continue;
      out.push(`${k} (engine, run by the executor${was === undefined ? '; newly reached' : now === undefined ? '; no longer reached' : ''})`);
    }
    return out;
  };
  const revAt = (rev: string): number => {
    const r = revisionOf(readAt(rev)(REVISION_FILE));
    if (r === null)
      fail([`could not read EXECUTOR_REVISION from ${REVISION_FILE} (${short(rev)}).`, '  It must read `export const EXECUTOR_REVISION = <integer>;`.']);
    return r!;
  };

  log.push(`executor revision (#1098) — ${treeFiles.length} executor file(s): ${treeFiles.map((f) => f.slice(SRC.length + 1)).join(', ')}`);
  log.push(`  engine code it runs (#4238): ${treeEngine.code.size} declaration(s) reached from ${treeEngine.roots.length} import(s); exempt: ${Object.entries(ENGINE_EXEMPT).map(([n, why]) => `${n} (${why})`).join('; ')}`);
  log.push(`  exempt: ${Object.entries(EXEMPT).map(([f, why]) => `${f.slice(SRC.length + 1)} (${why})`).join('; ')}`);

  // ---- the comparisons -----------------------------------------------------------------------------
  // The merge base, always; and the first parent too when HEAD is already on the base branch.
  const bases: { rev: string; label: string }[] = [{ rev: mergeBase, label: `merge base ${short(mergeBase)} (${baseRef})` }];
  if (onBase) {
    const parent = git('rev-parse', '--verify', '--quiet', 'HEAD^1^{commit}');
    if (!parent.ok || !parent.out.trim())
      fail(['HEAD is on the base branch and has no first parent — this check CANNOT RUN.',
        '  On the base branch the merge base is HEAD itself, so the parent is the only base that sees this commit.',
        '  In CI, `ci.yml` sets `fetch-depth: 0`.']);
    const p = parent.out.trim();
    bases.push({ rev: p, label: `first parent ${short(p)} (HEAD is on ${baseRef}, #2551)` });
  }
  let anyChange: string[] = [];
  for (const b of bases) {
    const was = revAt(b.rev);
    const changed = changedSince(b.rev);
    log.push(`  ${b.label}: revision ${was}, tree: revision ${nowRev}${changed.length ? `, ${changed.length} executor file(s) changed` : ''}`);
    if (changed.length && !(nowRev! > was))
      fail([`the executor's code changed and EXECUTOR_REVISION did not rise (${was} → ${nowRev}) against the ${b.label}.`,
        ...changed.map((c) => `    changed: ${c}`), '',
        `  Raise EXECUTOR_REVISION in ${REVISION_FILE} by one. Members written before this change then read as`,
        '  needing a re-apply in the update dry run, which is what they are.',
        ...(b.rev === mergeBase ? [] : ['  On main this means a squash landed a number its parent already held: raise it in a follow-up PR.'])]);
    if (nowRev! < was)
      fail([`EXECUTOR_REVISION went down (${was} → ${nowRev}) against the ${b.label}. Members written by revision ${was} would read as newer than the executor.`]);
    if (b.rev === mergeBase) anyChange = changed;
  }

  // A branch's number against its base branch's current one (#2551). Only off the base branch, and only
  // when this branch changed the executor: a branch that did not needs no number of its own.
  if (!onBase && anyChange.length && baseTip !== mergeBase) {
    const mainRev = revAt(baseTip);
    log.push(`  ${baseRef} now ${short(baseTip)}: revision ${mainRev}`);
    if (!(nowRev! > mainRev)) {
      const by = git('log', '-1', '--format=%h %s', baseTip, '--', REVISION_FILE).out.trim() || '(no commit found)';
      fail([`EXECUTOR_REVISION ${nowRev} is already taken: ${baseRef} reached revision ${mainRev} after this branch left it (#2551).`,
        `    set by: ${by}`,
        ...anyChange.map((c) => `    this branch changed: ${c}`), '',
        `  Merge ${baseRef} into this branch and raise EXECUTOR_REVISION to ${mainRev + 1}. Two changes under one number`,
        '  read as one revision in the update dry run, so a member written by either reads as current to the other.']);
    }
  }
  log.push(anyChange.length || bases.length > 1
    ? `✓ every comparison holds — the revision is ${nowRev}`
    : '✓ the executor\'s code is unchanged since the merge base');
  return log;
};

// ---- the self-check: #2529/#2548 replayed in a throwaway repo (#2551) -------------------------------------

const selfCheck = (): string[] => {
  const work = mkdtempSync(join(tmpdir(), 'p3-exec-rev-'));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
  const g = (dir: string, ...args: string[]): string => {
    const r = gitIn(dir, env)(...args);
    if (!r.ok) throw new Error(`self-check setup: git ${args.join(' ')} failed in ${dir}: ${r.err}`);
    return r.out.trim();
  };
  const put = (dir: string, files: Record<string, string>) => {
    for (const [p, text] of Object.entries(files)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), text); }
  };
  const commit = (dir: string, files: Record<string, string>, msg: string) => { put(dir, files); g(dir, 'add', '-A'); g(dir, 'commit', '-qm', msg); };
  const rev = (n: number) => ({ [REVISION_FILE]: `export const EXECUTOR_REVISION = ${n};\n` });
  const wc = (body: string) => ({ [ROOT]: `import { s } from './write-styles';\nimport { applyNest, type Plan } from '@prism3/engine/components';\nexport const w = (p: Plan) => applyNest(${body});\n` });
  // A small engine (#4238): the executor's import resolves through the export map and a facade re-export to
  // `applyNest`, which calls `bump` in its own module and `step` through a relative import; `planOnly` is
  // engine code the executor never runs.
  const engine = (step: string, extra = '') => ({
    [`${ENGINE}/package.json`]: JSON.stringify({ exports: { './components': './index-components.ts' } }),
    [`${ENGINE}/index-components.ts`]: "export { applyNest, planOnly } from './anatomy-figma';\nexport type { Plan } from './anatomy-figma';\n",
    [`${ENGINE}/anatomy-figma.ts`]: "import { step } from './scale';\nexport type Plan = number;\n"
      + "const bump = (n: number) => step(n);\nexport const applyNest = (n: number) => bump(n);\n"
      + `export const planOnly = (n: number) => n * 3;${extra}\n`,
    [`${ENGINE}/scale.ts`]: `export const step = (n: number) => ${step};\n`,
  });
  const ws = (v: number) => ({ [`${SRC}/write-styles.ts`]: `export const s = ${v};\n` });

  const failures: string[] = [];
  let cases = 0;
  const run = (label: string, o: Options, expect: { fails: string; naming?: string } | 'passes') => {
    cases++;
    let got: string;
    let all = '';
    try { check({ engineFloor: 1, ...o, git: gitIn(o.repo, env) }); got = 'passes'; } catch (e) {
      if (!(e instanceof Fail)) throw e;
      got = e.lines[0];
      all = e.lines.join('\n');
    }
    const ok = expect === 'passes' ? got === 'passes' : got.includes(expect.fails) && (!expect.naming || all.includes(expect.naming));
    if (!ok) failures.push(`${label}: expected ${expect === 'passes' ? 'a pass' : `a failure containing "${expect.fails}"${expect.naming ? ` and naming "${expect.naming}"` : ''}`}, got ${got === 'passes' ? 'a pass' : `"${all}"`}`);
  };

  try {
    const remote = join(work, 'remote.git');
    g(work, 'init', '-q', '--bare', '-b', 'main', remote);
    const up = join(work, 'upstream');
    g(work, 'clone', '-q', `file://${remote}`, up);
    g(up, 'checkout', '-q', '-b', 'main');
    commit(up, { ...wc('s + 1'), ...ws(1), ...rev(11), ...engine('n + 1'), 'README.md': 'base\n' }, 'base at 11');
    g(up, 'push', '-q', 'origin', 'main');
    const base = g(up, 'rev-parse', 'HEAD');

    // B's clone is taken now: its `origin/main` is the old base, as a PR checkout from before A landed.
    const b = join(work, 'b');
    g(work, 'clone', '-q', `file://${remote}`, b);

    // A: 11 → 12 with an executor change, squashed onto main (#2529).
    g(up, 'checkout', '-q', '-b', 'a');
    commit(up, { ...ws(2), ...rev(12) }, 'A: executor change, 11 → 12');
    g(up, 'checkout', '-q', 'main');
    g(up, 'merge', '--squash', '-q', 'a');
    g(up, 'commit', '-qm', 'A squashed (#2529)');
    g(up, 'push', '-q', 'origin', 'main');

    // B: from the old base, also 11 → 12 with an executor change (#2548). Plus B13, the corrected one, and
    // C, which touches nothing the executor reaches.
    g(b, 'checkout', '-q', '-b', 'b');
    commit(b, { ...wc('s + 2'), ...rev(12) }, 'B: executor change, 11 → 12');
    g(b, 'checkout', '-q', '-b', 'b13', base);
    commit(b, { ...wc('s + 2'), ...rev(13) }, 'B: executor change, 11 → 13');
    g(b, 'checkout', '-q', '-b', 'c', base);
    commit(b, { 'README.md': 'docs only\n' }, 'C: docs only');
    // #4238: E changes engine code the executor runs (two imports deep) and does not raise the number; E13
    // raises it; F edits only a comment in that code; G changes engine code the executor never reaches.
    g(b, 'checkout', '-q', '-b', 'e', base);
    commit(b, engine('n + 2'), 'E: engine helper the executor runs, no bump');
    g(b, 'checkout', '-q', '-b', 'e13', base);
    commit(b, { ...engine('n + 2'), ...rev(13) }, 'E: engine helper the executor runs, 11 → 13');
    g(b, 'checkout', '-q', '-b', 'f', base);
    commit(b, engine('/* the next step */ n + 1'), 'F: a comment in the engine helper');
    g(b, 'checkout', '-q', '-b', 'gg', base);
    commit(b, { ...engine('n + 1'), [`${ENGINE}/anatomy-figma.ts`]: engine('n + 1')[`${ENGINE}/anatomy-figma.ts`].replace('n * 3', 'n * 4') }, 'G: engine code outside the reach');

    // (1) B's PR-time check, against main as fetched at run time.
    g(b, 'checkout', '-q', 'b');
    run('(1) B at 12, PR check against current main', { repo: b, prBase: 'main', refresh: true },
      { fails: 'EXECUTOR_REVISION 12 is already taken: origin/main reached revision 12' });
    // (3a) B at 13, the same PR check.
    g(b, 'checkout', '-q', 'b13');
    run('(3a) B at 13, PR check against current main', { repo: b, prBase: 'main', refresh: true }, 'passes');
    // (4a) C, the same PR check: main's number moved and C needs none of its own.
    g(b, 'checkout', '-q', 'c');
    run('(4a) docs-only C, PR check against current main', { repo: b, prBase: 'main', refresh: true }, 'passes');
    g(b, 'checkout', '-q', 'e');
    run('(5) E: engine code the executor runs changed, no bump', { repo: b, prBase: 'main', refresh: true },
      { fails: "the executor's code changed and EXECUTOR_REVISION did not rise (11 → 11)", naming: `${ENGINE}/scale.ts#step (engine, run by the executor)` });
    g(b, 'checkout', '-q', 'e13');
    run('(6) E at 13, PR check against current main', { repo: b, prBase: 'main', refresh: true }, 'passes');
    g(b, 'checkout', '-q', 'f');
    run('(7) F: a comment in engine code the executor runs', { repo: b, prBase: 'main', refresh: true }, 'passes');
    g(b, 'checkout', '-q', 'gg');
    run('(8) G: engine code the executor never reaches', { repo: b, prBase: 'main', refresh: true }, 'passes');

    // Squash B, B13 and C each onto main as it stands after A, and check each as main's push run would.
    const squash = (branch: string, name: string): string => {
      g(up, 'checkout', '-q', '-B', `main-${name}`, 'origin/main');
      g(up, 'fetch', '-q', b, `${branch}:in-${name}`);
      const m = gitIn(up, env)('merge', '--squash', '-q', `in-${name}`);
      if (!m.ok) { // B13's 13 conflicts with main's 12: the author merges main and keeps 13.
        if (name !== 'b13') throw new Error(`self-check setup: squashing ${name} conflicted: ${m.err}`);
        put(up, rev(13));
        g(up, 'add', '-A');
      }
      g(up, 'commit', '-qm', `${name} squashed`);
      const ci = join(work, `ci-${name}`);
      g(work, 'clone', '-q', '--no-local', up, ci);
      g(ci, 'checkout', '-q', `main-${name}`);
      g(ci, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
      return ci;
    };
    // (2) main's push run on B's squash: the merge base is HEAD, the parent already says 12.
    run('(2) B at 12 squashed onto main, push check', { repo: squash('b', 'b'), prBase: null, refresh: false },
      { fails: 'did not rise (12 → 12) against the first parent' });
    // (3b) B at 13 squashed onto main.
    run('(3b) B at 13 squashed onto main, push check', { repo: squash('b13', 'b13'), prBase: null, refresh: false }, 'passes');
    // (4b) C squashed onto main.
    run('(4b) docs-only C squashed onto main, push check', { repo: squash('c', 'c'), prBase: null, refresh: false }, 'passes');
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
  return { failures, cases };
};

// ---- the run -----------------------------------------------------------------------------------------------

const die = (lines: string[]): never => {
  console.error(`\n❌ ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(l);
  process.exit(1);
};

/** Hand-counted, not derived: a self-check that lost a case would otherwise report its smaller count as whole. */
const SELF_CHECK_CASES = 10;
const { failures: selfFails, cases } = selfCheck();
if (cases !== SELF_CHECK_CASES) selfFails.push(`the self-check ran ${cases} case(s), not ${SELF_CHECK_CASES}`);
if (selfFails.length)
  die(['the self-check replaying #2529/#2548 answered wrongly — the gate cannot be trusted on the real tree (#2551).',
    ...selfFails.map((f) => `    ✗ ${f}`)]);
console.log(`self-check (#2551): ${cases}/${cases} cases of the #2529/#2548 replay answered as expected`);

const prBaseEnv = process.env.GITHUB_BASE_REF || null;
try {
  for (const l of check({ repo: REPO, prBase: prBaseEnv, refresh: !!prBaseEnv && process.env.GITHUB_ACTIONS === 'true', env: process.env })) console.log(l);
} catch (e) {
  if (e instanceof Fail) die(e.lines);
  throw e;
}
