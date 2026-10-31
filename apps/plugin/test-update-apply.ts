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
 *   published/…    on a set in a team library (#2831), what an update breaks for consumer files is listed in its own
 *                  section, in the headline and at the confirm: drops, layer replacements, property removals and
 *                  retypes, and a rename to a `_` or `.` name; on a set not published, nothing changes. Mutations, each
 *                  failing the arm it names: the publish test always true → `published/unpublished no-op`; each
 *                  `breakingOf` arm dropped → `published/drop`, `/replace`, `/property removed`, `/retype`,
 *                  `/private rename`; the status not read → `published/status`; the status out of the hash →
 *                  `published/hash`; the apply's section dropped → `published/confirm`; the blocked-set guard dropped →
 *                  `published/blocked`; the member-itself exclusion dropped → `published/member replaced`;
 *                  `readSingleView` carrying no status → `published/single`; `breakingSection`'s per-set cap dropped →
 *                  `published/cap`; Link's `selection` axis with `selected` first → `published/link current additive`
 *                  (#2872); `update-plan.ts` listing no adds → `published/link x-small additive`, `/link x-small
 *                  in place` (#3179). #2864, a layer the update removes: `removedLayers` returning nothing → `published/layer
 *                  removed`, `/layer line`, `/checklist set`; the same-parent lookup dropped → `/layer removed`,
 *                  `/layer line`; the structural-skip guard dropped → `/layer hand-added`; `breakingSummary`'s layer
 *                  clause dropped → `/checklist line`, `/checklist set`; `checkedSetOf` posting no line →
 *                  `/checklist set`.
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
 *   <host> leads/… a field host built with its FieldLabel at emphasis=secondary takes primary in place on Update (#3200,
 *                  owner Q-PH1 A), every key and id kept, a hand edit on the label and one on the member root kept.
 *                  Mutations: the in-place swap skipped → `<host> leads/primary`; the `kept` check dropped from the
 *                  nested path → `<host> leads/hand edit kept`.
 *   reach/…        a member stamped under a revision that did not redraw its set reads current; below the record's
 *                  floor it is to update (#3101). Mutation: `update-plan.ts` without `reaches` → `reach/dry run 42`.
 *   corpus/…       every def, re-applied in place by an executor revision bump, keeps every key and id, reads
 *                  back as its plan, and reads current after.
 *   choices/…      `overwrite` writes the plan over a hand edit; `accept` keeps it as the new record (§5).
 *                  Mutations: overwrite ignored → `hand/overwrite`; accept ignored → `hand/accept`.
 *   kept report/…  a radio dot whose bound size a designer edited, updated under `keep`: the verdict names it with the
 *                  hand edits kept ("dot size") and lists no part not written; a binding the host drops on a node no one
 *                  edited is still a part not written (#3086). Mutations: the kept-edit split dropped → `kept report/no
 *                  miss`, `kept report/named`; the property left unnamed →
 *                  `kept report/named`; the split taking every bound miss → `kept report/real discard`; the split
 *                  matching any member's kept path → `kept report/two members`. Every field the plans bind is named in a
 *                  plain word, the layer first, the per-side fields merged (Q826 A): a word falling through to the key →
 *                  that family's arm (`kept report/padding`, `/gap`, …) and `kept report/no raw key`.
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
 *   list column/…  a List.Item built at the old 24/32/40 marker column updates in place to Q340 A's 20/24/32 for bullet
 *                  and number (#2727): 6 members updated, the 3 icon members current, every key and id kept; the List
 *                  set, whose plan moves only by its nested-list note, updates in place too. Mutation: the def back at the old column → `list column/dry
 *                  run`, `list column/written`.
 *   list spacing/…  a List.Item built before #3155 (the bullet on the radio dot, the icon column at 24/32/40) and a List
 *                  built at the 8/12/16 gap update in place: 6 List.Item members and all 9 List members updated, every key
 *                  and id kept, the bullet at 6/8/8, the icon column at 32/40/48 and the gap at 12/16/20 after. Mutations:
 *                  the medium bullet back on the radio dot → `list spacing/written`; the medium icon column back at 32 →
 *                  `list spacing/written`; the medium gap back at 12 → `list spacing/gap written`.
 *   display rename/…  an Accordion built while its icon axis was `position`, or `iconPosition`, updates in place to the
 *                  def's `icon position`: every member renamed, every key and id the test captured kept (#2592).
 *                  Mutation: the ledger entries dropped → `display rename/position …`, `display rename/iconPosition …`.
 *   accordion pad-x/…  an Accordion built at the old large side padding (space/300, 24px) updates in place to the
 *                  def's 20px (space/250, Q338 A, #2726): the 16 large members updated, the 32 others current, every key
 *                  and id kept. Mutation: the def back at space.300 → `accordion pad-x/dry run`, `accordion pad-x/written`.
 *   toast 14/…     a Toast built with its message at body/md (16px), no floor and the glyph straight under `content`
 *                  updates in place to body/sm (14px), a size/md/height floor and the glyph in its line-box cell (#3165,
 *                  Q3165.1 A, #3153's rule): both members updated, every key and id kept, the glyph moved into the
 *                  inserted cell rather than rebuilt, current after. Mutation: the def's message back at body.md →
 *                  `toast 14/written`.
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
 *   status/…       a checkbox or switch control built with an `error` STATE moves onto the `status` axis in place
 *                  (#2751, owner Q354): the error member to `status=error, state=rest`, every other to `status=default`,
 *                  every id and key kept, the node a placed error instance points at still drawing the danger edge.
 *                  Mutation: the two `move` entries dropped from `COMPONENT_RENAMES` → `status/<def> dry run`,
 *                  `status/<def> placed`.
 *   <group>/…      Checkbox group, Radio group and Segmented control, each built with its FieldLabel `nest-fixed` (as
 *                  before #2748), update in place to the `nest-exposed` label (owner Q348 A): every key and id kept,
 *                  each label an exposed instance, still the secondary, bold member at its group's size, then
 *                  current. FieldLabel's real set is in the file, so the coordinate is read off the host. Mutations:
 *                  the in-place branch's expose pass skipped → `<group>/exposed`; a group label's starting weight
 *                  moved to regular → `<group>/bold kept`.
 *   stepdown/…     Segmented control, Tab and Tag, built while their glyph sat on the 1:1 rung (20 / 24 / 32), update in
 *                  place to the rung below (16 / 20 / 24, owner Q337 A, #2725): every glyph rebound and resized, every
 *                  key and id kept, current after. The expected names and px are typed here from the decision.
 *                  Mutation: the executor's bind loop skipping width and height on an existing node →
 *                  `stepdown/<id> rebound`, `stepdown/<id> verdict`.
 *   stretch/…      an axis the parent stretches (Accordion's indicator, FIXED on the host at medium and large where the
 *                  plan says AUTO): the verify and the dry run accept it alike, and both name a node nothing stretches
 *                  on that axis, or one whose stretch the host lost (#2696). Mutations in the section's own comment.
 *   overrides/…    a List built before its items carried their numbers (#2645): the dry run lists the override on
 *                  items 2 to 8 as a change and replaces nothing; Update writes each in place, every key and id kept,
 *                  and a number a designer typed is kept as a hand edit. Mutation: the in-place branch skipping the
 *                  override write → `overrides/written in place`.
 *   label/…        a Text field, Password field, Select and Textarea each built while their nested FieldLabel read at rest on
 *                  every member (#2738): the 12 disabled members read update, and Update swaps each one's label to
 *                  FieldLabel's disabled member in place, every key and label id kept. Mutation: the in-place nested
 *                  branch skipping the swap → `label/dimmed`.
 *   <row>/…, textarea/…  Checkbox.Row, Radio.Row, Switch.Row and Textarea built from their defs before #2708 (the state
 *                  props taken back out) read current under today's plans, and the apply writes nothing: the props are
 *                  code API and move no Figma member (owner Q351 A). Mutation: `figmaAnatomySet` projecting a
 *                  `disabled` prop as a Figma boolean on the label → `<row>/dry run`, `<row>/nothing written`.
 *   rows3153/…     Checkbox.Row, Radio.Row and Switch.Row built as main built them before #3153 (owner Q852, Q853 A)
 *                  take one Update in place: the option rows gain the text column (the label MOVED into it) and the
 *                  hidden description with its two properties, off by default; every key and id kept; a designer's gap
 *                  on one member's row kept and reported as a hand edit, before and after. Mutations: the description
 *                  boolean defaulting on → `rows3153/structure`, `rows3153/description`.
 *   rows3173/…     Checkbox.Row, Radio.Row and Switch.Row built before #3173 (owner Q3173 A), the medium control-to-label
 *                  gap on `space/100`, take one Update in place: only the medium members read update, and each one's
 *                  `content` gap rebinds to `space/150` (12px) while small and large keep theirs; every key and id kept,
 *                  the text column still beside the cell. Mutation: the executor skipping an in-place rebind of a node's
 *                  existing `itemSpacing` binding → `rows3173/verdict`, `rows3173/gap`.
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
import type { ComponentDef } from '@prism3/engine/component-schema';
import { ENGINE_VERSION } from '@prism3/engine/version';
import { adoptions, applyComponentPlan, respaceSets, snugSets, STAMP_KEY } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { NS } from './src/persist-figma';
import { EXECUTOR_REACH } from './src/executor-reach';
import { materializeForBrand } from './src/brand-def';
import { BASELINE_KEY } from './src/member-baseline';
import { makeShim, STYLE_FONT, type Node, type Page } from './component-shim';
import { adoptMembers, breakingLine, breakingOf, breakingSection, breakingSummary, captureBaselines, checkedSetOf, dryRunSet, hostPorts, previewLine, previewUpdate, previewVerdict, readSetView, readSingleView, type Breaking, type UpdateHost, type UpdateTarget } from './src/update-plan';
import { drawnFaults, faultLine, varsById } from './src/drawn';
import { BASELINE_V, baselineOf, resetStyleNames, snapshotMember } from './src/member-baseline';
import { applyUpdate, applyVerdict, previewHashOf, namesMember, DEPRECATED_PREFIX, RETAINED_KEY, nestedFirst, type ApplyHost } from './src/update-apply';
import { headerFor } from './src/page-header';

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
// #2666 — and the glyph a nested instance's swap override names (#2645): a real file holds the whole icon set, so the
// component an override swaps to is there, as the nested one is. Breadcrumbs' overflow step is the first such override.
const planComps = (n: { swapTarget?: string; nestTarget?: string; nestOverrides?: readonly { type: string; value: string }[]; children?: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []),
  ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.nestOverrides ?? []).filter((o) => o.type === 'INSTANCE_SWAP').map((o) => o.value),
  ...((n.children ?? []) as (typeof n)[]).flatMap(planComps),
];
type PlanNode = AnatomyPlan['root'];
const planChild = (n: PlanNode, name: string): PlanNode => n.children!.find((c) => c.name === name)!;

type World = { host: ApplyHost; api: Record<string, any>; page: Page; set: () => Node; plans: AnatomyPlan[] };
/** A fresh file holding one set, built by the executor, with identities on. `extraVars` are variables the file
 *  holds beyond the plans', for a later plan to bind. */
const world = async (id: string, plans = plansOf(id), o: { extraVars?: string[]; extraStyles?: string[]; extraComps?: string[]; varPx?: Record<string, number>; componentProps?: Record<string, Record<string, { type: string; defaultValue: string | boolean }>>; keyPrefix?: string; styleIdPrefix?: string; unavailableFonts?: { family: string; style: string }[]; refuseVersion?: boolean; allowMisses?: string[]; fileSets?: { name: string; variants: string[] }[] } = {}): Promise<World> => {
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set([...plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0', ...(o.extraVars ?? [])])],
    styles: [...new Set([...plans.flatMap((p) => planTextStyles(p.root)), ...(o.extraStyles ?? [])])],
    effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
    // A name in `fileSets` is in the file as a SET, its members under their own coordinates, so a nested instance
    // resolves by member (#2738); every other component the plans name is a plain one.
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...plans.flatMap((p) => planComps(p.root)), ...(o.extraComps ?? [])])].filter((c) => !(o.fileSets ?? []).some((x) => x.name === c)),
    fileNodes: (o.fileSets ?? []).map((x) => ({ ...x, type: 'COMPONENT_SET' as const })),
    page,
    liveRoot: true,
    identities: true,
    scaleConstrained: true,
    keyPrefix: o.keyPrefix,
    styleIdPrefix: o.styleIdPrefix,
    refuseVersion: o.refuseVersion,
    varPx: o.varPx,
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
  // What the file holds the moment the version is saved: members bound to the new gap. The host's own list is read at
  // the call, so a write before the save would show here, never in the final state.
  const gapNow = await varIdOf(w, 'space/999');
  const boundNow = (): number => membersOf(w.set()).filter((m) => (childNamed(m, 'content').boundVariables as Record<string, { id: string }>).itemSpacing?.id === gapNow).length;
  const atSave: number[] = [];
  (w.host as any).saveVersionHistoryAsync = (t: string, d?: string) => { atSave.push(boundNow()); return w.api.saveVersionHistoryAsync(t, d); };
  const { pre, res } = await confirm(w, [{ def: TAG, plans: next }]);
  ok(JSON.stringify(atSave) === '[0]' && JSON.stringify(w.api._versionNotes) === JSON.stringify([`Engine ${ENGINE_VERSION}.`]),
    `version/before first write: one save, nothing written yet (${JSON.stringify(atSave)}), description ${JSON.stringify(w.api._versionNotes)}`);
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
  ok(JSON.stringify(w.api._versions) === JSON.stringify(['Saved before Prism3 updated tag']), `version/once: one named version saved (${JSON.stringify(w.api._versions)})`);
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
  ok(JSON.stringify(w.api._versions) === JSON.stringify(['Saved before Prism3 updated the page order']), `pages/version: one named version before the move (${JSON.stringify(w.api._versions)})`);
  const again = await previewUpdate(host, targets);
  ok(!again.pages && previewVerdict(again).headline === '✓ All sets up to date', `pages/converges: the next dry run lists no page (${previewVerdict(again).headline})`);
  // A page moved by hand after the check is a different file: the confirm writes nothing.
  pages.splice(pages.indexOf(pages.find((p) => p.name === '↳ Tag')!), 1); pages.splice(3, 0, pg('↳ Tag'));
  const pre2 = await previewUpdate(host, targets);
  const tabs = pages.find((p) => p.name === '↳ Tabs')!; pages.splice(pages.indexOf(tabs), 1); pages.splice(3, 0, tabs);
  const res2 = await applyUpdate(host, w.api as any, targets, previewHashOf(pre2));
  ok(!!res2.refusedAll && !res2.reordered, `pages/hash: a page moved since the check refuses the confirm (${res2.refusedAll})`);
}

/* ── page moves ───────────────────────────────────────────────────────────────────────────────────────── */
// #2989, owner decision Q656 A: a Prism3 set still on the page an earlier taxonomy gave it (Breadcrumb Item) is listed
// by the dry run and moved by the apply onto the page the taxonomy names now, after the named version, and the page it
// leaves is reported, never deleted. Mutations: the dry run's read dropped → `moves/dry run`; the apply's move dropped →
// `moves/apply`; the moves left out of the hash → `moves/hash`.
section('page moves — a set on its former page moves to the page the taxonomy names now; no page is deleted');
{
  const w = await world(TAG);
  type K = { id: string; name: string; type: string; x: number; y: number; width: number; height: number; children?: K[]; getSharedPluginData(ns: string, k: string): string };
  type P = { name: string; isPageDivider?: boolean; children: K[]; appendChild(c: K): void; remove(): void };
  const pages: P[] = [];
  // `remove()` drops the page as Figma's `PageNode.remove` does and records the call, so `moves/apply` can fail on a deletion.
  const removed: string[] = [];
  const pg = (name: string, isPageDivider = false): P => {
    const p: P = { name, isPageDivider, children: [], appendChild(c: K) { for (const q of pages) { const i = q.children.indexOf(c); if (i >= 0) q.children.splice(i, 1); } p.children.push(c); },
      remove() { removed.push(p.name); const i = pages.indexOf(p); if (i >= 0) pages.splice(i, 1); } };
    return p;
  };
  pages.push(pg('Cover'), pg('---', true), pg('Components'), pg('↳ Breadcrumbs'), pg('---', true), pg('Subcomponents'), pg('↳ Breadcrumb Item'));
  const member: K = { id: 'bm', name: 'state=rest', type: 'COMPONENT', x: 0, y: 0, width: 10, height: 10, getSharedPluginData: (ns, k) => (ns === NS && k === STAMP_KEY ? '9.9.9|0123456789abcdef|1' : '') };
  const step: K = { id: 'bs', name: 'breadcrumb-item', type: 'COMPONENT_SET', x: 0, y: 0, width: 100, height: 40, children: [member], getSharedPluginData: () => '' };
  pages[6].children.push(step);
  const host = { ...w.host, createPage() { const p = pg(''); pages.push(p); return p; }, async loadAllPagesAsync() {},
    root: { ...w.host.root, get children() { return pages; }, insertChild(i: number, p: P) { const at = pages.indexOf(p); if (at >= 0) pages.splice(at, 1); pages.splice(i, 0, p); }, appendChild(p: P) { pages.push(p); } } } as unknown as ApplyHost;
  const targets = [{ def: TAG, plans: w.plans }];
  const pre = await previewUpdate(host, targets);
  const v = previewVerdict(pre);
  ok(JSON.stringify(pre.pageMoves) === JSON.stringify([{ set: 'breadcrumb-item', from: '↳ Breadcrumb Item', to: '↳ Breadcrumbs' }])
    && v.lines.includes('To move to its page: breadcrumb-item (Breadcrumb Item to Breadcrumbs).') && v.headline === 'Would move 1 set to its page',
    `moves/dry run: the step listed, the targeted set itself up to date (${JSON.stringify(pre.pageMoves)}; ${v.headline}; ${v.lines.join(' | ')})`);
  // A set moved by hand after the check is a different file: the confirm writes nothing.
  pages[6].children.splice(0, 1); pages[3].children.push(step);
  const refused = await applyUpdate(host, w.api as any, targets, previewHashOf(pre));
  ok(!!refused.refusedAll && !refused.relocated, `moves/hash: a set moved since the check refuses the confirm (${refused.refusedAll})`);
  pages[3].children.splice(0, 1); pages[6].children.push(step);
  const res = await applyUpdate(host, w.api as any, targets, previewHashOf(await previewUpdate(host, targets)));
  const av = applyVerdict(res);
  ok(pages[3].children.includes(step) && step.children![0] === member && removed.length === 0 && pages.length === 7 && pages[6].name === '↳ Breadcrumb Item',
    `moves/apply: the same set node now sits on Breadcrumbs, and every page is still there (${pages.map((p) => `${p.name}:${p.children.length}`).join(', ')})${removed.length ? ` — REMOVED: ${removed.join(', ')}` : ''}`);
  ok(av.headline === '✓ 1 set moved to its page' && av.lines.includes('Moved to its page: breadcrumb-item (Breadcrumb Item to Breadcrumbs).')
    && av.lines.includes('Breadcrumb Item is now empty, safe to delete.'), `moves/verdict: the move and the emptied page named (${av.headline}; ${av.lines.join(' | ')})`);
  ok(w.api._versions.length === 1 && w.api._versions[0] === 'Saved before Prism3 updated breadcrumb-item', `moves/version: one named version before the move (${JSON.stringify(w.api._versions)})`);
  const again = await previewUpdate(host, targets);
  ok(!again.pageMoves && previewVerdict(again).headline === '✓ All sets up to date', `moves/converges: the next dry run lists no move (${previewVerdict(again).headline})`);
}

/* ── table moves ──────────────────────────────────────────────────────────────────────────────────────── */
// #3171, owner decision Q3171.7 A: the Container table an earlier build drew on Primitive tokens is listed by the dry run,
// on the set moves' line, and moved by the apply onto Grids & layouts, once: the same node, every other table where it
// was, no page lost, and a second Update finds nothing to move. Mutations: the dry run's read dropped → `tables/dry run`;
// the apply's move dropped → `tables/apply`.
section('table moves — the Container table on Primitive tokens moves to Grids & layouts, once');
{
  const w = await world(TAG);
  type P = { id: string; name: string; children: F[]; appendChild(c: F): void };
  type F = { id: string; name: string; type: string; x: number; y: number; width: number; height: number; parent: P | null; data: Record<string, string>; getPluginData(k: string): string; setPluginData(k: string, v: string): void };
  const pages: P[] = [];
  const pg = (id: string, name: string): P => {
    const p: P = { id, name, children: [], appendChild(c: F) { for (const q of pages) { const i = q.children.indexOf(c); if (i >= 0) q.children.splice(i, 1); } p.children.push(c); c.parent = p; } };
    return p;
  };
  // A table as the style guide draws one: its key, a mark naming the page it was drawn on and its own id, and the rows it
  // was last written with (each row's variable name, under the group path its key ends in).
  const table = (id: string, name: string, key: string, on: P, rows: string[]): F => {
    const path = key.split('|').slice(2).join('|');
    const snapshot = Object.fromEntries(rows.map((r, i) => [`VariableID:${id}:${i}`, { name: `${path}/${r}`, values: {} }]));
    const f: F = { id, name, type: 'FRAME', x: 0, y: 0, width: 400, height: 200, parent: null,
      data: { 'prism3-style-guide': key, 'prism3-style-guide-mark': `${on.id}|${id}`, 'prism3-style-guide-rows': JSON.stringify(snapshot) },
      getPluginData(k) { return f.data[k] ?? ''; }, setPluginData(k, v) { f.data[k] = v; } };
    on.appendChild(f);
    return f;
  };
  pages.push(pg('0:1', 'Cover'), pg('0:2', '↳ Primitive tokens'), pg('0:3', '↳ Semantic tokens'), pg('0:4', '↳ Grids & layouts'));
  const KEY = 'dimension|VariableCollectionId:layout|brand/container';
  const cont = table('9:1', 'Style guide — Container', KEY, pages[1], ['max', 'narrow', 'min']);
  const dim = table('9:2', 'Style guide — Dimension', 'dimension|VariableCollectionId:core|brand/core/dimension', pages[1], ['4', '8']);
  const space = table('9:3', 'Style guide — Space', 'dimension|VariableCollectionId:space|brand/space', pages[2], ['100', '200']);
  // Each page's style-guide tables, by id: the Update draws the Cover page's own frames, which are no table.
  const census = (): string => pages.map((p) => `${p.name}:${p.children.filter((c) => !!c.data?.['prism3-style-guide']).map((c) => c.id).join('+')}`).join(', ');
  const host = { ...w.host, async loadAllPagesAsync() {}, root: { ...w.host.root, get children() { return pages; } } } as unknown as ApplyHost;
  const targets = [{ def: TAG, plans: w.plans }];
  const pre = await previewUpdate(host, targets);
  const v = previewVerdict(pre);
  ok(JSON.stringify(pre.tableMoves) === JSON.stringify([{ table: 'Style guide — Container', key: KEY, from: '↳ Primitive tokens', to: '↳ Grids & layouts' }])
    && v.lines.includes('To move to its page: Style guide — Container (Primitive tokens to Grids & layouts).') && cont.parent === pages[1],
    `tables/dry run: the Container table listed on the moves' line, nothing moved yet (${JSON.stringify(pre.tableMoves)}; ${v.lines.join(' | ')})`);
  const res = await applyUpdate(host, w.api as any, targets, previewHashOf(pre));
  const av = applyVerdict(res);
  ok(cont.parent === pages[3] && pages[3].children.length === 1 && cont.id === '9:1' && census() === 'Cover:, ↳ Primitive tokens:9:2, ↳ Semantic tokens:9:3, ↳ Grids & layouts:9:1'
    && dim.parent === pages[1] && space.parent === pages[2],
    `tables/apply: the same Container node now sits on Grids & layouts, every other table where it was, every page still there (${census()})`);
  ok(av.headline === '✓ 1 table moved to its page' && av.lines.includes('Moved to its page: Style guide — Container (Primitive tokens to Grids & layouts).') && w.api._versions.length === 1,
    `tables/verdict: the move named, after one named version (${av.headline}; ${av.lines.join(' | ')}; ${JSON.stringify(w.api._versions)})`);
  const again = await previewUpdate(host, targets);
  const res2 = await applyUpdate(host, w.api as any, targets, previewHashOf(again));
  ok(!again.tableMoves && !res2.relocatedTables && pages[3].children.length === 1 && w.api._versions.length === 1 && census() === 'Cover:, ↳ Primitive tokens:9:2, ↳ Semantic tokens:9:3, ↳ Grids & layouts:9:1',
    `tables/once: a second Update lists and moves nothing (${previewVerdict(again).headline}; ${census()})`);
}

/* ── block headers ────────────────────────────────────────────────────────────────────────────────────── */
// #3172, owner decisions Q3172.1–3, all A: the provider logos get a Size=Medium header of their own on Icons & assets,
// 80px over their block. On a file built when they had their own page, Update moves that page's header with them (the
// same node), titles it "Provider logos" while it still reads the old name or the placeholder, keeps any other text a
// designer typed, and reports the page it leaves as safe to delete, never deleting it. A second Update does nothing, and
// the header is the one a fresh build draws. Every expected value is a literal here: "Provider logos", the 80px gap, the
// shim's 120px header height and 1000px variant width, the summary copied from `provider-logo.ts`.
// Mutations, each failing the arm it names: the apply's `placeBlockHeaders` call dropped → `blocks/apply`; the dry run's
// read dropped → `blocks/dry run`, `blocks/apply`; the earlier-name rewrite (`also`) dropped → `blocks/title`; every
// Title rewritten → `blocks/designer`; the tag check in `blockHeadersDue` dropped → `blocks/idempotent`; the block's own
// header untagged → `blocks/idempotent`, `blocks/fresh lead`; `headerFor`'s block arm dropped → `blocks/fresh`; the
// blocks left in the lead header's measure → `blocks/fresh lead`; the lead's present-check counting a tagged header →
// `blocks/fresh`, `blocks/fresh lead`; the emptied former page not reported → `blocks/page kept`, `/verdict`, `/rerun`.
// The moved header left untagged → `blocks/apply`, `/idempotent`, `/rerun`, `/designer`.
section('block headers — the provider logos\' own header, moved with them from their old page, or drawn');
{
  const SUMMARY = 'A provider\'s own mark, in its own colors: sign-in, payment and social. Never retinted.';
  type K = { id: string; name: string; type: string; x: number; y: number; width: number; height: number; visible?: boolean; children?: K[]; characters?: string; fontName?: unknown;
    data?: Record<string, string>; getSharedPluginData(ns: string, k: string): string; setSharedPluginData?(ns: string, k: string, v: string): void; [k: string]: unknown };
  type P = { name: string; isPageDivider?: boolean; children: K[]; appendChild(c: K): void; remove(): void };
  const findIn = (n: K, f: (x: K) => boolean): K | null => { for (const c of n.children ?? []) { if (f(c)) return c; const d = findIn(c, f); if (d) return d; } return null; };
  const text = (name: string, characters: string): K => ({ id: `t:${name}`, type: 'TEXT', name, characters, fontName: { family: 'Inter', style: 'Regular' }, x: 0, y: 0, width: 0, height: 0, getSharedPluginData: () => '' });
  // The `_Section-header` set, one Size=Medium variant authored 1000 wide, its text the placeholder.
  const hset: K = { id: 'hset', type: 'COMPONENT_SET', name: '_Section-header', x: 0, y: 0, width: 1000, height: 120, children: [], getSharedPluginData: () => '' };
  const variant: K = { id: 'hv', type: 'COMPONENT', name: 'Size=Medium', x: 0, y: 0, width: 1000, height: 120, parent: hset,
    children: [{ ...text('Text', ''), type: 'FRAME', children: [text('Title', 'Section header'), text('Description', 'Descriptive Text')] }], getSharedPluginData: () => '' };
  variant.findOne = (f: (x: K) => boolean) => findIn(variant, f);
  hset.children!.push(variant);
  let made = 0;
  // An instance of it: 120 tall, its text and plugin data its own.
  const header = (id: string, title: string, description: string, x: number, y: number, width = 1000): K => {
    const h: K = { id, type: 'INSTANCE', name: '_Section-header', x, y, width, height: 120, data: {},
      children: [{ ...text('Text', ''), type: 'FRAME', children: [text('Title', title), text('Description', description)] }],
      componentProperties: {}, getSharedPluginData(ns, k) { return ns === NS ? h.data![k] ?? '' : ''; }, setSharedPluginData(ns, k, v) { if (ns === NS) h.data![k] = v; } };
    h.findOne = (f: (x: K) => boolean) => findIn(h, f);
    h.getMainComponentAsync = async () => variant;
    h.resize = (w: number) => { h.width = w; };
    h.setProperties = () => {};
    return h;
  };
  variant.createInstance = () => header(`new${++made}`, 'Section header', 'Descriptive Text', 0, 0);
  const comp = (id: string, name: string, x: number, y: number, width: number): K =>
    ({ id, name, type: 'COMPONENT', x, y, width, height: 24, getSharedPluginData: (ns, k) => (ns === NS && k === STAMP_KEY ? '9.9.9|0123456789abcdef|1' : '') });
  const titleOf = (h: K) => findIn(h, (n) => n.name === 'Title')!.characters;
  const descOf = (h: K) => findIn(h, (n) => n.name === 'Description')!.characters;
  const headersOn = (p: P) => p.children.filter((n) => n.type === 'INSTANCE' && n.name === '_Section-header');
  const tagged = (p: P) => headersOn(p).filter((h) => h.data?.headerFor === 'provider-logo');
  // A file of Icons & assets (the icons and their header) and, before #3148, Brand marks: the marks and their header.
  const file = async (o: { moved?: boolean; title?: string; description?: string } = {}) => {
    const w = await world(TAG);
    const pages: P[] = [];
    const removed: string[] = [];
    const pg = (name: string, isPageDivider = false): P => {
      const p: P = { name, isPageDivider, children: [], appendChild(c: K) { for (const q of pages) { const i = q.children.indexOf(c); if (i >= 0) q.children.splice(i, 1); } p.children.push(c); },
        remove() { removed.push(p.name); const i = pages.indexOf(p); if (i >= 0) pages.splice(i, 1); } };
      return p;
    };
    pages.push(pg('Cover'), pg('---', true), pg('Foundations'), pg('↳ Icons & assets'), pg('↳ Brand marks'));
    const [icons, marks] = [pages[3], pages[4]];
    icons.children.push(header('h-icon', 'Icon', 'An icon.', 0, 0), comp('i1', 'icon/check', 0, 200, 24), comp('i2', 'icon/close', 48, 200, 24));
    // Pre-#3172 Update had moved the marks, left the header (the owner's file), or nothing had moved yet.
    const logos = o.moved
      ? [comp('b1', 'provider-logo/payment/visa', 1160, 200, 54), comp('b2', 'provider-logo/logo/apple-pay', 1238, 200, 54)]
      : [comp('b1', 'brand-mark/payment/visa', 0, 200, 54), comp('b2', 'brand-mark/logo/apple-pay', 78, 200, 54)];
    (o.moved ? icons : marks).children.push(...logos);
    const old = header('h-bm', o.title ?? 'Brand marks', o.description ?? 'Descriptive Text', 0, 0);
    marks.children.push(old);
    const host = { ...w.host, createPage() { const p = pg(''); pages.push(p); return p; }, async loadAllPagesAsync() {},
      root: { ...w.host.root, get children() { return pages; }, insertChild(i: number, p: P) { const at = pages.indexOf(p); if (at >= 0) pages.splice(at, 1); pages.splice(i, 0, p); }, appendChild(p: P) { pages.push(p); },
        findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? [...w.host.root.findAllWithCriteria(c), hset] : w.host.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
    return { w, host, pages, removed, icons, marks, logos, old };
  };
  const targets = (w: Awaited<ReturnType<typeof world>>) => [{ def: TAG, plans: w.plans }];
  const update = async (f: Awaited<ReturnType<typeof file>>) => {
    const pre = await previewUpdate(f.host, targets(f.w));
    return { pre, res: await applyUpdate(f.host, f.w.api as any, targets(f.w), previewHashOf(pre)) };
  };

  // The update-in-place arm the issue asks for: the old layout with its header, then Update.
  const f = await file();
  const { pre, res } = await update(f);
  const v = previewVerdict(pre);
  ok(JSON.stringify(pre.blockHeaders) === JSON.stringify([{ def: 'provider-logo', title: 'Provider logos', page: '↳ Icons & assets', from: '↳ Brand marks' }])
    && v.lines.includes('Provider logos header: to move from Brand marks to Icons & assets.'),
    `blocks/dry run: the header on Brand marks is listed to move with the marks (${JSON.stringify(pre.blockHeaders)}; ${v.lines.join(' | ')})`);
  const av = applyVerdict(res);
  const box = { left: Math.min(...f.logos.map((m) => m.x)), top: Math.min(...f.logos.map((m) => m.y)) };
  ok(tagged(f.icons).length === 1 && tagged(f.icons)[0] === f.old && f.old.id === 'h-bm' && headersOn(f.icons).length === 2 && headersOn(f.marks).length === 0,
    `blocks/apply: exactly one provider-logos header on Icons & assets, the same node as Brand marks' (id kept), beside the icons' own, and none left on Brand marks (${f.icons.children.map((n) => n.id).join(', ')} | ${f.marks.children.map((n) => n.id).join(', ')})`);
  ok(f.old.x === box.left && f.old.y === box.top - 80 - 120 && f.old.y === 0,
    `blocks/apply place: on the block's left edge, its bottom 80px above the block, level with the icons' header (${f.old.x},${f.old.y} over ${box.left},${box.top})`);
  ok(titleOf(f.old) === 'Provider logos' && descOf(f.old) === SUMMARY, `blocks/title: "Brand marks" and the placeholder rewritten (${titleOf(f.old)} / ${descOf(f.old)})`);
  ok(f.pages.includes(f.marks) && f.removed.length === 0 && f.marks.children.length === 0 && JSON.stringify(res.emptied) === JSON.stringify(['↳ Brand marks']),
    `blocks/page kept: Brand marks is empty, still there, and reported (${JSON.stringify(res.emptied)})${f.removed.length ? ` — REMOVED: ${f.removed.join(', ')}` : ''}`);
  ok(av.lines.includes('Provider logos header: moved from Brand marks to Icons & assets.') && av.lines.includes('Brand marks is now empty, safe to delete.'),
    `blocks/verdict: the move and the emptied page named (${av.lines.join(' | ')})`);
  // The idempotence arm: a second Update finds nothing to do, and writes nothing.
  const versions = f.w.api._versions.length;
  const at = f.icons.children.map((n) => `${n.id}@${n.x},${n.y}`).join();
  const again = await update(f);
  ok(!again.pre.blockHeaders && !again.pre.pageMoves && previewVerdict(again.pre).headline === '✓ All sets up to date' && f.w.api._versions.length === versions
    && f.icons.children.map((n) => `${n.id}@${n.x},${n.y}`).join() === at && headersOn(f.icons).length === 2,
    `blocks/idempotent: a second Update lists nothing, saves no version and moves nothing (${previewVerdict(again.pre).headline}; ${JSON.stringify(again.pre.blockHeaders)})`);

  // The owner's file: an Update before #3172 had moved the marks and left the header. Running Update again fixes it.
  const g = await file({ moved: true });
  const gr = await update(g);
  ok(tagged(g.icons).length === 1 && tagged(g.icons)[0] === g.old && g.marks.children.length === 0 && JSON.stringify(gr.res.emptied) === JSON.stringify(['↳ Brand marks'])
    && applyVerdict(gr.res).headline === '✓ 1 section header placed',
    `blocks/rerun: on a file whose marks moved without their header, Update moves it now (${applyVerdict(gr.res).headline}; ${JSON.stringify(gr.res.emptied)})`);

  // The designer-edited arm: a Title and Description they typed are kept; the header still moves.
  const d = await file({ title: 'Our partners', description: 'Wallets and sign-in, as each provider draws them.' });
  await update(d);
  ok(tagged(d.icons)[0] === d.old && titleOf(d.old) === 'Our partners' && descOf(d.old) === 'Wallets and sign-in, as each provider draws them.',
    `blocks/designer: a Title and Description a designer typed are kept (${titleOf(d.old)} / ${descOf(d.old)})`);
  const s = await file({ title: 'Brand mark' });
  await update(s);
  ok(titleOf(s.old) === 'Provider logos', `blocks/title singular: "Brand mark" is the old name too, rewritten (${titleOf(s.old)})`);

  {
    const e = await file();
    e.marks.children.push({ ...comp('dz', 'Designer note', 0, 600, 100), type: 'FRAME' } as K);
    const er = await update(e);
    const nh = tagged(e.icons)[0];
    ok(e.marks.children.includes(e.old) && headersOn(e.marks).length === 1 && !e.old.data?.headerFor && !!nh && nh !== e.old
      && titleOf(nh) === 'Provider logos' && descOf(nh) === SUMMARY && !(er.res.emptied ?? []).includes('↳ Brand marks'),
      `blocks/designer page: a Brand marks page with designer content keeps its header; the logos get a new one (${e.marks.children.map((c) => c.id).join(', ')} | ${JSON.stringify(er.res.emptied)})`);
    const yy = await file(); yy.old.y = 500; yy.old.x = 333; await update(yy);
    ok(yy.old.y === 0 && yy.old.x === Math.min(...yy.logos.map((m) => m.x)), `blocks/apply place moved: the header moves from 333,500 to over the block (${yy.old.x},${yy.old.y})`);
  }

  // The fresh-build arm: the build labels Icons & assets with each def's header, logos built first. The page gets the
  // icons' header and the logos' own, and the logos' matches the one Update moved, relative to the block.
  const n = await file({ moved: true });
  n.icons.children.splice(n.icons.children.findIndex((c) => c.id === 'h-icon'), 1);
  for (const def of ['provider-logo', 'icon']) await headerFor(def, n.icons.name, componentDefs)!.label(n.host as never, n.icons as never);
  const lead = headersOn(n.icons).find((h) => !h.data?.headerFor);
  const mine = tagged(n.icons)[0];
  ok(headersOn(n.icons).length === 2 && !!mine && titleOf(mine) === 'Provider logos' && descOf(mine) === SUMMARY
    && mine.x - 1160 === f.old.x - box.left && mine.y - 200 === f.old.y - box.top && mine.width === f.old.width,
    `blocks/fresh: a fresh build draws the same header Update leaves, the same text, gap, edge and width (${mine ? `${titleOf(mine)} ${mine.x},${mine.y} ${mine.width}` : 'none'})`);
  ok(!!lead && titleOf(lead) === 'Icon' && lead.x === 0 && lead.width === 1000 && lead.y === 0,
    `blocks/fresh lead: the page's own header is placed beside it, over the icons alone (${lead ? `${titleOf(lead)} ${lead.x},${lead.y} ${lead.width}` : 'none'})`);
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

/* ── keep, every path (#2943) ───────────────────────────────────────────────────────────────────────── */
section('keep — every hand-edited path survives an update that rewrites its member\'s root (#2943, #2956)');
{
  // A checked, focus-visible checkbox: its root takes a new fill in the plan, so the member is written in place, and a
  // designer has edited three of its nodes. The ring's corners (unbound, then 0 — the reported loss) are the parent's
  // derived write: the ring pass sized, placed and re-cornered it from the host whether or not it was kept. Every
  // expected value below is typed here, never read from the plan.
  const plans = plansOf('checkbox-control');
  const w = await world('checkbox-control', plans, { extraVars: ['color/keep/changed', 'space/0', 'size/keep/glyph'] });
  const EDITED = 'selection=checked, status=default, size=medium, state=focus-visible';
  const PLAIN = 'selection=checked, status=default, size=large, state=focus-visible';
  const member = (name: string): Node => membersOf(w.set()).find((m) => m.name === name)!;
  const m = member(EDITED);
  const ring = childNamed(m, 'focusRing');
  const mark = childNamed(m, 'checkGlyph');
  const glyph = childNamed(mark, 'glyph');
  const CORNERS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
  const RED = [{ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: { r: 1, g: 0, b: 0 } }];
  const zero = await varIdOf(w, 'space/0');
  for (const c of CORNERS) { (ring.setBoundVariable as (f: string, v: null) => void)(c, null); (ring as Record<string, unknown>)[c] = 0; }
  mark.fills = JSON.parse(JSON.stringify(RED));
  (mark.setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: zero });
  // The size as a BINDING: an unbound width or height is outside the as-built record (`member-baseline.ts`), so a
  // resize by hand alone is never seen as an edit, kept or not.
  const seven = await varIdOf(w, 'size/keep/glyph');
  for (const f of ['width', 'height']) (glyph.setBoundVariable as (f: string, v: { id: string }) => void)(f, { id: seven });
  const edits = (): string => JSON.stringify({
    ring: CORNERS.map((c) => [ring[c], (ring.boundVariables as Record<string, unknown> | undefined)?.[c] ?? null]),
    fills: mark.fills,
    gap: (mark.boundVariables as Record<string, { id: string }>).itemSpacing?.id,
    size: [(glyph.boundVariables as Record<string, { id: string }>).width?.id, (glyph.boundVariables as Record<string, { id: string }>).height?.id],
  });
  const was = edits();
  ok(was === JSON.stringify({ ring: [[0, null], [0, null], [0, null], [0, null]], fills: RED, gap: zero, size: [seven, seven] }), `premise: the four hand edits are in place (${was})`);
  const plainRing = (): number[] => CORNERS.map((c) => childNamed(member(PLAIN), 'focusRing')[c] as number);
  const plainCorners = plainRing();
  ok(plainCorners.every((r) => r > 0), `premise: an unedited member's ring has round corners (${JSON.stringify(plainCorners)})`);
  const next = plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    q.root.paints = { ...(q.root.paints ?? {}), fills: 'color/keep/changed' };
    return q;
  });
  const { pre, res } = await confirm(w, [{ def: 'checkbox-control', plans: next }]);
  const listed = pre.sets[0].handEdits.filter((h) => h.member === EDITED).map((h) => h.path).sort();
  ok(JSON.stringify(listed) === JSON.stringify(['checkGlyph', 'checkGlyph/glyph', 'focusRing']), `keep/listed: the dry run lists the three edited paths (${JSON.stringify(pre.sets[0].handEdits.filter((h) => h.member === EDITED))})`);
  const o = res.outcomes[0];
  ok(o.updated.includes(EDITED), `keep/rewritten: the edited member is updated in place (${o.updated.length} updated)`);
  ok(edits() === was, `keep/byte-identical: the ring's corners, the mark's paint and binding, and the glyph's bound size are as the designer left them (${edits()})`);
  const fillVar = async (n: Node): Promise<string | undefined> => ((n.fills as { boundVariables?: { color?: { id: string } } }[])?.[0]?.boundVariables?.color?.id);
  const changed = await varIdOf(w, 'color/keep/changed');
  ok(await fillVar(m) === changed, `keep/root written: the edited member's root still takes the plan's new fill (${await fillVar(m)})`);
  ok(await fillVar(member(PLAIN)) === changed && JSON.stringify(plainRing()) === JSON.stringify(plainCorners),
    `keep/plain updated: a member with no hand edits takes the new fill, and its ring is re-cornered from its host as before (${await fillVar(member(PLAIN))}; ${JSON.stringify(plainRing())})`);
}

/* ── keep, reported (#3086) ──────────────────────────────────────────────────────────────────────────── */
section('keep, reported — a kept hand edit on a bound size is a hand edit kept, never a part not written (#3086)');
{
  // A radio whose dot a designer resized by hand: the dot's bound width and height unbound and set to 14. The run is told
  // to keep hand edits, so the dot keeps the designer's size, and the build's bound read-back finds the plan's binding
  // absent there. That is the edit kept, as asked, not a binding the host dropped. The plan gives the root a new fill so
  // the member is written in place. Every expected line below is typed here, never read from the verdict code.
  // Mutation: the kept-edit split dropped from `applySet` → `kept report/no miss`, `kept report/named`.
  const plans = plansOf('radio-control');
  const w = await world('radio-control', plans, { extraVars: ['color/keep/changed'] });
  const EDITED = 'selection=checked, status=default, size=medium, state=rest';
  const m = membersOf(w.set()).find((x) => x.name === EDITED)!;
  ok(!!m && !!childNamed(m, 'dot'), `premise: the set holds ${EDITED} with a dot`);
  const dot = childNamed(m, 'dot');
  for (const f of ['width', 'height']) (dot.setBoundVariable as (f: string, v: null) => void)(f, null);
  (dot.resize as (w: number, h: number) => void)(14, 14);
  const next = plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    q.root.paints = { ...(q.root.paints ?? {}), fills: 'color/keep/changed' };
    return q;
  });
  const { pre, res } = await confirm(w, [{ def: 'radio-control', plans: next }]);
  ok(JSON.stringify(pre.sets[0].handEdits.filter((h) => h.member === EDITED).map((h) => h.path)) === JSON.stringify(['dot']),
    `premise: the dry run lists the dot as the one hand edit (${JSON.stringify(pre.sets[0].handEdits)})`);
  const o = res.outcomes[0];
  const bv = dot.boundVariables as Record<string, unknown>;
  ok(o.updated.includes(EDITED) && !bv.width && !bv.height && dot.width === 14 && dot.height === 14,
    `premise: the member is updated in place and its dot keeps the designer's 14, unbound (${o.updated.length} updated; ${JSON.stringify([bv.width ?? null, bv.height ?? null, dot.width, dot.height])})`);
  const v = applyVerdict(res);
  ok(!v.lines.some((l) => l.includes('not written as planned')) && !o.misses.some((x) => x.includes(`${EDITED}/dot`)),
    `kept report/no miss: the kept dot is no part not written as planned (${JSON.stringify(o.misses.slice(0, 3))}; ${JSON.stringify(v.lines)})`);
  ok(v.lines[0] === 'radio-control: 60 updated in place, 1 hand edit kept (dot size).' && v.ok && v.headline === '✓ updated 60 in place',
    `kept report/named: the hand edit kept names the property it kept (${JSON.stringify(v)})`);

  // EVERY BOUND FIELD IN PLAIN WORDS (owner Q826 A): the layer name first, then the property as a designer says it, the
  // per-side fields merged into one word. The same outcome, its kept bindings replaced, read through the verdict. Each
  // family's word is typed here. Mutation: a family's word falling through to the field's key → that family's arm and
  // `kept report/no raw key`.
  const clause = (fields: string[]): string => applyVerdict({ ...res, outcomes: [{ ...o, keptBound: fields.map((field) => ({ member: EDITED, part: 'container', field })) }] }).lines[0];
  const line = (said: string): string => `radio-control: 60 updated in place, 1 hand edit kept (${said}).`;
  const families: [string, string[], string][] = [
    ['size', ['width', 'height'], 'container size'],
    ['min width', ['minWidth'], 'container min width'],
    ['min height', ['minHeight'], 'container min height'],
    ['gap', ['itemSpacing'], 'container gap'],
    ['padding', ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'], 'container padding'],
    ['border width', ['strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'], 'container border width'],
    ['corner radius', ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'], 'container corner radius'],
  ];
  for (const [family, fields, said] of families) {
    ok(clause(fields) === line(said) && fields.every((f) => clause([f]) === line(said)),
      `kept report/${family}: ${fields.join(', ')} read "${said}", once (${clause(fields)}; ${fields.map((f) => clause([f])).join(' | ')})`);
  }
  // THE FIELD LIST READ FROM THE PLANS, never typed: every field any def's plan binds (`bound`), so a field a def starts
  // binding is checked here before anyone writes its word. For each, the clause names the layer and a word, and holds no
  // key: not the field's own, and nothing camelCase.
  const planFields = new Set<string>();
  type Bn = { bound?: Record<string, string>; children?: Bn[] };
  const walk = (n: Bn): void => { for (const k of Object.keys(n.bound ?? {})) planFields.add(k); for (const c of n.children ?? []) walk(c); };
  for (const d of componentDefs) for (const p of figmaAnatomySet(d, { swapTarget: SWAP_TARGET })) walk(p.root as Bn);
  const leaked = [...planFields].map((f) => [f, clause([f])] as const)
    .filter(([f, c]) => !c.startsWith(line('container ').slice(0, -2)) || c === line('container') || c.includes(f) || /[a-z][A-Z]/.test(c));
  ok(planFields.size >= 18 && planFields.has('paddingLeft') && !leaked.length,
    `kept report/no raw key: every field the plans bind (${planFields.size}) is named in a word, no key in the clause (${JSON.stringify(leaked)})`);
}
{
  // A BINDING THE HOST DROPPED, NO HAND EDIT. Every member as built, so nothing is kept; the host accepts the dot's
  // width binding on one member and does not keep it. That is a genuine miss, and it is still reported, with its own
  // reason, the set not verified. Mutation: the kept-edit split taking every bound miss → `kept report/real discard`.
  const plans = plansOf('radio-control');
  const w = await world('radio-control', plans, { extraVars: ['color/keep/changed'] });
  const PLAIN = 'selection=checked, status=default, size=medium, state=rest';
  const dot = childNamed(membersOf(w.set()).find((x) => x.name === PLAIN)!, 'dot');
  const set = dot.setBoundVariable as (f: string, v: unknown) => void;
  (dot as Record<string, unknown>).setBoundVariable = (f: string, v: unknown): void => { set(f, f === 'width' ? null : v); };
  const next = plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    q.root.paints = { ...(q.root.paints ?? {}), fills: 'color/keep/changed' };
    return q;
  });
  const { pre, res } = await confirm(w, [{ def: 'radio-control', plans: next }]);
  ok(pre.sets[0].handEdits.length === 0, `premise: the dry run lists no hand edit (${JSON.stringify(pre.sets[0].handEdits)})`);
  const v = applyVerdict(res);
  const want = `bound ${PLAIN}/dot.width -> DISCARDED (set control/size/md/dot, not retained on the live node)`;
  ok(!v.ok && v.headline === '⚠ 1 set not verified' && v.lines.some((l) => l.includes('not written as planned') && l.includes(want))
    && res.outcomes[0].misses.includes(want) && !res.outcomes[0].keptBound && !v.lines[0].includes('hand edit'),
    `kept report/real discard: a binding the host dropped on a node no one edited is still a part not written (${JSON.stringify(v)})`);
}
{
  // A KEPT EDIT AND A DROPPED BINDING IN ONE RUN, ON TWO MEMBERS (#3086 review). One member's dot is resized by hand and
  // kept; the host drops the dot's width binding on another member no one edited. The kept edit is the first member's
  // only: the other member's dropped binding stays a part not written, the set not verified. Mutation: the split
  // matching a kept path against every member's misses, not only its own → `kept report/two members`.
  const plans = plansOf('radio-control');
  const w = await world('radio-control', plans, { extraVars: ['color/keep/changed'] });
  const EDITED = 'selection=checked, status=default, size=medium, state=rest';
  const OTHER = 'selection=checked, status=default, size=medium, state=hover';
  const members = membersOf(w.set());
  const em = members.find((x) => x.name === EDITED);
  const om = members.find((x) => x.name === OTHER);
  ok(!!em && !!childNamed(em, 'dot') && !!om && !!childNamed(om, 'dot'), `premise: the set holds ${EDITED} and ${OTHER}, each with a dot`);
  const dot = childNamed(em!, 'dot');
  for (const f of ['width', 'height']) (dot.setBoundVariable as (f: string, v: null) => void)(f, null);
  (dot.resize as (w: number, h: number) => void)(14, 14);
  const other = childNamed(om!, 'dot');
  const set = other.setBoundVariable as (f: string, v: unknown) => void;
  (other as Record<string, unknown>).setBoundVariable = (f: string, v: unknown): void => { set(f, f === 'width' ? null : v); };
  const next = plans.map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    q.root.paints = { ...(q.root.paints ?? {}), fills: 'color/keep/changed' };
    return q;
  });
  const { pre, res } = await confirm(w, [{ def: 'radio-control', plans: next }]);
  ok(JSON.stringify(pre.sets[0].handEdits.map((h) => [h.member, h.path])) === JSON.stringify([[EDITED, 'dot']]),
    `premise: the dry run lists ${EDITED}'s dot as the one hand edit (${JSON.stringify(pre.sets[0].handEdits)})`);
  const o = res.outcomes[0];
  const v = applyVerdict(res);
  const want = `bound ${OTHER}/dot.width -> DISCARDED (set control/size/md/dot, not retained on the live node)`;
  const kept = JSON.stringify((o.keptBound ?? []).map((b) => [b.member, b.part, b.field]).sort());
  ok(o.misses.includes(want) && !o.misses.some((x) => x.includes(`${EDITED}/dot`))
    && kept === JSON.stringify([[EDITED, 'dot', 'height'], [EDITED, 'dot', 'width']])
    && !v.ok && v.headline === '⚠ 1 set not verified' && v.lines.some((l) => l.includes('not written as planned') && l.includes(want)),
    `kept report/two members: ${EDITED}'s kept dot does not hide the binding the host dropped on ${OTHER}'s dot (${JSON.stringify({ misses: o.misses, keptBound: o.keptBound, v })})`);
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
  // The host throws once on the 20th member's content: the run stops there. `unlockAspectRatio` stands for the class
  // of stop (a host throw, a closed plugin window) because the executor calls it on every node and no rule catches
  // it. It was a refused `setBoundVariable` until #982 made a refused property a MISS, which no longer stops a run.
  const victim = childNamed(membersOf(w.set())[20], 'content');
  const real = victim.unlockAspectRatio as () => void;
  let armed = true;
  victim.unlockAspectRatio = () => { if (armed) { armed = false; throw new Error('in unlockAspectRatio: the host stopped'); } real.call(victim); };
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
  ok(n === 48 && [...before.members.keys()].every((k) => k.includes(`${old}=`)), `premise: the set holds ${n} members on ${old}`);
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

/* ── status ──────────────────────────────────────────────────────────────────────────────────────────── */
// #2751 (owner Q354): error left the checkbox and switch controls' STATE axis for the fields' `status` axis. A file
// built before holds `state=error` members and no `status` axis; the update must move each error member onto
// `status=error, state=rest` IN PLACE, so an instance a designer placed at error keeps pointing at the same node and
// still shows error, and give every other member `status=default`. The ledger the update reads is the engine's own
// (`COMPONENT_RENAMES`, the default); the old names, the new names and the counts are the test's own literals.
//
// WHAT "A PLACED INSTANCE KEEPS SHOWING IT" IS HERE. A Figma instance tracks its main component by id, and reads its
// variant properties off that main's name. The shim's `createInstance` copies a name descriptor rather than linking
// the node, so the instance is modelled as Figma holds it: the main's NODE, captured before the update. The proof is
// that node: still in the set, same id and key, now named at `status=error`, and still drawing the danger edge. What
// the shim cannot show is Figma's own override layer on a placed Row whose nested control was switched to error by
// hand; that instance points at the same member node, so it rides the same rename, and is named as unverified.
//
// Mutation: the two `move` entries dropped from `COMPONENT_RENAMES` → `status/<def> dry run`, `status/<def> placed`.
section('status — a control built with an error STATE moves onto the status axis in place, every placed error instance kept (#2751)');
for (const [def, errOld, errNew, n, add] of [
  ['checkbox-control', 'selection=checked, size=medium, state=error', 'selection=checked, status=error, size=medium, state=rest', 54, 36],
  ['switch-control', 'selection=on, size=medium, state=error', 'selection=on, status=error, size=medium, state=rest', 24, 16],
] as const) {
  const w = await world(def);
  const set = w.set();
  // The file as an earlier build left it: five states plus `error`, no `status` segment. Members at status=error and a
  // state other than rest did not exist; the rest-state one WAS the error member.
  (set as { children: Node[] }).children = membersOf(set).filter((m) => !/status=error/.test(String(m.name)) || /state=rest$/.test(String(m.name)));
  for (const m of membersOf(set)) {
    const nm = String(m.name);
    m.name = /status=error/.test(nm) ? nm.replace(', status=error', '').replace('state=rest', 'state=error') : nm.replace(', status=default', '');
  }
  const names = membersOf(set).map((m) => String(m.name));
  ok(names.length === n && names.includes(errOld) && !names.some((x) => x.includes('status=')),
    `premise: ${def} holds the ${n} members of the old set, ${errOld} among them, none with a status (${names.length})`);
  // THE PLACED INSTANCE: the main it points at, captured before the update. And its edge, read off the node.
  const placed = membersOf(set).find((m) => m.name === errOld)!;
  const placedId = String(placed.id), placedKey = String(placed.key);
  const vars = await w.api.variables.getLocalVariablesAsync() as { id: string; name: string }[];
  const strokeOf = (m: Node): string | undefined => {
    const box = def === 'switch-control' ? childNamed(m, 'track') ?? m : m;
    const id = ((box.strokes as { boundVariables?: { color?: { id?: string } } }[] | undefined) ?? [])[0]?.boundVariables?.color?.id;
    // The variable's path below its collection (the shim names it `<collection>/color/…`, as the host shows it).
    return vars.find((v) => v.id === id)?.name.replace(/^.*?(?=color\/)/, '');
  };
  ok(strokeOf(placed) === 'color/border/danger', `premise: the ${def} member at ${errOld} draws the danger edge (${strokeOf(placed)})`);
  const before = identityOf(set);
  const { pre, res } = await confirm(w, [{ def, plans: w.plans }]);
  const p = pre.sets[0];
  const moved = p?.renames.find((r) => r.from === errOld);
  ok(!!p && !p.blockers.length && p.counts.rename === n && p.counts.add === add && p.counts.drop === 0 && moved?.to === errNew,
    `status/${def} dry run: all ${n} renamed in place (${errOld} → ${errNew}), ${add} added, none dropped or blocked (${p ? `${p.counts.rename} renamed, ${p.counts.add} added, ${p.counts.drop} dropped; ${moved ? `${moved.from} → ${moved.to}` : 'the error member not renamed'}; ${p.blockers.join('; ') || 'no blockers'}` : 'no set'})`);
  ok(applyVerdict(res).ok && res.outcomes[0]?.renamed === n && res.outcomes[0]?.added === add,
    `status/${def} apply: ${applyVerdict(res).headline} (${res.outcomes[0]?.renamed} renamed, ${res.outcomes[0]?.added} added${res.outcomes[0]?.refused ? `; ${res.outcomes[0].refused}` : ''})`);
  const now = membersOf(w.set()).find((m) => String(m.id) === placedId);
  ok(!!now && now === placed && String(now.name) === errNew && String(now.key) === placedKey && strokeOf(now) === 'color/border/danger' && !String(now.description ?? '').startsWith(DEPRECATED_PREFIX),
    `status/${def} placed: the node a placed error instance points at is still in the set, its id and key kept, now ${errNew}, still drawing the danger edge (${now ? `${String(now.name)}, ${strokeOf(now)}` : 'gone'})`);
  const after = identityOf(w.set());
  const lost = [...before.members].filter(([, b]) => ![...after.members.values()].some((a) => a.key === b.key && a.id === b.id)).map(([nm]) => nm);
  ok(lost.length === 0 && after.members.size === n + add, `status/${def} keys: every member the file held keeps its key and id, and the set holds ${n + add} (${after.members.size}; lost ${lost.join(', ') || 'none'})`);
  const defs = w.set().componentPropertyDefinitions as Record<string, { type: string; variantOptions?: string[] }>;
  ok(JSON.stringify(defs.status?.variantOptions) === JSON.stringify(['default', 'error']) && !(defs.state?.variantOptions ?? []).includes('error'),
    `status/${def} properties: the set offers status [default, error] and no state=error (status ${JSON.stringify(defs.status?.variantOptions)}, state ${JSON.stringify(defs.state?.variantOptions)})`);
  const post = (await previewUpdate(w.host, [{ def, plans: w.plans }])).sets[0];
  ok(post?.counts.current === n + add, `status/${def} current: every member reads current after (${JSON.stringify(post?.counts)})`);
}

section('list marker column — a file built at the old 24/32/40 column updates in place to 20/24/32 for bullet and number (#2727, Q340 A)');
{
  // The file as main built it before Q340: every type's marker column at space/300, 400, 500 (24/32/40px). The
  // literals are the test's own; the plan it updates to is the engine's current one.
  const OLD: Record<string, string> = { small: 'space/300', medium: 'space/400', large: 'space/500' };
  const NEXT: Record<string, Record<string, string>> = {
    unordered: { small: 'space/250', medium: 'space/300', large: 'space/400' },
    ordered: { small: 'space/250', medium: 'space/300', large: 'space/400' },
    // #3155 (Q3155.2 A) moved the icon column to 32/40/48, so every type now updates from the pre-Q340 file.
    icon: { small: 'space/400', medium: 'space/500', large: 'space/600' },
  };
  const atOld = plansOf('list-item').map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    (planChild(q.root, 'markerBox').bound as Record<string, string>).width = OLD[q.size!];
    return q;
  });
  const w = await world('list-item', atOld, { extraVars: ['space/250', 'space/075', 'space/100', 'space/600'] });
  const typeOf = (m: Node) => /(?:^|, )type=(\w+)/.exec(String(m.name))?.[1] ?? '';
  const sizeOf = (m: Node) => /(?:^|, )size=(\w+)/.exec(String(m.name))?.[1] ?? '';
  const ids = new Map<string, string>();
  for (const v of ['space/250', 'space/300', 'space/400', 'space/500', 'space/600']) ids.set(await varIdOf(w, v), v);
  const columnOf = (m: Node) => ids.get((childNamed(m, 'markerBox').boundVariables as Record<string, { id: string }>).width?.id) ?? 'none';
  ok(membersOf(w.set()).length === 9 && membersOf(w.set()).every((m) => columnOf(m) === OLD[sizeOf(m)]),
    `premise: the 9 members carry the old column, space/300, 400, 500 by size in every type (${membersOf(w.set()).map(columnOf).join(', ')})`);
  const before = identityOf(w.set());
  const plans = plansOf('list-item');
  const { pre, res } = await confirm(w, [{ def: 'list-item', plans }]);
  const p = pre.sets[0];
  ok(!!p && !p.blockers.length && p.counts.update === 9 && p.counts.current === 0 && p.counts.add === 0 && p.counts.drop === 0,
    `list column/dry run: all 9 members to update (bullet and number to Q340 A's column, icon to #3155's), nothing added or dropped (${JSON.stringify(p?.counts)})`);
  const after = identityOf(w.set());
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  const kidsMoved = [...before.members].flatMap(([name, b]) => [...b.kids].filter(([path, id]) => after.members.get(name)?.kids.get(path) !== id).map(([path]) => `${name}/${path}`));
  ok(applyVerdict(res).ok && moved.length === 0 && kidsMoved.length === 0 && after.members.size === 9,
    `list column/in place: every member and child keeps its key and id (${applyVerdict(res).headline}; ${moved.length} members, ${kidsMoved.length} children moved)`);
  const wrong = membersOf(w.set()).filter((m) => columnOf(m) !== NEXT[typeOf(m)]?.[sizeOf(m)]).map((m) => `${m.name}: ${columnOf(m)}`);
  ok(wrong.length === 0, `list column/written: bullet and number bind space/250, 300, 400 (20/24/32px), icon space/400, 500, 600 (32/40/48px) (${wrong.slice(0, 3).join('; ')})`);
  const post = (await previewUpdate(w.host, [{ def: 'list-item', plans }])).sets[0];
  ok(post?.counts.current === 9, `list column/current: every member reads current after (${JSON.stringify(post?.counts)})`);
  // THE LIST holds nested List.Item instances and binds no column of its own, so its items show the new column from
  // their main once List.Item is updated (above); the shim's instances are stubs, so that part is Figma's and not
  // measured here. What this PR moves in the List's own plan is the nested-list code note, which the plan carries:
  // a List built with main's note updates in place to the new one, every key and id kept.
  const OLD_NOTE = 'Nested lists — a <ul> or <ol> inside an <li> indents by one marker column and uses the same size. Not drawn in Figma.';
  const listOld = plansOf('list').map((q) => JSON.parse(JSON.stringify(q).replace(/Nested lists — [^"]*?Not drawn in Figma\./g, OLD_NOTE)) as AnatomyPlan);
  ok(JSON.stringify(listOld) !== JSON.stringify(plansOf('list')), 'premise: the List built with the old nested-list note differs from the current plan');
  // Since #2683 every List plan carries per-item `nestOverrides` (each item's number), so List.Item's TEXT properties are
  // declared on the host, as in `overrides/…` below; without them the build misses every override and `world()` throws.
  const lw = await world('list', listOld, { componentProps: { 'list-item': { 'text#7:1': { type: 'TEXT', defaultValue: 'List item' }, 'number#7:2': { type: 'TEXT', defaultValue: '1.' } } } });
  const lbefore = identityOf(lw.set());
  const lplans = plansOf('list');
  const l = await confirm(lw, [{ def: 'list', plans: lplans }]);
  const lafter = identityOf(lw.set());
  const lmoved = [...lbefore.members].filter(([name, b]) => lafter.members.get(name)?.key !== b.key || lafter.members.get(name)?.id !== b.id).length;
  const lpost = (await previewUpdate(lw.host, [{ def: 'list', plans: lplans }])).sets[0];
  ok(!l.pre.sets[0].blockers.length && l.pre.sets[0].counts.add === 0 && l.pre.sets[0].counts.drop === 0 && applyVerdict(l.res).ok && lmoved === 0 && lafter.members.size === 9 && lpost?.counts.current === 9,
    `list column/List: the List set updates in place to the new note, nothing added or dropped, every member's key and id kept, all 9 current after (${JSON.stringify(l.pre.sets[0].counts)}; ${applyVerdict(l.res).headline}; ${lmoved} moved)`);
}

section('list spacing — a file built before #3155 updates in place: the wider gap, the smaller bullet, the wider icon column');
{
  // The file as main built it before #3155: List.Item's bullet bound to the radio dot (control/size/*/dot) and its icon
  // column at space/300, 400, 500 (24/32/40px); the List's item gap at space/100, 150, 200 (8/12/16px). The literals are
  // the test's own; the plans it updates to are the engine's current ones.
  const RUNG: Record<string, string> = { small: 'sm', medium: 'md', large: 'lg' };
  const OLD_ICON: Record<string, string> = { small: 'space/300', medium: 'space/400', large: 'space/500' };
  const NEW_ICON: Record<string, string> = { small: 'space/400', medium: 'space/500', large: 'space/600' };
  const NEW_BULLET: Record<string, string> = { small: 'space/075', medium: 'space/100', large: 'space/100' };
  const atMain = plansOf('list-item').map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    const type = (q.coord as Record<string, string>).type, box = planChild(q.root, 'markerBox');
    if (type === 'icon') (box.bound as Record<string, string>).width = OLD_ICON[q.size!];
    if (type === 'unordered') { const b = planChild(box, 'bullet').bound as Record<string, string>; b.width = b.height = `control/size/${RUNG[q.size!]}/dot`; }
    return q;
  });
  ok(JSON.stringify(atMain) !== JSON.stringify(plansOf('list-item')), 'premise: the List.Item built as main had it differs from the current plan');
  const w = await world('list-item', atMain, { extraVars: ['space/075', 'space/100', 'space/600'] });
  const typeOf = (m: Node) => /(?:^|, )type=(\w+)/.exec(String(m.name))?.[1] ?? '';
  const sizeOf = (m: Node) => /(?:^|, )size=(\w+)/.exec(String(m.name))?.[1] ?? '';
  const ids = new Map<string, string>();
  for (const v of ['space/075', 'space/100', 'space/250', 'space/300', 'space/400', 'space/500', 'space/600', 'control/size/sm/dot', 'control/size/md/dot', 'control/size/lg/dot']) ids.set(await varIdOf(w, v), v);
  const boundOf = (n: Node | undefined, f: string) => ids.get(((n?.boundVariables ?? {}) as Record<string, { id: string }>)[f]?.id) ?? 'none';
  const before = identityOf(w.set());
  const plans = plansOf('list-item');
  const { pre, res } = await confirm(w, [{ def: 'list-item', plans }]);
  const p = pre.sets[0];
  ok(!!p && !p.blockers.length && p.counts.update === 6 && p.counts.current === 3 && p.counts.add === 0 && p.counts.drop === 0,
    `list spacing/dry run: the 3 bullet and 3 icon members to update, the 3 number members current, nothing added or dropped (${JSON.stringify(p?.counts)})`);
  const after = identityOf(w.set());
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  const kidsMoved = [...before.members].flatMap(([name, b]) => [...b.kids].filter(([path, id]) => after.members.get(name)?.kids.get(path) !== id).map(([path]) => `${name}/${path}`));
  ok(applyVerdict(res).ok && moved.length === 0 && kidsMoved.length === 0 && after.members.size === 9,
    `list spacing/in place: every List.Item member and child keeps its key and id (${applyVerdict(res).headline}; ${moved.length} members, ${kidsMoved.length} children moved)`);
  const wrong = membersOf(w.set()).flatMap((m) => {
    const box = childNamed(m, 'markerBox'), t = typeOf(m), z = sizeOf(m);
    if (t === 'icon' && boundOf(box, 'width') !== NEW_ICON[z]) return [`${m.name}: column ${boundOf(box, 'width')}`];
    if (t === 'unordered') { const b = childNamed(box, 'bullet'); if (boundOf(b, 'width') !== NEW_BULLET[z] || boundOf(b, 'height') !== NEW_BULLET[z]) return [`${m.name}: bullet ${boundOf(b, 'width')}`]; }
    return [];
  });
  ok(wrong.length === 0, `list spacing/written: the bullet binds space/075, 100, 100 (6/8/8px) and the icon column space/400, 500, 600 (32/40/48px) (${wrong.slice(0, 3).join('; ') || 'all 9'})`);
  const post = (await previewUpdate(w.host, [{ def: 'list-item', plans }])).sets[0];
  ok(post?.counts.current === 9, `list spacing/current: every List.Item member reads current after (${JSON.stringify(post?.counts)})`);

  // THE LIST: built at main's 8/12/16 gap, on the slot and the container, it updates in place to 12/16/20.
  const OLD_GAP: Record<string, string> = { small: 'space/100', medium: 'space/150', large: 'space/200' };
  const NEW_GAP: Record<string, string> = { small: 'space/150', medium: 'space/200', large: 'space/250' };
  const listMain = plansOf('list').map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    (q.root.bound as Record<string, string>).itemSpacing = OLD_GAP[q.size!];
    (planChild(q.root, 'items').bound as Record<string, string>).itemSpacing = OLD_GAP[q.size!];
    return q;
  });
  ok(JSON.stringify(listMain) !== JSON.stringify(plansOf('list')), 'premise: the List built at the old gap differs from the current plan');
  const lw = await world('list', listMain, { extraVars: ['space/250'], componentProps: { 'list-item': { 'text#7:1': { type: 'TEXT', defaultValue: 'List item' }, 'number#7:2': { type: 'TEXT', defaultValue: '1.' } } } });
  const gids = new Map<string, string>();
  for (const v of ['space/100', 'space/150', 'space/200', 'space/250']) gids.set(await varIdOf(lw, v), v);
  const gapOf = (n: Node) => gids.get(((n.boundVariables ?? {}) as Record<string, { id: string }>).itemSpacing?.id) ?? 'none';
  ok(membersOf(lw.set()).every((m) => gapOf(childNamed(m, 'items')) === OLD_GAP[sizeOf(m)]),
    `premise: the 9 List members carry the old gap, space/100, 150, 200 by size (${membersOf(lw.set()).map((m) => gapOf(childNamed(m, 'items'))).join(', ')})`);
  const lbefore = identityOf(lw.set());
  const lplans = plansOf('list');
  const l = await confirm(lw, [{ def: 'list', plans: lplans }]);
  const lafter = identityOf(lw.set());
  const lmoved = [...lbefore.members].filter(([name, b]) => lafter.members.get(name)?.key !== b.key || lafter.members.get(name)?.id !== b.id).length;
  const lkids = [...lbefore.members].flatMap(([name, b]) => [...b.kids].filter(([path, id]) => lafter.members.get(name)?.kids.get(path) !== id)).length;
  ok(!l.pre.sets[0].blockers.length && l.pre.sets[0].counts.update === 9 && l.pre.sets[0].counts.add === 0 && l.pre.sets[0].counts.drop === 0 && applyVerdict(l.res).ok && lmoved === 0 && lkids === 0 && lafter.members.size === 9,
    `list spacing/List in place: all 9 List members updated, nothing added or dropped, every member's and child's key and id kept (${JSON.stringify(l.pre.sets[0].counts)}; ${applyVerdict(l.res).headline}; ${lmoved} members, ${lkids} children moved)`);
  const gwrong = membersOf(lw.set()).filter((m) => gapOf(m) !== NEW_GAP[sizeOf(m)] || gapOf(childNamed(m, 'items')) !== NEW_GAP[sizeOf(m)]).map((m) => `${m.name}: ${gapOf(m)}/${gapOf(childNamed(m, 'items'))}`);
  ok(gwrong.length === 0, `list spacing/gap written: the List and its items slot bind space/150, 200, 250 (12/16/20px) (${gwrong.slice(0, 3).join('; ') || 'all 9'})`);
  const lpost = (await previewUpdate(lw.host, [{ def: 'list', plans: lplans }])).sets[0];
  ok(lpost?.counts.current === 9, `list spacing/List current: every List member reads current after (${JSON.stringify(lpost?.counts)})`);
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
  ok(membersOf(w.set()).filter(large).length === 16 && membersOf(w.set()).filter(large).every((m) => sidesOf(m).every((id) => id === old)),
    'premise: the 16 large members are padded at the sides by space/300, the old 24px');
  const before = identityOf(w.set());
  const plans = plansOf('accordion');
  const { pre, res } = await confirm(w, [{ def: 'accordion', plans }]);
  const p = pre.sets[0];
  ok(!!p && !p.blockers.length && p.counts.update === 16 && p.counts.current === 32 && p.counts.add === 0 && p.counts.drop === 0,
    `accordion pad-x/dry run: the 16 large members to update, the 32 small and medium current, nothing added or dropped (${JSON.stringify(p?.counts)})`);
  const after = identityOf(w.set());
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  const kidsMoved = [...before.members].flatMap(([name, b]) => [...b.kids].filter(([path, id]) => after.members.get(name)?.kids.get(path) !== id).map(([path]) => `${name}/${path}`));
  ok(applyVerdict(res).ok && moved.length === 0 && kidsMoved.length === 0 && after.members.size === 48,
    `accordion pad-x/in place: every member and child keeps its key and id (${applyVerdict(res).headline}; ${moved.length} members, ${kidsMoved.length} children moved)`);
  const wrong = membersOf(w.set()).filter((m) => !sidesOf(m).every((id) => (large(m) ? id === next : id !== old && !!id))).map((m) => String(m.name));
  ok(wrong.length === 0, `accordion pad-x/written: the large header and open panel now bind space/250 (20px) at both sides, and no member still binds space/300 there (${wrong.slice(0, 2).join('; ')})`);
  const post = (await previewUpdate(w.host, [{ def: 'accordion', plans }])).sets[0];
  ok(post?.counts.current === 48, `accordion pad-x/current: every member reads current after (${JSON.stringify(post?.counts)})`);
}

// #3165 (owner request, Q3165.1 A): the Toast's message moved from body/md (16px) to body/sm (14px), the card took a
// floor at size/md/height, and the success glyph moved into #3153's line-box cell (the #3169 review, option a). A file
// built before holds both members with the 16px style, no floor and the glyph straight under `content`; the Update
// rewrites both in place and inserts the cell. THE FILE is reconstructed from today's def by putting those facts back
// (as `before3153` does), so the subject is the real def's projection on both sides. EXPECTED, typed here: the success
// member's `content` holding [glyphCell, message] and the cell [checkCircleGlyph], the neutral member's [message].
// Mutation: the def's message back at `type.body.md.default` → `toast 14/written`.
section('toast 14 — a Toast built with the 16px message, no floor and no glyph cell updates in place to 14px on the ladder, the glyph moved into its cell (#3165)');
{
  const now = componentDefs.find((x) => x.id === 'toast')!;
  const { 'min-height': _mh, 'glyph-cell': _gc, ...oldTokens } = now.tokens;
  const { glyphCell: _cell, ...oldParts } = now.anatomy!.parts;
  const { minHeight: _m, ...oldContainer } = oldParts.container;
  const before3165 = {
    ...now,
    tokens: { ...oldTokens, type: 'type.body.md.default' },
    anatomy: { ...now.anatomy!, parts: { ...oldParts, container: oldContainer, content: { ...oldParts.content, children: oldParts.content.children!.map((c) => (c === 'glyphCell' ? 'checkCircleGlyph' : c)) } } },
  } as ComponentDef;
  const plans = plansOf('toast');
  // The shim holds the nested Button and FlushIconButton as plain components with no `label` or `swap icon` property,
  // so the two nest overrides are misses on the build, as on the corpus arm's; the update must add none.
  const builtMisses: string[] = [];
  const w = await world('toast', figmaAnatomySet(before3165, { swapTarget: SWAP_TARGET }), {
    allowMisses: builtMisses,
    extraVars: plans.flatMap((q) => [...planBoundVars(q.root), ...planPaintVars(q.root)]),
    extraStyles: plans.flatMap((q) => planTextStyles(q.root)),
    extraComps: [...new Set(plans.flatMap((p) => planComps(p.root)))],
  });
  const kids = (n: Node | undefined): string[] => ((n?.children as Node[] | undefined) ?? []).map((c) => String(c.name));
  const messageOf = (m: Node) => childNamed(childNamed(m, 'content'), 'message');
  const floorOf = (m: Node) => (m.boundVariables as Record<string, { id: string } | undefined>)?.minHeight?.id;
  const floor = await varIdOf(w, 'size/md/height');
  const lineBox = await varIdOf(w, 'type/body/sm/line-box');
  const isSuccess = (m: Node) => /intent=success/.test(String(m.name));
  ok(membersOf(w.set()).length === 2 && membersOf(w.set()).every((m) => /body\/md\/default/.test(String(messageOf(m).textStyleId)) && !floorOf(m) && !kids(childNamed(m, 'content')).includes('glyphCell'))
    && membersOf(w.set()).filter(isSuccess).length === 1 && membersOf(w.set()).filter(isSuccess).every((m) => JSON.stringify(kids(childNamed(m, 'content'))) === '["checkCircleGlyph","message"]'),
    `premise: both Toast members hold the message at body/md/default, no floor and no glyph cell; the success glyph sits straight under content (${membersOf(w.set()).map((m) => `${String(m.name)}: [${kids(childNamed(m, 'content')).join(', ')}]`).join('; ')})`);
  const before = identityOf(w.set());
  const { pre, res } = await confirm(w, [{ def: 'toast', plans }]);
  const p = pre.sets[0];
  ok(!!p && !p.blockers.length && p.counts.update === 2 && p.counts.add === 0 && p.counts.drop === 0 && !p.replacements.length,
    `toast 14/dry run: both members to update, nothing added, dropped or replaced (${JSON.stringify(p?.counts)})`);
  const after = identityOf(w.set());
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  // KEPT, BY ID: every node a member held before is still in it, wherever it now sits; the glyph MOVED into the cell.
  const kidsLost = [...before.members].flatMap(([name, b]) => { const ids = new Set(after.members.get(name)?.kids.values() ?? []); return [...b.kids].filter(([, id]) => !ids.has(id)).map(([path]) => `${name}/${path}`); });
  const extra = res.outcomes[0].misses.filter((x) => !builtMisses.includes(x));
  ok(builtMisses.every((x) => /^(action\.nestOverrides -> label|close\.nestOverrides -> swap icon) /.test(x)) && extra.length === 0 && moved.length === 0 && kidsLost.length === 0 && after.members.size === 2,
    `toast 14/in place: every member and child keeps its key and id, adding no miss to the build's (${applyVerdict(res).headline}; ${moved.length} members moved, ${kidsLost.slice(0, 2).join(', ') || 'no child lost'}; ${extra.slice(0, 1).join('')})`);
  const glyphId = (m: Node | undefined) => m && [...(before.members.get(String(m.name))?.kids ?? [])].find(([path]) => /checkCircleGlyph/.test(path))?.[1];
  const success = membersOf(w.set()).find(isSuccess)!;
  const cell = childNamed(childNamed(success, 'content'), 'glyphCell');
  ok(JSON.stringify(kids(childNamed(success, 'content'))) === '["glyphCell","message"]' && JSON.stringify(kids(cell)) === '["checkCircleGlyph"]'
    && String(childNamed(cell, 'checkCircleGlyph').id) === glyphId(success)
    && (cell.boundVariables as Record<string, { id: string } | undefined>)?.minHeight?.id === lineBox && cell.counterAxisAlignItems === 'CENTER' && childNamed(success, 'content').counterAxisAlignItems === 'MIN'
    && membersOf(w.set()).filter((m) => !isSuccess(m)).every((m) => JSON.stringify(kids(childNamed(m, 'content'))) === '["message"]'),
    `toast 14/cell: the success member's content holds [glyphCell, message], the inserted cell centers the glyph it kept (same id) on a type/body/sm/line-box floor, content top-aligned; neutral holds [message] (${membersOf(w.set()).map((m) => `${String(m.name)}: [${kids(childNamed(m, 'content')).join(', ')}]`).join('; ')}; cell [${kids(cell).join(', ')}] ${String(cell?.counterAxisAlignItems)})`);
  const wrong = membersOf(w.set()).filter((m) => !(/body\/sm\/default/.test(String(messageOf(m).textStyleId)) && floorOf(m) === floor)).map((m) => `${String(m.name)}: ${String(messageOf(m).textStyleId)}, floor ${floorOf(m)}`);
  ok(wrong.length === 0, `toast 14/written: both members' message is body/sm/default and the card's minHeight binds size/md/height (${wrong.slice(0, 2).join('; ')})`);
  const post = (await previewUpdate(w.host, [{ def: 'toast', plans }])).sets[0];
  ok(post?.counts.current === 2, `toast 14/current: both members read current after (${JSON.stringify(post?.counts)})`);
}

section('accordion title weight — a file built with the emphasis title takes the regular one in place, and 30 members hand-edited on the header\'s padding keep it (#3180, Q-ACC1 A)');
// THE FILE: the set as main built it before #3180, its title on `label/{rung}/emphasis` (the literal is the test's own),
// and 30 of the 48 members hand-edited on the header's block padding, as the reference brand's master is. THE UPDATE:
// today's plans. EXPECTED, typed here: every member's title on `label/{rung}/default`, the 30 edited headers still holding
// the designer's padding and reported as hand edits, every member and node keeping its key and id.
// HOW A PARTLY HAND-EDITED SET UPDATES: the as-built record is per NODE, so an edit on `header` holds that node only; the
// title is its own node, untouched by the designer, so it takes the new text style on the edited members too.
// Mutation: the def's title back on `type.label.{rung}.emphasis` → `accordion weight/premise` (nothing to update).
{
  const RUNG: Record<string, string> = { small: 'sm', medium: 'md', large: 'lg' };
  const atOld = plansOf('accordion').map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    const label = planChild(planChild(planChild(planChild(q.root, 'header'), 'titleRow'), 'titleBox'), 'label') as PlanNode & { textStyle?: string };
    label.textStyle = `label/${RUNG[q.size!]}/emphasis`;
    return q;
  });
  const plans = plansOf('accordion');
  const w = await world('accordion', atOld, { extraStyles: plans.flatMap((q) => planTextStyles(q.root)), extraVars: ['space/0'] });
  const styles = new Map(((await w.api.getLocalTextStylesAsync()) as { id: string; name: string }[]).map((s) => [s.id, s.name]));
  const labelOf = (m: Node): Node => childNamed(childNamed(childNamed(childNamed(m, 'header'), 'titleRow'), 'titleBox'), 'label');
  const styleOf = (m: Node): string => String(styles.get(String(labelOf(m).textStyleId)) ?? labelOf(m).textStyleId);
  const sizeOf = (m: Node): string => /(?:^|, )size=(\w+)/.exec(String(m.name))![1];
  const members = membersOf(w.set());
  ok(members.length === 48 && members.every((m) => styleOf(m) === `label/${RUNG[sizeOf(m)]}/emphasis`) && plans.every((p) => !/emphasis/.test(JSON.stringify(p.root))),
    `accordion weight/premise: the file's 48 titles are on label/{rung}/emphasis, and today's plans name no emphasis style (${[...new Set(members.map(styleOf))].join(', ')})`);
  // The designer's edit, on 30 members: the header's block padding bound to `space/0`, a step the plan does not name there.
  const zero = await varIdOf(w, 'space/0');
  const edited = members.slice(0, 30);
  for (const m of edited) for (const f of ['paddingTop', 'paddingBottom']) (childNamed(m, 'header').setBoundVariable as (f: string, v: { id: string }) => void)(f, { id: zero });
  const before = identityOf(w.set());
  const { pre, res } = await confirm(w, [{ def: 'accordion', plans }]);
  const p = pre.sets[0];
  ok(!!p && !p.blockers.length && p.counts.update === 18 && p.counts.handEdited === 30 && p.counts.add === 0 && p.counts.drop === 0 && !p.replacements.length,
    `accordion weight/dry run: 18 members to update, 30 with a hand edit, nothing added, dropped or replaced (${JSON.stringify(p?.counts)}, ${p?.blockers.join('; ') || 'no blockers'})`);
  ok(p.handEdits.length === 30 && p.handEdits.every((h) => h.path === 'header'),
    `accordion weight/reported: the dry run reports exactly the 30 headers as hand edits (${[...new Set(p.handEdits.map((h) => h.path))].join(', ')}, ${p.handEdits.length})`);
  const after = identityOf(w.set());
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  const kidsMoved = [...before.members].flatMap(([name, b]) => [...b.kids].filter(([path, id]) => after.members.get(name)?.kids.get(path) !== id).map(([path]) => `${name}/${path}`));
  ok(applyVerdict(res).ok && moved.length === 0 && kidsMoved.length === 0 && after.members.size === 48,
    `accordion weight/in place: every member and node keeps its key and id (${applyVerdict(res).headline}; ${moved.length} members, ${kidsMoved.length} nodes moved)`);
  const offStyle = membersOf(w.set()).filter((m) => styleOf(m) !== `label/${RUNG[sizeOf(m)]}/default`).map((m) => `${String(m.name)}: ${styleOf(m)}`);
  ok(offStyle.length === 0,
    `accordion weight/written: all 48 titles now on label/{sm,md,lg}/default, the 30 hand-edited members included (${offStyle.slice(0, 2).join('; ')})`);
  const padOf = (m: Node) => ['paddingTop', 'paddingBottom'].map((f) => (childNamed(m, 'header').boundVariables as Record<string, { id: string }>)[f]?.id);
  const lostPad = edited.filter((m) => !padOf(m).every((id) => id === zero)).map((m) => String(m.name));
  const strayPad = membersOf(w.set()).slice(30).filter((m) => padOf(m).some((id) => id === zero)).map((m) => String(m.name));
  ok(lostPad.length === 0 && strayPad.length === 0 && res.outcomes[0].kept.length === 30 && res.outcomes[0].kept.every((k) => k.path === 'header'),
    `accordion weight/padding kept: the 30 edited headers keep the designer's padding and are listed as kept, and no other header took it (${lostPad.length} lost, ${strayPad.length} stray, ${res.outcomes[0].kept.length} kept)`);
  const post = (await previewUpdate(w.host, [{ def: 'accordion', plans }])).sets[0];
  ok(post.counts.current === 18 && post.handEdits.length === 30,
    `accordion weight/current: the next dry run reads the other 18 current and still reports the 30 hand edits (${JSON.stringify(post.counts)})`);
}

section('min/max — a member built under one Tag style and updated under the other has a fresh build\'s min and max sizes (#2976)');
{
  // Owner QA 2026-10-23: a file built as Pill and updated to Underline kept the pill's height and 1.5x width as plain
  // floors, so the underline tag did not hug. Both directions: Pill writes a literal `minWidth` on the container,
  // Underline binds the label row's `minHeight`, and the host leaves either behind when the plan stops setting it.
  const tagPlans = (tagStyle: string) => figmaAnatomySet(materializeForBrand(componentDefs.find((x) => x.id === TAG)!, { tagStyle } as Parameters<typeof materializeForBrand>[1]), { swapTarget: SWAP_TARGET });
  const varsOf = (plans: AnatomyPlan[]) => [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))];
  const SIZES = ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'] as const;
  const sizesUnder = (n: Node, path = '.', out = new Map<string, string>()): Map<string, string> => {
    out.set(path, SIZES.map((k) => { const v = (n as Record<string, unknown>)[k]; const bound = (n.boundVariables as Record<string, unknown> | undefined)?.[k] ? ' bound' : ''; return `${k}=${typeof v === 'number' ? Math.round(v * 100) / 100 : 'none'}${bound}`; }).join(' '));
    if (n.type !== 'INSTANCE') ((n.children ?? []) as Node[]).forEach((c) => sizesUnder(c, `${path}/${c.name}`, out));
    return out;
  };
  const differs = (a: Node, b: Node) => {
    const x = sizesUnder(a), y = sizesUnder(b);
    return [...new Set([...x.keys(), ...y.keys()])].filter((k) => x.get(k) !== y.get(k)).map((k) => `${a.name} ${k}: ${x.get(k)}, fresh ${y.get(k)}`);
  };
  for (const [from, to] of [['pill', 'underline'], ['underline', 'pill']] as const) {
    const fromPlans = tagPlans(from), toPlans = tagPlans(to);
    const w = await world(TAG, fromPlans, { extraVars: varsOf(toPlans), extraStyles: [...new Set(toPlans.flatMap((p) => planTextStyles(p.root)))] });
    const fresh = await world(TAG, toPlans, { extraVars: varsOf(fromPlans) });
    const freshOf = (m: Node) => membersOf(fresh.set()).find((f) => f.name === m.name);
    const premise = membersOf(w.set()).flatMap((m) => { const f = freshOf(m); return f ? differs(m, f) : []; });
    ok(premise.length > 0, `premise: built as ${from}, the tag's min and max sizes differ from a fresh ${to} build (${premise.length} nodes, e.g. ${premise[0]})`);
    const { res } = await confirm(w, [{ def: TAG, plans: toPlans }]);
    const off = membersOf(w.set()).flatMap((m) => { const f = freshOf(m); return f ? differs(m, f) : [`${m.name}: not in a fresh build`]; });
    ok(applyVerdict(res).ok && membersOf(w.set()).length === membersOf(fresh.set()).length && off.length === 0,
      `#2976 min/max ${from} → ${to}: every node of every member updated in place has a fresh ${to} build's minWidth, maxWidth, minHeight and maxHeight (${applyVerdict(res).headline}; ${off.length} off — ${off.slice(0, 3).join('; ') || 'none'})`);
    const post = (await previewUpdate(w.host, [{ def: TAG, plans: toPlans }])).sets[0];
    ok(post?.counts.current === membersOf(w.set()).length, `#2976 min/max ${from} → ${to}/current: a second dry run reads every member current (${JSON.stringify(post?.counts)})`);
  }
}

/* ── single ──────────────────────────────────────────────────────────────────────────────────────────── */
section('aspect lock, in place — a square slot rebuilt under aspectLock keeps only its height bound (#2343 PR 2)');
{
  // A Button clone whose leading slot was BUILT square (`size`: width and height both bound) and is then UPDATED in
  // place to the mark slot (`height` alone, `aspectLock`, `fixedPaint`). The slot's main is a live 32×20 component, so
  // the lock reads 8:5. In place, a bound width wins over the resize, so the executor unbinds both dimensions before it
  // locks; left bound, the old width would stretch the mark back to square. Expected numbers are literals (docs/34).
  // Mutation: the in-place unbind in the executor's aspectLock branch dropped → `aspect lock/in place`.
  const button = componentDefs.find((d) => d.id === 'button')!;
  const MARK = 'provider-logo/payment/visa';
  const locked = JSON.parse(JSON.stringify(button)) as ComponentDef;
  const lv = (locked.anatomy as unknown as { parts: Record<string, Record<string, unknown>> }).parts.leadingVisual;
  delete lv.size;
  Object.assign(lv, { height: 'size.{size}.icon', aspectLock: true, fixedPaint: true });
  const pick = (d: ComponentDef): AnatomyPlan[] => figmaAnatomySet(d, { swapTarget: MARK }).filter((p) => p.slots?.leading).slice(0, 4);
  const square = pick(button);
  const next = pick(locked);
  const page: Page = { children: [] };
  const all = [...square, ...next];
  const api = makeShim({
    vars: [...new Set([...all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0'])],
    styles: [...new Set(all.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(all.flatMap((p) => planEffectStyles(p.root)))],
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...all.flatMap((p) => planComps(p.root))])].filter((c) => c !== MARK),
    page, liveRoot: true, liveComponents: true, identities: true, scaleConstrained: true,
  }) as any;
  const frame = api.createFrame();
  frame.resize(32, 20);
  const mark = api.createComponentFromNode(frame);
  mark.name = MARK;
  if (!page.children.includes(mark)) page.children.push(mark);
  const built = await applyComponentPlan(square, api);
  const set = (): Node => page.children.find((n) => n.type === 'COMPONENT_SET') as Node;
  const slots = (): Node[] => {
    const out: Node[] = [];
    const walk = (n: Node): void => { if (n.name === 'leadingVisual') out.push(n); for (const c of (n.children as Node[] | undefined) ?? []) walk(c); };
    walk(set());
    return out;
  };
  const bound = (n: Node): string[] => Object.keys((n.boundVariables ?? {}) as object).filter((k) => k === 'width' || k === 'height').sort();
  ok(built.misses.length === 0 && slots().length === 4 && slots().every((n) => bound(n).join() === 'height,width'),
    `premise: 4 square slots built, width and height both bound (${slots().map((n) => bound(n).join('+')).join(' ')}; ${built.misses[0] ?? 'no miss'})`);
  const host = {
    ...api,
    root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) },
  } as unknown as ApplyHost;
  const ids = slots().map((n) => String(n.id));
  const t = { def: 'button', plans: next };
  const pre = await previewUpdate(host, [t]);
  const res = await applyUpdate(host, api, [t], previewHashOf(pre));
  const off = slots().filter((n) => {
    const r = n.targetAspectRatio as { x: number; y: number } | undefined;
    return bound(n).join() !== 'height' || !r || Math.abs(r.x / r.y - 1.6) > 1e-6;
  });
  ok(applyVerdict(res).ok && slots().length === 4 && off.length === 0,
    `aspect lock/in place: every slot updated in place is locked to its main's 8:5 with only its height bound (${applyVerdict(res).headline}; ${off.length} off${off[0] ? ` — bound ${bound(off[0]).join('+')}, ratio ${JSON.stringify(off[0].targetAspectRatio)}` : ''})`);
  ok(slots().map((n) => String(n.id)).join() === ids.join(), 'aspect lock/kept: each slot is the node it was, written in place');
}

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
  ok(pre.sets[0]?.counts.update === 46, `premise: the dry run reads all 46 icons out of date (${JSON.stringify(pre.sets[0]?.counts)})`);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const v = applyVerdict(res);
  ok(v.ok && v.headline === '✓ updated 46 in place', `single/update: ${v.headline} (${v.lines.slice(0, 2).join(' | ').slice(0, 220)})`);
  const after = new Map(w.comps().map((c) => [String(c.name), { key: String(c.key), id: String(c.id) }] as const));
  ok(after.size === 46 && [...before].every(([n, b]) => after.get(n)?.key === b.key && after.get(n)?.id === b.id), 'single/keys: every icon keeps its key and id');
  const sec = (await w.api.variables.getLocalVariablesAsync()).find((x: { name: string }) => x.name.endsWith('/color/icon/secondary')).id;
  const inked = w.comps().filter((c) => ((c.children as Node[]) ?? []).filter((k) => k.type === 'VECTOR').every((k) => (k.fills as { boundVariables?: { color?: { id: string } } }[])[0]?.boundVariables?.color?.id === sec)).length;
  ok(inked === 46, `single/written: every icon's ink is the plan's new color (${inked})`);
  const post = (await previewUpdate(w.host, [t])).sets[0];
  const markers = w.comps().filter((c) => (c.getSharedPluginData as (a: string, b: string) => string)(NS, 'memberUpdating') !== '').length;
  ok(post.counts.current === 46 && markers === 0, `single/finished: each icon is finished as a set member is, current with its marker off (${JSON.stringify(post.counts)}, ${markers} markers left)`);
}
{
  const plans = plansOf('icon');
  const w = await singleWorld(plans.filter((_, i) => i !== 5));
  const res = await applyUpdate(w.host, w.api as any, [{ def: 'icon', plans, single: true }], previewHashOf(await previewUpdate(w.host, [{ def: 'icon', plans, single: true }])));
  const at = w.comps().map((c) => `${c.x},${c.y}`);
  ok(res.outcomes[0]?.added === 1 && w.comps().length === 46 && new Set(at).size === at.length,
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
// THE PROVIDER LOGOS (#2343): single components too, and each value carries its kind, `provider-logo/payment/visa`, so a
// value with a `/` is still a member when it is one of the def's own coordinates. The icon set cannot catch a reader
// that drops one: an icon's name has no second slash. The read is asserted on every mark; the update on the square
// ones, because the shim sizes a vector from the path's numbers read as alternating x and y and misreads `H`/`V`, so
// a non-square placeholder reads back here as content drift that Figma's importer does not have.
section('single, marks — the provider logos, read and updated in place as single components (#2343)');
{
  const plans = plansOf('provider-logo');
  const w = await singleWorld(plans);
  const pre = (await previewUpdate(w.host, [{ def: 'provider-logo', plans, single: true }])).sets[0];
  ok(plans.length > 0 && pre?.counts.members === plans.length && pre.counts.add === 0 && w.comps().length === plans.length,
    `marks/read: the dry run reads every provider logo as a member, and adds none (${plans.length} planned; ${JSON.stringify(pre?.counts)})`);
}
{
  const glyphOf = (n: PlanNode): PlanNode | undefined => n.glyphSvg ? n : (n.children ?? []).map(glyphOf).find(Boolean);
  const squareAll = plansOf('provider-logo').filter((p) => { const g = glyphOf(p.root)!; return g.glyphViewBox![0] === g.glyphViewBox![1]; });
  // The shim's span sizing misreads some real outlines too (relative commands, exponents), as content drift Figma's
  // importer does not have: a first build names them, and the update runs on the rest.
  const misread = new Set((await previewUpdate((await singleWorld(squareAll)).host, [{ def: 'provider-logo', plans: squareAll, single: true }])).sets[0]?.states.map((x) => x.member) ?? []);
  const square = squareAll.filter((p) => !misread.has(`name=${p.coord.name}`));
  const MARK = 'provider/google';
  const w = await singleWorld(square);
  const t0 = { def: 'provider-logo', plans: square, single: true };
  const pre0 = (await previewUpdate(w.host, [t0])).sets[0];
  ok(square.length >= 2 && square.some((p) => p.coord.name === MARK) && pre0?.counts.current === square.length,
    `premise: every square mark reads current as built (${square.length}; ${JSON.stringify(pre0?.counts)})`);
  const before = new Map(w.comps().map((c) => [String(c.name), { key: String(c.key), id: String(c.id) }] as const));
  const next = square.map((p) => {
    if (p.coord.name !== MARK) return p;
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    const g = glyphOf(q.root)!;
    g.glyphSvg = g.glyphSvg!.replace('#4285F4', '#1A73E8');
    return q;
  });
  ok(JSON.stringify(next) !== JSON.stringify(square), 'premise: the recolor changes the plan');
  const t = { def: 'provider-logo', plans: next, single: true };
  const pre = await previewUpdate(w.host, [t]);
  ok(pre.sets[0]?.counts.update === 1 && pre.sets[0].counts.add === 0, `marks/dry run: the recolored mark is the one read out of date (${JSON.stringify(pre.sets[0]?.counts)})`);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const v = applyVerdict(res);
  ok(v.ok && res.outcomes[0]?.updated.length === 1 && res.outcomes[0].added === 0, `marks/apply: the recolor is taken in place (${v.headline}; ${JSON.stringify(res.outcomes[0]?.updated)})`);
  // The stamp alone passes with the old colors kept, so the mark's vector must carry the new fill. Mutation: the
  // fills dropped from the in-place glyph signature (`ownPaint` false) → `marks/apply: … carries the new fill`.
  const vectorsOf = (n: Node): Node[] => [...(n.type === 'VECTOR' ? [n] : []), ...((n.children as Node[]) ?? []).flatMap(vectorsOf)];
  const hexes = (n: Node): string[] => ((n.fills as { color?: { r: number; g: number; b: number } }[]) ?? [])
    .flatMap((f) => (f.color ? [[f.color.r, f.color.g, f.color.b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase()] : []));
  const marked = w.comps().find((c) => String(c.name) === `provider-logo/${MARK}`);
  const fills = marked ? vectorsOf(marked).flatMap(hexes) : [];
  ok(fills.includes('1A73E8') && !fills.includes('4285F4'),
    `marks/apply: the recolored mark's vector carries the new fill, #1A73E8, and not the old #4285F4 (${JSON.stringify(fills)})`);
  const after = new Map(w.comps().map((c) => [String(c.name), { key: String(c.key), id: String(c.id) }] as const));
  ok(after.size === square.length && [...before].every(([n, b]) => after.get(n)?.key === b.key && after.get(n)?.id === b.id), 'marks/keys: every mark keeps its key and id');
  const post = (await previewUpdate(w.host, [t])).sets[0];
  ok(post.counts.current === square.length, `marks/settled: a second dry run reads every mark current (${JSON.stringify(post.counts)})`);
}
{
  // A GLYPH THAT KEEPS ITS OWN PAINT, RECOLORED BY THE PLAN (#2343 PR 2): a provider logo whose provider changed a color
  // and not a path. Its vectors take no host ink, so the in-place glyph must compare their fills too, or the update
  // keeps the old colors under a current stamp. Built on the icon set with the ink stripped and literal fills written,
  // the shape a mark's plan has. Mutation: the fills dropped from the in-place signature → `recolor/taken`.
  const own = (plans: AnatomyPlan[], hex: string, only?: number): AnatomyPlan[] => plans.map((p, i) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    const r = q.root as unknown as Record<string, unknown>;
    delete r.descendantFills;
    if (only === undefined || only === i) r.glyphSvg = String(r.glyphSvg).replace('fill="currentColor"', `fill="#${hex}"`);
    return q;
  });
  const base = own(plansOf('icon'), '111111');
  const w = await singleWorld(base);
  const t = { def: 'icon', plans: own(plansOf('icon'), 'aa0000', 9).map((p, i) => (i === 9 ? p : base[i])), single: true };
  const pre = await previewUpdate(w.host, [t]);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const red = w.comps().filter((c) => ((c.children as Node[]) ?? []).some((k) => k.type === 'VECTOR' && Math.abs(((k.fills as { color?: { r: number } }[])?.[0]?.color?.r ?? 0) - 0xaa / 255) < 1e-6));
  ok(applyVerdict(res).ok && red.length === 1, `recolor/taken: the recolored glyph takes the new import's color, and no other changes (${red.length} red; ${applyVerdict(res).headline})`);
}
const pdOf = (n: Node, k: string): string => (n.getSharedPluginData as (a: string, b: string) => string)(NS, k);
const putPd = (n: Node, k: string, v: string): void => (n.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, k, v);
/** Each icon plan with its ink moved to `color/icon/secondary`, as `single/update` moves it. */
const reinked = (plans: AnatomyPlan[]): AnatomyPlan[] => plans.map((p) => { const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan; (q.root as unknown as Record<string, unknown>).descendantFills = 'color/icon/secondary'; return q; });
{
  // A MARK OR GLYPH REDRAWN IN ITS MAIN COMPONENT (#2343 PR 2, owner decision Q-B3 A): a brand swaps a mark by editing
  // the drawing inside `provider-logo/*` in Figma, and a rebuild must keep it. The drawing is the vectors' GEOMETRY, which
  // no node hash reads; `Baseline.art` does. Built here on the icon set, the same standalone-component path the marks
  // take. Mutations: the artwork arm of `baselineDiff` dropped → `redraw/listed`, `redraw/kept`; the kept artwork
  // laundered in `finishUpdated` → `redraw/still listed`.
  const plans = plansOf('icon');
  const w = await singleWorld(plans, ['color/icon/secondary']);
  const hit = w.comps()[7];
  const vec = ((hit.children as Node[]) ?? []).find((k) => k.type === 'VECTOR')!;
  const REDRAWN = [{ windingRule: 'NONZERO', data: 'M 2 2 L 22 2 L 22 22 L 2 22 Z' }];
  vec.vectorPaths = REDRAWN;
  const t = { def: 'icon', plans: reinked(plans), single: true };
  const pre = await previewUpdate(w.host, [t]);
  const member = `name=${String(hit.name).split('/').pop()}`;
  const listed = pre.sets[0].handEdits.filter((h) => h.member === member).map((h) => h.path);
  ok(JSON.stringify(listed) === JSON.stringify(['.']), `redraw/listed: the dry run reads the redrawn glyph as a hand edit at its frame (${JSON.stringify(listed)}; ${JSON.stringify(pre.sets[0].counts)})`);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const nowVec = ((hit.children as Node[]) ?? []).find((k) => k.type === 'VECTOR');
  ok(JSON.stringify(nowVec?.vectorPaths) === JSON.stringify(REDRAWN) && applyVerdict(res).ok,
    `redraw/kept: the update keeps the designer's drawing rather than laying a fresh import over it (${JSON.stringify(nowVec?.vectorPaths)?.slice(0, 80)}; ${applyVerdict(res).headline})`);
  const post = (await previewUpdate(w.host, [t])).sets[0];
  ok(post.handEdits.some((h) => h.member === member && h.path === '.') && post.counts.current === 45,
    `redraw/still listed: the next dry run still reports the redraw, and the other 45 read current (${JSON.stringify(post.handEdits.filter((h) => h.member === member))}; ${JSON.stringify(post.counts)})`);
  // CONTROL: an untouched glyph's artwork reads the same across a rebuild, so the arm cannot fire on every glyph.
  ok(!pre.sets[0].handEdits.some((h) => h.member !== member), `redraw/control: no other glyph reads as redrawn (${pre.sets[0].handEdits.filter((h) => h.member !== member).length})`);
}
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
  ok(post.counts.current === 45 && post.counts.current + (post.counts.update ?? 0) + (post.counts.noBaseline ?? 0) === 46 && !post.handEdits.some((h) => h.member.endsWith(String(hit.name).split('/').pop()!)),
    `recordfail/out of date: the next dry run reads it out of date, never current, the other 45 current (${JSON.stringify(post.counts)})`);
  const glyph = String(hit.name).split('/').pop();
  ok(!v.ok && v.headline === '⚠ 1 set not verified' && v.lines[0] === 'icon: 45 updated in place.'
    && v.lines.includes(`icon: 1 member not finished — name=${glyph} (its as-built record could not be written). It still reads as out of date; run the update again to finish it.`),
    `recordfail/verdict: the verdict is not a ✓, counts 45 updated and names the icon not finished (${JSON.stringify(v)})`);
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
    && !v.ok && v.headline === '⚠ 1 set not verified' && v.lines[0] === 'icon: 44 updated in place, 1 left as they are.'
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
  // FURNITURE DRAWN FOR A SET WHOSE MEMBERS WERE ALL LEFT (#2803 review): every member skipped (`noBaseline: 'skip'`
  // here) while the dry run also listed furniture. The furniture is drawn and named, but the members still hold what
  // the dry run listed, so the set is NOT UPDATED (#2364's rule), never a ✓. An outcome written out by hand, so the
  // expected lines are the test's. Mutation: the idle count skipping a set with furniture due → `idle/furniture`.
  const o = { def: 'button', set: 'button', updated: [], added: 0, renamed: 0, deprecated: [], skipped: [{ member: 'size=md', reason: 'no as-built record' }], kept: [], unrecorded: [], handEdits: 'keep' as const,
    identity: [], content: [], misses: [], furniture: { labels: 3, backdrops: 0, clear: 0 } };
  const v = applyVerdict({ outcomes: [o], refused: [], missing: [] } as any);
  ok(!v.ok && v.headline === '✗ 1 set not updated' && v.lines[0] === 'button: 3 canvas labels drawn, 1 left as they are.',
    `idle/furniture: a set whose members were all left is not updated, though its furniture was drawn (${JSON.stringify(v)})`);
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
  ok(pre.sets[0]?.counts.noBaseline === 46, `premise: the dry run reads all 46 icons with no record (${JSON.stringify(pre.sets[0]?.counts)})`);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const o = res.outcomes[0];
  const v = applyVerdict(res);
  ok(v.ok && o?.updated.length === 46 && o.unrecorded.length === 46,
    `unrecorded single/updated: by default every record-less icon is updated and named as updated without a record (${v.headline}; ${o?.updated.length} updated, ${o?.unrecorded.length} unrecorded)`);
  const sec = await varIdOf(w as unknown as World, 'color/icon/secondary');
  const inked = w.comps().filter((c) => ((c.children as Node[]) ?? []).filter((k) => k.type === 'VECTOR').every((k) => (k.fills as { boundVariables?: { color?: { id: string } } }[])[0]?.boundVariables?.color?.id === sec)).length;
  const post = (await previewUpdate(w.host, [t])).sets[0];
  ok(inked === 46 && post.counts.current === 46 && w.comps().every((c) => !!pdOf(c, BASELINE_KEY)),
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
  ok(o?.updated.length === 45 && dump() === before && JSON.stringify(o.skipped.map((x) => x.reason)) === JSON.stringify(['no as-built record']) && post.counts.noBaseline === 1,
    `unrecorded single/skip: under noBaseline 'skip' the record-less icon is left exactly as it is and named, the other 45 updated (${o?.updated.length}, ${JSON.stringify(o?.skipped)}, ${dump() === before ? 'untouched' : 'written'}; ${JSON.stringify(post.counts)})`);
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

// THE KIND RENAMES (#2343 PR 3, Q780 A, Q783 A): `card/` became `payment/` and `wallet/` became `logo/`, declared in
// COMPONENT_RENAMES. A file built before the rename holds `provider-logo/card/visa`; the reader must admit that former
// value (it has a second slash and is not a plan coordinate), so the dry run renames it in place rather than building
// a second component beside it. The old names are typed here from the ledger's decision, not read from it.
// Mutation: the ledger values dropped from `readSingleView`'s `known` → `marks/rename: dry run`.
section('single, place — a mark Update adds lands in its block, clear of the page (#3192)');
{
  // THE REFERENCE BRAND'S FAULT, REBUILT (#3192): the icon block at the page origin, the provider-logo block right of it
  // at y=144, and an Update that adds `provider/facebook-blue`. It landed at (0,0) on `icon/arrow-down`. Now it goes one
  // pitch (the widest mark plus 24, #3134) right of the end of the row that holds its kind, or into a free slot of the
  // block's own grid, overlapping no node on the page; every other component keeps its place and its id. Square marks,
  // as above, so the shim's span sizing reads no drift. Mutations: the executor as it stood before #3192 → `#3192 update
  // add` (at 0,0, over icon/arrow-down); the kind step off and the block's grid read from the page origin → `#3192 update
  // add` (outside its block).
  const glyphOf = (n: PlanNode): PlanNode | undefined => n.glyphSvg ? n : (n.children ?? []).map(glyphOf).find(Boolean);
  const MARK = 'provider/facebook-blue';
  const squareAll = plansOf('provider-logo').filter((p) => { const g = glyphOf(p.root)!; return g.glyphViewBox![0] === g.glyphViewBox![1]; });
  const misread = new Set((await previewUpdate((await singleWorld(squareAll)).host, [{ def: 'provider-logo', plans: squareAll, single: true }])).sets[0]?.states.map((x) => x.member) ?? []);
  const square = squareAll.filter((p) => !misread.has(`name=${p.coord.name}`));
  const icons = plansOf('icon');
  const w = await singleWorld(square.filter((p) => p.coord.name !== MARK), [...new Set(icons.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))]);
  const iconRun = await applyComponentPlan(icons, w.api, { emitAsComponents: true });
  const named = (pre: string): Node[] => w.comps().filter((c) => String(c.name).startsWith(pre));
  const shift = (ns: Node[], x: number, y: number): void => {
    const mx = Math.min(...ns.map((n) => Number(n.x))), my = Math.min(...ns.map((n) => Number(n.y)));
    for (const n of ns) { n.x = Number(n.x) - mx + x; n.y = Number(n.y) - my + y; }
  };
  shift(named('icon/'), 0, 0);
  shift(named('provider-logo/'), Math.max(...named('icon/').map((n) => Number(n.x) + Number(n.width))) + 2000, 144);
  const place = (): Map<string, string> => new Map(w.comps().map((c) => [String(c.name), `${c.id}@${c.x},${c.y}`] as const));
  const before = place();
  const t = { def: 'provider-logo', plans: square, single: true };
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(await previewUpdate(w.host, [t])));
  const after = place();
  const added = w.comps().find((c) => String(c.name) === `provider-logo/${MARK}`);
  const box = (n: Node) => ({ name: String(n.name), x: Number(n.x), y: Number(n.y), w: Number(n.width), h: Number(n.height) });
  const a = added ? box(added) : undefined;
  const hits = a ? w.page.children.filter((n) => n !== added).map(box).filter((o) => a.x < o.x + o.w && o.x < a.x + a.w && a.y < o.y + o.h && o.y < a.y + a.h).map((o) => o.name) : [];
  const marks = named('provider-logo/').filter((n) => n !== added).map(box);
  const pitch = Math.max(...marks.map((m) => m.w)) + 24;
  const ox = Math.min(...marks.map((m) => m.x)), oy = Math.min(...marks.map((m) => m.y));
  const kin = marks.filter((m) => m.name.startsWith('provider-logo/provider/'));
  const rowEnd = (y: number) => Math.max(...marks.filter((m) => m.y === y).map((m) => m.x));
  const besideKind = !!a && kin.some((k) => k.y === a.y) && a.x === rowEnd(a.y) + pitch;
  const inSlot = !!a && (a.x - ox) % pitch === 0 && (a.y - oy) % pitch === 0 && a.x >= ox && a.y >= oy;
  const moved = [...before].filter(([n, v]) => after.get(n) !== v).map(([n]) => n);
  ok(iconRun.misses.length === 0 && kin.length >= 2 && res.outcomes[0]?.added === 1 && !!a && (besideKind || inSlot) && hits.length === 0 && moved.length === 0,
    `#3192 update add: the mark Update adds lands ${besideKind ? 'beside its kind\'s row' : inSlot ? 'in a free slot of its block' : 'outside its block'} at ${a ? `${a.x},${a.y}` : 'nowhere'}, overlapping ${hits.length ? hits.slice(0, 3).join(', ') : 'nothing'}; ${moved.length} existing component(s) moved or re-keyed${moved.length ? ` (${moved.slice(0, 3).join(', ')})` : ''}`);
}
section('single, marks — a mark built under its former kind is renamed in place (#2343 PR 3)');
{
  // Typed from the decision: each new name and the name it had. One of each kind is renamed, picked among those the
  // shim reads clean as built (its span sizing misreads some real outlines as drift Figma's importer does not have).
  const TYPED: Record<string, string> = {
    'payment/amex': 'card/amex', 'payment/generic': 'card/generic', 'payment/mastercard': 'card/mastercard', 'payment/visa': 'card/visa',
    'logo/apple-pay': 'wallet/apple-pay-black', 'logo/google-pay': 'wallet/google-pay-black', 'logo/paypal-wordmark': 'wallet/paypal', 'logo/shop-pay': 'wallet/shop-pay',
  };
  const all = plansOf('provider-logo').filter((p) => String(p.coord.name) in TYPED);
  const misread = new Set((await previewUpdate((await singleWorld(all)).host, [{ def: 'provider-logo', plans: all, single: true }])).sets[0]?.states.map((x) => x.member) ?? []);
  const clean = all.filter((p) => !misread.has(`name=${p.coord.name}`)).map((p) => String(p.coord.name));
  const pick = ['payment/', 'logo/'].map((k) => clean.find((n) => n.startsWith(k))).filter((n): n is string => !!n);
  const plans = plansOf('provider-logo').filter((p) => [...pick, 'provider/google'].includes(String(p.coord.name)));
  const w = await singleWorld(plans);
  const FORMER: Record<string, string> = Object.fromEntries(pick.map((n) => [`provider-logo/${n}`, `provider-logo/${TYPED[n]}`]));
  for (const c of w.comps()) if (FORMER[String(c.name)]) c.name = FORMER[String(c.name)];
  const before = new Map(w.comps().map((c) => [String(c.name), { key: String(c.key), id: String(c.id) }] as const));
  ok(pick.length === 2 && plans.length === 3 && Object.values(FORMER).every((n) => before.has(n)), `premise: a payment tile and a logo sit under their former names (${[...before.keys()].join(', ')})`);
  const t = { def: 'provider-logo', plans, single: true };
  const pre = await previewUpdate(w.host, [t]);
  const c = pre.sets[0]?.counts;
  ok(c?.rename === 2 && c.add === 0 && c.members === 3, `marks/rename: dry run — the two former names read as members to rename, none to add (${JSON.stringify(c)})`);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const after = new Map(w.comps().map((x) => [String(x.name), { key: String(x.key), id: String(x.id) }] as const));
  const kept = Object.entries(FORMER).every(([now, was]) => after.get(now)?.key === before.get(was)?.key && after.get(now)?.id === before.get(was)?.id);
  ok(applyVerdict(res).ok && after.size === 3 && Object.values(FORMER).every((n) => !after.has(n)) && kept,
    `marks/rename: apply — each renamed in place to its new kind, keeping its key and id (${applyVerdict(res).headline}; ${[...after.keys()].join(', ')})`);

  // TWO HOPS (#3156 review N2): a file built before #2343 PR 3 AND #3148 holds `brand-mark/card/<x>`, which takes the
  // def rename and then the value rename, in one update. Every mark sits under the old id, so the reader finds them there.
  const w2 = await singleWorld(plans);
  const OLD2: Record<string, string> = Object.fromEntries(plans.map((p) => {
    const now = `provider-logo/${p.coord.name}`;
    return [now, `brand-mark/${TYPED[String(p.coord.name)] ?? p.coord.name}`];
  }));
  for (const x of w2.comps()) if (OLD2[String(x.name)]) x.name = OLD2[String(x.name)];
  const before2 = new Map(w2.comps().map((x) => [String(x.name), { key: String(x.key), id: String(x.id) }] as const));
  ok(Object.values(OLD2).every((n) => before2.has(n)) && [...before2.keys()].every((n) => n.startsWith('brand-mark/')),
    `premise: every mark sits under the old id, the payment tile and logo under their former kinds too (${[...before2.keys()].join(', ')})`);
  const pre2 = await previewUpdate(w2.host, [t]);
  const c2 = pre2.sets[0]?.counts;
  ok(pre2.sets[0]?.setRename?.from === 'brand-mark' && c2?.rename === 2 && c2.add === 0 && c2.members === 3,
    `marks/two hops: dry run — read under brand-mark, the two former kinds to rename, none to add (${JSON.stringify({ setRename: pre2.sets[0]?.setRename, counts: c2 })})`);
  const res2 = await applyUpdate(w2.host, w2.api as any, [t], previewHashOf(pre2));
  const after2 = new Map(w2.comps().map((x) => [String(x.name), { key: String(x.key), id: String(x.id) }] as const));
  ok(applyVerdict(res2).ok && after2.size === 3 && Object.entries(OLD2).every(([now, was]) => after2.get(now)?.key === before2.get(was)?.key && after2.get(now)?.id === before2.get(was)?.id),
    `marks/two hops: apply — \`brand-mark/card/<x>\` is \`provider-logo/payment/<x>\`, each in place, keeping its key and id (${applyVerdict(res2).headline}; ${[...after2.keys()].join(', ')})`);
}

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
  const NEW = 'tab-item';
  const planned = plansOf(NEW);
  const old = planned.map((p) => ({ ...JSON.parse(JSON.stringify(p)), component: 'tab' }) as AnatomyPlan);
  ok(planned.every((p) => p.component === NEW) && old.every((p) => p.component === 'tab'), 'premise: the plans name the set `tab-item`, and the file was built from plans naming it `tab`');
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
  const swapId = <T,>(plans: T[]): T[] => plans.map((p) => JSON.parse(JSON.stringify(p).split('"tab-item"').join('"tab"')) as T);
  const oldItem = swapId(plansOf('tab-item')), oldTabs = swapId(plansOf('tabs'));
  ok(JSON.stringify(oldTabs).includes('"nestTarget":"tab"') && !JSON.stringify(oldTabs).includes('tab-item'), 'premise: the old Tabs plans nest `tab`');
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
  const both = await previewUpdate(host, [{ def: 'tab-item', plans: plansOf('tab-item') }, { def: 'tabs', plans: plansOf('tabs') }]);
  const tabsP = both.sets.find((x) => x.set === 'tabs');
  ok(both.sets.find((x) => x.set === 'tab-item')?.setRename?.from === 'tab' && !!tabsP && !tabsP.blockers.some((b) => b.includes('tab-item')),
    `def rename, nested/together: Tab item is renamed in the run, so Tabs is not refused for lacking it (${JSON.stringify(tabsP?.blockers)})`);
  // Each nested instance's main is a member the run renames in place, so Tabs' items read as Tab item's, not the wrong set.
  const wrong = JSON.stringify(tabsP ?? null).match(/[^"]*WRONG SET[^"]*/g) ?? [];
  ok(!!tabsP && wrong.length === 0, `def rename, nested/together: Tabs' items read as instances of tab-item, with no WRONG SET line (${wrong.length}: ${wrong[0] ?? 'none'})`);
  const alone = (await previewUpdate(host, [{ def: 'tabs', plans: plansOf('tabs') }])).sets[0];
  ok(alone.blockers.some((b) => b.startsWith('Not in this file: tab-item')), `def rename, nested/alone: without Tab item in the run, Tabs is refused, naming it (${JSON.stringify(alone.blockers)})`);
}

section('def rename, single — provider logos built as `brand-mark/…` are renamed in place by one update, their nests intact (#3148)');
{
  // A file built before #3148, by the real executor from the plans as they were: the marks are `brand-mark/<kind>/<name>`
  // and the wallet button and card number field nest them under that name. One update with today's plans for all three.
  const OLD = 'brand-mark', NEW = 'provider-logo';
  const toOld = <T,>(plans: T[]): T[] => plans.map((p) => JSON.parse(JSON.stringify(p).split(NEW).join(OLD)) as T);
  const HOSTS = ['wallet-button', 'card-number-field'];
  // The shim sizes a vector from its path's numbers and misreads some real outlines, as drift Figma's importer does not
  // have (see "single, marks" above). A first build of today's marks names them; the file holds every mark, the hosts
  // nest some of those, and the verify below excuses exactly these and nothing else.
  const misread = new Set((await previewUpdate((await singleWorld(plansOf(NEW))).host, [{ def: NEW, plans: plansOf(NEW), single: true }])).sets[0]?.states.map((x) => x.member) ?? []);
  const kept = plansOf(NEW);
  const oldMarks = toOld(kept), oldHosts = HOSTS.map((id) => toOld(plansOf(id)));
  ok(oldMarks.every((p) => p.component === OLD) && JSON.stringify(oldHosts[0]).includes(`"nestTarget":"${OLD}/`) && JSON.stringify(oldHosts[1]).includes(`"swapTarget":"${OLD}/`) && !JSON.stringify(oldHosts).includes(NEW),
    'premise: the old plans name the marks `brand-mark/…`; the wallet button nests them, and the card number field\'s tile starts at one, by that name');
  const all = [...plansOf('field-label'), ...plansOf('field-message'), ...oldMarks, ...oldHosts.flat()];
  const page: Page = { children: [] };
  const api = makeShim({
    vars: [...new Set([...all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), 'space/0'])],
    styles: [...new Set(all.flatMap((p) => planTextStyles(p.root)))],
    effects: [...new Set(all.flatMap((p) => planEffectStyles(p.root)))],
    // The marks are the built ones, never stand-ins: an instance of one must point at the component the update renames.
    comps: [...new Set([SWAP_TARGET, 'focus-ring', ...all.flatMap((p) => planComps(p.root)).filter((c) => !c.startsWith(`${OLD}/`) && c !== 'field-label' && c !== 'field-message')])],
    page, liveRoot: true, identities: true, liveComponents: true, scaleConstrained: true,
  }) as any;
  const misses: string[] = [];
  // The field's own parts first, as a build places them: the card number field nests both.
  for (const id of ['field-label', 'field-message']) misses.push(...(await applyComponentPlan(plansOf(id), api)).misses);
  misses.push(...(await applyComponentPlan(oldMarks, api, { emitAsComponents: true })).misses);
  for (const plans of oldHosts) misses.push(...(await applyComponentPlan(plans, api)).misses);
  ok(misses.length === 0, `premise: the old file builds with no miss (${misses.length}: ${misses[0] ?? 'none'})`);
  const every = (types: string[]): Node[] => {
    const out: Node[] = [];
    const walk = (n: Node): void => { if (types.includes(String(n.type))) out.push(n); if (n.type !== 'INSTANCE') for (const c of (n.children as Node[] | undefined) ?? []) walk(c); };
    for (const n of page.children) walk(n);
    return out;
  };
  // The page's own nodes, and the shim's stand-ins for the other components the file holds (focus ring, the swap target).
  const host = { ...api, root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => [...new Set([...every(c.types), ...(c.types.includes('COMPONENT') ? api.root.findAllWithCriteria({ types: ['COMPONENT'] }) as Node[] : [])])] } } as unknown as ApplyHost;
  // A designer's own components under the old prefix, one in each shape (#3156 review): `<id>/<value>`, which the dry
  // run reads as a member not built by Prism3, and `<id>/<kind>/<x>`, a value no plan holds, which it never reads as a
  // member. Neither is stamped, so neither is Prism3's, and the update renames neither.
  const own = (name: string): Node => {
    const n = (api.createComponentFromNode as (n: Node) => Node)((api.createFrame as () => Node)());
    n.name = name;
    if (!page.children.includes(n)) page.children.push(n);
    return n;
  };
  const theirs = [own(`${OLD}/handmade`), own(`${OLD}/payment/zz-own`)];
  // A designer's Figma Duplicate of a shipped mark, renamed (#3156 delta review N1): the copy carries the original's
  // stamp, but its record names the original's id, so `builtByPrism3` refuses it, and the rename leaves it alone.
  const pd = (n: Node, k: string): string => (n.getSharedPluginData as (a: string, b: string) => string)(NS, k);
  const original = page.children.find((n) => n.type === 'COMPONENT' && n.name === `${OLD}/payment/visa`)!;
  const copy = own(`${OLD}/payment/visa-copy`);
  for (const k of [STAMP_KEY, BASELINE_KEY]) (copy.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, k, pd(original, k));
  ok(!!pd(copy, STAMP_KEY) && JSON.parse(pd(copy, BASELINE_KEY) || '{}').id === String(original.id) && copy.id !== original.id,
    `premise: the copy carries \`${OLD}/payment/visa\`'s stamp, and its record names that original's id, not its own`);
  const marks = (): Node[] => page.children.filter((n) => n.type === 'COMPONENT' && !theirs.includes(n) && n !== copy);
  // Every instance inside the two hosts' sets that points at a mark, as (instance id → its main component's id).
  const instancesIn = (n: Node): Node[] => [...(n.type === 'INSTANCE' ? [n] : []), ...(n.type === 'INSTANCE' ? [] : ((n.children as Node[] | undefined) ?? []).flatMap(instancesIn))];
  // Each instance in the two hosts' sets that points at a mark: instance id → its main's id, as Figma holds it.
  const hostSets = (): Node[] => page.children.filter((n) => n.type === 'COMPONENT_SET' && HOSTS.includes(String(n.name)));
  const nested = (): Map<string, string> => new Map(hostSets().flatMap(instancesIn).flatMap((i) => {
    const id = (i.mainComponent as { id?: unknown } | undefined)?.id;
    return marks().some((c) => c.id === id) ? [[String(i.id), String(id)] as const] : [];
  }));
  const beforeMarks = new Map(marks().map((c) => [String(c.id), { key: String(c.key), name: String(c.name) }] as const));
  const beforeNests = nested();
  ok(beforeMarks.size === oldMarks.length && [...beforeMarks.values()].every((m) => m.name.startsWith(`${OLD}/`)) && beforeNests.size > 0,
    `premise: the file holds ${beforeMarks.size} marks named \`${OLD}/…\`, and ${beforeNests.size} nested instances of them in the two hosts`);
  const targets: UpdateTarget[] = [{ def: NEW, plans: kept, single: true }, ...HOSTS.map((id) => ({ def: id, plans: plansOf(id) }))];
  const unclaimed = await previewUpdate(host, [targets[0]], undefined, []);
  ok(unclaimed.missing.includes(NEW), `premise: with no ledger entry the marks are not found, so an update would build a second set of them (${JSON.stringify(unclaimed.missing)})`);
  // The engine's own ledger, so the shipped entry is what is under test.
  const pre = await previewUpdate(host, targets);
  const pm = pre.sets.find((x) => x.set === NEW);
  ok(!!pm && pm.setRename?.from === OLD && pm.setRename.to === NEW && !pm.blockers.length && !pm.counts.add && !pm.counts.drop && pm.counts.members === oldMarks.length + 1,
    `def rename, single/dry run: the marks are read under '${OLD}', to be renamed '${NEW}', with nothing added or dropped (${JSON.stringify(pm ? { setRename: pm.setRename, counts: pm.counts, blockers: pm.blockers } : null)})`);
  ok(!!pm && pm.counts.unstamped === 1 && pm.unstamped.length === 1 && pm.unstamped[0].endsWith('=handmade') && !JSON.stringify(pm).includes('zz-own'),
    `def rename, single/theirs, read: \`${OLD}/handmade\` is the one member not built by Prism3, and \`${OLD}/payment/zz-own\` is no member at all (${JSON.stringify(pm ? { unstamped: pm.unstamped, count: pm.counts.unstamped } : null)})`);
  ok(!!pm && previewLine(pm).endsWith(`Renamed from ${OLD}.`), `def rename, single/line: the dry run's line says so (${pm ? previewLine(pm) : 'none'})`);
  for (const id of HOSTS) {
    const hp = pre.sets.find((x) => x.set === id);
    const wrong = JSON.stringify(hp ?? null).match(/[^"]*WRONG COMPONENT[^"]*/g) ?? [];
    ok(!!hp && !hp.blockers.length && wrong.length === 0 && !hp.counts.add && !hp.counts.drop,
      `def rename, single/${id}: not refused, and its nested marks read as the renamed ones, with no WRONG COMPONENT line (${JSON.stringify(hp?.blockers)}; ${wrong.length}: ${wrong[0] ?? 'none'})`);
  }
  const res = await applyUpdate(host, api, targets, previewHashOf(pre));
  const outOf = (id: string) => res.outcomes.find((o) => o.def === id);
  const stray = (outOf(NEW)?.content ?? []).filter((c) => ![...misread].some((m) => c.startsWith(`${m}/`)));
  ok(!!outOf(NEW) && outOf(NEW)!.updated.length === kept.length && outOf(NEW)!.added === 0 && stray.length === 0 && !outOf(NEW)!.misses.length,
    `def rename, single/verdict: every mark updated in place, none added, and no field differs but the ${misread.size} the shim misreads (${outOf(NEW)?.updated.length}; ${stray.length}: ${stray[0] ?? 'none'})`);
  for (const id of HOSTS) {
    const o = outOf(id);
    ok(!!o && !o.refused && !o.stopped && o.added === 0 && !o.content.length && !o.misses.length,
      `def rename, single/${id} verified: updated in place, every field as planned, its nested marks included (${o ? `${o.updated.length} updated; ${o.content[0] ?? o.misses[0] ?? 'clean'}` : 'no outcome'})`);
  }
  const afterMarks = new Map(marks().map((c) => [String(c.id), { key: String(c.key), name: String(c.name) }] as const));
  ok(afterMarks.size === beforeMarks.size && [...beforeMarks].every(([id, b]) => afterMarks.get(id)?.key === b.key && afterMarks.get(id)?.name === `${NEW}/${b.name.slice(OLD.length + 1)}`),
    `def rename, single/in place: the same ${afterMarks.size} components, each keeping its id and key, renamed \`${NEW}/…\`, and no duplicate (${marks().length} components; ${[...afterMarks.values()].filter((m) => !m.name.startsWith(`${NEW}/`)).map((m) => m.name).slice(0, 3).join(', ') || 'none left under the old name'})`);
  ok(JSON.stringify(theirs.map((n) => n.name)) === JSON.stringify([`${OLD}/handmade`, `${OLD}/payment/zz-own`]) && theirs.every((n) => page.children.includes(n)),
    `def rename, single/theirs, kept: a designer's own components under the old prefix keep their names (${JSON.stringify(theirs.map((n) => n.name))})`);
  ok(copy.name === `${OLD}/payment/visa-copy` && page.children.includes(copy),
    `def rename, single/copy, kept: a designer's duplicate of a stamped mark (the stamp copied, the record naming the original) keeps its name (${copy.name})`);
  const afterNests = nested();
  ok(afterNests.size === beforeNests.size && [...beforeNests].every(([i, m]) => afterNests.get(i) === m),
    `def rename, single/nests: every nested instance in the wallet button and card number field is the same node, pointing at the same mark (${afterNests.size} of ${beforeNests.size})`);
  const post = await previewUpdate(host, targets);
  const pp = post.sets.find((x) => x.set === NEW);
  ok(!!pp && !pp.setRename && !pp.counts.add && post.missing.length === 0 && pp.counts.current + misread.size === pp.counts.members,
    `def rename, single/settled: a second dry run finds the marks under '${NEW}', every one current but the shim's misreads, nothing to rename or add (${JSON.stringify(pp?.counts)})`);
}

/* ── part rename (#2759) ───────────────────────────────────────────────────────────────────────────────── */
section('part rename — a layer the ledger renames is renamed in place, keeping its id, not replaced (#2759)');
{
  // A Tag built before Q350, by the real executor from the plans as they were: the check layer was `check`.
  const planned = plansOf(TAG);
  const old = planned.map((p) => JSON.parse(JSON.stringify(p).split('"checkGlyph"').join('"check"')) as AnatomyPlan);
  ok(JSON.stringify(planned).includes('"name":"checkGlyph"') && !JSON.stringify(old).includes('checkGlyph'), 'premise: the plans name the layer `checkGlyph`, and the file was built from plans naming it `check`');
  const w = await world(TAG, old);
  const selected = (): Node[] => membersOf(w.set()).filter((m) => /selection=selected/.test(String(m.name)) && /type=select/.test(String(m.name)));
  const findIn = (n: Node, name: string): Node | undefined => {
    if (n.name === name) return n;
    if (n.type === 'INSTANCE') return undefined;
    for (const c of (n.children as Node[] | undefined) ?? []) { const f = findIn(c, name); if (f) return f; }
    return undefined;
  };
  const idsBefore = new Map(selected().map((m) => [String(m.name), String(findIn(m, 'check')?.id ?? '')] as const));
  ok(idsBefore.size === 15 && [...idsBefore.values()].every(Boolean), `premise: all 15 selected members hold a 'check' layer (${idsBefore.size})`);
  const before = identityOf(w.set());
  const unclaimed = (await previewUpdate(w.host, [{ def: TAG, plans: planned }], undefined, [])).sets[0];
  ok(unclaimed.changes.some((c) => c.field === 'children') && unclaimed.changes.some((c) => c.part.endsWith('/check') && c.to.startsWith('removed')),
    `premise: with no ledger entry the dry run removes 'check' and adds 'checkGlyph' (${JSON.stringify(unclaimed.changes.filter((c) => c.field === 'children').map((c) => [c.part, c.from, c.to])).slice(0, 240)})`);
  // The engine's own ledger, so the shipped entry is what is under test.
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: planned }]);
  const p0 = pre.sets[0];
  ok(!p0.changes.some((c) => c.field === 'children' || c.field === 'type') && !p0.replacements.length && !p0.blockers.length && p0.counts.handEdited === 0,
    `part rename/dry run: no layer is removed, added or replaced, and nothing reads as a hand edit (${JSON.stringify(p0.changes.map((c) => [c.part, c.field])).slice(0, 240)})`);
  const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: planned }], previewHashOf(pre));
  ok(applyVerdict(res).ok, `part rename/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const off = selected().filter((m) => { const n = findIn(m, 'checkGlyph'); return !n || String(n.id) !== idsBefore.get(String(m.name)) || !!findIn(m, 'check'); }).map((m) => String(m.name));
  ok(off.length === 0, `part rename/in place: on every selected member the layer is now 'checkGlyph' under the id it had as 'check' (${off.slice(0, 3).join('; ') || 'all 15'})`);
  const after = identityOf(w.set());
  ok(after.set.join() === before.set.join() && [...before.members].every(([name, b]) => after.members.get(name)?.id === b.id && after.members.get(name)?.key === b.key),
    'part rename/members: the set and every member keep their keys and ids');
  const post = (await previewUpdate(w.host, [{ def: TAG, plans: planned }])).sets[0];
  ok(post.counts.current === post.counts.members, `part rename/settled: a second dry run reads every member current (${JSON.stringify(post.counts)})`);
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

section('default member — Q347\'s three reorders reach an existing set in place: every id, key and placed instance kept (#2752)');
{
  // A SET BUILT BEFORE #2752, with the axis in its old order (typed here, the order each def held before), updated to
  // the def as it is. Figma inserts a set's top-left-most member (`ComponentSetNode.defaultVariant`), so the update has
  // to MOVE the code default's members to the top-left, and nothing else: no member rebuilt, renamed or dropped, so
  // every id and key holds and an instance placed from the old set still points at a member of it. The expected
  // default is the owner's decision, typed here, never read from the def. Mutation: the grid move dropped from the
  // apply → `default member/<def> inserted`.
  const OLD: [string, string, string[], string][] = [
    ['icon-button', 'appearance', ['filled', 'outline', 'ghost'], 'appearance=ghost'],
    ['veil', 'intensity', ['subtle', 'medium', 'strong'], 'intensity=medium'],
    ['image-placeholder', 'ratio', ['2:3', '3:4', '4:5', '1:1', '4:3', '3:2', '16:9'], 'ratio=4:3'],
  ];
  /** Figma's default variant: the top-left-most member, spatially. Topmost row first, then leftmost in it. */
  const insertedOf = (set: Node): string => String([...membersOf(set)].sort((a, b) => Number(a.y) - Number(b.y) || Number(a.x) - Number(b.x))[0]?.name);
  for (const [id, axis, old, want] of OLD) {
    const d = structuredClone(componentDefs.find((x) => x.id === id)!) as unknown as { variants: Record<string, string[]> };
    d.variants[axis] = old;
    const w = await world(id, figmaAnatomySet(d as never, { swapTarget: SWAP_TARGET }));
    const set = w.set();
    const was = insertedOf(set);
    ok(!was.split(', ').includes(want), `premise: ${id} built in the old order inserts ${was}`);
    // TWO PLACED INSTANCES, on the page beside the set: one of the member the old set inserted, one of the member the
    // new one will. Each points at the live member node, as a placed instance's main component does.
    const mainOf = (name: string): Node => membersOf(set).find((m) => String(m.name) === name)!;
    const newDefault = membersOf(set).find((m) => String(m.name).split(', ').includes(want) && String(m.name) === planComponentName(plansOf(id)[0]))!;
    const placed = [mainOf(was), newDefault].map((main, i) => {
      const inst = { type: 'INSTANCE', id: `I:${id}:${i}`, name: String(main.name), x: -500, y: 100 * i, mainComponent: main, children: [] } as unknown as Node;
      w.page.children.push(inst);
      return { inst, main, mainId: String(main.id) };
    });
    const before = identityOf(set);
    const plans = plansOf(id);
    const pre = await previewUpdate(w.host, [{ def: id, plans }]);
    const c = pre.sets[0].counts;
    ok((c.move ?? 0) > 0 && c.update + c.add + c.drop + c.rename + c.handEdited + c.noBaseline === 0,
      `default member/${id} dry run: the reorder reads as moves and nothing else (${previewLine(pre.sets[0])})`);
    const res = await applyUpdate(w.host, w.api as any, [{ def: id, plans }], previewHashOf(pre));
    const now = w.set();
    const after = identityOf(now);
    const keptIds = now === set && after.set.join() === before.set.join() && after.members.size === before.members.size
      && [...before.members].every(([k, b]) => after.members.get(k)?.id === b.id && after.members.get(k)?.key === b.key);
    ok(applyVerdict(res).ok && keptIds, `default member/${id} in place: the set and every member keep their key and id (${applyVerdict(res).headline}; ids ${keptIds ? 'kept' : 'changed'})`);
    const inserted = insertedOf(now);
    ok(inserted.split(', ').includes(want) && inserted === planComponentName(plans[0]),
      `default member/${id} inserted: after the update Figma inserts the ${want} member, the set's first plan (inserts ${inserted})`);
    const live = placed.every(({ inst, main, mainId }) => w.page.children.includes(inst) && (inst as unknown as { mainComponent: Node }).mainComponent === main
      && membersOf(now).includes(main) && String(main.id) === mainId && inst.x === -500);
    ok(live, `default member/${id} instances: both placed instances stay on the page, unmoved, each on a member still in the set with its id`);
    const next = (await previewUpdate(w.host, [{ def: id, plans }])).sets[0];
    ok(previewLine(next) === `${String(now.name)}: up to date (${after.members.size} members).`, `default member/${id} current: the next dry run reads up to date (${previewLine(next)})`);
  }
}

section('default member — #2752\'s Q1 B and Q2 A reorders reach an existing set in place: every id, key and placed instance kept');
{
  // The same proof as the section above, for the two decisions recorded on #2752 after Q347: every size ladder leads
  // with medium (Q1 B), and Button's icon slots lead with false (Q2 A). The OLD sets are built the way #2501 (Q213)
  // left them: sizes small to large and, on Button, each slot true before false. The slot order is no `variants` list,
  // so the old Button is the new plan list with each run of four slot members (trailing × leading, innermost in
  // `figmaAnatomySet`) put back in the old order: leading/trailing true/true, true/false, false/true, false/false.
  // The expected default member is the owner's decision, typed here, never read from the def. Mutation: the grid move
  // dropped from the apply → `default member/<def> inserted`.
  const OLD: [string, string[], boolean, string[]][] = [
    ['button', ['small', 'medium', 'large'], true, ['size=medium', 'leading icon=false', 'trailing icon=false']],
    ['tag', ['small', 'medium', 'large'], false, ['size=medium']],
    ['switch-control', ['small', 'medium'], false, ['size=medium']],
  ];
  const insertedOf = (set: Node): string => String([...membersOf(set)].sort((a, b) => Number(a.y) - Number(b.y) || Number(a.x) - Number(b.x))[0]?.name);
  const carries = (name: string, want: string[]): boolean => want.every((seg) => name.split(', ').includes(seg));
  for (const [id, oldSizes, slotsTrueFirst, want] of OLD) {
    const d = structuredClone(componentDefs.find((x) => x.id === id)!) as unknown as { variants: Record<string, string[]> };
    d.variants.size = oldSizes;
    let oldPlans = figmaAnatomySet(d as never, { swapTarget: SWAP_TARGET });
    if (slotsTrueFirst) {
      const OLD_SLOTS = ['leading icon=true, trailing icon=true', 'leading icon=true, trailing icon=false',
        'leading icon=false, trailing icon=true', 'leading icon=false, trailing icon=false'];
      const slotsOf = (p: (typeof oldPlans)[number]) => OLD_SLOTS.findIndex((k) => planComponentName(p).endsWith(k));
      ok(oldPlans.length % 4 === 0 && oldPlans.every((p, i) => i % 4 !== 0 || new Set(oldPlans.slice(i, i + 4).map(slotsOf)).size === 4),
        `premise: ${id}'s slot members come in runs of four, one of each slot pair (${planComponentName(oldPlans[0])})`);
      oldPlans = oldPlans.flatMap((p, i, all) => (i % 4 === 0 ? [...all.slice(i, i + 4)].sort((a, b) => slotsOf(a) - slotsOf(b)) : []));
    }
    const w = await world(id, oldPlans);
    const set = w.set();
    const was = insertedOf(set);
    ok(!carries(was, want), `premise: ${id} built in the old order inserts ${was}`);
    const mainOf = (name: string): Node => membersOf(set).find((m) => String(m.name) === name)!;
    const newDefault = membersOf(set).find((m) => carries(String(m.name), want) && String(m.name) === planComponentName(plansOf(id)[0]))!;
    ok(!!newDefault, `premise: ${id}'s old set already holds the member the update will put top-left`);
    const placed = [mainOf(was), newDefault].map((main, i) => {
      const inst = { type: 'INSTANCE', id: `I:${id}:q1q2:${i}`, name: String(main.name), x: -500, y: 100 * i, mainComponent: main, children: [] } as unknown as Node;
      w.page.children.push(inst);
      return { inst, main, mainId: String(main.id) };
    });
    const before = identityOf(set);
    const plans = plansOf(id);
    const pre = await previewUpdate(w.host, [{ def: id, plans }]);
    const c = pre.sets[0].counts;
    ok((c.move ?? 0) > 0 && c.update + c.add + c.drop + c.rename + c.handEdited + c.noBaseline === 0,
      `default member/${id} dry run: the Q1/Q2 reorder reads as moves and nothing else (${previewLine(pre.sets[0])})`);
    const res = await applyUpdate(w.host, w.api as any, [{ def: id, plans }], previewHashOf(pre));
    const now = w.set();
    const after = identityOf(now);
    const keptIds = now === set && after.set.join() === before.set.join() && after.members.size === before.members.size
      && [...before.members].every(([k, b]) => after.members.get(k)?.id === b.id && after.members.get(k)?.key === b.key);
    ok(applyVerdict(res).ok && keptIds, `default member/${id} in place (Q1/Q2): the set and every member keep their key and id (${applyVerdict(res).headline}; ids ${keptIds ? 'kept' : 'changed'})`);
    const inserted = insertedOf(now);
    ok(carries(inserted, want) && inserted === planComponentName(plans[0]),
      `default member/${id} inserted (Q1/Q2): after the update Figma inserts ${want.join(', ')}, the set's first plan (inserts ${inserted})`);
    const live = placed.every(({ inst, main, mainId }) => w.page.children.includes(inst) && (inst as unknown as { mainComponent: Node }).mainComponent === main
      && membersOf(now).includes(main) && String(main.id) === mainId && inst.x === -500);
    ok(live, `default member/${id} instances (Q1/Q2): both placed instances stay on the page, unmoved, each on a member still in the set with its id`);
    const next = (await previewUpdate(w.host, [{ def: id, plans }])).sets[0];
    ok(previewLine(next) === `${String(now.name)}: up to date (${after.members.size} members).`, `default member/${id} current (Q1/Q2): the next dry run reads up to date (${previewLine(next)})`);
  }
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
  // The button family on one page, built as a fresh file would be: 160 apart (`SET_GAP`, #2723; these sets carry no
  // furniture, so frame to frame). Then laid out as the #2502 rule built them, 400 frame to frame, with a note of the
  // designer's own (a frame Prism3 didn't build) on the page. The set's `parent` is the page, as on the host (the shim
  // leaves it unset). Mutations: the set-move pass dropped from the dry run and the apply → `page/set moves`,
  // `page/converges`; the old rule's spot not recognized → the same.
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
  // The #2502 spacing: each later set 400 right of the one before.
  for (let k = 1; k < sets.length; k++) sets[k].x = Number(sets[k - 1].x) + Number(sets[k - 1].width) + 400;
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
    `page/set moves: on a page laid out under the old 400 rule, the dry run moves the 2 later sets and nothing else (${JSON.stringify(moving)}; ${v.headline}; ${previewLine(pre.sets[1])})`);
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
  // put as an obstacle the later set goes around, never jumps over. Squeezed to 100 apart, too close, with the note
  // moved into the row: 0..864, then 1024 and 2048.
  const squeeze = (): void => { for (let k = 1; k < sets.length; k++) sets[k].x = Number(sets[k - 1].x) + Number(sets[k - 1].width) + 100; };
  squeeze();
  note.x = 9000; note.y = 0;
  const pre2 = await previewUpdate(host, targets);
  ok(JSON.stringify(pre2.sets.map((p) => p.setMove?.to ?? null)) === JSON.stringify([null, { x: 1024, y: 0 }, { x: 2048, y: 0 }]),
    `page/in order: a note far right in the row pulls no set past it; the sets take the fresh spacing (${JSON.stringify(pre2.sets.map((p) => p.setMove?.to ?? null))})`);
  const neutral = sets[2];
  const stampsWas = membersOf(neutral).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY));
  for (const m of membersOf(neutral)) (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, '');
  neutral.x = 1700;
  const pre3 = await previewUpdate(host, targets.slice(0, 2));
  // button at 0..864; the unbuilt set at 1700..2564; button-destructive would sit at 1024..1888, which overlaps it, so it
  // goes past it: 2564 + 160 = 2724. The unbuilt set never moves.
  await applyUpdate(host, api, targets.slice(0, 2), previewHashOf(pre3));
  ok(pre3.sets[1]?.setMove?.to.x === 2724 && Number(sets[1].x) === 2724 && Number(neutral.x) === 1700,
    `page/around: a set Prism3 didn't build stays put, and the set that would overlap it goes just past it, in the dry run and the apply (${JSON.stringify(pre3.sets[1]?.setMove ?? null)}; applied at ${sets[1].x}; the unbuilt set at ${neutral.x})`);
  membersOf(neutral).forEach((m, k) => (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, stampsWas[k]));
  note.x = 0; note.y = 6000;
  // SCOPED TO ONE DEF, the page does not take part: the update reads one of its three sets, so it moves none.
  squeeze();
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
  // than a fresh build's 160, or at the old rule's 400 (#2723), and then to exactly 160. Each laid out by hand here,
  // button at 0..864.
  const movesOf = async () => (await previewUpdate(host, targets)).sets.map((p) => p.setMove?.to ?? null);
  // Spaced wider than a fresh build: 600 apart. Nothing moves. Mutation: the "only when too close" check removed → this.
  sets[1].x = 864 + 600; sets[2].x = sets[1].x + 864 + 600;
  const wider = await movesOf();
  ok(JSON.stringify(wider) === JSON.stringify([null, null, null]),
    `page/wider: sets a designer spaced wider than a fresh build (600 apart) stay exactly where they are (${JSON.stringify(wider)})`);
  // A second row: button-neutral below the first row (its top under the first row's 3480), its x inside button's span.
  // It has no Prism3 set to its left in its own row, so it stays; button-destructive, 100 from button, still moves.
  // Mutation: the left neighbour taken from any row, not the set's own → this.
  sets[1].x = 864 + 100; sets[2].x = 300; sets[2].y = 4000;
  const rows = await movesOf();
  ok(JSON.stringify(rows) === JSON.stringify([null, { x: 1024, y: 0 }, null]),
    `page/second row: a set in a second row below the first stays where it is, never lifted into the first; the too-close set in the first row still moves (${JSON.stringify(rows)})`);
  sets[2].y = 0;
  // Too close by a little, 100 apart: it moves to exactly 160 clear (1024), no further, and the set beyond it, already
  // 812 clear of where it lands (and 872 from where it was, not the old rule's 400), stays. Mutation: the move sent
  // past a fixed step rather than to `SET_GAP` → this.
  sets[1].x = 864 + 100; sets[2].x = 2700;
  const enough = await movesOf();
  ok(JSON.stringify(enough) === JSON.stringify([null, { x: 1024, y: 0 }, null]),
    `page/just enough: a set 100 from its neighbour moves just far enough to sit 160 clear (1024), and the one beyond, already clear, stays (${JSON.stringify(enough)})`);
  // NEVER ONTO A SET THAT STAYS (the UI lane's repro on #2548): button at 0, button-destructive at 960 (96 clear, too
  // close), a frame of the designer's at 1800..1900, button-neutral at 1920 (1056 clear of button, so it stays). Pushed
  // past the frame alone, button-destructive would land at 2060, over button-neutral (1920..2784); it goes past that set
  // too, to 2784 + 160 = 2944. Read after the APPLY, from the page: no two nodes in the row overlap. Mutation: the
  // obstacle push reading only the nodes Prism3 didn't build → this, and `page/respace onto a set` below.
  const post = { type: 'FRAME', name: 'my post-it', x: 1800, y: 0, width: 100, height: 200, children: [] } as unknown as Node;
  page.children.push(post);
  sets[1].x = 960; sets[2].x = 1920;
  const pre5 = await previewUpdate(host, targets);
  await applyUpdate(host, api, targets, previewHashOf(pre5));
  const row = page.children.filter((n) => n.type === 'COMPONENT_SET' || n === post) as Node[];
  const box = (n: Node) => [Number(n.x), Number(n.y), Number(n.width), Number(n.height)];
  const over = row.flatMap((a, i) => row.slice(i + 1).filter((b) => { const [ax, ay, aw, ah] = box(a), [bx, by, bw, bh] = box(b); return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }).map((b) => `${a.name} over ${b.name}`));
  ok(over.length === 0 && Number(sets[1].x) === 2944 && Number(sets[2].x) === 1920 && Number(post.x) === 1800,
    `page/never onto a set: a set pushed past a frame of the designer's goes past the Prism3 set that stays there too (2944), and after the apply no two nodes in the row overlap (${over.join(', ') || 'none overlap'}; at ${JSON.stringify(sets.map((st) => Number(st.x)))}; the frame at ${post.x})`);
  page.children.splice(page.children.indexOf(post), 1);
  // A SET WHOSE ONLY STAMPS ARE NOT PRISM3'S is a designer's set, by the members' shared test (`builtByPrism3`, #2510),
  // so it stays put as an obstacle and does not hold the page still as a set the update didn't read. button-neutral at
  // 1700, read by neither update: first every stamp malformed, then a single valid stamp copied with its record from
  // another member (a Duplicate), the rest blank. Either way button-destructive goes around it, to 2724. Mutation: the
  // set-level check reading "any member has a stamp" again → this.
  const nm = membersOf(neutral);
  const pdOfM = (m: Node, k: string): string => (m.getSharedPluginData as (a: string, b: string) => string)(NS, k);
  const putM = (m: Node, k: string, v: string): void => (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, k, v);
  const was6 = nm.map((m) => [pdOfM(m, STAMP_KEY), pdOfM(m, BASELINE_KEY)]);
  const around = async (): Promise<number | null> => { sets[1].x = 864 + 100; neutral.x = 1700; return (await previewUpdate(host, targets.slice(0, 2))).sets[1]?.setMove?.to.x ?? null; };
  for (const m of nm) putM(m, STAMP_KEY, 'not a stamp');
  const malformed = await around();
  nm.forEach((m, k) => putM(m, STAMP_KEY, k === 1 ? was6[0][0] : ''));
  putM(nm[1], BASELINE_KEY, was6[0][1]);
  const copied = await around();
  nm.forEach((m, k) => { putM(m, STAMP_KEY, was6[k][0]); putM(m, BASELINE_KEY, was6[k][1]); });
  ok(malformed === 2724 && copied === 2724,
    `page/not ours by its stamps: a set whose stamps are all malformed, or whose one stamp is a copy, is a designer's set the moving set goes around (malformed → ${malformed}, copied → ${copied}; want 2724 each)`);
}

/* ── sets beside a wide page header go below it (#2802, owner decision Q379 A) ───────────────────────────── */
// LIVE (#2802): on a Checkbox page whose `_section-header` (0, -232, 2517 × 125) is wider than its sets, an earlier
// build had put `checkbox-control` 160 right of the header, at the header's `y`, and the Update re-spaced its siblings
// beside it: (2677, -232), (3389, -232), (4845, -232). The oracle is a FRESH BUILD of the same three sets on an empty
// page, by the real executor, with the header placed as `page-header.ts` places one over fresh content: on the content's
// left edge, its bottom 80 above the content's top (written here, not imported). The Update must leave every set where
// that build put it relative to the header. Mutation: the header-row case dropped from `respaceSets` (`besideHeader`
// always false) → `header row/dry run`, `header row/applied`, `header row/one set`.
section('header row — sets an earlier build put beside a wide page header move below it, as a fresh build places them (#2802)');
{
  const IDS = ['checkbox-control', 'checkbox-row', 'checkbox-group'];
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
  // THE FRESH BUILD, relative to its header: the header on the content's left edge, 80 above its top.
  const top = Math.min(...sets.map((n) => Number(n.y)));
  const left = Math.min(...sets.map((n) => Number(n.x)));
  const HEADER_H = 125;
  const freshRel = sets.map((n) => [Number(n.x) - left, Number(n.y) - (top - 80 - HEADER_H)]);
  const span = Math.max(...sets.map((n) => Number(n.x) + Number(n.width))) - left;
  // THE LIVE PAGE: a header wider than the row of sets, and the sets in its row, 160 apart, the first 160 past its right.
  const header = { type: 'INSTANCE', name: '_section-header', x: 0, y: -232, width: span + 1000, height: HEADER_H, children: [] } as unknown as Node;
  page.children.push(header);
  sets[0].x = Number(header.x) + Number(header.width) + 160;
  for (let k = 1; k < sets.length; k++) sets[k].x = Number(sets[k - 1].x) + Number(sets[k - 1].width) + 160;
  for (const set of sets) set.y = Number(header.y);
  const headerAt = JSON.stringify([header.x, header.y]);
  const rel = (): number[][] => sets.map((n) => [Number(n.x) - Number(header.x), Number(n.y) - Number(header.y)]);
  const host = { ...api, root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
  const targets = IDS.map((id) => ({ def: id, plans: plansBy.get(id)! }));
  const ids = (): string => JSON.stringify(sets.map((st) => [st.id, ...membersOf(st).map((m) => m.id)]));
  const idsWas = ids();
  const pre = await previewUpdate(host, targets);
  const to = pre.sets.map((p) => (p.setMove ? [p.setMove.to.x - Number(header.x), p.setMove.to.y - Number(header.y)] : null));
  ok(JSON.stringify(to) === JSON.stringify(freshRel) && previewLine(pre.sets[0]) === `checkbox-control: ${membersOf(sets[0]).length} members. The set moves to its place on the page.`,
    `header row/dry run: all three sets, the first included, move to where a fresh build puts them under the header (${JSON.stringify(to)}; fresh ${JSON.stringify(freshRel)}; ${previewLine(pre.sets[0])})`);
  const res = await applyUpdate(host, api, targets, previewHashOf(pre));
  const next = await previewUpdate(host, targets);
  ok(JSON.stringify(rel()) === JSON.stringify(freshRel) && ids() === idsWas && JSON.stringify([header.x, header.y]) === headerAt
    && applyVerdict(res).headline === '✓ 3 sets moved' && previewVerdict(next).headline === '✓ All sets up to date',
    `header row/applied: every set lands where a fresh build put it relative to the header, every id kept, the header unmoved, and the next dry run up to date (${JSON.stringify(rel())}; ${applyVerdict(res).headline}; ${previewVerdict(next).headline})`);
  // ONE SET ALONE in the header's row moves too: the "fewer than two sets" short cut must not skip it. Read as a function.
  const lone = respaceSets([
    { id: 'H', type: 'INSTANCE', header: true, x: 0, y: -232, width: 2517, height: 125 },
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 2677, y: -232, width: 312, height: 600 },
  ]);
  ok(JSON.stringify(lone.map((m) => [m.id, m.to.x, m.to.y])) === JSON.stringify([['A', 0, -232 + 125 + 80]]),
    `header row/one set: a single set beside the header goes on its left edge, 80 below it (${JSON.stringify(lone)})`);
  // A SET BELOW THE HEADER STAYS: the header is not a row member, so sets under it, a fresh build's 160 apart (no
  // furniture, so frame to frame), stay where they are.
  const under = respaceSets([
    { id: 'H', type: 'INSTANCE', header: true, x: 0, y: -302, width: 2416, height: 125 },
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 0, y: 0, width: 864, height: 600 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 1024, y: 0, width: 864, height: 600 },
  ]);
  ok(under.length === 0, `header row/below stays: sets already under a wide header, a fresh build's spacing apart, do not move (${JSON.stringify(under)})`);
  // A LIFTED SET JOINS THE ROW ALREADY UNDER THE HEADER, at that row's top, not at the header's bottom plus the gap
  // (here the row sits 177 below the header, not 80), and after its sets. Mutation: `underY` ignoring the sets below
  // the header → `header row/joins below`.
  const joins = respaceSets([
    { id: 'H', type: 'INSTANCE', header: true, x: 0, y: -302, width: 4000, height: 125 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 0, y: 0, width: 864, height: 600 },
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 4160, y: -302, width: 312, height: 600 },
  ]);
  ok(JSON.stringify(joins.map((m) => [m.id, m.to.x, m.to.y])) === JSON.stringify([['A', 864 + 160, 0]]),
    `header row/joins below: a set beside the header joins the row under it, at that row's top, after its sets (${JSON.stringify(joins)})`);
  // A LIFTED SET'S LABELS GO ON THE HEADER'S EDGE, NOT ITS FRAME (#2735), as `placeNewSet` places a new set under a
  // header: A's row labels reach 300 left of its frame, so its frame lands at 300 and its labels at 0, the header's
  // left edge. The second set, B, whose labels reach 100, lands 160 right of A's visible box (300 + 312 + 160 + 100).
  // Mutation: the lifted set's start ignoring its reach → `header row/furniture edge`.
  const edge = respaceSets([
    { id: 'H', type: 'INSTANCE', header: true, x: 0, y: -232, width: 2517, height: 125 },
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 2677, y: -232, width: 312, height: 600 },
    { id: 'LA', type: 'INSTANCE', furniture: true, of: 'A', x: 2377, y: -200, width: 290, height: 40 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 3389, y: -232, width: 400, height: 600 },
    { id: 'LB', type: 'INSTANCE', furniture: true, of: 'B', x: 3289, y: -200, width: 90, height: 40 },
  ]);
  ok(JSON.stringify(edge.map((m) => [m.id, m.to.x, m.to.y])) === JSON.stringify([['A', 300, -232 + 125 + 80], ['B', 300 + 312 + 160 + 100, -232 + 125 + 80]]),
    `header row/furniture edge: a lifted set's labels, not its frame, go on the header's left edge, and the next set sits 160 clear of its labels (${JSON.stringify(edge.map((m) => [m.id, m.to.x, m.to.y]))})`);
}

/* ── set moves and page order together (#2542 × #2568) ─────────────────────────────────────────────────── */
// One run whose only work is BOTH: sets squeezed too close on their page (#2542), and component pages out of
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
  const squeeze = (): void => { for (let k = 1; k < sets.length; k++) sets[k].x = Number(sets[k - 1].x) + Number(sets[k - 1].width) + 100; };
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
  ok(JSON.stringify(api._versions) === JSON.stringify(['Saved before Prism3 updated 2 sets']),
    `both/version: one named version, naming the moving sets and the page order (${JSON.stringify(api._versions)})`);
  ok(JSON.stringify(api._versionNotes) === JSON.stringify([`Engine ${ENGINE_VERSION}. Sets: button-destructive, button-neutral (2). Page order.`]),
    `both/version description: the engine, the set list and the page order (${JSON.stringify(api._versionNotes)})`);
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
section('respaceSets — a moving set never lands on another Prism3 set (#2548 review), and the gap is what a designer sees (#2723)');
{
  // The UI lane's repro, re-measured for 160: A at 0, B at 850 (50 clear, too close), a frame Prism3 didn't build at
  // 1700..1800, C at 1900, all 800 wide. B needs 960; the frame pushes it to 1960, which is past C's left edge and over
  // C (1900..2700), so it goes on to 2860. C, 1100 from A, stays.
  const nodes = [
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 0, y: 0, width: 800, height: 800 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 850, y: 0, width: 800, height: 800 },
    { id: 'frame', type: 'FRAME', x: 1700, y: 0, width: 100, height: 800 },
    { id: 'C', type: 'COMPONENT_SET', prism3: true, x: 1900, y: 0, width: 800, height: 800 },
  ];
  const moves = respaceSets(nodes);
  const at = new Map(nodes.map((n) => [n.id, n.x]));
  for (const m of moves) at.set(m.id, m.to.x);
  const over = nodes.flatMap((a, i) => nodes.slice(i + 1).filter((b) => at.get(a.id)! < at.get(b.id)! + b.width && at.get(a.id)! + a.width > at.get(b.id)!).map((b) => `${a.id} over ${b.id}`));
  ok(over.length === 0 && JSON.stringify(moves.map((m) => [m.id, m.to.x])) === JSON.stringify([['B', 2860]]),
    `page/respace onto a set: B, pushed past the frame, goes past C as well (2860) and lands on nothing (${JSON.stringify(moves.map((m) => [m.id, m.to.x]))}; ${over.join(', ') || 'none overlap'})`);
}
{
  // NEVER ONTO A SET ALREADY MOVED (the re-review's repro on #2548, re-measured for 160): A at 0 (800 wide), B at 850
  // (800), C at 900 (600), a frame Prism3 didn't build at 1400..1500, all in one row. B needs 960; the frame pushes it to
  // 1660. C, whose left neighbour is still A, needs 960 too; the frame pushes it to 1660, which is where B now sits
  // (1660..2460), so it goes on to 2620. Mutation: the obstacle push leaving out the sets already placed (`...placed`) → this.
  const nodes = [
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 0, y: 0, width: 800, height: 800 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 850, y: 0, width: 800, height: 800 },
    { id: 'C', type: 'COMPONENT_SET', prism3: true, x: 900, y: 0, width: 600, height: 800 },
    { id: 'frame', type: 'FRAME', x: 1400, y: 0, width: 100, height: 800 },
  ];
  const moves = respaceSets(nodes);
  const at = new Map(nodes.map((n) => [n.id, n.x]));
  for (const m of moves) at.set(m.id, m.to.x);
  const over = nodes.flatMap((a, i) => nodes.slice(i + 1).filter((b) => at.get(a.id)! < at.get(b.id)! + b.width && at.get(a.id)! + a.width > at.get(b.id)!).map((b) => `${a.id} over ${b.id}`));
  ok(over.length === 0 && JSON.stringify(moves.map((m) => [m.id, m.to.x])) === JSON.stringify([['B', 1660], ['C', 2620]]),
    `page/respace onto a moved set: C, pushed past the frame, goes past B where B was just moved (2620) and lands on nothing (${JSON.stringify(moves.map((m) => [m.id, m.to.x]))}; ${over.join(', ') || 'none overlap'})`);
}
{
  // FROM THE FURNITURE'S EDGE (#2723, owner decision Q335 A). A at 0..800, its row label at -200..-20 and its backdrop
  // reaching 12 past its right edge (to 812); B's frame at 900, its own row label at 700..880, 200 left of it. B's
  // labels meet A's backdrop (700 < 812), so B moves until its label is 160 clear: 812 + 160 = 972 for the label,
  // 1172 for the frame. Mutation: the reach left out (`reachOf` returning nothing) → this.
  const nodes = [
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 0, y: 0, width: 800, height: 400 },
    { id: 'a-label', type: 'INSTANCE', furniture: true, of: 'A', x: -200, y: 0, width: 180, height: 200 },
    { id: 'a-backdrop', type: 'INSTANCE', furniture: true, of: 'A', x: -12, y: 200, width: 824, height: 212 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 900, y: 0, width: 600, height: 400 },
    { id: 'b-label', type: 'INSTANCE', furniture: true, of: 'B', x: 700, y: 0, width: 180, height: 200 },
  ];
  const moves = respaceSets(nodes);
  ok(JSON.stringify(moves.map((m) => [m.id, m.to.x])) === JSON.stringify([['B', 1172]]),
    `respace/from the labels: B moves until its labels sit 160 clear of A's backdrop, frame at 1172 (${JSON.stringify(moves.map((m) => [m.id, m.to.x]))})`);
}
{
  // THE OLD RULE'S SPOT (#2723). A at 0..800. B's frame exactly 400 past A's (1200), its label reaching 150 left: 250 of
  // white space, room enough, but the spot is the #2502 rule's, not a designer's, so it moves to 160: label at 960,
  // frame at 1110. C, no furniture, sat 400 past B's frame where B was (2000 + 400 = 2400), so it follows: B's frame now
  // ends at 1910, and C goes to 2070. D, 600 past where C was, is a designer's spacing and stays. Mutation: the old
  // rule's check removed → this.
  const nodes = [
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 0, y: 0, width: 800, height: 400 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 1200, y: 0, width: 800, height: 400 },
    { id: 'b-label', type: 'INSTANCE', furniture: true, of: 'B', x: 1050, y: 0, width: 130, height: 200 },
    { id: 'C', type: 'COMPONENT_SET', prism3: true, x: 2400, y: 0, width: 800, height: 400 },
    { id: 'D', type: 'COMPONENT_SET', prism3: true, x: 3800, y: 0, width: 800, height: 400 },
  ];
  const moves = respaceSets(nodes);
  ok(JSON.stringify(moves.map((m) => [m.id, m.to.x])) === JSON.stringify([['B', 1110], ['C', 2070]]),
    `respace/old rule: sets 400 apart frame to frame close to 160 of white space, and a designer's 600 stays (${JSON.stringify(moves.map((m) => [m.id, m.to.x]))})`);
}
{
  // THE OLD RULE'S SPOT, ALREADY 160 CLEAR (#2737 review). A at 0..800, its backdrop reaching 120 past its right edge
  // (to 920); B's frame exactly 400 past A's (1200), its label reaching 120 left (to 1080): 160 of white space. The spot
  // is the #2502 rule's, and the rule's place for B is where it stands, so nothing moves, and the next dry run reads
  // the same. Mutation: the zero-length move kept (no guard) → this, with B listed to move to 1200.
  const nodes = [
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 0, y: 0, width: 800, height: 400 },
    { id: 'a-backdrop', type: 'INSTANCE', furniture: true, of: 'A', x: -120, y: 0, width: 1040, height: 400 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 1200, y: 0, width: 800, height: 400 },
    { id: 'b-label', type: 'INSTANCE', furniture: true, of: 'B', x: 1080, y: 0, width: 100, height: 200 },
  ];
  const moves = respaceSets(nodes);
  ok(moves.length === 0,
    `respace/old rule at 160: a set at the old rule's spot that already sits 160 clear does not move (${JSON.stringify(moves.map((m) => [m.id, m.to.x]))})`);
}
{
  // PRISM3'S OWN SPACING, BEFORE A REDRAW (#2734). A at 0..800 with a backdrop reaching 100 past its right (to 900);
  // B's frame 160 past that (1060); C 300 past B's frame end (2160), a designer's spacing. Only B is snug. Then A's
  // backdrop is redrawn 60 narrower (to 840): with B named, B goes back to 160 clear, frame at 1000; unnamed, it stays
  // at 220 of white space. C, 300 from where B was and 360 from where it goes, is not named, so it stays at 2160.
  // Mutations: the snug check off by one gap (`SET_GAP` read as anything else) → the first arm; the snug set ignored
  // in `respaceSets` → the second.
  const nodes = [
    { id: 'A', type: 'COMPONENT_SET', prism3: true, x: 0, y: 0, width: 800, height: 400 },
    { id: 'a-backdrop', type: 'INSTANCE', furniture: true, of: 'A', x: -100, y: 0, width: 1000, height: 400 },
    { id: 'B', type: 'COMPONENT_SET', prism3: true, x: 1060, y: 0, width: 800, height: 400 },
    { id: 'C', type: 'COMPONENT_SET', prism3: true, x: 2160, y: 0, width: 800, height: 400 },
  ];
  const snug = snugSets(nodes);
  ok(JSON.stringify([...snug]) === JSON.stringify(['B']), `respace/snug: B, 160 clear of A's backdrop, is at Prism3's spacing; C, 300 clear, is not (${JSON.stringify([...snug])})`);
  const redrawn = nodes.map((n) => (n.id === 'a-backdrop' ? { ...n, width: 940 } : n));
  const moves = respaceSets(redrawn, snug);
  const kept = respaceSets(redrawn);
  ok(JSON.stringify(moves.map((m) => [m.id, m.to.x])) === JSON.stringify([['B', 1000]]) && kept.length === 0,
    `respace/snug after a redraw: A's backdrop 60 narrower, B named goes back to 160 clear at 1000 and C stays; unnamed, nothing moves (${JSON.stringify(moves.map((m) => [m.id, m.to.x]))}; ${JSON.stringify(kept.map((m) => [m.id, m.to.x]))})`);
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
  ok(pre.sets[0]?.counts.revisionUnknown === 46 && previewVerdict(pre).headline === '✓ No changes found',
    `premise: all 46 icons read "built by an earlier plugin", and nothing changes (${JSON.stringify(pre.sets[0]?.counts)}; ${previewVerdict(pre).headline})`);
  const logs = w.comps().map((c) => watchWrites(c));
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const other = logs.flat().filter((x) => !new RegExp(`setSharedPluginData\\(${NS}, (${STAMP_KEY}|${BASELINE_KEY})\\)$`).test(x));
  const again = (await previewUpdate(w.host, [t])).sets[0];
  ok(res.outcomes[0]?.restamped?.length === 46 && other.length === 0 && again.counts.current === 46,
    `single/stamped: each icon takes its stamp and nothing else, and all 46 read current (${res.outcomes[0]?.restamped?.length} stamped; ${other.length} other writes; ${JSON.stringify(again.counts)}; ${applyVerdict(res).headline})`);
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
  ok(stateOf === 'update' && st?.counts.revisionUnknown === 45 && st.changes.some((c) => c.field === 'fills' && /stored #000000/.test(c.from)),
    `single/damage: the icon drawn black under its binding reads "to update", named, though its record matches and its stamp is an earlier plugin's (${stateOf}; ${st?.counts.revisionUnknown} from an earlier plugin; ${st?.changes.map((c) => `${c.field}: ${c.from}`).join(' | ')})`);
  const res = await applyUpdate(w.host, w.api as any, [t], previewHashOf(pre));
  const vars = await varsById(w.api as any);
  const left = w.comps().flatMap((c) => drawnFaults(c, vars));
  const again = (await previewUpdate(w.host, [t])).sets[0];
  ok(applyVerdict(res).ok && res.outcomes[0]?.updated.length === 1 && res.outcomes[0]?.restamped?.length === 45 && left.length === 0 && again.counts.current === 46,
    `single/damage repaired: the update re-applies that icon, which then draws its variable's color; the other 45 take their stamps; all 46 read current (${applyVerdict(res).headline}; ${res.outcomes[0]?.updated.length} updated, ${res.outcomes[0]?.restamped?.length} stamped; ${left.length} faults; ${again.counts.current} current)`);
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
    (planChild(planChild(planChild(q.root, 'content'), 'controlCell'), 'control') as unknown as Record<string, unknown>).nestTarget = 'radio-control';
    return q;
  });
  const { res } = await confirm(w, [{ def: ROW, plans: next }]);
  const ctrls = membersOf(w.set()).map((m) => childNamed(childNamed(childNamed(m, 'content'), 'controlCell'), 'control'));
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

section('field style — a field set built in one Field style is redrawn in place in the other, both ways, in one Update (#2695 Q16 A, #2774)');
{
  // Each field is built from `materializeForBrand` under one style, then updated with the plans of the other: the
  // brand switching its Field style on a file that already holds the sets. Q16 A promises Update redraws them in
  // place. Underline → Outline is the direction #2774 found: an underline hover paints the opaque `field.fill`, an
  // outline hover the translucent wash, and the host resets a bound paint's opacity on the first assignment that
  // changes its variable. Everything below is read off the shim's nodes, never off the plans' own claims, except
  // which members carry a wash, which is what the plan asks for.
  const findPart = (n: Node, name: string): Node | undefined => n.name === name ? n : (n.type === 'INSTANCE' ? undefined : ((n.children as Node[] | undefined) ?? []).map((c) => findPart(c, name)).find(Boolean));
  for (const id of ['text-field', 'password-field', 'select', 'textarea']) {
    const def = componentDefs.find((d) => d.id === id)!;
    const outline = figmaAnatomySet(materializeForBrand(def, { fieldStyle: 'outline' } as never), { swapTarget: SWAP_TARGET });
    const underline = figmaAnatomySet(materializeForBrand(def, { fieldStyle: 'underline' } as never), { swapTarget: SWAP_TARGET });
    // Password field's Show button is Button's instance: its TEXT property is the one Button's own def declares.
    const buttonTexts = Object.fromEntries(Object.entries(componentDefs.find((d) => d.id === 'button')!.figmaProperties?.texts ?? {}).map(([k, t], i) => [`${k}#7:${i}`, { type: 'TEXT', defaultValue: t.default }]));
    const extra = (ps: AnatomyPlan[]) => ({ extraVars: ps.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), extraStyles: ps.flatMap((p) => planTextStyles(p.root)), extraComps: ps.flatMap((p) => planComps(p.root)), componentProps: { button: buttonTexts } });
    for (const [from, to, fromName, toName] of [[underline, outline, 'underline', 'outline'], [outline, underline, 'outline', 'underline']] as const) {
      const tag = `${id} ${fromName}→${toName}`;
      const w = await world(id, [...from], extra([...to]));
      const n = membersOf(w.set()).length;
      const before = identityOf(w.set());
      const { pre, res } = await confirm(w, [{ def: id, plans: [...to] }]);
      const v = applyVerdict(res);
      ok(pre.sets[0].counts.update === n && v.ok, `field style/${tag}: all ${n} members read to update, and one apply succeeds (${JSON.stringify(pre.sets[0].counts)}; ${v.headline}${v.ok ? '' : ` — ${v.lines.slice(0, 2).join(' | ').slice(0, 240)}`})`);
      const after = identityOf(w.set());
      const lost = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || [...b.kids].some(([path, kid]) => after.members.get(name)?.kids.get(path) !== kid)).map(([x]) => x);
      ok(lost.length === 0 && JSON.stringify(after.set) === JSON.stringify(before.set), `field style/${tag} in place: the set, every member and every node under it keep their keys and ids (${lost.slice(0, 2).join('; ') || 'all kept'})`);
      // THE WASH (#2774, then #2926): until #2926 an outline hover washed and had to draw translucent; since #2926 no
      // field washes under either style, so no plan asks for one in either direction.
      const washed = to.filter((p) => /\/overlay\//.test(String(findPart(p.root as unknown as Node, 'control')?.paints?.fills ?? ''))).map((p) => planComponentName(p));
      ok(washed.length === 0,
        `field style/${tag} wash: no member asks for the wash, under either style (#2926) (${washed.slice(0, 2).join('; ') || 'ok'})`);
      // Q346 on the line: a disabled member's edge binds the disabled BORDER role, never an icon or text role.
      const vars = new Map<string, string>((await w.api.variables.getLocalVariablesAsync()).map((x: { id: string; name: string }) => [x.id, x.name.slice(x.name.indexOf('/') + 1)] as [string, string]));
      const edges = membersOf(w.set()).filter((m) => /state=disabled/.test(String(m.name))).map((m) => vars.get(String(((findPart(m, 'control')?.strokes as { boundVariables?: { color?: { id: string } } }[] | undefined) ?? [])[0]?.boundVariables?.color?.id)));
      ok(edges.length > 0 && edges.every((e) => e === 'color/disabled/border'), `field style/${tag} Q346: every disabled edge binds color/disabled/border (${[...new Set(edges)].join(', ')})`);
      const post = (await previewUpdate(w.host, [{ def: id, plans: [...to] }])).sets[0];
      ok(post.counts.current === n, `field style/${tag} converges: the next dry run reads all ${n} current (${JSON.stringify(post.counts)})`);
    }
  }
}

section('tag style — a Tag set built in one Tag style is redrawn in place in the other, both ways, in one Update (#2887)');
{
  // The Tag set is built from `materializeForBrand` under one style, then updated with the plans of the other: a brand
  // switching its Tag style on a file that already holds the set. The build plan promises additive consumer impact:
  // the same 45 members and layers, so Update rewrites strokes, the corner, the height floor and paint in place and
  // instances stay linked. Read off the shim's nodes, never off the plans' own claims.
  const def = componentDefs.find((d) => d.id === 'tag')!;
  const pill = figmaAnatomySet(materializeForBrand(def, { tagStyle: 'pill' } as never), { swapTarget: SWAP_TARGET });
  const underline = figmaAnatomySet(materializeForBrand(def, { tagStyle: 'underline' } as never), { swapTarget: SWAP_TARGET });
  const extra = (ps: AnatomyPlan[]) => ({ extraVars: ps.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]), extraStyles: ps.flatMap((p) => planTextStyles(p.root)), extraComps: ps.flatMap((p) => planComps(p.root)) });
  for (const [from, to, fromName, toName] of [[pill, underline, 'pill', 'underline'], [underline, pill, 'underline', 'pill']] as const) {
    const tag = `tag ${fromName}→${toName}`;
    const w = await world('tag', [...from], extra([...to]));
    const n = membersOf(w.set()).length;
    const before = identityOf(w.set());
    const { pre, res } = await confirm(w, [{ def: 'tag', plans: [...to] }]);
    const v = applyVerdict(res);
    ok(n === 45 && pre.sets[0].counts.update === n && v.ok, `tag style/${tag}: all ${n} of 45 members read to update, and one apply succeeds (${JSON.stringify(pre.sets[0].counts)}; ${v.headline}${v.ok ? '' : ` — ${v.lines.slice(0, 2).join(' | ').slice(0, 240)}`})`);
    const after = identityOf(w.set());
    const lost = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || [...b.kids].some(([path, kid]) => after.members.get(name)?.kids.get(path) !== kid)).map(([x]) => x);
    ok(lost.length === 0 && JSON.stringify(after.set) === JSON.stringify(before.set), `tag style/${tag} in place: the set, every member and every node under it keep their keys and ids (${lost.slice(0, 2).join('; ') || 'all kept'})`);
    // The drawn result, off the stored nodes: under underline no member keeps a fill and the bottom side carries the
    // line; under pill the four sides are one weight again (no side at none).
    const vars = new Map<string, string>((await w.api.variables.getLocalVariablesAsync()).map((x: { id: string; name: string }) => [x.id, x.name.slice(x.name.indexOf('/') + 1)] as [string, string]));
    const off = membersOf(w.set()).filter((m) => {
      const bv = (m.boundVariables ?? {}) as Record<string, { id?: string } | undefined>;
      const top = vars.get(String(bv.strokeTopWeight?.id)), bottom = vars.get(String(bv.strokeBottomWeight?.id));
      const fills = (m.fills as unknown[] | undefined) ?? [];
      return toName === 'underline' ? !(top === 'border-width/none' && /^border-width\/(hairline|thick)$/.test(String(bottom)) && fills.length === 0) : top === 'border-width/none';
    }).map((m) => String(m.name));
    ok(off.length === 0, `tag style/${tag} drawn: ${toName === 'underline' ? 'every member draws the bottom line alone and no fill' : 'no member keeps a side at none'} (${off.slice(0, 2).join('; ') || 'ok'})`);
    const post = (await previewUpdate(w.host, [{ def: 'tag', plans: [...to] }])).sets[0];
    ok(post.counts.current === n, `tag style/${tag} converges: the next dry run reads all ${n} current (${JSON.stringify(post.counts)})`);
  }
}

section('reach — a member stamped under an older revision is to update only when a revision since redraws its set (#3101)');
{
  // Revision 43 redrew the sign-in button alone (`executor-reach.json`). A Tag set whose members carry 42 is current
  // under 43; the same set stamped below the record's floor is to update, as every member was before #3101. Read off
  // the dry run of the host's own members; the stamps are rewritten on the host, as an older plugin left them.
  for (const [rev, want] of [[42, 'current'], [EXECUTOR_REACH.floor - 1, 'update']] as const) {
    const w = await world(TAG);
    for (const m of membersOf(w.set())) {
      const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
      (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.replace(/\|[^|]*$/, `|${rev}`));
    }
    const n = membersOf(w.set()).length;
    const c = (await previewUpdate(w.host, [{ def: TAG, plans: w.plans }])).sets[0].counts;
    ok(c[want] === n, `reach/dry run ${rev}: a Tag set stamped under revision ${rev} reads all ${n} members ${want === 'current' ? 'current' : 'to update'} (${JSON.stringify(c)})`);
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
    // A file holds the icon set, so a nested instance's swap OVERRIDE (Toast's close, #2668) has its glyph component
    // to point at; the world otherwise holds only what the plan nests or swaps to itself.
    type OvNode = { nestOverrides?: { type: string; value: string }[]; children?: OvNode[] };
    const overrideTargets = (n: OvNode): string[] => [
      ...(n.nestOverrides ?? []).filter((x) => x.type === 'INSTANCE_SWAP').map((x) => x.value),
      ...(n.children ?? []).flatMap(overrideTargets),
    ];
    const extraComps = [...new Set(plansOf(d.id).flatMap((p) => overrideTargets(p.root as unknown as OvNode)))];
    const w = await world(d.id, plansOf(d.id), { allowMisses: builtMisses, extraComps });
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
  const { optional: _o, scaleWithParent: _s, ...oldMarker } = now.anatomy.parts.markerGlyph;
  void _o; void _s;
  const before2345 = {
    ...now,
    variants: { ratio: ['1:1', '4:3', '16:9'] },
    anatomy: { ...now.anatomy, parts: { ...now.anatomy.parts, markerGlyph: oldMarker } },
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
  ok(p.changes.some((c) => c.part === 'markerGlyph' && c.field === 'absoluteScale' && c.members === 3),
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
    const was = [...b.kids].find(([path]) => path.startsWith('markerGlyph#'))?.[1];
    return !was || ![...(after.members.get(name)?.kids.values() ?? [])].includes(was);
  }).map(([n]) => n);
  ok(markerMoved.length === 0, `img/marker kept: each existing member's marker keeps its node id (${markerMoved.join(', ') || 'none replaced'})`);
  // Read off the shim's nodes: every member's marker lifted out of the flow and constrained SCALE/SCALE.
  const placement = membersOf(w.set()).map((m) => {
    const k = childNamed(m, 'markerGlyph');
    const c = k?.constraints as { horizontal?: string; vertical?: string } | null;
    return `${String(m.name)}:${String(k?.layoutPositioning)} ${c?.horizontal}/${c?.vertical}`;
  });
  ok(placement.every((s) => s.endsWith(':ABSOLUTE SCALE/SCALE')), `img/marker scales: every member's marker is ABSOLUTE, SCALE/SCALE (${placement.filter((s) => !s.endsWith(':ABSOLUTE SCALE/SCALE')).join('; ') || 'all seven'})`);
  // The Marker boolean: declared on the set, default on, and every member's marker wired to it.
  const defs = (w.set().componentPropertyDefinitions ?? {}) as Record<string, { type: string; defaultValue: unknown }>;
  const markerProp = Object.entries(defs).find(([k]) => k.split('#')[0] === 'marker');
  ok(!!markerProp && markerProp[1].type === 'BOOLEAN' && markerProp[1].defaultValue === true,
    `img/property: the set declares the BOOLEAN 'marker', default on (${JSON.stringify(defs)})`);
  const unwired = membersOf(w.set()).filter((m) => String(((childNamed(m, 'markerGlyph')?.componentPropertyReferences ?? {}) as Record<string, string>).visible ?? '').split('#')[0] !== 'marker').map((m) => String(m.name));
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
    const err = (): Node | undefined => { const m = membersOf(w.set()).find((x) => String(x.name) === 'status=error'); return m && findPart(m, 'errorGlyph'); };
    const before = identityOf(w.set());
    const oldErr = err();
    ok(oldErr?.type === 'FRAME', `premise: the error member's glyph is an inline FRAME before the update (${String(oldErr?.type)})`);
    const { pre, res } = await confirm(w, [{ def: 'field-message', plans }]);
    const named = pre.sets[0].changes.filter((c) => c.part.endsWith('errorGlyph') && (c.field === 'type' || c.field === 'nestTarget'));
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
    const oldMark = findPart(checked(), 'checkGlyph');
    ok(oldMark?.type === 'FRAME' && ((oldMark.children as Node[]) ?? []).some((c) => c.type === 'VECTOR'), `premise: the check is an inline glyph frame holding a VECTOR before the update`);
    const { pre, res } = await confirm(w, [{ def: 'checkbox-control', plans }]);
    ok(applyVerdict(res).ok && !pre.sets[0].blockers.length, `icons/apply: ${applyVerdict(res).headline}`);
    const mark = findPart(checked(), 'checkGlyph');
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

/* ── option rows before #3153 ─────────────────────────────────────────────────────────────────────────── */
// THE ROWS AS MAIN BUILT THEM BEFORE #3153 (owner Q852, Q853 A): the label one size up (`body.sm/md/lg`), the control
// cell a FIXED height bound to the control rung's `control.size.*.line-box`, the label straight under `content`, no
// text column, no description and no description properties. Reconstructed from today's def by putting those facts
// back, so the subject is the real def's projection on both sides (as the #2894 and #2594 sections do).
const OLD_TEXT: Record<string, string> = { small: 'type.body.sm.default', medium: 'type.body.md.default', large: 'type.body.lg.default' };
const OLD_BOX: Record<string, string> = { small: 'control.size.sm.line-box', medium: 'control.size.md.line-box', large: 'control.size.lg.line-box' };
const before3153 = (now: ComponentDef): ComponentDef => {
  const tokens = Object.fromEntries(Object.entries(now.tokens).filter(([k]) => !/label-inset|description|indicator/.test(k)));
  for (const size of Object.keys(OLD_TEXT)) {
    if (tokens[`size.${size}.text`]) tokens[`size.${size}.text`] = OLD_TEXT[size];
    if (tokens[`size.${size}.control-box`]) tokens[`size.${size}.control-box`] = OLD_BOX[size];
  }
  const a = now.anatomy!;
  const { textStack: _t, description: _d, ...parts } = a.parts;
  const { minHeight: _m, ...cell } = parts.controlCell;
  parts.controlCell = { ...cell, height: 'size.{size}.control-box', layout: { ...cell.layout!, sizing: { ...cell.layout!.sizing, y: 'fixed' } } };
  parts.content = { ...parts.content, children: parts.content.children!.map((c) => (c === 'textStack' ? 'label' : c)) };
  const fp = now.figmaProperties!;
  const { description: _dt, ...texts } = fp.texts ?? {};
  const { description: _db, ...booleans } = fp.booleans ?? {};
  return { ...now, tokens, anatomy: { ...a, parts }, figmaProperties: { ...fp, texts, booleans } } as ComponentDef;
};

/* ── option rows' content box (#2894, #2933) ─────────────────────────────────────────────────────────── */
section('option rows — a set built before the content box (#2894, owner Q539) takes the box in place, every member and node kept');
// THE FILE AS A BUILD AT MAIN BEFORE #2894 LEFT IT: the row top-aligned with no floor, holding the control cell and the
// label directly with the gap on itself, a constant 12px block pad (`space.150`) on Radio.Row and Checkbox.Row and none
// on Switch.Row, and no `content`. Reconstructed from today's def by putting those facts back, so the subject is the
// real def's projection on both sides (Accordion's #2594 section above). EXPECTED is typed here: each row's member count
// and its two flow children, which the dry run lists as moving into `content`, kept. Mutations: the executor offering the
// new frame no children → `rows/moved children`, `rows/agree`; the dry run listing no moves → `rows/dry run moves`.
for (const [ROW, MEMBERS, FLOW] of [['radio-row', 6, ['controlCell', 'label']], ['checkbox-row', 6, ['controlCell', 'label']], ['switch-row', 4, ['label', 'controlCell']]] as const) {
  // The #2894 target is the row as #2894 built it, which #3153 has since changed: `before3153` puts that back.
  const now = before3153(componentDefs.find((x) => x.id === ROW)!) as typeof componentDefs[number];
  const { content, ...restParts } = now.anatomy.parts;
  const padded = ROW !== 'switch-row';
  const { padding: _p, minHeight: _m, ...rowRest } = now.anatomy.parts.row;
  const before2894 = {
    ...now,
    tokens: padded ? { ...now.tokens, 'pad-y': 'space.150' } : now.tokens,
    anatomy: { ...now.anatomy, parts: { ...restParts, row: { ...rowRest, layout: { ...now.anatomy.parts.row.layout!, align: 'start' }, gap: content.gap, children: [...content.children!], ...(padded ? { padding: { block: 'pad-y', inlineLabel: 'pad-x' } } : {}) } } },
  } as typeof now;
  const kids = (n: Node | undefined): string[] => ((n?.children as Node[] | undefined) ?? []).map((c) => String(c.name));
  // The file's variables are today's (an Update follows a token sync), so it holds the ones the new plans bind.
  const newPlans = figmaAnatomySet(now, { swapTarget: SWAP_TARGET });
  const w = await world(ROW, figmaAnatomySet(before2894, { swapTarget: SWAP_TARGET }), { extraVars: newPlans.flatMap((q) => [...planBoundVars(q.root), ...planPaintVars(q.root)]) });
  ok(membersOf(w.set()).length === MEMBERS && membersOf(w.set()).every((m) => JSON.stringify(kids(m)) === JSON.stringify(FLOW) && m.counterAxisAlignItems === 'MIN'),
    `${ROW} premise: the file holds ${MEMBERS} members built before #2894, each top-aligned and holding [${FLOW.join(', ')}] directly (${kids(membersOf(w.set())[0]).join(', ')}; ${String(membersOf(w.set())[0].counterAxisAlignItems)})`);
  const before = identityOf(w.set());
  const { pre, res } = await confirm(w, [{ def: ROW, plans: newPlans }]);
  const p = pre.sets[0];
  ok(p.counts.update === MEMBERS && p.counts.add === 0 && p.counts.drop === 0 && p.renames.length === 0 && !p.blockers.length && !p.replacements.length,
    `${ROW} rows/dry run: all ${MEMBERS} members read update, none added, dropped, renamed or replaced, and nothing refused (${JSON.stringify(p.counts)}, ${p.blockers.join('; ') || 'no blockers'}, ${p.replacements.length} replacements)`);
  const lines = previewVerdict(pre).lines;
  const moves = FLOW.map((part) => p.changes.find((c) => c.part === part && c.field === 'moves into'));
  ok(moves.every((c) => c?.to === 'content' && c.members === MEMBERS)
    && FLOW.every((part) => lines.includes(`${ROW} · ${part} · moves into content, kept (${MEMBERS} members).`))
    && !p.changes.some((c) => /removed/.test(c.to)),
    `${ROW} rows/dry run moves: [${FLOW.join(', ')}] are listed as moving into content, kept, and nothing as removed (${JSON.stringify(p.changes.map((c) => [c.part, c.field, c.to, c.members])).slice(0, 300)})`);
  ok(applyVerdict(res).ok, `${ROW} rows/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const after = identityOf(w.set());
  const movedMembers = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  ok(JSON.stringify(after.set) === JSON.stringify(before.set) && movedMembers.length === 0 && after.members.size === MEMBERS,
    `${ROW} rows/members kept: the set and all ${MEMBERS} members keep their keys and ids (${movedMembers.join('; ') || 'none moved'})`);
  // MOVED, NOT REBUILT (#2595): every node that sat under the control cell or the label, the nested control instance
  // included, keeps its id, now under `content`. Read off the shim's nodes by id.
  const was = new RegExp(`^(${FLOW.join('|')})#`);
  const lost: string[] = [];
  for (const [name, b] of before.members) {
    const old = [...b.kids].filter(([path]) => was.test(path));
    const under = new Set([...(after.members.get(name)?.kids ?? [])].filter(([path]) => /^content#\d+\//.test(path)).map(([, id]) => id));
    if (!old.length || !old.every(([, id]) => under.has(id))) lost.push(`${name}: ${old.filter(([, id]) => !under.has(id)).map(([path]) => path).slice(0, 2).join(', ') || 'nothing to move'}`);
  }
  ok(lost.length === 0, `${ROW} rows/moved children: the control cell, the nested control and the label keep their ids under content (${lost.slice(0, 2).join('; ') || `all ${MEMBERS}`})`);
  const movedIds = new Set([...before.members.values()].flatMap((b) => [...b.kids].filter(([path]) => was.test(path)).map(([, id]) => id)));
  const gone = (w.api._removed as Node[]).filter((x) => movedIds.has(String(x.id)));
  ok(movedIds.size > 0 && gone.length === 0, `${ROW} rows/agree: the apply removed none of the ${movedIds.size} nodes the dry run listed as moving (${gone.slice(0, 3).map((x) => `${String(x.name)} ${String(x.id)}`).join(', ') || 'none removed'})`);
  // The new structure, read off the shim's nodes: the row centers one `content` box, which holds the flow children
  // top-aligned (Q539, Q?3 A).
  const shape = membersOf(w.set()).filter((m) => !(m.counterAxisAlignItems === 'CENTER' && JSON.stringify(kids(m)) === '["content"]' && childNamed(m, 'content').counterAxisAlignItems === 'MIN' && JSON.stringify(kids(childNamed(m, 'content'))) === JSON.stringify(FLOW)));
  ok(shape.length === 0, `${ROW} rows/structure: every member centers content, which holds [${FLOW.join(', ')}] top-aligned (${shape.slice(0, 2).map((m) => `${String(m.name)}: ${String(m.counterAxisAlignItems)} [${kids(m).join(', ')}]`).join('; ') || `all ${MEMBERS}`})`);
  const post = (await previewUpdate(w.host, [{ def: ROW, plans: newPlans }])).sets[0];
  ok(post.counts.current === MEMBERS && post.handEdits.length === 0, `${ROW} rows/current: the next dry run reads all ${MEMBERS} current (${JSON.stringify(post.counts)})`);
}

/* ── option rows' 14px label and description (#3153) ─────────────────────────────────────────────────── */
section('option rows — a set built before #3153 (owner Q852, Q853 A) takes the text column, the description and the line-box cell in place, every member and node kept, a hand edit reported');
// THE FILE: each row as main built it before #3153 (`before3153`). THE UPDATE: today's plans, through one Update file.
// EXPECTED, typed here: each row's member count; on the two option rows, `content` holding [controlCell, textStack] and
// the text column holding [label, description] with the description hidden; Switch.Row's flow unchanged. Every node
// that was in the member before keeps its id (the label MOVES into the text column), the set gains the description's
// two properties (off by default), and a designer's binding on one member's label is kept and reported as a hand edit.
// Mutation: the description boolean defaulting on → `rows3153/structure`, `rows3153/description`.
for (const [ROW, MEMBERS, STACKED] of [['checkbox-row', 6, true], ['radio-row', 6, true], ['switch-row', 4, false]] as const) {
  const def = componentDefs.find((x) => x.id === ROW)!;
  const old = before3153(def);
  const newPlans = plansOf(ROW);
  const w = await world(ROW, figmaAnatomySet(old, { swapTarget: SWAP_TARGET }), {
    extraVars: newPlans.flatMap((q) => [...planBoundVars(q.root), ...planPaintVars(q.root)]),
    extraStyles: newPlans.flatMap((q) => planTextStyles(q.root)),
  });
  const kids = (n: Node | undefined): string[] => ((n?.children as Node[] | undefined) ?? []).map((c) => String(c.name));
  const content0 = childNamed(membersOf(w.set())[0], 'content');
  ok(membersOf(w.set()).length === MEMBERS && !kids(content0).includes('textStack'),
    `${ROW} rows3153 premise: the file holds ${MEMBERS} members built before #3153, with no text column (${kids(content0).join(', ')})`);
  // A designer's edit on one member's row: the control-to-label gap bound to `space/0`, a step the plan does not name.
  const edited = membersOf(w.set())[1];
  const editVar = await varIdOf(w, 'space/0');
  (childNamed(edited, 'content').setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: editVar });
  const before = identityOf(w.set());
  const { pre, res } = await confirm(w, [{ def: ROW, plans: newPlans }]);
  const p = pre.sets[0];
  ok(p.counts.update + p.counts.handEdited === MEMBERS && p.counts.add === 0 && p.counts.drop === 0 && p.renames.length === 0 && !p.blockers.length && !p.replacements.length,
    `${ROW} rows3153/dry run: all ${MEMBERS} members read update, none added, dropped, renamed or replaced, nothing refused (${JSON.stringify(p.counts)}, ${p.blockers.join('; ') || 'no blockers'})`);
  ok(p.handEdits.length === 1 && p.handEdits[0].member === edited.name && p.handEdits[0].path === 'content',
    `${ROW} rows3153/hand edit reported: the dry run reports the designer's edit on ${String(edited.name)}'s content, and nothing else (${JSON.stringify(p.handEdits).slice(0, 240)})`);
  ok(res.outcomes[0].kept.length === 1 && res.outcomes[0].kept[0].path === 'content' && (childNamed(edited, 'content').boundVariables as Record<string, { id: string }>).itemSpacing?.id === editVar,
    `${ROW} rows3153/hand edit kept: the apply keeps the designer's gap and lists it (${JSON.stringify(res.outcomes[0].kept)})`);
  ok(applyVerdict(res).ok, `${ROW} rows3153/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const after = identityOf(w.set());
  const movedMembers = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  ok(JSON.stringify(after.set) === JSON.stringify(before.set) && movedMembers.length === 0 && after.members.size === MEMBERS,
    `${ROW} rows3153/members kept: the set and all ${MEMBERS} members keep their keys and ids (${movedMembers.join('; ') || 'none moved'})`);
  // KEPT, BY ID: every node the member held before is still in it (wherever it now sits), and none was removed.
  const lost: string[] = [];
  for (const [name, b] of before.members) {
    const now = new Set([...(after.members.get(name)?.kids.values() ?? [])]);
    const miss = [...b.kids].filter(([, id]) => !now.has(id));
    if (miss.length) lost.push(`${name}: ${miss.map(([path]) => path).slice(0, 2).join(', ')}`);
  }
  ok(lost.length === 0, `${ROW} rows3153/kept: every node keeps its id, the label moved rather than rebuilt (${lost.slice(0, 2).join('; ') || `all ${MEMBERS}`})`);
  // THE NEW STRUCTURE, read off the shim's nodes.
  const shape = membersOf(w.set()).filter((m) => {
    const c = childNamed(m, 'content');
    if (!STACKED) return JSON.stringify(kids(c)) !== JSON.stringify(['label', 'controlCell']);
    const t = childNamed(c, 'textStack');
    return !(JSON.stringify(kids(c)) === JSON.stringify(['controlCell', 'textStack']) && JSON.stringify(kids(t)) === JSON.stringify(['label', 'description']) && childNamed(t, 'description').visible === false);
  });
  ok(shape.length === 0, `${ROW} rows3153/structure: ${STACKED ? 'content holds [controlCell, textStack], the text column [label, description], the description hidden' : 'content still holds [label, controlCell]'} (${shape.slice(0, 2).map((m) => `${String(m.name)}: [${kids(childNamed(m, 'content')).join(', ')}]`).join('; ') || `all ${MEMBERS}`})`);
  if (STACKED) {
    const defs = w.set().componentPropertyDefinitions as Record<string, { type: string; defaultValue?: unknown }>;
    const bool = Object.entries(defs).find(([k, d]) => d.type === 'BOOLEAN' && /^description/.test(k));
    const text = Object.entries(defs).find(([k, d]) => d.type === 'TEXT' && /^description text/.test(k));
    ok(!!bool && bool[1].defaultValue === false && !!text, `${ROW} rows3153/description: the set gains a description boolean, off by default, and its text property (${JSON.stringify(Object.keys(defs))})`);
  }
  const post = (await previewUpdate(w.host, [{ def: ROW, plans: newPlans }])).sets[0];
  ok(post.counts.current === MEMBERS - 1 && post.handEdits.length === 1 && post.handEdits[0].member === edited.name,
    `${ROW} rows3153/current: the next dry run reads the other ${MEMBERS - 1} current and still reports the one hand edit (${JSON.stringify(post.counts)}, ${JSON.stringify(post.handEdits).slice(0, 200)})`);
}

/* ── option rows' control-to-label gap (#3173) ──────────────────────────────────────────────────────────── */
section('option rows — a set built before #3173 (owner Q3173 A) takes the 12px medium gap in place, every member and node kept');
// THE FILE: each row as main built it before #3173, the medium gap on `space.100` (8px); small and large were already
// 8 and 12. THE UPDATE: today's plans, through one Update file. EXPECTED, typed here: the gap variable per size,
// `space/100` / `space/150` / `space/150`, so only the medium members read update; every key and id kept.
const GAP_VAR_3173: Record<string, string> = { small: 'space/100', medium: 'space/150', large: 'space/150' };
for (const [ROW, MEMBERS] of [['checkbox-row', 6], ['radio-row', 6], ['switch-row', 4]] as const) {
  const def = componentDefs.find((x) => x.id === ROW)!;
  const old = { ...def, tokens: { ...def.tokens, 'size.medium.gap': 'space.100' } } as typeof def;
  const newPlans = plansOf(ROW);
  const w = await world(ROW, figmaAnatomySet(old, { swapTarget: SWAP_TARGET }), {
    extraVars: newPlans.flatMap((q) => [...planBoundVars(q.root), ...planPaintVars(q.root)]),
    extraStyles: newPlans.flatMap((q) => planTextStyles(q.root)),
  });
  const sizeOf = (m: Node): string => /size=(\w+)/.exec(String(m.name))?.[1] ?? '?';
  const gapOf = (m: Node): string | undefined => (childNamed(m, 'content').boundVariables as Record<string, { id: string }> | undefined)?.itemSpacing?.id;
  const medium = membersOf(w.set()).filter((m) => sizeOf(m) === 'medium');
  const v100 = await varIdOf(w, 'space/100');
  ok(membersOf(w.set()).length === MEMBERS && medium.length > 0 && medium.every((m) => gapOf(m) === v100),
    `${ROW} rows3173 premise: the file holds ${MEMBERS} members built before #3173, the ${medium.length} medium ones with the gap on space/100`);
  const before = identityOf(w.set());
  const { pre, res } = await confirm(w, [{ def: ROW, plans: newPlans }]);
  const p = pre.sets[0];
  ok(p.counts.update === medium.length && p.counts.current === MEMBERS - medium.length && p.counts.add === 0 && p.counts.drop === 0 && p.renames.length === 0 && !p.blockers.length && !p.replacements.length && p.handEdits.length === 0,
    `${ROW} rows3173/dry run: the ${medium.length} medium members read update and the rest current, none added, dropped, renamed or replaced (${JSON.stringify(p.counts)}, ${p.blockers.join('; ') || 'no blockers'})`);
  ok(applyVerdict(res).ok, `${ROW} rows3173/verdict: ${applyVerdict(res).headline}`);
  const off: string[] = [];
  for (const m of membersOf(w.set())) {
    const want = await varIdOf(w, GAP_VAR_3173[sizeOf(m)]);
    if (gapOf(m) !== want) off.push(`${String(m.name)}: ${gapOf(m)} (want ${GAP_VAR_3173[sizeOf(m)]})`);
  }
  ok(off.length === 0, `${ROW} rows3173/gap: every member's control-to-label gap binds space/100, space/150, space/150 by size (${off.slice(0, 2).join('; ') || `all ${MEMBERS}`})`);
  const after = identityOf(w.set());
  const lost: string[] = [];
  for (const [name, b] of before.members) {
    const a = after.members.get(name);
    if (!a || a.key !== b.key || a.id !== b.id) { lost.push(`${name}: member`); continue; }
    const now = new Set(a.kids.values());
    const miss = [...b.kids].filter(([, id]) => !now.has(id));
    if (miss.length) lost.push(`${name}: ${miss.map(([path]) => path).slice(0, 2).join(', ')}`);
  }
  ok(JSON.stringify(after.set) === JSON.stringify(before.set) && lost.length === 0 && after.members.size === MEMBERS,
    `${ROW} rows3173/kept: the set, all ${MEMBERS} members and every node keep their keys and ids (${lost.slice(0, 2).join('; ') || 'none moved'})`);
  const post = (await previewUpdate(w.host, [{ def: ROW, plans: newPlans }])).sets[0];
  ok(post.counts.current === MEMBERS && post.handEdits.length === 0, `${ROW} rows3173/current: the next dry run reads all ${MEMBERS} current (${JSON.stringify(post.counts)})`);
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
  ok(membersOf(w.set()).length === 48 && membersOf(w.set()).every((m) => !childNamed(header(m), 'titleRow') && kids(header(m)).includes('titleBox') && header(m).counterAxisAlignItems === 'MIN'),
    `premise: the file holds 48 members built before #2594, each header top-aligned and holding the title directly (${kids(header(membersOf(w.set())[0])).join(', ')}; ${String(header(membersOf(w.set())[0]).counterAxisAlignItems)})`);
  const before = identityOf(w.set());
  const keptIds = (m: Node) => ({ header: String(header(m).id), divider: String(childNamed(m, 'divider')?.id) });
  const beforeKept = new Map(membersOf(w.set()).map((m) => [String(m.name), keptIds(m)] as const));
  const { pre, res } = await confirm(w, [{ def: ACC, plans: newPlans }]);
  const p = pre.sets[0];
  ok(p.counts.update === 48 && p.counts.add === 0 && p.counts.drop === 0 && p.renames.length === 0 && !p.blockers.length && !p.replacements.length,
    `acc/dry run: all 48 members read update, none added, dropped, renamed or replaced, and nothing refused (${JSON.stringify(p.counts)}, ${p.blockers.join('; ') || 'no blockers'}, ${p.replacements.length} replacements)`);
  ok(p.changes.some((c) => c.part === 'header' && c.field === 'counterAxisAlignItems' && c.from === 'MIN' && c.to === 'CENTER' && c.members === 48) && p.changes.some((c) => c.part === 'header/titleRow' && c.field === 'children' && c.to === 'present'),
    `acc/dry run: the header's centering and the added row are named differences (${JSON.stringify(p.changes.map((c) => [c.part, c.field, c.members])).slice(0, 240)})`);
  // THE MOVES, as the dry run lists them (#2595): the indicators and the title move into the row and are kept, never
  // listed as removed. Typed here from the def's anatomy (the leading or trailing indicator on half the members each,
  // the title on all 48) and the issue's option A wording.
  const lines = previewVerdict(pre).lines;
  const moveLines = ['header/leadingIndicator', 'header/titleBox', 'header/trailingIndicator'].map((part) => p.changes.find((c) => c.part === part));
  ok(JSON.stringify(moveLines.map((c) => [c?.field, c?.to, c?.members])) === JSON.stringify([['moves into', 'header/titleRow', 24], ['moves into', 'header/titleRow', 48], ['moves into', 'header/titleRow', 24]])
    && lines.includes('accordion · header/titleBox · moves into header/titleRow, kept (48 members).')
    && lines.includes('accordion · header/leadingIndicator · moves into header/titleRow, kept (24 members).')
    && !p.changes.some((c) => /removed/.test(c.to)),
    `acc/dry run moves: the indicators and the title are listed as moving into the row, kept, and nothing as removed (${JSON.stringify(p.changes.map((c) => [c.part, c.field, c.to, c.members]))})`);
  const v = applyVerdict(res);
  ok(v.ok, `acc/verdict: ${v.headline} (${v.lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const after = identityOf(w.set());
  ok(JSON.stringify(after.set) === JSON.stringify(before.set), 'acc/set kept: the set keeps its key and id');
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
  ok(moved.length === 0 && after.members.size === 48, `acc/members kept: all 48 members keep their keys and ids (${moved.join('; ') || 'none moved'})`);
  const lostHost = membersOf(w.set()).filter((m) => JSON.stringify(keptIds(m)) !== JSON.stringify(beforeKept.get(String(m.name)))).map((m) => String(m.name));
  ok(lostHost.length === 0, `acc/header kept: each member's header and Divider keep their node ids; the row is added inside the header in place (${lostHost.slice(0, 2).join('; ') || 'all 48'})`);
  // The new structure, read off the shim's nodes: the header centers one row, and the row holds the indicator and
  // the title, top-aligned. Typed here from Q276 A.
  const shape = membersOf(w.set()).map((m) => {
    const h = header(m), row = childNamed(h, 'titleRow');
    const side = /icon position=leading/.test(String(m.name)) ? 'leadingIndicator' : 'trailingIndicator';
    const want = side === 'leadingIndicator' ? ['leadingIndicator', 'titleBox'] : ['titleBox', 'trailingIndicator'];
    return { m: String(m.name), ok: h.counterAxisAlignItems === 'CENTER' && !!row && row.counterAxisAlignItems === 'MIN' && JSON.stringify(kids(row)) === JSON.stringify(want) && !kids(h).includes('titleBox') && !kids(h).includes(side), got: `${String(h.counterAxisAlignItems)} [${kids(h).join(', ')}] / ${String(row?.counterAxisAlignItems)} [${kids(row).join(', ')}]` };
  });
  ok(shape.every((x) => x.ok), `acc/structure: every header is centered and holds the row, which holds the indicator and the title top-aligned (${shape.filter((x) => !x.ok).slice(0, 2).map((x) => `${x.m}: ${x.got}`).join('; ') || 'all 48'})`);
  const post = (await previewUpdate(w.host, [{ def: ACC, plans: newPlans }])).sets[0];
  ok(post.counts.current === 48 && post.handEdits.length === 0, `acc/current: the next dry run reads all 48 current (${JSON.stringify(post.counts)})`);
  // MOVED, NOT REBUILT (#2595): the indicators and the title move into the row the update inserts, so every node in
  // them, their nested glyph instances included, keeps its id, now under the row. A placed instance's override on
  // them carries over. Read off the shim's nodes by id. Mutations: the executor offering a new frame no children
  // (`offer` empty) → `acc/moved children`, `acc/agree`, `acc/edited agree`; the dry run listing no moves →
  // `acc/dry run moves`, `acc/edited dry run`.
  const lost: string[] = [];
  for (const [name, b] of before.members) {
    const was = [...b.kids].filter(([path]) => /^header#0\/(titleBox|leadingIndicator|trailingIndicator)#/.test(path));
    const underRow = new Set([...(after.members.get(name)?.kids ?? [])].filter(([path]) => /^header#0\/titleRow#\d+\//.test(path)).map(([, id]) => id));
    if (!was.length || !was.every(([, id]) => underRow.has(id))) lost.push(`${name}: ${was.filter(([, id]) => !underRow.has(id)).map(([path]) => path).slice(0, 2).join(', ') || 'nothing to move'}`);
  }
  ok(lost.length === 0, `acc/moved children: the indicator and the title, and every node in them, keep their ids under the row (${lost.slice(0, 2).join('; ') || 'all 48'})`);
  // THE DRY RUN SAID SO: no node under a part the dry run listed as moving was removed. Counted off the shim's own
  // removals, by id.
  const movedIds = new Set([...before.members.values()].flatMap((b) => [...b.kids].filter(([path]) => /^header#0\/(titleBox|leadingIndicator|trailingIndicator)#/.test(path)).map(([, id]) => id)));
  const gone = (w.api._removed as Node[]).filter((x) => movedIds.has(String(x.id)));
  ok(movedIds.size > 0 && gone.length === 0, `acc/agree: the apply removed none of the ${movedIds.size} nodes the dry run listed as moving (${gone.slice(0, 3).map((x) => `${String(x.name)} ${String(x.id)}`).join(', ') || 'none removed'})`);
  // ADOPTED, NOT RE-CREATED, ONCE THERE: a later update (here an executor revision bump, every member out of date
  // with nothing else moved) pairs the row the first update added, and every node under it keeps its id.
  for (const m of membersOf(w.set())) {
    const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.replace(/\|[^|]*$/, '|0'));
  }
  const rowIds = (m: Node): string => JSON.stringify([...idsUnder(childNamed(header(m), 'titleRow'))]);
  const beforeRow = new Map(membersOf(w.set()).map((m) => [String(m.name), rowIds(m)] as const));
  const again = await confirm(w, [{ def: ACC, plans: newPlans }]);
  ok(again.pre.sets[0].counts.update === 48 && applyVerdict(again.res).ok, `acc/again: a revision bump reads all 48 out of date and updates them (${JSON.stringify(again.pre.sets[0].counts)}; ${applyVerdict(again.res).headline})`);
  const reRow = membersOf(w.set()).filter((m) => rowIds(m) !== beforeRow.get(String(m.name))).map((m) => String(m.name));
  ok(reRow.length === 0, `acc/row adopted: a later update keeps the row and every node under it, by id, on every member (${reRow.slice(0, 2).join('; ') || 'all 48'})`);
}
// A NODE A DESIGNER EDITED IS NOT MOVED (#2595): the move is decided before the hand-edit choice is made, so a node
// with a hand edit at or under it is left out of the moves whatever the choice. The dry run lists it as removed on that
// member and moved on the rest, and the apply rebuilds it there, as before #2595, and moves it on the rest. (Its hand
// edit is not carried into the rebuilt node, as before #2595: #2673.) Twice: an edit ON the moved node, and one UNDER
// it (its label), which must block the move as surely (#2595 review). Mutations: the executor ignoring `edited` →
// `acc/edited agree`; `adoptions` dropping its under-a-node arm → `acc/edited under agree`, `acc/edited under dry run`.
const ACC_BEFORE_ROW = (patch: (parts: Record<string, any>) => Record<string, any> = (x) => x) => {
  const now = componentDefs.find((x) => x.id === 'accordion')!;
  const { titleRow, ...restParts } = now.anatomy.parts;
  return {
    ...now,
    anatomy: { ...now.anatomy, parts: patch({ ...restParts, header: { ...now.anatomy.parts.header, layout: { ...now.anatomy.parts.header.layout!, align: 'start' }, gap: titleRow.gap, children: [...titleRow.children!, 'focusRing'] } }) },
  } as typeof now;
};
for (const edit of [
  { tag: 'edited', path: 'header/titleBox', on: (m: Node) => childNamed(childNamed(m, 'header'), 'titleBox'), apply: async (w: any, n: Node) => (n.setBoundVariable as (f: string, v: { id: string }) => void)('itemSpacing', { id: await varIdOf(w, 'space/0') }) },
  { tag: 'edited under', path: 'header/titleBox/label', on: (m: Node) => childNamed(childNamed(childNamed(m, 'header'), 'titleBox'), 'label'), apply: async (_w: any, n: Node) => { (n as unknown as { opacity: number }).opacity = 0.5; } },
]) {
  const ACC = 'accordion';
  const w = await world(ACC, figmaAnatomySet(ACC_BEFORE_ROW(), { swapTarget: SWAP_TARGET }));
  const m = membersOf(w.set())[0];
  await edit.apply(w, edit.on(m));
  const boxId = String(childNamed(childNamed(m, 'header'), 'titleBox').id);
  const others = membersOf(w.set()).slice(1).map((x) => String(childNamed(childNamed(x, 'header'), 'titleBox').id));
  // Under the default choice (keep). The dry run is made before any choice, so it is the same under every one.
  const pre = await previewUpdate(w.host, [{ def: ACC, plans: plansOf(ACC) }]);
  const p = pre.sets[0];
  const edits = p.handEdits.filter((h) => h.member === String(m.name)).map((h) => h.path);
  const move = p.changes.find((c) => c.part === 'header/titleBox' && c.field === 'moves into');
  const removed = p.changes.find((c) => c.part === 'header/titleBox' && /removed/.test(c.to));
  ok(JSON.stringify(edits) === JSON.stringify([edit.path]) && move?.members === 47 && removed?.members === 1 && removed.sample[0] === String(m.name),
    `acc/${edit.tag} dry run: with ${edit.path} edited, the title is listed as removed on its member, moved on the other 47 (${JSON.stringify(edits)}; moves ${move?.members}; removed ${removed?.members} on ${removed?.sample.join(', ')})`);
  const res = await applyUpdate(w.host, w.api as any, [{ def: ACC, plans: plansOf(ACC) }], previewHashOf(pre), { choices: { handEdits: 'keep' } });
  void res;
  const row = (x: Node): Node | undefined => childNamed(childNamed(x, 'header'), 'titleRow');
  const nowBox = String(childNamed(row(m)!, 'titleBox')?.id);
  const kept = membersOf(w.set()).slice(1).map((x) => String(childNamed(row(x)!, 'titleBox')?.id));
  ok(nowBox !== boxId && (w.api._removed as Node[]).some((x) => String(x.id) === boxId) && JSON.stringify(kept) === JSON.stringify(others),
    `acc/${edit.tag} agree: with ${edit.path} edited, the title is rebuilt in the row on its member, as the dry run listed it, and moved, by id, on the other 47 (${boxId} → ${nowBox}; ${kept.filter((id, i) => id !== others[i]).length} others changed)`);
}
{
  // A MOVED NODE IS STILL COMPARED TO ITS PLAN (#2595 review): the dry run diffs each moved subtree at its new path,
  // so a field the apply changes on a moved node is listed beside the move line, never hidden by it. Here the file's
  // title column has no top padding where the plan pads it, so `paddingTop` is a named difference at the title's NEW
  // path on every member. Mutation: the moved subtrees not diffed → `acc/moved diffed`.
  const ACC = 'accordion';
  const w = await world(ACC, figmaAnatomySet(ACC_BEFORE_ROW((parts) => ({ ...parts, titleBox: { ...parts.titleBox, paddingTop: undefined } })), { swapTarget: SWAP_TARGET }));
  const p = (await previewUpdate(w.host, [{ def: ACC, plans: plansOf(ACC) }])).sets[0];
  const field = p.changes.filter((c) => c.part === 'header/titleRow/titleBox' && /paddingTop/.test(`${c.field} ${c.from} ${c.to}`));
  const move = p.changes.find((c) => c.part === 'header/titleBox' && c.field === 'moves into');
  ok(field.length > 0 && field.reduce((a, c) => a + c.members, 0) === 48 && move?.members === 48,
    `acc/moved diffed: the title's missing top padding is listed at its new path on all 48 members, beside its move (${JSON.stringify(field.map((c) => [c.field, c.from, c.to, c.members]))}; moves ${move?.members})`);
}
{
  // THE MOVE RULE ITSELF (#2595 review), on hand-built inputs whose answers are known in advance (docs/34). Each case
  // is one guard of `adoptions`; dropping that guard fails its line by name.
  const row = [{ name: 'row', type: 'FRAME', children: [{ name: 'a', type: 'FRAME' }, { name: 'b', type: 'TEXT' }] }];
  const got = (m: Map<string, string>) => JSON.stringify([...m]);
  ok(got(adoptions(row, ['a', 'b'])) === '[["a","row"],["b","row"]]', `acc/adoptions: both children the new row names move into it (${got(adoptions(row, ['a', 'b']))})`);
  ok(got(adoptions(row, ['a', 'a', 'b'])) === '[["b","row"]]', `acc/adoptions once: a name the file holds twice moves neither, since picking one would be order deciding (${got(adoptions(row, ['a', 'a', 'b']))})`);
  ok(got(adoptions(row, ['a', 'b', 'row'])) === '[]', `acc/adoptions present: a row the file already holds takes nothing (${got(adoptions(row, ['a', 'b', 'row']))})`);
  ok(got(adoptions([...row, { name: 'a', type: 'TEXT' }], ['a', 'b'])) === '[["b","row"]]', `acc/adoptions claimed: a name another plan child claims stays (${got(adoptions([...row, { name: 'a', type: 'TEXT' }], ['a', 'b']))})`);
  ok(got(adoptions(row, ['a', 'b'], new Set(['header/a/inner']), 'header')) === '[["b","row"]]', `acc/adoptions edited under: an edit under a child keeps it out (${got(adoptions(row, ['a', 'b'], new Set(['header/a/inner']), 'header'))})`);
  ok(got(adoptions(row, ['a', 'b'], new Set(['header/ab']), 'header')) === '[["a","row"],["b","row"]]', `acc/adoptions edited prefix: an edit on a sibling whose name merely starts the same blocks nothing (${got(adoptions(row, ['a', 'b'], new Set(['header/ab']), 'header'))})`);
  const swapRow = [{ name: 'row', type: 'FRAME', children: [{ name: 's', type: 'INSTANCE_SWAP' }] }];
  ok(got(adoptions(swapRow, ['s'])) === '[]', `acc/adoptions swap: an INSTANCE_SWAP is never moved, since its host type depends on the file and the dry run cannot read it (${got(adoptions(swapRow, ['s']))})`);
  const slotRow = [{ name: 'row', type: 'CONTENT_SLOT', children: [{ name: 'a', type: 'FRAME' }] }];
  ok(got(adoptions(slotRow, ['a'])) === '[]', `acc/adoptions frame only: only a FRAME the plan inserts is offered children, never another type that carries them (${got(adoptions(slotRow, ['a']))})`);
}

section('stepdown — Segmented control, Tab and Tag move their glyph one rung down in place (#2725, owner Q337 A)');
{
  // THE FILE AS A BUILD BEFORE #2725 LEFT IT: each def's glyph on the 1:1 rung. Reconstructed from today's def by
  // putting those three bindings back, so the subject is the real def's projection on both sides (as `accordion` does).
  const OLD_RUNG: Record<string, string> = { 'size.small.icon': 'icon.size.sm', 'size.medium.icon': 'icon.size.md', 'size.large.icon': 'icon.size.lg' };
  // EXPECTED, typed from the decision: the variable each size binds and the px it carries (the shim's `varPx`).
  const WANT: Record<string, [string, number]> = { small: ['icon/size/xs', 16], medium: ['icon/size/sm', 20], large: ['icon/size/md', 24] };
  const PX = { 'icon/size/xs': 16, 'icon/size/sm': 20, 'icon/size/md': 24, 'icon/size/lg': 32 };
  const CASES: Array<{ id: string; parts: string[]; members: number }> = [
    { id: 'segmented-control-segment', parts: ['leadingVisual'], members: 30 },
    { id: 'tab-item', parts: ['leadingVisual'], members: 30 },
    { id: 'tag', parts: ['leadingVisual', 'checkGlyph', 'dismissGlyph'], members: 45 },
  ];
  const sizeOf = (m: Node): string => /size=(small|medium|large)/.exec(String(m.name))?.[1] ?? '?';
  const glyphsOf = (m: Node, parts: string[]): Node[] => {
    const out: Node[] = [];
    const walk = (n: Node) => { if (parts.includes(String(n.name))) out.push(n); if (n.type !== 'INSTANCE') for (const c of (n.children as Node[] | undefined) ?? []) walk(c); };
    walk(m);
    return out;
  };
  for (const { id, parts, members } of CASES) {
    const now = componentDefs.find((x) => x.id === id)!;
    const old = { ...now, tokens: { ...now.tokens, ...OLD_RUNG } } as typeof now;
    const oldPlans = figmaAnatomySet(old, { swapTarget: SWAP_TARGET });
    const newPlans = plansOf(id);
    const w = await world(id, oldPlans, { extraVars: ['icon/size/xs'], varPx: PX });
    const names = new Map(((await w.api.variables.getLocalVariablesAsync()) as { id: string; name: string }[]).map((v) => [v.id, v.name]));
    const boundName = (n: Node, f: 'width' | 'height'): string => {
      const vid = (n.boundVariables as Record<string, { id?: string }> | undefined)?.[f]?.id;
      const full = vid ? names.get(vid) ?? '' : '';
      return Object.keys(PX).find((k) => full === k || full.endsWith(`/${k}`)) ?? (full || 'unbound');
    };
    const wrongGlyph = (want: Record<string, [string, number]>): string[] => membersOf(w.set()).flatMap((m) => {
      const [wv, wpx] = want[sizeOf(m)] ?? ['?', NaN];
      return glyphsOf(m, parts).filter((g) => boundName(g, 'width') !== wv || boundName(g, 'height') !== wv || g.width !== wpx || g.height !== wpx)
        .map((g) => `${String(m.name)} ${String(g.name)} (${boundName(g, 'width')} ${String(g.width)}×${String(g.height)}, want ${wv} ${wpx})`);
    });
    const seen = new Set(membersOf(w.set()).flatMap((m) => glyphsOf(m, parts).map((g) => `${String(g.name)}@${sizeOf(m)}`)));
    const want1to1: Record<string, [string, number]> = { small: ['icon/size/sm', 20], medium: ['icon/size/md', 24], large: ['icon/size/lg', 32] };
    const pre1 = wrongGlyph(want1to1);
    ok(membersOf(w.set()).length === members && parts.every((n) => ['small', 'medium', 'large'].every((s) => seen.has(`${n}@${s}`))) && pre1.length === 0,
      `premise: ${id}'s ${members} members were built on the 1:1 rung, 20 / 24 / 32, every glyph part [${parts.join(', ')}] at every size (${pre1.slice(0, 2).join('; ') || 'all'})`);
    const before = identityOf(w.set());
    const { pre, res } = await confirm(w, [{ def: id, plans: newPlans }]);
    const p = pre.sets[0];
    ok(p.counts.update > 0 && p.counts.add === 0 && p.counts.drop === 0 && !p.blockers.length,
      `stepdown/${id} dry run: members read update, none added or dropped, nothing refused (${JSON.stringify(p.counts)}, ${p.blockers.join('; ') || 'no blockers'})`);
    ok(applyVerdict(res).ok, `stepdown/${id} verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 200)})`);
    const wrong = wrongGlyph(WANT);
    ok(wrong.length === 0, `stepdown/${id} rebound: every glyph binds icon/size/xs / sm / md and is 16 / 20 / 24px at small / medium / large (${wrong.slice(0, 3).join('; ') || 'all'})`);
    const after = identityOf(w.set());
    const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([n]) => n);
    ok(JSON.stringify(after.set) === JSON.stringify(before.set) && moved.length === 0 && after.members.size === members,
      `stepdown/${id} kept: the set and all ${members} members keep their keys and ids (${moved.slice(0, 2).join('; ') || 'none moved'})`);
    const post = (await previewUpdate(w.host, [{ def: id, plans: newPlans }])).sets[0];
    ok(post.counts.current === members && post.handEdits.length === 0, `stepdown/${id} current: the next dry run reads all ${members} current (${JSON.stringify(post.counts)})`);
  }
}

/* ── stretched mode (#2696) ──────────────────────────────────────────────────────────────────────────── */
// A HUGGING AXIS THE PARENT STRETCHES IS THE PARENT'S SIZE, so the host may hold FIXED there where the plan says AUTO.
// The host is modeled by the test: Accordion's indicator (a row in the row `titleRow`, `layoutAlign: STRETCH`) switches
// its counter axis to FIXED when the stretch is written, at medium and large and not at small, as the live file read.
// One member's `titleRow`, which nothing stretches, and its `header`, stretched on its other axis, hold FIXED whatever is
// written (the record cleared, so the update writes them rather than keeping a hand edit): the controls the rule must
// still fail, with an open member's `content` held AUTO where the plan holds its stretched axis FIXED. The expected
// lines are literals from the def's anatomy, never the read-back's output. Mutations: the rule dropped, or the parent's
// plan not threaded to it → `stretch/verify`, `stretch/dry run`, `stretch/agree`, `stretch/lost`; the host's stretch
// not required → `stretch/lost`; the axis ignored → the same four; a planned FIXED relaxed too → the same four; the
// plan's stretch not required (the control's `titleRow` is stretched on the host alone) → `stretch/verify`,
// `stretch/dry run`, `stretch/agree`, `stretch/lost`.
section('stretched mode — an axis the parent stretches: the verify and the dry run agree on it, both ways (#2696)');
{
  const ACC = 'accordion';
  const w = await world(ACC);
  const titleRow = (m: Node): Node => childNamed(childNamed(m, 'header'), 'titleRow');
  const indicator = (m: Node): Node => (titleRow(m).children as Node[]).find((c) => /^(leading|trailing)Indicator$/.test(String(c.name)))!;
  const sizeOf = (m: Node): string => /size=(\w+)/.exec(String(m.name))?.[1] ?? '';
  const members = membersOf(w.set());
  for (const m of members) {
    if (sizeOf(m) === 'small') continue;
    const n = indicator(m) as Record<string, unknown>;
    let la = n.layoutAlign;
    Object.defineProperty(n, 'layoutAlign', { configurable: true, enumerable: true, get: () => la, set: (v: unknown) => { la = v; if (v === 'STRETCH') n.counterAxisSizingMode = 'FIXED'; } });
  }
  const control = members.find((m) => sizeOf(m) === 'medium')!;
  Object.defineProperty(titleRow(control), 'counterAxisSizingMode', { configurable: true, enumerable: true, get: () => 'FIXED', set: () => {} });
  // The host also holds it STRETCHED where the plan does not stretch it (a designer's stretch). It shares `header`'s
  // row direction, so the stretch would fill its counter axis: only the plan's half of the rule keeps it named, and
  // no `layoutAlign` comparison exists for a part the plan does not stretch (`FIELDS.layoutAlign`).
  Object.defineProperty(titleRow(control), 'layoutAlign', { configurable: true, enumerable: true, get: () => 'STRETCH', set: () => {} });
  // …and its `header`, a row the column root stretches ACROSS, which is the header's primary axis, not its counter one.
  Object.defineProperty(childNamed(control, 'header'), 'counterAxisSizingMode', { configurable: true, enumerable: true, get: () => 'FIXED', set: () => {} });
  // Its record cleared, so the FIXED reads as the host's and not a designer's: the update writes it and records it after.
  (control.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, '');
  // THE OTHER DIRECTION: a stretched axis the plan holds FIXED is never relaxed (#1751: left AUTO, it hugs). An open
  // member's `content`, a column the column root stretches across, held AUTO whatever is written, record cleared too.
  const open = members.find((m) => sizeOf(m) === 'small' && /expansion=expanded/.test(String(m.name)))!;
  Object.defineProperty(childNamed(open, 'content'), 'counterAxisSizingMode', { configurable: true, enumerable: true, get: () => 'AUTO', set: () => {} });
  (open.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, '');
  const outOfDate = (): void => {
    for (const m of membersOf(w.set())) {
      const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
      (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.replace(/\|[^|]*$/, '|0'));
    }
  };
  const want = [`${control.name}/header.counterAxisSizingMode: FIXED (the plan says AUTO)`, `${control.name}/header/titleRow.counterAxisSizingMode: FIXED (the plan says AUTO)`,
    `${open.name}/content.counterAxisSizingMode: AUTO (the plan says FIXED)`].sort();
  outOfDate();
  const first = await confirm(w, [{ def: ACC, plans: w.plans }]);
  const modes = members.map((m) => `${sizeOf(m)}:${String(indicator(m).counterAxisSizingMode)}:${String(indicator(m).layoutAlign)}`);
  ok(members.length === 48 && modes.filter((x) => x === 'small:AUTO:STRETCH').length === 16 && modes.filter((x) => /^(medium|large):FIXED:STRETCH$/.test(x)).length === 32,
    `premise: after the update the host holds the indicator FIXED at medium and large, AUTO at small, stretched at all three (${[...new Set(modes)].join(', ')})`);
  ok(JSON.stringify([...first.res.outcomes[0].content].sort()) === JSON.stringify(want),
    `stretch/verify: the apply's verify names the controls (a header, a titleRow, an open content) and no indicator (${JSON.stringify(first.res.outcomes[0].content.slice(0, 3))})`);
  const current = (await previewUpdate(w.host, [{ def: ACC, plans: w.plans }])).sets[0];
  ok(current.counts.current === 48, `stretch/current: the next dry run reads all 48 current (${JSON.stringify(current.counts)})`);
  // THE DRY RUN COMPARING: every member out of date, so it diffs each one against its plan, by the same predicate.
  outOfDate();
  const second = await confirm(w, [{ def: ACC, plans: w.plans }]);
  const modeLines = second.pre.sets[0].changes.filter((c) => /SizingMode$/.test(c.field)).map((c) => `${c.part}.${c.field}: ${c.from} → ${c.to} × ${c.members}`).sort();
  ok(JSON.stringify(modeLines) === JSON.stringify(['content.counterAxisSizingMode: AUTO → FIXED × 1', 'header.counterAxisSizingMode: FIXED → AUTO × 1', 'header/titleRow.counterAxisSizingMode: FIXED → AUTO × 1']),
    `stretch/dry run: the dry run lists the same three controls and no indicator (${JSON.stringify(modeLines)})`);
  ok(JSON.stringify([...second.res.outcomes[0].content].sort()) === JSON.stringify(want), `stretch/agree: the apply's verify names the same three nodes (${JSON.stringify(second.res.outcomes[0].content.slice(0, 3))})`);
  // A NODE THAT LOST ITS STRETCH IS COMPARED RAW: the host holds INHERIT where the plan stretches it, and FIXED,
  // whatever is written (its record cleared, as the control's was).
  const lost = members.find((m) => sizeOf(m) === 'large')!;
  const ind = indicator(lost) as Record<string, unknown>;
  Object.defineProperty(ind, 'layoutAlign', { configurable: true, enumerable: true, get: () => 'INHERIT', set: () => {} });
  Object.defineProperty(ind, 'counterAxisSizingMode', { configurable: true, enumerable: true, get: () => 'FIXED', set: () => {} });
  (lost.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, '');
  const lostAt = String(ind.name);
  outOfDate();
  const third = await confirm(w, [{ def: ACC, plans: w.plans }]);
  const thirdModes = third.pre.sets[0].changes.filter((c) => /SizingMode$/.test(c.field)).map((c) => `${c.part}.${c.field}: ${c.from} → ${c.to} × ${c.members}`).sort();
  ok(JSON.stringify(thirdModes) === JSON.stringify(['content.counterAxisSizingMode: AUTO → FIXED × 1', 'header.counterAxisSizingMode: FIXED → AUTO × 1', 'header/titleRow.counterAxisSizingMode: FIXED → AUTO × 1', `header/titleRow/${lostAt}.counterAxisSizingMode: FIXED → AUTO × 1`].sort())
    && third.res.outcomes[0].content.includes(`${lost.name}/header/titleRow/${lostAt}.counterAxisSizingMode: FIXED (the plan says AUTO)`),
    `stretch/lost: an indicator the host no longer stretches is listed by the dry run and named by the verify (${JSON.stringify(thirdModes)}; ${JSON.stringify(third.res.outcomes[0].content.slice(0, 4))})`);
}

section('group labels — a group built with its FieldLabel fixed exposes emphasis and weight in place, bold kept (#2748, owner Q348 A)');
for (const G of ['checkbox-group', 'radio-group', 'segmented-control']) {
  // THE FILE AS A BUILD AT MAIN BEFORE #2748 LEFT IT: the label nested `nest-fixed` at the same coordinate, nothing
  // exposed. Reconstructed from today's def by putting that one fact back, so both sides are the real def's projection.
  const now = componentDefs.find((x) => x.id === G)!;
  const label = now.anatomy.parts.label;
  const nesting = label.nesting as { kind: string; variant: Record<string, string>; follow?: readonly string[] };
  const before2748 = { ...now, anatomy: { ...now.anatomy, parts: { ...now.anatomy.parts, label: { ...label, nesting: { kind: 'nest-fixed', variant: nesting.variant, follow: nesting.follow } } } } } as typeof now;
  const oldPlans = figmaAnatomySet(before2748, { swapTarget: SWAP_TARGET });
  const newPlans = plansOf(G);
  // FieldLabel's real set in the file, so each label instances a MEMBER and its coordinate is readable off the host.
  const w = await world(G, oldPlans, { fileSets: [{ name: 'field-label', variants: plansOf('field-label').map(planComponentName) }] });
  const labelOf = (m: Node): Node => childNamed(m, 'label');
  // The member count each set holds, typed here: the two groups are status × size since #2751 (owner Q354).
  const N = ({ 'checkbox-group': 6, 'radio-group': 6, 'segmented-control': 3 } as Record<string, number>)[G];
  const n = membersOf(w.set()).length;
  ok(n === N && membersOf(w.set()).every((m) => labelOf(m)?.isExposedInstance === false),
    `${G}/premise: the file holds ${n} members built before #2748, each nested label not exposed`);
  const before = identityOf(w.set());
  const labelIds = new Map(membersOf(w.set()).map((m) => [String(m.name), String(labelOf(m).id)] as const));
  const { pre, res } = await confirm(w, [{ def: G, plans: newPlans }]);
  const p = pre.sets[0];
  ok(p.counts.update === N && p.counts.add === 0 && p.counts.drop === 0 && !p.blockers.length && !p.replacements.length,
    `${G}/dry run: all ${N} members read update, none added, dropped or replaced, nothing refused (${JSON.stringify(p.counts)}, ${p.blockers.join('; ') || 'no blockers'})`);
  const v = applyVerdict(res);
  ok(v.ok, `${G}/verdict: ${v.headline} (${v.lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const after = identityOf(w.set());
  const moved = [...before.members].filter(([name, b]) => after.members.get(name)?.key !== b.key || after.members.get(name)?.id !== b.id).map(([x]) => x);
  ok(JSON.stringify(after.set) === JSON.stringify(before.set) && moved.length === 0 && after.members.size === N,
    `${G}/kept: the set and all ${N} members keep their keys and ids (${moved.join('; ') || 'none moved'})`);
  const lost = [...before.members].filter(([name, b]) => [...b.kids].some(([path, id]) => after.members.get(name)?.kids.get(path) !== id)).map(([x]) => x);
  ok(lost.length === 0 && membersOf(w.set()).every((m) => String(labelOf(m).id) === labelIds.get(String(m.name))),
    `${G}/ids: every node under every member, the nested label included, keeps its id (${lost.join('; ') || 'all kept'})`);
  // The exposure and the look, read off the shim's nodes. The weight is typed here from Q348 A: bold stays.
  const read = membersOf(w.set()).map((m) => ({ m: String(m.name), exposed: labelOf(m).isExposedInstance, main: String((labelOf(m).mainComponent as { name?: string } | undefined)?.name) }));
  ok(read.every((x) => x.exposed === true), `${G}/exposed: every member's nested label is now an exposed instance (${read.filter((x) => x.exposed !== true).map((x) => x.m).join('; ') || `all ${N}`})`);
  ok(read.every((x) => /emphasis=primary/.test(x.main) && /weight=bold/.test(x.main) && x.main.includes(`size=${/size=(\w+)/.exec(x.m)?.[1]}`)),
    `${G}/bold kept: every label instances the primary (#3200), bold member at its group's size (${[...new Set(read.map((x) => x.main))].join(' | ')})`);
  const post = (await previewUpdate(w.host, [{ def: G, plans: newPlans }])).sets[0];
  ok(post.counts.current === N && post.handEdits.length === 0, `${G}/current: the next dry run reads all ${N} current (${JSON.stringify(post.counts)})`);
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
  const w = await world(LIST, old, { componentProps: { 'list-item': { 'text#7:1': { type: 'TEXT', defaultValue: 'List item' }, [NUM]: { type: 'TEXT', defaultValue: '1.' } } } });
  // List's items sit in its `items` slot (#2649), three of them, so each is found at any depth under the member.
  const deep = (n: Node, name: string): Node | undefined => ((n.children as Node[] | undefined) ?? []).map((c) => (c.name === name ? c : deep(c, name))).find(Boolean);
  const items = (m: Node): Node[] => [1, 2, 3].map((i) => deep(m, `item${i}`)!);
  const numberOf = (n: Node): unknown => (n.componentProperties as Record<string, { value: unknown }>)[NUM]?.value;
  ok(membersOf(w.set()).every((m) => items(m).every((n) => numberOf(n) === '1.')), 'premise: as built, every item of every member reads "1."');
  // A designer's own number on ONE item of ONE member, typed before the update.
  const edited = membersOf(w.set())[0];
  (items(edited)[1].setProperties as (p: Record<string, string>) => void)({ [NUM]: '2)' });
  const before = identityOf(w.set());
  const { pre, res } = await confirm(w, [{ def: LIST, plans: planned }]);
  const set0 = pre.sets[0];
  const fields = new Set(set0.changes.map((c) => `${c.part}:${c.field}`));
  ok([2, 3].every((i) => fields.has(`items/item${i}:nestOverrides`)) && !fields.has('items/item1:nestOverrides') && set0.replacements.length === 0,
    `overrides/dry run: the dry run lists the override on items 2 and 3 as a change, not on item 1, and replaces nothing (${[...fields].filter((f) => f.endsWith('nestOverrides')).join(', ')}; ${set0.replacements.length} replacements)`);
  ok(set0.handEdits.some((h) => h.member === String(edited.name) && h.path === 'items/item2'),
    `overrides/hand edit reported: the typed number reads as a hand edit (${JSON.stringify(set0.handEdits).slice(0, 200)})`);
  ok(applyVerdict(res).ok, `overrides/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
  const wrong = membersOf(w.set()).flatMap((m) => items(m).map((n, i) => {
    const want = m === edited && i === 1 ? '2)' : `${i + 1}.`;
    return numberOf(n) === want ? null : `${String(m.name)}/item${i + 1}=${String(numberOf(n))} (want ${want})`;
  })).filter(Boolean);
  ok(wrong.length === 0, `overrides/written in place: every item now reads its own number, "1." to "3.", and the hand-typed "2)" is kept (${wrong.length} off: ${wrong.slice(0, 3).join('; ')})`);
  const after = identityOf(w.set());
  ok([...before.members].every(([name, b]) => after.members.get(name)?.key === b.key && [...b.kids].every(([p, id]) => after.members.get(name)?.kids.get(p) === id)),
    'overrides/ids: every member and every nested item keeps its key and id: nothing was rebuilt');
  const post = (await previewUpdate(w.host, [{ def: LIST, plans: planned }])).sets[0];
  ok(post.counts.update === 0 && post.counts.current === 8 && post.handEdits.some((h) => h.member === String(edited.name) && h.path === 'items/item2'),
    `overrides/current: the next dry run reads the other 8 members current and still reports the hand edit (${JSON.stringify(post.counts)}; ${JSON.stringify(post.changes).slice(0, 200)})`);
}

/* ── the fields' nested label (#2738) ───────────────────────────────────────────────────────────────── */
section("label dims — a field built while its label read at rest on every member dims it on the disabled members in place (#2738)");
{
  // THE FILE AS A BUILD BEFORE #2738 LEFT IT: every member's nested FieldLabel at `state=rest`. Reconstructed from
  // today's plans by putting that one fact back, so both sides are the real def's projection. FieldLabel is in the
  // file as a SET (its members named by coordinate, typed here), so the instance resolves to a member and an update
  // can only reach the disabled one by swapping it.
  const LABEL_MEMBERS = ['medium', 'small', 'large'].flatMap((size) => ['primary', 'secondary'].flatMap((emphasis) => ['regular', 'bold'].flatMap((weight) =>
    ['rest', 'disabled'].map((state) => `size=${size}, emphasis=${emphasis}, weight=${weight}, state=${state}`))));
  const atRest = (n: PlanNode): PlanNode => ({
    ...n,
    ...((n as { nestTarget?: string }).nestTarget === 'field-label' ? { nestVariant: { ...(n as { nestVariant: Record<string, string> }).nestVariant, state: 'rest' } } : {}),
    children: (n.children ?? []).map(atRest),
  } as PlanNode);
  const labelOf = (m: Node): Node | undefined => {
    const walk = (n: Node): Node | undefined => n.name === 'label' && n.type === 'INSTANCE' ? n : ((n.children as Node[] | undefined) ?? []).map(walk).find(Boolean);
    return walk(m);
  };
  const stateOf = (n: Node | undefined): string => /state=([a-z-]+)/.exec(String((n?.mainComponent as { name?: string } | undefined)?.name ?? ''))?.[1] ?? '(none)';
  for (const id of ['text-field', 'password-field', 'select', 'textarea']) {
    const planned = plansOf(id);
    const old = planned.map((p) => ({ ...p, root: atRest(p.root) }));
    // The Password field's Show button sets its own text, so the file's Button declares its `label` TEXT property.
    const componentProps = id === 'password-field' ? { button: { 'label#7:1': { type: 'TEXT', defaultValue: 'Button' } } } : undefined;
    const w = await world(id, old, { fileSets: [{ name: 'field-label', variants: LABEL_MEMBERS }], componentProps });
    const members = membersOf(w.set());
    const disabled = (m: Node): boolean => String(m.name).split(', ').includes('state=disabled');
    ok(members.length === 84 && members.filter(disabled).length === 12 && members.every((m) => stateOf(labelOf(m)) === 'rest'),
      `premise: the ${id} file holds 84 members, 12 disabled, each label instancing FieldLabel at state=rest (${members.length}; ${[...new Set(members.map((m) => stateOf(labelOf(m))))].join(', ')})`);
    const labelIds = new Map(members.map((m) => [String(m.name), String(labelOf(m)?.id)] as const));
    const before = identityOf(w.set());
    const { pre, res } = await confirm(w, [{ def: id, plans: planned }]);
    const p = pre.sets[0];
    ok(p.counts.update === 12 && p.counts.current === 72 && p.counts.add + p.counts.drop === 0 && !p.blockers.length && !p.replacements.length,
      `${id} label/dry run: the 12 disabled members read update, the other 72 current, nothing added, dropped or replaced (${JSON.stringify(p.counts)}; ${p.replacements.length} replacements)`);
    const v = applyVerdict(res);
    ok(v.ok, `${id} label/verdict: ${v.headline} (${v.lines.slice(0, 2).join(' | ').slice(0, 240)})`);
    const wrong = membersOf(w.set()).filter((m) => stateOf(labelOf(m)) !== (disabled(m) ? 'disabled' : 'rest')).map((m) => `${String(m.name)}=${stateOf(labelOf(m))}`);
    ok(wrong.length === 0, `${id} label/dimmed: the label instances FieldLabel at state=disabled on the 12 disabled members and at state=rest on the 72 others (${wrong.length} off: ${wrong.slice(0, 2).join('; ')})`);
    const after = identityOf(w.set());
    const moved = membersOf(w.set()).filter((m) => String(labelOf(m)?.id) !== labelIds.get(String(m.name))
      || after.members.get(String(m.name))?.key !== before.members.get(String(m.name))?.key).map((m) => String(m.name));
    ok(moved.length === 0 && JSON.stringify(after.set) === JSON.stringify(before.set),
      `${id} label/in place: the set, every member's key and every label instance's id are kept, so the label was swapped, not rebuilt (${moved.slice(0, 2).join('; ') || 'all 84'})`);
    const post = (await previewUpdate(w.host, [{ def: id, plans: planned }])).sets[0];
    ok(post.counts.current === 84, `${id} label/current: the next dry run reads all 84 current (${JSON.stringify(post.counts)})`);
  }
}

section('label leads — every field host built with its FieldLabel at emphasis=secondary takes primary in place, ids and hand edits kept (#3200, owner Q-PH1 A)');
{
  // THE FILE AS A BUILD BEFORE #3200 LEFT IT: every host's nested FieldLabel at `emphasis=secondary`. Reconstructed from
  // today's plans by putting that one fact back, so both sides are the real def's projection. FieldLabel is in the file
  // as a SET, its members under their coordinates, so the instance resolves to a member and an update can reach the
  // primary one only by swapping it. TWO HAND EDITS, on two members: the label instance itself (its opacity), which the
  // update must leave as the designer left it (owner decision Q1: keep and report), and the member's own root, which
  // holds that node only, so the label under it still takes primary. Expected values are literals typed here.
  // Mutations, each failing the arm it names: the def's nested emphasis left at secondary → `<host> leads/premise`
  // (nothing to update); the executor's in-place `swapComponent` skipped → `<host> leads/primary`; the `kept` check
  // dropped from the nested-instance path → `<host> leads/hand edit kept`.
  const HOSTS = ['text-field', 'password-field', 'search-field', 'card-number-field', 'textarea', 'select', 'code-input', 'counter', 'checkbox-group', 'radio-group', 'segmented-control', 'slider'];
  const LABEL_MEMBERS = plansOf('field-label').map(planComponentName);
  const HARNESS_LIMITED = ['card-number-field', 'code-input', 'counter', 'slider'];
  const atSecondary = (n: PlanNode): PlanNode => ({
    ...n,
    ...((n as { nestTarget?: string }).nestTarget === 'field-label' ? { nestVariant: { ...(n as { nestVariant: Record<string, string> }).nestVariant, emphasis: 'secondary' } } : {}),
    children: (n.children ?? []).map(atSecondary),
  } as PlanNode);
  const labelOf = (m: Node): Node | undefined => {
    const walk = (n: Node): Node | undefined => n.name === 'label' && n.type === 'INSTANCE' ? n : ((n.children as Node[] | undefined) ?? []).map(walk).find(Boolean);
    return walk(m);
  };
  const emphasisOf = (n: Node | undefined): string => /emphasis=([a-z]+)/.exec(String((n?.mainComponent as { name?: string } | undefined)?.name ?? ''))?.[1] ?? '(none)';
  for (const id of HOSTS) {
    const planned = plansOf(id);
    const old = planned.map((p) => ({ ...p, root: atSecondary(p.root) }));
    const componentProps = id === 'password-field' ? { button: { 'label#7:1': { type: 'TEXT', defaultValue: 'Button' } } } : undefined;
    const allowMisses: string[] = [];
    const w = await world(id, old, { fileSets: [{ name: 'field-label', variants: LABEL_MEMBERS }], componentProps, allowMisses });
    const members = membersOf(w.set());
    const labelled = members.filter((m) => !!labelOf(m));
    ok(labelled.length > 0 && labelled.every((m) => emphasisOf(labelOf(m)) === 'secondary') && planned.some((p) => /"emphasis":"primary"/.test(JSON.stringify(p.root))),
      `${id} leads/premise: the file's ${labelled.length} labels instance FieldLabel at emphasis=secondary, and today's plans nest it at primary (${[...new Set(labelled.map((m) => emphasisOf(labelOf(m))))].join(', ')}; ${allowMisses.length} build misses)`);
    // The two hand edits, on the first two labelled members.
    const [onLabel, onRoot] = labelled;
    (labelOf(onLabel) as Record<string, unknown>).opacity = 0.5;
    if (onRoot) (onRoot as Record<string, unknown>).opacity = 0.9;
    const labelIds = new Map(labelled.map((m) => [String(m.name), String(labelOf(m)?.id)] as const));
    const before = identityOf(w.set());
    const { pre, res } = await confirm(w, [{ def: id, plans: planned }]);
    const p = pre.sets[0];
    ok(!!p && !p.blockers.length && p.counts.add + p.counts.drop === 0 && !p.replacements.length && p.counts.update + p.counts.handEdited === labelled.length,
      `${id} leads/dry run: every labelled member reads update or hand-edited, nothing added, dropped, replaced or refused (${JSON.stringify(p?.counts)}; ${p?.blockers.join('; ') || 'no blockers'})`);
    // FOUR HOSTS' NESTED PARTS take overrides this harness's file cannot hold (a nested set's own TEXT and SWAP
    // properties, the card mark's aspect lock), so their verify lists those fields on every member, before and after
    // this change alike. For them the arm is that no listed field is the label's; for the other eight, a clean verdict.
    const v = applyVerdict(res);
    const labelFaults = res.outcomes[0].content.filter((c) => /(^|\/)label[./]/.test(c.split(':')[0]));
    ok(HARNESS_LIMITED.includes(id) ? labelFaults.length === 0 && res.outcomes[0].content.length > 0 : v.ok && res.outcomes[0].content.length === 0,
      `${id} leads/verdict: ${HARNESS_LIMITED.includes(id) ? `no field the verify lists is the label's (${res.outcomes[0].content.length} listed, ${labelFaults.length} on the label${labelFaults.length ? `: ${labelFaults[0]}` : ''})` : `${v.headline} (${v.lines.slice(0, 2).join(' | ').slice(0, 240)})`}`);
    const wrong = labelled.filter((m) => m !== onLabel && emphasisOf(labelOf(m)) !== 'primary').map((m) => `${String(m.name)}=${emphasisOf(labelOf(m))}`);
    ok(wrong.length === 0 && labelled.length > 1, `${id} leads/primary: every other member's label now instances FieldLabel at emphasis=primary, the root-edited member's included (${wrong.length} off: ${wrong.slice(0, 2).join('; ')})`);
    ok(emphasisOf(labelOf(onLabel)) === 'secondary' && labelOf(onLabel)?.opacity === 0.5 && (onRoot as Record<string, unknown>).opacity === 0.9
      && res.outcomes[0].kept.some((k) => k.member === String(onLabel.name)) && res.outcomes[0].kept.some((k) => k.member === String(onRoot.name) && k.path === '.'),
      `${id} leads/hand edit kept: the hand-edited label keeps its opacity and its secondary member, the hand-edited root keeps its opacity, and both are listed as kept (${emphasisOf(labelOf(onLabel))}, ${String(labelOf(onLabel)?.opacity)}, ${String((onRoot as Record<string, unknown>).opacity)}; kept ${JSON.stringify(res.outcomes[0].kept.map((k) => `${k.member}:${k.path}`)).slice(0, 200)})`);
    const after = identityOf(w.set());
    const moved = labelled.filter((m) => String(labelOf(m)?.id) !== labelIds.get(String(m.name)) || after.members.get(String(m.name))?.key !== before.members.get(String(m.name))?.key || after.members.get(String(m.name))?.id !== before.members.get(String(m.name))?.id).map((m) => String(m.name));
    ok(moved.length === 0 && JSON.stringify(after.set) === JSON.stringify(before.set) && after.members.size === before.members.size,
      `${id} leads/in place: the set, every member's key and id, and every label instance's id are kept, so the label was swapped, not rebuilt (${moved.slice(0, 2).join('; ') || `all ${labelled.length}`})`);
  }
}

section('state props — the Rows and Textarea gaining their state props (#2708, owner Q351 A) leave a built file current');
for (const [D, gained] of [['checkbox-row', ['disabled']], ['radio-row', ['disabled', 'readOnly']], ['switch-row', ['disabled']], ['textarea', ['label', 'onChange', 'helpText', 'required', 'disabled', 'readOnly', 'isPending', 'id', 'name']]] as const) {
  // THE FILE AS A BUILD AT MAIN BEFORE #2708 LEFT IT: today's def with the gained props taken back out. The props
  // are code API, so the Figma projection must not move: Update over that file has nothing to correct, and must
  // say so rather than rewrite every member.
  const now = componentDefs.find((x) => x.id === D)!;
  const before2708 = { ...now, props: now.props.filter((p) => !(gained as readonly string[]).includes(p.name)) } as typeof now;
  ok(before2708.props.length === now.props.length - gained.length, `${D}/premise: the def at main lacked ${gained.join(', ')}`);
  const w = await world(D, figmaAnatomySet(before2708, { swapTarget: SWAP_TARGET }));
  const dump = (): string => JSON.stringify(membersOf(w.set()).map((m) => [m.name, m.id, m.key, [...(m._pluginData as Map<string, string>)]]));
  const was = dump();
  const { pre, res } = await confirm(w, [{ def: D, plans: plansOf(D) }]);
  const p = pre.sets[0];
  ok(p.counts.update === 0 && p.counts.add === 0 && p.counts.drop === 0 && p.counts.current === p.counts.members && p.counts.members > 0,
    `${D}/dry run: every member reads current (${JSON.stringify(p.counts)})`);
  ok(applyVerdict(res).headline === '✓ already up to date' && w.api._versions.length === 0 && dump() === was,
    `${D}/nothing written: no version, every member's id, key, stamp and record as built (${applyVerdict(res).headline})`);
}

/* ── published ───────────────────────────────────────────────────────────────────────────────────────── */
section('published — on a set in a team library, what breaks consumer files is listed on its own, and named at the confirm (#2831)');
{
  // One plan change carrying every breaking class a plan can: the members at state=rest dropped, and the leading icon
  // turned into a plain frame, which replaces that layer on every member and removes its swap property.
  const breakingPlans = (plans: AnatomyPlan[]): AnatomyPlan[] => plans.filter((p) => !planComponentName(p).includes('state=rest')).map((p) => {
    const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
    const lv = planChild(planChild(q.root, 'content'), 'leadingVisual') as unknown as Record<string, unknown>;
    lv.type = 'FRAME';
    for (const k of ['swapTarget', 'propertyRef', 'descendantFills']) delete lv[k];
    return q;
  });
  const HEAD = /^Breaks library consumers: /;
  const SWAP = '↳ swap leading icon';

  // NOTHING CHANGES FOR AN UNPUBLISHED SET.
  {
    const w = await world(TAG);
    const status = await (w.set().getPublishStatusAsync as () => Promise<string>)();
    ok(status === 'UNPUBLISHED', `premise: a set never published answers UNPUBLISHED (${status})`);
    const next = breakingPlans(w.plans);
    const { pre, res } = await confirm(w, [{ def: TAG, plans: next }]);
    const p = pre.sets[0];
    ok(p.drops.length > 0 && p.replacements.length > 0 && p.properties.remove.length > 0, `premise: the plan drops, replaces and removes a property (${p.drops.length}, ${p.replacements.length}, ${p.properties.remove.length})`);
    const v = previewVerdict(pre);
    const a = applyVerdict(res);
    ok(p.publish === undefined && p.breaking === undefined && !v.lines.some((l) => HEAD.test(l)) && !/library consumers/.test(v.headline)
      && !a.lines.some((l) => HEAD.test(l)) && !/library consumers/.test(a.headline) && res.outcomes[0]?.breaking === undefined,
      `published/unpublished no-op: no publish status, no breaking list, no section and no headline clause in the check or the confirm (${v.headline} | ${a.headline})`);
  }

  // A PUBLISHED SET: every class listed by name, in its own section, in the headline, and at the confirm.
  {
    const w = await world(TAG);
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CURRENT');
    const next = breakingPlans(w.plans);
    const dropped = w.plans.filter((p) => planComponentName(p).includes('state=rest')).map(planComponentName);
    const { pre, res } = await confirm(w, [{ def: TAG, plans: next }]);
    const p = pre.sets[0];
    const b = p.breaking ?? [];
    ok(p.publish === 'CURRENT', `published/status: the check reads the set's publish status (${p.publish})`);
    ok(dropped.length > 0 && dropped.every((m) => b.some((x) => x.kind === 'drop' && x.member === m)),
      `published/drop: each of the ${dropped.length} dropped members is listed as breaking, by name (${b.filter((x) => x.kind === 'drop').length})`);
    const reps = b.filter((x) => x.kind === 'replace' && x.path === 'content/leadingVisual');
    ok(reps.length === next.length, `published/replace: the leading icon's replacement is listed on each of the ${next.length} members kept (${reps.length})`);
    ok(b.some((x) => x.kind === 'property' && x.name === SWAP && x.change === 'removed'), `published/property removed: the swap property's removal is listed (${JSON.stringify(b.filter((x) => x.kind === 'property'))})`);
    const v = previewVerdict(pre);
    const head = v.lines.find((l) => HEAD.test(l)) ?? '';
    ok(head === `Breaks library consumers: ${b.length} changes in 1 published set, passed on at the next library publish.`
      && v.lines.includes(`${TAG} · property ${SWAP} · removed — consumer overrides of it are dropped.`)
      && v.lines.includes(`${TAG} · ${dropped[0]} · dropped — consumer instances of it point at a deprecated member.`),
      `published/section: the check's own section heads the breaking changes and names them (${head})`);
    ok(v.headline.endsWith(` · ${b.length} changes break library consumers`), `published/headline: the check's headline counts them (${v.headline})`);
    const a = applyVerdict(res);
    ok(res.outcomes[0]?.breaking?.length === b.length && a.lines.includes(`Breaks library consumers: ${b.length} changes made in 1 published set, passed on at the next library publish.`)
      && a.lines.includes(`${TAG} · ${dropped[0]} · dropped — consumer instances of it point at a deprecated member.`) && a.headline.endsWith(` · ${b.length} changes break library consumers`),
      `published/confirm: the confirm names what it broke (${a.headline} | ${a.lines.find((l) => HEAD.test(l))})`);
  }

  // CHANGED is published too; a retyped property and a rename to a private name are breaking; between private names not.
  {
    const w = await world(TAG);
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CHANGED');
    const view = await readSetView(w.set() as never);
    ok(view.publish === 'CHANGED', `published/changed: the view reads CHANGED (${view.publish})`);
    const ports = await hostPorts(w.host as unknown as UpdateHost);
    const defs = { ...view.definitions! };
    const label = Object.keys(defs).find((k) => k.startsWith('label#'))!;
    defs[label] = { ...defs[label], type: 'BOOLEAN' };
    const p = dryRunSet(TAG, w.plans, { ...view, definitions: defs }, ports);
    const b = breakingOf(p);
    ok(b.some((x) => x.kind === 'property' && x.name === 'label' && x.change === 'retyped' && x.from === 'BOOLEAN' && x.to === 'TEXT'),
      `published/retype: a property the plan retypes is listed (${JSON.stringify(b)})`);
    const priv = breakingOf({ ...p, setRename: { from: TAG, to: `_${TAG}` } }).filter((x) => x.kind === 'private');
    const dot = breakingOf({ ...p, setRename: { from: TAG, to: `.${TAG}` } }).filter((x) => x.kind === 'private');
    const both = breakingOf({ ...p, setRename: { from: `_${TAG}`, to: `_${TAG}-item` } }).filter((x) => x.kind === 'private');
    ok(priv.length === 1 && dot.length === 1 && both.length === 0
      && breakingLine(TAG, priv[0]) === `${TAG} · renamed ${TAG} → _${TAG} — a name starting with _ or . is not published, so the set leaves the library.`,
      `published/private rename: a rename to a _ or . name is listed, one between two such names is not (${priv.length}, ${dot.length}, ${both.length})`);
    const quiet = breakingOf({ ...p, publish: undefined, setRename: { from: TAG, to: `_${TAG}` } });
    ok(quiet.length === 0, `published/unpublished rename: on a set not published, the same rename and retype list nothing (${quiet.length})`);
    // A set the update refuses changes nothing, so nothing on it breaks, however much its plan would.
    const refused = breakingOf({ ...p, blockers: ['the set is refused'] });
    ok(b.length > 0 && refused.length === 0, `published/blocked: a published set the update refuses lists nothing as breaking (${b.length} → ${refused.length})`);
    // A replacement of the member itself is refused for that member, so it is not a change consumers get.
    const self = breakingOf({ ...p, replacements: [{ member: 'size=small', path: '.', reason: 'the member itself' }, { member: 'size=small', path: 'content/label', reason: 'a layer' }] })
      .filter((x) => x.kind === 'replace');
    ok(self.length === 1 && self[0].kind === 'replace' && self[0].path === 'content/label',
      `published/member replaced: a replacement of the member itself (path .) is not listed, one of a layer is (${JSON.stringify(self)})`);
    // THE PER-SET CAP (Q435 A, the copy as built): at most 8 lines per set, then one overflow line counting the rest. The
    // 8 and the wording are literals typed from the approved copy, never read off `DIFFERENCE_LINES` or `breakingSection`.
    const many = Array.from({ length: 11 }, (_, i) => ({ kind: 'drop' as const, member: `size=s${i}` }));
    const few = [{ kind: 'drop' as const, member: 'size=a' }, { kind: 'drop' as const, member: 'size=b' }];
    const capped = breakingSection([{ set: TAG, breaking: many }, { set: 'other', breaking: few }], false);
    const wantCap = [
      'Breaks library consumers: 13 changes in 2 published sets, passed on at the next library publish.',
      ...many.slice(0, 8).map((d) => `${TAG} · ${d.member} · dropped — consumer instances of it point at a deprecated member.`),
      `${TAG}: 3 more breaking changes not listed.`,
      ...few.map((d) => `other · ${d.member} · dropped — consumer instances of it point at a deprecated member.`),
    ];
    ok(JSON.stringify(capped) === JSON.stringify(wantCap),
      `published/cap: each set lists at most 8 breaking changes, then "N more breaking changes not listed." (${capped.length} lines: ${JSON.stringify(capped.slice(9))})`);
  }

  // A LAYER REMOVED AND RE-ADDED (#2864): Tag built while its check layer was `check`, updated to plans naming it
  // `checkGlyph` with no ledger entry. The update removes `check` and adds `checkGlyph` on every selected member, so on a
  // published set consumer overrides on `check` are lost; with the shipped `part` entry it is renamed in place and
  // nothing is listed. The names and the 15 are the test's own literals.
  {
    const planned = plansOf(TAG);
    const old = planned.map((p) => JSON.parse(JSON.stringify(p).split('"checkGlyph"').join('"check"')) as AnatomyPlan);
    const CHECK = 'content/labelCheck/check';
    const layerOf = (b: readonly Breaking[] | undefined) => (b ?? []).filter((x): x is Extract<Breaking, { kind: 'layer' }> => x.kind === 'layer');
    const quiet = await world(TAG, old);
    const qp = (await previewUpdate(quiet.host, [{ def: TAG, plans: planned }], undefined, [])).sets[0];
    ok(qp.changes.some((c) => c.part === CHECK && c.to.startsWith('removed')) && qp.breaking === undefined && breakingOf(qp).length === 0,
      `published/layer unpublished: on a set not published, the removed layer is a change and nothing is listed as breaking (${JSON.stringify(qp.breaking ?? null)})`);
    const w = await world(TAG, old);
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CURRENT');
    const p = (await previewUpdate(w.host, [{ def: TAG, plans: planned }], undefined, [])).sets[0];
    const lay = layerOf(p.breaking);
    // A missing entry fails the arms below by name rather than throwing.
    const one: Extract<Breaking, { kind: 'layer' }> = lay[0] ?? { kind: 'layer', path: '(none listed)', members: 0 };
    ok(lay.length === 1 && lay[0].path === CHECK && lay[0].members === 15 && JSON.stringify(lay[0].added) === JSON.stringify(['checkGlyph']),
      `published/layer removed: the removed layer is listed once, on its 15 members, beside the layer added in its place (${JSON.stringify(lay)})`);
    ok(breakingLine(TAG, one) === `${TAG} · ${CHECK} · removed from 15 members — consumer overrides on it are lost. If checkGlyph is this layer renamed, declare the rename and the update renames it in place.`,
      `published/layer line: the line names the layer, what is lost and the in-place fix (${breakingLine(TAG, one)})`);
    ok(previewVerdict({ sets: [p], missing: [], refused: [] }).lines.includes(breakingLine(TAG, one)), 'published/layer section: the check\'s section carries the line');
    // The checklist's set (`checkedSetOf`, what `main.ts` posts): the published set carries its line, the unpublished none.
    const LINE = 'Breaks library consumers: 1 layer removed: consumer overrides on it are lost; a declared rename keeps a renamed layer in place.';
    ok(checkedSetOf(p, TAG).breaks === LINE && !('breaks' in checkedSetOf(qp, TAG)),
      `published/checklist set: the checked set posted for the checklist carries the published set's line, and the unpublished set's none (${checkedSetOf(p, TAG).breaks} | ${checkedSetOf(qp, TAG).breaks})`);
    const shipped = (await previewUpdate(w.host, [{ def: TAG, plans: planned }])).sets[0];
    ok(shipped.publish === 'CURRENT' && layerOf(shipped.breaking).length === 0, `published/layer declared: with the shipped part entry the layer is renamed in place and nothing is listed (${JSON.stringify(shipped.breaking ?? null)})`);
  }
  // A LAYER ADDED BY HAND is not in the plan either, but the update skips its member whole (§5), so nothing is removed.
  {
    const w = await world(TAG);
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CURRENT');
    const extra = (w.api.createFrame as () => Node)();
    extra.name = 'designer note';
    (membersOf(w.set())[7].appendChild as (c: Node) => void)(extra);
    const p = (await previewUpdate(w.host, [{ def: TAG, plans: w.plans }])).sets[0];
    ok(p.changes.some((c) => c.part === 'designer note' && c.to.startsWith('removed')) && p.handEdits.some((h) => h.path === 'designer note' && h.structural) && p.breaking === undefined,
      `published/layer hand-added: a layer added by hand, whose member the update skips, is not listed as breaking (${JSON.stringify(p.breaking ?? null)})`);
  }

  // A SET RENAMED TO A PRIVATE NAME, through the ledger as an update would meet it: the set is found under its old name
  // and the rename to `_tag` is listed as breaking on a published set, and not on an unpublished one.
  {
    const PRIV = `_${TAG}`;
    const ledger = [{ def: TAG, kind: 'def' as const, to: PRIV, issue: 2831 }];
    const planned = plansOf(TAG).map((p) => ({ ...JSON.parse(JSON.stringify(p)), component: PRIV }) as AnatomyPlan);
    const quiet = await world(TAG);
    const qp = (await previewUpdate(quiet.host, [{ def: PRIV, plans: planned }], undefined, ledger)).sets[0];
    ok(qp?.setRename?.to === PRIV && qp.breaking === undefined, `published/private unpublished: the rename to ${PRIV} on a set not published lists nothing (${JSON.stringify(qp?.setRename)}, ${JSON.stringify(qp?.breaking ?? null)})`);
    const w = await world(TAG);
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CURRENT');
    const p = (await previewUpdate(w.host, [{ def: PRIV, plans: planned }], undefined, ledger)).sets[0];
    ok(JSON.stringify(p?.breaking) === JSON.stringify([{ kind: 'private', from: TAG, to: PRIV }]),
      `published/private shim: on a published set the ledger's rename to ${PRIV} is listed as breaking, and nothing else (${JSON.stringify(p?.breaking ?? null)})`);
  }

  // THE CHECKLIST LINE (#2831): one line per published set, each case named with what breaks and what the update does.
  {
    const all: Breaking[] = [
      { kind: 'private', from: TAG, to: `_${TAG}` },
      { kind: 'drop', member: 'size=a' }, { kind: 'drop', member: 'size=b' },
      { kind: 'property', name: 'label', change: 'removed' },
      { kind: 'replace', member: 'size=a', path: 'content/x', reason: 'FRAME → TEXT' }, { kind: 'replace', member: 'size=b', path: 'content/x', reason: 'FRAME → TEXT' },
      { kind: 'layer', path: 'content/check', members: 15, added: ['checkGlyph'] },
    ];
    ok(breakingSummary(all) === 'Breaks library consumers: renamed to a name Figma does not publish, so the set leaves the library; 2 members dropped: kept and marked deprecated, so consumer instances still resolve; 1 property removed or retyped: consumer overrides of it are dropped; 1 layer replaced, not updated in place: consumer overrides on it are lost; 1 layer removed: consumer overrides on it are lost; a declared rename keeps a renamed layer in place.',
      `published/checklist line: every case is named in the set's one line (${breakingSummary(all)})`);
    ok(breakingSummary(undefined) === '' && breakingSummary([]) === '', 'published/checklist quiet: a set with nothing breaking has no line');
  }

  // A SINGLE-COMPONENT DEF (the icons, #2296): each component is published on its own, and the def reads as its most
  // published one, CHANGED over CURRENT. The icon set is exactly what a library publish ships (#2831).
  {
    const plans = plansOf('icon');
    const w = await singleWorld(plans);
    const t = { def: 'icon', plans, single: true };
    const read = async () => (await readSingleView(w.host as unknown as UpdateHost, t)).view.publish;
    const none = await read();
    const [one, two] = w.comps();
    (w.api.publish as (n: Node, s: string) => void)(one, 'CURRENT');
    const current = await read();
    (w.api.publish as (n: Node, s: string) => void)(two, 'CHANGED');
    const changed = await read();
    const p = (await previewUpdate(w.host, [t])).sets[0];
    ok(none === 'UNPUBLISHED' && current === 'CURRENT' && changed === 'CHANGED' && p?.publish === 'CHANGED',
      `published/single: a single-component def reads its components' status, CHANGED over CURRENT (${none}, ${current}, ${changed}, check ${p?.publish})`);
  }

  // PUBLISHED BETWEEN THE CHECK AND THE CONFIRM: the confirm is refused, so it never breaks what the check did not name.
  {
    const w = await world(TAG);
    const next = breakingPlans(w.plans);
    const pre = await previewUpdate(w.host, [{ def: TAG, plans: next }]);
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CURRENT');
    const res = await applyUpdate(w.host, w.api as any, [{ def: TAG, plans: next }], previewHashOf(pre));
    ok(!!res.refusedAll && res.outcomes.length === 0, `published/hash: a set published after the check refuses the confirm (${res.refusedAll ?? 'applied'})`);
  }

  // DIALOG GAINS ITS END PLACEMENT (#2877): a published Dialog built before the side sheet, its 20 members (with the fill
  // footer, #2880), updated to the plan with the four `placement=end` members. Adding a variant value is additive, so the
  // check adds exactly those four and lists NOTHING as breaking: no member dropped, renamed or replaced, no property
  // removed or retyped. The member names are literals typed here, never read off the def.
  {
    const next = plansOf('dialog');
    // `before` is derived from this PR's own plans, so this arm proves the end members are additive, not that the 20
    // existing members are unchanged; their identity is pinned by test.ts's literal `#2609 dialog …` arms.
    const before = next.filter((p) => !/placement=end/.test(planComponentName(p)));
    // The nested close's `swap icon` is a property of FlushIconButton.Neutral in a real file; the shim's plain component
    // carries it here, or the build reads the close's swap override as a miss.
    const w = await world('dialog', before, { extraVars: [...new Set(next.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))], componentProps: { 'flush-icon-button-neutral': { 'swap icon#9:1': { type: 'INSTANCE_SWAP', defaultValue: 'icon/close' } } } });
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CURRENT');
    const p = (await previewUpdate(w.host, [{ def: 'dialog', plans: next }])).sets[0];
    const END = ['placement=end, footer=inline, size=medium', 'placement=end, footer=stacked, size=medium', 'placement=end, footer=fill, size=medium', 'placement=end, footer=none, size=medium'];
    ok(before.length === 20 && next.length === 24, `premise: Dialog was 20 members and is 24 with the end placement (${before.length} → ${next.length})`);
    ok(p?.publish === 'CURRENT' && JSON.stringify([...p.adds].sort()) === JSON.stringify([...END].sort()) && p.drops.length === 0 && (p.breaking ?? []).length === 0,
      `published/dialog end additive: the four end members are added and nothing breaks library consumers (adds ${JSON.stringify(p?.adds)}, drops ${p?.drops.length}, breaking ${JSON.stringify((p?.breaking ?? []).slice(0, 3))})`);
  }

  // DIALOG GAINS ITS FILL FOOTER (#2880, Q492 B): a published Dialog built before the fill footer, its 18 members (with
  // the end placement, #2877), updated to the plan with the six `footer=fill` members. Adding a variant value is additive,
  // so the check adds exactly those six and lists NOTHING as breaking: no member dropped, renamed or replaced, no property
  // removed or retyped. The member names are literals typed here, never read off the def.
  {
    const next = plansOf('dialog');
    // `before` is derived from this PR's own plans, so this arm proves the fill members are additive, not that the 18
    // existing members are unchanged; their identity is pinned by test.ts's literal `#2609 dialog …` arms.
    const before = next.filter((p) => !/footer=fill/.test(planComponentName(p)));
    // The nested close's `swap icon` is a property of FlushIconButton.Neutral in a real file; the shim's plain component
    // carries it here, or the build reads the close's swap override as a miss.
    const w = await world('dialog', before, { extraVars: [...new Set(next.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))], componentProps: { 'flush-icon-button-neutral': { 'swap icon#9:1': { type: 'INSTANCE_SWAP', defaultValue: 'icon/close' } } } });
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CURRENT');
    const p = (await previewUpdate(w.host, [{ def: 'dialog', plans: next }])).sets[0];
    const FILL = [
      'placement=center, footer=fill, size=medium', 'placement=center, footer=fill, size=small', 'placement=center, footer=fill, size=large',
      'placement=bottom, footer=fill, size=medium', 'placement=full, footer=fill, size=medium', 'placement=end, footer=fill, size=medium',
    ];
    ok(before.length === 18 && next.length === 24, `premise: Dialog was 18 members and is 24 with the fill footer (${before.length} → ${next.length})`);
    ok(p?.publish === 'CURRENT' && JSON.stringify([...p.adds].sort()) === JSON.stringify([...FILL].sort()) && p.drops.length === 0 && (p.breaking ?? []).length === 0,
      `published/dialog fill additive: the six fill members are added and nothing breaks library consumers (adds ${JSON.stringify(p?.adds)}, drops ${p?.drops.length}, breaking ${JSON.stringify((p?.breaking ?? []).slice(0, 3))})`);
  }

  // LINK GAINS ITS CURRENT PAGE (#2872, owner decisions Q507): a published Link built before the axis existed, its 96
  // members with no `selection`, updated to the plan with `selection` (unselected first) and the
  // 48 current-page members. The update gives every existing member `selection=unselected` in place (§2: an added axis
  // lands on the first plan's value) and adds the 48 selected standalone members; it lists NOTHING as breaking library
  // consumers (#2839's `breakingOf`): no member dropped or replaced, no property removed or retyped. Applied, each of the
  // 96 keeps its node id and key, so consumer instances stay linked. With `selected` first, the 48 inline members would
  // land on a coordinate the set excludes and be dropped, and this arm fails. Counts and segments are typed here.
  {
    // The x-small size (#3179) is a later change with its own arm below, so both shapes here are the three-size Link.
    const next = plansOf('link').filter((p) => String(p.size) !== 'x-small');
    // `before` is the pre-#2872 shape, rebuilt from this PR's unselected plans with the `selection` segment taken off. Its
    // member names are the 96 a published Link carried then; their layers are pinned by test.ts's `#2580 link/…` and
    // `#2872 link bar` arms (an unselected member carries no bar).
    const before = next.filter((p) => p.coord.selection === 'unselected').map((p) => {
      const q = JSON.parse(JSON.stringify(p)) as AnatomyPlan;
      delete (q.coord as Record<string, string>).selection;
      q.gridAxisOrder = q.gridAxisOrder.filter((a) => a !== 'selection');
      return q;
    });
    const w = await world('link', before, { extraVars: [...new Set(next.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))] });
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CURRENT');
    const was = identityOf(w.set());
    ok(before.length === 96 && next.length === 144 && [...was.members.keys()].every((n) => !n.includes('selection=')),
      `premise: a published Link of 96 members with no selection axis, and a plan of 144 (${was.members.size} → ${next.length})`);
    const { pre, res } = await confirm(w, [{ def: 'link', plans: next }]);
    const p = pre.sets[0];
    const added = p?.adds ?? [];
    ok(p?.publish === 'CURRENT' && added.length === 48 && added.every((a) => a.includes('style=standalone') && a.includes('selection=selected'))
      && p.drops.length === 0 && p.replacements.length === 0 && (p.breaking ?? []).length === 0,
      `published/link current additive: the 48 current-page standalone members are added, nothing is dropped or replaced, and nothing breaks library consumers (adds ${added.length}, drops ${JSON.stringify(p?.drops.slice(0, 2))}, replaced ${p?.replacements.length}, breaking ${JSON.stringify((p?.breaking ?? []).slice(0, 3))})`);
    // In place: each existing member is renamed to its `selection=unselected` coordinate and keeps its id and key.
    const after = identityOf(w.set());
    const unsel = (name: string): string | undefined => [...after.members.keys()].find((n) => n.includes('selection=unselected')
      && n.split(', ').filter((seg) => seg !== 'selection=unselected').sort().join(', ') === name.split(', ').sort().join(', '));
    const lost = [...was.members].filter(([name, m]) => { const to = unsel(name); return !to || after.members.get(to)!.id !== m.id || after.members.get(to)!.key !== m.key; }).map(([n]) => n);
    ok(!res.refusedAll && after.members.size === 144 && lost.length === 0,
      `published/link current in place: applied, the 96 existing members become selection=unselected with their node id and key kept, so consumer instances stay linked (${after.members.size} members, ${lost.length} not kept — ${lost.slice(0, 2).join('; ') || 'none'})`);
  }

  // LINK GAINS ITS X-SMALL SIZE (#3179, owner decision D-A5 A): a published Link of 144 members over three sizes, updated
  // to the plan with `x-small` on the size axis. A value added to an axis that already exists renames nothing: the 144
  // keep their names, node ids and keys, and the 48 x-small members are added. Nothing is dropped or replaced and nothing
  // breaks library consumers (#2839's `breakingOf`). `before` is this PR's plan with the x-small members taken off, which
  // is the published shape exactly: the other sizes' plans do not read the size list. Counts are typed here.
  {
    const next = plansOf('link');
    const before = next.filter((p) => String(p.size) !== 'x-small');
    // The file a brand built holds every body text style, x-small's included; the world seeds only what `before` binds.
    const w = await world('link', before, { extraVars: [...new Set(next.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))], extraStyles: [...new Set(next.flatMap((p) => planTextStyles(p.root)))] });
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CURRENT');
    const was = identityOf(w.set());
    ok(before.length === 144 && next.length === 192 && [...was.members.keys()].every((n) => !n.includes('size=x-small')),
      `premise: a published Link of 144 members with no x-small, and a plan of 192 (${was.members.size} → ${next.length})`);
    const { pre, res } = await confirm(w, [{ def: 'link', plans: next }]);
    const p = pre.sets[0];
    const added = p?.adds ?? [];
    ok(p?.publish === 'CURRENT' && added.length === 48 && added.every((a) => a.includes('size=x-small'))
      && p.drops.length === 0 && p.replacements.length === 0 && (p.breaking ?? []).length === 0,
      `published/link x-small additive: the 48 x-small members are added, nothing is dropped or replaced, and nothing breaks library consumers (adds ${added.length}, drops ${JSON.stringify(p?.drops.slice(0, 2))}, replaced ${p?.replacements.length}, breaking ${JSON.stringify((p?.breaking ?? []).slice(0, 3))})`);
    const after = identityOf(w.set());
    const lost = [...was.members].filter(([name, m]) => { const to = after.members.get(name); return !to || to.id !== m.id || to.key !== m.key; }).map(([n]) => n);
    ok(!res.refusedAll && after.members.size === 192 && lost.length === 0,
      `published/link x-small in place: applied, the 144 existing members keep their names, node ids and keys, so consumer instances stay linked (${after.members.size} members, ${lost.length} not kept — ${lost.slice(0, 2).join('; ') || 'none'})`);
  }

  // ACCORDION GAINS ITS `indicator` AXIS (#2878, Q-block A): a published Accordion built before the axis, its 24 members
  // nesting `_accordion-indicator` with `indicator` EXPOSED (Q183), updated to the plan where the Accordion carries the
  // axis and the nested instance follows it. `before` is projected from the pre-#2878 def, rebuilt here from the current
  // one with the axis taken off and the nests put back to `nest-exposed`, so the old shape is typed, not read off the new
  // plan. The update gives every existing member `indicator=chevron` in place and adds the 24 plus-minus members; nothing
  // is dropped or replaced, no property is removed or retyped, so NOTHING breaks library consumers (#2839). Applied, each
  // of the 24 keeps its node id and key, and its header's nested indicator keeps its node id, so a consumer's override of
  // the nested indicator (a plus-minus picked through the old exposed property) stays on the instance.
  {
    const acc = componentDefs.find((x) => x.id === 'accordion')!;
    const { indicator: _gone, ...oldVariants } = acc.variants;
    const { indicator: _goneKind, ...oldKinds } = acc.axisKinds ?? {};
    const exposed = { kind: 'nest-exposed' as const, variant: { indicator: 'chevron', expansion: 'collapsed', size: 'medium' }, expose: ['indicator'], follow: ['expansion', 'size'] };
    const oldDef: ComponentDef = {
      ...acc,
      variants: oldVariants,
      axisKinds: oldKinds,
      figmaProperties: { ...acc.figmaProperties!, variantAxes: ['expansion', 'iconPosition', 'size'] },
      anatomy: { ...acc.anatomy!, parts: { ...acc.anatomy!.parts, leadingGlyph: { ...acc.anatomy!.parts.leadingGlyph, nesting: exposed }, trailingGlyph: { ...acc.anatomy!.parts.trailingGlyph, nesting: exposed } } },
    };
    const before = figmaAnatomySet(oldDef, { swapTarget: SWAP_TARGET });
    const next = plansOf('accordion');
    const glyphOf = (p: AnatomyPlan): PlanNode | undefined => { const walk = (n: PlanNode): PlanNode | undefined => (n.name === 'leadingGlyph' || n.name === 'trailingGlyph' ? n : (n.children ?? []).map(walk).find(Boolean)); return walk(p.root); };
    // The indicator set is in the file as a SET, so each header instance resolves to its member (#2738).
    const indicatorSet = { name: '_accordion-indicator', variants: plansOf('_accordion-indicator').map(planComponentName) };
    const w = await world('accordion', before, { fileSets: [indicatorSet], extraVars: [...new Set(next.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))] });
    (w.api.publish as (n: Node, s: string) => void)(w.set(), 'CURRENT');
    const was = identityOf(w.set());
    ok(before.length === 24 && next.length === 48 && [...was.members.keys()].every((n) => !n.includes('indicator=')) && before.every((p) => JSON.stringify(glyphOf(p)?.nestExpose) === '["indicator"]'),
      `premise: a published Accordion of 24 members with no indicator axis, its nested indicator exposed, and a plan of 48 (${was.members.size} → ${next.length})`);
    const { pre, res } = await confirm(w, [{ def: 'accordion', plans: next }]);
    const p = pre.sets[0];
    const added = p?.adds ?? [];
    ok(p?.publish === 'CURRENT' && added.length === 24 && added.every((a) => a.includes('indicator=plus-minus'))
      && p.drops.length === 0 && p.replacements.length === 0 && p.properties.remove.length === 0 && p.properties.retype.length === 0 && (p.breaking ?? []).length === 0,
      `published/accordion indicator additive: the 24 plus-minus members are added, nothing is dropped, replaced, removed or retyped, and nothing breaks library consumers (adds ${added.length}, drops ${JSON.stringify(p?.drops.slice(0, 2))}, replaced ${JSON.stringify(p?.replacements.slice(0, 2))}, props removed ${JSON.stringify(p?.properties.remove)}, breaking ${JSON.stringify((p?.breaking ?? []).slice(0, 3))})`);
    const after = identityOf(w.set());
    const chev = (name: string): string | undefined => [...after.members.keys()].find((n) => n.includes('indicator=chevron')
      && n.split(', ').filter((seg) => seg !== 'indicator=chevron').sort().join(', ') === name.split(', ').sort().join(', '));
    const glyphId = (kids: Map<string, string>): string | undefined => [...kids].find(([path]) => /(leading|trailing)Glyph#\d+$/.test(path))?.[1];
    const lost = [...was.members].filter(([name, m]) => { const to = chev(name); const a = to ? after.members.get(to)! : undefined; return !a || a.id !== m.id || a.key !== m.key || !glyphId(m.kids) || glyphId(a.kids) !== glyphId(m.kids); }).map(([n]) => n);
    ok(!res.refusedAll && after.members.size === 48 && lost.length === 0,
      `published/accordion indicator in place: applied, the 24 existing members become indicator=chevron with their node id and key kept, and each header's nested indicator keeps its node id, so consumer instances and their indicator overrides stay (${after.members.size} members, ${lost.length} not kept — ${lost.slice(0, 2).join('; ') || 'none'})`);
  }
}

/* ── message default off (#2926) ─────────────────────────────────────────────────────────────────────── */
section('message default off — Update flips the set\'s `message` default to off in place, and a designer\'s own value on an instance is kept (#2926)');
{
  // A file built before #2926 by the real executor: each field's def with the message switch ON by default. `true` is
  // typed here as the old file's value, never read off the def, which now says false.
  const LABEL_MEMBERS = ['medium', 'small', 'large'].flatMap((size) => ['primary', 'secondary'].flatMap((emphasis) => ['regular', 'bold'].flatMap((weight) =>
    ['rest', 'disabled'].map((state) => `size=${size}, emphasis=${emphasis}, weight=${weight}, state=${state}`))));
  for (const id of ['text-field', 'password-field', 'select', 'textarea']) {
    const d = componentDefs.find((x) => x.id === id)!;
    const fp = d.figmaProperties!;
    const oldDef = { ...d, figmaProperties: { ...fp, booleans: { ...fp.booleans, showMessage: { ...fp.booleans!.showMessage, default: true } } } };
    const old = figmaAnatomySet(oldDef, { swapTarget: SWAP_TARGET });
    const planned = plansOf(id);
    const componentProps = id === 'password-field' ? { button: { 'label#7:1': { type: 'TEXT', defaultValue: 'Button' } } } : undefined;
    const w = await world(id, old, { fileSets: [{ name: 'field-label', variants: LABEL_MEMBERS }], componentProps });
    const defs0 = w.set().componentPropertyDefinitions as Record<string, { type: string; defaultValue?: unknown }>;
    const key = Object.keys(defs0).find((k) => k.split('#')[0] === 'message')!;
    ok(!!key && defs0[key].type === 'BOOLEAN' && defs0[key].defaultValue === true, `premise: the ${id} file's set declares 'message', on by default (${key}: ${String(defs0[key]?.defaultValue)})`);
    const msgNodes = (): Node[] => {
      const walk = (n: Node): Node[] => [...((n.componentPropertyReferences as Record<string, string> | null)?.visible === key ? [n] : []), ...(n.type === 'INSTANCE' ? [] : ((n.children as Node[] | undefined) ?? []).flatMap(walk))];
      return membersOf(w.set()).flatMap(walk);
    };
    ok(msgNodes().length >= 84 && msgNodes().every((n) => n.visible !== false), `premise: ${id}: every member's message node is shown (${msgNodes().filter((n) => n.visible === false).length} of ${msgNodes().length} hidden)`);
    // Three placed instances: one untouched, one a designer turned off, one a designer turned on.
    const comps = w.api.root.findAllWithCriteria({ types: ['COMPONENT'] }) as unknown as { name: string; createInstance: () => Node }[];
    const main = comps.find((c) => c.name === String(membersOf(w.set())[0].name))!;
    const [untouched, turnedOff, turnedOn] = [main.createInstance(), main.createInstance(), main.createInstance()];
    (turnedOff.setProperties as (p: Record<string, boolean>) => void)({ [key]: false });
    (turnedOn.setProperties as (p: Record<string, boolean>) => void)({ [key]: true });
    const valueOf = (inst: Node): unknown => (inst.componentProperties as Record<string, { value: unknown }>)[key]?.value;
    const before = identityOf(w.set());
    const { pre, res } = await confirm(w, [{ def: id, plans: planned }]);
    const props = pre.sets[0].properties;
    ok(props.edit.length === 1 && props.edit[0].name === 'message' && props.edit[0].from === 'true' && props.edit[0].to === 'false' && !props.add.length && !props.remove.length && !props.rename.length && !props.retype.length,
      `${id} message/dry run: one property edit, 'message' true → false, nothing added, removed, renamed or retyped (${JSON.stringify(props)})`);
    ok(applyVerdict(res).ok, `${id} message/verdict: ${applyVerdict(res).headline} (${applyVerdict(res).lines.slice(0, 2).join(' | ').slice(0, 240)})`);
    const defs1 = w.set().componentPropertyDefinitions as Record<string, { type: string; defaultValue?: unknown }>;
    ok(defs1[key]?.defaultValue === false, `${id} message/set default: the same property (${key}) now defaults to off (${String(defs1[key]?.defaultValue)})`);
    ok(msgNodes().length >= 84 && msgNodes().every((n) => n.visible === false), `${id} message/members: every member's message node is now hidden (${msgNodes().filter((n) => n.visible !== false).length} of ${msgNodes().length} still shown)`);
    ok(valueOf(untouched) === false && valueOf(turnedOff) === false && valueOf(turnedOn) === true,
      `${id} message/instances: the untouched instance follows the new default (off), and each designer's own value is kept (off stays off, on stays on) (${String(valueOf(untouched))}, ${String(valueOf(turnedOff))}, ${String(valueOf(turnedOn))})`);
    const after = identityOf(w.set());
    ok(after.set.join() === before.set.join() && [...before.members].every(([name, b]) => after.members.get(name)?.key === b.key && after.members.get(name)?.id === b.id), `${id} message/keys: the set and every member keep their keys and ids`);
    const post = (await previewUpdate(w.host, [{ def: id, plans: planned }])).sets[0];
    ok(post.counts.current === post.counts.members && !post.properties.edit.length, `${id} message/settled: a second dry run reads every member current and lists no property edit (${JSON.stringify(post.counts)}; ${JSON.stringify(post.properties.edit)})`);
  }
}

void STYLE_FONT; void BASELINE_KEY;
console.log(`\n${failed ? `❌ ${failed} FAILED` : '✓ all passed'} — ${executed} assertions executed`);
if (failed) process.exit(1);
