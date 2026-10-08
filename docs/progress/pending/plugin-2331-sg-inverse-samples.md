## (2026-10-08) — Style guide tables: every fill swatch fills its cell, only inverse text, border and icon samples sit on the inverse background, a light swatch edge (#2331)

The owner's direction after reviewing #2330's screenshots (#2331; Q115 answered 2026-10-08: the edge is
`color/border/primary`). The plugin's main-thread drawing (`apps/plugin/src/style-guide.ts`) only; the Build style
guides panel is untouched. Builds on #2330.

**1. A light edge.** Every fill swatch's square is stroked with the brand's `<root>/color/border/primary` (NB `#DCDBDB`,
the lightest border role), bound, the row's own root first. #2330 had bound `border/secondary` (NB `#8F8D8D`), the
owner's 2026-10-07 call, now superseded. Palette steps and semantic fills alike.

**2. Every fill is its own swatch.** A semantic fill (display `default` or `transparency`: backgrounds, foregrounds,
interactive fills, overlays, inverse fills included) now draws like a palette step: the swatch fills its cell, with the
edge, on no ground. `fillSwatch` draws both. Before, a semantic fill sat 48 × 48 on a Ground frame bound to the role's
contracted ground, which put inverse fills on a dark backdrop ("just not working").

**3. Only an inverse mark sits on the inverse background.** A text ("Aa"), border or icon sample is still drawn on a
ground. An INVERSE token's ground is now the collection's `inverse/background/primary`, detected by `isInverse`: an
`inverse` segment anywhere in the WHOLE variable name. Every other mark keeps the ground its role is contracted against,
and never an inverse one (the page ground instead). The contrast column measures what it measured before.

**The cause of the owner's invisible inverse text.** The ground came from the path below the table's common prefix, and
the Inverse table's prefix is `<root>/color/inverse` itself: with a saved brand, `inverse/text/primary` resolved as
`text/primary` and drew on the white page ground, where `#F7F7F7` cannot be seen. In the shim the old branch does exactly
that with prism3's contract (M1 below), so the old code was never held on this. The NB copy has no saved brand, and
there the old fallback happened to land on the inverse ground: its visible defect was the inverse fills sitting on a
dark backdrop, which the live "before" screenshot shows. `isInverse` reads the whole name, so the answer no longer
depends on whether the file has a saved brand.

**Tests** (`test-style-guide.ts`): section 31, new: inverse text, border and icon samples on the inverse background, with
and without a saved brand; an inverse fill as its own swatch, on no backdrop; non-inverse border and text samples on the
page ground. Sections 2, 5 and 30 moved with the owner's direction: a semantic fill fills its cell and takes the light
edge; the palette edge is `border/primary`.

**Mutations,** each on the committed head through the #2272 harness (anchor asserted, mutated text present, restored in
`finally`, `git diff` empty after), against `npx tsx apps/plugin/test-style-guide.ts`:
- M1, inverse detection dropped from the ground: `✗ 31: an inverse text sample (inverse/text/primary) sits on the inverse background (FRAME Ground on "VariableID:color:0"; want VariableID:color:144)`, the same for border and icon, and `✗ 31: with no saved brand (no contract), an inverse text sample still sits on the inverse background, detected from its whole path`.
- M2, fills drawn on a ground again: `✗ 31: an inverse fill (inverse/background/primary) fills its cell as its own swatch, on no backdrop (FRAME Ground on "VariableID:color:144")`, with `✗ 5: a fill row's swatch fills its cell, on no ground (#2331)`.
- M3, the detection widened to every border: `✗ 31: a non-inverse border sample (border/primary) sits on the page ground, not the inverse one (FRAME Ground on "VariableID:color:144")`.
- M4, the edge back to `border/secondary`: `✗ 30 #2268: every palette swatch's edge is bound to pds3/color/border/primary, the light edge (#2331) (168 swatches, 168 not …)`.
