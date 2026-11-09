## (2026-11-08) — Report a problem in the web studio, beside Help in the rail (#3524)

#3522 placed Report a problem at the foot of the plugin's Activity drawer. The web studio draws no drawer (#3011), so
it had no way in. The owner suggested a place beside Help in the rail (Q151 A). The placement and any new copy are
DRAFT, the owner's call.

### How it works

- **One dialog, two doors.** `main.ts` lends `reportLend` on both hosts. `frame.ts` mounts the same `mountReport`
  layer, and when there is no drawer (the web), it adds a `report-open` tile to the rail's foot after Help, before
  Appearance. Like Help, it shows only its icon (#3083). Its accessible name and tooltip reuse `REPORT_COPY.open`, so
  no new string is added. The plugin is unchanged: its rail has no new tile, and the drawer keeps its button.
- **The link.** The web adapter's `openIssue` already opened the issue in a new tab with `noopener` (#3522). The report
  says `Host: Web studio` and "Nothing has run in this session.", because the web runs no write.
- **The icon.** Tabler's `message-report` (a speech bubble with an exclamation mark) as the glyph `report`, vendored
  with `chrome/vendor-icons.mjs` from `@tabler/icons@3.49.0`, the pinned version, so `tabler.ts` and
  `tabler-digest.json` each gain one line. The choice is DRAFT.

### Traps for whoever re-verifies

- Section 1's rail arms are authored from decisions: web order, names, icons and the icon-only tiles. Each now lists
  `report-open` with a `#3524 (DRAFT)` note. If the owner moves the tile, change those literals, never a read of
  `frame.ts`.
- The icon-only loop in section 1 used to hover each tile without checking it existed, so a missing tile stopped the
  whole run on a hover timeout. It now skips a missing tile, and the `#3083 rail …` arm fails by name, because the
  `bare` count is short.
- Section 2069's web case stubs `window.open` before the click, so the run reaches no network. It checks that the
  opened URL's body is exactly the text the dialog shows.
