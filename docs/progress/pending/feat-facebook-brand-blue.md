## (2026-10-29) — Facebook moves to its current brand blue, #0866FF, so every SignInButton style clears 4.5:1 (#3136)

Owner decision Q837 A (2026-10-28): Facebook's color moves from `#1877F2` to `#0866FF`, the current brand blue in Meta's brand resources. White on `#1877f2` measured 4.23:1, which #3125 recorded as a known provider shortfall under the 4.5:1 text floor. White on `#0866ff` measures 4.82:1.

- **SignInButton** (`components/sign-in-button.ts`): the `blue` style's fill and the `white` style's label ink are `#0866ff`. The 4.23:1 contested note is gone, and the 1.4.3 line now says every style clears 4.5:1. Both typed rule tables move with it: `test.ts` `RULES` and `test-write-components.ts` `RULE`.
- **The CONTRAST arm** (`test.ts`, `#2343 PR 5 provider rules CONTRAST`) loses its `SHORTFALL` exemption. It now asserts ≥ 4.5:1 twice. The first check reads the typed rules. The second reads every member's plan (label ink on its own literal fill), so a def that drifts back to `#1877f2` fails CONTRAST by name, not only COLOR. It also fails if the docs still claim a 4.23:1 shortfall.
- **The marks:** `social/facebook.svg` and the derived `provider/facebook-blue.svg` paint `#0866FF`. Only the color changes, so the derived file is still its source under the same scale and move, and `lint-glyph-geometry` DERIVED holds unchanged. `brand-mark-glyphs.ts` is regenerated, and both provenance color lists read `#0866FF`. `social/facebook`'s source line records where the blue comes from.
- **Kept green:** #3142's provider-glyph contrast arm (its tinted fixture now uses `#0866ff`), #3125's Q846 white-on-dark arm and the paste executor case (the Facebook blue pressed member's fill is `#0866ff`). Black on `#0866ff` is about 4.35:1, still over 3:1, so the white rule still needs its own arm. Its comment says so.
- **No executor code moved**, so `EXECUTOR_REVISION` stays. No member, name or token moves, so CONTRACT is unchanged.

### Mutations (each from a committed tree)
- `facebook.blue` fill back to `#1877f2` in the def: fails CONTRAST (`#ffffff on #1877f2 4.23:1`), COLOR, WASH and the paste executor arm.
- `facebook.white` ink back to `#1877f2` in the def: fails CONTRAST (`#1877f2 on #ffffff 4.23:1`) and COLOR.
- `facebook.blue` fill back to `#1877f2` in `test.ts`'s typed `RULES`: fails CONTRAST (`facebook.blue: 4.23:1`), COLOR and WASH.
- `provider/facebook-blue.svg` back to `#1877F2`: `lint-mark-colors` fails DERIVED and the provenance color check.
