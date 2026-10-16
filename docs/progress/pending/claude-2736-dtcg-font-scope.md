## (2026-10-16) — The DTCG `figma.scope` hint on font size and weight agrees with the Figma rows (#2736)

**What changed.** `packages/engine/tree.ts` no longer writes `$extensions.prism3.figma.scope` on the `core.font.size.*`
leaves (`fontSizeLeaf`, was FONT_SIZE) or the numeric `core.font.weight.*` leaves (`fontWeightLeaf`, was FONT_WEIGHT).
Their Figma rows carry `scopes: []` (size since #2602, the numeric weights since #2616, Q334 A), so the hint named a
scope no row had. The family leaves keep FONT_FAMILY and the fluid type composites keep FONT_SIZE, both of which their
rows still carry. Every emitted `*.tokens.json` moves (the five DTCG trees); no path or value does. Engine `minor`.

**Stacked on #2743**, which unscopes the numeric weights. On `main` alone the weight hint was still true, so the two
halves of this issue only agree with the emission once #2743 lands; stacking keeps the hint and the row in one state.

**The call made.** "Agree with the emission" and "drop the field" come out the same here: `figma.scope` is a single
string, and a string cannot say "none", so agreement for an unscoped row is the field's absence. The alternative, an
array `scopes` mirroring the Figma row on every font leaf, would rename a shipped field on the family leaves too; it is
listed as an owner item on the PR rather than built.

**Gate.** New arm (23c) in `test.ts`: for nb and every committed brief, each DTCG `core.font.{family,size,weight}` leaf
with a Figma row is compared, by path, to the `core` Default row from `figmaArtifacts`: `[figma.scope]`, or `[]` when
absent, must equal the row's `scopes`. Two independent writers (`tree.ts` and `emit-figma-font.ts`), and each group
must be represented per brand, so an empty match fails by name. Mutations: `scope: 'FONT_SIZE'` back on the size leaf →
`#2736 every DTCG core.font leaf's figma.scope …` fails (`… row scopes=[]`); `fontNode[g]` read from a wrong key →
`#2736 sweep floor` fails.

**Trap for whoever re-verifies.** `typeface` primitives also carry `figma.scope: 'FONT_FAMILY'` with `kind:
'style-part'` and have no Figma row of their own, so the arm skips them rather than comparing; the hint there describes
the style part, not a variable.
