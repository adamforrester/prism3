---
engine: patch
---
An override whose ground is neither a role nor a ramp step now names that ground in the warning's own
`unresolved` field (a string) instead of in `against` with `unresolved: true` (#2097 item 3, #2114).
`against` on an OverrideWarning keeps its one meaning, a second ground the miss is on, so lint-ratio-truth
no longer reads this warning as a confession for a pair that does not exist. No emitted artifact moves.
