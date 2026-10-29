/**
 * COMPONENT ROUND-TRIP GATE (#874) — build every def, read the result back out of the host, and diff
 * it against the plan that built it.
 *
 *   npx tsx apps/plugin/test-roundtrip.ts
 *   npx tsx apps/plugin/test-roundtrip.ts --inventory     # report divergences, exit 0
 *
 * The reader and the differ are `packages/engine/anatomy-readback.ts`, which carries the design and
 * the independence argument. This file is the OFFLINE HOST arm: it drives the real
 * `applyComponentPlan` against the shared shim and reports what came back.
 *
 * ── WHY THE OFFLINE ARM IS WORTH HAVING ON ITS OWN ─────────────────────────────────────────────
 *
 * #874 assumes a round-trip needs a real Figma file, and for one defect class it does. But the
 * measurement in that issue's analysis is entirely offline: **four writes in `write-components.ts`
 * could be deleted with every gate green**, because a never-written field reads back as absent from
 * this shim exactly as it would from Figma. The cheap half is not a consolation prize — it is where
 * the live defects are.
 *
 * What only a real host can see is ACCEPT-AND-DISCARD: Figma taking a write and not keeping it (#866,
 * and #865's unauthored defaults). The shim reproduces only the discards it was TAUGHT — its own
 * header says so — so that class is a ledger here by construction and a rule only against Figma. The
 * real-host arm is `tools/component-roundtrip/`, filed separately; **CI does not cover it.**
 *
 * ── THE TWO MODES, AND WHY THE INVENTORY MODE EXISTS ───────────────────────────────────────────
 *
 * A gate may only merge green, and this one is red on the corpus it was written against — which is the
 * point: it was built to catch live defects and it caught them. `--inventory` prints the full
 * divergence table and exits 0, so the report is usable while the defects are being fixed. The GATE
 * mode is the default and fails on any divergence; it is what CI runs once the inventory is empty.
 *
 * Nothing about the comparison differs between the modes. Weakening the diff to force green would
 * delete the gate and report that as a pass, which is the shape this whole file exists to prevent.
 */

import { applyOutlineInteraction, applyButtonLayout, DEFAULT_BUTTON_LAYOUT } from '@prism3/engine/anatomy-figma';
import { figmaAnatomySet, planComponentName, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { diffAnatomy, unclassifiedFields, fieldCoverage } from '@prism3/engine/anatomy-readback';
import type { Divergence, HostNode, ReadPorts } from '@prism3/engine/anatomy-readback';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildFigmaTextStyles } from '@prism3/engine/emit-figma-font';
import { nbTheme } from '@prism3/engine/nb-fixture';
import { sizeRefPx } from '@prism3/engine/scale';
import { tailOf } from '@prism3/engine/figma-names';
import { componentSpec, specMaterialize } from '@prism3/engine/component-specs';
import type { ComponentSpec } from '@prism3/engine/component-specs';
import { figmaVarName, figmaTextStyleName } from '@prism3/engine/anatomy-figma';
import { applyComponentPlan } from './src/write-components';
import { makeShim, varValue } from './component-shim';
import { materializeForBrand } from './src/brand-def';
import { planTargets, prebuildDependencies } from './src/build-deps';
import { reactionMap } from './src/reactions';
import { readSpecTag } from './src/spec-tag';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { validateComponentDef } from '@prism3/engine/component-schema';
import type { Node, Page, ShimOpts } from './component-shim';

const INVENTORY = process.argv.includes('--inventory');

/** Nodes compared, per predicate, across the whole corpus — see `diffAnatomy`. A predicate at zero is
 *  a clause with no subject and is reported as such rather than counted as coverage. */
const EXERCISED: Record<string, number> = {};

/** The FPO component the plugin nominates for every swap slot — the same constant
 *  `apps/plugin/src/main.ts` uses, restated here because a harness that builds a DIFFERENT plan from
 *  the one the product builds is measuring something nobody ships. */
const SWAP_TARGET = 'FPO-default-icon';

/**
 * The corpus: every def the engine PROJECTS into a Figma set.
 *
 * A def with no `figmaProperties` block declares no Figma axes and `figmaAnatomySet` refuses it — the
 * projection is opt-in (`test.ts` asserts that directly). Those defs are excluded and NAMED below
 * rather than filtered silently: an excluded member is invisible to a scan that only reports what it
 * walked, and "which defs does nothing round-trip" is exactly the question a reader of this report
 * will have. Both sets are printed, and the split is asserted total over `componentDefs`.
 */
const PROJECTED = componentDefs.filter((d) => d.figmaProperties);
const CODE_ONLY = componentDefs.filter((d) => !d.figmaProperties);

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/** Every name a plan set reaches for, DERIVED FROM THE PLANS — the same construction
 *  `test-write-components.ts` uses, so a host that is missing a catalogue entry is a harness fault
 *  rather than a finding. */
const planComps = (n: { swapTarget?: string; nestTarget?: string; children: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []),
  ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.children as (typeof n)[]).flatMap(planComps),
];
const fullFor = (plans: AnatomyPlan[]): ShimOpts => ({
  vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
  comps: [...new Set(plans.flatMap((p) => planComps(p.root)))],
  // #2317 — the TEXT properties each nested component's instances carry, from the NESTED def's own declaration
  // (its `figmaProperties.texts`, under the Figma name), so a host def's `nestTexts` override is read back against
  // a property the harness did not learn from that override.
  compTexts: Object.fromEntries([...new Set(plans.flatMap((p) => planComps(p.root)))].flatMap((id) => {
    const texts = componentDefs.find((d) => d.id === id)?.figmaProperties?.texts;
    return texts ? [[id, Object.fromEntries(Object.entries(texts).map(([k, t]) => [t.figmaName ?? k, t.default]))]] : [];
  })),
});

/** Every projected def's plans, once — the catalog a build that pre-builds its nested sets binds from. */
let allPlans: AnatomyPlan[] | undefined;
const ALL_PLANS = (): AnatomyPlan[] => (allPlans ??= PROJECTED.flatMap((d) => figmaAnatomySet(d, { swapTarget: SWAP_TARGET })));
/** Every string an instance under `root` holds as a property value, resolved through the host's `getNodeByIdAsync`:
 *  the ones that name a component are a swap's value. Read off the host, never off the plan (#2645). */
const componentNamesOf = async (shim: unknown, root: unknown): Promise<Map<string, string>> => {
  const out = new Map<string, string>();
  const lookup = (shim as { getNodeByIdAsync?: (id: string) => Promise<{ name?: string } | null> }).getNodeByIdAsync;
  const walk = async (n: Node | undefined): Promise<void> => {
    if (!n) return;
    for (const v of Object.values((n.componentProperties as Record<string, { value?: unknown }> | undefined) ?? {})) {
      if (typeof v.value !== 'string' || out.has(v.value) || !lookup) continue;
      const hit = await lookup(v.value);
      if (hit?.name) out.set(v.value, hit.name);
    }
    for (const c of (n.children as Node[] | undefined) ?? []) await walk(c);
  };
  await walk(root as Node | undefined);
  return out;
};

/**
 * Build one def and read it back.
 *
 * The ports resolve ids through the HOST'S OWN CATALOGUES (`getLocalVariablesAsync`,
 * `getLocalTextStylesAsync`, `getLocalEffectStylesAsync`) rather than through the plan — a resolver
 * built from the plan would map every id to the name the diff was hoping for, which is the whole
 * failure mode in one line.
 */
const roundTrip = async (def: (typeof componentDefs)[number], extra: Partial<ShimOpts> = {}): Promise<{ plans: AnatomyPlan[]; divergences: Divergence[]; members: number; hostMembers: HostNode[]; set: HostNode | undefined; ports: ReadPorts }> => {
  // NOMINATED, exactly as the real caller does (`apps/plugin/src/main.ts` — `SWAP_TARGET`). Building
  // the plan set without it is not a smaller version of the same build: the executor then reports
  // `swapTarget -> (none nominated; built as a placeholder frame)` and puts a FRAME where the plan
  // says INSTANCE_SWAP, which this reader correctly calls a divergence — of the HARNESS, not the
  // subject. That misconfiguration produced 2,970 findings on its first run and every one was mine.
  const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  const page: Page = { children: [] };
  // A PLAN THAT OVERRIDES A NESTED INSTANCE (#2645) is built the way the plugin builds it: its nested sets first, into
  // the same file (`liveRoot`), so each nested instance has the properties its set really declared, `#id` suffixes and
  // all. Against a catalog name with nothing behind it there is no property to set, and the round-trip would be
  // measuring the harness.
  // A SLOT THAT STARTS AT A PROVIDER LOGO (#2343 PR 4, the Card number field's tile) is built the same way: the plugin builds
  // the mark first (`prebuildDependencies`), so the swap is an instance of the real mark, whose own extent the aspect lock
  // reads. Against the FPO catalog name alone there is no mark, and the instance would be measuring the harness.
  const marks = plans.some((p) => JSON.stringify(p.root).includes('"swapTarget":"provider-logo/'));
  // So is a plan that LOCKS a nested instance to its main's proportion (#2343 PR 2, WalletButton's logo, PR 4): the
  // executor reads the proportion off the main component, and a bare catalog name has no size to read, so the built
  // standalone components answer as themselves (`liveComponents`), as Figma's do.
  const locks = plans.some((p) => JSON.stringify(p.root).includes('"aspectLock"'));
  const overrides = marks || locks || plans.some((p) => JSON.stringify(p.root).includes('"nestOverrides"'));
  // Only the FPO swap target is a catalog name then: a nested def's own name must answer as the set built here, never as
  // a bare component of that name, which a plain-component lookup would find first.
  const shim = makeShim({ ...fullFor(overrides ? [...plans, ...ALL_PLANS()] : plans), ...(overrides ? { comps: [SWAP_TARGET], liveRoot: true } : {}), ...(marks || locks ? { liveComponents: true } : {}), page, ...extra });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  if (overrides) await prebuildDependencies(def, { defs: componentDefs, project: (d) => figmaAnatomySet(d, { swapTarget: SWAP_TARGET }), host: shim as any, build: (d) => applyComponentPlan(figmaAnatomySet(d, { swapTarget: SWAP_TARGET }), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents }) });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  await applyComponentPlan(plans, shim as any, {});

  // A component key → its name, off the file's own catalog (#2646), for a slot's preferred values.
  const catalog = (shim as unknown as { root: { findAllWithCriteria: (c: { types: string[] }) => { name: string; key?: string }[] } }).root;
  const nameByKey = new Map([...catalog.findAllWithCriteria({ types: ['COMPONENT_SET'] }), ...catalog.findAllWithCriteria({ types: ['COMPONENT'] })]
    .filter((c) => c.key).map((c) => [String(c.key), c.name] as const));
  const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
  const texts = await (shim as unknown as { getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalTextStylesAsync();
  const effects = await (shim as unknown as { getLocalEffectStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalEffectStylesAsync();
  const varById = new Map(vars.map((v) => [v.id, v.name] as const));
  const styleById = new Map([...texts, ...effects].map((s) => [s.id, s.name] as const));
  // A component id → its name, through the HOST's own lookup (#2645): a swap override's value is an id.
  const set = overrides ? page.children.find((c) => c.type === 'COMPONENT_SET' && c.name === plans[0].component) : page.children[0];
  const nameById = await componentNamesOf(shim, set);
  const ports: ReadPorts = {
    varName: (id) => varById.get(id) ?? null,
    styleName: (id) => styleById.get(id) ?? null,
    componentName: (key) => nameByKey.get(key) ?? null,
    componentById: (id) => nameById.get(id) ?? null,
  };

  const members = (set?.children ?? []) as unknown as HostNode[];
  return { plans, divergences: diffAnatomy(plans, members, planComponentName, ports, EXERCISED), members: members.length, hostMembers: members, set: set as unknown as HostNode | undefined, ports, page };
};

console.log(`component round-trip (#874) — ${INVENTORY ? 'INVENTORY' : 'GATE'} mode\n`);

// ---- THE FLOOR: every declared plan field is classified ---------------------------------------
// A field on `FigmaNodePlan` that `FIELDS` does not mention would be silently unchecked — the exact
// hole this gate exists to close one level down, reappearing inside the gate itself.
{
  const allPlans = PROJECTED.flatMap((d) => figmaAnatomySet(d, { swapTarget: SWAP_TARGET }));
  const unknown = unclassifiedFields(allPlans);
  ok(unknown.length === 0, `every plan field is classified as checked or explicitly unchecked${unknown.length ? ` — UNCLASSIFIED: ${unknown.join(', ')}` : ''}`);
  const cov = fieldCoverage();
  ok(cov.checked.length > 0, `${cov.checked.length} predicates declared: ${cov.checked.join(', ')}`);
  console.log(`\n  declared UNCHECKED, with reasons (${cov.unchecked.length}):`);
  for (const u of cov.unchecked) console.log(`    ${u.field.padEnd(20)} ${u.reason}`);
}

// ── SPEC READ-BACK (#2830) — THE SPEC MODEL AGAINST WHAT THE HOST BUILT ─────────────────────────────────────────
//
// `componentSpec` (`packages/engine/component-specs.ts`) is what a spec sheet and the docs site show: parts, redlines,
// type, colors and nesting, as token names. It is projected from the PLAN, so checking it against the plan would be
// the model's own derivation run twice (docs/34 shape 2). It is checked here against the HOST: what
// `applyComponentPlan` actually built into the shim, read by the reader below, which shares no code with the model —
// its own Figma-key list, its own walk (host children by name, stopping at instances and drawn geometry), its own
// member-name parse, names resolved through the host's own catalogs (`ports`).
//
// BOTH DIRECTIONS, PER MEMBER, BY NAME:
//   · DROPPED — every part, redline binding, literal, text style, paint and nest the host holds must be in the model,
//     in the one row whose `where` covers that member, with the same value. A model that forgot a part, a padding
//     side, a stroke or a nested instance fails as `<def> · <member> · <path> · <property>`.
//   · CLAIMED — every value a model row states must be held, at that path, by every member the row covers that holds
//     the path, and by at least one member. A row that keys too coarsely (two values under one `where`) fails here.
//
// WHERE ITS COVERAGE STOPS (docs/34 shape 17), stated so the count below does not read as more: model and host both
// descend from the plan, so a WRONG PLAN agrees with itself here — that is the round-trip diff above and the
// projection gates in `test.ts`. A nest's `exposes` list is checked only as the host's one boolean
// (`isExposedInstance`): the host does not hold which axes are exposed, so that list is pinned by hand in `test.ts`,
// not read back here. A nest's fixed variant (with its `when` rules) is read off the host instance's main component
// name only where that main is a member of a built set — the defs whose nested sets this harness prebuilds; elsewhere
// the shim's nested target is a bare catalog component with no coordinate, and `test.ts` pins the variant by hand.
// An instance's icon color (`icon` on a swap slot or a placed instance) sits on the VECTORs
// inside it; the walk stops at instances, so this reader reaches them through the instance's own `findAll`, both
// directions, and floors the count (`icons`) so a model that drops every instance icon cannot read as a pass.
type SpecFinding = { member: string; path: string; property: string; expected: string; actual: string };
type SpecCheck = { def: string; findings: SpecFinding[]; facts: Record<string, number> };
const specChecks: SpecCheck[] = [];

/** The Figma keys this reader reads as redlines, and the model property each is. RESTATED, not imported from the
 *  model's `GEOMETRY`: a key the model's list drops must still be read here, or the drop is invisible (docs/34). */
const HOST_GEOMETRY: Record<string, string> = {
  paddingTop: 'paddingTop', paddingRight: 'paddingRight', paddingBottom: 'paddingBottom', paddingLeft: 'paddingLeft',
  itemSpacing: 'gap', counterAxisSpacing: 'rowGap', height: 'height', minHeight: 'minHeight', width: 'width', minWidth: 'minWidth', maxWidth: 'maxWidth',
};
/** Node types that are drawn geometry inside a glyph frame, not parts. */
const DRAWN = new Set(['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'ELLIPSE', 'POLYGON', 'LINE', 'RECTANGLE']);

const specReadback = (spec: ComponentSpec, members: HostNode[], set: HostNode | undefined, ports: ReadPorts): Omit<SpecCheck, 'def'> => {
  const findings: SpecFinding[] = [];
  const facts: Record<string, number> = { parts: 0, redlines: 0, type: 0, colors: 0, icons: 0, nests: 0, variants: 0, properties: 0, claimed: 0 };
  const miss = (member: string, path: string, property: string, expected: string, actual: string) => findings.push({ member, path, property, expected, actual });
  // A host variable name is brand-rooted; the plan's (and so a token's Figma name) is not. Compared on the tail.
  const varIs = (host: string | null, token: string): boolean => host !== null && (host === figmaVarName(token) || host.endsWith(`/${figmaVarName(token)}`));
  const byFigma = new Map(spec.axes.map((a) => [a.figmaName, a.name] as const));
  const coordOfName = (name: string): Record<string, string> =>
    Object.fromEntries(name.split(', ').filter(Boolean).map((seg) => { const [k, v] = seg.split('='); return [byFigma.get(k) ?? `?${k}`, v]; }));
  const covers = (where: Record<string, string>, coord: Record<string, string>) => Object.entries(where).every(([a, v]) => coord[a] === v);
  const rowFor = <R extends { where: Record<string, string> }>(rows: R[], coord: Record<string, string>): R[] => rows.filter((r) => covers(r.where, coord));
  const root = spec.anatomy[0]?.part ?? '(no parts)';

  // ── read every member off the host ──
  type Host = { name: string; coord: Record<string, string>; nodes: Map<string, HostNode> };
  const hosts: Host[] = members.map((m) => {
    const nodes = new Map<string, HostNode>();
    const walk = (n: HostNode, path: string): void => {
      nodes.set(path, n);
      if (String(n.type) === 'INSTANCE') return; // another component's insides
      for (const c of (Array.isArray(n.children) ? n.children : []) as HostNode[]) if (!DRAWN.has(String(c.type))) walk(c, `${path}/${String(c.name)}`);
    };
    walk(m, root);
    return { name: String(m.name), coord: coordOfName(String(m.name)), nodes };
  });
  const paintVar = (arr: unknown): string | null => {
    const first = Array.isArray(arr) ? (arr[0] as { boundVariables?: { color?: { id?: unknown } } } | undefined) : undefined;
    const id = first?.boundVariables?.color?.id;
    return typeof id === 'string' ? ports.varName(id) : null;
  };
  /** The ink on the first VECTOR inside an instance: another component's insides, which the walk does not enter. */
  const instanceInk = (n: HostNode): string | null => {
    const findAll = (n as { findAll?: (f: (x: HostNode) => boolean) => HostNode[] }).findAll;
    const vecs = typeof findAll === 'function' ? findAll.call(n, (x) => String(x.type) === 'VECTOR') : [];
    return vecs.map((v) => paintVar(v.fills)).find((v) => v !== null) ?? null;
  };

  // ── DROPPED: host → model ──
  const holding = new Map<string, number>();
  for (const h of hosts) {
    for (const [path, n] of h.nodes) {
      holding.set(path, (holding.get(path) ?? 0) + 1);
      facts.parts++;
      if (!spec.anatomy.some((p) => p.part === path)) { miss(h.name, path, 'part', 'in the anatomy', 'ABSENT from the model'); continue; }
      const bv = (n.boundVariables ?? {}) as Record<string, { id?: unknown }>;
      // Redlines: every bound geometry key, and every literal the build wrote.
      const rl = rowFor(spec.redlines, h.coord);
      if (rl.length !== 1) { miss(h.name, path, 'redline row', 'exactly one row covers the member', `${rl.length} rows`); continue; }
      const values = rl[0].parts.find((p) => p.part === path)?.values ?? {};
      for (const [key, prop] of Object.entries(HOST_GEOMETRY)) {
        const id = bv[key]?.id;
        if (typeof id !== 'string') continue;
        facts.redlines++;
        const host = ports.varName(id);
        const want = (values as Record<string, { token?: string; px?: number }>)[prop];
        if (!want?.token || !varIs(host, want.token)) miss(h.name, path, prop, want ? JSON.stringify(want) : 'in the model', `host binds ${host ?? `unresolvable ${id}`}`);
      }
      for (const key of ['minWidth', 'maxWidth', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const) {
        const v = n[key];
        if (typeof v !== 'number' || typeof bv[key]?.id === 'string' || v <= 0 || (String(n.type) === 'INSTANCE' && key.startsWith('padding'))) continue;
        facts.redlines++;
        const want = (values as Record<string, { token?: string; px?: number }>)[key];
        if (want?.token !== undefined || want?.px !== v) miss(h.name, path, key, want ? JSON.stringify(want) : 'in the model', `host holds ${v}px, unbound`);
      }
      // Type.
      if (typeof n.textStyleId === 'string' && n.textStyleId) {
        facts.type++;
        const host = ports.styleName(n.textStyleId);
        const tr = rowFor(spec.type, h.coord);
        const want = tr.length === 1 ? tr[0].parts.find((p) => p.part === path)?.textStyle : undefined;
        if (!want || figmaTextStyleName(want) !== host) miss(h.name, path, 'textStyle', want ?? 'in the model', `host applies ${host}`);
      }
      // Colors.
      const cr = rowFor(spec.colors, h.coord);
      const colors = cr.length === 1 ? cr[0].parts.find((p) => p.part === path) : undefined;
      if (cr.length !== 1 && (paintVar(n.fills) || paintVar(n.strokes))) miss(h.name, path, 'color row', 'exactly one row covers the member', `${cr.length} rows`);
      const fill = paintVar(n.fills);
      if (fill) {
        facts.colors++;
        const want = String(n.type) === 'TEXT' ? colors?.ink : colors?.fill ?? colors?.icon;
        if (!want || !varIs(fill, want)) miss(h.name, path, String(n.type) === 'TEXT' ? 'ink' : 'fill', want ?? 'in the model', `host fills ${fill}`);
      }
      const gradient = Array.isArray(n.fills) && (n.fills[0] as { type?: string })?.type === 'GRADIENT_LINEAR'
        ? ((n.fills[0] as { gradientStops?: { boundVariables?: { color?: { id?: unknown } } }[] }).gradientStops ?? []).map((g) => (typeof g.boundVariables?.color?.id === 'string' ? ports.varName(g.boundVariables.color.id) : null)) : null;
      if (gradient) {
        facts.colors++;
        const want = colors?.gradient;
        if (!want || want.length !== gradient.length || want.some((t, i) => !varIs(gradient[i], t))) miss(h.name, path, 'gradient', want ? JSON.stringify(want) : 'in the model', `host stops ${JSON.stringify(gradient)}`);
      }
      const ink = String(n.type) === 'INSTANCE' ? instanceInk(n) : null;
      if (ink) {
        facts.icons++;
        if (!colors?.icon || !varIs(ink, colors.icon)) miss(h.name, path, 'icon', colors?.icon ?? 'in the model', `host instance inks ${ink}`);
      }
      const stroke = paintVar(n.strokes);
      if (stroke) {
        facts.colors++;
        if (!colors?.stroke || !varIs(stroke, colors.stroke)) miss(h.name, path, 'stroke', colors?.stroke ?? 'in the model', `host strokes ${stroke}`);
      }
      // Nesting: an instance is a swap slot (a mainComponent reference) or a nest (whose component the host names).
      if (String(n.type) === 'INSTANCE' || String(n.type) === 'SLOT') {
        facts.nests++;
        const entry = spec.nesting.find((x) => x.part === path);
        const refs = (n.componentPropertyReferences ?? {}) as Record<string, unknown>;
        if (String(n.type) === 'SLOT') { if (entry?.kind !== 'slot') miss(h.name, path, 'nesting', 'a slot', entry ? entry.kind : 'ABSENT from the model'); }
        else if (typeof refs.mainComponent === 'string') {
          const prop = refs.mainComponent.split('#')[0];
          if (entry?.kind !== 'swap' || entry.property !== prop) miss(h.name, path, 'nesting', `a swap on ${prop}`, entry ? JSON.stringify(entry) : 'ABSENT from the model');
        } else {
          const main = n.mainComponent as { name?: unknown; parent?: { name?: unknown; type?: unknown } | null } | null | undefined;
          const owner = main?.parent?.type === 'COMPONENT_SET' ? String(main.parent.name) : String(main?.name);
          if (entry?.kind === 'fixed') { if (!entry.components.includes(owner)) miss(h.name, path, 'nesting', `one of ${entry.components.join(', ')}`, `host instance of ${owner}`); }
          else if (entry?.kind === 'instance' && owner.startsWith(`${entry.component}/`)) {
            // A standalone-component nest (#2343 PR 4): the model names the def; this member's component is
            // `<def>/<value>`, the variant moved by `when` at this member's own coordinate.
            const coord = Object.fromEntries(String(h.name).split(', ').map((kv) => kv.split('=')));
            const v: Record<string, string> = { ...entry.variant };
            for (const [axis, byValue] of Object.entries(entry.when ?? {})) if (byValue[coord[axis]]) Object.assign(v, byValue[coord[axis]]);
            // A joint `where` rule (#2343 PR 5) moves it by the member's whole coordinate, after `when`.
            for (const w of entry.where ?? []) if (Object.entries(w.when).every(([a, x]) => coord[a] === x)) Object.assign(v, w.set);
            const want = `${entry.component}/${Object.values(v)[0]}`;
            if (Object.keys(v).length !== 1 || owner !== want) miss(h.name, path, 'nesting', `an instance of ${want}`, `host instance of ${owner}`);
          }
          else if (entry?.kind !== 'instance' || entry.component !== owner) miss(h.name, path, 'nesting', `an instance of ${owner}`, entry ? JSON.stringify(entry) : 'ABSENT from the model');
          else {
            if (!!n.isExposedInstance !== entry.exposes.length > 0) miss(h.name, path, 'exposes', JSON.stringify(entry.exposes), `host isExposedInstance=${String(n.isExposedInstance)}`);
            // The fixed variant: the host's main component is named by its variant coordinate. Every axis it pins
            // that the nest neither follows nor exposes is the nest's fixed variant, and must be the model's.
            if (main?.parent?.type === 'COMPONENT_SET') {
              const pinned = Object.fromEntries(String(main.name).split(', ').filter(Boolean).map((seg) => seg.split('=') as [string, string]));
              const fixedOf = (rec: Record<string, string>) => Object.entries(rec).filter(([k]) => ![...entry.follows, ...entry.exposes].some((a) => a === k || a.toLowerCase() === k.toLowerCase())).map(([k, v]) => `${k.toLowerCase()}=${String(v).toLowerCase()}`).sort().join(', ');
              // A `when` rule moves it with the member's own value on another axis (Counter's ghost nests round).
              const expect: Record<string, string> = { ...entry.variant };
              for (const [axis, byValue] of Object.entries(entry.when ?? {})) Object.assign(expect, byValue[h.coord[axis]] ?? {});
              for (const w of entry.where ?? []) if (Object.entries(w.when).every(([a, x]) => h.coord[a] === x)) Object.assign(expect, w.set);
              facts.variants++;
              if (fixedOf(pinned) !== fixedOf(expect)) miss(h.name, path, 'variant', `{${fixedOf(expect)}}`, `host instance of ${String(main.name)}`);
            }
          }
        }
      }
    }
  }
  for (const p of spec.anatomy) if ((holding.get(p.part) ?? 0) !== p.members) miss('(set)', p.part, 'part', `held by ${p.members} member(s)`, `held by ${holding.get(p.part) ?? 0}`);
  if (spec.members !== hosts.length) miss('(set)', '', 'members', String(spec.members), String(hosts.length));
  // The set's component properties, by stem and type.
  const defs = ((set as { componentPropertyDefinitions?: Record<string, { type?: string }> } | undefined)?.componentPropertyDefinitions) ?? {};
  for (const [k, d] of Object.entries(defs)) {
    if (d.type === 'VARIANT') continue;
    facts.properties++;
    if (!spec.properties.some((p) => p.name === k.split('#')[0] && p.type === d.type)) miss('(set)', '', 'property', `${k.split('#')[0]} (${String(d.type)})`, 'ABSENT from the model');
  }
  for (const p of spec.properties) if (!Object.entries(defs).some(([k, d]) => k.split('#')[0] === p.name && d.type === p.type)) miss('(set)', '', 'property', `${p.name} (${p.type})`, 'ABSENT from the host');

  // ── CLAIMED: model → host ──
  const claim = <R extends { where: Record<string, string>; parts: { part: string }[] }>(rows: R[], each: (h: Host, n: HostNode, part: R['parts'][number]) => void) => {
    for (const row of rows) for (const part of row.parts) {
      const hs = hosts.filter((h) => covers(row.where, h.coord) && h.nodes.has(part.part));
      if (!hs.length) miss(JSON.stringify(row.where), part.part, 'row', 'held by a member it covers', 'NO MEMBER');
      for (const h of hs) each(h, h.nodes.get(part.part)!, part);
    }
  };
  claim(spec.redlines, (h, n, part) => {
    const bv = (n.boundVariables ?? {}) as Record<string, { id?: unknown }>;
    for (const [prop, v] of Object.entries(part.values) as [string, { token?: string; px?: number }][]) {
      facts.claimed++;
      const key = Object.entries(HOST_GEOMETRY).find(([, p]) => p === prop)?.[0] ?? prop;
      if (v.token !== undefined) {
        const id = bv[key]?.id;
        if (typeof id !== 'string' || !varIs(ports.varName(id), v.token)) miss(h.name, part.part, prop, v.token, typeof id === 'string' ? `host binds ${ports.varName(id)}` : 'UNBOUND on the host');
      } else {
        const hostKey = prop === 'buildWidth' ? 'width' : prop === 'buildHeight' ? 'height' : key;
        if (n[hostKey] !== v.px) miss(h.name, part.part, prop, `${v.px}px`, `host ${hostKey} ${String(n[hostKey])}`);
      }
    }
  });
  claim(spec.type, (h, n, part) => {
    facts.claimed++;
    const host = typeof n.textStyleId === 'string' ? ports.styleName(n.textStyleId) : null;
    if (host !== figmaTextStyleName(part.textStyle)) miss(h.name, part.part, 'textStyle', part.textStyle, `host applies ${host}`);
  });
  claim(spec.colors, (h, n, part) => {
    const want = part as { fill?: string; stroke?: string; ink?: string; icon?: string; gradient?: string[] };
    for (const [k, t] of [['fill', want.fill], ['ink', want.ink], ['stroke', want.stroke]] as const) {
      if (!t) continue;
      facts.claimed++;
      const host = paintVar(k === 'stroke' ? n.strokes : n.fills);
      if (!varIs(host, t)) miss(h.name, part.part, k, t, `host ${k === 'stroke' ? 'strokes' : 'fills'} ${host}`);
    }
    // A drawn glyph's fill is on the geometry the importer made inside it; an instance's is on the VECTORs inside
    // the instance, read through its own `findAll` (header).
    if (want.icon) {
      facts.claimed++;
      const drawn = (x: HostNode): HostNode[] => ((Array.isArray(x.children) ? x.children : []) as HostNode[]).flatMap((c) => (DRAWN.has(String(c.type)) ? [c] : drawn(c)));
      const host = String(n.type) === 'INSTANCE' ? instanceInk(n) : paintVar(n.fills) ?? drawn(n).map((d) => paintVar(d.fills)).find((v) => v !== null) ?? null;
      if (!varIs(host, want.icon)) miss(h.name, part.part, 'icon', want.icon, `host fills ${host}`);
    }
    if (want.gradient) {
      facts.claimed++;
      const stops = Array.isArray(n.fills) ? ((n.fills[0] as { gradientStops?: { boundVariables?: { color?: { id?: unknown } } }[] }).gradientStops ?? []) : [];
      const host = stops.map((g) => (typeof g.boundVariables?.color?.id === 'string' ? ports.varName(g.boundVariables.color.id) : null));
      if (host.length !== want.gradient.length || want.gradient.some((t, i) => !varIs(host[i], t))) miss(h.name, part.part, 'gradient', JSON.stringify(want.gradient), `host stops ${JSON.stringify(host)}`);
    }
  });
  // Every nest the model names is an instance (or a native slot) on every member that holds its path.
  for (const nest of spec.nesting) for (const h of hosts) {
    const n = h.nodes.get(nest.part);
    if (!n) continue;
    facts.claimed++;
    const want = nest.kind === 'slot' ? 'SLOT' : 'INSTANCE';
    if (String(n.type) !== want) miss(h.name, nest.part, 'nesting', `${nest.kind} (${want})`, `host ${String(n.type)}`);
  }
  return { findings, facts };
};

// ---- THE ROUND TRIP, over every def in the corpus ---------------------------------------------
ok(PROJECTED.length + CODE_ONLY.length === componentDefs.length && PROJECTED.length > 0,
  `the corpus split is total over componentDefs — ${PROJECTED.length} projected, ${CODE_ONLY.length} code-only`);
console.log(`\n  NOT round-tripped (no figmaProperties — the projection is opt-in): ${CODE_ONLY.map((d) => d.id).join(', ') || 'none'}`);

console.log(`\nround-tripping ${PROJECTED.length} projected defs…\n`);
const inventory: { def: string; divergences: Divergence[]; members: number; plans: number }[] = [];
/** Every page a def was built on, read after the corpus for a spec panel the build must never draw (Q2830.3 A). */
const builtPages: Page[] = [];
// …plus every def the `solid-tint` lever MATERIALIZES differently (#1614): its outline/text hover binds the
// tinted-wash variable (`interactive.<c>.subtle-fill.<state>`, #1646) where the default binds the neutral
// overlay, so these rows are the ones that read a wash binding back off the host.
const TINTED = PROJECTED.flatMap((d) => { const m = applyOutlineInteraction(d, 'solid-tint'); return m === d ? [] : [{ ...m, id: `${d.id}@solid-tint` }]; });
// …and every def the BUTTON levers materialize (#1667), against nb's heights: the derived floor (`minWidth`,
// per size), "Locked to edges" (the pinned icons' `pin` — ABSOLUTE, constrained MIN/MAX, at the inset — and
// the root's reserved `paddingPx`) and "One step smaller". No default def carries the edges fields, so without
// these rows their predicates compare nothing.
const nbPx = sizeRefPx(nbTheme().dims.sizes);
const BUTTON_LAID = PROJECTED.flatMap((d) => ([
  ['edges', { ...DEFAULT_BUTTON_LAYOUT, icons: 'edges' }],
  ['smaller', { ...DEFAULT_BUTTON_LAYOUT, content: 'smaller' }],
] as const).flatMap(([tag, layout]) => { const m = applyButtonLayout(d, layout, nbPx); return m === d ? [] : [{ ...m, id: `${d.id}@${tag}` }]; }));
// …and one CONSTRAINED native slot (#2646). No committed def constrains a slot yet (Accordion's panel is open, a DRAFT
// owner item), so without this row `slotSettings` and `slotPreferred` compare nothing. Test-only, as
// `test-native-slots.ts` builds it: Tag with its dismiss cell a slot holding 1 to 2 children, preferring Badge, which
// the file holds as a set.
const tagDef = PROJECTED.find((d) => d.id === 'tag')!;
const SLOT_CONSTRAINED = [{ ...tagDef, id: 'tag@slot-constraints', anatomy: { ...tagDef.anatomy!, parts: { ...tagDef.anatomy!.parts,
  dismiss: { ...tagDef.anatomy!.parts.dismiss, contentSlot: true as const, slotSettings: { minChildren: 1, maxChildren: 2, allowPreferredValuesOnly: true }, preferred: ['badge'] } } } }];
const SLOT_FILE: Partial<ShimOpts> = { fileNodes: [{ name: 'badge', type: 'COMPONENT_SET', variants: ['tone=neutral'] }] };
// …and one SWAP override (#2645). No committed def swaps a nested glyph yet (Dialog's close button is an open PR), so
// without this row the INSTANCE_SWAP half of `nestOverrides` compares nothing. Test-only: List with its first item's
// icon swapped to `close` — List.Item's own `swap icon` property, set to the icon set's component, built first. The
// glyph must NOT be List.Item's `swapDefault` (`check`): the writer skips a value the instance already holds, so a swap
// to the default writes nothing and the read-back reads the default back as a pass (docs/34). Asserted below.
const listDef = PROJECTED.find((d) => d.id === 'list')!;
const SWAP_GLYPH = 'close';
const SWAP_OVERRIDE = [{ ...listDef, id: 'list@swap-override', anatomy: { ...listDef.anatomy!, parts: { ...listDef.anatomy!.parts,
  item1: { ...listDef.anatomy!.parts.item1, overrides: { swaps: { icon: SWAP_GLYPH } } } } } }];
for (const def of [...PROJECTED, ...TINTED, ...BUTTON_LAID, ...SLOT_CONSTRAINED, ...SWAP_OVERRIDE]) {
  try {
    // A slot that prefers a def it also nests (#2649's `items`, preferring the item it holds) resolves that def by key,
    // and the shim keys its components only with `identities` on, as a real file always does.
    const prefersNest = Object.values(def.anatomy?.parts ?? {}).some((p) => (p.preferred ?? []).length > 0);
    const r = await roundTrip(def, SLOT_CONSTRAINED.includes(def as (typeof SLOT_CONSTRAINED)[number]) ? SLOT_FILE : prefersNest ? { identities: true } : {});
    inventory.push({ def: def.id, divergences: r.divergences, members: r.members, plans: r.plans.length });
    builtPages.push(r.page);
    // #2830 — the spec model of the def AS BUILT HERE (no brand materialization, as `roundTrip` builds it).
    specChecks.push({ def: def.id, ...specReadback(componentSpec(def, { def }), r.hostMembers, r.set, r.ports) });
  } catch (e) {
    inventory.push({ def: def.id, divergences: [{ member: '(build)', path: '', field: 'THREW', expected: 'a built set', actual: (e as Error).message }], members: 0, plans: 0 });
  }
}
// Q2830.3 A: specs are drawn on request only, so building every def leaves no node tagged as a spec panel, anywhere.
{
  type Walked = { name?: unknown; children?: readonly Walked[] };
  const tagged: string[] = [];
  let seen = 0;
  const walk = (n: Walked, path: string): void => { seen++; if (readSpecTag(n)) tagged.push(`${path}/${String(n.name)}`); for (const c of n.children ?? []) walk(c, `${path}/${String(n.name)}`); };
  for (const [i, pg] of builtPages.entries()) for (const c of pg.children as readonly Walked[]) walk(c, `page ${i + 1}`);
  ok(builtPages.length === inventory.filter((i) => i.members > 0).length && seen > 1000 && !tagged.length,
    `specs/never on build: building ${builtPages.length} defs draws no spec panel (${seen} nodes walked${tagged.length ? `; tagged: ${tagged.slice(0, 3).join(', ')}` : ''})`);
}
const washPaints = TINTED.flatMap((d) => figmaAnatomySet(d, { swapTarget: SWAP_TARGET })).reduce((n, p) => n + planPaintVars(p.root).filter((v) => v.includes('/subtle-fill/')).length, 0);
ok(TINTED.length > 0 && washPaints > 0,
  `#1646 the solid-tint materializations round-trip too — ${TINTED.length} def(s), ${washPaints} tinted-wash paint bindings among their plans`);

ok(BUTTON_LAID.length === 6 && (EXERCISED.pin ?? 0) > 0 && (EXERCISED.paddingPx ?? 0) > 0 && (EXERCISED.minWidth ?? 0) > 0,
  `#1667 the button-lever materializations round-trip too — ${BUTTON_LAID.length} def(s); ${EXERCISED.pin ?? 0} pinned icons (ABSOLUTE + edge constraint + inset), ${EXERCISED.paddingPx ?? 0} reserved paddings, ${EXERCISED.minWidth ?? 0} floors read back off the host`);

{
  const swapPlans = SWAP_OVERRIDE.flatMap((d) => figmaAnatomySet(d, { swapTarget: SWAP_TARGET }));
  const swapNodes = swapPlans.flatMap((p) => JSON.stringify(p.root).match(/"type":"INSTANCE_SWAP","value":"icon\/close"/g) ?? []).length;
  // THE PREMISE (#2645 review): the swap moves the instance OFF its default, so the write is exercised, not skipped.
  const itemDefault = (PROJECTED.find((d) => d.id === 'list-item')!.anatomy!.parts.icon as { swapDefault?: string }).swapDefault;
  ok(typeof itemDefault === 'string' && itemDefault !== SWAP_GLYPH,
    `#2645 premise: the swap row's glyph (${SWAP_GLYPH}) is not List.Item's swapDefault (${itemDefault}), so the swap is written, not skipped`);
  const listRows = inventory.filter((i) => i.def === 'list' || i.def === 'list@swap-override');
  // THE SWAP TARGET IS A DEPENDENCY (#2645), asserted on the list itself: the round-trip cannot see it, because the icon
  // set is built anyway as a dependency of List.Item. List's own plans reach icon/close through the override alone.
  const targets = planTargets(swapPlans);
  ok(JSON.stringify(targets) === '["list-item","icon/close"]', `#2645 build-deps: a swap override's component is a build target of the def that declares it (${JSON.stringify(targets)})`);
  ok((EXERCISED.nestOverrides ?? 0) > 0 && swapNodes > 0 && listRows.length === 2 && listRows.every((i) => i.members > 0),
    `#2645 per-instance overrides round-trip: ${EXERCISED.nestOverrides ?? 0} nested instance(s) read their overrides back off their own componentProperties, ${swapNodes} of them a swap to icon/close (rows: ${listRows.map((i) => `${i.def} ${i.members} members, ${i.divergences.length} divergences`).join('; ')})`);
}

// THE PREDICATE SPEAKS (#2645): an instance holding its nested default where the plan names an override is reported,
// by field — a TEXT at its default, a swap at another component, and an instance with no properties at all. Host
// nodes built here by hand, so the predicate is tested against answers known in advance (docs/34).
{
  const plan = figmaAnatomySet(PROJECTED.find((d) => d.id === 'list')!, { swapTarget: SWAP_TARGET })[0];
  const item = (props: unknown): HostNode => ({ name: 'item2', type: 'INSTANCE', children: [], componentProperties: props });
  const one = (props: unknown): string | null => {
    // List's items sit in its `items` slot (#2649), so item2 is found at any depth.
    type P = { name: string; children: P[]; nestOverrides?: unknown };
    const find = (n: P): P | undefined => (n.name === 'item2' ? n : n.children.map(find).find(Boolean));
    const want = find(plan.root as unknown as P)!.nestOverrides;
    const d = diffAnatomy([{ ...plan, root: { name: 'item2', type: 'NESTED_INSTANCE', bound: {}, children: [], nestOverrides: want } as never }], [item(props)], () => 'item2', { varName: () => null, styleName: () => null })
      .find((x) => x.field === 'nestOverrides');
    return d ? d.actual : null;
  };
  ok(one({ 'number#1:1': { type: 'TEXT', value: '1.' } }) === 'number=1.', `#2645 read-back: an item at its default "1." where the plan says "2." fails as nestOverrides (${one({ 'number#1:1': { type: 'TEXT', value: '1.' } })})`);
  ok(one({ 'number#1:1': { type: 'TEXT', value: '2.' } }) === null, '#2645 read-back: the same item at "2." passes');
  ok(/holds no component properties/.test(one(undefined) ?? ''), `#2645 read-back: an instance with no properties fails (${one(undefined)})`);
}

ok((EXERCISED.slotSettings ?? 0) > 0 && (EXERCISED.slotPreferred ?? 0) > 0,
  `#2646 a constrained native slot round-trips: ${EXERCISED.slotSettings ?? 0} slot(s) read their constraints, ${EXERCISED.slotPreferred ?? 0} their preferred sets, back off the set's SLOT property`);

// ---- THE REPORT --------------------------------------------------------------------------------
const clean = inventory.filter((i) => !i.divergences.length);
const dirty = inventory.filter((i) => i.divergences.length);

console.log(`  ${'def'.padEnd(20)} ${'members'.padStart(7)} ${'plans'.padStart(6)}  divergences`);
for (const i of inventory) {
  console.log(`  ${i.def.padEnd(20)} ${String(i.members).padStart(7)} ${String(i.plans).padStart(6)}  ${i.divergences.length || '—'}`);
}

if (dirty.length) {
  console.log(`\n── DIVERGENCE INVENTORY — ${dirty.reduce((n, d) => n + d.divergences.length, 0)} across ${dirty.length} def(s) ──\n`);
  for (const i of dirty) {
    // Grouped by FIELD rather than listed per node: a field the executor never writes diverges on
    // every node that declares it, so a flat list buries one cause under hundreds of consequences.
    const byField = new Map<string, Divergence[]>();
    for (const d of i.divergences) byField.set(d.field, [...(byField.get(d.field) ?? []), d]);
    console.log(`  ${i.def} — ${i.divergences.length} divergence(s) across ${byField.size} field(s)`);
    for (const [field, ds] of [...byField].sort((a, b) => b[1].length - a[1].length)) {
      const ex = ds[0];
      console.log(`    ${field.padEnd(24)} ${String(ds.length).padStart(4)}×  e.g. ${ex.member} :: ${ex.path}`);
      console.log(`    ${' '.repeat(24)}        plan: ${ex.expected}`);
      console.log(`    ${' '.repeat(24)}        host: ${ex.actual}`);
    }
    console.log('');
  }
}

// ---- THE VERDICT ------------------------------------------------------------------------------
// The corpus must be non-empty, or "0 divergences" is silence rather than evidence.
// WHICH PREDICATES ACTUALLY COMPARED SOMETHING. Printed unconditionally, because a predicate that
// walked zero nodes is indistinguishable from a passing one in the verdict line above.
{
  const cov = fieldCoverage();
  const idle = cov.checked.filter((f) => !EXERCISED[f]);
  console.log('\n  nodes compared per predicate:');
  for (const f of cov.checked) console.log(`    ${f.padEnd(24)} ${String(EXERCISED[f] ?? 0).padStart(6)}`);
  if (idle.length) {
    console.log(`\n  ⚠ ${idle.length} predicate(s) compared NOTHING — no def in the corpus declares the field: ${idle.join(', ')}`);
    console.log('    Not a pass. The executor write behind such a field is out of this arm\'s reach until a def uses it.');
  }
}

ok(inventory.length > 0 && inventory.some((i) => i.plans > 0), `the corpus produced plans to compare (${inventory.reduce((n, i) => n + i.plans, 0)} plans, ${inventory.reduce((n, i) => n + i.members, 0)} members)`);

// ── SPEC READ-BACK VERDICT (#2830) ───────────────────────────────────────────────────────────────────────────────
{
  const total = (k: string) => specChecks.reduce((n, c) => n + (c.facts[k] ?? 0), 0);
  console.log(`\n  spec read-back (#2830): ${specChecks.length} def(s); host facts read — ${['parts', 'redlines', 'type', 'colors', 'icons', 'nests', 'variants', 'properties'].map((k) => `${total(k)} ${k}`).join(', ')}; ${total('claimed')} model claims checked`);
  // SCOPE FLOOR: every block the model carries must have been compared against something, or a zero reads as a pass.
  for (const k of ['parts', 'redlines', 'type', 'colors', 'icons', 'nests', 'variants', 'properties', 'claimed']) ok(total(k) > 0, `spec read-back: the ${k} block compared ${total(k)} host fact(s) (scope floor)`);
  ok(specChecks.length === inventory.length, `spec read-back: every round-tripped def was read back against its spec model (${specChecks.length}/${inventory.length})`);
  for (const c of specChecks) {
    if (!c.findings.length) continue;
    const head = c.findings.slice(0, 6).map((f) => `${f.member} · ${f.path} · ${f.property}: model ${f.expected}, ${f.actual}`).join('\n      ');
    ok(false, `spec read-back: ${c.def} — ${c.findings.length} disagreement(s) between the spec model and the built set\n      ${head}`);
  }
  ok(specChecks.every((c) => !c.findings.length), `spec read-back: every spec model holds what its built set holds, both directions${specChecks.some((c) => c.findings.length) ? ` — ${specChecks.filter((c) => c.findings.length).map((c) => `${c.def} (${c.findings.length})`).join(', ')}` : ''}`);

  // THE PREDICATE SPEAKS: the reader fails BY NAME on a model with one part, one padding side and one stroke dropped —
  // built by hand from Button's real model, so the answer is known in advance (docs/34).
  const btn = PROJECTED.find((d) => d.id === 'button')!;
  const r = await roundTrip(btn);
  const spec = componentSpec(btn, { def: btn });
  const dropped: ComponentSpec = {
    ...spec,
    anatomy: spec.anatomy.filter((p) => p.part !== 'container/label'),
    redlines: spec.redlines.map((row) => ({ ...row, parts: row.parts.map((p) => (p.part === 'container' ? { ...p, values: Object.fromEntries(Object.entries(p.values).filter(([k]) => k !== 'paddingLeft')) } : p)) })),
    colors: spec.colors.map((row) => ({ ...row, parts: row.parts.map((p) => (p.part === 'container' ? { ...p, stroke: undefined } : p.part === 'container/leadingVisual' ? { ...p, icon: undefined } : p)) })),
  };
  const got = specReadback(dropped, r.hostMembers, r.set, r.ports).findings;
  ok(specReadback(spec, r.hostMembers, r.set, r.ports).findings.length === 0, 'spec read-back premise: Button\'s own model reads back clean');
  for (const [path, property] of [['container/label', 'part'], ['container', 'paddingLeft'], ['container', 'stroke'], ['container/leadingVisual', 'icon']] as const)
    ok(got.some((f) => f.path === path && f.property === property), `spec read-back speaks: a model that drops ${path} · ${property} fails by name (${got.filter((f) => f.path === path && f.property === property).length} member(s))`);
  // …and on a nest's fixed variant: Counter's model with its `when` rules dropped claims flush on a ghost Counter.
  const counter = PROJECTED.find((d) => d.id === 'counter')!;
  const rc = await roundTrip(counter);
  const cs = componentSpec(counter, { def: counter });
  const noWhen: ComponentSpec = { ...cs, nesting: cs.nesting.map((n) => (n.kind === 'instance' ? { ...n, when: undefined } : n)) };
  ok(specReadback(cs, rc.hostMembers, rc.set, rc.ports).findings.length === 0, 'spec read-back premise: Counter\'s own model reads back clean');
  const gotC = specReadback(noWhen, rc.hostMembers, rc.set, rc.ports).findings.filter((f) => f.path === 'container/control/decrement' && f.property === 'variant');
  ok(gotC.length > 0, `spec read-back speaks: a model that drops a nest's variant rule fails by name (container/control/decrement · variant, ${gotC.length} member(s))`);

  // THE TWO MATERIALIZATIONS AGREE: the model's `specMaterialize` restates the plugin's `materializeForBrand(def, null)`,
  // which is what Apply builds for a file with no brand settings; a lever in one and not the other fails here by def.
  const drift = componentDefs.filter((d) => JSON.stringify(specMaterialize(d)) !== JSON.stringify(materializeForBrand(d, null))).map((d) => d.id);
  ok(drift.length === 0, `spec read-back: specMaterialize matches materializeForBrand(def, null) on all ${componentDefs.length} defs${drift.length ? ` — differs on ${drift.join(', ')}` : ''}`);
}

if (INVENTORY) {
  console.log(`\n📋 INVENTORY: ${clean.length}/${inventory.length} defs round-trip clean; ${dirty.length} diverge.`);
  console.log('   Inventory mode exits 0 by design — the gate mode below is what fails.');
  process.exit(failed ? 1 : 0);
}

ok(dirty.length === 0, `every def round-trips: what the plan declares is what the host holds${dirty.length ? ` — ${dirty.map((d) => `${d.def} (${d.divergences.length})`).join(', ')}` : ''}`);

// ── ASPECT-LOCK READ-BACK (#1316) — THE INDEPENDENT ORACLE ─────────────────────────────────────
//
// The generic diff above already checks each ratio member's built `targetAspectRatio` against the PLAN's
// ratio (`anatomy-readback.ts`'s `aspectRatio` predicate) — plan-as-oracle, which catches an executor
// that fails to lock or locks a wrong number. What it CANNOT catch is a wrong plan that round-trips
// perfectly: flip a ratio in the def and the plan follows, so plan-vs-built still agrees. This block
// closes that with an oracle authored HERE and NOWHERE ELSE — the owner-decided ratio contract — so a
// ratio flipped, added or dropped in the def diverges from this and fails BY NAME (docs/34).
//
// This is the "aspect-lock read-back" the verify checklist places in test:roundtrip. It builds the def
// through the shared shim exactly as the corpus loop does, then reads each member's frame back.
{
  // #2345 added the portrait 2:3, 3:4, 4:5 and the landscape 3:2 (owner direction 2026-10-07).
  const CONTRACT: Record<string, number> = { '2:3': 2 / 3, '3:4': 3 / 4, '4:5': 4 / 5, '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9 };
  const def = componentDefs.find((d) => d.id === 'image-placeholder');
  ok(!!def, 'aspect-lock: the image-placeholder def is registered and projects');
  if (def) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const byName = new Map(members.map((m) => [String(m.name ?? ''), m] as const));
    const seenRatios = new Set<string>();
    for (const plan of plans) {
      const ratio = plan.coord.ratio;
      if (ratio === undefined) { ok(false, 'aspect-lock: a member projected with no ratio coordinate'); continue; }
      seenRatios.add(ratio);
      const expected = CONTRACT[ratio];
      if (expected === undefined) {
        ok(false, `aspect-lock: member ratio=${ratio} is not an owner-decided ratio [${Object.keys(CONTRACT).join(', ')}] — a ratio was flipped or added in the def`);
        continue;
      }
      const m = byName.get(planComponentName(plan));
      // A `Vector` `{x, y}` on the host (#2295); its ratio is x / y.
      const v = m ? (m as { targetAspectRatio?: { x?: unknown; y?: unknown } | null }).targetAspectRatio : undefined;
      const got = v && typeof v.x === 'number' && typeof v.y === 'number' && v.y ? v.x / v.y : undefined;
      ok(got !== undefined && Math.abs(got - expected) < 1e-6,
        `aspect-lock: ratio=${ratio}'s built frame locks targetAspectRatio ≈ ${expected.toFixed(4)} (read ${got !== undefined ? got.toFixed(4) : JSON.stringify(v)})`);
    }
    // SCOPE FLOOR: every owner-decided ratio must be represented by a built member, so a def that DROPS
    // one fails here rather than the block quietly checking fewer frames.
    for (const ratio of Object.keys(CONTRACT))
      ok(seenRatios.has(ratio), `aspect-lock: a member for the owner-decided ratio ${ratio} was built (scope floor)`);
  }
}

// ── THE PAYMENT TILE, READ BACK (#2343 PR 4) — THE INDEPENDENT ORACLE FOR A SLOT'S LOCK ───────────
//
// The diff above holds the plan's promise for the Card number field's tile: the instance is locked. What the plan does
// not state is WHICH proportion, because it belongs to the component swapped in. This block authors it: the tile
// artboard is 8:5 (32×20, owner decisions Q720 A and Q780 A), so every member's built tile is an instance of the generic
// tile, locked at 1.6, its height bound to the icon rung of the member's size (20 / 20 / 24). Built the way the plugin
// builds it, the marks first, so the instance's main is the real mark. A mark artboard redrawn square, a lock taken from
// the slot instead of its main, or a height rung moved in the def each fail here by name.
{
  const TILE_RATIO = 32 / 20;
  const HEIGHT: Record<string, string> = { small: 'icon/size/sm', medium: 'icon/size/sm', large: 'icon/size/md' };
  const def = componentDefs.find((d) => d.id === 'card-number-field');
  ok(!!def, 'payment tile: the card-number-field def is registered and projects');
  if (def) {
    const r = await roundTrip(def);
    const find = (n: HostNode, name: string): HostNode | undefined => (n.name === name ? n : ((n.children as HostNode[] | undefined) ?? []).map((c) => find(c, name)).find(Boolean));
    const byName = new Map(r.hostMembers.map((m) => [String(m.name ?? ''), m] as const));
    const bad: string[] = [];
    for (const plan of r.plans) {
      const m = byName.get(planComponentName(plan));
      const tile = m ? find(m, 'cardMark') : undefined;
      const v = (tile as { targetAspectRatio?: { x?: unknown; y?: unknown } | null } | undefined)?.targetAspectRatio;
      const got = v && typeof v.x === 'number' && typeof v.y === 'number' && v.y ? v.x / v.y : undefined;
      const main = (tile as { mainComponent?: { name?: unknown } | null } | undefined)?.mainComponent;
      const h = r.ports.varName(String(((tile?.boundVariables as Record<string, { id?: unknown } | undefined> | undefined)?.height?.id) ?? ''));
      const want = HEIGHT[String(plan.size)];
      if (got === undefined || Math.abs(got - TILE_RATIO) > 1e-6 || !/^provider-logo\/[a-z]+\/generic$/.test(String(main?.name)) || !want || !String(h ?? '').endsWith(want))
        bad.push(`${planComponentName(plan)}: ratio ${got === undefined ? JSON.stringify(v) : got.toFixed(4)}, instance of ${String(main?.name)}, height ${String(h)}`);
    }
    ok(r.plans.length === 84 && bad.length === 0,
      `payment tile: on all ${r.plans.length} members the built tile is an instance of the generic tile, locked at 8:5 (1.6000), its height the icon rung of the member's size${bad.length ? ` — WRONG on ${bad.length}: ${bad.slice(0, 3).join(' | ')}` : ''}`);
  }
}

// ── #1514: THE COMPOSITE TEXT STYLE SURVIVES THE #865 DEFAULTS SEAM — HOST-TRUTH + INDEPENDENT ORACLE ──
//
// THE DEFECT (owner QA 2026-09-18): every projected component text node showed its family/size/style bound to
// variables but carried NO composite text style — loose variables, not "this text uses `label/md/emphasis`".
//
// THE FIRST DIAGNOSIS BLAMED THE CHARACTERS-BIND and was wrong (#1567). It held that binding a node to a
// set-level TEXT property reset it and dropped the `textStyleId`, so the fix re-asserted the style in the
// post-wire seam — inside `if (field === 'characters' && node)`. That was measured on the host (2026-09-22) and
// the bind detaches nothing. What detaches `textStyleId` is writing ANY of `paragraphSpacing`, `leadingTrim`,
// `fontSize`, `fontName`, `lineHeight`, `letterSpacing`, `textCase` — even when the value written EQUALS the
// node's current one. `claimDefaults` (#865, "AND IT HAS TO BE LAST") writes `paragraphSpacing` and
// `leadingTrim` unconditionally on every TEXT node, after the style is applied. That is the real detach.
//
// The wrong diagnosis was invisible here because a repair coupled to the characters-ref happens to cover every
// node in this corpus — every component text node IS bound. The host had a set where none were: `button-neutral`
// wired 0 references and carried 432/432 text nodes with no style, while `button` and `button-destructive` were
// perfect. Same def, same plan, opposite outcome — the asymmetry that named the coupling. So the fix now repairs
// at the SOURCE: `build` re-applies the style immediately after `claimDefaults` and reports a
// `textStyle -> DISCARDED` miss if it does not hold, for every text node, wired or not. The shim models the
// detaching setters (`component-shim.ts`, `mkNode`), so this block goes red without that re-apply.
//
// WHAT THE CORPUS LOOP CANNOT CATCH, and why this block exists (docs/34): that predicate is plan-as-oracle —
// it checks the built node's `textStyleId` against the PLAN's `textStyle`, so a def whose `type` key was flipped
// round-trips green (the plan follows the flip). This closes that with an oracle authored HERE and nowhere else:
// a literal per-coordinate table of the OWNER-DECIDED style each component text node must carry (button labels
// take the emphasis LABEL style at their size rung; form controls and messages take the BODY / CAPTION reading
// styles). A `type` flipped in a def diverges from THIS and fails by name. The INDEPENDENT floor is the emitted
// style set (`buildFigmaTextStyles(nbTheme())` — the emitter, a code path separate from the projection, the same
// independence #1429 uses with `buildFigmaColor`): every style the contract names must really be emitted, so a
// green is not "the def and the oracle agree on a name nothing emits".
{
  // THE OWNER-DECIDED CONTRACT — a LITERAL table keyed by coordinate, never `figmaTextStyleName(def.type)`.
  // A field's text layer depends on the STATE since Option C (owner decision, 2026-09-26): the value layer at
  // filled / read-only, the placeholder layer everywhere else. Typed from that rule, not read off a def.
  // The field family shows the value at filled, read-only and, since #2318, the focused field that holds one.
  const fieldLayer = (c: Record<string, string | undefined>): string[] => [c.state === 'filled' || c.state === 'focus-visible-filled' || c.state === 'read-only' ? 'value' : 'placeholder'];
  const STYLE_CONTRACT: Record<string, { parts: string[] | ((c: Record<string, string | undefined>) => string[]); style: (c: Record<string, string | undefined>) => string }> = {
    // #2324: a text button's label is its underlined twin, at every state.
    button:          { parts: ['label'], style: (c) => `${({ small: 'label/sm/emphasis', medium: 'label/md/emphasis', large: 'label/lg/emphasis' } as Record<string, string>)[c.size!]}${c.appearance === 'text' ? '-link' : ''}` },
    'field-message': { parts: ['label'],  style: () => 'caption/md/default' },
    // #2266: the input type scales with the field's size, one body step above its label.
    'text-field':    { parts: fieldLayer, style: (c) => ({ small: 'body/sm/default', medium: 'body/md/default', large: 'body/lg/default' } as Record<string, string>)[c.size!] },
    // #2317: the Password field's value and placeholder are TextField's, from the shared field factory.
    // #2888: the Search field's value and placeholder are TextField's, from the shared field factory.
    'search-field': { parts: fieldLayer, style: (c) => ({ small: 'body/sm/default', medium: 'body/md/default', large: 'body/lg/default' } as Record<string, string>)[c.size!] },
    'password-field': { parts: fieldLayer, style: (c) => ({ small: 'body/sm/default', medium: 'body/md/default', large: 'body/lg/default' } as Record<string, string>)[c.size!] },
    textarea:        { parts: fieldLayer, style: (c) => ({ small: 'body/sm/default', medium: 'body/md/default', large: 'body/lg/default' } as Record<string, string>)[c.size!] },
    select:          { parts: fieldLayer, style: (c) => ({ small: 'body/sm/default', medium: 'body/md/default', large: 'body/lg/default' } as Record<string, string>)[c.size!] },
    'checkbox-row':  { parts: ['label'], style: (c) => ({ small: 'body/sm/default', medium: 'body/md/default', large: 'body/lg/default' } as Record<string, string>)[c.size!] },
    'radio-row':     { parts: ['label'], style: (c) => ({ small: 'body/sm/default', medium: 'body/md/default', large: 'body/lg/default' } as Record<string, string>)[c.size!] },
    // #2715: List.Item's text, and an ordered item's number, read in the body style of the item's size (body small,
    // medium or large, its brief's size prop).
    'list-item':     { parts: (c) => (c.type === 'ordered' ? ['number', 'label'] : ['label']), style: (c) => ({ small: 'body/sm/default', medium: 'body/md/default', large: 'body/lg/default' } as Record<string, string>)[c.size!] },
    'field-label':   { parts: ['label', 'indicator'], style: (c) => (({
      // #2266: re-laddered 12 / 14 / 16.
      'small/regular': 'body/xs/default', 'small/bold': 'body/xs/strong',
      'medium/regular': 'body/sm/default', 'medium/bold': 'body/sm/strong',
      'large/regular': 'body/md/default', 'large/bold': 'body/md/strong',
    } as Record<string, string>)[`${c.size}/${c.weight}`]) },
  };

  // THE INDEPENDENT ORACLE — the emitted style names, from the emitter and never from any plan.
  const emittedStyleNames = new Set(buildFigmaTextStyles(nbTheme()).styles.map((s) => s.name));
  ok(emittedStyleNames.size > 0, `#1514 the emitter produced composite text styles (independent-oracle floor: ${emittedStyleNames.size})`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
  const findByName = (n: any, name: string): any => (n?.name === name ? n : (n?.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));

  for (const [id, contract] of Object.entries(STYLE_CONTRACT)) {
    const def = componentDefs.find((d) => d.id === id);
    ok(!!def, `#1514: the ${id} def is registered and projects`);
    if (!def) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const texts = await (shim as unknown as { getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalTextStylesAsync();
    const styleById = new Map(texts.map((s) => [s.id, s.name] as const));
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const byName = new Map(members.map((m) => [String(m.name), m] as const));

    let checked = 0;
    for (const plan of plans) {
      // `size` is a top-level plan field, the other axes ride `coord` — the oracle keys off both.
      const axes = { size: (plan as { size?: string }).size, ...plan.coord } as Record<string, string | undefined>;
      const want = contract.style(axes);
      ok(!!want, `#1514: ${id} member ${JSON.stringify(plan.coord)} maps to an owner-decided style (oracle covers this coordinate)`);
      if (!want) continue;
      // INDEPENDENT FLOOR: the style the contract names is really emitted — not merely a name the def echoes.
      ok(emittedStyleNames.has(want), `#1514: ${id}'s owner-decided style '${want}' is in the emitted style set (independent oracle)`);
      const member = byName.get(planComponentName(plan));
      for (const part of typeof contract.parts === 'function' ? contract.parts(axes) : contract.parts) {
        const node = member ? findByName(member, part) : undefined;
        // SCOPE FLOOR: the text node was actually built into this member — otherwise "it carries the style"
        // is a statement about a node that does not exist.
        ok(!!node, `#1514: ${id}/${planComponentName(plan)} built the '${part}' text node (scope floor)`);
        if (!node) continue;
        const gotId = (node as { textStyleId?: unknown }).textStyleId;
        const gotName = typeof gotId === 'string' && gotId ? (styleById.get(gotId) ?? `id ${gotId} resolves to no style`) : 'NO TEXT STYLE APPLIED';
        ok(gotName === want,
          `#1514: ${id}/${planComponentName(plan)}/${part} carries the composite text style '${want}' after the #865 defaults seam (host holds '${gotName}')`);
        checked++;
      }
    }
    ok(checked > 0, `#1514: ${id} presented text nodes to check (scope floor: ${checked})`);
  }

  // #2715 — ACCORDION.INDICATOR, BUILT. The indicator is never placed on its own, so until now its only plugin test was
  // the page list. Built here by the real executor and read off the shim's nodes: twelve members, each holding one
  // icon instance, the glyph its brief names for its indicator and expansion (Q183: chevron down closed and up open,
  // plus closed and minus open), in a frame bound to the icon size of its rung. Typed here, never read off the plan.
  {
    const def = componentDefs.find((d) => d.id === '_accordion-indicator')!;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    const r = await applyComponentPlan(plans, shim as any, {});
    const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
    // The host's names carry the collection first (`<collection>/icon/size/xs`); the binding is read below it.
    const varById = new Map(vars.map((v) => [v.id, v.name.replace(/^[^/]+\//, '')] as const));
    const GLYPH: Record<string, string> = { 'chevron/collapsed': 'icon/chevron-down', 'chevron/expanded': 'icon/chevron-up', 'plus-minus/collapsed': 'icon/plus', 'plus-minus/expanded': 'icon/minus' };
    const ICON: Record<string, string> = { small: 'icon/size/xs', medium: 'icon/size/sm', large: 'icon/size/md' };
    const members = (page.children[0]?.children ?? []) as unknown as (HostNode & { boundVariables?: Record<string, { id?: string }>; children?: unknown[] })[];
    const off: string[] = [];
    for (const indicator of ['chevron', 'plus-minus']) for (const expansion of ['collapsed', 'expanded']) for (const size of ['small', 'medium', 'large']) {
      const m = members.find((x) => String(x.name).split(', ').sort().join(', ') === [`expansion=${expansion}`, `indicator=${indicator}`, `size=${size}`].join(', '));
      const kids = (m?.children ?? []) as { type?: string; mainComponent?: { name?: string } }[];
      const got = { kids: kids.length, type: kids[0]?.type, glyph: kids[0]?.mainComponent?.name, width: varById.get(String(m?.boundVariables?.width?.id)), height: varById.get(String(m?.boundVariables?.height?.id)) };
      const want = { kids: 1, type: 'INSTANCE', glyph: GLYPH[`${indicator}/${expansion}`], width: ICON[size], height: ICON[size] };
      if (JSON.stringify(got) !== JSON.stringify(want)) off.push(`${indicator}/${expansion}/${size}: ${m ? JSON.stringify(got) : 'no member'} (want ${JSON.stringify(want)})`);
    }
    ok(r.misses.length === 0 && members.length === 12 && off.length === 0,
      `#2715 _accordion-indicator build: 12 members built with no misses, each one icon instance (chevron-down / chevron-up, plus / minus by expansion) in a frame bound to icon/size/xs, sm or md by size (${members.length} members, ${r.misses.length} misses, ${off.length} off — ${off[0] ?? r.misses[0] ?? 'none'})`);
  }

  // #2878 — THE ACCORDION'S `indicator` REACHES ITS NESTED INDICATOR. Built the way the plugin builds it: the nested
  // sets first, into the same file, then the Accordion, so each header instance is an instance of a REAL indicator
  // member. Read off the host, per Accordion member: the one indicator instance its icon position shows, which member
  // of `_accordion-indicator` it is, and the glyph that member draws. EXPECTED is the Accordion member's own name
  // (`indicator=…`, `expansion=…`, `size=…`) and the glyph table typed here; a host axis that stops reaching the nested
  // instance (the `follow` dropped) leaves every plus-minus member on a chevron, and this arm fails by name.
  {
    const def = componentDefs.find((d) => d.id === 'accordion')!;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor([...plans, ...ALL_PLANS()]), comps: [SWAP_TARGET], liveRoot: true, page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await prebuildDependencies(def, { defs: componentDefs, project: (d) => figmaAnatomySet(d, { swapTarget: SWAP_TARGET }), host: shim as any, build: (d) => applyComponentPlan(figmaAnatomySet(d, { swapTarget: SWAP_TARGET }), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents }) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    const r = await applyComponentPlan(plans, shim as any, {});
    const set = page.children.find((c) => c.type === 'COMPONENT_SET' && c.name === 'accordion');
    const members = (set?.children ?? []) as unknown as HostNode[];
    const indicatorSet = page.children.find((c) => c.type === 'COMPONENT_SET' && c.name === '_accordion-indicator');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a walk over host nodes
    const findByName = (n: any, name: string): any => (n?.name === name ? n : (n?.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));
    const GLYPH: Record<string, string> = { 'chevron/collapsed': 'icon/chevron-down', 'chevron/expanded': 'icon/chevron-up', 'plus-minus/collapsed': 'icon/plus', 'plus-minus/expanded': 'icon/minus' };
    const seg = (name: string): Record<string, string> => Object.fromEntries(name.split(', ').map((s) => s.split('=') as [string, string]));
    const off: string[] = [];
    const seen = new Set<string>();
    for (const m of members) {
      const c = seg(String(m.name));
      const inst = findByName(m, c['icon position'] === 'trailing' ? 'trailingGlyph' : 'leadingGlyph');
      const main = inst?.mainComponent as { name?: string; parent?: { name?: string } | null } | null | undefined;
      const nested = seg(String(main?.name ?? ''));
      // The glyph that member draws, off the indicator set built into this file (the instance's main names its member).
      const drawn = (indicatorSet?.children ?? []).find((x) => x.name === main?.name) as { children?: { mainComponent?: { name?: string } }[] } | undefined;
      const got = { set: main?.parent?.name, indicator: nested.indicator, expansion: nested.expansion, size: nested.size, glyph: drawn?.children?.[0]?.mainComponent?.name };
      const want = { set: '_accordion-indicator', indicator: c.indicator, expansion: c.expansion, size: c.size, glyph: GLYPH[`${c.indicator}/${c.expansion}`] };
      seen.add(`${c.indicator}/${c.expansion}`);
      if (JSON.stringify(got) !== JSON.stringify(want)) off.push(`${String(m.name)}: ${JSON.stringify(got)} (want ${JSON.stringify(want)})`);
    }
    ok(r.misses.length === 0 && members.length === 48 && seen.size === 4 && off.length === 0,
      `#2878 accordion indicator: on all 48 members the header's nested _accordion-indicator is the member at the Accordion's own indicator, expansion and size, drawing chevron-down / chevron-up / plus / minus (${members.length} members, ${seen.size} of 4 indicator × expansion pairs, ${r.misses.length} misses, ${off.length} off — ${off[0] ?? r.misses[0] ?? 'none'})`);
  }

  // NON-VACUITY (docs/34) — the pre-fix state, reproduced explicitly: a built text node whose `textStyleId`
  // was detached (exactly what the shim's `paragraphSpacing`/`leadingTrim` setters model, and what shipped
  // before this fix) is reported by the SAME read-back, by name. Without this, a check that only ever sees the
  // applied style could be an always-pass.
  {
    const def = componentDefs.find((d) => d.id === 'button')!;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const texts = await (shim as unknown as { getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalTextStylesAsync();
    const styleById = new Map(texts.map((s) => [s.id, s.name] as const));
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const label = findByName(members[0], 'label');
    const before = typeof label?.textStyleId === 'string' && label.textStyleId ? styleById.get(label.textStyleId) : undefined;
    (label as { textStyleId?: string }).textStyleId = '';   // the detach the fix defends against
    const afterName = typeof label?.textStyleId === 'string' && label.textStyleId ? (styleById.get(label.textStyleId) ?? 'unknown') : 'NO TEXT STYLE APPLIED';
    ok(!!before && afterName === 'NO TEXT STYLE APPLIED',
      `#1514 mutation: a built label whose textStyleId is detached reads back 'NO TEXT STYLE APPLIED' by name (was '${before ?? '—'}') — the check is not vacuous`);
  }
}

// ── PANEL PROPERTY ORDER + DISPLAY NAMES (#1309/#1380) — HOST-TRUTH ─────────────────────────────
//
// The icon-property canon (#1380) is three things: `label` (the TEXT property) at the top, each presence
// toggle a `leading icon` / `trailing icon` true/false SWITCH, and each swap a `↳ swap …` panel label
// nested beneath it. The display NAMES are already host-gated above — member names carry the switch
// labels and `propertyRef` carries the swap labels, so a reverted `figmaName` diverges the round-trip and
// `lint-component-surface`'s digest moves. What has NO other gate is the ORDER the panel shows the
// component (non-variant) properties in: it is `planSetProperties`'s output order, which the digest does
// not hash and no other read-back inspects. So read it back off the HOST — `componentPropertyDefinitions`,
// whose key order is the executor's `addComponentProperty` order — and pin it against an oracle authored
// HERE, not derived from `planSetProperties` (docs/34). Reordering `planSetProperties` (its text → each
// boolean → the swap it gates → any unpaired swap order, #1519) then fails this BY NAME.
//
// The panel INTERLEAVE of the variant switches with the component properties is host-RENDERED and not
// asserted here (the repo's standing position that panel render order is "the owner's Figma check, not
// ours" — see `version.ts`/`test.ts`'s #1150 note); what the engine controls and this gates is that
// `label` is CREATED first and the swaps carry their `↳` labels.
{
  const CANON: Record<string, { componentProps: string[]; switches: string[] }> = {
    // button's presence toggles are VARIANT switches (edge-hugging leading/trailing change container
    // geometry, so #1331/#1379 keeps them variant, not boolean) — they are not component properties here,
    // so #1519's boolean→swap pairing does not reach button: its component properties stay `label` (TEXT)
    // then the two swaps in by-part order. The panel nesting of each swap beneath its switch is Figma's
    // own render off the `↳ ` name prefix, not an order this list controls.
    button: { componentProps: ['label', '↳ swap leading icon', '↳ swap trailing icon'], switches: ['leading icon', 'trailing icon'] },
    // select's `leading icon` is a node-visibility BOOLEAN component property since #1331 (not a variant
    // switch): it appears in componentProps and is NO longer among the variant switches. Reverting it to a
    // slot axis moves it back to `switches` and fails both assertions below by name. `message` is the
    // SECOND node-visibility boolean (#1426, hiding the composed FieldMessage). Since #1519 each icon swap
    // sits DIRECTLY under the boolean that gates it, so the panel reads `value` (TEXT) → `leading icon`
    // (BOOLEAN) → `↳ swap leading icon` (SWAP) → `message` (the standalone show/hide BOOLEAN, no swap to
    // pair). Reordering `planSetProperties` back to the old all-booleans-then-all-swaps grouping moves the
    // swap after `message` and fails this BY NAME. Dropping the showMessage boolean removes `message` here.
    // Since Option C (owner decision, 2026-09-26) the field family's text is TWO TEXT properties, and both
    // lead the panel: `placeholder`, then `value`, then the booleans and swaps as before.
    select: { componentProps: ['placeholder', 'value', 'leading icon', '↳ swap leading icon', 'message'], switches: [] },
    // text-field carries BOTH icon slots as node-visibility booleans (#1494) plus the `message` show/hide
    // boolean. #1519 pairs each swap under its boolean, so the panel reads `value` (TEXT) → `leading icon`
    // → `↳ swap leading icon` → `trailing icon` → `↳ swap trailing icon` → `message` (standalone). This is
    // the def where the pairing matters most (two icon slots): the old grouping would show both booleans,
    // then both swaps, detached — reordering `planSetProperties` back to it fails this BY NAME.
    'text-field': { componentProps: ['placeholder', 'value', 'leading icon', '↳ swap leading icon', 'trailing icon', '↳ swap trailing icon', 'message'], switches: [] },
    // #2317: the Password field drops TextField's trailing slot, so its panel is TextField's without the trailing
    // icon pair. The nested Button's `label` surfaces through the exposed instance, not as a property of this set.
    'password-field': { componentProps: ['placeholder', 'value', 'leading icon', '↳ swap leading icon', 'message'], switches: [] },
    // #2888: the Search field adds the Figma-only label switch ahead of TextField's panel (Q?4 A).
    'search-field': { componentProps: ['placeholder', 'value', 'label', 'leading icon', '↳ swap leading icon', 'trailing icon', '↳ swap trailing icon', 'message'], switches: [] },
    'icon-button': { componentProps: ['swap icon'], switches: [] },
  };
  for (const [id, want] of Object.entries(CANON)) {
    const def = componentDefs.find((d) => d.id === id)!;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const set = page.children[0] as unknown as { componentPropertyDefinitions: Record<string, { type: string }> };
    const entries = Object.entries(set.componentPropertyDefinitions ?? {});
    // Non-variant keys carry a `#<id>` suffix Figma assigns; the stem is the panel name. Variant keys do not.
    const componentOrder = entries.filter(([, d]) => d.type !== 'VARIANT').map(([k]) => k.split('#')[0]);
    const variantNames = entries.filter(([, d]) => d.type === 'VARIANT').map(([k]) => k);
    ok(JSON.stringify(componentOrder) === JSON.stringify(want.componentProps),
      `panel order (#1380): ${id} shows its component properties top-to-bottom as ${JSON.stringify(want.componentProps)} — a reordered planSetProperties fails here (host holds ${JSON.stringify(componentOrder)})`);
    ok(want.switches.every((s) => variantNames.includes(s)) && (want.switches.length > 0 || !variantNames.some((v) => / icon$/.test(v))),
      `panel switches (#1380): ${id} carries the ${JSON.stringify(want.switches)} true/false variant switch(es) as decoupled Figma names (host holds ${JSON.stringify(variantNames)})`);
  }
}

// ── #1331: THE NODE-VISIBILITY BOOLEAN, READ BACK OFF THE BUILT NODE — HOST-TRUTH ───────────────
//
// The mechanism's host truth, the two facts a property DEFINITION alone cannot show (the panel-order block
// above pins that `leading icon` is a BOOLEAN, not a variant switch): the leading glyph node is BUILT into
// EVERY member with `visible=false` (hidden by default, present-and-toggled rather than dropped), and its
// `visible` field is WIRED to the `leading icon` boolean via `componentPropertyReferences.visible`. The
// executor writes both; the host echoes them; this reads them back. Reverting `leading` to a variant slot
// axis drops the node in the false members (no node to read) and moves `leading icon` to a variant switch
// (no BOOLEAN property to wire), flipping these BY NAME.
{
  const def = componentDefs.find((d) => d.id === 'select')!;
  const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(plans), page });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  await applyComponentPlan(plans, shim as any, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim's set
  const set = page.children[0] as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim's members
  const members = (set?.children ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
  const findByName = (n: any, name: string): any => (n.name === name ? n : (n.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));
  const defs = set.componentPropertyDefinitions as Record<string, { type: string }>;
  const liKey = Object.keys(defs).find((k) => k.split('#')[0] === 'leading icon');
  ok(!!liKey && defs[liKey!].type === 'BOOLEAN',
    `#1331 host-truth: the built set carries a 'leading icon' BOOLEAN property (host holds ${liKey})`);
  const lvs = members.map((m) => findByName(m, 'leadingVisual'));
  ok(members.length === 84 && lvs.every(Boolean),
    `#1331 host-truth: the leading glyph node is built into EVERY member (${lvs.filter(Boolean).length}/${members.length})`);
  ok(lvs.length > 0 && lvs.every((lv) => lv.visible === false),
    '#1331 host-truth: every built leading glyph reads back `visible=false` — built hidden by default, not dropped');
  ok(lvs.length > 0 && lvs.every((lv) => (lv.componentPropertyReferences ?? {}).visible === liKey),
    "#1331 host-truth: every built leading glyph's `visible` is wired to the 'leading icon' boolean (componentPropertyReferences.visible)");
}

// ── #1428: A NESTED-INSTANCE PART-NAME COLLISION DOES NOT DROP THE HOST'S OWN REFERENCE — HOST-TRUTH ─
//
// select COMPOSES field-label AND field-message, and BOTH of those carry a part named `text` — the same
// name as select's own value `text`. On the live host `member.findOne(x => x.name === 'text')` descends
// INTO a nested instance and returns one of ITS `text` layers, a node that cannot hold this set's
// component-property reference (it is a sublayer of ANOTHER component): Figma refuses the write with "Could
// not create a new component property reference", so the `value` TEXT reference was reported dropped
// (#1428, QA 2026-09-15). The QA surfaced it on the status=warning/hover coordinates a live build happened
// to exercise via the throw path, but the collision is PER-MEMBER and general — every member's `text`
// read-back lands on the wrong node. The fix scopes every re-find-by-name past nested instances
// (`findOwnPart`, write-components.ts); `leadingVisual` (a unique name) and `message` (matched on the
// nested-instance node ITSELF, a valid target) never collided, which is exactly why only `text.characters`
// failed while `message.visible` never did.
//
// The corpus loop above uses OPAQUE nested-instance stubs, so it is blind to this by construction (docs/34:
// the gate's subject was under-modelled). Drive select through a shim whose nested instances carry their
// own `text` part (`nestedInstanceParts`), each refusing a reference write exactly as a sublayer of another
// component does, and assert the host holds select's OWN `value` reference on every member. Mutation-by-name
// (docs/34): revert the `findOwnPart` scoping and every member reports `text.characters -> DISCARDED`,
// failing the SECOND assertion below by name. The reachability floor (first assertion) proves the collision
// actually materialised — a naive descending `findOne` returns the nested-instance `text`, not select's own
// — so a green here is the reference surviving a REAL collision, not a fixture that never built one.
//
// OPTION C (owner decision, 2026-09-26) renamed select's own text into two layers, `placeholder` and `value`,
// which no longer share a name with the nested parts' `text`. The scoping is still what holds, so the shim's
// nested instances now carry parts named like select's own layers as well, and the collision is built on the
// names select actually references.
{
  const def = componentDefs.find((d) => d.id === 'select')!;
  const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(plans), page, nestedInstanceParts: ['text', 'label', 'placeholder', 'value'] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  const res = await applyComponentPlan(plans, shim as any, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim's members
  const members = (page.children[0]?.children ?? []) as any[];
  // REACHABILITY FLOOR — the collision materialised: the SAME descending `findOne` the pre-fix code used
  // returns a node INSIDE a nested instance (flagged by the shim), not select's own value text. Without
  // this, the miss-count assertion below could pass because the fixture never built the colliding node.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim
  const naive = members[0]?.findOne?.((x: any) => x.name === 'placeholder');
  ok(members.length === 84 && !!naive && (naive as { _inNestedInstance?: boolean })._inNestedInstance === true,
    `#1428 reachability: a naive descending findOne on a built select member returns a nested-instance \`placeholder\` (the wrong node the fix defends against) — collision materialised (${members.length} members)`);
  const textRefMisses = res.misses.filter((m) => /\b(placeholder|value)\.characters\b/.test(m));
  ok(res.wiredMembers === plans.length && textRefMisses.length === 0,
    `#1428: select's own \`placeholder\` / \`value\` TEXT reference is created on every member despite the nested-instance collision on those names — 0 dropped (${textRefMisses.length ? textRefMisses.slice(0, 2).join(' | ') : 'none'}; wiredMembers=${res.wiredMembers}/${plans.length})`);
}

// ── #1473: A MEMBER-LEVEL id-SETTLE AFTER COMBINE LEAVES NO REFERENCE UNWIRED — HOST-TRUTH ──────────
//
// #1337's `detachPartsOnCombine` detaches a member's DESCENDANTS while keeping the member's OWN identity, so
// the wire-loop recovery re-finds an attached part THROUGH the combine-time member handle and lands. The
// field-label persistent misses (27 on a live aurora build, `emphasis=secondary/weight=bold`) are the level
// up: the host reassigns some members' OWN identity after combine, so the handle a run snapshotted at combine
// (`members = [...set.children]`) is detached while a fresh `set.children` read holds a live twin. The #1337
// recovery re-found through that SAME stale handle and threw again — a permanent "Could not create a new
// component property reference". The fix re-resolves the MEMBER from a fresh `set.children` read
// (`write-components.ts`, `liveByName`). The shim's `settleAfterCombine: 'all'` models the host behavior (see
// `component-shim.ts`); this reads the references back through `anatomy-readback.ts` — a reader entirely
// separate from the executor (docs/34) — and asserts none is DISCARDED. Mutation-by-name: revert the
// `liveByName` re-resolution and every member reports its `propertyRef` fields `→ DISCARDED`, failing the
// read-back assertion by name. The floor (`refsRepaired === refs > 0`) proves the settle actually detached
// every reference — without it there is nothing to recover and a green read-back is vacuous.
{
  const def = componentDefs.find((d) => d.id === 'field-label')!;
  const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(plans), page, settleAfterCombine: 'all' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  const res = await applyComponentPlan(plans, shim as any, {});
  const created = res.misses.filter((m) => /Could not create a new component property reference/.test(m));
  ok(res.refsRepaired > 0 && res.refsRepaired === res.refs && created.length === 0,
    `#1473 host-truth floor: the member-level settle detached and the fix recovered every reference (refsRepaired=${res.refsRepaired}/${res.refs}, ${created.length} "could not create")`);
  const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
  const texts = await (shim as unknown as { getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalTextStylesAsync();
  const varById = new Map(vars.map((v) => [v.id, v.name] as const));
  const styleById = new Map(texts.map((s) => [s.id, s.name] as const));
  const ports: ReadPorts = { varName: (id) => varById.get(id) ?? null, styleName: (id) => styleById.get(id) ?? null };
  const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
  const divergences = diffAnatomy(plans, members, planComponentName, ports, {});
  const refDiv = divergences.filter((d) => d.field === 'propertyRef' || d.field === 'visibleProp' || d.field === 'visible');
  ok(members.length === plans.length && refDiv.length === 0,
    `#1473 host-truth: reading the settled set back, every declared reference is retained — 0 propertyRef DISCARDED (${refDiv.length ? refDiv.slice(0, 3).map((d) => `${d.member}: ${d.actual}`).join(' | ') : 'none'})`);
}

// ── STROKE-WEIGHT PER-SIDE READ-BACK (#1332) — HOST-TRUTH ──────────────────────────────────────
//
// The 2026-09-09 host-truth Figma-console audit established that `setBoundVariable('strokeWeight', v)`
// binds the weight onto the four PER-SIDE keys (`strokeTopWeight`/…/`strokeLeftWeight`) and leaves the
// scalar `strokeWeight` unbound, on every bordered set. The read-backs checked the scalar and reported a
// FALSE `strokeWeight→UNBOUND`/`DISCARDED` on a weight that IS bound (#1332). The shim now models that
// split (see `component-shim.ts`), so the whole bordered corpus above already exercises the per-side
// path — revert `boundIdOf`'s per-side branch and every bordered def diverges `bound`/`strokeWeight` by
// name. This block pins the two directions EXPLICITLY, with an oracle authored HERE (docs/34): the
// per-side-bound weight must read BOUND, and a GENUINELY unbound one (a raw number, no keys) must still
// be reported — the check accepts the complete per-side binding, it is not weakened into always-passing.
{
  const def = componentDefs.find((d) => d.id === 'focus-ring');
  ok(!!def, '#1332 reachable: the focus-ring def is registered and projects');
  if (def) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
    const varById = new Map(vars.map((v) => [v.id, v.name] as const));
    const ports: ReadPorts = { varName: (id) => varById.get(id) ?? null, styleName: () => null };
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const ring = members[0] as unknown as { boundVariables: Record<string, { id?: string }>; strokeWeight?: unknown };
    const SIDES = ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'];

    // HOST TRUTH, pinned: the built ring binds the weight on all four per-side keys and NOT the scalar.
    ok(members.length > 0 && SIDES.every((k) => typeof ring.boundVariables[k]?.id === 'string') && ring.boundVariables.strokeWeight === undefined,
      `#1332 the built ring binds its weight on the four per-side keys with the scalar left unbound (${SIDES.map((k) => `${k}=${ring.boundVariables[k]?.id ? 'bound' : '—'}`).join(', ')}, strokeWeight=${ring.boundVariables.strokeWeight ? 'bound' : 'unbound'})`);

    // POSITIVE — the reader accepts the per-side binding: no false `strokeWeight` divergence.
    const clean = diffAnatomy(plans, members, planComponentName, ports, {});
    ok(!clean.some((d) => d.field === 'bound' && /strokeWeight/.test(d.actual ?? '')),
      `#1332 a per-side-bound weight reads back BOUND — no false strokeWeight DISCARDED (${clean.filter((d) => /strokeWeight/.test(d.actual ?? '')).map((d) => `${d.member}: ${d.actual}`).join('; ') || 'none'})`);

    // NEGATIVE (mutation-by-name) — a GENUINELY unbound weight (a raw number, no per-side keys) is still
    // reported `strokeWeight→UNBOUND`, so the fix did not weaken the check into always-passing.
    for (const k of SIDES) delete ring.boundVariables[k];
    ring.strokeWeight = 1;   // the host holds a raw literal — the #1332 "genuinely unbound" case
    const unbound = diffAnatomy(plans, members, planComponentName, ports, {});
    ok(unbound.some((d) => d.field === 'bound' && /strokeWeight→UNBOUND/.test(d.actual ?? '')),
      `#1332 mutation: a weight bound to nothing (a raw number) is reported \`strokeWeight→UNBOUND\` by name (${unbound.filter((d) => d.field === 'bound').map((d) => `${d.member}: ${d.actual}`).join('; ') || 'NOT REPORTED — the check went silent'})`);

    // AND A PARTIAL per-side binding is NOT accepted: three sides is a real miss, not "close enough".
    const v0 = vars.find((x) => /focus\/ring\/width$/.test(x.name));
    for (const k of SIDES) ring.boundVariables[k] = { id: v0?.id };
    delete ring.boundVariables.strokeLeftWeight;
    delete (ring as { strokeWeight?: unknown }).strokeWeight;
    const partial = diffAnatomy(plans, members, planComponentName, ports, {});
    ok(partial.some((d) => d.field === 'bound' && /strokeWeight→UNBOUND/.test(d.actual ?? '')),
      `#1332 an INCOMPLETE per-side binding (three of four sides) is reported, not accepted — the check requires the complete set (${partial.filter((d) => d.field === 'bound').map((d) => d.actual).join('; ') || 'NOT REPORTED'})`);
  }
}

// ── #1318: THE GRADIENT FILL READ-BACK, AND ITS NEGATIVE CONTROLS ─────────────────────────────────
//
// `gradientFill`'s predicate reads the host's `fills[0]` — a linear gradient, its matrix, and each stop's
// position and bound variable IN ORDER. Over the corpus it only ever meets correctly built veils, so a
// predicate that returned `null` for everything would leave this gate ALL PASS. These controls damage one
// built member AFTER the write, two ways, and require the reader to name each: a stop that lost its binding,
// and the stops reversed (a wash strongest at the wrong edge). Expected strings authored here.
{
  const def = componentDefs.find((d) => d.id === 'veil');
  ok(!!def, '#1318 reachable: the veil def is registered and projects');
  if (def) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
    const varById = new Map(vars.map((v) => [v.id, v.name] as const));
    const ports: ReadPorts = { varName: (id) => varById.get(id) ?? null, styleName: () => null };
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const MEMBER = 'value=light, intensity=strong, direction=from-top';
    const target = members.find((m) => m.name === MEMBER) as unknown as { fills: { gradientStops?: { position: number; boundVariables?: Record<string, unknown> }[] }[] } | undefined;
    const gradDiffs = () => diffAnatomy(plans, members, planComponentName, ports, {}).filter((d) => d.field === 'gradientFill' && d.member === MEMBER);

    // POSITIVE — the member exists, carries a two-stop gradient, and reads back with no gradient divergence.
    ok(!!target && target.fills[0]?.gradientStops?.length === 2 && gradDiffs().length === 0,
      `#1318 the built ${MEMBER} reads back its gradient with no divergence (${gradDiffs().map((d) => d.actual).join('; ') || 'none'})`);
    if (target) {
      const original = target.fills;
      // NEGATIVE 1 — the far stop's binding dropped by the host.
      const [g] = original;
      target.fills = [{ ...g, gradientStops: [g.gradientStops![0], { position: 1 }] }];
      ok(gradDiffs().some((d) => /stop 1 NOT BOUND/.test(d.actual ?? '')),
        `#1318 mutation: a gradient stop that lost its binding is reported \`stop 1 NOT BOUND\` by name (${gradDiffs().map((d) => d.actual).join('; ') || 'NOT REPORTED — the check went silent'})`);
      // NEGATIVE 2 — the stops reversed: the clear end at position 0, the wash at position 1.
      target.fills = [{ ...g, gradientStops: [...g.gradientStops!].reverse() }];
      ok(gradDiffs().some((d) => /stop 0 at 1/.test(d.actual ?? '') && /stop 0→.*veil\/light\/clear/.test(d.actual ?? '')),
        `#1318 mutation: reversed stops are reported by position and by variable (\`stop 0 at 1\`, \`stop 0→…/veil/light/clear\`) (${gradDiffs().map((d) => d.actual).join('; ') || 'NOT REPORTED — the check went silent'})`);
      target.fills = original;
    }
  }
}

// ── #1430: EVERY EMITTED SET CARRIES ITS VARIANT-SET FRAME — HOST-TRUTH ─────────────────────────
//
// THE DIAGNOSIS (progress log 2026-09-16): the emitted sets ARE real `ComponentSetNode`s —
// `combineAsVariants` creates them and the host reads them back as `type === 'COMPONENT_SET'` (asserted
// below), so this is NOT a projection-model defect. What #865 then did was BLANK the fill, purple dashed
// border and 5px radius Figma dresses a set with, so an emitted set read as a bare frame — the #1430
// canvas-scanning defect. The fix claims the set's border (`write-components.ts`' `isSet` branches) —
// since 2026-09-27 by WRITING `SET_BORDER` on a set the host returns unpainted. The shared shim models the
// set exactly as the live host returns it (`component-shim.ts`), so this reads the border back off the
// BUILT set and fails BY NAME if the executor did not write it.
//
// The oracle — "a real ComponentSetNode carrying a visible SOLID #9747FF dashed stroke and a set-shaped
// radius" — is authored HERE, not derived from the executor (docs/34): the purple is written below as
// hex, never imported from `SET_BORDER`, and revert the executor's bare-set write and every emitted set
// trips the positive arm.
//
// 2026-09-27 — THE HOST SUPPLIES NO PAINT. Probed live, `combineAsVariants` returns `strokes: []` with the
// dash and radius set; the shim used to pre-dress the set with the purple stroke, so this arm read the
// SHIM'S paint back and passed with no border on any real set. The shim is now bare, as the host is, so
// the paint this reads can only have been WRITTEN by the executor — which is why the arm now asserts the
// paint's type and color, not only that the array is non-empty.
{
  // #9747FF, compared in 8-bit channels so a host's float32 read-back cannot fail a correct paint.
  const PURPLE = { r: 0x97, g: 0x47, b: 0xff };
  const isPurple = (p: unknown): boolean => {
    const q = p as { type?: unknown; visible?: unknown; opacity?: unknown; color?: { r: number; g: number; b: number } } | undefined;
    if (q?.type !== 'SOLID' || q.visible === false || (typeof q.opacity === 'number' && q.opacity < 1) || !q.color) return false;
    return Math.round(q.color.r * 255) === PURPLE.r && Math.round(q.color.g * 255) === PURPLE.g && Math.round(q.color.b * 255) === PURPLE.b;
  };
  const framed = (set: Record<string, unknown> | undefined): string[] => {
    const problems: string[] = [];
    if (set?.type !== 'COMPONENT_SET') problems.push(`type=${String(set?.type)} (not a real ComponentSetNode)`);
    if (!((set?.strokes as unknown[])?.length > 0)) problems.push('no stroke (the variant-set border was blanked)');
    else if (!(set?.strokes as unknown[]).some(isPurple)) problems.push(`stroke ${JSON.stringify(set?.strokes)} (not the visible SOLID #9747FF variant-set purple)`);
    if (!((set?.dashPattern as unknown[])?.length > 0)) problems.push('no dashPattern (the border is not dashed)');
    const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].map((c) => Number(set?.[c] ?? 0));
    if (!corners.every((r) => r > 0)) problems.push(`radius ${JSON.stringify(corners)} (a set frame is rounded, not a hard square)`);
    // No fill check: the set's opaque default fill is deliberately cleared to transparent (#1430), so its
    // canvas identity is the dashed border + radius, not a fill.
    return problems;
  };

  let checked = 0;
  const stripped: string[] = [];
  for (const def of PROJECTED) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const set = page.children[0] as Record<string, unknown> | undefined;
    if (set?.type !== 'COMPONENT_SET') continue;   // no set to frame (e.g. the emitAsComponents route)
    checked++;
    const problems = framed(set);
    if (problems.length) stripped.push(`${def.id}: ${problems.join('; ')}`);
  }
  ok(checked > 0, `#1430: the corpus produced ${checked} emitted COMPONENT_SET(s) to check the frame on (scope floor)`);
  ok(stripped.length === 0,
    `#1430: every emitted set reads back as a real ComponentSetNode carrying its variant-set frame — the dashed purple border and a set radius — so it is pickable on the canvas${stripped.length ? ` — STRIPPED: ${stripped.slice(0, 6).join(' | ')}` : ''}`);

  // NEGATIVE (docs/34 non-vacuity): a set whose stroke/dash was blanked — the pre-#1430 #865 behavior — IS
  // reported by the same predicate, so the positive arm above is a live check and not an always-pass.
  const bareDef = componentDefs.find((d) => d.figmaProperties)!;
  const barePlans = figmaAnatomySet(bareDef, { swapTarget: SWAP_TARGET });
  const barePage: Page = { children: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  await applyComponentPlan(barePlans, makeShim({ ...fullFor(barePlans), page: barePage }) as any, {});
  const bareSet = barePage.children[0] as Record<string, unknown>;
  const builtStrokes = bareSet.strokes;
  bareSet.strokes = []; bareSet.dashPattern = [];
  const bareProblems = framed(bareSet);
  ok(bareProblems.length > 0,
    `#1430 mutation: a set stripped of its stroke/dash is reported by name (${bareProblems.join('; ') || 'NOT REPORTED — the check went silent'})`);
  // And a stroke that is PRESENT but is not the variant-set purple is reported too, so the paint arm reads
  // the color rather than the array length (the pre-2026-09-27 arm accepted any non-empty stroke).
  bareSet.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]; bareSet.dashPattern = [10, 5];
  const inkProblems = framed(bareSet);
  ok(inkProblems.some((p) => /9747FF/.test(p)),
    `#1430 mutation: a set stroked in a color other than #9747FF is reported by name (${inkProblems.join('; ') || 'NOT REPORTED — the paint check went silent'})`);
  bareSet.strokes = builtStrokes;

  // LEFT ALONE: a host that hands the set back ALREADY stroked keeps that stroke — the executor writes
  // `SET_BORDER` only onto a set with no paint. Modelled by wrapping the shim's combine; the paint is a
  // deliberately non-purple green so "kept" and "overwritten with the purple" read differently.
  const HOST_PAINT = { type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0, g: 0.5, b: 0 } };
  const keptPage: Page = { children: [] };
  const keptShim = makeShim({ ...fullFor(barePlans), page: keptPage }) as unknown as Record<string, unknown>;
  const combine = keptShim.combineAsVariants as (...a: unknown[]) => Record<string, unknown>;
  keptShim.combineAsVariants = (...a: unknown[]) => { const s = combine(...a); s.strokes = [{ ...HOST_PAINT }]; return s; };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  await applyComponentPlan(barePlans, keptShim as any, {});
  const keptSet = keptPage.children[0] as Record<string, unknown> | undefined;
  ok(keptSet?.type === 'COMPONENT_SET' && JSON.stringify(keptSet.strokes) === JSON.stringify([HOST_PAINT]),
    `#1430 left alone: a set the host returns already stroked keeps its own stroke — the executor writes the purple only onto a bare set (${JSON.stringify(keptSet?.strokes)})`);
}

// ── SET INNER PADDING: THE GRID STARTS 24px INSIDE THE SET (owner-reported 2026-09-27) ────────────
//
// #1714 writes the variant-set border INSIDE the set's edge, and a grid laid out from (0,0) covered it
// wherever a member touched an edge. The owner approved 24px of inner padding, matching the grid's GAP.
// The oracle is authored HERE as literals (24 and 48), never read from the executor's PAD (docs/34): every
// member sits at least 24 in from the set's top-left, and the set is the members' extent plus 48 on each
// axis — so the padding is 24 on all four sides, not only the top-left. Set PAD to 0 in
// `write-components.ts` and this arm fails by name.
{
  let checked = 0;
  const off: string[] = [];
  for (const def of PROJECTED) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, makeShim({ ...fullFor(plans), page }) as any, {});
    const set = page.children[0] as unknown as { type?: string; width: number; height: number; children: { name: string; x: number; y: number; width: number; height: number }[] } | undefined;
    if (set?.type !== 'COMPONENT_SET' || !set.children.length) continue;
    checked++;
    const ms = set.children;
    const inside = ms.filter((m) => m.x < 24 || m.y < 24).map((m) => `${m.name}@${m.x},${m.y}`);
    const left = Math.min(...ms.map((m) => m.x)), right = Math.max(...ms.map((m) => m.x + m.width));
    const top = Math.min(...ms.map((m) => m.y)), bottom = Math.max(...ms.map((m) => m.y + m.height));
    const wantW = right - left + 48, wantH = bottom - top + 48;
    const problems: string[] = [];
    if (inside.length) problems.push(`members inside the 24px padding: ${inside.slice(0, 3).join(', ')}`);
    if (Math.abs(left - 24) > 0.5 || Math.abs(top - 24) > 0.5) problems.push(`grid starts at ${left},${top}, want exactly 24,24 (#1731 net: equal padding on every side)`);
    if (Math.abs(set.width - wantW) > 0.5 || Math.abs(set.height - wantH) > 0.5) problems.push(`set ${set.width}×${set.height}, want ${wantW}×${wantH} (members' extent + 48)`);
    if (problems.length) off.push(`${def.id}: ${problems.join('; ')}`);
  }
  ok(checked > 0, `set padding: the corpus produced ${checked} emitted COMPONENT_SET(s) to check the padding on (scope floor)`);
  ok(off.length === 0,
    `set padding: every emitted set places its members 24px inside its edge and is the members' extent + 48 on each axis, so no member covers the variant-set border${off.length ? ` — OFF: ${off.slice(0, 6).join(' | ')}` : ''}`);
}

// ── OVERLAY-WASH: BOUND ON container.fills AND RESOLVED BY THE EMITTED BRAND (#1429) ────────────
//
// THE QA FINDING (2026-09-15, ENGINE 0.87.0): all button families reported 96 misses and all
// icon-button families 24, of the form `container.fills -> color/interactive/<c>/overlay/{hover,pressed}`
// — read as "the hover/pressed overlay wash is not being bound on the container across the corpus".
//
// THE DIAGNOSIS IS (b), A TELEMETRY READING — NOT A DROPPED WASH, and the evidence is below in this very
// block. The `container` box declares `paintSlots: ['overlay','fill','border']` (button.ts / icon-button.ts),
// so on an outline/text hover/pressed coordinate the projection binds `interactive.<c>.overlay.<state>`
// (the translucent wash) onto `container.fills` — measured here as 96 bindings per button family and 48 per
// icon-button family (2 wash appearances × 2 wash states × 3 sizes × 2 shapes × 2 surfaces; the count moves
// with the def's axes — it was 24 before #1427 added `surface`, and assertion (1) prints the live per-family
// figures, #1451), exactly where the QA said nothing landed. On every brand that USES the wash
// (`outlineInteraction: 'overlay-neutral'`, the default and the whole committed corpus) that variable IS
// emitted and the binding RESOLVES: 0 dangling. The 96/24 QA misses came from a brand built with
// `outlineInteraction: 'none'` (the `minimal-levers` corpus member), which DELIBERATELY does not emit the
// wash; the brand-agnostic component binds it regardless, so the paste's name-resolution channel reports a
// miss and #1387 already neutralizes the visual to transparent (never Figma's white). So counting that as a
// corpus-wide defect was the false positive.
//
// WHY THIS BLOCK EXISTS, and why the corpus loop above could never have caught it (docs/34 shape 11): that
// loop stocks its shim's variable catalogue FROM THE PLAN (`fullFor`), so a bound paint ALWAYS resolves and
// a wash that the engine never emits — or emits under a drifted name — round-trips green. The only witness
// is an INDEPENDENT ORACLE: the token layer the engine actually emits, a code path (`emit-figma-color` /
// `modes.ts`) entirely separate from the projection (`anatomy-figma`). This block reads the container's
// bound wash off the HOST (what the executor wrote) and checks it against that emitted brand — so a wash
// dropped from the PROJECTION fails the reachability floor by name, and a wash dropped from (or renamed in)
// the EMISSION fails the resolution check by name. Neither is derivable from the other.
{
  // THE INDEPENDENT ORACLE — an overlay-neutral brand's emitted color-variable tails. `nbTheme()` is a real
  // brand on the default `overlay-neutral`, measured 0-dangling; its variables come from the emitter, never
  // from any plan, which is the whole point (docs/34 shape 11). Tail space because a plan binds root-relative
  // and every emitted variable is `<root>/<tail>` — the same `tailOf` the paste executor keys `byName` on.
  const { palette, color } = buildFigmaColor(nbTheme());
  const emittedTails = new Set<string>();
  for (const c of [palette, ...color]) for (const v of c.variables ?? []) emittedTails.add(tailOf(v.name));
  ok(emittedTails.size > 0, `#1429 the overlay-neutral oracle emitted color variables (independent-oracle floor: ${emittedTails.size})`);

  // A wash tail is `…/interactive/<family>/overlay/<hover|pressed>` — page (`color/interactive/…`) and inverse
  // (`color/inverse/interactive/…`) both end this way; `selected` is not a button/icon-button state and is not
  // matched. This is the SAME shape the QA quoted, so a match here is a binding on exactly the coordinate it named.
  const washTail = /(^|\/)interactive\/[a-z-]+\/overlay\/(hover|pressed)$/;
  // The families the QA named — button + its two intent siblings, icon-button + its two — read off `componentDefs`
  // rather than listed, so a new intent sibling is covered without editing this gate.
  // The button and icon-button FAMILIES (Button.Group, #2661, is a layout of Buttons and paints no wash of its own).
  const FAMILIES = componentDefs.filter((d) => /^(button|icon-button)(-(destructive|neutral))?$/.test(d.id)).map((d) => d.id);

  let washBindings = 0;                       // container members whose fills bind a hover/pressed wash
  const washNames = new Set<string>();        // the distinct wash tails the containers bind
  const perFamily: string[] = [];
  const emptyFamilies: string[] = [];         // families binding NO wash — a per-family representation gap
  const dangling: string[] = [];              // wash bindings the emitted brand does NOT resolve
  for (const id of FAMILIES) {
    const def = componentDefs.find((d) => d.id === id)!;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    let n = 0;
    for (const m of members) {
      const arr = (m as { fills?: unknown }).fills;
      const first = Array.isArray(arr) ? (arr[0] as { boundVariables?: Record<string, { id?: unknown }> } | undefined) : undefined;
      const boundId = first?.boundVariables?.color?.id;
      if (typeof boundId !== 'string') continue;
      const tail = boundId.replace(/^V:/, '');   // the shim ids variables `V:<tail>` (component-shim `mkVar`)
      if (!washTail.test(tail)) continue;
      n++; washBindings++; washNames.add(tail);
      if (!emittedTails.has(tail)) dangling.push(`${id}: ${String(m.name)} -> ${tail}`);
    }
    perFamily.push(`${id}=${n}`);
    if (n === 0) emptyFamilies.push(id);
  }

  // (1) THE WASH LANDS ON container.fills IN EVERY NAMED FAMILY — representation, not a corpus count
  //     (docs/34): a wash dropped on ONE family (the button factory is shared, but icon-button is a
  //     separate def) still binds the wash from the others, so a corpus-wide `> 0` floor would pass on a
  //     real per-family drop. Asserting each family is represented is what fires BY NAME on the defect the
  //     issue scopes to "button / button-destructive / button-neutral / icon-button (+ its variants)".
  ok(FAMILIES.length > 0 && emptyFamilies.length === 0,
    `#1429 the hover/pressed overlay wash IS bound on container.fills in every named family (${washBindings} bindings — ${perFamily.join(', ')})${emptyFamilies.length ? ` — DROPPED IN: ${emptyFamilies.join(', ')}` : ''}`);
  // (2) EVERY bound wash RESOLVES against the INDEPENDENT emitted overlay-neutral brand — 0 dangling. This is
  //     the QA's `container.fills -> …/overlay/{hover,pressed}` "miss", proven ABSENT for a brand that uses the
  //     wash: the 96/24 misses were an `outlineInteraction: 'none'` brand opting out (#1387), not a drop.
  ok(dangling.length === 0,
    `#1429 every container overlay-wash binding resolves against the emitted overlay-neutral brand — 0 dangling (${dangling.length ? dangling.slice(0, 4).join('; ') : 'none'})`);
  // (3) THE RIGHT TOKENS, not merely "some overlay" (docs/34 shape 5): the exact names the QA quoted are bound.
  for (const want of ['color/interactive/primary/overlay/hover', 'color/interactive/primary/overlay/pressed'])
    ok(washNames.has(want), `#1429 the container binds ${want} at its state coordinate (host truth)`);

  // ── NEGATIVE CONTROLS — the two directions of a genuinely-dropped wash, proving neither check is vacuous.
  //
  // (a) PROJECTION DROP. Rebuild button, clear the wash off its containers (models the projection not binding
  //     the overlay), and confirm the reachability floor (1) would then read 0 — so a dropped wash fires it.
  {
    const def = componentDefs.find((d) => d.id === 'button')!;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const countWash = (): number => members.reduce((a, m) => {
      const id = (m as { fills?: { boundVariables?: Record<string, { id?: unknown }> }[] }).fills?.[0]?.boundVariables?.color?.id;
      return a + (typeof id === 'string' && washTail.test(id.replace(/^V:/, '')) ? 1 : 0);
    }, 0);
    const before = countWash();
    for (const m of members) {
      const id = (m as { fills?: { boundVariables?: Record<string, { id?: unknown }> }[] }).fills?.[0]?.boundVariables?.color?.id;
      if (typeof id === 'string' && washTail.test(id.replace(/^V:/, ''))) (m as { fills: unknown[] }).fills = [];
    }
    ok(before > 0 && countWash() === 0,
      `#1429 mutation (projection drop): clearing the wash off button containers drives the count ${before} → 0, so floor (1) fires by name`);
  }
  // (b) EMISSION DROP. Remove the wash tails from the oracle (models `modes.ts` no longer emitting the wash,
  //     or renaming it) and confirm EVERY container wash binding is then reported dangling — so check (2) fires.
  {
    const oracleNoWash = new Set([...emittedTails].filter((t) => !washTail.test(t)));
    const nowDangling = [...washNames].filter((t) => !oracleNoWash.has(t));
    ok(washNames.size > 0 && nowDangling.length === washNames.size,
      `#1429 mutation (emission drop): with the wash removed from the oracle, all ${washNames.size} bound wash name(s) are reported dangling, so check (2) fires by name (dangling ${nowDangling.length})`);
  }
}

// ── #1424: THE WRAPPING LABEL, READ BACK OFF THE BUILT NODE — HOST-TRUTH ────────────────────────
//
// The row's label must FILL its main axis and WRAP (Prism 2's radio-button-row / checkbox-row), and the
// control must stay FIXED so a wrapping label never shrinks or stretches it. The generic diff above already
// checks each of these plan fields against the built node (plan-as-oracle: `layoutGrow`/`textAutoResize`
// classified in `anatomy-readback.ts`), which catches an executor that fails to write them. What it CANNOT
// catch is a def that silently STOPS wrapping — drop `wrap` and the plan no longer carries the fields, so
// plan-vs-built still agrees on their absence. This block closes that with an oracle authored HERE and
// nowhere else — the owner-decided fact that these two rows wrap — so a `wrap` removed from either def
// diverges from this and fails BY NAME (docs/34). It builds through the shared shim exactly as the corpus
// loop does, then reads each row's label and controlBox back off the host.
{
  const WRAPS = ['radio-row', 'checkbox-row'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
  const findByName = (n: any, name: string): any => (n?.name === name ? n : (n?.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));
  for (const id of WRAPS) {
    const def = componentDefs.find((d) => d.id === id);
    ok(!!def, `#1424 host-truth: the ${id} def is registered and projects`);
    if (!def) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const labels = members.map((m) => findByName(m, 'label'));
    const controlBoxes = members.map((m) => findByName(m, 'controlCell'));
    // SCOPE FLOOR — a label was built into every member, or "they all wrap" is a statement about an empty set.
    ok(members.length > 0 && labels.every(Boolean),
      `#1424 host-truth: ${id} builds a label into every member (${labels.filter(Boolean).length}/${members.length})`);
    // THE LABEL FILLS AND WRAPS — read back off the built node (both facts, since either alone does not wrap).
    ok(labels.length > 0 && labels.every((l) => l.layoutGrow === 1 && l.textAutoResize === 'HEIGHT'),
      `#1424 host-truth: every ${id} label reads back layoutGrow=1 + textAutoResize=HEIGHT — it fills the row and wraps (e.g. layoutGrow=${String(labels[0]?.layoutGrow)}, textAutoResize=${String(labels[0]?.textAutoResize)})`);
    // THE CONTROL STAYS FIXED — it does not grow (layoutGrow 0) and its cross axis is FIXED, so the wrapping
    // label never shrinks or stretches it.
    ok(controlBoxes.length > 0 && controlBoxes.every((c) => c && c.layoutGrow !== 1 && c.counterAxisSizingMode === 'FIXED'),
      `#1424 host-truth: every ${id} controlBox reads back fixed/hug — layoutGrow≠1 (${String(controlBoxes[0]?.layoutGrow)}) and counterAxisSizingMode=FIXED (${String(controlBoxes[0]?.counterAxisSizingMode)})`);
  }
}

// ── #1503: CROSS-AXIS CHILD FILL, READ BACK OFF THE BUILT NODE — HOST-TRUTH ─────────────────────
//
// The owner decided (Option B, follow Prism 2) that the column-stacked form components should have a
// fixed-width root with their inner children set to cross-axis FILL, so the rows / inputs SPAN the
// container rather than rendering ragged. The projection realizes that with `crossAxisFill` →
// `layoutAlign: STRETCH` (the missing cross-axis twin of `wrap`'s main-axis `layoutGrow`), applied to the
// child BY ITS PARENT so it reaches a nested INSTANCE the child neutralizer returns early on.
//
// The generic diff above already checks `layoutAlign` against the built node (plan-as-oracle:
// `anatomy-readback.ts`'s `layoutAlign` predicate), which catches an executor that fails to write it — the
// #874 class. What it CANNOT catch is a def that silently STOPS filling: drop `crossAxisFill` and the plan
// no longer carries the field, so plan-vs-built still agrees on its absence. This block closes that with an
// oracle authored HERE and nowhere else — the owner-decided fact that these children fill their container's
// width — so a `crossAxisFill` removed from any of these parts reads back `INHERIT`/absent, diverges from
// this STRETCH oracle, and fails BY NAME (docs/34). It also proves the parent-applied write reaches a nested
// INSTANCE, the whole reason `layoutAlign` is applied by the parent rather than in `claimDefaults`.
{
  // THE OWNER-DECIDED FILL CONTRACT — which parts of which defs must span their container's cross axis.
  // Authored here, not derived from the defs (docs/34): the def is the SUBJECT, this is the ORACLE.
  //   · checkbox-group / radio-group — the stacked rows fill the group's width (the label deliberately hugs).
  //   · select — the composed label + message fill the field's width (the control already spans via minWidth).
  // text-field and field-message are HELD (their width floor / cross-axis alignment are owner design calls,
  // see the PR body), so they are deliberately absent — this oracle asserts only what the owner settled.
  const FILLS: Record<string, string[]> = {
    'checkbox-group': ['row1', 'row2', 'row3'],
    'radio-group': ['row1', 'row2', 'row3'],
    'select': ['label', 'message'],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
  const findByName = (n: any, name: string): any => (n?.name === name ? n : (n?.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));
  for (const [id, partNames] of Object.entries(FILLS)) {
    const def = componentDefs.find((d) => d.id === id);
    ok(!!def, `#1503 host-truth: the ${id} def is registered and projects`);
    if (!def) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    for (const part of partNames) {
      const nodes = members.map((m) => findByName(m, part));
      // SCOPE FLOOR — the part was built into every member, or "they all fill" is a statement about an empty
      // set. This also fires if a part is renamed or dropped from the def.
      ok(members.length > 0 && nodes.every(Boolean),
        `#1503 host-truth: ${id} builds a '${part}' into every member (${nodes.filter(Boolean).length}/${members.length})`);
      // THE CHILD FILLS THE CROSS AXIS — read back off the built node. A `nest` part (rows, label, message)
      // is a nested INSTANCE, so a green here proves the PARENT-applied `layoutAlign` reached it — a write
      // `claimDefaults` skips. Drop `crossAxisFill` from the def and this reads `INHERIT`/undefined, failing
      // by name.
      ok(nodes.length > 0 && nodes.every((no) => no && no.layoutAlign === 'STRETCH'),
        `#1503 host-truth: every ${id} '${part}' reads back layoutAlign=STRETCH — it fills the container's width (e.g. layoutAlign=${String(nodes[0]?.layoutAlign)})`);
    }
  }
  // THE WIDTH-FLOOR HALF — the container carries `minWidth: 320` so the STRETCH resolves against a real width
  // (Prism 2's 320) rather than the widest label. Read back off the built group root, oracle authored here.
  for (const id of ['checkbox-group', 'radio-group']) {
    const def = componentDefs.find((d) => d.id === id);
    if (!def) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    // Q155 A: the group is BUILT at 320 and floors at the fields' 120, so it shrinks with its column (measured in the
    // Q152.3/Q155 block below).
    ok(members.length > 0 && members.every((m) => (m as { minWidth?: unknown }).minWidth === 120 && (m as { width?: unknown }).width === 320),
      `#1503/Q155 host-truth: every ${id} member reads back width 320 and minWidth=120 — built at Prism 2's width, the floor the fields take (e.g. width=${String((members[0] as { width?: unknown })?.width)}, minWidth=${String((members[0] as { minWidth?: unknown })?.minWidth)})`);
  }
}

// ── #1518: text-field CONTROL READS BACK minWidth=320 — HOST-TRUTH ──────────────────────────────
//
// The owner settled text-field's default width at 320 (parity with select, #1345): the `control` box carries a
// `minWidth: 320` LITERAL, so a projected field reads at a comfortable width rather than hugging narrow. Unlike
// the #1503 groups (whose floor is on the ROOT), text-field's floor sits on the visible CONTROL — the one place
// projection can express it (the column then hugs to the 320 control). The generic plan-vs-built diff already
// checks `minWidth` against the built node, which catches an executor that fails to WRITE it (#874 class); what
// it CANNOT catch is the def silently STOPPING declaring it (plan omits the field → plan-vs-built agrees on its
// absence). This block closes that with an oracle authored HERE — the owner-decided 320 — read back off the
// built control, so dropping `minWidth` from the def reads back `undefined`, diverges from 320, and fails BY
// NAME (docs/34). Mirrors the #1503 group-root minWidth half, one node deeper (the control, not the root).
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
  const findByName = (n: any, name: string): any => (n?.name === name ? n : (n?.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));
  const def = componentDefs.find((d) => d.id === 'text-field');
  ok(!!def, '#1518 host-truth: the text-field def is registered and projects');
  if (def) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const controls = members.map((m) => findByName(m, 'control'));
    // SCOPE FLOOR — the control was built into every member, or "they all read 320" is a statement about an
    // empty set. This also fires if the control part is renamed or dropped from the def.
    ok(members.length > 0 && controls.every(Boolean),
      `#1518 host-truth: text-field builds a 'control' into every member (${controls.filter(Boolean).length}/${members.length})`);
    // THE WIDTH FLOOR — read back off the built control. Oracle 120 authored here (#2266, owner decision Q99 B:
    // a field shrinks with its column; 320 is the root's built width, #2292). Drop `minWidth` from the control
    // PartDef and this reads back `undefined`, failing by name.
    ok(controls.length > 0 && controls.every((c) => (c as { minWidth?: unknown })?.minWidth === 120),
      `#1518/#2266 host-truth: every text-field control reads back minWidth=120 — a field shrinks with its column (e.g. minWidth=${String((controls[0] as { minWidth?: unknown })?.minWidth)})`);
  }
}

// ── #1513/#1567: A BOUND CAPTION IS ONE SHARED CELL, AND THE COLLAPSE IS REPORTED — HOST-TRUTH ────
//
// #1474 gave field-message four DISTINCT per-status captions (Set A) via `byVariant.status`, and the engine
// + offline shim carried them (`test-write-components.ts`). A LIVE projection showed one string on all four.
//
// #1513 DIAGNOSED THAT AS A ONE-SHOT RESET — Figma adopting the set-level TEXT property's `defaultValue` onto
// a node at bind time — and fixed it by re-asserting each member's own copy AFTER wiring. That went green here
// and the live file got WORSE: all four statuses showed "All set.", the LAST member's caption rather than the
// first's (#1567). The host was measured on a scratch page (2026-09-22, Figma console) to settle it, and the
// reset model was wrong in both directions:
//
//   • `node.characters` on a characters-bound node READS the property's `defaultValue`, and
//   • `node.characters = v` WRITES THROUGH to it — every sibling bound to that property reads the new value.
//
// A component set holds ONE default per TEXT property. So a per-member caption behind a bound part is not
// merely reset, it is NOT EXPRESSIBLE, and the re-assert loop was not repairing four captions — it was
// overwriting one shared cell four times, leaving whichever member it wrote last. This arm pins the host truth
// (one shared default, reached by every member) and pins that the executor now REPORTS the collapse by name
// instead of silently causing it.
//
// THE COLLISION WAS A DESIGN QUESTION, NOW RESOLVED (Option 2, #1575): #1474 wanted four authored captions,
// #1018 wanted one overridable TEXT property, and on this host `field-message`'s `text` part can have one or
// the other. The owner kept the property, so the def declares ONE caption; the members stay distinct by GLYPH
// per status. This arm pins that resolved state, and keeps the collapse-report mechanism guarded on a
// SYNTHETIC divergent def below — so the safety net for a future mis-authored def is not deleted along with
// the four-caption spread that used to exercise it.
//
// The oracle — the canonical default and the synthetic spread — is authored HERE, not read off the def
// (docs/34). The FLOORS make the positive arms non-vacuous: (1) the def declares ONE caption, so "every member
// reads one string" is a claim about an intended single default and a re-added spread fails by name; and
// (2) write-through is LIVE — writing one member's caption moves every sibling's — so a green is the executor
// reading a REAL shared cell, not a shim with no sharing to break. Mutation-by-name: re-add `byVariant` to
// field-message and floor (2) + the surface baseline fail; delete the executor's collapse report and the
// synthetic safety-net arm below fails.
{
  const def = componentDefs.find((d) => d.id === 'field-message');
  ok(!!def, '#1513 host-truth: the field-message def is registered and projects');
  if (def) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
    const findText = (n: any): any => (n?.type === 'TEXT' ? n : (n?.children ?? []).map((c: any) => findText(c)).find(Boolean));
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    const res = await applyComponentPlan(plans, shim as any, {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim's set
    const set = page.children[0] as any;
    const members = (set?.children ?? []) as unknown as HostNode[];
    const texts = members.map((m) => findText(m));
    // SCOPE FLOOR — a caption TEXT was built into every member, or "they all read one cell" is a claim about
    // an empty set.
    ok(members.length === 4 && texts.every(Boolean),
      `#1513 host-truth: field-message builds a caption TEXT into every status member (${texts.filter(Boolean).length}/${members.length})`);
    const captions = texts.map((t) => String(t?.characters ?? '<none>'));
    // THE CANONICAL DEFAULT (#1575, Option 2), authored here — not derived from the def (docs/34). `WANT[0]`
    // is the one caption every bound member displays; `planSetProperties` declares it as the property's default.
    const WANT = ['This is a status message.'];

    // FLOOR (1): the set carries ONE TEXT property, and its default is the canonical caption — the cell every
    // bound member reads. This is the assertion the live "All set." everywhere would have failed.
    const defs = set.componentPropertyDefinitions as Record<string, { type: string; defaultValue?: unknown }>;
    const textKeys = Object.keys(defs ?? {}).filter((k) => defs[k].type === 'TEXT');
    ok(textKeys.length === 1 && defs[textKeys[0]].defaultValue === WANT[0],
      `#1513 floor: the set carries exactly ONE TEXT property and its default is the canonical caption "${WANT[0]}" (${textKeys.length} TEXT propert(ies), holding ${JSON.stringify(textKeys.map((k) => defs[k].defaultValue))})`);

    // FLOOR (2): the def declares ONE caption — no `byVariant` spread (Option 2, #1575). Without this floor,
    // "every member reads one string" is trivially true of any def; with it, a re-added `byVariant` fails
    // here by name.
    const declared = plans.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- walking the plan tree for the text part
      const walk = (n: any): any => (n?.characters !== undefined ? n : (n?.children ?? []).map((c: any) => walk(c)).find(Boolean));
      return String(walk(p.root)?.characters);
    });
    ok(new Set(declared).size === 1 && declared[0] === WANT[0],
      `#1575 floor: the def declares ONE caption across all four status members, not a spread (${[...new Set(declared)].join(' | ')})`);

    // FLOOR (3): WRITE-THROUGH is live. One member's caption write moves EVERY sibling's, which is the host
    // behavior that makes the per-member re-assert destructive rather than merely ineffective.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural write onto the shim node
    const probe = texts[1] as any;
    const otherBefore = String(texts[2].characters);
    probe.characters = 'sentinel — should reach every sibling';
    ok(otherBefore === WANT[0] && String(texts[2].characters) === 'sentinel — should reach every sibling'
      && String(defs[textKeys[0]].defaultValue) === 'sentinel — should reach every sibling',
      '#1513 floor: writing ONE bound member\'s caption moves every sibling AND the set-level default — '
      + `write-through is live, so a per-member caption is not expressible (sibling was "${otherBefore}", now "${String(texts[2].characters)}")`);

    // THE FIX, HALF ONE: the executor leaves that one cell holding the DECLARED default, so every member shows
    // the canonical caption deterministically — not, as before, whichever member the re-assert loop wrote last.
    // (`captions` was read before the FLOOR (3) probe.)
    ok(captions.every((c) => c === WANT[0]),
      `#1513/#1567: every field-message member reads the set's ONE declared default, deterministically — not the last member's caption clobbered over the rest (${captions.join(' | ')})`);

    // THE FIX, HALF TWO: the executor's OWN independent check agrees. `write-components.ts` re-reads
    // `set.componentPropertyDefinitions` after the wire phase — a different object, at a later time, than
    // anything it wrote (docs/34: the old read-back compared the value it had just written against the node it
    // had just written to, so it could never fire) — and reports `-> DRIFTED` if the set no longer holds the
    // declared default. Zero DRIFTED is the assertion the live "All set." everywhere would have failed.
    const drifted = res.misses.filter((m) => /-> DRIFTED/.test(m));
    ok(drifted.length === 0,
      `#1567: the executor's independent re-read of the SET's property definitions finds no drifted default (${drifted.length ? drifted.join(' | ') : 'none'})`);

    // THE RESOLVED STATE: field-message declares ONE caption, so there is nothing to collapse — the executor
    // reports NO `COLLAPSED` miss for it. (The mechanism that catches a def which DOES declare a spread is
    // guarded on a synthetic def below, so this is not a silent gate deletion.)
    const collapse = res.misses.filter((m) => /text\.characters -> COLLAPSED/.test(m));
    ok(collapse.length === 0,
      `#1575: field-message declares one caption, so the executor reports NO collapse (${collapse.length ? collapse.join(' | ') : 'none'})`);
  }

  // THE SAFETY NET STAYS GUARDED (docs/34): a SYNTHETIC def that re-adds divergent captions on the bound
  // `text` part must still trip the executor's #1567 collapse report BY NAME — so the mechanism a future
  // mis-authored def would need is proven live, not deleted with the four-caption spread that used to
  // exercise it. Cloning field-message and re-adding only `byVariant` keeps the synthetic minimal and real.
  const base = componentDefs.find((d) => d.id === 'field-message');
  if (base?.figmaProperties) {
    const SPREAD = { error: 'Something needs fixing.', warning: 'Double-check this.', success: 'All set.' };
    const synthetic = {
      ...base,
      figmaProperties: {
        ...base.figmaProperties,
        texts: { message: { part: 'label', default: 'This is a status message.', byVariant: { status: SPREAD } } },
      },
    } as typeof base;
    const plans = figmaAnatomySet(synthetic, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    const res = await applyComponentPlan(plans, shim as any, {});
    const collapse = res.misses.filter((m) => /label\.characters -> COLLAPSED/.test(m));
    ok(collapse.length === 1 && collapse[0].includes('distinct captions'),
      `#1575 safety net: a def that DECLARES divergent captions on the bound part still trips the collapse report by name (${collapse.length} miss(es): ${collapse[0] ?? '—'})`);
  }
}

// ── #1516: AN ASYNC MEMBER-SETTLE DURING THE WIRE PHASE LEAVES NO PROPERTY-REFERENCE MISS — HOST-TRUTH ─
//
// #1473 recovers a member whose identity the host reassigns AT COMBINE by re-resolving it from a
// live-member map the executor snapshots after the layout `resize` — on the premise that once every
// set-level op has run, the reconciliation is done. #1516 is the instant that premise misses: the host
// finishes reassigning SOME members' identity ASYNCHRONOUSLY, only DURING the wire loop — after that
// snapshot, on one of the loop's `await breathe` yields. A recovery through the once-snapshotted map lands
// on the detached original and Figma refuses the reference AGAIN ("Could not create a new component
// property reference"), so the miss is permanent. Live it concentrated on the LAST-wired coordinates —
// field-label `state=disabled` (~30), text-field `status=warning` / `state=disabled` (~33), select (36
// earlier) — the members reached after the most yields (QA 2026-09-18). The fix reads `set.children` FRESH
// at each use rather than from a snapshot (`liveMember`, write-components.ts), so a settle that lands at
// any point in the loop is seen by the next resolution.
//
// The shim's `deferSettleToWire` models the host behavior (see `component-shim.ts`): it HOLDS the
// member-level settle past `resize`/`addComponentProperty` — past the executor's snapshot — and fires it
// on the wire loop's first ref write, detaching every original. This asserts ZERO property-reference misses
// against the executor's OWN misses collection (the `misses.push('ref …')` path the issue's acceptance
// names), and independently reads the references back through `anatomy-readback.ts` — a reader separate
// from the executor (docs/34). Mutation-by-name: revert the fresh `liveMember` read to a one-time snapshot
// and every member reports `ref …/… -> … (Could not create a new component property reference)`, failing
// the miss assertion by name (the message surfaces the failing coordinates, disabled/warning first). The
// FLOOR (`refsRepaired === refs > 0`) proves the deferred settle actually detached every reference —
// without it there is nothing to recover and a clean miss list is vacuous.
{
  const DEFS = ['field-label', 'text-field', 'select'];
  // A property-REFERENCE wiring miss — the two `misses.push('ref …')` sites (the wire-loop throw recovery
  // and the read-back DISCARDED), exactly the class #1516 names. Bound-variable ('bound …') and text
  // ('text …') misses are a different push path and out of scope here.
  const refMissesOf = (misses: string[]): string[] => misses.filter((m) => m.startsWith('ref '));
  // Surface the #1516 symptom coordinates (disabled / warning) first, so a reverted fix names them.
  const symptomFirst = (a: string, b: string): number =>
    Number(/state=disabled|status=warning/.test(b)) - Number(/state=disabled|status=warning/.test(a));
  for (const id of DEFS) {
    const def = componentDefs.find((d) => d.id === id);
    ok(!!def, `#1516 host-truth: the ${id} def is registered and projects`);
    if (!def) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page, deferSettleToWire: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    const res = await applyComponentPlan(plans, shim as any, {});
    // FLOOR: the deferred settle actually fired — every reference was detached at wire time and recovered
    // through the member-level recovery. refsRepaired === refs (> 0) proves the shim modelled a REAL
    // settle, so a clean miss list below is the fix defeating it rather than a shim that never settled.
    ok(res.refsRepaired > 0 && res.refsRepaired === res.refs,
      `#1516 floor: ${id}'s wire-phase settle detached and the fix recovered every reference (refsRepaired=${res.refsRepaired}/${res.refs})`);
    // THE FIX, against the executor's OWN misses collection (the issue's acceptance): ZERO property-
    // reference misses across the full projection. Message names the failing coordinate(s) — a reverted fix
    // fails BY NAME (docs/34), disabled/warning surfaced first.
    const refMisses = refMissesOf(res.misses).sort(symptomFirst);
    ok(res.wiredMembers === plans.length && refMisses.length === 0,
      `#1516: ${id} projects with ZERO set_componentPropertyReferences misses across all ${plans.length} members (wiredMembers=${res.wiredMembers}/${plans.length}; ${refMisses.length ? `${refMisses.length} miss(es): ${refMisses.slice(0, 3).join(' | ')}` : 'none'})`);
    // INDEPENDENT READ-BACK (docs/34): a reader separate from the executor confirms every declared reference
    // is retained on the SETTLED set — 0 propertyRef DISCARDED.
    const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
    const texts = await (shim as unknown as { getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalTextStylesAsync();
    const varById = new Map(vars.map((v) => [v.id, v.name] as const));
    const styleById = new Map(texts.map((s) => [s.id, s.name] as const));
    const ports: ReadPorts = { varName: (idv) => varById.get(idv) ?? null, styleName: (idv) => styleById.get(idv) ?? null };
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const divergences = diffAnatomy(plans, members, planComponentName, ports, {});
    const refDiv = divergences.filter((d) => d.field === 'propertyRef' || d.field === 'visibleProp' || d.field === 'visible');
    ok(members.length === plans.length && refDiv.length === 0,
      `#1516 host-truth: reading the settled ${id} back, every declared reference is retained — 0 propertyRef DISCARDED (${refDiv.length ? refDiv.slice(0, 3).map((d) => `${d.member}: ${d.actual}`).join(' | ') : 'none'})`);
  }
}

// ── #1568: A TRANSIENT REFERENCE REFUSAL IS RETRIED AFTER A YIELD, NOT RECORDED AS A MISS — HOST-TRUTH ─
//
// Live, text-field reported 45 `set_componentPropertyReferences` misses — all "Could not create a new component
// property reference", all on 5 of its 20 members (QA 2026-09-21). #1568 read that as the #1516 detach reaching
// members that `liveMember` still could not recover, i.e. a permanent, IDENTITY-keyed refusal. The host says
// otherwise (measured 2026-09-22): those 20 members' node ids were perfectly sequential — `4769, 4783 … 5067`,
// gaps of 16–17 and not one out of order — so NOTHING was replaced, and the 5 refusals were CONTIGUOUS in wire
// order with the 6th member succeeding. Identity was never the variable. TIME was.
//
// That is a shape none of the three existing settle modes can express, and the distinction is not academic: all
// three are permanent and identity-keyed, so their fix is "re-find a DIFFERENT node" — which is exactly why the
// in-loop #1337/#1473 recovery is gated on `if (live && live !== node)` and can never see this. A refusal that
// clears on its own leaves `live === node`, the guard declines, and the reference is written off. The fix is a
// single cause-independent pass: queue every reference the wire loop could not place, `await yieldTo()` ONCE,
// and try each again on a freshly-resolved node. Cause-independent is the point — the executor does not need to
// know WHY the host refused, only that a host yield is the one thing it has not yet tried.
//
// `refuseRefsUntilYield` (component-shim.ts) models it: named members refuse the FIRST ref write with the host's
// own message and schedule their own release on a macrotask, so the refusal survives a same-task retry and not a
// yielded one. The oracle is authored HERE — zero `ref …` misses and every reference present on the independent
// read-back. The FLOOR is a PAIRED run (docs/34): the same projection with no refusal must report
// `refsRepaired === 0`, so the repair count in the refusing run is attributable to the injected refusal and not
// to some other recovery that would have run anyway. Mutation-by-name: delete the deferred pass in
// `write-components.ts` and this arm reports `ref text-field …/… -> … (Could not create a new component property
// reference)` by name, on the refused coordinates.
{
  const def = componentDefs.find((d) => d.id === 'text-field');
  ok(!!def, '#1568 host-truth: the text-field def is registered and projects');
  if (def) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    // The injected FAULT (not the oracle): a contiguous run of members in wire order, the host's own shape.
    const REFUSING = plans.slice(0, 5).map((p) => planComponentName(p));

    const run = async (refuse: string[]): Promise<{ page: Page; res: Awaited<ReturnType<typeof applyComponentPlan>> }> => {
      const page: Page = { children: [] };
      const shim = makeShim({ ...fullFor(plans), page, refuseRefsUntilYield: refuse });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
      return { page, res: await applyComponentPlan(plans, shim as any, {}) };
    };

    const clean = await run([]);
    const refused = await run(REFUSING);

    // FLOOR (1): with no refusal injected, nothing is repaired. Without this the assertions below could be
    // green on a projection that never needed the deferred pass at all.
    ok(clean.res.refsRepaired === 0 && clean.res.refs > 0,
      `#1568 floor: the un-refused control projection repairs NOTHING (refsRepaired=${clean.res.refsRepaired}/${clean.res.refs}) — the repair count below is attributable to the injected refusal`);
    // FLOOR (2): the injected refusal really fired, and on the 5 members the host refused — so a clean miss
    // list is the fix defeating a REAL refusal rather than a shim that never refused.
    ok(refused.res.refsRepaired > 0,
      `#1568 floor: the transient refusal fired and the deferred pass recovered it (refsRepaired=${refused.res.refsRepaired}/${refused.res.refs} across ${REFUSING.length} refusing members: ${REFUSING.join(', ')})`);

    // THE FIX, against the executor's OWN misses collection (the issue's acceptance — the live 45): ZERO
    // property-reference misses. Message names the refused coordinates, so a reverted fix fails BY NAME.
    const refMisses = refused.res.misses.filter((m) => m.startsWith('ref '));
    ok(refused.res.wiredMembers === plans.length && refMisses.length === 0,
      `#1568: a transient reference refusal leaves ZERO set_componentPropertyReferences misses across all ${plans.length} text-field members (wiredMembers=${refused.res.wiredMembers}/${plans.length}; ${refMisses.length ? `${refMisses.length} miss(es): ${refMisses.slice(0, 3).join(' | ')}` : 'none'})`);

    // INDEPENDENT READ-BACK (docs/34): a reader separate from the executor confirms the references are really
    // ON the nodes — not merely that the executor stopped complaining.
    const shimOf = refused.page;
    const members = (shimOf.children[0]?.children ?? []) as unknown as HostNode[];
    ok(members.length === plans.length, `#1568 scope floor: every text-field member was built (${members.length}/${plans.length})`);
    const ports: ReadPorts = { varName: () => null, styleName: () => null };
    const refDiv = diffAnatomy(plans, members, planComponentName, ports, {}).filter((d) => d.field === 'propertyRef');
    ok(refDiv.length === 0,
      `#1568 host-truth: reading the refused projection back, every declared reference is present on its node — 0 propertyRef DISCARDED (${refDiv.length ? refDiv.slice(0, 3).map((d) => `${d.member}: ${d.actual}`).join(' | ') : 'none'})`);
  }
}


// ── #1670: THE SPINNER, BUILT AND READ BACK — HOST-TRUTH ─────────────────────────────────────────────
// The owner's spec, checked on what the executor LEFT on the nodes rather than on the plan: four standalone
// `spinner/<size>` components, each holding a track and an arc; the track at 20% LAYER opacity (the one
// property a host's ink rebind does not reset, so the executor's defaults pass must not reset it either),
// the arc at full strength, and both layers inked with the same bound color.
{
  const def = componentDefs.find((d) => d.id === 'spinner')!;
  const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(plans), page });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  const res = await applyComponentPlan(plans, shim as any, { emitAsComponents: true });
  const comps = page.children.map((c) => String((c as { name?: string }).name)).sort();
  ok(res.misses.length === 0 && JSON.stringify(comps) === JSON.stringify(['spinner/large', 'spinner/medium', 'spinner/small', 'spinner/x-small']),
    `#1670 spinner: builds clean as four standalone components (${comps.join(', ')}${res.misses.length ? `; misses: ${res.misses.slice(0, 3).join(' | ')}` : ''})`);
  type V = { type?: string; name?: string; opacity?: number; fills?: { boundVariables?: { color?: { id?: string } } }[]; children?: V[] };
  const vecs = (n: V): V[] => [...(n.type === 'VECTOR' ? [n] : []), ...(n.children ?? []).flatMap(vecs)];
  for (const c of page.children as unknown as V[]) {
    const vs = vecs(c);
    const track = vs.find((v) => v.name === 'track'), arc = vs.find((v) => v.name === 'arc');
    const inkOf = (v?: V) => v?.fills?.[0]?.boundVariables?.color?.id;
    ok(vs.length === 2 && track?.opacity === 0.2 && (arc?.opacity ?? 1) === 1,
      `#1670 ${c.name}: the track keeps its 20% layer opacity through the build and the arc draws at full strength (track ${track?.opacity}, arc ${arc?.opacity ?? 'unset'}, ${vs.length} vectors)`);
    ok(!!inkOf(track) && inkOf(track) === inkOf(arc),
      `#1670 ${c.name}: the track and the arc bind the same color variable (${inkOf(track) ?? 'unbound'} / ${inkOf(arc) ?? 'unbound'})`);
  }
}

// ── #1751: 'fill' FILLS — the textarea message row, built and measured on the host shim ────────────────
// The owner's intent, checked on GEOMETRY the shim's layout model computes from what the executor left on
// the nodes: the message row spans the field, the message cell grows and its text wraps, the counter cell
// hugs and sits at the row's right edge — with the message on, long, or off. Expected values are the
// control's measured width and the caption's line box, never read off the def or the plan.
{
  const CAPTION = 'caption/md/default';
  const LINE = 16;
  const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: SWAP_TARGET });
  const all = componentDefs.flatMap((d) => { try { return project(d); } catch { return []; } });
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(all), comps: [], liveRoot: true, page, layoutModel: true, textLineBox: { [CAPTION]: LINE } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  const build = (d: ComponentDef) => applyComponentPlan(project(d), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents });
  const textarea = componentDefs.find((d) => d.id === 'textarea')!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural
  await prebuildDependencies(textarea, { defs: componentDefs, project, host: shim as any, build });
  const r = await build(textarea);
  const set = page.children.find((c) => c.name === 'textarea' && c.type === 'COMPONENT_SET') as Node | undefined;
  const members = (set?.children as Node[] | undefined) ?? [];
  ok(members.length > 0 && r.misses.length === 0, `#1751 seed: textarea builds on the layout-model shim with 0 misses (${members.length} members; ${r.misses[0] ?? 'none'})`);
  const find = (n: Node | undefined, name: string): Node | undefined => {
    if (!n) return undefined;
    if (n.name === name) return n;
    for (const c of (n.children as Node[] | undefined) ?? []) { const f = find(c, name); if (f) return f; }
    return undefined;
  };
  const W = (n: Node | undefined) => (n?.width as number) ?? NaN;
  const X = (n: Node | undefined) => (n?.x as number) ?? NaN;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const LONG = 'The message under a field can run long, and when it does it wraps inside its cell beside the counter.'.padEnd(120, '.');
  const span: string[] = [], wrap: string[] = [], alone: string[] = [];
  for (const m of members) {
    const ctl = find(m, 'control'), row = find(m, 'messageRow'), mc = find(m, 'messageCell'), cc = find(m, 'counterCell');
    const msg = find(m, 'message') as (Node & { _main?: Node }) | undefined;
    const text = find(msg?._main ?? msg, 'label');
    if (!ctl || !row || !mc || !cc || !text) { const why = `${m.name}: incomplete (${[ctl, row, mc, cc, text].map((n) => (n ? 1 : 0)).join("")}; message ${msg?.type}, main ${msg?._main?.type}:${JSON.stringify(((msg?._main?.children as Node[] | undefined) ?? []).map((c) => c.name))})`; span.push(why); wrap.push(why); alone.push(why); continue; }
    // Both switches on, as a designer sets them: the message cell is built hidden since #2926, the counter's always.
    mc.visible = true;
    cc.visible = true;
    const edge = () => `row ${W(row)} / field ${W(ctl)}; counter ${X(cc)}+${W(cc)}; message ${X(mc)}+${W(mc)}`;
    if (!(near(W(row), W(ctl)) && near(X(cc) + W(cc), W(row)) && X(mc) + W(mc) <= X(cc) + 1e-6)) span.push(`${m.name}: ${edge()}`);
    const was = text.characters;
    text.characters = LONG;
    const h = (msg!.height as number) ?? 0;
    if (!(h >= 2 * LINE && near(X(cc) + W(cc), W(row)) && near(W(row), W(ctl)))) wrap.push(`${m.name}: message ${h} tall; ${edge()}`);
    text.characters = was;
    mc.visible = false;
    if (!near(X(cc) + W(cc), W(row))) alone.push(`${m.name}: ${edge()}`);
    mc.visible = true;
    cc.visible = false;
  }
  ok(members.length > 0 && span.length === 0,
    `#1751 textarea row spans the field: with the counter on, on every member the message row is as wide as the control, the counter's right edge is the row's right edge, and the message ends before the counter starts (${span.length} off — ${span[0] ?? 'none'})`);
  ok(members.length > 0 && wrap.length === 0,
    `#1751 textarea message wraps: a ${LONG.length}-character message wraps to ≥2 caption lines (≥${2 * LINE}px) through the nested field-message, and the counter stays at the right edge (${wrap.length} off — ${wrap[0] ?? 'none'})`);
  ok(members.length > 0 && alone.length === 0,
    `#1751 textarea counter alone: with the message off, the counter still sits at the row's right edge (${alone.length} off — ${alone[0] ?? 'none'})`);
  // A COLUMN that fills across and hugs down: the messageCell (direction column, x:'fill', y:'hug'). Its
  // primary axis is y, so it must read AUTO primary / FIXED counter — the swap reads FIXED primary.
  const cols = members.map((m) => find(m, 'messageCell'));
  ok(members.length > 0 && cols.every((c) => c && c.layoutMode === 'VERTICAL' && c.primaryAxisSizingMode === 'AUTO' && c.counterAxisSizingMode === 'FIXED'),
    `#1751 column fill/hug: the vertical messageCell (x:'fill', y:'hug') reads back hug on its primary (y) axis and FIXED on its counter (x) axis, on every member (${cols.map((c) => `${c?.layoutMode} p:${c?.primaryAxisSizingMode} c:${c?.counterAxisSizingMode}`)[0]})`);
}

// ── #1757: WHERE TEXT WRAPS, AND WHAT A LONG VALUE DOES — the field family, built and measured ───────────
// The independent review's findings and the owner's three decisions, each checked on GEOMETRY the shim's
// layout model computes from what the executor left on the nodes:
//   · the label and the message wrap at the FIELD's width — they track it when it is wider than its 320
//     floor, so a stretch that went missing cannot pass on the build width alone;
//   · a bare field-message and field-label wrap at their own 320 build width, not at the ~150px their
//     default string left a hugging root (the review's blocking finding);
//   · select's value wraps and the control grows taller, never drawing over the chevron;
//   · text-field's value clips inside `content` and never draws over the trailing slot.
// Expected numbers are the control's measured width, a line box the case chooses, and 6px per character
// (the shim's advance); none is read off a def or a plan. The line box is 40 so two lines (80) clear any
// glyph floor the shim can bind (≤ 32), and a 70-character string (420px) is two lines at any width from
// 210 to 419 and three at 150 — the two readings this block tells apart.
{
  const LINE = 40;
  const WIDER = 400;
  const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: SWAP_TARGET });
  const all = componentDefs.flatMap((d) => { try { return project(d); } catch { return []; } });
  const lineBox = Object.fromEntries([...new Set(all.flatMap((p) => planTextStyles(p.root)))].map((s) => [s, LINE]));
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(all), comps: [SWAP_TARGET], liveRoot: true, page, layoutModel: true, textLineBox: lineBox });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  const build = (d: ComponentDef) => applyComponentPlan(project(d), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents });
  const built = new Set<string>();
  const setOf = async (id: string): Promise<Node[]> => {
    const d = componentDefs.find((x) => x.id === id)!;
    if (!built.has(id)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural
      await prebuildDependencies(d, { defs: componentDefs, project, host: shim as any, build });
      const r = await build(d);
      ok(r.misses.length === 0, `#1757 seed: ${id} builds on the layout-model shim with 0 misses (${r.misses[0] ?? 'none'})`);
      built.add(id);
      for (const c of page.children) if (c.type === 'COMPONENT_SET') built.add(String(c.name));
    }
    const set = page.children.find((c) => c.name === id && c.type === 'COMPONENT_SET') as Node | undefined;
    return (set?.children as Node[] | undefined) ?? [];
  };
  const find = (n: Node | undefined, name: string): Node | undefined => {
    if (!n) return undefined;
    if (n.name === name) return n;
    for (const c of (n.children as Node[] | undefined) ?? []) { const f = find(c, name); if (f) return f; }
    return undefined;
  };
  const W = (n: Node | undefined) => (n?.width as number) ?? NaN;
  const H = (n: Node | undefined) => (n?.height as number) ?? NaN;
  const X = (n: Node | undefined) => (n?.x as number) ?? NaN;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const LONG = 'x'.repeat(70);
  const mainOf = (n: Node | undefined) => (n as (Node & { _main?: Node }) | undefined)?._main;
  // A designer's resize of a member: the host's `resize`, on the FIXED-across root the executor built. Each
  // caller puts back the width it MEASURED, never a literal 320 — a restore to 320 would mask a root that was
  // not built at its placement width from every block after it (#2292's own mutation found that).
  const widen = (m: Node, w: number) => (m.resize as (w: number, h: number) => void)(w, H(m));

  // ---- the nested MESSAGE tracks the FIELD's width, and wraps at it (the label is below, #1762) ----
  // Each host's control is measured at the field's 320 build width and again with the field widened to 400 (a
  // designer's resize of the component). Since #2292 the control FILLS the root rather than carrying the
  // width, so the widening is the root's resize, not a raised floor on the control (which a FIXED 320 root
  // would now overflow rather than follow); the nested instance must be as wide as the control both times. The long string goes on the nested
  // component's own text, so the instance's height is the text reflowed at the instance's width.
  const nestedWraps = async (host: string, part: string, textName: string) => {
    const members = await setOf(host);
    const off: string[] = [];
    for (const m of members) {
      const ctl = find(m, 'control');
      const inst = find(m, part);
      const text = find(mainOf(inst), textName);
      if (!ctl || !inst || !text) { off.push(`${m.name}: incomplete`); continue; }
      const was = text.characters;
      text.characters = LONG;
      const at320 = [W(ctl), W(inst), H(inst)];
      const built = W(m);
      widen(m, WIDER);
      const at400 = [W(ctl), W(inst)];
      widen(m, built);
      text.characters = was;
      if (!(near(at320[0], 320) && near(at320[1], at320[0]) && near(at320[2], 2 * LINE) && near(at400[0], WIDER) && near(at400[1], WIDER)))
        off.push(`${m.name}: at 320 the control is ${at320[0]}, the ${part} ${at320[1]} wide and ${at320[2]} tall; widened, ${at400[0]} and ${at400[1]}`);
    }
    ok(members.length > 0 && off.length === 0,
      `#1757 ${host} ${part} wraps at the field's width: on every member the ${part} is as wide as the control (320, and 400 when widened) and a ${LONG.length}-character ${part} is two ${LINE}px lines (${off.length} off — ${off[0] ?? 'none'})`);
  };
  await nestedWraps('text-field', 'message', 'label');
  await nestedWraps('select', 'message', 'label');

  // ---- the nested LABEL stretches with the field, and its name wraps at field-label's 316 (#1762) ----
  // #1757 had the label's name wrap at the field's width. Since #1762 the name hugs and wraps at a max width
  // on the main component (320 less the 4px marker gap), so the INSTANCE still stretches with the control —
  // 320, and 400 when widened — while the NAME stays 316 wide on two lines both times. That second half is the
  // owner's accepted tradeoff, pinned here: a field stretched wider does not move the wrap point.
  const nestedLabelWraps = async (host: string) => {
    const members = await setOf(host);
    const off: string[] = [];
    for (const m of members) {
      const ctl = find(m, 'control');
      const inst = find(m, 'label');
      const text = find(mainOf(inst), 'label');
      if (!ctl || !inst || !text) { off.push(`${m.name}: incomplete`); continue; }
      const was = text.characters;
      text.characters = LONG;
      const at320 = [W(ctl), W(inst), W(text), H(text)];
      const built = W(m);
      widen(m, WIDER);
      const at400 = [W(ctl), W(inst), W(text), H(text)];
      widen(m, built);
      text.characters = was;
      if (!(near(at320[0], 320) && near(at320[1], 320) && near(at320[2], 316) && near(at320[3], 2 * LINE)
        && near(at400[0], WIDER) && near(at400[1], WIDER) && near(at400[2], 316) && near(at400[3], 2 * LINE)))
        off.push(`${m.name}: at 320 the control/label/name are ${at320.slice(0, 3).join('/')} wide and the name ${at320[3]} tall; widened, ${at400.slice(0, 3).join('/')} and ${at400[3]}`);
    }
    ok(members.length > 0 && off.length === 0,
      `#1762 ${host} label stretches with the field but its name wraps at 316: on every member the label instance is as wide as the control (320, and 400 when widened), and a ${LONG.length}-character name stays 316 wide on two ${LINE}px lines both times (${off.length} off — ${off[0] ?? 'none'})`);
  };
  await nestedLabelWraps('text-field');
  await nestedLabelWraps('select');

  // ---- a BARE field-message / field-label wraps at its 320 build width, not at its default string's ----
  const bareWraps = async (id: string) => {
    const members = await setOf(id);
    const off: string[] = [];
    for (const m of members) {
      const text = find(m, 'label');
      if (!text) { off.push(`${m.name}: no text`); continue; }
      const was = text.characters;
      text.characters = LONG;
      const got = [W(m), W(text), H(m)];
      text.characters = was;
      if (!(near(got[0], 320) && got[1] > 210 && near(got[2], 2 * LINE))) off.push(`${m.name}: ${got[0]} wide, text ${got[1]} wide, ${got[2]} tall`);
    }
    ok(members.length > 0 && off.length === 0,
      `#1757 bare ${id} does not wrap at its default string's width: on every member the component is 320 wide, the text is over 210 of it, and a ${LONG.length}-character string is two ${LINE}px lines, not three at ~150px (${off.length} off — ${off[0] ?? 'none'})`);
  };
  await bareWraps('field-message');
  await bareWraps('field-label');

  // ---- a LONG VALUE: select wraps and grows, text-field clips; neither draws over its trailing glyph ----
  const VALUE50 = 'x'.repeat(50);
  {
    const members = await setOf('select');
    const off: string[] = [];
    for (const m of members) {
      const ctl = find(m, 'control'), content = find(m, 'content'), chevron = find(m, 'chevronGlyph');
      const text = find(content, 'value') ?? find(content, 'placeholder');
      if (!ctl || !content || !chevron || !text) { off.push(`${m.name}: incomplete`); continue; }
      const was = text.characters;
      const oneLine = H(ctl);
      text.characters = VALUE50;
      const right = X(content) + X(text) + W(text);
      const got = { ctl: W(ctl), h: H(ctl), right, chevron: X(chevron), lines: H(text) / LINE };
      text.characters = was;
      if (!(near(got.ctl, 320) && got.h > oneLine && got.lines >= 2 && got.right <= got.chevron + 1e-6))
        off.push(`${m.name}: control ${got.ctl} wide, ${oneLine} → ${got.h} tall; the value is ${got.lines} lines and ends at ${got.right}, the chevron starts at ${got.chevron}`);
    }
    ok(members.length > 0 && off.length === 0,
      `#1757 select long value wraps: on every member a ${VALUE50.length}-character value wraps to ≥2 lines, the control stays 320 wide and grows taller, and the value ends before the chevron starts (${off.length} off — ${off[0] ?? 'none'})`);
  }
  {
    const members = await setOf('text-field');
    const off: string[] = [];
    for (const m of members) {
      const ctl = find(m, 'control'), content = find(m, 'content'), entry = find(m, 'entry'), trailing = find(m, 'trailingVisual');
      const text = find(entry, 'value') ?? find(entry, 'placeholder');
      if (!ctl || !content || !entry || !trailing || !text) { off.push(`${m.name}: incomplete`); continue; }
      const was = [text.characters, trailing.visible];
      text.characters = VALUE50;
      trailing.visible = true;
      const got = { ctl: W(ctl), clips: content.clipsContent, edge: X(content) + W(content), entry: W(entry), content: W(content), trailing: X(trailing) };
      text.characters = was[0];
      trailing.visible = was[1];
      // The value's run is WIDER than `content` (so something has to give), `content` holds its width
      // and ends before the trailing slot, and it clips what runs past it.
      if (!(near(got.ctl, 320) && got.clips === true && got.entry > got.content && got.edge <= got.trailing + 1e-6))
        off.push(`${m.name}: control ${got.ctl}; content ${got.content} wide (clips ${String(got.clips)}), ends at ${got.edge}; the value runs ${got.entry}; trailing slot at ${got.trailing}`);
    }
    ok(members.length > 0 && off.length === 0,
      `#1757 text-field long value clips: on every member a ${VALUE50.length}-character value runs past \`content\`, which holds its width, clips it, and ends before the trailing slot; the control stays 320 wide (${off.length} off — ${off[0] ?? 'none'})`);
  }

  // ---- #2292: a field INSTANCE set to FILL its column stretches the bordered box with it ----
  // A design-rebuild test found the label and message spanning a 505px form column while the input box stopped
  // at 320: the control held the field's floor, so it hugged rather than filled. Each field's root is now
  // built at 320 and the control fills it. Measured here as a consumer places a field: an INSTANCE of every
  // member, appended to a 505px auto-layout column and set to fill it (Figma's `layoutSizingHorizontal:
  // 'FILL'` on a column child is `layoutAlign: 'STRETCH'` plus the instance's own FIXED width), and the box
  // read off the main laid out at the instance's width (the shim's own model of an instance's interior, as
  // its height getter does). Expected values are literals: 505 placed, 320 unplaced, and 320 in a 280px
  // column (the floor holds; the box overflows the column, as it did before). Nested-instance stretch on a
  // live host is the standing caveat — the PR lists the live check.
  {
    const COLUMN = 505;
    const NARROW = 280;
    // #2266 (Q99 B): under the 120 floor the box stops shrinking and overflows the column.
    const NARROWER = 100;
    const placedAt = (memberName: string, setName: string, column: number) => {
      // Looked up per call: a set this block builds (textarea) is not in the file until `setOf` builds it.
      const sets = shim.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as { name: string; children?: { name: string; createInstance?: () => Node }[] }[];
      const ref = sets.find((s) => s.name === setName)?.children?.find((c) => c.name === memberName);
      const inst = ref?.createInstance?.();
      if (!inst) return undefined;
      const host = (shim as unknown as { createFrame: () => Node }).createFrame();
      host.layoutMode = 'VERTICAL';
      host.counterAxisSizingMode = 'FIXED';
      (host.resize as (w: number, h: number) => void)(column, 100);
      (host.appendChild as (c: Node) => void)(inst);
      inst.layoutAlign = 'STRETCH';
      inst.counterAxisSizingMode = 'FIXED';
      return inst;
    };
    // The box inside an instance, measured on the main laid out at the instance's width.
    const inside = (inst: Node, name: string): number => {
      const main = mainOf(inst)!;
      main._forcedWidth = W(inst);
      try { return W(find(main, name)); } finally { delete main._forcedWidth; }
    };
    for (const id of ['text-field', 'select', 'textarea']) {
      const members = await setOf(id);
      const off: string[] = [];
      for (const m of members) {
        const unplaced = [W(m), W(find(m, 'control'))];
        const wide = placedAt(String(m.name), id, COLUMN);
        const narrow = placedAt(String(m.name), id, NARROW);
        const narrower = placedAt(String(m.name), id, NARROWER);
        if (!wide || !narrow || !narrower) { off.push(`${m.name}: no instance`); continue; }
        const placed = [W(wide), inside(wide, 'control'), inside(wide, 'label'), inside(wide, id === 'textarea' ? 'messageRow' : 'message')];
        const tight = inside(narrow, 'control');
        const floor = inside(narrower, 'control');
        if (!(unplaced[0] === 320 && unplaced[1] === 320 && placed.every((w) => w === COLUMN) && tight === NARROW && floor === 120))
          off.push(`${m.name}: unplaced root/control ${unplaced.join('/')}; in a ${COLUMN} column instance/control/label/${id === 'textarea' ? 'messageRow' : 'message'} ${placed.join('/')}; in ${NARROW}, control ${tight}; in ${NARROWER}, control ${floor}`);
      }
      ok(members.length > 0 && off.length === 0,
        `#2292 ${id} fills its column: on every member an unplaced field reads 320 (root and box), an instance set to FILL a ${COLUMN}px column has its input box, label and ${id === 'textarea' ? 'message row' : 'message'} at ${COLUMN}, in a ${NARROW}px column the box shrinks to ${NARROW} (#2266, Q99 B), and in a ${NARROWER}px column it holds its 120 floor (${members.length} members, ${off.length} off — ${off[0] ?? 'none'})`);
    }
    // Q152.3 (Q99 B reaches the rows): checkbox-row and radio-row are built at 320 and shrink with their column to
    // the same 120 floor. The row IS the root, so the instance's own width is the row's, and the label, which fills
    // the row, is the row less its control box and one gap. Literals: 320, 505, 280, and 120 in a 100px column.
    for (const id of ['checkbox-row', 'radio-row']) {
      const members = await setOf(id);
      const off: string[] = [];
      for (const m of members) {
        const wide = placedAt(String(m.name), id, COLUMN);
        const narrow = placedAt(String(m.name), id, NARROW);
        const narrower = placedAt(String(m.name), id, NARROWER);
        if (!wide || !narrow || !narrower) { off.push(`${m.name}: no instance`); continue; }
        // A row's width is its MAIN axis, so FILL sets the instance's primary mode where a field's sets its counter.
        for (const inst of [wide, narrow, narrower]) inst.primaryAxisSizingMode = 'FIXED';
        const label = inside(wide, 'label');
        const widths = [W(m), W(wide), W(narrow), W(narrower)];
        if (!(widths[0] === 320 && widths[1] === COLUMN && widths[2] === NARROW && widths[3] === 120 && label > 320 && label < COLUMN))
          off.push(`${m.name}: unplaced ${widths[0]}; in ${COLUMN}/${NARROW}/${NARROWER} columns ${widths.slice(1).join('/')}; label in ${COLUMN} ${label}`);
      }
      ok(members.length > 0 && off.length === 0,
        `Q152.3 ${id} fills its column: on every member an unplaced row reads 320, an instance set to FILL a ${COLUMN}px column is ${COLUMN} wide with its label filling the rest, in a ${NARROW}px column it shrinks to ${NARROW}, and in a ${NARROWER}px column it holds its 120 floor (${members.length} members, ${off.length} off — ${off[0] ?? 'none'})`);
    }
    // Q155 A: checkbox-group and radio-group follow their rows. A group's root is a COLUMN, so FILL sets the instance's
    // counter mode (the fields' case), and every row inside spans what the group is given. Literals as above.
    for (const id of ['checkbox-group', 'radio-group']) {
      const members = await setOf(id);
      const off: string[] = [];
      for (const m of members) {
        const wide = placedAt(String(m.name), id, COLUMN);
        const narrow = placedAt(String(m.name), id, NARROW);
        const narrower = placedAt(String(m.name), id, NARROWER);
        if (!wide || !narrow || !narrower) { off.push(`${m.name}: no instance`); continue; }
        const widths = [W(m), W(wide), W(narrow), W(narrower)];
        // The rows span the group less its inline padding, `space/0` on both sides: 0px in every brand, but the
        // shim's own synthetic value here (its `varValue`, the harness's input), so it is taken from there.
        const span = COLUMN - 2 * varValue('space/0');
        const rows = ['row1', 'row2', 'row3'].map((r) => inside(wide, r));
        if (!(widths[0] === 320 && widths[1] === COLUMN && widths[2] === NARROW && widths[3] === 120 && rows.every((w) => w === span)))
          off.push(`${m.name}: unplaced ${widths[0]}; in ${COLUMN}/${NARROW}/${NARROWER} columns ${widths.slice(1).join('/')}; rows in ${COLUMN} ${rows.join('/')}`);
      }
      ok(members.length > 0 && off.length === 0,
        `Q155 ${id} fills its column: on every member an unplaced group reads 320, an instance set to FILL a ${COLUMN}px column is ${COLUMN} wide with every row spanning it (less its inline padding), in a ${NARROW}px column it shrinks to ${NARROW}, and in a ${NARROWER}px column it holds its 120 floor (${members.length} members, ${off.length} off — ${off[0] ?? 'none'})`);
    }
  }

  // ---- #2344 → #2649 (owner decision Q307 A): a group holds its rows in a native `items` slot ----
  // Read off the built set: no BOOLEAN property, one SLOT property, `items`; every member holds an `items` SLOT of
  // three rows, none wired to a property, each spanning the group less its inline padding (`space/0`, the shim's
  // synthetic `varValue`). Expected values are literals.
  for (const id of ['checkbox-group', 'radio-group']) {
    const members = await setOf(id);
    const set = page.children.find((c) => c.name === id && c.type === 'COMPONENT_SET') as Node | undefined;
    const defs = (set?.componentPropertyDefinitions ?? {}) as Record<string, { type: string; defaultValue?: unknown }>;
    const props = Object.entries(defs).filter(([, d]) => d.type !== 'VARIANT').map(([k, d]) => `${k.split('#')[0]}:${d.type}`);
    ok(JSON.stringify(props) === JSON.stringify(['items:SLOT']), `#2649 ${id}: the set carries one SLOT property, items, and no row toggle (${props.join(', ')})`);
    const off: string[] = [];
    for (const m of members) {
      const slot = find(m, 'items');
      const rows = ((slot?.children as Node[]) ?? []);
      if (slot?.type !== 'SLOT' || JSON.stringify(rows.map((r) => r.name)) !== JSON.stringify(['row1', 'row2', 'row3'])) { off.push(`${m.name}: items ${String(slot?.type)} holding ${rows.map((r) => r.name).join(',')}`); continue; }
      if (rows.some((r) => ((r.componentPropertyReferences ?? {}) as { visible?: string }).visible || r.visible === false)) off.push(`${m.name}: a row is wired or hidden`);
      const span = W(m) - 2 * varValue('space/0');
      const widths = rows.map((r) => W(r));
      if (!widths.every((w) => w === span)) off.push(`${m.name}: row widths ${widths.join('/')} (want ${span})`);
    }
    // 6 since #2751: `status` (default, error) joins `size`.
    ok(members.length === 6 && off.length === 0,
      `#2649 ${id}: every member holds an items SLOT of three rows, none wired or hidden, each spanning the group (${members.length} members, ${off.length} off — ${off[0] ?? 'none'})`);
  }
}

// ── #1762: THE REQUIRED MARKER FOLLOWS THE NAME, measured on the built field-label ───────────────────
// Owner decision 2026-09-30 (option 3, changing #1757's decision 2): the name hugs and wraps at a max width, so
// the marker sits right after the name's box instead of at the row's trailing edge. Measured here on the
// geometry the shim's layout model computes from what the executor left on the nodes, with the marker switched
// ON. The expected numbers are literals: the shim's 6px advance, the row gap pinned to 4px (`space/050`, the
// px every brand emits), and the 320 build width — none is read off the def or the plan.
//   · a one-line "Label" (5 characters, 30px): the marker's x is 30 + 4 = 34, where a name filling the row
//     puts it at 320 − 6 = 314, the trailing edge the owner saw ("Label ··· *");
//   · a 70-character name (420px): the name clamps at 316 and takes two lines, and the marker sits at
//     316 + 4 = 320 — past the field by its own width, the accepted tradeoff (its width is not subtracted).
// The shim MODELS Figma's auto-width-plus-maxWidth wrap; no live file has measured it yet (see the PR).
{
  const LINE = 40;
  const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: SWAP_TARGET });
  const def = componentDefs.find((d) => d.id === 'field-label')!;
  const plans = project(def);
  const lineBox = Object.fromEntries([...new Set(plans.flatMap((p) => planTextStyles(p.root)))].map((s) => [s, LINE]));
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(plans), page, layoutModel: true, textLineBox: lineBox, varPx: { 'space/050': 4 } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  const r = await applyComponentPlan(plans, shim as any);
  ok(r.misses.length === 0, `#1762 seed: field-label builds on the layout-model shim with 0 misses (${r.misses[0] ?? 'none'})`);
  const members = ((page.children.find((c) => c.type === 'COMPONENT_SET')?.children as Node[] | undefined) ?? []);
  const kid = (m: Node, name: string) => ((m.children as Node[] | undefined) ?? []).find((c) => c.name === name);
  const measure = (m: Node, chars: string) => {
    const text = kid(m, 'label')!, marker = kid(m, 'indicator')!;
    const was = [text.characters, marker.visible];
    text.characters = chars;
    marker.visible = true;
    const got = { row: m.width as number, name: text.width as number, lines: (text.height as number) / LINE, x: marker.x as number, nameX: text.x as number };
    text.characters = was[0];
    marker.visible = was[1];
    return got;
  };
  const off: string[] = [];
  for (const m of members) {
    if (!kid(m, 'label') || !kid(m, 'indicator')) { off.push(`${String(m.name)}: incomplete`); continue; }
    const short = measure(m, 'Label');
    const long = measure(m, 'x'.repeat(70));
    if (!(short.row === 320 && short.nameX === 0 && short.name === 30 && short.x === 34 && long.name === 316 && long.lines === 2 && long.x === 320))
      off.push(`${String(m.name)}: row ${short.row}; "Label" is ${short.name} wide at x ${short.nameX} and the marker is at ${short.x}; the long name is ${long.name} wide on ${long.lines} lines and the marker is at ${long.x}`);
  }
  ok(members.length === 24 && off.length === 0,
    `#1762 field-label's required marker follows the name: at x 34 after a one-line "Label" (30 + the 4px gap, not the trailing edge at 314), and at 320 beside a 70-character name clamped at 316 on two lines, on all 24 members (${members.length} members, ${off.length} off — ${off[0] ?? 'none'})`);
}

// ── #1781 — THE READ-BACK NAMES A NEST THAT POINTS AT THE WRONG SET ─────────────────────────────
//
// The corpus round-trip above nests against PLAIN components named for each target, so it proves a nest
// is an instance of the right thing only when there is exactly one thing of that name. The live defect
// needed the other file: sets that share member names (`checkbox-control` and `radio-control`; every row
// and group carrying `size=*`) plus renamed-aside `__old__` copies. `nestTarget` used to check only that
// the node was an INSTANCE, which a member of the wrong set is.
//
// Two halves. CLEAN: `checkbox-row` and `checkbox-group` built against that file read back with no
// `nestTarget` divergence — the predicate walked their nests and agreed. TAMPERED: the host's own record of
// one instance's main component is pointed at the set the live defect produced (`radio-control` for the
// row's control, `__old__checkbox-row` for a group row), and the diff must report `nestTarget` on that
// member and path, naming the wrong set. The tamper is on the HOST side, which is what a wrong resolution
// leaves behind; the plan is untouched. Mutation by name: revert `nestTarget` to the type-only check and
// `#1781 read-back` fails.
{
  // `field-message` since #2751: an errored group nests its message under the rows.
  const SET_IDS = ['checkbox-control', 'radio-control', 'switch-control', 'field-label', 'field-message', 'checkbox-row', 'radio-row', 'switch-row', 'checkbox-group', 'radio-group'];
  const defOf = (id: string) => componentDefs.find((d) => d.id === id)!;
  const membersOf = (id: string): string[] => figmaAnatomySet(defOf(id), { swapTarget: SWAP_TARGET }).map(planComponentName);
  const fileNodes = [
    ...SET_IDS.map((id) => ({ name: id, type: 'COMPONENT_SET' as const, variants: membersOf(id) })),
    { name: '__old__checkbox-row', type: 'COMPONENT_SET' as const, variants: membersOf('checkbox-row') },
    { name: '__old__radio-group', type: 'COMPONENT_SET' as const, variants: membersOf('radio-group') },
  ];
  const ports: ReadPorts = { varName: (id) => id.replace(/^V:/, ''), styleName: (id) => id };
  const readBack = async (id: string) => {
    const plans = figmaAnatomySet(defOf(id), { swapTarget: SWAP_TARGET });
    const f = fullFor(plans);
    const page: Page = { children: [] };
    const shim = makeShim({ ...f, comps: (f.comps ?? []).filter((c) => !SET_IDS.includes(c)), fileNodes, page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = ((page.children[0]?.children ?? []) as unknown as HostNode[]);
    const counted: Record<string, number> = {};
    const nestDiv = () => diffAnatomy(plans, members, planComponentName, ports, counted).filter((d) => d.field === 'nestTarget');
    return { members, nestDiv, counted };
  };
  const findPart = (n: HostNode, name: string): HostNode | undefined => {
    if (n.name === name) return n;
    for (const c of (Array.isArray(n.children) ? n.children : []) as HostNode[]) { const f = findPart(c, name); if (f) return f; }
    return undefined;
  };
  const repoint = (n: HostNode, setName: string): void => {
    const main = n.mainComponent as { name: string; type: string; parent: { name: string; type: string } };
    Object.defineProperty(n, 'mainComponent', { configurable: true, enumerable: false, writable: true, value: { ...main, parent: { name: setName, type: 'COMPONENT_SET' } } });
  };

  const row = await readBack('checkbox-row');
  const rowClean = row.nestDiv();
  ok((row.counted.nestTarget ?? 0) > 0 && rowClean.length === 0,
    `#1781 read-back reachable: checkbox-row built against sets sharing member names reads back with every nest in its own set — ${row.counted.nestTarget ?? 0} nests compared, ${rowClean.length} divergent${rowClean.length ? ` (${rowClean[0].member} :: ${rowClean[0].path} → ${rowClean[0].actual})` : ''}`);
  // Every row and group member carries `status` since #2751.
  const small = row.members.find((m) => m.name === 'status=default, size=small');
  const ctl = small && findPart(small, 'control');
  if (ctl) repoint(ctl, 'radio-control');
  const rowWrong = row.nestDiv();
  ok(!!ctl && rowWrong.length === 1 && rowWrong[0].member === 'status=default, size=small' && rowWrong[0].path.endsWith('/control')
    && rowWrong[0].actual.includes('radio-control/') && rowWrong[0].actual.includes('WRONG SET'),
    `#1781 read-back: a row control pointing at radio-control's same-named member fails by name — ${rowWrong.map((d) => `${d.member} :: ${d.path} — plan: ${d.expected}; host: ${d.actual}`).join(' | ') || 'NOTHING REPORTED'}`);

  const grp = await readBack('checkbox-group');
  const grpClean = grp.nestDiv();
  ok((grp.counted.nestTarget ?? 0) > 0 && grpClean.length === 0,
    `#1781 read-back reachable: checkbox-group reads back with every row and label in its own set — ${grp.counted.nestTarget ?? 0} nests compared, ${grpClean.length} divergent`);
  const large = grp.members.find((m) => m.name === 'status=default, size=large');
  const row1 = large && findPart(large, 'row1');
  if (row1) repoint(row1, '__old__checkbox-row');
  const grpWrong = grp.nestDiv();
  ok(!!row1 && grpWrong.length === 1 && grpWrong[0].member === 'status=default, size=large' && grpWrong[0].path.endsWith('/row1')
    && grpWrong[0].actual.includes('__old__checkbox-row/'),
    `#1781 read-back: a group row pointing at the renamed-aside __old__checkbox-row fails by name — ${grpWrong.map((d) => `${d.member} :: ${d.path} — plan: ${d.expected}; host: ${d.actual}`).join(' | ') || 'NOTHING REPORTED'}`);

  // AN UNNAMEABLE SOURCE FAILS TOO. An instance whose main component the host cannot name is not evidence
  // the nest landed, so it must not read back clean. Two host states, each on a fresh build so the tamper
  // above cannot leak into them: the INSTANCE carries no `mainComponent` at all, and it carries one with no
  // `name`. The expected text is a literal authored here, not read off the predicate.
  const UNNAMED = 'an instance whose main component the host cannot name';
  for (const [label, value] of [['no mainComponent', undefined], ['a mainComponent with no name', { type: 'COMPONENT', parent: { name: 'checkbox-control', type: 'COMPONENT_SET' } }]] as const) {
    const fresh = await readBack('checkbox-row');
    const medium = fresh.members.find((m) => m.name === 'status=default, size=medium');
    const inst = medium && findPart(medium, 'control');
    if (inst) Object.defineProperty(inst, 'mainComponent', { configurable: true, enumerable: false, writable: true, value });
    const got = fresh.nestDiv();
    ok(!!inst && inst.type === 'INSTANCE' && got.length === 1 && got[0].member === 'status=default, size=medium' && got[0].path.endsWith('/control')
      && got[0].actual === UNNAMED,
      `#1781 read-back: an INSTANCE with ${label} fails with "${UNNAMED}" — ${got.map((d) => `${d.member} :: ${d.path} — host: ${d.actual}`).join(' | ') || 'NOTHING REPORTED'}`);
  }
}

// ── #2457 — TWO FLUSH ICON BUTTONS IN ONE HOST, EACH EXPOSING `state` ─────────────────────────────
//
// The flush icon button is built to be nested (owner Q283.3 A), and its first host — the Counter (#2427, Q286) —
// nests two of them, each with its `state` exposed, so a designer sets one side to `disabled` at a limit (Q283.7
// note). No such host is registered yet, so this block builds the shape with a FIXTURE host, never registered:
// a row nesting `flush-icon-button-neutral` twice (`decrement`, `increment`), both `nest-exposed` with `expose: ['state']`
// and `follow: ['size']`. It is built against the flush icon button's own SET (its real member names), and read
// back off the shim. The Counter nests the NEUTRAL family (Q295.2 B: three families, IconButton's pattern), so the
// fixture does too.
//
// EXPECTED is authored here: both instances exposed in every member, each an instance of the flush icon button
// set, and the nested set offering the five owner-decided states as literals, `disabled` among them. The open
// question #2427 recorded — "two nests exposing the same axis is untested" — is answered for the SHIM only: both
// coexist, each marked exposed, with no miss. On a real host Figma lists each exposed instance's properties under
// its own layer name; that is not measured here.
{
  const FLUSH_STATES = ['rest', 'hover', 'pressed', 'focus-visible', 'disabled'];
  const child = componentDefs.find((d) => d.id === 'flush-icon-button-neutral');
  ok(!!child, '#2457 two-nest: the flush-icon-button-neutral def is registered');
  if (child) {
    const nestPart = { kind: 'nest', nests: 'flush-icon-button-neutral', nesting: { kind: 'nest-exposed', variant: { shape: 'flush', surface: 'default', state: 'rest' }, expose: ['state'], follow: ['size'] } } as const;
    const host = {
      id: 'fixture-two-flush', name: 'FixtureTwoFlush', aliases: [], category: 'form', status: 'draft',
      summary: 'A fixture host nesting two flush icon buttons.', description: 'A fixture host nesting two flush icon buttons, each with its state exposed.',
      props: [{ name: 'size', type: "enum: 'small' | 'medium' | 'large'", values: ['small', 'medium', 'large'], default: 'medium', required: false, description: 'Size.' }],
      states: [], variants: { size: ['small', 'medium', 'large'] }, axisKinds: { size: 'authoring' },
      tokens: { gap: 'space.100' },
      anatomy: {
        root: 'row',
        parts: {
          row: { kind: 'box', role: 'target', layout: { direction: 'row', align: 'center', sizing: { x: 'hug', y: 'hug' } }, gap: 'gap', children: ['decrement', 'increment'] },
          decrement: nestPart,
          increment: nestPart,
        },
        codeOnly: ['fixture — not a component.'],
      },
      figmaProperties: { variantAxes: ['size'], booleans: {} },
      accessibility: { role: 'group' }, docs: { usage: 'Fixture.', do: [], dont: [] },
      ai: { primaryPurpose: 'Fixture.', whenToUse: 'Never.', avoidWhen: 'Always.' },
      composition: { composesWith: ['flush-icon-button-neutral'] },
    } as unknown as ComponentDef;
    const errs = validateComponentDef(host).errors;
    ok(errs.length === 0, `#2457 two-nest: a host nesting flush-icon-button-neutral twice with \`state\` exposed validates clean${errs.length ? ` — ${errs.join('; ')}` : ''}`);
    const childPlans = figmaAnatomySet(child, { swapTarget: SWAP_TARGET });
    const childStates = [...new Set(childPlans.map((p) => p.coord.state))];
    ok(JSON.stringify(childStates) === JSON.stringify(FLUSH_STATES),
      `#2457 two-nest: the nested set offers the owner-decided states [${FLUSH_STATES.join(', ')}] to expose, disabled among them (got [${childStates.join(', ')}])`);
    const plans = figmaAnatomySet(host, { swapTarget: SWAP_TARGET });
    const f = fullFor(plans);
    const page: Page = { children: [] };
    const fileNodes = [{ name: 'flush-icon-button-neutral', type: 'COMPONENT_SET' as const, variants: childPlans.map(planComponentName) }];
    const shim = makeShim({ ...f, comps: (f.comps ?? []).filter((c) => c !== 'flush-icon-button-neutral'), fileNodes, page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    const r = await applyComponentPlan(plans, shim as any, {}) as { misses?: string[] };
    const members = ((page.children[0]?.children ?? []) as unknown as HostNode[]);
    const kid = (m: HostNode, name: string): HostNode | undefined => ((Array.isArray(m.children) ? m.children : []) as HostNode[]).find((c) => c.name === name);
    const off: string[] = [];
    for (const m of members) {
      for (const side of ['decrement', 'increment']) {
        const inst = kid(m, side);
        const main = inst?.mainComponent as { parent?: { name?: string } } | undefined;
        if (!inst || inst.type !== 'INSTANCE') off.push(`${String(m.name)}/${side}: not built as an instance`);
        else if (inst.isExposedInstance !== true) off.push(`${String(m.name)}/${side}: not exposed (isExposedInstance=${String(inst.isExposedInstance)})`);
        else if (main?.parent?.name !== 'flush-icon-button-neutral') off.push(`${String(m.name)}/${side}: an instance of ${main?.parent?.name ?? 'nothing named'}, not flush-icon-button-neutral`);
      }
    }
    const planned = plans.flatMap((p) => p.root.children.filter((c) => c.nestTarget === 'flush-icon-button-neutral').map((c) => (c.nestExpose ?? []).join(',')));
    const misses = (r.misses ?? []).filter((m) => /nestExpose|decrement|increment/.test(m));
    ok(members.length === 3 && off.length === 0 && misses.length === 0 && planned.length === 6 && planned.every((e) => e === 'state'),
      `#2457 two-nest: both flush icon buttons, in all 3 members, are instances of the flush-icon-button-neutral set marked exposed, each exposing [state], with no miss — two nests exposing one axis coexist on the shim (${members.length} members; ${off.length ? off.join('; ') : 'none off'}; plan exposes [${[...new Set(planned)].join(' | ')}] on ${planned.length} nests; misses: ${misses.join(' | ') || 'none'})`);
    const ports: ReadPorts = { varName: (id) => id.replace(/^V:/, ''), styleName: (id) => id };
    const div = diffAnatomy(plans, members, planComponentName, ports, {}).filter((d) => d.field === 'nestExpose' || d.field === 'nestTarget');
    ok(div.length === 0, `#2457 two-nest: the read-back agrees with the plan on every nest and exposure (${div.length} divergent${div.length ? `: ${div[0].member} :: ${div[0].path} — ${div[0].actual}` : ''})`);
  }
}

// ── PROTOTYPE REACTIONS READ-BACK (owner decision Q344, #2733) — THE PLAN, AS THE HOST HOLDS IT ─────────────────
//
// A Rest member's reactions are While hovering → its Hover sibling AND While pressing → its Pressed sibling (a touch
// prototype has no hover, so Rest's press is the only route to Pressed); a Hover member's only one is While pressing →
// its Pressed sibling; every other member none. Each def is built with node ids on, and every member's reactions are
// read back off the shim, each destination id looked up among the set's own members HERE. The expectation is literal
// per state, authored here and nowhere else, never the reaction map, so a map that drops Rest's press reaction (#2703's
// hover-only chain) fails `reactions read-back` by name (docs/34).
{
  const WANT: Record<string, string[]> = { rest: ['ON_HOVER→state=hover', 'ON_PRESS→state=pressed'], hover: ['ON_PRESS→state=pressed'] };
  const INTERACTIVE = ['button', 'button-destructive', 'button-neutral', 'icon-button', 'icon-button-destructive', 'icon-button-neutral',
    'flush-icon-button', 'flush-icon-button-destructive', 'flush-icon-button-neutral', 'checkbox-control', 'radio-control', 'switch-control',
    'tag', 'tab-item', 'segmented-control-segment', 'link', '_slider-thumb', 'slider'];
  const off: string[] = [];
  let read = 0;
  for (const id of INTERACTIVE) {
    const def = componentDefs.find((d) => d.id === id);
    if (!def) { off.push(`${id}: not registered`); continue; }
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page, identities: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children.find((n) => n.type === 'COMPONENT_SET')?.children ?? []) as Node[];
    const byId = new Map(members.map((m) => [String(m.id), String(m.name)] as const));
    const stateOf = (name: string): string => name.split(', ').find((x) => x.startsWith('state='))?.slice(6) ?? '';
    for (const m of members) {
      const name = String(m.name);
      const rx = (m.reactions ?? []) as { trigger: { type: string }; actions: { destinationId: string }[] }[];
      const got = rx.flatMap((r) => r.actions.map((a) => {
        const to = byId.get(a.destinationId);
        // the destination must differ on state alone
        const same = to !== undefined && name.split(', ').filter((x) => !x.startsWith('state=')).join(', ') === to.split(', ').filter((x) => !x.startsWith('state=')).join(', ');
        return `${r.trigger.type}→${to === undefined ? '?' : same ? `state=${stateOf(to)}` : to}`;
      }));
      read++;
      if (JSON.stringify(got) !== JSON.stringify(WANT[stateOf(name)] ?? [])) off.push(`${id}: ${name}: ${got.join('; ') || 'none'}`);
    }
  }
  ok(read > 0 && off.length === 0, `reactions read-back: on ${INTERACTIVE.length} interactive defs (${read} members read off the host) Rest goes to Hover while hovering and to Pressed while pressing, Hover to Pressed while pressing only, nothing else reacts (${off.length} off${off.length ? `: ${off.slice(0, 3).join(' | ')}` : ''})`);
}

// ── #2427 — THE COUNTER'S TWO BUTTONS, BUILT AND READ BACK OFF THE HOST ──────────────────────────────────
//
// The Counter nests FlushIconButton.Neutral twice (decrement, increment), each `nest-exposed` with `state`, and maps
// its own coordinate onto the button's through `variantWhen`. EXPECTED is typed here from the owner decisions, never
// read off the def or the plan: Q287 A (on #2457) — outline nests the flush shape, ghost the round one; Q283.7 — the
// buttons start at rest and the designer sets one disabled at a limit, so only the Counter's own disabled member
// starts them disabled; and the size follows. ACTUAL is the member each built instance is an instance of, read off
// the shim after the nested set was really built (`prebuildDependencies`), plus its exposure flag. The geometry arm
// reads the two instances' centers off the shim's layout model: at least 44px apart (Q296 A), so the code-side hit
// areas never overlap.
{
  const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: SWAP_TARGET });
  const counterDef = componentDefs.find((d) => d.id === 'counter');
  ok(!!counterDef, '#2427 counter: the def is registered');
  if (counterDef) {
    const all = componentDefs.flatMap((d) => { try { return project(d); } catch { return []; } });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(all), comps: [SWAP_TARGET], liveRoot: true, page, layoutModel: true, identities: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    const build = (d: ComponentDef) => applyComponentPlan(project(d), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural
    await prebuildDependencies(counterDef, { defs: componentDefs, project, host: shim as any, build });
    const r = await build(counterDef);
    const set = page.children.find((c) => c.name === 'counter' && c.type === 'COMPONENT_SET') as Node | undefined;
    const members = ((set?.children as Node[] | undefined) ?? []) as unknown as HostNode[];
    ok(members.length === 18 && r.misses.length === 0, `#2427 counter: builds 18 members over its nested sets with 0 misses (${members.length}; ${r.misses[0] ?? 'none'})`);
    const SHAPE: Record<string, string> = { outline: 'flush', ghost: 'round' };
    const find = (n: HostNode | undefined, name: string): HostNode | undefined => {
      if (!n) return undefined;
      if (n.name === name) return n;
      for (const c of (Array.isArray(n.children) ? n.children : []) as HostNode[]) { const f = find(c, name); if (f) return f; }
      return undefined;
    };
    const coordOf = (name: string): Record<string, string> => Object.fromEntries(name.split(', ').map((kv) => kv.split('=') as [string, string]));
    const off: string[] = [];
    const spacing: number[] = [];
    for (const m of members) {
      const c = coordOf(String(m.name));
      const want = `shape=${SHAPE[c.appearance]}, surface=default, size=${c.size}, state=${c.state === 'disabled' ? 'disabled' : 'rest'}`;
      const centers: number[] = [];
      for (const side of ['decrement', 'increment']) {
        const inst = find(m, side);
        const main = inst?.mainComponent as { name?: string; parent?: { name?: string } } | undefined;
        if (!inst || inst.type !== 'INSTANCE') { off.push(`${String(m.name)}/${side}: not an instance`); continue; }
        if (main?.parent?.name !== 'flush-icon-button-neutral') off.push(`${String(m.name)}/${side}: an instance of ${main?.parent?.name ?? 'nothing'}`);
        else if (main.name !== want) off.push(`${String(m.name)}/${side}: is ${main.name}, want ${want}`);
        if (inst.isExposedInstance !== true) off.push(`${String(m.name)}/${side}: not exposed`);
        let x = Number(inst.x); let p = inst.parent as HostNode | undefined;
        while (p && p !== m) { x += Number(p.x); p = p.parent as HostNode | undefined; }
        centers.push(x + Number(inst.width) / 2);
      }
      if (centers.length === 2) spacing.push(centers[1] - centers[0]);
    }
    ok(members.length === 18 && off.length === 0,
      `#2427 counter: in all 18 members both buttons are exposed instances of FlushIconButton.Neutral at the decided member — outline → flush, ghost → round (Q287 A), the size followed, disabled only on the Counter's disabled members (${off.length ? off.slice(0, 4).join('; ') : 'none off'})`);
    const label = members.map((m) => (find(m, 'label')?.mainComponent as { name?: string } | undefined)?.name ?? '');
    const dimmed = members.filter((m, i) => coordOf(String(m.name)).state === 'disabled' && /state=disabled/.test(label[i])).length;
    const lit = members.filter((m, i) => coordOf(String(m.name)).state !== 'disabled' && /state=rest/.test(label[i])).length;
    ok(dimmed === 6 && lit === 12, `#2427 counter: the nested FieldLabel dims on the 6 disabled members and rests on the other 12 (${dimmed} dimmed, ${lit} at rest)`);
    const closest = spacing.length ? Math.min(...spacing) : NaN;
    ok(spacing.length === 18 && closest >= 44,
      `#2427 counter: the two buttons' centers are at least 44px apart on every member, read off the shim's layout (Q296 A; closest ${closest}px over ${spacing.length})`);
    // REACTIONS. The Counter's own `state` has no hover or pressed, so its members carry none. Its buttons react through
    // the nested FlushIconButton.Neutral set, whose members must carry exactly the chain `reactionMap` plans for that
    // set, so the Counter follows whichever chain `reactions.ts` holds (Q344 restored Rest's press). This arm checks
    // that the set the Counter nests was written with that chain; the chain's own literal is `reactions read-back`'s.
    const ownRx = members.reduce((n, m) => n + (((m as unknown as Node).reactions as unknown[] | undefined)?.length ?? 0), 0);
    const nested = page.children.find((c) => c.name === 'flush-icon-button-neutral' && c.type === 'COMPONENT_SET') as Node | undefined;
    const nm = ((nested?.children ?? []) as Node[]);
    const nameOf = new Map(nm.map((m) => [String(m.id), String(m.name)] as const));
    const planned = reactionMap(nm.map((m) => String(m.name)));
    const rxOff: string[] = [];
    let carried = 0;
    for (const m of nm) {
      const got = ((m.reactions ?? []) as { trigger: { type: string }; actions: { destinationId: string }[] }[])
        .flatMap((r) => r.actions.map((a) => `${r.trigger.type}→${nameOf.get(a.destinationId) ?? '?'}`));
      const want = (planned.get(String(m.name)) ?? []).map((r) => `${r.trigger}→${r.to}`);
      carried += got.length;
      if (JSON.stringify(got) !== JSON.stringify(want)) rxOff.push(`${String(m.name)}: ${got.join('; ') || 'none'}, want ${want.join('; ') || 'none'}`);
    }
    ok(members.length === 18 && ownRx === 0 && nm.length > 0 && planned.size === nm.length && carried > 0 && rxOff.length === 0,
      `#2427 counter: the 18 members carry no reaction of their own (${ownRx}), and the nested FlushIconButton.Neutral set's ${nm.length} members carry exactly the chain reactions.ts plans for it (${carried} reactions; ${rxOff.length ? rxOff.slice(0, 3).join(' | ') : 'none off'})`);
    // THE GLYPHS (#2645): each button's swap property, read off the built instance, names the icon set's minus or plus.
    const glyphOff: string[] = [];
    for (const m of members) for (const [side, glyph] of [['decrement', 'icon/minus'], ['increment', 'icon/plus']] as const) {
      const props = (find(m, side)?.componentProperties ?? {}) as Record<string, { type?: string; value?: unknown }>;
      const k = Object.keys(props).find((x) => x.split('#')[0] === 'swap icon' && props[x].type === 'INSTANCE_SWAP');
      const v = k ? props[k].value : undefined;
      const named = typeof v === 'string' ? ((await (shim as unknown as { getNodeByIdAsync: (id: string) => Promise<{ name: string } | null> }).getNodeByIdAsync(v))?.name ?? v) : v;
      if (named !== glyph) glyphOff.push(`${String(m.name)}/${side}: ${String(named)}, want ${glyph}`);
    }
    ok(members.length === 18 && glyphOff.length === 0,
      `#2427 counter: in all 18 members the minus button swaps to icon/minus and the plus button to icon/plus (${glyphOff.length ? glyphOff.slice(0, 3).join('; ') : 'none off'})`);
  }
}

// ── #2928 — NO FILL UNDER A HUG: THE TAB'S BAR, THE LIST'S BASELINE AND THE CODE INPUT'S FIELD, BUILT AND MEASURED ──
//
// The host does not let a frame hug a child that fills it: a stretch across a column that hugs its width turns that
// width FIXED at what it measures when the stretch is written (owner QA Q537, Pagination's underline). Tab.Item's
// indicator and Tabs' baseline were stretched that way, and so were CodeInput's label and message. The shim models
// the rule here (`fillFreezesHug`), and the measurement is taken AFTER the content grows past what the build saw, the
// case a frozen frame gets wrong: a longer label on the tab, a fourth tab in the list's slot. EXPECTED is typed here
// from the design, never read off the def or the plan: the tab's bar spans the tab's label row, edge to edge, at its
// bottom; the baseline spans the row of tabs; every cell sits inside the code input's field. The bars measure 2px and
// 1px (`border-width/thick`, `border-width/hairline`), so a bar that took a cell would also move the label row.
{
  const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: SWAP_TARGET });
  const all = componentDefs.flatMap((d) => { try { return project(d); } catch { return []; } });
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(all), comps: [SWAP_TARGET], liveRoot: true, page, layoutModel: true, fillFreezesHug: true,
    varPx: { 'space/0': 0, 'border-width/thick': 2, 'border-width/hairline': 1 } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  const build = (d: ComponentDef) => applyComponentPlan(project(d), shim as any, { emitAsComponents: d.figmaProperties?.emitAsComponents });
  const setOf = (id: string): Node[] => ((page.children.find((c) => c.name === id && c.type === 'COMPONENT_SET')?.children ?? []) as Node[]);
  const kid = (n: Node | undefined, name: string): Node | undefined => ((n?.children ?? []) as Node[]).find((c) => c.name === name);
  const find = (n: Node | undefined, name: string): Node | undefined => {
    if (!n) return undefined;
    if (n.name === name) return n;
    for (const c of (n.children ?? []) as Node[]) { const f = find(c, name); if (f) return f; }
    return undefined;
  };
  const W = (n: Node | undefined): number => Number(n?.width);
  const H = (n: Node | undefined): number => Number(n?.height);
  const X = (n: Node | undefined): number => Number(n?.x);
  const Y = (n: Node | undefined): number => Number(n?.y);
  const EPS = 0.5;
  for (const id of ['tab-item', 'tabs', 'code-input']) {
    const d = componentDefs.find((x) => x.id === id);
    ok(!!d, `#2928 ${id}: the def is registered`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural
    if (d) await prebuildDependencies(d, { defs: componentDefs, project, host: shim as any, build });
    if (d && !setOf(id).length) await build(d);
  }

  // TAB.ITEM — every member, before and after its label grows by 20 characters.
  const tabs = setOf('tab-item');
  const tabOff: string[] = [];
  const measureTab = (m: Node, when: string): void => {
    const row = kid(m, 'content');
    const bar = kid(m, 'indicator');
    if (!row || !bar) { tabOff.push(`${String(m.name)}: no ${row ? 'indicator' : 'content'}`); return; }
    if (m.counterAxisSizingMode !== 'AUTO') tabOff.push(`${String(m.name)} ${when}: the tab's width is ${String(m.counterAxisSizingMode)}, not hugging its label`);
    if (Math.abs(W(m) - W(row)) > EPS) tabOff.push(`${String(m.name)} ${when}: the tab is ${W(m)} wide around a ${W(row)} label row`);
    if (Math.abs(X(bar)) > EPS || Math.abs(W(bar) - W(row)) > EPS) tabOff.push(`${String(m.name)} ${when}: the bar spans ${X(bar)}..${X(bar) + W(bar)}, the label row 0..${W(row)}`);
    if (Math.abs(H(bar) - 2) > EPS || Math.abs(Y(bar) + H(bar) - H(m)) > EPS) tabOff.push(`${String(m.name)} ${when}: the bar is ${H(bar)}px at y ${Y(bar)}, not 2px at the tab's foot (${H(m)})`);
    if (Y(row) + H(row) > Y(bar) + EPS) tabOff.push(`${String(m.name)} ${when}: the label row (to ${Y(row) + H(row)}) runs under the bar (from ${Y(bar)})`);
  };
  for (const m of tabs) measureTab(m, 'as built');

  // TABS — every member, before and after a fourth tab joins the slot.
  const lists = setOf('tabs');
  const listOff: string[] = [];
  const measureList = (m: Node, when: string): void => {
    const items = kid(m, 'items');
    const base = kid(m, 'baseline');
    if (!items || !base) { listOff.push(`${String(m.name)}: no ${items ? 'baseline' : 'items'}`); return; }
    const centered = /alignment=center/.test(String(m.name));
    // At start the list hugs its tabs; at center it spans its placement and centers them (Q222 A).
    if (!centered && (m.counterAxisSizingMode !== 'AUTO' || Math.abs(W(m) - W(items)) > EPS)) listOff.push(`${String(m.name)} ${when}: the list is ${W(m)} wide (${String(m.counterAxisSizingMode)}) around ${W(items)} of tabs`);
    if (centered && W(m) + EPS < W(items)) listOff.push(`${String(m.name)} ${when}: ${W(items)} of tabs run past a ${W(m)} list`);
    if (Math.abs(X(base)) > EPS || Math.abs(W(base) - W(m)) > EPS) listOff.push(`${String(m.name)} ${when}: the baseline spans ${X(base)}..${X(base) + W(base)}, the list 0..${W(m)}`);
    if (Math.abs(H(base) - 1) > EPS || Math.abs(Y(base) + H(base) - H(m)) > EPS || Y(items) + H(items) > Y(base) + EPS) listOff.push(`${String(m.name)} ${when}: the baseline is ${H(base)}px at y ${Y(base)}, not 1px under the tabs (to ${Y(items) + H(items)}) at the list's foot (${H(m)})`);
  };
  for (const m of lists) measureList(m, 'as built');
  let added = 0;
  for (const m of lists) {
    const items = kid(m, 'items');
    // The fourth tab is an instance of the member the third is, found as the executor finds a component.
    const want = String((kid(items, 'tab3')?.mainComponent as { name?: string } | undefined)?.name);
    const refs = (shim as unknown as { root: { findAllWithCriteria: (c: { types: string[] }) => { name: string; createInstance?: () => Node }[] } }).root.findAllWithCriteria({ types: ['COMPONENT'] });
    const extra = refs.find((r) => r.name === want && r.createInstance)?.createInstance?.();
    if (items && extra) { (items.appendChild as (n: Node) => void)(extra); added++; }
  }
  for (const m of lists) measureList(m, 'with a fourth tab');
  ok(lists.length === 6 && added === 6 && listOff.length === 0,
    `#2928 Tabs: in all 6 members the 1px baseline spans the list at its foot, under the tabs, and at start the list hugs them, as built and after a fourth tab joins the slot (${lists.length} members, ${added} tabs added; ${listOff.length} off${listOff.length ? `: ${listOff.slice(0, 3).join(' | ')}` : ''})`);

  // TAB.ITEM, AGAIN — its label grows past what the build saw. After Tabs, whose tabs are instances of these members and
  // would grow with them. The label and its bold reserve show one set-level TEXT property, so it is set once, outright.
  const LONG = 'Specifications and reviews';
  for (const t of ['label', 'labelReserve']) { const n = find(tabs[0], t); if (n) n.characters = LONG; }
  const grown = tabs.filter((m) => String(find(m, 'label')?.characters) === LONG).length;
  for (const m of tabs) measureTab(m, 'with a longer label');
  ok(tabs.length === 30 && grown === 30 && tabOff.length === 0,
    `#2928 Tab.Item: in all 30 members the tab hugs its label row and the 2px bar spans that row edge to edge at the tab's foot, as built and after the label grows to "${LONG}" (${tabs.length} members, ${grown} grown; ${tabOff.length} off${tabOff.length ? `: ${tabOff.slice(0, 3).join(' | ')}` : ''})`);

  // CODEINPUT — every cell inside the field, at every size, and the field hugging the widest of its three rows.
  const fields = setOf('code-input');
  const fieldOff: string[] = [];
  for (const m of fields) {
    const items = kid(m, 'items');
    const rows = ['label', 'items', 'message'].map((n) => kid(m, n)).filter((n): n is Node => !!n && n.visible !== false);
    if (!items) { fieldOff.push(`${String(m.name)}: no items`); continue; }
    if (m.counterAxisSizingMode !== 'AUTO') fieldOff.push(`${String(m.name)}: the field's width is ${String(m.counterAxisSizingMode)}, not hugging its rows`);
    if (W(items) > W(m) + EPS) fieldOff.push(`${String(m.name)}: ${W(items)} of cells run past a ${W(m)} field`);
    if (Math.abs(W(m) - Math.max(...rows.map(W))) > EPS) fieldOff.push(`${String(m.name)}: the field is ${W(m)} wide, its widest row ${Math.max(...rows.map(W))}`);
  }
  ok(fields.length > 0 && fieldOff.length === 0,
    `#2928 CodeInput: in all ${fields.length} members the field hugs the widest of its label, cells and message, and no cell runs past it (${fieldOff.length} off${fieldOff.length ? `: ${fieldOff.slice(0, 3).join(' | ')}` : ''})`);
}

console.log(failed ? `\n❌ ${failed} FAILED` : '\n✅ component round-trip: ALL PASS');
process.exit(failed ? 1 : 0);
