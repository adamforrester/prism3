---
engine: patch
---
lint-us-english sees the `-ring` form of the `-re` stems (#3186): `centring`, `manoeuvring`. RE_ENDINGS matched
`centre` as a substring, so a word that drops the `e` before `-ing` walked through it. A new arm over the same stems
catches it, sampled both ways in SELF_CHECK. The one shipped occurrence, a stylesheet comment carried verbatim in the
web bundle and the plugin UI, now reads `centering`. No emitted artifact, token or component surface moves.
