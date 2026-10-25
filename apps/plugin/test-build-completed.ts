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
 * nothing (its `recordSets` after `applyUpdate`) → `ledger/update`; `file-sets` without `dueOf` → `ledger/due`.
 */
import { makeShim } from './component-shim';
import type { Node } from './component-shim';
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import { SWAP_TARGET } from './src/build-deps';
import { componentDefs } from '@prism3/engine/components/index';

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
const shim = makeShim({
  vars: [...new Set(badgePlans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  styles: [...new Set(badgePlans.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(badgePlans.flatMap((p) => planEffectStyles(p.root)))],
}) as Record<string, any>;
const root = shim.root as Record<string, unknown>;
const pluginData = new Map<string, string>();
Object.defineProperty(root, 'children', { get: () => pages });
Object.assign(root, {
  name: 'build-completed test file',
  type: 'DOCUMENT',
  insertChild: (index: number, child: ShimPage) => {
    const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1);
    pages.splice(Math.max(0, Math.min(index, pages.length)), 0, child);
  },
  appendChild: (child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.push(child); },
  getSharedPluginData: () => '',
  setSharedPluginData: () => undefined,
  // The file's own plugin data, so Documentation's settings (`prism3:docSettings`, #2909) can be set per arm.
  getPluginData: (k: string) => pluginData.get(k) ?? '',
  setPluginData: (k: string, v: string) => { pluginData.set(k, v); },
});
// A search for sets finds the ones on the pages, as Figma's does: the Update reads its targets this way. So does a
// search for the usage panels (#846): top-level frames on the pages carrying the shared plugin data asked for.
const shimFind = (root.findAllWithCriteria as (c?: { types?: string[] }) => unknown[]).bind(root);
root.findAllWithCriteria = (c?: { types?: string[]; sharedPluginData?: { namespace: string; keys: string[] } }) => [...shimFind(c),
  ...(c?.types?.includes('COMPONENT_SET') ? pages.flatMap((p) => p.children).filter((n) => n.type === 'COMPONENT_SET') : []),
  ...(c?.types?.includes('FRAME') && c.sharedPluginData ? pages.flatMap((p) => p.children).filter((n) => n.type === 'FRAME' && c.sharedPluginData!.keys.some((k) => (n as any).getSharedPluginData?.(c.sharedPluginData!.namespace, k))) : [])];
const empty = async () => [];
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
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

await import('./src/main');

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
      if (r) return r;
      await new Promise((res) => realTimeout(res, 10));
    }
    return null;
  }
  return null;
};

console.log('component-result.completed, through main.ts (C1)');

// 1. A fresh build: the set is made.
const first = await build('badge');
ok(first !== null, `the build posts a component-result (${first ? first.headline : 'none in 6 s'})`);
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
const ledger = (): Record<string, { def: string; rev: number; engine: string }> => { try { return JSON.parse(pluginData.get('prism3:asBuilt') ?? '{}').sets ?? {}; } catch { return {}; } };
ok(typeof ledger().badge?.def === 'string', `ledger/build: the build records the set it landed (${JSON.stringify(ledger().badge)})`);
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
const check = await runAction((sink) => ACTIONS.updateComponents('badge', null, undefined, sink as never));
const hash = (check.data.find((d) => (d.update as { mode?: string })?.mode === 'preview')?.update as { previewHash?: string })?.previewHash;
ok(typeof hash === 'string', `fixture: the Update's check finds Badge and returns its hash (${hash})`);
const applied = (await runAction((sink) => ACTIONS.updateComponents('badge', hash ?? null, undefined, sink as never))).posts
  .find((m) => m?.type === 'component-update-result');
const NO_LABEL_UPDATE = 'No canvas labels or usage panels drawn: this file has no _Label or _Doc-block component. Run Set up file, then update again';
ok(!!applied && String(applied.summary).includes(NO_LABEL_UPDATE) && (applied.lines as string[]).some((l) => l.startsWith(NO_LABEL_UPDATE)),
  `templates/update verdict: the Update's component-update-result summary carries the missing-template line (${JSON.stringify(applied?.summary)})`);
// #2909 Q2909.8 A: the scoped check's hash is the agent check's own, for the same sets, so the panel's update can echo it.
ok(chk?.previewHash === hash, `update-check: the panel's scoped check hashes as the agent's check of the same set (${chk?.previewHash} vs ${hash})`);
// The apply records the set it acted on, so the ledger reads it current again.
const fs3 = (await ask({ type: 'file-sets-request' }, 'file-sets'))[0];
ok(fs3?.due?.badge?.state === 'current' && ledger().badge?.def !== 'another-def', `ledger/update: the update records the set it acted on, current again (${JSON.stringify(fs3?.due)})`);

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
const check2 = await runAction((sink) => ACTIONS.updateComponents('badge', null, undefined, sink as never));
const hash2 = (check2.data.find((d) => (d.update as { mode?: string })?.mode === 'preview')?.update as { previewHash?: string })?.previewHash;
const applied2 = (await runAction((sink) => ACTIONS.updateComponents('badge', hash2 ?? null, undefined, sink as never))).posts
  .find((m) => m?.type === 'component-update-result');
ok(!!applied2 && applied2.ok === true && String(applied2.headline).startsWith('✓') && !String(applied2.summary).includes('No canvas labels') && !String(applied2.summary).includes('No usage panels'),
  `templates/update clean: with the templates in the file, the same Update stays ✓ (ok ${applied2?.ok}, "${applied2?.headline}", ${JSON.stringify(applied2?.summary)})`);
// #846: the real Update's dry run reads the panel (`updateTargets` gives each target its def) and its apply redraws it
// (the per-def `furnish` hook passes `panelFor`). The panel is nudged off its spot, so it is the set's only work.
const livePanel = () => (badgePage?.children ?? []).filter((c) => { try { return JSON.parse(String((c as any).getSharedPluginData?.('prism3', 'docPanel') || 'null'))?.state === 'live'; } catch { return false; } });
const spotX = Number(set?.x ?? 0) + Number(set?.width ?? 0) + 40;
(livePanel()[0] as any).x = spotX + 50;
const check3 = await runAction((sink) => ACTIONS.updateComponents('badge', null, undefined, sink as never));
const pre3 = check3.data.find((d) => (d.update as { mode?: string })?.mode === 'preview')?.update as { previewHash?: string; sets?: { furniture?: { panels?: number } }[] } | undefined;
ok(pre3?.sets?.[0]?.furniture?.panels === 1, `panel/update due: the Update's dry run lists the moved usage panel as 1 to draw (${JSON.stringify(pre3?.sets?.[0]?.furniture)})`);
await runAction((sink) => ACTIONS.updateComponents('badge', pre3?.previewHash ?? null, undefined, sink as never));
ok(livePanel().length === 1 && Number((livePanel()[0] as any).x) === spotX, `panel/update drawn: the Update redraws it on its spot, ${spotX} (${livePanel().map((c) => (c as any).x).join(', ')})`);

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
const second = await build('badge');
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

console.log(`\n${executed - failed}/${executed} build-completed assertions passed.`);
process.exit(failed ? 1 : 0);
