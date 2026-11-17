## (2026-11-16) — The component emission carries corners, strokes, focus rings and motion bindings (#3506, Q142 A)

**What.** Owner decision Q142 A on #3408: the emission carries each component's radius, stroke width, focus-ring
geometry and motion token bindings, so `@prism3/css`'s generator on `poc/arm-1` can read emitted files only and stop
importing the engine's TypeScript defs. Generalized to every component:
- **Corner and stroke are redlines**, read from the same plan that builds the set, like padding and height:
  `radius` and `strokeWidth` when the four corners (sides) bind one token, else one property per corner (side). A row's
  key grows where they move, by the existing rule (a stroke on `state`, a corner on `shape`).
- **`focusRing`** lists each part that nests the shared ring: the host's offset token (its `inset`) and the ring's
  own width and style. It is read from the materialized def, because Figma freezes the offset to a number at paste and
  the plan holds no token for it.
- **`motion`** lists each `tokens` binding to a `motion.*` token. Figma draws no motion, so this is def-derived too.
  Spinner named its five motion tokens only in prose. They are now bindings (`motion.turn`, `-reduced`, `motion.enter`,
  `-reduced`, `-easing`), the list #3506 gave. Button's are #3408 Q146 A, a separate PR.

`specs.json` is format 1.1 and `component-defs.json` is 1.4, with the authored schema extended. The Specs projection maps
the corner to `cornerRadius` and the stroke to `strokeWeight` (scalar, or a Corners or Sides object), and
`packages/tokens/check-specs.mjs`'s [PLACED] register types the same mapping out. `focusRing` and `motion` have no Specs
key and are omitted there, as the def's prose motion already was. The component pages' Specs tables show the corner
and stroke under Other. The pending replacement rule (#3506's fourth item) is not carried, because Q142 A did not
name it.

**Two checks, independent of the projector.**
- `test.ts` (#3506) reads the two FILES, freshly emitted by the emitter's own process, and holds them to the def. Every
  drawn part with a corner or stroke must have it in some redline row, every focus-ring nest must have a `focusRing` row
  with the def's offset, and every motion binding must appear. Floors on the counts (41 / 31 / 22 / 5 measured), plus
  literal pins for Button's `radius.md`, `border-width.hairline` and ring, and Spinner's five tokens.
- The plugin round-trip's SPEC READ-BACK reads the corner and stroke off the BUILT set, both ways, through its own
  restated key map. A bound scalar `strokeWeight` reads back on the four side keys (#1332), so a uniform stroke is met by
  either.

**Measured.** On main's spec model, the `test.ts` arm fails with 99 missing bindings and three failed pins. Against
main's model, the round-trip fails with thousands of disagreements, for example Button's 4,608. Both pass with the fix.
Mutations, each failing by name: the corner and stroke line dropped from `geometryOf` (72 missing, by def and part);
`focusRing` dropped (22 missing); `motion` dropped (5 missing).
