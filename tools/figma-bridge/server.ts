/**
 * figma-bridge — the agent link's TRANSPORT B: a local MCP server that drives the RUNNING Prism3 plugin in
 * the owner's Figma desktop app over a localhost WebSocket. For large sweeping tests from a Claude Code
 * session on the owner's machine; the file mailbox (`tools/figma-mcp/agent-link.ts`) is for small tests
 * from a cloud session. Both speak ONE protocol — `apps/plugin/src/agent-protocol.ts` — and this server
 * adds nothing to it: it builds the command envelope, hands it to the plugin, and returns the plugin's
 * result envelope unchanged.
 *
 *   npx tsx tools/figma-bridge/server.ts [--port 17331]      (or PRISM3_BRIDGE_PORT)
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
 * `devAllowedDomains`, and Figma refuses any origin it does not list. `--port` exists for the test suite
 * and for a collision; using another port with the real plugin needs that manifest entry changed too.
 *
 * WIRE between this server and the plugin (JSON text frames):
 *   server → plugin   { type: 'command', command: AgentCommand }
 *   plugin → server   { type: 'hello', state } · { type: 'state', state } · { type: 'result', result }
 *                     { type: 'progress', id, progress } · { type: 'log', id, line }
 *
 * One plugin connection at a time (a newer one replaces the older), one command in flight at a time.
 * Bound to the loopback addresses only — 127.0.0.1, and ::1 where the host has it, because `localhost`
 * resolves to either depending on the machine. stdout is the MCP channel; everything human-readable goes to stderr.
 */
import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { PROTOCOL_VERSIONS, LATEST_PROTOCOL_VERSION, META } from '../../packages/engine/mcp';
import { AGENT_PROTOCOL_VERSION, AGENT_COMMANDS } from '../../apps/plugin/src/agent-protocol';
import { BRIDGE_PORT } from '../../apps/plugin/src/agent-bridge-relay';
import type { AgentCommand, AgentResult, AgentLinkState, AgentProgress } from '../../apps/plugin/src/agent-protocol';
import { ENGINE_VERSION } from '@prism3/engine/version';

/** The plugin connects here — read from the relay, which the manifest's `devAllowedDomains` matches. */
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

/* ── the bridge (plugin connection + command state) ─────────────────────────────────────────────────── */

type Conn = { socket: Duplex; send(obj: unknown): void; close(code: number, why: string): void; connectedAt: string };
type LogEntry = { seq: number; at: string; id: string | null; kind: 'log' | 'progress' | 'bridge'; line: string };
const LOG_KEEP = 5000;

export const createBridge = (opts: { now?: () => Date; log?: (s: string) => void } = {}) => {
  const now = opts.now ?? (() => new Date());
  const say = opts.log ?? ((s: string) => process.stderr.write(`[figma-bridge] ${s}\n`));
  let plugin: Conn | null = null;
  let pluginState: AgentLinkState | null = null;
  const pending = new Map<string, { resolve(r: AgentResult): void; reject(e: Error): void; timer: NodeJS.Timeout; onProgress?(p: AgentProgress): void; onLog?(line: string): void }>();
  const logs: LogEntry[] = [];
  let seq = 0;
  let queue: Promise<unknown> = Promise.resolve();
  let idSeq = 0;

  const record = (id: string | null, kind: LogEntry['kind'], line: string) => {
    logs.push({ seq: ++seq, at: now().toISOString(), id, kind, line });
    if (logs.length > LOG_KEEP) logs.splice(0, logs.length - LOG_KEEP);
  };

  const failAll = (why: string) => {
    for (const [id, p] of pending) { clearTimeout(p.timer); p.reject(new Error(why)); pending.delete(id); }
  };

  /** A new plugin connection (after the handshake). Replaces any earlier one. */
  const attach = (conn: Conn) => {
    if (plugin) { plugin.close(1000, 'replaced by a newer connection'); failAll('the plugin reconnected while this command was running'); }
    plugin = conn;
    pluginState = null;
    record(null, 'bridge', 'plugin connected');
    say('plugin connected');
  };
  const detach = (conn: Conn) => {
    if (plugin !== conn) return;
    plugin = null;
    record(null, 'bridge', 'plugin disconnected');
    say('plugin disconnected');
    failAll('the plugin disconnected while this command was running');
  };
  /** One text message from the plugin. */
  const onPluginMessage = (text: string) => {
    let m: { type?: string; state?: AgentLinkState; result?: AgentResult; id?: string; progress?: AgentProgress; line?: string };
    try { m = JSON.parse(text); } catch { record(null, 'bridge', 'unparseable message from the plugin'); return; }
    if (m.type === 'hello' || m.type === 'state') { if (m.state) pluginState = m.state; return; }
    if (m.type === 'result' && m.result && typeof m.result.id === 'string') {
      const p = pending.get(m.result.id);
      if (!p) { record(m.result.id, 'bridge', 'a result for a command this bridge is not waiting on'); return; }
      clearTimeout(p.timer);
      pending.delete(m.result.id);
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
      pending.set(id, { resolve: res, reject: rej, timer, ...hooks });
      record(id, 'bridge', `sent ${cmd}`);
      plugin.send({ type: 'command', command });
    });
    const next = queue.then(go, go);
    queue = next.catch(() => undefined);
    return next;
  };

  return {
    attach, detach, onPluginMessage, run,
    status: () => ({
      connected: !!plugin, connectedAt: plugin?.connectedAt ?? null, plugin: pluginState,
      running: [...pending.keys()], bridge: SERVER_INFO, protocol: AGENT_PROTOCOL_VERSION, commands: [...AGENT_COMMANDS],
    }),
    logs: (since = 0, limit = 200) => {
      const out = logs.filter((l) => l.seq > since);
      return { entries: out.slice(-limit), last: seq, dropped: Math.max(0, out.length - limit) };
    },
  };
};
export type Bridge = ReturnType<typeof createBridge>;

/* ── the WebSocket listener ─────────────────────────────────────────────────────────────────────────── */

/** Start the listener on loopback (127.0.0.1, plus ::1 when available); `port` 0 picks a free one. */
export const listen = async (bridge: Bridge, port: number): Promise<{ port: number; close(): Promise<void> }> => {
  const onUpgrade = (req: IncomingMessage, socket: Duplex) => {
    const key = req.headers['sec-websocket-key'];
    if (String(req.headers.upgrade).toLowerCase() !== 'websocket' || typeof key !== 'string' || req.headers['sec-websocket-version'] !== '13') {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
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
      message: (t) => bridge.onPluginMessage(t),
      ping: (p) => { if (!closed) socket.write(encodeFrame(OP.pong, p)); },
      close: (code) => conn.close(code === 1005 ? 1000 : code, ''),
      error: (code, why) => conn.close(code, why),
    });
    socket.on('data', (d: Buffer) => decode(d));
    socket.on('close', () => { closed = true; bridge.detach(conn); });
    socket.on('error', () => { closed = true; bridge.detach(conn); });
    bridge.attach(conn);
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
    description: 'Whether the Prism3 plugin in the owner\'s Figma is connected to this bridge, the link state it last reported, and any command in flight. Call first. For the file\'s own state, run the `status` command with figma_run.',
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
        timeoutMs: { type: 'number', description: 'Default 600000 (a full catalogue build takes minutes).' },
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
    case 'initialize': {
      const want = req.params?.protocolVersion;
      const version = typeof want === 'string' && (PROTOCOL_VERSIONS as readonly string[]).includes(want) ? want : LATEST_PROTOCOL_VERSION;
      return ok({ protocolVersion: version, capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO });
    }
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
        try {
          const r = await bridge.run(a.cmd, a.args ?? {}, timeoutMs, {
            onProgress: (p) => { if (token !== undefined) notify('notifications/progress', { progressToken: token, progress: p.done, total: p.total, message: `${p.phase} ${p.done}/${p.total}` }); },
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
  const bridge = createBridge();
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
