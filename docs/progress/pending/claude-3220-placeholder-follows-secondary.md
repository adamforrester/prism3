## (2026-11-01) — One placeholder ink: `field.placeholder` takes `text.secondary`'s fit (Q3212.5 A, #3220)

With `secondaryTextGround: page` (#3212) the reference brand's `text.secondary` moved to `neutral.500` in light, but
`color.field.placeholder` kept its own fit at `neutral.550`. The field hosts bind `text.secondary` for the
placeholder, and Studio's Fields section draws `field.placeholder`: two placeholder inks. The owner took Q3212.5 A.

- **Chosen: the same fit, not an alias.** `field.placeholder` is picked by `pickMinPass(textCands, pageSecondary.rgb,
  cfg.secondaryMin)`, the exact call `text.secondary` makes. `pageSecondary` is hoisted above it in `modes.ts`, so one
  ground decides both. Why not alias `text.secondary`: the engine emits every semantic color as an alias of a
  palette step, never of another semantic role. A role-to-role alias would be a new emission shape for consumers,
  Style Dictionary and the Figma writer to handle. The same fit keeps the shape, the name and the guaranteed surface,
  and `token-contract --check` passes unchanged.
- **It moved more than the issue expected.** Main's HC already disagreed in **every** brand. `text.secondary` fits
  the HC floor (`neutral.050`/`.900`), but the placeholder was fitted on `background.secondary`, which is white/black
  in HC. So each brand's HC placeholder now steps one darker, to `text.secondary`'s value (prism3 hc-light `650` →
  `700`, hc-dark `350` → `300`). The components already drew that ink, so no component moves. Only the token, its
  `.ai.json` and the style guide do. Light and dark move only for the reference brand.
- **Metadata follows.** In the reference brand, `field.placeholder` is now contracted on `background.primary` (4.59:1)
  and its `sits_on` narrows to it. Its description names the shared ink there, and a floor brand keeps the old wording.
- **Arms that encoded the old fit, updated as fallout.** The `field(#1341)` arm's placeholder check now asserts
  `text.secondary`'s ink and ground. The `#63` light declaration adds `placeholder on field`, the same Q-TXT1 A
  shortfall as `body on card` (one ink, the same `neutral.050`). The `#3049` raised-surface sweep extends its
  page-fit exemption to `field.placeholder`.
- **Gates.** A new engine arm, `Q3212.5 A: field.placeholder resolves to text.secondary …`. It covers page and inverse
  pairs, every mode, over the reference brand and the redesign seed (`page`, the seed since #3219) and the corpus and
  prism3 (`floor`), and both grounds must be represented. On the seed, the placeholder moves with `text.secondary` to
  `neutral.500` in light, and its light preview shortfalls are the same pair the reference brand declares (`body on
  card`, `placeholder on field`, both 3.78:1). `body on card` is the consequence #3219 accepted; the placeholder is the
  same ink on the same ground, so it is that shortfall, not a new one. No gate pins the seed's preview shortfalls. A Studio smoke arm checks that the Fields section's placeholder is drawn in
  `text.secondary`'s emitted value, page and inverse. Mutation: restore the placeholder's own ground (`asGround('background.secondary',
  cfg.bg.secondary.rgb)`), and the engine arm fails by name.
