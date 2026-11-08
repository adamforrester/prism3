## (2026-11-07) — Contrast floor follow-ups: an emission oracle for "follows", the two unreached names, accurate comments (#2228)

### What changed

- **An independent oracle for the floor's "follows" clause (#2228.1).** The #2179 sweep took "does the Auto floor follow
  `background.secondary`?" from the button's own tooltip, so a change that dropped "follows" from both the tooltip and
  the accessible name passed. For prism3 it now reads the answer off the committed emission: `EMITTED_FLOOR` gains each
  mode's `secondary`, the palette step `background.secondary`'s alias chain ends on, and the floor follows exactly when
  `foreground.brand`'s `against` is that step. The tooltip and the name are each held to it. Other brands have no
  committed emission, and the tooltip still stands in for them. A floor check requires at least one prism3 state where
  the emission says "follows", so the mutation has something to fail.
- **The two names the sweep never reached (#2228.2)**, asserted as computed names (CDP) in the #2250 block, against
  literal oracles: at Primary Black the Auto floor follows no tier ("Contrast floor, Light: Auto · neutral 950. Pick a
  step"), and a picked step ("Contrast floor, Light: neutral 050. Pick a step").
- **Shipped comments (#2228.3).** In `fills-input.ts`, `floorAutoShortLabel`'s doc comment sat above `floorAutoFollows`
  and said the full sentence was still the button's accessible name. It now sits above its own function and says the
  sentence is the tooltip, with the name built in `color-fills.ts` as option 1.
- **The record (#2228.4).** The `test-chrome.mjs` header's "(web)" for the layout check now says both hosts. The #2193
  entry is folded into the log, which is prose and isn't edited outside a fold, so its corrections are here: under
  "(2026-10-06) — Surfaces & fills: the Contrast floor row puts its picker on the right…", the block runs on **both
  hosts** (not "on the web host"), and the bullet "shows its whole label, not cut off" belongs to the list above "The
  block runs on both hosts".

### What the oracle found first, and why it isn't a fix here

The first run read the emission's own mode in HC light and HC dark, and failed there. The studio says "follows
background.secondary" in both, while the emitted `background.secondary` is white and black. The studio is consistent:
Surfaces edits Light and Dark only (`SURFACE_MODES`), and a derived mode's row shows, read-only, the surfaces of the
mode it's drawn from, so the floor row in HC light describes Light's floor. The oracle now models that (HC light reads
Light, HC dark reads Dark, restated in the test, not read from the studio). Whether an HC mode's accessible name should
say "Contrast floor, HC light: … follows background.secondary", when the previewed mode's own secondary is a different
color, is a copy call. It's raised on the PR for the owner.

### Mutations, each failing by name (from `wip:` commits; a temporary local shard ran sections 18 and 18-s4f)

- `floorAutoFollows` returning null and `floorAutoLabel` always `Auto · ‹step›` (the clause dropped from both the name
  and the tooltip): 32 failures, the first `#2179 web 1280 prism3 / light: FL1 A: the Contrast floor's tooltip is the
  full sentence (the emission: the floor is background.secondary's step) — want "Auto · follows background.secondary
  (neutral 050)", read "Auto · neutral 050"`, and its name twin.
- `floorAutoFollows` always naming the tier: 1 failure, `#2228: Primary Black: the Auto floor follows no tier, and its
  computed accessible name is "Contrast floor, Light: Auto · neutral 950. Pick a step" …`.
- The picked step given `follows` too (`color-fills.ts`): 1 failure, `#2228: floor picked at neutral 050: its computed
  accessible name is "Contrast floor, Light: neutral 050. Pick a step" …`.
