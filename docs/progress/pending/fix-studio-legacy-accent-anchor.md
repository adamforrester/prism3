## (2026-11-20) — Pinning the Light anchor of a legacy accent column writes it (#4294)

A brand still on the legacy single-column `accentPalette` field gets an `accent` column from the engine's back-compat, so Color › Interactive shows it. But `setAnchor('light', 'accent', v)` looked the column up only in `interactivePalettes`, found nothing, and returned without writing. The pick did nothing and nothing said so.

### What changed

- `setAnchor` (`state/interactive-input.ts`): when Light's anchor is pinned on the `accent` column of a brand with no `interactivePalettes` and an `accentPalette`, the field is first folded into `interactivePalettes: [{ name: 'accent', palette }]`, the shape the engine's back-compat is byte-identical to (`test.ts`). Then the anchor is written. Auto with nothing pinned folds nothing, so an untouched brand stays byte for byte as loaded. An anchor on another column leaves the legacy field alone.
- The other `accentIndex` caller, `anchorOf`, reads the folded entry once it exists. A Dark (or any non-Light) anchor never had the gap: it is written to `modeAnchors`, which the engine takes for the legacy column (checked).
- #4285 (open) folds the same field in `addAccent` (#4210). The two folds write the same shape, so whichever lands second still composes.

### Tests

`test-interactive-input.ts` §16: on `main`, 3 of 6 arms fail by name (`#4294 setAnchor(light, accent) on a legacy brand folds …`, `… resolves … to the anchor 550`, `anchorOf … reads the pinned anchor back`). On this branch, 176/176. Mutations: the fold without pointing the write at it fails the same three, and a fold on Auto fails `#4294 Auto on a legacy brand with no anchor changes nothing`.
