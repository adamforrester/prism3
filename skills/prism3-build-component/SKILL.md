---
name: prism3-build-component
description: >-
  Author a NEW Prism3 component definition — one `ComponentDef` the engine
  projects into every surface (Figma shell, Web Components / React, Storybook,
  docs, `.ai.json`, Code Connect). Teaches brief-first research (the KB component
  brief is the primary source), the brief-to-def field mapping, what ships and what
  stays maintainer-only, the anatomy model (the part tree and its structure/paint
  split), the nesting relations, the naming canon, every gate list a new def joins,
  and the verification discipline a shipped def owes — including the mutation that
  must fail a surface gate by name. For an agent working ON the engine, not with
  its output.
when_to_use: >-
  When adding or reshaping a component definition under
  `packages/engine/components/` — a new control, a new media component, or a new
  part kind on an existing one. Read it before writing the def, and again before
  running `npm run verify`, so every claim the def makes is grounded in the brief and
  the schema, and every gate the change touches fails by name under a mutation.
---

# prism3-build-component — authoring a component definition the engine can project

You are writing **one `ComponentDef`** — the single source from which every artifact
projects: the Figma component shell, the Web Components / React code, Storybook, the
docs, the `.ai.json` metadata, and Code Connect. A definition binds visual properties to
**locked token names, never values**, which is what makes it brand- and mode-invariant:
brands and modes are value-columns the engine already supplies. The schema and its
runtime validator are `packages/engine/component-schema.ts`; the definitions live one file
per component under `packages/engine/components/` (read `packages/engine/components/button.ts`
as the worked substrate). Register a new def in `packages/engine/components/index.ts` — import
it, add it to `componentDefs`, and re-export it; `typecheck-components` fails by name if a
tracked def file is missing from the set, or the set names a file git does not track.

> **The contract:** every binding resolves against a real generated tree, every factual
> claim in the def's prose is checked by `lint-skills`/`lint-us-english`/`lint-voice`, and
> a change to what the def projects must make a **surface gate fail by name** under a
> mutation. A green suite that does not name your gate is silence, not a pass.

Component API, variant sets, brand-facing names and copy are the owner's decisions
(`CLAUDE.md` principle 6). Where the brief leaves one open, or where you would depart from
it, record the question in the PR and hold it rather than settling it inside the def.

## 0. Start from the KB brief

**The brief is the primary source.** The knowledge base (a separate repo, `knowledge-base`)
carries one field-research brief per component at `components/<name>.md`, and every def whose
component has a brief is authored from it. Read the whole brief before the schema: it records the field's
positions, the practice's defaults, the contested points and the accessibility contract, and
its §15 is the agent-consumable projection of the prose above it.

**A Prism 2 spec is secondary.** Where one exists under `reference/Prism2/component-specs/`
(`text-field.json`, `select.json`, `toggle-switch.json`, and the rest), read it as evidence for
sizing and Figma structure, and improve on it where the brief says it falls short. Cite it in a
code comment only; no shipped field names Prism 2 (see *What ships* below).

**The header cites the brief exactly once**, in the def file's leading `/** … */` block, as
``KB brief: `components/<name>.md` ``. `packages/engine/test.ts` reads each header and fails by name
on a second citation, on a header with neither a citation nor the no-brief line below, and on a
header with both. It also checks the def's `category` against `KB_BRIEF_CATEGORY`, an authored table of each brief's own `category:` frontmatter: a def citing a brief that has no row
fails until you add the row, lower-cased from the brief. With no brief, the header says
`No KB brief` and states the choice beside it (`Category \`foundations\`` and why), as
`packages/engine/components/veil.ts` does.

### The brief → def field mapping

The brief's sections follow one locked spine, so each lands in a known place:

| Brief section | Def field |
|---|---|
| §1 Framing | `description`, and the one-line `summary` |
| §2 Anatomy and parts | `anatomy` (§2 below) |
| §3 Properties / API | `props` |
| §4 States and variants | `states`, `variants`, `axisKinds`. A brief state or axis the def omits is a `contested` entry in `notes` that says so |
| §5 Usage guidance | `docs` (`usage`, `do`, `dont`) |
| §6 Accessibility | `accessibility` (`role`, `wcag`, `keyboard`, `focus`, `aria`) |
| §7 Content guidelines | `content` (`labelPattern`, `errorPattern`, `emptyPattern`, `dialogPattern`, `metaphorRules` — a closed key list) and `docs.contentGuidelines` |
| §8 Motion and transition | `motion` (`enter`, `exit`, `reduceMotion`) |
| §9 Internationalization | `accessibility` `aria` (translatable names, what mirrors) and `anatomy.codeOnly` entries led by `RTL —` or `text expansion —` (the schema has no i18n field) |
| §10 Naming | `aliases` (kebab-case ids) and `ai.triggerKeywords` (phrases) |
| §11 Implementation notes | `anatomy.codeOnly` |
| §12 Related and alternative components | `composition` and `ai` (`ai.commonPartners`, `ai.avoidWhen`) |
| §13 Field POV evolution | the `evolution` bucket of `notes` |
| §15 Agent-consumable schema | identity (`category`, `status`), and its open points into the `contested` and `unverified` buckets of `notes` |

`ai.primaryPurpose`, `ai.whenToUse` and `ai.avoidWhen` are required; `ai.avoidWhen` is the
highest-value field, because an agent otherwise uses whatever it finds.

**Siblings must be distinguishable.** When one file exports several defs (`makeButton` builds
`button`, `button-destructive` and `button-neutral`), give each its own `ai.triggerKeywords`, an
`ai.avoidWhen` that names the better-fitting sibling, and an `ai.generationPriority` for the
tiebreak. `packages/engine/test.ts` pins that the button families' sibling keyword sets differ. The brief sets no
priority, so the numbers are a judgment call to flag in the PR.

### What ships, and who reads it

Two channels are maintainer-only: `notes` and `anatomy.codeOnly`. The docs projection writes them
to `packages/engine/schema/component-maintainer.json`, a record that does not ship; the plugin build
strips them (`notes` whole; each `codeOnly` entry down to its leading term); and
`lint-component-docs` and `apps/plugin/lint-bundle-prose.ts` fail by name if either reaches a
shipped form. Provenance, history, issue numbers, brief section references and Prism 2 go there,
or in code comments.

`summary` is the one line a designer reads in Figma: the plugin writes it as the component
set's description (each component's, for an `emitAsComponents` def) and as the description on
the page's section header. Author it — do not cut it from `description` — at about 90
characters, at most 100, one line, ending in a period (validated).

**Every other field ships, and is written for people.** `packages/engine/regen.ts` projects each
def's documentation fields — identity, `summary`, `description`, `props`, `states`, `variants`,
`accessibility`, `content`, `docs`, `motion`, `composition` and `ai` — into
`out/components/components.ai.json` and a page per component, `out/components/<id>.md`, which leaves
out only the agent-only `ai.triggerKeywords` and `ai.generationPriority`. Everything but the two
maintainer channels, a part's `note` included, is also in the plugin bundle a designer imports. So in a shipped field:

- no "brief §N" and no "per the KB" — state the behavior, not where it came from;
- no "def" as a reader-facing word — name the component (`Button.Neutral`), not the file;
- no issue numbers;
- no all-caps emphasis;
- no Prism 2, and no "follows Prism 2";
- US English, and `docs/voice-standard.md` — its banned words, and the recessive voice;
- a WCAG criterion the gates do not check is stated as intent ("targets SC 2.5.5"), never as a
  guarantee.

`packages/engine/test.ts` (`component-refs`, `component-names`, `component-prose`), `lint-us-english`
and `lint-voice` catch Prism 2, dangling names, en-GB spellings and banned words. Nothing yet gates
"brief §N", "def", all-caps emphasis or issue numbers in a component's shipped fields:
`lint-figma-descriptions` refuses `#NNNN` in token descriptions only. So those four are yours to hold
(#1717 is open on the entries that remain).

### Identity and relations — the #1700 rules

- `name` — PascalCase, or `Family.Part` inside a family, reading as the id with the separators
  removed (`checkbox-group` is `Checkbox.Group`). Name siblings in prose by that name.
- `category` — one of the seven in `COMPONENT_CATEGORIES` (foundations, layout, form, navigation,
  feedback, data, overlay), and the brief's own.
- `status` — `draft`. Every def is `draft`, whatever the brief's research status says; moving one to
  `stable` is an owner call about the engine surface.
- `aliases` — kebab-case ids (`loading-indicator`); a phrase with spaces is a trigger keyword.
- `inherits` — a registered def id, the def a reader goes to for the substrate. Nothing resolves its
  fields into yours, so restate any prop your component needs (icon-button restates `onClick` and
  `type`).
- `composition.composesWith` — exactly the components your anatomy nests: every `nests` on a `nest`,
  `absolute` or `overlay` part, and nothing else. `packages/engine/test.ts` holds it as an equality in
  both directions. Hosts that nest you, siblings that sit beside you, and a slot's usual content
  (the `icon` a button's slot carries) go in `ai.commonPartners`.
- `composition.alternativeTo`, `supersedes`, `supersededBy` and `ai.commonPartners` hold registered
  ids only. An unbuilt component goes in the `planned` list; a described pattern ("a bare <select> with
  no label wiring") in `composition.replacesPatterns`.
- `notes` — `contested` holds only open or argued items; a sentence opening "Settled", "Resolved" or
  "CLOSED" is refused, and the settled item moves to `evolution`. `unverified` holds claims not yet
  gated or sourced.

## 1. The structure / paint split (the load-bearing decision)

A def carries two layers that say different things, and folding them together is the
combinatorial trap the split exists to avoid:

- **`anatomy`** — structure and geometry: the part tree, the layout model, padding, gap,
  height, radius, sizes. One tree, invariant across every variant.
- **`tokens`** — paint: fill, border, ink, overlay, keyed per variant coordinate.

Paint is variant-dependent in a way structure is not — a button's box is one row with one
gap while its fill changes across nine intent×appearance coordinates. Anatomy references
**binding keys** in `tokens`, never raw token refs, so a `{size}` in a key expands over the
size axis and one indirection keeps the def brand-invariant.

## 2. Materialized anatomy — the part tree

Every part declares a `kind` from a closed vocabulary (`packages/engine/component-schema.ts`,
`PartKind`):

| Kind | What it is |
|---|---|
| `box` | a layout container — the only kind carrying layout/padding/gap, and the only one that paints via `paintSlots` |
| `text` | a text node; carries a `type` binding and asks the paint grammar for an ink slot via `paintSlot` |
| `slot` | swappable content (icon / avatar / counter) — an instance-swap whose target the caller nominates per file |
| `overlay` | occupies another part's position rather than its own row cell (a spinner replacing a visual) |
| `absolute` | takes no cell in the flow — an absolutely-positioned sibling (a focus ring) |
| `nest` | an in-flow instance of another component — takes a cell like a box, content resolved from `nests` |
| `vector` | a filled outline whose content is geometry — names a `glyph` from the icon vocabulary |

**The root part is named for its role, never `root`.** The corpus names it semantically:
`container` for button, icon-button, select, text-field, textarea and the two groups; `row` for
checkbox-row, radio-row and switch-row; `control` for checkbox-control and radio-control; `track`
for switch-control; `label` for field-label; `message` for field-message; `ring` for focus-ring;
`glyph` for icon; `frame` for image-placeholder and spinner; `wash` for veil. Pick the existing key
that fits the shape rather than inventing one.

**`anatomy.codeOnly` is required and non-empty** — what will not survive the Figma leg, stated per
def rather than discovered. It carries two kinds of entry: structure Figma cannot hold, and the
brief's code-tier rules (§9 i18n, §11 implementation) that have no other field. Both are
maintainer-only.

**The `admits()` trap.** `codeOnly` is also how a def admits an axis or state it does not project:
an entry that leads with the name (`pending — why Figma cannot carry it`) licenses dropping `pending`
from the Figma state axis. So an entry that merely opens with an axis or state name — a note about a
state you do project — silently permits that state to vanish from Figma with every gate green (#867).
Lead such entries with something else (`the spinner swap —`, `RTL —`). Both #1697 and #1699 retired
an instance of this.

## 3. Nesting — how a part points at another component

A part whose content is another component declares a `NestingRelation` (`nesting`), and the
split it encodes is identity-versus-policy: which component fills the slot is a fact about the
file (the caller nominates it), whether that component's variants surface on the parent is a
fact about the design (the def declares it). Three kinds:

- **`swap`** — the whole component is replaced (an icon in a `slot`). Variants do not enter
  into it; the consumer picks a different component, not a coordinate of this one.
- **`nest-fixed`** — the nested component has variants, the parent picks one, and the consumer
  never changes it. The `variant` is required: Figma's default is its first child, an artifact
  of creation order, so inheriting it re-commits an order-not-decision error that nothing
  downstream would notice. Add `follow` to name axes whose value flows from the host member
  into the nested coordinate — select's message part carries `follow: ['status']` so an errored
  field drives its nested message to the error status, and button's ring carries
  `follow: ['surface']` so a ring under an inverse button keeps its own contrast on the dark
  band. `variant` is the fallback where the host does not carry that axis.
- **`nest-exposed`** — a nested component whose variants the consumer controls from the parent
  (#1330). It carries the same `variant` default and optional `follow` as `nest-fixed`, plus
  `expose` naming the child axes the consumer drives: those surface on the parent as Figma exposed
  nested-instance properties (and as React props, `.ai.json` options, Storybook controls) rather
  than the parent re-enumerating them into its own variant matrix. The two lists are disjoint — the
  validator refuses an axis in both. `checkbox-row` nests `checkbox-control` `nest-exposed`, exposing
  `selection` + `state` and `follow`ing its own `size`, which collapses the Row's Figma set to 3
  members.

`absolute`, `nest` and `overlay` name their component in `nests`. An `absolute` sits beside the flow and
a `nest` takes a cell; both materialize as an instance, so both are `nest-fixed` or `nest-exposed` and
the validator refuses `swap` on either. Every absolute in the corpus is a focus ring, `nest-fixed`: one
shared component every host points at. `lint-nesting` fails by name on a `nests` id no def has, and
on a cycle.

**Overlays.** An overlay declares the state that shows it (`when`) and what it `replaces` — an
ordered candidate list, resolved to the first part present at each coordinate, with a required
candidate allowed only last. `overlaysWhenAbsent` names the fallback part to overlay out of flow, and
it is needed only when every candidate is optional (button's `['leadingVisual', 'trailingVisual']`
needs `label`; icon-button's required `['icon']` needs none). An overlay may also `nests` a whole
component (#1670): its relation is then `swap` and it must bind `size`, which picks the nested member's
rung — button's pending state swaps in `spinner` this way.

**A nested part that announces itself.** When you nest a component with its own live announcement
inside a host that announces the same event, the host's `accessibility` `aria` tells the implementer to
set `aria-hidden="true"` on the nested one. The spinner defaults to a polite "Loading" status, so Button
and IconButton each say to hide it while they announce their own busy state (#1706); otherwise a
screen reader hears it twice.

**Standalone parts and page placement.** A def whose members are standalone parts rather than one
variant set (the icon glyphs, the spinner sizes) sets `figmaProperties.emitAsComponents`: each member
becomes a top-level `<id>/<value>` component, which needs exactly one variant axis and none of the
set-only properties. Every def is placed on a page in `TAXONOMY` in `apps/plugin/src/file-taxonomy.ts`
— a family page under Components, or a page under Subcomponents for a nested part (field-label,
focus-ring, spinner). The plugin test fails by name on a def placed nowhere; which section a new
component belongs to is the owner's call.

## 4. Aspect-lock — a proportion, not two dimensions (Option A)

A `box` that must hold a fixed proportion declares `aspectRatio` naming a variant axis whose
values are `W:H` strings, and binds **exactly one** nominal dimension. The projector parses
each member's ratio and both executors resize the frame and call `lockAspectRatio()`, so Figma
derives the second dimension from the first. Binding two dimensions cannot hold a lock — the
second `setBoundVariable` evicts the first — so the validator refuses `aspectRatio` alongside a
second bound dimension and requires exactly one of `size`/`width`/`height`.
`packages/engine/components/image-placeholder.ts` is the worked example: a `ratio` axis of
`1:1 | 4:3 | 16:9`, `width` bound to the standalone-extent idiom below, and `clipsContent: true`.
The read-back gate `test:roundtrip` builds each projected def, reads the built `targetAspectRatio`
back out of the host shim, and diffs it against the declared proportion — the one component check
whose actual value comes from the host, not from the plan.

## 5. Idioms the corpus reaches for

- **Standalone extent → `container.narrow`.** A part with no cell of its own — a focus ring,
  a veil, an image-placeholder frame — still needs a buildable size when nobody nests it. Bind
  a nominal side to a semantic role (`container.narrow` is 720px in veil and image-placeholder;
  focus-ring uses `size.md.height`) and treat it as a placeholder a host overwrites with its
  own bounds. It is nominal, not a chosen rung — a raw primitive would fail the floor gate.
- **Status border.** A validated field swaps its border for every non-default status —
  `border.danger` at `error`, `border.warning` at `warning`, `border.success` at `success`
  (text-field and select, owner-directed in #1517). The status-led paint key leads the grammar
  (`{status}.{slot}.{state}` before `{slot}.{state}`), so the status boundary wins over the
  interactive-state progression and persists at rest, hover and focus.
- **Paint-key grammar.** A paint key is templated over the def's own axes with the `{axis}.{axis}`
  syntax — veil's `paintKeys: ['{value}.{intensity}']` fills the full 2×3 grid, each coordinate
  binding the matching semantic role. A `text` part names one ink slot in `paintSlot`; a `box`
  names its slots in precedence order in `paintSlots` (a box that names none paints nothing and
  is structure). Order is precedence: `['overlay', 'fill']` reads "the overlay if it resolves,
  otherwise the fill."
- **Hit target → the 44px floor, with two named exceptions.** An interactive control's hit target
  at its default size clears 44px on comfortable and spacious densities. A field control binds
  `size.md.min-height` (#1437), the emitted `max(size.md.height, 44)`, because the plain
  `size.md.height` rung is 36 on a compact brand; a labeled row binds its own `min-height` rung.
  `lint-hit-target` measures each control's default size, and its only exceptions are the small
  Button and compact density — so in shipped prose, SC 2.5.5 is stated as intent, not as a
  guarantee for every size. See `packages/engine/components/select.ts` and
  `packages/engine/components/text-field.ts`.
- **Selection → a tint and a 2px outline, at a constant label weight (the system pattern, owner decision
  2026-09-28).** A control the user selects and deselects in place — Tag's select type today; a segmented
  control, a selectable card or a list option next — shows its selected state as a subtle tint plus a bold
  outline, and neither of the two moves its box. Bind the tint to `color.interactive.primary.subtle-fill.selected`
  in the `overlay` paint slot: the primary fill at an opacity step, emitted by every brand whose
  `outlineInteraction` is not `none` (owner, 2026-09-29). It is brand-dependent in the token contract. On a
  `none` brand `applyOutlineInteraction` drops the binding, and the selected state is the outline and the
  check alone.
  Bind the outline to `color.interactive.primary.border.*` at `border-width.thick` (2px), through a
  `{selection}`-keyed `strokeWidth`, so the unselected member keeps `border-width.hairline`; both executors draw
  the stroke inside the box, so the thicker outline adds no width. Keep the label's type binding the same at
  both selection values — no bold on select, so the label keeps its width — and keep its ink the unselected
  neutral one: the primary ink misses 4.5:1 on the tint (lowest 2.70:1). Add a check mark only where the
  component's brief calls for one, and never let the tint be the only cue. A check mark present only while
  selected is a flow cell of its own, so the selected member is one glyph and one gap wider than the
  unselected one, and a row of them reflows on toggle unless the component reserves that width (Tag does not:
  the owner let it widen, 2026-09-29). At hover and pressed the tint holds and the outline steps to
  `interactive.primary.border.hover` / `.pressed`. See `packages/engine/components/tag.ts`.
- **Glyph ink binds an icon role, never a text role (#1471).** A `vector` or an icon `slot` paints from an
  `icon.*` role (`color.icon.primary`, or the interactive `icon.*` twin the engine mints beside `text.*`),
  never a `text.*` role — even where the two resolve to the same value. The label beside the glyph keeps
  `text.*` because it is text; the glyph says it is a glyph. This is the exact shape of a recurring QA
  finding — icons wired to text variables — so bind the icon role by name and let a value-identical
  rebinding read as the semantic correction it is, not a color change.

## 6. Naming canon — settled, not yours to re-decide

**Boolean props (#1326 decision 2).** DOM-backed booleans are bare; synthetic-state booleans
are `is`-prefixed. So switch-row carries `readOnly` and `checked` (DOM-backed) beside `isPending`
(synthetic); button and icon-button carry `disabled` (DOM-backed) beside `isPending`/`isInactive`
(synthetic). The older `isReadOnly`/`isDisabled`/`pending` prop names no longer exist — do not
reintroduce them. And disabled is not always a prop: field-label dims through its `disabled`
state alone (#1339), so a component whose disabled look comes from its host takes the state and
no duplicating prop.

**Axis and state names are closed vocabularies.** `VARIANT_AXES` in
`packages/engine/component-schema.ts` closes the axis names (the validator refuses any other, and
`lint-axis-values` holds its register to them), and `STATES` closes the state names — it has no
`selected`, for example. Axis values stay open. A component that seems to need a new name (a tooltip
`placement` axis, a `selected` state for a tag or a segmented control) is asking for a schema change,
which is an owner decision: flag it in the PR with the case for it, and never add it to either list
to clear a validator error.

**Selection-axis vocabulary (#1326 decision 1).** Switch spells its axis `[off, on]`;
checkbox and radio spell theirs `[unchecked, checked]`, checkbox adding `indeterminate`. The
switch spelling is a decision taken, not a default inherited — a def whose axis reads
`[unchecked, checked]` is a checkbox somebody asked for. Match the family your component joins.

**Figma display names (#1309/#1380).** `slotAxes`, `swaps`, `texts` and `booleans` each take an
optional `figmaName` — the label a designer reads in the Figma properties panel, decoupled from the
code prop. The key stays the idiomatic code prop (`leadingVisual`, `label`) and is still validated
against `props[].name`; `figmaName`, when present, is the panel name and need not be a declared prop.
Absent, the key is the panel name.

**The icon-property canon (#1380, split at #1331/#1379).** A leading/trailing icon has two Figma
properties — its presence (is the glyph there?) and its content (which glyph) — and the canon governs how
each projects. Content is always a swap: `figmaName` `↳ swap leading icon` / `↳ swap trailing icon`, the
`↳ ` prefix (U+21B3 + space) making Figma nest it beneath the presence toggle, while the key stays the
idiomatic code prop (`leadingIcon`, validated against `props`). A required single icon has no presence
toggle, so its swap takes `figmaName: 'swap icon'` — no `↳`, nothing to nest under (icon-button). The
component's text property (`label` / `value`) projects first, at the top of the panel. All lowercase.

Presence is where the split lives, and it turns on one question — does the glyph's presence move the
container's geometry?

- **Node-visibility boolean (the default).** Presence is a Figma boolean in `figmaProperties.booleans`: the
  glyph node is emitted at every member `visible: false` and the `leading icon` switch flips it in place, so
  presence does not multiply the projected set. This is the case whenever the glyph sits inside the content
  row rather than against the box edge. `select` and `text-field` use booleans for their icons (and
  text-field for `showMessage`) — see `packages/engine/components/select.ts` and
  `packages/engine/components/text-field.ts`.
- **Variant axis (Button only).** Presence is a true/false variant axis (`figmaProperties.slotAxes`, with
  `booleans` stated-empty) only when it drives edge-hugging asymmetric padding. On Button the #326 slot-aware
  inset sets the container's `paddingLeft = leading ? inlineVisual : inlineLabel` per side, and a boolean's
  single-node `visible` cannot touch the container above it — so Button keeps `leading` / `trailing` as
  variant axes with `figmaName` `leading icon` / `trailing icon` (see `packages/engine/components/button.ts`).

So the rule is: **variant axis only when presence drives edge-hugging asymmetric padding; a node-visibility
boolean otherwise.** Verify which case a new component is in against the actual defs before wiring it.

**Axis value order is a decision.** Figma's default member is the set's first child, which is the first
value of each axis in declaration order, so "the Figma default matches the code default" is an axis-order
fact (#1699). Put the code default first.

**A sparse grid.** A variant set is the full cross product of its axes unless the def says otherwise. When
one axis value has no meaning at a value of another (Badge's count and dot have no `subtle` emphasis), list
the missing coordinates in `figmaProperties.excludeCoordinates` as partial coordinates —
`[{ type: ['count', 'dot'], emphasis: ['subtle'] }]` — instead of projecting members that cannot honor the
value. The validator refuses an entry naming an axis or value the set does not have, an exclusion that
empties the set or leaves a declared value on no member, and one that removes the first member or the code
default. `packages/engine/components/badge.ts` is the worked example.

## 7. Verification — the gate lists, the whole run, and the mutation that names your gate

**A new def joins these lists by hand.** Each is authored in its gate, never derived from the registry,
so a new def fails by name until you add it — or, for a floor list, stays uncovered until you do:

| Gate | What to add |
|---|---|
| `lint-hit-target` | an interactive control in `INTERACTIVE` with the key of its hit-target binding; anything else in `EXCLUDED` with its reason. A def in neither fails. A part inside the control that is, or may be, a target of its own (Tag's × slot) carries `innerTarget: true` in the def and goes in `INNER_TARGETS`; a marked part not listed there, an entry naming an unmarked part, and a nested interactive control not listed there each fail. |
| `lint-rung-names` | a def with a size axis in `MUST_COVER`. No size axis → `NO_SIZE_AXIS` with the reason (it fails until admitted); a ladder in `props` only → `LADDER_STATED_ONCE`; size reaching only nested parts → `SIZE_BY_FOLLOW_ONLY`. A default that is not the `md` rung is an owner exception (`HOST_DEFAULT_DEFS`, `ICON_OFFSET_DEFS`), not yours to add. |
| `lint-axis-values` | each (def, axis) pair in `AXIS_VALUE_SETS`: join a set's `defs`, or declare a new set with its `relation` to the canonical one and a reason. Order counts. |
| `lint-standalone-floor` | a def that projects a Figma set in `MUST_PROJECT`. |
| `lint-paint-placement` | a def with an anatomy in `EXPECT_ANATOMY`; one whose box declares `paintSlots` in `EXPECT_PAINTERS`. Both are closed sets. |
| `lint-glyph-geometry` | each `vector` part as `<id>.<part>` in `MUST_COVER`; a fixed (non-templated) glyph in `FIXED_GLYPH`, a `glyphScale` in `SCALED_GLYPH`. |
| `lint-glyph-geometry`, composed or colliding glyphs | a `vector` part whose glyph is not in the icon set (drawn in layers, like the spinner's ring) in `COMPOSED_GLYPH`; a glyph template whose members draw one shape under two names in `DUPLICATE_SHAPES`, with the reason. |
| `lint-absolute-inset` | a nested focus ring as `<id>.focusRing` in `MUST_COVER` and `MUST_CLEAR_STROKE`. |
| `lint-paint` admissions | a paint key whose ref legitimately does not carry its axis value in `PROVENANCE_EXCEPTIONS`; an axis whose values are not color families in `NON_FAMILY_AXES`; a bound paint key no projected coordinate reaches in `UNREACHED_EXPLAINED`. Each needs a reason and fails as stale when it stops applying. |
| `packages/engine/test.ts` | the brief's row in `KB_BRIEF_CATEGORY`, if the brief is new to the corpus. A def with a `presentWhen` part in `GATED_EXPECTED`, and a def binding a `size.<size>.control`, `dot` or `track` key in `CONTROL_DEFS`: both are exact-equality lists. |
| `apps/plugin/src/file-taxonomy.ts` | the def on a page in `TAXONOMY` (§3). |

`lint-component-docs` needs no entry: it reads the registry, so after `packages/engine/regen.ts` a
new def must appear in `components.ai.json`, in its own `<id>.md` page and in the maintainer record, or
the gate fails by name. Its `DEF_FLOOR` is a floor to raise as the catalog grows. The new page is one
more committed artifact, so the count `packages/engine/regen.ts --check` expects moves too:
`EXPECTED_ARTIFACTS` in `verify.ts` and the same number in the CI workflow, together.

Two baselines also move with any new or changed projection and are rewritten only by an explicit
`--accept`: `lint-component-surface` (member count and plan digest per def) and `lint-paint` (the
paint census). Read the diff each prints before accepting it.

**Then run `npm run verify`** (`verify.ts`) — it runs every gate in a declared, checked order and
prints a per-gate PASS/FAIL table. Run the whole list, never a subset chosen because the diff
"only touched a def": CI runs every gate on every PR, so a shorter local list is one a diligent
contributor follows and still ships broken. Regenerate first with `npx tsx packages/engine/regen.ts`.
You need every row PASS and no SKIP.

**A gate is only as strong as the independence of the two things it compares** (`docs/34`). Your
def is the subject of its surface gates, never their oracle: a gate that derived its expectation
by reading the def could only confirm the def agrees with itself, and report that as a pass. So
the test is not "does the suite go red" — it is **mutate the def and confirm your gate is among
the failures, by name.** Two surface gates guard every component:

- **`lint-component-surface`** — per def, the projected member count and a sha256 over the
  `planComponentName|planStamp` rows of the default projection. Reverting a root part key, adding
  a variant axis, or editing a `codeOnly` entry moves the digest; the gate fails naming the def.
  A part's `note` is not on the plan, so editing one moves nothing here.
- **`lint-paint`** — a paint census over every projected coordinate, independent of the def's
  own declarations, so it sees a rebind to a token that resolves (and therefore reports no miss)
  but paints the wrong ink.

For each decision the def takes from its brief, add an arm to `packages/engine/test.ts` that holds it
against a literal from the brief, and mutate the def to watch that arm fail by name. Commit a `wip:`
checkpoint before each mutation so the `git checkout --` restore reaches your work and not a stale
HEAD (the pathspec trap in `CLAUDE.md`), mutate, confirm the named failure, restore, and confirm clean.

**Automatic in Figma — nothing to author.** The plugin writes Figma's purple dashed variant-set
border on every freshly combined set (#1714), and places a section header at the top of each
component page, titled from the page's primary def's name and described by its `summary` (#1711).

## 8. Versioning — which number moves

`ENGINE_VERSION` answers *"what code produced this?"* and bumps on any observable change,
including the projected component surface (#1252): a designer who meets a new variant axis, or
864 members where there were 432, has met a different engine. Two gates force the bump, and each
sees a different part of a def:

- **`lint-emission-version`** watches everything under `packages/engine/out`, and the docs
  projection commits `out/components/**` there. So a new def's page, and any edit to a shipped
  documentation field (`summary`, `description`, `props`, `docs`, `accessibility`, `ai`, and the
  rest), moves `out/components/*` and forces the bump.
- **`lint-component-surface`** reads the projected plans, and its `--accept` refuses until
  `ENGINE_VERSION` has moved forward. A new def is a moved surface (no set → N members). `planStamp`
  hashes the whole plan, and every plan carries the def's `codeOnly` list, so one `codeOnly` edit
  moves every member's digest at the same count; diff the plans before reading a whole-def move as a
  layout or paint change.
- **Nothing forces a bump for `notes` or a part's `note`.** The maintainer record is in
  `MAINTAINER_ARTIFACTS`, outside the watched set, and no plan carries a part `note`.

A new def therefore takes a MINOR bump in `packages/engine/version.ts` with its reason. After the
bump, `npx tsx packages/engine/regen.ts` restamps `out/**`, and
`npx tsx packages/engine/token-contract.ts --check` then asks for a stamp-only `--accept`. A
skill-only change like this file bumps nothing.

`CONTRACT_VERSION` answers *"can my app still resolve the names it references?"* and covers the
guaranteed **token-name** surface only. A component id, prop name or variant value is not a
token name, so binding existing roles leaves `CONTRACT_VERSION` unmoved.

The component-API surface has its own decided direction: a distinct `COMPONENT_CONTRACT_VERSION`
(#1325 Option 3, #1326 decision 3), MAJOR/MINOR by add-versus-rename, evolved from the
component-surface baseline. **The direction is settled; the mechanism is a separate follow-up arc
and does not exist in code today** — do not stamp a component-contract version or gate against
one until that arc builds it.

## Before you finish

1. The def is authored from its KB brief: the header cites it exactly once, `category` is the brief's,
   and every brief section has landed in its field (§0) or is recorded as an omission in `notes`.
2. Shipped fields are written for people — no brief sections, issue numbers, "def", all-caps or Prism 2 —
   and `summary` is one line under 100 characters. Provenance lives in `notes`, `codeOnly` and comments.
3. `composesWith` equals what the anatomy nests; hosts and slot content are in `ai.commonPartners`;
   siblings differ in keywords, `ai.avoidWhen` and priority; `status` is `draft`.
4. The root part is named for its role; `codeOnly` is non-empty, carries the brief's code-tier rules, and
   no entry leads with the name of an axis or state the def projects.
5. Every naming choice matches the settled canon in §6.
6. The def is in every gate list in §7, its docs page and JSON entry are regenerated, both baselines
   are accepted after the ENGINE bump, and `npm run verify` is all-PASS with no SKIP.
7. A mutation of the def fails a surface gate by name, and each brief decision's own arm fails by name.
8. A `docs/00-progress.md` entry carries the diagnosis, the decisions held for the owner, and any trap,
   written as part of the work.
