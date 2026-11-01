/**
 * `component-result.completed`, through the REAL `main.ts` (UI redesign S8.2, owner decision C1).
 *
 *   npx tsx apps/plugin/test-build-completed.ts
 *
 * The Components page tells "Built with problems" from "Build failed" by one field, `completed`, which
 * `main.ts`'s `buildComponents` sets on its success path as `r.set !== null`: the run reached the end and
 * a set exists. `test:verdict` proves the panel reads the field; this proves the plugin WRITES it, from a
 * real build rather than a hand-built message. It installs the shared component host (`component-shim.ts`)
 * plus a page list as the global `figma`, imports `main.ts` (which calls `figma.showUI` at module scope,
 * the reason `test-agent-link.ts` loads it the same way), and posts the panel's own `build-components`
 * message through `figma.ui.onmessage`. What is read is the `component-result` the plugin posted back.
 *
 * Three runs, each a terminating path `buildComponents` really takes:
 *   · a fresh build of Badge: the set is made → `completed: true` (with or without misses: this host
 *     binds no variables, so `ok` is false and the run is "with problems", not failed)
 *   · Badge again after its members were renamed onto a smaller axis list: the executor REFUSES the set
 *     (#1780, `axesChanged`), returns `set: null` through the SAME success-path post → `completed: false`
 *   · an unknown def: the early return → `completed: false`
 *
 * And #2598's wiring, between the first two: this file has no `_Label`, so the build's `component-result` and the
 * Update's `component-update-result` summary must each carry the missing-template line, literal, as `main.ts` posts
 * them. The Update is driven through `ACTIONS.updateComponents` (check, then apply), the table the panel and the
 * agent link both reach. The host's set search finds the sets on its pages, as Figma's does, and `getNodeByIdAsync`
 * finds the set the build drew beside, so the furniture reaches its template lookup. Such a run is a warning (owner
 * decision Q284.3 A): `ok: false` and a `⚠` headline. Then Set up file's template builder makes the templates, and the
 * same build and Update read `✓`. The host holds the variables and styles Badge binds, so only the template can warn.
 *
 * #3129 Q833 A: a set queued to add (`add-queue.ts`) has its key cleared by the build that lands it whole, where the
 * ledger records it (`queue/build`), and keeps it when the executor refuses the set (`queue/refused`). Mutation failing
 * by name: the clear beside `recordSets` dropped → `queue/build`.
 *
 * INDEPENDENCE (docs/34): the expected values are literals typed here, from the owner's definition of the
 * two results; the actual side is what `main.ts` posted. The refusal is reached by editing the HOST's file
 * (the member names, which are what a set's axes are), never by stubbing the executor.
 *
 * Mutation this fails by name: `completed: true` hard-coded on `main.ts`'s success-path post →
 * `C1: a build the executor refused (#1780) posts completed: false`. The template line dropped from the build's post
 * (`main.ts`, `furnitureItems(furniture, 'build')`) → `templates/build verdict`; from the Update's
 * (`withFurnitureItems(applyVerdict(r), …)`) → `templates/update verdict`. The warning (Q284.3 A) dropped from the
 * build's post (`main.ts`, `withTemplateWarning({ type: 'component-result', … })`) → `templates/build warns`; from the
 * Update's → `templates/update warns`; a warning with every template present → `templates/build clean`,
 * `templates/update clean`. `updateTargets` (`main.ts`) giving no target its `doc` → `panel/update due`; the per-def
 * `furnish` hook without `panelFor` → `panel/update drawn`. Documentation's switches (#2995, the file's
 * `prism3:docSettings`): Build ignoring Usage panels off (`main.ts`, the `readDocSettings(figma.root).panels` before
 * `panelBeside` read as `true`) → `docs/panels off`; Set up file ignoring Cover off (`main.ts` `fileSetup`, its
 * `readDocSettings(figma.root).cover` test never taken) → `docs/cover off`. The as-built ledger (#2909 Q2909.8 A): Build
 * recording nothing (`main.ts`, its `recordSets` after `applyComponentPlan`) → `ledger/build`; the Update recording
 * nothing (its `recordSets` after `applyUpdate`) → `ledger/update`; `file-sets` without `dueOf` → `ledger/due`. #3082 Q811 A
 * (section 1a'): `fileSets` calling `restampQuiet` → `q811/load: the read records nothing`; `restampQuiet` a no-op →
 * `q811/restamp`; `restampQuiet`'s stale filter without the revision (#3101) → `reach/restamp`; the update's record without its print AND `restampQuiet` a no-op → `ledger/print` (either alone is
 * covered by the other: the quiet re-record gives a no-print entry its print); `dueOf` reading a print-less entry under a
 * moved engine `unrecorded` → `q811/unprinted` (#3090 finding 1); `fileSets` printing against the stored brand,
 * `printNow()` → `q811/panel brand` (#3090 M6, section 6); `restampQuiet`'s stale filter losing `!ledger[id].print`, so a
 * print-less entry under today's engine never gains its print → `q811/migrate`. Q699 A
 * (section 6): `main.ts`'s `brandOf` reading the stored brand whatever the panel sends → `q699/due` and `q699/update`
 * ("Nothing was updated: the file changed since the check"). #3023 Q701 B (section 6b): the panel's `brandFor` sending its own brand with
 * Theme unticked → `q701/update writes A`, `q701/next load`. The hand-edit pass (section 7): `stale()` cut to
 * `mine !== handPass`, so a write starting no longer ends it → `hand-edits/guard`. `panelFor` drawing the spec panel
 * after the usage panel (Q2830.3 A: specs are drawn on request only) → `specs/never on build`, `specs/never on update`.
 * #3091 (section 6d): `watchSets`' listener a no-op, so a set deleted or added by hand stays miscounted until the next
 * read → `hand/delete` and `hand/add`.
 * The panel's Draw specs (section 8) scoped to the file, not the current page (`main.ts`'s `draw-specs` case passing
 * `'file'`, or `specTargets` ignoring `page`) → `specs/this page`. #3081 Q810 A (section 6c): the live recount
 * (`fileDue`) reading the stored brand whatever the panel sends → `q810/rises`; it reading the file's sets again each time
 * (`presentCache` unused) → `q810/cheap`; `guarded` keeping the sets it caches after a write → `q810/after a write`; its
 * Theme item compared without the keys sorted (`holdsInput`) → `q810/theme`; `guarded` keeping the sets a recount
 * cached mid-write once the write ends (its `.finally` clear dropped) → `q810/mid-write` (section 7); its `catch` posting
 * no `error` (a failed read reaching the panel as a live answer with nothing due) → `q810/error`; #3137's panels census
 * (Q3137.3 A): the search dropped from `readPresent` → `q3137/premise`; `fileDue` reading the file again for it → `q3137/cheap`;
 * the switch not read on the recount → `q3137/off`; `fileDue` calling
 * `dueOf` without `printNow(input)`, so an engine-moved set reads `unrecorded` → `q810/engine`; `ledgerSets` the same → `q810/engine at open`; `printNow` projecting on every call (`printMemo` unused) → `q810/memo`
 * (#3096 into #3090).
 */
import { EXECUTOR_REACH } from './src/executor-reach';
import { makeShim } from './component-shim';
import type { Node } from './component-shim';
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import { SWAP_TARGET } from './src/build-deps';
import { componentDefs } from '@prism3/engine/components/index';
import type { BrandInput } from '@prism3/engine/theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import { materializeForBrand, materializerFor } from './src/brand-def';
import { entryFor } from './src/as-built-ledger';
import { readSpecTag } from './src/spec-tag';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/* ── the host: the component shim, a page list, and the UI channel ─────────────────────────────────── */

type ShimPage = { id: string; name: string; type: 'PAGE'; isPageDivider: boolean; backgrounds?: readonly unknown[];
  children: Node[]; appendChild(c: Node): void; insertChild(i: number, c: Node): void; findOne(p: (n: unknown) => boolean): unknown };
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

const posted: any[] = [];
// The variables and styles Badge binds are in the file, as after Apply Theme, so a build with every template present is
// clean (✓) and Q284.3's ⚠ can only come from the missing template (`templates/build warns` and `… clean`).
const badgePlans = figmaAnatomySet(componentDefs.find((d) => d.id === 'badge')!, { swapTarget: SWAP_TARGET });
// Section 6's set (Q699 A): one that follows a lever (Switch row's padding follows density) under the example brand, A,
// and the same brand at compact density, B. What it and the sets it nests bind under either brand is in the file too,
// so its update is not blocked for a missing variable.
const LEVER_DEF = 'switch-row';
const brandA = Object.values(exampleBrands as Record<string, unknown>)[0] as BrandInput;
const brandB: BrandInput = { ...brandA, density: 'compact' };
const leverPlans = ['switch-row', 'switch-control', 'icon'].flatMap((id) => [brandA, brandB].flatMap((b) => figmaAnatomySet(materializeForBrand(componentDefs.find((d) => d.id === id)!, b), { swapTarget: SWAP_TARGET })));
const filePlans = [...badgePlans, ...leverPlans];
const shim = makeShim({
  vars: [...new Set(filePlans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  styles: [...new Set(filePlans.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(filePlans.flatMap((p) => planEffectStyles(p.root)))],
}) as Record<string, any>;
const root = shim.root as Record<string, unknown>;
const pluginData = new Map<string, string>();
const sharedData = new Map<string, string>();
Object.defineProperty(root, 'children', { get: () => pages });
Object.assign(root, {
  name: 'build-completed test file',
  type: 'DOCUMENT',
  insertChild: (index: number, child: ShimPage) => {
    const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1);
    pages.splice(Math.max(0, Math.min(index, pages.length)), 0, child);
  },
  appendChild: (child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.push(child); },
  // The file's shared plugin data, so the brand Apply Theme stores (`persistInput`, `prism3:brandInput`) can be set per
  // arm (Q699 A, section 6). Empty until an arm stores one, which reads as no stored brand, as before.
  getSharedPluginData: (ns: string, k: string) => sharedData.get(`${ns}:${k}`) ?? '',
  setSharedPluginData: (ns: string, k: string, v: string) => { sharedData.set(`${ns}:${k}`, v); },
  // The file's own plugin data, so Documentation's settings (`prism3:docSettings`, #2909) can be set per arm.
  getPluginData: (k: string) => pluginData.get(k) ?? '',
  setPluginData: (k: string, v: string) => { pluginData.set(k, v); },
});
// A search for sets finds the ones on the pages, as Figma's does: the Update reads its targets this way. So does a
// search for the usage panels (#846): top-level frames on the pages carrying the shared plugin data asked for.
/** A component node that makes instances of itself, as Figma's `ComponentNode.createInstance` does: a node of the shim's
 *  own kind, typed INSTANCE, that knows its main component. */
const instanceable = (comp: Node): Node => {
  if (!Object.getOwnPropertyDescriptor(comp, 'createInstance')) Object.defineProperty(comp, 'createInstance', { configurable: true, enumerable: false, value: () => {
    const inst = (shim.createFrame as () => Node)();
    inst.type = 'INSTANCE';
    inst._main = comp;
    Object.defineProperty(inst, 'mainComponent', { configurable: true, enumerable: false, writable: true, value: comp });
    return inst;
  } });
  return comp;
};
const shimFind = (root.findAllWithCriteria as (c?: { types?: string[] }) => unknown[]).bind(root);
root.findAllWithCriteria = (c?: { types?: string[]; sharedPluginData?: { namespace: string; keys: string[] } }) => [...shimFind(c),
  ...(c?.types?.includes('COMPONENT_SET') ? pages.flatMap((p) => p.children).filter((n) => n.type === 'COMPONENT_SET') : []),
  // And the components on the pages, the members of a set and the single components a def emits (the icons, #2296), each
  // instanceable as Figma's is, so a set that nests another (section 6) finds it built and can place it.
  ...(c?.types?.includes('COMPONENT') ? pages.flatMap((p) => p.children).flatMap((n) => n.type === 'COMPONENT' ? [n] : n.type === 'COMPONENT_SET' ? (n.children as Node[]) : []).map(instanceable) : []),
  ...(c?.types?.includes('FRAME') && c.sharedPluginData ? pages.flatMap((p) => p.children).filter((n) => n.type === 'FRAME' && c.sharedPluginData!.keys.some((k) => (n as any).getSharedPluginData?.(c.sharedPluginData!.namespace, k))) : [])];
const empty = async () => [];
const listeners: Record<string, ((e: unknown) => void)[]> = {};
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  // #3091: the listeners `main.ts` registers, kept so an arm can fire Figma's `documentchange` as a hand edit does.
  on: (ev: string, fn: (e: unknown) => void) => { (listeners[ev] ??= []).push(fn); },
  createPage: () => mkPage(false),
  createPageDivider: () => mkPage(true),
  setCurrentPageAsync: async () => undefined,
  // The set `furnishSet` draws beside, found by id on the pages, so the build reaches the furniture's template lookup.
  getNodeByIdAsync: async (id: string) => pages.flatMap((p) => p.children).find((n) => n.id === id) ?? null,
  listAvailableFontsAsync: empty,
  getLocalPaintStylesAsync: shim.getLocalPaintStylesAsync ?? empty,
  getLocalGridStylesAsync: shim.getLocalGridStylesAsync ?? empty,
});
const g = globalThis as Record<string, unknown>;
g.figma = shim;
g.__html__ = '';
g.PRISM3_BUILD = '2026-10-05T00:00:00Z tree-test0000';

const { ACTIONS: TABLE } = await import('./src/main');
// #3131 releases a build's guard as soon as its verdict posts, while the build's tail (the settle probe, then
// `thenRestamp`'s quiet re-record) still runs. An arm that plants a ledger entry after a write must wait for that tail,
// or the late re-record records the planted entry over (the #3090 review of cc9fe14f). The panel's messages reach the
// writes through this table and drop the promise (`void ACTIONS.…`), so each write's own promise is kept here, and
// `settled` awaits every one still pending.
const pending = new Set<Promise<void>>();
let writesSeen = 0;
for (const k of ['applyTheme', 'buildComponents', 'updateComponents', 'drawSpecs'] as const) {
  const fn = TABLE[k] as (...a: unknown[]) => Promise<void>;
  (TABLE as Record<string, unknown>)[k] = (...a: unknown[]): Promise<void> => {
    const p = fn(...a).finally(() => pending.delete(p));
    pending.add(p); writesSeen++;
    return p;
  };
}
const settled = async (): Promise<void> => { while (pending.size) await Promise.allSettled([...pending]); };

const realTimeout = globalThis.setTimeout;
/** Post the panel's build message and wait (bounded) for the one `component-result` it produces. The run guard
 *  holds a build until its settle probe ends (#908, #1957), so a build posted while the last one is still settling
 *  is `refused`; that is the panel's own busy rule, and the post is repeated until it is taken. */
const build = async (def: string): Promise<any> => {
  for (let i = 0; i < 1200; i++) {
    posted.length = 0;
    (shim.ui as { onmessage: (m: unknown) => void }).onmessage({ type: 'build-components', def });
    for (let j = 0; j < 3 && !posted.length; j++) await new Promise((res) => realTimeout(res, 5));
    if (posted.some((m) => m?.type === 'refused')) { await new Promise((res) => realTimeout(res, 25)); continue; }
    for (let j = 0; j < 600; j++) {
      const r = posted.find((m) => m?.type === 'component-result');
      if (r) { await settled(); return r; }
      await new Promise((res) => realTimeout(res, 10));
    }
    return null;
  }
  return null;
};

console.log('component-result.completed, through main.ts (C1)');

// 1. A fresh build: the set is made.
// #3129 Q833 A: Badge is queued to add (`add-queue.ts`, the root's shared data); the build that lands it clears its key.
sharedData.set('prism3:addQueue.badge', '2026-10-28T09:00:00.000Z');
const first = await build('badge');
ok(first !== null, `the build posts a component-result (${first ? first.headline : 'none in 6 s'})`);
ok(writesSeen === 1 && pending.size === 0, `fixture: the panel's build reached the action table, and the test waited out its tail (${writesSeen} seen, ${pending.size} pending)`);
const badgePage = pages.find((p) => p.children.some((c) => c.type === 'COMPONENT_SET'));
const set = badgePage?.children.find((c) => c.type === 'COMPONENT_SET');
ok(!!set && (set.children as Node[]).length > 1, `a real set reached the file (${set ? `${(set.children as Node[]).length} members on '${badgePage?.name}'` : 'none'})`);
ok(first?.completed === true, `C1: a build that made its set posts completed: true (ok ${first?.ok}, completed ${first?.completed}, "${first?.headline}")`);

// 1a. #2909 Q2909.8 A, THE AS-BUILT LEDGER, through the real `main.ts`: the build records the set it landed; the
//     panel's `file-sets` reads it back as current; an entry from another def reads as due for its definition; the
//     background pass and the scoped check answer for the set. The entry is planted on the file's root plugin data, the
//     ledger's own store; the expected states are literals.
const ask = async (msg: Record<string, unknown>, type: string, until: (m: any) => boolean = () => true): Promise<any[]> => {
  posted.length = 0;
  (shim.ui as { onmessage: (m: unknown) => void }).onmessage(msg);
  for (let j = 0; j < 600; j++) {
    const got = posted.filter((m) => m?.type === type);
    if (got.some(until)) return got;
    await new Promise((res) => realTimeout(res, 10));
  }
  return posted.filter((m) => m?.type === type);
};
const ledger = (): Record<string, { def: string; rev: number; engine: string; print?: { plan: string } }> => { try { return JSON.parse(pluginData.get('prism3:asBuilt') ?? '{}').sets ?? {}; } catch { return {}; } };
ok(typeof ledger().badge?.def === 'string', `ledger/build: the build records the set it landed (${JSON.stringify(ledger().badge)})`);
ok(sharedData.get('prism3:addQueue.badge') === '', `queue/build: the build that lands Badge whole clears its add-queue key, where the ledger records it (${JSON.stringify(sharedData.get('prism3:addQueue.badge'))})`);
const fs1 = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(fs1?.present?.includes('badge') && fs1?.due?.badge?.state === 'current', `ledger/due: file-sets reads the set just built as current (${JSON.stringify(fs1?.due)})`);
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { badge: { ...ledger().badge, def: 'another-def' } } }));
const fs2 = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(fs2?.due?.badge?.state === 'due' && fs2?.due?.badge?.reason === 'definition', `ledger/due: an entry for another def reads as due for its definition (${JSON.stringify(fs2?.due)})`);
const hands = await ask({ type: 'hand-edits-request' }, 'hand-edits', (m) => m.done === true);
const hb = hands.find((m) => m.def === 'badge');
ok(!!hb && hb.members > 0 && hb.edited === 0 && hands.some((m) => m.done === true), `hand-edits: the background pass reads Badge's members, none edited by hand, then ends (${JSON.stringify(hands)})`);
const chk = (await ask({ type: 'update-check-request', defs: ['badge'] }, 'update-check'))[0];
const cb = chk?.sets?.find((c: any) => c.def === 'badge');
ok(!!cb && typeof chk.previewHash === 'string' && chk.previewHash.length > 0 && cb.members > 0 && typeof cb.hash === 'string',
  `update-check: the scoped check reads Badge alone and returns its hash (${JSON.stringify(chk)})`);
// The check reads the sets it is asked for, never the file's: one the file lacks is answered as missing, by name.
const chk2 = (await ask({ type: 'update-check-request', defs: ['badge', 'button'] }, 'update-check'))[0];
ok(JSON.stringify(chk2?.missing) === JSON.stringify(['button']) && chk2?.sets?.length === 1,
  `update-check: the check reads the sets asked for, and names one the file lacks as missing (${JSON.stringify({ missing: chk2?.missing, sets: chk2?.sets?.length })})`);

// 1b. #2598: a file with no `_Label` is told so, in the verdict the build posts and in the Update's summary. The
//     expected line is typed here, from the issue; the actual is what `main.ts` posted. This host has no `_Label`
//     (nothing in it makes one), so the furniture `furnishSet` draws beside Badge finds no template.
// #846: the file has no `_Doc-block` either, so the one line names the usage panels with the labels.
const NO_LABEL = 'No canvas labels or usage panels drawn: this file has no _Label or _Doc-block component. Run Set up file, then build again';
ok(!!first && (first.lines as string[]).includes(NO_LABEL) && String(first.summary).includes(NO_LABEL),
  `templates/build verdict: the build's component-result carries the missing-template line (${JSON.stringify(first?.lines)})`);
// The Update, through the same action table the panel and the agent link reach: a check for its hash, then the apply.
const { ACTIONS } = await import('./src/main');
type Sink = { post(m: any): void; data(d: Record<string, unknown>): void };
const runAction = async (go: (sink: Sink) => Promise<void>): Promise<{ posts: any[]; data: Record<string, unknown>[] }> => {
  for (let i = 0; i < 1200; i++) {
    const posts: any[] = []; const data: Record<string, unknown>[] = [];
    await go({ post: (m) => posts.push(m), data: (d) => data.push(d) });
    if (posts.some((m) => m?.type === 'refused')) { await new Promise((res) => realTimeout(res, 25)); continue; }
    return { posts, data };
  }
  return { posts: [], data: [] };
};
const check = await runAction((sink) => ACTIONS.updateComponents('badge', null, undefined, undefined, sink as never));
const hash = (check.data.find((d) => (d.update as { mode?: string })?.mode === 'preview')?.update as { previewHash?: string })?.previewHash;
ok(typeof hash === 'string', `fixture: the Update's check finds Badge and returns its hash (${hash})`);
const applied = (await runAction((sink) => ACTIONS.updateComponents('badge', hash ?? null, undefined, undefined, sink as never))).posts
  .find((m) => m?.type === 'component-update-result');
const NO_LABEL_UPDATE = 'No canvas labels or usage panels drawn: this file has no _Label or _Doc-block component. Run Set up file, then update again';
ok(!!applied && String(applied.summary).includes(NO_LABEL_UPDATE) && (applied.lines as string[]).some((l) => l.startsWith(NO_LABEL_UPDATE)),
  `templates/update verdict: the Update's component-update-result summary carries the missing-template line (${JSON.stringify(applied?.summary)})`);
// #2909 Q2909.8 A: the scoped check's hash is the agent check's own, for the same sets, so the panel's update can echo it.
ok(chk?.previewHash === hash, `update-check: the panel's scoped check hashes as the agent's check of the same set (${chk?.previewHash} vs ${hash})`);
// The apply records the set it acted on, so the ledger reads it current again.
const fs3 = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(fs3?.due?.badge?.state === 'current' && ledger().badge?.def !== 'another-def', `ledger/update: the update records the set it acted on, current again (${JSON.stringify(fs3?.due)})`);

// 1a'. #3082 Q811 A, through the real `main.ts`: an entry from an older engine whose plans print as they do now reads
//      current, and the read writes nothing; an entry whose print differs reads due for the engine, naming the part and
//      facet planted; the next write (a build of another set) records the quiet one under today's engine. The entries
//      are planted from the one the update just recorded; the expected states and the moved part are literals.
const asRecorded = ledger().badge as { def: string; rev: number; engine: string; print?: { plan: string; parts: Record<string, string>; set: string } };
ok(!!asRecorded?.print && /^[0-9a-f]{16}$/.test(asRecorded.print.plan) && Object.keys(asRecorded.print.parts).length > 0,
  `ledger/print: after the update, the set's entry carries the print of the plans it laid (its own record, else the quiet re-record after it) (${JSON.stringify(asRecorded?.print)?.slice(0, 120)})`);
const OLD = '0.0.0-before';
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { badge: { ...asRecorded, engine: OLD } } }));
const fsQ = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(JSON.stringify(fsQ?.due?.badge) === JSON.stringify({ state: 'current' }), `q811/load: an engine bump with an identical plan reads current (${JSON.stringify(fsQ?.due?.badge)})`);
ok(ledger().badge?.engine === OLD, `q811/load: the read records nothing; the quiet re-record waits for a write (${ledger().badge?.engine})`);
const part = Object.keys(asRecorded.print!.parts)[0];
const chunk = asRecorded.print!.parts[part];
const movedPrint = { plan: '0'.repeat(16), set: asRecorded.print!.set, parts: { ...asRecorded.print!.parts, [part]: (chunk.slice(0, 4) === 'ffff' ? '0000' : 'ffff') + chunk.slice(4) } };
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { badge: { ...asRecorded, engine: OLD, print: movedPrint } } }));
const fsM = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(JSON.stringify(fsM?.due?.badge) === JSON.stringify({ state: 'due', reason: 'engine', moved: { parts: [{ part, facets: ['size'] }], added: [], dropped: [], set: false } }),
  `q811/load: a changed plan reads due for the engine, naming the part and facet that moved (${JSON.stringify(fsM?.due?.badge)})`);
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { badge: { ...asRecorded, engine: OLD } } }));
await runAction((sink) => ACTIONS.buildComponents('divider', sink as never));
ok(ledger().badge?.engine !== OLD && ledger().badge?.print?.plan === asRecorded.print!.plan,
  `q811/restamp: the next write records the quiet set under today's engine, its print kept (${JSON.stringify({ engine: ledger().badge?.engine, plan: ledger().badge?.print?.plan })})`);
// An entry from before Q811 A (no print) under TODAY's engine reads current, and the next write gives it its print.
const { print: _q, ...printless } = asRecorded;
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { badge: printless } }));
const fsT = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(JSON.stringify(fsT?.due?.badge) === JSON.stringify({ state: 'current' }) && !ledger().badge?.print,
  `q811/migrate: a print-less entry under today's engine reads current, and the read records nothing (${JSON.stringify({ due: fsT?.due?.badge, print: !!ledger().badge?.print })})`);
await runAction((sink) => ACTIONS.buildComponents('divider', sink as never));
ok(ledger().badge?.engine === asRecorded.engine && ledger().badge?.print?.plan === asRecorded.print!.plan,
  `q811/migrate: the next write gives a print-less entry under today's engine its print (${JSON.stringify({ engine: ledger().badge?.engine, plan: ledger().badge?.print?.plan ?? null })})`);
// #3101: an entry recorded under revision 42. Revision 43 redrew the sign-in button alone (`executor-reach.json`), so
// Badge reads current, the read records nothing, and the next write records it under today's revision. Recorded below
// the record's floor it is due for the executor, as every set was before #3101.
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { badge: { ...asRecorded, rev: 42 } } }));
const fsR = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(JSON.stringify(fsR?.due?.badge) === JSON.stringify({ state: 'current' }) && ledger().badge?.rev === 42,
  `reach/load: recorded under 42, Badge reads current under 43, which did not redraw it, and the read records nothing (${JSON.stringify({ due: fsR?.due?.badge, rev: ledger().badge?.rev })})`);
await runAction((sink) => ACTIONS.buildComponents('divider', sink as never));
ok(ledger().badge?.rev === asRecorded.rev && ledger().badge?.print?.plan === asRecorded.print!.plan,
  `reach/restamp: the next write records it under today's revision, its print kept (${JSON.stringify({ rev: ledger().badge?.rev, plan: ledger().badge?.print?.plan })})`);
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { badge: { ...asRecorded, rev: EXECUTOR_REACH.floor - 1 } } }));
const fsF = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(JSON.stringify(fsF?.due?.badge) === JSON.stringify({ state: 'due', reason: 'executor' }),
  `reach/floor: recorded below the record's floor, Badge is due for the executor (${JSON.stringify(fsF?.due?.badge)})`);
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { badge: asRecorded } }));
// #3090 finding 1: an entry from before Q811 A (no print) under an older engine. It reads due for the engine, naming
// nothing, never "not checked yet"; a write does not record it quietly, nor does the check; the update's apply does,
// with its print, and the next read finds it current.
const { print: _p, ...unprinted } = asRecorded;
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { badge: { ...unprinted, engine: OLD } } }));
const fsU = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(JSON.stringify(fsU?.due?.badge) === JSON.stringify({ state: 'due', reason: 'engine' }), `q811/unprinted: a print-less entry under an older engine reads due for the engine (${JSON.stringify(fsU?.due?.badge)})`);
await runAction((sink) => ACTIONS.buildComponents('divider', sink as never));
const chkP = await runAction((sink) => ACTIONS.updateComponents('badge', null, undefined, undefined, sink as never));
ok(ledger().badge?.engine === OLD && !ledger().badge?.print, `q811/unprinted: neither a write nor the check records it (${JSON.stringify(ledger().badge)})`);
const hashP = (chkP.data.find((d) => (d.update as { mode?: string })?.mode === 'preview')?.update as { previewHash?: string })?.previewHash;
await runAction((sink) => ACTIONS.updateComponents('badge', hashP ?? null, undefined, undefined, sink as never));
const healed = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(ledger().badge?.engine !== OLD && ledger().badge?.print?.plan === asRecorded.print!.plan && JSON.stringify(healed?.due?.badge) === JSON.stringify({ state: 'current' }),
  `q811/unprinted: after a check and the update, the set is recorded under today's engine with its print, and reads current (${JSON.stringify({ entry: ledger().badge, due: healed?.due?.badge })})`);

// 1c. Q284.3 A: a run that skipped furniture for a missing template is a WARNING, the state every partial result takes:
//     `ok: false` and a `⚠` headline, never `✓`. The build still made its set, so it stays `completed`.
ok(!!first && first.ok === false && first.completed === true && String(first.headline).startsWith('⚠'),
  `templates/build warns: no _Label makes the build's verdict ⚠, ok false, completed (ok ${first?.ok}, "${first?.headline}")`);
ok(!!applied && applied.ok === false && String(applied.headline).startsWith('⚠'),
  `templates/update warns: no _Label makes the Update's verdict ⚠, ok false (ok ${applied?.ok}, "${applied?.headline}")`);
// Then Set up file's own template builder makes them, as the line asks, and the same build and Update read ✓ again.
const { ensureFurnitureTemplates } = await import('./src/furniture-templates');
const componentsPage = mkPage(false);
componentsPage.name = '↳ File Components';
// Figma's `createComponent`, as the shim makes a component: a frame made one.
const templatesApi = { ...shim, createComponent: () => shim.createComponentFromNode(shim.createFrame()) };
const made = await ensureFurnitureTemplates(templatesApi as never, componentsPage as never);
ok(made.built.includes('_Label'), `fixture: Set up file's template builder makes _Label in this host (${JSON.stringify(made)})`);
// And a `_Doc-block` (#846), one Heading variant: this host has no Tag, List.Item or Divider for Set up file to build the
// whole set from, and what these arms read is only whether a missing template makes the run a warning.
const block = shim.createComponentFromNode(shim.createFrame());
block.name = 'Type=Heading, Size=sm';
componentsPage.appendChild(block);
shim.combineAsVariants([block], componentsPage).name = '_Doc-block';
const withTemplates = await build('badge');
ok(!!withTemplates && withTemplates.ok === true && String(withTemplates.headline).startsWith('✓')
  && !(withTemplates.lines as string[]).some((l) => l.startsWith('No canvas labels') || l.startsWith('No usage panels')),
  `templates/build clean: with the templates in the file, the same build stays ✓ (ok ${withTemplates?.ok}, "${withTemplates?.headline}", ${JSON.stringify(withTemplates?.lines)})`);
// #846: the build drew the usage panel beside the set, through `main.ts`'s own wiring.
const livePanels = (badgePage?.children ?? []).filter((c) => { try { return JSON.parse(String((c as any).getSharedPluginData?.('prism3', 'docPanel') || 'null'))?.state === 'live'; } catch { return false; } });
ok(livePanels.length === 1 && (livePanels[0] as any).x >= Number(set?.x ?? 0) + Number(set?.width ?? 0),
  `panel/build: the build drew one usage panel right of the Badge set (${livePanels.length})`);
// Q2830.3 A: specs are drawn on request only ("Draw specs"), so the build that drew the usage panel tagged no spec panel.
const specPanels = (): string[] => { const walk = (n: any): any[] => [n, ...((n.children ?? []) as any[]).flatMap(walk)]; return pages.flatMap((p) => p.children.flatMap(walk)).filter((n) => readSpecTag(n)).map((n) => String(n.name)); };
ok(!specPanels().length, `specs/never on build: the build draws no spec panel (${specPanels().join(', ') || 'none tagged'})`);
const check2 = await runAction((sink) => ACTIONS.updateComponents('badge', null, undefined, undefined, sink as never));
const hash2 = (check2.data.find((d) => (d.update as { mode?: string })?.mode === 'preview')?.update as { previewHash?: string })?.previewHash;
const applied2 = (await runAction((sink) => ACTIONS.updateComponents('badge', hash2 ?? null, undefined, undefined, sink as never))).posts
  .find((m) => m?.type === 'component-update-result');
ok(!!applied2 && applied2.ok === true && String(applied2.headline).startsWith('✓') && !String(applied2.summary).includes('No canvas labels') && !String(applied2.summary).includes('No usage panels'),
  `templates/update clean: with the templates in the file, the same Update stays ✓ (ok ${applied2?.ok}, "${applied2?.headline}", ${JSON.stringify(applied2?.summary)})`);
// #846: the real Update's dry run reads the panel (`updateTargets` gives each target its def) and its apply redraws it
// (the per-def `furnish` hook passes `panelFor`). The panel is nudged off its spot, so it is the set's only work.
const livePanel = () => (badgePage?.children ?? []).filter((c) => { try { return JSON.parse(String((c as any).getSharedPluginData?.('prism3', 'docPanel') || 'null'))?.state === 'live'; } catch { return false; } });
const spotX = Number(set?.x ?? 0) + Number(set?.width ?? 0) + 40;
(livePanel()[0] as any).x = spotX + 50;
const check3 = await runAction((sink) => ACTIONS.updateComponents('badge', null, undefined, undefined, sink as never));
const pre3 = check3.data.find((d) => (d.update as { mode?: string })?.mode === 'preview')?.update as { previewHash?: string; sets?: { furniture?: { panels?: number } }[] } | undefined;
ok(pre3?.sets?.[0]?.furniture?.panels === 1, `panel/update due: the Update's dry run lists the moved usage panel as 1 to draw (${JSON.stringify(pre3?.sets?.[0]?.furniture)})`);
await runAction((sink) => ACTIONS.updateComponents('badge', pre3?.previewHash ?? null, undefined, undefined, sink as never));
ok(livePanel().length === 1 && Number((livePanel()[0] as any).x) === spotX, `panel/update drawn: the Update redraws it on its spot, ${spotX} (${livePanel().map((c) => (c as any).x).join(', ')})`);
ok(!specPanels().length, `specs/never on update: the Update that redrew the usage panel draws no spec panel (${specPanels().join(', ') || 'none tagged'})`);

// #2995 (should-fix 2): Documentation's Usage panels switch, read by Build on the main thread (`main.ts`, the
// `readDocSettings(figma.root).panels` before `panelBeside`). The panel is removed and Badge rebuilt with the file's
// `prism3:docSettings` at `{"panels":false}`: no panel. Then the switch back on, the same rebuild: the panel again, so
// the first arm measures the switch, not a rebuild that never draws one.
for (const n of livePanel()) badgePage!.children.splice(badgePage!.children.indexOf(n as Node), 1);
ok(livePanel().length === 0, `fixture: the usage panel is gone before the rebuild (${livePanel().length})`);
pluginData.set('prism3:docSettings', '{"panels":false}');
const panelsOff = await build('badge');
ok(!!panelsOff && livePanel().length === 0,
  `docs/panels off: with Usage panels off in Documentation, Build draws no usage panel (${livePanel().length} drawn; "${panelsOff?.headline}")`);
pluginData.delete('prism3:docSettings');
await build('badge');
ok(livePanel().length === 1, `docs/panels on (control): the same rebuild with the switch on draws the panel again (${livePanel().length})`);

// 2. The same set, its members renamed onto a smaller axis list: refused, nothing built.
const members = (set?.children ?? []) as Node[];
const firstName = String(members[0]?.name ?? '');
const dropAxis = firstName.split(', ')[0];   // the first `axis=value` pair, e.g. "size=small"
const axis = dropAxis.split('=')[0];
for (const m of members) m.name = String(m.name).split(', ').filter((pair) => !pair.startsWith(`${axis}=`)).join(', ');
ok(firstName.includes(', ') && !String(members[0]?.name).includes(`${axis}=`),
  `fixture: the existing set's members no longer vary by "${axis}" (was "${firstName}", now "${members[0]?.name}")`);
// #3129 Q833 A: queued again, so the refusal is read against it: a set that did not land stays queued.
sharedData.set('prism3:addQueue.badge', '2026-10-28T10:00:00.000Z');
const second = await build('badge');
ok(sharedData.get('prism3:addQueue.badge') === '2026-10-28T10:00:00.000Z', `queue/refused: a build the executor refused leaves the set queued (${JSON.stringify(sharedData.get('prism3:addQueue.badge'))})`);
sharedData.delete('prism3:addQueue.badge');
ok(second !== null && /AXES CHANGED|left as it is/.test(second.summary ?? ''),
  `the rebuild is refused by the executor, through the success-path post (${String(second?.summary ?? 'none').slice(0, 100)})`);
ok(second?.completed === false && second?.ok === false,
  `C1: a build the executor refused (#1780) posts completed: false (ok ${second?.ok}, completed ${second?.completed}, "${second?.headline}")`);

// 3. The early return.
const unknown = await build('no-such-def');
ok(unknown?.completed === false && unknown?.ok === false, `C1: an unknown def posts completed: false (completed ${unknown?.completed})`);

// 4. #2177: each verdict's lines are its summary's items, in the summary's words. The oracle is the summary itself, the
//    prose every reader had before #2177: the lines, in order, are pieces of it, and what lies between them is only the
//    separators the builders join items with. One long line, or a word the summary does not have, fails it.
const SEPARATORS = new Set(['', ', ', '. ', ' — ']);
const isSplitOf = (summary: string, lines: unknown): boolean => {
  if (!Array.isArray(lines) || lines.length === 0) return false;
  let at = 0;
  for (const [i, l] of (lines as unknown[]).entries()) {
    if (typeof l !== 'string' || l === '') return false;
    const found = summary.indexOf(l, at);
    if (found < 0 || !SEPARATORS.has(summary.slice(at, found)) || (i === 0 && found !== 0)) return false;
    at = found + l.length;
  }
  return at === summary.length;
};
for (const [name, r, min] of [['the fresh build', first, 3], ['the refused rebuild', second, 2], ['the unknown def', unknown, 2]] as const) {
  ok(!!r && isSplitOf(String(r.summary), r.lines) && (r.lines as string[]).length >= min,
    `#2177 ${name}: its lines are its summary's items, in order, in its words, at least ${min} (${JSON.stringify(r?.lines)})`);
}
// The set's own facts stay one line; the misses and the build note are lines of their own.
ok(!!first && /^set '.*refs across \d+ members$/.test(String(first.lines?.[0])) && /^Built from /.test(String(first.lines?.at(-1))),
  `#2177 the fresh build: the set's facts are its first line, the build note its last (${JSON.stringify(first?.lines?.[0])} … ${JSON.stringify(first?.lines?.at(-1))})`);

// 5. #2995 (should-fix 2): Documentation's Cover switch, read by Set up file on the main thread (`main.ts` `fileSetup`).
//    With the file's `prism3:docSettings` at `{"cover":false}` Set up file draws no cover and reports it off; the
//    expected words are typed here, from #2977. Then the switch on: the cover is attempted, so the arm reads the switch.
const COVER_OFF_WORDS = 'not drawn, the cover is off in Documentation';
const coverFrames = () => pages.flatMap((p) => p.children).filter((n) => { try { return !!(n as any).getSharedPluginData?.('prism3', 'cover'); } catch { return false; } });
// Figma's `createComponent`, as the template builder above was given it: Set up file builds the file's components.
shim.createComponent = () => shim.createComponentFromNode(shim.createFrame());
pluginData.set('prism3:docSettings', '{"cover":false}');
const setupOff = await runAction((sink) => ACTIONS.fileSetup(sink as never));
const coverOff = (setupOff.data.find((d) => d.fileSetup)?.fileSetup as { cover?: { did?: string; skipped?: string } } | undefined)?.cover;
ok(coverOff?.did === 'none' && coverOff.skipped === COVER_OFF_WORDS && coverFrames().length === 0,
  `docs/cover off: with Cover off in Documentation, Set up file draws no cover (${JSON.stringify(coverOff)}; ${coverFrames().length} cover frames)`);
pluginData.delete('prism3:docSettings');
const setupOn = await runAction((sink) => ACTIONS.fileSetup(sink as never));
const coverOn = (setupOn.data.find((d) => d.fileSetup)?.fileSetup as { cover?: { did?: string; skipped?: string } } | undefined)?.cover;
ok(!!coverOn && coverOn.skipped !== COVER_OFF_WORDS, `docs/cover on (control): with the switch on, Set up file goes to the cover (${JSON.stringify(coverOn)})`);

// 6. Q699 A, the owner's decision of 2026-10-25 (#2909 S1): Update file's due read, its
//    scoped check and its update all measure against the brand the PANEL holds, which the run's Theme step stores before
//    the update. The file stores brand A and holds a set built under it; the panel holds brand B, one lever apart, a lever
//    the set follows. The run is driven as the panel drives it: the checklist opens (`file-sets-request`, then the scoped
//    `update-check-request`), Theme stores B (`persistInput`, as `apply-theme.ts` does), then `update-sets` echoes the
//    check's hash. The expected states are literals; the brands are the example brand and a copy with one lever moved.
const { persistInput } = await import('./src/persist-figma');
persistInput(root as never, brandA);
const leverBuilt = await build(LEVER_DEF);
ok(leverBuilt?.completed === true && ledger()[LEVER_DEF]?.def === entryFor(materializerFor(brandA)(componentDefs.find((d) => d.id === LEVER_DEF)!)).def,
  `fixture: ${LEVER_DEF} is built under the stored brand A and recorded ("${leverBuilt?.headline}")`);
const dueA = (await ask({ type: 'file-sets-request', input: brandA }, 'file-sets'))[0];
ok(dueA?.due?.[LEVER_DEF]?.state === 'current', `q699/due control: with the panel on the stored brand, ${LEVER_DEF} reads current (${JSON.stringify(dueA?.due?.[LEVER_DEF])})`);
const dueB = (await ask({ type: 'file-sets-request', input: brandB }, 'file-sets'))[0];
ok(dueB?.due?.[LEVER_DEF]?.state === 'due' && dueB?.due?.[LEVER_DEF]?.reason === 'definition',
  `q699/due: a lever changed in the panel and not yet applied shows the set as due on the first opening (${JSON.stringify(dueB?.due?.[LEVER_DEF])})`);
const chkB = (await ask({ type: 'update-check-request', defs: [LEVER_DEF], input: brandB }, 'update-check'))[0];
const setB = chkB?.sets?.find((c: any) => c.def === LEVER_DEF);
const chkA = (await ask({ type: 'update-check-request', defs: [LEVER_DEF] }, 'update-check'))[0];
ok(!!setB && setB.update > 0 && typeof chkA?.previewHash === 'string' && chkA.previewHash !== chkB.previewHash,
  `fixture: the check under the panel's brand B finds members to change, and hashes apart from the stored brand's (${JSON.stringify({ b: setB, hashA: chkA?.previewHash, hashB: chkB?.previewHash })})`);
// Theme stores B. The stored brand's check is now stale: the agent's update with its hash is refused, so the arm below
// can tell an update laid from B's plans from one laid from A's.
persistInput(root as never, brandB);
const staleUpd = (await runAction((sink) => ACTIONS.updateComponents(LEVER_DEF, chkA?.previewHash ?? null, undefined, undefined, sink as never))).posts.find((m) => m?.type === 'component-update-result');
ok(staleUpd?.headline === '✗ update refused', `q699/control: an update echoing a check of the old stored brand is refused once Theme stores B ("${staleUpd?.headline}")`);
const askRun = async (msg: Record<string, unknown>, type: string): Promise<any> => {
  for (let i = 0; i < 1200; i++) {
    const got = await ask(msg, type);
    if (got.length) { await settled(); return got[0]; }
    if (posted.some((m) => m?.type === 'refused')) { await new Promise((res) => realTimeout(res, 25)); continue; }
    return null;
  }
  return null;
};
const upd = await askRun({ type: 'update-sets', defs: [LEVER_DEF], previewHash: chkB?.previewHash, handEdits: 'keep', input: brandB }, 'component-update-result');
ok(!!upd && !String(upd.headline).startsWith('✗') && !String(upd.summary).includes('changed since the check'),
  `q699/update: checked under the panel's brand B while the file stored A, then B stored as the Theme step does, the update goes through ("${upd?.headline}": ${String(upd?.summary ?? '').slice(0, 160)})`);
const after = (await ask({ type: 'update-check-request', defs: [LEVER_DEF], input: brandB }, 'update-check'))[0]?.sets?.find((c: any) => c.def === LEVER_DEF);
ok(!!after && after.update === 0 && after.upToDate === true, `q699/update wrote B: a fresh check under brand B finds no member to change (${JSON.stringify(after)})`);
const recorded = ledger()[LEVER_DEF]?.def;
ok(recorded === entryFor(materializerFor(brandB)(componentDefs.find((d) => d.id === LEVER_DEF)!)).def && recorded !== entryFor(materializerFor(brandA)(componentDefs.find((d) => d.id === LEVER_DEF)!)).def,
  `q699/ledger: the ledger records the brand that was applied, B (${recorded})`);
// M6 (#3090 review): under an engine move, the read prints against the PANEL's brand, as Q699 A reads the def. The file
// stores B and the set is drawn under B; the entry is planted under an older engine. With the panel on A, a lever the
// set follows, its plans would change: due for the engine. With the panel on B (control): current.
const asB = ledger()[LEVER_DEF];
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { ...JSON.parse(pluginData.get('prism3:asBuilt')!).sets, [LEVER_DEF]: { ...asB, engine: '0.0.0-before' } } }));
const m6B = (await ask({ type: 'file-sets-request', input: brandB }, 'file-sets'))[0]?.due?.[LEVER_DEF];
const m6A = (await ask({ type: 'file-sets-request', input: brandA }, 'file-sets'))[0]?.due?.[LEVER_DEF];
ok(!!asB?.print && JSON.stringify(m6B) === JSON.stringify({ state: 'current' }), `q811/panel brand control: under an engine move, the panel on the stored brand reads the set current (${JSON.stringify(m6B)})`);
ok(m6A?.state === 'due' && m6A?.reason === 'engine' && (m6A?.moved?.parts?.length ?? 0) > 0,
  `q811/panel brand: under an engine move, a lever changed in the panel and not yet applied makes the set due, printed against the panel's brand (${JSON.stringify(m6A)})`);
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { ...JSON.parse(pluginData.get('prism3:asBuilt')!).sets, [LEVER_DEF]: asB } }));

// 6b. #3023, the owner's decision Q701 B (2026-10-25): with Theme unticked, the run leaves the stored brand in the file,
//    so the check and the update measure against it. The file stores A again; the set is still built under B (the arm
//    above), so it is due against A. The panel holds B, Theme is unticked, and each message carries the brand the panel's
//    own `brandFor` (`apps/studio/src/state/update-file.ts`) picks for that run, as `main.ts`'s `panelBrand` posts it. The
//    update must write A's plan, and the next load (the read with no brand, as at load) must read the set current.
const { brandFor } = await import('../studio/src/state/update-file');
persistInput(root as never, brandA);
const atLoad = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(atLoad?.due?.[LEVER_DEF]?.state === 'due', `fixture: stored A, the set built under B reads due at load (${JSON.stringify(atLoad?.due?.[LEVER_DEF])})`);
const unticked = brandFor(false, brandB);
const chkU = (await ask({ type: 'update-check-request', defs: [LEVER_DEF], input: unticked }, 'update-check'))[0];
const updU = await askRun({ type: 'update-sets', defs: [LEVER_DEF], previewHash: chkU?.previewHash, handEdits: 'keep', input: unticked }, 'component-update-result');
const recordedU = ledger()[LEVER_DEF]?.def;
ok(!!updU && !String(updU.headline).startsWith('✗') && recordedU === entryFor(materializerFor(brandA)(componentDefs.find((d) => d.id === LEVER_DEF)!)).def,
  `q701/update writes A: with Theme unticked, the update lays the stored brand A's plan, not the panel's B ("${updU?.headline}"; ledger ${recordedU})`);
const nextLoad = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(nextLoad?.due?.[LEVER_DEF]?.state === 'current', `q701/next load: after that update, the next load reads ${LEVER_DEF} current, not due (${JSON.stringify(nextLoad?.due?.[LEVER_DEF])})`);
ok(brandFor(true, brandB) === brandB, 'q701/control: with Theme ticked, the panel measures against its own brand (Q699 A)');

// 6c. #3081, the owner's decision Q810 A: Update file's badge, recounted live (`due-request`). The file stores A and holds
//    the set built under A (6b). The recount must say what is due against the brand the PANEL sends, say whether the file
//    holds that brand (Theme's one item), answer with the request's `seq`, and never load the pages: it reuses the sets
//    the last `file-sets` found. The pages loaded are counted on the host. A write ending makes it read the file again.
//    Expected values are literals.
let pageLoads = 0;
const loadAll = shim.loadAllPagesAsync;
shim.loadAllPagesAsync = async () => { pageLoads++; return loadAll?.(); };
const fsAt = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
pageLoads = 0;
const dA = (await ask({ type: 'due-request', input: brandA, seq: 1 }, 'file-due'))[0];
ok(dA?.seq === 1 && dA.theme === false && dA.due?.[LEVER_DEF]?.state === 'current' && JSON.stringify(dA.present) === JSON.stringify(fsAt?.present),
  `q810/control: with the panel on the stored brand A, nothing is due and Theme has nothing to apply (${JSON.stringify({ seq: dA?.seq, theme: dA?.theme, due: dA?.due?.[LEVER_DEF] })})`);
const dB = (await ask({ type: 'due-request', input: brandB, seq: 2 }, 'file-due'))[0];
ok(dB?.seq === 2 && dB.theme === true && dB.due?.[LEVER_DEF]?.state === 'due' && dB.due[LEVER_DEF].reason === 'definition',
  `q810/rises: a lever changed in the panel and not applied: the set it moves is due, and Theme counts (${JSON.stringify({ seq: dB?.seq, theme: dB?.theme, due: dB?.due?.[LEVER_DEF] })})`);
ok(pageLoads === 0, `q810/cheap: the live recount loads no page and walks no file, reusing the sets the last read found (${pageLoads} page loads)`);
// Key order is not a change: the stored A, its keys reversed, is the brand the file holds.
const reversed = Object.fromEntries(Object.entries(brandA as Record<string, unknown>).reverse()) as BrandInput;
const dR = (await ask({ type: 'due-request', input: reversed, seq: 3 }, 'file-due'))[0];
ok(dR?.theme === false, `q810/theme: the stored brand with its keys in another order has nothing to apply (theme ${dR?.theme})`);
// Theme stores B, as the run's Theme step does: Theme's item drops, the set stays due until the update writes it.
persistInput(root as never, brandB);
const dS = (await ask({ type: 'due-request', input: brandB, seq: 4 }, 'file-due'))[0];
ok(dS?.theme === false && dS.due?.[LEVER_DEF]?.state === 'due', `q810/after apply: once Theme stores B, Theme has nothing to apply; the set B moves is still due (${JSON.stringify({ theme: dS?.theme, due: dS?.due?.[LEVER_DEF] })})`);
// A fresh file holds no brand: Theme would write one, so it counts.
const held = sharedData.get('prism3:brandInput');
sharedData.delete('prism3:brandInput');
const dN = (await ask({ type: 'due-request', input: brandB, seq: 5 }, 'file-due'))[0];
ok(dN?.theme === true, `q810/no brand: a file that holds no brand counts Theme (theme ${dN?.theme})`);
if (held !== undefined) sharedData.set('prism3:brandInput', held);
// A write ending clears the sets the recount reuses, so the next recount reads the file again.
await build('badge');
// The verdict posts before the write's promise settles; the panel asks after its debounce, so this waits a little too.
await new Promise((res) => realTimeout(res, 100));
pageLoads = 0;
const dW = (await ask({ type: 'due-request', input: brandB, seq: 6 }, 'file-due'))[0];
ok(pageLoads === 1 && dW?.present?.includes('badge'), `q810/after a write: a write ending makes the next recount read the file's sets again (${pageLoads} page loads, ${JSON.stringify(dW?.present)})`);
pageLoads = 0;
await ask({ type: 'due-request', input: brandB, seq: 7 }, 'file-due');
ok(pageLoads === 0, `q810/cheap again: the recount after that reuses the sets read (${pageLoads} page loads)`);
// #3137 Q3137.3 A: THE PANELS CENSUS, through the real `main.ts`. Badge was built with Documentation's panels on, so it has
// its live panel. A designer deletes it: the next full read lists Badge among the sets with no usage panel, the recount
// after it says the same with no page load, panels off sends no list (still no page load: the switch is read each time),
// and panels back on lists it again. Mutations: the census search dropped from `readPresent` → `q3137/premise`; `fileDue`
// reading the file again for the census → `q3137/cheap`; the switch not read on the recount → `q3137/off`.
{
  const livePanel = (): { remove(): void } | undefined => ((root.findAllWithCriteria as (c: unknown) => unknown[])({ types: ['FRAME'], sharedPluginData: { namespace: 'prism3', keys: ['docPanel'] } }) as { getSharedPluginData?(n: string, k: string): string; removed?: boolean; remove(): void }[])
    .find((n) => !n.removed && (() => { try { const t = JSON.parse(n.getSharedPluginData?.('prism3', 'docPanel') || 'null'); return t?.def === 'badge' && t.state === 'live'; } catch { return false; } })());
  const before = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
  ok(!!livePanel() && !(before?.unpanelled ?? []).includes('badge') && Array.isArray(before?.unpanelled),
    `q3137/premise: Badge's live panel is drawn, so the read does not list it (${JSON.stringify(before?.unpanelled)})`);
  livePanel()!.remove();
  const after = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
  ok((after?.unpanelled ?? []).includes('badge') && typeof after?.panelLeads === 'number' && after.panelLeads >= after.unpanelled!.length,
    `q3137/census: with its panel deleted, the read lists Badge among the sets with no usage panel (${JSON.stringify(after?.unpanelled)} of ${after?.panelLeads})`);
  pageLoads = 0;
  const live = (await ask({ type: 'due-request', input: brandB, seq: 30 }, 'file-due'))[0];
  ok(pageLoads === 0 && (live?.unpanelled ?? []).includes('badge'), `q3137/cheap: the recount lists it too, from the read's census, with no page load (${pageLoads} page loads; ${JSON.stringify(live?.unpanelled)})`);
  pluginData.set('prism3:docSettings', '{"panels":false}');
  const offD = (await ask({ type: 'due-request', input: brandB, seq: 31 }, 'file-due'))[0];
  pluginData.delete('prism3:docSettings');
  const onD = (await ask({ type: 'due-request', input: brandB, seq: 32 }, 'file-due'))[0];
  ok(pageLoads === 0 && offD?.unpanelled === undefined && (onD?.unpanelled ?? []).includes('badge'),
    `q3137/off: with panels off the recount sends no list, and turned back on it lists Badge again, both with no page load (${pageLoads} page loads; off ${JSON.stringify(offD?.unpanelled)}, on ${JSON.stringify(onD?.unpanelled)})`);
}
// A recount that cannot read the file says so (`error`), so the panel falls back to the load's read instead of drawing
// an answer with nothing due. Another write clears the cached sets, and the read after it is refused.
await build('badge');
await new Promise((res) => realTimeout(res, 100));
shim.loadAllPagesAsync = async () => { throw new Error('pages refused'); };
const dE = (await ask({ type: 'due-request', input: brandB, seq: 8 }, 'file-due'))[0];
ok(dE?.seq === 8 && typeof dE.error === 'string' && dE.error.includes('pages refused') && Object.keys(dE.due ?? {}).length === 0,
  `q810/error: a recount whose read of the file fails answers with the error, and nothing due (${JSON.stringify({ seq: dE?.seq, error: dE?.error ?? null, due: dE?.due })})`);
shim.loadAllPagesAsync = loadAll;
// #3096 into #3090 (Q811 A): an engine move under the badge. The entry for the set (drawn under A in 6b, with its print)
// is planted under an older engine. With the panel on B, a lever the set follows, its plans would change: the recount
// reads it due for the engine and the badge counts it. With the panel on A, the drawing would not change: current, not
// counted. Without the print in `fileDue`, both read `unrecorded` and the badge counts neither.
const { badgeCount } = await import('../studio/src/state/update-file');
const asA = ledger()[LEVER_DEF];
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { ...JSON.parse(pluginData.get('prism3:asBuilt')!).sets, [LEVER_DEF]: { ...asA, engine: '0.0.0-before' } } }));
const one = [{ id: LEVER_DEF }] as unknown as Parameters<typeof badgeCount>[0];
const liveOf = (d: any) => ({ present: d?.present ?? [], theme: false, error: d?.error ?? null, due: d?.due ?? {} });
const dEB = (await ask({ type: 'due-request', input: brandB, seq: 9 }, 'file-due'))[0];
const dEA = (await ask({ type: 'due-request', input: brandA, seq: 10 }, 'file-due'))[0];
ok(!!asA?.print && dEB?.due?.[LEVER_DEF]?.state === 'due' && dEB.due[LEVER_DEF].reason === 'engine' && badgeCount(one, null, liveOf(dEB)) === 1,
  `q810/engine: under an older engine, a printed set whose plans the panel's brand changes is due for the engine, and the badge counts it (${JSON.stringify({ due: dEB?.due?.[LEVER_DEF], badge: badgeCount(one, null, liveOf(dEB)) })})`);
ok(JSON.stringify(dEA?.due?.[LEVER_DEF]) === JSON.stringify({ state: 'current' }) && badgeCount(one, null, liveOf(dEA)) === 0,
  `q810/engine control: the same entry, the panel's brand leaving its plans unchanged, is current, and the badge does not count it (${JSON.stringify({ due: dEA?.due?.[LEVER_DEF], badge: badgeCount(one, null, liveOf(dEA)) })})`);
// The print memo holds: a recount against a brand not seen before projects the set's plans, and a second against the
// same brand projects nothing (the projections are counted through the `print` stage `main.ts` logs).
const gl = globalThis as { PRISM3_OPEN_TIMINGS?: { stage: string }[] };
const prints = (): number => (gl.PRISM3_OPEN_TIMINGS ?? []).filter((x) => x.stage === 'print').length;
gl.PRISM3_OPEN_TIMINGS = [];
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { ...JSON.parse(pluginData.get('prism3:asBuilt')!).sets, [LEVER_DEF]: { ...asA, engine: '0.0.0-before', print: { ...asA.print, plan: 'replanted' } } } }));
const brandC: BrandInput = { ...brandA, density: 'spacious' };
const memoFirst = (await ask({ type: 'due-request', input: brandC, seq: 11 }, 'file-due'))[0];
const afterFirst = prints();
await ask({ type: 'due-request', input: brandC, seq: 12 }, 'file-due');
const afterSecond = prints();
delete gl.PRISM3_OPEN_TIMINGS;
ok(memoFirst?.due?.[LEVER_DEF]?.state === 'due' && afterFirst > 0 && afterSecond === afterFirst,
  `q810/memo: a second recount against the same brand projects no plan again (${afterFirst} projected by the first, ${afterSecond - afterFirst} by the second)`);
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { ...JSON.parse(pluginData.get('prism3:asBuilt')!).sets, [LEVER_DEF]: { ...asA, engine: '0.0.0-before' } } }));
// The read at open, the same planted entry (#3110's `ledgerSets`, then the full read). The file stores B, which moves
// the set's plans, so both answers read it due for the engine. The ledger's answer prints too, loading no page: without
// the print it would read `unrecorded` and disagree with the full read that replaces it. That it loads no page is
// `test-open-large-file.ts`'s `open/ready`.
const atOpen = await ask({ type: 'ui-ready' }, 'hand-edits', (m) => m.done === true);
const openSets = posted.filter((m) => m?.type === 'file-sets' && m.atOpen === true);
const ledgerAns = openSets.find((m) => m.partial === true);
const fullAns = openSets.find((m) => m.partial !== true);
ok(atOpen.length > 0 && ledgerAns?.due?.[LEVER_DEF]?.state === 'due' && ledgerAns.due[LEVER_DEF].reason === 'engine' && JSON.stringify(ledgerAns.due[LEVER_DEF]) === JSON.stringify(fullAns?.due?.[LEVER_DEF]),
  `q810/engine at open: the ledger's answer at open prints the engine-moved set as the full read does, due for the engine in both (${JSON.stringify({ ledger: ledgerAns?.due?.[LEVER_DEF], full: fullAns?.due?.[LEVER_DEF] })})`);
pluginData.set('prism3:asBuilt', JSON.stringify({ v: 1, sets: { ...JSON.parse(pluginData.get('prism3:asBuilt')!).sets, [LEVER_DEF]: asA } }));

// 6d. #3091: a set deleted or added BY HAND, with no write of the plugin's in between. Figma reports it as a
//     `documentchange` (fired here as Figma fires it: the change's type, its node, and for a deleted node `removed`). The
//     next recount must count the file as it now is: the deleted set is not present and not due, the set put back is
//     present again. An edit that moves no set (a rectangle drawn) keeps the cached sets: the recount loads no page.
//     The set is taken off its page and put back on the host, as a hand edit does; the expected states are literals.
//     Mutation: the listener's body a no-op (`main.ts`, `watchSets`) → `hand/delete` and `hand/add`.
const fire = (changes: unknown[]): void => { for (const fn of listeners.documentchange ?? []) fn({ documentChanges: changes }); };
ok((listeners.documentchange ?? []).length === 1, `hand/listens: after a read of the file's sets, main.ts listens for documentchange once (${(listeners.documentchange ?? []).length})`);
const handBrand = JSON.parse(sharedData.get('prism3:brandInput') ?? 'null') ?? brandB;
await ask({ type: 'file-sets-request' }, 'file-sets');
const dBefore = (await ask({ type: 'due-request', input: handBrand, seq: 20 }, 'file-due'))[0];
ok(dBefore?.present?.includes(LEVER_DEF) && !!dBefore.due?.[LEVER_DEF], `hand/control: before the edit the recount counts ${LEVER_DEF} present (${JSON.stringify(dBefore?.present)})`);
// The build names a set by its def's id, and finds it by that name (`presentNames`).
const handPage = pages.find((p) => p.children.some((c) => c.type === 'COMPONENT_SET' && c.name === LEVER_DEF));
const handSet = handPage?.children.find((c) => c.type === 'COMPONENT_SET' && c.name === LEVER_DEF);
ok(!!handSet, `hand/fixture: ${LEVER_DEF}'s set is on the host`);
let handLoads = 0;
const loadAllH = shim.loadAllPagesAsync;
shim.loadAllPagesAsync = async () => { handLoads++; return loadAllH?.(); };
fire([{ type: 'CREATE', node: { type: 'RECTANGLE', id: 'r:1' }, origin: 'LOCAL' }, { type: 'PROPERTY_CHANGE', node: { type: 'FRAME', id: 'f:1' }, properties: ['name'], origin: 'LOCAL' }]);
handLoads = 0;
const dOther = (await ask({ type: 'due-request', input: handBrand, seq: 21 }, 'file-due'))[0];
ok(handLoads === 0 && dOther?.present?.includes(LEVER_DEF), `hand/other edit: an edit that moves no set keeps the cached sets, so the recount loads no page (${handLoads} page loads)`);
if (handPage && handSet) {
  const pg = handPage, node = handSet;
  const at = pg.children.indexOf(node);
  pg.children.splice(at, 1);
  fire([{ type: 'DELETE', node: { type: 'COMPONENT_SET', id: node.id, removed: true }, origin: 'LOCAL' }]);
  const dDel = (await ask({ type: 'due-request', input: handBrand, seq: 22 }, 'file-due'))[0];
  ok(dDel?.seq === 22 && !dDel.present?.includes(LEVER_DEF) && !dDel.due?.[LEVER_DEF],
    `hand/delete: a set deleted by hand is neither present nor due in the next recount, with no file-sets read between (${JSON.stringify({ present: dDel?.present, due: dDel?.due?.[LEVER_DEF] ?? null })})`);
  // The file read afresh without the set, so the cache does not hold it: the add is then read from the file or missed.
  const fsGone = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
  ok(!fsGone?.present?.includes(LEVER_DEF), `hand/fixture: a read with the set deleted does not find it (${JSON.stringify(fsGone?.present)})`);
  pg.children.splice(at, 0, node);
  fire([{ type: 'CREATE', node, origin: 'LOCAL' }]);
  const dAdd = (await ask({ type: 'due-request', input: handBrand, seq: 23 }, 'file-due'))[0];
  ok(dAdd?.seq === 23 && dAdd.present?.includes(LEVER_DEF) && !!dAdd.due?.[LEVER_DEF],
    `hand/add: a set added by hand is present in the next recount, with no file-sets read between (${JSON.stringify({ present: dAdd?.present, due: dAdd?.due?.[LEVER_DEF] ?? null })})`);
}
shim.loadAllPagesAsync = loadAllH;

// 7. #2909 S2: the background hand-edit pass stops when a write starts (`handEditsPass`'s `stale()`, the run guard). A
//    build is held mid-run (its page switch waits on a promise this test releases), the pass is asked for, and no set's
//    hand edits may come back while the build holds the guard. Then the build is let go, and the same request answers
//    for the sets: the control, so the arm measures the guard, not a pass that never answers.
let release: () => void = () => undefined;
const setPage = shim.setCurrentPageAsync;
shim.setCurrentPageAsync = () => new Promise<void>((res) => { release = res; });
for (let i = 0; i < 1200; i++) {
  posted.length = 0;
  (shim.ui as { onmessage: (m: unknown) => void }).onmessage({ type: 'build-components', def: 'badge' });
  await new Promise((res) => realTimeout(res, 5));
  if (posted.some((m) => m?.type === 'refused')) { await new Promise((res) => realTimeout(res, 25)); continue; }
  break;
}
const heldResult = (async () => { for (let j = 0; j < 600; j++) { const r = posted.find((m) => m?.type === 'component-result'); if (r) return r; await new Promise((res) => realTimeout(res, 10)); } return null; })();
const duringHold = await ask({ type: 'hand-edits-request' }, 'hand-edits', (m) => m.done === true);
// `ask` waits up to 6 s for `done`; a pass the guard ends posts neither a set nor `done`.
ok(!duringHold.some((m) => typeof m.def === 'string'), `hand-edits/guard: while a build holds the guard, the pass reports no set before done (${JSON.stringify(duringHold)})`);
// #3081 Q810 A: a setting changed during a long write. The write's start cleared the cached sets, so whatever fills the
// cache now (the live recount asked while the build holds the guard, or the hand-edit pass just above) holds a mid-write
// list. The write ending must clear it, so the recount after it reads the file once more. Page loads are counted on the
// host, as in 6c.
let midLoads = 0;
const loadAll7 = shim.loadAllPagesAsync;
shim.loadAllPagesAsync = async () => { midLoads++; return loadAll7?.(); };
const dMid = (await ask({ type: 'due-request', input: brandB, seq: 8 }, 'file-due'))[0];
const loadsMid = midLoads;
shim.setCurrentPageAsync = setPage;
release();
await heldResult;
await settled();
midLoads = 0;
const dEnd = (await ask({ type: 'due-request', input: brandB, seq: 9 }, 'file-due'))[0];
ok(dMid?.seq === 8 && dEnd?.seq === 9 && midLoads === 1,
  `q810/mid-write: a recount asked during a write answers from the sets cached mid-write, and the write ending clears them, so the recount after reads the file again (${loadsMid} page loads during, ${midLoads} after)`);
shim.loadAllPagesAsync = loadAll7;
let afterHold: any[] = [];
for (let i = 0; i < 100 && !afterHold.some((m) => typeof m.def === 'string'); i++) {
  afterHold = await ask({ type: 'hand-edits-request' }, 'hand-edits', (m) => m.done === true);
  if (!afterHold.some((m) => typeof m.def === 'string')) await new Promise((res) => realTimeout(res, 50));
}
ok(afterHold.some((m) => m.def === 'badge') && afterHold.some((m) => m.done === true), `hand-edits/guard control: once the build ends, the same request reads the sets, then ends (${afterHold.length} answers)`);

// 8. #2830 Q2830.3 A: Documentation › Specs' Draw specs, the panel's `draw-specs`, through `main.ts`'s own switch and the
//    real `drawSpecs`. It draws for the sets on the CURRENT page only: the file holds Badge and Switch row (sections 1 and
//    6) on pages of their own, the current page is Switch row's, and the panel's message names nothing else. The expected
//    sets are literals; the actual side is the spec panels tagged in the file after the run.
const pageOfSet = (id: string): ShimPage | undefined => pages.find((p) => p.children.some((c) => c.type === 'COMPONENT_SET' && c.name === id));
const rowPage = pageOfSet(LEVER_DEF);
ok(!!rowPage && !!pageOfSet('badge') && rowPage !== pageOfSet('badge') && !specPanels().length,
  `fixture: Badge and ${LEVER_DEF} sit on pages of their own, and no spec panel is in the file yet (${pageOfSet('badge')?.id}, ${rowPage?.id}, ${specPanels().length})`);
const shownPage = shim.currentPage;
shim.currentPage = rowPage;
const drew = await askRun({ type: 'draw-specs' }, 'component-update-result');
shim.currentPage = shownPage;
const specDefs = (): string[] => { const walk = (n: any): any[] => [n, ...((n.children ?? []) as any[]).flatMap(walk)]; return [...new Set(pages.flatMap((p) => p.children.flatMap(walk)).map((n) => readSpecTag(n)?.def).filter((d): d is string => !!d))].sort(); };
ok(JSON.stringify(specDefs()) === JSON.stringify([LEVER_DEF]) && !!drew && /^. drew 1 spec panel/.test(String(drew.headline)),
  `specs/this page: the panel's Draw specs draws the spec panel for the set on the current page alone, ${LEVER_DEF}, not Badge on its own page ("${drew?.headline}": ${String(drew?.summary ?? '').slice(0, 160)}; tagged ${JSON.stringify(specDefs())})`);

// 9. The review of #3034 (Nit 1, and its gap): `specTargets` counts two sets of one name over the WHOLE file before it
//    keeps the current page's, so the panel's Draw specs skips the family the agent's whole-file command skips; and it
//    knows the page by its id, not by the object (the plugin API is not promised to hand back one object per page). The
//    file is literal plain nodes: Badge twice, once on each of two pages, and Switch row once. The page passed in is a
//    fresh object carrying the id, never the page node itself.
{
  const { specTargets } = await import('./src/spec-panel');
  const p1 = { id: '9:1', type: 'PAGE', parent: null }, p2 = { id: '9:2', type: 'PAGE', parent: null };
  const set = (name: string, parent: unknown) => ({ type: 'COMPONENT_SET', name, removed: false, parent });
  const nodes = [set('badge', p1), set('badge', p2), set(LEVER_DEF, p1)];
  const api = { root: { findAllWithCriteria: () => nodes } } as unknown as Parameters<typeof specTargets>[0];
  const onPage = specTargets(api, undefined, { id: '9:1' });
  const inFile = specTargets(api);
  const names = (r: ReturnType<typeof specTargets>) => r.targets.map((t) => t.def.id).sort();
  const twice = (r: ReturnType<typeof specTargets>) => r.skipped.some((x) => /badge: the file has 2 sets named badge/.test(x));
  ok(JSON.stringify(names(onPage)) === JSON.stringify([LEVER_DEF]) && twice(onPage) && JSON.stringify(names(inFile)) === JSON.stringify([LEVER_DEF]) && twice(inFile),
    `specs/one rule: two sets named badge on two pages are skipped by the panel's Draw specs as by the agent's command, counted over the file (page ${JSON.stringify({ targets: names(onPage), skipped: onPage.skipped })}; file ${JSON.stringify({ targets: names(inFile), skipped: inFile.skipped })})`);
  const other = specTargets(api, undefined, { id: '9:2' });
  ok(names(other).length === 0 && twice(other),
    `specs/page by id: a fresh object for page 9:2, which holds the other badge alone, skips that badge for its twin and draws nothing (${JSON.stringify({ targets: names(other), skipped: other.skipped })})`);
}

console.log(`\n${executed - failed}/${executed} build-completed assertions passed.`);
process.exit(failed ? 1 : 0);
