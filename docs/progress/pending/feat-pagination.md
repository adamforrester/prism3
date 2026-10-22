## (2026-10-16) — Pagination: numbered, compact and simple, on a new page cell in a native items slot (#2665)

Built to the proposal and wireframe on #2665, which the owner approved with every numbered call at its recommendation
(A). Cites the knowledge base's `components/pagination.md` (category Navigation), read for this build. Two defs, both on
a new `↳ Pagination` page under Components:

- **Pagination** (`pagination`), 12 members: `type` [numbered, compact, simple] × `style` [border, underline] × `size`
  [medium, small, large], the style on numbered only. As first built (superseded by Q414 A, below), numbered
  was a nested IconButton.Neutral (ghost, square, a left chevron through #2645's swap override), a native `items` slot of
  seven Pagination.Item instances showing page 5 of 10 (1 … 4 [5] 6 … 10), and a second IconButton.Neutral with a right
  chevron, 4px apart. compact put "Page 5 of 10" between the two buttons. simple was two nested Button.Neutral, text,
  "Previous" and "Next" with their chevrons, at opposite ends of a row built at 428px. Previous and next are
  `nest-exposed` on `state`, so a designer sets them to disabled at an end.
- **Pagination.Item** (`pagination-item`, unprefixed per Q394 A, the `items` slot's preferred item), 27 members: `type` [page, ellipsis] ×
  `selection` × `style` × `size` × state [rest, hover, pressed, focus-visible], the current page at rest and
  focus-visible only (call 7) in each style, and the ellipsis at rest only. A cell on IconButton's height rung with
  Tag's `minWidthKey` floor (as wide as it is tall, hugging past two digits). The current page has a border or an
  underline (below), its number in the emphasis weight with Tab's bold reserve holding the width; another page takes
  the neutral overlay wash.

### After QA: the current page is marked, not filled (Q381, 1 A and 2 A)

The owner's QA on the first build: a primary-filled current page competes with primary buttons, and it is a "you are
here" marker, not a selection. So it has no fill. It has a border in `color.border.tertiary`, and its number is
semibold (the emphasis weight). Pagination has a per-instance `style: border | underline`, passed only to the current
page. Underline is a 2px bar (`border-width.thick`) under the number in the same role. An empty 2px frame above the
number balances it, so the number stays on its neighbors' line. The border is `border-width.hairline`, drawn inside the
cell.

The role is the neutral border role with the least contrast that still clears 3:1 against `background.primary`, in
every committed brand × mode. Measured: `border.primary` is 1.38 to 4.63, `border.secondary` 2.00 to 10.14 (it fails in
every light and dark mode), and `border.tertiary` 4.21 to 19.60. No neutral role sits near 3:1, so the gray is darker
than "just meets" suggests; a role nearer 3:1 would be a new token. `test.ts` measures the bound role at 3:1 in all 20
cells, and asserts that no lighter rung of that typed ladder clears it.

### After the first host build: the ellipsis read "1"

The first plugin build reported two misses: `label` and its reserve "COLLAPSED". Pagination.Item gave the ellipsis its
"…" through `byVariant` on the one `label` TEXT property. A set-level TEXT property holds one default that every bound
member displays (#1567), so every member, the ellipsis included, read "1". The ellipsis now has its own text part,
`mark`, with its own TEXT property (Figma name "ellipsis", prop `mark`), and the number's box is on page members only.
A new corpus arm in `test.ts` holds the host's rule for every def: no TEXT property is behind two different captions
across its set.

### Owner decisions Q394 A, Q395 A and Q404 A (2026-10-17)

- **Q394 A** (on #2783): a slot item is not a part "used only inside its parent" in Q349's sense. So the item is
  `pagination-item`, unprefixed, and the `items` slot names it as its preferred item with preferred-only
  (`allowPreferredValuesOnly`), the Breadcrumbs shape. The #1392 paste harness now provisions a slot's preferred
  component as a keyed set in the file, its members from that def's own projection, as the real build makes it first.
- **Q395 A:** the current page keeps `border.tertiary` at 1px, as built.
- **Q404 A** (superseding Q396): the gap marker is the existing `more-horizontal` icon (`more-horizontal-filled`, the
  glyph Breadcrumbs' overflow uses), decorative, `aria-hidden` and not interactive. The ellipsis's text part, its TEXT
  property and the `mark` prop are gone. The item's one TEXT property, `label`, is bound on page members only, behind
  the one caption "1", so the build's caption collapse cannot recur. The icon is at IconButton's glyph rungs
  (`icon.size.sm`, `md`, `lg`, the chevrons' size) in `color.icon.secondary`; both are held for the owner.

Sizes lead with medium in both (Q347, Q359), which #2752 (Q1 B) has since made every ladder's order, so both join the
canonical size set, `lint-rung-names` DEFAULT_FIRST and the #2752 default-member rule's sized list.

### The one engine change: a state can be excluded from some members

The approved 21 members need a sparse grid on the STATE axis, and `excludeCoordinates` refused any axis but a variant
axis ("the state and slot axes have their own presence mechanisms"). The state axis has none for "this state on these
members only": `states` is per def. So the state became one more dimension of the grid, in four places that each read
it independently: the validator (`figmaPropertyErrors`, values from `stateAxis`, the first-member and code-default
checks over the full grid), the arithmetic count (`figmaVariantCount`'s inclusion–exclusion now multiplies the state
into each box instead of after it, which is the old number whenever no entry names the state), the projector
(`figmaAnatomySet` checks the exclusion inside the state loop; `figmaAnatomyPlan`'s refusal sees the state), and the
lint walkers' own one-line matchers (`lint-paint`, `lint-paint-placement`, `tools/binding-audit`). The walkers keep
their own matchers on purpose (they are the independent side of their gates); they now pass the state only when they
plan one, the projector's own reading of an unsupplied axis. The plugin needed nothing: its reaction planner already
drops a reaction whose destination member is absent, so the current page gets no hover or press reaction, and
`planSetLayout` places members by name. No executor file moved for this.

### Traps met

- **A `_` building block cannot be a slot's `preferred` component.** Figma leaves an underscore component out of a
  published library, and the projection refuses it by name. The first build carried `minChildren: 1` only; the owner's
  Q394 A resolved it by dropping the prefix on slot items.
- **Overrides inside a native slot were written twice.** The executor's slot pass (`toSlots`) runs `build` over the new
  SLOT and visits its items a second time, so a per-instance override inside a slot was applied, and its miss reported,
  twice. The corpus re-apply in `test-update-apply.ts` caught it (the update's misses outnumbered the build's).
  Pagination is the first def with overrides inside a slot; the fix is #2660's own (`instanceValuesWritten`). This
  branch carried a port of it until #2660 merged; since that merge the executor matches main and this PR moves no
  executor code.
- **Test worlds lacked the override glyphs.** `test-update-apply.ts`'s `world()` and `test-canvas-furniture.ts`'s
  rollout built no `icon/chevron-*` components, so the update refused a plan swapping to them; both now provision every
  glyph a plan's overrides name.
- **The studio catalog missed override swaps as nests.** `component-catalog.ts` walked `nestTarget` and `swapTarget`
  only, while the plugin's dependency pre-build (`planTargets`) has read override swaps since #2645. No def overrode a
  swap before, so it never showed; the catalog now walks them too, and Pagination nests `icon`.
- **`lint-paint` arm 1 does not admit a leading `type`.** Exempting `type` as a non-family axis was tried and the
  family tripwire caught it at once: List.Item's `type=icon` binds the `color.icon` family. So the item's paint keys
  lead with `selection` (`{selection}.{type}.{slot}.{state}`), as Tab's and the segment's do.
- **The #1392 paste harness gave nested components TEXT properties only.** Pagination is the first nest-exposed host
  whose override swaps a nested glyph, so the stub now also models each such nested component's INSTANCE_SWAP
  properties from its own def, and provisions the override glyphs.
- **A text part needs a TEXT property keyed by a prop.** The compact "Page 5 of 10" is the one shipped string with no
  prop in the approved table, so `getStatusText` (the translatable status string, which the brief's §9 asks for and
  the live region reuses) carries it. Held for the owner.

### Owner decision Q414 A (2026-10-18): Pagination draws its own previous and next

#2808 (Q386, merged in #2813) made it a gate that no component requires a Neutral button family, which approved call
2 A (IconButton.Neutral and Button.Neutral for previous and next) broke. The owner chose A on Q-2796-1: previous and
next are Pagination.Item cells. `type` gains `previous` and `next`: the same square cell with `chevron-left` or
`chevron-right`, in the neutral icon ink and the neutral wash, with the page cells' states plus `disabled`, which is how
Figma draws the inactive end (calls 9 A and 12 A: `aria-disabled`, still focusable, never native disabled; named
"Previous page" and "Next page"). simple's two text controls are the same cells with the word beside the chevron,
through a new variant axis, `labeled: false | true` (a nest sets only variant values, so a Figma boolean could not turn
the word on from the row). Each word has its own TEXT property ("previous label", "next label"), one caption each
(#1567). The item grows from 27 to 87 members; Pagination keeps 12, and the #2808 arms now pass for both defs.
`labeled` is the 28th axis name in `VARIANT_AXES`, registered as a `sole` set in `lint-axis-values.ts`.

### Owner QA on the copy file and decisions Q426 A, Q427 A and Q428 A (2026-10-19)

- **The underline was as wide as the cell.** The balance frame above the number has no children, so a hug width had
  nothing to hug and the host kept a new frame's default width. The label box took that width, and the underline
  stretched to it. The balance now stretches to the number, like the underline, so only the number sets the width. A
  `test.ts` arm holds it over every underline member: the label box hugs, its childless frames stretch, and only the
  number's reserve and text size it.
- **The gap icon is in the page numbers' ink.** It is `color.icon.primary`, the plain icon role, which resolves to the
  same color as the numbers' `interactive.neutral.text.rest` in all 20 brand × mode cells. `test.ts` compares the two
  resolved colors cell by cell.
- **Q426 A:** the labeled previous and next (simple's) draw no fill. Their word and chevron change ink at hover and
  pressed, so they read as text links. The wash is now keyed on `labeled: false` through a six-segment paint template.
  The cells and their 44px targets are unchanged.
- **Q427 A:** in the border style, the current page's border is `color.border.secondary`, the neutral border rung one
  lighter than `border.tertiary`. Against `background.primary` it is 2.00 to 2.40 in light and dark, and 9.84 and up in
  high contrast. It need not clear 3:1, because the number's emphasis weight is a second cue (WCAG 1.4.11; the
  reasoning is in the def's notes). The underline is that style's only cue, so it keeps `border.tertiary` and its
  3:1 arm. The old "lightest role that clears 3:1" arm is replaced by a Q427 arm: the border is the rung directly
  lighter than the underline, the current number is in the emphasis weight and every other in the regular one, and the
  notes record the reasoning. The exception is scoped to this part.
- **Q428 A:** the chevrons and the gap icon step down one icon-size rung at every size: `icon.size.xs`, `sm` and `md`
  at small, medium and large. Cell sizes and targets are unchanged.
- **Q537 (owner QA, 2026-10-22):** in a real file the underline ran under the 4, 5 and 6 cells. Cause: the balance
  frame and the underline stretched across a label box that hugs, and the host fixes a hugging frame at its width when
  a child stretches across it, here a childless frame's 100px. Now nothing in the label box stretches: the balance is
  fixed at zero width, and the underline hugs a zero-height, clipped copy of the number. A new plugin suite,
  `test-pagination-underline.ts`, builds the set on a shim that models that host rule (`fillFreezesHug`) and measures
  the underline's edges against the number's at every size and state. The glyph parts are renamed `previousGlyph`,
  `gapGlyph` and `nextGlyph` (Q350).

### Held for the owner (also in the PR)

The `labeled` axis name and its false/true values; the two words' TEXT properties and their props `previousLabel`
and `nextLabel`; the 4px gap between chevron and word; the chevrons at the gap icon's glyph rung in the neutral icon
ink; and the disabled inks at an end (all Q414 A follow-through).

The name Pagination.Item (the proposal said PaginationItem; the skill's Family.Part canon decides); the `getStatusText` prop and its Figma name "status text"; the
simple member's 428px build width; the item's label inset past two digits (`space.100`); the item aliases `page-item`
and `pagination-page`; the forced-colors system color on the current page; and the gap icon's ink role (`color.icon.primary`, the
numbers' color in every brand and mode, rather than their interactive role).
