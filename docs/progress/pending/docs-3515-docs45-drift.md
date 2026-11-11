## (2026-11-10) — docs/45: the group fill and the per-type phase column match the code (#3515)

Docs only, no behavior change.

- **Group fill.** §2's group bullet said a `Style guides — <title>` group is drawn "with no fill (Q7 A)". Since
  #2953 (2026-10-23) a group Prism3 drew is painted while it has no paint: a fill bound to
  `color/foreground/primary`, a 1px inside stroke bound to `color/border/secondary`, a corner of 2
  (`GROUP_FILL_ROLE`, `GROUP_STROKE_ROLE` in `apps/plugin/src/style-guide.ts`). The Q7 A clause is struck through
  with the superseding note, the doc's usual form, rather than deleted.
- **Phase column.** The per-type table still marked shadow, gradient, opacity, border width and icon sizes as phase 3.
  Each is now marked built with the PR that built it: #2490 (border width, opacity, icon size), #2514 (the
  border-width specimen) and #2584 (shadow and gradient). Number, duration, cubicBezier, transition, spring and
  strokeStyle stay phase 3, which matches `LATER_KIND` and #2353.
- **Icon sizes' specimen.** The row said "the icon glyph at the size". The code draws an icon size as a dimension row,
  the spacing cell at its width with a REM column, in a table titled "Icon size" (`DIMENSION_KINDS`, `specimenOf`).
  The row now says that and keeps the glyph as the earlier, unbuilt proposal.
- The status line was already brought up to date by the #2686 entry; this PR leaves it as it is.
