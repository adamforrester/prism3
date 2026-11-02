## (2026-11-02) — Both executors' suites read back that no literal was written over a bound corner (#3048)

**Status:** test infrastructure only: `apps/plugin/component-shim.ts`, the paste stub and a new arm in
`packages/engine/test.ts`, a new arm in `apps/plugin/test-write-components.ts`, and the theme simulation in
`apps/plugin/test-update-components.ts`. No executor code moves, so
`EXECUTOR_REVISION` is unchanged. ENGINE unchanged (no change note: nothing emitted or projected moves). CONTRACT unchanged.

### What changed

- **The gap.** Both `claimDefaults` passes run after the bindings and zero every corner the plan leaves unbound. The
  only thing keeping them off a bound corner is a guard: `!(corner in bound)` in the plugin executor and `!(k in B)` in
  the paste payload. On the host a literal write after `setBoundVariable` detaches the variable, which is the rule #1228
  relies on for the stroke weight. Neither stub modelled it for corners (both kept the binding through the write), so
  removing either guard left every suite green while 35 defs would ship their radii unbound at 0.
- **The stubs model the host.** The #1388 per-corner setter in both the plugin shim and the paste stub now drops that
  corner's `boundVariables` entry on a literal write, as #2695 did for the stroke weight. `setBoundVariable` writes
  `boundVariables` only, so a binding survives until something writes a literal over it. The first attempt put the
  setter in its own block. #1388's later `defineProperty` silently replaced it, and the guard mutation passed. Probing
  the node directly found it, and the detach now lives in #1388's setter itself.
- **Read-back arms, one per executor.** Each walks every def whose plans bind a corner (discovered from the plans) and
  compares `node:corner=variable` from the plan's `bound` with the built node's `boundVariables`, roots keyed `<root>` on
  both sides. The plugin arm builds every member: 35 defs, 15620/15620 bindings held. The paste arm pastes the first
  binding member of each def. Each has a floor typed from #3048's list (`text-field`, `select`, `badge`,
  `provider-logo`), and the paste arm also fails on a paste that threw, so a harness gap can't pass as held or read as
  lost.
- **A harness trap, recorded.** The first paste run lost `card-number-field`'s four control corners. The payload had
  thrown (`getMainComponentAsync is not a function`) because its slot's swap target, a provider logo, was not in the
  stub's components. With swap targets passed, it pastes clean and holds.

- **One suite simulated the host the old way.** `test-update-components.ts`'s theme section imitates Apply Theme by
  writing a literal number into every bound field. For a corner that is now a hand edit that detaches the binding, as
  it would be on the host, so 45 members read as hand-edited. That section now moves a bound corner's variable value,
  which is what Apply Theme does. Its premise still moves 810 bound values.

### Verification

- `test-write-components.ts` exit 0; `test.ts` 635629 passed, 0 failed.
- **Plugin guard removed** (`else set(corner, 0)`): `#3048 every corner a plan binds is still bound …` fails by name,
  15620 lost, along with the executor's own `DISCARDED` read-back misses and the #1015 and #2343 radius arms that read
  the same nodes.
- **Paste guard removed** (`else set(k,0)`): `#3048 paste: every corner a plan binds is still bound …` fails by name,
  160 lost, along with #2343's paste tile arm, the two #1388 ring arms and the #1393 lockstep arm. On `main` the same
  mutation gave 0 failures (the issue's measurement).
