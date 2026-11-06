## (2026-11-06) — Components: a set with kept edits shows its Kept edits tag (#3446)

`statusesOf` (`apps/studio/src/state/update-file.ts`) returns `kept` for a set the file-sets read lists as kept (#3421, Q39 A), and `UPDATE_COPY.status.kept` reads "Kept edits". The Components page draws a row's tags only through `STATUS_ORDER` (`apps/studio/src/domains/components.ts`, `statusTags`), which had no `kept`. So Update file listed the set under Kept edits, but its Components row showed no such tag.

### The change

`STATUS_ORDER` gains `kept`, after `due` and before `hand`: the order `statusesOf` already gives them. The tag text is the existing `UPDATE_COPY.status.kept`, "Kept edits", so no new copy. Where it sits in the order is the owner's call (the issue says so), so it is asked A-first on the PR. The guide `build-components.md` lists Kept edits among the states a set can carry.

### The gate

`test:chrome` section `ia2` (figma, light and dark) plants a file-sets read where tag is `kept`, with its hand edits still posted. Tag's row must read `In file · Kept edits · Hand-edited`, compared as literal status ids and texts. Then the section's own world is posted back. Mutation: `kept` dropped from `STATUS_ORDER` (the bug put back) fails `#3446: a set with kept edits shows Kept edits among its tags on Components` by name, at both appearances.

### Escape review

#3428 added `kept` to `statusesOf` and to the copy, and gated Update file's Kept edits group. Nothing drew a kept set on Components: the `ia2` status arm's world had due, hand-edited, unrecorded and not-in-file sets, but no kept one. `STATUS_ORDER` is a hand list beside the `SetStatus` type, so a new status that is not added to it is dropped without a sound. The new arm plants a kept set.
