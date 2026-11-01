/**
 * #3170 PART 2 — WHAT THE PANEL HEARS WHILE A WRITE RUNS, AND "STOP AFTER <SET>" (the owner's Q3170.1–6, all A).
 *
 *   npx tsx apps/plugin/test-run-progress.ts
 *
 * The panel learns something only when the main thread posts to it, and the main thread can post only where a write
 * hands it back. So each write the panel starts posts `run-progress` at its boundaries and hands the thread back there,
 * and again inside a long set. This file holds that, and the Stop, two ways:
 *
 * THROUGH THE REAL `main.ts`, over the component shim with a page list (as `test-update-fresh.ts` builds it): Divider,
 * Badge and Tag are built, every member's stamp is set back to revision 0 (what a file built by an older plugin holds,
 * as `test-update-apply.ts`'s corpus does), the scoped check is asked for its hash, and `update-sets` is posted as the
 * panel posts it. What `main.ts` posts back is read off the UI channel.
 *   · `progress/check`: the first reading is the check before any write, naming no set, over the three sets;
 *   · `progress/check-first`: with pages that answer a search of their own (the run's paged read, #3177), the check
 *     reading is posted before the host's first page read, so the strip speaks for the whole read;
 *   · `progress/boundaries`: then one `work` reading per set, each naming its set, `done` counting the sets before it;
 *   · `progress/finish`: the last reading says the three are done, before the verdict;
 *   · `progress/inside`: a long set (Tag, 45 members) is heard from again inside it, with its own reading, once about
 *     `PACE_MS` (50 ms) of work has run. The clock is the test's: `Date.now` steps `STEP_MS` a call while the update runs,
 *     so the count does not hang on this machine's speed. `progress/paced` holds the budget the other way: with a clock
 *     that does not move, no set is heard from inside;
 *   · `progress/agent`: an agent's update (its own sink) posts no reading to the panel, and puts none in its verdicts;
 *   · `stop/boundary`: `update-stop`, sent while the first set is written, stops the run at the next boundary: the first
 *     set is written, the two after it keep every member's stamp and record as they were, and the run says so;
 *   · `stop/before`: sent before the first write, nothing is written and no version is saved;
 *   · `stop/idle`: sent with nothing running, it stops nothing later;
 *   · `apply/panel`, `apply/agent`: the panel's Apply Theme posts its check reading; an agent's posts none.
 *
 * OVER THE FILE SHIM (`runApplyTheme`, as `test-mcp-paste.ts` runs it): Apply Theme's seven stages, in order, each
 * announced before it writes (`apply/stages`); a paced apply writes exactly what an unpaced one does (`apply/same`); and
 * THE CADENCE (#3208, `apply/cadence <stage>`): the shim counts every host call (`FileShim.calls`), the pace reads the
 * count at each stage and each tick, and no stage of any example brand's apply, into an empty file or again over its own,
 * makes more than `CADENCE` (32) calls between two chances to hand the thread back. Through `main.ts`, the panel's Apply
 * Theme is heard from inside its stages once about `PACE_MS` of work has run (`apply/inside`), and not with a clock that
 * stands still (`apply/paced`).
 *
 * INDEPENDENCE (docs/34): the sets, the stage order, the 32 and the 50 ms are literals typed here; the written state is
 * read off the shims' own nodes and variables, never off the run's report.
 *
 * MUTATIONS, each failing by name: the work reading not posted (`opts.progress?.(work)` dropped in `update-apply.ts`)
 * → `progress/boundaries`; the finish reading dropped → `progress/finish`; `paced` handing back at every call (the
 * budget test dropped) → `progress/paced`; `paced` never saying `again` → `progress/inside`; the reading posted for an
 * agent's run (`panel` true) → `progress/agent`; the boundary stop read dropped → `stop/boundary`; the stop before the
 * version dropped → `stop/before`; `update-stop` setting the flag with nothing running → `stop/idle`; a stage not
 * announced → `apply/stages`; the check reading moved after `runHost` → `progress/check-first`; #3208: a stage's
 * per-row tick dropped (the float pass A tick, the color alias tick, the text-style tick, each in its executor) →
 * `apply/cadence <that stage>`; `themePace`'s tick never handing back → `apply/inside`; handing back at every tick (the
 * `PACE_MS` test dropped) → `apply/paced`.
 */
import { makeShim } from './component-shim';
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { SWAP_TARGET } from './src/build-deps';
import type { Node } from './component-shim';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import type { BrandInput } from '@prism3/engine/theme';
import { runApplyTheme, themePlans } from './src/apply-theme';
import { FileShim } from './file-shim';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const J = JSON.stringify;

/* ── Apply Theme over the file shim ─────────────────────────────────────────────────────────────────────────────── */

console.log('Apply Theme\'s stages, and a chance to hand back inside each (#3170, #3208), over the file shim');
const BRAND = (exampleBrands as Record<string, BrandInput>)[Object.keys(exampleBrands)[0]];
const STAGES = ['float', 'color', 'styles', 'grid', 'type-vars', 'text-styles', 'motion'];
/** #3208: the most host calls any stage may make between two chances to hand the thread back. A component write offers
 *  one after every member; Apply Theme offers one after every variable or style, and the heaviest is a variable written
 *  across every mode of its collection (25 calls measured on the example brands, the `layout` breakpoints). A stage that
 *  writes a whole collection, or its aliases, in one turn is hundreds over: 1,571 in the color stage, measured before. */
const CADENCE = 32;
/** Every face each brand's text styles ask for, so the text-style stage writes its rows rather than skipping them. */
const facesOf = (b: BrandInput) => [...new Map(themePlans(b).textPlan.map((r) => [`${r.fontFamilyPrimary}|${r.fontStyle}`, { family: r.fontFamilyPrimary, style: r.fontStyle }])).values()];
{
  const events: (string | [string, string, number])[] = [];
  let stage = '';
  const paced = new FileShim();
  paced.faces = facesOf(BRAND);
  const r = await runApplyTheme(BRAND, paced as any, undefined, {
    check: () => { events.push('check'); },
    stage: async (s, done) => { stage = s; events.push(['stage', s, done]); },
    tick: async () => { events.push(['tick', stage, 0]); },
  });
  ok(r.guarded.ok, 'apply/control: the paced apply wrote cleanly');
  const stages = events.filter((e): e is [string, string, number] => Array.isArray(e) && e[0] === 'stage');
  ok(events[0] === 'check' && J(stages.map((e) => e[1])) === J(STAGES) && J(stages.map((e) => e[2])) === J([0, 1, 2, 3, 4, 5, 6]),
    `apply/stages: the check first, then the seven stages in order, each with the stages done before it (${J(events.filter((e) => !Array.isArray(e) || e[0] === 'stage'))})`);
  const plain = new FileShim();
  plain.faces = facesOf(BRAND);
  await runApplyTheme(BRAND, plain as any);
  const state = (f: FileShim) => J({ c: f.collections.map((x) => [x.name, x.modes]), v: f.vars.map((x) => [x.name, x.valuesByMode, x.scopes]), s: f.styles });
  ok(state(paced) === state(plain), 'apply/same: a paced apply writes exactly what an unpaced one does');
}
// THE CADENCE (#3208). The shim counts every host call (`FileShim.calls`); the pace reads the count at each stage and at
// each tick, so a gap is the calls one turn made. Every example brand, into an empty file and again over its own apply
// (the second run renames nothing and creates nothing, so its rows are lighter, but its reads differ). The calls before
// the first stage (the font preload and the pre-flight's reads) are the check, not a stage, and are not held here.
for (const [name, brand] of Object.entries(exampleBrands as Record<string, BrandInput>)) {
  for (const run of ['empty', 'again'] as const) {
    const f = new FileShim();
    f.faces = facesOf(brand);
    if (run === 'again') await runApplyTheme(brand, f as any);
    const worst = new Map<string, number>(STAGES.map((st) => [st, 0]));
    const turns = new Map<string, number>(STAGES.map((st) => [st, 0]));
    let stage = '';
    let at = 0;
    const turn = (): void => { if (stage) { worst.set(stage, Math.max(worst.get(stage)!, f.calls - at)); turns.set(stage, turns.get(stage)! + 1); } at = f.calls; };
    const r = await runApplyTheme(brand, f as any, undefined, {
      check: () => {},
      stage: async (st) => { turn(); stage = st; },
      tick: async () => { turn(); },
    });
    turn();
    if (!r.guarded.ok) { ok(false, `apply/cadence ${name} ${run}: premise, the apply wrote cleanly`); continue; }
    for (const st of STAGES) {
      ok(worst.get(st)! <= CADENCE,
        `apply/cadence ${st}: ${name}, ${run === 'empty' ? 'into an empty file' : 'again over its own apply'}, at most ${CADENCE} host calls between two chances to hand back (worst ${worst.get(st)}, over ${turns.get(st)} turns)`);
    }
  }
}

/* ── the host: the component shim, a page list, and the UI channel, through `main.ts` ──────────────────────────────── */

type ShimPage = { id: string; name: string; type: 'PAGE'; isPageDivider: boolean; children: Node[]; appendChild(c: Node): void; insertChild(i: number, c: Node): void; findOne(p: (n: unknown) => boolean): unknown };
const pages: ShimPage[] = [];
/** Set while `progress/check-first` runs: a page made then answers a search of its own, as every other page does. */
let pagedSearch: ((this: ShimPage, c?: { types?: string[] }) => Node[]) | null = null;
let pageSeq = 0;
const mkPage = (divider: boolean): ShimPage => {
  const p: ShimPage = {
    id: `PAGE:${++pageSeq}`, name: divider ? '---' : '', type: 'PAGE', isPageDivider: divider, children: [],
    appendChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); this.children.push(c); c.parent = this as unknown as Node; },
    insertChild(at, c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parent = this as unknown as Node; this.children.splice(Math.max(0, Math.min(at, this.children.length)), 0, c); },
    findOne(pred) { return this.children.find(pred) ?? null; },
  };
  if (pagedSearch) (p as ShimPage & { findAllWithCriteria?: unknown }).findAllWithCriteria = pagedSearch;
  pages.push(p);
  return p;
};
mkPage(false).name = 'Page 1';
/** What `main.ts` posted to the panel, and a hook run on each post as it lands. */
const posted: any[] = [];
let onPost: ((m: any) => void) | null = null;
// The file holds every variable, style and component the three sets' plans name, as `test-update-apply.ts`'s world does,
// so each builds clean and the check reads it updatable, never blocked.
const PLANS = ['divider', 'badge', 'tag'].flatMap((id) => figmaAnatomySet(componentDefs.find((d) => d.id === id)!, { swapTarget: SWAP_TARGET }));
type PNode = { swapTarget?: string; nestTarget?: string; nestOverrides?: readonly { type: string; value: string }[]; children?: PNode[] };
const planComps = (n: PNode): string[] => [...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.nestOverrides ?? []).filter((o) => o.type === 'INSTANCE_SWAP').map((o) => o.value), ...(n.children ?? []).flatMap(planComps)];
const shim = makeShim({
  vars: [...new Set([...PLANS.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0'])],
  styles: [...new Set(PLANS.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(PLANS.flatMap((p) => planEffectStyles(p.root)))],
  comps: [...new Set([SWAP_TARGET, ...PLANS.flatMap((p) => planComps(p.root as unknown as PNode))])],
  identities: true,
}) as Record<string, any>;
const root = shim.root as Record<string, unknown>;
const pluginData = new Map<string, string>();
const sharedData = new Map<string, string>();
Object.defineProperty(root, 'children', { get: () => pages });
Object.assign(root, {
  name: 'progress file', type: 'DOCUMENT',
  insertChild: (index: number, child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.splice(Math.max(0, Math.min(index, pages.length)), 0, child); },
  appendChild: (child: ShimPage) => { const i = pages.indexOf(child); if (i >= 0) pages.splice(i, 1); pages.push(child); },
  getSharedPluginData: (ns: string, k: string) => sharedData.get(`${ns}:${k}`) ?? '',
  setSharedPluginData: (ns: string, k: string, v: string) => { sharedData.set(`${ns}:${k}`, v); },
  getPluginData: (k: string) => pluginData.get(k) ?? '',
  setPluginData: (k: string, v: string) => { pluginData.set(k, v); },
});
const onPages = (): Node[] => { const out: Node[] = []; const walk = (n: Node) => { out.push(n); for (const c of (n.children as Node[] | undefined) ?? []) walk(c); }; for (const p of pages) for (const c of p.children) walk(c); return out; };
const shimFind = (root.findAllWithCriteria as (c?: { types?: string[] }) => unknown[]).bind(root);
root.findAllWithCriteria = (c?: { types?: string[] }) => [...shimFind(c), ...onPages().filter((n) => !c?.types || c.types.includes(n.type as string))];
const empty = async () => [];
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); onPost?.(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  createPage: () => mkPage(false),
  createPageDivider: () => mkPage(true),
  createComponent: () => shim.createComponentFromNode(shim.createFrame()),
  setCurrentPageAsync: async () => undefined,
  getNodeByIdAsync: async (id: string) => onPages().find((n) => n.id === id) ?? null,
  listAvailableFontsAsync: empty,
  getLocalPaintStylesAsync: shim.getLocalPaintStylesAsync ?? empty,
  getLocalGridStylesAsync: shim.getLocalGridStylesAsync ?? empty,
});
const g = globalThis as Record<string, unknown>;
g.figma = shim; g.__html__ = ''; g.PRISM3_BUILD = '2026-10-30T00:00:00Z tree-test0000';
const log = console.log;
console.log = (...a: unknown[]) => { if (typeof a[0] === 'string' && a[0].startsWith('[prism3')) return; log(...a); };

const main = await import('./src/main');

/** The test's clock while an update runs: `Date.now` steps `STEP_MS` a call, or stands still at `STEP_MS` 0. */
const realNow = Date.now;
const STEP_MS = 7;
const clockOn = (step: number): void => { let t = realNow(); Date.now = () => (t += step); };
const clockOff = (): void => { Date.now = realNow; };

const realTimeout = globalThis.setTimeout;
const send = async (msg: unknown, kinds: readonly string[], ms = 60_000): Promise<any> => {
  posted.length = 0;
  (shim.ui as { onmessage: (m: unknown) => void }).onmessage(msg);
  const t0 = realNow();
  while (realNow() - t0 < ms) {
    const r = posted.find((m) => m?.type === 'refused' || kinds.includes(m?.type));
    if (r) return r;
    await new Promise((res) => realTimeout(res, 2));
  }
  return null;
};

console.log('\nThe update\'s readings and its Stop (#3170), through main.ts');
const SETS = ['divider', 'badge', 'tag'];
for (const id of SETS) {
  const r = await send({ type: 'build-components', def: id }, ['component-result']);
  if (r?.type !== 'component-result') throw new Error(`premise: ${id} did not build (${r?.type}: ${r?.headline ?? r?.message})`);
}
const setOf = (id: string): Node => onPages().find((n) => n.type === 'COMPONENT_SET' && String(n.name).toLowerCase() === id) as Node;
const NS = 'prism3';
const membersOf = (id: string): Node[] => (setOf(id)?.children as Node[] | undefined) ?? [];
const stampOf = (m: Node): string => (m.getSharedPluginData as (a: string, b: string) => string)(NS, 'memberStamp');
/** Every member out of date: its stamp's revision set back to 0, as a file built by an older plugin holds it. */
const outOfDate = (): void => { for (const id of SETS) for (const m of membersOf(id)) (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, 'memberStamp', stampOf(m).replace(/\|[^|]*$/, '|0')); };
/** What an untouched set must still hold: each member's name, stamp, record and child count. */
const snapshot = (id: string): string => J(membersOf(id).map((m) => [m.name, stampOf(m), (m.getSharedPluginData as (a: string, b: string) => string)(NS, 'asBuilt'), (m.children as Node[] | undefined)?.length ?? 0]));
const hashFor = async (): Promise<string> => {
  const c = await send({ type: 'update-check-request', defs: SETS }, ['update-check']);
  const due = (c?.sets ?? []).filter((s: { update: number }) => s.update > 0).map((s: { def: string }) => s.def);
  if (J([...due].sort()) !== J([...SETS].sort())) throw new Error(`premise: the check reads ${J(due)} out of date, not all three (${J(c)?.slice(0, 300)})`);
  return c.previewHash as string;
};
/** The update wrote all 102 members (7 + 50 + 45; badge 50 since #3199). Its headline carries "⚠" here only for the template warning: the stand-in
 *  never ran Set up file, so it has no `_Label` component. */
const ALL = 102;
const wroteAll = (v: any): boolean => v?.type === 'component-update-result' && new RegExp(`^[✓⚠] updated ${ALL} in place$`).test(v.headline);
const readings = (from: readonly any[]): any[] => from.filter((m) => m?.type === 'run-progress' && m.run === 'update');
ok(J(SETS.map((id) => membersOf(id).length)) === J([7, 50, 45]), `premise: the three sets are built (${SETS.map((id) => membersOf(id).length).join(', ')} members)`);

// ── one update, start to end ──
{
  outOfDate();
  const hash = await hashFor();
  clockOn(STEP_MS);
  const v = await send({ type: 'update-sets', defs: SETS, previewHash: hash, handEdits: 'keep' }, ['component-update-result']);
  clockOff();
  const all = [...posted];
  const rs = readings(all);
  ok(wroteAll(v), `progress/control: the update ran and answered (${v?.type}: ${v?.headline})`);
  ok(rs[0]?.phase === 'check' && rs[0].item === null && rs[0].done === 0 && rs[0].total === 3,
    `progress/check: the first reading is the check before any write, over the three sets (${J(rs[0])})`);
  const firsts = rs.filter((m, i) => m.phase === 'work' && !rs.slice(0, i).some((p) => p.phase === 'work' && p.item === m.item));
  ok(firsts.length === 3 && J([...firsts.map((m) => m.item)].sort()) === J([...SETS].sort()) && J(firsts.map((m) => m.done)) === J([0, 1, 2]) && firsts.every((m) => m.total === 3),
    `progress/boundaries: one reading per set as it starts, naming it, with the sets done before it (${J(firsts.map((m) => [m.item, m.done, m.total]))})`);
  const last = rs[rs.length - 1];
  const at = (m: unknown): number => all.indexOf(m);
  ok(last?.phase === 'finish' && last.done === 3 && last.total === 3 && at(last) < at(v),
    `progress/finish: the last reading says the three are done, before the verdict (${J(last)})`);
  const tagFirst = firsts.find((m) => m.item === 'tag');
  const heart = rs.filter((m) => m.phase === 'work' && m.item === 'tag' && m !== tagFirst);
  ok(heart.length >= 3 && heart.every((m) => m.done === tagFirst?.done),
    `progress/inside: Tag (${membersOf('tag').length} members) is heard from inside it, its own reading again, once about 50 ms of work has run (${heart.length} times at ${STEP_MS} ms a clock call)`);
  // A reading inside a set repeats that set's own: never the set before's after the next has started.
  const order = rs.filter((m) => m.phase === 'work').map((m) => m.item);
  ok(order.every((x, i) => i === 0 || x === order[i - 1] || !order.slice(0, i).includes(x)), `progress/inside: each set's readings come together, between its boundary and the next (${J(order.filter((x, i) => x !== order[i - 1]))})`);
}

// ── the check reading comes before the run's read of the file (#3177's paged read, from #3190) ──
// The pages answer a search of their own here, so the run's host reads the file a page per turn, as it does in Figma; each
// page search and each check reading lands on one timeline, and the check must come before the first page is searched.
// Posted after that read, the strip would say nothing for the whole read.
{
  const timeline: string[] = [];
  let recording = false;
  const pageSearch = function (this: ShimPage, c?: { types?: string[] }): Node[] {
    if (recording) timeline.push('read');
    const out: Node[] = [];
    const walk = (n: Node) => { out.push(n); for (const k of (n.children as Node[] | undefined) ?? []) walk(k); };
    for (const k of this.children) walk(k);
    // The shim's own nodes (the components and styles the plans name) sit on no page here: the first page holds them.
    if (this === pages[0]) out.unshift(...(shimFind(c) as Node[]));
    return out.filter((n) => !c?.types || c.types.includes(n.type as string));
  };
  pagedSearch = pageSearch;
  for (const pg of pages) (pg as ShimPage & { findAllWithCriteria?: unknown }).findAllWithCriteria = pageSearch;
  outOfDate();
  const hash = await hashFor();
  onPost = (m) => { if (recording && m?.type === 'run-progress' && m.run === 'update' && m.phase === 'check') timeline.push('check'); };
  recording = true;
  const v = await send({ type: 'update-sets', defs: SETS, previewHash: hash, handEdits: 'keep' }, ['component-update-result']);
  recording = false;
  onPost = null;
  pagedSearch = null;
  for (const pg of pages) delete (pg as ShimPage & { findAllWithCriteria?: unknown }).findAllWithCriteria;
  const firstRead = timeline.indexOf('read');
  ok(wroteAll(v) && firstRead >= 0, `progress/check-first control: the update ran over a paged host and read its pages (${v?.headline}; ${timeline.filter((x) => x === 'read').length} page searches)`);
  ok(timeline[0] === 'check' && timeline.indexOf('check') < firstRead,
    `progress/check-first: the check reading is posted before the host's first page read (${J(timeline.slice(0, 4))})`);
}

// ── the budget: a clock that does not move hands back at no point inside a set ──
{
  outOfDate();
  const hash = await hashFor();
  clockOn(0);
  const v = await send({ type: 'update-sets', defs: SETS, previewHash: hash, handEdits: 'keep' }, ['component-update-result']);
  clockOff();
  const work = readings(posted).filter((m) => m.phase === 'work');
  ok(wroteAll(v) && work.length === 3, `progress/paced: under 50 ms of work, a set is not interrupted: one reading per set, none inside (${work.length} work readings)`);
}

// ── an agent's update posts no reading ──
{
  outOfDate();
  const hash = await hashFor();
  posted.length = 0;
  const sunk: any[] = [];
  await (main.ACTIONS.updateComponents as (...a: unknown[]) => Promise<void>)(SETS, hash, { handEdits: 'keep' }, undefined, { post: (m: unknown) => { sunk.push(m); }, data: () => undefined });
  const verdict = sunk.find((m) => m?.type === 'component-update-result');
  ok(wroteAll(verdict) && !posted.some((m) => m?.type === 'run-progress') && !sunk.some((m) => m?.type === 'run-progress'),
    `progress/agent: an agent's update writes (${verdict?.headline}) and posts no reading, to the panel or to its own sink (${posted.filter((m) => m?.type === 'run-progress').length} and ${sunk.filter((m) => m?.type === 'run-progress').length})`);
}

// ── Stop after the set being written ──
{
  outOfDate();
  const hash = await hashFor();
  const before = Object.fromEntries(SETS.map((id) => [id, snapshot(id)]));
  let first: string | null = null;
  onPost = (m) => {
    if (m?.type === 'run-progress' && m.run === 'update' && m.phase === 'work' && m.done === 0 && !first) {
      first = m.item;
      (shim.ui as { onmessage: (m: unknown) => void }).onmessage({ type: 'update-stop' });
    }
  };
  const v = await send({ type: 'update-sets', defs: SETS, previewHash: hash, handEdits: 'keep' }, ['component-update-result']);
  onPost = null;
  const rest = SETS.filter((id) => id !== first);
  const last = readings(posted).at(-1);
  ok(!!first && v?.headline?.startsWith('⚠ stopped after') && last?.phase === 'finish' && last.done === 1 && last.total === 3,
    `stop/boundary: Stop during the first set ends the run at the next boundary (${v?.headline}; last reading ${J(last)})`);
  ok(!!first && membersOf(first).every((m) => !stampOf(m).endsWith('|0')), `stop/boundary: the set being written when Stop came (${first}) is finished: every member stamped current`);
  ok(rest.every((id) => snapshot(id) === before[id]), `stop/boundary: the sets after it are untouched, every member's stamp and record as before (${rest.join(', ')})`);
  ok(rest.every((id) => v?.lines?.some((l: string) => l.includes(id))) || rest.every((id) => v?.summary?.includes(id)), `stop/boundary: the verdict names the sets it left (${(v?.lines ?? []).find((l: string) => l.startsWith('Stopped')) ?? v?.summary})`);
}

// ── Stop before the first write ──
{
  outOfDate();
  const hash = await hashFor();
  const before = Object.fromEntries(SETS.map((id) => [id, snapshot(id)]));
  const versions = (shim._versions as string[]).length;
  onPost = (m) => { if (m?.type === 'run-progress' && m.phase === 'check') (shim.ui as { onmessage: (m: unknown) => void }).onmessage({ type: 'update-stop' }); };
  const v = await send({ type: 'update-sets', defs: SETS, previewHash: hash, handEdits: 'keep' }, ['component-update-result']);
  onPost = null;
  ok(v?.headline === '⚠ stopped before writing: nothing updated' && SETS.every((id) => snapshot(id) === before[id]) && (shim._versions as string[]).length === versions,
    `stop/before: Stop during the check writes nothing and saves no version (${v?.headline}; ${(shim._versions as string[]).length - versions} versions)`);
}

// ── a Stop with nothing running stops nothing later ──
{
  (shim.ui as { onmessage: (m: unknown) => void }).onmessage({ type: 'update-stop' });
  outOfDate();
  const hash = await hashFor();
  const v = await send({ type: 'update-sets', defs: SETS, previewHash: hash, handEdits: 'keep' }, ['component-update-result']);
  ok(wroteAll(v) && SETS.every((id) => membersOf(id).every((m) => !stampOf(m).endsWith('|0'))), `stop/idle: a Stop sent with nothing running stops nothing later (${v?.headline})`);
}

// ── Apply Theme through main.ts: the panel's posts its readings, an agent's none ──
{
  posted.length = 0;
  const v = await send({ type: 'apply-theme', input: BRAND }, ['apply-result']);
  const rs = posted.filter((m) => m?.type === 'run-progress' && m.run === 'apply-theme');
  ok(!!v && rs[0]?.phase === 'check' && rs[0].total === 7, `apply/panel: the panel's Apply Theme posts its check reading first, over 7 stages (${J(rs[0])})`);
}
// ── #3208: the panel's Apply Theme is heard from inside its stages, on the update's clock ──
// With the test's clock stepping `STEP_MS` a call, a stage that runs past about 50 ms posts its own reading again; with a
// clock that stands still, each stage posts once, at its boundary.
{
  // The component shim holds no variables: for these two runs the host's variable and style surface is a file shim's, as
  // the apply over the file shim above writes it, and the component shim's own is put back after.
  const API = ['getLocalEffectStylesAsync', 'getLocalPaintStylesAsync', 'getLocalGridStylesAsync', 'getLocalTextStylesAsync', 'createEffectStyle',
    'createPaintStyle', 'createGridStyle', 'createTextStyle', 'loadFontAsync', 'listAvailableFontsAsync'];
  const kept = new Map(['variables', ...API].map((k) => [k, Object.getOwnPropertyDescriptor(shim, k)] as const));
  const graft = (): void => {
    const f = new FileShim();
    f.faces = facesOf(BRAND);
    Object.defineProperty(shim, 'variables', { configurable: true, writable: true, value: f });
    for (const k of API) Object.defineProperty(shim, k, { configurable: true, writable: true, value: (f as any)[k] });
  };
  const inside = async (step: number): Promise<{ v: any; extra: Record<string, number> }> => {
    graft();
    clockOn(step);
    const v = await send({ type: 'apply-theme', input: BRAND }, ['apply-result']);
    clockOff();
    const extra: Record<string, number> = {};
    for (const m of posted.filter((x) => x?.type === 'run-progress' && x.run === 'apply-theme' && x.phase === 'work')) extra[m.item] = (extra[m.item] ?? -1) + 1;
    if (v?.ok === false) console.error(`    the apply refused: ${v.summary}`);
    return { v, extra };
  };
  const on = await inside(STEP_MS);
  const heard = STAGES.filter((st) => (on.extra[st] ?? 0) > 0);
  ok(on.v?.type === 'apply-result' && ['float', 'color'].every((st) => heard.includes(st)),
    `apply/inside: the panel's Apply Theme is heard from again inside its long stages, once about 50 ms of work has run (${J(on.extra)} at ${STEP_MS} ms a clock call)`);
  const off = await inside(0);
  ok(off.v?.type === 'apply-result' && STAGES.every((st) => off.extra[st] === 0),
    `apply/paced: with a clock that stands still, each stage is heard from once, at its boundary (${J(off.extra)})`);
  for (const [k, d] of kept) { if (d) Object.defineProperty(shim, k, d); else delete shim[k]; }
}
{
  posted.length = 0;
  const sunk: any[] = [];
  await (main.ACTIONS.applyTheme as (...a: unknown[]) => Promise<void>)(BRAND, { post: (m: unknown) => { sunk.push(m); }, data: () => undefined });
  ok(sunk.some((m) => m?.type === 'apply-result') && !posted.some((m) => m?.type === 'run-progress') && !sunk.some((m) => m?.type === 'run-progress'),
    'apply/agent: an agent\'s Apply Theme posts no reading');
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
