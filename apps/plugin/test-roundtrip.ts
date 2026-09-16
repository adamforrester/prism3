/**
 * COMPONENT ROUND-TRIP GATE (#874) — build every def, read the result back out of the host, and diff
 * it against the plan that built it.
 *
 *   npx tsx apps/plugin/test-roundtrip.ts
 *   npx tsx apps/plugin/test-roundtrip.ts --inventory     # report divergences, exit 0
 *
 * The reader and the differ are `packages/engine/anatomy-readback.ts`, which carries the design and
 * the independence argument. This file is the OFFLINE HOST arm: it drives the real
 * `applyComponentPlan` against the shared shim and reports what came back.
 *
 * ── WHY THE OFFLINE ARM IS WORTH HAVING ON ITS OWN ─────────────────────────────────────────────
 *
 * #874 assumes a round-trip needs a real Figma file, and for one defect class it does. But the
 * measurement in that issue's analysis is entirely offline: **four writes in `write-components.ts`
 * could be deleted with every gate green**, because a never-written field reads back as absent from
 * this shim exactly as it would from Figma. The cheap half is not a consolation prize — it is where
 * the live defects are.
 *
 * What only a real host can see is ACCEPT-AND-DISCARD: Figma taking a write and not keeping it (#866,
 * and #865's unauthored defaults). The shim reproduces only the discards it was TAUGHT — its own
 * header says so — so that class is a ledger here by construction and a rule only against Figma. The
 * real-host arm is `tools/component-roundtrip/`, filed separately; **CI does not cover it.**
 *
 * ── THE TWO MODES, AND WHY THE INVENTORY MODE EXISTS ───────────────────────────────────────────
 *
 * A gate may only merge green, and this one is red on the corpus it was written against — which is the
 * point: it was built to catch live defects and it caught them. `--inventory` prints the full
 * divergence table and exits 0, so the report is usable while the defects are being fixed. The GATE
 * mode is the default and fails on any divergence; it is what CI runs once the inventory is empty.
 *
 * Nothing about the comparison differs between the modes. Weakening the diff to force green would
 * delete the gate and report that as a pass, which is the shape this whole file exists to prevent.
 */

import { figmaAnatomySet, planComponentName, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { diffAnatomy, unclassifiedFields, fieldCoverage } from '@prism3/engine/anatomy-readback';
import type { Divergence, HostNode, ReadPorts } from '@prism3/engine/anatomy-readback';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { nbTheme } from '@prism3/engine/nb-fixture';
import { tailOf } from '@prism3/engine/figma-names';
import { applyComponentPlan } from './src/write-components';
import { makeShim } from './component-shim';
import type { Node, Page, ShimOpts } from './component-shim';

const INVENTORY = process.argv.includes('--inventory');

/** Nodes compared, per predicate, across the whole corpus — see `diffAnatomy`. A predicate at zero is
 *  a clause with no subject and is reported as such rather than counted as coverage. */
const EXERCISED: Record<string, number> = {};

/** The FPO component the plugin nominates for every swap slot — the same constant
 *  `apps/plugin/src/main.ts` uses, restated here because a harness that builds a DIFFERENT plan from
 *  the one the product builds is measuring something nobody ships. */
const SWAP_TARGET = 'FPO-default-icon';

/**
 * The corpus: every def the engine PROJECTS into a Figma set.
 *
 * A def with no `figmaProperties` block declares no Figma axes and `figmaAnatomySet` refuses it — the
 * projection is opt-in (`test.ts` asserts that directly). Those defs are excluded and NAMED below
 * rather than filtered silently: an excluded member is invisible to a scan that only reports what it
 * walked, and "which defs does nothing round-trip" is exactly the question a reader of this report
 * will have. Both sets are printed, and the split is asserted total over `componentDefs`.
 */
const PROJECTED = componentDefs.filter((d) => d.figmaProperties);
const CODE_ONLY = componentDefs.filter((d) => !d.figmaProperties);

let failed = 0;
const ok = (cond: boolean, label: string): void => {
  if (cond) console.log(`  ✓ ${label}`);
  else { failed++; console.error(`  ✗ ${label}`); }
};

/** Every name a plan set reaches for, DERIVED FROM THE PLANS — the same construction
 *  `test-write-components.ts` uses, so a host that is missing a catalogue entry is a harness fault
 *  rather than a finding. */
const planComps = (n: { swapTarget?: string; nestTarget?: string; children: unknown[] }): string[] => [
  ...(n.swapTarget ? [n.swapTarget] : []),
  ...(n.nestTarget ? [n.nestTarget] : []),
  ...(n.children as (typeof n)[]).flatMap(planComps),
];
const fullFor = (plans: AnatomyPlan[]): ShimOpts => ({
  vars: [...new Set(plans.flatMap((p) => [...planBoundVars(p.root), ...planPaintVars(p.root)]))],
  styles: [...new Set(plans.flatMap((p) => planTextStyles(p.root)))],
  effects: [...new Set(plans.flatMap((p) => planEffectStyles(p.root)))],
  comps: [...new Set(plans.flatMap((p) => planComps(p.root)))],
});

/**
 * Build one def and read it back.
 *
 * The ports resolve ids through the HOST'S OWN CATALOGUES (`getLocalVariablesAsync`,
 * `getLocalTextStylesAsync`, `getLocalEffectStylesAsync`) rather than through the plan — a resolver
 * built from the plan would map every id to the name the diff was hoping for, which is the whole
 * failure mode in one line.
 */
const roundTrip = async (def: (typeof componentDefs)[number]): Promise<{ plans: AnatomyPlan[]; divergences: Divergence[]; members: number }> => {
  // NOMINATED, exactly as the real caller does (`apps/plugin/src/main.ts` — `SWAP_TARGET`). Building
  // the plan set without it is not a smaller version of the same build: the executor then reports
  // `swapTarget -> (none nominated; built as a placeholder frame)` and puts a FRAME where the plan
  // says INSTANCE_SWAP, which this reader correctly calls a divergence — of the HARNESS, not the
  // subject. That misconfiguration produced 2,970 findings on its first run and every one was mine.
  const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(plans), page });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  await applyComponentPlan(plans, shim as any, {});

  const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
  const texts = await (shim as unknown as { getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalTextStylesAsync();
  const effects = await (shim as unknown as { getLocalEffectStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalEffectStylesAsync();
  const varById = new Map(vars.map((v) => [v.id, v.name] as const));
  const styleById = new Map([...texts, ...effects].map((s) => [s.id, s.name] as const));
  const ports: ReadPorts = {
    varName: (id) => varById.get(id) ?? null,
    styleName: (id) => styleById.get(id) ?? null,
  };

  const set = page.children[0];
  const members = (set?.children ?? []) as unknown as HostNode[];
  return { plans, divergences: diffAnatomy(plans, members, planComponentName, ports, EXERCISED), members: members.length };
};

console.log(`component round-trip (#874) — ${INVENTORY ? 'INVENTORY' : 'GATE'} mode\n`);

// ---- THE FLOOR: every declared plan field is classified ---------------------------------------
// A field on `FigmaNodePlan` that `FIELDS` does not mention would be silently unchecked — the exact
// hole this gate exists to close one level down, reappearing inside the gate itself.
{
  const allPlans = PROJECTED.flatMap((d) => figmaAnatomySet(d, { swapTarget: SWAP_TARGET }));
  const unknown = unclassifiedFields(allPlans);
  ok(unknown.length === 0, `every plan field is classified as checked or explicitly unchecked${unknown.length ? ` — UNCLASSIFIED: ${unknown.join(', ')}` : ''}`);
  const cov = fieldCoverage();
  ok(cov.checked.length > 0, `${cov.checked.length} predicates declared: ${cov.checked.join(', ')}`);
  console.log(`\n  declared UNCHECKED, with reasons (${cov.unchecked.length}):`);
  for (const u of cov.unchecked) console.log(`    ${u.field.padEnd(20)} ${u.reason}`);
}

// ---- THE ROUND TRIP, over every def in the corpus ---------------------------------------------
ok(PROJECTED.length + CODE_ONLY.length === componentDefs.length && PROJECTED.length > 0,
  `the corpus split is total over componentDefs — ${PROJECTED.length} projected, ${CODE_ONLY.length} code-only`);
console.log(`\n  NOT round-tripped (no figmaProperties — the projection is opt-in): ${CODE_ONLY.map((d) => d.id).join(', ') || 'none'}`);

console.log(`\nround-tripping ${PROJECTED.length} projected defs…\n`);
const inventory: { def: string; divergences: Divergence[]; members: number; plans: number }[] = [];
for (const def of PROJECTED) {
  try {
    const r = await roundTrip(def);
    inventory.push({ def: def.id, divergences: r.divergences, members: r.members, plans: r.plans.length });
  } catch (e) {
    inventory.push({ def: def.id, divergences: [{ member: '(build)', path: '', field: 'THREW', expected: 'a built set', actual: (e as Error).message }], members: 0, plans: 0 });
  }
}

// ---- THE REPORT --------------------------------------------------------------------------------
const clean = inventory.filter((i) => !i.divergences.length);
const dirty = inventory.filter((i) => i.divergences.length);

console.log(`  ${'def'.padEnd(20)} ${'members'.padStart(7)} ${'plans'.padStart(6)}  divergences`);
for (const i of inventory) {
  console.log(`  ${i.def.padEnd(20)} ${String(i.members).padStart(7)} ${String(i.plans).padStart(6)}  ${i.divergences.length || '—'}`);
}

if (dirty.length) {
  console.log(`\n── DIVERGENCE INVENTORY — ${dirty.reduce((n, d) => n + d.divergences.length, 0)} across ${dirty.length} def(s) ──\n`);
  for (const i of dirty) {
    // Grouped by FIELD rather than listed per node: a field the executor never writes diverges on
    // every node that declares it, so a flat list buries one cause under hundreds of consequences.
    const byField = new Map<string, Divergence[]>();
    for (const d of i.divergences) byField.set(d.field, [...(byField.get(d.field) ?? []), d]);
    console.log(`  ${i.def} — ${i.divergences.length} divergence(s) across ${byField.size} field(s)`);
    for (const [field, ds] of [...byField].sort((a, b) => b[1].length - a[1].length)) {
      const ex = ds[0];
      console.log(`    ${field.padEnd(24)} ${String(ds.length).padStart(4)}×  e.g. ${ex.member} :: ${ex.path}`);
      console.log(`    ${' '.repeat(24)}        plan: ${ex.expected}`);
      console.log(`    ${' '.repeat(24)}        host: ${ex.actual}`);
    }
    console.log('');
  }
}

// ---- THE VERDICT ------------------------------------------------------------------------------
// The corpus must be non-empty, or "0 divergences" is silence rather than evidence.
// WHICH PREDICATES ACTUALLY COMPARED SOMETHING. Printed unconditionally, because a predicate that
// walked zero nodes is indistinguishable from a passing one in the verdict line above.
{
  const cov = fieldCoverage();
  const idle = cov.checked.filter((f) => !EXERCISED[f]);
  console.log('\n  nodes compared per predicate:');
  for (const f of cov.checked) console.log(`    ${f.padEnd(24)} ${String(EXERCISED[f] ?? 0).padStart(6)}`);
  if (idle.length) {
    console.log(`\n  ⚠ ${idle.length} predicate(s) compared NOTHING — no def in the corpus declares the field: ${idle.join(', ')}`);
    console.log('    Not a pass. The executor write behind such a field is out of this arm\'s reach until a def uses it.');
  }
}

ok(inventory.length > 0 && inventory.some((i) => i.plans > 0), `the corpus produced plans to compare (${inventory.reduce((n, i) => n + i.plans, 0)} plans, ${inventory.reduce((n, i) => n + i.members, 0)} members)`);

if (INVENTORY) {
  console.log(`\n📋 INVENTORY: ${clean.length}/${inventory.length} defs round-trip clean; ${dirty.length} diverge.`);
  console.log('   Inventory mode exits 0 by design — the gate mode below is what fails.');
  process.exit(failed ? 1 : 0);
}

ok(dirty.length === 0, `every def round-trips: what the plan declares is what the host holds${dirty.length ? ` — ${dirty.map((d) => `${d.def} (${d.divergences.length})`).join(', ')}` : ''}`);

// ── ASPECT-LOCK READ-BACK (#1316) — THE INDEPENDENT ORACLE ─────────────────────────────────────
//
// The generic diff above already checks each ratio member's built `targetAspectRatio` against the PLAN's
// ratio (`anatomy-readback.ts`'s `aspectRatio` predicate) — plan-as-oracle, which catches an executor
// that fails to lock or locks a wrong number. What it CANNOT catch is a wrong plan that round-trips
// perfectly: flip a ratio in the def and the plan follows, so plan-vs-built still agrees. This block
// closes that with an oracle authored HERE and NOWHERE ELSE — the owner-decided ratio contract — so a
// ratio flipped, added or dropped in the def diverges from this and fails BY NAME (docs/34).
//
// This is the "aspect-lock read-back" the verify checklist places in test:roundtrip. It builds the def
// through the shared shim exactly as the corpus loop does, then reads each member's frame back.
{
  const CONTRACT: Record<string, number> = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };
  const def = componentDefs.find((d) => d.id === 'image-placeholder');
  ok(!!def, 'aspect-lock: the image-placeholder def is registered and projects');
  if (def) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const byName = new Map(members.map((m) => [String(m.name ?? ''), m] as const));
    const seenRatios = new Set<string>();
    for (const plan of plans) {
      const ratio = plan.coord.ratio;
      if (ratio === undefined) { ok(false, 'aspect-lock: a member projected with no ratio coordinate'); continue; }
      seenRatios.add(ratio);
      const expected = CONTRACT[ratio];
      if (expected === undefined) {
        ok(false, `aspect-lock: member ratio=${ratio} is not an owner-decided ratio [${Object.keys(CONTRACT).join(', ')}] — a ratio was flipped or added in the def`);
        continue;
      }
      const m = byName.get(planComponentName(plan));
      const got = m ? (m as { targetAspectRatio?: unknown }).targetAspectRatio : undefined;
      ok(typeof got === 'number' && Math.abs(got - expected) < 1e-6,
        `aspect-lock: ratio=${ratio}'s built frame locks targetAspectRatio ≈ ${expected.toFixed(4)} (read ${typeof got === 'number' ? got.toFixed(4) : String(got)})`);
    }
    // SCOPE FLOOR: every owner-decided ratio must be represented by a built member, so a def that DROPS
    // one fails here rather than the block quietly checking fewer frames.
    for (const ratio of Object.keys(CONTRACT))
      ok(seenRatios.has(ratio), `aspect-lock: a member for the owner-decided ratio ${ratio} was built (scope floor)`);
  }
}

// ── PANEL PROPERTY ORDER + DISPLAY NAMES (#1309/#1380) — HOST-TRUTH ─────────────────────────────
//
// The icon-property canon (#1380) is three things: `label` (the TEXT property) at the top, each presence
// toggle a `leading icon` / `trailing icon` true/false SWITCH, and each swap a `↳ swap …` panel label
// nested beneath it. The display NAMES are already host-gated above — member names carry the switch
// labels and `propertyRef` carries the swap labels, so a reverted `figmaName` diverges the round-trip and
// `lint-component-surface`'s digest moves. What has NO other gate is the ORDER the panel shows the
// component (non-variant) properties in: it is `planSetProperties`'s output order, which the digest does
// not hash and no other read-back inspects. So read it back off the HOST — `componentPropertyDefinitions`,
// whose key order is the executor's `addComponentProperty` order — and pin it against an oracle authored
// HERE, not derived from `planSetProperties` (docs/34). Reordering `planSetProperties` (its text→swap→
// boolean sort) then fails this BY NAME.
//
// The panel INTERLEAVE of the variant switches with the component properties is host-RENDERED and not
// asserted here (the repo's standing position that panel render order is "the owner's Figma check, not
// ours" — see `version.ts`/`test.ts`'s #1150 note); what the engine controls and this gates is that
// `label` is CREATED first and the swaps carry their `↳` labels.
{
  const CANON: Record<string, { componentProps: string[]; switches: string[] }> = {
    button: { componentProps: ['label', '↳ swap leading icon', '↳ swap trailing icon'], switches: ['leading icon', 'trailing icon'] },
    // select's `leading icon` is a node-visibility BOOLEAN component property since #1331 (not a variant
    // switch): it appears in componentProps, ordered `value` (TEXT) → `leading icon` (BOOLEAN) → swap, and
    // NO longer among the variant switches. Reverting it to a slot axis moves it back to `switches` and
    // fails both assertions below by name. `message` is the SECOND node-visibility boolean (#1426, hiding
    // the composed FieldMessage), so the panel shows `value` (TEXT) → `leading icon` → `message` (BOOLEANs)
    // → `↳ swap leading icon` (SWAP); dropping the showMessage boolean removes `message` here BY NAME.
    select: { componentProps: ['value', 'leading icon', 'message', '↳ swap leading icon'], switches: [] },
    'icon-button': { componentProps: ['swap icon'], switches: [] },
  };
  for (const [id, want] of Object.entries(CANON)) {
    const def = componentDefs.find((d) => d.id === id)!;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const set = page.children[0] as unknown as { componentPropertyDefinitions: Record<string, { type: string }> };
    const entries = Object.entries(set.componentPropertyDefinitions ?? {});
    // Non-variant keys carry a `#<id>` suffix Figma assigns; the stem is the panel name. Variant keys do not.
    const componentOrder = entries.filter(([, d]) => d.type !== 'VARIANT').map(([k]) => k.split('#')[0]);
    const variantNames = entries.filter(([, d]) => d.type === 'VARIANT').map(([k]) => k);
    ok(JSON.stringify(componentOrder) === JSON.stringify(want.componentProps),
      `panel order (#1380): ${id} shows its component properties top-to-bottom as ${JSON.stringify(want.componentProps)} — a reordered planSetProperties fails here (host holds ${JSON.stringify(componentOrder)})`);
    ok(want.switches.every((s) => variantNames.includes(s)) && (want.switches.length > 0 || !variantNames.some((v) => / icon$/.test(v))),
      `panel switches (#1380): ${id} carries the ${JSON.stringify(want.switches)} true/false variant switch(es) as decoupled Figma names (host holds ${JSON.stringify(variantNames)})`);
  }
}

// ── #1331: THE NODE-VISIBILITY BOOLEAN, READ BACK OFF THE BUILT NODE — HOST-TRUTH ───────────────
//
// The mechanism's host truth, the two facts a property DEFINITION alone cannot show (the panel-order block
// above pins that `leading icon` is a BOOLEAN, not a variant switch): the leading glyph node is BUILT into
// EVERY member with `visible=false` (hidden by default, present-and-toggled rather than dropped), and its
// `visible` field is WIRED to the `leading icon` boolean via `componentPropertyReferences.visible`. The
// executor writes both; the host echoes them; this reads them back. Reverting `leading` to a variant slot
// axis drops the node in the false members (no node to read) and moves `leading icon` to a variant switch
// (no BOOLEAN property to wire), flipping these BY NAME.
{
  const def = componentDefs.find((d) => d.id === 'select')!;
  const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(plans), page });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  await applyComponentPlan(plans, shim as any, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim's set
  const set = page.children[0] as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim's members
  const members = (set?.children ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
  const findByName = (n: any, name: string): any => (n.name === name ? n : (n.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));
  const defs = set.componentPropertyDefinitions as Record<string, { type: string }>;
  const liKey = Object.keys(defs).find((k) => k.split('#')[0] === 'leading icon');
  ok(!!liKey && defs[liKey!].type === 'BOOLEAN',
    `#1331 host-truth: the built set carries a 'leading icon' BOOLEAN property (host holds ${liKey})`);
  const lvs = members.map((m) => findByName(m, 'leadingVisual'));
  ok(members.length === 16 && lvs.every(Boolean),
    `#1331 host-truth: the leading glyph node is built into EVERY member (${lvs.filter(Boolean).length}/${members.length})`);
  ok(lvs.length > 0 && lvs.every((lv) => lv.visible === false),
    '#1331 host-truth: every built leading glyph reads back `visible=false` — built hidden by default, not dropped');
  ok(lvs.length > 0 && lvs.every((lv) => (lv.componentPropertyReferences ?? {}).visible === liKey),
    "#1331 host-truth: every built leading glyph's `visible` is wired to the 'leading icon' boolean (componentPropertyReferences.visible)");
}

// ── STROKE-WEIGHT PER-SIDE READ-BACK (#1332) — HOST-TRUTH ──────────────────────────────────────
//
// The 2026-09-09 host-truth Figma-console audit established that `setBoundVariable('strokeWeight', v)`
// binds the weight onto the four PER-SIDE keys (`strokeTopWeight`/…/`strokeLeftWeight`) and leaves the
// scalar `strokeWeight` unbound, on every bordered set. The read-backs checked the scalar and reported a
// FALSE `strokeWeight→UNBOUND`/`DISCARDED` on a weight that IS bound (#1332). The shim now models that
// split (see `component-shim.ts`), so the whole bordered corpus above already exercises the per-side
// path — revert `boundIdOf`'s per-side branch and every bordered def diverges `bound`/`strokeWeight` by
// name. This block pins the two directions EXPLICITLY, with an oracle authored HERE (docs/34): the
// per-side-bound weight must read BOUND, and a GENUINELY unbound one (a raw number, no keys) must still
// be reported — the check accepts the complete per-side binding, it is not weakened into always-passing.
{
  const def = componentDefs.find((d) => d.id === 'focus-ring');
  ok(!!def, '#1332 reachable: the focus-ring def is registered and projects');
  if (def) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
    const varById = new Map(vars.map((v) => [v.id, v.name] as const));
    const ports: ReadPorts = { varName: (id) => varById.get(id) ?? null, styleName: () => null };
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const ring = members[0] as unknown as { boundVariables: Record<string, { id?: string }>; strokeWeight?: unknown };
    const SIDES = ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'];

    // HOST TRUTH, pinned: the built ring binds the weight on all four per-side keys and NOT the scalar.
    ok(members.length > 0 && SIDES.every((k) => typeof ring.boundVariables[k]?.id === 'string') && ring.boundVariables.strokeWeight === undefined,
      `#1332 the built ring binds its weight on the four per-side keys with the scalar left unbound (${SIDES.map((k) => `${k}=${ring.boundVariables[k]?.id ? 'bound' : '—'}`).join(', ')}, strokeWeight=${ring.boundVariables.strokeWeight ? 'bound' : 'unbound'})`);

    // POSITIVE — the reader accepts the per-side binding: no false `strokeWeight` divergence.
    const clean = diffAnatomy(plans, members, planComponentName, ports, {});
    ok(!clean.some((d) => d.field === 'bound' && /strokeWeight/.test(d.actual ?? '')),
      `#1332 a per-side-bound weight reads back BOUND — no false strokeWeight DISCARDED (${clean.filter((d) => /strokeWeight/.test(d.actual ?? '')).map((d) => `${d.member}: ${d.actual}`).join('; ') || 'none'})`);

    // NEGATIVE (mutation-by-name) — a GENUINELY unbound weight (a raw number, no per-side keys) is still
    // reported `strokeWeight→UNBOUND`, so the fix did not weaken the check into always-passing.
    for (const k of SIDES) delete ring.boundVariables[k];
    ring.strokeWeight = 1;   // the host holds a raw literal — the #1332 "genuinely unbound" case
    const unbound = diffAnatomy(plans, members, planComponentName, ports, {});
    ok(unbound.some((d) => d.field === 'bound' && /strokeWeight→UNBOUND/.test(d.actual ?? '')),
      `#1332 mutation: a weight bound to nothing (a raw number) is reported \`strokeWeight→UNBOUND\` by name (${unbound.filter((d) => d.field === 'bound').map((d) => `${d.member}: ${d.actual}`).join('; ') || 'NOT REPORTED — the check went silent'})`);

    // AND A PARTIAL per-side binding is NOT accepted: three sides is a real miss, not "close enough".
    const v0 = vars.find((x) => /focus\/ring\/width$/.test(x.name));
    for (const k of SIDES) ring.boundVariables[k] = { id: v0?.id };
    delete ring.boundVariables.strokeLeftWeight;
    delete (ring as { strokeWeight?: unknown }).strokeWeight;
    const partial = diffAnatomy(plans, members, planComponentName, ports, {});
    ok(partial.some((d) => d.field === 'bound' && /strokeWeight→UNBOUND/.test(d.actual ?? '')),
      `#1332 an INCOMPLETE per-side binding (three of four sides) is reported, not accepted — the check requires the complete set (${partial.filter((d) => d.field === 'bound').map((d) => d.actual).join('; ') || 'NOT REPORTED'})`);
  }
}

// ── OVERLAY-WASH: BOUND ON container.fills AND RESOLVED BY THE EMITTED BRAND (#1429) ────────────
//
// THE QA FINDING (2026-09-15, ENGINE 0.87.0): all button families reported 96 misses and all
// icon-button families 24, of the form `container.fills -> color/interactive/<c>/overlay/{hover,pressed}`
// — read as "the hover/pressed overlay wash is not being bound on the container across the corpus".
//
// THE DIAGNOSIS IS (b), A TELEMETRY READING — NOT A DROPPED WASH, and the evidence is below in this very
// block. The `container` box declares `paintSlots: ['overlay','fill','border']` (button.ts / icon-button.ts),
// so on an outline/text hover/pressed coordinate the projection binds `interactive.<c>.overlay.<state>`
// (the translucent wash) onto `container.fills` — measured here as 96 bindings per button family and 12 per
// icon-button family, exactly where the QA said nothing landed. On every brand that USES the wash
// (`outlineInteraction: 'overlay-neutral'`, the default and the whole committed corpus) that variable IS
// emitted and the binding RESOLVES: 0 dangling. The 96/24 QA misses came from a brand built with
// `outlineInteraction: 'none'` (the `minimal-levers` corpus member), which DELIBERATELY does not emit the
// wash; the brand-agnostic component binds it regardless, so the paste's name-resolution channel reports a
// miss and #1387 already neutralizes the visual to transparent (never Figma's white). So counting that as a
// corpus-wide defect was the false positive.
//
// WHY THIS BLOCK EXISTS, and why the corpus loop above could never have caught it (docs/34 shape 11): that
// loop stocks its shim's variable catalogue FROM THE PLAN (`fullFor`), so a bound paint ALWAYS resolves and
// a wash that the engine never emits — or emits under a drifted name — round-trips green. The only witness
// is an INDEPENDENT ORACLE: the token layer the engine actually emits, a code path (`emit-figma-color` /
// `modes.ts`) entirely separate from the projection (`anatomy-figma`). This block reads the container's
// bound wash off the HOST (what the executor wrote) and checks it against that emitted brand — so a wash
// dropped from the PROJECTION fails the reachability floor by name, and a wash dropped from (or renamed in)
// the EMISSION fails the resolution check by name. Neither is derivable from the other.
{
  // THE INDEPENDENT ORACLE — an overlay-neutral brand's emitted color-variable tails. `nbTheme()` is a real
  // brand on the default `overlay-neutral`, measured 0-dangling; its variables come from the emitter, never
  // from any plan, which is the whole point (docs/34 shape 11). Tail space because a plan binds root-relative
  // and every emitted variable is `<root>/<tail>` — the same `tailOf` the paste executor keys `byName` on.
  const { palette, color } = buildFigmaColor(nbTheme());
  const emittedTails = new Set<string>();
  for (const c of [palette, ...color]) for (const v of c.variables ?? []) emittedTails.add(tailOf(v.name));
  ok(emittedTails.size > 0, `#1429 the overlay-neutral oracle emitted color variables (independent-oracle floor: ${emittedTails.size})`);

  // A wash tail is `…/interactive/<family>/overlay/<hover|pressed>` — page (`color/interactive/…`) and inverse
  // (`color/inverse/interactive/…`) both end this way; `selected` is not a button/icon-button state and is not
  // matched. This is the SAME shape the QA quoted, so a match here is a binding on exactly the coordinate it named.
  const washTail = /(^|\/)interactive\/[a-z-]+\/overlay\/(hover|pressed)$/;
  // The families the QA named — button + its two intent siblings, icon-button + its two — read off `componentDefs`
  // rather than listed, so a new intent sibling is covered without editing this gate.
  const FAMILIES = componentDefs.filter((d) => /^(button|icon-button)(-|$)/.test(d.id)).map((d) => d.id);

  let washBindings = 0;                       // container members whose fills bind a hover/pressed wash
  const washNames = new Set<string>();        // the distinct wash tails the containers bind
  const perFamily: string[] = [];
  const emptyFamilies: string[] = [];         // families binding NO wash — a per-family representation gap
  const dangling: string[] = [];              // wash bindings the emitted brand does NOT resolve
  for (const id of FAMILIES) {
    const def = componentDefs.find((d) => d.id === id)!;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    let n = 0;
    for (const m of members) {
      const arr = (m as { fills?: unknown }).fills;
      const first = Array.isArray(arr) ? (arr[0] as { boundVariables?: Record<string, { id?: unknown }> } | undefined) : undefined;
      const boundId = first?.boundVariables?.color?.id;
      if (typeof boundId !== 'string') continue;
      const tail = boundId.replace(/^V:/, '');   // the shim ids variables `V:<tail>` (component-shim `mkVar`)
      if (!washTail.test(tail)) continue;
      n++; washBindings++; washNames.add(tail);
      if (!emittedTails.has(tail)) dangling.push(`${id}: ${String(m.name)} -> ${tail}`);
    }
    perFamily.push(`${id}=${n}`);
    if (n === 0) emptyFamilies.push(id);
  }

  // (1) THE WASH LANDS ON container.fills IN EVERY NAMED FAMILY — representation, not a corpus count
  //     (docs/34): a wash dropped on ONE family (the button factory is shared, but icon-button is a
  //     separate def) still binds the wash from the others, so a corpus-wide `> 0` floor would pass on a
  //     real per-family drop. Asserting each family is represented is what fires BY NAME on the defect the
  //     issue scopes to "button / button-destructive / button-neutral / icon-button (+ its variants)".
  ok(FAMILIES.length > 0 && emptyFamilies.length === 0,
    `#1429 the hover/pressed overlay wash IS bound on container.fills in every named family (${washBindings} bindings — ${perFamily.join(', ')})${emptyFamilies.length ? ` — DROPPED IN: ${emptyFamilies.join(', ')}` : ''}`);
  // (2) EVERY bound wash RESOLVES against the INDEPENDENT emitted overlay-neutral brand — 0 dangling. This is
  //     the QA's `container.fills -> …/overlay/{hover,pressed}` "miss", proven ABSENT for a brand that uses the
  //     wash: the 96/24 misses were an `outlineInteraction: 'none'` brand opting out (#1387), not a drop.
  ok(dangling.length === 0,
    `#1429 every container overlay-wash binding resolves against the emitted overlay-neutral brand — 0 dangling (${dangling.length ? dangling.slice(0, 4).join('; ') : 'none'})`);
  // (3) THE RIGHT TOKENS, not merely "some overlay" (docs/34 shape 5): the exact names the QA quoted are bound.
  for (const want of ['color/interactive/primary/overlay/hover', 'color/interactive/primary/overlay/pressed'])
    ok(washNames.has(want), `#1429 the container binds ${want} at its state coordinate (host truth)`);

  // ── NEGATIVE CONTROLS — the two directions of a genuinely-dropped wash, proving neither check is vacuous.
  //
  // (a) PROJECTION DROP. Rebuild button, clear the wash off its containers (models the projection not binding
  //     the overlay), and confirm the reachability floor (1) would then read 0 — so a dropped wash fires it.
  {
    const def = componentDefs.find((d) => d.id === 'button')!;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const countWash = (): number => members.reduce((a, m) => {
      const id = (m as { fills?: { boundVariables?: Record<string, { id?: unknown }> }[] }).fills?.[0]?.boundVariables?.color?.id;
      return a + (typeof id === 'string' && washTail.test(id.replace(/^V:/, '')) ? 1 : 0);
    }, 0);
    const before = countWash();
    for (const m of members) {
      const id = (m as { fills?: { boundVariables?: Record<string, { id?: unknown }> }[] }).fills?.[0]?.boundVariables?.color?.id;
      if (typeof id === 'string' && washTail.test(id.replace(/^V:/, ''))) (m as { fills: unknown[] }).fills = [];
    }
    ok(before > 0 && countWash() === 0,
      `#1429 mutation (projection drop): clearing the wash off button containers drives the count ${before} → 0, so floor (1) fires by name`);
  }
  // (b) EMISSION DROP. Remove the wash tails from the oracle (models `modes.ts` no longer emitting the wash,
  //     or renaming it) and confirm EVERY container wash binding is then reported dangling — so check (2) fires.
  {
    const oracleNoWash = new Set([...emittedTails].filter((t) => !washTail.test(t)));
    const nowDangling = [...washNames].filter((t) => !oracleNoWash.has(t));
    ok(washNames.size > 0 && nowDangling.length === washNames.size,
      `#1429 mutation (emission drop): with the wash removed from the oracle, all ${washNames.size} bound wash name(s) are reported dangling, so check (2) fires by name (dangling ${nowDangling.length})`);
  }
}

// ── #1424: THE WRAPPING LABEL, READ BACK OFF THE BUILT NODE — HOST-TRUTH ────────────────────────
//
// The row's label must FILL its main axis and WRAP (Prism 2's radio-button-row / checkbox-row), and the
// control must stay FIXED so a wrapping label never shrinks or stretches it. The generic diff above already
// checks each of these plan fields against the built node (plan-as-oracle: `layoutGrow`/`textAutoResize`
// classified in `anatomy-readback.ts`), which catches an executor that fails to write them. What it CANNOT
// catch is a def that silently STOPS wrapping — drop `wrap` and the plan no longer carries the fields, so
// plan-vs-built still agrees on their absence. This block closes that with an oracle authored HERE and
// nowhere else — the owner-decided fact that these two rows wrap — so a `wrap` removed from either def
// diverges from this and fails BY NAME (docs/34). It builds through the shared shim exactly as the corpus
// loop does, then reads each row's label and controlBox back off the host.
{
  const WRAPS = ['radio', 'checkbox-row'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
  const findByName = (n: any, name: string): any => (n?.name === name ? n : (n?.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));
  for (const id of WRAPS) {
    const def = componentDefs.find((d) => d.id === id);
    ok(!!def, `#1424 host-truth: the ${id} def is registered and projects`);
    if (!def) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const labels = members.map((m) => findByName(m, 'label'));
    const controlBoxes = members.map((m) => findByName(m, 'controlBox'));
    // SCOPE FLOOR — a label was built into every member, or "they all wrap" is a statement about an empty set.
    ok(members.length > 0 && labels.every(Boolean),
      `#1424 host-truth: ${id} builds a label into every member (${labels.filter(Boolean).length}/${members.length})`);
    // THE LABEL FILLS AND WRAPS — read back off the built node (both facts, since either alone does not wrap).
    ok(labels.length > 0 && labels.every((l) => l.layoutGrow === 1 && l.textAutoResize === 'HEIGHT'),
      `#1424 host-truth: every ${id} label reads back layoutGrow=1 + textAutoResize=HEIGHT — it fills the row and wraps (e.g. layoutGrow=${String(labels[0]?.layoutGrow)}, textAutoResize=${String(labels[0]?.textAutoResize)})`);
    // THE CONTROL STAYS FIXED — it does not grow (layoutGrow 0) and its cross axis is FIXED, so the wrapping
    // label never shrinks or stretches it.
    ok(controlBoxes.length > 0 && controlBoxes.every((c) => c && c.layoutGrow !== 1 && c.counterAxisSizingMode === 'FIXED'),
      `#1424 host-truth: every ${id} controlBox reads back fixed/hug — layoutGrow≠1 (${String(controlBoxes[0]?.layoutGrow)}) and counterAxisSizingMode=FIXED (${String(controlBoxes[0]?.counterAxisSizingMode)})`);
  }
}

console.log(failed ? `\n❌ ${failed} FAILED` : '\n✅ component round-trip: ALL PASS');
process.exit(failed ? 1 : 0);
