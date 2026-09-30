## (2026-09-30) — The prose gates read the MCP server's tools/list as served (#1806)

**STATUS: PR open from `lane/mcp-prose-scope`, labeled DO NOT MERGE.** ENGINE bump by change note (`engine: patch`: one served description sentence changes, and no committed artifact moves).

**What was wrong.** Neither `lint-us-english.ts` nor `lint-voice.ts` read the MCP server's tool and argument descriptions, which every connecting agent reads. `catalogue` shipped there twice and passed CI; #1804 fixed both by hand before merging, so nothing in a gate would catch the third.

**What changed.**
- **`mcp-served.ts`** spawns `mcp.ts` over stdio, as `mcp-test.ts` does, sends one `tools/list` and returns the reply. A failure is an `error`, never an empty list. Only this acquisition is shared: each gate applies its own rules and its own literal list of the six tool names.
- **Both gates scan every string in each served tool, one at a time.** US English runs `enGb`; the voice gate runs the §2 rules and `normative`. A hit names its JSON path (`list_levers.description`). The first cut scanned `JSON.stringify(tool, null, 2)`, and review measured the hole: JSON writes a newline as the two characters `\n`, which glue onto the next word, so `\nSimply … MUST … \nMUST NOT` caught 1 of 3 and `\nprogramme` passed. The gates now walk the parsed reply, values and keys. A reply that lacks a listed tool, has a tool with no description, or does not arrive is `blind`, fatal before any verdict. A tool added to the server is scanned without being listed, because the scan walks the reply.
- **One real hit, fixed.** `theme_from_brief`'s `brief` description said "MUST open with a --- YAML frontmatter fence". The voice standard allows RFC 2119 levels only in the payload channel, and an MCP description is not that channel. It now says "It must open with…", the wording `design-md.ts`'s own error uses.

**Why the served reply and not a grep of `mcp.ts`.** `toolDefs` assembles the list at request time, and part of it is the inlined theme schema's summaries. A source grep would read comments that never ship and would miss that schema text. It is also the surface an agent actually receives.

**Traps for whoever re-verifies.**
- **The server is spawned as one node process.** Under tsx, `mcp-served.ts` reuses `process.execArgv`, which holds tsx's loader flags, instead of `npx tsx`. With `npx tsx`, a timeout would kill the outer process and orphan the inner one. tsx is not a repo dependency, so its path cannot be named directly.
- **The `--files` flag does not list this surface.** It prints files, and this surface is not one. The headline's per-surface counts do show it, as "6  MCP tools/list".
- **The en-GB half had nothing to find today**, because #1804 cleaned it by hand. Its mutation (`catalogue` put back into `list_levers`'s description) is what shows it can fail. The voice half found a real hit on its first run.
