## (2026-10-10) — Canvas furniture pilot: variant labels, an inverse backdrop and inverse rows grouped, on Button, Tag and Text field (#2406, #2188)

Owner decisions Q171 (#2406), Q172 and Q173 A (#2188), built as one arc and piloted on three defs before the rollout.

**What a build now leaves on a piloted page.** After a build or an in-place update lands the set, the plugin places
`_Label` instances on the set's parent, outside the set: a column label above each value of the grid axis, nested row
brackets to the left for the outer row axes (up to three, none for an on/off axis such as "leading icon"), one
"Inverse" bracket outermost, and an `_inverse-backdrop` instance behind the inverse rows. Wording is the variant values
in sentence case ("focus-visible" → "Focus visible"). Button gets 6 column labels, 35 row labels and 1 backdrop; Tag 5
and 13; Text field 7 and 16. The switch is `CANVAS_FURNITURE_PILOT` in `anatomy-figma.ts`: one list, read by the engine
for the grouping and by the plugin for the labels, so the rollout adds ids and nothing else.

**The grouping is the engine's, and layout only.** For a piloted def with a `surface` row axis, `planSetLayout` moves
`surface` to the front of the row keys and partitions the rows by it, stably, so Button's inverse rows are rows 48–95.
Member names, keys and the plan order members are built and combined in are unchanged, and the properties panel's value
order follows member order (#2386), so it holds: the test reads `surface`, `appearance`, `size` and `state` options in
the def's order off a grouped build. Only Button has `surface` among the three, so only Button moves.

**An existing set is regrouped by an in-place update, reported as moves (Q173).** The first version of this PR left
the regrouping to the next Build: the dry run read an old-layout Button as 576 current members, while an apply with
other work regrouped it anyway, unannounced, and then drew a backdrop and an "Inverse" bracket on each of its three
inverse bands. The orchestrator's review blocked on that. Now `gridMoves` (`update-plan.ts`) works out, for a piloted
def, each member's row top the way the executor's layout pass does (from the members' heights, 24 in and 24 apart) and
reports every member whose `y` differs: an old-layout Button reads `576 members. 360 to move.` and nothing else
(rows 12–71 change place, 60 rows × 6 states, worked out by hand in the test). The apply treats moves as work; the
build's pass re-lays the grid and rewrites no member, so every id and key survives, the outcome reads `360 moved`
(counted off the host), and the next dry run reads up to date. Both phrases are DRAFT wording for the owner, in the
"N to …" form the dry run line already uses. Rows only, because the grouping moves rows.

**Why no `EXECUTOR_REVISION` bump.** The executor's code is unchanged: `update-plan.ts`, `update-apply.ts` and
`canvas-furniture.ts` are outside its import walk, and `lint-executor-revision.ts` passes at main's 8. Bumping it would
have marked every member of every def as needing a re-apply to move one def's rows, which is the thing the move count
avoids.

**Labels follow the members as the host holds them, not the plan.** Rows are measured off the set's members and sorted
by their `y`, and runs of adjacent rows make the brackets. Furniture is drawn only over one inverse block: on a set whose
inverse rows are still split (an update that refused or stopped in it), the old furniture is cleared and none is drawn,
with a DRAFT line saying to run Update. So an ungrouped set never gets three backdrops.

**Lifecycle.** Each instance carries shared plugin data `prism3`/`furniture` naming its def and set. A build first
clears that def's furniture on the page (so a deleted set's leftovers never push a new set's placement) and redraws it
once the set lands; an update's apply redraws it for each piloted set it acted on. Prune removes furniture whose set is
gone or whose def has left the pilot, and nothing untagged, so the owner's hand-placed `inverse-bg` rectangles stay
(Q172.5). Furniture is never appended into the set, which is what keeps the hand-edit check and the as-built record
blind to it: `drawFurniture` reads its parent off the set rather than taking one.

**Templates.** File setup builds `_Label` (the owner's Prism 2 spec, colors as literals) and `_inverse-backdrop` (fill
bound to `color/inverse/background/primary`, the ground the inverse contrast checks use) on `↳ File Components`, each
looked for on its own. `ensureFileComponents` skips when either of its own two sets is there, so every file set up
before this would never have got the new pair under that rule. A backdrop built before the theme is applied holds a
placeholder fill; the build binds it once the variable exists, and only while it is still that placeholder.

**Placement and the page header (#2405).** Labels and backdrops are drawn before the run's headers, so a first build's
header measures them and sits above. On a page whose header is already there, the column labels take 53px above the set
(16 gap + one 37px label), inside the header's 80px gap. #2435 (now merged) changed only `placeNewSet`'s header handling;
this PR does not touch `placeNewSet`.

**Held for the owner:** the 16px gap between labels and the set, the 8px between nested bracket columns, the backdrop's
12px padding and 8px corner radius, whether the default block also gets a "Default" surface bracket, and Bottom's
bracket rotated 180° (the spec says only that it comes before the text), and the DRAFT phrases "N to move", "N
moved", "✓ moved N" and the no-labels line for a set not yet regrouped.

**Known limit, for the rollout.** On a page with several sets side by side, a later set's row labels sit in the 160px
`SET_GAP`, and Button's four bracket columns are wider than that. On the pilot pages only Buttons holds more than one
set, and its first set is the piloted one, so nothing overlaps yet. Also filed: furniture stays on a set's old page when
the set moves page, since prune keeps a live set's furniture (#2485).
