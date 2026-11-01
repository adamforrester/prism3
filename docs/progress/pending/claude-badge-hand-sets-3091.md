## (2026-11-01) — Update file's badge: a set deleted or added by hand is counted at the next recount (#3091)

**Status:** plugin fix (`apps/plugin/src/main.ts`) and a new arm in `test-build-completed.ts` (section 6d). ENGINE patch
(change note): no committed artifact, emission or component surface moves. The executor is unchanged, so
`EXECUTOR_REVISION` stays.

### The problem

The badge's live recount (`fileDue`, #3081 Q810 A) reuses the sets the last read of the file found (`presentCache`), so a
setting change never loads every page. Only a plugin write cleared that cache. A set deleted by hand stayed in it, and its
ledger entry made the next recount count it as due; a set added by hand was missed. Both lasted until the next
`file-sets` read (the checklist opening, or a run).

### The fix

`main.ts` listens for Figma's `documentchange` and drops the cached sets (and any read in flight, as a write does) when
the edit can change which sets the file holds:

- a component or set created, or a created node that holds one (a frame pasted with sets in it);
- a component or set deleted, or a deleted frame, group, section or page (a removed node's children cannot be read);
- a component or set renamed, since the build finds its sets by name (`presentNames`).

Any other edit keeps the cache, so drawing on the canvas never makes the next recount read the file. The listener does
nothing while no sets are cached, which covers a plugin write's own changes (`guarded` clears the cache at its start).

Under `dynamic-page`, Figma accepts a `documentchange` listener only once every page is loaded. So the listener is
registered after the first read of the file's sets (`readPresent`), which loads them all, and never at open (#3110 kept
the open from loading every page). A host that refuses the listener keeps the behavior from before this fix. Of the
issue's three options, this is the first. A timer would still miscount between ticks, and would read a large file on a
schedule.

### Test

`test-build-completed.ts` section 6d, through the real `main.ts`, with the shim keeping the listeners `main.ts` registers.
A read registers one listener. A rectangle drawn and a frame renamed keep the cache (the recount loads no page). Switch
row's set taken off its page with a `DELETE` fired: the next recount reads it neither present nor due. Put back after a
read without it, with a `CREATE` fired: the next recount reads it present. Mutation (after a `wip:` commit): the
listener's body a no-op → `hand/delete` and `hand/add`.
