## (2026-10-05) — #2114's warning-shape change gets its engine change note

#2114 (#2097 item 3) changed the exported `OverrideWarning`: an unresolved override ground moved from `against` plus `unresolved: true` into `unresolved` as a string. No committed artifact moved, so `regen --check` and `lint-emission-version` both stayed green and nothing asked for a note. But `CONTRIBUTING.md` reserves "no note" for changes that owe no bump. A behavior change owes a bump, and `patch` is permitted here because no artifact moves; #2034, which introduced this warning with the same reach, declared a `minor`. Without a note, the 0.225.0 changelog would still describe `unresolved: true` and nothing would record the change.

This PR adds `packages/engine/changes/notes-2114-unresolved-ground.md` (`engine: patch`), and corrects the "no ENGINE bump" line in #2114's own pending entry.

**The trap for whoever reviews the next shape change:** both version gates read `out/` only. A change to an exported engine type that no emitter serializes passes both of them, so the reviewer has to ask whether a note is owed.
