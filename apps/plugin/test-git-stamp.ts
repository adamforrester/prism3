/**
 * GIT STAMP test (#3239, owner decision Q-SI1 A) — every plugin build stamps the commit it came from, warns when the
 * checkout is behind `origin/main`, and says so plainly when git cannot run.
 *
 *   npx tsx apps/plugin/test-git-stamp.ts
 *
 * Git is STUBBED: each case hands `git-stamp.mjs` a `run` that answers from a table, so the test depends on nothing
 * about the machine (no repository, no remote, no network). The stub records every call, so a case also proves which
 * git commands the build runs.
 *
 * INDEPENDENCE (docs/34): the expected stamps and lines are literals written here. ACTUAL is what the real
 * `composeBuildId` and `behindStamp` return, and the stamp is read back through the plugin's own parser
 * (`apps/studio/src/build-identity.ts`), the one every surface renders from, so a stamp the build writes and the
 * panel cannot read fails too.
 *
 * BY-NAME MUTATION (proven red, then restored): `composeBuildId` returning `${builtAt} ${treeToken}` (the stamp drops
 * the commit) → "stamp/commit" fails, with "stamp/dirty", "stamp/no-git", "stamp/no-binary" and "link/commit".
 *
 * #3147 (the owner's Q3147.16 A): a release build REFUSES a dirty, unknown or behind checkout; a dev build, and a
 * release under `CI`, only warn. Section 5 drives `releaseCheck` with stubbed answers, then runs the REAL
 * `build.mjs --release` with a stand-in `git` first on `PATH` (a shell script answering from literals) and `CI` unset,
 * and requires it to exit 1 before writing a bundle. MUTATION: `releaseCheck` returning `refuse: false` when strict
 * (warn only) → "release/refuses-dirty", "release/refuses-no-git", "release/refuses-behind",
 * "release/refuses-unknown" and "release/build-refuses" fail, by name.
 */
import { behindStamp, commitStamp, composeBuildId, releaseCheck, NO_GIT } from './git-stamp.mjs';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBuildId } from '../studio/src/build-identity';
import { createAgentLink } from './src/agent-link';
import { MAILBOX } from './src/agent-protocol';

let failures = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed += 1;
  if (cond) console.log(`  ✓ ${label}`);
  else { failures += 1; console.log(`  ✗ ${label}`); }
};

type Reply = { status: number | null; stdout?: string; stderr?: string; error?: Error };
/** A stubbed git: answers by the command's first word, records every call. */
const stubGit = (replies: Record<string, Reply>) => {
  const calls: string[][] = [];
  const run = (args: string[]) => {
    calls.push(args);
    const r = replies[args[0]];
    if (!r) throw new Error(`stub git: unexpected command git ${args.join(' ')}`);
    return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', error: r.error };
  };
  return { run, calls };
};

const AT = '2026-11-01T04:10:00Z';
const TREE = 'tree-7a00f94d';
const quiet = () => undefined;

console.log('\n1. the stamp carries the commit');
{
  const g = stubGit({ 'rev-parse': { status: 0, stdout: '76a1636b\n' }, status: { status: 0, stdout: '' } });
  const id = composeBuildId(AT, TREE, g.run, quiet);
  const p = parseBuildId(id);
  ok(id === `${AT} ${TREE} 76a1636b` && p.kind === 'tree' && p.commit === '76a1636b',
    `stamp/commit: a clean checkout stamps its short commit beside the tree (got "${id}")`);
  ok(p.kind === 'tree' && p.tree === TREE && p.builtAt === AT, 'stamp/tree: the tree token and the time are unchanged');
  ok(g.calls.some((c) => c[0] === 'rev-parse' && c.includes('HEAD')), 'stamp/reads-head: the commit comes from HEAD');
}
{
  const g = stubGit({ 'rev-parse': { status: 0, stdout: '76a1636b\n' }, status: { status: 0, stdout: ' M apps/plugin/build.mjs\n' } });
  const p = parseBuildId(composeBuildId(AT, TREE, g.run, quiet));
  ok(p.kind === 'tree' && p.commit === '76a1636b-dirty', `stamp/dirty: a modified tree stamps "-dirty" (got ${p.kind === 'tree' ? p.commit : p.kind})`);
}
{
  const g = stubGit({ 'rev-parse': { status: 0, stdout: '76a1636b\n' }, status: { status: 0, stdout: '?? apps/plugin/src/new.ts\n' } });
  ok(commitStamp(g.run).field === '76a1636b-dirty', 'stamp/untracked: an untracked file counts as dirty, since it can be in the bundle');
}

console.log('\n2. git cannot run: said plainly, not stamped as nothing');
{
  // The license-prompt case: git starts, refuses, and exits non-zero with its reason on stderr.
  const g = stubGit({ 'rev-parse': { status: 69, stderr: 'You have not agreed to the license agreements.\n' } });
  const lines: string[] = [];
  const id = composeBuildId(AT, TREE, g.run, (w) => lines.push(w));
  const p = parseBuildId(id);
  ok(p.kind === 'tree' && p.commit === NO_GIT && NO_GIT === 'git-unavailable', `stamp/no-git: the stamp says "git-unavailable" (got "${id}")`);
  ok(lines.length > 0 && lines[0].startsWith('⚠ git did not run') && lines[0].includes('You have not agreed to the license agreements.'),
    `stamp/no-git-warning: the build prints a warning carrying git's own words (got ${JSON.stringify(lines[0])})`);
}
{
  const g = stubGit({ 'rev-parse': { status: null, error: Object.assign(new Error('spawnSync git ENOENT'), { code: 'ENOENT' }) } });
  const lines: string[] = [];
  const p = parseBuildId(composeBuildId(AT, TREE, g.run, (w) => lines.push(w)));
  ok(p.kind === 'tree' && p.commit === NO_GIT && lines.some((l) => l.includes('ENOENT')),
    'stamp/no-binary: git missing altogether stamps "git-unavailable" and names the error');
}
{
  const g = stubGit({ 'rev-parse': { status: 0, stdout: '76a1636b\n' }, status: { status: 128, stderr: 'fatal: index file corrupt\n' } });
  const r = commitStamp(g.run);
  ok(r.field === NO_GIT && r.warnings[0].includes('index file corrupt'), 'stamp/status-fails: a tree git cannot read is not stamped clean');
}

console.log('\n3. behind origin/main: a warning, never a failure');
{
  const g = stubGit({ fetch: { status: 0 }, 'rev-list': { status: 0, stdout: '3\n' } });
  const r = behindStamp(g.run);
  ok(r.behind === 3 && r.warnings.length === 1 && r.warnings[0] === '⚠ This checkout is 3 commits behind origin/main. Pull, then rebuild, to get the latest fixes.',
    `behind/count: a checkout 3 commits behind is warned, naming the count (got ${JSON.stringify(r.warnings)})`);
  ok(g.calls[0].join(' ') === 'fetch --quiet origin main' && g.calls[1].join(' ') === 'rev-list --count HEAD..origin/main',
    'behind/commands: it fetches origin main, then counts HEAD..origin/main');
}
{
  const r = behindStamp(stubGit({ fetch: { status: 0 }, 'rev-list': { status: 0, stdout: '1\n' } }).run);
  ok(r.warnings[0] === '⚠ This checkout is 1 commit behind origin/main. Pull, then rebuild, to get the latest fixes.', 'behind/one: one commit reads in the singular');
}
{
  const r = behindStamp(stubGit({ fetch: { status: 0 }, 'rev-list': { status: 0, stdout: '0\n' } }).run);
  ok(r.behind === 0 && r.warnings.length === 0, 'behind/current: a current checkout prints nothing');
}
{
  const r = behindStamp(stubGit({ fetch: { status: 128, stderr: 'fatal: unable to access remote\n' } }).run);
  ok(r.behind === null && r.warnings.length === 1 && r.warnings[0].includes('Could not fetch origin/main') && r.warnings[0].includes('unable to access remote'),
    'behind/no-fetch: a fetch that cannot run is one plain note, and the build goes on');
}

console.log('\n4. the agent link\'s `link` record carries the stamp, so an agent reads the commit from the file');
{
  const g = stubGit({ 'rev-parse': { status: 0, stdout: '76a1636b\n' }, status: { status: 0, stdout: '' } });
  const build = composeBuildId(AT, TREE, g.run, quiet);
  const data = new Map<string, string>();
  const root = {
    getSharedPluginData: (ns: string, key: string) => data.get(`${ns}/${key}`) ?? '',
    setSharedPluginData: (ns: string, key: string, v: string) => { data.set(`${ns}/${key}`, v); },
  };
  const link = createAgentLink({
    root: root as never, build, engineVersion: 'x',
    dispatch: async () => { throw new Error('no command expected'); },
    schedule: () => null, cancel: () => undefined,
  });
  link.setOn(true);
  let record: { build?: unknown } = {};
  try { record = JSON.parse(data.get(`${MAILBOX.ns}/${MAILBOX.link}`) ?? '{}'); } catch { /* reported below */ }
  const p = typeof record.build === 'string' ? parseBuildId(record.build) : null;
  ok(p !== null && p.kind === 'tree' && p.commit === '76a1636b',
    `link/commit: the link record written to the file carries the commit (read ${JSON.stringify(record.build)})`);
  link.setOn(false);
}

console.log('\n5. a release build refuses a dirty, unknown or behind checkout (#3147, Q3147.16 A)');
{
  const strict = true;
  const clean = releaseCheck('76a1636b', 0, strict);
  ok(!clean.refuse && clean.lines.length === 0, 'release/clean: a clean commit at the tip of origin/main builds, and prints nothing');
  const dirty = releaseCheck('76a1636b-dirty', 0, strict);
  ok(dirty.refuse && dirty.lines[0] === '✗ Release build refused: the working tree has changes not committed (76a1636b-dirty).',
    `release/refuses-dirty: a dirty tree is refused, naming the stamp (${JSON.stringify(dirty.lines[0])})`);
  const nogit = releaseCheck(NO_GIT, 0, strict);
  ok(nogit.refuse && nogit.lines[0] === '✗ Release build refused: git could not say which commit this is.', `release/refuses-no-git: a commit git cannot name is refused (${JSON.stringify(nogit.lines[0])})`);
  const behind = releaseCheck('76a1636b', 2, strict);
  ok(behind.refuse && behind.lines[0] === '✗ Release build refused: the checkout is 2 commits behind origin/main.', `release/refuses-behind: a checkout behind origin/main is refused (${JSON.stringify(behind.lines[0])})`);
  const unknown = releaseCheck('76a1636b', null, strict);
  ok(unknown.refuse && unknown.lines[0] === '✗ Release build refused: it cannot tell whether the checkout is behind origin/main.', `release/refuses-unknown: a checkout it cannot compare with origin/main is refused (${JSON.stringify(unknown.lines[0])})`);
  const both = releaseCheck('76a1636b-dirty', 1, strict);
  ok(both.refuse && both.problems.length === 2, 'release/every-reason: a dirty tree that is also behind names both reasons');
  const ci = releaseCheck('76a1636b-dirty', 1, false);
  ok(!ci.refuse && ci.lines[0] === '⚠ This release build is not one to publish (CI, so it builds anyway): the working tree has changes not committed (76a1636b-dirty); the checkout is 1 commit behind origin/main.',
    `release/ci-warns: under CI the same reasons are a warning and the build goes on (${JSON.stringify(ci.lines[0])})`);
}
{
  // The REAL build.mjs, with a stand-in git first on PATH. Answers are literals: a dirty tree at the tip of origin/main.
  const here = dirname(fileURLToPath(import.meta.url));
  const bin = mkdtempSync(join(tmpdir(), 'p3-fake-git-'));
  writeFileSync(join(bin, 'git'), [
    '#!/bin/sh',
    'while [ "$1" = "-C" ]; do shift 2; done',
    'case "$1" in',
    '  rev-parse) echo 76a1636b ;;',
    '  status) echo " M apps/plugin/build.mjs" ;;',
    '  fetch) exit 0 ;;',
    '  rev-list) echo 0 ;;',
    '  *) echo "stand-in git: unexpected $*" >&2; exit 2 ;;',
    'esac',
    '',
  ].join('\n'));
  chmodSync(join(bin, 'git'), 0o755);
  const outMain = join(here, 'release', 'main.js');
  const before = existsSync(outMain) ? statSync(outMain).mtimeMs : null;
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  delete env.CI;
  const r = spawnSync(process.execPath, [join(here, 'build.mjs'), '--release'], { cwd: here, env, encoding: 'utf8', timeout: 60000 });
  const after = existsSync(outMain) ? statSync(outMain).mtimeMs : null;
  ok(r.status === 1 && r.stderr.includes('✗ Release build refused: the working tree has changes not committed (76a1636b-dirty).') && before === after,
    `release/build-refuses: the real build.mjs --release exits 1 on a dirty tree and writes no bundle (exit ${r.status}, release/main.js ${before === after ? 'untouched' : 'rewritten'}; ${JSON.stringify((r.stderr || r.stdout).trim().split('\n').slice(-2))})`);
}

console.log(failures ? `\n❌ ${failures} FAILED — ${executed} assertions executed` : `\n✅ ALL PASS — ${executed} assertions executed`);
if (failures) process.exit(1);
