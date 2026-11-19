/**
 * THE CANARY'S MAC JOB (#3215, owner decisions of 2026-11-01 and 2026-11-03, Q20 A): the scripted halves of one run on
 * the OWNER'S NORMAL PLUGIN BUILD. Figma desktop allows one imported Prism3 plugin at a time, so the job builds nothing
 * and keeps no checkout of its own: it checks that the build the owner already runs is the commit asked for, and stops
 * if it isn't. The Mac session runs `prepare`, the owner opens the scratch file and switches Agent link on, the session
 * sends `status`, runs `check`, then (only if `check` says go on) sends the rest, saving each response as it came back,
 * and runs `collect`. It never judges: `judge.ts` is the orchestrator's (Q-C1 A).
 *
 *   npx tsx tools/figma-canary/job.ts prepare <full sha> --run-dir <dir> [--file-key <key>]
 *   npx tsx tools/figma-canary/job.ts check   --run-dir <dir> [--file-name '<scratch file name>']
 *   npx tsx tools/figma-canary/job.ts collect --run-dir <dir> [--out <file>]
 *
 * `prepare` writes `request.json` (`{ commit }`, the commit asked for) and `commands.json` (`judge.ts --commands`) into
 * the run directory and prints the steps. It builds nothing, clones nothing and checks nothing out. `--file-key` is the
 * scratch file's key. It is used for ONE printed line (the link to open the file) and written nowhere: this is a public
 * repo, and the key stays in the Mac's job config.
 *
 * `check` is THE STAMP CHECK, run on the first `status` before any other command: the build stamp the plugin reports
 * (`result.data.status.build`, #3253's `<ISO> tree-<8 hex> <commit>`) must name the requested commit, from a clean tree,
 * and the open file must be the scratch file. If not, it prints what to ask the owner (rebuild from the commit, or open
 * the scratch file) and exits 1, and the session sends nothing else. The match is exact: a later commit is not accepted.
 * The judge checks the same thing again on the run file, so this is the Mac's stop, not the guarantee.
 *
 * `collect` reads `request.json` and each `<key>.json` the session saved in the run directory (`status`, `readback`,
 * `update-components`, `prune`, `set-override`, `run-code`, `status-after`), verbatim, and writes one run file keyed by command:
 * `{ format, commit, responses }`. A response the session did not save is left out, and the judge holds on it. A saved
 * file that is not JSON is kept as its text, and the judge holds on that too.
 *
 * READS ONLY: nothing here writes to the Figma file or to a git tree. A TOOL (`tools/CLAUDE.md`): not in `ci.yml`, with
 * no trigger of its own. It exits 1 when `check` says stop or a step cannot run, and 2 on bad usage. The pure parts
 * (`stampCheck`, `assemble`) are exercised by `selftest.ts`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUN_FORMAT, RUN_KEYS, SCRATCH_FILE, sameCommit, stampCommit } from './judge';

/**
 * The stamp check on the first `status` response, as `figma_run` returned it. Pure. `go` only when the response is a
 * `status` result naming the scratch file, built from the requested commit with no uncommitted changes.
 */
export const stampCheck = (status: unknown, commit: string, fileName: string = SCRATCH_FILE): { go: true; build: string } | { go: false; ask: string } => {
  const s = status as { cmd?: unknown; result?: { data?: { status?: { build?: unknown; file?: { name?: unknown } } } } } | null;
  const st = s && typeof s === 'object' && s.cmd === 'status' ? s.result?.data?.status : undefined;
  if (!st) return { go: false, ask: 'status did not answer with a status result; check the link is on and connected, then send status again' };
  if (st.file?.name !== fileName) return { go: false, ask: `the open file is "${String(st.file?.name)}", not "${fileName}"; ask the owner to open the scratch file, then send status again` };
  const c = stampCommit(st.build);
  if ('why' in c) return { go: false, ask: `${c.why}; ask the owner to rebuild the plugin from ${commit}` };
  if (!sameCommit(c.commit, commit)) return { go: false, ask: `the plugin was built from ${c.commit}, not ${commit}; ask the owner to rebuild the plugin from ${commit}` };
  return { go: true, build: st.build as string };
};

/** One run file from the requested commit and the saved responses, keyed by command. Pure. */
export const assemble = (request: { commit: string }, saved: Record<string, string>): Record<string, unknown> => {
  const responses: Record<string, unknown> = {};
  for (const [key, text] of Object.entries(saved)) {
    try { responses[key] = JSON.parse(text); } catch { responses[key] = text; }
  }
  return { format: RUN_FORMAT, commit: request.commit, responses };
};

const refuse = (why: string): never => { console.error(`job.ts: refused — ${why}`); process.exit(1); };
const usage = (): never => {
  console.error([
    'usage: job.ts prepare <full sha> --run-dir <dir> [--file-key <key>]',
    '       job.ts check --run-dir <dir> [--file-name <name>]',
    '       job.ts collect --run-dir <dir> [--out <file>]',
  ].join('\n'));
  process.exit(2);
};
const readRequest = (runDir: string): { commit: string } => {
  try {
    const r = JSON.parse(readFileSync(resolve(runDir, 'request.json'), 'utf8'));
    if (typeof r?.commit !== 'string') throw new Error('no commit');
    return r;
  } catch (e) { return refuse(`no request.json with a commit in ${runDir} (run prepare first): ${(e as Error).message}`); }
};

const isMain = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [mode, ...argv] = process.argv.slice(2);
  const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const here = dirname(fileURLToPath(import.meta.url));
  const runDirArg = opt('run-dir');
  if (!runDirArg) usage();
  const runDir = resolve(runDirArg!);

  if (mode === 'prepare') {
    const sha = argv[0];
    if (!sha || sha.startsWith('--')) usage();
    if (!/^[0-9a-f]{40}$/.test(sha)) refuse(`"${sha}" is not a full 40-character commit; the run checks one exact commit`);
    const cmds = spawnSync('npx', ['tsx', resolve(here, 'judge.ts'), '--commands'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (cmds.status !== 0) refuse(`judge.ts --commands failed:\n${cmds.stderr}`);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(resolve(runDir, 'request.json'), `${JSON.stringify({ commit: sha }, null, 2)}\n`);
    writeFileSync(resolve(runDir, 'commands.json'), cmds.stdout);
    const key = opt('file-key');
    const me = 'npx tsx tools/figma-canary/job.ts';
    console.log([
      `Canary for ${sha}, on the owner's normal plugin build. Nothing was built.`,
      `Run directory: ${runDir}`,
      '',
      'Next, in order:',
      key ? `  1. Open the scratch file in Figma desktop: https://www.figma.com/design/${key}/` : '  1. Open the scratch file in Figma desktop (its link is in your job config).',
      '  2. Ask the owner to run their Prism3 plugin in it and switch Agent link on (#3215 Q-C2 C).',
      '     Wait for figma_status to say connected: true.',
      `  3. Send status with figma_run and save the response verbatim → ${resolve(runDir, 'status.json')}`,
      `  4. ${me} check --run-dir ${runDir}`,
      '     If it says stop, send nothing else: pass its request on to the owner, then collect and return.',
      '  5. Send each with figma_run, args from commands.json, and save each response verbatim:',
      ...RUN_KEYS.filter((k) => k !== 'status').map((k, i) => `       ${String.fromCharCode(97 + i)}. ${k === 'status-after' ? 'status (again, last)' : k}${k === 'run-code' ? ' (the descriptor read in the README)' : ''} → ${resolve(runDir, `${k}.json`)}`),
      `  6. ${me} collect --run-dir ${runDir}`,
      '     Return the run file it writes, verbatim. Do not judge it.',
    ].join('\n'));
  } else if (mode === 'check') {
    const { commit } = readRequest(runDir);
    let status: unknown;
    try { status = JSON.parse(readFileSync(resolve(runDir, 'status.json'), 'utf8')); } catch (e) { refuse(`no readable status.json in ${runDir}: ${(e as Error).message}`); }
    const c = stampCheck(status, commit, opt('file-name'));
    if (c.go) console.log(`go on: the plugin reports ${c.build}, built from ${commit}, in the scratch file`);
    else { console.log(`stop: ${c.ask}`); process.exit(1); }
  } else if (mode === 'collect') {
    const request = readRequest(runDir);
    const saved: Record<string, string> = {};
    for (const k of RUN_KEYS) { const f = resolve(runDir, `${k}.json`); if (existsSync(f)) saved[k] = readFileSync(f, 'utf8'); }
    const out = resolve(opt('out') ?? resolve(runDir, 'run.json'));
    writeFileSync(out, `${JSON.stringify(assemble(request, saved), null, 1)}\n`);
    const missing = RUN_KEYS.filter((k) => !(k in saved));
    console.log(`wrote ${out} (${Object.keys(saved).length} responses${missing.length ? `; not saved: ${missing.join(', ')}` : ''})`);
  } else usage();
}
