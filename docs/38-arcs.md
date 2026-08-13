# 38 — The arcs: sequencing the component tier to shipping web components

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
> **Status: §§1–3 Arcs 1–3 current; Arc 4 and §6 SUPERSEDED, 2026-08-12.** Issue numbers are from
> `19` §8's 2026-07-28 snapshot and were not re-verified when this was written. **Verified
> 2026-08-12** (filing the arc tracking issues): 13 of 16 cited numbers were unchanged. §3 Arc 5
> needed a real correction — see its 2026-08-12 note.
>
> **What is superseded, and by what.** This file's title, §1 step 3, Arc 4 and §6 all assume
> `19` §3's lean that web components are the neutral primary output and React a thin wrapper over
> it. Two independent research passes (knowledge-base PR #12 and a second-model validation run,
> both 2026-08-12) retired that lean, on the named delivery platforms' own published guidance:
> Adobe steers new AEM projects to Edge Delivery Services, whose FAQ states *"Web Components can
> be used in Edge Delivery Services projects, but they are not the default recommendation"*
> (`aem.live/docs/faq`, fetched 2026-08-12), and Drupal's component story runs through Single
> Directory Components and Twig. The ranked projections are now: **token/CSS layer → class-based
> skin over platform markup → platform metadata (AEM Universal Editor, Drupal SDC) → React → web
> components → native.** So Arc 4 becomes *the class-based skin projection*, unblocked, and #252
> drops off the critical path rather than gating it.
>
> **Arcs 1–3 are unaffected and remain the critical path.** They are the definition layer, and
> every projection on that list reads them — which is the property `13`'s "projection, not
> conversion" was supposed to buy, now tested by an actual reversal of the output strategy. The
> re-cut of Arc 4, §1 step 3, §6 and the title lands in its own PR; it is stated here rather than
> applied so this file is discoverable now — two lanes have already been blocked looking for it.

---

## 1. The flow this is sequencing toward

The target is a loop, stated by the owner on 2026-08-12 and consistent with `14` §6:

1. **Research and fill the component specs** — most defs are missing anatomy blocks and the
   structural fields a materializer reads.
2. **Send each filled spec to Figma** to validate the component data and the anatomy schema
   against a real file, which populates the Prism3 Figma file as a side effect. Via the emitter,
   not the Console MCP: the emitter path is lossless and it is the thing being tested.
3. **Send the confirmed spec and schema onward** to be built as web components, React to follow.

Two dependencies sit in front of the loop, both surfaced by the Button build rather than
predicted:

- **A — nested component dependencies.** Icons, form labels, helper messages and focus rings have
  to exist as materializable components before anything can nest them.
- **B — library setup.** The web-component package, Storybook and its documentation template, web
  fonts, a production Style Dictionary configuration, and a confirmed token pipeline.

---

## 2. The measured starting position

The table is current as of 2026-08-12, re-verified against `main`. Three rows moved within a day
of this file being written, and the **was** column keeps the position §4 reasons from — because
what changed is itself the evidence §4 now rests on.

| Claim | Evidence | Was, when written |
|---|---|---|
| Five component defs exist | `packages/engine/components/` — `button`, `icon-button`, `text-field`, `field-label`, `field-message` | unchanged |
| **Two of five are materializable** | `button.ts` and `icon-button.ts` carry `anatomy` blocks; `figmaAnatomyPlan` throws without one (`anatomy-figma.ts:235`) | **one** — `32`'s *"Only one of five defs is materializable"* was true until #734 |
| **The registry exists** | `packages/engine/components/index.ts` exports `componentDefs`; `test.ts` iterates it, and `typecheck-components.ts` asserts in both directions that it holds exactly the defs git tracks | **there is none** — `test.ts:51-55` imported the five defs by name, one line each, `components/` held no index and nothing iterated the set, until #742 |
| Dependency A has no defs | No `icon`, no `focus-ring` — still true, and now the sharpest gap in the file. `32`: *"The focus ring wants to be a shared nested component, and the schema cannot say so"* | unchanged |
| **The mechanism A needs is built** | #734 added `PartDef.nesting` / `NestingRelation` (`component-schema.ts:134`); #750 added the consumer half (`nestVariant` resolution in both executors) | **decided, not built** |
| ~~Dependency B waits on one fork~~ | **Superseded** — see the header. #252 no longer gates the critical path | `19` §7.2 |
| The schema has five undecided questions | `28` §5, filed as #735–#739. All still open | unchanged |

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

1. **`icon`** — the swap target Button already nominates, and the one every other component needs.
2. **`focus-ring`** — the absolute sibling `32` describes, and the shared-nested case that
   motivated #681.
3. **`field-label` and `field-message`** gain anatomy blocks.
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

### Arc 4 — Dependency B, the library scaffold

Blocked on #252 (§6). Once called, the sequence `19` §8 already implies: #252 → #253 (brand-token
flow into the library) → #256 (the code leg: web components, Storybook, `.ai.json`) → #254 (docs
surface) → #257 and #258.

One constraint is already recorded and worth carrying forward: `packages/tokens/README.md` states
that a production Style Dictionary configuration must be a **second file**, never merged into the
consumer one, because the consumer configuration's value is entirely conditional on staying naive.

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

## 6. The decision this plan waits on

**#252 — author-headless vs. wrap.** `19` §7.2 records that this fork has no lean anywhere, and
Arc 4 cannot be scoped without it.

It does not block Arcs 1 through 3, and this file was filed rather than held for it. But there is
a coupling worth knowing. #681's decision holds that **exposure is the component's public API** —
a nested part the def exposes projects into a web-component property, an `.ai.json` option and a
Storybook control. If the behavior layer wraps an existing library, part of that public surface
belongs to the wrapped library and the def stops being a one-to-one source, becoming a mapping.
That is a step-3 concern rather than a schema-shape one, so Arc 1 proceeds. It is also the reason
to settle #252 before Arc 1's exposure work hardens around the assumption that the whole surface
is ours.

---

*Cross-refs: `14` §6 (the build sequence this re-sequences), `19` §3/§7/§8 (output target, open
decisions, first slice), `28` §4/§5/§6 (the anatomy schema, its open questions, its completed next
step), `32` (the build learnings this reads its starting position from), `34` (gate independence,
which Arc 3's registry constraint is an instance of), `37` (the tier above this one).*
