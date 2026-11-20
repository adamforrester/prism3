## (2026-11-18) — The action note tells an explicit primary from an unset one, and names any pin (#3284)

**What.** The decisions log's action line branched on the RESOLVED palette only, so a brand that wrote
`actionPalette: 'primary'` (or `roleColors.action: 'primary'`) read "action: the primary palette, by default —
actionPalette is not set.", which is false. And the pin sentence ("action: pinned at '<palette>' step N by
actionAnchorStep — applied exactly, never moved; …") ran only under a brand color, so a pin on primary or on neutral,
which `modes.ts` applies exactly in every mode, went unmentioned. Owner decision A (2026-11-18):

- "not set" is said only when neither `actionPalette` nor `roleColors.action` is set;
- an explicit primary reads `action: the primary palette, as the brand sets.` (APPROVED wording);
- the pin sentence is widened to any pin, whatever the action palette. Without a pin, the brand-color anchor line is
  unchanged.

**Nothing moves in `out/`.** No committed artifact prints these lines (`regen.ts` writes the tree unchanged), so the
change note is a patch. `lint-voice.ts` gains two producers, `action: primary, set` and `action: pinned` (no producer
claimed the pin line, which nothing in the sweep reached until now), and a sweep brand that sets primary explicitly
with a pin, so both lines are read.

**Measured.** `test.ts` #3284: on main the explicit-primary arms fail (they read "not set") and the three pin arms fail
(no pin line on primary or neutral); with the fix all pass, and the unset arm still reads "by default". Mutations that
fail by name: the `actionUnset` test dropped (always "as the brand sets") fails "#3284 an unset action palette still
reads …"; the pin branch narrowed back to `actionBrandColor` fails "#3284 a pin on an explicit primary action palette
gets the pin sentence".
