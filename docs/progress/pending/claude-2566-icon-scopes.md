## (2026-10-12) — Icon color roles are fills only in Figma: no stroke scope (#2566)

**Status:** engine scope maps, the read-back contract, docs/10 §3 and two tests. ENGINE minor (change note): the
committed `out/figma/**/color.*.json` move, scopes only. CONTRACT unchanged, since no token name moves
(`token-contract.ts --check` clean, `--accept` never run).

### What changed

The owner decided that every Prism3 icon is a fill, never a stroke. `emit-figma-color.ts` scopes icon roles in three
maps: `COLOR_SCOPES.icon`, `INTERACTIVE_SLOT_SCOPES.icon` and `DISABLED_SLOT_SCOPES.icon`. All three drop
`STROKE_COLOR` and now read `[FRAME_FILL, SHAPE_FILL]`. The inverse marker is already stripped before dispatch (#1140),
so the inverse twins follow without a separate edit. Regen moves 976 variables: 61 icon roles × 4 modes × 4 brands,
one scope each, nothing else. `read-back.ts`'s `EXPECTED_SLOT_SCOPES['color/disabled/icon']` and the docs/10 §3 table
move with it. The table also gains the `interactive.<c>.icon` row it was missing.

### The gates

- **Engine, `test.ts` (e5).** The role list comes from the DTCG tree (`buildTree`), and the Figma emission is built
  live (not read from `out/figma`), so a mutated scope map fails before regen. The sweep covers every brief in
  `examples/` plus the NB fixture, and expects the hand-written literal `[FRAME_FILL, SHAPE_FILL]` for every icon role
  in every mode. Each failure names the brand, mode, variable and scopes. Floors: at least 5 brands, at least 61 roles
  per brand, and all six kinds represented (page, interactive and disabled, each with its inverse twin).
- **Plugin, `test-write.ts`.** This checks the update path, not only create. It seeds an applied file's 61 icon
  variables back to the old `[FRAME_FILL, SHAPE_FILL, STROKE_COLOR]` and re-applies. Every one must come back
  `[FRAME_FILL, SHAPE_FILL]` on the same variable id, with 0 created. `applyWritePlan` already assigns `v.scopes` on
  update, so no executor change was needed. The test pins that behavior.

### For the owner

- **No icon role is used as text ink.** A walk of every projected component plan finds no TEXT node painted with an
  icon role, so nothing carried `TEXT_FILL` and nothing had to be held.
- **Two icon roles are bound as strokes.** `color.disabled.icon` and its inverse twin are the disabled border of the
  Button family and the Icon button family (#1697 rebound the border to the icon ink for its 3:1 contract). The
  binding still writes, because Figma scopes limit only the pickers, not `setBoundVariableForPaint` (probe-verified
  2026-07-04, see the `emit-figma-color.ts` header). But a designer re-picking that border by hand will not find the
  icon role in the stroke picker. This PR applies the decision as written and leaves the bindings alone.
