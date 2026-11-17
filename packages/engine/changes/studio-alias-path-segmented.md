---
engine: patch
---
The token list's Alias path control (Inspect › Token list › Semantics, Full / Short) is the shared segmented control
(#3911). It was built from the legacy `.seg` classes, whose selected segment drew a 2px underline no other segmented
control draws. It is now a radio group like every other choice: one Tab stop, arrow keys between Full and Short. Studio
and plugin only; no committed artifact moves.
