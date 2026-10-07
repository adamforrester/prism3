## (2026-10-07) — Update dry run: a member Prism3 did not build is never a drop, and a one-time Adopt (#2283)

Settles #2283 before the apply (#2265 PR 2), per design note Q4 and owner decision Q85 A: unstamped members are skipped, with a one-time Adopt.

- **Never a drop.** A coordinate member with no stamp is a designer's own. The dry run used to count one off the plan as a drop, a member the update would mark deprecated. Now it is never a drop and never a collapse onto a removed axis's default. Where it shares a coordinate with a stamped member, the stamped one is the match. Every such member is named in a new `unstamped` list and counted on the approved line "N not built by Prism3".
- **Adopt** is `adopt-members` over the agent link (`{def?}`). It claims an unstamped member on a planned coordinate that no stamped member holds. It writes the as-built record as the member stands, then, last, a stamp whose plan field is `adopted`. That is no plan's stamp, so an adopted member reads `update`, never `current`. The next update brings it to the plan in place, keeping its node. A member off the plan is left as it is, since adopting it would only mark it deprecated. It holds the build's run guard, like the other two update commands.

- **Adopt follows the dry run (#2299 review).** Adopt claims exactly the members the dry run's matching marks `adoptable`: renames and axis changes applied, nothing landing there first. A set the dry run refuses, such as two hand-made members on one coordinate, is refused whole, with nothing written. Before this, Adopt stamped both members of a set the update would then refuse, and told the designer to run that update.
- **By node id (#2301).** Adopt and `capture-baseline` write only to the node id each member was read from, and leave out a member whose node moved or is gone. They used to pair by position, so a set reordered while it was read put the write on another member. The shim now gives every node an id (`identities`, opt-in) so this can be tested.

### Diagnosis worth keeping

- The drop was not the only path. Under a removed axis, `keep = exact ?? first` could pick the designer's member on the default value over Prism3's on another value, collapsing Prism3's own member. `unstamped/stamped wins` holds the preference.
- **Why `adopted` and not the plan's stamp:** stamping the plan's own stamp would make the dry run call a hand-made member current while it differs from the plan. `adopt/reads update` fails if it does.

### Traps for whoever re-verifies

- The stamp is built in `update-plan.ts` from `ENGINE_VERSION` and `EXECUTOR_REVISION`, not by a new helper in `write-components.ts`. A code change there is an executor change, and `lint-executor-revision` would ask for a revision bump that nothing else in this PR needs.
- No panel control: Adopt, like the dry run and the capture, is agent-link only until the owner settles the panel button (#2265 PR 2).
- **The held skip was unreachable as first written.** It compared exact names, and two members on one exact coordinate are a duplicate the dry run refuses anyway. It is reachable only through the dry run's matching: a declared rename moves a stamped member onto a hand-made member's coordinate. `adopt/held` builds exactly that.
- **A reorder must be a new array in the shim.** The host's `children` is a fresh array on every read, so a reorder during the read leaves the read in progress alone. Reversing the shim's one array in place made the read see some members twice, which looked like a duplicate.
