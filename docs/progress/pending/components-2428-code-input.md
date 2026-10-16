## (2026-10-16) — Code input: one input drawn as a row of cells, the cells in a native slot (#2428)

Built from the owner's decisions on #2428: Q321 A (all but cell count), Q329 A (cell count is a native `items` slot of
a Code cell part, 6 by default, 4 to 8), Q330 A (four sizes plus fill width), and the as-built wireframe approved
2026-10-16. Two defs in `packages/engine/components/code-input.ts`: `code-input` (48 members) and `code-input-cell` (28).
Stacked on #2660 (the items-slot pattern, not yet merged), with current `main` merged in.

### What the build had to decide

- **The cell has no `_` yet.** Q349 gives a parent-only part the `_` prefix, and Q329 makes the cell the slot's
  preferred value. #2657's slot projection refuses a `_` id as a preferred value, because Figma leaves a `_` component
  out of a published library and a consuming file's slot could not offer it. Built as `code-input-cell` (recommendation
  A), with an Owner question on #2428. The rename sweep meets the same collision for the segmented-control segment,
  `_tab-item` and `_list-item`, each a preferred slot value in #2660.
- **The characters' type.** No guaranteed type role is above 18px (the contract guarantees body, label and caption),
  and the title roles' weights differ by brand (the default `strong`, prism3 `emphasis` and `strong`, nb-redesign
  `subtle` only). Q330's 20, 24 and 40px therefore bind `type.title.sm/md/2xl` with a new `typeWeight` (a fixed bold
  intent, resolved by `resolveWeightIntent` before projection, the rule `weightIntent` uses), so #1601 holds on every
  corpus brand. Small keeps Text field's `body.md.default`.
- **The cell sizes are literals** (`builtSize`, Dialog's construction, Q303.5 A): 48, 64 and 72 sit on no size rung.
  `lint-rung-names` gained `PINNED_LADDER_DEFS` for the families Q330 pins one rung below `md` (`title`, `icon.size` for
  the caret, `radius`) and `2xl` on its rung order.
- **Reactions on a set with no pressed look.** `reactions.ts` planned While pressing only to `pressed`. The cell's def
  names `pressState: 'focus-visible'` (pressing a cell focuses the code input), carried on the plan only where declared,
  so every other plan's `planStamp` is unchanged. `EXECUTOR_REVISION` 28 → 29 (`write-components.ts` passes it).
- **Default cells per member.** Each member's six cells show its state (`atState`): a fresh insert's picture of that
  state. A placed field's cells stay the designer's (Q329's accepted trade-off). Status has no nested mechanism, so an
  error member's default cells are not in error.
- **Active is spelled `focus-visible`.** The closed state vocabulary has no `active`; Text field's names for the same
  ring and caret are used, and the rename is held for the owner.

### Traps

- The #1392 paste check builds nest-exposed defs with a stub that keys no component, so a slot's preferred value read
  as a miss. Code input is the first nest-exposed def with a slot; the check now provides each preferred id as a built,
  keyed set, as the real build does.
- Field style (#2695): the lever is still open in #2721; Code input joins it in #2719, already filed.
