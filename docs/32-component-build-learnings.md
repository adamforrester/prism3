# 32 — Component build learnings (the skill backlog)

> Building Button revealed that the *repeatable* part of component work is not the component — it
> is the set of checks, gaps and traps that recur for every one of them. This file is the running
> capture of those, kept as a **skill backlog**: each entry is something a future skill should
> encode, or a gate that should exist, written down at the moment it was discovered rather than
> reconstructed later. Newest first. See `00-progress.md` for what shipped; this is what we *learned*
> while shipping it.

---

## Why this file, and what belongs in it

We will do this catalogue-wide. The KB gave us a schema and a component API (`components/*.md`
§15); #111 built the def tier; #487 found that tier still could not reach Figma. Every one of those
steps produced knowledge that was not in the previous step's plan, and none of it was written
anywhere a future agent would find it.

An entry belongs here when it is **transferable to the next component**. A Button-specific token
binding does not. "The def can bind tokens it has no API to trigger, and nothing checks that" does.

Three kinds of entry, tagged so they can be triaged:

- **`[SKILL]`** — a check or a step a build-a-component skill should perform.
- **`[GATE]`** — something that should fail a build rather than rely on someone remembering.
- **`[KB]`** — a finding worth contributing *back* to the knowledge base, because the KB's research
  did not consider it (see the standing note below).

### The KB's standing remit, and where we deviate

The knowledge base is field research across best-in-class systems. It was not built to serve Prism3,
and in particular **it does not weigh Figma's constraints** — it looks at how components are
modelled, not at what a variant axis costs when Figma has no context mechanism. So: reference it
first, follow it where it holds, and challenge it where Prism3 has a constraint the research did not
face. When we do deviate, that deviation is itself a finding — tag it `[KB]` and feed it back.

---

## 2026-08-14 — from two numbers that crossed a lane boundary and arrived meaning something else

### `[SKILL]` A number keeps its value across a hand-off and loses its referent

Two instances this week, in opposite directions, through the same node. Neither is a measurement
defect: **both figures were measured correctly, by someone who said correctly what they had
measured.** What did not survive the hand-off is what the number was *about*.

**Instance 1 — measured, this week.** `tools/forward-claim-check/measure.ts` reported *"precision is
17/17."* That figure is its own `selfCheck()` on the **reported-vs-asserted filter** — how reliably
the tool separates a claim being *made* from one being *quoted*, and the number exists at all because
a trailing `\b` had made the filter unable to match the case it was written for (14/17 before the fix,
17/17 after). It is not the detector's precision at finding forward claims. The coordinating lane
relayed it onward as detector precision; a later measurement put the detector at **10/12 ≈ 83%** on the
tree it ran against, because two of those twelve reportable sites are past-tense narrations of a
resolved blocker that the tool's **own `NON_CHECKABLE` register** already describes as not-live-claims
— so under the target definition they are false positives, and the register naming them is the
evidence.

| the question | the figure | who asked it |
|---|---|---|
| does the reported-vs-asserted filter classify correctly? | **17/17**, as quoted | `selfCheck()`, in the tool |
| does the detector fire only on live forward claims? | **10/12 ≈ 83%** | a later measurement, separately |

*(Both absolutes have already moved, which is this file's #568 rule arriving uninvited and twice over.
Run live on `63efb29`, `selfCheck()` printed **13/16 → 16/16** over **12** reportable sites; run again
on `de77d0b` two rebases later, **12/15 → 15/15** over **11** — and unchanged again on `dd99ad3`,
this entry's base — because #851 excluded a vendored guest by genre and took a `NON_CHECKABLE` entry
with it. So the **denominator of the 10/12 moved between the
measurement and this entry** — the two past-tense narrations that make the numerator are still there
and still registered, but the population they are counted against is not the one they were counted
against. Both figures are marked with the commit they were taken on for that reason. Two independent
drifts, kept apart: the **referent**, which is this entry, and the **landmark**, which is the older
entry walking past.)*

The consequence is not academic: a decision about whether the tool could **gate** was taken partly on
a number answering the first question while the conversation was on the second. (The tool's own header
argues against gating on **recall**, and that argument stands untouched — which is the sharpest part.
The relayed figure was not merely misread, it was answering the half nobody was blocked on.)

**Instance 2 — earlier the same week, and the mechanism travelled rather than the number.** The
account of *why* `field-message`'s header claim failed reached the emitter lane (#826, closing #795)
as settled: the original probe had **renamed** `tone` by substituting a size axis into a throwaway
copy. It cited #784's trap one level up, which is exactly what made it feel established. Falsified in
one line on `origin/main` — a copy with a size axis **added** and `tone` left intact returns the same
**1 plan / 0 paints**, so no rename is required to produce the symptom. The correct account is #820's
and duller: two functions were confused. Recorded in the #795 section below as *"a wrong diagnosis
that names a mechanism outcompetes a right one that names a mix-up"*; recorded **here** for the other
half of it — **the sequence, agreed rather than contested**: the explanation originated in the
reporting lane's own account, was restated into a prompt with no counterfactual asked for, came back
amplified, and reached six places from there. The finding does not turn on provenance — who said it
first was never the gap. What nobody did, at any hop, was run the one-line test that kills it.

**Why this is one finding and not two coincidences.** Both crossed **the same node** — the
coordinating lane — in opposite directions. In one, the number was correct and its referent changed
in transit; in the other, the mechanism was wrong and travelled as though established. **The common
factor is the hand-off, not the measurement.** That is also why neither lane's verification discipline
was in a position to catch it: each side was internally consistent. The harness measured its filter
and said so in the sentence it printed; the relay quoted that sentence accurately. There is no step
either lane skipped.

**The remedy is identical in both cases, and it belongs to the RECEIVER.** *Ask what was measured,
not just what the value was* — precision **of what**, against **which definition**, over **which
population**. A number arriving from another lane carries its referent only if someone asks for it,
and the asking has to happen on the receiving side, because the sending side has no way to notice
that the thing it stated plainly is about to be read as something adjacent.

**Adjacent to #786, and deliberately not merged into it.** #786's laundered precedent — a stated
precedent (*"the shape was filed as 12 and renumbered to 13 on merge"*) recorded as established, then
measured and found never to have happened — is **provenance** degrading across a hand-off: *"I was
told X"* becoming *"X, measured."* This is **referent** degrading across a hand-off: X measured, X
quoted, X now about something else. Same family — a claim loses something crossing a boundary — and
the remedies do not substitute for each other. **Provenance needs a label; referent needs a
question.** Labeling instance 1 changes nothing, because its provenance was never in doubt and was
never misstated.

**No gate, and the reason is structural rather than a lack of effort.** This is a **coordination**
failure, not a measurement one, and there is no artifact to scan: a correctly-quoted number is
byte-identical to a correctly-understood one at the point of quotation. The missing thing is a
question nobody asked in a conversation, which leaves no residue in the tree. The nearest mechanical
idea — require every relayed figure to travel with its definition — is a review convention, not a
check, and it fails the same way #808's does further down this file: nothing distinguishes the good case
from the bad case structurally.

**Its own family, and the split is a test rather than a taxonomy call.** #820's remedy is *run the
code*, and every member of that family fails to survive it — asking the code is what exposes the
belief as wrong. This instance survives that remedy: `17/17` was asked of the code, and the code
answered correctly. The number was never in question; only its label was. No code run surfaces a
mislabelled true number, because the defect is not in the value — it is in what the value is offered
as an answer to. **A value travels across a hand-off and its definition does not, which is why the
remedy sits on the receiving side.**

---

## 2026-08-14 — from stating the rung-name rule and gating it (#756)

### `[SKILL]` When a naming decision has a value consequence, ask what COMPOSES with the thing

#756's open bullet looked like a taste question with two defensible readings, which is the shape that
normally goes to the owner: `icon`'s default moved from the brief's 20 to 24 *purely because the rung
names shifted one*, so either preserve the brief's **value** (default `sm`) or preserve its **position**
(default `md` = 24). Framed that way it is unanswerable from the code, and I was about to ask.

It was answerable, and the evidence was one query away: **`button` and `icon-button` at their own default
`medium` both bind `icon.size.md` = 24.** Preserving the brief's value would render a standalone `<Icon>`
at 20 while the same icon inside a default-size button renders 24 — and would break the 1:1 pairing
`scale.ts` deliberately built between the icon ladder and `componentSizes`. The composition constraint is
a **fact**; the naming preference is not. One dominates the other, so there was no choice to make.

The transferable move, for a repo where most defs will be authored from briefs: **before escalating a
naming call, enumerate what else binds the thing being named.** A token consumed by three other defs has
its answer written in their bindings. The corpus check that settled it also produced the *rule* — "a
default resolves to the tier's `md` rung", holding 5/5 — which is stronger than a per-def judgment
precisely because it was found rather than chosen, and therefore applies to defs nobody has authored yet.

### `[SKILL]` A gate arm that is *necessary and not sufficient* should say so in its own output

#756 asked for two arms and was explicit that the obvious one is not enough: asserting every enum value
resolves to a real rung passes **trivially** for a def declaring `['sm','md','lg','xl']` against a
five-rung tier — all four are real paths, just the wrong four. The risk is not that the weak arm exists;
it is that a later reader sees `✓ every size enum resolves` and stops, reading a necessary condition as
the whole claim. So the insufficiency is written into the gate's header **and** its passing output names
what each arm covers.

This generalizes past this gate. A pass line is prose that will be read by someone who did not write the
gate, usually while deciding whether to trust a green run. `lint-absolute-inset.ts` states its limit (no
browser, no Figma file) in its own success output for the same reason. **If an arm cannot see a defect
class, the success message is the cheapest place to say so** — a comment is read by whoever edits the
gate; the output is read by whoever relies on it.

### `[SKILL]` Prefer a predicate that admits the benign case over one that needs an exception list

`button` binds `size.large.type → type.label.md.emphasis`, sharing `md` with `medium`, because
`type.label` emits only two rungs in all four brands and a three-size control legitimately clamps its
label at the top. Under **strictly** increasing rungs that is a failure, and the reflex fix is an
exception entry keyed `button.type.label`.

Monotonic-but-not-strict admits it with **no exception list at all**, and the reason it is the right
predicate rather than the lenient one is worth stating: **a repeat is a clamp against a shorter tier and
is always benign; a reversal is never benign.** The two cases are genuinely different, so a predicate
that separates them needs no per-def carve-outs — which matters most for the eighteen defs `docs/40`
queues, none of which can be enumerated in an exception list today. An exception list is the right tool
when the exceptions are *facts about specific components* (`lint-paint.ts`'s four tone→role mappings);
it is the wrong tool when it is standing in for a predicate that was one degree too tight.

---

## 2026-08-14 — a rule that documents its hazard from one direction reads as exhaustive (#849, #852)

Two instances landed the same day, from unrelated lanes, and they are one shape. Both are paragraphs in
`CLAUDE.md`. Both are **correct about what they say**. Both were **read by the person who then walked into
the hazard anyway**, because each states its reasoning generally and then applies it to one instance,
and an unmarked partial list reads as a closed one.

**This is worse than an undocumented hazard, which is the counter-intuitive half.** Undocumented, the
reader is still looking — they have no reason to believe the question is settled. Documented from one
direction, the reader checks the paragraph, finds their situation absent from it, and concludes the
paragraph *decided* their situation was safe. The prose converts an open question into a false negative.
Both instances below were found by someone who had read the rule.

**Instance 1 — the US-English carve-out (#849).** The rule says code comments are exempt *"except in
`apps/studio/src`: which comments esbuild keeps in the bundle is an implementation detail, so an exemption
the gate cannot see is not enforceable."* The reasoning covers **every module that can reach a bundle**.
The rule names one directory. Adding a single import to `packages/engine/components/icon.ts` — `values:
[...ICON_NAMES]`, a runtime value — gave the module a live dependency, so esbuild stopped dropping it and
its comments became shipped text. Two en-GB spellings failed `lint-us-english.ts` in a file the diff had
barely touched. Neither spelling was new; what changed was whether anything could see them. Latent surface
behind the same reasoning, measured on `origin/main`: **58 instances across six component defs** (button
20, field-message 12, focus-ring 11, text-field 7, field-label 4, icon-button 4), of which 39 sit in
comments and the rest in `$description` prose that already ships.

**Instance 2 — the worktree `node_modules` rules (#852).** Two rules, both measured, both right: don't
`ln -s` a whole directory (relative workspace links resolve against the main checkout), and use `npm ci`
rather than `npm install` (an unlocked version leaks in). Both are about **how you build** the links.
Neither is about **operating inside them afterwards**, and `npm install --no-save --prefix <worktree>`
pruned through the symlinks, taking that worktree from 252 links to 18 and emptying 12 scoped directories
in the shared checkout. `git status` showed nothing, because no tracked file changed. The agent had read
the paragraph and concluded the two named hazards were the hazards.

### `[SKILL]` A `CLAUDE.md` rule names its own boundary, or it will be read as closed

The remedy is one sentence per rule, and it is general: **state the boundary explicitly — "covers X and
Y; whether it covers Z is undecided" — rather than shipping an implicitly closed list.** An open edge
that is *marked* open keeps the reader looking, which is the only property that separates these two
incidents from near-misses. Cheap to write, and it costs nothing to be honest that a boundary has not
been decided; what is expensive is the reader inferring a decision nobody made.

Two things about applying it. First, the tell is available before the incident: **a rule whose stated
reasoning is broader than its stated scope is the whole pattern**, and both instances above are visible
as that by inspection. "Which comments esbuild keeps is an implementation detail" is a claim about
bundling; `apps/studio/src` is a directory. "Relative links resolve against the main checkout" is a claim
about symlinks; `ln -s` is one command. When you find that gap in a rule you are editing, either widen
the scope to match the reasoning or say the rest is undecided — writing neither is what produces this.

Second, **`[SKILL]` and not `[GATE]`, and the reason is worth stating** because the reflex here is to
gate it. No gate can compare a paragraph's reasoning against its scope: that is a judgment about natural
language, and the nearest mechanical proxy — flagging rules that name a specific path — would fire on
almost every rule in the file, most of which are correctly specific. `lint-us-english.ts` already catches
instance 1's *consequence* the run after it ships, which is the honest place to catch it; nothing can
catch instance 2 from inside this repo, since it damages a tree the repo cannot observe. So this one is
review discipline, and naming that plainly is better than a gate that would have to model prose.

**And it applies to this file's own entries.** Every `[SKILL]` here generalizes from one or two
instances. An entry that states its instances and stops reads as though the shape has been fully mapped —
which is the same defect one tier up.

---

## 2026-08-14 — from closing the states and variants vocabularies (#821)

### `[SKILL]` "Which compilers read this type?" is not answerable from one gate's `include`

Closing `ComponentDef.states` to `State[]` needed an argument for why the *runtime* check in
`validateComponentDef` is not redundant with the type. The argument I wrote into the comment was: the defs
are the only files this repo typechecks against this schema, so the type reaches a def author and the
runtime check reaches everyone else. The first half is `typecheck-components.ts`'s `include` glob restated
as a fact about the repo, and **it is false** — `apps/studio`'s own `tsconfig` reaches
`packages/engine/anatomy-figma.ts` through its imports and typechecks it too. `typecheck-web` failed with
five errors in a file the PR had never opened.

The transferable part is the shape, not the fix. A gate's `include` list answers *"what does this gate
compile?"* and reads as though it answered *"what in this repo is compiled?"* — the same substitution
`#807` found one tier up, where two prose gates' scopes were compared by reading their sources instead of
measuring what they scan. **There is no single place that answers the question**: the engine has no
`tsconfig` of its own beyond the components one (it is buildless by design), so the surfaces' configs are
the other half of the answer, and nothing connects them.

Cheap measurement, and the reason this is `[SKILL]` and not `[GATE]`: `npm run verify` already answers it,
because `typecheck-web` compiles a different subset than `typecheck-components`. So the rule for a skill is
not "build a config-graph checker" — it is **narrowing a type in `component-schema.ts` requires the whole
gate list, not the engine's part of it**, which is principle 4's rule earning itself again. A gate would
have to model TypeScript's project resolution to say anything the existing gates don't.

### `[SKILL]` Assert the parse found something before asserting what it did not find

The declaration-level assertions in this work parse `ComponentDef` out of the schema source, because the
type layer cannot be invoked from a suite running on tsx. My first parse looked for
`export interface ComponentDef {`; the declaration is `export type ComponentDef = {`, so the slice was
0 chars — and the two claims resting on it were an *absence* check (`content` carries no index signature)
and three shape checks, all of which a 0-char string satisfies vacuously.

They went red instead, because a guard asserted the parse first: `defBlock.length > 2000 &&
/^  id: string;$/m.test(defBlock)`, with the char count in the message. Four red assertions rather than two
silent passes. This is `focus-ring wall 1b`'s discipline (*"the exclusion below is REPRESENTED"*) applied to
a different file, and worth stating as a general rule for any source-text assertion: **the parse is a
subject too.** A regex that silently matched nothing is the purest form of `docs/34`'s central defect — a
check whose expected and actual are both empty, agreeing perfectly.

---

## 2026-08-14 — three method findings in one day, and they are one family

Three findings landed within a day of each other, from three unrelated pieces of work: a gate's scope read
from its source instead of measured (#807), a sweep that filed a defect its own fix comment described
(#808), and a def header claiming what it would do under a condition nobody had evaluated
(`field-message`). They are the same mistake at three sites: **a claim about what code does, believed
because the prose asserting it was read, when the code was available to ask.** Prose is the artifact a
reader reaches for first, and every one of these three was written in good faith by someone who had
looked at the right file.

What separates them is only whether the measurement is cheap. Finding 1's is: instrument the thing and
print what it resolved to. Finding 3's is: relax the condition in a throwaway copy and count the output.
Finding 2's is a judgment call about tense and provenance that no counter can make. So the family shares a
diagnosis and does **not** share a remedy — which is why the entries below propose a gate for none of
them, and say per entry why.

### `[SKILL]` A gate's scope is measured from what it scans, not read from its source (#807)

`lint-us-english.ts` and `lint-voice.ts` share one scope rule. Reading their source, the two lists look
different: the same schema files appear in different orders, under different comments, at different
distances from the `SCHEMA_ARTIFACTS` spread that supplies most of them. Reading that difference as a
divergence produced a claim that was wrong twice over — that `schema/paint-census.json` was in one gate
and not the other (it is in both, and entered both in the same commit, `3dd7f39`), and that five schema
files were unclassified (three were).

The method that settles it takes about a minute: **instrument the gate's own resolved scope array and
print the entries you care about.** `gated[]` is what the gate actually walks, after every spread, filter
and `walkRequired` has run. Both gates resolved to the same 7 schema files. No amount of careful reading
of two 250-line files gets there, because the question is not what the lists say — it is what they
evaluate to, and the spreads mean those are different questions.

**The subtler half, and the reason this is a `[SKILL]` and not just a caution.** `lint-us-english.ts`
already checked its scope in *both* directions (#387: every promised surface represented, and every
scanned file claimed by a promise). Both arms passed. They had to: **a bidirectional check over a list
cannot see a file that is absent from the list.** Neither direction has any way to learn a file exists.
So "this gate checks its own scope, both ways" is a true statement that does not mean scope is covered,
and the instrumented measurement is how you tell those apart before writing an issue that asserts one.

**No gate proposed here** — one shipped. `lint-schema-classification.ts` (#807) derives its expectation
from `git ls-files packages/engine/schema`, which is the third input neither list supplies. What is left
for a skill is the reading habit: when a claim about a gate's behavior comes from reading it, measure
before filing.

### `[SKILL]` "Verified against `main`" means reading the current disposition, not the description that found it

*(#808 — the middle of the three, and the one whose remedy is the least mechanical.)*

#808 filed `text-field`'s focus-border defect and `field-message`'s unreachable text keys as live and
unfiled, quoting both verbatim from `docs/28` §5.1's 2026-08-13 prose. Both were already fixed —
`text-field.ts:79-99` names the fix directly (*"THE FOUR DEFECTS THIS DECLARATION SURFACED, all fixed in
#784"*) and carries the corrected keys (`border.focus-visible`, `border.read-only`); `field-message`'s
four tone keys are the named, reasoned `PROVENANCE_EXCEPTIONS` in `lint-paint.ts`, checked in both
directions, passing on `main`. Closed rather than shipped as a duplicate only because the citations were
checked against the file, not against the entry that motivated filing.

**Why this is a recurring trap and not a one-off miss.** A progress-log entry describes a defect at the
moment it was found. The code a sweep reads afterward holds whatever happened *since* — and a fix
comment, written in the past tense, reads exactly like a live defect description at normal reading speed:
both name the wrong behavior, both cite the wrong key, both use the same vocabulary. The tell is tense and
a nearby issue number (*"all fixed in #784"*), not content — so skimming for the described symptom finds
a match whether or not the defect still exists.

**The fix that generalizes:** "verified against `main`" is not satisfied by finding language that matches
the progress-log quote. It requires reading the code's own current disposition — the comment that says
what happened to the described behavior, not just the code region the description points at — and
independently running whatever gate would catch a regression, rather than trusting that the description
still holds because the file still exists.

**No cheap mechanical form, and worth saying why rather than leaving it as a gap.** The tell here is
*tense plus provenance* — "all fixed in #784" is a fix comment; the identical sentence without those three
words is a defect report. Nothing distinguishes them structurally: same vocabulary, same named key, same
symptom, same file. A gate would have to decide whether a comment describes the present or the past, which
is a reading, not a lookup. The nearest mechanical thing — cross-referencing every issue-number citation
in a comment against that issue's state — answers a different question (#784 is closed either way) and
would fire on the hundreds of legitimate backward citations this repo's comments are largely made of. So
this stays a `[SKILL]`: one step in a sweep's procedure, not a check in CI.

### `[SKILL]` A comment claiming behavior under a hypothetical condition is a testable claim nothing tests

*(The defect this was measured from is filed as #825, per principle 3 as amended by #819 — this entry is
the method finding, not the defect.)*

`field-message`'s header states that the def *"projects with **no further work on it** the day the size
requirement is relaxed"* — an honest, carefully-reasoned claim, filed against #795, that had never been
evaluated. Its evidence is stated right there and is real: all eight tone-keyed colour bindings resolve,
*"probed by substituting a size axis in a throwaway copy."*

Relaxing exactly that requirement the way the header describes — a throwaway copy with `size: ['md']`
added, nothing else changed — measures:

| what projects | measured |
|---|---|
| plans from `figmaAnatomySet` | **1** |
| paint variables on that plan | **0** |
| the def's tone-keyed colour bindings | 8 |
| paint variables on `figmaAnatomyPlan(copy, 'md', { tone: 'error' })` | 2, correct (`color/icon/danger`, `color/text/danger`) |

Both halves matter. The header's evidence is **not wrong** — hand a `tone` coordinate to
`figmaAnatomyPlan` and every binding resolves exactly as claimed. But nothing *hands it one*: `tone` is
not in `PROJECTABLE_VARIANT_AXES`, so `figmaAnatomySet` refuses to declare it (`figmaAnatomySet cannot
project variant axes [tone]`) and the only plan it enumerates carries `coord={}`. Relaxing the size
requirement alone yields one unpainted member, not eight painted ones. The probe measured the function the
header's author called by hand, and the claim is about the function the executors call.

**Why the shape is worth an entry.** "This will work when X changes" is unfalsifiable at the moment it is
written and stops being unfalsifiable immediately — the condition is a two-line edit to a throwaway copy,
which is *why* the author was able to probe part of it. What survived is the gap between the part that was
convenient to probe (does a key resolve, given a coordinate) and the part that was not (does anything
supply the coordinate). A conditional claim needs the *whole* condition evaluated, up to the entry point a
real caller uses, or it needs to name which half it checked.

**No gate proposed, and this one is genuinely open.** "Every hypothetical in a comment is evaluated" is not
mechanizable — the condition lives in prose, and there is no way to know what to relax. A narrower version
might be: a def with an `anatomy` block and no `figmaProperties` gets its projection measured under each
blocking requirement named in its header, with the count recorded. That is closer to a **measurement
harness** than a gate (`tools/` in CLAUDE.md's sense: it answers a question rather than asserting an
answer), and it would need someone to decide what a *defect* is versus a documented ceiling before it
could gate. Worth building alongside #795, which is the issue that will make the condition real. Until
then the entry is the record: the header's second sentence describes the plan path and the first describes
the set path, and #795 should re-measure rather than trust either. The inaccurate header itself is **#825**
— filed rather than left here, because a defect described in a docs entry is not discoverable as work
(#819). *(#795 has since rewritten that header, so the sentences quoted above are quoted from its
pre-#795 state; the entry below is the measurement.)*

---

## 2026-08-14 — from making the projector read a declaration (#795)

### `[GATE]` The def with the longer written record read as the better understood one

#795 is the PR that made `field-message`'s header claim evaluable, and the method finding behind it is
already recorded above (*"A comment claiming behavior under a hypothetical condition is a testable claim
nothing tests"*, #825) — with the correct diagnosis: the probe measured `figmaAnatomyPlan` by hand, where
a `tone` coordinate is supplied and all eight bindings do resolve, while the claim was about
`figmaAnatomySet`, which refused `tone` and enumerated one plan carrying `coord={}`. **Two additions from
having actually relaxed the condition**, neither of which the earlier entry could have:

- **Relaxing *both* walls measures 4 plans and 8 paint variables** — so the header's conclusion was right
  and its stated reason was not, which is the least useful combination to inherit. It now states the
  measurement with its numbers, and `test.ts` pins the correction and the false sentence's absence in both
  directions, because the finding is the deliverable and a header that quietly reverts takes it along.
- **Assert the paint count separately from the plan count.** They come apart exactly here: on the
  size-only relaxation, one member with zero paints is structurally perfect, fully valid, entirely grey —
  and *"it projects"* reads as success. `field-message` is the def where the two numbers disagreed; it is
  now the def where both are asserted.
- **This branch's own first explanation of the miss was wrong, in the more attractive direction.** It said
  the original probe had *renamed* `tone` by substituting a size axis — a named mechanism, and #784's trap
  one level up, which made it feel like a finding. Measured on `main`: a copy with a size axis **added** and
  `tone` left intact returns the same 1 plan / 0 paints, so no rename is needed to produce the symptom, and
  the mechanism explains nothing. The correct account is the duller one above — two functions were
  confused. **A wrong diagnosis that names a mechanism outcompetes a right one that names a mix-up**, and
  the tell is that nobody had run the counterfactual: adding the axis without renaming anything takes one
  line, and it falsifies the whole story.

The record was also wrong about *which* def was nearest to projecting, and that error is worth its own
line. `docs/38` and `00-progress` both had `focus-ring` as the near miss and `field-message` as the
further one, when `field-message` was nearer: `focus-ring` additionally needs a stroke field `PartDef`
does not have (#740). Both files are corrected, and the direction of the error is the tell — `focus-ring`
has by far the longer written record here, and the volume of prose about it read as understanding of it.

### `[GATE]` My gate for this was unreachable, and the suite reported 2220 passed

Worth its own entry because it is the same defect class as #825 above — an expected value authored rather
than measured — one level further in, and it survived a full green run.

#795 needed a new gate: a def that declares `variantAxes` and projects *nothing* must throw, rather than
returning an empty answer nobody reads (#802's class). I wrote `if (plans.length === 0) throw`, on a
real measurement — under the old nested loops, `figmaAnatomySet(fieldMessage, { variantAxes: [] })` did
return OK with 0 plans. But the same PR rewrote that function into a cartesian fold, and `one<T>()` maps
an absent or empty axis to `[undefined]`: the product of nothing is **one empty coordinate**, so the set
comes back with 1 plan named `""`. Zero stopped being reachable in the same diff that motivated the
check. The gate could never fire.

And **its two tests passed.** They passed on Button's *size* guard throwing first — an unrelated throw
satisfying an assertion that asked only "did it throw". Which is the general rule: **a `throws` test
must match the message**, or it is a test that something, somewhere, is broken. Both now match by
message, and both run against a `focus-ring` copy chosen precisely because it has no size axis, so no
other guard can stand in.

What found it was mutation testing (docs/34) and nothing else would have: neutering the throw left the
suite at **2220 passed, 0 failed**. Review could not — the gate reads correctly and its measurement was
honestly taken, just taken against the previous version of the function it guards. The rewritten rule
asks for what actually cannot be true — a member with **no coordinate at all** — and asks it of
`planComponentName`'s *output* rather than re-reading `variantAxes`, so the two sides stay independent.

One more, from the same battery: **the order of an anti-vacuity guard is part of the guard.** The test
that compares the engine's cohort key against the payload's extracts `cellOf` from the generated JS and
`new Function`s it, with a length assertion so an empty slice cannot make every later comparison
vacuously true. Written as extract → compile → assert, that guard reported *nothing*: mutation-tested by
pointing the slice at the payload with no `cellOf` in it, the empty source compiled to a body returning
an undeclared name and the whole suite died with `ReferenceError` at exit 1, before a single `❌`
printed. A harness crash is not an assertion failing — it is the assertion never being reached, and the
next reader gets no line number for what actually broke. Assert while it can still be reported; compile
once it holds.

### `[SKILL]` Two changes where either alone is worse than neither must land together

The size wall and the axis wall looked like one refactor and a follow-up. They are not separable, and
the reason generalizes past this PR.

Relaxing the size requirement **alone** creates a silent-failure mode that did not previously exist: a
def could then project with an axis it declares simply missing from the grid, which is #487 §5's
189-vs-756 through the front door. Closing the axis vocabulary **alone** still leaves a one-scale def
unnameable. So the fix is one PR, and the declaration is what makes it safe — `figmaProperties.variantAxes`
becomes **exhaustive**: the axes this def projects into the Figma grid, and *not listing* an axis is how
a def says it has none. A boolean (`sizeAxis: false`) would have special-cased the one axis we happened
to hit and invited the next one.

The cheap tell for this shape: if step 2 of a plan removes a *check* and step 1 removes the *thing that
made the check unnecessary*, they are one step. Ship them apart and the interval between them is a
version of the code with neither.

### `[SKILL]` An axis whose members differ only by a number the platform cannot bind is not an axis

`focus-ring`'s `offset` was the tempting fourth axis, and #801 already answered it: the value travels as
a **name frozen to a literal at paste time**, because Figma's `x`/`y` bind no variable. Two members
differing only by a number nothing can rebind are two frozen snapshots, not a coordinate — so `offset`
stays a paste-time parameter, and `text-field`'s field-specific offset comes from the parent at paste.
Stated in the def so it is not rediscovered as a blocker.

---

## 2026-08-06 — from the slot × size live probe (#536 item 6)

### `[SKILL]` The 30 s `figma_execute` ceiling is a TRANSPORT limit — measure before optimizing the wrong layer

A 25,960-byte payload (12 variants, one chunk, inside the byte budget) timed out at 30,000 ms **twice**,
both times at member index 6. The obvious reading — the Figma work is too slow, so make it cheaper — is
wrong, and every optimization it suggests is wasted.

What the measurements said, once taken instead of assumed:

| operation | cost |
|---|---|
| all 12 members built, appended, componentized | **1,009 ms** |
| the same loop again, with a 20 KB inline literal alongside | **1,417 ms** |
| `combineAsVariants` on 12 roots | 5 ms |
| `componentPropertyDefinitions` read | 2 ms |
| `loadFontAsync` / `setTextStyleIdAsync` | 0–2 ms / 1.4 ms |
| one member through the real recursion | ~97 ms |

So ~1.4 s of Figma work sat inside a call that could not finish in 30 s. The time goes to MCP transport
on the payload, which is the same ceiling #536 item 7 found at 45 KB from the other direction — and it
means **the byte budget is not the only limit a payload has to respect.** The fix is not smaller work
per call, it is *fewer phases* per call: splitting the one payload into build+combine → properties+refs
→ layout+read-back completed immediately, with no change to what any phase did.

Two things made this diagnosable at all, both worth reaching for by default:

- **Checkpoint into `figma.root.setPluginData` before you need it.** A timed-out call returns *nothing* —
  no partial result, no stack, no logs. Plugin data survives the timeout, and reading back
  `{"stage":"build","i":6}` is what turned "it hangs" into "it hangs at a specific, reproducible index."
- **Run the identical loop with ballast as a control.** Rebuilding the same 12 members in a hand-written
  loop took 1 s; adding an unused 20 KB literal kept it at 1.4 s. The first run proves the work is cheap;
  the second proves the *source size alone* isn't the trigger either, which is what points at transport
  rather than at parse.

The generalization: **an operation timing out does not tell you which layer is slow.** A per-phase
timing table is a few minutes of work and it is the difference between splitting the call (right) and
rewriting the builder (wasted).

### `[GATE]` A timed-out paste leaves nodes mid-construction, not just finished ones

Cleanup after the first timeout removed 7 components and a loose `container` FRAME — and missed an
orphaned `label` TEXT node created *inside* an unfinished `build()` call. The second paste then found it
by name and the run was polluted before it started.

A recursive builder is holding partial trees at every depth when it dies, so **sweep by every node type
the builder can create, not by the names it finished.** The names you know about are exactly the ones
that got far enough to be named.

### `[KB]` `getVariableById` is unavailable under `documentAccess: dynamic-page`

`figma.variables.getVariableById` throws *Cannot call with documentAccess: dynamic-page* — it must be
`getVariableByIdAsync`. Read-back code hits this hardest, because a 12-member sweep asks for the same
handful of variables repeatedly; cache by id, or the async version turns one read into dozens.

This is the same class as `findAll` → `findAllWithCriteria` and `loadAllPagesAsync`: the dynamic-page
migration removed the *synchronous* accessor while leaving the name in every older snippet and in most
model priors. When a Figma read throws about `documentAccess`, look for the `…Async` twin first.

### `[SKILL]` A live probe verifies the run it was part of, and nothing after it

Item 6 was framed as a verification gap rather than a defect — every previous live paste had run at
`size=medium, leading=true, trailing=false`, so three claims had shipped unobserved: `size` as a real
three-value Figma axis, `trailing=true` at all, and both slots at once. The 12-variant grid pasted clean
(12 members, 6 axes, 3 properties, 24 refs, `misses: []`) with the per-side padding correct on canvas at
every size.

The trap is stopping there. A green probe is a *measurement*, and the next refactor cannot see it. The
offline expectation — 12 distinct names, one chunk, the full 12-cell padding table, three geometrically
distinct sizes — is now in `test.ts`, which is what makes the finding survive.

Writing it down also found the hole the probe had only walked past: `trailing: true` appeared nowhere in
`test.ts` without `leading: true` beside it. The three asserted cells pin (0,0), (1,0) and (1,1) and
leave **(0,1) free** — precisely where *each side reads its own slot* and *either side pulls in when any
slot is filled* diverge. Mutating the emitter to `leadingFilled || trailingFilled` passed **every
pre-existing assertion** — 1,756 of them when measured, 1,758 once rebased onto #566, and the #567
reviewer reproduced the silent pass independently at the later count. **A truth table with one free cell
looks fully covered**, because every row present agrees; enumerate the cells rather than the
interesting-looking cases. (Note a plain side-*swap* was already caught — the first mutation tried, and
the reason this note names the real gap instead of that one.)

### `[SKILL]` An absolute assertion count is a landmark that goes stale on rebase

The #567 review's only nit: the entry quoted "passed all 1,756 assertions" three times, and by merge the
true figure was 1,758 — #566 had landed two of its own in between. The measurement was honest when taken
and the conclusion never moved, but a later reader treats a specific number as a fixed reference point
and would find it disagreeing with `test.ts`.

**Quote the delta, which survives, and mark the absolute with what it was measured against.** "+8
assertions" stays true through any rebase; "1,756 → 1,764" is only true against the commit it was run on.
This is the same shape as the versioning split in principle 5 — a figure that describes *your change* is
durable, a figure that describes *the whole* is a snapshot of someone else's work too.

---

## 2026-08-05 — from building the whole variant SET (#487 steps 4–5)

### `[SKILL]` A per-node read-back cannot see a per-SET bug — check the properties only the whole has

The paste payload reads every binding back after setting it, which caught real bugs in #503 and stayed
silent through all three of this step's, because all three are properties of the *set* rather than of any
node in it. Every variant was individually perfect and the set was unusable.

The three, as a checklist for the next component set:

1. **Axes** — read back `componentPropertyDefinitions`. Figma silently drops a member name it cannot
   parse, so a set can come back with fewer properties than its names declared.
2. **Positions** — two variants at one coordinate. `combineAsVariants` *preserves* member positions, so
   appending roots without setting one stacks the whole set at the origin: 21 deep, one button tall.
3. **Footprint** — variants that differ only in a non-geometric axis must measure the same box. An
   `outline` variant 2px wider than its `filled` sibling breaks any row of buttons, and both variants are
   individually correct.

The shape of the lesson generalizes past Figma: **a whole has invariants its parts cannot violate
individually.** Cardinality, uniqueness, alignment and coordinate collisions all live at the container,
so a verification loop built entirely out of per-item checks is structurally blind to them.

### `[KB]` A bound dimension conceals disagreement about that dimension

The `strokesIncludedInLayout` bug showed up on the **hug** axis only. Height was bound to
`size/md/height`, so the fixed axis absorbed the identical 2px in total silence — a component with two
fixed axes would have hidden it completely.

Worth stating plainly because it inverts the usual intuition: binding a dimension is normally the *safe*
move. It also makes that dimension **stop reporting**. When hunting a geometry discrepancy, measure the
axis that is free to move; the bound one will agree with you no matter what.

### `[GATE]` A prefix in a variant member name becomes part of the first axis key

`combineAsVariants` derives axes from member names and does **not** strip a slash prefix first. Members
named `button/intent=primary, …` produce a set whose first property is literally `button/intent`, which
no amount of correct token binding fixes and which a designer sees in the properties panel.

So: the component's identity belongs on the **set**; members carry **only** their coordinate. Two things
about how this was found are the transferable part. It was caught by the axis read-back written in the
*previous* PR, on that gate's first live run — a read-back's value shows up in the step *after* the one
that motivated it. And it was caught at **three** variants, not twenty-one, because the unknown API
behavior got a cheap probe before the expensive paste. Probe the API you have not used at the smallest
size that can exhibit the behavior.

### `[GATE]` A substring assertion against a self-documenting generated string tests the documentation

Recorded once below, hit twice more in the same session, which is why it is restated as a rule rather
than an anecdote. `planToPluginJs` output is the one string in the engine that is both a **deliverable**
and **heavily commented**, so any assertion that greps it for the words describing a behavior tests the
words.

It fails in both directions:

- **False pass** — `ok(js.includes('strokeWeight'))` and `/footprint -> /` both survived deleting the
  code they described. The report string is still in the payload when the condition around it is
  `if(false)`; the gate proved a message *exists*, not that it can ever be emitted.
- **False fail** — `(js.match(/combineAsVariants/g)||[]).length === 1` failed on a *correct* payload,
  because the payload comments on the function by name and the count was 2.

Anchor on syntax: `/node\.strokeWeight=/`, `/figma\.combineAsVariants\(/`,
`/if\(first\.box!==box\)footprint\.push\(/`. And note the detection asymmetry — **only mutation testing
finds the false-pass form.** Review cannot: the assertion looks correct and *is* correct about a string
containing that word.

### `[SKILL]` A probe whose measurement is insensitive to the treatment looks exactly like a pass

The first footprint probe reported "does not reproduce". It was wrong: with no children,
`primaryAxisSizingMode: 'AUTO'` falls back to a default 100px width instead of hugging, so the frame
could not have changed width whatever the stroke did. A clean, confident, meaningless result.

The fix is a habit, not a rule: **run the treatment and the known-good fix in the same probe.** The
redone version measured filled 56, outline-unfixed 58, outline-fixed 56 — three arms, one call, and
"reproduces" and "the fix works" both proven by the same numbers. If a probe cannot show the bug
appearing *and* disappearing, it has not established either.

Third instance of this family (see #500's control that varied in two variables, and the paste verified
by name). They share one root: **before trusting a negative result, confirm the measurement could have
come out the other way.**
## 2026-08-05 — from closing the #503 review's two should-fixes

### `[SKILL]` Execute the generated payload against a stub host — do not grep it

The strongest gate on a code-generating engine runs the code. Five assertions on the paste payload were
substring probes, and five could pass on a payload with the bug they named: `includes('createInstance()')`
survived inverting the ternary, because the call remained as dead code on the unreachable branch.

A stub host is cheap and pays for itself immediately. What it needs is small — name→object resolvers, nodes
that record bindings the way the real API does, and any setter whose SHAPE is the thing under test (Figma's
`setBoundVariableForPaint` *returns* a paint rather than mutating; a stub that mutates would let the exact
bug it guards through). Then run the emitted string via `AsyncFunction` so it sees one binding and nothing
from the test's scope.

The assertions that become possible are the ones text probes cannot express, and the most valuable is the
negative: **with everything resolving, the failure channel is EMPTY.** A read-back that cries wolf is as
broken as one that stays silent, and no substring check can tell them apart.

### `[GATE]` A read-back must iterate what the code DID, not what the plan declared

The bind loop skips a name that does not resolve; the read-back then iterated the declared props, so every
skipped prop collected a second, false miss saying the write was *"resolved, set, not retained"*. 13 real
causes, 12 phantoms shadowing them. The two sets — declared and written — are identical only on the happy
path, which is the one path where a read-back has nothing to say.

### `[SKILL]` Mutation-test the harness, not just the code it guards

The first mutation run against the new stub harness found a defect **in the harness**: a degrade that threw
inside the payload took the whole suite down and reported *zero* failures rather than one
(`review-pr.md:133`'s fail-hard trap). A harness that dies cannot tell you which assertion it would have
failed, and the failure looks like a crash rather than a finding. Catch inside the harness, turn the throw
into an observation, and let the gates judge it.

### `[KB]` Writing a lesson down does not find its existing instances

The self-documenting-string trap was recorded in `00-progress.md`, then hit twice more in the same session —
and both live instances were two files away from the entry describing them. Documenting a pattern makes the
*next* one recognizable; it does nothing about the ones already shipped. When a trap is worth an entry, it is
worth a grep for the pattern across the surface it applies to, in the same sitting.

---

## 2026-08-05 — from building the SKILLS GATE (#492)

### `[GATE]` A self-check written against a REIMPLEMENTATION validates the copy, not the shipping code

The gate shipped with a self-check that called a private `fakeScan` — a parallel copy of the scan
loop, inlined 40 lines below the original. The shared regexes and sets were real, so it verified
*those* were intact; it could not verify that anything still **called** them. A review proved the
consequence: neuter the real `findings.push`, leave `fakeScan` alone, and the gate reports clean —
with the exact `action.*` regression this gate was written to catch injected into a real skill file.

Fixed by extracting `scanText(text, rel, findings)` and having both `scanSkill` and the self-check
drive it. The mutation now fails the gate.

**Why the original mutation test missed it, which is the sharper half:** the mutation targeted
`DOTTED` — a constant *both* paths share. Both broke together, the gate went red, and that read as
proof the self-check worked. **A mutation on a shared dependency cannot distinguish two code paths
that depend on it.** Mutate the call site, not the constant.

It is #281 one layer along: there, no gate read the committed artifact; here, the self-check did not
read the live code path.

**And the fix was itself partial, which is the second half of the lesson.** Extracting `scanText`
routed the self-check through three of the four scans and left COVERAGE inside `scanSkill`,
unreachable from any assertion — so silencing its `findings.push` and stripping `personality` from
the skill whose job is teaching it *still* reported clean, exit 0. The defect the round had just
fixed, surviving in the one scan the extraction did not reach. A second review caught it.

> **A self-check that covers three of four scans reports the same confident silence for the fourth.**

Partial coverage of a self-check is the same failure as no self-check, restricted to a smaller
surface — and the uncovered scan is *disproportionately likely to be the interesting one*, because
the interesting one is usually shaped differently enough to sit outside the common path. Here that
was literal: coverage needs the file's own frontmatter, which is precisely why it did not fit
alongside the text scans, and precisely why it is the check this gate's header calls the one that
fires on the real defect. **When extracting for testability, enumerate the scans and check the count
of things the self-check drives against the count that exist.**

### `[GATE]` A declaration that also satisfies the check it exempts you from is unfalsifiable

The coverage scan lets a skill declare `omits: <prop>` to opt a property out of the "must be
documented" rule. A review mutated the exemption dead — `if (declaredOmit.has(prop)) continue;` →
`if (false) continue;` — and the gate exited **0**.

The cause was scope, not the exemption: the prose test ran against the **whole file**, frontmatter
included. So `omits: personality` was itself prose *about* `personality`. Every declared omission was
suppressed twice — by declaration, and by the declaration's own text — and only the second one ever
mattered. The review's *suggested* replacement sample had the same hole; running it first (32 findings
with the `omits:` line, 33 without, suppressed either way) is what redirected the fix to the root.

> **When the declaration is also evidence for the thing it exempts, no test can distinguish a working
> exemption from a deleted one.** Keep the two inputs disjoint: frontmatter DECLARES, body DOCUMENTS.

**And then the part worth the entry.** Scoping the prose test to the body immediately turned 7 real
skills red — because the `omits:` parser was `/^omits:\s*(.+)$/gm`, which under `/m` stops at the first
newline, and `prism3-theme`'s list wraps across three YAML continuation lines. **7 of its 14
declarations had never been parsed.** They passed anyway, because the text that failed to parse was the
prose that covered them.

> **Two bugs that cancel read as one working feature.** Neither was observable while the other stood.

The heuristic to carry: **fixing a false-negative is the best moment to hunt for more of them.** A
compensating defect is invisible by construction until its partner is removed, so the red that follows
a detector fix is evidence about the past, not damage from the change.

### `[GATE]` Proving a scan works and proving it *runs* are different claims

The self-check drives `scanText` and `scanCoverage` directly — the #511 fix, and correct as far as it
goes. It does not prove `scanSkill` still calls them. Deleting either call left **every assertion
passing** and printed `✓ clean` over skills the gate never opened.

#511 was *the self-check validated a copy instead of the shipping function*. This is one layer along:
it validates the shipping function while the shipping **path** no longer reaches it. Extraction fixes
the first and creates the second — the more a self-check drives units directly, the less it says about
the composition.

Closed with a wiring floor: counters incremented inside each scan, compared after the real pass against
expectations **derived from the skill files themselves** (`dirs.length`, and the count declaring
`documents: brandInput`) rather than hard-coded, so the floor tracks the corpus instead of needing a
number bumped whenever a skill is added.

Mutation coverage went **5 of 12 → 12 of 12**. The seven newly-caught: the omit list ignored and the
omit list widened to a blanket amnesty, the prose test re-widened to the whole file, the wrapped-`omits:`
parser, the greedy frontmatter strip, and all three call sites.

**One mutant deserves its own note, because it passed longest.** The frontmatter strip must be lazy
(`[\s\S]*?`); greedy would eat the body up to the *last* `---` in the file. Both shipped skills have
exactly two `---` lines — the frontmatter delimiters — so greedy and lazy agree on every real input,
and the mutant survived until a sample was written specifically to separate them (a property documented
*above* a body rule: lazy keeps it, greedy eats it).

> **A gate whose correctness depends on no author using a common markdown convention is one paragraph
> away from going silent — and its own corpus cannot tell you, because the corpus is what taught it the
> assumption.**

Same shape as #464's plural blind spot in the US-English gate. The general form: *sample the inputs the
corpus does not contain yet.*

### `[GATE]` Adding a surface to a gate's scope is two edits, and the second is the one that rots

`Prism3/skills/**` was added to the US-English gate's scan but not to its `REQUIRED_SURFACES` list —
so deleting the walk dropped two files and the gate still printed a confident `clean`, exit 0. That
is precisely the false-pass class `REQUIRED_SURFACES` exists to prevent, and CLAUDE.md already writes
the rule: coverage follows `regen.ts` for everything *except* surfaces named by hand, and each of
those needs its own line. The comment adding skills even said "named by hand, because skills are not
a `regen` artifact" — and then didn't add the line.

**Whenever scope is widened by hand, the widening and its guard are one change.** Also worth keeping
the run's summary string honest: it still named four surfaces after a fifth was added, so a reader
could not tell from the log whether skills were scanned.


### `[GATE]` The gate's first run found worse than the defect it was written for

It was built for a known drift: `prism3-theme` teaching an adjective→lever mapping #471 replaced. It
found that, and first found something larger — **`prism3-consume` was teaching the pre-rename
`action.*` family.** `docs/20 §11` renamed `action.*` to `interactive.*`; the skill that tells an
agent which tokens to reference still named `color.action.default`, `action.disabled`,
`text.on-action`, `text.disabled`, `text.on-disabled`. An agent following it emits references that
resolve to nothing. **Six distinct dead paths** across seven occurrences, in the one file whose
entire job is naming tokens correctly. (The PR body said "seven dead paths" — that was the finding
count, not the path count, and a review caught it. On a change whose thesis is *shipped prose must
make true claims*, its own count is a claim worth getting right.)

**A rename is a two-tier event.** The token tier renamed cleanly and every gate stayed green, because
no gate read the prose that teaches the names.

### `[SKILL]` The obvious check would not have caught the defect it was written for

"Every name a skill quotes must resolve" is the natural design, and `radiusScale` resolves fine —
what rotted was the prose around it and the total absence of `personality`. Measured *before*
building, which is the only reason the gate has a second, different scan: a **coverage** check, where
a skill declaring `documents: brandInput` must mention every top-level input property or name it in
`omits:`. That is the check that fires on the real class, and reference-resolution never would have.

Generalizes: **a gate built from the defect you already know will catch that defect and nothing
adjacent.** Ask what shape the defect *is* — dead reference, or missing coverage — before choosing a
scan, because they are different mechanisms.

### `[SKILL]` A skill teaching "don't guess this name" must quote a name that doesn't resolve

Unanticipated, and found on the first real run: `prism3-consume` says *"it's
`color.foreground.success-subtle` …, not `color.feedback.success.surface`"*. Both were flagged. The
counter-example is the most useful sentence in the file, and a naive gate punishes it. Exempted by
detecting `not` / `never` / `rather than` / `instead of` immediately before the backtick — with a
self-check asserting the exemption does **not** become a blanket amnesty.

### `[GATE]` Reading a gate's output through `grep` turned a crash into a pass

`matchAll` throws on a non-global regex. It did — and the run was piped through `grep -c`, which
printed `0` and read as *clean*. The gate had crashed before scanning anything.

Third instance of this family in one session, after `grep -i fail | tail` swallowing an exit code and
two unguarded test helpers. **The pattern is always the same: a filter between you and a gate's real
result.** Run a gate bare before believing it; `grep` is for reading output you have already seen
exit 0.

### `[SKILL]` A mutation that does not apply is indistinguishable from one that is not caught

Mutation 1 replaced `` `color.text.primary` `` — a string the file does not contain. Zero findings,
which reads exactly like "the gate misses dead paths". It was a no-op. Confirm the edit landed
(`grep -c` the literal *before* mutating) or a mutation run quietly proves nothing, which is the
failure mode mutation testing exists to prevent.

---

## 2026-08-05 — from implementing `INSTANCE_SWAP` (#487 step 3)

### `[SKILL]` Verify a paste by node ID, never by component name — the file holds your old attempts

The read-back after the first successful paste reported the slot as a `FRAME`, i.e. the exact bug the
paste had just fixed. It was the *previous* paste: `findOne(n => n.name === 'button/size=medium,
leading')` matched #482's component, still sitting in the file with its empty-frame slot. Two
components, one name, and `findOne` returns document order.

The near-miss is what makes this a skill rather than a note. The next move would have been to probe
`createComponentFromNode` for an instance-to-frame conversion that does not exist — a plausible
hypothesis, a real API, and half an hour spent proving something already working was broken. **A
generated artifact whose name is a function of its inputs will collide with every previous run**, and
component names here are exactly that (`button/size=medium, leading`). So: capture the id the paste
returns and read back by `getNodeByIdAsync`, or delete prior artifacts first. Names are for humans.

Related, same root: a paste is only verified when the *binding* is shown live, not present. Present
means `boundVariables.width` has an entry; live means moving the variable moves the node. Mutating
`icon/size/md` to 40, watching the slot become 40×40, and restoring it is three extra lines and it is
the difference between "the write was accepted" and "the write is load-bearing" — the same distinction
the `constrainProportions` finding below turns on.

---

## 2026-08-05 — from implementing the COLOR layer (#487 step 3, second half)

### `[SKILL]` Dump the whole variant grid as a table before believing a paint projection

I wrote the projection, stated in a comment that it handled the appearance-specific rules, and was
wrong about three of them at once: the overlay family was never consulted (so every `outline`/`text`
hover and pressed resolved to its rest value and rendered pixel-identical), `text` disabled grew a fill
*and* a border it never had, and `filled` disabled grew a border. All three were found by printing the
21-cell grid — intent × appearance × state, one row per cell, columns for fill/stroke/ink/icon — and
looking at it. None were found by re-reading the code, including immediately after writing it.

The reason this generalizes: **over a ragged grid, a lookup that silently resolves nothing is
indistinguishable from a lookup that correctly resolved nothing.** `outline` genuinely keys no fill, so
`fills: undefined` on an outline button is right; it is also exactly what a missing overlay lookup
produces. The signal is not in any single cell, it is in the *shape* of the table — two columns that
should differ between rows and don't. A grid you can see has that shape; a grid you reason about does
not. This applies to any per-variant projection, not just paint.

### `[GATE]` A substring assertion against a self-documenting generated string tests the documentation

Two of the new gates passed with the code they guarded deleted:
`ok(js.includes('strokeWeight'))` and `ok(js.includes('setBoundVariableForPaint'))`. Both are true of
the payload with the assignment and the call removed — because the payload carries **comments explaining
why `strokeWeight` and `setBoundVariableForPaint` are needed**. The prose that documents a decision
satisfies the check that the decision was implemented.

`planToPluginJs` output is the one string in this engine that is both a *deliverable* and *heavily
commented*, so every `includes()` against it is exposed to this. Anchor to syntax, not vocabulary:
`/node\.strokeWeight=/`, `/figma\.variables\.setBoundVariableForPaint\(/`. And note what caught it —
**mutation testing, not review**. Writing the assertion and reading it back cannot detect this, because
the assertion looks correct and is correct about a string that contains the word. Deleting the
implementation and expecting red is the only thing that asks the right question. Same family as the
`lint-us-english` self-check that sampled only singulars (CLAUDE.md): a check written from the same
mental model as the thing it checks inherits its blind spot.

### `[SKILL]` One field per Figma API shape — four shapes now, and paints read back somewhere else

`bound` (`setBoundVariable`), `textStyle` (`setTextStyleIdAsync`), `effectStyle`
(`setEffectStyleIdAsync`), and now `paints` (`figma.variables.setBoundVariableForPaint`). Squeezing any
of them into `bound` type-checks, passes every offline gate, and fails only at paste time — the whole
argument for the split, now confirmed a third time.

Paint has two wrinkles the other three do not, both worth checking on any new component:

- **The setter returns a value instead of mutating.** `setBoundVariableForPaint(paint, 'color', v)`
  hands back a *new* paint that must be assigned into the `fills`/`strokes` array. Dropping the return
  value is a silent no-op — nothing throws, nothing lands in `misses[]`.
- **The binding is not where you look for the others.** It lives on the paint object inside the array,
  so `node.boundVariables.fills` is empty on a correctly bound node. Read back
  `node.fills[0].boundVariables.color`. A read-back written by analogy with the dimension one would
  report every paint as `DISCARDED`, or — with the polarity flipped — pass unconditionally.

And **ink for a swapped icon belongs on the VECTORs inside the instance, not the instance** — an
instance fill paints a square behind the glyph. It is a per-instance override and it survives
`createComponentFromNode` plus one further level of instance nesting (measured). Any component with an
icon slot needs this, so it is a field on the plan (`descendantFills`) rather than a paste-time detail.

### `[KB]` Ragged is the design: `filled` restyles its fill, `outline`/`text` overlay it

`filled` expresses hover as a fill change; `outline` and `text` have no fill to change, so they express
it as a translucent overlay. In Figma **both land on the same node's `fills` array** — one array, two
token families, selected by appearance. The KB's component research models states per appearance but
does not name this collapse, because in CSS `background-color` and an `::after` overlay are separate
concerns and in Figma they are one.

The practical consequence for the def tier: a missing key is not necessarily a gap. `outline` keying no
`.fill` is correct. Which means a completeness gate over paint keys cannot be a cross-product check —
it has to know the per-appearance rule, or it will demand keys that should not exist. Related: the same
distinction makes `disabled` cross-cutting over **intent** but not over **appearance** (one gray serves
every intent; it must not give a ghost button a box), which the KB's "one disabled treatment" framing
also does not distinguish.

---

## 2026-08-05 — from probing a real `INSTANCE_SWAP` target (#487 step 3 prep)

The owner authored two components by hand in the test file — an `FPO-default-icon` and a `focus-ring`
component set — and the paste path was probed against them over the live bridge rather than reasoned
about. Everything below came out of that probe. Two of the four are silent-failure findings, which is
the class this file exists for: the plan asserts a capability, nothing throws, and the artifact is
quietly wrong.

### `[GATE]` `constrainProportions` silently drops a dimension binding — and the first diagnosis was wrong

`figmaAnatomyPlan` emits `bound: {width, height}` for every `slot` part, from the one
`size.{size}.icon` key. Against the owner's icon component, only ONE of the two survives, and
neither `setBoundVariable` call throws:

```
setBoundVariable('width', v); setBoundVariable('height', v)   → ["height"]   width dropped
setBoundVariable('height', v); setBoundVariable('width', v)   → ["width"]    height dropped
```

**The cause is `constrainProportions: true` on the node**, which the icon component has (and which
its instances inherit). A proportion-locked node cannot hold two independent dimension bindings, so
the second write evicts the first — plain last-write-wins. Unlock it and both bind:

```
FRAME      constrainProportions=true   → ["height"]            ← one dropped
FRAME      constrainProportions=false  → ["width","height"]    ✅
COMPONENT  constrainProportions=true   → ["height"]
INSTANCE   constrainProportions=false  → ["width","height"]    ✅ verified tracking both axes
```

So the fix is `node.constrainProportions = false` before binding — one line, and it applies to slots
of every node type.

**This entry originally recorded the wrong cause, and how it went wrong is the more useful finding.**
It claimed the limitation was *INSTANCE-specific* and that *which axis survived depended on the
parent's `layoutMode`*. Both were artifacts of the probe design. The "FRAME keeps both" control used a
fresh `createFrame()`, which defaults to `constrainProportions: false` — so the control differed from
the instance in **two** variables at once (node type and proportion lock) while only one was being
attributed. And the apparent layout-mode dependence was just call order differing between the two
probe arms. A control that varies with the treatment is not a control; had the first probe locked a
FRAME or unlocked an INSTANCE, the real cause would have been immediate. **When a difference is
attributed to node type, vary node type alone.**

The `misses[]` point stands and is the durable one: that array only fills when `byName.get(varName)`
finds nothing, so a binding that resolves and is then discarded is invisible to it. A component pasted
this way looks successful, reports zero misses, and has half its icon sizing missing. Generalizing:
*a Figma setter that accepts a call is not a Figma setter that honored it.* #493's
three-namespaces-three-fields rule assumed a mismatch announces itself as a throw; here nothing
announces anything, so **the gate must read the value back** — which is exactly what caught this
correction.

One more trap on the same surface, found while verifying the fix: **`resize()` clears every dimension
binding on the node**, on FRAME, COMPONENT and INSTANCE alike. The original entry prescribed
"`resize()` plus `layoutSizingHorizontal`/`Vertical`" as the fix, which would have destroyed the
binding it was meant to preserve. `resize()` before binding is fine; after is not. `appendChild` into
auto-layout and setting `layoutSizing*` are both safe — bindings survive those.

### `[GATE]` `INSTANCE_SWAP`'s default value is a node ID, not a component key

```
addComponentProperty(name, 'INSTANCE_SWAP', icon.key)  → throws "Property value is incompatible
                                                          with component property type"
addComponentProperty(name, 'INSTANCE_SWAP', icon.id)   → OK  ("leadingVisual#73:0")
```

`key` is the wrong guess in the most plausible way available: it is what `figma_search_components`
returns, what cross-file instantiation consumes, and the stable identifier every other part of this
workflow uses. It is not what this setter wants. Wiring then needs a second, separate step —
`slot.componentPropertyReferences = {mainComponent: propId}` — and the returned property ID carries a
`#nodeId` suffix that must be used verbatim, not the bare name.

This one at least throws, which is why it is a footnote rather than the entry above. Worth recording
because the error message names neither `key` nor `id` and gives a reader no direction.

### `[KB]` The focus ring is an ABSOLUTE sibling — which dissolves the collision, and names the fifth part kind

#493 left the ring's projection open with two options, both lossy: draw it on the target and lose
`appearance: outline`'s border to it, or add a part. The hand-authored component answers it with a
third: `layoutPositioning: ABSOLUTE`, zero children, `clipsContent: false`.

That is strictly better than either option and was not on the list. An absolutely-positioned sibling
has **its own stroke**, so the 550-ring/500-border/550-fill contention over one node's single stroke
simply does not arise, and it takes no space in the row so no geometry shifts. It also confirms the
ring must be a part after all — but a part with a property no current kind has, which is the schema
finding: `anatomy.parts`' four kinds cannot express "does not participate in layout flow." `overlay`
is the near miss and its validation demands `replaces:`, because its semantic is *takes another part's
position*; the ring takes nobody's. The fifth kind is **absolute sibling of the target**, and it stays
the first kind whose materialization needs another component to already exist in the file.

The component set also carries a `color = default | inverse` axis, which lands on emitted pairs
(`color/border/focus`, and the `color/interactive/{intent}/on-inverse/*` family) — evidence for the
"one shared thing with a per-context parameter" reading in the entry below, from a source that had no
reason to be arguing for it.

### `[SKILL]` A hand-authored prototype encodes the structure, not the bindings — read it for the former

The ring's structure is the finding above. Its bindings are all legacy or placeholder: strokes
hardcoded (`#2D65D4` / `#AFC7F3`), radius `0`, and stroke weight bound to a **remote** variable
(`pds/border/width/md`, from the old NB library) while Prism3's own `focus` collection emits
`ring/width`, `ring/offset` and `ring/offset-field` unused. Likewise the icon's vector fill is a
hardcoded gray.

Neither is a defect — a component authored to demonstrate a shape is not a component authored to ship,
and the shape is what was being communicated. But the two read very differently and an agent taking a
handed-over artifact as authoritative will faithfully reproduce its placeholders. **Take the structure
from a prototype and the bindings from the def.** Same shape as "a spec derived from artifacts can be
confidently wrong about intent" below, with the polarity flipped: there the artifact was generated and
authoritative and still wrong about *why*; here it is hand-made and provisional and exactly right
about *what*.

One binding gap is real rather than provisional, and it is the def's: there is no
`color/interactive/{intent}/icon` variable at all. The def routes icon color through `on-fill` and
`text.rest`, so an icon's color has to be set on the vector *inside* the instance as a per-instance
override — a different mechanism from every other binding in the plan, and one the projection has no
field for yet.

---

## 2026-08-04 — from #487 step 2 / #493 (the third namespace, and an unbound state)

### `[SKILL]` Read the ALIAS, not the value

#487 §3 said: bind `focused`, because `color/interactive/{intent}/fill/focused` is emitted and the def
binds it zero times, so the state axis promises a variant that renders identically to rest. The
premise was true. The conclusion was wrong.

```
color/interactive/primary/fill/hover     → palette/red/600
color/interactive/primary/fill/focused   → palette/red/600     ← the SAME alias
color/border/focus                       → palette/red/550
```

`fill/focused` does not merely *equal* `fill/hover` — it **aliases the same palette step**, in all
three intents across all four modes. Binding it would not have fixed "focused renders like rest"; it
would have made focused render like **hover**, which is a worse answer that also looks like progress.

Two emitted names with equal values may be one palette step wearing two hats. **Compare aliases when
deciding whether two tokens are the same decision**, and treat an equal *value* as a question rather
than an answer.

### `[SKILL]` An unbound state is as often a correct def as a gap — ask what it binds INSTEAD

The reason `fill/focused` is unbound is that focus in this system is not a fill change. The def
already says so: `focus-ring → color.border.focus` at a *different* palette step, plus `ring-width`
and `ring-offset`. The binding was not missing; it was somewhere else, one file away.

So before recording "state X binds nothing" as a gap, look for what the def binds *for that state
under a different mechanism*. Verified for Button: `focus-visible`, `pending` and `inactive` all bind
zero color tokens out of the seven values in `states` — but `focus-visible` has the ring, and `pending`
has `anatomy.parts.spinner`. A blanket "three states are unbound" would have been three-for-one wrong.

**Updated (#536 item 4).** `inactive` looked like the residue — a genuine gap with neither token nor
part — and the answer was neither "bound elsewhere" nor "missing". Its *intended* visual is
`disabled`'s by an explicit prior decision (docs/03 item 3, resolved 2026-06-24, where
`disabledStrategy: 'accessible'` IS the KB's contrast-preserving `inactive`; docs/06 defines
`text.disabled` as "disabled / inactive ink"). Its delta from `disabled` is entirely behavioral — tab
order, the a11y tree, `aria-disabled` — so it is now `codeOnly` and the axis carries six.

**So the question "what does it bind instead?" has a third answer past *elsewhere* and *nothing*:
deliberately the same thing as another state.** That case looks identical to a gap from inside the def
and is distinguishable only from the decision record — the search has to include the docs, not just the
sibling fields.

**And then a fourth answer, which #563's review had to measure to find: *intended* the same, and not
actually implemented.** `anatomy-figma.ts` special-cases `state === 'disabled'` only, so `inactive` has
no paint branch and resolves to the **`rest`** paints. The token-tier decision is real and the emitter
has simply never honored it. **A decision record tells you what the system intends; only the emitter
tells you what it does.** Checking the def, the siblings and the docs still left the last question
open, and the answer inverted the consequence — not a duplicate of `disabled`, but a row reading as a
normal enabled button.

### `[SKILL]` A spec derived from artifacts can be confidently wrong about intent

This is the sharper second instance of the "validate the spec against the def" entry below. That one
caught a spec written from a **legacy Figma artifact**. This one was written from the engine's own
**emitted name list** — a generated, current, authoritative artifact — and was still wrong, because a
name list records what exists and not what it is *for*. `fill/focused` appeared present-and-unused;
the def's `focus-ring` slot, which explains why that is correct, is not in any emitted artifact.

**Emitted names tell you what is available. Only the def tells you what was intended.** Read the def
before acting on a gap inferred from artifacts.

### `[GATE]` One namespace per API, and check each against its own name set

Figma has three separate namespaces a part can reference, each with its own API: variables
(`setBoundVariable`), text styles (`setTextStyleIdAsync`) and effect styles (`setEffectStyleIdAsync`).
`FigmaNodePlan` now has three peer fields to match. The failure mode that justifies the symmetry:
**there is no `setBoundVariable('effects', …)`**, so an effect style squeezed into `bound`
type-checks, satisfies every offline gate, and fails only at paste time against a live file — the
most expensive place to learn it.

`planBindingErrors` takes three separate `Set`s for the same reason. A merged set would let a name
pass by matching something in the wrong namespace, and here it would have done real damage: both
shadow ladders emit (`shadow/*` **and** `shadow-dark/*`), so a light-only name would look satisfiable
by its dark twin.

Generalize: **when a projection field maps to a distinct API call, it gets a distinct field and a
distinct verification set.** Convenience merging of name sets trades a real gate for a shorter
signature.

### `[KB]` Effect styles are not mode-aware, so elevation cannot theme the way fill does

A bound color variable resolves per mode, so a bound fill themes across light/dark/hc-\* for free
(#487 §2 — the reason the Prism3 set is half the legacy sheet's width). **Effect styles have no
equivalent.** The engine emits `shadow/*` and `shadow-dark/*` as two distinct names, and a node
references one of them.

So any component with elevation carries a mode asymmetry its fills do not: theme-aware color,
manually-selected shadow. This must be admitted in `anatomy.codeOnly` wherever elevation lands
(#494), and it is a real argument for keeping elevation out of a default variant set rather than a
cosmetic one. Worth feeding back: the KB's component research does not weigh which token categories
survive a mode switch, and the answer is not uniform across them.

### `[SKILL]` The focus ring wants to be a shared nested component, and the schema cannot say so

> **Resolved 2026-08-12 (#741), and worth reading with the resolution attached because the ORIGINAL
> DIAGNOSIS WAS RIGHT ABOUT THE GAP AND WRONG ABOUT WHERE IT WAS.** The schema can now say it:
> `packages/engine/components/focus-ring.ts` is a real def, and Button's `focusRing` part nests it via
> `kind: 'absolute'` + `nests` + `nesting: { kind: 'nest-fixed', variant: { color: 'default' } }`
> (#681's field, and the `absolute` kind rather than the fifth part kind proposed below).
>
> **What #741 measured that this section did not predict.** The remaining gap is not in `anatomy.parts`
> at all — it is three walls further down, and the third is the one nobody would guess:
> `planComponentName` **always** writes a `size=` coordinate, and a ring has no size axis. So a
> projected ring's members are named `size=…` while Button's declared coordinate is `color=default`,
> and `nestVariantMatch` requires a coordinate to account for every axis in the member name.
> **Button's nest is therefore satisfiable only by a hand-built component**, which is what #734's live
> run was resolving against all along (#749). The other two: `paintOf` keys paint as
> `{intent}.{appearance}.{slot}`, so a `color`-axis def projects unpainted (#758); and `PartDef` has no
> stroke field, so a ring's weight and colour have nowhere to be declared (#740). What #741 did move is
> real — the ring's skin (`color.border.focus`, `focus.ring.width`/`style`/`offset`/`offset-field`) now
> resolves against the **engine**, gate-checked per brand, instead of against the placeholder
> `#2D65D4` / remote-variable stroke this section measured in the file.

Owner practice, and it is a better answer than anything the projection could reach for on its own: in
Figma, author the focus ring **once as its own component** and nest it inside every component that
needs a focused state.

It dissolves a collision rather than trading a loss. A ring drawn on the interaction target competes
with `appearance: outline`'s border for the single stroke a Figma node has — at three different
palette steps (550 ring / 500 border / 550 rest fill). A nested ring has its own node, so there is
nothing to resolve. It also removes N-way duplication: the ring is not any one component's
(`focus.ring.*` and `color.border.focus` are top-level families, and `focus.ring.offset-field` already
emits as a separate value — evidence the ring was always meant to be one shared thing with a
per-context parameter).

**The schema gap is the finding.** `anatomy.parts` has four kinds and the ring is none of them: not a
`slot` (that is swappable content the *consumer* supplies), not an `overlay` (validation demands
`replaces:`, and the semantic is *takes another part's position* — the ring takes nobody's), not a
`box`. It needs a fifth kind, and note it would be **the first part kind whose materialization
depends on another component already existing in the file** — every current kind is created from
nothing. That publish-then-nest ordering is the component-tier echo of `materialise-to-figma.ts`'s
create-before-alias pass ordering and needs the same treatment.

*(Answered by the `absolute` kind plus `nests`/`nesting`, not by a fifth kind — see the note at the top
of this section. The publish-then-nest ordering observation stands and is still unbuilt.)*

Also unresolved: `composition.composesWith` exists but is pure documentation — nothing materializes
from it. A nested ring would be the first composition relationship the Figma projection must honor.

---

## 2026-08-04 — from #487 / #488 (Button → Figma, step 1)

### `[GATE]` A shipped skill can be silently invalidated by an engine change

`Prism3/skills/prism3-theme/SKILL.md:82` teaches an agent to "map adjectives → levers — this is the
judgment the brief pays for". #477 replaced that judgment with a controlled vocabulary the engine
resolves *and logs*. An agent following the shipped skill today hand-picks numbers instead of passing
`personality`, losing precisely the audit trail #471 existed to create. Line 61 has the same drift:
`radiusScale` is documented as number-only, and now takes named stops.

**Nothing caught this.** The skills are shipped surfaces with no gate — unlike `out/**`, the schema
contracts and `apps/studio/dist`, all of which the US-English gate scans. A skill that describes a stale API
is worse than no skill, because an agent trusts it. This is the same shape as #281 (no gate reads the
committed artifact), one tier out.

### `[SKILL]` A def can bind tokens it has no API to trigger

Button binds three `on-inverse.label` token slots and has **no** `inverse` prop. It can paint an
inverse button and has no way to ask for one. That inconsistency is why #487 §3's `on-inverse`
question could not be answered from the def — the def genuinely does not say.

Check both directions: every bound token family should be reachable from *some* prop, variant or
state, and every prop that implies paint should have bindings. Neither direction is checked today.

### `[SKILL]` Validate the spec against the def before building from it

#487 was written to be picked up cold. Two of its statements did not survive contact:

- §0.1 lists six state values; §0.4 forbids codifying the legacy sheet's names; the def declares
  **seven**. The six *were* the legacy names. Following §0.1 would have shipped `active`/`focused`/
  `loading` and silently dropped `inactive` — and moved the headline count from the then-correct 756
  to 648. (The projection now *is* 648, via #536 item 4 — but by dropping `inactive` **with a
  `codeOnly` admission and a stated reason**, which is a different act from arriving at the same
  number by copying a stale sheet. Same count, opposite epistemics: one is a decision, the other is
  a coincidence that would have hidden three renames.)
- §4 says `width` "should not be a variant" without noting it *already is one* in `variants`, so the
  action is to move it to `codeOnly`, not to leave it alone. And the slot axis §4 assumes does not
  exist — there is `modifiers`, a differently-shaped axis whose `pending` duplicates a state.

Neither was carelessness; both are what happens when a spec is written from a legacy artifact and the
def has moved. **Read the def first, then the spec, and reconcile explicitly.**

### `[GATE]` An axis Figma will not carry must be admitted, not merely absent

`anatomy.codeOnly` already existed as the place a def admits what the Figma leg drops, and it is
validated non-empty. #488 made the pairing mandatory: a `variants` axis missing from
`figmaProperties.variantAxes` with no `codeOnly` mention is an **error**. It did real work on first
use — it forced Button's two omissions to be written down with reasons instead of quietly vanishing.

Generalize: wherever a projection is allowed to be partial, the omission needs a named home, or
"partial" decays into "incomplete and nobody noticed".

**Updated (#563 review) — "mentions it" is not "admits it", and the fix has to reach every loop.** The
admission was checked by a substring scan over the joined `codeOnly` array, which holds only while no
entry mentions a name it is not about. That condition is violated in practice: `min-width derivation`
contains `width`, so **deleting the `width` admission entirely left the whole suite green.** The check
now requires the entry to LEAD with the name (`name — explanation`, which is how they were all already
written), as a whole word — `-` is deliberately not a delimiter, or `min-width` admits `min` and
`focus-ring-offset` admits `focus`.

Two transferable parts, and the second is the one that cost real time:

- **A gate whose expectation is prose can be satisfied by prose about something else.** Same family as
  the `strokeWeight` gate passing on the comment that explains `strokeWeight`, and the `lint-us-english`
  self-check that sampled only singulars. Third sighting: *a check written from the same mental model as
  the thing it checks inherits its blind spot.*
- **Fixing one call site does not fix the principle.** #563 tightened the *state* admission loop while
  leaving the *axis* loop 25 lines above it on the abandoned scan — with the diagnosis already written
  in the commit message and the PR body. Make the sites share one helper, so the next tightening cannot
  reach one and miss the other. Then mutate the helper: three successive holes in this one check were
  each found by mutating the previous fix, and none by re-reading it.

### `[SKILL]` Check the token tier exists before declaring an axis

#487 §3 proposed an `accent` intent. `grep accent` across the emitted Figma variable names → **0
hits**. The axis was declared in prose and had nothing to bind. Same class: `filled elevated` needs
an elevation binding, and elevation is an *effect style*, not a variable — a different API
(`effectStyleId` vs `setBoundVariable`) that would fail at paste time if squeezed into `bound`.

**Before adding a variant value, resolve it against the emitted names.** A stubbed axis is worse than
a smaller correct set.

### `[SKILL]` Figma property kinds are not interchangeable, and only one carries layout

A Figma BOOLEAN drives one node's `visible` and nothing else. It cannot change an ancestor's
`paddingLeft` — which is exactly what #326's split inline padding needs. So **slot presence must be a
variant axis** while slot *content* is an INSTANCE_SWAP. Any property that implies a layout
consequence has to be a variant; nothing else can express one.

This is the general trap: the dev API shape (a `leadingVisual` prop) and the Figma shape (a variant
axis) diverge for a mechanical reason, and the divergence must be recorded rather than papered over.

### `[SKILL]` State the variant count before building, and re-state it when an axis moves

`3 × 3 × 3 × 7 = 189` today; `× 4` slots = **756**. Payload is ~866 bytes per variant against a 45KB
paste ceiling, so chunking is mandatory rather than an optimization. A test asserts the 189 so that
any axis change has to move a number a reviewer can see.

### `[SKILL]` A test suite that dies on the first defect reports zero, not one

Twice now, in suites written after the lesson. An invalid enum in a traits table threw deep inside
`componentSizes` and took a 1,409-assertion run with it — the static check had already recorded the
real cause, but the report never printed. Fail soft: record the throw, return a sentinel that cannot
compare equal to anything, keep going.

### `[KB]` Where does "inverse / on-color" live — the component or the container?

Unresolved, and the most interesting open question of the batch. Our own research (`docs/20 §9`)
reframed inverse as a **surface context**, explicitly to escape Prism2's hand-mirroring (60 of 122
action tokens). The field is split: Material 3 and Carbon apply it contextually; Adobe Spectrum makes
it a Button prop (`staticColor`) — because context cannot be computed when the ground is a
photograph, which is a case the contextual model genuinely cannot serve.

The consumer lens the KB does not carry: **our components are consumed by CMS component developers**
(Drupal / AEM / Sitecore / SFCC) building larger authorable components. A content author toggles
"dark background" on a *container* — a hero, a promo band. If inverse is a Button property, that
setting must be threaded from the container into every nested button, and then into headings, links,
icons and dividers too — Prism2's mirroring problem re-emerging one tier up, as a variant of every
component rather than a token twin. If inverse is container-scoped context, the author's single
toggle maps to one attribute and every descendant adapts.

So the question is not "is inverse a Button variant" but **"at which tier does inverse live"** — and
the CMS-authoring lens argues for the container. Figma does not force a deviation here: modes set on
an ancestor frame cascade to nested instances, which is the same context mechanism, and is already
the established pattern for dark (#487 §2).

The cost is what makes it a decision rather than a conclusion: the engine emits `on-inverse.*` as
distinct **names**, `CONTRACT_VERSION` went to 1.1.0 *adding* `on-inverse.border`, and collapsing
those into modes would remove ~23 guaranteed paths — a MAJOR contract event plus a deprecation table.

Two things worth feeding back to the KB regardless of which way it goes: the **CMS-authoring lens on
component API design** (the KB's component research assumes an app developer, not a CMS component
developer with a content author downstream), and the observation that **a contextual model needs an
explicit escape hatch for non-token grounds** (imagery, video) — which is what Spectrum's
`staticColor` actually is, and why it is not in conflict with the contextual model.

### `[SKILL]` Only one of five defs is materializable

`button` has an `anatomy` block. `icon-button`, `field-label`, `field-message` and `text-field` do
not — "semantically complete but not materializable", in the schema's own words. Any plan that reads
"apply this to the catalogue" should state which defs it can actually reach.
