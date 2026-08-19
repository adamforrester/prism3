# 41 — Internal and ejected: where the line falls

> `39` decided what a component projects into and at what width. `40` decided which components. This
> doc decides the thing both of them assume and neither states: **which side of the eject boundary
> the component definition lives on.** The answer is that the def is **internal** — an instrument for
> building the Prism template and holding design, code and platforms to one structure — and that what
> travels to a client is the *contract the def encodes*, not the def. Stated the other way round,
> because that is the half people get wrong: **we eject the rules, the metadata and the skills; we do
> not eject the format.**
>
> Scope: this draws one line and says what falls either side of it. It does not design the
> conformance checker, write the skill, or specify the metadata projection's schema — all three are
> named here and built separately.

---

## 1. The decision

| | side | why |
|---|---|---|
| `ComponentDef` (the TypeScript, the schema, `componentDefs`) | **internal** | §2 |
| the Figma materializer and its paint executor | **internal** | it reads a def; a client has none |
| the def-driven gates (`lint-paint`, `lint-absolute-inset`, `typecheck-components`, `test.ts`) | **internal** | same |
| **the component API contract** — the rules a conforming component obeys | **ejected**, as prose | §3 |
| **the authoring checklist** — manifest entry, metadata file, token refs, a11y contract | **ejected**, as a skill | §3 |
| **a conformance checker** over the produced artifacts | **ejected**, and it is the load-bearing half | §4 |
| **the component metadata** at `39`'s three widths | **ejected** | §5 |
| **the code projection** (vanilla HTML/CSS first) | **ejected** | §7 |

The consumer-facing story that follows: *a client's team adds a component by building it, writing its
metadata and docs to a documented shape, and running a checker that tells them whether it conforms.*
They never see a def, never learn our schema, and never maintain a TypeScript authoring pipeline they
did not ask for.

## 2. Why the def is internal — and it is **not** a byte argument

The tempting argument is that a def is mostly engine plumbing and therefore not worth handing over.
**That argument is false and the measurement says so.**

Byte census over all seven defs, `Buffer.byteLength(JSON.stringify(...))`, measured **2026-08-19**:

| slice | bytes | share |
|---|---|---|
| `anatomy` | 31,719 | 34.4% |
| `props` | 15,602 | 16.9% |
| `tokens` | 9,874 | 10.7% |
| `docs` | 8,017 | 8.7% |
| `accessibility` | 7,535 | 8.2% |
| `ai` | 4,956 | 5.4% |
| `notes` | 4,292 | 4.7% |
| everything else | 10,214 | 11.1% |
| **whole set** | **92,209** | 100% |

And the slice that exists **only** to serve our emitters — top-level `figmaProperties` and
`paintKeys`, plus the materializer-only keys inside `anatomy` (`paintSlot`, `inset`, `strokeInset`,
`ring-bounds`, `ring-radius`, `x`, `y`, `overlaysWhenAbsent`, `replaces`):

**2,056 bytes. 2.23% of the corpus.**

So 97.8% of a def is material a client would find meaningful. **The byte argument runs the wrong
way, and the real argument is better:**

*Read "meaningful" precisely.* It means **worth reading before writing the ejected prose**, not
verbatim client-ready. `button.ts`'s `codeOnly` entries are dense with internal issue references
(#801, #827, #740) in a way `field-label.ts`'s are not — Button is this repo's most-iterated def, so
that is plausibly an outlier rather than the norm. The distinction does not move the argument below,
which is about where correctness is enforced, but it does mean the ejected prose is **derived from**
these fields rather than copied out of them.

> **A def's correctness does not live in its schema. It lives in the gates.**

`paintKeys` reads `["tone.{tone}"]` — three words, and `lint-paint.ts` arm 1 is what makes it true,
asserting a rule at zero across 90 bindings with four exceptions named per key and checked in both
directions. `inset` is 40 bytes and is only correct in the presence of `strokeInset` *and* the nested
def's stroke width, which is `lint-absolute-inset.ts`'s whole subject and the thing that took #801,
a repaired gate, and a third independent gate to get right. A client editing either field gets
something that typechecks, resolves, and paints the wrong thing — **#802's class exactly, the most
expensive defect family this repo has.**

Ejecting the format without the gates ejects the sharp edge and keeps the safety net. That is the
argument. It is about where correctness is enforced, not about how many bytes are ours.

**One error is recorded here rather than quietly fixed**, because it is the repo's most-repeated
shape and it happened while writing this section. The first pass at the engine-only figure counted
`anatomy.codeOnly` as engine plumbing, on the strength of its name, and returned **31.2%** — a
number that would have made the tempting argument look sound. `codeOnly` is **24,319 bytes, 26.4% of
the corpus**, and it is the opposite of plumbing: a per-def prose record of *what structure does not
survive the trip to Figma*, validated by `component-schema.ts` so an omission is an admission rather
than a gap. It is arguably the single most useful field to a developer writing the vanilla
implementation. **A number correct for what it measured and wrong for what it was labelled**, caught
by reading the schema instead of trusting the identifier — which is the only thing that ever catches
it.

**A drift note for anyone quoting `39` §4.** That census measured **88,557** bytes on 2026-08-14.
Five days later the same measurement returns **92,209** — **+4.1%**. Both are right for their dates.
The ratios `39` argues from are unmoved; the absolute figures are not quotable without a date.

## 3. What the split relocates: consistency becomes advice

Be clear about what this decision costs, because it is easy to state the split and not notice.

If the def is internal, a client's new component **has no def**. Nothing derives its docs, its
metadata entry, its manifest row, or a Figma projection. Every artifact the def would have generated
has to be produced by hand — or by an agent — and kept mutually consistent.

That is a **strictly weaker mechanism than the one we use on ourselves**, and weak in exactly the way
this repo already has a name for. The house rule is *enforced, not remembered* — it is written into
`CLAUDE.md` about US English, and `34` is a document-length argument that a rule without an
independent check reports clean over everything it cannot see. **A checklist is remembered.** Handing consumers a checklist where we hold gates is
`34` shape 9 with the corpus moved outside the building.

Two consequences follow if nothing closes it:

- **The client's kit becomes two-tier.** Our eighteen carry complete, consistent, generated metadata;
  theirs carry whatever the checklist got them. The client notices, and *"why are your components
  better documented than the ones we added"* becomes a support question with no good answer.
- **Drift is undetectable from our side.** We ship a template and never learn whether it held.

## 4. The conformance checker — the half that makes the split hold

The remedy is small and it is the thing to build first.

**Eject a checker that reads the produced artifacts and asserts they conform.** Not "does your def
typecheck" — there is no def. Rather, for a component the client names:

- a metadata entry exists at the documented shape, carrying the required fields
- a docs entry exists and covers the required sections
- the manifest names it
- every token reference resolves against the brand's emitted token tree
- the naming conventions hold — component id, part names, state and variant names against the closed
  vocabularies (#821)
- the a11y contract is present and non-empty

**Every one of those is checkable from the outputs alone.** That property is not incidental — it is
what makes the checker indifferent to *how* the component was authored: by hand, by an agent reading
our skill, through an MCP inspection of a Figma file, or one day by a def if a client ever wants one.
The checker constrains the result, never the method, which is the only coupling loose enough to
survive contact with a client's own way of working.

Three properties it must have, each of which this repo has already paid to learn:

1. **Both directions.** A declared component with no artifacts fails, and an artifact naming a
   component nobody declared fails. `lint-payload-manifest.ts` and `lint-overlay-completeness.ts` are
   the precedents; one-directional scope is how a gate reports clean over an empty set.
2. **Its expected value must not come from the thing it checks.** The shape it asserts is read from
   the *published contract*, never from a scan of what the client happens to have produced. A checker
   that derives its expectations from the corpus agrees with the corpus. `34`, shape 1.
3. **It must be mutation-tested before it ships**, against a client-shaped fixture rather than
   against ours — delete a required field, misname a state, point a token ref at nothing, and confirm
   *this* checker is among the failures **by name**.

**And the skill and the checker will drift.** The skill will say *"your metadata entry must carry
fields X, Y, Z"*; the checker will assert the same list; the two are hand-written and will diverge on
the first change. They need one source, or a gate comparing them — and the precedent already exists,
because `lint-skills.ts` was written for exactly this: shipped prose that makes factual claims about
the engine, gated so the claims stay true.

## 5. The ejected metadata: what an agent actually needs

`39` §4 established that `ai` alone is **5.4%** of a def — roughly 700 bytes a component. That is the
*selection* surface: enough to answer "is this the right component?", not enough to use one.

An agent building UI needs more: what the component is for, its props and their allowed values, its
states, its variants, its accessibility contract, its content rules, and which tokens it binds.

**The field selection is a judgment, and the one to make is the union of two of `39` §3's readers.**
`39` §3 splits the **selecting** agent (`ai`, `composition`, `aliases`, `category`) from the
**building** agent (`props`, `states`, `variants`, `tokens`, `accessibility`, `content`), and records
that each is *actively harmed* by the other's fields. That split is about a single read, not about a
single eject: **a client's agent does both jobs**, at different moments, so both sets have to be on
the client's disk. What keeps a reader from paying for the other's needs is not leaving fields out of
the eject — it is `39`'s three widths, which is exactly the job they were specified for.

So the ejected surface is the union, measured 2026-08-19 on the same corpus:

| selection | fields | share | per component | at 25 |
|---|---|---|---|---|
| `39` §3's building agent | `props` `states` `variants` `tokens` `accessibility` `content` | 39.1% | 5,148 B | ≈ 126 KiB |
| its selecting agent, added | + `ai` `composition` `aliases` `category` | **46.1%** | **6,072 B** | **≈ 148 KiB** |

All of them land in the same order as the token `.ai.json` at 286–311 KB, so **the conclusion is
robust to the judgment** — which is the property worth having, given that the cut is arguable.

Which means `39`'s three widths are not optional here. The ejected metadata is the **three-width
projection**, not a field to copy: an index and a summary carrying the selection fields, and a full
API entry carrying the building fields, fetched per component. A single flat file at ≈ 148 KiB
reproduces the problem `39` §4 was written to avoid, one tier down.

**Corrected in review.** This section first proposed `ai` + `props` + `tokens` + `accessibility`
(41.2%), a cut that contradicted `39` §3 in both directions at once — it took `ai` wholesale, which
that table names as harmful to the building agent, while dropping `states`, `variants` and `content`,
which it names as building-agent needs. The prose above it listed `states` as a need in the same
breath. **The error was reaching for a field list before deciding which reader the eject serves**;
naming the readers first makes the list fall out, and it moved the figure 41.2% → 46.1%.

## 5a. `39` §6's contested row — it is two artifacts, not one class

`39` §6 left the structural projection's class open, and named the reason precisely: *"a client
ejecting a **Figma library** does not need it; a client ejecting a **skin** does. The honest answer
may be that this artifact's class depends on what was ejected, which the manifest's two-value
vocabulary cannot currently say."*

**That row is not answerable as posed, and the disjunction is the tell.** "Structural projection"
names two different artifacts that read the same *def fields*:

| artifact | what it carries | class |
|---|---|---|
| the **materializer plan** — `anatomy-figma.ts`'s output | `absoluteInset`, `absoluteStrokeInset`, `textStyle`, `effectStyle`, `FigmaPropertyPlan`, variant-axis declaration order for `planComponentName` | **ours** |
| the **skin's structural source** — `38` Arc 4 | `anatomy` + `variants` → semantic CSS class names | **payload** |

The plan's fields are Figma facts, not structural ones. `absoluteStrokeInset` exists **because Figma
draws an `INSIDE` stroke back across the gap** — the field's own comment calls it "THE FIGMA
COMPENSATION," and #801 is why it exists. CSS has `outline-offset` and no such problem, so a skin
consumes none of it. Splitting the row answers it in the manifest's existing two-value vocabulary,
and the reason `39` found it contested is that the split was showing through as a disjunction.

**Recorded because it was nearly decided the other way.** This section first resolved the whole row
to `ours`, reasoning *"it feeds the Figma materializer, which is internal by §1."* That is wrong
twice. **A tool being internal does not make everything it touches internal** — the materializer's
own *output*, a Figma component library, is precisely what a client receives in `39`'s first branch.
And it addressed only that branch: `38` Arc 4 (re-cut 2026-08-12, more recent than `39`'s framing)
describes the class-based skin as `anatomy` + `variants` → semantic classes over markup AEM and
Drupal already generate, no longer blocked, and **"the nearest deliverable with commercial value."**
This doc's own §7 and §8 then treat an AEM/Drupal skin as the live near-term scenario.

The contradiction was available one section above the row being resolved: **`39` §3's reader census
has a single row reading "materializer — the Figma write leg, *later the class-based skin* (`38` Arc
4)"** — one reader, two consumers, one internal and one client-facing. Classifying the artifact by
naming only the internal consumer is not a gap in the argument; it is a claim the cited document
already contradicts.

With that split, the full classification:

| artifact | class | why |
|---|---|---|
| selection index / summary / API entry | **payload** | §5 — the agent surface, useless to us |
| docs projection | **payload** | `19` §6 ships it with the eject |
| code projection | **payload** | §7 |
| **materializer plan** | **ours** | Figma-specific throughout; no non-Figma consumer exists |
| **skin structural source** | **payload** | `38` Arc 4 — AEM and Drupal consume it natively |
| the def itself | never emitted | not a manifest question at all |

**One thing this does not settle**, named rather than closed over: whether the skin's source is a
*separately emitted artifact* or the skin emitter reading `anatomy` + `variants` directly, the way
`anatomy-figma.ts` reads them today. That is a build decision for whoever takes `38` Arc 4, and it
only becomes a manifest question if the answer is an artifact.

## 6. What this settles upstream

- **The Figma projector is internal.** The scope question — construction-only, ships-to-the-client,
  or a product surface — resolves to construction-only, and by a firmer route than the one originally
  argued: not *"clients probably will not need it"*, but *"it consumes an artifact clients do not
  have."* A client adding a component builds it in Figma by hand. **State that in the eject
  documentation rather than letting someone discover it.**
- **`39` §5's per-brand-vs-brand-neutral question narrows.** With no client-authored defs, the
  membership list is the only per-brand part of the selection registry, and a client's own additions
  sit outside our emission entirely. The brand-neutral-plus-membership proposal survives.
- **`33` §6's placement question gains its second entry.** `skills/` holds skills addressed to agents
  building *with* Prism3 — today `prism3-theme` and `prism3-consume`. An extend-the-kit skill is a
  third of that kind, not a new category, and it inherits `lint-skills.ts` on arrival.
- **#252 stays parked.** It governs ranks 5–6 of `19` §3 and nothing here reaches it.

## 7. Code: vanilla HTML/CSS first, and the wall at tranche 4

Endorsed, and it needs no new reasoning — **`19` §3 already ranks it second**, behind the token/CSS
layer that has shipped, and that ranking was set against Adobe's and Drupal's own published guidance
after the previous web-components lean was retired. AEM and Drupal both render server-side HTML that
their platforms augment with classes. For the two named platforms, vanilla is not a stepping stone
toward the real target; it **is** the target.

Two further reasons worth recording:

- It is the only projection where the emitted CSS custom properties are the actual consumption
  mechanism rather than something a framework wraps.
- It needs no build, which keeps the component tier's output honest with the engine's own buildless
  posture.

**The wall.** Vanilla HTML/CSS has no expression for the behavior half — `dialog`'s focus trap,
`menu`'s roving tabindex, `tabs`' keyboard model, `select`'s listbox semantics. That is `40`'s
**tranche 4** almost exactly (`link` · `tabs` · `dialog` · `menu`), with `select` reaching back into
tranche 1. Tranches 1–3 project cleanly; tranche 4 does not, and the options are a small vanilla
behavior layer, web components at `19` §3 rank 6, or shipping HTML/CSS plus a documented behavior
contract that each framework target implements.

**Decide it before tranche 4 is authored, not during.** The def's `accessibility` block is where a
behavior contract would live, and finding that out after eighteen defs are written is an eighteen-file
migration — the identical shape as #821's argument for closing the state vocabulary now.

## 8. The cost this creates, and the evidence that would retire it

This decision removes the defs' only consumer-facing justification. They are now **purely an internal
cost**, paid for entirely by cross-platform consistency during construction. That is a defensible
trade and it is not a self-evident one, and the owner's own framing when making the call was *"we
will see how this works, and if it is too much to maintain and worth the effort."*

Name the evidence now, while it is cheap to name and nobody is invested:

**The test is whether the def makes the second platform cheaper than the first.** Once vanilla exists
and a second target starts — React for prototypes, or an AEM/Drupal skin — the question is whether
porting *from the def* beats porting *from the vanilla output*. If it does not, by roughly component
ten, the defs are ceremony and we should know it then rather than at twenty-five.

Two things that would **not** settle it, recorded so they are not mistaken for evidence: that
authoring feels rigorous, and that the gates are green. Both are true of a def tier that no second
platform ever reads.

## 9. What this doc does not decide

- **The conformance checker's rule set and its file format.** §4 names the properties it must have
  and the arms it must carry; the rules themselves are a build.
- **The ejected metadata's schema.** §5 fixes the *width* structure and the field selection; the
  serialization is `39` §5's open work.
- **Whether the extend-the-kit guidance is one skill or several**, and how much of it is prose versus
  checklist. The owner's framing allows either, and the answer is likely visible only after the first
  one is written.
- **MCP versus a CLI query surface** for the ejected metadata. Unchanged from `39` §10: both read the
  same registry, so the registry's shape is upstream of the choice.
- **The behavior story for tranche 4.** §7 states the deadline and the options, not the answer.
- **Whether a client could ever opt *in* to defs.** Nothing here forecloses it. The checker's
  outputs-only design is what keeps that door open, and it should stay closed until a client asks.
