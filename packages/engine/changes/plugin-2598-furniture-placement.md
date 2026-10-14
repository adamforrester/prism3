---
engine: patch
---
Plugin only (#2598). A set built onto a page that holds a section header now takes the first free slot under the
header, scanning right from its left edge, whether or not a sibling set is still on the page; before, a sibling sent
it past everything in the row, beyond the header's right edge. A build or an update in a file without `_Label` or
`_inverse-backdrop` now says so in one line that asks the designer to run Set up file, and the update's line reaches
its summary as well as its lines. Such a run is a warning: its verdict is `ok: false` and its `✓` headline reads `⚠`
(owner decision Q284.3 A). `EXECUTOR_REVISION` 19. No emitted artifact, token or projected component surface
moves.
