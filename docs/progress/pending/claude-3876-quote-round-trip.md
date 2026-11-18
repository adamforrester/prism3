## (2026-11-18) — A quote in a brand name survives the design.md round trip (#3876)

**What.** `design-md.ts` wrote a double quote inside a double-quoted scalar as `\"`, and `unquote` stripped the outer
quotes without decoding it, so `The "Blue" brand` came back as `The \"Blue\" brand`, then with three backslashes, then
seven. The imported brand also read as edited against the one exported. Three scanners (`stripComment`, `colonSplit`
and the flow parser's `scanBare`) toggled their quote state on every `"`, escaped or not; the serializer's own output
parsed only because its escapes came in pairs. And `serValue` wrote a non-bare key in quotes with no escaping at all.

**The fix, option (b) of the issue.** Keep `\"` and make both sides agree: `unquote` decodes `\"` and `\\` in a
double-quoted scalar and keeps any other backslash as written; the serializer escapes a backslash before a quote, for
values and keys alike (one `dq` helper), so a name ending in a backslash round-trips too; the three scanners step over
the character after a backslash inside double quotes. Chosen over (a), single-quoted output, because it changes
nothing the serializer writes for a string with no quote or backslash, and it is the YAML rule a hand-written brief
already follows. The standard dialect reads through the same `parseYamlSubset`, so a `\"` there now decodes too.

**Measured.** `test.ts` #3876 adds the inputs the round-trip gate lacked: five names holding `"`, `'`, `\`, `#` and
`:`, each as a name, a free-text value (a typeface family) and a key, through three round trips; a trailing comment
after an escaped quote; and a block key holding an escaped quote and a colon. On main's `design-md.ts`, 6 arms fail;
with the fix all pass. Mutations, each failing by name: `unquote`'s decoding removed (six arms: every name with a quote, the comment and the key), `stripComment`'s
escape step removed ("a trailing comment after an escaped quote is stripped"), `colonSplit`'s removed ("a block key
holding an escaped quote and a colon splits at its own colon"). Every committed artifact regenerates unchanged.
