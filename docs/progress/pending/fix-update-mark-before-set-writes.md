## (2026-11-16) — Update file marks every member in progress before the set's first write (#3797, #3594)

**What.** The executor puts the in-progress marker on a member as it reaches it, and takes it off after the member's
record and stamp (`finishUpdated`). But `applySet` writes to the set before the executor runs: layer renames
(#2759) and property removals and retypes. A close (#3797) or a stop after those writes left every member the pass had
not reached yet with changes that were the update's own, but no marker. The next check compared them to their records
and read them as hand-edited, and Keep, the default, then kept those paths on every later run, so the members never read
current again. Now `applySet` marks every member it configures, with the executor's own value (the paths it keeps),
before the set's first write to its content. A member the run never finished reads as to update, with only its kept
paths as hand edits, as a member the executor marked always has.

**The diagnosis differs from the issue.** #3797 guessed the members the closed run *reached* were the ones read as
hand-edited. Measured in `test-slot-migration.ts`'s `closed/…` world, it is the three it *never* reached: the reached
ones carried the executor's marker and read as to update. The unreached ones had lost their rows' boolean bindings to
the set's property removal (`row2`…`row8`), with no marker.

**#3594 falls out of the same mark.** A stopped set counts the members it finished off the host (#3449). With every
member marked before the pass and the marker cleared only by the executor's finish, "planned stamp and no marker" says
the pass finished a member, whatever moved its stamp. So a member updated for drawn damage, a nested-instance fault or
reactions is counted too. The old rule's extra clause ("its stamp changed, or it was marked before the pass", #3559) is
gone. #3594 suggested carrying the finished list out of the executor, which would raise `EXECUTOR_REVISION`. This stays
with #3449's "read it off the host" and changes no executor file (`lint-executor-revision`: unchanged, 59).

**Tests.** Both fail on main and pass with the fix:
- `test-slot-migration.ts` `closed/no false hand edit`. On main: `handEdited: 3, current: 3` of 6.
- `test-update-apply.ts` `stop/count damage finished`: two damage-only members, a stop on the second's marker clear,
  so 1 is counted. On main: 0.

`stopped/…` in `test-slot-migration.ts` now stops on each member's *second* mark (the executor's). It also skips its
later arms rather than throwing when its premise fails, so a mutation doesn't hide the arms after it.

**Mutations, each failing by name:**
- the mark dropped → `closed/no false hand edit`, `stop/count damage only`;
- the count's rule back to "its stamp changed" → `stop/count damage finished`, `stop/count after marker`.
- the mark moved to just before the executor's pass, after every set-level write (the #3809 review's mutation; the close
  arm cannot see it) → `refused/mid no false hand edit`, `refused/no false hand edit`. The `refused/set write` arm has
  the host refuse the set's third property removal: on the mutation all 6 members read as hand-edited, for good.

**A trap for whoever re-verifies this.** A test that throws on "the first `UPDATING_KEY` write" now hits the apply's mark,
not the executor's. The set then stops before any other write, with nothing counted (`stop/count damage only` relies on it).
