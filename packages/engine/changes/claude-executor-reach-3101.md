---
engine: patch
---
Update file counts a component set as due after a plugin release that changes how Prism3 draws components only when
that change redraws the set (#3101, the follow-up to Q811.1 / Q820 A). Each EXECUTOR_REVISION now names the sets it
redraws in the plugin's `executor-reach.json`; the as-built ledger and the update's dry run read a set recorded under an
older revision as current unless a revision since then names it. A new gate, `lint-executor-reach.ts`, draws every set
with the base's executor and the PR's in the component shim and fails an entry that names fewer sets than moved. The
record starts with the revisions measured back to its floor; a set recorded at or below the floor is due as before.
No committed artifact moves.
