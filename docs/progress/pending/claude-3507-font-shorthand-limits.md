## (2026-11-18) — The tokens README says what a typography style's `font` shorthand leaves out (#3507)

**What.** `@prism3/tokens` writes each `type.*` style as a stock `font` shorthand, which has no place for the DTCG
style's `letterSpacing` (every style) or `textDecoration` (`underline` on every `*-link` style). Owner decision A on
#3507 (2026-11-18): the token CSS stays stock Style Dictionary with no custom transform, and component packages read
both fields from the DTCG tree. `packages/tokens/README.md` now has a section for a CSS-only client: the two fields,
which styles carry them, and the two declarations to write beside the `font` (`letter-spacing` from the role's
custom property, which already ships, times `1em`; `text-decoration-line: underline`).

**Measured.** Over `out/prism3.tokens.json`: all 80 typography styles carry `letterSpacing`; 26 carry
`textDecoration`, every one `underline` and every one a `*-link` name. The two custom property names in the example
(`--pds3-type-label-md-default-link`, `--pds3-core-font-letter-spacing-role-normal`) are read from a fresh
`sd.ship.mjs` build. Docs only: no shipped name, value or emission moves.
