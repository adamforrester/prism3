## (2026-11-19) — The design.md reader stops dropping prototype keys, control characters and headline faces (#4119, #4213, #4137)

Three silent drops in the design.md front door, grouped because each one loses something the author wrote
without a word. The CLI, the MCP server, the studio and the plugin all read through this parser.

- **#4119.** `o[key] = …` with `__proto__` runs the prototype setter, so the values under it vanished from
  `Object.keys`, the schema and the output. `parseYamlSubset` now refuses `__proto__`, `constructor` and
  `prototype` in block and flow maps, naming the key and line, the way L-08 refuses a duplicate key. Refusing was
  chosen over `Object.create(null)` because the parser's rule is fail-loud.
- **#4213.** `bareOk` let a control character through, so `toDesignMd` wrote a newline raw and the next line
  broke the frontmatter. `dq` now escapes C0 controls and DEL (`\n`, `\r`, `\t`, else `\uXXXX`), and `unquote`
  decodes them. Trap found on the way: both key readers trimmed AFTER unquoting, so a quoted key lost a trailing
  newline. `unquote` already trims the raw text, so the second trim went. This chose escaping over refusing
  control characters at the schema, which would have been a contract change.
- **#4137.** `deriveFamilies` reads a heading face from `headline`, `heading` and `h1`–`h6` too. A typography
  token whose face no category reads (a mono `code` face, say) is named in `xWarnings`, the channel #2678 opened.
  The CLI prints it as a `⚠` line. A face that is read under any name is not named. Wording is DRAFT.

**Tests:** `test.ts` arms `#4119` (end of the parser section), `#4137` (end of the dialect section) and `#4213`
(end of the #3876 round-trip block). Each fails on `main` and passes here. Each fix was mutated and failed its
arms by name.

**Found, not fixed:** in `test.ts`, about 400 lines of arms sit after the `report` line, so the summary count
excludes them. A failure there prints under `0 failed`, though the exit status is still 1. Filed separately.
