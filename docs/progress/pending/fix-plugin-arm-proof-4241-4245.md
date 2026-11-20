## (2026-11-19) — Two plugin arms carry their own proof: tags on the assertions, an absence with a control (#4241, #4245)

- **#4241, `test-doc-panel.ts`.** The #2889 and #2858 tags appeared only in the section heading, and `section()` only
  prints, so `lint-test-arms` kept both arms registered whatever their assertions did. The tags are now in the
  assertion labels (#2858 on the wireframe's text and bullets, #2889 on placement, the fold and ledger checks and the
  hand edit), and the heading no longer carries them. Deleting every assertion under the heading passes main's gate
  and fails here with `ARM GONE … #2858` and `#2889`. The issue's own mutation (`if (false && plan.changed.length)`)
  now fails 9 checks, each tagged. The gate half, a tag in any suite's heading wrapper read as an arm, is #4324,
  left for after #4272, which has `lint-test-arms.ts` open.
- **#4245, `test-start-screen.mjs` #1037.** "The file's own brand arriving offers no Undo load" was a raw count at a
  fixed 150 ms. It now waits until the switcher names the loaded brand (the bar paints the switcher and the offer in
  one pass), and goes through `hooks.absent`. Its proof is a new `#4245 control` in the same panel: a designer-chosen
  load over edits, read the same way, must draw the offer once.
  - The issue's rename case is caught on main already, but only by the suite's end-of-run hook guard
    (`hook "undo-load" … never appeared`), not by the arm.
  - The mutation that separates them is the #1037 defect itself (`loadReplacing` for the file's origin) with the
    offer drawn 200 ms late. Main's #1037 arm reads `✓ … (undo-load drawn: 0)`, and that suite is red only through
    the hook guard. Here the control fails by name and the absence reads NOT MEASURED.
  - Limit: an absence read at one moment cannot prove "never". The control proves only that the offer, when made,
    is drawn by the time the switcher names the brand.
