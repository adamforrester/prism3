## (2026-11-19) — Every MCP tool holds its declared argument and output contracts (#4122, #4151)

The MCP tools declared more than they enforced. Both fixes close the same gap.

- **#4122.** All six input schemas say `additionalProperties: false`, and `include` is an enum, but only
  `export_theme` checked either. `theme_brand {include: ["tokenz"]}` returned a smaller answer with no error.
  `callTool` now runs one `argumentErrors` check before dispatch. It is read from the declared input schemas, so a
  new argument needs no second list. It reports unknown keys, unknown `include` values, and a present `include`
  that is not an array (review of #4277: `include: "tokens"` or `null` fell through to the default sections, and
  made `export_theme` throw `want.filter is not a function`, #4281), by name. The one named exception
  is a call with no `brand` key to a tool that requires one (#4120): `theme_brand` and `validate_brand` read it as a
  bare BrandInput for one release, whose keys are the schema validator's to judge, and `export_theme` and
  `score_consumption` name the missing `brand`. (Widened from `theme_brand` alone when #4288 landed both.)
- **#4151.** `theme_brand` and `theme_from_brief` returned `structuredContent` but declared no `outputSchema`, so
  `docs/public/reference/commands.json` said they returned none. Both now declare an open schema (no
  `additionalProperties: false`, so a later field does not break older clients), and the reference is regenerated.

**Tests:** `mcp-test.ts`, over real stdio. The `#4122` arms cover one undeclared argument per tool, plus the
bare-BrandInput and empty-include controls, and four non-array `include` calls (`export_theme` among them). The `#4151` arm calls every tool from `tools/list` with a sample input,
and requires each structured result to meet its declared schema. The sample table must cover every listed tool,
and the validator is written in the suite, not imported. On `main`: 8 failed (12 with the non-array arms). With the fix: 103 passed. Mutations
(the check turned off, theme_brand's schema dropped) fail the arms by name.

**Order with #4258:** whichever of the two lands second adds `dialect`, `classification`, `xApplied` and `xWarnings`
to `theme_from_brief`'s output schema, and re-cites the guide lines both PRs move.
