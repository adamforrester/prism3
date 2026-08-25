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
  MATERIALIZATION_RENAMES,
  accountFor,
  isTotal,
  keysFromEmittedFile,
  parseVarKey,
  varKey,
  type VarKey,
} from './materialization-renames';

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

const baseCandidates = [
  process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null,
  'origin/main',
  'main',
].filter((r): r is string => !!r);

let baseRef: string | null = null;
const tried: string[] = [];
for (const cand of baseCandidates) {
  const r = git('rev-parse', '--verify', '--quiet', `${cand}^{commit}`);
  tried.push(`${cand} — ${r.ok ? 'resolves' : 'does not resolve'}`);
  if (r.ok) { baseRef = cand; break; }
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

const brands = [...new Set([...beforeByBrand.keys(), ...afterByBrand.keys()])].sort();
const empty = new Set<VarKey>();
const per = brands.map((brand) => ({
  brand,
  a: accountFor(beforeByBrand.get(brand) ?? empty, afterByBrand.get(brand) ?? empty, MATERIALIZATION_RENAMES, parseVarKey),
}));
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
    `    ${acct.removed.length} removed · ${acct.added.length} added · ${acct.claims.length} claim(s) evaluated over the whole before-set`,
    '',
    ...listing('UNACCOUNTED REMOVALS — a name left the emission and no rule claimed it', acct.unaccountedRemovals),
    ...listing('UNACCOUNTED ADDITIONS — a name arrived and is no claim\'s image', acct.unaccountedAdditions),
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
  ];
  die(out);
}

console.log(
  `✓ materialization renames accounted for — base ${base.slice(0, 8)} (${baseRef}): `
  + `${acct.beforeCount} keys → ${acct.afterCount}, ${acct.removed.length} removed / ${acct.added.length} added, `
  + `${MATERIALIZATION_RENAMES.length} rule(s) making ${acct.claims.length} claim(s) over the whole before-set.`,
);
