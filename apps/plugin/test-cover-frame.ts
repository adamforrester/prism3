/**
 * THE LIBRARY COVER (#2859, owner decision Q509 A) — drawn by Set up file, kept current by Update, never replacing a
 * designer's thumbnail or their edits.
 *
 *   npx tsx apps/plugin/test-cover-frame.ts
 *
 *   cover/…      a first draw: 1920 × 1080 on the Cover page, the brand name (`name`, else the `id` as written) and
 *                "Prism3 <engine>" and no other text, the ground bound to `foreground/brand`, both inks to
 *                `text/on-brand`, the fonts bound to the display and body variables; placeholders with no theme.
 *   fit/…        a name too wide for one line at 240 px drops to 180 px and wraps inside the inset.
 *   thumb/…      the thumbnail rule: set only while it is Figma's default; a designer's frame is never replaced.
 *   due/…        what the dry run reads: missing, stale for a new engine or name, current, and their lines.
 *   refresh/…    an unedited cover is refreshed in place: the same node, its place kept, the version and name set,
 *                placeholders bound once the theme's variables exist.
 *   edited/…     a cover edited by hand keeps every edit, and only its tagged version text moves (Q?4 B); with that
 *                text deleted nothing is written and the result says so.
 *   page/…       no Cover page, no brand: nothing drawn, and why.
 *   contrast/…   the cover's pair is the engine's contract: for every example brand and mode, the ink the cover binds
 *                is contracted against exactly the ground it binds, at 4.5:1 or more, and measures that here.
 *   setup/…      Set up file draws the cover on the Cover page it scaffolds.
 *
 * INDEPENDENCE (docs/34): the host below is written here, not derived from `cover-frame.ts`: it measures text from its
 * characters and size, refuses a characters write on an unloaded font as Figma does, and resolves variables by name.
 * Every expected string is a literal from the approved wireframe and Q509 A, never built from the module's helpers.
 * Contrast is computed here from the engine's emitted hex (WCAG 2.x), not read off the engine's own `ratio`.
 *
 * BY-NAME MUTATIONS (the PR body lists them): the thumbnail set over a designer's frame → `thumb/never replaces a
 * designer's thumbnail`; the cover gains the contract version → `cover/brand and version only`; the ground written as
 * a literal → `cover/ground bound to foreground/brand`; an edited cover's other layer rewritten → `edited/only the
 * version text moves`; the ink bound to another role → `contrast/the cover's ink is contracted against its ground`.
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
  COVER_KEY, COVER_NS, GROUND_VARIABLE, INK_VARIABLE, brandNameOf, coverDue, coverDueLine, coverIsWork, coverLine, drawCover, type CoverApi,
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
  { id: 'V:ground', name: `${root}/color/foreground/brand` },
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
const fillVar = (n: N): string | undefined => n.fills?.[0]?.boundVariables?.color?.id;

/* ── cover ───────────────────────────────────────────────────────────────────────────────────────────── */
section('cover — a first draw on a themed file');
{
  const f = host({ vars: themeVars() });
  ok(eq(await coverDue(f.root, { brand: 'Aurora', engine: '0.237.0', api: f.api }), { state: 'missing' }), 'cover/due: a Cover page with no cover reads missing');
  const o = await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.237.0' });
  const fr = tagged(f.cover);
  ok(o.did === 'drawn' && fr.length === 1 && fr[0].name === 'Cover', `cover/one frame, named Cover (${fr.map((n) => n.name)})`);
  ok(fr[0].width === 1920 && fr[0].height === 1080 && fr[0].x === 0 && fr[0].y === 0, `cover/1920 × 1080 at the origin of an empty page (${fr[0].width} × ${fr[0].height} at ${fr[0].x}, ${fr[0].y})`);
  ok(eq(texts(fr[0]).map((t) => t.characters).sort(), ['Aurora', 'Prism3 0.237.0']), `cover/brand and version only (${JSON.stringify(texts(fr[0]).map((t) => t.characters))})`);
  ok(fillVar(fr[0]) === 'V:ground', `cover/ground bound to foreground/brand (${JSON.stringify(fr[0].fills)})`);
  ok(texts(fr[0]).every((t) => fillVar(t) === 'V:ink'), `cover/both inks bound to text/on-brand (${texts(fr[0]).map(fillVar)})`);
  const wm = part(fr[0], 'brand')!;
  const ver = part(fr[0], 'version')!;
  ok(wm.boundVariables.fontFamily?.id === 'V:dfam' && wm.boundVariables.fontStyle?.id === 'V:dsty' && eq(wm.fontName, { family: 'Clash Display', style: 'Semibold' }),
    `cover/wordmark in the display face, bound (${JSON.stringify(wm.boundVariables)}; ${JSON.stringify(wm.fontName)})`);
  ok(ver.boundVariables.fontFamily?.id === 'V:bfam' && ver.boundVariables.fontStyle?.id === 'V:bsty', `cover/version in the body face, bound (${JSON.stringify(ver.boundVariables)})`);
  ok(wm.fontSize === 240 && wm.x === 120 && wm.y === 360, `cover/wordmark at 240 px, 120 px in, 360 px down (${wm.fontSize}, ${wm.x}, ${wm.y})`);
  ok(ver.fontSize === 64 && ver.x === 120 && ver.y === 1080 - 110 - 64, `cover/version at 64 px, 110 px off the bottom (${ver.fontSize}, ${ver.x}, ${ver.y})`);
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
  ok(eq(texts(fr).map((t) => t.characters).sort(), ['Prism3 0.237.0', 'harbor']), 'cover/the id as written when no name is set');
}

/* ── fit ─────────────────────────────────────────────────────────────────────────────────────────────── */
section('fit — a long name');
{
  const f = host({ vars: themeVars() });
  await drawCover(f.api, f.root, { brand: 'Harbor Fleet Services', engine: '0.237.0' });
  const wm = part(tagged(f.cover)[0], 'brand')!;
  ok(wm.fontSize === 180 && wm.textAutoResize === 'HEIGHT' && wm.width === 1680, `fit/too wide at 240 px: 180 px, wrapping inside the inset (${wm.fontSize}, ${wm.textAutoResize}, ${wm.width})`);
  const g = host({ vars: themeVars() });
  await drawCover(g.api, g.root, { brand: 'Harbor', engine: '0.237.0' });
  const short = part(tagged(g.cover)[0], 'brand')!;
  ok(short.fontSize === 240 && short.textAutoResize === 'WIDTH_AND_HEIGHT', `fit/a short name stays at 240 px on one line (${short.fontSize})`);
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
  ok(eq(texts(fr).map((t) => t.characters).sort(), ['Aurora', 'Prism3 0.237.0']) && fillVar(fr) === 'V:ground' && texts(fr).every((t) => fillVar(t) === 'V:ink' && t.boundVariables.fontFamily),
    `refresh/version, name and bindings set (${JSON.stringify(texts(fr).map((t) => t.characters))})`);
  ok(coverLine(o) === 'Cover: version set to 0.237.0, brand name set to Aurora, bound to the theme.', `refresh/result line (${coverLine(o)})`);
  ok(eq(await coverDue(f.root, { brand: 'Aurora', engine: '0.237.0', api: f.api }), { state: 'current' }), 'refresh/converges: current, not edited, after the refresh');
  const idle = await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.237.0' });
  ok(idle.did === 'none' && coverLine(idle) === '', 'refresh/nothing to do: nothing said');
}

/* ── edited ──────────────────────────────────────────────────────────────────────────────────────────── */
section('edited — a hand-edited cover keeps the edit; only the version text moves (Q?4 B)');
{
  const f = host({ vars: themeVars() });
  await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.236.0' });
  const fr = tagged(f.cover)[0];
  // The designer adds a logo and restyles the wordmark.
  const logo = f.node('FRAME'); logo.name = 'Logo'; fr.appendChild(logo); logo.x = 1600; logo.y = 120;
  const wm = part(fr, 'brand')!;
  wm.characters = 'AURORA';
  const d = await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.237.0', api: f.api });
  ok(eq(d, { state: 'stale', shows: '0.236.0', edited: true }), `edited/due: stale for its version only, the name not compared (${JSON.stringify(d)})`);
  ok(coverDueLine(d, '0.237.0') === 'Cover: to set the version to 0.237.0 (shows 0.236.0). It was edited by hand, so only its version text changes.', `edited/dry-run line (${coverDueLine(d, '0.237.0')})`);
  const o = await drawCover(f.api, f.root, { brand: 'Aurora Labs', engine: '0.237.0' });
  ok(tagged(f.cover).length === 1 && tagged(f.cover)[0] === fr && fr.children.includes(logo) && wm.characters === 'AURORA' && wm.fontSize === 240,
    `edited/only the version text moves (${JSON.stringify(texts(fr).map((t) => t.characters))})`);
  ok(part(fr, 'version')!.characters === 'Prism3 0.237.0', 'edited/the version text set');
  ok(coverLine(o) === 'Cover: edited by hand. Only its version text was set, to 0.237.0.', `edited/the wireframe's result line (${coverLine(o)})`);
  ok(eq(await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.237.0', api: f.api }), { state: 'current', edited: true }), 'edited/stays edited, and current');
  // The designer deletes the version text: nothing is written, and the result says so.
  part(fr, 'version')!.remove();
  const gone = await coverDue(f.root, { brand: 'Aurora', engine: '0.238.0', api: f.api });
  ok(eq(gone, { state: 'no-version', edited: true }) && !coverIsWork(gone), `edited/deleted version text: not work (${JSON.stringify(gone)})`);
  ok(coverDueLine(gone) === 'Cover: edited by hand, and its version text is gone, so Update writes nothing to it.', `edited/deleted version text: the dry run says so (${coverDueLine(gone)})`);
  const before = JSON.stringify(texts(fr).map((t) => [t.characters, t.fontSize]));
  const r = await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.238.0' });
  ok(r.did === 'none' && JSON.stringify(texts(fr).map((t) => [t.characters, t.fontSize])) === before && tagged(f.cover).length === 1 && fr.children.length === 2,
    'edited/deleted version text: nothing written');
  ok(coverLine(r) === 'Cover: edited by hand, and its version text is gone. Nothing was written.', `edited/deleted version text: the result says so (${coverLine(r)})`);
}
{
  // The designer retypes the wordmark and changes nothing else: that alone is an edit, so a renamed brand's Update
  // keeps their text and sets only the version.
  const f = host({ vars: themeVars() });
  await drawCover(f.api, f.root, { brand: 'Aurora', engine: '0.236.0' });
  const fr = tagged(f.cover)[0];
  part(fr, 'brand')!.characters = 'Aurora Design';
  const d = await coverDue(f.root, { brand: 'Aurora Labs', engine: '0.237.0', api: f.api });
  ok(eq(d, { state: 'stale', shows: '0.236.0', edited: true }), `edited/a retyped wordmark alone reads as edited (${JSON.stringify(d)})`);
  await drawCover(f.api, f.root, { brand: 'Aurora Labs', engine: '0.237.0' });
  ok(part(fr, 'brand')!.characters === 'Aurora Design' && part(fr, 'version')!.characters === 'Prism3 0.237.0',
    `edited/a retyped wordmark is kept (${JSON.stringify(texts(fr).map((t) => t.characters))})`);
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
  ok(brandNameOf({ id: 'aurora' }) === 'aurora' && brandNameOf({ id: 'aurora', name: ' Aurora ' }) === 'Aurora' && brandNameOf({ id: 'aurora', name: '' }) === 'aurora' && brandNameOf(null) === null,
    'page/the name: `name`, else the id as written (Q?1 A)');
  // A font the host will not load: the text stays empty and the miss is named, never a throw.
  const g = host({ refuseFonts: ['Inter|Semi Bold'] });
  const m = await drawCover(g.api, g.root, { brand: 'Aurora', engine: '0.237.0' });
  ok(m.did === 'drawn' && m.fontMisses.some((x) => x.includes('Inter Semi Bold unavailable')) && part(tagged(g.cover)[0], 'brand')!.characters === '', `page/a refused font is named (${m.fontMisses.join('; ')})`);
}

/* ── contrast ────────────────────────────────────────────────────────────────────────────────────────── */
section('contrast — the cover\'s pair is the engine\'s contract, per brand and mode');
{
  // WCAG 2.x relative luminance and ratio, written here: the engine's `ratio` is the claim, not the measure.
  const lum = (hex: string): number => {
    const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // The engine's role path for a Figma variable tail: `color/text/on-brand` → `text.on-brand`.
  const role = (tail: string): string => tail.replace(/^color\//, '').replace(/\//g, '.');
  const ink = role(INK_VARIABLE);
  const ground = role(GROUND_VARIABLE);
  const brands = Object.entries(exampleBrands as Record<string, BrandInput>);
  ok(brands.length >= 2, `contrast/premise: example brands to measure (${brands.map(([k]) => k).join(', ')})`);
  const bad: string[] = [];
  let measured = 0;
  for (const [id, b] of brands) {
    for (const m of resolveAllModes(brandTheme(b))) {
      const r = m.roles[ink];
      const g = m.roles[ground];
      if (!r || !g) { bad.push(`${id} ${m.mode}: no ${!r ? ink : ground}`); continue; }
      measured++;
      if (r.against !== ground) bad.push(`${id} ${m.mode}: ${ink} is contracted against ${r.against}, not ${ground}`);
      else if (r.min < 4.5) bad.push(`${id} ${m.mode}: contract ${r.min} below 4.5`);
      else if (ratio(r.hex, g.hex) < r.min) bad.push(`${id} ${m.mode}: ${ratio(r.hex, g.hex).toFixed(2)} below ${r.min}`);
    }
  }
  ok(bad.length === 0 && measured > 0, `contrast/the cover's ink is contracted against its ground, at 4.5:1 or more, measured here (${measured} brand-modes${bad.length ? `; ${bad.slice(0, 3).join('; ')}` : ''})`);
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
  ok(o.did === 'drawn' && tagged(cov).length === 1 && eq(texts(tagged(cov)[0]).map((t) => t.characters).sort(), ['Aurora', 'Prism3 0.237.0']), 'setup/drawn on the scaffolded Cover page');
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
    vars: [...new Set([...plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0'])],
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
  const host = { ...api, root: { ...api.root, get children() { return pages; }, getSharedPluginData: (ns: string, k: string) => blob.get(`${ns}/${k}`) ?? '',
    findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
  const targets = [{ def: id, plans }];
  // A cover an earlier engine drew, and its own thumbnail.
  await drawCover(api as unknown as CoverApi, host.root as never, { engine: '0.236.0' });
  const fr = tagged(cover as unknown as N)[0];
  ok(!!fr && thumb === fr && part(fr, 'version')?.characters === 'Prism3 0.236.0', 'update/premise: a cover drawn by 0.236.0, the thumbnail');
  const pre = await previewUpdate(host, targets);
  const v = previewVerdict(pre);
  ok(pre.cover?.state === 'stale' && v.lines.some((l) => l.startsWith('Cover: to set the version to 0.237.0 (shows 0.236.0).')), `update/dry run lists the cover (${v.lines.join(' | ')})`);
  ok(part(fr, 'version')?.characters === 'Prism3 0.236.0', 'update/the check wrote nothing');
  const res = await applyUpdate(host, api as never, targets, previewHashOf(pre), { today: '2026-10-21' });
  const now = tagged(cover as unknown as N);
  ok(now.length === 1 && now[0] === fr && part(fr, 'version')?.characters === 'Prism3 0.237.0', `update/version refreshed, read off the shim (${part(fr, 'version')?.characters})`);
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
}

console.log(failed ? `\n✗ ${failed} of ${executed} failed` : `\n✓ all passed — ${executed} assertions executed`);
if (failed) process.exit(1);
