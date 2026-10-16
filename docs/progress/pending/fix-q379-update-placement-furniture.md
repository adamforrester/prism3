## (2026-10-16) — Update: sets land below the page header, and missing backdrops count as a change (Q379)

**What happened.** Two Update defects found in a real brand file (owner decision Q379 A: fix in the plugin, then
re-run Update). #2802: on a Checkbox page whose `_section-header` is wider than its sets, an earlier build had put
`checkbox-control` 160px right of the header, at the header's `y`, and the Update's set move re-spaced its two
siblings beside it, so all three stayed in the header's row. #2803: an Update on a file with no `_inverse-backdrop`
said "Run Set up file, then update again", and once Set up file added the template the next dry run read "No changes
found", so nothing applied and the backdrops behind the button families' inverse rows stayed missing.

**The diagnosis.** #2802 is not the header counted as a row member: `respaceSets` (#2542) treated it as an obstacle
only, and its rules keep the first set of a row where it is and never change `y` ("the re-spacing only makes room",
Q248 A). A row that already sat beside the header was therefore left there. #2803: the dry run compared members only,
and the furniture was drawn only for sets the apply acted on, so missing furniture could never become a change.

**The fixes.** `respaceSets` now places a set in the header's row as `placeNewSet` places a new set under a header:
the top of the sets already below the header, else the header's bottom plus `PAGE_HEADER_GAP`; the first on the
header's left edge, each later one `SET_GAP` right of the one before. It is the one move that changes `y`. A set
wholly above or below the header's band stays as before. `EXECUTOR_REVISION` 28 → 29.
`furnitureDue` (`canvas-furniture.ts`) reads what a set's furniture lacks the way `drawFurniture` would draw it:
the same members, planner, template lookup and guards. A backdrop or scrim matches by its box, a column label by
its left edge, width and bottom, and a row label by its center and its column's right edge, column by column. The dry
run lists what is due on the set's line (DRAFT wording: "1 backdrop to draw", "41 canvas labels to draw"). It counts
as a change and is in the preview hash. The apply gives a furniture-only set an outcome and a named version and
touches no member. The furniture is drawn by `furnishUpdate`, the loop `main.ts` ran, moved where a test can drive
it. It now draws nothing when the confirm was refused.

**The trade-off.** A part whose template the file still lacks is not due, because the apply could not draw it. The
run's Set up file line already names it. Without this the dry run would list it forever. A label's text and its own
width are the template's and are not compared, so a label whose text a designer edited is not due.

**Tests.** `header row/…` (`test-update-apply.ts`) builds the three Checkbox sets fresh with the real executor as
the oracle, puts them beside a wider header as the live page had them, and holds the dry run and the apply to the
fresh layout relative to the header, ids kept, the header unmoved. It also checks one set alone in the row and a
row already under the header, which stays. `due/…` (`test-canvas-furniture.ts`) builds Button with the template
absent, adds it, and holds the dry run's line, an apply that draws the one backdrop and leaves every member's id,
place and stamp, the next dry run current, a set moved by hand listing all 42 parts again and converging, and a
refused confirm drawing nothing. `rollout/<def> due` holds that nothing is due right after a draw, on all 39 defs.
Mutations: `besideHeader` always false → `header row/dry run`, `header row/applied`, `header row/one set` (the
mutant reproduces the live layout); the check dropped from `previewUpdate` → `due/dry run lists`, `due/apply draws`,
`due/stale`, `due/stale converges`, `due/refused`.
