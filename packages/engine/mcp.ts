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
 *   • list_levers      — the lever manifest: what an agent can turn (labels, groups, knob
 *                        types, enums, defaults, ranges). The presentation catalogue, the
 *                        same one the plugin + playground render from (continuity by source).
 *                        With `describe`, the named fields' full schema prose, which the
 *                        inline `theme_brand` schema summarizes (#1760).
 *   • theme_brand      — a `BrandInput` (shape = `schema/theme-schema.json`) → the DTCG token
 *                        tree + `.ai.json` agent metadata + per-mode contrast-contract results
 *                        + the decisions log. The generate-and-verify payoff over one call.
 *   • theme_from_brief — the same generate-and-verify payoff, from a design.md brief (YAML
 *                        frontmatter + prose) instead of a hand-assembled BrandInput.
 *   • score_consumption — scores an agent's generated output against a brand's token system:
 *                         invented-token rate, primitive-leak rate, contrast-contract compliance.
 *   • export_theme     — generates a brand and WRITES its artifacts (tokens.json, ai-metadata.json,
 *                        figma/, and on request the component-defs export, #3425) to a directory, returning a
 *                        manifest rather than the content.
 *   • validate_brand   — a `BrandInput` → schema errors and the engine's input refusals (or ok), without generating.
 *
 * The knob CATALOGUE derives from the lever manifest (list_levers); the input SHAPE is
 * `theme-schema.json` (the manifest is presentation, the schema is the precise OKLCH-aware
 * validation half — a `control:'color'` lever is an OKLCH object, not a string).
 *
 * PROTOCOL: speaks `2026-07-28` (stateless — version + client capabilities arrive per
 * request in `_meta`; `server/discover` replaces the handshake) AND `2024-11-05` (the
 * `initialize` handshake, kept so pinned clients keep working). See PROTOCOL_VERSIONS.
 *
 * Run: `npx tsx packages/engine/mcp.ts`  (speaks MCP over stdin/stdout; point a client at it).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { brandTheme, BrandInput, type Theme } from './theme';
import { buildTree, validateBrandInput } from './emit-dtcg';
import { buildOverlaySet } from './emit-dtcg-overlay';
import { buildAiMetadata } from './ai-metadata';
import { buildLeverManifest } from './levers';
import { figmaArtifacts } from './emit-figma';
import { scoreConsumption, scoreContractCompliance, UsedPair } from './eval';
import { floorRatio } from './color';
import { parseDesignMd } from './design-md';
import { parseStandardDesignMd, isStandardDesignMd, standardToBrandInput } from './standard-design-md';
import { ENGINE_VERSION } from './version';
import { componentDefsFileNames, exportComponentDefs, toSpecsComponents } from './component-defs-export';
import { componentDefs } from './components/index';
import { BUILD_IDENTITY } from './build-identity';

// Reads the shared constant rather than restating it: a hardcoded duplicate is exactly how a
// server ends up reporting a version the artifacts it emits do not agree with.
// #3698 R1: the BUILD identity, `<ENGINE_VERSION>+pending.<n>` between folds and the plain version at one, so two servers
// on one ENGINE_VERSION with different code report differently. The trees and exports it writes carry the same value.
export const SERVER_INFO = { name: 'prism3-engine', version: BUILD_IDENTITY };

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
/** What `initialize` answers when the client asks for a version this server does not speak (#1867).
 *  A client that sends `initialize` is on a pre-2026 revision, because `2026-07-28` removed the
 *  handshake. So the answer is the newest HANDSHAKE revision we speak, never `2026-07-28`: Claude Code
 *  asks for `2025-11-25`, and answering `2026-07-28` made it refuse to connect. */
export const HANDSHAKE_PROTOCOL_VERSION = '2024-11-05';
/** The `initialize` answer for a client that asked for `want`: echoed when it is a handshake revision
 *  this server speaks, otherwise HANDSHAKE_PROTOCOL_VERSION, never `2026-07-28` (#1867). Exported so
 *  every MCP server in the repo answers the handshake by this one rule; `tools/figma-bridge/server.ts`
 *  kept its own copy of the old fallback and Claude Code refused it the same way (#3109). */
export const negotiateHandshakeVersion = (want: unknown): string =>
  typeof want === 'string' && want !== LATEST_PROTOCOL_VERSION && (PROTOCOL_VERSIONS as readonly string[]).includes(want) ? want : HANDSHAKE_PROTOCOL_VERSION;

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
 *  which is a different job: measured, `list_levers` advertised 21 of the schema's 33 top-level fields.
 *  The 12 it never mentioned included REQUIRED `id` and the whole per-mode override layer (`overrides`,
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
    // `enum` is carried through (#471). It was dropped, so `list_levers` could describe a closed set
    // in prose but never name its members — an agent learning that `personality` takes "traits", or
    // `modes` takes "appearance modes", still had to go read `theme_brand`'s inlined schema to find
    // out which. The values are the discoverable part; a description that lists them in sentences is
    // a catalogue an agent has to parse. Item-level enums (arrays) count: that is where the values
    // actually live for both of those fields.
    .map(([k, v]) => {
      const items = (v as { items?: { enum?: unknown } }).items;
      const values = v.enum ?? items?.enum;
      return { key: k, required: required.includes(k), type: v.type, description: v.description, ...(values ? { enum: values } : {}) };
    });
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
 *  two enormous ones and are OPT-IN — see the tool description for the measured numbers. `notes` is
 *  in the DEFAULT set (see `DEFAULT_THEME_SECTIONS`); it is listed here so a caller can drop it. */
export const THEME_SECTIONS = ['tokens', 'aiMetadata', 'notes'] as const;

/** A status tag a schema description opens with ("OPTIONAL.", "OPTIONAL, OPT-IN (off by default).",
 *  "OPTIONAL (Phase A1)."). It says whether a field may be left out, not what the field is, so a summary
 *  never stops at one. */
const STATUS_TAG = /^(OPTIONAL|OPT-IN)\b[^.]*\.$/;

/** Where each sentence of a description ends: a `.` followed by whitespace and a character that is not
 *  lowercase, or by the end of the string. `e.g.` and `i.e.` are not ends ("(e.g. 'aurora')"), and a
 *  decimal point never is (it is not followed by whitespace). A `?` is not an end either: the schema uses
 *  it for optional keys (`{ desktop?, mobile? }`), never to ask a question. */
const sentenceEnds = (d: string): number[] => {
  const ends: number[] = [];
  const re = /\.(?=\s+[^\sa-z]|\s*$)/g;
  for (let m = re.exec(d); m; m = re.exec(d)) {
    if (/(?:^|[^A-Za-z])(?:e\.g|i\.e)\.$/.test(d.slice(0, m.index + 1))) continue;
    ends.push(m.index + 1);
  }
  return ends;
};

/** The inline summary of one schema description: its first sentence, plus any status tag in front of
 *  it. Always a PREFIX of the full text. Compaction truncates and never rewrites, so the summary and the
 *  full description cannot disagree, and no prose is authored twice. */
export const summarizeDescription = (d: string): string => {
  let start = 0;
  for (const end of sentenceEnds(d)) {
    if (!STATUS_TAG.test(d.slice(start, end).trim())) return d.slice(0, end);
    start = end;
  }
  return d;
};

/** The brand schema as `tools/list` inlines it, compacted in two steps. Every keyword but `description`
 *  (types, enums, ranges, defaults, `required`, `$defs`, `$ref`, `$id`) is left exactly as the file has it,
 *  so validation is unchanged: only prose moves, and all of it stays one `list_levers` `describe` call away.
 *
 *  STEP 1 (#1760): each description cut to its summary. Measured on the schema as #1759 left it, the inlined
 *  schema was 52,589 of `tools/list`'s 59,969 characters, 32,333 of them description prose. Cutting it took
 *  the list to 42,314.
 *
 *  STEP 2 (owner decision 2026-11-21, "compress, not raise" again): prose stays inline only where an agent
 *  needs it before its first call. That is the schema's own description, each TOP-LEVEL field's summary,
 *  and the summaries beneath the REQUIRED fields (`id`, `primary`, `neutral`) and in the `$defs` they reach
 *  (`oklch`), so a minimal valid call can be written from `tools/list` alone. Every other description, under
 *  an optional field (its nested properties, items, `oneOf` branches) or in a `$defs` entry only optional
 *  fields use, is dropped. By 2026-11 the list had grown back to 54,509, 491 under the 55,000 alarm (54,897 by merge), and
 *  these deeper descriptions were most of what was growing. Dropping them took it to 41,731 (measured).
 *  What an agent gives up is the prose under an optional field it has not chosen yet; that field's summary,
 *  its whole structure and the enums, ranges and defaults that say what it accepts all stay. `list_levers`
 *  with `describe` returns the field exactly as the file has it, every nested description and the `$defs`
 *  it references included (`test.ts` and `mcp-test.ts` each hold an arm on that). A new optional lever now
 *  costs its structure plus one summary, however much prose its sub-fields carry. */
export const compactSchema = (schema: unknown): unknown => {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return schema;
  const root = schema as { properties?: Record<string, unknown>; required?: unknown; $defs?: Record<string, unknown> };
  const required = new Set(Array.isArray(root.required) ? root.required as string[] : []);
  const keptDefs = new Set(Object.keys(referencedDefs(
    Object.fromEntries(Object.entries(root.properties ?? {}).filter(([k]) => required.has(k))), root.$defs ?? {})));
  return Object.fromEntries(Object.entries(schema as Record<string, unknown>).map(([k, v]) => {
    if (k === 'description' && typeof v === 'string') return [k, summarizeDescription(v)];
    if ((k === 'properties' || k === '$defs') && v && typeof v === 'object' && !Array.isArray(v)) {
      const keep = (name: string): boolean => (k === 'properties' ? required.has(name) : keptDefs.has(name));
      return [k, Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([name, field]) =>
        [name, keep(name) ? prose(field, true) : k === 'properties' ? ownSummaryOnly(field) : prose(field, false)]))];
    }
    return [k, prose(v, false)];
  }));
};

/** An optional top-level field: its own description summarized, every description beneath it dropped. */
const ownSummaryOnly = (field: unknown): unknown => {
  if (!field || typeof field !== 'object' || Array.isArray(field)) return field;
  const out = prose(field, false) as Record<string, unknown>;
  const d = (field as Record<string, unknown>).description;
  return typeof d === 'string' ? { ...out, description: summarizeDescription(d) } : out;
};

/** Keywords whose value is a map of NAMES to schemas, and keywords whose value is data, not a schema.
 *  Under a name map a key is a field name, so a field called `default` or `description` is walked as a
 *  schema; a data value (a `default` object, an `enum` list) is copied as it is. */
const SCHEMA_MAPS = new Set(['properties', '$defs', 'patternProperties']);
const DATA_KEYWORDS = new Set(['default', 'enum', 'const', 'examples']);

/** A schema with every `description` keyword in it summarized (`keep`) or removed, and nothing else changed. */
const prose = (schema: unknown, keep: boolean): unknown => {
  if (Array.isArray(schema)) return schema.map((x) => prose(x, keep));
  if (!schema || typeof schema !== 'object') return schema;
  return Object.fromEntries(Object.entries(schema as Record<string, unknown>)
    .filter(([k, v]) => keep || !(k === 'description' && typeof v === 'string'))
    .map(([k, v]) => [k,
      k === 'description' && typeof v === 'string' ? summarizeDescription(v)
      : DATA_KEYWORDS.has(k) ? v
      : SCHEMA_MAPS.has(k) && v && typeof v === 'object' && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([n, x]) => [n, prose(x, keep)]))
        : prose(v, keep)]));
};

/** Every `$defs` entry a schema fragment reaches through `$ref: "#/$defs/<name>"`, followed transitively,
 *  so a described field brings the full text of the shapes it is built from (`surfaces` → `surfaceMode`
 *  → `surfaceSpec`). */
export const referencedDefs = (fragment: unknown, defs: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      const m = k === '$ref' && typeof v === 'string' ? /^#\/\$defs\/(.+)$/.exec(v) : null;
      if (m && defs[m[1]] !== undefined && !(m[1] in out)) { out[m[1]] = defs[m[1]]; walk(defs[m[1]]); }
      else walk(v);
    }
  };
  walk(fragment);
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
};

/** #4151: what `theme_brand` returns (and `theme_from_brief`, plus `derivedBrandInput`). Both returned structuredContent
 *  with no outputSchema, so a client, and the generated reference, read them as untyped. Open, not
 *  `additionalProperties: false`: a field added to the payload must not make every older client reject it. */
const THEME_OUTPUT_PROPERTIES = {
  id: { type: 'string' },
  modes: { type: 'array', items: { type: 'string' } },
  contracts: {
    type: 'object', description: 'Every declared contrast pair across every mode: how many were checked, how many pass, and each failure.',
    properties: { checks: { type: 'number' }, pass: { type: 'number' }, failures: { type: 'array', items: { type: 'string' } } },
    required: ['checks', 'pass', 'failures'],
  },
  aliases: {
    type: 'object', description: 'Alias integrity: how many aliases, how many resolve, and each broken one.',
    properties: { total: { type: 'number' }, resolved: { type: 'number' }, broken: { type: 'array' } },
    required: ['total', 'resolved', 'broken'],
  },
  omitted: { type: 'array', items: { type: 'string' }, description: 'The sections this result leaves out.' },
  hint: { type: 'string', description: 'How to add the sections it leaves out.' },
  notes: { type: 'array', items: { type: 'string' }, description: 'With include notes (the default): the decisions log.' },
  tokens: { type: 'object', description: 'With include tokens: the DTCG token tree.' },
  aiMetadata: { type: 'object', description: 'With include aiMetadata: the agent metadata.' },
} as const;
const THEME_OUTPUT_REQUIRED = ['id', 'modes', 'contracts', 'aliases', 'omitted'];

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
    // #4200 E (DRAFT): what it lists, without the history of why the non-lever fields were added.
    description: 'List every brand field theme_brand accepts: the levers (typed, with enums, defaults and ranges) and the non-lever fields (id, modes, per-mode overrides). Call first. Pass `describe` with field names for those fields\' full schema descriptions instead.',
    inputSchema: {
      type: 'object',
      properties: {
        describe: { type: 'array', items: { type: 'string' }, description: 'BrandInput field names (e.g. ["typography", "radiusHairline"]). Returns each field\'s schema entry with every description in full, plus the $defs it references, instead of the catalog.' },
      },
      additionalProperties: false,
    },
    // Two result shapes, one schema: a client validates every result against it, and a `describe` call
    // returns `described` alone. `anyOf` over the two `required` sets keeps the root an object (what
    // MCP asks of an outputSchema) while still requiring all three catalog fields on a catalog call.
    outputSchema: {
      type: 'object',
      anyOf: [{ required: ['levers', 'nonLeverFields', 'required'] }, { required: ['described'] }],
      properties: {
        levers: { type: 'object', description: 'The lever manifest — UI presentation contract.' },
        nonLeverFields: {
          type: 'array', description: 'BrandInput fields that are not UI knobs but are still accepted (and sometimes required).',
          items: { type: 'object', properties: { key: { type: 'string' }, required: { type: 'boolean' }, description: { type: 'string' } }, required: ['key', 'required'] },
        },
        required: { type: 'array', items: { type: 'string' }, description: 'Fields theme_brand will reject a call without.' },
        described: { type: 'object', description: 'With `describe`: { properties, $defs }, the named fields\' full schema.' },
      },
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'theme_brand',
    title: 'Generate a design-token system',
    description: `Generate a full design-token system from a brand input, and verify it. Returns the contrast-contract results (every declared a11y pair, computed on the resolved colors across all modes, each failure as { role, mode, ratio, against, min }), alias integrity, and the decisions log by default. The DTCG token tree and the .ai.json agent metadata are OPT-IN via \`include\` because they are large — for a four-mode brand they measure roughly ${PAYLOAD_CHARS.tokens.toLocaleString('en-US')} and ${PAYLOAD_CHARS.aiMetadata.toLocaleString('en-US')} characters respectively (~370,000 tokens combined). Arguments: { brand, include }; the plugin's agent link takes the same object as \`input\`. Call list_levers to see the controls, or validate_brand to check an input first. Each field description in the \`brand\` schema below is a one-line summary; list_levers with \`describe\` returns the full text.`,
    inputSchema: {
      type: 'object',
      properties: {
        // Compacted (#1760, then 2026-11-21): summaries for every top-level field and beneath the required ones, every other keyword verbatim.
        brand: compactSchema(brandSchema),
        include: {
          type: 'array', description: 'Sections to return, replacing the default ["notes"]. Add "tokens" and/or "aiMetadata" for the large payloads; pass [] for the verification result alone.',
          items: { type: 'string', enum: [...THEME_SECTIONS] },
        },
      },
      required: ['brand'],
      additionalProperties: false,
    },
    outputSchema: { type: 'object', properties: THEME_OUTPUT_PROPERTIES, required: THEME_OUTPUT_REQUIRED },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'score_consumption',
    title: 'Score how an agent used the tokens',
    description: 'Score generated output against a brand\'s token system — the check that closes the loop after theme_brand. Give it the token refs your output used and, optionally, the foreground/background pairs it put together. Returns: invented-token rate (refs naming tokens that do not exist), primitive-leak rate (refs reaching past the semantic layer into raw palette/dimension/font tiers), and contrast-contract compliance for every pair across every mode. Deterministic — no model judgment involved.',
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
        contracts: { type: 'object', description: 'checked / pass / rate / vacuous / failures / unresolved — omitted when no pairs were given. vacuous is true when no pair resolved in any mode, so rate 1 measured nothing.' },
      },
      required: ['consumption'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'theme_from_brief',
    title: 'Generate from a markdown brief',
    description: 'Generate a token system from a design.md brief — YAML frontmatter plus prose — instead of a hand-assembled BrandInput. The natural entry point when working from a written brand description rather than known numbers: it parses the brief in either dialect (engine-native frontmatter, or the standard shape: a flat colors: hex map, typography tokens and an optional x-prism3: block), reports the BrandInput it derived, and returns the same verification payload as theme_brand (with the same opt-in `include`). For a standard brief it also returns dialect: "standard", how each color was classified (classification), the x-prism3 keys it applied (xApplied), and what it skipped (xWarnings): unknown x-prism3 keys, and typography faces it does not read. Call theme_brand directly when you already hold exact values.',
    inputSchema: {
      type: 'object',
      properties: {
        brief: { type: 'string', description: 'A design.md document. It must open with a --- YAML frontmatter fence on the first line.' },
        include: { type: 'array', items: { type: 'string', enum: [...THEME_SECTIONS] }, description: 'Sections to return, replacing the default ["notes"]; same meaning as theme_brand.' },
      },
      required: ['brief'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: { ...THEME_OUTPUT_PROPERTIES, derivedBrandInput: { type: 'object', description: 'The BrandInput the brief was read as.' } },
      required: [...THEME_OUTPUT_REQUIRED, 'derivedBrandInput'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'export_theme',
    title: 'Write the token system to disk',
    description: 'Generate a brand and WRITE its artifacts to a directory, returning a manifest of what was written — never the content. Use this instead of theme_brand include:["tokens"] whenever you want the actual files: the DTCG tree alone is roughly 890,000 characters for a four-mode brand, which no tool result should carry. Files carry the names the CLI writes. "tokens" writes <id>.tokens.json (the full DTCG tree), <id>.base.tokens.json and one <id>.<mode>.overlay.tokens.json per other mode (the set a multi-mode code build reads); "aiMetadata" writes <id>.ai.json; "figma" writes a figma/ directory of Figma collection files; "componentSpecs" writes <id>.component-contracts.json (every component contract, with the brand\'s settings resolved), <id>.component-defs.json (the same file under its old name) and <id>.component-defs.specs.json (the same in the Specs format). `include` replaces the default ["tokens", "aiMetadata", "figma"]; for everything, pass all four. For one release each file is also written under its old unprefixed name (tokens.json, ai-metadata.json, component-contracts.json, component-defs.json, component-defs.specs.json). Arguments: { brand, outDir, include }. `outDir` must be a RELATIVE path. Requires a host that granted filesystem access; returns an error if not.',
    inputSchema: {
      type: 'object',
      properties: {
        // Points at theme_brand rather than inlining the 52KB brand schema a second time — the same
        // rule score_consumption follows, and the reason tools/list has a size gate at all.
        brand: { type: 'object', description: 'The same BrandInput you would pass to theme_brand — see that tool for the full input schema.' },
        outDir: { type: 'string', description: 'Relative directory to write into (e.g. "./tokens"). Absolute paths and ".." segments are refused.' },
        include: {
          type: 'array', description: 'Artifact families to write, replacing the default ["tokens", "aiMetadata", "figma"]. componentSpecs is written only when named, so pass all four for everything.',
          items: { type: 'string', enum: [...EXPORT_SECTIONS] },
        },
      },
      required: ['brand', 'outDir'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        outDir: { type: 'string' },
        total: { type: 'number', description: 'How many files were written.' },
        totalBytes: { type: 'number' },
        written: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, bytes: { type: 'number' } }, required: ['path', 'bytes'] } },
        sections: { type: 'array', items: { type: 'string' } },
      },
      required: ['total', 'written'],
    },
    // The ONLY tool on this surface that is not read-only, stated rather than inherited. Clients use
    // this annotation to decide what to auto-approve, so a writing tool that claimed readOnlyHint
    // would be actively misleading — which is also why this is its own tool rather than a flag on
    // theme_brand: a flag would flip the annotation's truth depending on the arguments.
    annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'validate_brand',
    title: 'Validate a brand input',
    description: 'Validate a BrandInput against the engine schema and the engine\'s own input refusals, WITHOUT generating tokens. Returns { valid, errors } — a fast pre-flight before theme_brand. Arguments: { brand }, the same argument theme_brand takes; see that tool for the full input schema. A bare BrandInput, with no `brand` key, is still accepted for one release.',
    // #4120 (owner decision A, 2026-11-19): `{ brand }`, the shape every other brand-taking tool takes, so one
    // object passes through the documented pre-flight unchanged. The bare form (this tool's old shape) is still
    // read for one release, as `theme_brand` reads it (`readBrandArg`).
    inputSchema: {
      type: 'object',
      properties: {
        brand: { type: 'object', description: 'The same BrandInput you pass to theme_brand — see that tool for the full input schema.' },
      },
      required: ['brand'],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: { valid: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } } },
      required: ['valid', 'errors'],
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
];

/** Sections included when the caller does not say. `notes` is the decisions log — every gap the
 *  engine filled on the brand's behalf, including the ones a person should look at ("action: follows
 *  the primary palette (the default) — buttons and links take the brand hue; …").
 *
 *  It was opt-in until now, grouped with `tokens` and `aiMetadata` under "withheld by default".
 *  That grouping was by CATEGORY when the only thing justifying it is COST, and the measured costs
 *  are two-to-three orders of magnitude apart for a four-mode brand:
 *
 *      tokens      536,770 chars     aiMetadata  287,283 chars     notes  3,653 chars
 *
 *  (Measured when `notes` became a default. Re-measured 2026-09-24, #1623: tokens ~850,000 and
 *  aiMetadata ~500,000; re-measured 2026-09-26, #1670: ~890,000 and ~590,000, the aiMetadata figure having
 *  drifted to the edge of the test's 15% band — the tool descriptions carry the current figures.)
 *
 *  Withholding the two huge payloads is right — no client can spend half a megabyte on one result.
 *  Withholding 3.6KB cost an agent the single most decision-relevant thing the engine produces, and
 *  did it silently: an agent that never passes `include` gets a themed brand with no indication that
 *  fifteen choices were made for it. Defaults decide what most callers actually see. */
export const DEFAULT_THEME_SECTIONS = ['notes'];
/** #4200 D (DRAFT): the two large payloads' size for a four-mode brand, one figure each, stated once. The description and
 *  the withheld-section hint both read it, and test.ts holds it to ±15% of the measured size. */
export const PAYLOAD_CHARS = { tokens: 890_000, aiMetadata: 590_000 } as const;

/** Accept both `{ brand, include }` and a bare BrandInput (the pre-wrap calling convention). Detected
 *  by the presence of a `brand` key, which BrandInput itself has no property named. */
export const readThemeArgs = (args: any): { brand: any; include: string[] } =>
  (args && typeof args === 'object' && 'brand' in args)
    ? { brand: args.brand, include: Array.isArray(args.include) ? args.include : [...DEFAULT_THEME_SECTIONS] }
    : { brand: args, include: [...DEFAULT_THEME_SECTIONS] };

/** #4200 C (DRAFT): the two failure headers every brand-taking tool uses, one for the shape and one for a value the
 *  engine refuses, so an agent reads one phrase per kind across the surface. */
export const FAILS_SCHEMA = 'the brand input fails the schema';
export const REFUSED_BY_ENGINE = 'the engine refused the brand input';
/** #4120: the brand a tool was given. `{ brand }` is the shape every brand-taking tool declares; a bare BrandInput
 *  (validate_brand's old shape, which theme_brand also read) is still accepted for one release where `bare` is set. */
const readBrandArg = (args: any, bare: boolean): unknown =>
  args && typeof args === 'object' && 'brand' in args ? args.brand : bare ? args : undefined;
/** #4120: a missing or non-object `brand`, named, instead of the validator's `(root): expected object`. DRAFT wording. */
const missingBrand = (tool: string, brand: unknown): ToolResult | undefined =>
  brand && typeof brand === 'object' && !Array.isArray(brand) ? undefined
    : text({ error: `${tool} requires \`brand\`: a BrandInput object`, errors: [`brand is ${shapeOf(brand)}; it takes a BrandInput object, such as { "id": "acme", "primary": { "l": 0.55, "c": 0.18, "h": 265 }, "neutral": { "hue": "cool", "chroma": 0.01 } }`] }, true);

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
/** Build a schema-valid brand the way every generating tool does, `brandTheme` then `buildTree`, and turn a
 *  refusal from EITHER into an `isError` result carrying the engine's own sentence in `errors`, the shape the
 *  schema failure above already uses (#2162). Before, `buildTree` sat outside every `try`, so a refusal that
 *  fires only when the modes resolve (an override naming an unknown palette or step) escaped `tools/call` as a
 *  -32603 protocol error, which a client may not hand back to the model. Call it on schema-valid input only. */
/** #3698 R1: a tree this server hands out carries its build identity beside the engine version, when that says more. */
const stampBuild = (built: ReturnType<typeof buildTree>): ReturnType<typeof buildTree> => {
  if (BUILD_IDENTITY !== ENGINE_VERSION) built.tree.$extensions.generator.build = BUILD_IDENTITY;
  return built;
};
const buildBrand = (brand: unknown): { theme: Theme; built: ReturnType<typeof buildTree> } | ToolResult => {
  try { const theme = brandTheme(brand as BrandInput); return { theme, built: stampBuild(buildTree(theme)) }; }
  catch (e) { return text({ error: REFUSED_BY_ENGINE, errors: [(e as Error).message] }, true); }
};
const refused = (r: ReturnType<typeof buildBrand>): r is ToolResult => 'content' in r;

/** How a malformed value reads in a refusal: `missing`, `null`, `an array`, `an object`, or the value itself. */
const shapeOf = (v: unknown): string =>
  v === undefined ? 'missing' : v === null ? 'null' : Array.isArray(v) ? 'an array' : typeof v === 'object' ? 'an object' : typeof v === 'string' ? JSON.stringify(v) : String(v);

/** Each `refs` item and `pairs` entry `score_consumption` was given, checked against its inputSchema before
 *  anything reads it (#2209). Before, `pairs: [null]` reached `scoreContractCompliance`, whose `pair.fg` threw,
 *  and `refs: [null]` reached `normalizeRef`'s `.trim()`; either escaped `tools/call` as a -32603 protocol error,
 *  which #2162's `buildBrand` guard does not cover because neither runs inside it. A `kind` outside the enum
 *  threw nothing: it was scored silently at the 4.5:1 text floor. Names every bad entry by index, so the caller
 *  fixes all of them in one round. A `pairs` that is not an array is still ignored, as an absent one is. */
const scoreInputErrors = (refs: unknown[], pairs: unknown): string[] => {
  const errors: string[] = [];
  refs.forEach((r, i) => { if (typeof r !== 'string') errors.push(`refs[${i}] is ${shapeOf(r)}; each ref is a token path, such as "color.text.primary"`); });
  if (!Array.isArray(pairs)) return errors;
  pairs.forEach((p, i) => {
    if (!p || typeof p !== 'object' || Array.isArray(p)) {
      errors.push(`pairs[${i}] is ${shapeOf(p)}; each pair is an object with \`fg\` and \`bg\` color roles, such as { "fg": "text.primary", "bg": "background.primary" }`);
      return;
    }
    const pair = p as Record<string, unknown>;
    for (const [k, eg] of [['fg', 'text.primary'], ['bg', 'background.primary']] as const) {
      if (typeof pair[k] !== 'string') errors.push(`pairs[${i}].${k} is ${shapeOf(pair[k])}; it takes a color role, such as "${eg}"`);
    }
    if (pair.kind !== undefined && !['text', 'large-text', 'ui'].includes(pair.kind as string)) {
      errors.push(`pairs[${i}].kind is ${shapeOf(pair.kind)}; it takes text, large-text or ui`);
    }
  });
  return errors;
};

/** Validate → generate → verification payload. Shared by `theme_brand` and `theme_from_brief` so the
 *  two can never report a brand differently depending on how it was supplied. */
const themePayload = (brand: unknown, include: string[]): ToolResult => {
  const errors = validateBrandInput(brand);
  if (errors.length) return text({ error: FAILS_SCHEMA, errors }, true);
  const b = buildBrand(brand);
  if (refused(b)) return b;
  const { theme, built: { tree, modes, stats } } = b;
  // #4200 owner decision 4 (a), 2026-11-19: each failure is data, { role, mode, ratio, against, min }, the fields
  // the CLI's failure line (#4271) prints, instead of the string `dark.text.secondary 4.39<4.5`. score_consumption's
  // failures share mode, ratio and min, but key by `pair` and carry no `against`. The ratio is
  // floored for display, never rounded up onto the floor (#3759).
  let checks = 0, pass = 0; const failures: { role: string; mode: string; ratio: number; against: string; min: number }[] = [];
  for (const m of modes) for (const [k, r] of Object.entries(m.roles)) {
    const rr = r as { min: number; ratio: number; against: string };
    if (rr.min > 0) { checks++; if (rr.ratio >= rr.min) pass++; else failures.push({ role: k, mode: m.mode, ratio: floorRatio(rr.ratio), against: rr.against, min: rr.min }); }
  }
  // The VERIFICATION payload is the default, because that is what "generate and verify" is worth over
  // one call — and because the two omitted sections measure ~1,350,000 characters for a four-mode
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
  // #4200 D (DRAFT): true whether the caller passed `include` or not, with the sizes from the one constant.
  if ((out.omitted as string[]).length) {
    const size = (k: string): string => (k in PAYLOAD_CHARS ? ` (~${PAYLOAD_CHARS[k as keyof typeof PAYLOAD_CHARS].toLocaleString('en-US')} characters for a four-mode brand)` : '');
    out.hint = `Not included: ${(out.omitted as string[]).map((k) => k + size(k)).join(', ')}. Add them with include: [...].`;
  }
  return structured(out);
};

/** The filesystem slice `export_theme` needs, injected rather than imported.
 *
 *  `callTool` is documented as pure, and that is worth keeping: every other tool is a function of its
 *  arguments, which is why the MCP suite can drive the whole surface without a sandbox. A tool that
 *  writes files cannot be pure — so the capability arrives as a PORT (the same shape the plugin uses
 *  for `figma.*`), and a host that does not pass one simply cannot export. Purity by default, I/O by
 *  explicit grant, and the tests drive a fake. */
export interface ExportIo {
  mkdir(dir: string): void;
  writeFile(path: string, content: string): void;
}

/** Artifact families `export_theme` can write. Distinct from `THEME_SECTIONS` (what `theme_brand`
 *  can INLINE) because the sets genuinely differ: `figma` is a whole directory of collection files
 *  that has never been inlineable at any size, and would be meaningless as a single blob. */
export const EXPORT_SECTIONS = ['tokens', 'aiMetadata', 'figma', 'componentSpecs'] as const;
/** What `export_theme` writes when the caller does not say: the token families, as before #3425. `componentSpecs` (the
 *  brand's component-defs export and its Specs projection, about 3.7 MB) is opt-in, so an existing call writes what
 *  it always wrote. */
export const DEFAULT_EXPORT_SECTIONS = ['tokens', 'aiMetadata', 'figma'] as const;
/** #4144: `export_theme` also writes the unprefixed names it used before the CLI's names (`tokens.json`, `ai-metadata.json`,
 *  `component-contracts.json`, `component-defs.json`, `component-defs.specs.json`), for one release. Delete with the
 *  sentence in the tool's description that promises them. */
export const LEGACY_EXPORT_NAMES = true;

/**
 * Reject anything that escapes the caller's own directory.
 *
 * `outDir` is an arbitrary filesystem path chosen by a MODEL, which makes it the one argument on this
 * surface that can do damage rather than merely be wrong. Absolute paths and `..` segments are refused
 * outright rather than normalized: normalizing invites a "clever" caller to probe for the edge, while a
 * flat refusal has no edge to find. A relative path under the process cwd is the entire permitted
 * space, which is what an agent asking for `./tokens` actually wants.
 *
 * Deliberately NOT a `resolve()`-and-compare check — that answers "does this land inside?" *after*
 * constructing the path, and every historical escape in this class came from a normalizer disagreeing
 * with the filesystem about what it had constructed.
 */
export const unsafeOutDir = (dir: string): string | undefined => {
  if (typeof dir !== 'string' || !dir.trim()) return 'outDir must be a non-empty string';
  if (/^([a-zA-Z]:)?[\\/]/.test(dir)) return `outDir must be RELATIVE (got '${dir}') — absolute paths are refused`;
  if (dir.split(/[\\/]/).some((seg) => seg === '..')) return `outDir must not contain '..' (got '${dir}')`;
  return undefined;
};

/** #4122: one argument check for every tool. Each inputSchema says `additionalProperties: false`, and `include` is an
 *  enum, but only `export_theme` enforced either, so a typo such as `include: ["tokenz"]` quietly returned less. Read
 *  from the declared schemas, so a new argument needs no second list here. It refuses undeclared keys, a present
 *  array argument that is not an array, and a value outside an array argument's `items.enum` (no top-level scalar
 *  `enum` is declared today, so none is checked). The one named exception is a call with no `brand` key to a tool
 *  whose schema requires one (#4120): theme_brand and validate_brand read it as a bare BrandInput for one release,
 *  whose keys are the brand's and the schema validator's to judge, and export_theme and score_consumption name the
 *  missing `brand` (`missingBrand`) rather than the keys that were sent in its place.
 *  Wording is DRAFT; the include message is the one `export_theme` already used. */
let declaredInputs: Map<string, any> | undefined;
export const argumentErrors = (name: string, args: unknown): string[] => {
  declaredInputs ??= new Map(toolDefs({}).map((t) => [t.name, t.inputSchema as any]));
  const schema = declaredInputs.get(name);
  if (!schema || schema.additionalProperties !== false || !schema.properties || args == null) return [];
  if (typeof args !== 'object' || Array.isArray(args)) return [`${name} takes an object of arguments`];
  if (!('brand' in args) && schema.required?.includes('brand')) return [];
  const props = schema.properties as Record<string, any>;
  const errors: string[] = [];
  const unknown = Object.keys(args).filter((k) => !Object.hasOwn(props, k));
  if (unknown.length) errors.push(`unknown argument(s): ${unknown.join(', ')}. Valid: ${Object.keys(props).join(', ')}`);
  for (const [k, p] of Object.entries(props)) {
    const allowed = p?.items?.enum, given = (args as Record<string, unknown>)[k];
    // A present argument declared `type: 'array'` that is not one is refused too (#4277 review): `include: "tokens"`
    // or `include: null` otherwise fell through to the default sections with no error, the #4122 shape, and reached
    // export_theme's `want.filter` as a throw (#4281).
    if (p?.type === 'array' && Object.hasOwn(args, k) && !Array.isArray(given)) {
      errors.push(`${k} must be an array (got ${given === null ? 'null' : typeof given})`);
      continue;
    }
    if (!Array.isArray(allowed) || !Array.isArray(given)) continue;
    const bad = given.filter((v) => !allowed.includes(v));
    if (bad.length) errors.push(`unknown ${k} section(s): ${bad.join(', ')}. Valid: ${allowed.join(', ')}`);
  }
  return errors;
};

export const callTool = (name: string, args: any, brandSchema?: unknown, io?: ExportIo): ToolResult => {
  const argErrors = argumentErrors(name, args);
  if (argErrors.length) return text({ error: argErrors.join(' '), errors: argErrors }, true);
  if (name === 'export_theme') {
    if (!io) return text({ error: 'export_theme is unavailable: this host did not grant filesystem access.' }, true);
    const { brand, outDir, include } = (args ?? {}) as { brand?: unknown; outDir?: string; include?: string[] };
    const bad = unsafeOutDir(outDir as string);
    if (bad) return text({ error: bad }, true);
    const noBrand = missingBrand('export_theme', brand);
    if (noBrand) return noBrand;
    const errors = validateBrandInput(brand);
    if (errors.length) return text({ error: FAILS_SCHEMA, errors }, true);
    const want = include?.length ? include : [...DEFAULT_EXPORT_SECTIONS];
    const unknown = want.filter((s) => !EXPORT_SECTIONS.includes(s as never));
    if (unknown.length) return text({ error: `unknown include section(s): ${unknown.join(', ')}. Valid: ${EXPORT_SECTIONS.join(', ')}` }, true);

    const b = buildBrand(brand);
    if (refused(b)) return b;
    const { theme, built: { tree } } = b;
    const files: { path: string; content: string }[] = [];
    const json = (o: unknown): string => JSON.stringify(o, null, 2) + '\n';
    // #4144 (owner decision A, 2026-11-19): the names the CLI writes (`emit-dtcg.ts` `emitTheme`), `<id>.tokens.json`,
    // `<id>.ai.json` and the base + overlay consumer set, so one folder holds either route's output and every doc
    // that says `<brand>.ai.json` is true of both. The unprefixed names this tool wrote before are kept for one
    // release (`LEGACY_EXPORT_NAMES`), the way `component-defs.json` was kept for #1325.
    const id = theme.id;
    if (want.includes('tokens')) {
      files.push({ path: `${id}.tokens.json`, content: json(tree) });
      const projected = buildOverlaySet(tree);
      files.push({ path: `${id}.base.tokens.json`, content: json(projected.base) });
      for (const o of projected.overlays) files.push({ path: `${id}.${o.mode}.overlay.tokens.json`, content: json(o.tree) });
      if (LEGACY_EXPORT_NAMES) files.push({ path: 'tokens.json', content: json(tree) });
    }
    if (want.includes('aiMetadata')) {
      files.push({ path: `${id}.ai.json`, content: json(buildAiMetadata(theme, tree, { tokensFile: `${id}.tokens.json` })) });
      if (LEGACY_EXPORT_NAMES) files.push({ path: 'ai-metadata.json', content: json(buildAiMetadata(theme, tree, { tokensFile: 'tokens.json' })) });
    }
    // The Figma collection set comes from the SAME function the committed `out/figma/**` artifacts are
    // written from, so an export and a regen cannot disagree about what a brand emits.
    if (want.includes('figma')) for (const a of figmaArtifacts(theme).artifacts) files.push({ path: `figma/${a.path}`, content: a.content });
    // #3425 — the component-defs export, from the same function `regen` writes the brand-neutral one with.
    if (want.includes('componentSpecs')) {
      const doc = exportComponentDefs(componentDefs, { brand: brand as BrandInput, build: BUILD_IDENTITY });
      // #1325 (Q-CC1 A): under its contract name, and under its old name for one release. Prefixed with the brand id
      // as the CLI's names are (#4144), and unprefixed as before, for one release.
      const text = json(doc), specs = json(toSpecsComponents(doc));
      for (const names of [componentDefsFileNames(id), ...(LEGACY_EXPORT_NAMES ? [componentDefsFileNames(null)] : [])]) {
        files.push({ path: names.contracts, content: text });
        files.push({ path: names.defs, content: text });
        files.push({ path: names.specs, content: specs });
      }
    }

    const written: { path: string; bytes: number }[] = [];
    try {
      const dirs = new Set(files.map((f) => (f.path.includes('/') ? `${outDir}/${f.path.slice(0, f.path.lastIndexOf('/'))}` : outDir!)));
      for (const d of dirs) io.mkdir(d);
      for (const f of files) {
        const p = `${outDir}/${f.path}`;
        io.writeFile(p, f.content);
        written.push({ path: p, bytes: f.content.length });
      }
    } catch (e) { return text({ error: `write failed: ${(e as Error).message}`, written }, true); }

    // The MANIFEST is the result — never the content. That is the entire point of this tool: the
    // payload it produces is over 1,350,000 characters for a four-mode brand, and returning any of it here
    // would reintroduce the cost the export exists to avoid.
    return structured({
      id: theme.id,
      outDir,
      total: written.length,
      totalBytes: written.reduce((n, w) => n + w.bytes, 0),
      written,
      sections: want,
    });
  }

  if (name === 'list_levers') {
    // `describe` returns the prose `tools/list` summarizes (#1760): the named fields exactly as the
    // schema file has them, so every field stays describable in full however the inline copy is cut.
    if (args?.describe !== undefined) {
      const props = ((brandSchema as { properties?: Record<string, unknown> } | undefined)?.properties) ?? {};
      const want = args.describe;
      if (!Array.isArray(want) || want.length === 0 || !want.every((k: unknown) => typeof k === 'string')) {
        return text({ error: 'list_levers `describe` must be a non-empty array of BrandInput field names' }, true);
      }
      const unknownKeys = (want as string[]).filter((k) => !Object.prototype.hasOwnProperty.call(props, k));
      if (unknownKeys.length) {
        return text({ error: `unknown BrandInput field(s): ${unknownKeys.join(', ')}`, fields: Object.keys(props) }, true);
      }
      const properties = Object.fromEntries((want as string[]).map((k) => [k, props[k]]));
      const defs = referencedDefs(properties, ((brandSchema as { $defs?: Record<string, unknown> }).$defs) ?? {});
      return structured({ described: { properties, ...(Object.keys(defs).length ? { $defs: defs } : {}) } });
    }
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
    const brand = readBrandArg(args, true);
    const errors = validateBrandInput(brand);
    // #2146: the schema is not the whole contract. `brandTheme` refuses inputs the schema accepts (a first
    // breakpoint that isn't 0, a viewport range that is empty or reversed, #2132 and #2068), so a brand this
    // tool called valid could then fail `theme_brand`. Run only on a schema-valid input: a malformed one
    // would reach `brandTheme` in a shape it does not guard and fail with a TypeError instead of a reason.
    // Reported as the engine states it, so the agent reads the same sentence `theme_brand` would give.
    // #2159: the SAME build path `theme_brand` runs, `brandTheme` then `buildTree`. Some refusals only fire
    // in the second, when the modes resolve: an override naming an unknown palette or step throws there,
    // so `brandTheme` alone called that brand valid.
    if (errors.length === 0) {
      try { buildTree(brandTheme(brand as BrandInput)); }
      catch (e) { errors.push((e as Error).message); }
    }
    return structured({ valid: errors.length === 0, errors });
  }

  if (name === 'score_consumption') {
    const noBrand = missingBrand('score_consumption', args?.brand);
    if (noBrand) return noBrand;
    const errors = validateBrandInput(args?.brand);
    if (errors.length) return text({ error: FAILS_SCHEMA, errors }, true);
    if (!Array.isArray(args?.refs)) return text({ error: 'score_consumption requires `refs`: an array of token refs' }, true);
    const bad = scoreInputErrors(args.refs, args.pairs);
    if (bad.length) return text({ error: 'score_consumption input failed validation', errors: bad }, true);
    const b = buildBrand(args.brand);
    if (refused(b)) return b;
    const { theme, built: { tree } } = b;
    const out: Record<string, unknown> = { consumption: scoreConsumption(args.refs as string[], tree, theme.root) };
    // Pairs are optional: contract compliance is a different question from ref hygiene, and an agent
    // that only reports the tokens it named should still get the first two metrics.
    if (Array.isArray(args.pairs) && args.pairs.length) out.contracts = scoreContractCompliance(args.pairs as UsedPair[], theme);
    return structured(out);
  }

  if (name === 'theme_from_brief') {
    if (typeof args?.brief !== 'string') return text({ error: 'theme_from_brief requires `brief`: a design.md string' }, true);
    // A malformed brief is a TOOL error, not an RPC one — the model wrote it and can fix it, which is
    // exactly the case the spec says to report with isError so the client can feed it back.
    // #4118: the SAME dialect detection `cli.ts` runs. A standard design.md (a flat `colors:` hex map, the shape
    // an extraction exports) goes through the standard converter; anything else is the engine-native dialect.
    // Before this the tool ran only `parseDesignMd`, so every standard brief was refused as a malformed BrandInput.
    let input: unknown;
    let report: Record<string, unknown>;
    try {
      const std = parseStandardDesignMd(args.brief);
      if (isStandardDesignMd(std)) {
        const { input: converted, classification, xApplied, xWarnings } = standardToBrandInput(std);
        input = converted;
        report = { dialect: 'standard', classification: classification.log, xApplied, xWarnings };
      } else {
        // No report keys here: an engine-native brief returns exactly theme_brand's sections plus
        // `derivedBrandInput` (#1868 holds the two key sets equal).
        input = parseDesignMd(args.brief).input;
        report = {};
      }
    }
    catch (e) { return text({ error: `could not parse the design.md brief: ${(e as Error).message}` }, true); }
    // Same default as theme_brand (#1868): the description promises the same payload, and an empty
    // default silently dropped the decisions log from every call that named no sections.
    const result = themePayload(input, Array.isArray(args.include) ? args.include : [...DEFAULT_THEME_SECTIONS]);
    if (result.isError) return result;
    // Report what the brief RESOLVED to. A brief is lossy by nature, and an agent cannot correct a
    // misreading it never sees — this is the field that makes the round trip debuggable.
    const payload = JSON.parse(result.content[0].text);
    payload.derivedBrandInput = input;
    Object.assign(payload, report);
    return structured(payload);
  }

  if (name === 'theme_brand') {
    const { brand, include } = readThemeArgs(args);
    return themePayload(brand, include);
  }

  return text({ error: `Unknown tool: ${name}` }, true);   // #4200 C: one casing, the protocol error's
};

/** Handle one JSON-RPC message. Returns the response, or `null` for a notification
 *  (which gets no reply). Pure: `brandSchema` is injected so there is no file I/O here. */
export const handleRpc = (req: RpcRequest, brandSchema: unknown, io?: ExportIo): RpcResponse | null => {
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
    // Echoes the client's version when it is a handshake revision we speak. Otherwise it answers
    // HANDSHAKE_PROTOCOL_VERSION, never `2026-07-28` (#1867). The spec's MUST is "another version it
    // supports"; its SHOULD says the latest, which we read as the latest a handshake client can use,
    // because `2026-07-28` has no `initialize` and a client that sent one cannot use that answer.
    case 'initialize': {
      return ok({ protocolVersion: negotiateHandshakeVersion(req.params?.protocolVersion), capabilities: CAPABILITIES, serverInfo: SERVER_INFO });
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
      return ok(callTool(name, req.params?.arguments ?? {}, brandSchema, io) as unknown as Record<string, unknown>);
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
  const brandSchema = JSON.parse(readFileSync(resolve(here, './schema/theme-schema.json'), 'utf8'));
  const send = (msg: RpcResponse) => process.stdout.write(JSON.stringify(msg) + '\n');
  // The one place real filesystem access is granted. `callTool` stays pure and takes this as a port,
  // so the test suite drives the same code path with an in-memory fake and never touches a disk.
  const fsIo: ExportIo = {
    mkdir: (dir) => { mkdirSync(dir, { recursive: true }); },
    writeFile: (path, content) => { writeFileSync(path, content); },
  };
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
      // #4200 A (DRAFT): the next action, not only the code.
      catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error: a line on stdin is not JSON; send one JSON-RPC object per line' } }); continue; }
      let res: RpcResponse | null;
      try { res = handleRpc(req, brandSchema, fsIo); }
      // #4200 B (DRAFT): the backstop says the failure is the server's, so the caller does not rewrite a valid input.
      catch (e) { res = { jsonrpc: '2.0', id: req.id ?? null, error: { code: -32603, message: `${req.method ?? 'the request'} failed inside the server: ${(e as Error).message}. The input may be valid; report it with the request that caused it.` } }; }
      if (res) send(res);
    }
  });
  process.stderr.write(`prism3 MCP server ready (stdio) — protocols ${PROTOCOL_VERSIONS.join(', ')} — tools: ${toolDefs(brandSchema).map((t) => t.name).join(', ')}\n`);
}
