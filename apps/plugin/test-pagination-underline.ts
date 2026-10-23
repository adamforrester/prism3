/**
 * PAGINATION'S UNDERLINE, MEASURED ON THE BUILT FILE (owner QA Q537, 2026-10-22).
 *
 * In the underline style the current page's line belongs under its number and nowhere else. A real file built from
 * the review build drew it under the 4, 5 and 6 cells at small and medium, and off-center under 5 at large. The def
 * said "as wide as the number" and every plan-level arm agreed: the underline was a frame that STRETCHED across a label
 * box that hugged the number. The host does not build that. A stretch under a hug turns the hug fixed at the width it
 * had then, and the first frame stretched was a childless one at `createFrame`'s 100px (`ShimOpts.fillFreezesHug`).
 *
 * So this suite reads no plan and no def field. It builds the `pagination-item` set through the real executor into the
 * shim, with that host rule on, the bound sizes at their real values, the emphasis weight wider than the regular one,
 * and the page number set to a two-digit "10" through its TEXT property, and measures two boxes the host laid out:
 * the number's text and the underline. EXPECTED is a literal: the underline's left and right edges are the number's,
 * it comes after the number down the column they share, and it stays inside its own cell, in every underline member at every size; in the border
 * style there is no underline at all. Sizes and styles are typed here, not read off the def's axes, so a def that
 * dropped one fails the count.
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
const STYLES = ['border', 'underline'];
// The current page's two states (call 7 A): rest and focus-visible.
const STATES = ['rest', 'focus-visible'];
// The bound sizes at their values in every emitted brand, in place of the shim's hash: a zero-height reserve and a
// zero-wide balance are zero, and the underline is 2px. The hash would make each 8 to 32px and hide a width.
const VAR_PX = { 'space/0': 0, 'border-width/thick': 2 };
const EPS = 0.5;
// The extra width, in px, the emphasis weight sets at in this host (any non-zero value tells the weights apart).
const EMPHASIS_ADVANCE = 5;
// A two-digit page: the number's width must move the underline with it.
const TWO_DIGITS = '10';

const def = componentDefs.find((d) => d.id === 'pagination-item');
ok(!!def, 'premise: pagination-item is registered');
if (!def) process.exit(1);

const project = (d: ComponentDef) => figmaAnatomySet(materializeForBrand(d, null), { swapTarget: 'FPO-default-icon' });
const plans = project(def);
const page: Page = { children: [] };
const shim = makeShim({
  vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
  comps: [], liveRoot: true, page, layoutModel: true, fillFreezesHug: true, varPx: VAR_PX,
  // The emphasis weight sets WIDER than the regular one, as on the host: without it every style measures alike, and an
  // underline sized by a regular-weight copy of the number would pass.
  textAdvance: Object.fromEntries([...new Set(plans.flatMap((p) => planTextStyles(p.root)))].map((st) => [st, /emphasis/.test(st) ? EMPHASIS_ADVANCE : 0])),
});
const build = (d: ComponentDef) => applyComponentPlan(project(d), shim as never, { emitAsComponents: d.figmaProperties?.emitAsComponents });
await prebuildDependencies(def, { defs: componentDefs, project, host: shim as never, build });
await build(def);

const set = page.children.find((c) => c.name === 'pagination-item' && c.type === 'COMPONENT_SET');
ok(!!set, 'premise: the build made the pagination-item set');
// THE PAGE NUMBER CHANGES, as the host does it: a TEXT property's new value reaches every text node wired to it. A copy
// of the number that is not wired to `label` keeps "1", and the underline it sizes stops matching the number.
const defsOf = (set?.componentPropertyDefinitions ?? {}) as Record<string, { type?: string }>;
const labelKey = Object.keys(defsOf).find((k) => k.split('#')[0] === 'label' && defsOf[k].type === 'TEXT');
ok(!!labelKey, `premise: the set carries a TEXT property named label (${Object.keys(defsOf).join(', ')})`);
let rewired = 0;
const rewrite = (n: Node): void => {
  if (n.type === 'TEXT' && (n.componentPropertyReferences as Record<string, string> | null)?.characters === labelKey) { n.characters = TWO_DIGITS; rewired++; }
  for (const k of (n.children as Node[] | undefined) ?? []) rewrite(k);
};
if (set) rewrite(set);
ok(rewired > 0, `premise: the label property reaches ${rewired} text nodes, now reading "${TWO_DIGITS}"`);
const members = ((set?.children as Node[] | undefined) ?? []);
const coordOf = (m: Node): Record<string, string> => Object.fromEntries(String(m.name).split(', ').map((kv) => kv.split('=')));
const named = (n: Node, name: string): Node | undefined =>
  n.name === name ? n : ((n.children as Node[] | undefined) ?? []).map((c) => named(c, name)).find(Boolean);
/** The box in the member's own space: each ancestor's x and y up to the member root. */
const boxIn = (n: Node, top: Node): { x: number; y: number; w: number; h: number } => {
  let x = 0, y = 0;
  for (let k: Node | null = n; k && k !== top; k = k.parent as Node | null) { x += (k.x as number) || 0; y += (k.y as number) || 0; }
  return { x, y, w: n.width as number, h: n.height as number };
};
/** Is `a` laid out after `b` down a column they share? The shim does not stack y inside a column, so this reads the
 *  host's own rule instead: in their nearest common VERTICAL ancestor, `a`'s branch comes after `b`'s. */
const below = (a: Node, b: Node): boolean => {
  const chain = (n: Node): Node[] => { const out: Node[] = []; for (let k: Node | null = n; k; k = k.parent as Node | null) out.push(k); return out; };
  const ca = chain(a), cb = chain(b);
  const common = ca.find((k) => cb.includes(k));
  if (!common || common.layoutMode !== 'VERTICAL') return false;
  const kids = (common.children as Node[]) ?? [];
  return kids.indexOf(ca[ca.indexOf(common) - 1]) > kids.indexOf(cb[cb.indexOf(common) - 1]);
};
const f = (b: { x: number; w: number }): string => `[${b.x}, ${b.x + b.w}]`;

const current = members.filter((m) => coordOf(m).type === 'page' && coordOf(m).selection === 'selected');
const seen = new Set(current.map((m) => `${coordOf(m).style}|${coordOf(m).size}|${coordOf(m).state}`));
const want = STYLES.flatMap((st) => SIZES.flatMap((sz) => STATES.map((s) => `${st}|${sz}|${s}`)));
ok(want.every((k) => seen.has(k)) && current.length === want.length,
  `premise: the current page is built in ${want.length} members, every style × size × state (${current.length} built; missing ${want.filter((k) => !seen.has(k)).join(', ') || 'none'})`);

const off: string[] = [];
let measured = 0;
for (const m of current) {
  const c = coordOf(m);
  const label = named(m, 'label');
  const bar = named(m, 'underline');
  if (c.style === 'border') {
    if (bar) off.push(`${m.name}: an underline in the border style`);
    continue;
  }
  if (!label || !bar) { off.push(`${m.name}: ${label ? '' : 'no number '}${bar ? '' : 'no underline'}`); continue; }
  const n = boxIn(label, m), u = boxIn(bar, m);
  measured++;
  if (label.characters !== TWO_DIGITS) off.push(`${m.name}: the number reads "${String(label.characters)}", not the property's "${TWO_DIGITS}"`);
  else if (!(n.w > 0)) off.push(`${m.name}: the number measures ${n.w} wide, so there is nothing to compare`);
  else if (Math.abs(u.x - n.x) > EPS || Math.abs(u.x + u.w - (n.x + n.w)) > EPS)
    off.push(`${m.name}: underline ${f(u)}, number ${f(n)}`);
  else if (!below(bar, label)) off.push(`${m.name}: the underline is not after the number in a column they share`);
  else if (u.x < -EPS || u.x + u.w > (m.width as number) + EPS) off.push(`${m.name}: underline ${f(u)} leaves its cell [0, ${m.width}]`);
}
ok(measured === SIZES.length * STATES.length && off.length === 0,
  `#2665 Q537 the current page's underline is under its number only: in the underline style its left and right edges are the number's and it comes after it down their column, inside its own cell, at every size and state; in the border style there is none (${measured} measured, ${off.length} off — ${off.slice(0, 3).join('; ') || 'none'})`);

// The underline must not widen its cell either: the current page is as wide as an unselected page at the same size and
// state. A bar that matches the number can still sit in a cell grown past it (review N2 on #2796).
const wider: string[] = [];
let paired = 0;
for (const m of current) {
  const c = coordOf(m);
  // An unselected page has no underline to vary, so the style may not be one of its axes: match it when it is.
  const twins = members.filter((t) => { const k = coordOf(t); return k.type === 'page' && k.selection === 'unselected' && k.size === c.size && k.state === c.state; });
  const twin = twins.find((t) => coordOf(t).style === c.style) ?? twins[0];
  if (!twin) { wider.push(`${m.name}: no unselected page to compare`); continue; }
  paired++;
  if (Math.abs((m.width as number) - (twin.width as number)) > EPS) wider.push(`${m.name}: ${m.width} wide, the unselected page ${twin.width}`);
}
ok(paired === current.length && wider.length === 0,
  `#2665 Q537 the current page's cell is as wide as an unselected page at the same size and state (${paired} paired, ${wider.length} off — ${wider.slice(0, 3).join('; ') || 'none'})`);

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
