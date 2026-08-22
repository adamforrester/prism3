/**
 * PAINT GATE (#758, #784) — three independent checks over the component tier's colour bindings.
 *
 *   npx tsx packages/engine/lint-paint.ts            # check
 *   npx tsx packages/engine/lint-paint.ts --accept    # rewrite the census baseline
 *
 * ── WHY THIS EXISTS AT ALL: THE MEASUREMENT THAT FORCED IT ──────────────────────────────────────
 *
 * #758's stated acceptance was *"Button's 648-member paint is byte-identical afterwards: `regen.ts
 * --check` reports 104 artifacts in sync."* That criterion cannot fail, and it was measured rather
 * than reasoned about. `figmaAnatomySet` is called by NO emitter and no component payload is
 * committed under `out/`, so component paint is outside regen's universe entirely. Two mutations,
 * both run before this file was written:
 *
 *   · Button's box fill deleted outright         → `regen --check` ✓ 104 in sync
 *   · `paintOf`'s state-qualified lookup dropped → `regen --check` ✓ 104 in sync
 *     (1926 paint assignments fell to 1782 — a quarter of the state grid silently painting its
 *      rest colour — and the committed artifacts still byte-matched)
 *
 * The sharpest one is the third, because it is the mutation a careless rebind actually looks like:
 *
 *   · `destructive.outline.icon` repointed to `color.interactive.neutral.text.rest` — a token that
 *     RESOLVES, so nothing reports a miss → `regen --check` ✓ 104, and `test.ts` 2192 passed / 0
 *     failed. A destructive button's icon paints neutral ink and the whole suite is green.
 *
 * So the gate #758 asked for had to be built, not cited. Two arms, because the three mutations
 * above are two different defect classes and one arm cannot catch both.
 *
 * ── ARM 1: THE PROVENANCE RULE (a rule, asserted at zero) ───────────────────────────────────────
 *
 * A paint key led by an axis VALUE must point at a token ref containing that value:
 * `destructive.outline.icon` → `color.interactive.destructive.text.rest` ✓;
 * → `color.interactive.neutral.text.rest` ✗.
 *
 * It holds 90/90 across the corpus's intent-led paint, which is what makes it a rule rather than a
 * snapshot: it is a property of how semantic colour is organized (an intent's paint comes from that
 * intent's family), so it fails the day a rebind crosses an intent boundary — including for a def
 * that does not exist yet.
 *
 * INDEPENDENCE (`docs/34`). EXPECTED comes from the KEY — the axis value the def declares in
 * `variants` and spells into the key. ACTUAL comes from the REF — the token path. Neither is derived
 * from the other; they are two authored halves of one line that a correct binding keeps in agreement.
 * This is deliberately NOT built from `paintOf`'s lookup: a check that asked the projector to resolve
 * the key and compared the answer to itself would agree in every case, including the mutated one.
 *
 * THE EXCEPTIONS ARE NAMED AND REASONED, not a tolerance. `field-message` maps four tone values onto
 * semantic roles whose names differ from the tone (`default` → `secondary`, `error` → `danger`), and
 * that is correct: its axis values are validation states, and the ink roles they land on are the
 * token tier's own vocabulary. A count-based allowance ("up to 4 violations") would let a real
 * regression hide inside the budget, so each exception is listed by key and its absence is a failure
 * too — a mapping that gets fixed at the def must be removed from here, or the list becomes a
 * memory of something that is no longer true.
 *
 * THERE ARE TWO EXEMPTION MECHANISMS, at two scopes, and the second exists because the premise can
 * fail for a whole AXIS rather than for a handful of keys (#910). `PROVENANCE_EXCEPTIONS` is per-key;
 * `NON_FAMILY_AXES` is per-axis, for an axis whose values name no token family and must not grow one
 * — `selection` is the first, since the tier emits no `color.checked.*` and a checked control is the
 * same interactive family in a different ROLE rather than a family of its own. Both are checked in
 * both directions. **The reason they are declarations rather than a narrower scan is the whole
 * design**, written out at `NON_FAMILY_AXES`: `checkbox` first shipped its keys SLOT-led
 * (`fill.checked`, not `checked.fill`), which has the identical net effect — arm 1 skips a key whose
 * lead is not an axis value — and was rejected in review against this repo's own rule that *a false
 * positive is fixed by adding to the exemption list, never by narrowing a scan*. What separates them
 * is not what arm 1 checks (nothing, either way) but what a reader can SEE: an exempt axis is named,
 * counted and printed on every run, while a slot-led def is silently uncovered.
 *
 * ARM 1 THEREFORE PRINTS WHAT IT DOES **NOT** REACH, every run, per axis, with the binding count —
 * `docs/34` shape 9. A number that drops without a deletion in the diff is the tell.
 *
 * ── ARM 2: THE CENSUS (a characterization, pinned to an authored baseline) ───────────────────────
 *
 * Arm 1 is blind to a uniform loss: dropping the state-qualified lookup does not cross an intent
 * boundary, so every surviving key still satisfies provenance — 1782 assignments, all of them
 * "correct", a quarter of the grid wrong. So the census pins the SHAPE: how many coordinates, how
 * many paint assignments, and a hash over every (coordinate, node path, slot, variable) row sorted.
 *
 * IT IS TAKEN OVER THE FULL DECLARED GRID, NOT OVER `figmaAnatomySet`, and that is the one design
 * choice here worth arguing with. The obvious census is "project the Figma set and hash it" — and it
 * is measurably the wrong one:
 *
 *   figmaAnatomySet(icon) → 4 members, 0 paint assignments
 *   the full declared grid → 36 coordinates, 32 paint assignments
 *
 * because `icon.figmaProperties.variantAxes` is `['size']` and its paint axis is `tone`. A set-based
 * census would therefore have pinned `icon: 0` — a number no mutation to `tone.{tone}` can move,
 * recorded in a file that reads as coverage. That is this repo's most-repeated defect in its purest
 * form: a gate whose subject cannot reach the thing it claims to watch. So the grid is enumerated
 * from `variants` and `states` directly — every coordinate the def SAYS exists, whether or not the
 * Figma projection happens to enumerate it.
 *
 * That the enumeration duplicates something `figmaAnatomySet` also does is deliberate and must not
 * be DRY'd away: **the second walk IS the gate.** Calling `figmaAnatomySet` here would make the
 * expected set of coordinates a function of the projector's own opinion about which axes matter, so
 * an axis dropped from `variantAxes` would shrink both sides at once and report a pass.
 *
 * Both numbers are recorded per def — `set` (what the plugin will actually build, so #758's
 * byte-identity constraint stays legible: button 648 members / 1926 assignments) and `grid` (every
 * declared coordinate, which is what exercises `paintOf` completely).
 *
 * `schema/paint-census.json` IS AUTHORED AND DELIBERATELY NOT A `regen.ts` ARTIFACT, for exactly the
 * reason `token-contract.json` and `payload-manifest.json` are not (CLAUDE.md principle 5): regen
 * rewrites every generated artifact, so a regenerated census would rewrite itself to agree with a
 * regression and report that as a pass. **A gate allowed to rewrite what it reads has no memory.**
 * `--accept` is therefore a separate, deliberate act, and it prints the diff it is about to accept so
 * the act is informed rather than reflexive.
 *
 * WHAT THE CENSUS IS NOT. It is a characterization, not a rule — it says "this is what the projector
 * produced when a human looked", never "this is right". A deliberate paint change SHOULD fail it, and
 * the response is to read the diff and `--accept`. That is the same posture as the consumability
 * gate's pinned memories, and the reason arm 1 exists beside it: a rule can say "wrong", and a
 * characterization can only say "different".
 *
 * ── ARM 3: REACHABILITY (a rule, asserted at zero — #784) ───────────────────────────────────────
 *
 * Every colour binding a def declares must be RETURNED BY THE PROJECTOR at some coordinate. Neither
 * arm above asks that. A binding whose key is spelled in a word `paintOf` never dispatches is
 * authored, resolves to a real token, satisfies provenance, and paints nothing — so arm 1 passes it
 * and the census cannot see it, because a row that was never produced leaves no row to compare.
 *
 * That is not hypothetical: it was HALF THE CORPUS. #758 moved the paint grammar into the def and
 * moved the slot segment with it, which was never the def's to spell (the slot is the argument
 * `paintOf` is CALLED with). Measured before #784 fixed it:
 *
 *   field-label     0 of 3 colour bindings reachable    (`text`, `indicator`, `disabled.text`)
 *   focus-ring      0 of 2                              (`stroke`, `stroke.inverse`)
 *   field-message   4 of 8                              (every tone painted its glyph, none its caption)
 *   text-field      6 of 12                             (`text`, `placeholder`, `border.focus`, …)
 *
 * `component-schema.ts`'s `paintKeyErrors` is the FIRST oracle for this — it checks each key's
 * placeholder segments against what the projector can supply (`PAINT_SLOTS` / `def.states` /
 * `def.variants[axis]`). This arm is the SECOND, and it exists because the first one missed four
 * bindings: it reads keys, so it cannot see a key the `disabled` branch builds by hand rather than
 * from a template. `disabled.on-fill` was bound on `button` and `text-field`, gated per mode, and
 * reached at no coordinate — a disabled FILLED button painted page ink on a fill at 2.13–2.55:1
 * against a 3.06–3.08:1 contract. Only this arm could have found it.
 *
 * INDEPENDENCE (`docs/34`). The subject is the def's `tokens`. ACTUAL is read out of the EMITTED
 * PLANS — walk every node of every coordinate and collect the variables actually assigned — so the
 * two arms disagree by construction: one reads the key, the other reads the pixel. Deriving this by
 * asking `paintOf` to resolve each key would reproduce any bug in `paintOf` on both sides and report
 * it as a pass. Note that this makes arm 3 the one arm whose oracle IS the projector, which is
 * correct *here* precisely because the subject is not: "did the projector ever return this binding"
 * is a question only the projector can answer, and the binding list it is checked against is
 * authored by hand in the def.
 *
 * EVERY KEY GETS A UNIQUE SENTINEL REF, AND THE FIRST VERSION DID NOT — a hole found by mutating this
 * arm rather than by reading it. Matching a key by whether its REF appears among the assigned
 * variables is wrong wherever two keys share a ref, because the reachable one vouches for the
 * unreachable one. That is not an edge case in this corpus: `button` binds 13 refs from more than one
 * key (`primary.filled.label` and `primary.filled.icon` are both `color.interactive.primary.on-fill`;
 * all four of `primary.{outline,text}.{label,icon}` are one ink role), `icon-button` 9, `text-field` 1.
 * Reintroducing #784's exact defect — rekeying `disabled.label.on-fill` back to the unreachable
 * `disabled.on-fill` — left a ref-matching arm 3 GREEN, because `disabled.icon.on-fill` points at the
 * same token and still reached. Only the census caught it, and a characterization cannot say *which*
 * binding died.
 *
 * So the def is planned with **every colour ref replaced by a per-key sentinel** (`color.probe-<n>`),
 * one enumeration per def, and each sentinel that comes back names exactly one key. The substitution
 * cannot change what the projector decides: `paintOf` chooses a KEY (from the templates, `PAINT_SLOTS`
 * and `restKey` — all of which read key presence, never ref content) and only then converts the ref it
 * found to a variable name.
 *
 * ITS LIMIT, STATED SO NOBODY READS MORE COVERAGE INTO IT THAN IT HAS. A def with no `anatomy` cannot
 * be planned at all, and `figmaAnatomyPlan` requires a `size` axis — so three defs (`field-label`,
 * `field-message`, `text-field`) and `focus-ring` are UNCOVERED and reported as such rather than
 * counted as passing. `UNREACHED_EXPLAINED` names the individual bindings that are legitimately
 * unreached, each with a reason, checked in both directions like arm 1's exceptions: an entry that
 * becomes reachable, or names a binding that no longer exists, is a stale memory and fails.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { componentDefs } from './components/index';
import { figmaAnatomySet, figmaAnatomyPlan, planComponentName, type FigmaNodePlan } from './anatomy-figma';
import type { ComponentDef } from './component-schema';

const repo = join(import.meta.dirname, '../..');
const CENSUS_PATH = join(repo, 'packages/engine/schema/paint-census.json');

/**
 * Paint keys whose ref legitimately does NOT carry the axis value, each with the reason.
 *
 * Listed by exact key so the list cannot absorb a real regression, and checked in BOTH directions —
 * an entry here that no longer violates provenance fails too, because a stale exemption is a comment
 * asserting something untrue about the def it names.
 */
const PROVENANCE_EXCEPTIONS: Record<string, string> = {
  'field-message|default.label':
    "tone `default` maps to the MUTED body role, not to a role named 'default' — the token tier has no `text.default`, and `secondary` is what a non-status message's ink is",
  'field-message|default.icon':
    'same mapping as `default.label`, for the glyph beside it',
  'field-message|error.label':
    "tone `error` maps to the `danger` ink role — the def's axis value is the validation state a consumer names, `danger` is the token tier's name for that colour; the two vocabularies are deliberately not merged",
  'field-message|error.icon':
    'same mapping as `error.label`, for the status glyph',
};

/**
 * AXES WHOSE VALUES NAME NO TOKEN FAMILY AT ALL, each with the reason (#910).
 *
 * The second exemption mechanism, and it exists because arm 1's premise can fail for a whole AXIS
 * rather than for a handful of keys. The premise is *"an intent's paint comes from that intent's
 * family"* — `destructive.*` keys point into `color.interactive.destructive.*`. That is a real
 * property of how semantic colour is organized, and it is what makes arm 1 a rule.
 *
 * **`selection` has no such family and must not grow one.** The tier emits no `color.checked.*`, and
 * a checked control is not a different colour family from an unchecked one — it is the same
 * interactive family in a different ROLE. A checked checkbox paints from
 * `color.interactive.primary.*` and an unchecked one from `color.field.*`, which are the tier's own
 * names for "a filled control" and "an empty field". Neither carries the word `checked`, and neither
 * should.
 *
 * ── WHY THIS IS AN EXEMPTION AND NOT A GRAMMAR CHANGE, WHICH IS THE WHOLE POINT (#910) ──────────
 *
 * `checkbox` first shipped its paint keys SLOT-LED (`fill.checked` rather than `checked.fill`), which
 * has the same net effect — arm 1 skips a key whose leading segment is not an axis value, so it never
 * examined a single selection binding. It was rejected in review, correctly, against this repo's own
 * house rule:
 *
 *     **A false positive is fixed by adding to the exemption list, never by narrowing a scan.**
 *
 * Reordering a key so the pattern stops matching *is* narrowing the scan — achieved by shape rather
 * than by declaration, and therefore invisible. The difference between the two is not what arm 1
 * checks (nothing, either way) but what the repo can SEE: a slot-led def is silently uncovered, while
 * an entry here is a named axis with a reason, printed on every run and checked in both directions. A
 * gate that does not cover an axis is acceptable; a gate that does not SAY which axis it does not
 * cover is `docs/34` shape 9.
 *
 * ── BOTH DIRECTIONS, and the second one is the one that does the work ───────────────────────────
 *
 *   NOT-DECLARED — the axis is in no def's `variants`. Then this is a memory of an axis that does not
 *   exist, the same stale claim a per-key entry naming a deleted key would be.
 *
 *   NOT-EXERCISED — the axis exists and NO key led by one of its values would have violated
 *   provenance. Then the exemption is doing no work: either a backing family appeared (in which case
 *   arm 1 should cover it and this entry is now a hole) or nothing is keyed on the axis at all. Its
 *   removal is free, so keeping it only misinforms the next reader about what the rule reaches.
 *
 * This is deliberately NOT a licence to add an axis here whenever arm 1 is inconvenient. The bar is
 * what the paragraph above states as a fact about the TOKEN TIER, checkable by anyone: there is no
 * family named for this axis's values, and there should not be. An axis whose values *could* have a
 * family and simply do not yet is a token-tier gap, not an exemption.
 *
 * ── WHAT IT COSTS, MEASURED RATHER THAN ASSERTED, BECAUSE AN EXEMPTION IS A REAL HOLE ───────────
 *
 * Mutation, run when this was added: repointing `checkbox`'s `checked.icon` from
 * `color.interactive.primary.on-fill` to `color.interactive.destructive.on-fill` — a token that
 * RESOLVES, so a checked checkbox paints destructive ink — leaves this gate **fully green**. Arm 1
 * skips it as exempt; arm 2 and arm 3 BOTH decline it for the identical reason — `checkbox` has no
 * `anatomy`, and `reachability()` refuses a def with no `anatomy` exactly as `censusable()` does, so
 * neither is censusable nor reachability-checked. **Nothing in the repo catches an intent-boundary
 * crossing on an exempt axis.**
 *
 * That is the same hole the slot-led spelling had — this entry does not create it, it NAMES it — and
 * it is the honest reason the printed line says NOT CHECKED rather than "exempted". Whether a weaker
 * invariant is available for a non-family axis (every value of one axis resolving into a consistent
 * family, say) is a real question and is filed as #916 rather than guessed at here.
 */
const NON_FAMILY_AXES: Record<string, string> = {
  selection:
    "the tier emits no `color.checked.*` / `color.unchecked.*` and must not: a checked control is not a different colour FAMILY, it is the same interactive family in a different ROLE — `color.interactive.primary.*` for a filled control against `color.field.*` for an empty field. So arm 1's premise (an axis value's paint comes from that value's family) has nothing to be true of here. Admitted by #910 for `checkbox`, and inherited by every selection control after it.",
};

type Tally = { members: number; assignments: number; sha256: string };
type Census = {
  note: string;
  /** `set` = what `figmaAnatomySet` builds (null when the def does not project one); `grid` = every declared coordinate. */
  defs: Record<string, { set: Tally | null; grid: Tally }>;
};

/** Every (node path, paint slot, variable) row a plan's tree carries, prefixed by the member name. */
const paintRows = (n: FigmaNodePlan, path: string, member: string, out: string[]): void => {
  const p = `${path}/${n.name}`;
  if (n.paints?.fills) out.push(`${member}|${p}|fills=${n.paints.fills}`);
  if (n.paints?.strokes) out.push(`${member}|${p}|strokes=${n.paints.strokes}`);
  if (n.descendantFills) out.push(`${member}|${p}|descendantFills=${n.descendantFills}`);
  for (const c of n.children) paintRows(c, p, member, out);
};

const tally = (rows: string[], members: number): Tally => {
  rows.sort();
  return { members, assignments: rows.length, sha256: createHash('sha256').update(rows.join('\n')).digest('hex') };
};

/** What the plugin will actually build. `null` for a def with no `figmaProperties` — it projects no set. */
const setCensus = (def: ComponentDef): Tally | null => {
  if (!def.figmaProperties) return null;
  const set = figmaAnatomySet(def, { swapTarget: 'FPO-default-icon' });
  const rows: string[] = [];
  for (const plan of set) paintRows(plan.root, '', planComponentName(plan), rows);
  return tally(rows, set.length);
};

/**
 * Every coordinate the def DECLARES — the cross product of `variants` (size × each other axis) with
 * rest plus each non-rest state.
 *
 * Enumerated from the def rather than by calling `figmaAnatomySet`, deliberately: see the header.
 * `icon` paints only along `tone`, which the Figma set does not enumerate at all, so a set-only
 * census pins it at zero assignments and can never fail.
 */
const gridCensus = (def: ComponentDef): Tally => {
  // `[undefined]` FOR A SIZELESS DEF, not `[]` (#864). `[]` makes the loop body unreachable and the census
  // comes back `0 members / 0 assignments` — a number no mutation can move, in a file that reads as
  // coverage, which is precisely the defect the header's `set`-vs-`grid` paragraph is about. `undefined`
  // is how `figmaAnatomyPlan` is told "no size coordinate" (#795), and a def with no size axis is exactly
  // the caller that should say it.
  const sizes = (def.variants?.size ?? []).length ? def.variants!.size! : [undefined];
  const axes = Object.entries(def.variants ?? {}).filter(([a]) => a !== 'size');
  let combos: Record<string, string>[] = [{}];
  for (const [a, vs] of axes) combos = combos.flatMap((c) => vs.map((v) => ({ ...c, [a]: v })));
  const states: (string | undefined)[] = [undefined, ...(def.states ?? []).filter((s) => s !== 'rest')];
  const rows: string[] = [];
  let members = 0;
  for (const size of sizes) for (const c of combos) for (const st of states) {
    const plan = figmaAnatomyPlan(def, size, { ...c, ...(st ? { state: st } : {}), leading: true, trailing: true, swapTarget: 'FPO-default-icon' } as never);
    members++;
    const coord = `${size === undefined ? '' : `size=${size}`}${Object.entries(c).map(([k, v]) => `,${k}=${v}`).join('')},state=${st ?? 'rest'}`;
    paintRows(plan.root, '', coord, rows);
  }
  return tally(rows, members);
};

/**
 * The defs a census can be taken of at all: **the ones with an `anatomy` block**, which is what
 * `figmaAnatomyPlan` needs and the whole of what it needs. Everything outside is still covered by arm 1,
 * which reads `tokens` directly and needs no projection — but NOT by arms 2 and 3.
 *
 *   - `text-field`, `textarea` — no anatomy at all, so `figmaAnatomyPlan` cannot be called. Arc 2 step 5.
 *
 * THIS USED TO ALSO REQUIRE A `size` AXIS, AND THAT CLAUSE HAD GONE FALSE (#864). It was true when it was
 * written and its stated reason — *"`figmaAnatomyPlan` requires a declared `size` while
 * `planComponentName` always writes `size=`, so they project at NO coordinate"* — is exactly what #795
 * changed: a sizeless def projects, and `planComponentName` writes no `size=` for one. Measured when
 * `icon` moved its Figma grid from `size` to `name` and fell out of a scope it had been the motivating
 * member of: `focus-ring` and `field-message` project fine and had been excluded for years on a reason
 * that had stopped holding, so the clause was costing **18 colour bindings** across three defs
 * (icon 8, field-message 8, focus-ring 2) — every one of which arms 2 and 3 now reach, at 8/8, 8/8, 2/2.
 *
 * The generalizable part is not the arithmetic. **A scope predicate is a CLAIM, and a proxy for the claim
 * goes stale silently while the claim stays true.** `variants.size.length > 0` stood in for "can this be
 * projected"; when the projector changed, the proxy kept excluding defs and the gate kept reporting them
 * under `uncovered` with a reason that read like a fact. Nothing could catch it, because a shrinking scope
 * with a printed explanation is indistinguishable from a scope that is correctly small. The predicate is
 * now the claim itself — call the projector, and the defs it can plan are the defs in scope.
 *
 * `field-label` entered the census in #796 and is still the reason to state this precisely: an `anatomy`
 * block is necessary AND, as of this change, sufficient (docs/38 §2 — the necessity half is unchanged).
 */
const censusable = (): ComponentDef[] => componentDefs.filter((d) => !!d.anatomy);

/**
 * Arm 1. For every paint key whose LEADING segment is a declared axis value, the ref must contain
 * that value as a path segment.
 *
 * Segment-wise rather than substring, because a substring test is satisfied by an unrelated
 * coincidence — `color.interactive.primary-subtle.fill` contains `primary` without being that
 * intent's family. The #563 finding, in its smallest form.
 */
const provenanceFailures = (): { failures: { key: string; detail: string }[]; exempted: Map<string, number> } => {
  const out: { key: string; detail: string }[] = [];
  const satisfied = new Set<string>();
  // Which NON_FAMILY_AXES entries actually covered a binding that would otherwise have FAILED. An axis
  // whose keys all satisfy provenance anyway needs no exemption, so this is the counter the stale
  // direction below reads — not "is the axis declared", which a def can satisfy while binding nothing
  // on it.
  const exercised = new Map<string, number>();
  for (const def of componentDefs) {
    for (const [key, ref] of Object.entries(def.tokens ?? {})) {
      if (!ref.startsWith('color.')) continue;
      const lead = key.split('.')[0];
      const axis = Object.entries(def.variants ?? {}).find(([, vs]) => vs.includes(lead))?.[0];
      if (!axis) continue; // not axis-value-led — arm 1 says nothing about it
      const id = `${def.id}|${key}`;
      if (ref.split('.').includes(lead)) { satisfied.add(id); continue; }
      // The AXIS-level exemption is consulted after `satisfied`, deliberately: a key that does carry
      // its axis value is covered by the rule normally even on an exempt axis, so the exemption can
      // never take credit for a binding the rule already reached.
      if (axis in NON_FAMILY_AXES) { exercised.set(axis, (exercised.get(axis) ?? 0) + 1); continue; }
      if (id in PROVENANCE_EXCEPTIONS) continue;
      out.push({ key: id, detail: `${axis}='${lead}' is absent from '${ref}' — a ${lead} coordinate would paint another ${axis}'s colour` });
    }
  }
  // NON_FAMILY_AXES, both directions — the same discipline as the per-key list.
  for (const [axis, why] of Object.entries(NON_FAMILY_AXES)) {
    if (!componentDefs.some((d) => axis in (d.variants ?? {})))
      out.push({ key: `axis:${axis}`, detail: `exempted AXIS is declared by no def — remove the entry, it is a memory of an axis that does not exist (${why.slice(0, 50)}…)` });
    else if (!exercised.has(axis))
      out.push({
        key: `axis:${axis}`,
        detail:
          'exempted AXIS covers no binding that would otherwise violate provenance — the exemption does no work. '
          + 'Either a backing token family appeared (in which case arm 1 should cover this axis and the entry is now a HOLE), '
          + 'or nothing is keyed on it. Remove the entry.',
      });
  }
  // The other direction: an exemption for a key that now satisfies the rule (or no longer exists) is
  // a stale memory, and this gate's whole purpose is to not keep those.
  for (const id of Object.keys(PROVENANCE_EXCEPTIONS)) {
    const [defId, key] = id.split('|');
    const def = componentDefs.find((d) => d.id === defId);
    if (!def || !(key in (def.tokens ?? {})))
      out.push({ key: id, detail: 'exempted key does not exist — remove the exception, it asserts something untrue about this def' });
    else if (satisfied.has(id))
      out.push({ key: id, detail: 'exempted key now SATISFIES provenance — remove the exception so the rule covers it' });
  }
  return { failures: out, exempted: exercised };
};

/**
 * Colour bindings that are legitimately never returned by the projector, each with the reason.
 *
 * Listed by exact key and checked in BOTH directions, same discipline as `PROVENANCE_EXCEPTIONS`: a
 * binding that becomes reachable, or that no longer exists, fails — a stale exemption is this repo's
 * most-repeated defect wearing a helpful face.
 */
const UNREACHED_EXPLAINED: Record<string, string> = {
  'button|focus-ring':
    'a NOMINATION, not a paint: it names which colour the nested `focus-ring` component draws, and the ring is a separate def with its own node. `PartDef` has no stroke field for a host to paint a ring with (#740), so no node in this plan can carry it.',
  'icon-button|focus-ring':
    'same as `button|focus-ring` — a nomination for the nested ring, not a paint on any node of this def.',
};

/**
 * Arm 3. Every colour binding, against every variable the projector actually assigns anywhere in the
 * plan tree, over the full cartesian product of the def's axes × states × both slot toggles.
 *
 * The traversal collects `fills`, `strokes` AND `descendantFills` — omitting the third would report
 * every icon binding in the corpus as unreachable, since a glyph's colour is applied to descendants of
 * the swap target rather than to a node this walk would otherwise visit.
 */
const reachability = (): { covered: { id: string; reached: number; total: number }[]; uncovered: string[]; fails: string[] } => {
  const covered: { id: string; reached: number; total: number }[] = [];
  const uncovered: string[] = [];
  const fails: string[] = [];
  const explained = new Set<string>();

  for (const def of componentDefs) {
    const colour = Object.entries(def.tokens ?? {}).filter(([, ref]) => typeof ref === 'string' && ref.startsWith('color.'));
    if (!def.anatomy) { uncovered.push(`${def.id} (no anatomy — figmaAnatomyPlan cannot be called; ${colour.length} colour bindings)`); continue; }

    // One sentinel per colour key, so a returned variable names exactly ONE key even where the real
    // refs collide. See the header: matching by ref let #784's own defect pass this arm.
    const sentinel = new Map<string, string>();
    const tokens: Record<string, string> = { ...(def.tokens as Record<string, string>) };
    colour.forEach(([key], i) => { sentinel.set(`color/probe-${i}`, key); tokens[key] = `color.probe-${i}`; });
    const probed = { ...def, tokens } as ComponentDef;

    const sizes = (def.variants?.size ?? []).length ? def.variants!.size! : [undefined];
    const axes = Object.entries(def.variants ?? {}).filter(([a]) => a !== 'size');
    let combos: Record<string, string>[] = [{}];
    for (const [a, vs] of axes) combos = combos.flatMap((c) => vs.map((v) => ({ ...c, [a]: v })));
    const states: (string | undefined)[] = [undefined, ...(def.states ?? [])];

    const hit = new Set<string>();
    const walk = (n: FigmaNodePlan): void => {
      for (const v of [n.paints?.fills, n.paints?.strokes, n.descendantFills]) if (v) hit.add(v);
      for (const c of n.children) walk(c);
    };
    for (const size of sizes) for (const c of combos) for (const st of states)
      for (const leading of [false, true]) for (const trailing of [false, true])
        walk(figmaAnatomyPlan(probed, size, { ...c, ...(st ? { state: st } : {}), leading, trailing, swapTarget: 'FPO-default-icon' } as never).root);

    // A sentinel that came back but maps to no key would mean the substitution missed something — a
    // silently smaller subject, which is the failure mode this whole file is about.
    for (const v of hit)
      if (v.startsWith('color/probe-') && !sentinel.has(v))
        fails.push(`reachability: ${def.id} returned sentinel '${v}', which names no key — the probe substitution is incomplete and this arm's coverage is not what it reports`);

    const reachedKeys = new Set([...hit].map((v) => sentinel.get(v)).filter((k): k is string => !!k));
    for (const [key, ref] of colour) {
      const id = `${def.id}|${key}`;
      if (reachedKeys.has(key)) { if (id in UNREACHED_EXPLAINED) explained.add(id); continue; }
      if (id in UNREACHED_EXPLAINED) continue;
      fails.push(`reachability: ${id} -> ${ref} is bound but returned by the projector at NO coordinate — it resolves, it satisfies provenance, and it paints nothing`);
    }
    covered.push({ id: def.id, reached: reachedKeys.size, total: colour.length });
  }

  for (const id of Object.keys(UNREACHED_EXPLAINED)) {
    const [defId, key] = id.split('|');
    const def = componentDefs.find((d) => d.id === defId);
    if (!def || !(key in (def.tokens ?? {})))
      fails.push(`reachability: ${id} is explained as unreachable but does not exist — remove the entry, it asserts something untrue`);
    else if (explained.has(id))
      fails.push(`reachability: ${id} is explained as unreachable but IS now reached — remove the entry so the rule covers it`);
  }
  return { covered, uncovered, fails };
};

const main = (): void => {
  const accept = process.argv.includes('--accept');
  const fails: string[] = [];
  const ok = (cond: boolean, msg: string): void => { if (!cond) fails.push(msg); };

  console.log('Prism3 paint gate (#758)\n');

  // ── ARM 1 ─────────────────────────────────────────────────────────────────────────────────────
  const { failures: prov, exempted } = provenanceFailures();
  for (const f of prov) fails.push(`provenance: ${f.key} — ${f.detail}`);
  console.log(`  provenance rule … ${prov.length === 0 ? 'ok' : `${prov.length} violation(s)`} (${Object.keys(PROVENANCE_EXCEPTIONS).length} named key exception(s))`);
  // WHAT THE RULE DOES NOT REACH, printed every run rather than left silent — `docs/34` shape 9. An
  // axis exemption that stops being named here has stopped applying, which a reader can notice; a def
  // that quietly spelled its keys so the rule never matched is not noticeable at all.
  for (const [axis, why] of Object.entries(NON_FAMILY_AXES))
    console.log(`  provenance NOT checked on axis '${axis}' — ${exempted.get(axis) ?? 0} binding(s) exempted: ${why.split(':')[0]}`);

  // ── ARM 2 ─────────────────────────────────────────────────────────────────────────────────────
  const actual: Census['defs'] = {};
  for (const def of censusable()) actual[def.id] = { set: setCensus(def), grid: gridCensus(def) };

  if (accept) {
    const next: Census = {
      note:
        'AUTHORED BASELINE, not a regen artifact (see lint-paint.ts). Rewritten only by an explicit ' +
        '`npx tsx packages/engine/lint-paint.ts --accept`, because a gate allowed to rewrite what it ' +
        'reads has no memory. A failure here means the projected paint changed — read the diff and ' +
        'decide whether the change was intended before accepting it. `set` is what the Figma ' +
        'projection builds; `grid` is every coordinate the def declares, which is wider (icon paints ' +
        'along `tone`, an axis the set does not enumerate).',
      defs: actual,
    };
    writeFileSync(CENSUS_PATH, `${JSON.stringify(next, null, 2)}\n`);
    for (const [id, c] of Object.entries(actual))
      console.log(`  ${id.padEnd(14)} grid ${c.grid.members} coords / ${c.grid.assignments} assignments${c.set ? `; set ${c.set.members} members / ${c.set.assignments}` : '; no Figma set'}`);
    console.log('\n✓ census baseline accepted');
    return;
  }

  let baseline: Census;
  try {
    baseline = JSON.parse(readFileSync(CENSUS_PATH, 'utf8')) as Census;
  } catch {
    console.error(`✗ no census baseline at ${CENSUS_PATH} — run with --accept to write one`);
    process.exit(1);
  }

  // Both directions, so a def losing its projection is a failure rather than a silently smaller run.
  for (const id of Object.keys(baseline.defs))
    ok(id in actual, `census: '${id}' is in the baseline but is no longer censusable — a def that stopped projecting is a regression, not a smaller census`);
  for (const id of Object.keys(actual))
    ok(id in baseline.defs, `census: '${id}' is censusable but absent from the baseline — run --accept to record it`);

  const compare = (id: string, arm: 'set' | 'grid', got: Tally | null, want: Tally | null): boolean => {
    if (!want && !got) return true;
    if (!want || !got) {
      fails.push(`census/${id}.${arm}: ${got ? 'now projects one, baseline had none' : 'no longer projects one, baseline had one'}`);
      return false;
    }
    const before = fails.length;
    ok(got.members === want.members, `census/${id}.${arm}: ${got.members} ${arm === 'set' ? 'members' : 'coordinates'}, baseline ${want.members}`);
    ok(got.assignments === want.assignments,
      `census/${id}.${arm}: ${got.assignments} paint assignments, baseline ${want.assignments} — paint was ${got.assignments < want.assignments ? 'DROPPED' : 'added'}`);
    ok(got.sha256 === want.sha256,
      `census/${id}.${arm}: paint hash ${got.sha256.slice(0, 12)}…, baseline ${want.sha256.slice(0, 12)}… — the same count of assignments, pointing somewhere else`);
    return fails.length === before;
  };

  for (const [id, want] of Object.entries(baseline.defs)) {
    const got = actual[id];
    if (!got) continue;
    const okSet = compare(id, 'set', got.set, want.set);
    const okGrid = compare(id, 'grid', got.grid, want.grid);
    console.log(`  census/${id.padEnd(14)} grid ${got.grid.members}/${got.grid.assignments}${got.set ? `, set ${got.set.members}/${got.set.assignments}` : ''} … ${okSet && okGrid ? 'ok' : 'DRIFTED'}`);
  }

  // ── ARM 3 ─────────────────────────────────────────────────────────────────────────────────────
  const reach = reachability();
  fails.push(...reach.fails);
  for (const c of reach.covered)
    console.log(`  reach/${c.id.padEnd(15)} ${c.reached}/${c.total} colour bindings returned by the projector${c.reached === c.total ? '' : ' … UNREACHED'}`);
  // Printed, never counted as a pass — a scope that quietly excludes a def is the failure mode this
  // repo hunts, so what is NOT covered is named on every run.
  for (const u of reach.uncovered) console.log(`  reach/          not covered: ${u}`);

  if (fails.length) {
    console.error(`\n✗ ${fails.length} failure(s):`);
    for (const f of fails) console.error(`  · ${f}`);
    console.error('\n  A provenance failure is a WRONG binding — fix the def.');
    console.error('  A reachability failure is an UNREACHABLE binding — fix the KEY (see PAINT_SLOTS), not the list.');
    console.error('  A census failure is a CHANGED projection — read the diff, then: npx tsx packages/engine/lint-paint.ts --accept');
    process.exit(1);
  }
  console.log('\n✓ paint is where the defs say it is');
};

main();
