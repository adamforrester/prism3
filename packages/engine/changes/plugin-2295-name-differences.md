---
engine: patch
---
#2295: the anatomy read-back reads an aspect-locked frame's targetAspectRatio as Figma types it, a {x, y}
Vector whose ratio is x / y, instead of as a number. On the real host the number-only check failed on every
locked frame, so all three image-placeholder members on the NB master read as differing from their plan with
nothing edited. No committed artifact moves.
