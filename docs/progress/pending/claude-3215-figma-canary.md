## (2026-11-02) — The real-Figma canary: a path rule, a Mac job and a judge, run before the owner rebuilds (#3215)

`tools/figma-canary/` builds the owner's decisions of 2026-11-01 on #3215: a slim, as-needed check in real Figma before the owner is told "ready to rebuild". #3209 passed every gate and broke every Update on real Figma, because the tests' host is more permissive than Figma's sandbox. Nothing between merge and rebuild touched a real host. This is a tool, not a gate: a live Figma host isn't in CI, and nothing in the plugin changed.

### What's in it

- **`needs-check.ts`**: given the last checked commit and the candidate, applies the owner's path rule and says whether a check is needed, with a reason per file. The rule is two literal lists, `SKIP` then `CHECK`. It also catches a raised `EXECUTOR_REVISION` and a `figma.` API that nothing under `apps/plugin/src/` named before.
- **`judge.ts`**: reads the Mac's raw result envelopes and prints a per-command table, then `safe to rebuild from <commit>` or `held: <reason>`. It holds on any of: a missing or doubled envelope; a host `error`; `ok` not true; an exception's text anywhere in a verdict, refusal, blocker or log line; a build stamp whose commit (#3253) isn't the one asked for, or is dirty; the wrong file; or a command that wrote. `--commands` prints the four read-only commands, with the house brand compiled in for the prune preview.
- **`README.md`**: the rule verbatim, the owner's one-time scratch-file setup (house brand, 5 sets), and the Mac's job text: a dedicated checkout, `git checkout --detach <sha>`, a clean tree, `npm ci`, build, open the scratch file, link on, then `status` (stop unless it's the scratch file), `readback`, `update-components { confirm: false }`, `prune { confirm: false }`, plus a recorded host-descriptor read for #3295's fixture.
- **`selftest.ts`**: the judge over fixtures, and the rule over literal paths. `fixtures/3209.json` carries #3209's real-host error verbatim and must be held on `update-components`, quoting the invariant. The other 20 judge arms each make one edit to `pass.json`.

### Calls made where the decision was silent

- #3293's read commands haven't merged, so the canary uses the four existing read-only commands: `status`, `readback`, the update dry run, and the prune preview (the Apply Theme plan read, from the proposal's §3).
- A file on neither list needs a check. So engine code that isn't token values needs one: the plugin bundles it, and only token values are on the decision's skip list.
- The fifth seed set is `tabs`, a family lead whose usage panel lists its item.

**Trap for whoever re-verifies this:** in #3209's envelope, the headline is `✗ check failed` and the invariant is in the summary. The first draft of the judge quoted the first string matching an exception pattern, which was the headline, so it held without naming the error. `3209/update-components` now asserts the quote carries `'get' on proxy: property 'getLocalTextStylesAsync'`.
