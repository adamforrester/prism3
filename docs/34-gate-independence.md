# 34 — Gate independence: why a green gate is sometimes silence

> A gate is only as strong as the **independence of the two things it compares.** When a check and
> the thing it checks derive from one source, the check cannot fail — and it does not report that. It
> reports a pass. This file states the rule, the test that establishes it, and the sub-shapes it
> arrives in.

---

## Why this file exists

#582 was filed at three instances in three days. Auditing for it found twelve, and the register has
grown since — the oldest row being an anchor-ΔE gate that compared two identically clipped values, five
weeks before anyone named the pattern. So this is not a recent cluster to watch; it is the most
frequently repeated defect class in the repo's history, and it was never once found by a gate. Every
instance was found by a person or an agent mutating code by hand. The live count is
[the register below](#the-register-so-the-count-is-auditable), not a number in this paragraph — #387
added two rows the day after the audit closed.

Each is already written down — in a comment beside the gate, in a
`docs/00-progress.md` entry, sometimes both. That is right for the specific trap and wrong for
the pattern: **the next person to collapse a gate into its subject will be reading a different
file**, and the comment that would have warned them sits in the one they are not reading. A dozen
instances across a dozen files is the signal that this needs a home someone can find *before* writing
the gate — and #387 is the proof that a comment is not that home: it collapsed a self-check into a
reimplementation **in the same file whose header already documents #511, the identical mistake.**

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

Each has its own tell. They are all the same rule; the reason to enumerate them is that the *tell*
differs, and recognizing the tell is what happens in practice. **No count is written here on purpose** —
the sections below are the list. This line read "Six shapes" while eight were documented, which is #568's
landmark-goes-stale defect occurring inside the file that records it; the register below already applies
this policy and the prose now matches it.

**These numbers are APPEND-ONLY, and that is now a gate rather than a convention (#786).** They are cited
as stable identifiers from gate headers, `test.ts` comments, `docs/35`, `docs/00-progress.md` and the
gate lists — the live count is what `lint-shape-index.ts` prints, deliberately not a number written here
(#568 again, and this paragraph's first draft carried a figure that its own PR made stale). A renumber
breaks none of those citations visibly: nothing fails, no diff appears in the citing file, the citation
simply points at a different shape than its author meant. So: **add a shape at the end, and never change
what an existing number means.** If a shape is superseded, retire it
in place rather than renumbering around it. `packages/engine/lint-shape-index.ts` enforces the binding
against an authored baseline (`schema/shape-index.json`), and checks that every cited number resolves —
run `--accept` to append a new shape, which appends only and refuses a retitle.

Worth knowing what that gate protects, because the honest version of the claim is smaller than it looks:
this hazard has **never once fired**. Measured across every commit that has touched this file, shapes
1–9 are byte-identical since 2026-08-08, 10–15 were each appended, and same-number-different-title is
**zero**. The renumber that motivated #786 happened at *filing* time, before publication, so no citation
was ever invalidated. **A hazard with zero incidents is a different thing from a recurring defect** —
which is why the fix is one authored file and two arms, not the stable-slug migration that would have
rewritten every citation to repair damage that has not occurred. And the gate's own limit is stated in
its header rather than implied: it proves a cited section **exists**, never that the citation names the
**right** shape. That judgment is prose, and review is its only guard.

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

`#574` `[in review]` — `apps/studio/mode-audit.mjs` computed its `expected` value from *the same
`querySelector`* `apps/studio/src/main.ts` used to render the badge, and reported **28/28 correct with the
defect on screen**.

`#387` — `lint-us-english.ts`'s detection self-check evaluated its own inline
`[PATTERN, STEMS].some(...)` instead of driving `scan()`, so it validated a **reimplementation**.
Removing `STEMS` from the real scan and adding a genuine `A greyscale mode.` to the gated engine README
left all seven samples passing and printed `✓ clean` at exit 0. Fixed by extracting one `enGb(text)`
both callers drive — and note the direction: here the duplication was the *defect* and the sharing is
the fix, because the two callers are the gate's subject and its fixture, not a gate and its subject.
**Ask which two things the gate compares, not whether code is shared.**

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

`#612` `[in review]` — **the same stub, a third time, from a third direction.** `width` and `height`
were modeled by then, but a TEXT node still returned 0, so a hug-sized button measured only its
padding — 16px — and `(16 - 16) / 2` is 0. A spinner centered on the button and a spinner **pinned to
its top-left corner** produced identical coordinates, and the centering assertion passed against
either. Worth noting *why* it recurred: nothing was wrong with the earlier fixes, they were simply
scoped to the axis in front of them. **A constant removed is not a class removed** — ask which
*inputs* to the measurement are still constant, not whether the last bug is fixed.

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

Which is why `packages/engine/schema/token-contract.json` must never become a `regen.ts` artifact: `regen`
would rewrite the baseline to agree with a deletion and **both** gates would go green. Its ancestor
is #281 — *no gate read the committed artifact* — and `CLAUDE.md` principle 4 states the live-gate
half of it.

### 7. A string-anchored mutation stolen by a duplicate

A mutation harness that locates its target by source string is disabled by **any earlier duplicate of
that string**, because `String.replace` with a string pattern replaces only the first occurrence. In
#612 a new payload loop wrote `kid.layoutPositioning='ABSOLUTE';` — byte-identical to the focus ring's
lift a few lines above — and the ring's mutation gate silently began mutating the new loop instead.
The ring's write survived unmutated and its gate went green. Nothing warned, and the harness's own
"the mutation actually applied" assertion **passed**: it did apply, elsewhere.

The uncomfortable part is that the two habits that cause this are both good ones — writing the same
operation the same way, and asserting your mutation landed. What fails is the assumption that a
unique-looking string is unique.

**Tell:** a harness anchor that is a plausible line of code rather than a deliberately unusual one.
**Fix:** make the *subject* textually distinct and say why in a comment beside it (a bare
`const lift='ABSOLUTE'` reads like something to tidy away), or anchor on a unique marker, or assert
the replacement count is 1. Note this is the mirror of shape 2: there, DRY between gate and subject
deletes the gate; here, *accidental* duplication inside the subject does.

### 8. The gate written from the same mental model as its subject

Distinct from shape 1: nothing is derived from the declaration, the two sources really are
independent — and the gate still cannot fail, because the assertion encodes the same belief the code
does. It reports agreement between two expressions of one idea.

#612 is the clean example. Two assertions stated that a label-only `pending` button insets like a
button *with* a leading visual, and that `pending` renders identically across the leading axis. Both
true. Both green. Together they are a precise description of a button that **grows 28px mid-submit**,
and the comment above one called the behavior "correct". Nothing in 1,948 assertions measured
**width** — the one property the replace-the-leading-visual rule exists to protect. The rule's purpose
was ungated while three assertions reported clean.

**Tell:** the assertion restates a mechanism (*"the spinner occupies that cell either way"*) rather
than a consequence anyone would notice (*"the button does not change width"*). Mechanism assertions
pin implementations; consequence assertions pin contracts. **Fix:** ask what a *user* would report as
the bug, and assert that quantity — then check the coordinates you sampled are the ones where it can
break, which here meant all four slot combinations rather than the one the old pair happened to hit.

### 9. The detector is anchored on a name its subject can move

A gate whose detection is a **literal** — a hardcoded path, prefix or regex naming the world as it was
— stops detecting when that name changes. It still runs. It still opens every file. Its pattern simply
matches nothing, and a detector that matches nothing reports **clean**.

`#650`'s decomposition spike is the instance, and it happened twice in two hours. `lint-skills.ts:163`
finds engine references a skill quotes with a hardcoded `/Prism3\/[A-Za-z0-9\/_.-]+\.ts/g`. The sweep
rewrote the gate's **fixtures** (`Prism3/does-not-exist.ts` → `packages/engine/does-not-exist.ts`) but
not its **detector**, so the fixtures stopped matching the regex and the gate stopped checking anything
at all. `lint-us-english.ts` did the same a few minutes later. **Both were caught only by their own
self-checks** — the skills gate said so in as many words:

```
❌ the skills gate's own detection is broken — it cannot see what it claims to:
    a missing engine-file reference is no longer detected
```

Which is the whole argument of this file arriving as evidence rather than as advice: **both gates
survived only because someone had already built the mechanism this doc asks for.** A gate without a
self-check would have gone quietly green while checking nothing, and the rename that disabled it would
have looked like a clean sweep.

**How that detector ended up (#650 PR 3, 2026-08-08), because it is a shape worth naming.** The regex
above was first *widened* to two prefixes (`packages/engine|Prism3`) while both directories were real,
with a self-check fixture asserting a stale path still fails. When PR 3 deleted `Prism3/`, the obvious
next step was to narrow it back — the tree justified it, and the self-check duly rejected the narrowing
by name. But the shipped skill turned out to cite `engine/lint-skills.ts`, an unprefixed pre-rename path
that **both** the wide and the narrow pattern miss. So the fix was neither: the detector now matches the
*claim* (`*.ts` must exist) rather than any list of directories. **An allow-list detector can only catch
the staleness it anticipated, which is the one property staleness never has** — a fourth sub-shape of
this file's thesis, and the reason its fixture now asserts a class instead of naming a directory.

**And here is that gate.** #658's review found the third instance on a gate with **no** self-check —
`apps/studio/vercel-ignore-check.mjs:46`, which locates the files it audits with
`.filter((p) => p.includes('Prism3/engine/'))`. Repointing that one literal to the post-rename path,
with nothing else moved, was measured:

```
Vercel ignore gate — 0 engine files in the bundle, 29 on the skip list.
  ✓ no bundled engine file is on the skip list.
```

**It found zero files and called it a pass.** The count was right there in its own output and nothing
compared it to anything. This is the sharpest form of the shape: not a wrong answer, but a **true
statement about an empty set** — *no bundled engine file is on the skip list* is unfalsifiable once no
file is recognized as bundled. Worse than the `lint-skills` instance, because the subject it guards is
`vercel-ignore.sh`, where `exit 0` means SKIP: a stale detector there does not break the build, it
**silently stops deploying**.

The fix is one assertion — **the recognized set is non-empty** — and it generalizes past this gate: any
detector that reports a count is one comparison away from being able to fail. If a gate can say *"I
examined N things,"* something should care what N is.

**#659 audited every count-printing gate against that rule, and the result corrects a claim worth
correcting.** A prior review reported "5 of 9 guard nothing." The number was wrong and the *way* it was
wrong is the durable part: it counted a gate as guarded if it had **a floor at all**. Three do —
`lint-doc-gates.ts`'s `candidates.length < 10`, and `walkRequired` in both prose gates, which pushes to
`blind` on an empty directory. But those guard that the gate **opened files**, which is
*representation* — and representation is the fix for scope silence, not for this shape. **A dead detector
over a full directory satisfies every one of them.** Read the distinction off the two prose gates, because
they are the pair that makes it concrete: `lint-us-english.ts` drives the real `enGb` from `SELF_CHECK`, so
emptying its pattern list fails with five samples named — that is detector liveness, and it is why the
gate survived the spike's rename. `walkRequired` had nothing to do with it. **Audit for liveness, not for
the presence of a floor**; they are separate properties and a gate can have either without the other.

What the audit actually found, by measurement rather than by reading: four gates whose printed count
nothing compared — `vercel-ignore-check.mjs` (the instance above), both `nb-regression.ts` populations,
and the two suites' `N passed` headline. Both prose gates, `lint-doc-gates.ts`, `lint-classes.mjs`
(retired in #770, when scoped class names left it nothing to police),
`lint-contrast.mjs`, `token-contract.ts` and `check-consumability.mjs` were already able to fail — several
because an earlier instance in this register had already taught them to.

**The trap that made two of these survive so long is worth its own sentence, because a drift gate looks
like it covers them.** `nb-regression.ts` writes a committed report, so emptying its check population
*does* turn `regen --check` red. But `regen`'s remedy — printed in its own failure output, and the first
command in `CLAUDE.md` §4 — is `npx tsx regen.ts`, which rewrites the report to say `0/0` and takes all 18
gates green. **A drift gate defends the artifact, not the claim**: once the artifact stops making the
claim, there is nothing left to drift from. Anything whose evidence is a regenerated file needs its floor
in the *generator*.

**Then the rename happened, and the floor paid out on its first real use.** #650 PR 1 moved the engine to
`packages/engine/` and repointed `ENGINE_PREFIX` — the literal quoted above — for real. The gate reported
**16** bundled files, not the 15 it had reported for months. Nothing was broken: `schema/example-brands.json`
used to sit at `Prism3/schema/`, *outside* the old `Prism3/engine/` prefix, and now lives inside
`packages/engine/`. Same 15 `.ts` files, one JSON input newly inside the prefix.

Two things worth keeping from that. First, **the floor did the job an exact pin could not have done**: a
count pinned to 15 would have gone red on a correct change and been re-pinned to 16 without anyone asking
why it moved — and "raised without thought" is how a floor stops being read. Loose floor, deliberate
reason, and the move produced exactly one question that had a real answer.

Second, and less comfortable: **the count moving is the only reason anyone looked.** The bundle's true
contents were unchanged; what changed was which files the *detector could see*. Had the move gone the other
way — a file leaving the prefix — the gate would have printed a smaller number, still passed its
non-empty floor, and audited less than it claimed. A floor bounds the blindness; it does not measure it.
The stronger form, if this gate ever earns a third revision, is to assert the recognized set *matches the
bundle's actual out-of-`apps/studio/` inputs* — a comparison against something the detector does not
choose.

**Why this is not shape 2.** Shape 2's tell is that *you can point at one function both sides call* — a
shared derivation. Nothing is shared here; the detector and the subject are genuinely independent
expressions, and the gate is perfectly capable of failing. What couples them is a **string**. The
oracle is not derived from the subject, it is *addressed* to it, and the address went stale.

**Why this is not scope silence.** Scope silence is a gate that never looked — a deleted call site, a
dropped directory. This gate looked at everything it promised to and found nothing there to see. The
distinction matters because the fixes differ: scope silence is fixed by asserting **representation**
(`REQUIRED_SURFACES`), and this is fixed by asserting the detector still **fires** on a known-bad input.
A representation check would have passed here — the files were all present and all opened.

**The wider version, which is where the real exposure is.** The literal need not be in the gate at all.
`#657`: the engine's component defs were typechecked only by whichever `tsconfig` a surface *happened* to
import them through, so `button.ts` carried a `notes.evolution` field its schema never declared for five
PRs, invisible, until unrelated plugin wiring pulled it into `tsconfig.main.json` and it failed
instantly. Same family — **a check whose reach is an accident of another thing's structure rather than a
declared scope.** No literal was wrong; nothing pointed at the defs at all. A gate's reach should be
something it states, not something it inherits.

**And the fix taught a corollary sharp enough to state on its own** (`typecheck-components.ts`, #657).
Declaring the scope — an engine `tsconfig.json` with the defs in its `include` — closes the reach
problem and *does not* close the invisibility problem, because **a passing `tsc --noEmit` proves nothing
about which files it read.** Run the same command against an `include` missing one def and it exits 0
with no output; measured, on the tree where the gate was built. That is the old defect exactly: real
coverage, invisible, and its disappearance invisible too. So the gate compares two independent sources —
`git ls-files` for what the repo contains, `tsc --listFiles` for what tsc actually opened — and asserts
each def is **represented** in the second. Reading the tsconfig's own `include` globs instead would be
shape 1: the gate confirming a declaration is self-consistent, which it always is. **Where the reach was
inherited, declaring it is half the fix; the other half is proving the declaration was honored.**

Two smaller things fell out of building that gate, both worth carrying because both were *found by
mutation and would not have been found by reading*. First, a self-check assertion is only load-bearing
if its fixture can reach the code path it names: two guards in the output parser were deleted in turn
and the suite stayed green, because the sample's other guards already excluded those lines — one guard
turned out to be genuinely unreachable and was **removed** rather than kept as decoration, and the other
needed an adversarial sample line before its assertion could fail. **An assertion that cannot fail is
worse than no assertion, because it reports the guard as tested.** Second, the self-check originally
threaded the real run's `DEFS_DIR` literal into its fixtures, and that coupling swallowed a distinct
failure: repointing the literal at a directory holding no defs failed on a *fixture path mismatch*
rather than at the non-empty floor that exists to catch exactly it. Same lesson as shape 2, one level
in — **the fixture tests the function, the floor tests the literal, and sharing a constant between them
merges two failures into whichever fires first.**

**And the empty set need not come from a stale string — a `try/catch` produces one too** (#864). The
glyph gate's stray-node arm wrapped its projection in `catch { stray = [] }`, so a subject that could
not be projected at all came back as *nothing to report*: mutating the projector until five defs threw
left the gate at **exit 0**. This is the `vercel-ignore-check` sentence with a different cause — *"I
could not look"* rendered as *"I looked and found nothing"* — and it happened inside a gate written with
this section open, which is the useful part. A `try/catch` in a gate is not error handling; it is an
**answer about the subject**, and it needs a verdict as much as any comparison does. Either the throw is
a named failure, or the set of subjects that legitimately cannot be examined is enumerated by hand
(there, the two defs with no `anatomy` block) so that a sixth one fails. Never both silently.

**Tell:** the gate names the world in a string — a path prefix, a directory name, a regex over one. Ask
what happens to that string when the thing it names is renamed, and whether anything would say so. A
second tell, cheaper to spot: **the gate prints a count nothing asserts.** A third: **a `catch` whose
body assigns an empty result**, or a guard whose false branch skips assertions rather than failing them.
**Fix:** a self-check that feeds the detector a known-bad input and fails if it comes back clean, and —
where the gate has a scope — an assertion that the recognized set is **non-empty**. Then, before any
rename, sweep for the literal old name and treat each hit as **a detector to repoint, not prose to
rewrite**. Triage by how failure presents: **loud** (imports, `resolve()` — they stop resolving and
something reports it) or **silent** (detectors, globs, trigger lists — they keep running and match
nothing). Only the silent set needs reading by hand, and it is the set a remembered file list omits:
#658's review found `vercel-ignore.sh` precisely because it swept instead of recalling. Then re-run each
gate's self-check explicitly, because the suite going green is what this failure looks like.

### 10. The oracle measures today's symptom instead of the rule

A pin can be independent, live, and able to fail, and still be the wrong quantity — because it counts a
**consequence** the current violation happens to produce rather than the **property** being promised.
It then catches every future violation that produces the same consequence and none that do not, which
is not a property anyone can predict in advance.

`#642` is the instance, and unusually it is a shape found **before** anything escaped, so it has no
register row. `check-consumability.mjs` promised the emitted projection was consumable and enforced it
by pinning the number of CSS values that came out as the literal `[object Object]` — 14 across the
corpus. The real rule is *every `$type` in the conforming projection is a DTCG type*, and the corruption
was only how the one violation of it (`spring`) happened to present. Probed against stock Style
Dictionary, two invented non-standard types with **scalar** values:

```
--prism-motion-elevation-step: 4;     /* $type: "elevation"  */
--prism-motion-grid: 8;               /* $type: "gridUnit"   */
```

Both break the same conformance promise. Neither moves a corruption count by one. The pin would have
reported clean and the promise would have been just as false.

**Tell:** the gate's number is a count of *how the last bug looked*, and you can describe the rule it
stands in for in a sentence that does not mention that number. **Fix:** assert the rule against its own
external definition — here, each emitted `$type` against the spec's list of types, transcribed
independently in the gate. That version fails on the next non-standard type whether or not it
stringifies cleanly.

The general form is worth holding separately from the fix: **a pinned count can only remember what was
true when someone wrote it down; a rule fails on the next one.** Where both are available, prefer the
rule and keep the pin only for what genuinely is not yours to fix — #642 kept exactly one, the two
`aurora` gradients, which are *correct* DTCG that a stock Style Dictionary has no handler for. Splitting
the two was the whole upgrade; widening either to clear a red is the move that ends the measurement.

### 11. Both SIDES of the comparison share the subject

Shape 2's tell — *you can point at one function both sides call* — is about the **oracle** sharing a
derivation with the subject. This is the same silence reached from the other direction, and it passes
shape 2's own test: the expectation is not derived from the subject at all. The gate compares two
**independent implementations** to each other, which is a genuinely strong claim, and the subject sits
*underneath both of them*. Every difference the subject could introduce, it introduces on both sides, so
the comparison stays green while the shared thing moves arbitrarily.

`#656` is the instance. `test.ts`'s member-placement gate compares two executors — the pasted plugin-JS
payload and `apps/plugin/src/write-components.ts`'s `applyComponentPlan` — reading every member's
`name@x,y WxH` off two separate stub pages. Two hosts, two writers, two read-backs, and the assertion is
strong about all of it. But both lay out through `planSetLayout`. When #536 appended `slotAxes` after
`stateAxis`, `varying[varying.length - 1]` moved the column axis from `state` to the boolean `trailing`
and reshaped the full Button set from a readable 108 × 6 table to a 324 × 2 strip — measured live at
320 × 23304px. Both paths built the strip. The positions matched perfectly. The gate that exists to
check member placement could not report the largest possible change to member placement.

Worth naming because the mutation discipline does not surface it either: mutate `planSetLayout` and the
suite goes red *somewhere* — 5 assertions, in #656's case — while the placement gate stays green, so
"the suite noticed" reads as coverage. Only *"is my gate among the failures, by name"* separates them.

**Tell:** the gate compares two things that are independent **of each other** but not of a third thing
they both go through. Ask what is *below* both sides, not just what is beside them. **Fix:** gate the
shared thing separately, against an expectation from outside the code — #656's is a hand-written
`(name → row, col)` table plus two literals a hand-count justifies (`108`, `6`), with an explicit
comment forbidding their rewrite as a call to the layout function. The parity gate is left exactly as it
was: it is a real gate on everything downstream of the layout, and the fix is a second gate, not a
replacement.

### 12. The REACHABILITY PROBE reads the code it is probing

Every shape above is about the gate versus its subject. This one is a level further in: the **probe** —
the small assertion whose only job is to prove the gate's fixture is in the state the gate assumes —
versus the code that fixture is fed to. A probe is what makes the difference between a gate and a hope,
which is exactly why one that cannot fail is worse than none: it is a *certificate* of reachability, and
the assertions downstream of it are then read as exercised when they may never have run.

`#681` is the instance. Set resolution made a def's variant coordinate optional, so the four existing
"what did the miss find" cases had to be driven by a payload emitted **without** one — and the probe on
that, the one asserting the strip really stripped, was `js.includes('nestVariant')` over the whole
emitted payload. It reported the stripped payload as *still carrying a coordinate*. The payload is a
40KB string holding both the serialized plan **and the executor's own source**, and the executor reads
`n.nestVariant` — so the probe was matching the resolution code, which is in every payload by
construction. It answered *"does this payload contain the feature"* (always yes) where the question was
*"did this plan declare a coordinate"*. The tell that it was self-reading rather than merely wrong: the
assertion was **inverted** and still could not fail, because the substring is unconditionally present.

The generalization worth holding: **a probe over a haystack that contains its own needle is not a
probe.** Emitted payloads, bundled JS, generated docs and serialized plans all carry the code or the
schema alongside the data, so any `includes`/`grep` over the whole artifact is ambiguous between the
two — and the ambiguity resolves toward *pass*.

**Tell:** the probe searches a whole artifact for a token that also appears in that artifact's code,
schema, or comments. Ask what the artifact contains **besides** the data, then ask whether the probe can
tell those apart. If inverting the probe would leave it green, it is reading itself. **Fix:** narrow the
probe to the region that holds only data — `#681`'s reads the serialized `const PLAN=` line and nothing
else — and assert the region is **non-empty** in the same breath, so narrowing to nothing cannot pass as
narrowing to clean. Both directions, always: the positive half (*the real fixture DOES carry it*) is what
gives the negative half its meaning, since a strip function that silently did nothing produces a green
"stripped" probe and a table of vacuous passes behind it.

### 13. The scope is the whole document; the promise is one section

Every shape above is about the two *sides* of a comparison. This one is about **where the detector
looks**, and it is the reason it took a second pass to see: both halves are individually reasonable.
Searching a file for a string is a legitimate technique. The document genuinely does contain the string.
The mismatch is between the **scope of the search** and the **scope of the claim**, and nothing in a
green run distinguishes them.

`#704` is the instance, in `lint-doc-gates.ts` — a gate whose entire purpose is that a contributor
following `CLAUDE.md` §4 exactly cannot ship broken. It matched each gate's tokens **anywhere in the
file**. #703 added two CI steps; the gate correctly flagged `CONTRIBUTING.md` §3 and the PR template,
and stayed **silent about `CLAUDE.md` §4, where the steps were also genuinely missing** — because the
same PR had added an `apps/tokenpress` row to the layer table under "What this repo is", 80 lines above
the checklist, and that row satisfied the search. The checklist went short while the gate reported green,
restoring exactly the #601/#602 condition it was written to prevent.

Note what this is *not*: the surface was represented and it was read, so the scope-silence rule below
does not reach it. **The detector fired on the wrong part of a surface it did open.** A file-scoped
search cannot answer a section-scoped question, and the gate declared neither.

Its sibling `#728` is the same predicate failing on **proximity** rather than scope: tokens checked as
independent bare substrings, so `["test", "@prism3/studio"]` was satisfied by the word `test` in one
paragraph and the workspace name in another. Three CI steps were unverifiable that way. Worth pairing
with #704 because *one line of code decided both*, and fixing either alone leaves a gate that can still
be satisfied by text having nothing to do with the step.

**Tell:** the gate's promise names a section, a region or a passage, and its predicate takes a whole
file. Say the claim out loud with its scope attached — *"the §4 checklist is complete"* — then ask which
characters the code actually read. **Fix:** declare the regions, and declare the **membership rule** for
what counts as one, because an undeclared region is the thing that drifts next. `lint-layout-claims.ts`
had already solved this with three declared layout regions and a stated rule; #704's fix adopts that
pattern rather than inventing one, and adds the floor the pattern needs — **a region whose boundary stops
matching must fail loudly**, since an empty region satisfies nothing and would otherwise blame the docs
for a renamed heading. Keep the failure message naming the **document and the section**: "missing from
`CLAUDE.md`" sends a reader to 25,000 characters, "missing from `CLAUDE.md` §4" sends them to the list.

### 14. The threshold sits below the defect the gate was written for

Independence, falsifiability, scope and the choice of quantity are all properties of the
**instrument**. A threshold is a separate axis, and nothing above constrains it. So a gate can be
right in every structural respect — comparing two independent things, demonstrably able to fail,
measuring the property it promises rather than a consequence of it, over a scope it declared — and
still be set where nothing it cares about lives. It then goes green on the case it was written for,
and the green comes from the one part of the gate no other shape here inspects.

`#779` is the instance, and what earns it a section is what it survives. `apps/studio/test-smoke.mjs`'s
rendered-contrast probe exists because `lint-contrast.mjs` structurally cannot see a pairing that
conforms as declared **token values** and resolves differently once **rendered**. #555's canonical case
is `.mo-playnote`: a legal `--faint` at **4.628 declared**, faded through `opacity: .75`, arriving at
**3.12:1**. Compositing the opacity chain down to the first opaque ancestor is the probe's entire
design, and it does that correctly.

**The floor is 2.0:1, and `.mo-playnote` passes it.**

Ask this file's own questions of it and every one comes back clean. Independent of its subject (shapes
1, 2, 11, 12) — it reads the live DOM through `getComputedStyle` and derives nothing from the
stylesheet it checks. Able to fail (shape 4) — a node at 1.5:1 fails the assertion and the suite exits
1. Measuring the rule rather than today's symptom (shape 10) — rendered contrast *is* the property
promised, not a proxy standing in for it. Not written from its subject's mental model (shape 8) — it
measures pixels, not the app's own resolution logic. Reach declared rather than inherited (shapes 9,
13) — an enumerated page × mode × brand sweep, not a set some other file's structure happens to hand
it. Present, running, independent, green, and calibrated past its own motivating case.

**The floor was reasoned, and that is the part to sit with.** `test-smoke.mjs` states outright that it
is an *invisible* floor rather than an AA one, and records both bounding numbers: the lowest rendered
ratio in the studio is **3.04:1**, and the 3.0–3.2 band is occupied by specimens meeting their own
engine contract — the disabled set at `disabledMin`, the `-subtle` semantics at `secondaryMin` — so
asserting AA over them would fail the suite on the engine working. Against that ceiling it was fitted
to the defects at **1.00–1.61:1**, #555's four fixed-ground families. Four of #555's five. The fifth is
named in the same file, in the probe's own header, and nothing in the file's structure asks anyone to
compare the two numbers. Documented, deliberate, and one case short.

**Why a larger number is not the fix, which is the generalizable half.** The defect renders at 3.12
and a legitimate contracted specimen renders at 3.04, so the two populations are **interleaved**: no
single threshold separates them, and any number high enough to catch `.mo-playnote` fails the suite on
the engine being right. The miss was therefore not a number picked too low — it was a
**single-threshold instrument over a population that needs more than one bar**, and a single threshold
over interleaved populations is wrong somewhere by construction; the only choice left is which end
takes the error. The fix is to classify — normal text at 4.5, large text at 3.0, contracted specimens
against their own contract — which the probe cannot do today, because it records `{ ratio, cls, text }`
and neither `fontSize` nor `fontWeight`. **When the defect band and the legitimate band overlap under
your threshold, the threshold is not the thing to tune.**

**Why this is not shape 4.** Shape 4 is *the measurement cannot move* — a stub returning a constant,
two identically clipped values. Here the measurement moves correctly and reports the true quantity:
3.12 is what the page renders. What is wrong is the **comparison point**. The two do share a tell, and
that is worth admitting rather than smoothing over — shape 4's *"feed it an input you know to be
wrong"* would have caught this had anyone run it with `.mo-playnote`. But the diagnosis and the fix
diverge immediately, because shape 4's fix is to model the axis the stub flattened, and every axis
here is already modeled.

**Why this is not shape 10.** There the gate measures a *consequence* the current violation happens to
produce, so it catches future violations only when they produce the same consequence. Here it measures
exactly the property it promises. A shape-10 gate is pointed at the wrong quantity; this one is pointed
at the right quantity from the wrong distance.

Worth separating from a second question about the same suite, since both are true of one gate and only
one of them is this shape: shape 9's cheap tell applies too — `nodesMeasured` is printed and nothing
compares it, and an empty sweep would report *every one of 0 text nodes clears 2:1*. That is a missing
floor, fixed by asserting the recognized set is non-empty. This shape is what remains once that floor
exists.

**Tell:** run the gate against the defect that caused it to be written. If it passes, the threshold is
wrong. Nothing else in this file performs that check, because every other shape asks about the gate's
structure and this one asks about a number. Where a gate cites an issue in its header — this one cites
#555 twice — **that issue is the fixture**: reconstruct the case and feed it in.
**Fix:** calibrate against the defects rather than against the headroom, and then keep the case, because
a threshold with a named motivating defect and no test of it is a comment rather than a bound. And when
raising it turns other surfaces red, those are findings: a rendered value diverging from a declared one
is the defect class the gate exists for, and tuning back to green is the move that ends the
measurement.

### 15. The comparison is correct; the set it walks excludes the hard cases

Every shape above asks whether the *comparison* is sound. This one is sound — and still blind, because
of how the **set of things compared** gets built. The tell is an intersection: a gate that compares two
collections by walking `A ∩ B` compares only what already agrees on identity, and the cases that most
need checking are exactly the ones that do not.

`#747` is the instance. `gate.ts`'s types arm compares `$type` across prism3's DTCG emitter and
TokenPress's, and the comparison is right: same path, different type, fail. But the path set was
`prism3 ∩ tokenpress`, and the whole reason the harness exists is that the two exporters **name things
differently** — a rename, an axis collapsed from a path into a mode, an axis spelled as a name prefix.
Those are the paths the harness authors *pairing rules* for, and a rule-paired path never appears
verbatim on both sides, so it never entered the set. Retyping TokenPress's grid branch left the gate
green; the identical mutation on `FONT_SIZE`, which pairs verbatim, produced 66 failures. Measured hole:
**71–73 paths per brand, ~14% of the paired surface, across all four rules.**

**Why no other shape catches it.** The measurement moves (not 4). Both sides are independent codebases
(not 2, 11). It measures the promised property, not a proxy (not 10). Its scope — *every brand with a
Figma emission* — is declared and asserted with a floor (not 13). The threshold is 0 and correct (not
14). Nothing was derived from the subject. **The gate is well-built and answers a narrower question
than the one its name states**, and no amount of strengthening the comparison would have found it: the
*path* was invisible, not the type check weak.

**Tell:** ask *"which members of my subject does nothing compare?"* — and count them. Not "does the
comparison work", which it does. A set built by intersection, `filter`, `Set` membership or a `?? continue`
is where to look, and the count of excluded members is the number to print. Then **assert it at 0**: a
count only printed goes stale, and this one had been printed in three places and read as background.

**Fix:** relate the unmatched members explicitly rather than dropping them, and give each relation the
data it needs to be checked — here, each pairing rule gained a `counterpart` (a whole token, or a named
*field* of a composite) so the type expectation could come from the canonical tree, the emitter's own
**input**, and not from the rule's claim about itself.

**The corroborating detail, and the reason to prefer this fix over widening the intersection:** the new
arm's first run *falsified one of the rules*. The `font-fluid.*` rule's authored prose said TokenPress
emitted "a second copy" of the typography composite; the arm reported 11 disagreements per brand
(`typography` vs `dimension`). The exporters were right and **the rule was wrong** — `font-fluid.*` is
the composite's `fontSize` *referent*, carrying neither `fontFamily` nor `fontWeight`. That prose had
been read several times without anyone noticing. So: **an authored `reason` explaining why two things
correspond is an unverified claim sitting inside a gate**, and the way to verify it is a check that can
contradict it. Fixed by *tightening* the rule, which is the only honest direction — loosening it to
absorb the disagreement would have restored the green and deleted the finding.

**But measure how far that verification actually reaches, because the headline overstates it.** The arm
checks the two sides' `$type`, so it can only falsify a `reason` whose error *changes a type* — which
font-fluid's did, by luck rather than by design. Probed on the shipped rule: making
`grid.<bp>.gutter` claim correspondence with `grid.margin` fails, but only through the **unpaired** arm,
because it orphans the real `grid.gutter`; `paired types` stays 0. And **swapping** `gutter`↔`margin`,
which orphans nothing and keeps both sides `dimension`, passes **fully green** — while nb's two values
genuinely differ at 3 of its 5 breakpoints. So the honest statement of what shipped is: **the arm
verifies that a rule's two sides agree on TYPE, not that the rule paired the right two things.** The
remaining hole is real, narrower than the one closed, and named rather than implied. Closing it needs a
value comparison across rule-paired pairs — the report carries no values for them today, which is itself
worth knowing before anyone reads a green `paired types` as "the pairings are correct".

**The generalizable form, which is this shape one turn deeper:** a check added to verify an authored
correspondence is itself scoped, and *its* scope is as easy to overstate as the claim it verifies. Ask
what the check compares — and what an error in the claim would have to change before that comparison
notices.

**One trap while mutation-testing this shape.** Disabling the explicit `FONT_SIZE` check alone left the
gate green, which looked like a second blind spot. It was a **non-mutation**: the subject has a
defensive scope list downstream that catches the same case, and that code's own comment says it is there
for exactly this refactor. Behavior never moved, so the run proved nothing about the gate — and a
non-mutation is indistinguishable from a blind spot until you read *why* it passed. **Confirm the thing
you mutated is the thing that decides.**

### 16. Fully independent, and measuring the wrong quantity

Every shape so far weakens the *comparison* — the sides collapse into one derivation, or the set excludes
the hard cases, or the threshold sits below the defect. This one has none of those problems. **Both sides
are genuinely independent, the mutation moves the measurement, the negative control fires — and the
number being compared is not the number anyone cares about.** It is the hardest shape to see precisely
because the standard test for independence *passes*.

`#801` is the instance, and it is the second defect in the same subject, which is what makes it worth
reading. Button's focus ring shipped **flush against the border WCAG 1.4.11 asks it to be distinguishable
from**. The first diagnosis found a shape-1 hole (register row above: `if (ring.x >= 0) continue`, then
`off = -ring.x`) and repaired it — the part told apart by the *plan's* `absoluteInset`, EXPECTED read from
the variable the stub resolved, a negative control that genuinely fired at offset 0. A new gate,
`lint-absolute-inset.ts`, was written alongside it: EXPECTED from the **def** (`inset` key → `def.tokens`
→ the naming convention), ACTUAL from the **plan** and the **committed emitted export**. Two walks,
neither reading the other. Three named shortcuts refused in the header.

**Both then reported a pass on the shipped defect.** The repaired plugin assertion expected the ring at
exactly `-2`; the new gate asserted `off > 0` and printed *"✓ every declared inset part resolves to an
offset that lands it outside its parent"*. `-2` **is** the flush geometry. `focus.ring.offset` is 2 in
every brand, it resolved, it wrote, it reported 0 misses, and the component was structurally perfect.

The quantity nobody measured: a materializer sets `strokeAlign: 'INSIDE'` — correct for a border, since an
outside stroke grows the auto-layout footprint — so the ring's own **2px stroke is drawn back inward
across the whole 2px gap**. The visible separation is `offset − strokeWidth`, and at the shipped 2/2 that
is **zero**. Both halves of both gates modeled the plan's *coordinate*; the property that matters is the
*gap*, and the gap depends on a third quantity — the nested component's inward stroke — that appeared
nowhere in either derivation. Found by comparing against **Prism2**, the hand-built library the engine's
output is measured against, which sites the same ring at `-4` / host + 8. Found by a human looking at two
files side by side; by no gate.

**The aggravating detail, and the part to generalize from.** `test.ts` carries a **parity gate** holding
the plugin executor's absolutes loop to the emitted payload's. It was green. So the record is: two
independently-written implementations, pinned to each other by a third check, all three agreeing — **on
one wrong formula.** Agreement between independent implementations is evidence about *drift*, and no
evidence whatever about whether the formula is the right one. A parity gate raises confidence in exactly
the way that makes this shape harder to spot, because it retires the question that felt open.

**Why no other shape catches it.** EXPECTED was not derived from ACTUAL (not 1, 2, 11). The measurement
moves under mutation and the negative control fired (not 4, 12). The scope was declared with a floor and
represented (not 13, 15). The threshold was 0, and correct for the quantity it was applied to (not 14).
It measures a real emitted artifact, not a proxy (not 5, 10). **The gate was well-built, and the plan's
own stated intent was substituted for the requirement.**

**Tell:** ask *"if this gate is green, what would a person see?"* — and answer in the units they would
see it in. A gate that asserts a **coordinate** when the requirement is a **distance**, a *count* when the
requirement is *coverage*, a *ratio* when the requirement is *legibility on a screen*, has quietly
adopted the subject's account of what it is doing as the specification. The specific smell: the gate's
expected value is a number that appears verbatim in the plan, the def or the token — `-inset` when the
brand asked for `inset` of background. When the artifact's own vocabulary and the requirement's
vocabulary are the same word, check whether they are the same *number*.

**Fix:** derive the checked property from the **physical inputs**, not from the intent. `C` now computes
`gap = offset − stroke` and re-derives the gap back out of the sited coordinate, so a compensation applied
in the wrong direction fails even though `offset > 0` still holds (mutated: `gap + stroke` → `gap −
stroke` keeps every other assertion green and fails on that line alone). The stroke is read from the
**nested def's own tokens**, so the host cannot answer the question about itself, and a host compensating
for the *wrong* width is a distinct failure with its own message. And because the whole check degrades
silently to `gap = offset` — #801's arithmetic — the moment the plan stops carrying the compensation,
there is a second floor, `MUST_CLEAR_STROKE`, asserting the compensation path was **exercised** and not
merely available: deliberately *not* derived from `MUST_COVER`, because a part that stopped being
projected and a part still projected whose stroke stopped being modeled fail for different reasons and
only the first is visible in the coverage set.

**And one thing this shape says about the register itself.** #801 appears twice in it — once as shape 1,
once here — for one visible defect. A gate repaired against the shape you found is not a gate repaired.
After fixing an independence hole, re-ask the *first* question in the list below from scratch, because the
repair inherits the original's idea of what was worth measuring. That is shape 3 pointed at the oracle's
subject rather than at its derivation.

#### The second instance, two days later — and what it adds (#848)

`#612`'s pending spinner shipped a button rendering **no label and two icons**, in a live Figma paste,
with every gate green. `replaces: 'leadingVisual'` named one slot, so the coordinate
`leading=false, trailing=true` — which *has* a visual cell — fell through to the label-overlay branch:
spinner plus trailing visual, label at 0% opacity. Two gates covered the mechanism. `test.ts:9238`
asserts the in-flow cell count and resolved padding are identical between `rest` and `pending`; it
passed, because both cells existed at rest and both stayed filled. `test.ts:9247` asserts which of the
two mechanisms fires; it passed, because it only ever sampled `trailing: false` and so never reached
the coordinate where the branches disagree. Both true. Neither asks whether anything a person reads
survives.

**The durable half is the question, not the shape.** *If this gate is green, what would a person see?*
The honest answer was "a button with no label and two icons" — and no assertion in the block could have
said otherwise, because none of them asked about anything a person looks at. That question is now
question 8 in the list below, and this is the instance that earned it a worked example rather than a
clause: it took **eleven assertions** across that one block to reach the defect, and every one of them
was about geometry.

**Why both gates stopped short is worth its own line, because it predicts where the next one hides:
a hard-won invariant becomes the only thing anyone checks.** Width became load-bearing after #612 —
the two assertions it replaced were *pinning* the defect (register row: a button growing 28px
mid-submit, asserted as correct), and the comment recording that spends nine lines on it. So width was
the thing that had been fought for, and width is what every later assertion in the block reached for:
four slot combinations of cell-count-and-padding, a mechanism check, a z-order check, a property-ref
check. The neighboring questions — *is there text*, *is there one spinner*, *is the spinner over the
thing it stands for* — were never asked, and their absence is invisible precisely because the block
looks thorough. **When you find an invariant a previous fix fought for, ask what it is not measuring.**
That is where the next defect lands, and it lands there *because* the hard-won one is drawing the eye.

Two smaller notes from the same fix. The **constant-stub trap (shape 4) was on its fourth and fifth
instance**: both executors' test doubles held `x`/`y` as plain `0` fields, so centering on the parent
and centering on a sibling produced identical coordinates — the geometry gate for this defect could not
have been written against either double until they derived flow position. And the new assertions needed
a **hand-built asymmetric plan**, because the fix removed the coordinate that exposes the difference:
after it, wherever a visual cell exists the spinner takes it and centers nothing. A gate that can only
be exercised on a shape the fixed code no longer produces still has to be exercised on it.

## Two adjacent failure modes, for completeness

They are not independence failures, but they arrive in the same reviews and one is usually mistaken
for the other.

**Scope silence — a clean result from a gate that never looked.** Proving a scan *works* and proving
it *runs* are different claims. Deleting a scan's call site left every self-check assertion passing
over skills the gate never opened (`lint-skills.ts`, #514); dropping `apps/studio/dist` from the US-English
gate's scope cost exactly **one file** of 92, so no count-based floor could catch it. The fix in both
cases is to assert **representation, not totals** — `REQUIRED_SURFACES` in `lint-us-english.ts` names
each promised surface and fails if it is absent from the compared set. *A gate needs to prove it
looked, not only that it can see.*

**And check the promise list in both directions (#387).** Forward alone — *every promised surface has
at least one file* — can only police surfaces someone remembered to promise, which is the "two edits,
and the second is the one that rots" trap. `lint-us-english.ts` committed exactly that twice more
*while a comment saying so sat directly above the list*, leaving two hand-named surfaces in scope but
outside every promise, hence droppable in silence. The **converse** — *every scanned file is claimed by
some promised surface* — is what makes the list self-maintaining, and it found both the moment it
existed. Same argument as shape 3: when a list needs a second edit to stay true, derive it or check the
other direction, because another reminder is the fix that already failed.

**#670 is that same rule one scale up, and the reason it is worth re-reading rather than merely
cross-referenced.** There the two directions were *within* one gate's promise list; here they are the
two questions a whole gate can ask. `lint-layout-claims.ts` (#670) checks that every path a doc claims
resolves **and** that every tracked layer is named in the tables promising to describe the repo — and
only the second half can see #669, a root `README.md` with no `skills/` row at all. Forward alone would
have caught the two defects that were *wrong strings* (#651, #663) and been structurally silent on the
one that was an *absence*. Worth stating plainly because the forward half is the one that feels like the
gate: it produces findings, it names files, it looks like it is working. **An absence produces no
finding in a forward scan — not a quiet one, none — so a gate with only a forward arm reports the
missing row as `✓ clean`.**

**And #807 is the third instance on that same gate, which is why the pattern above needed to become a
gate of its own rather than a third reminder.** Both directions were being checked *within* each prose
gate's promise list — and both gates passed, because the files in question were in **neither** list and
so were claimed by no promise and demanded by none. `payload-manifest.json` (a `why` on every rule),
`nb-measured.json` and `theme-schema.example.json` sat in `packages/engine/schema/` beside four files
that *were* gated, and nothing anywhere held an answer to which of them **ought** to be. The rule
existed — CLAUDE.md's *"anything else kept out of regen needs the same line"* — and its enforcement was
human memory at the moment a file was created.

Two things worth taking from it. First, **a bidirectional check over a list cannot see a file that is
absent from the list**; the converse arm makes a list self-maintaining with respect to what it
*contains*, not with respect to what exists. Closing that needs a third input neither list supplies —
here `git ls-files packages/engine/schema/`, the **directory**. Measured, the difference is total: a
version of `lint-schema-classification.ts` whose expectation is a union of the lists it checks prints
`✓ clean` at exit 0 on the very file the directory-derived one fails on, because the unclassified file
is by definition in no list. Second, **membership decided by location is invisible from outside.** Two
files in one directory, one covered and one not, look identical to a reader; this is the same defect
`payload-manifest.json` was written to remove for `out/` (#674), reproduced one tier up, in the
directory that holds the manifest. The fix has the same shape as #674's and the same justification: a
new schema file **fails until a human classifies it**, and that friction is the feature.

**And the widest form of scope silence: the property is in NO gate's scope** (#864). `icon` built four
empty artboards and every gate in `CLAUDE.md` §4 was green — not one of them weakly, all of them
legitimately, because each asks whether a thing EXISTS, whether a ref RESOLVES, whether a count MATCHES,
or whether nothing THREW, and **an empty artboard satisfies all four.** No oracle was wrong and no
comparison was collapsed, so nothing above this line applies; the finding is a *question nobody had
written down*. Two things make it worth a paragraph rather than a row. First, the tell is not available
from inside any gate — it comes from asking question 8 about the whole list at once: *if every gate is
green, what would a person see?* Here, a blank square. Second, the same fix turned up the **artboard**
half of the defect, which no version of the empty-artboard question would have found: a Figma
`VectorNode` is sized to its ink, only 19 of 39 glyphs are square, and both hosts bind one
`size.{size}.icon` to width **and** height — so `minus` at 14×2 in that slot is a bar 7× too thick. That
is the generalizable sentence, and it is about *membership* rather than about gates: **a node whose box
IS its content cannot be a member of a set whose consumers bind a square.** The document declares
`width`/`height` so the importer is denied that freedom.

**A declaration that also satisfies the check it exempts you from.** `omits: personality` was itself
prose *about* `personality`, so the exemption was suppressed twice and only the second suppression
was ever load-bearing — mutating the exemption dead exited 0 (#514). Keep the two inputs disjoint:
frontmatter **declares**, body **documents**.

And the search heuristic both produced: **fixing a false negative is the best moment to hunt for
more.** A compensating defect is invisible by construction until its partner is removed, so the red
that follows a detector fix is evidence about the past, not damage from the change. Scoping the prose
test to the body turned 7 pre-existing holes red at once.

**Finding an instance of a trap is not finding the trap — the discovery obliges you to sweep the same
change for siblings.** #680 hit "a crashing assertion is not a failing one" while writing its
mutations, fixed the instance, wrote the lesson into the file it happened in, and then shipped **three
more of the identical shape** in the same test — caught in review, not by the author who had the trap
in hand minutes earlier. The mechanism generalizes even when the fix does not: a crash aborts the file,
so the assertions after it never run, so **the mutation that breaks the fix hardest reports the fewest
failures** — and a mutation table read off those runs under-counts exactly where the code is most
broken. Two things follow. Recording the lesson is not the response; **grepping for the shape is** — and
the grep must be by *mechanism*, not by syntax, because two of #680's three siblings were unguarded
`await` calls on fixtures armed to be refused, which no search for `!.` can see. And **a mutation is
only measured if the whole suite still ran**: capture the executed-assertion count next to the failure
count, because equal-to-baseline is what distinguishes a clean failure from a truncated one. Re-run
under that instrument, #680's six mutations came back 6/3/**6**/3/1/**6** against a shipped table
reading 6/3/**1**/3/1/**2** — and only one of the two wrong rows was wrong because of the crash.

## The register, so the count is auditable

Newest first. Shape numbers refer to the sections above. Every row was found by hand, none by a gate —
which is the argument for reading this file rather than rediscovering it. **Add a row when you find
one**; the table is the count, and the prose above deliberately stops naming a number (#568 — a count
written in prose is a landmark that goes stale, and this one went stale within a day of being written).

`scope` and `decl` in the shape column are the two **adjacent** modes from the section above, not
independence failures — counted because they are the same silence from a different cause. `sweep` is
the third: a trap correctly diagnosed, fixed in one place, and left standing in its siblings.

| date | where | shape | what passed green |
|---|---|---|---|
| 2026-08-23 `[in review]` | `anatomy-figma.ts`'s box paint branch — the whole gate list (#933) | scope | **two configurations of one anatomy, both validating with ZERO errors, one of which paints a control's fill across the entire label row.** The projector's box branch read `p.kind === 'box' && p.role === 'target'`, so `role: 'target'` — *"what does the user click"*, a hit-area and accessibility concept — was deciding *"what carries colour"*. Measured with the coupling restored: `test.ts` **2331 passed / 0 failed**, `lint-paint.ts` **exit 0**, `typecheck-components.ts` **exit 0**. `scope` rather than a weak comparison, for the `icon` row's reason: **no gate's oracle was wrong, because the property was in no gate's scope.** `lint-paint.ts` arm 3 walks every node of every coordinate and flattens the variables into one set — the right question for #784 and it **discards the node** — so "is this binding painted at all" was answered everywhere and "did it land on the part the def nominated" nowhere. The two questions have the same answer in all five anatomies in the corpus (one box, one target, the same part), which is why authoring them apart never happened; a switch is where they come apart, its whole row clickable and its fill on the track. Fixed by a field that says which slots a box paints (`paintSlots`) and by removing `p.role` from the file entirely, plus `lint-paint-placement.ts`. **Two things about the gate are worth more than the row:** it carries a **fixture** because a corpus-only version is shape 15 (comparison right, set excluding the only case that can fail it) and the excluded member is not a member — no def has two boxes, so the fix is to build one, not to relate it; and its load-bearing arm is **metamorphic** rather than an EXPECTED/ACTUAL pair — moving `role: 'target'` between two boxes must not change the placement map *at all* — which is shape 16's remedy applied before the fact, one implementation and two inputs differing in one field. Found by probing the shape a def could not yet hold |
| 2026-08-21 `[in review]` | `icon`'s Figma projection — the whole gate list (#864) | scope | **four empty artboards**, pasted into a real Figma file, reporting **0 misses**, with every gate in `CLAUDE.md` §4 legitimately green. The def declared a `size` axis and carried no geometry anywhere, so the plugin built four correctly named, correctly sized, correctly painted frames with **nothing inside them** — and the tranche whose checkbox and radio render glyph indicators was blocked behind it. Nothing anywhere asked whether a component *draws*: every gate on that list asks whether a thing EXISTS, whether a ref RESOLVES, whether a count MATCHES, or whether nothing THREW, and an empty artboard satisfies all four at once. `#802`'s class and its largest instance, and the reason it is filed as `scope` rather than as a weak comparison: **no gate's oracle was wrong, because the property was in no gate's scope** — so the fix is a gate that did not exist (`lint-glyph-geometry.ts`), not a stronger assertion in one that did. Found by a designer looking at the pasted set |
| 2026-08-21 `[in review]` | `lint-glyph-geometry.ts`'s own stray-node arm (#864, first revision) | 9 | the gate written for the row above, **exit 0** while five defs threw. Its no-vector-part branch shipped `catch { stray = [] }`, so mutating the projector's geometry condition to one matching every part turned *"I could not look"* into *"I looked and found nothing"* — the same sentence shape 9 is about (`✓ no bundled engine file is on the skip list` over an empty set), inside a gate written with this file open. Fixed by guarding on the two defs that are *legitimately* unprojectable (`text-field`, `textarea`) and reporting a throw as a named failure; the same mutation now fails 5 times, and its sibling 820. **The lesson is the placement, not the swallow:** a `try/catch` in a gate is an *answer* about the subject, so it needs a verdict as much as any comparison does |
| 2026-08-21 `[in review]` | `test.ts` icon block, `p.size === 'md'` (#864, found while fixing it) | 9 | **five assertions dead for eleven PRs**, at `2260 passed, 0 failed`. #844 respelled the size enum in t-shirt words; the guard `iconSet.find((p) => p.size === 'md')` kept a pre-rename literal, came back `undefined` from that PR onward, and the whole `if` body stopped executing — including the "measured ceiling" line whose *own comment* warns that a test passing for a reason its message denies is worse than a missing test. The guard was correct code written for a real hazard (an empty projection crashing the block and discarding every named failure), which is what made it unreadable as a defect. Two things measured while repairing it: a **second** stale `'md'` sat inside the block, so fixing the literal alone made the suite crash rather than pass; and the guard is now keyed on a question the set can meet (*is there a member to read*) rather than on a coordinate spelled in a vocabulary that can move. Filed as #918 |
| 2026-08-21 `[in review]` | `lint-paint.ts` `censusable()` (#864, found while fixing it) | 15 | **18 colour bindings** across three defs (`icon` 8, `field-message` 8, `focus-ring` 2) outside arms 2 and 3 for months, in a file whose whole output reads as coverage. They were excluded by `(def.variants?.size ?? []).length > 0` — a **proxy** for *"can this def be projected"*, true when it was written and made false by #795, which taught `figmaAnatomyPlan` to plan a def with no size axis. The wrinkle that makes this harder than shape 15's first instance: the exclusion was **documented**, printed under `uncovered` with a stated reason, and a stale reason reads exactly like a fact about a scope that is correctly small. Filed as #919. Found only because `icon` moved its Figma grid off `size` and so fell out of a scope it had been the motivating member of |
| 2026-08-14 `[in review]` | `test.ts` pending-spinner block (#848) | 16 | a button with **no label and two icons**, in a live Figma paste, past eleven assertions in the block written for exactly this part. `replaces: 'leadingVisual'` named one slot, so `leading=false, trailing=true` — which *has* a visual cell — took the label-overlay branch anyway: spinner + trailing visual, label at 0%. The width gate passed (both cells existed at rest, both stayed filled, padding unchanged); the mechanism gate passed (it samples `trailing: false` only, so it never reached the coordinate where the branches disagree). Second instance of shape 16 in two days, and the one that promoted its tell to **question 8**: *if this gate is green, what would a person see?* Every assertion in the block measured geometry, because **width had become the hard-won invariant after #612** — the two assertions it replaced were pinning a 28px growth as correct — and a hard-won invariant crowds out its neighbors. Nothing asked whether text survived, whether there was one spinner, or whether the spinner was over the thing it stood for. Found by a designer looking at a column of pasted variants |
| 2026-08-14 `[in review]` | both executors' test doubles, `x`/`y` (#848) | 4 | the 4th and 5th instance of the same constant: `x: 0, y: 0` as plain fields, so **centering on the parent and centering on a sibling are the same coordinate** and the 12px-off spinner the fix exists to correct was unmeasurable. Both doubles now derive a flow child's position from the parent's padding and its preceding flow siblings, which is what made the geometry gate writable at all. The same doubles' own headers already recorded this finding three times (`width`, `height`, TEXT measurement) — the sweep half of shape 4 |
| 2026-08-14 | `anatomy-figma.ts` empty-projection gate (#795) | 14 | the gate **the ticket asked for**, unreachable, at `2220 passed, 0 failed` with the throw neutered. `if (plans.length === 0) throw` was written on a real measurement — under the *old* nested loops, `figmaAnatomySet(fieldMessage, { variantAxes: [] })` did return OK with 0 plans — and **the same PR** rewrote that function into a cartesian fold where `one<T>()` maps an absent or empty axis to `[undefined]`, so the product of nothing is one empty coordinate and the set returns **1 plan named `""`**. Zero stopped being reachable in the diff that motivated the check. Shape 14 rather than 4 because the quantity moves and reports truly; the **comparison point** sits where no member of the population can land — and shape 14's own tell is what found it, once run: feed the gate the defect it was written for. Fixed by asking for what genuinely cannot be true (a member with **no variant coordinate at all**) of `planComponentName`'s *output*, not by re-reading `variantAxes` |
| 2026-08-14 | `test.ts` empty-projection `throws` tests (#795) | 5 | **both** tests for the gate above passing while the gate did not exist — satisfied by Button's unrelated *size* guard throwing first. `did it throw` is a truthiness check on a failure, so it cannot distinguish the throw it names from any other on the same call. Both now match by **message**, over a `focus-ring` copy chosen because it has no size axis and so no other guard can stand in. The same PR's sizeless-plan mutation confirms the discipline pays: it fired only because the assertion refused the substitute throw (`size.undefined.type`) |
| 2026-08-14 | `test.ts` `cellOf` anti-vacuity guard (#795) | sweep | a length guard against an empty payload slice, present and correct, reporting **nothing** — written as extract → compile → assert, the empty source compiled to a body returning an undeclared name and the suite died with `ReferenceError` at exit 1 before one `❌` printed. #680's *"a crashing assertion is not a failing one"* one file over, and the sweep half of it: the lesson was recorded here and the shape still shipped, because a guard against vacuity is itself ordered code. **Assert while it can still be reported; compile once it holds.** |
| 2026-08-14 | `lint-absolute-inset.ts` + the *repaired* `test-write-components.ts` ring check (#801, second pass) | 16 | the **same flush focus ring**, past both the fix for the row below it and a brand-new gate written to cover it. The repaired plugin assertion expected the ring at exactly `-2`; the new gate asserted `off > 0` on the same coordinate and printed `✓ every declared inset part resolves to an offset that lands it outside its parent`. `-2` **is** the flush geometry: `strokeAlign: 'INSIDE'` draws the ring's own 2px stroke back inward across the whole 2px gap, so the visible separation is `offset − strokeWidth` = **0**. Both halves of both gates modeled the plan's *coordinate*; the requirement is a *gap*, and it depends on a third quantity — the nested component's inward stroke — that appeared in neither derivation. Everything the standard independence test asks for was satisfied. **Aggravating:** `test.ts`'s parity gate was green, so two independent implementations were pinned to each other and confirmed to agree — on one wrong formula. Found by comparing against **Prism2** (`-4` / host + 8 for the identical ring), by a human, not by any gate |
| 2026-08-13 | `test-write-components.ts` ring geometry (#801, first pass — and see the row above: this repair inherited the wrong quantity) | 1 | a focus ring **flush against the border it exists to be distinguishable from**, printing `✓ the focus ring is absolute, 2px larger on EVERY side, at a negative origin, and STRETCHed` — whole plugin suite green, measured. Two lines, four apart: `if (ring.x >= 0) continue` used the negative origin to tell an inset part from a centered one, so **the one state the check exists to catch is the one state it classifies as "not my subject"**; then `off = -ring.x` read EXPECTED off the node under test, making `width === parent + off*2` assert `0 === 0`. The value itself was covered by nothing anywhere — an offset of `0` is a valid FLOAT that binds nothing, writes without throwing, reports no miss, and builds a structurally perfect component, so no layer below the assertion saw an error. The engine-side twin of the same check DID fail by name, which is what located it |
| 2026-08-13 | both prose gates' `schema/` scope (#807) | scope | three authored files — `payload-manifest.json` (a `why` on **every** rule), `nb-measured.json`, `theme-schema.example.json` — in **neither** `lint-us-english.ts` nor `lint-voice.ts`, both printing `✓ clean` over a file count that never included them. Two files in the same directory, one covered and one not, are indistinguishable from outside |
| 2026-08-13 | `gate.ts` types arm path set (#747, under #697) | 15 | a retyped **axis-collapsed** path (`grid.<breakpoint>.<prop>` vs `grid.<prop>`) green, because the arm walked `prism3 ∩ tokenpress` and the paths the harness writes *pairing rules* for never appear verbatim on both sides — **71–73 per brand, ~14% of the paired surface**; the same mutation on a verbatim-pairing path fired 66 failures |
| 2026-08-13 | `font-fluid.*` pairing rule prose (#747) | 15 | an authored `reason` claiming "a second copy of the composite" for what is the composite's `fontSize` **referent** — read several times, and only falsified once a check existed that could contradict it |
| 2026-08-13 | `test-smoke.mjs` rendered-contrast floor (#779) | 14 | `.mo-playnote` at **3.12:1** — the exact #555 case the probe was built to composite the opacity chain for — clearing a **2.0:1** floor fitted to #555's other four families at 1.00–1.61 |
| 2026-08-12 | `test.ts` coordinate-strip probe (#681/#750) | 12 | a `nestVariant` grep over the whole emitted payload matching the **executor's own** `n.nestVariant` reads — a stripped plan reported as still carrying a coordinate, and the assertion could not fail inverted either |
| 2026-08-12 | `lint-doc-gates.ts` document scope (#704) | 13 | the `CLAUDE.md` §4 checklist going **short** while the gate reported green — a layer-table row 80 lines above the list satisfied a file-wide search for the workspace name |
| 2026-08-12 | `lint-doc-gates.ts` token proximity (#728) | 13 | `["test", "@prism3/plugin"]` satisfied by the word `test` in one paragraph and the workspace in another — 3 CI steps unverifiable, measured against `origin/main`'s predicate |
| 2026-08-11 | `test-write-typography.ts` mutation counts (#680 review) | sweep | a shipped mutation table reading **1** where the mutation fails **6** — three unguarded reads crashed the run, so the worst mutation reported the fewest failures |
| 2026-08-11 | `test-write-typography.ts` M6 row (#680 review) | 4 | **2** claimed against **6** actual, with no crash involved — the table was read off the assertions the author expected, not the ones that fired |
| 2026-08-09 | `typecheck-components.ts` own self-check (#657) | 4 | two output-parser guards deleted in turn, suite green both times — one unreachable, one with a sample that could not reach it |
| 2026-08-09 | `typecheck-components.ts` fixture/floor coupling (#657) | 2 | a `DEFS_DIR` repointed at an empty directory failing on a fixture mismatch instead of at the floor built for it |
| 2026-08-08 | `docs/**` layout descriptions (#670) | scope | **three PRs in a row** describing a repo that did not exist — and `docs/**` was in no gate's scope at all, so nothing reported anything |
| 2026-08-08 | `docs/01` + `docs/02` companion-file refs (#670) | 9 | 15 refs to a sibling `schema/` and `engine/` — pre-#650 spellings, in the two oldest spec docs |
| 2026-08-08 | `apps/plugin/README.md` engine refs (#670) | 9 | `../packages/engine/write-plan.ts` — #661 deleted the `Prism3/` segment without re-depthing the `../`, live on `main` for two PRs |
| 2026-08-08 | `test.ts` + `mcp-test.ts` headline count (#659) | 9 | **`0 passed, 0 failed`** and `✓ … all hold`, exit 0 — the largest claim CI makes, compared to nothing |
| 2026-08-08 | `nb-regression.ts` contract + dimension populations (#659) | 4 | **`0/0 contrast contracts`, `0/0 dimensions`** inside a PASS verdict — and `regen`'s own remedy commits it |
| 2026-08-08 | `vercel-ignore-check.mjs:46` bundle filter (#658 review) | 9 | **`0 engine files in the bundle` … `✓ clean`** — no self-check, and its subject skips deploys on `exit 0` |
| 2026-08-08 | `lint-skills.ts:163` engine-ref regex (#650 spike) | 9 | the detector matching nothing after its fixtures were renamed |
| 2026-08-08 | `lint-us-english.ts` surface map (#650 spike) | 9 | same rename, same silence, minutes later |
| 2026-08-08 | engine component defs (#657) | 9 | `notes.evolution` undeclared for five PRs, typechecked by nothing — and 4 of 5 defs still silent on `f02d30f`, measured |
| 2026-08-08 | `planSetLayout` member placement (#656) | 11 | both executors' coordinates, from the one layout function they share — and the shape it named: 324×2 measured live at 320×23304px, gate green |
| 2026-08-07 `[in review]` | `test.ts` pending-width assertions (#612) | 8 | a button growing 28px mid-submit, asserted as *correct* |
| 2026-08-07 `[in review]` | `mutateRing` anchor (#612) | 7 | the ring's own gate, mutating a different function |
| 2026-08-07 `[in review]` | payload stub, TEXT width (#612) | 4 | a corner-pinned spinner indistinguishable from a centered one |
| 2026-08-06 | `lint-us-english.ts` self-check (#387) | 2 | `greyscale` shipping in a gated file, `✓ clean` |
| 2026-08-06 | `lint-us-english.ts` promise list (#387) | scope | two hand-named surfaces droppable in silence |
| 2026-08-06 `[in review]` | `test.ts` anatomy stub (#536 item 3) | 4 | a 4×4 focus ring on a full-size button |
| 2026-08-06 `[in review]` | `apps/studio/mode-audit.mjs` (#574) | 2, then 3 | 28/28 with the wrong badge on screen — twice |
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

And a third kind, deliberately not a row: **this file's own shape numbers** (#786), a shape-9 hazard —
citations anchored on an identifier the subject can move — that has **never fired**. It gets a gate
(`lint-shape-index.ts`, described above) and no register row, because every row here answers *"what
passed green"* and nothing did. Counting a hazard as an incident would inflate the one number this file
asks you to trust. Recording it *somewhere* still matters: a zero-incident hazard is what justifies a
cheap fix over an expensive one, and that is the reasoning most likely to be lost.

## In practice

When you write or review a gate, ask each of these — the list is the count, for the reason the register
gives:

1. **What two things does this compare, and where does each come from?** If the answer names one
   source, there is no gate.
2. **Can it fail?** Break the subject and confirm *this* gate is in the failure list, by name.
3. **Did it look?** If the gate has a scope, is every surface it claims to cover represented in what
   it actually opened? And if any part of it can decline to look — a `catch`, a `continue`, a guard
   whose false branch skips assertions — does that path produce a **verdict**, or an empty set (#864)?
4. **Does it name the world in a string?** If the detector holds a path, prefix or regex over one, ask
   what happens when that name moves — and whether anything would say so. Question 2 does not cover
   this: the rename *is* the break, and the gate answers by going green (shape 9).
5. **Did the whole suite run under the mutation?** Compare the executed-assertion count against the
   unmutated baseline. Fewer means the run was truncated by a crash, and every count from it — including
   the "caught by" column you are about to write — is a floor, not a measurement.
6. **What is the probe actually reading?** The little assertions that prove a fixture is in the state the
   gate assumes get none of the scrutiny the gate gets, and they are what make it a gate rather than a
   hope. If one searches a whole artifact, ask what that artifact holds besides the data — code, schema,
   comments — and whether the search can tell them apart. Invert it: if it stays green, it is reading
   itself (shape 12).
7. **Would it catch the defect it was written for?** Every question above is about the instrument;
   a threshold is a separate axis and none of them constrain it. Reconstruct the case the gate's own
   header cites and feed it in. If it passes, the number is wrong — and if no number separates that
   case from the legitimate values beneath it, the answer is a classifier rather than a larger number
   (shape 14).
8. **If it is green, what would a person see?** Answer in the units they would see it in, and check
   that is the quantity the gate compares. A coordinate is not a distance; a count is not coverage; a
   contrast ratio is not legibility on a screen. Every question above can be answered correctly by a
   gate measuring the wrong thing — and a *parity* check between implementations makes this harder to
   spot, not easier, because agreement retires the question that is still open (shape 16).

And two things about repairs, both from #801, which is in the register twice for one visible defect.
Re-ask question 1 from scratch after fixing an independence hole: the repair inherits the original's
idea of what was worth measuring, so a gate fixed against the shape you found is not a gate fixed. And
when a gate's duplication looks like something to tidy up, the comment beside it should already say why
it isn't. If it doesn't, add that before the cleanup finds it.
