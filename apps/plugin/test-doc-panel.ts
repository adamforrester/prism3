/**
 * THE USAGE PANEL (#846 phase 2) — the panel beside each set and its `_Doc-block` template, checked against an
 * in-memory host, and against sets the component shim builds with the real executor.
 *
 *   present/<def>   every def that builds a set: one live panel on the set's page, tagged with the def and the set, and
 *                   its section frames, read off the drawn panel, are exactly the model's sections less the site-only
 *                   one, Theming included because the file has light and dark. Mutations: a section the model omits
 *                   drawn anyway → `present/focus-ring` (Content guidelines); the modes not passed → every
 *                   `present/<def>` (Theming missing).
 *   no data/…       a def with its Content guidelines and its Accessibility rows emptied draws neither section.
 *   anatomy/…       no held-back part note (maintainer register or a tool's name) is anywhere in a drawn panel's text,
 *                   on every def; each reader-ready caption is. Mutation: the raw note as the caption → `anatomy/held back`.
 *   replace/…       a second draw of an unedited panel replaces it: one panel, the earlier removed.
 *   hand edit/…     a panel whose text a designer changed is kept: renamed "(edited)", tagged kept, its edit intact, below
 *                   the fresh panel and clear of it, and named in the run's clauses; a third draw keeps it once and draws
 *                   one fresh panel. Mutation: the fingerprint check dropped (every earlier panel removed) → `hand edit/kept`.
 *   overlap/…       Tag and Badge built by the executor on one page, each with its labels and its panel: no panel overlaps
 *                   any other node on the page. A layer where the panel goes: no panel is drawn, and the run says why.
 *                   Mutation: the overlap check dropped → `overlap/blocked`. The run sends a designer to Update only
 *                   when a Prism3 set later in the row is in the way (`overlap/blocked by a set`), else to move it.
 *   due/…           the dry run's check: due before a draw, not after, due again when the plan or the set's place moves,
 *                   never without the template; a panel whose draw was blocked is not due while the blocker stays, unless
 *                   the update itself moves the blocker. Mutations: the blocker check dropped from `docPanelDue` →
 *                   `due/blocked`; the post-move check dropped from `previewUpdate` → `due/update makes room`; that check's
 *                   `every` blocker moved read as `some` → `due/update leaves a blocker`.
 *   room/…          the update spaces two built sets past the first one's panel when the file has `_Doc-block` (160px
 *                   visible gap, #2842), through the real apply, and a live panel moves with its set. Mutations:
 *                   `respaceLive` given no reach (M1) → `room/apply`; the live panel dropped from `pageViews`' furniture
 *                   (M3) → `room/panel follows`; the panel dropped from what `respaceLive` moves with a set →
 *                   `room/panel follows`.
 *   orphan/…        before a def is built again, its deleted set's unedited panel is removed and an edited one kept.
 *                   Mutation: `clearOrphanPanels` without its `panelUnedited` check (M4) → `orphan/edited kept`.
 *   seat/…          a new set is seated with room for its panel. Mutation: `seatNewSet` ignoring `panelReach` →
 *                   `seat/room for the panel`.
 *   template/…      `_Doc-block` as Set up file builds it: nothing without Badge, Tag, List.Item, Divider and a theme,
 *                   naming each; with them, every Type × Size variant, the three booleans and the swap, each type's
 *                   layers, and the Prism3 components it nests. `template/fill` (#2902): the padding spacers, Field's `row`,
 *                   Do-Dont's `columns` and Chips' `chips` FILL in every variant (the shim throws on FILL outside an
 *                   auto-layout parent, as the host does), and Field's `label` grows to its text at the label column.
 *                   `template/repair`: a set built before the fix is brought up to date in place on the next run, the same
 *                   set and members, and a set already right is left alone. Mutations: `fill(chips)` dropped →
 *                   `template/fill`; `chips` dropped from the repair's list → `template/repair`; the label's `HEIGHT`
 *                   dropped → `template/fill`.
 *   line/…          a file without `_Doc-block`: one Set up file line for the run, naming usage panels.
 *
 * INDEPENDENCE (docs/34): the expected sections come from the engine's model (`docSections`), which the panel reads but
 * this file does not reach through the panel; the site-only section, the layer names, the variant names and every
 * sentence checked are written out here, never read off `doc-panel.ts` or `doc-block.ts`.
 *
 * Run: `npx tsx apps/plugin/test-doc-panel.ts`
 */
import { componentDefs } from '@prism3/engine/components/index';
import { docSections, MAINTAINER_REGISTER, NAMES_A_TOOL } from '@prism3/engine/component-doc-sections';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, CANVAS_FURNITURE } from '@prism3/engine/anatomy-figma';
import { applyComponentPlan } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { makeShim, type Node } from './component-shim';
import { anatomyMarks, clearOrphanPanels, drawDocPanel, docPanelDue, leadsPanel, planDocPanel, panelItems, type PanelApi, type PNode } from './src/doc-panel';
import { TAXONOMY } from './src/file-taxonomy';
import { fingerprintOf } from './src/style-guide';
import { ensureDocBlock, type DocBlockApi } from './src/doc-block';
import { drawFurniture, furnishUpdate, furnitureLayout, seatNewSet, templatesLine, withPanel, type FurnitureApi, type XNode } from './src/canvas-furniture';
import { pageSetMoves, previewUpdate, type UpdateHost, type UpdateTarget } from './src/update-plan';
import { applyUpdate, previewHashOf } from './src/update-apply';

let failed = 0;
const ok = (cond: boolean, label: string, detail = ''): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
};
const section = (s: string) => console.log(`\n${s}`);

/* ── the oracle, written here ──────────────────────────────────────────────────────────────────────────── */
/** The section the panel leaves to the docs site (Q406.2 A). */
const SITE_ONLY = ['code'];
/** The layers each block type carries, by name: the contract the panel writes into. */
const LAYERS: Record<string, string[]> = {
  Heading: ['text'],
  Paragraph: ['text'],
  Field: ['row', 'label', 'text'],
  'Do-Dont': ['columns', 'do', 'dont', 'rule', 'heading', 'item1', 'item2', 'item3', 'item4'],
  Specimen: ['stage', 'specimen', 'caption'],
  'Part-marker': ['marker'],
  Chips: ['label', 'chips', 'chip1', 'chip16', 'note'],
  Divider: ['divider'],
};
/** List.Item's item-text layer as the projection builds it (#2902): the one TEXT node of an unordered member. Read
 *  from the plan the host builds, not from the def's `figmaProperties` mapping the panel reads, so a panel that writes
 *  any other layer (the `text` PROPERTY's name, say) finds nothing and fails `panel/do-dont`. */
const LIST_ITEM_TEXT = (() => {
  const plan = figmaAnatomySet(componentDefs.find((d) => d.id === 'list-item')!, { swapTarget: SWAP_TARGET }).find((pl) => pl.coord.type === 'unordered')!;
  const all = (n: { type?: string; name: string; children?: readonly unknown[] }): { type?: string; name: string }[] =>
    [n, ...((n.children ?? []) as typeof n[]).flatMap(all)];
  const found = all(plan.root as never).filter((n) => n.type === 'TEXT').map((n) => n.name);
  if (found.length !== 1) throw new Error(`list-item: want one TEXT layer in an unordered member, got [${found.join(', ')}]`);
  return found[0];
})();
const TYPES = ['Heading', 'Paragraph', 'Field', 'Do-Dont', 'Specimen', 'Part-marker', 'Chips', 'Divider'];
const SIZES = ['sm', 'md', 'lg'];

/* ── a host: nodes with parents, a simple auto layout, plugin data ─────────────────────────────────────── */
type N = PNode & Record<string, unknown> & { children: N[] };
let seq = 0;
const TEXT_LINE = 16;
const mk = (type: string, name: string, children: N[] = [], extra: Record<string, unknown> = {}): N => {
  const data = new Map<string, string>();
  const n = {
    id: `${type[0]}:${++seq}`, type, name, x: 0, y: 0, visible: true, children: [] as N[], fills: [], strokes: [], _mk: true,
    _w: type === 'TEXT' ? 200 : 100, _h: type === 'TEXT' ? TEXT_LINE : 0,
    get width(): number {
      const self = this as unknown as N;
      const p = self.parent as N | undefined;
      // FILL across a vertical parent: its width less its padding. A `_hug` frame hugs its children, as a specimen does.
      if (self.layoutSizingHorizontal === 'FILL' && p?._mk && p.layoutMode === 'VERTICAL') return p.width! - Number(p.paddingLeft ?? 0) - Number(p.paddingRight ?? 0);
      const kids = flow(self);
      if (!self._hug || !self.layoutMode || !kids.length) return self._w as number;
      const pad = Number(self.paddingLeft ?? 0) + Number(self.paddingRight ?? 0);
      return pad + (self.layoutMode === 'HORIZONTAL' ? kids.reduce((a, c) => a + c.width!, 0) + Number(self.itemSpacing ?? 0) * (kids.length - 1) : Math.max(...kids.map((c) => c.width!)));
    },
    get height(): number {
      const self = this as unknown as N;
      if (self.type === 'TEXT') return Math.max(1, Math.ceil(String(self.characters ?? '').length / 60)) * TEXT_LINE;
      const kids = flow(self);
      if (!self.layoutMode || !kids.length) return self._h as number;
      const pad = Number(self.paddingTop ?? 0) + Number(self.paddingBottom ?? 0);
      const gap = Number(self.itemSpacing ?? 0);
      return pad + (self.layoutMode === 'VERTICAL' ? kids.reduce((a, c) => a + (c.height ?? 0), 0) + gap * (kids.length - 1) : Math.max(...kids.map((c) => c.height ?? 0)));
    },
    /** THE HOST'S OWN LAYOUT (#2916): a child of an auto-layout frame sits after the shown children before it, centered
     *  across when the frame centers, and any other node at its x and y. Written here, never read off the panel. */
    get absoluteBoundingBox(): { x: number; y: number; width: number; height: number } {
      const self = this as unknown as N;
      const p = self.parent as N | undefined;
      if (!p || p.type === 'PAGE') return { x: Number(self.x ?? 0), y: Number(self.y ?? 0), width: self.width!, height: self.height! };
      // A parent this host did not make (the component shim's page) is the canvas origin.
      const at = p.absoluteBoundingBox ?? { x: 0, y: 0 };
      let x = Number(self.x ?? 0), y = Number(self.y ?? 0);
      if (p.layoutMode && self.layoutPositioning !== 'ABSOLUTE') {
        const kids = flow(p), i = kids.indexOf(self), gap = Number(p.itemSpacing ?? 0);
        const v = p.layoutMode === 'VERTICAL';
        const along = kids.slice(0, i).reduce((a, c) => a + (v ? c.height! : c.width!) + gap, 0);
        const inner = v ? p.width! - Number(p.paddingLeft ?? 0) - Number(p.paddingRight ?? 0) : p.height! - Number(p.paddingTop ?? 0) - Number(p.paddingBottom ?? 0);
        const across = p.counterAxisAlignItems === 'CENTER' ? (inner - (v ? self.width! : self.height!)) / 2 : 0;
        x = Number(p.paddingLeft ?? 0) + (v ? across : along);
        y = Number(p.paddingTop ?? 0) + (v ? along : across);
      }
      return { x: at.x + x, y: at.y + y, width: self.width!, height: self.height! };
    },
    resize(w: number, h: number) { (n as N)._w = w; (n as N)._h = h; },
    appendChild(c: N) { detach(c); c.parent = n; n.children.push(c); },
    insertChild(i: number, c: N) { detach(c); c.parent = n; n.children.splice(i, 0, c); },
    remove() { detach(n); n.removed = true; },
    getSharedPluginData: (ns: string, k: string) => data.get(`${ns}/${k}`) ?? '',
    setSharedPluginData: (ns: string, k: string, v: string) => { data.set(`${ns}/${k}`, v); },
    ...extra,
  } as unknown as N;
  for (const c of children) n.appendChild!(c);
  if (type === 'TEXT') { n.fontName = { family: 'Inter', style: 'Regular' }; n.characters = n.characters ?? name; }
  return n;
};
/** The children an auto-layout frame lays out: shown and not absolute. */
const flow = (n: N): N[] => n.children.filter((c) => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
const detach = (c: N): void => {
  const p = c.parent as N | undefined;
  if (p?.children) { const i = p.children.indexOf(c); if (i >= 0) p.children.splice(i, 1); }
};
const walk = (n: N): N[] => [n, ...n.children.flatMap(walk)];
const texts = (n: N): string[] => walk(n).filter((c) => c.type === 'TEXT' && c.visible !== false).map((c) => String(c.characters));

/** An instance of a Prism3 component, as the panel reads one: its text layer, and a mode it can be pinned to. */
const prism3Instance = (text: string): N => {
  const i = mk('INSTANCE', 'instance', [mk('TEXT', text)]);
  i.setExplicitVariableModeForCollection = (_c: unknown, modeId: string) => { i.pinned = modeId; };
  return i;
};
/** A `_Doc-block` instance of `type`, carrying the layers `LAYERS` names, and its component properties. */
const blockInstance = (type: string): N => {
  const t = (name: string) => mk('TEXT', name);
  const body: N[] =
    type === 'Field' ? [mk('FRAME', 'row', [t('label'), t('text')], { layoutMode: 'HORIZONTAL' })]
      : type === 'Do-Dont' ? [mk('FRAME', 'columns', ['do', 'dont'].map((c) => mk('FRAME', c, [mk('FRAME', 'rule'), t('heading'), ...[1, 2, 3, 4].map((k) => { const it = prism3Instance(LIST_ITEM_TEXT); it.name = `item${k}`; return it; })], { layoutMode: 'VERTICAL', itemSpacing: 8 })), { layoutMode: 'HORIZONTAL' })]
        : type === 'Specimen' ? [mk('FRAME', 'stage', [mk('INSTANCE', 'specimen', [], { _h: 40 })], { layoutMode: 'VERTICAL', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, counterAxisAlignItems: 'CENTER', layoutSizingHorizontal: 'FILL' }), t('caption')]
          : type === 'Part-marker' ? [(() => { const m = prism3Instance('count'); m.name = 'marker'; m._w = 20; m._h = 20; return m; })()]
            : type === 'Chips' ? [t('label'), mk('FRAME', 'chips', Array.from({ length: 16 }, (_, k) => { const c = prism3Instance('label'); c.name = `chip${k + 1}`; c._h = 32; return c; }), { layoutMode: 'HORIZONTAL' }), t('note')]
              : type === 'Divider' ? [mk('INSTANCE', 'divider', [], { _h: 1 })]
                : [t('text')];
  const props: Record<string, { type: string; value: unknown }> = {
    'Top padding#1:0': { type: 'BOOLEAN', value: false }, 'Bottom padding#1:1': { type: 'BOOLEAN', value: false },
    'Caption#1:2': { type: 'BOOLEAN', value: true }, 'Specimen#1:3': { type: 'INSTANCE_SWAP', value: 'C:placeholder' },
  };
  const i = mk('INSTANCE', `_Doc-block`, body, { layoutMode: 'VERTICAL', itemSpacing: 8, componentProperties: props, mainComponent: { id: `C:${type}` } });
  i.setProperties = (p: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(p)) {
      if (!props[k]) throw new Error(`in setProperties: no property ${k}`);
      props[k].value = v;
      if (k.startsWith('Caption')) { const cap = walk(i).find((c) => c.name === 'caption' || c.name === 'note'); if (cap) cap.visible = !!v; }
      if (k.startsWith('Specimen')) {
        // The swap: the specimen becomes an instance of the member, holding a copy of the member's layers.
        const sp = walk(i).find((c) => c.name === 'specimen')!;
        const member = members.get(String(v)) ?? livePages.flatMap((pg) => pg.children.flatMap(walk)).find((c) => c.id === v);
        sp.children.splice(0);
        if (member) instanceOf(sp, member);
        sp.swapped = v;
      }
    }
  };
  i.setExplicitVariableModeForCollection = (_c: unknown, modeId: string) => { i.pinned = modeId; };
  return i;
};
/** The members a specimen can be swapped to, by id. */
const members = new Map<string, N>();
/** A layer of a member as the host builds it, from a plan node or a component the shim built: its type, name, whether
 *  shown, the boolean its visibility follows, and its layout. A layer with no children is a fixed box: text 48 × 16,
 *  anything else 24 × 24. */
const copyLayer = (src: Record<string, unknown>): N => {
  const t = String(src.type ?? 'FRAME');
  const type = t === 'NESTED_INSTANCE' || t === 'INSTANCE_SWAP' ? 'INSTANCE' : t === 'CONTENT_SLOT' ? 'SLOT' : t === 'COMPONENT' ? 'FRAME' : t;
  const refs = src.componentPropertyReferences as Record<string, string> | undefined;
  const vis = refs?.visible ?? (src.visibleProp ? `${String(src.visibleProp)}#v` : undefined);
  const kids = ((src.children ?? []) as Record<string, unknown>[]).map(copyLayer);
  const n = mk(type, String(src.name), kids, {
    visible: src.visible !== false, _w: type === 'TEXT' ? 48 : 24, _h: type === 'TEXT' ? 16 : 24, _hug: true,
    layoutMode: kids.length ? (src.layoutMode === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL') : undefined, itemSpacing: 4,
    ...(vis ? { componentPropertyReferences: { visible: vis } } : {}),
  });
  if (type === 'TEXT') { n._w = 48; n._h = 16; }
  return n;
};
/** `sp` as an instance of `member`: its layers copied, and its booleans as the instance's properties, each showing or
 *  hiding the layers that follow it. */
const instanceOf = (sp: N, member: N): void => {
  for (const c of member.children) sp.appendChild!(copyLayer(c as never));
  sp._hug = true;
  sp.layoutMode = member.layoutMode ?? 'VERTICAL';
  sp.itemSpacing = 4;
  const props: Record<string, { type: string; value: unknown }> = {};
  for (const c of walk(sp)) { const k = c.componentPropertyReferences?.visible; if (k) props[k] = { type: 'BOOLEAN', value: c.visible !== false }; }
  sp.componentProperties = props;
  sp.setProperties = (p: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(p)) {
      if (!props[k]) throw new Error(`in setProperties: no property ${k}`);
      props[k].value = v;
      for (const c of walk(sp)) if (c.componentPropertyReferences?.visible === k) c.visible = !!v;
    }
  };
};
/** A member of a fake set, from one of the def's plans: named by its variant values, holding the plan's layers. */
const planMember = (plan: { coord: Record<string, string>; root: Record<string, unknown> }): N => {
  const m = copyLayer(plan.root);
  m.type = 'COMPONENT';
  m.name = Object.entries(plan.coord).map(([k, v]) => `${k}=${v}`).join(', ');
  members.set(String(m.id), m);
  return m;
};
const docBlockSet = (): N => mk('COMPONENT_SET', '_Doc-block', TYPES.flatMap((t) => SIZES.map((s) => mk('COMPONENT', `Type=${t}, Size=${s}`, [], { createInstance: () => blockInstance(t) }))));

const VARS = ['color/background/primary', 'color/border/secondary', 'color/text/primary', 'color/text/secondary', 'color/background/secondary', 'color/border/success', 'color/border/danger'].map((name, i) => ({ id: `V:${i}`, name: `zz/${name}`, variableCollectionId: 'VC:color' }));
const COLLECTION = { id: 'VC:color', name: 'color', modes: [{ modeId: 'M:light', name: 'light' }, { modeId: 'M:dark', name: 'dark' }, { modeId: 'M:hc-light', name: 'hc-light' }] };
/** A host over `pages`: the template set (unless `template: false`) and every node on them. */
const host = (pages: N[], o: { template?: boolean; modes?: boolean } = {}): PanelApi & FurnitureApi => {
  const blocks = o.template === false ? [] : [docBlockSet()];
  const all = () => [...blocks, ...pages.flatMap((p) => p.children.flatMap(walk))];
  return {
    root: {
      findAllWithCriteria: (c: { types: string[]; sharedPluginData?: { namespace: string; keys: string[] } }) =>
        all().filter((n) => c.types.includes(String(n.type)) && !n.removed && (!c.sharedPluginData || c.sharedPluginData.keys.some((k) => n.getSharedPluginData!(c.sharedPluginData!.namespace, k)))),
    },
    loadFontAsync: async () => {},
    createFrame: () => mk('FRAME', 'Frame'),
    variables: {
      getLocalVariablesAsync: async () => VARS,
      ...(o.modes === false ? {} : { getLocalVariableCollectionsAsync: async () => [COLLECTION] }),
      setBoundVariableForPaint: (p: never, _f: 'color', v: never) => ({ ...(p as object), boundVariables: { color: { id: (v as { id: string }).id } } }),
    },
  } as unknown as PanelApi & FurnitureApi;
};
const livePages: N[] = [];
const page = (name: string): N => { const p = mk('PAGE', name); livePages.push(p); p.findOne = (pred: (n: unknown) => boolean) => p.children.find(pred) ?? null; return p; };
/** A set on `p` at (x, y), w × h, whose members are the def's plans, as the engine projects them, the default first. */
const fakeSet = (p: N, def: string, x = 0, y = 0, w = 600, h = 400): N => {
  const plans = planCache.get(def) ?? figmaAnatomySet(componentDefs.find((d) => d.id === def)!, { swapTarget: SWAP_TARGET });
  planCache.set(def, plans);
  const s = mk('COMPONENT_SET', def, plans.map((pl) => planMember(pl as never)), { x, y, _w: w, _h: h });
  p.appendChild!(s);
  return s;
};
const planCache = new Map<string, ReturnType<typeof figmaAnatomySet>>();
const panelsOn = (p: N): N[] => p.children.filter((c) => c.getSharedPluginData!('prism3', 'docPanel'));
const tagOf = (n: N) => JSON.parse(n.getSharedPluginData!('prism3', 'docPanel')) as { def: string; set: string; state: string };
const drawnSections = (panel: N): string[] => walk(panel).map((c) => c.getSharedPluginData!('prism3', 'docSection')).filter(Boolean);
const boxOf = (n: N) => ({ x: Number(n.x), y: Number(n.y), w: Number(n.width), h: Number(n.height) });
const overlapsBox = (p: { x: number; y: number; width: number; height: number }, q: { x: number; y: number; width: number; height: number }): boolean =>
  p.x < q.x + q.width && q.x < p.x + p.width && p.y < q.y + q.height && q.y < p.y + p.height;
const overlap = (a: N, b: N): boolean => { const p = boxOf(a), q = boxOf(b); return p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h; };
const names = (id: string) => componentDefs.find((d) => d.id === id)?.name ?? id;
const withSets = componentDefs.filter((d) => CANVAS_FURNITURE.has(d.id));
/** THE FAMILIES, as the oracle reads them (#2927): each taxonomy page's defs that build a set, and its lead, the page's
 *  `lead` or its one def. Read off the taxonomy data, not through `panelFamily`. */
const FAMILIES = TAXONOMY.sections.flatMap((s) => s.leaves).map((l) => ({ page: l.page, lead: l.lead ?? (l.defs.length === 1 ? l.defs[0] : ''), members: l.defs.filter((d) => CANVAS_FURNITURE.has(d)) })).filter((f) => f.members.length);
const familyOf = (id: string) => FAMILIES.find((f) => f.members.includes(id))!;
const leads = withSets.filter((d) => familyOf(d.id).lead === d.id);

/* ── present: a panel per set, and its sections are the model's ────────────────────────────────────────── */
section('present/… — every family\'s lead gets one panel, with the model\'s sections; any other member none (#2927)');
ok(withSets.length >= 40 && leads.length >= 25 && leads.length < withSets.length, `present/coverage: ${withSets.length} defs build a set, ${leads.length} lead a family`);
for (const def of withSets) {
  const p = page(`↳ ${def.id}`);
  const set = fakeSet(p, def.id);
  const r = await drawDocPanel(host([p]), set, def, { names });
  const panels = panelsOn(p);
  if (familyOf(def.id).lead !== def.id) {
    ok(!r.drawn && !panels.length && !r.skipped.length && !r.misses.length, `present/${def.id}: no panel of its own, its family's is beside ${familyOf(def.id).lead}`);
    continue;
  }
  const want = docSections(def, { modes: ['light', 'dark'] }).sections.map((s) => s.id).filter((id) => !SITE_ONLY.includes(id));
  const got = panels[0] ? drawnSections(panels[0]) : [];
  ok(r.drawn && panels.length === 1 && tagOf(panels[0]).def === def.id && tagOf(panels[0]).set === set.id && got.join() === want.join(),
    `present/${def.id}: one panel, sections ${got.join(', ')}`, `want [${want.join(', ')}], got ${panels.length} panel(s) [${got.join(', ')}] ${r.skipped.join('; ')}`);
  // The family's sets by name, under the lede, when the page holds more than one.
  const fam = familyOf(def.id);
  if (fam.members.length > 1) {
    const all = texts(panels[0]);
    const listed = fam.members.map((m) => componentDefs.find((d) => d.id === m)!.name);
    ok(all.includes('In this family') && all.includes(listed.join(', ')) && tagOf(panels[0]).family === fam.page, `present/${def.id} family: lists ${listed.join(', ')}`);
  }
}

section('panel/do-dont — each Do and Don\'t item\'s text is written into List.Item\'s text layer');
{
  let items = 0;
  const unwritten: string[] = [];
  for (const def of leads) {
    const p = page(`↳ d ${def.id}`);
    const r = await drawDocPanel(host([p]), fakeSet(p, def.id), def, { names });
    const shown = texts(panelsOn(p)[0] ?? mk('FRAME', 'none'));
    const plan = planDocPanel(def, { modes: ['light', 'dark'], names });
    for (const b of plan.sections.flatMap((s) => s.blocks)) {
      if (b.type !== 'Do-Dont') continue;
      for (const t of [...b.do, ...b.dont]) {
        items++;
        if (!shown.includes(t)) unwritten.push(`${def.id}: "${t.slice(0, 40)}"`);
      }
    }
    if (r.misses.some((m) => m.includes('item text'))) unwritten.push(`${def.id}: ${r.misses.join('; ')}`);
  }
  ok(items >= 20 && !unwritten.length, `panel/do-dont: all ${items} Do and Don't items are written, into List.Item's "${LIST_ITEM_TEXT}" layer`, unwritten.slice(0, 3).join('; '));
}

section('present/modes — the file\'s light and dark, side by side, each pinned');
{
  const def = componentDefs.find((d) => d.id === 'button')!;
  const p = page('↳ Buttons');
  const set = fakeSet(p, 'button');
  await drawDocPanel(host([p]), set, def, { names });
  const theming = walk(panelsOn(p)[0]).find((c) => c.getSharedPluginData!('prism3', 'docSection') === 'theming')!;
  const pinned = walk(theming).filter((c) => c.pinned).map((c) => c.pinned);
  ok(pinned.join() === 'M:light,M:dark', `present/modes: Theming pins ${pinned.join(', ')}`, 'want M:light, M:dark');
  const spec = (id: string) => walk(walk(panelsOn(p)[0]).find((c) => c.getSharedPluginData!('prism3', 'docSection') === id)!).filter((c) => c.name === 'specimen' && c.swapped);
  ok(spec('theming').length === 2 && spec('theming').every((c) => c.swapped === set.children[0].id) && spec('anatomy')[0]?.swapped === set.children[0].id,
    `present/specimen: the first Anatomy specimen and both Theming specimens show the set's default member`);
  const p2 = page('↳ Buttons 2');
  const set2 = fakeSet(p2, 'button');
  await drawDocPanel(host([p2], { modes: false }), set2, def, { names });
  ok(!drawnSections(panelsOn(p2)[0]).includes('theming'), 'present/no theme: a file with no color collection has no Theming section');
}

/* ── no data: a section the def cannot fill is not drawn ───────────────────────────────────────────────── */
section('no data/… — emptied sections are not drawn');
{
  const base = componentDefs.find((d) => d.id === 'badge')!;
  const def: ComponentDef = { ...base, docs: { ...base.docs, contentGuidelines: undefined }, content: undefined, accessibility: { ...base.accessibility, keyboard: undefined, focus: undefined, role: '', aria: undefined, wcag: [] }, motion: undefined } as ComponentDef;
  const p = page('↳ Badge');
  await drawDocPanel(host([p]), fakeSet(p, 'badge'), def, { names });
  const got = drawnSections(panelsOn(p)[0]);
  ok(!got.includes('content') && !got.includes('accessibility'), `no data/badge emptied: no Content guidelines, no Accessibility (${got.join(', ')})`);
}

/* ── anatomy: reader-ready captions only ───────────────────────────────────────────────────────────────── */
section('anatomy/… — held-back part notes never reach a panel');
{
  let heldBack = 0, shown = 0;
  const leaks: string[] = [];
  for (const def of leads) {
    const p = page(`↳ a ${def.id}`);
    await drawDocPanel(host([p]), fakeSet(p, def.id), def, { names });
    const all = texts(panelsOn(p)[0]).join('\n');
    const seen = new Set<string>();
    for (const [id, part] of Object.entries(def.anatomy?.parts ?? {})) {
      if (!part.note?.trim()) continue;
      // A repeat (Q4) lists only its first part: `item2` after `item1`, nesting the same component the same way.
      const rp = part as { nests?: string; nesting?: unknown; presentWhen?: unknown };
      const same = `${id.replace(/\d+$/, '')}|${rp.nests}|${JSON.stringify(rp.nesting)}|${JSON.stringify(rp.presentWhen)}`;
      if (/\d$/.test(id) && rp.nests && seen.has(same)) continue;
      seen.add(same);
      const first = part.note.replace(/`/g, '').replace(/\s+/g, ' ').trim().split(/(?<=[.)])\s+(?=[A-Z"(])/)[0];
      if (MAINTAINER_REGISTER.test(part.note) || NAMES_A_TOOL.test(part.note)) { heldBack++; if (all.includes(first)) leaks.push(`${def.id}.${id}`); }
      else { shown++; if (!all.includes(first)) leaks.push(`${def.id}.${id} (missing)`); }
    }
  }
  ok(heldBack >= 30 && !leaks.some((l) => !l.endsWith('(missing)')), `anatomy/held back: none of ${heldBack} held-back notes is in a panel`, leaks.filter((l) => !l.endsWith('(missing)')).slice(0, 5).join(', '));
  ok(shown >= 100 && !leaks.some((l) => l.endsWith('(missing)')), `anatomy/captions: all ${shown} reader-ready captions are`, leaks.filter((l) => l.endsWith('(missing)')).slice(0, 5).join(', '));
}

/** The numbers the drawn Anatomy lists: each Field label there that starts with one. */
const listedNumbers = (panel: N): string[] => {
  const sec = walk(panel).find((c) => c.getSharedPluginData!('prism3', 'docSection') === 'anatomy');
  return sec ? walk(sec).filter((c) => c.type === 'TEXT' && c.name === 'label').map((c) => /^(\d+)\s/.exec(String(c.characters))?.[1]).filter((x): x is string => !!x) : [];
};

/* ── marks: the numbered entries, from the part tree ───────────────────────────────────────────────────── */
section('marks/… — repeats merged, the root and the parts that hold others bracketed (#2927 Q4, Q5)');
{
  // Written out from the defs' part trees as read by hand (list: container > items > item1..3; tabs: container >
  // items > tab1..3 and the baseline; button: container and its parts, none holding another).
  const of = (id: string) => { const def = componentDefs.find((d) => d.id === id)!; const a = docSections(def).sections.find((x) => x.id === 'anatomy'); return anatomyMarks(def, a && a.id === 'anatomy' ? a.parts.map((pt) => pt.id) : []); };
  const show = (ms: ReturnType<typeof anatomyMarks>) => ms.map((m) => `${m.n}:${m.part}${m.parts > 1 ? `x${m.parts}` : ''}${m.bracket ? '[' : ''}@${m.path.join('/')}`).join(' ');
  ok(show(of('list')) === '1:container[@ 2:items[@items 3:item1x3@items/item1', `marks/list: ${show(of('list'))}`, 'want 1:container[@ 2:items[@items 3:item1x3@items/item1');
  ok(show(of('tabs')) === '1:container[@ 2:items[@items 3:tab1@items/tab1 4:tab2x2@items/tab2 5:baseline@baseline', `marks/tabs: the selected tab apart from the two unselected (${show(of('tabs'))})`);
  // Pagination (#2665), read by hand: the row's items are pages 1, 4, 6 and 10 (item1, 3, 5, 7: one setting), two gaps
  // (item2, item6) and the current page (item4). A repeat merges by its settings, not by place, so the pages and the gaps
  // each make one entry though they alternate.
  const pg = '1:container[@ 2:row[@row 3:previous@row/previous 4:items[@row/items 5:item1x4@row/items/item1 6:item2x2@row/items/item2 7:item4@row/items/item4 8:status@row/status 9:next@row/next 10:simpleRow[@simpleRow 11:previousButton@simpleRow/previousButton 12:nextButton@simpleRow/nextButton';
  ok(show(of('pagination')) === pg, `marks/pagination: the pages and the gaps merge apart from the current page (${show(of('pagination'))})`, `want ${pg}`);
  // Code input (#2428), read by hand from its cell(n) settings: the first cell is the active one at focus-visible, cells 2
  // and 3 are filled, cell 4 is active once three are in, cells 5 and 6 rest. Two runs of two, apart: the second run is
  // cell5's, never cell3's.
  const ci = '1:container[@ 2:label@label 3:items[@items 4:cell1@items/cell1 5:cell2x2@items/cell2 6:cell4@items/cell4 7:cell5x2@items/cell5 8:message@message';
  ok(show(of('code-input')) === ci, `marks/code-input: two runs of two, apart (${show(of('code-input'))})`, `want ${ci}`);
  ok(show(of('counter')).includes('decrement') && show(of('counter')).includes('increment'), `marks/counter: two parts that nest one component with different jobs stay apart (${show(of('counter'))})`);
  ok(of('button').every((m) => !m.bracket && m.parts === 1), 'marks/button: nothing merged, nothing bracketed');
}

/* ── markers: on their parts, by the host's own layout ─────────────────────────────────────────────────── */
section('markers/… — every listed number on a specimen, on its part, by a leader or a bracket (#2916)');
{
  /** The part a number stands for, found by the oracle's own means: the drawn list's name for it, matched to the
   *  def's listed parts, then the first shown layer of that id in a specimen of the Anatomy (the specimen itself for
   *  the root). */
  const check = async (def: ComponentDef, set: N, p: N, label: string): Promise<void> => {
    const r = await drawDocPanel(host([p]), set, def, { names });
    const panel = panelsOn(p)[0];
    const sec = walk(panel).find((c) => c.getSharedPluginData!('prism3', 'docSection') === 'anatomy')!;
    const specs = walk(sec).filter((c) => c.name === 'specimen');
    const a = docSections(def).sections.find((x) => x.id === 'anatomy');
    const parts = a && a.id === 'anatomy' ? a.parts : [];
    const shown = (n: N, top: N): boolean => { for (let q: N | undefined = n; q; q = q === top ? undefined : q.parent as N) if (q.visible === false) return false; return true; };
    const wrong: string[] = [];
    const nums = listedNumbers(panel);
    const taken = new Set<string>();
    const labelOf = (num: string): string => String(walk(sec).find((c) => c.name === 'label' && String(c.characters).startsWith(`${num}  `))!.characters).slice(`${num}  `.length).replace(/ \(optional\)$/, '');
    // The names listed as themselves: a merged repeat never stands for one of them.
    const ownNamed = new Set(nums.map(labelOf).filter((l) => !/ ×\d+$/.test(l)));
    // How many parts each merged name's ×N entries claim between them, and the last part each name's entries reached.
    const claimed = new Map<string, number>();
    const lastAt = new Map<string, number>();
    for (const num of nums) {
      const label = labelOf(num);
      const merged = / ×\d+$/.test(label);
      const runOf = Number(/ ×(\d+)$/.exec(label)?.[1] ?? 1);
      const nm = label.replace(/ ×\d+$/, '');
      // By its name, else (a merged repeat, ×N) any part of that name not listed by its own name and not reached yet. The
      // panel merges repeats by their settings, not by place (Pagination's pages and gaps alternate, #2665; Code input's
      // runs sit apart, #2428), so the oracle does not guess which parts a run holds. It holds what any grouping must
      // keep instead: one name's entries reach its parts in part order, and their counts cover those parts exactly
      // (after the loop). Which parts merge is pinned by hand in marks/ above.
      const pool = merged
        ? parts.filter((pt) => !taken.has(pt.id) && !ownNamed.has(pt.name) && pt.name.replace(/\s*\d+$/, '') === nm)
        : [parts.find((pt) => pt.name === nm)!];
      if (merged) claimed.set(nm, (claimed.get(nm) ?? 0) + runOf);
      const first = pool[0]!;
      const isRoot = !merged && first.id === def.anatomy?.root;
      const targets = specs.flatMap((sp) => (isRoot ? [sp] : walk(sp).filter((c) => pool.some((pt) => c.name === pt.id) && shown(c, sp))));
      const group = panel.children.find((c) => c.name === `part ${num}`);
      if (!group) { wrong.push(`${num} ${first.id}: no marker`); continue; }
      const box = group.absoluteBoundingBox!;
      const lines = group.children.filter((c) => c.name === 'leader' || c.name === 'tick').map((c) => c.absoluteBoundingBox!);
      const badge = group.children.find((c) => c.name === '_Doc-block')!;
      const marker = walk(badge).find((c) => c.name === 'marker')!.absoluteBoundingBox!;
      const hit = targets.find((t) => { const b = t.absoluteBoundingBox!; return overlapsBox(box, b) && lines.some((l) => overlapsBox(l, b)); });
      if (!hit) { wrong.push(`${num} ${first.id}: its marker and leader reach no ${merged ? `untaken ${nm}` : first.id} (${targets.length} in the specimens)`); continue; }
      const part = isRoot ? first : pool.find((pt) => pt.id === hit.name)!;
      taken.add(part.id);
      if (merged) {
        const at = parts.indexOf(part);
        if (at <= (lastAt.get(nm) ?? -1)) wrong.push(`${num} ${part.id}: reached before an earlier ${nm} entry's part`);
        lastAt.set(nm, at);
      }
      const spec = specs.find((sp) => walk(sp).includes(hit))!;
      if (overlapsBox(marker, spec.absoluteBoundingBox!)) wrong.push(`${num} ${part.id}: the marker sits on the specimen, not in its gutter`);
      const stage = (spec.parent as N).absoluteBoundingBox!;
      if (marker.x < stage.x || marker.y < stage.y || marker.x + marker.width > stage.x + stage.width || marker.y + marker.height > stage.y + stage.height)
        wrong.push(`${num} ${part.id}: the marker is outside its specimen's stage`);
      if (texts(badge)[0] !== num) wrong.push(`${num}: the marker reads ${texts(badge)[0]}`);
    }
    for (const [nm, n] of claimed) {
      const of = parts.filter((pt) => !ownNamed.has(pt.name) && pt.name.replace(/\s*\d+$/, '') === nm).length;
      if (n !== of) wrong.push(`the ${nm} entries count ${n} parts, the def has ${of}`);
    }
    const badges = panel.children.filter((c) => c.name.startsWith('part ')).map((g) => walk(g).find((c) => c.name === 'marker')!.absoluteBoundingBox!);
    const touching = badges.flatMap((b, i) => badges.slice(i + 1).filter((o) => overlapsBox(b, o)).map(() => i + 1));
    const inside = badges.every((b) => { const pb = panel.absoluteBoundingBox!; return b.x >= pb.x && b.y >= pb.y && b.x + b.width <= pb.x + pb.width && b.y + b.height <= pb.y + pb.height; });
    ok(nums.length > 0 && !wrong.length && !touching.length && inside && r.marked === nums.length && !r.misses.some((m) => m.startsWith('part ')),
      `markers/${label}: ${nums.length} numbers on ${specs.length} specimen(s), each on its part, no two markers touching, all inside the panel`,
      [...wrong, ...(touching.length ? [`markers ${touching.join(', ')} touch another`] : []), ...(inside ? [] : ['a marker outside the panel']), ...r.misses].slice(0, 4).join('; '));
  };
  for (const def of leads) {
    const p = page(`↳ m ${def.id}`);
    await check(def, fakeSet(p, def.id), p, def.id);
  }
  // A part in a slot inside a nested instance: list's items slot moved into an instance, as a shell component holds it.
  {
    const def = componentDefs.find((d) => d.id === 'list')!;
    const p = page('↳ m nested');
    const set = fakeSet(p, 'list');
    for (const m of set.children) {
      const slot = m.children.find((c) => c.name === 'items')!;
      const shell = mk('INSTANCE', 'shell', [], { _hug: true, layoutMode: 'VERTICAL', itemSpacing: 4, _w: 24, _h: 24 });
      m.appendChild!(shell);
      shell.appendChild!(slot);
    }
    await check(def, set, p, 'slot in a nested instance');
  }
  // More than one specimen: a part the default member does not show is marked on the member that does (Q3 A).
  {
    const q = page('↳ m tag');
    await check(componentDefs.find((d) => d.id === 'tag')!, fakeSet(q, 'tag'), q, 'tag across members');
    const specs = walk(panelsOn(q)[0]).filter((c) => c.name === 'specimen');
    ok(specs.length >= 3, `markers/extra specimens: Tag's parts take ${specs.length} specimens in its Anatomy and Theming`);
  }
}

/* ── family: one panel per page, the members' earlier panels replaced ──────────────────────────────────── */
section('family/… — one panel per taxonomy page, beside its lead; the members\' own panels go (#2927)');
{
  const p = page('↳ Checkbox');
  const control = fakeSet(p, 'checkbox-control', 0, 0, 300, 200);
  const row = fakeSet(p, 'checkbox-row', 1000, 0, 300, 200);
  const group = fakeSet(p, 'checkbox-group', 4000, 0, 300, 200);
  // Panels the members carried before one panel per family: tagged live, each with the print it was drawn with. The
  // control's is as drawn; the group's was edited by hand since.
  const legacy = (set: N, def: string, x: number, edited: boolean): N => {
    const f = mk('FRAME', `${def} usage`, [mk('TEXT', 'text')], { x, y: 0, _w: 560, _h: 300 });
    p.appendChild!(f);
    f.setSharedPluginData!('prism3', 'docPanel', JSON.stringify({ v: 1, def, set: set.id, state: 'live' }));
    return f;
  };
  const oldControl = legacy(control, 'checkbox-control', 340, false);
  const oldGroup = legacy(group, 'checkbox-group', 4340, true);
  oldControl.setSharedPluginData!('prism3', 'docPanelPrint', await fingerprintOf(oldControl as never));
  oldGroup.setSharedPluginData!('prism3', 'docPanelPrint', 'printed before a hand edit');
  const api = host([p]);
  const rowDef = componentDefs.find((d) => d.id === 'checkbox-row')!;
  const plan = planDocPanel(rowDef, { modes: ['light', 'dark'], names });
  const rc = await drawDocPanel(api, control, componentDefs.find((d) => d.id === 'checkbox-control')!, { names });
  ok(!rc.drawn && panelsOn(p).length === 2 && !oldControl.removed, 'family/member: drawing a member that does not lead draws nothing and removes nothing');
  ok(docPanelDue(api, row, plan) === 1, 'family/due: the lead\'s panel is due while a member\'s own panel is there');
  const r = await drawDocPanel(api, row, rowDef, { names });
  const live = panelsOn(p).filter((n) => tagOf(n).state === 'live');
  ok(r.drawn && live.length === 1 && tagOf(live[0]).def === 'checkbox-row' && tagOf(live[0]).set === row.id && tagOf(live[0]).family === 'Checkbox',
    `family/one panel: one live panel on the page, beside the Row, for the Checkbox page (${live.length})`);
  ok(oldControl.removed === true && r.replaced === 1, `family/replaced: the control's unedited panel is gone (replaced ${r.replaced})`);
  ok(!oldGroup.removed && tagOf(oldGroup).state === 'kept' && String(oldGroup.name).endsWith(' (edited)') && r.kept.length === 1, `family/kept: the group's edited panel is kept aside as "${oldGroup.name}"`);
  ok(docPanelDue(api, row, plan) === 0, 'family/current: not due once drawn');
  // Do and Don't merged over the family (Q2 A): the lead's first, each once; the count line counts the merged lists.
  const usage = (id: string) => { const u = docSections(componentDefs.find((d) => d.id === id)!).sections.find((x) => x.id === 'usage'); return u && u.id === 'usage' ? u : { do: [] as string[], dont: [] as string[] }; };
  const want = [...new Set(['checkbox-row', 'checkbox-control', 'checkbox-group'].flatMap((id) => usage(id).do.map((t) => t.replace(/`/g, '').replace(/\s+/g, ' ').trim())))];
  const dd = plan.sections.flatMap((x) => x.blocks).find((b) => b.type === 'Do-Dont');
  const shown = texts(live[0]);
  ok(!!dd && dd.type === 'Do-Dont' && dd.do.join('|') === want.slice(0, 4).join('|') && (want.length <= 4 || shown.some((t) => t.includes(`of ${want.length} Do items`))),
    `family/do: the first 4 of the family's ${want.length} Do items, the Row's first`);
  // Each item once, over families whose defs repeat lines (Buttons repeats 28 Do and 10 Don't lines across its four
  // defs; Icon button repeats 6). EXPECTED is typed here, read off the defs, not derived through the panel's own merge.
  const famBlocks = (id: string) => planDocPanel(componentDefs.find((d) => d.id === id)!, { modes: ['light', 'dark'], names }).sections.flatMap((x) => x.blocks);
  const countLine = (id: string) => famBlocks(id).flatMap((b) => b.type === 'Paragraph' && b.text.startsWith('Showing') ? [b.text] : []);
  ok(countLine('button').join('|') === "Showing 4 of 19 Do items and 4 of 9 Don't items.",
    `family/once: Buttons counts each repeated item once (${JSON.stringify(countLine('button'))})`);
  const ib = famBlocks('icon-button').find((b) => b.type === 'Do-Dont');
  ok(!countLine('icon-button').length && !!ib && ib.type === 'Do-Dont' && ib.do.length === 4 && ib.dont.length === 3 && new Set([...ib.do, ...ib.dont]).size === 7,
    `family/once: Icon button's family fits the panel once its repeats are merged (${JSON.stringify(countLine('icon-button'))})`);
}

/* ── print: what the panel shows of its set is not a hand edit ─────────────────────────────────────────── */
section('print/… — a set rebuilt under its panel does not make the panel read as edited (#2927 P0)');
{
  const def = componentDefs.find((d) => d.id === 'tag')!;
  const p = page('↳ Tag rebuilt');
  const set = fakeSet(p, 'tag');
  const api = host([p]);
  await drawDocPanel(api, set, def, { names });
  // The set rebuilt: every specimen now shows a new member, laid out differently, as Build and Update leave it.
  const rebuilt = planMember(planCache.get('tag')![0] as never);
  rebuilt.children[0].children.push(mk('FRAME', 'added in the rebuild', [], { _w: 40, _h: 40 }));
  for (const sp of walk(panelsOn(p)[0]).filter((c) => c.name === 'specimen')) { sp.children.splice(0); instanceOf(sp, rebuilt); sp.swapped = rebuilt.id; }
  const r = await drawDocPanel(api, set, def, { names });
  ok(r.replaced === 1 && !r.kept.length && panelsOn(p).length === 1, `print/rebuilt member: one panel, the earlier replaced, none kept aside (replaced ${r.replaced}, kept ${r.kept.length})`);
  // A designer's edit still reads as one.
  const line = walk(panelsOn(p)[0]).find((c) => c.type === 'TEXT' && c.name === 'text' && String(c.characters).length > 20)!;
  line.characters = 'Edited.';
  const r2 = await drawDocPanel(api, set, def, { names });
  ok(r2.kept.length === 1 && panelsOn(p).length === 2, 'print/edited: a changed line still keeps the panel aside');
  // A print recorded before this form is read the old way: a panel unchanged since is still replaced.
  const q = page('↳ Tag legacy');
  const qs = fakeSet(q, 'tag');
  const qa = host([q]);
  await drawDocPanel(qa, qs, def, { names });
  const old = panelsOn(q)[0];
  old.setSharedPluginData!('prism3', 'docPanelPrint', await fingerprintOf(old as never));
  const r3 = await drawDocPanel(qa, qs, def, { names });
  ok(r3.replaced === 1 && !r3.kept.length, 'print/legacy: a panel with a print in the old form, unchanged, is replaced');
}

/* ── replace and hand edit ─────────────────────────────────────────────────────────────────────────────── */
section('replace/… and hand edit/… — an unedited panel is replaced, an edited one kept');
{
  const def = componentDefs.find((d) => d.id === 'tag')!;
  const p = page('↳ Tag');
  const set = fakeSet(p, 'tag');
  const api = host([p]);
  await drawDocPanel(api, set, def, { names });
  const first = panelsOn(p)[0];
  const r2 = await drawDocPanel(api, set, def, { names });
  ok(r2.replaced === 1 && panelsOn(p).length === 1 && panelsOn(p)[0] !== first && first.removed === true, `replace/unedited: one panel, the earlier removed (replaced ${r2.replaced})`);

  // A designer rewrites a line in the Overview.
  const edited = panelsOn(p)[0];
  const line = walk(edited).find((c) => c.type === 'TEXT' && c.name === 'text' && String(c.characters).length > 20)!;
  line.characters = 'Our team uses tags for filters only.';
  const r3 = await drawDocPanel(api, set, def, { names });
  const now = panelsOn(p);
  const fresh = now.find((n) => tagOf(n).state === 'live');
  const kept = now.find((n) => tagOf(n).state === 'kept');
  ok(now.length === 2 && !!fresh && kept === edited && String(kept.name).endsWith(' (edited)') && texts(kept).includes('Our team uses tags for filters only.'),
    `hand edit/kept: the edited panel stays, renamed "${kept?.name}", its edit intact`);
  ok(!!fresh && !!kept && !overlap(fresh, kept) && Number(kept.y) >= Number(fresh.y) + Number(fresh.height), 'hand edit/aside: below the fresh panel, clear of it');
  const said = panelItems(r3).join(' ');
  ok(r3.kept.length === 1 && said.includes('edited by hand') && said.includes(String(kept?.name)), `hand edit/reported: "${said}"`);
  const r4 = await drawDocPanel(api, set, def, { names });
  ok(panelsOn(p).length === 2 && panelsOn(p).filter((n) => tagOf(n).state === 'kept').length === 1 && r4.kept.length === 0 && r4.replaced === 1, 'hand edit/once: a later draw replaces the fresh panel and leaves the kept one alone');
}

/* ── overlap: real sets, their labels, their panels ────────────────────────────────────────────────────── */
const plansOf = (id: string) => figmaAnatomySet(componentDefs.find((d) => d.id === id)!, { swapTarget: SWAP_TARGET });
/** Several sets built on `p` by ONE component host, as a file holds them, and that host (for an update). */
const buildAll = async (p: N, ids: readonly string[]) => {
  const all = ids.flatMap(plansOf);
  const api = makeShim({
    vars: [...new Set(all.flatMap((pl) => [...planBoundVars(pl.root), ...planPaintVars(pl.root)]))],
    styles: [...new Set(all.flatMap((pl) => planTextStyles(pl.root)))],
    effects: [...new Set(all.flatMap((pl) => planEffectStyles(pl.root)))],
    comps: [SWAP_TARGET, 'focus-ring', 'icon/close', 'icon/check'],
    page: p as unknown as { children: Node[] },
    liveRoot: true,
    identities: true,
  }) as Record<string, unknown>;
  const sets: N[] = [];
  for (const id of ids) {
    await applyComponentPlan(plansOf(id), api as never, { targetPage: p as never });
    sets.push(p.children.filter((c) => c.type === 'COMPONENT_SET').slice(-1)[0]);
  }
  return { api, sets };
};
const buildOn = async (p: N, id: string) => {
  const plans = plansOf(id);
  const api = makeShim({
    vars: [...new Set(plans.flatMap((pl) => [...planBoundVars(pl.root), ...planPaintVars(pl.root)]))],
    styles: [...new Set(plans.flatMap((pl) => planTextStyles(pl.root)))],
    effects: [...new Set(plans.flatMap((pl) => planEffectStyles(pl.root)))],
    comps: [SWAP_TARGET, 'focus-ring', 'icon/close', 'icon/check'],
    page: p as unknown as { children: Node[] },
    liveRoot: true,
    identities: true,
  }) as Record<string, unknown>;
  await applyComponentPlan(plans, api as never, { targetPage: p as never });
  const set = p.children.filter((c) => c.type === 'COMPONENT_SET').slice(-1)[0];
  // Each shim numbers its nodes from 1, and two of them share this page: the ids are made unique per set, as a file's are.
  for (const c of walk(set)) Object.defineProperty(c, 'id', { value: `${id}/${String(c.id)}`, configurable: true, writable: true });
  return { plans, set };
};
/** Labels as the furniture tests measure them: a Top label 37 high, a Left label 16 high, 7px a character. */
const label = (): N => { const t = mk('TEXT', 'text'); t.fontName = { family: 'Inter', style: 'Medium' }; const l = mk('INSTANCE', '_Label', [t], { _w: 60, _h: 37 }); l.layoutSizingHorizontal = 'HUG'; return l; };
const labelHost = (base: PanelApi & FurnitureApi): FurnitureApi => ({
  ...base,
  root: { findAllWithCriteria: (c: { types: string[] }) => [...base.root.findAllWithCriteria(c as never), mk('COMPONENT_SET', '_Label', [mk('COMPONENT', 'Text=Top, surface=default', [], { createInstance: label }), mk('COMPONENT', 'Text=Left, surface=default', [], { createInstance: label })])].filter((n) => c.types.includes(String((n as N).type))) },
} as FurnitureApi);
section('overlap/… — a panel lies on nothing');
{
  const p = page('↳ Badge and Tag');
  const api = host([p]);
  for (const id of ['badge', 'tag']) {
    const { plans, set } = await buildOn(p, id);
    // Placed as a build places a set: past everything already on the page.
    const others = p.children.filter((c) => c !== set);
    if (others.length) { set.x = Math.max(...others.map((c) => Number(c.x) + Number(c.width))) + 400; set.y = 0; }
    const f = await drawFurniture(labelHost(api), set as unknown as XNode, furnitureLayout(plans), id);
    const r = await drawDocPanel(api, set, componentDefs.find((d) => d.id === id)!, { names });
    withPanel(f, r);
    ok(r.drawn && f.panel === r, `overlap/${id} drawn beside its set (${r.sections.length} sections)`, r.skipped.join('; '));
    // Every listed number is drawn once, over the panel and outside its layout (#2916), on a set the shim built.
    const panel = panelsOn(p).slice(-1)[0];
    const got = panel.children.filter((c) => c.layoutPositioning === 'ABSOLUTE').map((m) => texts(m)[0]).sort((a, b) => Number(a) - Number(b));
    const want = listedNumbers(panel);
    ok(want.length > 0 && got.join() === want.join() && !r.misses.length, `anatomy/markers ${id}: markers ${got.join(', ')}, one per listed part`, `want ${want.join(', ')}; ${r.misses.join('; ')}`);
  }
  const panels = panelsOn(p);
  const clashes = panels.flatMap((pa) => p.children.filter((c) => c !== pa && overlap(pa, c)).map((c) => `${pa.name} on ${c.name}`));
  ok(panels.length === 2 && clashes.length === 0, `overlap/none: ${panels.length} panels, ${p.children.length} nodes on the page, no overlap`, clashes.join('; '));

  const q = page('↳ Blocked');
  const set = fakeSet(q, 'tag', 0, 0, 600, 400);
  q.appendChild!(mk('FRAME', 'Notes', [], { x: 700, y: 100, _w: 300, _h: 300 }));
  const r = await drawDocPanel(host([q]), set, componentDefs.find((d) => d.id === 'tag')!, { names });
  ok(!r.drawn && panelsOn(q).length === 0 && panelItems(r).join(' ') === 'No usage panel for tag: "Notes" sits right of the set, where the panel goes. Move it, then build or update again',
    `overlap/blocked: no panel drawn, and the run says to move the layer, not to Update, which never moves it: "${panelItems(r).join(' ')}"`);
  // A backdrop reaching into the panel's spot (#2902): the set's own, tagged as Prism3 draws it, never blocks; one a
  // designer placed, untagged, blocks as Notes does (Q172.5), and so does another set's.
  const bg = (on: N, s: N, tag: string | null): N => {
    const b = mk('RECTANGLE', 'inverse-bg', [], { x: -12, y: -12, _w: 700, _h: 424 });
    if (tag) b.setSharedPluginData!('prism3', 'furniture', JSON.stringify({ v: 1, def: tag, set: String(s.id), kind: 'backdrop' }));
    on.insertChild!(0, b);
    return b;
  };
  const tagDef = componentDefs.find((d) => d.id === 'tag')!;
  const own = page('↳ Own backdrop');
  const ownSet = fakeSet(own, 'tag', 0, 0, 600, 400);
  bg(own, ownSet, 'tag');
  const ro = await drawDocPanel(host([own]), ownSet, tagDef, { names });
  ok(ro.drawn && panelsOn(own).length === 1, `overlap/own backdrop: the set's own tagged backdrop reaches into the spot and the panel is still drawn`, ro.skipped.join('; '));
  const hand = page('↳ Hand backdrop');
  const handSet = fakeSet(hand, 'tag', 0, 0, 600, 400);
  bg(hand, handSet, null);
  const rh = await drawDocPanel(host([hand]), handSet, tagDef, { names });
  ok(!rh.drawn && panelItems(rh).join(' ') === 'No usage panel for tag: "inverse-bg" sits right of the set, where the panel goes. Move it, then build or update again',
    `overlap/hand backdrop: an untagged inverse-bg still blocks (Q172.5): "${panelItems(rh).join(' ')}"`);
  const other = page('↳ Other backdrop');
  const otherSet = fakeSet(other, 'tag', 0, 0, 600, 400);
  bg(other, fakeSet(other, 'badge', 0, 9000, 600, 400), 'badge');
  const rx = await drawDocPanel(host([other]), otherSet, tagDef, { names });
  ok(!rx.drawn && panelItems(rx).join(' ').includes('"inverse-bg" sits right'), `overlap/other backdrop: another set's tagged backdrop still blocks`, rx.skipped.join('; '));
  const ownPlan = planDocPanel(tagDef, { modes: ['light', 'dark'], names });
  ok(docPanelDue(host([hand]), handSet, ownPlan) === 0 && docPanelDue(host([own]), ownSet, ownPlan) === 0, 'due/backdrop: the dry run agrees with both draws');

  // The dry run's view of it: not due while Notes is there, so Update does not list it on every run; due once it moves.
  const plan = planDocPanel(componentDefs.find((d) => d.id === 'tag')!, { modes: ['light', 'dark'], names });
  ok(docPanelDue(host([q]), set, plan) === 0, 'due/blocked: a panel the draw found blocked is not due while the layer is still there');
  q.children.find((c) => c.name === 'Notes')!.x = 2000;
  ok(docPanelDue(host([q]), set, plan) === 1, 'due/unblocked: due again once the layer has moved');
  const r2 = await drawDocPanel(host([q]), set, componentDefs.find((d) => d.id === 'tag')!, { names });
  ok(r2.drawn && docPanelDue(host([q]), set, plan) === 0 && !String(q.getSharedPluginData!('prism3', 'docPanelBlocked')), 'due/drawn: drawn then, and the record is gone');
}

/* ── due: the dry run's check ──────────────────────────────────────────────────────────────────────────── */
section('due/… — the dry run reads the panel as the draw would draw it');
{
  const def = componentDefs.find((d) => d.id === 'divider')!;
  const p = page('↳ Divider');
  const set = fakeSet(p, 'divider');
  const api = host([p]);
  const plan = planDocPanel(def, { modes: ['light', 'dark'], names });
  ok(docPanelDue(api, set, plan) === 1, 'due/missing: a set with no panel is due');
  await drawDocPanel(api, set, def, { names });
  ok(docPanelDue(api, set, plan) === 0, 'due/current: not due once drawn');
  const changed = planDocPanel({ ...def, summary: `${def.summary} Revised.` }, { modes: ['light', 'dark'], names });
  ok(docPanelDue(api, set, changed) === 1, 'due/plan: due when the def\'s docs move');
  set.x = Number(set.x) + 50;
  ok(docPanelDue(api, set, plan) === 1, 'due/moved: due when the set moves');
  ok(docPanelDue(host([p], { template: false }), set, plan) === 0, 'due/no template: never due without _Doc-block');
}

/* ── room: the update spaces sets past the panel ───────────────────────────────────────────────────────── */
section('room/… — the update makes room for the panel, and a panel follows its set');
{
  const p = page('↳ Room');
  const a = await buildOn(p, 'badge');
  const b = await buildOn(p, 'divider');
  a.set.x = 0; a.set.y = 0;
  b.set.x = Number(a.set.width) + 400; b.set.y = 0;
  const found = [{ name: 'badge', set: a.set, blocked: false }, { name: 'divider', set: b.set, blocked: false }] as never;
  const withRoom = pageSetMoves(found, undefined, 600).get('divider');
  ok(withRoom?.to.x === Number(a.set.width) + 40 + 560 + 160, `room/with template: Divider moves to ${withRoom?.to.x}, 160 past Badge's panel`, `want ${Number(a.set.width) + 760}`);
  ok(pageSetMoves(found, undefined, 0).get('divider')?.to.x === Number(a.set.width) + 160,
    'room/without template: the old spacing closes to 160 from the frame, with no panel to clear');
  // #2927: a set that leads no family carries no panel, so the next set is spaced from its frame.
  const notLead = [{ name: 'badge', set: a.set, blocked: false, lead: false }, { name: 'divider', set: b.set, blocked: false }] as never;
  ok(pageSetMoves(notLead, undefined, 600).get('divider')?.to.x === Number(a.set.width) + 160,
    'room/not a lead: no room is made past a set that carries no panel');
}

/** Two sets on one page, Badge then Divider at the #2502 spacing (400 frame to frame), as a file built before the
 *  panels; Divider's panel drawn, Badge's blocked by Divider. And an update host over it, with `_Doc-block`. */
const roomPage = async (name: string, also?: (p: N, a: N) => void) => {
  const p = page(name);
  const { api, sets: [a, b] } = await buildAll(p, ['badge', 'divider']);
  a.x = 0; a.y = 0;
  b.x = Number(a.width) + 400; b.y = 0;
  also?.(p, a);
  const panels = host([p]);
  const uh = { ...api, root: { ...(api.root as object), findAllWithCriteria: (c: never) => labelHost(panels).root.findAllWithCriteria(c) } } as unknown as UpdateHost & PanelApi & FurnitureApi;
  // Drawn through the update host, so the blocked draw's record carries the plan the dry run reads.
  const rb = await drawDocPanel(uh, b, componentDefs.find((d) => d.id === 'divider')!, { names });
  const ra = await drawDocPanel(uh, a, componentDefs.find((d) => d.id === 'badge')!, { names });
  const doc = (id: string) => ({ def: componentDefs.find((d) => d.id === id)!, names });
  const targets: UpdateTarget[] = ['badge', 'divider'].map((id) => ({ def: id, plans: plansOf(id), doc: doc(id) }));
  const livePanel = (set: N) => panelsOn(p).find((n) => tagOf(n).state === 'live' && tagOf(n).set === set.id);
  return { p, a, b, ra, rb, uh, targets, livePanel };
};
{
  const { p, a, b, ra, rb, uh, targets, livePanel } = await roomPage('↳ Room apply');
  ok(rb.drawn && !ra.drawn && panelItems(ra).join(' ') === 'No usage panel for badge: "divider" sits right of the set, where the panel goes. Run Update to make room, then the panel is drawn',
    `overlap/blocked by a set: a Prism3 set later in the row is the one case the run sends to Update ("${panelItems(ra).join(' ')}")`);
  const pre = await previewUpdate(uh, targets);
  const pa = pre.sets.find((x) => x.set === 'badge'), pb = pre.sets.find((x) => x.set === 'divider');
  ok(!!JSON.parse(String(p.getSharedPluginData!('prism3', 'docPanelBlocked')) || '{}')[String(a.id)] && pb?.setMove?.to.x === Number(a.width) + 760 && pa?.furniture?.panels === 1,
    `due/update makes room: the dry run moves Divider to ${pb?.setMove?.to.x} and lists Badge's blocked panel as due, since the move clears it (${JSON.stringify(pa?.furniture)})`);
  // ONE UPDATE, as `main.ts` runs it: each set's furniture redrawn with its panel (`furnishUpdate` with the panel hook).
  const furnish = async (def: string) => { await furnishUpdate(uh, { outcomes: [{ def }] }, targets, (set, id) => drawDocPanel(uh, set as unknown as PNode, componentDefs.find((d) => d.id === id)!, { names })); };
  await applyUpdate(uh as never, uh as never, targets, previewHashOf(pre), { furnish });
  const pa2 = livePanel(a), pb2 = livePanel(b);
  const visibleLeft = Math.min(Number(b.x), ...p.children.filter((c) => { try { return JSON.parse(c.getSharedPluginData!('prism3', 'furniture') || 'null')?.set === b.id; } catch { return false; } }).map((c) => Number(c.x)));
  const clashes = panelsOn(p).flatMap((pa) => p.children.filter((c) => c !== pa && overlap(pa, c)).map((c) => `${pa.name} on ${c.name}`));
  ok(!!pa2 && !!pb2 && Number(pa2.x) === Number(a.x) + Number(a.width) + 40 && Math.round(visibleLeft - (Number(pa2.x) + Number(pa2.width))) === 160 && !clashes.length,
    `room/apply: ONE Update draws Badge's panel and spaces Divider 160 past it (${pa2 ? Math.round(visibleLeft - (Number(pa2.x) + Number(pa2.width))) : 'no panel'}), no panel on anything (${clashes.join('; ')})`);
  const next = await previewUpdate(uh, targets);
  ok(next.sets.every((x) => !x.setMove && !x.furniture), `room/settled: the next dry run lists no move and no panel (${JSON.stringify(next.sets.map((x) => [x.set, x.setMove ?? null, x.furniture ?? null]))})`);
}
{
  // No furniture redraw: the panel must move with its set, since nothing redraws it.
  const { a, b, uh, targets, livePanel } = await roomPage('↳ Room follow');
  await applyUpdate(uh as never, uh as never, targets, previewHashOf(await previewUpdate(uh, targets)));
  const pb2 = livePanel(b);
  ok(Number(b.x) === Number(a.width) + 760 && !!pb2 && Number(pb2.x) === Number(b.x) + Number(b.width) + 40 && Number(pb2.y) === Number(b.y),
    `room/panel follows: Divider moves to ${Number(b.x)}, ${Number(a.width) + 760} wanted, and its panel with it, to ${pb2?.x}`);
}

{
  // Two blockers: Divider, which the update moves, and a plain frame it does not. The draw would still be refused, so
  // the panel is not due (OWN2: `every` → `some` in `previewUpdate`'s post-move check lists it).
  const { rb, ra, uh, targets } = await roomPage('↳ Room mixed', (p, a) => p.appendChild!(mk('FRAME', 'Notes', [], { x: Number(a.width) + 100, y: 0, _w: 100, _h: 40 })));
  const pre = await previewUpdate(uh, targets);
  const pa = pre.sets.find((x) => x.set === 'badge'), pb = pre.sets.find((x) => x.set === 'divider');
  ok(rb.drawn && !ra.drawn && !!pb?.setMove && !pa?.furniture?.panels,
    `due/update leaves a blocker: Divider moves to ${pb?.setMove?.to.x}, but "Notes" stays in the way, so Badge's panel is not due (${JSON.stringify(pa?.furniture)})`);
}

/* ── orphan: a deleted set's panels before its def is built again ─────────────────────────────────────── */
section('orphan/… — a set deleted, its def built again');
{
  const def = componentDefs.find((d) => d.id === 'tag')!;
  const p = page('↳ Orphans');
  const api = host([p]);
  const one = fakeSet(p, 'tag', 0, 0);
  await drawDocPanel(api, one, def, { names });
  const two = fakeSet(p, 'tag', 0, 4000);
  await drawDocPanel(api, two, def, { names });
  const [plain, edited] = panelsOn(p);
  const line = walk(edited).find((c) => c.type === 'TEXT' && c.name === 'text' && String(c.characters).length > 20)!;
  line.characters = 'Our team uses tags for filters only.';
  one.remove!(); two.remove!();
  const n = await clearOrphanPanels(api, p, 'tag');
  ok(n === 1 && plain.removed === true && !edited.removed && panelsOn(p).length === 1 && texts(edited).includes('Our team uses tags for filters only.'),
    `orphan/edited kept: the unedited panel goes (${n}), the one a designer edited stays, its edit intact`);
}

/* ── seat: a new set is seated with room for its panel ─────────────────────────────────────────────────── */
section('seat/… — a new set is seated where its panel fits');
{
  const p = page('↳ Seat');
  p.appendChild!(mk('FRAME', '_section-header', [], { x: 0, y: -300, _w: 3000, _h: 200 }));
  fakeSet(p, 'badge', 0, 0, 600, 400);
  fakeSet(p, 'divider', 1400, 0, 600, 400);
  const set = fakeSet(p, 'tag', 760, 0, 300, 400);
  seatNewSet(set as unknown as XNode, 'tag', 600);
  const r = await drawDocPanel(host([p]), set, componentDefs.find((d) => d.id === 'tag')!, { names });
  ok(r.drawn && Number(set.x) === 2160, `seat/room for the panel: the set skips the gap its panel would not fit in, to ${set.x}, and its panel is drawn (${r.skipped.join('; ')})`);
}

/* ── template: `_Doc-block` as Set up file builds it ───────────────────────────────────────────────────── */
section('template/… — `_Doc-block`');
{
  const made: N[] = [];
  const memberSet = (name: string, member: string, text: string) => mk('COMPONENT_SET', name, [mk('COMPONENT', member, [], { createInstance: () => { const i = prism3Instance(text); i.main = name; return i; } })]);
  const libs = [memberSet('badge', 'type=count, emphasis=bold, tone=neutral', 'count'), memberSet('tag', 'type=select, selection=unselected, size=small, state=rest', 'label'), memberSet('list-item', 'type=unordered, size=small', LIST_ITEM_TEXT), memberSet('divider', 'orientation=horizontal, inset=none', 'rule')];
  const props: { name: string; type: string; value: unknown }[] = [];
  // The host's rule (#2902): a node is FILL only inside an auto-layout parent, so FILL set before the append throws.
  const fillRule = (n: N): N => {
    let v: unknown;
    Object.defineProperty(n, 'layoutSizingHorizontal', {
      get: () => v, enumerable: true,
      set: (x: unknown) => { if (x === 'FILL' && !(n.parent as N | undefined)?.layoutMode) throw new Error(`${String(n.name)}: FILL outside an auto-layout parent`); v = x; },
    });
    return n;
  };
  const api = (sets: N[], themed: boolean) => ({
    root: { findAllWithCriteria: () => sets },
    createComponent: () => { const c = mk('COMPONENT', 'Component'); made.push(c); return c; },
    createFrame: () => fillRule(mk('FRAME', 'Frame')),
    createText: () => { const t = fillRule(mk('TEXT', 'Text')); t.setTextStyleIdAsync = async (id: string) => { t.textStyleId = id; }; return t; },
    loadFontAsync: async () => {},
    combineAsVariants: (nodes: N[], parent: N) => { const s = mk('COMPONENT_SET', 'Set', nodes); parent.appendChild!(s); s.addComponentProperty = (name: string, type: string, value: unknown) => { props.push({ name, type, value }); return `${name}#${props.length}`; }; return s; },
    getLocalTextStylesAsync: async () => ['title/xs/strong', 'title/sm/strong', 'title/md/strong', 'body/xs/default', 'body/sm/default', 'body/md/default', 'body/lg/default', 'label/sm/emphasis', 'label/md/emphasis', 'label/lg/emphasis'].map((n, i) => ({ id: `S:${i}`, name: n, fontName: { family: 'Inter', style: 'Regular' } })),
    variables: { getLocalVariablesAsync: async () => (themed ? VARS : []), setBoundVariableForPaint: (p: object, _f: string, v: { id: string }) => ({ ...p, boundVariables: { color: { id: v.id } } }) },
  }) as unknown as DocBlockApi;
  const empty = page('↳ File Components');
  const none = await ensureDocBlock(api([], false), empty as never);
  ok(none.status === 'skipped' && ['badge', 'tag', 'list-item', 'divider', 'theme'].every((m) => none.missing.includes(m)) && !empty.children.length,
    `template/needs: nothing built, missing ${none.missing.join(', ')}`);
  const fc = page('↳ File Components');
  const r = await ensureDocBlock(api(libs, true), fc as never);
  const set = fc.children.find((c) => c.type === 'COMPONENT_SET');
  const variants = (set?.children ?? []).map((c) => String(c.name));
  const want = TYPES.flatMap((t) => SIZES.map((s) => `Type=${t}, Size=${s}`));
  ok(r.status === 'built' && set?.name === '_Doc-block' && variants.join('|') === want.join('|'), `template/variants: ${variants.length} variants, Type × Size`);
  ok(['Top padding:BOOLEAN', 'Bottom padding:BOOLEAN', 'Caption:BOOLEAN', 'Specimen:INSTANCE_SWAP'].every((x) => props.some((p) => `${p.name}:${p.type}` === x)), `template/properties: ${props.map((p) => `${p.name} (${p.type})`).join(', ')}`);
  for (const t of TYPES) {
    const v = set?.children.find((c) => c.name === `Type=${t}, Size=sm`);
    const layers = new Set(v ? walk(v).map((c) => String(c.name)) : []);
    const lacking = LAYERS[t].filter((l) => !layers.has(l));
    ok(!!v && !lacking.length, `template/${t}: layers ${LAYERS[t].join(', ')}`, `missing ${lacking.join(', ')}`);
  }
  const nested = (t: string) => walk(set!.children.find((c) => c.name === `Type=${t}, Size=sm`)!).filter((c) => c.type === 'INSTANCE').map((c) => String(c.main ?? ''));
  ok(nested('Part-marker').includes('badge') && nested('Chips').filter((m) => m === 'tag').length === 16 && nested('Do-Dont').filter((m) => m === 'list-item').length === 8 && nested('Divider').includes('divider'),
    'template/prism3: Badge, Tag, List.Item and Divider instances');
  // The template's own text, not the nested components' (they bind their own).
  const own = (n: N): N[] => [n, ...(n.type === 'INSTANCE' ? [] : n.children.flatMap(own))];
  const ownTexts = own(set!).filter((c) => c.type === 'TEXT');
  const unbound = ownTexts.filter((c) => !(c.fills as { boundVariables?: unknown }[])[0]?.boundVariables || !c.textStyleId);
  ok(ownTexts.length >= 24 && !unbound.length, `template/tokens: each of ${ownTexts.length} texts binds a color variable and takes a text style`, unbound.slice(0, 3).map((c) => String(c.name)).join(', '));
  const rules = own(set!).filter((c) => c.name === 'rule' || c.name === 'stage');
  ok(rules.length && rules.every((c) => (c.fills as { boundVariables?: unknown }[])[0]?.boundVariables), `template/tokens: the Do / Don't rules and the specimen stage bind theirs (${rules.length})`);
  // The layers that fill the block's width (#2902), written out here, and Field's label, which grows to its text.
  const FILLS: Record<string, string[]> = { Field: ['row'], 'Do-Dont': ['columns'], Chips: ['chips'] };
  const notFilled = (): string[] => (set?.children ?? []).flatMap((v) => {
    const t = String(v.name).replace(/^Type=([^,]+),.*$/, '$1');
    const bad = ['top-padding', 'bottom-padding', ...(FILLS[t] ?? [])].filter((l) => v.children.find((c) => c.name === l)?.layoutSizingHorizontal !== 'FILL').map((l) => `${String(v.name)} ${l}`);
    const label = t === 'Field' ? v.children.find((c) => c.name === 'row')?.children.find((c) => c.name === 'label') : undefined;
    return [...bad, ...(t === 'Field' && (label?.textAutoResize !== 'HEIGHT' || label?.width !== 120) ? [`${String(v.name)} label (${String(label?.textAutoResize)}, ${String(label?.width)})`] : [])];
  });
  const built = notFilled();
  ok(!built.length, 'template/fill: the padding spacers, Field\'s row, Do-Dont\'s columns and Chips\' chips FILL the block in every variant, and Field\'s label grows to its text at the label column', built.slice(0, 4).join('; '));
  const ids = (set?.children ?? []).map((c) => c.id).join('|');
  // A set built before #2902: those layers at their old sizing, the label at a fixed 1px.
  for (const v of set?.children ?? []) for (const c of v.children) {
    if (['top-padding', 'bottom-padding'].includes(String(c.name))) c.layoutSizingHorizontal = 'FIXED';
    if (['row', 'columns', 'chips'].includes(String(c.name))) c.layoutSizingHorizontal = 'HUG';
    const label = c.name === 'row' ? c.children.find((k) => k.name === 'label') : undefined;
    if (label) label.textAutoResize = 'NONE';
  }
  // And hand edits the repair must leave alone: a fill and a vertical sizing on each layer it repairs, and a decoy `row`
  // and `columns` inside a nested List.Item instance, which is that component's, not the block's.
  const HAND = [{ type: 'SOLID', hand: true }];
  const handEdited: N[] = [];
  for (const v of set?.children ?? []) for (const c of v.children) {
    if (![...['top-padding', 'bottom-padding'], 'row', 'columns', 'chips'].includes(String(c.name))) continue;
    c.fills = HAND; c.layoutSizingVertical = 'FIXED'; handEdited.push(c);
  }
  const nestedItem = walk(set!).find((c) => c.type === 'INSTANCE' && c.main === 'list-item')!;
  const decoys = ['row', 'columns'].map((name) => { const d = mk('FRAME', name, [], { layoutSizingHorizontal: 'HUG' }); nestedItem.appendChild!(d); return d; });
  const again = await ensureDocBlock(api(libs, true), fc as never);
  ok(again.status === 'present' && fc.children.filter((c) => c.type === 'COMPONENT_SET').length === 1, 'template/idempotent: a second run builds nothing');
  const repaired = notFilled();
  ok(!repaired.length && (again.repaired ?? 0) > 0 && fc.children.find((c) => c.type === 'COMPONENT_SET') === set && (set?.children ?? []).map((c) => c.id).join('|') === ids,
    `template/repair: a set built before the fix is brought up to date in place, the same set and members (${again.repaired} layers)`, repaired.slice(0, 4).join('; '));
  const touched = handEdited.filter((c) => c.fills !== HAND || c.layoutSizingVertical !== 'FIXED').map((c) => `${String((c.parent as N).name)} ${String(c.name)}`);
  ok(handEdited.length >= 48 && !touched.length, `template/repair leaves hand edits: the fill and vertical sizing on all ${handEdited.length} repaired layers survive`, touched.slice(0, 3).join('; '));
  ok(decoys.every((d) => d.layoutSizingHorizontal === 'HUG'), 'template/repair stays out of nested instances: a "row" and a "columns" inside List.Item are untouched');
  const third = await ensureDocBlock(api(libs, true), fc as never);
  ok(third.status === 'present' && third.repaired === 0, `template/repair idempotent: a set already right is left as it is (${third.repaired})`);
}

/* ── line: the missing template, once ──────────────────────────────────────────────────────────────────── */
section('line/… — a file without `_Doc-block`');
{
  const p = page('↳ No template');
  const outs = [];
  for (const id of ['badge', 'tag']) {
    const set = fakeSet(p, id, outs.length * 2000);
    const r = await drawDocPanel(host([p], { template: false }), set, componentDefs.find((d) => d.id === id)!, { names });
    outs.push(withPanel({ def: id, parent: p.name as string, columns: 0, rows: 0, backdrops: 0, scrims: 0, cleared: 0, skipped: [], fontMisses: [] }, r));
  }
  const line = templatesLine(outs, 'build');
  ok(panelsOn(p).length === 0 && line === 'No usage panels drawn: this file has no _Doc-block component. Run Set up file, then build again', `line/once: "${line}"`);
}

if (failed) { console.error(`\n✗ ${failed} doc panel check(s) failed`); process.exit(1); }
console.log('\n✓ doc panel: every check passed');
