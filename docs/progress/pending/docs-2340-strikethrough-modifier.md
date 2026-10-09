## (2026-10-09) — Strikethrough is a modifier on the existing styles, not a style: the guidance for agents (#2340)

Owner decision Q150 D (2026-10-09): option B now. Prism3 mints no strikethrough text style. A struck run (a was-price,
a zeroed-out line) is the existing style plus a line-through modifier. Option C, a price component that owns the
decoration and its accessible text, is filed as its own issue. The research is on #2340: strikethrough deliberately
does not follow the `-link` precedent, because underline is everywhere and an accessibility requirement, while
strikethrough is one pattern whose meaning no text style can carry.

**The handoff check was done by the owner in Figma:** a strikethrough applied over a styled run (`body/sm/default`)
shows in the dev specs as "Text decoration: Strikethrough", next to the bound family and size variables. So the
modifier survives handoff without a style.

**What changed, docs only:**
- `ai-metadata.ts`: every body and caption composite's entry (body/xs included; the `-link` variants left alone,
  since a struck link is not this pattern) appends one sentence pair. `when_to_use` gives the modifier in code and in
  Figma and the visually hidden text; `avoid_when` says not to look for or mint a strikethrough style. Regenerated
  into the five brands' `.ai.json`; no token, style or value moves, so CONTRACT is unchanged. A change note declares
  the minor bump, because the committed `.ai.json` moves.
- `skills/prism3-consume`: a paragraph after the body/xs one, with the accessible price pattern from the research:
  `<del>` and `<ins>` holding visually hidden "Original price:" and "Sale price:", the hidden words translated, and
  the struck text still held to 4.5:1.

**Why visually hidden text and not `<del>` alone:** most screen readers don't announce `<del>` or `<s>`, so without
the hidden words both prices read as two numbers with nothing saying which is current (MDN; WebAxe's tests, cited on
#2340).
