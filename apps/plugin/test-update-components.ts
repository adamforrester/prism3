/**
 * THE UPDATE DRY RUN AND THE AS-BUILT BASELINE (#2265, owner decision Q85 A) — against the in-memory shim.
 *
 * Every set here is BUILT by the real executor (`applyComponentPlan`) into the shim, then read back the way
 * `update-components` reads a file. Nothing is hand-assembled on the host side except the edit under test,
 * so the baseline each case compares against is the one the build wrote. Cases that move only names or
 * stamps edit a copy of the read view, which `dryRunSet` takes as plain data; cases that edit a node edit
 * the shim's node and go through `previewUpdate` / `captureBaselines`, the functions `main.ts` calls.
 *
 * What each section pins, and the mutation it was checked against (each fails the assertion it names):
 *
 *   fresh/…        a fresh build reads current, every member with a baseline. Mutation: `writeBaseline`
 *                  dropped from the set path → `fresh/baseline`.
 *   edit/…         a binding changed by hand reads handEdited at its path. Mutation: `nodeSignature` stops
 *                  reading bindings → `edit/detected`.
 *   theme/…        what Apply Theme moves (values behind a binding, derived geometry) is NOT a hand edit.
 *                  Mutation: the signature hashes a bound field's value → `theme/no hand edits`.
 *   edit/…         also: with no plan or executor change, a hand edit is never a conflict — the update would
 *                  write nothing over it. Mutation: the `moved` condition dropped → `edit/path`.
 *   plan/…         a plan change on an unedited member reads `update` with its field change, and with a hand
 *                  edit on the same node, a conflict. Mutation: `touched` never filled → `plan/conflict`.
 *   order/…        set-child order and segment order do not move a match. Mutation: match on the raw name →
 *                  `order/permuted`.
 *   ledger/…       a declared value rename is a rename; undeclared, a drop beside an add and a possible
 *                  rename. Mutation: `renameCoordinate` skipped → `ledger/declared`.
 *   drop/…         a member the plan no longer has is a drop, and the update needs a choice. Mutation: drops
 *                  left out of `needsChoice` → `drop/needs choice`.
 *   rev/…          an older executor revision reads update (re-applied); a stamp without one, revisionUnknown.
 *                  Mutation: the revision not compared → `rev/older`. All 45 re-applied is also the check that a
 *                  GLYPH's imported vectors are not read as children to remove (30 of 45 were, before).
 *   capture/…      also: each record lands on the member it was read from, not by id (the shim's nodes share one).
 *   axis/…         an added axis lands members on the first plan's value; a removed axis keeps the default's
 *                  members and collapses the rest.
 *   blocked/…      a duplicate coordinate refuses the set.
 *   writes/…       the dry run writes nothing: plugin data and node fields identical before and after.
 *   capture/…      the one-time capture records only members that read back as the current plan, and never
 *                  touches a stamp. Mutation: the diff check dropped from `captureVerdict` → `capture/refuses`.
 *
 * Run: `npx tsx apps/plugin/test-update-components.ts`
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, planComponentName } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import type { ComponentRename } from '@prism3/engine/component-renames';
import { applyComponentPlan, STAMP_KEY } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { NS } from './src/persist-figma';
import { BASELINE_KEY } from './src/member-baseline';
import { makeShim, type Node, type Page } from './component-shim';
import {
  readSetView, dryRunSet, hostPorts, previewUpdate, captureBaselines, previewVerdict,
  type HostSetView, type HostMember, type UpdateHost, type SetPreview,
} from './src/update-plan';

let failed = 0;
let executed = 0;
const ok = (cond: boolean, label: string): void => {
  executed++;
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};
const section = (s: string) => console.log(`\n${s}`);

const defOf = (id: string) => {
  const d = componentDefs.find((x) => x.id === id);
  if (!d) throw new Error(`no def ${id}`);
  return d;
};
const plansOf = (id: string): AnatomyPlan[] => figmaAnatomySet(defOf(id), { swapTarget: SWAP_TARGET });

type Built = { shim: UpdateHost & Record<string, any>; set: Node; plans: AnatomyPlan[]; ports: Awaited<ReturnType<typeof hostPorts>> };
/** Every component a plan set reaches for, from the plans: `test-write-components.ts`'s construction. */
const planComps = (n: { swapTarget?: string; nestTarget?: string; children?: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []),
  ...(n.nestTarget ? [n.nestTarget] : []),
  ...((n.children ?? []) as (typeof n)[]).flatMap(planComps),
];
/** A fresh file holding one set, built by the executor. Every name the plans reach for is in the file. */
const build = async (id: string, plans = plansOf(id)): Promise<Built> => {
  const page: Page = { children: [] };
  const shim = makeShim({
    // `space/0` is in no plan: it is the variable the hand edits below bind to.
    vars: [...new Set([...plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0'])],
    styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root))])],
    page,
    liveRoot: true,
  }) as any;
  const built = await applyComponentPlan(plans, shim);
  // A build that missed is a harness fault; the dry run would then be reading a set the executor never finished.
  if (built.misses.length) throw new Error(`premise: ${id} built with ${built.misses.length} miss(es): ${built.misses[0]}`);
  const set = page.children.find((n) => n.type === 'COMPONENT_SET') as Node;
  // The shim's criteria search answers the EXECUTOR's lookup with name-only references (#681), which is
  // the question that search is modeled for. The update reads the sets themselves, as Figma returns them,
  // so this host's search hands back the page's live nodes; the catalogues stay the shim's.
  const host = {
    ...shim,
    root: { findAllWithCriteria: (c: { types: string[] }) => page.children.filter((n) => c.types.includes(String(n.type))) },
  };
  return { shim: host, set, plans, ports: await hostPorts(host) };
};
const membersOf = (set: Node): Node[] => set.children as Node[];
/** A member's child by name. */
const childNamed = (n: Node, name: string): Node => (n.children as Node[]).find((c) => c.name === name)!;
type PlanNode = AnatomyPlan['root'];
const planChild = (n: PlanNode, name: string): PlanNode => n.children!.find((c) => c.name === name)!;
const memberNamed = (set: Node, pred: (name: string) => boolean): Node => membersOf(set).find((m) => pred(String(m.name)))!;
const varId = async (b: Built, name: string): Promise<string> => {
  // The shim roots every variable name under a foreign root and keys its id on the plan's name (#1097).
  const v = (await b.shim.variables.getLocalVariablesAsync()).find((x: { name: string }) => x.name.endsWith(`/${name}`));
  if (!v) throw new Error(`no variable ${name}`);
  return v.id;
};
/** The view with its members rewritten, everything else kept. */
const withMembers = (v: HostSetView, f: (ms: HostMember[]) => HostMember[]): HostSetView => ({ ...v, members: f(v.members) });
const setValue = (name: string, axis: string, value: string): string =>
  name.split(', ').map((s) => (s.startsWith(`${axis}=`) ? `${axis}=${value}` : s)).join(', ');

console.log('update dry run + as-built baseline (#2265) — against the in-memory shim\n');

// The subject is TAG: 45 members on four axes, small enough to rebuild per case, with nested frames and
// bindings on every level. BUTTON, the 432-member set the NB library publishes, runs once at full size.
const TAG = 'tag';

/* ── fresh ───────────────────────────────────────────────────────────────────────────────────────────── */
section('fresh — a set the executor just built reads current, every member carrying its baseline');
{
  const b = await build('button');
  const view = await readSetView(b.set as any);
  ok(view.members.length === 432 && view.others.length === 0, `fresh/read: 432 coordinate members read, none set aside (${view.members.length}, ${view.others.length})`);
  ok(view.members.every((m) => m.baseline !== null && Object.keys(m.baseline.nodes).length >= 2),
    `fresh/baseline: every member carries an as-built record with its nodes (${view.members.filter((m) => m.baseline).length} of ${view.members.length})`);
  ok(view.members.every((m) => m.stamp.split('|').length === 3), 'fresh/stamp: every stamp has its three fields');
  const p = dryRunSet('button', b.plans, view, b.ports);
  ok(p.counts.current === 432 && p.counts.update + p.counts.handEdited + p.counts.noBaseline + p.counts.add + p.counts.drop === 0 && !p.blockers.length,
    `fresh/current: all 432 current, nothing to add, drop or update (${JSON.stringify(p.counts)})`);
  ok(Object.values(p.properties).every((l) => l.length === 0), `fresh/properties: the set's properties are as planned (${JSON.stringify(p.properties).slice(0, 120)})`);
  ok(p.needsChoice.length === 0 && /^✓ All sets up to date$/.test(previewVerdict({ sets: [p], missing: [], refused: [] }).headline), 'fresh/verdict: up to date, nothing to choose');
}

/* ── edit ────────────────────────────────────────────────────────────────────────────────────────────── */
section('edit — a binding changed by hand reads as a hand edit at its path');
{
  const b = await build(TAG);
  const m = membersOf(b.set)[3];
  const content = childNamed(m, 'content');
  ok(!!content, 'premise: the member has its content frame');
  (content.setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: await varId(b, 'space/0') });
  const r = await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }]);
  const p = r.sets[0];
  ok(p.counts.handEdited === 1 && p.counts.current === 44, `edit/detected: one member hand-edited, the other 44 current (${p.counts.handEdited}, ${p.counts.current})`);
  ok(p.handEdits.length === 1 && p.handEdits[0].member === m.name && p.handEdits[0].path === 'content' && !p.handEdits[0].structural && !p.handEdits[0].conflict,
    `edit/path: the edit is reported on that member at 'content', not structural, no conflict (${JSON.stringify(p.handEdits)})`);
  ok(p.needsChoice.includes('handEdits'), 'edit/needs choice: a hand edit is a choice the update asks for');
  // A child added by hand is structural: the member's paths can no longer be trusted node by node.
  const extra = (b.shim.createFrame as () => Node)();
  extra.name = 'designer note';
  (membersOf(b.set)[5].appendChild as (c: Node) => void)(extra);
  const p2 = (await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }])).sets[0];
  const added = p2.handEdits.filter((h) => h.member === membersOf(b.set)[5].name);
  ok(added.length >= 1 && added.every((h) => h.structural) && added.some((h) => h.path === 'designer note'),
    `edit/structural: a child added by hand reads as a structural edit at its path (${JSON.stringify(added)})`);
}

/* ── theme ───────────────────────────────────────────────────────────────────────────────────────────── */
section('theme — what Apply Theme moves is not a hand edit');
{
  const b = await build(TAG);
  // Apply Theme moves each variable's VALUE: a bound number reads a new number, a bound paint a new color,
  // and auto-layout re-derives every unbound size and position. The bindings themselves stay.
  let moved = 0;
  const walk = (n: Node): void => {
    const bv = (n.boundVariables ?? {}) as Record<string, unknown>;
    // A field the shim models as a getter (an instance's measured size) is the host's to move, not ours.
    const nudge = (k: string, by: number): void => { try { n[k] = (n[k] as number) + by; moved++; } catch { /* getter only */ } };
    for (const k of Object.keys(bv)) if (typeof n[k] === 'number') nudge(k, 3);
    for (const k of ['width', 'height', 'x', 'y']) if (typeof n[k] === 'number' && !bv[k]) nudge(k, 7);
    for (const f of ['fills', 'strokes']) {
      const paints = n[f];
      if (Array.isArray(paints)) n[f] = paints.map((p: any) => (p?.boundVariables?.color ? { ...p, color: { r: 0.11, g: 0.22, b: 0.33 } } : p));
    }
    for (const c of (n.children as Node[] | undefined) ?? []) walk(c);
  };
  for (const m of membersOf(b.set)) walk(m);
  ok(moved > 200, `premise: the theme moved values on many nodes (${moved})`);
  const p = (await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }])).sets[0];
  ok(p.handEdits.length === 0 && p.counts.current === 45, `theme/no hand edits: every member still current after the values moved (${p.handEdits.length} edits, ${p.counts.current} current)`);
}

/* ── plan ────────────────────────────────────────────────────────────────────────────────────────────── */
section('plan — a plan change reads as an update, and as a conflict where a hand edit sits on the same node');
{
  const b = await build(TAG);
  // The engine moves `content`'s gap to `space/999`, a name no plan uses, on every member.
  const next = (b.plans.map((p) => JSON.parse(JSON.stringify(p))) as AnatomyPlan[]);
  for (const p of next) (planChild(p.root, 'content').bound as Record<string, string>).itemSpacing = 'space/999';
  ok(b.plans.every((p) => /^space\/\d+$/.test(String(planChild(p.root, 'content').bound?.itemSpacing)) && planChild(p.root, 'content').bound?.itemSpacing !== 'space/999'), 'premise: every built plan binds content\'s gap to a space step other than space/999');
  const p = (await previewUpdate(b.shim, [{ def: TAG, plans: next }])).sets[0];
  ok(p.counts.update === 45 && p.counts.handEdited === 0, `plan/update: every member reads update, none hand-edited (${p.counts.update}, ${p.counts.handEdited})`);
  // `diffAnatomy` reports a node's bindings as one field, so members whose paddings differ by size list the
  // gap change under separate entries. Together they cover every member, each ending at space/999.
  const cs = p.changes.filter((x) => x.part === 'content' && x.field === 'bound');
  ok(cs.reduce((k, x) => k + x.members, 0) === 45 && cs.every((x) => /itemSpacing→\S*space\/\d+/.test(x.from) && /itemSpacing→space\/999/.test(x.to)),
    `plan/change: the change is listed on 'content' for all 45, each ending at space/999 (${cs.length} entries: ${JSON.stringify(cs[0]).slice(0, 200)})`);
  ok(p.counts.reapplied === 0, 'plan/not reapplied: a member with a visible change is not counted as a bare re-apply');
  // Now a hand edit on that same node, on one member.
  const m = membersOf(b.set)[2];
  (childNamed(m, 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: await varId(b, 'space/0') });
  const p2 = (await previewUpdate(b.shim, [{ def: TAG, plans: next }])).sets[0];
  const he = p2.handEdits.find((h) => h.member === m.name);
  ok(p2.counts.handEdited === 1 && !!he && he.path === 'content' && he.conflict === true,
    `plan/conflict: the hand edit on the node the plan changes reads as a conflict (${JSON.stringify(he)})`);
}

/* ── order ───────────────────────────────────────────────────────────────────────────────────────────── */
section('order — neither the set\'s child order nor a name\'s segment order moves a match');
{
  const b = await build(TAG);
  const view = await readSetView(b.set as any);
  const permuted = withMembers(view, (ms) => [...ms].reverse().map((m) => ({ ...m, name: m.name.split(', ').reverse().join(', ') })));
  ok(permuted.members[0].name !== view.members[0].name && permuted.members[1].name.split(', ')[0].startsWith('state='), `premise: members reversed and every name's segments reversed (${permuted.members[1].name})`);
  const p = dryRunSet(TAG, b.plans, permuted, b.ports);
  ok(p.counts.current === 45 && p.counts.add === 0 && p.counts.drop === 0 && p.renames.length === 0,
    `order/permuted: all 45 still current, no add, drop or rename (${JSON.stringify(p.counts)})`);
}

/* ── ledger ──────────────────────────────────────────────────────────────────────────────────────────── */
section('ledger — a declared rename is a rename; an undeclared one is a drop beside an add');
{
  const b = await build(TAG);
  const view = await readSetView(b.set as any);
  // The file still says `size=sm` where the plan now says `size=small`.
  const old = withMembers(view, (ms) => ms.map((m) => (m.name.includes('size=small') ? { ...m, name: setValue(m.name, 'size', 'sm') } : m)));
  const n = view.members.filter((m) => m.name.includes('size=small')).length;
  ok(n > 5, `premise: ${n} members carry size=small`);
  const ledger: ComponentRename[] = [{ def: TAG, kind: 'value', axis: 'size', from: 'sm', to: 'small', issue: 2265 }];
  const p = dryRunSet(TAG, b.plans, old, b.ports, ledger);
  ok(p.renames.length === n && p.drops.length === 0 && p.adds.length === 0 && p.renames.every((r) => r.from.includes('size=sm') && r.to.includes('size=small')),
    `ledger/declared: ${n} renamed in place, nothing dropped or added (${p.renames.length}, ${p.drops.length}, ${p.adds.length})`);
  ok(p.counts.current === 45, `ledger/declared: and each renamed member still reads current against its plan (${p.counts.current})`);
  const q = dryRunSet(TAG, b.plans, old, b.ports, []);
  ok(q.drops.length === n && q.adds.length === n && q.renames.length === 0, `ledger/undeclared: without the entry, ${n} drops and ${n} adds (${q.drops.length}, ${q.adds.length})`);
  ok(q.possibleRenames.length >= n && q.possibleRenames.some((r) => r.from.includes('size=sm') && r.to === setValue(r.from, 'size', 'small')),
    `ledger/undeclared: each drop is offered as a possible rename, never acted on (${q.possibleRenames.length})`);
}

/* ── drop ────────────────────────────────────────────────────────────────────────────────────────────── */
section('drop — a member the plan no longer has is a drop, and the update needs a choice');
{
  const b = await build(TAG);
  const view = await readSetView(b.set as any);
  const fewer = b.plans.filter((p) => !planComponentName(p).includes('state=rest'));
  const n = b.plans.length - fewer.length;
  const p = dryRunSet(TAG, fewer, view, b.ports);
  ok(p.drops.length === n && p.counts.drop === n && p.drops.every((d) => d.includes('state=rest')), `drop/listed: the ${n} state=rest members are drops (${p.drops.length})`);
  ok(p.needsChoice.includes('drops'), `drop/needs choice: a drop is a choice the update asks for (${p.needsChoice.join(', ')})`);
  ok(/to mark deprecated/.test(previewVerdict({ sets: [p], missing: [], refused: [] }).summary), 'drop/words: the summary says they would be marked deprecated, not deleted');
}

/* ── rev ─────────────────────────────────────────────────────────────────────────────────────────────── */
section('rev — the executor revision in the stamp (#1098)');
{
  const b = await build(TAG);
  const view = await readSetView(b.set as any);
  const older = withMembers(view, (ms) => ms.map((m) => ({ ...m, stamp: m.stamp.replace(/\|[^|]*$/, '|0') })));
  const p = dryRunSet(TAG, b.plans, older, b.ports);
  ok(p.counts.update === 45 && p.counts.reapplied === 45 && p.changes.some((c) => c.field === 'stamp' && c.members === 45),
    `rev/older: an older revision reads update, all re-applied with no field difference (${p.counts.update}, ${p.counts.reapplied})`);
  const twoField = withMembers(view, (ms) => ms.map((m) => ({ ...m, stamp: m.stamp.split('|').slice(0, 2).join('|') })));
  const q = dryRunSet(TAG, b.plans, twoField, b.ports);
  ok(q.counts.revisionUnknown === 45 && q.counts.update === 0, `rev/unknown: a stamp from before the revision reads revisionUnknown (${q.counts.revisionUnknown})`);
  const bare = withMembers(view, (ms) => ms.map((m, i) => (i === 7 ? { ...m, stamp: '' } : m)));
  const r = dryRunSet(TAG, b.plans, bare, b.ports);
  ok(r.counts.unstamped === 1 && r.counts.current === 44, `rev/unstamped: a member with no stamp is reported and left alone (${r.counts.unstamped})`);
  const noBase = withMembers(view, (ms) => ms.map((m, i) => (i === 7 ? { ...m, baseline: null } : m)));
  const s = dryRunSet(TAG, b.plans, noBase, b.ports);
  ok(s.counts.noBaseline === 1 && s.needsChoice.includes('noBaseline'), `rev/no baseline: a member with no as-built record needs a choice (${s.counts.noBaseline})`);
}

/* ── axis ────────────────────────────────────────────────────────────────────────────────────────────── */
section('axis — an added axis and a removed one');
{
  const b = await build(TAG);
  const view = await readSetView(b.set as any);
  // Added: the file predates the `type` axis. It holds the members on the first plan's type value, without
  // the segment; the plan now has both values.
  const first = planComponentName(b.plans[0]).split(', ').find((s) => s.startsWith('type='))!;
  const strip = (name: string) => name.split(', ').filter((s) => !s.startsWith('type=')).join(', ');
  const pre = withMembers(view, (ms) => ms.filter((m) => m.name.split(', ').includes(first)).map((m) => ({ ...m, name: strip(m.name) })));
  const kept = pre.members.length;
  const p = dryRunSet(TAG, b.plans, pre, b.ports);
  ok(kept > 0 && p.renames.length === kept && p.adds.length === 45 - kept && p.drops.length === 0 && p.renames.every((r) => r.to.includes(first)),
    `axis/added: the ${kept} members land on ${first} as renames, the other ${45 - kept} are adds (${p.renames.length}, ${p.adds.length}, ${p.drops.length})`);
  // Removed: the file has an `extra` axis the plan dropped. The default's value (a) is kept; b collapses.
  const wide = withMembers(view, (ms) => [
    ...ms.map((m) => ({ ...m, name: `${m.name}, extra=a` })),
    ...ms.map((m) => ({ ...m, id: `${m.id}b`, name: `${m.name}, extra=b` })),
  ]);
  const q = dryRunSet(TAG, b.plans, wide, b.ports);
  ok(q.drops.length === 45 && q.drops.every((d) => d.endsWith('extra=b')) && q.needsChoice.includes('axisCollapse') && q.counts.current === 45,
    `axis/removed: extra=a members kept and current, the 45 extra=b members collapse and need a choice (${q.drops.length}, ${q.needsChoice.join(', ')})`);
}

/* ── blocked ─────────────────────────────────────────────────────────────────────────────────────────── */
section('blocked — a set the update cannot read safely is refused, not guessed at');
{
  const b = await build(TAG);
  const view = await readSetView(b.set as any);
  const dup = withMembers(view, (ms) => ms.map((m, i) => (i === 1 ? { ...m, name: ms[0].name } : m)));
  const p = dryRunSet(TAG, b.plans, dup, b.ports);
  ok(p.blockers.some((x) => /share the coordinate/.test(x)), `blocked/duplicate: two members on one coordinate block the set (${p.blockers[0]?.slice(0, 60)})`);
  const v = previewVerdict({ sets: [p], missing: [], refused: [] });
  ok(v.ok === false && /can't be checked/.test(v.headline), `blocked/verdict: the verdict is a failure naming it (${v.headline})`);
}

/* ── writes ──────────────────────────────────────────────────────────────────────────────────────────── */
section('writes — the dry run writes nothing');
{
  const b = await build(TAG);
  // One hand edit and one older plan, so the run has something to report.
  (childNamed(membersOf(b.set)[3], 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: await varId(b, 'space/0') });
  const dump = (): string => {
    const out: unknown[] = [];
    const walk = (n: Node): void => {
      out.push([n.name, n.type, [...((n._pluginData as Map<string, string> | undefined) ?? new Map())], JSON.stringify(n, (k, v) => (k === 'parent' || k === 'children' || typeof v === 'function' ? undefined : v instanceof Map ? [...v] : v))]);
      for (const c of (n.children as Node[] | undefined) ?? []) walk(c);
    };
    walk(b.set);
    return JSON.stringify(out);
  };
  const before = dump();
  const r = await previewUpdate(b.shim, [{ def: TAG, plans: b.plans.map((p) => JSON.parse(JSON.stringify(p)) as AnatomyPlan).map((p) => { (planChild(p.root, 'content').bound as Record<string, string>).itemSpacing = 'space/999'; return p; }) }]);
  ok(r.sets[0].counts.update + r.sets[0].counts.handEdited === 45, 'premise: the run had changes and an edit to report');
  ok(dump() === before, 'writes/none: every node\'s fields and plugin data are identical before and after the dry run');
  const again = await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }]);
  const twice = await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }]);
  ok(again.sets[0].previewHash === twice.sets[0].previewHash, 'writes/hash: the same file reads the same preview hash twice');
  // The same node edited again, in a field the read-back does not compare (opacity): the preview's own
  // text cannot change (one hand edit, same member, same path, same field changes), so only the
  // file-state fingerprint inside the hash can see it.
  childNamed(membersOf(b.set)[3], 'content').opacity = 0.5;
  const moved = await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }]);
  const text = (x: typeof moved) => JSON.stringify({ ...x.sets[0], previewHash: '' });
  ok(text(moved) === text(twice), 'premise: the preview reads the same with the node edited again');
  ok(moved.sets[0].previewHash !== twice.sets[0].previewHash, 'writes/hash: a file that moved after the preview reads a different hash, even where the preview text did not');
}

/* ── capture ─────────────────────────────────────────────────────────────────────────────────────────── */
section('capture — the one-time record for sets built before the baseline');
{
  const b = await build(TAG);
  // A set built before #2265: no baselines. One member was then edited by hand.
  for (const m of membersOf(b.set)) (m.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, BASELINE_KEY, '');
  const edited = membersOf(b.set)[6];
  (childNamed(edited, 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: await varId(b, 'space/0') });
  const stamps = membersOf(b.set).map((m) => (m.getSharedPluginData as (ns: string, k: string) => string)(NS, STAMP_KEY));
  const pre = (await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }])).sets[0];
  ok(pre.counts.noBaseline === 45, `premise: with the records cleared, all 45 read noBaseline (${pre.counts.noBaseline})`);
  const r = await captureBaselines(b.shim, [{ def: TAG, plans: b.plans }]);
  const s = r.sets[0];
  ok(s.recorded === 44 && s.skipped.length === 1 && s.skipped[0].member === edited.name && /differs from the plan/.test(s.skipped[0].reason),
    `capture/refuses: 44 recorded; the edited member is left without a record, because recording it would launder the edit (${s.recorded}, ${JSON.stringify(s.skipped)})`);
  ok(JSON.stringify(membersOf(b.set).map((m) => (m.getSharedPluginData as (ns: string, k: string) => string)(NS, STAMP_KEY))) === JSON.stringify(stamps), 'capture/stamps: no stamp was rewritten');
  const post = (await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }])).sets[0];
  ok(post.counts.current === 44 && post.counts.noBaseline === 1, `capture/after: the 44 now read current; the edited one still has no record (${post.counts.current}, ${post.counts.noBaseline})`);
  const r2 = await captureBaselines(b.shim, [{ def: TAG, plans: b.plans }]);
  ok(r2.sets[0].recorded === 0 && r2.sets[0].skipped.filter((x) => x.reason === 'already has a baseline').length === 44, 'capture/once: a second capture records nothing over an existing record');
}

/* ── over a file ─────────────────────────────────────────────────────────────────────────────────────── */
section('file — a def with no set is missing; the verdict says nothing changed');
{
  const b = await build(TAG);
  const r = await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }, { def: 'badge', plans: plansOf('badge') }]);
  ok(r.sets.length === 1 && JSON.stringify(r.missing) === '["badge"]', `file/missing: badge has no set in this file (${JSON.stringify(r.missing)})`);
  const v = previewVerdict(r);
  ok(v.ok && /Nothing in the file changed\.$/.test(v.summary) && /Not in this file: badge\./.test(v.summary), `file/words: the summary names the missing set and says this was a check only`);
}

console.log(`\n${failed ? `❌ ${failed} FAILED` : '✓ all passed'} — ${executed} assertions executed`);
if (failed) process.exit(1);
