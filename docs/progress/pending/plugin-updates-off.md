## (2026-11-18) — Update file: "Updates off" for a component set (#2956)

**The decisions built.** #2956, owner decisions 2026-11-17, the copy approved as written: the state is "Updates off", its
actions "Turn off updates" and "Turn updates back on", and the quiet reason line "Turned off when an update couldn't apply
around your edits." shows only when the update turned it off by itself. Skip-and-report while it is off; the hand-edit
guarantees stay; canvas markers deferred (#3916), so none are drawn.

**Where it lives.** Shared plugin data on the set node, `prism3`/`updatesOff`: `auto` or `designer`, `''` for on
(`apps/plugin/src/updates-off.ts`). Read by the check off the live set every time, never from a kept view (#3313),
because a toggle writes plugin data only. In the set's `previewHash`, so a toggle between the check and the confirm
refuses the confirm. Read by the file's due read off the set nodes its search already holds (`offOf` in `main.ts`), so
`dueOf` reads `{ state: 'off', by }` over due, kept edits and current, and the badge never counts it.

**When it turns on by itself.** Only when the apply skipped a member whole because it could not apply around its hand
edits: a layer added or removed by hand, a layer the update rebuilds that was edited by hand (#2673), or a structural
update on a hand-edited member (#2956 point 2). Those skips are listed apart (`SetOutcome.aroundEdits`), so `skipped`
keeps its shape and the arms that compare it exactly are untouched. The rest of that run's set is still written; the
mark stops later runs. An ordinary hand edit stays Hand-edited and the set keeps updating.

**What the apply does with it.** Leaves the set whole: no member, no furniture, no slot carry, no page re-spacing (the
set reads as blocked for that), no version for it alone, and no ledger entry (`ledgerAfter`). The verdict line is
"<set>: left as it is. Updates off." (DRAFT), never ⚠ and never a cause; a run of only such sets reads "✓ N sets left as
they are, updates off" (DRAFT). The run that turns it on adds "<set>: Updates off. Turned off when an update couldn't
apply around your edits."

**A trap for whoever re-verifies.** `damage/under a layer skip` (`test-update-apply.ts`) and `orphan/under a layer skip`
(`test-reactions.ts`) run Keep, Overwrite and Accept over one set in turn. The Keep run now turns the set's updates off,
so the later choices met a set left whole. Both arms clear the mark before each choice; the auto turn-on itself is
measured in the survival suite. Any future arm that runs several updates over one set whose members are skipped for
hand edits meets the same thing.

**OWNER DECISIONS (built as recommended, each to confirm):**
- **Set or member.** The lane is set-level, so one member the update cannot apply around turns the whole set off after
  that run. The 2026-11-17 note reads per member ("Update skips the member and turns its updates off"). Options: A (rec,
  built) set-level now, member-level as a follow-up; B member-level only; C both. A single-component def (icons) has no
  set node, so it is not offered there.
- **Where the actions sit.** A (rec, built): "Turn off updates" as a quiet ghost button at the end of each Due row; an
  "Updates off" group after Kept edits, each row with its tag, the reason line when automatic, and "Turn updates back
  on". B: in Components' status column. C: both.
- **Ticking an Updates off set.** Q2956.3 A said ticking an owned item takes Prism3's version. A (rec, built): no tick;
  "Turn updates back on" and then the hand-edit choice (Overwrite) does that, so one control means one thing. B: a tick
  that turns updates back on and overwrites in one run.
- **Clean up.** A (rec, built): unchanged. Clean up removes variables, styles, modes and canvas labels of sets no longer
  in the file; it never writes a set's members, so Updates off does not reach it. B: Clean up also leaves the labels of a
  set whose updates are off.
- **Agent link.** A (rec, built): the panel only for now; no agent command turns updates off or on. B: an agent command,
  the inverse of `adopt-members`.
- **The partial read at open.** The ledger's read at open loads no page, so it cannot see the mark: a set whose updates
  are off can count on the badge until the full read lands a moment later. The checklist waits for the full read, so it
  never lists such a set as Due. A (rec, built): accept that. B: mirror the mark into the root ledger.

**Measured.** On `main`, `survival/off auto`, `/reopen`, `/skip`, `/report`, `/back on` and every `updates off/*` arm fail
by name (`survival/off plain edit` holds on main by design: it guards against turning on too eagerly). The
`test-agent-link.ts` `updates-off/*` and `test-update-file.ts` `#2956 off *` arms fail on main as a crash (an unknown
message, a missing export), not by name. Mutations, each failing the arms it names: the auto write dropped →
`survival/off auto`, `/reopen`; turning on for any kept edit → `survival/off plain edit`; the apply's skip dropped →
`survival/off skip`, `/report`, `/back on`; the mark out of the dry run's body and hash → `updates off/hash`, `/skip`,
`/report`, `/ledger`, `/back on`; the due read's off loop dropped → `updates off/due`, `updates-off/read`; `ledgerAfter`'s
filter dropped → `updates off/ledger`.
