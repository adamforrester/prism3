## (2026-09-30) — MCP theme_from_brief returns the decisions log by default, like theme_brand (#1868)

**STATUS: PR from `lane/theme-from-brief-default`.** ENGINE → {{ENGINE_VERSION}} (change note `packages/engine/changes/lane-theme-from-brief-default.md`, `minor`). CONTRACT stands.

**The defect.** `theme_from_brief` passed an empty `include` default to the shared payload builder. So a call that named no sections got the contrast results but no decisions log, while `theme_brand` returns the log by default. Both the tool's description ("the same verification payload as theme_brand") and the engine README's tool table say the two match. The `include` description ("Extra sections … same meaning as theme_brand") was also wrong: `theme_brand`'s `include` replaces the default rather than adding to it.

**The fix.** `theme_from_brief` defaults to `DEFAULT_THEME_SECTIONS`, and its `include` description says it replaces `["notes"]`.

**Why the existing test passed.** The "identical payload" arm compared only `contracts`. The new arm compares the SET of sections both tools return with no `include`, and requires the decisions log. A mutation restoring the empty default fails it by name.

Found by the independent review of #1866, the engine README's "Connect an agent" section.
