## (2026-10-05) — validate_brand runs theme_brand's build path, and tests the empty-breakpoints refusal (#2159)

**STATUS: branch `engine/2159-validate-full-build`.** `ENGINE_VERSION` → **{{ENGINE_VERSION}}** (minor, a change note: `validate_brand`'s behavior changes). No token, name or value moves; `CONTRACT_VERSION` unchanged. **Fixes #2159.**

### What changed

Since #2158, MCP `validate_brand` ran `brandTheme` on a schema-valid input and reported its refusals. Refusals that fire only in `buildTree`, once the modes resolve, still passed it. Measured: an override naming an unknown step or palette builds in `brandTheme` and throws in `buildTree`, with `overrides[light]: unknown step '999' in palette 'neutral' (role 'foreground.brand')` and `overrides[light]: unknown palette 'nope' (role 'foreground.brand')`.

`validate_brand` now runs `buildTree(brandTheme(input))`, the path `theme_brand` runs, and reports what either throws, verbatim. The guard is unchanged: a schema-invalid input never reaches the build.

### The test #2157 and #2158 owed

Both PRs said whichever merged second would add a `validate_brand` arm for #2137's empty-list refusal. Neither did, so it lands here: `layout: { breakpoints: [] }` reports exactly `The brand needs at least one breakpoint, starting at 0px.`

### Tests, in `mcp-test.ts`

59 → 62 passing:
- the empty list (#2137);
- an override naming an unknown step;
- an override naming an unknown palette.

Each expected message is a literal.

### Mutations, each failing by name

- **Remove the build call:** all five refusal arms fail, the #2137 empty-list arm included (`got {"valid":true,"errors":[]}`).
- **Back to `brandTheme` alone:** only the two override arms fail. The `brandTheme` arms stay green, so this isolates what `buildTree` adds.

### Found and filed

**#2162:** `theme_brand` itself returns a `-32603` protocol error for the same unknown-step override, not an `isError` result. `themePayload` catches `brandTheme` but not `buildTree`, though the comment above `callTool` says a generation throw comes back as `isError`. Out of scope here.
