## (2026-11-19) — The CLI and MCP say what failed and what to do next (#4200, part)

The overnight copy audit (#4104) measured what the CLI and the MCP server print against `docs/voice-standard.md`
§5 ("state what failed, then the next action"). Owner decisions 1, 3 and 4 were "as recommended"; every new
string here is DRAFT and comes back to the owner in the PR.

- **Decision 3 (b):** `score_consumption` adds `vacuous: true` when no pair resolved in any mode. `rate` keeps
  its `1`, so no consumer breaks.
- **Decision 4 (a):** `theme_brand`'s `contracts.failures` are `{ role, mode, ratio, against, min }`, the fields
  of the line #4271 prints from the CLI. `score_consumption`'s failures share `mode`, `ratio` and `min` but key by
  `pair` and carry no `against`; whether the two should match is an open owner question on the PR. This changes a public output shape, as decided.
  The ratio goes through `floorRatio` (#3759), so a near-miss never reads as the floor.
- **Decision 1 (a):** the alias is named on both sides, `theme_brand`'s description and the agent link's
  `apply-theme` / `prune` (plus `figma_run`'s description). The rename waits for the next contract bump.
- **Rows built:** A (`cli.ts` missing file, stdio parse error), B (`file-facts-cli.ts` stack trace, the -32603
  backstop, `brandTheme failed for`), C (the two failure headers as constants, `Unknown tool` casing), D (one
  size constant, `PAYLOAD_CHARS`, for the description and the hint, and a hint that is true when `include` was
  passed), E (`--fidelity` drops "note", `list_levers`'s description).
- **Rows left, and why:** the validator rows of A and B are in the hex-anchor PR, which rewrites that generator.
  The `theme_from_brief` description is #4258's (it makes the tool read both dialects). `cli.ts:74` and the
  `--help` text sit inside #4271's hunks. `design-md.ts:219` feeds the studio's paste parser, which reads the
  line number out of the message. The `classify-colors` and `standard-design-md` rows overlap #4029. The plugin
  agent-link rows (`agent-link.ts`, `agent-dispatch.ts`) are the plugin's surface. Stripping tracker ids from
  served summaries conflicts with #1760's rule that a summary is a prefix of the file's text, which is raised
  as an OWNER DECISION on #4200.
