## (2026-11-10) — Update file: a member still marked in progress reads to update in the dry run (#3497)

The executor writes a member's stamp, then clears its in-progress marker (`finishUpdated`, `write-components.ts`). A host that throws on the clear leaves a member with its new stamp and the marker. The dry run read that member as current, because the marker only narrowed its hand-edit read. #3492's stopped-set count, which requires no marker, left it out. So after a stop on the 10th marker clear, the verdict line said 9 members updated and the next dry run said 10 were current, and the next Update skipped the unfinished member.

### The change

`update-plan.ts` holds the marker against the stamp: a stamped member that still carries the marker is "to update", after the record and hand-edit reads, so its kept paths are still kept and reported. The next Update finishes it and clears the marker. This follows the executor's own protocol (the marker comes off last), so it is a correctness fix, not a reporting choice. The executor is unchanged, so `EXECUTOR_REVISION` does not move. Plugin only: `out/` is byte-identical, and no engine change note.

### The gate

`test-update-apply.ts` `stop/count marker` takes the dry run as its second witness: 9 current, 36 to update, the marked member among them, agreeing with the line's 9. A new arm runs the update again and reads all 45 current with no marker left. Mutation: `unfinished` dropped from the member's state fails `stop/count marker dry run` and `stop/count marker finished` by name.
