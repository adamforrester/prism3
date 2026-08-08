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
and the two suites' `N passed` headline. Both prose gates, `lint-doc-gates.ts`, `lint-classes.mjs`,
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
`#657`: the engine's component defs are typechecked only by whichever `tsconfig` a surface *happens* to
import them through, so `button.ts` carried a `notes.evolution` field its schema never declared for five
PRs, invisible, until unrelated plugin wiring pulled it into `tsconfig.main.json` and it failed
instantly. Same family — **a check whose reach is an accident of another thing's structure rather than a
declared scope.** No literal was wrong; nothing pointed at the defs at all. A gate's reach should be
something it states, not something it inherits.

**Tell:** the gate names the world in a string — a path prefix, a directory name, a regex over one. Ask
what happens to that string when the thing it names is renamed, and whether anything would say so. A
second tell, cheaper to spot: **the gate prints a count nothing asserts.**
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

**A declaration that also satisfies the check it exempts you from.** `omits: personality` was itself
prose *about* `personality`, so the exemption was suppressed twice and only the second suppression
was ever load-bearing — mutating the exemption dead exited 0 (#514). Keep the two inputs disjoint:
frontmatter **declares**, body **documents**.

And the search heuristic both produced: **fixing a false negative is the best moment to hunt for
more.** A compensating defect is invisible by construction until its partner is removed, so the red
that follows a detector fix is evidence about the past, not damage from the change. Scoping the prose
test to the body turned 7 pre-existing holes red at once.

## The register, so the count is auditable

Newest first. Shape numbers refer to the sections above. Every row was found by hand, none by a gate —
which is the argument for reading this file rather than rediscovering it. **Add a row when you find
one**; the table is the count, and the prose above deliberately stops naming a number (#568 — a count
written in prose is a landmark that goes stale, and this one went stale within a day of being written).

`scope` and `decl` in the shape column are the two **adjacent** modes from the section above, not
independence failures — counted because they are the same silence from a different cause.

| date | where | shape | what passed green |
|---|---|---|---|
| 2026-08-08 | `docs/**` layout descriptions (#670) | scope | **three PRs in a row** describing a repo that did not exist — and `docs/**` was in no gate's scope at all, so nothing reported anything |
| 2026-08-08 | `docs/01` + `docs/02` companion-file refs (#670) | 9 | 15 refs to a sibling `schema/` and `engine/` — pre-#650 spellings, in the two oldest spec docs |
| 2026-08-08 | `apps/plugin/README.md` engine refs (#670) | 9 | `../packages/engine/write-plan.ts` — #661 deleted the `Prism3/` segment without re-depthing the `../`, live on `main` for two PRs |
| 2026-08-08 | `test.ts` + `mcp-test.ts` headline count (#659) | 9 | **`0 passed, 0 failed`** and `✓ … all hold`, exit 0 — the largest claim CI makes, compared to nothing |
| 2026-08-08 | `nb-regression.ts` contract + dimension populations (#659) | 4 | **`0/0 contrast contracts`, `0/0 dimensions`** inside a PASS verdict — and `regen`'s own remedy commits it |
| 2026-08-08 | `vercel-ignore-check.mjs:46` bundle filter (#658 review) | 9 | **`0 engine files in the bundle` … `✓ clean`** — no self-check, and its subject skips deploys on `exit 0` |
| 2026-08-08 | `lint-skills.ts:163` engine-ref regex (#650 spike) | 9 | the detector matching nothing after its fixtures were renamed |
| 2026-08-08 | `lint-us-english.ts` surface map (#650 spike) | 9 | same rename, same silence, minutes later |
| 2026-08-08 | engine component defs (#657) | 9 | `notes.evolution` undeclared for five PRs, typechecked by nothing |
| 2026-08-08 | `planSetLayout` member placement (#656) | 2 | both executors' coordinates, from the one layout function they share |
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

## In practice

When you write or review a gate, four questions:

1. **What two things does this compare, and where does each come from?** If the answer names one
   source, there is no gate.
2. **Can it fail?** Break the subject and confirm *this* gate is in the failure list, by name.
3. **Did it look?** If the gate has a scope, is every surface it claims to cover represented in what
   it actually opened?
4. **Does it name the world in a string?** If the detector holds a path, prefix or regex over one, ask
   what happens when that name moves — and whether anything would say so. Question 2 does not cover
   this: the rename *is* the break, and the gate answers by going green (shape 9).

And when a gate's duplication looks like something to tidy up, the comment beside it should already
say why it isn't. If it doesn't, add that before the cleanup finds it.
