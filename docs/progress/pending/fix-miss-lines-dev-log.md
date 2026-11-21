## (2026-11-19) — A build's miss lines leave the screen for the run log; one line per set in Activity (#4185 B)

The owner chose #4185 B's option (b): keep the engine-internal miss lines for maintainers, show a one-line summary on
screen. Almost every line a component build misses on is engine vocabulary: a part path, `->`, a status code
(`UNCLAIMED`, `DISCARDED`, `REFUSED`, `NOT MADE`) and sometimes an issue number. They reached Activity's causes through
the `real` filter in `main.ts`.

### Where each line goes now
- **Activity (the designer's screen):** one line per set, "⚠ N bindings Prism3 couldn't make." (`missesLine` in
  `apply-summary.ts`; owner decision 2026-11-20: it promises no place, and counts bindings, since each miss is one
  binding on one member). The verdict summary's
  miss clause uses the same line, where it listed the first three raw lines.
- **The console:** every line, and the set's grid, size, properties and links, which left the set's on-screen line
  (#4185 B row 2): that line is now "‹set›: N variants (N new, N already there), axes …".
- **The run log** (`activityLog.annotate`, the agent link's `activity`): the first 20 lines per set (`REASONS_MAX`,
  then "…and N more"), for the last 50 runs. It is memory only: it is gone when the plugin closes, and it does not
  travel with the file, which is why the on-screen line names no place.
- **The summary's miss count** now excludes `ALREADY PRESENT` and `STALE` lines, as the headline already did, so an
  idempotent re-run no longer shows "⚠ N misses".
- **Not yet covered: Update file's verdict.** It still lists up to three raw miss lines per set on screen
  (`update-apply.ts`, "N parts not written as planned — …"). Filed as #4370, which also moves it to "N bindings".

Apply theme's summary loses its abbreviations (#4185 B row 3): "Layout: N collections", "Type: N fonts, N font
variables, N text styles", "Motion: N variables", and "N font style names matched to the installed font". Its other
axis lines take the same label form (owner decision 2026-11-20): "Palette:", "Color:" and "Styles:".

`test-build-completed.ts` holds the screen line, the absence of any engine path on screen, and the run log's copy.
`test-apply-summary.ts` holds the line's words, singular and plural; `test-prune-main.ts` holds Apply's six labels, in
order, from a real Apply.
