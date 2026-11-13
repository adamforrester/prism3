---
engine: patch
---
The alias validator follows each chain (#3698 finding 7b). It checked one hop: a ref that named a token passed whatever
that token pointed at, while `deref` gives up after 10 hops and `pxOf` / `numOf` read that as `0`. `aliasFaults`
(`tree.ts`) now reports a ref to no token (`dangling`), a chain that returns to a token already on it, a self-alias
included (`cycle`, checked per mode), and a chain longer than `ALIAS_MAX_HOPS` (10, the reader's own cap; `too-deep`).
Each fault is an entry in `stats.broken` with its `reason`, `mode` and `chain`, so the CLI, `emit-dtcg` and every
alias assertion refuse it. No committed tree has one: the deepest chain is 2 hops.
