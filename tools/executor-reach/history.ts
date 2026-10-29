/**
 * WHICH SETS DID EACH PAST EXECUTOR REVISION REDRAW? (#3101) — a tool: it answers and exits 0.
 *
 *   npx tsx tools/executor-reach/history.ts [--last 20] [--jobs 4]
 *
 * For each commit that raised `EXECUTOR_REVISION` (newest first, the last `--last` of them), it exports that commit's
 * engine, plugin and the files the plugin's sources read, and its parent's `apps/plugin/src`, into a scratch directory,
 * and runs today's `apps/plugin/reach-draw.ts` there: the parent's executor against the commit's, over the commit's own
 * plans and shim, in every arm the gate uses. So each revision is measured as `lint-executor-reach.ts` would have
 * measured it on its own PR. The answer is the measurement `executor-reach.json`'s entries from the floor up were
 * written from, and how to check one again.
 *
 * Today's `reach-draw.ts` is copied into each old tree, so an old commit whose shim or engine lacks something it
 * calls reports that revision's sets as `error`, which reads as "not measured", never as "not reached".
 */
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REVISION = 'apps/plugin/src/executor-revision.ts';
const arg = (k: string, d: number): number => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const LAST = arg('--last', 20), JOBS = arg('--jobs', 4);
const git = (...a: string[]): string => spawnSync('git', ['-C', REPO, ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout ?? '';
const revAt = (c: string): number => Number(/EXECUTOR_REVISION\s*=\s*(\d+)/.exec(git('show', `${c}:${REVISION}`))?.[1] ?? 0);

const commits = git('log', '--format=%H', '--', REVISION).split('\n').filter(Boolean)
  .map((c) => ({ c, to: revAt(c), from: revAt(`${c}^`) })).filter((x) => x.to > x.from).slice(0, LAST);
const scratch = mkdtempSync(join(tmpdir(), 'prism3-reach-history-'));
const exportTo = (c: string, dir: string, paths: string[]): void => {
  mkdirSync(dir, { recursive: true });
  const a = spawnSync('git', ['-C', REPO, 'archive', '--format=tar', c, ...paths], { maxBuffer: 1024 * 1024 * 1024 });
  spawnSync('tar', ['-x', '-C', dir], { input: a.stdout });
};
const one = ({ c, from, to }: { c: string; from: number; to: number }): Promise<string> => new Promise((done) => {
  const t = join(scratch, c.slice(0, 8));
  exportTo(c, join(t, 'new'), ['packages/engine', 'apps/plugin', 'apps/studio/src', 'docs/public']);
  exportTo(`${c}^`, join(t, 'old'), ['apps/plugin/src', 'apps/studio/src', 'docs/public']);
  for (const side of ['new', 'old']) {
    mkdirSync(join(t, side, 'node_modules', '@prism3'), { recursive: true });
    symlinkSync(join(t, 'new', 'packages', 'engine'), join(t, side, 'node_modules', '@prism3', 'engine'), 'dir');
  }
  copyFileSync(join(REPO, 'apps/plugin/reach-draw.ts'), join(t, 'new/apps/plugin/reach-draw.ts'));
  const out = join(t, 'out.json');
  const p = spawn(process.execPath, [...process.execArgv, join(t, 'new/apps/plugin/reach-draw.ts'), '--old', join(t, 'old'), '--out', out], { cwd: join(t, 'new'), stdio: 'ignore' });
  p.on('close', () => {
    let line = `${from} → ${to}  ${c.slice(0, 8)}  `;
    try {
      const r = JSON.parse(readFileSync(out, 'utf8')) as { sets?: Record<string, Record<string, string>>; loadError?: string };
      if (r.loadError) line += `the parent's executor did not load: ${r.loadError.slice(0, 120)}`;
      else {
        const sets = r.sets!;
        const moved = Object.keys(sets).filter((id) => Object.values(sets[id]).includes('changed'));
        const errs = Object.keys(sets).filter((id) => Object.values(sets[id]).some((v) => v.startsWith('error')));
        line += `${moved.length} of ${Object.keys(sets).length} redrawn: ${JSON.stringify(moved.sort())}${errs.length ? `; not measured: ${errs.join(', ')}` : ''}`;
      }
    } catch { line += 'no result'; }
    rmSync(t, { recursive: true, force: true });
    done(line);
  });
});

console.log(`executor reach, measured over the last ${commits.length} revisions (#3101)\n`);
const lines: string[] = new Array(commits.length);
let next = 0;
await Promise.all(Array.from({ length: Math.min(JOBS, commits.length) }, async () => {
  while (next < commits.length) { const i = next++; lines[i] = await one(commits[i]); console.log(`  ${lines[i]}`); }
}));
rmSync(scratch, { recursive: true, force: true });
console.log('\nin revision order:');
for (const l of [...lines].reverse()) console.log(`  ${l}`);
