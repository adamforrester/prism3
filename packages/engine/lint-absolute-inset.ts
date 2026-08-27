/**
 * ABSOLUTE-INSET GATE (#801, the first instance of #802) — an absolutely-positioned part carrying an
 * `inset` must leave a VISIBLE GAP between itself and the parent it is offset from, in every brand
 * that emits. The gap, not the coordinate: those are different numbers, and this file was shipped
 * once asserting the wrong one of them.
 *
 *   npx tsx packages/engine/lint-absolute-inset.ts
 *
 * ── WHY THIS EXISTS: THE DEFECT IT IS BUILT FROM ────────────────────────────────────────────────
 *
 * #801: Button's focus ring shipped FLUSH against the component in the real Figma file — the one
 * thing WCAG 2.4.11 asks to be distinguishable from the control's own border, sitting exactly on it.
 * Every gate was green and the live paste reported 0 misses.
 *
 * #801 named two candidate causes and the real one was neither. Both were measured, in the harness,
 * driving the real executor over the real 648-member Button set with a real brand's variable names:
 *
 *   · The lookup RESOLVES. 0 `absoluteInset` misses; the ring measured 144×16 at (-2,-2) against a
 *     140×12 target — outside on all four sides.
 *   · The miss path IS reachable and IS counted. Remove `focus/ring/offset` from the file and the
 *     same run reports 108 `focusRing.absoluteInset -> focus/ring/offset` misses.
 *
 * From that a third candidate was proposed — *nothing asserted the resolved NUMBER was not zero* —
 * and **it was wrong.** `focus.ring.offset` is 2 in every brand that emits. Read the two measurements
 * above again with that in hand: they say the ring is at (-2,-2) and 2px larger on every side, which
 * is the plan's stated intent satisfied exactly, and the designer was still looking at a flush ring.
 *
 * THE ACTUAL CAUSE, found by comparing against Prism2 — the hand-built library this engine's output
 * is measured against — rather than by any gate. Prism2's ring, for the same 2px stroke and the same
 * 2px intended gap, sits at **x = -4, y = -4, size = host + 8**. Ours sat at -2 / host + 4. The
 * missing 2 is the ring's own stroke: a materializer sets `strokeAlign: 'INSIDE'` (`anatomy-figma.ts`
 * and `write-components.ts`, correct for a border, because an outside stroke grows the auto-layout
 * footprint), so the ring's 2px stroke is drawn *back inward* across the whole 2px gap. Outer edge
 * lands exactly on the host's border. **Visible gap = offset − strokeWidth = 0.**
 *
 * This is not a porting slip. In CSS `outline-offset` measures from the border edge and the outline
 * grows *away* from it, so the gap and the coordinate are the same number and `2` is right. Only
 * Figma needs the compensation, which is why it lives in the materializer and not in the token —
 * `focus.ring.offset` stays 2 (`docs/19` §1, `docs/05`; lineHeight's px-from-ratio is the same
 * problem already solved that way), and the plan carries a second NAME the executor adds.
 *
 * What was missing at every layer, then, is not a non-zero check. It is that **no gate anywhere knew
 * the ring carries a stroke.** The offset resolved, it wrote, it produced a structurally perfect
 * component — correct `layoutPositioning`, correct constraints, correct paints, 0 misses — and the
 * one quantity a human can see was never computed by anything. That is #802's profile exactly, and
 * why the answer is a gate rather than an edit.
 *
 * ── AND ONE GATE REPORTED A PASS ON IT ──────────────────────────────────────────────────────────
 *
 * `apps/plugin/test-write-components.ts` DID assert the ring's geometry, under the label *"the focus
 * ring is absolute, 2px larger on EVERY side, at a negative origin, and STRETCHed"*. Set the offset
 * to 0 and that assertion still printed a ✓ — measured, whole plugin suite green, ring flush. Two
 * lines did it:
 *
 *     if ((ring.x as number) >= 0) continue;      // a flush ring skips its own check
 *     const off = -(ring.x as number);            // EXPECTED derived from ACTUAL
 *
 * The `continue` exists to tell an inset part from a CENTERED one, and it uses the negative origin as
 * the discriminator — so the one state the check exists to catch is the one state it classifies as
 * "not my subject". Then `off` is read back off the node under test, so `width === parent + off*2`
 * compares the node with itself and asserts `0 === 0`. `docs/34` shape 1, inside a gate whose own
 * prose names the number 2.
 *
 * That was fixed at its site — the part is now told apart by the PLAN's `absoluteInset`, and the
 * offset asserted against the variable the stub resolved. This file exists because that fix is one
 * suite, over one stub, at one offset, in one workspace.
 *
 * ── AND THEN THAT FIXED VERSION WAS STILL WRONG, AND SO WAS THIS FILE ───────────────────────────
 *
 * Read the repaired assertion: it expected the ring at exactly **-2**, which is the flush geometry.
 * And the first version of THIS file asserted `off > 0` on the same coordinate, printing
 * `✓ every declared inset part resolves to an offset that lands it outside its parent` over the
 * shipped defect. Neither was derived from the thing it checked. Both were falsifiable — the plugin
 * suite's negative control genuinely fired at offset 0, this file's genuinely fires at 0 too. They
 * were independent, honest, and **measuring the wrong quantity**: the coordinate, when the property
 * that matters is the gap, and the gap depends on a third quantity — the ring's inward stroke —
 * that neither half of either gate modeled.
 *
 * The aggravating detail is the parity gate. `test.ts` holds the plugin executor's absolutes loop to
 * the payload's, so the two implementations were pinned to each other and confirmed to agree — on
 * one wrong formula. Agreement between independent implementations is evidence about implementation
 * drift and no evidence at all about whether the formula is the right one.
 *
 * `docs/34` carries this as its own shape (*a fully independent gate can measure the wrong
 * quantity*), because shape 1's remedy — make EXPECTED independent of ACTUAL — was already satisfied
 * here and did not help. The remedy for this shape is different: state the quantity a HUMAN would
 * check, in the units they would check it in, and derive it from the physical inputs rather than from
 * the plan's own intent. Which is what `C` below now does, and why it reads `strokeInset`.
 *
 * ── WHAT THIS FILE UNIQUELY CLAIMS, AND WHAT IT DELIBERATELY DOES NOT ───────────────────────────
 *
 * Be precise about the division of labour, because a gate that restates a claim another gate already
 * makes is the kind of coverage that reads as thoroughness and adds nothing:
 *
 *   · The EXECUTORS' ARITHMETIC (`x = -(gap + stroke)`, `w = parent + 2*(gap + stroke)`) is covered
 *     elsewhere, in two places, and this file does not re-derive it. `test.ts` drives the emitted
 *     payload's absolutes loop against a stub and asserts the resulting box against the stub's OWN
 *     two inputs, including an unequal-halves case (gap 5, stroke 1 → -6) that a doubling could not
 *     produce. `test.ts`'s parity gate holds the plugin executor's loop to the payload's. So: two
 *     independent statements of the formula disagree when either moves — with the caveat above, that
 *     this says nothing about the formula being right.
 *   · The VALUES are what nothing checked. `varOf` proves the def BINDS a key; `planBindingErrors`
 *     proves bound names resolve; `readVarsOwn` exists precisely because these names are READ and
 *     never bound, so no binding gate covers them. Nothing anywhere read the NUMBERS on the far end
 *     and asked what a designer would SEE between the part and its parent. That is this file's job,
 *     per brand, from the def's own declaration through to the committed artifact.
 *
 * ── INDEPENDENCE, AND WHY THAT WAS NOT ENOUGH ───────────────────────────────────────────────────
 *
 * EXPECTED comes from the **def**: the part declares `inset` and `strokeInset` as binding keys,
 * `def.tokens` maps each to a token ref, and the naming convention makes Figma names of them. ACTUAL
 * comes from the **plan** (`figmaAnatomyPlan`'s `absoluteInset` / `absoluteStrokeInset`) and from the
 * **committed emitted export** (the FLOATs those names resolve to in `out/figma/<brand>/`). Two
 * walks, neither reading the other. That was already true of the version that passed on the defect —
 * which is the point of the section above. Independence is necessary and it is not the whole job:
 * this file now also has to be measuring the quantity a designer looks at.
 *
 * Four shortcuts that would each make this file unable to fail — the third already shipped once,
 * and the fourth is the one this correction exists to close:
 *
 *   1. Calling `varOf` for the name. That is the projector's own helper, so EXPECTED and ACTUAL
 *      become one derivation and agree in every case, including a wrong one. `figmaVarName` is
 *      restated here as a one-liner for the same reason.
 *   2. Resolving the offsets from a live `Theme` instead of from `out/figma/`. The emitted export is
 *      what a designer's file is built from and what the executor's `byName` map is built over at
 *      paste time; a `Theme` resolved in memory is the projector's input, not the artifact.
 *   3. Reading the offset back off the built node. That is the plugin suite's defect above.
 *   4. Asserting the COORDINATE rather than the GAP — i.e. taking the plan's own account of what it
 *      is doing as the specification. `-inset` is what the plan means to write and writing it is not
 *      the property anyone wants; `gap = inset` visible between the two edges is. Restated: the
 *      subject of this gate is a distance on a screen, so its units are pixels of background, not
 *      pixels of displacement.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────────────
 *
 *   A. NAME AGREEMENT — the `absoluteInset` / `absoluteStrokeInset` the plan carries are the names the
 *      def's own keys resolve to, and every plan carrying one has a PARENT (an inset is measured from
 *      something).
 *   B. THE NAMES RESOLVE, per brand, to FLOATs in that brand's committed export. Not the claim any
 *      binding gate makes: these names are read, never bound.
 *   C. THE VISIBLE GAP IS POSITIVE — `gap = inset` and the part is sited at `-(inset + stroke)`, so
 *      `inset` pixels of background separate the two edges. Stated as the four-sided geometry it
 *      implies so a failure prints coordinates a reader can check against a Figma inspector. Zero is
 *      #801 in both its forms (an offset of 0, and the offset-equals-stroke case that actually
 *      shipped); negative is worse than flush and equally silent. A legitimately-zero gap must be
 *      admitted in `ZERO_OK` below, which is the friction, not an oversight — see that constant.
 *      A part whose nested component draws an inward stroke and declares no `strokeInset` fails here
 *      too, and fails for the right reason: the gate cannot compute a gap it was given no stroke for,
 *      and #801 is precisely what happens when it guesses zero. `component-schema.ts` rejects that
 *      combination at authoring time for the ring specifically; this is the same claim over the
 *      emitted artifact, and it generalizes the day #740 lets any part declare its own stroke.
 *   D. BOTH DIRECTIONS, so the gate cannot pass over an empty set:
 *        · Every part the DEF declares as `kind: 'absolute'` with an `inset` must be REPRESENTED in
 *          some projected plan. Without this, a projector that stopped emitting `absoluteInset`
 *          altogether satisfies A-C vacuously — and `readVarsOwn` would then report no names and
 *          `planBindingErrors` would find nothing to complain about, so nothing else would notice.
 *        · A part the def does NOT declare inset must not acquire one in a plan, and a part gated by
 *          `when: '<state>'` must carry its inset at that state and at NO other. A ring projected at
 *          every state grows all 648 members by 4px, silently.
 *
 * ── WHAT IT DOES NOT CLAIM ──────────────────────────────────────────────────────────────────────
 *
 * No browser, no Figma file — so it cannot see a host that accepts a write and discards it
 * (`layoutPositioning` reverted, a `resize` that did not take). Both executors read those back
 * themselves and report them as misses. It also does not claim the part is VISIBLE at that offset: a
 * ring outside a clipping parent is geometrically correct and invisible, and `clipsContent` is a
 * host-behavior claim that belongs with the read-backs. #802's Figma half stays open, and the live
 * reproduction of #801 against a built file is still unrun.
 */

/**
 * MUTATION-VERIFIED BY NAME, after #1097 moved the names this gate resolves (see `floatVars`).
 *
 *   · `anatomy-figma.ts`'s `absoluteInset: varOf(p.inset)` → a tail that does not exist
 *       → 42 "is not a FLOAT" failures. The tail lookup still fails on a genuinely absent name;
 *         it did not become permissive by matching loosely.
 *   · `button.ts`'s `'ring-offset': 'focus.ring.offset'` → `'focus.ring.offset-field'` (value 0)
 *       → 9 failures naming the zero gap and WCAG 2.4.11. This is the arm that matters, and it is
 *         the arm that was DEAD: under the pre-fix lookup the header printed "0 (part × brand) gap
 *         check(s)" and this mutation would have changed nothing. The vacuity report is what caught
 *         it — an arm that runs zero checks is not a pass, and the count in the header is there so a
 *         reader can see the difference between 0 and 42 without running a mutation to find out.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { componentDefs } from './components/index';
import { figmaAnatomyPlan, type AnatomyPlan, type FigmaNodePlan } from './anatomy-figma';
import type { ComponentDef } from './component-schema';
// The positional, brand-invariant read layer (#1097) — a gate must not spell a brand's root either.
import { tailOf } from './figma-names';

const OUT_FIGMA = join(import.meta.dirname, 'out', 'figma');

/**
 * GAPS THAT ARE LEGITIMATELY ZERO, keyed `<def>.<part>` → the reason, which must say what supplies
 * the separation instead.
 *
 * Empty today, and it is a real case rather than a hypothetical hook: `focus.ring.offset-field`
 * resolves to 0 in every brand on purpose — `text-field` binds it, and `focus-ring`'s own `offset`
 * prop documents why ("an input's own border already supplies the separation and a gap there reads as
 * a double border"). `text-field` has no `anatomy` yet, so nothing projects it; the day it does, this
 * gate fails until a human writes the reason down here. That friction is the feature, for the same
 * argument `schema/payload-manifest.json` is authored rather than regenerated: a gate that decided
 * for itself which zeroes were intended would have classified #801's as intended too.
 */
const ZERO_OK: Record<string, string> = {};

/**
 * The scope floor. `docs/34`: a gate with a scope asserts each promised surface is REPRESENTED, never
 * merely counts. These are every def declaring an absolute inset part today; if one stops being
 * covered — including by being deleted — this file fails rather than reporting clean over a smaller
 * set. A count would read that as a pass.
 */
const MUST_COVER = ['button.focusRing', 'icon-button.focusRing', 'checkbox.focusRing'];

/**
 * The floor for the COMPENSATION specifically — every part above whose gap must be computed against a
 * real inward stroke, not just against its offset. Separate from `MUST_COVER` and not derived from it,
 * because they fail for different reasons: `MUST_COVER` catches a part that stopped being projected,
 * this catches a part still projected whose stroke stopped being modeled. The second is #801 returning
 * — the arithmetic degrades to `gap = offset`, every other check here still passes, and the ring goes
 * flush again.
 */
const MUST_CLEAR_STROKE = ['button.focusRing', 'icon-button.focusRing', 'checkbox.focusRing'];

/** The naming convention, restated rather than imported from the projector — shortcut 1 above. */
const nameOf = (ref: string): string => ref.replace(/\./g, '/');

/**
 * DOES THE COMPONENT THIS PART NESTS DRAW A STROKE INSIDE ITS OWN BOUNDS? — read from the NESTED
 * def's own `tokens`, which is the half of C that the host cannot fake. If it does, the host's part
 * must declare a `strokeInset` for it, and that binding must name the SAME token: a host compensating
 * for the wrong width leaves a gap of the wrong size, silently, exactly as #801 did.
 *
 * A `width` token key IS the stand-in for the stroke `PartDef` has no field for (#740, and the reason
 * `focus-ring`'s own header lists that as wall 1). It is a stand-in and it is not a guess: `focus-ring`
 * binds `width: 'focus.ring.width'`, its `codeOnly` says in as many words that the stroke weight is
 * bound in `tokens` because no part can carry it, and the ring's whole substance IS that stroke. When
 * #740 gives a part a stroke field, this function reads that field instead and the claim below is
 * unchanged — which is the generalization the fix was shaped for.
 */
const inwardStrokeRef = (nested: ComponentDef): string | undefined => nested.tokens?.['width'];

/** Brands DISCOVERED from the emitted tree, not listed, so a new brand is covered the day it emits.
 *  Asserted non-empty below: a scan that finds nothing must fail, not report clean. */
const brands = (): string[] =>
  existsSync(OUT_FIGMA)
    ? readdirSync(OUT_FIGMA, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];

/**
 * Every FLOAT a brand's committed Figma export defines, keyed by TAIL → value.
 *
 * BY TAIL, NOT BY FULL NAME, and this is a plan-meets-file boundary rather than a convenience. Since
 * #1097 the export names every variable `<root>/focus/ring/offset`, while a plan's `absoluteInset` is
 * root-RELATIVE (`focus/ring/offset`) because a plan is brand-agnostic — the same plan is pasted into
 * `prism`, `nbds` and `wendys` files. Keying by full name made every lookup below miss and the gate
 * reported 45 "not a FLOAT" failures against variables that are all present.
 *
 * The tail must be unique or the lookup is ambiguous, so that is ASSERTED rather than assumed: all of a
 * brand's variables share one root, so a duplicate tail means two variables with the same full name,
 * and a silent last-one-wins here would resolve a gap against the wrong value. `write-components.ts`
 * reports the same condition as `AMBIGUOUS variable tail` at its own boundary.
 */
const floatVars = (brand: string): Map<string, number> => {
  const byTail = new Map<string, number>();
  const seen = new Map<string, string>();
  for (const f of readdirSync(join(OUT_FIGMA, brand)).filter((n) => n.endsWith('.json'))) {
    const doc = JSON.parse(readFileSync(join(OUT_FIGMA, brand, f), 'utf8')) as {
      variables?: Array<{ name: string; resolvedType?: string; value?: unknown }>;
    };
    for (const v of doc.variables ?? []) {
      if (v.resolvedType !== 'FLOAT' || typeof v.value !== 'number') continue;
      const tail = tailOf(v.name);
      const prior = seen.get(tail);
      if (prior !== undefined && prior !== v.name) {
        throw new Error(
          `AMBIGUOUS variable tail in brand '${brand}': '${tail}' is the tail of both '${prior}' and ` +
            `'${v.name}', so a root-relative plan name cannot be resolved to one variable. A plan is ` +
            'brand-agnostic and binds by tail; two variables sharing one is a naming defect, not something ' +
            'for this gate to pick a winner for.',
        );
      }
      seen.set(tail, v.name);
      byTail.set(tail, v.value);
    }
  }
  return byTail;
};

/** Every node in a plan, WITH its parent — the parent is half of what an inset means, so a walk
 *  returning only the node could not state the claim. */
type Sited = { node: FigmaNodePlan; parent: FigmaNodePlan | null };
const sited = (n: FigmaNodePlan, parent: FigmaNodePlan | null = null): Sited[] =>
  [{ node: n, parent }, ...n.children.flatMap((c) => sited(c, n))];

/** What the DEF declares, read from the def — the half of D that is independent of whether the
 *  projector emitted anything at all. `when` is carried because it is the state the inset is
 *  supposed to appear at, and at no other. `strokeKey` is OPTIONAL on the def and its absence is a
 *  claim ("this part's nested component draws nothing inward"), which C tests rather than trusts. */
type Declared = { part: string; insetKey: string; strokeKey?: string; when?: string };
const declaredInsets = (def: ComponentDef): Declared[] =>
  Object.entries(def.anatomy?.parts ?? {})
    .map(([part, p]) => ({ part, ...(p as { kind?: string; inset?: string; strokeInset?: string; when?: string }) }))
    .filter((p): p is typeof p & { kind: string; inset: string } => p.kind === 'absolute' && typeof p.inset === 'string')
    .map(({ part, inset, strokeInset, when }) => ({ part, insetKey: inset, strokeKey: strokeInset, when }));

/** THE GEOMETRY A GAP IMPLIES, restated so a failure prints coordinates a reader can check against a
 *  Figma inspector. `gap` is the background a designer sees; `stroke` is what the nested component
 *  draws back inward across it, so the node has to be sited by their SUM to leave `gap` behind. This
 *  is NOT a second check on the executors' formula — `test.ts` owns that comparison, and the header
 *  says why this file does not re-derive it. */
const box = (pw: number, ph: number, gap: number, stroke: number) => {
  const off = gap + stroke;
  return { off, x: -off, y: -off, width: pw + off * 2, height: ph + off * 2 };
};

/** The parent's size is not on the plan — Figma measures it from the hug — so the claim is a RELATION
 *  against whatever the parent turns out to be. Two probe sizes, because a relation that holds at one
 *  parent size only is arithmetic that happens to work rather than a rule. */
const PROBE_PARENTS: Array<[number, number]> = [[88, 32], [140, 48]];

const failures: string[] = [];
const notes: string[] = [];
const covered = new Set<string>();
/** Parts whose gap was computed against a real stroke, so the run can assert the compensation path
 *  was EXERCISED and not merely available. Without this, a projector that stopped emitting
 *  `absoluteStrokeInset` leaves C computing `gap = offset` again — #801's arithmetic exactly — and
 *  every remaining check passes. */
const strokeCovered = new Set<string>();
let coords = 0;
let valueChecks = 0;

const bs = brands();
if (bs.length === 0)
  failures.push(`SCOPE EMPTY: no brand directories under ${OUT_FIGMA} — every check below would pass over an empty set. Run \`npx tsx packages/engine/regen.ts\` first.`);
const vars = new Map(bs.map((b) => [b, floatVars(b)] as const));

for (const def of componentDefs) {
  if (!def.anatomy) continue;
  const declared = declaredInsets(def);
  const sizes = def.variants?.size ?? [];
  if (declared.length === 0 || sizes.length === 0) continue;

  const byPart = new Map(declared.map((d) => [d.part, d] as const));
  const reached = new Set<string>();

  // Every (size, state) coordinate the def declares. States matter: `when` gates the part, so a plan
  // for the wrong state must carry NO inset — the second half of D.
  for (const size of sizes) {
    for (const state of [...(def.states ?? []), undefined]) {
      const slots: Record<string, unknown> = { state, leading: true, trailing: true };
      for (const [axis, values] of Object.entries(def.variants ?? {})) if (axis !== 'size') slots[axis] = values[0];
      let plan: AnatomyPlan;
      try {
        plan = figmaAnatomyPlan(def, size, slots as never);
      } catch {
        continue;   // a coordinate this def does not project; other gates own that
      }
      coords++;
      const at = `${def.id}/${size}/state=${state ?? 'none'}`;

      for (const { node, parent } of sited(plan.root)) {
        const d = byPart.get(node.name);

        // ---- D, second direction: an inset appears only where the def says it should ------------
        if (!node.absoluteInset) {
          if (d && d.when !== undefined && d.when === state)
            failures.push(`${at}: the def declares '${node.name}' inset and gates it on state '${d.when}', which THIS coordinate is — and the plan gives it no absoluteInset, so the part projects flush`);
          continue;
        }
        if (!d) {
          failures.push(`${at}: the plan gives '${node.name}' an absoluteInset ('${node.absoluteInset}') and the DEF declares no absolute inset for that part — the two disagree about whether this part is inset at all`);
          continue;
        }
        if (d.when !== undefined && d.when !== state) {
          failures.push(`${at}: '${node.name}' carries an absoluteInset at a coordinate its own \`when: '${d.when}'\` excludes — an inset projected at every state grows every member of the set by 2× the offset, silently`);
          continue;
        }
        reached.add(node.name);
        covered.add(`${def.id}.${node.name}`);

        if (!parent) {
          failures.push(`${at}: inset part '${node.name}' is the plan ROOT — an inset is measured outward from a parent and this node has none`);
          continue;
        }

        // ---- A: the name on the plan is the one the DEF's own key resolves to -------------------
        const refOf = (key: string): string | undefined => def.tokens[key.includes('{size}') ? key.replace('{size}', size) : key];
        const ref = refOf(d.insetKey);
        if (!ref) {
          failures.push(`${at}: '${node.name}' declares inset key '${d.insetKey}' and def.tokens binds no such key — the plan carries '${node.absoluteInset}' from somewhere this gate cannot corroborate`);
          continue;
        }
        if (node.absoluteInset !== nameOf(ref))
          failures.push(`${at}: '${node.name}'.absoluteInset is '${node.absoluteInset}', and the def's own key '${d.insetKey}' → '${ref}' names '${nameOf(ref)}'`);

        // ---- A, the stroke half: does what this part NESTS draw inward, and is it compensated? --
        // The question is asked of the NESTED def, so the host cannot answer it about itself. Three
        // outcomes, and the middle one is #801.
        const nested = d.strokeKey !== undefined || node.nestTarget
          ? componentDefs.find((c) => c.id === node.nestTarget)
          : undefined;
        const inwardRef = nested ? inwardStrokeRef(nested) : undefined;
        const strokeRef = d.strokeKey !== undefined ? refOf(d.strokeKey) : undefined;

        if (inwardRef && d.strokeKey === undefined) {
          failures.push(
            `${at}: '${node.name}' nests '${node.nestTarget}', whose own tokens bind a stroke width ('${inwardRef}') it draws INSIDE its bounds (strokeAlign: 'INSIDE' at both executors) — and this part declares no \`strokeInset\` to compensate for it. The part is sited at -inset, the stroke is drawn back across the gap, and the visible separation is (inset − ${inwardRef}). That is #801: at the shipped 2px/2px it is ZERO, and it resolves, writes and reports no miss.`,
          );
          continue;
        }
        if (d.strokeKey !== undefined) {
          if (!strokeRef) {
            failures.push(`${at}: '${node.name}' declares strokeInset key '${d.strokeKey}' and def.tokens binds no such key`);
            continue;
          }
          if (!inwardRef)
            failures.push(`${at}: '${node.name}' declares \`strokeInset\` → '${strokeRef}', and the def it nests ('${node.nestTarget ?? 'nothing'}') binds no stroke width of its own — so the host is adding a compensation for a stroke that is not there, and the gap is (inset + ${strokeRef}) rather than inset`);
          else if (inwardRef !== strokeRef)
            failures.push(`${at}: '${node.name}' compensates for '${strokeRef}' and the def it nests draws '${inwardRef}' — the wrong width leaves a gap of the wrong size in every brand where the two values differ, silently`);
          if (!node.absoluteStrokeInset)
            failures.push(`${at}: the def declares '${node.name}'.strokeInset ('${d.strokeKey}') and the PLAN carries no absoluteStrokeInset — the executors then site the part at -inset alone, which is the #801 geometry`);
          else if (node.absoluteStrokeInset !== nameOf(strokeRef))
            failures.push(`${at}: '${node.name}'.absoluteStrokeInset is '${node.absoluteStrokeInset}', and the def's own key '${d.strokeKey}' → '${strokeRef}' names '${nameOf(strokeRef)}'`);
        }

        for (const brand of bs) {
          // ---- B: the names resolve to FLOATs in that brand's committed export -----------------
          const gap = vars.get(brand)!.get(node.absoluteInset);
          if (gap === undefined) {
            failures.push(`${at}: '${node.name}'.absoluteInset → '${node.absoluteInset}' is not a FLOAT in brand '${brand}' — at paste the executor reports a miss and the part is left at its parent's bounds`);
            continue;
          }
          let stroke = 0;
          if (node.absoluteStrokeInset) {
            const sw = vars.get(brand)!.get(node.absoluteStrokeInset);
            if (sw === undefined) {
              failures.push(`${at}: '${node.name}'.absoluteStrokeInset → '${node.absoluteStrokeInset}' is not a FLOAT in brand '${brand}' — the executor reports that miss and sites the part at -${gap}, so this brand alone ships the #801 geometry`);
              continue;
            }
            stroke = sw;
            strokeCovered.add(`${def.id}.${node.name}`);
          }

          // ---- C: the VISIBLE GAP is positive -------------------------------------------------
          // `gap` is the number a designer measures between the two edges — NOT the coordinate. The
          // node is sited at -(gap + stroke) precisely so that `stroke` px of it is drawn back over
          // the compensation and `gap` px of background survives. Asserting the coordinate instead is
          // what shipped #801 past this file once; see the header.
          const key = `${def.id}.${node.name}`;
          if (gap === 0 && key in ZERO_OK) {
            notes.push(`${key} @ ${brand}: gap 0, admitted — ${ZERO_OK[key]}`);
            valueChecks++;
            continue;
          }
          if (!(gap > 0)) {
            failures.push(
              `${at}: '${node.name}'.absoluteInset → '${node.absoluteInset}' = ${gap} in brand '${brand}'. ` +
                `A gap of ${gap} builds the part ${gap === 0 ? 'FLUSH AGAINST' : 'INSIDE'} its parent, which is #801: it resolves, it writes, it reports no miss, ` +
                `and a focus ring flush with the border it must be distinguishable from fails WCAG 2.4.11. ` +
                `If ${gap} is intended here, add '${key}' to ZERO_OK in this file with the reason.`,
            );
            continue;
          }
          for (const [pw, ph] of PROBE_PARENTS) {
            const b = box(pw, ph, gap, stroke);
            // The four-sided statement, and then the one a human would make: how much background is
            // left. `-b.x - stroke` re-derives the gap from the SITED coordinate, so a compensation
            // applied in the wrong direction (or twice) fails here even though `gap > 0` above passed.
            const seen = -b.x - stroke;
            const bad = [
              b.x < 0 ? null : `x=${b.x} is not left of the parent's edge`,
              b.y < 0 ? null : `y=${b.y} is not above the parent's edge`,
              b.width > pw ? null : `width=${b.width} does not exceed the parent's ${pw}`,
              b.height > ph ? null : `height=${b.height} does not exceed the parent's ${ph}`,
              seen === gap ? null : `${seen}px of background separates the two edges, not the ${gap}px the brand asks for`,
              seen > 0 ? null : `NOTHING separates the two edges — the part's outer edge lands ${seen === 0 ? 'exactly on' : 'inside'} its parent's`,
            ].filter(Boolean);
            if (bad.length)
              failures.push(`${at}: '${node.name}' at gap ${gap} + stroke ${stroke} → offset ${b.off} (brand '${brand}') does not clear its ${pw}×${ph} parent — ${bad.join('; ')}`);
          }
          valueChecks++;
        }
      }
    }
  }

  // ---- D, first direction: the vacuous-pass guard ------------------------------------------------
  for (const { part, when } of declared)
    if (!reached.has(part))
      failures.push(`${def.id}: the def declares '${part}' as an absolute part with an inset${when ? ` gated on state '${when}'` : ''}, and NO projected coordinate carried one. Either the projector stopped emitting absoluteInset — in which case every check above passed over an empty set — or '${when}' is not in def.states.`);
  notes.push(`${def.id}: ${declared.length} declared inset part(s) — ${declared.map((d) => `${d.part} (${d.insetKey}${d.strokeKey ? ` + ${d.strokeKey}` : ''}${d.when ? ` @ ${d.when}` : ''})`).join(', ')}`);
}

for (const m of MUST_COVER)
  if (!covered.has(m))
    failures.push(`SCOPE NOT REPRESENTED: '${m}' is a known absolute inset part and this run checked no plan carrying it. If it was legitimately removed, drop it from MUST_COVER in this file in the same PR; otherwise a clean run here means nothing.`);

for (const m of MUST_CLEAR_STROKE)
  if (!strokeCovered.has(m))
    failures.push(`COMPENSATION NOT EXERCISED: '${m}' nests a component that draws a stroke inside its own bounds, and this run computed its gap against NO stroke — so C measured (gap = offset), which is the arithmetic that shipped #801. Either the plan stopped carrying absoluteStrokeInset or no brand emits the width; both are the defect, and every other check above passes through them.`);

console.log(`Absolute-inset geometry — ${coords} projected coordinate(s), ${valueChecks} (part × brand) gap check(s) over ${bs.length} brand(s): ${bs.join(', ') || 'NONE'}`);
for (const n of notes) console.log(`    ${n}`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} absolute-inset failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(`\nAn absolutely-positioned part carrying an inset must leave VISIBLE BACKGROUND between itself and`);
  console.error(`its parent — the gap, not the coordinate. #801 shipped a ring at the coordinate its plan intended,`);
  console.error(`with a gap of zero, because the ring's own stroke is drawn back inward across it. It resolved, it`);
  console.error(`wrote, it reported 0 misses, two executors agreed, and the ring failed the one requirement it`);
  console.error(`exists to satisfy.`);
  process.exit(1);
}
console.log(`  ✓ every declared inset part leaves its brand's full gap of visible background — measured as`);
console.log(`    (offset − the inward stroke it compensates for), in all ${bs.length} brand(s).`);
console.log(`    The limit, stated: this is the plan and the committed export, not a Figma file. A host that`);
console.log(`    accepts a write and discards it is caught by the executors' own read-backs (#802 stays open).`);
