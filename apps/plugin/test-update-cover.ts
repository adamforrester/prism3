/**
 * #3308 (Q3308.4 A) — THE COVER AND ABOUT THIS LIBRARY ON A FIRST RUN, THROUGH THE REAL `main.ts`, UNDER THE STRICT HOST.
 *
 *   npx tsx apps/plugin/test-update-cover.ts
 *
 * The owner's first run never drew the cover or About this library: Set up file, the run's first step, says "the file has
 * no brand yet. Run Update file with Theme ticked, then it draws the cover", and nothing after Theme in the same run drew
 * it. The owner chose A: a run that includes Set up file and Theme ends by drawing both. The panel's run ends with a
 * `cover` step (`stepsOf`), which is the in-place update over no sets: its check (`update-check-request`, no defs), then
 * its apply (`update-sets`, no defs, the check's hash), whose finish draws the cover and About this library.
 *
 *   1. `steps`: on a fresh file the checklist's default ticks (Set up file, Theme, Style guides) run `cover` last; with
 *      Theme unticked, or on a file already set up, there is no `cover` step.
 *   2. `run`: on a fresh file, Set up file then Theme, as the run posts them, then a queued set, then the `cover` step's
 *      two posts. Before it, the Cover page holds neither frame, and Set up file said why. After it, the Cover page
 *      holds the cover and About this library, and the step's verdict is ok.
 *
 * THE HOST is #3323's (`test-update-owner-run.ts`): the shared component shim with its strict default (#3215), a fresh
 * file's pages added as properties the host lacks, and the shim's own `liveRoot` search over every page (`pages`).
 *
 * INDEPENDENCE (docs/34): the frames are read off the shim's Cover page by their names, typed here as literals; the
 * steps are literals.
 *
 * MUTATIONS, each failing by name: `stepsOf` with no `cover` step → `steps/fresh` and the chrome arm; the `cover` step
 * posting nothing (`startStep`) → the chrome arm.
 */
import { makeShim } from './component-shim';
import type { Node } from './component-shim';
import { componentDefs } from '@prism3/engine/components/index';
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { SWAP_TARGET } from './src/build-deps';
import { materializeForBrand } from './src/brand-def';
import { defaultTicks, stepsOf } from '../studio/src/state/update-file';
import { catalogOf, CATALOG_SWAP_TARGET } from '../studio/src/state/component-catalog';
import { leafForDef } from './src/file-taxonomy';
import { persistInput } from './src/persist-figma';
import { themePlans } from './src/apply-theme';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/* ── the host: the strict shim, a fresh file's one page, and the UI channel ─────────────────────────────────────── */

type ShimPage = { id: string; name: string; type: 'PAGE'; isPageDivider: boolean; parent: unknown; children: Node[]; appendChild(c: Node): void; insertChild(i: number, c: Node): void; findOne(p: (n: unknown) => boolean): unknown };
const pages: ShimPage[] = [];
let pageSeq = 0;
/** Take `c` out of whatever holds it now, as Figma does when a node is appended elsewhere. */
const detach = (c: Node): void => { const p = c.parent as { children?: Node[] } | null | undefined; const i = p?.children?.indexOf(c) ?? -1; if (i >= 0) p!.children!.splice(i, 1); };
const mkPage = (divider: boolean): ShimPage => {
  const p: ShimPage = {
    id: `PAGE:${++pageSeq}`, name: divider ? '---' : '', type: 'PAGE', isPageDivider: divider, parent: null, children: [],
    appendChild(c) { detach(c); this.children.push(c); c.parent = this as unknown as Node; },
    insertChild(at, c) { detach(c); c.parent = this as unknown as Node; this.children.splice(Math.max(0, Math.min(at, this.children.length)), 0, c); },
    findOne(pred) { return this.children.find(pred) ?? null; },
  };
  pages.push(p);
  return p;
};
const first = mkPage(false);
first.name = 'Page 1';
const posted: any[] = [];
// The file after the run's Theme step: every variable and style a set binds under the example brand (the owner's) is in
// it, so a miss is a real one, not a theme the shim never applied.
const brand = Object.values(exampleBrands as Record<string, unknown>)[0] as BrandInput;
const plans = componentDefs.flatMap((d) => [d, materializeForBrand(d, brand)]).flatMap((d) => figmaAnatomySet(d, { swapTarget: SWAP_TARGET }));
// No opt-out: the strict host (#3215). `page` is the current page, where the shim's own `currentPage` appends.
const shim = makeShim({
  vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  // …and every text style the theme makes, which `_Doc-block` takes (`title/…`, `body/…`, `label/…`).
  styles: [...new Set([...plans.flatMap((p) => planTextStyles(p.root)), ...themePlans(brand).textPlan.map((r) => r.name)])],
  effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
  page: first, pages: () => pages, liveRoot: true, liveComponents: true, identities: true }) as Record<string, any>;
const root = shim.root as Record<string, unknown>;
const pluginData = new Map<string, string>();
const sharedData = new Map<string, string>();
// What a document has and the shim's root does not: its pages and its data. Each is a property the root lacks.
Object.defineProperty(root, 'children', { get: () => pages });
Object.assign(root, {
  name: 'fresh file', type: 'DOCUMENT',
  insertChild: (index: number, child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.splice(Math.max(0, Math.min(index, pages.length)), 0, child); child.parent = root; },
  appendChild: (child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.push(child); child.parent = root; },
  getSharedPluginData: (ns: string, k: string) => sharedData.get(`${ns}:${k}`) ?? '',
  setSharedPluginData: (ns: string, k: string, v: string) => { sharedData.set(`${ns}:${k}`, v); },
  getPluginData: (k: string) => pluginData.get(k) ?? '',
  setPluginData: (k: string, v: string) => { pluginData.set(k, v); },
});
for (const p of pages) p.parent = root;
const empty = async () => [];
// What the host has and the shim does not. Each is a property the host lacks, so none is a patch.
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  createPage: () => { const p = mkPage(false); p.parent = root; return p; },
  createPageDivider: () => { const p = mkPage(true); p.parent = root; return p; },
  // Figma's `createComponent`, as the shim makes a component: Set up file builds the file's templates.
  createComponent: () => shim.createComponentFromNode(shim.createFrame()),
  setCurrentPageAsync: async () => undefined,
  listAvailableFontsAsync: empty,
  getLocalPaintStylesAsync: empty,
  getLocalGridStylesAsync: empty,
});
const g = globalThis as Record<string, unknown>;
g.figma = shim; g.__html__ = ''; g.PRISM3_BUILD = '2026-11-02T00:00:00Z tree-test0000';
const log = console.log;
console.log = (...a: unknown[]) => { if (typeof a[0] === 'string' && a[0].startsWith('[prism3')) return; log(...a); };

await import('./src/main');

const realTimeout = globalThis.setTimeout;
/** Post `msg` ONCE, as the panel does, and return its first answer: a message of one of `kinds`, or `refused`. */
const send = async (msg: unknown, kinds: readonly string[], ms = 120_000): Promise<any> => {
  posted.length = 0;
  (shim.ui as { onmessage: (m: unknown) => void }).onmessage(msg);
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = posted.find((m) => m?.type === 'refused' || kinds.includes(m?.type));
    if (r) return r;
    await new Promise((res) => realTimeout(res, 2));
  }
  return null;
};
const said = (r: any): string => (r ? JSON.stringify({ type: r.type, ok: r.ok, completed: r.completed, headline: r.headline ?? r.message }) : 'no answer in 120 s');


const placeOf = (id: string) => { const at = leafForDef(id); return at ? { page: at.leaf.page, section: at.section.header } : null; };
const catalog = catalogOf(componentDefs, (d) => figmaAnatomySet(d, { swapTarget: CATALOG_SWAP_TARGET }), placeOf);
const coverPage = () => pages.find((p) => p.name === 'Cover');
const frameOn = (name: string): boolean => !!coverPage()?.children.some((n) => n.name === name);

console.log('The cover and About this library on a first run (#3308 Q3308.4 A)');

const fixedOn = (o: object, k: string): boolean => { const d = Object.getOwnPropertyDescriptor(o, k); return !!d && typeof d.value === 'function' && d.writable === false && d.configurable === false; };
ok(fixedOn(shim, 'getNodeByIdAsync') && fixedOn(root, 'findAllWithCriteria'), 'fixture: the strict host: the host\'s and the root\'s methods are fixed');

/* ── 1. the steps ─────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const fresh = { present: [], setUp: false, error: null, due: {} };
  const t = defaultTicks(catalog, fresh);
  ok(JSON.stringify(stepsOf(t, fresh, ['badge'])) === JSON.stringify(['setup', 'theme', 'sets', 'guides', 'cover']),
    `steps/fresh: a fresh file's run ends with the cover (${stepsOf(t, fresh, ['badge']).join(', ')})`);
  ok(JSON.stringify(stepsOf({ ...t, theme: false }, fresh, ['badge'])) === JSON.stringify(['setup', 'sets', 'guides']),
    `steps/no theme: with Theme unticked there is no cover step (${stepsOf({ ...t, theme: false }, fresh, ['badge']).join(', ')})`);
  const setUp = { ...fresh, setUp: true };
  // #3422 Q44 A: a set-up file whose variables differ from the brand, so Theme opens ticked.
  const tu = defaultTicks(catalog, setUp, null, { present: [], theme: true, error: null, due: {} });
  ok(JSON.stringify(stepsOf(tu, setUp, [])) === JSON.stringify(['theme']),
    `steps/set up: on a file already set up there is no cover step (${stepsOf(tu, setUp, []).join(', ')})`);
}

/* ── 2. the run ───────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const setup = await send({ type: 'file-setup' }, ['file-setup-result']);
  ok(setup?.ok === true && String(setup?.summary ?? '').includes('Cover: the file has no brand yet. Run Update file with Theme ticked, then it draws the cover.'),
    `run: Set up file, first, has no brand to draw the cover with, and says so (${said(setup)})`);
  // Theme: the shim holds the variables and styles the sets bind already (above), but cannot take Apply Theme's own
  // writes, so the brand is stored as Apply Theme stores it (`persistInput`, the record `drawCover` reads).
  persistInput(root as unknown as Parameters<typeof persistInput>[0], brand);
  const set = await send({ type: 'build-components', def: 'badge' }, ['component-result']);
  ok(set?.type === 'component-result' && set.completed === true, `run: the queued set is built (${said(set)})`);
  ok(!!coverPage() && !frameOn('Cover') && !frameOn('About this library'), `run: before the cover step, the Cover page holds neither the cover nor About this library (${(coverPage()?.children ?? []).map((n) => n.name).join(', ') || 'empty'})`);
  // The cover step, as the panel posts it: the check over no sets, then the apply with its hash.
  const check = await send({ type: 'update-check-request', defs: [], input: brand }, ['update-check']);
  ok(check?.type === 'update-check' && typeof check.previewHash === 'string' && check.previewHash !== '' && !check.error,
    `run: the cover step's check answers with a hash (${JSON.stringify({ hash: check?.previewHash, error: check?.error })})`);
  const apply = await send({ type: 'update-sets', defs: [], previewHash: check?.previewHash, handEdits: 'keep', input: brand }, ['component-update-result']);
  ok(apply?.type === 'component-update-result' && apply.ok === true, `run: the cover step's apply answers ok (${said(apply)}; ${JSON.stringify(apply?.lines)})`);
  ok(frameOn('Cover') && frameOn('About this library'),
    `run: the run ends with the cover and About this library on the Cover page (${(coverPage()?.children ?? []).map((n) => n.name).join(', ') || 'empty'})`);
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
