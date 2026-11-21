## (2026-11-21) — Figma's first geometry record, taken at 40d7fc01 (#3408 S6)

**What changed.** On `poc/arm-1`, with no engine change and no code change: `apps/storybook/figma-geometry.json`
is Figma's side of the KPI 2 geometry comparison, read by `apps/storybook/figma-geometry.js` at `40d7fc01` from a
scratch file the plugin built at that commit, with a theme applied. It records button (576 members), password-field
(84) and text-field (84), with node ids and layer names only. The file is not named, and nothing in Figma was written.

**What it reads.** `compare-figma-geometry.ts` against it: **98 of 241 comparisons differ**, unchanged after #4423,
#4431 and #4435. The triage (2026-11-20 comment on #4432) sorts them into the button's transparent 1px border against
no stroke in Figma (58 lines), text line-box rounding (30 lines, at most 0.31px) and field coverage (10 KPI 2 members
unreached, because Figma's field members record `message=false` and every field story shows a message). Three owner
decisions on #4432 cover those; this record makes none of them.

**Trap.** The record is data read on a Mac, not something to edit. If it must change, re-run the script there; never
hand-edit the JSON. `check:build` runs only the comparison's `--self-test`, so this record cannot turn CI red by
itself.
