## (2026-11-19) — Report a problem: Update file's lines carry a host message as its class only (#4205)

**What.** #3702 routed every host message `main.ts` posts through `failureDetail` (`<Class>: <message>`), which the
report cuts to its class. Update file's own lines did not: six sites in `update-apply.ts` and `canvas-furniture.ts`
(the cover, the About frame, the named version, a stopped set (two sites), the run that threw, the canvas labels) and
four catches in `main.ts` (the Update check or apply, Record as built, Adopt, Draw specs) posted
`(e as Error)?.message` whole. Figma's messages read `in <method>: …`, a shape the report does not cut, so a layer or
page name in one went into a public issue. Each now posts `failureDetail(e)`, so the Activity drawer still shows
Figma's reason, with the class in front (D3703.1 B), and the report keeps the class.

**The report's heads.** Two heads join `DETAIL_HEADS` (`apps/studio/src/state/report.ts`): `: stopped (` and
`The update failed: `. Without them a class that is not an `…Error` (`DOMException`) after those heads kept its
message, as #3702's review found for the other heads.

**A bare line (review).** The four `main.ts` catches post the detail as the whole line, with no head, so only the
report's class rule cuts it, and that rule knew `…Error` names only: a host's `DOMException` kept its message. The rule
now also takes a `…Exception` name. An ordinary `Word: …` line still stays whole. Section 11a throws the Update check as
a `DOMException` too, and `apps/studio/test-report.ts` holds the bare line for `DOMException`, `FigmaException` and
`Exception`.

**Why the gate missed it, and the wider scan.** #3702's arms read `main.ts` and `prune-figma.ts` by name. Section 11 of
`apps/plugin/test-report-redaction.ts` lists the plugin's source folder instead, and fails by name when any file
posts a `failureDetail` after a head the report does not cut at, or follows a head the report cuts at with anything
other than `failureDetail(`. It also runs the Update check thrown by the host through the report, holds each of the
ten sites by its text, holds `update-apply.ts` to no raw host-message read, and runs `applyVerdict`'s stopped, threw
and version-save lines through the report with a `DOMException`.

**Not covered here.** Other plugin lines still interpolate a raw host message (the build's misses in
`write-components.ts`, the slot migrations, prune's failed removals, #3865). Whether each reaches the report is
filed as #4253 rather than fixed in this PR. Plugin and studio behavior only: no change note, as #3702 had none.
