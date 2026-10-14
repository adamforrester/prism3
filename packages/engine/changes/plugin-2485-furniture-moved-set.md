---
engine: patch
---
Plugin only (#2485). When a Build or Update draws a set's canvas labels and inverse backdrop, it now also removes
that set's own earlier furniture from any other page or frame. A set a designer moved no longer leaves its labels and
backdrop behind on the page it came from. Matching is by the set's id in the furniture tag, so another set's furniture
and untagged nodes are never touched. No emitted artifact, token or projected component surface moves.
