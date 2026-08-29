/**
 * Prism3 engine — CHECK 1: THE ACCOUNTING IS TOTAL AT THE COMMIT THAT RENAMES (#1039, `docs/44` §5).
 *
 * The forcing function. `MATERIALIZATION_RENAMES` is authored, so nothing makes a rule exist — this is
 * what makes one exist, by refusing the commit that renames without it.
 *
 * It reads the committed emission at the **merge base** and the emission in the **working tree**, and
 * requires the rules to account for every difference: every name that disappeared claimed by exactly
 * one rule, every name that appeared the image of some claimed name, and — the clause that is the
 * whole check — every rule evaluated over the entire before-set rather than only over what moved. The
 * accounting itself lives in `materialization-renames.ts`; this script only sources its two inputs.
 *
 * ── TWO REGISTERS RECORD A RENAME, AND THIS GATE READS BOTH (#1140) ─────────────────────────────
 *
 * "Claimed by a rule" was the whole test until #1140, and it was never the whole truth. A rule covers a
 * MATERIALIZATION move — the collection, the tier, the brand namespace. A CONTRACT rename moves the
 * ROLE, and the role is the tail of every emitted variable name, so `DEPRECATIONS` is an equally
 * authoritative record of a name leaving the emission. This gate now sources those claims too, from
 * `rename-map.ts`'s projection, rooted per brand.
 *
 * **The hole was unreachable until #1140 and would have failed the FIRST honest PR that hit it.** Every
 * contract-visible move between #1039 and #1140 was tier-or-namespace, i.e. already a rule; #1140 moved
 * 113 roles and arrived as 339 unaccounted removals across three brands with nothing wrong — the rename
 * was recorded, in the register the gate did not read. The wrong fix, which reads as the obvious one, is
 * to write a materialization rule for it: that puts two differently-derived records in front of one
 * Figma operation, one of which has a forcing function and one of which is performed by memory. Reading
 * the contract is the fix; the report names which register claimed each removal so the two never blur.
 *
 * ── WHY THE `from` SIDE IS GIT AND MUST STAY GIT ────────────────────────────────────────────────
 *
 * `docs/34` **shape 11** is this design's named risk: a rule stated as "what the emitter now does minus
 * what it used to do", checked against the emitter's output, has one subject under both sides of the
 * comparison and stays green while that subject moves arbitrarily.
 *
 * What keeps this honest is that the `from` side is **names produced by a different revision of the
 * emitter**, read out of git. That is an oracle. Recomputing it from the live emitter would turn it
 * into a mirror — and it would look like a simplification, because it is the same walk with one fewer
 * subprocess. **Do not.** It is #708's finding one layer up: the duplicated walk IS the gate.
 *
 * `regen --check` is the other half and the two compose: regen proves the committed emission matches
 * the emitter that produced it, so the committed tree is a faithful witness rather than a stale copy.
 *
 * ── NO BASE REF IS A FAILURE, NOT A SKIP ────────────────────────────────────────────────────────
 *
 * Two outcomes that look alike and are opposite, and `docs/44` §6.6 says which is which:
 *
 *   - **No rename in this diff** — the normal case, and CLEAN. Nothing moved, the rules claim nothing,
 *     the accounting is total over an empty difference.
 *   - **Cannot find a base ref** — the check could not RUN. It must fail, loudly, by name.
 *
 * A check that quietly downgrades the second into the first reports green over the entire corpus it
 * could not see. That is `docs/34` shape 9 and it is the most likely way this ships broken, because the
 * downgrade reads as robustness. `verify.ts` already treats SKIP as non-green; this must not be able to
 * reach even that state silently, so there is no skip path in this file at all.
 *
 * **This is the first gate in the repo that needs git HISTORY.** Every other git-reading gate uses
 * `git ls-files`, which reads the index and needs none, so `actions/checkout@v4`'s depth-1 default has
 * never mattered before. `ci.yml` gains `fetch-depth: 0` in the same change — without it this gate
 * would pass locally, where history exists, and be unable to run in CI, which is the failure mode where
 * the author sees green for a reason CI does not share.
 *
 * Run: `npx tsx packages/engine/lint-materialization-renames.ts`
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  ACCOUNTING_COLLECTION_MOVES,
  MATERIALIZATION_RENAMES,
  accountFor,
  isTotal,
  keysFromEmittedFile,
  parseVarKey,
  recollectAll,
  varKey,
  type Claim,
  type VarKey,
} from './materialization-renames';
import { deriveVariableRenames } from './rename-map';

const HERE = dirname(fileURLToPath(import.meta.url));
const repo = resolve(HERE, '..', '..');
const FIGMA_DIR = 'packages/engine/out/figma';

/**
 * A FLOOR on the emission the accounting walks (`docs/34` shape 9).
 *
 * Every claim this gate makes is of the form "every name that …", and every one of them is vacuously
 * true of no names. A reader that finds nothing accounts for everything. 2,076 keys across three
 * brands today; the floor sits below that with room to lose a brand, not pinned at it — a floor at
 * today's exact count is a second baseline that fails on legitimate change.
 */
const FLOOR_KEYS = 1200;

const git = (...args: string[]): { ok: boolean; out: string; err: string } => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
};

const die = (lines: string[]): never => {
  console.error(`\n❌ ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(l);
  process.exit(1);
};

// ---- the AFTER side: the working tree ------------------------------------------------------------

const brandsOnDisk = (): string[] => {
  try { return readdirSync(resolve(repo, FIGMA_DIR)).sort(); }
  catch { return []; }
};

// PER BRAND, and the accounting runs once per brand rather than once over a merged set.
//
// The three brands emit the SAME collection and name for most variables, so a merged key space needs a
// brand prefix — and then a rule's image key, built from `(collection, mappedName)`, carries no brand
// and matches nothing. That is not hypothetical: it was this file's first implementation, and the
// over-claiming mutation reported 2076 contradicted claims where the derivation says 1368, the extra
// 708 being every `color` key failing its own image lookup. Per-brand keeps the key space identical to
// the rules' own `(collection, name)` domain, which is the space `docs/44` defines them over.
const afterByBrand = new Map<string, Set<VarKey>>();
for (const brand of brandsOnDisk()) {
  const dir = resolve(repo, FIGMA_DIR, brand);
  const keys = new Set<VarKey>();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort())
    for (const k of keysFromEmittedFile(JSON.parse(readFileSync(resolve(dir, f), 'utf8')), `${FIGMA_DIR}/${brand}/${f}`))
      keys.add(k);
  afterByBrand.set(brand, keys);
}
const afterKeys = new Set<VarKey>([...afterByBrand].flatMap(([b, ks]) => [...ks].map((k) => varKey(b, k))));

// ---- the BEFORE side: the committed emission at the merge base ------------------------------------
//
// `GITHUB_BASE_REF` in CI (the PR's target branch), `origin/main` locally, and `main` where there is no
// remote — tried in that order, each verified to RESOLVE rather than assumed. A ref that names nothing
// is the "cannot run" case, not a fallback to the next candidate: falling through would silently
// compare against whatever else happened to exist and report on the wrong pair.

// `GITHUB_BASE_REF` IS AUTHORITATIVE WHEN SET, and does NOT fall through to the ladder below.
//
// It is set only on a `pull_request` event, and it names the branch this PR actually targets. If it is
// set and does not resolve, the check CANNOT RUN — falling back to `origin/main` would compare against
// a branch that is not this PR's base and report a difference belonging to someone else's work, which
// is worse than failing because it is a confident answer to the wrong question.
//
// Found by exercising this path rather than by reading it: the first implementation had one flat
// ladder, so an unresolvable `GITHUB_BASE_REF` silently became `origin/main` — and the comment above
// the ladder already said that was wrong. The comment was right and the code was not.
const prBase = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;

let baseRef: string | null = null;
const tried: string[] = [];
let baseVia = 'local ladder';
if (prBase) {
  baseVia = 'GITHUB_BASE_REF';
  const r = git('rev-parse', '--verify', '--quiet', `${prBase}^{commit}`);
  tried.push(`${prBase} (GITHUB_BASE_REF, authoritative) — ${r.ok ? 'resolves' : 'does not resolve'}`);
  if (r.ok) baseRef = prBase;
} else {
  // No PR context: a local run, or a push build. `origin/main` first because it is what a local clone
  // tracks; bare `main` for a clone with no remote.
  for (const cand of ['origin/main', 'main']) {
    const r = git('rev-parse', '--verify', '--quiet', `${cand}^{commit}`);
    tried.push(`${cand} — ${r.ok ? 'resolves' : 'does not resolve'}`);
    if (r.ok) { baseRef = cand; break; }
  }
}
if (!baseRef)
  die([
    'no base ref — this check CANNOT RUN, which is not the same as finding no rename.',
    `    tried: ${tried.join(' · ')}`,
    '',
    '  This gate compares the committed emission at the merge base against the working tree. Without a',
    '  base it has nothing to compare and would report clean over the entire corpus it could not see —',
    '  `docs/34` shape 9. So it fails instead.',
    '',
    '  In CI: `actions/checkout@v4` defaults to a DEPTH-1 shallow clone with no history and no remote',
    '  branches. `ci.yml` sets `fetch-depth: 0` for this gate; if you are seeing this in CI, that setting',
    '  is missing or was reverted.',
    '  Locally: `git fetch origin main`.',
  ]);

// The MERGE BASE, not the base tip: on a branch several commits behind, the base tip carries changes
// this branch never made, and their emission difference would be reported against this diff.
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

// Every emitted file the merge base TRACKED — `ls-tree` at that commit, so a file added on this branch
// is absent (its keys are additions) and a file deleted on it is present (its keys are removals).
const tree = git('ls-tree', '-r', '--name-only', base, '--', FIGMA_DIR);
if (!tree.ok)
  die([`could not list ${FIGMA_DIR} at ${base.slice(0, 8)} — this check CANNOT RUN.`, `    ${tree.err}`]);

const beforeFiles = tree.out.split('\n').map((l) => l.trim()).filter((l) => l.endsWith('.json'));
const beforeByBrand = new Map<string, Set<VarKey>>();
for (const path of beforeFiles) {
  const blob = git('show', `${base}:${path}`);
  if (!blob.ok)
    die([`could not read ${path} at ${base.slice(0, 8)} — this check CANNOT RUN.`, `    ${blob.err}`]);
  const brand = path.slice(`${FIGMA_DIR}/`.length).split('/')[0];
  if (!beforeByBrand.has(brand)) beforeByBrand.set(brand, new Set());
  for (const k of keysFromEmittedFile(JSON.parse(blob.out), `${base.slice(0, 8)}:${path}`))
    beforeByBrand.get(brand)!.add(k);
}
const beforeKeys = new Set<VarKey>([...beforeByBrand].flatMap(([b, ks]) => [...ks].map((k) => varKey(b, k))));

// ---- recollect the BEFORE side through the collection renames (#1013) ----------------------------
//
// A rule's `map` returns a NAME and never a collection, so a key whose COLLECTION was renamed is beyond
// the reach of every rule: `color :: color/text/primary` and `color.appearance :: color/appearance/text/primary`
// share no side of any name-only claim. `recollect` moves each before-side key into the collection its
// variable now lives in — one hop, for the reason stated at `recollect` — so the rules are asked the only
// question they can answer.
//
// **This does not read the live emitter, which is what the gate's oracle property depends on.**
// `ACCOUNTING_COLLECTION_MOVES` is authored data and the keys it is applied to came out of git. And it does
// not make the gate agree with itself: a wrong or missing collection move leaves every affected key
// unaccounted (the domain no longer matches), and a collection move that agreed with a wrong rule would
// still be contradicted by the AFTER side, which is the real emission on disk. The emission remains the
// independent witness for the collection name and the variable name both.
//
// **The list is `ACCOUNTING_COLLECTION_MOVES` and not `COLLECTION_RENAMES` (#1097)** — the two are relative
// to different points in time and disagree about what a `color` collection at this base means. That module
// carries the full argument; the short form is that a migration list is relative to whenever each rename
// shipped and this one is relative to the merge base, which is one commit.
//
// The count printed in the report stays the RAW read. Recollection cannot change it here, but the reason is
// no longer `validateRenameMap`'s `duplicate collection target` refusal — that check never sees this list,
// and this list DOES land three sources on one target (`core-*` → `core`). It is that the three sources'
// names are disjoint (`palette/*`, `dimension/*`, `font/*`), so no two keys collapse onto one. `recollectAll`
// returns a Set, so if a future entry did collapse two keys the count would drop rather than double-count —
// and the dropped key would then read as an unaccounted removal, which is loud.
const beforeRecollected = new Map<string, Set<VarKey>>(
  [...beforeByBrand].map(([brand, keys]) => [brand, recollectAll(keys, ACCOUNTING_COLLECTION_MOVES)] as const),
);

// ---- the floors, before any "every …" claim is made ----------------------------------------------

if (beforeKeys.size < FLOOR_KEYS && beforeFiles.length > 0)
  die([
    `the emission at ${base.slice(0, 8)} yielded only ${beforeKeys.size} keys, below the floor of ${FLOOR_KEYS}.`,
    '  Every claim below is "every name that …", which is vacuously true of no names — a reader that',
    '  finds nothing accounts for everything. Something changed the emitted shape or the reader.',
  ]);
if (afterKeys.size < FLOOR_KEYS)
  die([
    `the working tree's emission yielded only ${afterKeys.size} keys, below the floor of ${FLOOR_KEYS}.`,
    '  Did `regen` run? This gate reads what `regen` writes, which is why `verify.ts` declares it after.',
  ]);

// ---- the accounting -------------------------------------------------------------------------------
//
// The key here is `brand :: collection :: name` — brand-qualified, because the same collection and name
// exist in all three brands and an accounting keyed without the brand would treat one brand's removal
// as accounted for by another brand's survival. `parseVarKey` splits on the FIRST separator, so the
// collection-and-name remainder reaches the rules exactly as `materialization-renames.ts` defines it.

// ---- the brand ROOT, from the DTCG tree and NEVER from the Figma emission (#1097) ----------------
//
// A rule's `domain` and `map` both need the brand's `theme.root`: since #1097 it is the first segment of
// every emitted variable name, and no read path may spell it (Prism2 hardcoded `pds/` and the bug was
// invisible in testing). It is read from `out/<brand>.tokens.json`'s single top-level key — the brand's
// declared namespace, in a different artifact, produced from the theme rather than from a variable name.
//
// **Not from `out/figma/**`, which is this comparison's AFTER side.** Deriving the root from there would
// define `!name.startsWith(root + '/')` in terms of the very names the domain is being asked about: the rule
// would claim exactly the keys lacking whatever prefix the emission happens to carry, and the accounting
// would go total against ANY emission. That is `docs/34` shape 11, one directory away from the version this
// module's header already warns about.
//
// A brand with a Figma emission and no DTCG tree is a "cannot run", not a skip — including the case where a
// brand was deleted on this branch. Every one of its keys is a removal needing a claim, and no claim can be
// made without a root, so the honest outcome is to say the gate could not answer.
const rootOfBrand = (brand: string): string => {
  const rel = `packages/engine/out/${brand}.tokens.json`;
  let tree: Record<string, unknown>;
  try { tree = JSON.parse(readFileSync(resolve(repo, rel), 'utf8')) as Record<string, unknown>; }
  catch (e) {
    return die([
      `could not read ${rel} — this check CANNOT RUN for brand \`${brand}\`.`,
      `    ${(e as Error).message}`,
      '',
      '  The rules need the brand\'s `theme.root` (#1097), and it is taken from the DTCG tree rather than',
      '  from the Figma emission the accounting is checking. Did `regen` run? If the brand was deleted, its',
      '  variables are all removals and no rule can claim them without a root — say so rather than skip.',
    ]);
  }
  const roots = Object.keys(tree).filter((k) => !k.startsWith('$'));
  if (roots.length !== 1)
    die([
      `${rel} has ${roots.length} top-level keys, expected exactly 1 — this check CANNOT RUN for brand \`${brand}\`.`,
      `    got: ${roots.join(', ') || '(none)'}`,
      '  A brand tree is rooted at its own namespace and nothing else, which is what makes that key the root.',
    ]);
  return roots[0];
};

// ---- the CONTRACT's own record of a rename, projected into this brand's names -----------------------
//
// `deriveVariableRenames()` rows are TAILS — brand-agnostic, because `DEPRECATIONS` is (see
// `rename-map.ts`'s `reRoot`). Rooting them per brand is what makes them comparable with the emission,
// and the root comes from the same `rootOfBrand` the rules use: from the DTCG tree, never from the Figma
// names being accounted for.
//
// The `rule` id names the CONTRACT version, not an issue and not a materialization rule id, so a report
// reader can tell which register claimed a removal at a glance — `contract:8.0.0` beside
// `namespace-and-core-tier-1097`.
const contractClaimsFor = (root: string): Claim[] => deriveVariableRenames().map((r) => ({
  rule: `contract:${r.since}`,
  from: varKey(r.collection, `${root}/${r.from}`),
  to: varKey(r.collection, `${root}/${r.to}`),
}));

const brands = [...new Set([...beforeByBrand.keys(), ...afterByBrand.keys()])].sort();
const empty = new Set<VarKey>();
const per = brands.map((brand) => {
  const root = rootOfBrand(brand);
  return {
    brand,
    root,
    a: accountFor(
      beforeRecollected.get(brand) ?? empty,
      afterByBrand.get(brand) ?? empty,
      MATERIALIZATION_RENAMES,
      parseVarKey,
      root,
      contractClaimsFor(root),
    ),
  };
});
/** Report lines carry the brand; the KEYS the accounting works in do not. */
const tag = (brand: string, xs: readonly string[]): string[] => xs.map((x) => `${brand} · ${x}`);
const acct = {
  beforeCount: beforeKeys.size,
  afterCount: afterKeys.size,
  removed: per.flatMap((p) => tag(p.brand, p.a.removed)),
  added: per.flatMap((p) => tag(p.brand, p.a.added)),
  claims: per.flatMap((p) => p.a.claims),
  unaccountedRemovals: per.flatMap((p) => tag(p.brand, p.a.unaccountedRemovals)),
  unaccountedAdditions: per.flatMap((p) => tag(p.brand, p.a.unaccountedAdditions)),
  contradictedClaims: per.flatMap((p) => p.a.contradictedClaims.map((c) => ({ ...c, from: `${p.brand} · ${c.from}` }))),
  multiplyClaimed: per.flatMap((p) => p.a.multiplyClaimed.map((m) => ({ ...m, key: `${p.brand} · ${m.key}` }))),
};

// WHICH REGISTER CLAIMED, split for the report. "3 rule(s) making 339 claim(s)" was an honest summary
// only while the rules were the sole register; at #1140 every one of the 339 is the CONTRACT's, and a
// reader who cannot see that goes looking for a materialization rule that does not exist and should not.
const ruleClaims = acct.claims.filter((c) => !c.rule.startsWith('contract:'));
const contractClaims = acct.claims.filter((c) => c.rule.startsWith('contract:'));
const claimTally = `${MATERIALIZATION_RENAMES.length} rule(s) making ${ruleClaims.length} claim(s) over the whole `
  + `before-set, plus ${contractClaims.length} the contract already records`;

const PRINT = 25;
const listing = (label: string, xs: readonly string[]): string[] =>
  xs.length === 0 ? [] : [
    `  ── ${label} (${xs.length}) ──`,
    ...xs.slice(0, PRINT).map((x) => `     ${x}`),
    ...(xs.length > PRINT ? [`     … and ${xs.length - PRINT} more, not listed`] : []),
  ];

if (!isTotal(acct)) {
  const out: string[] = [
    `the emission moved and ${MATERIALIZATION_RENAMES.length} rule(s) do not account for it.`,
    `    base ${base.slice(0, 8)} (${baseRef}) · ${acct.beforeCount} keys → working tree · ${acct.afterCount} keys`,
    // The roots are printed because a wrong one changes every claim silently: with the root mis-read, the
    // #1097 rule's domain matches every live name and the report fills with contradictions that have
    // nothing to do with the diff. Seeing `nb@nbds` rules that out in one glance.
    `    brand roots (from the DTCG trees, not the emission): ${per.map((p) => `${p.brand}@${p.root}`).join(' · ')}`,
    `    ${acct.removed.length} removed · ${acct.added.length} added · ${claimTally}`,
    '',
    ...listing('UNACCOUNTED REMOVALS — a name left the emission and no rule claimed it', acct.unaccountedRemovals),
    // CONTEXT, NOT A CAUSE (#1053). Printed only inside an already-failing report, and labelled so no
    // reader takes it for the reason: a mis-mapped rule says its claimed image is missing without
    // saying what turned up instead, and this is where that answer is.
    ...listing('names that ARRIVED (context — an addition is a new token and never a failure on its own)', acct.unaccountedAdditions),
    ...listing(
      'CONTRADICTED CLAIMS — a rule states a rename the emission does not show',
      acct.contradictedClaims.map((c) => `[${c.rule}] ${c.from} → ${c.to}: ${c.contradiction}`),
    ),
    ...listing(
      'CLAIMED BY MORE THAN ONE RULE — the pairing must be unambiguous',
      acct.multiplyClaimed.map((m) => `${m.key} claimed by [${m.rules.join(', ')}]`),
    ),
    '',
    '  A materialization rename is recorded as a RULE in `packages/engine/materialization-renames.ts`',
    '  (`docs/44` §5). Add or correct one so the accounting is total. If a name really was DELETED rather',
    '  than renamed, that is not this gate\'s business and the rule should not claim it — but the deletion',
    '  then shows up here as an unaccounted removal, which is the conversation this gate exists to force.',
    '',
    '  A CONTRACT rename is not a rule and must not be given one. If the ROLE moved, the record is a',
    '  `DEPRECATIONS` entry in `version.ts` (+ the `CONTRACT_VERSION` bump `token-contract.ts --accept`',
    '  demands), and this gate reads it through `rename-map.ts` on its own — #1140 was the first of those.',
    '  Writing a rule for one puts two differently-derived records in front of one Figma operation, and',
    '  the key then fails here as CLAIMED BY MORE THAN ONE RULE rather than going quietly.',
  ];
  die(out);
}

console.log(
  `✓ materialization renames accounted for — base ${base.slice(0, 8)} (${baseRef}, via ${baseVia}), `
  + `roots ${per.map((p) => `${p.brand}@${p.root}`).join(' · ')}: `
  + `${acct.beforeCount} keys → ${acct.afterCount}, ${acct.removed.length} removed / ${acct.added.length} added, `
  + `${claimTally}.`
  // Said in the SUCCESS line, not only in the header, because this is where a reader meets the rule:
  // an additive change is the common case, and "6 added" sitting in a passing run needs to explain
  // itself or it reads as something the gate failed to notice.
  //
  // The number is `unaccountedAdditions`, NOT `added`. It read `added` until #1013, which was the same
  // number while the artifact was empty — with no rules, no addition is any claim's image — and became
  // wrong the moment two rules landed: it reported 1,074 additions as unclaimed when every one of them
  // was a rule's claimed image, i.e. it printed the opposite of the fact the reader wants. An addition
  // that IS a claim's image is the rules working; one that is not is a new token.
  + (acct.unaccountedAdditions.length
    ? `\n  ${acct.unaccountedAdditions.length} of the ${acct.added.length} added are no rule's image — additions need no rule; only a REMOVAL can hide a rename (#1053).`
    : `\n  every one of the ${acct.added.length} added is a rule's claimed image — nothing arrived unexplained.`),
);
