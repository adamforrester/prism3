## (2026-11-19) — Update a file safely says when a recolor turns a set's updates off (#4116)

Two PRs a day apart, each right on its own, combined into one the guide didn't describe. #3908 (#2956 point 2) skips a hand-edited member whole when an update changes its layers, under Keep and Accept, and the edit can be anywhere, even the root's fill. #3948 counts that skip as one the update "couldn't apply around", which turns the whole set's updates off. So a recolor followed by an engine change that adds a layer to that variant stops the set updating. `update-a-file-safely.md` said a recolor never does that. The owner chose A (2026-11-19): keep the behavior and fix the copy.

### What changed

- The guide's table gets a row for the case: a hand edit on a variant whose layers the update adds, removes or retypes is skipped whole, the set's updates turn off, and **Overwrite** writes it instead. The "Updates off" paragraph's last line adds "unless an update changes that variant's layers". Both cite `update-apply.ts:381`, the skip that pushes the member onto `around`, and are fingerprinted.
- `apps/plugin/test-update-apply.ts`, `structure —` section: every `structure/<kind>` arm now also asserts `turnedOff`. It is on for the four skips (added, removed, retyped under Keep, and added under Accept) and off for Overwrite and the fill-only control.

### Test

The arm passes on `main` too, because it pins behavior that already ships, which the guide now states. Its mutation is option B of the issue: `restructured` skips left out of `around` in `plan()`. That fails `#4116 structure/added`, `/removed`, `/retyped` and `/added accept` by name.
