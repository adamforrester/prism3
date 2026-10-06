## (2026-10-05) — Surfaces & fills: the Contrast floor row puts its picker on the right, like the rows above it (#2179)

**Status:** branch `ui/2179-floor-row-layout`. `apps/studio/src/domains/color-fills.ts`, `apps/studio/src/chrome.css` and `test:chrome`. No ENGINE bump (no emitted artifact moves). CONTRACT unchanged. No new copy beyond the owner's FL1 A label (below). **Fixes #2179, #2197.**

### What changed

On Color › Surfaces & fills, Default background fills, the Primary, Secondary and Tertiary rows put their step picker on the right of the row. The Contrast floor row put it on its own line under the name. That was deliberate in S4f (#2040): the floor row took a `p3-fillrow-wide` class, a two-column grid with the picker in column 2 of a second line, because its Auto label ("Auto · follows background.secondary (neutral 050)") is much longer than the other rows' labels.

Now the floor row uses the same three-column grid as the other rows (`p3-fillrow`), and `p3-fillrow-wide` is gone.

**The label, FL1 A (owner, #2197, added in review).** The PR's first version capped the picker's column at 50% and let the long label end in an ellipsis. QA-B5 holds every picker at 40px, so the label couldn't wrap. The owner then chose FL1 A: on Auto, the button shows "Auto · ‹step›" (for example "Auto · neutral 050"), naming the step as the picker names steps (`floorAutoShortLabel`). The full sentence, "Auto · follows background.secondary (neutral 050)" (`floorAutoLabel`, unchanged), is now the button's tooltip. The accessible name carries the visible label verbatim, then the sentence (WCAG 2.5.3, label in name; from the review): "Contrast floor, Light: Auto · neutral 050. Auto · follows background.secondary (neutral 050). Pick a step". Where the floor doesn't follow the tier, the label is already the whole wording, so there is no tooltip and nothing is repeated. With the short label the floor row needs no modifier, so the cap went too. The label fits on one line at 1280 and at 380.

At 380 the other rows stay side by side, because no rule stacks them, so the floor row does too.

`test:smoke`'s S4e checks, which read the floor's "follows" wording, now read it off the button's tooltip.

### Test, in `test:chrome`

A new block, run for every brand on the start screen × every mode it previews, at 1280 and at 380, on the web host. The oracle is the other three rows, measured in the same render. The floor's picker:
- ends at their picker edge (within `ALIGN_TOLERANCE`);
- starts above its label's bottom edge;
- sits beside its name exactly when theirs do;
- on Auto, reads "Auto · ‹step›", for prism3 the committed emission's floor step (`EMITTED_FLOOR`);
- has the full sentence as its tooltip, for the same step, and in its accessible name;
- has its visible label verbatim in its accessible name, as each row's picker does (WCAG 2.5.3);
- shows its whole label, not cut off (`scrollWidth ≤ clientWidth`).

At 380 the mode control is on the Preview pane, so the block switches panes around each mode change.

### Mutations, each failing by name (`wip:` commit first)

- **The floor row's `p3-fillrow` class dropped:** 72 failures, starting with `#2179 web 1280 prism3 / light: the Contrast floor's picker ends at the other rows' picker edge (right 393.0; background.primary 487.6, …)`.
- **`color-fills.ts` and `chrome.css` back to main (the wide row):** 60 failures, including `#2179 web 380 prism3 / light: the Contrast floor's picker sits beside its name exactly as the other rows' do (floor under; others beside)`.
- **FL1 A: the long label back as the visible one:** 24 failures. The first is `#2179 web 1280 prism3 / light: FL1 A: the Contrast floor's Auto label reads "Auto · ‹step›" ("Auto · neutral 050", the emission's floor) — read "Auto · follows background.secondary (neutral 050)"`. The truncation check passes under this mutation: without the old cap, the picker's column grows to fit the long label. It guards against a cap coming back.
- **The visible label dropped from the accessible name:** 24 failures, for example `#2179 web 1280 prism3 / light: WCAG 2.5.3: each picker's accessible name contains its visible label — not: surfaces.floorStep shows "Auto · neutral 050", named "Contrast floor, Light: Auto · follows background.secondary (neutral 050). Pick a step"`.
- **The floor's name column collapsed (`width: 0`):** the review found that this crashed the block with a TypeError, because the `drawn` guard didn't check the floor's name. The guard now checks it. The collapse fails by name and the suite runs to its summary: `#2179 web 1280 prism3 / light: Default background fills draws Primary, Secondary, Tertiary and Contrast floor, each with its name and its picker — read […["surfaces.floorStep",{"name":false,"label":true,"pick":true}]]`.
