## (2026-10-09) — Narrow bar: a long brand name is cut with an ellipsis instead of wrapping the bar (#2262)

At the narrow tier (560px and below), a long brand name wrapped the top bar wherever its row happened to break. With `northwind-outdoor-supply-co`, the plugin drew three rows at 460 and below (Export, then Activity and Agent, on a row of their own), and the web drew two at about 420 and below where its narrow bar is one. #2257 deliberately left the narrow tier alone, and #2287 fixed only the tooltip half. **Owner decision A (2026-10-09):** the narrow tier takes Q83 A's step too. The brand switcher takes what's left of its row and cuts the name with an ellipsis, keeping the full name in its tooltip and accessible name. The narrow bar keeps its designed rows: plugin `mark brand verdict theme agent activity export` / `figma apply`, web one row.

### The diagnosis that made it small

`fitBar` returned early at narrow. Everything else was already in place:
- **`measureFit` measures what is drawn.** At narrow, the tile labels and the product name are hidden by the narrow rules, so they measure 0. Its `rows` (the plugin's first row) and `full` (the web's one row) are already the narrow tier's designed first row.
- **The `trim` CSS works under narrow's `flex-wrap: wrap`.** `.p3-brandwrap` at `flex: 1 1 0` with `min-width: 0` has a hypothetical size of 0, so it never forces a break, then grows into what the row leaves.

So the change is one line: at narrow, the step is `fits(rows ?? full) ? null : 'trim'`, and the tooltip code below runs unchanged. A tier change already clears the cached measurement. #2287's rule holds: the `title` is set only while the name is measured cut and is cleared otherwise.

### Tests (§29d, `test:chrome`)

- **The narrow tier no longer skips.** The long name's existing 10px sweep already covered 560 to 380 on both hosts and both themes. It used to `continue` there; it is now held to the same checks as every other width: the oracle's step, the drawn rows (plugin 2, web 1), the CDP accessible name and the tooltip while cut.
- **`FIT_ORACLE` at narrow** has one candidate: the designed first row, laid out for real under the test's own forcing stylesheet (`rows` with a file row, `logo` without). Past it, the step is `trim`. It never reads `data-bar-fit`.
- **New floor:** each host must reach the cut name at the narrow tier. Measured: 9 widths per theme on the plugin (460–380), 5 on the web (420–380). Without this floor, the narrow half of the sweep could pass by never cutting.

**Mutations** (scratch runner of §29d alone, against both rebuilt bundles; a `wip:` commit before each):
- **(a) The narrow early return put back.** It fails `29d {web,figma} {light,dark} northwind-outdoor-supply-co: across 91 widths the bar draws the measured step, in no more rows than it allows`, e.g. `460: want trim (… first of two rows 440, in 436), drew other in 3 row(s)`. It also fails `29d {figma,web}: the long name reaches the cut-name step at the narrow tier (0 state(s))`.
- **(b) No `title` at narrow while the name is cut.** It fails `29d … 420 northwind-outdoor-supply-co (narrow): the cut brand name keeps the full name as the switcher's accessible name and tooltip (… title "null")` at every cut width, and the down-and-up tooltip check on all four host × theme cases.

### Not done, on purpose

- **No CSS rule changes.** The existing `trim` rules already serve narrow; only comments moved.
- **The short name "prism3" is unchanged at narrow:** it never reaches `trim` there.
- **The narrow tier's own rows were not revisited.** For example, whether Export belongs on the second row at narrow is the narrow layout's design, not this decision's.
