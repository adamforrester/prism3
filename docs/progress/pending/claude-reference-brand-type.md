## (2026-10-29) — The reference brand's seed matches its stored typography input: leading, label weights, 375 viewport (Q821 A)

#3084 carried the reference brand's type asks into the redesign seed (`examples/nb-redesign.design.md`): the stored sizes, title 2xs 20/18, caption md 10 and the +1% tracking pins, with the lever-sweep refusals that follow them. This PR is the rest of the seed-to-stored-input sync, which the owner took in full (Q821 A, 2026-10-27):

- **Leading:** `lineHeights: { compact: 1.25, snug: 1.2 }` and `leadingShift: { display: 1, title: 1, body: 1 }`. This replaces the 2026-09-09 "stay with prism line heights" decision, so the finishing checklist's leading item now says the leading is the stored one. Display moves from tight 1.05 to snug 1.20, titles one rung more open (2xs/xs 1.25 → 1.40, sm–xl 1.15 → 1.25, 2xl 1.05 → 1.20), body from 1.50 to 1.65. Label and eyebrow keep their rung (snug), which is now 1.20 instead of 1.15.
- **Label weights:** `label: [default, emphasis]` is written out. The engine already gave label that set, so no composite moves; the seed now states it like the stored input does.
- **Fluid floor:** `minViewport` 402 → 375. The end sizes don't move. Fluid headings now start growing from 375px instead of 402, so between the two viewports they sit slightly larger: display 2xl at 768px is 77.5px instead of 76.2, title 2xl 45.9 instead of 45.6.

Two things were tried and dropped. The earlier version of this branch also carried the stored `trackingShift` nudges, but #3084's `typography.tracking` pins replace those nudges for every type but eyebrow, so main's `trackingShift: { eyebrow: -1 }` stays. Its lever-sweep `REFUSALS` edits were a subset of #3084's, so main's register stays as is.

The seed emits no committed artifact: `regen.ts` leaves all 205 files under `packages/engine/out/` byte-identical (aggregate hash unchanged). `test.ts`'s every-example-compiles arm covers the brief.
