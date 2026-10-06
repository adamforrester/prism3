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
 * INDEPENDENCE (docs/34): the expected values are literals typed here, from the owner's definition of the
 * two results; the actual side is what `main.ts` posted. The refusal is reached by editing the HOST's file
 * (the member names, which are what a set's axes are), never by stubbing the executor.
 *
 * Mutation this fails by name: `completed: true` hard-coded on `main.ts`'s success-path post →
 * `C1: a build the executor refused (#1780) posts completed: false`.
 */
import { makeShim } from './component-shim';
import type { Node } from './component-shim';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/* ── the host: the component shim, a page list, and the UI channel ─────────────────────────────────── */

type ShimPage = { id: string; name: string; type: 'PAGE'; isPageDivider: boolean; backgrounds?: readonly unknown[];
  children: Node[]; appendChild(c: Node): void; findOne(p: (n: unknown) => boolean): unknown };
const pages: ShimPage[] = [];
let pageSeq = 0;
const mkPage = (divider: boolean): ShimPage => {
  const p: ShimPage = {
    id: `PAGE:${++pageSeq}`, name: divider ? '---' : '', type: 'PAGE', isPageDivider: divider, children: [],
    appendChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); this.children.push(c); },
    findOne(pred) { return this.children.find(pred) ?? null; },
  };
  pages.push(p);
  return p;
};

const posted: any[] = [];
const shim = makeShim() as Record<string, any>;
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
const empty = async () => [];
Object.assign(shim, {
  showUI: () => undefined,
  ui: { postMessage: (m: unknown) => { posted.push(m); }, onmessage: null as null | ((m: unknown) => void), resize: () => undefined },
  clientStorage: { getAsync: async () => undefined, setAsync: async () => undefined },
  on: () => undefined,
  createPage: () => mkPage(false),
  createPageDivider: () => mkPage(true),
  setCurrentPageAsync: async () => undefined,
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

console.log(`\n${executed - failed}/${executed} build-completed assertions passed.`);
process.exit(failed ? 1 : 0);
