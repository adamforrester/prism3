---
name: prism3-build-component
description: >-
  Author a NEW Prism3 component definition — one `ComponentDef` the engine
  projects into every surface (Figma shell, Web Components / React, Storybook,
  docs, `.ai.json`, Code Connect). Teaches the anatomy model (the part tree and
  its structure/paint split), the nesting relations, the aspect-lock and
  standalone-extent idioms, the boolean-prop and selection-axis naming canon, and
  the verification discipline a shipped def owes — including the mutation that
  must fail a surface gate by name. For an agent working ON the engine, not with
  its output.
when_to_use: >-
  When adding or reshaping a component definition under
  `packages/engine/components/` — a new control, a new media component, or a new
  part kind on an existing one. Read it before writing the def, and again before
  running `npm run verify`, so every claim the def makes is grounded in the schema
  and every gate the change touches fails by name under a mutation.
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

## 1. The structure / paint split (the load-bearing decision)

A def carries two layers that say different things, and folding them together is the
combinatorial trap the split exists to avoid:

- **`anatomy`** — STRUCTURE and GEOMETRY: the part tree, the layout model, padding, gap,
  height, radius, sizes. One tree, invariant across every variant.
- **`tokens`** — PAINT: fill, border, ink, overlay, keyed per variant coordinate.

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
| `slot` | swappable content (icon / avatar / counter / spinner) — an instance-swap |
| `overlay` | occupies another part's position rather than its own row cell (a spinner replacing a visual) |
| `absolute` | takes NO cell in the flow — an absolutely-positioned sibling (a focus ring) |
| `nest` | an IN-flow instance of another component — takes a cell like a box, content resolved from `nests` |
| `vector` | a filled outline whose CONTENT is geometry — names a `glyph` from the icon vocabulary |

**The root part is named for its role, never `root`.** The anatomy's `root` field names the
part every other part hangs beneath, and the corpus names that part semantically: `container`
for button, icon-button and select (`packages/engine/components/select.ts`); `row` for
checkbox, radio and switch; `label` for field-label; `message` for field-message; `ring` for
focus-ring; `glyph` for icon; `frame` for image-placeholder; `wash` for veil. A bare `root`
misdescribes the part — a column stack is a `container`, not a `row` — so pick the existing
key that fits the shape rather than inventing one.

`anatomy` also requires `codeOnly` — a validated, non-empty list of structure that will NOT
survive the Figma leg. A schema claiming Figma carries everything is wrong, so the ceiling is
stated per def rather than discovered.

## 3. Nesting — how a part points at another component

A part whose content is another component declares a `NestingRelation` (`nesting`), and the
split it encodes is identity-versus-policy: WHICH component fills the slot is a fact about the
file (the caller nominates it), WHETHER that component's variants surface on the parent is a
fact about the design (the def declares it). Three kinds:

- **`swap`** — the whole component is replaced (an icon in a `slot`). Variants do not enter
  into it; the consumer picks a different component, not a coordinate of this one.
- **`nest-fixed`** — the nested component has variants, the parent picks one, and the consumer
  never changes it. The `variant` is REQUIRED: Figma's default is its first child, an artifact
  of creation order, so inheriting it re-commits an order-not-decision error that nothing
  downstream would notice. Add `follow` to name axes whose value flows from the host member
  into the nested coordinate — select's message part carries `follow: ['tone']` so an errored
  field drives its nested message to the error tone, and button's ring carries
  `follow: ['surface']` so a ring under an inverse button keeps its own contrast on the dark
  band. `variant` is the fallback where the host does not carry that axis.
- **`nest-exposed`** — a nested component whose variants the consumer controls from the parent.
  It stays REFUSED on a `nest` part (#761): the mechanism the composed field needs is
  `nest-fixed` with `follow`, and the exposed form is not built.

`absolute` and `nest` both name their component in `nests` and resolve it `nest-fixed`; the
only difference is whether the instance sits in the flow (`nest`, taking a cell) or beside it
(`absolute`, taking none). A focus ring is the `absolute` case — one shared component every
host points at, rather than a ring redrawn per host.

## 4. Aspect-lock — a proportion, not two dimensions (Option A)

A `box` that must hold a fixed proportion declares `aspectRatio` naming a variant axis whose
values are `W:H` strings, and binds **exactly one** nominal dimension. The projector parses
each member's ratio and both executors resize the frame and call `lockAspectRatio()`, so Figma
DERIVES the second dimension from the first. Binding two dimensions cannot hold a lock — the
second `setBoundVariable` evicts the first — so the validator refuses `aspectRatio` alongside a
second bound dimension and requires exactly one of `size`/`width`/`height`.
`packages/engine/components/image-placeholder.ts` is the worked example: a `ratio` axis of
`1:1 | 4:3 | 16:9`, `width` bound to the standalone-extent idiom below, and `clipsContent: true`.
The read-back gate `test:roundtrip` builds each projected def, reads the built `targetAspectRatio`
back out of the host shim, and diffs it against the declared proportion — the one component check
whose ACTUAL comes from the host, not from the plan.

## 5. Three idioms the corpus reaches for

- **Standalone extent → `container.narrow`.** A part with no cell of its own — a focus ring,
  a veil, an image-placeholder frame — still needs a buildable size when nobody nests it. Bind
  a nominal side to a semantic role (`container.narrow` is 720px in veil and image-placeholder;
  focus-ring uses a size-height role) and treat it as a placeholder a host overwrites with its
  own bounds. It is nominal, not a chosen rung — a raw primitive would fail the floor gate.
- **Error-only border.** A validated field paints its border for the error tone only —
  `border.danger` at `error`, the neutral state border at `warning`/`success` (the nested
  message carries those tones). The tone-led paint key leads the grammar so the danger boundary
  wins over the interactive-state progression and persists at rest, hover and focus. Select
  follows text-field here; there is deliberately no `border.warning`/`border.success` role.
- **Paint-key grammar.** A paint key is templated over the def's own axes with the `{axis}.{axis}`
  syntax — veil's `paintKeys: ['{value}.{intensity}']` fills the full 2×3 grid, each coordinate
  binding the matching semantic role. A `text` part names ONE ink slot in `paintSlot`; a `box`
  names its slots in precedence order in `paintSlots` (a box that names none paints nothing and
  is structure). Order is precedence: `['overlay', 'fill']` reads "the overlay if it resolves,
  otherwise the fill."

## 6. Naming canon — settled, not yours to re-decide

**Boolean props (#1326 decision 2).** DOM-backed booleans are BARE; synthetic-state booleans
are `is`-prefixed. So switch carries `readOnly` and `checked` (DOM-backed) beside `isPending`
(synthetic); button, icon-button and field-label carry `disabled` (DOM-backed) beside
`isPending`/`isInactive` (synthetic). The older `isReadOnly`/`isDisabled`/`pending` prop names
no longer exist — do not reintroduce them.

**Selection-axis vocabulary (#1326 decision 1).** Switch spells its axis `[off, on]`;
checkbox and radio spell theirs `[unchecked, checked]`, checkbox adding `indeterminate`. The
switch spelling is a decision taken, not a default inherited — a def whose axis reads
`[unchecked, checked]` is a checkbox somebody asked for. Match the family your component joins.

**Figma display names (#1309/#1380).** `slotAxes`, `swaps` and `texts` each take an optional
`figmaName` — the label a designer reads in the Figma properties panel, decoupled from the code
prop. The KEY stays the idiomatic code prop (`leadingVisual`, `label`) and is still validated
against `props[].name`; `figmaName`, when present, is the panel name and need NOT be a declared
prop. Absent, the key is the panel name — byte-identical to before. Use it to give a panel a
designer's register without capitalizing or renaming the code prop.

**The icon-property canon (#1380).** A component with leading/trailing icon slots projects, top
to bottom: a `label` text property (the `planSetProperties` order is text → swap → boolean, so
the keyed-`label` text lands first), then each presence as a true/false VARIANT axis with
`figmaName` `leading icon` / `trailing icon`, each immediately followed by its swap whose
`figmaName` is `↳ swap leading icon` / `↳ swap trailing icon`. A true/false variant renders as a
switch in Figma; presence stays a variant (not a Figma boolean) because on button it drives the
#326 asymmetric inset a boolean cannot reach, and select and icon-button follow the same
mechanism so the panel reads identically. The `↳ ` prefix (U+21B3 + space) makes Figma nest the
swap beneath its switch; a REQUIRED single icon has no switch, so its swap takes
`figmaName: 'swap icon'` — no `↳`, nothing to nest under (icon-button). All lowercase.

## 7. Verification — the whole list, and the mutation that names your gate

Run **`npm run verify`** (`verify.ts`) — it runs every gate in a declared, checked order and
prints a per-gate PASS/FAIL table. Run the whole list, never a subset chosen because the diff
"only touched a def": CI runs every gate on every PR, so a shorter local list is one a diligent
contributor follows and still ships broken. Regenerate first with
`npx tsx packages/engine/regen.ts`, then the engine gates (`regen` `--check`,
`lint-component-surface`, `lint-paint`, `lint-nesting`, `typecheck-components`, `test`, the
DTCG-alias and contrast checks, and the rest CONTRIBUTING.md §3 lists), then the web, plugin,
tokenpress, exporter and tokens gates, with `lint-us-english` and `lint-voice` LAST because
their scope includes the built bundles.

**A gate is only as strong as the independence of the two things it compares** (`docs/34`). Your
def is the SUBJECT of its surface gates, never their oracle: a gate that derived its expectation
by reading the def could only confirm the def agrees with itself, and report that as a pass. So
the test is not "does the suite go red" — it is **mutate the def and confirm YOUR gate is among
the failures, by name.** Two surface gates guard a component:

- **`lint-component-surface`** — per def, the projected member COUNT and a sha256 over the
  `planComponentName|planStamp` rows of the default projection. Reverting a root part key, adding
  a variant axis, or editing `codeOnly` prose moves the digest; the gate fails naming the def.
- **`lint-paint`** — a paint census over every projected coordinate, independent of the def's
  own declarations, so it sees a rebind to a token that RESOLVES (and therefore reports no miss)
  but paints the wrong ink.

Commit a `wip:` checkpoint before each mutation so the `git checkout --` restore reaches your
work and not a stale HEAD (the pathspec trap in `CLAUDE.md`), mutate, confirm the named failure,
restore, and confirm clean.

## 8. Versioning — which number moves

`ENGINE_VERSION` answers *"what code produced this?"* and bumps on any observable change,
including the projected component surface (#1252): a designer who meets a new variant axis, or
864 members where there were 432, has met a different engine. `lint-emission-version` is
structurally blind to the projection — component payloads are not committed under `out/` — so
`lint-component-surface` is what forces the bump. A skill-only change like this file bumps
nothing; let the gates dictate, and if none demands a move, leave the version alone.

`CONTRACT_VERSION` answers *"can my app still resolve the names it references?"* and covers the
guaranteed **token-name** surface ONLY. A component id, prop name or variant value is not a
token name, so binding existing roles leaves `CONTRACT_VERSION` unmoved.

The component-API surface has its own decided direction: a distinct `COMPONENT_CONTRACT_VERSION`
(#1325 Option 3, #1326 decision 3), MAJOR/MINOR by add-versus-rename, evolved from the
component-surface baseline. **The direction is settled; the mechanism is a separate follow-up arc
and does not exist in code today** — do not stamp a component-contract version or gate against
one until that arc builds it. Until then, a component rename is recorded through the existing
rename registries and detected as an `ENGINE_VERSION`-forcing digest move, with no compatibility
classification yet.

## Before you finish

1. Every binding resolves against a real generated tree (the validator checks this).
2. The root part is named for its role; `codeOnly` is non-empty and honest about the Figma ceiling.
3. Every naming choice matches the settled canon in §6 — no reintroduced legacy prop name.
4. `npm run verify` is all-PASS, and a mutation of your def fails a surface gate BY NAME.
5. A `docs/00-progress.md` entry carries the diagnosis and any trap, written as part of the work.
