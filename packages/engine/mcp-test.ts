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
 * Run: `npx tsx packages/engine/mcp-test.ts`   (exits non-zero on any failure)
 */
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { HANDSHAKE_PROBES, MCP_SERVERS } from './mcp-handshake-probes';

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
  // 60,000 is our own ceiling, not raised (#1368). Since #1760 it fails 5,000 chars BEFORE that wall,
  // room for ~20 more levers, and the inline schema carries one-line summaries so a lever's full prose
  // never counts here. Kept in lockstep with test.ts, which also holds the per-summary cap.
  const listChars = JSON.stringify(list.tools ?? []).length;
  ok(listChars <= 55_000, `conformance: tools/list keeps 5,000 chars of headroom under its 60,000 ceiling (${listChars.toLocaleString()} chars; fails above 55,000)`);

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

  // Dual support: the older handshake still works and echoes a version we still speak. #1867: Claude
  // Code asks for 2025-11-25, and answering 2026-07-28 (a revision with no handshake) made it refuse to
  // connect. The probes are shared with every other MCP server's suite (`mcp-handshake-probes.ts`).
  for (const p of HANDSHAKE_PROBES) {
    const init = await resultOf('initialize', { protocolVersion: p.asked, capabilities: {}, clientInfo: { name: 'probe', version: '1' } });
    ok(init?.protocolVersion === p.answer,
      `#1867 conformance: initialize asking for ${p.asked} answers ${p.answer} over stdio, ${p.why} (got ${init?.protocolVersion})`);
  }

  // structuredContent must AGREE with the text block, or a client reading one sees different data
  // from a client reading the other.
  const vb = await server.call('validate_brand', { id: 'x', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } });
  ok(vb.structuredContent !== undefined && JSON.stringify(vb.structuredContent) === JSON.stringify(JSON.parse(vb.content[0].text)),
    'conformance: structuredContent and the text block carry identical data');
}

// ---------------------------------------------------- #4156: llms.txt's example calls run as written
// `docs/public/llms.txt` is the agent entry point, and its "Use the MCP server" block gives one minimal call per
// tool. EXPECTED is that block, read from the file as text; ACTUAL is each call's result from a server started the
// way the block says. Run in a scratch directory, so `export_theme`'s "./tokens" writes there and not into the repo.
// Represented, not counted (docs/34 shape 13): every tool `tools/list` advertises has an example.
// BY-NAME MUTATIONS: break the brand in one example (`"neutral": {"hue": "cool"}`) → the runs-as-written arm names
// that line; delete the export_theme line → the every-tool arm names export_theme; write `"include": ["tokens"]` in the
// prose under the block → the include arm names the missing notes.
{
  const llms = readFileSync(resolve(HERE, '../../docs/public/llms.txt'), 'utf8');
  const section = llms.split(/\n## /).find((s) => s.startsWith('Use the MCP server')) ?? '';
  const fenced = /```jsonl\n([\s\S]*?)```/.exec(section)?.[1] ?? '';
  const lines = fenced.split('\n').filter((l) => l.trim());
  const examples = lines.map((l) => { try { return JSON.parse(l) as { name: string; arguments: unknown }; } catch { return { name: `(unparsed) ${l.slice(0, 60)}`, arguments: undefined }; } });
  ok(/npx --yes tsx@4 packages\/engine\/mcp\.ts/.test(section) && lines.length > 0,
    `#4156: llms.txt says how to start the MCP server and gives example calls (${lines.length} example lines)`);
  const scratch = mkdtempSync(join(tmpdir(), 'p3-llms-'));
  const proc = spawn(resolve(HERE, '../../node_modules/.bin/tsx'), [resolve(HERE, 'mcp.ts')], { cwd: scratch });
  let out = ''; const got = new Map<number, Rpc>();
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (d: string) => {
    out += d; let nl: number;
    while ((nl = out.indexOf('\n')) >= 0) { const line = out.slice(0, nl).trim(); out = out.slice(nl + 1); if (line) { const m = JSON.parse(line) as Rpc; got.set(Number(m.id), m); } }
  });
  examples.forEach((ex, i) => proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: i + 1, method: 'tools/call', params: ex }) + '\n'));
  proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'tools/list' }) + '\n');
  // The prose under the block promises the decisions log AND the token tree from the `include` it names; that sentence
  // is run too, with the theme_brand example's brand (#4335 review: `include` replaces the default, it does not add).
  const prose = section.slice(section.indexOf('```', section.indexOf('```jsonl') + 3) + 3);
  const proseInclude = (() => { try { return JSON.parse(/"include":\s*(\[[^\]]*\])/.exec(prose)?.[1] ?? 'null') as unknown; } catch { return null; } })();
  const themeEx = examples.find((ex) => ex.name === 'theme_brand');
  const PROSE_ID = 9999;
  if (themeEx && Array.isArray(proseInclude)) {
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: PROSE_ID, method: 'tools/call',
      params: { name: 'theme_brand', arguments: { ...(themeEx.arguments as object), include: proseInclude } } }) + '\n');
  }
  const want = examples.length + 1 + (themeEx && Array.isArray(proseInclude) ? 1 : 0);
  const deadline = Date.now() + 60_000;
  while (got.size < want && Date.now() < deadline) await new Promise((r) => setTimeout(r, 50));
  proc.kill();
  const broken = examples.map((ex, i) => [ex, got.get(i + 1)] as const)
    .filter(([, r]) => !r || r.error || r.result?.isError === true)
    .map(([ex, r]) => `${ex.name}: ${!r ? 'no reply' : r.error ? `RPC ${r.error.code} ${r.error.message}` : String(r.result?.content?.[0]?.text ?? '').replace(/\s+/g, ' ').slice(0, 200)}`);
  ok(examples.length > 0 && broken.length === 0, `#4156: every llms.txt example call runs as written (${examples.length - broken.length} of ${examples.length}; failing: ${broken.join('; ') || 'none'})`);
  const advertised = ((got.get(0)?.result?.tools ?? []) as Array<{ name: string }>).map((t) => t.name);
  const unshown = advertised.filter((n) => !examples.some((ex) => ex.name === n));
  ok(advertised.length > 0 && unshown.length === 0, `#4156: llms.txt gives an example call for every tool tools/list advertises (${advertised.length} tools; no example: ${unshown.join(', ') || 'none'})`);
  ok(existsSync(join(scratch, 'tokens')), '#4156: the export_theme example wrote into the directory the server was started in');
  const proseKeys = (() => { try { return Object.keys(JSON.parse(String(got.get(PROSE_ID)?.result?.content?.[0]?.text ?? '{}'))); } catch { return []; } })();
  ok(/decisions log/.test(prose) && proseKeys.includes('notes') && proseKeys.includes('tokens'),
    `#4156: the include llms.txt names returns the decisions log and the token tree it promises (include ${JSON.stringify(proseInclude)} → ${proseKeys.join(', ') || 'no reply'})`);
  rmSync(scratch, { recursive: true, force: true });
}

// ---------------------------------------------- #2146: validate_brand reports the engine's own refusals
// The schema is not the whole contract: `brandTheme` refuses inputs the schema accepts, and `validate_brand`
// called them valid while `theme_brand` then refused them. EXPECTED is each refusal's owner-approved sentence,
// typed here literally. BY-NAME MUTATION: drop the whole build call from the `validate_brand` handler → every
// refusal arm below fails; the valid-brand and malformed-input arms do not.
{
  const B = { id: 'x', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } };
  const bp = (await server.callJson('validate_brand', { ...B, layout: { breakpoints: [320, 768] } })).payload;
  ok(bp.valid === false && bp.errors.length === 1 && bp.errors[0] === 'The first breakpoint must be 0px. This brand starts at 320px.',
    `#2146 validate_brand reports the first-breakpoint refusal (#2132), not just the schema (got ${JSON.stringify(bp)})`);
  const vp = (await server.callJson('validate_brand', { ...B, typography: { responsive: { fluid: true, minViewport: 1280, maxViewport: 375 } } })).payload;
  ok(vp.valid === false && vp.errors.length === 1 && vp.errors[0] === 'The minimum viewport (1280px) must be smaller than the maximum viewport (375px).',
    `#2146 validate_brand reports the viewport-range refusal (#2068), not just the schema (got ${JSON.stringify(vp)})`);
  // #2137, owed by #2157 and #2158 (whichever merged second): the empty breakpoints list. Since #3698 R2 the
  // schema carries `minItems: 2`, so the schema refuses it (and one floor) before `brandTheme` runs, in the
  // validator's own words. EXPECTED typed here literally. BY-NAME MUTATION: drop `minItems` from the schema →
  // both arms fail (the empty list falls through to `brandTheme`'s sentence, and one floor validates).
  const empty = (await server.callJson('validate_brand', { ...B, layout: { breakpoints: [] } })).payload;
  ok(empty.valid === false && empty.errors.length === 1 && empty.errors[0] === 'layout.breakpoints: 0 item(s) < minItems 2',
    `#2137 / #3698 R2 validate_brand refuses an empty breakpoints list (got ${JSON.stringify(empty)})`);
  const one = (await server.callJson('validate_brand', { ...B, layout: { breakpoints: [0] } })).payload;
  ok(one.valid === false && one.errors.length === 1 && one.errors[0] === 'layout.breakpoints: 1 item(s) < minItems 2',
    `#3698 R2 validate_brand refuses a single breakpoint (got ${JSON.stringify(one)})`);
  // #2159: refusals that fire only in `buildTree`, once the modes resolve, after `brandTheme` has accepted the
  // brand. `validate_brand` runs the same build path `theme_brand` does, so they are reported in the engine's
  // own words. EXPECTED is each message typed here literally. BY-NAME MUTATION: drop `buildTree(…)` from the
  // handler (back to `brandTheme` alone) → these two arms fail; the brandTheme arms above do not.
  const step = (await server.callJson('validate_brand', { ...B, overrides: { light: { 'foreground.brand': { palette: 'neutral', step: '999' } } } })).payload;
  ok(step.valid === false && step.errors.length === 1 && step.errors[0] === "overrides[light]: unknown step '999' in palette 'neutral' (role 'foreground.brand')",
    `#2159 validate_brand reports an override naming an unknown step, a refusal only buildTree reaches (got ${JSON.stringify(step)})`);
  const pal = (await server.callJson('validate_brand', { ...B, overrides: { light: { 'foreground.brand': { palette: 'nope', step: '500' } } } })).payload;
  ok(pal.valid === false && pal.errors.length === 1 && pal.errors[0] === "overrides[light]: unknown palette 'nope' (role 'foreground.brand')",
    `#2159 validate_brand reports an override naming an unknown palette, a refusal only buildTree reaches (got ${JSON.stringify(pal)})`);
  // #2198: more than seven breakpoints, refused in the build path, so validate_brand reports the sentence.
  const eight = (await server.callJson('validate_brand', { ...B, layout: { breakpoints: [0, 360, 480, 768, 1024, 1440, 1920, 2560] } })).payload;
  ok(eight.valid === false && eight.errors.length === 1 && eight.errors[0] === 'The brand can have at most seven breakpoints. This brand has 8.',
    `#2198 validate_brand reports the more-than-seven refusal (got ${JSON.stringify(eight)})`);
  // …and so does a generating tool, through #2200's guarded build (isError, the sentence in `errors`).
  const eightTheme = await server.reply(server.send('tools/call', { name: 'theme_brand', arguments: { brand: { ...B, layout: { breakpoints: [0, 360, 480, 768, 1024, 1440, 1920, 2560] } } } }));
  const eightPayload = eightTheme.result ? JSON.parse(eightTheme.result.content[0].text) : null;
  ok(!eightTheme.error && eightTheme.result?.isError === true && eightPayload?.errors?.[0] === 'The brand can have at most seven breakpoints. This brand has 8.',
    `#2198 theme_brand refuses an eighth breakpoint as an isError result carrying the sentence (got ${eightTheme.error ? 'RPC error ' + eightTheme.error.code : JSON.stringify(eightPayload)})`);
  const good = (await server.callJson('validate_brand', B)).payload;
  ok(good.valid === true && good.errors.length === 0, `#2146 a brand the engine builds is still valid, with no errors (got ${JSON.stringify(good)})`);
  // A schema-invalid input is NOT handed to brandTheme: it would fail there with a TypeError rather than a
  // reason. So its errors are the schema's alone, and none reads like a crash.
  const bad = (await server.callJson('validate_brand', { id: 'nope' })).payload;
  ok(bad.valid === false && bad.errors.length > 0 && !bad.errors.some((e: string) => /TypeError|Cannot read|is not a function|undefined/.test(e)),
    `#2146 a schema-invalid input reports schema errors only, never a brandTheme crash (got ${JSON.stringify(bad.errors).slice(0, 200)})`);
}

// ---------------------------------------- #2146 item 2: the breakpoint prose says the first is always 0
// Owner-approved wording (Q26 a), read over the wire an agent uses: the lever description in `list_levers`,
// and the schema description `list_levers describe` returns. BY-NAME MUTATIONS: restore either old sentence
// → its arm fails.
{
  const levers = JSON.stringify((await server.callJson('list_levers')).payload.levers);
  ok(levers.includes('smallest first. The first is always 0px. Names follow') && !levers.includes('Studio keeps the first at 0px'),
    '#2146 the layout.breakpoints lever description says "The first is always 0px." (Q26 a)');
  const schemaBp = (await server.callJson('list_levers', { describe: ['layout'] })).payload.described?.properties?.layout?.properties?.breakpoints?.description ?? '';
  ok(schemaBp.includes('ascending. The first must be 0.'),
    `#2146 the schema's layout.breakpoints description says "The first must be 0." (Q26 a; got "${schemaBp}")`);
  // #2160: the schema stated the names as "Auto-named sm/md/lg/xl/2xl", true only up to five breakpoints. It
  // now carries the lever's approved naming sentence (#2070) word for word. Pinned to EACH OTHER, not to a
  // phrase, so an edit to either one alone fails here: the two are authored separately, and drifted once.
  // BY-NAME MUTATIONS: restore the schema's old "Auto-named …" text → this arm fails; edit the lever's
  // sentence alone → this arm fails.
  const leverNames = /Names follow the count:[^.]*\./.exec(levers)?.[0] ?? '';
  ok(leverNames.length > 40 && schemaBp.includes(leverNames),
    `#2160 the schema's breakpoints description carries the lever's naming sentence word for word (lever: "${leverNames}"; schema: "${schemaBp}")`);
}

// ------------------------------- #2162: a build-time refusal is an isError result, never a protocol error
// An override naming an unknown step passes `brandTheme` and is refused in `buildTree`, once the modes resolve.
// Every generating tool returned that as a -32603 protocol error, which a client may not hand to the model. It
// must be an `isError` result carrying the engine's sentence in `errors`, the shape `validate_brand` reports.
// Read off the RAW reply: `server.call` throws on an RPC error, which would crash this suite rather than fail
// an arm by name. EXPECTED is the engine's sentence, typed here literally. BY-NAME MUTATION: take `buildTree`
// back out of `buildBrand`'s try in mcp.ts → every arm below fails.
{
  const UNKNOWN_STEP = "overrides[light]: unknown step '999' in palette 'neutral' (role 'foreground.brand')";
  const B = { id: 'x', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 }, overrides: { light: { 'foreground.brand': { palette: 'neutral', step: '999' } } } };
  const refusedAs = async (tool: string, args: unknown) => {
    const res = await server.reply(server.send('tools/call', { name: tool, arguments: args }));
    let payload: any = null;
    try { payload = res.result ? JSON.parse(res.result.content[0].text) : null; } catch { /* reported below */ }
    const okShape = !res.error && res.result?.isError === true && Array.isArray(payload?.errors) && payload.errors.length === 1 && payload.errors[0] === UNKNOWN_STEP;
    return { okShape, seen: res.error ? `RPC error ${res.error.code}: ${res.error.message}` : JSON.stringify(payload).slice(0, 200) };
  };
  const brief = ['---', 'id: refusal', 'primary: { l: 0.5, c: 0.15, h: 250 }', 'neutral: { hue: 250, chroma: 0.01 }',
    "overrides: { light: { foreground.brand: { palette: neutral, step: '999' } } }", '---', '', 'A brand with a bad override.'].join('\n');
  for (const [tool, args] of [
    ['theme_brand', { brand: B }],
    ['theme_from_brief', { brief }],
    ['export_theme', { brand: B, outDir: 'mcp-test-refusal-out' }],
    ['score_consumption', { brand: B, refs: ['color.text.primary'] }],
  ] as const) {
    const r = await refusedAs(tool, args);
    ok(r.okShape, `#2162 ${tool}: a build-time refusal comes back as an isError result carrying the engine's sentence, not a protocol error (got ${r.seen})`);
  }
}

// ------------------------------------------- #4122: every tool refuses an argument its schema does not declare
// All six tools declare `additionalProperties: false`, and `include` is an enum, but only `export_theme` checked either:
// a typo in `include` quietly shrank the answer. EXPECTED is typed here per tool, never read from the schemas. The one
// named exception is a call with no `brand` key to a tool that requires one (#4120), such as theme_brand's bare
// BrandInput; test.ts's #4120 block holds the missing-`brand` message. BY-NAME MUTATION: turn the
// shared argument check off in mcp.ts → every refusal arm below fails.
{
  const B = { id: 'args', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } };
  const brief = ['---', 'id: args', 'primary: { l: 0.5, c: 0.15, h: 250 }', 'neutral: { hue: 250, chroma: 0.01 }', '---'].join('\n');
  for (const [tool, args, named] of [
    ['theme_brand', { brand: B, include: ['tokenz'] }, 'tokenz'],
    ['theme_from_brief', { brief, include: ['aiMetaData'] }, 'aiMetaData'],
    ['theme_from_brief', { brief, brand: B }, 'brand'],
    ['list_levers', { foo: 1 }, 'foo'],
    ['score_consumption', { brand: B, refs: ['color.text.primary'], ref: ['x'] }, 'ref'],
    ['export_theme', { brand: B, outDir: 'packages/engine/.mcp-test-4122-out', bogus: true }, 'bogus'],
  ] as const) {
    const r = await server.callJson(tool, args);
    ok(r.isError === true && JSON.stringify(r.payload).includes(named),
      `#4122 ${tool} refuses the undeclared ${JSON.stringify(named)} by name instead of ignoring it (got ${JSON.stringify(r.payload).slice(0, 200)})`);
  }
  rmSync(resolve(HERE, '.mcp-test-4122-out'), { recursive: true, force: true });   // written only when the check is off
  const bare = await server.callJson('theme_brand', B);
  ok(!bare.isError, '#4122 theme_brand still accepts a bare BrandInput, the one named exception (#4120)');
  const none = await server.callJson('theme_brand', { brand: B, include: [] });
  ok(!none.isError && none.payload.omitted?.length === 3, '#4122 theme_brand still accepts an empty include');
  // A present `include` that is not an array (#4277 review): it fell through to the default sections with no error, and
  // export_theme threw `want.filter is not a function` (#4281). EXPECTED: an isError result naming the argument.
  // BY-NAME MUTATION: drop the array-type check from mcp.ts `argumentErrors` → each of these fails.
  for (const [tool, args] of [
    ['theme_brand', { brand: B, include: 'tokens' }],
    ['theme_brand', { brand: B, include: null }],
    ['theme_from_brief', { brief, include: 'aiMetadata' }],
    ['export_theme', { brand: B, outDir: 'packages/engine/.mcp-test-4122-out', include: 'tokenz' }],
  ] as const) {
    let seen: string;
    let refused = false;
    try {
      const r = await server.callJson(tool, args);
      seen = JSON.stringify(r.payload ?? r).slice(0, 200);
      refused = r.isError === true && seen.includes('include must be an array');
    } catch (err) { seen = `threw: ${(err as Error).message.slice(0, 160)}`; }
    ok(refused, `#4122 ${tool} refuses include ${JSON.stringify(args.include)} as not an array instead of answering with the default sections (got ${seen})`);
  }
  rmSync(resolve(HERE, '.mcp-test-4122-out'), { recursive: true, force: true });
}

// ---------------------------------- #4151: a tool that returns structuredContent declares an outputSchema it meets
// theme_brand and theme_from_brief returned structuredContent with no outputSchema, so the generated reference said
// they had none. Every tool in tools/list is called once with a valid input (a tool missing from SAMPLES fails by
// name), and each structured result is checked against the declared schema with a small validator written here, not
// imported from mcp.ts. BY-NAME MUTATION: drop theme_brand's outputSchema → its arm fails.
{
  const conforms = (v: any, s: any, at = '$'): string[] => {
    if (!s || typeof s !== 'object') return [];
    const e: string[] = [];
    const t = s.type;
    const typeOk = !t || (t === 'array' ? Array.isArray(v) : t === 'object' ? v !== null && typeof v === 'object' && !Array.isArray(v)
      : t === 'integer' ? Number.isInteger(v) : typeof v === t);
    if (!typeOk) return [`${at}: not ${t}`];
    if (Array.isArray(s.required)) for (const k of s.required) if (v?.[k] === undefined) e.push(`${at}: missing '${k}'`);
    if (s.properties && v && typeof v === 'object') for (const [k, sub] of Object.entries(s.properties)) if (v[k] !== undefined) e.push(...conforms(v[k], sub, `${at}.${k}`));
    if (s.items && Array.isArray(v)) v.forEach((x: unknown, i: number) => e.push(...conforms(x, s.items, `${at}[${i}]`)));
    if (Array.isArray(s.anyOf) && !s.anyOf.some((b: any) => conforms(v, b, at).length === 0)) e.push(`${at}: matches no anyOf branch`);
    return e;
  };
  const B = { id: 'schema', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } };
  const SAMPLES: Record<string, unknown> = {
    list_levers: {},
    theme_brand: { brand: B, include: ['notes', 'tokens', 'aiMetadata'] },
    score_consumption: { brand: B, refs: ['color.text.primary'], pairs: [{ fg: 'color.text.primary', bg: 'color.background.primary' }] },
    theme_from_brief: { brief: ['---', 'id: schema', 'primary: { l: 0.5, c: 0.15, h: 250 }', 'neutral: { hue: 250, chroma: 0.01 }', '---'].join('\n') },
    export_theme: { brand: B, outDir: 'packages/engine/.mcp-test-4151-out', include: ['tokens'] },
    validate_brand: B,
  };
  const listed = ((await server.reply(server.send('tools/list'))).result?.tools ?? []) as Array<{ name: string; outputSchema?: unknown }>;
  try {
    for (const tool of listed) {
      if (!(tool.name in SAMPLES)) { ok(false, `#4151 ${tool.name} has no sample input here, so its output contract went unchecked`); continue; }
      const res = await server.call(tool.name, SAMPLES[tool.name]);
      if (res.isError || res.structuredContent === undefined) {
        ok(res.structuredContent === undefined && !res.isError, `#4151 ${tool.name}: the sample call succeeded (got ${JSON.stringify(res).slice(0, 200)})`);
        continue;
      }
      const bad = tool.outputSchema ? conforms(res.structuredContent, tool.outputSchema) : ['declares no outputSchema'];
      ok(bad.length === 0, `#4151 ${tool.name} returns structuredContent and declares an outputSchema it meets (${bad.slice(0, 4).join('; ') || 'ok'})`);
    }
  } finally {
    rmSync(resolve(HERE, '.mcp-test-4151-out'), { recursive: true, force: true });
  }
}

// ------------------------------- #2227: a contrast floor no page ground sits on is refused, by sentence
// `surfaces.light.floorStep: 25` sits under no light page ground (white, neutral.050, neutral.100). The DTCG and
// Figma prose name the ground every floor-gated fill clears its bar on, so the Figma color emission had no ground
// to name and threw, outside #2200's guard: export_theme include:["figma"] returned -32603. Since owner Q57 A the
// build refuses such a floor, so validate_brand reports the sentence and export_theme returns it as isError. A
// floor ON a ground (100, background.tertiary) still builds. EXPECTED is the engine's sentence, typed here
// literally. Read off the RAW reply, as #2162 does. BY-NAME MUTATION: drop the refusal from modes.ts `resolve()`
// → the validate_brand and export_theme arms fail (the latter as RPC error -32603); the floor-on-a-ground arm does not.
{
  const OFF_GROUND = 'surfaces.light.floorStep: 25 is not a step a light page ground sits on — the floor is the ground every floor-gated role is measured against. Use 50 (background.secondary) or 100 (background.tertiary).';
  const B = { id: 'x', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } };
  const off = (await server.callJson('validate_brand', { ...B, surfaces: { light: { floorStep: 25 } } })).payload;
  ok(off.valid === false && off.errors.length === 1 && off.errors[0] === OFF_GROUND,
    `#2227 validate_brand refuses a contrast floor no light page ground sits on, by sentence (got ${JSON.stringify(off)})`);
  const res = await server.reply(server.send('tools/call', { name: 'export_theme', arguments: { brand: { ...B, surfaces: { light: { floorStep: 25 } } }, outDir: 'mcp-test-refusal-out', include: ['figma'] } }));
  let payload: any = null;
  try { payload = res.result ? JSON.parse(res.result.content[0].text) : null; } catch { /* reported below */ }
  ok(!res.error && res.result?.isError === true && payload?.errors?.length === 1 && payload.errors[0] === OFF_GROUND,
    `#2227 export_theme include:["figma"] refuses an off-ground floor as an isError result carrying the sentence, not a protocol error (got ${res.error ? `RPC error ${res.error.code}: ${res.error.message}` : JSON.stringify(payload).slice(0, 200)})`);
  const on = (await server.callJson('validate_brand', { ...B, surfaces: { light: { floorStep: 100 } } })).payload;
  ok(on.valid === true && on.errors.length === 0, `#2227 a contrast floor on a page ground (100, background.tertiary) is still valid (got ${JSON.stringify(on)})`);
}

// ------------------------------- #2209: a malformed score_consumption entry is an isError result naming it
// `pairs: [null]` threw in `scoreContractCompliance` (`pair.fg` of null), and `refs: [null]` in `normalizeRef`,
// outside #2162's `buildBrand` guard, so both escaped as -32603 protocol errors. Each case must be an `isError`
// result whose `errors` name the bad entry by index and say what is wrong. Read off the RAW reply, for the same
// reason as #2162 above. EXPECTED sentences are typed here literally, never read from mcp.ts. BY-NAME MUTATION:
// skip `scoreInputErrors` in mcp.ts's score_consumption → the `pairs: [null]`, missing-`bg` and `refs: [null]`
// arms fail as RPC errors, and the bad-`kind` arm fails on the scored result it now gets.
{
  const B = { id: 'x', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } };
  const GOOD = { fg: 'text.primary', bg: 'background.primary' };
  const call = async (args: unknown) => {
    const res = await server.reply(server.send('tools/call', { name: 'score_consumption', arguments: args }));
    let payload: any = null;
    try { payload = res.result ? JSON.parse(res.result.content[0].text) : null; } catch { /* reported below */ }
    return { res, payload, seen: res.error ? `RPC error ${res.error.code}: ${res.error.message}` : JSON.stringify(payload).slice(0, 300) };
  };
  for (const [label, args, want] of [
    ['pairs: [null]', { brand: B, refs: [], pairs: [null] },
      ['pairs[0] is null; each pair is an object with `fg` and `bg` color roles, such as { "fg": "text.primary", "bg": "background.primary" }']],
    ['a pair missing bg, after a good one', { brand: B, refs: [], pairs: [GOOD, { fg: 'text.primary' }] },
      ['pairs[1].bg is missing; it takes a color role, such as "background.primary"']],
    ['a pair that is an array, and one with a numeric fg', { brand: B, refs: [], pairs: [['text.primary', 'background.primary'], { fg: 7, bg: 'background.primary' }] },
      ['pairs[0] is an array; each pair is an object with `fg` and `bg` color roles, such as { "fg": "text.primary", "bg": "background.primary" }',
        'pairs[1].fg is 7; it takes a color role, such as "text.primary"']],
    ['a pair whose kind is outside the enum', { brand: B, refs: [], pairs: [{ ...GOOD, kind: 'heading' }] },
      ['pairs[0].kind is "heading"; it takes text, large-text or ui']],
    ['refs: [null]', { brand: B, refs: ['color.text.primary', null] },
      ['refs[1] is null; each ref is a token path, such as "color.text.primary"']],
  ] as const) {
    const r = await call(args);
    const okShape = !r.res.error && r.res.result?.isError === true && JSON.stringify(r.payload?.errors) === JSON.stringify(want);
    ok(okShape, `#2209 score_consumption, ${label}: an isError result naming the bad entry, not a protocol error (want ${JSON.stringify(want)}; got ${r.seen})`);
  }
  // Control: well-formed input, with every kind and a pair naming no color role, still scores and is not refused.
  const c = await call({ brand: B, refs: ['color.text.primary'], pairs: [GOOD, { ...GOOD, kind: 'text' }, { ...GOOD, kind: 'large-text' }, { ...GOOD, kind: 'ui' }, { fg: 'not.a.role', bg: '' }] });
  ok(!c.res.error && c.res.result?.isError !== true && c.payload?.contracts?.checked > 0 && c.payload?.contracts?.unresolved?.length === 1,
    `#2209 control: well-formed score_consumption input still scores, every kind accepted, an unknown role reported as unresolved (got ${c.seen})`);
}

// ------------------------------- #3109: every MCP server in the repo is driven with the handshake probes
{
  // The bridge kept its own copy of the pre-#1867 fallback because nothing probed it. So find every
  // `initialize` handler in the tree by reading the source, independently of the register, and hold
  // each one to a named suite that reads the shared probes. A scan that found none would pass vacuously,
  // so each registered server must also be FOUND. A handler is a `case` label or a strict-equality
  // comparison on the method name; a test's `method:` request field is neither.
  const ROOT = resolve(HERE, '../..');
  const SKIP = new Set(['node_modules', 'dist', 'release', 'out', '.git']);
  const HANDLER = /(?:case\s+|===\s*)['"]initialize['"]/;
  const found: string[] = [];
  const walk = (rel: string): void => {
    for (const e of readdirSync(resolve(ROOT, rel), { withFileTypes: true })) {
      const path = `${rel}/${e.name}`;
      if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path); }
      else if (/\.(ts|mts|js|mjs)$/.test(e.name) && HANDLER.test(readFileSync(resolve(ROOT, path), 'utf8'))) found.push(path);
    }
  };
  for (const top of ['packages', 'apps', 'tools']) walk(top);
  for (const f of found) {
    ok(f in MCP_SERVERS, `#3109 handshake register: ${f} answers initialize but MCP_SERVERS in mcp-handshake-probes.ts names no suite that probes it`);
  }
  for (const [server, suite] of Object.entries(MCP_SERVERS)) {
    ok(found.includes(server), `#3109 handshake register: ${server} is registered but the scan found no initialize handler in it`);
    ok(/\bHANDSHAKE_PROBES\b/.test(readFileSync(resolve(ROOT, suite), 'utf8')), `#3109 handshake register: ${suite}, the suite for ${server}, does not drive HANDSHAKE_PROBES`);
  }
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
  // ①b The inline schema summarizes; `describe` returns the full text for the fields the agent names (#1760).
  const described = (await server.callJson('list_levers', { describe: ['radiusHairline'] })).payload.described;
  // Matched past the first sentence, so only the full text passes (#2053 retired the lever; the text says so).
  ok(/is always emitted/.test(described?.properties?.radiusHairline?.description ?? ''),
    'journey ①b: list_levers describe returns a field\'s full description over the wire');

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
    // `core.palette.primary.600` since #1102 — the leak probe must reference a path that EXISTS, or it
    // lands in `invented` and all three arms below report the wrong thing. That is exactly what the tier
    // move did here: `palette.primary.600` resolved to nothing, so `primitiveLeaks` went empty and
    // `invented` went to 2. `test.ts` carries the same probe and was corrected in the same lane; THIS copy
    // was missed, which is the argument for the arm being spelled identically in both.
    refs: ['color.text.primary', '{prism.color.background.primary}', 'core.palette.primary.600', 'color.not.a.token'],
    pairs: [{ fg: 'color.text.primary', bg: 'color.background.primary' }],
  })).payload;
  ok(scored.consumption.invented.length === 1, 'journey ⑤: score_consumption catches the invented ref');
  ok(scored.consumption.primitiveLeaks.length === 1 && scored.consumption.primitiveLeaks[0] === 'core.palette.primary.600',
    'journey ⑤: score_consumption catches the primitive leak, and names it — a count alone was satisfied by the ref becoming invented');
  // Non-vacuous: both VALID forms must be counted valid, or the invented count would be right by luck.
  ok(scored.consumption.valid === 3, `journey ⑤: brace and root-qualified refs both count as valid (${scored.consumption.valid}/4)`);
  ok(scored.contracts.checked > 0 && scored.contracts.rate === 1,
    'journey ⑤: a correctly paired fg/bg clears its floor in every mode');

  // ⑥ A brand the agent got WRONG must fail loudly rather than quietly generating something bad.
  const bogus = await server.callJson('theme_from_brief', { brief: 'no frontmatter, just prose' });
  ok(bogus.isError, 'journey ⑥: a malformed brief is an actionable tool error the model can retry');
  ok(/frontmatter/i.test(JSON.stringify(bogus.payload)), 'journey ⑥: the error says what was wrong with it');
}

// ------------------------------------ #4150 / #4147: what a result costs the agent that reads it
// Measured over the wire, where an agent pays for it. #4150: a structured result's text copy is the
// object, unindented; indented it was half again the size (2.7 MB for theme_brand with tokens and
// aiMetadata). Every size an agent reads in the tool descriptions, the withheld-sections hint and the
// engine README is held to ±15% of the size measured here, so the four statements cannot disagree again.
// #4147: list_levers {summary:true} is the compact catalog, under 8,000 characters, and still names every
// lever the full catalog names. EXPECTED for the sizes is the prose itself; ACTUAL is the measured result.
// BY-NAME MUTATIONS: restore `JSON.stringify(obj, null, 2)` in mcp.ts `structured()` → the compact arm fails
// (and test.ts's ±15% arm, which measures the text copy); put back the hint's "~850KB" → the size arm fails;
// drop the `summary` branch from the list_levers handler → both #4147 arms fail.
{
  const B = { id: 'size-probe', primary: { l: 0.5, c: 0.15, h: 250 }, neutral: { hue: 250, chroma: 0.01 } };
  const base = await server.call('theme_brand', { brand: B, include: [] });
  const full = await server.call('theme_brand', { brand: B, include: ['tokens', 'aiMetadata'] });
  ok(full.content[0].text === JSON.stringify(full.structuredContent) && base.content[0].text === JSON.stringify(base.structuredContent),
    `#4150: a structured result's text copy is its structuredContent, compact (theme_brand with tokens and aiMetadata: text ${full.content[0].text.length.toLocaleString('en-US')} chars, structuredContent ${JSON.stringify(full.structuredContent).length.toLocaleString('en-US')})`);
  const measured = {
    tokens: JSON.stringify(full.structuredContent.tokens).length,
    aiMetadata: JSON.stringify(full.structuredContent.aiMetadata).length,
  };
  const near = (stated: number, m: number): boolean => Math.abs(stated - m) / m <= 0.15;
  const num = (s: string | undefined): number => (s === undefined ? NaN : +s.replace(/,/g, ''));
  const toolsId = server.send('tools/list');
  const tools = ((await server.reply(toolsId)).result?.tools ?? []) as Array<{ name: string; description: string }>;
  const descOf = (n: string): string => tools.find((t) => t.name === n)?.description ?? '';
  const themeDesc = descOf('theme_brand').match(/roughly ([\d,]+) and ([\d,]+) characters/);
  const exportDesc = descOf('export_theme').match(/the DTCG tree alone is roughly ([\d,]+) characters/);
  const hint = String(base.structuredContent.hint ?? '').match(/tokens ~([\d,]+) characters, aiMetadata ~([\d,]+)/);
  const readme = readFileSync(resolve(HERE, 'README.md'), 'utf8').match(/a four-mode token tree is roughly ([\d,]+) characters in a tool result/);
  const claims: Array<[string, number, number]> = [
    ['theme_brand description, tokens', num(themeDesc?.[1]), measured.tokens],
    ['theme_brand description, aiMetadata', num(themeDesc?.[2]), measured.aiMetadata],
    ['export_theme description, tokens', num(exportDesc?.[1]), measured.tokens],
    ['theme_brand hint, tokens', num(hint?.[1]), measured.tokens],
    ['theme_brand hint, aiMetadata', num(hint?.[2]), measured.aiMetadata],
    ['engine README, tokens', num(readme?.[1]), measured.tokens],
  ];
  const off = claims.filter(([, stated, m]) => !near(stated, m)).map(([where, stated, m]) => `${where}: states ${Number.isNaN(stated) ? 'nothing' : stated.toLocaleString('en-US')}, measured ${m.toLocaleString('en-US')}`);
  ok(off.length === 0, `#4150: every stated payload size is within 15% of the measured one (${claims.length} statements; off: ${off.join('; ') || 'none'})`);

  const summary = await server.call('list_levers', { summary: true });
  const catalog = await server.call('list_levers', {});
  const fullKeys = (catalog.structuredContent?.levers?.levers ?? []).map((l: { key: string }) => l.key);
  const summaryKeys = (summary.structuredContent?.summary ?? []).map((l: { key: string }) => l.key);
  ok(summary.isError !== true && summary.content[0].text.length < 8_000,
    `#4147: list_levers {summary:true} is the compact catalog, under 8,000 characters (${summary.content[0].text.length.toLocaleString('en-US')}; the full catalog is ${catalog.content[0].text.length.toLocaleString('en-US')})`);
  const missing = fullKeys.filter((k: string) => !summaryKeys.includes(k));
  const nonLever = (summary.structuredContent?.nonLeverFields ?? []).map((f: { key: string }) => f.key).sort().join(',');
  const fullNonLever = (catalog.structuredContent?.nonLeverFields ?? []).map((f: { key: string }) => f.key).sort().join(',');
  ok(fullKeys.length > 0 && missing.length === 0 && summaryKeys.length === fullKeys.length && nonLever === fullNonLever && nonLever.length > 0,
    `#4147: the summary names every lever and non-lever field the full catalog names (${summaryKeys.length} of ${fullKeys.length} levers; missing: ${missing.join(', ') || 'none'})`);
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
