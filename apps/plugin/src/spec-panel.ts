/**
 * THE SPEC PANEL BESIDE EACH USAGE PANEL (#2830 phase 2; owner's answers 2026-10-24: Q2830.1 B, Q2830.2–.7 A; the color
 * table's layout, Q2830.8 A, and its value column, Q2830.9 A, built on the 2026-10-25 wireframe's recommendations,
 * pending the owner's answers) — the family's spec sheet, drawn on its page from `_Doc-block` instances: anatomy,
 * redlines per size labeled `variable · px`, colors per state per part, and nesting.
 *
 * ONE SOURCE. The panel reads the engine's spec model (`component-specs.ts` `componentSpec`, phase 1), the same model
 * `out/components/specs.json` and each component's Markdown page render, and `test:roundtrip` reads back against the
 * built set. Nothing here decides a token a second time: every name on the panel is the model's, in its Figma spelling.
 *
 * WHAT IT SHOWS, per set of the family (Q2830.2 A: one panel per family, a section per set):
 *   - Anatomy: each part the plans build, numbered as the usage panel numbers it (`anatomyMarks`, Q2830.4 A), with its
 *     layer path, its kind and the members that hold it. A part the usage panel does not number (the root, a
 *     structural frame) is listed without one. Then the code-only states, named.
 *   - Spacing and size: per size, the member at rest in the default appearance, without and with a leading visual
 *     where the set has one (the member choice carried from 2026-10-19, confirmed at QA), as a live specimen with
 *     redlines over it. A redline's label is the model's token in its Figma spelling and the px the specimen holds in
 *     the file (`space/200 · 16`); a value the build writes as a number is labeled derived or literal. The size's other
 *     values (icon sizes, a caret) and its text styles follow as rows.
 *   - Color: one table per value of every axis the colors move on but state (Q2830.5 A): rest in full, each other state
 *     only what changes from rest. One row per binding in four fixed columns (Q2830.8 A, `COLOR_COLUMNS`): state, part
 *     and role, the variable's name whole on one line, and its value, a swatch bound to the variable (so it follows the
 *     frame's mode) with the hex the file resolves for the panel when it is drawn (Q2830.9 A).
 *   - Nesting and properties: each nested instance, swap slot and placed instance, then the set's properties.
 *
 * PLACED FROM THE HOST, LABELED FROM THE PLAN (the furniture rule). The plan holds bindings, not coordinates, so a
 * redline is drawn where the laid-out specimen puts its part (`absoluteBoundingBox`) and labeled from the model. Its px
 * is read off the specimen in the file, so it is what the file shows in the frame's mode, not the engine's default brand.
 *
 * WHERE (Q2830.1 B): its own column, `SPEC_WIDTH` (880) wide, `SPEC_GAP` right of the family's live usage panel and
 * top-aligned with it. With no live usage panel, where it would go beside the one that will be. Update reserves the
 * column for every lead set whether or not specs are drawn (`PANEL_REACH`), so every set moved once, on the first Update
 * after this, and drawing specs never needs the row spaced again. Never on top of anything: a node where the panel goes
 * keeps it from being drawn, and the run names the node. The set's own labels never block it.
 *
 * NO NAME WRAPS. The columns are sized from the widest string any set's panel writes, measured in the default brand's
 * body/sm (Inter 14): the longest variable, `color/inverse/interactive/destructive/overlay/pressed`, is 351px of the
 * variable column's 368. A brand's own body/sm can be wider, so the draw measures each string in the template's face as
 * it writes it, and names any wider than its column in the run's result (`test-doc-panel.ts` `specs/no wrap`).
 *
 * WHEN (Q2830.3 A): only on request, `draw-specs`. Build and Update never draw one. Update never writes into one: a
 * live panel is furniture of its set, so it moves with the set when Update spaces the row (`update-plan.ts`
 * `pageViews`, `update-apply.ts` `respaceLive`), and a usage panel redrawn further right pushes it right (`doc-panel.ts`).
 *
 * HAND EDITS ARE KEPT (#846's Q406.9 A rule, #2956's posture). A panel records what it holds when drawn (the usage
 * panel's print, `panelPrint`) and the plan it was drawn from. A run replaces an earlier panel of the set that still
 * holds what was written; one that does not was edited, so it is kept, renamed "(edited)", moved below everything in
 * the spec column (under the fresh panel, never into the usage panel's column), and named in the run's result. A kept
 * panel is never touched again, except to move it out of the way.
 *
 * NEVER THROWS FOR A MISSING TEMPLATE. A file without `_Doc-block` draws no panel and keeps any it has.
 *
 * HELD FOR THE OWNER: `SPEC_GAP`, the redline geometry, `REDLINE` (the spec magenta, Q from 2026-10-19), the color
 * table (Q2830.8, Q2830.9), and every sentence this file writes (DRAFT wording, Q2830.7).
 */
import { componentSpec, specMaterialize, type ComponentSpec, type SpecValue } from '@prism3/engine/component-specs';
import { docSections } from '@prism3/engine/component-doc-sections';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { componentDefs } from '@prism3/engine/components/index';
import { figmaTextStyleName, figmaVarName } from '@prism3/engine/anatomy-figma';
import { fnv } from './style-guide';
import { readTag } from './canvas-furniture';
import { CAPTION, DOC_BLOCK_SET, SPECIMEN, docBlockVariant, variantValues, type DocBlockSize, type DocBlockType } from './doc-block';
import {
  PANEL_PAD, PANEL_WIDTH, SECTION_GAP, SECTION_TYPE, SPEC_GAP, SPEC_WIDTH, TITLE_TYPE, anatomyMarks, findDocBlock, overlaps, panelWidthFor,
  panelFamily, panelPrint, panelSpot, readPanelTag, type Box, type PNode, type PanelApi, type PanelParent, type PanelVariable,
} from './doc-panel';
import { SPEC_PANEL_KEY, SPEC_PANEL_NS, readSpecTag, type SpecTag } from './spec-tag';

/** What the panel held when it was drawn, and the plan it was drawn from. Shared, so another tool can read them. */
export const SPEC_PANEL_PRINT = 'specPanelPrint';
export const SPEC_PANEL_PLAN = 'specPanelPlan';
/** On each section frame: the def and the block it draws, `<def>:<section>`. */
export const SPEC_SECTION_KEY = 'specSection';
export { SPEC_GAP, SPEC_WIDTH };
/** The fixed spec magenta of every redline: not a brand color, so it reads apart from the component it measures. */
export const REDLINE = { r: 216 / 255, g: 27 / 255, b: 96 / 255 } as const;
/** A redline's label size, in px, and the room a label row takes. */
export const REDLINE_TYPE = 10;
const LABEL_ROW = 14;
/** From the specimen to its first redline, and from a line to its label. */
const LINE_GAP = 8;
const TICK = 5;
/** THE COLOR TABLE'S COLUMNS (Q2830.8 A), in px, and the gap between them: they fill the panel's 832 of content. Each is
 *  the widest string any set's panel puts in it, measured in Inter 14, plus a margin: state "Focus visible filled" 122,
 *  part and role "Chevron down glyph icon" 170, variable 351, value a swatch and "#000000 10%" 113. */
export const COLOR_COLUMNS = { state: 128, part: 192, variable: 368, value: 120 } as const;
export const COLOR_GAP = 8;
const SWATCH = 12;
const SWATCH_GAP = 6;
const SIZE: DocBlockSize = 'sm';
/** Raise when the panel's layout moves without its plan moving, so every drawn panel reads as due again. 2: its own
 *  column beside the usage panel, and the color table in fixed columns (Q2830.1 B, Q2830.8 A). */
const SPEC_FORMAT = 2;

/* ── the pure planner ──────────────────────────────────────────────────────────────────────────────────── */

/** One redline: the part it measures (its path below the specimen's root), what it measures, and its label before
 *  the px (`space/200`, or `min width 104 · derived`). `px` is set when the label carries its own number. */
export interface RedlineMark { path: string[]; prop: 'paddingLeft' | 'paddingRight' | 'paddingTop' | 'height' | 'gap' | 'minWidth' | 'buildWidth'; label: string; px?: number }
/** One color binding: the part's name, its role, and the variable in its Figma spelling. `dropped` marks a (part, role)
 *  bound at rest that this state leaves unbound (Q2994.1 A): its variable reads "none" and it draws no swatch. */
export interface SpecBinding { part: string; role: string; variable: string; dropped?: true }
export type SpecBlock =
  | { type: 'Heading'; text: string }
  | { type: 'Paragraph'; text: string }
  | { type: 'Field'; label: string; text: string }
  /** A specimen of the member at `where` (code axis → value), with its redlines. */
  | { type: 'Redline'; where: Record<string, string>; caption: string; marks: RedlineMark[] }
  /** A color table: each state's bindings, or `same` when nothing moves from rest. */
  | { type: 'Colors'; title: string; rows: { state: string; bindings: SpecBinding[]; same?: boolean }[] };
export interface SpecSection { id: 'anatomy' | 'spacing' | 'color' | 'nesting'; title: string; blocks: SpecBlock[] }
export interface SpecDefPlan { def: string; name: string; members: number; axes: ComponentSpec['axes']; sections: SpecSection[] }
export interface SpecPanelPlan { def: string; title: string; lede: string; defs: SpecDefPlan[]; hash: string }

const sentence = (s: string): string => { const t = s.replace(/-/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
/** A part path's leaf as a name: the usage panel's name for it when the def lists it, else the layer name in words. */
const partNames = (def: ComponentDef): Map<string, string> => {
  const a = docSections(def).sections.find((s) => s.id === 'anatomy');
  return new Map(a && a.id === 'anatomy' ? a.parts.map((p) => [p.id, p.name]) : []);
};
const leafOf = (path: string): string => path.split('/').pop() ?? path;
/** The path below the root, as the specimen holds it. */
const below = (path: string): string[] => path.split('/').slice(1);
const valueLabel = (v: SpecValue, what: string): { label: string; px?: number } =>
  'token' in v ? { label: figmaVarName(v.token) } : { label: `${what} ${v.px} · ${v.source}`, px: v.px };

/** The members a size's redlines show: every slot off, then the leading visual on where the set has one; every other
 *  key axis at its first value (the default member's). */
const redlineCases = (spec: ComponentSpec): { size?: string; leading: boolean }[] => {
  const sizes = spec.axes.find((a) => a.name === 'size')?.values ?? [undefined];
  const hasLeading = spec.axes.some((a) => a.kind === 'slot' && a.name === 'leading');
  return (sizes as (string | undefined)[]).flatMap((size) => [{ size, leading: false }, ...(hasLeading ? [{ size, leading: true }] : [])]);
};

/** The plan of one set's sections, from its spec model. */
export const planSpecDef = (authored: ComponentDef, def: ComponentDef = authored): SpecDefPlan => {
  const spec = componentSpec(authored, { def });
  const names = partNames(authored);
  const nameOf = (path: string): string => names.get(leafOf(path)) ?? sentence(leafOf(path).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase());
  const a = docSections(authored).sections.find((s) => s.id === 'anatomy');
  const numbers = new Map((a && a.id === 'anatomy' ? anatomyMarks(authored, a.parts.map((p) => p.id)) : []).map((m) => [m.part, m.n]));
  const sections: SpecSection[] = [];

  // ANATOMY (Q2830.4 A): the usage panel's numbers, as rows.
  const anat: SpecBlock[] = [{ type: 'Paragraph', text: 'Numbers match the usage panel\'s Anatomy.' }];
  for (const p of spec.anatomy) {
    const n = numbers.get(leafOf(p.part));
    const inText = p.members === spec.members ? 'every member' : p.when ? Object.entries(p.when).map(([ax, vs]) => `${ax} ${vs.join(' or ')}`).join(', ') : `${p.members} of ${spec.members} members`;
    anat.push({ type: 'Field', label: `${n ?? '·'}  ${nameOf(p.part)}`, text: `${below(p.part).join(' / ') || 'root'} · ${p.kind} · ${inText}` });
  }
  if (spec.codeOnlyStates.length) anat.push({ type: 'Paragraph', text: `Code-only states, with no design-file member: ${spec.codeOnlyStates.join(', ')}.` });
  sections.push({ id: 'anatomy', title: 'Anatomy', blocks: anat });

  // SPACING AND SIZE: per size, without and with a leading visual.
  const spacing: SpecBlock[] = [{ type: 'Paragraph', text: 'Labels read variable · px, where the px is this file\'s.' }];
  const keyDefault = (ax: string): string | undefined => spec.axes.find((x) => x.name === ax)?.values[0];
  for (const c of redlineCases(spec)) {
    const want: Record<string, string> = {};
    for (const ax of spec.redlineKey) {
      const kind = spec.axes.find((x) => x.name === ax)?.kind;
      want[ax] = ax === 'size' ? c.size! : kind === 'slot' ? String(ax === 'leading' && c.leading) : keyDefault(ax)!;
    }
    const row = spec.redlines.find((r) => Object.entries(want).every(([ax, v]) => r.where[ax] === v));
    if (!row) continue;
    const marks: RedlineMark[] = [];
    const rest: SpecBlock[] = [];
    for (const p of row.parts) {
      const v = p.values;
      const path = below(p.part);
      // The root and any box a part pads are drawn; anything else a part holds is a row under the specimen.
      const framed = !path.length || v.paddingLeft || v.paddingRight || v.paddingTop;
      if (framed) {
        for (const prop of ['paddingLeft', 'paddingRight', 'paddingTop', 'height', 'gap'] as const) if (v[prop]) marks.push({ path, prop, ...valueLabel(v[prop]!, prop) });
        if (v.minWidth) marks.push({ path, prop: 'minWidth', ...valueLabel(v.minWidth, 'min width') });
        if (v.buildWidth) marks.push({ path, prop: 'buildWidth', ...valueLabel(v.buildWidth, 'build width') });
      } else {
        const vals = (['width', 'height', 'gap', 'minWidth', 'buildWidth'] as const).filter((k) => v[k]).map((k) => `${k === 'minWidth' ? 'min width' : k === 'buildWidth' ? 'build width' : k} ${'token' in v[k]! ? figmaVarName((v[k] as { token: string }).token) : valueLabel(v[k]!, '').label.trim()}`);
        if (vals.length) rest.push({ type: 'Field', label: nameOf(p.part), text: vals.join(' · ') });
      }
    }
    const tr = spec.type.find((r) => Object.entries(r.where).every(([ax, v]) => ax === 'size' ? v === c.size : v === keyDefault(ax)));
    for (const t of tr?.parts ?? []) rest.push({ type: 'Field', label: nameOf(t.part), text: `text style ${figmaTextStyleName(t.textStyle)}` });
    // The specimen: the default member at this size and slot case, at rest.
    const where: Record<string, string> = {};
    for (const ax of spec.axes) where[ax.name] = ax.name === 'size' ? c.size! : ax.kind === 'slot' ? String(ax.name === 'leading' && c.leading) : ax.name === 'state' ? (ax.values.includes('rest') ? 'rest' : ax.values[0]) : ax.values[0];
    const caption = `${c.size ? sentence(c.size) : 'Every size'}${spec.axes.some((x) => x.name === 'leading') ? (c.leading ? ', with a leading visual' : ', no visuals') : ''}`;
    spacing.push({ type: 'Redline', where, caption, marks }, ...(c.leading ? [] : rest));
  }
  sections.push({ id: 'spacing', title: 'Spacing and size', blocks: spacing });

  // COLOR (Q2830.5 A): a table per value of the axes the colors move on but state.
  const color: SpecBlock[] = [{ type: 'Paragraph', text: 'Each swatch is bound to the variable it names. Rest is shown in full; each other state shows what changes.' }];
  const groupAxes = spec.colorKey.filter((ax) => ax !== 'state');
  const groups = new Map<string, typeof spec.colors>();
  for (const r of spec.colors) {
    const k = groupAxes.map((ax) => `${ax} ${r.where[ax] ?? ''}`).join(', ');
    groups.set(k, [...groups.get(k) ?? [], r]);
  }
  const bindingsOf = (r: (typeof spec.colors)[number]): SpecBinding[] => r.parts.flatMap((p) => (['fill', 'stroke', 'ink', 'icon'] as const)
    .filter((role) => p[role]).map((role): SpecBinding => ({ part: nameOf(p.part), role, variable: figmaVarName(p[role]!) }))
    // A gradient names a variable per stop: a row each, so every name stays whole on its own line.
    .concat((p.gradient ?? []).map((t, i): SpecBinding => ({ part: nameOf(p.part), role: `gradient stop ${i + 1}`, variable: figmaVarName(t) }))));
  for (const [k, rows] of groups) {
    const rest = rows.find((r) => r.where.state === 'rest') ?? rows[0];
    const restBindings = bindingsOf(rest);
    const restKeys = new Set(restBindings.map((b) => JSON.stringify(b)));
    const slot = (b: SpecBinding): string => `${b.part}\u0000${b.role}`;
    const out = rows.map((r) => {
      const all = bindingsOf(r);
      const changed = r === rest ? all : all.filter((b) => !restKeys.has(JSON.stringify(b)));
      // A (part, role) bound at rest and unbound here is a change too: a row reading "none" (Q2994.1 A).
      const held = new Set(all.map(slot));
      const dropped = r === rest ? [] : restBindings.filter((b) => !held.has(slot(b))).map((b): SpecBinding => ({ part: b.part, role: b.role, variable: 'none', dropped: true }));
      const bindings = [...changed, ...dropped];
      return { state: r.where.state ?? 'every state', bindings, ...(bindings.length ? {} : { same: true }) };
    });
    color.push({ type: 'Colors', title: k ? sentence(k) : 'Every member', rows: out });
  }
  if (spec.codeOnlyStates.length) color.push({ type: 'Paragraph', text: `No colors for ${spec.codeOnlyStates.join(', ')}: code-only, with no design-file member.` });
  sections.push({ id: 'color', title: 'Color', blocks: color });

  // NESTING AND PROPERTIES.
  const nest: SpecBlock[] = [];
  for (const n of spec.nesting) {
    const text = n.kind === 'instance'
      ? `nests ${n.component}${Object.keys(n.variant).length ? ` at ${Object.entries(n.variant).map(([ax, v]) => `${ax} ${v}`).join(', ')}` : ''}${n.follows.length ? `; follows ${n.follows.join(', ')}` : ''}${n.exposes.length ? `; exposes ${n.exposes.join(', ')}` : ''}`
      : n.kind === 'swap' ? `swap slot, property ${n.property}${n.visibility ? `, shown by ${n.visibility}` : ''}`
        : n.kind === 'fixed' ? `${n.components.join(', ')}, by member; not a swap`
          : `slot${n.property ? `, property ${n.property}` : ''}`;
    nest.push({ type: 'Field', label: nameOf(n.part), text });
  }
  if (spec.properties.length) nest.push({ type: 'Field', label: 'Properties', text: spec.properties.map((p) => `${p.name} (${p.type.toLowerCase().replace('_', ' ')}${p.default === undefined ? '' : `, default ${String(p.default)}`})`).join(', ') });
  if (nest.length) sections.push({ id: 'nesting', title: 'Nesting and properties', blocks: nest });

  return { def: authored.id, name: authored.name, members: spec.members, axes: spec.axes, sections };
};

/**
 * The spec panel for a family, from its lead: one `SpecDefPlan` per set of the family that builds one, the lead
 * first. `materialize` is the def as this file builds it (`materializeForBrand` with the file's brand), so the tokens
 * are the ones its sets bind; without one, the default brand's (`specMaterialize`), as the emitted model. Pure, so the whole content rule is checked with no host (`test-doc-panel.ts`).
 */
export const planSpecPanel = (lead: ComponentDef, opts: { materialize?: (d: ComponentDef) => ComponentDef } = {}): SpecPanelPlan => {
  const fam = panelFamily(lead.id);
  const ids = fam ? [lead.id, ...fam.members.filter((m) => m !== lead.id)] : [lead.id];
  const defs = ids.flatMap((id) => componentDefs.filter((d) => d.id === id && d.figmaProperties)).map((d) => planSpecDef(d, (opts.materialize ?? specMaterialize)(d)));
  const body = {
    def: lead.id,
    title: `${lead.name} specs`,
    lede: 'Drawn from the plan that builds each set. A value is a variable unless it is marked derived or literal.',
    defs,
  };
  const s = JSON.stringify(body);
  return { ...body, hash: `${SPEC_FORMAT}:${fnv(s, false)}${fnv(s, true)}` };
};

/* ── the executor ──────────────────────────────────────────────────────────────────────────────────────── */

export interface SpecApi extends PanelApi { createText(): PNode }

/** What drawing did for one family. */
export interface SpecOutcome {
  def: string;
  drawn: boolean;
  /** The sets the drawn panel covers, by def id. */
  sets: string[];
  replaced: number;
  kept: string[];
  skipped: string[];
  missing?: string[];
  /** Redlines placed on the specimens. */
  redlines?: number;
  misses: string[];
}

const writeTag = (n: PNode, t: SpecTag): void => n.setSharedPluginData?.(SPEC_PANEL_NS, SPEC_PANEL_KEY, JSON.stringify(t));
const allSpecPanels = (api: Pick<PanelApi, 'root'>): { node: PNode; tag: SpecTag }[] =>
  (api.root.findAllWithCriteria({ types: ['FRAME'], sharedPluginData: { namespace: SPEC_PANEL_NS, keys: [SPEC_PANEL_KEY] } }) as readonly PNode[])
    .flatMap((node) => { const tag = readSpecTag(node); return tag && !node.removed ? [{ node, tag }] : []; });
/** This set's earlier live spec panels: by its id, or its def's on its parent whose set is gone. */
const earlierSpecPanels = (api: Pick<PanelApi, 'root'>, set: PNode, defId: string): PNode[] => {
  const setIds = new Set((api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[]).map((s) => String(s.id ?? '')));
  return allSpecPanels(api).filter(({ node, tag }) => tag.state === 'live'
    && (tag.set === String(set.id ?? '') || (node.parent === set.parent && tag.def === defId && !setIds.has(tag.set)))).map((p) => p.node);
};
/** Whether a spec panel still holds what it was drawn with. One with no record reads as edited: the safe direction. */
export const specPanelUnedited = async (n: PNode): Promise<boolean> => {
  const print = n.getSharedPluginData?.(SPEC_PANEL_NS, SPEC_PANEL_PRINT) ?? '';
  return !!print && (await panelPrint(n)) === print;
};

/** The set's live usage panel on its parent, if drawn. */
const liveUsagePanel = (set: PNode): PNode | undefined =>
  ((set.parent as PanelParent | null | undefined)?.children as readonly PNode[] | undefined ?? [])
    .find((c) => !c.removed && readPanelTag(c)?.state === 'live' && readPanelTag(c)?.set === String(set.id ?? ''));
/** Where the spec panel goes (Q2830.1 B): `SPEC_GAP` right of the set's live usage panel and top-aligned with it, else
 *  beside where that panel would go. */
export const specSpot = (set: PNode): { x: number; y: number } => {
  const u = liveUsagePanel(set);
  if (u) return { x: (u.x ?? 0) + (u.width ?? PANEL_WIDTH) + SPEC_GAP, y: u.y ?? 0 };
  const at = panelSpot(set);
  return { x: at.x + panelWidthFor(set) + SPEC_GAP, y: at.y };
};

const boxOf = (n: PNode): Box => ({ x: n.x ?? 0, y: n.y ?? 0, width: n.width ?? 0, height: n.height ?? 0 });
const rect = (n: PNode): Box => {
  const r = n.absoluteBoundingBox;
  if (r) return { x: r.x, y: r.y, width: r.width, height: r.height };
  let x = 0, y = 0;
  for (let q: PNode | undefined = n; q; q = q.parent as PNode | undefined) { x += q.x ?? 0; y += q.y ?? 0; }
  return { x, y, width: n.width ?? 0, height: n.height ?? 0 };
};
const find = (n: PNode | undefined, name: string): PNode | undefined => {
  for (const c of n?.children ?? []) { if (c.name === name) return c; const d = find(c, name); if (d) return d; }
  return undefined;
};
const findText = (n: PNode | undefined, name: string): PNode | undefined =>
  n?.type === 'TEXT' && n.name === name ? n : (n?.children ?? []).reduce<PNode | undefined>((f, c) => f ?? findText(c, name), undefined);
const locate = (root: PNode, path: readonly string[]): PNode | undefined => { let at: PNode | undefined = root; for (const s of path) at = find(at, s); return at; };
const propKey = (n: PNode, name: string): string | undefined => Object.keys(n.componentProperties ?? {}).find((k) => k === name || k.startsWith(`${name}#`));
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : undefined);

/** The hex `v` resolves to for `node`, in the node's mode (Q2830.9 A): `#RRGGBB`, and its alpha as a percent when below
 *  1 (`#FFFFFF 10%`). Undefined when the host cannot resolve it. */
export const hexFor = (v: PanelVariable | undefined, node: PNode): string | undefined => {
  let c: { r?: unknown; g?: unknown; b?: unknown; a?: unknown } | undefined;
  try { c = (v as { resolveForConsumer?(n: unknown): { value?: unknown } } | undefined)?.resolveForConsumer?.(node)?.value as typeof c; } catch { return undefined; }
  if (!c || typeof c.r !== 'number' || typeof c.g !== 'number' || typeof c.b !== 'number') return undefined;
  const hex = `#${[c.r, c.g, c.b].map((x) => Math.round(Math.min(1, Math.max(0, x as number)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  const a = typeof c.a === 'number' ? Math.round(c.a * 100) : 100;
  return a < 100 ? `${hex} ${a}%` : hex;
};

/** The member of `set` at `where` (code axis → value), read through each axis's Figma name. */
const memberAt = (set: PNode, where: Record<string, string>, axes: ComponentSpec['axes']): PNode | undefined =>
  (set.children ?? []).find((m) => {
    const v = variantValues(m.name);
    return axes.every((ax) => where[ax.name] === undefined || v[ax.figmaName] === undefined || v[ax.figmaName] === where[ax.name]);
  });

/**
 * Draw the spec panel for `def`'s family beside its usage panel, fresh: remove the set's earlier unedited spec panels,
 * keep aside the edited ones, and place a new one unless something sits there. Only the family's lead draws one; for
 * any other member this returns at once. Never throws for a missing template.
 */
export const drawSpecPanel = async (
  api: SpecApi,
  set: PNode,
  def: ComponentDef,
  opts: { materialize?: (d: ComponentDef) => ComponentDef; sets?: (defId: string) => PNode | undefined } = {},
): Promise<SpecOutcome> => {
  const out: SpecOutcome = { def: def.id, drawn: false, sets: [], replaced: 0, kept: [], skipped: [], misses: [] };
  const fam = panelFamily(def.id);
  if (fam && fam.lead !== def.id) return out;
  const parent = set.parent as PanelParent | null | undefined;
  if (!parent || typeof parent.appendChild !== 'function') { out.skipped.push(`No spec panel for ${def.id}: the set has no parent to place it on`); return out; }
  const blocks = findDocBlock(api);
  if (!blocks) { out.missing = [DOC_BLOCK_SET]; return out; }
  const variant = (type: DocBlockType, size: DocBlockSize = SIZE): PNode | undefined => (blocks.children ?? []).find((m) => m.name === docBlockVariant(type, size));
  const plan = planSpecPanel(def, { materialize: opts.materialize });
  // The set each section documents: the lead's is `set`; a member's is found by its def id (its component name).
  const setOf = (id: string): PNode | undefined => (id === def.id ? set : opts.sets?.(id)
    ?? (api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[]).find((n) => n.type === 'COMPONENT_SET' && !n.removed && n.name === id));

  // THE EARLIER PANELS: read now, removed only once the fresh one lands, so a blocked or failed draw leaves the set's
  // panel as it was.
  const edited: PNode[] = [], unedited: PNode[] = [];
  for (const p of earlierSpecPanels(api, set, def.id)) (await specPanelUnedited(p) ? unedited : edited).push(p);

  const vars = api.variables ? await api.variables.getLocalVariablesAsync() : [];
  const byTail = (tail: string) => vars.find((v) => v.name === tail || v.name.endsWith(`/${tail}`));
  const paint = (tail: string, miss = true): unknown[] => {
    const v = byTail(tail);
    if (!v || !api.variables) { if (miss) out.misses.push(tail); return []; }
    return [api.variables.setBoundVariableForPaint({ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 1, b: 1 } } as never, 'color', v as never)];
  };
  const magenta = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { ...REDLINE } }];
  const frame = (name: string, dir: 'HORIZONTAL' | 'VERTICAL' | 'NONE', gap = 0): PNode => {
    const f = api.createFrame();
    f.name = name;
    f.fills = [];
    if (dir !== 'NONE') { f.layoutMode = dir; f.itemSpacing = gap; }
    return f;
  };
  const fill = (n: PNode): void => { try { n.layoutSizingHorizontal = 'FILL'; } catch { /* outside auto layout */ } };
  const write = async (n: PNode | undefined, text: string, what: string, type?: { size: number; tracking: number }): Promise<boolean> => {
    if (!n) { out.misses.push(`${DOC_BLOCK_SET} has no ${what} layer`); return false; }
    const f = n.fontName as { family?: unknown; style?: unknown } | undefined;
    if (!f || typeof f.family !== 'string' || typeof f.style !== 'string') { out.misses.push(`${what}: mixed or unreadable font`); return false; }
    try { await api.loadFontAsync({ family: f.family, style: f.style }); } catch { out.misses.push(`${f.family} ${f.style} unavailable`); return false; }
    n.characters = text;
    if (type) { try { n.fontSize = type.size; n.letterSpacing = { value: type.tracking, unit: 'PERCENT' }; } catch { out.misses.push(`${what}: size not set`); } }
    return true;
  };
  const block = (type: DocBlockType, size?: DocBlockSize): PNode | undefined => {
    const i = variant(type, size)?.createInstance?.();
    if (!i) out.misses.push(`${DOC_BLOCK_SET} has no ${docBlockVariant(type, size ?? SIZE)} variant`);
    return i;
  };
  const setBool = (i: PNode, name: string, value: boolean): void => { const k = propKey(i, name); if (k) i.setProperties?.({ [k]: value }); };
  // The redline labels' face: the Paragraph block's, so a client's restyle of the template reaches it.
  const face = (() => {
    const t = findText(variant('Paragraph'), 'text');
    const f = t?.fontName as { family?: unknown; style?: unknown } | undefined;
    return f && typeof f.family === 'string' && typeof f.style === 'string' ? { family: f.family, style: f.style } : undefined;
  })();
  let faceLoaded = false;
  if (face) { try { await api.loadFontAsync(face); faceLoaded = true; } catch { out.misses.push(`${face.family} ${face.style} unavailable`); } }

  /** The hex cells, filled once the panel is on the page, where the swatch resolves in the panel's mode (Q2830.9 A). */
  const hexes: { text: PNode | undefined; swatch: PNode; tail: string }[] = [];
  // NO NAME WRAPS: each string a column holds, measured in the Paragraph block's face and size as the host lays it out,
  // and any wider than its column named. Once per string; nothing measured without the template's face.
  const body = findText(variant('Paragraph'), 'text');
  const measured = new Map<string, number | undefined>();
  const fits = async (text: string, width: number, col: string): Promise<void> => {
    if (!faceLoaded || !face || !api.createText) return;
    if (!measured.has(text)) {
      let m: PNode | undefined;
      try {
        m = api.createText();
        (m as { fontName?: unknown }).fontName = face;
        // The cell's size and tracking, as its text style sets them, so a brand's wider body/sm is measured as drawn.
        if (typeof body?.fontSize === 'number') m.fontSize = body.fontSize;
        if (body?.letterSpacing && typeof body.letterSpacing === 'object') m.letterSpacing = body.letterSpacing;
        (m as { textAutoResize?: unknown }).textAutoResize = 'WIDTH_AND_HEIGHT';
        m.characters = text;
        measured.set(text, num(m.width));
      } catch { measured.set(text, undefined); }
      m?.remove?.();
    }
    const w = measured.get(text);
    if (w !== undefined && w > width) out.misses.push(`"${text}" is ${w}px, wider than its ${width}px ${col} column, so it wraps`);
  };

  const panel = frame(plan.title, 'VERTICAL', SECTION_GAP);
  panel.paddingTop = PANEL_PAD; panel.paddingRight = PANEL_PAD; panel.paddingBottom = PANEL_PAD; panel.paddingLeft = PANEL_PAD;
  panel.fills = paint('color/background/primary');
  panel.strokes = paint('color/border/secondary');
  panel.strokeWeight = 1;
  panel.resize?.(SPEC_WIDTH, 1);
  panel.layoutSizingHorizontal = 'FIXED';
  panel.layoutSizingVertical = 'HUG';

  const header = frame('header', 'VERTICAL', 8);
  panel.appendChild?.(header); fill(header);
  for (const [type, size, text] of [['Heading', 'lg', plan.title], ['Paragraph', 'md', plan.lede]] as const) {
    const i = block(type, size);
    if (!i) continue;
    header.appendChild?.(i); fill(i);
    await write(findText(i, 'text'), text, 'text', type === 'Heading' ? TITLE_TYPE : undefined);
  }

  /** The specimens to redline once the panel is laid out. */
  const staged: { spec: PNode; stage?: PNode; marks: RedlineMark[] }[] = [];
  const draw = async (into: PNode, b: SpecBlock, d: SpecDefPlan): Promise<void> => {
    switch (b.type) {
      case 'Heading': case 'Paragraph': {
        const i = block(b.type, b.type === 'Heading' ? 'md' : SIZE);
        if (!i) return;
        into.appendChild?.(i); fill(i);
        await write(findText(i, 'text'), b.text, 'text');
        return;
      }
      case 'Field': {
        const i = block('Field');
        if (!i) return;
        into.appendChild?.(i); fill(i);
        await write(findText(find(i, 'row') ?? i, 'label'), b.label, 'label');
        await write(findText(find(i, 'row') ?? i, 'text'), b.text, 'text');
        return;
      }
      case 'Redline': {
        const i = block('Specimen');
        if (!i) return;
        into.appendChild?.(i); fill(i);
        const docSet = setOf(d.def);
        const m = docSet ? memberAt(docSet, b.where, d.axes) : undefined;
        const key = propKey(i, SPECIMEN);
        if (key && m?.id) i.setProperties?.({ [key]: String(m.id) });
        else out.misses.push(`No specimen for ${d.def} at ${Object.entries(b.where).map(([ax, v]) => `${ax}=${v}`).join(', ')}: ${key ? (docSet ? 'no such member' : 'no set in the file') : `${DOC_BLOCK_SET} has no ${SPECIMEN} property`}`);
        await write(findText(i, 'caption'), b.caption, 'caption');
        const spec = find(i, 'specimen');
        if (spec && m) staged.push({ spec, stage: find(i, 'stage'), marks: b.marks });
        return;
      }
      case 'Colors': {
        // Q2830.8 A: one row per binding, in fixed columns. Every cell is a Paragraph block, so it takes the file's body/sm.
        const table = frame(b.title, 'VERTICAL', 4);
        into.appendChild?.(table); fill(table);
        const t = block('Paragraph');
        if (t) { table.appendChild?.(t); fill(t); await write(findText(t, 'text'), b.title, 'text'); }
        const cell = async (row: PNode, col: keyof typeof COLOR_COLUMNS, text: string, width: number = COLOR_COLUMNS[col]): Promise<PNode | undefined> => {
          const c = block('Paragraph');
          if (!c) return undefined;
          c.name = col;
          row.appendChild?.(c);
          try { c.layoutSizingHorizontal = 'FIXED'; } catch { /* kept */ }
          c.resize?.(width, c.height ?? 1);
          await write(findText(c, 'text'), text, 'text');
          if (text) await fits(text, width, col);
          return c;
        };
        const header = frame('header', 'HORIZONTAL', COLOR_GAP);
        table.appendChild?.(header); fill(header);
        for (const [col, text] of [['state', 'State'], ['part', 'Part'], ['variable', 'Variable'], ['value', 'Value']] as const) await cell(header, col, text);
        for (const r of b.rows) {
          const lines = r.same ? [undefined] : r.bindings;
          for (const [i, bind] of lines.entries()) {
            const row = frame(bind ? `${r.state} ${bind.part} ${bind.role}` : r.state, 'HORIZONTAL', COLOR_GAP);
            table.appendChild?.(row); fill(row);
            // The state names its first row only; the rows under it are its other changes.
            await cell(row, 'state', i === 0 ? sentence(r.state) : '');
            if (!bind) { await cell(row, 'part', 'Same as rest', COLOR_COLUMNS.part + COLOR_GAP + COLOR_COLUMNS.variable + COLOR_GAP + COLOR_COLUMNS.value); continue; }
            await cell(row, 'part', `${bind.part} ${bind.role}`);
            await cell(row, 'variable', bind.variable);
            // A dropped binding has no variable, so nothing to swatch: its value cell stays empty.
            if (bind.dropped) { await cell(row, 'value', ''); continue; }
            const value = frame('value', 'HORIZONTAL', SWATCH_GAP);
            (value as PNode & { counterAxisAlignItems?: unknown }).counterAxisAlignItems = 'CENTER';
            row.appendChild?.(value);
            try { value.layoutSizingHorizontal = 'FIXED'; } catch { /* kept */ }
            value.resize?.(COLOR_COLUMNS.value, 1);
            const sw = frame('swatch', 'NONE');
            sw.resize?.(SWATCH, SWATCH);
            sw.fills = paint(bind.variable);
            sw.strokes = paint('color/border/secondary', false);
            sw.strokeWeight = 1;
            value.appendChild?.(sw);
            const q = block('Paragraph');
            if (q) { q.name = 'hex'; value.appendChild?.(q); try { q.layoutGrow = 1; } catch { /* kept */ } hexes.push({ text: findText(q, 'text'), swatch: sw, tail: bind.variable }); }
          }
        }
        return;
      }
    }
  };

  for (const d of plan.defs) {
    if (plan.defs.length > 1) {
      const h = block('Heading', 'md');
      if (h) { panel.appendChild?.(h); fill(h); await write(findText(h, 'text'), d.name, 'text', TITLE_TYPE); }
    }
    for (const s of d.sections) {
      const div = block('Divider');
      if (div) { panel.appendChild?.(div); fill(div); }
      const sec = frame(s.title, 'VERTICAL', 8);
      sec.setSharedPluginData?.(SPEC_PANEL_NS, SPEC_SECTION_KEY, `${d.def}:${s.id}`);
      panel.appendChild?.(sec); fill(sec);
      const h = block('Heading', SIZE);
      if (h) { sec.appendChild?.(h); fill(h); await write(findText(h, 'text'), s.title, 'text', SECTION_TYPE); }
      for (const b of s.blocks) await draw(sec, b, d);
    }
    out.sets.push(d.def);
  }

  const at = specSpot(set);
  parent.appendChild(panel);
  panel.x = at.x;
  panel.y = at.y;
  // A write the host refuses from here on must not leave an untagged half-panel on the canvas.
  try {
    // The hex cells, now the swatches resolve in the panel's mode. A variable the file lacks is named once, by `paint`.
    for (const h of hexes) {
      const v = byTail(h.tail);
      const hex = hexFor(v, h.swatch);
      await write(h.text, hex ?? '', 'hex');
      if (hex) await fits(hex, COLOR_COLUMNS.value - SWATCH - SWATCH_GAP, 'value');
      else if (v) out.misses.push(`no value for ${h.tail}`);
    }
    out.redlines = await drawRedlines(api, panel, staged, magenta, faceLoaded ? face : undefined, out);
  } catch (e) { panel.remove?.(); throw e; }

  // NOTHING UNDER IT: every node on the parent but the panels this draw replaces or moves and the set's own labels.
  const kids = parent.children as readonly PNode[];
  const kept = kids.filter((c) => readSpecTag(c)?.state === 'kept' && readSpecTag(c)?.def === def.id);
  const movers = new Set<PNode>([panel, ...unedited, ...edited.filter((e) => e.parent === parent), ...kept]);
  const hits = kids.filter((c) => !movers.has(c) && !c.removed && readTag(c as never)?.set !== String(set.id ?? '\u0000') && overlaps(boxOf(panel), boxOf(c)));
  if (hits.length) {
    panel.remove?.();
    delete out.redlines;
    out.sets = [];
    out.skipped.push(`No spec panel for ${def.id}: "${hits[0].name ?? 'a layer'}" sits where the panel goes, right of the usage panel. Move it, then draw specs again`);
    return out;
  }

  for (const p of unedited) { p.remove?.(); out.replaced++; }
  writeTag(panel, { v: 1, def: def.id, set: String(set.id ?? ''), state: 'live' });
  panel.setSharedPluginData?.(SPEC_PANEL_NS, SPEC_PANEL_PLAN, plan.hash);
  panel.setSharedPluginData?.(SPEC_PANEL_NS, SPEC_PANEL_PRINT, await panelPrint(panel));
  out.drawn = true;

  const belowAll = (n: PNode): void => {
    const x = panel.x ?? 0;
    const col = (parent.children as readonly PNode[]).filter((c) => c !== n && !c.removed && (c.x ?? 0) < x + (n.width ?? 0) && x < (c.x ?? 0) + (c.width ?? 0));
    n.x = x;
    n.y = Math.max(...col.map((c) => (c.y ?? 0) + (c.height ?? 0))) + SPEC_GAP;
  };
  for (const e of edited) {
    if (!String(e.name ?? '').endsWith(' (edited)')) e.name = `${e.name ?? plan.title} (edited)`;
    writeTag(e, { v: 1, def: def.id, set: String(set.id ?? ''), state: 'kept' });
    if (e.parent === parent) belowAll(e);
    out.kept.push(String(e.name));
  }
  for (const k of kept) if (overlaps(boxOf(panel), boxOf(k))) belowAll(k);
  out.misses = [...new Set(out.misses)];
  return out;
};

/**
 * THE REDLINES, once the panel has its layout: for each mark, a dimension line over the part the host laid out, with
 * its label, in one frame per mark over the panel (`redline <n>`). Padding and gap are measured below the specimen,
 * height to its right, padding top to its left, a width above it; a line that would touch another on the same side
 * moves one row out, and the stage's padding grows to hold every row. The px is read off the part in the specimen.
 * Returns how many were drawn.
 */
const drawRedlines = async (
  api: SpecApi, panel: PNode, staged: { spec: PNode; stage?: PNode; marks: RedlineMark[] }[], magenta: unknown[],
  face: { family: string; style: string } | undefined, out: SpecOutcome,
): Promise<number> => {
  type Side = 'top' | 'bottom' | 'left' | 'right';
  type Laid = { mark: RedlineMark; part: PNode; side: Side; text: string; tier: number; lo: number; hi: number };
  const vertical = (n: PNode): boolean => (n as unknown as { layoutMode?: unknown }).layoutMode === 'VERTICAL';
  // A gap is measured along its part's own direction: across the top for a row, down the left for a column.
  const sideOf = (p: RedlineMark['prop'], n: PNode): Side => (p === 'gap' ? (vertical(n) ? 'left' : 'top') : p === 'paddingTop' ? 'left' : p === 'height' ? 'right' : p === 'minWidth' || p === 'buildWidth' ? 'top' : 'bottom');
  const pxOf = (m: RedlineMark, n: PNode): number | undefined => {
    if (m.px !== undefined) return m.px;
    const r = n as unknown as Record<string, unknown>;
    return num(m.prop === 'gap' ? r.itemSpacing : m.prop === 'height' ? rect(n).height : r[m.prop]);
  };
  const shown = (n: PNode): PNode[] => (n.children ?? []).filter((c) => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
  /** The span a mark measures, along its side's axis, from the boxes as laid out. */
  const span = (m: RedlineMark, n: PNode, px: number): [number, number] | undefined => {
    const B = rect(n);
    switch (m.prop) {
      case 'paddingLeft': return [B.x, B.x + px];
      case 'paddingRight': return [B.x + B.width - px, B.x + B.width];
      case 'paddingTop': return [B.y, B.y + px];
      case 'height': return [B.y, B.y + B.height];
      case 'minWidth': case 'buildWidth': return [B.x, B.x + px];
      case 'gap': { const k = shown(n); if (k.length < 2) return undefined; const a = rect(k[0]); return vertical(n) ? [a.y + a.height, a.y + a.height + px] : [a.x + a.width, a.x + a.width + px]; }
    }
  };
  const all: { spec: PNode; stage?: PNode; laid: Laid[] }[] = [];
  for (const s of staged) {
    const laid: Laid[] = [];
    for (const mark of s.marks) {
      const part = locate(s.spec, mark.path);
      if (!part) { out.misses.push(`redline ${mark.prop}: no ${mark.path.join('/') || 'root'} in the specimen`); continue; }
      const px = pxOf(mark, part);
      if (px === undefined || px <= 0) continue;
      const sp = span(mark, part, px);
      if (!sp) continue;
      const text = mark.px !== undefined ? mark.label : `${mark.label} · ${px}`;
      laid.push({ mark, part, side: sideOf(mark.prop, part), text, tier: 0, lo: sp[0], hi: sp[1] });
    }
    all.push({ spec: s.spec, stage: s.stage, laid });
  }
  const every = all.flatMap((a) => a.laid);
  if (!every.length) return 0;
  // A label needs a loaded face: without the template's, Figma refuses the text, so the redlines are left out and named.
  if (!face) { out.misses.push('redlines: the template\'s text face could not be loaded'); return 0; }
  // Labels are measured once written, so a tier knows how wide each one is.
  const labels = new Map<Laid, PNode>();
  for (const l of every) {
    const t = api.createText();
    (t as { fontName?: unknown }).fontName = face;
    try { t.fontSize = REDLINE_TYPE; } catch { /* the default size */ }
    t.characters = l.text;
    t.fills = magenta;
    t.name = 'label';
    labels.set(l, t);
  }
  const widthOf = (l: Laid): number => labels.get(l)?.width ?? l.text.length * 6;
  for (const { spec, stage, laid } of all) {
    const rows: Record<Side, [number, number][][]> = { top: [], bottom: [], left: [], right: [] };
    const tier = (side: Side, lo: number, hi: number): number => {
      for (let t = 0; ; t++) {
        const row = (rows[side][t] ??= []);
        if (!row.some(([a, b]) => lo < b + 4 && a < hi + 4)) { row.push([lo, hi]); return t; }
      }
    };
    for (const l of laid) {
      const mid = (l.lo + l.hi) / 2, w = widthOf(l);
      // Along a top or bottom row a label takes its width centered on the line; down a side it takes one label row.
      l.tier = l.side === 'top' || l.side === 'bottom' ? tier(l.side, Math.min(l.lo, mid - w / 2), Math.max(l.hi, mid + w / 2)) : tier(l.side, l.lo, l.hi);
    }
    if (!stage) continue;
    const deepest = (side: Side) => Math.max(-1, ...laid.filter((l) => l.side === side).map((l) => l.tier));
    const sideW = (side: Side) => Math.max(0, ...laid.filter((l) => l.side === side).map((l) => widthOf(l)));
    const need: Record<Side, number> = {
      top: deepest('top') < 0 ? 0 : LINE_GAP + (deepest('top') + 1) * (LABEL_ROW + TICK),
      bottom: deepest('bottom') < 0 ? 0 : LINE_GAP + (deepest('bottom') + 1) * (LABEL_ROW + TICK),
      left: deepest('left') < 0 ? 0 : LINE_GAP + (deepest('left') + 1) * (TICK + 4 + sideW('left')),
      right: deepest('right') < 0 ? 0 : LINE_GAP + (deepest('right') + 1) * (TICK + 4 + sideW('right')),
    };
    for (const [k, side] of [['paddingTop', 'top'], ['paddingBottom', 'bottom'], ['paddingLeft', 'left'], ['paddingRight', 'right']] as const) {
      if (need[side] > Number(stage[k] ?? 0)) { try { stage[k] = Math.ceil(need[side]); } catch { out.misses.push(`the specimen's ${side} gutter could not grow`); } }
    }
    void spec;
  }
  // THE PLACES, from the boxes as now laid out, each relative to the panel.
  const at = rect(panel);
  let drawn = 0;
  for (const { spec, laid } of all) {
    const P = rect(spec);
    for (const l of laid) {
      const sp = span(l.mark, l.part, l.mark.px ?? pxOf(l.mark, l.part) ?? 0)!;
      const label = labels.get(l)!;
      const lw = widthOf(l), lh = label.height ?? LABEL_ROW;
      const lines: Box[] = [];
      let tx: number, ty: number;
      if (l.side === 'top' || l.side === 'bottom') {
        const y = l.side === 'bottom' ? P.y + P.height + LINE_GAP + l.tier * (LABEL_ROW + TICK) : P.y - LINE_GAP - l.tier * (LABEL_ROW + TICK);
        lines.push({ x: sp[0], y, width: Math.max(1, sp[1] - sp[0]), height: 1 }, { x: sp[0], y: y - TICK / 2, width: 1, height: TICK }, { x: sp[1] - 1, y: y - TICK / 2, width: 1, height: TICK });
        tx = (sp[0] + sp[1]) / 2 - lw / 2;
        ty = l.side === 'bottom' ? y + TICK / 2 + 1 : y - TICK / 2 - lh - 1;
      } else {
        // Each tier one label's width further out, so two lines on one side never sit on each other.
        const step = l.tier * (TICK + 4 + Math.max(0, ...laid.filter((o) => o.side === l.side).map((o) => widthOf(o))));
        const x = l.side === 'left' ? P.x - LINE_GAP - step : P.x + P.width + LINE_GAP + step;
        lines.push({ x, y: sp[0], width: 1, height: Math.max(1, sp[1] - sp[0]) }, { x: x - TICK / 2, y: sp[0], width: TICK, height: 1 }, { x: x - TICK / 2, y: sp[1] - 1, width: TICK, height: 1 });
        tx = l.side === 'left' ? x - TICK - lw : x + TICK;
        ty = (sp[0] + sp[1]) / 2 - lh / 2;
      }
      const boxes = [{ x: tx, y: ty, width: lw, height: lh }, ...lines];
      const u = { x: Math.min(...boxes.map((b) => b.x)), y: Math.min(...boxes.map((b) => b.y)) };
      const w = Math.max(...boxes.map((b) => b.x + b.width)) - u.x, h = Math.max(...boxes.map((b) => b.y + b.height)) - u.y;
      const group = api.createFrame();
      group.name = `redline ${l.mark.prop}`;
      group.fills = [];
      group.clipsContent = false;
      panel.appendChild?.(group);
      group.layoutPositioning = 'ABSOLUTE';
      group.x = u.x - at.x;
      group.y = u.y - at.y;
      group.resize?.(w, h);
      for (const b of lines) {
        const f = api.createFrame();
        f.name = 'line';
        f.fills = magenta;
        group.appendChild?.(f);
        f.x = b.x - u.x;
        f.y = b.y - u.y;
        f.resize?.(Math.max(1, b.width), Math.max(1, b.height));
      }
      group.appendChild?.(label);
      label.x = tx - u.x;
      label.y = ty - u.y;
      drawn++;
    }
  }
  return drawn;
};

/** The run's clauses for a spec panel: each skip, each panel kept aside, and what could not be written. DRAFT wording. */
export const specItems = (o: SpecOutcome | undefined): string[] => {
  if (!o) return [];
  const parts = [...o.skipped];
  for (const k of o.kept) parts.push(`The spec panel for ${o.def} was edited by hand, so it is kept as "${k}" below the new one`);
  if (o.drawn && o.misses.length) parts.push(`Parts of the spec panel for ${o.def} were not written (${o.misses.slice(0, 3).join('; ')}${o.misses.length > 3 ? '; …' : ''})`);
  return parts;
};

/** Whether a live spec panel was drawn from an older plan than `plan`: the run's out-of-date line. */
export const specPanelStale = (n: PNode, plan: SpecPanelPlan): boolean => (n.getSharedPluginData?.(SPEC_PANEL_NS, SPEC_PANEL_PLAN) ?? '') !== plan.hash;

/** The family leads whose sets are in the file, each with its set: what `draw-specs` with no def draws. */
export const specTargets = (api: Pick<PanelApi, 'root'>, onlyDef?: string): { targets: { def: ComponentDef; set: PNode }[]; skipped: string[] } => {
  const sets = (api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[]).filter((n) => n.type === 'COMPONENT_SET' && !n.removed);
  const targets: { def: ComponentDef; set: PNode }[] = [], skipped: string[] = [];
  for (const d of componentDefs) {
    if (!d.figmaProperties || panelFamily(d.id)?.lead !== d.id) continue;
    if (onlyDef !== undefined && panelFamily(onlyDef)?.lead !== d.id && onlyDef !== d.id) continue;
    const hit = sets.filter((s) => s.name === d.id);
    if (hit.length === 1) targets.push({ def: d, set: hit[0] });
    // Two sets of one name: which one the panel documents is not this command's call, as for Update.
    else if (hit.length > 1) skipped.push(`No spec panel for ${d.id}: the file has ${hit.length} sets named ${d.id}`);
    else if (onlyDef !== undefined) skipped.push(`No spec panel for ${d.id}: its set is not in the file`);
  }
  return { targets, skipped };
};

/**
 * Before a set is built on `page`: its def's unedited live spec panels whose set is gone come off, as its usage panels
 * do (`clearOrphanPanels`), so they neither block the new set's panels nor stand as furniture of no set. An edited one
 * stays. Returns how many went.
 */
export const clearOrphanSpecPanels = async (api: Pick<PanelApi, 'root'>, page: unknown, defId: string): Promise<number> => {
  const setIds = new Set((api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[]).map((s) => String(s.id ?? '')));
  let n = 0;
  for (const { node, tag } of allSpecPanels(api)) {
    if (tag.state !== 'live' || tag.def !== defId || node.parent !== page || setIds.has(tag.set)) continue;
    if (await specPanelUnedited(node)) { node.remove?.(); n++; }
  }
  return n;
};
