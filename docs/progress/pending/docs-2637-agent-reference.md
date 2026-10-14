## (2026-10-14) — Agent docs: `llms.txt`, a generated command reference, and `/docs` in the studio (#2637 lane 2)

Owner Q300 A, lane 2 of #2637. Three parts, one PR.

**The reference.** `packages/engine/emit-agent-reference.ts` writes `docs/public/reference/commands.json`: both MCP
servers' tools (`toolDefs()` in `mcp.ts`, `TOOLS` in `tools/figma-bridge/server.ts`), every agent-link command
(`AGENT_COMMANDS`, each `AgentArgs` member and its doc comment, the `bad-args` refusals `parseCommand` gives it, the
`AgentErrorCode` list, the `MAILBOX` layout, and the dev-only `run-code` from `dev-commands.ts`), and twelve CLI entry
points (each file's header usage lines and the flags its code compares `argv` against). Every entry carries its
`file:line`. The one authored part is `WRITES`, what each command writes to the file, because the handlers hold that in
code rather than data; a command with no entry, or an entry for a gone command, refuses to generate.

**Its own gate, not a regen step.** `--check` regenerates in memory and compares with the committed file, reporting
per tool, command, error code, CLI file and flag. It is not in `regen.ts` on purpose: regen's artifacts are engine
emission, read by the payload, version and prose gates as something a client receives, and `lint-emission-version.ts`
would then demand an engine bump for a reworded tool description. The file carries no engine version for the same
reason, so a fold never moves it. The CLI list is checked both ways against every `.ts` that reads `process.argv` in
the repo root, `packages/engine/`, `tools/figma-bridge/` and `tools/figma-mcp/`; gates (`lint-*`) and regen steps are
excluded by name or pattern with a reason. Stated limit: a CLI that reads no `argv` is not found by that check.

**Mutations, each failing by name:** a fake MCP tool added to `toolDefs` → `in the code, missing from the reference:
mcp tool prism3-engine/fake_tool`; `adopt-members` renamed in `AGENT_COMMANDS` → the generator refuses (`WRITES` has no
entry; an entry for a gone command); with `WRITES` and `AgentArgs` renamed too → `in the code, missing from the
reference: agent-link command adopt-memberz` and `in the reference, gone from the code: agent-link command
adopt-members`; a flag added to `fold.ts` → `in the code, missing from the reference: cli fold.ts --fake`.

**Serving.** `apps/studio/docs-route.mjs` is the one definition of `/docs`: the dev server (`build.mjs --dev`, now a
small front server over esbuild's) answers `/docs/*` from `docs/public/`, and `build-site.mjs` copies the directory to
`public/docs/` and lists each file in its publish manifest. `vercel-ignore.sh` now builds on a `docs/public` change,
with a case in its gate. `test-docs-route.ts` fetches both files through the dev route (byte-equal, typed, traversal
refused); `test-prod-bundle.ts` checks the deploy build copied both. The studio's Inspect menu gains a **Docs** item
on the web host only, opening `/docs/llms.txt` in a new tab; its place and label are an owner item.

**Prose gates.** `lint-us-english.ts` and `lint-voice.ts` now scan `docs/public/**`, with `llms.txt` required by name.
The first run found two things. `catalogue` in the bridge's `figma_run` schema shipped unscanned, since the bridge's
`tools/list` was never in either gate (fixed at the source). And the reference names `materialise-to-figma.ts`, a file
name: rather than add `materialise` to `NOT_EN_GB`, which would hide the word in prose, `prose-rules.ts` masks the
whole tracked path (`EN_GB_FILE_NAMES`), sampled both ways in the self-check, with a stale entry failing the gate.

**Found, not fixed:** the bridge's `figma_run` describes its `args` for four commands of ten; filed as #2639.
