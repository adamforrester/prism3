## (2026-11-02) — A multi-set build runs each set after the queued sets it nests, so none is built twice (#3308, fix 1)

**The defect.** The owner's first run (a fresh file, the Prism3 example brand, Buttons, Checkbox group, Icon, Link and Badge ticked, Update file) built Checkbox.Row twice: once as Checkbox group's dependency (`build-deps.ts`, #1633), then again from the queue, where its six members read "ALREADY PRESENT (skipped; this set has been written before)". Icon went the same way behind Button, quietly ("✓ already built"). Reproduced in the component shim under `fixHostMethods`: driving the plugin's real `main.ts` with the panel's posts, in the queue's order (the list's, review N1 on #2812), `checkbox-row`'s build answers `⚠ already built` with 6 skipped members and `icon`'s 46.

**The fix.** `depsFirst` (`apps/studio/src/state/build-queue.ts`) orders a run so each set comes after every queued set it nests, directly or through a set the queue does not hold, from the catalog's `nests`; otherwise the list's order stands, and a duplicate runs once. `startRun` takes the catalog and applies it; `runSets` in `main.ts` passes it, so Components' action bar and Update file's To add both get it. The plugin, the wire and the verdict copy are unchanged. In the shim, the owner's queue in this order builds every set once: no "ALREADY PRESENT" anywhere.

**Test.** `test-component-groups.ts`: `queue/deps-first` over the owner's nine sets (literal order: Icon first, Checkbox.Row before Checkbox group), through a set the queue does not hold (Checkbox (control) before Checkbox group), and the list's order kept with a duplicate dropped. It fails by name on current main, where `startRun` keeps the list's order.

**Mutation, failing by name.** `startRun` ignoring its catalog → all four `queue/deps-first` arms. `catalog` is required (review S1), so `runSets` dropping it (`startRun(kind, ok)`) → `typecheck-web`, at `main.ts`.

**Not this PR.** The other four "problems" in that run (each a missing usage-panel template) and why the run stopped are #3308's other fixes.
