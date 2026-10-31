/**
 * AGENT LINK, TRANSPORT B gate — the local desktop bridge, end to end.
 *
 *   npx tsx apps/plugin/test-agent-bridge.ts
 *
 * Spawns the REAL `tools/figma-bridge/server.ts` as a child process and speaks MCP to it over its stdio,
 * exactly as Claude Code would. Two plugin sides connect to its WebSocket:
 *
 *   1. A HAND-ROLLED client over `node:net` — its own handshake, its own masking and framing, written
 *      here independently of the server's codec (a codec checked against itself proves nothing, docs/34
 *      shape 1). It exercises what a browser never does on purpose: a fragmented message, a frame past
 *      64 KiB (the 64-bit length), ping/pong, an unmasked frame (must be refused), a disconnect mid-run.
 *   2. The PLUGIN ITSELF — the real relay (`src/agent-bridge-relay.ts`, over Node's own WebSocket) wired
 *      to the real `main.ts`, imported under a host model as `test-agent-link.ts` does. A `figma_run`
 *      then travels MCP → server → socket → relay → main thread → the `ACTIONS` table → back, and the
 *      suite spies on the table to prove the command reached the UI's own handler.
 *
 * Arms, by name: mcp · no-plugin · handshake · fragmented · ping · run · stream · progress · big-frame · timeout ·
 * unmasked · disconnect · reconnect · resend/hand · e2e/routes · e2e/parity · resend/e2e · resend/running · e2e/link-off ·
 * e2e/switch-off
 *
 * #2497: the server runs with a short `--grace-ms`, so a dropped plugin's command fails in seconds here. `resend/e2e`
 * drops the real relay's socket while a command runs in the real main.ts, keeps it down until the result is
 * posted, and asserts the result reaches the MCP client exactly once and the command ran once. `resend/running` drops it
 * and lets the relay reconnect while the command still runs, so at the hello the id is held as running, not as a result.
 */
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import type { Socket } from 'node:net';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { ENGINE_VERSION } from '@prism3/engine/version';
import type { AgentResult, AgentLinkState } from './src/agent-protocol';
import { createBridgeRelay } from './src/agent-bridge-relay';
import type { WsLike } from './src/agent-bridge-relay';
import { createProgressCounter } from '../../tools/figma-bridge/server';
import { HANDSHAKE_PROBES } from '../../packages/engine/mcp-handshake-probes';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const section = (s: string) => console.log(`\n${s}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (cond: () => boolean, ms = 5000): Promise<boolean> => {
  const t0 = Date.now();
  while (!cond()) { if (Date.now() - t0 > ms) return false; await sleep(10); }
  return true;
};
/** `until` for a condition that has to ask the server (an MCP round trip). */
const untilAsync = async (cond: () => Promise<boolean>, ms = 5000): Promise<boolean> => {
  const t0 = Date.now();
  while (!(await cond())) { if (Date.now() - t0 > ms) return false; await sleep(25); }
  return true;
};

const HERE = dirname(fileURLToPath(import.meta.url));

/* ── the server, over stdio ─────────────────────────────────────────────────────────────────────────── */

const GRACE_MS = 3000;
const child = spawn('npx', ['tsx', resolve(HERE, '../../tools/figma-bridge/server.ts'), '--port', '0', '--grace-ms', String(GRACE_MS)], { stdio: ['pipe', 'pipe', 'pipe'] });
let stderr = '';
child.stderr.on('data', (d) => { stderr += d; });
const replies = new Map<number, any>();
/** How many replies arrived per request id: a result delivered twice would show here, not in `replies`. */
const replyCount = new Map<number, number>();
const notes: any[] = [];
let out = '';
// Decoded as a stream, not per chunk: a chunk boundary can fall inside a multi-byte character.
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (d) => {
  out += d;
  let nl: number;
  while ((nl = out.indexOf('\n')) >= 0) {
    const line = out.slice(0, nl); out = out.slice(nl + 1);
    if (!line.trim()) continue;
    const m = JSON.parse(line);
    if (m.id !== undefined && m.id !== null) { replies.set(m.id, m); replyCount.set(m.id, (replyCount.get(m.id) ?? 0) + 1); } else notes.push(m);
  }
});
let rpcId = 0;
const rpc = async (method: string, params: unknown = {}, ms = 20000): Promise<any> => {
  const id = ++rpcId;
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  if (!(await until(() => replies.has(id), ms))) throw new Error(`no reply to ${method}`);
  return replies.get(id);
};
const call = async (name: string, args: unknown = {}, meta?: unknown) => {
  const r = await rpc('tools/call', { name, arguments: args, ...(meta ? { _meta: meta } : {}) });
  return { isError: !!r.result?.isError, value: r.result?.structuredContent };
};
/** Start a tools/call without waiting — for runs the test answers from the plugin side. */
const callLater = (name: string, args: unknown = {}, meta?: unknown) => {
  const id = ++rpcId;
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args, ...(meta ? { _meta: meta } : {}) } }) + '\n');
  const wait = async () => {
    if (!(await until(() => replies.has(id), 20000))) throw new Error(`no reply to ${name}`);
    const r = replies.get(id);
    return { isError: !!r.result?.isError, value: r.result?.structuredContent };
  };
  return Object.assign(wait, { rpcId: id });
};

if (!(await until(() => /listening on localhost:(\d+)/.test(stderr), 60000))) {
  console.error(`the bridge did not start:\n${stderr}`);
  process.exit(1);
}
const PORT = Number(/listening on localhost:(\d+)/.exec(stderr)![1]);

/* ── a hand-rolled WebSocket client ─────────────────────────────────────────────────────────────────── */

type Frame = { fin: boolean; op: number; payload: Buffer };
/** A CLIENT frame: always masked, unless `unmasked` (the protocol violation the server must refuse). */
const frame = (op: number, payload: Buffer, fin = true, unmasked = false): Buffer => {
  const len = payload.length;
  const head: number[] = [(fin ? 0x80 : 0) | op];
  const m = unmasked ? 0 : 0x80;
  if (len < 126) head.push(m | len);
  else if (len < 65536) head.push(m | 126, len >> 8, len & 255);
  else { head.push(m | 127, 0, 0, 0, 0, (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255); }
  if (unmasked) return Buffer.concat([Buffer.from(head), payload]);
  const key = randomBytes(4);
  const body = Buffer.from(payload);
  for (let i = 0; i < body.length; i++) body[i] ^= key[i % 4];
  return Buffer.concat([Buffer.from(head), key, body]);
};
const openClient = async () => {
  const sock: Socket = connect(PORT, '127.0.0.1');
  await new Promise((r) => sock.once('connect', r));
  const key = randomBytes(16).toString('base64');
  sock.write(`GET / HTTP/1.1\r\nHost: localhost:${PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
  let raw = Buffer.alloc(0);
  let head: string | null = null;
  const frames: Frame[] = [];
  let closed = false;
  sock.on('close', () => { closed = true; });
  sock.on('data', (d: Buffer) => {
    raw = Buffer.concat([raw, d]);
    if (head === null) {
      const at = raw.indexOf('\r\n\r\n');
      if (at < 0) return;
      head = raw.subarray(0, at).toString('latin1');
      raw = raw.subarray(at + 4);
    }
    for (;;) {
      if (raw.length < 2) return;
      let len = raw[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (raw.length < 4) return; len = raw.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (raw.length < 10) return; len = Number(raw.readBigUInt64BE(2)); off = 10; }
      if (raw.length < off + len) return;
      frames.push({ fin: (raw[0] & 0x80) !== 0, op: raw[0] & 0x0f, payload: Buffer.from(raw.subarray(off, off + len)) });
      raw = raw.subarray(off + len);
    }
  });
  await until(() => head !== null);
  const expected = createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
  return {
    head: head ?? '', expected, frames, sock,
    closed: () => closed,
    sendJson: (o: unknown) => sock.write(frame(0x1, Buffer.from(JSON.stringify(o)))),
    texts: () => frames.filter((f) => f.op === 0x1).map((f) => JSON.parse(f.payload.toString('utf8'))),
  };
};

const state = (on = true): AgentLinkState => ({
  v: 1, on, since: new Date().toISOString(), engineVersion: ENGINE_VERSION, build: 'test', pollMs: 1000,
  transports: { mailbox: on, bridge: on }, lastCommand: null, inboxError: null,
});

/* ── mcp ────────────────────────────────────────────────────────────────────────────────────────────── */
section('mcp — the stdio loop');
{
  const init = await rpc('initialize', { protocolVersion: '2024-11-05' });
  ok(init.result?.serverInfo?.name === 'prism3-figma-bridge' && init.result?.serverInfo?.version === ENGINE_VERSION, 'initialize names the bridge and its engine version');
  // #3109: the bridge echoed 2026-07-28 to a client asking for it, and answered it to any version it did
  // not know, so Claude Code (asking for 2025-11-25) refused to connect. Same probes as `mcp-test.ts`.
  for (const p of HANDSHAKE_PROBES) {
    const r = await rpc('initialize', { protocolVersion: p.asked, capabilities: {}, clientInfo: { name: 'probe', version: '1' } });
    ok(r.result?.protocolVersion === p.answer, `#3109 initialize asking for ${p.asked} answers ${p.answer}, ${p.why} (got ${r.result?.protocolVersion})`);
  }
  const list = await rpc('tools/list');
  ok(JSON.stringify(list.result?.tools?.map((t: { name: string }) => t.name)) === JSON.stringify(['figma_status', 'figma_run', 'figma_logs']), 'tools/list: figma_status, figma_run, figma_logs');
  const bad = await rpc('tools/call', { name: 'figma_paint' });
  ok(bad.error?.code === -32602, 'an unknown tool is a protocol error');
}

section('no-plugin');
{
  const s = await call('figma_status');
  ok(s.value?.connected === false, 'figma_status: not connected');
  const r = await call('figma_run', { cmd: 'status' });
  ok(r.isError && /no plugin is connected/.test(r.value?.error), `figma_run with no plugin → isError (${r.value?.error?.slice(0, 40)})`);
}

/* ── the hand-rolled client ─────────────────────────────────────────────────────────────────────────── */
section('handshake + framing (hand-rolled client)');
const c1 = await openClient();
{
  ok(/^HTTP\/1\.1 101/.test(c1.head) && c1.head.includes(`Sec-WebSocket-Accept: ${c1.expected}`), 'handshake: 101 with the RFC 6455 accept key');
  // A FRAGMENTED hello: text frame (FIN=0) + continuation (FIN=1).
  const hello = Buffer.from(JSON.stringify({ type: 'hello', state: state() }));
  const cut = 17;
  c1.sock.write(frame(0x1, hello.subarray(0, cut), false));
  c1.sock.write(frame(0x0, hello.subarray(cut), true));
  await until(() => false, 100);
  const s = await call('figma_status');
  ok(s.value?.connected === true && s.value?.plugin?.on === true, 'fragmented: a hello split across two frames is reassembled');
  c1.sock.write(frame(0x9, Buffer.from('p3-ping')));
  ok(await until(() => c1.frames.some((f) => f.op === 0xa && f.payload.toString() === 'p3-ping')), 'ping: answered with a pong carrying the same payload');
}

section('run + stream');
{
  const done = callLater('figma_run', { cmd: 'status' }, { progressToken: 'tok-1' });
  ok(await until(() => c1.texts().some((m) => m.type === 'command')), 'run: the server sends the command to the plugin');
  const cmd = c1.texts().find((m) => m.type === 'command').command;
  ok(cmd.v === 1 && cmd.cmd === 'status' && typeof cmd.id === 'string' && !Number.isNaN(Date.parse(cmd.issuedAt)), 'run: a protocol-v1 command envelope');
  c1.sendJson({ type: 'progress', id: cmd.id, progress: { at: new Date().toISOString(), phase: 'build', done: 3, total: 9, chunkMs: 12 } });
  c1.sendJson({ type: 'log', id: cmd.id, line: '[prism3 #836] Built from tree-test' });
  const result: AgentResult = {
    v: 1, id: cmd.id, cmd: 'status', ok: true, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION, transport: 'bridge', result: { verdict: null, data: { big: 'é'.repeat(40_000) }, logs: [] },
  };
  // > 65,535 bytes: the 64-bit length path.
  const payload = Buffer.from(JSON.stringify({ type: 'result', result }));
  ok(payload.length > 65535, `big-frame: the result frame is ${payload.length} bytes`);
  c1.sock.write(frame(0x1, payload));
  const r = await done();
  ok(!r.isError && JSON.stringify(r.value) === JSON.stringify(result), 'run: figma_run returns the plugin\'s result envelope unchanged');
  ok(notes.some((n) => n.method === 'notifications/progress' && n.params?.progressToken === 'tok-1' && n.params?.progress === 3 && n.params?.message === 'build 3/9'), 'stream: progress reaches the MCP client as notifications/progress');
  ok(notes.some((n) => n.method === 'notifications/message' && /#836/.test(n.params?.data)), 'stream: a console line reaches it as notifications/message');
  const logs = await call('figma_logs', { since: 0 });
  ok(logs.value?.entries?.some((e: { kind: string; line: string }) => e.kind === 'log' && /#836/.test(e.line)) && typeof logs.value?.last === 'number', 'figma_logs: the streamed lines are kept');
  const later = await call('figma_logs', { since: logs.value.last });
  ok(later.value?.entries?.length === 0, 'figma_logs since=last: nothing new');
}

section('progress across phases (#1684)');
{
  // A set's build, its wire pass, three #1679 reference back-off passes, the wire reading that closes the
  // back-off, then a second set's build and wire. `done` restarts five times; MCP requires `progress` to rise
  // on every notification. EXPECTED is written out here, not computed by the server's counter: each segment's
  // last `done` is folded into an offset when the phase changes or `done` fails to rise.
  const readings: [phase: 'build' | 'wire' | 'retry', done: number, total: number][] = [
    ['build', 24, 48], ['build', 48, 48], ['wire', 24, 48], ['wire', 48, 48],
    ['retry', 1, 6], ['retry', 2, 6], ['retry', 3, 6], ['wire', 48, 48],
    ['build', 12, 12], ['wire', 12, 12],
  ];
  const EXPECTED = [24, 48, 72, 96, 97, 98, 99, 147, 159, 171];
  const done = callLater('figma_run', { cmd: 'build-components' }, { progressToken: 'tok-1684' });
  ok(await until(() => c1.texts().some((m) => m.type === 'command' && m.command.cmd === 'build-components')), 'progress: the build command reaches the plugin');
  const cmd = c1.texts().find((m) => m.type === 'command' && m.command.cmd === 'build-components').command;
  for (const [phase, d, total] of readings)
    c1.sendJson({ type: 'progress', id: cmd.id, progress: { at: new Date().toISOString(), phase, done: d, total, chunkMs: 0 } });
  const mine = () => notes.filter((n) => n.method === 'notifications/progress' && n.params?.progressToken === 'tok-1684');
  await until(() => mine().length >= readings.length);
  const got = mine().map((n) => n.params.progress);
  ok(got.length === readings.length && got.every((v, i) => i === 0 || v > got[i - 1]), `progress: strictly increasing across build → wire → retry → wire → build (got ${got.join(', ')})`);
  ok(JSON.stringify(got) === JSON.stringify(EXPECTED), `progress: the sequence is ${EXPECTED.join(', ')} (got ${got.join(', ')})`);
  ok(mine().every((n) => n.params.total === undefined), 'progress: no total, since no honest one is known until the run ends');
  ok(mine().map((n) => n.params.message).join('|') === readings.map(([p, d, t]) => `${p} ${d}/${t}`).join('|'), 'progress: each message keeps the phase\'s own fraction');
  c1.sendJson({ type: 'result', result: {
    v: 1, id: cmd.id, cmd: 'build-components', ok: true, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION, transport: 'bridge', result: { verdict: null, data: {}, logs: [] },
  } });
  ok(!(await done()).isError, 'progress: the run completes');
}
{
  // #1686 net — the two clauses the spawned-server sequence never reaches (every restart there coincides with
  // a phase change, and no segment opens at 0). A SAME-PHASE restart (one set's build 48/48, the next set's
  // build 24/48) must fold the first set's 48 into the offset; a segment opening at `done: 0` must still move
  // forward (the floor). Expected values written here, traced by hand: 48 → 48+24 → floor 73 → 72+1+1 = 74.
  const count = createProgressCounter();
  const seq = [['build', 48], ['build', 24], ['wire', 0], ['wire', 1]] as const;
  const got = seq.map(([phase, done]) => count({ phase, done, total: 48, chunkMs: 0, elapsedMs: 0 } as never));
  ok(JSON.stringify(got) === JSON.stringify([48, 72, 73, 74]),
    `progress: a same-phase restart folds into the offset and a segment opening at 0 still rises (want 48, 72, 73, 74; got ${got.join(', ')})`);
}

section('timeout');
{
  const r = await call('figma_run', { cmd: 'readback', timeoutMs: 300 });
  ok(r.isError && /within 300 ms/.test(r.value?.error), 'a plugin that never answers → isError after timeoutMs');
}

section('disconnect + unmasked');
{
  const done = callLater('figma_run', { cmd: 'readback' });
  await until(() => c1.texts().filter((m) => m.type === 'command').length >= 3);
  c1.sock.write(frame(0x1, Buffer.from('{"type":"state"}'), true, true)); // unmasked: a protocol violation
  ok(await until(() => c1.frames.some((f) => f.op === 0x8 && f.payload.readUInt16BE(0) === 1002)), 'unmasked: the server closes with 1002');
  const r = await done();
  ok(r.isError && /disconnected/.test(r.value?.error) && /did not reconnect within/.test(r.value?.error), `disconnect: a run in flight fails once the grace ends with no reconnect, not a hang (${String(r.value?.error).slice(0, 80)})`);
  ok((await call('figma_status')).value?.connected === false, 'and figma_status says not connected');
}

section('reconnect — a newer plugin connection replaces the older one');
{
  // The same file reconnecting (the plugin reloaded, the link toggled) must not leave two sockets that both
  // look like "the plugin", and a command sent to the old one must fail with the reason, not wait out its
  // timeout. A pattern the Figma Console MCP bridge also uses (MIT; "Replaced by same file reconnection").
  const old = await openClient();
  old.sendJson({ type: 'hello', state: state() });
  ok(await untilAsync(async () => (await call('figma_status')).value?.connected === true), 'reconnect: the first connection is the plugin');
  const done = callLater('figma_run', { cmd: 'readback', timeoutMs: 15000 });
  ok(await until(() => old.texts().some((m) => m.type === 'command')), 'reconnect: a command is in flight on the first connection');
  const fresh = await openClient();
  fresh.sendJson({ type: 'hello', state: state() });
  ok(await until(() => old.frames.some((f) => f.op === 0x8 && f.payload.readUInt16BE(0) === 1000)), 'reconnect: the older connection is closed (1000)');
  const r = await done();
  ok(r.isError && /reconnected/.test(r.value?.error ?? ''), `reconnect: the in-flight run fails with the reason, not a timeout (${String(r.value?.error ?? '').slice(0, 60)})`);
  ok((await call('figma_status')).value?.connected === true, 'reconnect: the newer connection is now the plugin');
  fresh.sock.destroy();
  ok(await untilAsync(async () => (await call('figma_status')).value?.connected === false),
    'drop: a plugin that goes away without a close frame is not left "connected"');
}

section('resend/hand — a result re-sent after a reconnect is delivered once (#2497)');
{
  const a = await openClient();
  a.sendJson({ type: 'hello', state: state() });
  ok(await untilAsync(async () => (await call('figma_status')).value?.connected === true), 'resend/hand: the plugin is connected');
  const done = callLater('figma_run', { cmd: 'update-components', timeoutMs: 15000 });
  ok(await until(() => a.texts().some((m) => m.type === 'command')), 'resend/hand: a command is in flight');
  const cmd = a.texts().find((m) => m.type === 'command').command;
  a.sock.destroy(); // dropped without a close frame, as a stalled iframe's socket is
  ok(await untilAsync(async () => {
    const s = (await call('figma_status')).value;
    return s?.connected === false && s?.awaitingReconnect?.includes(cmd.id);
  }), 'resend/hand: after the drop the command is awaiting the reconnect, not failed');
  const b = await openClient();
  b.sendJson({ type: 'hello', state: state(), held: [cmd.id] });
  const result: AgentResult = {
    v: 1, id: cmd.id, cmd: 'update-components', ok: true, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION, transport: 'bridge', result: { verdict: { headline: '✓ updated in place' }, data: {}, logs: [] },
  };
  b.sendJson({ type: 'result', result });
  b.sendJson({ type: 'result', result }); // the relay re-sends every kept result on each connect
  const r = await done();
  ok(!r.isError && JSON.stringify(r.value) === JSON.stringify(result), 'resend/hand: the re-sent result is the call\'s answer');
  await sleep(100);
  ok(replyCount.get(done.rpcId) === 1, `resend/hand: the call is answered exactly once (${replyCount.get(done.rpcId)})`);
  ok(b.texts().filter((m) => m.type === 'command').length === 0, 'resend/hand: the command is not sent again to the new connection');
  const logs = (await call('figma_logs', { since: 0, limit: 5000 })).value?.entries ?? [];
  ok(logs.some((e: { id: string; line: string }) => e.id === cmd.id && /repeated result/.test(e.line)), 'resend/hand: the second copy is logged as a repeat and ignored');
  b.sock.destroy();
  ok(await untilAsync(async () => (await call('figma_status')).value?.connected === false), 'resend/hand: closed');
}

/* ── the plugin itself: real relay + real main.ts ───────────────────────────────────────────────────── */
section('e2e — MCP → bridge → relay → main.ts → ACTIONS → back');
{
  const posted: any[] = [];
  let relay: ReturnType<typeof createBridgeRelay> | null = null;
  const empty = async () => [];
  const root = { name: 'bridge test file', type: 'DOCUMENT', children: [] as unknown[], getSharedPluginData: () => '', setSharedPluginData: () => undefined };
  const host: Record<string, unknown> = {
    showUI: () => undefined,
    ui: { postMessage: (m: any) => { posted.push(m); relay?.fromMain(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
    clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
    on: () => undefined,
    root,
    currentPage: { name: 'Page 1', children: [] },
    variables: { getLocalVariableCollectionsAsync: empty, getLocalVariablesAsync: empty },
    getLocalTextStylesAsync: empty, getLocalEffectStylesAsync: empty, getLocalPaintStylesAsync: empty, getLocalGridStylesAsync: empty,
    listAvailableFontsAsync: empty,
  };
  const g = globalThis as Record<string, unknown>;
  g.figma = host; g.__html__ = ''; g.PRISM3_BUILD = '2026-09-25T00:00:00Z tree-test0000';
  g.PRISM3_DEV = true;   // the dev build's define (#2530): the bridge is a dev build's transport
  const main = await import('./src/main');
  const toMain = (m: unknown) => (host.ui as { onmessage: (m: unknown) => void }).onmessage(m);
  // The socket the relay holds now, and a switch that refuses new ones: `resend/e2e` drops the first and keeps
  // the relay off the bridge until the main thread has answered.
  let sock: WebSocket | null = null;
  let refuse = false;
  relay = createBridgeRelay({
    open: (url) => { if (refuse) throw new Error('refused by the test'); sock = new WebSocket(url); return sock as unknown as WsLike; },
    post: (m) => toMain(m),
    schedule: (fn, ms) => setTimeout(fn, ms),
    cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    url: `ws://localhost:${PORT}`,
    retryMs: 100,
  });
  const calls: string[] = [];
  const actions = main.ACTIONS as unknown as Record<string, (...a: unknown[]) => Promise<void>>;
  for (const name of Object.keys(actions)) {
    const orig = actions[name];
    actions[name] = (...a: unknown[]) => { calls.push(name); return orig(...a); };
  }

  toMain({ type: 'ui-ready' });
  await sleep(50);
  ok(relay.connected() === false, 'the relay does not connect while the link is off');
  toMain({ type: 'agent-link', on: true });
  ok(await until(() => relay!.connected()), 'switching the link on connects the relay to the bridge');
  const lastState = () => posted.filter((m) => m.type === 'agent-link-state').pop()?.state as AgentLinkState;
  ok(await until(() => lastState()?.transports.bridge === true), 'and the link state reports the bridge transport');
  const st = await call('figma_status');
  ok(st.value?.connected === true && st.value?.plugin?.on === true, 'figma_status sees the plugin and its state');

  // The UI's own boot read-back verdict, for parity.
  const uiSeed = posted.filter((m) => m.type === 'seed-info').pop();
  calls.length = 0;
  const r = await call('figma_run', { cmd: 'readback', timeoutMs: 8000 });
  const res = r.value as AgentResult;
  ok(!r.isError && calls.includes('seedFromFile'), 'e2e/routes: figma_run readback reached ACTIONS.seedFromFile — the UI\'s handler');
  ok(res.transport === 'bridge' && res.v === 1 && res.engineVersion === ENGINE_VERSION && JSON.stringify(res.result?.verdict) === JSON.stringify(uiSeed),
    'e2e/parity: the result is a bridge envelope carrying exactly the seed-info the panel got');
  ok(lastState()?.lastCommand?.cmd === 'readback', 'the panel shows it as the last command');

  calls.length = 0;
  const bc = await call('figma_run', { cmd: 'build-components', args: { def: 'no-such-def' }, timeoutMs: 8000 });
  ok(calls.includes('buildComponents') && (bc.value as AgentResult).ok === false && ((bc.value as AgentResult).result?.verdict as { headline?: string })?.headline === '✗ unknown def',
    'e2e/routes: build-components reached ACTIONS.buildComponents and returned its verdict');
  const unk = await call('figma_run', { cmd: 'paint-it-blue', timeoutMs: 8000 });
  ok((unk.value as AgentResult).error?.code === 'unknown-command', 'e2e: an unknown command comes back as a failed result, not silence');

  // #2530: the dev build's run-code, through the real server (unchanged: its figma_run takes any cmd) and the real relay
  // into the real main.ts. EXPECTED is written here: the value, the log line and the bridge envelope.
  const rc = await call('figma_run', { cmd: 'run-code', args: { code: 'console.log("from the plugin");\nreturn { file: figma.root.name, n: 21 * 2 };' }, timeoutMs: 8000 });
  const rcr = rc.value as AgentResult;
  ok(!rc.isError && rcr.ok === true && rcr.transport === 'bridge' && rcr.cmd === 'run-code'
    && JSON.stringify(rcr.result?.data.value) === JSON.stringify({ file: (host.root as { name: string }).name, n: 42 })
    && JSON.stringify(rcr.result?.logs) === JSON.stringify(['from the plugin']),
    `e2e/run-code: figma_run run-code runs in main.ts and returns its value and log line in a bridge envelope (${JSON.stringify(rcr.result ?? rcr.error)})`);
  const rce = await call('figma_run', { cmd: 'run-code', args: { code: 'return missingName;' }, timeoutMs: 8000 });
  ok((rce.value as AgentResult).ok === false && (rce.value as AgentResult).error?.code === 'handler-threw' && /missingName/.test((rce.value as AgentResult).error?.message ?? ''),
    `e2e/run-code: a throw comes back over the bridge as handler-threw with its message (${JSON.stringify((rce.value as AgentResult).error)})`);

  // #2497: a command that outlives its socket. run-code (the dev build's) waits 800 ms in the main thread;
  // the socket drops at once and stays down until the result is posted, so the result can only reach the
  // MCP client if the relay keeps it and re-sends it on reconnect. A counter in the code proves one run.
  {
    const g2 = globalThis as Record<string, unknown>;
    g2.__resendRuns = 0;
    const done = callLater('figma_run', { cmd: 'run-code', args: { code: 'globalThis.__resendRuns++; await new Promise((r) => setTimeout(r, 800)); return "survived";' }, timeoutMs: 10000 });
    ok(await until(() => g2.__resendRuns === 1), 'resend/e2e: the command is running in main.ts');
    refuse = true;
    sock!.close();
    ok(await until(() => relay!.connected() === false), 'resend/e2e: the socket drops mid-command');
    ok(await until(() => posted.some((m) => m.type === 'agent-result' && m.result.cmd === 'run-code' && m.result.result?.data?.value === 'survived'), 5000),
      'resend/e2e: the main thread finishes while the relay is disconnected');
    refuse = false;
    ok(await until(() => relay!.connected()), 'resend/e2e: the relay reconnects');
    const r = await done();
    const env = r.value as AgentResult;
    ok(!r.isError && env.ok === true && env.cmd === 'run-code' && env.result?.data.value === 'survived',
      `resend/e2e: the result arrives after the reconnect (${JSON.stringify(r.value).slice(0, 120)})`);
    await sleep(200);
    ok(replyCount.get(done.rpcId) === 1, `resend/e2e: the call is answered exactly once (${replyCount.get(done.rpcId)})`);
    ok(g2.__resendRuns === 1, `resend/e2e: the command ran once (${g2.__resendRuns})`);
  }

  // #2497, the case real use hits: the relay retries in seconds and a command runs for minutes, so the relay is
  // back BEFORE the result exists. At that hello the id is still running (in the relay's `mine`, not `kept`),
  // and the server must adopt it from there. run-code waits 1500 ms; the socket drops with no refuse.
  {
    const g2 = globalThis as Record<string, unknown>;
    g2.__midRuns = 0;
    const isResult = (m: any) => m.type === 'agent-result' && m.result.cmd === 'run-code' && m.result.result?.data?.value === 'mid-run';
    const done = callLater('figma_run', { cmd: 'run-code', args: { code: 'globalThis.__midRuns++; await new Promise((r) => setTimeout(r, 1500)); return "mid-run";' }, timeoutMs: 10000 });
    ok(await until(() => g2.__midRuns === 1), 'resend/running: the command is running in main.ts');
    sock!.close();
    ok(await until(() => relay!.connected() === false), 'resend/running: the socket drops mid-command');
    ok(await until(() => relay!.connected()), 'resend/running: the relay reconnects');
    ok(!posted.some(isResult), 'resend/running: the reconnect came before the result (the command was still running at the hello)');
    const r = await done();
    const env = r.value as AgentResult;
    ok(!r.isError && env.ok === true && env.cmd === 'run-code' && env.result?.data.value === 'mid-run',
      `resend/running: the result arrives after a reconnect mid-run (${JSON.stringify(r.value).slice(0, 120)})`);
    await sleep(200);
    ok(replyCount.get(done.rpcId) === 1, `resend/running: the call is answered exactly once (${replyCount.get(done.rpcId)})`);
    ok(g2.__midRuns === 1, `resend/running: the command ran once (${g2.__midRuns})`);
  }

  toMain({ type: 'agent-link', on: false });
  ok(await until(() => relay!.connected() === false), 'e2e/switch-off: switching the link off closes the socket');
  await sleep(50);
  ok((await call('figma_status')).value?.connected === false, 'e2e/switch-off: figma_status says not connected');
  posted.length = 0;
  toMain({ type: 'agent-command', command: { v: 1, id: 'late-1', cmd: 'readback', args: {}, issuedAt: new Date().toISOString() } });
  const late = posted.find((m) => m.type === 'agent-result')?.result as AgentResult | undefined;
  ok(late?.error?.code === 'link-off' && late.id === 'late-1', 'e2e/link-off: a command reaching the plugin after switch-off is refused with link-off');
}

child.stdin.end();
await until(() => child.exitCode !== null, 5000);
if (child.exitCode === null) child.kill();
console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} — ${executed} assertions executed`);
process.exit(failed === 0 ? 0 : 1);
