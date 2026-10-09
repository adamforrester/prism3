## (2026-10-08) — Studio QA: the levers fit between the tiers (#1975), and the narrow plugin's bar no longer draws over the error line (#2105)

The UI redesign's last QA batch, part 1 of 2: the layout and bar items. #2262 (a long brand name at the narrow tier)
was held for the owner, who has since chosen #2262 A; it is recorded on the issue for whichever lane builds it.

**#2321 is not in this PR (owner DUP1 A, 2026-10-09).** This branch first carried its own build of #2321 (Palettes drawn
in Light, its mode control held). The UI lane's #2387 built the same thing with the owner-approved copy, the approved
held-segment look and the previous mode restored on leaving, and landed first. So this PR dropped its #2321 part when it
merged `main`: its `preview/palettes.ts` and `modeControl().lock` changes, `frame.ts`'s `LIGHT_PINNED` lock and DRAFT
reason line, its `test:chrome` arms (sections 9, 11, the Q4 trial, X4 A, HP3, #1984 and `showMode`) and its `test:smoke`
arms. Each of those files takes #2387's version. What remains is #1975 and #2105, whose screenshots the owner approved
(2026-10-09).

### #1975: the levers between the tiers

**The defect, measured.** At 800 and 640 the levers column is 42% of the window (335 and 268px), narrower than the 380 the
pages were laid out for. The Color sub-nav ran under the preview (Interactive was hit-tested under the preview at both
widths). The levers' `scrollWidth` exceeded the pane on six pages (fills 454 against 268). At 380, Surfaces & fills
overflowed too (454 against 379, the issue's second comment).

**Causes and fixes** (`chrome.css`):
- The levers body, a card, a lever and the panel's inner grids had no columns of their own. An implicit grid column
  sizes to its widest child's content, so one long token name widened the whole panel. Each now has one
  `minmax(0, 1fr)` column, and a step picker may shrink and cut its words, since its label already ellipsizes.
- The sub-nav took no `min-width: 0` in its grid cell and its segments couldn't wrap. Now it keeps to its column and a
  segment that doesn't fit wraps.
- Segmented choices wrap rows (Interactive's and Components' did already; those two rules are folded into one). Each
  option is `min-width: fit-content`, so the rows wrap where they did, and one label longer than the row ("Strong (bold
  near-black/white)") wraps inside its option.
- `.p3-fieldgrid`'s minimum is capped at 100%, and the "way to" links wrap.
- A width class on the pane: `data-fit="snug"` below `LEVERS_SNUG_MAX` (360), set by a ResizeObserver in `frame.ts`,
  because the stylesheet may hold no raw length and a container query needs one. In a snug pane a row's picker moves
  under its name, a breakpoint's Remove under its field, and a long readout wraps. The panel and its cards take
  space-200 at the sides instead of space-300.

**The trap the last bullet fixes.** With everything fitting, `test:chrome`'s v5 answer 4 failed at 640: Brand name and
Token namespace, side by side, came out 77px each against its 80px floor. On `main` they measured 88 and 105, but only
because the card overflowed into the pane's padding (namespace's right edge at 258 of 268). `scrollWidth` doesn't count
that, so the overflow was invisible to the issue's own measure. The snug insets give them back their room.

**Test:** `test:chrome` section 37, both hosts at 640 and 380 and the web at 800. Each Color sub-tab is hit-tested at its
center (the element there is the tab) and then clicked by pointer, and each moved page, every Show advanced open, holds
`scrollWidth ≤ clientWidth`.

### #2105: the plugin at 380 × 420

**Cause.** In the panes grid the bar's row was `auto`. When the window is too short for every row, an `auto` row gives way
to its item's own `min-height`, which for the bar is one row (36px). So a bar on three rows overflowed its row and drew
over the notices under it. Separately, a refused restore's line ran 270px and took every remaining pixel from the levers
pane (0px).

**Fix.** The bar's row is `max-content` (both tiers), and at the narrow tier the error line stops at two bar heights and
scrolls inside itself. Whether a long line clamps or scrolls was left to the UI lane. It scrolls, so every word stays
reachable.

**Test:** `test:chrome` section 37, the plugin at 380 × 420 in both Figma themes with the refused `#1989` brand. The bar
must end at or above the line's top, the line must scroll, and the levers pane must keep at least 40px.

### Mutations

Each one was run after a `wip:` commit, on rebuilt bundles, and failed by name:
- the sub-nav's `min-width: 0` and wrap removed → `#1975 web light 640: interactive (color-sub-interactive) takes a pointer
  at its center — is under another element at its center, …` (800 and 640, both hosts).
- the segmented choices' wrap removed → `#1975 web light 640: the levers fit their pane on every moved page (9 read) —
  color-palettes scrollWidth 405 > clientWidth 268 | …` (5).
- the bar's row back to `auto` → `#2105 figma light 380 × 300: the bar ends at or above the error line … (the bar's lowest
  control ends at 114, line top 63)`.
- the narrow error line's cap removed → `#2105 figma light 380 × 420: the error line scrolls …` and `… the levers pane keeps
  40px or more under the error line (0)` (4).

**Two first tries that proved nothing, kept as traps.** The bar's row reverted to `auto` passed at 380 × 420: once the line
is capped there is room for the bar's three rows, so `max-content` only matters on a shorter window, hence the 380 × 300
case. The bar's own box also passed there, because a grid item is sized to its row, so a row that gave way still reads as
"above" the line. The check reads the bar's lowest drawn control instead. Removing the levers body's own `minmax(0, 1fr)`
column passed too: the inner grids carry the fit now, so that rule is a backstop, not the fix. The snug pane's fill-row
layout (picker under its name) also isn't held by `scrollWidth`, since a squeezed picker fits as well. It is a legibility
call, shown in the screenshots, not a fit.

### Also filed

#2383: at 640 the preview header's mode select draws no mode name. Present on `main` and outside this PR's columns.
