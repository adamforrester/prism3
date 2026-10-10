## (2026-10-09) — Flush text buttons: the skill states the spacing that keeps their hit areas apart, measured in a browser (#2437)

Found in the review of #2421 (#2408). A flush text button keeps a hit area of at least 44×44 at medium and large and
24×24 at small in code, drawn by a transparent `::before` past its label-width box (owner Q154 A, Q174 B). Nothing said
how far apart two of them, or one and a neighbor, must sit, so overlapping targets (WCAG 2.5.8, taps landing on the
wrong control) had no check. Stacked on #2421's branch, which carries the rule and the CSS sketch.

**The sentence (DRAFT for the owner), in `skills/prism3-consume` after the sketch:** the extension reaches past the label
by (44px − label width) / 2 on each side at medium and large, and (24px − label width) / 2 at small; leave that much
between the label and the next control, and the two reaches added between two flush buttons; 22px beside the label is
always enough at medium and large, and 12px at small. It's the sketch's own geometry: `inset: min(0px, (100% - 44px) / 2)`
centers a 44px area on any label under 44px.

**The check is a browser fixture in `test:chrome`, the one place the rule can be measured:** the engine emits no code
layout. It reads the CSS sketch and the stated bounds out of `SKILL.md`, the floors (44, 24) typed from the owner's
decision, and lays out two flush buttons and then a non-flush neighbor on a blank page, for labels from 1px to just under
the floor, at the "always enough" gap and at the exact gap the skill states. Every whole pixel of each flush button's
floor-wide hit area must hit that button, horizontally and vertically, and the neighbor's box must hit only the
neighbor. A control arm puts the pair two pixels closer than their reaches and must see the overlap.

**The sketch is size-aware, and hit-tested exactly as shipped (Lane D's review, option 1).** #2421's sketch drew one
`inset: min(0px, (100% - 44px) / 2)` with a comment saying "24px at small", and the first fixture made its small arms
pass by rewriting 44px to 24px in the text, so it tested a sketch no consumer was given. The sketch now sets the hit size
as a custom property, `--flush-hit: 44px` on `.flush-button` and `24px` on `.flush-button.small`, and the `::before`
insets by `(100% - var(--flush-hit)) / 2`. The fixture applies the classes of the sketch's own 24px rule to its small
buttons, with no rewrite, so a sketch without that rule leaves the small buttons on the medium extension and the small
arms fail. The owner's spacing sentence is unchanged.

**A trap the first run hit:** probing at half pixels read EXACTLY touching areas as overlapping. Chrome's hit test rounds a
fractional point, so 152.5 landed on the area that starts at 153. The fixture probes whole pixels fully inside each area,
so the half pixel two abutting areas share is no one's. The controls still see a real two-pixel overlap.

**Mutations,** through the #2272 harness against the section, each failing by name:
- the sketch back to a fixed 44px, with no small rule: `✗ #2437 flush hit area small: two 1px flush buttons at the
  skill's 12px bound (24px apart, a neighbor 12px on) keep their 24px hit areas apart — overlap …`, 9 small arms and no
  medium one;
- the skill's 22px bound lowered to 16px: `✗ #2437 flush hit area medium: two 1px flush buttons at the skill's 16px bound
  … — overlap …` (and the 6px pair; from a 12px label on, 16px is enough, which is what the formula says);
- the sketch's medium hit size raised to 48px (`--flush-hit: 48px`): the medium bound and exact-gap arms, the neighbor's
  own box included (6 failures).
