## (2026-10-25) — Links clear 4.5:1 on the third page tier (#2991)

The derived resting link (`text.link.default`, `inverse.text.link.default`) was gated on one ground, the contrast
floor (`background.secondary` / `inverse.background.secondary`), plus the #2817 component surfaces on the page.
Measured from resolved hexes it landed at 4.05–4.32:1 on `background.tertiary` / `inverse.background.tertiary` in
light and dark, in every corpus brand (the issue counted four; the fifth misses only on the dark inverse band, at 4.12:1).
HC modes cleared on every tier. The owner's go (2026-10-25) settled that body links sit on the third tier, so the
link follows the #1352 / #1773 pattern rather than the tier moving or a description fencing links off it.

### What changed

- **The derivation.** `buildContent`'s `Ground` carries its context's third tier (`tier`), and both link bases take
  it as an `alsoClear` ground at the 4.5:1 body floor (HC's flat tiers already clear it). The nearest step on the
  link ramp that clears it wins, so the hue holds and only the depth moves: one step (50) everywhere it moved,
  ΔE2000 3.5–5.7.
- **The engaged states.** `walk`'s guard takes optional further grounds (`also`), and the link guard adds the tier,
  so hover, pressed and visited count only steps that clear it. No derived state needed it on the corpus; it was the
  seed brief whose link sits on the neutral ramp near black, where `visited` walks back toward the page and landed at
  4.02:1 on the tier.
- **The pin clamp (#1510).** A link override is walked on until it clears both its floor and the tier, so a pin
  cannot reach under 4.5:1 on the third tier either. L-07 (#2990) now sweeps all three tiers, page and inverse.
- **The counted contract.** The `resolveMode` tier check (#1773) now records every link role against its context's
  third tier in `tierChecks`, which `tree.ts` counts into `modeChecks` / `modePass`, so a miss fails the mode
  contract and warns with the tier in `against`.

### Gates

`#2991` (test.ts 10g-v) measures every page and inverse text link, every state, on all three of its tiers in every
mode of every corpus and example brand, from resolved hexes against literal tier names and a literal 4.5 (7 in HC);
asserts each mode's `tierChecks` holds the resting link on its third tier at the measured ratio; and counts the
contexts where the tier is what holds the link (non-vacuity). The #2817 overshoot arm counts the tier among the link's
grounds, so it still proves the move is one notch and no further.

### Trap

Q419 A (#2817) kept the primary and link inks off `background.secondary` / `.tertiary` on cost grounds. This narrows
that for the link alone; the primary ink is unchanged. The link's description still names only its floor.
