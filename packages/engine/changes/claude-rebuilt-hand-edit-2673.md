---
engine: patch
---
Update file no longer reports a hand edit as kept when it rebuilds the layer that holds it (#2673). A hand edit on a layer
the update removes or replaces (a title moved into a row the plan adds, a part renamed, a layer whose type changed) was
lost with the old node while the verdict counted it kept. The dry run now reads such an edit as a conflict the update
would lose, and under Keep and Accept the update skips that member whole and names it, as it skips a layer added by
hand. Overwrite still rebuilds it. Plugin only; no committed artifact moves.
