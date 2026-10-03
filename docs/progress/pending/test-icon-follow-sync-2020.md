## (2026-10-02) — The icons Studio locks while unpaired are tied to the icons the engine carries, and the seven's explicit override is pinned (#2020)

**STATUS: PR open from `test/icon-follow-sync-2020`.** Test only: no engine or Studio source change, so no ENGINE bump, no change note and no freeze exception. `CONTRACT_VERSION` is unchanged. No new strings. Two gaps from the orchestrator's review of #2018.

**Gap 1: two lists of one set.** The engine carries a text override to its icon under '3:1' through a pattern, `ALWAYS_TWINNED` in `modes.ts`, whose `text.on-*` branch is open-ended. Studio locks the matching rows through a fixed list, `ALWAYS_FOLLOWS` in `apps/studio/src/state/fills-input.ts`. A new `text.on-*` role would be carried by the engine and still edit in Studio, and nothing would notice.
- **The test.** In `test-fills-input.ts`, section 6b resolves prism3 under '3:1' with an override on every text role in light and dark: 61 per mode. Each override lands off its icon twin's own derived value, which a precondition checks by name. EXPECTED is every page or inverse icon whose resolved value then equals its overridden text. It comes from the engine's output, never from either list (docs/34).
- **What it compares.** Studio's side is the set of `ICON_ROWS` that `lockedTo` locks, read per mode after loading that brand unpaired. `ALWAYS_FOLLOWS` is not exported, and exporting it would be a source change. Reading it through `lockedTo` checks what the page actually does.
- **Scope.** The engine side is scoped to the `icon.` and `inverse.icon.` families by prefix, not to the rows, so an engine icon with no row still counts. The interactive glyphs are carried too, but they belong to Color › Interactive.

**Gap 2: an explicit override, under '3:1'.** The only arms that caught "an explicit icon override always loses" were IT-01 and IT-02, both under 'text' or for interactive pairs.
- **The arm.** IT-03 arm (5) in `test.ts` sets, under '3:1', an explicit `icon.primary` and an explicit `icon.on-brand` override over their text's override, in light and dark.
- **EXPECTED.** The icon override's own step, with a precondition that it differs from the text.

**Mutations, each failing by name:**
- `icon.tertiary` added to `ALWAYS_FOLLOWS` only → `#2020: under '3:1' in light` and `in dark` ("locked but not carried: icon.tertiary"), plus the existing unpaired and aurora arms;
- `ALWAYS_TWINNED` widened with tertiary only → the same two `#2020` arms ("carried but editable: icon.tertiary, inverse.icon.tertiary");
- the explicit icon override always losing (`out[iconPath] = ref` unconditionally) → the four IT-03 (5) cells, plus IT-01 and IT-02.

**Unchanged on purpose.** Whether tertiary and the `-subtle` icons should also follow their text under '3:1' is still with the owner. Today they don't. IT-03 (3) and the new 6b both pin that, and 6b fails the moment one side changes without the other.

**Trap for whoever re-verifies this.** Some text overrides can land on their icon twin's derived hex by chance. The test then moves that override one neutral step along and resolves again, up to three passes. The precondition fails by name if one is still vacuous.
