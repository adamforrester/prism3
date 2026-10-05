## (2026-10-05) — Type: the font status takes the brand's own status text colors (#2103)

**STATUS: branch `ui/2103-status-brand-text`.** UI and tests only. No engine change, no emitted artifact moves, no ENGINE bump, and `CONTRACT_VERSION` is unchanged. No new strings. Fixes #2103.

**The owner's direction (2026-10-05).** The Type preview's font status sits on the BRAND's page color, but "✓ Installed" was colored with the studio chrome's fixed `--ok` (3.87:1 on the corpus's dark pages), and "⚠ Not installed" with the ground's `--ink` (#2091). The tokens already have passing status colors, so both labels now use them: ✓ takes the brand's `color.text.success` and ⚠ takes `color.text.warning`, for the mode on screen. Over the corpus pages those measure 4.99:1 to 11.65:1. The engine gates each at 4.5:1, or 7:1 in high contrast, against the brand's page step (`neutral.050`/`.100` or `neutral.900`).

**How it is painted (technical call: option (b)).** `ground()` exposes no CSS variable for these two roles, and it was not widened. `faces.ts` paints the status inline with `c.paint(c.cur, role)` and marks it with `c.painted(specimen(…), role, 'color')`, the way the specimen beside it is painted in `text.primary`. The `.tf-stat.ok`/`.no` color rule in `styles.css` is gone; the class names stay as the labels' identifiers.

**The check (`test:smoke` section 1, `FONT_STATUS`).** On the Type place, for every brand × mode, each label (a literal class, text and role) must:
- clear 4.5:1 on the brand's page color wherever it is drawn;
- be drawn in the emission's hex for its role (EXPECTED is the committed emission, never the studio's resolver);
- have been drawn in every brand × mode state swept, or it fails as NOT EXERCISED.

The labels are specimen-marked now, so the check reads every probe row rather than only the chrome rows.

**"✓ Installed" is exercised in CI by a stub inside the test.** CI and a bare container have none of the corpus faces, so ✓ was never drawn there, and #2091 recorded it as unmeasured. The main sweep now opens each brand with `INTER_INSTALLED`, an init script that answers the studio's canvas font probe as though Inter were installed. It widens `measureText` only for the probe's exact font string, `72px "Inter", <base>`. No shipped code changes. Every corpus brand uses Inter and also JetBrains Mono, which stays absent, so each state draws both labels: 12 of 12 states for each, lowest 5.03:1 for ✓ and 4.99:1 for ⚠.

**Mutations, after a `wip:` commit, restored with `git checkout -- <file>`:**
- ✓ pointed back at `--ok` (`stat.style.color = st.ok ? 'var(--ok)' : …`): 19 failures, all this check. For example `✗ prism3 / type / dark: the font status span.tf-stat.ok "✓ Installed" clears 4.5:1 on the brand's page color in all 5 place(s) drawn (#2091, #2103) — 3.87:1 (op 1) | …` and `✗ prism3 / type / light: the font status "✓ Installed" is drawn in the brand's text.success #19693f in all 5 place(s) (#2103) — drawn rgb(26, 127, 75) (role text.success)`.
- Success and warning roles swapped: 24 failures, all this check. For example `✗ prism3 / type / light: the font status "✓ Installed" is drawn in the brand's text.success #19693f in all 5 place(s) (#2103) — drawn rgb(130, 81, 0) (role text.warning)` and `✗ prism3 / type / light: the font status "⚠ Not installed" is drawn in the brand's text.warning #825100 in all 5 place(s) (#2103) — drawn rgb(25, 105, 63) (role text.success)`.
