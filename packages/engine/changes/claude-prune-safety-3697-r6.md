---
engine: patch
---
A confirmed prune (#3697 R6) saves a named version first, is refused unless the file holds the brand it was sent and
its preview's `previewHash` is echoed, tries each removal on its own, and reports the running counts when it stops.
The agent link's `prune` confirm now requires `previewHash`. Plugin and panel only: no emission or component surface moves.
