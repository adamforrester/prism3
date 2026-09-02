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

console.log(failed ? `\n❌ ${failed} FAILED` : '\n✅ component round-trip: ALL PASS');
process.exit(failed ? 1 : 0);
