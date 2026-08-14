/**
 * ABSOLUTE-INSET GATE (#801, the first instance of #802) — an absolutely-positioned part carrying an
 * `inset` must resolve, in every brand that emits, to an offset that puts it OUTSIDE its parent.
 *
 *   npx tsx packages/engine/lint-ring-geometry.ts
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
 * So the resolution worked and the silence was not silent. What was missing is the third thing:
 * **nothing anywhere asserted the resolved NUMBER was not zero.** An offset of 0 is not an error at
 * any layer it passes through. It is a valid FLOAT, it binds nothing (Figma's `x`/`y` take no
 * variable, which is why this value travels as a NAME and is frozen to a literal at paste), it
 * writes without throwing, and it produces a structurally perfect component: correct
 * `layoutPositioning`, correct constraints, correct paints, 0 misses. It is #802's profile exactly —
 * a value a human can see, that no gate compares against what it ought to be — and that is why the
 * answer is a gate rather than an edit.
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
 * That is fixed at its site in this PR — the part is now told apart by the PLAN's `absoluteInset`,
 * and the offset asserted against the variable the stub resolved. This file exists because that fix
 * is one suite, over one stub, at one offset, in one workspace.
 *
 * ── WHAT THIS FILE UNIQUELY CLAIMS, AND WHAT IT DELIBERATELY DOES NOT ───────────────────────────
 *
 * Be precise about the division of labour, because a gate that restates a claim another gate already
 * makes is the kind of coverage that reads as thoroughness and adds nothing:
 *
 *   · The EXECUTORS' ARITHMETIC (`x = -off`, `w = parent + 2*off`) is covered elsewhere, in two
 *     places, and this file does not re-derive it. `test.ts` drives the emitted payload's absolutes
 *     loop against a stub and asserts the resulting box against the stub's OWN inset — verified to
 *     fail by name at offset 0 (`anatomy/ring: the ring sits 2px OUTSIDE its target …`), which is the
 *     negative control that located #801's gap in the first place. `test.ts`'s parity gate holds the
 *     plugin executor's loop to the payload's. So: two independent statements of the formula already
 *     disagree when either moves.
 *   · The VALUE is what nothing checked. `varOf` proves the def BINDS a key; `planBindingErrors`
 *     proves bound names resolve; `readVarsOwn` exists precisely because this name is READ and never
 *     bound, so no binding gate covers it. Nothing anywhere read the NUMBER on the far end and asked
 *     whether it was one a ring can be seen at. That is this file's job, per brand, from the def's
 *     own declaration through to the committed artifact.
 *
 * ── INDEPENDENCE (`docs/34` shape 1) ────────────────────────────────────────────────────────────
 *
 * EXPECTED comes from the **def**: the part declares `inset: '<binding key>'`, `def.tokens` maps that
 * key to a token ref, and the naming convention makes a Figma name of it. ACTUAL comes from the
 * **plan** (`figmaAnatomyPlan`'s `absoluteInset`) and from the **committed emitted export** (the
 * FLOAT that name resolves to in `out/figma/<brand>/`). Two walks, neither reading the other.
 *
 * Three shortcuts that would each make this file unable to fail — the third already shipped once:
 *
 *   1. Calling `varOf` for the name. That is the projector's own helper, so EXPECTED and ACTUAL
 *      become one derivation and agree in every case, including a wrong one. `figmaVarName` is
 *      restated here as a one-liner for the same reason.
 *   2. Resolving the offset from a live `Theme` instead of from `out/figma/`. The emitted export is
 *      what a designer's file is built from and what the executor's `byName` map is built over at
 *      paste time; a `Theme` resolved in memory is the projector's input, not the artifact.
 *   3. Reading the offset back off the built node. That is the plugin suite's defect above.
 *
 * ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────────────
 *
 *   A. NAME AGREEMENT — the `absoluteInset` the plan carries is the name the def's own inset key
 *      resolves to, and every plan carrying one has a PARENT (an inset is measured from something).
 *   B. THE NAME RESOLVES, per brand, to a FLOAT in that brand's committed export. Not the claim any
 *      binding gate makes: this name is read, never bound.
 *   C. THE VALUE PUTS THE PART OUTSIDE — `off > 0`, stated as the four-sided geometry it implies so a
 *      failure prints coordinates rather than a bare number. Zero is #801; negative is worse than
 *      flush and equally silent. A legitimately-zero offset must be admitted in `ZERO_OK` below,
 *      which is the friction, not an oversight — see that constant.
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

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { componentDefs } from './components/index';
import { figmaAnatomyPlan, type AnatomyPlan, type FigmaNodePlan } from './anatomy-figma';
import type { ComponentDef } from './component-schema';

const OUT_FIGMA = join(import.meta.dirname, 'out', 'figma');

/**
 * OFFSETS THAT ARE LEGITIMATELY ZERO, keyed `<def>.<part>` → the reason, which must say what supplies
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
const MUST_COVER = ['button.focusRing', 'icon-button.focusRing'];

/** The naming convention, restated rather than imported from the projector — shortcut 1 above. */
const nameOf = (ref: string): string => ref.replace(/\./g, '/');

/** Brands DISCOVERED from the emitted tree, not listed, so a new brand is covered the day it emits.
 *  Asserted non-empty below: a scan that finds nothing must fail, not report clean. */
const brands = (): string[] =>
  existsSync(OUT_FIGMA)
    ? readdirSync(OUT_FIGMA, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];

/** Every FLOAT a brand's committed Figma export defines, name → value. */
const floatVars = (brand: string): Map<string, number> => {
  const byName = new Map<string, number>();
  for (const f of readdirSync(join(OUT_FIGMA, brand)).filter((n) => n.endsWith('.json'))) {
    const doc = JSON.parse(readFileSync(join(OUT_FIGMA, brand, f), 'utf8')) as {
      variables?: Array<{ name: string; resolvedType?: string; value?: unknown }>;
    };
    for (const v of doc.variables ?? [])
      if (v.resolvedType === 'FLOAT' && typeof v.value === 'number') byName.set(v.name, v.value);
  }
  return byName;
};

/** Every node in a plan, WITH its parent — the parent is half of what an inset means, so a walk
 *  returning only the node could not state the claim. */
type Sited = { node: FigmaNodePlan; parent: FigmaNodePlan | null };
const sited = (n: FigmaNodePlan, parent: FigmaNodePlan | null = null): Sited[] =>
  [{ node: n, parent }, ...n.children.flatMap((c) => sited(c, n))];

/** What the DEF declares, read from the def — the half of D that is independent of whether the
 *  projector emitted anything at all. `when` is carried because it is the state the inset is
 *  supposed to appear at, and at no other. */
type Declared = { part: string; insetKey: string; when?: string };
const declaredInsets = (def: ComponentDef): Declared[] =>
  Object.entries(def.anatomy?.parts ?? {})
    .map(([part, p]) => ({ part, ...(p as { kind?: string; inset?: string; when?: string }) }))
    .filter((p): p is Declared & { kind: string } => p.kind === 'absolute' && typeof p.inset === 'string')
    .map(({ part, inset, when }) => ({ part, insetKey: inset as string, when }));

/** THE GEOMETRY THE OFFSET IMPLIES, restated so a failure prints coordinates a reader can check by
 *  eye. This is NOT a second check on the executors' formula — `test.ts` owns that comparison, and
 *  the header says why this file does not re-derive it. */
const box = (pw: number, ph: number, off: number) => ({ x: -off, y: -off, width: pw + off * 2, height: ph + off * 2 });

/** The parent's size is not on the plan — Figma measures it from the hug — so the claim is a RELATION
 *  against whatever the parent turns out to be. Two probe sizes, because a relation that holds at one
 *  parent size only is arithmetic that happens to work rather than a rule. */
const PROBE_PARENTS: Array<[number, number]> = [[88, 32], [140, 48]];

const failures: string[] = [];
const notes: string[] = [];
const covered = new Set<string>();
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
        const ref = def.tokens[d.insetKey.includes('{size}') ? d.insetKey.replace('{size}', size) : d.insetKey];
        if (!ref) {
          failures.push(`${at}: '${node.name}' declares inset key '${d.insetKey}' and def.tokens binds no such key — the plan carries '${node.absoluteInset}' from somewhere this gate cannot corroborate`);
          continue;
        }
        if (node.absoluteInset !== nameOf(ref))
          failures.push(`${at}: '${node.name}'.absoluteInset is '${node.absoluteInset}', and the def's own key '${d.insetKey}' → '${ref}' names '${nameOf(ref)}'`);

        for (const brand of bs) {
          // ---- B: the name resolves to a FLOAT in that brand's committed export ---------------
          const off = vars.get(brand)!.get(node.absoluteInset);
          if (off === undefined) {
            failures.push(`${at}: '${node.name}'.absoluteInset → '${node.absoluteInset}' is not a FLOAT in brand '${brand}' — at paste the executor reports a miss and the part is left at its parent's bounds`);
            continue;
          }
          // ---- C: the value puts the part outside ---------------------------------------------
          const key = `${def.id}.${node.name}`;
          if (off === 0 && key in ZERO_OK) {
            notes.push(`${key} @ ${brand}: offset 0, admitted — ${ZERO_OK[key]}`);
            valueChecks++;
            continue;
          }
          if (!(off > 0)) {
            failures.push(
              `${at}: '${node.name}'.absoluteInset → '${node.absoluteInset}' = ${off} in brand '${brand}'. ` +
                `An offset of ${off} builds the part ${off === 0 ? 'FLUSH AGAINST' : 'INSIDE'} its parent, which is #801: it resolves, it writes, it reports no miss, ` +
                `and a focus ring flush with the border it must be distinguishable from fails WCAG 2.4.11. ` +
                `If ${off} is intended here, add '${key}' to ZERO_OK in this file with the reason.`,
            );
            continue;
          }
          for (const [pw, ph] of PROBE_PARENTS) {
            const b = box(pw, ph, off);
            const bad = [
              b.x < 0 ? null : `x=${b.x} is not left of the parent's edge`,
              b.y < 0 ? null : `y=${b.y} is not above the parent's edge`,
              b.width > pw ? null : `width=${b.width} does not exceed the parent's ${pw}`,
              b.height > ph ? null : `height=${b.height} does not exceed the parent's ${ph}`,
            ].filter(Boolean);
            if (bad.length)
              failures.push(`${at}: '${node.name}' at offset ${off} (brand '${brand}') is NOT outside its ${pw}×${ph} parent — ${bad.join('; ')}`);
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
  notes.push(`${def.id}: ${declared.length} declared inset part(s) — ${declared.map((d) => `${d.part} (${d.insetKey}${d.when ? ` @ ${d.when}` : ''})`).join(', ')}`);
}

for (const m of MUST_COVER)
  if (!covered.has(m))
    failures.push(`SCOPE NOT REPRESENTED: '${m}' is a known absolute inset part and this run checked no plan carrying it. If it was legitimately removed, drop it from MUST_COVER in this file in the same PR; otherwise a clean run here means nothing.`);

console.log(`Absolute-inset geometry — ${coords} projected coordinate(s), ${valueChecks} (part × brand) value check(s) over ${bs.length} brand(s): ${bs.join(', ') || 'NONE'}`);
for (const n of notes) console.log(`    ${n}`);
if (failures.length) {
  console.error(`\n❌ ${failures.length} absolute-inset failure(s):`);
  for (const f of failures) console.error(`  · ${f}`);
  console.error(`\nAn absolutely-positioned part carrying an inset must land OUTSIDE its parent. #801 shipped the`);
  console.error(`flush case: it resolved, it wrote, it reported 0 misses, and the ring failed the one requirement`);
  console.error(`it exists to satisfy.`);
  process.exit(1);
}
console.log(`  ✓ every declared inset part resolves to an offset that lands it outside its parent, in all ${bs.length} brand(s).`);
console.log(`    The limit, stated: this is the plan and the committed export, not a Figma file. A host that`);
console.log(`    accepts a write and discards it is caught by the executors' own read-backs (#802 stays open).`);
