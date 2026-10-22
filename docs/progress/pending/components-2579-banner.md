## (2026-10-16) — Banner: a persistent in-flow message in four tones, contained or full width (#2579, Q327)

Built from the proposal on #2579, approved as recommended (Q327), and the KB brief `components/banner.md`. 8 members,
`tone` [info, success, warning, danger] × `width` [contained, full], no size or state axis. The container is the
tone's subtle surface with a 1px edge in the tone's **border** role (Q346: an edge never binds an icon or text role;
`color.border.{tone}` exists in every example brand, so no owner question was needed). Title and body in
`color.text.primary`; the glyph in `color.icon.{tone}`. The body is a native slot. One nested text Button action
(small; Button.Neutral instead when the file has it, never required: Q386, Q398 resolved by Q419 A; one action only
per owner QA Q533.1) and a flush FlushIconButton.Neutral dismiss (owner QA 2026-10-19: flush, not round) with the close
glyph fixed and no swap (Q386, #2808), both off by default.

### Decisions the diff does not show

- **Glyph per tone follows FieldMessage**, not the proposal's tone-ordered list: danger takes the exclamation in a
  triangle, warning the exclamation in a circle. A danger banner and an errored field should show one mark. Held for
  the owner on the PR.
- **`width`, not a new `placement` axis** (Q327.3 A). It shares `full` with Button's `auto | full`, so Button's set
  becomes `canonical` and Banner's is declared `overlapping` in `lint-axis-values`, argued there. `tone` is a `subset`
  of `icon`'s canonical set.
- **Full width is a page-top bar** (owner QA Q533.4: the two widths looked the same). Built on the recommended
  answer, held for the owner on the PR: full is built at 960 where contained is 480, square, and edged top and bottom
  only, through the per-side stroke binding (`strokeEdges`, #2695) with the sides on `border-width.none`. That is the
  proposal's own top-and-bottom edge, which #2788 was filed for. `builtSize` now admits a width-only map on a row root
  (heights still need a column), so Banner's row root takes it; refusal and admission are tested by name.
- **The title-to-body gap is fixed at 4px**, outside `densitySpacing`: one step down at compact is 2px, under the
  owner's 4px gap floor. The test's spacing table caught it before the def did.
- **The title is padded down 4px** (`space.050`) to center its first line on the 24px glyph, the accordion's
  construction. The pad sits on a `titleBox`, which the `title` toggle hides with it, so a body-only banner has no
  stray offset.
- **One text action, no Button group** (owner QA Q533.1: the owner's research found no banner with two actions). The
  `second action` toggle, the outline action and the `action-gap` token are gone, and #2787's move into the Button
  group no longer applies. The action is made from `button` with `prefersWhenBuilt: 'button-neutral'`, so no file has
  to build the Neutral family (#2808 passes); the primary ink on the tints clears 4.5:1 through #2820's surface contract.

### Gates

`lint-paint`'s provenance check reads `foreground.info-subtle` as not carrying `info` (it compares whole segments), so
the four fills are admitted by name in `PROVENANCE_EXCEPTIONS`, as Badge's subtle fills are. `test.ts`'s spacing
ordering scope learned the bare `pad` tail, so a def whose one padding is named `pad` is now required to state its
orderings. Banner's own block in `test.ts` holds the 8 member names, each member's fill, edge, corner, glyph and inks,
the nested actions and dismiss, the defaults, the lowercase Figma property names (Q345), the first member being the code
default (Q347), the built widths and per-side edges, and 32 contrast pairs as literals over 5 brands × 4 modes: text
4.5:1 (lowest 13.92), the edge against the page 3:1 (lowest 3.75), the glyph on the fill 3:1 (lowest 3.31), the neutral
and primary action labels, and the dismiss glyph at rest, hover and press and its focus ring on each fill (Q533.5).
The studio's set list shows Banner's `pad` beside `gap` (the owner's C2 A: padding and gap only) and hides
`actions-gap`, as it hides Accordion's `panel-pad-end`.

### Harness

`test-update-apply.ts`'s `corpus/in place` builds each def in a shim file holding only the components its plans nest or
swap. Banner is the first def whose nested instance takes an INSTANCE_SWAP **override** (the dismiss button's close
glyph), and the harness did not add that target, so the update stopped on "the component the plan swaps to is not in this
file" and no member read current. The harness now adds override swap targets; the executor was right.
`test-canvas-furniture.ts` builds its pages the same way and took the same fix, and its literal count of defs that
build a set moves from 39 to 40.

### Trap

`lint-component-surface`, `lint-paint` and `lint-component-renames` are accepted baselines, not regen output. A main
merge that takes main's side of a conflict in them drops Banner's rows (Dialog's merge hit this); re-accept after any
merge.
