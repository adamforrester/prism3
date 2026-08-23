/**
 * Gate: PAINT PLACEMENT — which NODE carries the colour (#933).
 *
 *   npx tsx packages/engine/lint-paint-placement.ts
 *
 * `lint-paint.ts` asks whether a colour binding is painted *at all*: its arm 3 walks every node of every
 * coordinate and collects the variables assigned into one flat set, so a binding that reaches the tree
 * anywhere counts as reached. That is the right question for the defect it was written for (#784, half the
 * corpus authored and painting nothing) and it **discards the node**. So nothing in the repo held an
 * answer to *"did the paint land on the part the def nominated"*, and #933 is what lives in that gap: the
 * projector's box branch read `role === 'target'`, which means "what does the user click", and used it to
 * decide "what carries colour".
 *
 * The two questions have the same answer in every def written so far — every anatomy in the corpus is one
 * box and one target, and they are the same part — which is why nothing exercised it. A switch is where
 * they come apart: its whole ROW is clickable, so the row is the target, while the fill belongs to the
 * TRACK. Probed on the real def, **both configurations validated with zero errors**, and the one a
 * hit-area author reaches for painted the track's `on` fill across the entire label row. #802's class
 * exactly: structurally valid output that does not do its job. Every variable resolves, nothing throws,
 * and no gate that asks "does it resolve" can see it.
 *
 * ── INDEPENDENCE (`docs/34`) ──────────────────────────────────────────────────────────────────────────
 *
 * EXPECTED is derived from the **def**: this file's own `allowed()` restates, per part kind, which paint
 * properties that kind may carry — and for a `box`, reads the part's `paintSlots` and maps the words to
 * `fills`/`strokes` itself. ACTUAL is read out of the **projected plans**: walk every node at every
 * coordinate and record which ones came back with `paints.fills` / `paints.strokes`.
 *
 * The restatement in `allowed()` IS THE GATE. Importing the projector's dispatch, or asking `paintOf`
 * which slot it resolved, would put the same expression on both sides and report the broken case as a
 * pass — `docs/34` shape 1. Do not DRY it away.
 *
 * ── WHY THIS GATE CARRIES ITS OWN FIXTURE ─────────────────────────────────────────────────────────────
 *
 * Because the corpus **cannot express the defect**. All five defs with an anatomy have exactly one box,
 * and it is also the target, so restoring `&& p.role === 'target'` to the projector leaves arms A, B and E
 * legitimately green over every real component — measured, not assumed. So a corpus-only run would be
 * `docs/34` shape 15: the comparison is right and the SET it walks excludes the only case that can fail
 * it, and its green would mean *the corpus has not reached that shape yet* rather than *the projector is
 * correct*. Shape 15's own fix — relate the excluded members explicitly — has no purchase here, because
 * the excluded member is not a member: no def in the repo has two boxes. The variant of the fix is to
 * BUILD one, which is what arm D is, and it is the only part of this gate that can see #933.
 *
 * So arm D projects a def whose target and painted box are DIFFERENT parts: Button's real anatomy wrapped
 * in a hit-area row. It is derived from `button` rather than hand-written so the paint grammar underneath
 * is the real one — a synthetic def with two tokens would resolve nothing and every arm would pass over an
 * empty tree.
 *
 * D's load-bearing assertion is a metamorphic one: **moving `role: 'target'` between the two boxes must
 * not change the placement map at all.** That states the quantity a human would check, in the units they
 * would check it in (`docs/34` shape 16), and it needs no EXPECTED from the def — one projector, two
 * inputs differing in one field, and an invariance the schema promises.
 *
 * ── WHAT THIS GATE DELIBERATELY DOES NOT CHECK ────────────────────────────────────────────────────────
 *
 * WHICH VARIABLE. That is `lint-paint.ts`'s arm 1 (a paint key led by an axis value must point at a token
 * ref carrying that value) and its arm 3 (every declared key is reached). Asking it here would mean
 * re-deriving `paintOf`'s template walk, and a second bad copy of a resolver is worse coverage than none:
 * it would agree with the original wherever the original is wrong. Per-SLOT reachability — "did the
 * `overlay` family land, as distinct from the `fill` family" — is arm 3's, for the same reason. This file
 * owns the node, that one owns the value, and the seam is stated so neither drifts into the other.
 *
 * AND THERE IS NO CHARACTERIZATION BASELINE, which is a decision rather than an omission. A uniform loss
 * — the box branch deleted outright — is caught by arm B, because every declared slot then lands nowhere;
 * so the census file `lint-paint.ts` needs for its uniform-loss arm buys nothing here, and an authored
 * baseline nobody needs is a file that reads as coverage.
 */
import { componentDefs } from './components/index.ts';
import { figmaAnatomyPlan, type FigmaNodePlan } from './anatomy-figma.ts';
import { validateComponentDef, variantsOf, type ComponentDef, type PartDef } from './component-schema.ts';

type Prop = 'fills' | 'strokes';
const PROPS: Prop[] = ['fills', 'strokes'];

const fails: string[] = [];
const notes: string[] = [];

/**
 * EXPECTED, authored here and nowhere else — which paint properties a part of each kind may carry.
 *
 * `box`  — exactly what it declares. `border` is the one EDGE slot and reaches `strokes`; every other
 *          word in `BOX_PAINT_SLOTS` is a ground competing for the single `fills` array. A box declaring
 *          nothing paints nothing, and two defs' boxes are deliberately in that position.
 * `text` — ink, so `fills` and never `strokes`. WHICH ink is `paintSlot`'s question (#796) and this gate
 *          takes no view on it; a stroke on a text node is the spurious-outline defect `PRIMARY_PAINT_SLOTS`
 *          was written for, met on a different kind.
 * others — NEITHER. A `vector`, `slot` or `overlay` part routes its ink to a DESCENDANT (`descendantFills`)
 *          precisely because a fill on the artboard Figma hands back from `createNodeFromSvg` is a painted
 *          square behind the glyph (#864). An `absolute` part binds no paint at all.
 */
const allowed = (p: PartDef): Record<Prop, boolean> => {
  if (p.kind === 'box') {
    const declared = p.paintSlots ?? [];
    return { fills: declared.some((s) => s !== 'border'), strokes: declared.includes('border') };
  }
  if (p.kind === 'text') return { fills: true, strokes: false };
  return { fills: false, strokes: false };
};

/** Every coordinate the def can be projected at — the FULL declared grid, never `figmaAnatomySet`.
 *  `figmaProperties.variantAxes` is a narrower list than `variants` on purpose (`icon` declares `size`
 *  while its paint axis is `tone`), so a set-based enumeration would project `icon`'s paint at no
 *  coordinate at all and pin it at zero — a number no mutation can move. */
const placements = (def: ComponentDef): { byPart: Map<string, Set<Prop>>; coords: number } | null => {
  const byPart = new Map<string, Set<Prop>>();
  const sizes: (string | undefined)[] = def.variants?.size?.length ? def.variants.size : [undefined];
  const axes = Object.entries(variantsOf(def)).filter(([a]) => a !== 'size');
  let combos: Record<string, string>[] = [{}];
  for (const [a, vs] of axes) combos = combos.flatMap((c) => vs.map((v) => ({ ...c, [a]: v })));
  const states: (string | undefined)[] = [undefined, ...(def.states ?? [])];

  const walk = (n: FigmaNodePlan): void => {
    const got = byPart.get(n.name) ?? new Set<Prop>();
    for (const prop of PROPS) if (n.paints?.[prop]) got.add(prop);
    byPart.set(n.name, got);
    for (const c of n.children) walk(c);
  };

  let coords = 0;
  for (const size of sizes)
    for (const c of combos)
      for (const st of states)
        for (const leading of [false, true])
          for (const trailing of [false, true]) {
            try {
              walk(figmaAnatomyPlan(def, size, { ...c, ...(st ? { state: st } : {}), leading, trailing, swapTarget: 'FPO-default-icon' } as never).root);
              coords++;
            } catch (err) {
              // A THROW IS NOT A NAMED FAILURE. Reported as one and the enumeration continues, because a
              // gate that dies on coordinate three has silently stopped checking the rest of the grid
              // while its exit status still says "something went wrong somewhere".
              fails.push(`${def.id}: projection threw at size=${size ?? '-'} ${JSON.stringify(c)} state=${st ?? '-'} — ${(err as Error).message}`);
              return null;
            }
          }
  return { byPart, coords };
};

// ── ARM A + B: the comparison itself ──────────────────────────────────────────────────────────────────
// A — no node carries a property its part does not declare (a rule, asserted at zero).
// B — every property a part DOES declare is carried at some coordinate (the mirror, so the gate cannot
//     pass over an empty set: a declaration the projector never honours fails here even though arm A,
//     which only ever objects to paint that is present, would stay green over a tree with none).
//
// ONE function, run over the corpus AND over arm D's fixture. The fixture is where a part can carry paint
// it never declared — the corpus's five anatomies have one box each and it is always the painted one — so
// running the rule only over real defs would leave arm A with nothing it could ever object to.
let checkedParts = 0;
let paintedPlacements = 0;
const compare = (label: string, parts: Record<string, PartDef>, byPart: Map<string, Set<Prop>>): void => {
  for (const [name, p] of Object.entries(parts)) {
    const want = allowed(p);
    const got = byPart.get(name);
    checkedParts++;
    const declares = p.kind === 'box' ? `paintSlots ${p.paintSlots ? `[${p.paintSlots.join(', ')}]` : 'ABSENT'}` : `kind '${p.kind}'`;
    if (!got) {
      // Represented-in-what-was-actually-projected. A part the grid never produced is a part this gate
      // reports on without having looked at, which is the shape `typecheck-components.ts` had to add its
      // own representation arm for.
      if (want.fills || want.strokes)
        fails.push(`A/${label}.${name}: declares paint (${declares}) but the part appears at NO coordinate of the declared grid — nothing was checked`);
      continue;
    }
    for (const prop of PROPS) {
      if (got.has(prop)) paintedPlacements++;
      // Both messages state the MEASUREMENT — what carries what, against what it declared — and not a
      // diagnosis of the cause. The same discrepancy is produced by reading `role`, by ignoring
      // `paintSlots`, and by routing a slot to the wrong property, and a gate that names one of those
      // reads as a false lead under the other two.
      if (got.has(prop) && !want[prop])
        fails.push(`A/${label}.${name}: carries '${prop}' but declares no slot that reaches it (${declares})`);
      if (!got.has(prop) && want[prop])
        fails.push(`B/${label}.${name}: declares a slot reaching '${prop}' (${declares}) but carries it at NO coordinate — authored, valid, and painting nothing`);
    }
  }
};

for (const def of componentDefs) {
  if (!def.anatomy) continue;
  const actual = placements(def);
  if (!actual) continue;
  compare(def.id, def.anatomy.parts, actual.byPart);
  notes.push(`  ${def.id.padEnd(14)} ${String(actual.coords).padStart(4)} coordinates, ${Object.keys(def.anatomy.parts).length} parts`);
}

// ── ARM D: the two-box fixture — the ONLY place the corpus's shape does not reach ─────────────────────
const btn = componentDefs.find((d) => d.id === 'button');
if (!btn?.anatomy) fails.push("D: no 'button' def with an anatomy to build the fixture from — this arm checked nothing");
else {
  /** Button's real anatomy wrapped in a hit-area ROW. `targetPart` moves ONLY `role`; `paintSlots` stays
   *  on `container` in both. This is the switch shape (a clickable row around a painted control) reduced
   *  to the one difference that matters, on a def whose paint grammar actually resolves. */
  const fixture = (targetPart: 'row' | 'container'): ComponentDef => ({
    ...btn,
    id: 'paint-placement-fixture',
    anatomy: {
      ...btn.anatomy!,
      root: 'row',
      parts: {
        ...btn.anatomy!.parts,
        row: {
          kind: 'box',
          role: targetPart === 'row' ? 'target' : 'presentation',
          children: ['container'],
          layout: { direction: 'row', align: 'center', justify: 'start', sizing: { x: 'hug', y: 'hug' } },
        },
        container: { ...btn.anatomy!.parts.container, role: targetPart === 'container' ? 'target' : 'presentation' },
      },
    },
  } as ComponentDef);

  const asRow = fixture('row');
  const asContainer = fixture('container');

  // D1 — the SCHEMA must permit it. If it did not, the arms below would be checking a configuration no
  // def can hold, and #933's premise ("both configurations validate with zero errors") would be false.
  for (const [label, def] of [['row', asRow], ['container', asContainer]] as const) {
    const errs = validateComponentDef(def).errors;
    if (errs.length) fails.push(`D1/${label}-as-target: the fixture does not validate (${errs.length}) — first: ${errs[0]}`);
  }

  const pRow = placements(asRow);
  const pCon = placements(asContainer);
  if (!pRow || !pCon) fails.push('D: the fixture could not be projected — arms D2-D4 checked nothing');
  else {
    // D2 — the declared box paints, and it is NOT vacuous. Without this the invariance in D4 is satisfied
    // by two empty maps.
    if (!pRow.byPart.get('container')?.has('fills'))
      fails.push("D2: the fixture's 'container' declares a ground slot and carries no 'fills' at any coordinate — the arms below would compare two empty placements");
    // D3 — arms A and B, over the fixture, in BOTH configurations. This is where the rule has something
    // to object to: `row` is a box that declares no paint, so any paint on it fails arm A, and it is the
    // interaction target in one of the two runs.
    compare('fixture[row-as-target]', asRow.anatomy!.parts, pRow.byPart);
    compare('fixture[container-as-target]', asContainer.anatomy!.parts, pCon.byPart);
    // D4 — THE INVARIANCE. Moving `role: 'target'` between the two boxes must move nothing about paint.
    const fmt = (m: Map<string, Set<Prop>>): string =>
      [...m].map(([n, s]) => `${n}:${[...s].sort().join('+') || '-'}`).sort().join(' ');
    if (fmt(pRow.byPart) !== fmt(pCon.byPart))
      fails.push(`D4: moving role 'target' between the two boxes CHANGED the paint placement.\n      row-as-target:       ${fmt(pRow.byPart)}\n      container-as-target: ${fmt(pCon.byPart)}`);
  }

  // ── ARM S: the schema rules are non-vacuous ─────────────────────────────────────────────────────────
  // Firing negative controls for this gate's premises. Each is a configuration the arms above assume
  // cannot ship; a rule that has stopped refusing it fails here rather than being discovered by the def
  // that relies on it.
  const withPart = (base: ComponentDef, name: string, patch: Partial<PartDef>): ComponentDef => ({
    ...base,
    anatomy: { ...base.anatomy!, parts: { ...base.anatomy!.parts, [name]: { ...base.anatomy!.parts[name], ...patch } as PartDef } },
  } as ComponentDef);
  const refuses = (label: string, def: ComponentDef, needle: string): void => {
    const hit = validateComponentDef(def).errors.filter((e) => e.includes(needle));
    if (!hit.length) fails.push(`S/${label}: the schema ACCEPTED it — expected an error mentioning '${needle}'`);
  };
  refuses('two boxes claiming one slot', withPart(asRow, 'row', { paintSlots: ['fill'] }), 'all declare paintSlots');
  refuses('paintSlots on a text part', withPart(asRow, 'label', { paintSlots: ['fill'] }), "declares 'paintSlots'");
  refuses('an ink slot on a box', withPart(asRow, 'container', { paintSlots: ['icon'] }), 'which a box may not take');
  refuses('an empty paintSlots', withPart(asRow, 'container', { paintSlots: [] }), "EMPTY 'paintSlots'");
  refuses('a word outside the vocabulary', withPart(asRow, 'container', { paintSlots: ['backdrop'] }), 'which a box may not take');
}

// ── ARM E: representation ─────────────────────────────────────────────────────────────────────────────
// A scope must assert each promised surface was reached, never count files. A green run over zero parts,
// or over a corpus in which no box paints at all, is the failure this arm exists to make impossible.
const withAnatomy = componentDefs.filter((d) => d.anatomy).map((d) => d.id);
if (withAnatomy.length < 5) fails.push(`E: only ${withAnatomy.length} defs with an anatomy were projected — the corpus has had five since #758; a shrinking scope is not a passing gate`);
if (!checkedParts) fails.push('E: no anatomy parts were checked at all');
if (!paintedPlacements) fails.push('E: not one node in the whole corpus came back painted — arm A objects only to paint that is PRESENT, so it cannot see this');
const painters = componentDefs.filter((d) => Object.values(d.anatomy?.parts ?? {}).some((p) => (p.paintSlots ?? []).length)).map((d) => d.id);
if (painters.length < 3) fails.push(`E: only ${painters.length} defs declare paintSlots on any box (${painters.join(', ') || 'none'}) — arms A/B have almost nothing to check`);

console.log('paint placement (#933) — which NODE carries the colour\n');
notes.forEach((n) => console.log(n));
console.log(`\n  parts checked: ${checkedParts}   painted (part, property) placements: ${paintedPlacements}`);
console.log(`  defs declaring paintSlots: ${painters.join(', ')}`);
if (fails.length) {
  console.error(`\n✗ ${fails.length} failure(s)`);
  fails.forEach((f) => console.error(`   - ${f}`));
  process.exit(1);
}
console.log('\n✓ paint lands on the part the def nominated, and moving the interaction target moves nothing');
