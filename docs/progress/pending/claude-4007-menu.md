## (2026-11-19) — Menu, Menu.Item and Menu.Group: a list of actions on the raised panel (#4007)

**What.** Three new components, built from the proposal on #4007 with every OD at its recommendation and the KB
conflicts as the owner resolved them in Q-FL2 (2026-11-19): K1 B (`menubar` kept as an alias), K3 B (a checkbox or
radio item never closes the menu, whatever the key) and K8 A (Popover's owned floating layer). Menu's panel binds
Popover's five raised-surface roles (OD-X1 A), and `test.ts` holds the two sets equal, comparing two defs that are each
authored on their own. Menu.Item is 15 members: `type` [action, submenu] × `intent` [default, destructive], action only,
× five states. Checkbox and radio items are toggles on an action member, not members of their own (OD-M3 A).

**K2, measured.** Q-FL2 made K2 B conditional: one highlight and no item focus ring, only if the highlight clears 3:1
against the panel. Composited over `foreground.raised`, `interactive.neutral.overlay.hover` reaches 1.20:1 to 1.33:1
against the panel across aurora, harbor, nb, prism3 and wendys in all four modes (`.pressed` 1.58:1 to 1.88:1). So K2 is
A: a focus-visible item shows the highlight and the shared FocusRing. `test.ts` recomputes the ratio from the emitted
trees, so a brand that ever clears 3:1 is named.

**Two-line items (owner direction, 2026-11-18).** The row is top-aligned and its leading cell is `firstLine`'s glyph
cell, so the check and icon center on the label's first line (20px glyphs beside a 16.1px line in every corpus brand).
`firstLine` requires every child of that cell to be a glyph of the bound size, so the check column is a 20px box.
**Trap:** an empty leading cell still takes the row's gap, so it has its own `leading` toggle, held for the owner.

**Held for the owner (on the PR).**
- Menu and Menu.Group carry a one-value axis (`placement: bottom`, `type: section`), as Popover does, because the
  engine projects no set without an axis.
- The `leading` toggle above.
- The chevron takes the item's icon ink, not `icon.secondary`: the paint grammar gives an item one icon ink.
- The focus ring sits at the corpus offset, outside the row; it fits in the panel's 4px padding.
- Menu.Group is tier 3, not 9: a 9 must be nested by a host's default content, and Menu's default content is three items.
- `motion.duration.fast` is 100ms, under the briefs' 120–180ms range.
- The page: Menu has its own page under Components, its item and group beside it.
- Built widths (240px), the placeholder copy and the panel names (DRAFT).

**Depends on #4008.** This branch merges Popover's head with a normal merge, because the OD-X1 test reads both defs.

**Right-to-left (#3986).** Menu.Item's row, lead and trail cells declare `mirror: 'reverses'` and its chevron `'mirrors'`, and Menu.Group's heading cell `'reverses'`, so each def's parts state what its right-to-left prose says. Menu reaches its claim through the items it nests. The split button the owner asked to hold separately is filed as #4296.
