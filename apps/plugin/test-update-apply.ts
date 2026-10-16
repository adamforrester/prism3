/**
 * THE IN-PLACE UPDATE, APPLIED (#2265 PR 2, owner decision Q85 A) — against the in-memory shim.
 *
 * Every set is BUILT by the real executor into the shim with `identities` on, so every node carries an id and
 * every component a key the host assigned and never reassigns. The update then runs exactly as `main.ts` runs it
 * (`previewUpdate`, then `applyUpdate` with the preview's hash), and every identity this suite asserts is read
 * off the SHIM'S OWN NODES, captured by the test before the update, never taken from the update's report
 * (docs/34 shape 1: the executor's own record of what it kept cannot witness what it replaced).
 *
 *   keys/…         a plan change updates every member in place: the set's key, every member's key and id, and
 *                  every child's id are the ones the test captured before. Mutation: a member removed and
 *                  rebuilt instead of configured → `keys/members`.
 *   apply/…        the plan's change reaches the host, and the next dry run reads every member current.
 *   hash/…         a confirm whose hash the file no longer matches writes nothing.
 *   pages/…        component pages out of alphabetical order are listed by the dry run and put in order by the apply,
 *                  a designer's page never moved (#2568).
 *   hand/…         a hand edit is kept, and still reported by the next dry run. Mutation: the record of an
 *                  updated member taken whole from the host → `hand/still reported`.
 *   drop/…         a member the plan no longer has is kept and marked deprecated, never deleted. Mutation: a
 *                  dropped member removed → `drop/kept`.
 *   add/…          a member the plan gained is built into the set; every existing member keeps its key.
 *   stop/…         a run that stops part-way leaves members that read out of date, and running the update again
 *                  finishes it with every key unchanged. Mutation: the stamp written before the member is
 *                  configured → `stop/out of date`, `stop/finished`.
 *   version/…      a named version is saved once, before the first write; refused, nothing is written.
 *                  Mutation: the version not saved → `version/once`, `version/refused`.
 *   fonts/…        a text style whose typeface will not load refuses the set before anything is written.
 *                  Mutation: the font preflight dropped → `fonts/refused`.
 *   replace/…      a child whose type changed is the one node replaced. Mutation: the old child not removed →
 *                  `replace/verdict`.
 *   property/…     a default the plan changed is edited in place, keeping the property's id.
 *   rename/…       a declared value rename and an added axis rename members in place, keeping keys.
 *   skip/…         an unstamped member, one with no record and one with a layer added by hand are untouched.
 *   swap/…, nest/… an instance the plan points elsewhere is swapped in place, keeping its id, and the swap
 *                  property's default follows. Mutations: no swap → `swap/pointed`, `nest/pointed`; the default
 *                  left → `swap/default`.
 *   child/…        a part the plan dropped is removed. Mutation: extra children kept → `child/removed`.
 *   verify/…       the update's own checks fail when the host changes an id or drops a field under it.
 *                  Mutations: the member identity check dropped → `verify/member`.
 *   edge/…         a file built when the disabled edge bound `color.disabled.icon` (#1349, #1697) is corrected in
 *                  place to `color.disabled.border` (Q346, #2749): Tag, Button and IconButton, every key and id kept,
 *                  current after. Mutation: the def's binding reverted → `edge/<def> rebound`.
 *   corpus/…       every def, re-applied in place by an executor revision bump, keeps every key and id, reads
 *                  back as its plan, and reads current after.
 *   choices/…      `overwrite` writes the plan over a hand edit; `accept` keeps it as the new record (§5).
 *                  Mutations: overwrite ignored → `hand/overwrite`; accept ignored → `hand/accept`.
 *   drop/description  the deprecation prefix leads and the member's own description follows (owner Q104 A).
 *                  Mutation: the description replaced → `drop/description`.
 *   keys/record id an updated member's record names its own node (#2300). Mutation: the id left out of the update's
 *                  record → `keys/record id`.
 *   unrecorded/…   a member with no as-built record is updated by default and NAMED in the verdict as updated
 *                  without a record, never read as having no hand edits; `choices.noBaseline: 'skip'` leaves it.
 *                  Mutations: the default skips → `unrecorded/updated`; not listed → `unrecorded/updated`,
 *                  `unrecorded/words`.
 *   unrecorded/all, unrecorded/levers  a set whose members ALL lack a record (so none reads `update`), its plan moved
 *                  (a gap; Button's two levers), is updated whole and reads current after; no ✓ verdict while a
 *                  previewed difference is left (#2364). Mutation: `noBaseline` out of the apply's nothing-to-do count →
 *                  `unrecorded/all`, `unrecorded/levers`; with the guard gone too → `unrecorded/honest`.
 *   root/…         a member ROOT the plan gives no fill (a text button's hover wash, under a plan that drops it) is left
 *                  with none, and the verdict fails when one is not (#2369). Mutations: the executor's neutral claims
 *                  skipping an in-place root → `root/cleared`; with verify's unpainted check gone too → `root/verified`.
 *   apply/blocked  a set the dry run refuses (two members on one coordinate) is refused by the apply too: the
 *                  dry run's reason returned, every member byte-identical, no version saved (#2328 review). Mutation:
 *                  the apply's own blocker check dropped from `preflight` → `apply/blocked`.
 *   agree/…        every set the apply refuses, the dry run listed as a blocker, in its own words (#2592): a collapse
 *                  (an Accordion built on `position`, no ledger entry) and a rename onto a hand-made member's name. The
 *                  expected side is the apply's own refusal, read off the confirmed run. Mutation: the dry run's call to
 *                  `setRefusal` dropped, the apply's own copy restored → `agree/collapse`, `agree/rename onto a name`.
 *   agree/file …   the same for what the file lacks (#2601): a variable the plan binds, a text style it names, a
 *                  component it swaps to, a font that will not load. Each was the apply's preflight alone. Mutation: the
 *                  dry run's call to `fileBlockers` dropped, the apply's own preflight checks restored → `agree/file
 *                  variable`, `agree/file text style`, `agree/file swap target`, `agree/file font`.
 *   fonts/installed since the check  a check that ran with a font missing, confirmed after the font loads: the set's
 *                  blockers are in the hash, so the confirm is refused with "the file changed since the check" and no stamp
 *                  moves (#2601 review). Mutation: `s.blockers` dropped from `previewHashOf` → `fonts/installed since the check`.
 *   adopt/axis change  an Accordion on `position` (a declared display rename) with one member's stamp and record
 *                  cleared: the dry run blocks the axis change, and Adopt, which exists to clear that blocker, claims the
 *                  member, so the next dry run has none (#2603 review). Mutation: Adopt refused by every blocker again →
 *                  `adopt/axis change`.
 *   display rename/…  an Accordion built while its icon axis was `position`, or `iconPosition`, updates in place to the
 *                  def's `icon position`: every member renamed, every key and id the test captured kept (#2592).
 *                  Mutation: the ledger entries dropped → `display rename/position …`, `display rename/iconPosition …`.
 *   accordion pad-x/…  an Accordion built at the old large side padding (space/300, 24px) updates in place to the
 *                  def's 20px (space/250, Q338 A, #2726): the 8 large members updated, the 16 others current, every key
 *                  and id kept. Mutation: the def back at space.300 → `accordion pad-x/dry run`, `accordion pad-x/written`.
 *   apply/copy     with the original's coordinate dropped, only the original is marked deprecated; a Figma duplicate
 *                  of it and an unstamped member off the plan keep their description, stamp and record exactly
 *                  (#2328 review). Mutation: the deprecations take the unstamped members too → `apply/copy`.
 *   single/…       the icons, built as single components, updated in place (#2296): every key and id kept, each icon
 *                  finished (record, stamp last, marker off) as a set member is; an added glyph placed in a free
 *                  slot, never over another; the owner's hand-made icon untouched. Mutations: the emit branch's
 *                  finish skipped → `single/finished`; adds laid out from the origin → `single/add`.
 *   recordfail/…   a member whose as-built record the host refuses after the update (an icon, and a set member) keeps
 *                  the stamp it had and its marker, reads out of date in the next dry run, and is named among the
 *                  outcome's misses (#2373). Mutation: the stamp written before the record → `recordfail/unstamped`,
 *                  `recordfail/out of date`, `recordfail/set member`. The verdict reading no misses (#2477) →
 *                  `recordfail/verdict`, `recordfail/set verdict`, `misses/other`. A skip on a member whose name is a
 *                  prefix of a refused one's (`name=check` / `name=check-circle`) hiding that refusal → `recordfail/prefix`.
 *   unrecorded single/…  the icons with no as-built record: updated and named by default, recorded after; under
 *                  `noBaseline: 'skip'`, left exactly and named (#2373). Mutations: the default skipping →
 *                  `unrecorded single/updated`; the choice ignored → `unrecorded single/skip`.
 *   duplicate single/…  the icons and the spinner in a copy of their file (new keys), each given the original's stamp
 *                  and record: all current, or all built by an earlier plugin, none a hand edit (#2436). These defs
 *                  build no instance and no styled text (a premise), so `format/duplicate`'s mutations reach nothing
 *                  here. Mutation: a node's own key hashed → `duplicate single/current`, `duplicate single/earlier`.
 *   grid/…         a set laid out with one axis reversed reads its members as moves on BOTH axes and for every def:
 *                  button and icon-button at another x, select and textarea at another y; the apply converges with
 *                  every id kept; an unrelated update reports its moves; and an update that resizes members counts the
 *                  moves the dry run could not list (#2519). Mutations: rows only → `grid/button moves`,
 *                  `grid/icon-button moves`; pilot defs only → `grid/select moves`, `grid/textarea moves`; the apply
 *                  counting moves only when the dry run listed some → `grid/resized`.
 *   relay/…        an update re-lays the grid, and a member Prism3 didn't build (no stamp) on a planned coordinate stays
 *                  exactly where it is, named as left (#2494), and still sizes its row and column. Mutations: the LAY
 *                  OUT pass's unstamped guard removed → `relay/unbuilt left`; its measuring loop skipping unstamped
 *                  members → `relay/unbuilt size counts`. A member with a malformed stamp, and a Figma copy whose record
 *                  names another member, are neither listed as moves nor moved (#2510): the dry run and the LAY OUT pass
 *                  share `builtByPrism3`. Mutations: `ownedView` reading the stamp alone → `relay/not ours listed`;
 *                  the LAY OUT pass reading the stamp alone → `relay/not ours left`.
 *   nochange/…     a set the dry run reads as "no changes" (every member built by an earlier plugin) takes its stamps and
 *                  nothing else, read by a write log the test installs on the shim's nodes (#2379). Mutation: those
 *                  members sent through the build's pass again → `nochange/writes` (7,575 other writes).
 *   drawn/…        after an update in place, every bound paint stores the color and alpha its variable resolves to, and
 *                  every glyph's vectors fit its frame, read by the test off the shim's nodes (#2379). Mutations: the
 *                  paint base left black, or its alpha dropped → `drawn/paints`; the fresh glyph import not scaled to
 *                  its frame → `drawn/glyphs`.
 *   damage/under a layer …  a member that draws wrong AND has a layer added by hand: the dry run counts it edited by
 *                  hand, never "to update", its paint still listed; the apply skips it under every choice, named with
 *                  the layer and the damage, and leaves it exactly (#2413). Mutations: the dry run's damage read before
 *                  the structural edit → `damage/under a layer dry run`; the skip reason without the damage →
 *                  `damage/under a layer skip (keep|overwrite|accept)`.
 *   veil/…         every directional veil member's gradient stops store the colors and alphas their variables resolve
 *                  to: built fresh; damaged with black stops, read "to update" by the dry run and repaired by the apply,
 *                  verified, then current; and verify names a stop the host leaves black (#2391). Mutations: the stops
 *                  based on the placeholder → `veil/fresh`, `veil/repaired`, `veil/current`, `corpus/in place`; gradient
 *                  stops dropped from the draw check → `veil/dry run`, `veil/repaired`, `veil/verify`; verify's draw check dropped → `veil/verify`.
 *                  Stops at their color but 100% alpha read "to update" and fail verify; the alpha comparison dropped from
 *                  the draw check's gradient branch → `veil/alpha dry run`, `veil/alpha verify`.
 *   overrides/…    a List built before its items carried their numbers (#2645): the dry run lists the override on
 *                  items 2 to 8 as a change and replaces nothing; Update writes each in place, every key and id kept,
 *                  and a number a designer typed is kept as a hand edit. Mutation: the in-place branch skipping the
 *                  override write → `overrides/written in place`.
 *   noop/…         a set already current: no version, no write.
 *   order/…        nested sets are updated first.
 *
 * And `hash/refused` fails with the hash check dropped, `hand/still reported` with an updated member's record
 * taken whole from the host, `stop/out of date` with the in-progress marker ignored by the dry run.
 *
 * Run: `npx tsx apps/plugin/test-update-apply.ts`
 */
import { figmaAnatomySet, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, planComponentName } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { applyComponentPlan, respaceSets, STAMP_KEY } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { NS } from './src/persist-figma';
import { materializeForBrand } from './src/brand-def';
import { BASELINE_KEY } from './src/member-baseline';
import { makeShim, STYLE_FONT, type Node, type Page } from './component-shim';
import { adoptMembers, captureBaselines, previewLine, previewUpdate, previewVerdict, type UpdateHost, type UpdateTarget } from './src/update-plan';
import { drawnFaults, faultLine, varsById } from './src/drawn';
import { BASELINE_V, baselineOf, resetStyleNames, snapshotMember } from './src/member-baseline';
import { applyUpdate, applyVerdict, previewHashOf, namesMember, DEPRECATED_PREFIX, RETAINED_KEY, nestedFirst, type ApplyHost } from './src/update-apply';

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
type PlanNode = AnatomyPlan['root'];
const planChild = (n: PlanNode, name: string): PlanNode => n.children!.find((c) => c.name === name)!;

type World = { host: ApplyHost; api: Record<string, any>; page: Page; set: () => Node; plans: AnatomyPlan[] };
/** A fresh file holding one set, built by the executor, with identities on. `extraVars` are variables the file
 *  holds beyond the plans', for a later plan to bind. */
const world = async (id: string, plans = plansOf(id), o: { extraVars?: string[]; extraStyles?: string[]; extraComps?: string[]; componentProps?: Record<string, Record<string, { type: string; defaultValue: string | boolean }>>; keyPrefix?: string; styleIdPrefix?: string; unavailableFonts?: { family: string; style: string }[]; refuseVersion?: boolean; allowMisses?: string[] } = {}): Promise<World> => {
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set([...plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0', ...(o.extraVars ?? [])])],
    styles: [...new Set([...plans.flatMap((p) => planTextStyles(p.root)), ...(o.extraStyles ?? [])])],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root)), ...(o.extraComps ?? [])])],
    page,
    liveRoot: true,
    identities: true,
    scaleConstrained: true,
    keyPrefix: o.keyPrefix,
    styleIdPrefix: o.styleIdPrefix,
    refuseVersion: o.refuseVersion,
    componentProps: o.componentProps,
  }) as any;
  const built = await applyComponentPlan(plans, api);
  if (o.allowMisses) o.allowMisses.push(...built.misses);
  else if (built.misses.length) throw new Error(`premise: ${id} built with ${built.misses.length} miss(es): ${built.misses[0]}`);
  if (o.unavailableFonts) (api as any)._unavailableAfter = o.unavailableFonts;
  // The update reads SETS as the file holds them (live nodes); the executor's own lookups stay the shim's.
  const host = {
    ...api,
    root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) },
  } as unknown as ApplyHost;
  return { host, api, page, set: () => page.children.find((n) => n.type === 'COMPONENT_SET') as Node, plans };
};
const membersOf = (set: Node): Node[] => set.children as Node[];
const childNamed = (n: Node, name: string): Node => (n.children as Node[]).find((c) => c.name === name)!;
/** Every node's id under a member, by path — read off the shim's nodes by the TEST. An instance's contents are
 *  its main's. A glyph's vectors are walked too (they are unnamed, so they read as `<glyph>/`): an update that did
 *  not change the glyph must keep them. */
const idsUnder = (n: Node, path = '.', out = new Map<string, string>()): Map<string, string> => {
  out.set(path, String(n.id));
  if (n.type !== 'INSTANCE') (n.children as Node[] ?? []).forEach((c, i) => idsUnder(c, path === '.' ? `${c.name}#${i}` : `${path}/${c.name}#${i}`, out));
  return out;
};
const identityOf = (set: Node) => ({
  set: [String(set.key), String(set.id)],
  members: new Map(membersOf(set).map((m) => [String(m.name), { key: String(m.key), id: String(m.id), kids: idsUnder(m) }] as const)),
});
/** Each plan with `content`'s gap moved to `space/999`, a name no built plan uses. */
const moveGap = (plans: AnatomyPlan[]): AnatomyPlan[] => plans.map((p) => {
  const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
  (planChild(q.root, 'content').bound as Record<string, string>).itemSpacing = 'space/999';
  return q;
});
const confirm = async (w: World, targets: UpdateTarget[]) => {
  const pre = await previewUpdate(w.host, targets);
  return { pre, res: await applyUpdate(w.host, w.api as any, targets, previewHashOf(pre)) };
};
const pdOfMember = (n: Node, k: string): string => (n.getSharedPluginData as (a: string, b: string) => string)(NS, k);
const varIdOf = async (w: World, name: string): Promise<string> =>
  (await w.api.variables.getLocalVariablesAsync()).find((v: { name: string }) => v.name.endsWith(`/${name}`)).id;

console.log('in-place update, applied (#2265 PR 2) — against the in-memory shim\n');
const TAG = 'tag';

/* ── keys + apply ────────────────────────────────────────────────────────────────────────────────────── */
section('keys — a plan change is written in place: every key and id stays');
{
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const before = identityOf(w.set());
  ok(before.members.size === 45 && [...before.members.values()].every((m) => m.key.startsWith('K:') && m.id.startsWith('N:')), `premise: 45 members, each with a host key and id (${before.members.size})`);
  const next = moveGap(w.plans);
  const { pre, res } = await confirm(w, [{ def: TAG, plans: next }]);
  ok(pre.sets[0].counts.update === 45, `premise: the dry run reads all 45 out of date (${pre.sets[0].counts.update})`);
  const v = applyVerdict(res);
  ok(v.ok && v.headline === '✓ updated 45 in place', `apply/verdict: ${v.headline} (${JSON.stringify(v.lines).slice(0, 300)})`);
  const after = identityOf(w.set());
  ok(JSON.stringify(after.set) === JSON.stringify(before.set), `keys/set: the set keeps its key and id (${after.set} vs ${before.set})`);
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  ok(moved.length === 0 && after.members.size === 45, `keys/members: every member keeps its key and id (${moved.length} changed: ${moved.slice(0, 2).join('; ')})`);
  const kidsMoved = [...before.members].flatMap(([name, b]) => [...b.kids].filter(([path, id]) => after.members.get(name)?.kids.get(path) !== id).map(([path]) => `${name}/${path}`));
  ok(kidsMoved.length === 0, `keys/children: every child keeps its id (${kidsMoved.length} changed: ${kidsMoved.slice(0, 2).join('; ')})`);
  const gap = await varIdOf(w, 'space/999');
  const bound = membersOf(w.set()).filter((m) => (childNamed(m, 'content').boundVariables as Record<string, { id: string }>).itemSpacing?.id === gap).length;
  ok(bound === 45, `apply/written: every member's content gap is bound to space/999 (${bound})`);
  const post = (await previewUpdate(w.host, [{ def: TAG, plans: next }])).sets[0];
  ok(post.counts.current === 45 && post.handEdits.length === 0, `apply/current: the next dry run reads all 45 current, no hand edits (${JSON.stringify(post.counts)})`);
  ok(res.outcomes[0].identity.length === 0 && res.outcomes[0].content.length === 0, `apply/verified: the update's own verify found nothing (${JSON.stringify([res.outcomes[0].identity.slice(0, 2), res.outcomes[0].content.slice(0, 2)])})`);
  ok(JSON.stringify(w.api._versions) === JSON.stringify(['Before Prism3 updated tag']), `version/once: one named version saved (${JSON.stringify(w.api._versions)})`);
  ok((w.api._removed as Node[]).every((n) => n.type !== 'COMPONENT'), 'keys/none removed: no member was removed from the file');
  // #2300: an updated member's record names the node it was written on, as a build's does, or the next dry run could
  // not tell it from a copy.
  const ids = membersOf(w.set()).map((m) => [String(m.id), JSON.parse((m.getSharedPluginData as (a: string, b: string) => string)(NS, BASELINE_KEY) || '{}').id] as const);
  ok(ids.every(([id, rec]) => rec === id), `keys/record id: every updated member's record names its own node (${ids.filter(([id, rec]) => rec !== id).length} do not)`);
}

/* ── hash ────────────────────────────────────────────────────────────────────────────────────────────── */
section('hash — a confirm over a file that moved since the check writes nothing');
{
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  childNamed(membersOf(w.set())[2], 'content').opacity = 0.5;
  const stamps = membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join();
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre));
  ok(!!res.refusedAll && /changed since the check/.test(res.refusedAll), `hash/refused: ${res.refusedAll}`);
  ok(membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join() === stamps && w.api._versions.length === 0, 'hash/nothing written: no stamp moved, no version saved');
}

/* ── pages ───────────────────────────────────────────────────────────────────────────────────────────── */
// #2568, owner decisions Q260 A and Q265 B: the update lists the component pages out of alphabetical order and the
// apply puts them in place with the usual confirm, moving no designer page. Components and Subcomponents are each
// ordered within themselves. The page list is the host's; the expected orders are literals sorted by hand. Mutations: the dry run's page read dropped → `pages/dry run`; the apply's reorder dropped
// → `pages/apply`, `pages/converges`; a designer page moved → `pages/designer`.
section('pages — component pages out of alphabetical order: listed by the dry run, put in order by the apply');
{
  const w = await world(TAG);
  type P = { name: string; isPageDivider?: boolean; appendChild(): void };
  const pg = (name: string, isPageDivider = false): P => ({ name, isPageDivider, appendChild() {} });
  const pages: P[] = [pg('Cover'), pg('---', true), pg('Components'), pg('↳ Tabs'), pg('↳ Divider'), pg('Notes'), pg('↳ Badge'), pg('↳ Tag'),
    pg('---', true), pg('Subcomponents'), pg('↳ Spinner'), pg('↳ Field Label')];
  const handed: string[] = [];
  const host = { ...w.host, root: { ...w.host.root, get children() { return pages; }, insertChild(i: number, p: P) { handed.push(p.name); pages.splice(pages.indexOf(p), 1); pages.splice(i, 0, p); } } } as unknown as ApplyHost;
  const names = () => pages.map((p) => p.name);
  const targets = [{ def: TAG, plans: w.plans }];
  const pre = await previewUpdate(host, targets);
  const v = previewVerdict(pre);
  // Tabs, Divider, Badge, Tag: the longest run in order is two long (Tabs, Tag, the first found), so two pages move;
  // Spinner, Field Label: Spinner kept (the first found), so Field Label moves.
  ok(JSON.stringify(pre.pages) === JSON.stringify(['↳ Badge', '↳ Divider', '↳ Field Label']) && v.lines.includes('Component pages: 3 to reorder (Badge, Divider, Field Label).') && v.headline === 'Would reorder 3 pages',
    `pages/dry run: Badge, Divider and Field Label listed, the set itself up to date (${JSON.stringify(pre.pages)}; ${v.headline}; ${v.lines.join(' | ')})`);
  const res = await applyUpdate(host, w.api as any, targets, previewHashOf(pre));
  ok(JSON.stringify(names()) === JSON.stringify(['Cover', '---', 'Components', '↳ Badge', '↳ Divider', '↳ Tabs', 'Notes', '↳ Tag', '---', 'Subcomponents', '↳ Field Label', '↳ Spinner'])
    && JSON.stringify(res.reordered) === JSON.stringify(['↳ Badge', '↳ Divider', '↳ Field Label']) && applyVerdict(res).headline === '✓ reordered 3 pages',
    `pages/apply: Badge, Divider, Tabs, Tag in order; Field Label, Spinner in order, each within its own section (${JSON.stringify(names())}; ${applyVerdict(res).headline})`);
  ok(JSON.stringify(handed) === JSON.stringify(['↳ Badge', '↳ Divider', '↳ Field Label']) && names().indexOf('↳ Tag') - names().indexOf('Notes') === 1,
    `pages/designer: only the listed pages moved, Notes never, and it still precedes Tag (moved ${JSON.stringify(handed)})`);
  ok(JSON.stringify(w.api._versions) === JSON.stringify(['Before Prism3 updated the page order']), `pages/version: one named version before the move (${JSON.stringify(w.api._versions)})`);
  const again = await previewUpdate(host, targets);
  ok(!again.pages && previewVerdict(again).headline === '✓ All sets up to date', `pages/converges: the next dry run lists no page (${previewVerdict(again).headline})`);
  // A page moved by hand after the check is a different file: the confirm writes nothing.
  pages.splice(pages.indexOf(pages.find((p) => p.name === '↳ Tag')!), 1); pages.splice(3, 0, pg('↳ Tag'));
  const pre2 = await previewUpdate(host, targets);
  const tabs = pages.find((p) => p.name === '↳ Tabs')!; pages.splice(pages.indexOf(tabs), 1); pages.splice(3, 0, tabs);
  const res2 = await applyUpdate(host, w.api as any, targets, previewHashOf(pre2));
  ok(!!res2.refusedAll && !res2.reordered, `pages/hash: a page moved since the check refuses the confirm (${res2.refusedAll})`);
}

/* ── hand ────────────────────────────────────────────────────────────────────────────────────────────── */
section('hand — a hand edit is kept, and still reported after the update');
{
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const m = membersOf(w.set())[3];
  const zero = await varIdOf(w, 'space/0');
  (childNamed(m, 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: zero });
  const next = moveGap(w.plans);
  const { res } = await confirm(w, [{ def: TAG, plans: next }]);
  const o = res.outcomes[0];
  ok(o.kept.length === 1 && o.kept[0].path === 'content', `hand/listed: the edit is kept and listed (${JSON.stringify(o.kept)})`);
  ok((childNamed(m, 'content').boundVariables as Record<string, { id: string }>).itemSpacing?.id === zero, 'hand/kept: the edited node still holds the designer\'s binding');
  const post = (await previewUpdate(w.host, [{ def: TAG, plans: next }])).sets[0];
  ok(post.handEdits.length === 1 && post.handEdits[0].member === m.name && post.handEdits[0].path === 'content',
    `hand/still reported: the next dry run still reports the edit (${JSON.stringify(post.handEdits)})`);
  ok(post.counts.current === 44, `hand/rest current: the other 44 read current (${post.counts.current})`);
}

/* ── choices ─────────────────────────────────────────────────────────────────────────────────────────── */
section('choices — a hand edit overwritten, or accepted as built, when the confirm says so (design note §5)');
for (const choice of ['overwrite', 'accept'] as const) {
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const m = membersOf(w.set())[3];
  const zero = await varIdOf(w, 'space/0');
  (childNamed(m, 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: zero });
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre), { choices: { handEdits: choice } });
  const held = (childNamed(m, 'content').boundVariables as Record<string, { id: string }>).itemSpacing?.id;
  const post = (await previewUpdate(w.host, [{ def: TAG, plans: next }])).sets[0];
  if (choice === 'overwrite')
    ok(held === await varIdOf(w, 'space/999') && post.handEdits.length === 0 && post.counts.current === 45 && applyVerdict(res).ok,
      `hand/overwrite: the plan's value is written over the edit, and the next dry run reads all 45 current (${held}; ${JSON.stringify(post.counts)})`);
  else
    ok(held === zero && post.handEdits.length === 0 && post.counts.current === 45 && applyVerdict(res).lines[0].includes('1 hand edit accepted as built'),
      `hand/accept: the edit stays and is no longer listed (${held}; ${post.handEdits.length} listed; ${applyVerdict(res).lines[0]})`);
}

/* ── drop ────────────────────────────────────────────────────────────────────────────────────────────── */
section('drop — a member the plan no longer has is kept and marked deprecated, never deleted');
{
  const w = await world(TAG);
  const before = identityOf(w.set());
  const fewer = w.plans.filter((p) => !planComponentName(p).includes('state=rest'));
  const dropped = w.plans.length - fewer.length;
  // One of them carries a description of its own (Q104 A: it stays, after the prefix).
  const noted = membersOf(w.set()).find((m) => String(m.name).includes('state=rest'))!;
  noted.description = 'Use for status chips.';
  const { res } = await confirm(w, [{ def: TAG, plans: fewer }]);
  const o = res.outcomes[0];
  const set = w.set();
  ok(membersOf(set).length === 45 && (w.api._removed as Node[]).filter((n) => n.type === 'COMPONENT').length === 0, `drop/kept: all 45 members are still in the set; none was removed (${membersOf(set).length})`);
  const marked = membersOf(set).filter((m) => String(m.name).includes('state=rest'));
  ok(marked.length === dropped && marked.every((m) => String(m.description ?? '').startsWith(DEPRECATED_PREFIX)),
    `drop/marked: each of the ${dropped} is marked deprecated in its description (${marked.filter((m) => String(m.description ?? '').startsWith(DEPRECATED_PREFIX)).length})`);
  ok(noted.description === 'Deprecated — no longer generated by Prism3. Use for status chips.', `drop/description: the prefix leads, and the member's own description follows it (owner Q104 A) (${String(noted.description)})`);
  const retained = JSON.parse((set.getSharedPluginData as (a: string, b: string) => string)(NS, RETAINED_KEY) || '[]') as string[];
  ok(retained.length === dropped && o.deprecated.length === dropped, `drop/recorded: the set records them as kept (${retained.length})`);
  const after = identityOf(set);
  ok([...before.members].every(([name, b]) => after.members.get(name)?.key === b.key), 'drop/keys: every member keeps its key');
  ok(applyVerdict(res).ok && !o.misses.some((x) => /NOT A GENERATED VARIANT/.test(x)), `drop/no strays: the kept members are not reported as strays (${o.misses.slice(0, 2).join(' | ')})`);
}

/* ── add ─────────────────────────────────────────────────────────────────────────────────────────────── */
section('add — a member the plan gained is built; the others keep their keys');
{
  const full = plansOf(TAG);
  const w = await world(TAG, full.filter((_, i) => i !== 7));
  const before = identityOf(w.set());
  const { res } = await confirm(w, [{ def: TAG, plans: full }]);
  const o = res.outcomes[0];
  ok(o.added === 1 && membersOf(w.set()).length === 45 && !!membersOf(w.set()).find((m) => m.name === planComponentName(full[7])), `add/built: the missing member is added (${o.added}, ${membersOf(w.set()).length})`);
  const after = identityOf(w.set());
  ok([...before.members].every(([name, b]) => after.members.get(name)?.key === b.key && after.members.get(name)?.id === b.id), 'add/keys: every existing member keeps its key and id');
  ok(applyVerdict(res).ok, `add/verdict: ${applyVerdict(res).headline}`);
}

/* ── stop ────────────────────────────────────────────────────────────────────────────────────────────── */
section('stop — a run that stops part-way finishes when the update runs again');
{
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const before = identityOf(w.set());
  const next = moveGap(w.plans);
  // The host refuses one write on the 20th member's content, once: the run stops there.
  const victim = childNamed(membersOf(w.set())[20], 'content');
  const real = victim.setBoundVariable as (f: string, v: unknown) => void;
  let armed = true;
  victim.setBoundVariable = (f: string, v: unknown) => { if (armed && f === 'itemSpacing') { armed = false; throw new Error('in setBoundVariable: the host stopped'); } real.call(victim, f, v); };
  const { res } = await confirm(w, [{ def: TAG, plans: next }]);
  ok(!!res.outcomes[0]?.stopped && /the host stopped/.test(res.outcomes[0].stopped!), `premise: the run stopped (${res.outcomes[0]?.stopped})`);
  ok(/^✗ update stopped at /.test(applyVerdict(res).headline), `stop/verdict: ${applyVerdict(res).headline}`);
  const mid = (await previewUpdate(w.host, [{ def: TAG, plans: next }])).sets[0];
  ok(mid.counts.current === 0 && mid.counts.update === 45 && mid.handEdits.length === 0,
    `stop/out of date: every member still reads out of date, and none as a hand edit (${JSON.stringify(mid.counts)}, ${mid.handEdits.length} edits)`);
  const { res: again } = await confirm(w, [{ def: TAG, plans: next }]);
  ok(applyVerdict(again).ok, `stop/finished: running the update again finishes it (${applyVerdict(again).headline}; ${JSON.stringify(applyVerdict(again).lines).slice(0, 200)})`);
  const post = (await previewUpdate(w.host, [{ def: TAG, plans: next }])).sets[0];
  ok(post.counts.current === 45, `stop/current: and every member reads current (${JSON.stringify(post.counts)})`);
  const after = identityOf(w.set());
  ok([...before.members].every(([name, b]) => after.members.get(name)?.key === b.key && after.members.get(name)?.id === b.id), 'stop/keys: every member keeps its key and id across both runs');
}

/* ── version ─────────────────────────────────────────────────────────────────────────────────────────── */
section('version — refused, nothing is written');
{
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'], refuseVersion: true });
  const stamps = membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join();
  const { res } = await confirm(w, [{ def: TAG, plans: moveGap(w.plans) }]);
  ok(!!res.refusedAll && /named version could not be saved/.test(res.refusedAll), `version/refused: ${res.refusedAll}`);
  ok(membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join() === stamps, 'version/nothing written: no member was touched');
}

/* ── apply, guarded ──────────────────────────────────────────────────────────────────────────────────── */
section('apply, guarded — a set the dry run refuses is not written, and only Prism3\'s own members are deprecated (#2328 review)');
/** Every member as the file holds it: its name, description, plugin data, and each child's id and bindings. */
const dumpSet = (set: Node): string => JSON.stringify(membersOf(set).map((m) => [m.name, m.description ?? '', [...((m._pluginData as Map<string, string>) ?? new Map())],
  (m.findAll as () => Node[])().map((k) => [k.name, k.id, k.boundVariables, k.fills])]));
{
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  // Two members on one planned coordinate, both Prism3's: the dry run refuses the set rather than pick one.
  const [a, b] = [membersOf(w.set())[5], membersOf(w.set())[6]];
  b.name = a.name;
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  ok(pre.sets[0]?.blockers.some((x) => /share the coordinate/.test(x)), `premise: the dry run refuses the set (${pre.sets[0]?.blockers[0]?.slice(0, 60)})`);
  const before = dumpSet(w.set());
  // A throw is a failure of this arm too, by name: an apply that goes ahead on a blocked set can die mid-write on it.
  let res: Awaited<ReturnType<typeof applyUpdate>>;
  try { res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre)); }
  catch (err) { res = { outcomes: [{ def: TAG, set: TAG, refused: undefined, updated: ['(threw)'], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: 'keep', identity: [], content: [], misses: [], stopped: String((err as Error).message) }], missing: [], refused: [] }; }
  const o = res.outcomes[0];
  ok(!!o?.refused && /share the coordinate/.test(o.refused) && o.updated.length === 0 && dumpSet(w.set()) === before && w.api._versions.length === 0 && !applyVerdict(res).ok,
    `apply/blocked: the set is refused with the dry run's reason, every member byte-identical, no version saved (${o?.refused?.slice(0, 70) ?? `not refused${o?.stopped ? `: the apply threw (${o.stopped.slice(0, 80)})` : ''}`}; ${w.api._versions.length} versions; ${applyVerdict(res).headline})`);
}
{
  const w = await world(TAG);
  const pd = (n: Node, k: string): string => (n.getSharedPluginData as (a: string, b: string) => string)(NS, k);
  const put = (n: Node, k: string, v: string): void => (n.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, k, v);
  const [orig, dup, own] = [membersOf(w.set())[3], membersOf(w.set())[4], membersOf(w.set())[5]];
  // A Figma Duplicate of the original (its stamp and record copied, its own id), renamed off the plan; and a
  // member a designer made, unstamped, off the plan too.
  for (const k of [STAMP_KEY, BASELINE_KEY]) put(dup, k, pd(orig, k));
  dup.name = String(dup.name).replace(/size=\w+/, 'size=huge');
  for (const k of [STAMP_KEY, BASELINE_KEY]) put(own, k, '');
  own.name = String(own.name).replace(/size=\w+/, 'size=giant');
  dup.description = 'Designer copy.';
  own.description = 'Hand-made.';
  const keep = (n: Node): string => JSON.stringify([n.description, pd(n, STAMP_KEY), pd(n, BASELINE_KEY)]);
  const [dupBefore, ownBefore] = [keep(dup), keep(own)];
  // The plan drops the original's coordinate.
  const fewer = w.plans.filter((p) => planComponentName(p) !== String(orig.name));
  ok(fewer.length === w.plans.length - 1, 'premise: the plan drops exactly the original\'s coordinate');
  const { res } = await confirm(w, [{ def: TAG, plans: fewer }]);
  const o = res.outcomes[0];
  const retained = JSON.parse(pd(w.set(), RETAINED_KEY) || '[]') as string[];
  ok(JSON.stringify(o?.deprecated) === JSON.stringify([String(orig.name)]) && String(orig.description ?? '').startsWith(DEPRECATED_PREFIX)
    && JSON.stringify(retained) === JSON.stringify([String(orig.name)]) && keep(dup) === dupBefore && keep(own) === ownBefore,
    `apply/copy: only the original is marked deprecated; the duplicate and the hand-made member keep their description, stamp and record (${JSON.stringify(o?.deprecated)}; ${JSON.stringify(retained)}; dup ${keep(dup) === dupBefore ? 'kept' : 'changed'}, own ${keep(own) === ownBefore ? 'kept' : 'changed'})`);
}

/* ── agree ───────────────────────────────────────────────────────────────────────────────────────────── */
section('agree — every set the apply refuses, the dry run listed as a blocker (#2592)');
/** The arm's ground truth is the apply's own outcome, read off the confirmed run, and the file read off the shim: a
 *  set it refused must carry that reason among the dry run's blockers, and say so in the dry run's own words. */
const agrees = async (w: World, targets: UpdateTarget[], ledger?: Parameters<typeof previewUpdate>[3]) => {
  const pre = await previewUpdate(w.host, targets, undefined, ledger);
  const before = dumpSet(w.set());
  let res: Awaited<ReturnType<typeof applyUpdate>>;
  try { res = await applyUpdate(w.host, w.api as any, targets, previewHashOf(pre), ledger ? { ledger } : {}); }
  catch (err) { return { pre, refused: [] as string[], unlisted: [`the apply threw: ${String((err as Error).message).slice(0, 80)}`], untouched: false }; }
  const refused = res.outcomes.filter((o) => o.refused).map((o) => o.set);
  const unlisted = res.outcomes.filter((o) => o.refused).filter((o) => {
    const p = pre.sets.find((x) => x.set === o.set);
    return !p || p.blockers.join('; ') !== o.refused || !previewVerdict(pre).lines.some((l) => l.startsWith(`${o.set}: can't be checked.`) && l.includes(o.refused!));
  }).map((o) => `${o.set}: ${o.refused}`);
  return { pre, refused, unlisted, untouched: dumpSet(w.set()) === before && w.api._versions.length === 0 };
};
{
  // The live case: an Accordion built while its icon axis was `position`, against a ledger with no entry for it. The
  // axis reads as removed and `icon position` as added, so half the members collapse.
  const w = await world('accordion');
  for (const m of membersOf(w.set())) m.name = String(m.name).replace('icon position=', 'position=');
  const r = await agrees(w, [{ def: 'accordion', plans: w.plans }], []);
  ok(r.refused.length === 1 && r.unlisted.length === 0 && r.untouched && /collapse/.test(r.pre.sets[0]?.blockers.join() ?? ''),
    `agree/collapse: the apply refuses the set, and the dry run listed that reason as its blocker (${r.refused.length} refused; unlisted ${JSON.stringify(r.unlisted).slice(0, 160)}; ${r.pre.sets[0] ? previewLine(r.pre.sets[0]).slice(0, 120) : 'no set'})`);
}
{
  // A declared rename that would give Prism3's member the name a hand-made member holds.
  const w = await world(TAG);
  const ours = membersOf(w.set()).find((m) => String(m.name).includes('size=small') && String(m.name).includes('state=rest'))!;
  const at = String(ours.name);
  const theirs = membersOf(w.set()).find((m) => String(m.name) === at.replace('size=small', 'size=medium'))!;
  ours.name = at.replace('size=small', 'size=sm');
  theirs.name = at;
  for (const k of [STAMP_KEY, BASELINE_KEY]) (theirs.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, k, '');
  const r = await agrees(w, [{ def: TAG, plans: w.plans }], [{ def: TAG, kind: 'value', axis: 'size', from: 'sm', to: 'small', issue: 2265 }]);
  ok(r.refused.length === 1 && r.unlisted.length === 0 && r.untouched,
    `agree/rename onto a name: the apply refuses the set, and the dry run listed that reason as its blocker (${r.refused.length} refused; unlisted ${JSON.stringify(r.unlisted).slice(0, 160)})`);
}

{
  // WHAT THE FILE LACKS (#2601): a variable the plan binds, a text style it names, a component it swaps to, and a font
  // that will not load. Each was the apply's preflight alone, so a confirmed apply refused a set the dry run had listed
  // with no blocker. Each world is built whole, then the plan (or the host) asks for something the file does not have.
  const swapTo = (plans: AnatomyPlan[], to: string): AnatomyPlan[] => plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    const walk = (n: { swapTarget?: string; children?: unknown[] }): void => { if (n.swapTarget === SWAP_TARGET) n.swapTarget = to; for (const c of (n.children ?? []) as (typeof n)[]) walk(c); };
    walk(q.root as never);
    return q;
  });
  const restyle = (plans: AnatomyPlan[], to: string): AnatomyPlan[] => plans.map((p) => JSON.parse(JSON.stringify(p).replaceAll(`"${planTextStyles(p.root)[0]}"`, `"${to}"`)) as AnatomyPlan);
  const cases: { name: string; def: string; mk: (w: World) => AnatomyPlan[]; says: RegExp }[] = [
    { name: 'variable', def: TAG, mk: (w) => moveGap(w.plans), says: /variable the plan binds is not in this file \(space\/999\)/ },
    { name: 'text style', def: TAG, mk: (w) => restyle(w.plans, 'label/absent'), says: /text style not in this file: label\/absent/ },
    { name: 'swap target', def: 'button', mk: (w) => swapTo(w.plans, 'icon/absent'), says: /component the plan swaps to is not in this file: icon\/absent/ },
    { name: 'font', def: TAG, mk: (w) => {
      const real = w.api.loadFontAsync as (f: { family: string; style: string }) => Promise<void>;
      w.api.loadFontAsync = (w.host as { loadFontAsync?: unknown }).loadFontAsync = async (f: { family: string; style: string }) => { if (f.family === STYLE_FONT.family && f.style === STYLE_FONT.style) throw new Error('not installed'); return real(f); };
      return w.plans;
    }, says: /fonts: Inter Semi Bold will not load/ },
  ];
  for (const c of cases) {
    const w = await world(c.def);
    const r = await agrees(w, [{ def: c.def, plans: c.mk(w) }]);
    ok(r.refused.length === 1 && r.unlisted.length === 0 && r.untouched && c.says.test(r.pre.sets[0]?.blockers.join('; ') ?? ''),
      `agree/file ${c.name}: the apply refuses the set, and the dry run listed that reason as its blocker (${r.refused.length} refused; unlisted ${JSON.stringify(r.unlisted).slice(0, 160)}; blockers: ${r.pre.sets[0]?.blockers.join('; ').slice(0, 120) || 'none'})`);
  }
}

{
  // The refusal Adopt exists to clear (#2603 review): the axes change over a member Prism3 did not build. The dry run
  // blocks the update on it; Adopt must not be blocked by it, or the set is stuck.
  const w = await world('accordion');
  for (const m of membersOf(w.set())) m.name = String(m.name).replace('icon position=', 'position=');
  const theirs = membersOf(w.set())[1]!;
  for (const k of [STAMP_KEY, BASELINE_KEY]) (theirs.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, k, '');
  const targets = [{ def: 'accordion', plans: w.plans }];
  const pre = (await previewUpdate(w.host, targets)).sets[0];
  ok(!!pre && pre.blockers.length === 1 && /axes change/.test(pre.blockers[0]!), `premise: the dry run blocks the axis change over one unstamped member (${pre?.blockers.join('; ')})`);
  const a = await adoptMembers(w.host, targets);
  const post = (await previewUpdate(w.host, targets)).sets[0];
  ok(a.refused.length === 0 && a.sets[0]?.adopted === 1 && !!post && post.blockers.length === 0 && post.unstamped.length === 0,
    `adopt/axis change: Adopt claims the one member the axis change blocked on, and the next dry run has no blocker (${a.sets[0]?.adopted ?? 0} adopted; refused ${JSON.stringify(a.refused).slice(0, 160)}; after: ${post?.blockers.join('; ') || 'none'})`);
}

section('display rename — a set built while an axis had another Figma name updates in place, every id kept (#2592)');
for (const old of ['position', 'iconPosition']) {
  // Built from #2534 before it merged: the axis the def now shows as `icon position` was `position`, then `iconPosition`.
  // The engine's own ledger (`COMPONENT_RENAMES`) is what the update reads; the names expected are the test's own.
  const w = await world('accordion');
  for (const m of membersOf(w.set())) m.name = String(m.name).replace('icon position=', `${old}=`);
  const before = identityOf(w.set());
  const n = before.members.size;
  ok(n === 24 && [...before.members.keys()].every((k) => k.includes(`${old}=`)), `premise: the set holds ${n} members on ${old}`);
  const { pre, res } = await confirm(w, [{ def: 'accordion', plans: w.plans }]);
  const p = pre.sets[0];
  ok(!!p && !p.blockers.length && p.counts.rename === n && p.counts.add === 0 && p.counts.drop === 0 && previewLine(p).includes(`${n} to rename`),
    `display rename/${old} dry run: ${n} to rename, nothing to add or mark deprecated, no blocker (${p ? previewLine(p).slice(0, 160) : 'no set'})`);
  const after = identityOf(w.set());
  const kept = [...before.members].every(([name, b]) => {
    const a = after.members.get(name.replace(`${old}=`, 'icon position='));
    return !!a && a.key === b.key && a.id === b.id;
  });
  ok(applyVerdict(res).ok && res.outcomes[0]?.renamed === n && after.members.size === n && kept,
    `display rename/${old} in place: every member renamed onto icon position, its key and id kept (${res.outcomes[0]?.renamed}; ${after.members.size}; ${applyVerdict(res).headline}; ${res.outcomes[0]?.refused ?? ''})`);
  const post = (await previewUpdate(w.host, [{ def: 'accordion', plans: w.plans }])).sets[0];
  ok(post?.counts.current === n, `display rename/${old} current: every member reads current after (${JSON.stringify(post?.counts)})`);
}

section('accordion side padding — a file built at the old large 24px updates in place to 20px (#2726, Q338 A)');
{
  // The file as main built it before Q338: the large header and the open panel padded at the sides by space/300 (24px).
  // The literal is the test's own; the plan it updates to is the engine's current one.
  const SIDES = ['paddingLeft', 'paddingRight'] as const;
  const atOld = plansOf('accordion').map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    if (q.size === 'large') for (const part of ['header', 'content']) {
      const n = planChild(q.root, part);
      if (n) for (const k of SIDES) (n.bound as Record<string, string>)[k] = 'space/300';
    }
    return q;
  });
  const w = await world('accordion', atOld, { extraVars: ['space/250'] });
  const sidesOf = (m: Node) => ['header', 'content'].flatMap((part) => {
    const n = (m.children as Node[]).find((c) => c.name === part);
    return n ? SIDES.map((k) => (n.boundVariables as Record<string, { id: string }>)[k]?.id) : [];
  });
  const old = await varIdOf(w, 'space/300'), next = await varIdOf(w, 'space/250');
  const large = (m: Node) => /(^|, )size=large(,|$)/.test(String(m.name));
  ok(membersOf(w.set()).filter(large).length === 8 && membersOf(w.set()).filter(large).every((m) => sidesOf(m).every((id) => id === old)),
    'premise: the 8 large members are padded at the sides by space/300, the old 24px');
  const before = identityOf(w.set());
  const plans = plansOf('accordion');
  const { pre, res } = await confirm(w, [{ def: 'accordion', plans }]);
  const p = pre.sets[0];
  ok(!!p && !p.blockers.length && p.counts.update === 8 && p.counts.current === 16 && p.counts.add === 0 && p.counts.drop === 0,
    `accordion pad-x/dry run: the 8 large members to update, the 16 small and medium current, nothing added or dropped (${JSON.stringify(p?.counts)})`);
  const after = identityOf(w.set());
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  const kidsMoved = [...before.members].flatMap(([name, b]) => [...b.kids].filter(([path, id]) => after.members.get(name)?.kids.get(path) !== id).map(([path]) => `${name}/${path}`));
  ok(applyVerdict(res).ok && moved.length === 0 && kidsMoved.length === 0 && after.members.size === 24,
    `accordion pad-x/in place: every member and child keeps its key and id (${applyVerdict(res).headline}; ${moved.length} members, ${kidsMoved.length} children moved)`);
  const wrong = membersOf(w.set()).filter((m) => !sidesOf(m).every((id) => (large(m) ? id === next : id !== old && !!id))).map((m) => String(m.name));
  ok(wrong.length === 0, `accordion pad-x/written: the large header and open panel now bind space/250 (20px) at both sides, and no member still binds space/300 there (${wrong.slice(0, 2).join('; ')})`);
  const post = (await previewUpdate(w.host, [{ def: 'accordion', plans }])).sets[0];
  ok(post?.counts.current === 24, `accordion pad-x/current: every member reads current after (${JSON.stringify(post?.counts)})`);
}

/* ── single ──────────────────────────────────────────────────────────────────────────────────────────── */
section('single — the icons, updated in place as single components (#2296)');
const singleWorld = async (plans: AnatomyPlan[], extraVars: string[] = [], o: { keyPrefix?: string; styleIdPrefix?: string } = {}) => {
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set([...plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), ...extraVars])],
    // #2379: SCALE children follow their frame, as on the host, so a built glyph fits its frame.
    comps: [], page, liveRoot: true, identities: true, liveComponents: true, scaleConstrained: true,
    keyPrefix: o.keyPrefix, styleIdPrefix: o.styleIdPrefix,
  }) as any;
  const built = await applyComponentPlan(plans, api, { emitAsComponents: true });
  if (built.misses.length) throw new Error(`premise: icons built with ${built.misses.length} miss(es): ${built.misses[0]}`);
  const all = (types: string[]): Node[] => {
    const out: Node[] = [];
    const walk = (n: Node): void => { if (types.includes(String(n.type))) out.push(n); if (n.type !== 'INSTANCE') for (const c of (n.children as Node[] | undefined) ?? []) walk(c); };
    for (const n of page.children) walk(n);
    return out;
  };
  const host = { ...api, root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => all(c.types) } } as unknown as ApplyHost;
  const comps = (): Node[] => page.children.filter((n) => n.type === 'COMPONENT');
  return { page, api, host, comps };
};
{
  const plans = plansOf('icon');
  const w = await singleWorld(plans, ['color/icon/secondary']);
  const before = new Map(w.comps().map((c) => [String(c.name), { key: String(c.key), id: String(c.id) }] as const));
  const next = plans.map((p) => { const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan; (q.root as unknown as Record<string, unknown>).descendantFills = 'color/icon/secondary'; return q; });
  const t = { def: 'icon', plans: next, single: true };
  const pre = await previewUpdate(w.host, [t]);
  ok(pre.sets[0]?.counts.update === 45, `premise: the dry run reads all 45 icons out of date (${JSON.stringify(pre.sets[0]?.counts)})`);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const v = applyVerdict(res);
  ok(v.ok && v.headline === '✓ updated 45 in place', `single/update: ${v.headline} (${v.lines.slice(0, 2).join(' | ').slice(0, 220)})`);
  const after = new Map(w.comps().map((c) => [String(c.name), { key: String(c.key), id: String(c.id) }] as const));
  ok(after.size === 45 && [...before].every(([n, b]) => after.get(n)?.key === b.key && after.get(n)?.id === b.id), 'single/keys: every icon keeps its key and id');
  const sec = (await w.api.variables.getLocalVariablesAsync()).find((x: { name: string }) => x.name.endsWith('/color/icon/secondary')).id;
  const inked = w.comps().filter((c) => ((c.children as Node[]) ?? []).filter((k) => k.type === 'VECTOR').every((k) => (k.fills as { boundVariables?: { color?: { id: string } } }[])[0]?.boundVariables?.color?.id === sec)).length;
  ok(inked === 45, `single/written: every icon's ink is the plan's new color (${inked})`);
  const post = (await previewUpdate(w.host, [t])).sets[0];
  const markers = w.comps().filter((c) => (c.getSharedPluginData as (a: string, b: string) => string)(NS, 'memberUpdating') !== '').length;
  ok(post.counts.current === 45 && markers === 0, `single/finished: each icon is finished as a set member is, current with its marker off (${JSON.stringify(post.counts)}, ${markers} markers left)`);
}
{
  const plans = plansOf('icon');
  const w = await singleWorld(plans.filter((_, i) => i !== 5));
  const res = await applyUpdate(w.host, w.api as any, [{ def: 'icon', plans, single: true }], previewHashOf(await previewUpdate(w.host, [{ def: 'icon', plans, single: true }])));
  const at = w.comps().map((c) => `${c.x},${c.y}`);
  ok(res.outcomes[0]?.added === 1 && w.comps().length === 45 && new Set(at).size === at.length,
    `single/add: the glyph the plan gained is built, in a slot no other icon holds (${res.outcomes[0]?.added}, ${w.comps().length} icons, ${new Set(at).size} distinct places)`);
}
{
  const plans = plansOf('icon');
  const w = await singleWorld(plans, ['color/icon/secondary']);
  const f = (w.api.createFrame as () => Node)();
  const own = (w.api.createComponentFromNode as (n: Node) => Node)(f);
  own.name = 'icon/my-logo';
  if (!w.page.children.includes(own)) w.page.children.push(own);
  const dump = (): string => JSON.stringify([own.name, own.fills, [...(own._pluginData as Map<string, string>)]]);
  const before = dump();
  const next = plans.map((p) => { const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan; (q.root as unknown as Record<string, unknown>).descendantFills = 'color/icon/secondary'; return q; });
  const t = { def: 'icon', plans: next, single: true };
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(await previewUpdate(w.host, [t])));
  ok(applyVerdict(res).ok && dump() === before && res.outcomes[0]?.skipped.some((x) => x.member === 'name=my-logo' && x.reason === 'not built by Prism3'),
    `single/owner: the owner's hand-made icon is left exactly as it is, and named (${JSON.stringify(res.outcomes[0]?.skipped)})`);
}
const pdOf = (n: Node, k: string): string => (n.getSharedPluginData as (a: string, b: string) => string)(NS, k);
const putPd = (n: Node, k: string, v: string): void => (n.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, k, v);
/** Each icon plan with its ink moved to `color/icon/secondary`, as `single/update` moves it. */
const reinked = (plans: AnatomyPlan[]): AnatomyPlan[] => plans.map((p) => { const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan; (q.root as unknown as Record<string, unknown>).descendantFills = 'color/icon/secondary'; return q; });
{
  // THE RECORD WRITE FAILS AFTER THE UPDATE (#2373): one icon's host refuses its as-built record. The stamp comes last
  // (§7), so the icon keeps the stamp it had and its in-progress marker, reads out of date in the next dry run, and the
  // outcome names it among the build's misses. The refusal is the TEST's, installed on the shim's node. Mutation:
  // `finishUpdated` writing the stamp before the record → `recordfail/unstamped`, `recordfail/out of date`.
  // The verdict reads the miss (#2477): no ✓, the set not verified, the icon out of the updated count and named.
  // Mutation: `applyVerdict` reading no misses again → `recordfail/verdict`.
  const plans = plansOf('icon');
  const w = await singleWorld(plans, ['color/icon/secondary']);
  const t = { def: 'icon', plans: reinked(plans), single: true };
  const pre = await previewUpdate(w.host, [t]);
  const hit = w.comps()[3];
  const [stampWas, recordWas] = [pdOf(hit, STAMP_KEY), pdOf(hit, BASELINE_KEY)];
  const real = hit.setSharedPluginData as (a: string, b: string, c: string) => void;
  hit.setSharedPluginData = (ns: string, k: string, v: string): void => {
    if (ns === NS && k === BASELINE_KEY) throw new Error('the host refused the write');
    real.call(hit, ns, k, v);
  };
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  hit.setSharedPluginData = real;
  const v = applyVerdict(res);
  ok(!!stampWas && pdOf(hit, STAMP_KEY) === stampWas && pdOf(hit, BASELINE_KEY) === recordWas,
    `recordfail/unstamped: an icon whose record could not be written keeps the stamp it had, and its record (stamp ${pdOf(hit, STAMP_KEY) === stampWas ? 'kept' : `now ${pdOf(hit, STAMP_KEY)}`}, record ${pdOf(hit, BASELINE_KEY) === recordWas ? 'kept' : 'changed'})`);
  ok(pdOf(hit, 'memberUpdating') !== '', `recordfail/marker: it keeps its in-progress marker (${JSON.stringify(pdOf(hit, 'memberUpdating'))})`);
  // The build names a single component by its coordinate, `name=<glyph>` (#2296).
  const named = res.outcomes[0]?.misses.filter((x) => x.startsWith(`name=${String(hit.name).split('/').pop()}.asBuilt -> NOT RECORDED`)) ?? [];
  ok(named.length === 1, `recordfail/named: the outcome names the icon as not recorded (${JSON.stringify(named)}; ${v.headline})`);
  const post = (await previewUpdate(w.host, [t])).sets[0];
  ok(post.counts.current === 44 && post.counts.current + (post.counts.update ?? 0) + (post.counts.noBaseline ?? 0) === 45 && !post.handEdits.some((h) => h.member.endsWith(String(hit.name).split('/').pop()!)),
    `recordfail/out of date: the next dry run reads it out of date, never current, the other 44 current (${JSON.stringify(post.counts)})`);
  const glyph = String(hit.name).split('/').pop();
  ok(!v.ok && v.headline === '⚠ 1 set not verified' && v.lines[0] === 'icon: 44 updated in place.'
    && v.lines.includes(`icon: 1 member not finished — name=${glyph} (its as-built record could not be written). It still reads as out of date; run the update again to finish it.`),
    `recordfail/verdict: the verdict is not a ✓, counts 44 updated and names the icon not finished (${JSON.stringify(v)})`);
}
{
  // THE SAME FAILURE ON A SET MEMBER: `finishUpdated` is the set path's finish too, called from its own loop.
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  const hit = membersOf(w.set())[9];
  const stampWas = pdOf(hit, STAMP_KEY);
  const real = hit.setSharedPluginData as (a: string, b: string, c: string) => void;
  hit.setSharedPluginData = (ns: string, k: string, v: string): void => {
    if (ns === NS && k === BASELINE_KEY) throw new Error('the host refused the write');
    real.call(hit, ns, k, v);
  };
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre));
  hit.setSharedPluginData = real;
  const post = (await previewUpdate(w.host, [{ def: TAG, plans: next }])).sets[0];
  const named = res.outcomes[0]?.misses.filter((x) => x.startsWith(`${String(hit.name)}.asBuilt -> NOT RECORDED`)) ?? [];
  ok(pdOf(hit, STAMP_KEY) === stampWas && post.counts.current === 44 && post.counts.update === 1 && named.length === 1,
    `recordfail/set member: a set member whose record could not be written keeps its stamp, reads out of date and is named (stamp ${pdOf(hit, STAMP_KEY) === stampWas ? 'kept' : 'moved'}; ${JSON.stringify(post.counts)}; ${JSON.stringify(named)})`);
  const v = applyVerdict(res);
  ok(!v.ok && v.headline === '⚠ 1 set not verified' && v.lines[0] === `${TAG}: 44 updated in place.`
    && v.lines.includes(`${TAG}: 1 member not finished — ${String(hit.name)} (its as-built record could not be written). It still reads as out of date; run the update again to finish it.`),
    `recordfail/set verdict: the set member's verdict is not a ✓, counts 44 updated and names it not finished (${JSON.stringify(v)})`);
}
{
  // A SKIPPED MEMBER WHOSE NAME IS A PREFIX OF AN UPDATED ONE'S (#2477 review). The shipped icons hold such pairs
  // (`name=check` / `name=check-circle`), and a miss names a member by its whole name, so the skip on `name=check` (a
  // layer added by hand) must not swallow the record refused on `name=check-circle`. Mutation: the skipped-member
  // filter matching by substring again → `recordfail/prefix`.
  const plans = plansOf('icon');
  const w = await singleWorld(plans, ['color/icon/secondary']);
  const t = { def: 'icon', plans: reinked(plans), single: true };
  const glyphOf = (c: Node): string => String(c.name).split('/').pop()!;
  const skip = w.comps().find((c) => glyphOf(c) === 'check')!;
  const hit = w.comps().find((c) => glyphOf(c) === 'check-circle')!;
  const extra = (w.api.createFrame as () => Node)();
  extra.name = 'designer note';
  (skip.appendChild as (c: Node) => void)(extra);
  const pre = await previewUpdate(w.host, [t]);
  const real = hit.setSharedPluginData as (a: string, b: string, c: string) => void;
  hit.setSharedPluginData = (ns: string, k: string, v: string): void => {
    if (ns === NS && k === BASELINE_KEY) throw new Error('the host refused the write');
    real.call(hit, ns, k, v);
  };
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  hit.setSharedPluginData = real;
  const o = res.outcomes[0];
  const v = applyVerdict(res);
  ok(o?.skipped.some((x) => x.member === 'name=check') && o.misses.some((x) => x.startsWith('name=check-circle.asBuilt -> NOT RECORDED'))
    && !v.ok && v.headline === '⚠ 1 set not verified' && v.lines[0] === 'icon: 43 updated in place, 1 left as they are.'
    && v.lines.includes('icon: 1 member not finished — name=check-circle (its as-built record could not be written). It still reads as out of date; run the update again to finish it.'),
    `recordfail/prefix: a skip on name=check leaves the refused record on name=check-circle in the misses and the verdict (skipped ${JSON.stringify(o?.skipped)}; misses ${JSON.stringify(o?.misses)}; ${JSON.stringify(v)})`);
}
{
  // WHICH MEMBER A MISS NAMES, as whole names (#2477 review), on misses written out by hand in the build's own forms.
  // `known` leaves `name=check-circle` out, as a member this run adds is left out of it, so the prefix rows rest on the
  // boundary alone. Mutations: no boundary after the name → `misses/whole name` (the prefix rows); the longer-name rule
  // dropped → the dotted row.
  const known = ['name=check', 'size=1', 'size=1.5'];
  const rows: [string, string, boolean][] = [
    ['name=check.asBuilt -> NOT RECORDED (x)', 'name=check', true],
    ['name=check-circle.asBuilt -> NOT RECORDED (x)', 'name=check', false],
    ['name=check/label.slot -> NOT MADE (x)', 'name=check', true],
    ['footprint -> name=check-circle measures 24x24 but name=check measures 20x20 (same g)', 'name=check', true],
    ['footprint -> name=check-circle measures 24x24 but name=plus measures 20x20 (same g)', 'name=check', false],
    ['size=1.5.asBuilt -> NOT RECORDED (x)', 'size=1', false],
    ['size=1.5.asBuilt -> NOT RECORDED (x)', 'size=1.5', true],
  ];
  const wrong = rows.filter(([miss, m, want]) => namesMember(miss, m, known) !== want);
  ok(!wrong.length, `misses/whole name: a miss names a member by its whole name, never a prefix of a longer one (wrong: ${JSON.stringify(wrong)})`);
}
{
  // ANY OTHER MISS FROM THE BUILD'S PASS (#2477): the set is not verified, the miss is quoted with its own reason, and
  // the updated count stands (the miss names a part, not a member). An outcome written out by hand, so the expected
  // lines are the test's, not the build's.
  const o = { def: 'x', set: 'x', updated: ['a=1', 'a=2'], added: 0, renamed: 0, deprecated: [], skipped: [], kept: [], unrecorded: [], handEdits: 'keep' as const, identity: [], content: [],
    misses: ['label.characters -> DISCARDED (set "Go", reads "")', 'a=3.asBuilt -> NOT RECORDED (the component is not in the file to read)'] };
  const v = applyVerdict({ outcomes: [o], refused: [], missing: [] } as any);
  ok(!v.ok && v.headline === '⚠ 1 set not verified' && v.lines[0] === 'x: 2 updated in place.'
    && v.lines[1] === 'x: 2 parts not written as planned — label.characters -> DISCARDED (set "Go", reads ""); a=3.asBuilt -> NOT RECORDED (the component is not in the file to read).',
    `misses/other: any other miss leaves the set not verified, quoted, the updated count as it was (${JSON.stringify(v)})`);
}
{
  // A RECORD-LESS SINGLE COMPONENT (#2373): the icons with no as-built record, as the NB master's unrecorded sets were.
  // By default each is updated and named as updated without one, and is recorded after; under `noBaseline: 'skip'` it
  // is left exactly as it is, and named. Mutations: the default skipping → `unrecorded single/updated`; the skip
  // choice ignored → `unrecorded single/skip`.
  const plans = plansOf('icon');
  const w = await singleWorld(plans, ['color/icon/secondary']);
  for (const c of w.comps()) putPd(c, BASELINE_KEY, '');
  const t = { def: 'icon', plans: reinked(plans), single: true };
  const pre = await previewUpdate(w.host, [t]);
  ok(pre.sets[0]?.counts.noBaseline === 45, `premise: the dry run reads all 45 icons with no record (${JSON.stringify(pre.sets[0]?.counts)})`);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const o = res.outcomes[0];
  const v = applyVerdict(res);
  ok(v.ok && o?.updated.length === 45 && o.unrecorded.length === 45,
    `unrecorded single/updated: by default every record-less icon is updated and named as updated without a record (${v.headline}; ${o?.updated.length} updated, ${o?.unrecorded.length} unrecorded)`);
  const sec = await varIdOf(w as unknown as World, 'color/icon/secondary');
  const inked = w.comps().filter((c) => ((c.children as Node[]) ?? []).filter((k) => k.type === 'VECTOR').every((k) => (k.fills as { boundVariables?: { color?: { id: string } } }[])[0]?.boundVariables?.color?.id === sec)).length;
  const post = (await previewUpdate(w.host, [t])).sets[0];
  ok(inked === 45 && post.counts.current === 45 && w.comps().every((c) => !!pdOf(c, BASELINE_KEY)),
    `unrecorded single/recorded: each takes the plan's ink and a record, and reads current after (${inked} inked; ${JSON.stringify(post.counts)})`);
}
{
  const plans = plansOf('icon');
  const w = await singleWorld(plans, ['color/icon/secondary']);
  const hit = w.comps()[7];
  putPd(hit, BASELINE_KEY, '');
  const dump = (): string => JSON.stringify([hit.name, [...(hit._pluginData as Map<string, string>)], ...(hit.findAll as () => Node[])().map((k) => [k.name, k.id, k.fills])]);
  const before = dump();
  const t = { def: 'icon', plans: reinked(plans), single: true };
  const pre = await previewUpdate(w.host, [t]);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre), { choices: { noBaseline: 'skip' } });
  const o = res.outcomes[0];
  const post = (await previewUpdate(w.host, [t])).sets[0];
  ok(o?.updated.length === 44 && dump() === before && JSON.stringify(o.skipped.map((x) => x.reason)) === JSON.stringify(['no as-built record']) && post.counts.noBaseline === 1,
    `unrecorded single/skip: under noBaseline 'skip' the record-less icon is left exactly as it is and named, the other 44 updated (${o?.updated.length}, ${JSON.stringify(o?.skipped)}, ${dump() === before ? 'untouched' : 'written'}; ${JSON.stringify(post.counts)})`);
}
{
  // A DUPLICATE OF THE FILE, FOR THE SINGLE COMPONENTS (#2436): `format/duplicate` for the icons and the spinner. The
  // copy gives every component a new key; each copied component takes the original's stamp and record (its own id in
  // it). Every one reads current, or, under a stamp from an earlier plugin, built by one; never edited by hand.
  // Why `format/duplicate`'s mutations can't fail here: v3 hashes an instance's main and a style by name, and these defs
  // build neither (`premise: nothing keyed`). A def that gains a nested instance or a styled label fails that premise,
  // and is then guarded by the arm below as `format/duplicate` guards `tag`. Mutation: a component's bound paint hashed
  // with its file's key → `duplicate single/current`.
  const g = globalThis as { figma?: unknown };
  const had = g.figma;
  g.figma = { getStyleByIdAsync: async (id: string) => ({ name: id.replace(/^S:(B:)?/, '') }) };
  resetStyleNames();
  try {
    for (const id of ['icon', 'spinner']) {
      const plans = plansOf(id);
      const a = await singleWorld(plans);
      const b = await singleWorld(plans, [], { keyPrefix: 'KB', styleIdPrefix: 'B:' });
      const keyed = b.comps().flatMap((c) => (c.findAll as (f: (n: Node) => boolean) => Node[])((n) => n.type === 'INSTANCE' || (n.type === 'TEXT' && !!n.textStyleId))).length;
      const [ka, kb] = [String(a.comps()[0]?.key ?? ''), String(b.comps()[0]?.key ?? '')];
      ok(b.comps().length === plans.length && !!ka && !!kb && ka !== kb && keyed === 0,
        `premise: ${id}: the copy's ${b.comps().length} components carry other keys (${ka} / ${kb}), and nothing keyed: no instance, no styled text (${keyed})`);
      const byName = new Map(a.comps().map((c) => [String(c.name), c] as const));
      const copy = (stamp: (s: string) => string): void => {
        for (const c of b.comps()) {
          const src = byName.get(String(c.name))!;
          putPd(c, STAMP_KEY, stamp(pdOf(src, STAMP_KEY)));
          putPd(c, BASELINE_KEY, JSON.stringify({ ...JSON.parse(pdOf(src, BASELINE_KEY)), id: String(c.id) }));
        }
      };
      const t = { def: id, plans, single: true };
      copy((s) => s);
      const p = (await previewUpdate(b.host, [t])).sets[0];
      ok(p?.counts.current === plans.length && p.counts.handEdited === 0,
        `duplicate single/current: ${id}: in a copy of the file, every component reads current and none as edited by hand (${JSON.stringify(p?.counts)}; ${p?.handEdits.slice(0, 2).map((h) => `${h.member} ${h.path}`).join(' | ')})`);
      copy((s) => s.split('|').slice(0, 2).join('|'));
      const q = (await previewUpdate(b.host, [t])).sets[0];
      ok(q?.counts.revisionUnknown === plans.length && q.counts.handEdited === 0,
        `duplicate single/earlier: ${id}: under a stamp from an earlier plugin, every component reads built by one and none as edited by hand (${JSON.stringify(q?.counts)})`);
    }
  } finally { g.figma = had; resetStyleNames(); }
}

/* ── noop ────────────────────────────────────────────────────────────────────────────────────────────── */
section('noop — a set already current is not written');
{
  const w = await world(TAG);
  const dump = (): string => JSON.stringify(membersOf(w.set()).map((m) => [m.name, [...(m._pluginData as Map<string, string>)]]));
  const before = dump();
  const { res } = await confirm(w, [{ def: TAG, plans: w.plans }]);
  ok(applyVerdict(res).headline === '✓ already up to date' && w.api._versions.length === 0 && dump() === before, `noop/nothing: no version, no write (${applyVerdict(res).headline})`);
}

/* ── order ───────────────────────────────────────────────────────────────────────────────────────────── */
section('order — nested sets first (Q8)');
{
  const ring = { def: 'focus-ring', plans: plansOf('focus-ring') };
  const button = { def: 'button', plans: plansOf('button') };
  const o = nestedFirst([button, ring]).map((t) => t.def);
  ok(JSON.stringify(o) === JSON.stringify(['focus-ring', 'button']), `order/nested first: the set button nests is updated before it (${JSON.stringify(o)})`);
}

/* ── replace ─────────────────────────────────────────────────────────────────────────────────────────── */
section('replace — a child whose type changed is the one node replaced, and the dry run listed it');
{
  const w = await world(TAG);
  const before = identityOf(w.set());
  // The plan turns the swappable leading icon into a plain frame: a type change, and its swap property goes.
  const next = w.plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    const lv = planChild(planChild(q.root, 'content'), 'leadingVisual') as unknown as Record<string, unknown>;
    lv.type = 'FRAME';
    for (const k of ['swapTarget', 'propertyRef', 'descendantFills']) delete lv[k];
    return q;
  });
  const { pre, res } = await confirm(w, [{ def: TAG, plans: next }]);
  ok(pre.sets[0].replacements.filter((r) => r.path === 'content/leadingVisual').length === 45 && pre.sets[0].properties.remove.some((x) => x.name === '↳ swap leading icon'),
    `premise: the dry run lists the replacement on every member and the swap property's removal (${pre.sets[0].replacements.length}, ${JSON.stringify(pre.sets[0].properties.remove)})`);
  ok(applyVerdict(res).ok, `replace/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const after = identityOf(w.set());
  const kidsMoved = [...before.members].flatMap(([name, b]) => [...b.kids].filter(([path, id]) => after.members.get(name)?.kids.get(path) !== id).map(([path]) => path));
  const expected = (p: string) => p.startsWith('content#0/leadingVisual#');
  ok(kidsMoved.length > 0 && kidsMoved.every(expected), `replace/only that child: the leading icon is replaced, every other id kept (${kidsMoved.filter((p) => !expected(p)).slice(0, 2).join('; ') || `${kidsMoved.length} under leadingVisual`})`);
  ok([...before.members].every(([name, b]) => after.members.get(name)?.key === b.key), 'replace/keys: every member keeps its key');
  const lvType = membersOf(w.set()).map((m) => String(childNamed(childNamed(m, 'content'), 'leadingVisual')?.type));
  ok(lvType.every((t) => t === 'FRAME'), `replace/written: every member's leading visual is now a frame (${[...new Set(lvType)]})`);
  const defs = (w.set().componentPropertyDefinitions ?? {}) as Record<string, unknown>;
  ok(!Object.keys(defs).some((k) => k.startsWith('↳ swap leading icon')), `replace/property removed: the swap property is gone (${Object.keys(defs).filter((k) => !k.includes('=')).join(', ')})`);
}

/* ── property ────────────────────────────────────────────────────────────────────────────────────────── */
section('property — a default the plan changed is edited in place, keeping the property');
{
  const w = await world(TAG);
  const defs0 = w.set().componentPropertyDefinitions as Record<string, { type: string; defaultValue?: unknown }>;
  const labelKey = Object.keys(defs0).find((k) => k.startsWith('label#'))!;
  ok(defs0[labelKey]?.defaultValue === 'Tag', `premise: the label property defaults to Tag (${String(defs0[labelKey]?.defaultValue)})`);
  const next = w.plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    const label = planChild(planChild(planChild(q.root, 'content'), 'labelCheck'), 'label') as unknown as Record<string, unknown>;
    label.characters = 'Label';
    if ('textDefault' in label) label.textDefault = 'Label';
    return q;
  });
  const { pre, res } = await confirm(w, [{ def: TAG, plans: next }]);
  ok(pre.sets[0].properties.edit.some((x) => x.name === 'label' && x.to === 'Label'), `premise: the dry run lists the default change (${JSON.stringify(pre.sets[0].properties.edit)})`);
  ok(applyVerdict(res).ok, `property/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const defs1 = w.set().componentPropertyDefinitions as Record<string, { type: string; defaultValue?: unknown }>;
  ok(defs1[labelKey]?.defaultValue === 'Label', `property/edited: the same property (${labelKey}) now defaults to Label (${String(defs1[labelKey]?.defaultValue)})`);
  const texts = membersOf(w.set()).map((m) => String(childNamed(childNamed(childNamed(m, 'content'), 'labelCheck'), 'label').characters));
  ok(texts.every((t) => t === 'Label'), `property/shown: every member's label reads Label (${[...new Set(texts)]})`);
}

/* ── property rename (#2759) ─────────────────────────────────────────────────────────────────────────── */
section('property rename — each of the ledger\'s property renames renames the set\'s property in place, and an instance keeps its value (#2759)');
// The four renames owner decision Q345 A made, typed here rather than read off COMPONENT_RENAMES: the ledger is
// the subject, so deleting any shipped entry fails this section by its def's name (`docs/34` shape 1).
const PROPERTY_RENAMES_Q345: readonly (readonly [def: string, from: string, to: string])[] = [
  ['tag', 'Check icon', 'check icon'],
  ['switch-control', 'State icon', 'state icon'],
  ['image-placeholder', 'Marker', 'marker'],
  ['segmented-control', 'Label', 'label'],
];
for (const [def, from, to] of PROPERTY_RENAMES_Q345) {
  // A file built before Q345, by the real executor from the plans as they were: the set's switch was `from`.
  const planned = plansOf(def);
  const old = planned.map((p) => JSON.parse(JSON.stringify(p).split(`"visibleProp":${JSON.stringify(to)}`).join(`"visibleProp":${JSON.stringify(from)}`)) as AnatomyPlan);
  ok(JSON.stringify(planned).includes(`"visibleProp":${JSON.stringify(to)}`) && !JSON.stringify(old).includes(`"visibleProp":${JSON.stringify(to)}`),
    `premise: ${def}: the plans name the switch '${to}', and the file was built from plans naming it '${from}'`);
  const w = await world(def, old);
  const defs0 = w.set().componentPropertyDefinitions as Record<string, { type: string; defaultValue?: unknown }>;
  const oldKey = Object.keys(defs0).find((k) => k.split('#')[0] === from)!;
  ok(!!oldKey && defs0[oldKey].defaultValue === true, `premise: ${def}: the set as built declares '${from}', on by default (${Object.keys(defs0).filter((k) => !k.includes('=')).join(', ')})`);
  const id = oldKey.slice(oldKey.lastIndexOf('#'));
  // A designer's instance with the switch off: the value a rename must keep.
  const comps = w.api.root.findAllWithCriteria({ types: ['COMPONENT'] }) as unknown as { name: string; createInstance: () => Node }[];
  const inst = comps.find((c) => c.name === String(membersOf(w.set())[0].name))!.createInstance();
  (inst.setProperties as (p: Record<string, boolean>) => void)({ [oldKey]: false });
  const valueOf = (): unknown => Object.entries(inst.componentProperties as Record<string, { value: unknown }>).find(([k]) => k.endsWith(id))?.[1].value;
  ok(valueOf() === false, `premise: ${def}: the instance's switch is off under '${oldKey}' (${String(valueOf())})`);
  const before = identityOf(w.set());
  const unclaimed = (await previewUpdate(w.host, [{ def, plans: planned }], undefined, [])).sets[0].properties;
  ok(unclaimed.remove.some((x) => x.name === from) && unclaimed.add.some((x) => x.name === to) && !unclaimed.rename.length,
    `premise: ${def}: with no ledger entry the dry run removes '${from}' and adds '${to}', which would reset every instance (${JSON.stringify(unclaimed)})`);
  // The engine's own ledger, so the shipped entry is what is under test.
  const pre = await previewUpdate(w.host, [{ def, plans: planned }]);
  const props = pre.sets[0].properties;
  ok(props.rename.length === 1 && props.rename[0].from === from && props.rename[0].to === to && !props.add.length && !props.remove.length,
    `property rename/dry run: ${def}: one rename, '${from}' → '${to}', nothing added or removed (${JSON.stringify(props)})`);
  const res = await applyUpdate(w.host, w.api as any, [{ def, plans: planned }], previewHashOf(pre));
  ok(applyVerdict(res).ok && pre.sets[0].counts.handEdited === 0, `property rename/verdict: ${def}: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const defs1 = w.set().componentPropertyDefinitions as Record<string, { type: string }>;
  const named = Object.keys(defs1).filter((k) => !k.includes('=') && k.split('#')[0].toLowerCase() === to);
  ok(named.length === 1 && named[0] === `${to}${id}`, `property rename/in place: ${def}: one property, '${to}' under the same id ${id} (${named.join(', ')})`);
  ok(valueOf() === false, `property rename/instance kept: ${def}: the instance's switch is still off (${String(valueOf())})`);
  const after = identityOf(w.set());
  ok(after.set.join() === before.set.join() && [...before.members].every(([name, b]) => after.members.get(name)?.key === b.key && after.members.get(name)?.id === b.id), `property rename/keys: ${def}: the set and every member keep their keys and ids`);
  const post = (await previewUpdate(w.host, [{ def, plans: planned }])).sets[0];
  ok(post.counts.current === post.counts.members && !post.properties.rename.length && !post.properties.add.length && !post.properties.remove.length, `property rename/settled: ${def}: a second dry run lists no property change (${JSON.stringify(post.properties)})`);
}

/* ── def rename (#2759) ────────────────────────────────────────────────────────────────────────────────── */
section('def rename — a set built under a def\'s earlier id is found and renamed in place, every id kept (#2759)');
{
  // A file built before Q353, by the real executor from the plans as they were: the set is named `tab`.
  const NEW = '_tab-item';
  const planned = plansOf(NEW);
  const old = planned.map((p) => ({ ...JSON.parse(JSON.stringify(p)), component: 'tab' }) as AnatomyPlan);
  ok(planned.every((p) => p.component === NEW) && old.every((p) => p.component === 'tab'), 'premise: the plans name the set `_tab-item`, and the file was built from plans naming it `tab`');
  const w = await world(NEW, old);
  ok(String(w.set().name) === 'tab', `premise: the file holds the set as 'tab' (${String(w.set().name)})`);
  const before = identityOf(w.set());
  const unclaimed = await previewUpdate(w.host, [{ def: NEW, plans: planned }], undefined, []);
  ok(unclaimed.missing.includes(NEW) && unclaimed.sets.length === 0, `premise: with no ledger entry the set is not found, so an update would build a second one (${JSON.stringify(unclaimed.missing)})`);
  // The engine's own ledger, so the shipped entry is what is under test.
  const pre = await previewUpdate(w.host, [{ def: NEW, plans: planned }]);
  const p0 = pre.sets[0];
  ok(!!p0 && p0.set === NEW && p0.setRename?.from === 'tab' && p0.setRename.to === NEW && !p0.blockers.length && !p0.counts.add && !p0.counts.drop,
    `def rename/dry run: the set is read under 'tab', to be renamed '${NEW}', with nothing added or dropped (${JSON.stringify(p0 ? { set: p0.set, setRename: p0.setRename, counts: p0.counts, blockers: p0.blockers } : null)})`);
  ok(previewLine(p0).endsWith('Renamed from tab.'), `def rename/line: the dry run's line says so (${previewLine(p0)})`);
  const res = await applyUpdate(w.host, w.api as any, [{ def: NEW, plans: planned }], previewHashOf(pre));
  ok(applyVerdict(res).ok, `def rename/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  ok(String(w.set().name) === NEW && w.page.children.filter((n) => n.type === 'COMPONENT_SET').length === 1, `def rename/in place: one set, now named '${NEW}' (${w.page.children.filter((n) => n.type === 'COMPONENT_SET').map((n) => String(n.name)).join(', ')})`);
  const after = identityOf(w.set());
  ok(after.set.join() === before.set.join() && after.members.size === before.members.size && [...before.members].every(([name, b]) => after.members.get(name)?.key === b.key && after.members.get(name)?.id === b.id),
    'def rename/ids: the set and every member keep their keys and ids, so a placed instance still points at them');
  const post = (await previewUpdate(w.host, [{ def: NEW, plans: planned }])).sets[0];
  ok(!!post && !post.setRename && post.counts.current === post.counts.members, `def rename/settled: a second dry run finds the set under '${NEW}' and reads every member current (${JSON.stringify(post?.counts)})`);
}

section('def rename, nested — a set renamed in the same run counts as present for the set that nests it (#2759)');
{
  // Tab item and Tabs as a file built before Q353 holds them: the set `tab`, and Tabs' items nesting `tab`.
  const swapId = <T,>(plans: T[]): T[] => plans.map((p) => JSON.parse(JSON.stringify(p).split('"_tab-item"').join('"tab"')) as T);
  const oldItem = swapId(plansOf('_tab-item')), oldTabs = swapId(plansOf('tabs'));
  ok(JSON.stringify(oldTabs).includes('"nestTarget":"tab"') && !JSON.stringify(oldTabs).includes('_tab-item'), 'premise: the old Tabs plans nest `tab`');
  const all = [...oldItem, ...oldTabs];
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set([...all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0'])],
    styles: [...new Set(all.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(all.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...all.flatMap((p) => planComps(p.root)).filter((c) => c !== 'tab')])],
    page, liveRoot: true, identities: true, scaleConstrained: true,
  }) as any;
  for (const plans of [oldItem, oldTabs]) { const r = await applyComponentPlan(plans, api); if (r.misses.length) throw new Error(`premise: built with ${r.misses.length} miss(es): ${r.misses[0]}`); }
  const host = { ...api, root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
  ok(JSON.stringify(page.children.filter((n) => n.type === 'COMPONENT_SET').map((n) => String(n.name))) === '["tab","tabs"]', 'premise: the file holds the sets `tab` and `tabs`');
  const both = await previewUpdate(host, [{ def: '_tab-item', plans: plansOf('_tab-item') }, { def: 'tabs', plans: plansOf('tabs') }]);
  const tabsP = both.sets.find((x) => x.set === 'tabs');
  ok(both.sets.find((x) => x.set === '_tab-item')?.setRename?.from === 'tab' && !!tabsP && !tabsP.blockers.some((b) => b.includes('_tab-item')),
    `def rename, nested/together: Tab item is renamed in the run, so Tabs is not refused for lacking it (${JSON.stringify(tabsP?.blockers)})`);
  const alone = (await previewUpdate(host, [{ def: 'tabs', plans: plansOf('tabs') }])).sets[0];
  ok(alone.blockers.some((b) => b.startsWith('Not in this file: _tab-item')), `def rename, nested/alone: without Tab item in the run, Tabs is refused, naming it (${JSON.stringify(alone.blockers)})`);
}

/* ── rename ──────────────────────────────────────────────────────────────────────────────────────────── */
section('rename — a declared value rename, and an added axis, rename members in place');
{
  const w = await world(TAG);
  // The file still says size=sm where the plan says size=small (a ledger rename since the build).
  for (const m of membersOf(w.set())) m.name = String(m.name).replace('size=small', 'size=sm');
  const before = identityOf(w.set());
  const ledger = [{ def: TAG, kind: 'value' as const, axis: 'size', from: 'sm', to: 'small', issue: 2265 }];
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }], undefined, ledger);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: w.plans }], previewHashOf(pre), { ledger });
  const n = pre.sets[0].renames.length;
  ok(n > 5 && applyVerdict(res).ok && res.outcomes[0].renamed === n && applyVerdict(res).headline === `✓ renamed ${n}`, `rename/value: ${n} members renamed (${res.outcomes[0].renamed}; ${applyVerdict(res).headline})`);
  const after = identityOf(w.set());
  const keyed = [...before.members].every(([name, b]) => after.members.get(name.replace('size=sm', 'size=small'))?.key === b.key);
  ok(keyed && !membersOf(w.set()).some((m) => String(m.name).includes('size=sm,')), 'rename/keys: each renamed member keeps its key, under its new name');
  const post = (await previewUpdate(w.host, [{ def: TAG, plans: w.plans }])).sets[0];
  ok(post.counts.current === 45, `rename/current: every member reads current (${JSON.stringify(post.counts)})`);
}
{
  // The file predates the `type` axis: it holds only the first type's members, without the segment.
  const w = await world(TAG);
  const first = planComponentName(w.plans[0]).split(', ').find((x) => x.startsWith('type='))!;
  const set = w.set();
  (set as { children: Node[] }).children = membersOf(set).filter((m) => String(m.name).split(', ').includes(first));
  for (const m of membersOf(set)) m.name = String(m.name).split(', ').filter((x) => !x.startsWith('type=')).join(', ');
  const kept = membersOf(set).length;
  const before = identityOf(set);
  const { res } = await confirm(w, [{ def: TAG, plans: w.plans }]);
  ok(applyVerdict(res).ok && res.outcomes[0].renamed === kept && res.outcomes[0].added === 45 - kept,
    `rename/axis added: the ${kept} members gain ${first} in place and the other ${45 - kept} are built (${res.outcomes[0].renamed}, ${res.outcomes[0].added}; ${applyVerdict(res).headline}; ${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 200)})`);
  const after = identityOf(w.set());
  ok([...before.members].every(([name, b]) => [...after.members.values()].some((a) => a.key === b.key && a.id === b.id)), 'rename/axis keys: every member the file held keeps its key and id');
}

/* ── fonts ───────────────────────────────────────────────────────────────────────────────────────────── */
section('fonts — a typeface that will not load refuses the set before anything is written');
{
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const real = w.api.loadFontAsync as (f: { family: string; style: string }) => Promise<void>;
  // The dry run's host and the executor's port are the same `figma` in the plugin, so the font is refused on both.
  w.api.loadFontAsync = (w.host as { loadFontAsync?: unknown }).loadFontAsync = async (f: { family: string; style: string }) => { if (f.family === STYLE_FONT.family && f.style === STYLE_FONT.style) throw new Error('not installed'); return real(f); };
  const stamps = membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join();
  const { res } = await confirm(w, [{ def: TAG, plans: moveGap(w.plans) }]);
  ok(/^fonts: Inter Semi Bold will not load/.test(res.outcomes[0]?.refused ?? ''), `fonts/refused: ${res.outcomes[0]?.refused}`);
  ok(membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join() === stamps && w.api._versions.length === 0, 'fonts/nothing written: no stamp moved, no version saved');
}

{
  // A font installed between the check and the confirm (#2601 review). The check ran with it missing, so the set read
  // "can't be checked" and the designer was never shown its changes. The apply's fresh preview has no blocker; only the
  // blockers in the hash tell the two apart, so the confirm must refuse rather than write changes nobody saw.
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const realApi = w.api.loadFontAsync, realHost = (w.host as { loadFontAsync?: unknown }).loadFontAsync;
  const real = realApi as (f: { family: string; style: string }) => Promise<void>;
  w.api.loadFontAsync = (w.host as { loadFontAsync?: unknown }).loadFontAsync = async (f: { family: string; style: string }) => { if (f.family === STYLE_FONT.family && f.style === STYLE_FONT.style) throw new Error('not installed'); return real(f); };
  const targets = [{ def: TAG, plans: moveGap(w.plans) }];
  const pre = await previewUpdate(w.host, targets);
  w.api.loadFontAsync = realApi;
  (w.host as { loadFontAsync?: unknown }).loadFontAsync = realHost;
  const stamps = membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join();
  const res = await applyUpdate(w.host, w.api as any, targets, previewHashOf(pre));
  ok(/font/.test(pre.sets[0]?.blockers.join('; ') ?? '') && !!res.refusedAll && /the file changed since the check/.test(res.refusedAll)
    && membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join() === stamps && w.api._versions.length === 0,
    `fonts/installed since the check: the confirm is refused and no stamp moved (blockers at the check: ${pre.sets[0]?.blockers.join('; ').slice(0, 80) || 'none'}; ${res.refusedAll ?? 'not refused'})`);
}

/* ── skip ────────────────────────────────────────────────────────────────────────────────────────────── */
section('skip — a member the update cannot vouch for is left exactly as it is');
{
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const [unstamped, noRecord, structural] = [membersOf(w.set())[5], membersOf(w.set())[6], membersOf(w.set())[7]];
  (unstamped.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, '');
  (noRecord.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, '');
  const extra = (w.api.createFrame as () => Node)();
  extra.name = 'designer note';
  (structural.appendChild as (c: Node) => void)(extra);
  const dumpOf = (m: Node): string => JSON.stringify([m.name, [...(m._pluginData as Map<string, string>)], ...(m.findAll as () => Node[])().map((k) => [k.name, k.id, k.boundVariables])]);
  const before = [unstamped, noRecord, structural].map(dumpOf);
  // `skip` for a member with no record is the choice here; the default (`update`) is the `unrecorded/` arm's.
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre), { choices: { noBaseline: 'skip' } });
  const o = res.outcomes[0];
  ok(o.updated.length === 42 && JSON.stringify(o.skipped.map((x) => x.reason).sort()) === JSON.stringify(['a layer was added or removed by hand', 'no as-built record', 'not built by Prism3']),
    `skip/listed: 42 updated; the three are left, each with its reason (${o.updated.length}, ${JSON.stringify(o.skipped)})`);
  ok([unstamped, noRecord, structural].map(dumpOf).every((d, i) => d === before[i]), 'skip/untouched: each of the three is exactly as it was');
}

/* ── unrecorded ──────────────────────────────────────────────────────────────────────────────────────── */
section('unrecorded — a member with no as-built record is updated and named, never read as having no hand edits');
{
  // The NB master's field-label case: out of date when the record was captured, so never recorded.
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const m = membersOf(w.set())[6];
  (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, '');
  const { res } = await confirm(w, [{ def: TAG, plans: moveGap(w.plans) }]);
  const o = res.outcomes[0];
  const v = applyVerdict(res);
  ok(o.updated.includes(String(m.name)) && JSON.stringify(o.unrecorded) === JSON.stringify([String(m.name)]) && v.ok,
    `unrecorded/updated: the member is brought to the plan and named as updated without a record (${JSON.stringify(o.unrecorded)}; ${v.headline})`);
  ok(v.lines[0] === 'tag: 45 updated in place, 1 of them without an as-built record.', `unrecorded/words: the set's line says so (${v.lines[0]})`);
  ok((childNamed(m, 'content').boundVariables as Record<string, { id: string }>).itemSpacing?.id === await varIdOf(w, 'space/999'), 'unrecorded/written: its content gap is the plan\'s');
  const post = (await previewUpdate(w.host, [{ def: TAG, plans: moveGap(w.plans) }])).sets[0];
  ok(post.counts.current === 45 && post.counts.noBaseline === 0, `unrecorded/recorded: it now has a record, and reads current (${JSON.stringify(post.counts)})`);
}

/* ── grid ──────────────────────────────────────────────────────────────────────────────────────────────── */
section('grid — a set laid out in another axis order reads its members as moves, on both axes, for every def (#2519)');
{
  // A SET LAID OUT IN ANOTHER ORDER: one axis's values REVERSED in a copy of the def (the state columns of button and
  // icon-button, so their members sit at another x; the size rows of select and textarea, another y), against the
  // plans as they are. Reversed rather than put in a named order so that it differs from whatever order a def holds:
  // the counts are the same before #2509's reorder (owner decision Q213) and after it, measured on both. Only Button
  // is in the canvas-furniture pilot. Mutations: `gridMoves` reading rows only → `grid/button moves`,
  // `grid/icon-button moves` (and their `… converges`, `… unrelated`); reading the pilot defs only →
  // `grid/icon-button …`, `grid/select …`, `grid/textarea …`.
  const reordered = (id: string, axis: 'state' | 'size'): AnatomyPlan[] => {
    const d = structuredClone(componentDefs.find((x) => x.id === id)!) as unknown as { figmaProperties?: { stateAxis?: { values: string[] } }; variants: Record<string, string[] | undefined>; states?: string[] };
    if (axis === 'state') {
      d.figmaProperties!.stateAxis!.values = [...d.figmaProperties!.stateAxis!.values].reverse();
      d.states = [...(d.states ?? [])].reverse();
    } else d.variants.size = [...(d.variants.size ?? [])].reverse();
    return figmaAnatomySet(d as never, { swapTarget: SWAP_TARGET });
  };
  const at = (set: Node): Map<string, string> => new Map(membersOf(set).map((m) => [String(m.name), `${m.x},${m.y}`] as const));
  for (const [id, n, axis] of [['button', 576, 'x'], ['icon-button', 216, 'x'], ['select', 56, 'y'], ['textarea', 56, 'y']] as const) {
    const along = axis === 'x' ? 'state' : 'size';
    const plans = plansOf(id);
    const w = await world(id, reordered(id, along));
    const name = String(w.set().name), total = membersOf(w.set()).length;
    const pre = await previewUpdate(w.host, [{ def: id, plans }]);
    const c = pre.sets[0].counts;
    // `positions` is capped at LIST_CAP like every list a dry run carries (`truncated` says by how many); the count is whole.
    ok(c.move === n && (pre.sets[0].positions?.length ?? 0) + (pre.sets[0].truncated?.positions ?? 0) === n && c.update + c.add + c.drop + c.rename + c.handEdited + c.noBaseline === 0 && previewLine(pre.sets[0]) === `${name}: ${total} members. ${n} to move.`,
      `grid/${id} moves: laid out in another order, ${n} members at another ${axis} read as moves, and nothing else (${previewLine(pre.sets[0])}; ${JSON.stringify(c)})`);
    const before = identityOf(w.set());
    const res = await applyUpdate(w.host, w.api as any, [{ def: id, plans }], previewHashOf(pre));
    const v = applyVerdict(res);
    const after = identityOf(w.set());
    const keptIds = [...before.members].every(([k, b]) => after.members.get(k)?.id === b.id && after.members.get(k)?.key === b.key) && after.members.size === total;
    const next = (await previewUpdate(w.host, [{ def: id, plans }])).sets[0];
    ok(v.headline === `✓ moved ${n}` && v.lines[0] === `${name}: ${n} moved.` && keptIds && previewLine(next) === `${name}: up to date (${total} members).`,
      `grid/${id} converges: the apply moves the ${n}, keeps every id, and the next dry run reads up to date (${v.headline} | ${v.lines[0]} | ids ${keptIds ? 'kept' : 'changed'} | ${previewLine(next)})`);
    // AN UNRELATED UPDATE over the same old layout (every member's root gap moves): its moves are reported, never an
    // x or y changed silently. Every member whose place changed is one the dry run listed, and the apply counts them.
    const w2 = await world(id, reordered(id, along), { extraVars: ['space/999'] });
    const next2 = plans.map((p) => { const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan; (q.root as unknown as { bound: Record<string, string> }).bound = { ...((q.root as unknown as { bound?: Record<string, string> }).bound ?? {}), itemSpacing: 'space/999' }; return q; });
    const pre2 = await previewUpdate(w2.host, [{ def: id, plans: next2 }]);
    const was = at(w2.set());
    const res2 = await applyUpdate(w2.host, w2.api as any, [{ def: id, plans: next2 }], previewHashOf(pre2));
    const changed = [...at(w2.set())].filter(([k, xy]) => was.get(k) !== xy).map(([k]) => k);
    // Each member that changed place is one the dry run listed: by name where the list is whole, by count past its cap.
    const listed = new Set(pre2.sets[0].positions ?? []);
    const silent = pre2.sets[0].truncated?.positions ? changed.length - (pre2.sets[0].counts.move ?? 0) : changed.filter((k) => !listed.has(k)).length;
    ok(pre2.sets[0].counts.update === total && pre2.sets[0].counts.move === n && changed.length === n && silent === 0 && res2.outcomes[0]?.moved === n,
      `grid/${id} unrelated: an update for another reason moves the ${n} the dry run listed, counts them, and moves nothing silently (${changed.length} moved, ${silent} not listed, counted ${res2.outcomes[0]?.moved}; ${previewLine(pre2.sets[0])})`);
  }
}

{
  // A MOVE THE DRY RUN COULD NOT LIST (#2519): an update that resizes members (every member's start padding moves to
  // space/999) re-lays the grid by their NEW sizes, which the dry run, reading the file as it is, cannot know. The
  // apply still counts every member whose place changed, so no x or y changes silently. Mutation: the apply counting
  // moves only when the dry run listed some → `grid/resized`.
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const next = w.plans.map((p) => { const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan; (q.root as unknown as { bound: Record<string, string> }).bound = { ...((q.root as unknown as { bound?: Record<string, string> }).bound ?? {}), paddingLeft: 'space/999' }; return q; });
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  const was = new Map(membersOf(w.set()).map((m) => [String(m.name), `${m.x},${m.y}`] as const));
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre));
  const changed = membersOf(w.set()).filter((m) => was.get(String(m.name)) !== `${m.x},${m.y}`).length;
  const v = applyVerdict(res);
  ok(pre.sets[0].counts.move === undefined && changed > 0 && res.outcomes[0]?.moved === changed && v.lines[0] === `tag: 45 updated in place, ${changed} moved.`,
    `grid/resized: an update that resizes members moves ${changed} the dry run could not list, and the apply counts every one (${previewLine(pre.sets[0])} → ${v.lines[0]})`);
}

/* ── re-lay ────────────────────────────────────────────────────────────────────────────────────────────── */
section('re-lay — an update over a set leaves a member Prism3 didn\'t build where it is, even on a planned coordinate (#2494)');
{
  // The update runs for another reason (every member's gap moves), so the build's pass re-lays the grid. One member
  // has no stamp (Prism3 didn't build it, so Adopt could claim it) and sits off the grid on its planned coordinate.
  // Mutation: the LAY OUT pass's unstamped guard removed → `relay/unbuilt left`.
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const own = membersOf(w.set())[6];
  (own.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, '');
  own.x = Number(own.x) + 300;
  own.y = Number(own.y) + 300;
  const at = JSON.stringify([own.x, own.y]);
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  ok(pre.sets[0].counts.unstamped === 1 && pre.sets[0].counts.update === 44 && pre.sets[0].adoptable.includes(String(own.name)),
    `premise: the dry run reads 44 to update and the one not built by Prism3, which Adopt could claim (${JSON.stringify(pre.sets[0].counts)})`);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre));
  const o = res.outcomes[0];
  const gap = await varIdOf(w, 'space/999');
  const written = membersOf(w.set()).filter((m) => (childNamed(m, 'content').boundVariables as Record<string, { id: string }>).itemSpacing?.id === gap).length;
  ok(o.updated.length === 44 && written === 44 && JSON.stringify([own.x, own.y]) === at && pdOfMember(own, STAMP_KEY) === '',
    `relay/unbuilt left: the update re-lays the grid and leaves the member Prism3 didn't build exactly where it was (${at} → ${JSON.stringify([own.x, own.y])}; ${o.updated.length} updated, ${written} with the new gap)`);
  ok(o.skipped.some((x) => x.member === String(own.name) && x.reason === 'not built by Prism3'),
    `relay/unbuilt named: the verdict names it as left, not built by Prism3 (${JSON.stringify(o.skipped)})`);
}

{
  // ITS SIZE STILL COUNTS (#2511 review, Lane C): the re-lay leaves a member Prism3 didn't build where it is, but sizes
  // its row and column by it, as the dry run's `gridMoves` does. Made wider and taller than its neighbours, in its own
  // cell, the next member across starts one gap after its right edge, the next one down one gap below its bottom, and
  // no member lands on top of it. The sizes are the TEST's, through the shim's own accessors. Mutation: the LAY OUT
  // pass's measuring loop skipping unstamped members → `relay/unbuilt size counts`.
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const own = membersOf(w.set())[6];
  (own.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, '');
  const [wWas, hWas] = [Number(own.width), Number(own.height)];
  Object.defineProperty(own, 'width', { configurable: true, enumerable: true, get: () => wWas + 300 });
  Object.defineProperty(own, 'height', { configurable: true, enumerable: true, get: () => hWas + 30 });
  const at = JSON.stringify([own.x, own.y]);
  const next = moveGap(w.plans);
  await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], await previewUpdate(w.host, [{ def: TAG, plans: next }]).then(previewHashOf));
  const [ox, oy, ow, oh] = [Number(own.x), Number(own.y), Number(own.width), Number(own.height)];
  const others = membersOf(w.set()).filter((m) => m !== own);
  const across = others.filter((m) => Number(m.y) === oy && Number(m.x) > ox).sort((a, b) => Number(a.x) - Number(b.x))[0];
  const below = others.filter((m) => Number(m.x) === ox && Number(m.y) > oy).sort((a, b) => Number(a.y) - Number(b.y))[0];
  const overlaps = others.filter((m) => Number(m.x) < ox + ow && Number(m.x) + Number(m.width) > ox && Number(m.y) < oy + oh && Number(m.y) + Number(m.height) > oy).map((m) => String(m.name));
  ok(JSON.stringify([own.x, own.y]) === at && !!across && !!below && Number(across.x) === ox + ow + 24 && Number(below.y) === oy + oh + 24 && overlaps.length === 0,
    `relay/unbuilt size counts: a member Prism3 didn't build, wider and taller than its neighbours, still sizes its column and row: the next across starts at ${ox + ow + 24} (${across ? Number(across.x) : 'none'}), the next down at ${oy + oh + 24} (${below ? Number(below.y) : 'none'}), and ${overlaps.length} member(s) land on top of it${overlaps.length ? `: ${overlaps.slice(0, 2).join('; ')}` : ''}`);
}

{
  // A STAMP NOT PRISM3'S, AND A COPY (#2510): the dry run reads both as not built by Prism3 (`ownedView`), so the apply
  // must not move them either. One member's stamp is malformed; another's record names a third member, as a Figma
  // Duplicate's does. Both sit off the grid on their planned coordinate; the update runs for another reason, so the
  // grid is re-laid. The ownership test is shared (`builtByPrism3`), and each half is pinned BY NAME. Mutations:
  // `ownedView` reading the stamp alone again → `relay/not ours listed`; the LAY OUT pass reading the stamp alone
  // again → `relay/not ours left`.
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const ms = membersOf(w.set());
  const put = (m: Node, k: string, v: string): void => (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, k, v);
  const pd = (m: Node, k: string): string => (m.getSharedPluginData as (a: string, b: string) => string)(NS, k);
  const [bad, copy, orig] = [ms[6], ms[9], ms[8]];
  put(bad, STAMP_KEY, 'not a stamp');
  put(copy, BASELINE_KEY, pd(orig, BASELINE_KEY));
  for (const m of [bad, copy]) { m.x = Number(m.x) + 300; m.y = Number(m.y) + 300; }
  const state = (m: Node): string => JSON.stringify([m.x, m.y, pd(m, STAMP_KEY), pd(m, BASELINE_KEY)]);
  const was = [state(bad), state(copy)];
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  const listed = (pre.sets[0].positions ?? []).filter((n) => n === String(bad.name) || n === String(copy.name));
  ok(pre.sets[0].counts.unstamped === 2 && listed.length === 0,
    `relay/not ours listed: the dry run reads the malformed stamp and the copy as not built by Prism3 and lists neither as a move (${JSON.stringify(pre.sets[0].counts)}; listed ${JSON.stringify(listed)})`);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre));
  const gap = await varIdOf(w, 'space/999');
  const written = membersOf(w.set()).filter((m) => (childNamed(m, 'content').boundVariables as Record<string, { id: string }>).itemSpacing?.id === gap).length;
  const now = [state(bad), state(copy)];
  ok(res.outcomes[0].updated.length === 43 && written === 43 && now[0] === was[0] && now[1] === was[1],
    `relay/not ours left: the update re-lays the grid and leaves the malformed stamp and the copy exactly as they were (${was.join(' ')} → ${now.join(' ')}; ${res.outcomes[0].updated.length} updated, ${written} with the new gap)`);
}

/* ── sets on a page (#2542) ───────────────────────────────────────────────────────────────────────────── */
section('page — an update re-spaces the sets Prism3 built on a page as a new build would, and moves nothing else (#2542)');
{
  // The button family on one page, built as a fresh file would be: 400 apart (`SET_GAP`, #2502). Then squeezed back
  // to the old 160 a file built before #2502 has, with a note of the designer's own (a frame Prism3 didn't build) on
  // the page. The set's `parent` is the page, as on the host (the shim leaves it unset). Mutation: the set-move pass
  // dropped from the dry run and the apply → `page/set moves`, `page/converges`.
  const IDS = ['button', 'button-destructive', 'button-neutral'];
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
  // The old spacing: each later set 160 right of the one before.
  for (let k = 1; k < sets.length; k++) sets[k].x = Number(sets[k - 1].x) + Number(sets[k - 1].width) + 160;
  const note = { type: 'FRAME', name: 'my notes', x: 0, y: 6000, width: 900, height: 200, children: [] } as unknown as Node;
  // And the page's section header above the sets, as a built page has (#2405): never moved, never in the row.
  const header = { type: 'INSTANCE', name: '_section-header', x: 0, y: -400, width: 3000, height: 152, children: [] } as unknown as Node;
  page.children.push(note, header);
  const noteAt = JSON.stringify([note.x, note.y]);
  const headerAt = JSON.stringify([header.x, header.y]);
  const host = { ...api, root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
  const targets = IDS.map((id) => ({ def: id, plans: plansBy.get(id)! }));
  const ids = (): string => JSON.stringify(sets.map((st) => [st.id, ...membersOf(st).map((m) => m.id)]));
  const idsWas = ids();
  // THE DRY RUN: the two later sets move, and nothing else does.
  const pre = await previewUpdate(host, targets);
  const moving = pre.sets.filter((p) => p.setMove).map((p) => p.set);
  const v = previewVerdict(pre);
  ok(JSON.stringify(moving) === JSON.stringify(['button-destructive', 'button-neutral']) && pre.sets.every((p) => !p.blockers.length)
    && v.headline === 'Would change 2 of 3' && v.lines.includes('2 sets to move, so the sets on each page sit as a new build spaces them.')
    && previewLine(pre.sets[1]) === 'button-destructive: 576 members. The set moves to its place on the page.',
    `page/set moves: on a page squeezed to the old spacing, the dry run moves the 2 later sets and nothing else (${JSON.stringify(moving)}; ${v.headline}; ${previewLine(pre.sets[1])})`);
  // THE APPLY: each set lands where a fresh build put it, every id kept, the note untouched, and the next dry run up to date.
  const res = await applyUpdate(host, api, targets, previewHashOf(pre));
  const av = applyVerdict(res);
  const at = sets.map((n) => [Number(n.x), Number(n.y)]);
  const next = await previewUpdate(host, targets);
  ok(JSON.stringify(at) === JSON.stringify(fresh) && ids() === idsWas && av.headline === '✓ 2 sets moved'
    && av.lines.includes('button-destructive: the set moved to its place on the page.') && previewVerdict(next).headline === '✓ All sets up to date',
    `page/converges: the apply puts each set where a fresh build did (${JSON.stringify(at)}, fresh ${JSON.stringify(fresh)}), keeps every set and member id, and the next dry run is up to date (${av.headline}; ${previewVerdict(next).headline})`);
  ok(JSON.stringify([note.x, note.y]) === noteAt && JSON.stringify([header.x, header.y]) === headerAt,
    `page/untouched: a frame Prism3 didn't build, and the page header, stay where they were (${noteAt} → ${JSON.stringify([note.x, note.y])}; header ${headerAt} → ${JSON.stringify([header.x, header.y])})`);
  // IN ORDER, AS LITTLE AS IT TAKES: a note far right in the row pulls no set past it, and a set Prism3 didn't build stays
  // put as an obstacle the later set goes around, never jumps over. Squeezed again, with the note moved into the row.
  for (let k = 1; k < sets.length; k++) sets[k].x = Number(sets[k - 1].x) + Number(sets[k - 1].width) + 160;
  note.x = 9000; note.y = 0;
  const pre2 = await previewUpdate(host, targets);
  ok(JSON.stringify(pre2.sets.map((p) => p.setMove?.to ?? null)) === JSON.stringify([null, { x: 1264, y: 0 }, { x: 2528, y: 0 }]),
    `page/in order: a note far right in the row pulls no set past it; the sets take the fresh spacing (${JSON.stringify(pre2.sets.map((p) => p.setMove?.to ?? null))})`);
  const neutral = sets[2];
  const stampsWas = membersOf(neutral).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY));
  for (const m of membersOf(neutral)) (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, '');
  neutral.x = 1700;
  const pre3 = await previewUpdate(host, targets.slice(0, 2));
  // button at 0..864; the unbuilt set at 1700..2564; button-destructive would sit at 1264..2128, which overlaps it, so it
  // goes past it: 2564 + 400 = 2964. The unbuilt set never moves.
  await applyUpdate(host, api, targets.slice(0, 2), previewHashOf(pre3));
  ok(pre3.sets[1]?.setMove?.to.x === 2964 && Number(sets[1].x) === 2964 && Number(neutral.x) === 1700,
    `page/around: a set Prism3 didn't build stays put, and the set that would overlap it goes just past it, in the dry run and the apply (${JSON.stringify(pre3.sets[1]?.setMove ?? null)}; applied at ${sets[1].x}; the unbuilt set at ${neutral.x})`);
  membersOf(neutral).forEach((m, k) => (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, stampsWas[k]));
  note.x = 0; note.y = 6000;
  // SCOPED TO ONE DEF, the page does not take part: the update reads one of its three sets, so it moves none.
  for (let k = 1; k < sets.length; k++) sets[k].x = Number(sets[k - 1].x) + Number(sets[k - 1].width) + 160;
  const one = await previewUpdate(host, [targets[1]]);
  const xsBefore = JSON.stringify(sets.map((st) => Number(st.x)));
  await applyUpdate(host, api, [targets[1]], previewHashOf(one));
  ok(!one.sets[0].setMove && JSON.stringify(sets.map((st) => Number(st.x))) === xsBefore,
    `page/scoped: an update that reads one set of the page moves no set, in the dry run or the apply (${JSON.stringify(one.sets[0].setMove ?? null)}; ${xsBefore} → ${JSON.stringify(sets.map((st) => Number(st.x)))})`);
  // A SET THE UPDATE CAN'T TOUCH holds its page still: two of button-destructive's members on one coordinate block it,
  // so neither the dry run nor the apply moves any set on the page, though the third is squeezed too.
  // Mutation: `pageSetMoves` dropping its blocked check (`here.some((f) => f.blocked) ||`) → `page/blocked`.
  const twin = membersOf(sets[1]);
  const nameWas = String(twin[1].name);
  twin[1].name = String(twin[0].name);
  const pre4 = await previewUpdate(host, targets);
  const xs4 = JSON.stringify(sets.map((st) => Number(st.x)));
  await applyUpdate(host, api, targets, previewHashOf(pre4));
  ok(pre4.sets[1].blockers.length > 0 && pre4.sets.every((p) => !p.setMove) && JSON.stringify(sets.map((st) => Number(st.x))) === xs4,
    `page/blocked: a page holding a set the update can't touch moves no set, in the dry run or the apply (${pre4.sets[1].blockers.length} blocker(s); moves ${JSON.stringify(pre4.sets.map((p) => p.setMove?.to ?? null))}; ${xs4} → ${JSON.stringify(sets.map((st) => Number(st.x)))})`);
  twin[1].name = nameWas;
  // THE RE-SPACING ONLY MAKES ROOM (owner decision Q248 A): a set moves only when it sits closer to its left neighbour
  // than a fresh build's 400, and just far enough to clear it. Each laid out by hand here, button at 0..864.
  const movesOf = async () => (await previewUpdate(host, targets)).sets.map((p) => p.setMove?.to ?? null);
  // Spaced wider than a fresh build: 600 apart. Nothing moves. Mutation: the "only when too close" check removed → this.
  sets[1].x = 864 + 600; sets[2].x = sets[1].x + 864 + 600;
  const wider = await movesOf();
  ok(JSON.stringify(wider) === JSON.stringify([null, null, null]),
    `page/wider: sets a designer spaced wider than a fresh build (600 apart) stay exactly where they are (${JSON.stringify(wider)})`);
  // A second row: button-neutral below the first row (its top under the first row's 3480), its x inside button's span.
  // It has no Prism3 set to its left in its own row, so it stays; button-destructive, 160 from button, still moves.
  // Mutation: the left neighbour taken from any row, not the set's own → this.
  sets[1].x = 864 + 160; sets[2].x = 300; sets[2].y = 4000;
  const rows = await movesOf();
  ok(JSON.stringify(rows) === JSON.stringify([null, { x: 1264, y: 0 }, null]),
    `page/second row: a set in a second row below the first stays where it is, never lifted into the first; the too-close set in the first row still moves (${JSON.stringify(rows)})`);
  sets[2].y = 0;
  // Too close by a little, 300 apart: it moves to exactly 400 clear (1264), no further, and the set beyond it, already
  // 572 clear of where it lands, stays. Mutation: the move sent past a fixed step rather than to `SET_GAP` → this.
  sets[1].x = 864 + 300; sets[2].x = 2700;
  const enough = await movesOf();
  ok(JSON.stringify(enough) === JSON.stringify([null, { x: 1264, y: 0 }, null]),
    `page/just enough: a set 300 from its neighbour moves just far enough to sit 400 clear (1264), and the one beyond, already clear, stays (${JSON.stringify(enough)})`);
  // NEVER ONTO A SET THAT STAYS (the UI lane's repro on #2548): button at 0, button-destructive at 960 (96 clear, too
  // close), a frame of the designer's at 1800..1900, button-neutral at 1920 (1056 clear of button, so it stays). Pushed
  // past the frame alone, button-destructive would land at 2300, over button-neutral (1920..2784); it goes past that set
  // too, to 2784 + 400 = 3184. Read after the APPLY, from the page: no two nodes in the row overlap. Mutation: the
  // obstacle push reading only the nodes Prism3 didn't build → this, and `page/respace onto a set` below.
  const post = { type: 'FRAME', name: 'my post-it', x: 1800, y: 0, width: 100, height: 200, children: [] } as unknown as Node;
  page.children.push(post);
  sets[1].x = 960; sets[2].x = 1920;
  const pre5 = await previewUpdate(host, targets);
  await applyUpdate(host, api, targets, previewHashOf(pre5));
  const row = page.children.filter((n) => n.type === 'COMPONENT_SET' || n === post) as Node[];
  const box = (n: Node) => [Number(n.x), Number(n.y), Number(n.width), Number(n.height)];
  const over = row.flatMap((a, i) => row.slice(i + 1).filter((b) => { const [ax, ay, aw, ah] = box(a), [bx, by, bw, bh] = box(b); return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }).map((b) => `${a.name} over ${b.name}`));
  ok(over.length === 0 && Number(sets[1].x) === 3184 && Number(sets[2].x) === 1920 && Number(post.x) === 1800,
    `page/never onto a set: a set pushed past a frame of the designer's goes past the Prism3 set that stays there too (3184), and after the apply no two nodes in the row overlap (${over.join(', ') || 'none overlap'}; at ${JSON.stringify(sets.map((st) => Number(st.x)))}; the frame at ${post.x})`);
  page.children.splice(page.children.indexOf(post), 1);
  // A SET WHOSE ONLY STAMPS ARE NOT PRISM3'S is a designer's set, by the members' shared test (`builtByPrism3`, #2510),
  // so it stays put as an obstacle and does not hold the page still as a set the update didn't read. button-neutral at
  // 1700, read by neither update: first every stamp malformed, then a single valid stamp copied with its record from
  // another member (a Duplicate), the rest blank. Either way button-destructive goes around it, to 2964. Mutation: the
  // set-level check reading "any member has a stamp" again → this.
  const nm = membersOf(neutral);
  const pdOfM = (m: Node, k: string): string => (m.getSharedPluginData as (a: string, b: string) => string)(NS, k);
  const putM = (m: Node, k: string, v: string): void => (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, k, v);
  const was6 = nm.map((m) => [pdOfM(m, STAMP_KEY), pdOfM(m, BASELINE_KEY)]);
  const around = async (): Promise<number | null> => { sets[1].x = 864 + 160; neutral.x = 1700; return (await previewUpdate(host, targets.slice(0, 2))).sets[1]?.setMove?.to.x ?? null; };
  for (const m of nm) putM(m, STAMP_KEY, 'not a stamp');
  const malformed = await around();
  nm.forEach((m, k) => putM(m, STAMP_KEY, k === 1 ? was6[0][0] : ''));
  putM(nm[1], BASELINE_KEY, was6[0][1]);
  const copied = await around();
  nm.forEach((m, k) => { putM(m, STAMP_KEY, was6[k][0]); putM(m, BASELINE_KEY, was6[k][1]); });
  ok(malformed === 2964 && copied === 2964,
    `page/not ours by its stamps: a set whose stamps are all malformed, or whose one stamp is a copy, is a designer's set the moving set goes around (malformed → ${malformed}, copied → ${copied}; want 2964 each)`);
}

/* ── set moves and page order together (#2542 × #2568) ─────────────────────────────────────────────────── */
// One run whose only work is BOTH: sets squeezed to the old spacing on their page (#2542), and component pages out of
// alphabetical order (#2568). One named version for all of it, both done, the hash covering both, the verdict naming
// both. The expected title, headline and orders are literals. Mutations: the set's move dropped from `previewHashOf` →
// `both/hash, set`; the page list dropped from it → `both/hash, page`.
section('both — set moves and page reorders in one run: one version, both done, both in the hash and the verdict');
{
  const IDS = ['button', 'button-destructive', 'button-neutral'];
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
  const squeeze = (): void => { for (let k = 1; k < sets.length; k++) sets[k].x = Number(sets[k - 1].x) + Number(sets[k - 1].width) + 160; };
  squeeze();
  type P = { name: string; isPageDivider?: boolean; appendChild(): void };
  const pg = (name: string, isPageDivider = false): P => ({ name, isPageDivider, appendChild() {} });
  const pages: P[] = [pg('Cover'), pg('---', true), pg('Components'), pg('↳ Tabs'), pg('↳ Badge'), pg('↳ Divider')];
  const host = { ...api, root: { ...api.root,
    findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)),
    get children() { return pages; }, insertChild(i: number, p: P) { pages.splice(pages.indexOf(p), 1); pages.splice(i, 0, p); } } } as unknown as ApplyHost;
  const names = () => pages.map((p) => p.name);
  const targets = IDS.map((id) => ({ def: id, plans: plansBy.get(id)! }));
  const pre = await previewUpdate(host, targets);
  const v = previewVerdict(pre);
  ok(JSON.stringify(pre.sets.filter((p) => p.setMove).map((p) => p.set)) === JSON.stringify(['button-destructive', 'button-neutral'])
    && JSON.stringify(pre.pages) === JSON.stringify(['↳ Tabs'])
    && v.lines.includes('2 sets to move, so the sets on each page sit as a new build spaces them.') && v.lines.includes('Component pages: 1 to reorder (Tabs).'),
    `both/dry run: the 2 later sets move and Tabs is listed to reorder (${JSON.stringify(pre.pages)}; ${v.lines.join(' | ')})`);
  const res = await applyUpdate(host, api, targets, previewHashOf(pre));
  const av = applyVerdict(res);
  ok(JSON.stringify(api._versions) === JSON.stringify(['Before Prism3 updated button-destructive, button-neutral, the page order']),
    `both/version: one named version, naming the moving sets and the page order (${JSON.stringify(api._versions)})`);
  ok(JSON.stringify(sets.map((n) => [Number(n.x), Number(n.y)])) === JSON.stringify(fresh)
    && JSON.stringify(names()) === JSON.stringify(['Cover', '---', 'Components', '↳ Badge', '↳ Divider', '↳ Tabs']),
    `both/done: each set where a fresh build put it, and the pages in order (${JSON.stringify(sets.map((n) => Number(n.x)))}; ${JSON.stringify(names())})`);
  ok(av.ok && av.headline === '✓ 2 sets moved, reordered 1 page'
    && av.lines.includes('button-destructive: the set moved to its place on the page.') && av.lines.includes('Component pages: 1 reordered (Tabs).'),
    `both/verdict: the headline and the lines name the set moves and the reorder (${av.headline}; ${av.lines.join(' | ')})`);
  // THE HASH covers both. A set moved after the check refuses the confirm; so does a page moved after it.
  squeeze();
  const pre2 = await previewUpdate(host, targets);
  sets[2].x = Number(sets[2].x) + 50;
  const v2 = api._versions.length;
  const res2 = await applyUpdate(host, api, targets, previewHashOf(pre2));
  ok(!!res2.refusedAll && api._versions.length === v2, `both/hash, set: a set moved since the check refuses the confirm (${res2.refusedAll ?? 'applied'})`);
  pages.splice(pages.indexOf(pages.find((p) => p.name === '↳ Tabs')!), 1); pages.splice(3, 0, pg('↳ Tabs'));
  const pre3 = await previewUpdate(host, targets);
  const divider = pages.find((p) => p.name === '↳ Divider')!; pages.splice(pages.indexOf(divider), 1); pages.splice(4, 0, divider);
  const v3 = api._versions.length;
  const res3 = await applyUpdate(host, api, targets, previewHashOf(pre3));
  ok(!!res3.refusedAll && api._versions.length === v3, `both/hash, page: a page moved since the check refuses the confirm (${res3.refusedAll ?? 'applied'})`);
}

/* ── re-spacing, as a function (#2542) ─────────────────────────────────────────────────────────────────── */
section('respaceSets — a moving set never lands on another Prism3 set (#2548 review)');
{
  // The UI lane's repro, exactly: A at 0, B at 960 (too close), a frame Prism3 didn't build at 1800..1900, C at 1920,
  // all 800 wide. B needs 1200; the frame pushes it to 2300, which is over C (1920..2720), so it goes on to 3120.
  const nodes = [
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 0, y: 0, width: 800, height: 800 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 960, y: 0, width: 800, height: 800 },
    { id: 'frame', type: 'FRAME', x: 1800, y: 0, width: 100, height: 800 },
    { id: 'C', type: 'COMPONENT_SET', prism3: true, x: 1920, y: 0, width: 800, height: 800 },
  ];
  const moves = respaceSets(nodes);
  const at = new Map(nodes.map((n) => [n.id, n.x]));
  for (const m of moves) at.set(m.id, m.to.x);
  const over = nodes.flatMap((a, i) => nodes.slice(i + 1).filter((b) => at.get(a.id)! < at.get(b.id)! + b.width && at.get(a.id)! + a.width > at.get(b.id)!).map((b) => `${a.id} over ${b.id}`));
  ok(over.length === 0 && JSON.stringify(moves.map((m) => [m.id, m.to.x])) === JSON.stringify([['B', 3120]]),
    `page/respace onto a set: B, pushed past the frame, goes past C as well (3120) and lands on nothing (${JSON.stringify(moves.map((m) => [m.id, m.to.x]))}; ${over.join(', ') || 'none overlap'})`);
}
{
  // NEVER ONTO A SET ALREADY MOVED (the re-review's repro on #2548): A at 0 (800 wide), B at 900 (800), C at 1000 (900),
  // a frame Prism3 didn't build at 1500..1600, all in one row. B needs 1200; the frame pushes it to 2000. C, whose left
  // neighbour is still A, needs 1200 too; the frame pushes it to 2000, which is where B now sits (2000..2800), so it goes
  // on to 3200. Mutation: the obstacle push leaving out the sets already placed (`...placed`) → this.
  const nodes = [
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 0, y: 0, width: 800, height: 800 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 900, y: 0, width: 800, height: 800 },
    { id: 'C', type: 'COMPONENT_SET', prism3: true, x: 1000, y: 0, width: 900, height: 800 },
    { id: 'frame', type: 'FRAME', x: 1500, y: 0, width: 100, height: 800 },
  ];
  const moves = respaceSets(nodes);
  const at = new Map(nodes.map((n) => [n.id, n.x]));
  for (const m of moves) at.set(m.id, m.to.x);
  const over = nodes.flatMap((a, i) => nodes.slice(i + 1).filter((b) => at.get(a.id)! < at.get(b.id)! + b.width && at.get(a.id)! + a.width > at.get(b.id)!).map((b) => `${a.id} over ${b.id}`));
  ok(over.length === 0 && JSON.stringify(moves.map((m) => [m.id, m.to.x])) === JSON.stringify([['B', 2000], ['C', 3200]]),
    `page/respace onto a moved set: C, pushed past the frame, goes past B where B was just moved (3200) and lands on nothing (${JSON.stringify(moves.map((m) => [m.id, m.to.x]))}; ${over.join(', ') || 'none overlap'})`);
}

/* ── no change ───────────────────────────────────────────────────────────────────────────────────────── */
section('no change — a member the dry run calls "no changes" is written nothing but its stamp and record (#2379)');
/** Every write the host takes under `root`, from here on: a property assigned, or a method that changes the node
 *  called. Installed by the TEST on the shim's own nodes (a property becomes an accessor that logs its set; a
 *  method is wrapped), so the update's own report of what it wrote is never the witness (docs/34). */
const watchWrites = (root: Node): string[] => {
  const log: string[] = [];
  const walk = (n: Node, path: string): void => {
    for (const k of Object.keys(n)) {
      if (k === 'children' || k === 'parent') continue;
      const d = Object.getOwnPropertyDescriptor(n, k);
      if (!d || !d.configurable) continue;
      if (typeof d.value === 'function') {
        if (/^(get|find|export|load)/.test(k)) continue;
        const f = d.value as (...a: unknown[]) => unknown;
        Object.defineProperty(n, k, { configurable: true, enumerable: d.enumerable, writable: true,
          value: (...a: unknown[]) => { log.push(`${path} ${k}(${a.slice(0, 2).map((x) => (typeof x === 'string' ? x : typeof x)).join(', ')})`); return f.apply(n, a); } });
      } else if ('value' in d) {
        let v = d.value;
        Object.defineProperty(n, k, { configurable: true, enumerable: d.enumerable, get: () => v, set: (x) => { log.push(`${path} .${k} =`); v = x; } });
      }
    }
    for (const c of (n.children as Node[] | undefined) ?? []) walk(c, `${path}/${String(c.name)}`);
  };
  walk(root, String(root.name));
  return log;
};
{
  // The NB master's 16 sets: every member built by an earlier plugin, its stamp without the executor-revision
  // field, matching its plan and its record. The dry run reads "no changes"; the apply wrote the build's whole pass
  // over them. Mutation: those members sent to the build's update pass again → `nochange/writes`.
  const w = await world(TAG);
  for (const m of membersOf(w.set())) {
    const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.split('|').slice(0, 2).join('|'));
  }
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }]);
  const c0 = pre.sets[0]?.counts;
  ok(c0?.revisionUnknown === 45 && /built by an earlier plugin/.test(previewVerdict(pre).lines.join(' ')) && /no changes/.test(previewVerdict(pre).lines[0] ?? ''),
    `premise: all 45 members read "built by an earlier plugin", and the set reads no changes (${JSON.stringify(c0)}; ${previewVerdict(pre).lines[0]})`);
  const log = watchWrites(w.set());
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: w.plans }], previewHashOf(pre));
  const other = log.filter((x) => !new RegExp(`setSharedPluginData\\(${NS}, (${STAMP_KEY}|${BASELINE_KEY})\\)$`).test(x));
  ok(other.length === 0, `nochange/writes: nothing is written to the set or its members but each member's stamp and record (${other.length} other writes${other.length ? `, e.g. ${other.slice(0, 3).join(' | ')}` : ''})`);
  const again = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }]);
  ok(applyVerdict(res).ok && again.sets[0]?.counts.current === 45,
    `nochange/current: each member then reads current (${JSON.stringify(again.sets[0]?.counts)}; ${applyVerdict(res).headline})`);
}

/* ── the record's format ──────────────────────────────────────────────────────────────────────────────── */
section('format — a record reads the same in a copy of the file, and a record of an earlier format is no record (#2379 review)');
{
  // A DUPLICATE OF THE FILE (Lane D, on a copy of the NB master): the same components and styles under the same names,
  // with new keys and style ids, as Figma gives a copy. A record that hashed keys read every instance and styled text
  // there as a hand edit, on sets nobody had edited. Mutations: an instance's main hashed by key → `format/duplicate`;
  // a text style hashed by id → `format/duplicate`.
  const g = globalThis as { figma?: unknown };
  const had = g.figma;
  g.figma = { getStyleByIdAsync: async (id: string) => ({ name: id.replace(/^S:(B:)?/, '') }) };
  resetStyleNames();
  try {
    const a = await world(TAG);
    const b = await world(TAG, plansOf(TAG), { keyPrefix: 'KB', styleIdPrefix: 'B:' });
    const firstOf = (set: Node, t: string): Node | undefined => (membersOf(set).flatMap((m) => (m.findAll as (f: (n: Node) => boolean) => Node[])((n) => n.type === t)))[0];
    const keyA = String(((firstOf(a.set(), 'INSTANCE')?.mainComponent ?? {}) as { key?: unknown }).key ?? '');
    const keyB = String(((firstOf(b.set(), 'INSTANCE')?.mainComponent ?? {}) as { key?: unknown }).key ?? '');
    const styled = (set: Node): string => String(membersOf(set).flatMap((m) => (m.findAll as (f: (n: Node) => boolean) => Node[])((n) => n.type === 'TEXT' && !!n.textStyleId))[0]?.textStyleId ?? '');
    ok(!!keyA && !!keyB && keyA !== keyB && styled(a.set()) !== styled(b.set()) && !!styled(b.set()),
      `premise: the copy's instances point at mains with other keys, and its text at styles with other ids (${keyA} / ${keyB}; ${styled(a.set())} / ${styled(b.set())})`);
    const byName = new Map(membersOf(a.set()).map((m) => [String(m.name), m] as const));
    for (const m of membersOf(b.set())) {
      const src = byName.get(String(m.name))!;
      const pd = (n: Node, k: string): string => (n.getSharedPluginData as (a: string, b: string) => string)(NS, k);
      (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, pd(src, STAMP_KEY));
      (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, JSON.stringify({ ...JSON.parse(pd(src, BASELINE_KEY)), id: String(m.id) }));
    }
    const p = (await previewUpdate(b.host, [{ def: TAG, plans: b.plans }])).sets[0];
    ok(p.counts.handEdited === 0 && p.counts.current === 45, `format/duplicate: in a copy of the file, every member reads current and none as edited by hand (${JSON.stringify(p.counts)}; ${p.handEdits.slice(0, 2).map((h) => `${h.member} ${h.path}`).join(' | ')})`);
  } finally { g.figma = had; resetStyleNames(); }
}
{
  // A RECORD OF AN EARLIER FORMAT is no record: never compared, so never a hand edit. The members read as having none,
  // and the update brings them to the plan and records them anew (Q113 A). Its instance hashes differ, as a v2 record's
  // keyed ones do. Mutation: `readBaseline` reading another `v` → `format/earlier`.
  const w = await world(TAG);
  for (const m of membersOf(w.set())) {
    const rec = JSON.parse((m.getSharedPluginData as (a: string, b: string) => string)(NS, BASELINE_KEY)) as { v: number; nodes: Record<string, string> };
    const inst = new Set((m.findAll as (f: (n: Node) => boolean) => Node[])((n) => n.type === 'INSTANCE').map((n) => String(n.name)));
    for (const k of Object.keys(rec.nodes)) if (inst.has(k.split('/').pop()!.replace(/#\d+$/, ''))) rec.nodes[k] = '00000000';
    (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, JSON.stringify({ ...rec, v: BASELINE_V - 1 }));
  }
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }]);
  const p = pre.sets[0];
  ok(p.counts.handEdited === 0 && p.counts.noBaseline === 45, `format/earlier: a record of an earlier format reads as no record, never as a hand edit (${JSON.stringify(p.counts)})`);
  // Named as what it is, in the owner's words (2026-10-09), in the dry run and in the apply. Mutation: the count left
  // with the members that never had a record → `format/earlier words`.
  const dry = previewVerdict(pre).lines[0];
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: w.plans }], previewHashOf(pre));
  const done = applyVerdict(res).lines[0];
  ok(dry === 'tag: 45 members. 45 recorded by an earlier plugin version, read as having no as-built record.' && done === 'tag: 45 updated in place, 45 of them recorded by an earlier plugin version.',
    `format/earlier words: the dry run and the apply say the record is an earlier version's (${dry} | ${done})`);
  const again = (await previewUpdate(w.host, [{ def: TAG, plans: w.plans }])).sets[0];
  ok(again.counts.current === 45, `format/earlier recorded: after the update each member has a record of this format, and reads current (${JSON.stringify(again.counts)})`);
}

/* ── damage under a current record ────────────────────────────────────────────────────────────────────── */
section('damage under a record — a member drawn wrong reads "to update" whatever its stamp and record say (#2379 review)');
{
  // Lane D's case, the NB master's likely state: paint and glyph damage planted behind the executor, then a record
  // captured over it, and the stamp from an earlier plugin. Only the draw check can tell. Mutation: the dry run's
  // draw check dropped from its classification → `damage/dry run`, `damage/repaired`.
  const w = await world(TAG);
  const members = membersOf(w.set());
  const paintHit = members[2]; // a member whose root binds its fill
  // A second paint, not a glyph: since #2389 a set member's glyph is an icon instance, whose geometry is the icon
  // component's. Glyph damage under a current record is `single/glyph damage`'s, on the icons themselves.
  const glyphHit = members[5];
  const blacken = (n: Node): boolean => {
    for (const f of ['fills', 'strokes'] as const) {
      const ps = n[f] as { boundVariables?: { color?: unknown } }[] | undefined;
      if (Array.isArray(ps) && ps.some((p) => p?.boundVariables?.color)) { n[f] = ps.map((p) => (p?.boundVariables?.color ? { ...p, color: { r: 0, g: 0, b: 0 }, opacity: 1 } : p)); return true; }
    }
    return ((n.children as Node[] | undefined) ?? []).some(blacken);
  };
  ok(blacken(paintHit), 'premise: a bound paint on the member is left storing black, its binding intact');
  ok(blacken(glyphHit), 'premise: a second member is left storing black under its binding');
  for (const m of [paintHit, glyphHit]) (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, JSON.stringify({ ...baselineOf(await snapshotMember(m)), id: String(m.id) }));
  for (const m of members) {
    const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.split('|').slice(0, 2).join('|'));
  }
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }]);
  const st = pre.sets[0];
  const stateOf = (m: Node): string => st.states.find((x) => x.member === String(m.name))?.state ?? 'current';
  const named = new Set(st.changes.map((c) => c.field));
  ok(stateOf(paintHit) === 'update' && stateOf(glyphHit) === 'update' && st.counts.revisionUnknown === 43 && (named.has('fills') || named.has('strokes')) && previewVerdict(pre).headline === 'Would change 1 of 1',
    `damage/dry run: the two damaged members read "to update", named, though their records match and their stamps are an earlier plugin's (${stateOf(paintHit)}, ${stateOf(glyphHit)}; ${st.counts.revisionUnknown} from an earlier plugin; ${[...named].join(', ')}; ${previewVerdict(pre).headline})`);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: w.plans }], previewHashOf(pre));
  const vars = await varsById(w.api as any);
  const left = membersOf(w.set()).flatMap((m) => drawnFaults(m, vars).map((f) => faultLine(String(m.name), f)));
  const again = (await previewUpdate(w.host, [{ def: TAG, plans: w.plans }])).sets[0];
  ok(applyVerdict(res).ok && left.length === 0 && again.counts.current === 45 && res.outcomes[0]?.updated.length === 2 && res.outcomes[0]?.restamped?.length === 43,
    `damage/repaired: the update re-applies the two, which then draw as planned; the other 43 take only their stamps; all 45 read current (${applyVerdict(res).headline}; ${res.outcomes[0]?.updated.length} updated, ${res.outcomes[0]?.restamped?.length} stamped; ${left.length} faults left${left.length ? `, e.g. ${left[0]}` : ''}; ${again.counts.current} current)`);
}
{
  // Capture never records over damage: a damaged member with no record is left out, named. Mutation: the draw faults
  // left out of `differencesOf` → `damage/capture`.
  const w = await world(TAG);
  const m = membersOf(w.set())[2];
  for (const f of ['fills', 'strokes'] as const) {
    const ps = m[f] as { boundVariables?: { color?: unknown } }[] | undefined;
    if (Array.isArray(ps) && ps.some((p) => p?.boundVariables?.color)) m[f] = ps.map((p) => (p?.boundVariables?.color ? { ...p, color: { r: 0, g: 0, b: 0 }, opacity: 1 } : p));
  }
  (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, '');
  const cap = await captureBaselines(w.host, [{ def: TAG, plans: w.plans }]);
  const skip = cap.sets[0]?.skipped.find((x) => x.member === String(m.name));
  ok(!!skip && (skip.differences ?? []).some((d) => d.field === 'fills' && /stored #000000/.test(d.file)) && !(m.getSharedPluginData as (a: string, b: string) => string)(NS, BASELINE_KEY),
    `damage/capture: a member drawn wrong is not recorded, and the capture names the paint (${skip?.reason}; ${JSON.stringify(skip?.differences?.slice(0, 1))})`);
}

{
  // DAMAGE OUTRANKS A HAND EDIT (#2379 review): a member whose record mismatches somewhere (a real hand edit, on its
  // content) and that also draws wrong (a paint storing black on its root) is "to update", not "edited by hand". The
  // edit is kept and still reported; the damage is repaired. With the edit read first, the default (keep) would skip
  // the member, and the black would stay. Mutation: the hand edit classified before the damage → `damage/over edit`.
  const w = await world(TAG);
  const m = membersOf(w.set())[3];
  const zero = await varIdOf(w, 'space/0');
  (childNamed(m, 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: zero });
  let hit = '';
  for (const f of ['fills', 'strokes'] as const) {
    const ps = m[f] as { boundVariables?: { color?: unknown } }[] | undefined;
    if (!hit && Array.isArray(ps) && ps.some((p) => p?.boundVariables?.color)) { m[f] = ps.map((p) => (p?.boundVariables?.color ? { ...p, color: { r: 0, g: 0, b: 0 }, opacity: 1 } : p)); hit = f; }
  }
  ok(!!hit, `premise: the member's root binds a paint, now storing black (${hit})`);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }]);
  const st = pre.sets[0].states.find((x) => x.member === String(m.name))?.state;
  const edits = pre.sets[0].handEdits.filter((h) => h.member === String(m.name)).map((h) => h.path);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: w.plans }], previewHashOf(pre));
  const vars = await varsById(w.api as any);
  const left = drawnFaults(m, vars);
  ok(st === 'update' && JSON.stringify(edits) === '["content"]' && left.length === 0
    && (childNamed(m, 'content').boundVariables as Record<string, { id: string }>).itemSpacing?.id === zero && res.outcomes[0]?.kept.some((k) => k.path === 'content'),
    `damage/over edit: the member reads "to update", its hand edit kept and listed, its damage repaired (${st}; edits ${JSON.stringify(edits)}; ${left.length} faults left; ${applyVerdict(res).headline})`);
}

{
  // A LAYER ADDED BY HAND OUTRANKS THE DAMAGE (#2413): a member that draws wrong (a paint storing black on its root)
  // and also has a layer a designer added is skipped by the apply under every choice (§5), so the dry run counts it
  // "edited by hand", never "to update", and still lists the paint as a difference; the apply's skip names both the
  // layer and the damage. The member is left exactly. Mutations: the dry run's damage read before the structural
  // edit → `damage/under a layer dry run`; the skip reason without the damage → `damage/under a layer skip`.
  const w = await world(TAG);
  const m = membersOf(w.set())[3];
  let hit = '';
  for (const f of ['fills', 'strokes'] as const) {
    const ps = m[f] as { boundVariables?: { color?: unknown } }[] | undefined;
    if (!hit && Array.isArray(ps) && ps.some((p) => p?.boundVariables?.color)) { m[f] = ps.map((p) => (p?.boundVariables?.color ? { ...p, color: { r: 0, g: 0, b: 0 }, opacity: 1 } : p)); hit = f; }
  }
  const extra = (w.api.createFrame as () => Node)();
  extra.name = 'designer note';
  (m.appendChild as (c: Node) => void)(extra);
  ok(!!hit, `premise: the member's root binds a paint, now storing black, and it holds a layer added by hand (${hit})`);
  const dumpOf = (n: Node): string => JSON.stringify([n.name, n[hit as 'fills'], [...(n._pluginData as Map<string, string>)], ...(n.findAll as () => Node[])().map((k) => [k.name, k.id, k.boundVariables])]);
  const before = dumpOf(m);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }]);
  const p = pre.sets[0];
  const st = p.states.find((x) => x.member === String(m.name))?.state;
  const black = p.changes.find((c) => c.field === hit && /stored #000000/.test(c.from) && c.sample.includes(String(m.name)));
  ok(st === 'handEdited' && p.counts.update === 0 && p.counts.handEdited === 1 && !!black && previewLine(p) === `${TAG}: 45 members. 1 member edited by hand.`,
    `damage/under a layer dry run: the member counts as edited by hand, not to update, and its paint is still listed (${st}; ${JSON.stringify(p.counts)}; ${black ? `${black.part}.${black.field}: ${black.from}` : 'no paint line'}; ${previewLine(p)})`);
  for (const choice of ['keep', 'overwrite', 'accept'] as const) {
    const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: w.plans }], previewHashOf(await previewUpdate(w.host, [{ def: TAG, plans: w.plans }])), { choices: { handEdits: choice } });
    const why = res.outcomes[0]?.skipped.find((x) => x.member === String(m.name))?.reason ?? '';
    ok(why.startsWith('a layer was added or removed by hand, and it draws other than its plan (') && why.includes(String(m.name)) && why.includes(`${hit}: stored #000000`) && dumpOf(m) === before,
      `damage/under a layer skip (${choice}): the skip names the layer and the damage, and the member is left exactly (${why || 'not skipped'}; ${dumpOf(m) === before ? 'untouched' : 'written'})`);
  }
}

{
  // AN ICON INSTANCE'S INK (#2389 with #2379): a set member's icon-set glyph is an instance of its icon component, inked
  // by an override on the instance's vector (`descendantFills`), which an update rewrites. That override left storing
  // black under its binding, the record matching and every stamp an earlier plugin's, reads "to update" and is repaired.
  // Mutation: the draw check skipping instances whole → `instance/ink`.
  const w = await world(TAG);
  let hitMember: Node | undefined;
  let vec: Node | undefined;
  for (const m of membersOf(w.set())) {
    for (const inst of (m.findAll as (f: (n: Node) => boolean) => Node[])((n) => n.type === 'INSTANCE')) {
      const v = ((inst.findAll as ((f: (n: Node) => boolean) => Node[]) | undefined)?.((n) => n.type === 'VECTOR') ?? [])
        .find((x) => Array.isArray(x.fills) && (x.fills as { boundVariables?: { color?: unknown } }[]).some((p) => p?.boundVariables?.color));
      if (v) { hitMember = m; vec = v; break; }
    }
    if (vec) break;
  }
  ok(!!vec, `premise: a member holds an icon instance inked by a bound override (${String(hitMember?.name)})`);
  vec!.fills = (vec!.fills as object[]).map((p) => ({ ...p, color: { r: 0, g: 0, b: 0 }, opacity: 1 }));
  for (const m of membersOf(w.set())) {
    const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.split('|').slice(0, 2).join('|'));
  }
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }]);
  const stateOf = pre.sets[0].states.find((x) => x.member === String(hitMember!.name))?.state;
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: w.plans }], previewHashOf(pre));
  const vars = await varsById(w.api as any);
  const left = membersOf(w.set()).flatMap((m) => drawnFaults(m, vars));
  ok(stateOf === 'update' && left.length === 0 && applyVerdict(res).ok,
    `instance/ink: an icon instance's ink override storing black reads "to update" and is repaired (${stateOf}; ${pre.sets[0].changes.map((c) => `${c.part} ${c.field}: ${c.from}`).slice(0, 2).join(' | ')}; ${left.length} faults after; ${applyVerdict(res).headline})`);
}

/* ── verify reads what the host draws ──────────────────────────────────────────────────────────────────── */
section('verify reads what the host draws — damage the HOST makes behind the executor is named by verify (#2379 review)');
{
  // The host, not the executor, misbehaves here: it ignores the base a paint is bound on (as it kept the black base
  // on the NB master), and it does not scale an imported glyph to its frame. The executor is unchanged, so only the
  // update's own verify can catch it. Mutation: verify's draw check dropped → `verify/drawn paints`, `verify/drawn glyphs`.
  const w = await world(TAG);
  for (const m of membersOf(w.set())) {
    const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.replace(/\|[^|]*$/, '|0'));
  }
  const bind = w.api.variables.setBoundVariableForPaint;
  w.api.variables.setBoundVariableForPaint = (p: object, f: string, v: unknown) => bind({ ...p, color: { r: 0, g: 0, b: 0 }, opacity: undefined }, f, v);
  const svg = w.api.createNodeFromSvg;
  w.api.createNodeFromSvg = (src: string) => {
    const n = svg(src) as Node;
    const resize = n.resize as (a: number, b: number) => void;
    n.resize = (a: number, b: number) => {
      const kids = ((n.children as Node[]) ?? []).map((c) => [c, c.x, c.y, c.width, c.height] as const);
      resize(a, b);
      for (const [c, x, y, cw, ch] of kids) { c.x = x; c.y = y; (c.resize as (a: number, b: number) => void)(cw as number, ch as number); }
    };
    return n;
  };
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }]);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: w.plans }], previewHashOf(pre));
  const content = res.outcomes[0]?.content ?? [];
  ok(!applyVerdict(res).ok && content.some((l) => /\.fills: stored #000000 at 100% \(the plan says .*, which resolves to #[0-9a-f]{6} at \d+%\)$/.test(l)),
    `verify/drawn paints: a paint the host left black under its binding fails verify, named (${applyVerdict(res).headline}; ${content.find((l) => /stored #000000/.test(l)) ?? content[0]})`);
}

{
  // GLYPHS, SINCE #2389, LIVE IN THE ICON AND SPINNER COMPONENTS: a set member's icon-set glyph is an instance of an icon
  // component, so its geometry is the component's. Re-applied in place by a revision bump, the host refusing to scale an
  // imported glyph to its frame (behind the executor), the update's own verify must name it. The spinner's sizes are the
  // glyphs drawn at a size other than their import's. Mutation: verify's draw check dropped → `verify/drawn glyphs`.
  const plans = plansOf('spinner');
  const w = await singleWorld(plans);
  for (const c of w.comps()) {
    const st = (c.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (c.setSharedPluginData as (a: string, b: string, cc: string) => void)(NS, STAMP_KEY, st.replace(/\|[^|]*$/, '|0'));
  }
  const svg = w.api.createNodeFromSvg;
  w.api.createNodeFromSvg = (src: string) => {
    const n = svg(src) as Node;
    const resize = n.resize as (a: number, b: number) => void;
    n.resize = (a: number, b: number) => {
      const kids = ((n.children as Node[]) ?? []).map((c) => [c, c.x, c.y, c.width, c.height] as const);
      resize(a, b);
      for (const [c, x, y, cw, ch] of kids) { c.x = x; c.y = y; (c.resize as (a: number, b: number) => void)(cw as number, ch as number); }
    };
    return n;
  };
  const t = { def: 'spinner', plans, single: true };
  const pre = await previewUpdate(w.host, [t]);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const content = res.outcomes[0]?.content ?? [];
  ok(!applyVerdict(res).ok && content.some((l) => /\.glyph: a vector [\d.]+×[\d.]+ at [\d.]+,[\d.]+ \(the plan says inside its [\d.]+×[\d.]+ frame\)$/.test(l)),
    `verify/drawn glyphs: a spinner glyph the host did not scale to its frame fails verify, named (${applyVerdict(res).headline}; ${content.find((l) => /\.glyph:/.test(l)) ?? 'no glyph line'})`);
}
{
  // The same, read by THE TEST off the shim's nodes, with the executor as it is: after an update in place, every glyph
  // the icons and the spinner hold fits its frame. Mutation: the fresh glyph import not scaled to its frame →
  // `drawn/glyphs`.
  let count = 0;
  const over: string[] = [];
  for (const id of ['icon', 'spinner']) {
    const plans = plansOf(id);
    const w = await singleWorld(plans);
    for (const c of w.comps()) {
      const st = (c.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
      (c.setSharedPluginData as (a: string, b: string, cc: string) => void)(NS, STAMP_KEY, st.replace(/\|[^|]*$/, '|0'));
    }
    const t = { def: id, plans, single: true };
    await applyUpdate(w.host, w.api as any, [t], previewHashOf(await previewUpdate(w.host, [t])));
    const walk = (n: Node, at: string): void => {
      const kids = (n.children as Node[] | undefined) ?? [];
      if ((n.type === 'FRAME' || n.type === 'COMPONENT') && kids.length && kids.every((k) => k.type === 'VECTOR')) {
        count++;
        for (const v of kids) if ((v.x as number) + (v.width as number) > (n.width as number) + 0.5 || (v.y as number) + (v.height as number) > (n.height as number) + 0.5)
          over.push(`${at} ${(v.width as number).toFixed(1)}×${(v.height as number).toFixed(1)} in ${n.width}×${n.height}`);
      }
      for (const k of kids) walk(k, `${at}/${String(k.name)}`);
    };
    for (const c of w.comps()) walk(c, String(c.name));
  }
  ok(count >= 48 && over.length === 0, `drawn/glyphs: every glyph the icons and the spinner hold fits its frame after an update in place (${count} glyphs; ${over.length} overflow${over.length ? `, e.g. ${over.slice(0, 2).join(' | ')}` : ''})`);
}

/* ── a mixed set ──────────────────────────────────────────────────────────────────────────────────────── */
section('mixed — in a set the build updates, a member from an earlier plugin still takes only its stamp (#2379 review)');
{
  // Half the members out of date (the executor revision bumped), half from an earlier plugin. The build updates the
  // first half; the second takes its stamp and nothing else, read by the test's write log on those members alone.
  // Its place in the set's grid is the set's layout: it moves only if the grid does, and here the grid does not.
  // Mutations: the restamp after the build's pass dropped → `mixed/stamped`; the grid writing positions that did not
  // move → `mixed/only stamps`.
  const w = await world(TAG);
  const members = membersOf(w.set());
  const earlier = members.filter((_, i) => i % 2 === 1);
  for (const [i, m] of members.entries()) {
    const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, i % 2 ? st.split('|').slice(0, 2).join('|') : st.replace(/\|[^|]*$/, '|0'));
  }
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }]);
  ok(pre.sets[0]?.counts.update === 23 && pre.sets[0]?.counts.revisionUnknown === 22, `premise: 23 members to update, 22 from an earlier plugin (${JSON.stringify(pre.sets[0]?.counts)})`);
  const logs = earlier.map((m) => watchWrites(m));
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: w.plans }], previewHashOf(pre));
  const other = logs.flat().filter((x) => !new RegExp(`setSharedPluginData\\(${NS}, (${STAMP_KEY}|${BASELINE_KEY})\\)$`).test(x));
  const again = (await previewUpdate(w.host, [{ def: TAG, plans: w.plans }])).sets[0];
  ok(res.outcomes[0]?.updated.length === 23 && res.outcomes[0]?.restamped?.length === 22 && again.counts.current === 45,
    `mixed/stamped: the 23 are updated and the 22 stamped, and all 45 then read current (${res.outcomes[0]?.updated.length} updated, ${res.outcomes[0]?.restamped?.length} stamped; ${JSON.stringify(again.counts)})`);
  ok(other.length === 0, `mixed/only stamps: the 22 from an earlier plugin take nothing but their stamps and records (${other.length} other writes${other.length ? `, e.g. ${other.slice(0, 3).join(' | ')}` : ''})`);
}

{
  // THE ICONS FROM AN EARLIER PLUGIN (#2296 with #2379): single components whose stamps predate the executor revision
  // read "no changes", and take their stamps and nothing else, found by their own names (`icon/check` for
  // `name=check`). Mutation: the restamp looked up by coordinate rather than node name → `single/stamped`.
  const plans = plansOf('icon');
  const w = await singleWorld(plans);
  for (const c of w.comps()) {
    const st = (c.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (c.setSharedPluginData as (a: string, b: string, cc: string) => void)(NS, STAMP_KEY, st.split('|').slice(0, 2).join('|'));
  }
  const t = { def: 'icon', plans, single: true };
  const pre = await previewUpdate(w.host, [t]);
  ok(pre.sets[0]?.counts.revisionUnknown === 45 && previewVerdict(pre).headline === '✓ No changes found',
    `premise: all 45 icons read "built by an earlier plugin", and nothing changes (${JSON.stringify(pre.sets[0]?.counts)}; ${previewVerdict(pre).headline})`);
  const logs = w.comps().map((c) => watchWrites(c));
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const other = logs.flat().filter((x) => !new RegExp(`setSharedPluginData\\(${NS}, (${STAMP_KEY}|${BASELINE_KEY})\\)$`).test(x));
  const again = (await previewUpdate(w.host, [t])).sets[0];
  ok(res.outcomes[0]?.restamped?.length === 45 && other.length === 0 && again.counts.current === 45,
    `single/stamped: each icon takes its stamp and nothing else, and all 45 read current (${res.outcomes[0]?.restamped?.length} stamped; ${other.length} other writes; ${JSON.stringify(again.counts)}; ${applyVerdict(res).headline})`);
}

{
  // A DAMAGED ICON UNDER A CURRENT RECORD (#2363 review): an icon's glyph vector stores black under its intact binding,
  // which its record cannot see (a bound paint is hashed by its variable), and every stamp is an earlier plugin's. The
  // draw check reads single components as it reads set members, so that icon is "to update" and is repaired; the other
  // 43 take only their stamps. Mutation: `readSingleView` read without the file's variables → `single/damage`.
  const plans = plansOf('icon');
  const w = await singleWorld(plans);
  const hit = w.comps()[0];
  const vec = (hit.findAll as (f: (n: Node) => boolean) => Node[])((n) => n.type === 'VECTOR' && Array.isArray(n.fills) && (n.fills as { boundVariables?: { color?: unknown } }[]).some((p) => p?.boundVariables?.color))[0];
  vec.fills = (vec.fills as object[]).map((p) => ({ ...p, color: { r: 0, g: 0, b: 0 }, opacity: 1 }));
  for (const c of w.comps()) {
    const st = (c.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (c.setSharedPluginData as (a: string, b: string, cc: string) => void)(NS, STAMP_KEY, st.split('|').slice(0, 2).join('|'));
  }
  const t = { def: 'icon', plans, single: true };
  const pre = await previewUpdate(w.host, [t]);
  const st = pre.sets[0];
  const stateOf = st?.states.find((x) => x.member === `name=${String(hit.name).replace(/^icon\//, '')}`)?.state;
  ok(stateOf === 'update' && st?.counts.revisionUnknown === 44 && st.changes.some((c) => c.field === 'fills' && /stored #000000/.test(c.from)),
    `single/damage: the icon drawn black under its binding reads "to update", named, though its record matches and its stamp is an earlier plugin's (${stateOf}; ${st?.counts.revisionUnknown} from an earlier plugin; ${st?.changes.map((c) => `${c.field}: ${c.from}`).join(' | ')})`);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const vars = await varsById(w.api as any);
  const left = w.comps().flatMap((c) => drawnFaults(c, vars));
  const again = (await previewUpdate(w.host, [t])).sets[0];
  ok(applyVerdict(res).ok && res.outcomes[0]?.updated.length === 1 && res.outcomes[0]?.restamped?.length === 44 && left.length === 0 && again.counts.current === 45,
    `single/damage repaired: the update re-applies that icon, which then draws its variable's color; the other 44 take their stamps; all 45 read current (${applyVerdict(res).headline}; ${res.outcomes[0]?.updated.length} updated, ${res.outcomes[0]?.restamped?.length} stamped; ${left.length} faults; ${again.counts.current} current)`);
}

{
  // GLYPH DAMAGE ON AN ICON COMPONENT UNDER A CURRENT RECORD (#2389 with #2379): an icon's vectors left past its frame (2.5×: its glyph sits 12px in 24, so the NB master's 1.5× still fits),
  // which its record cannot see (unbound geometry is not hashed), every stamp an earlier plugin's. The icon component's
  // root IS the glyph since #2389, and every instance of it draws what it holds. It must read "to update" and be
  // re-laid. Mutation: the draw check reading only FRAME glyphs → `single/glyph damage`.
  const plans = plansOf('icon');
  const w = await singleWorld(plans);
  const hit = w.comps()[1];
  for (const v of (hit.children as Node[])) { (v.resize as (a: number, b: number) => void)((v.width as number) * 2.5, (v.height as number) * 2.5); } // past its 24px frame
  for (const c of w.comps()) {
    const st = (c.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (c.setSharedPluginData as (a: string, b: string, cc: string) => void)(NS, STAMP_KEY, st.split('|').slice(0, 2).join('|'));
  }
  const t = { def: 'icon', plans, single: true };
  const pre = await previewUpdate(w.host, [t]);
  const st = pre.sets[0];
  const stateOf = st?.states.find((x) => x.member === `name=${String(hit.name).replace(/^icon\//, '')}`)?.state;
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const vars = await varsById(w.api as any);
  const left = w.comps().flatMap((c) => drawnFaults(c, vars));
  ok(stateOf === 'update' && st?.changes.some((c) => c.field === 'glyph') && left.length === 0 && res.outcomes[0]?.updated.length === 1,
    `single/glyph damage: an icon whose vectors overflow its frame reads "to update", named, and is re-laid (${stateOf}; ${st?.changes.map((c) => `${c.field}: ${c.from}`).join(' | ')}; ${left.length} faults after; ${applyVerdict(res).headline})`);
}

/* ── what the host draws ────────────────────────────────────────────────────────────────────────────────── */
section('what the host draws — after an update in place, every bound paint shows its own color and every glyph fits its frame (#2379)');
{
  // Read by THE TEST off the shim's nodes (docs/34: the update's own verify cannot witness itself). Four defs, built
  // and then re-applied in place by a revision bump, so every paint is rewritten and every glyph re-laid. The shim keeps a
  // paint's stored color as given (as the in-place host did) and scales SCALE children with their frame.
  // Mutations: the paint base left black → `drawn/paints`; the glyph import not scaled to its frame → `drawn/glyphs`.
  const bad: string[] = [];
  const glyphs: string[] = [];
  const hex = (c: { r: number; g: number; b: number }): string => `#${[c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
  let paints = 0, glyphCount = 0, washes = 0;
  for (const id of ['tag', 'field-message', 'checkbox-control', 'badge']) {
    const w = await world(id, plansOf(id), { extraVars: ['space/999'] });
    const vars = new Map((await w.api.variables.getLocalVariablesAsync()).map((v: { id: string }) => [v.id, v] as const));
    // Re-applied by an executor revision bump, as `corpus/in place` does: every member reads "to update".
    for (const m of membersOf(w.set())) {
      const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
      (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.replace(/\|[^|]*$/, '|0'));
    }
    const next = w.plans;
    const pre = await previewUpdate(w.host, [{ def: id, plans: next }]);
    await applyUpdate(w.host, w.api as any, [{ def: id, plans: next }], previewHashOf(pre));
    const glyphNames = new Set<string>();
    const planWalk = (n: AnatomyPlan['root']): void => { if (n.type === 'GLYPH') glyphNames.add(n.name); for (const c of n.children ?? []) planWalk(c); };
    for (const p of next) planWalk(p.root);
    const walk = (n: Node, at: string): void => {
      for (const field of ['fills', 'strokes'] as const) for (const p of (n[field] as { color?: { r: number; g: number; b: number }; opacity?: number; boundVariables?: { color?: { id: string } } }[] | undefined) ?? []) {
        const v = p?.boundVariables?.color ? vars.get(p.boundVariables.color.id) as { resolveForConsumer(n: unknown): { value: { r: number; g: number; b: number; a?: number } } } | undefined : undefined;
        if (!v || !p.color) continue;
        paints++;
        const want = v.resolveForConsumer(n).value;
        if (want.a !== undefined && want.a < 1) washes++;
        if (hex(p.color) !== hex(want) || Math.abs((p.opacity ?? 1) - (want.a ?? 1)) > 0.01) bad.push(`${id} ${at}.${field} ${hex(p.color)}@${p.opacity ?? 1} (resolves ${hex(want)}@${want.a ?? 1})`);
      }
      if (glyphNames.has(String(n.name)) && n.type === 'FRAME') {
        glyphCount++;
        const W = n.width as number, H = n.height as number;
        for (const v of ((n.children as Node[]) ?? []).filter((k) => k.type === 'VECTOR'))
          if ((v.x as number) + (v.width as number) > W + 0.5 || (v.y as number) + (v.height as number) > H + 0.5) glyphs.push(`${id} ${at} ${(v.width as number).toFixed(1)}×${(v.height as number).toFixed(1)} in ${W}×${H}`);
      }
      for (const c of (n.children as Node[] | undefined) ?? []) walk(c, `${at}/${String(c.name)}`);
    };
    walk(w.set(), id);
  }
  ok(paints > 100 && washes > 0 && bad.length === 0, `drawn/paints: every bound paint, after an update in place, stores the color and alpha its variable resolves to (${paints} paints, ${washes} washes; ${bad.length} wrong${bad.length ? `, e.g. ${bad.slice(0, 2).join(' | ')}` : ''})`);
}

{
  // #2364, the NB master's first live apply: EVERY member of the set was out of date when the record was captured,
  // so none was recorded, and the plan then moved (a lever). Each member reads `noBaseline`, none `update`. The dry
  // run said "Would change"; the apply called the set already up to date and wrote nothing, and the next dry run
  // read the same differences. Mutation: `noBaseline` left out of the apply's "nothing to do" count →
  // `unrecorded/all`, `unrecorded/all written`, `unrecorded/all converges`, `unrecorded/honest`.
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  for (const m of membersOf(w.set())) (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, '');
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  const c0 = pre.sets[0]?.counts;
  ok(c0?.noBaseline === 45 && c0.update === 0 && previewVerdict(pre).headline === 'Would change 1 of 1',
    `premise: every member reads no as-built record, none "to update", and the dry run says the set would change (${JSON.stringify(c0)}; ${previewVerdict(pre).headline})`);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre));
  const o = res.outcomes[0];
  const v = applyVerdict(res);
  ok(o?.updated.length === 45 && o.unrecorded.length === 45,
    `unrecorded/all: every member the dry run listed is updated, each named as without a record (${o?.updated.length} updated, ${o?.unrecorded.length} unrecorded; ${v.headline})`);
  const gap = await varIdOf(w, 'space/999');
  const written = membersOf(w.set()).filter((m) => (childNamed(m, 'content').boundVariables as Record<string, { id: string }>).itemSpacing?.id === gap).length;
  ok(written === 45, `unrecorded/all written: every member's content gap is the plan's (${written} of 45)`);
  const again = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  ok(again.sets[0]?.counts.current === 45 && previewVerdict(again).headline === '✓ All sets up to date',
    `unrecorded/all converges: the next dry run reads every member current (${JSON.stringify(again.sets[0]?.counts)}; ${previewVerdict(again).headline})`);
  // The verdict says ✓ only when the next dry run finds nothing left of what this one previewed.
  const left = (again.sets[0]?.changes ?? []).filter((x) => x.field !== 'stamp').length;
  ok(!v.ok || left === 0, `unrecorded/honest: no ✓ verdict while a previewed difference is left in the file (${v.headline}; ${left} left)`);
}
{
  // The same set under `choices.noBaseline: 'skip'` (#2364 review): every member is left, by the choice, so nothing
  // the dry run listed is done. The verdict is NOT UPDATED, never "already up to date" (the owner's choice, 2026-10-08).
  // Mutation: the all-skipped set not counted as not updated → `unrecorded/skip` (the headline falls back to ✓).
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  for (const m of membersOf(w.set())) (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, '');
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  const before = (pre.sets[0]?.changes ?? []).filter((x) => x.field !== 'stamp').length;
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre), { choices: { noBaseline: 'skip' } });
  const o = res.outcomes[0];
  const v = applyVerdict(res);
  ok(!v.ok && v.headline === '✗ 1 set not updated' && o?.skipped.length === 45 && o.skipped.every((x) => x.reason === 'no as-built record') && v.lines[0] === 'tag: 45 left as they are.',
    `unrecorded/skip: with noBaseline: 'skip' every member is left, named, and the verdict says the set was not updated (${v.headline}; ${o?.skipped.length} left; ${v.lines[0]})`);
  const again = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  const after = (again.sets[0]?.changes ?? []).filter((x) => x.field !== 'stamp').length;
  ok(before > 0 && after === before && previewVerdict(again).headline === 'Would change 1 of 1',
    `unrecorded/skip left: the next dry run lists the same differences (${before} before, ${after} after; ${previewVerdict(again).headline})`);
}

{
  // #2364 on the NB master's own fields: Button, every record cleared, then the two levers that moved there. The plan
  // changes each member's minimum width and its label's text style; the update must write both, every member.
  const def = componentDefs.find((d) => d.id === 'button')!;
  const was = figmaAnatomySet(materializeForBrand(def, null), { swapTarget: SWAP_TARGET });
  const next = figmaAnatomySet(materializeForBrand(def, { buttonLabelWeight: 'default', buttonMinWidthMultiplier: 1 } as never), { swapTarget: SWAP_TARGET });
  const w = await world('button', was, {
    extraVars: next.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]),
    extraStyles: next.flatMap((p) => planTextStyles(p.root)),
    extraComps: next.flatMap((p) => planComps(p.root)),
  });
  for (const m of membersOf(w.set())) (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, '');
  const pre = await previewUpdate(w.host, [{ def: 'button', plans: next }]);
  const fields = new Set((pre.sets[0]?.changes ?? []).map((c) => c.field));
  ok(pre.sets[0]?.counts.update === 0 && fields.has('minWidth') && fields.has('textStyle') && previewVerdict(pre).headline === 'Would change 1 of 1',
    `premise: no member reads "to update", and the dry run names minWidth and textStyle (${[...fields].join(', ')}; ${previewVerdict(pre).headline})`);
  const res = await applyUpdate(w.host, w.api as any, [{ def: 'button', plans: next }], previewHashOf(pre));
  const members = membersOf(w.set()).length;
  ok(res.outcomes[0]?.updated.length === members && applyVerdict(res).ok,
    `unrecorded/levers: every button member is updated (${res.outcomes[0]?.updated.length} of ${members}; ${applyVerdict(res).headline})`);
  const again = await previewUpdate(w.host, [{ def: 'button', plans: next }]);
  ok(again.sets[0]?.counts.current === members && previewVerdict(again).headline === '✓ All sets up to date',
    `unrecorded/levers converge: the next dry run reads every member current, minWidth and textStyle included (${JSON.stringify(again.sets[0]?.changes.map((c) => c.field))}; ${previewVerdict(again).headline})`);
}

{
  // #2369: a member ROOT the plan gives no fill keeps the fill it was built with. Button under "Text button hover:
  // Fill" washes its text hover and pressed members on the member root; under the default "Text & icon only" the
  // plan gives those roots no fill. The update must clear it, and its verify must see it when it does not.
  // Mutations: the in-place root skipped by the executor's neutral claims → `root/cleared` (the verify then fails
  // the verdict, so `root/verified` holds); with the verify's unpainted check dropped too → `root/verified` as well.
  const def = componentDefs.find((d) => d.id === 'button')!;
  const was = figmaAnatomySet(materializeForBrand(def, { buttonTextHover: 'fill' } as never), { swapTarget: SWAP_TARGET });
  const next = figmaAnatomySet(materializeForBrand(def, null), { swapTarget: SWAP_TARGET });
  const w = await world('button', was, {
    extraVars: next.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]),
    extraStyles: next.flatMap((p) => planTextStyles(p.root)),
  });
  const bare = new Set(next.filter((p) => !p.root.paints?.fills && !p.root.gradientFill).map((p) => planComponentName(p)));
  const painted = (m: Node): boolean => ((m.fills as { visible?: boolean }[] | undefined) ?? []).some((f) => f.visible !== false);
  const washed = membersOf(w.set()).filter((m) => bare.has(String(m.name)) && painted(m)).length;
  ok(washed === 48, `premise: under Fill, 48 members the default plan leaves unfilled carry a wash on the member root (${washed})`);
  const pre = await previewUpdate(w.host, [{ def: 'button', plans: next }]);
  const res = await applyUpdate(w.host, w.api as any, [{ def: 'button', plans: next }], previewHashOf(pre));
  const left = membersOf(w.set()).filter((m) => bare.has(String(m.name)) && painted(m)).map((m) => String(m.name));
  ok(left.length === 0, `root/cleared: every member root the plan gives no fill is left with none (${left.length} still washed${left.length ? `, e.g. ${left[0]}` : ''})`);
  const v = applyVerdict(res);
  ok(v.ok === (left.length === 0), `root/verified: the verdict fails exactly when a member root keeps a fill the plan does not give it (${v.headline}; ${left.length} washed)`);
}

/* ── the veil's gradient stops ───────────────────────────────────────────────────────────────────────── */
section("veil — every directional member's gradient stops store the colors their variables resolve to, fresh and in place (#2391)");
{
  // Read by THE TEST off the shim's nodes, against values authored HERE (docs/34): each veil variable's alpha is the
  // emitted veil's (dark 50/60/70%, light 40/50/60%, clear 0), and one member's two stops are spelled out in full. The
  // shim keeps a stop's stored color as written, as the host draws it. Mutations: the stops based on the placeholder →
  // `veil/fresh`, `veil/repaired`, `veil/current`; gradient stops dropped from the draw check → `veil/dry run`,
  // `veil/repaired`, `veil/verify`;
  // verify's draw check dropped → `veil/verify`.
  const ALPHA: Record<string, number> = { 'dark/subtle': 50, 'dark/medium': 60, 'dark/strong': 70, 'dark/clear': 0, 'light/subtle': 40, 'light/medium': 50, 'light/strong': 60, 'light/clear': 0 };
  const MEMBER = 'value=dark, intensity=strong, direction=from-top';
  const MEMBER_STOPS = 'color/veil/dark/strong #b64d3c at 70% | color/veil/dark/clear #4229c0 at 0%';
  const hex = (c: { r: number; g: number; b: number }): string => `#${[c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`;
  type Stop = { color: { r: number; g: number; b: number; a?: number }; boundVariables?: { color?: { id: string } } };
  const gradientMembers = (w: World): Node[] => membersOf(w.set()).filter((m) => (m.fills as { type?: string }[] | undefined)?.[0]?.type === 'GRADIENT_LINEAR');
  const stopsOf = (m: Node): Stop[] => ((m.fills as { gradientStops?: Stop[] }[])[0].gradientStops ?? []);
  /** Each stop as `<variable> <stored hex> at <stored alpha>`, and every stop whose alpha is not its variable's. */
  const read = async (w: World) => {
    const names = new Map((await w.api.variables.getLocalVariablesAsync()).map((v: { id: string; name: string }) => [v.id, v.name.slice(v.name.indexOf('/') + 1)] as const));
    const shown = new Map<string, string>();
    const wrong: string[] = [];
    let stops = 0;
    for (const m of gradientMembers(w)) {
      const line = stopsOf(m).map((st) => {
        stops++;
        const v = String(names.get(st.boundVariables?.color?.id ?? '') ?? 'UNBOUND');
        const a = Math.round((st.color.a ?? 1) * 100);
        const at = `${v} ${hex(st.color)} at ${a}%`;
        if (a !== ALPHA[v.replace(/^color\/veil\//, '')] || hex(st.color) === '#000000') wrong.push(`${String(m.name)}: ${at}`);
        return at;
      }).join(' | ');
      shown.set(String(m.name), line);
    }
    return { members: gradientMembers(w).length, stops, shown, wrong };
  };
  const earlier = (w: World): void => {
    for (const m of membersOf(w.set())) {
      const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
      (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.split('|').slice(0, 2).join('|'));
    }
  };

  // FRESH: built, then read.
  {
    const w = await world('veil');
    const r = await read(w);
    ok(r.members === 24 && r.stops === 48 && r.wrong.length === 0 && r.shown.get(MEMBER) === MEMBER_STOPS,
      `veil/fresh: a veil built fresh stores each of its 48 stops at its variable's color and alpha (${r.members} gradient members, ${r.stops} stops; ${r.wrong.length} wrong${r.wrong.length ? `, e.g. ${r.wrong[0]}` : ''}; ${MEMBER}: ${r.shown.get(MEMBER)})`);
  }

  // DAMAGED: every stop left storing black under its binding (the NB master after an in-place update), records
  // matching and every stamp an earlier plugin's, so only the draw check can tell.
  {
    const w = await world('veil');
    for (const m of gradientMembers(w)) {
      const [g] = m.fills as { gradientStops: Stop[] }[];
      m.fills = [{ ...g, gradientStops: g.gradientStops.map((st) => ({ ...st, color: { r: 0, g: 0, b: 0, a: 1 } })) }];
      (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, JSON.stringify({ ...baselineOf(await snapshotMember(m)), id: String(m.id) }));
    }
    earlier(w);
    const pre = await previewUpdate(w.host, [{ def: 'veil', plans: w.plans }]);
    const st = pre.sets[0];
    const toUpdate = st.states.filter((x) => x.state === 'update').length;
    const black = st.changes.filter((c) => c.field === 'fills' && c.from === 'stored #000000 at 100%');
    ok(toUpdate === 24 && black.reduce((n, c) => n + c.members, 0) === 48 && st.counts.revisionUnknown === 6 && previewVerdict(pre).headline === 'Would change 1 of 1',
      `veil/dry run: the 24 members whose stops store black read "to update", each stop named "stored #000000 at 100%" (${toUpdate} to update; ${black.reduce((n, c) => n + c.members, 0)} stops named, e.g. ${black[0] ? `${black[0].from} (the plan says ${black[0].to})` : 'none'}; ${st.counts.revisionUnknown} from an earlier plugin; ${previewVerdict(pre).headline})`);
    const res = await applyUpdate(w.host, w.api as any, [{ def: 'veil', plans: w.plans }], previewHashOf(pre));
    const r = await read(w);
    ok(applyVerdict(res).ok && res.outcomes[0]?.updated.length === 24 && r.wrong.length === 0 && r.shown.get(MEMBER) === MEMBER_STOPS,
      `veil/repaired: the apply re-applies the 24, verified, and every stop then stores its variable's color and alpha (${applyVerdict(res).headline}; ${res.outcomes[0]?.updated.length} updated; ${r.wrong.length} wrong${r.wrong.length ? `, e.g. ${r.wrong[0]}` : ''}; ${MEMBER}: ${r.shown.get(MEMBER)})`);
    const again = await previewUpdate(w.host, [{ def: 'veil', plans: w.plans }]);
    ok(again.sets[0]?.counts.current === 30 && previewVerdict(again).headline === '✓ All sets up to date',
      `veil/current: the next dry run reads all 30 members current (${JSON.stringify(again.sets[0]?.counts)}; ${previewVerdict(again).headline})`);
  }

  // THE HOST BEHIND THE EXECUTOR: re-applied by a revision bump, the host keeps black on every stop it is given (as it
  // kept the placeholder on the NB master). The executor is unchanged, so only the update's own verify can name it.
  {
    const w = await world('veil');
    for (const m of membersOf(w.set())) {
      const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
      (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.replace(/\|[^|]*$/, '|0'));
    }
    for (const m of gradientMembers(w)) {
      let held = m.fills;
      Object.defineProperty(m, 'fills', {
        configurable: true, enumerable: true, get: () => held,
        set: (v: unknown) => {
          held = Array.isArray(v) ? v.map((p: { type?: string; gradientStops?: Stop[] }) => (p?.type === 'GRADIENT_LINEAR' ? { ...p, gradientStops: (p.gradientStops ?? []).map((st) => ({ ...st, color: { r: 0, g: 0, b: 0, a: 1 } })) } : p)) : v;
        },
      });
    }
    const pre = await previewUpdate(w.host, [{ def: 'veil', plans: w.plans }]);
    const res = await applyUpdate(w.host, w.api as any, [{ def: 'veil', plans: w.plans }], previewHashOf(pre));
    const content = res.outcomes[0]?.content ?? [];
    const line = `${MEMBER}/..fills: stored #000000 at 100% (the plan says color/veil/dark/strong, which resolves to #b64d3c at 70%)`;
    ok(!applyVerdict(res).ok && content.includes(line),
      `veil/verify: a stop the host left black under its binding fails verify, named (${applyVerdict(res).headline}; ${content.find((l) => l.startsWith(MEMBER)) ?? content[0] ?? 'no content line'})`);
  }

  // THE RIGHT COLOR AT THE WRONG ALPHA: every stop keeps its variable's RGB but stores 100% (a solid wash, the same
  // visible defect as black), records matching and stamps an earlier plugin's, and the host keeps 100% on every stop it
  // is given. Only the alpha half of the draw check can tell: the dry run reads the 24 "to update", and verify fails.
  // Mutation: the alpha comparison dropped from `drawn.ts`'s gradient branch → `veil/alpha dry run`, `veil/alpha verify`.
  {
    const w = await world('veil');
    const opaque = (v: unknown): unknown => Array.isArray(v) ? v.map((p: { type?: string; gradientStops?: Stop[] }) => (p?.type === 'GRADIENT_LINEAR' ? { ...p, gradientStops: (p.gradientStops ?? []).map((st) => ({ ...st, color: { ...st.color, a: 1 } })) } : p)) : v;
    for (const m of gradientMembers(w)) {
      let held = opaque(m.fills);
      Object.defineProperty(m, 'fills', { configurable: true, enumerable: true, get: () => held, set: (v: unknown) => { held = opaque(v); } });
      (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, JSON.stringify({ ...baselineOf(await snapshotMember(m)), id: String(m.id) }));
    }
    earlier(w);
    const pre = await previewUpdate(w.host, [{ def: 'veil', plans: w.plans }]);
    const st = pre.sets[0];
    const toUpdate = st.states.filter((x) => x.state === 'update').length;
    const solid = st.changes.filter((c) => c.field === 'fills' && /^stored #(?!000000)[0-9a-f]{6} at 100%$/.test(String(c.from)));
    const first = `stored #b64d3c at 100%`;
    const firstTo = solid.find((c) => c.from === first)?.to;
    ok(toUpdate === 24 && solid.reduce((n, c) => n + c.members, 0) === 48 && /color\/veil\/dark\/strong, which resolves to #b64d3c at 70%/.test(String(firstTo)) && previewVerdict(pre).headline === 'Would change 1 of 1',
      `veil/alpha dry run: the 24 members whose stops keep their color at 100% read "to update", each stop named (${toUpdate} to update; ${solid.reduce((n, c) => n + c.members, 0)} stops named, e.g. ${firstTo ? `${first} (the plan says ${firstTo})` : solid[0] ? `${solid[0].from} (the plan says ${solid[0].to})` : 'none'}; ${previewVerdict(pre).headline})`);
    const res = await applyUpdate(w.host, w.api as any, [{ def: 'veil', plans: w.plans }], previewHashOf(pre));
    const content = res.outcomes[0]?.content ?? [];
    const line = `${MEMBER}/..fills: stored #b64d3c at 100% (the plan says color/veil/dark/strong, which resolves to #b64d3c at 70%)`;
    ok(!applyVerdict(res).ok && content.includes(line),
      `veil/alpha verify: a stop the host left at 100% under its binding fails verify, named (${applyVerdict(res).headline}; ${content.find((l) => l.startsWith(MEMBER)) ?? content[0] ?? 'no content line'})`);
  }
}

/* ── swap ────────────────────────────────────────────────────────────────────────────────────────────── */
section('swap — an instance the plan points elsewhere is swapped in place, and the swap default follows');
{
  const w = await world(TAG, plansOf(TAG), { extraComps: ['icon/other'] });
  const before = identityOf(w.set());
  const next = w.plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    (planChild(planChild(q.root, 'content'), 'leadingVisual') as unknown as Record<string, unknown>).swapTarget = 'icon/other';
    return q;
  });
  const { res } = await confirm(w, [{ def: TAG, plans: next }]);
  ok(applyVerdict(res).ok, `swap/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const lvs = membersOf(w.set()).map((m) => childNamed(childNamed(m, 'content'), 'leadingVisual'));
  ok(lvs.every((n) => (n.mainComponent as { name?: string } | undefined)?.name === 'icon/other'), `swap/pointed: every leading icon now instances icon/other (${[...new Set(lvs.map((n) => (n.mainComponent as { name?: string }).name))]})`);
  const after = identityOf(w.set());
  ok([...before.members].every(([name, b]) => [...b.kids].every(([p, id]) => after.members.get(name)?.kids.get(p) === id)), 'swap/ids: every instance and every other child keeps its id');
  const defs = w.set().componentPropertyDefinitions as Record<string, { type: string; defaultValue?: unknown }>;
  const other = (w.api.root.findAllWithCriteria({ types: ['COMPONENT'] }) as { name: string; id: string }[]).find((c) => c.name === 'icon/other')!;
  const k = Object.keys(defs).find((x) => x.startsWith('↳ swap leading icon'))!;
  ok(defs[k]?.defaultValue === other.id, `swap/default: the swap property's default is icon/other's id (${String(defs[k]?.defaultValue)} vs ${other.id})`);
}
{
  const ROW = 'checkbox-row';
  const w = await world(ROW, plansOf(ROW), { extraComps: ['radio-control'] });
  const before = identityOf(w.set());
  const next = w.plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    (planChild(planChild(q.root, 'controlBox'), 'control') as unknown as Record<string, unknown>).nestTarget = 'radio-control';
    return q;
  });
  const { res } = await confirm(w, [{ def: ROW, plans: next }]);
  const ctrls = membersOf(w.set()).map((m) => childNamed(childNamed(m, 'controlBox'), 'control'));
  ok(ctrls.every((n) => (n.mainComponent as { name?: string } | undefined)?.name === 'radio-control'), `nest/pointed: every row's control now instances radio-control (${[...new Set(ctrls.map((n) => (n.mainComponent as { name?: string }).name))]}; ${applyVerdict(res).headline})`);
  const after = identityOf(w.set());
  ok([...before.members].every(([name, b]) => [...b.kids].every(([p, id]) => after.members.get(name)?.kids.get(p) === id)), 'nest/ids: every nested instance keeps its id');
}

/* ── child ───────────────────────────────────────────────────────────────────────────────────────────── */
section('child — a part the plan no longer has is removed from every member; the rest keep their ids');
{
  const w = await world(TAG);
  const before = identityOf(w.set());
  const next = w.plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    const content = planChild(q.root, 'content');
    content.children = content.children!.filter((c) => c.name !== 'leadingVisual');
    return q;
  });
  const { res } = await confirm(w, [{ def: TAG, plans: next }]);
  ok(membersOf(w.set()).every((m) => !childNamed(childNamed(m, 'content'), 'leadingVisual')), `child/removed: no member holds a leading icon (${applyVerdict(res).headline})`);
  const after = identityOf(w.set());
  const kept = [...before.members].flatMap(([name, b]) => [...b.kids].filter(([p]) => !p.startsWith('content#0/leadingVisual#')).filter(([p, id]) => {
    const now = [...(after.members.get(name)?.kids ?? new Map())].find(([q, v]) => v === id);
    return !now;
  }).map(([p]) => `${name}/${p}`));
  ok(kept.length === 0, `child/ids: every other child keeps its id (${kept.length} lost: ${kept.slice(0, 2).join('; ')})`);
  ok(applyVerdict(res).ok, `child/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 200)})`);
}

/* ── verify ──────────────────────────────────────────────────────────────────────────────────────────── */
section("verify — the update's own checks fail when the host does not hold what it wrote");
{
  // The host replaces one child's node partway through the run (its id changes), as a set-level operation can.
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const victim = childNamed(membersOf(w.set())[3], 'content');
  let yields = 0;
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre), {
    yieldTo: async () => { if (++yields === 1) { victim.id = 'N:replaced'; membersOf(w.set())[10].id = 'N:member'; } },
  });
  const o = res.outcomes[0];
  ok(o.identity.some((x) => x.startsWith(`${String(membersOf(w.set())[10].name)}: replaced`) && x.includes('N:member')),
    `verify/member: a member whose id changed under the update is named (${o.identity.filter((x) => x.includes('N:member')).join('')})`);
  ok(o.identity.some((x) => x.includes(String(membersOf(w.set())[3].name)) && x.includes('content') && x.includes('N:replaced')) && !applyVerdict(res).ok,
    `verify/identity: a child whose id changed under the update is named, and the verdict fails (${o.identity.slice(0, 1).join('')}; ${applyVerdict(res).headline})`);
}
{
  // The host drops one binding after the members are configured: the content check reads it.
  const w = await world(TAG, plansOf(TAG), { extraVars: ['space/999'] });
  const victim = childNamed(membersOf(w.set())[3], 'content');
  let yields = 0;
  const next = moveGap(w.plans);
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
  const total = Math.ceil(45 / 4);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre), {
    yieldTo: async () => { if (++yields === total + 1) delete (victim.boundVariables as Record<string, unknown>).itemSpacing; },
  });
  const o = res.outcomes[0];
  ok(o.content.some((x) => x.includes(String(membersOf(w.set())[3].name)) && x.includes('content.bound')) && !applyVerdict(res).ok,
    `verify/content: a field the host does not hold is reported, and the verdict fails (${o.content.slice(0, 1).join('').slice(0, 160)}; ${applyVerdict(res).headline})`);
}

/* ── corpus ──────────────────────────────────────────────────────────────────────────────────────────── */
section('edge — a file built when the disabled edge bound an icon role is corrected in place (Q346, #2749)');
{
  // Each def is built from a copy whose `disabled.border` is the retired `color.disabled.icon` (#1349, #1697): the
  // file an earlier plugin left. The update then runs against the CURRENT def. What the test reads is the shim's
  // own nodes: which variable each disabled member's stroke is bound to, and every key and id it captured before.
  for (const id of ['tag', 'button', 'icon-button']) {
    const def = componentDefs.find((d) => d.id === id)!;
    const old = { ...def, tokens: { ...def.tokens, 'disabled.border': 'color.disabled.icon' } };
    // Button and IconButton carry a `surface` axis, so half their disabled edges are the inverse twins.
    const w = await world(id, figmaAnatomySet(old, { swapTarget: SWAP_TARGET }), { extraVars: ['color/disabled/border', 'color/inverse/disabled/border'] });
    const vars = new Map<string, string>((await w.api.variables.getLocalVariablesAsync()).map((v: { id: string; name: string }) => [v.id, v.name.slice(v.name.indexOf('/') + 1)] as [string, string]));
    const strokeVar = (m: Node): string | undefined => {
      const vid = ((m.strokes as { boundVariables?: { color?: { id: string } } }[] | undefined) ?? [])[0]?.boundVariables?.color?.id;
      return vid ? (vars.get(vid) ?? vid) : undefined;
    };
    const isIcon = (v?: string) => /^color\/(inverse\/)?disabled\/icon$/.test(v ?? '');
    const isBorder = (v?: string) => /^color\/(inverse\/)?disabled\/border$/.test(v ?? '');
    const was = membersOf(w.set()).filter((m) => /state=disabled/.test(String(m.name)) && !!strokeVar(m));
    ok(was.length > 0 && was.every((m) => isIcon(strokeVar(m))), `premise: ${id}'s old build strokes ${was.length} disabled member(s) with the disabled icon role (${[...new Set(was.map(strokeVar))].join(', ')})`);
    const before = identityOf(w.set());
    const { pre, res } = await confirm(w, [{ def: id, plans: plansOf(id) }]);
    ok(pre.sets[0].counts.update >= was.length && applyVerdict(res).ok, `edge/${id} dry run: the ${was.length} disabled edge(s) read to update, and the apply succeeds (${pre.sets[0].counts.update}; ${applyVerdict(res).headline})`);
    const now = membersOf(w.set()).filter((m) => was.some((x) => x.name === m.name));
    ok(now.length === was.length && now.every((m) => isBorder(strokeVar(m)) && strokeVar(m)!.includes('inverse') === strokeVar(was.find((x) => x.name === m.name)!)!.includes('inverse')),
      `edge/${id} rebound: every disabled edge is now bound to the disabled border role, on its own surface (${now.filter((m) => !isBorder(strokeVar(m))).length} still not)`);
    const after = identityOf(w.set());
    const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
    ok(moved.length === 0 && JSON.stringify(after.set) === JSON.stringify(before.set), `edge/${id} in place: the set and every member keep their key and id (${moved.length} changed)`);
    const post = (await previewUpdate(w.host, [{ def: id, plans: plansOf(id) }])).sets[0];
    ok(post.counts.current === before.members.size, `edge/${id} current: the next dry run reads all ${before.members.size} current (${JSON.stringify(post.counts)})`);
  }
}

section('corpus — every def, re-applied in place by an executor revision bump, keeps every key and reads back as its plan');
{
  // A newer executor revision makes every member out of date with nothing else moved, so the update configures
  // every node of every member: the configure path over every node kind the corpus has. The stamps are rewritten
  // to revision 0 on the host, which is what a file built by an older plugin holds.
  const defs = componentDefs.filter((d) => d.figmaProperties && !d.figmaProperties.emitAsComponents);
  let ran = 0;
  const bad: string[] = [];
  for (const d of defs) {
    // A def this shim cannot build clean (its layout model reports footprint misses on a build) still has to update
    // without ADDING any: the update's misses must be exactly the build's.
    const builtMisses: string[] = [];
    const w = await world(d.id, plansOf(d.id), { allowMisses: builtMisses });
    for (const m of membersOf(w.set())) {
      const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
      (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.replace(/\|[^|]*$/, '|0'));
    }
    const before = identityOf(w.set());
    const { pre, res } = await confirm(w, [{ def: d.id, plans: w.plans }]);
    const v = applyVerdict(res);
    const after = identityOf(w.set());
    const changed = [...before.members].flatMap(([name, b]) => {
      const a = after.members.get(name);
      if (!a || a.key !== b.key || a.id !== b.id) return [`${name} (member)`];
      return [...b.kids].filter(([p, id]) => a.kids.get(p) !== id).map(([p]) => `${name}/${p}`);
    });
    const post = (await previewUpdate(w.host, [{ def: d.id, plans: w.plans }])).sets[0];
    const o = res.outcomes[0];
    if (pre.sets[0].counts.update !== before.members.size) bad.push(`${d.id}: premise — ${pre.sets[0].counts.update} of ${before.members.size} out of date`);
    else if (!v.ok && !builtMisses.length) bad.push(`${d.id}: ${v.headline} — ${v.lines.slice(0, 2).join(' | ').slice(0, 240)}`);
    else if (changed.length) bad.push(`${d.id}: ${changed.length} ids changed (${changed.slice(0, 2).join('; ')})`);
    else if (post.counts.current !== before.members.size) bad.push(`${d.id}: after, ${post.counts.current} of ${before.members.size} current (${JSON.stringify(post.counts)})`);
    else if (JSON.stringify([...o.misses].sort()) !== JSON.stringify([...builtMisses].sort()))
      bad.push(`${d.id}: misses differ from the build's (${o.misses.filter((x) => !builtMisses.includes(x)).slice(0, 1).join('').slice(0, 160)} | ${builtMisses.filter((x) => !o.misses.includes(x)).length} of the build's gone)`);
    else ran++;
  }
  ok(bad.length === 0 && ran === defs.length, `corpus/in place: all ${defs.length} defs re-applied with every key and id kept, read back clean, and current after (${ran} clean; ${bad.slice(0, 4).join(' || ')})`);
}

/* ── image-placeholder (#2345) ───────────────────────────────────────────────────────────────────────── */
section('image-placeholder — the NB master\'s 3-member set reaches 7 ratios, a scaling marker and the Marker boolean in place (#2345)');
{
  // THE FILE AS THE NB MASTER HOLDS IT: built from the def as it was before #2345 — three ratios, the marker in
  // the flow, no boolean. Reconstructed from today's def by putting those three facts back, so the subject is the
  // real def's projection on both sides.
  const IMG = 'image-placeholder';
  const now = componentDefs.find((x) => x.id === IMG)!;
  const { optional: _o, scaleWithParent: _s, ...oldMarker } = now.anatomy.parts.marker;
  void _o; void _s;
  const before2345 = {
    ...now,
    variants: { ratio: ['1:1', '4:3', '16:9'] },
    anatomy: { ...now.anatomy, parts: { ...now.anatomy.parts, marker: oldMarker } },
    figmaProperties: { ...now.figmaProperties, booleans: {} },
  } as typeof now;
  const oldPlans = figmaAnatomySet(before2345, { swapTarget: SWAP_TARGET });
  const newPlans = plansOf(IMG);
  const w = await world(IMG, oldPlans);
  const NAMES_BEFORE = ['ratio=1:1', 'ratio=4:3', 'ratio=16:9'];
  ok(JSON.stringify(membersOf(w.set()).map((m) => String(m.name)).sort()) === JSON.stringify([...NAMES_BEFORE].sort()),
    `premise: the file holds the three pre-#2345 members (${membersOf(w.set()).map((m) => m.name).join(', ')})`);
  const before = identityOf(w.set());
  const { pre, res } = await confirm(w, [{ def: IMG, plans: newPlans }]);
  const p = pre.sets[0];
  ok(p.counts.update === 3 && p.counts.add === 4 && p.counts.drop === 0 && p.renames.length === 0 && !p.blockers.length,
    `img/dry run: the three existing members read update, four are added, none dropped or renamed (${JSON.stringify(p.counts)}, ${p.renames.length} renames, ${p.blockers.length} blockers)`);
  // `absoluteScale` by name: the read-back has to see that the file's marker is not SCALE-constrained, or a marker
  // the update failed to constrain would read current.
  ok(p.changes.some((c) => c.part === 'marker' && c.field === 'absoluteScale' && c.members === 3),
    `img/dry run: the marker's SCALE placement is a named difference on all three (${JSON.stringify(p.changes.map((c) => [c.part, c.field, c.members])).slice(0, 200)})`);
  const v = applyVerdict(res);
  ok(v.ok, `img/verdict: ${v.headline} (${v.lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const after = identityOf(w.set());
  // Typed here: the seven names the issue asks for.
  const NAMES_AFTER = ['ratio=2:3', 'ratio=3:4', 'ratio=4:5', 'ratio=1:1', 'ratio=4:3', 'ratio=3:2', 'ratio=16:9'];
  ok(JSON.stringify([...after.members.keys()].sort()) === JSON.stringify([...NAMES_AFTER].sort()) && res.outcomes[0].added === 4,
    `img/added: the set holds the seven ratios, four of them added (${[...after.members.keys()].join(', ')}; added ${res.outcomes[0].added})`);
  ok(JSON.stringify(after.set) === JSON.stringify(before.set), 'img/set kept: the set keeps its key and id');
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  ok(moved.length === 0, `img/members kept: the three existing members keep their keys and ids (${moved.join(', ') || 'none moved'})`);
  const markerMoved = [...before.members].filter(([name, b]) => {
    const was = [...b.kids].find(([path]) => path.startsWith('marker#'))?.[1];
    return !was || ![...(after.members.get(name)?.kids.values() ?? [])].includes(was);
  }).map(([n]) => n);
  ok(markerMoved.length === 0, `img/marker kept: each existing member's marker keeps its node id (${markerMoved.join(', ') || 'none replaced'})`);
  // Read off the shim's nodes: every member's marker lifted out of the flow and constrained SCALE/SCALE.
  const placement = membersOf(w.set()).map((m) => {
    const k = childNamed(m, 'marker');
    const c = k?.constraints as { horizontal?: string; vertical?: string } | null;
    return `${String(m.name)}:${String(k?.layoutPositioning)} ${c?.horizontal}/${c?.vertical}`;
  });
  ok(placement.every((s) => s.endsWith(':ABSOLUTE SCALE/SCALE')), `img/marker scales: every member's marker is ABSOLUTE, SCALE/SCALE (${placement.filter((s) => !s.endsWith(':ABSOLUTE SCALE/SCALE')).join('; ') || 'all seven'})`);
  // The Marker boolean: declared on the set, default on, and every member's marker wired to it.
  const defs = (w.set().componentPropertyDefinitions ?? {}) as Record<string, { type: string; defaultValue: unknown }>;
  const markerProp = Object.entries(defs).find(([k]) => k.split('#')[0] === 'marker');
  ok(!!markerProp && markerProp[1].type === 'BOOLEAN' && markerProp[1].defaultValue === true,
    `img/property: the set declares the BOOLEAN 'marker', default on (${JSON.stringify(defs)})`);
  const unwired = membersOf(w.set()).filter((m) => String(((childNamed(m, 'marker')?.componentPropertyReferences ?? {}) as Record<string, string>).visible ?? '').split('#')[0] !== 'marker').map((m) => String(m.name));
  ok(unwired.length === 0, `img/property wired: every member's marker visibility follows 'marker' (${unwired.join(', ') || 'all seven'})`);
  const post = (await previewUpdate(w.host, [{ def: IMG, plans: newPlans }])).sets[0];
  ok(post.counts.current === 7 && post.handEdits.length === 0, `img/current: the next dry run reads all seven current (${JSON.stringify(post.counts)})`);
}

/* ── inline glyph → icon instance (#2380) ────────────────────────────────────────────────────────────── */
section('icons — a set built with inline glyphs updates to icon instances, as a named difference (#2380)');
{
  // THE PRE-#2380 SHAPE, rebuilt from today's plans: every icon instance turned back into the inline glyph it
  // replaced — a GLYPH importing the icon's outline at the same binding, and checkbox's inset frame back into a
  // glyph on the padded artboard (`-3 -3 30 30`, #1346). The file has the icon components already (built first,
  // as the dry run requires), so only the members change.
  // Each icon's own document, as the `icon` def projects it (the outline the inline glyph imported), and the same
  // document on the padded artboard for the inset.
  const iconDoc = new Map(plansOf('icon').map((p) => [`icon/${String(p.coord.name)}`, String(p.root.glyphSvg)] as const));
  const doc = (target: string, padded: boolean): string => {
    const d = iconDoc.get(target);
    if (!d) throw new Error(`premise: no icon document for ${target}`);
    return padded ? d.replace('width="24" height="24" viewBox="0 0 24 24"', 'width="30" height="30" viewBox="-3 -3 30 30"') : d;
  };
  const legacy = (plans: AnatomyPlan[]): AnatomyPlan[] => plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    const walk = (n: PlanNode): PlanNode => {
      const inset = n.type === 'FRAME' && n.children.length === 1 && n.children[0].glyphInset ? n.children[0] : undefined;
      if (inset) {
        const { nestTarget, descendantFills } = inset;
        return { ...n, type: 'GLYPH', glyphSvg: doc(nestTarget!, true), glyphViewBox: [30, 30], ...(descendantFills ? { descendantFills } : {}), children: [] };
      }
      if (n.type === 'NESTED_INSTANCE' && n.nestTarget?.startsWith('icon/')) {
        const { nestTarget, ...rest } = n;
        return { ...rest, type: 'GLYPH', glyphSvg: doc(nestTarget, false), glyphViewBox: [24, 24] };
      }
      return { ...n, children: n.children.map(walk) };
    };
    q.root = walk(q.root);
    return q;
  });
  const iconsOf = (plans: AnatomyPlan[]): string[] => [...new Set(plans.flatMap((p) => planComps(p.root)).filter((c) => c.startsWith('icon/')))];
  const findPart = (n: Node, name: string): Node | undefined => {
    if (n.name === name) return n;
    if (n.type === 'INSTANCE') return undefined;
    for (const c of (n.children as Node[] | undefined) ?? []) { const f = findPart(c, name); if (f) return f; }
    return undefined;
  };
  const mainName = (n: Node | undefined): string => String((n as { mainComponent?: { name?: string } } | undefined)?.mainComponent?.name ?? '(not an instance)');

  // FIELD-MESSAGE: the glyph's node is REPLACED — a FRAME cannot become an INSTANCE — so its id changes.
  {
    const plans = plansOf('field-message');
    const w = await world('field-message', legacy(plans), { extraComps: iconsOf(plans) });
    const err = (): Node | undefined => { const m = membersOf(w.set()).find((x) => String(x.name) === 'status=error'); return m && findPart(m, 'iconError'); };
    const before = identityOf(w.set());
    const oldErr = err();
    ok(oldErr?.type === 'FRAME', `premise: the error member's glyph is an inline FRAME before the update (${String(oldErr?.type)})`);
    const { pre, res } = await confirm(w, [{ def: 'field-message', plans }]);
    const named = pre.sets[0].changes.filter((c) => c.part.endsWith('iconError') && (c.field === 'type' || c.field === 'nestTarget'));
    // The read-back's `nestTarget` predicate is what names it: the file holds a FRAME where the plan wants an instance.
    ok(named.some((c) => c.field === 'nestTarget' && /^FRAME/.test(c.from) && /icon\/warning-triangle/.test(c.to)),
      `icons/dry run: the error glyph's move is NAMED — the file's FRAME against the plan's instance of icon/warning-triangle — not a silent re-apply (${JSON.stringify(named.map((c) => [c.field, c.from, c.to]))})`);
    // The default member draws no glyph, so it is current; the three status members change.
    ok(pre.sets[0].counts.update === 3 && pre.sets[0].counts.current === 1 && !pre.sets[0].blockers.length, `icons/dry run: the 3 status members read out of date and the glyph-free default current, none blocked (${JSON.stringify(pre.sets[0].counts)})`);
    ok(applyVerdict(res).ok, `icons/apply: ${applyVerdict(res).headline} (${JSON.stringify(applyVerdict(res).lines).slice(0, 240)})`);
    const after = identityOf(w.set());
    const newErr = err();
    ok(newErr?.type === 'INSTANCE' && mainName(newErr) === 'icon/warning-triangle', `icons/after: the error glyph is an INSTANCE of icon/warning-triangle (${String(newErr?.type)} of ${mainName(newErr)})`);
    ok(!!oldErr && !!newErr && oldErr.id !== newErr.id, `icons/child id: the glyph's node is replaced, so its id CHANGES (${String(oldErr?.id)} → ${String(newErr?.id)}) — an override on the old inline glyph does not carry over`);
    const membersKept = [...before.members].every(([name, b]) => after.members.get(name)?.id === b.id && after.members.get(name)?.key === b.key);
    ok(membersKept, 'icons/members: every member keeps its key and id; only the glyph node is new');
    const post = (await previewUpdate(w.host, [{ def: 'field-message', plans }])).sets[0];
    ok(post.counts.current === 4, `icons/current: the next dry run reads all 4 current (${JSON.stringify(post.counts)})`);
  }

  // CHECKBOX-CONTROL: the `mark` frame still fits, so it is KEPT (its id stays) and only its contents change.
  {
    const plans = plansOf('checkbox-control');
    const w = await world('checkbox-control', legacy(plans), { extraComps: iconsOf(plans) });
    const checked = (): Node => membersOf(w.set()).find((x) => /selection=checked/.test(String(x.name)))!;
    const oldMark = findPart(checked(), 'mark');
    ok(oldMark?.type === 'FRAME' && ((oldMark.children as Node[]) ?? []).some((c) => c.type === 'VECTOR'), `premise: the check is an inline glyph frame holding a VECTOR before the update`);
    const { pre, res } = await confirm(w, [{ def: 'checkbox-control', plans }]);
    ok(applyVerdict(res).ok && !pre.sets[0].blockers.length, `icons/apply: ${applyVerdict(res).headline}`);
    const mark = findPart(checked(), 'mark');
    const glyph = ((mark?.children as Node[] | undefined) ?? []).find((c) => c.name === 'glyph');
    ok(!!mark && mark.id === oldMark?.id, `icons/mark id: the mark frame is kept, so its id stays (${String(oldMark?.id)} → ${String(mark?.id)})`);
    ok(glyph?.type === 'INSTANCE' && mainName(glyph) === 'icon/check' && ((mark?.children as Node[]) ?? []).length === 1,
      `icons/mark contents: the inline VECTOR is gone and the frame holds one INSTANCE of icon/check (${((mark?.children as Node[]) ?? []).map((c) => `${c.type}:${mainName(c)}`).join(', ')})`);
  }

  // NOT IN THIS FILE: an update that needs an icon the file lacks is refused, naming it, and writes nothing.
  {
    const plans = plansOf('field-message');
    const w = await world('field-message', legacy(plans));
    const stamps = membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join();
    const pre = await previewUpdate(w.host, [{ def: 'field-message', plans }]);
    const b = pre.sets[0].blockers.join('; ');
    ok(/Not in this file: icon\/check-circle, icon\/error-circle, icon\/warning-triangle\. Build icon first/.test(b), `icons/absent: the dry run refuses the set and names the icons to build first (${b})`);
    await applyUpdate(w.host, w.api as any, [{ def: 'field-message', plans }], previewHashOf(pre));
    ok(membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join() === stamps, 'icons/absent: nothing is written — every stamp is as it was');
  }
}

/* ── accordion header row (#2594) ────────────────────────────────────────────────────────────────────── */
section('accordion — a set built before the header row (#2594, owner Q276 A) takes the row in place, every member kept');
{
  // THE FILE AS A BUILD AT MAIN BEFORE #2594 LEFT IT: the header top-aligned, holding the indicators and the title
  // directly with the gap on itself, and no `titleRow`. Reconstructed from today's def by putting those facts back,
  // so the subject is the real def's projection on both sides (as `image-placeholder` above does).
  const ACC = 'accordion';
  const now = componentDefs.find((x) => x.id === ACC)!;
  const { titleRow, ...restParts } = now.anatomy.parts;
  const before2594 = {
    ...now,
    anatomy: { ...now.anatomy, parts: { ...restParts, header: { ...now.anatomy.parts.header, layout: { ...now.anatomy.parts.header.layout!, align: 'start' }, gap: titleRow.gap, children: [...titleRow.children!, 'focusRing'] } } },
  } as typeof now;
  const oldPlans = figmaAnatomySet(before2594, { swapTarget: SWAP_TARGET });
  const newPlans = plansOf(ACC);
  const w = await world(ACC, oldPlans);
  const header = (m: Node): Node => childNamed(m, 'header');
  const kids = (n: Node | undefined): string[] => ((n?.children as Node[] | undefined) ?? []).map((c) => String(c.name));
  ok(membersOf(w.set()).length === 24 && membersOf(w.set()).every((m) => !childNamed(header(m), 'titleRow') && kids(header(m)).includes('titleBox') && header(m).counterAxisAlignItems === 'MIN'),
    `premise: the file holds 24 members built before #2594, each header top-aligned and holding the title directly (${kids(header(membersOf(w.set())[0])).join(', ')}; ${String(header(membersOf(w.set())[0]).counterAxisAlignItems)})`);
  const before = identityOf(w.set());
  const keptIds = (m: Node) => ({ header: String(header(m).id), divider: String(childNamed(m, 'divider')?.id) });
  const beforeKept = new Map(membersOf(w.set()).map((m) => [String(m.name), keptIds(m)] as const));
  const { pre, res } = await confirm(w, [{ def: ACC, plans: newPlans }]);
  const p = pre.sets[0];
  ok(p.counts.update === 24 && p.counts.add === 0 && p.counts.drop === 0 && p.renames.length === 0 && !p.blockers.length && !p.replacements.length,
    `acc/dry run: all 24 members read update, none added, dropped, renamed or replaced, and nothing refused (${JSON.stringify(p.counts)}, ${p.blockers.join('; ') || 'no blockers'}, ${p.replacements.length} replacements)`);
  ok(p.changes.some((c) => c.part === 'header' && c.field === 'counterAxisAlignItems' && c.from === 'MIN' && c.to === 'CENTER' && c.members === 24) && p.changes.some((c) => c.part === 'header/titleRow' && c.field === 'children' && c.to === 'present'),
    `acc/dry run: the header's centering and the added row are named differences (${JSON.stringify(p.changes.map((c) => [c.part, c.field, c.members])).slice(0, 240)})`);
  const v = applyVerdict(res);
  ok(v.ok, `acc/verdict: ${v.headline} (${v.lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const after = identityOf(w.set());
  ok(JSON.stringify(after.set) === JSON.stringify(before.set), 'acc/set kept: the set keeps its key and id');
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  ok(moved.length === 0 && after.members.size === 24, `acc/members kept: all 24 members keep their keys and ids (${moved.join('; ') || 'none moved'})`);
  const lostHost = membersOf(w.set()).filter((m) => JSON.stringify(keptIds(m)) !== JSON.stringify(beforeKept.get(String(m.name)))).map((m) => String(m.name));
  ok(lostHost.length === 0, `acc/header kept: each member's header and Divider keep their node ids; the row is added inside the header in place (${lostHost.slice(0, 2).join('; ') || 'all 24'})`);
  // The new structure, read off the shim's nodes: the header centers one row, and the row holds the indicator and
  // the title, top-aligned. Typed here from Q276 A.
  const shape = membersOf(w.set()).map((m) => {
    const h = header(m), row = childNamed(h, 'titleRow');
    const side = /icon position=leading/.test(String(m.name)) ? 'leadingIndicator' : 'trailingIndicator';
    const want = side === 'leadingIndicator' ? ['leadingIndicator', 'titleBox'] : ['titleBox', 'trailingIndicator'];
    return { m: String(m.name), ok: h.counterAxisAlignItems === 'CENTER' && !!row && row.counterAxisAlignItems === 'MIN' && JSON.stringify(kids(row)) === JSON.stringify(want) && !kids(h).includes('titleBox') && !kids(h).includes(side), got: `${String(h.counterAxisAlignItems)} [${kids(h).join(', ')}] / ${String(row?.counterAxisAlignItems)} [${kids(row).join(', ')}]` };
  });
  ok(shape.every((x) => x.ok), `acc/structure: every header is centered and holds the row, which holds the indicator and the title top-aligned (${shape.filter((x) => !x.ok).slice(0, 2).map((x) => `${x.m}: ${x.got}`).join('; ') || 'all 24'})`);
  const post = (await previewUpdate(w.host, [{ def: ACC, plans: newPlans }])).sets[0];
  ok(post.counts.current === 24 && post.handEdits.length === 0, `acc/current: the next dry run reads all 24 current (${JSON.stringify(post.counts)})`);
  // THE COST, stated rather than hidden: the indicators and the title move into a frame the file did not have, and
  // the in-place update pairs a node's children by name under the SAME parent, so they are built fresh inside the row
  // and the old ones removed. Their ids change; a placed instance's own choice on the nested indicator does not carry
  // over (the title is a text property, so its text does). Typed here so a change to that pairing is seen.
  const rebuilt = [...before.members].every(([name, b]) => {
    const now2 = new Set(after.members.get(name)?.kids.values() ?? []);
    const was = [...b.kids].filter(([path]) => /^header#0\/(titleBox|leadingIndicator|trailingIndicator)#/.test(path)).map(([, id]) => id);
    return was.length > 0 && was.every((id) => !now2.has(id));
  });
  ok(rebuilt, 'acc/moved children: the indicator and the title are built fresh inside the row, so their ids change');
  // ADOPTED, NOT RE-CREATED, ONCE THERE: a later update (here an executor revision bump, every member out of date
  // with nothing else moved) pairs the row the first update added, and every node under it keeps its id.
  for (const m of membersOf(w.set())) {
    const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.replace(/\|[^|]*$/, '|0'));
  }
  const rowIds = (m: Node): string => JSON.stringify([...idsUnder(childNamed(header(m), 'titleRow'))]);
  const beforeRow = new Map(membersOf(w.set()).map((m) => [String(m.name), rowIds(m)] as const));
  const again = await confirm(w, [{ def: ACC, plans: newPlans }]);
  ok(again.pre.sets[0].counts.update === 24 && applyVerdict(again.res).ok, `acc/again: a revision bump reads all 24 out of date and updates them (${JSON.stringify(again.pre.sets[0].counts)}; ${applyVerdict(again.res).headline})`);
  const reRow = membersOf(w.set()).filter((m) => rowIds(m) !== beforeRow.get(String(m.name))).map((m) => String(m.name));
  ok(reRow.length === 0, `acc/row adopted: a later update keeps the row and every node under it, by id, on every member (${reRow.slice(0, 2).join('; ') || 'all 24'})`);
}

/* ── segmented control (#2724) ───────────────────────────────────────────────────────────────────────── */
section('segmented control — sets built with the tinted, outlined look (#2418) take the flat pill and the filled track in place (#2724, owner Q336 A, Q342 A)');
{
  // THE FILE AS A BUILD AT MAIN BEFORE #2724 LEFT IT: the selected indicator tinted in the overlay slot with a 2px
  // primary outline stepping per state, a disabled outline, and the control's track a 1px neutral outline with no
  // fill. Reconstructed from today's defs by putting those facts back, so the subject is the real defs' projection on
  // both sides (as `image-placeholder` and `accordion` above do). Every expectation below is read off the shim's
  // nodes by the test. Mutations: the executor's in-place stroke clear skipped → `seg/border removed`,
  // `seg/track outline removed`.
  const SEG = 'segmented-control-segment', CTL = 'segmented-control';
  const segNow = componentDefs.find((x) => x.id === SEG)!;
  const ctlNow = componentDefs.find((x) => x.id === CTL)!;
  const { 'selected.fill': _f, 'disabled.fill': _d, ...segKept } = segNow.tokens;
  void _f; void _d;
  const seg2418 = {
    ...segNow,
    tokens: {
      ...segKept,
      'unselected.border-width': 'border-width.none',
      'selected.border-width': 'border-width.thick',
      'selected.overlay': 'color.interactive.primary.subtle-fill.selected',
      'selected.border': 'color.interactive.primary.border.rest',
      'selected.border.hover': 'color.interactive.primary.border.hover',
      'selected.border.pressed': 'color.interactive.primary.border.pressed',
      'disabled.border': 'color.disabled.border',
    },
    anatomy: { ...segNow.anatomy, parts: { ...segNow.anatomy.parts, indicator: { ...segNow.anatomy.parts.indicator, paintSlots: ['overlay', 'border'], strokeWidth: '{selection}.border-width' } } },
  } as typeof segNow;
  const { fill: _t, ...ctlKept } = ctlNow.tokens;
  void _t;
  const ctl2418 = {
    ...ctlNow,
    tokens: { ...ctlKept, 'border-width': 'border-width.hairline', border: 'color.interactive.neutral.border.rest' },
    anatomy: { ...ctlNow.anatomy, parts: { ...ctlNow.anatomy.parts, track: { ...ctlNow.anatomy.parts.track, paintSlots: ['border'], strokeWidth: 'border-width' } } },
  } as typeof ctlNow;
  const stroked = (n: Node | undefined): boolean => ((n?.strokes as { visible?: boolean }[] | undefined) ?? []).some((p) => p.visible !== false);
  const filledWith = async (w: World, n: Node | undefined): Promise<string> => {
    const id = ((n?.fills as { boundVariables?: { color?: { id: string } } }[] | undefined) ?? [])[0]?.boundVariables?.color?.id;
    const v = id && (await w.api.variables.getLocalVariablesAsync()).find((x: { id: string }) => x.id === id);
    return v ? String(v.name).replace(/^[^/]+\//, '') : 'none';
  };

  // THE OPTION SET.
  const segOld = figmaAnatomySet(seg2418, { swapTarget: SWAP_TARGET });
  const segNew = plansOf(SEG);
  const ws = await world(SEG, segOld, { extraVars: segNew.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]) });
  const ind = (m: Node): Node => childNamed(m, 'indicator');
  const selected = (m: Node) => /selection=selected/.test(String(m.name));
  const wasEdged = membersOf(ws.set()).filter((m) => selected(m) && stroked(ind(m))).length;
  ok(membersOf(ws.set()).length === 30 && wasEdged === 15, `premise: the file holds 30 options, the 15 selected ones with an outlined indicator (${membersOf(ws.set()).length}, ${wasEdged} outlined)`);
  const segBefore = identityOf(ws.set());
  const sres = await confirm(ws, [{ def: SEG, plans: segNew }]);
  ok(sres.pre.sets[0].counts.update === 30 && applyVerdict(sres.res).ok, `seg/updated: all 30 options read out of date and are updated in place (${JSON.stringify(sres.pre.sets[0].counts)}; ${applyVerdict(sres.res).headline})`);
  const stillEdged = membersOf(ws.set()).filter((m) => stroked(ind(m))).map((m) => String(m.name));
  ok(stillEdged.length === 0, `seg/border removed: no option's indicator keeps a stroke (${stillEdged.length} still outlined${stillEdged.length ? `, e.g. ${stillEdged[0]}` : ''})`);
  // Typed here: the pill is the page surface at every selected state, disabled included.
  const pills = await Promise.all(membersOf(ws.set()).filter(selected).map(async (m) => [String(m.name), await filledWith(ws, ind(m))] as const));
  const offPill = pills.filter(([, v]) => v !== 'color/background/primary');
  ok(pills.length === 15 && offPill.length === 0, `seg/pill: every selected option's indicator is filled with color/background/primary (${offPill.length} off${offPill.length ? `, e.g. ${offPill[0].join(' → ')}` : ''})`);
  const segAfter = identityOf(ws.set());
  const segMoved = [...segBefore.members].filter(([name, b]) => segAfter.members.get(name)?.key !== b.key || segAfter.members.get(name)?.kids.get('indicator#0') !== b.kids.get('indicator#0')).map(([n]) => n);
  ok(segMoved.length === 0, `seg/kept: every option keeps its key and its indicator's node id (${segMoved.slice(0, 2).join(', ') || 'none moved'})`);
  const segPost = (await previewUpdate(ws.host, [{ def: SEG, plans: segNew }])).sets[0];
  ok(segPost.counts.current === 30, `seg/current: the next dry run reads all 30 current (${JSON.stringify(segPost.counts)})`);

  // THE CONTROL SET.
  const ctlOld = figmaAnatomySet(ctl2418, { swapTarget: SWAP_TARGET });
  const ctlNew = plansOf(CTL);
  const wc = await world(CTL, ctlOld, { extraVars: ctlNew.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]) });
  const track = (m: Node): Node => childNamed(m, 'track');
  ok(membersOf(wc.set()).length === 3 && membersOf(wc.set()).every((m) => stroked(track(m))), `premise: the file holds 3 controls, each track outlined (${membersOf(wc.set()).filter((m) => stroked(track(m))).length} outlined)`);
  const ctlBefore = identityOf(wc.set());
  const cres = await confirm(wc, [{ def: CTL, plans: ctlNew }]);
  ok(cres.pre.sets[0].counts.update === 3 && applyVerdict(cres.res).ok, `seg/control updated: all 3 controls are updated in place (${JSON.stringify(cres.pre.sets[0].counts)}; ${applyVerdict(cres.res).headline})`);
  const outlined = membersOf(wc.set()).filter((m) => stroked(track(m))).map((m) => String(m.name));
  ok(outlined.length === 0, `seg/track outline removed: no control's track keeps a stroke (${outlined.length} still outlined${outlined.length ? `, e.g. ${outlined[0]}` : ''})`);
  const tracks = await Promise.all(membersOf(wc.set()).map((m) => filledWith(wc, track(m))));
  ok(tracks.every((t) => t === 'color/background/secondary'), `seg/track fill: every track is filled with color/background/secondary (${tracks.join(', ')})`);
  const ctlAfter = identityOf(wc.set());
  const ctlMoved = [...ctlBefore.members].filter(([name, b]) => ctlAfter.members.get(name)?.key !== b.key || ctlAfter.members.get(name)?.kids.get('track#1') !== b.kids.get('track#1')).map(([n]) => n);
  ok(ctlMoved.length === 0, `seg/control kept: every control keeps its key and its track's node id (${ctlMoved.join(', ') || 'none moved'})`);
  const ctlPost = (await previewUpdate(wc.host, [{ def: CTL, plans: ctlNew }])).sets[0];
  ok(ctlPost.counts.current === 3, `seg/control current: the next dry run reads all 3 current (${JSON.stringify(ctlPost.counts)})`);
}

/* ── overrides (#2645) ──────────────────────────────────────────────────────────────────────────────── */
section('overrides — a nested instance with no override yet gains it in place on Update; a hand edit is kept (#2645)');
{
  // A List built BEFORE its items carried their numbers: the same plans with every `nestOverrides` taken out, built by
  // the real executor. List.Item's two TEXT properties are declared on the host with ids the plan cannot know.
  const LIST = 'list';
  const planned = plansOf(LIST);
  const strip = (n: PlanNode): PlanNode => {
    const { nestOverrides: _drop, ...rest } = n as PlanNode & { nestOverrides?: unknown };
    void _drop;
    return { ...rest, children: (n.children ?? []).map(strip) } as PlanNode;
  };
  const old = planned.map((p) => ({ ...p, root: strip(p.root) }));
  ok(planned.every((p) => JSON.stringify(p).includes('"nestOverrides"')) && old.every((p) => !JSON.stringify(p).includes('nestOverrides')),
    'premise: every List plan carries overrides, and the plans the file was built from carry none');
  const NUM = 'number#7:2';
  const w = await world(LIST, old, { componentProps: { '_list-item': { 'text#7:1': { type: 'TEXT', defaultValue: 'List item' }, [NUM]: { type: 'TEXT', defaultValue: '1.' } } } });
  const items = (m: Node): Node[] => [1, 2, 3, 4, 5, 6, 7, 8].map((i) => childNamed(m, `item${i}`));
  const numberOf = (n: Node): unknown => (n.componentProperties as Record<string, { value: unknown }>)[NUM]?.value;
  ok(membersOf(w.set()).every((m) => items(m).every((n) => numberOf(n) === '1.')), 'premise: as built, every item of every member reads "1."');
  // A designer's own number on ONE item of ONE member, typed before the update.
  const edited = membersOf(w.set())[0];
  (childNamed(edited, 'item2').setProperties as (p: Record<string, string>) => void)({ [NUM]: '2)' });
  const before = identityOf(w.set());
  const { pre, res } = await confirm(w, [{ def: LIST, plans: planned }]);
  const set0 = pre.sets[0];
  const fields = new Set(set0.changes.map((c) => `${c.part}:${c.field}`));
  ok([2, 3, 4, 5, 6, 7, 8].every((i) => fields.has(`item${i}:nestOverrides`)) && !fields.has('item1:nestOverrides') && set0.replacements.length === 0,
    `overrides/dry run: the dry run lists the override on items 2 to 8 as a change, not on item 1, and replaces nothing (${[...fields].filter((f) => f.endsWith('nestOverrides')).join(', ')}; ${set0.replacements.length} replacements)`);
  ok(set0.handEdits.some((h) => h.member === String(edited.name) && h.path === 'item2'),
    `overrides/hand edit reported: the typed number reads as a hand edit (${JSON.stringify(set0.handEdits).slice(0, 200)})`);
  ok(applyVerdict(res).ok, `overrides/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const wrong = membersOf(w.set()).flatMap((m) => items(m).map((n, i) => {
    const want = m === edited && i === 1 ? '2)' : `${i + 1}.`;
    return numberOf(n) === want ? null : `${String(m.name)}/item${i + 1}=${String(numberOf(n))} (want ${want})`;
  })).filter(Boolean);
  ok(wrong.length === 0, `overrides/written in place: every item now reads its own number, "1." to "8.", and the hand-typed "2)" is kept (${wrong.length} off: ${wrong.slice(0, 3).join('; ')})`);
  const after = identityOf(w.set());
  ok([...before.members].every(([name, b]) => after.members.get(name)?.key === b.key && [...b.kids].every(([p, id]) => after.members.get(name)?.kids.get(p) === id)),
    'overrides/ids: every member and every nested item keeps its key and id: nothing was rebuilt');
  const post = (await previewUpdate(w.host, [{ def: LIST, plans: planned }])).sets[0];
  ok(post.counts.update === 0 && post.counts.current === 8 && post.handEdits.some((h) => h.member === String(edited.name) && h.path === 'item2'),
    `overrides/current: the next dry run reads the other 8 members current and still reports the hand edit (${JSON.stringify(post.counts)}; ${JSON.stringify(post.changes).slice(0, 200)})`);
}

void STYLE_FONT; void BASELINE_KEY;
console.log(`\n${failed ? `❌ ${failed} FAILED` : '✓ all passed'} — ${executed} assertions executed`);
if (failed) process.exit(1);
