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
 *   apply/copy     with the original's coordinate dropped, only the original is marked deprecated; a Figma duplicate
 *                  of it and an unstamped member off the plan keep their description, stamp and record exactly
 *                  (#2328 review). Mutation: the deprecations take the unstamped members too → `apply/copy`.
 *   nochange/…     a set the dry run reads as "no changes" (every member built by an earlier plugin) takes its stamps and
 *                  nothing else, read by a write log the test installs on the shim's nodes (#2379). Mutation: those
 *                  members sent through the build's pass again → `nochange/writes` (7,575 other writes).
 *   drawn/…        after an update in place, every bound paint stores the color and alpha its variable resolves to, and
 *                  every glyph's vectors fit its frame, read by the test off the shim's nodes (#2379). Mutations: the
 *                  paint base left black, or its alpha dropped → `drawn/paints`; the fresh glyph import not scaled to
 *                  its frame → `drawn/glyphs`.
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
import { applyComponentPlan, STAMP_KEY } from './src/write-components';
import { SWAP_TARGET } from './src/build-deps';
import { NS } from './src/persist-figma';
import { materializeForBrand } from './src/brand-def';
import { BASELINE_KEY } from './src/member-baseline';
import { makeShim, STYLE_FONT, type Node, type Page } from './component-shim';
import { captureBaselines, previewUpdate, previewVerdict, type UpdateHost, type UpdateTarget } from './src/update-plan';
import { drawnFaults, faultLine, varsById } from './src/drawn';
import { BASELINE_V, baselineOf, resetStyleNames, snapshotMember } from './src/member-baseline';
import { applyUpdate, applyVerdict, previewHashOf, DEPRECATED_PREFIX, RETAINED_KEY, nestedFirst, type ApplyHost } from './src/update-apply';

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
const world = async (id: string, plans = plansOf(id), o: { extraVars?: string[]; extraStyles?: string[]; extraComps?: string[]; keyPrefix?: string; styleIdPrefix?: string; unavailableFonts?: { family: string; style: string }[]; refuseVersion?: boolean; allowMisses?: string[] } = {}): Promise<World> => {
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
  w.api.loadFontAsync = async (f: { family: string; style: string }) => { if (f.family === STYLE_FONT.family && f.style === STYLE_FONT.style) throw new Error('not installed'); return real(f); };
  const stamps = membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join();
  const { res } = await confirm(w, [{ def: TAG, plans: moveGap(w.plans) }]);
  ok(/^fonts: Inter Semi Bold will not load/.test(res.outcomes[0]?.refused ?? ''), `fonts/refused: ${res.outcomes[0]?.refused}`);
  ok(membersOf(w.set()).map((m) => (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY)).join() === stamps && w.api._versions.length === 0, 'fonts/nothing written: no stamp moved, no version saved');
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
  const glyphHit = members.find((m) => /selection=selected/.test(String(m.name)))!;
  const blacken = (n: Node): boolean => {
    for (const f of ['fills', 'strokes'] as const) {
      const ps = n[f] as { boundVariables?: { color?: unknown } }[] | undefined;
      if (Array.isArray(ps) && ps.some((p) => p?.boundVariables?.color)) { n[f] = ps.map((p) => (p?.boundVariables?.color ? { ...p, color: { r: 0, g: 0, b: 0 }, opacity: 1 } : p)); return true; }
    }
    return ((n.children as Node[] | undefined) ?? []).some(blacken);
  };
  ok(blacken(paintHit), 'premise: a bound paint on the member is left storing black, its binding intact');
  const glyph = (glyphHit.findAll as (f: (n: Node) => boolean) => Node[])((n) => n.type === 'FRAME' && ((n.children as Node[]) ?? []).length > 0 && (n.children as Node[]).every((k) => k.type === 'VECTOR'))[0];
  for (const v of (glyph.children as Node[])) { v.x = (v.x as number) * 1.5; v.y = (v.y as number) * 1.5; (v.resize as (a: number, b: number) => void)((v.width as number) * 1.5, (v.height as number) * 1.5); }
  for (const m of [paintHit, glyphHit]) (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, BASELINE_KEY, JSON.stringify({ ...baselineOf(await snapshotMember(m)), id: String(m.id) }));
  for (const m of members) {
    const st = (m.getSharedPluginData as (a: string, b: string) => string)(NS, STAMP_KEY);
    (m.setSharedPluginData as (a: string, b: string, c: string) => void)(NS, STAMP_KEY, st.split('|').slice(0, 2).join('|'));
  }
  const pre = await previewUpdate(w.host, [{ def: TAG, plans: w.plans }]);
  const st = pre.sets[0];
  const stateOf = (m: Node): string => st.states.find((x) => x.member === String(m.name))?.state ?? 'current';
  const named = new Set(st.changes.map((c) => c.field));
  ok(stateOf(paintHit) === 'update' && stateOf(glyphHit) === 'update' && st.counts.revisionUnknown === 43 && named.has('fills') && named.has('glyph') && previewVerdict(pre).headline === 'Would change 1 of 1',
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
  ok(content.some((l) => /\.glyph: a vector [\d.]+×[\d.]+ at [\d.]+,[\d.]+ \(the plan says inside its 16×16 frame\)$/.test(l)),
    `verify/drawn glyphs: a glyph the host did not scale to its frame fails verify, named (${content.find((l) => /\.glyph:/.test(l)) ?? 'no glyph line'})`);
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
  ok(glyphCount > 10 && glyphs.length === 0, `drawn/glyphs: every glyph's vectors fit its frame after an update in place (${glyphCount} glyphs; ${glyphs.length} overflow${glyphs.length ? `, e.g. ${glyphs.slice(0, 2).join(' | ')}` : ''})`);
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
    props: now.props.filter((p) => p.name !== 'showMarker'),
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
  const markerProp = Object.entries(defs).find(([k]) => k.split('#')[0] === 'Marker');
  ok(!!markerProp && markerProp[1].type === 'BOOLEAN' && markerProp[1].defaultValue === true,
    `img/property: the set declares the BOOLEAN 'Marker', default on (${JSON.stringify(defs)})`);
  const unwired = membersOf(w.set()).filter((m) => String(((childNamed(m, 'marker')?.componentPropertyReferences ?? {}) as Record<string, string>).visible ?? '').split('#')[0] !== 'Marker').map((m) => String(m.name));
  ok(unwired.length === 0, `img/property wired: every member's marker visibility follows 'Marker' (${unwired.join(', ') || 'all seven'})`);
  const post = (await previewUpdate(w.host, [{ def: IMG, plans: newPlans }])).sets[0];
  ok(post.counts.current === 7 && post.handEdits.length === 0, `img/current: the next dry run reads all seven current (${JSON.stringify(post.counts)})`);
}

void STYLE_FONT; void BASELINE_KEY;
console.log(`\n${failed ? `❌ ${failed} FAILED` : '✓ all passed'} — ${executed} assertions executed`);
if (failed) process.exit(1);
