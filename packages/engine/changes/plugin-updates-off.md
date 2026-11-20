---
engine: patch
---
Update file has an "Updates off" state for a component set (#2956, owner decisions 2026-11-17). A set whose updates are
off is left as it is by Update file and reported calmly ("left as it is. Updates off."), and its hand edits stay where the
designer left them. Updates turn off by themselves only when an update could not apply around the set's hand edits (it
skipped a member whole for them), with the quiet reason line "Turned off when an update couldn't apply around your
edits."; otherwise only the designer turns them off ("Turn off updates") or back on ("Turn updates back on"). The state is
kept as plugin data on the set, so it survives reopening the file. Plugin only; no committed artifact moves.
