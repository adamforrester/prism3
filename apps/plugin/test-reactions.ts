/**
 * INTERACTIVE COMPONENTS (#2466, owner decision Q238 A) — the prototype reactions a set's members carry, planned from
 * the def's `state` axis, written by the executor, recorded, read by the dry run, and converged by the apply.
 *
 * Every set here is BUILT by the real executor into the in-memory shim (`identities` on, so nodes have ids to point
 * at), and every reaction asserted is READ OFF THE SHIM'S NODES by this test, each destination id looked up among
 * the set's children here, never through `reactions.ts`. The expectations are literals, not derived from the map.
 *
 * What each section pins, and the mutation it was checked against (each fails the assertion it names):
 *
 *   map/…        the per-def reaction map, literal: which defs are in scope, and per def how many members are sources
 *                and how many reactions they carry; one member's list, in full. Mutation: the excluded-state filter
 *                dropped (every state but Pressed a source) → `map/counts`, `excluded/plan`, `excluded/host`.
 *   excluded/…   no reaction is planned or written on a Disabled, Pending, Read only, Focus visible, Pressed or Error
 *                member. Same mutation.
 *   matched/…    every destination is the sibling matched on EVERY other axis, in the plan and on the host.
 *                Mutation: one fewer axis matched → `matched/plan`, `matched/host`.
 *   replaced/…   a member deleted by hand comes back from the update with its reactions, and no sibling's reaction
 *                dangles at the old id; the next dry run reads up to date. Mutation: the executor skips the members
 *                an update configures in place → `replaced/no dangling`, `replaced/current`.
 *   orphan/…     a destination the host still resolves, to an orphan with no parent, DANGLES: the member reads "to
 *                update", never hand-edited. Mutation: existence checked, not `parent` → `orphan/dangling`. It does
 *                so too where no record or a hand edit elsewhere would otherwise decide the state. Mutation: the
 *                dangle dropped from the state's first test → `orphan/no record`, `orphan/hand-renamed`.
 *   hand/…       a reaction removed by hand is a hand edit at its own path, kept by default and still reported;
 *                overwritten on request, then current. Mutation: reactions dropped from the record → `hand/detected`.
 *   converge/…   a set built before reactions existed (no reactions, no reactions in its records, an older executor
 *                revision) is named by the dry run, updated, verified, and then reads up to date. Mutations: the
 *                executor skips in-place members → `converge/written`, `converge/up to date`.
 *   touch/…      Rest keeps While pressing for touch prototypes (owner decision Q344, #2733, reverting #2703): Rest
 *                carries While hovering AND While pressing, Hover While pressing, literal per state; a file built under
 *                #2703's hover-only plan (Rest without its press, recorded so) is named by the dry run, has the press
 *                put back by the apply, then reads up to date. Mutation: the Rest press dropped from `reactionMap`
 *                → `touch/rest`, `touch/dry run`, `touch/restored`.
 *   all three/…  reactions to repair, sets to move (#2542) and pages to reorder (#2568) in ONE run: one named version,
 *                all of it done, and a change to any of the three after the check refuses the confirm. Mutations: the
 *                reactions dropped from a set's fingerprint → `all three/hash, reactions`; the set's move dropped from
 *                `previewHashOf` → `all three/hash, set`; the page list dropped from it → `all three/hash, page`. The
 *                three sets keep the ids the shim gave them (#2593); every set named `SET:1` again → `all three/converges`.
 *
 * Run: `npx tsx apps/plugin/test-reactions.ts`
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, planComponentName } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { applyComponentPlan, STAMP_KEY } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { NS } from './src/persist-figma';
import { BASELINE_KEY, writeBaseline } from './src/member-baseline';
import { EXECUTOR_REVISION } from './src/executor-revision';
import { makeShim, type Node, type Page } from './component-shim';
import { previewUpdate, previewVerdict, type UpdateTarget } from './src/update-plan';
import { applyUpdate, applyVerdict, previewHashOf, type ApplyHost } from './src/update-apply';
import { REACTIONS_PATH, reactionMap } from './src/reactions';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const section = (s: string) => console.log(`\n${s}`);

const plansOf = (id: string): AnatomyPlan[] => {
  const d = componentDefs.find((x) => x.id === id);
  if (!d) throw new Error(`no def ${id}`);
  return figmaAnatomySet(d, { swapTarget: SWAP_TARGET });
};
const planComps = (n: { swapTarget?: string; nestTarget?: string; children?: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []),
  ...(n.nestTarget ? [n.nestTarget] : []),
  ...((n.children ?? []) as (typeof n)[]).flatMap(planComps),
];
/** `axis=value` segments of a member name, by axis: parsed HERE, not with the engine's coordinate helpers. */
const axesOf = (name: string): Map<string, string> => new Map(name.split(', ').map((s) => [s.slice(0, s.indexOf('=')), s.slice(s.indexOf('=') + 1)] as const));

type World = { host: ApplyHost; api: Record<string, any>; page: Page; set: () => Node; plans: AnatomyPlan[] };
/** A fresh file holding one set, built by the executor, with identities on. */
const world = async (id: string): Promise<World> => {
  const plans = plansOf(id);
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root))])],
    page, liveRoot: true, identities: true, scaleConstrained: true,
  }) as any;
  const built = await applyComponentPlan(plans, api);
  if (built.misses.length) throw new Error(`premise: ${id} built with ${built.misses.length} miss(es): ${built.misses[0]}`);
  const host = {
    ...api,
    root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) },
  } as unknown as ApplyHost;
  return { host, api, page, set: () => page.children.find((n) => n.type === 'COMPONENT_SET') as Node, plans };
};
const membersOf = (w: World): Node[] => w.set().children as Node[];
const member = (w: World, name: string): Node => membersOf(w).find((m) => m.name === name)!;
type HostReaction = { trigger: { type: string }; actions: { type: string; destinationId: string; navigation: string }[] };
const reactionsOf = (n: Node): HostReaction[] => n.reactions as HostReaction[];
/** A member's reactions as `TRIGGER→<destination name>`, each destination looked up among the set's members by id;
 *  `TRIGGER→?` for one that is not a member. Sorted. */
const named = (w: World, n: Node): string[] => {
  const byId = new Map(membersOf(w).map((m) => [String(m.id), String(m.name)] as const));
  return reactionsOf(n).flatMap((r) => r.actions.map((a) => `${r.trigger.type}→${byId.get(a.destinationId) ?? '?'}`)).sort();
};
const targets = (w: World, id: string): UpdateTarget[] => [{ def: id, plans: w.plans }];
const confirm = async (w: World, id: string, choices?: Parameters<typeof applyUpdate>[4] extends infer O ? O extends { choices?: infer C } ? C : never : never) => {
  const pre = await previewUpdate(w.host, targets(w, id));
  return { pre, res: await applyUpdate(w.host, w.api as any, targets(w, id), previewHashOf(pre), choices ? { choices } : {}) };
};
/** A def's reaction map, its press destination read off its plans as the plugin reads it (#2428, `pressState`). */
const rxOf = (d: (typeof componentDefs)[number]) => {
  const set = figmaAnatomySet(d, { swapTarget: SWAP_TARGET });
  return reactionMap(set.map(planComponentName), set[0]?.pressState);
};
/** Where a def's While pressing goes: `pressed`, or the state its def names (#2428). */
const pressOf = (d: (typeof componentDefs)[number]): string => d.figmaProperties?.pressState ?? 'pressed';
const TAG = 'tag';
const T = (state: string, rest = 'type=select, selection=unselected, size=medium'): string => `${rest}, state=${state}`;

console.log('interactive components (#2466) — against the in-memory shim\n');

/* ── map ────────────────────────────────────────────────────────────────────────────────────────────────── */
section('map — the per-def reaction map, literal (owner decision Q238 A, part 1)');
{
  // In scope: every def whose state axis holds rest, hover and pressed. [members, sources, reactions].
  const want: Record<string, [number, number, number]> = {
    'button': [576, 192, 288], 'button-destructive': [576, 192, 288], 'button-neutral': [576, 192, 288],
    'icon-button': [216, 72, 108], 'icon-button-destructive': [216, 72, 108], 'icon-button-neutral': [216, 72, 108],
    // #2751 (owner Q354): `status` doubles the three choice controls; an errored control still hovers and presses.
    'checkbox-control': [90, 36, 54], 'radio-control': [60, 24, 36], 'switch-control': [40, 16, 24],
    // #2872 (Q507.2 A): the current page doubles Link's standalone members; a current link still hovers and presses.
    'tag': [45, 18, 27], 'tab-item': [30, 12, 18], 'segmented-control-segment': [30, 12, 18], 'link': [144, 72, 108],
    // #2457: the flush icon button, 2 shapes × 3 sizes (Q287 A) × (rest → hover, rest → pressed, hover → pressed), in
    // each of its three families (Q295.2 B).
    'flush-icon-button': [60, 24, 36], 'flush-icon-button-destructive': [60, 24, 36], 'flush-icon-button-neutral': [60, 24, 36],
    // #2665: a page cell at three sizes, rest → hover, rest → pressed, hover → pressed (Q344). The current page (rest and
    // focus-visible only, owner call 7, in both of Q381's styles) and the ellipsis (rest only) have no sibling to change
    // to, so they carry none: the style adds six members and no reaction. Q414 A adds previous and next, unlabeled and
    // labeled, at three sizes: 12 more rows with the same three reactions each (24 sources, 36 reactions); their
    // disabled member (the inactive end) carries none.
    'pagination-item': [87, 30, 45],
    // #2669: the Slider, 3 sizes × 2 types × (rest → hover, rest → pressed, hover → pressed); its Thumb, 3 sizes of the same.
    'slider': [30, 12, 18], '_slider-thumb': [15, 6, 9],
    // #2428 (owner decision Q344): Code input's cell, 4 sizes × 7 states. No pressed look: While pressing goes to the
    // active cell (focus-visible). 4 sizes × (rest → hover, rest → active, hover → active).
    'code-input-cell': [28, 8, 12],
    // #2343 PR 5: SignInButton, 8 provider × style pairs (Q831 A) × 3 sizes × (rest → hover, rest → pressed, hover → pressed) (Q-S6 A).
    'sign-in-button': [96, 48, 72],
  };
  const got: Record<string, [number, number, number]> = {};
  for (const d of componentDefs) {
    const map = rxOf(d);
    if (!map.size) continue;
    const lists = [...map.values()];
    got[d.id] = [map.size, lists.filter((l) => l.length).length, lists.reduce((k, l) => k + l.length, 0)];
  }
  ok(JSON.stringify(Object.keys(got).sort()) === JSON.stringify(Object.keys(want).sort()), `map/scope: exactly the 20 defs with rest, hover and pressed, and the one naming its press state (${Object.keys(got).join(', ')})`);
  ok(Object.entries(want).every(([id, w]) => JSON.stringify(got[id]) === JSON.stringify(w)), `map/counts: members, sources and reactions per def (${JSON.stringify(got)})`);
  const btn = reactionMap(plansOf('button').map(planComponentName));
  const B = (state: string): string => `appearance=filled, surface=default, inset=default, size=medium, state=${state}, leading icon=false, trailing icon=false`;
  ok(JSON.stringify(btn.get(B('rest'))) === JSON.stringify([{ trigger: 'ON_HOVER', to: B('hover') }, { trigger: 'ON_PRESS', to: B('pressed') }]), `map/rest: a filled medium Button at rest changes to Hover while hovering and Pressed while pressing (${JSON.stringify(btn.get(B('rest')))})`);
  ok(JSON.stringify(btn.get(B('hover'))) === JSON.stringify([{ trigger: 'ON_PRESS', to: B('pressed') }]), `map/hover: at hover, to Pressed while pressing only (${JSON.stringify(btn.get(B('hover')))})`);
  // Q344 on the code cell, literal: Rest → Hover while hovering and → the active cell while pressing; Hover → the active
  // cell while pressing; nothing anywhere else.
  const cell = rxOf(componentDefs.find((d) => d.id === 'code-input-cell')!);
  const C = (state: string): string => `size=medium, state=${state}`;
  ok(JSON.stringify(cell.get(C('rest'))) === JSON.stringify([{ trigger: 'ON_HOVER', to: C('hover') }, { trigger: 'ON_PRESS', to: C('focus-visible') }]), `map/code cell rest: While hovering to Hover, While pressing to the active cell (${JSON.stringify(cell.get(C('rest')))})`);
  ok(JSON.stringify(cell.get(C('hover'))) === JSON.stringify([{ trigger: 'ON_PRESS', to: C('focus-visible') }]), `map/code cell hover: While pressing to the active cell only (${JSON.stringify(cell.get(C('hover')))})`);
  ok(['filled', 'focus-visible', 'focus-visible-filled', 'disabled', 'error'].every((st) => JSON.stringify(cell.get(C(st))) === '[]'), 'map/code cell others: no reaction on Filled, the active states, Disabled or Error');
}

/* ── excluded ───────────────────────────────────────────────────────────────────────────────────────────── */
section('excluded — no reactions on Disabled, Pending, Read only, Focus visible (part 3), nor on Pressed or Error');
{
  const bad: string[] = [];
  for (const d of componentDefs) {
    const map = rxOf(d);
    for (const [name, list] of map) if (list.length && !['rest', 'hover'].includes(axesOf(name).get('state')!)) bad.push(`${d.id}: ${name}`);
  }
  ok(bad.length === 0, `excluded/plan: only Rest and Hover members are planned any reaction (${bad.slice(0, 3).join('; ')})`);
  const w = await world(TAG);
  const onHost = membersOf(w).filter((m) => reactionsOf(m).length).map((m) => axesOf(String(m.name)).get('state'));
  ok(onHost.length === 18 && onHost.every((s) => s === 'rest' || s === 'hover'), `excluded/host: after a build, the 18 members carrying reactions are all Rest or Hover (${[...new Set(onHost)].join(', ')}, ${onHost.length})`);
  const total = membersOf(w).reduce((k, m) => k + reactionsOf(m).length, 0);
  ok(total === 27, `excluded/host: the tag set carries 27 reactions in all, 9 hover and 18 press (${total})`);
  ok(membersOf(w).every((m) => reactionsOf(m).every((r) => r.actions.length === 1 && r.actions[0].type === 'NODE' && r.actions[0].navigation === 'CHANGE_TO')), 'excluded/shape: each reaction is one NODE action, CHANGE_TO');
}

/* ── matched ────────────────────────────────────────────────────────────────────────────────────────────── */
section('matched — each destination is the sibling matched on every other axis (part 2)');
{
  const bad: string[] = [];
  for (const d of componentDefs) {
    const map = rxOf(d);
    for (const [name, list] of map) for (const r of list) {
      const s = axesOf(name), t = axesOf(r.to);
      const others = [...s.keys()].filter((a) => a !== 'state');
      if (others.some((a) => s.get(a) !== t.get(a)) || t.get('state') !== (r.trigger === 'ON_HOVER' ? 'hover' : pressOf(d))) bad.push(`${d.id}: ${name} → ${r.to}`);
    }
  }
  ok(bad.length === 0, `matched/plan: every planned destination differs from its source on state alone (${bad.slice(0, 2).join('; ')})`);
  const w = await world(TAG);
  const wrong: string[] = [];
  for (const m of membersOf(w)) for (const line of named(w, m)) {
    const [trigger, to] = line.split('→');
    const s = axesOf(String(m.name)), t = axesOf(to);
    if (to === '?' || [...s.keys()].some((a) => a !== 'state' && s.get(a) !== t.get(a)) || t.get('state') !== (trigger === 'ON_HOVER' ? 'hover' : 'pressed')) wrong.push(`${m.name}: ${line}`);
  }
  ok(wrong.length === 0, `matched/host: on the built set every destination id is a sibling matched on every other axis (${wrong.slice(0, 2).join('; ')})`);
  ok(JSON.stringify(named(w, member(w, T('rest')))) === JSON.stringify([`ON_HOVER→${T('hover')}`, `ON_PRESS→${T('pressed')}`]), `matched/literal: ${T('rest')} reads its two reactions (${named(w, member(w, T('rest'))).join('; ')})`);
}

/* ── replaced ───────────────────────────────────────────────────────────────────────────────────────────── */
section('replaced — a member deleted by hand comes back with its reactions, and no sibling dangles');
{
  // The selected family: its Hover carries no translucent wash, which a member an update ADDS keeps at 100% (#2563,
  // pre-existing and filed), so this section reads reactions and nothing else.
  const S = (state: string): string => T(state, 'type=select, selection=selected, size=medium');
  const w = await world(TAG);
  const hover = member(w, S('hover'));
  const oldId = String(hover.id);
  (hover.remove as () => void)();
  const pre = await previewUpdate(w.host, targets(w, TAG));
  const p = pre.sets[0];
  ok(p.adds.includes(S('hover')) && p.states.some((s) => s.member === S('rest') && s.state === 'update'), `replaced/dry run: the Hover member is an add, and the Rest member that points at it is to update (${JSON.stringify(p.states.filter((s) => s.member === S('rest')))})`);
  const line = previewVerdict(pre).lines.find((l) => l.includes('prototype reactions') && l.includes('a member no longer in the set'));
  ok(!!line, `replaced/named: the dangling reaction is named (${line})`);
  const res = await applyUpdate(w.host, w.api as any, targets(w, TAG), previewHashOf(pre));
  ok(applyVerdict(res).ok, `replaced/apply: ${applyVerdict(res).headline} (${applyVerdict(res).lines.join(' | ')})`);
  const back = member(w, S('hover'));
  ok(!!back && String(back.id) !== oldId && JSON.stringify(named(w, back)) === JSON.stringify([`ON_PRESS→${S('pressed')}`]), `replaced/reactions back: the new Hover member (${back && String(back.id)}, was ${oldId}) changes to Pressed while pressing (${back ? named(w, back).join('; ') : 'absent'})`);
  const dangling = membersOf(w).flatMap((m) => named(w, m).filter((l) => l.endsWith('→?')).map((l) => `${m.name}: ${l}`));
  ok(dangling.length === 0 && named(w, member(w, S('rest'))).includes(`ON_HOVER→${S('hover')}`), `replaced/no dangling: every reaction in the set names a member of it, the Rest member's hover the new one (${dangling.slice(0, 2).join('; ')})`);
  const after = (await previewUpdate(w.host, targets(w, TAG))).sets[0];
  ok(after.counts.current === 45, `replaced/current: the next dry run reads all 45 current (${JSON.stringify(after.counts)})`);
}

/* ── orphan ─────────────────────────────────────────────────────────────────────────────────────────────── */
section('orphan — a destination the host still resolves, to a node with no parent, dangles (docs/18 §3)');
{
  const w = await world(TAG);
  const hover = member(w, T('hover'));
  (hover.remove as () => void)();
  // The host keeps a deleted node for undo: the lookup FINDS it, `removed: false`, `parent: null` (measured live).
  const orphan = { id: hover.id, name: hover.name, removed: false, parent: null };
  // Every other id resolves to the shim's own node, as the host's lookup would: the orphan is the one with no parent.
  (globalThis as any).figma = { getNodeByIdAsync: async (id: string) => (id === orphan.id ? orphan : membersOf(w).find((m) => String(m.id) === id) ?? null) };
  try {
    const p = (await previewUpdate(w.host, targets(w, TAG))).sets[0];
    const rest = p.states.find((s) => s.member === T('rest'));
    ok(p.states.length === 1 && rest?.state === 'update' && !p.handEdits.some((h) => h.member === T('rest')), `orphan/dangling: the Rest member reads to update, not hand-edited (${JSON.stringify(rest)}; ${JSON.stringify(p.handEdits.filter((h) => h.member === T('rest')))})`);
    // Where the member's state is otherwise decided BEFORE its reactions are read — no record, or a hand edit
    // elsewhere on it — the dangle still makes it "to update". The arm above cannot tell: a recorded, unedited member
    // reads "to update" for a reaction that differs, dangling or not.
    const restNode = member(w, T('rest'));
    const set = restNode.setSharedPluginData as (a: string, b: string, c: string) => void;
    const pd = restNode.getSharedPluginData as (a: string, b: string) => string;
    const record = pd(NS, BASELINE_KEY);
    set(NS, BASELINE_KEY, '');
    const nb = (await previewUpdate(w.host, targets(w, TAG))).sets[0];
    const nbRest = nb.states.find((s) => s.member === T('rest'));
    ok(nbRest?.state === 'update', `orphan/no record: with its record cleared, the dangling Rest member reads to update, not without a record (${JSON.stringify(nbRest)})`);
    set(NS, BASELINE_KEY, record);
    const child = (restNode.children as Node[])[0];
    const was = child.name;
    child.name = `${was} (renamed)`;
    const he = (await previewUpdate(w.host, targets(w, TAG))).sets[0];
    const heRest = he.states.find((s) => s.member === T('rest'));
    ok(heRest?.state === 'update' && !he.handEdits.some((h) => h.member === T('rest') && h.path === REACTIONS_PATH), `orphan/hand-renamed: with a layer renamed by hand, the dangling Rest member reads to update, its reactions never a hand edit (${JSON.stringify(heRest)}; ${JSON.stringify(he.handEdits.filter((h) => h.member === T('rest')))})`);
    child.name = was;
  } finally { delete (globalThis as any).figma; }
}

/* ── hand ───────────────────────────────────────────────────────────────────────────────────────────────── */
section('hand — a reaction removed by hand is a hand edit, with the usual choice (part 4)');
{
  const w = await world(TAG);
  const rest = member(w, T('rest'));
  const keepOnly = reactionsOf(rest).filter((r) => r.trigger.type === 'ON_PRESS');
  await (rest.setReactionsAsync as (r: unknown[]) => Promise<void>)(keepOnly);
  const p = (await previewUpdate(w.host, targets(w, TAG))).sets[0];
  ok(p.states.some((s) => s.member === T('rest') && s.state === 'handEdited') && p.handEdits.some((h) => h.member === T('rest') && h.path === REACTIONS_PATH), `hand/detected: the Rest member reads hand-edited at ${REACTIONS_PATH} (${JSON.stringify(p.handEdits)})`);
  ok(p.counts.handEdited === 1 && p.counts.current === 44, `hand/only it: one member hand-edited, the other 44 current (${JSON.stringify(p.counts)})`);
  // The default keeps it, and the next dry run still reports it.
  const kept = await confirm(w, TAG);
  ok(JSON.stringify(named(w, member(w, T('rest')))) === JSON.stringify([`ON_PRESS→${T('pressed')}`]), `hand/kept: the update leaves the designer's reactions as they are (${named(w, member(w, T('rest'))).join('; ')}; ${applyVerdict(kept.res).lines[0]})`);
  const again = (await previewUpdate(w.host, targets(w, TAG))).sets[0];
  ok(again.handEdits.some((h) => h.member === T('rest') && h.path === REACTIONS_PATH), `hand/still reported: the next dry run still lists it (${JSON.stringify(again.handEdits)})`);
  // Overwrite writes the plan's over it, and the member is then current.
  await confirm(w, TAG, { handEdits: 'overwrite' });
  ok(JSON.stringify(named(w, member(w, T('rest')))) === JSON.stringify([`ON_HOVER→${T('hover')}`, `ON_PRESS→${T('pressed')}`]), `hand/overwritten: overwrite puts the plan's reactions back (${named(w, member(w, T('rest'))).join('; ')})`);
  const last = (await previewUpdate(w.host, targets(w, TAG))).sets[0];
  ok(last.counts.current === 45, `hand/current: then all 45 current (${JSON.stringify(last.counts)})`);
}

/* ── converge ───────────────────────────────────────────────────────────────────────────────────────────── */
section('converge — a set built before reactions existed is updated once, then reads up to date');
{
  const w = await world(TAG);
  // As an earlier plugin left it: no reactions, records that never held them, and the revision before this one.
  for (const m of membersOf(w)) {
    await (m.setReactionsAsync as (r: unknown[]) => Promise<void>)([]);
    const pd = m.getSharedPluginData as (a: string, b: string) => string;
    const set = m.setSharedPluginData as (a: string, b: string, c: string) => void;
    const rec = JSON.parse(pd(NS, BASELINE_KEY));
    delete rec.reactions;
    set(NS, BASELINE_KEY, JSON.stringify(rec));
    set(NS, STAMP_KEY, pd(NS, STAMP_KEY).replace(/\|\d+$/, `|${EXECUTOR_REVISION - 1}`));
  }
  ok(membersOf(w).every((m) => reactionsOf(m).length === 0), 'premise: no member carries a reaction');
  const { pre, res } = await confirm(w, TAG);
  const lines = previewVerdict(pre).lines.filter((l) => l.includes('prototype reactions'));
  ok(lines.length === 2 && lines.some((l) => l === `tag · the member · prototype reactions: the plan says While hovering → state=hover; While pressing → state=pressed, the file has none (9 members).`)
    && lines.some((l) => l === `tag · the member · prototype reactions: the plan says While pressing → state=pressed, the file has none (9 members).`), `converge/dry run: the missing reactions are named, plan against file (${lines.join(' | ')})`);
  ok(pre.sets[0].handEdits.length === 0, `converge/no hand edits: a record from before reactions claims nothing about them (${JSON.stringify(pre.sets[0].handEdits.slice(0, 2))})`);
  ok(applyVerdict(res).ok, `converge/apply: ${applyVerdict(res).headline} (${applyVerdict(res).lines.join(' | ')})`);
  const total = membersOf(w).reduce((k, m) => k + reactionsOf(m).length, 0);
  ok(total === 27, `converge/written: the update writes all 27 reactions (${total})`);
  const next = await previewUpdate(w.host, targets(w, TAG));
  ok(previewVerdict(next).headline === '✓ All sets up to date' && next.sets[0].counts.current === 45, `converge/up to date: the next dry run reads ${previewVerdict(next).headline} (${JSON.stringify(next.sets[0].counts)})`);
  ok(membersOf(w).every((m) => typeof JSON.parse((m.getSharedPluginData as (a: string, b: string) => string)(NS, BASELINE_KEY)).reactions === 'string'), 'converge/recorded: every member\'s record now holds its reactions');
}

/* ── touch ──────────────────────────────────────────────────────────────────────────────────────────────── */
// REST KEEPS WHILE PRESSING (owner decision Q344, #2733, reverting #2703). A touch prototype has no hover, so Rest's own
// press reaction is the only route to Pressed. A Rest member carries While hovering → Hover AND While pressing →
// Pressed; a Hover member While pressing → Pressed. A file built under #2703's hover-only plan has Rest WITHOUT its
// press, AND a record that agrees (that executor wrote and recorded what it planned). That member is no hand edit: the
// update names it and puts the press back in place. Expectations are literal, per state, read off the shim.
// Mutation: the Rest press dropped from `reactionMap` → `touch/rest`, `touch/dry run`, `touch/restored`.
section('touch — Rest keeps While pressing, and a file built under the hover-only plan gets it back in place');
{
  const WANT: Record<string, string[]> = { rest: ['ON_HOVER→hover', 'ON_PRESS→pressed'], hover: ['ON_PRESS→pressed'] };
  const byState = (w: World): string[] => membersOf(w).flatMap((m) => {
    const s = axesOf(String(m.name)).get('state')!;
    const got = named(w, m).map((l) => { const [t, to] = l.split('→'); return `${t}→${to === '?' ? '?' : axesOf(to).get('state')}`; });
    return JSON.stringify(got) === JSON.stringify(WANT[s] ?? []) ? [] : [`${m.name}: ${got.join('; ') || 'none'}`];
  });
  for (const id of ['tag', 'button', 'checkbox-control']) {
    const w = await world(id);
    const off = byState(w);
    ok(off.length === 0, `touch/rest: on a fresh ${id} build every Rest member reads [While hovering → hover, While pressing → pressed], every Hover [While pressing → pressed], every other state none (${off.slice(0, 2).join(' | ')})`);
  }
  // As #2703's plugin left a tag set: every Rest member's press removed, recorded so, older revision.
  const w = await world(TAG);
  let seeded = 0;
  for (const m of membersOf(w)) {
    if (axesOf(String(m.name)).get('state') !== 'rest') continue;
    await (m.setReactionsAsync as (r: unknown[]) => Promise<void>)(reactionsOf(m).filter((r) => r.trigger.type !== 'ON_PRESS'));
    await writeBaseline(m);
    const pd = m.getSharedPluginData as (a: string, b: string) => string;
    (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, pd(NS, STAMP_KEY).replace(/\|\d+$/, `|${EXECUTOR_REVISION - 1}`));
    seeded++;
  }
  const S = (state: string): string => T(state, 'type=select, selection=selected, size=large');
  ok(seeded === 9 && JSON.stringify(named(w, member(w, S('rest')))) === JSON.stringify([`ON_HOVER→${S('hover')}`]), `premise: 9 Rest members seeded hover-only, ${S('rest')} among them (${named(w, member(w, S('rest'))).join('; ')})`);
  const { pre, res } = await confirm(w, TAG);
  const lines = previewVerdict(pre).lines.filter((l) => l.includes('prototype reactions'));
  ok(lines.length === 1 && lines[0] === 'tag · the member · prototype reactions: the plan says While hovering → state=hover; While pressing → state=pressed, the file has While hovering → state=hover (9 members).',
    `touch/dry run: the missing press reaction on Rest is named as a reaction difference (${lines.join(' | ')})`);
  ok(pre.sets[0].handEdits.length === 0 && pre.sets[0].states.filter((x) => x.state === 'update').length === 9, `touch/not hand-edited: the 9 Rest members read to update, none hand-edited (${JSON.stringify(pre.sets[0].counts)}; ${JSON.stringify(pre.sets[0].handEdits.slice(0, 2))})`);
  ok(applyVerdict(res).ok, `touch/apply: ${applyVerdict(res).headline} (${applyVerdict(res).lines.join(' | ')})`);
  const off = byState(w);
  ok(off.length === 0 && JSON.stringify(named(w, member(w, S('rest')))) === JSON.stringify([`ON_HOVER→${S('hover')}`, `ON_PRESS→${S('pressed')}`]), `touch/restored: after the update every Rest member presses to Pressed again, ${S('rest')} included (${off.slice(0, 2).join(' | ')}; ${named(w, member(w, S('rest'))).join('; ')})`);
  const next = await previewUpdate(w.host, targets(w, TAG));
  ok(previewVerdict(next).headline === '✓ All sets up to date' && next.sets[0].counts.current === 45, `touch/up to date: the second dry run reads ${previewVerdict(next).headline} (${JSON.stringify(next.sets[0].counts)})`);
}

/* ── all three ──────────────────────────────────────────────────────────────────────────────────────────── */
// One run whose work is reactions to repair (#2466), sets to move on their page (#2542) and component pages out of order
// (#2568): one named version for all of it, all of it done, and the confirm's hash covering each. Three in-scope sets
// on one page. The tag set as an earlier plugin left it (no reactions, records that never held them); the tab set's
// Rest member with a reaction that dangles. The title, orders and counts are literals. Mutations: the reactions dropped
// from a set's fingerprint (`update-plan.ts`) → `all three/hash, reactions`; the set's move dropped from `previewHashOf`
// → `all three/hash, set`; the page list dropped from it → `all three/hash, page`.
section('all three — reactions, set moves and page reorders in one run: one version, all done, all in the hash');
{
  const IDS = ['tag', 'tab-item', 'switch-control'];
  const plansBy = new Map(IDS.map((id) => [id, plansOf(id)] as const));
  const all = [...plansBy.values()].flat();
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set([...all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0'])],
    styles: [...new Set(all.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(all.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...all.flatMap((p) => planComps(p.root))])],
    page, liveRoot: true, identities: true, scaleConstrained: true,
  }) as any;
  for (const id of IDS) { const r = await applyComponentPlan(plansBy.get(id)!, api); if (r.misses.length) throw new Error(`premise: ${id} built with ${r.misses.length} miss(es): ${r.misses[0]}`); }
  const sets = page.children.filter((n) => n.type === 'COMPONENT_SET') as Node[];
  for (const set of sets) (set as { parent?: unknown }).parent = page;
  const fresh = sets.map((n) => [Number(n.x), Number(n.y)]);
  for (let k = 1; k < sets.length; k++) sets[k].x = Number(sets[k - 1].x) + Number(sets[k - 1].width) + 100;
  type P = { name: string; isPageDivider?: boolean; appendChild(): void };
  const pg = (name: string, isPageDivider = false): P => ({ name, isPageDivider, appendChild() {} });
  const pages: P[] = [pg('Cover'), pg('---', true), pg('Components'), pg('↳ Tabs'), pg('↳ Badge'), pg('↳ Divider')];
  const host = { ...api, root: { ...api.root,
    findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)),
    get children() { return pages; }, insertChild(i: number, p: P) { pages.splice(pages.indexOf(p), 1); pages.splice(i, 0, p); } } } as unknown as ApplyHost;
  const names = () => pages.map((p) => p.name);
  const targets = IDS.map((id) => ({ def: id, plans: plansBy.get(id)! }));
  const [tagSet, tabSet] = sets;
  const kids = (s: Node): Node[] => s.children as Node[];
  const pd = (m: Node, k: string): string => (m.getSharedPluginData as (a: string, b: string) => string)(NS, k);
  const put = (m: Node, k: string, v: string): void => (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, k, v);
  for (const m of kids(tagSet)) {
    await (m.setReactionsAsync as (r: unknown[]) => Promise<void>)([]);
    const rec = JSON.parse(pd(m, BASELINE_KEY)); delete rec.reactions; put(m, BASELINE_KEY, JSON.stringify(rec));
  }
  const TAB_REST = kids(tabSet).find((m) => axesOf(String(m.name)).get('state') === 'rest')!;
  const dangle = (transition: unknown) => (TAB_REST.setReactionsAsync as (r: unknown[]) => Promise<void>)(
    reactionsOf(TAB_REST).map((r) => (r.trigger.type === 'ON_HOVER' ? { ...r, actions: r.actions.map((a) => ({ ...a, destinationId: 'gone:1', transition })) } : r)));
  await dangle(null);
  const pre = await previewUpdate(host, targets);
  const stateOf = (set: string, member: string) => pre.sets.find((p) => p.set === set)?.states.find((s) => s.member === member)?.state;
  ok(JSON.stringify(pre.sets.filter((p) => p.setMove).map((p) => p.set)) === JSON.stringify(['tab-item', 'switch-control'])
    && JSON.stringify(pre.pages) === JSON.stringify(['↳ Tabs'])
    && pre.sets[0].counts.update === 18 && stateOf('tab-item', String(TAB_REST.name)) === 'update',
    `all three/dry run: 18 tag members and the dangling tab member to update, the 2 later sets to move, Tabs to reorder (${JSON.stringify(pre.sets.map((p) => [p.set, p.counts.update, !!p.setMove]))}; ${JSON.stringify(pre.pages)})`);
  // THE HASH covers all three: each changed after the check refuses the confirm, and nothing is saved or written.
  const refused = async (label: string, change: () => Promise<void> | void, undo: () => Promise<void> | void): Promise<void> => {
    const p = await previewUpdate(host, targets);
    await change();
    const v = api._versions.length;
    const r = await applyUpdate(host, api, targets, previewHashOf(p));
    ok(!!r.refusedAll && api._versions.length === v, `all three/hash, ${label} (${r.refusedAll ?? 'applied'})`);
    await undo();
  };
  // A transition is in a reaction's key and not in its words, so the preview's text reads the same: only the hash sees it.
  await refused('reactions: a reaction changed since the check refuses the confirm', () => dangle({ type: 'DISSOLVE', duration: 0.2 }), () => dangle(null));
  const x2 = Number(sets[2].x);
  await refused('set: a set moved since the check refuses the confirm', () => { sets[2].x = x2 + 50; }, () => { sets[2].x = x2; });
  await refused('page: a page moved since the check refuses the confirm', () => { const d = pages.splice(5, 1)[0]; pages.splice(4, 0, d); }, () => { const b = pages.splice(5, 1)[0]; pages.splice(4, 0, b); });
  // THE RUN: one named version, then every set's reactions, every set's place, and the page order.
  const go = await previewUpdate(host, targets);
  const res = await applyUpdate(host, api, targets, previewHashOf(go));
  ok(JSON.stringify(api._versions) === JSON.stringify(['Saved before Prism3 updated 3 sets']),
    `all three/version: one named version, naming the sets and the page order (${JSON.stringify(api._versions)})`);
  const byName = (s: Node, n: Node): string[] => {
    const ids = new Map(kids(s).map((m) => [String(m.id), String(m.name)] as const));
    return reactionsOf(n).flatMap((r) => r.actions.map((a) => `${r.trigger.type}→${ids.get(a.destinationId) ?? '?'}`)).sort();
  };
  const tagTotal = kids(tagSet).reduce((k, m) => k + reactionsOf(m).length, 0);
  const tabRest = kids(tabSet).find((m) => axesOf(String(m.name)).get('state') === 'rest' && String(m.name) === String(TAB_REST.name))!;
  const sib = (state: string): string => String(TAB_REST.name).replace('state=rest', `state=${state}`);
  ok(tagTotal === 27 && JSON.stringify(byName(tabSet, tabRest)) === JSON.stringify([`ON_HOVER→${sib('hover')}`, `ON_PRESS→${sib('pressed')}`]),
    `all three/reactions: the 27 tag reactions written and the tab Rest member's hover repaired (${tagTotal}; ${byName(tabSet, tabRest).join('; ')})`);
  ok(JSON.stringify(sets.map((n) => [Number(n.x), Number(n.y)])) === JSON.stringify(fresh)
    && JSON.stringify(names()) === JSON.stringify(['Cover', '---', 'Components', '↳ Badge', '↳ Divider', '↳ Tabs']),
    `all three/moved: each set where a fresh build put it, and the pages in order (${JSON.stringify(sets.map((n) => Number(n.x)))}; ${JSON.stringify(names())})`);
  const next = await previewUpdate(host, targets);
  ok(applyVerdict(res).ok && previewVerdict(next).headline === '✓ All sets up to date' && !next.pages,
    `all three/converges: ${applyVerdict(res).headline} (${applyVerdict(res).lines.join(" | ")}); the next dry run reads ${previewVerdict(next).headline}`);
}

console.log(failed ? `\n✗ ${failed} of ${executed} assertions failed` : `\n✓ all passed — ${executed} assertions executed`);
if (failed) process.exit(1);
