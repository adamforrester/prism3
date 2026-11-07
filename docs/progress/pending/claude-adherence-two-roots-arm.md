## (2026-11-07) — The adherence scorer's one-root guard has arms: several roots, or none, are refused by name

**The gap.** #3502 made the code-surface scorer read its CSS prefix off the token tree (`rootOf` in
`tools/agent-adherence/oracle.ts`), and said `rootOf` "throws by name on none or several". Its review found nothing
exercised either branch: `rootOf` changed to take the first of several keys left the self-test ALL PASS (the review's
M5). Today's pinned tree has one root, so no current score depended on it, but the claim was untested.

**The arms.** `selftest.ts` builds the oracle from the pinned files with one input broken in memory and expects the
refusal text, written out in the test rather than read off `rootOf`:
- `oracle/two-roots`: the token tree with a second root (`zz9`) beside `pds3`.
- `oracle/two-roots-base`: the same for the base tree, the path `buildOracle`'s `under` takes.
- `oracle/no-root`: a tree with only a `$` key.

**Mutations, each red by name with every other arm green (83 run):** `rootOf` refusing only an empty tree (taking the
first of several) fails `oracle/two-roots` and `oracle/two-roots-base`; `rootOf` refusing only several fails
`oracle/no-root`. No scorer code changed.
