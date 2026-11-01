/**
 * Prism3 engine — ANALYSIS REPORTS (#2651, part of the docs effort #2637). Four reports read off the
 * component definitions and the emission, each as a Markdown page for people and a JSON twin for agents,
 * plus an index for each form.
 *
 *   npx tsx packages/engine/emit-analysis-reports.ts
 *     → docs/public/reports/token-usage.{md,json}             every token: who binds it, on which part, where
 *     → docs/public/reports/component-dependencies.{md,json}  what nests what, and what a change reaches
 *     → docs/public/reports/component-comparison.{md,json}    states, axes, props, sizes and defaults side by side
 *     → docs/public/reports/icon-usage.{md,json}              which glyphs each component draws
 *     → docs/public/reports/index.{md,json}                   the entry point, linked from docs/public/llms.txt
 *
 * Run as a `regen.ts` step, so `regen.ts --check` names a stale report by path (`REPORT_ARTIFACTS`).
 *
 * DECISIONS, stated so a reviewer can disagree with them rather than infer them:
 *
 *  · TWO SOURCES, AND EACH FACT SAYS WHICH. A def's `tokens` map is what the definition DECLARES; the
 *    design-file projection (`figmaAnatomySet`) is where each binding LANDS, part by part and member by
 *    member. The token report carries both, because they disagree on purpose in places: a host's focus-ring
 *    keys are declared and never drawn (the ring is a nested instance), and a derived corner rung is drawn
 *    and never declared. Collapsing them into one list would hide exactly the gaps a reader came to find.
 *  · THE TOKEN UNIVERSE IS THE EMISSION. "Unused" means a leaf of `out/prism3.tokens.json` (below its
 *    configurable root, the same keying `schema/token-contract.json` uses) that no def declares and no
 *    projected member binds. Primitives (`core.*`) are listed apart: semantic roles are what a def binds,
 *    so an unused primitive is the design working, not a gap.
 *  · WHERE A BINDING LANDS IS SUMMARIZED PER AXIS, NOT PER MEMBER. Button projects 576 members; listing
 *    each one per token would make the page unreadable and the JSON tens of megabytes. Each part records
 *    the member count and, per axis, the values it was bound at — an axis bound at every value it has is
 *    left out, so an empty `where` reads "every member". The summary loses which values co-occur; the
 *    member count says how much it lost.
 *  · NO ENGINE VERSION, NO DATE. A fold restamps the engine version and would rewrite four files that
 *    describe nothing new; a report changes only when a def or the emission does.
 *  · FAMILIES ARE DERIVED FROM NAMES AND `inherits`, NEVER LISTED BY HAND. A hand-kept family list is a
 *    second source a new component can be forgotten in. The three groupings are in `peerGroups` below.
 *  · THE COMPARISON REPORTS, IT DOES NOT JUDGE. Each finding is a difference between peers; whether a
 *    difference is a defect or a decision is the owner's call, so the page says "differs", never "wrong".
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expandKey, type ComponentDef, type PartDef } from './component-schema';
import { figmaAnatomySet, type FigmaNodePlan } from './anatomy-figma';
import { componentDefs } from './components/index';
import { ICON_NAMES } from './icon-glyphs';
import { COMPONENT_GLYPHS } from './component-glyphs';
// The file list lives in `regen.ts`, which compares exactly these; `buildReports` refuses to write any other set.
import { REPORT_ARTIFACTS, REPORTS_DIR } from './regen';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const reportsDir = join(repo, REPORTS_DIR);
const EMISSION = 'packages/engine/out/prism3.tokens.json';

// Code-unit order everywhere, never `localeCompare`: a locale-dependent sort would make the reports differ by machine.
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const defs = [...(componentDefs as ComponentDef[])].sort((a, b) => cmp(a.id, b.id));
const byId = new Map(defs.map((d) => [d.id, d]));
const uniqSorted = (xs: Iterable<string>): string[] => [...new Set(xs)].sort();
const code = (s: string): string => '`' + s + '`';
const cell = (s: string): string => s.replace(/\|/g, '\\|');
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));
const json = (o: unknown): string => JSON.stringify(o, null, 2) + '\n';

// ── the token universe: the emission's leaves, below the root ─────────────────────────────────────────
const universe = (() => {
  const tree = JSON.parse(readFileSync(join(repo, EMISSION), 'utf8'));
  const root = Object.keys(tree).find((k) => !k.startsWith('$'));
  if (!root) throw new Error(`${EMISSION}: no root group`);
  const leaves = new Map<string, string>();
  const walk = (o: any, path: string[]): void => {
    if (o && typeof o === 'object' && '$value' in o) { leaves.set(path.join('.'), String(o.$type ?? '')); return; }
    for (const [k, v] of Object.entries(o ?? {})) if (!k.startsWith('$')) walk(v, [...path, k]);
  };
  walk(tree[root], []);
  return leaves;
})();

/** A plan names a token in one of three Figma namespaces; each maps back to one dotted path. */
const refOfPlanName = (name: string, ns: 'var' | 'text' | 'effect'): string => {
  const dotted = name.replace(/\//g, '.');
  const candidates = ns === 'text' ? [`type.${dotted}`, dotted] : ns === 'effect' ? [dotted, `shadow.${dotted}`] : [dotted];
  const hit = candidates.find((c) => universe.has(c));
  if (!hit) throw new Error(`analysis reports: the projection binds "${name}" and no emitted token is named ${candidates.join(' or ')}`);
  return hit;
};

/** Every token a node binds itself (not its children's), across every binding API the plan has. */
const nodeRefs = (n: FigmaNodePlan): string[] => {
  const vars = [
    ...Object.values(n.bound ?? {}),
    n.paints?.fills, n.paints?.strokes, n.descendantFills,
    ...(n.gradientFill?.stops ?? []).map((s) => s.variable),
    n.absoluteInset, n.absoluteStrokeInset, n.cornerInset,
  ].filter((x): x is string => !!x);
  return [
    ...vars.map((v) => refOfPlanName(v, 'var')),
    ...(n.textStyle ? [refOfPlanName(n.textStyle, 'text')] : []),
    ...(n.effectStyle ? [refOfPlanName(n.effectStyle, 'effect')] : []),
  ];
};

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// 1. TOKEN USAGE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
type PartUse = { members: number; where: Record<string, string[]> };
type CompUse = { keys: string[]; keysNotDrawn?: string[]; parts: Record<string, PartUse> };

/** Every token name a plan node binds, its children's included, as the plan writes it (no mapping to the emission). */
const planNames = (n: FigmaNodePlan, out: Set<string>): Set<string> => {
  for (const v of [
    ...Object.values(n.bound ?? {}), n.paints?.fills, n.paints?.strokes, n.descendantFills,
    ...(n.gradientFill?.stops ?? []).map((s) => s.variable), n.absoluteInset, n.absoluteStrokeInset, n.cornerInset,
    n.textStyle, n.effectStyle,
  ]) if (v) out.add(v);
  n.children.forEach((c) => planNames(c, out));
  return out;
};

/**
 * THE KEYS NO PLAN WRITES (#3157). A token's row lists every key that names it, and its parts are where the token
 * lands, so a key sharing its token with a key the plans DO draw reads as drawn too: Divider's `horizontal.line.width`
 * names the hairline, the grow rule drops it (#3143), and `horizontal.line.height` draws the same hairline. Only a
 * key that shares its token can be hidden this way (a key alone on its token is drawn exactly when the token is), so
 * each such key is probed on its own: the def projected again with that one key pointed at a name nothing else binds,
 * and the key is drawn when some member binds that name. Read from the projection, never from the part's binding
 * fields, so a key dropped by any rule (the grow rule, a hug, a size override) reads as dropped.
 */
const keysNotDrawn = (def: ComponentDef): Set<string> => {
  const byRef = new Map<string, string[]>();
  for (const [k, r] of Object.entries(def.tokens ?? {})) byRef.set(r, [...(byRef.get(r) ?? []), k]);
  const dropped = new Set<string>();
  for (const ks of byRef.values()) {
    if (ks.length < 2) continue;
    for (const k of ks) {
      const probe = `zz-report-probe.${k}`;
      const names = new Set<string>();
      for (const plan of figmaAnatomySet({ ...def, tokens: { ...def.tokens, [k]: probe } })) planNames(plan.root, names);
      if (![...names].some((n) => n.replace(/\//g, '.') === probe)) dropped.add(k);
    }
  }
  return dropped;
};

const tokenUsage = () => {
  // ref → component → { declared keys, part → coordinate values seen }
  const uses = new Map<string, Map<string, { keys: Set<string>; parts: Map<string, { members: number; seen: Map<string, Set<string>> }> }>>();
  const at = (ref: string, id: string) => {
    let byComp = uses.get(ref);
    if (!byComp) uses.set(ref, (byComp = new Map()));
    let u = byComp.get(id);
    if (!u) byComp.set(id, (u = { keys: new Set(), parts: new Map() }));
    return u;
  };
  const perComponent: Record<string, {
    members: number; axes: Record<string, string[]>; tokens: string[];
    declaredNotDrawn: string[]; drawnNotDeclared: string[];
  }> = {};
  const notDrawnKeys = new Map<string, Set<string>>();

  for (const def of defs) {
    for (const [key, ref] of Object.entries(def.tokens ?? {})) at(ref, def.id).keys.add(key);
    const plans = def.anatomy && def.figmaProperties ? figmaAnatomySet(def) : [];
    if (plans.length) notDrawnKeys.set(def.id, keysNotDrawn(def));
    const axes = new Map<string, Set<string>>();
    const drawn = new Set<string>();
    for (const plan of plans) {
      const coord: Record<string, string> = {};
      for (const [k, v] of Object.entries(plan.coord ?? {})) if (v !== undefined) coord[k] = String(v);
      if (plan.size) coord.size = plan.size;
      for (const s of plan.slotAxes ?? []) coord[s] = String(plan.slots[s as 'leading' | 'trailing'] ?? false);
      for (const [k, v] of Object.entries(coord)) (axes.get(k) ?? axes.set(k, new Set()).get(k)!).add(v);
      // One member can bind the same token on the same part through two APIs; count the member once.
      const seenHere = new Set<string>();
      const visit = (n: FigmaNodePlan): void => {
        for (const ref of nodeRefs(n)) {
          drawn.add(ref);
          const mark = `${ref}\u0000${n.name}`;
          const u = at(ref, def.id);
          let p = u.parts.get(n.name);
          if (!p) u.parts.set(n.name, (p = { members: 0, seen: new Map() }));
          if (!seenHere.has(mark)) { seenHere.add(mark); p.members++; }
          for (const [k, v] of Object.entries(coord)) (p.seen.get(k) ?? p.seen.set(k, new Set()).get(k)!).add(v);
        }
        n.children.forEach(visit);
      };
      visit(plan.root);
    }
    const declared = new Set(Object.values(def.tokens ?? {}));
    perComponent[def.id] = {
      members: plans.length,
      axes: Object.fromEntries([...axes].sort(([a], [b]) => cmp(a, b)).map(([k, v]) => [k, [...v].sort()])),
      tokens: uniqSorted([...declared, ...drawn]),
      declaredNotDrawn: plans.length ? uniqSorted([...declared].filter((r) => !drawn.has(r))) : [],
      drawnNotDeclared: uniqSorted([...drawn].filter((r) => !declared.has(r))),
    };
  }

  const missing = uniqSorted([...uses.keys()].filter((r) => !universe.has(r)));
  const tokens: Record<string, { type: string; components: Record<string, CompUse> }> = {};
  for (const ref of uniqSorted(uses.keys())) {
    const components: Record<string, CompUse> = {};
    for (const [id, u] of [...uses.get(ref)!].sort(([a], [b]) => cmp(a, b))) {
      const all = perComponent[id].axes;
      const parts: Record<string, PartUse> = {};
      for (const [part, p] of [...u.parts].sort(([a], [b]) => cmp(a, b))) {
        const where: Record<string, string[]> = {};
        for (const [axis, vals] of [...p.seen].sort(([a], [b]) => cmp(a, b)))
          if (!sameSet([...vals], all[axis] ?? [])) where[axis] = [...vals].sort();
        parts[part] = { members: p.members, where };
      }
      const dropped = [...u.keys].filter((k) => notDrawnKeys.get(id)?.has(k)).sort();
      components[id] = { keys: [...u.keys].sort(), ...(dropped.length && u.parts.size ? { keysNotDrawn: dropped } : {}), parts };
    }
    tokens[ref] = { type: universe.get(ref) ?? '', components };
  }
  const unusedAll = [...universe.keys()].filter((r) => !uses.has(r)).sort();
  const unused = {
    semantic: unusedAll.filter((r) => !r.startsWith('core.')),
    primitive: unusedAll.filter((r) => r.startsWith('core.')),
  };
  return { tokens, perComponent, unused, missing };
};

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// 2. COMPONENT DEPENDENCIES
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
type Edge = { from: string; to: string; part: string; partKind: string; relation: string; variant?: Record<string, string>; follow?: string[]; expose?: string[] };

const dependencies = () => {
  const edges: Edge[] = [];
  for (const def of defs)
    for (const [part, p] of Object.entries<PartDef>(def.anatomy?.parts ?? {}).sort(([a], [b]) => cmp(a, b))) {
      if (!p.nests) continue;
      const rel = p.nesting;
      edges.push({
        from: def.id, to: p.nests, part, partKind: p.kind, relation: rel?.kind ?? 'none',
        ...(rel && 'variant' in rel ? { variant: rel.variant } : {}),
        ...(rel && 'follow' in rel && rel.follow ? { follow: [...rel.follow] } : {}),
        ...(rel && 'expose' in rel ? { expose: [...rel.expose] } : {}),
      });
    }
  const unknown = edges.filter((e) => !byId.has(e.to));
  if (unknown.length) throw new Error(`analysis reports: a part nests an unregistered component: ${unknown.map((e) => `${e.from}.${e.part} → ${e.to}`).join(', ')}`);

  const direct = new Map<string, string[]>(defs.map((d) => [d.id, uniqSorted(edges.filter((e) => e.from === d.id).map((e) => e.to))]));
  const closure = (start: string, next: (id: string) => string[]): string[] => {
    const seen = new Set<string>();
    const stack = [...next(start)];
    while (stack.length) { const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id); stack.push(...next(id)); }
    seen.delete(start);
    return [...seen].sort();
  };
  const nestedBy = (id: string) => uniqSorted(edges.filter((e) => e.to === id).map((e) => e.from));
  const components: Record<string, { nests: string[]; nestsTransitively: string[]; nestedBy: string[]; affectedByChange: string[]; inherits?: string; inheritedBy: string[] }> = {};
  for (const d of defs)
    components[d.id] = {
      nests: direct.get(d.id)!,
      nestsTransitively: closure(d.id, (id) => direct.get(id) ?? []),
      nestedBy: nestedBy(d.id),
      affectedByChange: closure(d.id, nestedBy),
      ...(d.inherits ? { inherits: d.inherits } : {}),
      inheritedBy: defs.filter((x) => x.inherits === d.id).map((x) => x.id),
    };
  // Depth: 0 for a component that nests nothing, else one more than its deepest child.
  const depth = new Map<string, number>();
  const depthOf = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    const d = Math.max(-1, ...(direct.get(id) ?? []).map(depthOf)) + 1;
    depth.set(id, d);
    return d;
  };
  defs.forEach((d) => depthOf(d.id));
  return { edges, components, depth: Object.fromEntries(defs.map((d) => [d.id, depth.get(d.id)!])) };
};

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// 3. CROSS-COMPONENT COMPARISON
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
/** Name suffixes that name a ROLE inside a family (a row, a group) rather than a tone variant of one. */
const ROLE_SUFFIXES = ['Control', 'Row', 'Group', 'Item', 'Segment', 'Indicator'];
const stem = (d: ComponentDef): string => d.name.split('.')[0];
const suffix = (d: ComponentDef): string | undefined => d.name.split('.')[1];
const substrateRoot = (d: ComponentDef): string => { let x = d; while (x.inherits && byId.has(x.inherits)) x = byId.get(x.inherits)!; return x.id; };

/** The three peer groupings, each derived from the defs: see this file's header. */
const peerGroups = (): { kind: string; name: string; members: string[]; basis: string }[] => {
  const groups: { kind: string; name: string; members: string[]; basis: string }[] = [];
  const add = (kind: string, name: string, members: string[], basis: string) => { if (members.length > 1) groups.push({ kind, name, members: members.sort(), basis }); };
  for (const s of uniqSorted(defs.map(stem)))
    add('variant family', s, defs.filter((d) => stem(d) === s && !ROLE_SUFFIXES.includes(suffix(d) ?? '')).map((d) => d.id),
      `components named ${s} or ${s}.<variant>, where the suffix is not a role`);
  for (const r of ROLE_SUFFIXES)
    add('role peers', `*.${r}`, defs.filter((d) => suffix(d) === r).map((d) => d.id), `components whose name ends in .${r}`);
  for (const root of uniqSorted(defs.filter((d) => d.inherits).map(substrateRoot)))
    add('substrate', root, defs.filter((d) => substrateRoot(d) === root).map((d) => d.id), `${root} and every component that inherits from it, directly or through another`);
  return groups;
};

type Finding = { kind: string; subject: string; detail: string; components: string[] };

const comparison = () => {
  const rows = defs.map((d) => {
    const v = d.variants ?? {};
    const sizeProp = d.props.find((p) => p.name === 'size');
    return {
      id: d.id, name: d.name, category: d.category,
      states: [...(d.states ?? [])],
      projectedStates: d.figmaProperties?.stateAxis?.values ? [...d.figmaProperties.stateAxis.values] : [],
      axes: Object.fromEntries(Object.entries(v).filter(([, xs]) => xs?.length).map(([k, xs]) => [k, [...xs!]])) as Record<string, string[]>,
      props: d.props.map((p) => ({ name: p.name, ...(p.default !== undefined ? { default: p.default } : {}), ...(p.values ? { values: [...p.values] } : {}) })),
      sizes: v.size ? [...v.size] : [],
      sizeDefault: sizeProp?.default !== undefined ? String(sizeProp.default) : undefined,
    };
  });
  const row = new Map(rows.map((r) => [r.id, r]));
  const findings: Finding[] = [];

  // ── per peer group: state set and axis names against the group's most common shape ──
  const groups = peerGroups();
  const mode = (xs: string[]): string => {
    const n = new Map<string, number>();
    xs.forEach((x) => n.set(x, (n.get(x) ?? 0) + 1));
    return [...n].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]))[0][0];
  };
  for (const g of groups) {
    const key = (id: string) => JSON.stringify([...row.get(id)!.states].sort());
    const common = mode(g.members.map(key));
    const odd = g.members.filter((id) => key(id) !== common);
    // A tie leaves no majority to measure against; report the spread instead of picking one side.
    const commonCount = g.members.filter((id) => key(id) === common).length;
    if (odd.length) {
      if (commonCount * 2 <= g.members.length) {
        findings.push({ kind: 'state set', subject: `${g.kind}: ${g.name}`, components: g.members,
          detail: `no state set is shared by most of the group — ${g.members.map((id) => `${id} [${row.get(id)!.states.join(', ')}]`).join('; ')}` });
      } else {
        const base: string[] = JSON.parse(common);
        for (const id of odd) {
          const s = row.get(id)!.states;
          const extra = s.filter((x) => !base.includes(x));
          const lacks = base.filter((x) => !s.includes(x));
          findings.push({ kind: 'state set', subject: `${g.kind}: ${g.name}`, components: [id],
            detail: `${id} differs from the group's common set [${base.join(', ')}]` + (extra.length ? ` — adds ${extra.join(', ')}` : '') + (lacks.length ? `${extra.length ? ';' : ' —'} lacks ${lacks.join(', ')}` : '') });
        }
      }
    }
    if (g.kind === 'variant family') {
      const axesKey = (id: string) => JSON.stringify(row.get(id)!.axes);
      const commonAxes = mode(g.members.map(axesKey));
      for (const id of g.members.filter((x) => axesKey(x) !== commonAxes))
        findings.push({ kind: 'variant axes', subject: `${g.kind}: ${g.name}`, components: [id], detail: `${id}'s variant axes differ from the family's common set` });
    }
  }

  // ── states the definition declares that the design file never draws ──
  for (const r of rows) {
    if (!r.projectedStates.length) continue;
    const notDrawn = r.states.filter((s) => !r.projectedStates.includes(s));
    if (notDrawn.length)
      findings.push({ kind: 'state not drawn', subject: r.id, components: [r.id], detail: `${r.id} declares ${notDrawn.length === 1 ? `the state ${notDrawn[0]}` : `the states ${notDrawn.slice(0, -1).join(', ')} and ${notDrawn.at(-1)}`}, which the design-file state axis does not draw` });
  }

  // ── axis vocabulary: one axis name, several value sets ──
  const axisNames = uniqSorted(rows.flatMap((r) => Object.keys(r.axes)));
  const axisVocabulary: Record<string, { values: string[]; components: string[] }[]> = {};
  for (const a of axisNames) {
    if (a === 'name') continue; // Icon's glyph axis is the icon set itself; see the icon report.
    const sets = new Map<string, string[]>();
    for (const r of rows) if (r.axes[a]) { const k = JSON.stringify([...r.axes[a]].sort()); sets.set(k, [...(sets.get(k) ?? []), r.id]); }
    axisVocabulary[a] = [...sets].map(([k, ids]) => ({ values: JSON.parse(k), components: ids })).sort((x, y) => y.components.length - x.components.length || cmp(x.values.join(), y.values.join()));
    if (sets.size > 1)
      findings.push({ kind: 'axis values', subject: `axis ${a}`, components: uniqSorted([...sets.values()].flat()),
        detail: `the ${a} axis takes ${sets.size} value sets — ${axisVocabulary[a].map((s) => `[${s.values.join(', ')}] in ${s.components.join(', ')}`).join('; ')}` });
  }

  // ── size rungs: set, declared order and default ──
  const sized = rows.filter((r) => r.sizes.length);
  const canonicalOrder = ['x-small', 'small', 'medium', 'large'];
  for (const r of sized) {
    const ordered = [...r.sizes].sort((a, b) => canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b));
    if (r.sizes.join() !== ordered.join())
      findings.push({ kind: 'size order', subject: r.id, components: [r.id], detail: `${r.id} declares its sizes as [${r.sizes.join(', ')}], not smallest first` });
  }
  const sizeDefaults = sized.filter((r) => r.sizeDefault).map((r) => r.sizeDefault!);
  const commonDefault = sizeDefaults.length ? mode(sizeDefaults) : undefined;
  for (const r of sized)
    if (r.sizeDefault && r.sizeDefault !== commonDefault)
      findings.push({ kind: 'size default', subject: r.id, components: [r.id], detail: `${r.id} defaults size to ${r.sizeDefault}; ${sizeDefaults.filter((x) => x === commonDefault).length} of ${sizeDefaults.length} sized components default to ${commonDefault}` });

  // ── props: one name, different defaults or value lists ──
  const propNames = uniqSorted(rows.flatMap((r) => r.props.map((p) => p.name)));
  const propVocabulary: Record<string, { id: string; default?: string | number | boolean; values?: string[] }[]> = {};
  for (const n of propNames) {
    const on = rows.flatMap((r) => r.props.filter((p) => p.name === n).map((p) => ({ id: r.id, ...p })));
    propVocabulary[n] = on.map(({ id, default: d, values }) => ({ id, ...(d !== undefined ? { default: d } : {}), ...(values ? { values } : {}) }));
    if (on.length < 2 || n === 'size') continue; // size is compared above, rung by rung
    // Compared only between props with the SAME value list (or none): two props that share a name and not a
    // vocabulary (Button's html `type` and Badge's `type`) differ in default because they differ in meaning,
    // and the axis-values finding already reports the vocabulary.
    for (const vocab of uniqSorted(on.map((p) => JSON.stringify(p.values ?? null)))) {
      const same = on.filter((p) => JSON.stringify(p.values ?? null) === vocab && p.default !== undefined);
      const defaults = uniqSorted(same.map((p) => String(p.default)));
      if (defaults.length > 1)
        findings.push({ kind: 'prop default', subject: `prop ${n}`, components: same.map((p) => p.id),
          detail: `${n} defaults differ over the same values — ${defaults.map((d) => `${d} in ${same.filter((p) => String(p.default) === d).map((p) => p.id).join(', ')}`).join('; ')}` });
    }
  }

  // ── axes with no prop of the same name (the code API spells the axis another way) ──
  for (const r of rows) {
    const names = new Set(r.props.map((p) => p.name));
    const loose = Object.keys(r.axes).filter((a) => !names.has(a));
    if (loose.length)
      findings.push({ kind: 'axis without prop', subject: r.id, components: [r.id], detail: loose.length === 1 ? `${r.id} has the variant axis ${loose[0]} and no prop of that name` : `${r.id} has the variant axes ${loose.slice(0, -1).join(', ')} and ${loose.at(-1)} and no props of those names` });
  }

  const stateVocabulary = Object.fromEntries(uniqSorted(rows.flatMap((r) => r.states)).map((s) => [s, rows.filter((r) => r.states.includes(s)).map((r) => r.id)]));
  return { components: rows, peerGroups: groups, stateVocabulary, axisVocabulary, propVocabulary, findings };
};

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// 4. ICON USAGE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
const iconUsage = () => {
  const iconSet = new Set<string>(ICON_NAMES);
  const ownGlyphs = new Set(Object.keys(COMPONENT_GLYPHS));
  type Use = { part: string; glyph: string; source: 'icon set' | 'component-owned' | 'any (prop)'; how: 'drawn' | 'swap default'; when?: Record<string, readonly string[]> };
  const components: Record<string, { glyphs: Use[]; iconSlots: string[] }> = {};
  for (const def of defs) {
    const glyphs: Use[] = [];
    const iconSlots: string[] = [];
    for (const [part, p] of Object.entries<PartDef>(def.anatomy?.parts ?? {}).sort(([a], [b]) => cmp(a, b))) {
      const when = p.presentWhen ? { when: p.presentWhen } : {};
      if (p.glyph) {
        const templated = /^\{.+\}$/.test(p.glyph);
        // A name PART-templated on an axis (Progress's `progress-arc-{size}`, #2670) is one glyph per axis value.
        const named = templated ? [] : expandKey(p.glyph, def.variants as Record<string, readonly string[]>);
        const source = templated ? 'any (prop)' : named.every((g) => iconSet.has(g)) ? 'icon set' : named.every((g) => ownGlyphs.has(g)) ? 'component-owned' : undefined;
        if (!source) throw new Error(`analysis reports: ${def.id}.${part} draws "${p.glyph}", which is neither in the icon set nor a component-owned glyph`);
        glyphs.push({ part, glyph: p.glyph, source, how: 'drawn', ...when });
      }
      // A slot that keeps its content's own paint hosts a provider logo, not an icon (#2343 PR 4): it is no icon slot, and
      // its default is a mark, which the mark set reports, not this one.
      if (p.kind === 'slot' && !p.fixedPaint) {
        iconSlots.push(part);
        if (p.swapDefault) glyphs.push({ part, glyph: p.swapDefault, source: 'icon set', how: 'swap default', ...when });
      }
    }
    if (glyphs.length || iconSlots.length) components[def.id] = { glyphs, iconSlots };
  }
  const glyphNames = uniqSorted([...iconSet, ...ownGlyphs]);
  const byGlyph = Object.fromEntries(glyphNames.map((g) => [g, uniqSorted(Object.entries(components).filter(([, c]) => c.glyphs.some((u) => u.glyph === g)).map(([id]) => id))]));
  return {
    iconSetSize: iconSet.size,
    components,
    glyphs: byGlyph,
    notDrawnByAnyComponent: glyphNames.filter((g) => iconSet.has(g) && !byGlyph[g].length),
  };
};

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// RENDERING
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
const SOURCES = ['packages/engine/components/*.ts', 'packages/engine/component-schema.ts', EMISSION];
const header = (title: string, intro: string[], twin: string): string[] => [
  `# ${title}`, '',
  ...intro, '',
  `Generated from the component definitions and the emission by \`packages/engine/emit-analysis-reports.ts\`; \`regen.ts --check\` fails when this page is stale. The same data for agents: [${twin}](${twin}). All reports: [index](index.md).`, '',
];
const whereText = (u: PartUse, total: number): string => {
  const axes = Object.entries(u.where);
  const span = axes.length ? axes.map(([a, v]) => `${a}: ${v.join(', ')}`).join(' · ') : 'every member';
  return `${span} (${u.members} of ${total})`;
};

const renderTokenUsage = (t: ReturnType<typeof tokenUsage>) => {
  const used = Object.keys(t.tokens).length;
  const data = {
    $schema: 'prism3-report/token-usage/1', generated: true, sources: SOURCES,
    note: 'tokens: every token a definition declares or the design-file projection binds, keyed by path below the root. components.<id>.keys are the definition binding keys that name it; keysNotDrawn lists those of them no member draws, when another key draws the same token; parts.<part>.where lists, per axis, the values the part is bound at — an axis bound at every value is left out, so an empty where means every member. byComponent is the inverse. unused lists emitted tokens nothing binds.',
    summary: { emitted: t.universe, used, unusedSemantic: t.unused.semantic.length, unusedPrimitive: t.unused.primitive.length, components: Object.keys(t.perComponent).length },
    tokens: t.tokens, byComponent: t.perComponent, unused: t.unused,
  };
  const md: string[] = header('Token usage', [
    `Where each token is bound: by which component, on which part, and at which variants and states. ${used} of ${t.universe} emitted tokens are bound by at least one component.`,
    '',
    'Two sources feed each entry. **Keys** are the binding keys in the component definition. **Parts** are where the design-file projection draws the token; "where" lists the axis values a part is bound at, leaves out any axis bound at every value, and counts the members. A key marked "not drawn" names the token but no member draws it; another key on the row does.',
  ], 'token-usage.json');
  md.push('## Contents', '', '- [By token](#by-token)', '- [By component](#by-component)', '- [Tokens no component binds](#tokens-no-component-binds)', '');
  md.push('## By token', '');
  for (const [ref, e] of Object.entries(t.tokens)) {
    md.push(`### ${code(ref)}`, '', `Type: ${e.type || 'not emitted'}. Bound by ${Object.keys(e.components).length} component(s).`, '', '| Component | Keys | Part | Where |', '|---|---|---|---|');
    for (const [id, c] of Object.entries(e.components)) {
      const parts = Object.entries(c.parts);
      const keys = c.keys.length ? c.keys.map((k) => (c.keysNotDrawn?.includes(k) ? `${code(k)} (not drawn)` : code(k))).join(', ') : '(projection only)';
      if (!parts.length) md.push(`| ${id} | ${cell(keys)} | (not drawn) | — |`);
      else parts.forEach(([p, u], i) => md.push(`| ${i ? '' : id} | ${i ? '' : cell(keys)} | ${p} | ${cell(whereText(u, t.perComponent[id].members))} |`));
    }
    md.push('');
  }
  md.push('## By component', '', 'Every token each component uses. "Declared, not drawn" names tokens the definition binds that no design-file part draws; "drawn, not declared" names tokens the projection binds that the definition does not list (a value the projection derives, such as an inverse-surface twin or a corner rung).', '');
  for (const [id, c] of Object.entries(t.perComponent)) {
    md.push(`### ${id}`, '', `${c.tokens.length} token(s); ${c.members} design-file member(s).`, '');
    md.push(c.tokens.map(code).join(', ') || '(none)', '');
    if (c.declaredNotDrawn.length) md.push(`Declared, not drawn: ${c.declaredNotDrawn.map(code).join(', ')}`, '');
    if (c.drawnNotDeclared.length) md.push(`Drawn, not declared: ${c.drawnNotDeclared.map(code).join(', ')}`, '');
  }
  md.push('## Tokens no component binds', '',
    `${t.unused.semantic.length} semantic token(s) and ${t.unused.primitive.length} primitive(s). Primitives (\`core.*\`) are listed apart — components bind semantic roles, which alias the primitives, so an unbound primitive is expected.`, '',
    '### Semantic', '');
  // Colors group by role family (`color.text`); everything else by its first segment (`motion`, `grid`).
  const groupOf = (r: string) => r.split('.').slice(0, r.startsWith('color.') ? 2 : 1).join('.');
  for (const g of uniqSorted(t.unused.semantic.map(groupOf))) md.push(`- **${g}** — ${t.unused.semantic.filter((r) => groupOf(r) === g).map(code).join(', ')}`);
  md.push('', '### Primitive', '');
  for (const g of uniqSorted(t.unused.primitive.map((r) => r.split('.').slice(0, 3).join('.')))) {
    const n = t.unused.primitive.filter((r) => r.startsWith(g + '.') || r === g).length;
    md.push(`- **${g}** — ${n} token(s)`);
  }
  md.push('');
  return { md: md.join('\n'), json: data };
};

const renderDependencies = (d: ReturnType<typeof dependencies>) => {
  const data = {
    $schema: 'prism3-report/component-dependencies/1', generated: true, sources: SOURCES,
    note: 'edges: every part that nests another component (anatomy part with `nests`), with its nesting relation. components.<id>.affectedByChange lists every component that nests it directly or transitively — the components a change to it reaches. inherits is a reading reference only: the engine copies no fields across it, so it does not appear in affectedByChange.',
    edges: d.edges, components: d.components, depth: d.depth,
  };
  const md: string[] = header('Component dependencies', [
    'What nests what, and which components a change reaches. An edge is a part in one component that places an instance of another: a nested part in the layout, an out-of-flow part such as the focus ring, or an overlay such as the spinner.',
    '',
    '`inherits` is listed apart. It tells a reader which definition to read for the rest; the engine copies nothing across it, so it is not part of what a change reaches.',
  ], 'component-dependencies.json');
  md.push('## If a component changes', '', '| Component | Nested by (direct) | Affected by a change (direct and transitive) |', '|---|---|---|');
  for (const [id, c] of Object.entries(d.components)) if (c.nestedBy.length) md.push(`| ${id} | ${c.nestedBy.join(', ')} | ${c.affectedByChange.join(', ')} |`);
  md.push('', 'A component not in this table is nested by nothing; a change to it reaches only itself.', '');
  md.push('## What each component nests', '', '| Component | Depth | Nests (direct) | Nests (transitive) |', '|---|---|---|---|');
  for (const [id, c] of Object.entries(d.components)) md.push(`| ${id} | ${d.depth[id]} | ${c.nests.join(', ') || '—'} | ${c.nestsTransitively.join(', ') || '—'} |`);
  md.push('', 'Depth is 0 for a component that nests nothing, and one more than its deepest child otherwise.', '');
  md.push('## Edges', '', '| From | Part | Kind | To | Relation | Fixed variant | Follows | Exposes |', '|---|---|---|---|---|---|---|---|');
  for (const e of d.edges)
    md.push(`| ${e.from} | ${e.part} | ${e.partKind} | ${e.to} | ${e.relation} | ${e.variant ? Object.entries(e.variant).map(([k, v]) => `${k}=${v}`).join(', ') : '—'} | ${e.follow?.join(', ') || '—'} | ${e.expose?.join(', ') || '—'} |`);
  md.push('', '## Inherits', '', '| Component | Inherits from |', '|---|---|');
  for (const [id, c] of Object.entries(d.components)) if (c.inherits) md.push(`| ${id} | ${c.inherits} |`);
  md.push('');
  return { md: md.join('\n'), json: data };
};

const renderComparison = (c: ReturnType<typeof comparison>) => {
  const data = {
    $schema: 'prism3-report/component-comparison/1', generated: true, sources: SOURCES,
    note: 'components: each definition\'s states, projected design-file states, variant axes, props (name, default, values), size rungs and size default. peerGroups: the three derived groupings. findings: every difference between peers, for the owner to judge — a finding is a difference, not a verdict.',
    ...c,
  };
  const md: string[] = header('Component comparison', [
    'State sets, variant axes, props, size rungs and defaults, side by side. The findings list every place peers differ. A difference can be deliberate; this page reports it and leaves the call to the owner.',
    '',
    'Peers come from three groupings, each derived from the definitions:',
    '',
    '- **Variant family** — components named `X` or `X.<variant>` (Button, Button.Destructive).',
    `- **Role peers** — components in different families that play the same role, by name suffix (${ROLE_SUFFIXES.map((s) => `\`.${s}\``).join(', ')}).`,
    '- **Substrate** — a component and every component that `inherits` from it.',
  ], 'component-comparison.json');
  md.push(`## Findings (${c.findings.length})`, '');
  for (const k of uniqSorted(c.findings.map((f) => f.kind))) {
    md.push(`### ${k}`, '');
    for (const f of c.findings.filter((x) => x.kind === k)) md.push(`- **${f.subject}** — ${f.detail}`);
    md.push('');
  }
  md.push('## Peer groups', '', '| Grouping | Name | Members |', '|---|---|---|');
  for (const g of c.peerGroups) md.push(`| ${g.kind} | ${cell(g.name)} | ${g.members.join(', ')} |`);
  md.push('', '## States', '', '| Component | Category | States | Drawn in the design file |', '|---|---|---|---|');
  for (const r of c.components) md.push(`| ${r.id} | ${r.category} | ${r.states.join(', ') || '—'} | ${r.projectedStates.join(', ') || '—'} |`);
  md.push('', '### State vocabulary', '', '| State | Components |', '|---|---|');
  for (const [s, ids] of Object.entries(c.stateVocabulary)) md.push(`| ${s} | ${ids.join(', ')} |`);
  md.push('', '## Variant axes', '', '| Axis | Values | Components |', '|---|---|---|');
  for (const [a, sets] of Object.entries(c.axisVocabulary)) sets.forEach((s, i) => md.push(`| ${i ? '' : a} | ${cell(s.values.join(', '))} | ${s.components.join(', ')} |`));
  md.push('', "Icon's `name` axis is the icon set itself and is covered by the [icon usage](icon-usage.md) report.", '');
  md.push('## Size rungs and defaults', '', '| Component | Sizes, as declared | Default |', '|---|---|---|');
  for (const r of c.components) if (r.sizes.length) md.push(`| ${r.id} | ${r.sizes.join(', ')} | ${r.sizeDefault ?? '—'} |`);
  md.push('', '## Props shared by more than one component', '', '| Prop | Component | Default | Values |', '|---|---|---|---|');
  for (const [n, on] of Object.entries(c.propVocabulary)) {
    if (on.length < 2) continue;
    on.forEach((p, i) => md.push(`| ${i ? '' : n} | ${p.id} | ${p.default === undefined ? '—' : cell(String(p.default))} | ${p.values ? cell(p.values.length > 8 ? `${p.values.length} values` : p.values.join(', ')) : '—'} |`));
  }
  md.push('');
  return { md: md.join('\n'), json: data };
};

const renderIcons = (i: ReturnType<typeof iconUsage>) => {
  const data = {
    $schema: 'prism3-report/icon-usage/1', generated: true, sources: [...SOURCES.slice(0, 2), 'packages/engine/icon-glyphs.ts', 'packages/engine/component-glyphs.ts'],
    note: 'components.<id>.glyphs: each part that draws a fixed glyph (how: drawn) or starts its icon slot at one (how: swap default); source is the icon set, a component-owned glyph, or any glyph chosen through a prop. iconSlots: parts that take any icon. glyphs: the inverse, per glyph. notDrawnByAnyComponent: icon-set glyphs no definition names; each one is still reachable through Icon and every icon slot.',
    ...i,
  };
  const md: string[] = header('Icon usage', [
    `Which glyphs each component draws. The icon set holds ${i.iconSetSize} glyphs; a component draws a glyph from it at a fixed part, starts an icon slot at one, or draws a glyph it owns (the spinner ring), which is kept out of the icon set.`,
  ], 'icon-usage.json');
  md.push('## By component', '', '| Component | Part | Glyph | Source | How | Shown when |', '|---|---|---|---|---|---|');
  for (const [id, c] of Object.entries(i.components)) {
    c.glyphs.forEach((u, n) => md.push(`| ${n ? '' : id} | ${u.part} | ${code(u.glyph)} | ${u.source} | ${u.how} | ${u.when ? cell(Object.entries(u.when).map(([k, v]) => `${k}: ${v.join(', ')}`).join('; ')) : 'always'} |`));
  }
  md.push('', '### Icon slots', '', 'Parts that take any icon from the set. The file nominates the default unless the definition names one (a swap default above).', '', '| Component | Slots |', '|---|---|');
  for (const [id, c] of Object.entries(i.components)) if (c.iconSlots.length) md.push(`| ${id} | ${c.iconSlots.join(', ')} |`);
  md.push('', '## By glyph', '', '| Glyph | Drawn by |', '|---|---|');
  for (const [g, ids] of Object.entries(i.glyphs)) if (ids.length) md.push(`| ${code(g)} | ${ids.join(', ')} |`);
  md.push('', `## Glyphs no component names (${i.notDrawnByAnyComponent.length})`, '', 'Each is still reachable through Icon and through every icon slot.', '', i.notDrawnByAnyComponent.map(code).join(', '), '');
  return { md: md.join('\n'), json: data };
};

export const buildReports = (): Record<string, string> => {
  const t = { ...tokenUsage(), universe: universe.size };
  if (t.missing.length) throw new Error(`analysis reports: a definition binds ${t.missing.join(', ')}, which the emission does not carry`);
  const reports = [
    { file: 'token-usage', title: 'Token usage', about: 'every token: which components, parts, variants and states bind it, the inverse per component, and the tokens no component binds', ...renderTokenUsage(t) },
    { file: 'component-dependencies', title: 'Component dependencies', about: 'what nests what, directly and transitively, and which components a change reaches', ...renderDependencies(dependencies()) },
    { file: 'component-comparison', title: 'Component comparison', about: 'state sets, variant axes, props, size rungs and defaults side by side, with every difference between peers', ...renderComparison(comparison()) },
    { file: 'icon-usage', title: 'Icon usage', about: 'which glyphs each component draws, and which icon-set glyphs no component names', ...renderIcons(iconUsage()) },
  ];
  const out: Record<string, string> = {};
  for (const r of reports) { out[`${r.file}.md`] = r.md; out[`${r.file}.json`] = json(r.json); }
  out['index.md'] = [
    '# Analysis reports', '',
    `Generated reports on the ${defs.length} registered components, read from their definitions and the emission. Each report is a page and a JSON twin with the same data; \`regen.ts --check\` fails when either is stale.`, '',
    '| Report | Covers | JSON |', '|---|---|---|',
    ...reports.map((r) => `| [${r.title}](${r.file}.md) | ${r.about} | [${r.file}.json](${r.file}.json) |`),
    '', 'For agents: [index.json](index.json) lists the same reports.', '',
  ].join('\n');
  out['index.json'] = json({
    $schema: 'prism3-report/index/1', generated: true, components: defs.length,
    reports: reports.map((r) => ({ id: r.file, title: r.title, covers: r.about, page: `${r.file}.md`, data: `${r.file}.json` })),
  });
  const names = Object.keys(out).sort();
  if (names.join() !== [...REPORT_ARTIFACTS].sort().join()) throw new Error(`analysis reports: wrote [${names.join(', ')}], REPORT_ARTIFACTS names [${REPORT_ARTIFACTS.join(', ')}]`);
  return out;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = buildReports();
  mkdirSync(reportsDir, { recursive: true });
  // Writes its own files and nothing else. It never clears the directory: `regen --check` runs this emitter
  // and restores only the files it names, so a wholesale clear would delete anything else kept there.
  for (const [f, text] of Object.entries(out)) writeFileSync(join(reportsDir, f), text);
  console.log(`wrote ${Object.keys(out).length} files to docs/public/reports/`);
}
