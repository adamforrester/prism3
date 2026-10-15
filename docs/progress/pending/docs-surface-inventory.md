## (2026-10-14) — Docs: a code-read inventory of every surface

**STATUS: branch `docs/surface-inventory`.** Docs only: `docs/inventory/surfaces.md` and its machine-readable twin `docs/inventory/surfaces.json`. No code, no artifact moves, no ENGINE bump.

**Why.** Machine-readable command docs, designer-facing docs and an architecture diagram all need one factual base first. The existing docs drift, so this one was read from the code at `b020716`, not from them.

**What it covers.** Engine entry points and their flags, the 42 `lint-*.ts` gates, the MCP server (6 tools, with each description and input schema, and no resources or prompts), the Figma plugin (15 features, 10 agent commands plus the dev-only `run-code`, 39 message types, dev versus release build), the web studio (7 tabs and 9 places, 50 levers in 7 manifest groups, 2 exports), TokenPress, the 182 committed artifacts and who reads each, the 33 component defs, the 4 shipped skills, 81 data-flow edges and 86 rows where a doc disagrees with the code. Four more rows were checked and found no conflict; they sit apart in §10.6 (`docChecksNoConflict` in the JSON) and are not counted. Every fact cites `file:line`, and "(inferred)" marks the rest.

**Findings worth knowing before you build on it:**
- No code emits per-brand payload skills (#668). `CLAUDE.md`'s `skills/` row says the engine emits them; `docs/07` and `lint-payload-manifest.ts` say they are not built.
- The engine MCP server has no component or Figma tool. Components reach Figma through the plugin, or through `tools/figma-mcp/plan.ts` scripts for `use_figma`, which bundle the plugin's own executors.
- Update with dry run and confirm, capture-baseline and adopt-members are agent-only; the panel has no trigger for them.
- `packages/engine/README.md`, `apps/studio/README.md`, `apps/plugin/README.md` and `docs/23` are the most out of date. Section 10 lists each disagreement, and none were fixed here (facts-only scope).

**Traps.** Line numbers are a snapshot of `b020716`. `surfaces.json` is built from the tables in `surfaces.md` plus the per-surface records, so a later edit to one must be made in the other too; nothing gates that.

**Review round.** An independent review checked all 656 explicit `path:line` cites mechanically and found 9 past the end of their file (`run-guard.ts`, `provenance.ts`, `agent-bridge-relay.ts`, `studio/build.mjs`); the facts were right, the line numbers were not. They now point at the lines that hold the fact, and the JSON twin carried one more (`agent-bridge-relay.ts:97-124`) that the same check caught. Also fixed: the schema count (16, not 17); the agent-link row, which restated `agent-link.ts`'s stale 7-command header comment as fact when the CLI sends any of the 10 in `AGENT_COMMANDS` (now §10.3 #18); four §10 rows that said "no contradiction" and were counted as contradictions, now apart in §10.6; and three drifted cites. **Trap for re-checking:** a cite written as bare `README.md:N` can mean the README of the surface the row is about, not the root one, so a resolver must take the row's surface into account before it calls a cite out of range.
