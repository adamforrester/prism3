/**
 * Prism3 engine — THE ECOSYSTEM DIAGRAM'S DATA AGREES WITH THE CODE (#2637, owner Q300.4, restructured by Q304 A).
 *
 *   npx tsx packages/engine/lint-ecosystem.ts
 *
 * `docs/public/ecosystem/ecosystem.json` is the one source for the interactive page beside it: the lane diagram
 * (inputs → three interface lanes → engine → outputs) and the "Compare interfaces" table, which the page builds
 * from the same `features` list. The file is hand-authored, because purpose lines, edges and traces are
 * explanation, not facts a scan could produce. That makes it the SUBJECT here, and the code the ORACLE: every arm
 * below reads the code (or git) for its expected value and never the data file, so a stale data file cannot agree
 * with itself (`docs/34` shape 1).
 *
 * ── THE ARMS, each named in its failure lines ──────────────────────────────────────────────────────
 *
 *   SCHEMA    Nodes, connections, checks and features have unique ids and the fields the page reads; roles,
 *             statuses, kinds and columns are known; a `parent` is a group node; each feature names at least
 *             one lane, and each lane entry has a status, a `via` line and a source.
 *   SOURCE    Every source path and docs link anywhere in the data is tracked by git (`git ls-files`, so an
 *             untracked local file does not pass). A shipped or partial node names at least one.
 *   EDGE      Every edge joins two known nodes, once; is never more built than either end; and names a known
 *             connection, if any. Every connection labels at least one edge, and only an edge out of a lane.
 *   TRACE     Every trace step names an edge that exists.
 *   CHECKS    Every check in the "Show checks" layer sits on a known node and names its sources.
 *   LANES     Which lane can reach what, read from the code:
 *               · MCP tools are agent-only: `mcpTools` may sit only in a feature's agent lane, and each must be
 *                 a `toolDefs` name; every `toolDefs` tool is claimed by some feature.
 *               · Agent link commands are agent-lane only, each an `AGENT_COMMANDS` name, each claimed once.
 *               · Plugin main-thread messages (`UiToMain` in apps/plugin/src/messages.ts) are Figma-only: they
 *                 may sit only in a feature's figma lane, and a feature that sends one cannot claim the web
 *                 studio. Every `UiToMain` type is claimed by a feature or listed in PLUMBING below.
 *               · Shared versus lane-only, both directions: an agent command that is also a `UiToMain` message
 *                 is something the panel does too, so its feature must claim the figma lane; one that is not is
 *                 agent-only, so its feature must not. A figma message that is also an agent command needs the
 *                 agent lane.
 *               · A lane entry's connections exist; one that sends agent commands names the agent link, and
 *                 one that calls MCP tools names MCP.
 *   REACH     Which bundle can reach what, read from the import graph (each lane's build entry points, walked
 *             through value imports and `@prism3/engine/*` via the engine's `exports` map):
 *               · Agent tools, both directions: TOOL_MODULE below names the engine export each MCP tool runs
 *                 (held against mcp.ts). A feature whose agent lane calls a tool may claim web or figma only if
 *                 that lane's bundle imports the same export, and must claim it if the bundle does. So "only
 *                 the agent scores code" holds only while no UI imports `scoreConsumption`.
 *               · Web versus Figma: the plugin imports the studio's whole entry, so the two share every UI
 *                 feature unless the code branches on `PRISM3_HOST`. A web-only feature, or a figma-only one
 *                 with no plugin message, names an `anchor` that one of its sources holds within ANCHOR_SPAN
 *                 lines after the matching branch: `PRISM3_HOST !== 'figma'` for web, `=== 'figma'` or
 *                 `isFigma` for figma. Any branch anywhere in the file is not enough; it must guard the anchor.
 *   MEMBERS   Each list that ships in code matches it exactly, both directions, by name:
 *               component-defs node   ← `componentDefs` ids        (packages/engine/components)
 *               mcp connection        ← `toolDefs` names            (packages/engine/mcp.ts)
 *               agent-link connection ← `AGENT_COMMANDS`            (apps/plugin/src/agent-protocol.ts)
 *               desktop-bridge        ← the bridge's `TOOLS` names  (tools/figma-bridge/server.ts)
 *               load-skills feature   ← `git ls-files skills/<name>/SKILL.md`
 *   PAGE      The page reads the data (`ecosystem.json`) rather than restating it, and no feature label is
 *             written into the page, so the compare table can only come from the data.
 *   CONTRAST  The page's text color tokens clear 4.5:1 on the grounds they are drawn on, in the light theme
 *             and the dark theme. The PAIRS are authored here; the VALUES are read from the page's `:root`
 *             blocks, and the dark block written twice (for `prefers-color-scheme` and for the toggle) must be
 *             the same both times.
 *
 * ── FLOORS (docs/34 shape 9) ───────────────────────────────────────────────────────────────────────
 *
 * Every set comparison passes vacuously over two empty sets, so each code set has a floor: an import or a parse
 * that silently yields nothing fails as a floor breach, not as a clean run. Same for the node, edge, feature and
 * trace counts, the features per lane, and the CONTRAST pair count per theme.
 *
 * ── WHAT IT DOES NOT CHECK ─────────────────────────────────────────────────────────────────────────
 *
 * Whether a purpose or `via` line is true, whether a status is right, whether a shared UI feature (a lever panel,
 * the preview) really behaves the same on both hosts beyond the `PRISM3_HOST` rule, or whether the layout reads
 * well. Those are prose and judgment; the README in docs/public/ecosystem says who updates them and when. This
 * gate holds the names, the paths, the lane claims the code can decide, and the shape: the parts that go stale
 * silently.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentDefs } from './components';
import { toolDefs } from './mcp';
import { hexToRgb, contrast } from './color';
import { AGENT_COMMANDS } from '../../apps/plugin/src/agent-protocol';
import { TOOLS as BRIDGE_TOOLS } from '../../tools/figma-bridge/server';

const TAG = 'lint-ecosystem';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = 'docs/public/ecosystem';
const DATA = `${DIR}/ecosystem.json`;
const PAGE = `${DIR}/index.html`;
const MESSAGES = 'apps/plugin/src/messages.ts';
const PLUGIN_UI_ENTRY = 'apps/plugin/src/ui/entry.ts';

/** `UiToMain` types that are plumbing or panel chrome, not a feature a lane offers. Authored here, never read
 *  from the data: a new message fails until it is claimed by a feature or added to this list on purpose. */
const PLUMBING = ['ui-ready', 'agent-command', 'agent-bridge', 'style-guide-catalog-request', 'file-sets-request', 'style-guide-cancel', 'resize-ui', 'set-theme-pref', 'set-activity-height', 'open-docs'];

const LANES = ['web', 'figma', 'agent'] as const;
type LaneId = (typeof LANES)[number];
type LaneEntry = { status: string; via: string; sources: string[]; anchor?: string; mcpTools?: string[]; agentCommands?: string[]; messages?: string[]; connections?: string[] };
type Feature = { id: string; label: string; group: string; lanes: Partial<Record<string, LaneEntry>>; members?: { label: string; items: string[] } };
type Node = {
  id: string; label: string; role: string; kind: string; status: string; column: string; parent?: string;
  purpose: string; inputs: string[]; outputs: string[]; sources: string[]; docs?: string;
  members?: { label: string; items: string[] };
};
type Edge = { from: string; to: string; what: string; status: string; connection?: string; route?: string };
type Conn = { id: string; label: string; status: string; purpose: string; sources: string[]; docs?: string; members?: { label: string; items: string[] } };
type Check = { id: string; label: string; purpose: string; on: string[]; sources: string[]; docs?: string };
type Data = {
  statuses: { id: string }[]; roles: { id: string }[]; columns: { id: string }[];
  nodes: Node[]; edges: Edge[]; connections: Conn[]; checks: Check[]; features: Feature[];
  traces: { id: string; label: string; steps: { edge: string; caption: string }[] }[];
};

const fails: string[] = [];
const fail = (arm: string, msg: string) => fails.push(`${arm}: ${msg}`);
const read = (p: string) => readFileSync(resolve(repo, p), 'utf8');

const data = JSON.parse(read(DATA)) as Data;
const page = read(PAGE);

const STATUSES = ['shipped', 'partial', 'planned'] as const;
const RANK: Record<string, number> = { shipped: 2, partial: 1, planned: 0 };
const KINDS = ['input', 'lane', 'hub', 'content', 'artifact', 'surface', 'group'];

/** The id an edge is known by everywhere (traces, the page): `from>to`, plus `@connection` when it carries one. */
const edgeId = (e: Edge) => `${e.from}>${e.to}${e.connection ? `@${e.connection}` : ''}`;

// ── SCHEMA ───────────────────────────────────────────────────────────────────────────────────────
const statusIds = new Set(data.statuses.map((s) => s.id));
for (const s of STATUSES) if (!statusIds.has(s)) fail('SCHEMA', `statuses does not define '${s}'`);
const roleIds = new Set(data.roles.map((r) => r.id));
const columnIds = new Set(data.columns.map((c) => c.id));
const nodeIds = new Set<string>();
const byId = new Map(data.nodes.map((n) => [n.id, n]));
for (const n of data.nodes) {
  if (!n.id) { fail('SCHEMA', `a node has no id (label '${n.label}')`); continue; }
  if (nodeIds.has(n.id)) fail('SCHEMA', `node id '${n.id}' appears twice`);
  nodeIds.add(n.id);
  if (!n.label) fail('SCHEMA', `node '${n.id}' has no label`);
  if (!roleIds.has(n.role)) fail('SCHEMA', `node '${n.id}' has role '${n.role}', which roles does not define`);
  if (!statusIds.has(n.status)) fail('SCHEMA', `node '${n.id}' has status '${n.status}', not one of ${STATUSES.join(', ')}`);
  if (!KINDS.includes(n.kind)) fail('SCHEMA', `node '${n.id}' has kind '${n.kind}', not one of ${KINDS.join(', ')}`);
  if (!columnIds.has(n.column)) fail('SCHEMA', `node '${n.id}' sits in column '${n.column}', which columns does not define`);
  if (n.parent && byId.get(n.parent)?.kind !== 'group') fail('SCHEMA', `node '${n.id}' has parent '${n.parent}', which is not a group node`);
  if (!n.purpose || n.purpose.length < 20) fail('SCHEMA', `node '${n.id}' has no purpose line`);
  if (!Array.isArray(n.inputs) || !Array.isArray(n.outputs)) fail('SCHEMA', `node '${n.id}' needs inputs and outputs arrays`);
}
for (const l of LANES) if (byId.get(l)?.kind !== 'lane') fail('SCHEMA', `there is no lane node '${l}'`);
const otherIds = new Set<string>();
for (const x of [...data.connections, ...data.checks, ...data.features]) {
  if (nodeIds.has(x.id)) fail('SCHEMA', `id '${x.id}' is used by a node and by a connection, check or feature`);
  if (otherIds.has(x.id)) fail('SCHEMA', `id '${x.id}' appears twice among connections, checks and features`);
  otherIds.add(x.id);
}
const connIds = new Set(data.connections.map((c) => c.id));
for (const c of data.connections) {
  if (!c.label || !c.purpose) fail('SCHEMA', `connection '${c.id}' needs a label and a purpose`);
  if (!statusIds.has(c.status)) fail('SCHEMA', `connection '${c.id}' has unknown status '${c.status}'`);
}
for (const f of data.features) {
  if (!f.label || !f.group) fail('SCHEMA', `feature '${f.id}' needs a label and a group`);
  const lanes = Object.keys(f.lanes ?? {});
  if (!lanes.length) fail('SCHEMA', `feature '${f.id}' names no lane`);
  for (const l of lanes) {
    if (!(LANES as readonly string[]).includes(l)) { fail('SCHEMA', `feature '${f.id}' names lane '${l}', not one of ${LANES.join(', ')}`); continue; }
    const e = f.lanes[l]!;
    if (!statusIds.has(e.status)) fail('SCHEMA', `feature '${f.id}' in ${l} has unknown status '${e.status}'`);
    if (!e.via) fail('SCHEMA', `feature '${f.id}' in ${l} has no 'via' line`);
    if (!e.sources?.length) fail('SCHEMA', `feature '${f.id}' in ${l} cites no source`);
  }
}

// ── SOURCE ───────────────────────────────────────────────────────────────────────────────────────
const tracked = (path: string): boolean => {
  const r = spawnSync('git', ['-C', repo, 'ls-files', '--', path], { encoding: 'utf8' });
  if (r.status !== 0) { fail('SOURCE', `git ls-files failed for '${path}': ${r.stderr.trim()} — git is this arm's oracle, so no answer is not a pass`); return true; }
  return r.stdout.trim().length > 0;
};
const srcCheck = (who: string, sources: string[] | undefined, docs?: string) => {
  for (const p of sources ?? []) if (!tracked(p)) fail('SOURCE', `${who} names source '${p}', which git does not track`);
  if (docs && !tracked(docs.replace(/#.*$/, ''))) fail('SOURCE', `${who} links docs '${docs}', which git does not track`);
};
for (const n of data.nodes) {
  srcCheck(`node '${n.id}'`, n.sources, n.docs);
  if (n.status !== 'planned' && !(n.sources ?? []).length) fail('SOURCE', `node '${n.id}' is ${n.status} but names no source path`);
}
for (const c of data.connections) srcCheck(`connection '${c.id}'`, c.sources, c.docs);
for (const c of data.checks) srcCheck(`check '${c.id}'`, c.sources, c.docs);
for (const f of data.features) for (const [l, e] of Object.entries(f.lanes ?? {})) srcCheck(`feature '${f.id}' in ${l}`, e?.sources);

// ── EDGE ─────────────────────────────────────────────────────────────────────────────────────────
const edgeIds = new Set<string>();
const usedConn = new Set<string>();
for (const e of data.edges) {
  const id = edgeId(e);
  if (!nodeIds.has(e.from)) fail('EDGE', `edge '${id}' starts at unknown node '${e.from}'`);
  if (!nodeIds.has(e.to)) fail('EDGE', `edge '${id}' ends at unknown node '${e.to}'`);
  if (edgeIds.has(id)) fail('EDGE', `edge '${id}' appears twice`);
  edgeIds.add(id);
  if (!statusIds.has(e.status)) fail('EDGE', `edge '${id}' has unknown status '${e.status}'`);
  if (!e.what) fail('EDGE', `edge '${id}' does not say what travels`);
  for (const end of [e.from, e.to]) {
    const s = byId.get(end)?.status;
    if (s !== undefined && RANK[e.status] > RANK[s]) fail('EDGE', `edge '${id}' is ${e.status} but node '${end}' is ${s}`);
  }
  if (e.connection) {
    usedConn.add(e.connection);
    const c = data.connections.find((x) => x.id === e.connection);
    if (!c) fail('EDGE', `edge '${id}' names unknown connection '${e.connection}'`);
    else if (RANK[e.status] > RANK[c.status]) fail('EDGE', `edge '${id}' is ${e.status} but connection '${c.id}' is ${c.status}`);
    if (byId.get(e.from)?.kind !== 'lane') fail('EDGE', `edge '${id}' carries a connection but does not start at a lane`);
  }
}
for (const c of data.connections) if (!usedConn.has(c.id)) fail('EDGE', `connection '${c.id}' labels no edge, so the diagram never shows it`);

// ── TRACE ────────────────────────────────────────────────────────────────────────────────────────
for (const t of data.traces) {
  if (!t.steps.length) fail('TRACE', `trace '${t.id}' has no steps`);
  for (const s of t.steps) {
    if (!edgeIds.has(s.edge)) fail('TRACE', `trace '${t.id}' steps along '${s.edge}', which is not an edge`);
    if (!s.caption) fail('TRACE', `trace '${t.id}' step '${s.edge}' has no caption`);
  }
}

// ── CHECKS ───────────────────────────────────────────────────────────────────────────────────────
for (const c of data.checks) {
  if (!c.on?.length) fail('CHECKS', `check '${c.id}' sits on nothing`);
  for (const o of c.on ?? []) if (!nodeIds.has(o)) fail('CHECKS', `check '${c.id}' sits on '${o}', which is not a node`);
  if (!c.sources?.length) fail('CHECKS', `check '${c.id}' names no source`);
}

// ── LANES ────────────────────────────────────────────────────────────────────────────────────────
const mcpNames = toolDefs({}).map((t) => t.name);
const commands: string[] = [...AGENT_COMMANDS];
const msgSrc = read(MESSAGES);
const uiStart = msgSrc.indexOf('export type UiToMain =');
const uiEnd = msgSrc.indexOf('\nexport ', uiStart + 1);
const uiToMain = uiStart < 0 ? [] : [...msgSrc.slice(uiStart, uiEnd < 0 ? undefined : uiEnd).matchAll(/^\s*\|\s*\{\s*type:\s*'([a-z-]+)'/gm)].map((m) => m[1]);
const uiSet = new Set(uiToMain);
const cmdSet = new Set(commands);
const mcpSet = new Set(mcpNames);
const pluginEntry = read(PLUGIN_UI_ENTRY);
const pluginImportsStudio = /import\s+['"][./]*studio\/src\/entry['"]/.test(pluginEntry);
if (!pluginImportsStudio) fail('LANES', `${PLUGIN_UI_ENTRY} no longer imports the studio's entry whole, so "web and Figma share every UI feature unless PRISM3_HOST branches" no longer holds — rework this arm`);

const claimedTools = new Set<string>();
const cmdClaims = new Map<string, string[]>();
const claimedMsgs = new Set<string>();
for (const f of data.features) {
  const lanes = f.lanes ?? {};
  for (const [l, e] of Object.entries(lanes)) {
    if (!e) continue;
    if (e.mcpTools?.length && l !== 'agent') fail('LANES', `feature '${f.id}' puts MCP tools in the ${l} lane — MCP tools are agent-only`);
    if (e.agentCommands?.length && l !== 'agent') fail('LANES', `feature '${f.id}' puts agent link commands in the ${l} lane — they are agent-only`);
    if (e.messages?.length && l !== 'figma') fail('LANES', `feature '${f.id}' puts plugin messages in the ${l} lane — only the Figma host has a main thread`);
    for (const t of e.mcpTools ?? []) { claimedTools.add(t); if (!mcpSet.has(t)) fail('LANES', `feature '${f.id}' names MCP tool '${t}', which toolDefs does not have`); }
    for (const c of e.agentCommands ?? []) { cmdClaims.set(c, [...(cmdClaims.get(c) ?? []), f.id]); if (!cmdSet.has(c)) fail('LANES', `feature '${f.id}' names agent command '${c}', which AGENT_COMMANDS does not have`); }
    for (const m of e.messages ?? []) { claimedMsgs.add(m); if (!uiSet.has(m)) fail('LANES', `feature '${f.id}' names plugin message '${m}', which UiToMain does not have`); }
    for (const c of e.connections ?? []) if (!connIds.has(c)) fail('LANES', `feature '${f.id}' in ${l} names unknown connection '${c}'`);
    if (e.agentCommands?.length && !e.connections?.includes('agent-link')) fail('LANES', `feature '${f.id}' sends agent commands but does not name the agent-link connection`);
    if (e.mcpTools?.length && !e.connections?.includes('mcp')) fail('LANES', `feature '${f.id}' calls MCP tools but does not name the mcp connection`);
  }
  const has = (l: LaneId) => !!lanes[l];
  const figmaMsgs = lanes.figma?.messages ?? [];
  if (has('web') && figmaMsgs.length) fail('LANES', `feature '${f.id}' claims the web studio, but runs through the plugin message '${figmaMsgs[0]}', which only the Figma host has`);
  for (const c of lanes.agent?.agentCommands ?? []) {
    if (uiSet.has(c) && !has('figma')) fail('LANES', `feature '${f.id}' is agent-only, but '${c}' is also a panel message (UiToMain), so the Figma plugin does it too`);
    if (!uiSet.has(c) && has('figma')) fail('LANES', `feature '${f.id}' claims the Figma plugin, but '${c}' has no panel message (UiToMain) — only the agent can send it`);
  }
  for (const m of figmaMsgs) if (cmdSet.has(m) && !has('agent')) fail('LANES', `feature '${f.id}' is Figma-only, but '${m}' is also an agent link command, so the agent does it too`);
}
for (const t of mcpNames) if (!claimedTools.has(t)) fail('LANES', `MCP tool '${t}' is in no feature's agent lane`);
for (const c of commands) {
  const by = cmdClaims.get(c) ?? [];
  if (!by.length) fail('LANES', `agent command '${c}' is in no feature's agent lane`);
  if (by.length > 1) fail('LANES', `agent command '${c}' is claimed by ${by.length} features (${by.join(', ')}); one feature per command, so the table counts it once`);
}
for (const m of uiToMain) if (!claimedMsgs.has(m) && !PLUMBING.includes(m)) fail('LANES', `plugin message '${m}' is in no feature's figma lane and not listed as plumbing in ${TAG}.ts`);
for (const m of PLUMBING) if (!uiSet.has(m)) fail('LANES', `PLUMBING lists '${m}', which UiToMain no longer has — drop it`);

// ── REACH ────────────────────────────────────────────────────────────────────────────────────────
/** What each MCP tool runs: the engine module that DEFINES the function its handler calls (`call`), and the export
 *  a UI lane would have to import to offer the same thing (`symbol`, the same as `call` unless the call wraps it).
 *  Authored here, never read from the data, and held against mcp.ts below (mcp.ts imports and calls `call` from
 *  `module`, which defines both), so a tool that moves to other code fails here rather than keeping a stale answer.
 *  A UI lane on a feature with agent tools must import `symbol` from `module`; a lane left out must not. */
type Runs = { module: string; symbol: string; call?: string };
const TOOL_MODULE: Record<string, Runs> = {
  list_levers: { module: 'packages/engine/levers.ts', symbol: 'leverManifest', call: 'buildLeverManifest' },
  theme_brand: { module: 'packages/engine/theme.ts', symbol: 'brandTheme' },
  score_consumption: { module: 'packages/engine/eval.ts', symbol: 'scoreConsumption' },
  theme_from_brief: { module: 'packages/engine/design-md.ts', symbol: 'parseDesignMd' },
  export_theme: { module: 'packages/engine/tree.ts', symbol: 'buildTree' },
  validate_brand: { module: 'packages/engine/emit-dtcg.ts', symbol: 'validateBrandInput' },
};
/** The bundles each UI lane ships, by their build entry points (apps/studio/build.mjs, apps/plugin/build.mjs). */
const LANE_ROOTS: Record<'web' | 'figma', string[]> = {
  web: ['apps/studio/src/entry.ts'],
  figma: ['apps/plugin/src/ui/entry.ts', 'apps/plugin/src/main.ts'],
};
const engineExports = (JSON.parse(read('packages/engine/package.json')) as { exports: Record<string, string> }).exports;
const resolveSpec = (from: string, spec: string): string | null => {
  let base: string;
  if (spec.startsWith('.')) base = resolve(repo, dirname(from), spec).slice(repo.length + 1);
  else if (spec.startsWith('@prism3/engine/')) { const t = engineExports[`./${spec.slice('@prism3/engine/'.length)}`]; if (!t) return null; base = `packages/engine/${t.replace(/^\.\//, '')}`; }
  else return null;
  for (const c of [base, `${base}.ts`, `${base}/index.ts`]) if (/\.ts$/.test(c) && exists(c)) return c;
  return null;
};
const exists = (p: string) => { try { readFileSync(resolve(repo, p)); return true; } catch { return false; } };
/** A value import or re-export: the file it resolves to, and the names it takes (`*` for a namespace or `export *`). */
type Imp = { target: string; names: string[] | '*'; reexport: boolean };
const importsOf = new Map<string, Imp[]>();
/** Every repo .ts file a bundle can reach from `roots` by a value import (`import type` ships nothing), recording
 *  what each file takes from each. Comments are stripped first, so an import quoted in prose is not an edge. */
const reach = (roots: string[]): Set<string> => {
  const seen = new Set<string>();
  const todo = [...roots];
  while (todo.length) {
    const f = todo.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    if (!importsOf.has(f)) {
      // Only comments that open a line: a `/*` inside a string (a glob, a regex) would otherwise swallow real imports.
      const src = read(f).replace(/^\s*\/\*[\s\S]*?\*\//gm, '').replace(/^\s*\/\/.*$/gm, '');
      const imps: Imp[] = [];
      for (const m of src.matchAll(/\b(import|export)\s+(type\s+)?([^'";]*?)\bfrom\s*['"]([^'"]+)['"]/g)) {
        if (m[2]) continue;
        const target = resolveSpec(f, m[4]);
        if (!target) continue;
        const clause = m[3];
        const braced = /\{([^}]*)\}/.exec(clause)?.[1];
        const names = /\*/.test(clause) ? '*' as const
          : (braced ?? '').split(',').map((x) => x.trim()).filter((x) => x && !x.startsWith('type ')).map((x) => x.split(/\s+as\s+/)[0].trim());
        imps.push({ target, names, reexport: m[1] === 'export' });
      }
      for (const m of src.matchAll(/\bimport\s*\(?\s*['"]([^'"]+)['"]/g)) { const target = resolveSpec(f, m[1]); if (target) imps.push({ target, names: '*', reexport: false }); }
      importsOf.set(f, imps);
    }
    for (const i of importsOf.get(f)!) if (!seen.has(i.target)) todo.push(i.target);
  }
  return seen;
};
/** Does any file in `files` import `symbol` from `module`, directly or through a file that re-exports it from there? */
const takes = (files: Set<string>, module: string, symbol: string): boolean => {
  const via = new Set([module]);
  for (const [f, imps] of importsOf) if (imps.some((i) => i.reexport && i.target === module && (i.names === '*' || i.names.includes(symbol)))) via.add(f);
  for (const f of files) {
    if (via.has(f)) continue;
    if ((importsOf.get(f) ?? []).some((i) => via.has(i.target) && (i.names === '*' || i.names.includes(symbol)))) return true;
  }
  return false;
};
const laneReach = { web: reach(LANE_ROOTS.web), figma: reach(LANE_ROOTS.figma) };
const mcpReach = reach(['packages/engine/mcp.ts']);
for (const [l, set] of Object.entries(laneReach)) if (set.size < 50) fail('FLOOR', `the ${l} lane's bundle reaches ${set.size} files from ${LANE_ROOTS[l as 'web' | 'figma'].join(', ')}, under the floor of 50 — the import walk has gone blind`);
if (!laneReach.figma.has('apps/studio/src/entry.ts')) fail('REACH', `the figma lane's bundle no longer reaches apps/studio/src/entry.ts — the walk or the plugin's entry has changed`);
const mcpSrc = read('packages/engine/mcp.ts');
for (const t of mcpNames) {
  const m = TOOL_MODULE[t];
  if (!m) { fail('REACH', `MCP tool '${t}' has no entry in TOOL_MODULE in ${TAG}.ts — say which engine module it runs, so its lane claims can be checked`); continue; }
  const call = m.call ?? m.symbol;
  if (!takes(mcpReach, m.module, call)) fail('REACH', `TOOL_MODULE maps '${t}' to ${call} from ${m.module}, which packages/engine/mcp.ts does not import`);
  for (const sym of new Set([call, m.symbol])) if (!new RegExp(`export\\s+(?:const|function|class)\\s+${sym}\\b`).test(read(m.module))) fail('REACH', `TOOL_MODULE maps '${t}' to ${sym} in ${m.module}, which that file does not define`);
  if (!new RegExp(`\\b${call}\\(`).test(mcpSrc)) fail('REACH', `TOOL_MODULE maps '${t}' to ${call}, which packages/engine/mcp.ts never calls`);
}
for (const t of Object.keys(TOOL_MODULE)) if (!mcpSet.has(t)) fail('REACH', `TOOL_MODULE lists '${t}', which toolDefs no longer has — drop it`);
const HOST_BRANCH = { web: /PRISM3_HOST\s*!==\s*'figma'/, figma: /PRISM3_HOST\s*===\s*'figma'|isFigma/ };
/** How far an anchor may sit from its host branch, in lines: the branch must guard the anchored code. */
const ANCHOR_SPAN = 8;
for (const f of data.features) {
  const lanes = f.lanes ?? {};
  const runs = (lanes.agent?.mcpTools ?? []).map((t) => TOOL_MODULE[t]).filter((m): m is Runs => !!m);
  for (const l of ['web', 'figma'] as const) {
    const e = lanes[l];
    for (const { module: m, symbol: sym } of runs) {
      const has = takes(laneReach[l], m, sym);
      if (e && e.status !== 'planned' && !has) fail('REACH', `feature '${f.id}' claims the ${l === 'web' ? 'web studio' : 'Figma plugin'}, but its agent tools run ${sym} (${m}), which the ${l} bundle never imports`);
      if (!e && has) fail('REACH', `feature '${f.id}' leaves out the ${l === 'web' ? 'web studio' : 'Figma plugin'}, but its agent tools run ${sym} (${m}), which the ${l} bundle imports — say how that lane offers it, or why not`);
    }
  }
  // A host-only UI feature (no plugin message decides it) must point at the branch that makes it host-only.
  for (const [l, other] of [['web', 'figma'], ['figma', 'web']] as const) {
    const e = lanes[l];
    if (!e || lanes[other] || e.status === 'planned' || (l === 'figma' && e.messages?.length)) continue;
    if (!e.anchor) { fail('REACH', `feature '${f.id}' claims the ${l === 'web' ? 'web studio' : 'Figma plugin'} only, but names no 'anchor' — quote a string from the code its PRISM3_HOST branch guards (the plugin loads the studio's whole entry, so without a branch the other host has it too)`); continue; }
    const hit = e.sources.some((p) => {
      let lines: string[];
      try { lines = read(p).split('\n'); } catch { return false; }
      return lines.some((line, i) => line.includes(e.anchor!) && lines.slice(Math.max(0, i - ANCHOR_SPAN), i + 1).some((b) => HOST_BRANCH[l].test(b)));
    });
    if (!hit) fail('REACH', `feature '${f.id}' claims the ${l === 'web' ? 'web studio' : 'Figma plugin'} only, but its anchor '${e.anchor}' is in none of its sources within ${ANCHOR_SPAN} lines after a ${l === 'web' ? "PRISM3_HOST !== 'figma'" : "PRISM3_HOST === 'figma'"} branch`);
  }
}

// ── MEMBERS ──────────────────────────────────────────────────────────────────────────────────────
const skillsLs = spawnSync('git', ['-C', repo, 'ls-files', 'skills'], { encoding: 'utf8' });
if (skillsLs.status !== 0) fail('MEMBERS', `git ls-files skills failed — the skills oracle gave no answer, which is not a pass`);
const skills = [...new Set(skillsLs.stdout.split('\n').map((l) => /^skills\/([^/]+)\/SKILL\.md$/.exec(l)?.[1]).filter((s): s is string => !!s))];

const holder = (id: string) => data.nodes.find((n) => n.id === id) ?? data.connections.find((c) => c.id === id) ?? data.features.find((f) => f.id === id);
const SURFACES: { id: string; what: string; code: string[]; floor: number }[] = [
  { id: 'component-defs', what: 'component def', code: componentDefs.map((d) => d.id), floor: 20 },
  { id: 'mcp', what: 'MCP tool', code: mcpNames, floor: 5 },
  { id: 'agent-link', what: 'agent link command', code: commands, floor: 5 },
  { id: 'desktop-bridge', what: 'bridge tool', code: BRIDGE_TOOLS.map((t) => t.name), floor: 2 },
  { id: 'load-skills', what: 'skill', code: skills, floor: 3 },
];
for (const s of SURFACES) {
  if (s.code.length < s.floor) { fail('FLOOR', `the code yields ${s.code.length} ${s.what}s, under the floor of ${s.floor} — the import or the scan has gone blind`); continue; }
  const h = holder(s.id);
  if (!h) { fail('MEMBERS', `nothing with id '${s.id}' carries the ${s.what}s`); continue; }
  const listed = h.members?.items ?? [];
  const inData = new Set(listed);
  const inCode = new Set(s.code);
  for (const m of s.code) if (!inData.has(m)) fail('MEMBERS', `${s.id} is missing the ${s.what} '${m}', which the code ships`);
  for (const m of listed) if (!inCode.has(m)) fail('MEMBERS', `${s.id} lists the ${s.what} '${m}', which the code does not have`);
  if (inData.size !== listed.length) fail('MEMBERS', `${s.id} lists a ${s.what} twice`);
}

// ── PAGE ─────────────────────────────────────────────────────────────────────────────────────────
if (!/fetch\(\s*['"]\.\/ecosystem\.json['"]/.test(page)) fail('PAGE', `${PAGE} does not fetch './ecosystem.json' — the page must render from the data, not restate it`);
for (const f of data.features) if (f.label && page.includes(f.label)) fail('PAGE', `${PAGE} writes the feature label '${f.label}' itself — the compare table must come from the data`);

// ── CONTRAST ─────────────────────────────────────────────────────────────────────────────────────
/** Declarations inside the FIRST `{…}` after `selector`, as a token → value map. */
const block = (css: string, selector: string): Record<string, string> | null => {
  const at = css.indexOf(selector);
  if (at < 0) return null;
  const open = css.indexOf('{', at);
  const close = css.indexOf('}', open);
  const out: Record<string, string> = {};
  for (const m of css.slice(open + 1, close).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};
/** Text tokens, and the grounds the page draws each on. Authored here, never read from the page. */
const ROLES = ['theming', 'agent', 'engine', 'output', 'verification', 'code'];
const PAIRS: [string, string][] = [
  ['--text', '--bg'], ['--text', '--surface'], ['--text', '--surface-raised'],
  ['--text-muted', '--bg'], ['--text-muted', '--surface'], ['--text-muted', '--surface-raised'],
  ['--link', '--surface'], ['--link', '--bg'],
  ['--on-accent', '--accent'],
  ['--on-trace', '--trace'], ['--hub-text', '--hub-bg'], ['--hub-muted', '--hub-bg'],
  ...ROLES.flatMap((r): [string, string][] => [[`--role-${r}-ink`, '--surface'], [`--role-${r}-ink`, '--bg'], ['--text', `--role-${r}-tint`], ['--text-muted', `--role-${r}-tint`]]),
];
const light = block(page, ':root {');
const darkToggle = block(page, ':root[data-theme="dark"]');
const darkMedia = block(page, ':root:not([data-theme="light"])');
if (!light) fail('CONTRAST', `${PAGE} has no ':root {' block of color tokens`);
if (!darkToggle) fail('CONTRAST', `${PAGE} has no ':root[data-theme="dark"]' block`);
if (!darkMedia) fail('CONTRAST', `${PAGE} has no ':root:not([data-theme="light"])' block under prefers-color-scheme`);
if (darkToggle && darkMedia && JSON.stringify(darkToggle) !== JSON.stringify(darkMedia)) fail('CONTRAST', `the two dark blocks differ — the toggle and prefers-color-scheme would show different dark themes`);
let checked = 0;
for (const [name, theme] of [['light', light], ['dark', darkToggle && light ? { ...light, ...darkToggle } : null]] as const) {
  if (!theme) continue;
  for (const [fg, bg] of PAIRS) {
    const f = theme[fg]; const b = theme[bg];
    if (!f || !b) { fail('CONTRAST', `${name}: ${!f ? fg : bg} is not defined as a token`); continue; }
    if (!/^#[0-9a-f]{6}$/i.test(f) || !/^#[0-9a-f]{6}$/i.test(b)) { fail('CONTRAST', `${name}: ${fg} or ${bg} is not a six-digit hex (${f}, ${b})`); continue; }
    const ratio = contrast(hexToRgb(f), hexToRgb(b));
    checked++;
    if (ratio < 4.5) fail('CONTRAST', `${name}: ${fg} ${f} on ${bg} ${b} is ${ratio.toFixed(2)}:1, under 4.5:1`);
  }
}

// ── FLOORS ───────────────────────────────────────────────────────────────────────────────────────
if (uiToMain.length < 8) fail('FLOOR', `${MESSAGES} yields ${uiToMain.length} UiToMain types, under the floor of 8 — the parse has gone blind`);
if (data.nodes.length < 15) fail('FLOOR', `${data.nodes.length} nodes, under the floor of 15`);
if (data.edges.length < 15) fail('FLOOR', `${data.edges.length} edges, under the floor of 15`);
if (data.features.length < 15) fail('FLOOR', `${data.features.length} features, under the floor of 15`);
for (const l of LANES) { const k = data.features.filter((f) => f.lanes?.[l]).length; if (k < 5) fail('FLOOR', `the ${l} lane has ${k} features, under the floor of 5`); }
if (data.traces.length < 3) fail('FLOOR', `${data.traces.length} traces, under the floor of 3`);
if (checked < PAIRS.length * 2 && !fails.some((f) => f.startsWith('CONTRAST'))) fail('FLOOR', `checked ${checked} contrast pairs, expected ${PAIRS.length * 2}`);

if (fails.length) {
  console.error(`\n❌ ${TAG}: ${fails.length} problem(s) in ${DATA} or ${PAGE}:\n`);
  for (const f of fails) console.error(`    ${f}`);
  console.error(`\n  How to update the data when a feature ships: ${DIR}/README.md`);
  process.exit(1);
}
const memberCount = SURFACES.reduce((a, s) => a + s.code.length, 0);
const shared = data.features.filter((f) => Object.keys(f.lanes).length > 1).length;
console.log(`✅ ${TAG}: ${data.nodes.length} nodes, ${data.edges.length} edges, ${data.connections.length} connections, ${data.checks.length} checks, ${data.traces.length} traces; ${data.features.length} features (${shared} shared) whose lane claims match the code (${mcpNames.length} MCP tools, ${commands.length} agent commands, ${uiToMain.length} plugin messages; ${laneReach.web.size} web and ${laneReach.figma.size} figma bundle files walked); ${memberCount} members across ${SURFACES.length} lists match the code; ${checked} contrast pairs clear 4.5:1 in light and dark.`);
