## (2026-11-19) — MCP results cost less to read: compact text, one size statement, list_levers summary (#4150, #4147)

Two findings from the consumer-agent audit (#4104), both about what an agent pays to read the MCP server's results.

### #4150: compact text, one size per section

`structured()` wrote its text copy with `JSON.stringify(obj, null, 2)` beside the same object as `structuredContent`. The indentation added about half again, so `theme_brand` with tokens and aiMetadata came to 2.7 MB. The text copy is now compact, and the result is about 2.0 MB. Both copies stay, because the spec asks for the text block for clients that do not read structured content; dropping the duplication would break those clients.

The size of the same sections was stated four ways (890,000 in two descriptions, ~850KB/~500KB in the hint, ~1,350,000 in two comments, "close to a megabyte" in the README). Compacting moved the numbers anyway, so every statement now names the compact figures: tokens about 440,000 characters, aiMetadata about 560,000. A new `mcp-test.ts` arm reads each statement (both descriptions, the hint, the README) over the real transport and holds it to within 15% of the measured section. The figures are literal in each place, not one constant: the gate measures each statement separately, so a constant would only move the duplication into the gate's expected side.

`export_theme`'s description keeps its phrase ("the DTCG tree alone is roughly … characters"), with the compact figure. #4288 rewrites the rest of that description, so whichever lands second resolves one number.

### #4147: list_levers {summary: true}

The full catalog was 43,000 characters of text, and the descriptions say to call `list_levers` first. `summary: true` returns one entry per lever (key, group, control, and only the fields it has: required, option values, min/max, named stops, default, deprecated), the non-lever fields and the required fields by key, with no labels or descriptions: 6,700 characters of text. `describe` still returns the prose. The arm holds it under 8,000 and checks that it names every lever and non-lever field the full catalog names, so a lever cannot drop out of the summary.

Not done here: moving `theme_brand`'s inline brand schema to a compacted form or a resource (the issue's second bullet). The issue itself calls that a trade-off against client-side validation to measure first; `tools/list` is 50,700 characters, inside `test.ts`'s 55,000 headroom gate.

### Mutations, each failing by name

- `structured()` back to `JSON.stringify(obj, null, 2)` → `#4150: a structured result's text copy is its structuredContent, compact` fails (and the existing test.ts ±15% arm, which measures the text copy).
- the hint back to "~850KB" → `#4150: every stated payload size is within 15% of the measured one` fails, naming the hint.
- the `summary` branch dropped → both `#4147` arms fail.
