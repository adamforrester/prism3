---
engine: patch
---
One file-wide write hold (#3697 R7): Apply Theme, prune, build, update, setup, style guides and an agent's writes now
exclude each other, where each operation held only its own. A refusal names the write that holds the file (`held`).
Plugin and panel only: no emission or component surface moves.
