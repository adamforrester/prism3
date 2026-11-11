## (2026-11-11) — Studio: a brand color can't be renamed to a palette the engine always mints (#3562)

Found in the post-merge review (#3569). The guard gap predates #3455, which made it corrupt data. `renameBrandColor`
(`apps/studio/src/state/palette-input.ts`) refused only `primary`, `neutral` and the other brand colors' names. A rename
to `success`, `white`, `black-alpha` or any other palette the engine always mints was taken: the engine then refused the
brand, and `cascadeRename` rewrote every reference to that palette. Renaming back moved references that were always to
the status palette (an override, `actionPalette`, `linkPalette`, `roleColors`, gradient stops) onto the brand color.

The engine now exports `isReservedPalette(name)` from `theme.ts`, a read of the `RESERVED_PALETTES` set it already
validates brand colors against, and the rename refuses any name it holds. The studio's own `primary`/`neutral` pair
is gone, since the engine's set holds both. The engine's behavior and emission are unchanged, so no change note.

### Test

`test-interactive-input.ts` §12 is the issue's repro. The reserved names are literals typed in the test, and for each
one the engine's own `brandTheme` is first shown to refuse a brand color with that name. Each rename is refused, and
the brand state is byte-identical after it. Then the rename-to-`success` and rename-back sequence leaves the Dark
override on `success`, and the brand builds. A name that only starts with a reserved one (`success-2`) is still taken.

Mutation: the `isReservedPalette(next)` check dropped from `renameBrandColor` → `#3562 reserved: renaming accent-x to
success is refused, and nothing moves` fails by name (and the same for every other name but `primary` and `neutral`),
along with `#3562 rename back`.
