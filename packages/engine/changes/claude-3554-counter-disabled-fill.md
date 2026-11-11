---
engine: minor
---
A disabled outline Counter keeps its box: the row takes Text field's disabled fill (`color.disabled.fill`) beside the
disabled edge it already drew, and the value takes the on-fill ink (`color.disabled.on-fill`), gated against that fill
(owner decision Q-CC10 A, #3554). Ghost is unchanged: it draws no box, and its value keeps the page form
(`color.disabled.text`). Three of the Counter's 18 members move (outline, disabled, at each size); no token path
moves, so CONTRACT is unchanged.
