/**
 * #3128 — UPDATE FILE ON A FRESH FILE, EVERY SET, THROUGH THE REAL `main.ts`: no set's post is refused.
 *
 *   npx tsx apps/plugin/test-update-fresh.ts
 *
 * The owner's run: a new, empty file, Update file with everything ticked. Set up file landed, Icon (the first set in
 * catalog order) landed, and the run sat on ProviderLogo (the second) for good. Nothing about ProviderLogo itself: it is the
 * first set the panel's build queue posts AFTER another set's result. The queue (`apps/studio/src/main.ts`
 * `runAfterResult`, #2700) posts the next set the moment a `component-result` lands, and so does Update file's `update`
 * step after the sets step's last one. Until #3128 the plugin still held the build's run guard (#1957) after posting
 * that result, through the settle probe (#908, telemetry that writes nothing), so the next post was answered `refused`;
 * the panel kept it pending for a verdict that had already been sent, and the run never ended.
 *
 * So this drives the panel's own rule, NOT `test-build-completed.ts`'s retry-until-taken: each post is sent once, the
 * moment the last answer lands, and its FIRST answer is read. The host is the strict component shim (#3215) reading the
 * suite's pages (`pages`, #3308), starting from one empty page, with every variable and style the sets bind.
 *
 * #3325: this suite used to patch the root's search to add the raw nodes on its pages. A raw node cannot make an
 * instance, so every set that nests another failed its build (`target.createInstance is not a function`), and the
 * suite passed anyway, because it read only each answer's `type`. Now the shim's own search reads the pages, and
 * each set's answer must have completed, clean.
 *
 *   1. Set up file on the fresh file answers with its result.
 *   2. Every buildable set in catalog order (the order Update file's sets step posts them), each posted once, straight
 *      after the previous result: each is answered by a `component-result`, never `refused`, that completed, clean.
 *   3. Update file's `update` step posted straight after the last set's result: answered by a `component-update-result`.
 *
 * INDEPENDENCE (docs/34): what is read is what `main.ts` posted to the panel; the expected answer types are the wire's
 * literals. The order is the studio's own catalog function over the plugin's defs, as the panel's catalog is computed.
 *
 * Mutation this fails by name: `buildComponents` no longer releasing the build's guard when its verdict posts (`main.ts`,
 * the `guard.release` call after `verdictPosted = true`) → `sets/provider-logo: answered by a component-result …` (refused) and
 * `update/after the last set: answered by component-update-result`. `run-guard.ts`'s `finally` deleting the operation
 * whoever holds it (the hold token dropped) → `guard/release: released, …`. The #3325 patch put back (the root's search
 * also returning the raw nodes on the pages, the strict host opted out) → `sets/button: answered by a component-result that
 * completed, clean`, and the same for each set that nests another.
 */
import { makeShim } from './component-shim';
import type { Node } from './component-shim';
import { componentDefs } from '@prism3/engine/components/index';
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { SWAP_TARGET } from './src/build-deps';
import { materializeForBrand } from './src/brand-def';
import { catalogOf, CATALOG_SWAP_TARGET } from '../studio/src/state/component-catalog';
import { leafForDef } from './src/file-taxonomy';
import { createRunGuard } from './src/run-guard';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/* ── the host: the component shim, a page list holding one empty page, and the UI channel ─────────────────────────── */

type ShimPage = { id: string; name: string; type: 'PAGE'; isPageDivider: boolean; children: Node[]; appendChild(c: Node): void; insertChild(i: number, c: Node): void; findOne(p: (n: unknown) => boolean): unknown };
const pages: ShimPage[] = [];
let pageSeq = 0;
const mkPage = (divider: boolean): ShimPage => {
  const p: ShimPage = {
    id: `PAGE:${++pageSeq}`, name: divider ? '---' : '', type: 'PAGE', isPageDivider: divider, children: [],
    appendChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); this.children.push(c); c.parent = this as unknown as Node; },
    insertChild(at, c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = this as unknown as Node; this.children.splice(Math.max(0, Math.min(at, this.children.length)), 0, c); },
    findOne(pred) { return this.children.find(pred) ?? null; },
  };
  pages.push(p);
  return p;
};
const first = mkPage(false);
first.name = 'Page 1';
const posted: any[] = [];
// No opt-out: the strict host (#3215). The shim reads the suite's pages itself (`pages`, #3308), so a set that nests
// another finds it built, as a reference that makes instances. The patched search this suite had (#3325) handed the
// executor raw page nodes, which cannot make one, and every nesting set's build failed.
// The file after the run's Theme step: every variable and style a set binds under the example brand is in it, so a miss
// is a real one, not a theme the shim never applied (as `test-update-owner-run.ts` builds it).
const brand = Object.values(exampleBrands as Record<string, unknown>)[0] as BrandInput;
const plans = componentDefs.flatMap((d) => [d, materializeForBrand(d, brand)]).flatMap((d) => figmaAnatomySet(d, { swapTarget: SWAP_TARGET }));
const shim = makeShim({
  vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
  page: first, pages: () => pages, liveRoot: true, liveComponents: true, identities: true }) as Record<string, any>;
const root = shim.root as Record<string, unknown>;
const pluginData = new Map<string, string>();
const sharedData = new Map<string, string>();
// What a document has and the shim's root does not: its pages and its data. Each is a property the root lacks.
Object.defineProperty(root, 'children', { get: () => pages });
Object.assign(root, {
  name: 'fresh file', type: 'DOCUMENT',
  insertChild: (index: number, child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.splice(Math.max(0, Math.min(index, pages.length)), 0, child); },
  appendChild: (child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.push(child); },
  getSharedPluginData: (ns: string, k: string) => sharedData.get(`${ns}:${k}`) ?? '',
  setSharedPluginData: (ns: string, k: string, v: string) => { sharedData.set(`${ns}:${k}`, v); },
  getPluginData: (k: string) => pluginData.get(k) ?? '',
  setPluginData: (k: string, v: string) => { pluginData.set(k, v); },
});
/** Every node on the suite's pages, for the read-back below. */
const onPages = (): Node[] => { const out: Node[] = []; const walk = (n: Node) => { out.push(n); for (const c of (n.children as Node[] | undefined) ?? []) walk(c); }; for (const p of pages) for (const c of p.children) walk(c); return out; };
const empty = async () => [];
// What the host has and the shim does not. Each is a property the host lacks, so none is a patch.
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  createPage: () => mkPage(false),
  createPageDivider: () => mkPage(true),
  // Figma's `createComponent`, as the shim makes a component: Set up file builds the file's templates.
  createComponent: () => shim.createComponentFromNode(shim.createFrame()),
  setCurrentPageAsync: async () => undefined,
  listAvailableFontsAsync: empty,
  getLocalPaintStylesAsync: empty,
  getLocalGridStylesAsync: empty,
});
const g = globalThis as Record<string, unknown>;
g.figma = shim; g.__html__ = ''; g.PRISM3_BUILD = '2026-10-28T00:00:00Z tree-test0000';
// The build's per-chunk console lines are telemetry; this test reads the panel's posts.
const log = console.log;
console.log = (...a: unknown[]) => { if (typeof a[0] === 'string' && a[0].startsWith('[prism3')) return; log(...a); };

await import('./src/main');

const realTimeout = globalThis.setTimeout;
/** Post `msg` ONCE, as the panel does, and return its first answer: a message of one of `kinds`, or `refused`. */
const send = async (msg: unknown, kinds: readonly string[], ms = 30_000): Promise<any> => {
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
const said = (r: any): string => (r ? `${r.type}: ${JSON.stringify({ ok: r.ok, completed: r.completed })} ${r.headline ?? r.message ?? ''}` : 'no answer in 30 s');

console.log('Update file on a fresh file, every set, through main.ts (#3128)');

// 0. The host is strict, as Figma's is (#3215): its methods and its root's are fixed, so nothing here replaced one.
const fixedOn = (o: object, k: string): boolean => { const d = Object.getOwnPropertyDescriptor(o, k); return !!d && typeof d.value === 'function' && d.writable === false && d.configurable === false; };
ok(fixedOn(shim, 'getNodeByIdAsync') && fixedOn(root, 'findAllWithCriteria') && fixedOn(root, 'findAll'),
  'fixture: the strict host: the host\'s and the root\'s methods are fixed, and the search is the shim\'s own (#3325)');

// 1. Set up file.
const setup = await send({ type: 'file-setup' }, ['file-setup-result']);
ok(setup?.type === 'file-setup-result', `setup: Set up file answers with its result (${said(setup)})`);

// 2. Every buildable set, in the panel's catalog order, each posted the moment the last answer landed.
const placeOf = (id: string) => { const at = leafForDef(id); return at ? { page: at.leaf.page, section: at.section.header } : null; };
const order = catalogOf(componentDefs, (d) => figmaAnatomySet(d, { swapTarget: CATALOG_SWAP_TARGET }), placeOf).filter((e) => e.buildable).map((e) => e.id);
ok(order[0] === 'icon' && order[1] === 'provider-logo', `sets: Icon then ProviderLogo lead the catalog, as in the owner's run (${order.slice(0, 2).join(', ')})`);
for (const id of order) {
  const r = await send({ type: 'build-components', def: id }, ['component-result']);
  // #3325: the answer's TYPE alone passed while every set that nests another failed its build. Each set completes,
  // clean: the file holds every variable and style the set binds, and every set it nests is built before it.
  ok(r?.type === 'component-result' && r.completed === true && r.ok === true, `sets/${id}: answered by a component-result that completed, clean (${said(r)})`);
}
const marks = onPages().filter((n) => n.type === 'COMPONENT' && String(n.name).startsWith('provider-logo/'));
ok(marks.length > 0, `sets: ProviderLogo's components reached the file (${marks.length})`);

// 3. Update file's update step, posted straight after the sets step's last result.
const upd = await send({ type: 'update-sets', defs: ['badge'], previewHash: '', handEdits: 'keep' }, ['component-update-result']);
ok(upd?.type === 'component-update-result', `update/after the last set: answered by component-update-result (${said(upd)})`);

// 4. The guard's release, alone: a run that released its hold early, ending after a later run took the same operation,
//    leaves that later run's hold in place, so a third run of the operation is still refused.
{
  const g2 = createRunGuard();
  let endFirst!: () => void;
  const first = g2.run('build-components', () => new Promise<void>((res) => { endFirst = res; }));
  g2.release('build-components');
  const freed = !g2.busy();
  let endSecond!: () => void;
  const second = g2.run('build-components', () => new Promise<void>((res) => { endSecond = res; }));
  endFirst(); await first;
  ok(freed && g2.holding('build-components'), `guard/release: released, the file is free (${freed}); a later run's hold outlives the first run's end (held ${g2.held()})`);
  endSecond(); await second;
  ok(!g2.busy(), 'guard/release: the later run releases its own hold when it ends');
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
