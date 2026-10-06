## (2026-10-05) — MCP's generating tools return a build-time refusal as an isError result (#2162)

**STATUS: branch `engine/2162-theme-brand-iserror`.** `ENGINE_VERSION` → **{{ENGINE_VERSION}}** (minor, a change note: the MCP tools' error output changes). No token, name or value moves; `CONTRACT_VERSION` unchanged. **Fixes #2162.**

### What was wrong

A refusal that fires in `buildTree`, once the modes resolve, escaped `tools/call` as a JSON-RPC **protocol** error. An override naming an unknown step is one such refusal. Measured over stdio: `{"error":{"code":-32603,"message":"internal error: overrides[light]: unknown step '999' …"}}`. The comment above `callTool` says a generation throw comes back as an `isError` result, and so does the conformance arm ("a tool that could not do its job returns isError so the model can self-correct"). That arm only exercised a schema failure.

It wasn't just `theme_brand`. Four tools caught `brandTheme` and called `buildTree` outside any `try`: `theme_brand` and `theme_from_brief` (through the shared `themePayload`), `export_theme`, and `score_consumption`.

### The fix

One helper in `mcp.ts`, `buildBrand`, builds a schema-valid brand the way every generating tool does, `brandTheme` then `buildTree`. A refusal from either step becomes an `isError` result with `errors: [<the engine's sentence>]`, the `{ error, errors }` shape the schema failure already uses. All four tools call it. `export_theme` now checks its `include` list before building rather than after.

**One output changes beyond the fix:** a `brandTheme` refusal used to read `{ error: 'brandTheme failed: <msg>' }`, and now uses the same shape. Nothing in the repo reads the old string. The CLI's own `brandTheme failed for …` message is separate and unchanged.

`validate_brand` keeps its own handling. It isn't a generating tool, and its contract is `{ valid, errors }`.

### Tests, in `mcp-test.ts`

62 → 66 passing. One arm per tool, each fed the unknown-step override: `theme_brand`, `theme_from_brief` (the override in the brief's frontmatter), `export_theme` and `score_consumption`. Each arm reads the **raw** reply, because the suite's `server.call` throws on an RPC error, which would crash the suite instead of failing an arm. It asserts no RPC error, `isError`, and exactly the engine's sentence. `export_theme` writes no directory.

### Mutation

Move `buildTree` back outside `buildBrand`'s `try`: all four arms fail by name, each showing what it got. For example: `❌ #2162 theme_brand: a build-time refusal comes back as an isError result carrying the engine's sentence, not a protocol error (got RPC error -32603: internal error: overrides[light]: unknown step '999' in palette 'neutral' (role 'foreground.brand'))`.
