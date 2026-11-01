/**
 * #2564 — a set built through the MCP paste path carries the same prototype reactions as one the plugin builds.
 *
 * The plugin executor (`write-components.ts`) has written interactive-component reactions since #2466 (owner decision
 * Q238 A): Rest → Hover while hovering, Rest and Hover → Pressed while pressing (or the def's own `pressState`,
 * #2428). The MCP paste path built the same sets from the engine's chunk payloads and wrote none. Both now run one
 * pass, `writeSetReactions` (`reactions.ts`): the paste runtime (`mcp-steps.ts` `runComponentChunk`) calls it after a
 * set's LAST chunk, from the planned member names that chunk carries (`mcp-paste.ts`, packed by `packNames`).
 *
 * WHAT THIS RUNS. Each set is built twice into the in-memory component host (`component-shim.ts`, with node
 * identities, so reactions have ids to name): by the plugin's `applyComponentPlan`, and by the paste path's real
 * chunk scripts (`componentScripts`), whose payloads run through `runComponentChunk` exactly as the bundled script
 * runs them. The chunk budget is squeezed so `tag` takes several chunks: a reaction step that ran on an earlier
 * chunk would find destinations that do not exist yet.
 *
 * THE EXPECTED SIDE IS LITERAL (`docs/34`): member counts, source counts and reaction counts typed out (the same
 * numbers `test-reactions.ts` pins for the plugin), and named reactions for named members, spelled out by hand.
 * Neither path's output is the other's reference.
 */
import { figmaAnatomySet, planComponentName, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, planSetChunks } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { applyComponentPlan } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { makeShim, type Node, type Page } from './component-shim';
import { runComponentChunk, runComponentReactions, pack, unpack, packNames, unpackNames } from './src/mcp-steps';
import { componentScripts } from './mcp-paste';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import type { BrandInput } from '@prism3/engine/theme';

let failed = 0, executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`); else { failed++; console.log(`  ✗ ${label}`); }
};

const plansOf = (id: string): AnatomyPlan[] => figmaAnatomySet(componentDefs.find((x) => x.id === id)!, { swapTarget: SWAP_TARGET });
const planComps = (n: { swapTarget?: string; nestTarget?: string; children?: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []),
  ...((n.children ?? []) as (typeof n)[]).flatMap(planComps),
];
/** A fresh file for one def's set, with node identities on (a reaction names its destination by id). */
const host = (plans: AnatomyPlan[]) => {
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root))])],
    page, liveRoot: true, identities: true, scaleConstrained: true,
  }) as any;
  return { api, page, set: () => page.children.find((n) => n.type === 'COMPONENT_SET') as Node | undefined };
};
/** A member's reactions as `TRIGGER→<destination name>`, each destination looked up among the set's members by id. */
const named = (set: Node | undefined, name: string): string[] => {
  const members = (set?.children ?? []) as Node[];
  const byId = new Map(members.map((m) => [String(m.id), String(m.name)] as const));
  const m = members.find((x) => x.name === name);
  return ((m?.reactions ?? []) as { trigger: { type: string }; actions: { destinationId: string }[] }[])
    .flatMap((r) => r.actions.map((a) => `${r.trigger.type}→${byId.get(a.destinationId) ?? '?'}`)).sort();
};
const counts = (set: Node | undefined): [number, number, number] => {
  const members = (set?.children ?? []) as Node[];
  const rs = members.map((m) => ((m.reactions ?? []) as unknown[]).length);
  return [members.length, rs.filter((n) => n > 0).length, rs.reduce((a, b) => a + b, 0)];
};

/** The paste path: the def's real chunk payloads, run through the runtime's own step, against `figma` = this host. */
const AsyncFn = Object.getPrototypeOf(async () => {}).constructor as new (...a: string[]) => (f: unknown) => Promise<Record<string, unknown>>;
const INPUT = Object.values(exampleBrands as Record<string, BrandInput>)[0];
const paste = async (id: string, budget?: number) => {
  const plans = plansOf(id);
  const h = host(plans);
  // The page port `placeOnPage` reaches through (`resolveComponentPage`): pages and dividers it creates are stubs in
  // one root list. The page switch is a no-op, so the payload builds on the shim's own `currentPage`, where the
  // runtime's reaction step then finds the set.
  const pages: any[] = [];
  const stub = (isPageDivider: boolean) => ({ name: isPageDivider ? '---' : 'Page', isPageDivider, children: [], appendChild() {} });
  Object.assign(h.api, {
    root: { ...h.api.root, get children() { return pages; }, insertChild: (i: number, c: unknown) => { const at = pages.indexOf(c); if (at >= 0) pages.splice(at, 1); pages.splice(i, 0, c); }, appendChild: (c: unknown) => { const at = pages.indexOf(c); if (at >= 0) pages.splice(at, 1); pages.push(c); } },
    createPage: () => { const p = stub(false); pages.push(p); return p; },
    createPageDivider: () => { const p = stub(true); pages.push(p); return p; },
    setCurrentPageAsync: async () => {},
    loadAllPagesAsync: async () => {},
    // The host's lookup returns the NODE, parent and all, which is how `readReactions` tells a sibling from a dangling
    // id. The shim's own answers components only, parentless, which would read every reaction as dangling.
    getNodeByIdAsync: async (id: string) => {
      const walk = (n: any, parent: any): any => {
        if (String(n.id) === id) return { id: n.id, name: n.name, parent };
        for (const c of (n.children ?? [])) { const f = walk(c, n); if (f) return f; }
        return null;
      };
      for (const top of h.page.children as any[]) { const f = walk(top, h.api.currentPage); if (f) return f; }
      return null;
    },
  });
  (globalThis as { figma?: unknown }).figma = h.api;
  // The chunk scripts' own step data is `{ def, chunk, chunks }`; the payloads are the engine's chunk bodies.
  const chunks = planSetChunks(plans, budget);
  const reports = [];
  for (const c of chunks) {
    const d = { step: 0, of: 0, label: id, def: id, chunk: c.index, chunks: c.total };
    reports.push(await runComponentChunk(pack(d), [(f: unknown) => new AsyncFn('figma', c.js)(f)]));
  }
  // Then the reactions step, with the data the generator writes into its script (`const __D=…;`, packed), so the test
  // runs the names `mcp-paste.ts` actually ships. Present only for a set in scope, and only after its last chunk.
  const scripts = componentScripts(INPUT, [id]).filter((s) => s.def === id);
  const at = scripts.findIndex((s) => s.kind === 'component-reactions');
  const lastChunk = scripts.map((s) => s.kind).lastIndexOf('component-chunk');
  if (at >= 0) reports.push(await runComponentReactions(JSON.parse(/^const __D=(.*);$/m.exec(scripts[at].js)![1])));
  return { reports, set: h.set(), total: chunks.length, order: at > lastChunk && lastChunk >= 0, sizes: scripts.map((s) => s.js.length) };
};

const plugin = async (id: string) => {
  const plans = plansOf(id);
  const h = host(plans);
  const built = await applyComponentPlan(plans, h.api);
  return { built, set: h.set() };
};

const T = (state: string) => `type=select, selection=unselected, size=medium, state=${state}`;
const C = (state: string) => `size=medium, state=${state}`;

const main = async () => {
  console.log('#2564 — the names codec');
  {
    const list = plansOf('button').map((p) => planComponentName(p));
    const packed = packNames(list);
    const back = unpackNames(JSON.parse(JSON.stringify(packed)));
    ok(back.length === list.length && back.every((n, i) => n === list[i]) && JSON.stringify(packed).length < 12_000,
      `#2564 packNames round-trips the button family's ${list.length} member names, in ${JSON.stringify(packed).length} chars (plain JSON: ${JSON.stringify(list).length})`);
    let refused = '';
    try { packNames(['a=1, b=2', 'b=2, a=1']); } catch (e) { refused = (e as Error).message; }
    ok(refused.includes('does not have the axes'), `#2564 packNames refuses names whose axes differ in order, rather than encode them lossily (${refused || 'accepted'})`);
  }

  for (const [id, want, lit] of [
    ['tag', [45, 18, 27], [
      [T('rest'), [`ON_HOVER→${T('hover')}`, `ON_PRESS→${T('pressed')}`]],
      [T('hover'), [`ON_PRESS→${T('pressed')}`]],
      [T('pressed'), []],
      [T('disabled'), []],
    ]],
    // A set with no pressed look: While pressing goes to the state its def names (#2428, `focus-visible`).
    ['code-input-cell', [28, 8, 12], [
      [C('rest'), [`ON_HOVER→${C('hover')}`, `ON_PRESS→${C('focus-visible')}`]],
      [C('hover'), [`ON_PRESS→${C('focus-visible')}`]],
      [C('filled'), []],
    ]],
  ] as [string, [number, number, number], [string, string[]][]][]) {
    console.log(`\n#2564 — ${id}`);
    const p = await plugin(id);
    const pc = counts(p.set);
    ok(JSON.stringify(pc) === JSON.stringify(want), `#2564 plugin path: ${id} carries ${want[2]} reactions on ${want[1]} of ${want[0]} members (got ${pc.join('/')})`);
    // `tag` is squeezed into several chunks, so the reactions must wait for the last one.
    let q: Awaited<ReturnType<typeof paste>> | undefined;
    try { q = await paste(id, id === 'tag' ? 24_000 : undefined); } catch (e) { ok(false, `#2564 paste path: ${id}'s chunk scripts run — THREW: ${(e as Error).message}`); continue; }
    const qc = counts(q.set);
    const misses = q.reports.flatMap((r) => [...(r.misses ?? []), ...(r.threw ? [`threw: ${r.threw}`] : [])]);
    ok(q.order, `#2564 paste path: ${id}'s reactions script comes after its last chunk script`);
    ok(JSON.stringify(qc) === JSON.stringify(want) && misses.length === 0,
      `#2564 paste path: ${id}, built in ${q.total} chunk(s), carries ${want[2]} reactions on ${want[1]} of ${want[0]} members (got ${qc.join('/')}; ${misses.length} misses${misses.length ? ` — ${misses.slice(0, 2).join('; ')}` : ''})`);
    const wrong = lit.flatMap(([m, rs]) => [['plugin', named(p.set, m)], ['paste', named(q!.set, m)]]
      .filter(([, got]) => JSON.stringify(got) !== JSON.stringify([...rs].sort())).map(([path, got]) => `${path} ${m}: ${(got as string[]).join(', ') || 'none'}, want ${rs.join(', ') || 'none'}`));
    ok(wrong.length === 0, `#2564 both paths: ${id}'s named members carry exactly the literal reactions (${wrong.length ? wrong.join('; ') : `${lit.length} members checked`})`);
  }

  console.log(`\n${failed ? `✗ ${failed} of ${executed} failed` : `✓ all passed — ${executed} assertions executed`}`);
  if (failed) process.exit(1);
};
main();
