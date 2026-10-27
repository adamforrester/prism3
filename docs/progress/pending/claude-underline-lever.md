## (2026-10-27) — Link underline thickness and offset as brand tokens; the reference brand sets 5% / 25% (#2942)

**What.** Owner decisions Q1–Q6 A, Q800 A and Q801 A. `typography.underline: { thickness, offset }`, each a share of
the font size or `auto` (default both). `resolveUnderline` (theme.ts) holds a set value to a whole percent and clamps
it to `UNDERLINE_BOUNDS` (thickness 1–20%, offset 0–50%), like the column-count clamp. A set field emits
`core.font.underline.<field>`, `$type: number`, shaped like `core.font.line-height.*` (a `style-part` with its
PERCENT). The `-link` composites' `$value` is unchanged; their `figma.baked` list names the two fields when set.
`emit-figma-font.ts` puts PERCENT on every UNDERLINE style; `write-plan.ts` turns absence into an explicit `'AUTO'`;
the plugin's `applyTextStylePlan` and the paste pass write `{ unit: 'PERCENT' }` or `{ unit: 'AUTO' }` after
`textDecoration`, on UNDERLINE rows only. The reference brand sets 0.05 / 0.25 (`nbThemeFrom`, `nb-redesign.design.md`).
Studio and plugin share one panel: a "Custom underline" switch and two whole-percent fields in Theme › Type › Weights
and styles, a read-only line in a new Components › Link section, and a Link underline sample at 14/16/18px in the
Type preview. All copy is a DRAFT placeholder (Q2 A).

**Diagnosis that kept it small.** Line height already had the exact shape: a unitless DTCG number that Figma bakes
into the style as PERCENT, with no variable. The new fields ride the same `bound: false` style properties, so no
component set is due and Link and Breadcrumbs follow through the text styles.

**Deliberate.** Absence means AUTO in `text-styles.json` (not an explicit AUTO object), so every other brand's committed
file is byte-identical. The plan, not the file, makes AUTO explicit. Neither field is written on a plain style:
Figma's API reads both as null when the text is not underlined.

**CONTRACT stays 14.12.0.** Auto emits nothing (Q5 A), so 9 of the 10 corpus members lack the paths and the gate files
them as brand-dependent: `token-contract --check` reports no guaranteed move, and `lint-contract-version` refuses a
raise over a `none` level. The baseline gained the two brand-dependent paths through `--accept` at 14.12.0.

**Assumption for a live file.** Figma does not document what `textDecorationOffset` PERCENT is measured from. The build
assumes the alphabetic baseline and a percent of the font size, which is CSS's zero position under
`text-underline-position: auto`, so 25% and 0.25em draw one line and no conversion is applied. To verify: underline
100px text at offset 25% and measure the line's top 25px below the baseline.

**Gates.** `test.ts` #2942 (clamp table, the clamp reaching the tokens, off = no token and AUTO rows, on = 18 rows at
5/25, other brands' committed files untouched, paste-path read-back); `apps/plugin/test-write-typography.ts` #2942
(read-back on 18 built `-link` styles, plain styles untouched, re-applying an auto brand writes AUTO); `apps/studio/test-smoke.mjs` #2942 (the switch stores 0.05 / 0.25, 40 and 60 read back 20 and 50 and export 0.2 and 0.5, off exports no underline, the Components › Link line follows). The TokenPress reader's gap is #3085.
