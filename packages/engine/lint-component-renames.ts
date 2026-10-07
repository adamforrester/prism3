/**
 * Prism3 engine — COMPONENT RENAMES ARE DECLARED (#2265, owner decision Q85 A, §10 Q3).
 *
 * The forcing function for `COMPONENT_RENAMES`. An in-place update matches a set's members to the plan
 * by their variant coordinate, so a renamed value or axis reads to it as one member dropped and one
 * added, and a published library's instances of the dropped member break. The ledger is what turns that
 * pair into a rename. Nothing makes an authored ledger complete, so this gate refuses the PR in which a
 * def, an axis or a value disappears from the projection without an entry claiming it.
 *
 * ── TWO ARMS ───────────────────────────────────────────────────────────────────────────────────────
 *
 *   A. `schema/component-axes.json` equals the live projection: per def, each axis with its sorted
 *      values, and the member count. This proves the committed file is a faithful witness of the
 *      engine that sits beside it.
 *   B. The same file AT THE MERGE BASE, read out of git, against the file in the tree. Every def, axis
 *      and value present at the base and absent now must be claimed by a ledger entry, and every
 *      ledger `to` must exist in the tree.
 *
 * Arm B's `from` side is git, and must stay git. Recomputing it from the live engine would compare the
 * projection with itself and pass any rename (`docs/34` shape 11). Arm A is what makes the committed
 * file trustworthy enough for arm B to read.
 *
 * ── NEVER IN `regen.ts` ────────────────────────────────────────────────────────────────────────────
 *
 * The baseline is rewritten only by `--accept`, which runs arm B first and refuses an unaccounted
 * difference. Regenerated on every run, it would agree with a removal before this gate read it, and
 * both arms would go green: a gate allowed to rewrite what it reads has no memory
 * (`token-contract.json`'s rule, `CLAUDE.md` principle 5).
 *
 * ── NO BASE IS A FAILURE; NO BASELINE AT THE BASE IS THE BOOTSTRAP ─────────────────────────────────
 *
 * A base ref that does not resolve, or a merge base that cannot be found, means the check could not
 * run, and it fails by saying so (`lint-materialization-renames.ts` has the ladder and its reasons).
 * A merge base that resolves but does not track `component-axes.json` is the PR that introduces this
 * gate, or a branch cut before it; there is nothing to compare, and the run says so in its output
 * rather than reporting a clean comparison.
 *
 * Run: `npx tsx packages/engine/lint-component-renames.ts` (`--accept` to rewrite the baseline)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { componentDefs } from './components/index';
import { figmaAnatomySet, planComponentName } from './anatomy-figma';
import { COMPONENT_RENAMES, coordKey, coordPairs, danglingTargets, unaccounted, type AxesBaseline as Baseline } from './component-renames';

const HERE = dirname(fileURLToPath(import.meta.url));
const repo = resolve(HERE, '..', '..');
const REL = 'packages/engine/schema/component-axes.json';
const FILE = resolve(repo, REL);
const ACCEPT = process.argv.includes('--accept');

/** A FLOOR on the defs the projection covers (`docs/34` shape 9): every claim below is "every def,
 *  axis, value that …", and each is vacuously true of none. 26 defs project today; the floor leaves
 *  room to retire a few without pinning today's count. */
const FLOOR_DEFS = 20;

/** The swap target the real caller nominates (`apps/plugin/src/main.ts`). The coordinates do not
 *  depend on it, but a def that refuses to project without one would drop out of the baseline. */
const SWAP_TARGET = 'FPO-default-icon';

const git = (...args: string[]): { ok: boolean; out: string; err: string } => {
  const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
};

const die = (lines: string[]): never => {
  console.error(`\n❌ ${lines[0]}`);
  for (const l of lines.slice(1)) console.error(l);
  process.exit(1);
};

// ---- the live projection ----------------------------------------------------------------------------

const project = (): Baseline => {
  const out: Baseline = {};
  for (const def of [...componentDefs].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (!def.figmaProperties) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const axes: Record<string, Set<string>> = {};
    for (const p of plans) {
      const key = coordKey(planComponentName(p));
      if (key === null) die([`${def.id}: a planned member name is not a coordinate — ${JSON.stringify(planComponentName(p))}`]);
      for (const [a, v] of coordPairs(key!)) (axes[a] ??= new Set()).add(v);
    }
    out[def.id] = {
      axes: Object.fromEntries(Object.keys(axes).sort().map((a) => [a, [...axes[a]].sort()])),
      members: plans.length,
    };
  }
  return out;
};

const live = project();
const liveText = `${JSON.stringify(live, null, 2)}\n`;
const nDefs = Object.keys(live).length;
if (nDefs < FLOOR_DEFS)
  die([`the projection covers ${nDefs} defs, below the floor of ${FLOOR_DEFS}.`, '  A reader that finds no defs accounts for every rename. Check that componentDefs still loads.']);

// ---- arm B: the merge base against the tree -----------------------------------------------------------
//
// The accounting itself (`unaccounted`, `danglingTargets`) lives in `component-renames.ts`, where
// `test.ts` exercises it on hand-built baselines; this script only sources its two inputs.

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
  die([
    'no base ref — this check CANNOT RUN, which is not the same as finding no rename.',
    `    tried: ${tried.join(' · ')}`,
    '  In CI, `ci.yml` sets `fetch-depth: 0`; locally, `git fetch origin main`.',
  ]);
const mb = git('merge-base', 'HEAD', baseRef!);
if (!mb.ok || !mb.out.trim())
  die([`no merge base between HEAD and ${baseRef} — this check CANNOT RUN.`, `    ${mb.err || '(git printed nothing)'}`, '  A shallow clone is the usual cause: `git fetch --unshallow`.']);
const base = mb.out.trim();

const tracked = git('ls-tree', '--name-only', base, '--', REL);
if (!tracked.ok) die([`could not list ${REL} at ${base.slice(0, 8)} — this check CANNOT RUN.`, `    ${tracked.err}`]);
let before: Baseline | null = null;
if (tracked.out.trim()) {
  const blob = git('show', `${base}:${REL}`);
  if (!blob.ok) die([`could not read ${REL} at ${base.slice(0, 8)} — this check CANNOT RUN.`, `    ${blob.err}`]);
  before = JSON.parse(blob.out) as Baseline;
}

const committed: Baseline | null = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Baseline) : null;

if (ACCEPT) {
  const bad = before ? [...unaccounted(before, live, COMPONENT_RENAMES), ...danglingTargets(live, COMPONENT_RENAMES)] : danglingTargets(live, COMPONENT_RENAMES);
  if (bad.length)
    die([`--accept refused: ${bad.length} change(s) the ledger does not account for.`, ...bad.map((b) => `    ${b}`), '', '  Add the entries to packages/engine/component-renames.ts first; the baseline follows them, never the other way.']);
  writeFileSync(FILE, liveText);
  console.log(`✓ wrote ${REL} — ${nDefs} defs`);
  process.exit(0);
}

// ---- arm A ----------------------------------------------------------------------------------------------

const failures: string[] = [];
if (!committed) failures.push(`A: ${REL} is missing — run \`npx tsx packages/engine/lint-component-renames.ts --accept\``);
else if (readFileSync(FILE, 'utf8') !== liveText) {
  const drift: string[] = [];
  for (const id of new Set([...Object.keys(committed), ...Object.keys(live)]))
    if (JSON.stringify(committed[id]) !== JSON.stringify(live[id])) drift.push(id);
  failures.push(`A: ${REL} differs from the live projection (${drift.join(', ') || 'formatting'}) — account for any removal in COMPONENT_RENAMES, then \`--accept\``);
}

// ---- arm B ----------------------------------------------------------------------------------------------

const after = committed ?? live;
if (before) for (const b of unaccounted(before, after, COMPONENT_RENAMES)) failures.push(`B: ${b}`);
for (const b of danglingTargets(after, COMPONENT_RENAMES)) failures.push(`B: ${b}`);

const nAxes = Object.values(live).reduce((n, d) => n + Object.keys(d.axes).length, 0);
const nValues = Object.values(live).reduce((n, d) => n + Object.values(d.axes).reduce((m, v) => m + v.length, 0), 0);
console.log(`component renames (#2265) — ${nDefs} defs, ${nAxes} axes, ${nValues} values; ledger ${COMPONENT_RENAMES.length} entr${COMPONENT_RENAMES.length === 1 ? 'y' : 'ies'}`);
console.log(before
  ? `  base ${base.slice(0, 8)} (${baseRef}): ${Object.keys(before).length} defs compared`
  : `  base ${base.slice(0, 8)} (${baseRef}) does not track ${REL} — BOOTSTRAP: arm B has nothing to compare at this base`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('✓ every def, axis and value that left the projection is claimed by COMPONENT_RENAMES');
