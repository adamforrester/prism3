/**
 * Prism3 engine — MCP conformance + journey suite, driven over the REAL stdio transport.
 *
 * `test.ts` already exercises `handleRpc` / `callTool` in-process, which is the right place for
 * dispatch logic. It cannot reach the thing a client actually meets: **the transport**. Everything
 * between "a client wrote bytes to a pipe" and "handleRpc saw an object" — newline framing, a message
 * split across chunks, several messages arriving in one chunk, a notification that must produce no
 * reply, a parse error that must not kill the process — was untested. That layer is exactly where an
 * integration bug hides, because every unit test passes while the server is unreachable.
 *
 * So this suite spawns `mcp.ts` as a subprocess and talks to it the way a client does. Three parts:
 *
 *   1. TRANSPORT   — framing and robustness of the stdio loop.
 *   2. CONFORMANCE — the 2026-07-28 requirements, plus the 2024-11-05 surface kept for older clients.
 *   3. JOURNEY     — the end-to-end an agent actually performs: discover the controls, generate from a
 *                    brief, verify, then score its own consumption. Each step consumes the PREVIOUS
 *                    step's output rather than a fixture, so the suite fails if the tools stop
 *                    composing — which no per-tool assertion can catch.
 *
 * Run: `npx tsx Prism3/engine/mcp-test.ts`   (exits non-zero on any failure)
 */
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const V = 'io.modelcontextprotocol/protocolVersion';
const SERVER_INFO_KEY = 'io.modelcontextprotocol/serverInfo';

let pass = 0; const fails: string[] = [];
const ok = (cond: boolean, msg: string): void => { if (cond) pass++; else fails.push(msg); };

type Rpc = { jsonrpc: '2.0'; id: number | string | null; result?: any; error?: { code: number; message: string; data?: unknown } };

/** A live server over stdio. `writeRaw` exists so the transport tests can send bytes that are NOT a
 *  well-formed single line — the whole point of testing this layer. */
class Server {
  proc: ChildProcessWithoutNullStreams;
  private buf = '';
  private seen: Rpc[] = [];
  private stderr = '';
  constructor() {
    this.proc = spawn('npx', ['tsx', resolve(HERE, 'mcp.ts')], { cwd: resolve(HERE, '../..') }) as ChildProcessWithoutNullStreams;
    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (d: string) => {
      this.buf += d;
      let nl: number;
      while ((nl = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, nl).trim();
        this.buf = this.buf.slice(nl + 1);
        if (line) this.seen.push(JSON.parse(line));
      }
    });
    this.proc.stderr.setEncoding('utf8');
    this.proc.stderr.on('data', (d: string) => { this.stderr += d; });
  }
  writeRaw(s: string): void { this.proc.stdin.write(s); }
  send(method: string, params?: unknown, id: number | string = Math.floor(Math.random() * 1e9)): number | string {
    this.writeRaw(JSON.stringify({ jsonrpc: '2.0', id, method, ...(params !== undefined ? { params } : {}) }) + '\n');
    return id;
  }
  /** Await the reply to one id. Rejects on timeout so a hung server fails loudly instead of silently. */
  async reply(id: number | string, ms = 30_000): Promise<Rpc> {
    const deadline = Date.now() + ms;
    for (;;) {
      const hit = this.seen.find((m) => m.id === id);
      if (hit) return hit;
      if (Date.now() > deadline) throw new Error(`timed out waiting for a reply to id ${id}`);
      await new Promise((r) => setTimeout(r, 25));
    }
  }
  async call(name: string, args?: unknown): Promise<any> {
    const id = this.send('tools/call', { name, ...(args !== undefined ? { arguments: args } : {}) });
    const res = await this.reply(id);
    if (res.error) throw new Error(`tools/call ${name} → RPC error ${res.error.code}: ${res.error.message}`);
    return res.result;
  }
  /** The JSON payload a tool result carries in its text block. */
  async callJson(name: string, args?: unknown): Promise<any> {
    const r = await this.call(name, args);
    return { payload: JSON.parse(r.content[0].text), isError: r.isError === true, raw: r };
  }
  seenCount(): number { return this.seen.length; }
  stderrText(): string { return this.stderr; }
  alive(): boolean { return this.proc.exitCode === null && !this.proc.killed; }
  stop(): void { this.proc.kill(); }
}

const server = new Server();
// tsx has to compile before the server answers; the first reply awaits with a generous timeout.
await new Promise((r) => setTimeout(r, 3000));

// ---------------------------------------------------------------- 1. TRANSPORT
{
  // A message split ACROSS writes must still be assembled. This is the failure mode that never shows
  // up locally (where a small message arrives in one chunk) and always shows up under load.
  const before = server.seenCount();
  const msg = JSON.stringify({ jsonrpc: '2.0', id: 'split', method: 'server/discover' }) + '\n';
  server.writeRaw(msg.slice(0, 12));
  await new Promise((r) => setTimeout(r, 120));
  ok(server.seenCount() === before, 'transport: a partial message produces no reply until its newline arrives');
  server.writeRaw(msg.slice(12));
  const split = await server.reply('split');
  ok(split.result?.serverInfo?.name === 'prism3-engine', 'transport: a message split across two writes is reassembled');

  // Several messages in ONE write must all be dispatched, in order.
  server.writeRaw(
    JSON.stringify({ jsonrpc: '2.0', id: 'b1', method: 'ping' }) + '\n' +
    JSON.stringify({ jsonrpc: '2.0', id: 'b2', method: 'ping' }) + '\n');
  const [b1, b2] = [await server.reply('b1'), await server.reply('b2')];
  ok(!!b1.result && !!b2.result, 'transport: two messages in a single write both get replies');

  // Blank lines are skipped, not treated as a parse error.
  server.writeRaw('\n\n');
  await new Promise((r) => setTimeout(r, 120));

  // A parse error is REPORTED and the server keeps serving. A transport that dies on one bad line
  // takes the whole session with it.
  const beforeBad = server.seenCount();
  server.writeRaw('{ this is not json }\n');
  await new Promise((r) => setTimeout(r, 250));
  ok(server.seenCount() > beforeBad, 'transport: malformed JSON produces a parse-error response');
  const stillUp = await server.reply(server.send('server/discover'));
  ok(!!stillUp.result && server.alive(), 'transport: the server survives a malformed message and keeps answering');

  // A notification gets NO reply — the one case where silence is correct.
  const beforeNote = server.seenCount();
  server.writeRaw(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  await new Promise((r) => setTimeout(r, 250));
  ok(server.seenCount() === beforeNote, 'transport: a notification produces no response at all');

  ok(/protocols .*2026-07-28/.test(server.stderrText()), 'transport: the banner goes to stderr (stdout is the protocol channel) and names the protocols');
}

// ------------------------------------------------------------- 2. CONFORMANCE
{
  /** A method's result, or `{}` when the call errored — with the error recorded as a failure.
   *
   *  Without this, a REMOVED method threw on the first property read and took the rest of the suite
   *  with it (found by mutation-testing this file: deleting `server/discover` produced a TypeError
   *  rather than a readable assertion). A suite that dies on the first defect reports one problem per
   *  run; the point of a suite is to report all of them. */
  const resultOf = async (method: string, params?: unknown): Promise<any> => {
    const res = await server.reply(server.send(method, params));
    if (res.error) { fails.push(`conformance: ${method} → unexpected RPC error ${res.error.code}: ${res.error.message}`); return {}; }
    return res.result ?? {};
  };

  const disco = await resultOf('server/discover');
  ok(Array.isArray(disco?.protocolVersions) && disco.protocolVersions.includes('2026-07-28'),
    'conformance: server/discover advertises 2026-07-28 (a MUST in that revision)');
  ok(disco?.serverInfo?.name === 'prism3-engine' && !!disco?.capabilities?.tools,
    'conformance: server/discover carries identity + capabilities');

  // resultType + the _meta server identity on EVERY result, not a sample.
  for (const m of ['server/discover', 'tools/list', 'ping', 'initialize']) {
    const r = await resultOf(m);
    ok(r?.resultType === 'complete', `conformance: ${m} → resultType 'complete'`);
    ok(r?._meta?.[SERVER_INFO_KEY]?.name === 'prism3-engine', `conformance: ${m} → _meta identifies the server`);
  }

  const list = await resultOf('tools/list');
  ok(list.ttlMs > 0 && (list.cacheScope === 'public' || list.cacheScope === 'private'),
    'conformance: tools/list carries the required ttlMs + cacheScope');
  const names = (list.tools ?? []).map((t: any) => t.name);
  const again = ((await resultOf('tools/list')).tools ?? []).map((t: any) => t.name);
  ok(JSON.stringify(names) === JSON.stringify(again), 'conformance: tools/list order is deterministic across calls');
  ok((list.tools ?? []).length > 0 && list.tools.every((t: any) => typeof t.name === 'string' && t.inputSchema && typeof t.inputSchema === 'object'),
    'conformance: every tool has a name and a non-null object inputSchema');
  ok((list.tools ?? []).every((t: any) => /^[A-Za-z0-9_.-]{1,128}$/.test(t.name)),
    'conformance: every tool name matches the allowed character set and length');
  ok((list.tools ?? []).every((t: any) => t.title && t.annotations), 'conformance: every tool carries a title + annotations');
  // The size ceiling that keeps discovery affordable — the schema must be inlined once, not per tool.
  const listChars = JSON.stringify(list.tools ?? []).length;
  ok(listChars < 60_000, `conformance: tools/list stays affordable to fetch (${listChars.toLocaleString()} chars)`);

  // Per-request version negotiation, which is how a stateless server learns the version at all.
  const good = await server.reply(server.send('tools/list', { _meta: { [V]: '2026-07-28' } }));
  ok(good.result?.tools?.length > 0, 'conformance: a request carrying a supported protocolVersion is served');
  const bad = await server.reply(server.send('tools/list', { _meta: { [V]: '1999-01-01' } }));
  ok(bad.error?.code === -32022, 'conformance: an unsupported protocolVersion → -32022 (the reserved MCP range)');
  ok(Array.isArray((bad.error?.data as any)?.supported), 'conformance: the version error names what IS supported, so a client can renegotiate');
  const none = await server.reply(server.send('tools/list'));
  ok(none.result?.tools?.length > 0, 'conformance: a request with no version is still served (older clients never send one)');

  // Error taxonomy: an unknown METHOD and an unknown TOOL are both protocol errors; a tool that RAN
  // and failed is an isError result. Conflating the last two is the common mistake.
  ok((await server.reply(server.send('no/such/method'))).error?.code === -32601, 'conformance: unknown method → -32601');
  ok((await server.reply(server.send('tools/call', { name: 'ghost' }))).error?.code === -32602, 'conformance: unknown tool → -32602 protocol error');
  const ranAndFailed = await server.callJson('validate_brand', { id: 'nope' });
  ok(ranAndFailed.raw.isError !== true && ranAndFailed.payload.valid === false,
    'conformance: a tool that ran and found a problem reports it in the RESULT, not as an RPC error');
  const toolErr = await server.call('theme_brand', { brand: { id: 'bad' } });
  ok(toolErr.isError === true, 'conformance: a tool that could not do its job returns isError so the model can self-correct');

  // Dual support: the older handshake still works and echoes a version we still speak.
  const initOld = await resultOf('initialize', { protocolVersion: '2024-11-05' });
  ok(initOld?.protocolVersion === '2024-11-05', 'conformance: initialize still answers a 2024-11-05 client with its own version');

  // structuredContent must AGREE with the text block, or a client reading one sees different data
  // from a client reading the other.
  const vb = await server.call('validate_brand', { id: 'x', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } });
  ok(vb.structuredContent !== undefined && JSON.stringify(vb.structuredContent) === JSON.stringify(JSON.parse(vb.content[0].text)),
    'conformance: structuredContent and the text block carry identical data');
}

// ----------------------------------------------------------------- 3. JOURNEY
// The end-to-end an agent performs. Each step consumes the PREVIOUS step's output, so this fails if
// the tools stop composing — which no per-tool assertion can detect.
{
  // ① Discover the controls.
  const levers = (await server.callJson('list_levers')).payload;
  ok(levers.required.includes('id'), 'journey ①: list_levers tells the agent `id` is required');
  const nonLever = levers.nonLeverFields.map((f: any) => f.key);
  ok(nonLever.includes('modeLevers'), 'journey ①: the per-mode override layer is discoverable');

  // ② Generate from a brief, the way an agent working from prose would.
  const brief = ['---', 'id: journey', 'primary: { l: 0.58, c: 0.17, h: 265 }', 'neutral: { hue: 265, chroma: 0.008 }',
    'modes: [light, dark]', '---', '', 'A considered, calm brand for a research tool.'].join('\n');
  const gen = await server.callJson('theme_from_brief', { brief });
  ok(!gen.isError, 'journey ②: theme_from_brief generates from a markdown brief');
  ok(gen.payload.derivedBrandInput?.id === 'journey', 'journey ②: the derived BrandInput comes back, so a misreading is visible');
  ok(gen.payload.contracts.checks > 0 && gen.payload.contracts.failures.length === 0,
    `journey ②: every contrast contract passes (${gen.payload.contracts.checks} checks)`);
  ok(gen.payload.aliases.broken.length === 0, 'journey ②: every alias resolves');
  // The default payload has to be small enough for an agent to actually spend context on.
  ok(gen.raw.content[0].text.length < 20_000, `journey ②: the default payload is affordable (${gen.raw.content[0].text.length.toLocaleString()} chars)`);

  // ③ The derived input round-trips through the other entry point identically.
  const direct = (await server.callJson('theme_brand', { brand: gen.payload.derivedBrandInput })).payload;
  ok(JSON.stringify(direct.contracts) === JSON.stringify(gen.payload.contracts),
    'journey ③: theme_brand on the derived input reports an identical result — two doors, one room');

  // ④ Ask for the tokens only when they are needed, and confirm they are real.
  const withTokens = (await server.callJson('theme_brand', { brand: gen.payload.derivedBrandInput, include: ['tokens'] })).payload;
  const root = withTokens.tokens?.prism;
  ok(!!root?.color?.text?.primary?.$value, 'journey ④: include:[tokens] returns a DTCG tree with resolvable semantic roles');
  ok(withTokens.omitted.includes('aiMetadata') && !withTokens.omitted.includes('tokens'),
    'journey ④: the result states what is still withheld');

  // ⑤ Score the agent's own consumption — the loop-closing step, and the reason eval.ts exists.
  const scored = (await server.callJson('score_consumption', {
    brand: gen.payload.derivedBrandInput,
    refs: ['color.text.primary', '{prism.color.background.primary}', 'palette.primary.600', 'color.not.a.token'],
    pairs: [{ fg: 'color.text.primary', bg: 'color.background.primary' }],
  })).payload;
  ok(scored.consumption.invented.length === 1, 'journey ⑤: score_consumption catches the invented ref');
  ok(scored.consumption.primitiveLeaks.length === 1, 'journey ⑤: score_consumption catches the primitive leak');
  // Non-vacuous: both VALID forms must be counted valid, or the invented count would be right by luck.
  ok(scored.consumption.valid === 3, `journey ⑤: brace and root-qualified refs both count as valid (${scored.consumption.valid}/4)`);
  ok(scored.contracts.checked > 0 && scored.contracts.rate === 1,
    'journey ⑤: a correctly paired fg/bg clears its floor in every mode');

  // ⑥ A brand the agent got WRONG must fail loudly rather than quietly generating something bad.
  const bogus = await server.callJson('theme_from_brief', { brief: 'no frontmatter, just prose' });
  ok(bogus.isError, 'journey ⑥: a malformed brief is an actionable tool error the model can retry');
  ok(/frontmatter/i.test(JSON.stringify(bogus.payload)), 'journey ⑥: the error says what was wrong with it');
}

server.stop();

console.log(`\nPrism3 MCP suite: ${pass} passed, ${fails.length} failed`);

// Population floor — same reasoning as `test.ts`'s, and the same measurement: neutering `ok()` printed
// `0 passed, 0 failed` and the confident line below it, at exit 0 (#659). More exposed than `test.ts`
// here, because this suite drives a real subprocess over stdio: a transport that fails to hand back
// any response leaves every assertion unreached rather than failing, which is precisely the shape a
// count floor catches and an outcome check cannot. Loose for the same reason — see `MIN_ASSERTIONS`
// in `test.ts` for why a tracking pin would be worse than this.
const MIN_ASSERTIONS = 40;
if (pass + fails.length < MIN_ASSERTIONS) {
  console.log(`  ❌ only ${pass + fails.length} assertions ran, expected at least ${MIN_ASSERTIONS} — the harness or the transport collapsed, so "0 failed" means nothing.`);
  process.exitCode = 1;
}
if (fails.length) { fails.forEach((f) => console.log(`  ❌ ${f}`)); process.exitCode = 1; }
else if (pass + fails.length >= MIN_ASSERTIONS) console.log('  ✓ transport, 2026-07-28 conformance, and the agent journey all hold over real stdio');
