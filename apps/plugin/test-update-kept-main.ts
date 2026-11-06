/**
 * #3421 (owner decision Q39 A) — THE KEPT RUN THROUGH THE REAL `main.ts`: Update file's check, the Theme step, the check
 * again, then `update-sets`, each posted to the plugin as the panel posts it, and the plugin's own `file-sets` answer
 * read after. 0 due, apart from the set listed under Kept edits.
 *
 *   npx tsx apps/plugin/test-update-kept-main.ts
 *
 * WHY A SECOND GATE. `test-update-kept-run.ts` drives each stage's helper (`ledgerAfter`, `recheckHolds`) itself, so it
 * checks the helpers, not the wiring (docs/34): reverting `main.ts`'s `acted` to record each acted set without `held`
 * passed it. This one never calls `ledgerAfter`, and `recordSets` only for the fixture's record of the build before
 * #3402: the ledger after the run is what `main.ts` wrote to the root's plugin data, and the due read is the one `main.ts` posts.
 *
 * THE WORLD is `test-update-kept-run.ts`'s: radio-control and tag built from their plans before #3402 (the selection mark
 * bound to `interactive.primary.border.*`), in a file that holds no `interactive.*.indicator.*` variable yet, and the
 * ledger recording them as built from that def. A designer recolored the ring of every checked radio-control member and
 * resized each dot by hand; Keep (the default) keeps both. The Theme step is modelled as `test-update-kept-run.ts`
 * models it: the indicator variables join the shim's live names (`liveVars`).
 *
 * THE HOST is the shared component shim with its strict default (#3215), plus what a document has and the shim lacks
 * (its pages, its data, the UI channel), as `test-update-owner-run.ts` adds them: each a new property, no host method
 * patched.
 *
 * INDEPENDENCE (docs/34): the expected states are literals; what is read is what `main.ts` posted and wrote.
 *
 * Mutations this fails by name:
 *   · `main.ts`'s `acted` built without `held` (each acted set recorded as current) → `main/kept listed`,
 *     `main/held recorded`;
 *   · `main.ts`'s `update-sets` dropping the per-set choices (`sets`) → `main/overwrite chosen`;
 *   · `ledgerAfter` recording a set the apply stopped inside (#3424) → `main/stopped stays due`.
 */
import { makeShim } from './component-shim';
import type { Node } from './component-shim';
import { componentDefs } from '@prism3/engine/components/index';
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, type AnatomyPlan } from '@prism3/engine/anatomy-figma';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { SWAP_TARGET } from './src/build-deps';
import { materializeForBrand } from './src/brand-def';
import { applyComponentPlan } from './src/write-components';
import { entryFor, readLedger, recordSets } from './src/as-built-ledger';
import { recheckHolds } from '../studio/src/state/update-file';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log("Update file's kept run, through the real main.ts: nothing due but Kept edits (#3421)");

const IDS = ['radio-control', 'tag'] as const;
const before = (x: string): string => x.replaceAll('.indicator.', '.border.').replaceAll('/indicator/', '/border/');
const defNow = new Map(IDS.map((id) => [id, materializeForBrand(componentDefs.find((d) => d.id === id)!, null)] as const));
const defWas = new Map(IDS.map((id) => [id, JSON.parse(before(JSON.stringify(defNow.get(id)))) as ComponentDef] as const));
const plansNow = new Map(IDS.map((id) => [id, figmaAnatomySet(defNow.get(id)!, { swapTarget: SWAP_TARGET })] as const));
const plansWas = new Map(IDS.map((id) => [id, JSON.parse(before(JSON.stringify(plansNow.get(id)))) as AnatomyPlan[]] as const));
const all = [...plansNow.values(), ...plansWas.values()].flat();
const INDICATOR = [...new Set(all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))].filter((v) => v.includes('/indicator/'));
ok(INDICATOR.length === 3, `fixture: today's plans bind ${INDICATOR.length} indicator variables the file lacks`);

/* ── the host ─────────────────────────────────────────────────────────────────────────────────────────────── */

type Criteria = { types?: string[]; sharedPluginData?: { namespace: string; keys: string[] } };
type ShimPage = { id: string; name: string; type: 'PAGE'; isPageDivider: boolean; parent: unknown; children: Node[]; appendChild(c: Node): void; insertChild(i: number, c: Node): void; findOne(p: (n: unknown) => boolean): unknown; findAllWithCriteria(c: Criteria): Node[] };
/** Every node under `n`, as a Figma page's search walks them. */
const below = (n: { children?: unknown }): Node[] => ((n.children as Node[] | undefined) ?? []).flatMap((c) => [c, ...below(c)]);
const pages: ShimPage[] = [];
const detach = (c: Node): void => { const p = c.parent as { children?: Node[] } | null | undefined; const i = p?.children?.indexOf(c) ?? -1; if (i >= 0) p!.children!.splice(i, 1); };
const mkPage = (name: string): ShimPage => {
  const p: ShimPage = {
    id: `PAGE:${pages.length + 1}`, name, type: 'PAGE', isPageDivider: false, parent: null, children: [],
    appendChild(c) { detach(c); this.children.push(c); c.parent = this as unknown as Node; },
    insertChild(at, c) { detach(c); c.parent = this as unknown as Node; this.children.splice(Math.max(0, Math.min(at, this.children.length)), 0, c); },
    findOne(pred) { return this.children.find(pred) ?? null; },
    // A page's own search, as Figma's: its real nodes, by type and shared plugin data. The run's read searches a page at
    // a time when every page has one (`run-read.ts`), so the update reads the sets the fixture built, not references.
    findAllWithCriteria(c) {
      return below(this).filter((n) => (!c.types || c.types.includes(String(n.type)))
        && (!c.sharedPluginData || c.sharedPluginData.keys.some((k) => !!(n as any).getSharedPluginData?.(c.sharedPluginData!.namespace, k))));
    },
  };
  pages.push(p);
  return p;
};
const page = mkPage('Components');
const liveVars = new Set([...new Set(all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)])), 'space/0'].filter((v) => !INDICATOR.includes(v)));
const planComps = (n: AnatomyPlan['root']): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.nestOverrides ?? []).filter((o) => o.type === 'INSTANCE_SWAP').map((o) => o.value),
  ...((n.children ?? []) as AnatomyPlan['root'][]).flatMap(planComps),
];
const shim = makeShim({
  liveVars,
  styles: [...new Set(all.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(all.flatMap((p) => planEffectStyles(p.root)))],
  comps: [...new Set([SWAP_TARGET, 'focus-ring', ...all.flatMap((p) => planComps(p.root))])],
  page, pages: () => pages, liveRoot: true, liveComponents: true, identities: true, scaleConstrained: true,
}) as Record<string, any>;
const root = shim.root as Record<string, unknown>;
const pluginData = new Map<string, string>();
const sharedData = new Map<string, string>();
Object.defineProperty(root, 'children', { get: () => pages });
Object.assign(root, {
  name: 'kept file', type: 'DOCUMENT',
  insertChild: (index: number, child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.splice(Math.max(0, Math.min(index, pages.length)), 0, child); child.parent = root; },
  appendChild: (child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.push(child); child.parent = root; },
  getSharedPluginData: (ns: string, k: string) => sharedData.get(`${ns}:${k}`) ?? '',
  setSharedPluginData: (ns: string, k: string, v: string) => { sharedData.set(`${ns}:${k}`, v); },
  getPluginData: (k: string) => pluginData.get(k) ?? '',
  setPluginData: (k: string, v: string) => { pluginData.set(k, v); },
});
for (const p of pages) p.parent = root;
const posted: any[] = [];
const empty = async () => [];
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  createPage: () => { const p = mkPage(''); p.parent = root; return p; },
  setCurrentPageAsync: async () => undefined,
  listAvailableFontsAsync: empty,
  getLocalPaintStylesAsync: empty,
  getLocalGridStylesAsync: empty,
});

// The components the two sets nest or swap to, as real components on a page of their own: the run's read searches a page
// at a time, so a name the shim's own search answers (`comps`) is not one the update can find.
const deps = mkPage('Dependencies');
for (const name of [...new Set([SWAP_TARGET, 'focus-ring', ...all.flatMap((p) => planComps(p.root))])]) {
  const c = shim.createComponentFromNode(shim.createFrame());
  c.name = name;
  deps.appendChild(c);
}
deps.parent = root;

// The file before the run: both sets built from their plans before #3402, and recorded so.
for (const id of IDS) {
  const r = await applyComponentPlan(plansWas.get(id)!, shim as never);
  if (r.misses.length) throw new Error(`premise: ${id} built with ${r.misses.length} miss(es): ${r.misses[0]}`);
}
// The fixture's own record of the build before #3402; the record under test is the one main.ts writes after the run.
recordSets(root as never, Object.fromEntries(IDS.map((id) => [id, entryFor(defWas.get(id)!, plansWas.get(id)!)])));
const setOf = (id: string): Node => page.children.find((n) => n.type === 'COMPONENT_SET' && String(n.name) === id) as Node;
const RED = { type: 'SOLID', color: { r: 0.8, g: 0.1, b: 0.1 }, opacity: 1, visible: true };
let rings = 0;
for (const m of setOf('radio-control').children as Node[]) {
  if (String(m.name).includes('selection=checked')) { (m as any).strokes = [{ ...RED }]; rings++; }
  const dot = (m.children as Node[] ?? []).find((c) => c.name === 'dot') as any;
  if (dot) { const bv = { ...(dot.boundVariables ?? {}) }; delete bv.width; delete bv.height; dot.boundVariables = bv; dot.resize?.(Number(dot.width) + 3, Number(dot.height) + 3); }
}
ok(rings === 30, `fixture: ${rings} rings recolored by hand`);

const g = globalThis as Record<string, unknown>;
g.figma = shim; g.__html__ = ''; g.PRISM3_BUILD = '2026-11-05T00:00:00Z tree-test0000';
const log = console.log;
console.log = (...a: unknown[]) => { if (typeof a[0] === 'string' && a[0].startsWith('[prism3')) return; log(...a); };

await import('./src/main');

const realTimeout = globalThis.setTimeout;
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
const stateOf = (f: any): Record<string, string> => Object.fromEntries(IDS.map((id) => [id, String(f?.due?.[id]?.state)]));

// 0. Before the run, main.ts reads both sets due.
const f0 = await send({ type: 'file-sets-request' }, ['file-sets']);
ok(JSON.stringify(stateOf(f0)) === '{"radio-control":"due","tag":"due"}', `main/due before: main.ts reads both sets due (${JSON.stringify(stateOf(f0))})`);

// 1. The check, before Theme: each set is blocked only by variables Theme writes.
const c0 = await send({ type: 'update-check-request', defs: [...IDS] }, ['update-check']);
ok(Array.isArray(c0?.sets) && c0.sets.length === 2 && c0.sets.every((c: any) => c.blocked && c.themeBlocked === true),
  `main/check: before Theme, main.ts reads each set blocked only by Theme's variables (${JSON.stringify((c0?.sets ?? []).map((c: any) => [c.def, c.blocked, c.themeBlocked]))})`);

// 2. The Theme step writes the indicator variables; the update step checks again, and the run goes on.
for (const v of INDICATOR) liveVars.add(v);
const c1 = await send({ type: 'update-check-request', defs: [...IDS] }, ['update-check']);
ok(!!c1?.previewHash && recheckHolds([...IDS], c0?.sets ?? [], c1?.sets ?? []) && (c1?.sets ?? []).every((c: any) => !c.blocked),
  `main/checked again: after Theme, main.ts reads both sets unblocked under a new hash (${JSON.stringify((c1?.sets ?? []).map((c: any) => [c.def, c.blocked]))})`);

// 2b. #3424 — A RUN THAT STOPS INSIDE A SET: tag alone, and the host throws once on a member's content partway through
// the build's pass (`unlockAspectRatio` stands for the class of stop, as in `test-update-apply.ts`'s stop section). The
// set is left part updated, so main.ts must leave its ledger entry as it was: the set still reads due, and Update
// file's checklist still offers the update that finishes it.
const cTag = await send({ type: 'update-check-request', defs: ['tag'] }, ['update-check']);
// Every node of tag's members counts its calls, and the 40th throws once: the run has finished some members by then.
let calls = 0;
const STOP_AT = 40;
for (const n of below(setOf('tag'))) {
  const real = (n as any).unlockAspectRatio as (() => void) | undefined;
  if (!real) continue;
  (n as any).unlockAspectRatio = () => { if (++calls === STOP_AT) throw new Error('in unlockAspectRatio: the host stopped'); real.call(n); };
}
const uStop = await send({ type: 'update-sets', defs: ['tag'], previewHash: cTag?.previewHash, handEdits: 'keep' }, ['component-update-result']);
const stopLine = (uStop?.lines ?? []).find((l: string) => l.startsWith('tag: stopped ('));
ok(calls >= STOP_AT && uStop?.ok === false && String(uStop.headline) === '✗ update stopped at tag' && !!stopLine,
  `premise: the update stopped inside tag's build pass, at the host's 40th call (${JSON.stringify(uStop?.headline)}; ${JSON.stringify(stopLine)})`);
const fStop = await send({ type: 'file-sets-request' }, ['file-sets']);
ok(JSON.stringify(stateOf(fStop)) === '{"radio-control":"due","tag":"due"}',
  `main/stopped stays due: after a run that stopped inside tag, main.ts still reads tag due, not current (${JSON.stringify(stateOf(fStop))})`);

// 3. The update, as Update file posts it: Keep for every set. Checked again first: the stopped run moved tag. Running
// the update again finishes tag (#3424: the verdict's "Run the update again to finish").
const c1b = await send({ type: 'update-check-request', defs: [...IDS] }, ['update-check']);
const u = await send({ type: 'update-sets', defs: [...IDS], previewHash: c1b?.previewHash, handEdits: 'keep' }, ['component-update-result']);
ok(u?.type === 'component-update-result' && u.ok === true && String(u.headline).includes('1 set kept edits over changes'),
  `main/update: the update answers ok, and its headline names the set that kept edits (${JSON.stringify(u?.headline)})`);

// 4. What main.ts wrote, and what it reads after: tag current, radio-control kept.
const ledger = readLedger(root as never) as Record<string, { held?: { members: number; changes: readonly string[] } }>;
const held = ledger['radio-control']?.held;
ok(!!held && held.members === 12 && ['rest', 'hover', 'pressed'].every((st) => held.changes.includes(`border → color/interactive/primary/indicator/${st}`)) && !ledger.tag?.held,
  `main/held recorded: main.ts recorded what radio-control's kept edits hold back, and nothing on tag (${JSON.stringify(held)})`);
const f1 = await send({ type: 'file-sets-request' }, ['file-sets']);
ok(JSON.stringify(stateOf(f1)) === '{"radio-control":"kept","tag":"current"}',
  `main/kept listed: after the run main.ts reads tag current and radio-control kept, nothing due (${JSON.stringify(stateOf(f1))})`);

// 5. The Kept edits group's own choice: Overwrite for radio-control alone rides `sets`, and the set reads current after.
const c2 = await send({ type: 'update-check-request', defs: ['radio-control'] }, ['update-check']);
const u2 = await send({ type: 'update-sets', defs: ['radio-control'], previewHash: c2?.previewHash, handEdits: 'keep', sets: { 'radio-control': 'overwrite' } }, ['component-update-result']);
const f2 = await send({ type: 'file-sets-request' }, ['file-sets']);
// Read off the host: every checked member's ring now holds the plan's indicator binding, not the designer's red.
const checked = (setOf('radio-control').children as Node[]).filter((m) => String(m.name).includes('selection=checked'));
const ringBound = checked.filter((m) => JSON.stringify((m as any).strokes ?? []).includes('indicator')).length;
ok(u2?.ok === true && f2?.due?.['radio-control']?.state === 'current' && ringBound === 12,

  `main/overwrite chosen: Overwrite chosen for the kept set alone replaces its edits: the 12 rings the plan binds to the indicator hold it, and the set reads current (${JSON.stringify({ headline: u2?.headline, state: f2?.due?.['radio-control']?.state, ringBound })})`);

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
