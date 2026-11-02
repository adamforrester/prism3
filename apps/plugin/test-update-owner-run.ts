/**
 * #3308 — THE OWNER'S FIRST RUN, THROUGH THE REAL `main.ts`, UNDER THE STRICT HOST: a fresh file, five families ticked
 * on Components (Button, Checkbox group, Icon, Link, Badge), then Update file.
 *
 *   npx tsx apps/plugin/test-update-owner-run.ts
 *
 * The owner's run read "Stopped at To add · Built 9 sets · 5 with problems" and never reached the style guides,
 * although every set it was asked for was built. #3323 lets a sets step whose sets all completed, some with problems,
 * go on. This holds that against the plugin's own answers for the owner's exact selection, not synthetic ones:
 *
 *   1. Set up file on the fresh file answers ok.
 *   2. The queue is the panel's: the five families' rows (`groupsOf`), each ticked as its box ticks (`toggleSets`), in
 *      the order Update file posts them (`queuedOf`). Each set is posted once, straight after the last answer, as the
 *      panel's build queue does (`runAfterResult`).
 *   3. Each answer is a `component-result` that COMPLETED; which are clean and which have problems, and each problem's
 *      reason, are held against literals. The owner's strip counted the same: "Built 9 sets · 5 with problems".
 *   4. Those answers, recorded as the panel records them, go through the panel's `runVerdict` and `stepDone`: the run
 *      moves on to the style guides, and its verdict is the "⚠" warning Activity counts as one.
 *
 * THE HOST is the shared component shim with its strict default (#3215: no opt-out, so the host and root methods
 * are fixed as Figma's are). The suite adds what a fresh file has that the shim lacks (its pages, the UI channel) as new
 * properties, patching no host method; the shim's own `liveRoot` search reads every page (`pages`, #3308), so a set
 * that nests another finds it built, as a reference that makes instances. (`test-update-fresh.ts`'s patched search
 * hands back page nodes that cannot, so a nesting set fails there: #3325.)
 *
 * INDEPENDENCE (docs/34): what is read is what `main.ts` posted; the expected kinds, headlines and reasons are typed
 * here as literals. The queue is the panel's own functions over the plugin's defs, as the panel computes it.
 *
 * Mutations this fails by name: `stepDone` ignoring `warn` (`apps/studio/src/state/update-file.ts`, #3323) → `run/goes
 * on`; the "⚠" dropped from `runVerdict`'s with-problems headline (`build-queue.ts`) → `run/verdict`.
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
import { groupsOf, toggleSets } from '../studio/src/state/component-groups';
import { queuedOf, startUpdate, stepDone, stepOf } from '../studio/src/state/update-file';
import { startRun, record, runVerdict } from '../studio/src/state/build-queue';
import { leafForDef } from './src/file-taxonomy';

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

console.log("The owner's first run: a fresh file, Button, Checkbox group, Icon, Link and Badge, Update file (#3308)");

// 0. The host is strict, as Figma's is (#3215): its methods and its root's are fixed, so nothing here replaced one.
const fixedOn = (o: object, k: string): boolean => { const d = Object.getOwnPropertyDescriptor(o, k); return !!d && typeof d.value === 'function' && d.writable === false && d.configurable === false; };
ok(fixedOn(shim, 'getNodeByIdAsync') && fixedOn(shim, 'loadAllPagesAsync') && fixedOn(root, 'findAllWithCriteria') && fixedOn(root, 'findAll'),
  'fixture: the strict host: the host\'s and the root\'s methods are fixed, and the search is the shim\'s own');

// 1. Set up file, the run's first step on a fresh file.
const setup = await send({ type: 'file-setup' }, ['file-setup-result']);
ok(setup?.type === 'file-setup-result' && setup.ok === true, `setup: Set up file answers ok (${said(setup)})`);

// 2. The queue, as the panel makes it from the five ticks.
const placeOf = (id: string) => { const at = leafForDef(id); return at ? { page: at.leaf.page, section: at.section.header } : null; };
const catalog = catalogOf(componentDefs, (d) => figmaAnatomySet(d, { swapTarget: CATALOG_SWAP_TARGET }), placeOf);
const rows = groupsOf(catalog).flatMap((s) => s.rows);
// The owner's ticks: the Buttons family's box (its four sets), and Checkbox group, Checkbox row, Icon, Link and Badge,
// each by its own set's box. Nine sets, as the owner's strip counted them ("Built 9 sets").
const TICKED: readonly (readonly string[])[] = [rows.find((r) => r.label === 'Buttons')?.ids ?? [], ['checkbox-group'], ['checkbox-row'], ['icon'], ['link'], ['badge']];
let queue: string[] = [];
for (const ids of TICKED) { const t = toggleSets(catalog, ids, new Set(queue), []); if (t.on) queue = [...queue, ...t.ids]; }
const order = queuedOf(catalog, { present: [] }, queue);
ok(JSON.stringify(order) === JSON.stringify(['button', 'button-destructive', 'button-group', 'button-neutral', 'link', 'badge', 'checkbox-group', 'checkbox-row', 'icon']),
  `queue: the owner's ticks queue nine sets, in the order Update file posts them (${order.join(', ')})`);

// 3. Each set, posted once, straight after the last answer. Every one completes. Button, Link, Badge, Checkbox.Group and
//    Checkbox.Row are built with problems, as the owner's were; the other four are clean.
const DOC_BLOCK = 'No usage panels drawn: this file has no _Doc-block component. Run Set up file, then build again';
const WITH_PROBLEMS = ['button', 'link', 'badge', 'checkbox-group', 'checkbox-row'];
const answers: { id: string; r: any }[] = [];
for (const id of order) {
  const r = await send({ type: 'build-components', def: id }, ['component-result']);
  answers.push({ id, r });
  const lines: string[] = Array.isArray(r?.lines) ? r.lines : [];
  const bad = WITH_PROBLEMS.includes(id);
  ok(r?.type === 'component-result' && r.completed === true && r.ok === !bad,
    `sets/${id}: answered by a component-result that completed, ${bad ? 'with problems' : 'clean'} (${said(r)})`);
  // The reason each set with problems has: Set up file, the run's first step, cannot draw the _Doc-block template on a
  // fresh file (Q3308.3, held for the owner). A clean set has no such line.
  ok(lines.includes(DOC_BLOCK) === bad, `sets/${id}: ${bad ? 'its problem is' : 'no problem line:'} "${DOC_BLOCK}" (${JSON.stringify(lines.filter((l) => l.startsWith('No usage') || l.startsWith('⚠')))})`);
}
// Checkbox.Row, queued after Checkbox.Group built it as a dependency, is built again and finds its members present: the
// owner's "built twice" (#3308 item 3, its own fix). Its problem lines say so.
const row = answers.find((a) => a.id === 'checkbox-row')?.r;
ok(row?.headline === '⚠ already built' && (row?.lines ?? []).some((l: string) => l.startsWith('⚠ 6 misses (member status=default, size=medium -> ALREADY PRESENT (skipped; this set has been written before);')),
  `sets/checkbox-row: built again after Checkbox.Group's dependency build, its six members already present (${JSON.stringify(row?.headline)})`);

// 4. The panel's verdict and run over those answers, recorded as `runAfterResult` records each: ok, issues (completed,
//    not ok) or failed. The theme step is the file's variables above, so the run here is Set up file, To add, Style guides.
let run = startRun('selection', order);
for (const { id, r } of answers) run = record(run, { id, result: r?.ok ? 'ok' : r?.completed ? 'issues' : 'failed', headline: String(r?.headline ?? '') });
const verdict = runVerdict(run, catalog);
ok(verdict.ok === false && verdict.headline === '⚠ Built 9 sets · 5 with problems',
  `run/verdict: the queue's verdict is a warning, "⚠ Built 9 sets · 5 with problems" (${JSON.stringify({ ok: verdict.ok, headline: verdict.headline })})`);
let u = startUpdate(['setup', 'sets', 'guides'], order);
u = stepDone(u, setup?.ok === true, String(setup?.headline ?? ''));
// Every set did what it was asked (each answer completed), so the sets step is a warning, not a failure.
u = stepDone(u, verdict.ok, verdict.headline, answers.length === order.length && answers.every((a) => a.r?.completed === true));
ok(!u.done && stepOf(u) === 'guides' && u.results[1]?.warn === true,
  `run/goes on: the owner's run moves on from To add to the style guides, its sets step a warning (${JSON.stringify({ done: u.done, next: stepOf(u), sets: u.results[1] })})`);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
