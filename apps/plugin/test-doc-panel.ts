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
 *                   `due/blocked`; the post-move check dropped from `previewUpdate` → `due/update makes room`.
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
 *                   layers, and the Prism3 components it nests.
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
import { clearOrphanPanels, drawDocPanel, docPanelDue, planDocPanel, panelItems, type PanelApi, type PNode } from './src/doc-panel';
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
const TYPES = ['Heading', 'Paragraph', 'Field', 'Do-Dont', 'Specimen', 'Part-marker', 'Chips', 'Divider'];
const SIZES = ['sm', 'md', 'lg'];

/* ── a host: nodes with parents, a simple auto layout, plugin data ─────────────────────────────────────── */
type N = PNode & Record<string, unknown> & { children: N[] };
let seq = 0;
const TEXT_LINE = 16;
const mk = (type: string, name: string, children: N[] = [], extra: Record<string, unknown> = {}): N => {
  const data = new Map<string, string>();
  const n = {
    id: `${type[0]}:${++seq}`, type, name, x: 0, y: 0, visible: true, children: [] as N[], fills: [], strokes: [],
    _w: type === 'TEXT' ? 200 : 100, _h: type === 'TEXT' ? TEXT_LINE : 0,
    get width(): number { return (this as N)._w as number; },
    get height(): number {
      const self = this as unknown as N;
      if (self.type === 'TEXT') return Math.max(1, Math.ceil(String(self.characters ?? '').length / 60)) * TEXT_LINE;
      const kids = self.children.filter((c) => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
      if (!self.layoutMode || !kids.length) return self._h as number;
      const pad = Number(self.paddingTop ?? 0) + Number(self.paddingBottom ?? 0);
      const gap = Number(self.itemSpacing ?? 0);
      return pad + (self.layoutMode === 'VERTICAL' ? kids.reduce((a, c) => a + (c.height ?? 0), 0) + gap * (kids.length - 1) : Math.max(...kids.map((c) => c.height ?? 0)));
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
      : type === 'Do-Dont' ? [mk('FRAME', 'columns', ['do', 'dont'].map((c) => mk('FRAME', c, [mk('FRAME', 'rule'), t('heading'), ...[1, 2, 3, 4].map((k) => { const it = prism3Instance('text'); it.name = `item${k}`; return it; })], { layoutMode: 'VERTICAL', itemSpacing: 8 })), { layoutMode: 'HORIZONTAL' })]
        : type === 'Specimen' ? [mk('FRAME', 'stage', [mk('INSTANCE', 'specimen', [], { _h: 40 })], { layoutMode: 'VERTICAL', paddingTop: 24, paddingBottom: 24 }), t('caption')]
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
        // The swap: the specimen becomes an instance of the member, with the member's layers.
        const sp = walk(i).find((c) => c.name === 'specimen')!;
        // A member built by the component shim: its own layers, by name, as an instance of it holds them.
        const built = livePages.flatMap((pg) => pg.children.flatMap(walk)).find((c) => c.id === v);
        const member = members.get(String(v)) ?? (built ? { layers: walk(built).slice(1).map((c) => String(c.name)) } : undefined);
        sp.children.splice(0);
        if (member) for (const c of member.layers) sp.appendChild!(mk('FRAME', c, [], { x: 10, y: 10, _h: 0 }));
        sp.swapped = v;
      }
    }
  };
  i.setExplicitVariableModeForCollection = (_c: unknown, modeId: string) => { i.pinned = modeId; };
  return i;
};
/** The members a specimen can be swapped to, by id: the layer names the member holds. */
const members = new Map<string, { layers: string[] }>();
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
/** A set on `p` at (x, y), w × h, whose default member holds `layers`. */
const fakeSet = (p: N, def: string, x = 0, y = 0, w = 600, h = 400, layers: string[] = Object.keys(componentDefs.find((d) => d.id === def)?.anatomy?.parts ?? {})): N => {
  const m = mk('COMPONENT', 'default');
  members.set(String(m.id), { layers });
  const s = mk('COMPONENT_SET', def, [m], { x, y, _w: w, _h: h });
  p.appendChild!(s);
  return s;
};
const panelsOn = (p: N): N[] => p.children.filter((c) => c.getSharedPluginData!('prism3', 'docPanel'));
const tagOf = (n: N) => JSON.parse(n.getSharedPluginData!('prism3', 'docPanel')) as { def: string; set: string; state: string };
const drawnSections = (panel: N): string[] => walk(panel).map((c) => c.getSharedPluginData!('prism3', 'docSection')).filter(Boolean);
const boxOf = (n: N) => ({ x: Number(n.x), y: Number(n.y), w: Number(n.width), h: Number(n.height) });
const overlap = (a: N, b: N): boolean => { const p = boxOf(a), q = boxOf(b); return p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h; };
const names = (id: string) => componentDefs.find((d) => d.id === id)?.name ?? id;
const withSets = componentDefs.filter((d) => CANVAS_FURNITURE.has(d.id));

/* ── present: a panel per set, and its sections are the model's ────────────────────────────────────────── */
section('present/… — every def that builds a set gets one panel, with the model\'s sections');
ok(withSets.length >= 40, `present/coverage: ${withSets.length} defs build a set`);
for (const def of withSets) {
  const p = page(`↳ ${def.id}`);
  const set = fakeSet(p, def.id);
  const r = await drawDocPanel(host([p]), set, def, { names });
  const panels = panelsOn(p);
  const want = docSections(def, { modes: ['light', 'dark'] }).sections.map((s) => s.id).filter((id) => !SITE_ONLY.includes(id));
  const got = panels[0] ? drawnSections(panels[0]) : [];
  ok(r.drawn && panels.length === 1 && tagOf(panels[0]).def === def.id && tagOf(panels[0]).set === set.id && got.join() === want.join(),
    `present/${def.id}: one panel, sections ${got.join(', ')}`, `want [${want.join(', ')}], got ${panels.length} panel(s) [${got.join(', ')}] ${r.skipped.join('; ')}`);
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
  const swapped = walk(panelsOn(p)[0]).filter((c) => c.name === 'specimen' && c.swapped);
  ok(swapped.length === 3 && swapped.every((c) => c.swapped === set.children[0].id), `present/specimen: the Anatomy and both Theming specimens show the set's default member (${swapped.length})`);
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
  for (const def of withSets) {
    const p = page(`↳ a ${def.id}`);
    await drawDocPanel(host([p]), fakeSet(p, def.id), def, { names });
    const all = texts(panelsOn(p)[0]).join('\n');
    for (const [id, part] of Object.entries(def.anatomy?.parts ?? {})) {
      if (!part.note?.trim()) continue;
      const first = part.note.replace(/`/g, '').replace(/\s+/g, ' ').trim().split(/(?<=[.)])\s+(?=[A-Z"(])/)[0];
      if (MAINTAINER_REGISTER.test(part.note) || NAMES_A_TOOL.test(part.note)) { heldBack++; if (all.includes(first)) leaks.push(`${def.id}.${id}`); }
      else { shown++; if (!all.includes(first)) leaks.push(`${def.id}.${id} (missing)`); }
    }
  }
  ok(heldBack >= 60 && !leaks.some((l) => !l.endsWith('(missing)')), `anatomy/held back: none of ${heldBack} held-back notes is in a panel`, leaks.filter((l) => !l.endsWith('(missing)')).slice(0, 5).join(', '));
  ok(shown >= 100 && !leaks.some((l) => l.endsWith('(missing)')), `anatomy/captions: all ${shown} reader-ready captions are`, leaks.filter((l) => l.endsWith('(missing)')).slice(0, 5).join(', '));
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
    // Each part the built member names as a layer gets its number, over the panel and outside its layout.
    const marks = panelsOn(p).slice(-1)[0].children.filter((c) => c.layoutPositioning === 'ABSOLUTE');
    const parts = docSections(componentDefs.find((d) => d.id === id)!).sections.find((s) => s.id === 'anatomy');
    // Each marker carries its part's number in the list: the part's place among all the listed parts, not among the marked.
    const want = parts && parts.id === 'anatomy' ? parts.parts.map((pt, k) => (walk(set.children[0]).slice(1).some((c) => c.name === pt.id) ? String(k + 1) : '')).filter(Boolean) : [];
    const got = marks.map((m) => texts(m)[0]);
    ok(want.length > 0 && got.join() === want.join(), `anatomy/markers ${id}: markers ${got.join(', ')} on the parts its member names as layers`, `want ${want.join(', ')}`);
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
}

/** Two sets on one page, Badge then Divider at the #2502 spacing (400 frame to frame), as a file built before the
 *  panels; Divider's panel drawn, Badge's blocked by Divider. And an update host over it, with `_Doc-block`. */
const roomPage = async (name: string) => {
  const p = page(name);
  const { api, sets: [a, b] } = await buildAll(p, ['badge', 'divider']);
  a.x = 0; a.y = 0;
  b.x = Number(a.width) + 400; b.y = 0;
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
  const libs = [memberSet('badge', 'type=count, emphasis=bold, tone=neutral', 'count'), memberSet('tag', 'type=select, selection=unselected, size=small, state=rest', 'label'), memberSet('list-item', 'type=unordered, size=small', 'text'), memberSet('divider', 'orientation=horizontal, inset=none', 'rule')];
  const props: { name: string; type: string; value: unknown }[] = [];
  const api = (sets: N[], themed: boolean) => ({
    root: { findAllWithCriteria: () => sets },
    createComponent: () => { const c = mk('COMPONENT', 'Component'); made.push(c); return c; },
    createFrame: () => mk('FRAME', 'Frame'),
    createText: () => { const t = mk('TEXT', 'Text'); t.setTextStyleIdAsync = async (id: string) => { t.textStyleId = id; }; return t; },
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
  const again = await ensureDocBlock(api(libs, true), fc as never);
  ok(again.status === 'present' && fc.children.filter((c) => c.type === 'COMPONENT_SET').length === 1, 'template/idempotent: a second run builds nothing');
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
