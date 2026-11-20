## (2026-11-19) — llms.txt shows how to start the MCP server and one call per tool, and the READMEs name the Docs area (#4156, #4138)

Two findings from the overnight audit (#4104), with one root cause: the docs a reader opens before any guide were not held to what the guides are held to.

### #4156: a runnable MCP example where a consumer looks

`docs/public/llms.txt`, the agent entry point, said "Agents drive it through an MCP server" and gave no way to start one. It now has a "Use the MCP server" section: the run command, a client config, a link to the engine README's "Connect an agent (MCP)", and one minimal call per tool as `tools/call` params, using the OKLCH brand shape the audit got wrong first time (#4133). A new `mcp-test.ts` block reads that fenced block from the file, starts the server the way the section says (in a scratch directory, so `export_theme`'s `./tokens` lands there), runs every line and fails on any error, by tool name. It also fails if a tool in `tools/list` has no example, so a seventh tool cannot ship without one. The sentence under the block, on `theme_brand`'s `include`, is run too: `include` replaces the default, so it names `["notes", "tokens"]`, and the arm fails by name if the log it promises is missing.

Every brand-taking example passes `{ brand }`, the one shape #4288 gave every tool.

`docs/43` stays where it is. It now opens by saying it is for maintainer agents, points a consumer to llms.txt, and says its sizes are from when it was written.

### #4138: "Docs", not "Documentation"

`apps/studio/README.md` (lines 17, 97, 98) and llms.txt's style-guides line still named the area "Documentation" after Q-UI9 A renamed it "Docs". `lint-guide-claims.ts`'s AREA arm already held the guides and the app strings to the rail's names; it now reads the root, studio, plugin and engine READMEs and llms.txt with the same prose rule, and each must exist and be read. TokenPress's README stays out: it is a guest, and its "## Documentation" heading is a section of that README.

### Mutations, each failing by name

- llms.txt from `main` → all four `#4156` arms fail.
- one example's brand broken (`neutral` without `chroma`) → `#4156: every llms.txt example call runs as written` fails, naming `theme_brand`.
- the `export_theme` line deleted → `#4156: llms.txt gives an example call for every tool` fails, naming `export_theme`.
- "Documentation" put back in the studio README → `AREA: #4138: apps/studio/README.md:17` fails.
