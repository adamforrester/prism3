## (2026-11-16) — Update file clears an unreadable kept slot carry on a set with no other work (#3803)

**What.** #3796 keeps a slot carry's capture on the set (`slotCarry`, `slotTextCarry`), and its review B2 made an entry
this version can't read harmless: the dry run ignores it and names it (`unreadableLine`, "The set's next update clears
it"), and the set's next write clears it. But a set that is otherwise up to date reaches no write, because `applyUpdate`
leaves it alone. So the entry stayed, and every check named it again. #3796's reviewer showed it over three
preview-apply rounds.

**The fix.** `applyUpdate` collects every set it was given that has an unreadable entry, reaches no write and was not
refused. It clears those entries (`clearUnread`), re-reading each one first, so it never clears an entry that has since
become readable:
- with other work in the run, after the named version is saved;
- with none, on the early-return paths.

A "Stop" before the first write still writes nothing. The set still reads up to date before and after. The dry run's
line is now true, so its DRAFT copy needs no change.

**Why this option.** #3803 offered two: clear it during the apply, or reword the line. The rewording is copy, which is
the owner's call. Making the set read "not up to date" was weighed and not taken, for two reasons:
- The panel's Due list comes from the as-built ledger, not the check, so it wouldn't put the set in front of anyone.
- It would turn a junk entry into a visible "change" on a set that has none.

**Version.** Clearing an unreadable entry alone saves no named version. The entry was already ignored, and nothing a
designer sees changes. That is the same precedent as an About frame alone (Q498 B). This is flagged to the owner in the
PR.

**Tests.** `test-slot-migration.ts`, `kept/malformed up to date cleared`:
- Fails on main: 20 chars left, `["rows"]`, still named.
- Passes with the fix.

Mutation: `clearUnread` made a no-op → `kept/malformed up to date cleared`. The clear on the main path (a run that also
has other work) is the same function, but no arm covers that call site on its own.
