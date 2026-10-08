## (2026-10-08) — Update apply: a set whose members all lack an as-built record is updated, not called up to date (#2364)

Found on the NB master's first live apply. The dry run read "Would change 6 of 22": Button's and Destructive's minimum width and label text style, field-label's maximum width, and three fields' sizing modes. The confirmed apply, with that `previewHash`, reported those six sets "already up to date", updated the other 16 (`✓ updated 658 in place`), and a fresh dry run read the same six differences. No harm to the file: no id changed, and the named version was saved.

- **The cause.** Before writing, the apply skips a set with nothing to do, from the dry run's counts: `update`, `handEdited`, `add`, `drop`, `rename` and `revisionUnknown`. **It left out `noBaseline`.** A member with no as-built record reads `noBaseline` whatever else is true of it. Capture had left these six sets unrecorded ("built from an earlier plan"), so none of their members read `update`. The apply took each as already up to date, while the dry run, whose "would change" counts every member that isn't current, listed their differences.
- **The fix.** `noBaseline` is counted, so a set whose members all lack a record goes to the build's update pass like any other. Each member is updated and named as updated without a record, as Q113 A already decided for one such member.
- **And a set left alone can't hide a difference.** If the apply finds nothing to do for a set whose dry run named differences, each one is reported, by member, part and field, as still differing from the plan, and the verdict fails. It never says "already up to date".
- **The 16 other sets were updated as designed.** Their members read `revisionUnknown` (built by an earlier plugin), which the dry run reports as "N built by an earlier plugin. Update them to bring them current". That's a re-apply, not a defect.

### Why verify (b) didn't catch it

Verify's content check, `diffAnatomy` on every updated member, runs inside a set's apply. **The six sets returned before their apply began**, at the "nothing to do" check, so nothing was compared. The headline then counted the 16 sets that were applied. The new guard is the check on that path.

### Why the existing arm didn't catch it

`unrecorded/updated` clears one member's record among 45 whose plan moved. The other 44 read `update`, so the set was never empty. The NB case is every member of a set unrecorded.

### Tests (`test-update-apply.ts`)

- **`unrecorded/all`:** `tag` with every record cleared and its gap moved. The premise is that the dry run reads 45 with no record, none to update, and "Would change 1 of 1". Then 45 are updated and written, and the next dry run reads every member current (`converges`). `unrecorded/honest`: no ✓ verdict while a previewed difference is left.
- **`unrecorded/levers`:** Button on the NB master's own fields. Built from the default theme, every record cleared, then the plan from `buttonLabelWeight: 'default'` and `buttonMinWidthMultiplier: 1`. The dry run names `minWidth` and `textStyle`; all 432 members are updated, and the next dry run reads up to date.

**Mutations:**
- **`noBaseline` left out of the count, guard kept:** `unrecorded/all`, `written`, `converges`, `levers` and `levers converge` fail. The verdict reads `⚠ 1 set not verified`, not a ✓, so `honest` holds.
- **The whole fix reverted:** the same five, plus `unrecorded/honest` (`✓ already up to date; 6 left`). That's the NB master's result.

### Traps for whoever re-verifies

- **Live, after this merges, on the duplicate first:** a dry run reads "Would change 6 of 22"; the apply names each of the six sets' members as updated without a record; and a dry run after reads `✓ No changes found` or `✓ All sets up to date`.
- **`updated` there will include members whose only difference is the plugin revision,** as it did for the 16. That's expected, and the dry run's "built by an earlier plugin" line names them.
