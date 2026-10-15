---
engine: minor
---
A border never binds an icon or text color role (owner decision Q346, #2749). The disabled outline edge of Button,
Button.Destructive, Button.Neutral, IconButton, IconButton.Destructive, IconButton.Neutral and Tag now binds
`color.disabled.border` (and its inverse twin on an inverse surface) instead of `color.disabled.icon`, which #1349 and
#1697 had chosen so the edge would clear 3:1 against the page. The edge is now the same muted neutral every other
bordered control uses in its disabled state. `lint-paint.ts` gains arm 5, which refuses any stroke bound to a variable
the committed Figma emission does not scope `STROKE_COLOR`. Update rewrites the binding in place in a file built
earlier. No token is added or renamed, so CONTRACT is unchanged.
