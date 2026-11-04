## (2026-11-03) — Update file reads the dialog body's scroll back (#3388)

Update file reported "1 set not verified" on the dialog, listing `…/body.overflowDirection: ∅` on all 24 members. In the real file, every body holds `VERTICAL`. The write landed; the read was wrong.

### Diagnosis

The SLOT in the title was incidental. The update's dry run and its verify never diff a live node. They diff `snapshotMember`'s copy (`apps/plugin/src/member-baseline.ts`), and that copy holds only the fields in `SNAP_KEYS`. #3163 added `overflowDirection` to the plan, the executor and the read-back's `FIELDS`, but not to `SNAP_KEYS`. So the snapshot read it as ∅ on any node. The dialog body is the only node that plans it, and it happens to be a SLOT.

`test:roundtrip` passed because every diff in it read the live shim node, never the snapshot. The shim already gives a SLOT `overflowDirection` the way Figma does. What was missing was the read path.

### Fix

- `'overflowDirection'` joins `SNAP_KEYS`. It is read, not hashed: adding it to the hash (`AS_IS`) would move every built frame's baseline and make every member look hand-edited.
- New check, `roundtrip/snapshot reads as live`: every member the corpus builds (80 defs) is read a second time as Update file's snapshot. It must diverge from its plan exactly where the live read does. The live read is the oracle; the snapshot is the subject. Mutation: drop `'overflowDirection'` from `SNAP_KEYS`, and the check fails by name, listing the 24 dialog `panel/body.overflowDirection: ∅` divergences.
- The check found a second gap, filed as #3393: sign-in-button's mark `literalTint` reads through `findAll`, which a snapshot doesn't have. It sits in the check's known-gap ledger by def and field. A second assertion fails once that entry stops firing, so the entry can't outlive the issue.

`EXECUTOR_REVISION` is unchanged: `lint-executor-revision` exempts `member-baseline.ts`. The strip's "Stopped at the update" wording for a run where every set updated is left to #3326's PR 4.
