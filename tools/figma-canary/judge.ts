/**
 * THE CANARY'S JUDGE (#3215, owner decisions of 2026-11-01 and 2026-11-03): reads the run file the Mac's job wrote
 * (`job.ts collect`) from a read-only run on the scratch file, and says whether the owner can be told to rebuild.
 *
 *   npx tsx tools/figma-canary/judge.ts <run.json> --expect <commit> [--file-name '<scratch file name>']
 *   npx tsx tools/figma-canary/judge.ts --commands     # the commands the Mac sends, as JSON, the house brand filled in
 *
 * `<run.json>` is `{ format, commit, stamp, builtFrom, responses }`: `responses` is keyed by command (`status`,
 * `readback`, `update-components`, `prune`, `run-code`, then `status-after`, the closing `status`), each the plugin's
 * result envelope verbatim, as `figma_run` returned it. `--expect` is the main commit the Mac was asked to build.
 * `--file-name` defaults to `SCRATCH_FILE`. It prints a per-command PASS/FAIL table, then one line:
 * `checked, safe to rebuild from <commit>` or `held: <reason>; <reason>…`.
 *
 * A TOOL, NOT A GATE (`tools/CLAUDE.md`): a live Figma host is not in CI, so this answers and exits 0 either way. It
 * exits 2 only when it cannot answer at all (no file, not JSON, no `--expect`).
 *
 * The orchestrator runs this on the run file itself; the Mac never reports PASS (Q-C1 A). Each check is written
 * against the envelope as the plugin sends it, never against anything the Mac summarized.
 *
 * INDEPENDENCE (`docs/34`): the protocol shapes below (`PROTOCOL_V`, `TRANSPORTS`, `ERROR_CODES`, the envelope's
 * fields) are LITERALS copied from what the plugin declared when this was written, never read from
 * `apps/plugin/src/agent-protocol.ts` at judge time. A judge that imported the plugin's own types would agree with any
 * build by construction. When the protocol moves on purpose, these move in the same PR, by hand. (`--commands` does
 * import the plugin's brand compiler, to build an ARGUMENT; nothing it returns is an expectation.)
 *
 * WHAT IT HOLDS ON:
 *   · the run: not the run format; its `commit` is not `--expect`; its `stamp` (what the build printed) is not the
 *     stamp `status` reports, so the plugin Figma ran is not the one this job built;
 *   · per command: the response is missing; it does not parse as a result envelope (the shape below); its `cmd` is not
 *     its key; it carries a host `error` (`handler-threw`, `bad-args`, `unknown-command`, `busy`, `link-off`, …); `ok` is
 *     not true, or the dispatcher marked the result (`data.noVerdict`, `data.earlierVerdicts`); an exception's text in
 *     the verdict, a refusal reason, a blocker or a log line (`EXCEPTION`; #3209's `'get' on proxy` started this);
 *   · `status` and `status-after`: the build stamp's commit (#3253's `<ISO> tree-<8 hex> <commit>`) is not `--expect`,
 *     or is `-dirty`, `git-unavailable` or missing; the build does not list a command the canary sends; the open file
 *     is not the scratch file. Both bracket the run, so a bridge that moved to another plugin mid-run (#3297) is
 *     caught on the way out; `status-after` must also report the same build as `status`;
 *   · a write: `update-components` came back as an apply rather than a dry run, or `prune` as applied;
 *   · a response under a key the canary does not send.
 * `run-code` (the host-descriptor read, dev builds only) is RECORDED, never judged: it measures, it cannot fail.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The read-only commands the Mac sends, in order, and the closing `status` it sends again. */
export const CANARY_COMMANDS = ['status', 'readback', 'update-components', 'prune'] as const;
export type CanaryCmd = (typeof CANARY_COMMANDS)[number];
/** Recorded, not judged. */
export const RECORDED_COMMANDS = ['run-code'] as const;
/** The keys of `responses`, in the order the Mac runs them. `status-after` is a second `status`. */
export const RUN_KEYS = ['status', 'readback', 'update-components', 'prune', 'run-code', 'status-after'] as const;
/** The scratch file the owner created (#3215 Q-C3 A). A name, not a key: the key never enters this repo. */
export const SCRATCH_FILE = 'Prism3 canary (scratch)';
export const RUN_FORMAT = 'prism3-figma-canary-run/1';

/** THE PROTOCOL, AS LITERALS (see INDEPENDENCE above). */
export const PROTOCOL_V = 1;
export const TRANSPORTS = ['mailbox', 'bridge'];
export const ERROR_CODES = ['bad-envelope', 'bad-version', 'unknown-command', 'bad-args', 'stale', 'handler-threw', 'busy', 'link-off'];

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
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/**
 * Does it parse as a result envelope? The first field that does not, or null. Written from the plugin's declared shape
 * (`v, id, cmd, ok, startedAt, finishedAt, engineVersion, transport`, then exactly one of `result {verdict, data, logs}`
 * and `error {code, message}`; `ok` false whenever `error` is set), as literals.
 */
export const shapeFault = (e: unknown): string | null => {
  if (!isObj(e)) return 'not an object';
  if (e.v !== PROTOCOL_V) return `v is ${JSON.stringify(e.v)}, not ${PROTOCOL_V}`;
  for (const k of ['id', 'cmd', 'startedAt', 'finishedAt', 'engineVersion']) if (typeof e[k] !== 'string' || e[k] === '') return `${k} is not a non-empty string`;
  if (typeof e.ok !== 'boolean') return 'ok is not a boolean';
  if (!TRANSPORTS.includes(e.transport as string)) return `transport is ${JSON.stringify(e.transport)}, not one of ${TRANSPORTS.join(', ')}`;
  const hasResult = 'result' in e && e.result !== undefined;
  const hasError = 'error' in e && e.error !== undefined;
  if (hasResult === hasError) return hasResult ? 'carries both result and error' : 'carries neither result nor error';
  if (hasError) {
    const err = e.error;
    if (!isObj(err) || typeof err.code !== 'string' || typeof err.message !== 'string') return 'error is not {code, message}';
    if (!ERROR_CODES.includes(err.code)) return `error.code ${JSON.stringify(err.code)} is not a code the protocol declares`;
    if (e.ok !== false) return 'ok is true beside an error';
    return null;
  }
  const r = e.result;
  if (!isObj(r)) return 'result is not an object';
  if (!(r.verdict === null || isObj(r.verdict))) return 'result.verdict is neither an object nor null';
  if (!isObj(r.data)) return 'result.data is not an object';
  if (!Array.isArray(r.logs) || r.logs.some((l) => typeof l !== 'string')) return 'result.logs is not a list of strings';
  return null;
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

/** Judge one run. Pure: the run file, the expected commit, and the scratch file's name. */
export const judge = (run: unknown, expect: string, opts: { fileName?: string } = {}): Judgement => {
  const fileName = opts.fileName ?? SCRATCH_FILE;
  const rows: Row[] = [];
  const fail = (cmd: string, why: string) => rows.push({ cmd, status: 'FAIL', why });
  const r = isObj(run) ? run : {};
  const responses = isObj(r.responses) ? r.responses : {};
  if (!isObj(run) || r.format !== RUN_FORMAT || !isObj(r.responses)) {
    fail('(run)', `not a canary run file: expected {format: "${RUN_FORMAT}", commit, stamp, builtFrom, responses}`);
  } else {
    if (typeof r.commit !== 'string' || !sameCommit(r.commit, expect)) fail('(run)', `the job built ${JSON.stringify(r.commit)}, not ${expect}`);
    const st = isObj(responses.status) ? (responses.status as Envelope).result?.data?.status as { build?: unknown } | undefined : undefined;
    if (typeof r.stamp !== 'string') fail('(run)', 'the job recorded no build stamp');
    else if (st && typeof st.build === 'string' && st.build !== r.stamp) fail('(run)', `the plugin Figma ran is not the one this job built: status says "${st.build}", the build printed "${r.stamp}"`);
  }
  // The opening `status`'s build, read raw: `status-after` is held to it only when there is one to compare.
  const firstBuild = isObj(responses.status) ? ((responses.status as Envelope).result?.data?.status as { build?: unknown } | undefined)?.build : undefined;
  for (const key of RUN_KEYS) {
    const cmd = key === 'status-after' ? 'status' : key;
    const raw = responses[key];
    if (key === 'run-code') {
      if (raw === undefined) continue;
      const e = raw as Envelope;
      rows.push({ cmd: key, status: 'RECORDED', why: isObj(e) && e.error ? `not measured: ${e.error.code} ${e.error.message ?? ''}` : 'measured; see result.data.value' });
      continue;
    }
    const no = (why: string) => fail(key, why);
    if (raw === undefined) { no('no response came back for this command'); continue; }
    const fault = shapeFault(raw);
    if (fault) { no(`does not parse as a result envelope: ${fault}`); continue; }
    const e = raw as Envelope;
    if (e.cmd !== cmd) { no(`the response is for "${e.cmd}", not "${cmd}"`); continue; }
    if (e.error) { no(`host error ${e.error.code ?? '?'}: ${e.error.message ?? ''}`); continue; }
    const verdict = e.result?.verdict ?? null;
    const data = e.result?.data ?? {};
    const headline = verdict && typeof verdict.headline === 'string' ? verdict.headline : '';
    // The headline names the outcome (#3209's: `✗ check failed`); the exception's own text is in the summary or lines.
    const quoted = firstMatch([...strings(verdict).filter((t) => t !== headline), ...(e.result?.logs ?? [])]) ?? firstMatch([headline]);
    if (e.ok !== true) { no(`ok: ${String(e.ok)}${headline ? ` — ${headline}` : ''}${quoted && quoted !== headline ? ` — ${quoted}` : ''}`); continue; }
    if ('noVerdict' in data) { no(`no verdict: ${String(data.noVerdict)}`); continue; }
    if ('earlierVerdicts' in data) { no('more than one verdict came back'); continue; }
    const update = data.update as { mode?: string; refused?: { reason?: string }[]; sets?: { blockers?: string[] }[] } | undefined;
    const thrown = quoted ?? firstMatch([...strings(update?.refused ?? []), ...strings((update?.sets ?? []).map((s) => s.blockers ?? []))]);
    if (thrown) { no(`an exception's text: ${thrown}`); continue; }
    if (cmd === 'status') {
      const s = (data.status ?? {}) as { build?: unknown; file?: { name?: unknown }; commands?: unknown };
      if (s.file?.name !== fileName) { no(`the open file is "${String(s.file?.name)}", not the scratch file "${fileName}"`); continue; }
      const c = stampCommit(s.build);
      if ('why' in c) { no(c.why); continue; }
      if (!sameCommit(c.commit, expect)) { no(`the plugin was built from ${c.commit}, not ${expect}: a stale or wrong build proves nothing`); continue; }
      if (key === 'status-after' && typeof firstBuild === 'string' && s.build !== firstBuild) { no(`the build changed during the run: "${String(firstBuild)}" then "${String(s.build)}"`); continue; }
      const listed = Array.isArray(s.commands) ? (s.commands as string[]) : [];
      const absent = CANARY_COMMANDS.filter((x) => !listed.includes(x));
      if (absent.length) { no(`the build does not answer ${absent.join(', ')}`); continue; }
      rows.push({ cmd: key, status: 'PASS', why: `built from ${c.commit}, in "${fileName}"` });
      continue;
    }
    if (cmd === 'update-components' && update?.mode !== 'preview') { no(`not a dry run: data.update.mode is ${JSON.stringify(update?.mode)}, not "preview"`); continue; }
    if (cmd === 'prune' && (verdict?.applied !== false || 'pruneApplied' in data)) { no('not a preview: the prune was applied'); continue; }
    rows.push({ cmd: key, status: 'PASS', why: headline || (typeof verdict?.summary === 'string' ? verdict.summary : '') || 'ok' });
  }
  const unknown = Object.keys(responses).filter((k) => !(RUN_KEYS as readonly string[]).includes(k));
  if (unknown.length) fail('(other)', `responses for commands the canary does not send: ${unknown.join(', ')}`);
  const failed = rows.filter((x) => x.status === 'FAIL');
  const safe = failed.length === 0;
  return { rows, safe, line: safe ? `checked, safe to rebuild from ${expect}` : `held: ${failed.map((x) => `${x.cmd} — ${x.why}`).join('; ')}` };
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
  if (!file || !expect) { console.error('usage: judge.ts <run.json> --expect <commit> [--file-name <name>] · judge.ts --commands'); process.exit(2); }
  let run: unknown;
  try { run = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8')); } catch (e) { console.error(`judge.ts: cannot read ${file}: ${(e as Error).message}`); process.exit(2); }
  console.log(render(judge(run, expect, { fileName: opt('file-name') })));
}
