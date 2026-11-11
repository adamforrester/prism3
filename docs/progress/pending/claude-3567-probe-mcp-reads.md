## (2026-11-11) — Adherence contamination probe: a read through an MCP tool voids a run (#3567)

Found in the post-merge review of #3450 (#3569). `probeContamination` (`tools/agent-adherence/orchestrate.ts`) judged
only `Read`, `WebFetch`, `Bash`, `Grep`, `Glob`, `Agent` and `Task` calls, and the text-transcript line regex named the
same tools. A run session gets MCP servers by default, so a C0 run could read `skills/prism3-build-ui/SKILL.md`
through `mcp__github__get_file_contents` and be scored as clean. The `CLAUDE.md` pattern was also case-sensitive, so
`cat $(find / -iname claude.md)` passed.

Now any `mcp__<server>__<tool>` call is judged like the read tools, and the `CLAUDE.md` pattern ignores case. In a
text transcript, an MCP call is read in the form Claude Code prints it, `<server> - <tool>(<args>) (MCP)`, never as the
`mcp__…` name (the review found the first version tested a line no transcript contains). A server name with a space is
not read in the text form. Prose is still never matched (`contamination/prose-mention` and
`contamination/json-u-escaped` stay green). The README's contamination paragraph says the same.

Not changed: a GitHub MCP call that names the repository only by its `owner` and `repo` fields, with a path outside
`skills/prism3-*` and no CLAUDE.md, is not void, because the repository pattern matches URLs. The skill path or a
CLAUDE.md in its input still voids it.

### Self-test

`selftest.ts` gains `contamination/mcp` (JSON), `contamination/mcp-text` (a text call line),
`contamination/claude-md-case` (a lower-case `claude.md` in a Bash input) and `contamination/mcp-clean` (an MCP read
of a `README.md` stays clean). 87 assertions run, all pass.

Mutations, each failing by name with every other arm green: `readsFiles` back to `READ_TOOLS` alone, and `mcp__`
dropped from the text regex → `contamination/mcp`, `contamination/mcp-text`; the `CLAUDE.md` pattern case-sensitive
again → `contamination/claude-md-case`.

Review round: `contamination/mcp-text` now feeds the real `⏺ github - get_file_contents(…) (MCP)` line, and
`contamination/mcp-text-prose` (sentences naming an MCP call mid-line, one ending in `(MCP)`) and
`contamination/mcp-hyphen` (`mcp__prism3-figma__figma_run` in JSON) are added. 89 assertions run, all pass. Mutations,
each failing by name with every other arm green: the text form back to the `mcp__…(` line → `contamination/mcp-text`;
its line-start anchor dropped → `contamination/mcp-text-prose`; `MCP_RE` refusing a hyphen →
`contamination/mcp-hyphen`.
