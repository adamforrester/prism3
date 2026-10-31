/**
 * figma-bridge — the agent link's TRANSPORT B: a local MCP server that drives the RUNNING Prism3 plugin in
 * the owner's Figma desktop app over a localhost WebSocket. For large sweeping tests from a Claude Code
 * session on the owner's machine; the file mailbox (`tools/figma-mcp/agent-link.ts`) is for small tests
 * from a cloud session. Both speak ONE protocol — `apps/plugin/src/agent-protocol.ts` — and this server
 * adds nothing to it: it builds the command envelope, hands it to the plugin, and returns the plugin's
 * result envelope unchanged.
 *
 *   npx tsx tools/figma-bridge/server.ts [--port 17331] [--grace-ms 120000] [--config <file>] [--rotate]   (or PRISM3_BRIDGE_PORT, PRISM3_BRIDGE_GRACE_MS, PRISM3_BRIDGE_CONFIG)
 *
 * TWO SIDES, ONE PROCESS:
 *   · stdio MCP (newline-delimited JSON-RPC, hand-rolled like `packages/engine/mcp.ts`, whose protocol
 *     constants it reuses) with three tools — `figma_status`, `figma_run {cmd, args, timeoutMs}`,
 *     `figma_logs {since, limit}`;
 *   · a WebSocket server on 127.0.0.1 (RFC 6455, hand-rolled on `node:http` + `node:crypto` — no `ws`
 *     package). The plugin's UI iframe connects to it while the owner has the agent link switched on, and
 *     relays each command to the main thread's dispatcher (`apps/plugin/src/agent-bridge-relay.ts`).
 *
 * The plugin connects to the DEFAULT port only: the manifest names `ws://localhost:17331` in
 * `allowedDomains` (the network build, "Prism3 Studio", since #3147), and Figma refuses any origin it does not list. `--port` exists for the test suite
 * and for a collision; using another port with the real plugin needs that manifest entry changed too.
 *
 * WIRE between this server and the plugin (JSON text frames):
 *   server → plugin   { type: 'command', command: AgentCommand }
 *   server → plugin   { type: 'challenge', v: 1, nonce } (first, on every connection) · { type: 'paired', token } · { type: 'welcome' }
 *   plugin → server   { type: 'pair', proof } · { type: 'hello', state, held?, proof } · { type: 'state', state } · { type: 'result', result }
 *                     { type: 'progress', id, progress } · { type: 'log', id, line }
 *
 * PAIRING (#3204, the owner's Q3204.1 A; the flow and the hash: `apps/plugin/src/bridge-auth.ts`). A connection is not
 * the plugin until it proves the pairing token against the challenge's nonce. Until then it is sent no command, and it
 * replaces no one; a connection that sends anything else first, or a wrong proof, is closed. The token is derived from a
 * random secret kept in a user-only file (mode 0600, `bridgeConfigPath`), so pairing survives restarts; `--rotate`
 * makes a new secret, and every paired plugin then asks for a code again. Each start prints a one-time pairing code on
 * stderr (and `figma_status` names it, since an MCP host may not show stderr); the plugin asks for it the first time it
 * connects on a machine and keeps the token it is given in `figma.clientStorage`.
 *
 * One plugin connection at a time (a newer PAIRED one replaces the older), one command in flight at a time.
 *
 * A RECONNECT KEEPS A COMMAND IN FLIGHT (#2497). The plugin's socket can drop while a long command runs (a
 * ~6-minute update-components did). The waiting call is not failed: it waits `graceMs` for the plugin to come
 * back. The relay's `hello` names the ids it `held` (running, or a result kept for re-sending) and then re-sends
 * its kept results; a result is matched by id, resolves the call once, and a repeat is logged and ignored. A
 * command is never sent twice. One the new connection does not hold (it never reached the plugin, or the
 * plugin reloaded) fails at the hello with the reason, and one whose plugin does not come back fails at the
 * end of the grace. The wire gains only the optional `held`; the command and result envelopes are
 * unchanged, so `AGENT_PROTOCOL_VERSION` stays 1.
 * Bound to the loopback addresses only — 127.0.0.1, and ::1 where the host has it, because `localhost`
 * resolves to either depending on the machine. An upgrade whose `Origin` is not `null` is refused with 403 (#3147). That
 * keeps out an ordinary web page's own script, but not a page's sandboxed iframe, whose origin is `null` too (the review
 * of #3204 showed one connecting): the pairing proof above is what tells the plugin apart. The bind and the origin check
 * stay as defense in depth. stdout is the MCP channel; everything human-readable goes to stderr.
 */
import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { PROTOCOL_VERSIONS, META, negotiateHandshakeVersion } from '../../packages/engine/mcp';
import { AGENT_PROTOCOL_VERSION, AGENT_COMMANDS } from '../../apps/plugin/src/agent-protocol';
import { BRIDGE_PORT } from '../../apps/plugin/src/agent-bridge-relay';
import { CODE_ALPHABET, CODE_LENGTH, CLOSE, HELLO_LABEL, PAIR_LABEL, TOKEN_LABEL, formatCode } from '../../apps/plugin/src/bridge-auth';
import type { AgentCommand, AgentResult, AgentLinkState, AgentProgress } from '../../apps/plugin/src/agent-protocol';
import { ENGINE_VERSION } from '@prism3/engine/version';

/** The plugin connects here — read from the relay, which the manifest's `allowedDomains` entry matches (#3147). */
export const DEFAULT_PORT = BRIDGE_PORT;
export const SERVER_INFO = { name: 'prism3-figma-bridge', version: ENGINE_VERSION };

/* ── RFC 6455 framing ───────────────────────────────────────────────────────────────────────────────── */

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
/** `Sec-WebSocket-Accept` for a client key (RFC 6455 §4.2.2). */
export const acceptKey = (key: string): string => createHash('sha1').update(key + GUID).digest('base64');

export const OP = { cont: 0x0, text: 0x1, binary: 0x2, close: 0x8, ping: 0x9, pong: 0xa } as const;
/** Largest message accepted from a client; a build's result with its telemetry is well under this. */
const MAX_MESSAGE = 64 * 1024 * 1024;

/** One unmasked server frame (servers never mask, §5.1). */
export const encodeFrame = (opcode: number, payload: Buffer): Buffer => {
  const n = payload.length;
  const head = n < 126 ? Buffer.alloc(2) : n < 65536 ? Buffer.alloc(4) : Buffer.alloc(10);
  head[0] = 0x80 | opcode;
  if (n < 126) head[1] = n;
  else if (n < 65536) { head[1] = 126; head.writeUInt16BE(n, 2); }
  else { head[1] = 127; head.writeBigUInt64BE(BigInt(n), 2); }
  return Buffer.concat([head, payload]);
};

/**
 * Incremental decoder for CLIENT frames: buffers bytes, unmasks, reassembles fragmented messages, and
 * reports protocol violations instead of guessing. Every client frame must be masked (§5.1).
 */
export const createDecoder = (on: {
  message(text: string): void;
  ping(payload: Buffer): void;
  close(code: number, reason: string): void;
  error(code: number, why: string): void;
}) => {
  let buf = Buffer.alloc(0);
  let parts: Buffer[] = [];
  let partsLen = 0;
  let fragOpcode = -1;
  return (chunk: Buffer): void => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const fin = (buf[0] & 0x80) !== 0;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) {
        if (buf.length < 10) return;
        const big = buf.readBigUInt64BE(2);
        if (big > BigInt(MAX_MESSAGE)) { on.error(1009, 'frame too large'); return; }
        len = Number(big); off = 10;
      }
      if (!masked) { on.error(1002, 'client frames must be masked'); return; }
      if (buf.length < off + 4 + len) return;
      const mask = buf.subarray(off, off + 4);
      const payload = Buffer.from(buf.subarray(off + 4, off + 4 + len));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      buf = buf.subarray(off + 4 + len);
      if (opcode >= 0x8) {
        if (!fin || len > 125) { on.error(1002, 'control frames are unfragmented and ≤125 bytes'); return; }
        if (opcode === OP.close) on.close(len >= 2 ? payload.readUInt16BE(0) : 1005, payload.subarray(2).toString('utf8'));
        else if (opcode === OP.ping) on.ping(payload);
        continue; // pong: nothing to do
      }
      if (opcode === OP.cont) {
        if (fragOpcode < 0) { on.error(1002, 'continuation without a message'); return; }
      } else {
        if (fragOpcode >= 0) { on.error(1002, 'new message inside a fragmented one'); return; }
        if (opcode !== OP.text && opcode !== OP.binary) { on.error(1002, `unknown opcode ${opcode}`); return; }
        fragOpcode = opcode;
      }
      parts.push(payload);
      partsLen += payload.length;
      if (partsLen > MAX_MESSAGE) { on.error(1009, 'message too large'); return; }
      if (fin) {
        const whole = Buffer.concat(parts);
        const wasText = fragOpcode === OP.text;
        parts = []; partsLen = 0; fragOpcode = -1;
        if (wasText) on.message(whole.toString('utf8'));
        else on.error(1003, 'the bridge speaks text frames only');
      }
    }
  };
};

/* ── pairing (#3204) ───────────────────────────────────────────────────────────────────────────────── */

/** Where the secret lives: `$PRISM3_BRIDGE_CONFIG`, else the user's config directory (`%APPDATA%` on Windows,
 *  `$XDG_CONFIG_HOME` or `~/.config` elsewhere), under `prism3/`. */
export const bridgeConfigPath = (env: NodeJS.ProcessEnv = process.env): string => {
  if (env.PRISM3_BRIDGE_CONFIG) return resolve(env.PRISM3_BRIDGE_CONFIG);
  const base = process.platform === 'win32' && env.APPDATA ? env.APPDATA : env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(base, 'prism3', 'figma-bridge.json');
};

/** Read the secret, or make one (`rotate` always makes a new one). The file is written user-only (0600) in a user-only
 *  directory (0700); a file found readable by others is narrowed back to 0600 and named on stderr. */
export const loadSecret = (path: string, opts: { rotate?: boolean; say?: (s: string) => void } = {}): { secret: Buffer; created: boolean } => {
  const say = opts.say ?? (() => undefined);
  if (!opts.rotate && existsSync(path)) {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { secret?: unknown };
    if (typeof raw.secret === 'string' && /^[0-9a-f]{64}$/.test(raw.secret)) {
      if (process.platform !== 'win32' && (statSync(path).mode & 0o077) !== 0) { chmodSync(path, 0o600); say(`narrowed ${path} to mode 0600: it was readable by others`); }
      return { secret: Buffer.from(raw.secret, 'hex'), created: false };
    }
    say(`${path} holds no usable secret: making a new one`);
  }
  const secret = randomBytes(32);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify({ v: 1, secret: secret.toString('hex') }) + '\n', { mode: 0o600 });
  // `mode` applies only when the file is created; a rotated file keeps its old mode unless it is set again.
  if (process.platform !== 'win32') chmodSync(path, 0o600);
  return { secret, created: true };
};

/** Wrong codes allowed before the code is retired and a new one printed. */
export const MAX_PAIR_FAILS = 5;
/** How long a connection may take to pair or prove itself before it is closed. */
export const AUTH_MS = 120_000;

const hmac = (key: string | Buffer, msg: string): Buffer => createHmac('sha256', key).update(msg, 'utf8').digest();
const sameHex = (want: Buffer, got: unknown): boolean => {
  if (typeof got !== 'string' || !/^[0-9a-f]{64}$/.test(got)) return false;
  return timingSafeEqual(want, Buffer.from(got, 'hex'));
};
const newCode = (): string => Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

/** The server's half of the pairing: the token the secret gives, the open code, and the two checks. */
export const createPairing = (secret: Buffer, say: (s: string) => void = () => undefined) => {
  const token = hmac(secret, TOKEN_LABEL).toString('hex');
  let code: string | null = null;
  let fails = 0;
  const issue = () => { code = newCode(); fails = 0; say(`pairing code: ${formatCode(code)} — the Prism3 plugin asks for it the first time it connects on this machine`); };
  issue();
  return {
    token,
    code: (): string | null => (code ? formatCode(code) : null),
    nonce: (): string => randomBytes(32).toString('hex'),
    helloOk: (nonce: string, proof: unknown): boolean => sameHex(hmac(token, HELLO_LABEL + nonce), proof),
    /** A pairing attempt. A right code is spent; after `MAX_PAIR_FAILS` wrong ones the code is retired for a new one. */
    pairOk: (nonce: string, proof: unknown): boolean => {
      if (code === null) return false;
      if (sameHex(hmac(code, PAIR_LABEL + nonce), proof)) { code = null; say('paired: the code is spent'); return true; }
      if (++fails >= MAX_PAIR_FAILS) { say(`${MAX_PAIR_FAILS} wrong pairing codes: that code is retired`); issue(); }
      return false;
    },
  };
};
export type Pairing = ReturnType<typeof createPairing>;

/* ── the bridge (plugin connection + command state) ─────────────────────────────────────────────────── */

type Conn = { socket: Duplex; send(obj: unknown): void; close(code: number, why: string): void; connectedAt: string;
  /** Set by the bridge: the challenge's nonce, whether the token was proved, and the timer that closes a silent one. */
  nonce?: string; authed?: boolean; authTimer?: NodeJS.Timeout };
type LogEntry = { seq: number; at: string; id: string | null; kind: 'log' | 'progress' | 'bridge'; line: string };
const LOG_KEEP = 5000;
/** How long a command in flight waits for a dropped plugin to reconnect before it fails (#2497). */
export const DEFAULT_GRACE_MS = 120_000;
/** Ids whose result was already delivered, so a re-sent copy is named a repeat rather than a stranger. */
const DELIVERED_KEEP = 200;

export const createBridge = (opts: { pairing: Pairing; now?: () => Date; log?: (s: string) => void; graceMs?: number; authMs?: number }) => {
  const now = opts.now ?? (() => new Date());
  const say = opts.log ?? ((s: string) => process.stderr.write(`[figma-bridge] ${s}\n`));
  const graceMs = opts.graceMs ?? DEFAULT_GRACE_MS;
  const pairing = opts.pairing;
  const authMs = opts.authMs ?? AUTH_MS;
  let plugin: Conn | null = null;
  let pluginState: AgentLinkState | null = null;
  /** `conn` is the connection the command was sent on, or the later one whose hello said it holds it. */
  const pending = new Map<string, { conn: Conn; resolve(r: AgentResult): void; reject(e: Error): void; timer: NodeJS.Timeout; onProgress?(p: AgentProgress): void; onLog?(line: string): void }>();
  const delivered = new Set<string>();
  let grace: NodeJS.Timeout | null = null;
  const logs: LogEntry[] = [];
  let seq = 0;
  let queue: Promise<unknown> = Promise.resolve();
  let idSeq = 0;

  const record = (id: string | null, kind: LogEntry['kind'], line: string) => {
    logs.push({ seq: ++seq, at: now().toISOString(), id, kind, line });
    if (logs.length > LOG_KEEP) logs.splice(0, logs.length - LOG_KEEP);
  };

  const fail = (id: string, why: string) => {
    const p = pending.get(id);
    if (!p) return;
    clearTimeout(p.timer);
    pending.delete(id);
    record(id, 'bridge', why);
    p.reject(new Error(why));
  };
  /** Commands sent on a connection that is no longer the plugin's, still waiting for it to come back. */
  const orphans = () => [...pending].filter(([, p]) => p.conn !== plugin).map(([id]) => id);

  /** A new connection, after the handshake: challenge it. It is not the plugin until its hello proves the token. */
  const open = (conn: Conn) => {
    conn.nonce = pairing.nonce();
    conn.authed = false;
    conn.authTimer = setTimeout(() => conn.close(CLOSE.timedOut, 'not paired in time'), authMs);
    conn.send({ type: 'challenge', v: 1, nonce: conn.nonce });
  };
  /** A PAIRED connection (its hello proved the token). Replaces any earlier one; its commands wait for the hello. An
   *  unpaired connection never reaches here, so it can never evict the plugin (#3204). */
  const attach = (conn: Conn) => {
    if (plugin) plugin.close(1000, 'replaced by a newer connection');
    plugin = conn;
    pluginState = null;
    record(null, 'bridge', 'plugin connected');
    say('plugin connected');
  };
  const detach = (conn: Conn) => {
    if (conn.authTimer) { clearTimeout(conn.authTimer); conn.authTimer = undefined; }
    if (plugin !== conn) return;
    plugin = null;
    record(null, 'bridge', 'plugin disconnected');
    say('plugin disconnected');
    if (!pending.size) return;
    if (grace) clearTimeout(grace);
    grace = setTimeout(() => {
      grace = null;
      for (const id of orphans()) fail(id, `the plugin disconnected while this command was running and did not reconnect within ${graceMs} ms`);
    }, graceMs);
  };
  /** The plugin's hello: adopt the commands it holds, fail the ones it does not. Nothing is re-sent. */
  const onHello = (held: unknown) => {
    const ids = new Set(Array.isArray(held) ? held.filter((x): x is string => typeof x === 'string') : []);
    for (const id of orphans()) {
      if (ids.has(id)) { pending.get(id)!.conn = plugin!; record(id, 'bridge', 'the reconnected plugin holds this command'); }
      else fail(id, 'the plugin reconnected while this command was running, and does not hold it: it never reached the plugin, or the plugin was reloaded');
    }
    if (grace && !orphans().length) { clearTimeout(grace); grace = null; }
  };
  /** One text message from a connection. Before its hello proves the token, only `pair` and `hello` are heard; anything
   *  else, or a wrong proof, closes it (#3204). */
  const onMessage = (conn: Conn, text: string) => {
    let m: { type?: string; state?: AgentLinkState; held?: unknown; result?: AgentResult; id?: string; progress?: AgentProgress; line?: string; proof?: unknown };
    try { m = JSON.parse(text); } catch { m = {}; }
    if (!conn.authed) {
      if (m.type === 'pair') {
        if (!pairing.pairOk(conn.nonce!, m.proof)) { record(null, 'bridge', 'a wrong pairing code: refused'); conn.close(CLOSE.wrongCode, 'wrong pairing code'); return; }
        record(null, 'bridge', 'a plugin paired');
        conn.send({ type: 'paired', token: pairing.token });
        return;
      }
      if (m.type === 'hello' && pairing.helloOk(conn.nonce!, m.proof)) {
        conn.authed = true;
        if (conn.authTimer) { clearTimeout(conn.authTimer); conn.authTimer = undefined; }
        attach(conn);
        conn.send({ type: 'welcome' });
      } else {
        record(null, 'bridge', 'a connection without the pairing token: refused');
        conn.close(CLOSE.notPaired, 'not paired');
        return;
      }
    }
    onPluginMessage(m);
  };
  /** One message from the plugin, parsed. */
  const onPluginMessage = (m: { type?: string; state?: AgentLinkState; held?: unknown; result?: AgentResult; id?: string; progress?: AgentProgress; line?: string }) => {
    if (!m.type) { record(null, 'bridge', 'unparseable message from the plugin'); return; }
    if (m.type === 'hello' || m.type === 'state') {
      if (m.state) pluginState = m.state;
      if (m.type === 'hello') onHello(m.held);
      return;
    }
    if (m.type === 'result' && m.result && typeof m.result.id === 'string') {
      const id = m.result.id;
      const p = pending.get(id);
      if (!p) {
        record(id, 'bridge', delivered.has(id) ? 'a repeated result, already delivered: ignored' : 'a result for a command this bridge is not waiting on');
        return;
      }
      clearTimeout(p.timer);
      pending.delete(id);
      delivered.add(id);
      if (delivered.size > DELIVERED_KEEP) delivered.delete(delivered.values().next().value as string);
      if (grace && !orphans().length) { clearTimeout(grace); grace = null; }
      p.resolve(m.result);
      return;
    }
    if (m.type === 'progress' && typeof m.id === 'string' && m.progress) {
      const pr = m.progress;
      record(m.id, 'progress', `${pr.phase} ${pr.done}/${pr.total} (${pr.chunkMs} ms)`);
      pending.get(m.id)?.onProgress?.(pr);
      return;
    }
    if (m.type === 'log' && typeof m.id === 'string' && typeof m.line === 'string') {
      record(m.id, 'log', m.line);
      pending.get(m.id)?.onLog?.(m.line);
    }
  };

  /** Send one command and wait for its result. Queued: one command in flight at a time. */
  const run = (cmd: string, args: unknown, timeoutMs: number, hooks: { onProgress?(p: AgentProgress): void; onLog?(l: string): void } = {}): Promise<AgentResult> => {
    const go = () => new Promise<AgentResult>((res, rej) => {
      if (!plugin) { rej(new Error('no plugin is connected — the owner opens the Prism3 plugin in Figma and switches Agent link on')); return; }
      const id = `b${now().getTime().toString(36)}-${(++idSeq).toString(36)}`;
      const command: AgentCommand = { v: AGENT_PROTOCOL_VERSION, id, cmd, args: args ?? {}, issuedAt: now().toISOString() };
      const timer = setTimeout(() => {
        pending.delete(id);
        rej(new Error(`no result for '${cmd}' (${id}) within ${timeoutMs} ms — the plugin may still be running it; figma_logs shows its last lines`));
      }, timeoutMs);
      pending.set(id, { conn: plugin, resolve: res, reject: rej, timer, ...hooks });
      record(id, 'bridge', `sent ${cmd}`);
      plugin.send({ type: 'command', command });
    });
    const next = queue.then(go, go);
    queue = next.catch(() => undefined);
    return next;
  };

  return {
    open, detach, onMessage, run,
    status: () => ({
      connected: !!plugin, connectedAt: plugin?.connectedAt ?? null, plugin: pluginState, pairingCode: pairing.code(),
      running: [...pending.keys()], awaitingReconnect: orphans(), bridge: SERVER_INFO, protocol: AGENT_PROTOCOL_VERSION, commands: [...AGENT_COMMANDS],
    }),
    logs: (since = 0, limit = 200) => {
      const out = logs.filter((l) => l.seq > since);
      return { entries: out.slice(-limit), last: seq, dropped: Math.max(0, out.length - limit) };
    },
  };
};
export type Bridge = ReturnType<typeof createBridge>;

/* ── the WebSocket listener ─────────────────────────────────────────────────────────────────────────── */

/** The one `Origin` the bridge accepts (#3147): a sandboxed iframe's opaque origin, which is how a Figma plugin's UI
 *  connects. Anything else, a missing header included, is refused. Any page's sandboxed iframe sends it too, so this is
 *  defense in depth, not the gate: the pairing proof is (#3204). */
export const PLUGIN_ORIGIN = 'null';
export const originAllowed = (origin: string | string[] | undefined): boolean => origin === PLUGIN_ORIGIN;

/** Start the listener on loopback (127.0.0.1, plus ::1 when available); `port` 0 picks a free one. */
export const listen = async (bridge: Bridge, port: number): Promise<{ port: number; close(): Promise<void> }> => {
  const onUpgrade = (req: IncomingMessage, socket: Duplex) => {
    const key = req.headers['sec-websocket-key'];
    if (String(req.headers.upgrade).toLowerCase() !== 'websocket' || typeof key !== 'string' || req.headers['sec-websocket-version'] !== '13') {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      return;
    }
    // THE ORIGIN CHECK (#3147): Figma serves a plugin's UI from a sandboxed iframe, whose origin is opaque, so its browser
    // sends `Origin: null`. A page's own script sends the page's origin and is refused here, before the handshake; so is a
    // request with no Origin at all. A page's SANDBOXED iframe sends `null` as well and passes: the pairing proof that
    // follows the handshake is what keeps it out (#3204, `createBridge` `onMessage`).
    if (!originAllowed(req.headers.origin)) {
      socket.end('HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nprism3 figma-bridge: only the Prism3 plugin may connect\n');
      return;
    }
    socket.write(['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${acceptKey(key)}`, '', ''].join('\r\n'));
    let closed = false;
    const conn: Conn = {
      socket,
      connectedAt: new Date().toISOString(),
      send: (obj) => { if (!closed) socket.write(encodeFrame(OP.text, Buffer.from(JSON.stringify(obj), 'utf8'))); },
      close: (code, why) => {
        if (closed) return;
        closed = true;
        const p = Buffer.alloc(2 + Buffer.byteLength(why));
        p.writeUInt16BE(code, 0); p.write(why, 2);
        socket.end(encodeFrame(OP.close, p));
      },
    };
    const decode = createDecoder({
      message: (t) => bridge.onMessage(conn, t),
      ping: (p) => { if (!closed) socket.write(encodeFrame(OP.pong, p)); },
      close: (code) => conn.close(code === 1005 ? 1000 : code, ''),
      error: (code, why) => conn.close(code, why),
    });
    socket.on('data', (d: Buffer) => decode(d));
    // A peer that just goes away (Figma quits, the plugin window is killed) ends its side WITHOUT a close
    // frame. `node:http` upgrades sockets half-open, so without this the server side never closes, 'close'
    // never fires, and a phantom plugin stays "connected" until every command to it times out.
    socket.on('end', () => { closed = true; socket.destroy(); });
    socket.on('close', () => { closed = true; bridge.detach(conn); });
    socket.on('error', () => { closed = true; bridge.detach(conn); });
    bridge.open(conn);
  };
  const make = () => {
    const server = createServer((_req, res) => { res.writeHead(426, { 'content-type': 'text/plain' }).end('prism3 figma-bridge: WebSocket only\n'); });
    server.on('upgrade', onUpgrade);
    return server;
  };
  const bind = (server: ReturnType<typeof make>, host: string, p: number) => new Promise<number>((res, rej) => {
    server.once('error', rej);
    server.listen(p, host, () => { const a = server.address(); res(typeof a === 'object' && a ? a.port : p); });
  });
  const v4 = make();
  const bound = await bind(v4, '127.0.0.1', port);
  const servers = [v4];
  const v6 = make();
  // IPv6 loopback is best-effort: a host without it still serves every client that resolves to 127.0.0.1.
  try { await bind(v6, '::1', bound); servers.push(v6); } catch { /* no ::1 here */ }
  return {
    port: bound,
    close: () => Promise.all(servers.map((sv) => new Promise<void>((r) => { sv.closeAllConnections?.(); sv.close(() => r()); }))).then(() => undefined),
  };
};

/* ── MCP ────────────────────────────────────────────────────────────────────────────────────────────── */

type Rpc = { jsonrpc?: string; id?: number | string | null; method: string; params?: any };
type RpcOut = { jsonrpc: '2.0'; id: number | string | null; result?: unknown; error?: { code: number; message: string; data?: unknown } };

export const TOOLS = [
  {
    name: 'figma_status',
    description: 'Whether the Prism3 plugin in the owner\'s Figma is connected to this bridge, the link state it last reported, and any command in flight. Call first. Not connected while `pairingCode` is set: the owner enters that code in the plugin once per machine. For the file\'s own state, run the `status` command with figma_run.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'figma_run',
    description: `Run one agent-link command in the connected plugin and return its result envelope (v, id, cmd, ok, startedAt, finishedAt, engineVersion, transport, result {verdict, data, logs} | error, progress). Commands: ${AGENT_COMMANDS.join(', ')}. The plugin runs it through the same handler the panel's button reaches. 'prune' with confirm: true deletes — preview with confirm: false first.`,
    inputSchema: {
      type: 'object',
      properties: {
        cmd: { type: 'string', enum: [...AGENT_COMMANDS] },
        args: { type: 'object', description: "apply-theme: {input: BrandInput}; build-components: {def?}; prune: {input, confirm}; others: {}" },
        timeoutMs: { type: 'number', description: 'Default 600000 (a full catalog build takes minutes).' },
      },
      required: ['cmd'],
      additionalProperties: false,
    },
  },
  {
    name: 'figma_logs',
    description: 'Console and progress lines the plugin streamed, newest last. Pass `since` (the `last` from a previous call) to read only new lines.',
    inputSchema: { type: 'object', properties: { since: { type: 'number' }, limit: { type: 'number' } }, additionalProperties: false },
  },
];

/**
 * One run's plugin readings → the MCP `progress` value, which the spec requires to increase with every
 * notification (#1684). A reading's `done` cannot be passed through: it restarts at every SEGMENT — build →
 * wire, each #1679 `retry` pass (1/6 … 6/6), the `wire` reading that closes the back-off, and the next set's
 * build when a command builds several. So a segment ends when the phase changes or `done` fails to rise,
 * and the finished segment's last `done` is folded into an offset: progress = offset + done, floored at the
 * previous value + 1 so a segment opening at `done: 0` still moves forward.
 *
 * No `total` is returned, on purpose. The only totals the plugin knows are per segment, and how many
 * segments a run will have (retry passes, nested sets) is unknown until it ends — any sum would be passed
 * by a later phase. MCP makes `total` optional; the phase's own fraction stays in `message`.
 */
export const createProgressCounter = () => {
  let offset = 0;
  let last = 0;
  let prev: { phase: string; done: number } | null = null;
  return (p: AgentProgress): number => {
    if (prev && (p.phase !== prev.phase || p.done <= prev.done)) offset += prev.done;
    prev = { phase: p.phase, done: p.done };
    last = Math.max(offset + p.done, last + 1);
    return last;
  };
};

const text = (v: unknown, isError = false) => ({ content: [{ type: 'text', text: JSON.stringify(v, null, 2) }], structuredContent: v, ...(isError ? { isError: true } : {}) });

/**
 * Handle one JSON-RPC message; `notify` sends a server notification (progress / log lines during a run).
 * Returns null for a notification, which gets no reply.
 */
export const handleRpc = async (req: Rpc, bridge: Bridge, notify: (method: string, params: unknown) => void): Promise<RpcOut | null> => {
  const id = req.id ?? null;
  const ok = (result: Record<string, unknown>): RpcOut => ({ jsonrpc: '2.0', id, result: { resultType: 'complete', ...result, _meta: { [META.serverInfo]: SERVER_INFO } } });
  const err = (code: number, message: string): RpcOut => ({ jsonrpc: '2.0', id, error: { code, message } });
  switch (req.method) {
    case 'server/discover':
      return ok({ protocolVersions: [...PROTOCOL_VERSIONS], capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO });
    // The engine server's rule, imported rather than copied: a copy here kept the old fallback after
    // #1867 fixed it there, and Claude Code refused the bridge's `2026-07-28` answer (#3109).
    case 'initialize':
      return ok({ protocolVersion: negotiateHandshakeVersion(req.params?.protocolVersion), capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO });
    case 'notifications/initialized':
    case 'initialized':
      return null;
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: TOOLS, ttlMs: 3_600_000, cacheScope: 'public' });
    case 'tools/call': {
      const name = req.params?.name;
      const a = (req.params?.arguments ?? {}) as Record<string, unknown>;
      if (name === 'figma_status') return ok(text(bridge.status()));
      if (name === 'figma_logs') {
        return ok(text(bridge.logs(typeof a.since === 'number' ? a.since : 0, typeof a.limit === 'number' ? a.limit : 200)));
      }
      if (name === 'figma_run') {
        if (typeof a.cmd !== 'string') return ok(text({ error: 'figma_run needs cmd' }, true));
        const timeoutMs = typeof a.timeoutMs === 'number' && a.timeoutMs > 0 ? Math.min(a.timeoutMs, 3_600_000) : 600_000;
        const token = req.params?._meta?.progressToken;
        const progress = createProgressCounter();
        try {
          const r = await bridge.run(a.cmd, a.args ?? {}, timeoutMs, {
            onProgress: (p) => { if (token !== undefined) notify('notifications/progress', { progressToken: token, progress: progress(p), message: `${p.phase} ${p.done}/${p.total}` }); },
            onLog: (line) => notify('notifications/message', { level: 'info', logger: 'figma', data: line }),
          });
          // A result that arrived is the tool working — `ok: false` inside it is the action's own verdict.
          return ok(text(r));
        } catch (e) {
          return ok(text({ error: (e as Error).message }, true));
        }
      }
      return err(-32602, `Unknown tool: ${name}`);
    }
    default:
      return err(-32601, `method not found: ${req.method}`);
  }
};

/* ── I/O shell ──────────────────────────────────────────────────────────────────────────────────────── */

const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--port');
  const port = i >= 0 ? Number(argv[i + 1]) : process.env.PRISM3_BRIDGE_PORT ? Number(process.env.PRISM3_BRIDGE_PORT) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 0 || port > 65535) { process.stderr.write(`[figma-bridge] bad port ${argv[i + 1]}\n`); process.exit(2); }
  const g = argv.indexOf('--grace-ms');
  const graceMs = g >= 0 ? Number(argv[g + 1]) : process.env.PRISM3_BRIDGE_GRACE_MS ? Number(process.env.PRISM3_BRIDGE_GRACE_MS) : DEFAULT_GRACE_MS;
  if (!Number.isInteger(graceMs) || graceMs < 0) { process.stderr.write(`[figma-bridge] bad grace ${argv[g + 1]}\n`); process.exit(2); }
  const c = argv.indexOf('--config');
  const configPath = c >= 0 ? resolve(argv[c + 1]) : bridgeConfigPath();
  const say = (s: string) => process.stderr.write(`[figma-bridge] ${s}\n`);
  let loaded: { secret: Buffer; created: boolean };
  try { loaded = loadSecret(configPath, { rotate: argv.includes('--rotate'), say }); } catch (e) {
    say(`cannot read or write the pairing secret at ${configPath} — ${(e as Error).message}`);
    process.exit(1);
  }
  if (loaded.created) say(`a new pairing secret is in ${configPath}${argv.includes('--rotate') ? ': every paired plugin asks for a code again' : ''}`);
  const bridge = createBridge({ graceMs, pairing: createPairing(loaded.secret, say) });
  const send = (msg: unknown) => process.stdout.write(JSON.stringify(msg) + '\n');
  const notify = (method: string, params: unknown) => send({ jsonrpc: '2.0', method, params });
  const bound = await listen(bridge, port).catch((e: Error) => {
    process.stderr.write(`[figma-bridge] cannot listen on localhost:${port} — ${e.message}\n`);
    process.exit(1);
  });
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buf += chunk;
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let req: Rpc;
      try { req = JSON.parse(line); } catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); continue; }
      // Each request is answered when it finishes; a long figma_run does not block figma_status.
      void handleRpc(req, bridge, notify)
        .then((res) => { if (res) send(res); })
        .catch((e) => send({ jsonrpc: '2.0', id: req.id ?? null, error: { code: -32603, message: `internal error: ${(e as Error).message}` } }));
    }
  });
  process.stdin.on('end', () => { void bound.close().then(() => process.exit(0)); });
  process.stderr.write(`[figma-bridge] listening on localhost:${bound.port} — MCP on stdio — tools: ${TOOLS.map((t) => t.name).join(', ')}\n`);
}
