## (2026-11-17) — The hand-edit survival suite: every kind of hand edit, Update with Keep, read back as left (#2956 point 6)

**The gate.** #2956 point 6 (owner decision 2026-10-23): edit each kind of path in the shim, run Update with Keep, and
assert each edit is byte-identical, with expected values stated in the test and never read from the plan.
`apps/plugin/test-hand-edit-survival.ts`, in the plugin's `test` script, does that for 14 kinds on a Tag member and a
checkbox: paint, binding, an unbound padding, nested corners, text, visibility, opacity, layout mode, a property link, a
reorder, a layer added by hand, a layer removed by hand, the member root's own paint, and #2943's squared focus ring.

**Two plans per kind.** "root" changes only the member root's fill, so the edit conflicts with nothing. "overlap" also
rewrites what the edited node holds (its paint, the content gap, the ring's stroke), and the suite asserts the dry run
reads the edit as a conflict there. Keep holds both. Each arm also asserts the member was acted on, updated in place, or
skipped whole for a layer added or removed by hand, so no arm passes by the update writing nothing.

**Independence (docs/34).** The edits are typed by the test and read back off the shim's nodes. Six mutations, each
measured, together fail every arm by name: the node's own `kept` guard (11 arms), the `kept` guard on `claimDefaults`
(7), #2943's `held` guard (the focus ring), #2956 point 1's reorder and wiring guards (#3894), and the apply's
skip of a member with a layer added or removed by hand (4). The suite's header lists which arm each fails.

**Not here.** A structural update on a hand-edited member (#2956 point 2, #3908) and an edit the update would rebuild
away (#2673, #3901) are open PRs; their own arms live in `test-update-apply.ts`, and the suite gains an arm for each once
they merge. An unbound width or height is outside the as-built record (#2956 Q2), so no arm edits one.
