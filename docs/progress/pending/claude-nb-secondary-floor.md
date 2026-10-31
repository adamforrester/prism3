## (2026-10-31) — The reference brand's secondary text, fitted on the page (Q-TXT1 A)

The owner took Q-TXT1 A: lighten the reference brand's `color.text.secondary` to the 4.5:1 body floor measured on
white (`background.primary`), at about 4.6:1. The brand's designs use a lighter gray for placeholders and secondary
copy; their #999 fails at 2.85:1, so the goal is the lightest secondary that still passes on the field's own ground.
Placeholders stay on `text.secondary`, `text.tertiary` stays at 3:1, and the owner accepted that secondary no longer
clears 4.5:1 on `background.secondary` in this brand.

- **Where the fit lived.** `buildContent` in `modes.ts` fitted `secondary` on `g.floor`, the same ground as tertiary,
  the status inks and the links. `floorStep` moves that floor for all of them, so it was not the right input: the
  decision moves one ink. A new per-brand input, `secondaryTextGround: floor | page` (enum-validated, in
  `theme-schema.json`), gives the page context a separate ground for the secondary ink. The inverse band keeps its
  floor. The reference brand's legacy fixture sets `page`; no other brand sets it, and none moved.
- **What moved.** Light: neutral.550 #636A6F (5.49:1 on white) → neutral.500 #70767C (4.59:1). The next lighter step,
  450, is 3.84:1. Dark keeps 450 (5.06:1 on its page): 500 would be 4.23:1. High contrast does not move: the page fit
  applies in light and dark only (owner Q3212.3 B), so hc-light keeps 700 and hc-dark 300, byte-identical to main. `icon.secondary` moves with the
  text, since the brand's `iconContrast` is `text` (#352: icons beside text match it).
- **What it costs, measured.** Light secondary is 3.78:1 on `background.secondary` and on the brand's card
  (`foreground.primary`, the same neutral.050), and 4.29:1 on #F7F7F7. The role description now reads "4.5:1 on
  background.primary", and `nb.ai.json` contracts it there and lists `background.secondary` and `foreground.primary`
  under "Below 4.5:1". Both follow from the measured `against`; nothing was hand-written.
- **Gates.** New `Q-TXT1 A` arms in `test.ts`: the reference brand's secondary is the lightest neutral step clearing
  the body bar on `background.primary` in every mode, 4.5–4.8:1 on white in light, icon equal to text; `nb.ai.json`
  is contracted on the page; a literal origin/main snapshot pins every other brand's secondary inks (41 cells). The
  owner's band of 4.5–4.8 "in every mode" cannot hold literally: dark has no step between 5.06 and 4.23. The arm pins
  "lightest passing step" in light and dark, the band in light only (Q3212.2 A), and HC as main's literal hex. Updated arms: the legacy fixture
  comparison records the two light moves as known divergences; the Q689 floor sweep promises a page-fitted secondary on the
  page only; #63 declares exactly one preview shortfall (light "body on card"); the #3049 dialog sweep skips
  `text.secondary` on a panel darker than the page for a page-fitted brand.
- **Review fixes (owner Q3212.1–8).** HC keeps its floor fit (Q3212.3 B). The `prism3-consume` skill names the
  `secondaryTextGround` exception where the floor promise is stated, and says to read `sits_on` (B1, Q3212.8 A).
  Divider's 1.4.3 line now reads "clears 4.5:1 on the page backgrounds its color's metadata lists", and the #3051
  arm covers the reference brand with one declared cell, light `background.secondary` (B2, Q3212.6 A). Doc 06 names
  the exception (S1). `levers.ts` says why it is not a lever (Q3212.7 A). Follow-ups filed for the redesign seed
  (Q3212.4 A, #3219) and `field.placeholder` (Q3212.5 A, #3220); the decision itself is recorded in #3221.
- **Held for the owner (resolved on the PR: Q3212.1 A, Q3212.4 A, Q3212.5 A).** (1) The card: secondary body copy on this brand's card is 3.78:1 in light. (2) The redesign
  seed (`nb-redesign.design.md`) does not set the input, so its secondary stays #696869 (4.57:1 on its floor); setting
  it there is one line. (3) `field.placeholder` keeps its floor fit at #636A6F. The text field and select defs bind
  `text.secondary` for the placeholder, so the components move; Studio's fields style-guide section still draws
  `field.placeholder`, so it shows the old gray.
