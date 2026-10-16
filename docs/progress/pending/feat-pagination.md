## (2026-10-16) — Pagination: numbered, compact and simple, on a new page cell in a native items slot (#2665)

Built to the proposal and wireframe on #2665, which the owner approved with every numbered call at its recommendation
(A). Cites the knowledge base's `components/pagination.md` (category Navigation), read for this build. Two defs, both on
a new `↳ Pagination` page under Components:

- **Pagination** (`pagination`), 12 members: `type` [numbered, compact, simple] × `style` [border, underline] × `size`
  [medium, small, large], the style on numbered only. numbered
  is a nested IconButton.Neutral (ghost, square, a left chevron through #2645's swap override), a native `items` slot of
  seven Pagination.Item instances showing page 5 of 10 (1 … 4 [5] 6 … 10), and a second IconButton.Neutral with a right
  chevron, 4px apart. compact puts "Page 5 of 10" between the two buttons. simple is two nested Button.Neutral, text,
  "Previous" and "Next" with their chevrons, at opposite ends of a row built at 428px. Previous and next are
  `nest-exposed` on `state`, so a designer sets them to disabled at an end.
- **Pagination.Item** (`_pagination-item`, a `_` building block per Q349), 27 members: `type` [page, ellipsis] ×
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

Sizes lead with medium in both (Q347, Q359), so both join the medium-first exceptions in `#2501`, `lint-rung-names`
DEFAULT_FIRST and the register's `reordered` size set.

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
  published library, and the projection refuses it by name. So the items slot carries `minChildren: 1` only, and the
  conflict between Q349 (prefix) and call 4 (a slot that offers the item) is held for the owner. Worth checking when
  #2660 (slots preferring `tab` and the segment) and #2769 (the prefix sweep on those two) meet.
- **Overrides inside a native slot were written twice.** The executor's slot pass (`toSlots`) runs `build` over the new
  SLOT and visits its items a second time, so a per-instance override inside a slot was applied, and its miss reported,
  twice. The corpus re-apply in `test-update-apply.ts` caught it (the update's misses outnumbered the build's).
  Pagination is the first def on main with overrides inside a slot; the fix is #2660's own (`instanceValuesWritten`),
  ported as is. Main has since taken 28 for another executor change, so this branch raises it to 29. #2660 will find
  the fix already there.
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

### Held for the owner (also in the PR)

The name Pagination.Item and id `_pagination-item` (the proposal said PaginationItem; Q349 and the skill's Family.Part
canon decide); the slot with no preferred component; the `getStatusText` prop and its Figma name "status text"; the
simple member's 428px build width; the item's label inset past two digits (`space.100`); the item aliases `page-item`
and `pagination-page`; the forced-colors system color on the current page; the border's 1px width; and the `mark` prop
the ellipsis's TEXT property needs.
