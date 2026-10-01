## (2026-10-01) — The plugin's write-path safety floor: an ownership mark on every style, and the floor tested end to end (#1884, part of #506)

**STATUS: PR open, labeled DO NOT MERGE (the orchestrator nets + merges).** Plugin only, plus an `engine: minor` change note, because Apply Theme now writes a new record into the file. No `out/**` change, no contract change, and `apps/studio/src` is untouched. Files: `apps/plugin/src/provenance.ts` (**NEW**: `markOwned`, `isMarkedOwned`), `write-styles.ts`, `write-grid-styles.ts` and `write-text-styles.ts` (stamp each style written), `preflight.ts` (reads the mark first), `test-write-preflight.ts` (five new arms, driven through `runApplyTheme`), `test-agent-link.ts` (the `foreign` arm).

### Premise re-check: most of the floor was already on `main`

#1884 was split from #506 using #506's original description, which predates #1634 (2026-09-24). #1634 already shipped the floor's core: `guardApply` runs a read-only pre-flight over the whole plan before the first write, and on any conflict it writes nothing and names each one. The checks were a same-named collection with no #1581 stamp, a same-named style without the engine's description signature, and a same-named variable of another `resolvedType`. Mode renames were already safe too. `reconcileModes` renames only a one-mode collection whose mode the plan doesn't name (#1570), and a foreign collection is refused before that point. So this PR builds only the delta between #1634 and #1884's scope.

### What was missing, and what changed

**Styles had no provenance of their own.** The pre-flight recognized a Prism3 style by its description, which is the designer's to edit. One rewritten description, and every later apply on that file was refused with a verdict saying Prism3 didn't create a style it did. Each style writer now stamps `prism3`/`owned` = `1` (shared plugin data) on every style it writes, whether created or reused. The pre-flight reads that mark first.

**Why shared plugin data:** the same reasons as the #1581 mode stamp. Any plugin, and an agent's `figma_execute` census, can read it. The `prism3` namespace is already in use. `setPluginData` is private to the plugin and refused under `use_figma`.

**Collections keep the #1581 `modes:owned` stamp as their mark.** Every apply already writes it, so a second record of the same fact would add nothing.

**Variables get no mark.** A variable is only ever written inside a collection the pre-flight has cleared. Its name sits under the brand root, and its type is checked in every era. Marking each of the 600-odd variables on every apply would cover one residual case: a designer's own variable inside a Prism3 collection, under a name a later engine version starts writing. That case is stated in `provenance.ts`.

**Legacy recognition and backfill.** A style written before the mark existed is still admitted by the engine's description templates (#1577, both generations). In a file older than the #1581 stamp, it's admitted by the persisted-brand presumption. The write that follows marks it. Collections were already backfilled the same way, because `stampOwnedModes` seeds a first stamp with every mode the collection holds. The hard test: a file shaped like the previous version's output (stamped collections, no style marks) re-applies with 0 conflicts and 0 created, and leaves all 84 styles marked. The pre-#1581 shape (no stamps, no marks, the persisted brand) does the same and leaves all 12 collections stamped as well.

**The verdict channel is unchanged.** The refusal still reaches the panel as `apply-result`, with headline `✗ N conflicts` and a summary naming each conflict by kind, name and reason. The agent link also gets the full list in `data.conflicts`. No studio edit was needed.

### Gate + mutations

The new arms in `test-write-preflight.ts` run `runApplyTheme`, the sequence `main.ts`'s `applyTheme` calls, against the recording file shim. The existing arms drive a hand-copied sequence, and since #1614 that copy runs the color pass before the float pass, unlike the real one. Expectations are literals for the `prism3` example brand: `pds3/color/background/primary`, `shadow/xs`, 84 styles, 12 collections, and the verdict text written out in full. The arms:

- **foreign file:** a hand-made `color` collection, a STRING variable under a name Prism3 writes as COLOR, and a hand-described `shadow/xs`. The apply is refused, a deep snapshot of the file is identical before and after, and the verdict names all three.
- **fresh:** the apply writes, and every collection ends up stamped and every style marked.
- **previous version:** described above.
- **pre-#1581:** described above.
- **edited description:** a marked style whose description was rewritten still applies.

`test-agent-link.ts` gains **foreign**. It runs the real `main.ts` against a foreign file, through both the Apply button message and the agent's `apply-theme`. Both get `✗ 3 conflicts`, the verdicts are byte-identical, `data.conflicts` lists all three, and neither caller writes anything (every host object records property writes and writing calls).

Each mutation ran from a committed `wip:` HEAD and was restored, and each failed by name:

- **M1, the collection provenance check removed:** foreign-adopt, legacy (no brand), foreign file (verdict + summary), foreign/panel, foreign/agent.
- **M2, the type pre-flight removed:** zero-writes (×3), foreign file (verdict + summary), foreign/panel, foreign/agent.
- **M3, the refusal made partial (write, then refuse):** zero-writes (×3), foreign-adopt, foreign file (snapshot, 1648 writes then a throw; verdict; summary), foreign/panel, foreign/agent, and foreign (writes).
- **M4, the legacy presumption broken:** legacy and pre-#1581.
- **M5, the style description evidence removed:** previous version (×2).
- **M6, the style mark not read:** edited description.
- **M7, the effect writer stops marking:** fresh, previous version (backfill), pre-#1581, and edited description.

### Held, and filed

- **Held, the owner's call:** a Prism3 file with *neither* record (no `modes:owned` stamp, no persisted brand) is still refused whole. #1634 decided that deliberately. The files that land there are ones `materialise-to-figma.ts` wrote (#1658), and MCP-paste files written in ledger mode and re-applied without their ledger. The PR body sets out the options. One option is to admit a collection that holds a variable whose exact, brand-rooted name the plan writes. That would make the MCP ledger no longer required by the pre-flight, and would flip `test-mcp-paste.ts`'s ledger arm, so it isn't taken here.
- **Filed #1904:** three binding lookups (text-style bindings, gradient stops, the wash's opacity alias) resolve variables by name across the whole file, past the pre-flight's per-collection type check.
- **Not built, by scope:** any UI for choosing what happens on a conflict (skip, rename, take over). That's deferred to the UI redesign's Figma-panel slice (S11).
