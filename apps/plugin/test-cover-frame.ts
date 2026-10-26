/**
 * THE LIBRARY COVER (#2859; redesigned #2915, owner decision Q1–Q5 A) — drawn by Set up file, kept current by Update,
 * never replacing a designer's thumbnail or their edits.
 *
 *   npx tsx apps/plugin/test-cover-frame.ts
 *
 *   cover/…      a first draw: 1920 × 1080 on the Cover page; the name, "Design system" and "v<engine>" and no other
 *                text; the ground bound to `background/primary`, the name's ink to `text/brand`, the subtitle's and the
 *                version's to `text/secondary`; the fonts bound to the display and body variables; the wireframe's
 *                geometry (direction A); an empty logo slot top-right; placeholders with no theme.
 *   bound/…      every paint on a drawn cover is bound to a theme variable, none written as a literal.
 *   fit/…        a long name wraps inside the 240 px inset, and the block stays centered.
 *   thumb/…      the thumbnail rule: set only while it is Figma's default; a designer's frame is never replaced.
 *   due/…        what the dry run reads: missing, stale for a new engine or name, current, and their lines.
 *   refresh/…    an unedited cover is refreshed in place: the same node, its place kept, the version and name set,
 *                placeholders bound once the theme's variables exist.
 *   logo/…       a logo pasted into the slot is not a hand edit: the name and the version keep updating, and the
 *                logo and the name are both kept.
 *   name/…       the name shown: `name`, else the id made readable (Q5 A), and the lines say no display name is set.
 *   redraw/…     an unedited cover the first design drew (#2859) is redrawn in this design in the same frame; an
 *                edited one is kept, "(edited)", and only its version text moves.
 *   edited/…     a cover edited by hand keeps every edit, and only its tagged version text moves (Q?4 B); with that
 *                text deleted nothing is written and the result says so.
 *   page/…       no Cover page, no brand: nothing drawn, and why.
 *   contrast/…   the cover's inks hold 4.5:1 on its ground, measured here, for every example brand and mode.
 *   setup/…      Set up file draws the cover on the Cover page it scaffolds.
 *   update/…     through a real Update in the component shim: version and name reach an unedited cover, a first-design
 *                cover is redrawn, Documentation's Cover off is respected.
 *
 * INDEPENDENCE (docs/34): the host below is written here, not derived from `cover-frame.ts`: it measures text from its
 * characters and size, refuses a characters write on an unloaded font as Figma does, and resolves variables by name.
 * Every expected string and number is a literal from the approved wireframe (#2915, direction A) and the owner's
 * Q1–Q5 A, never built from the module's helpers. Contrast is computed here from the engine's emitted hex (WCAG 2.x),
 * not read off the engine's own `ratio`. The first design's fingerprint is a literal, computed once by #2859's own
 * `coverPrint` on the fixture below, so a change to how the print reads an old cover fails here.
 *
 * BY-NAME MUTATIONS (the PR body lists them): one paint written as a literal (`addText`'s `paint`) → `bound/every paint
 * on the cover is bound`; the version write skipped on an unedited cover → `update/version refreshed`; `coverPrint`
 * reading the logo slot → `logo/content in the slot is not a hand edit`; the readable fallback back to the id as
 * written → `name/the readable fallback`; the thumbnail set over a designer's frame → `thumb/never replaces a
 * designer's thumbnail`; an edited cover's other layer rewritten → `edited/only the version text moves`; an edited
 * first-design cover redrawn → `redraw/an edited first-design cover is kept`; the name's ink bound to `text/tertiary` →
 * `contrast/the cover's inks hold 4.5:1`; Update ignoring Documentation's Cover off → `update/cover off` (#2995).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { brandTheme, type BrandInput } from '@prism3/engine/theme';
import { resolveAllModes } from '@prism3/engine/modes';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { serializeBrandInput } from '@prism3/engine/persist-input';
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { applyComponentPlan } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { makeShim, type Node } from './component-shim';
import { previewUpdate, previewVerdict } from './src/update-plan';
import { applyUpdate, applyVerdict, previewHashOf, type ApplyHost } from './src/update-apply';
import { ABOUT_KEY } from './src/about-frame';
import { scaffoldSkeleton, type PagesApi, type PageLike } from './src/file-setup';
import { TAXONOMY } from './src/file-taxonomy';
import {
  COVER_KEY, COVER_NS, GROUND_VARIABLE, NAME_INK_VARIABLE, TEXT_INK_VARIABLE, brandNameOf, coverDue, coverDueLine, coverIsWork, coverLine, coverPrint,
  drawCover, readableId, type CoverApi,
} from './src/cover-frame';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const section = (s: string) => console.log(`\n${s}`);
const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/* ── the host ────────────────────────────────────────────────────────────────────────────────────────── */
type N = Record<string, any>;
type Var = { id: string; name: string; value?: unknown };
const key = (f: { family: string; style: string }) => `${f.family}|${f.style}`;

const host = (o: { vars?: Var[]; refuseFonts?: string[]; thumb?: N | null; thumbApi?: boolean } = {}) => {
  const loaded = new Set<string>();
  let nid = 0;
  const vars = o.vars ?? [];
  const node = (type: string): N => {
    const data = new Map<string, string>();
    const n: N = {
      id: `${type}:${++nid}`, type, name: type, visible: true, x: 0, y: 0, fills: [], strokes: [], boundVariables: {}, children: [], parent: null,
      _w: 100, _h: 100,
      resize(w: number, h: number) { n._w = w; n._h = h; },
      appendChild(c: N) { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = n; n.children.push(c); },
      remove() { if (n.parent) n.parent.children.splice(n.parent.children.indexOf(n), 1); n.parent = null; n.removed = true; },
      getSharedPluginData: (ns: string, k: string) => data.get(`${ns}/${k}`) ?? '',
      setSharedPluginData: (ns: string, k: string, v: string) => { if (v) data.set(`${ns}/${k}`, v); else data.delete(`${ns}/${k}`); },
      setBoundVariable(field: string, v: Var | null) {
        if (v === null) { delete n.boundVariables[field]; return; }
        // A bound font field resolves to the variable's value, which must be loaded, as Figma requires.
        if (field === 'fontFamily' || field === 'fontStyle') {
          const next = { ...n.fontName, [field === 'fontFamily' ? 'family' : 'style']: v.value };
          if (!loaded.has(key(next))) throw new Error(`unloaded font ${key(next)}`);
          n._font = next;
        }
        n.boundVariables[field] = { type: 'VARIABLE_ALIAS', id: v.id };
      },
    };
    if (type === 'TEXT') {
      n._font = { family: 'Inter', style: 'Regular' };
      n._chars = '';
      n.fontSize = 12;
      n.textAutoResize = 'NONE';
      Object.defineProperty(n, 'fontName', { get: () => n._font, set(f) { if (!loaded.has(key(f))) throw new Error(`unloaded font ${key(f)}`); n._font = { ...f }; }, enumerable: true });
      Object.defineProperty(n, 'characters', { get: () => n._chars, set(s) { if (!loaded.has(key(n._font))) throw new Error(`unloaded font ${key(n._font)}`); n._chars = s; }, enumerable: true });
    }
    // A hugging text measures its characters at its size; a fixed or wrapping one keeps the width it was given.
    Object.defineProperty(n, 'width', { get: () => (type === 'TEXT' && n.textAutoResize === 'WIDTH_AND_HEIGHT' ? Math.round(n._chars.length * n.fontSize * 0.55) : n._w), enumerable: true });
    Object.defineProperty(n, 'height', { get: () => (type === 'TEXT' && n.textAutoResize !== 'NONE' ? Math.round(n.fontSize * (n.textAutoResize === 'HEIGHT' ? Math.ceil(n._chars.length * n.fontSize * 0.55 / n._w) : 1)) : n._h), enumerable: true });
    return n;
  };
  const api: CoverApi & N = {
    createFrame: () => node('FRAME') as never,
    createText: () => node('TEXT') as never,
    loadFontAsync: async (f: { family: string; style: string }) => { if (o.refuseFonts?.includes(key(f))) throw new Error('no font'); loaded.add(key(f)); },
    variables: {
      getLocalVariablesAsync: async () => vars.map((v) => ({ ...v, resolveForConsumer: () => ({ value: v.value }) })),
      setBoundVariableForPaint: ((p: N, field: string, v: Var) => ({ ...p, boundVariables: { [field]: { type: 'VARIABLE_ALIAS', id: v.id } } })) as never,
    },
    _thumb: o.thumb ?? null,
    _thumbSets: 0,
  };
  if (o.thumbApi !== false) {
    api.getFileThumbnailNodeAsync = async () => api._thumb;
    api.setFileThumbnailNodeAsync = async (n: unknown) => { api._thumb = n; api._thumbSets++; };
  }
  const page = (name: string): N => ({ name, children: [] as N[], appendChild(c: N) { if (c.parent) c.parent.children.splice(c.parent.children.indexOf(c), 1); c.parent = this; this.children.push(c); } });
  const cover = page('Cover');
  return { api, node, cover, root: { children: [cover, page('Components')] } };
};

/** A brand's variables as the emission names them, under a root of its own. */
const themeVars = (root = 'ads'): Var[] => [
  { id: 'V:ground', name: `${root}/color/background/primary` },
  { id: 'V:brand', name: `${root}/color/text/brand` },
  { id: 'V:sec', name: `${root}/color/text/secondary` },
  { id: 'V:tert', name: `${root}/color/text/tertiary` },
  { id: 'V:fg', name: `${root}/color/foreground/brand` },
  { id: 'V:ink', name: `${root}/color/text/on-brand` },
  { id: 'V:primary', name: `${root}/color/text/primary` },
  { id: 'V:inv', name: `${root}/color/inverse/foreground/brand` },
  { id: 'V:dfam', name: `${root}/core/font/family/display`, value: 'Clash Display' },
  { id: 'V:dsty', name: `${root}/core/font/style/display/strong`, value: 'Semibold' },
  { id: 'V:bfam', name: `${root}/core/font/family/body`, value: 'Inter' },
  { id: 'V:bsty', name: `${root}/core/font/style/body/default`, value: 'Regular' },
];
const texts = (n: N): N[] => n.type === 'TEXT' ? [n] : (n.children as N[]).flatMap(texts);
const tagged = (page: N): N[] => page.children.filter((n: N) => n.getSharedPluginData(COVER_NS, COVER_KEY));
const part = (n: N, p: string): N | undefined => texts(n).find((t) => t.getSharedPluginData(COVER_NS, 'cover-part') === p);
const slotOf = (n: N): N | undefined => (n.children as N[]).find((c) => c.type === 'FRAME' && c.getSharedPluginData(COVER_NS, 'cover-part') === 'logo');
const all = (n: N): N[] => [n, ...((n.children ?? []) as N[]).flatMap(all)];
const chars = (n: N): string[] => texts(n).map((t) => t.characters);
const fillVar = (n: N): string | undefined => n.fills?.[0]?.boundVariables?.color?.id;


/**
 * A COVER THE FIRST DESIGN DREW (#2859), built here by hand as `drawCover` drew it then: a brand-color ground, the
 * wordmark at 240 px and "Prism3 <engine>" at 64 px, both bound to `text/on-brand`, and a record with no `design`.
 * `FIRST_PRINT` is that fixture's fingerprint as #2859's own `coverPrint` read it (computed once from the code at
 * ae758a99, pasted here), so the record a real file carries still reads as unedited.
 */
const FIRST_PRINT = 'deb012876b6738a7';
const firstDesign = async (f: ReturnType<typeof host>, o: { engine: string; at?: N }): Promise<N> => {
  await f.api.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
  await f.api.loadFontAsync({ family: 'Inter', style: 'Regular' });
  const bound = (id: string) => [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0.2, g: 0.2, b: 0.8 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id } } }];
  const fr = f.node('FRAME');
  fr.name = 'Cover'; fr.resize(1920, 1080); fr.clipsContent = true; fr.fills = bound('V:fg');
  (o.at ?? f.cover).appendChild(fr);
  const text = (part: string, chars: string, face: string, size: number, y: number): N => {
    const t = f.node('TEXT');
    t.name = part; t.setSharedPluginData('prism3', 'cover-part', part); fr.appendChild(t);
    t.fontName = { family: 'Inter', style: face }; t.fills = bound('V:ink'); t.characters = chars; t.fontSize = size; t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.x = 120; t.y = y;
    return t;
  };
  text('brand', 'Harbor', 'Semi Bold', 240, 360);
  text('version', `Prism3 ${o.engine}`, 'Regular', 64, 906);
  fr.setSharedPluginData('prism3', 'cover', JSON.stringify({ engine: o.engine, name: 'Harbor', print: FIRST_PRINT }));
  return fr;
};

/* ── cover ───────────────────────────────────────────────────────────────────────────────────────────── */
section('cover — a first draw on a themed file (direction A)');
{
  const f = host({ vars: themeVars() });
  ok(eq(await coverDue(f.root, { brand: 'Aurora', engine: '0.237.0', api: f.api }), { state: 'missing' }), 'cover/due: a Cover page with no cover reads missing');
  const o = await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.237.0' });
  const fr = tagged(f.cover);
  ok(o.did === 'drawn' && fr.length === 1 && fr[0].name === 'Cover', `cover/one frame, named Cover (${fr.map((n) => n.name)})`);
  ok(fr[0].width === 1920 && fr[0].height === 1080 && fr[0].x === 0 && fr[0].y === 0, `cover/1920 × 1080 at the origin of an empty page (${fr[0].width} × ${fr[0].height} at ${fr[0].x}, ${fr[0].y})`);
  ok(eq(chars(fr[0]), ['Aurora', 'Design system', 'v0.237.0']), `cover/the name, the subtitle and the version, and no other text (${JSON.stringify(chars(fr[0]))})`);
  ok(fillVar(fr[0]) === 'V:ground', `cover/ground bound to background/primary (${JSON.stringify(fr[0].fills)})`);
  const nm = part(fr[0], 'brand')!;
  const sub = part(fr[0], 'subtitle')!;
  const ver = part(fr[0], 'version')!;
  ok(fillVar(nm) === 'V:brand', `cover/the name's ink bound to text/brand (${fillVar(nm)})`);
  ok(fillVar(sub) === 'V:sec' && fillVar(ver) === 'V:sec', `cover/the subtitle's and the version's ink bound to text/secondary (${fillVar(sub)}, ${fillVar(ver)})`);
  ok(nm.boundVariables.fontFamily?.id === 'V:dfam' && nm.boundVariables.fontStyle?.id === 'V:dsty' && eq(nm.fontName, { family: 'Clash Display', style: 'Semibold' }),
    `cover/the name in the display face, bound (${JSON.stringify(nm.boundVariables)}; ${JSON.stringify(nm.fontName)})`);
  ok([sub, ver].every((t) => t.boundVariables.fontFamily?.id === 'V:bfam' && t.boundVariables.fontStyle?.id === 'V:bsty'), 'cover/the subtitle and the version in the body face, bound');
  // The wireframe's numbers: the name 120 px, 110 % leading, −1 % tracking, centered inside a 240 px inset; the
  // subtitle 36 px, 28 px under it; the pair centered on the frame (120 + 28 + 36 = 184 tall here, so 448 down).
  ok(nm.fontSize === 120 && eq(nm.lineHeight, { value: 110, unit: 'PERCENT' }) && eq(nm.letterSpacing, { value: -1, unit: 'PERCENT' }) && nm.textAlignHorizontal === 'CENTER',
    `cover/the name at 120 px, 110 % leading, −1 % tracking, centered (${nm.fontSize}, ${JSON.stringify(nm.lineHeight)}, ${JSON.stringify(nm.letterSpacing)}, ${nm.textAlignHorizontal})`);
  ok(nm.x === 240 && nm.width === 1440 && nm.textAutoResize === 'HEIGHT' && nm.y === 448, `cover/the name wraps inside the 240 px inset, the block centered (${nm.x}, ${nm.width}, ${nm.textAutoResize}, ${nm.y})`);
  ok(sub.fontSize === 36 && sub.textAlignHorizontal === 'CENTER' && sub.x === 240 && sub.width === 1440 && sub.y === 448 + 120 + 28,
    `cover/the subtitle at 36 px, 28 px under the name, centered (${sub.fontSize}, ${sub.x}, ${sub.y})`);
  ok(ver.fontSize === 28 && ver.x === 96 && ver.y === 1080 - 96 - 28, `cover/the version at 28 px, 96 px in from the bottom-left corner (${ver.fontSize}, ${ver.x}, ${ver.y})`);
  const slot = slotOf(fr[0]);
  ok(!!slot && slot.name === 'Logo' && slot.x === 1920 - 96 - 200 && slot.y === 96 && slot.width === 200 && slot.height === 72 && slot.children.length === 0 && eq(slot.fills, []),
    `cover/an empty logo slot, 200 × 72, 96 px in from the top-right corner (${slot?.name} at ${slot?.x}, ${slot?.y}, ${slot?.width} × ${slot?.height}, ${slot?.children.length} children)`);
  ok(o.thumbnail === 'set' && f.api._thumb === fr[0], `cover/set as the file thumbnail while it was the default (${JSON.stringify(o.thumbnail)})`);
  ok(coverLine(o) === 'Cover: drawn and set as the file thumbnail.', `cover/result line (${coverLine(o)})`);
  ok(eq(await coverDue(f.root, { brand: 'Aurora', engine: '0.237.0', api: f.api }), { state: 'current' }), 'cover/current after drawing');
  // A page with something on it: the cover goes past it, never on top of it.
  const g = host({ vars: themeVars() });
  const art = g.node('FRAME'); art.resize(300, 200); g.cover.appendChild(art); art.x = 10; art.y = 20;
  await drawCover(g.api, g.root, { brand: 'Aurora', engine: '0.237.0' });
  ok(tagged(g.cover)[0].x === 350 && tagged(g.cover)[0].y === 20, `cover/past what the page holds (${tagged(g.cover)[0].x}, ${tagged(g.cover)[0].y})`);
}

section('cover — no theme yet: placeholders, bound by a later Update');
{
  const f = host();
  const o = await drawCover(f.api, f.root, { brand: 'harbor', engine: '0.237.0' });
  const fr = tagged(f.cover)[0];
  ok(o.did === 'drawn' && !fillVar(fr) && texts(fr).every((t) => !fillVar(t) && !t.boundVariables.fontFamily), 'cover/no variables: drawn on placeholders, unbound');
  ok(eq(part(fr, 'brand')!.fontName, { family: 'Inter', style: 'Semi Bold' }) && eq(part(fr, 'version')!.fontName, { family: 'Inter', style: 'Regular' }), 'cover/no variables: the fallback faces');
  ok(eq(chars(fr), ['harbor', 'Design system', 'v0.237.0']), 'cover/a name passed in is shown as given');
}

/* ── bound ───────────────────────────────────────────────────────────────────────────────────────────── */
section('bound — every color on the cover is a theme variable');
{
  const f = host({ vars: themeVars() });
  await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.237.0' });
  const fr = tagged(f.cover)[0];
  const paints = all(fr).flatMap((n) => [...(n.fills ?? []), ...(n.strokes ?? [])].map((p: N) => [n.name, p] as const));
  const literal = paints.filter(([, p]) => typeof p.boundVariables?.color?.id !== 'string');
  ok(paints.length === 4 && literal.length === 0, `bound/every paint on the cover is bound (${paints.length} paints${literal.length ? `; literal on ${literal.map(([n]) => n).join(', ')}` : ''})`);
}

/* ── fit ─────────────────────────────────────────────────────────────────────────────────────────────── */
section('fit — a long name');
{
  const f = host({ vars: themeVars() });
  await drawCover(f.api, f.root, { brand: 'Harbor Fleet Services International Partners', engine: '0.237.0' });
  const fr = tagged(f.cover)[0];
  const nm = part(fr, 'brand')!;
  const sub = part(fr, 'subtitle')!;
  // 44 characters at 120 px measure 2904 px in this host: three lines inside 1440, so 360 tall; 360 + 28 + 36 = 424.
  ok(nm.fontSize === 120 && nm.width === 1440 && nm.x === 240 && nm.height === 360, `fit/a long name wraps inside the inset at 120 px (${nm.fontSize}, ${nm.width}, ${nm.x}, ${nm.height})`);
  ok(nm.y === 328 && sub.y === 328 + 360 + 28, `fit/the block stays centered (${nm.y}, ${sub.y})`);
}

/* ── thumb ───────────────────────────────────────────────────────────────────────────────────────────── */
section('thumb — the thumbnail rule');
{
  const f = host({ vars: themeVars() });
  const hero = f.node('FRAME'); hero.name = 'Hero'; f.cover.appendChild(hero); hero.x = 0; hero.y = 0; hero.resize(1600, 900);
  f.api._thumb = hero;
  const o = await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.237.0' });
  ok(f.api._thumb === hero && f.api._thumbSets === 0, `thumb/never replaces a designer's thumbnail (${f.api._thumb?.name})`);
  ok(coverLine(o) === 'Cover: drawn. The file thumbnail is your frame "Hero"; Prism3 left it.', `thumb/the result names their frame (${coverLine(o)})`);
  // A later Update with the designer's frame still the thumbnail: the version moves, the thumbnail does not.
  const r = await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.238.0' });
  ok(f.api._thumb === hero && f.api._thumbSets === 0 && r.engine === '0.238.0', 'thumb/an Update leaves their thumbnail too');
  // The cover already the thumbnail: the pointer stays, nothing set again.
  const g = host({ vars: themeVars() });
  await drawCover(g.api, g.root, { brand: 'Aurora', engine: '0.236.0' });
  const r2 = await drawCover(g.api, g.root, { brand: 'Aurora', engine: '0.237.0' });
  ok(r2.thumbnail === 'ours' && g.api._thumbSets === 1 && coverLine(r2) === 'Cover: version set to 0.237.0.', `thumb/ours: the version set, the pointer kept (${coverLine(r2)})`);
  // A host that cannot read the thumbnail never writes it.
  const h = host({ vars: themeVars(), thumbApi: false });
  const r3 = await drawCover(h.api, h.root, { brand: 'Aurora', engine: '0.237.0' });
  ok(r3.thumbnail === 'unavailable' && coverLine(r3) === 'Cover: drawn.', `thumb/no thumbnail API: drawn, nothing claimed (${coverLine(r3)})`);
  // A read that throws cannot tell a designer's thumbnail from the default, so nothing is written.
  const t = host({ vars: themeVars() });
  t.api.getFileThumbnailNodeAsync = async () => { throw new Error('read refused'); };
  const r4 = await drawCover(t.api, t.root, { brand: 'Aurora', engine: '0.237.0' });
  ok(r4.did === 'drawn' && t.api._thumbSets === 0 && r4.thumbnail === 'unavailable' && coverLine(r4) === 'Cover: drawn.',
    `thumb/a thumbnail read that throws: never set (${t.api._thumbSets} sets, ${JSON.stringify(r4.thumbnail)})`);
}

/* ── due ─────────────────────────────────────────────────────────────────────────────────────────────── */
section('due — what the dry run reads');
{
  const f = host({ vars: themeVars() });
  await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.236.0' });
  const d = await coverDue(f.root, { brand: 'Aurora', engine: '0.237.0', api: f.api });
  ok(eq(d, { state: 'stale', shows: '0.236.0' }) && coverIsWork(d), `due/a new engine: stale, shows the old version (${JSON.stringify(d)})`);
  ok(coverDueLine(d, '0.237.0') === 'Cover: to set the version to 0.237.0 (shows 0.236.0).', `due/the wireframe's dry-run line (${coverDueLine(d, '0.237.0')})`);
  const n = await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.236.0', api: f.api });
  ok(eq(n, { state: 'stale', name: { from: 'Aurora', to: 'Aurora Labs' } }) && coverDueLine(n, '0.236.0') === 'Cover: to set the brand name to Aurora Labs (shows Aurora).', `due/a new name (${coverDueLine(n, '0.236.0')})`);
  const none = await coverDue(f.root, { brand: null, engine: '0.236.0', api: f.api });
  ok(none?.state === 'current' && !coverIsWork(none) && coverDueLine(none) === '', 'due/no brand saved: the name is not compared');
  ok((await coverDue({}, { brand: 'x' })) === undefined, 'due/no page list: nothing read');
}

/* ── refresh ─────────────────────────────────────────────────────────────────────────────────────────── */
section('refresh — an unedited cover is kept current in place');
{
  // Drawn before the theme, then the theme lands: the next Update binds the placeholders.
  const f = host();
  await drawCover(f.api, f.root, { brand: 'aurora', engine: '0.236.0' });
  const fr = tagged(f.cover)[0];
  fr.x = 500; fr.y = -1200;   // a designer moved it: not an edit
  (f.api.variables as N).getLocalVariablesAsync = async () => themeVars().map((v) => ({ ...v, resolveForConsumer: () => ({ value: v.value }) }));
  const d = await coverDue(f.root, { brand: 'Aurora', engine: '0.237.0', api: f.api });
  ok(eq(d, { state: 'stale', shows: '0.236.0', name: { from: 'aurora', to: 'Aurora' }, bind: true }), `refresh/due: version, name and binding (${JSON.stringify(d)})`);
  ok(coverDueLine(d, '0.237.0') === 'Cover: to set the version to 0.237.0 (shows 0.236.0), set the brand name to Aurora (shows aurora), bind its colors and fonts to the theme.', `refresh/dry-run line (${coverDueLine(d, '0.237.0')})`);
  const o = await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.237.0' });
  const now = tagged(f.cover);
  ok(now.length === 1 && now[0] === fr && !fr.removed && fr.x === 500 && fr.y === -1200, 'refresh/the same node, where the designer put it');
  ok(eq(chars(fr), ['Aurora', 'Design system', 'v0.237.0']) && fillVar(fr) === 'V:ground' && fillVar(part(fr, 'brand')!) === 'V:brand'
    && fillVar(part(fr, 'subtitle')!) === 'V:sec' && fillVar(part(fr, 'version')!) === 'V:sec' && texts(fr).every((t) => t.boundVariables.fontFamily),
    `refresh/version, name and bindings set (${JSON.stringify(chars(fr))})`);
  ok(coverLine(o) === 'Cover: version set to 0.237.0, brand name set to Aurora, bound to the theme.', `refresh/result line (${coverLine(o)})`);
  ok(eq(await coverDue(f.root, { brand: 'Aurora', engine: '0.237.0', api: f.api }), { state: 'current' }), 'refresh/converges: current, not edited, after the refresh');
  const idle = await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.237.0' });
  ok(idle.did === 'none' && coverLine(idle) === '', 'refresh/nothing to do: nothing said');
  // A name that now wraps: the block is centered again (three lines, 360 + 28 + 36 = 424 tall, so 328 down).
  await drawCover(f.api, f.root, { brand: 'Harbor Fleet Services International Partners', engine: '0.237.0' });
  ok(part(fr, 'brand')!.y === 328 && part(fr, 'subtitle')!.y === 716, `refresh/a longer name: the block centered again (${part(fr, 'brand')!.y}, ${part(fr, 'subtitle')!.y})`);
}

/* ── logo ────────────────────────────────────────────────────────────────────────────────────────────── */
section('logo — the slot is the team\'s: a logo in it is not a hand edit (Q4 A)');
{
  const f = host({ vars: themeVars() });
  await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.236.0' });
  const fr = tagged(f.cover)[0];
  const slot = slotOf(fr)!;
  // The designer pastes their logo into the slot and sizes the slot to it.
  const mark = f.node('RECTANGLE'); mark.name = 'aurora-logo';
  mark.fills = [{ type: 'IMAGE', visible: true, opacity: 1, scaleMode: 'FIT', imageHash: 'abc' }];
  slot.appendChild(mark); mark.resize(180, 64); mark.x = 20; mark.y = 4;
  slot.resize(240, 72); slot.x = 1584;
  const d = await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.237.0', api: f.api });
  ok(eq(d, { state: 'stale', shows: '0.236.0', name: { from: 'Aurora', to: 'Aurora Labs' } }), `logo/content in the slot is not a hand edit (${JSON.stringify(d)})`);
  const o = await drawCover(f.api, f.root, { brand: 'Aurora Labs', engine: '0.237.0' });
  ok(o.did === 'refreshed' && part(fr, 'brand')!.characters === 'Aurora Labs' && part(fr, 'version')!.characters === 'v0.237.0',
    `logo/the name and the version keep updating with a logo in the slot (${o.did}; ${JSON.stringify(chars(fr))})`);
  ok(slot.children.length === 1 && slot.children[0] === mark && mark.x === 20 && mark.fills[0].imageHash === 'abc' && slot.x === 1584 && slot.width === 240,
    'logo/the logo and the slot are left as the designer put them');
  ok(part(fr, 'brand')!.visible !== false && !all(fr).some((n) => n.visible === false), 'logo/the name stays visible beside the logo');
  ok(eq(await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.237.0', api: f.api }), { state: 'current' }), 'logo/converges: current, not edited');
  // The logo dropped beside the slot instead is an edit, as any other added layer is.
  const stray = f.node('RECTANGLE'); stray.name = 'aurora-logo copy'; fr.appendChild(stray);
  ok((await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.237.0', api: f.api }))?.state === 'current' && !!(await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.237.0', api: f.api }) as N).edited,
    'logo/a layer added outside the slot is still a hand edit (control)');
}

/* ── name ────────────────────────────────────────────────────────────────────────────────────────────── */
section('name — `name`, else the id made readable (Q5 A)');
{
  ok(readableId('prism3') === 'Prism3' && readableId('nb-redesign') === 'Nb Redesign' && readableId('harbor_fleet') === 'Harbor Fleet' && readableId('aurora') === 'Aurora',
    `name/readable ids (${['prism3', 'nb-redesign', 'harbor_fleet'].map(readableId).join(', ')})`);
  ok(brandNameOf({ id: 'aurora', name: ' Aurora Labs ' }) === 'Aurora Labs' && brandNameOf({ id: 'aurora', name: '' }) === 'Aurora' && brandNameOf(null) === null,
    'name/`name` first, trimmed; an empty one falls back');
  // The saved brand with no display name: the cover shows the readable id, and both lines say no display name is set.
  const { name: _drop, ...bare } = (exampleBrands as Record<string, BrandInput>).prism3;
  const g = host({ vars: themeVars() });
  const blob = new Map<string, string>([['prism3/brandInput', serializeBrandInput(bare as BrandInput)]]);
  const root = { children: g.root.children, getSharedPluginData: (ns: string, k: string) => blob.get(`${ns}/${k}`) ?? '' };
  const d = await coverDue(root, { engine: '0.237.0', api: g.api });
  ok(eq(d, { state: 'missing', unnamed: 'Prism3' }) && coverDueLine(d) === 'Cover: to draw on the Cover page. No display name is set, so it shows Prism3, from the brand\'s id.',
    `name/the dry run says no display name is set (${coverDueLine(d)})`);
  const o = await drawCover(g.api, root, { engine: '0.237.0' });
  ok(part(tagged(g.cover)[0], 'brand')?.characters === 'Prism3', `name/the readable fallback: no display name set, the cover shows the id made readable (${part(tagged(g.cover)[0], 'brand')?.characters})`);
  ok(coverLine(o) === 'Cover: drawn and set as the file thumbnail. No display name is set, so it shows Prism3, from the brand\'s id.', `name/the result says no display name is set (${coverLine(o)})`);
  // The display name set: it is shown, and the sentence goes.
  blob.set('prism3/brandInput', serializeBrandInput({ ...(bare as BrandInput), name: 'Prism3 Studio' }));
  const n = await coverDue(root, { engine: '0.237.0', api: g.api });
  ok(eq(n, { state: 'stale', name: { from: 'Prism3', to: 'Prism3 Studio' } }) && coverDueLine(n) === 'Cover: to set the brand name to Prism3 Studio (shows Prism3).', `name/a display name set: shown, no sentence (${coverDueLine(n)})`);
}

/* ── redraw ──────────────────────────────────────────────────────────────────────────────────────────── */
section('redraw — a cover the first design drew');
{
  const f = host({ vars: themeVars() });
  const fr = await firstDesign(f, { engine: '0.236.0' });
  ok(coverPrint(fr) === FIRST_PRINT, `redraw/premise: the first design's record still reads unedited (${coverPrint(fr)})`);
  fr.x = 300; fr.y = -500;   // moved: not an edit
  f.api._thumb = fr;
  const d = await coverDue(f.root, { brand: 'Harbor', engine: '0.237.0', api: f.api });
  ok(eq(d, { state: 'stale', redraw: true }) && coverIsWork(d), `redraw/due: an unedited first-design cover is due a redraw (${JSON.stringify(d)})`);
  ok(coverDueLine(d, '0.237.0') === 'Cover: to redraw in the new design, at 0.237.0.', `redraw/dry-run line (${coverDueLine(d, '0.237.0')})`);
  const old = texts(fr);
  const o = await drawCover(f.api, f.root, { brand: 'Harbor', engine: '0.237.0' });
  ok(tagged(f.cover).length === 1 && tagged(f.cover)[0] === fr && fr.x === 300 && fr.y === -500 && f.api._thumb === fr,
    'redraw/the same frame, where the designer put it, still the thumbnail');
  ok(eq(chars(fr), ['Harbor', 'Design system', 'v0.237.0']) && old.every((t) => t.removed) && fillVar(fr) === 'V:ground' && fillVar(part(fr, 'brand')!) === 'V:brand' && !!slotOf(fr),
    `redraw/an unedited first-design cover is redrawn in the new design (${JSON.stringify(chars(fr))}; ground ${fillVar(fr)})`);
  ok(coverLine(o) === 'Cover: redrawn in the new design.', `redraw/result line (${coverLine(o)})`);
  ok(eq(await coverDue(f.root, { brand: 'Harbor', engine: '0.237.0', api: f.api }), { state: 'current' }), 'redraw/converges: current after the redraw');
}
{
  // Edited by hand (a badge added): kept, "(edited)", never redrawn; only its version text moves (Q?4 B, #2956).
  const f = host({ vars: themeVars() });
  const fr = await firstDesign(f, { engine: '0.236.0' });
  const badge = f.node('FRAME'); badge.name = 'Badge'; fr.appendChild(badge); badge.x = 1500; badge.y = 120;
  const d = await coverDue(f.root, { brand: 'Harbor', engine: '0.237.0', api: f.api });
  ok(eq(d, { state: 'stale', shows: '0.236.0', edited: true }), `redraw/due: an edited first-design cover is stale for its version only (${JSON.stringify(d)})`);
  ok(coverDueLine(d, '0.237.0') === 'Cover (edited): to set the version to 0.237.0 (shows 0.236.0). Only its version text changes; every other edit is kept.', `redraw/edited dry-run line (${coverDueLine(d, '0.237.0')})`);
  const o = await drawCover(f.api, f.root, { brand: 'Harbor', engine: '0.237.0' });
  ok(fr.children.length === 3 && fr.children.includes(badge) && part(fr, 'brand')!.fontSize === 240 && fillVar(fr) === 'V:fg' && !slotOf(fr) && !part(fr, 'subtitle'),
    `redraw/an edited first-design cover is kept (${fr.children.map((c: N) => c.name)})`);
  ok(part(fr, 'version')!.characters === 'v0.237.0' && coverLine(o) === 'Cover (edited): only its version text was set, to 0.237.0; every other edit was kept.', `redraw/edited: only the version text (${coverLine(o)})`);
}

/* ── edited ──────────────────────────────────────────────────────────────────────────────────────────── */
section('edited — a hand-edited cover keeps the edit; only the version text moves (Q?4 B)');
{
  const f = host({ vars: themeVars() });
  await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.236.0' });
  const fr = tagged(f.cover)[0];
  // The designer adds a badge and restyles the name.
  const badge = f.node('FRAME'); badge.name = 'Badge'; fr.appendChild(badge); badge.x = 1600; badge.y = 900;
  const nm = part(fr, 'brand')!;
  nm.characters = 'AURORA';
  const d = await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.237.0', api: f.api });
  ok(eq(d, { state: 'stale', shows: '0.236.0', edited: true }), `edited/due: stale for its version only, the name not compared (${JSON.stringify(d)})`);
  ok(coverDueLine(d, '0.237.0') === 'Cover (edited): to set the version to 0.237.0 (shows 0.236.0). Only its version text changes; every other edit is kept.', `edited/dry-run line (${coverDueLine(d, '0.237.0')})`);
  const o = await drawCover(f.api, f.root, { brand: 'Aurora Labs', engine: '0.237.0' });
  ok(tagged(f.cover).length === 1 && tagged(f.cover)[0] === fr && fr.children.includes(badge) && nm.characters === 'AURORA' && nm.fontSize === 120,
    `edited/only the version text moves (${JSON.stringify(chars(fr))})`);
  ok(part(fr, 'version')!.characters === 'v0.237.0', 'edited/the version text set');
  ok(coverLine(o) === 'Cover (edited): only its version text was set, to 0.237.0; every other edit was kept.', `edited/result line (${coverLine(o)})`);
  ok(eq(await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.237.0', api: f.api }), { state: 'current', edited: true }), 'edited/stays edited, and current');
  // The designer deletes the version text: nothing is written, and the result says so.
  part(fr, 'version')!.remove();
  const gone = await coverDue(f.root, { brand: 'Aurora', engine: '0.238.0', api: f.api });
  ok(eq(gone, { state: 'no-version', edited: true }) && !coverIsWork(gone), `edited/deleted version text: not work (${JSON.stringify(gone)})`);
  ok(coverDueLine(gone) === 'Cover (edited): its version text is gone, so Update writes nothing to it.', `edited/deleted version text: the dry run says so (${coverDueLine(gone)})`);
  const before = JSON.stringify(texts(fr).map((t) => [t.characters, t.fontSize]));
  const r = await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.238.0' });
  ok(r.did === 'none' && JSON.stringify(texts(fr).map((t) => [t.characters, t.fontSize])) === before && tagged(f.cover).length === 1 && fr.children.length === 4,
    'edited/deleted version text: nothing written');
  ok(coverLine(r) === 'Cover: edited by hand, and its version text is gone. Nothing was written.', `edited/deleted version text: the result says so (${coverLine(r)})`);
}
{
  // The designer retypes the subtitle and changes nothing else: that alone is an edit, so a renamed brand's Update
  // keeps their text and sets only the version.
  const f = host({ vars: themeVars() });
  await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.236.0' });
  const fr = tagged(f.cover)[0];
  part(fr, 'subtitle')!.characters = 'Component library';
  const d = await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.237.0', api: f.api });
  ok(eq(d, { state: 'stale', shows: '0.236.0', edited: true }), `edited/a retyped subtitle alone reads as edited (${JSON.stringify(d)})`);
  await drawCover(f.api, f.root, { brand: 'Aurora Labs', engine: '0.237.0' });
  ok(eq(chars(fr), ['Aurora', 'Component library', 'v0.237.0']), `edited/a retyped subtitle is kept (${JSON.stringify(chars(fr))})`);
}
{
  // An unedited cover whose version text is gone (a fingerprint recorded after the deletion; no draw leaves one) is
  // not drawn again: one cover stays on the page, and nothing is written.
  const f = host({ vars: themeVars() });
  await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.236.0' });
  const fr = tagged(f.cover)[0];
  part(fr, 'version')!.remove();
  fr.setSharedPluginData(COVER_NS, COVER_KEY, JSON.stringify({ engine: '0.236.0', name: 'Aurora', print: coverPrint(fr), design: 2 }));
  const d = await coverDue(f.root, { brand: 'Aurora', engine: '0.237.0', api: f.api });
  ok(eq(d, { state: 'no-version', edited: true }) && !coverIsWork(d), `edited/no version text, unedited print: not work (${JSON.stringify(d)})`);
  const r = await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.237.0' });
  ok(r.did === 'none' && f.cover.children.length === 1 && tagged(f.cover).length === 1, `edited/no version text, unedited print: no second cover (${f.cover.children.length} on the page)`);
}

/* ── page ────────────────────────────────────────────────────────────────────────────────────────────── */
section('page — nothing to draw on, or nothing to draw');
{
  const f = host({ vars: themeVars() });
  const root = { children: [f.root.children[1]] };
  ok(eq(await coverDue(root, { brand: 'x' }), { state: 'no-cover' }), 'page/due: no-cover');
  const o = await drawCover(f.api, root, { brand: 'x' });
  ok(o.did === 'none' && coverLine(o) === 'Cover: not drawn, the file has no Cover page. Run Set up file, then Update.', `page/no Cover page: why (${coverLine(o)})`);
  const n = await drawCover(f.api, f.root, { brand: null });
  ok(n.did === 'none' && !tagged(f.cover).length && coverLine(n) === 'Cover: not drawn yet, the file has no brand. Apply Theme, then Update draws it.', `page/no brand: why (${coverLine(n)})`);
  // A font the host will not load: the text stays empty and the miss is named, never a throw.
  const g = host({ refuseFonts: ['Inter|Semi Bold'] });
  const m = await drawCover(g.api, g.root, { brand: 'Aurora', engine: '0.237.0' });
  ok(m.did === 'drawn' && m.fontMisses.some((x) => x.includes('Inter Semi Bold unavailable')) && part(tagged(g.cover)[0], 'brand')!.characters === '', `page/a refused font is named (${m.fontMisses.join('; ')})`);
}

/* ── contrast ────────────────────────────────────────────────────────────────────────────────────────── */
section('contrast — the cover\'s inks on its ground, per brand and mode');
{
  // WCAG 2.x relative luminance and ratio, written here: the engine's `ratio` is the claim, not the measure.
  const lum = (hex: string): number => {
    const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // The engine's role path for a Figma variable tail: `color/text/brand` → `text.brand`.
  const role = (tail: string): string => tail.replace(/^color\//, '').replace(/\//g, '.');
  const ground = role(GROUND_VARIABLE);
  const inks = [role(NAME_INK_VARIABLE), role(TEXT_INK_VARIABLE)];
  ok(ground === 'background.primary' && eq(inks, ['text.brand', 'text.secondary']), `contrast/premise: the wireframe's bindings (${ground} under ${inks.join(', ')})`);
  const brands = Object.entries(exampleBrands as Record<string, BrandInput>);
  ok(brands.length >= 2, `contrast/premise: example brands to measure (${brands.map(([k]) => k).join(', ')})`);
  const bad: string[] = [];
  let measured = 0;
  let floor = Infinity;
  for (const [id, b] of brands) {
    for (const m of resolveAllModes(brandTheme(b))) {
      const g = m.roles[ground];
      for (const ink of inks) {
        const r = m.roles[ink];
        if (!r || !g) { bad.push(`${id} ${m.mode}: no ${!r ? ink : ground}`); continue; }
        measured++;
        const x = ratio(r.hex, g.hex);
        floor = Math.min(floor, x);
        if (x < 4.5) bad.push(`${id} ${m.mode}: ${ink} on ${ground} ${x.toFixed(2)} below 4.5`);
      }
    }
  }
  ok(bad.length === 0 && measured > 0, `contrast/the cover's inks hold 4.5:1 on its ground, measured here (${measured} pairs, lowest ${floor.toFixed(2)}:1${bad.length ? `; ${bad.slice(0, 3).join('; ')}` : ''})`);
}

/* ── setup ───────────────────────────────────────────────────────────────────────────────────────────── */
section('setup — Set up file draws the cover');
{
  // The scaffold makes the Cover page; the cover goes on it.
  const f = host({ vars: themeVars() });
  const pages: PageLike[] = [];
  const mkPage = (divider = false): PageLike & N => ({ name: divider ? '---' : 'Page', isPageDivider: divider, children: [] as N[], appendChild(c: N) { c.parent = this; this.children.push(c); } });
  const pagesApi: PagesApi = {
    root: {
      get children() { return pages; },
      insertChild(i: number, p: PageLike) { const at = pages.indexOf(p); if (at >= 0) pages.splice(at, 1); pages.splice(i, 0, p); },
      appendChild(p: PageLike) { pages.push(p); },
    },
    createPage: () => mkPage(),
    createPageDivider: () => mkPage(true),
    setCurrentPageAsync: async () => {},
    loadAllPagesAsync: async () => {},
  };
  await scaffoldSkeleton(pagesApi, TAXONOMY);
  const o = await drawCover(f.api, pagesApi.root, { brand: brandNameOf({ id: 'aurora', name: 'Aurora' }), engine: '0.237.0' });
  const cov = pages.find((p) => p.name === 'Cover') as unknown as N;
  ok(o.did === 'drawn' && tagged(cov).length === 1 && eq(chars(tagged(cov)[0]), ['Aurora', 'Design system', 'v0.237.0']), 'setup/drawn on the scaffolded Cover page');
  // The plugin's Set up file action calls it, with the saved brand, and reports its line.
  const main = readFileSync(resolve(import.meta.dirname, 'src/main.ts'), 'utf8');
  const body = main.slice(main.indexOf('const fileSetup = async'), main.indexOf('\n};', main.indexOf('const fileSetup = async')));
  ok(/drawCover\(figma/.test(body) && /coverLine\(cover\)/.test(body), 'setup/Set up file draws the cover and reports it');
  // With no brand passed, the cover reads the one the file holds (`persist-figma.ts`'s blob), name first.
  const g = host({ vars: themeVars() });
  const blob = new Map<string, string>([['prism3/brandInput', serializeBrandInput((exampleBrands as Record<string, BrandInput>).aurora)]]);
  const root = { children: g.root.children, getSharedPluginData: (ns: string, k: string) => blob.get(`${ns}/${k}`) ?? '' };
  const saved = await drawCover(g.api, root, { engine: '0.237.0' });
  ok(saved.did === 'drawn' && part(tagged(g.cover)[0], 'brand')?.characters === 'Aurora', `setup/the saved brand's name (${part(tagged(g.cover)[0], 'brand')?.characters})`);
}

/* ── update ──────────────────────────────────────────────────────────────────────────────────────────── */
section('update — through a real Update in the component shim');
{
  const planComps = (n: { swapTarget?: string; nestTarget?: string; nestOverrides?: readonly { type: string; value: string }[]; children?: unknown[] }): string[] => [
    ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []),
    ...(n.nestOverrides ?? []).filter((o) => o.type === 'INSTANCE_SWAP').map((o) => o.value),
    ...((n.children ?? []) as (typeof n)[]).flatMap(planComps),
  ];
  const id = 'tag';
  const d = componentDefs.find((x) => x.id === id)!;
  const plans = figmaAnatomySet(d, { swapTarget: SWAP_TARGET });
  type Pg = { name: string; children: Node[]; appendChild(c: Node): void };
  const pageOf = (name: string): Pg => { const p: Pg = { name, children: [], appendChild(c: Node) { const was = c.parent as { children?: Node[] } | undefined; if (was?.children) was.children.splice(was.children.indexOf(c), 1); c.parent = p; p.children.push(c); } }; return p; };
  const page = pageOf('↳ Tag');
  const api = makeShim({
    vars: [...new Set([...plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0', 'space/999'])],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root))])],
    page: page as never, liveRoot: true, identities: true, scaleConstrained: true,
  }) as Record<string, any>;
  const built = await applyComponentPlan(plans, api as never);
  if (built.misses.length) throw new Error(`premise: ${id} built with misses: ${built.misses[0]}`);
  let thumb: unknown = null;
  api.getFileThumbnailNodeAsync = async () => thumb;
  api.setFileThumbnailNodeAsync = async (n: unknown) => { thumb = n; };
  const cover = pageOf('Cover');
  const pages = [cover, page];
  const blob = new Map<string, string>([['prism3/brandInput', serializeBrandInput({ ...(exampleBrands as Record<string, BrandInput>).harbor })]]);
  const pluginData = new Map<string, string>();
  const host = { ...api, root: { ...api.root, get children() { return pages; }, getSharedPluginData: (ns: string, k: string) => blob.get(`${ns}/${k}`) ?? '',
    getPluginData: (k: string) => pluginData.get(k) ?? '',
    findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
  const targets = [{ def: id, plans }];
  // A cover an earlier engine drew, and its own thumbnail.
  await drawCover(api as unknown as CoverApi, host.root as never, { engine: '0.236.0' });
  const fr = tagged(cover as unknown as N)[0];
  ok(!!fr && thumb === fr && part(fr, 'version')?.characters === 'v0.236.0', 'update/premise: a cover drawn by 0.236.0, the thumbnail');
  const pre = await previewUpdate(host, targets);
  const v = previewVerdict(pre);
  ok(pre.cover?.state === 'stale' && v.lines.some((l) => l.startsWith('Cover: to set the version to 0.237.0 (shows 0.236.0).')), `update/dry run lists the cover (${v.lines.join(' | ')})`);
  ok(part(fr, 'version')?.characters === 'v0.236.0', 'update/the check wrote nothing');
  const res = await applyUpdate(host, api as never, targets, previewHashOf(pre), { today: '2026-10-21' });
  const now = tagged(cover as unknown as N);
  ok(now.length === 1 && now[0] === fr && part(fr, 'version')?.characters === 'v0.237.0', `update/version refreshed on an unedited cover, read off the shim (${part(fr, 'version')?.characters})`);
  const about = cover.children.find((n) => (n.getSharedPluginData as (a: string, b: string) => string)?.('prism3', ABOUT_KEY));
  ok(!!about && about.x === (fr.x as number) + 1920 + 40 && about.y === fr.y, `update/the About frame beside the cover, the thumbnail (${about?.x}, ${about?.y})`);
  const verdict = applyVerdict(res);
  ok(verdict.lines.includes('Cover: version set to 0.237.0.') && verdict.lines.indexOf('Cover: version set to 0.237.0.') < verdict.lines.indexOf('About this library: drawn on the Cover page.'), `update/result line, the cover before the About frame (${verdict.lines.join(' | ')})`);
  ok(verdict.lines.includes('No version saved first — only the cover and About this library changed, no set.') && !res.version, `update/cover-page furniture only: no version saved (${verdict.lines.join(' | ')})`);
  // The brand renamed: the cover is the only work, and the hash covers it.
  blob.set('prism3/brandInput', serializeBrandInput({ ...(exampleBrands as Record<string, BrandInput>).harbor, name: 'Harbor Fleet' }));
  const pre2 = await previewUpdate(host, targets);
  const v2 = previewVerdict(pre2);
  ok(pre2.about?.state === 'current' && v2.headline === 'Would update the cover' && v2.lines.includes('No version is saved first — only the cover changes, no set.'), `update/cover only: the dry run (${v2.headline} | ${v2.lines.join(' | ')})`);
  blob.set('prism3/brandInput', serializeBrandInput({ ...(exampleBrands as Record<string, BrandInput>).harbor, name: 'Harbor Fleet Co' }));
  const refused = await applyUpdate(host, api as never, targets, previewHashOf(pre2), { today: '2026-10-22' });
  ok(!!refused.refusedAll && part(fr, 'brand')?.characters === 'Harbor', `update/hash: a cover that changed since the check refuses the confirm (${refused.refusedAll})`);
  const pre3 = await previewUpdate(host, targets);
  const res3 = await applyUpdate(host, api as never, targets, previewHashOf(pre3), { today: '2026-10-22' });
  const v3 = applyVerdict(res3);
  ok(part(fr, 'brand')?.characters === 'Harbor Fleet Co' && v3.headline === '✓ Cover updated' && v3.lines.includes('Cover: brand name set to Harbor Fleet Co.') && v3.lines.includes('No version saved first — only the cover changed, no set.') && !res3.version,
    `update/cover only: renamed, no version (${v3.headline} | ${v3.lines.join(' | ')})`);
  const again = await previewUpdate(host, targets);
  ok(again.cover?.state === 'current' && previewVerdict(again).headline === '✓ All sets up to date', `update/converges (${previewVerdict(again).headline})`);
  // A SET CHANGE WHILE THE COVER IS DUE saves the one version (#2828): the set's display name in the title, the cover
  // in the description, never the title. Mutations: the Update save drops `cover` → no " Cover."; drops `nameOf` →
  // "updated tag".
  blob.set('prism3/brandInput', serializeBrandInput({ ...(exampleBrands as Record<string, BrandInput>).harbor, name: 'Harbor Line' }));
  const moved = plans.map((p) => { const q = JSON.parse(JSON.stringify(p)); (q.root.children.find((c: { name: string }) => c.name === 'content').bound as Record<string, string>).itemSpacing = 'space/999'; return q; });
  const t4 = [{ def: id, plans: moved }];
  const pre4 = await previewUpdate(host, t4);
  ok(pre4.cover?.state === 'stale' && pre4.sets.some((s) => s.counts.update > 0), `update/premise: a set change and the cover due (${pre4.cover?.state})`);
  const res4 = await applyUpdate(host, api as never, t4, previewHashOf(pre4), { today: '2026-10-23', nameOf: () => 'Tag' });
  ok(eq(api._versions, ['Saved before Prism3 updated Tag']) && res4.version === 'Saved before Prism3 updated Tag',
    `update/set change and cover due: the title names the set by its display name (${JSON.stringify(api._versions)}; ${res4.version})`);
  ok(/ Cover\.$/.test(String(api._versionNotes[0])) && part(fr, 'brand')?.characters === 'Harbor Line',
    `update/set change and cover due: the description names the cover (${JSON.stringify(api._versionNotes)}; ${part(fr, 'brand')?.characters})`);
  // #2995 (should-fix 2): Documentation's Cover switch off for this file (`prism3:docSettings` `{"cover":false}`, #2977):
  // the brand renamed so the cover is due, yet Update neither lists it nor redraws it. Then the switch on: the same
  // rename is due, so the arm reads the switch, not a cover that was current anyway.
  blob.set('prism3/brandInput', serializeBrandInput({ ...(exampleBrands as Record<string, BrandInput>).harbor, name: 'Harbor Quay' }));
  pluginData.set('prism3:docSettings', '{"cover":false}');
  const pre5 = await previewUpdate(host, targets);
  await applyUpdate(host, api as never, targets, previewHashOf(pre5), { today: '2026-10-24' });
  ok(pre5.cover === undefined && !previewVerdict(pre5).lines.some((l) => l.startsWith('Cover:')) && part(fr, 'brand')?.characters === 'Harbor Line',
    `update/cover off: with Cover off in Documentation, Update neither lists nor redraws the cover (${JSON.stringify(pre5.cover)}; ${part(fr, 'brand')?.characters})`);
  pluginData.delete('prism3:docSettings');
  const pre6 = await previewUpdate(host, targets);
  ok(pre6.cover?.state === 'stale', `update/cover on (control): the switch on, the same rename is due (${JSON.stringify(pre6.cover)})`);
  // A COVER THE FIRST DESIGN DREW (#2859), unedited, reaches this design through a real Update: redrawn in its frame.
  (fr as unknown as N).remove();
  await api.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
  await api.loadFontAsync({ family: 'Inter', style: 'Regular' });
  const first = api.createFrame() as N;
  first.name = 'Cover'; first.resize(1920, 1080); cover.appendChild(first as never);
  first.fills = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 0.2, g: 0.2, b: 0.8 } }];
  for (const [p, s, size, y] of [['brand', 'Harbor', 240, 360], ['version', 'Prism3 0.236.0', 64, 906]] as const) {
    const t = api.createText() as N;
    t.name = p; t.setSharedPluginData('prism3', 'cover-part', p); first.appendChild(t);
    t.fontName = { family: 'Inter', style: p === 'brand' ? 'Semi Bold' : 'Regular' }; t.characters = s; t.fontSize = size; t.x = 120; t.y = y;
  }
  first.setSharedPluginData('prism3', 'cover', JSON.stringify({ engine: '0.236.0', name: 'Harbor', print: coverPrint(first) }));
  thumb = first;
  const pre7 = await previewUpdate(host, targets);
  ok(eq(pre7.cover, { state: 'stale', redraw: true }) && previewVerdict(pre7).lines.includes('Cover: to redraw in the new design, at 0.237.0.'), `update/redraw: the dry run lists a first-design cover (${JSON.stringify(pre7.cover)})`);
  const res7 = await applyUpdate(host, api as never, targets, previewHashOf(pre7), { today: '2026-10-26' });
  ok(tagged(cover as unknown as N).length === 1 && tagged(cover as unknown as N)[0] === first && eq(chars(first), ['Harbor Quay', 'Design system', 'v0.237.0']) && thumb === first,
    `update/redraw: a first-design cover is redrawn in the new design through Update (${JSON.stringify(chars(first))})`);
  ok(applyVerdict(res7).lines.includes('Cover: redrawn in the new design.'), `update/redraw: result line (${applyVerdict(res7).lines.join(' | ')})`);
}

console.log(failed ? `\n✗ ${failed} of ${executed} failed` : `\n✓ all passed — ${executed} assertions executed`);
if (failed) process.exit(1);
