/**
 * #3421 (owner decision Q39 A) — A FULL UPDATE FILE, THEN THE CHECK, WITH NOTHING REBUILT BETWEEN: 0 DUE, apart from
 * the sets listed under Kept edits, and every change a kept hand edit held back named in the verdict.
 *
 *   npx tsx apps/plugin/test-update-kept-run.ts
 *
 * THE WORLD is the reference brand's master after #3402, in the component shim: two sets built from their plans as they
 * were before #3402 (the selection mark bound to `interactive.primary.border.*`), in a file that holds no
 * `interactive.*.indicator.*` variable yet. The ledger records them as built from that def. Then:
 *   · radio-control: a designer recolored the ring of every checked member and resized the dot of every member, by
 *     hand. Those are kept (Keep, the default), so the ring never gets the indicator binding.
 *   · tag: not edited. Its update must land in the same run as the Theme step that writes its variables.
 *
 * THE RUN is Update file's, from its own rules (`apps/studio/src/state/update-file.ts`): the due read ticks both, the
 * scoped check reads both as blocked by variables the file lacks, the update step takes them (`updateDefsOf`), the
 * Theme step writes the variables (modelled: the shim's variable names are a live set, `liveVars`; what Apply Theme
 * writes is `test-readback-parity.ts`'s subject), the step checks again (`recheckFirst`, `recheckHolds`), the apply
 * runs with the check's hash, and the ledger is recorded as `main.ts` records it (`ledgerAfter`). Then the check.
 *
 * INDEPENDENCE (docs/34): what is held is read off the shim's own nodes and the ledger as `dueOf` reads it. The
 * members kept are counted by THIS test from the edits it made, never from the apply's report; the ring's binding is
 * read off each member's stroke paint.
 *
 * Mutations this fails by name:
 *   · the ordering fix dropped (`updatableOf` back to `!c.blocked`) → `order/in the run`, `after/0 due`;
 *   · a fully kept set recorded as current (`ledgerAfter` drops `held`) → `after/kept listed`;
 *   · a kept-edit read-back filed as a miss in the build record (`kept` not split out) → `record/kept apart`;
 *   · `ledgerAfter` carrying `held` through a Keep run that kept no edits (` && o.kept.length` dropped) → `edits gone`;
 *   · `ledgerAfter` keeping only this run's `held` (the join with `was` dropped, `now ?? before` alone) → `held joined`;
 *   · `themeBlocked` when any blocker is Theme's (`lacks.theme > 0`) → `theme only/nest`;
 *   · `themeBlocked` ignoring the dry run's own blockers (`!had` dropped) → `theme only/dry run`.
 *
 * This file drives the helpers itself, so it does not see `main.ts`'s wiring. `test-update-kept-main.ts` posts the same
 * run to the real `main.ts`, and `test:chrome` section ia2 drives the Studio dialog's re-check (#3428's review).
 */
import { makeShim } from './component-shim';
import type { Node, Page } from './component-shim';
import { componentDefs } from '@prism3/engine/components/index';
import { figmaAnatomySet, planComponentName, planBoundVars, planPaintVars, planTextStyles, planEffectStyles, type AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { SWAP_TARGET } from './src/build-deps';
import { materializeForBrand } from './src/brand-def';
import { applyComponentPlan } from './src/write-components';
import { previewUpdate, checkedSetOf, type UpdateTarget } from './src/update-plan';
import { applyUpdate, applyVerdict, ledgerAfter, previewHashOf, type ApplyHost } from './src/update-apply';
import { dueOf, entryFor, printOf, readLedger, recordSets, type LedgerEntry } from './src/as-built-ledger';
import { NS, persistInput } from './src/persist-figma';
import { emissionOf, stampEmission, themeDue } from './src/theme-emission';
import { themePlans } from './src/apply-theme';
import exampleBrands from '@prism3/engine/schema/example-brands.json';
import type { BrandInput } from '@prism3/engine/theme';
import { catalogOf, CATALOG_SWAP_TARGET } from '../studio/src/state/component-catalog';
import { checkScopeOf, defaultTicks, type LiveDue, dueSetsOf, keptChoicesOf, keptSetsOf, recheckFirst, recheckHolds, stepsOf, updateDefsOf, UPDATE_COPY, type FileSets } from '../studio/src/state/update-file';
import { leafForDef } from './src/file-taxonomy';
import type { ComponentDef } from '@prism3/engine/component-schema';

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

console.log('Update file, then the check: nothing due but Kept edits, every held change named (#3421)');

const IDS = ['radio-control', 'tag'] as const;
/** The def before #3402: the selection mark bound to the border role, as the reference brand's master was built. */
const before = (x: string): string => x.replaceAll('.indicator.', '.border.').replaceAll('/indicator/', '/border/');
const defNow = new Map(IDS.map((id) => [id, materializeForBrand(componentDefs.find((d) => d.id === id)!, null)] as const));
const defWas = new Map(IDS.map((id) => [id, JSON.parse(before(JSON.stringify(defNow.get(id)))) as ComponentDef] as const));
const plansNow = new Map(IDS.map((id) => [id, figmaAnatomySet(defNow.get(id)!, { swapTarget: SWAP_TARGET })] as const));
const plansWas = new Map(IDS.map((id) => [id, JSON.parse(before(JSON.stringify(plansNow.get(id)))) as AnatomyPlan[]] as const));
const all = [...plansNow.values(), ...plansWas.values()].flat();
const INDICATOR = [...new Set(all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))].filter((v) => v.includes('/indicator/'));
ok(INDICATOR.length === 3 && plansWas.get('radio-control')!.every((p) => !JSON.stringify(p).includes('indicator')),
  `fixture: today's plans bind ${INDICATOR.length} indicator variables; the plans before #3402 bind none`);

// The file: every variable either plan binds, less the indicator ones Theme has not written yet.
const liveVars = new Set([...new Set(all.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)])), 'space/0'].filter((v) => !INDICATOR.includes(v)));
const page: Page = { children: [] };
const planComps = (n: AnatomyPlan['root']): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []), ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.nestOverrides ?? []).filter((o) => o.type === 'INSTANCE_SWAP').map((o) => o.value),
  ...((n.children ?? []) as AnatomyPlan['root'][]).flatMap(planComps),
];
const api = makeShim({
  liveVars,
  styles: [...new Set(all.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(all.flatMap((p) => planEffectStyles(p.root)))],
  comps: [...new Set([SWAP_TARGET, 'focus-ring', ...all.flatMap((p) => planComps(p.root))])],
  page, liveRoot: true, identities: true, scaleConstrained: true,
}) as any;
for (const id of IDS) {
  const r = await applyComponentPlan(plansWas.get(id)!, api);
  if (r.misses.length) throw new Error(`premise: ${id} built with ${r.misses.length} miss(es): ${r.misses[0]}`);
}
const host = { ...api, root: { ...api.root, findAllWithCriteria: (c: { types: string[] }) => (c.types.length === 1 && c.types[0] === 'COMPONENT_SET' ? page.children.filter((n) => n.type === 'COMPONENT_SET') : api.root.findAllWithCriteria(c)) } } as unknown as ApplyHost;
const setOf = (id: string): Node => page.children.find((n) => n.type === 'COMPONENT_SET' && String(n.name) === id) as Node;
ok(IDS.every((id) => !!setOf(id)), 'fixture: both sets are in the file');

// The ledger, as the build before #3402 recorded it.
const data = new Map<string, string>();
const root = { getPluginData: (k: string) => data.get(k) ?? '', setPluginData: (k: string, v: string) => { data.set(k, v); } };
recordSets(root, Object.fromEntries(IDS.map((id) => [id, entryFor(defWas.get(id)!, plansWas.get(id)!)])));

// The designer's edits on radio-control: every checked member's ring recolored, every member's dot resized.
const RED = { type: 'SOLID', color: { r: 0.8, g: 0.1, b: 0.1 }, opacity: 1, visible: true };
const radio = setOf('radio-control');
let ringEdited = 0, dotEdited = 0;
for (const m of radio.children as Node[]) {
  if (String(m.name).includes('selection=checked')) { (m as any).strokes = [{ ...RED }]; ringEdited++; }
  const dot = (m.children as Node[] ?? []).find((c) => c.name === 'dot') as any;
  // Figma drops a size binding when a bound layer is resized by hand; modelled here as the edit itself.
  if (dot) { const bv = { ...(dot.boundVariables ?? {}) }; delete bv.width; delete bv.height; dot.boundVariables = bv; dot.resize?.(Number(dot.width) + 3, Number(dot.height) + 3); dotEdited++; }
}
ok(ringEdited === 30 && dotEdited > 0, `fixture: ${ringEdited} rings recolored and ${dotEdited} dots resized by hand`);

/* ── Update file's run ─────────────────────────────────────────────────────────────────────────────────────── */

const placeOf = (id: string) => { const at = leafForDef(id); return at ? { page: at.leaf.page, section: at.section.header } : null; };
const catalog = catalogOf(componentDefs, (d) => figmaAnatomySet(d, { swapTarget: CATALOG_SWAP_TARGET }), placeOf);
const now = (id: string) => (defNow.has(id as typeof IDS[number]) ? entryFor(defNow.get(id as typeof IDS[number])!) : null);
const read = (): FileSets => ({ present: [...IDS], setUp: true, error: null, due: dueOf(readLedger(root), [...IDS], now) as FileSets['due'] });
const targetsOf = (defs: readonly string[]): UpdateTarget[] => defs.map((def) => ({ def, plans: plansNow.get(def as typeof IDS[number])! }));

// #3422 (Q44 A, Q44.1 A — the latter the owner's to confirm): Theme opens ticked only when the live recount says the file
// differs from the brand. Here the file holds the panel's brand, written by the emission before #3402 (no indicator
// variables), so the recount `main.ts` sends (`themeDue`) says it differs: an engine update under the same brand.
const brand = Object.values(exampleBrands as Record<string, unknown>)[0] as BrandInput;
const shared = new Map<string, string>();
const fileRoot = { getSharedPluginData: (ns: string, k: string) => shared.get(`${ns}:${k}`) ?? '', setSharedPluginData: (ns: string, k: string, v: string) => { shared.set(`${ns}:${k}`, v); } };
const plansToday = themePlans(brand);
persistInput(fileRoot, brand);
stampEmission(fileRoot, emissionOf(JSON.parse(before(JSON.stringify(plansToday)))));
const f0 = read();
const live: LiveDue = { present: f0.present, theme: themeDue(fileRoot, brand, () => emissionOf(plansToday)), error: null, due: f0.due };
ok(live.theme === true, `order/theme due: the recount reads Theme due, the brand unchanged and its variables written before #3402 (theme ${live.theme})`);
ok(JSON.stringify(dueSetsOf(catalog, f0)) === JSON.stringify(['radio-control', 'tag']) && IDS.every((id) => f0.due[id]?.state === 'due'),
  `due: both sets read due before the run (${JSON.stringify(f0.due)})`);
const ticks = defaultTicks(catalog, f0, null, live);
const scope = checkScopeOf(dueSetsOf(catalog, f0), ticks, [], keptSetsOf(catalog, f0));
const check0 = await previewUpdate(host, targetsOf(scope));
const seen = check0.sets.map((p, i) => checkedSetOf(p, scope[i]));
ok(seen.every((c) => c.blocked && c.themeBlocked === true),
  `check: before Theme, each set is blocked only by variables Theme writes (${JSON.stringify(check0.sets.map((p) => p.blockers))})`);
const defs = updateDefsOf(ticks, { sets: seen }, [], keptSetsOf(catalog, f0));
const steps = stepsOf({ ...ticks, update: new Set(defs) }, f0, []);
ok(defs.length === 2 && steps.join(',') === 'theme,update',
  `order/in the run: the update step takes both sets, after Theme (steps ${steps.join(', ')}; defs ${defs.join(', ')})`);

// ONLY THEME BLOCKS IT (#3428's delta review): a set rides the Theme run only when every blocker is Theme's. Here tag
// still lacks the indicator variables, and also has one blocker Theme cannot clear, so it must read blocked, not
// "Updated after Theme". Two worlds: a nested component the file lacks (a non-Theme line among the file's lacks), and
// a plan member the dry run refuses (a blocker found before the file's lacks are read).
const ROW_BLOCKED = 'Can’t be updated in place yet; the agent’s update check says why';
const ROW_AFTER_THEME = 'Updated after Theme — Theme writes the variables and styles it binds first';
{
  const lacking = { ...host, root: { ...host.root, findAllWithCriteria: (c: { types: string[] }) => host.root.findAllWithCriteria(c).filter((n) => String((n as { name?: unknown }).name) !== 'icon/close') } } as unknown as ApplyHost;
  const p = (await previewUpdate(lacking, targetsOf(['tag']))).sets[0];
  const c = checkedSetOf(p, 'tag');
  ok(p.blockers.some((b) => b.startsWith('Not in this file: icon/close.')) && p.blockers.some((b) => b.includes('the plan binds') && b.includes('not in this file')),
    `theme only/premise nest: tag lacks icon/close and the indicator variables (${JSON.stringify(p.blockers)})`);
  ok(c.blocked && c.themeBlocked === undefined && UPDATE_COPY.checked(c, true) === ROW_BLOCKED && UPDATE_COPY.checked(c, true) !== ROW_AFTER_THEME,
    `theme only/nest: a set that also lacks a nested component is not theme-blocked, and its row does not read "Updated after Theme" (${JSON.stringify([c.themeBlocked ?? null, UPDATE_COPY.checked(c, true)])})`);
}
{
  const plans = plansNow.get('tag')!;
  const stray = { ...plans[0], gridAxisOrder: [], coord: {}, size: undefined, slotAxes: [] } as unknown as AnatomyPlan;
  const p = (await previewUpdate(host, [{ def: 'tag', plans: [...plans, stray] }])).sets[0];
  const c = checkedSetOf(p, 'tag');
  ok(p.blockers[0]?.startsWith('the plan names a member that is not a coordinate: ') && p.blockers.slice(1).length > 0 && p.blockers.slice(1).every((b) => b.includes('the plan binds') && b.includes('not in this file')),
    `theme only/premise dry run: the dry run refuses a member first, and the file lacks only the indicator variables (${JSON.stringify(p.blockers)})`);
  ok(c.blocked && c.themeBlocked === undefined && UPDATE_COPY.checked(c, true) === ROW_BLOCKED && UPDATE_COPY.checked(c, true) !== ROW_AFTER_THEME,
    `theme only/dry run: a set the dry run already refuses is not theme-blocked, and its row does not read "Updated after Theme" (${JSON.stringify([c.themeBlocked ?? null, UPDATE_COPY.checked(c, true)])})`);
}

// THE THEME STEP: the brand's variables are written, the indicator ones with them.
for (const v of INDICATOR) liveVars.add(v);

// THE UPDATE STEP: checked again first, since its sets were blocked when reviewed.
let applied: Awaited<ReturnType<typeof applyUpdate>> | null = null;
if (steps.includes('update')) {
  ok(recheckFirst(defs, scope, { sets: seen }), 'order/checked again: the update step checks its sets again after Theme');
  const check1 = await previewUpdate(host, targetsOf(defs));
  const now1 = check1.sets.map((p, i) => checkedSetOf(p, defs[i]));
  ok(recheckHolds(defs, seen, now1) && now1.every((c) => !c.blocked), `order/unblocked: after Theme each set reads unblocked, and the run goes on (${JSON.stringify(now1.map((c) => [c.def, c.blocked]))})`);
  applied = await applyUpdate(host, api, targetsOf(defs), previewHashOf(check1), { choices: { handEdits: ticks.handEdits, sets: keptChoicesOf(ticks, defs) } });
  recordSets(root, ledgerAfter(applied.outcomes, (id) => { const e = now(id); return e ? { ...e, print: printOf(plansNow.get(id as typeof IDS[number])!) } : null; }));
}
const verdict = applied ? applyVerdict(applied) : null;

/* ── the check, nothing rebuilt between ────────────────────────────────────────────────────────────────────── */

const f1 = read();
ok(dueSetsOf(catalog, f1).length === 0, `after/0 due: the check after the run finds no set due (${JSON.stringify(f1.due)})`);
ok(f1.due.tag?.state === 'current', `after/tag current: the set nobody edited is current (${JSON.stringify(f1.due.tag)})`);
ok(JSON.stringify(keptSetsOf(catalog, f1)) === '["radio-control"]', `after/kept listed: radio-control, whose kept edits held changes back, is listed under Kept edits (${JSON.stringify(f1.due['radio-control'])})`);

// What a kept edit holds back, worked out here from the plans alone: each recolored member whose ring today's plan binds
// to the indicator (before #3402 it bound the border role, so that change is the one the edit holds back).
const ringVar = (p: AnatomyPlan): string => String((p.root as { paints?: { strokes?: unknown } }).paints?.strokes ?? '');
const shouldHold = plansNow.get('radio-control')!.filter((p) => planComponentName(p).includes('selection=checked') && ringVar(p).includes('/indicator/'));
const memberOf = (name: string): Node => (radio.children as Node[]).find((m) => String(m.name) === name)!;
ok(shouldHold.length === 12, `fixture: today's plan binds the ring of ${shouldHold.length} checked members to the indicator`);
// Read off the host: those rings hold the designer's color, as Keep asks; never the indicator binding.
const paintsOf = (n: Node): string => JSON.stringify([(n as any).strokes ?? [], (n as any).fills ?? []]);
ok(shouldHold.every((p) => !paintsOf(memberOf(planComponentName(p))).includes('indicator')),
  `host: the ${shouldHold.length} recolored rings keep the designer's color, not the indicator binding`);
const anyIndicator = (n: Node): boolean => paintsOf(n).includes('indicator') || ((n.type !== 'INSTANCE' ? n.children as Node[] : null) ?? []).some(anyIndicator);
ok((setOf('tag').children as Node[]).some(anyIndicator), 'host: tag binds the indicator after the run');

// Every skipped change named in the verdict: the set, its member count and the held change on the ring.
const held = f1.due['radio-control']?.state === 'kept' ? (f1.due['radio-control'] as { held: { members: number; changes: readonly string[] } }).held : null;
const line = verdict?.lines.find((l) => l.startsWith('radio-control: hand edits kept on')) ?? '';
ok(!!held && held.members === shouldHold.length && ['rest', 'hover', 'pressed'].every((st) => held.changes.includes(`border → color/interactive/primary/indicator/${st}`))
  && !held.changes.some((c) => c.includes('color/disabled/') || c.includes('color/border/danger')), `held/recorded: the ledger holds what was kept back (${JSON.stringify(held)})`);
ok(!!line && line.includes(`${held?.members ?? '?'} members`) && (held?.changes ?? []).every((c) => line.includes(c)) && line.includes('Kept edits'),
  `held/named: the verdict names the set, its members and the changes held back (${JSON.stringify(line)})`);
ok(!!verdict && verdict.headline.includes('kept edits over changes'), `held/headline: the headline says a set kept edits over changes (${JSON.stringify(verdict?.headline)})`);

// The build record (#3421 item 3): a binding absent on a node kept as a hand edit is counted as kept, never a miss.
const rec = JSON.parse((radio as any).getSharedPluginData?.(NS, 'build') || '{}') as { misses?: string[]; kept?: string[]; keptCount?: number };
const discarded = (rec.misses ?? []).filter((m) => / -> DISCARDED \(/.test(m));
ok(discarded.length === 0 && (rec.keptCount ?? 0) > 0,
  `record/kept apart: the set's build record files ${rec.keptCount ?? 0} kept-edit read-backs apart, and ${discarded.length} as misses (${JSON.stringify(discarded.slice(0, 2))})`);

// #3436's review: a Keep run that finds no hand edits left to keep (the designer reverted them) records no `held`, so the
// set reads current again. Driven on `ledgerAfter` directly, with a ledger before the run that still carries `held`; the
// same outcome with one kept edit is the control, so the arm cannot pass by `was` being ignored altogether.
{
  const wasHeld = { members: 3, changes: ['border → color/interactive/primary/indicator/rest'] };
  const entry = (def: string): LedgerEntry => ({ def, rev: 1, engine: 'test' });
  const was = { 'radio-control': { ...entry('radio-control'), held: wasHeld } };
  const keepRun = (kept: { member: string; path: string }[]) => ({ def: 'radio-control', set: 'radio-control', updated: [], added: 0, renamed: 0, deprecated: [], skipped: [], kept, unrecorded: [], handEdits: 'keep' as const, identity: [], content: [], misses: [] });
  const gone = ledgerAfter([keepRun([])], entry, was)['radio-control'];
  const still = ledgerAfter([keepRun([{ member: 'selection=checked', path: 'ring' }])], entry, was)['radio-control'];
  ok(!!still?.held, `edits gone/control: a Keep run that still keeps an edit carries the held its entry had (${JSON.stringify(still?.held)})`);
  ok(!!gone && !gone.held, `edits gone: a Keep run that keeps no hand edits records no held, so the set reads current (${JSON.stringify(gone?.held)})`);
  // #3463: a second Keep run that holds a change of its own (B) over a set whose entry already carries one (A) records
  // both, the members the larger count. Literals here, never read off `ledgerAfter`.
  const heldB = { members: ['selection=checked', 'selection=unchecked'], changes: ['dot → size/indicator/dot'] };
  const joined = ledgerAfter([{ ...keepRun([{ member: 'selection=checked', path: 'dot' }]), held: heldB }], entry, was)['radio-control'];
  const changes = [...(joined?.held?.changes ?? [])].sort();
  ok(joined?.held?.members === 3 && JSON.stringify(changes) === JSON.stringify(['border → color/interactive/primary/indicator/rest', 'dot → size/indicator/dot']),
    `held joined: a second Keep run holding B over an entry holding A records A and B, 3 members (${JSON.stringify(joined?.held)})`);
}

console.log(failed ? `\n${failed} failed` : '\nall passed');
process.exit(failed ? 1 : 0);
