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
 * Arms, by name: mcp · relay/url · pair/on-demand · no-plugin · origin/refused · pair/secret-file · pair/expiry · pair/cap · pair/challenge · pair/wrong-code · pair/replay · pair/limit · pair/no-request · pair/no-evict ·
 * handshake · fragmented · ping · run · stream · progress · big-frame · timeout · unmasked · disconnect · reconnect ·
 * resend/hand · pair/relay · pair/not-in-file · pair/refused · e2e/routes · e2e/parity · resend/e2e · resend/running ·
 * e2e/link-off · e2e/switch-off · bridge/<read> · envelope/<read> · no-write/<read>
 *
 * #3147 Phase 2a: each read-only node command (inspect, component-keys, audit-frames, snapshot) through figma_run, against
 * the same `NodeShim` fixture and literal expectations as `test-agent-link.ts`; its shim write log must stay empty
 * (mutations: `readOne` assigning `n.name = n.name` → `no-write/inspect`; `locked` dropped → `envelope/inspect`).
 *
 * #3147: the server refuses an upgrade whose `Origin` is not `null`. `origin/refused` sends a web page's origin, a
 * localhost page's and none, and each must get 403 and never become the plugin.
 *
 * #3204 (the owner's Q3204.1 A): `null` is not Figma's alone. Any web page's sandboxed iframe sends it, and the review of
 * #3204 drove the bridge from one. So `origin/refused` also opens such a page in Chromium (an ordinary page on
 * 127.0.0.1 that embeds a `sandbox="allow-scripts"` `srcdoc` iframe, as the review's reproduction did) and a bare
 * `Origin: null` client: each passes the origin check, is challenged, sends a hello with no valid proof, and must be closed
 * with 4401, never become the plugin and never receive a command. The server runs on a pairing secret this test writes
 * itself (`--config`), so the token the hand-rolled clients prove is derived HERE with `node:crypto` from literals, not
 * read from the server or the plugin's own hash (docs/34 shape 1). The real relay pairs with the code the server prints
 * (`pair/relay`), and its token must equal that independent one.
 * MUTATIONS, each failing by name: `createBridge`'s hello check accepting any proof → `origin/refused: … a sandboxed
 * iframe on a web page …` and `… an Origin: null client with no token …`; `attach` called before the proof → `pair/no-evict`;
 * `pairOk` accepting any code → `pair/wrong-code`; the main thread keeping the token with `setSharedPluginData` →
 * `pair/not-in-file`; one nonce for every connection (`nonce: () => 'ab'.repeat(32)`) → `pair/replay`; the wrong-code
 * count reset on every attempt (`fails = 0` before the check) → `pair/limit` (both from the #3204 delta review, B2).
 * The code's window (the owner's Q3204.5 A): no expiry → `pair/expiry`; a code issued at start → `pair/on-demand`; no
 * cap on retirements → `pair/cap`; `request()` not resetting the retirement count, so a reopened window closes after
 * its first retirement → `pair/cap` (review S3). The window arms drive `createPairing` in process on an injected clock.
 * Only the stdio agent opens a window (review B3): a `pair` message on the socket issuing a code when none is live
 * (`if (pairing.code() === null) pairing.request();` before `pairOk`) → `pair/no-request`, against the spawned server.
 *
 * #2497: the server runs with a short `--grace-ms`, so a dropped plugin's command fails in seconds here. `resend/e2e`
 * drops the real relay's socket while a command runs in the real main.ts, keeps it down until the result is
 * posted, and asserts the result reaches the MCP client exactly once and the command ran once. `resend/running` drops it
 * and lets the relay reconnect while the command still runs, so at the hello the id is held as running, not as a result.
 */
import { spawn } from 'node:child_process';
import { connect, createServer } from 'node:net';
import type { Socket } from 'node:net';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, statSync, readFileSync, chmodSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { chromium } from 'playwright';
import { ENGINE_VERSION } from '@prism3/engine/version';
import type { AgentResult, AgentLinkState } from './src/agent-protocol';
import { createBridgeRelay, BRIDGE_PORT, BRIDGE_URL } from './src/agent-bridge-relay';
import type { WsLike } from './src/agent-bridge-relay';
import { createPairing, createProgressCounter, loadSecret } from '../../tools/figma-bridge/server';
import { HANDSHAKE_PROBES } from '../../packages/engine/mcp-handshake-probes';
import { READ_COMMANDS } from './src/agent-protocol';
import { readFixture, ARGS, EXPECTED, canon } from './agent-read-fixture';

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
/** THE PAIRING SECRET, written by this test (#3204). The token and the proofs below are computed from it here with
 *  `node:crypto` and literal labels, independently of `server.ts` and of the plugin's `bridge-auth.ts`. */
const TMP = mkdtempSync(join(tmpdir(), 'p3-bridge-'));
const SECRET = randomBytes(32);
const CONFIG = join(TMP, 'figma-bridge.json');
writeFileSync(CONFIG, JSON.stringify({ v: 1, secret: SECRET.toString('hex') }), { mode: 0o600 });
const hmacHex = (key: string | Buffer, msg: string) => createHmac('sha256', key).update(msg, 'utf8').digest('hex');
const TOKEN = hmacHex(SECRET, 'prism3-bridge-token-v1');
const proveHello = (nonce: string, token = TOKEN) => hmacHex(token, `prism3-bridge-hello-v1:${nonce}`);
const provePair = (code: string, nonce: string) => hmacHex(code.replace(/-/g, ''), `prism3-bridge-pair-v1:${nonce}`);
const child = spawn('npx', ['tsx', resolve(HERE, '../../tools/figma-bridge/server.ts'), '--port', '0', '--grace-ms', String(GRACE_MS), '--config', CONFIG], { stdio: ['pipe', 'pipe', 'pipe'] });
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
/** The live pairing code. None is issued at start (Q3204.5 A): `pair/on-demand` asks `figma_status` for it, and the
 *  arms that settle or retire it read the next one the same way. */
let CODE = '';

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
/** The `Origin` a Figma plugin's UI iframe sends: a sandboxed iframe's origin is opaque, serialized `null` (#3147,
 *  Q3147.2 A revised). Written here, not imported from the server, so the origin arms compare two independent things. */
const IFRAME_ORIGIN = 'null';
/** `origin` is the header the client sends; `null` sends none. */
const openClient = async (origin: string | null = IFRAME_ORIGIN) => {
  const sock: Socket = connect(PORT, '127.0.0.1');
  await new Promise((r) => sock.once('connect', r));
  const key = randomBytes(16).toString('base64');
  const originLine = origin === null ? '' : `Origin: ${origin}\r\n`;
  sock.write(`GET / HTTP/1.1\r\nHost: localhost:${PORT}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n${originLine}Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
  let raw = Buffer.alloc(0);
  let head: string | null = null;
  const frames: Frame[] = [];
  let closed = false;
  sock.on('close', () => { closed = true; });
  // A refused upgrade (#3147) ends the socket; a write after that is an EPIPE, not a crash of the suite.
  sock.on('error', () => { closed = true; });
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
  const texts = () => frames.filter((f) => f.op === 0x1).map((f) => JSON.parse(f.payload.toString('utf8')));
  /** The challenge's nonce (#3204), once it has arrived. */
  const nonce = async (): Promise<string> => { await until(() => texts().some((m) => m.type === 'challenge')); return texts().find((m) => m.type === 'challenge')?.nonce ?? ''; };
  const sendJson = (o: unknown) => sock.write(frame(0x1, Buffer.from(JSON.stringify(o))));
  return {
    head: head ?? '', expected, frames, sock, texts, nonce, sendJson,
    closed: () => closed,
    /** The close code the server sent, or null. */
    closeCode: (): number | null => { const f = frames.find((x) => x.op === 0x8); return f && f.payload.length >= 2 ? f.payload.readUInt16BE(0) : null; },
    /** A hello proving the token against this connection's challenge, as the paired plugin sends it. */
    hello: async (extra: Record<string, unknown> = {}) => sendJson({ type: 'hello', state: state(), ...extra, proof: proveHello(await nonce()) }),
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

section('relay url');
ok(BRIDGE_URL === `ws://localhost:${BRIDGE_PORT}` && BRIDGE_PORT === 17331, `relay/url: the relay's written-out URL is the bridge's port (${BRIDGE_URL}, port ${BRIDGE_PORT})`);

/* ── a code only on demand (#3204, the owner's Q3204.5 A) ───────────────────────────────────────────────── */
section('pair/on-demand — a code is issued only when asked for');
{
  // Before any figma_status: the start printed no code. A plugin with the kept token pairs without one, and while it is
  // connected figma_status issues none. Only once no plugin is connected does figma_status ask for one.
  ok(createPairing(SECRET).code() === null, 'pair/on-demand: a new pairing holds no live code until one is requested');
  ok(!/pairing code: /.test(stderr), 'pair/on-demand: a start without --pair prints no pairing code');
  const live = await openClient();
  await live.hello();
  ok(await until(() => live.texts().some((m) => m.type === 'welcome')), 'pair/on-demand: a plugin with the kept token is welcomed with no code live');
  const st = (await call('figma_status')).value;
  ok(st?.connected === true && st?.pairingCode === null && !/pairing code: /.test(stderr),
    `pair/on-demand: with a paired plugin connected, no code is live and figma_status issues none (pairingCode ${st?.pairingCode}, ${/pairing code: /.test(stderr) ? 'one printed' : 'none printed'})`);
  live.sock.destroy();
  await untilAsync(async () => (await call('figma_status')).value?.connected === false);
  const asked = (await call('figma_status')).value?.pairingCode;
  ok(typeof asked === 'string' && /^[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(asked) && stderr.includes(`pairing code: ${asked} `),
    `pair/on-demand: with no plugin connected, figma_status issues a code, prints it and names it (${asked})`);
  // A plugin proving its kept token leaves no code live: the one just issued is dropped, not kept for 10 minutes.
  const back = await openClient();
  await back.hello();
  await until(() => back.texts().some((m) => m.type === 'welcome'));
  const settled = (await call('figma_status')).value;
  ok(settled?.connected === true && settled?.pairingCode === null, `pair/on-demand: a paired plugin's welcome leaves no code live (pairingCode ${settled?.pairingCode})`);
  back.sock.destroy();
  await untilAsync(async () => (await call('figma_status')).value?.connected === false);
  CODE = (await call('figma_status')).value?.pairingCode ?? '';
  ok(CODE !== asked && /^[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(CODE), 'pair/on-demand: and the next figma_status with no plugin connected issues a new one');
  // A --pair start issues one at once, for a host where the owner reads stderr.
  const cfg = join(TMP, 'pair-start.json');
  writeFileSync(cfg, JSON.stringify({ v: 1, secret: SECRET.toString('hex') }), { mode: 0o600 });
  const other = spawn('npx', ['tsx', resolve(HERE, '../../tools/figma-bridge/server.ts'), '--port', '0', '--config', cfg, '--pair'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let otherErr = '';
  other.stderr.setEncoding('utf8');
  other.stderr.on('data', (d) => { otherErr += d; });
  await until(() => /listening on localhost:/.test(otherErr), 60000);
  ok(/pairing code: [2-9A-Z]{4}-[2-9A-Z]{4} /.test(otherErr), 'pair/on-demand: a --pair start prints a code at once');
  other.kill();
}

section('no-plugin');
{
  const s = await call('figma_status');
  ok(s.value?.connected === false, 'figma_status: not connected');
  const r = await call('figma_run', { cmd: 'status' });
  ok(r.isError && /no plugin is connected/.test(r.value?.error), `figma_run with no plugin → isError (${r.value?.error?.slice(0, 40)})`);
}

/* ── the origin check (#3147) ───────────────────────────────────────────────────────────────────────── */
section('origin — only the plugin iframe may connect (#3147, Q3147.2 A revised)');
{
  // A web page open in a browser on this machine sends its own origin; a bare local client may send none. Both are
  // refused before the handshake, and neither becomes "the plugin". The accepted case is `handshake` below.
  for (const [label, origin] of [['a web page', 'https://example.com'], ['a localhost page', 'http://localhost:3000'], ['no Origin header', null]] as const) {
    const c = await openClient(origin);
    ok(/^HTTP\/1\.1 403/.test(c.head) && !c.head.includes('Sec-WebSocket-Accept'),
      `origin/refused: ${label} (${origin ?? 'none'}) is refused with 403 and no handshake (${c.head.split('\r\n')[0]})`);
    c.sendJson({ type: 'hello', state: state() });
    await sleep(100);
    ok((await call('figma_status')).value?.connected === false, `origin/refused: ${label} never becomes the plugin`);
    c.sock.destroy();
  }

  // #3204: `Origin: null` with no pairing token. First a bare client, then the review's page: an ordinary page on
  // 127.0.0.1 embedding a sandboxed iframe, in Chromium. Both pass the origin check (that is the review's finding) and
  // both must be refused by the pairing proof: closed with 4401, never the plugin, never sent a command.
  {
    const c = await openClient(IFRAME_ORIGIN);
    const n = await c.nonce();
    ok(/^HTTP\/1\.1 101/.test(c.head) && /^[0-9a-f]{64}$/.test(n), `pair/challenge: an Origin: null client is let through the origin check and challenged first (${c.head.split('\r\n')[0]}, nonce ${n.length} hex)`);
    c.sendJson({ type: 'hello', state: state(), proof: '0'.repeat(64) });
    const run = await call('figma_run', { cmd: 'status', timeoutMs: 500 });
    ok(await until(() => c.closeCode() === 4401) && run.isError && /no plugin is connected/.test(run.value?.error ?? ''),
      `origin/refused: an Origin: null client with no token is closed with 4401 and the agent's command finds no plugin (close ${c.closeCode()}, run: ${run.value?.error?.slice(0, 40)})`);
    ok(!c.texts().some((m) => m.type === 'command') && (await call('figma_status')).value?.connected === false,
      'origin/refused: an Origin: null client with no token never becomes the plugin and never receives a command');
    c.sock.destroy();
  }
  {
    const iframe = `<script>
      const say = (k, v) => parent.postMessage({ k, v }, '*');
      const ws = new WebSocket('ws://localhost:${PORT}');
      ws.onopen = () => say('open');
      ws.onmessage = (e) => {
        say('got', e.data);
        const m = JSON.parse(e.data);
        if (m.type === 'challenge') ws.send(JSON.stringify({ type: 'hello', state: null, proof: '0'.repeat(64) }));
        if (m.type === 'command') ws.send(JSON.stringify({ type: 'result', result: { v: 1, id: m.command.id, cmd: m.command.cmd, ok: true, result: { verdict: 'FORGED BY A WEB PAGE' } } }));
      };
      ws.onclose = (e) => say('close', e.code);
    <\/script>`;
    const page = `<!doctype html><title>a web page</title><script>window.__seen = []; addEventListener('message', (e) => window.__seen.push(e.data));<\/script>
      <iframe sandbox="allow-scripts" srcdoc="${iframe.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></iframe>`;
    const web = createHttpServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html' }).end(page); });
    await new Promise<void>((r) => web.listen(0, '127.0.0.1', () => r()));
    const webPort = (web.address() as { port: number }).port;
    const browser = await chromium.launch();
    try {
      const tab = await browser.newPage();
      await tab.goto(`http://127.0.0.1:${webPort}/`);
      const seen = async (): Promise<{ k: string; v?: unknown }[]> => tab.evaluate(() => (window as unknown as { __seen: { k: string; v?: unknown }[] }).__seen);
      let opened = false;
      for (let i = 0; i < 400 && !opened; i++) { opened = (await seen()).some((e) => e.k === 'close'); if (!opened) await sleep(25); }
      const got = await seen();
      const challenged = got.some((e) => e.k === 'got' && typeof e.v === 'string' && JSON.parse(e.v).type === 'challenge');
      ok(opened && got.some((e) => e.k === 'open') && challenged,
        `origin/refused: a sandboxed iframe on a web page passes the origin check, as the review showed, and is challenged (${JSON.stringify(got.map((e) => e.k))})`);
      ok(got.some((e) => e.k === 'close' && e.v === 4401) && !got.some((e) => e.k === 'got' && typeof e.v === 'string' && JSON.parse(e.v).type === 'command'),
        `origin/refused: a sandboxed iframe on a web page with no token is closed with 4401 and never receives a command (${JSON.stringify(got.filter((e) => e.k === 'close'))})`);
      ok((await call('figma_status')).value?.connected === false, 'origin/refused: a sandboxed iframe on a web page never becomes the plugin');
    } finally {
      await browser.close();
      web.close();
    }
  }
}

/* ── pairing (#3204) ────────────────────────────────────────────────────────────────────────────────── */
section('pairing — the secret file, a wrong code, and no eviction by an unpaired client (#3204, Q3204.1 A)');
{
  // The secret file: made user-only, kept across loads, replaced by a rotation, narrowed when found readable by others.
  const dir = join(TMP, 'cfg', 'prism3');
  const path = join(dir, 'figma-bridge.json');
  const a = loadSecret(path);
  const mode = (p: string) => statSync(p).mode & 0o777;
  ok(a.created && mode(path) === 0o600 && mode(dir) === 0o700 && JSON.parse(readFileSync(path, 'utf8')).secret === a.secret.toString('hex'),
    `pair/secret-file: a new secret is written user-only (file ${mode(path).toString(8)}, directory ${mode(dir).toString(8)})`);
  const b = loadSecret(path);
  ok(!b.created && b.secret.equals(a.secret), 'pair/secret-file: the next start reads the same secret, so pairing survives a restart');
  const r = loadSecret(path, { rotate: true });
  ok(r.created && !r.secret.equals(a.secret) && mode(path) === 0o600, `pair/secret-file: --rotate writes a new secret, still user-only (${mode(path).toString(8)})`);
  chmodSync(path, 0o644);
  loadSecret(path);
  ok(mode(path) === 0o600, `pair/secret-file: a secret file readable by others is narrowed to 0600 (${mode(path).toString(8)})`);
}
{
  // THE CODE'S WINDOW (Q3204.5 A), on an injected clock: the pairing core is driven in process, so nothing sleeps.
  // The numbers are written here, not imported: the owner's decision is 10 minutes, 5 wrong tries, 3 retirements.
  const TTL_MS = 10 * 60_000;
  const FAILS = 5;
  const RETIREMENTS = 3;
  const n = () => randomBytes(32).toString('hex');
  const wrongFor = (c: string | null) => (c === 'ZZZZ-ZZZZ' ? 'YYYY-YYYY' : 'ZZZZ-ZZZZ');
  let t = 1_000_000;
  const p = createPairing(SECRET, () => undefined, () => t);
  const c1 = p.request();
  t += TTL_MS - 1;
  let nonce = n();
  ok(p.pairOk(nonce, provePair(c1, nonce)), 'pair/expiry: a code 1 ms short of 10 minutes old still pairs');
  const c2 = p.request();
  t += TTL_MS;
  nonce = n();
  ok(!p.pairOk(nonce, provePair(c2, nonce)) && p.code() === null,
    `pair/expiry: a code 10 minutes old on the injected clock does not pair, and no code is live (code ${p.code()})`);

  const said: string[] = [];
  const q = createPairing(SECRET, (s) => said.push(s), () => t);
  const issued = () => said.filter((s) => s.startsWith('pairing code: ')).length;
  const first = q.request();
  const seen = new Set<string>([first]);
  for (let i = 0; i < FAILS * RETIREMENTS; i++) {
    nonce = n();
    q.pairOk(nonce, provePair(wrongFor(q.code()), nonce));
    const c = q.code();
    if (c) seen.add(c);
  }
  ok(q.code() === null && seen.size === RETIREMENTS,
    `pair/cap: after ${RETIREMENTS} codes are retired by wrong guesses, pairing is closed (code ${q.code()}, ${seen.size} codes issued)`);
  const before = issued();
  for (let i = 0; i < FAILS; i++) { nonce = n(); q.pairOk(nonce, provePair(wrongFor(null), nonce)); }
  nonce = n();
  ok(q.code() === null && issued() === before && !q.pairOk(nonce, provePair([...seen][RETIREMENTS - 1], nonce)),
    `pair/cap: while closed, more guesses issue no new code (${issued() - before} issued)`);
  const next = q.request();
  // The new window has the full allowance again (review S3): its first retirement issues a new code, it does not close.
  const atOpen = issued();
  const saidAtOpen = said.length;
  for (let i = 0; i < FAILS; i++) { nonce = n(); q.pairOk(nonce, provePair(wrongFor(q.code()), nonce)); }
  const renewed = q.code();
  ok(!seen.has(next) && renewed !== null && renewed !== next && issued() === atOpen + 1 && !said.slice(saidAtOpen).some((s) => /pairing is closed/.test(s)),
    `pair/cap: the next request opens a new window, and its first ${FAILS} wrong guesses issue a new code rather than close pairing (code ${renewed}, ${issued() - atOpen} issued)`);
  nonce = n();
  ok(renewed !== null && q.pairOk(nonce, provePair(renewed, nonce)), 'pair/cap: and the new window\'s code pairs');
}
{
  ok(CODE.length === 9 && (await call('figma_status')).value?.pairingCode === CODE, `pair: figma_status keeps the live code rather than replacing it (${CODE ? 'named' : 'missing'})`);
  // A WRONG code: closed with 4403, never paired, and the code stays open (one miss, under the limit).
  let wrong = 'ZZZZ-ZZZZ';
  if (wrong === CODE) wrong = 'YYYY-YYYY';
  const w = await openClient();
  w.sendJson({ type: 'pair', proof: provePair(wrong, await w.nonce()) });
  ok(await until(() => w.closeCode() === 4403) && !w.texts().some((m) => m.type === 'paired'),
    `pair/wrong-code: a wrong code is refused with 4403 and given no token (close ${w.closeCode()})`);
  ok((await call('figma_status')).value?.connected === false, 'pair/wrong-code: a wrong code never becomes the plugin');
  w.sock.destroy();
}
{
  // REPLAY (#3204 review B2 a): a proof is bound to the nonce of the connection it was made on. A hello proof captured on
  // connection 1 (which it pairs: it becomes the plugin) is refused on connection 2, and the plugin keeps the slot.
  const first = await openClient();
  const captured = proveHello(await first.nonce());
  first.sendJson({ type: 'hello', state: state(), proof: captured });
  ok(await until(() => first.texts().some((m) => m.type === 'welcome')), 'pair/replay: the hello proof is welcomed on the connection it was made for');
  const second = await openClient();
  await second.nonce();
  second.sendJson({ type: 'hello', state: state(), proof: captured });
  ok(await until(() => second.closeCode() === 4401) && !second.texts().some((m) => m.type === 'welcome'),
    `pair/replay: a hello proof captured on one connection is closed with 4401 on the next (close ${second.closeCode()})`);
  ok(!first.closed() && first.closeCode() === null && (await call('figma_status')).value?.connected === true,
    'pair/replay: the replayed hello never becomes the plugin: the first connection keeps the slot');
  second.sock.destroy();
  first.sock.destroy();
  ok(await untilAsync(async () => (await call('figma_status')).value?.connected === false), 'pair/replay: closed');
  // The welcome left no code live (Q3204.5 A); with no plugin connected, figma_status asks for a new one.
  CODE = (await call('figma_status')).value?.pairingCode ?? '';
  // A pair proof made with the RIGHT code on connection 1's nonce, sent on connection 2: refused with 4403, no token,
  // and the code stays open. (Sending it on connection 1 would spend the code, so a later replay could fail for that
  // reason alone; this way only the nonce binding refuses it.)
  const p1 = await openClient();
  const pairProof = provePair(CODE, await p1.nonce());
  const p2 = await openClient();
  await p2.nonce();
  p2.sendJson({ type: 'pair', proof: pairProof });
  ok(await until(() => p2.closeCode() === 4403) && !p2.texts().some((m) => m.type === 'paired'),
    `pair/replay: a pair proof made on another connection's nonce is refused with 4403 and given no token (close ${p2.closeCode()})`);
  ok((await call('figma_status')).value?.pairingCode === CODE, 'pair/replay: and the code is not spent by it');
  p1.sock.destroy();
  p2.sock.destroy();
}
{
  // THE WRONG-CODE LIMIT (#3204 review B2 b): the count is the server's, not the connection's. MAX_PAIR_FAILS wrong
  // codes, each on its own connection, retire the code: figma_status and stderr name a new one, and the old one no
  // longer pairs. (The arms above spent some of the count already, so the retirement lands inside this run.)
  // Written here, not imported: the README's promise is "5 wrong codes" (docs/34 shape 1).
  const MAX_PAIR_FAILS = 5;
  const old = CODE;
  const before = (stderr.match(/pairing code: /g) ?? []).length;
  for (let i = 0; i < MAX_PAIR_FAILS; i++) {
    const current = (await call('figma_status')).value?.pairingCode;
    const wrong = current === 'ZZZZ-ZZZZ' || old === 'ZZZZ-ZZZZ' ? 'YYYY-YYYY' : 'ZZZZ-ZZZZ';
    const g = await openClient();
    g.sendJson({ type: 'pair', proof: provePair(wrong, await g.nonce()) });
    await until(() => g.closeCode() !== null);
    g.sock.destroy();
  }
  const now = (await call('figma_status')).value?.pairingCode;
  const printed = [...stderr.matchAll(/pairing code: ([2-9A-Z]{4}-[2-9A-Z]{4})/g)].map((m) => m[1]);
  ok(typeof now === 'string' && now !== old && /wrong pairing codes: that code is retired/.test(stderr),
    `pair/limit: ${MAX_PAIR_FAILS} wrong codes, each on its own connection, retire the code (figma_status ${now === old ? 'unchanged' : 'changed'})`);
  ok(printed.length > before && printed[printed.length - 1] === now, 'pair/limit: stderr prints the new code, the one figma_status names');
  const stale = await openClient();
  stale.sendJson({ type: 'pair', proof: provePair(old, await stale.nonce()) });
  ok(await until(() => stale.closeCode() === 4403) && !stale.texts().some((m) => m.type === 'paired'),
    `pair/limit: the retired code no longer pairs (close ${stale.closeCode()})`);
  stale.sock.destroy();
  CODE = typeof now === 'string' ? now : CODE;
}
{
  // ONLY THE STDIO AGENT OPENS A WINDOW (#3204 delta review, B3). With no code live, `pair` messages on the socket issue
  // none, so a page cannot reopen pairing on a paired machine, or after the cap has closed it. figma_status is NOT called
  // between the steps, since it issues a code itself; it is called once at the end of each, and must issue the next one.
  // Written here, not imported (docs/34 shape 1): 5 wrong codes retire a code, 3 retirements close pairing.
  const MAX_PAIR_FAILS = 5;
  const MAX_RETIREMENTS = 3;
  const printed = () => [...stderr.matchAll(/pairing code: ([2-9A-Z]{4}-[2-9A-Z]{4})/g)].map((m) => m[1]);
  const wrongBut = (...avoid: string[]) => ['ZZZZ-ZZZZ', 'YYYY-YYYY', 'XXXX-XXXX'].find((w) => !avoid.includes(w))!;
  /** One `pair` attempt on a fresh connection: whether it was given a token. */
  const tryPair = async (code: string): Promise<boolean> => {
    const g = await openClient();
    g.sendJson({ type: 'pair', proof: provePair(code, await g.nonce()) });
    await until(() => g.closeCode() !== null || g.texts().some((m) => m.type === 'paired'));
    const paired = g.texts().some((m) => m.type === 'paired');
    g.sock.destroy();
    return paired;
  };
  /** A few wrong codes and the last code, with no code live: no new code is printed and no one is paired. */
  const probe = async (label: string, last: string) => {
    const before = printed().length;
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await tryPair(wrongBut(last)));
    results.push(await tryPair(last));
    { const g = await openClient(); await g.nonce(); g.sendJson({ type: 'hello', proof: 'ab'.repeat(32), held: [] }); await until(() => g.closeCode() !== null); g.sock.destroy(); }
    await until(() => false, 200);
    const issued = printed().length - before;
    ok(issued === 0 && !results.some(Boolean),
      `pair/no-request: ${label}, messages on the socket issue no code and pair no one (${issued} printed, ${results.filter(Boolean).length} paired)`);
    const asked = (await call('figma_status')).value?.pairingCode;
    ok(typeof asked === 'string' && asked !== last && printed().length === before + 1 && printed()[printed().length - 1] === asked,
      `pair/no-request: ${label}, figma_status then issues the next code (${asked === last ? 'the old one' : asked ? 'a new one' : 'none'})`);
    return asked as string;
  };

  // 1. A pair spends the live code, so none is live.
  ok(await tryPair(CODE), 'pair/no-request: the live code pairs, and is spent');
  CODE = await probe('after a pair has spent the code', CODE);

  // 2. MAX_RETIREMENTS codes retired by wrong guesses close pairing, so none is live.
  const closings = () => (stderr.match(/codes retired: pairing is closed/g) ?? []).length;
  const closedBefore = closings();
  for (let i = 0; i < MAX_PAIR_FAILS * MAX_RETIREMENTS; i++) await tryPair(wrongBut(printed()[printed().length - 1]));
  const lastCode = printed()[printed().length - 1];
  ok(await until(() => closings() === closedBefore + 1), `pair/no-request: ${MAX_PAIR_FAILS * MAX_RETIREMENTS} wrong codes on the socket close pairing`);
  CODE = await probe('after the cap has closed pairing', lastCode);
}
{
  // A live, PAIRED plugin and an unpaired newcomer: the newcomer is closed and the plugin keeps the slot and its commands.
  const live = await openClient();
  await live.hello();
  ok(await until(() => live.texts().some((m) => m.type === 'welcome')) && await untilAsync(async () => (await call('figma_status')).value?.connected === true),
    'pair/no-evict: a hello proving the token is welcomed and becomes the plugin');
  for (const [label, msg] of [['a hello with a wrong proof', (n: string) => ({ type: 'hello', state: state(), proof: proveHello(n, 'f'.repeat(64)) })],
    ['a hello with no proof', () => ({ type: 'hello', state: state() })], ['a result before any hello', () => ({ type: 'result', result: { id: 'x' } })]] as const) {
    const intruder = await openClient();
    intruder.sendJson(msg(await intruder.nonce()));
    ok(await until(() => intruder.closeCode() === 4401), `pair/no-evict: ${label} is closed with 4401 (${intruder.closeCode()})`);
    intruder.sock.destroy();
  }
  const done = callLater('figma_run', { cmd: 'status', timeoutMs: 5000 });
  ok(await until(() => live.texts().some((m) => m.type === 'command')) && !live.closed() && live.closeCode() === null,
    'pair/no-evict: the paired plugin is never evicted by an unpaired one: still open, and the next command reaches it');
  const cmd = live.texts().find((m) => m.type === 'command')?.command;
  live.sendJson({ type: 'result', result: { v: 1, id: cmd?.id, cmd: 'status', ok: true, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), engineVersion: ENGINE_VERSION, transport: 'bridge', result: { verdict: null, data: {}, logs: [] } } });
  ok(!(await done()).isError, 'pair/no-evict: and its answer is the call\'s');
  live.sock.destroy();
  ok(await untilAsync(async () => (await call('figma_status')).value?.connected === false), 'pair/no-evict: closed');
}

/* ── the hand-rolled client ─────────────────────────────────────────────────────────────────────────── */
section('handshake + framing (hand-rolled client)');
const c1 = await openClient();
{
  ok(/^HTTP\/1\.1 101/.test(c1.head) && c1.head.includes(`Sec-WebSocket-Accept: ${c1.expected}`), 'handshake: 101 with the RFC 6455 accept key');
  // A FRAGMENTED hello: text frame (FIN=0) + continuation (FIN=1). It carries the pairing proof (#3204).
  const hello = Buffer.from(JSON.stringify({ type: 'hello', state: state(), proof: proveHello(await c1.nonce()) }));
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
  await old.hello();
  ok(await untilAsync(async () => (await call('figma_status')).value?.connected === true), 'reconnect: the first connection is the plugin');
  const done = callLater('figma_run', { cmd: 'readback', timeoutMs: 15000 });
  ok(await until(() => old.texts().some((m) => m.type === 'command')), 'reconnect: a command is in flight on the first connection');
  const fresh = await openClient();
  await fresh.hello();
  ok(await until(() => old.frames.some((f) => f.op === 0x8 && f.payload.readUInt16BE(0) === 4409)), 'reconnect: the older connection is closed with 4409, held by another instance (#3297)');
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
  await a.hello();
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
  await b.hello({ held: [cmd.id] });
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
  /** Every write to the file's plugin data and shared plugin data, by any node (#3204: the token must never be one). */
  const fileWrites: string[] = [];
  const root = { name: 'bridge test file', type: 'DOCUMENT', children: [] as unknown[], getSharedPluginData: () => '', getPluginData: () => '',
    setSharedPluginData: (ns: string, k: string, v: string) => { fileWrites.push(`${ns}/${k}=${v}`); },
    setPluginData: (k: string, v: string) => { fileWrites.push(`${k}=${v}`); } };
  /** `figma.clientStorage`: per person, per machine. The token's one home (#3204). */
  const kept = new Map<string, unknown>();
  const host: Record<string, unknown> = {
    showUI: () => undefined,
    ui: { postMessage: (m: any) => { posted.push(m); relay?.fromMain(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
    clientStorage: { getAsync: async (k: string) => kept.get(k), setAsync: async (k: string, v: unknown) => { kept.set(k, v); }, deleteAsync: async (k: string) => { kept.delete(k); } },
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
  const pairings: string[] = [];
  // Node's WebSocket sends no `Origin`, which the server refuses (#3147); Figma's iframe sends `null`, so this does too.
  relay = createBridgeRelay({
    open: (url) => { if (refuse) throw new Error('refused by the test'); sock = new (WebSocket as unknown as new (u: string, o: unknown) => WebSocket)(url, { headers: { origin: IFRAME_ORIGIN } }); return sock as unknown as WsLike; },
    post: (m) => toMain(m),
    schedule: (fn, ms) => setTimeout(fn, ms),
    cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    url: `ws://localhost:${PORT}`,
    retryMs: 100,
    onPairing: (p) => { pairings.push(p); },
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
  // #3204: no token is kept yet, so the relay asks for the code and does not connect. A wrong code first, then the one
  // the server printed. The token it keeps must be the one this test derived from the secret it wrote.
  ok(await until(() => relay!.pairing() === 'needed') && !relay.connected() && posted.some((m) => m.type === 'agent-bridge-token' && m.token === null),
    `pair/relay: with no token kept, the relay asks for the code and stays unconnected (${pairings.join(' → ')})`);
  await sleep(300);
  ok(relay.pairing() === 'needed' && !relay.connected(), 'pair/relay: and it does not retry while it waits for the code');
  // The arms above settled the last code (a welcome leaves none live, Q3204.5 A). The relay is unconnected, so
  // figma_status asks for a new one, as the owner's agent would.
  CODE = (await call('figma_status')).value?.pairingCode ?? '';
  relay.pair(CODE === 'ZZZZ-ZZZZ' ? 'YYYY-YYYY' : 'zzzz zzzz');
  ok(await until(() => relay!.pairing() === 'wrong-code') && !relay.connected(), `pair/relay: a wrong code comes back as wrong-code (${pairings.join(' → ')})`);
  relay.pair(CODE.toLowerCase());
  ok(await until(() => relay!.connected()), `pair/relay: the printed code, typed in lower case, pairs and connects (${pairings.join(' → ')})`);
  await sleep(50);
  ok(kept.get('prism3:bridge-token') === TOKEN, 'pair/relay: the main thread keeps the token in clientStorage, and it is the token the secret gives');
  ok(!fileWrites.some((w) => w.includes(TOKEN)) && !JSON.stringify(posted.filter((m) => m.type !== 'agent-bridge-token')).includes(TOKEN),
    `pair/not-in-file: the token is never written to the file's plugin data or shared plugin data (${fileWrites.length} writes checked)`);
  ok((await call('figma_status')).value?.pairingCode === null, 'pair/relay: the code is spent once used');
  {
    const again = await openClient();
    again.sendJson({ type: 'pair', proof: provePair(CODE, await again.nonce()) });
    ok(await until(() => again.closeCode() === 4403) && relay.connected(), `pair/relay: a spent code pairs no one else, and the plugin stays connected (close ${again.closeCode()})`);
    again.sock.destroy();
  }
  {
    // A token this server does not know (its secret was rotated): refused, forgotten, and the code asked for again.
    const told: unknown[] = [];
    const states: string[] = [];
    const stale = createBridgeRelay({
      open: (url) => new (WebSocket as unknown as new (u: string, o: unknown) => WebSocket)(url, { headers: { origin: IFRAME_ORIGIN } }) as unknown as WsLike,
      post: (m) => told.push(m), schedule: (fn, ms) => setTimeout(fn, ms), cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      url: `ws://localhost:${PORT}`, retryMs: 100, onPairing: (p) => states.push(p),
    });
    stale.fromMain({ type: 'agent-bridge-token', token: 'f'.repeat(64) });
    stale.fromMain({ type: 'agent-link-state', state: state() });
    ok(await until(() => stale.pairing() === 'refused') && told.some((m) => (m as { type: string }).type === 'agent-bridge-unpaired') && !stale.connected(),
      `pair/refused: a token the bridge does not know is refused, dropped and the code asked for (${states.join(' → ')})`);
    ok(relay.connected(), 'pair/refused: and the paired plugin stays connected');
    stale.fromMain({ type: 'agent-link-state', state: state(false) });
  }
  ok(relay.connected(), 'switching the link on connects the relay to the bridge');
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

  // #3147 Phase 2a: the four read-only node commands over the bridge, against the same fixture and the same literal
  // expectations as the mailbox suite. Every write a command made would be in the shim's log or in `fileWrites`.
  {
    const fx = readFixture();
    const h = host as Record<string, any>;
    const savedChildren = root.children;
    root.children = fx.pages;
    h.getNodeByIdAsync = (id: string) => fx.getNodeByIdAsync(id);
    h.getStyleByIdAsync = (id: string) => fx.getStyleByIdAsync(id);
    h.variables.getVariableByIdAsync = (id: string) => fx.getVariableByIdAsync(id);
    const ARMS: Array<[string, unknown, unknown]> = [
      ['inspect', ARGS.inspect, EXPECTED.inspect],
      ['component-keys', ARGS.keys, EXPECTED.keys],
      ['audit-frames', ARGS.audit, EXPECTED.audit],
      ['snapshot', ARGS.snapshot, EXPECTED.snapshot],
    ];
    ok(ARMS.map((a) => a[0]).join() === READ_COMMANDS.join(), `reads: every read command has a bridge arm (${READ_COMMANDS.join(', ')})`);
    for (const [cmd, args, want] of ARMS) {
      const w0 = fx.writes.length;
      // The link record (`prism3agent/link`) is the agent link's own, rewritten after every command whatever it is; any
      // OTHER plugin-data write is the command's.
      const commandWrites = () => fileWrites.filter((w) => !w.startsWith('prism3agent/link='));
      const f0 = commandWrites().length;
      calls.length = 0;
      const rr = await call('figma_run', { cmd, args, timeoutMs: 8000 });
      const env = rr.value as AgentResult;
      ok(!rr.isError && env.ok === true && !env.error && env.cmd === cmd && env.transport === 'bridge' && env.v === 1 && env.engineVersion === ENGINE_VERSION && env.result?.verdict === null,
        `bridge/${cmd}: figma_run ${cmd} answers ok in a bridge envelope, with no verdict — ${JSON.stringify(env.error ?? null)}`);
      ok(canon(env.result?.data) === canon(want), `envelope/${cmd}: result.data over the bridge is exactly the literal expectation — got ${canon(env.result?.data).slice(0, 300)}`);
      ok(fx.writes.length === w0 && commandWrites().length === f0 && calls.length === 0,
        `no-write/${cmd}: over the bridge the shim logged no write (${fx.writes.slice(w0).join(', ') || 'none'}), no plugin data but the link record was written (${commandWrites().slice(f0).join(', ') || 'none'}), and no ACTIONS handler ran`);
    }
    root.children = savedChildren;
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

/* ── #3297: the transport word changes only on a settled change, never on each retry ──────────────────────────────────
 * The owner's report: Prism3 open in two files on one machine, both paired, the status flipping "Listening · bridge" ⇄
 * "Listening · mailbox" every ~2 s. The server lets a newer PAIRED connection replace the older (a reconnect must win over
 * a dead socket, #2497), so two instances evicted each other on every retry. Every `agent-bridge` post below is one
 * repaint of the transport word (`agent-link.ts` publishes a state only when the flag changes), so the arms count posts.
 * EXPECTED is written here, from the report: the displaced instance repaints once and then holds still. */
section('held — two paired instances, one bridge (#3297)');
{
  type Probe = { relay: ReturnType<typeof createBridgeRelay>; posts: boolean[]; held: boolean[]; opens: () => number; sock: () => WebSocket | null; refuse: (r: boolean) => void };
  const probe = (url = `ws://localhost:${PORT}`): Probe => {
    const posts: boolean[] = [];
    const held: boolean[] = [];
    let opens = 0;
    let sock: WebSocket | null = null;
    let refuse = false;
    const relay = createBridgeRelay({
      open: (u) => { opens++; if (refuse) throw new Error('refused by the test'); sock = new (WebSocket as unknown as new (u: string, o: unknown) => WebSocket)(u, { headers: { origin: IFRAME_ORIGIN } }); return sock as unknown as WsLike; },
      post: (m) => { if (m.type === 'agent-bridge') posts.push(m.connected); },
      schedule: (fn, ms) => setTimeout(fn, ms),
      cancel: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      url, retryMs: 100, holdMs: 400, heldMaxMs: 800,
      onHeld: (h: boolean) => { held.push(h); },
    });
    relay.fromMain({ type: 'agent-bridge-token', token: TOKEN });
    return { relay, posts, held, opens: () => opens, sock: () => sock, refuse: (r) => { refuse = r; } };
  };
  // The server's half, by hand: a hello that yields is refused with 4409 while a plugin is attached, and the holder stays;
  // with none attached, the same hello is welcomed. The proof is checked as before.
  {
    const holder = await openClient();
    await holder.hello();
    ok(await until(() => holder.texts().some((m) => m.type === 'welcome')), 'held/server: a paired connection holds the bridge');
    const polite = await openClient();
    await polite.hello({ yield: true });
    ok(await until(() => polite.closeCode() === 4409) && !polite.texts().some((m) => m.type === 'welcome'),
      `held/server: a yielding hello is closed with 4409 while a plugin is attached (close ${polite.closeCode()})`);
    ok(!holder.closed() && holder.closeCode() === null && (await call('figma_status')).value?.connected === true, 'held/server: and the holder keeps the bridge');
    const forged = await openClient();
    await forged.nonce();
    forged.sendJson({ type: 'hello', state: state(), yield: true, proof: 'ab'.repeat(32) });
    ok(await until(() => forged.closeCode() === 4401), `held/server: a yielding hello with a wrong proof is still a pairing refusal, 4401 (close ${forged.closeCode()})`);
    holder.sock.destroy();
    ok(await untilAsync(async () => (await call('figma_status')).value?.connected === false), 'held/server: the holder leaves');
    const next = await openClient();
    await next.hello({ yield: true });
    ok(await until(() => next.texts().some((m) => m.type === 'welcome')), 'held/server: with no plugin attached, a yielding hello is welcomed');
    next.sock.destroy();
    await untilAsync(async () => (await call('figma_status')).value?.connected === false);
    polite.sock.destroy(); forged.sock.destroy();
  }
  const connects = async () => ((await call('figma_logs', { since: 0, limit: 5000 })).value?.entries ?? [])
    .filter((e: { line: string }) => e.line === 'plugin connected').length;

  const a = probe();
  a.relay.fromMain({ type: 'agent-link-state', state: state() });
  ok(await until(() => a.relay.connected()), 'held/setup: the first file\'s relay connects');
  const b = probe();
  b.relay.fromMain({ type: 'agent-link-state', state: state() });
  ok(await until(() => b.relay.connected()), 'held/setup: the second file\'s relay connects, replacing the first (a newer paired connection wins)');
  const before = await connects();
  const aOpens = a.opens();
  await sleep(2500);
  ok(JSON.stringify(a.posts) === '[true,false]',
    `held/one-repaint: the displaced instance repaints the transport word once, not on every retry (posts: ${JSON.stringify(a.posts)})`);
  ok(JSON.stringify(b.posts) === '[true]' && b.relay.connected(),
    `held/holder-steady: the instance holding the bridge keeps it and never repaints (posts: ${JSON.stringify(b.posts)})`);
  ok(await connects() === before, `held/no-evict: in 2.5 s neither instance evicts the other (${(await connects()) - before} new connections)`);
  ok(JSON.stringify(a.held) === '[true]', `held/said: the displaced instance is told once that another instance holds the bridge (${JSON.stringify(a.held)})`);
  ok(a.opens() - aOpens <= 7, `held/backoff: while the bridge is held its retries back off, ${a.opens() - aOpens} attempts in 2.5 s (at a flat 100 ms, ~20)`);
  // The holder leaves (its file closes, or its link goes off): the waiting instance takes the bridge, and says so once.
  b.relay.fromMain({ type: 'agent-link-state', state: state(false) });
  ok(await until(() => a.relay.connected(), 3000), 'held/takeover: when the holder leaves, the waiting instance takes the bridge');
  ok(JSON.stringify(a.posts) === '[true,false,true]' && a.held[a.held.length - 1] === false,
    `held/takeover: one repaint back to the bridge, and the held note clears (posts: ${JSON.stringify(a.posts)}, held: ${JSON.stringify(a.held)})`);

  // A flaky socket: it drops and the retry is back inside the hold. That is not a settled change, so no repaint.
  const before2 = a.posts.length;
  a.sock()!.close();
  ok(await until(() => !a.relay.connected()) && await until(() => a.relay.connected()), 'flaky: the socket drops and the relay reconnects');
  await sleep(600);
  ok(a.posts.length === before2, `flaky/held-word: a drop the retry repairs within the hold repaints nothing (posts since: ${JSON.stringify(a.posts.slice(before2))})`);

  // A real transport change: the bridge goes away and stays away, so the mailbox takes over — one repaint, after the hold.
  a.refuse(true);
  a.sock()!.close();
  await sleep(1200);
  ok(JSON.stringify(a.posts.slice(before2)) === '[false]',
    `real-change: a bridge that stays gone repaints the word to the mailbox exactly once (posts since: ${JSON.stringify(a.posts.slice(before2))})`);
  a.relay.fromMain({ type: 'agent-link-state', state: state(false) });

  // A socket refused on every attempt (no server on the port): the word never moves off the mailbox.
  const closedPort = await new Promise<number>((r) => { const srv = createServer(); srv.listen(0, '127.0.0.1', () => { const p = (srv.address() as { port: number }).port; srv.close(() => r(p)); }); });
  const c = probe(`ws://127.0.0.1:${closedPort}`);
  c.relay.fromMain({ type: 'agent-link-state', state: state() });
  await sleep(800);
  ok(c.opens() >= 3 && c.posts.length === 0, `refused: ${c.opens()} refused attempts make no status change (posts: ${JSON.stringify(c.posts)})`);
  c.relay.fromMain({ type: 'agent-link-state', state: state(false) });
}

child.stdin.end();
await until(() => child.exitCode !== null, 5000);
if (child.exitCode === null) child.kill();
console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} — ${executed} assertions executed`);
process.exit(failed === 0 ? 0 : 1);
