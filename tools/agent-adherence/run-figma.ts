/**
 * THE FIGMA HALF'S RUNNER (#3440 §3, Q3440.3 A and Q3440.4 A): the Mac's side of one adherence run on the scratch file.
 * It sends the plan's programs through its own bridge, starts one fresh agent on the arm's bridge, and writes one run
 * file for `score-figma.ts`. It never scores.
 *
 *   npx tsx tools/agent-adherence/run-figma.ts setup --out <runs dir>
 *   npx tsx tools/agent-adherence/run-figma.ts run   --out <runs dir> --arm 0|1|2 --index <n> [--model <id>] [--minutes 15]
 *   npx tsx tools/agent-adherence/run-figma.ts plan  setup|reset            (print the commands, send nothing)
 *
 * `setup` (once): `file-setup`, `apply-theme` with the house brand, `build-components button`, the plant, then the
 * captures; the baseline's golden hash (`goldenHash`: both plan pages, `↳ Buttons`, the variables, `component-keys`) is written to `<out>/golden.json`. `run`: the reset (the plant again), the
 * captures, and the hash check — a baseline that does not hash to the golden one writes a void run and stops before any
 * agent starts. Then the agent, then the captures again, then `<out>/F<arm>-<n>.json`.
 *
 * THE INVARIANTS, every run (the owner's comment of 2026-11-06 on #3440, RESULT 57–59). `run` refuses to start without
 * them, and the contamination probe voids a run whose transcript shows otherwise:
 *   · `CLAUDE_CONFIG_DIR` names the Mac's dedicated test profile: set, not `~/.claude`, and holding no `CLAUDE.md`;
 *   · `--mcp-config` names only the bridge (`prism3-figma`, on `PRISM3_BRIDGE_ARM=<arm>` with `--record`), with
 *     `--strict-mcp-config` and `--disable-slash-commands`;
 *   · a new empty working directory per run, under the OS temp dir, with no `CLAUDE.md` in it or above it;
 *   · the probe (`probe`) voids a run whose transcript lists a registered skill, a slash command, a plugin or agent the
 *     host did not ship, an MCP server other than the bridge, carries a `CLAUDE.md`, calls the Skill tool or starts a
 *     subagent, reads a `skills/` path or fetches GitHub.
 * The first run is F0 against F2, 5 runs each (Q3440.3 A); F1 comes later.
 *
 * ONE BRIDGE AT A TIME. The plugin holds one bridge connection (#3297) on one port, so this runner's own bridge and the
 * agent's never run together: it closes its own before the agent starts and opens it again after the agent exits. The
 * plugin reconnects by itself (it retries every 2 s) and stays paired, since every bridge process on this machine reads
 * the same pairing secret. The session that runs this job must not have the bridge connected itself.
 *
 * WRITES ONLY TO THE SCRATCH FILE the owner has open, and only through `run-code` (a dev build, #2530). Names no brand,
 * writes no file key. A TOOL (`tools/CLAUDE.md`): not in `ci.yml`. `selftest-figma.ts` checks its pure parts
 * (`agentCommand`, `probe`).
 */
import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync, createWriteStream } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TASK, captureCommands, goldenHash, resetCommands, setupCommands, type Cmd, type Roles } from './figma-plan';
import { RUN_FORMAT } from './score-figma';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SERVER = join(REPO, 'tools/figma-bridge/server.ts');
/**
 * How the bridge is started, by the runner and in the agent's MCP config alike: `npx --yes tsx`, as the repo runs every
 * script (review B3). `tsx` is in no `package.json`, so `node_modules/.bin/tsx` does not exist after `npm ci`.
 */
export const bridgeCommand = (extra: string[] = []) => ({ command: 'npx', args: ['--yes', 'tsx', SERVER, ...extra] });
/** The bridge's name in the agent's MCP config; its tools are `mcp__prism3-figma__…`. */
export const BRIDGE_NAME = 'prism3-figma';
const BRIDGE_TOOLS = ['figma_status', 'figma_run', 'figma_logs'].map((t) => `mcp__${BRIDGE_NAME}__${t}`);
/**
 * The agents a host lists in its `init` line with no profile at all (an empty `CLAUDE_CONFIG_DIR`, Claude Code 2.1.318,
 * `fixtures/claude-init.json`). Written here, not read from the host: one the host adds later reads as the owner's and
 * voids the run, which is the safe direction, and the Mac's first void names it.
 */
export const BUILTIN_AGENTS = ['claude', 'claude-code-guide', 'Explore', 'general-purpose', 'Plan', 'statusline-setup'];
/** The two built-in tools that read MCP resources, which arm 2 serves. No other tool is allowed. */
const RESOURCE_TOOLS = ['ListMcpResourcesTool', 'ReadMcpResourceTool'];

/* ── the agent ──────────────────────────────────────────────────────────────────────────────────────── */

/** The MCP config naming only the bridge, on the arm, recording its calls. Pure. */
export const mcpConfig = (arm: number, record: string) => ({
  mcpServers: { [BRIDGE_NAME]: { ...bridgeCommand(['--record', record]), env: { PRISM3_BRIDGE_ARM: String(arm) } } },
});

/** The headless `claude` invocation for one run. Pure: every invariant above is in the argv it returns. */
export const agentCommand = (o: { mcpConfigPath: string; model?: string }) => ({
  cmd: 'claude',
  args: [
    '-p', TASK,
    '--mcp-config', o.mcpConfigPath, '--strict-mcp-config', '--disable-slash-commands',
    '--allowedTools', [...BRIDGE_TOOLS, ...RESOURCE_TOOLS].join(','),
    '--output-format', 'stream-json', '--verbose',
    ...(o.model ? ['--model', o.model] : []),
  ],
});

/** Why a run may not start here, or null. */
export const preflight = (env: NodeJS.ProcessEnv, cwd: string, home = homedir()): string | null => {
  const profile = env.CLAUDE_CONFIG_DIR;
  if (!profile) return 'CLAUDE_CONFIG_DIR is not set: name the dedicated test profile';
  if (resolve(profile) === resolve(home, '.claude')) return 'CLAUDE_CONFIG_DIR is the normal profile (~/.claude), not the test profile';
  if (existsSync(join(profile, 'CLAUDE.md'))) return `the test profile holds a CLAUDE.md (${join(profile, 'CLAUDE.md')})`;
  if (readdirSync(cwd).length) return `the run's working directory is not empty (${cwd})`;
  for (let d = resolve(cwd); ; d = dirname(d)) {
    if (existsSync(join(d, 'CLAUDE.md')) || existsSync(join(d, '.claude', 'CLAUDE.md'))) return `a CLAUDE.md sits at or above the run's directory (${d})`;
    if (dirname(d) === d) break;
  }
  return null;
};

/** A path with every link followed, or as given when it does not exist (a transcript read on another machine). */
const real = (p: string) => { try { return realpathSync(p); } catch { return resolve(p); } };

/**
 * THE CONTAMINATION PROBE: a run's `stream-json` transcript → clean, or the reasons it is void. Pure. It reads what the
 * host registered (the `init` line) and what the agent did, never the bridge's served text, so arm 2 reading
 * `prism3://skills/…` resources through the bridge is not contamination; a skill the HOST registered is.
 */
export const probe = (lines: unknown[], cwd?: string): { clean: boolean; reasons: string[] } => {
  const reasons: string[] = [];
  const msgs = lines.filter((l): l is Record<string, any> => !!l && typeof l === 'object');
  const init = msgs.find((m) => m.type === 'system' && m.subtype === 'init');
  if (!init) reasons.push('no init line in the transcript');
  else {
    const label = (x: any) => (typeof x === 'string' ? x : x?.name ?? JSON.stringify(x));
    // Skills and slash commands: any at all. Plugins and agents: only ones the host did not ship (review B1, a real init
    // line in `fixtures/claude-init.json`): a host always lists its built-in agents and its `builtin` plugins, and those
    // are not the owner's profile.
    const extra: Record<'skills' | 'slash_commands' | 'plugins' | 'agents', (x: any) => boolean> = {
      skills: () => true,
      slash_commands: () => true,
      plugins: (x) => !(x && typeof x === 'object' && x.path === 'builtin'),
      agents: (x) => !BUILTIN_AGENTS.includes(label(x)),
    };
    for (const k of ['skills', 'slash_commands', 'plugins', 'agents'] as const) {
      const v = init[k];
      const own = Array.isArray(v) ? v.filter(extra[k]) : [];
      if (own.length) reasons.push(`the host registered ${k}: ${own.map(label).join(', ')}`);
    }
    const servers = (init.mcp_servers ?? []).map((s: any) => s?.name ?? s);
    if (JSON.stringify(servers) !== JSON.stringify([BRIDGE_NAME])) reasons.push(`the MCP servers are ${JSON.stringify(servers)}, not only ${BRIDGE_NAME}`);
    // Both sides physical (review B2): on a Mac the temp dir is under `/var`, a link to `/private/var`, and the child
    // reports the target.
    if (cwd && init.cwd && real(init.cwd) !== real(cwd)) reasons.push(`the agent ran in ${init.cwd}, not the run's empty directory`);
  }
  // Each tool call's result, by its id (review S1): a read that was denied or found nothing reached nothing. Only arm 2's
  // resources name a `skills/` path, so voiding a failed read of one would void on that arm alone.
  const failed = new Set<string>();
  for (const m of msgs) {
    const c = m.message?.content;
    if (m.type === 'user' && Array.isArray(c)) for (const p of c) if (p?.type === 'tool_result' && p.is_error === true && typeof p.tool_use_id === 'string') failed.add(p.tool_use_id);
  }
  for (const m of msgs) {
    const content = m.message?.content;
    const parts: any[] = Array.isArray(content) ? content : typeof content === 'string' ? [{ type: 'text', text: content }] : [];
    for (const p of parts) {
      // What the host put in front of the agent (a user turn that is not a tool result) must carry no CLAUDE.md.
      if (m.type === 'user' && p?.type === 'text' && /CLAUDE\.md/.test(String(p.text))) reasons.push('a CLAUDE.md reached the agent');
      if (m.type === 'assistant' && p?.type === 'tool_use') {
        const input = JSON.stringify(p.input ?? {});
        if (p.name === 'Skill') reasons.push(`the agent called the Skill tool (${input})`);
        // A subagent runs outside what this transcript shows, so its reads can't be probed.
        if (p.name === 'Task' || p.name === 'Agent') reasons.push(`the agent started a subagent (${p.name})`);
        // A call with no result on record (a cut-off transcript) counts: it can't be shown to have failed.
        if (failed.has(p.id)) continue;
        if (/CLAUDE\.md/.test(input) && p.name !== `mcp__${BRIDGE_NAME}__figma_run`) reasons.push(`the agent reached for a CLAUDE.md (${p.name})`);
        if (/(^|[\\/"])skills[\\/]/.test(input) && !/prism3:\/\/skills\//.test(input)) reasons.push(`the agent read a skills/ path (${p.name})`);
        if (/github\.com|githubusercontent/.test(input)) reasons.push(`the agent fetched from GitHub (${p.name})`);
      }
    }
  }
  return { clean: reasons.length === 0, reasons: [...new Set(reasons)] };
};

/* ── this runner's own bridge ───────────────────────────────────────────────────────────────────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Client = { call(name: string, args?: unknown): Promise<{ isError: boolean; value: any }>; close(): Promise<void> };

const LISTENING = /listening on localhost/;
/** Start a bridge process and wait until it says `listening`, exits, fails to spawn, or a minute passes. */
const startBridge = async (command: string, args: string[], env: NodeJS.ProcessEnv, cwd?: string) => {
  const p: ChildProcessWithoutNullStreams = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env, cwd });
  let err = '';
  let spawnError: Error | null = null;
  p.on('error', (e) => { spawnError = e; });
  p.stderr.setEncoding('utf8');
  p.stderr.on('data', (d) => { err += d; });
  const t0 = Date.now();
  while (!LISTENING.test(err) && p.exitCode === null && !spawnError && Date.now() - t0 < 60_000) await sleep(50);
  const listening = LISTENING.test(err) && p.exitCode === null && !spawnError;
  const stop = async () => { p.stdin.end(); const t = Date.now(); while (p.exitCode === null && Date.now() - t < 5000) await sleep(50); if (p.exitCode === null) p.kill(); };
  return { p, listening, stop, why: () => (spawnError ? `${command}: ${(spawnError as Error).message}` : err.trim() || `no output (exit ${p.exitCode})`) };
};

/**
 * THE BRIDGE PREFLIGHT (review B3): start the agent's bridge exactly as its MCP config names it, from the run's own
 * working directory, and wait for it to say `listening` (and, off arm 2, its arm) before anything is sent to Figma. A
 * config whose command does not exist, or a server that will not start, stops the run here rather than in the agent.
 */
export const bridgePreflight = async (config: ReturnType<typeof mcpConfig>, arm: number, cwd: string): Promise<string | null> => {
  const s = config.mcpServers[BRIDGE_NAME];
  const b = await startBridge(s.command, s.args, { ...process.env, ...s.env }, cwd);
  const text = b.why();
  await b.stop();
  if (!b.listening) return `the agent's bridge did not start (${text})`;
  if (arm !== 2 && !new RegExp(`arm ${arm}\\b`).test(text)) return `the agent's bridge started, but not on arm ${arm} (${text})`;
  return null;
};

const openBridge = async (): Promise<Client> => {
  for (let attempt = 0; ; attempt++) {
    const b = await startBridge(bridgeCommand().command, bridgeCommand().args, { ...process.env, PRISM3_BRIDGE_ARM: '2' });
    const p = b.p;
    if (!b.listening) {
      // The agent's bridge may still be letting go of the port.
      if (attempt < 10) { p.kill(); await sleep(2000); continue; }
      throw new Error(`the runner's bridge did not start: ${b.why()}`);
    }
    let buf = '';
    const got = new Map<number, any>();
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (d) => {
      buf += d;
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, nl); buf = buf.slice(nl + 1); if (line.trim()) { const m = JSON.parse(line); if (m.id != null) got.set(m.id, m); } }
    });
    let n = 0;
    const rpc = async (method: string, params: unknown, ms = 900_000) => {
      const id = ++n;
      p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      const t = Date.now();
      while (!got.has(id)) { if (Date.now() - t > ms) throw new Error(`no reply to ${method}`); await sleep(25); }
      return got.get(id);
    };
    await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'run-figma', version: '1' } });
    const call = async (name: string, args: unknown = {}) => {
      const r = await rpc('tools/call', { name, arguments: args });
      return { isError: !!r.result?.isError, value: r.result?.structuredContent };
    };
    return {
      call,
      close: b.stop,
    };
  }
};

/** Wait for the plugin to connect to this bridge, then send each command, keeping every envelope verbatim. */
const send = async (c: Client, cmds: Cmd[], say: (s: string) => void): Promise<Record<string, any>> => {
  const t0 = Date.now();
  while (!(await c.call('figma_status')).value?.connected) {
    if (Date.now() - t0 > 120_000) throw new Error('the plugin did not connect within 2 minutes: is Agent link on in the scratch file?');
    await sleep(1000);
  }
  const out: Record<string, any> = {};
  for (const x of cmds) {
    say(`  ${x.key} (${x.cmd})`);
    const r = await c.call('figma_run', { cmd: x.cmd, args: x.args, timeoutMs: 900_000 });
    if (r.isError) throw new Error(`${x.key}: ${JSON.stringify(r.value)}`);
    out[x.key] = r.value;
    if (r.value?.ok === false) throw new Error(`${x.key} failed: ${JSON.stringify(r.value?.error ?? r.value?.result?.verdict)}`);
  }
  return out;
};
const rolesOf = (plant: any): Roles => {
  const v = plant?.result?.data?.value;
  if (!v || typeof v !== 'object' || typeof v.promoRow !== 'string') throw new Error(`the plant returned no roles: ${JSON.stringify(plant)}`);
  return v as Roles;
};

/* ── the CLI ────────────────────────────────────────────────────────────────────────────────────────── */

const isMain = !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [sub, ...argv] = process.argv.slice(2);
  const opt = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  const say = (s: string) => process.stderr.write(`[run-figma] ${s}\n`);
  const usage = () => { console.error('usage: run-figma.ts setup --out <dir> · run --out <dir> --arm 0|1|2 --index <n> [--model <id>] [--minutes 15] · plan setup|reset'); process.exit(2); };
  const houseBrand = async () => {
    const { brandFromDesignMd } = await import('../../apps/plugin/mcp-paste');
    return brandFromDesignMd(readFileSync(join(REPO, 'packages/engine/examples/prism3.design.md'), 'utf8'));
  };

  if (sub === 'plan') {
    const which = argv[0];
    if (which === 'setup') console.log(JSON.stringify(setupCommands(await houseBrand()), null, 2));
    else if (which === 'reset') console.log(JSON.stringify(resetCommands(), null, 2));
    else usage();
    process.exit(0);
  }

  const out = opt('out');
  if (!out || (sub !== 'setup' && sub !== 'run')) usage();
  const root = resolve(out!);
  mkdirSync(root, { recursive: true });

  if (sub === 'setup') {
    const c = await openBridge();
    try {
      say('setup: file-setup, apply-theme, build-components button, the plant');
      const status = await send(c, [{ key: 'status', cmd: 'status', args: {} }], say);
      const s = await send(c, setupCommands(await houseBrand()), say);
      const roles = rolesOf(s.plant);
      const cap = await send(c, captureCommands(roles), say);
      const hash = goldenHash(cap);
      writeFileSync(join(root, 'golden.json'), JSON.stringify({ hash, build: status.status?.result?.data?.status?.build ?? null, at: new Date().toISOString() }, null, 2));
      say(`golden hash ${hash}`);
    } finally { await c.close(); }
    process.exit(0);
  }

  // run
  const arm = Number(opt('arm'));
  const index = Number(opt('index'));
  if (![0, 1, 2].includes(arm) || !Number.isInteger(index) || index < 1) usage();
  const golden = (() => { try { return JSON.parse(readFileSync(join(root, 'golden.json'), 'utf8')).hash as string; } catch { return ''; } })();
  if (!golden) { say(`no ${join(root, 'golden.json')}: run setup first`); process.exit(1); }
  const name = `F${arm}-${index}`;
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  const cwd = mkdtempSync(join(tmpdir(), `p3-adherence-${name}-`));
  const why = preflight(process.env, cwd);
  if (why) { say(`refusing to start: ${why}`); process.exit(1); }
  const calls = join(dir, 'calls.jsonl');
  const mcpPath = join(dir, 'mcp.json');
  const config = mcpConfig(arm, calls);
  writeFileSync(mcpPath, JSON.stringify(config, null, 2));
  const bridgeWhy = await bridgePreflight(config, arm, cwd);
  if (bridgeWhy) { say(`refusing to start: ${bridgeWhy}`); process.exit(1); }

  let c = await openBridge();
  let roles: Roles;
  let before: Record<string, any>;
  let status: Record<string, any>;
  try {
    say(`${name}: reset and baseline`);
    status = await send(c, [{ key: 'status', cmd: 'status', args: {} }], say);
    roles = rolesOf((await send(c, resetCommands(), say)).plant);
    before = await send(c, captureCommands(roles), say);
  } finally { await c.close(); }
  const baselineHash = goldenHash(before);
  const base = { format: RUN_FORMAT, arm, index, build: status.status?.result?.data?.status?.build ?? null, roles, golden, baselineHash, before };
  if (baselineHash !== golden) {
    writeFileSync(join(root, `${name}.json`), JSON.stringify({ ...base, after: {}, calls: [], report: '', probe: { clean: true, reasons: [] } }, null, 2));
    say(`${name} is void: the baseline hash ${baselineHash} is not the golden ${golden}. No agent was started.`);
    process.exit(1);
  }

  const a = agentCommand({ mcpConfigPath: mcpPath, model: opt('model') });
  const minutes = Number(opt('minutes') ?? 15);
  say(`${name}: the agent, in ${cwd}, up to ${minutes} min`);
  const transcriptPath = join(dir, 'transcript.jsonl');
  const tx = createWriteStream(transcriptPath);
  const agent = spawn(a.cmd, a.args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
  agent.stdout.pipe(tx);
  agent.stderr.on('data', (d) => process.stderr.write(d));
  const timer = setTimeout(() => { say(`${name}: ${minutes} min passed, stopping the agent`); agent.kill('SIGTERM'); }, minutes * 60_000);
  await new Promise((r) => agent.on('close', r));
  clearTimeout(timer);
  await new Promise((r) => tx.end(r));
  const transcript = readFileSync(transcriptPath, 'utf8').split('\n').filter((l) => l.trim()).map((l) => { try { return JSON.parse(l); } catch { return { unparsed: l }; } });
  const final = [...transcript].reverse().find((m: any) => m?.type === 'result');
  const report = typeof final?.result === 'string' ? final.result : '';

  c = await openBridge();
  let after: Record<string, any>;
  try { say(`${name}: after`); after = await send(c, captureCommands(roles), say); } finally { await c.close(); }
  const callLines = existsSync(calls) ? readFileSync(calls, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : [];
  const run = { ...base, after, calls: callLines, report, probe: probe(transcript, cwd), agentExit: agent.exitCode, cwd: cwd.split(sep).slice(-1)[0] };
  writeFileSync(join(root, `${name}.json`), JSON.stringify(run, null, 2));
  say(`${name}: written${run.probe.clean ? '' : `, void by the probe: ${run.probe.reasons.join('; ')}`}`);
}
