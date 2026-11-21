## (2026-11-19) — A brand anchor takes a hex color, and the schema's messages say what to send (#4133, #4176)

Three findings from the overnight audit (#4104), one root cause: the brand input's first contact with an author
or agent, the anchor color and the validator's reply, asked for OKLCH and said only where the input was wrong.

- **#4133 A, hex anchors.** `$defs.colorAnchor` is a `oneOf` of the OKLCH object and a new `$defs.hexColor`
  (`#rrggbb`, `#rgb`, `#rrggbbaa` or `#rgba`), at the three anchor sites: `primary`, `neutral.anchor`, `brandColors[].oklch`.
  `hex-anchors.ts` converts at the top of `brandTheme`, before `resolveVocabulary`, the same narrowing pattern
  the named stops use (`BrandInputAuthored` widens the three fields; `BrandInput` stays OKLCH, so nothing past
  that line sees a string). The conversion is the classifier's, `storedOklch(rgbToOklch(hexToRgb()))`, so a
  hue-less gray stores hue 0 as #2280 decided. It lives in its own pure module because `brandTheme` reaches the
  plugin bundle, which carries no `node:` import. **8- and 4-digit hex (owner decision B, 2026-11-20):** the alpha
  is dropped, as the standard dialect's `hexToRgb` drops it, because an anchor is opaque. `#2f6b4fcc` builds the
  anchor `#2f6b4f` builds; `test.ts` pins both forms to literal OKLCH, keeps the schema's pattern and `HEX_ANCHOR`
  agreeing on 18 spellings, and refuses a 5- or 7-digit hex.
- **#4176 b, `oklch.ts <hex>`.** A command-line wrapper over the same conversion, listed in the agent reference.
  `prism3-theme` step 1 names it, and says the hex is accepted too. Its printed precision (`n4`, `n2`, the notes'
  precision) is checked to convert back to the same hex over a sweep of 586 colors.
- **#4133 / #4200 A, messages.** `emit-dtcg.ts`'s validator is the one generator behind the CLI and four MCP
  tools. Every message now reads "X is …; it takes …": a `oneOf` reports the branch the value has the type of
  (so `primary.l: 2` reaches the reader as "primary.l is 2; it takes a number from 0 to 1", not "matches none of
  oneOf"), or lists every branch; `title` annotations on `oklch`, `hexColor`, `id`, `root` and `brandColors[].name`
  replace raw regexes; an unknown key or enum value within a small edit distance gets "did you mean". All DRAFT.

Trap: the validator's wording is pinned by four arms elsewhere (#3698 R2's breakpoint floor in `test.ts` and
`mcp-test.ts`, #3707's empty `typography.links`, export_theme's missing-`id`), updated here to the new words. A
gate that pins validator prose has to move with it; none of them pins anything but the wording. Two gates moved
too: `lint-lever-sweep`'s `REFUSALS` hold the same validator lines, and `lint-voice` gained the hex-anchor note as a
producer with a sweep input. Its issue-number rule now needs a word boundary after the digits (`#\d+\b`), because the
note names a hex like `#2f6b4f`; a self-check sample pins that, and dropping the `\b` fails it by name.

Not in this PR: the rest of #4200 (the CLI's own lines, MCP's error headers, `score_consumption`, tool
descriptions), which goes in its own PR.
