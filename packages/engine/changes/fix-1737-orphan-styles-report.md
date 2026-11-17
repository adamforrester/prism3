---
engine: patch
---
Apply Theme reports the styles the brand does not plan (#1737). A style the plan doesn't write is never touched, so an
earlier brand's text, effect, paint or grid styles stayed in the picker beside the new brand's, and the apply result said
nothing about them, while it already reported the same drift among variables. Apply now adds a warning line beside the
orphan-variable one: "⚠ N orphaned styles not in the plan (text: 12, effect: 2) — likely from an earlier brand; nothing
was deleted" (copy DRAFT). The set is exactly the one Prune offers (`orphanStyles`, extracted from `computePrunePlan`):
a style inside a group the brand's plan emits, or carrying the engine's own description. A hand-made style group is
not named. Nothing is deleted, and Prune remains the delete path. Agents get the per-kind lists as `orphanStyles` in
the apply data. Plugin only; no committed artifact moves.
