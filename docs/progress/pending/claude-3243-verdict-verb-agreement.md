## (2026-11-01) — The Update verdict's counts agree with their verbs (#3243)

Filed from the review of #3236. With one fault, the apply's verify line read "text-field: 1 field still differ from the
plan". #3236 makes that line come up more often, because a nested instance on the wrong member is now one of its fields.

### The fix

The verdict picks its verb from the count: "1 field still differs", "2 fields still differ". The issue asked for every
sibling count string in the same copy to be checked. Two more had the same fault, with a pronoun instead of a verb:

- the set line's "N left as they are", which read "1 left as they are";
- the dry run's line (`previewLine`), which the Update verdict repeats for a set it entered with nothing to write. Its
  "N not built by Prism3, left as they are" read the same way, beside an Adopt clause that already said "it" for one.

Both now say "it is" for one. These are grammar fixes to approved copy, with no new wording. The other count strings in
the verdict were already right or carry no verb ("N updated", "N parts not written as planned", "N members not
finished", which already has its own singular line).

### Out of scope, filed

The capture-baseline and Adopt verdicts (`update-plan.ts`) have the same "N left as they are" fault. They are separate
verdicts, so they are filed as #3275 rather than fixed here.

### The gate

New `verb/…` arms in `test-update-apply.ts` check outcomes written by hand: one field and two, one member left and two.
Four existing arms pinned "1 left as they are" and now pin "1 left as it is". The `unbuilt/verdict` arm in
`test-canvas-furniture.ts` asserted that no line contains "left as they are". It now matches both forms, so it would not
go vacuous for a count of one. Each form reverted fails by name: `verb/differs 1`, `verb/differ 2`, `verb/left 1` (with
`recordfail/prefix` and `idle/furniture`), and for `previewLine`, `converged/adoptable one` in
`test-update-components.ts`.
