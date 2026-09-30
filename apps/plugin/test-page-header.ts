/**
 * PAGE-HEADER test (2026-09-27) — one `_Section-header` instance at the top of each component page.
 *
 *   npx tsx apps/plugin/test-page-header.ts
 *
 * Drives `page-header.ts` against an in-memory NODE SHIM of the `_Section-header` set (four Size variants,
 * each instancing a Text frame with Title/Description text and a `Description#…` boolean) and a page holding
 * built content. Five things are checked:
 *   1. the header COPY for a page — the family title and the primary def's summary, read off the REAL
 *      `componentDefs` registry and compared with literals copied from the def files;
 *   2. a FRESH page gets exactly one header: Size=Medium, the title and summary text, the Description
 *      boolean on, FIXED width / HUG height at the content's width (floored at the variant's own width, so
 *      80px of spinners does not squeeze the header into a column), x on the content's left edge and its
 *      bottom 80px above the content's top;
 *   3. a SECOND build adds no second header, fills text that still reads the placeholder, and leaves a
 *      user-edited description alone;
 *   4. a header whose Size the user changed to Small stays Small — and keeps its width and position;
 *   5. with NO `_Section-header` set in the file, the header is skipped and reported, never thrown;
 *   6. a file whose set is named `_section-header` (lowercase s, as in both of the owner's NB files, measured
 *      live 2026-09-27) gets its header placed, and a rebuild finds a header instanced from a lowercase
 *      duplicate of the set rather than adding a second.
 *
 * INDEPENDENCE (docs/34): every expected value is a literal written here — the Medium hug height is the
 * SHIM's number (120), the gap is 80 from the owner's decision, the summaries are copied from
 * `packages/engine/components/*.ts` — never read off `page-header.ts`'s own constants.
 *
 * BY-NAME MUTATIONS (each proven red, then restored — see docs/00-progress.md 2026-09-27):
 *   - `HEADER_VARIANT` set to `Size=XL` → "2: the header is Size=Medium" fails;
 *   - drop `inst.height` from the y arithmetic → "2: header bottom sits 80px above the content top" fails;
 *   - skip every instance in the existing-header search → "3: still exactly one header after a second
 *     build" fails;
 *   - write the text without the placeholder check → "3: the user-edited description is left alone" fails;
 *   - reset the Size on a rebuild (`n.setProperties?.({ Size: 'Medium' })` in the present branch) →
 *     "4: the header the user set to Small stays Small" fails;
 *   - drop the missing-set guard → "5: no set: skipped, not thrown" fails;
 *   - restore the exact-name set search (`n.name === SECTION_HEADER_SET` in `ensurePageHeader`) → "6: a
 *     `_section-header` set gets a header placed", "6: exactly one header on the page" and "6: the result says
 *     nothing about a missing header" fail;
 *   - restore the exact-name parent check in `isHeaderMain` → "6: a header from a `_section-header` duplicate
 *     counts as present; none added" fails.
 *
 * The shim's case-insensitive `headersOn` is its own comparison, written here — not `isTemplateSet`.
 */
import { ensurePageHeader, pageHeaderCopy, pageHeaderNote, displayName } from './src/page-header';
import type { HNode, HeaderPage, PageHeaderApi, HeaderCopy } from './src/page-header';
import { componentDefs } from '@prism3/engine/components/index';
import { placeNewSet, SET_GAP } from './src/write-components';

let failures = 0;
const ok = (cond: boolean, label: string): void => {
  if (!cond) { failures++; console.error(`  ✗ ${label}`); }
  else console.log(`  ✓ ${label}`);
};

// ── The shim ─────────────────────────────────────────────────────────────────────────────────────────
// A variant's HUG height, per Size — the shim's own numbers (a shim cannot lay out), chosen distinct so a
// header instanced from the wrong variant is visible in the y arithmetic as well as in its main component.
const HUG: Record<string, number> = { XL: 260, Large: 150, Medium: 120, Small: 90 };

interface ShimNode extends HNode {
  type: string;
  name: string;
  children: ShimNode[];
  parent: ShimNode | null;
}

const findIn = (n: ShimNode, pred: (x: HNode) => boolean): ShimNode | null => {
  for (const c of n.children) {
    if (pred(c)) return c;
    const deep = findIn(c, pred);
    if (deep) return deep;
  }
  return null;
};

const textNode = (name: string, characters: string, style: string): ShimNode => ({
  type: 'TEXT', name, characters, fontName: { family: 'Inter', style }, children: [], parent: null,
});

/** The `_Section-header` set: four variants, each able to instance itself. An instance's height is its
 *  main component's HUG height while `layoutSizingVertical` is HUG, else whatever `resize` last set. Its
 *  `setProperties({ Size })` swaps the main component, the way a designer's Size change does. */
const makeHeaderSet = (id = 'set:hdr', name = '_Section-header'): ShimNode => {
  const set: ShimNode = { id, type: 'COMPONENT_SET', name, children: [], parent: null };
  const variant = (size: string): ShimNode => {
    // Every variant authored 1000 wide — the shim's own number, below the 1200/1500 content the arms place
    // over, and distinct from an instance's starting 2517, so the floor reads the VARIANT.
    const v: ShimNode = { id: `v:${size}`, type: 'COMPONENT', name: `Size=${size}`, width: 1000, children: [], parent: set };
    const text: ShimNode = { type: 'FRAME', name: 'Text', children: [textNode('Title', 'Section header', 'Bold'), textNode('Description', 'Descriptive Text', 'Regular')], parent: v };
    v.children.push(text);
    v.findOne = (p) => findIn(v, p);
    v.createInstance = () => makeInstance(v);
    return v;
  };
  set.children.push(...['XL', 'Large', 'Medium', 'Small'].map(variant));
  return set;
};

const makeInstance = (main: ShimNode): ShimNode => {
  let mainNow = main;
  let width = 2517;
  let fixedHeight = 1;
  const props: Record<string, { type: string; value: unknown }> = { 'Description#12:0': { type: 'BOOLEAN', value: false } }; // starts OFF, so the arm below needs the placement to turn it on
  const inst = {
    type: 'INSTANCE', name: '_Section-header', x: 0, y: 0, parent: null,
    children: [{ type: 'FRAME', name: 'Text', children: [textNode('Title', 'Section header', 'Bold'), textNode('Description', 'Descriptive Text', 'Regular')], parent: null }],
    componentProperties: props,
    get width() { return width; },
    get height() { return inst.layoutSizingVertical === 'HUG' ? HUG[mainNow.name.slice('Size='.length)] : fixedHeight; },
    resize(w: number, h: number) { width = w; fixedHeight = h; },
    findOne(p: (n: HNode) => boolean) { return findIn(inst as ShimNode, p); },
    async getMainComponentAsync() { return mainNow; },
    setProperties(p: Record<string, string | boolean>) {
      for (const [k, v] of Object.entries(p)) {
        if (k === 'Size') mainNow = mainNow.parent!.children.find((c) => c.name === `Size=${v}`)!;
        else if (props[k]) props[k] = { ...props[k], value: v };
      }
    },
    layoutSizingHorizontal: undefined as unknown,
    layoutSizingVertical: undefined as unknown,
  };
  return inst as unknown as ShimNode;
};

const makePage = (name: string, content: { name: string; x: number; y: number; width: number; height: number }[]): HeaderPage & { children: HNode[] } => {
  const children: HNode[] = content.map((c) => ({ type: 'COMPONENT_SET', ...c }));
  return { name, children, appendChild(c: unknown) { children.push(c as HNode); } };
};

const makeApi = (sets: ShimNode[]): { api: PageHeaderApi; fontsLoaded: string[] } => {
  const fontsLoaded: string[] = [];
  return {
    fontsLoaded,
    api: {
      root: { findAllWithCriteria: () => sets },
      async loadFontAsync(f) { fontsLoaded.push(`${f.family} ${f.style}`); },
    },
  };
};

/** Every top-level header instance on a page (by main component — what a designer sees in the layers). */
const headersOn = async (page: { children: readonly HNode[] }): Promise<ShimNode[]> => {
  const out: ShimNode[] = [];
  for (const n of page.children) {
    if (n.type !== 'INSTANCE') continue;
    const m = await n.getMainComponentAsync?.();
    if (m?.parent?.name?.toLowerCase() === '_section-header') out.push(n as ShimNode);
  }
  return out;
};
const textOf = (n: HNode, name: string): string | undefined => n.findOne?.((x) => x.type === 'TEXT' && x.name === name)?.characters;

// The literal copy — from `packages/engine/components/button.ts` and `checkbox-control.ts`.
const BUTTON_SUMMARY = 'Triggers an action in place. For navigation, use a link.';
const CHECKBOX_ROW_SUMMARY = 'Labeled checkbox for a staged on/off choice. The whole row is the hit target.';
const BUTTON_COPY: HeaderCopy = { title: 'Button', description: BUTTON_SUMMARY, primary: 'button' };

// ── 1. The copy ──────────────────────────────────────────────────────────────────────────────────────
console.log('1. header copy for a page');
{
  const neutral = pageHeaderCopy('button-neutral', componentDefs);
  ok(neutral?.title === 'Button', `1: a Buttons-page def titles the page by its family, "Button" (got ${JSON.stringify(neutral?.title)})`);
  ok(neutral?.description === BUTTON_SUMMARY, '1: the Buttons page carries the primary def\'s (button) summary');
  const row = pageHeaderCopy('checkbox-row', componentDefs);
  ok(row?.title === 'Checkbox', `1: Checkbox.Row titles its page "Checkbox" (got ${JSON.stringify(row?.title)})`);
  ok(row?.description === CHECKBOX_ROW_SUMMARY, '1: the Checkbox page carries the Row\'s summary, not the nested Control\'s (#1711 net)');
  ok(displayName('IconButton') === 'Icon button' && displayName('TextField') === 'Text field' && displayName('Checkbox.Row') === 'Checkbox',
    `1: titles are sentence-case display names (got ${displayName('IconButton')} / ${displayName('TextField')} / ${displayName('Checkbox.Row')})`);
  ok(pageHeaderCopy('veil', componentDefs)?.title === 'Veil', '1: a single-def page takes the def name ("Veil")');
  ok(pageHeaderCopy('not-a-real-def', componentDefs) === null, '1: an unmapped def has no page, so no header copy');
}

// ── 2. A fresh page ──────────────────────────────────────────────────────────────────────────────────
console.log('1b. a header anywhere on the page, and hidden nodes (#1711 net)');
{
  // A DETACHED header (a FRAME named _Section-header) inside a Section: present, so no second header is added.
  const set = makeHeaderSet();
  const { api } = makeApi([set]);
  const detached: HNode = { type: 'FRAME', name: '_Section-header', x: 0, y: -200, width: 1200, height: 152 };
  const section: HNode = { type: 'SECTION', name: 'Header', x: 0, y: -300, width: 1300, height: 300, children: [detached] };
  const base = makePage('↳ Buttons', [{ name: 'Button', x: 0, y: 0, width: 1200, height: 800 }]);
  base.children.push(section);
  const flat = (ns: readonly HNode[]): HNode[] => ns.flatMap((n) => [n, ...flat(n.children ?? [])]);
  const page = { ...base, findAllWithCriteria: (c: { types: string[] }) => flat(base.children).filter((n) => c.types.includes(String(n.type))) };
  const out = await ensurePageHeader(api, page, BUTTON_COPY);
  ok(out.status === 'present' && base.children.filter((n) => n.type === 'INSTANCE').length === 0,
    `1b: a detached header inside a Section counts as present; none is added (got ${out.status})`);
  // A HIDDEN node far to the right does not widen the header.
  const page2 = makePage('↳ Buttons', [{ name: 'Button', x: 0, y: 0, width: 1200, height: 800 }]);
  page2.children.push({ type: 'FRAME', name: 'scratch', x: 5000, y: 0, width: 100, height: 100, visible: false });
  const out2 = await ensurePageHeader(api, page2, BUTTON_COPY);
  ok(out2.status === 'placed' && out2.width === 1200, `1b: a hidden node does not widen the header (width ${out2.status === 'placed' ? out2.width : '—'}, expected 1200)`);
}

console.log('2. a fresh page gets exactly one header');
{
  const set = makeHeaderSet();
  const { api, fontsLoaded } = makeApi([set]);
  // Two sets on the page: Button at the origin, Button.Neutral below it and wider — the content spans
  // x 0..1500 and starts at y 0.
  const page = makePage('↳ Buttons', [
    { name: 'Button', x: 0, y: 0, width: 1200, height: 800 },
    { name: 'Button.Neutral', x: 0, y: 900, width: 1500, height: 800 },
  ]);
  const out = await ensurePageHeader(api, page, BUTTON_COPY);
  const hs = await headersOn(page);
  ok(out.status === 'placed', `2: reported as placed (got ${out.status})`);
  ok(hs.length === 1, `2: exactly one header on the page (got ${hs.length})`);
  const h = hs[0];
  const main = await h?.getMainComponentAsync?.();
  ok(main?.name === 'Size=Medium', `2: the header is Size=Medium (got ${main?.name})`);
  ok(textOf(h, 'Title') === 'Button', `2: Title reads "Button" (got ${JSON.stringify(textOf(h, 'Title'))})`);
  ok(textOf(h, 'Description') === BUTTON_SUMMARY, '2: Description reads the button summary');
  ok(h?.componentProperties?.['Description#12:0']?.value === true, '2: the Description boolean is on');
  ok(h?.layoutSizingHorizontal === 'FIXED' && h?.layoutSizingVertical === 'HUG', '2: FIXED width, HUG height');
  ok(h?.width === 1500, `2: width matches the content, 1500 (got ${h?.width})`);
  ok(h?.x === 0, `2: x on the content's left edge, 0 (got ${h?.x})`);
  // Medium hugs to 120 in the shim, so the header spans y -200..-80: its bottom 80px above the content at 0.
  ok(h?.y === -200 && (h.y ?? 0) + (h.height ?? 0) === -80, `2: header bottom sits 80px above the content top (y ${h?.y}, height ${h?.height})`);
  ok(fontsLoaded.includes('Inter Bold') && fontsLoaded.includes('Inter Regular'), '2: both text faces loaded before the text was set');

  // Content that does not start at the origin: the header follows its left edge and top.
  const page2 = makePage('↳ Veil', [{ name: 'Veil', x: 40, y: 100, width: 600, height: 300 }]);
  await ensurePageHeader(api, page2, { title: 'Veil', description: 'x', primary: 'veil' });
  const [h2] = await headersOn(page2);
  ok(h2?.x === 40 && h2?.y === -100 && h2?.width === 1000, `2: offset content — x 40, y -100, and 600px content floored to the variant's 1000 (got x ${h2?.x}, y ${h2?.y}, width ${h2?.width})`);

  // Narrow content, measured live: the Spinner page's four sizes span 80px, and the header took that width.
  const page3 = makePage('↳ Spinner', [{ name: 'spinner/x-small', x: 0, y: 0, width: 16, height: 16 }, { name: 'spinner/large', x: 48, y: 48, width: 32, height: 32 }]);
  const out3 = await ensurePageHeader(api, page3, { title: 'Spinner', description: 'x', primary: 'spinner' });
  const [h3] = await headersOn(page3);
  ok(out3.status === 'placed' && out3.width === 1000 && h3?.width === 1000, `2: 80px content gets a header at the variant's own width, 1000, never 80 (reported ${out3.status === 'placed' ? out3.width : '—'}, got ${h3?.width})`);
}

// ── 2b. Sets side by side (#1750) ─────────────────────────────────────────────────────────────────────
// The component build now places a new set 160px right of its siblings, top-aligned (`placeNewSet`), and the
// header is placed once the run's builds are done. So the header's first measurement sees the family side by
// side: here a 200px control at 0 and a 200px row at 360 (200 + 160). The header spans both, floored at the
// variant's 1000. And the NEXT set placed on that page goes beside the row (560 + 160 = 720), not past the
// wider header above it (1000 + 160): the header sits outside the sets' row.
console.log('2b. sets side by side, then a third set');
{
  const set = makeHeaderSet();
  const { api } = makeApi([set]);
  const page = makePage('↳ Checkbox', [
    { name: 'checkbox-control', x: 0, y: 0, width: 200, height: 300 },
    { name: 'checkbox-row', x: 360, y: 0, width: 200, height: 300 },
  ]);
  const out = await ensurePageHeader(api, page, { title: 'Checkbox', description: 'x', primary: 'checkbox-row' });
  const [h] = await headersOn(page);
  ok(out.status === 'placed' && h?.x === 0 && h?.y === -200 && h?.width === 1000,
    `2b: the header starts at the first set's left edge and spans both, floored at 1000 (got x ${h?.x}, y ${h?.y}, width ${h?.width})`);
  const boxes = page.children.map((n) => ({ type: n.type, x: n.x ?? 0, y: n.y ?? 0, width: n.width ?? 0, height: n.height ?? 0 }));
  const next = placeNewSet(boxes, 300);
  ok(next?.x === 720 && next?.y === 0 && SET_GAP === 160,
    `2b: a third set goes beside the row at 720,0, not past the wider header above it (got ${next ? `${next.x},${next.y}` : 'null'})`);
}

// ── 3. A second build ────────────────────────────────────────────────────────────────────────────────
console.log('3. a second build adds no second header and keeps user text');
{
  const set = makeHeaderSet();
  const { api } = makeApi([set]);
  const page = makePage('↳ Buttons', [{ name: 'Button', x: 0, y: 0, width: 1200, height: 800 }]);
  await ensurePageHeader(api, page, BUTTON_COPY);
  const [h] = await headersOn(page);
  const desc = h.findOne!((x) => x.type === 'TEXT' && x.name === 'Description')!;
  desc.characters = 'Our three button intents.';
  const again = await ensurePageHeader(api, page, BUTTON_COPY);
  ok(again.status === 'present', `3: the rebuild finds the header already there (got ${again.status})`);
  ok((await headersOn(page)).length === 1, `3: still exactly one header after a second build`);
  ok(textOf(h, 'Description') === 'Our three button intents.', `3: the user-edited description is left alone (got ${JSON.stringify(textOf(h, 'Description'))})`);

  // A header whose text still reads the placeholder (a font was unavailable on the first build, or the
  // designer dropped it in by hand) is filled on the rebuild.
  const page2 = makePage('↳ Buttons', [{ name: 'Button', x: 0, y: 0, width: 1200, height: 800 }]);
  const handPlaced = set.children.find((c) => c.name === 'Size=Medium')!.createInstance!();
  handPlaced.x = 0; handPlaced.y = -300;
  page2.appendChild(handPlaced);
  const r = await ensurePageHeader(api, page2, BUTTON_COPY);
  ok(r.status === 'present' && (await headersOn(page2)).length === 1, '3: a hand-placed header is found by its main component; none added');
  ok(textOf(handPlaced, 'Title') === 'Button' && textOf(handPlaced, 'Description') === BUTTON_SUMMARY, '3: placeholder text is filled on the rebuild');
  ok(handPlaced.y === -300, '3: the hand-placed header is not moved');
}

// ── 4. The user's Size survives ──────────────────────────────────────────────────────────────────────
console.log('4. a header the user set to Small stays Small');
{
  const set = makeHeaderSet();
  const { api } = makeApi([set]);
  const page = makePage('↳ Buttons', [{ name: 'Button', x: 0, y: 0, width: 1200, height: 800 }]);
  await ensurePageHeader(api, page, BUTTON_COPY);
  const [h] = await headersOn(page);
  h.setProperties!({ Size: 'Small' });
  h.resize!(900, 1);
  h.x = 24;
  await ensurePageHeader(api, page, BUTTON_COPY);
  const main = await h.getMainComponentAsync!();
  ok(main?.name === 'Size=Small', `4: the header the user set to Small stays Small (got ${main?.name})`);
  ok(h.width === 900, `4: the user's width is kept, 900 (got ${h.width})`);
  ok(h.x === 24, `4: the user's position is kept (x ${h.x})`);
  ok((await headersOn(page)).length === 1, '4: still one header');
}

// ── 5. No header set ─────────────────────────────────────────────────────────────────────────────────
console.log('5. no _Section-header set in the file');
{
  const { api } = makeApi([]);
  const page = makePage('↳ Buttons', [{ name: 'Button', x: 0, y: 0, width: 1200, height: 800 }]);
  let out: Awaited<ReturnType<typeof ensurePageHeader>> | null = null;
  let threw: string | null = null;
  try { out = await ensurePageHeader(api, page, BUTTON_COPY); } catch (e) { threw = (e as Error).message; }
  ok(threw === null && out?.status === 'skipped' && out.reason === 'no-set', `5: no set: skipped, not thrown (${threw ?? JSON.stringify(out)})`);
  ok(page.children.length === 1, `5: nothing added to the page (got ${page.children.length} nodes)`);
  const note = out ? pageHeaderNote([out]) : '';
  ok(note === '. No header on ↳ Buttons: this file has no _Section-header component, and Set up file adds it', `5: the build result says why and what adds it (got ${JSON.stringify(note)})`);
  ok(pageHeaderNote([]) === '', '5: no header outcome, no clause');
  ok(pageHeaderNote([{ page: '↳ Buttons', status: 'placed', x: 0, y: -200, width: 1500, written: ['Title', 'Description'], fontMisses: [] }]) === '. Header added to ↳ Buttons', '5: a placed header is named in the result');
}

// ── 6. The set's name in another case ────────────────────────────────────────────────────────────────
console.log('6. a file whose header set is named _section-header');
{
  // Both of the owner's NB files name the set `_section-header` (measured live, 2026-09-27).
  const set = makeHeaderSet('set:lower', '_section-header');
  const { api } = makeApi([set]);
  const page = makePage('↳ Veil', [{ name: 'Veil', x: 0, y: 0, width: 600, height: 300 }]);
  const out = await ensurePageHeader(api, page, { title: 'Veil', description: 'x', primary: 'veil' });
  ok(out.status === 'placed', `6: a \`_section-header\` set gets a header placed (got ${out.status}${out.status === 'skipped' ? ` / ${out.reason}` : ''})`);
  ok((await headersOn(page)).length === 1, '6: exactly one header on the page');
  const note = pageHeaderNote([out]);
  ok(!note.includes('No header'), `6: the result says nothing about a missing header (got ${JSON.stringify(note)})`);

  // A rebuild in a file holding BOTH cases: the set search finds `_Section-header` (set:a), and the page's
  // header was instanced from a `_section-header` duplicate (set:b) — present by its set's name, so no second.
  const upper = makeHeaderSet('set:a', '_Section-header');
  const lower = makeHeaderSet('set:b', '_section-header');
  const { api: api2 } = makeApi([upper, lower]);
  const page2 = makePage('↳ Buttons', [{ name: 'Button', x: 0, y: 0, width: 1200, height: 800 }]);
  const fromDup = lower.children.find((c) => c.name === 'Size=Medium')!.createInstance!();
  fromDup.x = 0; fromDup.y = -300;
  page2.appendChild(fromDup);
  const again = await ensurePageHeader(api2, page2, BUTTON_COPY);
  const instances = page2.children.filter((n) => n.type === 'INSTANCE').length;
  ok(again.status === 'present' && instances === 1,
    `6: a header from a \`_section-header\` duplicate counts as present; none added (got ${again.status}, ${instances} instances)`);
}

console.log(failures === 0 ? '\npage-header: all assertions pass' : `\npage-header: ${failures} FAILED`);
if (failures > 0) process.exit(1);
