## (2026-11-19) — Code input's cells set lining figures in code (#2814)

**What.** Owner decision A on #2814: the engine sets lining figures on Code input's cells. The cell's `codeOnly`
entry for its figures now reads `font-variant-numeric: tabular-nums lining-nums`. Lining is in the same declaration
as the tabular figures it already set, because a second `font-variant-numeric` would replace the first. The digit's
caption names lining figures too.

**Figma cannot carry it.** The plugin API exposes OpenType features read-only: `openTypeFeatures` is `readonly` on a
text node and on a styled segment, and a text style has none. So neither executor can turn on `lnum`, and the
Figma cell keeps the brand font's default figures (old style for the default title family, 3.1–6.3px off center).
The entry records that. It is a `codeOnly` admission, so it does not ship. The decision's "the engine sets" is
honored where the engine can reach today, which is the code spec.

**Held for the owner (on #2814).** The decision named the cell, not the means, so two calls are open:
1. **The shipped rule.** Once `docs.implementation` lands (#2778, PR #4099), should the cell also carry a shipped
   line ("Set `font-variant-numeric: tabular-nums lining-nums` on the digit")? Recommendation: yes, as a follow-up
   once #4099 merges. It isn't built here so this PR doesn't depend on an unmerged branch.
2. **Figma.** Since no executor can set the feature, the Figma cell stays off center on a font whose default
   figures are old style. Options: accept it; pick a title font with lining defaults at the brand input; or, where
   the host lets a designer set it, add a hand step to the file guide. Recommendation: accept it, and note it in
   the cell's Figma description only if the owner wants designers told.

**Measured.** A new `test.ts` #2814 block. On main both arms fail (the declaration reads `tabular-nums`, and the
caption names tabular figures only). On the branch both pass. Mutation: setting the declaration back to
`tabular-nums` alone fails "#2814 code-input-cell: one codeOnly entry sets font-variant-numeric to tabular and
lining figures together…" by name.
