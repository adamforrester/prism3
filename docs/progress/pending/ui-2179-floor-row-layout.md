## (2026-10-05) — Surfaces & fills: the Contrast floor row puts its picker on the right, like the rows above it (#2179)

**Status:** branch `ui/2179-floor-row-layout`. `apps/studio/src/domains/color-fills.ts`, `apps/studio/src/chrome.css` and `test:chrome`. No ENGINE bump (no emitted artifact moves). CONTRACT unchanged. No new copy. **Fixes #2179.**

### What changed

On Color › Surfaces & fills, Default background fills, the Primary, Secondary and Tertiary rows put their step picker on the right of the row. The Contrast floor row put it on its own line under the name. That was deliberate in S4f (#2040): the floor row took a `p3-fillrow-wide` class, a two-column grid with the picker in column 2 of a second line, because its Auto label ("Auto · follows background.secondary (neutral 050)") is much longer than the other rows' labels.

Now the floor row is the rows' own three-column grid (`p3-fillrow`), and `p3-fillrow-wide` is gone. The long label still needs room, so the floor row keeps one modifier, `p3-fillrow-long`. It caps the picker's column at `fit-content(50%)` and lets the label wrap inside the button, so the name keeps its room. The picker's right edge lands on the other pickers' edge.

At 380 the other rows stay side by side (no rule stacks them), so the floor row does too. There, "Contrast floor" wraps to two lines beside a three-line picker. The issue asked for the same layout at 380 as the other rows, and this is that layout, but a shorter Auto label would read better. That is a copy decision for the owner, not part of this fix.

### Test, in `test:chrome`

A new block, run for every brand on the start screen × every mode it previews, at 1280 and at 380, on the web host. The oracle is the other three rows, measured in the same render. The floor's picker:
- ends at their picker edge (within `ALIGN_TOLERANCE`);
- starts above its label's bottom edge;
- sits beside its name exactly when theirs do.

At 380 the mode control is on the Preview pane, so the block switches panes around each mode change.

### Mutations, each failing by name (`wip:` commit first)

- **The floor row's `p3-fillrow` class dropped:** 72 failures, starting with `#2179 web 1280 prism3 / light: the Contrast floor's picker ends at the other rows' picker edge (right 393.0; background.primary 487.6, …)`.
- **`color-fills.ts` and `chrome.css` back to main (the wide row):** 60 failures, including `#2179 web 380 prism3 / light: the Contrast floor's picker sits beside its name exactly as the other rows' do (floor under; others beside)`.
