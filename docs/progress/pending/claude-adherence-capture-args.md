## (2026-11-06) — Agent adherence: the `↳ Buttons` capture in parts, and every command checked against the plugin (#3469)

The first adherence setup on the Mac stopped at the `inspect-buttons` capture: `figma-plan.ts` sent `inspect` with
`depth: 4, maxNodes: 5000`, and the plugin takes a depth from 0 to 3 and at most 2000 nodes. Both values were past
its limits, not only the depth the error named.

- **Depth 3 under-covers, so the page is read in parts.** In the component shim the Button set is page → set →
  576 variants → 1,272 children: 1,850 nodes three levels down, close to the cap, and in a real file an icon slot's
  instance has its own layers a level further. The plant now cuts the page into parts (`PARTS`, a JavaScript string the
  plant runs in Figma and the self-test runs in Node): each part is one `inspect` within depth 3 and 1,500 nodes, and
  together they read every node four levels down exactly once. `buttonsInspect` joins them for the golden hash and
  V6. A truncated part stops `setup` and `run` before any agent starts. The plugin's cap is unchanged.
- **The plugin is the oracle.** `selftest-figma.ts`'s new `args/*` arms send every command from `setupCommands`,
  `resetCommands` and `captureCommands` (the `reads` program among them) through the plugin's own `parseCommand`, and
  `parseRunCode` for the dev `run-code`, imported from `apps/plugin/src/`, never restated. `parseCommand` drops an arg
  it does not read rather than refusing it, so an arm also fails when the plugin's parsed args differ from what was
  sent. Mutations: the old `depth: 4` back → `args/inspect-buttons`; an unread arg on a snapshot → `args/snapshot-hero`.
- **The rest of the plan, checked.** `file-setup`, `apply-theme`, `build-components`, every `run-code` (version, plant,
  reads), `audit-frames`, the six snapshots and `component-keys` are all taken as sent. The runner's `status`, marker
  and `mark` commands are written inline in its CLI, so the arms do not see them; each is `status {}` or a `run-code`
  with a 30 s timeout.
