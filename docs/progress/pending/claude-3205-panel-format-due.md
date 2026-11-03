## (2026-11-02) — Update file offers a usage panel drawn by an older panel format, even when its set is current (#3205)

**What was wrong.** #3318 raised `PANEL_FORMAT` to 6 so that every usage panel would be due once. In the template, after
an Update with a build that included it, Dialog's panel still read format 5 with its specimens FIXED at 62px: Update file
never offered it. Update file decides which sets its check reads from the as-built ledger (`dueOf`), with no page loaded,
and the ledger knew nothing of the panel format. Dialog's set was current, so it was never ticked and never checked, and
`docPanelDue`, which does read the panel's format, never ran on it. #3318's tests drove `docPanelDue` and the redraw
directly, not this path.

**The fix.** Each ledger entry on a family's lead set carries the panel format it was checked at (`panel`), while
Documentation has the usage panels on (`main.ts`, `panelFormatOf` in `ledgerNow` and the build's record). `dueOf` gives a
set that is otherwise current a due reason of its own, `panel`, when its entry's format isn't today's: the format-due
credit. The full read, the read at open and the badge's recount all go through `dueOf`, so they agree. The check then
reads the set, `docPanelDue` finds the older plan, and the apply redraws the panel in place, or keeps it as "(edited)"
if a person changed it (#3317's rule). The apply records the set with today's format, so it reads current again. A write
with the panels off keeps the format the file holds. Studio shows the reason as "Engine update: Prism3 draws usage panels
differently" (the owner's Q3205.F1 A, 2026-11-02: keep the line as built).

**Cost.** Every lead set in a file with the usage panels on reads due once after this ships, because no entry recorded a
panel format before it. That is the redraw #3318 meant to make. Later raises of `PANEL_FORMAT` reach Update file the same
way.

**Tests and mutations,** each committed `wip:` first:
- `test-doc-panel.ts` `format due/…`, on the strict host: Dialog's set current, its panel at format 5 with collapsed
  specimens. The ledger read lists it due, the scoped check offers it, one apply redraws it with each specimen FIXED at
  560 with `minWidth` 560, and a hand-edited panel is kept. `test-build-completed.ts` `format due/…`, through the real
  `main.ts`: the build records the format, an entry without one reads due in `file-sets` and the badge's recount, and
  not with the panels off. `test-as-built-ledger.ts` `format due/…`.
- The format-due credit dropped from `dueOf` → `format due/offered`, `format due/redrawn`, `format due/edited kept`,
  `format due/main`, `format due/no format`, `format due/older`.
- `panelFormatOf` giving no entry its format → `format due/build`, `format due/main`.

**After review.**
- `main.ts`'s own apply record is now under test. `test-build-completed.ts` `format due/recorded by main` runs an update
  through the real `main.ts` over Badge's entry with no format. It reads due for its panel before, and current after
  with format 6 recorded. Mutation: the apply's record giving `panel: undefined` → `format due/recorded by main`.
- "Due forever" for a panel whose draw is still blocked doesn't happen. The check offers no panel while it's blocked,
  but it doesn't block the set either. Update file's apply runs on every ticked set the check didn't block
  (`updatableOf`), and `main.ts` records the format whether or not a panel was drawn. So the set is offered once and
  then reads current. `test-doc-panel.ts` `format due/blocked` covers it. Mutation: the check blocking a set whose panel
  draw is blocked → `format due/blocked`.

**Owed.** Real-Figma confirmation: after an Update in the template, Dialog's panel is offered and redrawn, and its
specimen reads FIXED at 560 with `minWidth` 560.
