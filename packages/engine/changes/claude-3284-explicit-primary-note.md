---
engine: patch
---
The decisions log's action line tells an explicit `actionPalette: 'primary'` (or `roleColors.action: 'primary'`) from an unset one: the explicit case reads "action: the primary palette, as the brand sets." instead of "actionPalette is not set" (#3284). The `actionAnchorStep` pin line is said for any pin, on primary or neutral too, not only under a brand color.
