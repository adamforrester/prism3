---
engine: patch
---
Plugin: Update file's check no longer reuses a kept member read after a variable's value is edited in the Variables panel
(#3364). Figma reports no document change for that edit, so the hand-edit pass and each check print the file's local
variables (values by mode, and each collection's modes), and a print that moved, or cannot be read, drops every kept read.
No emitted artifact, token or projected component surface moves.
