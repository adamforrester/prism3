/**
 * EMISSION-VERSION GATE (#1141's miss) — if the emission moved, `ENGINE_VERSION` moved with it.
 *
 *   npx tsx packages/engine/lint-emission-version.ts
 *
 * ── WHAT IT CHECKS ──────────────────────────────────────────────────────────────────────────────
 *
 * CLAUDE.md principle 5: `ENGINE_VERSION` answers *"what code produced this?"* and bumps on any
 * behavior change **including a pure value change**. So a diff that moves a committed artifact and
 * leaves `ENGINE_VERSION` where it was has published different bytes under an unchanged answer to
 * that question, and every consumer reading the stamp is told the producer did not move.
 *
 * FAIL iff, between the merge base and HEAD: **an artifact's content changed AND `ENGINE_VERSION` did
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
 *   · `schema/token-contract.json`'s `engineVersion` field — likewise
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
 *   ORACLE:  `ENGINE_VERSION` parsed out of `version.ts` **at the merge base**, compared against the
 *            constant this process imported from the working tree.
 *
 * Neither is computed from the other: one is a set of changed paths, the other is a string at two
 * commits. An "ancestor mutation" that could move both in lockstep (`docs/34` shape 17) would have to
 * be the BASE REF itself being wrong — which is why an unresolvable base is a hard failure below and
 * never a quiet pass.
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

// ---- the verdict ---------------------------------------------------------------------------------
const where = `base ${base.slice(0, 8)} (${baseRef}, via ${baseVia})`;

if (changed.length > 0 && !forward) {
  const show = changed.slice(0, 12);
  die([
    wentBackward
      ? `the emission moved and ENGINE_VERSION rolled BACKWARD — ${baseVersion} → ${ENGINE_VERSION}, over ${changed.length} changed artifact(s).`
      : `the emission moved and ENGINE_VERSION did not — ${changed.length} artifact(s) changed at ${ENGINE_VERSION}.`,
    `    ${where}`,
    '',
    ...show.map((f) => `      ${f}`),
    ...(changed.length > show.length ? [`      … and ${changed.length - show.length} more`] : []),
    '',
    wentBackward
      ? '  A lower version publishes newer bytes under an OLDER answer to "what code produced this?" — a'
      : '  Different bytes are being published under an unchanged answer to "what code produced this?".',
    wentBackward
      ? '  consumer comparing stamps would read this build as a rollback of a producer that moved forward.'
      : '  Every consumer reading `$extensions.generator.version` is told the producer did not move.',
    '',
    wentBackward
      ? '  Set `ENGINE_VERSION` in `packages/engine/version.ts` ABOVE the base\'s value and re-run `regen.ts`'
      : '  Bump `ENGINE_VERSION` in `packages/engine/version.ts` and re-run `regen.ts` so the stamp follows.',
    '  If you believe this emission change genuinely does not warrant a bump, that is a decision worth',
    '  arguing in the PR rather than working around here — see this gate\'s header, limit 2.',
  ]);
}

console.log(`Emission-version gate — ${where}`);
console.log(`  scope: ${SCOPE.length} pathspec(s) imported from regen.ts — all ${REQUIRED_SURFACES.length} promised surfaces represented, both directions`);
console.log(`  ENGINE_VERSION: ${baseVersion} -> ${ENGINE_VERSION}${forward ? ' (moved forward)' : versionMoved ? ' (moved BACKWARD)' : ' (unchanged)'}`);
console.log(`  artifacts changed vs base: ${changed.length}`);
if (changed.length === 0 && !versionMoved)
  console.log('  ✓ clean — nothing emitted moved, so no bump was owed.');
else if (changed.length === 0)
  console.log(`  ✓ clean — the version moved with no emission change, which is legal (see the header)${wentBackward ? ' — even a backward move, since the ordering check only guards a moved emission' : ''}.`);
else
  console.log(`  ✓ clean — ${changed.length} artifact(s) moved and the version moved FORWARD with them.`);
console.log('    Note the limit: this compares COMMITS. An uncommitted artifact change with no bump is');
console.log('    invisible here until it is committed.');
