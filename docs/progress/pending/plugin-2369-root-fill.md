## (2026-10-08) — Update apply: a member root the plan gives no fill is cleared in place, and verify checks it (#2369)

Found by Lane B while fixing #2335. On an in-place update, a member root whose plan has no fill kept the fill it was built with. NB's Button, built under "Text button hover: Fill" and updated to the default "Text & icon only", listed all 48 text hover and pressed members as updated, and all 48 kept the wash. Together with #2335 (the dry run names the dropped fill) and #2364 (the apply executes what the dry run lists), approving the fill's removal now removes it.

- **The cause.** The executor's neutral claims (`claimDefaults`, #865) are what clear a fill nobody asked for, and they return at once on a `COMPONENT`. That holds for a fresh build, where a member's root is neutralized as a frame and becomes a component afterwards. In place, the root was already a component, so it was never neutralized. Inner frames were, which is why only the member root, where a button's wash sits, was affected.
- **The fix (`write-components.ts`).** `build` tells `claimDefaults` when it is configuring an existing member's root (`ex` given, path `.`). That root takes the claims a fresh member's frame takes, so it ends where a fresh build would. The paste twin (`PAYLOAD_BUILD`) builds fresh only, so it has no such case and stays as it is.
- **The verify (`update-apply.ts`).** `diffAnatomy` reads only the paints a plan declares, so a node the plan leaves unpainted was never checked. Verify (b) now also walks each updated member against its plan, by name, and reports a frame the plan gives no fill (and no gradient) or no stroke that carries a visible one, as a content difference. Hand-edited paths kept under Q1 are skipped, as in the rest of verify.
- **`EXECUTOR_REVISION` 3 → 4.** #2396 (#2379) took 3; #2363 (#2296) and #2389 take 5 and 6 after this.

### Tests (`test-update-apply.ts`, `root/…`)

Button built under `buttonTextHover: 'fill'`, then updated to the default plan:
- **premise:** 48 members the default plan leaves unfilled carry a wash on the root.
- **`root/cleared`:** after the update, none does.
- **`root/verified`:** the verdict fails exactly when one still does.

**Reproduced first:** `✗ root/cleared (48 still washed)` and `✗ root/verified (✓ updated 48 in place; 48 washed)`, Lane B's measurement.

**Mutations:**
- **The executor's fix reverted:** `root/cleared` fails. The verdict now reads `⚠ 1 set not verified`, so `root/verified` holds, which shows the verify check working on its own.
- **The verify check reverted too:** both fail, with the original `✓ updated 48 in place`.

The corpus arm re-applies all 24 defs in place and still reads clean, so neither the root's claims nor the new check move any other def.

### Traps for whoever re-verifies

- **Strokes and the other neutral claims on the member root** (effects, opacity, rotation, and so on) are covered by the same fix, since the root now takes every claim. Only fills were measured.
- **Not verified live:** on the NB master, Button under Fill updated to Text & icon only should show its text hover and pressed members without the wash.
