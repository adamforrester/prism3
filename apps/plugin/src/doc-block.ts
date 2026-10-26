/**
 * THE `_Doc-block` TEMPLATE (#846 phase 2; wireframe approved 2026-10-19, owner decision Q406 follow-up 10 A) — the
 * building blocks the usage panel beside each component set is drawn from (`doc-panel.ts`).
 *
 * ONE MORE PLUGIN-ONLY TEMPLATE beside `_Label`, `_inverse-backdrop` and `_scrim-backdrop` (`furniture-templates.ts`):
 * built by Set up file onto `↳ File Components`, never an engine def, so a client restyles a block in one place and
 * every panel follows.
 *
 * BUILT FROM PRISM3'S OWN COMPONENTS AND SEMANTIC TOKENS, so the panel follows the brand the file is themed with. That
 * is the one way this template differs from the furniture templates, whose literal colors annotate the brand and must
 * not move with it:
 *   - Part-marker is an instance of Badge (count, bold, neutral); Chips holds Tag instances (select, unselected,
 *     small); each Do / Don't column holds List.Item instances (unordered, at the block's size); Divider is an
 *     instance of Divider (horizontal, none);
 *   - every fill binds a semantic color variable (`color/text/primary`, `color/text/secondary`,
 *     `color/background/secondary`, `color/border/success`, `color/border/danger`), found by its name's tail as
 *     `bindBackdrop` finds its variable, and every text takes a brand text style (`title/…`, `body/…`, `label/…`).
 * So the template NEEDS those four sets and an applied theme. Without either, Set up file builds nothing and says
 * what is missing (`DocBlockResult.missing`), and the panel's draw reports the missing template once, the furniture's
 * way (`templatesLine`). A text style the file lacks is a miss by name; the text keeps the default face.
 *
 * THE PROPERTIES, as Q406.10 A lists them: `Type` = Heading | Paragraph | Field | Do-Dont | Specimen | Part-marker |
 * Chips | Divider, `Size` = sm | md | lg (the text styles' tier; the panel uses sm), and the `Top padding`,
 * `Bottom padding` and `Caption` booleans. No Breakpoint or image-ratio axis: specimens are live instances. Specimen
 * shows a member of the documented set through the `Specimen` instance-swap property; the panel pins its mode on the
 * instance, as the style guide pins a swatch's (`setExplicitVariableModeForCollection`), so the template carries no
 * Mode axis.
 *
 * THE LAYER NAMES ARE THE CONTRACT with `doc-panel.ts`, which writes into an instance by them: `text`; `label` and
 * `text` in a Field's `row`; `heading`, `rule` and `item1`…`item4` in the `do` and `dont` columns; `stage`,
 * `specimen` and `caption`; `marker`; `label`, `chips` (`chip1`…`chip16`) and `note`; `divider`. `test-doc-panel.ts`
 * holds both sides to a list of its own.
 *
 * IDEMPOTENT: found on the page by name in any case (`isTemplateSet`) and built only when absent, the
 * `ensureFurnitureTemplates` rule. A set already there is repaired in place (`repairDocBlock`, #2902), never rebuilt.
 * What a shim cannot verify, as for every template here, is the rendered result.
 */
import { autoLayout, isTemplateSet, stackVariants } from './file-components';
import type { FNode } from './file-components';
import type { TemplatesApi, TemplatesPage } from './furniture-templates';

export const DOC_BLOCK_SET = '_Doc-block';
export const DOC_BLOCK_TYPES = ['Heading', 'Paragraph', 'Field', 'Do-Dont', 'Specimen', 'Part-marker', 'Chips', 'Divider'] as const;
export type DocBlockType = (typeof DOC_BLOCK_TYPES)[number];
export const DOC_BLOCK_SIZES = ['sm', 'md', 'lg'] as const;
export type DocBlockSize = (typeof DOC_BLOCK_SIZES)[number];
export const TOP_PADDING = 'Top padding';
export const BOTTOM_PADDING = 'Bottom padding';
export const CAPTION = 'Caption';
export const SPECIMEN = 'Specimen';
/** How many Do and Don't rows a column holds, and how many chips a Chips block: the panel's caps (Q406.2 A). */
export const DO_ROWS = 4;
export const CHIP_SLOTS = 16;
/** The width a block is built at: the panel's 560 less its padding on both sides (`doc-panel.ts` `PANEL_PAD`). */
export const BLOCK_WIDTH = 512;
/** HELD FOR THE OWNER: the padding toggles' height, the Field label column and the Specimen stage's padding. */
const PADDING_HEIGHT = 16;
const LABEL_COLUMN = 120;
export const STAGE_PAD = 24;

/** The variant name a type and size select, as Figma writes it. */
export const docBlockVariant = (type: DocBlockType, size: DocBlockSize = 'sm'): string => `Type=${type}, Size=${size}`;

/** The Prism3 component sets the blocks are built from, by set name, and the member each block takes. */
export const BLOCK_PARTS = {
  marker: { set: 'badge', member: { type: 'count', emphasis: 'bold', tone: 'neutral' } },
  chip: { set: 'tag', member: { type: 'select', selection: 'unselected', size: 'small', state: 'rest' } },
  item: { set: 'list-item', member: { type: 'unordered' } },
  divider: { set: 'divider', member: { orientation: 'horizontal', inset: 'none' } },
} as const;
const ITEM_SIZE: Record<DocBlockSize, string> = { sm: 'small', md: 'medium', lg: 'large' };

/** The semantic variables the blocks bind, by name tail, and the text styles they take per size. */
export const BLOCK_COLORS = {
  primary: 'color/text/primary',
  secondary: 'color/text/secondary',
  stage: 'color/background/secondary',
  doRule: 'color/border/success',
  dontRule: 'color/border/danger',
} as const;
const STYLE: Record<'heading' | 'body' | 'label' | 'caption', Record<DocBlockSize, string>> = {
  heading: { sm: 'title/xs/strong', md: 'title/sm/strong', lg: 'title/md/strong' },
  body: { sm: 'body/sm/default', md: 'body/md/default', lg: 'body/lg/default' },
  label: { sm: 'label/sm/emphasis', md: 'label/md/emphasis', lg: 'label/lg/emphasis' },
  caption: { sm: 'body/xs/default', md: 'body/sm/default', lg: 'body/md/default' },
};

/** The node surface this file writes beyond `FNode`'s. */
export interface DNode extends FNode {
  readonly id?: string;
  readonly type?: string;
  readonly children?: readonly DNode[];
  layoutWrap?: unknown;
  counterAxisSpacing?: unknown;
  textAutoResize?: unknown;
  setTextStyleIdAsync?(id: string): Promise<void>;
  createInstance?(): DNode;
}
/** What the template build reads of the file: every component set, the variables and the text styles. */
export interface DocBlockApi extends TemplatesApi {
  root: { findAllWithCriteria(c: { types: ('COMPONENT_SET' | 'COMPONENT')[] }): readonly unknown[] };
  getLocalTextStylesAsync?(): Promise<readonly { id: string; name: string; fontName?: { family: string; style: string } }[]>;
}
export interface DocBlockResult {
  /** `built` this run, `present` already on the page, `skipped` for what is `missing`. */
  status: 'built' | 'present' | 'skipped';
  /** The sets, or the theme, the template needs and the file lacks. */
  missing: string[];
  /** Text styles or variables the file lacks, by name; the node keeps its default face or no fill. */
  misses: string[];
  /** On a set already there: how many layers `repairDocBlock` brought up to date. */
  repaired?: number;
}

/**
 * THE BLOCK'S STRETCHED LAYERS (#2902), by the layer names `doc-panel.ts` writes into: each fills the block's width. They
 * are set to FILL only once appended, because a node is FILL only inside an auto-layout parent, and `layoutAlign` set
 * before the append did not take in a real file (the horizontal frames kept their own HUG width: Do-Dont's columns at
 * 100px, Chips at ~986px that never wrapped). Field's `label` is the one text here: fixed at the label column, it grows
 * to its text (`HEIGHT`), where a resize alone leaves it NONE at 1px, clipped.
 */
const FILLED = ['top-padding', 'bottom-padding', 'row', 'columns', 'chips'] as const;
const fill = (n: DNode): void => { n.layoutSizingHorizontal = 'FILL'; };

/**
 * Bring a `_Doc-block` built before #2902 up to date in place: each member's `FILLED` layers to FILL and Field's label to
 * grow to its text. Never deletes or rebuilds the set: instances in usage panels point at it, the `stretchSwatches`
 * repair's rule (#2268). Only the block's own layers by name, never inside a nested instance. Idempotent: returns how
 * many layers it changed, 0 on a set already right.
 */
export const repairDocBlock = (set: DNode): number => {
  let changed = 0;
  const set1 = (n: DNode, key: 'layoutSizingHorizontal' | 'textAutoResize', v: string): void => {
    if (n[key] === v) return;
    try { n[key] = v; changed++; } catch { /* a host that refuses it leaves the layer as drawn */ }
  };
  for (const member of set.children ?? []) for (const n of member.children ?? []) {
    if (!(FILLED as readonly unknown[]).includes(n.name)) continue;
    set1(n, 'layoutSizingHorizontal', 'FILL');
    if (n.name !== 'row') continue;
    const label = (n.children ?? []).find((c) => c.name === 'label' && c.type === 'TEXT');
    if (label) set1(label, 'textAutoResize', 'HEIGHT');
  }
  return changed;
};

/** A member's coordinate values off its variant name (`type=count, tone=neutral` → {type: count, tone: neutral}). */
export const variantValues = (name: unknown): Record<string, string> =>
  Object.fromEntries(String(name ?? '').split(',').map((kv) => kv.split('=').map((x) => x.trim())).filter((kv) => kv.length === 2) as [string, string][]);
/** The first member of `set` whose coordinate carries every value `want` names. */
export const memberOf = (set: DNode | undefined, want: Readonly<Record<string, string>>): DNode | undefined =>
  (set?.children ?? []).find((m) => { const v = variantValues(m.name); return Object.entries(want).every(([k, x]) => v[k] === x); });

const byTail = <T extends { name: string }>(all: readonly T[], tail: string): T | undefined =>
  all.find((v) => v.name === tail || v.name.endsWith(`/${tail}`));

/**
 * Build `_Doc-block` on `page` unless it is there already, from the file's Badge, Tag, List.Item and Divider sets and
 * its semantic variables. Never throws for a missing piece: what the build needs and the file lacks is returned.
 */
export const ensureDocBlock = async (api: DocBlockApi, page: TemplatesPage): Promise<DocBlockResult> => {
  const out: DocBlockResult = { status: 'skipped', missing: [], misses: [] };
  const has = page.findOne?.((node) => {
    const n = node as { type?: unknown; name?: unknown };
    return n.type === 'COMPONENT_SET' && isTemplateSet(n.name, DOC_BLOCK_SET);
  }) as DNode | null | undefined;
  if (has) return { ...out, status: 'present', repaired: repairDocBlock(has) };
  const sets = api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as readonly DNode[];
  const setOf = (name: string) => sets.find((s) => s.type === 'COMPONENT_SET' && s.name === name);
  const parts = Object.fromEntries(Object.entries(BLOCK_PARTS).map(([k, p]) => [k, setOf(p.set)])) as Record<keyof typeof BLOCK_PARTS, DNode | undefined>;
  for (const [k, p] of Object.entries(BLOCK_PARTS)) if (!parts[k as keyof typeof BLOCK_PARTS]) out.missing.push(p.set);
  const vars = api.variables ? await api.variables.getLocalVariablesAsync() : [];
  if (!byTail(vars, BLOCK_COLORS.primary)) out.missing.push('theme');
  if (out.missing.length) return out;

  const styles = (await api.getLocalTextStylesAsync?.()) ?? [];
  const paint = (tail: string): unknown[] => {
    const v = byTail(vars, tail);
    if (!v || !api.variables) { out.misses.push(tail); return []; }
    const base = { type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0, g: 0, b: 0 } };
    return [api.variables.setBoundVariableForPaint(base as never, 'color', v as never)];
  };
  const text = async (name: string, chars: string, style: string, color: string): Promise<DNode> => {
    const t = api.createText() as DNode;
    t.name = name;
    const s = byTail(styles, style);
    if (s?.fontName) {
      try { await api.loadFontAsync(s.fontName); } catch { out.misses.push(`${s.fontName.family} ${s.fontName.style}`); }
    }
    if (s && t.setTextStyleIdAsync) {
      try { await t.setTextStyleIdAsync(s.id); } catch { out.misses.push(style); }
    } else if (!s) out.misses.push(style);
    try { t.characters = chars; } catch { /* the default face did not load: the layer stays empty, the miss is named */ }
    t.fills = paint(color);
    t.layoutAlign = 'STRETCH';
    return t;
  };
  const frame = (name: string, dir: 'HORIZONTAL' | 'VERTICAL', gap = 0): DNode => {
    const f = api.createFrame() as DNode;
    f.name = name;
    f.fills = [];
    autoLayout(f, { dir, itemSpacing: gap });
    return f;
  };
  const instance = (k: keyof typeof BLOCK_PARTS, name: string, size?: DocBlockSize): DNode | undefined => {
    const want = k === 'item' && size ? { ...BLOCK_PARTS.item.member, size: ITEM_SIZE[size] } : BLOCK_PARTS[k].member;
    const m = memberOf(parts[k], want) ?? memberOf(parts[k], BLOCK_PARTS[k].member) ?? parts[k]?.children?.[0];
    const i = m?.createInstance?.();
    if (!i) { out.misses.push(`${BLOCK_PARTS[k].set} member`); return undefined; }
    i.name = name;
    return i;
  };

  const roots: { root: DNode; top: DNode; bottom: DNode; caption?: DNode; specimen?: DNode }[] = [];
  for (const type of DOC_BLOCK_TYPES) for (const size of DOC_BLOCK_SIZES) {
    const root = api.createComponent() as DNode;
    root.name = docBlockVariant(type, size);
    autoLayout(root, { dir: 'VERTICAL', itemSpacing: 8 });
    root.fills = [];
    root.layoutSizingHorizontal = 'FIXED';
    root.resize?.(BLOCK_WIDTH, 1);
    root.layoutSizingVertical = 'HUG';
    const spacer = (name: string): DNode => { const s = api.createFrame() as DNode; s.name = name; s.fills = []; s.resize?.(BLOCK_WIDTH, PADDING_HEIGHT); return s; };
    const top = spacer('top-padding');
    const bottom = spacer('bottom-padding');
    const add = (n: DNode | undefined) => { if (n) root.appendChild?.(n); };
    add(top);
    fill(top);
    const entry: (typeof roots)[number] = { root, top, bottom };
    if (type === 'Heading') add(await text('text', 'Heading', STYLE.heading[size], BLOCK_COLORS.primary));
    if (type === 'Paragraph') add(await text('text', 'Paragraph', STYLE.body[size], BLOCK_COLORS.secondary));
    if (type === 'Field') {
      const row = frame('row', 'HORIZONTAL', 16);
      const label = await text('label', 'Label', STYLE.label[size], BLOCK_COLORS.primary);
      label.layoutAlign = 'INHERIT';
      label.layoutSizingHorizontal = 'FIXED';
      label.resize?.(LABEL_COLUMN, 1);
      const value = await text('text', 'Value', STYLE.body[size], BLOCK_COLORS.secondary);
      value.layoutAlign = 'INHERIT';
      value.layoutGrow = 1;
      row.appendChild?.(label);
      row.appendChild?.(value);
      add(row);
      fill(row);
      label.textAutoResize = 'HEIGHT';
    }
    if (type === 'Do-Dont') {
      const cols = frame('columns', 'HORIZONTAL', 16);
      for (const [name, heading, color] of [['do', 'Do', BLOCK_COLORS.doRule], ['dont', "Don't", BLOCK_COLORS.dontRule]] as const) {
        const col = frame(name, 'VERTICAL', 8);
        col.layoutGrow = 1;
        const rule = api.createFrame() as DNode;
        rule.name = 'rule';
        rule.resize?.(BLOCK_WIDTH / 2, 3);
        rule.layoutAlign = 'STRETCH';
        rule.fills = paint(color);
        col.appendChild?.(rule);
        col.appendChild?.(await text('heading', heading, STYLE.label[size], BLOCK_COLORS.primary));
        for (let i = 1; i <= DO_ROWS; i++) {
          const item = instance('item', `item${i}`, size);
          if (item) { item.layoutAlign = 'STRETCH'; col.appendChild?.(item); }
        }
        cols.appendChild?.(col);
      }
      add(cols);
      fill(cols);
    }
    if (type === 'Specimen') {
      const stage = frame('stage', 'VERTICAL');
      autoLayout(stage, { dir: 'VERTICAL', padding: STAGE_PAD, counterAlign: 'CENTER' });
      stage.layoutAlign = 'STRETCH';
      stage.fills = paint(BLOCK_COLORS.stage);
      // The swap's default is a Badge member: any component will do until the panel swaps in the documented set's.
      const specimen = parts.marker?.children?.[0]?.createInstance?.();
      if (specimen) { specimen.name = 'specimen'; stage.appendChild?.(specimen); entry.specimen = specimen; }
      add(stage);
      entry.caption = await text('caption', 'Caption', STYLE.caption[size], BLOCK_COLORS.secondary);
      add(entry.caption);
    }
    if (type === 'Part-marker') add(instance('marker', 'marker'));
    if (type === 'Chips') {
      add(await text('label', 'Label', STYLE.label[size], BLOCK_COLORS.primary));
      const chips = frame('chips', 'HORIZONTAL', 6);
      chips.layoutWrap = 'WRAP';
      chips.counterAxisSpacing = 6;
      for (let i = 1; i <= CHIP_SLOTS; i++) { const c = instance('chip', `chip${i}`); if (c) chips.appendChild?.(c); }
      add(chips);
      fill(chips);
      entry.caption = await text('note', 'Note', STYLE.caption[size], BLOCK_COLORS.secondary);
      add(entry.caption);
    }
    if (type === 'Divider') { const d = instance('divider', 'divider'); if (d) { d.layoutAlign = 'STRETCH'; add(d); } }
    add(bottom);
    fill(bottom);
    page.appendChild(root);
    roots.push(entry);
  }
  const set = api.combineAsVariants(roots.map((r) => r.root), page) as DNode & { addComponentProperty?(name: string, type: string, value: string | boolean): string };
  set.name = DOC_BLOCK_SET;
  const topId = set.addComponentProperty?.(TOP_PADDING, 'BOOLEAN', false);
  const bottomId = set.addComponentProperty?.(BOTTOM_PADDING, 'BOOLEAN', false);
  const captionId = set.addComponentProperty?.(CAPTION, 'BOOLEAN', true);
  const swapDefault = parts.marker?.children?.[0]?.id;
  const swapId = swapDefault ? set.addComponentProperty?.(SPECIMEN, 'INSTANCE_SWAP', swapDefault) : undefined;
  for (const r of roots) {
    if (topId) r.top.componentPropertyReferences = { visible: topId };
    if (bottomId) r.bottom.componentPropertyReferences = { visible: bottomId };
    if (captionId && r.caption) r.caption.componentPropertyReferences = { visible: captionId };
    if (swapId && r.specimen) r.specimen.componentPropertyReferences = { mainComponent: swapId };
  }
  stackVariants(set, roots.map((r) => r.root));
  const boxes = ((page.children ?? []) as { x?: number; width?: number }[]).filter((n) => n !== (set as unknown));
  if (boxes.length) { (set as { x?: unknown }).x = Math.max(...boxes.map((b) => (b.x ?? 0) + (b.width ?? 0))) + 160; (set as { y?: unknown }).y = 0; }
  out.misses = [...new Set(out.misses)];
  return { ...out, status: 'built' };
};

/** Set up file's clause for the template: what it built, or what it needs first. Empty when it was already there.
 *  DRAFT wording for the owner. */
export const docBlockNote = (r: DocBlockResult): string => {
  if (r.status === 'present') return '';
  if (r.status === 'built') return `, built ${DOC_BLOCK_SET}${r.misses.length ? ` (⚠ not found: ${r.misses.slice(0, 3).join('; ')})` : ''}`;
  const sets = r.missing.filter((m) => m !== 'theme');
  const needs = [...(r.missing.includes('theme') ? ['apply the theme'] : []), ...(sets.length ? [`build ${sets.join(', ')}`] : [])];
  return `, ${DOC_BLOCK_SET} not built: usage panels need it. ${needs.join(' and ').replace(/^./, (c) => c.toUpperCase())}, then run Set up file again`;
};
