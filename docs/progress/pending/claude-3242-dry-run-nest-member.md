## (2026-11-01) — Update's dry run reads which member each nested instance is (#3242)

Filed from the review of #3236 (#3206), which gave the apply's verify `nestedMemberFaults` and named the dry run as out
of scope. The dry run judges each member through `diffAnatomy`, which holds a nested instance to its set (`nestTarget`)
and not to the member inside it (`nestVariant`). So a member whose stamp and record read current, but whose nested
FieldLabel sat on `emphasis=secondary` where the plan says `primary`, read **current**. The dry run listed nothing to
update, so the apply never ran and its new verify never saw the member.

### The fix

`nestedMemberFaults` moves from `update-apply.ts` to `update-plan.ts`, unchanged in what it reads, and now returns
each fault as data (`part`, `set`, `member`, `plan`). `nestFaultLine` formats it, so the apply's verify line is the same
text as before. The dry run calls it per member, beside the stamp, revision and reaction checks: a fault makes the member
`update` where it would otherwise read `current` or `revisionUnknown`, and each fault is listed as a `nestVariant`
change on its part, from `<set>/<member>` to `<set>/<coordinate>`. It is not a bare re-apply, so `reapplied` does not
count it. A member that is hand-edited, has no record or is damaged keeps the state it had. The apply already writes such
members. A part the record shows as edited by hand is passed as kept, as the apply keeps it by default. The expected side
stays the plan's own `nestVariant`, never `resolveNestMember`, so the check stays independent of the executor
(`docs/34`).

### The gate

A new `nest dry run` section in `test-update-apply.ts` covers Text field and Select. Each is built with the label at
`secondary`, then every member is given the stamp today's plan writes, so its stamp and record read current. All 84
labelled members must read `update` and be listed as a `nestVariant` change from secondary to primary, with no bare
re-apply. The apply must then swap every label to primary with no nested fault in its verify, and the next dry run must
read all 84 current. With the dry run's call removed, `nest dry run/<host> to update`, `… named` and `… applied` fail
on both hosts.
