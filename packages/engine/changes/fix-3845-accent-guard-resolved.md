---
engine: patch
---
The accent≠action guard now reads the palette action resolves to, so `roleColors.action` behaves as its alias
`actionPalette` does (#3845, the #1895 shape). `roleColors: { action: 'accent' }` with `accentPalette: 'accent'` is now
refused, where it shipped an accent column identical to action. `roleColors: { action: 'accent' }` with
`accentPalette: 'primary'` is now accepted, where it was refused against the unset lever's `primary` default. No
corpus brand sets either, so no committed artifact moves.
