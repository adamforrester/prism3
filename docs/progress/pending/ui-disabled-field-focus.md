## (2026-10-05) — Chrome: a disabled text field does not answer hover

**STATUS: branch `ui/disabled-field-focus`.** UI and tests only. No engine change, no emitted artifact moves, no ENGINE bump, and `CONTRACT_VERSION` is unchanged. No new copy. A follow-up to #2120.

**The owner's decision (2026-10-05, F2).** A disabled text field shows no hover. `.p3-text-input:hover` became `.p3-text-input:hover:not(:disabled)`, so a pointer over Layout's fixed first breakpoint field no longer moves its edge to `field-edge-hover`. Before this, the field drew the hover edge, which reads as editable.

**Held: F1 and F3 of the same decision.** F1 (a disabled field takes Prism3's own disabled field skin) and F3 (Continue's focus ring) are not in this PR. Both were reported to the owner with their evidence:
- **F1.** Prism3's text field (`packages/engine/components/text-field.ts`) draws disabled as `color.disabled.fill`, `color.disabled.border` and the on-fill ink `color.disabled.on-fill`. It carries no surface, so it uses no `inverse.*` set. Mirrored into the chrome, that skin measures 3.05:1 text and 1.80:1 edge on the light page, and 3.04:1 and 1.65:1 on the dark page. `test:chrome`'s audit holds every chrome field to 4.5:1 and every control edge to 3:1, and it has no exemption for disabled controls. So the mirrored skin fails `every chrome field inks its value at 4.5:1` and `every control edge and indicator clears 3:1` on both hosts and both themes. Whether the chrome exempts disabled fields is the owner's call, so #2120's dashed edge stays.
- **F3.** Prism3's button ring is `color.border.focus`, `focus.ring.width` (2px) and `focus.ring.offset` (2px). The owner chose the page's text color, and Prism3's color differs, so this sub-item stopped. The chrome's brand-leak check (`BRAND_RE` in `chrome/tokens.mjs`) also forbids `border.focus` in the chrome.

**The check (`test:chrome`, `disabled field:`).** On both hosts and both chrome themes, a pointer over the disabled first breakpoint field must change none of its background, edge or text colors. A control arm, a pointer over an editable breakpoint field, must change that field's edge, which proves the probe can see a hover. Given a screenshot directory, the block also saves the disabled field and Continue focused by keyboard.

**Mutation, after a `wip:` commit, restored with `git checkout -- <file>`:**
- `:not(:disabled)` dropped from the hover rule: 4 failures, all this check, for example `✗ disabled field: web light: a pointer over the disabled first breakpoint field changes nothing — borderTopColor rgb(141, 142, 144) → rgb(103, 105, 107)`.
