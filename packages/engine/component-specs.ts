/**
 * Prism3 engine — COMPONENT SPEC MODEL (#2830, phase 1). One pure model of what a component spec sheet shows,
 * built from the def and the Figma anatomy plan that builds the component, so a sheet cannot drift from the build.
 *
 *   componentSpec(def)            → the model for one def, as Apply builds it (`specMaterialize`)
 *   projectComponentSpecs(defs)   → `out/components/specs.json` (written by `emit-component-docs.ts`)
 *   renderSpecsMarkdown(spec)     → the Specs section of `out/components/<id>.md`
 *
 * WHAT IT HOLDS — the four blocks of the approved wireframe (#2830, 2026-10-19), as data:
 *
 *  · ANATOMY — every part the plans build, by path, with its node kind and the members that hold it.
 *  · REDLINES — per-part padding, gap, height, width and min-width, plus the text style, keyed by size and slot
 *    case. A value is a TOKEN NAME when the plan binds a variable, and a px number labelled `literal` or `derived`
 *    when the build writes a number (Button's floor, a field's 320 build width). Never a px for a token: the
 *    model is brand-independent, and `px` is resolved per brand by the caller that has one (`opts.px`).
 *  · COLORS — each part's fill, stroke, ink (a text fill) and icon (an instance's descendant fill) per state, keyed
 *    by every variant axis the colors move on.
 *  · NESTING — every nested instance (its component, fixed variant, followed and exposed axes), every swap slot
 *    (its property and visibility boolean) and native slot, and the set's own component properties.
 *
 * TOKEN NAMES ARE THE DTCG REFS (`space.200`, `color.interactive.primary.fill.rest`, `type.label.md.emphasis`):
 * the code-facing name, which a Figma reader maps back with `figmaVarName` / `figmaTextStyleName`. The plan holds
 * the Figma spelling, which this module inverts (`refOfVar`, `refOfStyle`); both mappings are one-to-one because a
 * token path never contains `/`.
 *
 * HOW A ROW IS KEYED (`keyAxes`). A redline row is "size × slot case" and a color row is "every variant axis ×
 * state" — the wireframe's tables — but the plan is the authority on what a value actually moves on, so the key
 * GROWS until every value is a function of it: Button's padding also moves on `inset` (flush drops it), so its
 * redlines are keyed size × slots × inset. A row therefore never claims one value for members that hold two,
 * which is what the read-back gate (`apps/plugin/test-roundtrip.ts`, SPEC READ-BACK) holds it to, member by member.
 *
 * WHAT IT DOES NOT CARRY, deliberately: part notes and `anatomy.codeOnly` prose (#1623 ruled them maintainer-only;
 * a code-only STATE is named, not explained), positions (the plan has bindings, not coordinates — phase 2 measures
 * the placed specimen), focus-ring geometry (owned by the nested `focus-ring`, named here as a nest), radius and
 * stroke width (outside the issue's redline list), and per-mode values (a token name follows the mode).
 *
 * Phase 2 (the Figma sheet on the component page, and Generate specs in a separate file) and phase 3 (the docs-site
 * Specs section, #846) read this model; neither exists yet.
 */
import type { ComponentDef } from './component-schema';
import {
  applyButtonLayout, applyControlShape, applyFieldStyle, applyMinWidthRatio, applyOutlineInteraction, applySpacingDensity,
  applyWeightIntent, DEFAULT_BUTTON_LAYOUT, DEFAULT_WEIGHT_AVAILABILITY, figmaAnatomySet, planSetProperties, MIN_WIDTH_DERIVATION,
} from './anatomy-figma';
import type { AnatomyPlan, FigmaNodePlan } from './anatomy-figma';
import { componentSizes, sizeRefPx, SPACE_BASE } from './scale';

export const COMPONENT_SPECS_SCHEMA = 'prism3-component-specs/1.0';

/** The swap target the plugin nominates (`apps/plugin/src/main.ts`'s `SWAP_TARGET`). A nomination, not data:
 *  the model never reports it, but projecting without one builds a different plan from the one Apply builds. */
const SWAP_TARGET = 'FPO-default-icon';

// ---- types ------------------------------------------------------------------------------------

/** A redline value: a token, or a number the build writes because no variable can hold it. */
export type SpecValue =
  | { token: string; px?: number }
  | { px: number; source: 'literal' }
  | { px: number; source: 'derived'; rule: string };

/** The redline properties, in reading order. Figma's bound keys map onto them in `GEOMETRY`. */
export const SPEC_PROPERTIES = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'gap', 'rowGap', 'height', 'minHeight', 'width', 'minWidth', 'maxWidth', 'buildWidth', 'buildHeight'] as const;
export type SpecProperty = (typeof SPEC_PROPERTIES)[number];

/** A member coordinate restricted to a row's key axes: axis → its one value. `{}` is every member. */
export type SpecWhere = Record<string, string>;

export type SpecAxis = { name: string; figmaName: string; values: string[]; kind: 'variant' | 'size' | 'state' | 'slot' };
export type SpecPart = { part: string; kind: 'frame' | 'text' | 'swap' | 'instance' | 'glyph' | 'slot'; members: number; when?: Record<string, string[]> };
export type SpecRedlineRow = { where: SpecWhere; parts: { part: string; values: Partial<Record<SpecProperty, SpecValue>> }[] };
export type SpecTypeRow = { where: SpecWhere; parts: { part: string; textStyle: string }[] };
export type SpecColorRow = { where: SpecWhere; parts: { part: string; fill?: string; stroke?: string; ink?: string; icon?: string; gradient?: string[] }[] };
export type SpecNest =
  | { part: string; kind: 'instance'; component: string; variant: Record<string, string>; follows: string[]; exposes: string[] }
  | { part: string; kind: 'swap'; property: string; visibility?: string; default?: string }
  /** An instance the BUILD places and a designer does not swap (Button's pending spinner, #1670): which component
   *  depends on the member, so every one the set uses is listed, in member order. */
  | { part: string; kind: 'fixed'; components: string[] }
  | { part: string; kind: 'slot'; property?: string; preferred: string[] };
export type SpecComponentProperty = { name: string; type: 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP' | 'SLOT'; default?: string | boolean };

export type ComponentSpec = {
  id: string;
  name: string;
  members: number;
  axes: SpecAxis[];
  /** States the def has and the design file does not (no member, no bindings) — named, never explained. */
  codeOnlyStates: string[];
  anatomy: SpecPart[];
  redlineKey: string[];
  redlines: SpecRedlineRow[];
  typeKey: string[];
  type: SpecTypeRow[];
  colorKey: string[];
  colors: SpecColorRow[];
  nesting: SpecNest[];
  properties: SpecComponentProperty[];
};

// ---- names ------------------------------------------------------------------------------------

/** A plan's Figma variable name → its token ref (`figmaVarName`, inverted). */
export const refOfVar = (name: string): string => name.replace(/\//g, '.');
/** A plan's text style name → its token ref (`figmaTextStyleName`, inverted). */
export const refOfStyle = (name: string): string => `type.${name.replace(/\//g, '.')}`;

/** Figma's bound keys → the redline property each one is. Radius and stroke width are out of scope (header). */
export const GEOMETRY: Readonly<Record<string, SpecProperty>> = {
  paddingTop: 'paddingTop', paddingRight: 'paddingRight', paddingBottom: 'paddingBottom', paddingLeft: 'paddingLeft',
  itemSpacing: 'gap', counterAxisSpacing: 'rowGap',
  height: 'height', minHeight: 'minHeight', width: 'width', minWidth: 'minWidth', maxWidth: 'maxWidth',
};

// ---- the default materialization --------------------------------------------------------------

/**
 * The def as Apply builds it for a file with no brand settings: `apps/plugin/src/brand-def.ts`'s
 * `materializeForBrand(def, null)`, RESTATED here because the engine must not import a surface (the same
 * restatement `test.ts`'s #1387 block and `lint-lever-sweep.ts` make). At the null brand every lever is the
 * identity except the two that write numbers: Button's min-width floor (`applyButtonLayout`) and Tag's ratio floor
 * (`applyMinWidthRatio`), both from the comfortable heights. `apps/plugin/test-roundtrip.ts` asserts the two
 * chains agree on every def, so a lever added to one and not the other fails by name.
 */
export const specMaterialize = (def: ComponentDef): ComponentDef => {
  const px = sizeRefPx(componentSizes('comfortable', SPACE_BASE));
  return applyMinWidthRatio(applyButtonLayout(
    applySpacingDensity(applyOutlineInteraction(applyWeightIntent(applyFieldStyle(applyControlShape(def, 'rounded'), 'outline'), DEFAULT_WEIGHT_AVAILABILITY), 'overlay-neutral'), 'comfortable'),
    DEFAULT_BUTTON_LAYOUT, px), px);
};

// ---- per-member facts -------------------------------------------------------------------------

type Member = { coord: Record<string, string>; nodes: Map<string, FigmaNodePlan> };

/** A plan's full coordinate under CODE axis names: grid axes and state off `coord`, then size, then each slot axis. */
const coordOf = (p: AnatomyPlan): Record<string, string> => ({
  ...Object.fromEntries(Object.entries(p.coord).filter(([, v]) => v !== undefined) as [string, string][]),
  ...(p.size === undefined ? {} : { size: p.size }),
  ...Object.fromEntries(p.slotAxes.map((s) => [s, String(p.slots[s as 'leading' | 'trailing'])])),
});

const nodesOf = (n: FigmaNodePlan, path = ''): [string, FigmaNodePlan][] => {
  const p = path ? `${path}/${n.name}` : n.name;
  return [[p, n], ...n.children.flatMap((c) => nodesOf(c, p))];
};

/** Which redline property a literal plan field is, and its provenance. */
const literalGeometry = (n: FigmaNodePlan, isRoot: boolean, def: ComponentDef, authored: ComponentDef): [SpecProperty, SpecValue][] => {
  const out: [SpecProperty, SpecValue][] = [];
  if (n.minWidth !== undefined) {
    const ratio = authored.anatomy?.parts[n.name]?.minWidthRatio;
    out.push(['minWidth', ratio !== undefined ? { px: n.minWidth, source: 'derived', rule: `height × ${ratio}` }
      : isRoot && def.anatomy?.derived?.[MIN_WIDTH_DERIVATION] ? { px: n.minWidth, source: 'derived', rule: 'height × multiplier, rounded up to 8px' }
        : { px: n.minWidth, source: 'literal' }]);
  }
  if (n.maxWidth !== undefined) out.push(['maxWidth', { px: n.maxWidth, source: 'literal' }]);
  if (n.placementWidth !== undefined) out.push(['buildWidth', { px: n.placementWidth, source: 'literal' }]);
  if (n.placementHeight !== undefined) out.push(['buildHeight', { px: n.placementHeight, source: 'literal' }]);
  // "Locked to edges" (#1667): the side a pinned icon sits on pads by the visual padding + the icon + the gap.
  for (const [k, v] of Object.entries(n.paddingPx ?? {})) out.push([k as SpecProperty, { px: v as number, source: 'derived', rule: 'padding + icon + gap' }]);
  return out;
};

/** One node's redline facts, `prop → JSON value`. A literal overrides a binding on the same property. */
const geometryOf = (n: FigmaNodePlan, isRoot: boolean, def: ComponentDef, authored: ComponentDef): Map<string, string> => {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(n.bound)) if (GEOMETRY[k]) m.set(GEOMETRY[k], JSON.stringify({ token: refOfVar(v) }));
  for (const [k, v] of literalGeometry(n, isRoot, def, authored)) m.set(k, JSON.stringify(v));
  return m;
};

/** One node's text style. Its own block, keyed apart from the redlines: Button's style moves on `appearance` (the
 *  underlined text appearance) where its spacing does not, and one key for both would multiply the redline rows. */
const typeOf = (n: FigmaNodePlan): Map<string, string> => new Map(n.textStyle ? [['textStyle', JSON.stringify(refOfStyle(n.textStyle))]] : []);

/** One node's color facts. A text node's fill is its INK; an instance's descendant fill and a glyph's fill its ICON. */
const colorsOf = (n: FigmaNodePlan): Map<string, string> => {
  const m = new Map<string, string>();
  const fill = n.type === 'TEXT' ? 'ink' : n.type === 'GLYPH' ? 'icon' : 'fill';
  if (n.paints?.fills) m.set(fill, JSON.stringify(refOfVar(n.paints.fills)));
  if (n.paints?.strokes) m.set('stroke', JSON.stringify(refOfVar(n.paints.strokes)));
  if (n.descendantFills) m.set('icon', JSON.stringify(refOfVar(n.descendantFills)));
  if (n.gradientFill) m.set('gradient', JSON.stringify(n.gradientFill.stops.map((s) => refOfVar(s.variable))));
  return m;
};

// ---- keying -----------------------------------------------------------------------------------

const keyOf = (coord: Record<string, string>, axes: readonly string[]): string => axes.map((a) => `${a}=${coord[a] ?? ''}`).join(', ');

/** How many `part.prop` facts take more than one value within one key. Zero when every value is a function of the key. */
const conflicts = (members: Member[], facts: (n: FigmaNodePlan, path: string) => Map<string, string>, allProps: Map<string, Set<string>>, axes: readonly string[]): number => {
  const seen = new Map<string, string>();
  const bad = new Set<string>();
  for (const m of members) {
    const key = keyOf(m.coord, axes);
    for (const [path, n] of m.nodes) {
      const f = facts(n, path);
      // A property a part holds on some members and not others is a fact too: its absence is a value.
      for (const prop of new Set([...f.keys(), ...allProps.get(path) ?? []])) {
        const k = `${key}|${path}|${prop}`;
        const v = f.get(prop) ?? '∅';
        if (seen.has(k) && seen.get(k) !== v) bad.add(k);
        seen.set(k, v);
      }
    }
  }
  return bad.size;
};

/** The smallest key, grown greedily from `base`, under which every fact is a function of the key (see the header). */
const keyAxes = (members: Member[], facts: (n: FigmaNodePlan, path: string) => Map<string, string>, base: readonly string[], candidates: readonly string[]): string[] => {
  // Every property a path carries on any member, so `conflicts` sees an absence.
  const allProps = new Map<string, Set<string>>();
  for (const m of members) for (const [path, n] of m.nodes) for (const k of facts(n, path).keys()) allProps.set(path, new Set([...allProps.get(path) ?? [], k]));
  const key = [...base];
  let rest = candidates.filter((c) => !key.includes(c));
  for (let c = conflicts(members, facts, allProps, key); c > 0;) {
    if (!rest.length) throw new Error(`component spec: ${c} value(s) are not a function of the full member coordinate — two members share a coordinate`);
    const scored = rest.map((a) => ({ a, c: conflicts(members, facts, allProps, [...key, a]) }));
    const best = scored.reduce((x, y) => (y.c < x.c ? y : x));
    key.push(best.a);
    rest = rest.filter((a) => a !== best.a);
    c = best.c;
  }
  return key;
};

/** Rows in member order: one per distinct key coordinate, holding every fact any of its members holds. */
const rowsOf = <P>(members: Member[], axes: readonly string[], facts: (n: FigmaNodePlan, path: string) => Map<string, string>, build: (path: string, f: Map<string, string>) => P | undefined): { where: SpecWhere; parts: P[] }[] => {
  const rows = new Map<string, { where: SpecWhere; byPath: Map<string, Map<string, string>> }>();
  for (const m of members) {
    const key = keyOf(m.coord, axes);
    if (!rows.has(key)) rows.set(key, { where: Object.fromEntries(axes.filter((a) => m.coord[a] !== undefined).map((a) => [a, m.coord[a]])), byPath: new Map() });
    const row = rows.get(key)!;
    for (const [path, n] of m.nodes) {
      const f = facts(n, path);
      if (!f.size) continue;
      row.byPath.set(path, new Map([...row.byPath.get(path) ?? [], ...f]));
    }
  }
  return [...rows.values()].map((r) => ({ where: r.where, parts: [...r.byPath].flatMap(([path, f]) => { const p = build(path, f); return p ? [p] : []; }) }));
};

// ---- the model --------------------------------------------------------------------------------

const KIND: Record<FigmaNodePlan['type'], SpecPart['kind']> = { FRAME: 'frame', TEXT: 'text', INSTANCE_SWAP: 'swap', NESTED_INSTANCE: 'instance', GLYPH: 'glyph', CONTENT_SLOT: 'slot' };

/**
 * The spec model for one def. `def` is the def as it is projected — `specMaterialize(authored)` by default, or a
 * brand's own materialization. `authored` is the def as written, read only for provenance a materialization erases
 * (Tag's ratio). `px`, when a caller has a brand, resolves each token to its px value.
 */
export const componentSpec = (authored: ComponentDef, opts: { def?: ComponentDef; px?: (ref: string) => number | undefined } = {}): ComponentSpec => {
  const def = opts.def ?? specMaterialize(authored);
  const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  const members: Member[] = plans.map((p) => ({ coord: coordOf(p), nodes: new Map(nodesOf(p.root)) }));
  const rootOf = new Map(plans.map((p) => [p.root.name, true]));
  const p0 = plans[0];
  const fp = def.figmaProperties!;

  // AXES — in the member name's order: grid axes, size, state, slots.
  const valuesOf = (a: string) => [...new Set(members.map((m) => m.coord[a]).filter((v): v is string => v !== undefined))];
  const grid = p0.gridAxisOrder.filter((a) => valuesOf(a).length);
  const slots = p0.slotAxes;
  const axes: SpecAxis[] = [
    ...grid.map((a) => ({ name: a, figmaName: p0.axisFigmaNames?.[a] ?? a, values: valuesOf(a), kind: 'variant' as const })),
    ...(valuesOf('size').length ? [{ name: 'size', figmaName: 'size', values: valuesOf('size'), kind: 'size' as const }] : []),
    ...(valuesOf('state').length ? [{ name: 'state', figmaName: 'state', values: valuesOf('state'), kind: 'state' as const }] : []),
    ...slots.map((s) => ({ name: s, figmaName: p0.slotFigmaNames?.[s] ?? s, values: valuesOf(s), kind: 'slot' as const })),
  ];
  const all = axes.map((a) => a.name);

  // ANATOMY — every path, in first-seen order, with the members that hold it and, where one axis decides that, which.
  const paths = [...new Set(members.flatMap((m) => [...m.nodes.keys()]))];
  const anatomy: SpecPart[] = paths.map((path) => {
    const holding = members.filter((m) => m.nodes.has(path));
    const node = holding[0].nodes.get(path)!;
    const part: SpecPart = { part: path, kind: KIND[node.type], members: holding.length };
    if (holding.length < members.length) {
      const axis = all.find((a) => {
        const on = new Set(holding.map((m) => m.coord[a]));
        return members.every((m) => on.has(m.coord[a]) === m.nodes.has(path));
      });
      if (axis) part.when = { [axis]: valuesOf(axis).filter((v) => holding.some((m) => m.coord[axis] === v)) };
    }
    return part;
  });

  // REDLINES — keyed size × slots, grown until every value is a function of the key.
  const geo = (n: FigmaNodePlan, path: string) => geometryOf(n, rootOf.has(path), def, authored);
  const redlineKey = keyAxes(members, geo, all.filter((a) => a === 'size' || slots.includes(a)), all);
  const withPx = (v: SpecValue): SpecValue => ('token' in v && opts.px ? { ...v, ...(opts.px(v.token) === undefined ? {} : { px: opts.px(v.token) }) } : v);
  const redlines = rowsOf(members, redlineKey, geo, (part, f) => {
    const values = Object.fromEntries(SPEC_PROPERTIES.filter((k) => f.has(k)).map((k) => [k, withPx(JSON.parse(f.get(k)!) as SpecValue)]));
    return { part, values };
  });

  // TYPE — each text part's style, keyed by size and grown the same way.
  const typeKey = keyAxes(members, typeOf, all.filter((a) => a === 'size'), all);
  const type = rowsOf(members, typeKey, typeOf, (part, f) => ({ part, textStyle: JSON.parse(f.get('textStyle')!) as string }));

  // COLORS — keyed every variant axis × state, grown the same way (a color that moves on size would add size).
  const colorKey = keyAxes(members, colorsOf, all.filter((a) => a !== 'size' && !slots.includes(a)), all);
  const colors = rowsOf(members, colorKey, colorsOf, (part, f) => ({ part, ...Object.fromEntries([...f].map(([k, v]) => [k, JSON.parse(v)])) }));

  // NESTING — one entry per nesting path, first member that holds it.
  const nesting: SpecNest[] = [];
  for (const path of paths) {
    const n = members.find((m) => m.nodes.has(path))!.nodes.get(path)!;
    const partDef = def.anatomy?.parts[n.name];
    if (n.type === 'NESTED_INSTANCE' && n.nestTarget) {
      const rel = partDef?.nesting;
      const variant = rel && rel.kind !== 'swap' ? { ...rel.variant } : { ...n.nestVariant ?? {} };
      nesting.push({ part: path, kind: 'instance', component: n.nestTarget, variant, follows: rel && rel.kind !== 'swap' ? [...rel.follow ?? []] : [], exposes: [...n.nestExpose ?? []] });
    } else if (n.type === 'INSTANCE_SWAP' && n.propertyRef?.field === 'mainComponent') {
      nesting.push({ part: path, kind: 'swap', property: n.propertyRef.prop, ...(n.visibleProp ? { visibility: n.visibleProp } : {}), ...(partDef?.swapDefault ? { default: partDef.swapDefault } : {}) });
    } else if (n.type === 'INSTANCE_SWAP' && n.swapTarget) {
      const components = [...new Set(members.flatMap((m) => { const t = m.nodes.get(path)?.swapTarget; return t ? [t] : []; }))];
      nesting.push({ part: path, kind: 'fixed', components });
    } else if (n.type === 'CONTENT_SLOT') {
      nesting.push({ part: path, kind: 'slot', ...(n.propertyRef ? { property: n.propertyRef.prop } : {}), preferred: [...n.slotPreferred ?? []] });
    }
  }

  const properties: SpecComponentProperty[] = planSetProperties(plans).map((p) =>
    p.type === 'TEXT' || p.type === 'BOOLEAN' ? { name: p.name, type: p.type, default: p.default } : { name: p.name, type: p.type });

  const projected = new Set(fp.stateAxis?.values ?? []);
  return {
    id: authored.id,
    name: authored.name,
    members: members.length,
    axes,
    codeOnlyStates: fp.stateAxis ? authored.states.filter((s) => !projected.has(s)) : [],
    anatomy,
    redlineKey,
    redlines,
    typeKey,
    type,
    colorKey,
    colors,
    nesting,
    properties,
  };
};

export const projectComponentSpecs = (defs: readonly ComponentDef[]) => ({
  $schema: COMPONENT_SPECS_SCHEMA,
  generated: true,
  note:
    'The spec of every component built in the design file, from the same plan that builds it: its parts, the ' +
    'spacing and size tokens per size, the color tokens per state, and what nests where. Token names only, so one ' +
    'file serves every brand; a number appears only where the build writes one, labeled literal or derived. ' +
    '`where` on a row names the member coordinate it covers.',
  components: Object.fromEntries(defs.filter((d) => d.figmaProperties).map((d) => [d.id, componentSpec(d)])),
});

// ---- markdown ---------------------------------------------------------------------------------

const code = (s: string) => `\`${s}\``;
const whereText = (w: SpecWhere): string => Object.entries(w).map(([a, v]) => `${a}=${v}`).join(', ') || 'every member';
const valueText = (v: SpecValue): string =>
  'token' in v ? `${code(v.token)}${v.px === undefined ? '' : ` · ${v.px}px`}` : `${v.px}px (${v.source}${'rule' in v ? `: ${v.rule}` : ''})`;
const LABEL: Record<SpecProperty, string> = {
  paddingTop: 'padding top', paddingRight: 'padding right', paddingBottom: 'padding bottom', paddingLeft: 'padding left',
  gap: 'gap', rowGap: 'row gap', height: 'height', minHeight: 'min height', width: 'width', minWidth: 'min width',
  maxWidth: 'max width', buildWidth: 'build width', buildHeight: 'build height',
};

/** The Specs section of a component page: the model's four blocks as tables. Empty for a def with no design-file set. */
export const renderSpecsMarkdown = (spec: ComponentSpec | undefined): string[] => {
  if (!spec) return [];
  const out: string[] = ['## Specs', '', `Generated from the plan that builds the design-file component: ${spec.members} member${spec.members === 1 ? '' : 's'}. Values are token names; a px value appears only where the build writes a number.`, ''];

  out.push('### Anatomy', '', '| Part | Kind | In |', '| --- | --- | --- |');
  for (const p of spec.anatomy) {
    const inText = p.members === spec.members ? 'every member' : p.when ? Object.entries(p.when).map(([a, vs]) => `${a}=${vs.join(' or ')}`).join(', ') : `${p.members} of ${spec.members} members`;
    out.push(`| ${code(p.part)} | ${p.kind} | ${inText} |`);
  }
  if (spec.codeOnlyStates.length) out.push('', `Code-only states, with no design-file member: ${spec.codeOnlyStates.map(code).join(', ')}.`);
  out.push('');

  out.push('### Spacing and size', '', 'Padding reads top / right / bottom / left when its sides differ.', '', `Keyed by ${spec.redlineKey.map(code).join(', ') || 'nothing: one row covers every member'}.`, '');
  for (const row of spec.redlines) {
    if (!row.parts.length) continue;
    out.push(`**${whereText(row.where)}**`, '', '| Part | Padding | Gap | Height | Width | Min width | Other |', '| --- | --- | --- | --- | --- | --- | --- |');
    for (const p of row.parts) {
      const v = p.values;
      const cell = (k: SpecProperty) => (v[k] ? valueText(v[k]!) : '—');
      const sides = (['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const).map((k) => (v[k] ? valueText(v[k]!) : '—'));
      const padding = sides.every((x) => x === '—') ? '—' : sides.every((x) => x === sides[0]) ? sides[0] : sides.join(' / ');
      const other = (['rowGap', 'minHeight', 'maxWidth', 'buildWidth', 'buildHeight'] as const).filter((k) => v[k]).map((k) => `${LABEL[k]} ${valueText(v[k]!)}`).join('; ') || '—';
      out.push(`| ${code(p.part)} | ${padding} | ${cell('gap')} | ${cell('height')} | ${cell('width')} | ${cell('minWidth')} | ${other} |`);
    }
    out.push('');
  }

  if (spec.type.some((r) => r.parts.length)) {
    out.push('### Type', '', `Keyed by ${spec.typeKey.map(code).join(', ') || 'nothing: one row covers every member'}.`, '', '| Members | Part | Text style |', '| --- | --- | --- |');
    for (const row of spec.type) for (const p of row.parts) out.push(`| ${whereText(row.where)} | ${code(p.part)} | ${code(p.textStyle)} |`);
    out.push('');
  }

  out.push('### Color', '', `Keyed by ${spec.colorKey.map(code).join(', ') || 'nothing: one row covers every member'}.`, '');
  for (const row of spec.colors) {
    if (!row.parts.length) continue;
    out.push(`**${whereText(row.where)}**`, '', '| Part | Fill | Stroke | Ink | Icon |', '| --- | --- | --- | --- | --- |');
    for (const p of row.parts) {
      const fill = p.fill ? code(p.fill) : p.gradient ? `gradient ${p.gradient.map(code).join(' → ')}` : '—';
      out.push(`| ${code(p.part)} | ${fill} | ${p.stroke ? code(p.stroke) : '—'} | ${p.ink ? code(p.ink) : '—'} | ${p.icon ? code(p.icon) : '—'} |`);
    }
    out.push('');
  }

  if (spec.nesting.length || spec.properties.length) {
    out.push('### Nesting and properties', '');
    for (const n of spec.nesting) {
      if (n.kind === 'instance') {
        const variant = Object.entries(n.variant).map(([a, v]) => `${a}=${v}`).join(', ');
        out.push(`- ${code(n.part)} nests ${code(n.component)}${variant ? ` at ${code(variant)}` : ''}${n.follows.length ? `; follows ${n.follows.map(code).join(', ')}` : ''}${n.exposes.length ? `; exposes ${n.exposes.map(code).join(', ')}` : ''}`);
      } else if (n.kind === 'fixed') {
        out.push(`- ${code(n.part)} holds ${n.components.map(code).join(', ')}, by member; it is not a swap`);
      } else if (n.kind === 'swap') {
        out.push(`- ${code(n.part)} is a swap slot, property ${code(n.property)}${n.visibility ? `, shown by ${code(n.visibility)}` : ''}${n.default ? `, default ${code(n.default)}` : ''}`);
      } else {
        out.push(`- ${code(n.part)} is a slot${n.property ? `, property ${code(n.property)}` : ''}${n.preferred.length ? `, preferring ${n.preferred.map(code).join(', ')}` : ''}`);
      }
    }
    if (spec.nesting.length) out.push('');
    if (spec.properties.length) {
      out.push('| Property | Type | Default |', '| --- | --- | --- |');
      for (const p of spec.properties) out.push(`| ${code(p.name)} | ${p.type.toLowerCase().replace('_', ' ')} | ${p.default === undefined ? '—' : code(String(p.default))} |`);
      out.push('');
    }
  }
  return out;
};
