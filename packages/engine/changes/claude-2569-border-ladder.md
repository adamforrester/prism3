---
engine: minor
---
The neutral border ladder is two decorative rungs, then the first accessible one (#2569, owner decision Q259 C with
1A, 2A and 3A; closes #2498). `border.secondary` targets ~2:1 against the page with no floor (step 250–300 in light,
700 in dark; it had a 3:1 floor since #1745). `border.tertiary` is the quietest neutral step that clears the mode's
non-text bar (3:1; 4.5:1 in HC) against every page and surface tier, `background.*` and `foreground.*` (550 in light,
500 in dark across the corpus), contracted against `background.primary` and, as `alsoAgainst`, against whichever
of the other five grounds it measures lowest on. HC keeps its escalated targets and its steps. The inverse ladder
is unchanged. Badge's subtle neutral edge moves to `color.border.tertiary`; Divider gains a code-only
`separator.fill` binding (`color.border.tertiary`) for decorative=false, while its decorative default and Tab's hover
bar stay on `color.border.secondary`. Values and role descriptions move in every brand's light and dark modes; no
token name changes, so CONTRACT is unchanged.
