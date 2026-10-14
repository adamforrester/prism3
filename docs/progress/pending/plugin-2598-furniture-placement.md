## (2026-10-13) — Build: a rebuilt set goes back under the page's header, and a file without the furniture templates is told so (#2598)

Owner QA on a copy of a production file, plugin from main. Two defects: a build and an update in a file that had never
run Set up file drew no row labels and no inverse backdrops and seemed to say nothing, and rebuilt sets landed
inconsistently, `button` right of the page's `_section-header` and `icon-button` under it.

### Why the two builds landed differently

There was one rule, and the two pages met different branches of it. `placeNewSet` (#1750, #2405) puts a set under the
header only on a page with a header and **no** set. On a page that still holds a set, it top-aligns with the sets and
goes `SET_GAP` right of everything in the row. The owner deleted `button` and `button-destructive` but kept
`button-neutral`, so the rebuilt `button` went right of `button-neutral`. The header spans the row the first build laid
out, so the result reads as "right of the header".

**The icon-button half is unexplained, not inferred.** This PR first said the same branch reads as "under" on
`↳ Icon button` while the set stays inside the header's width. The replay below says otherwise: with the old rule
restored, `icon-button` lands at `1992,0` against a header spanning `-324..1592`, right of the header; with no sibling
left, it lands at `1980,-53`, also right, past the orphaned labels. Neither branch puts it under. One candidate, from
the independent review and not checked against the live file: that file had no `_Label` at the first build, so the
page had no labels to push the set right. The fix makes the rule the same under a header either way, so it holds
whichever explanation is true.

### The fix (`write-components.ts`)

On a page with a header, a new set takes the **first free slot** in its row, scanning right from the header's left
edge, whether or not sets remain. A slot is free when the set's box, widened `SET_GAP` on each side (its own row labels
go on its left, the next set's on its right), meets no node in the row. `y` is unchanged. When no slot fits, the first
one past everything in the row is where the old rule put the set. A page with no header keeps the old rule exactly. So
a set deleted and rebuilt goes back into the gap it left, and the rebuilt sets read left to right in build order. The
existing #2405 arms (f) to (i) in `test-write-components.ts` pass unchanged. The rebuilt set starts at the header's
left edge, which on a page laid out by a first build is the left edge of the first set's row labels, so it sits about
one label column left of where the first build put it. That is the #2405 rule as documented ("on the header's left
edge"), and the owner accepted it (Q284.4 A).

**Tried and dropped:** letting the set sit closer to a node that is itself canvas furniture (a label already in the
gap). Its mutation survived: a rebuilt set sits a label column left of its old spot, so a real page always has the
slack. That made it speculative code, and it came out.

### The missing templates (`canvas-furniture.ts`, `main.ts`)

The build already reported each missing template, one clause per set. The update put its clauses in its `lines` but
not its `summary`, so an agent reading the summary was told nothing. A panel build is `ok` with the template missing,
so the panel shows the headline and leaves the detail closed. Picked (a), a line, over (b), the build making the
templates: the templates go on `↳ File Components`, a page only file setup may create (#2597), and an update's apply
may write only what its dry run showed. Now a set records the templates it lacked (`missing`), and the run reports them
**once**, first among the furniture items, naming each template and asking the designer to run Set up file, then
build (or update) again. The update's furniture items reach its summary and its lines (`withFurnitureItems`). Wording
approved, owner decision Q284.1 A: "No canvas labels or inverse backdrops drawn: this file has no _Label or
_inverse-backdrop component. Run Set up file, then build again", each form naming only the missing template, and
"then update again" on an update. Q284.2 A approved the other new string, "No inverse backdrop for {component}:
_inverse-backdrop cannot be instanced", for a found template with no `createInstance`.

**A missing template makes the run a warning (owner decision Q284.3 A).** The build or update worked, but the page is
incomplete. `withTemplateWarning` turns the verdict `ok: false` and a `✓` headline into `⚠` over the same words
("⚠ built 20 variants", "⚠ already up to date"), so there is no new pill copy. That's the state every partial result
already takes: a build that made its set stays `completed`, so the panel marks the set "issues" and opens the detail
where the line sits. A headline already `⚠` or `✗` is left alone. Only a missing template warns: a variant the found
`_Label` lacks, or a template that cannot be instanced, stays a skipped line under a `✓`, as before.

Gated where `main.ts` posts it, in the same host as the wiring arms (`test-build-completed.ts`). That host now holds the
variables and styles Badge binds, as after Apply Theme, so the build is otherwise clean and the `⚠` can come only from
the missing template; before, the build was already `⚠ 245 misses` and the Update refused, so a warning arm there
could not fail. `templates/build warns` and `templates/update warns` read the posted verdicts in a file with no
`_Label`. Then Set up file's own template builder (`ensureFurnitureTemplates`) makes the templates, and
`templates/build clean` and `templates/update clean` read the same build and Update as `✓`. The shim's components
cannot be instanced, so that second run still skips its labels (a skipped line, which stays `✓`); the arm pins only
that a present template does not warn.

### Item 3 (labels overlapping the next set)

Not retested here. #2548's `page/set moves` and `page/converges` arms in `test-update-apply.ts` already replay this
case: Buttons squeezed to the pre-#2502 160px gap, which the update re-spaces to 400. `clearance/Buttons` in
`test-canvas-furniture.ts` holds that labels clear at 400. Confirm on the next copy run.

### Verified

`test-canvas-furniture.ts` `placement/…` replays both pages: the three sets built with their labels, a header over the
content, the first two sets deleted with their labels left behind, then each rebuilt as `main.ts` builds. The first
rebuilt set lands at the header's left edge, the second lands 400 right of it, and nothing overlaps. `placement/slot …`
checks the slot on literal boxes. `templates/missing …` checks the run's one line, and `templates/update summary`
checks the update's summary. Those arms read the helper's output, so the independent review found `main.ts` could
drop the line from either verdict with every test green. `test-build-completed.ts` now reads it where it is posted:
the real `main.ts` builds Badge in a file with no `_Label` (`templates/build verdict`), then runs the Update's check
and apply through `ACTIONS.updateComponents` (`templates/update verdict`). That host needed two Figma behaviors it
lacked: a set search that finds the sets on its pages, and `getNodeByIdAsync`. Without the second, the furniture
never reached its template lookup and the build reported "Figma refused the write" instead. The review also found the
width at `applyComponentPlan`'s call unguarded: the replay always leaves a label column of slack, so width 0 landed
the set in the same place. `placement/narrow gap` moves the kept set, with its labels, into a slot that holds a
zero-width set and not the real one, and the rebuilt set must land past it. Mutations, each committed first and then
`git reset --hard`:
- the old rule restored: all six `placement/Buttons|Icon button …` arms fail;
- the right gap dropped, or the set's own width dropped: `placement/slot too narrow` and `placement/slot left gap` fail;
- the left gap dropped: `placement/slot left gap` and both `placement/… second` arms fail;
- the run's line dropped: `templates/missing build|update|label` and `templates/update summary` fail;
- one line per set: `templates/missing build` fails;
- the update summary left without the items: `templates/update summary` fails;
- the template line dropped from the build's post in `main.ts`: `templates/build verdict` fails;
- the Update's post back to `applyVerdict(r)` alone: `templates/update verdict` fails;
- `applyComponentPlan` passing width 0 to `placeNewSet`: `placement/narrow gap` fails;
- the warning dropped from the build's post in `main.ts`: `templates/build warns` fails;
- the warning dropped from the Update's post: `templates/update warns` fails;
- a warning with every template present (the condition made always true): `templates/build clean` and
  `templates/update clean` fail;
- a warning for a missing `_inverse-backdrop` only: `templates/build warns` and `templates/update warns` fail.

`EXECUTOR_REVISION` 15 → 19: #2591 claims 16, and 17 and 18 were named for #2600 and #2592's fix.

Not changed: the paste payload's copy of the placement (`anatomy-figma.ts`) never had #2405's header rule, so it
still places right of the row.
