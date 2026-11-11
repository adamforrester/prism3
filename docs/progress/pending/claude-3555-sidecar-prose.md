## (2026-11-11) — Sidecar prose: duration steps, disabled-ink surfaces, plain words (#3555 Q-MD3, Q-MD14, Q-MD15, Q-MD17)

Part of #3555 (the 2026-11-11 metadata audit). The owner took option A on every Q-MD. This PR builds the four that live in
the token sidecar generator, `ai-metadata.ts`, plus the one skill sentence Q-MD3 names.

- **Q-MD3 A, duration steps.** `motion.duration-ms.*` said "Consumable — motion durations/easings/springs are used
  directly", while `prism3-motion` R1 and `lint-motion-literals` treat a step as a forbidden literal. A step's `consume`
  now points at the `motion.duration.*` roles and their `motion.duration-reduced.*` twins. Easing shapes and springs
  stay consumable where no role fits, which is what the motion skill's table says. `prism3-build-ui`'s exception now names
  what the sidecar marks consumable (`opacity.*`, `shadow.*`, the easing shapes and the springs), says the motion roles
  are the semantic layer, and names the step as not consumable.
- **Q-MD17 A, disabled inks.** `disabled.text` and `disabled.icon` carry a 3:1 contract but stated no surface. They now
  state the surface clause and `sits_on`, as every other ink does, from the same `surfaceClause` measurement.
- **Q-MD15 A, two claims in the sidecar.** The veil's "The ink must stay light in every mode" becomes "Keep the ink light
  in every mode", and keeps its tail "as the veil does": the veil holds its polarity too. `border.tertiary`'s "the ring has its own hue for a reason" now gives the reason: so focus reads apart
  from every resting border.
- **Q-MD14 A, plain words.** "(a11y anti-pattern)" on `field.placeholder` now says what goes wrong: placeholder text
  disappears on input, so the field loses its name. "white-label-stable" on the weight roles becomes "the name holds
  across brands".

### Gate arms

Three arms join the sidecar truth block in `test.ts`, and all read the committed sidecar, not the generator:
- Every `motion.duration-ms.*` leaf in the tree has a `consume` that is not "Consumable" and that names
  `motion.duration.*`.
- Every text or icon ink, page or inverse, with a `contrast_with` entry carries a non-empty `sits_on`. Whether each listed
  surface clears is still the existing relation arm's job.
- Every non-clear `veil.*` entry says "Keep the ink <opposite polarity> in every mode, as the veil does —".

Each was mutated and failed by name: the duration-ms branch was removed, `disabled.text`'s `sits_on` was dropped, and
the veil tail went back to "as the veil is".

### Not here

- The Figma-side halves of Q-MD15 (the `border/tertiary` floor) and Q-MD16 (the veil's "Check contrast on your photo")
  live in `figma-description.ts`, in their own PR.
- Q-MD1 is on hold on #3555. As decided, it needs a `CONTRACT_VERSION` bump, and both version gates refuse a bump that
  moves no token name.
