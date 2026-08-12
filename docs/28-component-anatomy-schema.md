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
