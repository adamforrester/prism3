## (2026-11-19) — A build's miss lines leave the screen for the run log; one line per set in Activity (#4185 B)

The owner chose #4185 B's option (b): keep the engine-internal miss lines for maintainers, show a one-line summary on
screen. Almost every line a component build misses on is engine vocabulary: a part path, `->`, a status code
(`UNCLAIMED`, `DISCARDED`, `REFUSED`, `NOT MADE`) and sometimes an issue number. They reached Activity's causes through
the `real` filter in `main.ts`.

### Where each line goes now
- **Activity (the designer's screen):** one line per set, "⚠ N parts not drawn as Prism3 expects. The details are
  kept in the file’s run log for a maintainer." (DRAFT, `missesLine` in `apply-summary.ts`). The verdict summary's
  miss clause uses the same line, where it listed the first three raw lines.
- **The file's run log** (`activityLog.annotate`, the agent link's `activity`): every line, unchanged. That is the
  "dev log" the decision asks for, and it travels with the file. A published plugin's users can't open its console.
- **The console:** every line again, and the set's grid, size, properties and links, which left the set's on-screen
  line (#4185 B row 2): that line is now "‹set›: N variants (N new, N already there), axes …".

Apply theme's summary loses its abbreviations (#4185 B row 3): "Layout: N collections", "Type: N fonts, N font
variables, N text styles", "Motion: N variables", and "N font style names matched to the installed font".

`test-build-completed.ts` holds the screen line, the absence of any engine path on screen, and the run log's copy.
