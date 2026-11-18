## (2026-11-18) — Style guides: a dimension title that repeats a color title names its collection (#2729)

Owner decision A on #2729: when a phase-2 table (dimension, font variable) would carry the same title as a color table on the same page, it takes its collection in parentheses, the form two phase-2 tables that share a title already took ("Font size (core)"). A semantic dimension collection named `border` now draws "Border (border)" beside the border colors' "Border".

### The change

`planStyleGuide`'s title pass already made phase-2 titles unique among themselves. It now also treats a phase-2 title as shared when a color table on the same page has it. Color titles are untouched: phase 1 keeps its family names. The match is per page, so a primitive dimension table on Primitive tokens is not renamed for a semantic color family on Semantic tokens.

### What it does not touch

The engine's own emission has no such case (#2728 titled the icon sizes "Icon size"), so no prism3 file's titles move. A file drawn before keeps its frame: the table's key is unchanged, so a rerun retitles it in place, as #2728's rerun does.

### Verification

`test-style-guide.ts` §35e gains two `#2729` arms over the prism3 color collections plus phase 2's file with `space` renamed `border`: the dimension table is "Border (border)" and every Semantic tokens title is unique, and a tables filter for "Border" draws the colors alone. Both fail on main (the table is "Border"; the filter draws both) and pass on the branch. Mutation: dropping the color-title test from the shared condition fails both arms by name.
