---
engine: patch
---
`cli.ts` prints a `[written]` line for every token file it writes, the base and per-mode overlay files included, and `--help` names them (#4153). When contrast contracts fail, it lists each one, with its mode, role, ratio, ground and floor (the first ten, then "… and N more"), above the count it printed before (#4170).
