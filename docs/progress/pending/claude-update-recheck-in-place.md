## (2026-11-12) — Update file: ticking Theme re-checks in place, never blanking the dialog (#3713, 4 of 4)

Ticking Theme in Update file blanked the whole dialog to "Checking the file…" for a moment. Theme decides the brand that what is due is measured against (#3023 Q701 B), so the toggle asks the host to read the file again. While a read is out, `awaitingRead` returned the "Checking the file…" body, whether the read was the opening's first or a re-read.

**The fix.** The dialog keeps the file reading it last drew (`shownFile`). A re-read that a Theme toggle started draws that reading again, with the ticks as the person left them and focus on the Theme box. The foot shows "Reading this file…", the #3302 progress, and Update file waits. The scoped check is not asked until the new reading lands. Then it runs and reports progress as #3302 does. Only the opening's first read still shows "Checking the file…", because there is nothing to draw yet. No new strings.

**Independence.** Chrome section ia2's Theme toggle used to assert the blank (`tg.checking`). For each of its three toggles it now asserts, while the re-read is out:
- no "Checking the file…";
- the Theme box drawn as toggled, with focus;
- both Due rows;
- "Reading this file…" in the foot;
- Update file disabled.

**Mutation:** with `rereading` always false, ia2 fails `#3713 in place` for every toggle, in both themes.
