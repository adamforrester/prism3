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

import { readFileSync } from 'node:fs';
import { applyOutlineInteraction } from '@prism3/engine/anatomy-figma';
import { resolveAllModes } from '@prism3/engine/modes';
import { brandTheme } from '@prism3/engine/theme';
import { parseDesignMd } from '@prism3/engine/design-md';
import { figmaAnatomySet, planComponentName, planBoundVars, planPaintVars, planTextStyles, planEffectStyles } from '@prism3/engine/anatomy-figma';
import type { AnatomyPlan } from '@prism3/engine/anatomy-figma';
import { componentDefs } from '@prism3/engine/components/index';
import { diffAnatomy, unclassifiedFields, fieldCoverage } from '@prism3/engine/anatomy-readback';
import type { Divergence, HostNode, ReadPorts } from '@prism3/engine/anatomy-readback';
import { buildFigmaColor } from '@prism3/engine/emit-figma-color';
import { buildFigmaTextStyles } from '@prism3/engine/emit-figma-font';
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
// …plus every def the `solid-tint` lever MATERIALIZES differently (#1614), built for the owner's brand: its
// outline/text hover binds the category's fill at a PAINT OPACITY, a plan field (`paintOpacity`) no default
// def carries — so without these rows that predicate would compare nothing, and an executor dropping the
// opacity would read back as the fill, opaque, with every binding check green.
const TINT_ROLES = resolveAllModes({ ...brandTheme(parseDesignMd(readFileSync(new URL('../../packages/engine/examples/nb-redesign.design.md', import.meta.url), 'utf8')).input), outlineInteraction: 'solid-tint' })[0].roles;
const TINTED = PROJECTED.flatMap((d) => { const m = applyOutlineInteraction(d, 'solid-tint', TINT_ROLES); return m === d ? [] : [{ ...m, id: `${d.id}@solid-tint` }]; });
for (const def of [...PROJECTED, ...TINTED]) {
  try {
    const r = await roundTrip(def);
    inventory.push({ def: def.id, divergences: r.divergences, members: r.members, plans: r.plans.length });
  } catch (e) {
    inventory.push({ def: def.id, divergences: [{ member: '(build)', path: '', field: 'THREW', expected: 'a built set', actual: (e as Error).message }], members: 0, plans: 0 });
  }
}
ok(TINTED.length > 0 && (EXERCISED.paintOpacity ?? 0) > 0,
  `#1614 the solid-tint materializations round-trip too — ${TINTED.length} def(s), ${EXERCISED.paintOpacity ?? 0} paint opacities read back off the host`);

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

// ── #1514: THE COMPOSITE TEXT STYLE SURVIVES THE #865 DEFAULTS SEAM — HOST-TRUTH + INDEPENDENT ORACLE ──
//
// THE DEFECT (owner QA 2026-09-18): every projected component text node showed its family/size/style bound to
// variables but carried NO composite text style — loose variables, not "this text uses `label/md/emphasis`".
//
// THE FIRST DIAGNOSIS BLAMED THE CHARACTERS-BIND and was wrong (#1567). It held that binding a node to a
// set-level TEXT property reset it and dropped the `textStyleId`, so the fix re-asserted the style in the
// post-wire seam — inside `if (field === 'characters' && node)`. That was measured on the host (2026-09-22) and
// the bind detaches nothing. What detaches `textStyleId` is writing ANY of `paragraphSpacing`, `leadingTrim`,
// `fontSize`, `fontName`, `lineHeight`, `letterSpacing`, `textCase` — even when the value written EQUALS the
// node's current one. `claimDefaults` (#865, "AND IT HAS TO BE LAST") writes `paragraphSpacing` and
// `leadingTrim` unconditionally on every TEXT node, after the style is applied. That is the real detach.
//
// The wrong diagnosis was invisible here because a repair coupled to the characters-ref happens to cover every
// node in this corpus — every component text node IS bound. The host had a set where none were: `button-neutral`
// wired 0 references and carried 432/432 text nodes with no style, while `button` and `button-destructive` were
// perfect. Same def, same plan, opposite outcome — the asymmetry that named the coupling. So the fix now repairs
// at the SOURCE: `build` re-applies the style immediately after `claimDefaults` and reports a
// `textStyle -> DISCARDED` miss if it does not hold, for every text node, wired or not. The shim models the
// detaching setters (`component-shim.ts`, `mkNode`), so this block goes red without that re-apply.
//
// WHAT THE CORPUS LOOP CANNOT CATCH, and why this block exists (docs/34): that predicate is plan-as-oracle —
// it checks the built node's `textStyleId` against the PLAN's `textStyle`, so a def whose `type` key was flipped
// round-trips green (the plan follows the flip). This closes that with an oracle authored HERE and nowhere else:
// a literal per-coordinate table of the OWNER-DECIDED style each component text node must carry (button labels
// take the emphasis LABEL style at their size rung; form controls and messages take the BODY / CAPTION reading
// styles). A `type` flipped in a def diverges from THIS and fails by name. The INDEPENDENT floor is the emitted
// style set (`buildFigmaTextStyles(nbTheme())` — the emitter, a code path separate from the projection, the same
// independence #1429 uses with `buildFigmaColor`): every style the contract names must really be emitted, so a
// green is not "the def and the oracle agree on a name nothing emits".
{
  // THE OWNER-DECIDED CONTRACT — a LITERAL table keyed by coordinate, never `figmaTextStyleName(def.type)`.
  const STYLE_CONTRACT: Record<string, { parts: string[]; style: (c: Record<string, string | undefined>) => string }> = {
    button:          { parts: ['label'], style: (c) => ({ small: 'label/sm/emphasis', medium: 'label/md/emphasis', large: 'label/lg/emphasis' } as Record<string, string>)[c.size!] },
    'field-message': { parts: ['text'],  style: () => 'caption/md/default' },
    'text-field':    { parts: ['text'],  style: () => 'body/md/default' },
    select:          { parts: ['text'],  style: () => 'body/md/default' },
    'checkbox-row':  { parts: ['label'], style: (c) => ({ small: 'body/sm/default', medium: 'body/md/default', large: 'body/lg/default' } as Record<string, string>)[c.size!] },
    'radio-row':     { parts: ['label'], style: (c) => ({ small: 'body/sm/default', medium: 'body/md/default', large: 'body/lg/default' } as Record<string, string>)[c.size!] },
    'field-label':   { parts: ['text', 'indicator'], style: (c) => (({
      'small/regular': 'body/sm/default', 'small/bold': 'body/sm/strong',
      'medium/regular': 'body/md/default', 'medium/bold': 'body/md/strong',
      'large/regular': 'body/lg/default', 'large/bold': 'body/lg/strong',
    } as Record<string, string>)[`${c.size}/${c.weight}`]) },
  };

  // THE INDEPENDENT ORACLE — the emitted style names, from the emitter and never from any plan.
  const emittedStyleNames = new Set(buildFigmaTextStyles(nbTheme()).styles.map((s) => s.name));
  ok(emittedStyleNames.size > 0, `#1514 the emitter produced composite text styles (independent-oracle floor: ${emittedStyleNames.size})`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
  const findByName = (n: any, name: string): any => (n?.name === name ? n : (n?.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));

  for (const [id, contract] of Object.entries(STYLE_CONTRACT)) {
    const def = componentDefs.find((d) => d.id === id);
    ok(!!def, `#1514: the ${id} def is registered and projects`);
    if (!def) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const texts = await (shim as unknown as { getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalTextStylesAsync();
    const styleById = new Map(texts.map((s) => [s.id, s.name] as const));
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const byName = new Map(members.map((m) => [String(m.name), m] as const));

    let checked = 0;
    for (const plan of plans) {
      // `size` is a top-level plan field, the other axes ride `coord` — the oracle keys off both.
      const axes = { size: (plan as { size?: string }).size, ...plan.coord } as Record<string, string | undefined>;
      const want = contract.style(axes);
      ok(!!want, `#1514: ${id} member ${JSON.stringify(plan.coord)} maps to an owner-decided style (oracle covers this coordinate)`);
      if (!want) continue;
      // INDEPENDENT FLOOR: the style the contract names is really emitted — not merely a name the def echoes.
      ok(emittedStyleNames.has(want), `#1514: ${id}'s owner-decided style '${want}' is in the emitted style set (independent oracle)`);
      const member = byName.get(planComponentName(plan));
      for (const part of contract.parts) {
        const node = member ? findByName(member, part) : undefined;
        // SCOPE FLOOR: the text node was actually built into this member — otherwise "it carries the style"
        // is a statement about a node that does not exist.
        ok(!!node, `#1514: ${id}/${planComponentName(plan)} built the '${part}' text node (scope floor)`);
        if (!node) continue;
        const gotId = (node as { textStyleId?: unknown }).textStyleId;
        const gotName = typeof gotId === 'string' && gotId ? (styleById.get(gotId) ?? `id ${gotId} resolves to no style`) : 'NO TEXT STYLE APPLIED';
        ok(gotName === want,
          `#1514: ${id}/${planComponentName(plan)}/${part} carries the composite text style '${want}' after the #865 defaults seam (host holds '${gotName}')`);
        checked++;
      }
    }
    ok(checked > 0, `#1514: ${id} presented text nodes to check (scope floor: ${checked})`);
  }

  // NON-VACUITY (docs/34) — the pre-fix state, reproduced explicitly: a built text node whose `textStyleId`
  // was detached (exactly what the shim's `paragraphSpacing`/`leadingTrim` setters model, and what shipped
  // before this fix) is reported by the SAME read-back, by name. Without this, a check that only ever sees the
  // applied style could be an always-pass.
  {
    const def = componentDefs.find((d) => d.id === 'button')!;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const texts = await (shim as unknown as { getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalTextStylesAsync();
    const styleById = new Map(texts.map((s) => [s.id, s.name] as const));
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const label = findByName(members[0], 'label');
    const before = typeof label?.textStyleId === 'string' && label.textStyleId ? styleById.get(label.textStyleId) : undefined;
    (label as { textStyleId?: string }).textStyleId = '';   // the detach the fix defends against
    const afterName = typeof label?.textStyleId === 'string' && label.textStyleId ? (styleById.get(label.textStyleId) ?? 'unknown') : 'NO TEXT STYLE APPLIED';
    ok(!!before && afterName === 'NO TEXT STYLE APPLIED',
      `#1514 mutation: a built label whose textStyleId is detached reads back 'NO TEXT STYLE APPLIED' by name (was '${before ?? '—'}') — the check is not vacuous`);
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
// HERE, not derived from `planSetProperties` (docs/34). Reordering `planSetProperties` (its text → each
// boolean → the swap it gates → any unpaired swap order, #1519) then fails this BY NAME.
//
// The panel INTERLEAVE of the variant switches with the component properties is host-RENDERED and not
// asserted here (the repo's standing position that panel render order is "the owner's Figma check, not
// ours" — see `version.ts`/`test.ts`'s #1150 note); what the engine controls and this gates is that
// `label` is CREATED first and the swaps carry their `↳` labels.
{
  const CANON: Record<string, { componentProps: string[]; switches: string[] }> = {
    // button's presence toggles are VARIANT switches (edge-hugging leading/trailing change container
    // geometry, so #1331/#1379 keeps them variant, not boolean) — they are not component properties here,
    // so #1519's boolean→swap pairing does not reach button: its component properties stay `label` (TEXT)
    // then the two swaps in by-part order. The panel nesting of each swap beneath its switch is Figma's
    // own render off the `↳ ` name prefix, not an order this list controls.
    button: { componentProps: ['label', '↳ swap leading icon', '↳ swap trailing icon'], switches: ['leading icon', 'trailing icon'] },
    // select's `leading icon` is a node-visibility BOOLEAN component property since #1331 (not a variant
    // switch): it appears in componentProps and is NO longer among the variant switches. Reverting it to a
    // slot axis moves it back to `switches` and fails both assertions below by name. `message` is the
    // SECOND node-visibility boolean (#1426, hiding the composed FieldMessage). Since #1519 each icon swap
    // sits DIRECTLY under the boolean that gates it, so the panel reads `value` (TEXT) → `leading icon`
    // (BOOLEAN) → `↳ swap leading icon` (SWAP) → `message` (the standalone show/hide BOOLEAN, no swap to
    // pair). Reordering `planSetProperties` back to the old all-booleans-then-all-swaps grouping moves the
    // swap after `message` and fails this BY NAME. Dropping the showMessage boolean removes `message` here.
    select: { componentProps: ['value', 'leading icon', '↳ swap leading icon', 'message'], switches: [] },
    // text-field carries BOTH icon slots as node-visibility booleans (#1494) plus the `message` show/hide
    // boolean. #1519 pairs each swap under its boolean, so the panel reads `value` (TEXT) → `leading icon`
    // → `↳ swap leading icon` → `trailing icon` → `↳ swap trailing icon` → `message` (standalone). This is
    // the def where the pairing matters most (two icon slots): the old grouping would show both booleans,
    // then both swaps, detached — reordering `planSetProperties` back to it fails this BY NAME.
    'text-field': { componentProps: ['value', 'leading icon', '↳ swap leading icon', 'trailing icon', '↳ swap trailing icon', 'message'], switches: [] },
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
  ok(members.length === 20 && lvs.every(Boolean),
    `#1331 host-truth: the leading glyph node is built into EVERY member (${lvs.filter(Boolean).length}/${members.length})`);
  ok(lvs.length > 0 && lvs.every((lv) => lv.visible === false),
    '#1331 host-truth: every built leading glyph reads back `visible=false` — built hidden by default, not dropped');
  ok(lvs.length > 0 && lvs.every((lv) => (lv.componentPropertyReferences ?? {}).visible === liKey),
    "#1331 host-truth: every built leading glyph's `visible` is wired to the 'leading icon' boolean (componentPropertyReferences.visible)");
}

// ── #1428: A NESTED-INSTANCE PART-NAME COLLISION DOES NOT DROP THE HOST'S OWN REFERENCE — HOST-TRUTH ─
//
// select COMPOSES field-label AND field-message, and BOTH of those carry a part named `text` — the same
// name as select's own value `text`. On the live host `member.findOne(x => x.name === 'text')` descends
// INTO a nested instance and returns one of ITS `text` layers, a node that cannot hold this set's
// component-property reference (it is a sublayer of ANOTHER component): Figma refuses the write with "Could
// not create a new component property reference", so the `value` TEXT reference was reported dropped
// (#1428, QA 2026-09-15). The QA surfaced it on the status=warning/hover coordinates a live build happened
// to exercise via the throw path, but the collision is PER-MEMBER and general — every member's `text`
// read-back lands on the wrong node. The fix scopes every re-find-by-name past nested instances
// (`findOwnPart`, write-components.ts); `leadingVisual` (a unique name) and `message` (matched on the
// nested-instance node ITSELF, a valid target) never collided, which is exactly why only `text.characters`
// failed while `message.visible` never did.
//
// The corpus loop above uses OPAQUE nested-instance stubs, so it is blind to this by construction (docs/34:
// the gate's subject was under-modelled). Drive select through a shim whose nested instances carry their
// own `text` part (`nestedInstanceParts`), each refusing a reference write exactly as a sublayer of another
// component does, and assert the host holds select's OWN `value` reference on every member. Mutation-by-name
// (docs/34): revert the `findOwnPart` scoping and every member reports `text.characters -> DISCARDED`,
// failing the SECOND assertion below by name. The reachability floor (first assertion) proves the collision
// actually materialised — a naive descending `findOne` returns the nested-instance `text`, not select's own
// — so a green here is the reference surviving a REAL collision, not a fixture that never built one.
{
  const def = componentDefs.find((d) => d.id === 'select')!;
  const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(plans), page, nestedInstanceParts: ['text'] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  const res = await applyComponentPlan(plans, shim as any, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim's members
  const members = (page.children[0]?.children ?? []) as any[];
  // REACHABILITY FLOOR — the collision materialised: the SAME descending `findOne` the pre-fix code used
  // returns a node INSIDE a nested instance (flagged by the shim), not select's own value text. Without
  // this, the miss-count assertion below could pass because the fixture never built the colliding node.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim
  const naive = members[0]?.findOne?.((x: any) => x.name === 'text');
  ok(members.length === 20 && !!naive && (naive as { _inNestedInstance?: boolean })._inNestedInstance === true,
    `#1428 reachability: a naive descending findOne on a built select member returns a nested-instance \`text\` (the wrong node the fix defends against) — collision materialised (${members.length} members)`);
  const textRefMisses = res.misses.filter((m) => /\btext\.characters\b/.test(m));
  ok(res.wiredMembers === plans.length && textRefMisses.length === 0,
    `#1428: select's own \`value\` TEXT reference is created on every member despite the nested field-label/field-message \`text\` collision — 0 dropped (${textRefMisses.length ? textRefMisses.slice(0, 2).join(' | ') : 'none'}; wiredMembers=${res.wiredMembers}/${plans.length})`);
}

// ── #1473: A MEMBER-LEVEL id-SETTLE AFTER COMBINE LEAVES NO REFERENCE UNWIRED — HOST-TRUTH ──────────
//
// #1337's `detachPartsOnCombine` detaches a member's DESCENDANTS while keeping the member's OWN identity, so
// the wire-loop recovery re-finds an attached part THROUGH the combine-time member handle and lands. The
// field-label persistent misses (27 on a live aurora build, `emphasis=secondary/weight=bold`) are the level
// up: the host reassigns some members' OWN identity after combine, so the handle a run snapshotted at combine
// (`members = [...set.children]`) is detached while a fresh `set.children` read holds a live twin. The #1337
// recovery re-found through that SAME stale handle and threw again — a permanent "Could not create a new
// component property reference". The fix re-resolves the MEMBER from a fresh `set.children` read
// (`write-components.ts`, `liveByName`). The shim's `settleAfterCombine: 'all'` models the host behavior (see
// `component-shim.ts`); this reads the references back through `anatomy-readback.ts` — a reader entirely
// separate from the executor (docs/34) — and asserts none is DISCARDED. Mutation-by-name: revert the
// `liveByName` re-resolution and every member reports its `propertyRef` fields `→ DISCARDED`, failing the
// read-back assertion by name. The floor (`refsRepaired === refs > 0`) proves the settle actually detached
// every reference — without it there is nothing to recover and a green read-back is vacuous.
{
  const def = componentDefs.find((d) => d.id === 'field-label')!;
  const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
  const page: Page = { children: [] };
  const shim = makeShim({ ...fullFor(plans), page, settleAfterCombine: 'all' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  const res = await applyComponentPlan(plans, shim as any, {});
  const created = res.misses.filter((m) => /Could not create a new component property reference/.test(m));
  ok(res.refsRepaired > 0 && res.refsRepaired === res.refs && created.length === 0,
    `#1473 host-truth floor: the member-level settle detached and the fix recovered every reference (refsRepaired=${res.refsRepaired}/${res.refs}, ${created.length} "could not create")`);
  const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
  const texts = await (shim as unknown as { getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalTextStylesAsync();
  const varById = new Map(vars.map((v) => [v.id, v.name] as const));
  const styleById = new Map(texts.map((s) => [s.id, s.name] as const));
  const ports: ReadPorts = { varName: (id) => varById.get(id) ?? null, styleName: (id) => styleById.get(id) ?? null };
  const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
  const divergences = diffAnatomy(plans, members, planComponentName, ports, {});
  const refDiv = divergences.filter((d) => d.field === 'propertyRef' || d.field === 'visibleProp' || d.field === 'visible');
  ok(members.length === plans.length && refDiv.length === 0,
    `#1473 host-truth: reading the settled set back, every declared reference is retained — 0 propertyRef DISCARDED (${refDiv.length ? refDiv.slice(0, 3).map((d) => `${d.member}: ${d.actual}`).join(' | ') : 'none'})`);
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

// ── #1430: EVERY EMITTED SET CARRIES ITS VARIANT-SET FRAME — HOST-TRUTH ─────────────────────────
//
// THE DIAGNOSIS (progress log 2026-09-16): the emitted sets ARE real `ComponentSetNode`s —
// `combineAsVariants` creates them and the host reads them back as `type === 'COMPONENT_SET'` (asserted
// below), so this is NOT a projection-model defect. What #865 then did was BLANK the fill, purple dashed
// border and 5px radius Figma dresses a set with, so an emitted set read as a bare frame — the #1430
// canvas-scanning defect. The fix PRESERVES the border (`write-components.ts`' `isSet` branches). The
// shared shim now models the border `combineAsVariants` applies (`component-shim.ts`), so this reads it
// back off the BUILT set and fails BY NAME if the executor blanked it.
//
// The oracle — "a real ComponentSetNode carrying a non-empty dashed stroke and a set-shaped radius" — is
// authored HERE, not derived from the executor (docs/34): revert either `isSet` branch to the #865 blank
// and every emitted set trips the positive arm. The framing VALUES are Figma's and cannot be pinned
// offline (there is no live host); what IS checkable offline — and what the defect was — is whether the
// executor DESTROYS a border the host supplied. The negative arm proves the check is not vacuous.
{
  const framed = (set: Record<string, unknown> | undefined): string[] => {
    const problems: string[] = [];
    if (set?.type !== 'COMPONENT_SET') problems.push(`type=${String(set?.type)} (not a real ComponentSetNode)`);
    if (!((set?.strokes as unknown[])?.length > 0)) problems.push('no stroke (the variant-set border was blanked)');
    if (!((set?.dashPattern as unknown[])?.length > 0)) problems.push('no dashPattern (the border is not dashed)');
    const corners = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].map((c) => Number(set?.[c] ?? 0));
    if (!corners.every((r) => r > 0)) problems.push(`radius ${JSON.stringify(corners)} (a set frame is rounded, not a hard square)`);
    // No fill check: the set's opaque default fill is deliberately cleared to transparent (#1430), so its
    // canvas identity is the dashed border + radius, not a fill.
    return problems;
  };

  let checked = 0;
  const stripped: string[] = [];
  for (const def of PROJECTED) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const set = page.children[0] as Record<string, unknown> | undefined;
    if (set?.type !== 'COMPONENT_SET') continue;   // no set to frame (e.g. the emitAsComponents route)
    checked++;
    const problems = framed(set);
    if (problems.length) stripped.push(`${def.id}: ${problems.join('; ')}`);
  }
  ok(checked > 0, `#1430: the corpus produced ${checked} emitted COMPONENT_SET(s) to check the frame on (scope floor)`);
  ok(stripped.length === 0,
    `#1430: every emitted set reads back as a real ComponentSetNode carrying its variant-set frame — the dashed purple border and a set radius — so it is pickable on the canvas${stripped.length ? ` — STRIPPED: ${stripped.slice(0, 6).join(' | ')}` : ''}`);

  // NEGATIVE (docs/34 non-vacuity): a set whose stroke/dash was blanked — the pre-#1430 #865 behavior — IS
  // reported by the same predicate, so the positive arm above is a live check and not an always-pass.
  const bareDef = componentDefs.find((d) => d.figmaProperties)!;
  const barePlans = figmaAnatomySet(bareDef, { swapTarget: SWAP_TARGET });
  const barePage: Page = { children: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
  await applyComponentPlan(barePlans, makeShim({ ...fullFor(barePlans), page: barePage }) as any, {});
  const bareSet = barePage.children[0] as Record<string, unknown>;
  bareSet.strokes = []; bareSet.dashPattern = [];
  const bareProblems = framed(bareSet);
  ok(bareProblems.length > 0,
    `#1430 mutation: a set stripped of its stroke/dash is reported by name (${bareProblems.join('; ') || 'NOT REPORTED — the check went silent'})`);
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
// (the translucent wash) onto `container.fills` — measured here as 96 bindings per button family and 48 per
// icon-button family (2 wash appearances × 2 wash states × 3 sizes × 2 shapes × 2 surfaces; the count moves
// with the def's axes — it was 24 before #1427 added `surface`, and assertion (1) prints the live per-family
// figures, #1451), exactly where the QA said nothing landed. On every brand that USES the wash
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
  const WRAPS = ['radio-row', 'checkbox-row'];
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

// ── #1503: CROSS-AXIS CHILD FILL, READ BACK OFF THE BUILT NODE — HOST-TRUTH ─────────────────────
//
// The owner decided (Option B, follow Prism 2) that the column-stacked form components should have a
// fixed-width root with their inner children set to cross-axis FILL, so the rows / inputs SPAN the
// container rather than rendering ragged. The projection realizes that with `crossAxisFill` →
// `layoutAlign: STRETCH` (the missing cross-axis twin of `wrap`'s main-axis `layoutGrow`), applied to the
// child BY ITS PARENT so it reaches a nested INSTANCE the child neutralizer returns early on.
//
// The generic diff above already checks `layoutAlign` against the built node (plan-as-oracle:
// `anatomy-readback.ts`'s `layoutAlign` predicate), which catches an executor that fails to write it — the
// #874 class. What it CANNOT catch is a def that silently STOPS filling: drop `crossAxisFill` and the plan
// no longer carries the field, so plan-vs-built still agrees on its absence. This block closes that with an
// oracle authored HERE and nowhere else — the owner-decided fact that these children fill their container's
// width — so a `crossAxisFill` removed from any of these parts reads back `INHERIT`/absent, diverges from
// this STRETCH oracle, and fails BY NAME (docs/34). It also proves the parent-applied write reaches a nested
// INSTANCE, the whole reason `layoutAlign` is applied by the parent rather than in `claimDefaults`.
{
  // THE OWNER-DECIDED FILL CONTRACT — which parts of which defs must span their container's cross axis.
  // Authored here, not derived from the defs (docs/34): the def is the SUBJECT, this is the ORACLE.
  //   · checkbox-group / radio-group — the stacked rows fill the group's width (the label deliberately hugs).
  //   · select — the composed label + message fill the field's width (the control already spans via minWidth).
  // text-field and field-message are HELD (their width floor / cross-axis alignment are owner design calls,
  // see the PR body), so they are deliberately absent — this oracle asserts only what the owner settled.
  const FILLS: Record<string, string[]> = {
    'checkbox-group': ['row1', 'row2', 'row3'],
    'radio-group': ['row1', 'row2', 'row3'],
    'select': ['label', 'message'],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
  const findByName = (n: any, name: string): any => (n?.name === name ? n : (n?.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));
  for (const [id, partNames] of Object.entries(FILLS)) {
    const def = componentDefs.find((d) => d.id === id);
    ok(!!def, `#1503 host-truth: the ${id} def is registered and projects`);
    if (!def) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    for (const part of partNames) {
      const nodes = members.map((m) => findByName(m, part));
      // SCOPE FLOOR — the part was built into every member, or "they all fill" is a statement about an empty
      // set. This also fires if a part is renamed or dropped from the def.
      ok(members.length > 0 && nodes.every(Boolean),
        `#1503 host-truth: ${id} builds a '${part}' into every member (${nodes.filter(Boolean).length}/${members.length})`);
      // THE CHILD FILLS THE CROSS AXIS — read back off the built node. A `nest` part (rows, label, message)
      // is a nested INSTANCE, so a green here proves the PARENT-applied `layoutAlign` reached it — a write
      // `claimDefaults` skips. Drop `crossAxisFill` from the def and this reads `INHERIT`/undefined, failing
      // by name.
      ok(nodes.length > 0 && nodes.every((no) => no && no.layoutAlign === 'STRETCH'),
        `#1503 host-truth: every ${id} '${part}' reads back layoutAlign=STRETCH — it fills the container's width (e.g. layoutAlign=${String(nodes[0]?.layoutAlign)})`);
    }
  }
  // THE WIDTH-FLOOR HALF — the container carries `minWidth: 320` so the STRETCH resolves against a real width
  // (Prism 2's 320) rather than the widest label. Read back off the built group root, oracle authored here.
  for (const id of ['checkbox-group', 'radio-group']) {
    const def = componentDefs.find((d) => d.id === id);
    if (!def) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    ok(members.length > 0 && members.every((m) => (m as { minWidth?: unknown }).minWidth === 320),
      `#1503 host-truth: every ${id} member reads back minWidth=320 — the width floor the rows fill (e.g. minWidth=${String((members[0] as { minWidth?: unknown })?.minWidth)})`);
  }
}

// ── #1518: text-field CONTROL READS BACK minWidth=320 — HOST-TRUTH ──────────────────────────────
//
// The owner settled text-field's default width at 320 (parity with select, #1345): the `control` box carries a
// `minWidth: 320` LITERAL, so a projected field reads at a comfortable width rather than hugging narrow. Unlike
// the #1503 groups (whose floor is on the ROOT), text-field's floor sits on the visible CONTROL — the one place
// projection can express it (the column then hugs to the 320 control). The generic plan-vs-built diff already
// checks `minWidth` against the built node, which catches an executor that fails to WRITE it (#874 class); what
// it CANNOT catch is the def silently STOPPING declaring it (plan omits the field → plan-vs-built agrees on its
// absence). This block closes that with an oracle authored HERE — the owner-decided 320 — read back off the
// built control, so dropping `minWidth` from the def reads back `undefined`, diverges from 320, and fails BY
// NAME (docs/34). Mirrors the #1503 group-root minWidth half, one node deeper (the control, not the root).
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
  const findByName = (n: any, name: string): any => (n?.name === name ? n : (n?.children ?? []).map((c: any) => findByName(c, name)).find(Boolean));
  const def = componentDefs.find((d) => d.id === 'text-field');
  ok(!!def, '#1518 host-truth: the text-field def is registered and projects');
  if (def) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    await applyComponentPlan(plans, shim as any, {});
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const controls = members.map((m) => findByName(m, 'control'));
    // SCOPE FLOOR — the control was built into every member, or "they all read 320" is a statement about an
    // empty set. This also fires if the control part is renamed or dropped from the def.
    ok(members.length > 0 && controls.every(Boolean),
      `#1518 host-truth: text-field builds a 'control' into every member (${controls.filter(Boolean).length}/${members.length})`);
    // THE WIDTH FLOOR — read back off the built control. Oracle 320 authored here; drop `minWidth: 320` from the
    // control PartDef and this reads back `undefined`, failing by name.
    ok(controls.length > 0 && controls.every((c) => (c as { minWidth?: unknown })?.minWidth === 320),
      `#1518 host-truth: every text-field control reads back minWidth=320 — the owner-settled default width (e.g. minWidth=${String((controls[0] as { minWidth?: unknown })?.minWidth)})`);
  }
}

// ── #1513/#1567: A BOUND CAPTION IS ONE SHARED CELL, AND THE COLLAPSE IS REPORTED — HOST-TRUTH ────
//
// #1474 gave field-message four DISTINCT per-status captions (Set A) via `byVariant.status`, and the engine
// + offline shim carried them (`test-write-components.ts`). A LIVE projection showed one string on all four.
//
// #1513 DIAGNOSED THAT AS A ONE-SHOT RESET — Figma adopting the set-level TEXT property's `defaultValue` onto
// a node at bind time — and fixed it by re-asserting each member's own copy AFTER wiring. That went green here
// and the live file got WORSE: all four statuses showed "All set.", the LAST member's caption rather than the
// first's (#1567). The host was measured on a scratch page (2026-09-22, Figma console) to settle it, and the
// reset model was wrong in both directions:
//
//   • `node.characters` on a characters-bound node READS the property's `defaultValue`, and
//   • `node.characters = v` WRITES THROUGH to it — every sibling bound to that property reads the new value.
//
// A component set holds ONE default per TEXT property. So a per-member caption behind a bound part is not
// merely reset, it is NOT EXPRESSIBLE, and the re-assert loop was not repairing four captions — it was
// overwriting one shared cell four times, leaving whichever member it wrote last. This arm pins the host truth
// (one shared default, reached by every member) and pins that the executor now REPORTS the collapse by name
// instead of silently causing it.
//
// THE COLLISION WAS A DESIGN QUESTION, NOW RESOLVED (Option 2, #1575): #1474 wanted four authored captions,
// #1018 wanted one overridable TEXT property, and on this host `field-message`'s `text` part can have one or
// the other. The owner kept the property, so the def declares ONE caption; the members stay distinct by GLYPH
// per status. This arm pins that resolved state, and keeps the collapse-report mechanism guarded on a
// SYNTHETIC divergent def below — so the safety net for a future mis-authored def is not deleted along with
// the four-caption spread that used to exercise it.
//
// The oracle — the canonical default and the synthetic spread — is authored HERE, not read off the def
// (docs/34). The FLOORS make the positive arms non-vacuous: (1) the def declares ONE caption, so "every member
// reads one string" is a claim about an intended single default and a re-added spread fails by name; and
// (2) write-through is LIVE — writing one member's caption moves every sibling's — so a green is the executor
// reading a REAL shared cell, not a shim with no sharing to break. Mutation-by-name: re-add `byVariant` to
// field-message and floor (2) + the surface baseline fail; delete the executor's collapse report and the
// synthetic safety-net arm below fails.
{
  const def = componentDefs.find((d) => d.id === 'field-message');
  ok(!!def, '#1513 host-truth: the field-message def is registered and projects');
  if (def) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- recursive node walk over the shim tree
    const findText = (n: any): any => (n?.type === 'TEXT' ? n : (n?.children ?? []).map((c: any) => findText(c)).find(Boolean));
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    const res = await applyComponentPlan(plans, shim as any, {});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural read-back off the shim's set
    const set = page.children[0] as any;
    const members = (set?.children ?? []) as unknown as HostNode[];
    const texts = members.map((m) => findText(m));
    // SCOPE FLOOR — a caption TEXT was built into every member, or "they all read one cell" is a claim about
    // an empty set.
    ok(members.length === 4 && texts.every(Boolean),
      `#1513 host-truth: field-message builds a caption TEXT into every status member (${texts.filter(Boolean).length}/${members.length})`);
    const captions = texts.map((t) => String(t?.characters ?? '<none>'));
    // THE CANONICAL DEFAULT (#1575, Option 2), authored here — not derived from the def (docs/34). `WANT[0]`
    // is the one caption every bound member displays; `planSetProperties` declares it as the property's default.
    const WANT = ['This is a status message.'];

    // FLOOR (1): the set carries ONE TEXT property, and its default is the canonical caption — the cell every
    // bound member reads. This is the assertion the live "All set." everywhere would have failed.
    const defs = set.componentPropertyDefinitions as Record<string, { type: string; defaultValue?: unknown }>;
    const textKeys = Object.keys(defs ?? {}).filter((k) => defs[k].type === 'TEXT');
    ok(textKeys.length === 1 && defs[textKeys[0]].defaultValue === WANT[0],
      `#1513 floor: the set carries exactly ONE TEXT property and its default is the canonical caption "${WANT[0]}" (${textKeys.length} TEXT propert(ies), holding ${JSON.stringify(textKeys.map((k) => defs[k].defaultValue))})`);

    // FLOOR (2): the def declares ONE caption — no `byVariant` spread (Option 2, #1575). Without this floor,
    // "every member reads one string" is trivially true of any def; with it, a re-added `byVariant` fails
    // here by name.
    const declared = plans.map((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- walking the plan tree for the text part
      const walk = (n: any): any => (n?.characters !== undefined ? n : (n?.children ?? []).map((c: any) => walk(c)).find(Boolean));
      return String(walk(p.root)?.characters);
    });
    ok(new Set(declared).size === 1 && declared[0] === WANT[0],
      `#1575 floor: the def declares ONE caption across all four status members, not a spread (${[...new Set(declared)].join(' | ')})`);

    // FLOOR (3): WRITE-THROUGH is live. One member's caption write moves EVERY sibling's, which is the host
    // behavior that makes the per-member re-assert destructive rather than merely ineffective.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural write onto the shim node
    const probe = texts[1] as any;
    const otherBefore = String(texts[2].characters);
    probe.characters = 'sentinel — should reach every sibling';
    ok(otherBefore === WANT[0] && String(texts[2].characters) === 'sentinel — should reach every sibling'
      && String(defs[textKeys[0]].defaultValue) === 'sentinel — should reach every sibling',
      '#1513 floor: writing ONE bound member\'s caption moves every sibling AND the set-level default — '
      + `write-through is live, so a per-member caption is not expressible (sibling was "${otherBefore}", now "${String(texts[2].characters)}")`);

    // THE FIX, HALF ONE: the executor leaves that one cell holding the DECLARED default, so every member shows
    // the canonical caption deterministically — not, as before, whichever member the re-assert loop wrote last.
    // (`captions` was read before the FLOOR (3) probe.)
    ok(captions.every((c) => c === WANT[0]),
      `#1513/#1567: every field-message member reads the set's ONE declared default, deterministically — not the last member's caption clobbered over the rest (${captions.join(' | ')})`);

    // THE FIX, HALF TWO: the executor's OWN independent check agrees. `write-components.ts` re-reads
    // `set.componentPropertyDefinitions` after the wire phase — a different object, at a later time, than
    // anything it wrote (docs/34: the old read-back compared the value it had just written against the node it
    // had just written to, so it could never fire) — and reports `-> DRIFTED` if the set no longer holds the
    // declared default. Zero DRIFTED is the assertion the live "All set." everywhere would have failed.
    const drifted = res.misses.filter((m) => /-> DRIFTED/.test(m));
    ok(drifted.length === 0,
      `#1567: the executor's independent re-read of the SET's property definitions finds no drifted default (${drifted.length ? drifted.join(' | ') : 'none'})`);

    // THE RESOLVED STATE: field-message declares ONE caption, so there is nothing to collapse — the executor
    // reports NO `COLLAPSED` miss for it. (The mechanism that catches a def which DOES declare a spread is
    // guarded on a synthetic def below, so this is not a silent gate deletion.)
    const collapse = res.misses.filter((m) => /text\.characters -> COLLAPSED/.test(m));
    ok(collapse.length === 0,
      `#1575: field-message declares one caption, so the executor reports NO collapse (${collapse.length ? collapse.join(' | ') : 'none'})`);
  }

  // THE SAFETY NET STAYS GUARDED (docs/34): a SYNTHETIC def that re-adds divergent captions on the bound
  // `text` part must still trip the executor's #1567 collapse report BY NAME — so the mechanism a future
  // mis-authored def would need is proven live, not deleted with the four-caption spread that used to
  // exercise it. Cloning field-message and re-adding only `byVariant` keeps the synthetic minimal and real.
  const base = componentDefs.find((d) => d.id === 'field-message');
  if (base?.figmaProperties) {
    const SPREAD = { error: 'Something needs fixing.', warning: 'Double-check this.', success: 'All set.' };
    const synthetic = {
      ...base,
      figmaProperties: {
        ...base.figmaProperties,
        texts: { message: { part: 'text', default: 'This is a status message.', byVariant: { status: SPREAD } } },
      },
    } as typeof base;
    const plans = figmaAnatomySet(synthetic, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    const res = await applyComponentPlan(plans, shim as any, {});
    const collapse = res.misses.filter((m) => /text\.characters -> COLLAPSED/.test(m));
    ok(collapse.length === 1 && collapse[0].includes('distinct captions'),
      `#1575 safety net: a def that DECLARES divergent captions on the bound part still trips the collapse report by name (${collapse.length} miss(es): ${collapse[0] ?? '—'})`);
  }
}

// ── #1516: AN ASYNC MEMBER-SETTLE DURING THE WIRE PHASE LEAVES NO PROPERTY-REFERENCE MISS — HOST-TRUTH ─
//
// #1473 recovers a member whose identity the host reassigns AT COMBINE by re-resolving it from a
// live-member map the executor snapshots after the layout `resize` — on the premise that once every
// set-level op has run, the reconciliation is done. #1516 is the instant that premise misses: the host
// finishes reassigning SOME members' identity ASYNCHRONOUSLY, only DURING the wire loop — after that
// snapshot, on one of the loop's `await breathe` yields. A recovery through the once-snapshotted map lands
// on the detached original and Figma refuses the reference AGAIN ("Could not create a new component
// property reference"), so the miss is permanent. Live it concentrated on the LAST-wired coordinates —
// field-label `state=disabled` (~30), text-field `status=warning` / `state=disabled` (~33), select (36
// earlier) — the members reached after the most yields (QA 2026-09-18). The fix reads `set.children` FRESH
// at each use rather than from a snapshot (`liveMember`, write-components.ts), so a settle that lands at
// any point in the loop is seen by the next resolution.
//
// The shim's `deferSettleToWire` models the host behavior (see `component-shim.ts`): it HOLDS the
// member-level settle past `resize`/`addComponentProperty` — past the executor's snapshot — and fires it
// on the wire loop's first ref write, detaching every original. This asserts ZERO property-reference misses
// against the executor's OWN misses collection (the `misses.push('ref …')` path the issue's acceptance
// names), and independently reads the references back through `anatomy-readback.ts` — a reader separate
// from the executor (docs/34). Mutation-by-name: revert the fresh `liveMember` read to a one-time snapshot
// and every member reports `ref …/… -> … (Could not create a new component property reference)`, failing
// the miss assertion by name (the message surfaces the failing coordinates, disabled/warning first). The
// FLOOR (`refsRepaired === refs > 0`) proves the deferred settle actually detached every reference —
// without it there is nothing to recover and a clean miss list is vacuous.
{
  const DEFS = ['field-label', 'text-field', 'select'];
  // A property-REFERENCE wiring miss — the two `misses.push('ref …')` sites (the wire-loop throw recovery
  // and the read-back DISCARDED), exactly the class #1516 names. Bound-variable ('bound …') and text
  // ('text …') misses are a different push path and out of scope here.
  const refMissesOf = (misses: string[]): string[] => misses.filter((m) => m.startsWith('ref '));
  // Surface the #1516 symptom coordinates (disabled / warning) first, so a reverted fix names them.
  const symptomFirst = (a: string, b: string): number =>
    Number(/state=disabled|status=warning/.test(b)) - Number(/state=disabled|status=warning/.test(a));
  for (const id of DEFS) {
    const def = componentDefs.find((d) => d.id === id);
    ok(!!def, `#1516 host-truth: the ${id} def is registered and projects`);
    if (!def) continue;
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    const page: Page = { children: [] };
    const shim = makeShim({ ...fullFor(plans), page, deferSettleToWire: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
    const res = await applyComponentPlan(plans, shim as any, {});
    // FLOOR: the deferred settle actually fired — every reference was detached at wire time and recovered
    // through the member-level recovery. refsRepaired === refs (> 0) proves the shim modelled a REAL
    // settle, so a clean miss list below is the fix defeating it rather than a shim that never settled.
    ok(res.refsRepaired > 0 && res.refsRepaired === res.refs,
      `#1516 floor: ${id}'s wire-phase settle detached and the fix recovered every reference (refsRepaired=${res.refsRepaired}/${res.refs})`);
    // THE FIX, against the executor's OWN misses collection (the issue's acceptance): ZERO property-
    // reference misses across the full projection. Message names the failing coordinate(s) — a reverted fix
    // fails BY NAME (docs/34), disabled/warning surfaced first.
    const refMisses = refMissesOf(res.misses).sort(symptomFirst);
    ok(res.wiredMembers === plans.length && refMisses.length === 0,
      `#1516: ${id} projects with ZERO set_componentPropertyReferences misses across all ${plans.length} members (wiredMembers=${res.wiredMembers}/${plans.length}; ${refMisses.length ? `${refMisses.length} miss(es): ${refMisses.slice(0, 3).join(' | ')}` : 'none'})`);
    // INDEPENDENT READ-BACK (docs/34): a reader separate from the executor confirms every declared reference
    // is retained on the SETTLED set — 0 propertyRef DISCARDED.
    const vars = await (shim as unknown as { variables: { getLocalVariablesAsync: () => Promise<{ id: string; name: string }[]> } }).variables.getLocalVariablesAsync();
    const texts = await (shim as unknown as { getLocalTextStylesAsync: () => Promise<{ id: string; name: string }[]> }).getLocalTextStylesAsync();
    const varById = new Map(vars.map((v) => [v.id, v.name] as const));
    const styleById = new Map(texts.map((s) => [s.id, s.name] as const));
    const ports: ReadPorts = { varName: (idv) => varById.get(idv) ?? null, styleName: (idv) => styleById.get(idv) ?? null };
    const members = (page.children[0]?.children ?? []) as unknown as HostNode[];
    const divergences = diffAnatomy(plans, members, planComponentName, ports, {});
    const refDiv = divergences.filter((d) => d.field === 'propertyRef' || d.field === 'visibleProp' || d.field === 'visible');
    ok(members.length === plans.length && refDiv.length === 0,
      `#1516 host-truth: reading the settled ${id} back, every declared reference is retained — 0 propertyRef DISCARDED (${refDiv.length ? refDiv.slice(0, 3).map((d) => `${d.member}: ${d.actual}`).join(' | ') : 'none'})`);
  }
}

// ── #1568: A TRANSIENT REFERENCE REFUSAL IS RETRIED AFTER A YIELD, NOT RECORDED AS A MISS — HOST-TRUTH ─
//
// Live, text-field reported 45 `set_componentPropertyReferences` misses — all "Could not create a new component
// property reference", all on 5 of its 20 members (QA 2026-09-21). #1568 read that as the #1516 detach reaching
// members that `liveMember` still could not recover, i.e. a permanent, IDENTITY-keyed refusal. The host says
// otherwise (measured 2026-09-22): those 20 members' node ids were perfectly sequential — `4769, 4783 … 5067`,
// gaps of 16–17 and not one out of order — so NOTHING was replaced, and the 5 refusals were CONTIGUOUS in wire
// order with the 6th member succeeding. Identity was never the variable. TIME was.
//
// That is a shape none of the three existing settle modes can express, and the distinction is not academic: all
// three are permanent and identity-keyed, so their fix is "re-find a DIFFERENT node" — which is exactly why the
// in-loop #1337/#1473 recovery is gated on `if (live && live !== node)` and can never see this. A refusal that
// clears on its own leaves `live === node`, the guard declines, and the reference is written off. The fix is a
// single cause-independent pass: queue every reference the wire loop could not place, `await yieldTo()` ONCE,
// and try each again on a freshly-resolved node. Cause-independent is the point — the executor does not need to
// know WHY the host refused, only that a host yield is the one thing it has not yet tried.
//
// `refuseRefsUntilYield` (component-shim.ts) models it: named members refuse the FIRST ref write with the host's
// own message and schedule their own release on a macrotask, so the refusal survives a same-task retry and not a
// yielded one. The oracle is authored HERE — zero `ref …` misses and every reference present on the independent
// read-back. The FLOOR is a PAIRED run (docs/34): the same projection with no refusal must report
// `refsRepaired === 0`, so the repair count in the refusing run is attributable to the injected refusal and not
// to some other recovery that would have run anyway. Mutation-by-name: delete the deferred pass in
// `write-components.ts` and this arm reports `ref text-field …/… -> … (Could not create a new component property
// reference)` by name, on the refused coordinates.
{
  const def = componentDefs.find((d) => d.id === 'text-field');
  ok(!!def, '#1568 host-truth: the text-field def is registered and projects');
  if (def) {
    const plans = figmaAnatomySet(def, { swapTarget: SWAP_TARGET });
    // The injected FAULT (not the oracle): a contiguous run of members in wire order, the host's own shape.
    const REFUSING = plans.slice(0, 5).map((p) => planComponentName(p));

    const run = async (refuse: string[]): Promise<{ page: Page; res: Awaited<ReturnType<typeof applyComponentPlan>> }> => {
      const page: Page = { children: [] };
      const shim = makeShim({ ...fullFor(plans), page, refuseRefsUntilYield: refuse });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- structural: the shim satisfies ComponentsApi
      return { page, res: await applyComponentPlan(plans, shim as any, {}) };
    };

    const clean = await run([]);
    const refused = await run(REFUSING);

    // FLOOR (1): with no refusal injected, nothing is repaired. Without this the assertions below could be
    // green on a projection that never needed the deferred pass at all.
    ok(clean.res.refsRepaired === 0 && clean.res.refs > 0,
      `#1568 floor: the un-refused control projection repairs NOTHING (refsRepaired=${clean.res.refsRepaired}/${clean.res.refs}) — the repair count below is attributable to the injected refusal`);
    // FLOOR (2): the injected refusal really fired, and on the 5 members the host refused — so a clean miss
    // list is the fix defeating a REAL refusal rather than a shim that never refused.
    ok(refused.res.refsRepaired > 0,
      `#1568 floor: the transient refusal fired and the deferred pass recovered it (refsRepaired=${refused.res.refsRepaired}/${refused.res.refs} across ${REFUSING.length} refusing members: ${REFUSING.join(', ')})`);

    // THE FIX, against the executor's OWN misses collection (the issue's acceptance — the live 45): ZERO
    // property-reference misses. Message names the refused coordinates, so a reverted fix fails BY NAME.
    const refMisses = refused.res.misses.filter((m) => m.startsWith('ref '));
    ok(refused.res.wiredMembers === plans.length && refMisses.length === 0,
      `#1568: a transient reference refusal leaves ZERO set_componentPropertyReferences misses across all ${plans.length} text-field members (wiredMembers=${refused.res.wiredMembers}/${plans.length}; ${refMisses.length ? `${refMisses.length} miss(es): ${refMisses.slice(0, 3).join(' | ')}` : 'none'})`);

    // INDEPENDENT READ-BACK (docs/34): a reader separate from the executor confirms the references are really
    // ON the nodes — not merely that the executor stopped complaining.
    const shimOf = refused.page;
    const members = (shimOf.children[0]?.children ?? []) as unknown as HostNode[];
    ok(members.length === plans.length, `#1568 scope floor: every text-field member was built (${members.length}/${plans.length})`);
    const ports: ReadPorts = { varName: () => null, styleName: () => null };
    const refDiv = diffAnatomy(plans, members, planComponentName, ports, {}).filter((d) => d.field === 'propertyRef');
    ok(refDiv.length === 0,
      `#1568 host-truth: reading the refused projection back, every declared reference is present on its node — 0 propertyRef DISCARDED (${refDiv.length ? refDiv.slice(0, 3).map((d) => `${d.member}: ${d.actual}`).join(' | ') : 'none'})`);
  }
}

console.log(failed ? `\n❌ ${failed} FAILED` : '\n✅ component round-trip: ALL PASS');
process.exit(failed ? 1 : 0);
