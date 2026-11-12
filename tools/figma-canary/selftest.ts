/**
 * THE CANARY'S SELF-TEST (#3215): the judge over recorded envelopes, and the path rule over literal paths.
 *
 *   npx tsx tools/figma-canary/selftest.ts
 *
 * A self-check the author runs, NOT a CI step (`tools/CLAUDE.md`): it exits 1 when an arm fails, so a change to the judge
 * or the rule is checked before it is trusted with a real run.
 *
 * THE FIXTURES (`fixtures/`) are run files (`job.ts collect`'s shape) of envelopes in the plugin's result shape, written by
 * hand to the shape `agent-dispatch.ts` produces. `pass.json` is a good run. One bad run per check the brief names, each a
 * whole file so it can be read on its own:
 *   · `bad-commit.json`  — the job asked for the right commit, but the owner's build ran an older one (Q20 A);
 *   · `bad-error.json`   — a read-only command answered with a host error;
 *   · `bad-file.json`    — the closing `status` reports another file: the bridge moved to another plugin mid-run (#3297);
 *   · `bad-shape.json`   — a response that does not parse against the protocol's shape;
 *   · `3209.json`        — #3209's error verbatim, as the real host returned it through the agent link on 2026-10-31:
 *     `update-components { confirm: false }` failed its check with the Proxy invariant.
 * Every fixture carries a `set-override` preview response (#3394 §5b), hand-written to the plugin's shape after the runs
 * above were recorded, and lists `set-override` among its build's commands: the real runs predate the command.
 * The arms after them are `pass.json` with one edit, so each tests one check. The first live run is worth adding.
 *
 * INDEPENDENCE (docs/34): the expected rows, reasons and lines are literals here, never computed by the judge's code; the
 * judge's own protocol shapes are literals too, never read from the plugin.
 * BY-NAME MUTATIONS (proven red in the PR): the exception scan dropped from the judge → `3209/update-components`; the
 * stamp's commit compare made to accept any commit → `bad-commit/status`; the closing status's file compare dropped →
 * `bad-file/status-after`; the transport check dropped → `bad-shape/readback`; the run's requested-commit compare dropped
 * → `asked/run`; the stamp check's commit compare dropped → `check/stale`; its file compare dropped → `check/file`; a
 * stamp with no usable commit let through → `check/dirty`; its `cmd` guard dropped → `check/wrong-cmd`; the commit
 * compare loosened to accept any commit (an "or later" with no ancestry check) → `bad-commit/status`, `check/later`; the
 * `set-override` preview check dropped → `wrote/set-override`; its no-op compare dropped → `noop/set-override` (#3394).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judge, type Judgement } from './judge';
import { assemble, stampCheck } from './job';
import { decide, figmaApis } from './needs-check';

const HERE = dirname(fileURLToPath(import.meta.url));
const load = (f: string) => JSON.parse(readFileSync(resolve(HERE, 'fixtures', f), 'utf8')) as Record<string, any>;
const EXPECT = 'a5f203b3';
const SCRATCH = 'Prism3 canary (scratch)';
const KEYS = ['status', 'readback', 'update-components', 'prune', 'set-override', 'status-after'];

let failures = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed += 1;
  if (cond) console.log(`  ✓ ${label}`);
  else { failures += 1; console.log(`  ✗ ${label}`); }
};
const row = (j: Judgement, cmd: string) => j.rows.find((r) => r.cmd === cmd);
/** One case: the rows that must FAIL (by key, each with text its reason must carry); every other row PASS or RECORDED. */
const held = (name: string, j: Judgement, fails: Record<string, string>) => {
  const wrong = Object.entries(fails).filter(([cmd, text]) => row(j, cmd)?.status !== 'FAIL' || !row(j, cmd)!.why.includes(text));
  const extra = j.rows.filter((r) => r.status === 'FAIL' && !(r.cmd in fails)).map((r) => r.cmd);
  ok(!j.safe && j.line.startsWith('held: ') && wrong.length === 0 && extra.length === 0,
    `${name}: held, failing ${Object.keys(fails).join(', ')} by name (${j.line.slice(0, 220)})`);
};
const edit = (f: (responses: Record<string, any>, run: Record<string, any>) => void) => { const run = load('pass.json'); f(run.responses, run); return run; };

console.log('\njudge — the good run and one bad run per check');
{
  const j = judge(load('pass.json'), EXPECT, { fileName: SCRATCH });
  ok(j.safe && KEYS.every((c) => row(j, c)?.status === 'PASS') && j.line === 'checked, safe to rebuild from a5f203b3' && row(j, 'run-code')?.status === 'RECORDED',
    `pass/safe: every command PASS, the descriptor read RECORDED, "${j.line}"`);
  ok(judge(load('pass.json'), EXPECT).safe, 'pass/default-name: the scratch file name is the default');
  held('bad-commit/status', judge(load('bad-commit.json'), EXPECT), {
    status: 'built from 754d6944, not a5f203b3', 'status-after': 'built from 754d6944, not a5f203b3' });
  held('bad-error/prune', judge(load('bad-error.json'), EXPECT), { prune: 'host error handler-threw: figma.variables is undefined' });
  held('bad-file/status-after', judge(load('bad-file.json'), EXPECT), { 'status-after': 'the open file is "Untitled", not the scratch file "Prism3 canary (scratch)"' });
  held('bad-shape/readback', judge(load('bad-shape.json'), EXPECT), { readback: 'does not parse as a result envelope: transport is "socket"' });
  const k = judge(load('3209.json'), EXPECT);
  held('3209/update-components', k, { 'update-components': "✗ check failed — 'get' on proxy: property 'getLocalTextStylesAsync' is a read-only and non-configurable data property" });
  ok(k.line.startsWith('held: update-components — ok: false — ✗ check failed'), `3209/line: the held line names the command first (${k.line.slice(0, 80)})`);
}

console.log('\njudge — the build');
held('stale/status', judge(load('pass.json'), '754d6944'), {
  '(run)': 'not 754d6944', status: 'built from a5f203b3, not 754d6944', 'status-after': 'built from a5f203b3, not 754d6944' });
held('asked/run', judge(edit((_r, run) => { run.commit = '754d694400000000000000000000000000000000'; }), EXPECT), {
  '(run)': 'the job was asked to check "754d694400000000000000000000000000000000", not a5f203b3' });
/** The same stamp in both statuses. */
const stamped = (stamp: string) => edit((r) => { r.status.result.data.status.build = r['status-after'].result.data.status.build = stamp; });
held('dirty/status', judge(stamped('2026-11-02T09:14:07Z tree-5c0e8a31 a5f203b3-dirty'), EXPECT), { status: 'uncommitted changes', 'status-after': 'uncommitted changes' });
held('no-git/status', judge(stamped('2026-11-02T09:14:07Z tree-5c0e8a31 git-unavailable'), EXPECT), { status: 'could not read its commit', 'status-after': 'could not read its commit' });
held('old-stamp/status', judge(stamped('2026-10-31T11:02:00Z tree-7a00f94d'), EXPECT), { status: 'no commit field', 'status-after': 'no commit field' });
held('rebuilt/status-after', judge(edit((r) => { r['status-after'].result.data.status.build = '2026-11-02T09:30:00Z tree-5c0e8a31 a5f203b3'; }), EXPECT), {
  'status-after': 'the build changed during the run' });
held('commands/status', judge(edit((r) => { r.status.result.data.status.commands = ['status', 'readback', 'prune']; }), EXPECT), { status: 'does not answer update-components' });
held('file/status', judge(load('pass.json'), EXPECT, { fileName: 'Some other file' }), {
  status: 'not the scratch file "Some other file"', 'status-after': 'not the scratch file "Some other file"' });
ok(judge(load('pass.json'), 'a5f203b3c1d2e3f4a5b6').safe, 'long-sha/status: a full commit matches the stamp\'s short one');

console.log('\njudge — each command');
held('missing/readback', judge(edit((r) => { delete r.readback; }), EXPECT), { readback: 'no response came back' });
held('missing/status-after', judge(edit((r) => { delete r['status-after']; }), EXPECT), { 'status-after': 'no response came back' });
held('wrong-key/readback', judge(edit((r) => { r.readback = r.prune; }), EXPECT), { readback: 'the response is for "prune", not "readback"' });
held('link-off/status', judge(edit((r) => { const e = r.status; delete e.result; e.ok = false; e.error = { code: 'link-off', message: 'the owner switched the link off' }; }), EXPECT), {
  status: 'host error link-off' });
held('no-verdict/readback', judge(edit((r) => { r.readback.result.data.noVerdict = 'the handler returned without reporting a verdict'; }), EXPECT), { readback: 'no verdict' });
held('two-verdicts/readback', judge(edit((r) => { r.readback.result.data.earlierVerdicts = [{}]; }), EXPECT), { readback: 'more than one verdict' });
held('blocker/update-components', judge(edit((r) => { r['update-components'].result.data.update.sets[0].blockers = ["can't be checked: TypeError: node.findAll is not a function"]; }), EXPECT), { 'update-components': "an exception's text: can't be checked: TypeError" });
held('refused/update-components', judge(edit((r) => { r['update-components'].result.data.update.refused = [{ def: 'link', reason: "Cannot read properties of undefined (reading 'children')" }]; }), EXPECT), { 'update-components': "an exception's text: Cannot read properties" });
held('log/readback', judge(edit((r) => { r.readback.result.logs = ['[error] ReferenceError: seedModes is not defined']; }), EXPECT), { readback: 'ReferenceError' });
held('wrote/update-components', judge(edit((r) => { r['update-components'].result.data.update.mode = 'apply'; }), EXPECT), { 'update-components': 'not a dry run' });
held('wrote/prune', judge(edit((r) => { r.prune.result.verdict.applied = true; }), EXPECT), { prune: 'the prune was applied' });
// #3394 §5b: the color override preview — never a write, no new miss, a hash, and a no-op on the house brand.
held('wrote/set-override', judge(edit((r) => { r['set-override'].result.verdict.preview = false; r['set-override'].result.verdict.applied = true; }), EXPECT), { 'set-override': 'the overrides were written' });
held('misses/set-override', judge(edit((r) => { r['set-override'].result.data.newMisses = [{ mode: 'light', role: 'interactive.primary.border.rest', against: 'background.primary', ratio: 2.4, min: 3 }]; }), EXPECT), {
  'set-override': 'a pair moved below its minimum' });
held('hash/set-override', judge(edit((r) => { delete r['set-override'].result.data.previewHash; }), EXPECT), { 'set-override': 'no previewHash' });
held('noop/set-override', judge(edit((r) => { r['set-override'].result.data.changes[0].after.hex = '#8e8e92'; }), EXPECT), { 'set-override': 'not a no-op' });
held('other/command', judge(edit((r) => { r['build-components'] = r.readback; }), EXPECT), { '(other)': 'build-components' });
held('input/not-a-run', judge([], EXPECT), { '(run)': 'not a canary run file', status: 'no response', readback: 'no response', 'update-components': 'no response', prune: 'no response', 'set-override': 'no response', 'status-after': 'no response' });

console.log('\njudge — the protocol shape (literals, docs/34)');
const shaped = (name: string, f: (e: Record<string, any>) => void, text: string) =>
  held(`shape/${name}`, judge(edit((r) => f(r.readback)), EXPECT), { readback: `does not parse as a result envelope: ${text}` });
shaped('version', (e) => { e.v = 2; }, 'v is 2, not 1');
shaped('no-id', (e) => { delete e.id; }, 'id is not a non-empty string');
shaped('ok-type', (e) => { e.ok = 'true'; }, 'ok is not a boolean');
shaped('both', (e) => { e.error = { code: 'busy', message: 'x' }; }, 'carries both result and error');
shaped('neither', (e) => { delete e.result; }, 'carries neither result nor error');
shaped('error-code', (e) => { delete e.result; e.ok = false; e.error = { code: 'exploded', message: 'x' }; }, 'error.code "exploded" is not a code the protocol declares');
shaped('ok-beside-error', (e) => { delete e.result; e.error = { code: 'busy', message: 'x' }; }, 'ok is true beside an error');
shaped('data', (e) => { e.result.data = []; }, 'result.data is not an object');
shaped('logs', (e) => { e.result.logs = [1]; }, 'result.logs is not a list of strings');
shaped('bridge-timeout', (e) => { for (const k of Object.keys(e)) delete e[k]; e.error = "no result for 'readback' within 600000 ms"; }, 'v is undefined');

console.log('\njob — the Mac half: the stamp check on the first status (Q20 A)');
{
  const good = load('pass.json');
  const status = () => JSON.parse(JSON.stringify(good.responses.status));
  const FULL = 'a5f203b3c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6';
  const stop = (name: string, c: ReturnType<typeof stampCheck>, text: string) =>
    ok(!c.go && c.ask.includes(text), `${name}: stop, "${text}" (${c.go ? 'went on' : c.ask})`);
  const go = stampCheck(status(), FULL);
  ok(go.go && go.build === '2026-11-02T09:14:07Z tree-5c0e8a31 a5f203b3', 'check/go: the owner\'s build is the requested commit, in the scratch file');
  stop('check/stale', stampCheck(load('bad-commit.json').responses.status, FULL), `built from 754d6944, not ${FULL}; ask the owner to rebuild the plugin from ${FULL}`);
  const later = status(); later.result.data.status.build = '2026-11-03T10:00:00Z tree-5c0e8a31 b7e1c2d4';
  stop('check/later', stampCheck(later, FULL), 'ask the owner to rebuild the plugin from');
  const dirty = status(); dirty.result.data.status.build = '2026-11-02T09:14:07Z tree-5c0e8a31 a5f203b3-dirty';
  stop('check/dirty', stampCheck(dirty, FULL), 'built from a tree with uncommitted changes');
  const old = status(); old.result.data.status.build = '2026-10-31T11:02:00Z tree-7a00f94d';
  stop('check/no-commit', stampCheck(old, FULL), 'no commit field');
  stop('check/file', stampCheck(load('bad-file.json').responses['status-after'], FULL), 'the open file is "Untitled", not "Prism3 canary (scratch)"');
  stop('check/file-name', stampCheck(status(), FULL, 'Some other file'), 'not "Some other file"');
  const off = status(); delete off.result; off.ok = false; off.error = { code: 'link-off', message: 'off' };
  stop('check/link-off', stampCheck(off, FULL), 'status did not answer with a status result');
  const relabelled = status(); relabelled.cmd = 'readback';
  stop('check/wrong-cmd', stampCheck(relabelled, FULL), 'status did not answer with a status result');
}

console.log('\njob — collect');
{
  const good = load('pass.json');
  const saved = Object.fromEntries(Object.entries(good.responses).map(([k, v]) => [k, JSON.stringify(v)]));
  const run = assemble({ commit: good.commit }, saved);
  ok(JSON.stringify(run) === JSON.stringify(good) && judge(run, EXPECT).safe, 'job/collect: the saved responses assemble into the good run, keyed by command');
  const torn = assemble({ commit: good.commit }, { ...saved, readback: '{"v":1,' });
  held('job/collect-torn', judge(torn, EXPECT), { readback: 'does not parse as a result envelope: not an object' });
}

console.log('\nneeds-check — the path rule');
const none = { before: 45, after: 45 };
const say = (name: string, paths: string[], needed: boolean, text = '', rev = none, apis: string[] = []) => {
  const d = decide(paths, rev, apis);
  ok(d.needed === needed && (!text || d.reasons.some((r) => r.includes(text))), `${name}: ${needed ? 'check needed' : 'no check'} (${d.reasons.join('; ') || d.skipped.join('; ')})`);
};
say('rule/panel', ['apps/plugin/src/ui/styles.css', 'apps/studio/src/entry.ts'], false);
say('rule/docs-tests', ['docs/22-plugin-plan.md', 'apps/plugin/test-update-apply.ts', 'apps/plugin/component-shim.ts', 'packages/engine/lint-paint.ts', 'README.md'], false);
say('rule/token-values', ['packages/engine/out/figma/aurora/color.json', 'packages/engine/examples/aurora.design.md'], false);
say('rule/read-path', ['apps/plugin/src/run-read.ts'], true, "apps/plugin/src/run-read.ts: the plugin's Figma-side code");
say('rule/agent-link', ['apps/plugin/src/agent-dispatch.ts'], true, 'agent-dispatch.ts');
say('rule/startup', ['apps/plugin/src/main.ts'], true, 'main.ts');
say('rule/build', ['apps/plugin/build.mjs'], true, 'build.mjs');
say('rule/manifest', ['apps/plugin/manifest-offline.json'], true, 'a manifest');
say('rule/engine-code', ['packages/engine/theme.ts'], true, 'on neither list');
say('rule/revision', ['docs/x.md'], true, 'EXECUTOR_REVISION raised (45 → 46)', { before: 45, after: 46 });
say('rule/new-api', ['docs/x.md'], true, "a Figma API the plugin hasn't called before: figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync", none, ['figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync']);
const apis = figmaApis("const s = await figma.getLocalTextStylesAsync(); figma.root.findAllWithCriteria({}); const x = notfigma.y;");
ok(apis.has('figma.getLocalTextStylesAsync') && apis.has('figma.root.findAllWithCriteria') && apis.size === 2, `rule/api-read: figma. paths are read from code (${[...apis].join(', ')})`);

console.log(failures ? `\n❌ ${failures} FAILED — ${executed} assertions executed` : `\n✅ ALL PASS — ${executed} assertions executed`);
if (failures) process.exit(1);
