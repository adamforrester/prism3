---
engine: patch
---
An Undo load back to the brand Studio opened with restores a fresh copy of its provenance, never the boot object, so a late host read after a load and its undo no longer behaves as if nothing was chosen (#4215). Set up file's missing-page note says "helper components not built" (#4194). No committed artifact changes.
