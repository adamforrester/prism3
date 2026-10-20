/**
 * NATIVE SLOT CONSTRAINTS (#2646) — a `contentSlot` part's `slotSettings` and `preferred`, written onto the set's SLOT
 * property on Build and on Update, and read back off the host.
 *
 *   npx tsx apps/plugin/test-slot-constraints.ts
 *
 * Two subjects. The CORPUS: every native slot a committed def declares, against a literal table of what each slot is
 * meant to carry, written here and never read off the def (docs/34). A slot added to a def and not to the table fails
 * by name, so a new slot (Dialog's body, Password field's) arrives as a decision rather than as a default. The
 * MECHANISM: a test-only def, Tag with its dismiss cell a slot (as `test-native-slots.ts` builds it), constrained to 1
 * to 2 children, preferred-only, preferring Badge. Built by the batch executor (`applyComponentPlan`) into the
 * in-memory host (`component-shim.ts`), whose `editComponentProperty` and `SlotNode.limitViolations` follow the
 * plugin typings (1.141): settings on a SLOT only, preferred values by component key, violations counted off the
 * slot's own children.
 *
 * Mutations, each failing by name:
 *   · a slot's settings changed in a def (Accordion's panel given `minChildren: 1`) → `corpus/accordion.content`;
 *   · min above max in a def → `corpus/accordion.content` here, and `test.ts`'s `#2646 validator: min above max`;
 *   · an unknown preferred def in a def → `corpus/projects` (the projection throws, naming it);
 *   · the preferred list dropped from the executor's write → `constraints/written`, `constraints/read back`;
 *   · the miss for a preferred def not in the file dropped → `constraints/missing preferred named`;
 *   · the clear on Update dropped (the `hostHas` arm) → `constraints/cleared on update`.
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

console.log('native slot constraints (#2646) — against the in-memory shim\n');

// ── THE CORPUS, against literals ─────────────────────────────────────────────────────────────────────────────
// What each committed native slot carries. Every row is a DRAFT owner item until the owner approves it (#2646).
const EXPECTED: Record<string, { slotSettings?: Record<string, unknown>; preferred?: string[]; preferredWhenBuilt?: string[] }> = {
  // Open: a section holds whatever its content is, so no limit, no preferred component, the placeholder shown.
  'accordion.content': {},
  // Repeating items (#2649, owner decision Q307 A): at least one, the ceiling where one means something, only the item.
  'checkbox-group.items': { slotSettings: { minChildren: 1, allowPreferredValuesOnly: true }, preferred: ['checkbox-row'] },
  'radio-group.items': { slotSettings: { minChildren: 1, allowPreferredValuesOnly: true }, preferred: ['radio-row'] },
  'tabs.items': { slotSettings: { minChildren: 1, maxChildren: 6, allowPreferredValuesOnly: true }, preferred: ['tab'] },
  'list.items': { slotSettings: { minChildren: 1, allowPreferredValuesOnly: true }, preferred: ['list-item'] },
  'segmented-control.items': { slotSettings: { minChildren: 1, maxChildren: 5, allowPreferredValuesOnly: true }, preferred: ['segmented-control-segment'] },
  // Open (#2609, as built): the body holds whatever the dialog needs — text or any components — so no limit and no
  // preferred component. The footer's actions are the nested Button group's slot (#2661), its row below.
  'dialog.body': {},
  // Constrained (#2666, the approved proposal's properties table): at least two steps, an ancestor and the current page,
  // and BreadcrumbItem the only component the slot offers.
  'breadcrumbs.items': { slotSettings: { minChildren: 2, allowPreferredValuesOnly: true }, preferred: ['breadcrumb-item'] },
  // Open (#2579, as built): the body holds the message, a link or a short list, so no limit and no preferred component.
  'banner.body': {},
  // The Button group's buttons (#2661, owner decisions Q363.4 A and Q363.6 A): one to three, the Button family only, the
  // primary Button required, the Destructive and Neutral families offered when the file has them (Q386).
  'button-group.items': { slotSettings: { minChildren: 1, maxChildren: 3, allowPreferredValuesOnly: true }, preferred: ['button'], preferredWhenBuilt: ['button-destructive', 'button-neutral'] },
  // At least one item (#2665, owner call 4 A), Pagination.Item preferred and preferred-only (owner decision Q394 A on
  // #2783: a slot item is unprefixed and offered first, the Breadcrumbs shape).
  'pagination.items': { slotSettings: { minChildren: 1, allowPreferredValuesOnly: true }, preferred: ['pagination-item'] },
};
console.log('the corpus');
{
  const found = componentDefs.flatMap((d) => Object.entries(d.anatomy?.parts ?? {}).filter(([, p]) => p.contentSlot).map(([n, p]) => ({ key: `${d.id}.${n}`, def: d, part: p })));
  ok(found.length > 0, `corpus/floor: the registry declares at least one native slot (${found.length}) — an empty corpus makes every row below vacuous`);
  const unlisted = found.filter((f) => !(f.key in EXPECTED)).map((f) => f.key);
  const stale = Object.keys(EXPECTED).filter((k) => !found.some((f) => f.key === k));
  ok(unlisted.length === 0 && stale.length === 0,
    `corpus/represented: every native slot in the registry has a row here, and every row a slot (${unlisted.length ? `UNLISTED ${unlisted.join(', ')} — add its constraints decision` : ''}${stale.length ? ` STALE ${stale.join(', ')}` : ''}${!unlisted.length && !stale.length ? found.map((f) => f.key).join(', ') : ''})`);
  for (const f of found) {
    const want = EXPECTED[f.key];
    if (!want) continue;
    const got = { ...(f.part.slotSettings ? { slotSettings: f.part.slotSettings } : {}), ...(f.part.preferred ? { preferred: [...f.part.preferred] } : {}), ...(f.part.preferredWhenBuilt ? { preferredWhenBuilt: [...f.part.preferredWhenBuilt] } : {}) };
    ok(JSON.stringify(got) === JSON.stringify(want), `corpus/${f.key}: declares ${JSON.stringify(want)} (the def holds ${JSON.stringify(got)})`);
  }
  // And each builds: the projection resolves every preferred id against the registry, and throws naming a bad one.
  const threw = found.flatMap((f) => { try { figmaAnatomySet(f.def, { swapTarget: SWAP_TARGET }); return []; } catch (err) { return [`${f.def.id}: ${(err as Error).message}`]; } });
  ok(threw.length === 0, `corpus/projects: every def with a native slot projects (${threw[0] ?? 'all did'})`);
}

const tag = componentDefs.find((d) => d.id === 'tag')!;
const slotted = (extra: Record<string, unknown> = {}): ComponentDef => ({ ...tag, anatomy: { ...tag.anatomy!, parts: { ...tag.anatomy!.parts,
  dismiss: { ...tag.anatomy!.parts.dismiss, contentSlot: true, ...extra },
} } });
const CONSTRAINED = { slotSettings: { minChildren: 1, maxChildren: 2, allowPreferredValuesOnly: true }, preferred: ['badge'] };
const planComps = (n: { swapTarget?: string; nestTarget?: string; children: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []), ...(n.children as (typeof n)[]).flatMap(planComps),
];
const BADGE = { name: 'badge', type: 'COMPONENT_SET' as const, variants: ['tone=neutral'] };
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
const setOf = (page: Page): Node => page.children.find((n) => n.type === 'COMPONENT_SET') as Node;
const slotDef = (page: Page): Record<string, unknown> | undefined =>
  Object.values(((setOf(page) as any).componentPropertyDefinitions ?? {}) as Record<string, Record<string, unknown>>).find((d) => d.type === 'SLOT');
const all = (n: Node): Node[] => [n, ...(((n.children as Node[]) ?? []).flatMap(all))];
const portsOf = async (api: any): Promise<ReadPorts> => {
  const vars = await api.variables.getLocalVariablesAsync();
  const styles = [...await api.getLocalTextStylesAsync(), ...await api.getLocalEffectStylesAsync()];
  const v = new Map(vars.map((x: { id: string; name: string }) => [x.id, x.name])), st = new Map(styles.map((x: { id: string; name: string }) => [x.id, x.name]));
  const keyed = [...api.root.findAllWithCriteria({ types: ['COMPONENT_SET'] }), ...api.root.findAllWithCriteria({ types: ['COMPONENT'] })] as { name: string; key?: string }[];
  const k = new Map(keyed.filter((c) => c.key).map((c) => [String(c.key), c.name]));
  return { varName: (id) => (v.get(id) as string) ?? null, styleName: (id) => (st.get(id) as string) ?? null, componentName: (key) => k.get(key) ?? null };
};

console.log('\nthe accordion, built: an open slot is left alone');
{
  const plans = figmaAnatomySet(componentDefs.find((d) => d.id === 'accordion')!, { swapTarget: SWAP_TARGET });
  const { page, api } = host(plans);
  const res = await applyComponentPlan(plans, api, {});
  const d = slotDef(page);
  ok(!!d && d.slotSettings === undefined && d.preferredValues === undefined && !res.misses.some((m) => /slotSettings|preferred/.test(m)),
    `constraints/open untouched: the accordion's SLOT property is written no constraint and no preferred value (${JSON.stringify(d)})`);
}

console.log('\na constrained slot, built with its preferred set in the file');
{
  const plans = figmaAnatomySet(slotted(CONSTRAINED), { swapTarget: SWAP_TARGET });
  const { page, api } = host(plans, { fileNodes: [BADGE] });
  const res = await applyComponentPlan(plans, api, {});
  ok(res.misses.length === 0, `constraints/clean: the build reports no miss (${res.misses.slice(0, 2).join(' | ')})`);
  const d = slotDef(page);
  ok(JSON.stringify(d?.slotSettings) === '{"minChildren":1,"maxChildren":2,"allowPreferredValuesOnly":true,"displayEmptyByDefault":false}'
    && JSON.stringify(d?.preferredValues) === '[{"type":"COMPONENT_SET","key":"SK:badge"}]',
    `constraints/written: the SLOT property holds 1 to 2 children, preferred-only, and Badge by its set's key (${JSON.stringify(d?.slotSettings)} ${JSON.stringify(d?.preferredValues)})`);
  const members = setOf(page).children as Node[];
  const div = diffAnatomy(plans, members as unknown as HostNode[], planComponentName, await portsOf(api), {});
  ok(div.length === 0, `constraints/read back: the read-back finds each slot's constraints and preferred set as the plan has them (${div.length} divergence(s)${div.length ? `: ${JSON.stringify(div[0]).slice(0, 240)}` : ''})`);
  // WHAT A DESIGNER SEES, off the slot node: its default content (the dismiss glyph, an icon instance) is one child, so
  // within the count, and not Badge, so flagged under preferred-only. Then too many, none, and Badge alone.
  const slot = members.flatMap((m) => all(m)).find((n) => n.type === 'SLOT')!;
  const v = (): string => JSON.stringify(slot.limitViolations);
  ok(v() === '["HAS_NON_PREFERRED"]', `constraints/violations default: the default content is within the count and not preferred (${v()})`);
  const kids = slot.children as Node[];
  const saved = kids.splice(0, kids.length);
  const mk = (): Node => { const f = api.createFrame() as Node; f.parent = slot; return f; };
  kids.push(mk(), mk(), mk());
  ok(v() === '["ABOVE_MAX","HAS_NON_PREFERRED"]', `constraints/violations above max: three frames read ABOVE_MAX and HAS_NON_PREFERRED (${v()})`);
  kids.splice(0, kids.length);
  ok(v() === '["BELOW_MIN"]', `constraints/violations below min: an empty slot reads BELOW_MIN (${v()})`);
  const badgeMember = (api.root.findAllWithCriteria({ types: ['COMPONENT'] }) as { name: string; createInstance: () => Node }[]).find((c) => c.name === 'tone=neutral')!;
  const inst = badgeMember.createInstance(); inst.parent = slot; kids.push(inst);
  ok(v() === '[]', `constraints/violations preferred: one Badge instance satisfies the slot (${v()})`);
  kids.splice(0, kids.length, ...saved);
}

console.log('\na constrained slot, its preferred set not in the file');
{
  const plans = figmaAnatomySet(slotted(CONSTRAINED), { swapTarget: SWAP_TARGET });
  const { page, api } = host(plans);
  const res = await applyComponentPlan(plans, api, {});
  ok(res.misses.some((m) => m === 'property dismiss.preferred -> badge (not in this file — build badge first, then rebuild this one; until then the slot does not offer it)'),
    `constraints/missing preferred named: the build names Badge as not in the file (${JSON.stringify(res.misses.filter((m) => /dismiss\./.test(m)))})`);
  const d = slotDef(page);
  ok(res.misses.some((m) => m.startsWith('property dismiss.slotSettings.allowPreferredValuesOnly -> WRITTEN false'))
    && JSON.stringify(d?.slotSettings) === '{"minChildren":1,"maxChildren":2,"allowPreferredValuesOnly":false,"displayEmptyByDefault":false}' && JSON.stringify(d?.preferredValues) === '[]',
    `constraints/open without preferred: with nothing preferred in the file, the slot is written open rather than flag every child, and says so (${JSON.stringify(d?.slotSettings)})`);
}

console.log('\nUpdate: gaining constraints, then dropping them');
{
  const before = figmaAnatomySet(slotted(), { swapTarget: SWAP_TARGET });
  const after = figmaAnatomySet(slotted(CONSTRAINED), { swapTarget: SWAP_TARGET });
  const { page, api } = host(after, { fileNodes: [BADGE] });
  await applyComponentPlan(before, api, {});
  ok(slotDef(page)?.slotSettings === undefined, 'premise: the set was built with an open slot');
  const members = () => new Map(((setOf(page).children as Node[])).map((m) => [String(m.name), { keep: new Set<string>() }]));
  const up = await applyComponentPlan(after, api, { update: { members: members(), retained: new Set() } });
  ok(JSON.stringify(slotDef(page)?.slotSettings) === '{"minChildren":1,"maxChildren":2,"allowPreferredValuesOnly":true,"displayEmptyByDefault":false}'
    && JSON.stringify(slotDef(page)?.preferredValues) === '[{"type":"COMPONENT_SET","key":"SK:badge"}]',
    `constraints/gained on update: an update in place writes the constraints onto the existing SLOT property (${JSON.stringify(slotDef(page)?.slotSettings)}; ${up.misses.slice(0, 1).join('')})`);
  await applyComponentPlan(before, api, { update: { members: members(), retained: new Set() } });
  ok(JSON.stringify(slotDef(page)?.slotSettings) === '{"minChildren":null,"maxChildren":null,"allowPreferredValuesOnly":false,"displayEmptyByDefault":false}'
    && JSON.stringify(slotDef(page)?.preferredValues) === '[]',
    `constraints/cleared on update: an update to a def that dropped them writes the slot back open (${JSON.stringify(slotDef(page)?.slotSettings)} ${JSON.stringify(slotDef(page)?.preferredValues)})`);
}

console.log('\na host that cannot take them');
{
  const plans = figmaAnatomySet(slotted(CONSTRAINED), { swapTarget: SWAP_TARGET });
  const { page, api } = host(plans, { fileNodes: [BADGE] });
  const combine = api.combineAsVariants;
  api.combineAsVariants = (...args: unknown[]) => { const s = combine(...args); s.editComponentProperty = () => { throw new Error('in editComponentProperty: slotSettings is not supported'); }; return s; };
  const res = await applyComponentPlan(plans, api, {});
  ok(res.misses.some((m) => m === 'property dismiss.slotSettings -> REFUSED (in editComponentProperty: slotSettings is not supported)') && slotDef(page)?.slotSettings === undefined,
    `constraints/refusal named: a host that refuses the edit is named, not passed (${JSON.stringify(res.misses.filter((m) => /slotSettings/.test(m)))})`);
}

console.log(`\n${executed - failed}/${executed} slot-constraint assertions passed.`);
if (failed) process.exit(1);
