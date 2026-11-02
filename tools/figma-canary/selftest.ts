/**
 * THE CANARY'S SELF-TEST (#3215): the judge over recorded envelopes, and the path rule over literal paths.
 *
 *   npx tsx tools/figma-canary/selftest.ts
 *
 * A self-check the author runs, NOT a CI step (`tools/CLAUDE.md`): it exits 1 when an arm fails, so a change to the judge
 * or the rule is checked before it is trusted with a real run.
 *
 * THE FIXTURES (`fixtures/`) are envelopes in the plugin's result shape (`AgentResult`, `apps/plugin/src/agent-protocol.ts`),
 * written by hand to the shape `agent-dispatch.ts` produces. `3209.json` carries #3209's error verbatim, as the real host
 * returned it through the agent link on 2026-10-31: `update-components { confirm: false }` failed its check with the Proxy
 * invariant. The judge must hold on it and name the command and the invariant. Every other case below is `pass.json`
 * with one edit, so each arm tests one check. The first live run's envelopes are worth adding beside them.
 *
 * INDEPENDENCE (docs/34): the expected rows, reasons and lines are literals here, never computed by the judge's code.
 * BY-NAME MUTATIONS (proven red in the PR): the exception scan dropped from the judge → `3209/update-components`; the
 * stamp's commit compare made to accept any commit → `stale/status`.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judge, type Judgement } from './judge';
import { decide, figmaApis } from './needs-check';

const HERE = dirname(fileURLToPath(import.meta.url));
const load = (f: string) => JSON.parse(readFileSync(resolve(HERE, 'fixtures', f), 'utf8')) as Record<string, any>[];
const EXPECT = 'a5f203b3';
const SCRATCH = 'Prism3 canary (scratch)';

let failures = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed += 1;
  if (cond) console.log(`  ✓ ${label}`);
  else { failures += 1; console.log(`  ✗ ${label}`); }
};
const row = (j: Judgement, cmd: string) => j.rows.find((r) => r.cmd === cmd);
/** One case: the rows that must FAIL (by command, each with text its reason must carry); every other canary row PASS. */
const held = (name: string, j: Judgement, fails: Record<string, string>) => {
  const wrong = Object.entries(fails).filter(([cmd, text]) => row(j, cmd)?.status !== 'FAIL' || !row(j, cmd)!.why.includes(text));
  const extra = j.rows.filter((r) => r.status === 'FAIL' && !(r.cmd in fails)).map((r) => r.cmd);
  ok(!j.safe && j.line.startsWith('held: ') && wrong.length === 0 && extra.length === 0,
    `${name}: held, failing ${Object.keys(fails).join(', ')} by name (${j.line.slice(0, 220)})`);
};
const edit = (f: (run: Record<string, any>[]) => void) => { const run = load('pass.json'); f(run); return run; };
const byCmd = (run: Record<string, any>[], cmd: string) => run.find((e) => e.cmd === cmd)!;

console.log('\njudge — recorded envelopes');
{
  const j = judge(load('pass.json'), EXPECT, { fileName: SCRATCH });
  const pass = ['status', 'readback', 'update-components', 'prune'].every((c) => row(j, c)?.status === 'PASS');
  ok(j.safe && pass && j.line === 'safe to rebuild from a5f203b3' && row(j, 'run-code')?.status === 'RECORDED',
    `pass/safe: every command PASS, the descriptor read RECORDED, "${j.line}"`);
  const k = judge(load('3209.json'), EXPECT, { fileName: SCRATCH });
  held('3209/update-components', k, { 'update-components': "✗ check failed — 'get' on proxy: property 'getLocalTextStylesAsync' is a read-only and non-configurable data property" });
  ok(k.line.startsWith('held: update-components — ok: false — ✗ check failed'), `3209/line: the held line names the command first (${k.line.slice(0, 80)})`);
}

console.log('\njudge — the build');
held('stale/status', judge(load('pass.json'), '754d6944', { fileName: SCRATCH }), { status: 'built from a5f203b3, not 754d6944' });
held('dirty/status', judge(edit((r) => { byCmd(r, 'status').result.data.status.build = '2026-11-02T09:14:07Z tree-5c0e8a31 a5f203b3-dirty'; }), EXPECT), { status: 'uncommitted changes' });
held('no-git/status', judge(edit((r) => { byCmd(r, 'status').result.data.status.build = '2026-11-02T09:14:07Z tree-5c0e8a31 git-unavailable'; }), EXPECT), { status: 'could not read its commit' });
held('old-stamp/status', judge(edit((r) => { byCmd(r, 'status').result.data.status.build = '2026-10-31T11:02:00Z tree-7a00f94d'; }), EXPECT), { status: 'no commit field' });
held('commands/status', judge(edit((r) => { byCmd(r, 'status').result.data.status.commands = ['status', 'readback', 'prune']; }), EXPECT), { status: 'does not answer update-components' });
held('file/status', judge(load('pass.json'), EXPECT, { fileName: 'Some other file' }), { status: `not the scratch file "Some other file"` });
ok(judge(load('pass.json'), 'a5f203b3c1d2e3f4a5b6').safe, 'long-sha/status: a full commit matches the stamp\'s short one');

console.log('\njudge — each command');
held('missing/readback', judge(edit((r) => { r.splice(r.indexOf(byCmd(r, 'readback')), 1); }), EXPECT), { readback: 'no envelope came back' });
held('twice/readback', judge(edit((r) => { r.push(JSON.parse(JSON.stringify(byCmd(r, 'readback')))); }), EXPECT), { readback: '2 envelopes came back' });
held('error/prune', judge(edit((r) => { const e = byCmd(r, 'prune'); delete e.result; e.ok = false; e.error = { code: 'handler-threw', message: 'figma.variables is undefined' }; }), EXPECT), { prune: 'host error handler-threw: figma.variables is undefined' });
held('link-off/status', judge(edit((r) => { const e = byCmd(r, 'status'); delete e.result; e.ok = false; e.error = { code: 'link-off', message: 'the owner switched the link off' }; }), EXPECT), { status: 'host error link-off' });
held('no-verdict/readback', judge(edit((r) => { byCmd(r, 'readback').result.data.noVerdict = 'the handler returned without reporting a verdict'; }), EXPECT), { readback: 'no verdict' });
held('two-verdicts/readback', judge(edit((r) => { byCmd(r, 'readback').result.data.earlierVerdicts = [{}]; }), EXPECT), { readback: 'more than one verdict' });
held('blocker/update-components', judge(edit((r) => { byCmd(r, 'update-components').result.data.update.sets[0].blockers = ["can't be checked: TypeError: node.findAll is not a function"]; }), EXPECT), { 'update-components': "an exception's text: can't be checked: TypeError" });
held('refused/update-components', judge(edit((r) => { byCmd(r, 'update-components').result.data.update.refused = [{ def: 'link', reason: "Cannot read properties of undefined (reading 'children')" }]; }), EXPECT), { 'update-components': "an exception's text: Cannot read properties" });
held('log/readback', judge(edit((r) => { byCmd(r, 'readback').result.logs = ["[error] ReferenceError: seedModes is not defined"]; }), EXPECT), { readback: 'ReferenceError' });
held('wrote/update-components', judge(edit((r) => { byCmd(r, 'update-components').result.data.update.mode = 'apply'; }), EXPECT), { 'update-components': 'not a dry run' });
held('wrote/prune', judge(edit((r) => { byCmd(r, 'prune').result.verdict.applied = true; }), EXPECT), { prune: 'the prune was applied' });
held('other/command', judge(edit((r) => { r.push({ ...byCmd(r, 'readback'), cmd: 'build-components' }); }), EXPECT), { '(other)': 'build-components' });
held('input/not-array', judge({ envelopes: [] }, EXPECT), { '(input)': 'not a JSON array', status: 'no envelope', readback: 'no envelope', 'update-components': 'no envelope', prune: 'no envelope' });

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
