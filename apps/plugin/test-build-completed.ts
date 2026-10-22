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
 * `furnish` hook without `panelFor` → `panel/update drawn`.
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
  getPluginData: () => '',
  setPluginData: () => undefined,
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

console.log(`\n${executed - failed}/${executed} build-completed assertions passed.`);
process.exit(failed ? 1 : 0);
