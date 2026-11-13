## (2026-11-12) — a tint's contrast is measured at the alpha that ships (#3698 finding 7a)

**STATUS: PR open, not merged.** ENGINE {{ENGINE_VERSION}} (minor, `packages/engine/changes/claude-3698-tint-alpha.md`), CONTRACT stands. Files: `packages/engine/modes.ts` (`settleSolidTint`'s two guards and published ratio, the media-veil step picker), `packages/engine/test.ts` (one arm), and the regenerated `out/{aurora,harbor,prism3,wendys}.tokens.json`.

**What was wrong.** The overlay washes (`modes.ts` `#1918`, `#1949`) and the field wash composite at `emittedAlpha`, the alpha a renderer actually applies: the hex dialect writes 30% as `4d` (77/255 = 0.302). The solid-tint pass and the veil picker composited at the nominal `step / 100`. So a tint's stored `contrast` described a slightly lighter wash than ships. Measured here: up to 0.05 too high (`out/prism3.tokens.json`, `interactive.primary.subtle-fill.selected` in hc-dark: 8.17 → 8.13). The rgb dialect writes two decimals, so NB's numbers do not move.

**What moved.** Only stored `contrast` numbers, 16 cells across the four hex-dialect committed trees, each the overlay brand's one `selected` tint. No step choice moved, in either the committed brands or the example brands built at `solid-tint`, and no media-veil rung moved. Every contrast contract still passes (`lint-ratio-truth`, `test.ts`'s contract sweep).

**Why no existing gate saw it.** `lint-ratio-truth` arm A already recomputes washes at the shipped alpha (#3555 F4), but it allows 0.02 and skips roles with `min: 0`, and pressed and selected tints are ungated (#1281). The largest drift sat exactly there.

**The arm.** `test.ts` `#3698 7a` recomputes every tint's ratio from the emission alone. The alpha is parsed from the leaf's own `$value` (8-digit hex or `rgba(…)`), the opaque fill from the same string, and the ground and the ink by following their aliases. Tolerance is the emitter's two-decimal rounding only. It reads the five committed trees (one `selected` tint each), and the three example brands built at `outlineInteraction: 'solid-tint'`, which carry the hover and pressed tints the guards pick: 236 cells. Mutation, from a `wip:` commit: the `modes.ts` change reverted → the arm fails by name on the solid-tint builds.

**Not changed.** The veil roles publish `ratio: 1` (a veil names no ink), so the picker's change shows up in no number; it is held by nothing new here. No corpus rung sits close enough to its floor for the two alphas to choose different steps.
