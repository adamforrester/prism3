/**
 * COMPONENT-SURFACE VERSION GATE (#1252) — a change to what the engine PROJECTS owes an
 * `ENGINE_VERSION` bump, even when committed `out/` is byte-identical.
 *
 *   npx tsx packages/engine/lint-component-surface.ts             # check (both arms)
 *   npx tsx packages/engine/lint-component-surface.ts --accept    # rewrite the baseline (needs the bump)
 *
 * ── THE DECISION THIS ENCODES ───────────────────────────────────────────────────────────────────
 *
 * #1252 settled a question two merged PRs had answered opposite ways on the same shape. #1251
 * (field-label gained a `tone` axis and a third size rung — a Figma set going 4 → 12 members) bumped
 * `ENGINE_VERSION`; #1224 (button's `intent` axis split into `button-destructive` and `button-neutral`,
 * two whole new defs and 864 new projected members) did not. Both were legal, because
 * `lint-emission-version.ts` — the gate that would otherwise settle it — is scoped to `out/`, and
 * COMPONENT PAYLOADS ARE NOT COMMITTED THERE. The plugin builds them at run time from the defs. So the
 * one gate that asks "did the emission move without the version" is structurally blind to the whole
 * component projection, and its silence over a def change is a fact about its scope rather than
 * evidence that behavior held still.
 *
 * The decision: **the ENGINE surface is everything a consumer can observe — the emitted trees AND the
 * projected component surface.** `out/` movement is ONE trigger, not the definition. A designer who
 * gets a new variant axis, or 864 members where there were 432, has met a different engine; principle 5
 * says `ENGINE_VERSION` answers *"what code produced this?"* and bumps on any behavior change, and this
 * is one. #1224 is therefore an under-bump — under a convention that STARTS HERE. It is deliberately
 * not retro-bumped: restamping a merged artifact would assert something that was not true at ship time.
 *
 * ── WHAT THE BASELINE IS, AND WHY IT IS CLEANER THAN `out/` ─────────────────────────────────────
 *
 * `schema/component-surface.json` records, per def in `componentDefs`: the projected MEMBER COUNT and a
 * sha256 over the sorted `planComponentName|planStamp` rows of the default projection.
 *
 * BRAND-INDEPENDENT, and that is a real advantage over the emission this sits beside. `figmaAnatomySet`
 * takes a `ComponentDef` and no theme (`figmaVarName`'s header: a plan is brand-agnostic, which is why
 * seven gates, the studio's member count and the plugin's set enumeration can all call it with a def and
 * nothing else). So this baseline moves when the ENGINE moves and not when a BRAND INPUT moves —
 * whereas `lint-emission-version.ts` states as its limit 2 that editing `aurora.design.md` moves `out/`
 * while no engine code changed, and demands a bump anyway. This arm has no such false trigger.
 *
 * THE DEFAULT PROJECTION ONLY. Two levers are deliberately excluded, and for one reason: both
 * materialize a def BEFORE projection, so folding either in would make the baseline a CROSS PRODUCT of
 * the surface with a caller's choices, and a lever's default flipping would read as a surface change.
 *
 *   · `applyControlShape(def, shape)` — a brand's `controlShape` lever (#1163) rewrites the `radius`
 *     binding key before projection. Under `rounded` it is the identity, which is what makes the
 *     default reproducible here.
 *   · `swapTarget` — `figmaAnatomySet(def, { swapTarget })`, which #513 recorded as a fact about the
 *     FILE rather than about the component: the same def builds in a file whose placeholder icon is
 *     called anything. `lint-paint.ts` passes A name because it is asking what the plugin will build, and
 *     paints do not depend on which name it is; this gate is asking what the DEF projects, so it passes
 *     nothing. The plugin's own nomination is `main.ts`'s `SWAP_TARGET` and is not restated here.
 *
 * A def with no `figmaProperties` projects no set, and its entry is recorded as `null` rather than
 * omitted — the same spelling `paint-census.json` uses for the same state, and for a stronger reason
 * here: a def that GAINS a `figmaProperties` block (or loses one) has moved the surface by exactly the
 * amount that matters, and skipping it would make the two most consequential transitions invisible.
 * `text-field` and `textarea` are the two defs in that state today.
 *
 * NO `engineVersion` FIELD IN THE BASELINE, unlike `token-contract.json` which carries one. That field
 * buys a forced `--accept` on every bump, and here it would buy a false failure instead: a pure VALUE
 * change bumps `ENGINE_VERSION` and moves no component surface, and a version field would make this
 * gate demand a re-accept while reporting that the projection moved. The baseline records the SURFACE
 * and nothing else; the version lives in `version.ts`, where both arms read it.
 *
 * ── `planStamp` IS REUSED, NEVER REIMPLEMENTED (docs/34 shape 8) ────────────────────────────────
 *
 * The per-member hash is `planStamp` from `anatomy-figma.ts` — the shipped function, already asserted
 * in `test-write-components`, and the one `write-components.ts` pairs with `ENGINE_VERSION` to decide
 * whether a built member is stale. A second hash written here would be a SECOND STATEMENT of what a
 * member is, and shape 8 is exactly that failure: a gate written from its subject's mental model. The
 * decisive property is `planStamp`'s completeness — it hashes `JSON.stringify(plan)` wholesale rather
 * than a hand-picked field list, so a plan field added tomorrow moves it with no edit here. A
 * hand-rolled copy would cover whatever its author remembered, and the drift would be silent and in the
 * unsafe direction.
 *
 * That reuse is NOT where this gate's independence comes from, and the distinction matters. Reusing the
 * subject's own hash makes both sides of the comparison speak the same language; what makes the
 * comparison mean something is that the two SIDES are independent — a COMMITTED baseline that only a
 * deliberate `--accept` rewrites, and GIT, which knows what the previous commit said. Neither is
 * derived from the defs this process just read.
 *
 * `planStamp` is deliberately OVER-SENSITIVE, and that is accepted rather than worked around. A plan
 * field no executor reads still moves the stamp, so this gate will sometimes demand a bump for a change
 * no designer sees. It errs safe, and it matches what `lint-emission-version.ts` already does by taking
 * `out/**` wholesale: both would rather over-report a bump than let a real one through.
 *
 * ── THE TWO ARMS, AND WHY BOTH ARE NEEDED ──────────────────────────────────────────────────────
 *
 * ARM A — DRIFT, inside one commit. Recompute the surface from `componentDefs` and compare it against
 * the committed baseline, both directions. This is the arm that catches the #1224 shape as it is
 * actually made: someone edits a def, runs the suite, and pushes. The baseline they did not touch is
 * what disagrees with them.
 *
 * ARM B — VERSION, across commits. `ENGINE_VERSION` at the merge base against the constant this process
 * imported, versus whether the baseline's `defs` moved between the merge base and HEAD. FAIL iff the
 * surface moved and the version did not move STRICTLY FORWARD — unchanged, OR rolled BACKWARD to a lower
 * value than the base carried (#1271). The comparison was `!==` (mere inequality), which passed a
 * backward roll as though it were a bump; a moved surface must land at a version GREATER than the base's,
 * so `--accept` and this arm both ask ordering now, via `isForward`.
 *
 * Arm A alone would leave two reachable holes, which is why arm B is not decoration:
 *
 *   1. THE BASELINE IS HAND-EDITED. `--accept` refuses without the bump; a text editor does not. Arm A
 *      goes green the moment the file agrees with the defs, however it came to agree.
 *   2. THE BUMP IS REVERTED AFTER THE ACCEPT. Accept with the bump, then drop the version line in a
 *      later commit on the same branch. Arm A stays green — the baseline still matches the defs — and
 *      only a reading across commits can see that what merges carries a moved surface at an unmoved
 *      version. Verified by mutation, not argued (see the mutation register below).
 *
 * Arm B compares the PARSED `defs` maps rather than the file bytes, deliberately: rewording the `note`
 * moves the file and moves no surface, and a `git diff --name-only` arm would demand a bump for a
 * typo fix. The subject is the surface, so the surface is what is diffed.
 *
 * ── WHERE THE SIDES COME FROM (docs/34 shape 1, the construction problem) ───────────────────────
 *
 * This is `lint-emission-version.ts`'s design with a different subject, so it inherits that file's
 * central argument: every in-tree copy of the engine version is STAMPED FROM the constant, so any gate
 * comparing a stamp to the constant compares `ENGINE_VERSION` to itself and agrees at every commit
 * including the ones it exists to catch. "The surface moved" and "the version moved" are only
 * distinguishable ACROSS commits. Hence git, and hence:
 *
 *   ARM A  SUBJECT: `figmaAnatomySet` over `componentDefs`, live.
 *          ORACLE:  the committed baseline — authored, `--accept`-only, NEVER a regen artifact.
 *   ARM B  SUBJECT: the baseline's `defs` at the merge base vs at HEAD.
 *          ORACLE:  `ENGINE_VERSION` parsed from `version.ts` at the merge base, vs the imported constant.
 *
 * NEVER A REGEN ARTIFACT — principle 5, and the same reason `token-contract.json` is out of regen. If
 * `regen.ts` rewrote this baseline, then a def losing a member would have the baseline rewritten to
 * agree with the loss and BOTH gates would go green: `regen --check` because the committed copy matches
 * what regen just wrote, and arm A because the baseline matches the defs. A gate allowed to rewrite
 * what it reads has no memory. `--accept` is the only thing that writes this file, and it refuses
 * unless the bump has already happened.
 *
 * ── LIMITS, STATED BECAUSE A READER WILL ASSUME OTHERWISE ───────────────────────────────────────
 *
 * 1. ARM B'S "BEFORE" IS A COMMIT; ITS "AFTER" IS THE WORKING TREE. `lint-emission-version.ts` compares
 *    commit to commit and states as its own limit that an uncommitted change is invisible to it until
 *    committed. This gate reads the baseline off DISK instead, deliberately: it closes that window, so a
 *    hand-edited baseline fails on the run that follows the edit rather than on the run after the
 *    commit. The cost is that a local experiment in the baseline reports a failure before you have
 *    committed anything — which is the intended reading, since `--accept` is the sanctioned way in.
 *    `ENGINE_VERSION` is likewise the IMPORTED constant, so a bump is seen before it is committed too;
 *    both sides of the comparison are therefore consistent about which tree they describe.
 * 2. IT DOES NOT DECIDE WHETHER A SURFACE CHANGE WAS RIGHT. It asserts that a moved surface is
 *    accompanied by a moved version and a read diff. A def change that is a mistake, accepted and
 *    bumped, passes here — `lint-paint.ts`, `lint-axis-values.ts` and the projection gates are what
 *    ask whether the new surface is sound.
 * 3. IT SAYS NOTHING ABOUT THE CODE-SIDE API. `variantAxes` reaching a React prop table is a real
 *    consumer surface and is not projected by `figmaAnatomySet`; what is covered here is the FIGMA
 *    projection, which is the surface #1252 was filed about.
 *
 * ── MUTATION REGISTER (docs/34: a gate that cannot see its subject cannot fail) ─────────────────
 *
 * Each mutation was committed first, applied, measured, then restored with `git checkout -- <file>`:
 *
 *   M1  A def's projected surface moves with no bump — `field-label`'s `tone` axis loses a value, 12
 *       members → 8. This is #1224's shape. ARM A fails BY NAME, naming the def and both numbers.
 *   M2  `ENGINE_VERSION` bumped with no surface change. PASSES — a discretionary bump is legal, the
 *       same asymmetry `lint-emission-version.ts` states ("the version moved with no emission change,
 *       which is legal").
 *   M3  `--accept` with no prior bump. REFUSES, naming the defs that moved and the increment owed.
 *   M4  Accept WITH the bump, commit, then revert the bump. Arm A green, ARM B fails by name — the
 *       hole arm A cannot see (limit above, case 2).
 *   M5  An anatomy change that moves no PAINT — `field-label`'s row gap. `lint-paint.ts` stays green
 *       (its rows are paint assignments only) while this gate's digest moves, which is the measurement
 *       that shows the two baselines are not duplicates of each other.
 *   M6  A surface moved (committed at a forward bump), then ENGINE_VERSION rolled BACKWARD below the base
 *       in the working tree (#1271). Under the old `!==` arm B PASSED — the strings differed, so "the
 *       version moved" read true. With `isForward` it FAILS BY NAME, naming the backward roll and the
 *       moved defs; `--accept` refuses the same backward stamp. The forward case (a real bump) still
 *       passes, and a backward roll over an UNCHANGED surface still passes — the ordering check guards a
 *       moved surface only, so it cannot fail a run that moved nothing (the vacuity guard).
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGINE_VERSION, satisfiesBump } from './version';
import { componentDefs } from './components/index';
import { figmaAnatomySet, planComponentName, planStamp } from './anatomy-figma';
import type { AnatomyPlan } from './anatomy-figma';
import type { ComponentDef } from './component-schema';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../..');

const SURFACE_REL = 'packages/engine/schema/component-surface.json';
const SURFACE_PATH = join(repo, SURFACE_REL);

/** One def's default projection. `null` = the def projects no Figma set (no `figmaProperties`). */
type Surface = { members: number; sha256: string } | null;
type Baseline = { note: string; defs: Record<string, Surface> };

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
 * Is `to` STRICTLY GREATER than `from` (#1271)? Arm B and `--accept` both asked mere inequality
 * (`!==` / `===`), which passed a version rolled BACKWARD as a legitimate bump — a moved surface stamped
 * under a lower version than the base carried. The question is ORDERING: a moved surface must land at a
 * version greater than the base's. `satisfiesBump(from, to, 'patch')` is the shipped strictly-greater
 * predicate (any patch/minor/major increment is true; equal and backward are false), reused rather than
 * reimplemented (docs/34 shape 8). A non-semver version is a "cannot run", the same posture the base-
 * version read takes — never a silent pass over an unanswerable comparison.
 */
const isForward = (from: string, to: string): boolean => {
  try {
    return satisfiesBump(from, to, 'patch');
  } catch (e) {
    return die([
      `cannot order ENGINE_VERSION '${from}' -> '${to}' — ${(e as Error).message}. This gate CANNOT RUN.`,
      '',
      '  One of the two versions is not `MAJOR.MINOR.PATCH`, so "did the version move forward" is',
      '  unanswerable. That is not the same as "the version is fine", so this fails rather than passing.',
    ]);
  }
};

// ---- THE SUBJECT: the default projection, computed live -------------------------------------------
//
// A THROW IS NOT AN ABSENT SURFACE. `figmaAnatomySet` refuses a def whose declared axes project a
// member with no coordinate, and refuses a slot axis it cannot enumerate — both real failures other
// gates already name. Recording those as "projects nothing" would let a def that broke its own
// projection read as one that never had one, which is the difference between a regression and a
// design. So the absent case is decided from the DEF (`figmaProperties` present or not) and a throw is
// fatal here.
const surfaceOf = (def: ComponentDef): Surface => {
  if (!def.figmaProperties) return null;
  let plans: AnatomyPlan[];
  try {
    plans = figmaAnatomySet(def);
  } catch (e) {
    return die([
      `the projector THREW for '${def.id}' — this gate cannot record a surface it cannot compute.`,
      `    ${(e as Error).message}`,
      '',
      '  A def that declares `figmaProperties` and then refuses to project is broken, not unprojected.',
      '  Fix the def; the projection gates (`lint-standalone-floor.ts`, `lint-axis-values.ts`) name the',
      '  usual causes. Recording this as "projects nothing" would make a regression read as a design.',
    ]);
  }
  const rows = plans.map((p) => `${planComponentName(p)}|${planStamp(p)}`).sort();
  return { members: plans.length, sha256: createHash('sha256').update(rows.join('\n')).digest('hex') };
};

const liveDefs = (): Record<string, Surface> => {
  const out: Record<string, Surface> = {};
  for (const def of componentDefs) out[def.id] = surfaceOf(def);
  return out;
};

// ---- SCOPE FLOOR: did it look? --------------------------------------------------------------------
//
// Every arm below is a statement about a set, and every one of them passes vacuously over an empty
// one (docs/34 shape 9). `componentDefs` resolving to `[]` — a bad import, a registry emptied — would
// make arm A compare nothing against nothing. The both-directions check against the baseline catches
// that today only because the baseline is non-empty; that is a property of the current file rather
// than of the gate, so the floor is asserted directly.
const FLOOR_DEFS = 10;
const FLOOR_PROJECTING = 5;

const actual = liveDefs();
const projecting = Object.values(actual).filter(Boolean).length;
if (Object.keys(actual).length < FLOOR_DEFS || projecting < FLOOR_PROJECTING)
  die([
    `only ${Object.keys(actual).length} def(s) reached, ${projecting} of them projecting — expected at least ` +
      `${FLOOR_DEFS} and ${FLOOR_PROJECTING}.`,
    '',
    '  Either the registry genuinely shrank (update the floors in this file, same PR), or the import',
    '  from `components/index.ts` resolved short and this gate is comparing almost nothing against',
    '  almost nothing. A pass over an empty set is not a pass.',
  ]);

const NOTE =
  'AUTHORED BASELINE, never a regen artifact (see lint-component-surface.ts). Rewritten only by an ' +
  'explicit `npx tsx packages/engine/lint-component-surface.ts --accept`, which refuses unless ' +
  'ENGINE_VERSION has already moved — a gate allowed to rewrite what it reads has no memory. Per def: ' +
  'the member count of the DEFAULT Figma projection and a sha256 over its sorted ' +
  '`planComponentName|planStamp` rows. `null` means the def declares no figmaProperties and projects ' +
  'no set. Brand-independent: figmaAnatomySet takes a def and no theme, so this moves when the engine ' +
  'moves and not when a brand input does. It records no engine version of its own on purpose — a pure ' +
  'value change bumps the engine and moves no component surface. A failure here is a CHANGED ' +
  'projection: read the diff, decide whether the change was intended, bump ENGINE_VERSION, then accept.';

const serialize = (b: Baseline): string => `${JSON.stringify(b, null, 2)}\n`;

const readBaseline = (): Baseline | null => {
  try {
    return JSON.parse(readFileSync(SURFACE_PATH, 'utf8')) as Baseline;
  } catch {
    return null;
  }
};

/** Which def ids differ between two `defs` maps, in either direction. The one place "the surface
 *  moved" is decided — arm A's report and arm B's verdict both drive this, so they cannot disagree
 *  about what a move is. */
const movedDefs = (before: Record<string, Surface>, after: Record<string, Surface>): string[] => {
  const ids = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return ids.filter((id) => JSON.stringify(before[id] ?? undefined) !== JSON.stringify(after[id] ?? undefined));
};

// ---- THE BASE REF ---------------------------------------------------------------------------------
//
// Same ladder and same rules as `lint-emission-version.ts` and `lint-materialization-renames.ts`:
// `GITHUB_BASE_REF` is AUTHORITATIVE when set and does NOT fall through, because falling back to
// `origin/main` would answer confidently about a branch that is not this PR's base. Restated here
// rather than shared for the reason that file states — extracting it would edit two shipped gates,
// which is a second concern for another PR.
const resolveBase = (): { base: string; ref: string; via: string } => {
  const prBase = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;
  let ref: string | null = null;
  let via = 'local ladder';
  const tried: string[] = [];
  if (prBase) {
    via = 'GITHUB_BASE_REF';
    const r = git('rev-parse', '--verify', '--quiet', `${prBase}^{commit}`);
    tried.push(`${prBase} (GITHUB_BASE_REF, authoritative) — ${r.ok ? 'resolves' : 'does not resolve'}`);
    if (r.ok) ref = prBase;
  } else {
    for (const cand of ['origin/main', 'main']) {
      const r = git('rev-parse', '--verify', '--quiet', `${cand}^{commit}`);
      tried.push(`${cand} — ${r.ok ? 'resolves' : 'does not resolve'}`);
      if (r.ok) { ref = cand; break; }
    }
  }
  if (!ref)
    die([
      'no base ref — the version arm CANNOT RUN, which is not the same as finding no drift.',
      `    tried: ${tried.join(' · ')}`,
      '',
      '  Without a base there is nothing to compare, so reporting clean would say "the version is fine"',
      '  about a diff this gate never saw — docs/34 shape 9. It fails instead.',
      '',
      '  In CI: `ci.yml` sets `fetch-depth: 0` for the git-reading gates; if you see this there, that',
      '  setting is missing or was reverted. Locally: `git fetch origin main`.',
    ]);
  const mb = git('merge-base', 'HEAD', ref!);
  if (!mb.ok || !mb.out.trim())
    die([
      `no merge base between HEAD and ${ref} — the version arm CANNOT RUN.`,
      `    ${mb.err || '(git printed nothing)'}`,
      '',
      '  A shallow clone is the usual cause: the histories are disconnected, so git cannot find a common',
      '  ancestor. `fetch-depth: 0` in CI, `git fetch --unshallow` locally.',
    ]);
  return { base: mb.out.trim(), ref: ref!, via };
};

/** `ENGINE_VERSION` as of `base`. An unreadable base version is a "cannot run", never an "unchanged" —
 *  read as unchanged it would turn this gate into an accusation generator. */
const baseEngineVersion = (base: string): string => {
  const src = git('show', `${base}:packages/engine/version.ts`);
  if (!src.ok)
    die([`cannot read version.ts at ${base.slice(0, 8)} — the version arm CANNOT RUN.`, `    ${src.err}`]);
  const m = /ENGINE_VERSION\s*=\s*'([^']+)'/.exec(src.out);
  if (!m)
    die([
      `cannot find ENGINE_VERSION in version.ts at ${base.slice(0, 8)} — the version arm CANNOT RUN.`,
      '',
      '  The declaration was reworded or moved. Update the pattern in this gate in the same PR; leaving',
      '  it unmatched would make every run report "the version did not move", which is a false FAIL on',
      '  every PR rather than a silent pass — loud, but still wrong.',
    ]);
  return m[1];
};

/** The baseline's `defs` as of `base`. `null` = the file did not exist there, which happens exactly
 *  once (the commit that introduces it) and is reported rather than treated as an empty surface. */
const baseDefs = (base: string): Record<string, Surface> | null => {
  const src = git('show', `${base}:${SURFACE_REL}`);
  if (!src.ok) return null;
  try {
    return (JSON.parse(src.out) as Baseline).defs;
  } catch (e) {
    return die([
      `the baseline at ${base.slice(0, 8)} does not parse — the version arm CANNOT RUN.`,
      `    ${(e as Error).message}`,
      '',
      '  An unparseable baseline at the base makes "did the surface move" unanswerable. It is not the',
      '  same as an unmoved surface, so this fails rather than passing over it.',
    ]);
  }
};

// ---- --accept -------------------------------------------------------------------------------------
const doAccept = (): void => {
  const committed = readBaseline();
  const next: Baseline = { note: NOTE, defs: actual };

  if (!committed) {
    writeFileSync(SURFACE_PATH, serialize(next));
    console.log(`Component-surface baseline WRITTEN for the first time — ${SURFACE_REL}`);
    for (const [id, s] of Object.entries(actual))
      console.log(`  ${id.padEnd(18)} ${s ? `${String(s.members).padStart(4)} members  ${s.sha256.slice(0, 12)}…` : '   — no Figma set'}`);
    console.log('\n✓ accepted. No bump required: there was no prior surface to move.');
    return;
  }

  const moved = movedDefs(committed.defs, actual);
  if (!moved.length) {
    writeFileSync(SURFACE_PATH, serialize(next));
    console.log('✓ accepted — no surface change (the committed baseline already agreed), so no bump was owed.');
    return;
  }

  // THE BUMP IS CHECKED AGAINST THE MERGE BASE, not against a version field in the baseline. The
  // question `--accept` has to answer is the one arm B will ask at merge time — "did ENGINE_VERSION
  // move relative to the base this lands on" — and asking it the same way means a run that accepts
  // cannot produce a tree the gate then rejects. A baseline-recorded version would also demand a
  // SECOND bump for a second accept inside one PR, which is friction with no defect behind it.
  const { base, ref, via } = resolveBase();
  const before = baseEngineVersion(base);
  // FORWARD-ONLY (#1271): the accept is refused unless ENGINE_VERSION is STRICTLY GREATER than the base's,
  // not merely different. `before === ENGINE_VERSION` alone let a BACKWARD stamp through — a surface moved
  // and re-accepted at a version LOWER than the base carried — which arm B would then have to catch at
  // merge. Refusing it here keeps the accept and the check asking the same ordering question.
  if (!isForward(before, ENGINE_VERSION)) {
    const backward = before !== ENGINE_VERSION;
    console.error(`\n❌ ${moved.length} def(s) moved their projected surface and ENGINE_VERSION ${backward ? `rolled BACKWARD (${before} → ${ENGINE_VERSION})` : `is still ${ENGINE_VERSION}`}.`);
    console.error(`    base ${base.slice(0, 8)} (${ref}, via ${via})`);
    console.error('');
    for (const id of moved) {
      const b = committed.defs[id] ?? null;
      const a = actual[id] ?? null;
      console.error(`      ${id.padEnd(18)} ${b ? `${b.members} members` : 'no set'} → ${a ? `${a.members} members` : 'no set'}` +
        `${b && a && b.members === a.members ? '  (same count, different plans)' : ''}`);
    }
    console.error('');
    console.error('  This is the #1252 convention: the ENGINE surface is everything a consumer can observe,');
    console.error('  and the projected component surface is part of it — a designer meeting a new axis or a');
    console.error('  larger variant set has met a different engine, whether or not `out/` moved.');
    console.error('');
    console.error('  Raise ENGINE_VERSION in packages/engine/version.ts (a MINOR when the surface grows or');
    console.error('  shrinks), state the reason in its docblock, then re-run --accept.');
    process.exit(1);
  }

  writeFileSync(SURFACE_PATH, serialize(next));
  console.log(`Component-surface baseline accepted at ENGINE_VERSION ${before} → ${ENGINE_VERSION} — ${moved.length} def(s) moved:`);
  for (const id of moved) {
    const b = committed.defs[id] ?? null;
    const a = actual[id] ?? null;
    console.log(`  ${id.padEnd(18)} ${b ? `${b.members} members` : 'no set'} → ${a ? `${a.members} members` : 'no set'}`);
  }
  console.log('\n✓ accepted');
};

// ---- the check ------------------------------------------------------------------------------------
const doCheck = (): void => {
  const fails: string[] = [];
  const committed = readBaseline();

  console.log(`Component-surface version gate (#1252) — ${Object.keys(actual).length} def(s), ${projecting} projecting`);

  if (!committed)
    die([
      `no baseline at ${SURFACE_REL} — this gate has nothing to compare against.`,
      '',
      '  Run `npx tsx packages/engine/lint-component-surface.ts --accept` to write one. An absent',
      '  baseline is not a clean surface; it is a gate with no memory.',
    ]);

  // ── ARM A: DRIFT, both directions ──────────────────────────────────────────────────────────────
  // Both directions, so a def that DISAPPEARS from the registry is a failure rather than a quietly
  // smaller run — the shape `lint-paint.ts`'s census arm states, and the one that makes a deleted def
  // as visible as a changed one.
  for (const id of Object.keys(committed!.defs))
    if (!(id in actual))
      fails.push(`surface/${id}: in the baseline and no longer in \`componentDefs\` — a def that stopped existing is a surface change, not a smaller census`);
  for (const id of Object.keys(actual))
    if (!(id in committed!.defs))
      fails.push(`surface/${id}: projects a surface and is absent from the baseline — a NEW def is a surface change (this is #1224's shape). Bump ENGINE_VERSION, then --accept`);

  for (const id of Object.keys(committed!.defs)) {
    const want = committed!.defs[id];
    if (!(id in actual)) continue;
    const got = actual[id];
    if (!want && !got) { console.log(`  ${id.padEnd(18)} no Figma set … ok`); continue; }
    if (!want || !got) {
      fails.push(`surface/${id}: ${got ? `now projects a set of ${got.members} member(s); the baseline had none` : 'no longer projects a set; the baseline had one'} — a def gaining or losing its \`figmaProperties\` is the largest surface change there is`);
      console.log(`  ${id.padEnd(18)} … DRIFTED`);
      continue;
    }
    const before = fails.length;
    if (got.members !== want.members)
      fails.push(`surface/${id}: ${got.members} projected member(s), baseline ${want.members} — the set ${got.members > want.members ? 'GREW' : 'SHRANK'}`);
    if (got.sha256 !== want.sha256)
      fails.push(`surface/${id}: plan digest ${got.sha256.slice(0, 12)}…, baseline ${want.sha256.slice(0, 12)}…${got.members === want.members ? ' — the same member COUNT, projecting different plans' : ''}`);
    console.log(`  ${id.padEnd(18)} ${String(got.members).padStart(4)} members  ${got.sha256.slice(0, 12)}… ${fails.length === before ? '… ok' : '… DRIFTED'}`);
  }

  // ── ARM B: VERSION, across commits ─────────────────────────────────────────────────────────────
  const { base, ref, via } = resolveBase();
  const beforeVersion = baseEngineVersion(base);
  // FORWARD-ONLY (#1271): the surface moving demands a version STRICTLY GREATER than the base's, not
  // merely different. `beforeVersion !== ENGINE_VERSION` passed a BACKWARD roll — a moved surface stamped
  // under a lower version — as a legitimate bump. `versionMoved` now only words the reporting line.
  const forward = isForward(beforeVersion, ENGINE_VERSION);
  const versionMoved = beforeVersion !== ENGINE_VERSION;
  const wentBackward = versionMoved && !forward;
  const wasDefs = baseDefs(base);
  const movedInDiff = wasDefs ? movedDefs(wasDefs, committed!.defs) : [];

  console.log(`  base ${base.slice(0, 8)} (${ref}, via ${via})`);
  console.log(`  ENGINE_VERSION: ${beforeVersion} -> ${ENGINE_VERSION}${forward ? ' (moved forward)' : versionMoved ? ' (moved BACKWARD)' : ' (unchanged)'}`);
  if (!wasDefs) {
    console.log(`  baseline: INTRODUCED in this diff — no prior surface to compare, so no bump is owed for it`);
  } else {
    console.log(`  baseline: ${movedInDiff.length} def(s) moved vs base`);
  }

  if (movedInDiff.length && !forward) {
    fails.push(
      `version: the baseline in this tree moved ${movedInDiff.length} def(s) vs the base and ENGINE_VERSION ` +
        `${wentBackward ? `rolled BACKWARD (${beforeVersion} → ${ENGINE_VERSION})` : `did not — still ${ENGINE_VERSION}`} at base ${base.slice(0, 8)}. Moved: ${movedInDiff.join(', ')}`,
    );
  }

  if (fails.length) {
    console.error(`\n❌ ${fails.length} failure(s):\n`);
    for (const f of fails) console.error(`  · ${f}`);
    console.error('');
    console.error('  #1252: the ENGINE surface is everything a consumer can observe — the emitted trees AND');
    console.error('  the projected component surface. `out/` movement is ONE trigger, not the definition, and');
    console.error('  component payloads are not committed under `out/` at all (the plugin builds them from the');
    console.error('  defs at run time), which is why `lint-emission-version.ts` cannot see this.');
    console.error('');
    console.error('  A DRIFT failure is a changed projection: read the diff, bump ENGINE_VERSION, then');
    console.error('    npx tsx packages/engine/lint-component-surface.ts --accept');
    console.error('  A VERSION failure means the baseline moved without a FORWARD bump — a hand-edited baseline,');
    console.error('  a bump reverted after the accept, or a version rolled BACKWARD below the base (#1271). The');
    console.error('  version must move strictly forward when the surface moves; `--accept` refuses otherwise, a');
    console.error('  text editor does not, which is the hole these arms exist to close.');
    process.exit(1);
  }

  console.log('\n✓ clean — the projected component surface matches the baseline, and any movement in it');
  console.log('  carried an ENGINE_VERSION bump.');
  console.log('    The limit: the version arm reads its BEFORE from a commit and its AFTER from this tree,');
  console.log('    so it says nothing about a commit that is not an ancestor of the base it resolved.');
};

if (process.argv.includes('--accept')) doAccept();
else doCheck();
