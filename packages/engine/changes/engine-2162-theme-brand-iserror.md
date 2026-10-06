---
engine: minor
---
MCP's generating tools report a build-time refusal as an `isError` result, not a protocol error (#2162).
`theme_brand`, `theme_from_brief`, `export_theme` and `score_consumption` caught `brandTheme` but called
`buildTree` outside any `try`, so a refusal that fires only once the modes resolve (an override naming an
unknown palette or step) escaped `tools/call` as a -32603 internal error, which a client may not hand back to
the model. All four now build through one guarded helper, and a refusal from either step returns
`{ error: 'BrandInput refused by the engine', errors: [<the engine's sentence>] }` with `isError`, the same
shape the schema failure uses. A `brandTheme` refusal used to read `{ error: 'brandTheme failed: <msg>' }`
and now uses that shape too. No token, name or value moves.
