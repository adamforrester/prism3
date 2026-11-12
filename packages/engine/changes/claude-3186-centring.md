---
engine: patch
---
lint-us-english sees the en-GB `-ring` form of the `-re` stems (#3186), the words en-US spells `centering` and
`maneuvering`. RE_ENDINGS matched the `-re` stem as a substring, so a word that drops the `e` before `-ing` walked through it. A new arm over the same stems
catches it, sampled both ways in SELF_CHECK. The one shipped occurrence, a stylesheet comment carried verbatim in the
web bundle and the plugin UI, now reads `centering`. No emitted artifact, token or component surface moves.
