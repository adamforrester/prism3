# 34 — Gate independence: why a green gate is sometimes silence

> A gate is only as strong as the **independence of the two things it compares.** When a check and
> the thing it checks derive from one source, the check cannot fail — and it does not report that. It
> reports a pass. This file states the rule, the test that establishes it, and the sub-shapes it
> arrives in.

---

## Why this file exists

#582 was filed at three instances in three days. Auditing for it found **twelve, spanning
2026-07-03 to 2026-08-06** — the oldest being an anchor-ΔE gate that compared two identically clipped
values, five weeks before anyone named the pattern. So this is not a recent cluster to watch; it is
the most frequently repeated defect class in the repo's history, and it was never once found by a
gate. Every instance was found by a person or an agent mutating code by hand.

Each is already written down — in a comment beside the gate, in a
`Prism3/docs/00-progress.md` entry, sometimes both. That is right for the specific trap and wrong for
the pattern: **the next person to collapse a gate into its subject will be reading a different
file**, and the comment that would have warned them sits in the one they are not reading. Twelve
instances in twelve different files is the signal that this needs a home someone can find *before*
writing the gate.

**Instances marked `[in review]` cite a fix that has not merged yet**, so the identifiers they name do
not resolve on `main` — the lesson is durable, the name may still change. Every other name here was
checked to resolve at the time of writing.

This is not a new rule. It is the rule `CLAUDE.md` principle 4 already gestures at — *"the `--check`
gate is the only one that reads the committed artifacts; every other gate runs the engine live and
compares it against itself"* — generalized past artifacts to every gate we write.

## The rule

**A gate compares two things. If one is derived from the other, there is no comparison.**

The dangerous form is not a missing test. A missing test is visible: nobody claims coverage, the PR
template's Gates block has a blank, someone notices. A collapsed gate is *worse than missing*,
because it leaves:

- no failing test,
- no loss visible in a diff — usually the diff looks like a **cleanup**,
- and a green run that reads as **evidence**.

The most common way to create one is DRY. Routing a gate and its subject through one shared helper is
the obvious refactor, it is what a reviewer would suggest, and on a gate it is a **silent deletion**.
Duplication between a gate and its subject is not debt to be paid down; the second derivation *is the
gate*. Say so in a comment where the duplication lives, or it gets tidied away later by someone doing
their job well.

## The test that establishes independence

Not "does the suite go red." **Mutate the subject and check that *your* gate is among the failures.**

The distinction is the whole entry. In #575 the mutation fired **7 failures and the new gate was not
one of them** — it passed while asserting `helper === helper` — and a reviewer reading "mutation
caught, 7 failures" would have approved it. Counting *which* gate fired is what separated a real gate
from a tautology, and it has been the deciding measurement in every instance below.

Three corollaries, each learned the hard way:

1. **Mutate the call site, not a shared constant.** A mutation on something both paths depend on
   breaks both, the suite goes red, and that reads as proof the gate works. It proves the opposite is
   untested (`lint-skills.ts`, #511 — the mutation targeted `DOTTED`, which the real scan and its
   self-check shared).
2. **Prove the mutation applied.** A `replace` against a stale target changes nothing and reports
   green, which is indistinguishable from a caught mutation. Assert `mutated !== source`. A mutation
   that reproduces another mutation's exact output has probably not been applied (#557).
3. **Check that the gate can still fail *at all*.** A gate whose oracle measures a constant is
   unfalsifiable regardless of independence — see "the oracle" below.

## The sub-shapes

Six shapes, each with its own tell. They are all the same rule; the reason to enumerate them is that
the *tell* differs, and recognizing the tell is what happens in practice.

### 1. The gate reads the declaration it is checking

A count derived from a declaration cannot detect that the declaration is **incomplete**. It can only
confirm the declaration is self-consistent, which it always is.

`#536 item 5` — the Figma projection gate asserted `projected === 189`, where `projected` was
`variantAxes × stateAxis` computed from the same def. It agreed with itself perfectly while the
emitter produced 756. Fixed by parsing a **real emitted plan's** variant name and comparing the two
sets (`figmaAxisNames`, `figmaVariantCount` in `component-schema.ts`).

`#573` — the border-contrast gate reads each role's own `against` field, so it cannot see whether
`against` names the *right* ground. A role that quietly re-declares an easier surface passes. Fixed
by adding a **structural** claim the declaration cannot satisfy by moving: a role whose name says
`inverse` must be gated against an inverse surface.

**Tell:** the gate's expected value is computed, not written.

### 2. The subject and the oracle share a derivation (the DRY trap)

`#575` `[in review]` — routing the emitter through `outlineFillFamily`, the helper the gate checks it
against, was tried and **reverted after measurement**. Independent, the mutation fires 10 failures all
naming the gate; shared, 7 failures and none from it.

`#574` `[in review]` — `web/mode-audit.mjs` computed its `expected` value from *the same
`querySelector`* `web/src/main.ts` used to render the badge, and reported **28/28 correct with the
defect on screen**.

**Tell:** you can point at one function both sides call.

### 3. The obvious fix inherits the hole

This is the one that costs a second round, and it is worth its own shape because in two of the four
recent instances the *first* fix was still unfalsifiable.

`#574` again `[in review]` — copying the new exclusion into the audit still passed 28/28 with the bug restored,
because the only new axis inspected the controls the mutation had removed. The gate needed the
**converse** direction: a section badged editable must contain a control that provably moves the
brand. That signal (a token control mutates persisted state; a view control cannot) is independent of
the selector on both sides.

`#464` — a self-check written from the same mental model as the scan **inherits its blind spot**: the
US-English scan's `our\b` was blind to plurals, and its own self-check sampled only the singular.

**Tell:** the fix is the smallest edit that makes the gate mention the new thing.

### 4. The oracle measures a constant

Independence is necessary and not sufficient: two independent things can still be compared by a
measurement that cannot move.

`#536 item 3` `[in review]` — the test stub's `width` was `stroked ? 2 * strokeWeight : 0` and its `height` a plain
`0`, so a focus ring resized to `off*2` instead of `node.width + off*2` — **a 4×4 ring on a real
button** — passed the entire suite green, *including the geometry assertion written to catch exactly
it*, because `0 + 4` and `4` are the same number. Fixing width alone was not enough: the height half
of "2px larger on every side" stayed unfalsifiable until `height` was modeled too.

> **A stub that measures a constant cannot catch an arithmetic error, and a stub models an axis or it
> cannot gate it.**

`#296/#301` — two directions of a check both go vacuously true if the group they name is renamed, so
the gate asserts the group **exists** first.

`2026-07-03, M-03` — the anchor-ΔE gate compared two **identically clipped** values, so it measured
~0 by construction and was blind to a real out-of-gamut drift of ΔL +0.04 / Δh −2.5°.

`2026-08-04` — a tier sweep returned *identical* numbers for two tiers because its selector never
matched, so one tier was the other measured twice. **Two runs agreeing exactly is evidence of a
broken probe, not a stable result.**

**Tell:** the assertion would hold for an input you know to be wrong. Feed it one.

### 5. "It resolves" instead of "it is right"

On a namespace where every sibling key also resolves, *the key resolves* is nearly vacuous. A
one-token state slip inside `outlineFillRole` passed all 1852 tests (#575 `[in review]`). Assert the
key, not its resolvability — and where the value is what matters, assert the value.

**Tell:** the assertion is a truthiness check on a lookup.

### 6. A gate allowed to rewrite what it reads

The same family at the artifact layer, and already documented — see
[`30-versioning-and-compatibility.md`](30-versioning-and-compatibility.md#the-gate-and-the-one-rule-that-makes-it-work):

> **A gate allowed to rewrite what it reads has no memory, and a baseline without memory is just a
> second copy of the output.**

Which is why `Prism3/schema/token-contract.json` must never become a `regen.ts` artifact: `regen`
would rewrite the baseline to agree with a deletion and **both** gates would go green. Its ancestor
is #281 — *no gate read the committed artifact* — and `CLAUDE.md` principle 4 states the live-gate
half of it.

## Two adjacent failure modes, for completeness

They are not independence failures, but they arrive in the same reviews and one is usually mistaken
for the other.

**Scope silence — a clean result from a gate that never looked.** Proving a scan *works* and proving
it *runs* are different claims. Deleting a scan's call site left every self-check assertion passing
over skills the gate never opened (`lint-skills.ts`, #514); dropping `web/dist` from the US-English
gate's scope cost exactly **one file** of 92, so no count-based floor could catch it. The fix in both
cases is to assert **representation, not totals** — `REQUIRED_SURFACES` in `lint-us-english.ts` names
each promised surface and fails if it is absent from the compared set. *A gate needs to prove it
looked, not only that it can see.*

**A declaration that also satisfies the check it exempts you from.** `omits: personality` was itself
prose *about* `personality`, so the exemption was suppressed twice and only the second suppression
was ever load-bearing — mutating the exemption dead exited 0 (#514). Keep the two inputs disjoint:
frontmatter **declares**, body **documents**.

And the search heuristic both produced: **fixing a false negative is the best moment to hunt for
more.** A compensating defect is invisible by construction until its partner is removed, so the red
that follows a detector fix is evidence about the past, not damage from the change. Scoping the prose
test to the body turned 7 pre-existing holes red at once.

## The twelve, so the count is auditable

Newest first. Shape numbers refer to the sections above. Every row was found by hand, none by a gate —
which is the argument for reading this file rather than rediscovering it.

`scope` and `decl` in the shape column are the two **adjacent** modes from the section above, not
independence failures — counted because they are the same silence from a different cause.

| date | where | shape | what passed green |
|---|---|---|---|
| 2026-08-06 `[in review]` | `test.ts` anatomy stub (#536 item 3) | 4 | a 4×4 focus ring on a full-size button |
| 2026-08-06 `[in review]` | `web/mode-audit.mjs` (#574) | 2, then 3 | 28/28 with the wrong badge on screen — twice |
| 2026-08-06 `[in review]` | style-guide outline gate (#575) | 2 | `helper === helper`; 7 failures, none its own |
| 2026-08-06 `[in review]` | `outlineFillRole` (#575) | 5 | a one-token state slip, past 1852 tests |
| 2026-08-06 | border-contrast gate (#573) | 1 | 5.94 reported where the ring measures 1.00 |
| 2026-08-05 | Figma projection count (#536 item 5) | 1 | `projected === 189` while the emitter made 756 |
| 2026-08-05 | `lint-us-english.ts` scope | scope | `✓ clean` over 91 files with the bundle absent |
| 2026-08-05 | `lint-skills.ts` self-check (#511) | 2 | a reimplementation, with the real scan neutered |
| 2026-08-05 | `lint-skills.ts` wiring (#514) | scope | every assertion green, no skill ever opened |
| 2026-08-05 | `omits:` exemption (#514) | decl | the exemption mutated dead, exit 0 |
| 2026-08-04 | style-guide tier sweep | 4 | two tiers with identical numbers — one measured twice |
| 2026-07-03 | anchor-ΔE gate (M-03) | 4 | ~0 drift by construction, blind to ΔL +0.04 / Δh −2.5° |

Two further near-relatives are recorded in `00-progress.md` but not counted here, because in both the
vacuous assertion was caught *before* it shipped: `#464`'s plural hole in the US-English self-check
(shape 3) and `#557`'s "forward and increasing" assertion where the real claim was adjacency.

## In practice

When you write or review a gate, three questions:

1. **What two things does this compare, and where does each come from?** If the answer names one
   source, there is no gate.
2. **Can it fail?** Break the subject and confirm *this* gate is in the failure list, by name.
3. **Did it look?** If the gate has a scope, is every surface it claims to cover represented in what
   it actually opened?

And when a gate's duplication looks like something to tidy up, the comment beside it should already
say why it isn't. If it doesn't, add that before the cleanup finds it.
