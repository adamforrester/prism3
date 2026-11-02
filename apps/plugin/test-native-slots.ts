/**
 * NATIVE FIGMA SLOTS (#2417) — a `box` part declaring `contentSlot` is built as Figma's own SLOT node, the region a
 * designer fills with their own content on an instance, in place.
 *
 *   npx tsx apps/plugin/test-native-slots.ts
 *
 * Built by the batch executor (`applyComponentPlan`) into the in-memory host (`component-shim.ts`), whose SLOT model is
 * what a real host was measured to do (the PR records the probes): `createSlot` is a COMPONENT's method, and every
 * member's slot of one name merges into one SLOT property on the set at the combine, referenced as `slotContentId`.
 *
 * The subject is a TEST-ONLY def: Tag with its `dismiss` cell declared a slot. A real cell, present on the dismissible
 * members only, so the set mixes members with the slot and members without it, as Accordion's will (a slot in the
 * expanded members). The expectations are literals and the host's own nodes, never the plan read back as its own
 * oracle (docs/34); `diffAnatomy` is the read-back, which compares the plan to what the host holds.
 *
 * Mutations, each failing by name:
 *   · `toSlots` not called after the conversion → `slots/fresh is a SLOT`, `slots/property`;
 *   · `toSlots` not called after an in-place member build → `slots/gained on update`;
 *   · the miss for a host without `createSlot` dropped → `slots/no host support named`.
 */
import { figmaAnatomySet, planComponentName, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { diffAnatomy } from '@prism3/engine/anatomy-readback';
import type { HostNode, ReadPorts } from '@prism3/engine/anatomy-readback';
import type { ComponentDef } from '@prism3/engine/component-schema';
import { applyComponentPlan } from './src/write-components';
import { makeShim, type Node, type Page } from './component-shim';

let failed = 0, executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const SWAP_TARGET = 'FPO-default-icon';
const tag = componentDefs.find((d) => d.id === 'tag')!;
/** Tag with its dismiss cell declared a native slot, and nothing else changed. */
const slotted: ComponentDef = { ...tag, anatomy: { ...tag.anatomy!, parts: { ...tag.anatomy!.parts,
  dismiss: { ...tag.anatomy!.parts.dismiss, contentSlot: true, children: [...(tag.anatomy!.parts.dismiss.children ?? []), 'hint'] },
  // A slot's placeholder TEXT is literal copy (Figma refuses a property reference on a slot sublayer, measured).
  hint: { kind: 'text', type: tag.anatomy!.parts.label.type, characters: 'Drop content here' },
} } };
const planComps = (n: { swapTarget?: string; nestTarget?: string; children: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []), ...(n.children as (typeof n)[]).flatMap(planComps),
];
const host = (plans: AnatomyPlan[], extra: Record<string, unknown> = {}) => {
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set(plans.flatMap((p) => planComps(p.root)))],
    page, liveRoot: true, identities: true, ...extra,
  }) as any;
  return { page, api };
};
const portsOf = async (api: any): Promise<ReadPorts> => {
  const vars = await api.variables.getLocalVariablesAsync();
  const styles = [...await api.getLocalTextStylesAsync(), ...await api.getLocalEffectStylesAsync()];
  const v = new Map(vars.map((x: { id: string; name: string }) => [x.id, x.name])), st = new Map(styles.map((x: { id: string; name: string }) => [x.id, x.name]));
  return { varName: (id) => (v.get(id) as string) ?? null, styleName: (id) => (st.get(id) as string) ?? null };
};
const all = (n: Node): Node[] => [n, ...(((n.children as Node[]) ?? []).flatMap(all))];
const setOf = (page: Page): Node => page.children.find((n) => n.type === 'COMPONENT_SET') as Node;

console.log('native Figma slots (#2417) — against the in-memory shim\n');

console.log('fresh build');
{
  const plans = figmaAnatomySet(slotted, { swapTarget: SWAP_TARGET });
  const withSlot = plans.filter((p) => JSON.stringify(p.root).includes('"type":"CONTENT_SLOT"'));
  ok(withSlot.length > 0 && withSlot.length < plans.length, `premise: some of Tag's ${plans.length} members carry the slot (${withSlot.length}), some do not`);
  const { page, api } = host(plans);
  const res = await applyComponentPlan(plans, api, {});
  ok(res.misses.length === 0, `slots/clean: the build reports no miss (${res.misses.slice(0, 2).join(' | ')})`);
  const set = setOf(page);
  const members = set.children as Node[];
  const slots = members.flatMap((m) => all(m).filter((n) => n.name === 'dismiss'));
  ok(slots.length === withSlot.length && slots.every((n) => n.type === 'SLOT'),
    `slots/fresh is a SLOT: each member's dismiss cell is Figma's own SLOT node (${slots.length} cells, types ${[...new Set(slots.map((n) => n.type))].join(', ')})`);
  ok(slots.every((n) => ((n.children as Node[]) ?? []).map((c) => String(c.name)).join() === 'dismissGlyph,hint'),
    `slots/default content: each slot holds its default content, the dismiss glyph and a placeholder text (${[...new Set(slots.map((n) => ((n.children as Node[]) ?? []).map((c) => String(c.name)).join()))].join(' / ')})`);
  const hints = slots.map((n) => ((n.children as Node[]) ?? []).find((c) => c.name === 'hint'));
  ok(hints.every((t) => t?.type === 'TEXT' && t.characters === 'Drop content here' && !(t.componentPropertyReferences as Record<string, string> | null)?.characters),
    `slots/literal text: the slot's placeholder text carries its own copy and no property reference (${JSON.stringify([...new Set(hints.map((t) => t?.characters))])})`);
  const placed = members.filter((m) => all(m).some((n) => n.name === 'dismiss')).every((m) => {
    const p = withSlot.find((q) => planComponentName(q) === m.name)!;
    const parentPlan = (function find(n: any): any { return n.children?.some((c: any) => c.name === 'dismiss') ? n : n.children?.map(find).find(Boolean); })(p.root);
    const parentHost = all(m).find((n) => ((n.children as Node[]) ?? []).some((c) => c.name === 'dismiss'))!;
    return ((parentHost.children as Node[]).map((c) => String(c.name))).join() === parentPlan.children.map((c: any) => c.name).join();
  });
  ok(placed, 'slots/order: the slot takes its cell\'s place among its siblings, in the plan\'s order');
  const defs = (set as any).componentPropertyDefinitions as Record<string, { type: string }>;
  const slotDefs = Object.entries(defs).filter(([, d]) => d.type === 'SLOT');
  ok(slotDefs.length === 1 && slotDefs[0][0].split('#')[0] === 'dismiss' && slots.every((n) => (n.componentPropertyReferences as Record<string, string>)?.slotContentId === slotDefs[0][0]),
    `slots/property: the set holds ONE SLOT property, dismiss, and every member's slot references it (${slotDefs.map(([k]) => k).join(', ')})`);
  const div = diffAnatomy(plans, members as unknown as HostNode[], planComponentName, await portsOf(api), {});
  ok(div.length === 0, `slots/read back: the read-back finds the slots as the plan has them (${div.length} divergence(s)${div.length ? `: ${JSON.stringify(div[0]).slice(0, 200)}` : ''})`);
}

console.log('\nan update that gains the slot');
{
  // A set built before the cell was a slot, then updated in place: the cell becomes a SLOT, and its member keeps its id.
  const before = figmaAnatomySet(tag, { swapTarget: SWAP_TARGET });
  const after = figmaAnatomySet(slotted, { swapTarget: SWAP_TARGET });
  const { page, api } = host(after);
  await applyComponentPlan(before, api, {});
  const set = setOf(page);
  const ids = new Map((set.children as Node[]).map((m) => [String(m.name), String(m.id)]));
  ok((set.children as Node[]).flatMap((m) => all(m).filter((n) => n.name === 'dismiss')).every((n) => n.type === 'FRAME'), 'premise: the set was built with dismiss as a plain frame');
  const members = new Map((set.children as Node[]).map((m) => [String(m.name), { keep: new Set<string>() }]));
  const res = await applyComponentPlan(after, api, { update: { members, retained: new Set() } });
  const cells = (set.children as Node[]).flatMap((m) => all(m).filter((n) => n.name === 'dismiss'));
  const kept = (set.children as Node[]).every((m) => ids.get(String(m.name)) === String(m.id));
  ok(cells.length > 0 && cells.every((n) => n.type === 'SLOT') && kept,
    `slots/gained on update: updated in place, each dismiss cell becomes a SLOT and every member keeps its id (${[...new Set(cells.map((n) => n.type))].join(', ')}; ids ${kept ? 'kept' : 'changed'}; ${res.misses.slice(0, 1).join('')})`);
  const slotDefs = Object.entries((set as any).componentPropertyDefinitions as Record<string, { type: string }>).filter(([, d]) => d.type === 'SLOT');
  ok(slotDefs.length === 1, `slots/gained property: the set then holds one SLOT property (${slotDefs.map(([k]) => k).join(', ') || 'none'})`);
}

console.log('\na host without native slots');
{
  const plans = figmaAnatomySet(slotted, { swapTarget: SWAP_TARGET });
  const { page, api } = host(plans, { looseHost: 'patches createComponentFromNode for a host without native slots' });
  const convert = api.createComponentFromNode;
  api.createComponentFromNode = (n: Node) => { const c = convert(n); delete (c as Record<string, unknown>).createSlot; return c; };
  const res = await applyComponentPlan(plans, api, {});
  const cells = (setOf(page).children as Node[]).flatMap((m) => all(m).filter((n) => n.name === 'dismiss'));
  ok(cells.length > 0 && cells.every((n) => n.type === 'FRAME') && res.misses.some((m) => /dismiss\.slot -> NOT MADE/.test(m)),
    `slots/no host support named: without createSlot the cell stays a frame and the build says so (${res.misses.find((m) => /slot/.test(m)) ?? 'no slot miss'})`);
}

console.log('\nnested instances in a slot keep their own properties and reactions (#2649)');
{
  // Tab and Tabs built into one file, Tab first, so Tabs' `items` slot holds instances of the real Tab set. The tab a
  // slot item points at carries its own prototype reactions (#2466: rest → hover, rest and hover → pressed); an
  // instance of it takes them from its main, so the build must point each item at the right member and write nothing
  // on the item that would stand in for its main's. Expected values are literals (the selection of each item, the
  // two triggers), never read off the plans.
  const tabDef = componentDefs.find((d) => d.id === 'tab-item')!, tabsDef = componentDefs.find((d) => d.id === 'tabs')!;
  const tabPlans = figmaAnatomySet(tabDef, { swapTarget: SWAP_TARGET }), tabsPlans = figmaAnatomySet(tabsDef, { swapTarget: SWAP_TARGET });
  const both = [...tabPlans, ...tabsPlans];
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set(both.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
    styles: [...new Set(both.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(both.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set(both.flatMap((p) => planComps(p.root)))].filter((c) => c !== 'tab-item'),
    page, liveRoot: true, identities: true,
  }) as any;
  const r1 = await applyComponentPlan(tabPlans, api, {});
  const r2 = await applyComponentPlan(tabsPlans, api, {});
  ok(r1.misses.length === 0 && r2.misses.length === 0, `nested/clean: Tab and Tabs build with no miss (${[...r1.misses, ...r2.misses].slice(0, 2).join(' | ')})`);
  const sets = page.children.filter((n) => n.type === 'COMPONENT_SET');
  const tabSet = sets.find((n) => n.name === 'tab-item')!, tabsSet = sets.find((n) => n.name === 'tabs')!;
  const tabMember = (name: string) => (tabSet.children as Node[]).find((m) => m.name === name);
  const bad: string[] = [];
  for (const m of tabsSet.children as Node[]) {
    const slot = all(m).find((n) => n.name === 'items');
    const kids = (slot?.children as Node[]) ?? [];
    if (slot?.type !== 'SLOT' || kids.length !== 3) { bad.push(`${m.name}: items ${String(slot?.type)} holding ${kids.length}`); continue; }
    kids.forEach((k, i) => {
      const main = (k as { mainComponent?: { name: string; parent?: { name: string } } }).mainComponent;
      const want = i === 0 ? 'selected' : 'unselected';
      if (k.type !== 'INSTANCE' || main?.parent?.name !== 'tab-item' || !new RegExp(`(^|, )selection=${want}(,|$)`).test(String(main?.name))) bad.push(`${m.name}/${k.name}: ${String(main?.parent?.name)} ${String(main?.name)}`);
      const rx = (k as { reactions?: unknown[] }).reactions ?? [];
      if (rx.length) bad.push(`${m.name}/${k.name}: ${rx.length} reaction(s) written on the item itself`);
      const target = main ? tabMember(main.name) : undefined;
      const triggers = ((target as { reactions?: { trigger?: { type?: string } }[] } | undefined)?.reactions ?? []).map((x) => x.trigger?.type).sort().join(',');
      if (triggers !== 'ON_HOVER,ON_PRESS') bad.push(`${m.name}/${k.name}: its tab carries ${triggers || 'no'} reactions`);
    });
  }
  ok(bad.length === 0, `nested/properties and reactions: every Tabs member's "items" slot holds three Tab instances, the first selected, each pointing at a Tab member that carries its own hover and press reactions, none written on the item (${bad.slice(0, 3).join(' | ') || 'all'})`);
}

console.log(`\n${executed - failed}/${executed} native-slot assertions passed.`);
if (failed) process.exit(1);
