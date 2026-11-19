## (2026-11-19) — Studio copy against the voice standard: one form per fact, no jargon in labels (#4190, #4189, #4191, #4193)

The owner approved every recommendation on #4190 (voice), #4189 (one fact, two forms), #4191 T3/T4 (names in the
pickers and the Components list) and #4193's Studio rows (jargon, idiom, next steps). The lever descriptions (#4193
decision 1, a short tip per lever) are their own PR; the naming rows are #4184's.

### What changed on screen
- **One form per fact.** "Auto · …" in every picker (was "Auto:" in some); a px readout reads "1440px"; the hex field
  shows lowercase, as the tokens are; a font this device lacks is a warning (the warning glyph, text ink) in the
  levers as in the preview; Health says "floor", the setting's word, where it said "minimum".
- **Labels.** "Primary interactive colors" (sentence case); "Show 4 advanced settings" from one `advancedLabel`;
  "What the contrast check counts"; the gradient's "Blend" with "Even (OKLCH)" and "Standard (sRGB)"; progress lines
  in designer words ("Building variants…", "Linking nested sets…"); "Set it in Theme › Shape › Density".
- **Names.** The example brands read by their names ("Prism3", "Aurora") in the start window, the brand menu and the
  replace confirm; the Components list names each set in words ("Code input cell"). Both carry the id as data
  (`data-example`) for what posts and tests.
- **Register.** The start window and Export's note are declarative; idiom is gone ("rides", "is out", "regrows").
- **Next steps** on the saved-brand, upload, Docs-setting and two import errors, and on the axes-change blocker. The two import refusals end on "Fix it in the design.md, then import it again." (DRAFT); a refusal the studio already rewords, the contrast floor's, keeps its own fix.
- **Destructive verbs** name the outcome: "Remove 3 icon colors", "Reset 2 sizes to the scale", "Remove 4 items".

### What the tests caught
The chrome suite read each example's id from its chip's text; with the brand's name on the chip, the floor arm checked
zero prism3 states and failed by name (`#2228 … in 0 prism3 state(s)`). The chips now carry the id as data. The
smoke suite caught the replace confirm still naming "the aurora example" after the pickers said "Aurora".

### Held
- #4193 A row 1 ("Button sets" as the group, cards titled by the set alone) conflicts with #4190 V1's approved
  "Primary interactive colors"; this PR applies #4190 and flags the rest.
- The generated Figma page names in Title Case (#4193 E) come from the component definitions; that is an engine and
  file-taxonomy change, filed as #4338.
