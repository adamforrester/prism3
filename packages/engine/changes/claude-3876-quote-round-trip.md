---
engine: minor
---
A brand name with a double quote survives a design.md round trip (#3876). The serializer wrote a quote inside a double-quoted string as `\"`, and the parser never decoded it, so every export and import added a backslash before each quote. The parser now decodes `\"` and `\\` in a double-quoted string, the serializer escapes a backslash as well as a quote (keys included), and the comment, key and flow scanners no longer end a string at an escaped quote. A double-quoted string that holds neither escape reads exactly as before. Every committed brand's emission is unchanged.
