## (2026-10-10) — Update apply: a veil's gradient stops draw their own colors, and the draw check reads them (#2391)

**The defect, confirmed live.** After an in-place update, 24 of the veil's 30 members (every directional one) drew solid black. Each `GRADIENT_LINEAR` fill's two stops stored `0,0,0` at 100% under intact bindings, and the host draws the stored stop color, as it drew a solid paint's before #2396. The component executor based every stop on `GRADIENT_STOP_PLACEHOLDER`. #2396 fixed the same shape for SOLID paints only. No check could see it: `drawn.ts`, which the dry run, capture and verify all share, read SOLID paints only, so the confirming dry run read every veil member current and the apply verified clean.

**The fix, #2396's method applied to stops.**
- `write-components.ts`, the `gradientFill` branch: each stop's base color is its variable's resolved color for the node, with the alpha in the stop's own color (a stop has no paint opacity). The placeholder is used only where nothing resolves. This applies on a fresh build and in place.
- `drawn.ts`: a bound stop of any `GRADIENT_*` paint whose stored color or alpha differs from its variable's resolved value is a fault, in the existing wording (`stored #000000 at 100%`). Since the dry run, capture and verify all read this one check, a damaged veil now reads "to update", the apply repairs it, and verify fails a stop the host leaves wrong.
- The shim: a veil variable resolves with the emitted veil's alpha (dark 50/60/70%, light 40/50/60%, clear 0). A combine does **not** re-resolve gradient stops, because what the host does to them on a combine is unmeasured. The stored stop is what draws, so the fresh-build test checks the executor and not the shim.

**Tests** (`test-update-apply.ts`, `veil/…`, expected values authored in the test): built fresh, all 48 stops hold their variable's color and alpha, and one member's two stops are spelled out in hex. With black stops under a matching record and earlier-plugin stamps, the dry run reads the 24 members "to update", naming 48 stops `stored #000000 at 100%`. The apply updates the 24, verified, and the next dry run reads all 30 current. With the host keeping black behind the executor, verify names the stop. Mutations, each failing by name: stops based on the placeholder → `veil/fresh`, `veil/repaired`, `veil/current`, `corpus/in place`; gradient stops dropped from `drawn.ts` → `veil/dry run`, `veil/repaired`, `veil/verify`; verify's draw check dropped → `veil/verify`.

`EXECUTOR_REVISION` 7 → 8.

**Still owed:** a live check on a scratch file, then a dry run on the master duplicate showing the 24 veil members "to update".

**Not changed (trap for later):** the MCP paste payload's gradient splice (`anatomy-figma.ts`, `PAYLOAD_GRADIENT`) still writes black stop bases, as its solid paint still does after #2396. The paste path only builds fresh, and whether a fresh combine re-resolves stops on the host is unmeasured. Filed as #2468 rather than widened here.
