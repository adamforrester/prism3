/**
 * THE HAND-EDIT SURVIVAL SUITE (#2956 point 6, owner decision 2026-10-23: keep is a guarantee) — against the shim.
 *
 *   npx tsx apps/plugin/test-hand-edit-survival.ts
 *
 * Each arm builds a set with the real executor, edits ONE kind of path on one member by hand, runs Update file with
 * Keep (the default) exactly as `main.ts` runs it (`previewUpdate`, then `applyUpdate` with the preview's hash), and
 * reads the edit back off the shim's own node. The kinds: paint, binding, geometry (an unbound padding, nested
 * corners), text, visibility, opacity, layout, a property link, structure (a reorder, a layer added by hand, a layer
 * removed by hand), the member root's own paint, and the focus ring's corners nested in a checkbox (#2943).
 *
 * Twice per kind: under a plan that changes only the member root's fill ("root"), so the edit conflicts with nothing,
 * and under one that also rewrites what the edited node holds ("overlap"), so the edit is a conflict. Keep holds both.
 *
 * INDEPENDENCE (docs/34). Every expected value is TYPED HERE, as the designer left it, never read from the plan, the dry
 * run or the apply's report. The edit is read off the shim's node after the run. Each arm also asserts the member was
 * written (or, for a layer added or removed by hand, skipped whole), so an arm cannot pass by the update writing nothing.
 *
 * Mutations, each failing the arms it names:
 *   · the node's own `kept` guard dropped (`kept ? undefined : await own()` → `await own()`, `write-components.ts`)
 *     → `survival/<kind> <plan>` for paint, binding, padding, text, visibility, opacity, layout, root paint;
 *   · #2943's `held` guard dropped from the ring pass → `survival/focus ring root`, `/focus ring overlap`;
 *   · #2956 point 1's reorder guard dropped → `survival/reorder root`, `/reorder overlap`;
 *   · #2956 point 1's wiring guard dropped → `survival/link root`, `/link overlap`;
 *   · the apply's skip of a member with a layer added or removed by hand dropped (`update-apply.ts`, `plan`) →
 *     `survival/layer added …`, `/layer removed …`.
 */
import { makeShim, type Node, type Page } from './component-shim';
import { componentDefs, figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, type AnatomyPlan } from '@prism3/engine/components';
import { SWAP_TARGET } from './src/build-deps';
import { applyComponentPlan } from './src/write-components';
import { previewUpdate, type UpdateTarget } from './src/update-plan';
import { applyUpdate, previewHashOf, type ApplyHost } from './src/update-apply';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

type PlanNode = AnatomyPlan['root'];
const plansOf = (id: string): AnatomyPlan[] => figmaAnatomySet(componentDefs.find((x) => x.id === id)!, { swapTarget: SWAP_TARGET });
const planComps = (n: PlanNode): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.nestOverrides ?? []).filter((o) => o.type === 'INSTANCE_SWAP').map((o) => o.value),
  ...(n.children ?? []).flatMap(planComps),
];
type World = { host: ApplyHost; api: Record<string, any>; set: () => Node };
/** A fresh file holding one set, built by the executor with identities on, as `test-update-apply.ts` builds it. */
const world = async (id: string, plans: AnatomyPlan[], extraVars: string[]): Promise<World> => {
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set([...plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0', ...extraVars])],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root))])],
    page, liveRoot: true, identities: true, scaleConstrained: true,
  }) as any;
  const built = await applyComponentPlan(plans, api);
  if (built.misses.length) throw new Error(`premise: ${id} built with ${built.misses.length} miss(es): ${built.misses[0]}`);
  const host = { ...api, root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
  return { host, api, set: () => page.children.find((n) => n.type === 'COMPONENT_SET') as Node };
};
const kid = (n: Node, path: string): Node => path.split('/').reduce((a, s) => (a.children as Node[]).find((c) => c.name === s)!, n);
const bound = (n: Node, f: string): string | null => (n.boundVariables as Record<string, { id: string }> | undefined)?.[f]?.id ?? null;
const unbind = (n: Node, f: string): void => (n.setBoundVariable as (f: string, v: null) => void)(f, null);
const varId = async (w: World, name: string): Promise<string> => (await w.api.variables.getLocalVariablesAsync()).find((v: { name: string }) => v.name.endsWith(`/${name}`)).id;
const names = (n: Node): string[] => (n.children as Node[]).map((c) => String(c.name));
const RED = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 0, b: 0 } }];
const CORNERS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;

/** One kind of hand edit: where, how, what to read back, and the value the designer left, typed. `edits` is the path
 *  the dry run must list for it. `skipped`: a layer added or removed by hand, which every choice skips whole. */
type Kind = { kind: string; def: string; member: string; edits: string; edit: (m: Node, w: World) => void | Promise<void>; read: (m: Node) => unknown; want: unknown; skipped?: true;
  /** What the "overlap" plan also changes on the edited node, so the edit is a conflict there. */
  overlap: (q: AnatomyPlan) => void };
const TAG_MEMBER = 'type=select, selection=unselected, size=medium, state=rest';
const tagNode = (q: AnatomyPlan, path: string): PlanNode => path.split('/').reduce((a: PlanNode, s) => a.children!.find((c) => c.name === s)!, q.root);
const rebindGap = (q: AnatomyPlan): void => { (tagNode(q, 'content').bound as Record<string, string>).itemSpacing = 'space/999'; };
const repaintLabelBox = (q: AnatomyPlan): void => { tagNode(q, 'content/labelCheck').paints = { ...(tagNode(q, 'content/labelCheck').paints ?? {}), fills: 'color/keep/changed' }; };
const KINDS: Kind[] = [
  { kind: 'paint', def: 'tag', member: TAG_MEMBER, edits: 'content/labelCheck', edit: (m) => { kid(m, 'content/labelCheck').fills = JSON.parse(JSON.stringify(RED)); },
    read: (m) => kid(m, 'content/labelCheck').fills, want: RED, overlap: repaintLabelBox },
  { kind: 'binding', def: 'tag', member: TAG_MEMBER, edits: 'content', edit: async (m, w) => { (kid(m, 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: await varId(w, 'space/0') }); },
    read: (m) => bound(kid(m, 'content'), 'itemSpacing'), want: 'V:space/0', overlap: rebindGap },
  { kind: 'padding', def: 'tag', member: TAG_MEMBER, edits: 'content', edit: (m) => { unbind(kid(m, 'content'), 'paddingLeft'); kid(m, 'content').paddingLeft = 3; },
    read: (m) => [kid(m, 'content').paddingLeft, bound(kid(m, 'content'), 'paddingLeft')], want: [3, null], overlap: rebindGap },
  { kind: 'nested corner', def: 'tag', member: TAG_MEMBER, edits: 'content/labelCheck', edit: (m) => { for (const c of CORNERS) { unbind(kid(m, 'content/labelCheck'), c); kid(m, 'content/labelCheck')[c] = 7; } },
    read: (m) => CORNERS.map((c) => [kid(m, 'content/labelCheck')[c], bound(kid(m, 'content/labelCheck'), c)]), want: [[7, null], [7, null], [7, null], [7, null]], overlap: repaintLabelBox },
  { kind: 'text', def: 'tag', member: TAG_MEMBER, edits: 'content/labelCheck/label', edit: (m) => { const t = kid(m, 'content/labelCheck/label'); t.textStyleId = ''; t.fontSize = 31; },
    read: (m) => [kid(m, 'content/labelCheck/label').textStyleId, kid(m, 'content/labelCheck/label').fontSize], want: ['', 31], overlap: repaintLabelBox },
  { kind: 'visibility', def: 'tag', member: TAG_MEMBER, edits: 'content/labelCheck', edit: (m) => { kid(m, 'content/labelCheck').visible = false; },
    read: (m) => kid(m, 'content/labelCheck').visible, want: false, overlap: repaintLabelBox },
  { kind: 'opacity', def: 'tag', member: TAG_MEMBER, edits: 'content/labelCheck', edit: (m) => { kid(m, 'content/labelCheck').opacity = 0.5; },
    read: (m) => kid(m, 'content/labelCheck').opacity, want: 0.5, overlap: repaintLabelBox },
  { kind: 'layout', def: 'tag', member: TAG_MEMBER, edits: 'content/labelCheck', edit: (m) => { kid(m, 'content/labelCheck').layoutMode = 'VERTICAL'; },
    read: (m) => kid(m, 'content/labelCheck').layoutMode, want: 'VERTICAL', overlap: repaintLabelBox },
  { kind: 'link', def: 'tag', member: TAG_MEMBER, edits: 'content/labelCheck/label', edit: (m) => { kid(m, 'content/labelCheck/label').componentPropertyReferences = {}; },
    read: (m) => kid(m, 'content/labelCheck/label').componentPropertyReferences, want: {}, overlap: repaintLabelBox },
  { kind: 'reorder', def: 'tag', member: TAG_MEMBER, edits: 'content', edit: (m) => { (kid(m, 'content').insertChild as (i: number, c: Node) => void)(0, kid(m, 'content/labelCheck')); },
    read: (m) => names(kid(m, 'content')), want: ['labelCheck', 'leadingVisual'], overlap: rebindGap },
  { kind: 'layer added', def: 'tag', member: TAG_MEMBER, edits: 'content/note', skipped: true,
    edit: (m, w) => { const f = w.api.createFrame() as Node; f.name = 'note'; (kid(m, 'content').appendChild as (c: Node) => void)(f); },
    read: (m) => names(kid(m, 'content')), want: ['leadingVisual', 'labelCheck', 'note'], overlap: rebindGap },
  { kind: 'layer removed', def: 'tag', member: TAG_MEMBER, edits: 'content/leadingVisual', skipped: true,
    edit: (m) => { (kid(m, 'content/leadingVisual').remove as () => void)(); },
    read: (m) => names(kid(m, 'content')), want: ['labelCheck'], overlap: rebindGap },
  { kind: 'root paint', def: 'tag', member: TAG_MEMBER, edits: '.', edit: (m) => { m.fills = JSON.parse(JSON.stringify(RED)); },
    read: (m) => m.fills, want: RED, overlap: () => { /* the root's fill is what both plans change */ } },
  // #2943's case: the focus ring nested in a checked, focus-visible checkbox, its corners unbound and squared by hand.
  { kind: 'focus ring', def: 'checkbox-control', member: 'selection=checked, status=default, size=medium, state=focus-visible', edits: 'focusRing',
    edit: (m) => { for (const c of CORNERS) { unbind(kid(m, 'focusRing'), c); kid(m, 'focusRing')[c] = 0; } },
    read: (m) => CORNERS.map((c) => [kid(m, 'focusRing')[c], bound(kid(m, 'focusRing'), c)]), want: [[0, null], [0, null], [0, null], [0, null]],
    overlap: (q) => { const r = q.root.children!.find((c) => c.name === 'focusRing'); if (r) r.paints = { ...(r.paints ?? {}), strokes: 'color/keep/changed' }; } },
];

console.log('hand-edit survival (#2956 point 6) — every kind of hand edit, Update with Keep, read back byte-identical\n');
for (const k of KINDS) for (const plan of ['root', 'overlap'] as const) {
  const plans = plansOf(k.def);
  const w = await world(k.def, plans, ['color/keep/changed', 'space/999']);
  const member = (): Node => (w.set().children as Node[]).find((m) => m.name === k.member)!;
  await k.edit(member(), w);
  const next = plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    q.root.paints = { ...(q.root.paints ?? {}), fills: 'color/keep/changed' };
    if (plan === 'overlap') k.overlap(q);
    return q;
  });
  const targets: UpdateTarget[] = [{ def: k.def, plans: next }];
  const pre = await previewUpdate(w.host, targets);
  const listed = pre.sets[0].handEdits.filter((h) => h.member === k.member).map((h) => h.path);
  // Under "overlap" the plan also changes the edited node, so the dry run reads the edit as a conflict: Keep is then
  // holding the edit against a write the update wanted to make, not merely leaving a node the plan never touched.
  if (plan === 'overlap' && !k.skipped) {
    const h = pre.sets[0].handEdits.find((x) => x.member === k.member && x.path === k.edits);
    ok(h?.conflict === true, `survival/${k.kind} overlap conflict: the dry run reads the edit as a conflict (${JSON.stringify(h)})`);
  }
  const res = await applyUpdate(w.host, w.api as any, targets, previewHashOf(pre), { choices: { handEdits: 'keep' } });
  const o = res.outcomes[0];
  const now = JSON.stringify(k.read(member()));
  // The member was acted on: written in place around the edit, or skipped whole for a layer added or removed by hand.
  const acted = k.skipped ? o.skipped.some((x) => x.member === k.member) && !o.updated.includes(k.member) : o.updated.includes(k.member);
  ok(listed.includes(k.edits) && acted && now === JSON.stringify(k.want),
    `survival/${k.kind} ${plan}: the edit on ${k.edits} reads as the designer left it (${now}; listed ${JSON.stringify(listed)}; ${k.skipped ? 'skipped' : 'updated'} ${acted})`);
}

console.log(failed ? `\n❌ ${failed} FAILED — ${executed} assertions executed` : `\n✓ all passed — ${executed} assertions executed`);
process.exit(failed ? 1 : 0);
