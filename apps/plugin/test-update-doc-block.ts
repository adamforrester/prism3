/**
 * #3308 (Q3308.3 A) — USAGE PANELS ON A FIRST RUN, THROUGH THE REAL `main.ts`, UNDER THE STRICT HOST: a fresh file, the
 * owner's five families ticked on Components (Button, Checkbox group, Icon, Link, Badge), then Update file.
 *
 *   npx tsx apps/plugin/test-update-doc-block.ts
 *
 * The owner's run built five sets "with problems", each for one reason: "No usage panels drawn: this file has no
 * _Doc-block component". Set up file, the run's first step, cannot build `_Doc-block` until Badge, Tag, List item and
 * Divider exist. The owner chose A: with Documentation's usage panels on and no `_Doc-block`, Update file's run also
 * builds those four first (listed as "Also builds"), then `_Doc-block`, before the queued sets, so every queued set gets
 * its usage panel in one run. With the panels off nothing changes (#3311).
 *
 *   1. `panels/on`: Set up file, then the file's read (`file-sets`) names the four the file lacks. The panel's own
 *      functions list the three the queue does not hold as "Also builds" (`docBlockAlsoOf`) and put the queued Badge
 *      first (`runOrderOf`). Each set is posted once, as Update file's sets step posts it (`docBlock: true`), straight
 *      after the last answer. Every queued set completes clean, no answer carries a "No usage panel" line, the first
 *      names the sets it built first and `_Doc-block`, and each queued set's family has a live usage panel.
 *   2. `panels/off`: the same file shape, fresh, with Documentation's usage panels off: the same posts build none of
 *      Tag, List item and Divider, and no `_Doc-block`; the panel lists nothing as "Also builds" and keeps the queue's
 *      order.
 *   3. `no ask`: panels on, a build posted without the ask (the Components page's) builds none of them. Since #3467
 *      (Q2 A, Q5 A) that build is ok and ✓, its one cause a note naming this file's fix (`#3467 note`); with `_Label`
 *      gone too it is ⚠ for `_Label` alone (`#3467 label still warns`).
 *   4. `some held` (review S1): a file that already holds Badge, built with the panels off, then the panels on and Link
 *      queued. The file's read names only the three it lacks, "Also builds" lists them and not Badge, and Link's build
 *      builds them and `_Doc-block`, leaving the file's one Badge set as it was. The file's next read, now that it
 *      holds `_Doc-block`, posts no `docBlockLacks` at all.
 *
 *   5. `agent` (#3467 Q1 A): the agent's `build-components`, through the dispatcher's own route (`ROUTES`) into the
 *      plugin's action table, makes Update file's ask: Link's build builds Badge, Tag, List Item and Divider, then
 *      `_Doc-block`, and Link gets its usage panel.
 *   6. `setup incomplete` (#3467 Q3 A, Q4 A): the file's read lists what Set up file would build, by name: everything on
 *      a fresh file (not `_Doc-block`, which cannot be built yet); nothing once set up; `_Doc-block` once the four sets
 *      are in; each deleted template and cell set, with `setUp` still true; nothing again after Set up file.
 *
 * THE HOST is #3323's (`test-update-owner-run.ts`): the shared component shim with its strict default (#3215), a fresh
 * file's pages added as properties the host lacks, and the shim's own `liveRoot` search over every page (`pages`), so a
 * set that nests another finds it built. (`test-update-fresh.ts`'s patched search cannot build a nesting set: #3325.)
 *
 * INDEPENDENCE (docs/34): what is read is what `main.ts` posted and what is on the shim's pages; the expected orders,
 * names and lines are literals typed here.
 *
 * MUTATIONS, each failing by name: the build ignoring the ask (`blockFirst` false in `main.ts`) → `panels/on: sets/…`
 * and `panels/on: _Doc-block`; the ask ignoring the panels switch → `panels/off: nothing extra`; the panel's sets step
 * not asking (`postCurrent`) is held by the chrome arm, not here; `runOrderOf` keeping the queue's order → `panels/on:
 * run order`; `docBlockAlsoOf` ignoring the switch → `panels/off: also builds`; the file's read ignoring presence
 * (`fileSets`' `docBlockLacks` filter) → `some held: the file's read …` and `some held: also builds`; the block-first
 * loop ignoring presence (its `presentNames` skip) → `some held: sets/link: builds …` (its "Also built" names Badge;
 * the rebuild is in place, so the Badge set's id alone would not show it); the file's read ignoring whether the file
 * holds `_Doc-block` (its `findDocBlock` check) → `some held: once the file holds _Doc-block …`.
 * #3467: the agent route without `{ docBlock: true }` (`agent-dispatch.ts`) → `agent: build-components link: builds …`
 * and `agent: _Doc-block …`; `withTemplateWarning` warning on `_Doc-block` again → `#3467 note: … ok and ✓`; the read's
 * `_Doc-block` check dropped (`setup-incomplete.ts`) → `setup incomplete/doc block`, `setup incomplete/deleted`; its
 * "once it can be built" condition dropped → `setup incomplete/fresh`; its furniture-template checks dropped →
 * `setup incomplete/deleted`; the read not posted (`main.ts` `fileSets`) → every `setup incomplete/…` arm that lists.
 */
import { makeShim } from './component-shim';
import type { Node } from './component-shim';
import { componentDefs, figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/components';
import type { BrandInput } from '@prism3/engine';
import { EXAMPLE_BRANDS_JSON as exampleBrands } from '@prism3/engine';
import { SWAP_TARGET } from './src/build-deps';
import { materializeForBrand } from './src/brand-def';
import { catalogOf, CATALOG_SWAP_TARGET } from '../studio/src/state/component-catalog';
import { displayNameOf, groupsOf, toggleSets } from '../studio/src/state/component-groups';
import { docBlockAlsoOf, queuedOf, runOrderOf } from '../studio/src/state/update-file';
import { panelFamily, readPanelTag, type PNode } from './src/doc-panel';
import { leafForDef } from './src/file-taxonomy';
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

const mainModule = await import('./src/main');
const { ROUTES } = await import('./src/agent-dispatch');

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


const DOC_BLOCK_LINE = 'No usage panels drawn: this file has no _Doc-block component. Run Set up file, then build again';
// #3467 (Q5 A): the line names the fix for the file as the build left it. Link nests Icon and Focus Ring, none of the four.
const LINK_NOTE_LINE = 'No usage panels drawn: this file has no _Doc-block component. Build badge, tag, list-item, divider, then run Set up file and build again';
const placeOf = (id: string) => { const at = leafForDef(id); return at ? { page: at.leaf.page, section: at.section.header } : null; };
const catalog = catalogOf(componentDefs, (d) => figmaAnatomySet(d, { swapTarget: CATALOG_SWAP_TARGET }), placeOf);
const rows = groupsOf(catalog).flatMap((s) => s.rows);
// The owner's ticks: the Buttons family's box (its four sets), and Checkbox group, Checkbox row, Icon, Link and Badge.
// #3306 (Q3306.2 A): a set a queued set nests is held, and a tick on it writes nothing, so Checkbox row and Icon are
// ticked first, as `test-update-owner-run.ts` does; the same nine sets reach the queue.
const TICKED: readonly (readonly string[])[] = [['icon'], ['checkbox-row'], rows.find((r) => r.label === 'Buttons')?.ids ?? [], ['checkbox-group'], ['link'], ['badge']];
let queue: string[] = [];
for (const ids of TICKED) { const t = toggleSets(catalog, ids, new Set(queue), []); if (t.on) queue = [...queue, ...t.ids]; }
const queued = queuedOf(catalog, { present: [] }, queue);

/** Every node on the file's pages. */
const onPages = (): Node[] => { const out: Node[] = []; const walk = (n: Node) => { out.push(n); for (const c of (n.children as Node[] | undefined) ?? []) walk(c); }; for (const p of pages) for (const c of p.children) walk(c); return out; };
const setNamed = (name: string): boolean => onPages().some((n) => n.type === 'COMPONENT_SET' && n.name === name);
const livePanels = (): string[] => onPages().flatMap((n) => { const t = readPanelTag(n as unknown as PNode); return t?.state === 'live' ? [t.def] : []; });
/** Back to a fresh file: one empty page, no data. The shim keeps its own counters, which no assertion reads. */
const freshFile = (): void => {
  pages.splice(0);
  first.children.splice(0);
  pages.push(first);
  first.parent = root;
  pluginData.clear(); sharedData.clear();
};
const fileRead = async (): Promise<any> => send({ type: 'file-sets-request' }, ['file-sets']);
const setUp = async (arm: string): Promise<void> => {
  const r = await send({ type: 'file-setup' }, ['file-setup-result']);
  ok(r?.type === 'file-setup-result' && r.ok === true, `${arm}: Set up file answers ok (${said(r)})`);
};
const build = async (id: string, ask: boolean): Promise<any> => send(ask ? { type: 'build-components', def: id, docBlock: true } : { type: 'build-components', def: id }, ['component-result']);

console.log("Usage panels on a first run: the owner's selection, Update file (#3308 Q3308.3 A)");

const fixedOn = (o: object, k: string): boolean => { const d = Object.getOwnPropertyDescriptor(o, k); return !!d && typeof d.value === 'function' && d.writable === false && d.configurable === false; };
ok(fixedOn(shim, 'getNodeByIdAsync') && fixedOn(root, 'findAllWithCriteria'), 'fixture: the strict host: the host\'s and the root\'s methods are fixed');
ok(JSON.stringify(queued) === JSON.stringify(['button', 'button-destructive', 'button-group', 'button-neutral', 'link', 'badge', 'checkbox-group', 'checkbox-row', 'icon']),
  `fixture: the owner's ticks queue nine sets (${queued.join(', ')})`);

/* ── 1. panels on ─────────────────────────────────────────────────────────────────────────────────────────────── */
{
  await setUp('panels/on');
  const f = await fileRead();
  ok(JSON.stringify(f?.docBlockLacks) === JSON.stringify(['badge', 'tag', 'list-item', 'divider']),
    `panels/on: the file's read names the four sets _Doc-block is built from, all lacking (${JSON.stringify(f?.docBlockLacks)})`);
  const fileSets = { docBlockLacks: f?.docBlockLacks as string[] | undefined };
  const also = docBlockAlsoOf(catalog, fileSets, queued, true);
  ok(JSON.stringify(also) === JSON.stringify(['tag', 'divider', 'list-item']) && JSON.stringify(also.map((id) => displayNameOf(catalog, id))) === JSON.stringify(['Tag', 'Divider', 'List Item']),
    `panels/on: also builds: Tag, Divider and List Item, the three the queue does not hold, in Components' order (${JSON.stringify(also)} → ${also.map((id) => displayNameOf(catalog, id)).join(', ')})`);
  const order = runOrderOf(fileSets, queued, true);
  ok(JSON.stringify(order) === JSON.stringify(['badge', 'button', 'button-destructive', 'button-group', 'button-neutral', 'link', 'checkbox-group', 'checkbox-row', 'icon']),
    `panels/on: run order: the queued Badge first, then the queue's order (${order.join(', ')})`);
  for (const [i, id] of order.entries()) {
    const r = await build(id, true);
    const lines: string[] = Array.isArray(r?.lines) ? r.lines : [];
    ok(r?.type === 'component-result' && r.completed === true && r.ok === true,
      `panels/on: sets/${id}: completed, clean (${said(r)})`);
    // The reason the owner's five sets had: the file had no template. (Checkbox.Row, built again after Checkbox group
    // built it first, the double build #3320 removes, redraws its family's panel; the shim's search finds no frame, so
    // that redraw cannot find the panel it replaces and reads it as in the way. That is the shim's, not this decision's.)
    ok(!lines.includes(DOC_BLOCK_LINE) && !lines.some((l) => l.startsWith('No usage panels drawn')),
      `panels/on: sets/${id}: no "No usage panels drawn" problem (${JSON.stringify(lines.filter((l) => l.startsWith('No usage')))})`);
    if (i === 0) ok(lines.includes('Also built: icon, focus-ring, tag, list-item, divider') && lines.includes('Built _Doc-block'),
      `panels/on: sets/${id}: names what it built first, then _Doc-block (${JSON.stringify(lines.filter((l) => l.startsWith('Also built') || l.includes('_Doc-block')))})`);
    // #3359: and sends them as data, the ids the panel's run skips. Literal. (mutation: `main.ts` not sending
    // `alsoBuilt` → `panels/on: sets/badge: also built as data`)
    if (i === 0) ok(JSON.stringify(r?.alsoBuilt) === JSON.stringify(['icon', 'focus-ring', 'tag', 'list-item', 'divider']),
      `panels/on: sets/${id}: also built as data: the result carries the ids it built first (${JSON.stringify(r?.alsoBuilt ?? null)})`);
  }
  ok(setNamed('_Doc-block'), 'panels/on: _Doc-block: the template is in the file');
  ok(['badge', 'tag', 'list-item', 'divider'].every(setNamed), `panels/on: the four sets _Doc-block is built from are in the file`);
  const panels = livePanels();
  const leads = [...new Set(queued.flatMap((id) => { const fam = panelFamily(id); return fam ? [fam.lead] : []; }))];
  ok(JSON.stringify(leads) === JSON.stringify(['button', 'link', 'badge', 'checkbox-row']) && leads.every((l) => panels.includes(l)),
    `panels/on: every queued set's family has its usage panel: ${leads.join(', ')} (live panels: ${[...new Set(panels)].join(', ')})`);
  ok(['tag', 'divider'].every((l) => panels.includes(l)), `panels/on: the sets built first have theirs too: tag, divider (${[...new Set(panels)].join(', ')})`);
}

/* ── 2. panels off ────────────────────────────────────────────────────────────────────────────────────────────── */
{
  freshFile();
  const saved = await send({ type: 'doc-settings-save', settings: { panels: false, cover: true, styleGuide: null } }, ['doc-settings']);
  ok(saved?.settings?.panels === false, `panels/off: Documentation's usage panels are off (${JSON.stringify(saved?.settings)})`);
  await setUp('panels/off');
  const f = await fileRead();
  const fileSets = { docBlockLacks: f?.docBlockLacks as string[] | undefined };
  ok(docBlockAlsoOf(catalog, fileSets, queued, false).length === 0, `panels/off: also builds: nothing (${JSON.stringify(docBlockAlsoOf(catalog, fileSets, queued, false))})`);
  const order = runOrderOf(fileSets, queued, false);
  ok(JSON.stringify(order) === JSON.stringify(queued), `panels/off: run order: the queue's own (${order.join(', ')})`);
  for (const id of order) {
    const r = await build(id, true);
    ok(r?.type === 'component-result' && r.completed === true, `panels/off: sets/${id}: completed (${said(r)})`);
  }
  ok(!['tag', 'list-item', 'divider'].some(setNamed) && !setNamed('_Doc-block'),
    `panels/off: nothing extra: no Tag, List item, Divider or _Doc-block (${['tag', 'list-item', 'divider', '_Doc-block'].filter(setNamed).join(', ') || 'none'})`);
  ok(livePanels().length === 0, `panels/off: no usage panel drawn (${livePanels().length})`);
}

/* ── 3. panels on, no ask ─────────────────────────────────────────────────────────────────────────────────────── */
{
  freshFile();
  await send({ type: 'doc-settings-save', settings: { panels: true, cover: true, styleGuide: null } }, ['doc-settings']);
  await setUp('no ask');
  const r = await build('link', false);
  const lines: string[] = Array.isArray(r?.lines) ? r.lines : [];
  ok(r?.type === 'component-result' && lines.includes(LINK_NOTE_LINE) && !lines.includes(DOC_BLOCK_LINE),
    `no ask: a build without the ask (the Components page's) builds no template: its panel waits for _Doc-block, and the line names this file's fix (${JSON.stringify(lines.filter((l) => l.startsWith('No usage')))})`);
  ok(!['badge', 'tag', 'list-item', 'divider'].some(setNamed) && !setNamed('_Doc-block'),
    `no ask: nothing extra: no Badge, Tag, List item, Divider or _Doc-block (${['badge', 'tag', 'list-item', 'divider', '_Doc-block'].filter(setNamed).join(', ') || 'none'})`);
  // #3467 (Q2 A): that is a note. The set was built correctly, so the run stays ok and ✓, and says it once as a note.
  ok(r?.ok === true && r?.completed === true && String(r?.headline).startsWith('✓'),
    `#3467 note: a missing _Doc-block leaves the build ok and ✓ (${said(r)})`);
  ok(JSON.stringify(r?.causes) === JSON.stringify([{ kind: 'note', subject: null, what: 'No usage panels drawn: this file has no _Doc-block component.', reasons: ['Build badge, tag, list-item, divider, then run Set up file and build again.'] }]),
    `#3467 note: its one cause is the note, with this file's fix (${JSON.stringify(r?.causes)})`);
  // `_Label` keeps Q284.3 A's warning: the same build with the label template gone is ⚠, not ok, for `_Label`.
  const fc = pages.find((p) => p.name === '↳ File Components');
  const label = fc?.children.find((n) => n.type === 'COMPONENT_SET' && n.name === '_Label');
  if (label) detach(label);
  const w = await build('link', false);
  ok(!!label && w?.ok === false && String(w?.headline).startsWith('⚠')
    && (w?.causes ?? []).some((c: any) => c.kind === 'warn' && c.subject === 'link' && JSON.stringify(c.reasons) === JSON.stringify(['No canvas labels drawn: this file has no _Label component. Run Set up file, then build again.'])),
    `#3467 label still warns: with no _Label, the build is ⚠ and not ok, Link's cause the label line (${said(w)} ${JSON.stringify(w?.causes)})`);
}

/* ── 4. a file that already holds one of the four (review S1) ──────────────────────────────────────────────────── */
{
  freshFile();
  // Badge built with the panels off: the file holds it, with no `_Doc-block`.
  await send({ type: 'doc-settings-save', settings: { panels: false, cover: true, styleGuide: null } }, ['doc-settings']);
  await setUp('some held');
  const b = await build('badge', true);
  ok(b?.type === 'component-result' && b.completed === true && setNamed('badge') && !setNamed('_Doc-block'),
    `some held: Badge built with the panels off, and no _Doc-block (${said(b)})`);
  const badgeSets = (): string[] => onPages().filter((n) => n.type === 'COMPONENT_SET' && n.name === 'badge').map((n) => n.id);
  const badgeBefore = badgeSets();
  await send({ type: 'doc-settings-save', settings: { panels: true, cover: true, styleGuide: null } }, ['doc-settings']);
  const f = await fileRead();
  ok(JSON.stringify(f?.docBlockLacks) === JSON.stringify(['tag', 'list-item', 'divider']),
    `some held: the file's read names only the three the file lacks, not the Badge it holds (${JSON.stringify(f?.docBlockLacks)})`);
  const fileSets = { docBlockLacks: f?.docBlockLacks as string[] | undefined };
  const also = docBlockAlsoOf(catalog, fileSets, ['link'], true);
  ok(JSON.stringify(also.map((id) => displayNameOf(catalog, id))) === JSON.stringify(['Tag', 'Divider', 'List Item']),
    `some held: also builds: Tag, Divider and List Item, not Badge (${also.map((id) => displayNameOf(catalog, id)).join(', ')})`);
  const r = await build('link', true);
  const lines: string[] = Array.isArray(r?.lines) ? r.lines : [];
  ok(r?.type === 'component-result' && r.completed === true && r.ok === true, `some held: sets/link: completed, clean (${said(r)})`);
  ok(lines.includes('Also built: icon, focus-ring, tag, list-item, divider') && lines.includes('Built _Doc-block'),
    `some held: sets/link: builds the three the file lacks (with the sets they nest), then _Doc-block, and not Badge (${JSON.stringify(lines.filter((l) => l.startsWith('Also built') || l.includes('_Doc-block')))})`);
  ok(badgeBefore.length === 1 && JSON.stringify(badgeSets()) === JSON.stringify(badgeBefore),
    `some held: Badge is not rebuilt: the file's one Badge set is the one it held (${JSON.stringify(badgeBefore)} → ${JSON.stringify(badgeSets())})`);
  ok(setNamed('_Doc-block') && livePanels().includes('link'), `some held: _Doc-block is in the file and Link has its usage panel (${[...new Set(livePanels())].join(', ')})`);
  // Once the file holds `_Doc-block` (#3311), its read names nothing to build first, so To add lists no "Also builds".
  // The key itself is absent: an empty list would still be posted under a read that ignored the template.
  const held = await fileRead();
  ok(held?.type === 'file-sets' && !('docBlockLacks' in held),
    `some held: once the file holds _Doc-block, its read names nothing to build first (${JSON.stringify(held?.docBlockLacks)})`);
}

/* ── 5. the agent's build makes Update file's ask (#3467 Q1 A) ─────────────────────────────────────────────────── */
{
  freshFile();
  await send({ type: 'doc-settings-save', settings: { panels: true, cover: true, styleGuide: null } }, ['doc-settings']);
  await setUp('agent');
  // The bridge's and the mailbox's route, as the dispatcher runs it, into the plugin's own action table.
  const posts: any[] = [];
  const sink = { post: (m: unknown) => { posts.push(m); }, data: () => undefined };
  const command = { v: 1, id: 'agent-1', cmd: 'build-components', args: { def: 'link' }, issuedAt: new Date().toISOString() };
  await ROUTES['build-components'](command as never, mainModule.ACTIONS, sink, {} as never);
  const r = posts.find((m) => m?.type === 'component-result');
  const lines: string[] = Array.isArray(r?.lines) ? r.lines : [];
  ok(r?.completed === true && r?.ok === true && String(r?.headline).startsWith('✓'), `agent: build-components link: completed, clean (${said(r)})`);
  ok(lines.includes('Also built: badge, icon, focus-ring, tag, list-item, divider') && lines.includes('Built _Doc-block'),
    `agent: build-components link: builds Badge, Tag, List Item and Divider with what Link nests, then _Doc-block, as Update file's ask does (${JSON.stringify(lines.filter((l) => l.startsWith('Also built') || l.includes('_Doc-block')))})`);
  ok(setNamed('_Doc-block') && livePanels().includes('link'), `agent: _Doc-block is in the file and Link has its usage panel (${[...new Set(livePanels())].join(', ')})`);
}

/* ── 6. the setup-incomplete read (#3467 Q3 A, Q4 A) ─────────────────────────────────────────────────────────── */
{
  freshFile();
  await send({ type: 'doc-settings-save', settings: { panels: true, cover: true, styleGuide: null } }, ['doc-settings']);
  const before = await fileRead();
  ok(before?.setUp === false && JSON.stringify(before?.setupIncomplete) === JSON.stringify(['↳ File Components', '_Section-header', '_Headings', '_Label', '_inverse-backdrop', '_scrim-backdrop', '_style-guide-swatches', '_style-guide-text-cells', '_style-guide-spacing-cells']),
    `setup incomplete/fresh: a fresh file is not set up, and the read lists every piece setup builds, _Doc-block not yet buildable (${JSON.stringify(before?.setupIncomplete)})`);
  await setUp('setup incomplete');
  const done = await fileRead();
  ok(done?.setUp === true && !('setupIncomplete' in done), `setup incomplete/set up: after Set up file, nothing is listed (${JSON.stringify(done?.setupIncomplete)})`);
  // The four sets, built without the ask: `_Doc-block` can now be built, so it is listed; the file is still set up.
  for (const id of ['badge', 'tag', 'list-item', 'divider']) await build(id, false);
  const ready = await fileRead();
  ok(ready?.setUp === true && JSON.stringify(ready?.setupIncomplete) === JSON.stringify(['_Doc-block']),
    `setup incomplete/doc block: with Badge, Tag, List Item, Divider and the theme in the file, _Doc-block is listed, and isSetUp is unchanged (${JSON.stringify({ setUp: ready?.setUp, list: ready?.setupIncomplete })})`);
  // Two of setup's pieces deleted: each is listed by name, and the file still counts as set up (P8).
  const fc = pages.find((p) => p.name === '↳ File Components');
  for (const name of ['_Label', '_scrim-backdrop', '_style-guide-spacing-cells']) { const n = fc?.children.find((c) => c.name === name); if (n) detach(n); }
  const gone = await fileRead();
  ok(gone?.setUp === true && JSON.stringify(gone?.setupIncomplete) === JSON.stringify(['_Label', '_scrim-backdrop', '_style-guide-spacing-cells', '_Doc-block']),
    `setup incomplete/deleted: a deleted template and cell set are listed in setup's order, and the file still counts as set up (${JSON.stringify({ setUp: gone?.setUp, list: gone?.setupIncomplete })})`);
  // Set up file puts them all back, and the read lists nothing again.
  await setUp('setup incomplete/again');
  const back = await fileRead();
  ok(back?.setUp === true && !('setupIncomplete' in back) && ['_Label', '_scrim-backdrop', '_style-guide-spacing-cells', '_Doc-block'].every((n) => onPages().some((x) => x.name === n)),
    `setup incomplete/repaired: Set up file builds what was listed, and the read lists nothing (${JSON.stringify(back?.setupIncomplete)})`);
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
