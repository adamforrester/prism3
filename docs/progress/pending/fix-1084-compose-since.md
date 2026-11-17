## (2026-11-17) — A composed rename's `since` is a contract version or empty (#1084)

**What.** `composeVariableRenames` wrote `since: row?.since ?? mid.since`. The first is a `CONTRACT_VERSION` (from a
`DEPRECATIONS` projection); the second is the last materialization rule's `since`, an `ENGINE_VERSION`. The field is
`VarRename.since`, documented as the contract version. Since #1013 the rule-only branch is the common one (`projectionsOf`
refuses tier-only renames), so most composed rows carried `0.30.0` in a contract-version field. It now reads
`row?.since ?? ''`, and `materialize` returns the name alone, since nothing else read the rule version.

**Owner decision pending.** The issue lists three fixes: (1) drop the fallback, (2) carry `contractSince` and
`engineSince` separately, (3) retype `since` as a tagged `{ space, version }`. This builds (1), the issue's own
recommendation: nothing reads the field yet, and (2) or (3) can be added when a surface first shows migration
provenance.

**Measured.** `test.ts` gains three #1084 arms beside the compose arms: a rule-only row carries `''`, a row a contract
row reached keeps that row's version, and every row composed over the shipped map in three eras' spellings carries `''`
or a version `DEPRECATIONS` records. On main the first fails (`got '0.30.0'`). Mutating the fix to `since: ''` fails the
second by name. No committed artifact moves (`regen --check` clean).
