/**
 * THE USAGE PANEL BESIDE EACH SET (#846 phase 2; wireframe approved 2026-10-19, Q406 follow-ups A) — the component's
 * usage doc, drawn on its page from `_Doc-block` instances, right of the set and top-aligned with it.
 *
 * ONE SOURCE. The panel reads the engine's doc section model (`component-doc-sections.ts` `docSections`), the same
 * function the Markdown page renders, so the panel and the page cannot disagree about which sections a def has or what
 * each holds. A section the model omits is not drawn; nothing here decides that a second time.
 *
 * SHORTER THAN THE PAGE (Q406.2 A). The panel draws every section the model returns except `PANEL_OMITS` (Building it
 * in code, which is site-only), and inside the rest:
 *   - Overview: the summary as the lede under the title, then the model's rows, each cut to two sentences;
 *   - Anatomy: the default member as a live specimen with a numbered marker on each part the build named, then each
 *     part with its caption cut to one sentence. The caption is the model's, so a note in the maintainer register,
 *     or one naming a tool, is a part name with no caption (the model holds it back);
 *   - Styles: "Every member is in the set to the left.", then each axis as chips with when it changes, then the states;
 *   - Usage guidelines: the usage cut to two sentences, and `PANEL_DO_ITEMS` Do and Don't items, with a line saying
 *     how many of how many when the def has more;
 *   - Accessibility: Keyboard, Focus and Screen readers, one sentence each. WCAG and Motion stay on the page;
 *   - Content guidelines: the guidelines and each pattern, two sentences each;
 *   - Theming: the default member in light and in dark side by side (Q406.6 A), each its mode pinned on the instance.
 *     The model draws Theming only when it is given modes, so the panel passes the file's: those of the color
 *     collection, `light` and `dark` among them;
 *   - Related components: each list as chips of component names.
 *
 * CANVAS FURNITURE, KEPT APART FROM ITS LABELS. The panel is a frame on the set's own parent, never inside the set, so
 * the update's hand-edit check and the as-built record stay blind to it, as they are to the labels. It carries its own
 * tag (`prism3`/`docPanel`), not the labels' `furniture` tag, because the labels' clear removes what it finds, and a
 * panel a designer edited must never be removed.
 *
 * RE-PLANNED ON EVERY BUILD AND UPDATE, AND HAND EDITS ARE KEPT (Q406.9 A). The panel records two things when it is
 * drawn: what it holds (the style guide's `fingerprintOf`, reused rather than restated) and the plan it was drawn from
 * (`PanelPlan.hash`). A build draws it fresh; an update draws it when the dry run found it due: missing, drawn from an
 * older plan, or not where the set now puts it (`docPanelDue`). Drawing fresh, an earlier panel of the set that still
 * holds what was written is removed; one that does not was edited by hand, so it is kept: renamed "(edited)", moved
 * below everything in its column, and named in the run's result. Nothing is lost silently. A kept panel is never
 * touched again, except to move it down when a fresh panel would cover it.
 *
 * NEVER ON TOP OF ANYTHING. The panel goes `PANEL_GAP` right of the set, top-aligned. Labels sit above and left of
 * the set and a backdrop reaches `BACKDROP_PAD` (12) past it, so none of them is in that spot; another set may be. A
 * panel that would overlap any node on the parent is not drawn, and the run says so and what to do: an update makes
 * room, because each set's box reaches past its panel when the update spaces the sets (`docPanelReach`,
 * `pageSetMoves`), and a new set is placed past every panel already on the page, which `placeNewSet` reads as content.
 *
 * NEVER THROWS FOR A MISSING TEMPLATE. A file without `_Doc-block` draws no panel and keeps any it has; the run's
 * Set up file line names it (`templatesLine`), as for the labels.
 *
 * HELD FOR THE OWNER: `PANEL_WIDTH`, `PANEL_GAP`, `PANEL_PAD`, `SECTION_GAP`, the panel's name, and every sentence
 * this file writes (DRAFT wording).
 */
import { docSections, type DocSection, type DocSectionId } from '@prism3/engine/component-doc-sections';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { isTemplateSet } from './file-components';
import { fingerprintOf, fnv, type SgNode } from './style-guide';
import { CAPTION, CHIP_SLOTS, DOC_BLOCK_SET, DO_ROWS, SPECIMEN, docBlockVariant, type DocBlockSize, type DocBlockType } from './doc-block';

export const DOC_PANEL_NS = 'prism3';
export const DOC_PANEL_KEY = 'docPanel';
/** What the panel held when it was drawn, and the plan it was drawn from. Shared, so another tool can read them. */
export const DOC_PANEL_PRINT = 'docPanelPrint';
export const DOC_PANEL_PLAN = 'docPanelPlan';
/** On each section frame: the model section it draws. */
export const DOC_SECTION_KEY = 'docSection';
export const PANEL_WIDTH = 560;
/** Between the set's right edge and the panel. More than `BACKDROP_PAD`, so a backdrop never reaches it. */
export const PANEL_GAP = 40;
export const PANEL_PAD = 24;
export const SECTION_GAP = 24;
/** How far a set's box reaches right once its panel is drawn: what the update spaces the next set from. */
export const PANEL_REACH = PANEL_GAP + PANEL_WIDTH;
/** The sections the panel leaves to the docs site (Q406.2 A). */
export const PANEL_OMITS: readonly DocSectionId[] = ['code'];
export const PANEL_DO_ITEMS = DO_ROWS;
/** The modes the Theming section shows side by side, when the file's color collection has them (Q406.6 A). */
export const PANEL_MODES = ['light', 'dark'] as const;
const SIZE: DocBlockSize = 'sm';
/** Raise when the panel's layout moves without its plan moving, so every drawn panel reads as due again. */
const PANEL_FORMAT = 1;

/* ── the pure planner ──────────────────────────────────────────────────────────────────────────────────── */

export type PanelBlock =
  | { type: 'Heading'; text: string; size: DocBlockSize }
  | { type: 'Paragraph'; text: string; size: DocBlockSize }
  | { type: 'Field'; label: string; text: string }
  | { type: 'Do-Dont'; do: string[]; dont: string[] }
  | { type: 'Chips'; label: string; chips: string[]; note?: string }
  /** The documented set's default member; `mode` pins one, `markers` numbers the parts on it, in order. */
  | { type: 'Specimen'; mode?: string; caption?: string; markers?: string[] };
export interface PanelSection { id: DocSectionId; title: string; blocks: PanelBlock[]; row?: boolean }
export interface PanelPlan { def: string; title: string; lede: string; sections: PanelSection[]; hash: string }

/** A variant value or axis as text: hyphens to spaces, first letter capitalized. The labels' rule (`sentenceCase`). */
const sentence = (s: string): string => { const t = s.replace(/-/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
/** Prose as the panel shows it: code spans as plain text, whitespace folded. */
export const plain = (s: string): string => s.replace(/`/g, '').replace(/\s+/g, ' ').trim();
/** The first `n` sentences of `s`, the wireframe's cut: a sentence ends at `.` or `)` before a capital or a quote. */
export const firstSentences = (s: string, n: number): string => plain(s).split(/(?<=[.)])\s+(?=[A-Z"(])/).slice(0, n).join(' ');

/**
 * The panel for one def, from the doc section model: pure, so the whole content rule is checked with no host
 * (`test-doc-panel.ts`). `names` gives a component id its display name, for Related's chips; an id it does not know
 * shows as the id.
 */
export const planDocPanel = (def: ComponentDef, ctx: { modes?: readonly string[]; names?: (id: string) => string } = {}): PanelPlan => {
  const name = ctx.names ?? ((id: string) => id);
  const sections: PanelSection[] = [];
  const model = docSections(def, { modes: ctx.modes }).sections;
  for (const s of model as DocSection[]) {
    if (PANEL_OMITS.includes(s.id)) continue;
    const blocks: PanelBlock[] = [];
    const field = (label: string, text: string, n: number) => blocks.push({ type: 'Field', label, text: firstSentences(text, n) });
    let row = false;
    switch (s.id) {
      case 'overview':
        if (s.fields.length) for (const f of s.fields) field(f.label, f.text[0], 2);
        else blocks.push({ type: 'Paragraph', text: firstSentences(s.description, 2), size: SIZE });
        break;
      case 'anatomy':
        blocks.push({ type: 'Specimen', caption: `Shown on the default member: ${s.specimen.map((x) => `${x.axis} ${x.value}`).join(', ')}`, markers: s.parts.map((p) => p.id) });
        s.parts.forEach((p, i) => field(`${i + 1}  ${p.name}${p.optional ? ' (optional)' : ''}`, p.caption ?? '', 1));
        break;
      case 'styles':
        blocks.push({ type: 'Paragraph', text: 'Every member is in the set to the left.', size: SIZE });
        for (const a of s.axes) blocks.push({ type: 'Chips', label: sentence(a.axis), chips: a.values.map(sentence), note: a.kind === 'runtime' ? 'Changes while in use' : 'Chosen once, when placed' });
        if (s.states.length) blocks.push({ type: 'Chips', label: 'States', chips: s.states.map(sentence) });
        break;
      case 'usage': {
        if (s.usage) blocks.push({ type: 'Paragraph', text: firstSentences(s.usage, 2), size: SIZE });
        const d = s.do.slice(0, PANEL_DO_ITEMS).map(plain);
        const dn = s.dont.slice(0, PANEL_DO_ITEMS).map(plain);
        if (d.length || dn.length) blocks.push({ type: 'Do-Dont', do: d, dont: dn });
        if (s.do.length > d.length || s.dont.length > dn.length)
          blocks.push({ type: 'Paragraph', text: `Showing ${d.length} of ${s.do.length} Do items and ${dn.length} of ${s.dont.length} Don't items.`, size: SIZE });
        break;
      }
      case 'accessibility':
        for (const f of s.fields) field(f.label, f.text[0], 1);
        // A def whose only accessibility data is its WCAG list or its motion still has the section: it lists the first.
        if (!s.fields.length && s.wcag.length) field('WCAG', s.wcag[0], 1);
        if (!s.fields.length && !s.wcag.length && s.motion.length) field(s.motion[0].label, s.motion[0].text[0], 1);
        break;
      case 'content':
        if (s.guidelines) blocks.push({ type: 'Paragraph', text: firstSentences(s.guidelines, 2), size: SIZE });
        for (const f of s.patterns) field(f.label, f.text[0], 2);
        break;
      case 'theming':
        row = true;
        for (const m of s.modes) blocks.push({ type: 'Specimen', mode: m, caption: sentence(m) });
        break;
      case 'related':
        for (const l of s.lists) blocks.push({ type: 'Chips', label: l.label, chips: l.ids.map(name) });
        if (s.replaces.length) blocks.push({ type: 'Chips', label: 'Replaces', chips: s.replaces.map(plain) });
        break;
    }
    sections.push({ id: s.id, title: s.title, blocks, ...(row ? { row } : {}) });
  }
  const body = { def: def.id, title: def.name, lede: plain(def.summary), sections };
  return { ...body, hash: `${PANEL_FORMAT}:${fnv(JSON.stringify(body), false)}${fnv(JSON.stringify(body), true)}` };
};

/** A box on the set's parent. */
export interface Box { x: number; y: number; width: number; height: number }
export const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** Where the panel goes: `PANEL_GAP` right of the set, top-aligned with it. */
export const panelSpot = (set: { x?: number; y?: number; width?: number }): { x: number; y: number } =>
  ({ x: (set.x ?? 0) + (set.width ?? 0) + PANEL_GAP, y: set.y ?? 0 });

/* ── the executor ──────────────────────────────────────────────────────────────────────────────────────── */

/** The node surface this module touches — optional-everything, as in `canvas-furniture.ts`. */
export interface PNode {
  readonly id?: string;
  readonly type?: string;
  name?: string;
  x?: number;
  y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly removed?: boolean;
  readonly parent?: unknown;
  readonly children?: readonly PNode[];
  characters?: string;
  readonly fontName?: unknown;
  visible?: boolean;
  fills?: unknown;
  strokes?: unknown;
  strokeWeight?: unknown;
  layoutMode?: unknown;
  layoutPositioning?: unknown;
  layoutSizingHorizontal?: unknown;
  layoutSizingVertical?: unknown;
  layoutGrow?: unknown;
  itemSpacing?: unknown;
  paddingTop?: unknown;
  paddingRight?: unknown;
  paddingBottom?: unknown;
  paddingLeft?: unknown;
  readonly componentProperties?: Readonly<Record<string, unknown>>;
  setProperties?(props: Record<string, string | boolean>): void;
  setExplicitVariableModeForCollection?(collection: unknown, modeId: string): void;
  resize?(w: number, h: number): void;
  appendChild?(child: unknown): void;
  createInstance?(): PNode;
  remove?(): void;
  getSharedPluginData?(ns: string, key: string): string;
  setSharedPluginData?(ns: string, key: string, value: string): void;
}
export interface PanelParent {
  readonly name?: string;
  readonly children: readonly unknown[];
  appendChild(child: unknown): void;
  insertChild(index: number, child: unknown): void;
}
export interface PanelVariable { id: string; name: string; variableCollectionId?: string }
export interface PanelApi {
  root: { findAllWithCriteria(criteria: { types: ('COMPONENT' | 'COMPONENT_SET' | 'INSTANCE' | 'FRAME')[]; sharedPluginData?: { namespace: string; keys: string[] } }): readonly unknown[] };
  loadFontAsync(font: { family: string; style: string }): Promise<void>;
  createFrame(): PNode;
  variables?: {
    getLocalVariablesAsync(): Promise<readonly PanelVariable[]>;
    getLocalVariableCollectionsAsync?(): Promise<readonly { id: string; name: string; modes: readonly { modeId: string; name: string }[] }[]>;
    setBoundVariableForPaint(paint: never, field: 'color', variable: never): unknown;
  };
}

/** The tag on a panel. `live` is the panel the plugin keeps drawn; `kept` is one a designer edited, set aside. */
export interface PanelTag { v: 1; def: string; set: string; state: 'live' | 'kept' }
export const readPanelTag = (n: PNode): PanelTag | null => {
  try {
    const raw = n.getSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw) as Partial<PanelTag>;
    return t && t.v === 1 && typeof t.def === 'string' && typeof t.set === 'string' && (t.state === 'live' || t.state === 'kept') ? (t as PanelTag) : null;
  } catch { return null; }
};
/** A panel the plugin keeps drawn: it follows its set when the update spaces the sets. */
export const isLivePanel = (n: PNode): boolean => readPanelTag(n)?.state === 'live';
const writeTag = (n: PNode, t: PanelTag): void => n.setSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_KEY, JSON.stringify(t));

/** What drawing did for one set. */
export interface PanelOutcome {
  def: string;
  drawn: boolean;
  /** The model sections the drawn panel holds, in order. */
  sections: DocSectionId[];
  /** Earlier panels of this set removed because they still held what was written. */
  replaced: number;
  /** Earlier panels a designer edited, kept aside under these names. */
  kept: string[];
  skipped: string[];
  missing?: string[];
  /** Part markers placed on the Anatomy specimen. */
  marked?: number;
  /** Text a font kept from being written, a part the specimen does not name, a variable or member not found. */
  misses: string[];
}

const byTail = <T extends { name: string }>(all: readonly T[], tail: string): T | undefined =>
  all.find((v) => v.name === tail || v.name.endsWith(`/${tail}`));

/** The file's `_Doc-block` set: exact name first, then any case — the furniture's template rule. */
export const findDocBlock = (api: Pick<PanelApi, 'root'>): PNode | undefined => {
  const all = api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[];
  return all.find((n) => n.type === 'COMPONENT_SET' && n.name === DOC_BLOCK_SET) ?? all.find((n) => n.type === 'COMPONENT_SET' && isTemplateSet(n.name, DOC_BLOCK_SET));
};
/** How far each set's box reaches right for the update's spacing: past its panel when the file can draw one. */
export const docPanelReach = (api: Pick<PanelApi, 'root'>): number => (findDocBlock(api) ? PANEL_REACH : 0);

/** The modes Theming shows: those of the file's color collection (the one holding `color/background/primary`) that
 *  `PANEL_MODES` names, in that order, with each one's collection and id for pinning. None before a theme. */
export const panelModes = async (api: Pick<PanelApi, 'variables'>): Promise<{ modes: string[]; pin: Map<string, { collection: unknown; modeId: string }> }> => {
  const pin = new Map<string, { collection: unknown; modeId: string }>();
  const vars = api.variables;
  if (!vars?.getLocalVariableCollectionsAsync) return { modes: [], pin };
  const ground = byTail(await vars.getLocalVariablesAsync(), 'color/background/primary');
  const cols = await vars.getLocalVariableCollectionsAsync();
  const col = cols.find((c) => c.id === ground?.variableCollectionId);
  if (!col) return { modes: [], pin };
  for (const m of PANEL_MODES) {
    const mode = col.modes.find((x) => x.name.toLowerCase() === m);
    if (mode) pin.set(m, { collection: col, modeId: mode.modeId });
  }
  return { modes: [...pin.keys()], pin };
};

/** Every panel in the file, with its tag. */
const allPanels = (api: Pick<PanelApi, 'root'>): { node: PNode; tag: PanelTag }[] =>
  (api.root.findAllWithCriteria({ types: ['FRAME'], sharedPluginData: { namespace: DOC_PANEL_NS, keys: [DOC_PANEL_KEY] } }) as readonly PNode[])
    .flatMap((node) => { const tag = readPanelTag(node); return tag && !node.removed ? [{ node, tag }] : []; });
/** This set's live panels: by its id anywhere in the file, and its def's on its parent whose set is gone. */
const earlierPanels = (api: Pick<PanelApi, 'root'>, set: PNode, defId: string): PNode[] => {
  const setIds = new Set((api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[]).map((s) => String(s.id ?? '')));
  return allPanels(api).filter(({ node, tag }) => tag.state === 'live'
    && (tag.set === String(set.id ?? '') || (tag.def === defId && node.parent === set.parent && !setIds.has(tag.set)))).map((p) => p.node);
};
/** Whether a panel still holds what it was drawn with. A panel with no record reads as edited: the safe direction. */
export const panelUnedited = async (n: PNode): Promise<boolean> => {
  const print = n.getSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_PRINT) ?? '';
  return !!print && (await fingerprintOf(n as unknown as SgNode)) === print;
};

/**
 * THE DRY RUN'S PANEL CHECK: 1 when an update would draw the set's panel, else 0. Read as the draw would draw it: the
 * same template lookup and the same plan. Due when the file can draw a panel and the set has none, or its panel was
 * drawn from another plan, or it is not where the set now puts it. A panel that is current is not due, edited or not.
 */
export const docPanelDue = (api: Pick<PanelApi, 'root'>, set: PNode, plan: PanelPlan): number => {
  if (!findDocBlock(api) || !set.parent) return 0;
  const live = allPanels(api).filter(({ node, tag }) => tag.state === 'live' && tag.set === String(set.id ?? '') && node.parent === set.parent);
  if (live.length !== 1) return 1;
  const p = live[0].node;
  const at = panelSpot(set);
  const near = (a: number | undefined, b: number) => Math.abs((a ?? 0) - b) <= 0.5;
  return p.getSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_PLAN) === plan.hash && near(p.x, at.x) && near(p.y, at.y) ? 0 : 1;
};

/** The descendant named `name`, depth first. */
const find = (n: PNode | undefined, name: string): PNode | undefined => {
  for (const c of n?.children ?? []) { if (c.name === name) return c; const d = find(c, name); if (d) return d; }
  return undefined;
};
/** The TEXT layer named `name` under `n`, or `n` itself when it is that layer. */
const findText = (n: PNode | undefined, name: string): PNode | undefined =>
  n?.type === 'TEXT' && n.name === name ? n : (n?.children ?? []).reduce<PNode | undefined>((f, c) => f ?? findText(c, name), undefined);
/** A component property's key by its name: Figma suffixes it with `#id` on an instance. */
const propKey = (n: PNode, name: string): string | undefined =>
  Object.keys(n.componentProperties ?? {}).find((k) => k === name || k.startsWith(`${name}#`));

/**
 * Draw the usage panel for `def`'s set fresh: remove the set's earlier panels that are unedited, keep aside the edited
 * ones, and place a new panel beside the set unless something sits there. Never throws for a missing template.
 */
export const drawDocPanel = async (
  api: PanelApi,
  set: PNode,
  def: ComponentDef,
  opts: { names?: (id: string) => string } = {},
): Promise<PanelOutcome> => {
  const out: PanelOutcome = { def: def.id, drawn: false, sections: [], replaced: 0, kept: [], skipped: [], misses: [] };
  const parent = set.parent as PanelParent | null | undefined;
  if (!parent || typeof parent.insertChild !== 'function') { out.skipped.push(`No usage panel for ${def.id}: the set has no parent to place it on`); return out; }
  const blocks = findDocBlock(api);
  if (!blocks) { out.missing = [DOC_BLOCK_SET]; return out; }
  const variant = (type: DocBlockType, size: DocBlockSize = SIZE): PNode | undefined => (blocks.children ?? []).find((m) => m.name === docBlockVariant(type, size));
  const { modes, pin } = await panelModes(api);
  const plan = planDocPanel(def, { modes, names: opts.names });

  // THE EARLIER PANELS: unedited ones go now, so they are not in the fresh panel's way; edited ones wait for the
  // fresh panel to land, and stay exactly as they are if it cannot.
  const edited: PNode[] = [];
  for (const p of earlierPanels(api, set, def.id)) {
    if (await panelUnedited(p)) { p.remove?.(); out.replaced++; }
    else edited.push(p);
  }

  const vars = api.variables ? await api.variables.getLocalVariablesAsync() : [];
  const paint = (tail: string): unknown[] => {
    const v = byTail(vars, tail);
    if (!v || !api.variables) { out.misses.push(tail); return []; }
    return [api.variables.setBoundVariableForPaint({ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 1, b: 1 } } as never, 'color', v as never)];
  };
  const frame = (name: string, dir: 'HORIZONTAL' | 'VERTICAL', gap: number): PNode => {
    const f = api.createFrame();
    f.name = name;
    f.fills = [];
    f.layoutMode = dir;
    f.itemSpacing = gap;
    return f;
  };
  const fill = (n: PNode): void => { try { n.layoutSizingHorizontal = 'FILL'; } catch { /* outside auto layout */ } };
  const write = async (n: PNode | undefined, text: string, what: string): Promise<void> => {
    if (!n) { out.misses.push(`${DOC_BLOCK_SET} has no ${what} layer`); return; }
    const f = n.fontName as { family?: unknown; style?: unknown } | undefined;
    if (!f || typeof f.family !== 'string' || typeof f.style !== 'string') { out.misses.push(`${what}: mixed or unreadable font`); return; }
    try { await api.loadFontAsync({ family: f.family, style: f.style }); } catch { out.misses.push(`${f.family} ${f.style} unavailable`); return; }
    n.characters = text;
  };
  const block = (type: DocBlockType, size?: DocBlockSize): PNode | undefined => {
    const v = variant(type, size);
    const i = v?.createInstance?.();
    if (!i) out.misses.push(`${DOC_BLOCK_SET} has no ${docBlockVariant(type, size ?? SIZE)} variant`);
    return i;
  };
  const setBool = (i: PNode, name: string, value: boolean): void => { const k = propKey(i, name); if (k) i.setProperties?.({ [k]: value }); };

  // The member the specimens show: the set's own default, its first.
  const member = (set.children ?? [])[0];
  const panel = frame(`${def.name} usage`, 'VERTICAL', SECTION_GAP);
  panel.paddingTop = PANEL_PAD; panel.paddingRight = PANEL_PAD; panel.paddingBottom = PANEL_PAD; panel.paddingLeft = PANEL_PAD;
  panel.fills = paint('color/background/primary');
  panel.strokes = paint('color/border/secondary');
  panel.strokeWeight = 1;
  panel.resize?.(PANEL_WIDTH, 1);
  panel.layoutSizingHorizontal = 'FIXED';
  panel.layoutSizingVertical = 'HUG';
  const markers: { id: string; n: number; specimen: PNode }[] = [];

  const header = frame('header', 'VERTICAL', 8);
  panel.appendChild?.(header);
  fill(header);
  for (const [type, size, text] of [['Heading', 'lg', plan.title], ['Paragraph', 'md', plan.lede]] as const) {
    const i = block(type, size);
    if (!i) continue;
    header.appendChild?.(i); fill(i);
    await write(findText(i, 'text'), text, 'text');
  }

  const draw = async (into: PNode, b: PanelBlock): Promise<void> => {
    const i = block(b.type, b.type === 'Heading' || b.type === 'Paragraph' ? b.size : SIZE);
    if (!i) return;
    into.appendChild?.(i);
    fill(i);
    switch (b.type) {
      case 'Heading': case 'Paragraph': await write(findText(i, 'text'), b.text, 'text'); break;
      case 'Field': await write(findText(find(i, 'row') ?? i, 'label'), b.label, 'label'); await write(findText(find(i, 'row') ?? i, 'text'), b.text, 'text'); break;
      case 'Do-Dont':
        for (const [col, items] of [['do', b.do], ['dont', b.dont]] as const) {
          const c = find(i, col);
          if (!c) { out.misses.push(`${DOC_BLOCK_SET} has no ${col} column`); continue; }
          if (!items.length) { c.visible = false; continue; }
          for (let k = 1; k <= DO_ROWS; k++) {
            const row = find(c, `item${k}`);
            if (!row) { if (k <= items.length) out.misses.push(`${DOC_BLOCK_SET} has no item${k} in ${col}`); continue; }
            if (k > items.length) { row.visible = false; continue; }
            await write(findText(row, 'text'), items[k - 1], 'item text');
          }
        }
        break;
      case 'Chips': {
        await write(findText(i, 'label'), b.label, 'label');
        const shown = b.chips.length > CHIP_SLOTS ? [...b.chips.slice(0, CHIP_SLOTS - 1), `+${b.chips.length - CHIP_SLOTS + 1} more`] : b.chips;
        for (let k = 1; k <= CHIP_SLOTS; k++) {
          const chip = find(i, `chip${k}`);
          if (!chip) { if (k <= shown.length) out.misses.push(`${DOC_BLOCK_SET} has no chip${k}`); continue; }
          if (k > shown.length) { chip.visible = false; continue; }
          await write(findText(chip, 'label'), shown[k - 1], 'chip label');
        }
        if (b.note) await write(findText(i, 'note'), b.note, 'note');
        else setBool(i, CAPTION, false);
        break;
      }
      case 'Specimen': {
        const key = propKey(i, SPECIMEN);
        if (key && member?.id) i.setProperties?.({ [key]: String(member.id) });
        else out.misses.push(`No specimen for ${def.id}: ${key ? 'the set has no member' : `${DOC_BLOCK_SET} has no ${SPECIMEN} property`}`);
        if (b.mode) {
          const m = pin.get(b.mode);
          if (m && i.setExplicitVariableModeForCollection) i.setExplicitVariableModeForCollection(m.collection, m.modeId);
          else out.misses.push(`the ${b.mode} mode could not be pinned`);
        }
        if (b.caption) await write(findText(i, 'caption'), b.caption, 'caption');
        else setBool(i, CAPTION, false);
        const specimen = find(i, 'specimen');
        (b.markers ?? []).forEach((id, k) => { if (specimen) markers.push({ id, n: k + 1, specimen }); });
        break;
      }
    }
  };

  for (const s of plan.sections) {
    const d = block('Divider');
    if (d) { panel.appendChild?.(d); fill(d); }
    const sec = frame(s.title, 'VERTICAL', 8);
    sec.setSharedPluginData?.(DOC_PANEL_NS, DOC_SECTION_KEY, s.id);
    panel.appendChild?.(sec);
    fill(sec);
    const h = block('Heading', SIZE);
    if (h) { sec.appendChild?.(h); fill(h); await write(findText(h, 'text'), s.title, 'text'); }
    const into = s.row ? frame('modes', 'HORIZONTAL', 16) : sec;
    if (s.row) { sec.appendChild?.(into); fill(into); }
    for (const b of s.blocks) {
      await draw(into, b);
      if (s.row) { const last = (into.children ?? []).slice(-1)[0]; if (last) last.layoutGrow = 1; }
    }
    out.sections.push(s.id);
  }

  const at = panelSpot(set);
  parent.appendChild(panel);
  panel.x = at.x;
  panel.y = at.y;

  // NOTHING UNDER IT: every other node on the parent, the set and its labels included, but the edited panels this
  // draw is about to move, and the kept ones it moves when they are in the way.
  const box = (n: PNode): Box => ({ x: n.x ?? 0, y: n.y ?? 0, width: n.width ?? 0, height: n.height ?? 0 });
  const kept = (parent.children as readonly PNode[]).filter((c) => readPanelTag(c)?.state === 'kept' && readPanelTag(c)?.def === def.id);
  const movers = new Set<PNode>([...edited.filter((e) => e.parent === parent), ...kept]);
  const hit = (parent.children as readonly PNode[]).find((c) => c !== panel && !movers.has(c) && !c.removed && overlaps(box(panel), box(c)));
  if (hit) {
    panel.remove?.();
    out.sections = [];
    out.skipped.push(`No usage panel for ${def.id}: "${hit.name ?? 'a layer'}" sits right of the set, where the panel goes. Run Update to make room, then the panel is drawn`);
    return out;
  }

  // THE PART MARKERS, once the panel has its layout: a numbered Badge on each part the specimen names, over the panel.
  const pos = (n: PNode): { x: number; y: number } => {
    let x = 0, y = 0;
    for (let q: PNode | undefined = n; q && q !== panel; q = q.parent as PNode | undefined) { x += q.x ?? 0; y += q.y ?? 0; }
    return { x, y };
  };
  // A part that is the member's root, or hidden in it, has no layer of its own to mark: it is listed, unmarked. Only a
  // specimen in which no part is found at all is a miss, since then the markers are not working.
  let marked = 0;
  if (markers.length && !markers.some((m) => find(m.specimen, m.id))) out.misses.push(`no part of ${def.id}'s specimen could be marked`);
  for (const m of markers) {
    const part = find(m.specimen, m.id);
    if (!part) continue;
    marked++;
    const i = block('Part-marker');
    if (!i) break;
    panel.appendChild?.(i);
    i.layoutPositioning = 'ABSOLUTE';
    await write(findText(i, 'count'), String(m.n), 'marker count');
    const p = pos(part);
    i.x = p.x - (i.width ?? 0) / 2;
    i.y = p.y - (i.height ?? 0) / 2;
  }
  out.marked = marked;

  writeTag(panel, { v: 1, def: def.id, set: String(set.id ?? ''), state: 'live' });
  panel.setSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_PLAN, plan.hash);
  panel.setSharedPluginData?.(DOC_PANEL_NS, DOC_PANEL_PRINT, await fingerprintOf(panel as unknown as SgNode));
  out.drawn = true;

  // THE EDITED PANELS, KEPT ASIDE: renamed, retagged, and moved below everything in the panel's column on this parent.
  const below = (n: PNode): void => {
    const x = panel.x ?? 0;
    const col = (parent.children as readonly PNode[]).filter((c) => c !== n && !c.removed && (c.x ?? 0) < x + (n.width ?? 0) && x < (c.x ?? 0) + (c.width ?? 0));
    n.x = x;
    n.y = Math.max(...col.map((c) => (c.y ?? 0) + (c.height ?? 0))) + PANEL_GAP;
  };
  for (const e of edited) {
    if (!String(e.name ?? '').endsWith(' (edited)')) e.name = `${e.name ?? `${def.name} usage`} (edited)`;
    writeTag(e, { v: 1, def: def.id, set: String(set.id ?? ''), state: 'kept' });
    if (e.parent === parent) below(e);
    out.kept.push(String(e.name));
  }
  for (const k of kept) if (overlaps(box(panel), box(k))) below(k);
  out.misses = [...new Set(out.misses)];
  return out;
};

/**
 * Before a set is built on `page`: its def's unedited panels whose set is gone come off, as its labels do, so the new
 * set's placement does not measure them. An edited one stays. Returns how many went.
 */
export const clearOrphanPanels = async (api: Pick<PanelApi, 'root'>, page: unknown, defId: string): Promise<number> => {
  const setIds = new Set((api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly PNode[]).map((s) => String(s.id ?? '')));
  let n = 0;
  for (const { node, tag } of allPanels(api)) {
    if (tag.state !== 'live' || tag.def !== defId || node.parent !== page || setIds.has(tag.set)) continue;
    if (await panelUnedited(node)) { node.remove?.(); n++; }
  }
  return n;
};

/** The run's clauses for a panel: each skip, each panel kept aside, and what could not be written. DRAFT wording. */
export const panelItems = (o: PanelOutcome | undefined): string[] => {
  if (!o) return [];
  const parts = [...o.skipped];
  for (const k of o.kept) parts.push(`The usage panel for ${o.def} was edited by hand, so it is kept as "${k}" below the new one. Move the change into the component's definition to keep it in the panel`);
  if (o.drawn && o.misses.length) parts.push(`Parts of the usage panel for ${o.def} were not written (${o.misses.slice(0, 3).join('; ')}${o.misses.length > 3 ? '; …' : ''})`);
  return parts;
};
