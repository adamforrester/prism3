---
engine: patch
---
An empty `typography.links` is refused (#3707): the schema says `minItems: 1`, and `brandTheme` refuses an in-memory empty list. It used to build without the body and caption link styles the token contract guarantees and Link binds.
