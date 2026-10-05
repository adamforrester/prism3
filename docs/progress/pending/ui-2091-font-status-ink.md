## (2026-10-05) — Type: the font status "⚠ Not installed" takes the ground's text color (#2091)

**STATUS: branch `ui/2091-font-status-ink`.** UI and tests only. No engine change, no emitted artifact moves, no ENGINE bump, and `CONTRACT_VERSION` is unchanged. No new strings. Fixes #2091.

**The owner's decision (2026-10-05, T-FONT A).** The Type preview's font status keeps its ⚠ symbol, and its words use the studio's normal text color. Inside the Type preview's ground that color is `--ink`, which `ground()` in `preview/sections/kit.ts` re-scopes to the mode's `text.primary`. So the label now reads at the brand's own body-text contrast: the lowest in the corpus is 15.98:1 (harbor light), against 3.84–4.16:1 before. `.tf-stat.no` moved from `var(--warn)` to `var(--ink)`. The label string, its span and its class are unchanged.

**The glyph takes the text color too, not a warning tint.** The owner allowed the ⚠ to keep `--warn` only if it passed 3:1 as a graphical object on every brand ground in every mode. On the corpus it would (lowest 3.84:1, harbor dark). But the ground is the page color of whatever brand the designer authors, which the studio does not own, and a fixed amber cannot promise 3:1 there: a mid-tone page color takes it to about 1:1. Keeping the tint would also have needed a new carve-out in `test:smoke`'s probe. The probe measures every element that owns a text node, so it holds a lone "⚠" in its own span to the 4.5:1 text bar, and that bar is exactly what `--warn` fails. So the ⚠ alone says "warning", and the one span keeps one ink.

**`KNOWN_CONTRAST_GAPS` is empty, and the mechanism stays.** The #2091 row was deleted. Both arms were re-proven by planting that row again: against the fix it fails as STALE, and against the mutation it excuses the general chrome check while the new check still fails.

**The new check (`test:smoke` section 1, `FONT_STATUS`).** On the Type place, for every brand × mode, the font status (`span.tf-stat.no` "⚠ Not installed", a literal not read from `ui/fonts.ts`) must clear 4.5:1 wherever it is drawn. After the sweep, it must have been drawn in every brand × mode state swept. The label shows only where a brand face does not resolve on the device. That is true in CI and in a bare container, which drew it in 12 of 12 states (3 brands × 4 modes, 116 nodes). A machine with every corpus face installed fails by name with "NOT EXERCISED", because on that machine the check measured nothing. The general chrome check already covered this node, but only when it was drawn, so it could not tell an unmeasured run from a passing one.

**Mutations, after a `wip:` commit, restored with `git checkout -- <file>`:**
- `.tf-stat.no{color:var(--warn)}`: 14 failures, 7 of them the new check by name, for example `harbor / type / dark: the font status span.tf-stat.no "⚠ Not installed" clears 4.5:1 on the brand's page color in all 9 place(s) drawn (#2091) — 3.84:1`. The other 7 are the general chrome check on the same states.
- The same mutation with the #2091 row planted back in `KNOWN_CONTRAST_GAPS`: 7 failures, all the new check. The planted row still excuses the general check.
- The fix with the row planted: `known contrast gap #2091 (type / span.tf-stat.no "⚠ Not installed") still occurs — STALE if not: drawn 116 time(s), 0 below the chrome bar`.

### Traps
- **"✓ Installed" is still `--ok` on the same ground** (3.87:1 on the dark grounds, computed from the emission). It is drawn only on a machine that has the brand's faces, so neither CI nor this container ever measures it. The decision covered the warning only, so it is filed as #2103 rather than changed here.
