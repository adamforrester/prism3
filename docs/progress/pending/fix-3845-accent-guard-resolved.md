## (2026-11-17) — The accent≠action guard reads the resolved action palette (#3845)

**What.** `brandTheme` refuses a bare `accentPalette` equal to the action palette, so it never ships two identical
interactive columns (docs/20 §3). It compared against the `actionPalette` lever, not `roleToPalette.action`, the
palette action resolves to after the `roleColors` pass. The schema calls `roleColors.action` and `actionPalette`
aliases, and the two spellings disagreed both ways:
- `roleColors: { action: 'accent' }, accentPalette: 'accent'` shipped an accent column identical to action;
- `roleColors: { action: 'accent' }, accentPalette: 'primary'` threw, against the unset lever's `primary` default.

The guard now compares against `roleToPalette.action`, as the link default does since #1895. No corpus brand sets
either lever, so no artifact moves.

**Not in scope.** The second half of #3845, the `action: the primary palette, by default` note a `roleColors.action`
brand still gets, is copy and goes in its own draft PR for the owner's decision.

**Measured.** `test.ts` gains two #3845 arms: both spellings refuse `accentPalette` equal to the resolved action
palette, and both accept `accentPalette: 'primary'` once action resolves to `accent`. On main both fail by name.
Disabling the guard fails `accent: accentPalette === actionPalette is rejected` and the first #3845 arm by name.
