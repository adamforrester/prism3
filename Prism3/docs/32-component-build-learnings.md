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
zero color tokens out of the seven values #488's state axis declares — but `focus-visible` has the
ring, and `pending` has `anatomy.parts.spinner`. Only `inactive` is a genuine gap, with neither token
nor part. A blanket "three states are unbound" would have been three-for-one wrong.

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
contracts and `web/dist`, all of which the US-English gate scans. A skill that describes a stale API
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
  `loading` and silently dropped `inactive` — and moved the headline count from the correct 756 to
  648.
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
