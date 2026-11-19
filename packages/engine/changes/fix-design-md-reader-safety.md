---
engine: minor
---
The design.md reader closes three silent drops. A `__proto__`, `constructor` or `prototype` key is refused by name and line, instead of hiding its values from the schema (#4119). A control character in a string (a newline in a brand name) is written as an escape (`\n`, `\r`, `\t`, `\uXXXX`) and read back, so the design.md round trip holds; a hand-written `"\n"` in a double-quoted scalar now reads as a newline, as YAML reads it, and a quoted key keeps its own leading and trailing characters (#4213). A standard design.md reads a heading face from `headline`, `heading` and `h1`–`h6` typography tokens, and names each typography face no category reads in `xWarnings` (#4137).
