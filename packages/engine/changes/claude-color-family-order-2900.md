---
engine: minor
---
The colour families now run background, foreground, text, border, icon, interactive, disabled, scrim, veil, field, inverse,
the order in the owner's master file; `interactive` moves from before `border` to after `icon`, in the emitted `color`
tree and the Figma create order, and every inverse group follows. Key order only: no token name or value moves, so
CONTRACT is unchanged.
