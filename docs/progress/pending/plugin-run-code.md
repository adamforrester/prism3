## (2026-10-12) — Plugin: a dev-only "run code" command on the agent link (#2530, Q239 A, PR 2 of 2)

**STATUS: branch `plugin/run-code`, stacked on `plugin/release-build` (PR 1).** No engine change, no committed artifact moves, no ENGINE bump. `CONTRACT_VERSION` unchanged. The bridge server (`tools/figma-bridge/server.ts`) is unchanged: `figma_run` already passes any `cmd` through.

**What it adds.** A dev build (`dist/`, `PRISM3_DEV` true) answers `run-code {code, timeoutMs?}` on both transports. `code` runs in the plugin's main thread as the body of an async function. The result is our envelope:
- `result.data.value`: the returned value as JSON, or its string form;
- `result.logs`: the console lines, through the dispatcher's existing `teeConsole`;
- a syntax error, a throw or a timeout (30 s by default, up to 600000 ms) comes back as `handler-threw` with its message.

It's about 90 lines in `apps/plugin/src/dev-commands.ts`, plus three `PRISM3_DEV &&` branches in `agent-dispatch.ts` and one in `main.ts`'s `status` list.

**The sandbox, proven first, live.** On the scratch file's main thread (read-only, through the Desktop Bridge, 2026-10-12), an indirect `(0, eval)` of an async IIFE:
- saw `figma` as a global, `await` worked, a throw rejected, and a syntax error threw at once;
- refused code containing `import` + `(` when it was evaluated ("possible import expression rejected"). That's the rule `lint-sandbox-reject.ts` applies to our bundle at load, now also measured at run time.

The dev and release `main.js` both pass `lint-sandbox-reject`.

**Two diagnoses that shaped it:**
- **A direct eval keeps the whole module in the release.** The Console MCP's bridge uses a direct `eval`. With one in `dev-commands.ts`, esbuild warns and stops tree-shaking that module. Every call site was folded away, yet the release `main.js` still had the parser, the messages and the `eval`. So it's an indirect eval: it reaches `figma` the same way (global scope), and the module is dropped.
- **The parse lives in the dispatcher, not `parseCommand`.** `agent-protocol.ts` is context-neutral and is imported by the Node-side tools, `tools/figma-bridge/server.ts` among them, which have no `PRISM3_DEV`. A `run-code` envelope passes every envelope check and stops at `unknown-command`. The dispatcher lets exactly that case through, only in a `PRISM3_DEV &&` branch. `agent-protocol.ts` gains types only.

**Comments ship.** The bundles keep comments, so a comment outside `dev-commands.ts` that named the command put the name into the release `main.js`. The comments near the dev branches say "the dev command" instead.

**Tests:**
- `test-agent-link.ts` §run-code: a value, `await` with `figma` as a global, logs, a throw, a syntax error, a timeout, bad args, and with `PRISM3_DEV` false, `unknown-command`. Its `status` expectation now lists `run-code` after the stable commands.
- `test-agent-bridge.ts` e2e: `figma_run run-code` through the real server and relay into the real `main.ts` returns the value and the log line in a bridge envelope, and a throw comes back as `handler-threw`.

**The release gate gains two markers**, each found in `dist/main.js` and absent from `release/main.js`: `[dev-command-name]` (`run-code`) and `[dev-command-eval]` (`(0, eval)`).

**Mutations, each from a `wip:` commit, failing by name:**
- **the dispatcher's `PRISM3_DEV &&` guards forced true:** `✗ [dev-command-name] is absent from release/main.js`, `✗ [dev-command-eval] …`, and `✗ run-code release: … unknown-command`;
- **a direct eval:** `✗ [dev-command-name] is absent from release/main.js` (the module kept);
- **the handler no longer reporting its value:** `✗ run-code value`, `✗ run-code await + figma`, `✗ run-code logs` and `✗ e2e/run-code … bridge envelope`.

**Not yet run live through our own plugin:** the command on a real file. That needs the owner to open this branch's dev build with the agent link on. The evaluation itself is proven live; only the plugin wiring around it is measured in the harness.
