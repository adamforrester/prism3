## (2026-11-11) — Sidecar: copied type and gradient descriptions, every brand gated, the floor setting named (#3555 G2–G4, I2, S2, V1)

Part of #3555 (the 2026-11-11 metadata audit), the rest of batch MB1 after #3588.

- **G2, typography, weight-role and gradient `$description`.** These tiers regenerated their own sentence where the color
  tier copies the token's (AI/A-22). The regenerated text lost the face, line height, tracking and fluid range (a
  `display.sm` said "48px" where the tree says "36→48px fluid"), and `body.xs`'s link variants lost "underlined". Each
  now copies the tree's `$description`, keeping the old sentence only where a token has none.
- **G3, prism3's sidecar was ungated.** The sidecar truth gate and the schema gate listed four of the five brands; the
  schema gate's message claimed every committed `out/*.ai.json`. Both now read all five.
- **G4, the tier docs.** The sidecar `note` and the schema's layout description left `blur` and the type line boxes out
  of the layout tier. Both now name them.
- **I2, color roles in the layout tier.** `blur.*` named `color.glass.surface` and `focus.ring.*` named `border.focus`;
  both now use the tree path, `color.border.focus`.
- **S2, the floor setting.** The floor note told an agent to move "the brand's floorStep setting" (and on an inverse
  entry "inverseSecondary setting"), which are sub-keys of the `surfaces` lever, not levers. They now read
  `surfaces.<mode>.floorStep` and `surfaces.<mode>.inverseSecondary`.
- **V1, capitals in `$description`.** The AI/C-3 capitals check read every sidecar field but `$description`, so "PAGE"
  (removed in #3597) shipped in nine overlay descriptions per brand. It now reads `$description` too, with `CSS` added to
  the acronyms it admits. Bare names in copied descriptions are Q-MD2 and are not checked here.

### The arm for G2

The sidecar gate now holds every entry's `$description` equal to its token's own in the tree, in every tier: the expected
text is read off `out/<brand>.tokens.json`, never off the sidecar's generator.

`test.ts`'s #2266 arm pinned `body.xs`'s sidecar `$description` to the owner's words alone, link variants included, so it
held the G2 defect in place. It now expects the tree's text, which keeps Q117 A's link guidance beside the owner's words.

Mutations, on the committed sidecars, each failing the sidecar gate by name: a type style's `$description` replaced
("… is not the token's own"), "PAGE" written into an overlay description ("capitals for emphasis PAGE"), and a role
that does not exist named in prism3's `text.primary` ("prism3 color.text.primary.avoid_when: text.nonexistent-role",
which went unseen before G3).
