## (2026-10-02) — Under '3:1', the seven icons that keep a 4.5:1 floor follow their text (#1982)

**STATUS: PR open from `engine/icon-floor-follows-text-1982`.** Engine, plus one condition in Studio under a scoped freeze exception (Color › Surfaces & fills, `lockedTo` in `apps/studio/src/state/fills-input.ts`; nothing else under `apps/studio/src`). An `engine: minor` change note. No path moves, so `CONTRACT_VERSION` is unchanged, and no committed artifact moves: no corpus brand under '3:1' carries a text override on these. No new strings: "Follows ‹token›" is approved copy.

**What was wrong.** `iconContrast: '3:1'` lowers an icon's floor to the mode's non-text floor. But seven icon roles never take that floor: `icon.primary` and `inverse.icon.primary` derive at `primaryMin`, and `icon.on-<status>` derive at `onMin`. Under '3:1' they already derive equal to their text in every mode. A text override, though, was carried to its icon twin only under 'text' (#1968), so an override on `text.primary` left `icon.primary` behind, and Studio unlocked those rows as if the icon had a value of its own.

**What changed.** `ALWAYS_TWINNED` in `withIconTwins` (`modes.ts`) now names `(inverse.)text.primary` and `text.on-<status>` with the interactive pairs, so those carry under both lever values. In Studio, `lockedTo` keeps those seven rows locked as "Follows text.X" while icons are unpaired, through a fixed set. An explicit icon override still wins, and its row still edits.

**Finding, held for the owner.** The issue framed the seven as "the roles whose floor equals their text's", not a hand list. Measured, that rule gives 19 pairs, not seven. `icon.tertiary`, `inverse.icon.tertiary` and the ten `-subtle` icons (page and inverse) also sit at the same floor as their text under '3:1', in every mode, because their text's floor already equals the mode's non-text floor. So the set is named by how each role is derived, not by comparing floors. Whether tertiary and the `-subtle` icons should follow their text under '3:1' too is the owner's call. Today they don't, and IT-03 arm (3) pins that.

**Suites.**
- `test.ts` IT-03. (1a) each of the seven derives equal to its text in every mode the brand emits; (1b) with a text override in light and dark, each equals its text, with the expected value read off the text token and a precondition that the text differs from the icon's own derived value; (2) and (3) `text.secondary`, `text.tertiary` and `text.success-subtle` overrides do not carry; (4) the #1973 dark case under 'text'.
- `test-fills-input.ts`: unpaired, the seven are locked to their twin in Light and Dark, and a `text.primary` edit moves `icon.primary`. The "every icon row edits" arm and aurora's now exclude exactly the seven, from a literal typed in the suite.
- `test-smoke.mjs` S4d: per brand, unpaired, the seven are disabled and read "Follows text.X"; every other row edits.
- `test-chrome.mjs` Q52: its inverse icon override moves from `inverse.icon.primary`, now locked while unpaired, to `inverse.icon.secondary`. The arm still sets one page and one inverse icon override.

Mutations, each failing by name:
- the seven dropped from `ALWAYS_TWINNED` → IT-03 (1b), 14 cells;
- a floor-equality rule (tertiary and `-subtle` added) → IT-03 (3);
- every pair carried under '3:1' → IT-03 (2) and (3), and IT-02;
- the carry run in light only → IT-03 (1b) in dark, and (4);
- the fixed set removed from `lockedTo` → the seven `#1982` arms and aurora's in `test-fills-input.ts`, and S4d `#1982` for prism3, aurora and harbor.

**Trap for whoever re-verifies this.** Only light and dark accept overrides; the other modes are generate-only and throw on one. So "every mode" for the carry is light and dark. For HC and wireframe, IT-03 (1a) holds the derivation alone, and no carry mutation can reach it.
