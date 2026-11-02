/**
 * THE CANARY'S JUDGE (#3215, owner decisions of 2026-11-01): reads the raw result envelopes the Mac returned from a
 * read-only run on the scratch file, and says whether the owner can be told to rebuild.
 *
 *   npx tsx tools/figma-canary/judge.ts <envelopes.json> --expect <commit> [--file-name '<scratch file name>']
 *   npx tsx tools/figma-canary/judge.ts --commands     # the commands the Mac sends, as JSON, the house brand filled in
 *
 * `<envelopes.json>` is a JSON array of the plugin's result envelopes (`apps/plugin/src/agent-protocol.ts`
 * `AgentResult`), verbatim, as `figma_run` returned them. `--expect` is the main commit the Mac was asked to build.
 * It prints a per-command PASS/FAIL table, then one line: `safe to rebuild from <commit>` or `held: <reason>`.
 *
 * A TOOL, NOT A GATE (`tools/CLAUDE.md`): a live Figma host is not in CI, so this answers and exits 0 either way. It
 * exits 2 only when it cannot answer at all (no file, not JSON, no `--expect`).
 *
 * The orchestrator runs this on the envelopes itself; the Mac never reports PASS (Q-C1 A). Each check is written
 * against the envelope as the plugin sends it, never against anything the Mac summarized.
 *
 * WHAT IT HOLDS ON, per command:
 *   · the envelope is missing, or there are two for one command;
 *   · a host error: `error` is set (`handler-threw`, `bad-args`, `unknown-command`, `busy`, `link-off`, …);
 *   · `ok` is not true, or the dispatcher marked the result (`data.noVerdict`, `data.earlierVerdicts`);
 *   · an exception's text in the verdict, a refusal reason, a blocker or a log line (`EXCEPTION`, below; #3209's
 *     `'get' on proxy` is the one that started this);
 *   · `status`: the build stamp's commit (#3253's stamp, `<ISO> tree-<8 hex> <commit>`) is not `--expect`, or is
 *     `-dirty` or `git-unavailable`, or is missing; the build does not list a command the canary sends; with
 *     `--file-name`, the file is not the scratch file;
 *   · a write: `update-components` came back as an apply rather than a dry run, or `prune` as applied.
 * `run-code` (the host-descriptor read, dev builds only) is RECORDED, never judged: it measures, it cannot fail.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The read-only commands the Mac sends, in order. `prune` carries the house brand (filled in by `--commands`). */
export const CANARY_COMMANDS = ['status', 'readback', 'update-components', 'prune'] as const;
export type CanaryCmd = (typeof CANARY_COMMANDS)[number];
/** Recorded, not judged. */
export const RECORDED_COMMANDS = ['run-code'] as const;

/** Text that means something threw, wherever it turns up in a verdict, a refusal, a blocker or a log line. */
export const EXCEPTION = [
  /'get' on proxy/, /is not a function/, /Cannot read propert/, /Cannot assign to read only property/,
  /TypeError/, /ReferenceError/, /RangeError/, /THREW/, /✗ check failed/, /is a read-only and non-configurable/,
];

type Envelope = {
  v?: number; id?: string; cmd?: string; ok?: boolean; error?: { code?: string; message?: string };
  result?: { verdict?: Record<string, unknown> | null; data?: Record<string, unknown>; logs?: string[] };
};
export type Row = { cmd: string; status: 'PASS' | 'FAIL' | 'RECORDED'; why: string };
export type Judgement = { rows: Row[]; safe: boolean; line: string };

const firstMatch = (texts: string[]): string | null => {
  for (const t of texts) for (const re of EXCEPTION) { const m = re.exec(t); if (m) return t.length > 240 ? `${t.slice(0, 240)}…` : t; }
  return null;
};
const strings = (x: unknown, out: string[] = []): string[] => {
  if (typeof x === 'string') out.push(x);
  else if (Array.isArray(x)) for (const y of x) strings(y, out);
  else if (x && typeof x === 'object') for (const y of Object.values(x)) strings(y, out);
  return out;
};

/** The commit field of a build stamp, or why there is none. */
export const stampCommit = (build: unknown): { commit: string } | { why: string } => {
  if (typeof build !== 'string') return { why: 'status carries no build stamp' };
  const m = /^\S+ tree-[0-9a-f]{8} (\S+)$/.exec(build);
  if (!m) return { why: `the build stamp has no commit field ("${build}"): built before #3253, or not a plugin build` };
  if (m[1] === 'git-unavailable') return { why: `the build could not read its commit ("${build}")` };
  if (m[1].endsWith('-dirty')) return { why: `built from a tree with uncommitted changes ("${build}")` };
  if (!/^[0-9a-f]{7,40}$/.test(m[1])) return { why: `the build stamp's commit field is not a commit ("${m[1]}")` };
  return { commit: m[1] };
};
const sameCommit = (a: string, b: string): boolean => a.length >= 7 && b.length >= 7 && (a.startsWith(b) || b.startsWith(a));

/** Judge one run. Pure: the envelopes, the expected commit, and the scratch file's name when it is known. */
export const judge = (envelopes: unknown, expect: string, opts: { fileName?: string } = {}): Judgement => {
  const rows: Row[] = [];
  const list = (Array.isArray(envelopes) ? envelopes : []) as Envelope[];
  if (!Array.isArray(envelopes)) rows.push({ cmd: '(input)', status: 'FAIL', why: 'the envelopes are not a JSON array' });
  for (const cmd of CANARY_COMMANDS) {
    const mine = list.filter((e) => e && e.cmd === cmd);
    const fail = (why: string) => rows.push({ cmd, status: 'FAIL', why });
    if (mine.length === 0) { fail('no envelope came back for this command'); continue; }
    if (mine.length > 1) { fail(`${mine.length} envelopes came back for one command`); continue; }
    const e = mine[0];
    if (e.error) { fail(`host error ${e.error.code ?? '?'}: ${e.error.message ?? ''}`); continue; }
    const verdict = e.result?.verdict ?? null;
    const data = e.result?.data ?? {};
    const headline = verdict && typeof verdict.headline === 'string' ? verdict.headline : '';
    // The headline names the outcome (#3209's: `✗ check failed`); the exception's own text is in the summary or lines.
    const quoted = firstMatch([...strings(verdict).filter((t) => t !== headline), ...(e.result?.logs ?? [])]) ?? firstMatch([headline]);
    if (e.ok !== true) { fail(`ok: ${String(e.ok)}${headline ? ` — ${headline}` : ''}${quoted && quoted !== headline ? ` — ${quoted}` : ''}`); continue; }
    if ('noVerdict' in data) { fail(`no verdict: ${String(data.noVerdict)}`); continue; }
    if ('earlierVerdicts' in data) { fail('more than one verdict came back'); continue; }
    const update = data.update as { mode?: string; refused?: { reason?: string }[]; sets?: { blockers?: string[] }[] } | undefined;
    const thrown = quoted ?? firstMatch([...strings(update?.refused ?? []), ...strings((update?.sets ?? []).map((s) => s.blockers ?? []))]);
    if (thrown) { fail(`an exception's text: ${thrown}`); continue; }
    if (cmd === 'status') {
      const s = (data.status ?? {}) as { build?: unknown; file?: { name?: unknown }; commands?: unknown };
      const c = stampCommit(s.build);
      if ('why' in c) { fail(c.why); continue; }
      if (!sameCommit(c.commit, expect)) { fail(`the plugin was built from ${c.commit}, not ${expect}: a stale or wrong build proves nothing`); continue; }
      const listed = Array.isArray(s.commands) ? (s.commands as string[]) : [];
      const absent = CANARY_COMMANDS.filter((x) => !listed.includes(x));
      if (absent.length) { fail(`the build does not answer ${absent.join(', ')}`); continue; }
      if (opts.fileName !== undefined && s.file?.name !== opts.fileName) { fail(`the open file is "${String(s.file?.name)}", not the scratch file "${opts.fileName}"`); continue; }
      rows.push({ cmd, status: 'PASS', why: `built from ${c.commit}${opts.fileName !== undefined ? `, in "${opts.fileName}"` : ''}` });
      continue;
    }
    if (cmd === 'update-components' && update?.mode !== 'preview') { fail(`not a dry run: data.update.mode is ${JSON.stringify(update?.mode)}, not "preview"`); continue; }
    if (cmd === 'prune' && (verdict?.applied !== false || 'pruneApplied' in data)) { fail('not a preview: the prune was applied'); continue; }
    rows.push({ cmd, status: 'PASS', why: headline || (typeof verdict?.summary === 'string' ? verdict.summary : '') || 'ok' });
  }
  for (const cmd of RECORDED_COMMANDS) {
    const e = list.find((x) => x && x.cmd === cmd);
    if (e) rows.push({ cmd, status: 'RECORDED', why: e.error ? `not measured: ${e.error.code} ${e.error.message ?? ''}` : 'measured; see result.data.value' });
  }
  const unknown = list.filter((e) => !e || ![...CANARY_COMMANDS, ...RECORDED_COMMANDS].includes(e.cmd as CanaryCmd));
  if (unknown.length) rows.push({ cmd: '(other)', status: 'FAIL', why: `envelopes for commands the canary does not send: ${unknown.map((e) => e?.cmd ?? '?').join(', ')}` });
  const failed = rows.filter((r) => r.status === 'FAIL');
  const safe = failed.length === 0;
  return { rows, safe, line: safe ? `safe to rebuild from ${expect}` : `held: ${failed.map((r) => `${r.cmd} — ${r.why}`).join('; ')}` };
};

export const render = (j: Judgement): string => {
  const w = Math.max(...j.rows.map((r) => r.cmd.length), 7);
  return [...j.rows.map((r) => `  ${r.cmd.padEnd(w)}  ${r.status.padEnd(8)}  ${r.why}`), '', j.line].join('\n');
};

/** The commands the Mac sends, args included: `prune` previews against the engine's house brand. */
export const commands = async (): Promise<{ cmd: string; args: Record<string, unknown> }[]> => {
  const { brandFromDesignMd } = await import('../../apps/plugin/mcp-paste');
  const here = dirname(fileURLToPath(import.meta.url));
  const input = brandFromDesignMd(readFileSync(resolve(here, '../../packages/engine/examples/prism3.design.md'), 'utf8'));
  return [
    { cmd: 'status', args: {} },
    { cmd: 'readback', args: {} },
    { cmd: 'update-components', args: { confirm: false } },
    { cmd: 'prune', args: { input, confirm: false } },
  ];
};

const isMain = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  if (argv.includes('--commands')) {
    process.stdout.write(`${JSON.stringify(await commands(), null, 2)}\n`);
    process.exit(0);
  }
  const file = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
  const expect = opt('expect');
  if (!file || !expect) { console.error('usage: judge.ts <envelopes.json> --expect <commit> [--file-name <name>] · judge.ts --commands'); process.exit(2); }
  let envelopes: unknown;
  try { envelopes = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8')); } catch (e) { console.error(`judge.ts: cannot read ${file}: ${(e as Error).message}`); process.exit(2); }
  console.log(render(judge(envelopes, expect, { fileName: opt('file-name') })));
}
