## (2026-11-12) — Update file: a disabled Update file says why (#3713, 3 of 4)

The owner's dialog had Update file disabled and nothing on screen saying why. The only way they found to enable it was to tick Theme, which re-applies a theme that was already up to date. That works only because the re-apply counts as a write.

**The fix.** `goWhyOf` says why, in the foot beside Cancel and the button, and the line is the button's `aria-describedby`. It never enables the button. There are three cases:
- The file's brand did not restore (`off`): the line says so. Before, this showed only in the button's tooltip.
- There is nothing to run because every Due set the check could run is gone and the rest are blocked: "Nothing to write: Icon can't be updated yet." It names up to three sets, then "and n more".
- Nothing is ticked: "Nothing to write: nothing above is ticked."

A set that can run but is unticked makes it the third case, so the blame never lands on the blocked sets. While the check is out, the foot's progress (#3302) already explains the wait, so no line is added. Every string is a DRAFT for the owner.

**Independence.** `test-update-file.ts` holds `goWhyOf` to literal cases. Chrome section ia2 blocks both of its Due sets. It expects the button disabled, the literal line in the foot before Cancel, and `aria-describedby` pointing at it. With one set able to run, it expects no line. **Mutation:** with `goWhyOf` returning null, ia2 fails `#3713 disabled says why` and the unit test fails its `#3713 why` arms.
