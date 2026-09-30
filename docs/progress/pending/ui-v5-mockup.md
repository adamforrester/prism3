## (2026-09-30) — UI redesign: concept v5 mockup (the owner's v4 review and style tile A applied)

**STATUS: PR open from `ui/v5-mockup`, labeled DO NOT MERGE, for the owner to review.** Design artifacts only, all under `docs/superpowers/ui-redesign/`. No engine change and no emitted artifact moves, so no ENGINE bump and `CONTRACT_VERSION` is unchanged. This entry supersedes the v4 and style-tile entries (`ui-v4-mockup.md`, `ui-style-tiles.md`), which are left as they are.

**What landed.**
- `concept-v5.html`, built by `build-v5.mjs` from `concept-v5.src.html`, the default theme's tokens and the real engine (the v4 entry, unchanged).
- `audit-v5.mjs`: the rendered audit, the F1, F2 and F3 behavior checks, and a rendered coverage recount.
- `chrome-tokens.mjs`: the chrome token resolver, extracted from `style-tiles/build-tiles.mjs` so the tile and v5 share it. The tile rebuilds byte-identical.
- `concept-v5.md`: each change traced to its decision ID, what is live and what is simulated, the measured numbers, and nine open questions.
- The branch also merges the tile review's fixes (`origin/ui/style-tiles`, "review fixes").

**Diagnosis: where F1 really lives.** v4's "follow the lever" put the view decision in every lever row. F1 moves it to the section, so it became data: each section in `HOMES` names one home view, and the build fails when one is missing or doubled. `JSON.parse` keeps the last of two keys silently, so "exactly one" is also checked in the raw text. With the view carried by the section, the hand-picked view select had nothing left to do, and it went. The header now names the view and the section it follows.

**Diagnosis: chrome from tokens is a build rule, not a style.** v4 had about 470 lines of hand-written chrome CSS. v5's chrome block may hold no raw hex, color function, length, duration or shadow, as the tile's may not. Container queries need a raw length, so the script sets `data-w` on the app, the levers and the preview from one `BREAKS` constant, and the CSS keys off that. Widths the token set lacks (dialog, menu, matrix height, measure) are named layout constants in the generated block, as the tile's harness geometry was (T3 (7)). The brand's specimen is exempt, in its own `preview-css` block. The build fails if a selector there does not start with `[data-content]`, so the exemption cannot reach the chrome.

**Tradeoffs made on purpose.**
- **At 380 an operation start shows the strip, not the sheet.** A failure or warning opens the sheet. A full-pane sheet on every start would hide the work at the one width where it has no room. This is open question 5.
- **Health moved to the top of Inspect › Contrast**, because the verdict now opens Inspect (decision 8, F1).
- **The chrome faces are embedded under chrome-only names** (`P3 Chrome UI`, `P3 Chrome Mono`). Under their own names, a brand that uses Inter would have read as installed on every device.
- **The tile's `ratio()` contract was adopted in the shared module.** It returns a number or `{ refused }`, so the tile's mutation messages did not change when the merge moved it.

**Tried and discarded.**
- A tinted column for the previewed mode in the Roles matrix. It read as heavy beside the chrome, so it became a tab-style underline on the header cell.
- The agent notice on an inset card. Only errors are inset now, as in tile A.
- A native checkbox with `accent-color`. It drew a black block off the tile bar. Checkboxes and radios now follow the chip pattern.

**Traps for whoever re-verifies this.**
- **`scrollIntoView` scrolls `overflow: hidden` ancestors.** The frame is one, so the whole app slid under its own top bar. The frame is now `overflow: clip`, and the page scrolls only its own scrollers (`scrollWithin`).
- **Measure after the fonts load.** The tab-overflow cue measured before the embedded Inter loaded, while the fallback was wider, and stayed on. It now re-measures on `document.fonts.ready`.
- **A chrome class in the specimen markup inherits chrome rules.** `.field` and `.card` did. No gate checks this.
- **The audit's screenshots must come before the focus-ring pass.** The pass tabs through the page, moves the levers and changes the view.
- **A literal floor can catch a state that changed.** The 380 floors were first set while the Inspect state wrongly showed the Settings pane. When that bug was fixed, the floor failed by name (12 Tab stops against 20). The 380 floors were then set from the real smallest state. That is the floor doing its job, not drift.
- **A mutation that crashes mid-run leaves its edit in place.** One did, in this battery, before its restore step ran. The next mutation then ran on top of it. Everything was committed first, so `git checkout` recovered it with nothing lost. Commit before every mutation (`CLAUDE.md`).
