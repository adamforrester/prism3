/**
 * TABS: THE SELECTED INDICATOR OVERLAPS THE BASELINE, MEASURED ON THE BUILT FILE (#3344, owner decision 2026-11-02).
 *
 * A tab's 2px bar and the tab list's 1px baseline share their bottom edge, and the bar paints over the line, as Prism 2
 * drew them. Until #3344 the list kept a 1px inset under its tabs, so the bar sat ON the line: two lines stacked.
 *
 * So this suite reads no plan and no def field. It builds the `tabs` set, and the `tab-item` set it nests, through the
 * real executor into the shim with its layout model on, and the two thicknesses at their real values (1px and 2px, not
 * the shim's hash). Then it measures, in every member, the boxes the host laid out: the baseline, pinned across the
 * list's foot, and each tab's indicator, pinned across the tab's foot, read through the tab instance's main component at
 * the instance's position (the shim does not clone an instance's children; the host draws the main's layout there).
 *
 * EXPECTED is literal: in every one of the six members (three sizes × two alignments, typed here, not read off the
 * def), every tab's indicator bottom equals the baseline's bottom, the indicator is 2px and the baseline 1px, and the
 * list draws the baseline BEFORE the row of tabs, so every indicator paints over it.
 *
 * Mutation: put back the stacked layout (the list's `children` back to items-then-baseline, its 1px `blockEnd` inset
 * back) → `#3344 tabs indicator bottom` and `#3344 tabs paint order` both fail.
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { applyComponentPlan } from './src/write-components';
import { makeShim } from './component-shim';
import type { Node, Page } from './component-shim';
import { materializeForBrand } from './src/brand-def';
import { prebuildDependencies } from './src/build-deps';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

const SIZES = ['medium', 'small', 'large'];
const ALIGNMENTS = ['start', 'center'];
const TABS_PER_MEMBER = 3;
// The two thicknesses at their values in every emitted brand, in place of the shim's hash, so a 1px stack is a 1px
// miss and "the bar is the thicker one" is measured: the baseline is the hairline, the bar the thick width.
const BASELINE_PX = 1;
const BAR_PX = 2;
const VAR_PX = { 'space/0': 0, 'border-width/hairline': BASELINE_PX, 'border-width/thick': BAR_PX };
const EPS = 0.01;

const tabsDef = componentDefs.find((d) => d.id === 'tabs');
ok(!!tabsDef, 'premise: tabs is registered');
if (!tabsDef) process.exit(1);

const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: 'FPO-default-icon' });
const every = [tabsDef, ...componentDefs.filter((d) => d.id === 'tab-item' || d.id === 'badge' || d.id === 'focus-ring' || d.id === 'icon')]
  .flatMap((d) => project(d));
const page: Page = { children: [] };
const shim = makeShim({
  vars: [...new Set(every.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  styles: [...new Set(every.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(every.flatMap((p) => planEffectStyles(p.root)))],
  comps: [], liveRoot: true, page, layoutModel: true, fillFreezesHug: true, varPx: VAR_PX,
});
const build = (d: ComponentDef) => applyComponentPlan(project(d), shim as never, { emitAsComponents: d.figmaProperties?.emitAsComponents });
await prebuildDependencies(tabsDef, { defs: componentDefs, project, host: shim as never, build });
await build(tabsDef);

const set = page.children.find((c) => c.name === 'tabs' && c.type === 'COMPONENT_SET');
ok(!!set, 'premise: the build made the tabs set');
const members = ((set?.children as Node[] | undefined) ?? []);
const coordOf = (m: Node): Record<string, string> => Object.fromEntries(String(m.name).split(', ').map((kv) => kv.split('=')));
const seen = new Set(members.map((m) => `${coordOf(m).size}|${coordOf(m).alignment}`));
const want = SIZES.flatMap((s) => ALIGNMENTS.map((a) => `${s}|${a}`));
ok(members.length === want.length && want.every((k) => seen.has(k)),
  `premise: the tabs set is built in ${want.length} members, every size × alignment (${members.length} built; missing ${want.filter((k) => !seen.has(k)).join(', ') || 'none'})`);

const named = (n: Node, name: string): Node | undefined =>
  n.name === name ? n : ((n.children as Node[] | undefined) ?? []).map((c) => named(c, name)).find(Boolean);
const instances = (n: Node): Node[] =>
  ((n.children as Node[] | undefined) ?? []).flatMap((c) => (c.type === 'INSTANCE' ? [c] : instances(c)));
/** The box in `top`'s space: each ancestor's x and y up to it. */
const boxIn = (n: Node, top: Node): { x: number; y: number; w: number; h: number } => {
  let x = 0, y = 0;
  for (let k: Node | null = n; k && k !== top; k = k.parent as Node | null) { x += (k.x as number) || 0; y += (k.y as number) || 0; }
  return { x, y, w: n.width as number, h: n.height as number };
};

const off: string[] = [];
const order: string[] = [];
let measured = 0;
for (const m of members) {
  const base = named(m, 'baseline');
  const tabs = instances(m).filter((t) => (t._main as Node | undefined) && named(t._main as Node, 'indicator'));
  if (!base) { off.push(`${m.name}: no baseline`); continue; }
  if (tabs.length !== TABS_PER_MEMBER) { off.push(`${m.name}: ${tabs.length} tabs with an indicator, not ${TABS_PER_MEMBER}`); continue; }
  const b = boxIn(base, m);
  if (Math.abs(b.h - BASELINE_PX) > EPS) off.push(`${m.name}: the baseline is ${b.h}px, not ${BASELINE_PX}`);
  // PAINT ORDER: in the list root, the baseline's branch comes before the branch holding the tabs, so the tabs (and
  // their bars) draw after it, over it.
  const kids = (m.children as Node[]) ?? [];
  const branchOf = (n: Node): Node => { let k = n; while (k.parent && k.parent !== m) k = k.parent as Node; return k; };
  for (const t of tabs) {
    if (!(kids.indexOf(branchOf(base)) < kids.indexOf(branchOf(t)))) order.push(`${m.name}/${t.name}: drawn before the baseline (root order ${kids.map((k) => k.name).join(', ')})`);
    const main = t._main as Node;
    const bar = named(main, 'indicator')!;
    const at = boxIn(t, m), u = boxIn(bar, main);
    measured++;
    const barBottom = at.y + u.y + u.h, baseBottom = b.y + b.h;
    if (Math.abs(u.h - BAR_PX) > EPS) off.push(`${m.name}/${t.name}: the bar is ${u.h}px, not ${BAR_PX}`);
    else if (Math.abs(barBottom - baseBottom) > EPS) off.push(`${m.name}/${t.name}: bar bottom ${barBottom}, baseline bottom ${baseBottom}`);
  }
}
ok(measured === want.length * TABS_PER_MEMBER && off.length === 0,
  `#3344 tabs indicator bottom: in every member, every tab's ${BAR_PX}px indicator ends on the ${BASELINE_PX}px baseline's bottom edge (${measured} measured, ${off.length} off — ${off.slice(0, 3).join('; ') || 'none'})`);
ok(measured === want.length * TABS_PER_MEMBER && order.length === 0,
  `#3344 tabs paint order: in every member the list draws the baseline before the tabs, so every indicator paints over it (${order.length} off — ${order.slice(0, 2).join('; ') || 'none'})`);

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
