## (2026-10-08) — Studio QA: Palettes drawn in Light with its mode control held (#2321), the levers fit between the tiers (#1975), and the narrow plugin's bar no longer draws over the error line (#2105)

The UI redesign's last QA batch, part 1 of 2: the layout and bar items. #2262 (a long brand name at the narrow tier)
is held for the owner. The question and three options are on the issue.

### #2321: Palettes, Q111 and PM1 B

**The decisions.** Q111: on Palettes the mode selector is disabled, in the standard disabled look, not hidden. PM1 B:
Palettes is pinned to Light, so the strips' ground and the opacity scale always show Light. The UI lane's check found that
those two are the only things on Palettes that varied by mode.

**What PM1 B means in code, and why it isn't "set the mode to Light."** The first build did that: mounting Palettes called
`setCurrentMode('light')`. `test:chrome` section 9 showed the cost. The Color tab opens on Palettes, so Components → HC
light → Color → Surfaces & fills went through Palettes and arrived in Light, with the chosen mode silently reset. The
shipped reading draws Palettes in Light without touching the chosen mode:
- `preview/palettes.ts` reads its ground and the opacity scale's ink from Light (`PALETTES_MODE`) and no longer repaints on
  `mode`.
- `modeControl` (`shell/preview.ts`) gets `lock(reason, shows)`. Every radio and the select are natively `disabled`, the
  way the levers panel holds a setting in a derived mode (#2284). `shows` (Light) is checked in place of the chosen mode,
  and the reason is the group's and the select's `aria-description` and the control's tooltip.
- `frame.ts` locks it while a page in `LIGHT_PINNED` (Palettes) is mounted, from `syncDerivedReadOnly`, which already runs
  on every mount, release and mode change.

Leaving Palettes, the control is live again and shows the mode chosen before it. This reading is flagged to the owner on
the PR.

**DRAFT copy for the owner:** "Palettes are the same in every mode, so they always show in Light."

**Held for the owner: the look of a held segmented control.** #2284's pattern gives a held native control `disabled`, and a
button takes Prism3's disabled roles for its appearance (X4 A) only when it is `.p3-btn` or `.p3-vpick`. A segmented
option (`.p3-seg-tab`) has no disabled rule, so held mode radios draw as live ones (no hover, `cursor` unchanged). The
derived-mode panel's held choices (Shape's Density, Interactive's Outline hover) already look like this on `main`.
Defining a segmented control's disabled look is a design call. It would change the derived-mode choices too, so it isn't
made here. The question is on #2321.

**Tests.** `test:chrome` section 9 holds the control on Palettes at boot: every radio and the select disabled, Light
checked, the reason typed in the test. Off Palettes it is live with no reason. With HC dark chosen, Palettes holds Light,
and the next page shows HC dark again. Section 11 (S2 SPECIMEN GROUND, reworked as the owner's note asked) chooses each
mode on Brand, opens Palettes, and holds every strip to LIGHT's `background.primary` from the emission. `test:smoke`'s
Palettes loop does the same over the corpus, and its mode agreement marks Light on Palettes. Tests that switched modes on
the opening page now start elsewhere: section 9's behavior arms move to Surfaces & fills, the X4 A derived sweep starts on
Surfaces & fills and leaves Palettes out, HP3 reads Palettes in Light only, `showMode` is a no-op for the mode already
shown, and smoke's #2080 focus case runs on Brand. Q4's "the mode does not move the preview" is retired, because no mode
change happens on Palettes now.

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
- the lock removed (`modes.lock(null, '')`) → `Q111 web light 1280 / color-palettes: on Palettes every mode radio and the
  select are disabled, Light checked, and the control says why …` and `PM1 B … Palettes holds the control on Light` (4).
- Palettes drawn in Dark (`PALETTES_MODE = 'dark'`) → `specimen ground: palettes web light 1280, light chosen on Brand:
  primary-1 is a specimen root on background.primary #ffffff — is #0d0d0e` (every strip).
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
