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
    leadingVisual:  { kind: slot, optional: true, size: icon.size.* }
    label:          { kind: text,  required: true, type: size.*.type }
    trailingVisual: { kind: slot, optional: true, size: icon.size.* }
    trailingAction: { kind: slot, optional: true, note: "dropdown caret — distinct from trailingVisual" }
    spinner:        { kind: overlay, replaces: leadingVisual, note: "width-preserved" }
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

**One def, and that is the cost.** `button.ts` is the only def of five with an `anatomy` block
(`apps/plugin/src/main.ts`: *"A loop over five defs would throw on four of them"*). Each additional
one means new anatomy authoring, its own variant space, and its own live-test cycle — which is the
superlinear cost #718 turns on, and the reason "prove the schema" is a better description of this
leg's job than "build the kit".

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
