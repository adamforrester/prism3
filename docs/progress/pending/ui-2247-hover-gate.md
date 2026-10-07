## (2026-10-06) — Chrome: the build fails a `:hover` rule without the Q28 limit, and `.p3-text-input` skips `aria-disabled` (#2247)

**What.** `chrome.css` has said since #2211 that every hover rule carries Q28's limit,
`:where(:not(:disabled, [aria-disabled="true"]))`, so a switched-off control changes nothing under the pointer.
Nothing held that. The #2124 review found two rules that had shipped without it (`.p3-textarea:hover`,
`.p3-btn.p3-tile:hover`, fixed in #2124's merge) and dropping the limit from either still passed `test:chrome` with 0
failures. It also found `.p3-text-input:hover:not(:disabled)`, which skipped `:disabled` but not `aria-disabled`.

- **`[hover]`, a new arm of the chrome build's checks** (`apps/studio/chrome/esbuild-plugin.mjs`, beside `[raw]` and
  `[variables]`). Every `:hover` selector in `chrome.css` must hold `HOVER_LIMIT` as a simple selector of the
  compound it hovers, the same element. It is an arm and not a new gate file: `buildChromeCss` already runs on every
  bundle of `apps/studio/src` (web, plugin, site, Vercel's check), so `build-web` and `build-plugin` fail by name and
  the gate count does not move.
- **`.p3-text-input:hover`** now carries the limit, so an `aria-disabled="true"` field does not answer hover either.
  Its weight drops from (0,3,0) to (0,2,0); no other rule sets a text field's edge but `:disabled`, which hover no
  longer reaches.

**Why it parses, and how it knows it looked.** The oracle is the literal `HOVER_LIMIT`, typed in the plugin, never
read from `chrome.css`. Each rule's prelude is split into its selector list, each selector into compounds at its
combinators, each compound into simple selectors, so a limit on an ancestor (`.a:where(…) .b:hover`) does not
count for the hovered element. Two things keep it from going quiet on an empty set (docs/34 shape 9):
- **By position, not by count:** every `:hover` in the comment-stripped text must lie inside a prelude the walk
  read, or it fails as "a :hover the selector parser did not read".
- **`HOVER_CANARIES`**, run on every build: `chrome.css` today has no nested rule and no hover inside `@media`, so
  it cannot show the parser still reaches them. Ten literal cases, each with the selector a finding must name.

**The exemptions, `HOVER_EXEMPT`,** are full selector texts with reasons, so an exempted rule that changes is no
longer exempt, and an entry that matches no selector fails:
- `.p3-tile:is(:hover, :focus-visible):not([aria-expanded="true"]) > .p3-tile-tip`, a reveal (the tooltip repeats
  the tile's name), not a control state;
- `.p3-colorfield:where(:not(:has(:disabled, [aria-disabled="true"]))):hover`, a wrapper whose control is the input
  inside it, so its limit is the `:has()` form; `test:chrome`'s "color field" kind measures it at run time.

**Mutations,** each on the committed head, each confirmed landed, each restored with `git diff` empty after
(`npm run -w @prism3/studio build`):
- (a) the limit dropped from `.p3-textarea:hover`: `✘ [ERROR] p3:chrome-css [hover] apps/studio/src/chrome.css:121: ".p3-textarea:hover" hovers without the Q28 limit … on the element it hovers`. `build-plugin` fails the same line.
- (b) dropped from `.p3-btn.p3-tile:hover`: `… chrome.css:136: ".p3-btn.p3-tile:hover" hovers without the Q28 limit …`.
- (c) `.p3-text-input:hover:not(:disabled)` restored: `… chrome.css:795: ".p3-text-input:hover:not(:disabled)" hovers without the Q28 limit …`.
- (d) an unexempted reveal, `.p3-tile:is(:hover, :focus-within) > .p3-tile-label`: `… chrome.css:158: ".p3-tile:is(:hover, :focus-within) > .p3-tile-label" hovers without the Q28 limit … (on ".p3-tile:is(:hover, :focus-within)")`.
- Necessity (shape 19): (a) live with only the arm's real scan line removed, the build exits 0. Nothing else catches it.
- The parser's nested reach removed (a `;` no longer ends a prelude): `[hover] self-check: the hover scan no longer flags a hover in a nested rule`.

**Not done, on purpose.** The textarea and tile kinds are not added to `test:chrome`'s `HOVER_KINDS`. A tile's hover
rule paints `transparent` over `transparent`, so the arm's control half ("an enabled tile answers hover") can never
pass. The textarea sits behind the brand menu's Import, which the Q28 tour does not open. The build check reads both
rules as text, which is what the issue found missing; adding a runtime probe would measure nothing a person sees.
