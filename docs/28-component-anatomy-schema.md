# 28 — Component anatomy: the structural schema (field survey + engine gaps)

> `14` locked the component layer's *architecture* (data source → deterministic emit →
> dumb materializer → extraction diff) and its **semantic** schema (`ComponentDef`:
> props, states, variants, a11y, token bindings). What it never specified is the
> **structural** layer — the node tree, the layout model, and the slot→property
> mapping a materializer needs to actually call `createComponent()` / `setBoundVariable()`.
> This doc closes that gap: a field survey of how best-in-class systems express button
> structure, the `anatomy` schema shape it implies, and — the surprise — **three token
> axes the engine was missing**. The survey and the schema it specified are now built —
> `AnatomyDef` (`component-schema.ts`), the structural projection (`anatomy-figma.ts`,
> #327), and Button's `anatomy` block (`components/button.ts`) all exist, and the three
> token gaps below have shipped. This doc is kept as the field-survey record and the
> contract the build followed.
>
> Scope note: the survey deliberately did **not** re-derive "what parts does a button
> have" — the KB briefs already answer that (`components/button.md` §2 is a cited,
> adjudicated cross-system anatomy). The question asked here is the sharper one:
> **what is the schema for expressing parts?**

---

## 1. Why this wasn't already answered (at the time this doc was written)

Three things exist and, at the time of the original survey, none of them was the
structural layer. That has since changed — the structural layer is now built too:

| Layer | Where it lives | Status |
|---|---|---|
| **Semantic contract** — props, variants, states, a11y | `ComponentDef` (`component-schema.ts`) + KB §15 | ✅ built; 5 components authored |
| **Values** — padding, height, radius, type, colour×state | engine tokens, bound in `components/*.ts` | ✅ built (~60 bindings on Button) |
| **Structure** — node tree, layout, slot→property mapping | `AnatomyDef` (`component-schema.ts`) + `anatomy-figma.ts` projection | ✅ built (#327) |

`ComponentDef` binds `size.medium.padding-x → size.md.padding-x`, but nothing says
*what that padding is applied to*, whether the row is horizontal, what it aligns to, or
which prop becomes a Figma variant vs. an instance-swap. A materializer can't run on it.

---

## 2. Survey: how the field expresses button structure

Four systems, chosen to span the two relevant axes — **web-component (shipping a real
`::part()`/slot contract)** and **token-mature (publishing component tokens)**.

### 2.1 The part vocabulary — convergent, with one naming split

| | Container | Leading slot | Label | Trailing slot | Also |
|---|---|---|---|---|---|
| **Shoelace** (WC) | `base` | `prefix` | `label` | `suffix` | `caret`, `spinner` |
| **Primer** | (implicit) | `leadingVisual` | label | `trailingVisual` | **`trailingAction`** |
| **KB brief** §2 | container/target | `leadingVisual` | label span | `trailingVisual` | pending slot, focus ring, touch-target |

**Convergence:** every system lands on *container + leading slot + label + trailing slot +
state overlays*. The structure is genuinely stable across the field — which is what makes
a shared schema viable.

**Divergence:** naming only — `prefix`/`suffix` (Shoelace) vs `leading`/`trailing`
(Primer, KB). The KB already adopted the `*Visual` vocabulary with a stated reason (the
slot holds avatars, counters, spinners — not just icons), so we inherit that; no new
decision needed.

**Where we differ from both — deliberately, and worth re-testing:** Shoelace has a `caret`
part and Primer a `trailingAction` slot, both treating the **dropdown indicator as distinct
from the trailing visual**. Our `components/button.ts` **folds them together** — `trailingVisual`
is documented as "Icon / caret / indicator after the label." That was a consolidation, not an
oversight, so the question is whether it holds up. The field's argument for separating is
structural, not cosmetic: Primer's `trailingAction` "is fixed at the button's end… separate
from the trailing visual," which means a button can carry **both** — a counter *and* a caret.
Merged, that combination is unexpressible. Two witnesses and a concrete capability argue for
splitting; logged as an open decision (§5), not assumed.

**Shoelace's model is the strongest candidate for our neutral vocabulary** — `::part()` +
named slots is standardized, is the actual customization surface a CMS/WC consumer uses,
and projects cleanly to Figma (part → layer, slot → instance-swap property). It is a
*standard*, not a vendor invention — the same posture as adopting DTCG and `design.md`.

### 2.2 Layout properties — what is tokenized, what is per-component, what is derived

The survey's most useful cut. Three distinct categories, and only the first is a token:

| Property | Category | Evidence |
|---|---|---|
| padding, height, radius, type, colour | **tokenized** | already in our `size.*` / `color.*` |
| **gap** (label ↔ visual) | **tokenized** — but we don't emit it | Spectrum `text-to-visual-*`; Material `icon-label-space`; Carbon `$spacing-03` |
| **icon size** | **tokenized** — but we don't emit it | Spectrum `workflow-icon-size-*`; Material `icon-size`; Carbon 20px |
| direction, alignment, sizing mode | **per-component structure** | belongs in `anatomy` |
| **min-width** | **derived** | Spectrum: `calc(height × minimum-width-multiplier)` |
| **pill radius** | **derived** | Spectrum: `calc(height / 2)` |

Two things fall out. First, **gap and icon-size are shared cross-component scales in every
system that ships them** — Spectrum's `text-to-visual-{75,100,200,300}` and
`workflow-icon-size-*` are *system* scales the button merely references. So they belong in
the **engine token tier**, not in a component definition. Second, **derived values are a
third category** — min-width and pill radius are computed from height, not authored. Our
engine already derives (the whole thesis), so this fits; it just needs to be expressible.

**Alignment is contextual, not fixed.** Primer: *"The Button label and leading visual is
center-aligned for calls-to-action and left-aligned for buttons that toggle a selection
UI."* So alignment may need to be a **prop**, not a constant in the anatomy — flagged as an
open question (§5).

### 2.3 The finding that changes our token model: padding is slot-aware and asymmetric

**Three independent witnesses.** The horizontal padding on the side where a *visual* sits
differs from the side where the *label* sits:

| System | Label side | Visual side | Δ |
|---|---|---|---|
| **Material 3** (`_md-comp-filled-button.scss`) | `leading-space: 24px` | `with-leading-icon-leading-space: 16px` | **8px** |
| **Spectrum** (`button/index.css`) | `edge-to-text` (`component-pill-edge-to-text-*`) | `edge-to-visual` (`component-pill-edge-to-visual-*`) | separate token scales |
| **Carbon** (`_button.scss`) | `layout.density('padding-inline')` | `calc(… − 1px)` | 1px (ghost) |

Material is explicit and symmetric-per-side: a leading icon pulls the *leading* padding to
16 while the *trailing* stays 24, and vice versa for a trailing icon. The rationale is
optical — an icon's own bounding box contributes apparent space, so equal numeric padding
reads as *too much* on the icon side.

**Our model is a simplification.** `size.*.padding-x` is a single value per size, applied
both sides. Every mature system in the survey has at least two. This is not cosmetic: it is
the difference between a button that looks hand-tuned and one that looks generated.

---

## 3. Engine token gaps (the survey's second deliverable)  ·  shipped

Three additions to the token tier, in dependency order, identified by the survey. All
three have since shipped.

1. **`size.*.gap`** — the label↔visual gap, per size. Shipped as a dedicated scale
   (Spectrum's `text-to-visual` lean, not a reuse of `space.*`) — it extends the existing
   `size.*` component tier (which already carries `height` / `padding-x` / `padding-y`)
   and scales with size exactly as padding does. Verify: `prism.size.<step>.gap` is in
   the emitted token tree for every size step.
2. **`icon.size.*`** — at the time of the survey there was **no `icon` category in the
   token tree at all**. That gap is closed: the emitted tree now has a top-level
   `icon.size.{xs,sm,md,lg,xl}` category, so a button's leading visual has a size to bind
   to. The KB's `icon.md` brief remains the anatomy reference
   (`components/_schema.md` cites it, "Icon's grid/stroke optical metrics").
3. **`size.*.padding-x-visual`** — the slot-side padding from §2.3, splitting `padding-x`
   into label-side and visual-side. Shipped as `prism.size.<step>.padding-x-visual` in
   the emitted tree, alongside the original `padding-x`.

A fourth, optional and still not built: a **min-width multiplier** — derived, not a
token, would need a home if the engine adopts Spectrum's `height × multiplier`
behaviour.

---

## 4. The proposed `anatomy` schema

Neutral structural vocabulary (Shoelace-derived), with the Figma mapping as a *projection* —
the same `$value` / `$extensions.figma` split the token tier already uses. Illustrative
shape, not final syntax:

```yaml
anatomy:
  root: container
  parts:
    container:
      role: target                  # the a11y target; owns radius, fill, border
      layout: { direction: row, align: center, justify: center, sizing: { x: hug, y: fixed } }
      padding: { block: size.*.padding-y, inline-label: size.*.padding-x, inline-visual: size.*.padding-visual }
      gap: size.*.gap
    leadingVisual:  { kind: slot, optional: true, size: icon.size.*, nesting: { kind: swap } }
    label:          { kind: text,  required: true, type: size.*.type }
    trailingVisual: { kind: slot, optional: true, size: icon.size.*, nesting: { kind: swap } }
    trailingAction: { kind: slot, optional: true, note: "dropdown caret — distinct from trailingVisual" }
    spinner:        { kind: overlay, replaces: leadingVisual, nesting: { kind: swap }, note: "width-preserved" }
    focusRing:      { kind: absolute, nests: focus-ring, nesting: { kind: nest-fixed, variant: { color: default } } }
  derived:
    min-width: "height × minWidthMultiplier"
  code-only:
    - touch-target-expansion          # ::before / absolute overlay — no Figma equivalent
```

### The Figma projection, and its ceilings

| Neutral anatomy | Figma | Ceiling |
|---|---|---|
| row + gap | horizontal auto-layout + item spacing | ✅ |
| `sizing: {x: hug, y: fixed}` | hug contents / fixed height | ✅ |
| label (text, bound type) | text layer + bound variable | ✅ |
| leading/trailingVisual slot | instance-swap + boolean property | ✅ |
| focus ring w/ offset | stroke + offset | ✅ |
| **inline-visual padding** | auto-layout padding **per side** | ✅ (Figma supports asymmetric padding) |
| **touch-target expansion** | — | ❌ **code-only** |
| min-width derivation | resolved to a literal at emit | ⚠️ computed, not live |

The `code-only` list is the component-tier version of the ceilings discipline `14` §3 set
for tokens: some anatomy provably will not survive the Figma leg, and the schema must say so
**explicitly** rather than lose it silently.

### 4.1 `nesting` — how a part relates to the component it points at (#681)

The schema above says *which* component a part points at (`nests`, or nothing at all for a
`slot`, whose target the caller nominates per file per #513). It did not say **how** the part
relates to it, and #681 landed the decision that it must. Three kinds:

| Kind | Meaning | Example |
|---|---|---|
| `swap` | the whole component is replaced; variants do not enter into it | an icon in a slot |
| `nest-fixed` | the nested component has variants, **the def picks one**, the consumer never changes it | a focus ring's `color` |
| `nest-exposed` | the nested component has variants **the consumer drives from the parent** | a form label's sizes |

**The split it encodes is identity vs. policy.** WHICH component fills a slot is a fact about
the *file* — the file's icon might be called anything — so the **caller** nominates it. WHETHER
that component's variants surface on the parent is a fact about the *design*, true across every
file and brand, so the **def** declares it. Both belong to whoever holds the fact.

**Why this is a def field and not a Figma implementation detail.** Per `19` §1 one definition
set projects into every output, so an exposure declaration has to project into all of them:
Figma gets an exposed nested-instance property, React/WC get a **prop**, `.ai.json` gets a
documented option an agent can select, Storybook gets a control. A def that cannot express
exposure cannot express its own public API.

**Why `nest-fixed` must name its variant** rather than taking the nested set's default: Figma's
default is its **first child**, an artifact of creation order — which is `#656` exactly one layer
out. #656's finding was "an artifact of declaration order, not a layout decision," and its fix
was to *choose* the axis instead of inheriting it. Inheriting a ring's first variant re-commits
the same error, and would be equally invisible: both variants are valid rings, so nothing
downstream notices the wrong one was nested.

The field is **required on every part that points at a component, and rejected on the kinds that
point at nothing** — no default, because the tempting default (`swap`, by far the commonest
value) would silently make every nested set fixed-at-its-first-variant, i.e. the error the field
exists to stop. `overlay` is in the required set, which is read off the projection rather than
the kind's prose: `anatomy-figma.ts` types an overlay `INSTANCE_SWAP` and hands it the same
`swapTarget` a slot gets, because a spinner is a glyph standing in a glyph's cell.

#### 4.1.1 How the coordinate is resolved, and the fifth miss (#681)

§4.1 is the *def's* half — the field, and who owns the fact it carries. This is the **consumer's**
half: what the plan projects, how the two executors turn a coordinate into a node, and what they
say when they cannot. The two were built in that order deliberately, and the field is useless
without this: a def can declare `nest-fixed` all it likes, and until something resolves the
coordinate the write drops the part and reports a miss.

**The plan carries the coordinate in its own field, not in `bound`.** `nestVariant?:
Record<string, string>` sits beside `nestTarget` on a `NESTED_INSTANCE` node — the shape
`InstanceNode.setProperties` takes, which is why `nesting.variant` is a record and not a string.
It is projected **only for `nest-fixed`**. A `nest-exposed` part projects nothing, and that
absence is meaningful rather than a gap: an exposed nest's coordinate is the consumer's to drive
per instance, so a projection that invented one would pin exactly what the def declined to fix.
`swap` has no variants at all. One field per API shape, the same argument `textStyle`,
`effectStyle` and `absoluteInset` each got their own for.

**The coordinate must identify exactly one member — every axis named.** A partial coordinate is
the trap, because it looks reasonable: `{color: 'default'}` against a `color × size` set matches
two members, and something then has to choose. Every available rule for that choice is creation
order wearing a different hat, which is **#656 one layer further in** — the exact error `nesting`
exists to stop. So an under-specified coordinate is **refused**, with the same message a wrong one
gets. It is refused even when the set happens to hold a single matching member: the ambiguity
there is *latent* rather than absent, and it becomes real the day someone adds a second size — at
which point the def that changed meaning is not the file that changed.

**Members are matched axis by axis, never by string equality against a reassembled name.** Figma
writes a member's axes in the order *it* chose, so `color=default, size=md` and `size=md,
color=default` are the same member and only one of them equals a def-built string. Equality would
fail **invisibly** — as a miss about a def that is correct.

**A member is what gets instantiated, never the set.** Figma has no "instance of a set", and
`ComponentSetNode` has no `createInstance`. This is also why each executor runs **two** criteria
searches rather than one widened one: the `COMPONENT` results are cast and instantiated, and a
single `types: ['COMPONENT', 'COMPONENT_SET']` call would poison that map with nodes that cannot
be instantiated. One criteria list per cast keeps each cast true at its own call site.

**The fifth miss.** #681's four messages diagnose the *file* — absent, a set, an instance, some
other node. This one diagnoses the **def**: the set is there, the coordinate was named, and no
member carries it. It names the coordinate **and** lists the members, because either alone is
unactionable — a rename in the file and a typo in the def produce the same lookup failure and
opposite fixes. It arrives silently, too: the other four are reached by a lookup returning
nothing, while this one is reached by a lookup returning a set **full of valid members**, none of
them the one asked for. Nothing is built, because a valid wrong ring looks like a success.

**And the `COMPONENT_SET` message changed meaning without changing its key.** It used to be the
108-miss case — "this writer cannot read a set". A `nest-fixed` part never reaches it now. Its
only remaining case is a def that named **no** coordinate, i.e. `nest-exposed`, which needs an
exposed nested property this write does not create yet (#681 defers exposure pending the
property-count measurement: Button already writes 1,350 references across 648 members). So the
row that used to describe a limit of the writer now describes a limit of the def.

### 4.2 Square parts: one binding key, both axes

`size` — until now "a slot's square glyph artboard" — is also how a **`box`** declares itself
square. IconButton is the first case ("height drives both dimensions"), and it is this field
rather than a `width` beside `height` for a reason worth stating: **two bindings that must agree
can drift; one key cannot drift from itself.** Rebind one axis and nothing anywhere notices,
because each binding is individually valid. So "square" is expressible as a single fact instead
of an invariant nobody checks. `size` is mutually exclusive with `height` and validated so, and
a square box must be `fixed` on **both** sizing axes — `hug` on either lets the content decide a
dimension the binding is trying to drive.

### 4.3 What a square control does *not* have

Two of the schema's fields drop out for a component whose whole content is one required glyph,
and both drops are structural rather than a simplification:

- **no `padding`** — §2.3's asymmetric slot-aware padding is entirely about a *label side* vs a
  *visual side*. An icon-only control has no label side to compare against, so the finding that
  motivated `padding-x-visual` has no subject here. The glyph is centred and the box is sized;
  padding would be a second, redundant expression of the same geometry.
- **no `gap`** — a gap is the space *between two cells*. There is one cell.

### The projection's standing role: this schema's materialization proof (2026-08-12, #718)

**The Figma projection is kept runnable as the proof that this schema can materialize — not as a
product capability.** #718 decided that the plugin's component write is internal testing until a
client asks for a generated Figma kit with real requirements. Read the status from #718 and the
issue labels, not from a list here.

**Why it is kept rather than retired, which is the part worth writing down.** Nothing else makes
this schema falsifiable. `typecheck-components.ts` checks the defs against `component-schema.ts` —
that they are *well-typed*, not that an `anatomy` block carries enough to build something real.
`figmaAnatomyPlan` is pure and gated offline, and `test.ts` drives the plugin executor against a
shim for parity — but a shim models the Figma someone wrote it to model. Retire the live
projection and this schema becomes data whose only consumers are tests written from the same
understanding that authored it: it would drift toward whatever is convenient to author, and
nothing would notice. The 648-member run is what makes the claim refutable.

**So the projection is a tool, not a gate** — `CLAUDE.md`'s `tools/` distinction exactly: *a tool
answers a question; a gate asserts an answer.* It is not in `ci.yml`, it needs a human in Figma
desktop, and its findings arrive as issues rather than as a red build. That is the intended shape,
not a gap to close: five of the six findings from the first live Button run were invisible to the
offline suite **by construction** — the shims model no scenegraph, no font-loading state, no event
loop, no component sets, no instances, and emit no deprecation warnings.

**Two defs now, and each one is the cost.** `button.ts` and `icon-button.ts` (#681) are the two of
five with an `anatomy` block; the plugin's live build path still calls Button by name only
(`apps/plugin/src/main.ts`: *"A loop over five defs would throw on four of them"* — three now, not
that this PR rewires the call site). Each additional def means new anatomy authoring, its own
variant space, and its own live-test cycle — which is the superlinear cost #718 turns on, and the
reason "prove the schema" is a better description of this leg's job than "build the kit".

**A reader arriving at a runnable component write should not read "still here" as "still a
feature."** That inference is what this section exists to block.

---

## 5. Open decisions

1. **Gap scale: dedicated (`text-to-visual`-style) or reuse `space.*`?** (§3.1). Lean dedicated.
2. **Is `align` a constant or a prop?** Primer makes it contextual (CTA vs selection-toggle).
   If a prop, it is the first *layout* prop in `ComponentDef` — a small precedent worth setting
   deliberately.
3. **Split `trailingVisual` into visual + action?** Today they are merged (§2.1). Splitting
   makes "counter *and* caret" expressible and matches two witnesses; it costs a slot in the
   variant matrix and re-opens a settled call in the authored def.
4. **`padding-x` split migration** — rename vs. add. Every existing binding + `preview.ts`
   assume one value.
5. **Schema syntax** — this shape is illustrative; the real decision is whether `anatomy`
   nests inside `ComponentDef` or is a sibling artifact (it is the part a *materializer*
   reads, and the code outputs read it too, so nesting is probably right).
6. **`AnatomyPlan.slots` is Button-shaped, and the cost is now paid by others.** The type is
   `{ leading, trailing }` — Button's two optional visuals flanking a label. IconButton's icon is
   *required* and is the whole content, so its slot-fill dimension **collapses to 1** and needs no
   new shape: with no slot axes declared, `figmaAnatomySet` iterates `[false]` on both and
   `planSetLayout` gives a dimension only to axes that *vary*, so they contribute no rows and no
   columns. That collapse is **enforced, not merely intended** — the validator already refuses a
   `slotAxes` entry over a non-optional part. The price, named rather than hidden: every member's
   name ends in two coordinates about slots the component does not have, which reads as vestigial
   to a designer. The honest fix is a shape keyed by the def's own part names; it is a refactor of
   a type three call sites read, and it was not put on the critical path of a component that does
   not need it.

### 5.1 Decided (2026-08-13, #758): paint keys are declared by the def, as templates

**The asymmetry that was the defect.** §4 states deliberately that paint stays *out* of `anatomy` —
folding it in would re-declare the part tree per variant. That still holds and is not what #758
changed. What did not follow, and was never noticed, is this: `anatomy` **names** its geometry keys
(`size.{size}.gap`, resolved through `varOf`, which throws), while paint keys were **built** by
`paintOf` from a template hardcoded to `{intent}.{appearance}.{slot}`. Button's two axes were written
into the projector as though they were universal, and the paint grammar was stated *nowhere* — not in
the schema, not in the def, not in a doc.

Measured on `main`, that made **five of seven defs unpaintable**: `icon` and `focus-ring` have
neither axis, `field-label` and `text-field` have `size`, `field-message` has `tone`. Not a
`focus-ring` problem — a projector-wide one, and the wall under Arc 2 steps 3 and 5.

**The decision: `paintKeys: string[]` on the def, using `{axis}`/`{slot}`/`{state}` placeholders,
tried in order.** Four shapes were considered (an axis list, a key template list, a per-slot map, and
folding paint into `anatomy` after all). The template list is the only one under which **all seven
shipped defs stay valid unchanged** — and that is a measurement, not a preference, because the corpus
already ships **six distinct grammars across seven defs, not one** (`button` and `icon-button` are the only pair that share):

| def | grammar | what it shows |
|---|---|---|
| `button`, `icon-button` | `{intent}.{appearance}.{slot}[.{state}]` | the shape that was hardcoded |
| `icon` | `tone.{tone}` | axis **name** leads; **no slot segment at all** |
| `field-message` | `{tone}.{slot}` | axis **value** leads — the *opposite* order to `icon`, over an axis of the same name |
| `focus-ring` | `{slot}.{color}`, then `{slot}` | a fallback chain, where order carries meaning |
| `text-field` | `{slot}.{state}`, then `{slot}` | same, on a different axis |
| `field-label` | `{slot}` | a bare slot: neither of its axes changes a colour |

`icon` and `field-message` are the decisive pair. They key **the same axis name in opposite orders
over disjoint value sets** (nine content roles vs four validation states), and both are right for
their component. An axis list — `paintAxes: ['tone']` — cannot express both, so adopting it would
have forced a rekey of a shipped def to satisfy the schema. That is the wrong direction: the schema
should describe the defs, not conscript them.

**Why order is part of the declaration, and gated separately.** The lookup returns on the first
template whose filled key is bound, so `['{slot}.{color}', '{slot}']` and `['{slot}', '{slot}.{color}']`
are different components: under the second, `focus-ring`'s authored `stroke.inverse` is never reached
and every ring paints the default colour — #656's invisible ring, reintroduced by a reordering. This
is checked in `component-schema.ts` per **binding** rather than per template, and it has to live there
rather than in the paint census, for a reason found by mutation: `focus-ring` declares no `size` axis,
so `figmaAnatomyPlan` refused it and **no census could cover that def at all**. #795 removed that
refusal — the ring is planned and censused now — and the check stays where it is: a per-binding check in
the schema covers a def whether or not the census reaches it, which is the property that made it right
the first time. The mutation found the right home for the wrong-lived reason.

**What #758 did *not* do — and what closed it.** #758 made `focus-ring`'s stroke colour resolvable and
left the ring unprojectable behind three *structural* walls, deliberately. **#795 took two of them
down** — `PROJECTABLE_VARIANT_AXES` is deleted, so `figmaAnatomySet` enumerates whatever
`figmaProperties.variantAxes` declares; and `planComponentName` writes a `size=` segment only where the
def declares the axis, so a one-scale def is nameable. Both were **ours**, not Figma's, and they landed
together because either alone is worse than neither: relaxing the size requirement without the axis list
projects a def's grid with an axis silently missing (#487 §5's 189-vs-756), and the axis list alone
still can't name a sizeless member. The survivor is #740 — `PartDef` has no stroke field — so the ring
projects and pastes without its stroke, which is a materialization ceiling and not a projection one.

Two latent defects surfaced by writing the grammars down, both deferred at the time with the anatomy
work that owns them: `text-field` binds `border.focus` and `border.readonly` while declaring the states
`focus-visible` and `read-only`, so neither is ever reached and a focused field would paint its **rest**
border; and `field-message`'s `text` keys cannot be filled by a `{slot}` the projector fills with
`label`. Both were equally real before, and nothing in the repo could see either. Naming them is what
declaring the grammar bought — **and deferring them is what hid the other four**, which is §5.1.

### 5.1 The slot vocabulary (#784)

**A def spells the paint ORDER and the AXES. It does not get to invent the slot NAMES.** The slot is the
argument `paintOf` is *called* with, so the vocabulary is the projector's: `PAINT_SLOTS = ['fill',
'overlay', 'border', 'label', 'icon']`, one entry per `paintOf('…')` call site in `anatomy-figma.ts`.

#758 gave that half away by accident. Moving the grammar into the def moved the *whole* key there,
including the segment the projector still owns — so four defs shipped keys spelled in words nothing ever
asks for. Measured by enumerating every coordinate `paintOf` can be called at:

| def | reachable before #784 | keys that reached nothing |
|---|---|---|
| `field-label` | **0 of 3** | `text`, `indicator`, `disabled.text` |
| `focus-ring` | **0 of 2** | `stroke`, `stroke.inverse` |
| `field-message` | 4 of 8 | the four `{tone}.text` keys — every tone painted its glyph, no tone painted its caption |
| `text-field` | 6 of 12 | `text`, `placeholder`, `border.focus`, `border.readonly` |

`field-label` is the sharp case: `paintKeys: ['{slot}']` passes every check #758 shipped and the def
paints **nothing**. The state half and the slot half are **one defect wearing two hats** — a segment
filled with a word nothing supplies — and #758 could see the state half by eye because states are
declared in the def, while the slot vocabulary was written down nowhere a def author could read it.

So `paintKeyErrors` now checks **every** placeholder segment against its own enumerable oracle:
`{slot}` against `PAINT_SLOTS`, `{state}` against `def.states`, `{<axis>}` against `def.variants[axis]`.
One rule asked three times, rather than three checks.

**Two things this pass changed beyond the renames**, both found by a second oracle rather than by the
rule above (a probe that enumerates every coordinate, runs `figmaAnatomyPlan`, and reads paint out of the
emitted plans — the rule and the probe now agree at zero):

- **A live accessibility defect.** `disabled.on-fill` was bound on `button` and `text-field`, gated per
  mode, and reached at no coordinate — so a disabled **filled** button painted page ink on a fill:
  **2.55:1** (harbor light), **2.14:1** (harbor dark), **2.14:1** (wendys light), **2.13:1** (wendys dark),
  against contracts of 3.06–3.08:1. Ink-on-fill and ink-on-page are *different contrast contracts*; the
  token tier emitted both and the projector only ever asked for one. `paintOf`'s disabled branch now makes
  ink conditional on structure the same way the fill already was, and the qualified form is
  `disabled.<slot>.on-fill` — the suffix qualifies the slot rather than replacing it, so the slot segment
  stays a dispatched word and a qualifier cannot become a hiding place for an unreachable slot name.
- **Three `button` keys naming a nonexistent appearance value** (`*.on-inverse.label`). Removed rather
  than renamed: there is no value to rename *to*, because the inverse surface is a fourth axis this def
  does not declare. The token family is gated independently, so no contract is lost — the ceiling is
  recorded in `codeOnly`.

**Do not widen `PAINT_SLOTS` to go green.** Once the rule reads that list, the cheapest way to make a
failure vanish is to add the offending word to it, which converts a real defect into a silent pass in one
line. The list may only grow when the projector **actually dispatches** the new slot, which is checkable:
a `paintOf('<slot>')` call must exist in the paint branch for the part kind that owns it.

### 5.2 Decided (2026-08-14, #756): the engine's rung names are the API, and the default is `md`

**The rule, and it is the whole decision in one line:** *a brief's rung names are input; the engine's
token names are the API. Where they collide the engine wins, and the def records the offset.*

**What collides.** The KB briefs and the emitted tier use **the same rung names for different values**,
offset by exactly one rung:

| | 16 | 20 | 24 | 32 | 40 |
|---|---|---|---|---|---|
| `components/icon.md` §15 | `sm` | `md` *(default)* | `lg` | `xl` | — |
| engine `icon.size.*` | `xs` | `sm` | `md` *(default)* | `lg` | `xl` |

On the overlap the **values agree exactly**. Nothing is *wrong*; the two just name one ladder
differently, and the engine carries one extra rung on top. That agreement is what makes it dangerous
rather than obvious: a def adopting the brief's names makes `icon.size.md` mean **24** in the token layer
and **20** in the component API. Both halves stay valid — the token resolves, the enum typechecks, every
gate passes — and the divergence is visible only to someone reading two files side by side. It is #708's
shape exactly: **a wrong value that resolves.**

**Why the engine wins, from something already committed rather than a fresh preference.** Principle 5 and
`docs/11` make the emitted token names the **contract**: `CONTRACT_VERSION` governs them and consumers
hard-code them. A brief is *input to authoring*, not an API surface — its rung names promise nobody
anything. (The `icon` brief also disagrees with itself: §3's prose gives three names, §15's schema four.)

**Where the offset is recorded: per def, one line, where the author meets it.** Not a table. A table is
one more artifact to drift, and the record's entire value is sitting *where the decision is made* — a
per-def line is read by the next author of that def; a table is read by nobody until it is already wrong.
`icon.ts`'s header is the template.

**The default rule — the issue's third bullet, and the one that needed deciding rather than restating.**
`icon`'s default moved from the brief's 20 to 24 purely because the names shifted one rung, which is a
*value* change reached by a *naming* argument. The rule:

> **A def's default size resolves to the tier's `md` rung.**

Two things make that a rule rather than a per-def judgment. First, **it was found in the corpus, not
invented**: it holds 5/5 across every def with a size axis — `icon` defaults `md`, and `button`,
`icon-button`, `field-label` and `text-field` all default `medium`, whose bindings reach `size.md.*` /
`icon.size.md` / `type.label.md.*` and nothing else. Second, **the composition evidence decides the
value-change objection instead of arguing with it.** The choice looked like *preserve the brief's value
(20, so `icon` defaults `sm`)* versus *preserve the brief's position (mid, so `md` = 24)*. Position wins,
because `button` and `icon-button` at their own default `medium` both bind `icon.size.md` = **24**: a
standalone `<Icon>` defaulting to 20 while the same icon inside a default-size button renders 24 is an
inconsistency a designer sees immediately and a gate never would. Preserving the brief's *value* would
have broken the identity `scale.ts` deliberately built — the icon ladder pairs 1:1 with `componentSizes`
so control size → icon size is the identity rather than a reconciliation between a 4-step and a 5-step
scale. **The default follows the ladder's shape, and the ladder is the engine's.**

**Gated, in `lint-rung-names.ts`, in three arms.** Arm 1 (every enum value resolves to an emitted rung,
per brand) is **necessary and not sufficient**, and says so in its own output: a def declaring
`['sm','md','lg','xl']` against a five-rung tier passes it trivially — those are all real paths, just the
wrong four. Arm 2 is the one that sees the divergence, and it is `lint-paint.ts` arm 1's structure — a def
states its ladder **twice**, in `props`/`variants` (the consumer's vocabulary: `small`) and in `tokens`
(the engine's: `sm`), so EXPECTED and ACTUAL are two independently-authored halves of one line. It asserts
every enum value is bound, every bound key is in the enum, and the mapping is **order-preserving** within
each tier family. Arm 3 asserts the default rule above.

Monotonic rather than *strictly* monotonic is the one judgment call, and it is measured: `button` binds
`size.large.type → type.label.md.emphasis`, sharing `md` with `medium`, which is correct because
`type.label` emits only two rungs in all four brands and a three-size control legitimately clamps its
label at the top. **A repeat is a clamp against a shorter tier and is always benign; a reversal never is.**
Monotonicity admits the first and refuses the second with no exception list — and an exception list is
what strictness would have forced, which is the wrong shape for a rule that should hold for defs nobody
has written yet.

**Do not add a rung to a def's enum to go green.** The same hazard `PAINT_SLOTS` carries one section up:
the cheapest way to silence arm 2A is to widen the enum until it matches the bindings, which converts a
missing binding into a size a consumer can ask for and get nothing from.

---

## 6. Next step

Per `14` §6 and the discussion that produced this doc: **formalize Button's §2 prose into
this shape**, bound to the tokens already in `components/button.ts`, then run the **Figma
Console MCP spike on that one component** to prove the projection and discover what the
Plugin API actually demands. Build one component in Figma, not forty — the spike's output is
the *validated schema*, not the Figma asset. The engine token gaps (§3) are the prerequisite:
without `gap` and `icon.size`, a materialized button has no value to bind for either.

---

*Sources surveyed (2026-07-30): Shoelace `components/button` (parts/slots); Primer
`components/button` (slot model, alignment rule, loading behaviour); Material Web
`tokens/_md-comp-filled-button.scss` (asymmetric icon-aware spacing, verbatim values);
Adobe Spectrum CSS `components/button/index.css` (edge-to-text vs edge-to-visual,
`text-to-visual` gap scale, `workflow-icon-size`, derived min-width and pill radius);
Carbon `scss/components/button/_button.scss` (icon-side padding delta, `$spacing-03` gap).
Cross-refs: `14` (component layer architecture), `10` (emit-figma contract), `11` (locked
name contract), `20` (interactive colour system). KB: `components/button.md` §2 (the
adjudicated anatomy this builds on), `components/_schema.md` (§15 shape),
`components/icon.md` (optical metrics for the missing icon tier), `03` §6 (components-as-data).*
