/**
 * THE CANARY'S MAC JOB (#3215, owner decisions of 2026-11-01 and 2026-11-03): the two scripted halves of one run. The
 * Mac session runs `prepare`, the owner switches Agent link on, the session sends the printed commands with
 * `figma_run`, saves each response as it came back, and runs `collect`. It never judges: `judge.ts` is the
 * orchestrator's (Q-C1 A).
 *
 *   npx tsx tools/figma-canary/job.ts prepare <full sha> --checkout <dir> [--file-key <key>] [--run-dir <dir>]
 *   npx tsx tools/figma-canary/job.ts collect --run-dir <dir> [--out <file>]
 *
 * `prepare`:
 *   1. the canary checkout, `--checkout`, is a directory of its own, OUTSIDE the tree this script runs from (the owner's
 *      or the everyday one). Cloned from this tree's `origin` the first time, reused after.
 *   2. there: `git fetch origin main`, the sha must be on `origin/main`, `git checkout --detach <sha>`, a clean
 *      `git status --porcelain`, `npm ci` (never `npm install`), `npm run -w @prism3/plugin build`;
 *   3. it reads the stamp the build printed (`plugin build complete → apps/plugin/dist/  (<stamp>)`) and writes
 *      `build.json` (`commit`, `stamp`, `builtFrom`) into the run directory, outside both trees;
 *   4. it writes `commands.json` (the canary checkout's own `judge.ts --commands`) and prints the steps.
 * `--file-key` is the scratch file's key. It is used for ONE printed line (the link to open the file) and written
 * nowhere: this is a public repo, and the key stays in the Mac's job config.
 *
 * `collect` reads `build.json` and each `<key>.json` the session saved in the run directory (`status`, `readback`,
 * `update-components`, `prune`, `run-code`, `status-after`), verbatim, and writes one run file keyed by command:
 * `{ format, commit, stamp, builtFrom, responses }`. A response the session did not save is left out, and the judge
 * holds on it. A saved file that is not JSON is kept as its text, and the judge holds on that too.
 *
 * A TOOL (`tools/CLAUDE.md`): not in `ci.yml`. It exits 1 when it refuses to prepare (a dirty tree, a commit not on
 * main, a failed build) and 2 on bad usage. The pure parts (`parseStamp`, `builtFromLine`, `assemble`) are exercised
 * by `selftest.ts`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_FORMAT, RUN_KEYS } from './judge';

/** The build's closing line, as `apps/plugin/build.mjs` prints it, and its stamp. */
export const parseStamp = (buildOutput: string): string | null => {
  const m = /^plugin build complete → apps\/plugin\/dist\/\s+\((\S+ tree-[0-9a-f]{8}(?: \S+)?)\)\s*$/m.exec(buildOutput);
  return m ? m[1] : null;
};

/** The panel's "Built from" line for a stamp, in the panel's wording (`buildNote`, #836, #3239), written out here. */
export const builtFromLine = (stamp: string): string | null => {
  const m = /^(\S+) (tree-[0-9a-f]{8})(?: (\S+))?$/.exec(stamp);
  if (!m) return null;
  const [, at, tree, commit] = m;
  const clause = commit === undefined ? ''
    : commit === 'git-unavailable' ? ' (commit unknown: git could not run)'
      : commit.endsWith('-dirty') ? ` (commit ${commit.slice(0, -'-dirty'.length)}, with uncommitted changes)`
        : ` (commit ${commit})`;
  return `Built from ${tree}${clause} at ${at}.`;
};

/** One run file from `build.json` and the saved responses, keyed by command. Pure. */
export const assemble = (build: { commit: string; stamp: string; builtFrom: string }, saved: Record<string, string>): Record<string, unknown> => {
  const responses: Record<string, unknown> = {};
  for (const [key, text] of Object.entries(saved)) {
    try { responses[key] = JSON.parse(text); } catch { responses[key] = text; }
  }
  return { format: RUN_FORMAT, commit: build.commit, stamp: build.stamp, builtFrom: build.builtFrom, responses };
};

const sh = (cmd: string, args: string[], cwd: string, inherit = false) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', stdio: inherit ? ['ignore', 'pipe', 'inherit'] : 'pipe', maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' };
};
const refuse = (why: string): never => { console.error(`job.ts: refused — ${why}`); process.exit(1); };
const usage = (): never => {
  console.error('usage: job.ts prepare <full sha> --checkout <dir> [--file-key <key>] [--run-dir <dir>]\n       job.ts collect --run-dir <dir> [--out <file>]');
  process.exit(2);
};

const isMain = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [mode, ...argv] = process.argv.slice(2);
  const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const here = dirname(fileURLToPath(import.meta.url));
  const tree = sh('git', ['rev-parse', '--show-toplevel'], here).out.trim();

  if (mode === 'prepare') {
    const sha = argv[0];
    const checkoutArg = opt('checkout');
    if (!sha || !checkoutArg) usage();
    if (!/^[0-9a-f]{40}$/.test(sha)) refuse(`"${sha}" is not a full 40-character commit; the run builds one exact commit`);
    const checkout = resolve(checkoutArg);
    const rel = relative(tree, checkout);
    if (tree && (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)))) refuse(`${checkout} is inside ${tree}; the canary checkout is a directory of its own`);
    const runDir = resolve(opt('run-dir') ?? resolve(checkout, '..', 'figma-canary-runs', sha.slice(0, 8)));

    if (!existsSync(checkout)) {
      const url = sh('git', ['remote', 'get-url', 'origin'], tree).out.trim();
      if (!url) refuse('no origin to clone the canary checkout from');
      console.log(`cloning ${url} → ${checkout} (once; reused after)`);
      if (sh('git', ['clone', url, checkout], dirname(checkout), true).code !== 0) refuse('the clone failed');
    }
    if (sh('git', ['fetch', 'origin', 'main'], checkout, true).code !== 0) refuse('git fetch origin main failed');
    if (sh('git', ['merge-base', '--is-ancestor', sha, 'origin/main'], checkout).code !== 0) refuse(`${sha} is not on origin/main`);
    const dirty = sh('git', ['status', '--porcelain'], checkout).out.trim();
    if (dirty) refuse(`the canary checkout has changes; it is the canary's alone, so nothing should edit it:\n${dirty}`);
    if (sh('git', ['checkout', '--detach', sha], checkout, true).code !== 0) refuse(`git checkout --detach ${sha} failed`);
    if (sh('git', ['rev-parse', 'HEAD'], checkout).out.trim() !== sha) refuse('HEAD is not the commit asked for');
    console.log('npm ci …');
    if (sh('npm', ['ci'], checkout, true).code !== 0) refuse('npm ci failed');
    console.log('npm run -w @prism3/plugin build …');
    const build = sh('npm', ['run', '-w', '@prism3/plugin', 'build'], checkout, true);
    process.stdout.write(build.out);
    if (build.code !== 0) refuse('the plugin build failed');
    const stamp = parseStamp(build.out);
    if (!stamp) refuse('the build printed no stamp line');
    const builtFrom = builtFromLine(stamp!)!;
    const cmds = sh('npx', ['tsx', 'tools/figma-canary/judge.ts', '--commands'], checkout);
    if (cmds.code !== 0) refuse(`judge.ts --commands failed:\n${cmds.err}`);

    mkdirSync(runDir, { recursive: true });
    writeFileSync(resolve(runDir, 'build.json'), `${JSON.stringify({ commit: sha, stamp, builtFrom }, null, 2)}\n`);
    writeFileSync(resolve(runDir, 'commands.json'), cmds.out);
    const key = opt('file-key');
    console.log([
      '',
      `Built ${sha}: ${builtFrom}`,
      `Run directory: ${runDir}`,
      '',
      'Next, in order:',
      key ? `  1. Open the scratch file in Figma desktop: https://www.figma.com/design/${key}/` : '  1. Open the scratch file in Figma desktop (its link is in your job config).',
      `  2. Run the development plugin imported from ${resolve(checkout, 'apps/plugin/manifest.json')}.`,
      '  3. Ask the owner to switch Agent link on (#3215 Q-C2 C). Wait for figma_status to say connected: true.',
      '     Run the bridge server from this checkout: npx tsx tools/figma-bridge/server.ts',
      '  4. Send each with figma_run, args from commands.json, and save each response verbatim:',
      ...RUN_KEYS.map((k, i) => `       ${String.fromCharCode(97 + i)}. ${k === 'status-after' ? 'status (again, last)' : k}${k === 'run-code' ? ' (the descriptor read in the README)' : ''} → ${resolve(runDir, `${k}.json`)}`),
      '     If status does not name the scratch file, stop after it.',
      `  5. npx tsx tools/figma-canary/job.ts collect --run-dir ${runDir}`,
      '     Return the run file it writes, verbatim. Do not judge it.',
    ].join('\n'));
  } else if (mode === 'collect') {
    const runDirArg = opt('run-dir');
    if (!runDirArg) usage();
    const runDir = resolve(runDirArg!);
    let build: { commit: string; stamp: string; builtFrom: string };
    try { build = JSON.parse(readFileSync(resolve(runDir, 'build.json'), 'utf8')); } catch (e) { refuse(`no build.json in ${runDir}: ${(e as Error).message}`); }
    const saved: Record<string, string> = {};
    for (const k of RUN_KEYS) { const f = resolve(runDir, `${k}.json`); if (existsSync(f)) saved[k] = readFileSync(f, 'utf8'); }
    const out = resolve(opt('out') ?? resolve(runDir, 'run.json'));
    writeFileSync(out, `${JSON.stringify(assemble(build!, saved), null, 1)}\n`);
    const missing = RUN_KEYS.filter((k) => !(k in saved));
    console.log(`wrote ${out} (${Object.keys(saved).length} responses${missing.length ? `; not saved: ${missing.join(', ')}` : ''})`);
  } else usage();
}
