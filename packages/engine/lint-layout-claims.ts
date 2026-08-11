/**
 * Prism3 engine — LAYOUT-CLAIM CHECK (#670).
 *
 *   npx tsx packages/engine/lint-layout-claims.ts
 *
 * WHY THIS EXISTS. Three consecutive PRs shipped a document that described the repo incorrectly and
 * no gate saw any of them:
 *
 *   - #651 — `CLAUDE.md`'s layer table still carried bare `web/` and `plugin/` rows after those
 *     directories moved under `apps/`. Four rows describing directories that did not exist.
 *   - #663 — each app's README carried `../Prism3/docs/NN`, correct from two levels down. Deleting
 *     the `Prism3/` segment made it `../docs/NN` = `apps/docs/NN`. Broken — and the PR's own verifier
 *     missed it by resolving every reference from the REPO ROOT, which is true of `../docs/NN` as a
 *     string and false of it as a path.
 *   - #669 — the root `README.md` had no `skills/` row AT ALL, and two files claimed the bundle reads
 *     `Prism3/{engine,schema}`, false since #661.
 *
 * TWO OF THOSE ARE ABSENCES, and that is the whole design constraint. No sweep for wrong strings can
 * find a line that is not there. So this gate runs in both directions:
 *
 *   Direction 1 — every path a doc CLAIMS exists must exist.       (arms A and B below)
 *   Direction 2 — every tracked layer must be REPRESENTED in the   (arm C below)
 *                 documents that promise to describe the repo.
 *
 * Direction 2 is the hard one and the reason the issue was filed. Direction 1 alone would have caught
 * #651 and #663 and missed #669's absent row entirely.
 *
 * RESOLVED AGAINST `git ls-files`, NEVER `existsSync`. Untracked residue makes the filesystem lie:
 * after #669 a stale `Prism3/` survives in local checkouts as `.DS_Store` leftovers, so
 * `existsSync('Prism3')` returns true for a directory no GitHub reader can see — and this gate's whole
 * job is to describe the repo a reader gets. #653 records the measurement: `dead=[]` in the shared
 * checkout, `dead=["web/"]` in a pristine worktree, same commit. The tracked file list is also the
 * INDEPENDENT half of every comparison here: the "exists" side comes from git, the "claimed" side from
 * parsing the document. Two sources, two readers, neither derived from the other (`docs/34`).
 *
 * ── THREE ARMS, because a claim has more than one shape ──────────────────────────────────────────
 *
 * A. RELATIVE REFERENCES (every tracked `.md` minus the exemptions) — resolved from the containing
 *    directory. This is the #663 arm. Only EXPLICITLY relative refs (`../`, `./`) are in scope, and
 *    that restriction is measured rather than stylistic: docs mix conventions freely, writing
 *    root-relative paths in prose (`apps/plugin/README.md` line 5 says `apps/studio/src`, meaning from
 *    the root). Treating every bare path-shaped token as doc-relative reported 109 "unresolved" refs
 *    across 7 documents, essentially all false. An explicitly relative ref is the one form that can
 *    only mean "from HERE", so it is the one form whose depth is checkable — which is exactly the
 *    property #663 broke.
 *
 * B. LAYOUT-REGION CLAIMS (the declared regions in `LAYOUT_REGIONS`) — resolved from the repo root.
 *    This is the #651 arm: a bare `web/` in a layer table is a claim no relative-ref scan can see,
 *    because there is nothing relative about it.
 *
 * C. LAYOUT-REGION REPRESENTATION (the same regions, the converse question) — every subject in
 *    `layoutSubjects()` must appear in every region. This is the #669 arm, the only one that can see
 *    an absence.
 *
 * ── SCOPE IS DECLARED, NOT INFERRED ─────────────────────────────────────────────────────────────
 *
 * A region is a LAYOUT PROMISE when it is a table or tree whose SUBJECT is the repo's own top-level
 * structure — a reader goes to it to learn what the directories are and what lives in them. That is a
 * membership rule, not a list of files someone liked, and the deliberate exclusions matter as much as
 * the inclusions:
 *
 *   - `docs/35` §2 is a PROPOSAL tree, not a promise. It names `Prism3/`, `Tokens/`,
 *     `packages/web-components/`, `packages/react/` and `packages/core/` — five paths that do not
 *     exist — and annotates renames ("was: web"). It records the layout we decided to move toward, and
 *     its own §8 puts part of it out of scope. Gating it would demand a dated decision record be true
 *     today, which destroys the record. Same reason `docs/11` line 201 (`Prism3/reference/`, a
 *     destination for a sample export that never landed) and `docs/12` line 96 (`Prism3/export/`, one
 *     of two candidate homes) are legitimate and must not be flagged: they are forward-looking prose,
 *     not descriptions. Both are BARE paths in body text, so no arm here looks at them at all.
 *   - `docs/09` §1 is a decision tree in prose, not an enumeration of directories.
 *   - A per-workspace README (each app's, each package's) describes ONE workspace's internals. It makes no
 *     top-level enumeration, so Direction 2 has nothing to ask of them. They are fully in arm A's
 *     scope, which is where their real defects were (three of them, found by this gate — see the
 *     progress entry for #670).
 *
 * ── WHAT THIS DELIBERATELY DOES NOT COVER ───────────────────────────────────────────────────────
 *
 * A bare stale path in ordinary prose — `web/src/main.ts` in a sentence — is caught only inside a
 * layout region (arm B). Outside one it is out of scope, and the reason is the 109-false-positive
 * measurement above: to catch it you must treat every path-shaped token as a claim, and then the fix
 * for the noise is narrowing the scan, which is how a gate dies. Recorded as a known limit rather than
 * papered over, because the alternative is a gate nobody can keep green.
 *
 * Refs escaping the repo root are skipped: `CLAUDE.md` explains workspace links by quoting a symlink
 * TARGET (`@prism3/engine` → `../../packages/engine`), which is the content of a link, not a reference
 * from the doc. Nothing outside the repo is ours to assert. Globs and placeholders (`*`, `<id>`, `…`)
 * are skipped for the same reason — a pattern is not a claim about one path.
 *
 * Fenced blocks are excluded from arm A (an `import` inside a code sample is illustrative code, not a
 * reference) and REQUIRED by arm B's tree extractor (the tree IS a fence). Two arms, two readers,
 * on purpose.
 *
 * Dependency-free per repo convention — hand-rolled extractors, same choice as `lint-doc-gates.ts`
 * and `lint-skills.ts`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

/** Files whose GENRE is a record of what paths USED to be. A dated record naming a dead path is
 *  correct prose, not a defect — flagging it would force us to falsify history to go green. Each entry
 *  states why it qualifies; anything added here needs the same sentence. */
const EXEMPT_PREFIXES: { prefix: string; why: string }[] = [
  { prefix: 'docs/00-progress.md', why: 'the append-only history log — every entry describes the layout at the time it was written' },
  { prefix: 'docs/superpowers/', why: 'per-change working notes, explicitly not edited after the PR that added them' },
  { prefix: 'docs/35-naming-and-packaging.md', why: 'the record OF the renames — it quotes before/after path spellings and historical verdicts as its subject matter' },
];

export type RegionSpec = {
  label: string;
  path: string;
  kind: 'table' | 'tree';
  start: RegExp;
  end: RegExp;
};

/** The documents that carry a layout PROMISE, per the membership rule in the header. */
const LAYOUT_REGIONS: RegionSpec[] = [
  { label: 'README.md §Layout', path: 'README.md', kind: 'table', start: /^## Layout\b/, end: /^## / },
  { label: 'CLAUDE.md §What this repo is', path: 'CLAUDE.md', kind: 'table', start: /^## What this repo is\b/, end: /^## / },
  { label: 'docs/09 §3 Repo & package layout', path: 'docs/09-architecture-and-repos.md', kind: 'tree', start: /^## 3\. Repo & package layout\b/, end: /^## / },
];

// ---- THE TRACKED TREE: the independent half of every comparison ---------------------------------

export type Tracked = { files: Set<string>; dirs: Set<string> };

export const trackedFrom = (lines: string[]): Tracked => {
  const files = new Set(lines.filter(Boolean));
  const dirs = new Set<string>();
  for (const f of files) {
    const parts = f.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  }
  return { files, dirs };
};

export const trackedHas = (t: Tracked, p: string): boolean => {
  const q = p.replace(/\/+$/, '');
  // The empty path is the REPO ROOT, which exists by construction. A doc discussing depth writes a bare
  // `../` as a fragment (`docs/34` does), and resolving that from `docs/` lands exactly here — so
  // rejecting it would report the repo root as untracked, a false positive with no possible fix in the doc.
  if (q.length === 0) return true;
  return t.files.has(q) || t.dirs.has(q);
};

/** Direction 2's subject set: what a layout table has to account for. A workspace CONTAINER (`apps/`,
 *  `packages/`) is represented by its members rather than by itself — which is how both tables
 *  actually read, and is stricter, since it demands each member be named. Containers are derived from
 *  `package.json`'s `workspaces` globs, so a new workspace becomes a subject the day it lands instead
 *  of the day someone remembers to add it here. Dot-directories (`.github/`, `.claude/`) are excluded:
 *  they are tooling a reader does not navigate by, and no layout table has ever claimed them. */
export const layoutSubjects = (t: Tracked, workspaceGlobs: string[]): string[] => {
  const containers = new Set(workspaceGlobs.filter((g) => g.endsWith('/*')).map((g) => g.slice(0, -2)));
  const top = new Set<string>();
  for (const f of t.files) {
    const seg = f.split('/')[0];
    if (f.includes('/') && !seg.startsWith('.')) top.add(seg);
  }
  const out = new Set<string>();
  for (const d of top) {
    if (!containers.has(d)) { out.add(`${d}/`); continue; }
    for (const dir of t.dirs) {
      const parts = dir.split('/');
      if (parts.length === 2 && parts[0] === d) out.add(`${dir}/`);
    }
  }
  return [...out].sort();
};

// ---- CLAIM EXTRACTION ---------------------------------------------------------------------------

const CODE_SPAN = /`([^`\n]+)`/g;
const LINK_TARGET = /\]\(([^)\s]+)\)/g;
const PLACEHOLDER = /[*?{}<>…]/;

const tokensIn = (line: string): string[] => [
  ...[...line.matchAll(CODE_SPAN)].map((m) => m[1]),
  ...[...line.matchAll(LINK_TARGET)].map((m) => m[1]),
].map((s) => s.trim());

/** Is this token a path claim we are willing to assert? See the header's "does not cover" note — a
 *  URL, a package name, a glob or a placeholder is not a claim about one path in this repo. */
export const isPathClaim = (tok: string): boolean =>
  tok.includes('/') && !tok.includes('://') && !tok.startsWith('@') && !tok.startsWith('node:') && !PLACEHOLDER.test(tok);

/** Normalize `a/b/../c` etc. without touching the filesystem. Returns null when the path climbs above
 *  the repo root — nothing outside the repo is ours to assert. */
export const resolveWithin = (baseDir: string, ref: string): string | null => {
  const out: string[] = baseDir ? baseDir.split('/') : [];
  for (const seg of ref.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { if (!out.length) return null; out.pop(); continue; }
    out.push(seg);
  }
  return out.join('/');
};

export type Claim = { line: number; ref: string; resolved: string };

/** Strip a Markdown fragment / query from a link target: `./a/README.md#anchor` claims the FILE
 *  `./a/README.md`, and `#anchor` is a position inside it. Resolving the whole token asks git for a
 *  file literally named `README.md#anchor`, which cannot exist — so an anchored link to a real file
 *  reported as untracked, with nothing the doc could do to satisfy it. Found by apps/tokenpress/,
 *  whose docs are the first in this repo to use anchored relative links: 6 refs, all 6 targets
 *  tracked, all 6 flagged. Whether the ANCHOR resolves is deliberately not checked — that needs a
 *  heading slugifier per Markdown renderer, and this gate is about paths. */
export const stripFragment = (ref: string): string => ref.replace(/[#?].*$/, '');

/** ARM A — explicitly relative refs outside fenced blocks. */
export const relativeClaims = (text: string, docDir: string): Claim[] => {
  const out: Claim[] = [];
  let fenced = false;
  text.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) { fenced = !fenced; return; }
    if (fenced) return;
    for (const tok of tokensIn(line)) {
      if (!(tok.startsWith('../') || tok.startsWith('./'))) continue;
      if (!isPathClaim(tok)) continue;
      const path = stripFragment(tok);
      if (!path.includes('/')) continue; // the token was a bare fragment, not a path claim
      const r = resolveWithin(docDir, path);
      // `ref` keeps the anchor so the message quotes what the doc actually wrote.
      if (r !== null) out.push({ line: i + 1, ref: tok, resolved: r });
    }
  });
  return out;
};

export const sliceRegion = (text: string, spec: RegionSpec): string[] => {
  const lines = text.split('\n');
  const from = lines.findIndex((l) => spec.start.test(l));
  if (from < 0) return [];
  const rest = lines.slice(from + 1);
  const to = rest.findIndex((l) => spec.end.test(l));
  return to < 0 ? rest : rest.slice(0, to);
};

/** ARM B/C for a TABLE region — the claim is the FIRST CELL of each data row, and only that.
 *  The first column IS the promise ("this path, this is what it is"); the description column beside it
 *  is prose that legitimately names `superpowers/` and `lint-skills.ts` without their full paths.
 *  #651's defect was bare `web/` and `plugin/` FIRST CELLS, so this is the shape of the claim rather
 *  than an allow-list of where a path may be wrong (`docs/34`, shape 9). */
export const tableClaims = (lines: string[]): Claim[] => {
  const out: Claim[] = [];
  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t.startsWith('|')) return;
    if (/^\|[\s:|-]+\|$/.test(t)) return; // the `|---|---|` separator row
    const firstCell = t.slice(1).split('|')[0];
    if (/^\s*(Path|Layer)\s*$/i.test(firstCell)) return; // header row
    for (const tok of tokensIn(firstCell)) {
      if (!isPathClaim(tok)) continue;
      const r = resolveWithin('', tok);
      if (r !== null) out.push({ line: i + 1, ref: tok, resolved: r });
    }
  });
  return out;
};

/** ARM B/C for a TREE region. The fence's first entry line is the ROOT — it names the containing repo
 *  (`prism3/`), not a path inside it, so it is consumed as the origin and never asserted. The tree
 *  ENDS at the first blank line inside the fence: `docs/09` §3 lists `brand-skills/` and
 *  `knowledge-base/` below one, and those are separate upstream repos rather than claims about this
 *  one. Depth comes from the glyph gutter (`│`/spaces) so nesting resolves to a full path — without
 *  that, `├── engine/` under `packages/` reads as a top-level `engine/` and every member of the tree
 *  looks absent. */
export const treeClaims = (lines: string[]): Claim[] => {
  const out: Claim[] = [];
  let fenced = false;
  let sawRoot = false;
  const stack: { depth: number; name: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      if (fenced) break;
      fenced = true;
      continue;
    }
    if (!fenced) continue;
    if (!line.trim()) { if (sawRoot) break; continue; }
    const m = /^([\s│]*)(?:├──|└──)?\s*([\w.-]+\/)/.exec(line);
    if (!m) continue;
    if (!sawRoot) { sawRoot = true; continue; }
    const depth = m[1].length;
    const name = m[2];
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const full = stack.map((s) => s.name).join('') + name;
    stack.push({ depth, name });
    out.push({ line: i + 1, ref: line.trim(), resolved: full.replace(/\/$/, '') });
  }
  return out;
};

export const regionClaims = (text: string, spec: RegionSpec): Claim[] => {
  const lines = sliceRegion(text, spec);
  return spec.kind === 'table' ? tableClaims(lines) : treeClaims(lines);
};

// ---- THE THREE VERDICT FUNCTIONS — driven by both the self-check and the real run ---------------

/** Arm A/B: which claims name something git does not track. */
export const deadClaims = (t: Tracked, claims: Claim[]): Claim[] => claims.filter((c) => !trackedHas(t, c.resolved));

/** Arm C: which subjects the region never names. Membership is decided HERE, once — by comparing
 *  resolved claim paths, so the tree's nested `engine/` and the table's `packages/engine/` answer the
 *  same question. A count would not: "9 paths verified" is true of a table that lost `skills/` and
 *  gained a duplicate, which is #669 exactly. */
export const unrepresented = (subjects: string[], claims: Claim[]): string[] => {
  const named = new Set(claims.map((c) => c.resolved.replace(/\/+$/, '')));
  return subjects.filter((s) => !named.has(s.replace(/\/+$/, '')));
};

// ---- SELF-CHECK: does it assert the CLASS, and can it fail at all? ------------------------------
// Every fixture drives the functions the real run drives — never a reimplementation (`docs/34`,
// shape 2). Each claim this file makes is tested in BOTH directions: the wrong doc must fail AND the
// right doc must pass, because half of that pair is not a check.
const selfFails: string[] = [];

const FIXTURE_TRACKED = trackedFrom([
  'README.md', 'CLAUDE.md', 'package.json',
  'apps/studio/README.md', 'apps/studio/src/main.ts',
  'apps/plugin/README.md', 'apps/plugin/src/bridge.ts',
  'packages/engine/README.md', 'packages/engine/write-plan.ts', 'packages/engine/schema/theme.json',
  'packages/tokens/README.md',
  'docs/09-architecture-and-repos.md', 'skills/prism3-theme/SKILL.md', 'reference/nb/core.json',
  '.github/workflows/ci.yml',
]);
const FIXTURE_SUBJECTS = layoutSubjects(FIXTURE_TRACKED, ['apps/*', 'packages/*']);

// 1. layoutSubjects: containers expand to members, non-workspace dirs stand alone, dot-dirs excluded.
{
  const want = ['apps/plugin/', 'apps/studio/', 'docs/', 'packages/engine/', 'packages/tokens/', 'reference/', 'skills/'];
  if (JSON.stringify(FIXTURE_SUBJECTS) !== JSON.stringify(want)) {
    selfFails.push(`layoutSubjects is wrong — got ${JSON.stringify(FIXTURE_SUBJECTS)}, wanted ${JSON.stringify(want)}`);
  }
  if (FIXTURE_SUBJECTS.includes('.github/')) selfFails.push('a dot-directory leaked into the Direction-2 subject set');
}

// 2. resolveWithin: the #663 trap, in both directions, plus the escape case.
if (resolveWithin('apps/plugin', '../packages/engine/write-plan.ts') !== 'apps/packages/engine/write-plan.ts') {
  selfFails.push('resolveWithin does not resolve from the containing directory — the exact miss that let #663 ship');
}
if (resolveWithin('apps/plugin', '../../packages/engine/write-plan.ts') !== 'packages/engine/write-plan.ts') {
  selfFails.push('resolveWithin rejects a CORRECT two-level-up reference (false positive)');
}
if (resolveWithin('', '../../packages/engine') !== null) selfFails.push('a ref escaping the repo root is not skipped');

// 3. ARM A — a #663-shaped ref must be flagged BY PATH, and the corrected one must pass.
{
  const bad = relativeClaims('see (`../packages/engine/write-plan.ts`) for the plan\n', 'apps/plugin');
  if (!deadClaims(FIXTURE_TRACKED, bad).some((c) => c.resolved === 'apps/packages/engine/write-plan.ts')) {
    selfFails.push('arm A does not flag a wrong-depth relative reference (the #663 class would ship again)');
  }
  const good = relativeClaims('see (`../../packages/engine/write-plan.ts`) for the plan\n', 'apps/plugin');
  if (deadClaims(FIXTURE_TRACKED, good).length) selfFails.push('arm A flags a CORRECT relative reference (false positive)');
  // A dated record naming a dead path must be representable as prose without failing — the exemption
  // is what makes that true, so assert the exemption predicate itself, not just the scan.
  if (!EXEMPT_PREFIXES.some((e) => 'docs/00-progress.md'.startsWith(e.prefix))) {
    selfFails.push('the history log is not exempt — a dated record naming a dead path would fail');
  }
  if (EXEMPT_PREFIXES.some((e) => 'apps/plugin/README.md'.startsWith(e.prefix))) {
    selfFails.push('a live document matched an exemption prefix — the exemption is too broad');
  }
  // Fenced code must not be read as a reference, and a real ref outside a fence still must be.
  const fencedOnly = relativeClaims('```ts\nimport x from `../../../Prism3/engine/theme`\n```\n', 'docs');
  if (fencedOnly.length) selfFails.push('arm A reads paths out of fenced code samples');
}

// 4. ARM B — a bare stale first cell must be flagged (the #651 class), a correct one must not, and a
//    path in the DESCRIPTION column must not be treated as a claim.
{
  const staleTable = ['| Path | What it is |', '|---|---|', '| `web/` | the dashboard |'];
  if (!deadClaims(FIXTURE_TRACKED, tableClaims(staleTable)).some((c) => c.resolved === 'web')) {
    selfFails.push('arm B does not flag a bare stale first cell (the #651 class would ship again)');
  }
  const liveTable = ['| Path | What it is |', '|---|---|', '| `apps/studio/` | the dashboard |'];
  if (deadClaims(FIXTURE_TRACKED, tableClaims(liveTable)).length) selfFails.push('arm B flags a CORRECT table row (false positive)');
  const proseCell = ['| Path | What it is |', '|---|---|', '| `docs/` | the record, plus `superpowers/` notes |'];
  if (deadClaims(FIXTURE_TRACKED, tableClaims(proseCell)).length) {
    selfFails.push('arm B reads the description column as a claim — prose may name a path without its full path');
  }
}

// 5. ARM B on a TREE — nesting must resolve, the root line must not be asserted, and entries below the
//    tree's blank line (separate upstream repos) must not be either.
{
  const tree = [
    '```',
    'prism3/                  (this repo)',
    '├── packages/',
    '│   ├── engine/          the core',
    '│   └── tokens/          the gate',
    '├── apps/',
    '│   └── studio/          the dashboard',
    '└── docs/                the record',
    '',
    'brand-skills/    own repo — upstream',
    '```',
  ];
  const claims = treeClaims(tree);
  const named = claims.map((c) => c.resolved);
  if (!named.includes('packages/engine')) selfFails.push('the tree extractor loses nesting — `engine/` under `packages/` must resolve to `packages/engine`');
  if (named.includes('prism3')) selfFails.push('the tree extractor asserts the ROOT line, which names the containing repo');
  if (named.includes('brand-skills')) selfFails.push('the tree extractor reads entries below the blank line — those are separate upstream repos');
  if (deadClaims(FIXTURE_TRACKED, claims).length) selfFails.push(`a correct tree produced dead claims (false positive): ${deadClaims(FIXTURE_TRACKED, claims).map((c) => c.resolved).join(', ')}`);
}

// 6. ARM C — THE DIRECTION-2 PROOF. A table that dropped one row must be flagged BY THE MISSING
//    SUBJECT even though every row it still has is perfectly valid. This is the fixture that
//    distinguishes this gate from a direction-1 gate wearing a direction-2 name (#669).
{
  const rows = FIXTURE_SUBJECTS.map((s) => `| \`${s}\` | what it is |`);
  const full = ['| Path | What it is |', '|---|---|', ...rows];
  if (unrepresented(FIXTURE_SUBJECTS, tableClaims(full)).length) {
    selfFails.push('arm C reports a complete table as incomplete (false positive)');
  }
  const withoutSkills = full.filter((l) => !l.includes('skills/'));
  const gaps = unrepresented(FIXTURE_SUBJECTS, tableClaims(withoutSkills));
  if (!gaps.includes('skills/')) {
    selfFails.push('arm C does not notice a DELETED row — this is a direction-1 gate wearing a direction-2 name (#669 would ship again)');
  }
  if (deadClaims(FIXTURE_TRACKED, tableClaims(withoutSkills)).length) {
    selfFails.push('the deleted-row fixture also produced a dead claim — arm C is not being tested in isolation from arm B');
  }
  // And the converse absence: a NEW workspace nobody documented must show up as unrepresented.
  const widened = layoutSubjects(trackedFrom([...FIXTURE_TRACKED.files, 'packages/react/index.ts']), ['apps/*', 'packages/*']);
  if (!unrepresented(widened, tableClaims(full)).includes('packages/react/')) {
    selfFails.push('arm C does not flag a new workspace that no layout region mentions');
  }
}

// 7. trackedHas must answer from the TRACKED list, never the filesystem — the #653 measurement.
if (trackedHas(FIXTURE_TRACKED, 'Prism3')) selfFails.push('trackedHas accepts a path absent from the tracked list');
if (!trackedHas(FIXTURE_TRACKED, 'packages/engine/')) selfFails.push('trackedHas rejects a tracked directory when given a trailing slash');
// The repo root: `docs/34` discusses relative depth by quoting a bare `../`, which resolves from `docs/`
// to the root. Reporting that as untracked is a false positive the doc cannot fix.
if (!trackedHas(FIXTURE_TRACKED, '')) selfFails.push('trackedHas reports the REPO ROOT as untracked — a bare `../` from a top-level directory would fail');
if (deadClaims(FIXTURE_TRACKED, relativeClaims('depth reads as `../` from here\n', 'docs')).length) {
  selfFails.push('arm A flags a bare `../` resolving to the repo root (false positive)');
}

if (selfFails.length) {
  console.error("\n❌ the layout-claim check's own detection is broken — it cannot see what it claims to:\n");
  for (const f of selfFails) console.error(`    ${f}`);
  process.exit(1);
}

// ---- THE REAL RUN -------------------------------------------------------------------------------

const git = (args: string[]): string[] =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);

const tracked = trackedFrom(git(['ls-files']));
const workspaceGlobs: string[] = JSON.parse(readFileSync(resolve(repo, 'package.json'), 'utf8')).workspaces ?? [];
const subjects = layoutSubjects(tracked, workspaceGlobs);

const exemptWhy = (p: string): string | null => EXEMPT_PREFIXES.find((e) => p.startsWith(e.prefix))?.why ?? null;
const markdown = [...tracked.files].filter((f) => f.endsWith('.md')).sort();
const scanned = markdown.filter((f) => !exemptWhy(f));

// ---- SCOPE FLOOR: did it look? ------------------------------------------------------------------
// A silent zero reads as "clean". Assert each promised surface is REPRESENTED, never merely count
// (CLAUDE.md principle 4) — so the regions are checked by name and the corpus gets a floor.
if (subjects.length < 5) {
  console.error(`\n❌ only ${subjects.length} layout subject(s) derived from git — expected at least 5 (apps/*, packages/*, docs, reference, skills).`);
  console.error('    Either the repo genuinely restructured (update this floor in the same PR), or the derivation broke.');
  process.exit(1);
}
if (scanned.length < 20) {
  console.error(`\n❌ only ${scanned.length} markdown file(s) in scope — expected well over 20. The tracked-file read or the exemption list broke.`);
  process.exit(1);
}

let failed = false;

// ARM A — relative references, resolved from each document's own directory.
const armA: { doc: string; claims: Claim[] }[] = [];
let relRefCount = 0;
for (const doc of scanned) {
  const text = readFileSync(resolve(repo, doc), 'utf8');
  const claims = relativeClaims(text, dirname(doc) === '.' ? '' : dirname(doc));
  relRefCount += claims.length;
  const dead = deadClaims(tracked, claims);
  if (dead.length) armA.push({ doc, claims: dead });
}
if (relRefCount < 10) {
  console.error(`\n❌ only ${relRefCount} relative reference(s) found across ${scanned.length} documents — the extractor broke.`);
  process.exit(1);
}

// ARMS B and C — the declared layout regions, both directions.
const armB: { region: string; claims: Claim[] }[] = [];
const armC: { region: string; missing: string[] }[] = [];
for (const spec of LAYOUT_REGIONS) {
  const text = readFileSync(resolve(repo, spec.path), 'utf8');
  const claims = regionClaims(text, spec);
  if (claims.length < 3) {
    console.error(`\n❌ ${spec.label} yielded ${claims.length} path claim(s) — the region moved, was renamed, or the extractor broke.`);
    console.error(`    A region that extracts nothing passes every assertion below it, which is the failure this floor exists to prevent.`);
    process.exit(1);
  }
  const dead = deadClaims(tracked, claims);
  if (dead.length) armB.push({ region: spec.label, claims: dead });
  const missing = unrepresented(subjects, claims);
  if (missing.length) armC.push({ region: spec.label, missing });
}

console.log(`Layout-claim check — ${scanned.length} markdown file(s) in scope (${markdown.length - scanned.length} exempt), ${relRefCount} relative reference(s), ${LAYOUT_REGIONS.length} layout region(s), ${subjects.length} subject(s): ${subjects.join(' ')}`);

if (armA.length) {
  failed = true;
  const n = armA.reduce((a, x) => a + x.claims.length, 0);
  console.error(`\n❌ [ARM A] ${n} relative reference(s) in ${armA.length} document(s) name a path git does not track:\n`);
  for (const { doc, claims } of armA) {
    for (const c of claims) console.error(`    ${doc}:${c.line}  ${c.ref}  →  ${c.resolved}`);
  }
  console.error('\n  Resolved from each document\'s OWN directory, against `git ls-files`. A path-segment');
  console.error('  deletion is not depth-preserving: #663 shipped `../docs/NN` from `apps/*/README.md`,');
  console.error('  which is `apps/docs/NN`. Fix the depth, or the target moved and the doc must follow.');
}
if (armB.length) {
  failed = true;
  console.error(`\n❌ [ARM B] a layout region claims a path git does not track:\n`);
  for (const { region, claims } of armB) {
    for (const c of claims) console.error(`    ${region} (line ${c.line})  ${c.ref}  →  ${c.resolved}`);
  }
  console.error('\n  #651 shipped four such rows — bare `web/` and `plugin/` after the move to `apps/`.');
}
if (armC.length) {
  failed = true;
  console.error(`\n❌ [ARM C] a layout region does not account for every tracked layer:\n`);
  for (const { region, missing } of armC) console.error(`    ${region} never names: ${missing.join(', ')}`);
  console.error('\n  This is the DIRECTION-2 failure and the reason #670 exists: #669 shipped a root README');
  console.error('  with no `skills/` row at all, and no sweep for wrong strings can find a line that is not');
  console.error('  there. Add the row — or, if the directory genuinely should not be described, say so in');
  console.error('  `layoutSubjects` with a reason, never by trimming the region.');
}

if (failed) process.exit(1);
console.log(`  ✓ clean — every claimed path resolves, and all ${LAYOUT_REGIONS.length} layout regions account for all ${subjects.length} tracked layers.`);
