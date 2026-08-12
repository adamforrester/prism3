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
> **Status: current plan, one open decision.** §6 names the single decision the plan waits on.
> Issue numbers are from `19` §8's 2026-07-28 snapshot and were not re-verified when this was
> written. **Verified 2026-08-12** (filing the arc tracking issues): 13 of 16 cited numbers were
> unchanged. §3 Arc 5 needed a real correction — see its 2026-08-12 note.

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

Everything in this section was read from the tree on 2026-08-12.

| Claim | Evidence |
|---|---|
| Five component defs exist | `packages/engine/components/` — `button`, `icon-button`, `text-field`, `field-label`, `field-message` |
| Only one is materializable | `button.ts` alone carries an `anatomy` block; `figmaAnatomyPlan` throws without one (`anatomy-figma.ts:235`). Already recorded in `32` as *"Only one of five defs is materializable"* |
| There is no component registry | `test.ts:51-55` imports the five defs by name, one line each. Nothing iterates the set |
| Dependency A has no defs | No `icon`, no `focus-ring`. `32` names the gap: *"The focus ring wants to be a shared nested component, and the schema cannot say so"* |
| The mechanism A needs was decided, not built | #681's nesting kinds — swap, nest-fixed, nest-exposed — plus the fixed variant a nest declares |
| Dependency B waits on one fork | `19` §7.2 — author-headless vs. wrap (#252), *"the one genuinely open fork, no lean recorded anywhere"* |
| The schema has five undecided questions | `28` §5 — gap scale, `align` as a prop, the `trailingVisual` split, the `padding-x` migration, and whether `anatomy` nests |

The last row is the one that constrains everything. Button was authored around all five open
questions by one person holding them in context. A second anatomy block meets all five at once.

---

## 3. The five arcs

### Arc 1 — Teach the schema to say what dependency A needs

`component-schema.ts` gains #681's nesting field, and each of `28` §5's five open questions is
either decided or deferred **with the reason recorded**. Deferral is an acceptable outcome; an
open question is not, because it becomes a re-derivation for every author who follows.

`28` §6's stated next step — formalize Button's anatomy, then spike it into Figma — is complete.
This arc is what replaces it.

### Arc 2 — Author the dependency-A primitives, then compose upward

Order is set by the dependency graph:

1. **`icon`** — the swap target Button already nominates, and the one every other component needs.
2. **`focus-ring`** — the absolute sibling `32` describes, and the shared-nested case that
   motivated #681.
3. **`field-label` and `field-message`** gain anatomy blocks.
4. **`icon-button`** — the second composed component. It consumes `icon`, it is the first def to
   exercise `inherits`, and Button proved the machinery so the run is cheap.
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
anatomy. The dependency graph says otherwise, and the reasoning generalizes past this one choice.

`icon-button` declares `{ name: 'icon', type: 'slot', required: true }` — a nested component that
is not optional and is the whole content. Building it before `icon` exists means either
materializing a placeholder, which validates nothing, or nominating a target that does not
resolve, which `anatomy-figma.ts` reports as a miss rather than substituting for. Neither outcome
answers the question a live run is being spent to answer.

The same holds one tier up: the text-field family nests a label, a message and an icon, so it
cannot be validated until all three are real. **The primitives are not preliminary work in front
of the interesting components. They are the components whose absence makes the interesting ones
unmeasurable.**

There is a second reason to take them first, from `28` §4's ceilings discipline. A primitive
authored against the new schema field is the smallest possible test of whether that field can
express what it claims. Discovering the field is wrong while authoring `icon` costs one def;
discovering it while authoring the text-field family costs four.

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
