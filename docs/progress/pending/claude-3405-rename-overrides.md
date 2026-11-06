## (2026-11-06) — Renaming a brand color carries the overrides that name it (#3405)

When a designer renamed a brand color, an override written on that color kept the old name, and the brand stopped building: `overrides[light]: unknown palette 'accent-x' (role 'interactive.primary.border.rest')`. Nothing warned about it. #3403 added a warning to the *remove* confirm, but the rename path had the same gap.

### Diagnosis

`cascadeRename` (`apps/studio/src/state/palette-input.ts`) is docs/24 #53's reference-integrity rule: every field that names the palette follows the rename. It moved the action palette, the link palette, `roleColors`, `interactivePalettes` and gradient stops. It didn't move `overrides[mode][role].palette`, the one per-mode field that stores a palette name as a value.

### Fix

- `cascadeRename` carries every override whose `palette` is the old name over to the new name, in every mode (custom modes included), and keeps its step: the ramp is the same one. It runs inside `renameBrandColor`, so the carry is part of the same state write as the rename. A refused rename (empty, unchanged, or taken) moves nothing.
- Section 10 of `test-interactive-input.ts` is the issue's repro. It uses the prism3 brand, brand color `accent-x`, the primary border overridden to `accent-x 350` in Light and `accent-x 700` in Dark, and a third override on `primary` that must not move. It then renames to `accent-y`. The expected overrides are literals. "Still builds" and "resolves to accent-y" come from the engine's own `resolveAllModes`. Mutation: drop the carry, and `#3405 carry` fails by name, all three checks.
- Removal still doesn't cascade overrides. That stays the owner's call (#3403's Q-block). A rename has an answer the removal lacks: the new name is the same ramp.

### Trap

The column's other key is not covered. `interactivePalettes` follows the rename, but `modeAnchors[mode][<old name>]` doesn't, and the engine doesn't refuse it. It ignores the key, so the column's per-mode anchor goes back to its default without any warning (measured: Dark 400 → 500). An override keyed by the column's role path (`interactive.<old>.…`) is probably lost the same way. Filed as #3448, not fixed here.
