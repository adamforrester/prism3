---
engine: minor
---
MCP's `score_consumption` refuses a malformed `refs` item or `pairs` entry as an `isError` result, not a
protocol error (#2209). `pairs: [null]`, a pair missing `fg` or `bg`, and `refs: [null]` each threw past
#2162's guard and escaped `tools/call` as a -32603 internal error. Each is now checked before the build and
returns `{ error: 'score_consumption input failed validation', errors: [...] }`, one sentence per bad entry
naming its index and what is wrong. A pair `kind` outside text, large-text and ui, which was scored silently
at the 4.5:1 text floor, is refused the same way. No token, name or value moves.
