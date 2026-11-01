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
 */
import { behindStamp, commitStamp, composeBuildId, NO_GIT } from './git-stamp.mjs';
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

console.log(failures ? `\n❌ ${failures} FAILED — ${executed} assertions executed` : `\n✅ ALL PASS — ${executed} assertions executed`);
if (failures) process.exit(1);
