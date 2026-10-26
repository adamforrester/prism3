## (2026-10-26) — Fields hover by border only, and the hover border steps four rungs (#2926)

The owner decided #2926 Part 2 on 2026-10-26 from the 2026-10-25 research. Q1′ D: no lever, and every field drops its
hover wash. Q2′ A: the hover border moves four ramp steps above rest instead of two. Q4′ A and Q5′ A: focus and the
status borders at hover stay as they are.

- **The wash.** Text field, Select, Textarea and the Code input cell no longer bind `overlay.hover`, and their frame
  parts paint `['fill', 'border']`. Password field and Search field inherit Text field's tokens, so they follow.
  `applyFieldStyle` no longer drops wash keys under Underline, because there are none left. `applyOutlineInteraction`
  needed no change: it rewrites the wash refs a def binds, and a field binds none, so no method can bring one back.
  `#1608`'s binder list loses the six fields.
- **The step.** `modes.ts` names the offset `FIELD_HOVER_STEPS = 4` for the page and inverse hover borders. Measured
  from the emitted hexes, rest→hover is now 1.89–2.17:1 (was 1.39–1.47) across the five corpus brands, four modes and
  both surfaces, and hover is 6.36–9.90:1 on `background.secondary`. On the reference brand in light, hover moved from
  neutral 550 to 650: its step is 2.12:1 against the hand-built ladder's 500 → 700 at 2.19:1, and the new hover sits
  1.15:1 from the hand-built 700 (the old one sat 1.71:1 away).
- **The gates (test.ts, the `#2926` block).**
  - (A) No field binds or paints an interactive overlay or subtle-fill, for six typed defs × Outline/Underline ×
    three typed outlineInteraction methods, walking every node of every projected member.
  - (B) Rest→hover Δ ≥ 1.89 and hover ≥ 3:1 on `background.secondary`, read from `out/<brand>.tokens.json` with
    the test's own resolver and parser.
  - (C) Every Button.Neutral outline hover member still paints the neutral wash.
  - The `#1782` status-hover sweep's representation arms now assert that no member composites a wash (they asserted
    at least one did).
- **Mutations, each after a wip commit.** The wash back on Text field fails (A) by name. So do `#2695 Q4`, the
  `#1782` arms and `#1608`. Two steps fails (B) by name, plus the uniform-offset pin. Dropping Button's outline
  wash fails (C) by name, plus the `#1223` and `#1608` button arms.
- **A threshold to confirm.** The build brief asked for Δ ≥ 1.9. Four steps measures 1.8906 in HC dark on the page
  (and HC light on the inverse band) in the lowest brand, so (B) is typed at 1.89, the research's own low end. Two
  steps (1.39–1.47) and three (about 1.7–1.8) both fail it.
- **Baselines accepted under the change note.** `schema/component-surface.json`: the six fields' plans moved, and their
  `@outline-solid-tint` and `@outline-none` rows are gone, because that lever no longer changes a field.
  `schema/paint-census.json`: the same six fields' hover paint points at `field.fill` instead of the wash. The plugin's
  `test-update-apply.ts` field-style arm asserted that an outline hover draws its wash translucent (#2774). It now
  asserts that no member asks for a wash under either style.
- **Not here.** No new token, so CONTRACT holds (`token-contract.ts --check` unchanged at 593 guaranteed names). The
  plugin executor did not change.
