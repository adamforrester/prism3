---
engine: patch
---
A composed variable rename no longer records an engine version where a contract version belongs (#1084). When only a
materialization rule renamed a variable, `composeVariableRenames` filled the row's `since` with the rule's
`ENGINE_VERSION`, in a field that holds the `CONTRACT_VERSION` that retired the old name. Such a row now carries an empty
`since`, the field's own not-known value, because the contract never retired that name. Nothing reads the field today,
so no outcome or report changes, and no committed artifact moves.
