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
 *   edit/…         also, one edit of each kind, each against its own mutation: text no property owns
 *                  (`characters` dropped from the signature → `edit/characters`), a child hidden (`visible`
 *                  dropped → `edit/visible`), a raw color changed (an unbound paint's color ignored →
 *                  `edit/unbound color`), and a child deleted, structural (`removed` never filled in
 *                  `baselineDiff` → `edit/child deleted`).
 *   rerun/…        a second build into the same file records only the member it adds; every skipped member's
 *                  record is byte-identical, so a hand edit made between builds is still reported. Mutation:
 *                  the as-built loop walks every live member instead of `builtParts` → `rerun/records kept`.
 *   format/…       a fixed node's hashes are pinned per BASELINE_V, so a signature change that does not raise
 *                  it fails here. Mutation: one more field in the signature → `format/pinned`.
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
 *   capture/…      also: each record lands on the member it was read from, by node id, even when the set is
 *                  reordered while it is read (#2301). Mutation: the write by position → `capture/by id`.
 *   axis/…         an added axis lands members on the first plan's value; a removed axis keeps the default's
 *                  members and collapses the rest.
 *   blocked/…      a duplicate coordinate refuses the set.
 *   writes/…       the dry run writes nothing: plugin data and node fields identical before and after.
 *   capture/…      the one-time capture records only members that read back as the current plan, and never
 *                  touches a stamp. Mutation: the diff check dropped from `captureVerdict` → `capture/refuses`.
 *   earlier/…      a captured file whose members all predate the executor revision reads "✓ No changes found",
 *                  with one line counting them, and a real difference still reads "Would change" (owner Q91 B,
 *                  #2282). Mutations: those members counted as changes → `earlier/headline`; the line dropped →
 *                  `earlier/line`; a set with any of them read as no changes → `earlier/real difference`.
 *   unstamped/…    a coordinate member with no stamp is a designer's own: never a drop, never a collapse, never
 *                  matched over a stamped member on its coordinate (#2283, §10 Q4). Mutations: unstamped members
 *                  counted as drops again → `unstamped/not a drop`; collapse not filtered → `unstamped/no collapse`;
 *                  the stamped member not preferred → `unstamped/stamped wins`.
 *   adopt/…        the one-time Adopt records and stamps only an unstamped member on a planned coordinate no
 *                  stamped member holds; it then reads update, never current, and its node is the same node.
 *                  Mutations: Adopt stamps with the plan's own stamp → `adopt/reads update`; the stamp written
 *                  before the record → `adopt/stamp last`; a member off the plan adopted → `adopt/only planned`.
 *                  And (#2299 review, #2301): a set the dry run refuses is refused whole, nothing written (the
 *                  blocker check dropped → `adopt/blocked`); a member on a coordinate a stamped member lands on is
 *                  left (the held skip dropped → `adopt/held`); each write lands by node id (by position →
 *                  `adopt/by id`).
 *   copy/…         a member duplicated in Figma (its record names another member) and one with a malformed stamp
 *                  are not Prism3's, so neither is a drop; a genuine member off the plan still is; and a record
 *                  naming a node no longer in the set is no copy (#2300). Mutations: copies not detected →
 *                  `copy/not a drop`; the stamp's shape not checked → `malformed/not a drop`; any differing id read as
 *                  a copy → `copy/reassigned`.
 *   differ/…       a member that differs from its plan is reported by part, field, plan value and file value, in
 *                  the dry run and in the capture (#2295); and a fresh image-placeholder build records clean, its
 *                  aspect lock read as Figma's `{x, y}`. Mutations: the read-back's number-only aspect check →
 *                  `differ/image-placeholder`; the named lines dropped → `differ/dry run`, `differ/capture`.
 *   dropped/…      a fill the plan no longer has is named as a difference (#2335): a text button built under "Text
 *                  button hover: Fill" and planned under "Text & icon only" (#2324) lists its hover and pressed wash,
 *                  `fill: the plan says none, the file has <the wash>`, per variable with its member count; and the
 *                  capture leaves out a member with a fill added by hand where its plan has none. Mutation: `droppedFills` never called → `dropped/dry run`,
 *                  `dropped/capture`.
 *   file/…         a def with no set is missing, and the verdict's `lines` (#2177) are one per item, the list the
 *                  summary is joined from. Mutation: `lines` sent as the joined summary → `file/lines`.
 *
 * Run: `npx tsx apps/plugin/test-update-components.ts`
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, planComponentName } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { parseDesignMd } from '@prism3/engine/design-md';
import type { BrandInput } from '@prism3/engine/theme';
import { readFileSync } from 'node:fs';
import { materializeForBrand } from './src/brand-def';
import type { ComponentRename } from '@prism3/engine/component-renames';
import { applyComponentPlan, STAMP_KEY } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { NS } from './src/persist-figma';
import { BASELINE_KEY, BASELINE_V, baselineOf, writeBaseline, type SnapNode } from './src/member-baseline';
import { makeShim, type Node, type Page } from './component-shim';
import {
  readSetView, dryRunSet, hostPorts, previewUpdate, captureBaselines, previewVerdict, captureVerdictText,
  adoptMembers, adoptVerdictText, ADOPTED,
  previewLine,
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

type Built = { shim: UpdateHost & Record<string, any>; raw: Record<string, any>; page: Page; set: Node; plans: AnatomyPlan[]; ports: Awaited<ReturnType<typeof hostPorts>> };
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
    // Node ids, so Adopt and the capture can be held to writing by id (#2301).
    identities: true,
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
  // `raw` is the shim as the executor sees it, for a second build into the same file.
  return { shim: host, raw: shim, page, set, plans, ports: await hostPorts(host) };
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
// bindings on every level. BUTTON, the 720-member set (432 before #2350's flush text members), runs at full size.
const TAG = 'tag';

/* ── fresh ───────────────────────────────────────────────────────────────────────────────────────────── */
section('fresh — a set the executor just built reads current, every member carrying its baseline');
{
  const b = await build('button');
  const view = await readSetView(b.set as any);
  ok(view.members.length === 720 && view.others.length === 0, `fresh/read: 720 coordinate members read, none set aside (${view.members.length}, ${view.others.length})`);
  ok(view.members.every((m) => m.baseline !== null && Object.keys(m.baseline.nodes).length >= 2),
    `fresh/baseline: every member carries an as-built record with its nodes (${view.members.filter((m) => m.baseline).length} of ${view.members.length})`);
  ok(view.members.every((m) => m.stamp.split('|').length === 3), 'fresh/stamp: every stamp has its three fields');
  const p = dryRunSet('button', b.plans, view, b.ports);
  ok(p.counts.current === 720 && p.counts.update + p.counts.handEdited + p.counts.noBaseline + p.counts.add + p.counts.drop === 0 && !p.blockers.length,
    `fresh/current: all 720 current, nothing to add, drop or update (${JSON.stringify(p.counts)})`);
  ok(Object.values(p.properties).every((l) => l.length === 0), `fresh/properties: the set's properties are as planned (${JSON.stringify(p.properties).slice(0, 120)})`);
  ok(p.needsChoice.length === 0 && /^✓ All sets up to date$/.test(previewVerdict({ sets: [p], missing: [], refused: [] }).headline), 'fresh/verdict: up to date, nothing to choose');
}

/* ── #2350: a new axis on an existing set ─────────────────────────────────────────────────────────────── */
section('#2350 inset — a Button set built before the flush axis renames its 432 members onto inset=default and adds 288');
{
  // The set as it was before #2350: the same def with the axis, its exclusion and the container's `flush` taken off.
  const def = defOf('button');
  const { inset: _inset, ...variants } = def.variants as Record<string, string[]>;
  const root = def.anatomy!.root;
  const { flush: _flush, ...rootPart } = def.anatomy!.parts[root];
  const before = {
    ...def,
    variants,
    props: def.props.filter((p) => p.name !== 'inset'),
    axisKinds: Object.fromEntries(Object.entries(def.axisKinds ?? {}).filter(([a]) => a !== 'inset')),
    anatomy: { ...def.anatomy!, parts: { ...def.anatomy!.parts, [root]: rootPart } },
    figmaProperties: { ...def.figmaProperties!, variantAxes: def.figmaProperties!.variantAxes!.filter((a) => a !== 'inset'), excludeCoordinates: undefined },
  } as typeof def;
  const old = await build('button', figmaAnatomySet(before, { swapTarget: SWAP_TARGET }));
  const view = await readSetView(old.set as any);
  ok(view.members.length === 432 && view.members.every((m) => !/inset=/.test(m.name)), `#2350 premise: the old set has 432 members and no inset axis (${view.members.length})`);
  const p = dryRunSet('button', plansOf('button'), view, old.ports);
  // Expected, by hand: every old member lands on `inset=default` (the first plan's value), and the flush text members
  // are new — 2 sides × 3 size × 2 surface × 6 state × 4 slot = 288. Nothing is dropped or collapsed.
  ok(p.counts.rename === 432 && p.counts.add === 288 && p.counts.drop === 0 && !p.blockers.length && !p.needsChoice.includes('axisCollapse'),
    `#2350 dry run: 432 renamed, 288 added, 0 dropped, no blocker (${JSON.stringify({ rename: p.counts.rename, add: p.counts.add, drop: p.counts.drop, blockers: p.blockers.length })})`);
  const notJustInset = p.renames.filter((r) => r.from.replace(/(surface=[\w-]+)/, '$1, inset=default') !== r.to);
  ok(p.renames.length === 432 && notJustInset.length === 0,
    `#2350 dry run: each rename is the old name with inset=default added after its surface (${notJustInset.length}${notJustInset.length ? `: ${notJustInset[0].from} → ${notJustInset[0].to}` : ''})`);
  // A variant axis is reported as the set's axis list moving, not as a component property (those are text, swap, boolean).
  ok(p.axes.to.includes('inset') && !p.axes.from.includes('inset'), `#2350 dry run: the set's axes gain inset (${p.axes.from.join(', ')} → ${p.axes.to.join(', ')})`);
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

/* ── edit kinds ──────────────────────────────────────────────────────────────────────────────────────── */
section('edit kinds — text, visibility, an unbound color and a deleted child each read as a hand edit');
{
  const b = await build(TAG);
  const editsOn = async (m: Node) => (await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }])).sets[0].handEdits.filter((h) => h.member === m.name);
  // Tag binds every color and gives its one text to a property, so no built node holds unowned text or a
  // raw color. A node that does is added here and recorded as built, as a def with a fixed caption would be.
  const withCaption = async (m: Node): Promise<Node> => {
    const t = (b.shim.createText as () => Node)();
    t.name = 'caption';
    await (b.raw.loadFontAsync as (f: unknown) => Promise<void>)(t.fontName);
    t.characters = 'Fixed';
    t.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
    (childNamed(m, 'content').appendChild as (c: Node) => void)(t);
    await writeBaseline(m);
    return t;
  };
  const [mText, mVis, mPaint, mGone] = [membersOf(b.set)[1], membersOf(b.set)[2], membersOf(b.set)[4], membersOf(b.set)[6]];
  const cText = await withCaption(mText);
  const cPaint = await withCaption(mPaint);
  ok((await editsOn(mText)).length === 0 && (await editsOn(mPaint)).length === 0, 'premise: a caption recorded as built is not itself a hand edit');

  cText.characters = 'Edited';
  const eText = await editsOn(mText);
  ok(eText.length === 1 && eText[0].path === 'content/caption' && !eText[0].structural, `edit/characters: text no property owns, retyped by hand, reads at its path (${JSON.stringify(eText)})`);

  childNamed(childNamed(mVis, 'content'), 'labelCheck').visible = false;
  const eVis = await editsOn(mVis);
  ok(eVis.length === 1 && eVis[0].path === 'content/labelCheck' && !eVis[0].structural, `edit/visible: a child hidden by hand reads at its path (${JSON.stringify(eVis)})`);

  cPaint.fills = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0 } }];
  const ePaint = await editsOn(mPaint);
  ok(ePaint.length === 1 && ePaint[0].path === 'content/caption' && !ePaint[0].structural, `edit/unbound color: a raw color changed by hand reads at its path (${JSON.stringify(ePaint)})`);

  const kids = childNamed(mGone, 'content').children as Node[];
  const at = kids.findIndex((c) => c.name === 'leadingVisual');
  ok(at >= 0, 'premise: the member has its leading visual');
  kids.splice(at, 1);
  const eGone = await editsOn(mGone);
  ok(eGone.some((h) => h.path === 'content/leadingVisual') && eGone.every((h) => h.structural), `edit/child deleted: a child deleted by hand is a structural edit at its path (${JSON.stringify(eGone)})`);
}

/* ── rerun ───────────────────────────────────────────────────────────────────────────────────────────── */
section('rerun — a second build adds the missing member and leaves every other member\'s record as it was');
{
  // A re-run build writes the members it builds and skips the rest. If it re-recorded a skipped member,
  // a hand edit made in between would become the record, and the dry run would stop seeing it.
  const full = plansOf(TAG);
  const left = full[7];
  const b = await build(TAG, full.filter((p) => p !== left));
  ok(membersOf(b.set).length === 44, `premise: the first build has 44 of 45 members (${membersOf(b.set).length})`);
  const m = membersOf(b.set)[3];
  (childNamed(m, 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: await varId(b, 'space/0') });
  const recordOf = (n: Node): string => (n.getSharedPluginData as (ns: string, k: string) => string)(NS, BASELINE_KEY);
  const before = membersOf(b.set).map((n) => [String(n.name), recordOf(n)] as const);
  const again = await applyComponentPlan(full, b.raw as any);
  // The executor reports each member it skipped as a miss naming the skip; any other miss is a fault.
  const odd = again.misses.filter((x) => !/ALREADY PRESENT \(skipped/.test(x));
  ok(again.misses.length === 44 && odd.length === 0, `premise: the second build skipped the 44 it found and missed nothing else (${again.misses.length}, ${odd[0] ?? ''})`);
  const set = b.page.children.find((n) => n.type === 'COMPONENT_SET') as Node;
  const after = new Map(membersOf(set).map((n) => [String(n.name), recordOf(n)] as const));
  ok(after.size === 45 && !!after.get(planComponentName(left)), `rerun/added: the missing member is built, with its record (${after.size})`);
  const moved = before.filter(([n, r]) => after.get(n) !== r).map(([n]) => n);
  ok(moved.length === 0, `rerun/records kept: every skipped member's record is byte-identical before and after (${moved.length} moved: ${moved.slice(0, 2).join('; ')})`);
  const p = (await previewUpdate(b.shim, [{ def: TAG, plans: full }])).sets[0];
  ok(p.handEdits.length === 1 && p.handEdits[0].member === m.name && p.handEdits[0].path === 'content',
    `rerun/edit kept: the hand edit made before the re-run is still reported (${JSON.stringify(p.handEdits)})`);
}

/* ── format ──────────────────────────────────────────────────────────────────────────────────────────── */
section('format — what the hash covers is pinned to BASELINE_V');
{
  // A change to what \`nodeSignature\` reads changes every stored record's meaning. Records already on a file
  // were written by the old signature, so the change must raise BASELINE_V, which makes the dry run read
  // them as "no record" rather than as a file full of hand edits. This pins one hash per version: when it
  // fails, raise BASELINE_V in member-baseline.ts and pin the new hash here under the new version.
  // v2 (#2300) adds the record's node id beside the hashes; the hashes themselves are v1's.
  const PINNED: Record<number, Record<string, string>> = {
    1: { '.': 'e85160da', label: 'e7367361', note: '88ebbfd4', icon: '2df66934' },
    2: { '.': 'e85160da', label: 'e7367361', note: '88ebbfd4', icon: '2df66934' },
  };
  const fixture: SnapNode = {
    name: 'm', type: 'COMPONENT', layoutMode: 'HORIZONTAL', itemSpacing: 4, visible: true, opacity: 1,
    boundVariables: { paddingLeft: { id: 'V:space/100' } },
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.2, b: 0.3 }, boundVariables: { color: { id: 'V:color/a' } } }],
    children: [
      { name: 'label', type: 'TEXT', characters: 'Tag', componentPropertyReferences: { characters: 'label#1:0' }, textStyleId: 'S:body', fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }] },
      { name: 'note', type: 'TEXT', characters: 'Fixed', visible: false, fontSize: 12, strokes: [] },
      { name: 'icon', type: 'INSTANCE', mainComponent: { name: 'glyph=check', parent: { name: 'Glyph', type: 'COMPONENT_SET' } }, componentProperties: { 'size#1:1': { type: 'VARIANT', value: 'small' } } },
    ],
  };
  const now = baselineOf(fixture).nodes;
  ok(JSON.stringify(now) === JSON.stringify(PINNED[BASELINE_V]),
    `format/pinned: the fixture hashes as pinned for BASELINE_V ${BASELINE_V}. If nodeSignature changed on purpose, raise BASELINE_V and pin ${JSON.stringify(now)}`);
}

/* ── theme ───────────────────────────────────────────────────────────────────────────────────────────── */
section('theme — what Apply Theme moves is not a hand edit');
{
  const b = await build(TAG);
  // Apply Theme moves each variable's VALUE: a bound number reads a new number, a bound paint a new color,
  // and auto-layout re-derives every unbound size and position. The bindings themselves stay.
  let moved = 0, movedBound = 0;
  const walk = (n: Node): void => {
    const bv = (n.boundVariables ?? {}) as Record<string, unknown>;
    // A field the shim models as a getter (an instance's measured size) is the host's to move, not ours.
    const nudge = (k: string, by: number): boolean => { try { n[k] = (typeof n[k] === 'number' ? n[k] as number : 10) + by; moved++; return true; } catch { return false; } };
    // A bound field reads its variable's resolved value on the host. The shim records the binding and
    // leaves the field unset, so the value the theme moves is written here, where Figma would show it.
    for (const k of Object.keys(bv)) if (k !== 'fills' && k !== 'strokes' && nudge(k, 3)) movedBound++;
    for (const k of ['width', 'height', 'x', 'y']) if (typeof n[k] === 'number' && !bv[k]) nudge(k, 7);
    for (const f of ['fills', 'strokes']) {
      const paints = n[f];
      if (Array.isArray(paints)) n[f] = paints.map((p: any) => (p?.boundVariables?.color ? { ...p, color: { r: 0.11, g: 0.22, b: 0.33 } } : p));
    }
    for (const c of (n.children as Node[] | undefined) ?? []) walk(c);
  };
  for (const m of membersOf(b.set)) walk(m);
  ok(moved > 200 && movedBound > 100, `premise: the theme moved values on many nodes, many of them behind a binding (${moved}, ${movedBound} bound)`);
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
    // Each its own Prism3 member, so each record names its own node (#2300); a record naming another member is a copy.
    ...ms.map((m) => ({ ...m, id: `${m.id}b`, name: `${m.name}, extra=b`, baseline: m.baseline ? { ...m.baseline, id: `${m.id}b` } : null })),
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

/* ── earlier ─────────────────────────────────────────────────────────────────────────────────────────── */
section('earlier — a captured file built by an earlier plugin reads no changes, with its own line (owner Q91 B, #2282)');
{
  // The NB master's case: every member stamped before the executor revision (#1098), no records, then captured.
  const b = await build(TAG);
  for (const m of membersOf(b.set)) {
    const stamp = (m.getSharedPluginData as (ns: string, k: string) => string)(NS, STAMP_KEY);
    (m.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, STAMP_KEY, stamp.split('|').slice(0, 2).join('|'));
    (m.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, BASELINE_KEY, '');
  }
  const cap = await captureBaselines(b.shim, [{ def: TAG, plans: b.plans }]);
  ok(cap.sets[0].recorded === 45, `premise: the capture records all 45 (${cap.sets[0].recorded}, ${JSON.stringify(cap.sets[0].skipped.slice(0, 1))})`);
  const r = await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }]);
  ok(r.sets[0].counts.revisionUnknown === 45, `premise: all 45 read as from an earlier plugin (${r.sets[0].counts.revisionUnknown})`);
  const v = previewVerdict(r);
  ok(v.ok && v.headline === '✓ No changes found', `earlier/headline: members from an earlier plugin are not counted as changes (${v.headline})`);
  ok(v.lines[0] === `${r.sets[0].set}: no changes (45 members).`, `earlier/set line: the set reads no changes (${v.lines[0]})`);
  ok(v.lines.includes('45 built by an earlier plugin. Update them to bring them current.'), `earlier/line: a line of its own flags them (${JSON.stringify(v.lines)})`);
  // A real difference on one member still counts.
  (childNamed(membersOf(b.set)[3], 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: await varId(b, 'space/0') });
  const r2 = await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }]);
  const v2 = previewVerdict(r2);
  ok(v2.headline === 'Would change 1 of 1' && v2.lines.includes('44 built by an earlier plugin. Update them to bring them current.'),
    `earlier/real difference: a hand edit still reads as a change, and the other 44 keep their line (${v2.headline}; ${JSON.stringify(v2.lines)})`);
  const one = previewVerdict({ ...r, sets: [{ ...r.sets[0], counts: { ...r.sets[0].counts, current: 44, revisionUnknown: 1 } }] });
  ok(one.lines.includes('1 built by an earlier plugin. Update it to bring it current.'), `earlier/one: one member reads in the singular (${JSON.stringify(one.lines)})`);
}

/* ── unstamped ───────────────────────────────────────────────────────────────────────────────────────── */
section('unstamped — a member Prism3 did not build is skipped, never a drop (#2283)');
{
  const b = await build(TAG);
  const view = await readSetView(b.set as any);
  // A designer's own member on a coordinate the plan does not have, and one Prism3 built there (a real drop).
  // A Prism3 member's record names its own node (#2300); one naming another member would read as a copy.
  const mk = (from: HostMember, name: string, stamp: string, id: string): HostMember => ({ ...from, id, name, stamp, baseline: stamp && from.baseline ? { ...from.baseline, id } : null });
  const own = setValue(view.members[0].name, 'size', 'huge');
  const ours = setValue(view.members[1].name, 'size', 'giant');
  const off = withMembers(view, (ms) => [...ms, mk(ms[0], own, '', 'hand:1'), mk(ms[1], ours, ms[1].stamp, 'p3:1')]);
  const p = dryRunSet(TAG, b.plans, off, b.ports);
  ok(p.drops.length === 1 && p.drops[0] === ours && p.counts.drop === 1,
    `unstamped/not a drop: the designer's member off the plan is not a drop; Prism3's own still is (${JSON.stringify(p.drops)})`);
  ok(p.counts.unstamped === 1 && JSON.stringify(p.unstamped) === JSON.stringify([own]),
    `unstamped/listed: it is counted and named as not built by Prism3 (${p.counts.unstamped}, ${JSON.stringify(p.unstamped)})`);
  ok(/1 not built by Prism3/.test(previewLine(p)), `unstamped/words: the set line counts it (${previewLine(p)})`);
  // A removed axis: the designer's member on the non-default value would collapse. It is skipped instead.
  const wide = withMembers(view, (ms) => [
    ...ms.map((m) => ({ ...m, name: `${m.name}, extra=a` })),
    mk(ms[2], `${ms[2].name}, extra=b`, '', 'hand:2'),
  ]);
  const q = dryRunSet(TAG, b.plans, wide, b.ports);
  ok(q.drops.length === 0 && !q.needsChoice.includes('axisCollapse') && q.counts.unstamped === 1 && q.counts.current === 45,
    `unstamped/no collapse: a designer's member on a removed axis's other value is skipped, not collapsed (${JSON.stringify(q.drops)}, ${q.needsChoice.join(', ')})`);
  // The same coordinate held twice under a removed axis: Prism3's on the non-default value, the designer's on the
  // default. Prism3's member is the match, and the designer's is skipped.
  const shared = withMembers(view, (ms) => [
    ...ms.map((m, i) => ({ ...m, name: `${m.name}, extra=${i === 4 ? 'b' : 'a'}` })),
    mk(ms[4], `${ms[4].name}, extra=a`, '', 'hand:3'),
  ]);
  const r = dryRunSet(TAG, b.plans, shared, b.ports);
  ok(r.counts.current === 45 && r.drops.length === 0 && r.counts.unstamped === 1 && JSON.stringify(r.unstamped) === JSON.stringify([`${view.members[4].name}, extra=a`]),
    `unstamped/stamped wins: on a shared coordinate Prism3's member is the match and the designer's is skipped (${r.counts.current}, ${JSON.stringify(r.drops)}, ${JSON.stringify(r.unstamped)})`);
}

/* ── adopt ───────────────────────────────────────────────────────────────────────────────────────────── */
section('adopt — the one-time claim of members Prism3 did not build (#2283, §10 Q4)');
{
  const b = await build(TAG);
  const stampOf = (n: Node): string => (n.getSharedPluginData as (ns: string, k: string) => string)(NS, STAMP_KEY);
  const recordOf = (n: Node): string => (n.getSharedPluginData as (ns: string, k: string) => string)(NS, BASELINE_KEY);
  const clear = (n: Node): void => { for (const k of [STAMP_KEY, BASELINE_KEY]) (n.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, k, ''); };
  // Two members a designer made by hand: one on a planned coordinate, one renamed off the plan.
  const planned = membersOf(b.set)[5];
  const offPlan = membersOf(b.set)[6];
  clear(planned); clear(offPlan);
  offPlan.name = setValue(String(offPlan.name), 'size', 'huge');
  const before = (await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }])).sets[0];
  ok(before.counts.unstamped === 2 && before.drops.length === 0 && before.adds.length === 1,
    `premise: two unstamped members, no drop, and the off-plan one's old coordinate is an add (${before.counts.unstamped}, ${before.drops.length}, ${before.adds.length})`);
  // Each write to plugin data, in order, so the stamp's place among them can be read.
  const writes: string[] = [];
  const orig = planned.setSharedPluginData as (ns: string, k: string, v: string) => void;
  planned.setSharedPluginData = (ns: string, k: string, v: string) => { writes.push(k); orig.call(planned, ns, k, v); };
  const node = planned;
  const r = await adoptMembers(b.shim, [{ def: TAG, plans: b.plans }]);
  const s = r.sets[0];
  ok(s.adopted === 1 && s.skipped.length === 1 && s.skipped[0].member === offPlan.name && s.skipped[0].reason === 'not in the plan',
    `adopt/only planned: the member on a planned coordinate is adopted; the one off the plan is left as it is (${s.adopted}, ${JSON.stringify(s.skipped)})`);
  ok(stampOf(offPlan) === '' && recordOf(offPlan) === '', 'adopt/only planned: nothing is written on the member left as it is');
  ok(writes.length === 2 && writes[writes.length - 1] === STAMP_KEY && writes[0] === BASELINE_KEY,
    `adopt/stamp last: the record is written first and the stamp last (${JSON.stringify(writes)})`);
  ok(stampOf(planned).split('|')[1] === ADOPTED && stampOf(planned).split('|').length === 3, `adopt/stamp: the stamp's plan field says adopted (${stampOf(planned)})`);
  const after = (await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }])).sets[0];
  ok(after.counts.unstamped === 1 && after.counts.update === 1 && after.counts.current === 43 && after.counts.handEdited === 0,
    `adopt/reads update: the adopted member reads update, never current, and is not a hand edit (${JSON.stringify(after.counts)})`);
  ok(membersOf(b.set)[5] === node, 'adopt/same node: the adopted member is the node the designer made, not a new one');
  const again = await adoptMembers(b.shim, [{ def: TAG, plans: b.plans }]);
  ok(again.sets[0].adopted === 0, `adopt/once: a second Adopt adopts nothing (${again.sets[0].adopted})`);
  const v = adoptVerdictText(r);
  ok(v.headline === '✓ 1 adopted' && JSON.stringify(v.lines) === JSON.stringify([`${s.set}: 1 member adopted, 1 left as they are (not in the plan).`, 'Run an update to bring it in line with the plan.']),
    `adopt/words: the verdict counts what it adopted and what it left (${v.headline}; ${JSON.stringify(v.lines)})`);
}

/* ── copy ────────────────────────────────────────────────────────────────────────────────────────────── */
section("copy — a member duplicated in Figma, or carrying a malformed stamp, is not Prism3's (#2300)");
{
  const b = await build(TAG);
  const get = (n: Node, k: string): string => (n.getSharedPluginData as (ns: string, k: string) => string)(NS, k);
  const put = (n: Node, k: string, v: string): void => (n.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, k, v);
  const [orig, copy, ours, odd] = [membersOf(b.set)[3], membersOf(b.set)[4], membersOf(b.set)[5], membersOf(b.set)[6]];
  // Figma's Duplicate: the copy carries the original's plugin data, stamp and record, word for word, then the
  // designer renames it off the plan.
  put(copy, STAMP_KEY, get(orig, STAMP_KEY));
  put(copy, BASELINE_KEY, get(orig, BASELINE_KEY));
  copy.name = setValue(String(copy.name), 'size', 'huge');
  // A genuine Prism3 member renamed off the plan (its own stamp and record): still a drop.
  ours.name = setValue(String(ours.name), 'size', 'giant');
  // A malformed stamp, off the plan.
  put(odd, STAMP_KEY, 'garbage');
  odd.name = setValue(String(odd.name), 'size', 'tiny');
  ok(JSON.parse(get(copy, BASELINE_KEY)).id === String(orig.id) && String(copy.id) !== String(orig.id), 'premise: the copy\'s record names the original\'s node, not its own');
  const p = (await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }])).sets[0];
  ok(!p.drops.includes(String(copy.name)) && p.unstamped.includes(String(copy.name)),
    `copy/not a drop: the duplicate is not a drop, and is listed as not built by Prism3 (drops ${JSON.stringify(p.drops)})`);
  ok(!p.drops.includes(String(odd.name)) && p.unstamped.includes(String(odd.name)), `malformed/not a drop: a malformed stamp is not Prism3's (${JSON.stringify(p.unstamped)})`);
  ok(JSON.stringify(p.drops) === JSON.stringify([String(ours.name)]), `copy/control: a genuine member off the plan is still the one drop (${JSON.stringify(p.drops)})`);
}
{
  // The host reassigned a member's id after the build: its record names a node that is no longer in the set. That is
  // no copy, and the member is still Prism3's and current.
  const b = await build(TAG);
  const m = membersOf(b.set)[8];
  const rec = JSON.parse((m.getSharedPluginData as (ns: string, k: string) => string)(NS, BASELINE_KEY));
  (m.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, BASELINE_KEY, JSON.stringify({ ...rec, id: 'N:gone' }));
  const p = (await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }])).sets[0];
  ok(p.counts.current === 45 && p.counts.unstamped === 0, `copy/reassigned: a record naming a node not in the set is not a copy (${JSON.stringify(p.counts)})`);
}

/* ── adopt, refused and paired ───────────────────────────────────────────────────────────────────────── */
section('adopt — a set the dry run refuses is refused whole; a held coordinate is left; every write lands by node id');
{
  const b = await build(TAG);
  const stampOf = (n: Node): string => (n.getSharedPluginData as (ns: string, k: string) => string)(NS, STAMP_KEY);
  const clear = (n: Node): void => { for (const k of [STAMP_KEY, BASELINE_KEY]) (n.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, k, ''); };
  // Two members a designer made by hand, both on one planned coordinate.
  const [x, y] = [membersOf(b.set)[5], membersOf(b.set)[6]];
  clear(x); clear(y);
  y.name = x.name;
  const pre = (await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }])).sets[0];
  ok(pre.blockers.some((l) => /share the coordinate/.test(l)), `premise: the dry run refuses the set (${pre.blockers[0]?.slice(0, 60)})`);
  const r = await adoptMembers(b.shim, [{ def: TAG, plans: b.plans }]);
  ok(r.sets.length === 0 && r.refused.length === 1 && /share the coordinate/.test(r.refused[0].reason) && stampOf(x) === '' && stampOf(y) === '',
    `adopt/blocked: the set is refused, its reason named, and neither member stamped (${JSON.stringify(r.refused).slice(0, 120)}; ${stampOf(x)}|${stampOf(y)})`);
  const v = adoptVerdictText(r);
  ok(!v.ok && v.lines.some((l) => l.startsWith('tag: not adopted. ') && /share the coordinate/.test(l)), `adopt/blocked words: ${JSON.stringify(v.lines).slice(0, 160)}`);
}
{
  // A declared rename puts a stamped member on the coordinate a hand-made member already sits on.
  const b = await build(TAG);
  const stampOf = (n: Node): string => (n.getSharedPluginData as (ns: string, k: string) => string)(NS, STAMP_KEY);
  const ours = memberNamed(b.set, (n) => n.includes('size=small') && n.includes('state=rest') && n.includes('selection=unselected'));
  const theirs = memberNamed(b.set, (n) => n === setValue(String(ours.name), 'size', 'medium'));
  const at = String(ours.name);
  ours.name = setValue(at, 'size', 'sm');
  theirs.name = at;
  for (const k of [STAMP_KEY, BASELINE_KEY]) (theirs.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, k, '');
  const ledger: ComponentRename[] = [{ def: TAG, kind: 'value', axis: 'size', from: 'sm', to: 'small', issue: 2265 }];
  const r = await adoptMembers(b.shim, [{ def: TAG, plans: b.plans }], undefined, ledger);
  const s = r.sets[0];
  ok(!!s && s.adopted === 0 && s.skipped.length === 1 && s.skipped[0].member === at && s.skipped[0].reason === 'a Prism3 member has this coordinate' && stampOf(theirs) === '',
    `adopt/held: the hand-made member on the coordinate Prism3's renamed member lands on is left as it is (${JSON.stringify(s)})`);
}
{
  // The set is reversed while it is read (the read hands the thread back every 24 members): each write still lands on
  // the node it was read from. A new array, as the host's `children` is a fresh one per read: the read in progress
  // keeps the order it started with, and every lookup after it sees the new one.
  const b = await build(TAG);
  const stampOf = (n: Node): string => (n.getSharedPluginData as (ns: string, k: string) => string)(NS, STAMP_KEY);
  const mine = [membersOf(b.set)[2], membersOf(b.set)[40]];
  for (const m of mine) for (const k of [STAMP_KEY, BASELINE_KEY]) (m.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, k, '');
  const others = membersOf(b.set).filter((m) => !mine.includes(m)).map((m) => [m, stampOf(m)] as const);
  const r = await adoptMembers(b.shim, [{ def: TAG, plans: b.plans }], async () => { b.set.children = [...(b.set.children as Node[])].reverse(); });
  ok(r.sets[0].adopted === 2 && mine.every((m) => stampOf(m).split('|')[1] === ADOPTED) && others.every(([m, st]) => stampOf(m) === st),
    `adopt/by id: the two hand-made members are the two stamped, and no other member's stamp moved (${r.sets[0].adopted}; ${others.filter(([m, st]) => stampOf(m) !== st).length} moved)`);
}
{
  // The same reorder under the capture: the member edited by hand is the one left without a record.
  const b = await build(TAG);
  for (const m of membersOf(b.set)) (m.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, BASELINE_KEY, '');
  const edited = membersOf(b.set)[3];
  (childNamed(edited, 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: await varId(b, 'space/0') });
  const r = await captureBaselines(b.shim, [{ def: TAG, plans: b.plans }], async () => { b.set.children = [...(b.set.children as Node[])].reverse(); });
  const recordOf = (n: Node): string => (n.getSharedPluginData as (ns: string, k: string) => string)(NS, BASELINE_KEY);
  ok(r.sets[0].recorded === 44 && recordOf(edited) === '' && membersOf(b.set).filter((m) => m !== edited).every((m) => recordOf(m) !== ''),
    `capture/by id: the edited member is the one left without a record, and every other member has one (${r.sets[0].recorded}, edited ${recordOf(edited) ? 'recorded' : 'not recorded'})`);
}

/* ── differ ──────────────────────────────────────────────────────────────────────────────────────────── */
section('differ — a member that differs from its plan is reported by part and field, plan against file (#2295)');
{
  // #2295's reproduction: image-placeholder's aspect lock reads back as Figma's `{x, y}` Vector. Read as a number,
  // every member of a fresh build "differs from the plan in 1 place", which is what the NB master showed.
  const IMG = 'image-placeholder';
  const b = await build(IMG);
  for (const m of membersOf(b.set)) (m.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, BASELINE_KEY, '');
  const cap = (await captureBaselines(b.shim, [{ def: IMG, plans: b.plans }])).sets[0];
  ok(cap.recorded === 3 && cap.skipped.length === 0, `differ/image-placeholder: a fresh build's 3 members are recorded, none read as differing (${cap.recorded}, ${JSON.stringify(cap.skipped).slice(0, 200)})`);
}
{
  const b = await build(TAG);
  const m = membersOf(b.set)[3];
  const planned = String(b.plans.map((p) => planChild(p.root, 'content').bound?.itemSpacing).find(Boolean));
  // ONE FIELD, planted: the content gap bound to a variable no plan uses.
  (childNamed(m, 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: await varId(b, 'space/0') });
  const v = previewVerdict(await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }]));
  const named = v.lines.filter((l) => l.startsWith('tag · content · bound: '));
  ok(named.length === 1 && named[0].includes(`the plan says itemSpacing→${planned}`) && /the file has itemSpacing→\S*space\/0/.test(named[0]),
    `differ/dry run: the one planted field is named, with the plan's value and the file's (${JSON.stringify(named)})`);
  // The capture of a set built before records, same planted field.
  for (const x of membersOf(b.set)) (x.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, BASELINE_KEY, '');
  const c = captureVerdictText(await captureBaselines(b.shim, [{ def: TAG, plans: b.plans }]));
  const capNamed = c.lines.filter((l) => l.startsWith(`tag · ${m.name} / content · bound: `));
  ok(capNamed.length === 1 && capNamed[0].includes(`the plan says itemSpacing→${planned}`) && /the file has itemSpacing→\S*space\/0/.test(capNamed[0]),
    `differ/capture: the member left out is named with what differs (${JSON.stringify(capNamed)}; ${JSON.stringify(c.lines.slice(0, 1))})`);
}

/* ── dropped ─────────────────────────────────────────────────────────────────────────────────────────── */
section('dropped — a fill the plan no longer has is named, plan against file (#2335)');
{
  // #2335's reproduction: NB's Button built under "Text button hover: Fill", then planned under the default "Text &
  // icon only" (#2324), where the text appearance's hover and pressed members have no wash. The executor clears a
  // fill the plan does not ask for, so the update removes the wash; the dry run must say so before it does.
  const nb = parseDesignMd(readFileSync(new URL('../../packages/engine/examples/nb-redesign.design.md', import.meta.url), 'utf8')).input as BrandInput;
  const plansFor = (input: BrandInput): AnatomyPlan[] => figmaAnatomySet(materializeForBrand(defOf('button'), input), { swapTarget: SWAP_TARGET });
  const fill = plansFor({ ...nb, buttonTextHover: 'fill' } as BrandInput);
  const textOnly = plansFor({ ...nb, buttonTextHover: 'text' } as BrandInput);
  const b = await build('button', fill);
  const washed = (ps: AnatomyPlan[]) => ps.filter((p) => /appearance=text/.test(planComponentName(p)) && /state=(hover|pressed)/.test(planComponentName(p)) && !!p.root.paints?.fills);
  ok(washed(fill).length === 48 && washed(textOnly).length === 0,
    `premise: under Fill the 48 text hover and pressed members (2 states × 3 sizes × 4 slot combos × 2 grounds) plan a fill, and under Text & icon only none does (${washed(fill).length}, ${washed(textOnly).length})`);
  // Each member's wash, as the file holds it: the variable's name in this file, read from the built node.
  const wash = async (state: string, ground: string): Promise<string> => {
    const m = memberNamed(b.set, (n) => n.includes('appearance=text') && n.includes(`state=${state}`) && n.includes(`surface=${ground}`));
    const id = (m.fills as { boundVariables?: { color?: { id?: string } } }[])[0]?.boundVariables?.color?.id;
    return String(id ? b.ports.varName(id) : 'NO BOUND FILL');
  };
  const want = (await Promise.all(['hover', 'pressed'].flatMap((st) => ['default', 'inverse'].map((g) => wash(st, g)))))
    .map((v) => `button · the member · fill: the plan says none, the file has ${v} (12 members).`);
  ok(want.every((l) => /interactive\/primary\/overlay\/(hover|pressed)/.test(l)), `premise: the built text hover and pressed members carry the primary overlay wash (${JSON.stringify(want)})`);
  const v = previewVerdict(await previewUpdate(b.shim, [{ def: 'button', plans: textOnly }]));
  const lines = v.lines.filter((l) => l.startsWith('button · ') && l.includes(' fill: '));
  ok(JSON.stringify([...lines].sort()) === JSON.stringify([...want].sort()),
    `dropped/dry run: the wash on the 48 members is named, one line per variable, the plan's none against the file's (${JSON.stringify(lines)})`);
}
{
  // The capture asks the same question of a member stamped by the CURRENT plan: a fill added by hand to a node the
  // plan leaves unpainted means the member is not as Prism3 built it, so it is not recorded as if it were.
  const b = await build(TAG);
  const m = membersOf(b.set)[5];
  const planned = b.plans.find((p) => planComponentName(p) === m.name)!;
  ok(!planChild(planned.root, 'content').paints?.fills, `premise: ${m.name}'s content has no fill in its plan`);
  childNamed(m, 'content').fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 0.5 }];
  for (const x of membersOf(b.set)) (x.setSharedPluginData as (ns: string, k: string, v: string) => void)(NS, BASELINE_KEY, '');
  const c = captureVerdictText(await captureBaselines(b.shim, [{ def: TAG, plans: b.plans }]));
  const named = c.lines.filter((l) => l.startsWith(`tag · ${m.name} / content · fill: `));
  ok(JSON.stringify(named) === JSON.stringify([`tag · ${m.name} / content · fill: the plan says none, the file has #ff0000 at 50%.`]),
    `dropped/capture: the member with a fill added by hand is left out, the fill named (${JSON.stringify(named)}; ${JSON.stringify(c.lines.slice(0, 1))})`);
}

/* ── over a file ─────────────────────────────────────────────────────────────────────────────────────── */
section('file — a def with no set is missing; the verdict says nothing changed');
{
  const b = await build(TAG);
  const r = await previewUpdate(b.shim, [{ def: TAG, plans: b.plans }, { def: 'badge', plans: plansOf('badge') }]);
  ok(r.sets.length === 1 && JSON.stringify(r.missing) === '["badge"]', `file/missing: badge has no set in this file (${JSON.stringify(r.missing)})`);
  const v = previewVerdict(r);
  ok(v.ok && /Nothing in the file changed\.$/.test(v.summary) && /Not in this file: badge\./.test(v.summary), `file/words: the summary names the missing set and says this was a check only`);
  // #2177: the Activity drawer draws one line per item. Three here, authored: the set, the missing def, the closing line.
  ok(v.lines.length === 3 && v.lines[0].startsWith(`${r.sets[0].set}: `) && v.lines[1] === 'Not in this file: badge.'
    && v.lines[2] === 'This was a check only. Nothing in the file changed.', `file/lines: one line per set, then each closing line (${JSON.stringify(v.lines)})`);
  const c = captureVerdictText({ sets: [{ def: TAG, set: 'Tag', recorded: 2, skipped: [] }], missing: ['badge'], refused: [{ def: 'x', reason: 'two sets' }] });
  ok(JSON.stringify(c.lines) === JSON.stringify(['Tag: 2 members recorded.', 'x: not recorded. two sets.', 'Not in this file: badge.']),
    `file/capture lines: one line per set, refusal and missing list (${JSON.stringify(c.lines)})`);
}

console.log(`\n${failed ? `❌ ${failed} FAILED` : '✓ all passed'} — ${executed} assertions executed`);
if (failed) process.exit(1);
