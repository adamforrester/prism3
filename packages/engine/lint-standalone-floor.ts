/**
 * STANDALONE-FLOOR GATE (#869, #802's family) — a def offered as a build target must project members
 * that acquire an EXTENT, and a def that cannot must declare `figmaProperties.notStandalone`. Both
 * directions, so neither a silent half-build nor a stale admission survives.
 *
 *   npx tsx packages/engine/lint-standalone-floor.ts
 *
 * ── WHY THIS EXISTS: THE DEFECT IT IS BUILT FROM ────────────────────────────────────────────────
 *
 * #869: building `focus-ring` from the plugin's Components page produced a **100×100 white box with the
 * correct focus color at 1px**. Not a crash, not a miss report — an artifact that reads as a successful
 * build. The issue itself proposed that the def errored and left a partial node behind. Measured against
 * the real projector over nb's committed emission, it does not:
 *
 *   · `figmaAnatomySet(focusRing)` → **2 members, 0 binding errors, 0 set properties**, nothing throws.
 *   · `planSetLayout` succeeds — 2 cells, axis `color`, a 1×2 grid.
 *   · Each member's root is `{name:'ring', type:'FRAME', strokes:'color/border/focus', bound:{},
 *     children:[]}` — no `layoutMode`, no sizing mode, no `width`, no `height`, no `strokeWeight`.
 *     (#1266 gave the ring a bound `strokeWeight`, so `bound` is no longer empty and the box is stroked
 *     at its brand's 2px rather than the executors' 1px fallback. Nothing else in that line moved, which
 *     is the point of this gate: a stroke is not an extent.)
 *
 * So it is a COMPLETE build of a plan that carries no geometry, which is a different defect from the one
 * #869 describes and needs a different fix. The 100×100 is Figma's default frame, supplied because
 * nothing in the plan says otherwise. The 1px is `write-components.ts`'s deliberate fallback
 * (`if (!node.strokeWeight) node.strokeWeight = 1`, there so a bound stroke paints *something*). Nested,
 * none of this arises: Button sites the ring absolutely and the executor resizes it to
 * `parent + inset*2`, which is where all five absent fields come from. Standalone there is no parent —
 * and there was never a code path to lose.
 *
 * ── WHY NOTHING COULD SEE IT ────────────────────────────────────────────────────────────────────
 *
 * Every existing gate asks a question this passes. `planBindingErrors` asks whether refs resolve: they
 * do. `lint-paint.ts` asks whether a paint key's axis matches its ref: it does. `test.ts`'s parity gate
 * asks whether the two executors agree: they agree exactly. `typecheck-components.ts` asks whether the
 * def typechecks: it does. `figmaAnatomySet`'s own guards ask whether every member has a coordinate:
 * every member has one. **The plan is valid. It is valid and it describes nothing a designer can use**,
 * which is #802's profile — every other gate checks that a thing exists, a ref resolves, a count
 * matches, or nothing threw.
 *
 * And the def's own `codeOnly` ALREADY SAID SO, in as many words: *"the members are strokeless"*,
 * *"what it projects is not yet a ring"*. Correct, specific, written before the build that produced the
 * box, and in a field nothing consults for this question. That is the actual defect this gate answers —
 * not a missing check but **a decision recorded where only humans look**. `figmaProperties.notStandalone`
 * is the same admission moved somewhere the picker and the plugin's `buildComponents` can act on it.
 *
 * ── THE TWO HALVES, AND WHY THEY ARE INDEPENDENT ────────────────────────────────────────────────
 *
 * EXPECTED is the DEF's declaration — the presence or absence of `figmaProperties.notStandalone`, read
 * off the def and nothing else. ACTUAL is measured from the PROJECTED PLAN, walked here, by asking of
 * each node: does anything give this node an extent? The two never touch. In particular this file does
 * NOT call `notStandalone`, `COMPONENT_CATALOGUE`, or the plugin's refusal branch — all three read the
 * same field, so any of them would make the check agree with itself.
 *
 * ── WHY A RULE OVER SIX MECHANISMS RATHER THAN "IS IT focus-ring" ───────────────────────────────
 *
 * The rule is authored from a corpus measurement, not from the def that failed. Across all six
 * projecting defs at the time, every node acquired extent through one of seven mechanisms and **21 of 22
 * node names had one** — the table is left at its original measurement because the ONE that did not is
 * what this file was built to catch, and #1280 has since closed it (see the arm-B note below), which the
 * table would hide if it were refreshed to read 22 of 22:
 *
 *     icon         glyph          glyphViewBox (bound.width + bound.height until #864)
 *     button       container      bound.height + layoutMode with 1-4 children
 *                  label          characters (a TEXT node sizes to its content)
 *                  leading/trailing/spinner   bound.width + bound.height, and an instance
 *                  focusRing      instance + absoluteInset (its host supplies the rest)
 *     icon-button  container      bound.width + bound.height + layoutMode
 *     field-label  label          layoutMode with 2 children
 *                  text/indicator characters
 *     field-message message       layoutMode with 2 children
 *     focus-ring   ring           ← NOTHING (until #1280: bound.width + bound.height, a nominal square)
 *
 * A def-name allowlist would have been one line and would catch exactly today's case. `SIZE_SOURCES`
 * below is checkable instead, and the property it buys is worth stating precisely because the first
 * draft of this paragraph stated it wrongly: it said *"the day a seventh mechanism is added, this gate
 * fails"*, which is false — adding an entry only widens what passes. The real property is the converse.
 * If the PROJECTOR gains a seventh way to size a node and nobody adds it here, the first def relying on
 * it alone fails arm A, and the fix is to decide whether the new mechanism really determines an extent.
 * A def allowlist would have passed that def silently.
 *
 * ── AND THE MECHANISMS ARE ASSERTED, BECAUSE THE CORPUS DOES NOT EXERCISE THEM ALL ──────────────
 *
 * Measured on this file itself: collapsing `layoutMode+children` to a bare `layoutMode` — the exact
 * "same field, two cases" conflation the entry's own comment warns against — changed NOTHING. Six defs,
 * still green, because no def in the corpus has a childless auto-layout root, so the discriminating
 * clause is never reached. A predicate no input distinguishes is a claim this file makes about itself
 * and cannot support, and `docs/34`'s register has that shape twice: **a mutation that changes nothing
 * is indistinguishable from a blind spot.**
 *
 * So `PREDICATE_CASES` below states, per mechanism, one node that must count and one that must not, and
 * checks the predicates against them before the corpus walk. EXPECTED is authored per case in the words
 * of what Figma does; ACTUAL is the predicate. It is a unit test living inside a gate deliberately: the
 * alternative is a second file that can be run separately and therefore separately forgotten, and the
 * two halves are useless apart — the corpus walk proves the rule holds over real defs, and this proves
 * the rule says what it means. The negative cases are the half that does the work.
 *
 * The scoping decision inside the rule is worth stating because the boundary is where a heuristic would
 * go wrong. It asks about the **root** node only. A leaf with no extent is a real defect and it is
 * `figmaPropertyErrors`' (#510/#796: a text part with no TEXT property is a blank node) — but a leaf can
 * legitimately be sized by its parent's auto-layout, so the same question at leaf depth has a different
 * answer and needs a different check. A root has no parent, so for a root the question is unambiguous:
 * nothing above it can supply what it does not carry.
 *
 * ── WHY THE CONVERSE IS THE HALF THAT WORKS ─────────────────────────────────────────────────────
 *
 * `docs/34`'s argument about forward-only lists applies exactly. Arm A (a geometry-free root must be
 * declared) is what #869 needed. Arm B (a declared def must actually be geometry-free) is what stops the
 * declaration becoming a permanent exemption: #740 or a later schema field may give the ring its own
 * size, at which point `notStandalone` is a stale refusal — a def that CAN be built and is not offered,
 * with a sentence on screen explaining a limit that no longer exists. Arm B fails then, by name.
 *
 * IT DID, IN #1280, AND THE OUTCOME IS WORTH RECORDING because arm B was written on a guess about how it
 * would be reached and the guess was wrong in an instructive way. It predicted a SCHEMA field arriving
 * (#740) and giving the ring a size it had been unable to express. What actually happened is that the
 * refusal turned out to be one half of a deadlock: a host resolves `nests: 'focus-ring'` by NAME against
 * the designer's live file, so the ring must be BUILT before any host can nest it, and this field refused
 * the only build that could put it there. Nothing was blocking the size; the def had simply never needed
 * one, and needed one for a reason two tiers away from geometry. Arm B did not care — the whole value of
 * the converse is that it asks whether the declaration is still TRUE, not whether the author's story about
 * why it might stop being true came about. It fired on `bound.width + bound.height` and named the def.
 *
 * AND IT COST ARM B ITS ONLY CORPUS INPUT, which is why `ARM_CASES` now exists below: `focus-ring` was
 * the one def that ever declared the floor, so with the declaration gone arm B ranges over an empty set.
 * A gate whose arm nothing can reach is this file's own `layoutMode` measurement one level up.
 *
 * And arm C is the scope floor, because both arms above range over "defs that project": if
 * `figmaAnatomySet` began throwing for every def, A and B would pass over an empty set and this file
 * would print a clean line. `MUST_PROJECT` is the memory of which defs project today.
 *
 * ── WHAT IT DOES NOT CLAIM ──────────────────────────────────────────────────────────────────────
 *
 * No Figma file. "Acquires an extent" is a claim about the PLAN — that some mechanism determines the
 * node's size — not that Figma computes the size a designer wanted, and not that the result is
 * *visible* (a zero-height auto-layout frame with two empty children satisfies the rule and shows
 * nothing). It also does not claim a nested part is correct at its host: that is
 * `lint-absolute-inset.ts`, which measures the gap, and #802's Figma half stays open.
 *
 * One consequence to know before extending: this gate's subject is the ROOT of member 0's plan. That is
 * sound because `figmaAnatomySet` builds every member from one anatomy, so the root's structural fields
 * do not vary by coordinate — verified by measuring the union over all 648 of Button's members, where
 * every node name that is ever sized is sized at every coordinate it appears at. If a def ever varies
 * its root's sizing by coordinate, this reads member 0 and is blind to the rest, so widen the walk.
 */

import { componentDefs } from './components/index';
import { figmaAnatomySet, type FigmaNodePlan } from './anatomy-figma';
import type { ComponentDef } from './component-schema';

/**
 * THE SIX WAYS A NODE ACQUIRES AN EXTENT, each a predicate over the plan and each with the reason it
 * counts. Authored from the corpus measurement in the header, and deliberately a list of MECHANISMS
 * rather than a list of defs: a seventh mechanism arriving must fail this gate and be argued for.
 *
 * `layoutMode` is split in two on purpose. An auto-layout frame WITH children hugs them, so its extent
 * is determined; with NO children it hugs nothing and collapses — which is a different case wearing the
 * same field, and treating them alike would let a childless auto-layout frame pass as sized.
 */
const failuresPre: string[] = [];

const SIZE_SOURCES: Array<{ id: string; why: string; has: (n: FigmaNodePlan) => boolean }> = [
  { id: 'bound.width', why: 'a bound width variable fixes the horizontal extent', has: (n) => Boolean(n.bound?.width) },
  { id: 'bound.height', why: 'a bound height variable fixes the vertical extent', has: (n) => Boolean(n.bound?.height) },
  { id: 'layoutMode+children', why: 'an auto-layout frame with children hugs them, so its children determine its extent', has: (n) => Boolean(n.layoutMode) && n.children.length > 0 },
  { id: 'characters', why: 'a TEXT node with content sizes to that content', has: (n) => n.type === 'TEXT' && Boolean(n.characters) },
  { id: 'instance', why: 'an instance inherits the extent of the component it instantiates', has: (n) => n.type === 'INSTANCE_SWAP' || n.type === 'NESTED_INSTANCE' },
  { id: 'absoluteInset', why: 'an absolutely-sited part is resized to its parent grown by the inset', has: (n) => Boolean(n.absoluteInset) },
  // The SEVENTH mechanism, added by #864 — and it is the case this file's header predicted rather than
  // a widening to go green. `icon`'s root stopped being a `box` with `size.{size}` bound on both axes
  // and became the glyph itself, sized by the ARTBOARD its SVG document declares: Figma's importer
  // reads the `viewBox` and returns a frame of that box, so the extent is real and comes from neither a
  // bound variable nor a child. The predicate reads `glyphViewBox` and NOT `glyphSvg`, which is the
  // whole decision: `glyphSvg` is the document, and a document can perfectly well declare no artboard —
  // Figma then sizes the frame to the ink, which is the 14x2 `minus` that `lint-glyph-geometry.ts`
  // exists to refuse. `glyphViewBox` is the plan's claim that the box is DECLARED, so it is the field
  // that answers this file's question. Both non-zero, because a `0x0` artboard is an extent in name
  // only and reads as a successful build exactly like #869's 100x100.
  { id: 'glyphViewBox', why: 'a glyph frame is sized by the artboard its SVG document declares, which Figma\'s importer reads off the viewBox', has: (n) => Boolean(n.glyphViewBox && n.glyphViewBox[0] > 0 && n.glyphViewBox[1] > 0) },
];

/**
 * ONE POSITIVE AND ONE NEGATIVE CASE PER MECHANISM — see the header. Hand-built minimal nodes, so each
 * case isolates the one field its mechanism turns on: a positive that must count, and a negative that
 * must NOT, chosen to be the near-miss rather than an empty node. Every mechanism needs both, asserted
 * below, so adding a `SIZE_SOURCES` entry without cases fails rather than arriving unexercised.
 *
 * `bound.width` / `bound.height` share a negative shape and that is not a copy-paste slip: each one's
 * negative is *the other axis bound*, which is the only near-miss that distinguishes them.
 */
const node = (over: Partial<FigmaNodePlan>): FigmaNodePlan => ({ name: 'n', type: 'FRAME', bound: {}, children: [], ...over });
const kid = node({ name: 'k' });

const PREDICATE_CASES: Record<string, { yes: FigmaNodePlan; no: FigmaNodePlan; noWhy: string }> = {
  'bound.width': { yes: node({ bound: { width: 'size/sm/width' } }), no: node({ bound: { height: 'size/sm/height' } }), noWhy: 'a bound HEIGHT is not a width' },
  'bound.height': { yes: node({ bound: { height: 'size/sm/height' } }), no: node({ bound: { width: 'size/sm/width' } }), noWhy: 'a bound WIDTH is not a height' },
  'layoutMode+children': { yes: node({ layoutMode: 'HORIZONTAL', children: [kid] }), no: node({ layoutMode: 'HORIZONTAL' }), noWhy: 'an auto-layout frame with NO children hugs nothing and collapses — the case the corpus never exercises, and the reason this table exists' },
  characters: { yes: node({ type: 'TEXT', characters: 'Label' }), no: node({ type: 'TEXT', characters: '' }), noWhy: 'a TEXT node with empty content is #510/#796\'s blank node, not a sized one' },
  instance: { yes: node({ type: 'NESTED_INSTANCE', nestTarget: 'FocusRing' }), no: node({ type: 'FRAME' }), noWhy: 'a plain FRAME inherits no component\'s extent' },
  absoluteInset: { yes: node({ absoluteInset: 'focus/ring/offset' }), no: node({}), noWhy: 'no inset means nothing resizes it to its parent' },
  glyphViewBox: { yes: node({ type: 'GLYPH', glyphSvg: '<svg viewBox="0 0 24 24">…</svg>', glyphViewBox: [24, 24] }), no: node({ type: 'GLYPH', glyphSvg: '<svg viewBox="0 0 24 24">…</svg>', glyphViewBox: [0, 0] }), noWhy: 'a 0x0 artboard is an extent in name only — the importer falls back to sizing the frame to its ink, so the member\'s box becomes whatever the glyph happens to draw. The near-miss carries a glyphSvg on purpose: a predicate reading the DOCUMENT rather than the declared box would count this' },
};

for (const s of SIZE_SOURCES) {
  const c = PREDICATE_CASES[s.id];
  if (!c) {
    failuresPre.push(`SIZE_SOURCES entry '${s.id}' has no case in PREDICATE_CASES — an extent mechanism nothing distinguishes is a claim this gate cannot support. Add one node that must count and one near-miss that must not.`);
    continue;
  }
  if (!s.has(c.yes)) failuresPre.push(`SIZE_SOURCES '${s.id}' does NOT recognize its own positive case — the mechanism is unreachable, so every def relying on it alone fails arm A spuriously.`);
  if (s.has(c.no)) failuresPre.push(`SIZE_SOURCES '${s.id}' counts its NEGATIVE case as sized — ${c.noWhy}. A predicate that is true too widely lets a geometry-free root pass arm A, which is #869.`);
}
for (const id of Object.keys(PREDICATE_CASES))
  if (!SIZE_SOURCES.some((s) => s.id === id))
    failuresPre.push(`PREDICATE_CASES has cases for '${id}', which is not a SIZE_SOURCES mechanism — a stale case reads as coverage of a rule that is no longer applied.`);

/**
 * WHICH DEFS PROJECT TODAY — the scope floor (`docs/34`: a gate with a scope asserts each promised
 * surface is REPRESENTED, never merely counts). Both arms below range over defs that project, so if
 * `figmaAnatomySet` started throwing for all of them this file would report clean over nothing.
 *
 * A def legitimately gaining a projection is a one-line addition here in the same PR; a def LOSING one
 * fails, which is the direction that matters. Deliberately not derived by asking which defs project —
 * that is the very thing it exists to remember.
 */
const MUST_PROJECT = ['icon', 'focus-ring', 'button', 'icon-button', 'field-label', 'field-message', 'checkbox', 'radio', 'switch'];

/** Whether the def declares the floor. Read here, ONCE, off the def — the EXPECTED half. */
const declares = (def: ComponentDef): string | undefined => def.figmaProperties?.notStandalone;

/**
 * THE TWO ARMS AS PREDICATES, TRUTH-TABLED — and this table exists because of #1280, which is arm B
 * working as designed and taking arm B's only input away with it.
 *
 * `focus-ring` was the one def in the corpus that ever declared the floor. #1280 gave its root a nominal
 * square side, arm B fired on the stale refusal exactly as this file's header predicted it would, and the
 * declaration went. So as of that change **NO def declares `notStandalone` and every projecting def has
 * an extent** — which means arm A ranges over defs that all pass it and arm B over an empty set. Both
 * arms still run, and neither can any longer be reached by anything committed.
 *
 * That is the same defect this file already refuses to commit one level down. `PREDICATE_CASES` exists
 * because collapsing `layoutMode+children` to a bare `layoutMode` changed NOTHING over six defs, and the
 * header's conclusion was that **a mutation that changes nothing is indistinguishable from a blind spot**.
 * Deleting either arm's body today changes nothing over eleven. `docs/34` calls this the vacuous-floor
 * shape, and the cheapest honest answer is the one already in this file: state the classification the arms
 * implement, and check the arms against it before the walk.
 *
 * Four combinations of (does the root acquire an extent, does the def declare the floor), each with the
 * arm that must fire. EXPECTED is `fires`, authored in the words of what the case IS; ACTUAL is the
 * predicate. `sized`/`declared` are booleans rather than the plans and strings the walk holds, because
 * the arms only ever ask those two questions of them — passing richer inputs would make this table
 * re-derive the walk instead of checking the arms.
 */
const armA = (sized: boolean, declared: boolean): boolean => !sized && !declared;
const armB = (sized: boolean, declared: boolean): boolean => sized && declared;

const ARM_CASES: Array<{ sized: boolean; declared: boolean; fires: 'A' | 'B' | 'neither'; why: string }> = [
  { sized: false, declared: false, fires: 'A', why: '#869 itself: a geometry-free root offered as a build target, which pastes Figma\'s 100x100 default frame and reads as a success' },
  { sized: false, declared: true, fires: 'neither', why: 'the state `focus-ring` was in from #869 to #1280 — a def that cannot be built alone and says so, which is the whole point of the field' },
  { sized: true, declared: true, fires: 'B', why: 'a STALE refusal: the def gained an extent and kept the declaration, so the picker withholds a buildable def and shows a designer a reason that is no longer true. This is the case #1280 hit, and no committed def is in it any more' },
  { sized: true, declared: false, fires: 'neither', why: 'every projecting def today, `focus-ring` included since #1280 — buildable, and not claiming otherwise' },
];

for (const c of ARM_CASES) {
  const fired = [...(armA(c.sized, c.declared) ? ['A'] : []), ...(armB(c.sized, c.declared) ? ['B'] : [])];
  const expected = c.fires === 'neither' ? [] : [c.fires];
  if (fired.join(',') !== expected.join(','))
    failuresPre.push(`ARM_CASES {sized:${c.sized}, declared:${c.declared}} must fire [${expected.join(',') || 'nothing'}] and fires [${fired.join(',') || 'nothing'}] — ${c.why}. As of #1280 no committed def reaches arm B, so this table is the only thing exercising it: an arm broken here goes unnoticed by the corpus walk below.`);
}
if (!ARM_CASES.some((c) => c.fires === 'A') || !ARM_CASES.some((c) => c.fires === 'B'))
  failuresPre.push('ARM_CASES covers neither arm A nor arm B — a table that asserts only the passing combinations restates that the gate is quiet, which is what it is here to stop being enough.');

const failures: string[] = [...failuresPre];
const notes: string[] = [];
const projected: string[] = [];
let declaringCount = 0;

for (const def of componentDefs) {
  let plans;
  try {
    plans = figmaAnatomySet(def, { swapTarget: 'FPO-default-icon' });
  } catch (e) {
    // A def that cannot project has no standalone build to be wrong about — `figmaAnatomySet` throws
    // where `anatomy` or `figmaProperties` is absent, and both surfaces already treat that as
    // not-offered. It is NOT an error here, and it is also not a licence to declare the floor: a def
    // that cannot project cannot be measured, so a `notStandalone` on one is unverifiable prose.
    if (declares(def))
      failures.push(`${def.id}: declares figmaProperties.notStandalone and does not project at all (${(e as Error).message.split('—')[0].trim()}) — nothing can verify the claim, and no surface needs it, since a def that cannot project is already not offered. Remove it, or give the def a projection.`);
    continue;
  }
  projected.push(def.id);

  // ---- ACTUAL, measured from the plan and nothing else -------------------------------------------
  const root = plans[0].root;
  const found = SIZE_SOURCES.filter((s) => s.has(root));
  const expected = declares(def);
  // Through the SAME predicates `ARM_CASES` checks, so the truth table is a claim about the code that
  // runs rather than about a copy of it. Written out here as `found.length === 0 && !expected` and
  // `found.length > 0 && expected`, the table above would be asserting a second spelling of the rule and
  // could pass while these two drifted — `docs/34`'s x === x, at the one place this file cannot afford it.
  const sized = found.length > 0;
  const declared = Boolean(expected);
  if (declared) declaringCount++;

  // ---- arm A: a geometry-free root must be declared ----------------------------------------------
  if (armA(sized, declared)) {
    failures.push(
      `${def.id}: projects ${plans.length} member(s) whose root '${root.name}' acquires NO extent — none of [${SIZE_SOURCES.map((s) => s.id).join(', ')}]. `
      + `Built standalone this is Figma's 100×100 default frame${root.paints?.strokes ? ` with '${root.paints.strokes}' stroked around it${root.bound?.strokeWeight ? ` at '${root.bound.strokeWeight}'` : ` at the executors' 1px fallback`}` : ''}, which reads as a successful build (#869). `
      + `Either give the root an extent, or declare figmaProperties.notStandalone: '${def.id}: <why a standalone build is meaningless, and what to build instead>'.`,
    );
  }

  // ---- arm B: a declared def must actually be geometry-free --------------------------------------
  // The converse, and the half that keeps the declaration from becoming a permanent exemption.
  if (armB(sized, declared)) {
    failures.push(
      `${def.id}: declares figmaProperties.notStandalone, and its root '${root.name}' DOES acquire an extent — ${found.map((s) => `${s.id} (${s.why})`).join('; ')}. `
      + `The refusal is stale: the picker withholds a def that can now be built, and shows a designer a reason that is no longer true. Remove the declaration. `
      + `Declared reason was: "${expected}"`,
    );
  }

  notes.push(`${def.id}: ${plans.length} member(s), root '${root.name}' — ${found.length ? found.map((s) => s.id).join(' + ') : 'NO EXTENT'}${expected ? ' [notStandalone declared]' : ''}`);
}

// ---- arm C: the scope floor --------------------------------------------------------------------
for (const id of MUST_PROJECT)
  if (!projected.includes(id))
    failures.push(`SCOPE NOT REPRESENTED: '${id}' projects today and this run measured no plan for it. Both arms above range over defs that project, so a clean run with '${id}' absent means less than it reads. If the def was legitimately removed or lost its projection, drop it from MUST_PROJECT in this file in the same PR.`);

console.log(`Standalone floor — ${projected.length} projecting def(s) of ${componentDefs.length}, ${SIZE_SOURCES.length} extent mechanism(s) each checked against a positive and a near-miss case: ${projected.join(', ')}`);
for (const n of notes) console.log(`    ${n}`);
// SAID OUT LOUD, because a reader counting failures cannot see it: with no def declaring the floor, arm B
// has nothing in the corpus to range over and `ARM_CASES` is the whole of what exercises it. Printed as a
// number rather than left to be inferred from the absence of `[notStandalone declared]` above.
console.log(`    arm B reach: ${declaringCount} def(s) declare notStandalone${declaringCount === 0 ? ' — so the corpus walk cannot reach arm B at all, and ARM_CASES above is the only thing that does (#1280)' : ''}`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} standalone-floor failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(`\nA def offered as a build target must project members that acquire an EXTENT, and a def that`);
  console.error(`cannot must say so in figmaProperties.notStandalone. #869 built a valid, complete, error-free`);
  console.error(`plan that described nothing usable: 2 members, 0 binding errors, 0 misses — and a 100x100 white`);
  console.error(`box on the canvas. An artifact that looks like a successful build and is not will be read as one.`);
  process.exit(1);
}
console.log(`  ✓ every projecting def's root acquires an extent, or declares why it cannot be built alone —`);
console.log(`    in both directions, so a stale refusal fails as loudly as an undeclared half-build.`);
console.log(`    The limit, stated: this is the PLAN, not a Figma file. It claims some mechanism determines`);
console.log(`    the root's size, not that the size is the one a designer wanted, and not that the result is`);
console.log(`    visible (#802's Figma half stays open).`);
