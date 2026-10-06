## (2026-10-06) — Build style guides: the page takes the heading rule and joins test:chrome section 30 (#2215)

**Status:** `apps/studio/src/chrome.css` (the page's heading rules only) and `test:chrome` section 30. No ENGINE bump (no
emitted artifact moves). CONTRACT unchanged. No copy changed. Visible only in the plugin: the web host has no Build style
guides page. Closes #2215.

### What changed

Heading pass 1 (#2210) left #2171's page alone. It now maps onto the three levels, with existing chrome tokens only.

- **The page title** (`.p3-sg-title`, "Build style guides", 20 / `fw-strong`) stays a page title. #2210 never restyled a
  page title: the levers pages have none in the pane the rule measures, and the preview's title and the dialogs' titles
  sit outside the rule. The sweep reaches this one, so it is the first entry in `HEADING_EXEMPT`, with its reason.
- **L1, the card titles** (`.p3-sg-sec-title`: What to draw, Options) already had L1's type. Their content now starts
  `space-300` after them (it was the card's `space-200` gap). A margin on the title does it, so the untitled Draw card
  keeps its `space-200`.
- **L2, the option group titles** (`.p3-sg-ogroup-title`: All tables, Color, Spacing and size, Font variables, Text
  styles) move from 12 / `fw-default` in secondary ink to `fs-14` / `fw-strong` / `lh-compact` in primary ink. The
  group's gap already gave `space-150` to the first lever.
- **L3, the lever names inside a group** (`.p3-sg-lever-name`; the owner's decision SH1 A, 2026-10-06, applying held
  decision 7: a lever inside a group reads as a field). They keep `fw-emphasis` and take `fs-14`, `lh-compact` (it was
  `lh-normal`, 21px) and primary ink. What follows the lever's first row (a wide lever's control, or the lever's own
  hint under a name and its control) starts `space-050` after it: the lever's row gap, unchanged.
- **L3, the field names** on What to draw (Collection, Mode, the Kinds legend; accepted with SH1 A). They had L3's type.
  Their control now starts `space-050` after them: `.p3-sg-field`'s gap moves from `space-075` to `space-050`, and the
  Kinds `<legend>`, which its fieldset's gap does not reach, carries `space-050` itself (it was 0).

### The gate (test:chrome section 30)

- **The walk is per host.** `HEADING_PAGES` is the nine pages on the web host, and the nine plus `style-guides` on the
  figma host. The page is reached through the Figma menu with section 27's `SG_RING_CATALOG` posted (one table of each
  kind, so every option group draws). `HEADING_PROBE` takes the area it measures as a parameter: the levers pane, or
  `[data-p3="style-guides"]` here.
- **Its own literal `EXPECT_HEADINGS` entry:** L1 2, L2 5, L3 14, all typed. Its own floors (`SG_HEADING_FLOOR`) and
  tally, so the nine pages' floors do not move.
- **The represented-page check.** After the walk, every page `EXPECT_HEADINGS` names must have been measured on that
  host, by name (the web host skips `PLUGIN_ONLY_PAGES`). The list's keys are typed apart from the walk's list, so
  dropping a page from the walk fails here, whatever the counts say.
- **The sweep** passes on the page: 9 heading elements per run, each a level or the exempted page title.
- **A lever name's row** is the lever's first grid row, its name and (unless the lever is wide) its control. The space
  after it is measured from that row to the next box in the lever. A lever with nothing under its row (Paragraph spacing,
  Text decoration) has no space after it to measure; the group's gap follows.

### Traps for whoever re-verifies

- **The page is plugin only.** `main.ts` lends it to the figma host alone (`styleGuides: commit.isFigma ? … : null`), so
  the web host cannot be screenshotted or measured on it. That is not a gap in the arm.
- **Don't reuse `t` as a tally name in section 30's loop.** The token-label loop's own `t` shadows it. The first draft of
  this arm did that, and token labels counted 0 on every run.
- **The style guides page has no levers pane, preview or mode control.** The HP3 hint read, `PROMOTED`, TY1 and the
  token-line checks are the nine pages' and are skipped there.

### Mutations (each after a `wip:` commit, on rebuilt bundles, each failing by name)

- `.p3-sg-ogroup-title` back to 12 / `fw-default` in secondary ink → `TY2 A figma light 1280 / style-guides: L2 "All tables"
  (option group title) fs 12, want fs-14 14; fw 400, want fw-strong 600; line height 15, want lh-compact 17.5` (20).
- The page dropped from the walk → `TY2 A figma light 1280: the heading rule measured the style-guides page, which the
  audit's list names — measured [the nine]` (4, by name, with 16 more from the page's floors).
- One lever name at `fw-strong` → `TY2 A figma light 1280 / style-guides: L3 "Aliases" (option name) fw 600, want
  fw-emphasis 500` (4).
