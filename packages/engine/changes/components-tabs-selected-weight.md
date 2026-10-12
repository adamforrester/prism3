---
engine: minor
---
Labels always carry the default weight, and a selected tab is set in the emphasis weight (owner decisions Q225 A and
Q226 A). Every brand now emits `type.label.{sm,md,lg}.default` and `.default-link` and their Figma text styles,
whatever its label weights or `buttonLabelWeight` say (CONTRACT 14.6.0, six added paths; NB's legacy theme ships them
too). Tab binds `type.label.*.default` unselected and `emphasis` selected, and holds every tab at its bold label's width
with a hidden bold copy of the label (a zero-height, clipping `reserve` box whose `labelReserve` text the same Label
property drives, `texts.<prop>.also`), so selecting a tab still never moves its neighbors. Revises Q178.1 A's one weight;
its goal stands. "Button label weight: Default" now only rebinds the button family. An empty label weight set is still
refused by name (#1639).
