/**
 * EMISSION-VERSION GATE (#1141's miss) — if the emission moved, an engine bump is owed and declared.
 *
 *   npx tsx packages/engine/lint-emission-version.ts
 *
 * ── WHAT IT CHECKS ──────────────────────────────────────────────────────────────────────────────
 *
 * CLAUDE.md principle 5: `ENGINE_VERSION` answers *"what code produced this?"* and bumps on any
 * behavior change **including a pure value change**. So a diff that moves a committed artifact and
 * owes no bump has published different bytes under an unchanged answer to that question, and every
 * consumer reading the stamp is told the producer did not move.
 *
 * ── #1807: A PR DECLARES THE BUMP, THE FOLD ASSIGNS IT ─────────────────────────────────────────
 *
 * Since #1807 a PR never edits `ENGINE_VERSION`. It adds a CHANGE NOTE (`packages/engine/changes/
 * <slug>.md`, front matter `engine: patch|minor|major`), and `fold.ts` later turns a batch of notes into
 * one version. So the oracle has TWO routes, and either satisfies a moved emission:
 *
 *   NOTE ROUTE     — the diff ADDS a change note declaring a bump. How every ordinary PR passes.
 *   VERSION ROUTE  — `ENGINE_VERSION` moved strictly forward (the rule below). How a FOLD passes, since
 *                    the fold is the commit that restamps the corpus. Kept verbatim from before #1807.
 *
 * And three arms that exist because the version line now has exactly one writer:
 *
 *   NOTE SHAPE     — every change note at HEAD parses: the exact front matter, a level of patch, minor
 *                    or major, prose, no `*` + `/` (it is folded into a comment), and no line opening with
 *                    a version number AFTER `{{ENGINE_VERSION}}` is substituted (it would read as a
 *                    changelog heading once folded). And the BUMP-CLASS POLICY: `minor` for any behavior
 *                    change; `patch` only when no committed artifact moved, so an added patch note over a
 *                    moved emission fails; `major` refused while ENGINE is 0.x (1.0 is the owner's call).
 *   ONE WRITER     — if `ENGINE_VERSION` or the ENGINE CHANGELOG (the text between this module's header
 *                    and the constant) changed, the diff must be a fold: it deletes at least one change
 *                    note. A change note may be deleted only by a fold, and a pending note (one the base
 *                    already has) may not be edited at all. The changelog may never carry a literal `{{`,
 *                    which is an unsubstituted placeholder. A PR that picks a number, or a merge
 *                    resolution that drops or rewrites someone's pending note, fails here by name.
 *   FOLD INTEGRITY — in a fold, HEAD's version is EXACTLY the next one at the highest level the deleted
 *                    notes declare (one version per fold), the first section under the FOLD MARKER is
 *                    headed by that version, and every deleted note's prose appears in that section.
 *                    Derived here from git's list of deleted notes and a parse of the changelog, with
 *                    this file's own arithmetic — never by calling `fold.ts` (docs/34 shape 2).
 *   RENAME STAMPS  — (#1816) a rename rule's `since` is the other version number a PR used to hand-write.
 *                    A PR writes the quoted placeholder there, and in `test.ts`'s table for it; the fold
 *                    fills it in. Fails a new or moved stamp that names a version no fold assigned, a
 *                    placeholder with no pending note, a placeholder that survives a fold, and a fold
 *                    that fills one with anything but its own version. The parse and the arms live in
 *                    `rename-stamp-audit.ts`, which restates rather than imports `fold-stamps.ts`.
 *
 * The one-writer arm starts at the commit that introduced the FOLD MARKER: at a base without it there
 * is no fold convention to hold a diff to, and the arm says so instead of passing silently.
 *
 * ── THE VERSION ROUTE ───────────────────────────────────────────────────────────────────────────
 *
 * It FAILS iff, between the merge base and HEAD: **an artifact's content changed, no added note
 * declares a bump, AND `ENGINE_VERSION` did
 * not move STRICTLY FORWARD** — did not move at all, or moved BACKWARD (#1271). The gate first asked
 * only whether the two version strings DIFFERED, which passed a backward roll — a bad rebase, or a hand
 * re-stamp to a lower integer during a version cluster — as though it were a legitimate bump: newer bytes
 * published under an older answer to "what code produced this?", which a consumer comparing stamps reads
 * as a rollback. So the comparison is ORDERING, not inequality: HEAD's version must be greater than the
 * base's, and equal-with-a-change or backward-with-a-change both fail here.
 *
 * The converse is NOT a defect and is not checked: `ENGINE_VERSION` may legitimately move without the
 * corpus emission moving (a plugin-side behavior change produces no `out/` diff at all), and the ordering
 * check is CONDITIONAL on a moved emission — a version that moves any direction over an UNCHANGED emission
 * is legal, so the forward-only rule cannot fail a run that emitted nothing new. Only the one direction,
 * over a real emission move, is wrong.
 *
 * ── WHY THIS HAS TO READ GIT, AND WHY EVERY IN-TREE VERSION OF IT IS A TAUTOLOGY ────────────────
 *
 * This is the whole design, and it is `docs/34` shape 1 stated as a construction problem rather than
 * found afterwards. Everything in the tree that carries the engine version is DERIVED from the
 * constant:
 *
 *   · every emitted tree's `$extensions.generator.version` — stamped from `ENGINE_VERSION`
 *   · (until #1807) `schema/token-contract.json`'s `engineVersion` field — likewise. It is gone now,
 *     for this reason among others, and `token-contract.ts --check` refuses a baseline that carries it
 *
 * So a gate comparing any stamp to the constant compares `ENGINE_VERSION` to itself and agrees
 * perfectly at every commit, including the ones this exists to catch. Bump the constant and every
 * stamp follows; forget to bump it and every stamp agrees it was not bumped. **There is no reading
 * inside one commit that can see this** — the two facts the gate needs (*did the bytes move* / *did
 * the version move*) are only distinguishable ACROSS commits.
 *
 * Hence git, and hence the two sides:
 *
 *   SUBJECT: `git diff --name-only <base> HEAD -- <regen's artifact universe>` — did any emitted
 *            file's content move?
 *   ORACLE:  a change note the same diff ADDS, read at HEAD — a file an author wrote with intent, found
 *            by git (#1807); or `ENGINE_VERSION` parsed out of `version.ts` **at the merge base**,
 *            compared against the constant this process imported from the working tree.
 *
 * Neither is computed from the other: one is a set of changed paths, the other is an authored file or
 * a string at two commits. An "ancestor mutation" that could move both in lockstep (`docs/34` shape 17)
 * would have to be the BASE REF itself being wrong — which is why an unresolvable base is a hard
 * failure below and never a quiet pass.
 *
 * ── SCOPE IS IMPORTED, NOT LISTED ───────────────────────────────────────────────────────────────
 *
 * `ENGINE_ARTIFACTS` and `SCHEMA_ARTIFACTS` come from `regen.ts`, the same posture as
 * `lint-us-english.ts`: a new emitted artifact is covered the moment regen writes it, with no second
 * edit here to forget. `out/**` is taken wholesale because that is how regen writes it.
 *
 * ── TWO LIMITS, STATED BECAUSE A READER WILL ASSUME OTHERWISE ───────────────────────────────────
 *
 * 1. IT COMPARES COMMITS, NOT THE WORKING TREE. An uncommitted artifact change with no bump is
 *    invisible here and becomes visible the moment it is committed. That is deliberate — the question
 *    is "what does this PR merge", not "what is on your disk" — but it means a local run can be green
 *    on a tree that CI will fail.
 * 2. A BRAND-INPUT EDIT MOVES THE EMISSION WITHOUT MOVING THE ENGINE. Editing `aurora.design.md`
 *    changes `out/` while no engine code changed, and this gate would still demand a bump. Whether
 *    that is right is a real question and the answer here is empirical rather than argued: across the
 *    last 120 commits on `main` there is **not one** commit that moved a regen artifact without also
 *    moving `ENGINE_VERSION`. The convention this gate enforces is the convention the history already
 *    follows; if a brand-only PR ever wants an exemption, it should be argued then, in the open,
 *    rather than pre-granted here by a carve-out nobody has needed.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_VERSION, satisfiesBump } from './version';
import { ENGINE_ARTIFACTS, SCHEMA_ARTIFACTS } from './regen';
import { PENDING_STAMP, STAMP_PATHS, auditStamps, readStamps, type StampSources } from './rename-stamp-audit';

const here = resolve(fileURLToPath(import.meta.url), '..');
const repo = resolve(here, '../..');

const git = (...args: string[]): { ok: boolean; out: string; err: string } => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
};

const die = (lines: string[]): never => {
  console.error(`\n❌ ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(l);
  process.exit(1);
};

/**
 * Is `to` STRICTLY GREATER than `from` (#1271)? The verdict below asks ordering, not mere inequality —
 * `satisfiesBump(from, to, 'patch')` is true for any patch/minor/major increment and false for equal OR
 * backward. Reused rather than reimplemented so version ordering is stated once (docs/34 shape 8). A
 * version that does not parse as semver is a "cannot run", the same posture the base-version reads above
 * take, never a silent pass — an unparseable version compared with `<` would answer confidently about
 * nonsense.
 */
const isForward = (from: string, to: string): boolean => {
  try {
    return satisfiesBump(from, to, 'patch');
  } catch (e) {
    return die([
      `cannot order ENGINE_VERSION '${from}' -> '${to}' — ${(e as Error).message}. This check CANNOT RUN.`,
      '',
      '  One of the two versions is not `MAJOR.MINOR.PATCH`. The comparison is unanswerable, which is not',
      '  the same as "the version is fine", so this fails rather than passing over it.',
    ]);
  }
};

/** Regen's artifact universe as pathspecs, so the scope cannot drift from what regen writes. */
const SCOPE = [
  'packages/engine/out',
  ...SCHEMA_ARTIFACTS.map((f) => `packages/engine/schema/${f}`),
  ...ENGINE_ARTIFACTS.map((f) => `packages/engine/${f}`),
];

// ---- THE SCOPE FLOOR (review of #1155) ----------------------------------------------------------
//
// IMPORTING THE SCOPE REMOVES ONE ROT AND ADDS ANOTHER, and this is the second one. Deriving `SCOPE`
// from `regen.ts` means a new emitted artifact is covered with no edit here — but it also means an
// EMPTY import degrades this gate silently: `SCHEMA_ARTIFACTS` and `ENGINE_ARTIFACTS` going to `[]`
// leaves `SCOPE` as `['packages/engine/out']`, a narrower surface over which every subsequent run
// still passes and still prints the same success line. **Nothing in the diff and nothing in the
// output would say the gate stopped looking at two thirds of what regen writes.** That is scope
// silence — `docs/34`'s adjacent mode, *"a clean result from a gate that never looked"* — and it is
// exactly the class this sweep exists to close, arriving inside one of the sweep's own gates.
//
// So the promise is named by hand and checked in BOTH directions, the posture `lint-us-english.ts`
// arrived at over #514 / #387 / #807:
//
//   FORWARD  — every promised surface contributes at least one pathspec. An empty import fails here.
//   CONVERSE — every pathspec is claimed by some promised surface. Adding one without a line here
//              fails, rather than widening the scope while the promise list quietly stops describing
//              it. Only the converse makes the list self-maintaining; the forward arm alone can police
//              only the surfaces someone remembered to promise.
//
// A count is deliberately NOT asserted: `SCHEMA_ARTIFACTS` and `ENGINE_ARTIFACTS` are meant to grow,
// and a pinned total would fail on every legitimate addition while proving nothing about coverage.
// Representation is the property; totals are not.
const REQUIRED_SURFACES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'the emitted tree (packages/engine/out)', test: (p) => p === 'packages/engine/out' },
  { label: `the emitted schema artifacts (SCHEMA_ARTIFACTS, from regen.ts)`, test: (p) => p.startsWith('packages/engine/schema/') },
  { label: `the emitted engine artifacts (ENGINE_ARTIFACTS, from regen.ts)`, test: (p) => p.startsWith('packages/engine/') && !p.startsWith('packages/engine/schema/') && p !== 'packages/engine/out' },
];

const unrepresented = REQUIRED_SURFACES.filter((s) => !SCOPE.some((p) => s.test(p)));
if (unrepresented.length)
  die([
    `the gate's SCOPE shrank — ${unrepresented.length} promised surface(s) contribute no pathspec.`,
    ...unrepresented.map((s) => `      ${s.label}`),
    '',
    '  Each is a surface this gate claims to compare. Unrepresented, a pass is silence rather than',
    '  evidence: the run would still succeed, over a narrower set, with an unchanged success line.',
    '',
    '  The usual cause is an import from `regen.ts` resolving empty. If a surface was deliberately',
    '  dropped, remove its line above in the same PR so the decision is visible in the diff.',
  ]);

const unclaimed = SCOPE.filter((p) => !REQUIRED_SURFACES.some((s) => s.test(p)));
if (unclaimed.length)
  die([
    `${unclaimed.length} pathspec(s) in SCOPE are claimed by no promised surface.`,
    ...unclaimed.map((p) => `      ${p}`),
    '',
    '  The scope grew without the promise list growing with it, so the list has quietly stopped',
    '  describing what this gate compares. Add a `REQUIRED_SURFACES` line for it in the same PR.',
  ]);

// ---- the base ref -------------------------------------------------------------------------------
//
// Same ladder and same rules as `lint-materialization-renames.ts`: `GITHUB_BASE_REF` is AUTHORITATIVE
// when set and does not fall through, because falling back to `origin/main` answers confidently about
// a branch that is not this PR's base. Deliberately restated here rather than shared: extracting it
// would edit a shipped gate, which is a second concern for another PR (noted, not done).
const prBase = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;

let baseRef: string | null = null;
let baseVia = 'local ladder';
const tried: string[] = [];
if (prBase) {
  baseVia = 'GITHUB_BASE_REF';
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
  die([
    'no base ref — this check CANNOT RUN, which is not the same as finding no drift.',
    `    tried: ${tried.join(' · ')}`,
    '',
    '  Without a base there is nothing to compare, and reporting clean would say "the version is fine"',
    '  about a diff this gate never saw — `docs/34` shape 9. So it fails instead.',
    '',
    '  In CI: `ci.yml` sets `fetch-depth: 0` for the git-reading gates; if you see this there, that',
    '  setting is missing or was reverted.  Locally: `git fetch origin main`.',
  ]);

const mb = git('merge-base', 'HEAD', baseRef!);
if (!mb.ok || !mb.out.trim())
  die([
    `no merge base between HEAD and ${baseRef} — this check CANNOT RUN.`,
    `    ${mb.err || '(git printed nothing)'}`,
    '',
    '  A shallow clone is the usual cause: the histories are disconnected, so git cannot find a common',
    '  ancestor. `fetch-depth: 0` in CI, `git fetch --unshallow` locally.',
  ]);
const base = mb.out.trim();

// ---- SIDE A: did any artifact's content move? ----------------------------------------------------
const diff = git('diff', '--name-only', base, 'HEAD', '--', ...SCOPE);
if (!diff.ok)
  die([`git diff failed against ${base.slice(0, 8)} — this check CANNOT RUN.`, `    ${diff.err}`]);
const changed = diff.out.split('\n').map((s) => s.trim()).filter(Boolean);

// ---- SIDE B: did ENGINE_VERSION move? ------------------------------------------------------------
//
// Parsed out of the base's `version.ts` and compared against the constant THIS PROCESS IMPORTED. A
// regex that stops matching is a "cannot run", never an "unchanged" — an unreadable base version would
// otherwise read as "the version did not move" and turn the gate into an accusation generator.
const baseSrc = git('show', `${base}:packages/engine/version.ts`);
if (!baseSrc.ok)
  die([`cannot read version.ts at ${base.slice(0, 8)} — this check CANNOT RUN.`, `    ${baseSrc.err}`]);
const m = /ENGINE_VERSION\s*=\s*'([^']+)'/.exec(baseSrc.out);
if (!m)
  die([
    `cannot find ENGINE_VERSION in version.ts at ${base.slice(0, 8)} — this check CANNOT RUN.`,
    '',
    '  The declaration was reworded or moved. Update the pattern in this gate in the same PR; leaving',
    '  it unmatched would make every run report "the version did not move", which is a false FAIL on',
    '  every PR rather than a silent pass — loud, but still wrong.',
  ]);
const baseVersion = m[1];
// FORWARD-ONLY (#1271). The old check was `baseVersion !== ENGINE_VERSION` — mere inequality — so a
// version rolled BACKWARD (a bad rebase, or a hand re-stamp to a lower integer during a version cluster)
// read as "changed" and passed, publishing different bytes under a version that says the producer went
// back in time. The question is ordering: when the emission moved, HEAD's version must be STRICTLY
// GREATER than the base's. `versionMoved` is kept only to word the reporting line; the VERDICT is `forward`.
const forward = isForward(baseVersion, ENGINE_VERSION);
const versionMoved = baseVersion !== ENGINE_VERSION;
const wentBackward = versionMoved && !forward;   // differs AND not strictly greater = a lower stamp
const where = `base ${base.slice(0, 8)} (${baseRef}, via ${baseVia})`;

// ---- CHANGE NOTES (#1807) ------------------------------------------------------------------------
//
// The parser is RESTATED here, not imported from `fold.ts` and not shared with
// `lint-component-surface.ts`: the fold is this arm's subject, and a gate that reads notes through its
// subject's parser agrees with it by construction (docs/34 shape 2). Tiny on purpose.
const NOTES_DIR = 'packages/engine/changes';
const BUMP_LEVELS = ['patch', 'minor', 'major'];
type ParsedNote = { level: string | null; prose: string; problem: string | null };
const parseNote = (src: string): ParsedNote => {
  const m = /^---\nengine:[ \t]*(\S+)[ \t]*\n---\n([\s\S]*)$/.exec(src.replace(/\r\n/g, '\n'));
  if (!m) return { level: null, prose: '', problem: 'the front matter is not exactly `---` / `engine: <level>` / `---`' };
  const prose = m[2].trim();
  if (!BUMP_LEVELS.includes(m[1])) return { level: null, prose, problem: `\`engine: ${m[1]}\` is not one of ${BUMP_LEVELS.join(' | ')} (a change that owes no bump carries no note)` };
  if (!prose) return { level: m[1], prose, problem: 'there is no changelog prose after the front matter' };
  if (prose.replace(/\{\{ENGINE_VERSION\}\}/g, '').includes('{{'))
    return { level: m[1], prose, problem: 'a `{{` other than `{{ENGINE_VERSION}}` — the fold would copy it into version.ts, where a literal `{{` fails ONE WRITER' };
  if (prose.includes('*/')) return { level: m[1], prose, problem: 'the prose contains `*/`, which would close the version.ts comment it is folded into' };
  // Checked AFTER substitution (#1823 review, HIGH): a line opening `{{ENGINE_VERSION}} —` passes a raw
  // check and becomes ` * 0.216.0 — …` once folded, which reads as a changelog heading. Any version works
  // as the stand-in; the question is only whether the line would open with one.
  if (prose.replace(/\{\{ENGINE_VERSION\}\}/g, '9.9.9').split('\n').some((l) => /^\s*\d+\.\d+\.\d+\s*[—:-]/.test(l)))
    return { level: m[1], prose, problem: 'a line opens with a version number (or with `{{ENGINE_VERSION}}`), which reads as a changelog heading once folded — reword it, or give a second entry its own note' };
  return { level: m[1], prose, problem: null };
};
const isNotePath = (p: string): boolean => p.startsWith(`${NOTES_DIR}/`) && p.endsWith('.md') && !p.endsWith('/README.md');

/** `git diff --name-status` between the base and HEAD for the notes directory, by status letter. */
const noteDiff = git('diff', '--name-status', '--no-renames', base, 'HEAD', '--', NOTES_DIR);
if (!noteDiff.ok) die([`git diff failed on ${NOTES_DIR} — this check CANNOT RUN.`, `    ${noteDiff.err}`]);
const noteRows = noteDiff.out.split('\n').map((l) => l.split('\t')).filter((r) => r.length === 2 && isNotePath(r[1]));
const addedNotes = noteRows.filter((r) => r[0] === 'A').map((r) => r[1]);
const deletedNotes = noteRows.filter((r) => r[0] === 'D').map((r) => r[1]);
/** A note present at the base and changed here: another merged PR's declaration, edited (#1823 review). */
const modifiedNotes = noteRows.filter((r) => r[0] !== 'A' && r[0] !== 'D').map((r) => r[1]);

// NOTE SHAPE — every note at HEAD, not only the added ones: a malformed note already pending would
// otherwise stop the next fold, which is the worst moment to find it.
const headNotes = git('ls-tree', '-r', '--name-only', 'HEAD', '--', NOTES_DIR);
if (!headNotes.ok) die([`git ls-tree failed on ${NOTES_DIR} — this check CANNOT RUN.`, `    ${headNotes.err}`]);
const noteProblems: string[] = [];
const parsedAtHead = new Map<string, ParsedNote>();
for (const p of headNotes.out.split('\n').map((s) => s.trim()).filter(isNotePath)) {
  const src = git('show', `HEAD:${p}`);
  if (!src.ok) die([`cannot read ${p} at HEAD — this check CANNOT RUN.`, `    ${src.err}`]);
  const n = parseNote(src.out);
  parsedAtHead.set(p, n);
  if (n.problem) noteProblems.push(`${p}: ${n.problem}`);
  // BUMP-CLASS POLICY (#1807, orchestrator's technical call): MAJOR is refused while ENGINE is 0.x —
  // going 1.0 is an owner decision, not something a note may trigger as a side effect of a fold.
  else if (n.level === 'major' && /^0\./.test(baseVersion))
    noteProblems.push(`${p}: \`engine: major\` while ENGINE_VERSION is ${baseVersion} — going to 1.0 is the owner's decision, not a note's. Declare minor.`);
}
if (noteProblems.length)
  die([
    `NOTE SHAPE — ${noteProblems.length} change note(s) do not parse (#1807).`,
    ...noteProblems.map((p) => `      ${p}`),
    '',
    '  A change note is exactly:',
    '      ---',
    '      engine: minor        # patch | minor | major',
    '      ---',
    '      <the changelog prose, which the fold writes into version.ts>',
    '  The fold refuses a malformed note, so it fails here, at the PR that wrote it.',
  ]);
const bumpNotes = addedNotes.filter((p) => BUMP_LEVELS.includes(parsedAtHead.get(p)?.level ?? ''));

// BUMP-CLASS POLICY, the patch half: `minor` is the class for any behavior change (every one of the 215
// bumps before #1807 was one); `patch` is only for a change that moves NO committed artifact. So an added
// patch note over a moved emission is refused here, by the same diff that says the emission moved.
const patchOverEmission = bumpNotes.filter((p) => parsedAtHead.get(p)!.level === 'patch');
if (changed.length > 0 && patchOverEmission.length && !bumpNotes.some((p) => parsedAtHead.get(p)!.level !== 'patch'))
  die([
    `NOTE SHAPE — ${patchOverEmission.join(', ')} declares \`engine: patch\`, and ${changed.length} committed artifact(s) moved (#1807).`,
    `    ${where}`,
    '',
    '  `patch` is for a change that moves no committed artifact (regen --check clean before and after).',
    '  Anything that moves the emission is a behavior change, and the class for that is `minor`.',
  ]);

// ONE WRITER + FOLD INTEGRITY. The changelog region is everything between the end of this module's
// header docblock and the end of the `ENGINE_VERSION` line — every entry, old or folded, plus the
// constant. The module header itself is policy prose and stays editable by any PR.
const MARKER_PREFIX = ' * ── FOLDED CHANGE NOTES (#1807)';
const changelogRegion = (src: string): string | null => {
  const headerEnd = src.indexOf('*/');
  const k = /^export const ENGINE_VERSION\s*=\s*'[^']*';[^\n]*$/m.exec(src);
  if (headerEnd < 0 || !k) return null;
  return src.slice(headerEnd + 2, k.index + k[0].length);
};
const headVersionSrc = git('show', 'HEAD:packages/engine/version.ts');
if (!headVersionSrc.ok) die([`cannot read version.ts at HEAD — this check CANNOT RUN.`, `    ${headVersionSrc.err}`]);
const headConst = /ENGINE_VERSION\s*=\s*'([^']+)'/.exec(headVersionSrc.out);
const baseRegion = changelogRegion(baseSrc.out);
const headRegion = changelogRegion(headVersionSrc.out);
if (!headConst || baseRegion === null || headRegion === null)
  die([
    'cannot find the ENGINE changelog region (module header `*/` … `export const ENGINE_VERSION`) at the base or HEAD — this check CANNOT RUN.',
    '  The file was restructured. Update `changelogRegion` in this gate in the same PR.',
  ]);
const headVersion = headConst![1];
const regionChanged = baseRegion !== headRegion;
const markerAtBase = baseRegion!.split('\n').some((l) => l.startsWith(MARKER_PREFIX));
const isFold = deletedNotes.length > 0;

/** The exact next version at `level`. Stated here with its own arithmetic; `fold.ts` has its own. */
const exactNext = (from: string, level: string): string => {
  const [a, b, c] = from.split('.').map(Number);
  return level === 'major' ? `${a + 1}.0.0` : level === 'minor' ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`;
};
const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();

let writerLine: string;
if (markerAtBase && modifiedNotes.length)
  die([
    `ONE WRITER — this diff edits ${modifiedNotes.length} pending change note(s) that a merged PR wrote (#1807).`,
    ...modifiedNotes.map((p) => `      ${p}`),
    `    ${where}`,
    '',
    '  A pending note is another PR\'s declared bump, and only the fold consumes it. To add to or correct',
    '  what it says, add a note of your own; the fold writes both under the same version.',
  ]);
if (markerAtBase && headRegion!.includes('{{'))
  die([
    'ONE WRITER — the ENGINE changelog in version.ts carries a literal `{{` (#1807).',
    `    ${where}`,
    '',
    '  `{{ENGINE_VERSION}}` belongs in a change note, where the fold fills it in. In version.ts it means a',
    '  fold wrote a note without substituting it, or a PR pasted a note in by hand. Rerun the fold.',
  ]);
if (!markerAtBase) {
  writerLine = 'not yet in force — the base predates the FOLD MARKER, so this diff introduces the convention';
} else if (!isFold && regionChanged) {
  die([
    `ONE WRITER — this diff edits ${headVersion !== baseVersion ? `ENGINE_VERSION (${baseVersion} → ${headVersion})` : 'the ENGINE changelog in version.ts'} and is not a fold: it deletes no change note (#1807).`,
    `    ${where}`,
    '',
    '  Since #1807 only `fold.ts` writes the constant and the changelog, so no two PRs ever write the same',
    '  line. Revert the edit to version.ts and add `packages/engine/changes/<slug>.md` instead:',
    '      ---',
    '      engine: minor        # patch | minor | major',
    '      ---',
    '      <the changelog prose; write {{ENGINE_VERSION}} where the number goes>',
    '  If you are folding, this diff must also delete the notes it folded. That is what `fold.ts` does.',
  ]);
} else if (deletedNotes.length && !regionChanged) {
  die([
    `ONE WRITER — this diff deletes ${deletedNotes.length} change note(s) and writes no changelog, so it is not a fold (#1807).`,
    ...deletedNotes.map((p) => `      ${p}`),
    `    ${where}`,
    '',
    '  A pending note is another PR\'s declared bump. Only a fold consumes one, by writing its prose into',
    '  version.ts in the same diff. The usual cause is a merge resolution that dropped the file; restore it.',
  ]);
} else if (isFold) {
  const folded = deletedNotes.map((p) => {
    const src = git('show', `${base}:${p}`);
    if (!src.ok) die([`cannot read the deleted note ${p} at the base — this check CANNOT RUN.`, `    ${src.err}`]);
    return { path: p, ...parseNote(src.out) };
  });
  const bad = folded.filter((n) => n.problem);
  if (bad.length) die([`FOLD INTEGRITY — ${bad.length} folded note(s) did not parse at the base.`, ...bad.map((n) => `      ${n.path}: ${n.problem}`)]);
  const top = folded.reduce((hi, n) => (BUMP_LEVELS.indexOf(n.level!) > BUMP_LEVELS.indexOf(hi) ? n.level! : hi), 'patch');
  const want = exactNext(baseVersion, top);
  const fails: string[] = [];
  if (headVersion !== want)
    fails.push(`ENGINE_VERSION is ${headVersion}; ${folded.length} folded note(s) at a highest level of ${top} over ${baseVersion} make it exactly ${want} — one version per fold, no gaps`);
  const lines = headRegion!.split('\n');
  const at = lines.findIndex((l) => l.startsWith(MARKER_PREFIX));
  const HEADER = /^ \* (\d+\.\d+\.\d+) — /;
  const first = at < 0 ? -1 : lines.findIndex((l, i) => i > at && HEADER.test(l));
  if (at < 0) fails.push('the FOLD MARKER is gone from HEAD\'s changelog');
  else if (first < 0 || HEADER.exec(lines[first])![1] !== headVersion)
    fails.push(`the first section under the FOLD MARKER is headed ${first < 0 ? '(nothing)' : HEADER.exec(lines[first])![1]}, not ${headVersion}`);
  else {
    // The section ends at the NEXT FOLD's header, at the first header of ANOTHER version (the first fold
    // is followed by the pre-#1807 entries, whose headers name older versions; #1823 re-review), or at
    // the comment's end. A line naming THIS version never ends it: a note line led by the placeholder
    // becomes exactly that, which is the #1823 HIGH case (NOTE SHAPE refuses it too).
    const FOLD_HEADER = /^ \* \d+\.\d+\.\d+ — folded \d{4}-\d{2}-\d{2} from /;
    let end = lines.findIndex((l, i) => i > first && (FOLD_HEADER.test(l) || (HEADER.test(l) && HEADER.exec(l)![1] !== headVersion) || l.trim() === '*/'));
    if (end < 0) end = lines.length;
    const section = squash(lines.slice(first, end).map((l) => l.replace(/^ \*( |$)/, '')).join('\n'));
    for (const n of folded)
      if (!section.includes(squash(n.prose.replace(/\{\{ENGINE_VERSION\}\}/g, headVersion))))
        fails.push(`${n.path}: its prose is not in the ${headVersion} section — the fold deleted a note and dropped what it said`);
  }
  if (fails.length)
    die([
      `FOLD INTEGRITY — ${fails.length} problem(s) with the fold in this diff (#1807).`,
      ...fails.map((f) => `      ${f}`),
      `    ${where}`,
      '',
      '  Rerun `fold.ts` on a clean tree at origin/main rather than repairing its output by hand.',
    ]);
  writerLine = `a fold — ${folded.length} note(s) consumed at ${top}, ${baseVersion} → ${headVersion}, every note's prose under it`;
} else {
  writerLine = 'no edit to ENGINE_VERSION or its changelog, and no note deleted';
}

// ---- RENAME STAMPS (#1816) -----------------------------------------------------------------------
//
// Read at the base and at HEAD from git, like everything else here: the question is what this diff
// merges. In force from the FOLD MARKER on, with the rest of the one-writer convention.
let stampLine = 'not yet in force — the base predates the FOLD MARKER';
if (markerAtBase) {
  const sourcesAt = (ref: string): StampSources => {
    const read = (path: string): string => {
      const r = git('show', `${ref}:${path}`);
      if (!r.ok) die([`cannot read ${path} at ${ref.slice(0, 8)} — this check CANNOT RUN.`, `    ${r.err}`]);
      return r.out;
    };
    return { renames: read(STAMP_PATHS.renames), collections: read(STAMP_PATHS.collections), tests: read(STAMP_PATHS.tests) };
  };
  const baseSources = sourcesAt(base);
  const headSources = sourcesAt('HEAD');
  const atBase = readStamps(baseSources);
  const atHead = readStamps(headSources);
  const unread = [...atBase.problems.map((p) => `base: ${p}`), ...atHead.problems.map((p) => `HEAD: ${p}`)];
  if (unread.length)
    die([
      `RENAME STAMPS — the rename stamps could not be read, so this check CANNOT RUN (#1816).`,
      ...unread.map((p) => `      ${p}`),
      '',
      '  The reader is `rename-stamp-audit.ts`. A stamp it cannot read is one it cannot check, which is not a pass.',
    ]);
  const problems = auditStamps({
    base: atBase.stamps,
    head: atHead.stamps,
    headSources,
    isFold,
    baseVersion,
    headVersion,
    notePending: [...parsedAtHead.values()].some((n) => n.level !== null && n.problem === null),
  });
  if (problems.length)
    die([
      `RENAME STAMPS — ${problems.length} problem(s) with a rename rule's \`since\` (#1816).`,
      ...problems.map((p) => `      ${p}`),
      `    ${where}`,
      '',
      '  A PR that adds or changes a rename rule writes its `since` as the quoted placeholder, in the rule and in',
      '  test.ts\'s table for it, and carries a change note. The fold writes the version. CONTRIBUTING.md §2.',
    ]);
  const pendingNow = atHead.stamps.filter((st) => st.since === PENDING_STAMP).length;
  stampLine = `${atHead.stamps.length} read at HEAD, ${pendingNow} pending the fold${isFold ? ` (this fold filled ${atBase.stamps.filter((st) => st.since === PENDING_STAMP).length} with ${headVersion})` : ''}`;
}

// ---- the verdict ---------------------------------------------------------------------------------
if (changed.length > 0 && !forward && !bumpNotes.length) {
  const show = changed.slice(0, 12);
  die([
    wentBackward
      ? `the emission moved, no added change note declares a bump, and ENGINE_VERSION rolled BACKWARD — ${baseVersion} → ${ENGINE_VERSION}, over ${changed.length} changed artifact(s).`
      : `the emission moved and no bump is declared — ${changed.length} artifact(s) changed, no change note added, ENGINE_VERSION still ${ENGINE_VERSION}.`,
    `    ${where}`,
    '',
    ...show.map((f) => `      ${f}`),
    ...(changed.length > show.length ? [`      … and ${changed.length - show.length} more`] : []),
    '',
    '  Different bytes are being published with no bump owed to them, so the next fold would stamp them',
    '  under an answer to "what code produced this?" that says nothing moved.',
    '',
    '  Add a change note, `packages/engine/changes/<slug>.md` (#1807). Do NOT edit ENGINE_VERSION:',
    '      ---',
    '      engine: minor        # patch | minor | major',
    '      ---',
    '      <the changelog prose; the fold writes it into version.ts under the version it assigns>',
    '  If you believe this emission change genuinely does not warrant a bump, that is a decision worth',
    '  arguing in the PR rather than working around here — see this gate\'s header, limit 2.',
  ]);
}

console.log(`Emission-version gate — ${where}`);
console.log(`  scope: ${SCOPE.length} pathspec(s) imported from regen.ts — all ${REQUIRED_SURFACES.length} promised surfaces represented, both directions`);
console.log(`  ENGINE_VERSION: ${baseVersion} -> ${ENGINE_VERSION}${forward ? ' (moved forward)' : versionMoved ? ' (moved BACKWARD)' : ' (unchanged)'}`);
console.log(`  change notes: ${addedNotes.length} added (${bumpNotes.length} declaring a bump), ${deletedNotes.length} deleted, ${parsedAtHead.size} at HEAD — all parse`);
console.log(`  one writer: ${writerLine}`);
console.log(`  rename stamps: ${stampLine}`);
console.log(`  artifacts changed vs base: ${changed.length}`);
if (changed.length === 0 && !versionMoved)
  console.log('  ✓ clean — nothing emitted moved, so no bump was owed.');
else if (changed.length === 0)
  console.log(`  ✓ clean — the version moved with no emission change, which is legal (see the header)${wentBackward ? ' — even a backward move, since the ordering check only guards a moved emission' : ''}.`);
else if (bumpNotes.length)
  console.log(`  ✓ clean — ${changed.length} artifact(s) moved and an added change note declares the bump (${bumpNotes.map((p) => `${p.slice(NOTES_DIR.length + 1)}: ${parsedAtHead.get(p)!.level}`).join(', ')}).`);
else
  console.log(`  ✓ clean — ${changed.length} artifact(s) moved and the version moved FORWARD with them.`);
console.log('    Note the limit: this compares COMMITS. An uncommitted artifact change with no bump is');
console.log('    invisible here until it is committed.');
