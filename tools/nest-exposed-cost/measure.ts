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
 * 2. NEITHER IS THE BYTE CEILING, and the first version of this file got that wrong in the other
 *    direction. It reported Button's fullest chunk at 41,996 B against the 42,000 B budget as "FOUR
 *    BYTES of headroom", and a reviewer on #761 correctly refused it. **Worst-chunk fullness is
 *    near-budget BY CONSTRUCTION**: `pack` adds variants until the next one would not fit, so the
 *    fullest chunk is always within one variant of the budget no matter how much or how little room
 *    there is. It measures how evenly the last bin filled, not scarcity. And chunk overflow is not a
 *    failure mode — the budget bounds ONE `figma_execute` call, calls are unbounded, and growth is
 *    absorbed by ADDING CHUNKS, which is what this file's own table already showed (36 chunks across
 *    every exposure shape).
 *
 * 3. THE REAL CLIFF IS THE INDIVISIBLE UNIT — shell + the single largest variant — because no amount of
 *    re-packing can split one variant across two calls. That is the number with actual headroom in it,
 *    and it went unmeasured until #761's review:
 *
 *      button       shell 18,954 + largest variant 1,668 = 20,622 B  →  21,378 B spare (49.1% of budget)
 *      icon-button  shell 15,756 +   largest variant 965 = 16,721 B  →  25,279 B spare (39.8% of budget)
 *
 *    Button's largest variant would have to grow **13.8x** to become unpackable; IconButton's 27.2x.
 *    Exposure moves the unit by 19–35 B. So the honest reading inverts the first one: the byte budget is
 *    not close, and cost does not distinguish the two candidate schemas — they differ by ~1,700 B in
 *    total and by 35 B in the one place a cliff could exist.
 *
 * 4. WHAT DOES SCALE, if anything here is to be watched: the SHELL, because every chunk pays it in
 *    full. It is already 45.1% of the budget for Button before a single variant, so shell growth is
 *    multiplied by the chunk count — +4,000 B of shell takes Button 36 → 44 chunks, +16,000 B → 127.
 *    Exposure adds nothing to the shell (a per-node field rides in `PLANS`), which is exactly why it is
 *    cheap. A future field in the payload HEADER is the expensive shape, and the contrast row in the
 *    output exists so the next person sizing a payload field sees which half they are adding to.
 *
 * 5. WORST-CHUNK BYTES ARE NOT MONOTONIC EITHER, which is how finding 2 should have been reached the
 *    first time. See the comment above the payload table: adding bytes per variant made Button's worst
 *    chunk SMALLER. The same property that disqualifies worst-chunk as a DELTA disqualifies it as a
 *    CEILING — a number that improves while the payload grows is not measuring room. One argument, both
 *    uses; the first pass applied it to one and then quoted the other as the headline. **An instrument
 *    found non-monotonic is disqualified for every reading taken from it, not just the one that
 *    prompted the check.** The deltas to trust are the total and the chunk count; the ceiling to trust
 *    is the indivisible unit.
 */
import { ComponentDef } from '../../packages/engine/component-schema';
import { button } from '../../packages/engine/components/button';
import { iconButton } from '../../packages/engine/components/icon-button';
import {
  figmaAnatomySet,
  planSetProperties,
  planSetChunks,
  planSetLayout,
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
    source: 'No published cap. Figma documents no maximum number of component properties on a set, so the only constraint on a growing panel is the designer scrolling it — a judgment, not a limit. Notably NOT bounded by the byte ceiling below either: properties ride in PROPS_ALL, which only the FINAL chunk carries. The property count and the payload budget are independent axes; #761 implied they were linked.',
  },
  executeBytes: {
    value: 45_000,
    hard: true,
    source: '`figma_execute`\'s ~45KB payload ceiling (#487 §6), which `SET_CHUNK_BYTES` packs to 42,000 against. Hard, and the one ceiling here that has bitten a real run — but it bounds ONE CALL, not the set: exceeding it produces another chunk. It is a wall only for a single variant that cannot be split (the indivisible unit), which sits at 49% of budget on the largest real set.',
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

/**
 * THE INDIVISIBLE UNIT: shell + the single largest variant — the only byte figure here that is a real
 * ceiling, and the one the first version of this file failed to measure.
 *
 * A chunk's payload is `shell + Σ(variant costs)`, where the shell is what EVERY chunk pays before any
 * variant. `pack` fills a chunk until the next variant would exceed the budget, so worst-chunk fullness
 * is within one variant of the budget BY CONSTRUCTION — it reports how evenly the last bin filled, not
 * how much room exists. Overflow of a chunk is not a failure mode at all: the packer answers it by
 * emitting another chunk, and `figma_execute` calls are unbounded.
 *
 * What re-packing CANNOT fix is one variant that does not fit alone. `pack`'s own comment says what
 * happens then — *"ALWAYS at least one variant per chunk, even one that does not fit … a one-variant
 * over-budget chunk is reported by its own `bytes` and fails visibly at the transport"* — and that is the
 * cliff: the packer's designed response is to ship something that breaks. Hence shell + max(variant).
 *
 * BOTH TERMS ARE RECOVERED FROM THE REAL PACKER'S OUTPUT, not modeled, and that is the docs/34 half. The
 * variant costs use the same `JSON.stringify(spec).length + 1` the packer charges (the `+1` is the comma
 * this variant adds to the `PLANS` array literal), and the shell is the fullest chunk's MEASURED bytes
 * minus the variants it actually holds. Deriving the shell from the payload template instead would be the
 * classic failure here: the shell is a fixpoint over the chunk count (`CHUNK`/`TOTAL`/`FIRST` are
 * interpolated, so a payload's own index widens it), so a modeled shell is the wrong width — and wrong in
 * the direction that flatters the answer.
 */
const indivisibleUnit = (plans: AnatomyPlan[], chunks: ReturnType<typeof planSetChunks>) => {
  const { cells } = planSetLayout(plans, 'nest-exposed-cost');
  const specs = cells.map((c) => ({ name: c.name, root: c.root }));
  const costs = new Map(specs.map((s) => [s.name, JSON.stringify(s).length + 1]));
  const worst = Math.max(...chunks.map((c) => c.bytes));
  const fullest = chunks.find((c) => c.bytes === worst)!;
  const shell = worst - fullest.variants.reduce((a, n) => a + (costs.get(n) ?? 0), 0);
  const largest = Math.max(...costs.values());
  return { shell, largest, unit: shell + largest, spare: SET_CHUNK_BYTES - (shell + largest), worst };
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
  const unit = indivisibleUnit(plans, chunks);
  say(`  chunks                       ${chunks.length}  (one figma_execute call each; the count is unbounded, so growth is ABSORBED here)`);
  say(`  worst chunk                  ${fmt(unit.worst)} B of ${fmt(SET_CHUNK_BYTES)} — NOT headroom: pack() fills until the next`);
  say(`                               variant would not fit, so this is within one variant of the budget by construction`);
  say(`  shell (paid by EVERY chunk)  ${fmt(unit.shell)} B = ${((unit.shell / SET_CHUNK_BYTES) * 100).toFixed(1)}% of the budget before a single variant`);
  say(`  largest single variant       ${fmt(unit.largest)} B`);
  say(`  INDIVISIBLE UNIT             ${fmt(unit.unit)} B → ${fmt(unit.spare)} B REAL headroom (${((unit.unit / SET_CHUNK_BYTES) * 100).toFixed(1)}% of budget used)`);
  say(`                               ← the only true cliff: one variant cannot be split across two calls.`);
  say(`                               The largest variant would have to grow ${((SET_CHUNK_BYTES - unit.shell) / unit.largest).toFixed(1)}x to become unpackable.`);

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
  say('    exposure field shape                              total bytes     Δ total   chunks   indivisible   Δ unit   verdict');
  const payloadRows: Record<string, unknown>[] = [];
  const totalNow = chunks.reduce((a, c) => a + c.bytes, 0);
  for (const shape of EXPOSURE_FIELD_SHAPES) {
    const pPlans = patchNested(plans, shape.patch as Record<string, unknown>);
    const patched = planSetChunks(pPlans);
    const pTotal = patched.reduce((a, c) => a + c.bytes, 0);
    const pUnit = indivisibleUnit(pPlans, patched);
    // The verdict names the only two things that can actually go wrong, and neither is "the worst chunk
    // got full". A chunk-count change is a real if cheap cost (more round trips). An indivisible unit over
    // budget is the failure the packer cannot answer: it ships a one-variant over-budget chunk that dies
    // at the transport. Verified reachable by mutation — a 30KB field on icon-button reports
    // UNPACKABLE VARIANT at 46,740 B, so this branch is not decoration.
    const verdict = pUnit.unit > SET_CHUNK_BYTES
      ? 'UNPACKABLE VARIANT'
      : patched.length !== chunks.length
        ? `+${patched.length - chunks.length} CHUNK(S)`
        : 'fits';
    say(`    ${shape.label.padEnd(49)} ${fmt(pTotal).padStart(11)}   ${('+' + fmt(pTotal - totalNow)).padStart(9)}    ${String(patched.length).padStart(4)}   ${fmt(pUnit.unit).padStart(11)}   ${('+' + fmt(pUnit.unit - unit.unit)).padStart(6)}   ${verdict}`);
    payloadRows.push({ shape: shape.label, totalBytes: pTotal, deltaTotal: pTotal - totalNow, chunks: patched.length, chunkDelta: patched.length - chunks.length, indivisibleUnit: pUnit.unit, deltaUnit: pUnit.unit - unit.unit, unitSpare: pUnit.spare, worstChunkBytes: pUnit.worst, unpackable: pUnit.unit > SET_CHUNK_BYTES, models: shape.models });
  }
  say();
  say(`    (today: ${fmt(totalNow)} B total across ${chunks.length} chunks; indivisible unit ${fmt(unit.unit)} B with ${fmt(unit.spare)} B spare)`);
  say();
  // SHELL SENSITIVITY, the one figure that is genuinely leveraged, since every chunk pays it in full.
  // Simulated by SHRINKING the budget — arithmetically the same as shell growth, and it re-runs the real
  // packer rather than building a second model of it. Here for contrast: exposure adds nothing to the
  // shell, so this documents which future field shape WOULD be expensive.
  say('    for contrast — what SHELL growth costs, since every chunk pays it in full:');
  const sens = [0, 1_000, 4_000, 16_000].map((g) => {
    const b = SET_CHUNK_BYTES - g;
    return b <= unit.unit ? `+${fmt(g)}→unpackable` : `+${fmt(g)}→${planSetChunks(plans, b).length} chunks`;
  });
  say(`      ${sens.join('   ')}`);
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
    worstChunkIsAnArtifact: 'pack() fills until the next variant would not fit, so this is within one variant of the budget regardless of how much room exists. Not headroom.',
    shellBytes: unit.shell,
    largestVariantBytes: unit.largest,
    indivisibleUnitBytes: unit.unit,
    indivisibleUnitSpare: unit.spare,
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
