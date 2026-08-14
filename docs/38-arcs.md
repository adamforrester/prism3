# 38 — The arcs: sequencing the component tier to its shipping projections

> `14` §6 sketched a build sequence for the component layer and `19` §8 named a first slice.
> Both were written before anything was materialized. Button has now been built into a real
> Figma file end-to-end, which turns those sketches into a question they cannot answer: given
> one working component and four defs that cannot be materialized at all, what order does the
> rest of the work go in, and which lane takes which part.
>
> This file holds that ordering and the reasoning that forces it. It is a **sequencing** record,
> not an architecture one — every architectural claim here is cited from `14`, `19` or `28`
> rather than made here.
>
> **Status: current, re-cut 2026-08-12.** Issue numbers are from `19` §8's 2026-07-28 snapshot and
> were not re-verified when this was written. **Verified 2026-08-12** (filing the arc tracking
> issues): 13 of 16 cited numbers were unchanged. §3 Arc 5 needed a real correction — see its
> 2026-08-12 note.
>
> **What the re-cut changed.** The title, §1 step 3, Arc 4 and §6 originally assumed `19` §3's lean
> that web components are the neutral primary output and React a thin wrapper over it. Two
> independent research passes retired that lean on the named platforms' own published guidance, and
> `19` §3 now carries the ranking and the citations. **Arcs 1–3 did not change** — they are the
> definition layer every projection reads, which is the property `13`'s "projection, not conversion"
> was supposed to buy, now tested by an actual reversal of the output strategy rather than argued.

---

## 1. The flow this is sequencing toward

The target is a loop, stated by the owner on 2026-08-12 and consistent with `14` §6:

1. **Research and fill the component specs** — most defs are missing anatomy blocks and the
   structural fields a materializer reads.
2. **Send each filled spec to Figma** to validate the component data and the anatomy schema
   against a real file, which populates the Prism3 Figma file as a side effect. Via the emitter,
   not the Console MCP: the emitter path is lossless and it is the thing being tested.
3. **Send the confirmed spec and schema onward** to be built as the projections the delivery
   platforms actually consume — `19` §3's ranking, top-down. *(Re-cut 2026-08-12: this step read
   "built as web components, React to follow" until the platform research retired that ordering.)*

Two dependencies sit in front of the loop, both surfaced by the Button build rather than
predicted:

- **A — nested component dependencies.** Icons, form labels, helper messages and focus rings have
  to exist as materializable components before anything can nest them.
- **B — the delivery scaffold.** Re-cut with §1 step 3: the first projection is a token/CSS layer
  plus a class-based skin, so B is a production Style Dictionary configuration, a confirmed token
  pipeline, and the class-name contract that skin emits. **The web-component package, Storybook and
  web fonts move down with ranks 5–6** — they are the scaffold for a projection we are no longer
  building first.

---

## 2. The measured starting position

The table is current as of 2026-08-12, re-verified against `main`. Three rows moved within a day
of this file being written, and the **was** column keeps the position §4 reasons from — because
what changed is itself the evidence §4 now rests on.

| Claim | Evidence | Was, when written |
|---|---|---|
| **Seven component defs exist** | `packages/engine/components/` — `button`, `icon-button`, `text-field`, `field-label`, `field-message`, plus `icon` and `focus-ring` | **five** — until #741 authored the two dependency-A primitives |
| **Six of seven carry an `anatomy` block; all six of those project** | `icon`, `focus-ring`, `button`, `icon-button`, `field-label` and `field-message` carry `anatomy` (`figmaAnatomyPlan` throws without one, `anatomy-figma.ts:235`); `text-field` is the one that does not, and it is the only def `figmaAnatomySet` refuses. Live census as of #795: `button` 648 plans / 1926 paint variables, `icon-button` 162 / 306, `field-label` 4 / 8, `field-message` 4 / 8, `icon` 4 / 0 (paints `inherit` in code, by choice — see its `codeOnly`), `focus-ring` 2 / 2. **`anatomy` is necessary and not sufficient, and #795 is what finally made the sufficiency cheap:** the two defs this row recorded as unprojectable were held out by code *we* wrote, not by anything Figma requires — `figmaAnatomyPlan` demanded a declared `size` axis and `planComponentName` always wrote a `size=` coordinate, so a one-scale def had no name; and `PROJECTABLE_VARIANT_AXES` refused any axis outside Button's three, so `color` and `tone` threw. Both are gone, and the sufficiency condition is now a **declaration**: `figmaProperties.variantAxes` is exhaustive, and a def with none of an axis says so by not listing it | **one, then two, then three, then four, then six** — `32`'s *"Only one of five defs is materializable"* held until #734; this row's own headline said *"three… two of those"* while its evidence already cited `icon.ts` projecting, which is a def that cannot project without `anatomy` (corrected 2026-08-13 in #787, from a live census rather than a re-read). #796 raised it to four; #795 raised it to six. **This row has now been wrong in the same direction four times**, which is the argument for counting from a live `componentDefs` census rather than from this row — and #795 adds the sharper version of that lesson: it also had the two defs' *order* wrong. It said `focus-ring` was held out by one wall and `field-message` by another, when **`field-message` was the nearer def** and both were held out by the same axis wall |
| **The registry exists** | `packages/engine/components/index.ts` exports `componentDefs`; `test.ts` iterates it, and `typecheck-components.ts` asserts in both directions that it holds exactly the defs git tracks | **there is none** — `test.ts:51-55` imported the five defs by name, one line each, `components/` held no index and nothing iterated the set, until #742 |
| **Dependency A has its defs, and the gap moved rather than closed** | #741 authored both. `32`'s *"the schema cannot say so"* is answered — Button nests `focus-ring` via `kind: 'absolute'` + `nests` + `nesting`, and the ring's skin now binds engine tokens instead of a Figma file's placeholders. **What replaced it was more specific and further down:** `planComponentName` **used to write** `size=` unconditionally while a ring has no size axis, so Button's `{color:'default'}` coordinate was satisfiable only by a **hand-built** component; and `PartDef` has no stroke field (#740). The paint wall is **closed** as of 2026-08-13: #758 moved the paint grammar out of `paintOf` and into the def as `paintKeys`, so the ring's stroke colour resolves. **The nest wall is closed as of #795**, and the fix was the direction this row did not consider: not the ring gaining a size, but the *name* losing `size=` where the def declares no such axis — `nestVariantMatch` requires a coordinate to account for every axis in the member name, so a two-member set named `color=default` / `color=inverse` is what Button's declared `{color:'default'}` matches. `focus-ring` now ships `figmaProperties: { variantAxes: ['color'] }` and projects 2 plans / 2 paint variables. **One wall survives: #740.** Read the remaining gap as *"the ring pastes without its stroke"* — a materialization ceiling — not as *"the ring cannot be projected"* | **no defs at all** — and the gap was believed to be in `anatomy.parts` |
| **The mechanism A needs is built** | #734 added `PartDef.nesting` / `NestingRelation` (`component-schema.ts:134`); #750 added the consumer half (`nestVariant` resolution in both executors) | **decided, not built** |
| ~~Dependency B waits on one fork~~ | **Superseded** — see the header. #252 no longer gates the critical path | `19` §7.2 |
| The schema has five undecided questions | `28` §5, filed as #735–#739. All still open | unchanged |
| **Paint is declared by the def, not built by the projector** | `paintKeys` on `ComponentDef` (#758, 2026-08-13). Six distinct grammars across seven defs, not one — `icon` keys `tone.{tone}` with no slot segment, `field-message` keys `{tone}.{slot}`, the same axis name in the opposite order over a disjoint value set (`button` and `icon-button` are the pair that share). **#758 declared the ORDER and #784 the SLOT VOCABULARY, and only both together paint anything.** #758's report claimed five of seven defs could now be painted; **three could** — and that claim is also in #781's **merged commit title** (*"so five of seven can be painted"*), which is left alone deliberately, on #773's terms: rewriting merged history to correct a claim is a worse trade than the claim. Read the title as the belief at the time and this row as the measurement. The other defs' keys were spelled in words `paintOf` never dispatches (`text`, `indicator`, `stroke`, `placeholder`), so they were authored, resolvable and reached at no coordinate: `field-label` 0/3 colour bindings, `focus-ring` 0/2, `field-message` 4/8, `text-field` 6/12. `PAINT_SLOTS` is now the written-down vocabulary and `paintKeyErrors` checks every placeholder segment against its own oracle. `lint-paint.ts` gates the bindings; `component-schema.ts` gates the *order and the vocabulary*, per binding, and the reason given here — *"`focus-ring` has no `size` axis and no census can reach it"* — **stopped being true at #795**, which removed the refusal: the ring is planned and censused now, at 2 plans / 2 paint variables. The check stays where it is on the surviving half of the argument, which is the better half: a **per-binding** check in the schema covers a def whether or not a census reaches it, and that is a property of the check rather than a fact about one def | **`paintOf` hardcoded `{intent}.{appearance}.{slot}`** — Button's axes as though universal, so **five of seven defs projected unpainted**, blocking Arc 2 steps 3 and 5. That count is right for the *cause* and wrong for the *cure*, which is the whole of #784: removing the hardcoded template unblocked five, and only three of the five were spelled in words the projector answers. #781's commit title carries the optimistic reading and stays as history |

The last row is the one that constrains everything. Button was authored around all five open
questions by one person holding them in context. A second anatomy block meets all five at once —
and #734 is exactly that, authored while they were still open, which is why #739 (does `anatomy`
nest inside `ComponentDef`) now has two defs committing to an answer nobody stated.

---

## 3. The five arcs

### Arc 1 — Teach the schema to say what dependency A needs

`component-schema.ts` gains #681's nesting field, and each of `28` §5's five open questions is
either decided or deferred **with the reason recorded**. Deferral is an acceptable outcome; an
open question is not, because it becomes a re-derivation for every author who follows.

**Half done (2026-08-12).** The nesting field landed in #734 (`NestingRelation`, `docs/28` §4.1)
and its consumer half in #750. The five questions are filed as #735–#739 and **all still open**,
so #740's "done when" is not satisfied. #739 is the one that binds: two defs now carry nested
`anatomy` blocks, so authoring a third commits to that answer by default — the inherit-instead-of-
choose error #656 and #681 both turned on.

`28` §6's stated next step — formalize Button's anatomy, then spike it into Figma — is complete.
This arc is what replaces it.

### Arc 2 — Author the dependency-A primitives, then compose upward

Order is set by the dependency graph:

1. ~~**`icon`**~~ — **done in #741.** The swap target Button already nominates. Four projected
   members, one per grid rung; `tone` is admitted in `codeOnly` because `paintOf` cannot key it.
2. ~~**`focus-ring`**~~ — **authored in #741; projects as of #795.** The def is real and its six
   bindings are gate-checked per brand, which is what moved the ring's colour, weight, style and
   offsets out of the Figma file. It now also ships `figmaProperties: { variantAxes: ['color'] }` and
   projects **2 plans / 2 paint variables**, with Button's declared `{color:'default'}` nest coordinate
   satisfiable by a projected set rather than only by a hand-built component. **The step ending in a
   live Figma run is the one part of this item still open** — and it is now open on *scheduling*, not
   on a wall. What this item recorded as three structural walls was two: `figmaAnatomyPlan`'s demand
   for a declared `size` axis and `planComponentName`'s unconditional `size=` are **one wall seen from
   two sides**, which this entry half-noticed and still counted twice; the genuinely separate second
   wall was `PROJECTABLE_VARIANT_AXES`, which refused `color` whatever the size requirement said, and
   which this entry recorded as the *lesser* obstacle. #795 took both down together, because either
   alone is worse than neither. **#740 survives** — `PartDef` has no stroke field — so the ring pastes
   without its stroke. Carry into item 5: nesting a shared primitive by a non-size coordinate is a
   solved problem now, and the thing to carry is the declaration, `variantAxes` being exhaustive.
3. ~~**`field-label` and `field-message`** gain anatomy blocks.~~ — **authored in #796; both project
   as of #795.** Both blocks are real and gate-checked, and the grammar and the projection are still
   different things (§2's *necessary and not sufficient*) — what changed is that the sufficiency is now
   a declaration a def can simply make.
   `field-label` entered the paint census — 4 members, 12 grid coordinates, 4/4 colour bindings
   reachable — which needed a schema addition: `PartDef.paintSlot`, because `paintOf` takes a slot and
   never sees which part asked, so a def's SECOND text node was painted with the first one's ink. That
   was a third instance of #784's defect class found inside #784's own fix, and it is why arm 3 of
   `lint-paint.ts` (which enumerates coordinates rather than reading declarations) is the only gate
   that could see it. `field-message` now projects **4 members / 8 paint variables** over `tone` and no
   size axis at all. **The reason recorded here for it being unprojected was the wrong one**, and the
   correction is the more useful half of #795: this said it was held out for `focus-ring`'s exact reason
   — one type scale, `figmaAnatomyPlan` requiring a `size` axis — and its own def header went further,
   claiming as *verified* that it would project with no further work the day that requirement was
   relaxed. Measured on the branch that relaxed it: **1 plan, 0 paint variables.** The binding
   constraint was `PROJECTABLE_VARIANT_AXES` refusing `tone`; the verification behind the claim probed
   `figmaAnatomyPlan` **by hand**, where a `tone` coordinate is supplied and all eight bindings do
   resolve, while the claim is about `figmaAnatomySet`, which refused `tone` and enumerated one plan at
   `coord={}`. See `32` for the write-up (two entries, #825 and #795): a comment claiming a def would
   project under condition X is a testable claim, and nothing tested it.
4. ~~**`icon-button`**~~ — **already done, out of order, in #734.** It was taken before the
   primitives on my instruction, and it succeeded for the reason §4 now records: its nested
   references resolved against Figma content the Button build left behind, not against defs. That
   makes items 1 and 2 more urgent rather than less — the mechanism is proven and the primitives it
   resolves are still undefined.
5. **The text-field family** — consumes all three primitives, and unblocks textarea, select,
   search and password.

Each step ends in a live Figma run, because a spec that has not been materialized has not been
validated. That is step 2 of §1's loop, running per component rather than per batch.

### Arc 3 — The registry

A real `components/index.ts` exporting the set, read by `test.ts`, `typecheck-components.ts` and
`lint-payload-manifest.ts`. Small, and a hard prerequisite for step 3 of the loop: every code
projection in `19` §5 — the `.ai.json` registry, generated stories, Code Connect — is an
iteration over a set that does not currently exist.

One constraint from the existing gate. `typecheck-components.ts` asserts every tracked def is
represented in what tsc actually read, so the registry has to *be* the thing the gate reads. A
second list maintained beside it would restore the defect that gate was written for.

**Shipped 2026-08-13 (#742), with one claim above corrected.** `components/index.ts` exports
`componentDefs`; `test.ts` iterates it instead of restating the five; and `typecheck-components.ts`
gains a registry arm in both directions — every tracked def file must contribute an export to the
set, and every set member must come from a tracked def file — with **git's index still the oracle**,
the registry only ever its subject. **`lint-payload-manifest.ts` was not a consumer and is
unchanged**: it maintains no def list at all. Its universe is *generated artifacts* (`out/**` plus
`ENGINE_ARTIFACTS` / `SCHEMA_ARTIFACTS` imported from `regen.ts`), and the defs are hand-authored
source, so wiring the registry into it would have invented a coupling rather than removed a second
list. The line above listing it as a reader was written from the assumption, not from the file.

### Arc 4 — The class-based skin projection

**Re-cut 2026-08-12.** This arc read *"Dependency B, the library scaffold — blocked on #252"* until
the platform research reordered `19` §3. It is no longer blocked, and it is no longer the library.

The first new projection is a **class-based skin**: `anatomy` + `variants` → semantic CSS classes
over the markup a platform already generates. Rank 2 in `19` §3, and it is the nearest new work
because rank 1 — the token/CSS layer — ships today.

Three things make this arc smaller than the one it replaces:

- **It reads what Arcs 1–3 build**, and nothing else. No behavior layer, no framework, no bundler.
- **Both named platforms consume it natively.** AEM Edge Delivery decorates server-generated HTML
  with classes; Drupal themes use atomic component classes. One artifact, two platforms.
- **Rank 1 + rank 2 together are `27` Idea 2's AEM starter**, corrected — a tokens clientlib plus a
  skin over platform markup, with zero dependence on a component library, React, or web components.
  That is the nearest deliverable with commercial value, and it does not wait on the code leg.

The old sequence (#252 → #253 → #256 → #254 → #257/#258) still describes ranks 5–6 and is deferred
with them, **not cancelled**. `19` §8's first slice remains the plan for the framework tier when
that tier's turn arrives.

One constraint carries forward unchanged: `packages/tokens/README.md` states that a production
Style Dictionary configuration must be a **second file**, never merged into the consumer one,
because the consumer configuration's value is entirely conditional on staying naive.

### Arc 5 — Clear the in-flight debt

#718's remainder, #533's status surface, #618's copy rule. None of it is on the critical path. Two
items block a lane: #721's model and #618's answer are both prerequisites for the plugin lane's
next pick.

**Corrected 2026-08-12, verifying every issue number this doc cites (never done at time of
writing — see the header note).** Three of the numbers above had already moved by the time this
was read again, all in the direction of *less remaining*, not more:

- **#680 and #701 are closed** (completed, merged as #710 and #705) — dropped from the debt list
  rather than left as stale "to clear" items.
- **The "implementation tickets for #720 and #721" line was already wrong when read.** Both exist:
  **#722** (implements #721's do-now model) shipped and closed, merged as #727. **#723** (implements
  #720's dialog) is open, sequenced after #722 by its own text. Filing new tickets here would have
  duplicated both. #721's model still blocks the plugin lane's next pick per the sentence above —
  that dependency is unchanged; only the "someone needs to file this" framing was stale.

---

## 4. Why the ordering is forced

The tempting second component is `icon-button`, because Button was just built and the two share an
anatomy. The conclusion — primitives first — holds. **The argument this section first gave for it
was wrong, and events falsified it within a day.** The correction is kept rather than overwritten,
because the replacement is a reason the prediction could not have surfaced.

**What was predicted.** `icon-button` declares `{ name: 'icon', type: 'slot', required: true }` — a
nested component that is not optional and is the whole content. Building it before `icon` exists
would therefore mean either materializing a placeholder, which validates nothing, or nominating a
target that does not resolve, which `anatomy-figma.ts` reports as a miss rather than substituting
for.

**What happened.** #734 authored IconButton's anatomy and materialized it live — 162 members, every
predicted number confirmed, no miss. #750 then built the `nest-fixed` resolution its `focusRing`
part needs. Neither hit the failure predicted above.

**Why it resolved, and why the conclusion survives.** Both nested references resolved against
components the Button build had already left in the Figma file — an icon component and a
focus-ring set **that no def describes**. So those runs validated the swap and nest-resolution
*mechanism*, not the primitives. The Figma file is currently the source of truth for what an icon
and a focus ring are, which is precisely the inversion `14` §1 exists to reject: a component
defined by the artifact instead of the artifact projected from the definition.

That is a stronger reason than the one it replaces, and a worse failure mode. **A def that resolves
against hand-made canvas content passes every gate we have while proving nothing about the def.**
The predicted failure was loud; the real one is silent and reads as a pass.

The same holds one tier up, restated: the text-field family nests a label, a message and an icon.
It will not fail to materialize if someone hand-makes those parts in Figma — it will *succeed*, and
validate nothing. **The primitives are not preliminary work in front of the interesting components.
They are the components whose absence lets the interesting ones pass without being measured.**

There is a second reason to take them first, from `28` §4's ceilings discipline, and #734
demonstrated it rather than leaving it hypothetical: a primitive authored against a new schema
field is the smallest possible test of whether that field can express what it claims. #734's
axis-parity gate caught two phantom single-valued variant properties that would have shipped —
found on one def, at one def's cost. Discovering the same class of error while authoring the
text-field family costs four.

---

## 5. Lane assignment

| Lane | Takes |
|---|---|
| PR reviewers (local, cloud) | unchanged |
| token-press | its own queue — off the critical path, correctly |
| Figma plugin | Arc 5, then consumes Arc 1's field |
| emitter | **Arc 1, then Arc 2** — the critical path |
| cloud worker A | **Arc 3**, then Arc 4 once #252 is called |
| orchestrator | this plan, and framing §6's decision |
| issues manager | files Arc 1's schema decisions and Arc 5's implementation tickets |
| research agent | **step 1 of §1's loop, running ahead** — component research against the brief corpus, producing anatomy prose so Arc 2's authoring is transcription rather than research |

The research lane is the assignment worth stating explicitly. It is the only one that can build a
queue *in front of* the critical path rather than behind it, and `14` §6 already names the brief
corpus it would read.

---

## 6. What this plan no longer waits on

**Re-cut 2026-08-12.** This section read *"the decision this plan waits on — #252, author-headless
vs. wrap,"* and named it as the thing Arc 4 could not be scoped without. **That is no longer true,
and the correction is worth more than the fact.**

#252 governs the *behavior* layer — state machines, keyboard model, a11y — which only ranks 5 and 6
need. Ranks 1 and 2 are a token layer and a class-based skin: no behavior layer, therefore no fork
to settle. It stays **parked rather than answered**, and answering it now would be work spent on the
tier we deferred.

**Two corrections to #252's own framing are recorded on the issue**, because the decision was
badly posed rather than merely premature: all three candidates it names (Radix, React Aria, Ark)
peer on `react`/`react-dom`, so "wrap an existing library" under a neutral-primary output would
have imported React into the neutral output; and the one genuinely framework-agnostic option —
Zag's machines, which carry no peer dependencies — is the layer *underneath* the candidate the
issue named as agnostic.

**The coupling that made it feel urgent is real but deferred with it.** #681 holds that exposure is
the component's public API — a nested part the def exposes projects into a property, an `.ai.json`
option and a Storybook control. If the behavior layer wraps a library, part of that surface belongs
to the library and the def becomes a mapping rather than a one-to-one source. That bites when ranks
5–6 are built, not before, and Arc 1 proceeds either way.

**The general lesson, which is why this section was kept rather than deleted.** #252 was filed as a
first-slice blocker and treated as one for two weeks. It was never a blocker; it was a decision
about a tier nobody had established was first. **A decision inherits the urgency of the plan that
cites it, and a plan can be wrong about its own order.** The fix was not answering it faster — it
was asking which platforms consume what, which nobody had written down.

---

## 7. The studio cleanup, and the boundary it does not cross

**Written 2026-08-13; the cleanup it scopes completed 2026-08-14.** §6 covers dependencies; this section
covers scope boundaries. Different questions, so different sections. After an external review of the
repo the owner called the `apps/studio/` cleanup (#768, then blocked by #767) the priority, and accepted
pausing other work for it if that is what it takes. The measured scope of that pause was much narrower
than the sentence sounded, and the boundary belongs here rather than only in the issue, because this is
the file a lane reads before picking up an arc.

**That pause has been served, and both issues are closed.** #767 landed the headless smoke suite that
made refactoring `main.ts` safe, and #768 closed once all four seams landed — #769 (stylesheet extracted
to `apps/studio/src/styles.css`), #770 (scoped class names), #771 (the workspace as the update unit) and
#772 (declared page chrome). `apps/studio/lint-classes.mjs` is deleted, which was the done condition
#768 set for itself: the gate existed only because the flat namespace made collisions possible, so
retiring it is the proof that scoping made them impossible. The boundary below is kept rather than
deleted — it is the record of how the scope of a priority call was measured, and the next such call
will be posed the same way.

**Arcs 1 through 4 do not pause.** They are engine-side — `packages/engine/`, and the defs under
`packages/engine/components/`. The cleanup is `apps/studio/`: four seams inside one file
(`apps/studio/src/main.ts`) plus the gates coupled to it by path. The overlap is near-zero, so the
priority call and §3's critical path are not in contention, and reading the call as "pause the arcs"
would stop the definition layer for a refactor that never touches it.

**What should queue behind the cleanup is the other studio work**, which is two pieces:

- **#388's Part B** — the tier-reflecting UI, itself already pending #377, so queueing it costs nothing
  it was not already waiting on.
- **The #267 / #328 IA decisions.** Convenient rather than expensive: #766 parked the reviewer's
  tier-based IA wireframe on exactly those two issues — as wireframe-and-validate, not an approved
  build — so the queue behind the cleanup is where that proposal was already sitting. IA work landing
  on a cleaned-up file rather than fighting one is the better order independently of the priority call.

**The timing argument, recorded because it decays.** 2026-08-07 merged ~10 studio fixes and cleared that
backlog; there are currently zero open studio PRs, so `main.ts` is at its least-contended point. Every
week that passes re-accumulates in-flight work for a refactor of that file to collide with. So if this
section is being read later with studio PRs open again, the cheapness half of the argument has expired,
and the sequencing is worth re-deciding rather than inheriting.

---

*Cross-refs: `14` §6 (the build sequence this re-sequences), `19` §3/§7/§8 (output target, open
decisions, first slice), `28` §4/§5/§6 (the anatomy schema, its open questions, its completed next
step), `32` (the build learnings this reads its starting position from), `34` (gate independence,
which Arc 3's registry constraint is an instance of), `37` (the tier above this one).*
