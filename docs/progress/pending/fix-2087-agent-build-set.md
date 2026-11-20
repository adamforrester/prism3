## (2026-11-17) — The Components page records an agent's set build against its set (#2087)

**Status:** Studio and plugin. ENGINE unchanged (no change note: no engine code moved). CONTRACT unchanged.

### What changed

- **The plugin names the set on `agent-started`** for `build-components` (`apps/plugin/src/main.ts`,
  `agent-dispatch.ts`, `messages.ts`): `def`, the def id the agent sent, or `button` when it sent none, which is what
  `buildComponents` builds then. No other command carries one.
- **The panel records it** (`apps/studio/src/write-adapter.ts`, `state/host-session.ts`): the wire keeps a usable
  `def`, `agentRun.def` holds it, and the `component-result` that answers a still-running agent build is written to
  `setBuilds` under that set, as the panel's own build is. Before this, an agent's build left its set reading "Not
  built in this session" while the Activity drawer showed the run. A start that names no set (an older plugin)
  records nothing, as before.
- `test-host-session.ts`'s G9 arm held the opposite ("an agent's build is not attributed to a set") and moves with
  the fix, as the issue said it would.

### Verification

`test-host-session.ts` (5 `#2087` assertions), `test-write-adapter.ts` (2) and `apps/plugin/test-agent-link.ts` (3), every
expected value a literal. On `main`, 6 of the 10 fail. Five `wip:` mutations each fail by name: dropping `agentDef` from
the reducer, dropping its `settled` check, the wire dropping `def`, the plugin posting no `def`, and the plugin not
resolving the absent def to `button`.
