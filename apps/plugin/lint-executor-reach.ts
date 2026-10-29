/**
 * EACH EXECUTOR REVISION NAMES EVERY SET IT REDRAWS (#3101).
 *
 * `executor-reach.json` (read by `src/executor-reach.ts`) says, per `EXECUTOR_REVISION`, which component sets that
 * revision draws differently, and Update file makes a set due for an executor change only when a revision since it was
 * drawn names it. A set left out of an entry it belongs in is a drawing change the file is never told about, the one
 * answer the record must not give; so this gate measures the drawing and fails an entry that names fewer sets than
 * moved. Naming more is allowed (an extra set is a set re-applied for nothing); `"all"` is always allowed.
 *
 * `lint-executor-revision.ts` keeps its role: it fails an executor change that does not raise the revision. This gate
 * starts where that one ends: the revision rose, so which sets did it reach?
 *
 * ── THE TWO SIDES (docs/34) ─────────────────────────────────────────────────────────────────────────────────────────
 *
 * SUBJECT: the new entries, the ones above the base's revision, as committed. ORACLE: the drawing. Every projected def
 * the new entries do not already name is drawn with the base's executor (`apps/plugin/src` at the base, exported by
 * `git archive` into a temporary directory) and with this tree's, over this tree's plans, in the component shim
 * (`reach-draw.ts`: a fresh build, an in-place update, an update across a lever change and an update over an earlier
 * update's drawing, under two brands). A def whose drawing moved in any arm, or that cannot be drawn on either side,
 * must be named. Nothing here writes the record: a gate that rewrote what it reads would have no memory (docs/34 shape
 * 6), so the entry is the author's, and the fix this gate prints is to add the sets it names.
 *
 * WHAT THE ORACLE SHARES WITH THE SUBJECT: the host model. Both executors draw into the same shim, so a write the shim
 * does not record reads the same on both sides (shape 17). That limit is the shim's own and is stated in
 * `executor-reach.ts` with what an author does about it.
 *
 * ── THE HISTORY ─────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * Entries at or below the base's revision, and the floor, may not change: a set a file was told was not reached would
 * become due, or one it should be told about would quietly stop being, by an edit nobody measured. Every revision
 * above the floor and up to this tree's has an entry, and none above it.
 *
 * ── THE BASE ────────────────────────────────────────────────────────────────────────────────────────────────────────
 *
 * The merge base of HEAD and the base branch (`GITHUB_BASE_REF`, else `origin/main`, else `main`); on the base branch
 * itself, HEAD's first parent (`packages/engine/comparison-base.ts`, #2556). No base is a failure, not a pass.
 * The exported base tree gets one symlink, `node_modules/@prism3/engine` → this tree's engine, so its executor draws
 * this tree's plans: it is a scratch directory, not a worktree, and no package manager touches it.
 *
 * Run: `npx tsx apps/plugin/lint-executor-reach.ts`. Measuring takes minutes and runs only when the revision rose and
 * no new entry says `"all"`; every other run is a read of two files.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from '@prism3/engine/components/index';
import { comparisonBase } from '../../packages/engine/comparison-base';
import type { ReachTable } from './src/executor-reach';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const TABLE = 'apps/plugin/src/executor-reach.json';
const REVISION = 'apps/plugin/src/executor-revision.ts';
const DRAW = join(HERE, 'reach-draw.ts');
const PROJECTED = componentDefs.filter((d) => d.figmaProperties).map((d) => d.id);

const git = (...args: string[]) => {
  const r = spawnSync('git', ['-C', REPO, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '').trim() };
};
const failures: string[] = [];
const die = (lines: string[]): never => { console.error(`✗ ${lines.join('\n')}`); process.exit(1); };
const revisionOf = (text: string | null): number => {
  if (text === null) return 0;
  const m = /export const EXECUTOR_REVISION\s*=\s*(\d+)\s*;/.exec(text);
  if (!m) return die([`cannot read EXECUTOR_REVISION — this check CANNOT RUN.`]);
  return Number(m[1]);
};
const tableOf = (text: string | null, where: string): ReachTable | null => {
  if (text === null) return null;
  try { return JSON.parse(text) as ReachTable; } catch (e) { return die([`${TABLE} at ${where} is not JSON: ${(e as Error).message}`]); }
};

console.log('executor reach — each EXECUTOR_REVISION names every set it redraws (#3101)\n');

// ---- the base -------------------------------------------------------------------------------------------------------
const prBase = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;
const candidates = prBase ? [prBase] : ['origin/main', 'main'];
const baseRef = candidates.find((c) => git('rev-parse', '--verify', '--quiet', `${c}^{commit}`).ok);
if (!baseRef) die([`no base ref — this check CANNOT RUN, which is not the same as finding nothing to check.`, `    tried: ${candidates.join(', ')}`]);
const mb = git('merge-base', 'HEAD', baseRef!);
if (!mb.ok || !mb.out.trim()) die([`no merge base between HEAD and ${baseRef} — this check CANNOT RUN.`, `    ${mb.err}`]);
const { base, label } = comparisonBase(git, mb.out.trim(), die);
const show = (p: string): string | null => {
  const listed = git('ls-tree', '--name-only', base, '--', p);
  if (!listed.ok) die([`could not list ${p} at ${base.slice(0, 8)} — this check CANNOT RUN.`, `    ${listed.err}`]);
  if (!listed.out.trim()) return null;
  const r = git('show', `${base}:${p}`);
  if (!r.ok) die([`could not read ${p} at ${base.slice(0, 8)} — this check CANNOT RUN.`, `    ${r.err}`]);
  return r.out;
};
const baseRev = revisionOf(show(REVISION));
const headRev = revisionOf(readFileSync(join(REPO, REVISION), 'utf8'));
const baseTable = tableOf(show(TABLE), base.slice(0, 8));
const table = tableOf(readFileSync(join(REPO, TABLE), 'utf8'), 'HEAD')!;
console.log(`  base ${base.slice(0, 8)} (${label}): revision ${baseRev}${baseTable ? `, floor ${baseTable.floor}` : ', no reach record'}`);
console.log(`  this tree: revision ${headRev}, floor ${table.floor}, ${Object.keys(table.reach).length} entries`);

// ---- the record's shape and its history -----------------------------------------------------------------------------
if (!Number.isInteger(table.floor) || table.floor < 0) failures.push(`floor: ${JSON.stringify(table.floor)} is not a revision`);
for (const [k, v] of Object.entries(table.reach)) {
  const r = Number(k);
  if (!/^\d+$/.test(k)) { failures.push(`entry "${k}": not a revision number`); continue; }
  if (r <= table.floor) failures.push(`entry ${k}: at or below the floor (${table.floor}), where no entry is read`);
  if (r > headRev) failures.push(`entry ${k}: above EXECUTOR_REVISION (${headRev}). An entry is written with the revision it describes`);
  if (v === 'all') continue;
  if (!Array.isArray(v)) { failures.push(`entry ${k}: neither "all" nor a list of def ids`); continue; }
  // A new entry names today's defs. An older one keeps the ids it was measured under (a later rename is followed by
  // `reaches`), and the history arm below holds it unchanged.
  const unknown = r > baseRev ? v.filter((id) => !PROJECTED.includes(id)) : [];
  if (unknown.length) failures.push(`entry ${k}: ${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} not a def Prism3 builds as a set`);
  if (JSON.stringify(v) !== JSON.stringify([...new Set(v)].sort())) failures.push(`entry ${k}: list it sorted, each def once`);
}
for (let r = table.floor + 1; r <= headRev; r++) if (!(String(r) in table.reach)) failures.push(`entry ${r}: missing. Every revision above the floor names the sets it redraws, or "all"`);
if (baseTable) {
  if (baseTable.floor !== table.floor) failures.push(`floor: ${baseTable.floor} at the base, ${table.floor} here. The floor does not move once recorded`);
  for (let r = 1; r <= baseRev; r++) {
    const was = JSON.stringify(baseTable.reach[String(r)] ?? null), is = JSON.stringify(table.reach[String(r)] ?? null);
    if (was !== is) failures.push(`entry ${r}: ${was} at the base, ${is} here. An entry at or below the base's revision (${baseRev}) does not change`);
  }
}

// ---- the measurement ------------------------------------------------------------------------------------------------
const fresh = Object.keys(table.reach).map(Number).filter((r) => r > baseRev && r > table.floor).sort((a, b) => a - b);
const declared = fresh.map((r) => table.reach[String(r)]);
const run = async (): Promise<void> => {
  if (headRev <= baseRev) { console.log(`  revision unchanged since the base: nothing to measure`); return; }
  if (headRev <= table.floor) { console.log(`  revision ${headRev} is at or below the floor: every set reads as reached, nothing to measure`); return; }
  if (failures.length) return;
  if (declared.some((d) => d === 'all')) { console.log(`  revision ${fresh.join(', ')}: "all" declared, nothing to measure`); return; }
  const named = new Set(declared.flatMap((d) => d as readonly string[]));
  const todo = PROJECTED.filter((id) => !named.has(id));
  console.log(`  revision ${baseRev} → ${headRev}: ${named.size} set(s) named (${[...named].join(', ') || 'none'}); drawing the other ${todo.length} with both executors`);
  if (!todo.length) return;

  const scratch = mkdtempSync(join(tmpdir(), 'prism3-reach-'));
  try {
    const archive = spawnSync('git', ['-C', REPO, 'archive', '--format=tar', base, 'apps/plugin/src', 'apps/studio/src', 'docs/public'], { maxBuffer: 512 * 1024 * 1024 });
    if (archive.status !== 0) die([`could not export the base's executor (git archive) — this check CANNOT RUN.`, `    ${String(archive.stderr).trim()}`]);
    const untar = spawnSync('tar', ['-x', '-C', scratch], { input: archive.stdout });
    if (untar.status !== 0) die([`could not unpack the base's executor (tar) — this check CANNOT RUN.`, `    ${String(untar.stderr).trim()}`]);
    mkdirSync(join(scratch, 'node_modules', '@prism3'), { recursive: true });
    symlinkSync(join(REPO, 'packages', 'engine'), join(scratch, 'node_modules', '@prism3', 'engine'), 'dir');
    if (!existsSync(join(scratch, 'apps/plugin/src/write-components.ts'))) die([`the base holds no apps/plugin/src/write-components.ts — this check CANNOT RUN.`]);

    const workers = Math.max(1, Math.min(4, availableParallelism(), todo.length));
    const shares = Array.from({ length: workers }, (_, i) => todo.filter((_, j) => j % workers === i));
    const results = await Promise.all(shares.map((defs, i) => new Promise<Record<string, unknown>>((done) => {
      const out = join(scratch, `share-${i}.json`);
      const p = spawn(process.execPath, [...process.execArgv, DRAW, '--old', scratch, '--defs', defs.join(','), '--out', out], { cwd: REPO, stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      p.stderr.on('data', (c) => { err += String(c); });
      p.on('close', (code) => {
        if (code !== 0 || !existsSync(out)) { done({ crash: `worker ${i} exited ${code}: ${err.trim().split('\n').slice(-3).join(' | ')}` }); return; }
        done(JSON.parse(readFileSync(out, 'utf8')) as Record<string, unknown>);
      });
    })));
    const sets: Record<string, Record<string, string>> = {};
    for (const r of results) {
      if (typeof r.crash === 'string') die([`the drawing could not be measured — this check CANNOT RUN.`, `    ${r.crash}`]);
      if (typeof r.loadError === 'string') {
        failures.push(`the base's executor does not load against this tree's engine (${r.loadError.slice(0, 200)}), so its drawing cannot be compared. Declare "all" for revision ${fresh.join(', ')}`);
        return;
      }
      Object.assign(sets, r.sets as typeof sets);
    }
    // The premise: every def asked for came back, with every arm. A measurement that skipped a def found nothing in it.
    const missing = todo.filter((id) => !sets[id] || Object.keys(sets[id]).length === 0);
    if (missing.length) die([`the measurement returned nothing for ${missing.join(', ')} — this check CANNOT RUN.`]);
    const moved = todo.filter((id) => Object.values(sets[id]).some((v) => v !== 'same'));
    const arms = Object.keys(sets[todo[0]]);
    console.log(`  ${todo.length} set(s) × ${arms.length} arms (${arms.join(', ')}): ${moved.length} redrawn outside the entries`);
    for (const id of moved) {
      const why = Object.entries(sets[id]).filter(([, v]) => v !== 'same').map(([a, v]) => (v === 'changed' ? a : `${a} (${v})`));
      failures.push(`${id}: drawn differently by revision ${headRev} than by ${baseRev} (${why.join('; ')}), and no new entry names it. Add "${id}" to entry ${fresh[fresh.length - 1]}`);
    }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
};

await run();
if (failures.length) {
  console.error(`\n✗ ${failures.length} finding(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`\n  The record is ${TABLE}; executor-reach.ts says what an entry holds.`);
  process.exit(1);
}
console.log('\n✓ clean — every new revision names every set it redraws');
