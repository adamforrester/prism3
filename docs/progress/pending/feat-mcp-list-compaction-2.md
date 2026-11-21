## (2026-11-21) — MCP tools/list compacts a second step, under the same ceiling

`tools/list` measured 54,509 characters on main when the owner decided (54,897 once #4258 landed), 491 under the 55,000 alarm then, and two approved PRs each push it
over: #4096's `icons` block (about 909) and #4322's `summary` input on `list_levers` (about 250). The owner chose
to compress, not to move the alarm, so the 60,000 ceiling (#1368) and the 5,000 margin (#1760) are unchanged.

- **Where the room was.** Of the 54,509, 13,865 characters were descriptions beneath a top-level field or inside
  `$defs` (161 of the schema's descriptions). #1760 had already cut each to one sentence; what kept growing was
  their count, since every new sub-field brought one.
- **The rule.** `compactSchema` keeps the schema's own description, each top-level field's summary, and the
  summaries beneath the REQUIRED fields and in the `$defs` they reach (`oklch`). Everything else's prose is
  dropped from the inline copy. Keeping the required fields' sub-field prose costs about 700 characters and
  means a minimal valid call (`id`, `primary`, `neutral`) can be written from `tools/list` alone; dropping
  everything below top level was measured at 40,644 and rejected for hiding `neutral.hue`'s unit and
  `neutral.chroma`'s working range.
- **Where the dropped prose lives.** `list_levers` with `describe` returns each named field exactly as the
  schema file has it, every nested description and referenced `$defs` entry included. `theme_brand`'s
  description already says so; its copy is unchanged. The agent reference's one-line `$ref` description is
  updated to say which descriptions the wire keeps.
- **Measured** on main after #4258: 54,897 → 41,731 characters (55,000 alarm, 60,000 ceiling). That is 13,269 of
  headroom: #4096 and #4322 together need about 1,159, leaving room for about 48 more levers at the ~250 a compacted top-level field
  costs.
- **Gates.** `test.ts` restates the rule from the file with its own walker (not `mcp.ts`'s) and adds two arms:
  every description beneath an optional field is absent inline, and every one of them (≥100) comes back word for
  word from `describe` at its own path. `mcp-test.ts` holds the same over the wire (journey ①c). The headroom
  arms in both are unchanged at 55,000. Mutation: restoring the one-step compaction fails
  "MCP: tools/list drops every description beneath an optional field…" and "journey ①c" by name.
- **Trap.** The schema has fields named `default` (under `typography.weightRoles` and `modeLevers.weights`).
  A walker that treats `default` as a data keyword everywhere skips them; both walkers treat a key inside a
  `properties` / `$defs` map as a field name.
