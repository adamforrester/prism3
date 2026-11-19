## (2026-11-19) — The token projection and CSS carry each typeface's fallback stack (#4155)

Found in the 2026-11-19 token output audit (#4104). The shipped `@prism3/tokens` CSS wrote each typeface as one
name, `--pds3-core-font-typeface-inter: Inter;`, with no generic family. If Inter failed to load, body text and code
both fell back to the browser default, usually a serif. The engine already curates a stack per face
(`$extensions.prism3.fallbackStack`, since #105.3), but the handoff strips `$extensions` (#2552). #105.3 expected a
consumer transform to reassemble `[$value, ...fallbackStack]`, and the shippable build (#3408 S1) came later under
NO CUSTOM CODE, so nothing did.

The fix is in `projectLeaf` (`packages/engine/emit-dtcg-overlay.ts`): a `fontFamily` leaf with a string `$value` and
a non-empty `fallbackStack` is projected as the DTCG 2025.10 §8.3 array, primary first. Stock Style Dictionary's `css`
group writes it as a comma list (`Inter, system-ui, …, sans-serif`), so `packages/tokens` needs no change. The
canonical tree keeps the single family, so the Figma and TokenPress round trip that #105.3 protected doesn't move.
Only the five `<brand>.base.tokens.json` files change. Typefaces don't vary by mode, so no overlay changes.

Tests: a `test.ts` arm at the end of the #609 projection section, and a `[FALLBACK]` arm in `check-package.mjs`.
Each checks that every typeface ends in a CSS generic family, from its own transcription of the CSS Fonts 4 list.
On main both fail by name, for example `#4155: the projection's typeface \`inter\` … (got "Inter")` and
`[FALLBACK] every typeface in \`:root\` ends in a CSS generic family (0/3)`. `check-package`'s [VALUE] oracle now
expects `[$value, ...fallbackStack]` for a `fontFamily` leaf, read from the canonical tree, which the build doesn't
read. Mutation: the projection drops the stack's last entry. Both arms fail by name, and [VALUE] names
`--pds3-core-font-typeface-jetbrains-mono`.
