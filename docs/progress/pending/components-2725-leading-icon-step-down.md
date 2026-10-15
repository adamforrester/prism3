## (2026-10-15) — Segmented control, Tab and Tag step their glyph down one rung, as Button does (#2725, owner decision Q337 A)

**Status:** three def bindings moved, one gate admission, tests. ENGINE minor (change note). CONTRACT unchanged: no token added or renamed. No executor change, so `EXECUTOR_REVISION` stays at main's number.

**What moved (Q337 A):** `size.{small,medium,large}.icon` on `segmented-control-segment`, `tab` and `tag` now bind `icon.size.xs` / `sm` / `md` (16 / 20 / 24px), where they bound the 1:1 rung `sm` / `md` / `lg` (20 / 24 / 32px). Button has done this since #1350. Icon button and Flush icon button keep their own rung.

**Tag's one rung sizes three parts.** `size.{size}.icon` sizes the leading icon, the check and the ×, so all three step down together; the rung was not split. Splitting it would need a new token key per glyph, which is a naming call, and a check larger than the leading icon beside it would be a design call. The owner confirmed this as Q356 A: all three step down together, and the ×'s 44px hit slot is unchanged. The `notes.contested` entry that held the ×'s size in its slot is removed, and Tag's `evolution` line cites Q356 A.

**Gates.** `lint-rung-names.ts` arm 3 expects every def's medium default on `md` unless the def is in `ICON_OFFSET_DEFS`; the three defs are added there, so a revert to `md` or a slip to `xs` still fails it by name. `lint-component-surface.ts` baseline accepted over the change note (7 surfaces drifted: tag ×3, tab, segment ×3).

**Tests.**
- `test.ts` `#2725` block: for each of the three defs, every projected member's glyph parts (Tag: leading icon, check, ×) bind the literal `icon/size/xs|sm|md` and resolve to the literal 16 / 20 / 24px in nb and every example brand. Icon button's three families are asserted at 20 / 24 / 32 in the same block, so the boundary holds both ways. A scope floor requires every named part at every size.
- The Tag rendered-width assertions encode the owner's 2026-09-29 worked examples, which used the 24px glyph at medium. They now read with the 20px glyph: select label + check 74 (was 78), icon + 67px label + check 145 (was 153), the check widens by 26 (was 30); dismissible with icon 86 / 108 / 128 (was 90 / 112 / 136). Label-alone widths and the floor are unchanged.
- `apps/plugin/test-write-components.ts` `#2380` rows for Tag's check and × named the 1:1 rung (`icon/size/{size}`); they now name `{size-1}`, the rung below, typed in the test as `xs` / `sm` / `md`.
- `apps/plugin/test-update-apply.ts` `stepdown/…`: each set built on the old 1:1 rung (the def with its three bindings put back), then updated through `previewUpdate` + `applyUpdate`. Every glyph is rebound and resized to the literal names and px, the set and every member keep their key and id, and the next dry run reads all current. `world()` gained a `varPx` passthrough so the shim carries the ladder's real px.

**Skills.** Neither `prism3-build-component` nor `prism3-consume` states the 1:1 rule; the build-component gate table already names `ICON_OFFSET_DEFS` as an owner exception, which stays true.
