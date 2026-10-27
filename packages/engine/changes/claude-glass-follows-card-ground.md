---
engine: minor
---
Card glass (#3073, owner decision 2026-10-27: keep the white glass and add a card glass): a new role,
`color.glass.card`, the glass fill for a band set on a card. It is the card ground's (`color.foreground.primary`'s)
palette color at the glass alpha: 70% in light and dark, 90% in high contrast, the same steps as the white glass.
So a band on a card reads as the card and only the blurred photograph shows through. It aliases a minted alpha step
of the card's color, `<palette>-<step>-alpha.<n>` (`neutral-050-alpha.70`, `neutral-900-alpha.70`), built the way
the white/black alpha steps are; where the card is white or black it aliases the existing white/black alpha step. It
follows an overridden card, and an override aimed at it is refused. `color.glass.surface` is unchanged. The blur stays
`blur.glass` and the `glass` Effect Style.
