## (2026-10-22) — Button label & icon: clearer words and the brand's label sizes beside it (#2918, Q527 A)

The owner found `buttonContentSize` confusing: "Button label & icon" with "Match button size" | "One step smaller"
did not say what was being set. Q527 A ruled out an engine change. This PR changes the words and shows the sizes.

**Words (DRAFT, option A on #2918).** The label is "Medium button label & icon", the options are "Medium" and
"Small", and the description is reworded to match. The keys `match` / `smaller` are unchanged because brand inputs
persist them. The Button definition's note and the prism3-theme skill row named the old option label, so they move too.
That moves the lever manifest and the button docs emission, which is why there is a `minor` change note with no
behavior change.

**Readout.** Under the chips, a state line says what the brand's medium button gets: "Medium button label: 14px
(label/md). Icon: 20px." or "Medium button label: 12px, the small button's (label/sm). Icon: 16px." It uses lever-kit's
existing `setState(stateLine(…))`, so there is no new primitive. `contentSizeOf` (`state/button-input.ts`, no DOM) reads
the px from `theme.typography.composites`, the source the button specimen already uses, and the icon px from `ICON_SIZES`.
A brand that does not emit the rung reads `null`, and then no line is drawn.

**Trap for whoever re-verifies.** The label ladder is brand-invariant today (12 / 14 / 18). No brand input moves it,
so every corpus brand reads 14 / 12, and a corpus-only test cannot tell "computed" from "hard-coded".
`test-button-input.ts` §6 plants a theme whose label rungs are 16 / 14 and emits it. The oracle is that emission's
`type.label.<rung>.emphasis` → `core.font.size.*` alias chain. A planted 13 fails because 13 is not a font-size
primitive, and the alias dangles. Mutation: hard-coding 14 / 12 in `contentSizeOf` fails `planted 16/14 / match: the
readout says 14px; the emission's type.label.md.emphasis is 16px` and three more rows.
