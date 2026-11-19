---
engine: minor
---
A brand whose actionPalette and roleColors.action name different palettes is refused, naming both (#4207, owner
decision A, 2026-11-19): "actionPalette is 'accent' and roleColors.action is 'primary'; both set the action palette, so
set one of them, or give both the same palette." (DRAFT wording). The two are schema aliases. Before, roleColors.action
won silently and the action note described a lever the brand had not set. Two equal values, either one alone, or
neither still build as before. No committed brand sets both, so no emission moves; CONTRACT is unchanged.
