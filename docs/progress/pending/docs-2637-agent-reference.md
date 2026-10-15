## (2026-10-14) — Agent docs: `llms.txt`, a generated command reference, and `/docs` in the studio (#2637 lane 2)

Owner Q300 A, lane 2 of #2637. Three parts, one PR.

**The reference.** `packages/engine/emit-agent-reference.ts` writes `docs/public/reference/commands.json`: both MCP
servers' tools (`toolDefs()` in `mcp.ts`, `TOOLS` in `tools/figma-bridge/server.ts`), every agent-link command
(`AGENT_COMMANDS`, each `AgentArgs` member and its doc comment, the `bad-args` refusals `parseCommand` gives it, the
`AgentErrorCode` list, the `MAILBOX` layout, and the dev-only `run-code` from `dev-commands.ts`), and twelve CLI entry
points (each file's header usage lines and the flags its code compares `argv` against). Every entry carries its
source as `file#anchor`, the file plus the symbol to search for (`AgentArgs.readback`, `name: 'theme_brand'`,
`argv`). An earlier push wrote `file:line`, and review found the trap: main moved `verify.ts` by seven lines and
`--check` went red on a tree where no command had changed, and every PR that shifts a line in `mcp.ts`,
`agent-protocol.ts` or a CLI would do the same, and conflict on `commands.json` with every other such PR. The
noise also buried the signal: a fake tool reported itself plus six `changed in the code` lines for untouched tools.
The anchor still refuses to generate when its symbol is gone. The one authored part is `WRITES`, what each command writes to the file, because the handlers hold that in
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

**`theme_brand.brand` is the one schema not as sent.** The reference gives it as a `$ref` to `theme-schema.json`;
the wire carries `compactSchema(theme-schema)`, descriptions cut to their summaries. The header and the `$ref`'s own
description say so, in one sentence, because `compactSchema` runs over the `$ref` object too and keeps only a
description's first sentence.

**Serving.** `apps/studio/docs-route.mjs` is the one definition of `/docs`: the dev server (`build.mjs --dev`, now a
small front server over esbuild's) answers `/docs/*` from `docs/public/`, and `build-site.mjs` copies the directory to
`public/docs/` and lists each file in its publish manifest. `vercel-ignore.sh` now builds on a `docs/public` change,
with a case in its gate. `test-docs-route.ts` fetches both files through the dev route (byte-equal, typed, traversal
refused). A directory asked for without its trailing slash answers `301` to the slash path: served at
`/docs/ecosystem`, a page's relative `./ecosystem.json` resolves to `/docs/ecosystem.json` and 404s, which review
found with the ecosystem lane merged in. The deployed site's handling of the same path is not measured here; `test-prod-bundle.ts` checks the deploy build copied both. The studio's Inspect menu gains a **Docs** item
on the web host only, opening `/docs/llms.txt` in a new tab; its place and label are an owner item.

**Prose gates.** `lint-us-english.ts` and `lint-voice.ts` now scan `docs/public/**`, with `llms.txt` required by name.
The first run found two things. `catalogue` in the bridge's `figma_run` schema shipped unscanned, since the bridge's
`tools/list` was never in either gate (fixed at the source). And the reference names `materialise-to-figma.ts`, a file
name: rather than add `materialise` to `NOT_EN_GB`, which would hide the word in prose, `prose-rules.ts` masks the
whole tracked path (`EN_GB_FILE_NAMES`), sampled both ways in the self-check, with a stale entry failing the gate.

**Found, not fixed:** the bridge's `figma_run` describes its `args` for four commands of ten; filed as #2639.
