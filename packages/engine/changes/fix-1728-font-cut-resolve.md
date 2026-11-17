---
engine: patch
---
Apply Theme writes each font-cut variable in its family's own spelling from the start (#1728). The engine names a
cut one way per weight ("Semi Bold Italic"), and a family can spell it its own way (Playfair's "SemiBold Italic"). The
text-style stage corrected the variable, but the variable stage ran first and wrote the engine's spelling on every
apply. So a run stopped between the two stages left the variable naming a style its family doesn't have, and every
re-apply put the wrong spelling back before correcting it. Apply now resolves each cut against the family the text
plan pairs it with, per mode, using the same resolver, before the variable stage writes. A cut the family lacks
under every spelling keeps the engine's name and is still reported. The text-style stage's correction stays as the
second reader. The font preload's false "typeface unavailable" warning, the issue's second item, was already fixed
by #1793. Plugin only; the agent paste path's font step is unchanged. No committed artifact moves.
