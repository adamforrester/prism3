## (2026-11-19) — Every lever gets a one-line tip of at most 90 characters; the full description stays for agents (#4193 decision 1)

The owner chose #4193's option (a): split each lever into a short `tip`, shown in the UI, and the long `description`,
kept for the manifest and MCP. 54 of the 65 levers had a description over the voice standard's 90 characters (§4); the
longest, Outline hover, ran to 574.

### What changed
- `Lever.tip?` in `levers.ts`, present exactly where the description is over 90 characters, and emitted into
  `schema/lever-manifest.json` beside the description. The owner approved the tips on 2026-11-20, and chose Outline
  hover's to name its four options: "How outline and text controls show hover: a neutral wash, a tinted wash, a fill,
  or none." A `test.ts` arm holds that tip to the owner's line.
- Studio's `leverBlock` shows `tip ?? description`; search still reads the full description. The 22 Studio tooltips
  over 90 characters are shortened: the eight that restate a lever take its tip word for word, the rest are DRAFT.
- #4193 B and C rows in `levers.ts`: "Neutral chroma" → "Neutral tint strength"; the display ceiling options read
  "display sm (1 step)"; "8px (adds caption xs, for fine print only)"; the brand-color item hint drops "+ OKLCH"; Strict
  interactive contrast drops "guaranteed legibility", and Reduced contrast floor drops the third-party names.
- #4193's B row for Shadow softness (review on #4367): the description is the issue's accepted line, "How soft every
  shadow is: low keeps edges crisp, high blurs them wider than they're offset." At 91 characters it takes a DRAFT tip.

### The rule, now gated
`test.ts` reads the emitted manifest: every lever's UI line is at most 90 characters, and a lever has a tip exactly
when its description runs past 90. `test-lever-tips.ts` holds every Studio ⓘ literal in `src/domains` to the same 90,
and each restated tooltip to its lever's tip, whichever quote the literal uses. `test.ts` also fails a lever text that
says a four-word clause twice back to back, the slip the review found in Strict interactive contrast.
