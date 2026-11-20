## (2026-11-19) — The preview's controls and tables on the chrome's scale; Components and Export framed as Theme is (#4188, #4192)

The owner approved #4188 (A: the uppercase tracked header for every preview table, on the chrome's type scale) and
#4192 (F1 A: drop Components' empty header band; F2 A: Export's grounds in Theme's order) as recommended.

### #4188
- The style guide's "View style guide on" select and Depth & motion's Slow motion select are the chrome's `p3-select`
  at the levers' height (36px) and type (12px); Play/Replay is a `p3-btn p3-btn-page`. They steer the preview, so they
  are chrome, not specimens. Measured on main: 41px and 13.5px, 27px, and a 35px, 12.5px button.
  Play stands on the Slow motion select's middle, with no top margin, as the legacy button did.
- The preview's tables share one header: `.mtbl-tbl thead th` moves from 9.5px to the chrome's `fs-10`, and the
  Durations table (`.ctable.mo-ramp`, which has no `<thead>`, so `.mo-ramp tr:first-child > th`) takes the same band.
  The rule is scoped to the preview's table: Inspect's Contrast and Tokens tables are `.ctable` too and keep their own
  12px sentence-case header (the decision is "preview tables"; review of #4361). Body text moves
  from 12.5px to `fs-12`. The legacy rules stay in `styles.css` with new values, so `lint:live-css` loses nothing.
- The first arm measured the preview's select at 32px beside the levers' 36px: `p3-select` takes `ctl-h` only inside
  `.p3-levers`. The two preview selects now carry it by class.

### #4192
- **F1.** Q3149.1 kept Components' empty header row at wide widths so the two dividers met. The owner reversed it: on
  Components the header is not drawn and the preview body takes its grid row, so the family's own title is the pane's
  first line. Q2's divider arm (section 3) now measures Theme pages, and the header's absence on Components.
  The narrow-only collapse rule is gone, as the every-width rule covers it; Inspect's own rule stays, so Inspect stays
  off Components even if the header is drawn again.
- **F2.** Export's settings column sits on `levers-bg` and its result on `bg-page`, Theme's order (IA-2).

Section 3149 carries the new arms; on main's source the first eight fail by name. Two more (Play on Slow motion's
middle; Inspect's headers not the preview band) failed on the PR's first head and pass now.
