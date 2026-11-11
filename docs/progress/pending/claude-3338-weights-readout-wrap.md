## (2026-11-10) — Button options' Weights readout wraps inside its card (#3338)

At 1280, Components › Button options drew the Weights readout ("subtle 300 · default 400 · emphasis 500 · strong 600 ·
max 900") on one line, 43px past the card's content edge. `.p3-readout` is `white-space: nowrap`, and the only rule that
lets it wrap (#1975) keys on the levers pane's `data-fit="snug"`. Button options is drawn in the preview's card
(`.p3-cp-optsec`), which that attribute never reaches. The fix gives a readout in that card the same wrap that snug
rule gives (`white-space: normal; text-align: right`). It adds no new look.

### Gate

`test-chrome.mjs` section `3338` (shard 2) measures the rendered card on both hosts, both themes, at 1280 and 380. Every
readout in the card has to end inside its content box. The Weights readout has to be present by name, because a check
over zero readouts would pass. Mutation: drop the new rule, and `3338 web light 1280: readout "components-weights" ends
43.4px past the card's content edge` fails, along with the other three 1280 cases.
