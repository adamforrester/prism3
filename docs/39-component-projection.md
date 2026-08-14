# 39 — Component projection: the architecture before the catalogue

> `38` sequenced the component tier to shipping code. This doc decides the thing that sequence
> assumes and nothing has yet stated: **what a component projects into, for whom, and at what
> width.** It exists because of one measured fact — the component tier emits *nothing*. Seven defs,
> 158 KB of authored TypeScript, **zero bytes under `out/`**. Everything that reads a component
> today reads the TypeScript source, in this repo, in this process. That is workable for two
> consumers in one monorepo and it is not a contract. We are at the moment before the tier has an
> output contract, which is the right time to decide it and the worst time to start authoring twenty
> more components against it.
>
> Scope: this is the POV and the architecture. It deliberately does **not** pick the 20–25 component
> list, and it does not author a research brief — both are downstream of the decisions here.

---

## 1. The measured starting position

Measured 2026-08-14 at `96f8340`, not recalled:

| | measured | how |
|---|---|---|
| component artifacts under `packages/engine/out/` | **0** of 27 entries | `ls out/` — every entry is a token tree, a Figma emission, the fidelity report or `tokens.html` |
| references to components in `regen.ts` | **0** | `grep -in component regen.ts` returns nothing |
| `<brand>.ai.json` top-level keys | `$schema, brand, generated, note, color_fields, typography_fields, primitive_fields, color, typography, primitives` | **token-only**; the agent surface has no component in it |
| `<brand>.ai.json` size | 285,877 – 310,536 bytes | `ls -l out/*.ai.json` |
| authored def source | 158,449 bytes across 7 files | `wc -c components/*.ts` less `index.ts` |
| defs carrying `anatomy` | 6 of 7 (`text-field` has none) | field census across `components/*.ts` |
| defs carrying `figmaProperties` | 4 of 7 | same |

Three consumers read a def today and all three are in-process TypeScript imports:
`packages/engine/test.ts`, `anatomy-figma.ts`, and the plugin's write path. `componentDefs` (#742)
made the set iterable, which is the prerequisite for a projection — but nothing iterates it into an
artifact yet.

**Nothing in `regen.ts` means nothing in `regen --check`.** That is the same scope hole #758 found
by mutation and `lint-paint.ts` was written to close: the component tier is outside the only gate
that reads *committed* artifacts, because it has no committed artifacts. Every claim of the form
"the component tier is covered by X" has to name a gate that actually reaches it, and the list is
short: `test.ts`, `typecheck-components.ts`, `lint-paint.ts`, `lint-absolute-inset.ts`. All of them
read the defs. None of them reads an *output*, because there isn't one.

## 2. The thesis: one definition, several projections, each cut to its reader

The token tier already answered the general form of this question and the answer generalizes
without modification.

`<brand>.tokens.json` is **canonical and ours** — it keeps per-mode values in
`$extensions.prism3.modes`, a shape DTCG defines as ignorable, which makes it precisely wrong to
hand a consumer. Beside it the engine emits a **conforming projection**, `base` +
`<mode>.overlay`, which is what a stock Style Dictionary can actually read. Neither file is the
other's fallback. The canonical tree is the source of truth and the projection is the promise, and
`packages/tokens/` exists to keep the promise honest.

The component tier takes the identical shape:

```
ComponentDef  (canonical, ours, TypeScript, never shipped as-is)
   ├─▶ selection surface     — what an agent reads to CHOOSE a component
   ├─▶ API surface           — what an agent reads to USE the chosen one
   ├─▶ structural surface    — what a materializer reads to BUILD it (Figma, and later a skin)
   ├─▶ docs surface          — what a human reads
   └─▶ Code Connect / stories / block metadata — derived from the three above
```

Two consequences worth stating flatly, because both have been assumed the other way in passing
conversation this week:

- **No projection is the definition.** A projection that round-trips is a nice property, not a
  requirement, and designing for round-trip is how the canonical tree gets deformed to suit its
  weakest consumer. `19` §1 already says *"one data set, everything else a projection"*; this doc
  is asserting the second half — that "everything else" includes the thing we would be tempted to
  call the component's JSON.
- **`.ai.json` is not one file that grows a component section.** It is the *name* of a projection
  family. §4 measures why merging the component surface into today's 300 KB token `.ai.json` is the
  wrong move by roughly an order of magnitude.

## 3. The reader census — and the finding that reorganizes it

The useful question is not "what formats do we emit". It is **who reads a component, and what does
each reader need that the others actively do not.**

| reader | needs | actively harmed by |
|---|---|---|
| **materializer** — the Figma write leg, later the class-based skin (`38` Arc 4) | `anatomy`, `figmaProperties`, `tokens`, `paintKeys`, `variants` | nothing much; it can ignore prose cheaply |
| **selecting agent** — "which component do I reach for?" | `ai.*`, `composition.*`, `aliases`, `category` | `anatomy` — 33% of the payload, describing a node tree it is not choosing between |
| **building agent** — "I have chosen it; how do I use it?" | `props`, `states`, `variants`, `tokens`, `accessibility`, `content` | `ai.whenToUse` / `avoidWhen` — the choice is already made |
| **human reading docs** | `docs.*`, `content`, `accessibility`, `notes.contested` | the token binding table, mostly |
| **a gate** | the canonical def, undiluted | any projection at all — a gate reading a projection is reading its own subject's output (`34` shape 1) |

**The finding: the reader needs are not nested, and `19` §5's three widths assume they are.**

`19` §5 specifies "the registry projects at three widths (index → summary → full entry), the Astryx
`--compact` idea, so an agent pulls only what fits its context." That is a correct and useful
mechanism, and it describes a **budget** — successively more of the same thing. But a materializer's
need and a selecting agent's need are not more-and-less of one thing; they are close to disjoint. A
materializer wants all of `anatomy` and none of `ai`. A selecting agent wants all of `ai` and none of
`anatomy`. Neither is a wider or narrower cut of the other.

So **width and audience are two axes, not one.** The correction is small and it changes what gets
built:

- **audience** decides the *shape* of a projection — which fields it contains at all;
- **width** decides the *depth* within one audience — index → summary → full, and it applies to the
  **selection surface only**, because that is the surface an agent must hold many members of at once.

Collapsing them is how the token `.ai.json` got to 300 KB: one file, every field, one audience
assumed. It is also how the answer would have gone wrong here, since the intuitive move — "put
everything in a component `.ai.json` and offer a `--compact` flag" — makes every reader pay for the
largest reader's needs and calls the mitigation a feature.

## 4. The measurement: what a component costs, by slice

Serialized byte census over all seven defs (`JSON.stringify`, no whitespace, measured 2026-08-14).
This is the whole reason the correction above is worth acting on rather than debating.

| slice | bytes, 7 defs | share |
|---|---|---|
| `anatomy` | 29,263 | **33.0%** |
| `props` | 14,611 | 16.5% |
| `tokens` | 9,874 | 11.1% |
| `docs` | 8,017 | 9.1% |
| `accessibility` | 7,536 | 8.5% |
| `notes` | 4,292 | 4.8% |
| **`ai`** | **4,956** | **5.6%** |
| `content` | 2,062 | 2.3% |
| `composition` | 1,231 | 1.4% |
| `figmaProperties` | 871 | 1.0% |
| `variants` + `states` + `paintKeys` | 1,200 | 1.4% |
| identity + `description` + `motion` + `slotAxes` | 4,644 | 5.2% |
| **whole set** | **88,557** | 100% |

**The selection surface is 5.6% of the definition.** An agent handed the whole def to answer "is
this the right component?" pays roughly **18×** for what it reads. That ratio does not improve with
scale; it is a property of the shape, so it is the same at 25 components as at 7.

Composed widths, measured on the same corpus:

| projection | bytes, 7 defs | per component | extrapolated to 25 |
|---|---|---|---|
| **index** — `id`, `name`, `category`, `ai.primaryPurpose`, `ai.triggerKeywords` | 1,716 | 245 | ≈ 6 KB |
| **summary** — index + `whenToUse`, `avoidWhen`, `commonPartners`, `composition`, prop *names*, `variants`, `states` | 7,950 | 1,136 | ≈ 28 KB |
| **API entry** — summary + full `props`, `tokens`, `accessibility`, `docs`, `content` | 50,112 | 7,159 | fetched per component, never in bulk |
| **whole set** | 88,557 | 12,651 | **≈ 316 KB** |

The extrapolation column is arithmetic on today's average, not a measurement of components that do
not exist — a larger component (a table, a date picker) will exceed the average and a smaller one
will undercut it. It is still the number that decides the architecture, because of where it lands:
**a full-fidelity component registry at 25 components is ≈ 316 KB, the same order as the token
`.ai.json`'s 286–311 KB** — and the token `.ai.json` is already the artifact we know we cannot hand
an agent whole. Building the component registry at full fidelity reproduces a problem we have
already got, at a tier where we have not yet got it.

Whereas the index at ≈ 6 KB and the summary at ≈ 28 KB both fit in any working context with room
left for the task. **The three widths are not an optimization to add later; at these numbers they are
the difference between a surface an agent can use and one it cannot.**

Two cautions on these numbers, so nobody quotes them past what they support:

- They are `JSON.stringify` byte counts of the def objects as authored. The projections do not exist,
  so this measures **the material a projection would be cut from**, not a projection. A real emitter
  adds keys (`$schema`, provenance, a token-contract version) and may drop others.
- `anatomy`'s 33% is over the six defs that have one. `text-field` has no `anatomy` block and is the
  most composition-heavy def in the set, so the share is if anything understated for a mature
  catalogue.

## 5. What follows for the artifacts

The architecture the census implies, stated as the thing to build:

1. **A per-brand selection registry, at three widths, containing only the selection fields.** This is
   `19` §5's `.ai.json` registry, scoped by §3's correction. The index ships into the consuming
   project's agent files (`19` §5's discovery layer); the summary is the default read; the full API
   entry is fetched per component on demand. Retrieval-first, exactly as `19` §5 already specifies.
2. **A structural projection consumed by the materializer.** This one already effectively exists as
   `anatomy-figma.ts`'s in-memory plan; the decision is whether it becomes a committed artifact.
   §6 argues it must, and for a reason that has nothing to do with the materializer.
3. **A docs projection.** `19` §6's generated baseline. Deferred, but the *fields* already exist
   (`docs`, `content`, `notes.contested`), which is what `19` §6 asked for architecturally.

**Whether these are per-brand or brand-neutral is a real decision and it is not the same answer for
all three.** Structure is brand-neutral by construction — `14` §2's whole thesis is that definitions
bind to token *names*, so a def is the same in every brand and the brand supplies value columns. The
selection registry is *mostly* brand-neutral but not entirely: a brand that has not adopted a
component should not have it in its index, and `aliases` is exactly where a client's own vocabulary
would land. The cheap first answer is **emit brand-neutral, and let the brand carry a membership
list**, which keeps one copy of the expensive content and makes adoption a small per-brand file. That
is a proposal, not a decision — it should be settled before the first component artifact is emitted,
because it determines whether `out/` gains one file or four.

## 6. Payload and ours — a decision the manifest will force, correctly

`schema/payload-manifest.json` (#674) classifies every emitted artifact as **payload** (travels to a
client on eject) or **ours**. It is authored, deliberately not a regen artifact, so **adding an
emitted artifact fails `lint-payload-manifest.ts` until a human classifies it.**

That friction is about to do real work for us, and it is worth naming in advance so nobody
experiences it as an obstacle. The classifications are not obvious:

| artifact | likely class | the argument, which is not settled |
|---|---|---|
| selection index / summary | **payload** | it is the thing an agent in the client's repo reads; useless to us |
| API entry | **payload** | same |
| structural projection | **contested** | a client ejecting a *Figma library* does not need it; a client ejecting a *skin* does. The honest answer may be that this artifact's class depends on what was ejected, which the manifest's two-value vocabulary cannot currently say |
| docs projection | **payload** | `19` §6 ships it with the eject explicitly |

The third row is the interesting one, and it is exactly the kind of thing the manifest exists to
surface rather than let pass. **It should be resolved by deciding, not by defaulting** — and note
what the existing gate can and cannot see: it checks a class is *declared*, not that the class is
*right*. Moving the canonical tree to `ours` passes today, verified by mutation. So the `why` field
on each rule is the only thing carrying the reasoning, and a contested classification needs its `why`
written at the strength of an argument, not a label.

## 7. The consistency mechanism — how 25 components stay one system

This was the second thing asked for, and it is the half most likely to be skipped, because
inconsistency across a catalogue is invisible at component 3 and structural by component 15.

The repo already has the right mechanism and has used it twice. It is not a style guide and it is
not review discipline. It is: **a declared shared vocabulary, with each divergence justified at the
point of divergence, and a gate whose oracle is not the vocabulary.**

- `PAINT_SLOTS` is a closed list of six, with `PRIMARY_PAINT_SLOTS` a named subset of four, and
  `lint-paint.ts` arm 1 asserts a rule at zero over the whole corpus with **four exceptions named
  per key with a reason, checked in both directions** — an exempted key that stops existing, or that
  starts satisfying the rule, fails as loudly as a new violation.
- `figmaProperties` carries the same posture: one node, one property kind, asserted; a TEXT property
  must declare a placeholder that *renders*; and #798 added the complement — every text part must be
  claimed by some property — because the first check starts from the property list and could never
  see a part with no property at all.

Applied to a catalogue of 25, that means three things, in order of how early they must exist:

**(a) The vocabularies are closed, and closing them is a decision per axis.** `PAINT_SLOTS`,
`NestingRelation`, part kinds, state names, size names, `category`. Some are already closed. `states`
and `variants` are not: they are free-form strings, and at 7 components the drift is invisible while
at 25 it is the difference between "the catalogue has a state model" and "each component invented
one." **Closing the state vocabulary is the single highest-value schema change available before the
catalogue grows**, and it is cheap now — seven defs' worth of `states` is 254 bytes total.

**(b) A research brief precedes the def, with a fixed section list, and its unresolved parts land in
the def rather than in a document.** The mechanism for the second half already exists and is
currently used by one component: `notes.contested`, `notes.unverified`, `notes.evolution`. Button
carries 1,407 bytes of it — three contested decisions and two open findings, each of which is a real
adjudication with a named alternative. `icon-button` carries 192 bytes; `field-label` 201. That gap
is not a fact about those components being simpler. It is the mechanism being used once and then
not.

The brief's value is that it makes the *research* comparable, not just the output. `28` §2 is the
model: a field survey across named systems, a convergence finding, a divergence finding, and an
explicit "where we differ, deliberately, and worth re-testing." That shape is reusable verbatim, and
`32` is where the build learnings from each go.

**(c) A gate over the catalogue, whose oracle is outside the catalogue.** The census in §4 is a
candidate subject: a per-component byte census against an authored baseline, in the shape of
`paint-census.json` — authored, not regenerated, so a component whose selection surface bloats past
its budget fails rather than quietly widening the number. But note the trap `34` would catch:
**a budget gate whose expectation is "the current size" cannot fail.** The oracle has to be an
authored budget with a stated reason (*"the summary width must stay under N KB because that is what
fits alongside a task"*), not a snapshot. Get that wrong and it is shape 1 again, reported as a pass.

## 8. What blocks impose, and why it lands now rather than later

`37` is deriving block layout axes and `13` §8 recorded the tier above components. Blocks are coming,
and they impose exactly one requirement on the component schema that is expensive to retrofit.

**A block is a layout of slots that hold content. A component destined for a block has to say what
content it holds, in what shape, with what constraints.** Today `ComponentDef.content` is:

```ts
content?: {
  labelPattern?: string;
  errorPattern?: string;
  emptyPattern?: string;
  [k: string]: string | undefined;
};
```

An open bag of strings. It is **copy guidance for a writer** — genuinely useful for the docs
projection, and structurally unable to answer a block's question, which is *"can this component hold
a 60-character heading and an image, and what happens at 200 characters?"* Those are cardinality,
type and overflow, and a `string` cannot carry them.

This is the one schema decision in this doc with a real deadline. Widening `content` — or adding a
sibling `contentModel` and leaving `content` as prose — is a seven-file change today. After the
catalogue it is a 25-file change plus every downstream projection, and the pressure at that point
will be to fake it in the block tier instead, which puts the content model in the consumer of the
data rather than the data. **Decide the shape now; populating it can lag.** The
`[k: string]: string | undefined` index signature is also doing quiet harm in the meantime: it makes
every misspelled content key valid, so nothing can gate the field at all.

`37` §5's method note is the right input to that decision and it is not blocked on it — the axes
work can proceed while the schema shape is settled, and should.

## 9. The name surface is versionable, and is currently unversioned

Not asked for; recorded because it belongs on the list and because it gets much more expensive after
the catalogue exists.

`CONTRACT_VERSION` and `schema/token-contract.json` (`30`) exist because a consumer hard-codes
`prism.color.text.primary` and a rename makes that reference resolve to nothing, with no error
anywhere. **Component names, prop names and variant values are a second name surface with the
identical failure mode.** A consumer writes `<button appearance="filled">`; we rename the value to
`solid`; nothing errors and the button renders wrong. `notes.evolution` on Button records exactly
this class of change having already happened once inside the token tier.

The mechanism transfers without redesign — a committed baseline keyed below the configurable root,
rewritten only by an explicit `--accept` that refuses unless the version was already raised, and
never a regen artifact. The reason to raise it here rather than file it and move on is that a
baseline is cheap to establish over 7 components and is a migration over 25.

## 10. What this doc does not decide

Named so the omissions read as deliberate:

- **The 20–25 component list.** Next, and separately.
- **Whether the projections are per-brand or brand-neutral.** §5 proposes brand-neutral plus a
  per-brand membership list and says it is a proposal.
- **The content model's actual shape.** §8 argues the deadline, not the schema.
- **MCP versus a CLI query surface.** `19` §5 specifies retrieval-first access with a `cli query`
  subcommand as the zero-server peer to an MCP tool. Both read the same registry, so the registry's
  shape — which is what this doc decides — is upstream of that choice and it can be made later
  without rework.
- **#252, author-headless vs. wrap.** Parked, at ranks 5–6 of `19` §3, and untouched by anything
  here.
