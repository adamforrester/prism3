## (2026-11-03) — Color › Interactive: a settings card, a card per button set, Wash opacity and per-set Solid fill (#3335)

The owner chose Q3335.1–.7 A, plus an amendment: where a group has no Rest row, its Hover and Pressed sit side by side at
the group's level, not nested. The layout uses #3337's rhythm, and this PR is stacked on that one.

### The page

- **Interactive Settings** (DRAFT title and line, "Every button set, in every mode.") holds Outline hover, Wash opacity
  and Strict interactive contrast. Room is left in the card for #3346 option E, which is evaluated separately; nothing is
  built for it.
- **The mode line once** ("Editing Light, the mode the preview shows."), between the settings and the colors. Under
  Solid fill it used to draw twice: once in Outline hover fill and once in Interactive palettes. Links keep their own
  line.
- **One card per button set**, "‹Set› Interactive Colors", with its palette inside the title, as Components puts its
  counts (TY2 A: at 380 it wraps inside the heading, so the space after the title stays space-300). Primary's card opens
  on **Primary Action Palette** (the Studio's label; the manifest keeps "Action palette"), and Neutral's on its emphasis.
- **State groups** with small titles (Fill, Fill · inverse, Text, Text · inverse, Border, Border · inverse, the hover
  group, On-fill text, On-fill text · inverse), on the group rhythm (40px, hairline, 16px). A group with states shows
  **Rest**, then Hover and Pressed nested under it. A group with no rest row (Overlay wash, Tinted wash, Outline & text
  hover) shows Hover and Pressed at its own level.
- **Under Solid fill**, each card's hover group is **Outline & text hover**: that set's Hover and Pressed pickers and its
  own worst-label line. These replace the wash swatches, which still showed under Solid fill even though they no longer
  reach that set's buttons.
- **Add button set** follows the last card, with the approved tooltip now a visible line above it. The Interactive
  palettes heading and its ⓘ are gone.

### The engine: two inputs, every existing brand byte-identical

- `outlineWash: { hover, pressed }` (Q3335.3 A) replaces the neutral wash's fixed 10/20 and the tinted wash's fixed 20/30
  start. Steps are 5, 10, 20, 30 or 40, with pressed above hover; selected follows pressed. An unset step is the method's
  default, or the step above hover where the default would not be above it. A pick that still leaves pressed on or under
  hover is refused by name. The overlay brand's one tinted selected leaf keeps the tinted default, because it is not the
  wash the brand tunes. In the manifest the input is two enums, `outlineWash.hover` and `outlineWash.pressed`, so the lever
  sweep reaches every step. The nine settings that leave pressed on or under hover are listed in `REFUSALS` by message.
- `outlineHoverFill.<mode>.sets.<set>` (Q3335.5 A) is one set's own pick. The mode-wide pick stays every other set's
  default, a set the brand does not have is refused by name, and the inverse band keeps the default rule.
- `regen --check` was clean with both inputs in the engine and before the manifest rows, so 225 artifacts are
  byte-identical. Only `lever-manifest.json` and the hand-kept `theme-schema.json` move. ENGINE_VERSION minor (change
  note); CONTRACT_VERSION does not move.

### Gates, each with a mutation that fails by name

- `test.ts` #3335 (A): a per-set pick reaches only that set's `hover-fill`. Mutation: `pickFor` reads the mode-wide pick
  first → `#3335 (A) … destructive reads neutral.050 / neutral.100`.
- `test.ts` #3335 (B): 33 brand × method builds are unchanged with the default steps given (typed 10/20 and 20/30), a
  restated per-set pick changes nothing, and the unset neutral wash is 0.1 / 0.2 / 0.2. Mutation: the neutral default
  hover 10 → 5 → `#3335 (B) … 0.05 / 0.2 / 0.2 (want 0.1 / 0.2 / 0.2)`.
- The lever sweep. Mutation: the resolved pressed > hover refusal dropped → nine `STALE refusal: … outlineWash…` lines.
- `test:chrome` section `3335` (shard 3): in a no-Rest group, Hover and Pressed share one indent level. It covers every
  set, both hosts, both themes, 1280 and 380, under the neutral wash, the tinted wash and Solid fill, and checks Fill's
  nesting as a control. Mutation: a no-Rest group nests Pressed → `3335 … / Neutral overlay wash / primary: "Overlay wash"
  Pressed sits 25px right of Hover (want one level)`, in all eight runs, for both washes.
- Section 19 holds the two found defects (one mode line, no wash swatches under Solid fill) and the per-set write.
  `test-interactive-input.ts` §8 holds both new writes and their byte-identical round trips.

### Other gates that moved with the layout

- Section 19's layout arms now follow the decisions: the settings card holds Outline hover, Wash opacity and Strict
  contrast (QA-I5); the set cards stand 16px apart, which supersedes QA-I7's 40px between sets inside one card; and the
  Q53 button-set text is now the visible line above Add button set. Search (#3093) reaches `outlineWash.pressed` through
  the Wash opacity block, and the button sets lever through the Add row, which stands in for its removed block.
- `test-smoke.mjs` reads the wash steps from `OUTLINE_WASH_DEFAULTS` in `theme.ts`, which is still engine source and
  still throws rather than defaulting. It now expects the wash's Pressed at the Hover row's level.
- `lint-voice.ts` knows the new note producer, and holds the three refused `outlineWash` enum values by message.
- The two skills cover `outlineWash`, and the public guides' `pages.ts` citations follow the moved lines.
