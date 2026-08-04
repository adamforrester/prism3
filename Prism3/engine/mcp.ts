/**
 * Prism3 engine — MCP adapter (docs/08 §5, roadmap C: "an agent themes Prism3").
 *
 * An agent-callable surface over the pure core. **Dependency-free JSON-RPC 2.0 over
 * stdio** — deliberately NO `@modelcontextprotocol/sdk`: MCP is JSON-RPC plus a small
 * method set (`server/discover` / `tools/list` / `tools/call`, and `initialize` for
 * older clients), so we own the transport the same way the engine owns its YAML parser
 * and colour math. Owning it also meant the 2026-07-28 migration was a day's work in one
 * file rather than an SDK upgrade across a dependency tree. Keeps the
 * no-`npm install` invariant (docs/07 §3) and fits the "pure core, hosts at the edges"
 * posture (docs/15): this file is an **I/O SHELL** — `node:` is allowed here, the pure
 * core (`theme`/`tree`/`modes`/`ai-metadata`/`levers`) is imported and never modified.
 *
 * The request handler `handleRpc` + `callTool` are PURE and unit-tested directly; only
 * the stdio read/write loop behind `isMain` touches the process. Tools:
 *
 *   • list_levers    — the lever manifest: what an agent can turn (labels, groups, knob
 *                      types, enums, defaults, ranges). The presentation catalogue, the
 *                      same one the plugin + playground render from (continuity by source).
 *   • theme_brand    — a `BrandInput` (shape = `schema/theme-schema.json`) → the DTCG token
 *                      tree + `.ai.json` agent metadata + per-mode contrast-contract results
 *                      + the decisions log. The generate-and-verify payoff over one call.
 *   • validate_brand — a `BrandInput` → schema errors (or ok), without generating.
 *
 * The knob CATALOGUE derives from the lever manifest (list_levers); the input SHAPE is
 * `theme-schema.json` (the manifest is presentation, the schema is the precise OKLCH-aware
 * validation half — a `control:'color'` lever is an OKLCH object, not a string).
 *
 * PROTOCOL: speaks `2026-07-28` (stateless — version + client capabilities arrive per
 * request in `_meta`; `server/discover` replaces the handshake) AND `2024-11-05` (the
 * `initialize` handshake, kept so pinned clients keep working). See PROTOCOL_VERSIONS.
 *
 * Run: `npx tsx Prism3/engine/mcp.ts`  (speaks MCP over stdin/stdout; point a client at it).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { brandTheme, BrandInput } from './theme';
import { buildTree, validateBrandInput } from './emit-dtcg';
import { buildAiMetadata } from './ai-metadata';
import { buildLeverManifest } from './levers';
import { scoreConsumption, scoreContractCompliance, UsedPair } from './eval';
import { parseDesignMd } from './design-md';

export const SERVER_INFO = { name: 'prism3-engine', version: '0.1.0' };

/** Protocol revisions this server speaks, newest first.
 *
 *  `2026-07-28` made MCP STATELESS: the `initialize` / `notifications/initialized` handshake and
 *  `ping` were removed, every request carries its protocol version and client capabilities in `_meta`,
 *  and `server/discover` became a MUST. `2024-11-05` is kept because dropping it would break any
 *  client pinned to the handshake, and the two cost one branch to support side by side.
 *
 *  DUAL SUPPORT, concretely: `initialize` and `ping` still answer (they are simply absent from the
 *  newer spec, not forbidden), while `server/discover`, `resultType`, the `_meta` envelope and the
 *  `tools/list` cache hints are added unconditionally — a `2024-11-05` client ignores fields it does
 *  not know, so there is no need to branch the RESPONSE shape on the negotiated version. */
export const PROTOCOL_VERSIONS = ['2026-07-28', '2024-11-05'] as const;
export const LATEST_PROTOCOL_VERSION = PROTOCOL_VERSIONS[0];
/** Retained for the older handshake's reply. */
export const PROTOCOL_VERSION = LATEST_PROTOCOL_VERSION;

/** `_meta` keys the 2026-07-28 revision defines. Spelled out rather than string-literalled at each
 *  use so a typo cannot silently produce an unread field. */
export const META = {
  protocolVersion: 'io.modelcontextprotocol/protocolVersion',
  clientInfo: 'io.modelcontextprotocol/clientInfo',
  clientCapabilities: 'io.modelcontextprotocol/clientCapabilities',
  serverInfo: 'io.modelcontextprotocol/serverInfo',
} as const;

/** Error codes. `-32020`–`-32099` is the range the 2026-07-28 spec reserved for itself; `-32000`–
 *  `-32019` stays implementation-defined. The three below were renumbered by that revision. */
export const ERR = {
  headerMismatch: -32020,
  missingRequiredClientCapability: -32021,
  unsupportedProtocolVersion: -32022,
} as const;

/** Server capabilities, shared by `initialize` and `server/discover` so the two can never disagree.
 *  `listChanged: false` is stated rather than omitted: this tool set is a static array, so the honest
 *  answer is that it never changes — and a client can then skip opening a subscription for it. */
export const CAPABILITIES = { tools: { listChanged: false } };

export type RpcId = number | string | null;
export type RpcRequest = { jsonrpc?: string; id?: RpcId; method: string; params?: any };
export type RpcResponse = { jsonrpc: '2.0'; id: RpcId; result?: unknown; error?: { code: number; message: string; data?: unknown } };
type ToolResult = { content: { type: 'text'; text: string }[]; structuredContent?: unknown; isError?: boolean };

/** The BrandInput fields that are NOT levers, derived from the schema so it cannot drift again.
 *
 *  The lever manifest is a UI PRESENTATION catalogue — labels, groups, knob types, ranges — and it is
 *  right to omit things that are not knobs. The MCP adapter reused it as if it were the API contract,
 *  which is a different job: measured, `list_levers` advertised 21 of the schema's 32 top-level fields.
 *  The 11 it never mentioned included REQUIRED `id` and the whole per-mode override layer (`overrides`,
 *  `modeAnchors`, `modeLevers`). An agent following this tool's own instruction — "call this first to
 *  learn what theme_brand accepts" — produced an input that failed validation on the missing `id`.
 *
 *  Derived by DIFFING the schema against the manifest rather than hand-listing, so a field added to
 *  either side shows up here automatically. `test.ts` asserts the union is total. */
export const nonLeverFields = (brandSchema: unknown, leverKeys: Set<string>): Array<Record<string, unknown>> => {
  const props = ((brandSchema as { properties?: Record<string, { type?: unknown; description?: string; enum?: unknown }> }).properties) ?? {};
  const required: string[] = ((brandSchema as { required?: string[] }).required) ?? [];
  return Object.entries(props)
    .filter(([k]) => !leverKeys.has(k))
    .map(([k, v]) => ({ key: k, required: required.includes(k), type: v.type, description: v.description }));
};

/** Every root key the lever manifest advertises. */
export const manifestRootKeys = (manifest: unknown): Set<string> => {
  const out = new Set<string>();
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (o && typeof o === 'object') {
      const r = o as Record<string, unknown>;
      if (typeof r.key === 'string') out.add(r.key.split('.')[0]);
      Object.values(r).forEach(walk);
    }
  };
  walk(manifest);
  return out;
};

/** What a `theme_brand` call may ask to be included. The token tree and the agent metadata are the
 *  two enormous ones and are OPT-IN — see the tool description for the measured numbers. */
export const THEME_SECTIONS = ['tokens', 'aiMetadata', 'notes'] as const;

/** Tool catalogue.
 *
 *  `theme_brand` takes `{ brand, include }` rather than a bare BrandInput. The old shape is still
 *  accepted (see `readThemeArgs`) because the schema is `additionalProperties: false`, so there was
 *  no way to add an argument alongside the brand without either polluting BrandInput or breaking the
 *  call. Wrapping is the honest fix: a tool's arguments are the tool's own contract, not literally a
 *  domain object.
 *
 *  `validate_brand` does NOT re-inline the 52KB brand schema. Two copies made `tools/list` 91,528
 *  characters — roughly 23,000 tokens to discover three tools — and the second copy taught a client
 *  nothing the first had not. It points at `theme_brand` instead. */
export const toolDefs = (brandSchema: unknown) => [
  {
    name: 'list_levers',
    title: 'List brand controls',
    description: 'List the complete BrandInput surface an agent can set: the lever catalogue (grouped, labelled, typed, with enums, defaults and UI ranges — the same manifest the Figma plugin and web playground render from) PLUS the non-lever fields the manifest does not carry (identity, mode set, and the per-mode override layers). Call this first to learn what theme_brand accepts.',
    inputSchema: { type: 'object', additionalProperties: false },
    outputSchema: {
      type: 'object',
      properties: {
        levers: { type: 'object', description: 'The lever manifest — UI presentation contract.' },
        nonLeverFields: {
          type: 'array', description: 'BrandInput fields that are not UI knobs but are still accepted (and sometimes required).',
          items: { type: 'object', properties: { key: { type: 'string' }, required: { type: 'boolean' }, description: { type: 'string' } }, required: ['key', 'required'] },
        },
        required: { type: 'array', items: { type: 'string' }, description: 'Fields theme_brand will reject a call without.' },
      },
      required: ['levers', 'nonLeverFields', 'required'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'theme_brand',
    title: 'Generate a design-token system',
    description: 'Generate a full design-token system from a brand input, and verify it. Returns the contrast-contract results (every declared a11y pair, computed on the resolved colors across all modes), alias integrity, and the decisions log by default. The DTCG token tree and the .ai.json agent metadata are OPT-IN via `include` because they are large — for a four-mode brand they measure roughly 270,000 and 220,000 characters respectively (~120,000 tokens combined). Arguments: { brand, include }. Call list_levers to see the controls, or validate_brand to check an input first.',
    inputSchema: {
      type: 'object',
      properties: {
        brand: brandSchema,
        include: {
          type: 'array', description: 'Extra sections to return. Omit for the verification payload alone (small).',
          items: { type: 'string', enum: [...THEME_SECTIONS] },
        },
      },
      required: ['brand'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'score_consumption',
    title: 'Score how an agent used the tokens',
    description: 'Score generated output against a brand\'s token system — the check that closes the loop after theme_brand. Give it the token refs your output used and, optionally, the foreground/background pairs it put together. Returns: invented-token rate (refs naming tokens that do not exist), primitive-leak rate (refs reaching past the semantic layer into raw palette/dimension/font tiers), and contrast-contract compliance for every pair across every mode. Deterministic — no model judgement involved.',
    inputSchema: {
      type: 'object',
      properties: {
        // NOT a second inline copy of the 52KB brand schema — that is what made tools/list 91,500
        // chars before, and adding this tool put it straight back to 95,907 until the size gate
        // caught it. One canonical copy lives on theme_brand; everything else points at it.
        brand: { type: 'object', description: 'The same BrandInput you passed to theme_brand — see that tool for the full input schema.' },
        refs: { type: 'array', items: { type: 'string' }, description: 'Token refs the output used. Brace syntax, root-qualified or root-relative all accepted.' },
        pairs: {
          type: 'array', description: 'Optional foreground/background pairs the output placed together, checked against the contrast floor in EVERY mode.',
          items: {
            type: 'object',
            properties: {
              fg: { type: 'string' }, bg: { type: 'string' },
              kind: { type: 'string', enum: ['text', 'large-text', 'ui'], description: 'Sets the floor: text 4.5:1, large-text and ui 3:1. Defaults to text.' },
            },
            required: ['fg', 'bg'],
          },
        },
      },
      required: ['brand', 'refs'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        consumption: { type: 'object', description: 'total / valid / invented / inventedRate / primitiveLeaks / primitiveLeakRate.' },
        contracts: { type: 'object', description: 'checked / pass / rate / failures / unresolved — omitted when no pairs were given.' },
      },
      required: ['consumption'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'theme_from_brief',
    title: 'Generate from a markdown brief',
    description: 'Generate a token system from a design.md brief — YAML frontmatter plus prose — instead of a hand-assembled BrandInput. The natural entry point when working from a written brand description rather than known numbers: it parses the brief, reports the BrandInput it derived, and returns the same verification payload as theme_brand (with the same opt-in `include`). Call theme_brand directly when you already hold exact values.',
    inputSchema: {
      type: 'object',
      properties: {
        brief: { type: 'string', description: 'A design.md document. MUST open with a --- YAML frontmatter fence on the first line.' },
        include: { type: 'array', items: { type: 'string', enum: [...THEME_SECTIONS] }, description: 'Extra sections to return; same meaning as theme_brand.' },
      },
      required: ['brief'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'validate_brand',
    title: 'Validate a brand input',
    description: 'Validate a BrandInput against the engine schema WITHOUT generating. Returns { valid, errors } — a fast pre-flight before theme_brand. Takes the same brand object as theme_brand\'s `brand` argument; see that tool for the full input schema.',
    inputSchema: { type: 'object', description: 'A BrandInput — the same shape as theme_brand\'s `brand` property.' },
    outputSchema: {
      type: 'object',
      properties: { valid: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } } },
      required: ['valid', 'errors'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
];

/** Accept both `{ brand, include }` and a bare BrandInput (the pre-wrap calling convention). Detected
 *  by the presence of a `brand` key, which BrandInput itself has no property named. */
export const readThemeArgs = (args: any): { brand: any; include: string[] } =>
  (args && typeof args === 'object' && 'brand' in args)
    ? { brand: args.brand, include: Array.isArray(args.include) ? args.include : [] }
    : { brand: args, include: [] };

const text = (obj: unknown, isError = false): ToolResult =>
  ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }], ...(isError ? { isError: true } : {}) });

/** A result carrying BOTH `structuredContent` (what a client validates against `outputSchema`) and the
 *  serialised JSON in a text block — the spec asks for the text copy for backwards compatibility with
 *  clients that do not read structured content. */
const structured = (obj: unknown): ToolResult =>
  ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }], structuredContent: obj });

/** Dispatch a tools/call. Pure — imports of the core are all pure functions. Tool-level
 *  failures (bad brand, generation throw) come back as `isError` results, not RPC errors,
 *  per the MCP convention (the call succeeded; the tool reported a problem). */
/** Validate → generate → verification payload. Shared by `theme_brand` and `theme_from_brief` so the
 *  two can never report a brand differently depending on how it was supplied. */
const themePayload = (brand: unknown, include: string[]): ToolResult => {
  const errors = validateBrandInput(brand);
  if (errors.length) return text({ error: 'BrandInput failed schema validation', errors }, true);
  let theme;
  try { theme = brandTheme(brand as BrandInput); }
  catch (e) { return text({ error: `brandTheme failed: ${(e as Error).message}` }, true); }
  const { tree, modes, stats } = buildTree(theme);
  let checks = 0, pass = 0; const failures: string[] = [];
  for (const m of modes) for (const [k, r] of Object.entries(m.roles)) {
    const rr = r as { min: number; ratio: number };
    if (rr.min > 0) { checks++; if (rr.ratio >= rr.min) pass++; else failures.push(`${m.mode}.${k} ${rr.ratio}<${rr.min}`); }
  }
  // The VERIFICATION payload is the default, because that is what "generate and verify" is worth over
  // one call — and because the two omitted sections measured ~490,000 characters for a four-mode
  // brand, which no client can spend on a single tool result.
  const out: Record<string, unknown> = {
    id: theme.id,
    modes: modes.map((m) => m.mode),
    contracts: { checks, pass, failures },
    aliases: { total: stats.aliases, resolved: stats.resolved, broken: stats.broken },
    omitted: THEME_SECTIONS.filter((k) => !include.includes(k)),
  };
  if (include.includes('tokens')) out.tokens = tree;
  if (include.includes('aiMetadata')) out.aiMetadata = buildAiMetadata(theme, tree);
  if (include.includes('notes')) out.notes = theme.notes;
  // Say what was withheld and how to get it — a silently partial result is worse than a big one.
  if ((out.omitted as string[]).length) {
    out.hint = `Withheld by default: ${(out.omitted as string[]).join(', ')}. Re-call with include: [...] to add them (tokens ~270KB, aiMetadata ~220KB for a four-mode brand).`;
  }
  return structured(out);
};

export const callTool = (name: string, args: any, brandSchema?: unknown): ToolResult => {
  if (name === 'list_levers') {
    const levers = buildLeverManifest();
    // The manifest ALONE was the bug: it is the UI catalogue, not the input contract. Shipping the
    // non-lever fields beside it makes this tool's promise ("what theme_brand accepts") true.
    const nonLever = brandSchema ? nonLeverFields(brandSchema, manifestRootKeys(levers)) : [];
    return structured({
      levers,
      nonLeverFields: nonLever,
      required: ((brandSchema as { required?: string[] } | undefined)?.required) ?? [],
    });
  }

  if (name === 'validate_brand') {
    const errors = validateBrandInput(args);
    return structured({ valid: errors.length === 0, errors });
  }

  if (name === 'score_consumption') {
    const errors = validateBrandInput(args?.brand);
    if (errors.length) return text({ error: 'BrandInput failed schema validation', errors }, true);
    if (!Array.isArray(args?.refs)) return text({ error: 'score_consumption requires `refs`: an array of token refs' }, true);
    let theme;
    try { theme = brandTheme(args.brand as BrandInput); }
    catch (e) { return text({ error: `brandTheme failed: ${(e as Error).message}` }, true); }
    const { tree } = buildTree(theme);
    const out: Record<string, unknown> = { consumption: scoreConsumption(args.refs as string[], tree, theme.root) };
    // Pairs are optional: contract compliance is a different question from ref hygiene, and an agent
    // that only reports the tokens it named should still get the first two metrics.
    if (Array.isArray(args.pairs) && args.pairs.length) out.contracts = scoreContractCompliance(args.pairs as UsedPair[], theme);
    return structured(out);
  }

  if (name === 'theme_from_brief') {
    if (typeof args?.brief !== 'string') return text({ error: 'theme_from_brief requires `brief`: a design.md string' }, true);
    let parsed;
    // A malformed brief is a TOOL error, not an RPC one — the model wrote it and can fix it, which is
    // exactly the case the spec says to report with isError so the client can feed it back.
    try { parsed = parseDesignMd(args.brief); }
    catch (e) { return text({ error: `could not parse the design.md brief: ${(e as Error).message}` }, true); }
    const result = themePayload(parsed.input, Array.isArray(args.include) ? args.include : []);
    if (result.isError) return result;
    // Report what the brief RESOLVED to. A brief is lossy by nature, and an agent cannot correct a
    // misreading it never sees — this is the field that makes the round trip debuggable.
    const payload = JSON.parse(result.content[0].text);
    payload.derivedBrandInput = parsed.input;
    return structured(payload);
  }

  if (name === 'theme_brand') {
    const { brand, include } = readThemeArgs(args);
    return themePayload(brand, include);
  }

  return text({ error: `unknown tool: ${name}` }, true);
};

/** Handle one JSON-RPC message. Returns the response, or `null` for a notification
 *  (which gets no reply). Pure: `brandSchema` is injected so there is no file I/O here. */
export const handleRpc = (req: RpcRequest, brandSchema: unknown): RpcResponse | null => {
  const id = req.id ?? null;
  /** Every result carries `resultType: 'complete'` and identifies the server in `_meta`, both required
   *  of a 2026-07-28 server. Added unconditionally: an older client ignores fields it does not know,
   *  and the spec tells newer clients to treat a MISSING `resultType` as `complete` anyway — so the
   *  only shape that is wrong for somebody is a version-branched one. */
  const ok = (result: Record<string, unknown>): RpcResponse =>
    ({ jsonrpc: '2.0', id, result: { resultType: 'complete', ...result, _meta: { [META.serverInfo]: SERVER_INFO } } });
  const err = (code: number, message: string, data?: unknown): RpcResponse =>
    ({ jsonrpc: '2.0', id, error: { code, message, ...(data !== undefined ? { data } : {}) } });

  // Statelessness means the version arrives on the REQUEST, not from a remembered handshake. An
  // absent version is treated as "whatever this server speaks" rather than rejected: older clients
  // never send it, and refusing them would defeat the dual support this is here to provide.
  const asked = (req.params?._meta as Record<string, unknown> | undefined)?.[META.protocolVersion];
  if (typeof asked === 'string' && !(PROTOCOL_VERSIONS as readonly string[]).includes(asked)) {
    return err(ERR.unsupportedProtocolVersion, `unsupported protocol version: ${asked}`, { supported: PROTOCOL_VERSIONS });
  }

  switch (req.method) {
    // 2026-07-28 — MUST implement. The up-front version/capability probe that replaces the handshake.
    case 'server/discover':
      return ok({ protocolVersions: [...PROTOCOL_VERSIONS], capabilities: CAPABILITIES, serverInfo: SERVER_INFO });

    // 2024-11-05 — removed by the newer revision, kept answering so pinned clients still work.
    // Echoes the client's version when we speak it, else our newest, which is what that spec asks.
    case 'initialize': {
      const want = req.params?.protocolVersion;
      const version = typeof want === 'string' && (PROTOCOL_VERSIONS as readonly string[]).includes(want) ? want : LATEST_PROTOCOL_VERSION;
      return ok({ protocolVersion: version, capabilities: CAPABILITIES, serverInfo: SERVER_INFO });
    }
    case 'notifications/initialized':
    case 'initialized':
      return null; // notification — no response
    case 'ping':      // also removed by 2026-07-28; harmless to keep answering
      return ok({});

    case 'tools/list':
      // `ttlMs` + `cacheScope` are required of a 2026-07-28 list result. This catalogue is a static
      // array — it cannot vary per caller and never changes at runtime — so it is `public` and the
      // TTL is generous. Order is the array's order, which satisfies the deterministic-ordering SHOULD.
      return ok({ tools: toolDefs(brandSchema), ttlMs: 3_600_000, cacheScope: 'public' });

    case 'tools/call': {
      const name = req.params?.name;
      if (!name) return err(-32602, 'tools/call requires params.name');
      // An unknown TOOL is a protocol error (the request names something that does not exist); a tool
      // that ran and failed is an `isError` result. -32602 per the spec's own example.
      if (!toolDefs(brandSchema).some((t) => t.name === name)) return err(-32602, `Unknown tool: ${name}`);
      return ok(callTool(name, req.params?.arguments ?? {}, brandSchema) as unknown as Record<string, unknown>);
    }
    default:
      return err(-32601, `method not found: ${req.method}`);
  }
};

// --------------------------------------------------------------------------- I/O shell
// stdio transport: newline-delimited JSON-RPC (MCP messages carry no embedded newlines).
// Read stdin, dispatch each line, write single-line responses to stdout; stderr is the log.
const isMain = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));
  const brandSchema = JSON.parse(readFileSync(resolve(here, '../schema/theme-schema.json'), 'utf8'));
  const send = (msg: RpcResponse) => process.stdout.write(JSON.stringify(msg) + '\n');
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    buf += chunk;
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let req: RpcRequest;
      try { req = JSON.parse(line); }
      catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); continue; }
      let res: RpcResponse | null;
      try { res = handleRpc(req, brandSchema); }
      catch (e) { res = { jsonrpc: '2.0', id: req.id ?? null, error: { code: -32603, message: `internal error: ${(e as Error).message}` } }; }
      if (res) send(res);
    }
  });
  process.stderr.write(`prism3 MCP server ready (stdio) — protocols ${PROTOCOL_VERSIONS.join(', ')} — tools: list_levers, theme_brand, validate_brand\n`);
}
