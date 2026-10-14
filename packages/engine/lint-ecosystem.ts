/**
 * Prism3 engine — THE ECOSYSTEM DIAGRAM'S DATA AGREES WITH THE CODE (#2637, owner Q300.4).
 *
 *   npx tsx packages/engine/lint-ecosystem.ts
 *
 * `docs/public/ecosystem/ecosystem.json` is the one source for the interactive ecosystem page beside it. It is
 * hand-authored, because the purpose lines, the edges and the traces are explanation, not facts a scan could
 * produce. That makes it the SUBJECT here, and the code the ORACLE: every arm below reads the code (or git) for
 * its expected value and never the data file, so a stale data file cannot agree with itself (`docs/34` shape 1).
 *
 * ── THE ARMS, each named in its failure lines ──────────────────────────────────────────────────────
 *
 *   SCHEMA    Every node has an id, a known role and status, a purpose, and a position inside the canvas;
 *             ids are unique. A region's and a status's ids are known.
 *   SOURCE    Every source path and docs link a node names is tracked by git (`git ls-files`, so an untracked
 *             local file does not pass). A shipped or partial node that is not an actor names at least one.
 *   EDGE      Every edge joins two known nodes, once; and an edge is never more built than either end (a
 *             shipped edge into a planned node is a claim the diagram cannot make).
 *   TRACE     Every trace step names an edge that exists.
 *   MEMBERS   Each surface whose members ship in code lists exactly those members, both directions, by name:
 *               component-defs ← `componentDefs` ids        (packages/engine/components)
 *               mcp-server     ← `toolDefs` names            (packages/engine/mcp.ts)
 *               agent-link     ← `AGENT_COMMANDS`            (apps/plugin/src/agent-protocol.ts)
 *               bridge         ← the bridge's `TOOLS` names  (tools/figma-bridge/server.ts)
 *               skills         ← `git ls-files skills/<name>/SKILL.md`
 *             A new component, tool, command or skill fails here until the data names it; a removed one
 *             fails until the data drops it.
 *   PAGE      The page reads the data (`ecosystem.json`) rather than restating it.
 *   CONTRAST  The page's text color tokens clear 4.5:1 on the grounds they are drawn on, in the light theme
 *             and the dark theme. The PAIRS are authored here; the VALUES are read from the page's `:root`
 *             blocks, and the dark block written twice (for `prefers-color-scheme` and for the toggle) must be
 *             the same both times, or the two dark themes could drift apart.
 *
 * ── FLOORS (docs/34 shape 9) ───────────────────────────────────────────────────────────────────────
 *
 * Every MEMBERS arm is a set comparison and passes vacuously over two empty sets, so each code set has a floor:
 * an import that silently resolves to nothing fails as a floor breach, not as a clean run. Same for the node,
 * edge and trace counts, and the CONTRAST pair count per theme.
 *
 * ── WHAT IT DOES NOT CHECK ─────────────────────────────────────────────────────────────────────────
 *
 * Whether a purpose line is true, whether a status is right, or whether the layout reads well. Those are
 * prose and judgment; the README in docs/public/ecosystem says who updates them and when. This gate holds the
 * names, the paths and the shape — the parts that go stale silently.
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

type Node = {
  id: string; label: string; role: string; kind: string; status: string; at: [number, number];
  purpose: string; inputs: string[]; outputs: string[]; sources: string[]; docs?: string;
  members?: { label: string; items: string[] };
};
type Edge = { from: string; to: string; what: string; status: string };
type Data = {
  canvas: { width: number; height: number };
  statuses: { id: string }[]; roles: { id: string }[];
  regions?: { id: string; status?: string }[];
  nodes: Node[]; edges: Edge[];
  traces: { id: string; label: string; steps: { edge: string; caption: string }[] }[];
};

const fails: string[] = [];
const fail = (arm: string, msg: string) => fails.push(`${arm}: ${msg}`);

const data = JSON.parse(readFileSync(resolve(repo, DATA), 'utf8')) as Data;
const page = readFileSync(resolve(repo, PAGE), 'utf8');

const STATUSES = ['shipped', 'partial', 'planned'] as const;
const RANK: Record<string, number> = { shipped: 2, partial: 1, planned: 0 };

// ── SCHEMA ───────────────────────────────────────────────────────────────────────────────────────
const statusIds = new Set(data.statuses.map((s) => s.id));
for (const s of STATUSES) if (!statusIds.has(s)) fail('SCHEMA', `statuses does not define '${s}'`);
const roleIds = new Set(data.roles.map((r) => r.id));
const nodeIds = new Set<string>();
for (const n of data.nodes) {
  if (!n.id) { fail('SCHEMA', `a node has no id (label '${n.label}')`); continue; }
  if (nodeIds.has(n.id)) fail('SCHEMA', `node id '${n.id}' appears twice`);
  nodeIds.add(n.id);
  if (!n.label) fail('SCHEMA', `node '${n.id}' has no label`);
  if (!roleIds.has(n.role)) fail('SCHEMA', `node '${n.id}' has role '${n.role}', which roles does not define`);
  if (!statusIds.has(n.status)) fail('SCHEMA', `node '${n.id}' has status '${n.status}', not one of ${STATUSES.join(', ')}`);
  if (!n.purpose || n.purpose.length < 20) fail('SCHEMA', `node '${n.id}' has no purpose line`);
  if (!Array.isArray(n.inputs) || !Array.isArray(n.outputs)) fail('SCHEMA', `node '${n.id}' needs inputs and outputs arrays`);
  const [x, y] = n.at ?? [];
  if (!(x > 0 && x < data.canvas.width && y > 0 && y < data.canvas.height)) fail('SCHEMA', `node '${n.id}' sits outside the ${data.canvas.width}x${data.canvas.height} canvas at ${JSON.stringify(n.at)}`);
}
for (const e of data.edges as (Edge & { via?: number[][] })[]) {
  for (const v of e.via ?? []) if (!(v[0] > 0 && v[0] < data.canvas.width && v[1] > 0 && v[1] < data.canvas.height)) fail('SCHEMA', `edge '${e.from}>${e.to}' routes through ${JSON.stringify(v)}, outside the canvas`);
}
for (const r of data.regions ?? []) if (r.status && !statusIds.has(r.status)) fail('SCHEMA', `region '${r.id}' has unknown status '${r.status}'`);

// ── SOURCE ───────────────────────────────────────────────────────────────────────────────────────
const tracked = (path: string): boolean => {
  const r = spawnSync('git', ['-C', repo, 'ls-files', '--', path], { encoding: 'utf8' });
  if (r.status !== 0) { fail('SOURCE', `git ls-files failed for '${path}': ${r.stderr.trim()} — git is this arm's oracle, so no answer is not a pass`); return true; }
  return r.stdout.trim().length > 0;
};
for (const n of data.nodes) {
  for (const p of n.sources ?? []) if (!tracked(p)) fail('SOURCE', `node '${n.id}' names source '${p}', which git does not track`);
  if (n.docs && !tracked(n.docs.replace(/#.*$/, ''))) fail('SOURCE', `node '${n.id}' links docs '${n.docs}', which git does not track`);
  if (n.status !== 'planned' && n.kind !== 'actor' && !(n.sources ?? []).length) fail('SOURCE', `node '${n.id}' is ${n.status} but names no source path`);
}

// ── EDGE ─────────────────────────────────────────────────────────────────────────────────────────
const edgeIds = new Set<string>();
const status = new Map(data.nodes.map((n) => [n.id, n.status]));
for (const e of data.edges) {
  const id = `${e.from}>${e.to}`;
  if (!nodeIds.has(e.from)) fail('EDGE', `edge '${id}' starts at unknown node '${e.from}'`);
  if (!nodeIds.has(e.to)) fail('EDGE', `edge '${id}' ends at unknown node '${e.to}'`);
  if (edgeIds.has(id)) fail('EDGE', `edge '${id}' appears twice`);
  edgeIds.add(id);
  if (!statusIds.has(e.status)) fail('EDGE', `edge '${id}' has unknown status '${e.status}'`);
  if (!e.what) fail('EDGE', `edge '${id}' does not say what travels`);
  for (const end of [e.from, e.to]) {
    const s = status.get(end);
    if (s !== undefined && RANK[e.status] > RANK[s]) fail('EDGE', `edge '${id}' is ${e.status} but node '${end}' is ${s}`);
  }
}

// ── TRACE ────────────────────────────────────────────────────────────────────────────────────────
for (const t of data.traces) {
  if (!t.steps.length) fail('TRACE', `trace '${t.id}' has no steps`);
  for (const s of t.steps) {
    if (!edgeIds.has(s.edge)) fail('TRACE', `trace '${t.id}' steps along '${s.edge}', which is not an edge`);
    if (!s.caption) fail('TRACE', `trace '${t.id}' step '${s.edge}' has no caption`);
  }
}

// ── MEMBERS ──────────────────────────────────────────────────────────────────────────────────────
const skillsLs = spawnSync('git', ['-C', repo, 'ls-files', 'skills'], { encoding: 'utf8' });
if (skillsLs.status !== 0) fail('MEMBERS', `git ls-files skills failed — the skills oracle gave no answer, which is not a pass`);
const skills = [...new Set(skillsLs.stdout.split('\n').map((l) => /^skills\/([^/]+)\/SKILL\.md$/.exec(l)?.[1]).filter((s): s is string => !!s))];

const SURFACES: { node: string; what: string; code: string[]; floor: number }[] = [
  { node: 'component-defs', what: 'component def', code: componentDefs.map((d) => d.id), floor: 20 },
  { node: 'mcp-server', what: 'MCP tool', code: toolDefs({}).map((t) => t.name), floor: 5 },
  { node: 'agent-link', what: 'agent link command', code: [...AGENT_COMMANDS], floor: 5 },
  { node: 'bridge', what: 'bridge tool', code: BRIDGE_TOOLS.map((t) => t.name), floor: 2 },
  { node: 'skills', what: 'skill', code: skills, floor: 3 },
];
for (const s of SURFACES) {
  if (s.code.length < s.floor) { fail('FLOOR', `the code yields ${s.code.length} ${s.what}s, under the floor of ${s.floor} — the import or the scan has gone blind`); continue; }
  const node = data.nodes.find((n) => n.id === s.node);
  if (!node) { fail('MEMBERS', `no node '${s.node}' to carry the ${s.what}s`); continue; }
  const listed = node.members?.items ?? [];
  const inData = new Set(listed);
  const inCode = new Set(s.code);
  for (const m of s.code) if (!inData.has(m)) fail('MEMBERS', `${s.node} is missing the ${s.what} '${m}', which the code ships`);
  for (const m of listed) if (!inCode.has(m)) fail('MEMBERS', `${s.node} lists the ${s.what} '${m}', which the code does not have`);
  if (inData.size !== listed.length) fail('MEMBERS', `${s.node} lists a ${s.what} twice`);
}

// ── PAGE ─────────────────────────────────────────────────────────────────────────────────────────
if (!/fetch\(\s*['"]\.\/ecosystem\.json['"]/.test(page)) fail('PAGE', `${PAGE} does not fetch './ecosystem.json' — the page must render from the data, not restate it`);

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
if (data.nodes.length < 20) fail('FLOOR', `${data.nodes.length} nodes, under the floor of 20`);
if (data.edges.length < 20) fail('FLOOR', `${data.edges.length} edges, under the floor of 20`);
if (data.traces.length < 3) fail('FLOOR', `${data.traces.length} traces, under the floor of 3`);
if (checked < PAIRS.length * 2 && !fails.some((f) => f.startsWith('CONTRAST'))) fail('FLOOR', `checked ${checked} contrast pairs, expected ${PAIRS.length * 2}`);

if (fails.length) {
  console.error(`\n❌ ${TAG}: ${fails.length} problem(s) in ${DATA} or ${PAGE}:\n`);
  for (const f of fails) console.error(`    ${f}`);
  console.error(`\n  How to update the data when a feature ships: ${DIR}/README.md`);
  process.exit(1);
}
const memberCount = SURFACES.reduce((a, s) => a + s.code.length, 0);
console.log(`✅ ${TAG}: ${data.nodes.length} nodes, ${data.edges.length} edges, ${data.traces.length} traces; ${memberCount} members across ${SURFACES.length} surfaces match the code; ${checked} contrast pairs clear 4.5:1 in light and dark.`);
