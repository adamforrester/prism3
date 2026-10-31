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
 *   legacy/…        a panel printed the old way, before `printView`, its set rebuilt since (#2968): Tag's panel and the
 *                   Buttons page (the lead's panel and the three members' own) are replaced, one panel per page and no
 *                   "(edited)" one; a line rewritten on an old-print panel (Tag's, or Button.Neutral's) still keeps that
 *                   panel aside. Mutations: an old print compared whole again → `legacy/rebuilt`, `legacy/family lead`,
 *                   `legacy/family members`, `legacy/family edited`; the text check dropped → `legacy/edited`,
 *                   `legacy/family edited`, `family/kept`.
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
 *   qa/…            owner QA round 1 (#2970), on Tag with Badge's and Button's sets in the file: the title 18px at −4% and
 *                   every section title 16px at −3%; the Do and Don't block's Top padding on; Related as one bulleted line
 *                   per name, the names whose set is in the file linked to it by node and underlined, every other plain;
 *                   a set built after the draw makes the panel due, and the redraw links it. Mutations: the links key
 *                   dropped from `docPanelDue` → `qa/links due`; the hyperlink call dropped → `qa/related links`.
 *   width/…         #2970 items 1 and 4 (Q1 A, Q2 A): Banner and Checkbox.Row, each specimen at its member's width (480,
 *                   320, typed here), inside its stage, no text narrower than its longest word; Theming stacked for
 *                   Banner, side by side for the Row; a member built wider makes the panel due, the redraw is wider by
 *                   as much and a live spec panel moves to stay 40 past it; the dry run moves the next set 160 past the
 *                   spec column beside the panel as drawn, and nothing after the draw; `markers/widths`: every lead's
 *                   panel is drawn as wide as Update spaces it for. `width/hug` shows the host squeezing a hugging
 *                   instance, the failure the fix guards. Mutations: the width forced to 560 → `width/checkbox-row`,
 *                   `width/room`, `width/seat`, `markers/widths`; the specimen not sized to its member →
 *                   `width/banner`, `width/checkbox-row`.
 *   collapse/…      (#3205) every lead's examples, in this host: none narrower than the width its member is built at
 *                   (`placementWidth`) or its literal floor (`minWidth`), read off the projection's root kept on each member,
 *                   and no wrapping text box under 4em that does not hold its text on one line. `collapse/hug read`: Dialog's
 *                   members read as hugging, its examples still 560 (typed). `update/redraw in place`: Dialog built by the
 *                   executor, its panel aged to the earlier format with its examples collapsed, is due, and one Update
 *                   redraws it where it was, not "(edited)". `collapse/after reset` (#3211): every lead built at a width,
 *                   its specimens set back to hug after drawing, still none under its width. The host applies `minWidth`
 *                   as Figma does, and an instance inherits its main's. Mutations: the specimen left hugging →
 *                   `collapse/dialog` and every `collapse/<def>` built at a width, `collapse/hug read`, `update/redraw
 *                   in place`; the def's width ignored (the member's reported sizing alone) → `collapse/hug read`;
 *                   `PANEL_FORMAT` not raised → `update/redraw in place`; the specimen's `minWidth` never set →
 *                   `collapse/after reset`.
 *   markers/…       (#2916) each leader's tip lies inside its part's box, at the part's middle, and each bracket runs
 *                   exactly its part's height with both ticks ending inside it; Breadcrumbs' six entries (the `items`
 *                   slot's among them) on two specimens, pinned by hand in `marks/breadcrumbs`. Mutations: a slot
 *                   part's marker placed against its slot → `markers/breadcrumbs`; marker 1 dropped →
 *                   `markers/breadcrumbs numbers` and every `markers/<def>`.
 *   family/related  (#2970 Q5 A) Checkbox's and Buttons' Related lists typed from the approved wireframe; a family named
 *                   twice in one list once. Mutations: the own-family drop removed → `family/related`, `family/related
 *                   buttons`; the de-duplication removed → `family/related once`.
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
import { anatomyMarks, clearOrphanPanels, docPanelReach, docPanelReaches, drawDocPanel, docPanelDue, leadsPanel, planDocPanel, panelItems, type PanelApi, type PNode } from './src/doc-panel';
import { TAXONOMY } from './src/file-taxonomy';
import { readSpecTag } from './src/spec-tag';
import { fingerprintOf } from './src/style-guide';
import { ensureDocBlock, type DocBlockApi } from './src/doc-block';
import { drawFurniture, furnishUpdate, furnitureLayout, seatNewSet, templatesLine, withPanel, type FurnitureApi, type XNode } from './src/canvas-furniture';
import { pageSetMoves, previewUpdate, type UpdateHost, type UpdateTarget } from './src/update-plan';
import { applyUpdate, previewHashOf } from './src/update-apply';
import { COLOR_COLUMNS, COLOR_GAP, clearOrphanSpecPanels, drawSpecPanel, hexFor, planSpecPanel, specItems, type SpecApi } from './src/spec-panel';

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
/** THE FONT, measured apart from the subject (#2830 Q2830.8): Inter 400 at 14px (the default brand's body/sm), each
 *  character's advance in px, read in Chromium with canvas `measureText` on 2026-10-25. Over all 174 variables the spec
 *  panels name, the sum of advances runs at most 0.91px under the measured run (kerning), so a run's width is its sum
 *  plus 1. A text set to `WIDTH_AND_HEIGHT` takes this width, scaled to its font size, as Figma lays one out. */
const INTER_14: Record<string, number> = {"0":8.83,"1":5.69,"2":8.54,"3":8.65,"4":9.04,"5":8.51,"6":8.68,"7":7.92,"8":8.66,"9":8.68," ":3.94,"!":4.03,"\"":6.52,"#":8.87,"$":8.98,"%":13.75,"&":9.02,"'":4.2,"(":5.11,")":5.11,"*":7.01,"+":9.26,",":4.03,"-":6.44,".":4.03,"/":5.04,":":4.03,";":4.22,"<":9.26,"=":9.26,">":9.26,"?":7.16,"@":13.52,"A":9.66,"B":9.16,"C":10.23,"D":10.1,"E":8.41,"F":8.27,"G":10.45,"H":10.4,"I":3.76,"J":7.99,"K":9.41,"L":7.92,"M":12.65,"N":10.55,"O":10.71,"P":8.94,"Q":10.71,"R":9.01,"S":8.98,"T":9.04,"U":10.42,"V":9.66,"W":13.79,"X":9.55,"Y":9.5,"Z":8.8,"[":5.11,"\\":5.04,"]":5.11,"^":6.6,"_":6.38,"`":4.52,"a":7.86,"b":8.57,"c":8,"d":8.57,"e":8.16,"f":5.18,"g":8.59,"h":8.28,"i":3.39,"j":3.39,"k":7.68,"l":3.39,"m":12.26,"n":8.27,"o":8.39,"p":8.57,"q":8.57,"r":5.27,"s":7.39,"t":4.58,"u":8.28,"v":7.87,"w":11.46,"x":7.64,"y":7.87,"z":7.73,"{":5.97,"|":4.66,"}":5.97,"~":9.26,"→":13.36,"·":4.03};
const runWidth = (text: string, size = 14): number => Math.ceil(([...text].reduce((a, ch) => a + (INTER_14[ch] ?? 14), 0) + 1) * size / 14);
const mk = (type: string, name: string, children: N[] = [], extra: Record<string, unknown> = {}): N => {
  const data = new Map<string, string>();
  const n = {
    id: `${type[0]}:${++seq}`, type, name, x: 0, y: 0, visible: true, children: [] as N[], fills: [], strokes: [], _mk: true,
    _w: type === 'TEXT' ? 200 : 100, _h: type === 'TEXT' ? TEXT_LINE : 0,
    /** A FLOOR (#3205): an auto-layout frame never goes under its `minWidth`, as Figma lays one out. */
    get width(): number {
      const self = this as unknown as N;
      const w = rawWidth(self);
      return typeof self.minWidth === 'number' ? Math.max(w, self.minWidth) : w;
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
  if (type === 'TEXT') {
    n.fontName = { family: 'Inter', style: 'Regular' }; n.characters = n.characters ?? name;
    // The range calls Related's lists make (#2970), recorded as the host would hold them; a range past the text throws.
    const range = (s0: number, e0: number, what: string) => { if (s0 < 0 || e0 > String(n.characters).length || s0 >= e0) throw new Error(`in ${what}: range ${s0}–${e0} outside the text`); };
    n._links = []; n._lists = []; n._decos = [];
    n.setRangeHyperlink = (s0: number, e0: number, l: unknown) => { range(s0, e0, 'setRangeHyperlink'); (n._links as unknown[]).push({ text: String(n.characters).slice(s0, e0), link: l }); };
    n.setRangeListOptions = (s0: number, e0: number, o: unknown) => { range(s0, e0, 'setRangeListOptions'); (n._lists as unknown[]).push({ s: s0, e: e0, o }); };
    n.setRangeTextDecoration = (s0: number, e0: number, d: unknown) => { range(s0, e0, 'setRangeTextDecoration'); (n._decos as unknown[]).push({ text: String(n.characters).slice(s0, e0), d }); };
  }
  return n;
};
/** A node's width before its floor: the host's own layout, written here, never read off the panel. */
function rawWidth(self: N): number {
  if (self.type === 'TEXT' && self.textAutoResize === 'WIDTH_AND_HEIGHT') return runWidth(String(self.characters ?? ''), typeof self.fontSize === 'number' ? self.fontSize : 14);
  const p = self.parent as N | undefined;
  // FILL across a vertical parent: its width less its padding. A `_hug` frame hugs its children, as a specimen does.
  if (self.layoutSizingHorizontal === 'FILL' && p?._mk && p.layoutMode === 'VERTICAL') return p.width! - Number(p.paddingLeft ?? 0) - Number(p.paddingRight ?? 0);
  // A MEMBER'S STRETCHED LAYER (#2970): one that grows along a horizontal parent or stretches across a vertical one
  // takes the room its parent gives it. In a parent that hugs, there is none: it shrinks to its narrowest, a text to
  // one letter, as Banner's did in a specimen that hugged.
  if (p?._mk && stretched(self)) {
    // A parent that hugs gives no room, unless it has a floor (#3205): then it is that floor wide, or its content's
    // narrowest when that is wider, and the layer takes its share of it.
    let pw: number;
    if (hugs(p)) { if (typeof p.minWidth !== 'number') return narrowest(self); pw = Math.max(p.minWidth, narrowest(p)); }
    else pw = p.width!;
    const inner = pw - Number(p.paddingLeft ?? 0) - Number(p.paddingRight ?? 0);
    if (p.layoutMode === 'VERTICAL') return inner;
    const kids = flow(p), grown = kids.filter(stretched);
    return Math.max(0, (inner - kids.filter((c) => !stretched(c)).reduce((a, c) => a + c.width!, 0) - Number(p.itemSpacing ?? 0) * (kids.length - 1)) / grown.length);
  }
  if (self.layoutSizingHorizontal === 'FIXED' && self._hug) return self._w as number;
  const kids = flow(self);
  if (!self._hug || !self.layoutMode || !kids.length) return self._w as number;
  const pad = Number(self.paddingLeft ?? 0) + Number(self.paddingRight ?? 0);
  return pad + (self.layoutMode === 'HORIZONTAL' ? kids.reduce((a, c) => a + c.width!, 0) + Number(self.itemSpacing ?? 0) * (kids.length - 1) : Math.max(...kids.map((c) => c.width!)));
}
/** The children an auto-layout frame lays out: shown and not absolute. */
const flow = (n: N): N[] => n.children.filter((c) => c.visible !== false && c.layoutPositioning !== 'ABSOLUTE');
/** A member's layer that takes its width from its parent (#2970): it grows along a horizontal parent, or stretches across
 *  a vertical one. Only a layer copied from a member's plan carries these. */
const stretched = (n: N): boolean => {
  const p = n.parent as N | undefined;
  return !!p?._mk && !!p.layoutMode && n.layoutPositioning !== 'ABSOLUTE' && (p.layoutMode === 'HORIZONTAL' ? n.layoutGrow === 1 : n.layoutAlign === 'STRETCH');
};
/** Whether a frame's width comes from its content: it hugs, is not fixed, and takes no width from its own parent. */
const hugs = (n: N): boolean => !!n._hug && n.layoutSizingHorizontal !== 'FIXED' && !stretched(n) && n.layoutSizingHorizontal !== 'FILL';
/** The narrowest a layer goes when its parent gives it no room: a text's widest letter, a frame its content's narrowest. */
const narrowest = (n: N): number => {
  if (n.type === 'TEXT') return Math.max(...[...String(n.characters ?? 'x')].map((ch) => runWidth(ch)));
  const kids = flow(n);
  if (!n.layoutMode || !kids.length) return n._w as number;
  const own = (c: N) => (stretched(c) ? narrowest(c) : c.width!);
  const pad = Number(n.paddingLeft ?? 0) + Number(n.paddingRight ?? 0);
  return pad + (n.layoutMode === 'HORIZONTAL' ? kids.reduce((a, c) => a + own(c), 0) + Number(n.itemSpacing ?? 0) * (kids.length - 1) : Math.max(...kids.map(own)));
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
      : type === 'Do-Dont' ? [mk('FRAME', 'columns', ['do', 'dont'].map((c) => mk('FRAME', c, [mk('FRAME', 'rule'), t('heading'), ...[1, 2, 3, 4].map((k) => { const it = prism3Instance(LIST_ITEM_TEXT); it.name = `item${k}`; return it; })], { layoutMode: 'VERTICAL', itemSpacing: 8 })), { layoutMode: 'HORIZONTAL' })]
        : type === 'Specimen' ? [mk('FRAME', 'stage', [mk('INSTANCE', 'specimen', [], { _h: 40, layoutSizingHorizontal: 'HUG' })], { layoutMode: 'VERTICAL', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, counterAxisAlignItems: 'CENTER', layoutSizingHorizontal: 'FILL' }), t('caption')]
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
    // How the layer takes its width (#2970): grown, stretched, or, as text, wrapped at its width.
    ...(src.layoutGrow === 1 ? { layoutGrow: 1 } : {}), ...(src.layoutAlign === 'STRETCH' ? { layoutAlign: 'STRETCH' } : {}),
    ...(typeof src.textAutoResize === 'string' ? { textAutoResize: src.textAutoResize } : {}),
    ...(typeof src.characters === 'string' ? { characters: src.characters } : {}),
    // A literal floor the plan carries (#3205), as the host builds it and every instance inherits it.
    ...(typeof src.minWidth === 'number' ? { minWidth: src.minWidth } : {}),
  });
  if (type === 'TEXT') { n._w = 48; n._h = 16; }
  // An instance holds its main's padding and spacing as numbers (#2830's redlines read them).
  const bound = (src.boundVariables ?? {}) as Record<string, { value?: unknown } | undefined>;
  for (const k of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing']) {
    const v = typeof bound[k]?.value === 'number' ? bound[k]!.value : src[k];
    if (typeof v === 'number') n[k] = v;
  }
  return n;
};
/** `sp` as an instance of `member`: its layers copied, and its booleans as the instance's properties, each showing or
 *  hiding the layers that follow it. */
const instanceOf = (sp: N, member: N): void => {
  for (const c of member.children) sp.appendChild!(copyLayer(c as never));
  // The root's own padding and spacing, as the instance mirrors its main's (#2830's redlines read them).
  const own = copyLayer({ ...(member as unknown as Record<string, unknown>), children: [] });
  for (const k of ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom']) if (typeof own[k] === 'number') sp[k] = own[k];
  // THE SWAP KEEPS THE INSTANCE'S OWN SIZING (#2970): the placeholder's hug stays until the panel sets the member's, and
  // the main's width is what a fixed instance takes.
  sp._hug = true;
  sp._w = member.width;
  // An instance inherits its main's floor (#3205): Figma's `minWidth` reaches every instance.
  if (typeof member.minWidth === 'number') sp.minWidth = member.minWidth; else delete sp.minWidth;
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
  // A root built at a width (#1757) is fixed at it, as the executor resizes it; any other hugs.
  const built = plan.root.placementWidth;
  if (typeof built === 'number') { m._w = built; m.layoutSizingHorizontal = 'FIXED'; } else m.layoutSizingHorizontal = 'HUG';
  m.name = Object.entries(plan.coord).map(([k, v]) => `${k}=${v}`).join(', ');
  // THE ORACLE'S WIDTH (#3205): the projection's own root, kept beside the member, never read through the panel.
  m._plan = plan.root;
  members.set(String(m.id), m);
  return m;
};
// Each variant holds its layers, as a file's template does: the texts a panel shows where the draw writes nothing.
const docBlockSet = (): N => mk('COMPONENT_SET', '_Doc-block', TYPES.flatMap((t) => SIZES.map((s) => mk('COMPONENT', `Type=${t}, Size=${s}`, [...blockInstance(t).children], { createInstance: () => blockInstance(t) }))));

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
    createText: () => mk('TEXT', 'Text'),
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
  // THE FAMILY AS ONE COMPONENT (#2970 Q3 A, Q4 A), when the page holds more than one: the title is the page's name, and
  // "In this family" one bulleted line per member, the lead's first, each its name (the page's own prefix dropped) then
  // its summary's opening, the name linked to its set when the file has one (here only the lead's).
  const fam = familyOf(def.id);
  if (fam.members.length > 1) {
    const field = walk(panels[0]).find((c) => c.name === '_Doc-block' && walk(c).some((t) => t.name === 'label' && t.characters === 'In this family'));
    const text = field ? walk(field).find((t) => t.name === 'text')! : undefined;
    const lines = String(text?.characters ?? '').split('\n');
    const order = [def.id, ...fam.members.filter((m) => m !== def.id)];
    const bad = order.flatMap((m, k) => {
      const d = componentDefs.find((x) => x.id === m)!;
      const short = d.name.startsWith(`${fam.page}.`) ? d.name.slice(fam.page.length + 1) : d.name;
      return lines[k]?.startsWith(`${short}: ${d.summary.slice(0, 12)}`) ? [] : [`line ${k + 1} "${lines[k] ?? ''}" is not ${short}'s`];
    });
    const title = walk(panels[0]).find((c) => c.type === 'TEXT' && c.fontSize === 18);
    const linked = ((text?._links ?? []) as { text: string; link: { value: string } }[]).map((l) => `${l.text}>${l.link.value}`);
    const leadName = componentDefs.find((x) => x.id === def.id)!.name;
    const leadShort = leadName.startsWith(`${fam.page}.`) ? leadName.slice(fam.page.length + 1) : leadName;
    ok(!bad.length && lines.length === order.length && title?.characters === fam.page && panels[0].name === `${fam.page} usage` && tagOf(panels[0]).family === fam.page
      && JSON.stringify(text?._lists) === `[{"s":0,"e":${String(text?.characters).length},"o":{"type":"UNORDERED"}}]` && linked.join() === `${leadShort}>${set.id}`,
    `present/${def.id} family: "${fam.page}", ${order.length} parts listed, the lead first, each with its summary`, [...bad, `title ${String(title?.characters)}`, `links ${linked.join()}`].slice(0, 3).join('; '));
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
  // Breadcrumbs (#2916), read by hand: the container, the native items slot holding the trail (two ancestors alike, the
  // current page apart), and the parent path's back glyph and link, which only the `path=parent` member holds.
  const bc = '1:container[@ 2:items[@items 3:item1x2@items/item1 4:item3@items/item3 5:backGlyph@backGlyph 6:parentLink@parentLink';
  ok(show(of('breadcrumbs')) === bc, `marks/breadcrumbs: six entries, the slot's items among them (${show(of('breadcrumbs'))})`, `want ${bc}`);
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
      // ON ITS PART BY CONTAINMENT (#2916): a leader runs down (or up) the part's middle and its tip lies inside the
      // part's box; a bracket runs exactly the part's height and both its ticks end inside the part. The root is always
      // bracketed.
      const B = hit.absoluteBoundingBox!;
      const inside = (x: number, y: number) => x >= B.x - 0.5 && x <= B.x + B.width + 0.5 && y >= B.y - 0.5 && y <= B.y + B.height + 0.5;
      if (lines.length === 3) {
        const [v, ...ticks] = lines;
        if (Math.abs(v.y - B.y) > 0.5 || Math.abs(v.y + v.height - (B.y + B.height)) > 0.5) wrong.push(`${num} ${part.id}: its bracket runs ${v.y}–${v.y + v.height}, the part ${B.y}–${B.y + B.height}`);
        if (!ticks.every((t) => inside(t.x + t.width, t.y))) wrong.push(`${num} ${part.id}: a bracket tick ends outside the part`);
      } else if (lines.length === 1) {
        const [l] = lines;
        if (isRoot) wrong.push(`${num} ${part.id}: the root has a leader, not a bracket`);
        const down = marker.y < B.y;
        const tip = { x: l.x + l.width / 2, y: down ? l.y + l.height : l.y };
        if (!inside(tip.x, tip.y)) wrong.push(`${num} ${part.id}: its leader ends at ${tip.x},${tip.y}, outside the part ${B.x},${B.y} ${B.width}×${B.height}`);
        if (Math.abs(tip.x - (B.x + B.width / 2)) > 1) wrong.push(`${num} ${part.id}: its leader is ${Math.round(tip.x - (B.x + B.width / 2))}px off the part's middle`);
      } else wrong.push(`${num} ${part.id}: ${lines.length} lines, neither a leader nor a bracket`);
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
  const widths: string[] = [];
  for (const def of leads) {
    const p = page(`↳ m ${def.id}`);
    const set = fakeSet(p, def.id);
    await check(def, set, p, def.id);
    // The width the draw gave is the one the dry run spaces by (#2970): the reach less the two gaps and the spec column.
    const w = Number(panelsOn(p)[0]?.width), reach = docPanelReach(host([p]), set) - 40 - 40 - 880;
    if (w !== reach) widths.push(`${def.id} drawn ${w}, spaced for ${reach}`);
  }
  ok(!widths.length, `markers/widths: every lead's panel is drawn as wide as Update spaces it for`, widths.slice(0, 4).join('; '));
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
  // BREADCRUMBS (#2916): the owner's case. Items 1 and 3 sit in the native `items` slot; the parent path's two parts
  // only in the `path=parent` member, so a second specimen carries 5 and 6. Every number 1–6 is drawn on its part.
  {
    const q = page('↳ m breadcrumbs');
    const set = fakeSet(q, 'breadcrumbs');
    await check(componentDefs.find((d) => d.id === 'breadcrumbs')!, set, q, 'breadcrumbs, slot and second member');
    const panel = panelsOn(q)[0];
    const sec = walk(panel).find((c) => c.getSharedPluginData!('prism3', 'docSection') === 'anatomy')!;
    const drawn = panel.children.filter((c) => /^part \d+$/.test(c.name)).map((c) => c.name.slice(5)).join(',');
    ok(listedNumbers(panel).join(',') === '1,2,3,4,5,6' && drawn === '1,2,3,4,5,6' && walk(sec).filter((c) => c.name === 'specimen').length === 2,
      `markers/breadcrumbs numbers: 1–6 listed and drawn, on two specimens (drawn ${drawn})`);
  }
  // More than one specimen: a part the default member does not show is marked on the member that does (Q3 A).
  {
    const q = page('↳ m tag');
    await check(componentDefs.find((d) => d.id === 'tag')!, fakeSet(q, 'tag'), q, 'tag across members');
    const specs = walk(panelsOn(q)[0]).filter((c) => c.name === 'specimen');
    ok(specs.length >= 3, `markers/extra specimens: Tag's parts take ${specs.length} specimens in its Anatomy and Theming`);
  }
}

/* ── width: each specimen at its member's own width, the panel widening to fit ─────────────────────────── */
section('width/… — each specimen at its member\'s width, the panel as wide as that needs, the spec column past it (#2970 Q1 A, Q2 A)');
{
  // THE BUILT WIDTHS, read by hand off each def's root (`placementWidth`, #1757): Banner 480, Checkbox.Row 320 (the
  // Checkbox family's lead, so its default is the family panel's specimen). The panel's least width, its padding and the stage's, from the owner's decision and the template:
  // 560, 24 and 24. Theming side by side is 2 × (member + 48) + 16 + 48; at 960 or more the modes stack.
  const BUILT: Record<string, number> = { banner: 480, 'checkbox-row': 320 };
  const STACKS: Record<string, boolean> = { banner: true, 'checkbox-row': false };
  const longestWord = (t: string): number => Math.max(0, ...t.split(/\s+/).filter(Boolean).map((w) => runWidth(w)));
  for (const id of Object.keys(BUILT)) {
    const d = componentDefs.find((x) => x.id === id)!;
    const p = page(`↳ w ${id}`);
    const set = fakeSet(p, id);
    const r = await drawDocPanel(host([p]), set, d, { names });
    const panel = panelsOn(p)[0];
    const specs = walk(panel).filter((c) => c.name === 'specimen');
    const wrong: string[] = [];
    for (const sp of specs) {
      const member = members.get(String(sp.swapped));
      const box = sp.absoluteBoundingBox!, stage = (sp.parent as N).absoluteBoundingBox!;
      if (!member) { wrong.push('a specimen with no member'); continue; }
      if (box.width !== member.width) wrong.push(`a specimen ${box.width} wide, its member ${member.width}`);
      if (box.x < stage.x + 24 - 0.5 || box.x + box.width > stage.x + stage.width - 24 + 0.5) wrong.push(`a specimen ${box.width} wide past its ${stage.width} stage's padding`);
      for (const t of walk(sp).filter((c) => c.type === 'TEXT' && c.textAutoResize === 'HEIGHT' && c.visible !== false))
        if (t.width! < longestWord(String(t.characters))) wrong.push(`"${String(t.characters).slice(0, 24)}" wraps at ${t.width}px, under its longest word (${longestWord(String(t.characters))})`);
    }
    const first = specs[0];
    ok(r.drawn && !!first && first.absoluteBoundingBox!.width === BUILT[id] && !wrong.length && Number(panel.width) >= 560 && Number(panel.width) >= BUILT[id] + 96,
      `width/${id}: every specimen at its member's width (the default ${BUILT[id]}), inside its stage, no text narrower than its longest word, the panel ${panel.width} wide`,
      [...new Set(wrong)].slice(0, 3).join('; '));
    const modes = walk(panel).find((c) => c.name === 'modes');
    ok(!!modes && modes.layoutMode === (STACKS[id] ? 'VERTICAL' : 'HORIZONTAL'),
      `width/${id} theming: the two modes ${STACKS[id] ? 'stacked, side by side would reach 960' : 'side by side'}`, `got ${String(modes?.layoutMode)}`);
  }
  // The fix's own cause, held apart: the swap keeps the placeholder's hug, so Banner's text, read before the panel sizes
  // it, is one letter wide. This proves the host can show the failure the gate above guards.
  {
    const p = page('↳ w hug');
    const set = fakeSet(p, 'banner');
    const sp = mk('INSTANCE', 'specimen', [], { layoutSizingHorizontal: 'HUG' });
    p.appendChild!(sp);
    instanceOf(sp, set.children[0]);
    const title = walk(sp).find((c) => c.type === 'TEXT' && c.textAutoResize === 'HEIGHT')!;
    ok(title.width! <= runWidth('W'), `width/hug: an instance swapped to Banner that keeps the placeholder's hug squeezes its text to ${title.width}px`);
  }
  // THE PANEL WIDENS AND THE SPEC COLUMN MOVES WITH IT: Banner's panel drawn, a live spec panel beside it, then the
  // member built wider. The panel is due (its width moved), the redraw is wider by as much, and the spec panel keeps
  // its 40 gap.
  {
    const p = page('↳ w push');
    const set = fakeSet(p, 'banner');
    const api = host([p]);
    const d = componentDefs.find((x) => x.id === 'banner')!;
    await drawDocPanel(api, set, d, { names });
    const before = panelsOn(p)[0];
    const sp = mk('FRAME', 'Banner specs', [], { x: Number(before.x) + Number(before.width) + 40, y: Number(before.y), _w: 880, _h: 600 });
    sp.setSharedPluginData!('prism3', 'specPanel', JSON.stringify({ v: 1, def: 'banner', set: set.id, state: 'live' }));
    p.appendChild!(sp);
    const plan = planDocPanel(d, { modes: ['light', 'dark'], names });
    ok(docPanelDue(api, set, plan) === 0, 'width/current: not due right after the draw');
    const w0 = Number(before.width);
    for (const m of set.children) m._w = Number(m._w) + 200;
    ok(docPanelDue(api, set, plan) === 1, 'width/due: a member built 200 wider makes the panel due');
    await drawDocPanel(api, set, d, { names });
    const after = panelsOn(p).find((n) => tagOf(n).state === 'live')!;
    ok(Number(after.width) === w0 + 200 && Number(sp.x) === Number(after.x) + Number(after.width) + 40 && docPanelDue(api, set, plan) === 0,
      `width/spec column: the panel widens ${w0} → ${after.width}, and the spec panel moves to ${sp.x}, 40 past it`, `want ${w0 + 200}, spec at ${Number(after.x) + Number(after.width) + 40}`);
  }
}

/* ── collapse: no example narrower than its def allows (#3205) ─────────────────────────────────────────── */
section('collapse/… — every lead\'s examples at least as wide as the def declares, no wrapping text under a few em (#3205)');
/** THE ORACLE (#3205): what an example may not go under, read off the projection's own root for its member (kept on the
 *  member by `planMember`), never through the panel: the width a root is built at (`placementWidth`), else its literal
 *  floor (`minWidth`), else nothing. And a wrapping text box narrower than `COLLAPSE_EM` em that does not hold its text on
 *  one line has collapsed: the owner's Dialog title went one letter per line. */
const COLLAPSE_EM = 4;
/** Dialog's center member at its default size, typed from the def's prose (400 / 560 / 720, medium the default). */
const DIALOG_WIDTH = 560;
const floorOf = (m: N | undefined): number => {
  const r = (m?._plan ?? {}) as { placementWidth?: unknown; minWidth?: unknown };
  return typeof r.placementWidth === 'number' ? r.placementWidth : typeof r.minWidth === 'number' ? r.minWidth : 0;
};
/** Every collapse in a drawn panel: an example under its member's floor, or a wrapping text under `COLLAPSE_EM` em. */
const collapses = (panel: N): string[] => {
  const out: string[] = [];
  walk(panel).filter((c) => c.name === 'specimen').forEach((sp, k) => {
    const m = members.get(String(sp.swapped));
    const need = floorOf(m), got = sp.absoluteBoundingBox!.width;
    if (got < need - 0.5) out.push(`example ${k + 1} is ${got}px wide, under the ${need} its def declares`);
    for (const t of walk(sp).filter((c) => c.type === 'TEXT' && c.visible !== false && c.textAutoResize === 'HEIGHT')) {
      const em = typeof t.fontSize === 'number' ? t.fontSize : 14, line = runWidth(String(t.characters), em);
      if (t.width! < Math.min(line, COLLAPSE_EM * em)) out.push(`example ${k + 1}: "${String(t.characters).slice(0, 20)}" wraps at ${t.width}px, under ${COLLAPSE_EM}em`);
    }
  });
  return out;
};
for (const d of leads) {
  const p = page(`↳ c ${d.id}`);
  const set = fakeSet(p, d.id);
  const r = await drawDocPanel(host([p]), set, d, { names });
  const panel = panelsOn(p)[0];
  const bad = panel ? collapses(panel) : ['no panel drawn'];
  const n = panel ? walk(panel).filter((c) => c.name === 'specimen').length : 0;
  ok(r.drawn && n > 0 && !bad.length, `collapse/${d.id}: ${n} examples, none under the def's width, no text under ${COLLAPSE_EM}em`, [...new Set(bad)].slice(0, 3).join('; '));
}
{
  // THE READ THE FIX DOES NOT TRUST: Dialog's members report that they hug, as a host's read of a member can. The def
  // builds Dialog at a width, so its examples are still 560 wide and its title holds one line.
  const d = componentDefs.find((x) => x.id === 'dialog')!;
  const p = page('↳ c hug read');
  const set = fakeSet(p, 'dialog');
  // Each member is still built 560 wide: only what its sizing reads moves (`_hug` off keeps the host's width its own).
  for (const m of set.children) { m._hug = false; m.layoutSizingHorizontal = 'HUG'; }
  await drawDocPanel(host([p]), set, d, { names });
  const panel = panelsOn(p)[0];
  const first = walk(panel).find((c) => c.name === 'specimen')!;
  const bad = collapses(panel);
  ok(first.absoluteBoundingBox!.width === DIALOG_WIDTH && !bad.length,
    `collapse/hug read: Dialog's members read as hugging, its anatomy example is still ${first.absoluteBoundingBox!.width} wide (${DIALOG_WIDTH} wanted)`, bad.slice(0, 3).join('; '));
}
{
  // A LATER RESET TO HUG (#3211 X1): after a panel is drawn, something sets every specimen back to hug, as a host's
  // reset can. Only the specimen's `minWidth` holds it then, so no lead built at a width (read off the projection's
  // root, `placementWidth`, never off the subject's `exampleFloor`) may draw an example under that width.
  const builtAt = (m: N): boolean => typeof (m._plan as { placementWidth?: unknown } | undefined)?.placementWidth === 'number';
  const hit: string[] = [];
  let built = 0;
  for (const d of leads) {
    const p = page(`↳ c reset ${d.id}`);
    const set = fakeSet(p, d.id);
    if (!set.children.some(builtAt)) continue;
    built++;
    await drawDocPanel(host([p]), set, d, { names });
    const panel = panelsOn(p)[0];
    if (!panel) { hit.push(`${d.id}: no panel drawn`); continue; }
    for (const sp of walk(panel).filter((c) => c.name === 'specimen')) sp.layoutSizingHorizontal = 'HUG';
    const bad = collapses(panel);
    if (bad.length) hit.push(`${d.id}: ${bad[0]}`);
  }
  ok(built > 0 && !hit.length,
    `collapse/after reset: ${built} leads built at a width, every specimen set back to hug after drawing, no example under its width`, hit.slice(0, 4).join('; '));
}

/* ── family: one panel per page, the members' earlier panels replaced ──────────────────────────────────── */
section('family/… — one panel per taxonomy page, beside its lead; the members\' own panels go (#2927)');
{
  // RELATED BY FAMILY (#2970 Q5 A), typed from the wireframe the owner approved: a member shows as its family, linked to
  // the lead's set; a family named twice in a list is one entry; the panel's own family leaves its own lists (Checkbox
  // loses Built from: Checkbox.Control and Often used with: Checkbox.Group; Buttons loses nothing of its own here).
  const related = (id: string) => planDocPanel(componentDefs.find((d) => d.id === id)!, { modes: ['light', 'dark'], names }).sections.find((s) => s.id === 'related')!.blocks
    .flatMap((b) => (b.type === 'Links' && b.label !== 'Replaces' ? [`${b.label}: ${b.items.map((i) => `${i.name}>${i.def}`).join(' / ')}`] : []));
  const cb = ['Instead, consider: Switch>switch-row / Radio>radio-row', 'Often used with: FieldLabel>field-label / FieldMessage>field-message / FocusRing>focus-ring / Buttons>button'];
  const bt = ['Built from: FocusRing>focus-ring / Spinner>spinner', 'Instead, consider: Icon button>icon-button / Switch>switch-row', 'Often used with: Icon>icon'];
  ok(related('checkbox-row').join('\n') === cb.join('\n'), 'family/related: Checkbox names families, its own parts dropped, Built from gone', related('checkbox-row').join(' | '));
  ok(related('button').join('\n') === bt.join('\n'), 'family/related buttons: Buttons as the wireframe has it', related('button').join(' | '));
  // A list naming one family twice, through two members: one entry.
  const twice = componentDefs.find((d) => d.id === 'tag')!;
  const doubled = { ...twice, composition: { ...twice.composition, alternativeTo: ['checkbox-row', 'checkbox-group', 'radio-row'] } } as ComponentDef;
  const alt = planDocPanel(doubled, { modes: ['light', 'dark'], names }).sections.find((s) => s.id === 'related')!.blocks.find((b) => b.type === 'Links' && b.label === 'Instead, consider');
  ok(alt?.type === 'Links' && alt.items.map((i) => i.name).join(' / ') === 'Checkbox / Radio', `family/related once: Checkbox.Row and Checkbox.Group in one list read "Checkbox" once (${alt?.type === 'Links' ? alt.items.map((i) => i.name).join(' / ') : 'no list'})`);
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
  // Printed the old way, then a line rewritten by hand (#2968: an old print alone no longer reads as an edit).
  oldGroup.setSharedPluginData!('prism3', 'docPanelPrint', await fingerprintOf(oldGroup as never));
  oldGroup.children[0].characters = 'Our team groups checkboxes in threes.';
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

/* ── legacy: a print from before `printView`, under a rebuilt set ──────────────────────────────────────── */
section('legacy/… — a panel printed the old way, its set rebuilt since: replaced when unedited, kept when edited (#2968)');
{
  /** Rebuild `def`'s set under every specimen on `p`: a new member, laid out differently, as Build and Update leave it. */
  const rebuild = (p: N, def: string): void => {
    const rebuilt = planMember(planCache.get(def)![0] as never);
    rebuilt.children[0].children.push(mk('FRAME', 'added in the rebuild', [], { _w: 40, _h: 40 }));
    for (const sp of panelsOn(p).flatMap(walk).filter((c) => c.name === 'specimen')) { sp.children.splice(0); instanceOf(sp, rebuilt); sp.swapped = rebuilt.id; }
  };
  /** A panel's print as the draw recorded it before `printView`: the whole panel. */
  const printOld = async (n: N): Promise<void> => n.setSharedPluginData!('prism3', 'docPanelPrint', await fingerprintOf(n as never));
  const def = componentDefs.find((d) => d.id === 'tag')!;
  const p = page('↳ Tag legacy rebuilt');
  const set = fakeSet(p, 'tag');
  const api = host([p]);
  await drawDocPanel(api, set, def, { names });
  await printOld(panelsOn(p)[0]);
  rebuild(p, 'tag');
  const r = await drawDocPanel(api, set, def, { names });
  ok(r.replaced === 1 && r.kept.length === 0 && panelsOn(p).length === 1 && !panelsOn(p).some((n) => String(n.name).endsWith(' (edited)')),
    `legacy/rebuilt: one panel, the old-print one replaced, none kept (replaced ${r.replaced}, kept ${r.kept.length}, panels ${panelsOn(p).length})`);

  const q = page('↳ Tag legacy edited');
  const qs = fakeSet(q, 'tag');
  const qa = host([q]);
  await drawDocPanel(qa, qs, def, { names });
  const old = panelsOn(q)[0];
  await printOld(old);
  rebuild(q, 'tag');
  walk(old).find((c) => c.type === 'TEXT' && c.name === 'text' && String(c.characters).length > 20)!.characters = 'Our team uses tags for filters only.';
  const r2 = await drawDocPanel(qa, qs, def, { names });
  ok(r2.replaced === 0 && r2.kept.length === 1 && panelsOn(q).length === 2 && old.name === 'Tag usage (edited)' && texts(old).includes('Our team uses tags for filters only.'),
    `legacy/edited: a rewritten line on an old-print panel still keeps it aside, as "${old.name}" (replaced ${r2.replaced}, kept ${r2.kept.length})`);

  // THE BUTTONS PAGE (#2968): four sets, laid out before one panel per family, each with its own panel printed the
  // old way, then the sets rebuilt. A member's panel is drawn as the earlier code drew one: its own heading and lede.
  const buttons = ['button', 'button-destructive', 'button-neutral', 'button-group'];
  const famPage = async (name: string, edit?: string) => {
    const b = page(name);
    const sets = buttons.map((id, i) => fakeSet(b, id, i * 1400, 0, 600, 400));
    const ba = host([b]);
    await drawDocPanel(ba, sets[0], componentDefs.find((d) => d.id === 'button')!, { names });
    for (const [i, id] of buttons.entries()) {
      if (!i) continue;
      const d = componentDefs.find((x) => x.id === id)!;
      const heading = mk('TEXT', 'text'); heading.characters = d.name;
      const lede = mk('TEXT', 'text'); lede.characters = d.summary.replace(/`/g, '').replace(/\s+/g, ' ').trim();
      const spec = mk('INSTANCE', 'specimen');
      instanceOf(spec, sets[i].children[0]);
      const f = mk('FRAME', `${d.name} usage`, [heading, lede, spec], { x: i * 1400 + 640, y: 0, _w: 560, _h: 300 });
      b.appendChild!(f);
      f.setSharedPluginData!('prism3', 'docPanel', JSON.stringify({ v: 1, def: id, set: sets[i].id, state: 'live' }));
    }
    for (const n of panelsOn(b)) await printOld(n);
    // The edit lands after the print, as a designer's does; the rebuild moves every specimen.
    if (edit) for (const n of panelsOn(b)) if (tagOf(n).def === edit) n.children[1].characters = 'Use it only on the checkout page.';
    for (const id of buttons) rebuild(b, id);
    const rb = await drawDocPanel(ba, sets[0], componentDefs.find((d) => d.id === 'button')!, { names });
    return { b, sets, rb };
  };
  {
    const { b, sets, rb } = await famPage('↳ Buttons legacy');
    const live = panelsOn(b).filter((n) => tagOf(n).state === 'live');
    ok(rb.drawn && live.length === 1 && live[0].name === 'Buttons usage' && tagOf(live[0]).set === sets[0].id && panelsOn(b).length === 1,
      `legacy/family lead: one panel on the page, "Buttons usage", beside the lead's set (${panelsOn(b).map((n) => n.name).join(', ')})`);
    ok(rb.replaced === 4 && rb.kept.length === 0 && !panelsOn(b).some((n) => String(n.name).endsWith(' (edited)')),
      `legacy/family members: the lead's old panel and the three members' are removed, none kept (replaced ${rb.replaced}, kept ${rb.kept.length})`);
  }
  {
    const { b, rb } = await famPage('↳ Buttons legacy edited', 'button-neutral');
    const kept = panelsOn(b).filter((n) => tagOf(n).state === 'kept');
    ok(rb.drawn && rb.replaced === 3 && rb.kept.length === 1 && panelsOn(b).length === 2 && kept.length === 1 && kept[0].name === 'Button.Neutral usage (edited)',
      `legacy/family edited: the member a designer edited is kept aside as "${kept[0]?.name}", the other three go (replaced ${rb.replaced}, kept ${rb.kept.length})`);
  }
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
  // The reach (#846, #2830 Q2830.1 B): 40 to the usage panel, its 560, 40 to the spec column, its 880.
  const withRoom = pageSetMoves(found, undefined, 40 + 560 + 40 + 880).get('divider');
  ok(withRoom?.to.x === Number(a.set.width) + 40 + 560 + 40 + 880 + 160, `room/with template: Divider moves to ${withRoom?.to.x}, 160 past Badge's spec column`, `want ${Number(a.set.width) + 1680}`);
  ok(pageSetMoves(found, undefined, 0).get('divider')?.to.x === Number(a.set.width) + 160,
    'room/without template: the old spacing closes to 160 from the frame, with no panel to clear');
  // #2927: a set that leads no family carries no panel, so the next set is spaced from its frame.
  const notLead = [{ name: 'badge', set: a.set, blocked: false, lead: false }, { name: 'divider', set: b.set, blocked: false }] as never;
  ok(pageSetMoves(notLead, undefined, 40 + 560 + 40 + 880).get('divider')?.to.x === Number(a.set.width) + 160,
    'room/not a lead: no room is made past a set that carries no panel');
}

// #2970 Q1 A: a set whose panel widens reaches as far as its panel.
{
  // UPDATE SPACES BY THE SAME WIDTH: Banner then Divider, built by the executor, 400 apart as before the panels. The dry
  // run moves Divider 160 past the spec column beside Banner's panel; moved there, the panel is drawn at exactly the
  // width the move allowed, and the next dry run moves nothing. Build seats a new Banner set by that width too.
  const p = page('↳ w room');
  const { sets: [a, b] } = await buildAll(p, ['banner', 'divider']);
  a.x = 0; a.y = 0; b.x = Number(a.width) + 400; b.y = 0;
  const found = [{ name: 'banner', set: a, blocked: false }, { name: 'divider', set: b, blocked: false }] as never;
  const move = pageSetMoves(found, undefined, docPanelReaches(host([p]))).get('divider');
  if (move) b.x = move.to.x;
  const r = await drawDocPanel(host([p]), a, componentDefs.find((x) => x.id === 'banner')!, { names });
  const panel = panelsOn(p)[0];
  const want = Number(a.width) + 40 + Number(panel?.width) + 40 + 880 + 160;
  ok(r.drawn && Number(panel.width) > 560 && move?.to.x === want, `width/room: Divider moves to ${move?.to.x}, 160 past the spec column beside Banner's ${panel?.width} panel, drawn there`, `want ${want}; ${r.skipped.join('; ')}`);
  ok(!pageSetMoves(found, undefined, docPanelReaches(host([p]))).get('divider'), 'width/room settled: drawn, the next dry run moves nothing');
  ok(docPanelReach(host([p]), a) === 40 + Number(panel.width) + 40 + 880, `width/seat: Build seats a new Banner set by its panel's ${panel.width} (reach ${docPanelReach(host([p]), a)})`);
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
  ok(!!JSON.parse(String(p.getSharedPluginData!('prism3', 'docPanelBlocked')) || '{}')[String(a.id)] && pb?.setMove?.to.x === Number(a.width) + 1680 && pa?.furniture?.panels === 1,
    `due/update makes room: the dry run moves Divider to ${pb?.setMove?.to.x} and lists Badge's blocked panel as due, since the move clears it (${JSON.stringify(pa?.furniture)})`);
  // ONE UPDATE, as `main.ts` runs it: each set's furniture redrawn with its panel (`furnishUpdate` with the panel hook).
  const furnish = async (def: string) => { await furnishUpdate(uh, { outcomes: [{ def }] }, targets, (set, id) => drawDocPanel(uh, set as unknown as PNode, componentDefs.find((d) => d.id === id)!, { names })); };
  await applyUpdate(uh as never, uh as never, targets, previewHashOf(pre), { furnish });
  const pa2 = livePanel(a), pb2 = livePanel(b);
  const visibleLeft = Math.min(Number(b.x), ...p.children.filter((c) => { try { return JSON.parse(c.getSharedPluginData!('prism3', 'furniture') || 'null')?.set === b.id; } catch { return false; } }).map((c) => Number(c.x)));
  const clashes = panelsOn(p).flatMap((pa) => p.children.filter((c) => c !== pa && overlap(pa, c)).map((c) => `${pa.name} on ${c.name}`));
  // The spec column is reserved past the usage panel whether or not specs are drawn (Q2830.1 B).
  const specEdge = pa2 ? Number(pa2.x) + Number(pa2.width) + 40 + 880 : NaN;
  ok(!!pa2 && !!pb2 && Number(pa2.x) === Number(a.x) + Number(a.width) + 40 && Math.round(visibleLeft - specEdge) === 160 && !clashes.length,
    `room/apply: ONE Update draws Badge's panel and spaces Divider 160 past its spec column (${Math.round(visibleLeft - specEdge)}), no panel on anything (${clashes.join('; ')})`);
  // Q2830.3 A: specs are drawn on request only, so the Update's apply, panels redrawn and all, tags no spec panel.
  const specTagged = p.children.flatMap(walk).filter((n) => readSpecTag(n)).map((n) => String(n.name));
  ok(p.children.flatMap(walk).length > 100 && !specTagged.length, `specs/never on update: the Update's apply draws no spec panel (${specTagged.join(', ') || 'none tagged'})`);
  const next = await previewUpdate(uh, targets);
  ok(next.sets.every((x) => !x.setMove && !x.furniture), `room/settled: the next dry run lists no move and no panel (${JSON.stringify(next.sets.map((x) => [x.set, x.setMove ?? null, x.furniture ?? null]))})`);
}
{
  // No furniture redraw: the panel must move with its set, since nothing redraws it.
  const { a, b, uh, targets, livePanel } = await roomPage('↳ Room follow');
  await applyUpdate(uh as never, uh as never, targets, previewHashOf(await previewUpdate(uh, targets)));
  const pb2 = livePanel(b);
  ok(Number(b.x) === Number(a.width) + 1680 && !!pb2 && Number(pb2.x) === Number(b.x) + Number(b.width) + 40 && Number(pb2.y) === Number(b.y),
    `room/panel follows: Divider moves to ${Number(b.x)}, ${Number(a.width) + 1680} wanted, and its panel with it, to ${pb2?.x}`);
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

// #3205 item 4: Update redraws a collapsed usage panel in place.
{
  // UPDATE REDRAWS AN AFFECTED PANEL IN PLACE (#3205 item 4): Dialog built by the executor, its panel drawn, then aged to
  // what the fix replaces, drawn by the earlier format with its examples collapsed. The dry run lists it as due; one
  // Update, as `main.ts` runs it, replaces it where it was, not kept as "(edited)", every example 560 wide.
  const p = page('↳ c update');
  const { api, sets } = await buildAll(p, ['button', 'button-group', 'divider', 'flush-icon-button-neutral', 'dialog']);
  const set = sets[sets.length - 1];
  // The close glyph the plan swaps to, which the shim holds off the page: here on the page, where the update finds it.
  p.appendChild!(mk('COMPONENT', 'icon/close', [], { x: -4000, y: 0, _w: 24, _h: 24 }));
  // Each shim numbers its nodes from 1: the swap finds this set's members here first, not another page's namesakes.
  for (const m of set.children) members.set(String(m.id), m);
  const panels = host([p]);
  const uh = { ...api, root: { ...(api.root as object), findAllWithCriteria: (c: never) => labelHost(panels).root.findAllWithCriteria(c) } } as unknown as UpdateHost & PanelApi & FurnitureApi;
  const d = componentDefs.find((x) => x.id === 'dialog')!;
  await drawDocPanel(uh, set, d, { names });
  const old = panelsOn(p)[0];
  const at = { x: Number(old.x), y: Number(old.y) };
  old.setSharedPluginData!('prism3', 'docPanelPlan', old.getSharedPluginData!('prism3', 'docPanelPlan').replace(/^\d+:/, '4:'));
  for (const sp of walk(old).filter((c) => c.name === 'specimen')) { sp.layoutSizingHorizontal = 'HUG'; delete sp.minWidth; }
  const was = walk(old).find((c) => c.name === 'specimen')!.absoluteBoundingBox!.width;
  const targets: UpdateTarget[] = [{ def: 'dialog', plans: plansOf('dialog'), doc: { def: d, names } }];
  const pre = await previewUpdate(uh, targets);
  const due = pre.sets.find((x) => x.set === 'dialog')?.furniture?.panels;
  const furnish = async (def: string) => { await furnishUpdate(uh, { outcomes: [{ def }] }, targets, (s, id) => drawDocPanel(uh, s as unknown as PNode, componentDefs.find((x) => x.id === id)!, { names })); };
  await applyUpdate(uh as never, uh as never, targets, previewHashOf(pre), { furnish });
  const all = panelsOn(p), live = all.filter((n) => tagOf(n).state === 'live');
  const now = live[0];
  const widths = now ? walk(now).filter((c) => c.name === 'specimen').map((c) => c.absoluteBoundingBox!.width) : [];
  ok(was < DIALOG_WIDTH / 2 && due === 1 && all.length === 1 && live.length === 1 && now !== old && Number(now.x) === at.x && Number(now.y) === at.y
    && !String(now.name).endsWith('(edited)') && widths.length > 0 && widths.every((w) => w === DIALOG_WIDTH) && !collapses(now).length,
    `update/redraw in place: Dialog's collapsed panel (${was}px example) is due (${due}) and one Update redraws it at (${now?.x}, ${now?.y}), examples ${[...new Set(widths)].join(', ')} wide`,
    `panels ${all.length}, live ${live.length}, at (${at.x}, ${at.y}), names ${all.map((n) => n.name).join(' | ')}; ${now ? collapses(now).slice(0, 2).join('; ') : ''}`);
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
section('qa/… — usage panels QA round 1 (#2970): titles, the space above Do and Don\'t, Related as linked lists');
{
  const p = page('↳ QA r1');
  const set = fakeSet(p, 'tag');
  // Two of Tag's related components have a set in the file; the rest do not.
  const badge = fakeSet(p, 'badge', 0, 3000), button = fakeSet(p, 'button', 0, 4000);
  const api = host([p]);
  const def = componentDefs.find((d) => d.id === 'tag')!;
  const r = await drawDocPanel(api, set, def, { names });
  const panel = panelsOn(p)[0];
  const all = panel ? walk(panel) : [];
  // Item 5: the title 18px at −4%, each section title 16px at −3% (the studio's `ls-tightest` and `ls-tighter`).
  const title = all.find((n) => n.type === 'TEXT' && n.characters === 'Tag');
  ok(r.drawn && title?.fontSize === 18 && JSON.stringify(title?.letterSpacing) === '{"value":-4,"unit":"PERCENT"}',
    'qa/title: "Tag" at 18px, letter-spacing −4%', `got ${String(title?.fontSize)} ${JSON.stringify(title?.letterSpacing)}`);
  const heads = all.filter((n) => n.getSharedPluginData!('prism3', 'docSection')).map((sec) => sec.children.flatMap(walk).find((t) => t.type === 'TEXT'));
  const wantHeads = ['Overview', 'Anatomy', 'Styles', 'Usage guidelines', 'Accessibility', 'Content guidelines', 'Theming', 'Related components'];
  ok(heads.map((h) => h?.characters).join('|') === wantHeads.join('|') && heads.every((h) => h?.fontSize === 16 && JSON.stringify(h?.letterSpacing) === '{"value":-3,"unit":"PERCENT"}'),
    'qa/section titles: all 8 at 16px, letter-spacing −3%', heads.map((h) => `${String(h?.characters)} ${String(h?.fontSize)} ${JSON.stringify(h?.letterSpacing)}`).join('; '));
  // Item 2: the Do and Don't block turns on its own Top padding.
  const dd = all.find((n) => n.name === '_Doc-block' && n.children.some((c) => c.name === 'columns'));
  ok((dd?.componentProperties as Record<string, { value: unknown }> | undefined)?.['Top padding#1:0']?.value === true, 'qa/do-dont padding: Top padding on above the Do and Don\'t columns');
  // Item 3: each list one bulleted line per name; the names whose set is in the file link to it by node, underlined.
  const related = all.find((n) => n.getSharedPluginData!('prism3', 'docSection') === 'related')!;
  const rows = related.children.filter((c) => c.name === '_Doc-block' && c.children.some((k) => k.name === 'row')).map((b) => ({ label: walk(b).find((t) => t.name === 'label')!, text: walk(b).find((t) => t.name === 'text')! }));
  const lists = rows.map((x) => `${String(x.label.characters)}: ${String(x.text.characters).split('\n').join(' / ')}`);
  ok(lists.join('\n') === [
    'Built from: FocusRing',
    'Instead, consider: Badge / Buttons / Checkbox / Radio',
    'Often used with: Badge / Icon / Checkbox / Radio',
    'Replaces: a removable token list built as a listbox / a clickable div styled as a pill / a bare × glyph with no accessible name',
  ].join('\n'), 'qa/related lists: 4 lists, one line per name, no chips', lists.join(' | '));
  ok(!related.children.some((b) => walk(b).some((c) => /^chip\d/.test(String(c.name)))) && rows.every((x) => JSON.stringify(x.text._lists) === `[{"s":0,"e":${String(x.text.characters).length},"o":{"type":"UNORDERED"}}]`),
    'qa/related bullets: every list is one UNORDERED list over its whole text');
  const links = rows.flatMap((x) => x.text._links as { text: string; link: { type: string; value: string } }[]);
  ok(JSON.stringify(links) === JSON.stringify([
    { text: 'Badge', link: { type: 'NODE', value: badge.id } }, { text: 'Buttons', link: { type: 'NODE', value: button.id } },
    { text: 'Badge', link: { type: 'NODE', value: badge.id } },
  ]), 'qa/related links: Badge ×2, and Buttons to its lead Button\'s set, link by node; FocusRing, Icon, the families with no set here and Replaces stay plain', JSON.stringify(links));
  ok(JSON.stringify(rows.flatMap((x) => (x.text._decos as { text: string }[]).map((d) => d.text))) === '["Badge","Buttons","Badge"]', 'qa/related underline: exactly the 3 linked names are underlined');
  // A set built after the draw: the panel is due, so its name is linked on the next update; drawn again, it is not.
  ok(docPanelDue(api, set, planDocPanel(def, { modes: ['light', 'dark'], names })) === 0, 'qa/links current: not due right after the draw');
  const icon = mk('COMPONENT_SET', 'icon', [], { x: 0, y: 5000 }); p.appendChild!(icon);
  ok(docPanelDue(api, set, planDocPanel(def, { modes: ['light', 'dark'], names })) === 1, 'qa/links due: Icon\'s set built since the draw makes the panel due');
  await drawDocPanel(api, set, def, { names });
  const again = walk(panelsOn(p)[0]).filter((n) => n.type === 'TEXT').flatMap((t) => (t._links as { text: string; link: { value: string } }[] | undefined) ?? []);
  ok(again.some((l) => l.text === 'Icon' && l.link.value === icon.id) && docPanelDue(api, set, planDocPanel(def, { modes: ['light', 'dark'], names })) === 0,
    'qa/links redrawn: Icon now links to its set, and the panel is current again');
}

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


/* ── specs: the spec panel in its column beside the usage panel (#2830 phase 2, Q2830.1 B) ───────────────── */
// THE ORACLE, written here: Button's numbers as the 2026-10-19 wireframe and the usage panel show them, its slot-aware
// padding and floor, and Text field's literals, as literals; the spec column's place (Q2830.1 B: 40 right of the usage
// panel, top-aligned, 880 wide) and the color table's measured columns (Q2830.8 A, the 2026-10-25 wireframe), as
// literals; and the font, `INTER_14`. Never read through `spec-panel.ts`.
const SPEC_COLUMN = { x: 40, width: 880 };
const TABLE_COLUMNS = { state: 128, part: 192, variable: 368, value: 120 };
const specPanelsOn = (p: N): N[] => p.children.filter((c) => c.getSharedPluginData!('prism3', 'specPanel'));
const specTag = (n: N) => JSON.parse(n.getSharedPluginData!('prism3', 'specPanel')) as { def: string; set: string; state: string };
const def = (id: string) => componentDefs.find((d) => d.id === id)!;
section('specs/plan — the spec panel\'s content, from the spec model');
{
  const btn = planSpecPanel(def('button'));
  const b0 = btn.defs[0];
  const fields = (id: string) => b0.sections.find((x) => x.id === id)!.blocks.flatMap((b) => (b.type === 'Field' ? [`${b.label} | ${b.text}`] : []));
  const anat = fields('anatomy');
  const want = ['1  Leading visual', '2  Label', '3  Trailing visual', '4  Spinner', '5  Focus ring', '·  Container'];
  ok(want.every((w) => anat.some((f) => f.startsWith(`${w} |`))), `specs/plan anatomy: Button's parts carry the usage panel's numbers (${anat.map((f) => f.split(' | ')[0]).join(', ')})`);
  ok(btn.defs.map((d) => d.def).slice(0, 3).join() === 'button,button-destructive,button-neutral', `specs/plan family: one panel for the Buttons page, a section per set, the lead first (${btn.defs.map((d) => d.def).join(', ')})`);
  const reds = b0.sections.find((x) => x.id === 'spacing')!.blocks.flatMap((b) => (b.type === 'Redline' ? [b] : []));
  const med = (leading: boolean) => reds.find((r) => r.where.size === 'medium' && r.where.leading === String(leading));
  const lab = (r: typeof reds[number] | undefined, prop: string) => r?.marks.find((m) => m.prop === prop && !m.path.length)?.label;
  ok(lab(med(false), 'paddingLeft') === 'space/200' && lab(med(true), 'paddingLeft') === 'space/150' && lab(med(false), 'height') === 'size/md/height',
    `specs/plan redlines: medium pads space/200, space/150 on the icon side, at size/md/height (${lab(med(false), 'paddingLeft')}, ${lab(med(true), 'paddingLeft')}, ${lab(med(false), 'height')})`);
  ok(lab(med(false), 'minWidth') === 'min width 104 · derived' && reds.length === 6 && med(false)?.where.state === 'rest' && med(false)?.where.appearance === 'filled',
    `specs/plan members: each size at rest in the default appearance, without and with a leading visual (${reds.length} specimens; "${lab(med(false), 'minWidth')}")`);
  const tables = b0.sections.find((x) => x.id === 'color')!.blocks.flatMap((b) => (b.type === 'Colors' ? [b] : []));
  const filled = tables.find((t) => t.title === 'Appearance filled, surface default, inset default');
  const row = (st: string) => filled?.rows.find((r) => r.state === st)?.bindings.map((x) => `${x.part} ${x.role} · ${x.variable}`) ?? [];
  ok(tables.length === 8 && row('rest').includes('Container fill · color/interactive/primary/fill/rest') && row('rest').length === 4,
    `specs/plan colors rest: 8 tables; filled rest in full (${row('rest').join('; ')})`);
  ok(JSON.stringify(row('hover')) === JSON.stringify(['Container fill · color/interactive/primary/fill/hover']),
    `specs/plan colors delta: hover lists only what moves from rest (${row('hover').join('; ')})`);
  // A (part, role) bound at rest that a state leaves unbound is a change too (Q2994.1 A): a disabled selected tag is a
  // dimmed outline, so its fill row reads "none", with no swatch, beside what it rebinds.
  const tagSel = planSpecPanel(def('tag')).defs[0].sections.find((x) => x.id === 'color')!.blocks
    .flatMap((b) => (b.type === 'Colors' && b.title === 'Type select, selection selected' ? [b] : []))[0];
  const tagRow = (st: string) => tagSel?.rows.find((r) => r.state === st);
  const tagDis = tagRow('disabled')?.bindings ?? [];
  const tagFill = tagDis.filter((x) => x.part === 'Container' && x.role === 'fill');
  ok(tagRow('rest')?.bindings.some((x) => x.part === 'Container' && x.role === 'fill' && x.variable === 'color/interactive/primary/subtle-fill/selected')
    && tagFill.length === 1 && tagFill[0].variable === 'none' && tagFill[0].dropped === true
    && tagDis.some((x) => x.part === 'Container' && x.role === 'stroke' && x.variable === 'color/disabled/border')
    && !tagRow('hover')?.bindings.some((x) => x.dropped) && !tagRow('rest')?.bindings.some((x) => x.dropped),
    `specs/plan colors delta: a binding a state drops is a row reading "none" — Tag selected, disabled (${tagDis.map((x) => `${x.part} ${x.role} · ${x.variable}`).join('; ')})`);
  const tf = planSpecPanel(def('text-field')).defs[0];
  const tfReds = tf.sections.find((x) => x.id === 'spacing')!.blocks.flatMap((b) => (b.type === 'Redline' ? [b] : []));
  const ctl = tfReds.find((r) => r.where.size === 'medium')?.marks ?? [];
  ok(tfReds.length === 3 && ctl.some((m) => m.path.join('/') === 'control' && m.prop === 'paddingLeft' && m.label === 'space/200') && ctl.some((m) => m.prop === 'buildWidth' && m.label === 'build width 320 · literal')
    && ctl.some((m) => m.path.join('/') === 'control' && m.prop === 'minWidth' && m.label === 'min width 120 · literal'),
    `specs/plan text field: one specimen per size; the control pads space/200; 320 build width and 120 floor are literals (${ctl.map((m) => `${m.path.join('/') || 'root'}.${m.prop}=${m.label}`).join(', ')})`);
}

section('specs/no wrap — every string a color table writes fits its column, in every set (Q2830.8 A)');
{
  // Every def that builds a set, as the panel plans it: each variable, state, and part and role, against its column.
  const over: string[] = [];
  let n = 0, widest = ['', 0] as [string, number];
  for (const d of componentDefs.filter((x) => x.figmaProperties)) {
    for (const sec of planSpecPanel(d).defs.flatMap((x) => x.sections)) for (const b of sec.blocks) {
      if (b.type !== 'Colors') continue;
      for (const r of b.rows) {
        const state = r.state.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
        if (runWidth(state) > TABLE_COLUMNS.state) over.push(`state "${state}" ${runWidth(state)} > ${TABLE_COLUMNS.state}`);
        for (const x of r.bindings) {
          n++;
          const w = runWidth(x.variable);
          if (w > widest[1]) widest = [x.variable, w];
          if (w > TABLE_COLUMNS.variable) over.push(`${d.id}: "${x.variable}" ${w} > ${TABLE_COLUMNS.variable}`);
          if (runWidth(`${x.part} ${x.role}`) > TABLE_COLUMNS.part) over.push(`${d.id}: "${x.part} ${x.role}" ${runWidth(`${x.part} ${x.role}`)} > ${TABLE_COLUMNS.part}`);
        }
      }
    }
  }
  ok(n > 1000 && !over.length, `specs/token fits: ${n} bindings across every set, each variable on one line in Inter 14 (widest "${widest[0]}", ${widest[1]} of ${TABLE_COLUMNS.variable}px)${over.length ? `; wraps: ${over.slice(0, 4).join('; ')}` : ''}`);
  ok(JSON.stringify(COLOR_COLUMNS) === JSON.stringify(TABLE_COLUMNS) && COLOR_COLUMNS.state + COLOR_COLUMNS.part + COLOR_COLUMNS.variable + COLOR_COLUMNS.value + 3 * COLOR_GAP === 880 - 2 * 24,
    `specs/columns: the table's columns are the measured ones and fill the panel's 832 of content (${JSON.stringify(COLOR_COLUMNS)}, gap ${COLOR_GAP})`);
  ok(hexFor({ id: 'V', name: 'v', resolveForConsumer: () => ({ value: { r: 1, g: 1, b: 1, a: 0.1 } }) } as never, {} as never) === '#FFFFFF 10%'
    && hexFor({ id: 'V', name: 'v', resolveForConsumer: () => ({ value: { r: 30 / 255, g: 30 / 255, b: 1, a: 1 } }) } as never, {} as never) === '#1E1EFF'
    && hexFor({ id: 'V', name: 'v' } as never, {} as never) === undefined,
    'specs/hex: a resolved color reads #RRGGBB, with its alpha as a percent below 1; nothing when the host cannot resolve it');
}

section('specs/draw — beside the usage panel, redlined, never on anything');
/** Every variable the Button family's color tables name, as the file holds them: each resolves for any node to a fixed
 *  color, the overlays to white at 10%. */
const SPEC_VARS = [...new Set(planSpecPanel(def('button')).defs.flatMap((d) => d.sections).flatMap((x) => x.blocks).flatMap((b) => (b.type === 'Colors' ? b.rows.flatMap((r) => r.bindings.map((y) => y.variable)) : [])))]
  .map((name, i) => ({ id: `SV:${i}`, name: `zz/${name}`, variableCollectionId: 'VC:color', resolveForConsumer: () => ({ value: name.includes('/overlay/') ? { r: 1, g: 1, b: 1, a: 0.1 } : { r: 30 / 255, g: 30 / 255, b: 1, a: 1 } }) }));
const specPage = async (name: string) => {
  const p = page(name);
  const { set } = await buildOn(p, 'button');
  const base = host([p]) as unknown as SpecApi;
  const api = { ...base, variables: { ...base.variables!, getLocalVariablesAsync: async () => [...VARS, ...SPEC_VARS] } } as unknown as SpecApi;
  const r = await drawDocPanel(api, set, def('button'), { names });
  return { p, set, api, usage: panelsOn(p).find((n) => tagOf(n).state === 'live')!, r };
};
{
  const { p, set, api, usage } = await specPage('↳ Specs');
  const r = await drawSpecPanel(api, set, def('button'));
  const sp = specPanelsOn(p)[0];
  ok(r.drawn && !!sp && specTag(sp).state === 'live' && specTag(sp).set === set.id && specTag(sp).def === 'button',
    `specs/draw tagged: a live spec panel for Button's set (${specItems(r).join('; ')})`);
  ok(!!sp && Number(sp.x) === Number(usage.x) + Number(usage.width) + SPEC_COLUMN.x && Number(sp.y) === Number(usage.y) && Number(sp.width) === SPEC_COLUMN.width,
    `specs/draw place: its own 880 column, 40 right of the usage panel and top-aligned with it (${sp?.x},${sp?.y} at ${sp?.width} vs the usage panel's right edge ${Number(usage.x) + Number(usage.width)},${usage.y})`);
  // NO NAME WRAPS, as drawn: every cell of every color table holds its text on one line, measured in the host's font.
  const cells = sp ? walk(sp).filter((c) => ['state', 'part', 'variable', 'hex'].includes(String(c.name)) && c.type === 'INSTANCE') : [];
  const wrapped = cells.flatMap((c) => { const t = walk(c).find((x) => x.type === 'TEXT'); const tx = String(t?.characters ?? ''); return tx && runWidth(tx) > Number(c.width) ? [`"${tx}" ${runWidth(tx)} > ${c.width}`] : []; });
  // The table's header row names its columns; the rows under it hold one binding each.
  const vars = cells.filter((c) => c.name === 'variable' && (c.parent as N | undefined)?.name !== 'header');
  ok(vars.length > 100 && !wrapped.length && !r.misses.some((m) => m.endsWith('so it wraps')) && vars.every((c) => Number(c.width) === TABLE_COLUMNS.variable),
    `specs/draw no wrap: ${vars.length} variable cells at ${TABLE_COLUMNS.variable}px and ${cells.length - vars.length} other cells, each text on one line${wrapped.length ? `; wraps: ${wrapped.slice(0, 3).join('; ')}` : ''}${r.misses.filter((m) => m.endsWith('so it wraps')).slice(0, 2).map((m) => `; ${m}`).join('')}`);
  const hexes = cells.filter((c) => c.name === 'hex').map((c) => String(walk(c).find((x) => x.type === 'TEXT')?.characters ?? ''));
  // A binding a state drops reads "none" and has no swatch, so no hex (Q2994.1 A): every other variable has one.
  const none = vars.filter((c) => String(walk(c).find((x) => x.type === 'TEXT')?.characters ?? '') === 'none');
  const noneSwatched = none.filter((c) => walk(c.parent as N).some((x) => x.name === 'swatch'));
  ok(none.length > 0 && !noneSwatched.length,
    `specs/draw none: a dropped binding's row reads "none", with no swatch (${none.length} rows, ${noneSwatched.length} swatched)`);
  ok(hexes.length === vars.length - none.length && hexes.every((h) => /^#[0-9A-F]{6}( \d+%)?$/.test(h)) && hexes.includes('#FFFFFF 10%') && !r.misses.some((m) => m.startsWith('no value')),
    `specs/draw hex: each variable's value is the hex it resolves to for the panel (${hexes.length} of ${vars.length - none.length}: ${[...new Set(hexes)].join(', ')}; ${r.misses.filter((m) => m.startsWith('no value')).slice(0, 2).join('; ')})`);
  // Each redline's label is its token and the px the specimen holds: read off the drawn specimen by this walk.
  const reds = sp ? sp.children.filter((c) => String(c.name).startsWith('redline ')) : [];
  const specs = sp ? walk(sp).filter((c) => c.name === 'specimen') : [];
  const first = specs[0];
  const lbl = (prop: string) => reds.filter((g) => g.name === `redline ${prop}`).map((g) => texts(g)[0]);
  ok(reds.length > 0 && !!first && lbl('paddingLeft').includes(`space/200 · ${first.paddingLeft}`) && lbl('paddingLeft').includes(`space/150 · ${Number(walk(sp!).filter((c) => c.name === 'specimen')[1]?.paddingLeft)}`),
    `specs/draw labels: variable · px, the px the specimen holds (${lbl('paddingLeft').slice(0, 3).join('; ')})`);
  const magenta = reds.flatMap((g) => g.children).every((c) => JSON.stringify(c.fills).includes('"r":0.847'));
  ok(magenta && reds.every((g) => g.layoutPositioning === 'ABSOLUTE'), 'specs/draw magenta: every redline line and label is the fixed spec magenta, over the panel and outside its layout');
  const swatches = sp ? walk(sp).filter((c) => c.name === 'swatch') : [];
  ok(swatches.length > 0 && swatches.every((w) => Array.isArray(w.fills)), `specs/draw swatches: ${swatches.length} swatches drawn`);
  const clashes = p.children.filter((c) => c !== sp && sp && overlap(sp, c)).map((c) => String(c.name));
  ok(!!sp && !clashes.length, `specs/draw clear: the spec panel lies on nothing (${clashes.join(', ')})`);

  // A second run replaces it; an edited one is kept, below, and named.
  const r2 = await drawSpecPanel(api, set, def('button'));
  ok(r2.drawn && r2.replaced === 1 && specPanelsOn(p).length === 1 && sp?.removed === true, `specs/replace: an unedited panel is replaced (${r2.replaced}, ${specPanelsOn(p).length} on the page)`);
  const live = specPanelsOn(p)[0];
  const line = walk(live).find((c) => c.type === 'TEXT' && String(c.characters).startsWith('Numbers match'))!;
  line.characters = 'Our team reads part 2 as the label.';
  const r3 = await drawSpecPanel(api, set, def('button'));
  const kept = specPanelsOn(p).find((n) => specTag(n).state === 'kept');
  const fresh = specPanelsOn(p).find((n) => specTag(n).state === 'live');
  ok(r3.drawn && !!kept && !!fresh && String(kept.name).endsWith(' (edited)') && texts(kept).includes('Our team reads part 2 as the label.') && !overlap(kept, fresh) && specItems(r3).some((x) => x.includes('edited by hand'))
    && Number(kept.x) === Number(fresh.x) && Number(kept.y) >= Number(fresh.y) + Number(fresh.height) && !panelsOn(p).some((u) => overlap(u, kept)),
    `specs/hand edit: the edited panel is kept as "${kept?.name}", its edit intact, below the fresh one in the spec column (${kept?.x},${kept?.y} vs ${fresh?.x}), and named`);
}
{
  const { p, set, api, usage } = await specPage('↳ Specs blocked');
  p.appendChild!(mk('FRAME', 'Notes', [], { x: Number(usage.x) + Number(usage.width) + 200, y: Number(usage.y) + 60, _w: 200, _h: 80 }));
  const r = await drawSpecPanel(api, set, def('button'));
  ok(!r.drawn && specPanelsOn(p).length === 0 && specItems(r)[0] === 'No spec panel for button: "Notes" sits where the panel goes, right of the usage panel. Move it, then draw specs again',
    `specs/blocked: a layer where the panel goes keeps it from being drawn ("${specItems(r)[0]}")`);
}
{
  // The usage panel redrawn further right (its set grew wider) pushes the spec panel right, and the spec panel never
  // blocks it.
  const { p, set, api } = await specPage('↳ Specs grow');
  await drawSpecPanel(api, set, def('button'));
  const sp = specPanelsOn(p)[0];
  const y0 = Number(sp.y);
  sp.x = Number(sp.x) - 300;
  const r = await drawDocPanel(api, set, def('button'), { names });
  const u = panelsOn(p).find((n) => tagOf(n).state === 'live')!;
  ok(r.drawn, `specs/usage not blocked: the usage panel draws over its own spec panel's old spot (${panelItems(r).join('; ')})`);
  ok(!!u && Number(sp.x) === Number(u.x) + Number(u.width) + 40 && Number(sp.y) === y0 && !overlap(u, sp), `specs/usage pushes right: the spec panel moves to 40 right of the redrawn usage panel (${sp.x} vs ${Number(u?.x) + Number(u?.width) + 40})`);
}
{
  // A blocked draw leaves the set's earlier panel as it was: it is removed only once the fresh one lands.
  const { p, set, api, usage } = await specPage('↳ Specs blocked again');
  await drawSpecPanel(api, set, def('button'));
  const old = specPanelsOn(p)[0];
  void usage;
  p.appendChild!(mk('FRAME', 'Notes', [], { x: Number(old.x) + 100, y: Number(old.y) + 200, _w: 100, _h: 40 }));
  const r = await drawSpecPanel(api, set, def('button'));
  ok(!r.drawn && r.replaced === 0 && !old.removed && specPanelsOn(p).length === 1, `specs/blocked keeps: a refused redraw keeps the earlier panel (${r.replaced} replaced, ${specPanelsOn(p).length} on the page)`);
}
{
  // An edited usage panel set aside by a redraw goes below the fresh one in the usage panel's column, never onto the
  // spec panel beside it.
  const { p, set, api, usage } = await specPage('↳ Specs and an edited usage panel');
  await drawSpecPanel(api, set, def('button'));
  const sp = specPanelsOn(p)[0];
  walk(usage).find((c) => c.type === 'TEXT' && String(c.characters).length > 20)!.characters = 'Our own lede.';
  await drawDocPanel(api, set, def('button'), { names });
  const keptUsage = panelsOn(p).find((n) => tagOf(n).state === 'kept');
  const fresh = panelsOn(p).find((n) => tagOf(n).state === 'live');
  ok(!!keptUsage && !!fresh && !overlap(keptUsage, sp) && Number(keptUsage.x) === Number(fresh.x) && Number(sp.x) === Number(fresh.x) + Number(fresh.width) + 40,
    `specs/edited usage below: the kept usage panel sits below the fresh one in its own column, clear of the spec panel (${keptUsage?.x},${keptUsage?.y}; spec panel at ${sp.x})`);
}
{
  // A deleted set's unedited spec panel comes off before its def is built again; an edited one stays.
  const { p, set, api } = await specPage('↳ Specs orphan');
  await drawSpecPanel(api, set, def('button'));
  const sp = specPanelsOn(p)[0];
  set.remove!();
  const n = await clearOrphanSpecPanels(api, p, 'button');
  ok(n === 1 && sp.removed === true, `specs/orphan: the unedited spec panel of a deleted set is cleared (${n})`);
}
{
  // A brand whose body/sm is wider than the columns were measured for: the draw names each string that now wraps.
  const { p, set, api } = await specPage('↳ Specs wide face');
  const blocks = (api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }) as N[]).find((c) => c.name === '_Doc-block')!;
  const para = blocks.children.find((c) => c.name === 'Type=Paragraph, Size=sm')!;
  walk(para).find((c) => c.type === 'TEXT')!.fontSize = 20;
  const r = await drawSpecPanel(api, set, def('button'));
  const wraps = r.misses.filter((m) => m.endsWith('so it wraps'));
  // At 20px the longest Button variable, "color/inverse/interactive/primary/overlay/pressed", runs past 368.
  ok(r.drawn && !!specPanelsOn(p).length && wraps.some((m) => m.startsWith('"color/inverse/interactive/primary/overlay/pressed" is ') && m.includes('368px variable column')),
    `specs/wide face wraps: a wider body/sm is measured as drawn, and each string that wraps is named (${wraps.length}: ${wraps.slice(0, 2).join('; ')})`);
}
{
  // Without the template's face loaded, the panel draws with no redlines and names why; nothing is left half drawn.
  const { p, set, api } = await specPage('↳ Specs no face');
  const noFace = { ...api, loadFontAsync: async () => { throw new Error('font unavailable'); } } as unknown as SpecApi;
  const r = await drawSpecPanel(noFace, set, def('button'));
  const sp = specPanelsOn(p)[0];
  ok(r.drawn && !!sp && r.redlines === 0 && r.misses.some((m) => m.startsWith('redlines:')) && !sp.children.some((c) => String(c.name).startsWith('redline ')),
    `specs/no face: no redlines without a loaded face, and the run says so (${r.misses.filter((m) => m.startsWith('redlines')).join('; ')})`);
}
{
  // Update moves a live spec panel with its set, as it moves the usage panel.
  const { b, uh, targets, livePanel } = await roomPage('↳ Specs follow');
  const rs = await drawSpecPanel(uh as unknown as SpecApi, b, def('divider'));
  const sp = (b.parent as N).children.find((c) => c.getSharedPluginData!('prism3', 'specPanel'))!;
  const before = { dx: Number(sp.x) - Number(b.x), dy: Number(sp.y) - Number(b.y) };
  await applyUpdate(uh as never, uh as never, targets, previewHashOf(await previewUpdate(uh, targets)));
  const pb2 = livePanel(b);
  ok(rs.drawn && !!pb2 && Number(sp.x) - Number(b.x) === before.dx && Number(sp.y) - Number(b.y) === before.dy && Number(sp.x) === Number(pb2.x) + Number(pb2.width) + 40 && Number(sp.y) === Number(pb2.y),
    `specs/follows set: Update moves Divider to ${b.x}, and its spec panel with it, still beside its usage panel (${sp.x} vs ${Number(pb2?.x) + Number(pb2?.width) + 40})`);
}

if (failed) { console.error(`\n✗ ${failed} doc panel check(s) failed`); process.exit(1); }
console.log('\n✓ doc panel: every check passed');
