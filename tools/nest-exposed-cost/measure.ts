/**
 * MEASUREMENT — what a `nest-exposed` nested part costs the parent that exposes it.
 *
 *   npx tsx tools/nest-exposed-cost/measure.ts            # both anatomy-bearing defs
 *   npx tsx tools/nest-exposed-cost/measure.ts icon-button
 *   npx tsx tools/nest-exposed-cost/measure.ts --json
 *
 * WHAT THIS ANSWERS. #681 shipped `swap` and `nest-fixed`; `nest-exposed` is deferred pending "the
 * property-count measurement" (#750's own deferred item, recorded in `nestMissAdvice`'s COMPONENT_SET
 * sentence: *"an exposed nest needs a nested property this write does not create yet"*). The question
 * blocking it is not whether exposure is expressible — the field already has the variant — but what a
 * parent ACCUMULATES when it exposes one, measured against Figma's own ceilings and against the
 * payload costs #750 instrumented (shell 14,070 → 15,741 B; IconButton 5 → 6 chunks).
 *
 * THE DECIDING NUMBER, stated up front so the reader can check whether this measured it: whether
 * exposure is PER-PROPERTY OPT-IN or ALL-OR-NOTHING. Those two differ only in cost — both are
 * expressible — so the cost is the whole input to the decision.
 *
 * ── WHAT THIS IS NOT ────────────────────────────────────────────────────────────────────────────
 *
 * NOT A GATE, AND IT ALWAYS EXITS 0. It reports what exposure would cost; nothing here asserts that a
 * cost is wrong, because no one has decided what the ceiling ought to be. Adding it to `ci.yml` would
 * be reporting a decision nobody has made — the `tools/` rule from CLAUDE.md ("a tool here answers a
 * question; a gate asserts an answer").
 *
 * AND IT DOES NOT SETTLE THE SCHEMA. The per-property-vs-all-or-nothing question is a schema question
 * as much as a projector one, and #739's discipline is the one being followed: measure in one PR,
 * decide in another. So `NestingRelation` is UNCHANGED by this PR. Every count below is produced by
 * projecting the REAL defs and counting what the existing projector would have to declare — no
 * `nest-exposed` is authored into a def, and no emitter is taught to project one.
 *
 * ── HOW EXPOSURE IS COUNTED WITHOUT IMPLEMENTING IT ─────────────────────────────────────────────
 *
 * This is the part worth checking, because a measurement that models its own subject measures itself
 * (docs/34). Three facts do the work, and all three are read from code that already ships:
 *
 *  1. WHAT A NESTED SET WOULD CONTRIBUTE. Figma's exposed nested instance surfaces the nested set's
 *     OWN properties on the parent. So the contribution is the nested component's property count —
 *     `planSetProperties` over the nested def's plans, plus one per varying variant axis (a set's
 *     axes ARE properties in the panel; `planComponentName`'s header states this: "a coordinate in
 *     the name IS a property in the designer's panel").
 *  2. WHAT THE PARENT ALREADY CARRIES. `planSetProperties(figmaAnatomySet(def))` — the real count,
 *     derived from built nodes, which is the same call the payload makes.
 *  3. WHAT FIGMA ALLOWS. The published ceilings, quoted with their source, since the whole point is
 *     to compare an accumulated count against a limit rather than against a feeling.
 *
 * The nested component in both real cases is `focus-ring`, which has NO def in this repo — it is a
 * component nominated by name that must already exist in the file (`PartDef.nests`). So its property
 * count cannot be projected, and this measures the two live shapes it is KNOWN to take instead
 * (a plain COMPONENT, and the 2-member `color` set the #750 tests model), plus a swept range so the
 * answer does not depend on which one a given file holds. That the nested side is unprojectable is
 * itself one of the findings.
 *
 * ── WHAT IT FOUND, so a reader can check the numbers rather than re-derive them ──────────────────
 *
 * 1. THE PROPERTY COUNT IS NOT THE CONSTRAINT, which is the opposite of what "the property-count
 *    measurement" was named for. Button's panel goes 9 rows → at most 12, IconButton's 5 → 8, across
 *    every nested shape including the owner's field-label case — and Figma publishes no cap on
 *    properties per set at all. Whatever decides per-property-vs-all-or-nothing, it is not a ceiling
 *    being approached: all-or-nothing's worst case is three extra rows.
 *
 * 2. THE BYTE CEILING IS THE CONSTRAINT, and it is nearly touching. Button's fullest chunk is 41,996 B
 *    against the 42,000 B budget — FOUR BYTES of headroom, today, before any exposure exists. Every
 *    exposure shape still packs into 36 chunks (+2,052 to +3,780 B total, ~3–6 B per variant), so
 *    nothing here overflows; the finding is how little room the decision has to spend, and that the
 *    two candidate schemas differ by only ~1,700 B on the largest real set. Cost is not what
 *    distinguishes them, which is worth knowing BEFORE the schema PR argues about cost.
 *
 * 3. WORST-CHUNK BYTES ARE NOT MONOTONIC, and this file's first run got it wrong before it got it
 *    right. See the comment above the payload table: adding bytes per variant made Button's worst
 *    chunk SMALLER. The delta to trust is the total.
 */
import { ComponentDef } from '../../packages/engine/component-schema';
import { button } from '../../packages/engine/components/button';
import { iconButton } from '../../packages/engine/components/icon-button';
import {
  figmaAnatomySet,
  planSetProperties,
  planSetChunks,
  planComponentName,
  SET_CHUNK_BYTES,
  type AnatomyPlan,
} from '../../packages/engine/anatomy-figma';

const DEFS: Record<string, ComponentDef> = { button, 'icon-button': iconButton };

/**
 * Figma's own ceilings, quoted rather than paraphrased so a stale number is visible as a stale quote.
 *
 * The honest state of this: Figma publishes NO hard numeric cap on component properties per component
 * set. What it publishes is the VARIANT cap, and the practical limits are the panel and the file. So
 * two of the three rows below are hard and one is soft, and the soft one is labeled as such rather
 * than dressed up as a limit — a measurement that invents a ceiling to compare against has invented
 * its own conclusion.
 */
const FIGMA_LIMITS = {
  variantsPerSet: {
    value: 4_000,
    hard: true,
    source: 'Figma help: "A component set can contain up to 4,000 variants." Reached by the full Button (756) at under a fifth.',
  },
  propertiesPerSet: {
    value: null as number | null,
    hard: false,
    source: 'No published cap. Figma documents no maximum number of component properties on a set; the binding constraint is the properties PANEL (a designer scrolling a list) and the payload byte ceiling below, both of which this measures.',
  },
  executeBytes: {
    value: 45_000,
    hard: true,
    source: '`figma_execute`\'s ~45KB payload ceiling (#487 §6), which `SET_CHUNK_BYTES` packs to 42,000 against — the one ceiling here that has bitten a real run.',
  },
} as const;

/** A parent's CURRENT property surface: the declared component properties plus the varying axes,
 *  because a designer's panel shows both and the question is what the panel accumulates. */
const parentSurface = (plans: AnatomyPlan[]) => {
  const props = planSetProperties(plans);
  // The axes that actually VARY across the set. A single-valued axis is a constant coordinate in every
  // member's name and gets no property (`planSetLayout`: "not a row of one, it is not a row"), so
  // counting declared axes instead would overstate every set — IconButton's two constant slot axes are
  // exactly this case.
  const axisValues = new Map<string, Set<string>>();
  for (const p of plans)
    for (const kv of planComponentName(p).split(', ')) {
      const [k, v] = kv.split('=');
      if (!axisValues.has(k)) axisValues.set(k, new Set());
      axisValues.get(k)!.add(v);
    }
  const varying = [...axisValues.entries()].filter(([, vs]) => vs.size > 1).map(([k]) => k);
  const constant = [...axisValues.entries()].filter(([, vs]) => vs.size === 1).map(([k]) => k);
  return { props, varying, constant, panelRows: props.length + varying.length };
};

/**
 * The nested side. `focus-ring` has no def — it is nominated by name and must pre-exist in the file —
 * so its contribution is measured as the two shapes the repo's own tests model, plus a sweep.
 *
 * A set contributes ONE property per varying axis (the axes are the properties), which is why a
 * 2-member single-axis ring contributes 1 and not 2: `color=default|inverse` is one `color` property
 * with two values. Getting that wrong in the pessimistic direction would make exposure look twice as
 * expensive as it is, which is the kind of error that decides a schema question by accident.
 */
const NESTED_SHAPES = [
  { label: 'plain COMPONENT (the starved run\'s shape)', axes: 0, props: 0, note: 'What the existing live run holds: `focus-ring` as a single component. Nothing to expose — an exposed nest of a non-set contributes no properties at all, which is the case that makes exposure look free.' },
  { label: '2-member set, 1 axis (`color=default|inverse`)', axes: 1, props: 0, note: 'The shape #750\'s tests model and the one `nest-fixed` names a coordinate into. One axis → one property.' },
  { label: '2-axis set (`color` × `state`)', axes: 2, props: 0, note: 'A plausible ring once error rings exist — `test.ts` already stubs `state=default|error`.' },
  { label: 'field-label-shaped: 2 axes + 1 TEXT', axes: 2, props: 1, note: 'The owner\'s named case — "Form label would likely be exposed if there are 2 size variants". A label set with `size` × `required` plus its own text property. `field-label` has no anatomy yet, so this is the SHAPE, not a projection of it.' },
] as const;

const fmt = (n: number) => n.toLocaleString('en-US');

/**
 * THE PAYLOAD COST, which is the half the property count does not show.
 *
 * `PROPS`/`REFS` ride only in the FINAL chunk, so a parent-level property declaration is paid once.
 * An exposed nested instance is not that shape: Figma's exposed-nested-instance property is declared
 * on the parent, but the nested INSTANCE in every member has to be reachable for it, so whatever field
 * carries the exposure sits on a NODE — and nodes are serialized into `PLANS`, which every chunk pays
 * per variant. `nestVariant`'s own doc comment says an exposed nest carries no variant, so the exposed
 * case needs a DIFFERENT node field; this measures what one costs.
 *
 * Measured by mutating the real plans and re-running the REAL `planSetChunks`, not by estimating: the
 * packer is a fixpoint over a shell whose own width changes with the chunk count, so an estimate of
 * "N bytes per variant" cannot predict where a chunk boundary lands.
 *
 * The candidate field shapes, cheapest first — the range is the point, because the schema question
 * (per-property opt-in vs all-or-nothing) is exactly a choice between these:
 */
const EXPOSURE_FIELD_SHAPES = [
  { label: 'a bare flag (`nestExposed:true`)', patch: { nestExposed: true }, models: 'ALL-OR-NOTHING — the node says "expose this instance" and Figma surfaces whatever the nested set has. No per-property list to serialize.' },
  { label: 'one named property (`nestExpose:["color"]`)', patch: { nestExpose: ['color'] }, models: 'PER-PROPERTY OPT-IN, one property selected.' },
  { label: 'two named properties', patch: { nestExpose: ['color', 'state'] }, models: 'PER-PROPERTY OPT-IN, two selected — the field-label case (`size` × `required`).' },
  { label: 'renamed per-property (`{color:"ringColor"}`)', patch: { nestExpose: { color: 'ringColor' } }, models: 'PER-PROPERTY OPT-IN with renaming, which is what a parent needs if two nested instances expose the same axis name and would otherwise collide in one panel.' },
] as const;

/** Apply a patch to every NESTED_INSTANCE node in a plan tree, returning a deep copy. */
const patchNested = (plans: AnatomyPlan[], patch: Record<string, unknown>): AnatomyPlan[] => {
  const walk = (n: Record<string, unknown>): Record<string, unknown> => {
    const copy: Record<string, unknown> = { ...n };
    // `nestTarget` is what makes a node a NESTED_INSTANCE — the same discriminator the payload's build
    // switch uses. Keyed off the plan's own field rather than a type string so this cannot drift from
    // what the projector considers nested.
    if (copy.nestTarget) Object.assign(copy, patch);
    copy.children = ((n.children as Record<string, unknown>[]) ?? []).map(walk);
    return copy;
  };
  return plans.map((p) => ({ ...p, root: walk(p.root as unknown as Record<string, unknown>) as never }));
};

const report: Record<string, unknown> = {};
const args = process.argv.slice(2);
const json = args.includes('--json');
const only = args.filter((a) => !a.startsWith('--'));
const targets = only.length ? only : Object.keys(DEFS);

const out: string[] = [];
const say = (s = '') => out.push(s);

say('NEST-EXPOSED COST MEASUREMENT (#681, blocking the third nesting kind)');
say('='.repeat(100));
say();
say('Measured on the real defs, at HEAD, with NestingRelation unchanged. No def declares nest-exposed');
say('and no emitter projects one — the counts below are what the existing projector would have to');
say('declare if one did. Always exits 0 (a measurement, not a gate).');
say();

for (const id of targets) {
  const def = DEFS[id];
  if (!def) { say(`(skipped '${id}' — no def by that name; have ${Object.keys(DEFS).join(', ')})`); continue; }

  const plans = figmaAnatomySet(def, { swapTarget: 'FPO-default-icon' });
  const cur = parentSurface(plans);
  const chunks = planSetChunks(plans);
  const worst = Math.max(...chunks.map((c) => c.bytes));

  say('-'.repeat(100));
  say(`${def.name}  (${def.id})`);
  say('-'.repeat(100));
  say(`  variants in the set          ${fmt(plans.length)}`);
  say(`  component properties         ${cur.props.length}   ${cur.props.map((p) => `${p.name}:${p.type}`).join(', ') || '(none)'}`);
  say(`  varying axes (= properties)  ${cur.varying.length}   ${cur.varying.join(', ')}`);
  say(`  constant axes (no property)  ${cur.constant.length}   ${cur.constant.join(', ') || '(none)'}`);
  say(`  PANEL ROWS TODAY             ${cur.panelRows}`);
  say(`  chunks / worst chunk         ${chunks.length} / ${fmt(worst)} B against a ${fmt(SET_CHUNK_BYTES)} B budget (${fmt(SET_CHUNK_BYTES - worst)} B spare)`);

  // How many parts of this def would be candidates for exposure — i.e. point at another component.
  const nestingParts = Object.entries(def.anatomy?.parts ?? {}).filter(([, p]) => p.nesting);
  const exposable = nestingParts.filter(([, p]) => p.nesting!.kind !== 'swap');
  say();
  say(`  parts pointing at a component: ${nestingParts.length}  (${nestingParts.map(([n, p]) => `${n}:${p.nesting!.kind}`).join(', ')})`);
  say(`  of those, EXPOSURE CANDIDATES: ${exposable.length}  (a 'swap' is not one — the consumer picks a different component, not a coordinate of this one)`);
  say();

  const rows: Record<string, unknown>[] = [];
  say('  IF THE CANDIDATE WERE nest-exposed, per nested shape:');
  say();
  say('    nested shape                                   contributes   all-or-nothing   per-property opt-in');
  for (const shape of NESTED_SHAPES) {
    const contributes = shape.axes + shape.props;
    const allOrNothing = cur.panelRows + contributes * exposable.length;
    // Per-property opt-in's cost is not a single number — it is a RANGE whose floor is the parent
    // exposing nothing (which is what makes it opt-in) and whose ceiling equals all-or-nothing. The
    // interesting figure is the floor+1: the cheapest USEFUL exposure, one property.
    const optInMin = cur.panelRows;
    const optInOne = cur.panelRows + Math.min(1, contributes) * exposable.length;
    say(`    ${shape.label.padEnd(46)} ${String(contributes).padStart(5)}       ${String(allOrNothing).padStart(9)}        ${optInMin}–${allOrNothing} (one: ${optInOne})`);
    rows.push({ shape: shape.label, contributes, allOrNothing, optInMin, optInOne, note: shape.note });
  }
  say();

  // ---- the payload half: what an exposure field costs EVERY chunk, per variant ------------------
  const nestedNodes = plans.reduce((acc, p) => {
    const count = (n: Record<string, unknown>): number =>
      (n.nestTarget ? 1 : 0) + ((n.children as Record<string, unknown>[]) ?? []).reduce((a, c) => a + count(c), 0);
    return acc + count(p.root as unknown as Record<string, unknown>);
  }, 0);

  say(`  PAYLOAD COST — ${nestedNodes} nested-instance node(s) across ${plans.length} variants, re-run through the real packer:`);
  say();
  // TOTAL bytes, not worst-chunk, is the monotonic measure — and that correction came out of the first
  // run of this file. Adding bytes per variant made Button's WORST CHUNK **smaller** (41,996 → 41,939):
  // the packer is greedy, so a fatter variant moves a boundary one variant earlier and the fullest chunk
  // ends up less full. Worst-chunk is therefore not a cost signal at all in the direction that matters —
  // it can improve while the payload grows. It is still reported, because it is the number the BUDGET is
  // enforced against, but the delta that answers "what does exposure cost" is the total and the chunk
  // count. Reporting only worst-chunk would have shown exposure as free-or-better on the 648-variant set.
  say('    exposure field shape                              total bytes     Δ total   worst   chunks   verdict');
  const payloadRows: Record<string, unknown>[] = [];
  const totalNow = chunks.reduce((a, c) => a + c.bytes, 0);
  for (const shape of EXPOSURE_FIELD_SHAPES) {
    const patched = planSetChunks(patchNested(plans, shape.patch as Record<string, unknown>));
    const pWorst = Math.max(...patched.map((c) => c.bytes));
    const pTotal = patched.reduce((a, c) => a + c.bytes, 0);
    const over = pWorst > SET_CHUNK_BYTES;
    const verdict = patched.length !== chunks.length
      ? `+${patched.length - chunks.length} CHUNK(S)`
      : over ? 'OVER BUDGET' : 'fits';
    say(`    ${shape.label.padEnd(49)} ${fmt(pTotal).padStart(11)}   ${('+' + fmt(pTotal - totalNow)).padStart(9)}  ${fmt(pWorst).padStart(6)}    ${String(patched.length).padStart(4)}   ${verdict}`);
    payloadRows.push({ shape: shape.label, totalBytes: pTotal, deltaTotal: pTotal - totalNow, worstChunkBytes: pWorst, chunks: patched.length, chunkDelta: patched.length - chunks.length, overBudget: over, models: shape.models });
  }
  say();
  say(`    (today: ${fmt(totalNow)} B total across ${chunks.length} chunks, worst ${fmt(worst)} — ${fmt(SET_CHUNK_BYTES - worst)} B under budget)`);
  say();

  report[def.id] = {
    variants: plans.length,
    nestedInstanceNodes: nestedNodes,
    payloadCost: payloadRows,
    properties: cur.props.length,
    varyingAxes: cur.varying,
    constantAxes: cur.constant,
    panelRowsToday: cur.panelRows,
    chunks: chunks.length,
    worstChunkBytes: worst,
    chunkBudget: SET_CHUNK_BYTES,
    exposureCandidates: exposable.map(([n]) => n),
    perNestedShape: rows,
  };
}

say('='.repeat(100));
say('FIGMA\'S CEILINGS, and which of them this can actually run into');
say('='.repeat(100));
for (const [k, v] of Object.entries(FIGMA_LIMITS)) {
  say(`  ${k.padEnd(20)} ${v.value === null ? 'NO PUBLISHED CAP' : fmt(v.value)}${v.hard ? '  [hard]' : '  [soft]'}`);
  say(`  ${' '.repeat(20)} ${v.source}`);
}
say();

console.log(out.join('\n'));
if (json) console.log('\n' + JSON.stringify({ defs: report, limits: FIGMA_LIMITS }, null, 2));

process.exit(0);
