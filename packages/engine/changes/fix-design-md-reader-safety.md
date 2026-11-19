---
engine: minor
---
The design.md reader closes three silent drops. A `__proto__`, `constructor` or `prototype` key is refused by name and line, instead of hiding its values from the schema (#4119). A control character other than the line break and carriage return #3984 handles (a tab, a bell, a NUL, DEL) is written as `\t` or `\uXXXX` and read back, so the design.md round trip holds for it; a hand-written `"\t"` or `"\u0041"` in a double-quoted scalar now reads as YAML reads it (#4213). A standard design.md reads a heading face from `headline`, `heading` and `h1`–`h6` typography tokens, and names each typography face no category reads in `xWarnings`, a second heading or body face included (#4137).
