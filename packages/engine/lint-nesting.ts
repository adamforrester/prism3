/**
 * lint-nesting — the component NESTING graph is resolvable and acyclic (#1226 PR-A).
 *
 * A def nests another component by NAME (`anatomy.parts[*].nests` → an `absolute` focus ring, or, since
 * #1226 PR-A, an in-flow `nest` like a Checkbox.Row's control). The plugin resolves that name against the
 * live file at build time (`write-components.ts`'s `compByName`), and a name that resolves to nothing
 * builds nothing and reports a miss — a RUNTIME failure a designer hits, not a build-time one. Once
 * components nest components (C/D/E in the #1226 sequence build Control → Row → Group), two static
 * properties of that graph are worth failing the build for rather than discovering in Figma:
 *
 *  ── nest-resolves ──  every id named in `nests` is a real component in `componentDefs`. A typo'd or
 *     renamed target (`checkbox-controll`) otherwise ships and fails only when a designer builds the
 *     consumer and its target never appears. EXPECTED is the def REGISTRY (`componentDefs` ids); SUBJECT
 *     is the `nests` references authored in the def files. The two are independent — the registry is the
 *     set of files, the references are strings inside them — so this is a real comparison, not `x === x`
 *     (`docs/34` shape 1). Mutating a `nests` id to one no def has fails THIS arm by name.
 *
 *  ── acyclic ──  the `nests` graph has no cycle. A build order exists only if it does: a designer builds
 *     the nested target first, then its consumer (the plugin builds one def per run), and a cycle names
 *     no first component. `A nests B nests A` — or a def nesting itself — is unbuildable and is caught
 *     here rather than as an infinite regress or a permanent "build the other one first" at paste. DFS
 *     over the same graph; introducing a cycle fails THIS arm by name.
 *
 * FLOOR (`docs/34` shape 9): every arm passes vacuously over an empty graph, so the run asserts the graph
 * is NON-EMPTY — at least one `nests` edge exists. Seven defs nest `focus-ring` today (button and its two
 * split defs, icon-button, checkbox, radio, switch — the file count is five, but `button.ts` exports three),
 * so a refactor that silently drops all nesting fails here rather than reporting a clean zero over nothing.
 * It is a NON-EMPTINESS floor, never a per-host assertion: unnesting ONE host leaves the graph non-empty and
 * this stays silent — that case (a def whose plan changed while its member count held) is `lint-component-
 * surface`'s, which fails by name on the digest. A per-host floor DERIVED from the nest edges would be the
 * circular gate the discipline forbids; the independent form is a claim about focus rings, a different gate.
 *
 *  ── glyph-resolves ──  (#2380) every icon-set glyph a def draws outside `icon` is an INSTANCE of the icon
 *     component `icon/<glyph>`, so it is a nest edge too: the def depends on `icon` being built first, exactly
 *     as a focus-ring host depends on `focus-ring`. These edges are read off the def's `vector` parts (a
 *     `glyph` named in the icon vocabulary and not a component-owned glyph), and each must name a glyph the
 *     icon def actually emits a component for. EXPECTED is the icon def's own `name` axis values (the members
 *     it builds); SUBJECT is the `glyph` string authored in the consuming def. Renaming a def's glyph to one
 *     the icon def has no member for fails THIS arm by name. The edges join the acyclic walk, so a def that
 *     `icon` nested would be caught as a cycle. Floor: at least one glyph edge exists.
 *
 * NOT an ORDERING gate. #1226 PR-A considered and REJECTED a gate asserting `components/index.ts`'s array
 * order matches the nest graph, because nothing reads that order (the file's own header says so, and the
 * plugin builds one def per invocation) — a gate that fails on a reorder while protecting no consumer is
 * the thing this repo's gate-independence discipline exists to prevent. Acyclicity is the real invariant:
 * it guarantees an order EXISTS without pinning the array to one.
 */
import { componentDefs } from './components/index';
import { ICON_NAMES } from './icon-glyphs';
import { COMPONENT_GLYPHS } from './component-glyphs';

type Edge = { from: string; part: string; to: string };

const ids = new Set(componentDefs.map((d) => d.id));
const edges: Edge[] = [];
for (const def of componentDefs)
  for (const [part, p] of Object.entries(def.anatomy?.parts ?? {}))
    if (p.nests) edges.push({ from: def.id, part, to: p.nests });

// THE GLYPH EDGES (#2380): an icon-set glyph outside `icon` is an instance of `icon/<glyph>`. The def id is
// typed here; the glyph is the def's own string. A templated glyph (`{name}`) is the icon def's own and draws.
const ICON = 'icon';
type GlyphEdge = Edge & { glyph: string };
const glyphEdges: GlyphEdge[] = [];
for (const def of componentDefs) {
  if (def.id === ICON) continue;
  for (const [part, p] of Object.entries(def.anatomy?.parts ?? {}))
    if (p.kind === 'vector' && p.glyph && !p.glyph.includes('{') && !COMPONENT_GLYPHS[p.glyph] && (ICON_NAMES as readonly string[]).includes(p.glyph))
      glyphEdges.push({ from: def.id, part, to: ICON, glyph: p.glyph });
}

const fail: string[] = [];

// ── FLOOR ──────────────────────────────────────────────────────────────────────────────────────
// The count in the remedy is DERIVED from the same walk, never authored — a hand-typed "five defs" was
// wrong here (seven edges, five files: `button.ts` exports three defs) and being wrong in a gate's own
// failure message is the worst place for it (#1262 review). At this failure the graph is empty, so it
// reads 0 — it states the current count rather than an authored target that could go stale (the load-bearing
// "seven" lives in the header, where the success line `7 nest edge(s)` keeps it true at every ref).
if (edges.length === 0) {
  const nestingDefs = componentDefs.filter((d) => Object.values(d.anatomy?.parts ?? {}).some((p) => p.nests)).length;
  fail.push(`floor: no \`nests\` edges found across ${componentDefs.length} defs — every arm below passes vacuously over an empty graph, so an empty one is itself the failure (${nestingDefs} defs nest something today)`);
}

// ── ARM 1: nest-resolves ─────────────────────────────────────────────────────────────────────────
for (const e of edges)
  if (!ids.has(e.to))
    fail.push(`nest-resolves: ${e.from}.${e.part} nests '${e.to}', which is not a component in componentDefs (have: ${[...ids].join(', ')}) — a designer building ${e.from} would find its nested target never appears`);

// ── ARM 1b: glyph-resolves (#2380) ─────────────────────────────────────────────────────────────────
// The icon def must exist and emit a component for each glyph a def draws as its instance. EXPECTED is the
// icon def's `name` axis — the members it builds — not the vocabulary the consuming def was validated against.
const iconDef = componentDefs.find((d) => d.id === ICON);
const iconMembers = new Set<string>((iconDef?.variants?.name ?? []) as string[]);
if (glyphEdges.length === 0)
  fail.push(`glyph floor: no def draws an icon-set glyph as an instance of '${ICON}/<glyph>' — the arm below passes vacuously over none, so an empty set is itself the failure (#2380 has a dozen)`);
for (const e of glyphEdges)
  if (!iconDef) fail.push(`glyph-resolves: ${e.from}.${e.part} draws '${e.glyph}' as an instance of '${ICON}/${e.glyph}', and there is no '${ICON}' def to build it`);
  else if (!iconMembers.has(e.glyph))
    fail.push(`glyph-resolves: ${e.from}.${e.part} draws '${e.glyph}' as an instance of '${ICON}/${e.glyph}', and the '${ICON}' def builds no member named '${e.glyph}' — the instance would resolve to nothing`);
edges.push(...glyphEdges);

// ── ARM 2: acyclic ───────────────────────────────────────────────────────────────────────────────
// Standard DFS three-colour cycle detection over the nests graph. Only edges whose target resolves are
// walked (an unresolved edge is arm 1's finding, not a cycle); a self-edge is a cycle of length one.
const adj = new Map<string, string[]>();
for (const e of edges) if (ids.has(e.to)) (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to);
const state = new Map<string, 'visiting' | 'done'>();
const walk = (node: string, path: string[]): void => {
  state.set(node, 'visiting');
  for (const next of adj.get(node) ?? []) {
    if (state.get(next) === 'visiting') {
      const cyc = [...path.slice(path.indexOf(next)), next].join(' → ');
      fail.push(`acyclic: the nests graph has a cycle (${cyc}) — a cycle names no component to build first, so the consumers in it are unbuildable one-at-a-time`);
    } else if (!state.get(next)) walk(next, [...path, next]);
  }
  state.set(node, 'done');
};
for (const id of ids) if (!state.get(id)) walk(id, [id]);

// ── VERDICT ──────────────────────────────────────────────────────────────────────────────────────
if (fail.length) {
  console.error(`✗ lint-nesting: ${fail.length} problem(s) in the component nesting graph:\n`);
  for (const f of fail) console.error(`  · ${f}`);
  process.exit(1);
}
console.log(`✓ lint-nesting: ${edges.length - glyphEdges.length} nest edge(s) and ${glyphEdges.length} icon-instance edge(s) across ${componentDefs.length} defs — every target resolves and the graph is acyclic.`);
