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
 * The exception is #3076's icon swaps: the dry run compares the file's icon with the plan's, not the plan's with the
 * previous plan's, so a swapped icon differs from EVERY plan and reads as a conflict under "root" too, on any update
 * that moves anything on its member. Those arms assert that reading under both plans (`… root conflict`).
 *
 * INDEPENDENCE (docs/34). Every expected value is TYPED HERE, as the designer left it, never read from the plan, the dry
 * run or the apply's report. The edit is read off the shim's node after the run. Each arm also asserts the member was
 * written (or, for a layer added or removed by hand, skipped whole), so an arm cannot pass by the update writing nothing.
 *
 * Mutations, each measured, each failing the arms it names (every arm fails under at least one):
 *   · the node's own `kept` guard dropped (`kept ? undefined : await own()` → `await own()`, `write-components.ts`)
 *     → `survival/paint overlap`, `/binding …`, `/padding …`, `/text …`, `/layout …`, `/root paint …` (11);
 *   · the `kept` guard on `claimDefaults` dropped → `survival/paint root`, `/nested corner …`, `/visibility …`,
 *     `/opacity …` (7);
 *   · #2943's `held` guard dropped from the parent's child passes → `survival/focus ring root`, `/focus ring overlap`;
 *   · #2956 point 1's reorder guard dropped → `survival/reorder root`, `/reorder overlap`;
 *   · #2956 point 1's wiring guard dropped → `survival/link root`, `/link overlap`;
 *   · the apply's skip of a member with a layer added or removed by hand dropped (`update-apply.ts`, `plan`) →
 *     `survival/layer added …`, `/layer removed …` (4);
 *   · #3076's icon swap: the instance's main left out of the as-built signature (`sig.main = null`, `member-baseline.ts`)
 *     → every `survival/icon swap …` assertion (12); the nested instance's `!kept` re-point guard dropped
 *     (`write-components.ts`) → `/icon swap …` and `/icon swap inset …`, root and overlap (4); the slot's `!kept` guard
 *     dropped → `/icon swap slot root`, `/icon swap slot overlap` (2); `slotRepoints` unwired (`update-plan.ts`) →
 *     `/icon swap slot root conflict` and `/icon swap slot overlap conflict`.
 *
 * UPDATES OFF (#2956, owner decisions 2026-11-17): `survival/off auto` (an update that cannot apply around a hand edit
 * turns the set's updates off by itself, the rest still written), `/off reopen` (a fresh check reads the mark off the
 * set), `/off plain edit` (an edit the update applies around never turns it on), `/off skip` and `/off report` (a set
 * whose updates are off is left whole and reported calmly), `/off back on` (cleared, the next Update writes it again).
 * The mark is read by its namespace and key typed here. Mutations: the auto write dropped → `/off auto`, `/off reopen`;
 * turning on for any kept edit → `/off plain edit`; the apply's skip of such a set dropped → `/off skip`, `/off report`,
 * `/off back on`. On main every arm but `/off plain edit` fails by name; that one guards against turning on too eagerly.
 * The other side of "only" (#3948 review B2): `/off no record`, `/off unstamped` and `/off root replaced`, a member
 * skipped for a reason that is not a hand edit leaves updates on. Mutations: `around` pushed on the no-record skip →
 * `/off no record`; on the not-built-by-Prism3 skip → `/off unstamped`; on the would-need-replacing skip →
 * `/off root replaced`.
 */
import { makeShim, type Node, type Page } from './component-shim';
import { componentDefs, figmaAnatomySet, planBoundVars, planComponentName, planPaintVars, planTextStyles, planEffectStyles, type AnatomyPlan } from '@prism3/engine/components';
import { SWAP_TARGET } from './src/build-deps';
import { applyComponentPlan, STAMP_KEY } from './src/write-components';
import { BASELINE_KEY } from './src/member-baseline';
import { previewUpdate, type UpdateTarget } from './src/update-plan';
import { applyUpdate, applyVerdict, previewHashOf, type ApplyHost } from './src/update-apply';

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
    comps: [...new Set([SWAP_TARGET, 'focus-ring', BRAND_ICON, OTHER_CORE_ICON, ...plans.flatMap((p) => planComps(p.root))])],
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
  overlap: (q: AnatomyPlan) => void;
  /** The conflict flag the dry run must give the edit under "root", typed, for a kind whose edit differs from every
   *  plan rather than from the previous one (#3076's icon swaps), so a change to that reading fails by name. */
  rootConflict?: boolean };
const TAG_MEMBER = 'type=select, selection=unselected, size=medium, state=rest';
const tagNode = (q: AnatomyPlan, path: string): PlanNode => path.split('/').reduce((a: PlanNode, s) => a.children!.find((c) => c.name === s)!, q.root);
const rebindGap = (q: AnatomyPlan): void => { (tagNode(q, 'content').bound as Record<string, string>).itemSpacing = 'space/999'; };
const repaintLabelBox = (q: AnatomyPlan): void => { tagNode(q, 'content/labelCheck').paints = { ...(tagNode(q, 'content/labelCheck').paints ?? {}), fills: 'color/keep/changed' }; };
/** The brand's own icon, which the brand built and Prism3 did not (#3076): a plain component in the file, unstamped. */
const BRAND_ICON = 'icon/checkmark';
/** The core icon an "overlap" plan re-points the swapped node at, so the plan changes what the designer changed. */
const OTHER_CORE_ICON = 'icon/check-circle';
const TAG_SELECTED = 'type=select, selection=selected, size=medium, state=rest';
const CHECKED = 'selection=checked, status=default, size=medium, state=rest';
const SEARCH_MEMBER = 'status=default, size=medium, state=rest';
const mainName = (n: Node): string | null => (n.mainComponent as { name?: string } | undefined)?.name ?? null;
/** Swap the instance at `path` to the brand's icon, as a designer does in Figma's instance menu. */
const swapTo = (path: string) => (m: Node, w: World): void => {
  const brand = (w.api.root.findAllWithCriteria({ types: ['COMPONENT'] }) as Node[]).find((c) => c.name === BRAND_ICON);
  if (!brand) throw new Error(`premise: the file holds no ${BRAND_ICON} to swap to`);
  (kid(m, path).swapComponent as (c: Node) => void)(brand);
};
/** The plan re-points `path` at another core icon: as a glyph (`nestTarget`) or as a slot's default (`swapTarget`). */
const retarget = (path: string) => (q: AnatomyPlan): void => {
  // Every member of the set gets the same rewrite; a member that draws no node at `path` (a dismissible tag) has none.
  const n = path.split('/').reduce((a: PlanNode | undefined, s) => a?.children?.find((c) => c.name === s), q.root);
  if (!n) return;
  if (n.nestTarget) n.nestTarget = OTHER_CORE_ICON; else n.swapTarget = OTHER_CORE_ICON;
};
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
  // A DESIGNER'S ICON SWAP (#3076, owner decision 2026-11-18 A, both): the icon inside a generated component swapped by
  // hand to the brand's own icon, which Prism3 never built. One arm per shape a component holds an icon in: a glyph
  // that is a nested instance (Tag's check), a glyph inset in a frame (Checkbox's check), and a slot whose default a
  // property names (Search field's clear). "overlap" re-points the same node at another core icon, the case of an
  // engine that changes the glyph it draws there, so the swap is a conflict. Under "root" it is a conflict as well: the
  // swapped icon differs from what every plan names, and that plan moves the member (`rootConflict`).
  { kind: 'icon swap (#3076)', def: 'tag', member: TAG_SELECTED, edits: 'content/labelCheck/checkGlyph', edit: swapTo('content/labelCheck/checkGlyph'),
    read: (m) => mainName(kid(m, 'content/labelCheck/checkGlyph')), want: BRAND_ICON, overlap: retarget('content/labelCheck/checkGlyph'), rootConflict: true },
  { kind: 'icon swap inset (#3076)', def: 'checkbox-control', member: CHECKED, edits: 'checkGlyph/glyph', edit: swapTo('checkGlyph/glyph'),
    read: (m) => mainName(kid(m, 'checkGlyph/glyph')), want: BRAND_ICON, overlap: retarget('checkGlyph/glyph'), rootConflict: true },
  { kind: 'icon swap slot (#3076)', def: 'search-field', member: SEARCH_MEMBER, edits: 'control/trailingVisual', edit: swapTo('control/trailingVisual'),
    read: (m) => mainName(kid(m, 'control/trailingVisual')), want: BRAND_ICON, overlap: retarget('control/trailingVisual'), rootConflict: true },
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
  if (plan === 'root' && k.rootConflict !== undefined) {
    const h = pre.sets[0].handEdits.find((x) => x.member === k.member && x.path === k.edits);
    ok(h?.conflict === k.rootConflict,
      `survival/${k.kind} root conflict: the dry run reads the edit as ${k.rootConflict ? 'a conflict, since the icon differs from what every plan names' : 'no conflict'} (${JSON.stringify(h)})`);
  }
  const res = await applyUpdate(w.host, w.api as any, targets, previewHashOf(pre), { choices: { handEdits: 'keep' } });
  const o = res.outcomes[0];
  const now = JSON.stringify(k.read(member()));
  // The member was acted on: written in place around the edit, or skipped whole for a layer added or removed by hand.
  const acted = k.skipped ? o.skipped.some((x) => x.member === k.member) && !o.updated.includes(k.member) : o.updated.includes(k.member);
  ok(listed.includes(k.edits) && acted && now === JSON.stringify(k.want),
    `survival/${k.kind} ${plan}: the edit on ${k.edits} reads as the designer left it (${now}; listed ${JSON.stringify(listed)}; ${k.skipped ? 'skipped' : 'updated'} ${acted})`);
}

// ── UPDATES OFF (#2956, owner decisions 2026-11-17) ─────────────────────────────────────────────────────────────────
// The mark is read off the shim's own set node, by its namespace and key TYPED HERE ('prism3' / 'updatesOff'), never
// through `updates-off.ts`; the approved reason is typed here too. Each arm runs Update with Keep as `main.ts` runs it.
console.log('\nUpdates off (#2956) — turned on by itself only when an update cannot apply around hand edits; a set with it is left as it is\n');
const MARK = (n: Node): string => (n.getSharedPluginData as (a: string, b: string) => string)('prism3', 'updatesOff');
const SETMARK = (n: Node, v: string): void => (n.setSharedPluginData as (a: string, b: string, c: string) => void)('prism3', 'updatesOff', v);
const REASON = 'Turned off when an update couldn’t apply around your edits.';
const rootChanged = (plans: AnatomyPlan[]): AnatomyPlan[] => plans.map((p) => { const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan; q.root.paints = { ...(q.root.paints ?? {}), fills: 'color/keep/changed' }; return q; });
const OTHER = 'type=select, selection=selected, size=medium, state=rest';
const fillVar = (n: Node): string | null => ((n.fills as { boundVariables?: { color?: { id: string } } }[] | undefined)?.[0]?.boundVariables?.color?.id) ?? null;
const run = async (w: World, def: string, plans: AnatomyPlan[]) => {
  const targets: UpdateTarget[] = [{ def, plans }];
  const pre = await previewUpdate(w.host, targets);
  const res = await applyUpdate(w.host, w.api as any, targets, previewHashOf(pre), { choices: { handEdits: 'keep' } });
  return { pre, res, v: applyVerdict(res) };
};
{
  // AUTOMATIC: a layer added by hand, which no update can apply around, so the member is skipped whole and the set's
  // updates turn off by themselves. The rest of the set is still written in that run.
  const plans = plansOf('tag');
  const w = await world('tag', plans, ['color/keep/changed', 'space/999']);
  const member = (): Node => (w.set().children as Node[]).find((m) => m.name === TAG_MEMBER)!;
  const f = w.api.createFrame() as Node; f.name = 'note'; (kid(member(), 'content').appendChild as (c: Node) => void)(f);
  const before = MARK(w.set());
  const { res, v } = await run(w, 'tag', rootChanged(plans));
  const o = res.outcomes[0];
  ok(before === '' && MARK(w.set()) === 'auto' && o.skipped.some((x) => x.member === TAG_MEMBER) && o.updated.length > 0 && v.lines.some((l) => l.includes(REASON)),
    `survival/off auto: a member the update cannot apply around turns the set's updates off by itself, the rest written (${JSON.stringify(before)} → ${JSON.stringify(MARK(w.set()))}; ${o.updated.length} updated; ${JSON.stringify(v.lines.filter((l) => l.includes('Updates off')))})`);
  // REOPEN: the mark lives on the set node, so a fresh check of the file (the next opening) reads it there.
  const again = await previewUpdate(w.host, [{ def: 'tag', plans: rootChanged(plans) }]);
  ok(again.sets[0]?.updatesOff === 'auto', `survival/off reopen: a fresh check reads the set's updates as off, turned off by the update (${JSON.stringify(again.sets[0]?.updatesOff)})`);
}
{
  // NOT ON AN ORDINARY HAND EDIT: a recolor the update applies around stays Hand-edited, and the set keeps updating.
  const plans = plansOf('tag');
  const w = await world('tag', plans, ['color/keep/changed', 'space/999']);
  const member = (): Node => (w.set().children as Node[]).find((m) => m.name === TAG_MEMBER)!;
  kid(member(), 'content/labelCheck').fills = JSON.parse(JSON.stringify(RED));
  const { res } = await run(w, 'tag', rootChanged(plans));
  ok(MARK(w.set()) === '' && res.outcomes[0].updated.includes(TAG_MEMBER) && !res.outcomes[0].turnedOff,
    `survival/off plain edit: an edit the update applies around never turns updates off (${JSON.stringify(MARK(w.set()))}; updated ${res.outcomes[0].updated.includes(TAG_MEMBER)})`);
}
// NOT ON A SKIP THAT IS NOT ABOUT HAND EDITS (#3948 review B2): the owner's rule turns updates off ONLY when an update
// cannot apply around hand edits. Three skips leave a member for another reason, and each must leave the mark unset:
// a member with no as-built record under `noBaseline: 'skip'`, a member not built by Prism3 (its stamp cleared), and a
// member whose root would need replacing (its plan's root typed TEXT, so the host's COMPONENT reads as a type change).
// Each arm first checks the member WAS skipped for that reason, so a fixture that stops producing the skip fails here
// rather than passing vacuously.
for (const c of [
  { name: 'no record', reason: 'no as-built record', noBaseline: 'skip' as const,
    prep: (m: Node, plans: AnatomyPlan[]) => { (m.setSharedPluginData as (a: string, b: string, c: string) => void)('prism3', BASELINE_KEY, ''); return rootChanged(plans); } },
  { name: 'unstamped', reason: 'not built by Prism3', noBaseline: undefined,
    prep: (m: Node, plans: AnatomyPlan[]) => { (m.setSharedPluginData as (a: string, b: string, c: string) => void)('prism3', STAMP_KEY, ''); return rootChanged(plans); } },
  { name: 'root replaced', reason: 'the member itself would need replacing', noBaseline: undefined,
    prep: (_m: Node, plans: AnatomyPlan[]) => rootChanged(plans).map((q) => (planComponentName(q) === TAG_MEMBER ? { ...q, root: { ...q.root, type: 'TEXT' as AnatomyPlan['root']['type'] } } : q)) },
]) {
  const plans = plansOf('tag');
  const w = await world('tag', plans, ['color/keep/changed', 'space/999']);
  const member = (): Node => (w.set().children as Node[]).find((m) => m.name === TAG_MEMBER)!;
  const next = c.prep(member(), plans);
  const targets: UpdateTarget[] = [{ def: 'tag', plans: next }];
  const pre = await previewUpdate(w.host, targets);
  const res = await applyUpdate(w.host, w.api as any, targets, previewHashOf(pre), { choices: { handEdits: 'keep', ...(c.noBaseline ? { noBaseline: c.noBaseline } : {}) } });
  const o = res.outcomes[0];
  const why = o.skipped.find((x) => x.member === TAG_MEMBER)?.reason ?? null;
  ok(why === c.reason && MARK(w.set()) === '' && !o.turnedOff && !(o.aroundEdits ?? []).length && o.updated.length > 0,
    `survival/off ${c.name}: a member skipped as "${c.reason}" leaves updates on (skipped as ${JSON.stringify(why)}; mark ${JSON.stringify(MARK(w.set()))}; ${o.updated.length} updated)`);
}
{
  // SKIP AND REPORT, then BACK ON. The designer turned the set's updates off; the plan changes every member's root fill.
  const plans = plansOf('tag');
  const w = await world('tag', plans, ['color/keep/changed', 'space/999']);
  const set = w.set();
  const member = (): Node => (set.children as Node[]).find((m) => m.name === TAG_MEMBER)!;
  const other = (): Node => (set.children as Node[]).find((m) => m.name === OTHER)!;
  kid(member(), 'content/labelCheck').fills = JSON.parse(JSON.stringify(RED));
  const otherFill = fillVar(other());
  SETMARK(set, 'designer');
  const { res, v } = await run(w, 'tag', rootChanged(plans));
  const o = res.outcomes[0];
  ok(o.off === 'designer' && o.updated.length === 0 && fillVar(other()) === otherFill && JSON.stringify(kid(member(), 'content/labelCheck').fills) === JSON.stringify(RED) && MARK(set) === 'designer',
    `survival/off skip: a set whose updates are off is left whole, its hand edit as the designer left it (off ${o.off}; ${o.updated.length} updated; other fill ${fillVar(other())} was ${otherFill})`);
  ok(v.ok && !v.headline.startsWith('⚠') && !v.headline.startsWith('✗') && v.lines.includes(`${o.set}: left as it is. Updates off.`) && !v.causes.length,
    `survival/off report: the run reports it calmly, never ⚠ (${v.headline}; ${JSON.stringify(v.lines)})`);
  // BACK ON: the mark removed, the next Update re-plans the set normally, and Keep still holds the edit.
  SETMARK(set, '');
  const back = await run(w, 'tag', rootChanged(plans));
  const ob = back.res.outcomes[0];
  ok(!ob.off && ob.updated.includes(OTHER) && fillVar(other()) !== otherFill && JSON.stringify(kid(member(), 'content/labelCheck').fills) === JSON.stringify(RED),
    `survival/off back on: turned back on, the next Update writes the set again and keeps the edit (${ob.updated.length} updated; other fill ${fillVar(other())})`);
}

console.log(failed ? `\n❌ ${failed} FAILED — ${executed} assertions executed` : `\n✓ all passed — ${executed} assertions executed`);
process.exit(failed ? 1 : 0);
