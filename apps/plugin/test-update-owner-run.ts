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
 *   3. Each answer is a `component-result` that COMPLETED. The owner's strip counted "Built 9 sets · 5 with problems",
 *      each problem the missing `_Doc-block`. Since #3467 (Q2 A) that is a note, not a problem: all nine are clean, and
 *      the five whose family draws a usage panel each carry the note, with the fix that works on the file as that build
 *      left it (Q5 A), held against literals.
 *   4. Those answers, recorded as the panel records them, go through the panel's `runVerdict` and `stepDone`: the run
 *      moves on to the style guides, its sets step clean, and the run carries the latest note (`runCauses`, #3467).
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
 * Mutations this fails by name: a missing `_Doc-block` turning the run `⚠` again (`withTemplateWarning`'s warn filter,
 * `canvas-furniture.ts`) → `sets/<id>: … clean` and `run/verdict`; `runCauses` skipping a clean set's note
 * (`build-queue.ts`) → `#3467 run/note`. Before #3467 this file also held `stepDone` ignoring `warn` and `runVerdict`'s
 * "⚠"; with every set clean it no longer can, and `test-update-file.ts` (`run/warn goes on`) and
 * `apps/studio/test-component-groups.ts` (`a run with problems says how many, marked a warning`) hold them.
 */
import { makeShim } from './component-shim';
import type { Node } from './component-shim';
import { componentDefs, figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/components';
import type { BrandInput } from '@prism3/engine';
import { EXAMPLE_BRANDS_JSON as exampleBrands } from '@prism3/engine';
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
// #3306 (Q3306.2 A): a set a queued set nests is held, and a tick on it writes nothing, so Checkbox row and Icon ticked
// AFTER Checkbox group and Button would no longer reach the queue. The same nine sets reach it when the nested two are
// ticked first, which is the order replayed here, so the owner's exact queue is kept.
const TICKED: readonly (readonly string[])[] = [['icon'], ['checkbox-row'], rows.find((r) => r.label === 'Buttons')?.ids ?? [], ['checkbox-group'], ['link'], ['badge']];
let queue: string[] = [];
for (const ids of TICKED) { const t = toggleSets(catalog, ids, new Set(queue), []); if (t.on) queue = [...queue, ...t.ids]; }
const order = queuedOf(catalog, { present: [] }, queue);
ok(JSON.stringify(order) === JSON.stringify(['button', 'button-destructive', 'button-group', 'button-neutral', 'link', 'badge', 'checkbox-group', 'checkbox-row', 'icon']),
  `queue: the owner's ticks queue nine sets, in the order Update file posts them (${order.join(', ')})`);

// 3. Each set, posted once, straight after the last answer. Every one completes, clean (#3467 Q2 A). Button, Link, Badge,
//    Checkbox.Group and Checkbox.Row, the owner's five with problems, each say no usage panel was drawn, as a note with
//    the fix for the file as its build left it: Badge is in the file from its own build on, so the later lines drop it.
const NOTE_BEFORE_BADGE = 'No usage panels drawn: this file has no _Doc-block component. Build badge, tag, list-item, divider, then run Set up file and build again';
const NOTE_AFTER_BADGE = 'No usage panels drawn: this file has no _Doc-block component. Build tag, list-item, divider, then run Set up file and build again';
const NOTED: Record<string, string> = { button: NOTE_BEFORE_BADGE, link: NOTE_BEFORE_BADGE, badge: NOTE_AFTER_BADGE, 'checkbox-group': NOTE_AFTER_BADGE, 'checkbox-row': NOTE_AFTER_BADGE };
// Posted in the run's order, as the panel posts them: `startRun` puts each set after the queued sets it nests (#3320).
let run = startRun('selection', order, catalog);
const answers: { id: string; r: any }[] = [];
for (const id of run.ids) {
  const r = await send({ type: 'build-components', def: id }, ['component-result']);
  answers.push({ id, r });
  const lines: string[] = Array.isArray(r?.lines) ? r.lines : [];
  const causes: any[] = Array.isArray(r?.causes) ? r.causes : [];
  const note = NOTED[id];
  ok(r?.type === 'component-result' && r.completed === true && r.ok === true && String(r.headline).startsWith('✓'),
    `sets/${id}: answered by a component-result that completed, clean (${said(r)})`);
  // The line a set with a usage panel has: Set up file, the run's first step, cannot draw the _Doc-block template on a
  // fresh file. A set with no panel family has none.
  const wanted = note ? [note] : [];
  ok(JSON.stringify(lines.filter((l) => l.startsWith('No usage'))) === JSON.stringify(wanted),
    `sets/${id}: ${note ? `its note line is "${note}"` : 'no usage-panel line'} (${JSON.stringify(lines.filter((l) => l.startsWith('No usage') || l.startsWith('⚠')))})`);
  ok(causes.every((c) => c.kind === 'note') && causes.length === (note ? 1 : 0),
    `#3467 sets/${id}: ${note ? 'one cause, a note' : 'no cause'}, and no problem (${JSON.stringify(causes)})`);
}
// Checkbox.Row, posted before Checkbox.Group (which nests it), is built once: no member is found already present. The
// owner's "built twice" (#3308 item 3) is #3320's fix.
const row = answers.find((a) => a.id === 'checkbox-row')?.r;
ok(row?.headline === '✓ built 6 variants' && !(row?.lines ?? []).some((l: string) => l.includes('ALREADY PRESENT')),
  `sets/checkbox-row: built once, before Checkbox.Group, its six members new (${JSON.stringify(row?.headline)})`);

// 4. The panel's verdict and run over those answers, recorded as `runAfterResult` records each: ok, issues (completed,
//    not ok) or failed. The theme step is the file's variables above, so the run here is Set up file, To add, Style guides.
for (const { id, r } of answers) run = record(run, { id, result: r?.ok ? 'ok' : r?.completed ? 'issues' : 'failed', headline: String(r?.headline ?? ''), causes: r?.causes });
const verdict = runVerdict(run, catalog);
ok(verdict.ok === true && verdict.headline === 'Built 9 sets',
  `run/verdict: the queue's verdict is clean, "Built 9 sets" (${JSON.stringify({ ok: verdict.ok, headline: verdict.headline })})`);
// #3467: the run keeps the latest note, a clean set's, so Activity says it once with the file's current fix.
ok(JSON.stringify(verdict.causes) === JSON.stringify([{ kind: 'note', subject: null, what: 'No usage panels drawn: this file has no _Doc-block component.', reasons: ['Build tag, list-item, divider, then run Set up file and build again.'] }]),
  `#3467 run/note: the run carries one note, the last build's (${JSON.stringify(verdict.causes)})`);
let u = startUpdate(['setup', 'sets', 'guides'], order);
u = stepDone(u, setup?.ok === true, String(setup?.headline ?? ''));
// Every set did what it was asked (each answer completed), so the sets step is a warning, not a failure.
u = stepDone(u, verdict.ok, verdict.headline, answers.length === order.length && answers.every((a) => a.r?.completed === true));
ok(!u.done && stepOf(u) === 'guides' && u.results[1]?.ok === true && u.results[1]?.warn !== true,
  `run/goes on: the owner's run moves on from To add to the style guides, its sets step clean (${JSON.stringify({ done: u.done, next: stepOf(u), sets: u.results[1] })})`);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
